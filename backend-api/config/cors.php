<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    // Méthodes explicites — jamais '*'
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Origines autorisées explicites — jamais '*'
    'allowed_origins' => array_filter([
        env('FRONTEND_URL',     'http://localhost:3002'),
        env('FRONTEND_URL_LAN', null),
        env('ADMIN_URL',        'http://localhost:3001'),
        env('ADMIN_URL_LAN',    null),
    ]),

    'allowed_origins_patterns' => [],

    // En-têtes autorisés — liste explicite
    'allowed_headers' => [
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-TOKEN',
    ],

    // Exposés au client JS (téléchargements PDF/CSV)
    'exposed_headers' => ['Content-Disposition', 'Content-Length'],

    // Cache preflight 24h
    'max_age' => 86400,

    // Nécessaire pour les cookies Sanctum (SPA stateful)
    'supports_credentials' => true,
];
