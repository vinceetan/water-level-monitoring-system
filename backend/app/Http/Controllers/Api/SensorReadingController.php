<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SensorReading\StoreSensorReadingRequest;
use App\Models\Alert;
use App\Models\Device;
use App\Models\SensorReading;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SensorReadingController extends Controller
{
    /**
     * GET /api/sensor-readings
     *
     * Public endpoint — returns water level history for charts.
     *
     * Supports query parameters for filtering:
     *   ?device_id=1           → readings from a specific device
     *   ?hours=24              → readings from the last N hours (default: 24)
     *   ?limit=100             → max number of readings (default: 100)
     *
     * React will call this to build the historical water level chart.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SensorReading::with('device:id,device_name,device_code,location');

        // Filter by device
        if ($request->has('device_id')) {
            $query->where('device_id', $request->device_id);
        }

        // Filter by time range (default: last 24 hours)
        $hours = $request->input('hours', 24);
        $query->where('created_at', '>=', now()->subHours($hours));

        // Limit results (default: 100, max: 500)
        $limit = min($request->input('limit', 100), 500);

        $readings = $query->latest()->limit($limit)->get();

        return response()->json([
            'readings' => $readings,
            'filters'  => [
                'device_id' => $request->device_id,
                'hours'     => (int) $hours,
                'limit'     => $limit,
            ],
        ]);
    }

    /**
     * GET /api/sensor-readings/latest
     *
     * Public endpoint — returns the most recent reading per device.
     * This powers the "current water level" display on the dashboard.
     *
     * Instead of fetching all readings and finding the latest in React,
     * this endpoint does it efficiently in a single SQL query.
     */
    public function latest(): JsonResponse
    {
        // Get all active devices
        $devices = Device::where('is_active', true)->get()->map(function ($device) {
            // Get the single most recent reading for this device
            $latestReading = SensorReading::where('device_id', $device->id)
                ->latest()
                ->first();

            return [
                'device_id'           => $device->id,
                'device_name'         => $device->device_name,
                'device_code'         => $device->device_code,
                'location'            => $device->location,
                'device_status'       => $device->status,
                'last_seen'           => $device->last_seen,
                'water_level_percent' => $latestReading?->water_level_percent,
                'distance_cm'         => $latestReading?->distance_cm,
                'status'              => $latestReading?->status,
                'reading_at'          => $latestReading?->created_at,
            ];
        });

        return response()->json([
            'data' => $devices,
        ]);
    }

    /**
     * POST /api/sensor-readings
     *
     * Authenticated endpoint — the ESP32 submits a new reading here.
     *
     * Flow:
     * 1. Validate the input (StoreSensorReadingRequest)
     * 2. Look up the device by device_code
     * 3. Check if the device is active
     * 4. Determine the status (SAFE/WARNING/CRITICAL) from settings
     * 5. Save the reading
     * 6. Update the device's status to 'online' and last_seen to now
     */
    public function store(StoreSensorReadingRequest $request): JsonResponse
    {
        // Look up the device by its unique code
        $device = Device::where('device_code', $request->device_code)->first();

        // Reject readings from deactivated devices
        if (! $device->is_active) {
            return response()->json([
                'message' => 'Device is deactivated. Readings not accepted.',
            ], 403);
        }

        // Determine the water level status based on settings thresholds
        $status = $this->determineStatus($request->water_level_percent);

        // Create the sensor reading
        $reading = SensorReading::create([
            'device_id'           => $device->id,
            'distance_cm'         => $request->distance_cm,
            'water_level_percent' => $request->water_level_percent,
            'status'              => $status,
        ]);

        // Update the device: mark as online and record last contact time
        $device->update([
            'status'    => 'online',
            'last_seen' => now(),
        ]);

        // Auto-resolve any active "Connection Lost" alerts
        Alert::where('device_id', $device->id)
            ->where('title', 'Connection Lost')
            ->where('is_active', true)
            ->update(['is_active' => false]);

        // Auto-generate a SYSTEM alert if water level is WARNING or CRITICAL.
        // Only create a new alert if there isn't already an active alert
        // of the same severity for this device (prevents alert spam).
        if ($status !== 'SAFE') {
            $this->generateSystemAlert($device, $status, $request->water_level_percent);
        }

        return response()->json([
            'message' => 'Reading recorded successfully.',
            'reading' => $reading,
        ], 201);
    }

    /**
     * Determine the water level status based on system settings.
     *
     * The thresholds are stored in the settings table so the admin
     * can change them from the dashboard without touching code.
     *
     * Example with default settings:
     *   warning_level_percent = 60  → 60% and above = WARNING
     *   critical_level_percent = 80 → 80% and above = CRITICAL
     *   Below 60% = SAFE
     */
    private function determineStatus(float $waterLevelPercent): string
    {
        // Fetch the current threshold settings
        $settings = Setting::first();

        // Fallback defaults if no settings row exists yet
        $warningLevel  = $settings?->warning_level_percent ?? 60;
        $criticalLevel = $settings?->critical_level_percent ?? 80;

        if ($waterLevelPercent >= $criticalLevel) {
            return 'CRITICAL';
        }

        if ($waterLevelPercent >= $warningLevel) {
            return 'WARNING';
        }

        return 'SAFE';
    }

    /**
     * Auto-generate a SYSTEM alert when water level is dangerous.
     *
     * Duplicate prevention: checks if an active alert with the same
     * severity already exists for this device. If so, skips creation.
     * This prevents the system from creating a new alert every 5 seconds
     * (each time the ESP32 sends a reading).
     */
    private function generateSystemAlert(Device $device, string $status, float $waterLevelPercent): void
    {
        // Check for an existing active alert of the same severity for this device
        $existingAlert = Alert::where('device_id', $device->id)
            ->where('alert_type', 'SYSTEM')
            ->where('severity', $status)
            ->where('is_active', true)
            ->first();

        // Don't create duplicate alerts
        if ($existingAlert) {
            return;
        }

        // Build a human-readable alert message
        $messages = [
            'WARNING'  => "Water level at {$device->device_name} ({$device->location}) has reached {$waterLevelPercent}%. Please stay alert.",
            'CRITICAL' => "CRITICAL: Water level at {$device->device_name} ({$device->location}) has reached {$waterLevelPercent}%! Evacuate low-lying areas immediately.",
        ];

        Alert::create([
            'device_id'  => $device->id,
            'title'      => "{$status}: High Water Level - {$device->device_name}",
            'message'    => $messages[$status],
            'alert_type' => 'SYSTEM',
            'severity'   => $status,
            'is_active'  => true,
        ]);
    }
}
