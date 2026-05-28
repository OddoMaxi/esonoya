<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use App\Models\Center;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUsersSeeder extends Seeder
{
    public function run(): void
    {
        // Super Admin
        $superAdmin = AdminUser::updateOrCreate(
            ['email' => 'admin@esonoya.gov.gn'],
            [
                'name'     => 'Administrateur Principal',
                'phone'    => '+224 626 44 22 61',
                'is_active' => true,
            ]
        );
        $superAdmin->assignRole('super-admin');

        // Admin du centre de Conakry
        $centerConakry = Center::where('city', 'Conakry')->first();
        if ($centerConakry) {
            $adminConakry = AdminUser::updateOrCreate(
                ['email' => 'conakry@esonoya.gov.gn'],
                [
                    'center_id' => $centerConakry->id,
                    'name'      => 'Admin Centre Conakry',
                    'phone'     => '+224 624 06 29 84',
                    'is_active'  => true,
                ]
            );
            $adminConakry->assignRole('admin-centre');
        }
    }
}
