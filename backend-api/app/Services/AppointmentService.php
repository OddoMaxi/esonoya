<?php

namespace App\Services;

use App\Models\Applicant;
use App\Models\Declarant;
use App\Models\PassportRequest;
use App\Models\Quota;
use App\Services\Sms\SmsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AppointmentService
{
    public function __construct(
        private readonly SmsService $sms,
        private readonly QrCodeService $qrCode,
    ) {}

    public function create(array $data, ?string $bookerUserId): PassportRequest
    {
        return DB::transaction(function () use ($data, $bookerUserId) {
            // Récupérer et verrouiller le quota pour éviter le surbooking
            $quota = Quota::where('center_id', $data['center_id'])
                ->where('date', $data['appointment_date'])
                ->lockForUpdate()
                ->firstOrFail();

            if (! $quota->hasAvailableSlots()) {
                throw new \RuntimeException('Plus de places disponibles pour cette date.');
            }

            // Incrémenter les slots réservés
            if (! $quota->incrementBookedSlots()) {
                throw new \RuntimeException('Impossible de réserver cette place.');
            }

            // Créer le rendez-vous
            $appointment = PassportRequest::create([
                'center_id'         => $data['center_id'],
                'quota_id'          => $quota->id,
                'booker_user_id'    => $bookerUserId,
                'reference_number'  => $this->generateReference(),
                'receipt_reference' => $data['receipt_reference'],
                'request_type'      => $data['request_type'],
                'appointment_date'  => $data['appointment_date'],
                'status'            => PassportRequest::STATUS_CONFIRMED,
                'qr_token'          => $this->qrCode->generateToken(),
            ]);

            // Créer le profil du demandeur
            Applicant::create(array_merge(
                $data['applicant'],
                ['passport_request_id' => $appointment->id]
            ));

            // Créer le déclarant si réservation pour autrui
            if (! empty($data['declarant'])) {
                Declarant::create(array_merge(
                    $data['declarant'],
                    ['passport_request_id' => $appointment->id]
                ));
            }

            // Envoyer la confirmation SMS
            $notifyPhone = $data['declarant']['phone'] ?? $data['applicant']['phone'];
            $this->sms->sendConfirmation($notifyPhone, [
                'reference' => $appointment->reference_number,
                'center'    => $appointment->center->name,
                'date'      => $appointment->appointment_date->format('d/m/Y'),
            ]);

            return $appointment->load(['applicant', 'declarant', 'center']);
        });
    }

    public function cancel(PassportRequest $appointment, string $reason): void
    {
        DB::transaction(function () use ($appointment, $reason) {
            if ($appointment->isCancelled()) {
                throw new \RuntimeException('Ce rendez-vous est déjà annulé.');
            }

            $appointment->update([
                'status'              => PassportRequest::STATUS_CANCELLED,
                'cancelled_at'        => now(),
                'cancellation_reason' => $reason,
            ]);

            // Libérer le slot
            $appointment->quota->decrementBookedSlots();

            // SMS d'annulation
            $notifyPhone = $appointment->declarant?->phone ?? $appointment->applicant->phone;
            $this->sms->sendCancellation($notifyPhone, [
                'reference' => $appointment->reference_number,
                'center'    => $appointment->center->name,
            ]);
        });
    }

    private function generateReference(): string
    {
        do {
            $ref = 'ESO-' . strtoupper(Str::random(8));
        } while (PassportRequest::where('reference_number', $ref)->exists());

        return $ref;
    }
}
