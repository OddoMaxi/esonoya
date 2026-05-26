<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Centres
            'centers.view', 'centers.create', 'centers.update', 'centers.delete',
            // Quotas
            'quotas.view', 'quotas.create', 'quotas.update', 'quotas.delete',
            // Rendez-vous
            'appointments.view', 'appointments.update', 'appointments.cancel', 'appointments.export',
            // QR Code
            'qr.scan',
            // Utilisateurs admin
            'admin-users.view', 'admin-users.create', 'admin-users.update', 'admin-users.delete',
            // Statistiques
            'stats.view', 'stats.export',
            // Logs
            'audit-logs.view',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'admin']);
        }

        // Super Admin — accès total
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'admin']);
        $superAdmin->givePermissionTo(Permission::where('guard_name', 'admin')->get());

        // Admin Centre — gère son propre centre
        $adminCentre = Role::firstOrCreate(['name' => 'admin-centre', 'guard_name' => 'admin']);
        $adminCentre->givePermissionTo([
            'centers.view', 'quotas.view', 'quotas.create', 'quotas.update',
            'appointments.view', 'appointments.update', 'appointments.export',
            'qr.scan', 'stats.view',
        ]);

        // Agent validation — scan QR uniquement
        $agent = Role::firstOrCreate(['name' => 'agent-validation', 'guard_name' => 'admin']);
        $agent->givePermissionTo(['qr.scan', 'appointments.view']);

        // Statisticien — lecture seule
        $stat = Role::firstOrCreate(['name' => 'statisticien', 'guard_name' => 'admin']);
        $stat->givePermissionTo(['stats.view', 'stats.export', 'appointments.view']);
    }
}
