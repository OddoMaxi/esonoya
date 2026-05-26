<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Injecte les en-têtes de sécurité HTTP sur toutes les réponses API.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // ─── Anti-clickjacking ────────────────────────────────
        $response->headers->set('X-Frame-Options', 'DENY');

        // ─── Anti-MIME sniffing ───────────────────────────────
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // ─── XSS protection (legacy browsers) ────────────────
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // ─── Referrer-Policy ─────────────────────────────────
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // ─── Permissions-Policy ──────────────────────────────
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
        );

        // ─── Cross-domain policies ────────────────────────────
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');

        // ─── Content-Security-Policy (API pure, pas de HTML) ─
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'none'; frame-ancestors 'none'"
        );

        // ─── HSTS (production uniquement) ────────────────────
        if (app()->isProduction() && $request->isSecure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            );
        }

        // ─── Cache — bloquer le cache sur les endpoints sensibles
        if ($this->isSensitiveEndpoint($request)) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            $response->headers->set('Pragma', 'no-cache');
        }

        // ─── Supprimer les en-têtes révélateurs ──────────────
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');

        return $response;
    }

    private function isSensitiveEndpoint(Request $request): bool
    {
        return $request->is('api/auth/*')
            || $request->is('api/admin/auth/*')
            || $request->is('api/appointments/*')
            || $request->is('api/my-appointments');
    }
}
