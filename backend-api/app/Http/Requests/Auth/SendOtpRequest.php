<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class SendOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Accepte les formats : +224XXXXXXXXX, 224XXXXXXXXX, 6XXXXXXXX, 7XXXXXXXX
            'phone' => [
                'required',
                'string',
                'regex:/^(\+?224)?[6-7]\d{8}$/',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.required' => 'Le numéro de téléphone est obligatoire.',
            'phone.regex'    => 'Le numéro de téléphone guinéen est invalide. Format attendu : 6XXXXXXXX ou +224XXXXXXXXX.',
        ];
    }
}
