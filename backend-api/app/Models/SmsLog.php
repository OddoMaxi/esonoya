<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SmsLog extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'phone', 'message', 'type', 'passport_request_id',
        'status', 'provider_id', 'error_message', 'attempts', 'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'sent_at'    => 'datetime',
            'created_at' => 'datetime',
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

    public function isSent(): bool { return $this->status === 'sent'; }
}
