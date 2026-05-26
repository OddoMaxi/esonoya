<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrScanLog extends Model
{
    use HasUuids;

    public $timestamps = false;

    const RESULT_SUCCESS          = 'success';
    const RESULT_ALREADY_SCANNED  = 'already_scanned';
    const RESULT_INVALID_TOKEN    = 'invalid_token';
    const RESULT_INVALID_SIGNATURE = 'invalid_signature';
    const RESULT_CANCELLED        = 'cancelled';
    const RESULT_WRONG_DATE       = 'wrong_date';
    const RESULT_NOT_FOUND        = 'not_found';

    protected $fillable = [
        'passport_request_id',
        'scanned_by',
        'raw_token',
        'scan_result',
        'ip_address',
        'user_agent',
        'scan_mode',
        'scanned_at',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    public function passportRequest(): BelongsTo
    {
        return $this->belongsTo(PassportRequest::class);
    }

    public function scannedBy(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'scanned_by');
    }

    public function isSuccess(): bool
    {
        return $this->scan_result === self::RESULT_SUCCESS;
    }
}
