<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class CenterClosure extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'center_id',
        'date_from',
        'date_to',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'date_from'  => 'date',
        'date_to'    => 'date',
        'created_at' => 'datetime',
    ];

    public function center(): BelongsTo
    {
        return $this->belongsTo(Center::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by');
    }

    public static function isClosed(string $centerId, Carbon $date): bool
    {
        return static::where('center_id', $centerId)
            ->whereDate('date_from', '<=', $date->toDateString())
            ->whereDate('date_to', '>=', $date->toDateString())
            ->exists();
    }
}
