<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class VerifyOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'phone' => [
                'required',
                'string',
                'regex:/^(\+?224)?[6-7]\d{8}$/',
            ],
            'code' => [
                'required',
                'string',
                'digits:' . config('otp.length', 6),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.required' => 'Le numéro de téléphone est obligatoire.',
            'phone.regex'    => 'Numéro de téléphone invalide.',
            'code.required'  => 'Le code OTP est obligatoire.',
            'code.digits'    => 'Le code OTP doit contenir exactement ' . config('otp.length', 6) . ' chiffres.',
        ];
    }
}
