<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
App\Models\Device::where('device_code', 'DEV_ALPHA_001')->update(['is_active' => false]);
echo "Disabled mock device DEV_ALPHA_001.\n";
