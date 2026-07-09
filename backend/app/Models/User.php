<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The table associated with the model.
     * (Explicit is better than implicit — even though Laravel would guess "users")
     */
    protected $table = 'users';

    /**
     * The attributes that are mass assignable.
     *
     * These are the columns we allow to be set via create() or update().
     * We do NOT include 'id' or 'role' here for security — role should
     * only be set explicitly by admin logic, never from user input.
     */
    protected $fillable = [
        'full_name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * When this model is converted to JSON (for API responses),
     * these columns will be automatically excluded.
     */
    protected $hidden = [
        'password',
    ];

    /**
     * The attributes that should be cast.
     *
     * 'hashed' means Laravel will auto-hash any value assigned to 'password'.
     * So we can write: $user->password = 'plain_text' and it stores a bcrypt hash.
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    /**
     * Check if the user is an admin.
     *
     * Usage: $user->isAdmin() — used in middleware and controllers.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if the user is a community member.
     */
    public function isCommunity(): bool
    {
        return $this->role === 'community';
    }

    // ---------------------------------------------------------------
    // Relationships
    // ---------------------------------------------------------------

    /**
     * A user (admin) has many alerts they've sent.
     *
     * Usage: $user->alerts to get all manual alerts sent by this admin.
     */
    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }
}
