<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Force le type de contenu JSON sur l'API.
 * — Ajoute Accept: application/json si absent (évite les réponses HTML sur 401/404)
 * — Rejette les Content-Type non-JSON sur les requêtes POST/PUT/PATCH
 * — Bloque les payloads dépassant la limite configurée
 */
class ForceJsonApi
{
    private const MAX_BODY_KB = 512; // 512 KB max

    public function handle(Request $request, Closure $next): Response
    {
        // Toutes les réponses API doivent être JSON
        $request->headers->set('Accept', 'application/json');

        // Vérifier Content-Type sur les requêtes avec corps
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            $contentType = $request->header('Content-Type', '');

            if (
                ! empty($request->getContent())
                && ! str_contains($contentType, 'application/json')
                && ! str_contains($contentType, 'multipart/form-data')
                && ! str_contains($contentType, 'application/x-www-form-urlencoded')
            ) {
                return response()->json([
                    'message' => 'Content-Type non supporté.',
                ], 415);
            }
        }

        // Limiter la taille des requêtes entrantes
        $bodySize = strlen($request->getContent());
        if ($bodySize > self::MAX_BODY_KB * 1024) {
            return response()->json([
                'message' => 'Requête trop volumineuse.',
            ], 413);
        }

        return $next($request);
    }
}
