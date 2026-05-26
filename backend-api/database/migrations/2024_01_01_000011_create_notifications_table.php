<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('passport_request_id')->nullable()->constrained('passport_requests')->cascadeOnDelete();
            $table->string('type', 30);           // confirmation | reminder_24h | reminder_1h
            $table->string('channel', 20)->default('sms');
            $table->string('status', 20)->default('pending'); // pending | sent | failed
            $table->timestamp('scheduled_at');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('passport_request_id');
            $table->index(['status', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_notifications');
    }
};
