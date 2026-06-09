<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Center;
use App\Models\CenterClosure;
use App\Models\Quota;
use App\Services\QuotaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AdminQuotaController extends Controller
{
    public function __construct(private QuotaService $quotaService) {}

    // ─── Quota CRUD ───────────────────────────────────────────────

    /**
     * GET /api/admin/quotas?center_id=&month=YYYY-MM
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'center_id' => ['required', 'uuid', 'exists:centers,id'],
            'month'     => ['nullable', 'date_format:Y-m'],
        ]);

        $query = Quota::where('center_id', $request->center_id)
            ->orderBy('date');

        if ($request->filled('month')) {
            $start = Carbon::parse($request->month . '-01');
            $end   = $start->copy()->endOfMonth();
            $query->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * POST /api/admin/quotas — Créer un quota (avec ou sans créneau)
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'center_id'   => ['required', 'uuid', 'exists:centers,id'],
            'date'        => ['required', 'date', 'after_or_equal:today'],
            'time_slot'   => ['nullable', 'string', 'max:15'],
            'total_slots' => ['required', 'integer', 'min:1', 'max:500'],
        ]);

        $timeSlot = $data['time_slot'] ?? null;

        $query = Quota::where('center_id', $data['center_id'])
            ->whereDate('date', $data['date']);
        $query = $timeSlot
            ? $query->where('time_slot', $timeSlot)
            : $query->whereNull('time_slot');

        if ($query->exists()) {
            return response()->json([
                'message' => 'Un quota existe déjà pour cette date' . ($timeSlot ? " et le créneau {$timeSlot}" : '') . '.',
            ], 422);
        }

        $quota = Quota::create([
            'center_id'    => $data['center_id'],
            'date'         => $data['date'],
            'time_slot'    => $timeSlot,
            'total_slots'  => $data['total_slots'],
            'booked_slots' => 0,
            'is_suspended' => false,
        ]);

        return response()->json(['data' => $quota], 201);
    }

    /**
     * POST /api/admin/quotas/generate-day-slots — Générer les 4 créneaux standards pour un jour
     */
    public function generateDaySlots(Request $request): JsonResponse
    {
        $data = $request->validate([
            'center_id'      => ['required', 'uuid', 'exists:centers,id'],
            'date'           => ['required', 'date', 'after_or_equal:today'],
            'slots_per_slot' => ['required', 'integer', 'min:1', 'max:500'],
        ]);

        $center  = Center::findOrFail($data['center_id']);
        $created = $this->quotaService->generateDaySlots($center, $data['date'], $data['slots_per_slot']);

        return response()->json([
            'message' => "{$created} créneau(x) créé(s) sur " . count(Quota::TIME_SLOTS) . '.',
            'created' => $created,
            'slots'   => Quota::TIME_SLOTS,
        ], 201);
    }

    /**
     * PUT /api/admin/quotas/{quota} — Update total_slots
     */
    public function update(Request $request, Quota $quota): JsonResponse
    {
        $data = $request->validate([
            'total_slots' => ['required', 'integer', 'min:1', 'max:500'],
        ]);

        $this->quotaService->updateCapacity($quota, $data['total_slots']);

        return response()->json(['data' => $quota->fresh()]);
    }

    /**
     * DELETE /api/admin/quotas/{quota} — Remove quota (only if no bookings)
     */
    public function destroy(Quota $quota): JsonResponse
    {
        if ($quota->booked_slots > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer un quota avec des réservations.',
            ], 422);
        }

        $quota->delete();

        return response()->json(['message' => 'Quota supprimé.']);
    }

    // ─── Bulk generation ──────────────────────────────────────────

    /**
     * POST /api/admin/quotas/bulk — Génération en masse (avec ou sans créneaux)
     */
    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'center_id'         => ['required', 'uuid', 'exists:centers,id'],
            'date_from'         => ['required', 'date'],
            'date_to'           => ['required', 'date', 'after_or_equal:date_from'],
            'total_slots'       => ['required', 'integer', 'min:1', 'max:500'],
            'skip_weekends'     => ['boolean'],
            'overwrite'         => ['boolean'],
            'use_time_slots'    => ['boolean'],
            'slots_per_time_slot' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $center = Center::findOrFail($data['center_id']);

        $from = Carbon::parse($data['date_from']);
        $to   = Carbon::parse($data['date_to']);

        if ($to->diffInDays($from) > 365) {
            return response()->json(['message' => 'La plage ne peut pas dépasser 365 jours.'], 422);
        }

        $useTimeSlots    = $data['use_time_slots'] ?? false;
        $slotsPerSlot    = $data['slots_per_time_slot'] ?? 0;

        $count = $this->quotaService->generateBulkQuotas(
            $center,
            $from,
            $to,
            $data['total_slots'],
            $data['skip_weekends'] ?? true,
            $data['overwrite'] ?? false,
            $useTimeSlots,
            $slotsPerSlot,
        );

        $label = $useTimeSlots ? 'créneau(x)' : 'quota(s)';

        return response()->json([
            'message' => "{$count} {$label} créé(s).",
            'created' => $count,
        ]);
    }

    // ─── Suspension ───────────────────────────────────────────────

    /**
     * PATCH /api/admin/quotas/{quota}/suspend
     */
    public function suspend(Request $request, Quota $quota): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $this->quotaService->suspendDate($quota, true, $data['reason'] ?? null);

        return response()->json([
            'message' => 'Date suspendue.',
            'data'    => $quota->fresh(),
        ]);
    }

    /**
     * PATCH /api/admin/quotas/{quota}/reactivate
     */
    public function reactivate(Quota $quota): JsonResponse
    {
        $this->quotaService->suspendDate($quota, false);

        return response()->json([
            'message' => 'Date réactivée.',
            'data'    => $quota->fresh(),
        ]);
    }

    // ─── Center closures ──────────────────────────────────────────

    /**
     * GET /api/admin/center-closures?center_id=
     */
    public function listClosures(Request $request): JsonResponse
    {
        $request->validate([
            'center_id' => ['required', 'uuid', 'exists:centers,id'],
        ]);

        $closures = CenterClosure::with('createdBy:id,first_name,last_name')
            ->where('center_id', $request->center_id)
            ->orderBy('date_from')
            ->get();

        return response()->json(['data' => $closures]);
    }

    /**
     * POST /api/admin/center-closures
     */
    public function storeClosure(Request $request): JsonResponse
    {
        $data = $request->validate([
            'center_id' => ['required', 'uuid', 'exists:centers,id'],
            'date_from' => ['required', 'date'],
            'date_to'   => ['required', 'date', 'after_or_equal:date_from'],
            'reason'    => ['nullable', 'string', 'max:255'],
        ]);

        $closure = CenterClosure::create([
            ...$data,
            'created_by' => $request->user()->id,
            'created_at' => now(),
        ]);

        return response()->json(['data' => $closure], 201);
    }

    /**
     * DELETE /api/admin/center-closures/{closure}
     */
    public function destroyClosure(CenterClosure $closure): JsonResponse
    {
        $closure->delete();

        return response()->json(['message' => 'Fermeture supprimée.']);
    }

    // ─── Public holidays ─────────────────────────────────────────

    /**
     * GET /api/admin/public-holidays
     */
    public function listHolidays(): JsonResponse
    {
        $holidays = \App\Models\PublicHoliday::orderBy('date')->get();

        return response()->json(['data' => $holidays]);
    }

    /**
     * POST /api/admin/public-holidays
     */
    public function storeHoliday(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:150'],
            'date'         => ['required', 'date_format:Y-m-d'],
            'is_recurring' => ['boolean'],
            'description'  => ['nullable', 'string'],
        ]);

        $holiday = \App\Models\PublicHoliday::create($data);

        return response()->json(['data' => $holiday], 201);
    }

    /**
     * DELETE /api/admin/public-holidays/{holiday}
     */
    public function destroyHoliday(\App\Models\PublicHoliday $holiday): JsonResponse
    {
        $holiday->delete();

        return response()->json(['message' => 'Jour férié supprimé.']);
    }
}
