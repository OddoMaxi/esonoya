<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Center extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'city',
        'address',
        'phone',
        'email',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function quotas()
    {
        return $this->hasMany(Quota::class);
    }

    public function passportRequests()
    {
        return $this->hasMany(PassportRequest::class);
    }

    public function adminUsers()
    {
        return $this->hasMany(AdminUser::class);
    }

    public function getQuotaForDate(string $date): ?Quota
    {
        return $this->quotas()->where('date', $date)->first();
    }

    public function getAvailableSlotsForDate(string $date): int
    {
        $quota = $this->getQuotaForDate($date);
        if (! $quota || $quota->is_suspended) {
            return 0;
        }
        return max(0, $quota->total_slots - $quota->booked_slots);
    }
}
