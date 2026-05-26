<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SendOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Models\User;
use App\Services\BruteForceService;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CitizenAuthController extends Controller
{
    public function __construct(
        private readonly OtpService $otpService,
    ) {}

    /**
     * Envoie un OTP SMS au numéro fourni.
     * Crée le citoyen s'il n'existe pas encore.
     */
    public function sendOtp(SendOtpRequest $request): JsonResponse
    {
        $phone = $this->normalizePhone($request->validated('phone'));
        $ip    = $request->ip();

        // Brute-force sur envoi OTP (par téléphone — évite le flood SMS)
        $bfKey = 'citizen_otp_send:' . $phone;
        $cfg   = config('security.brute_force.citizen_otp_send', []);
        $bf    = new BruteForceService(
            maxAttempts:  $cfg['max_per_phone_per_hour'] ?? 5,
            decaySeconds: 3600,
            lockSeconds:  3600,
        );

        if ($bf->isLocked($bfKey)) {
            Log::channel('security')->warning('citizen.otp_send.blocked', [
                'phone' => $this->maskPhone($phone),
                'ip'    => $ip,
            ]);
            return response()->json([
                'message' => 'Trop de demandes pour ce numéro. Réessayez dans une heure.',
            ], 429);
        }

        try {
            $this->otpService->send($phone, 'citizen_login');
            $bf->recordSuccess($bfKey); // succès = pas de spam
        } catch (\RuntimeException $e) {
            $bf->recordFailure($bfKey, "rate_limit");
            return response()->json(['message' => $e->getMessage()], 429);
        }

        Log::info('OTP citoyen envoyé', ['phone' => $this->maskPhone($phone)]);

        return response()->json([
            'message'    => 'Code OTP envoyé par SMS.',
            'expires_in' => config('otp.expires_minutes', 10) * 60,
        ]);
    }

    /**
     * Vérifie l'OTP et retourne un token Sanctum.
     */
    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $phone = $this->normalizePhone($request->validated('phone'));
        $code  = $request->validated('code');

        try {
            $valid = $this->otpService->verify($phone, $code, 'citizen_login');
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 429);
        }

        if (! $valid) {
            Log::channel('security')->warning('citizen.otp_verify.failed', [
                'phone' => $this->maskPhone($phone),
                'ip'    => $request->ip(),
            ]);
            return response()->json(['message' => 'Code OTP invalide ou expiré.'], 422);
        }

        // Créer ou retrouver le citoyen
        $user = User::firstOrCreate(
            ['phone' => $phone],
            ['is_active' => true]
        );

        if (! $user->is_active) {
            return response()->json(['message' => 'Compte désactivé. Contactez le support.'], 403);
        }

        $user->update(['last_login_at' => now()]);

        // Révoquer les anciens tokens pour éviter l'accumulation
        $user->tokens()->where('name', 'citizen-app')->delete();

        $expiry = now()->addDays(config('security.token_expiry.citizen_days', 7));
        $token  = $user->createToken('citizen-app', ['citizen'], $expiry)->plainTextToken;

        Log::info('Citoyen connecté', ['user_id' => $user->id]);

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'         => $user->id,
                'phone'      => $user->phone,
                'email'      => $user->email,
                'first_name' => $user->first_name,
                'last_name'  => $user->last_name,
            ],
        ]);
    }

    /**
     * Déconnexion — révoque le token courant.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté avec succès.']);
    }

    // Normalise le format du numéro guinéen (+224XXXXXXXXX)
    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        // Ajouter le préfixe pays si manquant
        if (strlen($digits) === 9) {
            $digits = '224' . $digits;
        }

        return '+' . $digits;
    }

    // Masque le numéro pour les logs (sécurité)
    private function maskPhone(string $phone): string
    {
        return substr($phone, 0, 6) . '****' . substr($phone, -2);
    }
}
