<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Center;
use App\Models\PassportRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminStatsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $centerId = $request->query('center_id');
        $today    = Carbon::today();

        $base = PassportRequest::query();
        if ($centerId) {
            $base->where('center_id', $centerId);
        }

        // ── Compteurs globaux ─────────────────────────────────────
        $total         = (clone $base)->count();
        $todayTotal    = (clone $base)->whereDate('appointment_date', $today)->count();
        $todayPresent  = (clone $base)->whereDate('appointment_date', $today)->where('status', 'present')->count();
        $todayAbsent   = (clone $base)->whereDate('appointment_date', $today)->where('status', 'absent')->count();
        $pending       = (clone $base)->where('status', 'pending')->count();
        $confirmed     = (clone $base)->where('status', 'confirmed')->count();
        $cancelled     = (clone $base)->where('status', 'cancelled')->count();

        // Ce mois
        $thisMonth = (clone $base)
            ->whereYear('appointment_date', $today->year)
            ->whereMonth('appointment_date', $today->month)
            ->count();

        // ── Par statut ────────────────────────────────────────────
        $byStatus = (clone $base)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->get()
            ->map(fn ($r) => ['status' => $r->status, 'total' => (int) $r->total]);

        // ── Par type de demande ───────────────────────────────────
        $byType = (clone $base)
            ->select('request_type', DB::raw('COUNT(*) as total'))
            ->groupBy('request_type')
            ->get()
            ->map(fn ($r) => ['type' => $r->request_type, 'total' => (int) $r->total]);

        // ── Par centre (top 10) ───────────────────────────────────
        $byCenter = (clone $base)
            ->select('center_id', DB::raw('COUNT(*) as total'))
            ->with('center:id,name,city')
            ->groupBy('center_id')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'center_id'   => $r->center_id,
                'center_name' => $r->center?->name ?? '—',
                'city'        => $r->center?->city ?? '—',
                'total'       => (int) $r->total,
            ]);

        // ── Par jour (30 derniers jours) ──────────────────────────
        $byDay = (clone $base)
            ->select(
                DB::raw("DATE(appointment_date) as date"),
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present"),
                DB::raw("SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent"),
            )
            ->where('appointment_date', '>=', $today->copy()->subDays(29))
            ->groupBy(DB::raw("DATE(appointment_date)"))
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date'    => $r->date,
                'total'   => (int) $r->total,
                'present' => (int) $r->present,
                'absent'  => (int) $r->absent,
            ]);

        // ── Taux de présence (30 jours glissants) ─────────────────
        $recent = (clone $base)
            ->whereIn('status', ['present', 'absent'])
            ->where('appointment_date', '<', $today)
            ->count();

        $recentPresent = (clone $base)
            ->where('status', 'present')
            ->where('appointment_date', '<', $today)
            ->count();

        $attendanceRate = $recent > 0 ? round(($recentPresent / $recent) * 100, 1) : null;

        return response()->json([
            'data' => [
                'counters' => [
                    'total'         => $total,
                    'today'         => $todayTotal,
                    'today_present' => $todayPresent,
                    'today_absent'  => $todayAbsent,
                    'this_month'    => $thisMonth,
                    'pending'       => $pending,
                    'confirmed'     => $confirmed,
                    'cancelled'     => $cancelled,
                    'attendance_rate' => $attendanceRate,
                ],
                'by_status'  => $byStatus,
                'by_type'    => $byType,
                'by_center'  => $byCenter,
                'by_day'     => $byDay,
            ],
        ]);
    }

    public function export(Request $request)
    {
        $from     = $request->query('date_from', now()->startOfMonth()->toDateString());
        $to       = $request->query('date_to', now()->toDateString());
        $centerId = $request->query('center_id');

        $query = PassportRequest::with(['center', 'applicant'])
            ->whereBetween('appointment_date', [$from, $to]);

        if ($centerId) {
            $query->where('center_id', $centerId);
        }

        $rows = $query->orderBy('appointment_date')->get();

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="statistiques-esonoya.csv"',
        ];

        $callback = function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM UTF-8

            fputcsv($handle, [
                'Référence', 'Date RDV', 'Statut', 'Type demande',
                'Centre', 'Ville', 'Nom', 'Prénom', 'Téléphone',
            ], ';');

            foreach ($rows as $r) {
                fputcsv($handle, [
                    $r->reference_number,
                    $r->appointment_date?->toDateString(),
                    $r->status,
                    $r->request_type,
                    $r->center?->name,
                    $r->center?->city,
                    $r->applicant?->last_name,
                    $r->applicant?->first_name,
                    $r->applicant?->phone,
                ], ';');
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}
