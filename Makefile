.DEFAULT_GOAL := help
.PHONY: help check check-schnell docs release-check annahmen voraussetzungen voraussetzungen-docker voraussetzungen-env db dev dev-handy seed ic-import admin test e2e build image rauchtest betrieb-nachweis secrets hooks musterbrief css-vergleich

help: ## Diese Übersicht
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2}'

# Grün gemerkt wird nur ein sauberer, während der Prüfung unveränderter Stand (scripts/pruefungen/gruener-stand.ts);
# der Pre-Push-Hook lässt make check für ihn aus.
check: docs voraussetzungen voraussetzungen-docker ## Alle Prüfungen wie in der CI, ausser Secret-Scan (Hook), OSV-Malware-Prüfung und Rauchtest (nur CI); merkt sich den Stand, wenn grün
	@node scripts/pruefungen/gruener-stand.ts beginn
	npm run lint
	npm run check:svelte
	npm run pruefungen
	$(MAKE) test
	npm run build
	npm run build:spa
	$(MAKE) e2e
	$(MAKE) image
	@node scripts/pruefungen/gruener-stand.ts merken

check-schnell: docs voraussetzungen ## Schnellprüfung ohne Datenbank (Doku, Lint, Svelte-Check, Prüfskripte, Einheitstests) — pre-commit bei Code
	npm run lint
	npm run check:svelte
	npm run pruefungen
	npm run test:einheit

docs: ## Doku-Prüfung (Links, Struktur, Test-IDs, Annahmen, Design-Tokens; braucht nur Node, kein node_modules)
	@bash scripts/pruefe-node.sh
	@bash scripts/check-docs.sh
	@node scripts/pruefungen/test-ids.ts
	@node scripts/pruefungen/annahmen.ts
	@node scripts/pruefungen/design-tokens.ts

release-check: ## Vor dem Release dev → main: Version, docs/versionen.md und Tags abgleichen (holt Tags und origin/main)
	@bash scripts/pruefe-node.sh
	@node scripts/pruefungen/release.ts

annahmen: ## Annahmen zu offenen Fragen an den Verein auflisten (alle, oder nur eine: make annahmen K=K-11)
	@node scripts/pruefungen/annahmen.ts --liste $(K)

voraussetzungen: ## Prüft Node-Version (.nvmrc) und node_modules (installiert nichts)
	@bash scripts/pruefe-node.sh
	@test -d node_modules || { echo "Abbruch: node_modules fehlt — «npm ci --ignore-scripts» ausführen." >&2; exit 1; }

voraussetzungen-docker: ## Prüft, ob Docker erreichbar ist (installiert nichts)
	@docker info >/dev/null 2>&1 || { echo "Abbruch: Docker ist nicht erreichbar — Docker Desktop starten." >&2; exit 1; }

voraussetzungen-env: ## Prüft, ob die lokalen Einstellungen (.env) da sind (legt nichts an)
	@test -f .env || { echo "Abbruch: .env fehlt — «cp .env.example .env» ausführen." >&2; exit 1; }

db: voraussetzungen-docker ## Lokale Datenbank und Mail-Fänger Mailpit starten (Docker, wartet bis bereit)
	docker compose up -d --wait db mail

# .env über Node statt über die Shell laden: Werte enthalten «<», Leerzeichen und Kommas.
dev: voraussetzungen-env db ## Entwicklungsserver starten (mit Datenbank, Einstellungen aus .env)
	node --env-file=.env node_modules/vite/bin/vite.js dev

dev-handy: voraussetzungen-env db ## Entwicklungsserver fürs iPhone im selben WLAN mit einem festen Namen je Rolle (Kurt, Theo, Mona, Hanna) (macOS, nur im eigenen WLAN; Login per Code, ohne Passkey)
	./scripts/dev-handy.sh

seed: voraussetzungen-env db ## Lokale Datenbank migrieren und Testbestand anlegen (mehrfach ausführbar): 5 Personas mit Login und Brief-Code, rund 200 erfundene Mitglieder, eine Beispiel-GV, ein Clubabend, Interclub-Resultate 2026 und ein Beispielturnier 2027 (6 Spieler mit Login ohne Brief-Code, Hanna als Kontaktperson, drei Beispielgespräche mit der Turnierleitung), Brief-Codes ausgeben für Erika (MyTCO-Admin und Mitglieder-Admin), Kurt (Mitglied), Hanna Muster (CM-Admin), Mona Vorlage (nur Mitglieder-Admin) und Theo Platzhalter (nur MyTCO-Admin) (Einstellungen aus .env)
	node --env-file=.env scripts/migrate.ts
	node --env-file=.env scripts/seed-lokal.ts

ic-import: voraussetzungen-env db ## Interclub-Resultate von Swiss Tennis holen, z. B. make ic-import JAHR=2026 (Verein aus IC_VEREIN, Vorgabe 2202; .env wird geladen)
	JAHR=$(JAHR) node --env-file=.env scripts/ic-import.ts

admin: voraussetzungen-env db ## Ersten Admin festlegen, z. B. make admin ARGS='--mitgliedernummer 1 --vorname … --nachname … --strasse … --plz … --ort … --email …'
	node --env-file=.env scripts/admin-festlegen.ts $(ARGS)

test: db ## Einheits- und Datenbanktests mit Abdeckung
	npm test

e2e: db ## Ende-zu-Ende-Tests (Playwright auf eigener, danach gelöschter Datenbank; freier Port ausser E2E_PORT ist gesetzt)
	@port="$${E2E_PORT:-}"; \
	[ -n "$$port" ] || port=$$(node -e "const s=require('node:net').createServer();s.listen(0,()=>{console.log(s.address().port);s.close()})"); \
	echo "E2E auf Port $$port"; \
	E2E_PORT=$$port npm run e2e

build: ## Produktions-Build
	npm run build

musterbrief: voraussetzungen ## Musterbrief als PDF mit erfundenen Daten (musterbrief/musterbrief.pdf)
	node scripts/musterbrief.ts

css-vergleich: voraussetzungen ## Gebautes CSS zweier Builds vergleichen, Beweis für Schritt 18: make css-vergleich VORHER=<Ordner> NACHHER=<Ordner> (Ablauf im Kopf von scripts/css-vergleich.ts; nicht Teil von check)
	node scripts/css-vergleich.ts '$(VORHER)' '$(NACHHER)'

image: voraussetzungen-docker ## Docker-Image bauen (mytco:lokal)
	docker build -t mytco:lokal .

rauchtest: image ## Rauchtest: Image mit Datenbank starten, migrieren, auf "healthy" warten
	bash betrieb/nachweis/rauchtest.sh mytco:lokal

betrieb-nachweis: voraussetzungen-docker image ## Lokaler Gesamtnachweis auf Docker Desktop: Auslieferung Test/Live, HTTPS, Trennung, Rückfall, Sicherung (nicht Teil von check)
	bash betrieb/nachweis/nachweis.sh mytco:lokal

secrets: ## Secret-Scan über die ganze Git-Historie (gitleaks)
	@gitleaks git --no-banner --redact --exit-code 1 .

hooks: ## Versionierte Git-Hooks aktivieren (Secret-Scan, Code-Prüfung bei Commit und Push, Versionsprüfung beim Push auf dev, kein Push auf main)
	@git config core.hooksPath .githooks
	@echo "Git-Hooks aus .githooks/ aktiv."
