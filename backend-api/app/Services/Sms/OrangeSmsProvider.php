<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OrangeSmsProvider implements SmsProviderInterface
{
    public function send(string $phone, string $message): SmsResult
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . config('sms.api_key'),
                'Content-Type'  => 'application/json',
            ])->timeout(10)->post(config('sms.api_url'), [
                'outboundSMSMessageRequest' => [
                    'address'            => 'tel:' . $phone,
                    'senderAddress'      => 'tel:' . config('sms.sender_id'),
                    'outboundSMSTextMessage' => [
                        'message' => $message,
                    ],
                ],
            ]);

            if ($response->successful()) {
                $body = $response->json();
                $providerId = $body['outboundSMSMessageRequest']['resourceURL'] ?? uniqid('orange_');
                return SmsResult::success($providerId);
            }

            Log::error('Orange SMS failed', ['status' => $response->status(), 'body' => $response->body()]);
            return SmsResult::failure('HTTP ' . $response->status());
        } catch (\Throwable $e) {
            return SmsResult::failure($e->getMessage());
        }
    }
}
