<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PassportRequest;
use App\Models\QrScanLog;
use App\Services\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminQrController extends Controller
{
    public function __construct(private QrCodeService $qrCodeService) {}

    /**
     * POST /api/admin/scan-qr
     * Scan principal — enregistre la présence et logue tout.
     */
    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token'     => ['required', 'string', 'max:600'],
            'scan_mode' => ['nullable', 'string', 'in:manual,camera,file'],
        ]);

        $result = $this->qrCodeService->processScan(
            rawToken:    $data['token'],
            adminUserId: $request->user()->id,
            ip:          $request->ip(),
            userAgent:   $request->userAgent() ?? '',
            mode:        $data['scan_mode'] ?? 'manual',
        );

        return response()->json($result->toArray(), $result->valid ? 200 : 422);
    }

    /**
     * GET /api/admin/scan-history
     * Historique des scans avec pagination.
     */
    public function history(Request $request): JsonResponse
    {
        $request->validate([
            'center_id'  => ['nullable', 'uuid'],
            'date'       => ['nullable', 'date'],
            'result'     => ['nullable', 'string'],
            'agent_id'   => ['nullable', 'uuid'],
            'per_page'   => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $query = QrScanLog::with([
                'passportRequest:id,reference_number,appointment_date,status,center_id',
                'passportRequest.center:id,name',
                'passportRequest.applicant:id,passport_request_id,last_name,first_name',
                'scannedBy:id,name',
            ])
            ->latest('scanned_at');

        if ($request->filled('result')) {
            $query->where('scan_result', $request->result);
        }
        if ($request->filled('agent_id')) {
            $query->where('scanned_by', $request->agent_id);
        }
        if ($request->filled('date')) {
            $query->whereDate('scanned_at', $request->date);
        }
        if ($request->filled('center_id')) {
            $query->whereHas('passportRequest', fn ($q) => $q->where('center_id', $request->center_id));
        }

        $perPage = (int) ($request->per_page ?? 50);
        $result  = $query->paginate($perPage);

        // Stats de la journée
        $today     = now()->toDateString();
        $todayLogs = QrScanLog::whereDate('scanned_at', $today);

        $todayStats = [
            'total'           => (clone $todayLogs)->count(),
            'success'         => (clone $todayLogs)->where('scan_result', QrScanLog::RESULT_SUCCESS)->count(),
            'already_scanned' => (clone $todayLogs)->where('scan_result', QrScanLog::RESULT_ALREADY_SCANNED)->count(),
            'invalid'         => (clone $todayLogs)->whereIn('scan_result', [
                QrScanLog::RESULT_INVALID_SIGNATURE,
                QrScanLog::RESULT_NOT_FOUND,
                QrScanLog::RESULT_WRONG_DATE,
            ])->count(),
        ];

        return response()->json([
            'data'        => $result->items(),
            'meta'        => [
                'current_page' => $result->currentPage(),
                'last_page'    => $result->lastPage(),
                'per_page'     => $result->perPage(),
                'total'        => $result->total(),
            ],
            'today_stats' => $todayStats,
        ]);
    }

    /**
     * GET /api/admin/scan-history/stats
     * Statistiques de scan par agent et par résultat.
     */
    public function stats(Request $request): JsonResponse
    {
        $date = $request->query('date', now()->toDateString());

        $byResult = QrScanLog::whereDate('scanned_at', $date)
            ->selectRaw('scan_result, COUNT(*) as total')
            ->groupBy('scan_result')
            ->get();

        $byAgent = QrScanLog::whereDate('scanned_at', $date)
            ->whereNotNull('scanned_by')
            ->selectRaw('scanned_by, COUNT(*) as total, SUM(CASE WHEN scan_result = ? THEN 1 ELSE 0 END) as successes', [QrScanLog::RESULT_SUCCESS])
            ->with('scannedBy:id,name')
            ->groupBy('scanned_by')
            ->get();

        $byHour = QrScanLog::whereDate('scanned_at', $date)
            ->selectRaw("EXTRACT(HOUR FROM scanned_at) as hour, COUNT(*) as total")
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        return response()->json([
            'data' => [
                'date'      => $date,
                'by_result' => $byResult,
                'by_agent'  => $byAgent,
                'by_hour'   => $byHour,
            ],
        ]);
    }
}
