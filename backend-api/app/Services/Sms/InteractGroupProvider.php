<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Provider SMS — InteractGroup (http://sms.interactgroup.net)
 * Format URL : ?app=ws&u={user}&h={token}&op=pv&to={phone}&msg={message}&from={sender}
 */
class InteractGroupProvider implements SmsProviderInterface
{
    public function send(string $phone, string $message): SmsResult
    {
        $url = config('sms.interactgroup.api_url', 'http://sms.interactgroup.net/index.php');

        $params = [
            'app'  => 'ws',
            'u'    => config('sms.interactgroup.username'),
            'h'    => config('sms.interactgroup.token'),
            'op'   => 'pv',
            'to'   => $this->formatPhone($phone),
            'msg'  => $message,
            'from' => config('sms.sender_id', 'eSonoya'),
        ];

        try {
            $response = Http::timeout(15)
                ->retry(1, 500) // retry HTTP level (connexion reset, etc.)
                ->get($url, $params);

            $body = trim($response->body());

            if ($response->failed()) {
                Log::warning('InteractGroup SMS HTTP error', [
                    'status' => $response->status(),
                    'phone'  => $this->maskPhone($phone),
                ]);
                return SmsResult::failure('HTTP ' . $response->status());
            }

            return $this->parseResponse($body);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::warning('InteractGroup SMS connexion impossible', [
                'phone' => $this->maskPhone($phone),
                'error' => $e->getMessage(),
            ]);
            return SmsResult::failure('connexion: ' . $e->getMessage());
        } catch (\Throwable $e) {
            Log::error('InteractGroup SMS exception inattendue', [
                'phone' => $this->maskPhone($phone),
                'error' => $e->getMessage(),
            ]);
            return SmsResult::failure($e->getMessage());
        }
    }

    /**
     * Analyse la réponse brute de l'API.
     * Formats observés :
     *   — JSON  : {"data":[{"status":"OK","smslog_id":134492,...}],...}
     *   — Texte : "OK", "OK: <id>", "ERR: <msg>", code numérique "0"/"-1"
     */
    private function parseResponse(string $body): SmsResult
    {
        // ── Format JSON (nouveau format InteractGroup) ──────────
        if (str_starts_with(ltrim($body), '{')) {
            $json = json_decode($body, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $item   = $json['data'][0] ?? null;
                $status = strtoupper($item['status'] ?? '');
                $errStr = $json['error_string'] ?? null;

                if ($status === 'OK' && empty($errStr)) {
                    // Extraire l'ID numérique du log SMS
                    $id = (string) ($item['smslog_id'] ?? $item['queue'] ?? uniqid('ig_'));
                    return SmsResult::success($id);
                }

                $err = $errStr ?? ($item['error'] ?? 'Erreur inconnue');
                return SmsResult::failure((string) $err);
            }
        }

        $upper = strtoupper($body);

        // ── Succès texte : "OK" ou "OK: <id>" ──────────────────
        if (str_starts_with($upper, 'OK')) {
            $id = trim(str_starts_with($upper, 'OK:') ? substr($body, 3) : uniqid('ig_'));
            return SmsResult::success($id ?: uniqid('ig_'));
        }

        // ── Codes numériques positifs = message ID ──────────────
        if (is_numeric($body) && (int) $body > 0) {
            return SmsResult::success($body);
        }

        // ── Erreur explicite ────────────────────────────────────
        if (str_starts_with($upper, 'ERR') || str_starts_with($upper, 'ERROR')) {
            $err = trim(str_contains($body, ':') ? substr($body, strpos($body, ':') + 1) : $body);
            return SmsResult::failure($err);
        }

        // ── Code -1, 0 ou négatif ───────────────────────────────
        if (is_numeric($body) && (int) $body <= 0) {
            return SmsResult::failure('code: ' . $body);
        }

        if ($body !== '') {
            // Réponse inconnue non vide — on logue et on considère comme succès
            Log::warning('InteractGroup réponse non reconnue', ['body' => substr($body, 0, 200)]);
            return SmsResult::success(uniqid('ig_unknown_'));
        }

        return SmsResult::failure('réponse vide du provider');
    }

    /**
     * L'API InteractGroup attend le numéro sans le +, ex: 224624062984
     */
    private function formatPhone(string $phone): string
    {
        return ltrim(preg_replace('/\D/', '', $phone), '0');
    }

    private function maskPhone(string $phone): string
    {
        return substr($phone, 0, 6) . '****' . substr($phone, -2);
    }
}
