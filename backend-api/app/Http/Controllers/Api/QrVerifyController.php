<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QrVerifyController extends Controller
{
    public function __construct(private QrCodeService $qrCodeService) {}

    /**
     * GET /api/qr/verify?token=...
     * Endpoint public — permet à un citoyen de vérifier son propre QR
     * ou à un agent de consulter le statut depuis un lien.
     * Throttle strict : max 30 req/min par IP.
     */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:600'],
        ]);

        $result = $this->qrCodeService->publicVerify($data['token']);

        return response()->json($result);
    }
}
