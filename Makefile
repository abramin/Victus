SHELL := /bin/sh
BACKEND_PORT ?= 8080
FRONTEND_PORT ?= 5173

export BACKEND_PORT
export FRONTEND_PORT

.PHONY: app-up app-down wait-backend wait-frontend e2e e2e-native

app-up:
	docker compose up -d --build

app-down:
	docker compose down --remove-orphans

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
