<?php

return [

    // ─── Provider actif ─────────────────────────────────────────
    // Valeurs possibles : interactgroup | orange | log
    'provider'  => env('SMS_PROVIDER', 'interactgroup'),
    'sender_id' => env('SMS_SENDER_ID', 'eSonoya'),

    // ─── Provider InteractGroup ──────────────────────────────────
    'interactgroup' => [
        'api_url'  => env('SMS_INTERACTGROUP_URL', 'http://sms.interactgroup.net/index.php'),
        'username' => env('SMS_USERNAME'),
        'token'    => env('SMS_TOKEN'),
    ],

    // ─── Provider Orange (legacy) ────────────────────────────────
    'api_key'    => env('SMS_API_KEY'),
    'api_secret' => env('SMS_API_SECRET'),
    'api_url'    => env('SMS_API_URL'),

    // ─── Retry ──────────────────────────────────────────────────
    // Nombre de tentatives max pour les SMS de notification (hors OTP)
    'retry_attempts' => (int) env('SMS_RETRY_ATTEMPTS', 3),

    // ─── Templates SMS (français, 160 car max) ──────────────────
    'templates' => [

        'otp_citizen' => "eSonoya - Code de connexion : {code}. Valable {minutes} min. Ne le partagez pas.",

        'otp_admin' => "eSonoya Admin - Code de verification : {code}. Valable {minutes} min.",

        'confirmation' => "eSonoya - RDV confirme ! Ref: {reference} | Centre: {center} | Date: {date}. Presentez votre QR code le jour J.",

        'reminder' => "eSonoya - Rappel : votre RDV passeport est demain ({date}) au centre {center}. Ref: {reference}. Pensez a vos documents !",

        'cancellation' => "eSonoya - RDV annule. Ref: {reference} | Centre: {center} | Date: {date}. Contactez le centre pour plus d informations.",

    ],

];
