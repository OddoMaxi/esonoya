<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PassportRequest;
use App\Services\QrCodeService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class AdminAppointmentController extends Controller
{
    public function __construct(private readonly QrCodeService $qrCodeService) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status'    => ['nullable', 'in:pending,confirmed,present,absent,cancelled'],
            'center_id' => ['nullable', 'uuid'],
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date'],
            'search'    => ['nullable', 'string', 'max:100'],
            'per_page'  => ['nullable', 'integer', 'min:5', 'max:100'],
            'page'      => ['nullable', 'integer', 'min:1'],
        ]);

        $query = PassportRequest::with(['center:id,name,city', 'applicant:id,passport_request_id,last_name,first_name,phone,email'])
            ->latest('appointment_date');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('center_id')) {
            $query->where('center_id', $request->center_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('appointment_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('appointment_date', '<=', $request->date_to);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('reference_number', 'ilike', "%{$s}%")
                  ->orWhere('receipt_reference', 'ilike', "%{$s}%")
                  ->orWhereHas('applicant', fn ($aq) =>
                      $aq->where('last_name', 'ilike', "%{$s}%")
                         ->orWhere('first_name', 'ilike', "%{$s}%")
                         ->orWhere('phone', 'ilike', "%{$s}%")
                  );
            });
        }

        $perPage = (int) ($request->per_page ?? 20);
        $result  = $query->paginate($perPage);

        return response()->json([
            'data' => $result->items(),
            'meta' => [
                'current_page' => $result->currentPage(),
                'last_page'    => $result->lastPage(),
                'per_page'     => $result->perPage(),
                'total'        => $result->total(),
            ],
        ]);
    }

    public function show(PassportRequest $appointment): JsonResponse
    {
        $appointment->load([
            'center',
            'applicant',
            'declarant',
            'booker',
            'scannedBy:id,name,email',
        ]);

        return response()->json(['data' => $appointment]);
    }

    public function updateStatus(Request $request, PassportRequest $appointment): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,confirmed,present,absent,cancelled'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $old = $appointment->status;

        $appointment->update([
            'status'              => $data['status'],
            'cancellation_reason' => $data['status'] === 'cancelled' ? ($data['reason'] ?? null) : $appointment->cancellation_reason,
            'cancelled_at'        => $data['status'] === 'cancelled' ? now() : $appointment->cancelled_at,
        ]);

        AuditLog::create([
            'admin_user_id' => $request->user()->id,
            'action'        => 'appointment.status_updated',
            'subject_type'  => PassportRequest::class,
            'subject_id'    => $appointment->id,
            'old_values'    => ['status' => $old],
            'new_values'    => ['status' => $data['status']],
            'ip_address'    => $request->ip(),
            'user_agent'    => $request->userAgent(),
        ]);

        return response()->json(['data' => $appointment->fresh(['center', 'applicant'])]);
    }

    public function downloadPdf(PassportRequest $appointment): Response
    {
        $appointment->load(['center', 'applicant']);

        $qrUrl = $this->qrCodeService->buildQrContent($appointment);
        $qrSvg = (string) QrCode::format('svg')->size(200)->margin(1)->errorCorrection('M')->generate($qrUrl);
        // Supprimer la déclaration XML pour l'embedding inline dans DomPDF
        $qrSvg = trim(preg_replace('/<\?xml[^?>]*\?>/', '', $qrSvg));

        $imgUri = fn(string $path, string $mime) =>
            file_exists($path) ? "data:{$mime};base64," . base64_encode(file_get_contents($path)) : '';

        $logoDataUri    = $imgUri(public_path('images/logo.png'),      'image/png');
        $mspcDataUri    = $imgUri(public_path('images/mspc.jpeg'),     'image/jpeg');
        $dcpafDataUri   = $imgUri(public_path('images/dcpaf.jpg'),     'image/jpeg');
        $esonoyaDataUri = $imgUri(public_path('images/esonoya.png'),   'image/png');

        $pdf = Pdf::loadView('pdf.appointment-ticket', [
            'appointment'    => $appointment,
            'qrSvg'          => $qrSvg,
            'logoDataUri'    => $logoDataUri,
            'mspcDataUri'    => $mspcDataUri,
            'dcpafDataUri'   => $dcpafDataUri,
            'esonoyaDataUri' => $esonoyaDataUri,
        ])
        ->setPaper('a4', 'portrait')
        ->setOptions([
            'dpi'                  => 150,
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled'      => false,
            'defaultFont'          => 'DejaVu Sans',
        ]);

        return $pdf->download('ticket-' . $appointment->reference_number . '.pdf');
    }

    public function export(Request $request)
    {
        $query = PassportRequest::with(['center', 'applicant'])
            ->latest('appointment_date');

        if ($request->filled('status'))    $query->where('status', $request->status);
        if ($request->filled('center_id')) $query->where('center_id', $request->center_id);
        if ($request->filled('date_from')) $query->whereDate('appointment_date', '>=', $request->date_from);
        if ($request->filled('date_to'))   $query->whereDate('appointment_date', '<=', $request->date_to);

        $rows = $query->limit(5000)->get();

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="rendez-vous-esonoya.csv"',
        ];

        $callback = function () use ($rows) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($out, [
                'Référence', 'Réf. reçu', 'Date RDV', 'Statut', 'Type',
                'Centre', 'Nom', 'Prénom', 'Naissance', 'Téléphone', 'Email',
                'Créé le',
            ], ';');

            foreach ($rows as $r) {
                fputcsv($out, [
                    $r->reference_number,
                    $r->receipt_reference,
                    $r->appointment_date?->toDateString(),
                    $r->status,
                    $r->request_type,
                    $r->center?->name,
                    $r->applicant?->last_name,
                    $r->applicant?->first_name,
                    $r->applicant?->birth_date,
                    $r->applicant?->phone,
                    $r->applicant?->email,
                    $r->created_at?->toDateTimeString(),
                ], ';');
            }

            fclose($out);
        };

        return response()->stream($callback, 200, $headers);
    }
}
