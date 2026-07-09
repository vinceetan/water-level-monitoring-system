<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'alerts';

    /**
     * Disable the updated_at timestamp.
     *
     * Alerts are created and may expire, but are never "updated" in the
     * traditional sense. Your table only has created_at, no updated_at.
     */
    const UPDATED_AT = null;

    /**
     * The attributes that are mass assignable.
     *
     * Note: device_id and user_id are fillable because:
     * - device_id: system alerts need to record which device triggered them
     * - user_id: manual alerts need to record which admin sent them
     * Both are nullable (system alerts have no user, manual alerts may have no device).
     */
    protected $fillable = [
        'device_id',
        'user_id',
        'title',
        'message',
        'image_url',
        'alert_type',
        'severity',
        'is_active',
        'expires_at',
    ];

    /**
     * The attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'expires_at' => 'datetime',
        ];
    }

    // ---------------------------------------------------------------
    // Relationships
    // ---------------------------------------------------------------

    /**
     * An alert may belong to a device.
     *
     * Nullable — manual alerts might not be tied to a specific device.
     * Usage: $alert->device
     */
    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    /**
     * An alert may belong to a user (the admin who sent it).
     *
     * Nullable — system-generated alerts have no user.
     * Usage: $alert->user
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
