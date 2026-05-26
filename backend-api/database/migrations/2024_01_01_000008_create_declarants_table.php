<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('declarants', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('passport_request_id')->unique()->constrained('passport_requests')->cascadeOnDelete();
            $table->string('last_name', 100);
            $table->string('first_name', 100);
            $table->string('phone', 20);
            $table->string('email', 150)->nullable();
            $table->string('relationship', 50); // parent | sibling | spouse | other
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('declarants');
    }
};
