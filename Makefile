.DEFAULT_GOAL := help
.PHONY: help check check-schnell docs annahmen voraussetzungen voraussetzungen-docker db dev test e2e build image secrets hooks

help: ## Diese Übersicht
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2}'

check: docs voraussetzungen voraussetzungen-docker ## Alle Prüfungen wie in der CI, ausser Secret-Scan (Hook) und OSV-Malware-Prüfung (nur CI)
	npm run lint
	npm run check:svelte
	npm run pruefungen
	$(MAKE) test
	npm run build
	npm run build:spa
	$(MAKE) e2e
	$(MAKE) image

check-schnell: docs voraussetzungen ## Schnellprüfung ohne Datenbank (Doku, Lint, Svelte-Check, Prüfskripte, Einheitstests) — pre-commit bei Code
	npm run lint
	npm run check:svelte
	npm run pruefungen
	npm run test:einheit

docs: ## Doku-Prüfung (Links, Struktur, Test-IDs; braucht nur Node, kein node_modules)
	@bash scripts/pruefe-node.sh
	@bash scripts/check-docs.sh
	@node scripts/pruefungen/test-ids.ts
	@node scripts/pruefungen/annahmen.ts

annahmen: ## Annahmen zu offenen Fragen an den Verein auflisten (alle, oder nur eine: make annahmen K=K-11)
	@node scripts/pruefungen/annahmen.ts --liste $(K)

voraussetzungen: ## Prüft Node-Version (.nvmrc) und node_modules (installiert nichts)
	@bash scripts/pruefe-node.sh
	@test -d node_modules || { echo "Abbruch: node_modules fehlt — «npm ci --ignore-scripts» ausführen." >&2; exit 1; }

voraussetzungen-docker: ## Prüft, ob Docker erreichbar ist (installiert nichts)
	@docker info >/dev/null 2>&1 || { echo "Abbruch: Docker ist nicht erreichbar — Docker Desktop starten." >&2; exit 1; }

db: voraussetzungen-docker ## Lokale Datenbank starten (Docker, wartet bis bereit)
	docker compose up -d --wait db

dev: db ## Entwicklungsserver starten (mit Datenbank)
	npm run dev

test: db ## Einheits- und Datenbanktests mit Abdeckung
	npm test

e2e: db ## Ende-zu-Ende-Tests (Playwright, freier Port ausser E2E_PORT ist gesetzt)
	@port="$${E2E_PORT:-}"; \
	[ -n "$$port" ] || port=$$(node -e "const s=require('node:net').createServer();s.listen(0,()=>{console.log(s.address().port);s.close()})"); \
	echo "E2E auf Port $$port"; \
	E2E_PORT=$$port npm run e2e

build: ## Produktions-Build
	npm run build

image: voraussetzungen-docker ## Docker-Image bauen (mytco:lokal)
	docker build -t mytco:lokal .

secrets: ## Secret-Scan über die ganze Git-Historie (gitleaks)
	@gitleaks git --no-banner --redact --exit-code 1 .

hooks: ## Versionierte Git-Hooks aktivieren (Secret-Scan, Code-Prüfung bei Commit und Push, kein Push auf main)
	@git config core.hooksPath .githooks
	@echo "Git-Hooks aus .githooks/ aktiv."
