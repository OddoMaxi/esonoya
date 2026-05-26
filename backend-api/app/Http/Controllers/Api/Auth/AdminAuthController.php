<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminLoginRequest;
use App\Models\AdminUser;
use App\Models\AuditLog;
use App\Services\BruteForceService;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AdminAuthController extends Controller
{
    private readonly BruteForceService $bruteForce;

    public function __construct(private readonly OtpService $otpService)
    {
        $cfg = config('security.brute_force.admin_login');
        $this->bruteForce = new BruteForceService(
            maxAttempts:  $cfg['max_attempts']  ?? 5,
            decaySeconds: $cfg['decay_seconds'] ?? 900,
            lockSeconds:  $cfg['lock_seconds']  ?? 1800,
        );
    }

    // ─── Étape 1 : email + password ──────────────────────────────
    public function login(AdminLoginRequest $request): JsonResponse
    {
        $ip    = $request->ip();
        $email = $request->validated('email');

        // ─ Vérifier le verrou brute-force (IP + email) ─
        $bfKeyIp    = 'admin_login:ip:' . $ip;
        $bfKeyEmail = 'admin_login:email:' . $email;

        if ($this->bruteForce->isLocked($bfKeyIp)) {
            $wait = round($this->bruteForce->lockedForSeconds($bfKeyIp) / 60);
            $this->securityLog('warning', 'admin.login.blocked_ip', $email, $ip);
            return response()->json([
                'message' => "Accès temporairement bloqué. Réessayez dans {$wait} minutes.",
            ], 429);
        }

        if ($this->bruteForce->isLocked($bfKeyEmail)) {
            $wait = round($this->bruteForce->lockedForSeconds($bfKeyEmail) / 60);
            $this->securityLog('warning', 'admin.login.blocked_email', $email, $ip);
            return response()->json([
                'message' => "Compte temporairement bloqué. Réessayez dans {$wait} minutes.",
            ], 429);
        }

        // ─ Vérification credentials ─
        $admin = AdminUser::where('email', $email)->first();

        if (! $admin || ! Hash::check($request->validated('password'), $admin->password)) {
            $this->bruteForce->recordFailure($bfKeyIp,    "ip={$ip}");
            $this->bruteForce->recordFailure($bfKeyEmail, "email={$email}");

            $remaining = $this->bruteForce->remainingAttempts($bfKeyIp);

            $this->securityLog('warning', 'admin.login.failed', $email, $ip, [
                'remaining_attempts' => $remaining,
            ]);

            return response()->json([
                'message'            => 'Identifiants incorrects.',
                'remaining_attempts' => $remaining,
            ], 401);
        }

        if (! $admin->is_active) {
            $this->securityLog('warning', 'admin.login.disabled_account', $email, $ip);
            return response()->json(['message' => 'Compte désactivé. Contactez le super-administrateur.'], 403);
        }

        // ─ Succès étape 1 — réinitialiser les compteurs ─
        $this->bruteForce->recordSuccess($bfKeyIp);
        $this->bruteForce->recordSuccess($bfKeyEmail);

        // ─ Envoyer l'OTP 2FA ─
        try {
            $this->otpService->send($admin->phone ?? $admin->email, 'admin_2fa');
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 429);
        }

        // Token temporaire chiffré (admin_id + expiration 10 min)
        $tempToken = encrypt([
            'admin_id' => $admin->id,
            'ip'       => $ip,            // vérification optionnelle côté verify
            'expires'  => now()->addMinutes(10)->timestamp,
        ]);

        Log::info('Admin login étape 1', ['email' => $admin->email]);

        return response()->json([
            'message'    => 'Code OTP envoyé. Saisissez-le pour finaliser la connexion.',
            'temp_token' => $tempToken,
            'expires_in' => 600, // secondes
        ]);
    }

    // ─── Étape 2 : vérification OTP 2FA ──────────────────────────
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'temp_token' => ['required', 'string', 'max:2000'],
            'code'       => ['required', 'string', 'digits:' . config('otp.length', 6)],
        ]);

        // ─ Décryptage + validation du token temporaire ─
        try {
            $payload = decrypt($request->temp_token);
        } catch (\Illuminate\Contracts\Encryption\DecryptException) {
            $this->securityLog('warning', 'admin.otp.tampered_token', '', $request->ip());
            return response()->json(['message' => 'Session invalide. Recommencez la connexion.'], 401);
        }

        if (now()->timestamp > ($payload['expires'] ?? 0)) {
            return response()->json(['message' => 'Session expirée. Recommencez la connexion.'], 401);
        }

        $admin = AdminUser::find($payload['admin_id'] ?? null);
        if (! $admin || ! $admin->is_active) {
            return response()->json(['message' => 'Compte introuvable.'], 404);
        }

        // ─ Brute-force OTP ─
        $bfKey = 'admin_otp:' . $admin->id;
        $cfg   = config('security.brute_force.admin_otp');
        $bf    = new BruteForceService(
            maxAttempts:  $cfg['max_attempts']  ?? 3,
            decaySeconds: $cfg['decay_seconds'] ?? 300,
            lockSeconds:  $cfg['lock_seconds']  ?? 900,
        );

        if ($bf->isLocked($bfKey)) {
            $this->securityLog('warning', 'admin.otp.blocked', $admin->email, $request->ip());
            return response()->json(['message' => 'Trop de tentatives OTP. Recommencez la connexion.'], 429);
        }

        // ─ Vérification OTP ─
        $phone = $admin->phone ?? $admin->email;

        try {
            $valid = $this->otpService->verify($phone, $request->code, 'admin_2fa');
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 429);
        }

        if (! $valid) {
            $bf->recordFailure($bfKey, "admin_id={$admin->id}");
            $this->auditLog($admin->id, 'admin.login.otp_failed', $request->ip(), $request->userAgent());
            $this->securityLog('warning', 'admin.otp.failed', $admin->email, $request->ip());

            return response()->json([
                'message'            => 'Code OTP invalide ou expiré.',
                'remaining_attempts' => $bf->remainingAttempts($bfKey),
            ], 422);
        }

        // ─ OTP valide — émettre le token final ─
        $bf->recordSuccess($bfKey);
        $admin->update(['last_login_at' => now()]);

        // Révoquer les anciens tokens admin de la session précédente
        $admin->tokens()->where('name', 'admin-app')->delete();

        $tokenExpiry = now()->addHours(config('security.token_expiry.admin_hours', 8));
        $token = $admin->createToken('admin-app', ['admin'], $tokenExpiry)->plainTextToken;

        $this->auditLog($admin->id, 'admin.login.success', $request->ip(), $request->userAgent());
        Log::channel('audit')->info('Connexion admin réussie', [
            'admin_id' => $admin->id,
            'email'    => $admin->email,
            'ip'       => $request->ip(),
        ]);

        return response()->json([
            'token'      => $token,
            'expires_at' => $tokenExpiry->toIso8601String(),
            'user' => [
                'id'          => $admin->id,
                'name'        => $admin->name,
                'email'       => $admin->email,
                'center_id'   => $admin->center_id,
                'roles'       => $admin->getRoleNames(),
                'permissions' => $admin->getAllPermissions()->pluck('name'),
            ],
        ]);
    }

    // ─── Déconnexion ─────────────────────────────────────────────
    public function logout(Request $request): JsonResponse
    {
        $admin = $request->user();

        $this->auditLog($admin->id, 'admin.logout', $request->ip(), $request->userAgent());
        Log::channel('audit')->info('Déconnexion admin', ['admin_id' => $admin->id]);

        $admin->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté avec succès.']);
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private function auditLog(string $adminId, string $action, ?string $ip, ?string $ua): void
    {
        AuditLog::create([
            'admin_user_id' => $adminId,
            'action'        => $action,
            'ip_address'    => $ip,
            'user_agent'    => $ua ? substr($ua, 0, 500) : null,
        ]);
    }

    private function securityLog(
        string $level,
        string $event,
        string $email,
        ?string $ip,
        array $extra = []
    ): void {
        Log::channel('security')->{$level}($event, array_merge([
            'email'   => $this->maskEmail($email),
            'ip'      => $ip,
            'time'    => now()->toIso8601String(),
        ], $extra));
    }

    private function maskEmail(string $email): string
    {
        if (! str_contains($email, '@')) return substr($email, 0, 4) . '***';
        [$local, $domain] = explode('@', $email, 2);
        return substr($local, 0, 2) . '***@' . $domain;
    }
}
