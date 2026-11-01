# Design: Code-Gerüst mit CI-Gates (#15)

**Datum:** 2026-11-01 · **Issue:** [#15](https://github.com/konstantinniedermann/tco-app/issues/15)
· **Status:** zur Freigabe

## Absicht

Das Fundament endet mit einem lauffähigen, fast leeren MyTCO, in dem **ab dem ersten Commit
jede Prüfung greift**, die die Konzepte verlangen. Später eingeführte Prüfungen finden einen
Berg Altlasten (Erfahrung aus früheren Projekten); hier gibt es noch keine. Der Projektleiter
schreibt keinen Code, alles entsteht mit Claude Code — Regeln für Agenten gelten deshalb erst
als umgesetzt, wenn ein Hook oder die CI sie erzwingt.

Massgebend und hier nicht wiederholt: [ADR-002](../../adr/adr-002-sveltekit-postgresql.md)
(Technik, Bauregel, Vorgaben für #15), [CI/CD und Release](../../ci-cd-und-release.md)
(Prüfungen, Abhängigkeiten, Versionen, Actions-Minuten), [Testkonzept](../../testkonzept.md),
[Sicherheitskonzept](../../sicherheitskonzept.md) (SI-NN), [Datenschutz](../../datenschutz.md) (DS-NN).

## Ziele

1. Gerüst baut lokal und in der CI; je Testebene ein echter, grüner Test.
2. Jede Prüfung aus der Tabelle *Prüfungen in der CI* in `docs/ci-cd-und-release.md` läuft —
   lokal über `make check`, in der CI identisch.
3. Abhängigkeitsschutz deckt npm vollständig ab, auch `npx`/`npm create`/`npm exec`.
4. Das Verbot «Doku zuerst» fällt aus `CLAUDE.md`, ersetzt durch zwei Dauerregeln.
5. Doku nachgeführt: Context-Scopes, README, Status der Prüfungen, Versionen.

## Nicht-Ziele

- Keine Fachfunktion, kein Datenmodell für Mitglieder, Konten oder Turniere (→ #29 ff.).
- Kein Login, keine Sitzungen, keine Codes (SI-01 bis SI-09 → #29).
- Kein pg-boss (erst #29 braucht Hintergrundjobs). Kein Server, keine Auslieferung, kein
  Tag-Job (→ #32). Kein Capacitor.
- Kein Erscheinungsbild: UI-Leitbild ist #13 (offen). Die Startseite bleibt schlicht.

## Anti-Ziele (wäre ein Fehlschlag, auch wenn alles grün ist)

- Eine Prüfung, die nur auf dem Papier steht oder sich ohne Spur abschalten lässt.
- Wegwerf-Code, den #29 oder #32 wieder ausbauen müssen.
- Ein Paket ausserhalb der freigegebenen Liste, oder ein Paket, das über `npx` an
  `package.json` vorbei läuft.
- Echte Personendaten irgendwo, auch nicht in Beispielen (Dauerverbot `CLAUDE.md`).
- Die Bauregel aus ADR-002 schon im Gerüst gebrochen (Server-Loader, Form Actions).

## Entscheidungen des Projektleiters (01.11.2026)

| Thema | Entscheid |
|-------|-----------|
| Inhalt | **Status + Version:** Startseite mit Version in der Fusszeile; Schnittstelle `/api/status`, die die Datenbank prüft und Version und Mindestversion meldet; Fachlogik «ist eine App-Version noch verträglich mit der Mindestversion» |
| Hooks | **Vor jedem Commit** die schnellen Prüfungen (Secret-Scan, Doku-Check, Lint, Format, `svelte-check`, Fachlogik-Tests). **Vor jedem Push** das volle `make check`, ausser der Push berührt nur Doku (gleiche Regel wie die CI). Der bestehende Schutz von `main` im pre-push bleibt |
| ID-Prüfung | FR- und RR-Tabellen erhalten eine Spalte **Status** (`geplant` · `umgesetzt`, wie bei den Anforderungen). Die CI verlangt einen Test für jede FR/RR mit `umgesetzt` und jede A-ID mit `umgesetzt`. Heute sind alle `geplant` |
| dep-guard | Hook im gemeinsamen Setup erweitern: auch `npx`, `npm create`, `npm exec`, `npm init <paket>`, `pnpm dlx`, `pnpm create`, `yarn dlx`, `yarn create`, `bunx`. Mit Tests. Gerüst von Hand schreiben, nicht mit `sv create` |
| Pakete | Liste unten freigegeben |
| Svelte-MCP | Offizieller Online-Dienst `https://mcp.svelte.dev/mcp` als HTTP-Server in `.mcp.json` im Repo (Herkunft: Svelte-Team, Repo `sveltejs/ai-tools`, verlinkt auf svelte.dev/docs/ai; am 01.11.2026 erreichbar geprüft) |
| CLAUDE.md | Abschnitt «Doku zuerst — Dauerverbot dieser Phase» entfällt; neu zwei Dauerregeln: (1) vor Svelte-Code die aktuelle Doku über den Svelte-MCP holen, (2) Bauregel ADR-002 in einem Satz mit Verweis |
| Version | `package.json` auf `0.1.0`; in `docs/versionen.md` als «Code-Gerüst, nicht ausgeliefert». Release `dev` → `main` wie bisher bei Doku, ohne Checkliste und ohne Tag. Den ersten Tag setzt die CI mit #32 |

## Freigegebene Pakete

Versionen laut npm-Registry am 01.11.2026; der Builder nimmt die dann aktuelle Version
derselben Hauptversion.

| Zweck | Pakete | Laufzeit |
|-------|--------|----------|
| Kern | `@sveltejs/kit` 3, `svelte` 5, `@sveltejs/adapter-node` 6 | ja |
| Datenbank | `drizzle-orm` 0.45, `pg` 8 | ja |
| Bauen | `vite` 8, `@sveltejs/vite-plugin-svelte` 7, `typescript`, `@sveltejs/adapter-static` 4, `drizzle-kit` 0.31, `@types/pg` | nein |
| Prüfen | `svelte-check` 4, `eslint` 10, `@eslint/js`, `typescript-eslint` 8, `eslint-plugin-svelte` 3, `eslint-config-prettier`, `globals`, `prettier` 3, `prettier-plugin-svelte` | nein |
| Testen | `vitest` 5, `@vitest/coverage-v8` 5, `@playwright/test` 1, `@axe-core/playwright` 4 | nein |

- `pg` statt `postgres` (postgres.js): pg-boss setzt `pg` voraus, so bleibt es ein Treiber.
- **Entscheid Claude:** `typescript` 7 (neuer Compiler) nur, wenn `svelte-check` und
  `typescript-eslint` ihn unterstützen; sonst die letzte 6er-Version, fest in `package.json`.
- Fehlt beim Bauen ein weiteres Paket, wird es einzeln zur Freigabe vorgelegt, nicht
  installiert.

## Was entsteht

### App

- **Startseite** (`src/routes/+page.svelte`): Name «MyTCO», ein Satz, Fusszeile mit der
  Version aus `package.json`. Kein Styling über das Nötige hinaus (UI-Leitbild #13 offen).
- **`/api/status`** (`src/routes/api/status/+server.ts`): `GET` antwortet
  `{ status, version, mindestversion }`; `status` ist `ok`, wenn eine einfache Abfrage an
  PostgreSQL gelingt, sonst HTTP 503 mit `status: "fehler"` und **ohne** Fehlerdetails in der
  Antwort (SI-05, keine Interna nach aussen). #32 nutzt sie als Statusabfrage nach der
  Auslieferung; dort reicht eine Antwort innert einer Minute.
- **Fachlogik** (`src/lib/server/…`): reine Funktion, die prüft, ob eine App-Version mit der
  Mindestversion des Servers verträglich ist (Schema `Haupt.Neben.Korrektur`, siehe
  *Alte Versionen auf dem Handy* in `docs/ci-cd-und-release.md`). Erhält ihre Werte übergeben,
  kein Zugriff auf Datenbank oder Oberfläche (Vorgabe Testkonzept). Die Oberfläche nutzt sie
  im Gerüst noch nicht; das Neuladen bei zu alter Version ist nicht Teil von #15.
- **Datenbank:** Drizzle mit `pg`, Verbindung aus `DATABASE_URL`. `drizzle-kit` erzeugt
  Migrationen (nur Entwicklung). **Entscheid Claude:** Ausgeführt werden sie mit dem
  Migrator, der in `drizzle-orm` steckt, als eigener Befehl im Image (z. B.
  `node build/migrate.js`), nicht beim App-Start — das Auslieferungs-Skript in #32 macht
  «Sicherung, dann Migrationen, dann Neustart» als getrennte Schritte. Das Image enthält
  dafür den Migrationsordner. Eine erste Migration braucht es nur, wenn die Werkzeuge ohne
  sie nicht laufen.
- **SvelteKit-Konfiguration:** Runes-Modus im Compiler fest eingeschaltet (ADR-002).
  Content-Security-Policy über SvelteKit nur mit `'self'`, keine fremden Quellen (SI-10, DS-03).
  Zusätzliche Header für alle Antworten: HSTS, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: same-origin`, `frame-ancestors 'none'` in der CSP. Die Herkunftsprüfung für
  ändernde Anfragen (SI-10) kommt mit der ersten ändernden Schnittstelle in #29.
- **Zwei Builds:** normal mit `adapter-node` (Server und Oberfläche, fürs Docker-Image) und
  als reine Web-App mit `adapter-static` und Fallback-Seite (Nachweis Bauregel, später
  Capacitor). Umschalten über eine Umgebungsvariable beim Build.
  **Entscheid Claude:** Die Oberfläche läuft auch im normalen Build ohne serverseitiges
  Rendern (`ssr = false`), damit beide Builds dasselbe Verhalten zeigen; Suchmaschinen spielen
  für eine Mitglieder-App keine Rolle.

### Testebenen (je ein Test)

| Ebene | Test | ID im Namen |
|-------|------|-------------|
| Fachlogik (Vitest) | Versionsvergleich: gleich, neuer, älter in Haupt-/Neben-/Korrekturversion, ungültige Eingabe | keine FR — die Regel stammt aus dem CI/CD-Konzept; Name beschreibend |
| Schnittstelle (Vitest + echte PostgreSQL) | `/api/status` mit erreichbarer DB → 200 und Version; mit nicht erreichbarer DB → 503 ohne Details | — |
| Ende-zu-Ende (Playwright + axe) | Startseite lädt, Fusszeile zeigt die Version, axe ohne Verstösse; Screenshot; in den drei Umgebungen des Testkonzepts (WebKit Handy, Chromium Handy, Chromium Desktop) | — |

Abdeckung ≥ 90 % gemessen über `src/lib/server/` (Fachlogik und künftig Rechte), nicht über
die Oberfläche (Testkonzept).

### Prüfungen in `make check` und CI

Alle Zeilen der Tabelle *Prüfungen in der CI* in `docs/ci-cd-und-release.md`, danach dort
«Stand» auf «vorhanden». Zusätzlich zu den schon bekannten:

- **Bauregel:** Skript schlägt an bei `*.server.ts` unter `src/routes` ausser `+server.ts`,
  bei `export const actions` und bei Remote Functions; dazu der SPA-Build.
- **ID-Prüfung:** liest FR/RR aus `docs/fachmodell.md` und `docs/rollen-und-rechte.md`
  (Status `umgesetzt`) und A-IDs aus `docs/anforderungen/anforderungen.md` (Status
  `umgesetzt`) und verlangt je mindestens einen Testnamen mit dieser ID. A-IDs, die laut
  Testkonzept nur von Hand prüfbar sind, gelten über ihren Eintrag in der Checkliste.
- **Testdaten:** in Testdateien und Seed-Daten jede Mail-Adresse ausser `@example.org` melden.
- **Malware:** `osv-scanner` (Binary, Prüfsumme fest im Workflow, wie in Munica und beim
  gitleaks-Schritt hier) auf `package-lock.json`, dann `scripts/ci/osv_malware_gate.py` aus
  Munica (nur Standardbibliothek). Bricht nur bei `MAL-`-Einträgen ab; Herkunft im Kopf des
  Skripts vermerken.
- **Docker-Image** baut (mehrstufig, Node-Basis-Image per Digest gepinnt, nur
  Laufzeit-Abhängigkeiten im Image).

**Installieren** immer `npm ci --ignore-scripts`; `svelte-kit sync` und
`playwright install` als eigene Schritte (CI/CD-Konzept). **Lokale Datenbank:** PostgreSQL
als Container über `docker compose` (`make db` o. ä.); `make check` startet sie bei Bedarf.
Die Hauptversion von PostgreSQL wird gepinnt, Dependabot hält sie aktuell.

### CI-Aufbau

- Bestehende Workflows `check.yml` und `secret-scan.yml` bleiben Grundlage; Rechte nur `read`.
- Jobs so geschnitten, dass reine Doku-Änderungen weder Ende-zu-Ende-Tests noch den
  Docker-Bau auslösen (Actions-Minuten, CI/CD-Konzept).
- PostgreSQL als Service-Container im Testjob.
- Playwright-Screenshots als Artefakt, 30 Tage Aufbewahrung.
- Alle Actions per SHA gepinnt (wie heute).
- **Dependabot** zusätzlich für `npm` und `docker`, Ziel `dev`, gleiche Labels wie heute;
  Hauptversionen einzeln (Gruppierung nur für Neben- und Korrekturversionen).
- **Messen:** Dauer der Läufe beim ersten Merge nach `dev` in `docs/ci-cd-und-release.md`
  (*Actions-Minuten*) als belegten Wert nachtragen.
- Der Weg nach `dev` bleibt wie im Skill `tco-branching`: lokaler Merge, Push auf `dev`, die
  CI läuft auf diesem Push. Kein zusätzlicher PR nach `dev` (würde die CI doppelt laufen
  lassen und die Messung verfälschen).

### Hooks

- `.githooks/pre-commit`: heute Secret-Scan + Doku-Check; neu dazu Lint, Format-Prüfung,
  `svelte-check`, Fachlogik-Tests (ohne Datenbank) — nur, wenn der Commit Dateien ausserhalb
  der Doku enthält. Ziel: wenige Sekunden.
- `.githooks/pre-push`: heute Schutz von `main`; neu dazu das volle `make check`, wenn die zu
  pushenden Commits Dateien ausserhalb der Doku berühren. **Doku** heisst dieselbe Pfadregel
  wie in der CI (eine Stelle, z. B. ein Skript, das Hook und Workflow beide nutzen).
- Fehlen bei einem Code-Push `node_modules` oder Docker, bricht der Hook mit klarer Meldung
  ab (wie heute bei fehlendem gitleaks), statt still zu überspringen.
- **Parallele Worktrees:** Alle teilen sich einen lokalen PostgreSQL-Container. Jeder
  Testlauf legt sich eine eigene, zufällig benannte Datenbank an und löscht sie danach, damit
  zwei gleichzeitige `make check` sich nicht stören. Playwright-Browser liegen ohnehin im
  gemeinsamen Cache; `npm ci` läuft pro Worktree (der Hauptordner braucht es für Merges von
  Code nach `dev`). Der Skill `tco-branching` nennt `npm ci` als Schritt beim Anlegen eines
  Worktrees, in dem Code geändert wird.
- `make hooks` bleibt der Weg zum Aktivieren; `core.hooksPath` gilt für alle Worktrees.

### Was nicht unbemerkt abgeschaltet werden darf

**Entscheid Claude** (im Rahmen der freigegebenen Pakete, ohne Zusatz-Plugin):

| Umgehung | Abwehr |
|----------|--------|
| `.only` in Tests | Vitest und Playwright brechen in der CI ab (`allowOnly`/`forbidOnly`) |
| `test.skip`, `describe.skip` | Prüfskript meldet sie; erlaubt nur mit Kommentar `skip: <Grund>` in derselben Zeile |
| `eslint-disable`, `@ts-ignore`, `@ts-nocheck` | ESLint meldet unbenutzte Ausnahmen; `@ts-ignore`/`@ts-nocheck` verboten (`@ts-expect-error` mit Begründung erlaubt, Regel aus `typescript-eslint`) |
| Ausnahmen von der Abdeckung | Abdeckungsgrenze 90 % bleibt; einzelne Ausschlüsse sieht das Review |
| `git commit/push --no-verify` | Lässt sich lokal nicht verhindern; die CI auf `dev` fängt es nach dem Push. Restrisiko, im Review (`cas-reviewer`) sichtbar |
| Umgebungsvariablen zum Überspringen | Keine einbauen; `make check` kennt keine Abkürzung |

### dep-guard (gemeinsames Setup, ausserhalb des Repos)

`~/.claude/hooks/dep_guard.py` erkennt zusätzlich die Ausführ-Befehle (Liste oben) und
**blockt dort jedes Paket, das nicht im `package.json` des Projekts steht** — strenger als
bei `npm install`, weil `npx` ein Paket ohne Eintrag und ohne Lock-Datei ausführt. Gilt in
allen CAS-Projekten (gemeinsames Setup, vom Projektleiter so gewählt).

**Entscheid Claude:**
- Ein Befehlsname zählt nur, wenn er als Paketname im `package.json` steht oder als
  installiertes Programm unter `node_modules/.bin/` existiert. Beispiel: `npx svelte-kit` ist
  erlaubt, wenn `node_modules/.bin/svelte-kit` existiert; vor `npm ci` wird es geblockt, weil
  npx sonst das fremde npm-Paket `svelte-kit` holen würde.
- Im Repo selbst (Makefile, Hooks, CI) laufen Werkzeuge über `npm run …` oder
  `npm exec --no -- …` (`--no` verbietet das Nachladen), nicht über nacktes `npx`.
- `npm install <paket>` behält die bisherigen Prüfungen. Die Freigabe eines neuen Pakets
  zeigt sich im Diff von `package.json`; `cas-reviewer` prüft sie gegen diese Liste.
- Tests in `~/.claude/hooks/test_dep_guard.py`, vor der Änderung geschrieben.
`~/.claude` ist kein Git-Repo; die Änderung steht im Bericht, und
`docs/ci-cd-und-release.md` (*Abhängigkeiten*) vermerkt die Lücke als geschlossen.

### Weitere Dateien

- `.env.example` mit `DATABASE_URL` (Platzhalter, kein Passwort aus echtem Betrieb).
- `.gitignore`: Build-Ausgaben, `node_modules`, Testberichte, `.svelte-kit`.
- `.nvmrc` bzw. `engines` mit derselben Node-Hauptversion wie das Docker-Image (aktuelle LTS).
- `.mcp.json` mit dem Svelte-MCP.
- `Makefile`: `make help` listet alle neuen Ziele (mindestens `check`, `dev`, `db`, `test`,
  `e2e`, `build`).

### Doku nachführen

- `CLAUDE.md`: Verbot raus, zwei Dauerregeln rein (Wortlaut im Rahmen der Aufnahmeregel,
  ohne Daten oder Issue-Historie).
- `docs/fachmodell.md`, `docs/rollen-und-rechte.md`: Spalte *Status*, alle `geplant`; die
  Legende wie in den Anforderungen.
- `docs/testkonzept.md`: Abschnitt *Anforderung → Testfall* — die Ausnahme regelt der Status
  (statt «legt #15 fest»); *Werkzeuge*: installiert.
- `docs/ci-cd-und-release.md`: Spalte «Stand» → «vorhanden»; dep-guard-Lücke geschlossen;
  gemessene Minuten.
- `docs/context-scopes.md`: Zeilen für App-Code, Server-Fachlogik, Tests, Datenbank/Migrationen.
- `README.md`: wie man lokal startet und prüft (über `make help`).
- `.claude/skills/tco-branching/SKILL.md`: `npm ci` beim Anlegen eines Worktrees mit Code.
- `docs/versionen.md`: Eintrag 0.1.0 «Code-Gerüst, nicht ausgeliefert».
- `docs/roadmap.md`: Code-Gerüst als erledigt kennzeichnen, sofern die Roadmap Stände führt.

## Reihenfolge (Vorschlag)

1. dep-guard erweitern (vor dem ersten `npm install`, sonst ist die Lücke beim Bau offen).
2. Gerüst und Pakete, Startseite, `/api/status`, Fachlogik — testgetrieben.
3. Prüfskripte, `make check`, Hooks.
4. CI und Dependabot; erster Lauf auf dem PR nach `dev`, Minuten messen.
5. Doku nachführen; als letzter Commit `CLAUDE.md` (Verbot raus).

## Dem Builder überlassen

Ordnerstruktur innerhalb von `src/lib/server/` und `tests/`, Namen der Make-Ziele über die
genannten hinaus, Schnitt der CI-Jobs, Form der Prüfskripte (Shell oder Node ohne Pakete),
Konfiguration von ESLint und Prettier im Rahmen der freigegebenen Pakete, PostgreSQL- und
Node-Hauptversion (aktuell stabil bzw. LTS).

## Nachweis (Fertig heisst nachgewiesen)

- `make check` lokal grün, Ausgabe im Bericht.
- CI-Lauf auf dem Push nach `dev` grün, Link im Bericht.
- Screenshot der Startseite aus dem Playwright-Lauf (Handy und Desktop).
- Ein absichtlich falscher Commit (z. B. Datei `+page.server.ts`, Mailadresse ausserhalb
  `@example.org`, Formatfehler) wird vom Hook bzw. `make check` abgewiesen — je einmal
  vorgeführt, danach verworfen.
- dep-guard: Tests grün; `npx <unbekanntes-paket>` wird blockiert.
- ADR-002 Trigger 1: im Bericht festhalten, ob Claude Code beim Gerüst wiederholt Code
  geschrieben hat, den Build oder `svelte-check` ablehnten.
