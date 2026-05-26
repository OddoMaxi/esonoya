<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web:      __DIR__ . '/../routes/web.php',
        api:      __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health:   '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        // API-only : ne jamais rediriger vers 'login' (route inexistante)
        // Laisse AuthenticationException remonter → rendu JSON 401
        $middleware->redirectGuestsTo(fn() => null);

        // ─── SPA stateful + throttle API global ───────────────
        $middleware->statefulApi();
        $middleware->throttleApi();

        // ─── Middlewares globaux sur toutes les routes API ────
        $middleware->appendToGroup('api', [
            \App\Http\Middleware\SecurityHeaders::class,
            \App\Http\Middleware\ForceJsonApi::class,
            \App\Http\Middleware\SanitizeInput::class,
        ]);

        // ─── Alias ────────────────────────────────────────────
        $middleware->alias([
            'role'               => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission'         => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'security.headers'   => \App\Http\Middleware\SecurityHeaders::class,
            'sanitize'           => \App\Http\Middleware\SanitizeInput::class,
        ]);

        // Note: Rate limiters are registered in AppServiceProvider::boot()
    })
    ->withExceptions(function (Exceptions $exceptions): void {

        // ─── Toutes les erreurs API retournent JSON ───────────
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Non authentifié.'], 401);
            }
        });

        $exceptions->render(function (\Spatie\Permission\Exceptions\UnauthorizedException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Action non autorisée.'], 403);
            }
        });

        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Données invalides.',
                    'errors'  => $e->errors(),
                ], 422);
            }
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpException $e, Request $request) {
            if ($request->is('api/*') && $e->getStatusCode() === 429) {
                return response()->json([
                    'message' => 'Trop de requêtes. Veuillez patienter.',
                ], 429);
            }
        });

        // ─── Log les erreurs 5xx en production ───────────────
        $exceptions->report(function (\Throwable $e) {
            if (app()->isProduction() && ! ($e instanceof \Illuminate\Validation\ValidationException)) {
                \Illuminate\Support\Facades\Log::channel('security')->error('Erreur applicative', [
                    'exception' => get_class($e),
                    'message'   => $e->getMessage(),
                    'file'      => $e->getFile(),
                    'line'      => $e->getLine(),
                ]);
            }
        });

    })->create();
