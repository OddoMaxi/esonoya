<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Étendre la contrainte CHECK pour inclure le mode 'reference'
        DB::statement('ALTER TABLE qr_scan_logs DROP CONSTRAINT IF EXISTS chk_qr_scan_mode');
        DB::statement("ALTER TABLE qr_scan_logs ADD CONSTRAINT chk_qr_scan_mode CHECK (scan_mode IN ('manual','camera','file','reference'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE qr_scan_logs DROP CONSTRAINT IF EXISTS chk_qr_scan_mode');
        DB::statement("ALTER TABLE qr_scan_logs ADD CONSTRAINT chk_qr_scan_mode CHECK (scan_mode IN ('manual','camera','file'))");
    }
};
