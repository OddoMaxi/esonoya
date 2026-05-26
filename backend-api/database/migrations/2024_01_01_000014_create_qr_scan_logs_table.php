<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qr_scan_logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('passport_request_id')->nullable()->constrained('passport_requests')->nullOnDelete();
            $table->foreignUuid('scanned_by')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->string('raw_token', 600);
            $table->string('scan_result', 30);
            // success | already_scanned | invalid_token | invalid_signature | cancelled | wrong_date | not_found
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('scan_mode', 20)->default('manual');
            // manual (HID) | camera | file
            $table->timestamp('scanned_at')->useCurrent();

            $table->index('passport_request_id');
            $table->index('scanned_by');
            $table->index('scanned_at');
            $table->index('scan_result');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_scan_logs');
    }
};
