<?php

namespace Database\Seeders;

use App\Models\Center;
use Illuminate\Database\Seeder;

class CentersSeeder extends Seeder
{
    public function run(): void
    {
        $centers = [
            [
                'name'    => 'Direction Générale des Passeports - Conakry',
                'city'    => 'Conakry',
                'address' => 'Kaloum, Quartier administrative, Conakry',
                'phone'   => '+224 624 000 001',
                'email'   => 'dgp.conakry@esonoya.gov.gn',
            ],
            [
                'name'    => 'Centre Régional des Passeports - Labé',
                'city'    => 'Labé',
                'address' => 'Centre administratif de Labé, BP 100',
                'phone'   => '+224 624 000 002',
                'email'   => 'dgp.labe@esonoya.gov.gn',
            ],
            [
                'name'    => 'Centre Régional des Passeports - Kindia',
                'city'    => 'Kindia',
                'address' => 'Préfecture de Kindia, Kindia',
                'phone'   => '+224 624 000 003',
                'email'   => 'dgp.kindia@esonoya.gov.gn',
            ],
            [
                'name'    => 'Centre Régional des Passeports - Kankan',
                'city'    => 'Kankan',
                'address' => 'Centre administratif de Kankan',
                'phone'   => '+224 624 000 004',
                'email'   => 'dgp.kankan@esonoya.gov.gn',
            ],
            [
                'name'    => 'Centre Régional des Passeports - N\'Zérékoré',
                'city'    => 'N\'Zérékoré',
                'address' => 'Préfecture de N\'Zérékoré',
                'phone'   => '+224 624 000 005',
                'email'   => 'dgp.nzerekore@esonoya.gov.gn',
            ],
        ];

        foreach ($centers as $center) {
            Center::firstOrCreate(['email' => $center['email']], $center);
        }
    }
}
