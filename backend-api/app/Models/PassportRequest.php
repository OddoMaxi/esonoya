<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PassportRequest extends Model
{
    use HasFactory, HasUuids;

    const STATUS_PENDING   = 'pending';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_PRESENT   = 'present';
    const STATUS_ABSENT    = 'absent';
    const STATUS_CANCELLED = 'cancelled';

    const TYPE_NEW     = 'new';
    const TYPE_RENEWAL = 'renewal';
    const TYPE_DUPLICATA = 'duplicata';

    protected $fillable = [
        'center_id',
        'quota_id',
        'booker_user_id',
        'reference_number',
        'receipt_reference',
        'request_type',
        'appointment_date',
        'status',
        'qr_token',
        'qr_scanned_at',
        'qr_scanned_by',
        'pdf_generated_at',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected function casts(): array
    {
        return [
            'appointment_date'  => 'date',
            'qr_scanned_at'     => 'datetime',
            'pdf_generated_at'  => 'datetime',
            'cancelled_at'      => 'datetime',
        ];
    }

    public function center()
    {
        return $this->belongsTo(Center::class);
    }

    public function quota()
    {
        return $this->belongsTo(Quota::class);
    }

    public function booker()
    {
        return $this->belongsTo(User::class, 'booker_user_id');
    }

    public function applicant()
    {
        return $this->hasOne(Applicant::class);
    }

    public function declarant()
    {
        return $this->hasOne(Declarant::class);
    }

    public function scannedBy()
    {
        return $this->belongsTo(AdminUser::class, 'qr_scanned_by');
    }

    public function notifications()
    {
        return $this->hasMany(AppointmentNotification::class);
    }

    public function isPending(): bool   { return $this->status === self::STATUS_PENDING; }
    public function isCancelled(): bool { return $this->status === self::STATUS_CANCELLED; }
    public function isPresent(): bool   { return $this->status === self::STATUS_PRESENT; }
}
