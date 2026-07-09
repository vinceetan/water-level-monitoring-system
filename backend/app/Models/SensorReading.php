<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SensorReading extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'sensor_readings';

    /**
     * Disable the updated_at timestamp.
     *
     * Sensor readings are immutable — once recorded, they are never edited.
     * Your table only has created_at, no updated_at. If we don't set this,
     * Laravel will crash trying to write to a column that doesn't exist.
     */
    const UPDATED_AT = null;

    /**
     * The attributes that are mass assignable.
     *
     * These are the fields the ESP32 will send with each reading.
     * 'status' is included because the ESP32 (or Laravel) will calculate
     * whether the level is SAFE, WARNING, or CRITICAL.
     */
    protected $fillable = [
        'device_id',
        'distance_cm',
        'water_level_percent',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * Casting decimals to 'decimal:2' ensures consistent precision
     * in JSON responses (always 2 decimal places).
     */
    protected function casts(): array
    {
        return [
            'distance_cm' => 'decimal:2',
            'water_level_percent' => 'decimal:2',
        ];
    }

    // ---------------------------------------------------------------
    // Relationships
    // ---------------------------------------------------------------

    /**
     * A sensor reading belongs to a device.
     *
     * Usage: $reading->device to get the device that recorded this reading.
     */
    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
