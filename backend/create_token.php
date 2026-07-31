<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\DB;

// Find or create the ESP32 user
$user = User::where('email', 'esp32@device.local')->first();

if (!$user) {
    // Use DB::table to bypass fillable restrictions for the role field
    DB::table('users')->insert([
        'full_name' => 'ESP32 Device',
        'email' => 'esp32@device.local',
        'password' => bcrypt('esp32-device-token'),
        'role' => 'user',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $user = User::where('email', 'esp32@device.local')->first();
    echo "Created ESP32 user (ID: {$user->id})\n";
} else {
    echo "Found existing ESP32 user (ID: {$user->id})\n";
}

// Revoke old tokens
$user->tokens()->delete();

// Create new token
$token = $user->createToken('esp32-sensor');
echo "\n=== NEW BEARER TOKEN ===\n";
echo $token->plainTextToken . "\n";
echo "========================\n";
echo "\nUpdate this in your ESP32 firmware's bearerToken variable.\n";
