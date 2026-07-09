<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Device extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'devices';

    /**
     * The attributes that are mass assignable.
     *
     * device_code is included because admins need to register new devices.
     * status and last_seen are included because the ESP32 endpoint
     * will update these automatically on each check-in.
     */
    protected $fillable = [
        'device_name',
        'device_code',
        'location',
        'latitude',
        'longitude',
        'status',
        'last_seen',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * Casting 'is_active' to boolean means $device->is_active returns
     * true/false instead of 1/0 — cleaner for JSON API responses.
     * Casting 'last_seen' to datetime gives us Carbon methods like
     * $device->last_seen->diffForHumans() → "5 minutes ago"
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_seen' => 'datetime',
        ];
    }

    // ---------------------------------------------------------------
    // Relationships
    // ---------------------------------------------------------------

    /**
     * A device has many sensor readings.
     *
     * Usage: $device->sensorReadings to get all readings for this device.
     */
    public function sensorReadings(): HasMany
    {
        return $this->hasMany(SensorReading::class);
    }

    /**
     * A device has many alerts.
     *
     * Usage: $device->alerts to get all alerts triggered by this device.
     */
    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }
}
