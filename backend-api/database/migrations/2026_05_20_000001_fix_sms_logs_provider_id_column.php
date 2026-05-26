<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // varchar(100) trop court pour les IDs/queues InteractGroup
        DB::statement('ALTER TABLE sms_logs ALTER COLUMN provider_id TYPE TEXT');
        DB::statement('ALTER TABLE sms_logs ALTER COLUMN error_message TYPE TEXT');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE sms_logs ALTER COLUMN provider_id TYPE VARCHAR(100)');
        DB::statement('ALTER TABLE sms_logs ALTER COLUMN error_message TYPE VARCHAR(255)');
    }
};
