<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotas', function (Blueprint $table) {
            // Colonne nullable : null = pas de créneau (ancien comportement)
            $table->string('time_slot', 15)->nullable()->after('date');
        });

        // Remplacer l'ancien unique (center_id, date) par deux index partiels
        // pour gérer correctement NULL (NULL != NULL en SQL)
        DB::statement('ALTER TABLE quotas DROP CONSTRAINT IF EXISTS quotas_center_id_date_unique');

        // Unicité quand time_slot IS NULL → ancien comportement préservé
        DB::statement('CREATE UNIQUE INDEX uq_quotas_center_date_no_slot ON quotas (center_id, date) WHERE time_slot IS NULL');
        // Unicité quand time_slot IS NOT NULL
        DB::statement('CREATE UNIQUE INDEX uq_quotas_center_date_slot ON quotas (center_id, date, time_slot) WHERE time_slot IS NOT NULL');

        // Mise à jour de l'index composite pour inclure time_slot
        DB::statement('DROP INDEX IF EXISTS idx_quotas_center_date_suspended');
        DB::statement('CREATE INDEX idx_quotas_center_date_suspended ON quotas (center_id, date, is_suspended, time_slot)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_quotas_center_date_no_slot');
        DB::statement('DROP INDEX IF EXISTS uq_quotas_center_date_slot');
        DB::statement('DROP INDEX IF EXISTS idx_quotas_center_date_suspended');

        Schema::table('quotas', function (Blueprint $table) {
            $table->dropColumn('time_slot');
        });

        DB::statement('ALTER TABLE quotas ADD CONSTRAINT quotas_center_id_date_unique UNIQUE (center_id, date)');
        DB::statement('CREATE INDEX idx_quotas_center_date_suspended ON quotas (center_id, date, is_suspended)');
    }
};
