<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUuids;

    protected $fillable = [
        'phone',
        'email',
        'first_name',
        'last_name',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = ['remember_token'];

    protected function casts(): array
    {
        return [
            'is_active'     => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function passportRequests()
    {
        return $this->hasMany(PassportRequest::class, 'booker_user_id');
    }
}
