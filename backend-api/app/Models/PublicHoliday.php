<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class PublicHoliday extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'date',
        'year',
        'is_recurring',
        'description',
    ];

    protected $casts = [
        'date'         => 'date',
        'year'         => 'integer',
        'is_recurring' => 'boolean',
    ];

    public static function isHoliday(Carbon $date): bool
    {
        $mmdd = $date->format('m-d');

        return static::where(function ($q) use ($date, $mmdd) {
            // Recurring holidays: match by month-day regardless of year
            $q->where('is_recurring', true)
              ->whereRaw("TO_CHAR(date, 'MM-DD') = ?", [$mmdd]);
        })->orWhere(function ($q) use ($date) {
            // One-time holidays: exact date match
            $q->where('is_recurring', false)
              ->whereDate('date', $date->toDateString());
        })->exists();
    }
}
