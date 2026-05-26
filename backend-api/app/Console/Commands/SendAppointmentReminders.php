<?php

namespace App\Console\Commands;

use App\Models\PassportRequest;
use App\Services\Sms\SmsService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendAppointmentReminders extends Command
{
    protected $signature   = 'esonoya:send-reminders {--dry-run : Simuler sans envoyer}';
    protected $description = 'Envoie les SMS de rappel J-1 pour les rendez-vous confirmés du lendemain';

    public function __construct(private readonly SmsService $smsService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $tomorrow  = Carbon::tomorrow()->toDateString();
        $isDryRun  = $this->option('dry-run');

        $this->info("Rappels RDV du {$tomorrow}" . ($isDryRun ? ' [DRY-RUN]' : ''));

        // Rendez-vous confirmés demain sans rappel déjà envoyé
        $appointments = PassportRequest::with(['applicant:id,passport_request_id,first_name,last_name,phone', 'center:id,name'])
            ->where('status', PassportRequest::STATUS_CONFIRMED)
            ->whereDate('appointment_date', $tomorrow)
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('sms_logs')
                    ->whereColumn('sms_logs.passport_request_id', 'passport_requests.id')
                    ->where('sms_logs.type', 'reminder')
                    ->where('sms_logs.status', 'sent');
            })
            ->get();

        if ($appointments->isEmpty()) {
            $this->info('Aucun rappel à envoyer.');
            return self::SUCCESS;
        }

        $this->info("→ {$appointments->count()} rappel(s) à envoyer");

        $sent   = 0;
        $failed = 0;

        foreach ($appointments as $appt) {
            $phone = $appt->applicant?->phone;

            if (! $phone) {
                $this->warn("  ✗ {$appt->reference_number} — numéro manquant");
                $failed++;
                continue;
            }

            if ($isDryRun) {
                $this->line("  [DRY] {$appt->reference_number} → {$this->mask($phone)}");
                $sent++;
                continue;
            }

            $ok = $this->smsService->sendReminder($phone, [
                'reference' => $appt->reference_number,
                'center'    => $appt->center->name,
                'date'      => Carbon::parse($appt->appointment_date)->locale('fr')->isoFormat('D MMMM YYYY'),
            ], $appt->id);

            if ($ok) {
                $this->line("  ✓ {$appt->reference_number} → {$this->mask($phone)}");
                $sent++;
            } else {
                $this->warn("  ✗ {$appt->reference_number} → envoi échoué");
                $failed++;
            }

            // Petite pause pour ne pas saturer le provider
            usleep(200_000); // 200ms
        }

        $this->newLine();
        $this->info("Terminé — {$sent} envoyé(s), {$failed} échoué(s).");

        Log::info('Rappels RDV envoyés', [
            'date'   => $tomorrow,
            'sent'   => $sent,
            'failed' => $failed,
        ]);

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function mask(string $phone): string
    {
        return substr($phone, 0, 6) . '****' . substr($phone, -2);
    }
}
