<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('passport_requests', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('center_id')->constrained('centers');
            $table->foreignUuid('quota_id')->constrained('quotas');
            $table->foreignUuid('booker_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reference_number', 50)->unique();
            $table->string('receipt_reference', 100);
            $table->string('request_type', 30);  // new | renewal | lost
            $table->date('appointment_date');
            $table->string('status', 20)->default('pending');
            // pending | confirmed | present | absent | cancelled
            $table->string('qr_token', 255)->unique();
            $table->timestamp('qr_scanned_at')->nullable();
            $table->foreignUuid('qr_scanned_by')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->timestamp('pdf_generated_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();

            $table->index('center_id');
            $table->index('appointment_date');
            $table->index('status');
            $table->index('booker_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('passport_requests');
    }
};
