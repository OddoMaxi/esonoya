<?php

namespace App\Console\Commands;

use App\Models\Center;
use App\Services\QuotaService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateQuotas extends Command
{
    protected $signature = 'quotas:generate
                            {--days=90 : Nombre de jours à partir d\'aujourd\'hui}
                            {--slots=30 : Places par jour}
                            {--overwrite : Écraser les quotas existants}';

    protected $description = 'Génère les quotas pour tous les centres actifs';

    public function handle(QuotaService $service): int
    {
        $days      = (int) $this->option('days');
        $slots     = (int) $this->option('slots');
        $overwrite = (bool) $this->option('overwrite');

        $from = Carbon::today();
        $to   = $from->copy()->addDays($days);

        $centers = Center::where('is_active', true)->get();

        if ($centers->isEmpty()) {
            $this->warn('Aucun centre actif trouvé.');
            return self::SUCCESS;
        }

        $total = 0;
        foreach ($centers as $center) {
            $created = $service->generateBulkQuotas($center, $from, $to, $slots, true, $overwrite);
            $total  += $created;
            $this->line("  {$center->name} → {$created} quota(s) créé(s)");
        }

        $this->info("Total : {$total} quota(s) générés du {$from->toDateString()} au {$to->toDateString()}.");
        return self::SUCCESS;
    }
}
