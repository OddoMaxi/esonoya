<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateAdminUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $userId = $this->route('user')?->id ?? $this->route('user');

        return [
            'name'      => ['sometimes', 'string', 'min:2', 'max:150', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'email'     => ['sometimes', 'string', 'email:rfc', 'max:150', 'unique:admin_users,email,' . $userId, 'ascii'],
            'phone'     => ['nullable', 'string', 'regex:/^(\+?224)?[6-7]\d{8}$/'],
            'center_id' => ['nullable', 'uuid', 'exists:centers,id'],
            'role'      => ['sometimes', 'string', 'in:super-admin,admin-centre,agent-validation,statisticien'],
            'is_active' => ['sometimes', 'boolean'],
            'password'  => [
                'nullable',
                'confirmed',
                Password::min(config('security.password.min_length', 12))
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
                    ->uncompromised(),
            ],
        ];
    }
}
