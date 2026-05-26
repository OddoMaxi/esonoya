<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class AdminLoginRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'string',
                'email:rfc',
                'max:150',
                'ascii',           // bloque les IDN homoglyphes
            ],
            'password' => [
                'required',
                'string',
                'min:' . config('security.password.min_length', 12),
                'max:255',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required'  => "L'adresse email est obligatoire.",
            'email.email'     => "L'adresse email est invalide.",
            'email.ascii'     => "L'adresse email contient des caractères non autorisés.",
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.min'    => 'Le mot de passe doit contenir au moins :min caractères.',
        ];
    }
}
