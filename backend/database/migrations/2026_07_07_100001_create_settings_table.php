<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->decimal('sensor_height_cm', 6, 2)->default(300.0);
            $table->decimal('warning_level_cm', 6, 2)->default(200.0);
            $table->decimal('critical_level_cm', 6, 2)->default(250.0);
            $table->integer('sampling_interval_seconds')->default(5);
            $table->boolean('buzzer_enabled')->default(true);
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};