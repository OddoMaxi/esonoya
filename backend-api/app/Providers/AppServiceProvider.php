<?php

namespace App\Providers;

use App\Services\Sms\InteractGroupProvider;
use App\Services\Sms\LogSmsProvider;
use App\Services\Sms\OrangeSmsProvider;
use App\Services\Sms\SmsProviderInterface;
use App\Services\Sms\SmsService;
use App\Models\AdminUser;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // ─── Provider SMS ────────────────────────────────────────
        $this->app->singleton(SmsProviderInterface::class, function () {
            // Les tests unitaires utilisent toujours le log
            if (app()->runningUnitTests()) {
                return new LogSmsProvider();
            }

            // En dev, SMS_PROVIDER=log par défaut mais peut être surchargé
            return match (config('sms.provider', 'log')) {
                'interactgroup' => new InteractGroupProvider(),
                'orange'        => app(OrangeSmsProvider::class),
                default         => new LogSmsProvider(),
            };
        });

        $this->app->singleton(SmsService::class);
    }

    public function boot(): void
    {
        // super-admin bypasse tous les checks de permission Spatie
        Gate::before(function ($user, $ability) {
            if ($user instanceof AdminUser && $user->hasRole('super-admin', 'admin')) {
                return true;
            }
        });

        // Default 'api' limiter used by $middleware->throttleApi()
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('otp-send', function (Request $request) {
            return [
                Limit::perMinute(3)->by('ip:' . $request->ip()),
                Limit::perHour(10)->by('phone:' . ($request->input('phone', '') ?: $request->ip())),
            ];
        });

        RateLimiter::for('otp-verify', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('admin-login', function (Request $request) {
            return [
                Limit::perMinute(5)->by('ip:' . $request->ip()),
                Limit::perMinute(3)->by('email:' . ($request->input('email', '') ?: $request->ip())),
            ];
        });

        RateLimiter::for('admin-otp', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('qr-verify-public', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        RateLimiter::for('pdf-download', function (Request $request) {
            $key = $request->user()?->id ?? $request->ip();
            return Limit::perMinute(10)->by($key);
        });

        RateLimiter::for('appointments-create', function (Request $request) {
            return Limit::perHour(3)->by('user:' . ($request->user()?->id ?? $request->ip()));
        });
    }
}
