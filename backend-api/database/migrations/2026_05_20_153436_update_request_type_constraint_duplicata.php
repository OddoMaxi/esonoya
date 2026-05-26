<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE passport_requests DROP CONSTRAINT IF EXISTS chk_pr_request_type');
        DB::statement("ALTER TABLE passport_requests ADD CONSTRAINT chk_pr_request_type CHECK (request_type IN ('new','renewal','duplicata'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE passport_requests DROP CONSTRAINT IF EXISTS chk_pr_request_type');
        DB::statement("ALTER TABLE passport_requests ADD CONSTRAINT chk_pr_request_type CHECK (request_type IN ('new','renewal','lost'))");
    }
};
