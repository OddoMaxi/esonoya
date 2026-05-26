<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Declarant extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'passport_request_id',
        'last_name', 'first_name', 'phone', 'email', 'relationship',
    ];

    protected static function booted(): void
    {
        static::creating(fn ($m) => $m->created_at = now());
    }

    public function passportRequest()
    {
        return $this->belongsTo(PassportRequest::class);
    }
}
