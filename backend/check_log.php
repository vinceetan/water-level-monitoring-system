<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$logFile = storage_path('logs/laravel.log');

if (!file_exists($logFile)) {
    echo "No log file found.\n";
    exit;
}

// Read last 4KB of log
$size = filesize($logFile);
$handle = fopen($logFile, 'r');
fseek($handle, max(0, $size - 4096));
$content = fread($handle, 4096);
fclose($handle);

// Only show lines with ERROR or exception info
$lines = explode("\n", $content);
foreach ($lines as $line) {
    if (
        stripos($line, 'error') !== false ||
        stripos($line, 'exception') !== false ||
        stripos($line, 'sqlstate') !== false ||
        stripos($line, 'production.ERROR') !== false ||
        stripos($line, 'local.ERROR') !== false
    ) {
        echo $line . "\n";
    }
}

echo "\n--- Last 15 lines of log ---\n";
$last = array_slice($lines, -15);
echo implode("\n", $last);
