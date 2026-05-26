<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('public_holidays', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('uuid_generate_v4()'));
            $table->string('name', 150);
            $table->date('date');
            $table->smallInteger('year')->nullable();    // null = récurrent chaque année
            $table->boolean('is_recurring')->default(true);
            $table->text('description')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();

            $table->index('date');
            $table->index(['is_recurring']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('public_holidays');
    }
};
