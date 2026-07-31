<?php

namespace Database\Seeders;

use App\Models\Device;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MockDataSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user
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

        // System settings
        Setting::firstOrCreate([], [
            'sensor_height_cm' => 300,
            'warning_level_cm' => 200,
            'critical_level_cm' => 250,
            'sampling_interval_seconds' => 5,
            'buzzer_enabled' => true,
        ]);

        // ---------------------------------------------------------------
        // Real ESP32 Device — receives live data from hardware
        // ---------------------------------------------------------------
        Device::firstOrCreate(
            ['device_code' => 'DEV-001'],
            [
                'device_name' => 'ESP32 Sensor Node',
                'location' => 'Main River Station',
                'status' => 'offline',
                'is_active' => true,
                'last_seen' => null,
            ]
        );
    }
}

