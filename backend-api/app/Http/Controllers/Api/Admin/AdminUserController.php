<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AdminUserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = AdminUser::with('center:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => $this->formatUser($u));

        return response()->json(['data' => $users]);
    }

    public function show(AdminUser $user): JsonResponse
    {
        $user->load('center:id,name,city');
        return response()->json(['data' => $this->formatUser($user)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:150'],
            'email'     => ['required', 'email', 'unique:admin_users,email'],
            'password'  => ['required', Password::min(8)->letters()->numbers()],
            'phone'     => ['nullable', 'string', 'max:30'],
            'center_id' => ['nullable', 'uuid', 'exists:centers,id'],
            'role'      => ['required', 'string', 'in:super-admin,admin-centre,agent-validation,statisticien'],
            'is_active' => ['boolean'],
        ]);

        $role = $data['role'];
        unset($data['role']);
        $data['password'] = Hash::make($data['password']);
        $data['is_active'] = $data['is_active'] ?? true;

        $user = AdminUser::create($data);
        $user->assignRole($role);

        AuditLog::create([
            'admin_user_id' => $request->user()->id,
            'action'        => 'admin_user.created',
            'subject_type'  => AdminUser::class,
            'subject_id'    => $user->id,
            'new_values'    => ['email' => $user->email, 'role' => $role],
            'ip_address'    => $request->ip(),
            'user_agent'    => $request->userAgent(),
        ]);

        return response()->json(['data' => $this->formatUser($user->load('center:id,name'))], 201);
    }

    public function update(Request $request, AdminUser $user): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['sometimes', 'string', 'max:150'],
            'email'     => ['sometimes', 'email', 'unique:admin_users,email,' . $user->id],
            'password'  => ['nullable', Password::min(8)->letters()->numbers()],
            'phone'     => ['nullable', 'string', 'max:30'],
            'center_id' => ['nullable', 'uuid', 'exists:centers,id'],
            'role'      => ['nullable', 'string', 'in:super-admin,admin-centre,agent-validation,statisticien'],
            'is_active' => ['boolean'],
        ]);

        $role = $data['role'] ?? null;
        unset($data['role']);

        if (isset($data['password']) && $data['password']) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $old = $user->only(array_keys($data));
        $user->update($data);

        if ($role) {
            $user->syncRoles([$role]);
        }

        AuditLog::create([
            'admin_user_id' => $request->user()->id,
            'action'        => 'admin_user.updated',
            'subject_type'  => AdminUser::class,
            'subject_id'    => $user->id,
            'old_values'    => array_diff_key($old, ['password' => '']),
            'new_values'    => array_diff_key($data, ['password' => '']),
            'ip_address'    => $request->ip(),
            'user_agent'    => $request->userAgent(),
        ]);

        return response()->json(['data' => $this->formatUser($user->fresh('center'))]);
    }

    public function destroy(Request $request, AdminUser $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }

        AuditLog::create([
            'admin_user_id' => $request->user()->id,
            'action'        => 'admin_user.deleted',
            'subject_type'  => AdminUser::class,
            'subject_id'    => $user->id,
            'old_values'    => ['email' => $user->email],
            'ip_address'    => $request->ip(),
            'user_agent'    => $request->userAgent(),
        ]);

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    private function formatUser(AdminUser $user): array
    {
        return [
            'id'            => $user->id,
            'name'          => $user->name,
            'email'         => $user->email,
            'phone'         => $user->phone,
            'center_id'     => $user->center_id,
            'center'        => $user->center ? ['id' => $user->center->id, 'name' => $user->center->name] : null,
            'is_active'     => $user->is_active,
            'roles'         => $user->getRoleNames()->values()->toArray(),
            'permissions'   => $user->getAllPermissions()->pluck('name')->values()->toArray(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
        ];
    }
}
