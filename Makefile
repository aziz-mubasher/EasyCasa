# EasyCasa — local ops shortcuts (Drizzle + existing Traefik/Caddy compose)
# Prefer: docker compose -f infra/docker-compose.yml --env-file .env [--profile caddy]
COMPOSE = docker compose -f infra/docker-compose.yml --env-file .env
COMPOSE_TRAEFIK = docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env

.PHONY: help up up-caddy down logs migrate reindex psql fresh keycloak

help: ## Show targets
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

up: ## Start stack (db/redis/meili/minio/api/web/ai) without host ports 80/443
	$(COMPOSE) up -d --build

up-caddy: ## Local edge via Caddy profile (ports 80/443)
	$(COMPOSE) --profile caddy up -d --build

down: ## Stop stack
	$(COMPOSE) down

logs: ## Tail API logs
	$(COMPOSE) logs -f api

migrate: ## Apply SQL migrations (Drizzle runner under migration/)
	pnpm --filter @easycasa/migration migrate

reindex: ## Backfill Meilisearch listings index
	pnpm --filter @easycasa/api search:backfill

psql: ## Open psql in the db container
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-easycasa} -d $${POSTGRES_DB:-easycasa}

fresh: ## Wipe volumes and restart (destructive)
	$(COMPOSE) down -v && $(COMPOSE) up -d --build

keycloak: ## Optional Keycloak (OIDC) for local auth — see infra/docker-compose.keycloak.yml
	docker compose -f infra/docker-compose.yml -f infra/docker-compose.keycloak.yml --env-file .env up -d keycloak
