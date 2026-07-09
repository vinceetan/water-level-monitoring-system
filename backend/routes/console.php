<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

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
            \App\Services\TwilioService::sendSms("⚠️ AquaWatch Alert: Station {$device->device_code} ({$device->device_name}) is OFFLINE. Connection lost.");
        }
    }

    // 2. Auto-expire manual alerts older than 24 hours
    \App\Models\Alert::where('alert_type', 'manual')
        ->where('is_active', true)
        ->where('created_at', '<', now()->subHours(24))
        ->update(['is_active' => false]);

})->everyMinute();

