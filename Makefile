.PHONY: help build up down restart logs migrate shell backup health

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS=":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ─── Build ────────────────────────────────────────────────────────────────────
build: ## Build all Docker images
	docker compose build --parallel

build-api: ## Rebuild API image only
	docker compose build api

build-citizen: ## Rebuild citizen frontend image
	docker compose build citizen

build-admin: ## Rebuild admin dashboard image
	docker compose build admin

# ─── Lifecycle ────────────────────────────────────────────────────────────────
up: ## Start all services (production mode)
	docker compose -f docker-compose.yml up -d

up-scale: ## Start with 2 API replicas + 2 workers
	docker compose -f docker-compose.yml up -d --scale api=2 --scale worker=2

dev: ## Start in dev mode (uses docker-compose.override.yml automatically)
	docker compose up -d

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

# ─── Monitoring ───────────────────────────────────────────────────────────────
monitoring: ## Start Prometheus + Grafana
	docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# ─── Logs ─────────────────────────────────────────────────────────────────────
logs: ## Tail logs for all services
	docker compose logs -f --tail=100

logs-api: ## Tail API logs
	docker compose logs -f --tail=100 api

logs-worker: ## Tail worker logs
	docker compose logs -f --tail=100 worker

# ─── Database ─────────────────────────────────────────────────────────────────
migrate: ## Run pending migrations
	docker compose exec api php artisan migrate --force

migrate-status: ## Show migration status
	docker compose exec api php artisan migrate:status

seed: ## Run seeders (dev only)
	docker compose exec api php artisan db:seed

# ─── Artisan ─────────────────────────────────────────────────────────────────
shell: ## Open a shell in the API container
	docker compose exec api sh

artisan: ## Run artisan command: make artisan CMD="cache:clear"
	docker compose exec api php artisan $(CMD)

queue-failed: ## List failed jobs
	docker compose exec api php artisan queue:failed

queue-retry: ## Retry all failed jobs
	docker compose exec api php artisan queue:retry all

# ─── Maintenance ─────────────────────────────────────────────────────────────
backup: ## Run PostgreSQL backup now
	./scripts/backup.sh

health: ## Run platform health check
	./scripts/health-check.sh

cache-clear: ## Clear all application caches
	docker compose exec api php artisan optimize:clear

cache-warm: ## Warm all application caches
	docker compose exec api php artisan optimize
