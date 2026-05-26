<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

// Provider de développement — log les SMS au lieu de les envoyer
class LogSmsProvider implements SmsProviderInterface
{
    public function send(string $phone, string $message): SmsResult
    {
        Log::channel('daily')->info('[SMS-LOG]', [
            'to'      => $phone,
            'message' => $message,
        ]);

        return SmsResult::success('log_' . uniqid());
    }
}
