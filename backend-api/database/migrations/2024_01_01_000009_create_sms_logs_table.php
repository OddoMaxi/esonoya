<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('uuid_generate_v4()'));
            $table->string('phone', 20);
            $table->text('message');
            $table->string('type', 30);    // otp | confirmation | reminder | cancellation
            $table->string('status', 20)->default('pending'); // pending | sent | failed | delivered
            $table->string('provider_id', 100)->nullable();
            $table->text('error_message')->nullable();
            $table->smallInteger('attempts')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('phone');
            $table->index('status');
            $table->index('type');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_logs');
    }
};
