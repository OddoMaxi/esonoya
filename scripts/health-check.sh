#!/usr/bin/env bash
# Platform health check — returns 0 if all services are healthy, 1 otherwise.
# Usage: ./scripts/health-check.sh [--json]
set -euo pipefail

JSON_OUTPUT="${1:-}"
FAILED=0

ok()   { echo "  ✓ $1"; }
fail() { echo "  ✗ $1" >&2; FAILED=1; }

declare -A RESULTS

check_http() {
    local name="$1" url="$2"
    if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
        ok "$name ($url)"
        RESULTS["$name"]="ok"
    else
        fail "$name ($url)"
        RESULTS["$name"]="fail"
    fi
}

check_docker_service() {
    local name="$1"
    local status
    status=$(docker compose ps --format json "$name" 2>/dev/null \
        | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Health','unknown'))" 2>/dev/null \
        || echo "unknown")

    if [ "$status" = "healthy" ]; then
        ok "Docker: $name (healthy)"
        RESULTS["docker_$name"]="ok"
    else
        fail "Docker: $name ($status)"
        RESULTS["docker_$name"]="fail"
    fi
}

echo "=== eSonoya Health Check — $(date) ==="
echo ""

echo "── API ──────────────────────────────────────────"
check_http "API /up"           "http://localhost:8000/up"
check_http "API HTTPS /up"     "https://api.esonoya.gov.gn/up"

echo ""
echo "── Frontends ────────────────────────────────────"
check_http "Citizen"           "http://localhost:3000/"
check_http "Admin"             "http://localhost:3001/"

echo ""
echo "── Docker containers ────────────────────────────"
check_docker_service "postgres"
check_docker_service "redis"
check_docker_service "api"

echo ""
echo "── Queue ────────────────────────────────────────"
if docker compose exec -T api php artisan queue:failed --count 2>/dev/null | grep -q "^0$"; then
    ok "No failed jobs"
    RESULTS["queue"]="ok"
else
    FAILED_JOBS=$(docker compose exec -T api php artisan queue:failed --count 2>/dev/null || echo "?")
    fail "Failed jobs: ${FAILED_JOBS}"
    RESULTS["queue"]="warn"
fi

echo ""

if [ "$FAILED" -eq 0 ]; then
    echo "=== ALL HEALTHY ==="
    exit 0
else
    echo "=== DEGRADED — check failed services above ===" >&2
    exit 1
fi
