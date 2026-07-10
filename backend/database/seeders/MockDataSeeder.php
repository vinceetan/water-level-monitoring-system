<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\Device;
use App\Models\SensorReading;
use App\Models\Setting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MockDataSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'full_name' => 'Admin',
                'password' => Hash::make('password'),
            ]
        );
        if ($admin->role !== 'admin') {
            $admin->role = 'admin';
            $admin->save();
        }

        $settings = Setting::firstOrCreate([], [
            'sensor_height_cm' => 300,
            'warning_level_percent' => 70,
            'critical_level_percent' => 90,
            'sampling_interval_seconds' => 5,
            'buzzer_enabled' => true,
        ]);

        $sensorHeight = (float) $settings->sensor_height_cm;
        $warningPct = (float) $settings->warning_level_percent;
        $criticalPct = (float) $settings->critical_level_percent;

        $device1 = Device::firstOrCreate(
            ['device_name' => 'River Station Alpha'],
            [
                'device_code' => 'DEV_ALPHA_001',
                'location' => 'North Bridge',
                'status' => 'online',
                'is_active' => true,
                'last_seen' => now(),
            ]
        );

        $device2 = Device::firstOrCreate(
            ['device_name' => 'River Station Beta'],
            [
                'device_code' => 'DEV_BETA_002',
                'location' => 'South Creek',
                'status' => 'online',
                'is_active' => true,
                'last_seen' => now(),
            ]
        );

        $this->seedSensorReadings($device1, $sensorHeight, $warningPct, $criticalPct, [
            'start_distance' => 195,
            'end_distance' => 75,
            'noise' => 8,
        ]);

        $this->seedSensorReadings($device2, $sensorHeight, $warningPct, $criticalPct, [
            'start_distance' => 220,
            'end_distance' => 140,
            'noise' => 5,
        ]);

        Alert::firstOrCreate(
            ['message' => 'Water level rising rapidly at North Bridge'],
            [
                'title' => 'High Water Level Warning',
                'device_id' => $device1->id,
                'severity' => 'WARNING',
                'is_active' => true,
                'expires_at' => now()->addHours(2),
            ]
        );
    }

    /**
     * Generate realistic sensor readings for charts and dashboards.
     *
     * - Hourly points for the past 30 days (long-term history)
     * - Every 5 minutes for the past 24 hours (detailed recent chart)
     */
    private function seedSensorReadings(
        Device $device,
        float $sensorHeight,
        float $warningPct,
        float $criticalPct,
        array $profile
    ): void {
        SensorReading::where('device_id', $device->id)->delete();

        $now = Carbon::now();
        $readings = [];
        $startDistance = $profile['start_distance'];
        $endDistance = $profile['end_distance'];
        $noise = $profile['noise'];

        $hourlyStart = $now->copy()->subDays(30)->startOfDay();
        $hourlyEnd = $now->copy()->subHours(24);
        $totalHours = max(1, $hourlyStart->diffInHours($hourlyEnd));

        for ($i = 0; $i <= $totalHours; $i++) {
            $time = $hourlyStart->copy()->addHours($i);
            $progress = $i / $totalHours;
            $distance = $this->interpolateDistance($startDistance, $endDistance, $progress, $noise, $sensorHeight);

            $readings[] = $this->buildReadingRow(
                $device->id,
                $distance,
                $sensorHeight,
                $warningPct,
                $criticalPct,
                $time
            );
        }

        $denseStart = $now->copy()->subHours(24);
        $denseHours = 24;
        $denseSteps = $denseHours * 12;

        for ($i = 0; $i <= $denseSteps; $i++) {
            $time = $denseStart->copy()->addMinutes($i * 5);
            $progress = $i / max(1, $denseSteps);
            $distance = $this->interpolateDistance($startDistance, $endDistance, $progress, $noise / 2, $sensorHeight);

            $readings[] = $this->buildReadingRow(
                $device->id,
                $distance,
                $sensorHeight,
                $warningPct,
                $criticalPct,
                $time
            );
        }

        foreach (array_chunk($readings, 500) as $chunk) {
            try {
                SensorReading::insert($chunk);
            } catch (\Throwable) {
                // Inserts still commit; Laravel's query listener can throw
                // when the mbstring extension is missing on Windows PHP.
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
        float $warningPct,
        float $criticalPct,
        Carbon $time
    ): array {
        $percent = round((($sensorHeight - $distance) / $sensorHeight) * 100, 2);
        $percent = max(0, min(100, $percent));

        $status = 'SAFE';
        if ($percent >= $criticalPct) {
            $status = 'CRITICAL';
        } elseif ($percent >= $warningPct) {
            $status = 'WARNING';
        }

        return [
            'device_id' => $deviceId,
            'distance_cm' => round($distance, 2),
            'water_level_percent' => $percent,
            'status' => $status,
            'created_at' => $time,
        ];
    }
}
