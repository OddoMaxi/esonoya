<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Center;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCenterController extends Controller
{
    public function index(): JsonResponse
    {
        $centers = Center::withCount(['passportRequests', 'adminUsers'])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $centers]);
    }

    public function show(Center $center): JsonResponse
    {
        $center->loadCount(['passportRequests', 'adminUsers', 'quotas']);
        return response()->json(['data' => $center]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:150'],
            'city'      => ['required', 'string', 'max:100'],
            'address'   => ['required', 'string', 'max:255'],
            'phone'     => ['nullable', 'string', 'max:30'],
            'email'     => ['nullable', 'email', 'max:150'],
            'is_active' => ['boolean'],
        ]);

        $center = Center::create($data);

        AuditLog::create([
            'admin_user_id' => $request->user()->id,
            'action'        => 'center.created',
            'subject_type'  => Center::class,
            'subject_id'    => $center->id,
            'new_values'    => $data,
            'ip_address'    => $request->ip(),
            'user_agent'    => $request->userAgent(),
        ]);

        return response()->json(['data' => $center], 201);
    }

    public function update(Request $request, Center $center): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['sometimes', 'string', 'max:150'],
            'city'      => ['sometimes', 'string', 'max:100'],
            'address'   => ['sometimes', 'string', 'max:255'],
            'phone'     => ['nullable', 'string', 'max:30'],
            'email'     => ['nullable', 'email', 'max:150'],
            'is_active' => ['boolean'],
        ]);

        $old = $center->only(array_keys($data));
        $center->update($data);

        AuditLog::create([
            'admin_user_id' => $request->user()->id,
            'action'        => 'center.updated',
            'subject_type'  => Center::class,
            'subject_id'    => $center->id,
            'old_values'    => $old,
            'new_values'    => $data,
            'ip_address'    => $request->ip(),
            'user_agent'    => $request->userAgent(),
        ]);

        return response()->json(['data' => $center->fresh()]);
    }

    public function destroy(Request $request, Center $center): JsonResponse
    {
        if ($center->passportRequests()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer un centre avec des rendez-vous.',
            ], 422);
        }

        AuditLog::create([
            'admin_user_id' => $request->user()->id,
            'action'        => 'center.deleted',
            'subject_type'  => Center::class,
            'subject_id'    => $center->id,
            'old_values'    => $center->toArray(),
            'ip_address'    => $request->ip(),
            'user_agent'    => $request->userAgent(),
        ]);

        $center->delete();

        return response()->json(['message' => 'Centre supprimé.']);
    }
}
