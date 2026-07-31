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

        // Filter by specific date (YYYY-MM-DD), default to today
        if ($request->has('date')) {
            $query->whereDate('created_at', $request->date);
        } else {
            $query->whereDate('created_at', today());
        }

        // Limit results (288 per day is standard for 5-minute intervals)
        $limit = min($request->input('limit', 500), 1000);
        $readings = $query->orderBy('created_at', 'asc')->limit($limit)->get();

        return response()->json([
            'readings' => $readings,
            'filters'  => [
                'device_id' => $request->device_id,
                'date'      => $request->input('date', today()->toDateString()),
                'limit'     => $limit,
            ],
        ]);
    }

    /**
     * GET /api/sensor-readings/summary
     *
     * Public endpoint — returns aggregated statistics for the analytics dashboard.
     *
     * Supports query parameters:
     *   ?date_from=2026-07-01  → start of date range
     *   ?date_to=2026-07-07    → end of date range
     *   ?status=SAFE           → filter by status
     *   ?device_id=1           → filter by device
     */
    public function summary(Request $request): JsonResponse
    {
        $query = SensorReading::query();

        // Date range filter
        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from . ' 00:00:00');
        }
        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        // Status filter
        if ($request->has('status') && $request->status !== 'ALL') {
            $query->where('status', $request->status);
        }

        // Device filter
        if ($request->has('device_id')) {
            $query->where('device_id', $request->device_id);
        }

        $stats = (clone $query)->selectRaw('
            MAX(water_level_percent) as highest,
            MIN(water_level_percent) as lowest,
            AVG(water_level_percent) as average,
            COUNT(*) as total_readings
        ')->first();

        // Get the latest reading within the filtered range
        $latestReading = (clone $query)->latest('created_at')->first();

        return response()->json([
            'summary' => [
                'highest'        => $stats->highest ? round((float) $stats->highest, 2) : 0,
                'lowest'         => $stats->lowest ? round((float) $stats->lowest, 2) : 0,
                'average'        => $stats->average ? round((float) $stats->average, 2) : 0,
                'total_readings' => (int) $stats->total_readings,
                'latest_status'  => $latestReading?->status ?? 'N/A',
            ],
        ]);
    }

    /**
     * GET /api/sensor-readings/history
     *
     * Public endpoint — returns paginated sensor readings for the analytics table.
     *
     * Supports query parameters:
     *   ?date_from=2026-07-01  → start of date range
     *   ?date_to=2026-07-07    → end of date range
     *   ?status=SAFE           → filter by status
     *   ?search=Jul 17         → search by date/time string
     *   ?sort_by=created_at    → sort column (created_at, water_level_percent, status)
     *   ?sort_dir=desc         → sort direction (asc, desc)
     *   ?per_page=20           → results per page
     *   ?page=1                → page number
     */
    public function paginated(Request $request): JsonResponse
    {
        $query = SensorReading::with('device:id,device_name,location');

        // Date range filter
        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from . ' 00:00:00');
        }
        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        // Status filter
        if ($request->has('status') && $request->status !== 'ALL') {
            $query->where('status', $request->status);
        }

        // Search by date/time (partial match on created_at)
        if ($request->has('search') && $request->search) {
            $query->where('created_at', 'LIKE', '%' . $request->search . '%');
        }

        // Sorting
        $sortBy = in_array($request->sort_by, ['created_at', 'water_level_percent', 'status'])
            ? $request->sort_by
            : 'created_at';
        $sortDir = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sortBy, $sortDir);

        // Paginate
        $perPage = min((int) $request->input('per_page', 20), 100);
        $paginated = $query->paginate($perPage);

        // Calculate trend for each reading by comparing to previous
        $items = $paginated->getCollection()->map(function ($reading, $index) use ($paginated) {
            $items = $paginated->getCollection();
            // Since results are sorted desc by default, "previous" chronologically is the next item
            $prevReading = $items[$index + 1] ?? null;

            if (!$prevReading) {
                $trend = 'STABLE';
            } else {
                $diff = (float) $reading->water_level_percent - (float) $prevReading->water_level_percent;
                if ($diff > 0.5) {
                    $trend = 'RISING';
                } elseif ($diff < -0.5) {
                    $trend = 'FALLING';
                } else {
                    $trend = 'STABLE';
                }
            }

            return array_merge($reading->toArray(), ['trend' => $trend]);
        });

        return response()->json([
            'readings' => $items->values(),
            'pagination' => [
                'current_page'  => $paginated->currentPage(),
                'last_page'     => $paginated->lastPage(),
                'per_page'      => $paginated->perPage(),
                'total'         => $paginated->total(),
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
                'water_level_cm'      => $latestReading?->water_level_cm,
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

        // Calculate water_level_cm
        $settings = Setting::first();
        $sensorHeight = $settings?->sensor_height_cm ?? 300.0;
        $waterLevelCm = max(0, $sensorHeight - $request->distance_cm);

        // Determine the water level status based on settings thresholds
        $status = $this->determineStatus($waterLevelCm, $settings);

        $lastReading = SensorReading::where('device_id', $device->id)
            ->latest('created_at')
            ->first();

        $shouldUpdate = false;
        if ($lastReading && $lastReading->status === $status) {
            $timeSinceLast = $lastReading->created_at->diffInMinutes(now());
            if ($timeSinceLast < 5) {
                $shouldUpdate = true;
            }
        }

        if ($shouldUpdate) {
            // Update the existing point with latest values (throttling inserts to 1 per 5 mins)
            $lastReading->update([
                'distance_cm'         => $request->distance_cm,
                'water_level_cm'      => $waterLevelCm,
                'water_level_percent' => $request->water_level_percent,
                // updated_at auto-updates, created_at remains the start of the 5-min window
            ]);
            $reading = $lastReading;
        } else {
            // Create a new reading point (status changed, or >5 mins passed)
            $reading = SensorReading::create([
                'device_id'           => $device->id,
                'distance_cm'         => $request->distance_cm,
                'water_level_cm'      => $waterLevelCm,
                'water_level_percent' => $request->water_level_percent,
                'status'              => $status,
            ]);
        }

        // Update the device: mark as online and record last contact time
        $device->update([
            'status'    => 'online',
            'last_seen' => now(),
        ]);

        // Auto-resolve "Connection Lost" alerts
        Alert::where('device_id', $device->id)
            ->where('title', 'Connection Lost')
            ->where('is_active', true)
            ->update(['is_active' => false]);

        // Auto-resolve water level alerts if the status is SAFE
        if ($status === 'SAFE') {
            Alert::where('device_id', $device->id)
                ->where('alert_type', 'SYSTEM')
                ->where('is_active', true)
                ->update(['is_active' => false]);
        } 
        // If WARNING, auto-resolve any CRITICAL alerts (downgrade)
        elseif ($status === 'WARNING') {
            Alert::where('device_id', $device->id)
                ->where('alert_type', 'SYSTEM')
                ->where('severity', 'CRITICAL')
                ->where('is_active', true)
                ->update(['is_active' => false]);
            $this->generateSystemAlert($device, $status, $waterLevelCm);
        }
        // If CRITICAL, auto-resolve any WARNING alerts (upgrade)
        elseif ($status === 'CRITICAL') {
            Alert::where('device_id', $device->id)
                ->where('alert_type', 'SYSTEM')
                ->where('severity', 'WARNING')
                ->where('is_active', true)
                ->update(['is_active' => false]);
            $this->generateSystemAlert($device, $status, $waterLevelCm);
        }

        $pendingSms = \Illuminate\Support\Facades\Cache::pull('pending_manual_sms');
        $restartEsp32 = \Illuminate\Support\Facades\Cache::pull('restart_esp32');

        return response()->json([
            'message'        => 'Reading saved successfully.',
            'reading'        => $reading,
            'buzzer_enabled' => (bool) ($settings?->buzzer_enabled ?? true),
            'pending_sms'    => $pendingSms,
            'restart_esp32'  => (bool) $restartEsp32
        ], 201);
    }

    /**
     * Determine the water level status based on system settings.
     *
     * The thresholds are stored in the settings table so the admin
     * can change them from the dashboard without touching code.
     */
    private function determineStatus(float $waterLevelCm, ?Setting $settings): string
    {
        // Fallback defaults if no settings row exists yet
        $warningLevel  = $settings?->warning_level_cm ?? 200.0;
        $criticalLevel = $settings?->critical_level_cm ?? 250.0;

        if ($waterLevelCm >= $criticalLevel) {
            return 'CRITICAL';
        }

        if ($waterLevelCm >= $warningLevel) {
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
    private function generateSystemAlert(Device $device, string $status, float $waterLevelCm): void
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

        $waterLevelM = number_format($waterLevelCm / 100, 2);

        // Build a human-readable alert message
        $messages = [
            'WARNING'  => "Water level at {$device->device_name} ({$device->location}) has reached {$waterLevelM}m. Please stay alert.",
            'CRITICAL' => "CRITICAL: Water level at {$device->device_name} ({$device->location}) has reached {$waterLevelM}m! Evacuate low-lying areas immediately.",
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
