<?php

namespace App\Services\Sms;

use App\Models\SmsLog;
use Illuminate\Support\Facades\Log;

class SmsService
{
    public function __construct(
        private readonly SmsProviderInterface $provider,
    ) {}

    // ─── Méthodes publiques (templates) ─────────────────────────

    public function sendOtp(string $phone, string $code, string $purpose = 'citizen'): bool
    {
        $template = $purpose === 'admin'
            ? config('sms.templates.otp_admin')
            : config('sms.templates.otp_citizen');

        $message = strtr($template, [
            '{code}'    => $code,
            '{minutes}' => config('otp.expires_minutes', 10),
        ]);

        // OTP : pas de retry (évite plusieurs codes en transit simultanément)
        return $this->dispatch($phone, $message, 'otp', null, maxAttempts: 1);
    }

    public function sendConfirmation(string $phone, array $data, ?string $passportRequestId = null): bool
    {
        $message = strtr(config('sms.templates.confirmation'), [
            '{reference}' => $data['reference'],
            '{center}'    => $data['center'],
            '{date}'      => $data['date'],
        ]);

        return $this->dispatch($phone, $message, 'confirmation', $passportRequestId);
    }

    public function sendReminder(string $phone, array $data, ?string $passportRequestId = null): bool
    {
        $message = strtr(config('sms.templates.reminder'), [
            '{reference}' => $data['reference'],
            '{center}'    => $data['center'],
            '{date}'      => $data['date'],
        ]);

        return $this->dispatch($phone, $message, 'reminder', $passportRequestId);
    }

    public function sendCancellation(string $phone, array $data, ?string $passportRequestId = null): bool
    {
        $message = strtr(config('sms.templates.cancellation'), [
            '{reference}' => $data['reference'],
            '{center}'    => $data['center'],
            '{date}'      => $data['date'],
        ]);

        return $this->dispatch($phone, $message, 'cancellation', $passportRequestId);
    }

    // ─── Moteur d'envoi avec retry ───────────────────────────────

    /**
     * Envoie un SMS avec retry exponentiel.
     *
     * @param int $maxAttempts  1 = pas de retry (OTP), 3 = retry (notifications)
     */
    public function dispatch(
        string  $phone,
        string  $message,
        string  $type,
        ?string $passportRequestId = null,
        int     $maxAttempts       = 3,
    ): bool {
        $log = SmsLog::create([
            'phone'               => $phone,
            'message'             => $message,
            'type'                => $type,
            'status'              => 'pending',
            'attempts'            => 0,
            'passport_request_id' => $passportRequestId,
        ]);

        $lastError = null;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            $log->increment('attempts');

            try {
                $result = $this->provider->send($phone, $message);

                if ($result->success) {
                    $log->update([
                        'status'      => 'sent',
                        'provider_id' => $result->providerId,
                        'sent_at'     => now(),
                    ]);
                    return true;
                }

                $lastError = $result->error;

                // Erreur définitive (numéro invalide, compte bloqué) → ne pas réessayer
                if ($this->isDefinitiveError($lastError ?? '')) {
                    break;
                }
            } catch (\Throwable $e) {
                $lastError = $e->getMessage();
                Log::warning('SMS attempt failed', [
                    'attempt' => $attempt,
                    'type'    => $type,
                    'error'   => $e->getMessage(),
                ]);
            }

            // Backoff exponentiel avant le prochain essai : 1s → 2s
            if ($attempt < $maxAttempts) {
                usleep((2 ** ($attempt - 1)) * 1_000_000);
            }
        }

        $log->update([
            'status'        => 'failed',
            'error_message' => $lastError,
        ]);

        Log::error('SMS failed after all attempts', [
            'type'    => $type,
            'phone'   => $this->maskPhone($phone),
            'error'   => $lastError,
            'sms_log' => $log->id,
        ]);

        return false;
    }

    // ─── Helpers privés ──────────────────────────────────────────

    /**
     * Erreurs pour lesquelles réessayer n'a aucun sens.
     */
    private function isDefinitiveError(string $error): bool
    {
        $definitiveKeywords = [
            'invalid number', 'numéro invalide', 'blacklist',
            'invalid recipient', 'destinataire invalide',
            'insufficient credits', 'crédit insuffisant',
            'account suspended', 'compte suspendu',
            'unauthorized', 'authentication failed',
        ];

        $lower = strtolower($error);
        foreach ($definitiveKeywords as $keyword) {
            if (str_contains($lower, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function maskPhone(string $phone): string
    {
        return substr($phone, 0, 6) . '****' . substr($phone, -2);
    }
}
