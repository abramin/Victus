SHELL := /bin/sh
BACKEND_PORT ?= 8080
FRONTEND_PORT ?= 5173
POSTGRES_PORT ?= 5432
DATABASE_URL ?= postgres://victus:victus@localhost:$(POSTGRES_PORT)/victus?sslmode=disable

export BACKEND_PORT
export FRONTEND_PORT
export POSTGRES_PORT
export DATABASE_URL

.PHONY: app-up app-down app-clean db-up db-clean wait-db wait-backend wait-frontend e2e e2e-native test seed

app-up:
	docker compose up -d --build backend frontend
	docker compose logs -f backend frontend

app-down:
	docker compose down --remove-orphans

app-clean:
	docker compose down --remove-orphans --volumes --rmi local

# Start only the PostgreSQL database
db-up:
	docker compose up -d postgres

# Wait for PostgreSQL to be ready
wait-db:
	@printf "Waiting for PostgreSQL..."; \
	for i in $$(seq 1 30); do \
		if docker compose exec -T postgres pg_isready -U victus >/dev/null 2>&1; then echo " ok"; exit 0; fi; \
		sleep 1; \
	done; \
	echo " failed"; exit 1

# Clean PostgreSQL database (removes volume and restarts services so migrations run)
db-clean:
	docker compose down --volumes
	docker volume rm victus_postgres_data 2>/dev/null || true

wait-backend:
	@printf "Waiting for backend..."; \
	for i in $$(seq 1 60); do \
		if curl -fsS http://localhost:$(BACKEND_PORT)/api/health >/dev/null; then echo " ok"; exit 0; fi; \
		sleep 1; \
	done; \
	echo " failed"; exit 1

wait-frontend:
	@printf "Waiting for frontend..."; \
	for i in $$(seq 1 60); do \
		if curl -fsS http://localhost:$(FRONTEND_PORT) >/dev/null; then echo " ok"; exit 0; fi; \
		sleep 1; \
	done; \
	echo " failed"; exit 1

e2e: app-up wait-backend wait-frontend
	docker compose run --rm --no-deps e2e

# Run Cypress natively (faster on macOS Apple Silicon)
e2e-native: app-up wait-backend wait-frontend
	cd frontend && npm run e2e:run

# Run backend unit and integration tests
test:
	cd backend && go test ./...

# Seed database with 4 weeks of realistic test data
seed: db-up wait-db
	cd backend && DATABASE_URL="$(DATABASE_URL)" go run ./cmd/seed
