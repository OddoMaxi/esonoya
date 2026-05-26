<?php

namespace Database\Seeders;

use App\Models\PublicHoliday;
use Illuminate\Database\Seeder;

class PublicHolidaysSeeder extends Seeder
{
    public function run(): void
    {
        $holidays = [
            // ── Jours fériés nationaux guinéens (récurrents) ─────────
            [
                'name'         => 'Jour de l\'An',
                'date'         => '2000-01-01',
                'is_recurring' => true,
                'description'  => 'Premier jour de l\'année',
            ],
            [
                'name'         => 'Fête du Travail',
                'date'         => '2000-05-01',
                'is_recurring' => true,
                'description'  => 'Journée internationale des travailleurs',
            ],
            [
                'name'         => 'Fête de l\'Indépendance',
                'date'         => '2000-10-02',
                'is_recurring' => true,
                'description'  => 'Anniversaire de l\'indépendance de la Guinée (1958)',
            ],
            [
                'name'         => 'Fête Nationale',
                'date'         => '2000-11-22',
                'is_recurring' => true,
                'description'  => 'Journée nationale de la Guinée',
            ],
            [
                'name'         => 'Noël',
                'date'         => '2000-12-25',
                'is_recurring' => true,
                'description'  => 'Fête de Noël',
            ],
            // ── Fêtes islamiques 2025 (non récurrentes) ───────────────
            // Ces dates varient chaque année selon le calendrier lunaire
            [
                'name'         => 'Aïd el-Fitr 2025',
                'date'         => '2025-03-30',
                'is_recurring' => false,
                'description'  => 'Fin du Ramadan 2025',
            ],
            [
                'name'         => 'Aïd el-Adha 2025',
                'date'         => '2025-06-06',
                'is_recurring' => false,
                'description'  => 'Fête du sacrifice 2025',
            ],
            [
                'name'         => 'Maouloud 2025',
                'date'         => '2025-09-04',
                'is_recurring' => false,
                'description'  => 'Anniversaire du Prophète 2025',
            ],
            // ── Fêtes islamiques 2026 ─────────────────────────────────
            [
                'name'         => 'Aïd el-Fitr 2026',
                'date'         => '2026-03-20',
                'is_recurring' => false,
                'description'  => 'Fin du Ramadan 2026',
            ],
            [
                'name'         => 'Aïd el-Adha 2026',
                'date'         => '2026-05-27',
                'is_recurring' => false,
                'description'  => 'Fête du sacrifice 2026',
            ],
            [
                'name'         => 'Maouloud 2026',
                'date'         => '2026-08-25',
                'is_recurring' => false,
                'description'  => 'Anniversaire du Prophète 2026',
            ],
        ];

        foreach ($holidays as $holiday) {
            PublicHoliday::firstOrCreate(
                ['name' => $holiday['name'], 'date' => $holiday['date']],
                $holiday
            );
        }

        $this->command->info('Jours fériés guinéens insérés : ' . count($holidays));
    }
}
