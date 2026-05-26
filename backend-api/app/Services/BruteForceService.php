<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Protection anti-brute-force avec escalade de la durée de verrouillage.
 *
 * Fonctionnement :
 *  — Chaque échec incrémente un compteur TTL dans Redis
 *  — Quand le seuil est atteint, un verrou est posé
 *  — La durée du verrou double à chaque nouvelle violation
 *  — Un succès réinitialise complètement les compteurs
 */
class BruteForceService
{
    public function __construct(
        private readonly int $maxAttempts  = 5,
        private readonly int $decaySeconds = 900,   // fenêtre de 15 min
        private readonly int $lockSeconds  = 1800,  // verrouillage 30 min
        private readonly int $maxLockHours = 24,    // plafond 24h
    ) {}

    /**
     * Vérifie si la clé est actuellement verrouillée.
     */
    public function isLocked(string $key): bool
    {
        return Cache::has($this->lockKey($key));
    }

    /**
     * Retourne le nombre de secondes restantes avant déverrouillage (0 si libre).
     */
    public function lockedForSeconds(string $key): int
    {
        return (int) Cache::get($this->lockTtlKey($key), 0);
    }

    /**
     * Enregistre un échec. Verrouille si le seuil est atteint.
     */
    public function recordFailure(string $key, string $context = ''): void
    {
        $attempts = (int) Cache::get($this->attemptsKey($key), 0) + 1;
        Cache::put($this->attemptsKey($key), $attempts, $this->decaySeconds);

        if ($attempts >= $this->maxAttempts) {
            // Escalade : 30min × (violations complètes)
            $violations   = (int) ceil($attempts / $this->maxAttempts);
            $lockSeconds  = min($this->lockSeconds * $violations, $this->maxLockHours * 3600);

            Cache::put($this->lockKey($key), true, $lockSeconds);
            Cache::put($this->lockTtlKey($key), $lockSeconds, $lockSeconds);

            Log::channel('security')->warning('Brute force — verrou posé', [
                'key'          => $this->maskKey($key),
                'attempts'     => $attempts,
                'lock_minutes' => round($lockSeconds / 60),
                'context'      => $context,
            ]);
        }
    }

    /**
     * Enregistre un succès et réinitialise les compteurs.
     */
    public function recordSuccess(string $key): void
    {
        Cache::forget($this->attemptsKey($key));
        Cache::forget($this->lockKey($key));
        Cache::forget($this->lockTtlKey($key));
    }

    /**
     * Nombre de tentatives restantes avant verrouillage.
     */
    public function remainingAttempts(string $key): int
    {
        $attempts = (int) Cache::get($this->attemptsKey($key), 0);
        return max(0, $this->maxAttempts - $attempts);
    }

    /**
     * Nombre de tentatives enregistrées.
     */
    public function attempts(string $key): int
    {
        return (int) Cache::get($this->attemptsKey($key), 0);
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private function lockKey(string $key): string    { return "bf:lock:{$key}"; }
    private function attemptsKey(string $key): string { return "bf:attempts:{$key}"; }
    private function lockTtlKey(string $key): string  { return "bf:lockttl:{$key}"; }

    private function maskKey(string $key): string
    {
        // Masquer les infos sensibles dans les logs (email, phone)
        if (str_contains($key, '@')) {
            [$local, $domain] = explode('@', $key, 2);
            return substr($local, 0, 2) . '***@' . $domain;
        }
        return substr($key, 0, 6) . '****';
    }
}
