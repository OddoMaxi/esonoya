# eSonoya — Base de données PostgreSQL

> Schéma complet — 16 tables métier + tables système (Sanctum, Spatie, Queue)

---

## Diagramme logique

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  LÉGENDE                                                                    │
 │  PK  = Clé primaire (UUID v4)     FK  = Clé étrangère                      │
 │  UQ  = Contrainte UNIQUE           ?   = Nullable                           │
 │  ──► = 1-à-plusieurs              ══► = 1-à-1                              │
 │  CHECK(…) = Contrainte de domaine  GIN = Index full-text PostgreSQL         │
 └─────────────────────────────────────────────────────────────────────────────┘


                    ┌──────────────────────────────────────────────┐
                    │                  centers                     │
                    ├──────────────────────────────────────────────┤
                    │ id           UUID  PK                        │
                    │ name         VARCHAR(150)                    │
                    │ city         VARCHAR(100)                    │
                    │ address      TEXT                            │
                    │ phone        VARCHAR(20)?                    │
                    │ email        VARCHAR(100)?                   │
                    │ is_active    BOOLEAN DEFAULT true            │
                    │ created_at / updated_at                      │
                    └──────┬──────────────────────┬───────────────┘
                           │                      │
              ─────────────┘                      └──────────────────────────
              │  1:n                                               1:n       │
              ▼                                                              ▼
   ┌──────────────────────┐                             ┌────────────────────────────┐
   │        quotas        │                             │        admin_users         │
   ├──────────────────────┤                             ├────────────────────────────┤
   │ id           UUID PK │                             │ id          UUID PK        │
   │ center_id    FK      │◄──── center ferme ─────────►│ center_id   FK→centers?   │
   │ date         DATE    │                             │ name        VARCHAR(150)   │
   │ total_slots  SMALL   │                             │ email       VARCHAR UQ     │
   │ booked_slots SMALL   │                             │ password    VARCHAR(255)   │
   │ is_suspended BOOL    │                             │ phone       VARCHAR?       │
   │ suspension_reason?   │                             │ is_active   BOOL          │
   │ UQ(center_id, date)  │                             │ last_login_at?            │
   │ CHECK slots ≥ 0      │                             └───────────┬────────────────┘
   │ CHECK booked≤total   │                                         │ n:m
   └──────┬───────────────┘                                         ▼
          │ 1:n                                         ┌────────────────────────────┐
          │                                             │  roles / permissions       │
          │                                             │  (Spatie Laravel Permission│
          │                                             │   guard = admin)           │
          │                                             └────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              passport_requests                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ id                UUID  PK                                                         │
│ center_id         FK → centers                 IDX (center_id, date, status)       │
│ quota_id          FK → quotas                  IDX (status, appointment_date)      │
│ booker_user_id    FK → users ?                 IDX (booker_user_id, date)          │
│ reference_number  VARCHAR(50)  UQ              IDX HASH (reference_number)         │
│ receipt_reference VARCHAR(100)                                                     │
│ request_type      VARCHAR      CHECK IN (new | renewal | lost)                     │
│ appointment_date  DATE                                                             │
│ status            VARCHAR      CHECK IN (pending | confirmed | present             │
│                                           | absent | cancelled)                   │
│ qr_token          VARCHAR(255) UQ                                                  │
│ qr_scanned_at     TIMESTAMP?                                                       │
│ qr_scanned_by     FK → admin_users ?                                               │
│ pdf_generated_at  TIMESTAMP?                                                       │
│ cancelled_at      TIMESTAMP?                                                       │
│ cancellation_reason TEXT?                                                          │
│ created_at / updated_at                                                            │
└──┬──────────────┬──────────────┬──────────────────────┬─────────────┬─────────────┘
   │1:1           │1:1?          │1:n                   │1:n          │1:n
   ▼              ▼              ▼                       ▼             ▼
┌──────────┐ ┌──────────┐ ┌─────────────────┐ ┌────────────────┐ ┌──────────────────┐
│applicants│ │declarants│ │    sms_logs     │ │ appt_notif.   │ │  qr_scan_logs    │
└──────────┘ └──────────┘ └─────────────────┘ └────────────────┘ └──────────────────┘


┌────────────────────────────────────────────────────┐
│                     applicants                     │
├────────────────────────────────────────────────────┤
│ id                  UUID PK                        │
│ passport_request_id FK → passport_requests  1:1   │
│ last_name           VARCHAR(100)                   │
│ first_name          VARCHAR(100)                   │
│ birth_date          DATE                           │
│ birth_place         VARCHAR(150)                   │
│ nationality         VARCHAR(100) DEFAULT 'Guinéenne│
│ gender              VARCHAR  CHECK IN (M | F)      │
│ marital_status      VARCHAR  CHECK IN (single |    │
│                      married | divorced | widowed) │
│ profession          VARCHAR(100)?                  │
│ height_cm           SMALLINT? CHECK BETWEEN 50-250 │
│ eye_color           VARCHAR(30)?                   │
│ distinctive_signs   TEXT?                          │
│ phone               VARCHAR(20)                    │
│ email               VARCHAR(150)?                  │
│ address             TEXT?                          │
│ father_last_name    VARCHAR(100)?                  │
│ father_first_name   VARCHAR(100)?                  │
│ mother_last_name    VARCHAR(100)?                  │
│ mother_first_name   VARCHAR(100)?                  │
│ IDX (last_name, first_name)                        │
│ GIN to_tsvector('french', last_name||first_name)   │
└────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                    declarants                    │
├──────────────────────────────────────────────────┤
│ id                  UUID PK                      │
│ passport_request_id FK → passport_requests 1:1  │
│ last_name           VARCHAR(100)                 │
│ first_name          VARCHAR(100)                 │
│ phone               VARCHAR(20)                  │
│ email               VARCHAR(150)?                │
│ relationship        VARCHAR(50)                  │
│                     (parent|sibling|spouse|other)│
│ created_at          TIMESTAMP                    │
└──────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                      sms_logs                       │
├─────────────────────────────────────────────────────┤
│ id                  UUID PK                         │
│ passport_request_id FK → passport_requests? NULL   │
│ phone               VARCHAR(20)  IDX               │
│ message             TEXT                            │
│ type                VARCHAR(30)  IDX               │
│                     CHECK IN (otp | confirmation    │
│                                | reminder | cancel) │
│ status              VARCHAR(20)  IDX               │
│                     CHECK IN (pending | sent        │
│                                | failed | delivered)│
│ provider_id         VARCHAR(100)?                   │
│ error_message       TEXT?                           │
│ attempts            SMALLINT ≥ 0                    │
│ sent_at             TIMESTAMP?                      │
│ created_at          TIMESTAMP  IDX                  │
│ IDX (passport_request_id, type, status)             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              appointment_notifications              │
├─────────────────────────────────────────────────────┤
│ id                  UUID PK                         │
│ passport_request_id FK → passport_requests         │
│ type                VARCHAR(30)                     │
│                     (confirmation|reminder_24h|…)   │
│ channel             VARCHAR(20) DEFAULT 'sms'       │
│ status              VARCHAR(20) DEFAULT 'pending'   │
│ scheduled_at        TIMESTAMP                       │
│ sent_at             TIMESTAMP?                      │
│ created_at          TIMESTAMP                       │
│ IDX (passport_request_id)                           │
│ IDX (status, scheduled_at)                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    qr_scan_logs                     │
├─────────────────────────────────────────────────────┤
│ id                  UUID PK                         │
│ passport_request_id FK → passport_requests?        │
│ scanned_by          FK → admin_users?              │
│ raw_token           VARCHAR(600)                    │
│ scan_result         VARCHAR(30)                     │
│                     CHECK IN (success |             │
│                      already_scanned | invalid_token│
│                      | invalid_signature | cancelled│
│                      | wrong_date | not_found)      │
│ ip_address          VARCHAR(45)?                    │
│ user_agent          VARCHAR(500)?                   │
│ scan_mode           VARCHAR(20)                     │
│                     CHECK IN (manual|camera|file)   │
│ scanned_at          TIMESTAMP  IDX                  │
│ IDX (passport_request_id)                           │
│ IDX (scanned_by, scanned_at)                        │
│ IDX (scan_result, scanned_at)                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                     audit_logs                      │
├─────────────────────────────────────────────────────┤
│ id             UUID PK                              │
│ admin_user_id  FK → admin_users?  IDX              │
│ action         VARCHAR(100)  IDX                    │
│ subject_type   VARCHAR(100)?                        │
│ subject_id     UUID?                                │
│ old_values     JSONB?                               │
│ new_values     JSONB?                               │
│ ip_address     VARCHAR(45)?                         │
│ user_agent     TEXT?                                │
│ created_at     TIMESTAMP  IDX                       │
│ IDX (subject_type, subject_id)                      │
│ IDX (action, created_at)                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                    users                        │
├─────────────────────────────────────────────────┤
│ id            UUID PK                           │
│ phone         VARCHAR(20)  UNIQUE               │
│ email         VARCHAR(150)?                     │
│ first_name    VARCHAR(100)?                     │
│ last_name     VARCHAR(100)?                     │
│ is_active     BOOLEAN DEFAULT true              │
│ last_login_at TIMESTAMP?                        │
│ created_at / updated_at                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                   otp_codes                     │
├─────────────────────────────────────────────────┤
│ id         UUID PK                              │
│ phone      VARCHAR(20)                          │
│ code       VARCHAR(10)                          │
│ purpose    VARCHAR(30)                          │
│            CHECK IN (citizen_login | admin_2fa) │
│ attempts   SMALLINT  CHECK ≥ 0                  │
│ is_used    BOOLEAN                              │
│ expires_at TIMESTAMP                            │
│ created_at TIMESTAMP                            │
│ IDX (phone, purpose)                            │
│ IDX (is_used, expires_at)                       │
│ IDX PARTIAL actif (phone, purpose, expires_at   │
│              WHERE is_used = false)             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                public_holidays                  │
├─────────────────────────────────────────────────┤
│ id           UUID PK                            │
│ name         VARCHAR(150)                       │
│ date         DATE                               │
│ year         SMALLINT?                          │
│ is_recurring BOOLEAN DEFAULT true               │
│ description  TEXT?                              │
│ created_at / updated_at                         │
│ IDX (date)                                      │
│ UQ PARTIAL récurrents : TO_CHAR(date,'MM-DD')   │
│   WHERE is_recurring = true                     │
│ UQ PARTIAL ponctuels  : date                    │
│   WHERE is_recurring = false                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                center_closures                  │
├─────────────────────────────────────────────────┤
│ id          UUID PK                             │
│ center_id   FK → centers                        │
│ date_from   DATE                                │
│ date_to     DATE                                │
│ reason      VARCHAR(255)?                       │
│ created_by  FK → admin_users?                  │
│ created_at  TIMESTAMP                           │
│ CHECK date_to >= date_from                      │
│ IDX (center_id, date_from, date_to)             │
└─────────────────────────────────────────────────┘
```

---

## Relations Eloquent détaillées

### `Center` → has many
| Relation | Modèle cible | Clé | Cascade |
|---|---|---|---|
| `quotas()` | `Quota` | `center_id` | DELETE cascade |
| `adminUsers()` | `AdminUser` | `center_id` | SET NULL |
| `closures()` | `CenterClosure` | `center_id` | DELETE cascade |
| `appointments()` | `PassportRequest` | `center_id` | RESTRICT |

### `Quota` → belongs to / has many
| Relation | Modèle cible | Clé | Cascade |
|---|---|---|---|
| `center()` | `Center` | `center_id` | — |
| `appointments()` | `PassportRequest` | `quota_id` | — |

> **Contrainte anti-overbooking** : `UNIQUE(center_id, date)` + WHERE atomique `booked_slots < total_slots`

### `PassportRequest` — table pivot centrale
| Relation | Type | Modèle cible | Clé |
|---|---|---|---|
| `center()` | belongsTo | `Center` | `center_id` |
| `quota()` | belongsTo | `Quota` | `quota_id` |
| `booker()` | belongsTo | `User` | `booker_user_id` |
| `applicant()` | hasOne | `Applicant` | `passport_request_id` |
| `declarant()` | hasOne | `Declarant` | `passport_request_id` |
| `smsLogs()` | hasMany | `SmsLog` | `passport_request_id` |
| `notifications()` | hasMany | `AppointmentNotification` | `passport_request_id` |
| `qrScans()` | hasMany | `QrScanLog` | `passport_request_id` |
| `scannedBy()` | belongsTo | `AdminUser` | `qr_scanned_by` |

### `AdminUser` → belongs to / has many
| Relation | Modèle cible | Note |
|---|---|---|
| `center()` | `Center` | Un admin peut être attaché à un centre (ou global) |
| `roles()` | `Role` (Spatie) | Guard `admin`, rôles : super-admin, admin-centre, agent, statisticien |
| `permissions()` | `Permission` (Spatie) | Via les rôles ou directement assignées |
| `auditLogs()` | `AuditLog` | Traçabilité des actions |
| `qrScans()` | `QrScanLog` | Historique des scans effectués |

### `User` (citoyen) → has many
| Relation | Modèle cible | Clé |
|---|---|---|
| `appointments()` | `PassportRequest` | `booker_user_id` |
| `tokens()` | `PersonalAccessToken` (Sanctum) | guard `sanctum` |

---

## Index — récapitulatif

| Index | Table | Colonnes | Type | Raison |
|---|---|---|---|---|
| `PK` | toutes | `id` | UUID BTree | Clé primaire |
| `UQ phone` | `users` | `phone` | BTree | Login OTP |
| `UQ email` | `admin_users` | `email` | BTree | Login admin |
| `UQ ref` | `passport_requests` | `reference_number` | **Hash** | Recherche exacte |
| `UQ quota` | `quotas` | `(center_id, date)` | BTree | Anti-doublon quota |
| `UQ qr` | `passport_requests` | `qr_token` | BTree | Vérification QR |
| `idx_pr_status_date` | `passport_requests` | `(status, date)` | BTree | Filtre liste admin |
| `idx_pr_center_date_status` | `passport_requests` | `(center_id, date, status)` | BTree | Stats par centre |
| `idx_pr_user_date` | `passport_requests` | `(booker_user_id, date)` | BTree | Mes RDV citoyen |
| `idx_pr_quota_status` | `passport_requests` | `(quota_id, status)` | BTree | Décompte par quota |
| `idx_pr_active` | `passport_requests` | `(date, center_id)` | Partial ≠ cancelled | RDV actifs |
| `idx_quotas_available` | `quotas` | `(center_id, date, dispo)` | Partial ¬suspended | Dispo en temps réel |
| `idx_quotas_center_date` | `quotas` | `(center_id, date, suspended)` | BTree | Calendrier |
| `idx_applicants_fts` | `applicants` | `(last_name, first_name)` | **GIN FTS** | Recherche full-text |
| `idx_sms_req_type` | `sms_logs` | `(passport_request_id, type, status)` | BTree | Anti-doublon rappel |
| `idx_otp_active` | `otp_codes` | `(phone, purpose, expires_at)` | Partial ¬used | OTP valides |
| `idx_qrscan_by_date` | `qr_scan_logs` | `(scanned_by, scanned_at)` | BTree | Stats agent |
| `uq_holidays_recurring` | `public_holidays` | `TO_CHAR(date,'MM-DD')` | **Expression** | Anti-doublon récurrents |
| `uq_holidays_one_time` | `public_holidays` | `date` | Partial ¬recurring | Anti-doublon ponctuels |
| `stat_pr_status_date` | `passport_requests` | `status, date` | **Statistiques** | Optimiseur de requêtes |

---

## Contraintes CHECK — récapitulatif

| Table | Contrainte | Règle |
|---|---|---|
| `quotas` | `chk_quotas_slots` | `total_slots ≥ 0 AND booked_slots ≥ 0 AND booked_slots ≤ total_slots` |
| `passport_requests` | `chk_pr_status` | `status IN (pending, confirmed, present, absent, cancelled)` |
| `passport_requests` | `chk_pr_request_type` | `request_type IN (new, renewal, lost)` |
| `passport_requests` | `chk_pr_cancelled_at` | `cancelled_at IS NULL OR status = 'cancelled'` |
| `passport_requests` | `chk_pr_qr_scanned` | `qr_scanned_at IS NULL OR status IN (present, absent)` |
| `applicants` | `chk_applicants_gender` | `gender IN ('M', 'F')` |
| `applicants` | `chk_applicants_height` | `height_cm IS NULL OR height_cm BETWEEN 50 AND 250` |
| `applicants` | `chk_applicants_marital` | `marital_status IN (single, married, divorced, widowed)` |
| `otp_codes` | `chk_otp_attempts` | `attempts ≥ 0` |
| `otp_codes` | `chk_otp_purpose` | `purpose IN (citizen_login, admin_2fa)` |
| `center_closures` | `chk_closure_dates` | `date_to ≥ date_from` |
| `qr_scan_logs` | `chk_qr_result` | `scan_result IN (success, already_scanned, …)` |
| `qr_scan_logs` | `chk_qr_scan_mode` | `scan_mode IN (manual, camera, file)` |
| `sms_logs` | `chk_sms_status` | `status IN (pending, sent, failed, delivered)` |
| `sms_logs` | `chk_sms_type` | `type IN (otp, confirmation, reminder, cancellation)` |

---

## Ordre de création (contraintes FK)

```
1.  cache + jobs             (tables Laravel système)
2.  centers
3.  users
4.  admin_users              (FK → centers)
5.  otp_codes
6.  quotas                   (FK → centers)
7.  passport_requests        (FK → centers, quotas, users, admin_users)
8.  applicants               (FK → passport_requests)
9.  declarants               (FK → passport_requests)
10. sms_logs                 (FK → passport_requests)
11. audit_logs               (FK → admin_users)
12. appointment_notifications(FK → passport_requests)
13. permissions/roles        (Spatie — FK → admin_users via morph)
14. public_holidays
15. center_closures          (FK → centers, admin_users)
16. qr_scan_logs             (FK → passport_requests, admin_users)
17. sms_logs add FK          (migration 000015 — ajout FK manquant)
18. contraintes + index      (migration 000016 — cette migration)
```

---

## Tables système (hors migrations métier)

| Table | Origine | Usage |
|---|---|---|
| `personal_access_tokens` | Laravel Sanctum | Tokens citoyens (guard `sanctum`) |
| `jobs` / `job_batches` / `failed_jobs` | Laravel Queue | File d'attente (SMS, notifications) |
| `cache` / `cache_locks` | Laravel Cache | OTP rate-limit, quotas Redis fallback |
| `permissions` / `roles` | Spatie Permission | RBAC admin — guard `admin` |
| `model_has_roles` | Spatie | Pivot AdminUser ↔ Role |
| `model_has_permissions` | Spatie | Pivot AdminUser ↔ Permission |
| `role_has_permissions` | Spatie | Pivot Role ↔ Permission |

---

## Commandes utiles

```bash
# Appliquer toutes les migrations
php artisan migrate

# Appliquer uniquement la migration de contraintes
php artisan migrate --path=database/migrations/2024_01_01_000016_add_constraints_and_indexes.php

# Vérifier le schéma actuel
php artisan db:show --counts

# Analyser les statistiques PostgreSQL (après migration 000016)
psql -U postgres -d esonoya -c "ANALYZE passport_requests;"

# Vérifier les contraintes CHECK actives
psql -U postgres -d esonoya -c "
  SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE contype = 'c'
  ORDER BY conrelid::regclass::text, conname;
"
```
