<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\Device;
use App\Models\SensorReading;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Seeds mock devices and fake sensor readings for UI testing.
 *
 * Usage:
 *   php artisan demo:seed    → Add mock data alongside real ESP32 data
 *   php artisan demo:clear   → Remove mock data, keep real ESP32 data
 */
class DemoDataSeeder extends Seeder
{
    /**
     * Mock device codes — used to identify and clean up demo data.
     */
    public const MOCK_DEVICE_CODES = ['DEV_ALPHA_001', 'DEV_BETA_002'];

    public function run(): void
    {
        $settings = Setting::first();
        $sensorHeight = (float) ($settings?->sensor_height_cm ?? 300);
        $warningCm = (float) ($settings?->warning_level_cm ?? 200);
        $criticalCm = (float) ($settings?->critical_level_cm ?? 250);

        $device1 = Device::firstOrCreate(
            ['device_code' => 'DEV_ALPHA_001'],
            [
                'device_name' => 'River Station Alpha',
                'location' => 'North Bridge',
                'status' => 'online',
                'is_active' => true,
                'last_seen' => now(),
            ]
        );

        $device2 = Device::firstOrCreate(
            ['device_code' => 'DEV_BETA_002'],
            [
                'device_name' => 'River Station Beta',
                'location' => 'South Creek',
                'status' => 'online',
                'is_active' => true,
                'last_seen' => now(),
            ]
        );

        $this->seedSensorReadings($device1, $sensorHeight, $warningCm, $criticalCm, [
            'start_distance' => 195,
            'end_distance' => 75,
            'noise' => 8,
        ]);

        $this->seedSensorReadings($device2, $sensorHeight, $warningCm, $criticalCm, [
            'start_distance' => 220,
            'end_distance' => 140,
            'noise' => 5,
        ]);

        Alert::firstOrCreate(
            ['message' => 'Water level rising rapidly at North Bridge'],
            [
                'title' => 'High Water Level Warning',
                'device_id' => $device1->id,
                'alert_type' => 'SYSTEM',
                'severity' => 'WARNING',
                'is_active' => true,
                'expires_at' => now()->addHours(2),
            ]
        );
    }

    /**
     * Remove all mock devices, their readings, and their alerts.
     */
    public static function clear(): int
    {
        $mockDevices = Device::whereIn('device_code', self::MOCK_DEVICE_CODES)->get();

        if ($mockDevices->isEmpty()) {
            return 0;
        }

        $deviceIds = $mockDevices->pluck('id');

        $deletedReadings = SensorReading::whereIn('device_id', $deviceIds)->delete();
        Alert::whereIn('device_id', $deviceIds)->delete();
        Device::whereIn('id', $deviceIds)->delete();

        return $deletedReadings;
    }

    // ---------------------------------------------------------------
    //  Private helpers (moved from the old MockDataSeeder)
    // ---------------------------------------------------------------

    private function seedSensorReadings(
        Device $device,
        float $sensorHeight,
        float $warningCm,
        float $criticalCm,
        array $profile
    ): void {
        SensorReading::where('device_id', $device->id)->delete();

        $now = Carbon::now();
        $readings = [];
        $startDistance = $profile['start_distance'];
        $endDistance = $profile['end_distance'];
        $noise = $profile['noise'];

        // Hourly points for the past 30 days
        $hourlyStart = $now->copy()->subDays(30)->startOfDay();
        $hourlyEnd = $now->copy()->subHours(24);
        $totalHours = max(1, $hourlyStart->diffInHours($hourlyEnd));

        for ($i = 0; $i <= $totalHours; $i++) {
            $time = $hourlyStart->copy()->addHours($i);
            $progress = $i / $totalHours;
            $distance = $this->interpolateDistance($startDistance, $endDistance, $progress, $noise, $sensorHeight);

            $readings[] = $this->buildReadingRow(
                $device->id, $distance, $sensorHeight, $warningCm, $criticalCm, $time
            );
        }

        // Every 5 minutes for the past 24 hours
        $denseStart = $now->copy()->subHours(24);
        $denseSteps = 24 * 12;

        for ($i = 0; $i <= $denseSteps; $i++) {
            $time = $denseStart->copy()->addMinutes($i * 5);
            $progress = $i / max(1, $denseSteps);
            $distance = $this->interpolateDistance($startDistance, $endDistance, $progress, $noise / 2, $sensorHeight);

            $readings[] = $this->buildReadingRow(
                $device->id, $distance, $sensorHeight, $warningCm, $criticalCm, $time
            );
        }

        foreach (array_chunk($readings, 500) as $chunk) {
            try {
                SensorReading::insert($chunk);
            } catch (\Throwable) {
            }
        }

        $latest = SensorReading::where('device_id', $device->id)->latest('created_at')->first();
        if ($latest) {
            $device->update(['last_seen' => $latest->created_at, 'status' => 'online']);
        }
    }

    private function interpolateDistance(
        float $startDistance,
        float $endDistance,
        float $progress,
        int $noise,
        float $sensorHeight
    ): float {
        $trend = $startDistance + (($endDistance - $startDistance) * $progress);
        $distance = $trend + rand(-$noise, $noise);

        return max(15, min($sensorHeight - 5, $distance));
    }

    private function buildReadingRow(
        int $deviceId,
        float $distance,
        float $sensorHeight,
        float $warningCm,
        float $criticalCm,
        Carbon $time
    ): array {
        $waterLevelCm = max(0, $sensorHeight - $distance);
        $percent = round(($waterLevelCm / max(1, $sensorHeight)) * 100, 2);
        $percent = max(0, min(100, $percent));

        $status = 'SAFE';
        if ($waterLevelCm >= $criticalCm) {
            $status = 'CRITICAL';
        } elseif ($waterLevelCm >= $warningCm) {
            $status = 'WARNING';
        }

        return [
            'device_id' => $deviceId,
            'distance_cm' => round($distance, 2),
            'water_level_cm' => round($waterLevelCm, 2),
            'water_level_percent' => $percent,
            'status' => $status,
            'created_at' => $time,
        ];
    }
}
