<?php

namespace App\Services;

use App\Models\PassportRequest;
use App\Models\QrScanLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class QrCodeService
{
    // ── Génération ────────────────────────────────────────────────

    public function generateToken(): string
    {
        $uuid   = Str::uuid()->toString();
        $secret = $this->secret();
        $hmac   = hash_hmac('sha256', $uuid, $secret);

        return "{$uuid}.{$hmac}";
    }

    /**
     * Données encodées dans le QR code.
     * On encode une URL publique : le scan depuis n'importe quel
     * lecteur affiche une page d'info sur le rendez-vous.
     */
    public function buildQrContent(PassportRequest $appointment): string
    {
        $base = rtrim(config('app.frontend_url', config('app.url')), '/');
        return "{$base}/rdv/v/{$appointment->qr_token}";
    }

    // ── Vérification signature ─────────────────────────────────────

    /**
     * Vérifie la signature HMAC sans accès DB.
     * Retourne true si la signature est valide.
     */
    public function verifySignature(string $token): bool
    {
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            return false;
        }

        [$uuid, $hmac] = $parts;
        $expected      = hash_hmac('sha256', $uuid, $this->secret());

        return hash_equals($expected, $hmac);
    }

    // ── Scan complet avec log ──────────────────────────────────────

    /**
     * Traite un scan QR, enregistre le log et retourne le résultat.
     */
    public function processScan(
        string $rawToken,
        ?string $adminUserId,
        string $ip,
        string $userAgent,
        string $mode = 'manual'
    ): ScanResult {
        // Extraire le token depuis l'URL si besoin
        $token = $this->extractToken($rawToken);

        // 1. Signature HMAC
        if (! $this->verifySignature($token)) {
            $this->log(null, $adminUserId, $rawToken, QrScanLog::RESULT_INVALID_SIGNATURE, $ip, $userAgent, $mode);
            return ScanResult::failure('invalid_signature', 'Signature QR invalide — possible falsification.');
        }

        // 2. Existence du rendez-vous
        $appointment = PassportRequest::with(['applicant', 'center', 'declarant', 'scannedBy:id,name'])
            ->where('qr_token', $token)
            ->first();

        if (! $appointment) {
            $this->log(null, $adminUserId, $rawToken, QrScanLog::RESULT_NOT_FOUND, $ip, $userAgent, $mode);
            return ScanResult::failure('not_found', 'QR code introuvable dans le système.');
        }

        // 3. Rendez-vous annulé
        if ($appointment->status === 'cancelled') {
            $this->log($appointment->id, $adminUserId, $rawToken, QrScanLog::RESULT_CANCELLED, $ip, $userAgent, $mode);
            return ScanResult::failure('cancelled', 'Ce rendez-vous a été annulé.', $appointment);
        }

        // 4. Vérification date (tolérance J-0 à J+1 pour late scan)
        $rdvDate = Carbon::parse($appointment->appointment_date);
        $today   = Carbon::today();
        if ($rdvDate->lt($today->copy()->subDay()) || $rdvDate->gt($today->copy()->addDays(1))) {
            $this->log($appointment->id, $adminUserId, $rawToken, QrScanLog::RESULT_WRONG_DATE, $ip, $userAgent, $mode);
            return ScanResult::failure(
                'wrong_date',
                "Ce QR est valide pour le {$rdvDate->translatedFormat('d F Y')} — pas aujourd'hui.",
                $appointment
            );
        }

        // 5. Déjà scanné
        if ($appointment->qr_scanned_at !== null) {
            $this->log($appointment->id, $adminUserId, $rawToken, QrScanLog::RESULT_ALREADY_SCANNED, $ip, $userAgent, $mode);
            return ScanResult::alreadyScanned(
                "Déjà enregistré le {$appointment->qr_scanned_at->format('d/m/Y à H:i')}.",
                $appointment
            );
        }

        // 6. Succès — enregistrement présence
        $appointment->update([
            'status'        => 'present',
            'qr_scanned_at' => now(),
            'qr_scanned_by' => $adminUserId,
        ]);

        $this->log($appointment->id, $adminUserId, $rawToken, QrScanLog::RESULT_SUCCESS, $ip, $userAgent, $mode);

        return ScanResult::success(
            'Présence enregistrée.',
            $appointment->fresh(['center', 'applicant', 'scannedBy:id,name'])
        );
    }

    // ── Endpoint public (vérification sans auth) ───────────────────

    /**
     * Vérification publique du token : retourne les infos non-sensibles
     * pour affichage mobile lorsqu'un citoyen scanne son propre QR.
     */
    public function publicVerify(string $rawToken): array
    {
        $token = $this->extractToken($rawToken);

        if (! $this->verifySignature($token)) {
            return ['valid' => false, 'message' => 'QR code invalide.'];
        }

        $appointment = PassportRequest::with(['applicant:id,passport_request_id,last_name,first_name', 'center:id,name,city'])
            ->where('qr_token', $token)
            ->first();

        if (! $appointment) {
            return ['valid' => false, 'message' => 'Rendez-vous introuvable.'];
        }

        return [
            'valid'       => true,
            'reference'   => $appointment->reference_number,
            'date'        => $appointment->appointment_date->toDateString(),
            'status'      => $appointment->status,
            'center_name' => $appointment->center?->name,
            'center_city' => $appointment->center?->city,
            'applicant'   => $appointment->applicant?->last_name . ' ' . $appointment->applicant?->first_name,
            'scanned_at'  => $appointment->qr_scanned_at?->toIso8601String(),
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────

    private function extractToken(string $raw): string
    {
        // Si l'input est une URL (scan depuis lecteur externe), extraire le token
        if (str_contains($raw, '/rdv/v/')) {
            $parts = explode('/rdv/v/', $raw, 2);
            return trim($parts[1] ?? $raw);
        }
        // Supporte aussi JSON encodé {"token":"..."}
        if (str_starts_with(trim($raw), '{')) {
            $decoded = json_decode($raw, true);
            if (isset($decoded['token'])) {
                return $decoded['token'];
            }
        }
        return trim($raw);
    }

    private function secret(): string
    {
        return config('app.qr_secret_key', config('app.key'));
    }

    private function log(
        ?string $appointmentId,
        ?string $adminUserId,
        string $rawToken,
        string $result,
        string $ip,
        string $userAgent,
        string $mode
    ): void {
        QrScanLog::create([
            'passport_request_id' => $appointmentId,
            'scanned_by'          => $adminUserId,
            'raw_token'           => substr($rawToken, 0, 600),
            'scan_result'         => $result,
            'ip_address'          => $ip,
            'user_agent'          => $userAgent,
            'scan_mode'           => $mode,
        ]);
    }
}

// ── Value object résultat ─────────────────────────────────────────

final class ScanResult
{
    private function __construct(
        public readonly bool $valid,
        public readonly bool $alreadyScanned,
        public readonly string $resultCode,
        public readonly string $message,
        public readonly ?PassportRequest $appointment,
    ) {}

    public static function success(string $message, ?PassportRequest $appointment = null): self
    {
        return new self(true, false, QrScanLog::RESULT_SUCCESS, $message, $appointment);
    }

    public static function alreadyScanned(string $message, ?PassportRequest $appointment = null): self
    {
        return new self(true, true, QrScanLog::RESULT_ALREADY_SCANNED, $message, $appointment);
    }

    public static function failure(string $code, string $message, ?PassportRequest $appointment = null): self
    {
        return new self(false, false, $code, $message, $appointment);
    }

    public function toArray(): array
    {
        return [
            'valid'           => $this->valid,
            'already_scanned' => $this->alreadyScanned,
            'result_code'     => $this->resultCode,
            'message'         => $this->message,
            'appointment'     => $this->appointment,
        ];
    }
}
