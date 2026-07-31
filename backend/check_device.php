<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== devices table ===\n";
$devices = DB::table('devices')->get();
foreach ($devices as $d) {
    echo "ID:{$d->id} | Code:{$d->device_code} | Name:{$d->device_name} | Status:{$d->status} | Active:{$d->is_active} | LastSeen:{$d->last_seen}\n";
}

echo "\n=== personal_access_tokens ===\n";
$tokens = DB::table('personal_access_tokens')->get();
foreach ($tokens as $t) {
    echo "ID:{$t->id} | Name:{$t->name} | Tokenable:{$t->tokenable_type}#{$t->tokenable_id} | LastUsed:{$t->last_used_at}\n";
    // Show first 8 chars of the token hash so we can identify it
    echo "  Token starts with hash: " . substr($t->token, 0, 8) . "...\n";
}

echo "\n=== sensor_readings count ===\n";
$count = DB::table('sensor_readings')->count();
echo "Total readings: {$count}\n";
