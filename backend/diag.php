<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

echo "=== sensor_readings columns ===\n";
echo implode(', ', Schema::getColumnListing('sensor_readings')) . "\n\n";

echo "=== settings columns ===\n";
echo implode(', ', Schema::getColumnListing('settings')) . "\n\n";

echo "=== settings row ===\n";
$settings = DB::table('settings')->first();
print_r((array)$settings);

echo "=== latest sensor_readings ===\n";
$reading = DB::table('sensor_readings')->latest('created_at')->first();
print_r((array)$reading);

echo "=== recent laravel log ===\n";
$logFile = storage_path('logs/laravel.log');
if (file_exists($logFile)) {
    $lines = file($logFile);
    $last = array_slice($lines, -30);
    echo implode('', $last);
} else {
    echo "No log file found.\n";
}
