<?php

use App\Http\Controllers\Api\Auth\CitizenAuthController;
use App\Http\Controllers\Api\Auth\AdminAuthController;
use App\Http\Controllers\Api\CenterController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\QrVerifyController;
use App\Http\Controllers\Api\Admin\AdminAppointmentController;
use App\Http\Controllers\Api\Admin\AdminCenterController;
use App\Http\Controllers\Api\Admin\AdminQuotaController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\AdminStatsController;
use App\Http\Controllers\Api\Admin\AdminQrController;
use App\Http\Controllers\Api\Admin\AdminAuditLogController;
use Illuminate\Support\Facades\Route;

// ─── Authentification Citoyen ─────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('send-otp', [CitizenAuthController::class, 'sendOtp']);
    Route::post('verify-otp', [CitizenAuthController::class, 'verifyOtp']);
    Route::post('logout', [CitizenAuthController::class, 'logout'])
        ->middleware('auth:sanctum');
});

// ─── Authentification Admin (2FA) ────────────────────────────
Route::prefix('admin/auth')->group(function () {
    Route::post('login', [AdminAuthController::class, 'login']);
    Route::post('verify-otp', [AdminAuthController::class, 'verifyOtp']);
    Route::post('logout', [AdminAuthController::class, 'logout'])
        ->middleware('auth:admin');
});

// ─── API Publique ─────────────────────────────────────────────
Route::get('centers', [CenterController::class, 'index']);
Route::get('centers/{center}', [CenterController::class, 'show']);
Route::get('centers/{center}/available-dates', [CenterController::class, 'availableDates']);
Route::get('qr/verify', [QrVerifyController::class, 'verify']);

// ─── API Citoyen (authentifié) ────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('appointments', [AppointmentController::class, 'store']);
    Route::get('appointments/{appointment}', [AppointmentController::class, 'show']);
    Route::delete('appointments/{appointment}', [AppointmentController::class, 'cancel']);
    Route::get('my-appointments', [AppointmentController::class, 'myAppointments']);
});

// PDF ticket — supports ?token= pour navigation directe du navigateur
Route::get('appointments/{appointment}/pdf', [AppointmentController::class, 'downloadPdf'])
    ->middleware([
        \App\Http\Middleware\QueryTokenToBearer::class,
        'auth:sanctum',
    ]);

// PDF fiche de demande de passeport
Route::get('appointments/{appointment}/fiche', [AppointmentController::class, 'downloadFiche'])
    ->middleware([
        \App\Http\Middleware\QueryTokenToBearer::class,
        'auth:sanctum',
    ]);

// ─── API Administration (authentifiée + rôles) ───────────────
Route::prefix('admin')->middleware(['auth:admin'])->group(function () {

    // ─ Statistiques ─
    Route::get('stats', [AdminStatsController::class, 'index']);
    Route::get('stats/export', [AdminStatsController::class, 'export'])
        ->middleware('permission:stats.view');

    // ─ Centres ─
    Route::apiResource('centers', AdminCenterController::class);

    // ─ Quotas ─
    Route::get('quotas',                      [AdminQuotaController::class, 'index']);
    Route::post('quotas/bulk',                [AdminQuotaController::class, 'bulk'])
        ->middleware('permission:quotas.create');
    Route::post('quotas/generate-day-slots', [AdminQuotaController::class, 'generateDaySlots'])
        ->middleware('permission:quotas.create');
    Route::post('quotas',                     [AdminQuotaController::class, 'store'])
        ->middleware('permission:quotas.create');
    Route::put('quotas/{quota}',              [AdminQuotaController::class, 'update'])
        ->middleware('permission:quotas.update');
    Route::delete('quotas/{quota}',           [AdminQuotaController::class, 'destroy'])
        ->middleware('permission:quotas.delete');
    Route::patch('quotas/{quota}/suspend',    [AdminQuotaController::class, 'suspend'])
        ->middleware('permission:quotas.update');
    Route::patch('quotas/{quota}/reactivate', [AdminQuotaController::class, 'reactivate'])
        ->middleware('permission:quotas.update');

    // ─ Fermetures ─
    Route::get('center-closures',              [AdminQuotaController::class, 'listClosures']);
    Route::post('center-closures',             [AdminQuotaController::class, 'storeClosure'])
        ->middleware('permission:centers.update');
    Route::delete('center-closures/{closure}', [AdminQuotaController::class, 'destroyClosure'])
        ->middleware('permission:centers.update');

    // ─ Modèles créneaux horaires ─
    Route::get('time-slot-templates',              [AdminQuotaController::class, 'listTimeSlots']);
    Route::post('time-slot-templates',             [AdminQuotaController::class, 'storeTimeSlot'])
        ->middleware('permission:quotas.create');
    Route::put('time-slot-templates/{tpl}',        [AdminQuotaController::class, 'updateTimeSlot'])
        ->middleware('permission:quotas.update');
    Route::delete('time-slot-templates/{tpl}',     [AdminQuotaController::class, 'destroyTimeSlot'])
        ->middleware('permission:quotas.delete');

    // ─ Jours fériés ─
    Route::get('public-holidays',              [AdminQuotaController::class, 'listHolidays']);
    Route::post('public-holidays',             [AdminQuotaController::class, 'storeHoliday'])
        ->middleware('permission:quotas.create');
    Route::delete('public-holidays/{holiday}', [AdminQuotaController::class, 'destroyHoliday'])
        ->middleware('permission:quotas.delete');

    // ─ Rendez-vous ─
    Route::get('appointments/export',                [AdminAppointmentController::class, 'export'])
        ->middleware('permission:appointments.view');
    Route::get('appointments',                       [AdminAppointmentController::class, 'index']);
    Route::get('appointments/{appointment}',         [AdminAppointmentController::class, 'show']);
    Route::patch('appointments/{appointment}/status',[AdminAppointmentController::class, 'updateStatus'])
        ->middleware('permission:appointments.update');
    Route::get('appointments/{appointment}/pdf',     [AdminAppointmentController::class, 'downloadPdf']);

    // ─ QR Code / Scan ─
    Route::post('scan-qr',              [AdminQrController::class, 'scan'])
        ->middleware('permission:scan.qr');
    Route::post('scan-by-reference',    [AdminQrController::class, 'scanByReference'])
        ->middleware('permission:scan.qr');
    Route::get('scan-history',          [AdminQrController::class, 'history']);
    Route::get('scan-history/stats',    [AdminQrController::class, 'stats']);

    // ─ Utilisateurs admin ─
    Route::apiResource('users', AdminUserController::class)
        ->middleware('permission:users.manage');

    // ─ Logs d'audit ─
    Route::get('audit-logs', [AdminAuditLogController::class, 'index'])
        ->middleware('permission:audit-logs.view');
});
