<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_slot_templates', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->string('label', 15)->unique();
            $table->smallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Créneaux par défaut
        DB::table('time_slot_templates')->insert([
            ['id' => (string) Str::uuid(), 'label' => '08h-10h', 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['id' => (string) Str::uuid(), 'label' => '10h-12h', 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['id' => (string) Str::uuid(), 'label' => '12h-14h', 'sort_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['id' => (string) Str::uuid(), 'label' => '14h-16h', 'sort_order' => 4, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('time_slot_templates');
    }
};
