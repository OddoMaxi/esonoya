<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applicants', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('passport_request_id')->unique()->constrained('passport_requests')->cascadeOnDelete();

            // Identité
            $table->string('last_name', 100);
            $table->string('first_name', 100);
            $table->date('birth_date');
            $table->string('birth_place', 150);
            $table->string('nationality', 100)->default('Guinéenne');
            $table->string('gender', 10); // M | F

            // Situation
            $table->string('marital_status', 20); // single | married | divorced | widowed
            $table->string('profession', 100)->nullable();

            // Signalement
            $table->smallInteger('height_cm')->nullable();
            $table->string('eye_color', 30)->nullable();
            $table->text('distinctive_signs')->nullable();

            // Contact
            $table->string('phone', 20);
            $table->string('email', 150)->nullable();
            $table->text('address')->nullable();

            // Parents
            $table->string('father_last_name', 100)->nullable();
            $table->string('father_first_name', 100)->nullable();
            $table->string('mother_last_name', 100)->nullable();
            $table->string('mother_first_name', 100)->nullable();

            $table->timestamps();

            $table->index(['last_name', 'first_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applicants');
    }
};
