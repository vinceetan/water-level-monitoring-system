<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Device;
use App\Models\SensorReading;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * GET /api/admin/dashboard
     *
     * Admin-only — returns all summary stats for the admin dashboard
     * in a single API call.
     *
     * Returns:
     * - Device summary (total, online, offline)
     * - Current water level per device (latest reading)
     * - Alert summary (active count by severity)
     * - Reading stats (total today, latest status)
     * - Current settings/thresholds
     */
    public function index(): JsonResponse
    {
        // ---- Device Summary ----
        $totalDevices  = Device::count();
        $activeDevices = Device::where('is_active', true)->count();
        $onlineDevices = Device::where('is_active', true)->where('status', 'online')->count();

        // ---- Current Water Level Per Device ----
        $devices = Device::where('is_active', true)->get()->map(function ($device) {
            $latest = SensorReading::where('device_id', $device->id)
                ->latest()
                ->first();

            return [
                'device_id'           => $device->id,
                'device_name'         => $device->device_name,
                'location'            => $device->location,
                'device_status'       => $device->status,
                'last_seen'           => $device->last_seen,
                'water_level_percent' => $latest?->water_level_percent,
                'distance_cm'         => $latest?->distance_cm,
                'status'              => $latest?->status,
                'reading_at'          => $latest?->created_at,
            ];
        });

        // ---- Alert Summary ----
        $activeAlerts = Alert::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            });

        $alertSummary = [
            'total'    => (clone $activeAlerts)->count(),
            'critical' => (clone $activeAlerts)->where('severity', 'CRITICAL')->count(),
            'warning'  => (clone $activeAlerts)->where('severity', 'WARNING')->count(),
            'info'     => (clone $activeAlerts)->where('severity', 'INFO')->count(),
        ];

        // ---- Recent Alerts (last 5) ----
        $recentAlerts = Alert::with('device:id,device_name,location')
            ->latest()
            ->limit(5)
            ->get();

        // ---- Reading Stats ----
        $readingsToday = SensorReading::whereDate('created_at', today())->count();
        $totalReadings = SensorReading::count();

        // ---- Settings ----
        $settings = Setting::first();

        return response()->json([
            'devices' => [
                'total'   => $totalDevices,
                'active'  => $activeDevices,
                'online'  => $onlineDevices,
                'offline' => $activeDevices - $onlineDevices,
                'list'    => $devices,
            ],
            'alerts' => [
                'summary' => $alertSummary,
                'recent'  => $recentAlerts,
            ],
            'readings' => [
                'today' => $readingsToday,
                'total' => $totalReadings,
            ],
            'settings' => $settings,
        ]);
    }
}
