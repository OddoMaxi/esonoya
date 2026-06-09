<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PassportRequest;
use App\Models\Quota;
use App\Services\QrCodeService;
use App\Services\Sms\SmsService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class AppointmentController extends Controller
{
    public function __construct(
        private readonly QrCodeService $qrCodeService,
        private readonly SmsService    $smsService,
    ) {}

    // ─── Créer un rendez-vous ────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'center_id'         => 'required|uuid|exists:centers,id',
            'quota_id'          => 'required|uuid|exists:quotas,id',
            'request_type'      => 'required|in:new,renewal,duplicata',
            'receipt_reference' => 'required|string|max:100',
            // Demandeur
            'applicant.last_name'    => 'required|string|max:100',
            'applicant.first_name'   => 'required|string|max:100',
            'applicant.birth_date'   => 'required|date|before:today',
            'applicant.birth_place'  => 'required|string|max:150',
            'applicant.nationality'  => 'required|string|max:100',
            'applicant.gender'       => 'required|in:M,F',
            'applicant.phone'        => 'required|string|max:20',
            'applicant.email'        => 'nullable|email|max:150',
            'applicant.address'      => 'nullable|string|max:255',
            'applicant.profession'   => 'nullable|string|max:100',
            'applicant.marital_status'    => 'nullable|in:single,married,divorced,widowed',
            'applicant.height_cm'         => 'nullable|integer|min:50|max:250',
            'applicant.eye_color'         => 'nullable|string|max:50',
            'applicant.distinctive_signs' => 'nullable|string|max:255',
            'applicant.father_last_name'  => 'nullable|string|max:100',
            'applicant.father_first_name' => 'nullable|string|max:100',
            'applicant.mother_last_name'  => 'nullable|string|max:100',
            'applicant.mother_first_name' => 'nullable|string|max:100',
            // Déclarant (optionnel)
            'declarant.last_name'    => 'nullable|string|max:100',
            'declarant.first_name'   => 'nullable|string|max:100',
            'declarant.phone'        => 'nullable|string|max:20',
            'declarant.email'        => 'nullable|email|max:150',
            'declarant.relationship' => 'nullable|in:parent,sibling,spouse,other',
        ]);

        // Vérifier + réserver le quota de façon atomique
        $quota = Quota::lockForUpdate()->find($validated['quota_id']);

        if (!$quota || $quota->center_id !== $validated['center_id']) {
            return response()->json(['message' => 'Quota invalide.'], 422);
        }
        if ($quota->is_suspended || $quota->booked_slots >= $quota->total_slots) {
            return response()->json(['message' => 'Plus de places disponibles pour cette date.'], 422);
        }

        $appointment = \DB::transaction(function () use ($validated, $quota, $request) {
            $slot = $quota->incrementBookedSlots();
            if (!$slot) {
                throw new \RuntimeException('Quota épuisé.');
            }

            $appt = PassportRequest::create([
                'center_id'         => $validated['center_id'],
                'quota_id'          => $validated['quota_id'],
                'booker_user_id'    => $request->user()->id,
                'reference_number'  => $this->generateReference(),
                'receipt_reference' => $validated['receipt_reference'],
                'request_type'      => $validated['request_type'],
                'appointment_date'  => $quota->date,
                'status'            => PassportRequest::STATUS_PENDING,
                'qr_token'          => $this->qrCodeService->generateToken(),
            ]);

            $appt->applicant()->create($validated['applicant']);

            if (!empty($validated['declarant']['last_name'])) {
                $appt->declarant()->create($validated['declarant']);
            }

            return $appt;
        });

        $appointment->load(['center', 'applicant', 'quota']);

        // SMS de confirmation (non bloquant — échec silencieux)
        if ($appointment->applicant?->phone) {
            $this->smsService->sendConfirmation($appointment->applicant->phone, [
                'reference' => $appointment->reference_number,
                'center'    => $appointment->center->name,
                'date'      => Carbon::parse($appointment->appointment_date)->locale('fr')->isoFormat('D MMMM YYYY'),
                'slot'      => $appointment->quota?->time_slot ?? '',
            ], $appointment->id);
        }

        return response()->json(['data' => $this->formatAppointment($appointment)], 201);
    }

    // ─── Détail d'un rendez-vous ─────────────────────────────────
    public function show(Request $request, PassportRequest $appointment): JsonResponse
    {
        $this->authorizeOwner($request, $appointment);
        $appointment->load(['center', 'applicant', 'declarant', 'quota']);

        return response()->json(['data' => $this->formatAppointment($appointment)]);
    }

    // ─── Mes rendez-vous ─────────────────────────────────────────
    public function myAppointments(Request $request): JsonResponse
    {
        $appointments = PassportRequest::with(['center', 'applicant', 'quota'])
            ->where('booker_user_id', $request->user()->id)
            ->orderBy('appointment_date', 'desc')
            ->get();

        return response()->json([
            'data' => $appointments->map(fn($a) => $this->formatAppointment($a)),
        ]);
    }

    // ─── Annuler un rendez-vous ──────────────────────────────────
    public function cancel(Request $request, PassportRequest $appointment): JsonResponse
    {
        $this->authorizeOwner($request, $appointment);

        if ($appointment->isCancelled()) {
            return response()->json(['message' => 'Rendez-vous déjà annulé.'], 422);
        }
        if ($appointment->isPresent()) {
            return response()->json(['message' => 'Impossible d\'annuler un rendez-vous validé.'], 422);
        }

        $request->validate(['reason' => 'nullable|string|max:500']);

        \DB::transaction(function () use ($appointment, $request) {
            $appointment->update([
                'status'              => PassportRequest::STATUS_CANCELLED,
                'cancelled_at'        => now(),
                'cancellation_reason' => $request->input('reason'),
            ]);

            // Libérer le slot
            $appointment->quota?->decrement('booked_slots');
        });

        // SMS d'annulation (non bloquant)
        $appointment->load('applicant');
        if ($appointment->applicant?->phone) {
            $this->smsService->sendCancellation($appointment->applicant->phone, [
                'reference' => $appointment->reference_number,
                'center'    => $appointment->center->name,
                'date'      => Carbon::parse($appointment->appointment_date)->locale('fr')->isoFormat('D MMMM YYYY'),
            ], $appointment->id);
        }

        return response()->json(['message' => 'Rendez-vous annulé avec succès.']);
    }

    // ─── Télécharger le ticket PDF ───────────────────────────────
    public function downloadPdf(Request $request, PassportRequest $appointment): Response
    {
        $this->authorizeOwner($request, $appointment);

        $filename  = 'ticket-' . $appointment->reference_number . '.pdf';
        $cachePath = storage_path('app/tickets/' . $filename);

        // Servir le PDF depuis le cache disque si déjà généré
        if (file_exists($cachePath)) {
            return response()->file($cachePath, [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        }

        $appointment->load(['center', 'applicant', 'quota']);

        $qrUrl     = $this->qrCodeService->buildQrContent($appointment);
        $qrSvg     = (string) QrCode::format('svg')->size(200)->margin(2)->errorCorrection('M')->generate($qrUrl);
        $qrDataUri = 'data:image/svg+xml;base64,' . base64_encode($qrSvg);

        $logoDataUri    = $this->getLogoDataUri();
        $mspcDataUri    = $this->imgDataUri(public_path('images/mspc.jpeg'),  'image/jpeg');
        $dcpafDataUri   = $this->imgDataUri(public_path('images/dcpaf.jpg'),  'image/jpeg');
        $esonoyaDataUri = $this->imgDataUri(public_path('images/esonoya.png'), 'image/png');

        $pdf = Pdf::loadView('pdf.appointment-ticket', [
            'appointment'    => $appointment,
            'qrDataUri'      => $qrDataUri,
            'logoDataUri'    => $logoDataUri,
            'mspcDataUri'    => $mspcDataUri,
            'dcpafDataUri'   => $dcpafDataUri,
            'esonoyaDataUri' => $esonoyaDataUri,
        ])
        ->setPaper('a4', 'portrait')
        ->setOptions([
            'dpi'                  => 96,
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled'      => false,
            'defaultFont'          => 'DejaVu Sans',
        ]);

        // Sauvegarder sur disque + mettre à jour la date
        @mkdir(storage_path('app/tickets'), 0755, true);
        $pdf->save($cachePath);
        $appointment->update(['pdf_generated_at' => now()]);

        return response()->file($cachePath, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    // ─── Télécharger la fiche de demande PDF ─────────────────────
    public function downloadFiche(Request $request, PassportRequest $appointment): Response
    {
        $this->authorizeOwner($request, $appointment);

        $appointment->load(['center', 'applicant', 'quota']);

        $mspcDataUri    = $this->imgDataUri(public_path('images/mspc.jpeg'),   'image/jpeg');
        $dcpafDataUri   = $this->imgDataUri(public_path('images/dcpaf.jpg'),   'image/jpeg');
        $esonoyaDataUri = $this->imgDataUri(public_path('images/esonoya.png'), 'image/png');

        $pdf = Pdf::loadView('pdf.passport-application', [
            'appointment'    => $appointment,
            'mspcDataUri'    => $mspcDataUri,
            'dcpafDataUri'   => $dcpafDataUri,
            'esonoyaDataUri' => $esonoyaDataUri,
        ])
        ->setPaper('a4', 'portrait')
        ->setOptions([
            'dpi'                  => 96,
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled'      => false,
            'defaultFont'          => 'DejaVu Sans',
        ]);

        $filename = 'fiche-demande-' . $appointment->reference_number . '.pdf';

        return $pdf->download($filename);
    }

    // ─── Helpers privés ──────────────────────────────────────────
    private function authorizeOwner(Request $request, PassportRequest $appointment): void
    {
        if ($appointment->booker_user_id !== $request->user()->id) {
            abort(403, 'Accès non autorisé.');
        }
    }

    private function generateReference(): string
    {
        do {
            $ref = 'GN' . strtoupper(Str::random(6));
        } while (PassportRequest::where('reference_number', $ref)->exists());

        return $ref;
    }

    private function imgDataUri(string $path, string $mime): string
    {
        return file_exists($path)
            ? "data:{$mime};base64," . base64_encode(file_get_contents($path))
            : '';
    }

    private function getLogoDataUri(): string
    {
        $path = public_path('images/logo.png');
        if (file_exists($path)) {
            return 'data:image/png;base64,' . base64_encode(file_get_contents($path));
        }

        // Logo SVG inline de repli (eSonoya)
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">'
            . '<rect width="120" height="40" rx="6" fill="#1e3a8a"/>'
            . '<text x="60" y="27" font-family="Arial,sans-serif" font-size="16" font-weight="bold" '
            . 'fill="white" text-anchor="middle">eSonoya</text>'
            . '</svg>';

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    private function formatAppointment(PassportRequest $appointment): array
    {
        return [
            'id'               => $appointment->id,
            'reference_number' => $appointment->reference_number,
            'request_type'     => $appointment->request_type,
            'receipt_reference'=> $appointment->receipt_reference,
            'appointment_date' => $appointment->appointment_date->toDateString(),
            'time_slot'        => $appointment->quota?->time_slot ?? null,
            'status'           => $appointment->status,
            'qr_token'         => $appointment->qr_token,
            'qr_scanned_at'    => $appointment->qr_scanned_at?->toIso8601String(),
            'pdf_generated_at' => $appointment->pdf_generated_at?->toIso8601String(),
            'created_at'       => $appointment->created_at->toIso8601String(),
            'center' => $appointment->center ? [
                'id'      => $appointment->center->id,
                'name'    => $appointment->center->name,
                'city'    => $appointment->center->city,
                'address' => $appointment->center->address ?? null,
            ] : null,
            'applicant' => $appointment->applicant ? [
                'first_name'  => $appointment->applicant->first_name,
                'last_name'   => $appointment->applicant->last_name,
                'phone'       => $appointment->applicant->phone,
                'email'       => $appointment->applicant->email,
                'birth_date'  => $appointment->applicant->birth_date?->toDateString(),
                'birth_place' => $appointment->applicant->birth_place,
                'nationality' => $appointment->applicant->nationality,
                'gender'      => $appointment->applicant->gender,
                'address'     => $appointment->applicant->address,
            ] : null,
        ];
    }
}
