<?php

namespace App\Services;

use App\Models\OtpCode;
use App\Services\Sms\SmsService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class OtpService
{
    public function __construct(
        private readonly SmsService $sms,
    ) {}

    public function send(string $phone, string $purpose = 'citizen_login'): bool
    {
        // Rate limiting : 1 SMS max par minute par numéro
        $rateLimitKey = "otp_rate:{$phone}:{$purpose}";
        if (Cache::has($rateLimitKey)) {
            throw new \RuntimeException('Trop de demandes. Réessayez dans une minute.');
        }
        Cache::put($rateLimitKey, true, now()->addMinutes(config('otp.rate_limit_minutes', 1)));

        // Invalider les anciens OTPs actifs pour ce numéro/purpose
        OtpCode::where('phone', $phone)
            ->where('purpose', $purpose)
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->update(['is_used' => true]);

        $code = $this->generateCode();

        OtpCode::create([
            'phone'      => $phone,
            'code'       => $code,
            'purpose'    => $purpose,
            'expires_at' => now()->addMinutes(config('otp.expires_minutes', 10)),
        ]);

        $smsType = str_contains($purpose, 'admin') ? 'admin' : 'citizen';

        return $this->sms->sendOtp($phone, $code, $smsType);
    }

    public function verify(string $phone, string $code, string $purpose = 'citizen_login'): bool
    {
        $otp = OtpCode::where('phone', $phone)
            ->where('purpose', $purpose)
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->latest('created_at')
            ->first();

        if (! $otp) {
            return false;
        }

        // Incrémenter les tentatives
        $otp->increment('attempts');

        if ($otp->hasExceededAttempts()) {
            $otp->update(['is_used' => true]);
            throw new \RuntimeException('Trop de tentatives. Demandez un nouveau code.');
        }

        if (! hash_equals($otp->code, $code)) {
            return false;
        }

        $otp->update(['is_used' => true]);

        return true;
    }

    private function generateCode(): string
    {
        $length = config('otp.length', 6);
        return str_pad(random_int(0, (int) str_repeat('9', $length)), $length, '0', STR_PAD_LEFT);
    }
}
