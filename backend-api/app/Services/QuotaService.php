<?php

namespace App\Services;

use App\Models\Center;
use App\Models\CenterClosure;
use App\Models\PublicHoliday;
use App\Models\Quota;
use App\Models\TimeSlotTemplate;
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

        // Preload all quotas for the range — groupBy date pour gérer les créneaux
        $quotas = Quota::where('center_id', $center->id)
            ->whereBetween('date', [$today->toDateString(), $endDate->toDateString()])
            ->orderBy('time_slot')
            ->get()
            ->groupBy(fn ($q) => $q->date->toDateString());

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

        // Au moins un quota actif avec des places disponibles pour ce jour
        return Quota::where('center_id', $center->id)
            ->whereDate('date', $date->toDateString())
            ->where('is_suspended', false)
            ->where('booked_slots', '<', DB::raw('total_slots'))
            ->exists();
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
    /**
     * Génère les 4 créneaux standards pour un jour donné.
     * Retourne le nombre de créneaux créés.
     */
    public function generateDaySlots(Center $center, string $date, int $slotsPerSlot): int
    {
        // Utiliser les templates de la DB, sinon les valeurs par défaut
        $slots = TimeSlotTemplate::orderBy('sort_order')->orderBy('label')->pluck('label')->toArray();
        if (empty($slots)) {
            $slots = Quota::TIME_SLOTS;
        }

        $created = 0;
        foreach ($slots as $slot) {
            $exists = Quota::where('center_id', $center->id)
                ->whereDate('date', $date)
                ->where('time_slot', $slot)
                ->exists();

            if (! $exists) {
                Quota::create([
                    'center_id'    => $center->id,
                    'date'         => $date,
                    'time_slot'    => $slot,
                    'total_slots'  => $slotsPerSlot,
                    'booked_slots' => 0,
                    'is_suspended' => false,
                ]);
                $created++;
            }
        }
        return $created;
    }

    public function generateBulkQuotas(
        Center $center,
        Carbon $from,
        Carbon $to,
        int $dailySlots = self::DEFAULT_DAILY_SLOTS,
        bool $skipWeekends = true,
        bool $overwrite = false,
        bool $useTimeSlots = false,
        int $slotsPerTimeSlot = 0
    ): int {
        $created = 0;
        $cursor  = $from->copy();

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
                if ($useTimeSlots) {
                    // Utiliser les templates de la DB, sinon les valeurs par défaut
                    $templateSlots = TimeSlotTemplate::orderBy('sort_order')->pluck('label')->toArray();
                    if (empty($templateSlots)) $templateSlots = Quota::TIME_SLOTS;

                    $perSlot = $slotsPerTimeSlot > 0 ? $slotsPerTimeSlot : intdiv($dailySlots, count($templateSlots));
                    foreach ($templateSlots as $slot) {
                        if ($overwrite) {
                            Quota::updateOrCreate(
                                ['center_id' => $center->id, 'date' => $dateStr, 'time_slot' => $slot],
                                ['total_slots' => $perSlot, 'booked_slots' => 0, 'is_suspended' => false]
                            );
                            $created++;
                        } else {
                            $exists = Quota::where('center_id', $center->id)
                                ->whereDate('date', $dateStr)
                                ->where('time_slot', $slot)
                                ->exists();
                            if (! $exists) {
                                Quota::create([
                                    'center_id'    => $center->id,
                                    'date'         => $dateStr,
                                    'time_slot'    => $slot,
                                    'total_slots'  => $perSlot,
                                    'booked_slots' => 0,
                                    'is_suspended' => false,
                                ]);
                                $created++;
                            }
                        }
                    }
                } else {
                    // Génération classique (sans créneau)
                    if ($overwrite) {
                        Quota::updateOrCreate(
                            ['center_id' => $center->id, 'date' => $dateStr, 'time_slot' => null],
                            ['total_slots' => $dailySlots, 'booked_slots' => 0, 'is_suspended' => false]
                        );
                        $created++;
                    } else {
                        $exists = Quota::where('center_id', $center->id)
                            ->whereDate('date', $dateStr)
                            ->whereNull('time_slot')
                            ->exists();
                        if (! $exists) {
                            Quota::create([
                                'center_id'    => $center->id,
                                'date'         => $dateStr,
                                'time_slot'    => null,
                                'total_slots'  => $dailySlots,
                                'booked_slots' => 0,
                                'is_suspended' => false,
                            ]);
                            $created++;
                        }
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
        Collection $quotasByDate,
        Collection $closures,
        string $dateStr
    ): ?array {
        if ($date->isPast() && ! $date->isToday()) {
            return null;
        }

        $unavailableReason = null;
        if ($this->isPublicHoliday($date)) {
            $unavailableReason = 'public_holiday';
        } elseif ($this->isCenterClosedByCollection($closures, $date)) {
            $unavailableReason = 'center_closed';
        }

        // Quotas du jour (Collection ou null)
        /** @var Collection|null $dayQuotas */
        $dayQuotas = $quotasByDate->get($dateStr);

        if ($unavailableReason) {
            $total   = $dayQuotas ? $dayQuotas->sum('total_slots') : 0;
            $booked  = $dayQuotas ? $dayQuotas->sum('booked_slots') : 0;
            return [
                'date'               => $dateStr,
                'total_slots'        => $total,
                'booked_slots'       => $booked,
                'available_slots'    => 0,
                'is_available'       => false,
                'is_suspended'       => false,
                'unavailable_reason' => $unavailableReason,
                'quota_id'           => null,
                'time_slots'         => null,
            ];
        }

        if (! $dayQuotas || $dayQuotas->isEmpty()) {
            return null;
        }

        // Déterminer si ce jour utilise des créneaux ou l'ancien système
        $hasTimeSlots = $dayQuotas->contains(fn ($q) => $q->time_slot !== null);

        if ($hasTimeSlots) {
            // ── Mode créneaux ────────────────────────────────────────
            $timeSlots   = $dayQuotas->filter(fn ($q) => $q->time_slot !== null);
            $totalAll    = $timeSlots->sum('total_slots');
            $bookedAll   = $timeSlots->sum('booked_slots');
            $availAll    = max(0, $totalAll - $bookedAll);
            $allSuspended = $timeSlots->every(fn ($q) => $q->is_suspended);
            $anyAvailable = $timeSlots->contains(fn ($q) => ! $q->is_suspended && $q->available_slots > 0);

            $timeSlotsData = $timeSlots->map(fn ($q) => [
                'quota_id'        => $q->id,
                'time_slot'       => $q->time_slot,
                'total_slots'     => $q->total_slots,
                'booked_slots'    => $q->booked_slots,
                'available_slots' => $q->available_slots,
                'is_available'    => ! $q->is_suspended && $q->available_slots > 0,
                'is_suspended'    => $q->is_suspended,
                'suspension_reason' => $q->suspension_reason,
            ])->values();

            return [
                'date'               => $dateStr,
                'total_slots'        => $totalAll,
                'booked_slots'       => $bookedAll,
                'available_slots'    => $availAll,
                'is_available'       => $anyAvailable,
                'is_suspended'       => $allSuspended,
                'unavailable_reason' => $anyAvailable ? null : ($allSuspended ? 'suspended' : 'full'),
                'quota_id'           => null,
                'time_slots'         => $timeSlotsData,
            ];
        }

        // ── Mode ancien (sans créneau) ────────────────────────────
        /** @var Quota $quota */
        $quota = $dayQuotas->first();

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
                'time_slots'         => null,
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
            'time_slots'         => null,
        ];
    }

    private function isCenterClosedByCollection(Collection $closures, Carbon $date): bool
    {
        return $closures->contains(function ($closure) use ($date) {
            return $closure->date_from->lte($date) && $closure->date_to->gte($date);
        });
    }
}
