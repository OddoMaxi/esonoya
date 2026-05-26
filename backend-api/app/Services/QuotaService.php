<?php

namespace App\Services;

use App\Models\Center;
use App\Models\CenterClosure;
use App\Models\PublicHoliday;
use App\Models\Quota;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class QuotaService
{
    private const DEFAULT_HORIZON_DAYS = 60;
    private const DEFAULT_DAILY_SLOTS  = 30;

    /**
     * Return all available dates for a center within the booking horizon.
     * Each item includes slot counts + reason if unavailable.
     */
    public function getAvailableDates(Center $center, int $horizonDays = self::DEFAULT_HORIZON_DAYS): Collection
    {
        if (! $center->is_active) {
            return collect();
        }

        $today   = Carbon::today();
        $endDate = $today->copy()->addDays($horizonDays);

        // Preload quotas for the range in one query
        $quotas = Quota::where('center_id', $center->id)
            ->whereBetween('date', [$today->toDateString(), $endDate->toDateString()])
            ->get()
            ->keyBy(fn ($q) => $q->date->toDateString());

        // Preload closures for the range
        $closures = CenterClosure::where('center_id', $center->id)
            ->where('date_to', '>=', $today->toDateString())
            ->where('date_from', '<=', $endDate->toDateString())
            ->get();

        $results = collect();
        $cursor  = $today->copy();

        while ($cursor->lte($endDate)) {
            $dateStr = $cursor->toDateString();

            $entry = $this->buildDateEntry($center, $cursor, $quotas, $closures, $dateStr);

            if ($entry !== null) {
                $results->push($entry);
            }

            $cursor->addDay();
        }

        return $results;
    }

    /**
     * Check whether a specific date is available for booking at a center.
     */
    public function isDateAvailable(Center $center, Carbon $date): bool
    {
        if (! $center->is_active) {
            return false;
        }

        if ($date->isPast() && ! $date->isToday()) {
            return false;
        }

        if ($this->isPublicHoliday($date)) {
            return false;
        }

        if (CenterClosure::isClosed($center->id, $date)) {
            return false;
        }

        $quota = Quota::where('center_id', $center->id)
            ->whereDate('date', $date->toDateString())
            ->first();

        if (! $quota) {
            return false;
        }

        if ($quota->is_suspended) {
            return false;
        }

        return $quota->available_slots > 0;
    }

    public function isPublicHoliday(Carbon $date): bool
    {
        return PublicHoliday::isHoliday($date);
    }

    /**
     * Generate quotas for a date range with a given daily capacity.
     * Skips weekends, holidays, and closure periods.
     * Does not overwrite existing quotas unless $overwrite is true.
     */
    public function generateBulkQuotas(
        Center $center,
        Carbon $from,
        Carbon $to,
        int $dailySlots = self::DEFAULT_DAILY_SLOTS,
        bool $skipWeekends = true,
        bool $overwrite = false
    ): int {
        $created = 0;
        $cursor  = $from->copy();

        // Preload closures once
        $closures = CenterClosure::where('center_id', $center->id)
            ->where('date_to', '>=', $from->toDateString())
            ->where('date_from', '<=', $to->toDateString())
            ->get();

        while ($cursor->lte($to)) {
            $dateStr = $cursor->toDateString();

            $skip = ($skipWeekends && $cursor->isWeekend())
                 || $this->isPublicHoliday($cursor)
                 || $this->isCenterClosedByCollection($closures, $cursor);

            if (! $skip) {
                if ($overwrite) {
                    Quota::updateOrCreate(
                        ['center_id' => $center->id, 'date' => $dateStr],
                        ['total_slots' => $dailySlots, 'booked_slots' => 0, 'is_suspended' => false]
                    );
                    $created++;
                } else {
                    $exists = Quota::where('center_id', $center->id)
                        ->whereDate('date', $dateStr)
                        ->exists();

                    if (! $exists) {
                        Quota::create([
                            'center_id'    => $center->id,
                            'date'         => $dateStr,
                            'total_slots'  => $dailySlots,
                            'booked_slots' => 0,
                            'is_suspended' => false,
                        ]);
                        $created++;
                    }
                }
            }

            $cursor->addDay();
        }

        return $created;
    }

    /**
     * Suspend or reactivate a quota date with an optional reason.
     */
    public function suspendDate(Quota $quota, bool $suspend, ?string $reason = null): void
    {
        $quota->update([
            'is_suspended'       => $suspend,
            'suspension_reason'  => $suspend ? $reason : null,
        ]);
    }

    /**
     * Update the total slot capacity for a quota, adjusting available_slots accordingly.
     */
    public function updateCapacity(Quota $quota, int $newTotal): void
    {
        DB::transaction(function () use ($quota, $newTotal) {
            $quota->lockForUpdate()->first();
            $quota->refresh();

            $booked = $quota->booked_slots;

            $quota->update([
                'total_slots' => $newTotal,
                // never go below 0
                'booked_slots' => min($booked, $newTotal),
            ]);
        });
    }

    // ─── Private helpers ──────────────────────────────────────────

    private function buildDateEntry(
        Center $center,
        Carbon $date,
        Collection $quotas,
        Collection $closures,
        string $dateStr
    ): ?array {
        // Skip past dates
        if ($date->isPast() && ! $date->isToday()) {
            return null;
        }

        $unavailableReason = null;

        if ($this->isPublicHoliday($date)) {
            $unavailableReason = 'public_holiday';
        } elseif ($this->isCenterClosedByCollection($closures, $date)) {
            $unavailableReason = 'center_closed';
        }

        /** @var Quota|null $quota */
        $quota = $quotas->get($dateStr);

        if ($unavailableReason) {
            return [
                'date'               => $dateStr,
                'total_slots'        => $quota?->total_slots ?? 0,
                'booked_slots'       => $quota?->booked_slots ?? 0,
                'available_slots'    => 0,
                'is_available'       => false,
                'is_suspended'       => false,
                'unavailable_reason' => $unavailableReason,
                'quota_id'           => $quota?->id,
            ];
        }

        if (! $quota) {
            // No quota configured for this date — not bookable
            return null;
        }

        if ($quota->is_suspended) {
            return [
                'date'               => $dateStr,
                'total_slots'        => $quota->total_slots,
                'booked_slots'       => $quota->booked_slots,
                'available_slots'    => 0,
                'is_available'       => false,
                'is_suspended'       => true,
                'unavailable_reason' => 'suspended',
                'suspension_reason'  => $quota->suspension_reason,
                'quota_id'           => $quota->id,
            ];
        }

        $available = $quota->available_slots;

        return [
            'date'               => $dateStr,
            'total_slots'        => $quota->total_slots,
            'booked_slots'       => $quota->booked_slots,
            'available_slots'    => $available,
            'is_available'       => $available > 0,
            'is_suspended'       => false,
            'unavailable_reason' => $available === 0 ? 'full' : null,
            'quota_id'           => $quota->id,
        ];
    }

    private function isCenterClosedByCollection(Collection $closures, Carbon $date): bool
    {
        return $closures->contains(function ($closure) use ($date) {
            return $closure->date_from->lte($date) && $closure->date_to->gte($date);
        });
    }
}
