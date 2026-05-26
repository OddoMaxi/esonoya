<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreAdminUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'min:2', 'max:150', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'email'     => ['required', 'string', 'email:rfc', 'max:150', 'unique:admin_users,email', 'ascii'],
            'phone'     => ['nullable', 'string', 'regex:/^(\+?224)?[6-7]\d{8}$/'],
            'center_id' => ['nullable', 'uuid', 'exists:centers,id'],
            'role'      => ['required', 'string', 'in:super-admin,admin-centre,agent-validation,statisticien'],
            'password'  => [
                'required',
                'confirmed',
                Password::min(config('security.password.min_length', 12))
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
                    ->uncompromised(), // vérifie contre HaveIBeenPwned
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.regex'       => 'Le nom ne peut contenir que des lettres, espaces et tirets.',
            'email.unique'     => 'Cette adresse email est déjà utilisée.',
            'email.ascii'      => 'L\'email contient des caractères non autorisés.',
            'role.in'          => 'Le rôle sélectionné est invalide.',
            'password.min'     => 'Le mot de passe doit contenir au moins :min caractères.',
            'password.confirmed' => 'Les mots de passe ne correspondent pas.',
        ];
    }
}
