<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quota extends Model
{
    use HasFactory, HasUuids;

    // Créneaux horaires standards
    public const TIME_SLOTS = ['08h-10h', '10h-12h', '12h-14h', '14h-16h'];

    protected $fillable = [
        'center_id',
        'date',
        'time_slot',
        'total_slots',
        'booked_slots',
        'is_suspended',
        'suspension_reason',
    ];

    protected $appends = ['available_slots'];

    protected function casts(): array
    {
        return [
            'date'         => 'date',
            'is_suspended' => 'boolean',
        ];
    }

    public function getAvailableSlotsAttribute(): int
    {
        return max(0, $this->total_slots - $this->booked_slots);
    }

    public function center()
    {
        return $this->belongsTo(Center::class);
    }

    public function passportRequests()
    {
        return $this->hasMany(PassportRequest::class);
    }

    public function getAvailableSlots(): int
    {
        return max(0, $this->total_slots - $this->booked_slots);
    }

    public function hasAvailableSlots(): bool
    {
        return ! $this->is_suspended && $this->getAvailableSlots() > 0;
    }

    // Incrémente booked_slots avec verrou pessimiste pour éviter le surbooking
    public function incrementBookedSlots(): bool
    {
        return static::where('id', $this->id)
            ->where('booked_slots', '<', \DB::raw('total_slots'))
            ->where('is_suspended', false)
            ->increment('booked_slots') > 0;
    }

    public function decrementBookedSlots(): void
    {
        static::where('id', $this->id)
            ->where('booked_slots', '>', 0)
            ->decrement('booked_slots');
    }
}
