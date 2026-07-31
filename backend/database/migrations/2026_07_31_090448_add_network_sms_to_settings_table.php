<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->string('wifi_ssid', 64)->nullable()->after('buzzer_enabled');
            $table->string('wifi_password', 64)->nullable()->after('wifi_ssid');
            $table->string('sms_target_number', 20)->nullable()->after('wifi_password');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn(['wifi_ssid', 'wifi_password', 'sms_target_number']);
        });
    }
};
