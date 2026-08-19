<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('token:generate', function () {
    $user = \App\Models\User::where('email', 'esp32@device.local')->first();
    if (!$user) {
        \Illuminate\Support\Facades\DB::table('users')->insert([
            'full_name' => 'ESP32 Device',
            'email' => 'esp32@device.local',
            'password' => bcrypt('esp32-device-token'),
            'role' => 'user',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $user = \App\Models\User::where('email', 'esp32@device.local')->first();
    }
    $user->tokens()->delete();
    $token = $user->createToken('esp32-sensor');
    $this->info("TOKEN:{$token->plainTextToken}");
})->purpose('Generate a new Sanctum bearer token for the ESP32 device');


// Automatically manage offline devices and alerts
\Illuminate\Support\Facades\Schedule::call(function () {
    // 1. Mark devices offline and create system alerts
    $offlineDevices = \App\Models\Device::where('status', 'online')
        ->where('last_seen', '<', now()->subMinutes(2))
        ->get();

    foreach ($offlineDevices as $device) {
        $device->update(['status' => 'offline']);
        
        $alert = \App\Models\Alert::firstOrCreate([
            'device_id' => $device->id,
            'alert_type' => 'SYSTEM',
            'title' => 'Connection Lost',
            'is_active' => true,
        ], [
            'message' => "Monitoring Station {$device->device_code} ({$device->device_name}) has lost connection. Data is currently unavailable.",
            'severity' => 'WARNING',
        ]);
        
        if ($alert->wasRecentlyCreated) {
            // Future: GSM offline alert if needed
        }
    }

    // 2. Auto-expire manual alerts older than 24 hours
    \App\Models\Alert::where('alert_type', 'manual')
        ->where('is_active', true)
        ->where('created_at', '<', now()->subHours(24))
        ->update(['is_active' => false]);

})->everyMinute();

