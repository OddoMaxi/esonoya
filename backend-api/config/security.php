<?php

return [

    // ─── Anti-brute-force ────────────────────────────────────────
    'brute_force' => [

        // Connexion admin (étape 1 : email + password)
        'admin_login' => [
            'max_attempts'  => (int) env('BF_ADMIN_LOGIN_MAX', 5),
            'decay_seconds' => (int) env('BF_ADMIN_LOGIN_DECAY', 900),   // 15 min
            'lock_seconds'  => (int) env('BF_ADMIN_LOGIN_LOCK', 1800),   // 30 min
        ],

        // Vérification OTP admin (étape 2)
        'admin_otp' => [
            'max_attempts'  => (int) env('BF_ADMIN_OTP_MAX', 3),
            'decay_seconds' => (int) env('BF_ADMIN_OTP_DECAY', 300),    // 5 min
            'lock_seconds'  => (int) env('BF_ADMIN_OTP_LOCK', 900),     // 15 min
        ],

        // Envoi OTP citoyen (par téléphone)
        'citizen_otp_send' => [
            'max_per_phone_per_hour' => (int) env('BF_OTP_SEND_PHONE_MAX', 5),
            'max_per_ip_per_minute'  => (int) env('BF_OTP_SEND_IP_MAX', 3),
        ],

        // Vérification OTP citoyen
        'citizen_otp_verify' => [
            'max_attempts'  => (int) env('BF_CITIZEN_OTP_MAX', 5),
            'decay_seconds' => (int) env('BF_CITIZEN_OTP_DECAY', 600),  // 10 min
        ],

        // Scan QR (par IP)
        'qr_scan' => [
            'max_per_minute' => (int) env('BF_QR_SCAN_MAX', 30),
        ],
    ],

    // ─── Sessions Sanctum ────────────────────────────────────────
    'token_expiry' => [
        'citizen_days' => (int) env('TOKEN_CITIZEN_DAYS', 7),
        'admin_hours'  => (int) env('TOKEN_ADMIN_HOURS', 8),
    ],

    // ─── Mots de passe admin ─────────────────────────────────────
    'password' => [
        'min_length'   => (int) env('PASSWORD_MIN_LENGTH', 12),
        'require_upper' => (bool) env('PASSWORD_REQUIRE_UPPER', true),
        'require_digit' => (bool) env('PASSWORD_REQUIRE_DIGIT', true),
        'require_special' => (bool) env('PASSWORD_REQUIRE_SPECIAL', true),
    ],

    // ─── En-têtes de sécurité ────────────────────────────────────
    'headers' => [
        'hsts_max_age'    => (int) env('HSTS_MAX_AGE', 31536000),
        'hsts_subdomains' => (bool) env('HSTS_INCLUDE_SUBDOMAINS', true),
    ],

    // ─── Rate limiting des APIs sensibles ────────────────────────
    'rate_limits' => [
        'otp_send'        => env('RL_OTP_SEND', '3,1'),       // 3/min par IP
        'otp_verify'      => env('RL_OTP_VERIFY', '10,1'),    // 10/min par IP
        'admin_login'     => env('RL_ADMIN_LOGIN', '5,1'),    // 5/min par IP
        'public_centers'  => env('RL_CENTERS', '60,1'),       // 60/min
        'qr_verify'       => env('RL_QR_VERIFY', '30,1'),     // 30/min
        'pdf_download'    => env('RL_PDF', '10,1'),           // 10/min
    ],

    // ─── Logs sécurité ──────────────────────────────────────────
    'log_channel' => env('SECURITY_LOG_CHANNEL', 'security'),
];
