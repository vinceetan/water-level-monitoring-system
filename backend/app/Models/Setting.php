<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'settings';

    /**
     * Disable the created_at timestamp.
     *
     * Settings are a single-row config table — they are updated, not created.
     * Your table only has updated_at, no created_at.
     */
    const CREATED_AT = null;

    /**
     * The attributes that are mass assignable.
     *
     * All config values are editable by the admin from the dashboard.
     */
    protected $fillable = [
        'sensor_height_cm',
        'warning_level_percent',
        'critical_level_percent',
        'sampling_interval_seconds',
        'buzzer_enabled',
    ];

    /**
     * The attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'sensor_height_cm' => 'decimal:2',
            'buzzer_enabled' => 'boolean',
        ];
    }
}
