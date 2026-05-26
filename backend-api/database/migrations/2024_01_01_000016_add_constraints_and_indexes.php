<?php

/**
 * Migration de consolidation PostgreSQL — eSonoya
 *
 * Ajoute :
 *  — Contraintes CHECK métier (statuts, types, valeurs numériques, dates)
 *  — Index composites pour les requêtes fréquentes
 *  — Index fonctionnel GIN pour la recherche full-text
 *  — Contraintes UNIQUE manquantes (jours fériés)
 *  — Contraintes de domaine sur les colonnes critiques
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── 1. CONTRAINTES CHECK ─────────────────────────────────

        // quotas : cohérence des créneaux
        $this->addConstraint(
            'quotas',
            'chk_quotas_slots',
            "total_slots >= 0 AND booked_slots >= 0 AND booked_slots <= total_slots"
        );

        // passport_requests : statuts valides
        $this->addConstraint(
            'passport_requests',
            'chk_pr_status',
            "status IN ('pending','confirmed','present','absent','cancelled')"
        );

        // passport_requests : types valides
        $this->addConstraint(
            'passport_requests',
            'chk_pr_request_type',
            "request_type IN ('new','renewal','lost')"
        );

        // passport_requests : cohérence dates d'annulation
        $this->addConstraint(
            'passport_requests',
            'chk_pr_cancelled_at',
            "cancelled_at IS NULL OR status = 'cancelled'"
        );

        // passport_requests : cohérence scan QR
        $this->addConstraint(
            'passport_requests',
            'chk_pr_qr_scanned',
            "qr_scanned_at IS NULL OR status IN ('present','absent')"
        );

        // applicants : genre (M ou F uniquement)
        $this->addConstraint(
            'applicants',
            'chk_applicants_gender',
            "gender IN ('M','F')"
        );

        // applicants : taille réaliste
        $this->addConstraint(
            'applicants',
            'chk_applicants_height',
            "height_cm IS NULL OR (height_cm BETWEEN 50 AND 250)"
        );

        // applicants : statut civil
        $this->addConstraint(
            'applicants',
            'chk_applicants_marital_status',
            "marital_status IN ('single','married','divorced','widowed')"
        );

        // otp_codes : tentatives non négatives
        $this->addConstraint(
            'otp_codes',
            'chk_otp_attempts',
            "attempts >= 0"
        );

        // otp_codes : purpose valide
        $this->addConstraint(
            'otp_codes',
            'chk_otp_purpose',
            "purpose IN ('citizen_login','admin_2fa')"
        );

        // center_closures : date_to >= date_from
        $this->addConstraint(
            'center_closures',
            'chk_closure_dates',
            "date_to >= date_from"
        );

        // qr_scan_logs : résultats valides
        $this->addConstraint(
            'qr_scan_logs',
            'chk_qr_result',
            "scan_result IN ('success','already_scanned','invalid_token','invalid_signature','cancelled','wrong_date','not_found')"
        );

        // qr_scan_logs : modes valides
        $this->addConstraint(
            'qr_scan_logs',
            'chk_qr_scan_mode',
            "scan_mode IN ('manual','camera','file')"
        );

        // sms_logs : statuts valides
        $this->addConstraint(
            'sms_logs',
            'chk_sms_status',
            "status IN ('pending','sent','failed','delivered')"
        );

        // sms_logs : types valides
        $this->addConstraint(
            'sms_logs',
            'chk_sms_type',
            "type IN ('otp','confirmation','reminder','cancellation')"
        );

        // sms_logs : tentatives non négatives
        $this->addConstraint(
            'sms_logs',
            'chk_sms_attempts',
            "attempts >= 0"
        );

        // ─── 2. INDEX COMPOSITES ─────────────────────────────────

        Schema::table('passport_requests', function (Blueprint $table) {
            // Recherche admin : liste filtrée par statut + date
            $this->addIndexIfMissing($table, ['status', 'appointment_date'], 'idx_pr_status_date');

            // Recherche admin : liste par centre + date + statut
            $this->addIndexIfMissing($table, ['center_id', 'appointment_date', 'status'], 'idx_pr_center_date_status');

            // Tableau de bord citoyen : mes rendez-vous triés par date
            $this->addIndexIfMissing($table, ['booker_user_id', 'appointment_date'], 'idx_pr_user_date');

            // Recherche par quota (anti-overbooking)
            $this->addIndexIfMissing($table, ['quota_id', 'status'], 'idx_pr_quota_status');
        });

        Schema::table('quotas', function (Blueprint $table) {
            // Disponibilités : centre + non-suspendu + date future
            $this->addIndexIfMissing($table, ['center_id', 'date', 'is_suspended'], 'idx_quotas_center_date_suspended');
        });

        Schema::table('sms_logs', function (Blueprint $table) {
            // Vérification rappel déjà envoyé (commande SendReminders)
            $this->addIndexIfMissing($table, ['passport_request_id', 'type', 'status'], 'idx_sms_req_type_status');
        });

        Schema::table('qr_scan_logs', function (Blueprint $table) {
            // Statistiques scans par agent + date
            $this->addIndexIfMissing($table, ['scanned_by', 'scanned_at'], 'idx_qrscan_by_date');

            // Historique par résultat + date
            $this->addIndexIfMissing($table, ['scan_result', 'scanned_at'], 'idx_qrscan_result_date');
        });

        Schema::table('otp_codes', function (Blueprint $table) {
            // Nettoyage des OTPs expirés (job de purge)
            $this->addIndexIfMissing($table, ['is_used', 'expires_at'], 'idx_otp_used_expires');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            // Filtrage admin : action + date
            $this->addIndexIfMissing($table, ['action', 'created_at'], 'idx_audit_action_date');
        });

        // ─── 3. INDEX FONCTIONNEL HASH (recherche exacte ref) ─────

        DB::statement(
            "CREATE INDEX IF NOT EXISTS idx_pr_ref_hash ON passport_requests USING hash (reference_number)"
        );

        // ─── 4. INDEX GIN FULL-TEXT SEARCH (demandeurs) ──────────

        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_applicants_fts
            ON applicants
            USING gin(
                to_tsvector(
                    'french',
                    coalesce(last_name, '') || ' ' || coalesce(first_name, '')
                )
            )
        ");

        // ─── 5. INDEX PARTIELS (performance filtrée) ─────────────

        // Seulement les quotas avec de la disponibilité
        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_quotas_available
            ON quotas (center_id, date, (total_slots - booked_slots))
            WHERE is_suspended = false
        ");

        // Seulement les RDV actifs (non annulés)
        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_pr_active
            ON passport_requests (appointment_date, center_id)
            WHERE status NOT IN ('cancelled')
        ");

        // OTPs encore valides
        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_otp_active
            ON otp_codes (phone, purpose, expires_at)
            WHERE is_used = false
        ");

        // ─── 6. CONTRAINTES UNIQUE (jours fériés) ────────────────

        // Empêche les doublons de jours fériés récurrents (même MM-DD).
        // On stocke mois*100+jour (ex: 0725 = 25 juillet) — opérations
        // purement arithmétiques sur date, considérées IMMUTABLE par PG.
        DB::statement("
            CREATE UNIQUE INDEX IF NOT EXISTS uq_holidays_recurring
            ON public_holidays (
                (EXTRACT(MONTH FROM date)::int * 100 + EXTRACT(DAY FROM date)::int)
            )
            WHERE is_recurring = true
        ");

        // Empêche les doublons de jours fériés ponctuels (même date exacte)
        DB::statement("
            CREATE UNIQUE INDEX IF NOT EXISTS uq_holidays_one_time
            ON public_holidays (date)
            WHERE is_recurring = false
        ");

        // ─── 7. STATISTIQUES PostgreSQL ──────────────────────────

        // Indique à PostgreSQL que status et appointment_date sont corrélés
        DB::statement("
            CREATE STATISTICS IF NOT EXISTS stat_pr_status_date
            ON status, appointment_date
            FROM passport_requests
        ");
    }

    public function down(): void
    {
        // Contraintes CHECK
        $constraints = [
            'quotas'            => ['chk_quotas_slots'],
            'passport_requests' => ['chk_pr_status', 'chk_pr_request_type', 'chk_pr_cancelled_at', 'chk_pr_qr_scanned'],
            'applicants'        => ['chk_applicants_gender', 'chk_applicants_height', 'chk_applicants_marital_status'],
            'otp_codes'         => ['chk_otp_attempts', 'chk_otp_purpose'],
            'center_closures'   => ['chk_closure_dates'],
            'qr_scan_logs'      => ['chk_qr_result', 'chk_qr_scan_mode'],
            'sms_logs'          => ['chk_sms_status', 'chk_sms_type', 'chk_sms_attempts'],
        ];

        foreach ($constraints as $table => $names) {
            foreach ($names as $name) {
                DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$name}");
            }
        }

        // Index
        $indexes = [
            'idx_pr_status_date', 'idx_pr_center_date_status', 'idx_pr_user_date',
            'idx_pr_quota_status', 'idx_pr_ref_hash', 'idx_pr_active',
            'idx_quotas_center_date_suspended', 'idx_quotas_available',
            'idx_sms_req_type_status', 'idx_qrscan_by_date', 'idx_qrscan_result_date',
            'idx_otp_used_expires', 'idx_otp_active', 'idx_audit_action_date',
            'idx_applicants_fts', 'uq_holidays_recurring', 'uq_holidays_one_time',
            'stat_pr_status_date',
        ];

        foreach ($indexes as $index) {
            if (str_starts_with($index, 'stat_')) {
                DB::statement("DROP STATISTICS IF EXISTS {$index}");
            } else {
                DB::statement("DROP INDEX IF EXISTS {$index}");
            }
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────

    /**
     * Ajoute une contrainte CHECK en ignorant si elle existe déjà.
     */
    private function addConstraint(string $table, string $name, string $check): void
    {
        DB::statement("
            DO \$\$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = '{$name}'
                      AND conrelid = '{$table}'::regclass
                ) THEN
                    ALTER TABLE {$table}
                    ADD CONSTRAINT {$name} CHECK ({$check});
                END IF;
            END \$\$;
        ");
    }

    /**
     * Ajoute un index Blueprint en ignorant si le nom existe déjà.
     */
    private function addIndexIfMissing(Blueprint $table, array $columns, string $name): void
    {
        if (! $this->indexExists($name)) {
            $table->index($columns, $name);
        }
    }

    private function indexExists(string $name): bool
    {
        return (bool) DB::selectOne(
            "SELECT 1 FROM pg_indexes WHERE indexname = ?",
            [$name]
        );
    }
};
