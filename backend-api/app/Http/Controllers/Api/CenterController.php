<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Center;
use App\Services\QuotaService;
use Illuminate\Http\JsonResponse;

class CenterController extends Controller
{
    public function __construct(private QuotaService $quotaService) {}

    public function index(): JsonResponse
    {
        $centers = Center::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'city', 'address', 'phone', 'email']);

        return response()->json(['data' => $centers]);
    }

    public function show(Center $center): JsonResponse
    {
        return response()->json(['data' => $center]);
    }

    public function availableDates(Center $center): JsonResponse
    {
        if (! $center->is_active) {
            return response()->json(['data' => []]);
        }

        $dates = $this->quotaService->getAvailableDates($center);

        return response()->json(['data' => $dates->values()]);
    }
}
