<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AppointmentNotification extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $table = 'appointment_notifications';

    protected $fillable = [
        'passport_request_id', 'type', 'channel',
        'status', 'scheduled_at', 'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'sent_at'      => 'datetime',
            'created_at'   => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(fn ($m) => $m->created_at = now());
    }

    public function passportRequest()
    {
        return $this->belongsTo(PassportRequest::class);
    }
}
