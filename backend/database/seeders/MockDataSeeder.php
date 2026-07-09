<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Device;
use App\Models\Setting;
use App\Models\SensorReading;
use App\Models\Alert;
use Carbon\Carbon;

class MockDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Settings
        Setting::firstOrCreate([], [
            'sensor_height_cm' => 300,
            'warning_level_percent' => 70,
            'critical_level_percent' => 90,
            'sampling_interval_seconds' => 5,
            'buzzer_enabled' => true,
        ]);

        // 2. Devices
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



        // 3. Mock Readings (generate last 30 days of data for device 1)
        SensorReading::where('device_id', $device1->id)->delete();
        $start = Carbon::now()->subDays(30)->startOfDay(); // Start 30 days ago at midnight
        
        $baseDistance = 200; // cm
        $now = Carbon::now();
        $hoursDiff = $start->diffInHours($now);

        for ($i = 0; $i <= $hoursDiff; $i++) {
            $currentDate = (clone $start)->addHours($i);
            
            // Random fluctuation for realistic line chart
            $fluctuation = rand(-20, 20);
            $distance = $baseDistance + $fluctuation;
            
            $percent = max(0, min(100, (($distance) / 300) * 100));
            
            $status = 'SAFE';
            if ($percent > 70) $status = 'WARNING';
            if ($percent > 90) $status = 'CRITICAL';

            SensorReading::create([
                'device_id' => $device1->id,
                'distance_cm' => $distance,
                'water_level_percent' => $percent,
                'status' => $status,
                'created_at' => $currentDate,
            ]);
            
            $baseDistance = $distance; // Make the graph continuous
        }

        // 4. Alerts
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
}
