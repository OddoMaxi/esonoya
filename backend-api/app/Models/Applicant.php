<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Applicant extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'passport_request_id',
        'last_name', 'first_name', 'birth_date', 'birth_place',
        'nationality', 'gender', 'marital_status', 'profession',
        'height_cm', 'eye_color', 'distinctive_signs',
        'phone', 'email', 'address',
        'father_last_name', 'father_first_name',
        'mother_last_name', 'mother_first_name',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
        ];
    }

    public function passportRequest()
    {
        return $this->belongsTo(PassportRequest::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
