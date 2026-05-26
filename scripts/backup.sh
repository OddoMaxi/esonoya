#!/usr/bin/env bash
# PostgreSQL backup with timestamped files and retention policy.
# Run as a cron job: 0 2 * * * /opt/esonoya/scripts/backup.sh >> /var/log/esonoya/backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/esonoya}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/esonoya_${TIMESTAMP}.dump"
LOG_PREFIX="[backup ${TIMESTAMP}]"

# ─── Load environment ────────────────────────────────────────────────────────
if [ -f /opt/esonoya/.env.production ]; then
    # shellcheck disable=SC1091
    set -a; source /opt/esonoya/.env.production; set +a
fi

DB_HOST="${DB_HOST:-pgbouncer}"
DB_PORT="${DB_PORT:-5432}"
DB_DATABASE="${DB_DATABASE:-esonoya}"
DB_USERNAME="${DB_USERNAME:-postgres}"
export PGPASSWORD="${DB_PASSWORD}"

# ─── Pre-flight ──────────────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

echo "${LOG_PREFIX} Starting backup of ${DB_DATABASE}..."

# ─── Dump ────────────────────────────────────────────────────────────────────
# Use custom format (-Fc) for efficient compression + selective restore
docker compose -f /opt/esonoya/docker-compose.yml exec -T postgres \
    pg_dump \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --username="${DB_USERNAME}" \
        --dbname="${DB_DATABASE}" \
        --format=custom \
        --compress=9 \
        --no-password \
    > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "${LOG_PREFIX} Backup written: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ─── Verify ─────────────────────────────────────────────────────────────────
if pg_restore --list "${BACKUP_FILE}" > /dev/null 2>&1; then
    echo "${LOG_PREFIX} Integrity check passed."
else
    echo "${LOG_PREFIX} ERROR: Integrity check failed!" >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# ─── Remote copy (optional) ─────────────────────────────────────────────────
# Uncomment and configure to offload to S3-compatible storage:
# aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/$(basename ${BACKUP_FILE})" \
#     --storage-class STANDARD_IA

# ─── Retention ───────────────────────────────────────────────────────────────
echo "${LOG_PREFIX} Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "esonoya_*.dump" -mtime "+${RETENTION_DAYS}" -delete -print \
    | xargs -r -I{} echo "${LOG_PREFIX} Deleted: {}"

echo "${LOG_PREFIX} Done."
