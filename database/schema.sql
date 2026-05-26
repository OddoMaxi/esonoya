-- ============================================================
-- eSonoya — Schéma PostgreSQL complet
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: centers (Centres de traitement des passeports)
-- ============================================================
CREATE TABLE centers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(150) NOT NULL,
    city        VARCHAR(100) NOT NULL,
    address     TEXT NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(100),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_centers_city ON centers(city);
CREATE INDEX idx_centers_active ON centers(is_active);

-- ============================================================
-- TABLE: users (Citoyens authentifiés)
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(20) NOT NULL UNIQUE,
    email           VARCHAR(150),
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- TABLE: admin_users (Utilisateurs administration)
-- ============================================================
CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id       UUID REFERENCES centers(id) ON DELETE SET NULL,
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_center ON admin_users(center_id);

-- ============================================================
-- TABLE: otp_codes (Codes OTP SMS)
-- ============================================================
CREATE TABLE otp_codes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(20) NOT NULL,
    code            VARCHAR(10) NOT NULL,
    purpose         VARCHAR(30) NOT NULL, -- 'citizen_login', 'admin_2fa'
    attempts        SMALLINT NOT NULL DEFAULT 0,
    is_used         BOOLEAN NOT NULL DEFAULT false,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_phone_purpose ON otp_codes(phone, purpose);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- ============================================================
-- TABLE: quotas (Quotas journaliers par centre)
-- ============================================================
CREATE TABLE quotas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id       UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    total_slots     SMALLINT NOT NULL DEFAULT 0,
    booked_slots    SMALLINT NOT NULL DEFAULT 0,
    is_suspended    BOOLEAN NOT NULL DEFAULT false,
    suspension_reason TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_quota_center_date UNIQUE (center_id, date),
    CONSTRAINT chk_slots_positive CHECK (total_slots >= 0 AND booked_slots >= 0),
    CONSTRAINT chk_booked_lte_total CHECK (booked_slots <= total_slots)
);

CREATE INDEX idx_quotas_center_date ON quotas(center_id, date);
CREATE INDEX idx_quotas_date ON quotas(date);

-- ============================================================
-- TABLE: passport_requests (Demandes de passeport)
-- ============================================================
CREATE TABLE passport_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id           UUID NOT NULL REFERENCES centers(id),
    quota_id            UUID NOT NULL REFERENCES quotas(id),
    booker_user_id      UUID REFERENCES users(id),       -- qui a réservé
    reference_number    VARCHAR(50) NOT NULL UNIQUE,     -- numéro RDV généré
    receipt_reference   VARCHAR(100) NOT NULL,            -- référence reçu paiement
    request_type        VARCHAR(30) NOT NULL,             -- 'new', 'renewal', 'lost'
    appointment_date    DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'confirmed', 'present', 'absent', 'cancelled'
    qr_token            VARCHAR(255) NOT NULL UNIQUE,    -- token QR sécurisé
    qr_scanned_at       TIMESTAMP,
    qr_scanned_by       UUID REFERENCES admin_users(id),
    pdf_generated_at    TIMESTAMP,
    cancelled_at        TIMESTAMP,
    cancellation_reason TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pr_center ON passport_requests(center_id);
CREATE INDEX idx_pr_date ON passport_requests(appointment_date);
CREATE INDEX idx_pr_status ON passport_requests(status);
CREATE INDEX idx_pr_reference ON passport_requests(reference_number);
CREATE INDEX idx_pr_qr_token ON passport_requests(qr_token);
CREATE INDEX idx_pr_booker ON passport_requests(booker_user_id);

-- ============================================================
-- TABLE: applicants (Informations du demandeur de passeport)
-- ============================================================
CREATE TABLE applicants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passport_request_id UUID NOT NULL UNIQUE REFERENCES passport_requests(id) ON DELETE CASCADE,
    -- Identité
    last_name           VARCHAR(100) NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    birth_date          DATE NOT NULL,
    birth_place         VARCHAR(150) NOT NULL,
    nationality         VARCHAR(100) NOT NULL DEFAULT 'Guinéenne',
    gender              VARCHAR(10) NOT NULL,            -- 'M', 'F'
    -- Situation
    marital_status      VARCHAR(20) NOT NULL,            -- 'single','married','divorced','widowed'
    profession          VARCHAR(100),
    -- Signalement
    height_cm           SMALLINT,
    eye_color           VARCHAR(30),
    distinctive_signs   TEXT,
    -- Contact
    phone               VARCHAR(20) NOT NULL,
    email               VARCHAR(150),
    address             TEXT,
    -- Parents
    father_last_name    VARCHAR(100),
    father_first_name   VARCHAR(100),
    mother_last_name    VARCHAR(100),
    mother_first_name   VARCHAR(100),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applicants_request ON applicants(passport_request_id);
CREATE INDEX idx_applicants_name ON applicants(last_name, first_name);

-- ============================================================
-- TABLE: declarants (Déclarant si réservation pour autrui)
-- ============================================================
CREATE TABLE declarants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passport_request_id UUID NOT NULL UNIQUE REFERENCES passport_requests(id) ON DELETE CASCADE,
    last_name           VARCHAR(100) NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    email               VARCHAR(150),
    relationship        VARCHAR(50) NOT NULL,            -- 'parent','sibling','spouse','other'
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: sms_logs (Historique des SMS envoyés)
-- ============================================================
CREATE TABLE sms_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(20) NOT NULL,
    message         TEXT NOT NULL,
    type            VARCHAR(30) NOT NULL,    -- 'otp','confirmation','reminder','cancellation'
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending','sent','failed','delivered'
    provider_id     VARCHAR(100),            -- ID retourné par le provider
    error_message   TEXT,
    attempts        SMALLINT NOT NULL DEFAULT 0,
    sent_at         TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_phone ON sms_logs(phone);
CREATE INDEX idx_sms_status ON sms_logs(status);
CREATE INDEX idx_sms_type ON sms_logs(type);
CREATE INDEX idx_sms_created ON sms_logs(created_at);

-- ============================================================
-- TABLE: audit_logs (Journal des actions administration)
-- ============================================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,    -- ex: 'appointment.cancelled', 'quota.updated'
    subject_type    VARCHAR(100),             -- ex: 'passport_request', 'quota'
    subject_id      UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_admin ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_subject ON audit_logs(subject_type, subject_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================
-- TABLE: notifications (Notifications planifiées)
-- ============================================================
CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passport_request_id UUID REFERENCES passport_requests(id) ON DELETE CASCADE,
    type                VARCHAR(30) NOT NULL,    -- 'confirmation','reminder_24h','reminder_1h'
    channel             VARCHAR(20) NOT NULL DEFAULT 'sms',
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    scheduled_at        TIMESTAMP NOT NULL,
    sent_at             TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_request ON notifications(passport_request_id);
CREATE INDEX idx_notif_status_scheduled ON notifications(status, scheduled_at);

-- ============================================================
-- FONCTION: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger sur les tables concernées
CREATE TRIGGER update_centers_updated_at BEFORE UPDATE ON centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotas_updated_at BEFORE UPDATE ON quotas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_passport_requests_updated_at BEFORE UPDATE ON passport_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applicants_updated_at BEFORE UPDATE ON applicants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
