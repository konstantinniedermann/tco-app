.DEFAULT_GOAL := help
.PHONY: help check check-schnell docs voraussetzungen db dev test e2e build secrets hooks

help: ## Diese Übersicht
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

check: docs voraussetzungen ## Alle Prüfungen wie in der CI (ausser Secret-Scan und Malware-Prüfung: die laufen im Hook bzw. nur in der CI)
	npm run lint
	npm run check:svelte
	npm run pruefungen
	$(MAKE) db
	npm test
	npm run build
	npm run build:spa
	npm run e2e

check-schnell: docs voraussetzungen ## Schnellprüfung ohne Datenbank (Doku, Lint, Svelte-Check, Prüfskripte, Einheitstests) — pre-commit bei Code
	npm run lint
	npm run check:svelte
	npm run pruefungen
	npm run test:einheit

docs: ## Doku-Prüfung (Links, Struktur)
	@bash scripts/check-docs.sh

voraussetzungen: ## Prüft, ob node_modules und Docker vorhanden sind (installiert nichts)
	@test -d node_modules || { echo "Abbruch: node_modules fehlt — «npm ci --ignore-scripts» ausführen." >&2; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "Abbruch: Docker ist nicht erreichbar — Docker Desktop starten." >&2; exit 1; }

db: ## Lokale Datenbank starten (Docker, wartet bis bereit)
	docker compose up -d --wait db

dev: db ## Entwicklungsserver starten (mit Datenbank)
	npm run dev

test: db ## Einheits- und Datenbanktests mit Abdeckung
	npm test

e2e: db ## Ende-zu-Ende-Tests (Playwright)
	npm run e2e

build: ## Produktions-Build
	npm run build

secrets: ## Secret-Scan über die ganze Git-Historie (gitleaks)
	@gitleaks git --no-banner --redact --exit-code 1 .

hooks: ## Versionierte Git-Hooks aktivieren (Secret-Scan, Code-Prüfung bei Commit und Push, kein Push auf main)
	@git config core.hooksPath .githooks
	@echo "Git-Hooks aus .githooks/ aktiv."
