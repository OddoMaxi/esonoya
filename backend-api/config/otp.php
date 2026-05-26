<?php

return [
    'length'              => (int) env('OTP_LENGTH', 6),
    'expires_minutes'     => (int) env('OTP_EXPIRES_MINUTES', 10),
    'max_attempts'        => (int) env('OTP_MAX_ATTEMPTS', 5),
    'rate_limit_minutes'  => (int) env('OTP_RATE_LIMIT_MINUTES', 1),
];
