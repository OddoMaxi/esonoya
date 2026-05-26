<?php

use App\Console\Commands\SendAppointmentReminders;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(\Illuminate\Foundation\Inspiring::quote());
})->purpose('Display an inspiring quote');

// ─── Rappels RDV J-1 ────────────────────────────────────────────
// Exécuté chaque jour à 08:00 heure de Conakry (UTC+0 → même heure)
Schedule::command(SendAppointmentReminders::class)
    ->dailyAt('08:00')
    ->timezone('Africa/Conakry')
    ->withoutOverlapping()
    ->runInBackground()
    ->onFailure(function () {
        \Illuminate\Support\Facades\Log::error('Commande send-reminders échouée');
    });
