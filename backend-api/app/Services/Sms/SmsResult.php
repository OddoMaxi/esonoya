<?php

namespace App\Services\Sms;

readonly class SmsResult
{
    public function __construct(
        public bool $success,
        public ?string $providerId = null,
        public ?string $error = null,
    ) {}

    public static function success(string $providerId): self
    {
        return new self(success: true, providerId: $providerId);
    }

    public static function failure(string $error): self
    {
        return new self(success: false, error: $error);
    }
}
