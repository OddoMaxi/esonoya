<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sanitise les entrées texte pour prévenir XSS et injections.
 * — Supprime les octets nuls et caractères de contrôle
 * — Trim les espaces excessifs
 * — Détecte les patterns d'injection suspects et les logue
 */
class SanitizeInput
{
    // Patterns SQL/JS suspects à détecter (pas bloquer — juste logger)
    private const SUSPICIOUS_PATTERNS = [
        '/(<script[\s\S]*?>[\s\S]*?<\/script>)/i',  // <script>
        '/(javascript\s*:)/i',                        // javascript:
        '/(\bUNION\b.*\bSELECT\b)/i',               // UNION SELECT
        '/(\bDROP\b.*\bTABLE\b)/i',                  // DROP TABLE
        '/(\bINSERT\b.*\bINTO\b)/i',                 // INSERT INTO
        '/(\bOR\b\s+[\'"]?\d+[\'"]?\s*=\s*[\'"]?\d)/i', // OR 1=1
        '/(\bEXEC\b\s*\()/i',                        // EXEC(
        '/(--\s*$)/m',                               // SQL comment --
        '/(\/\*.*\*\/)/s',                           // /* comment */
    ];

    // Champs à ne PAS sanitiser (mots de passe, tokens — ne jamais modifier)
    private const EXCLUDED_FIELDS = [
        'password', 'password_confirmation', 'current_password',
        'token', 'temp_token', 'code', 'otp',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (! empty($request->all())) {
            $cleaned = $this->sanitize($request->all(), $request);
            $request->merge($cleaned);
        }

        return $next($request);
    }

    private function sanitize(array $data, Request $request): array
    {
        $result = [];

        foreach ($data as $key => $value) {
            if (in_array($key, self::EXCLUDED_FIELDS, true)) {
                $result[$key] = $value;
                continue;
            }

            if (is_array($value)) {
                $result[$key] = $this->sanitize($value, $request);
            } elseif (is_string($value)) {
                $cleaned = $this->cleanString($value);

                // Détecter les patterns suspects et logger (ne pas bloquer)
                if ($cleaned !== $value || $this->isSuspicious($value)) {
                    \Illuminate\Support\Facades\Log::channel('security')->warning('Input suspect détecté', [
                        'field'  => $key,
                        'ip'     => $request->ip(),
                        'path'   => $request->path(),
                        'method' => $request->method(),
                        // Ne jamais logger la valeur brute (PII + sécurité)
                    ]);
                }

                $result[$key] = $cleaned;
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }

    private function cleanString(string $value): string
    {
        // Supprimer les octets nuls (null byte injection)
        $value = str_replace("\0", '', $value);

        // Supprimer les caractères de contrôle sauf tabulation et retour chariot
        $value = preg_replace('/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value ?? '');

        // Trim
        return trim($value ?? '');
    }

    private function isSuspicious(string $value): bool
    {
        foreach (self::SUSPICIOUS_PATTERNS as $pattern) {
            if (preg_match($pattern, $value)) {
                return true;
            }
        }
        return false;
    }
}
