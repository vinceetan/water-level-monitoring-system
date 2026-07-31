<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
(new \Database\Seeders\MockDataSeeder)->run();
(new \Database\Seeders\DemoDataSeeder)->run();
echo "Seeded successfully!\n";
