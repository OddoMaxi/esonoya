<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_logs', function (Blueprint $table) {
            $table->uuid('passport_request_id')->nullable()->after('type');
            $table->foreign('passport_request_id')
                  ->references('id')->on('passport_requests')
                  ->nullOnDelete();
            $table->index('passport_request_id');
        });
    }

    public function down(): void
    {
        Schema::table('sms_logs', function (Blueprint $table) {
            $table->dropForeign(['passport_request_id']);
            $table->dropIndex(['passport_request_id']);
            $table->dropColumn('passport_request_id');
        });
    }
};
