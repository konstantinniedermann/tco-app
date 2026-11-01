# Code-Gerüst mit CI-Gates — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lauffähiges, fast leeres MyTCO (Startseite mit Version, `/api/status`), in dem ab dem ersten Commit alle Prüfungen aus Konzepten und ADR-002 per Hook und CI greifen.

**Architecture:** Eine SvelteKit-Codebasis; Server nur über `+server.ts`, Fachlogik in `src/lib/server/`. PostgreSQL über Drizzle/`pg`, lokal und in der CI als Container. Alle Prüfungen sind Make-Ziele; Hooks und CI rufen nur Make-Ziele bzw. dieselben Skripte auf.

**Tech Stack:** SvelteKit 3, Svelte 5 (Runes), TypeScript, Vite 8, Drizzle 0.45 + `pg` 8, PostgreSQL 18, Vitest 5, Playwright 1 + axe, ESLint 10, Prettier 3, Node 26 (LTS), Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-01-code-geruest-design.md`

## Global Constraints

- Nur Pakete aus der Liste *Freigegebene Pakete* der Spec; jedes weitere: anhalten, Namen melden, nicht installieren.
- Installation nur `npm ci --ignore-scripts` (bzw. beim ersten Mal `npm install --ignore-scripts`); `svelte-kit sync` und `playwright install` als eigene Schritte.
- Im Repo (Makefile, Hooks, CI) Werkzeuge nur über `npm run …` oder `npm exec --no -- …`, nie nacktes `npx`.
- Bauregel ADR-002: unter `src/routes` keine `*.server.ts`/`*.server.js` ausser `+server.ts`, kein `export const actions`, keine Remote Functions.
- Runes-Modus fest eingeschaltet (`compilerOptions.runes: true`).
- Keine Inhalte fremder Server; CSP nur `'self'` (SI-10, DS-03).
- Testdaten: nur `@example.org`, Telefon `+41 00 …`; keine echten Personendaten (CLAUDE.md).
- Fehlerantworten nach aussen ohne Interna (SI-05).
- `package.json` `"version": "0.1.0"`, `"private": true`, `"type": "module"`.
- Dateien einzeln stagen (nie `git add -A`/`.`); Commit-Präfixe `feat:`/`fix:`/`docs:`/`refactor:`/`test:`/`chore:` mit Attribution-Zeilen.
- Svelte-Code nur nach Abruf der aktuellen Doku über den Svelte-MCP (ab Task 2 eingebunden).
- Prettier-/ESLint-kompatibel schreiben (ab Task 2 erzwungen).

## Review Focus

1. **CSP bricht die App:** Die strenge CSP darf SvelteKits eigene Start-Skripte nicht blockieren → E2E-Test in Task 5 prüft: keine Konsolenfehler, keine CSP-Verletzung.
2. **Datenbank weg:** `/api/status` bei nicht erreichbarer DB → 503 mit genau `{status, version, mindestversion}`, kein Fehlertext, keine Verbindungsdaten → Test in Task 4.
3. **Zwei Worktrees prüfen gleichzeitig:** jeder Testlauf eigene Datenbank → Test in Task 4 (`current_database()` beginnt mit `mytco_test_`, Name pro Lauf verschieden).
4. **Doku oder Code?** Falsche Einordnung eines Pushes lässt das volle `make check` aus → Tests der Pfadregel in Task 7 (u. a. `.github/workflows/check.yml` und `scripts/x.sh` sind Code, `CLAUDE.md` und `docs/a/b.md` sind Doku, gemischt ist Code, leer ist Doku).
5. **Ungültige App-Version vom Client** (`"1.2"`, `"v1.2.3"`, `"1.2.3-beta"`, `""`) → `false`, kein Absturz → Test in Task 3.

---

### Task 1: dep-guard prüft auch Ausführ-Befehle

Ausserhalb des Repos, im gemeinsamen Setup. `~/.claude` ist kein Git-Repo: kein Commit, Änderung im Bericht nennen.

**Files:**
- Modify: `~/.claude/hooks/dep_guard.py`
- Test: `~/.claude/hooks/test_dep_guard.py`

**Interfaces:**
- Produces: `extract_runners(command: str) -> list[str]` (Paketnamen aus Ausführ-Befehlen); `runner_allowed(pkg: str, cwd: str) -> bool`; `evaluate()` blockt zusätzlich jeden Runner-Namen, für den `runner_allowed` falsch ist, mit Grund `"<name>: per npx/exec/create nur Pakete aus package.json oder node_modules/.bin"`.

- [ ] **Step 1: Failing tests schreiben**

```python
@pytest.mark.parametrize("cmd,pkgs", [
    ("npx cowsay hi", ["cowsay"]),
    ("npx -y create-vite@latest app", ["create-vite"]),
    ("npx --package=@scope/tool tool run", ["@scope/tool"]),
    ("npx -p foo bar", ["foo"]),
    ("npm exec -- svelte-kit sync", ["svelte-kit"]),
    ("npm exec --no -- svelte-kit sync", ["svelte-kit"]),
    ("npm create svelte@latest x", ["create-svelte"]),
    ("npm create @scope", ["@scope/create"]),
    ("npm create @scope/app", ["@scope/create-app"]),
    ("npm init vite", ["create-vite"]),
    ("npm init", []),
    ("npm init -y", []),
    ("pnpm dlx degit x", ["degit"]),
    ("pnpm create vite", ["create-vite"]),
    ("yarn dlx foo", ["foo"]),
    ("yarn create vite", ["create-vite"]),
    ("bunx foo", ["foo"]),
    ("git commit -m 'npx foo'", []),
    ("make check && npx evil", ["evil"]),
])
def test_extract_runners(cmd, pkgs):
    assert dg.extract_runners(cmd) == pkgs

def test_runner_allowed_dependency_key(tmp_path):
    (tmp_path / "package.json").write_text('{"devDependencies": {"@playwright/test": "1"}}')
    assert dg.runner_allowed("@playwright/test", str(tmp_path))

def test_runner_allowed_installed_bin(tmp_path):
    (tmp_path / "node_modules/.bin").mkdir(parents=True)
    (tmp_path / "node_modules/.bin/svelte-kit").write_text("")
    assert dg.runner_allowed("svelte-kit", str(tmp_path))

def test_runner_blocked_bin_name_only_in_lockfile(tmp_path):
    # Bin-Namen stehen in package-lock.json; ohne Installation holte npx das fremde Paket
    (tmp_path / "package-lock.json").write_text('{"bin": {"svelte-kit": "x.js"}}')
    assert not dg.runner_allowed("svelte-kit", str(tmp_path))

def test_runner_blocked_without_manifest(tmp_path):
    assert not dg.runner_allowed("cowsay", str(tmp_path))

def test_evaluate_blocks_unknown_runner_without_network(tmp_path):
    with patch.object(dg, "check_npm", side_effect=AssertionError("kein Netz")):
        assert any("cowsay" in p for p in dg.evaluate("npx cowsay", str(tmp_path)))

def test_evaluate_passes_installed_runner(tmp_path):
    (tmp_path / "package.json").write_text('{"dependencies": {"drizzle-kit": "0.31"}}')
    assert dg.evaluate("npx drizzle-kit generate", str(tmp_path)) == []
```

Dazu ein E2E-Test über `_run(...)`: Payload `npx cowsay` → Exit 2.

- [ ] **Step 2:** `cd ~/.claude/hooks && python3 -m pytest test_dep_guard.py -q` → neue Tests FAIL (`extract_runners` fehlt).
- [ ] **Step 3: Implementieren.** Erkennung am Kommandoanfang wie `_START`. `create`/`init <x>`: `x` → `create-x`; `@s` → `@s/create`; `@s/x` → `@s/create-x`; Versionssuffix mit `strip_spec` entfernen. Bei `npx`/`npm exec`: `-p`/`--package[=]` hat Vorrang vor dem ersten Positionsargument; nach `--` ist das erste Token der Name. `runner_allowed`: Name ist Schlüssel in `dependencies`/`devDependencies`/`optionalDependencies` des geparsten `package.json` in `cwd` **oder** `cwd/node_modules/.bin/<name>` existiert. Lock-Datei zählt hier bewusst nicht. Fehlermeldung in `main()` um einen Satz zu Runnern ergänzen.
- [ ] **Step 4:** Tests erneut → alle PASS (alte und neue).
- [ ] **Step 5:** Kein Commit (kein Repo). Ergebnis (Anzahl Tests) für den Bericht notieren.

---

### Task 2: Projektgerüst, Pakete, Lint und Format

**Files:**
- Create: `package.json`, `package-lock.json` (erzeugt), `.nvmrc`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.d.ts`, `src/lib/version.ts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.env.example`, `.mcp.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: npm-Skripte `build` (Node-Build), `build:spa` (setzt `MYTCO_SPA=1`), `check:svelte` (`svelte-kit sync && svelte-check --fail-on-warnings`), `lint` (`prettier --check . && eslint .`), `format` (`prettier --write .`); globale Konstante `__APP_VERSION__: string` (Vite `define` aus `package.json`), in `src/app.d.ts` deklariert; `src/lib/version.ts` exportiert `APP_VERSION: string`.

- [ ] **Step 1: `.mcp.json`** mit `{"mcpServers":{"svelte":{"type":"http","url":"https://mcp.svelte.dev/mcp"}}}`. Danach Svelte-Doku (Projekt-Setup, `svelte.config.js`, Adapter, CSP) über den MCP abrufen; ist er in der laufenden Session noch nicht verfügbar, `https://svelte.dev/llms.txt` per WebFetch.
- [ ] **Step 2: TypeScript-Verträglichkeit klären:** `npm view svelte-check peerDependencies` und `npm view typescript-eslint peerDependencies`. Deckt eine Bereichsangabe `typescript` 7 nicht ab → `typescript` auf letzte 6.x pinnen. Ergebnis im Commit-Text nennen.
- [ ] **Step 3: `package.json` von Hand** (Version 0.1.0, `engines.node` `>=26 <27`, alle freigegebenen Pakete mit `^` auf der aktuellen Version, Laufzeit-Pakete unter `dependencies`, Rest unter `devDependencies`), `.nvmrc` = `26`. Dann `npm install --ignore-scripts` (dep-guard lässt es durch, weil alles im Manifest steht).
- [ ] **Step 4: Konfiguration:** `svelte.config.js` mit `compilerOptions.runes: true`; Adapter `adapter-static({ fallback: 'index.html' })` wenn `process.env.MYTCO_SPA === '1'`, sonst `adapter-node()`; `kit.csp`: `mode: 'auto'`, Direktiven `default-src`, `script-src`, `style-src`, `img-src`, `font-src`, `connect-src`, `base-uri`, `form-action` je `['self']`, `object-src ['none']`, `frame-ancestors ['none']`. `vite.config.ts` mit `sveltekit()` und `define.__APP_VERSION__`. `eslint.config.js`: `@eslint/js` recommended, `typescript-eslint` recommended (inkl. `@typescript-eslint/ban-ts-comment` Standard: `ts-ignore`/`ts-nocheck` verboten, `ts-expect-error` nur mit Beschreibung), `eslint-plugin-svelte` recommended, `eslint-config-prettier`, `linterOptions.reportUnusedDisableDirectives: 'error'`. `.prettierrc` mit `prettier-plugin-svelte`; `.prettierignore` schliesst `docs/`, `*.md`, Lock-Datei, Build-Ausgaben aus (Doku prüft `check-docs.sh`). `.gitignore` ergänzt: `node_modules/`, `.svelte-kit/`, `build/`, `coverage/`, `test-results/`, `playwright-report/`. `.env.example`: `DATABASE_URL=postgres://mytco:mytco_lokal@localhost:55432/mytco` mit Kommentar «nur lokal».
- [ ] **Step 5: Minimales `src/app.html`**, `src/lib/version.ts`, leere `src/routes/+page.svelte` (ein `<h1>MyTCO</h1>`).
- [ ] **Step 6: Prüfen:** `npm run check:svelte` → 0 Fehler, 0 Warnungen; `npm run lint` → ok; `npm run build` und `npm run build:spa` → beide erfolgreich, `build/index.html` beim SPA-Build vorhanden.
- [ ] **Step 7: Gegenprobe Runes:** In `+page.svelte` vorübergehend `export let x;` → `check:svelte` oder Build FAIL. Zurücknehmen.
- [ ] **Step 8: Commit** `chore: SvelteKit-Gerüst mit freigegebenen Paketen, Lint und Format (#15)` — Dateien einzeln.

---

### Task 3: Fachlogik Versionsvergleich

**Files:**
- Create: `src/lib/server/version.ts`, `src/lib/server/version.test.ts`, `vitest.config.ts`
- Modify: `package.json` (Skripte)

**Interfaces:**
- Consumes: `APP_VERSION` (Task 2).
- Produces: `MINDESTVERSION: string` (= `'0.1.0'`); `istVersionVertraeglich(appVersion: string, mindestversion: string): boolean`. Vitest-Projekte `einheit` (`src/**/*.test.ts` ohne `*.db.test.ts`, `scripts/**/*.test.ts`) und `datenbank` (`src/**/*.db.test.ts`, kommt in Task 4). npm-Skripte `test:einheit` (`vitest run --project einheit`), `test` (`vitest run --coverage`). Abdeckung: `include: ['src/lib/server/**']`, Schwellen 90 für lines/branches/functions/statements; `allowOnly: false`.

- [ ] **Step 1: Failing test**

```ts
describe('istVersionVertraeglich', () => {
  test.each([
    ['0.1.0', '0.1.0', true],
    ['0.2.0', '0.1.0', true],
    ['1.0.0', '0.9.9', true],
    ['0.1.1', '0.1.0', true],
    ['0.0.9', '0.1.0', false],
    ['0.1.0', '0.1.1', false],
    ['0.9.0', '1.0.0', false],
    ['0.10.0', '0.9.0', true], // numerisch, nicht als Text
  ])('App %s gegen Mindestversion %s → %s', (app, min, erwartet) => {
    expect(istVersionVertraeglich(app, min)).toBe(erwartet);
  });
  test.each(['1.2', 'v1.2.3', '1.2.3-beta', '', '01.2.3', '1.2.3.4'])(
    'ungültige App-Version %j gilt als nicht verträglich', (app) => {
      expect(istVersionVertraeglich(app, '0.1.0')).toBe(false);
    });
  test('ungültige Mindestversion ist ein Konfigurationsfehler', () => {
    expect(() => istVersionVertraeglich('0.1.0', 'x')).toThrow();
  });
  test('MINDESTVERSION ist gültig und nicht neuer als die App', () => {
    expect(istVersionVertraeglich(APP_VERSION, MINDESTVERSION)).toBe(true);
  });
});
```

- [ ] **Step 2:** `npm run test:einheit` → FAIL (Modul fehlt).
- [ ] **Step 3: Implementieren.** Gültig nur `^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$`; Vergleich je Teil numerisch.
- [ ] **Step 4:** `npm run test:einheit` → PASS; `npx vitest run --project einheit --coverage` meldet für `src/lib/server/version.ts` 100 %.
- [ ] **Step 5: Commit** `feat: Versionsvergleich gegen Mindestversion (#15)`.

---

### Task 4: Datenbank, Migrationen und `/api/status`

**Files:**
- Create: `docker-compose.yml`, `drizzle.config.ts`, `src/lib/server/db/index.ts`, `src/lib/server/db/schema.ts`, `src/lib/server/status.ts`, `src/routes/api/status/+server.ts`, `src/routes/api/status/status.db.test.ts`, `tests/setup/datenbank-global.ts`, `tests/setup/datenbank-worker.ts`, `scripts/migrate.ts`, ggf. `drizzle/` (erste Migration, nur falls nötig)
- Modify: `vitest.config.ts`, `package.json`

**Interfaces:**
- Consumes: `APP_VERSION`, `MINDESTVERSION` (Tasks 2, 3).
- Produces: `erstelleDb(url: string): Db` und `holeDb(): Db` (lazy, `DATABASE_URL` aus `$env/dynamic/private`); `type StatusAntwort = { status: 'ok' | 'fehler'; version: string; mindestversion: string }`; `ermittleStatus(db: Db): Promise<StatusAntwort>` (`select 1`; jede Ausnahme → `'fehler'`, nichts loggen ausser «Datenbank nicht erreichbar» ohne Details); `GET` in `+server.ts`: `json(antwort, { status: antwort.status === 'ok' ? 200 : 503, headers: { 'cache-control': 'no-store' } })`. `scripts/migrate.ts` (läuft mit `node scripts/migrate.ts`, nur abtrennbare TS-Syntax): `migrate()` aus `drizzle-orm/node-postgres/migrator` mit Ordner `drizzle`, beendet Pool. npm-Skripte `db:migrate`, `db:generate` (`drizzle-kit generate`), `test:db` (`vitest run --project datenbank`).
- Lokale DB: `docker-compose.yml` Dienst `db`, `postgres:18-alpine`, Port `55432:5432`, Benutzer/DB `mytco`, Passwort `mytco_lokal`, Healthcheck `pg_isready`.

- [ ] **Step 1: Failing tests** (`status.db.test.ts`)

```ts
test('Testlauf nutzt eine eigene Datenbank', async () => {
  const { rows } = await roh('select current_database() as name');
  expect(rows[0].name).toMatch(/^mytco_test_[0-9a-f]{8}$/);
});
test('GET /api/status mit erreichbarer Datenbank → 200', async () => {
  const res = await GET({} as never);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: 'ok', version: APP_VERSION, mindestversion: MINDESTVERSION });
});
test('Datenbank nicht erreichbar → fehler ohne Details', async () => {
  const tot = erstelleDb('postgres://mytco:x@127.0.0.1:1/keine');
  const antwort = await ermittleStatus(tot);
  expect(antwort).toEqual({ status: 'fehler', version: APP_VERSION, mindestversion: MINDESTVERSION });
});
test('Migrationen laufen auf leerer Datenbank durch', async () => { /* migrate() gegen Test-DB, wirft nicht */ });
```

(`roh` = Hilfsfunktion im Test über `pg.Client` mit `process.env.DATABASE_URL`.)
- [ ] **Step 2:** `docker compose up -d --wait db`, dann `npm run test:db` → FAIL.
- [ ] **Step 3: Global-Setup:** verbindet mit `DATABASE_URL` (Standard aus `.env.example`), legt `mytco_test_<8 hex aus crypto.randomBytes>` an, gibt die URL per `provide('datenbankUrl', …)` weiter, löscht die DB im Teardown (`DROP DATABASE … WITH (FORCE)`). Worker-Setup setzt `process.env.DATABASE_URL = inject('datenbankUrl')`.
- [ ] **Step 4: Implementieren** gemäss Interfaces. Ohne erste Migration testen; scheitert der Migrator an fehlendem Journal → leere Startmigration mit `db:generate` erzeugen.
- [ ] **Step 5:** `npm run test:db` → PASS; zweimal parallel in zwei Terminals starten → beide PASS. `npm test` → Abdeckung ≥ 90 % für `src/lib/server/**`.
- [ ] **Step 6: Commit** `feat: Datenbank, Migrationen und /api/status (#15)`.

---

### Task 5: Startseite und Ende-zu-Ende-Test

**Files:**
- Create: `src/routes/+layout.ts`, `src/routes/+layout.svelte`, `src/hooks.server.ts`, `playwright.config.ts`, `tests/e2e/startseite.test.ts`
- Modify: `src/routes/+page.svelte`, `package.json`

**Interfaces:**
- Consumes: `APP_VERSION` (Task 2), `GET /api/status` (Task 4).
- Produces: `+layout.ts` mit `export const ssr = false; export const prerender = false;`; Fusszeile mit Text `Version ${APP_VERSION}` und `data-testid="version"`. `hooks.server.ts` `handle` setzt für jede Antwort `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`. npm-Skript `e2e` (`playwright test`), `e2e:browser` (`playwright install --with-deps chromium webkit` — in der CI; lokal ohne `--with-deps`).
- Playwright: Projekte `iphone` (`devices['iPhone 15']`, WebKit), `android` (`devices['Pixel 7']`), `desktop` (`devices['Desktop Chrome']`); `forbidOnly: !!process.env.CI`; `webServer`: `npm run build && node build` mit `PORT=4173` und `DATABASE_URL` aus der Umgebung; `use.screenshot: 'on'`; Ausgabe `test-results/`.

- [ ] **Step 1: Failing test**

```ts
test('Startseite zeigt die Version, ohne Barrierefreiheits-Verstösse und ohne Konsolenfehler', async ({ page }, info) => {
  const fehler: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto('/');
  await expect(page.getByTestId('version')).toHaveText(`Version ${pkg.version}`);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
  expect(fehler).toEqual([]); // fängt u. a. CSP-Verletzungen
  await page.screenshot({ path: info.outputPath('startseite.png'), fullPage: true });
});
test('Sicherheits-Header auf der Startseite', async ({ request }) => {
  const res = await request.get('/');
  expect(res.headers()['content-security-policy']).toContain("default-src 'self'");
  expect(res.headers()['strict-transport-security']).toContain('max-age=31536000');
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
});
```

- [ ] **Step 2:** `npm run e2e` → FAIL.
- [ ] **Step 3: Implementieren** (Svelte-Doku über MCP zu Layout, `ssr`, CSP-Modus). Schlichtes Markup, `lang="de-CH"` in `app.html`, eine Überschrift, ein Satz, Fusszeile. Liefert SvelteKit bei `ssr = false` keinen CSP-Header für die Shell, setzt `hooks.server.ts` ihn nicht selbst — stattdessen anhalten und melden (Abweichung von SI-10 ist eine Entscheidung des Projektleiters).
- [ ] **Step 4:** `npm run e2e` → 6 Tests PASS (2 × 3 Projekte); Screenshots unter `test-results/`.
- [ ] **Step 5:** `npm run build:spa` weiterhin erfolgreich.
- [ ] **Step 6: Commit** `feat: Startseite mit Version und Ende-zu-Ende-Test in drei Umgebungen (#15)`.

---

### Task 6: Status-Spalte für Fachregeln und Grundsätze

**Files:**
- Modify: `docs/fachmodell.md` (Tabelle FR), `docs/rollen-und-rechte.md` (Tabelle RR), `docs/testkonzept.md` (*Anforderung → Testfall*, *Werkzeuge*)

**Interfaces:**
- Produces: Jede Zeile `| FR-NN | … |` und `| RR-NN | … |` hat als **letzte** Spalte `Status` mit `geplant` (heute alle). Legende über der Tabelle: «**Status:** `geplant` · `umgesetzt` (mit Test, siehe Testkonzept)».

- [ ] **Step 1:** Spalte ergänzen, Kopf- und Trennzeile anpassen.
- [ ] **Step 2:** Testkonzept: Satz «wie, legt das Code-Gerüst (#15) fest» ersetzen durch «Massgebend ist die Spalte *Status*: Die CI verlangt einen Test nur für `umgesetzt`.»; *Werkzeuge*: «installiert mit dem Code-Gerüst».
- [ ] **Step 3:** `make check` → Doku-Check ok.
- [ ] **Step 4: Commit** `docs: Status-Spalte für Fachregeln und Grundsätze (#15)`.

---

### Task 7: Prüfskripte

Alle als TypeScript, ausgeführt mit `node` (abtrennbare Syntax, keine Pakete), getestet mit Vitest im Projekt `einheit`.

**Files:**
- Create: `scripts/pruefungen/nur-doku.ts`, `scripts/pruefungen/bauregel.ts`, `scripts/pruefungen/test-ids.ts`, `scripts/pruefungen/testdaten.ts`, `scripts/pruefungen/skip.ts`, je mit `*.test.ts`; `scripts/ci/osv_malware_gate.py` (Kopie aus `~/CAS/projekte/munica/scripts/ci/osv_malware_gate.py`, Kopfzeile «Übernommen aus Munica, unverändert» + Datum)
- Modify: `package.json` (Skript `pruefungen`)

**Interfaces:**
- Produces (je reine Funktion + CLI, Exit 1 mit Liste bei Befund):
  - `istNurDoku(pfade: string[]): boolean` — Doku = Endung `.md` oder unter `docs/`; leere Liste → `true`. CLI: liest Pfade von stdin, Exit 0 = nur Doku, 1 = Code.
  - `pruefeBauregel(dateien: Map<string, string>): string[]` (Pfad → Inhalt) — meldet `src/routes/**/*.server.{ts,js}` ausser `+server.*`, `export const actions`, `*.remote.{ts,js}`, `remoteFunctions` in `svelte.config.js`.
  - `faelligeIds(dokus: { fachmodell: string; rollen: string; anforderungen: string; testkonzept: string }): string[]` — FR/RR/A-IDs mit Status `umgesetzt` (Stern `*` ignorieren); A-IDs, die in der *Checkliste vor dem Release* des Testkonzepts stehen, gelten als abgedeckt. `fehlendeTests(ids: string[], testquellen: string[]): string[]` — ID gilt nur mit Wortgrenze (`FR-1` ≠ `FR-10`).
  - `pruefeTestdaten(dateien: Map<string, string>): string[]` — jede Mailadresse mit anderer Domain als `example.org`, in `**/*.test.ts`, `tests/**`, `**/seed*`.
  - `pruefeSkip(dateien: Map<string, string>): string[]` — `.skip(`/`.fixme(` ohne `skip:` im Kommentar derselben Zeile.
  - npm-Skript `pruefungen` ruft die vier CLIs (ohne `nur-doku`) nacheinander.

- [ ] **Step 1: Failing tests** je Funktion, mindestens:

```ts
expect(istNurDoku(['docs/a/b.md', 'CLAUDE.md', 'README.md'])).toBe(true);
expect(istNurDoku(['docs/a.md', 'scripts/x.sh'])).toBe(false);
expect(istNurDoku(['.github/workflows/check.yml'])).toBe(false);
expect(istNurDoku([])).toBe(true);
expect(pruefeBauregel(new Map([['src/routes/+page.server.ts', '']]))).toHaveLength(1);
expect(pruefeBauregel(new Map([['src/routes/api/x/+server.ts', '']]))).toEqual([]);
expect(pruefeBauregel(new Map([['src/routes/+page.ts', 'export const actions = {}']]))).toHaveLength(1);
expect(fehlendeTests(['FR-1'], ["test('FR-10: x')"])).toEqual(['FR-1']);
expect(fehlendeTests(['FR-10'], ["test('FR-10: x')"])).toEqual([]);
expect(faelligeIds({ fachmodell: '| FR-01 | x | A-1 | umgesetzt |\n| FR-02 | y | A-2 | geplant |', rollen: '', anforderungen: '| A-LOGIN-01 | x | q | e | umgesetzt\\* |', testkonzept: '## Checkliste vor dem Release\n- [ ] Brief (A-LOGIN-01)' })).toEqual(['FR-01']);
expect(pruefeTestdaten(new Map([['tests/a.test.ts', 'anna@example.org bob@gmail.com']]))).toEqual(['tests/a.test.ts: bob@gmail.com']);
expect(pruefeSkip(new Map([['a.test.ts', "test.skip('x')"]]))).toHaveLength(1);
expect(pruefeSkip(new Map([['a.test.ts', "test.skip('x') // skip: wartet auf K-27"]]))).toEqual([]);
```

- [ ] **Step 2:** `npm run test:einheit` → FAIL.
- [ ] **Step 3: Implementieren.** CLIs lesen Dateien über `git ls-files` (nur versionierte Dateien).
- [ ] **Step 4:** `npm run test:einheit` → PASS; `npm run pruefungen` auf dem Repo → Exit 0 (heute keine ID fällig).
- [ ] **Step 5: Commit** `feat: Prüfskripte für Bauregel, Test-IDs, Testdaten und Skip (#15)`.

---

### Task 8: Makefile und Git-Hooks

**Files:**
- Modify: `Makefile`, `.githooks/pre-commit`, `.githooks/pre-push`

**Interfaces:**
- Consumes: npm-Skripte aus Tasks 2–7, `scripts/pruefungen/nur-doku.ts`.
- Produces: Make-Ziele (alle mit `## `-Hilfe): `help`, `check` (= CI, Reihenfolge: `docs`, `voraussetzungen`, `lint`, `check:svelte`, `pruefungen`, `db`, `test` mit Abdeckung, `build`, `build:spa`, `e2e`, `image`), `check-schnell` (`docs`, `voraussetzungen`, `lint`, `check:svelte`, `pruefungen`, `test:einheit`), `docs` (`bash scripts/check-docs.sh`), `db` (`docker compose up -d --wait db`), `dev`, `test`, `e2e`, `build`, `image` (`docker build -t mytco:lokal .`, ab Task 9), `secrets`, `hooks`. `voraussetzungen` bricht mit klarer Meldung ab, wenn `node_modules` fehlt («`npm ci --ignore-scripts` ausführen») oder Docker nicht läuft.

- [ ] **Step 1:** Makefile erweitern; OSV-Prüfung bleibt wie der Secret-Scan CI-seitig (`osv-scanner` ist lokal nicht installiert; keine neue Abhängigkeit) — in `make help` und Doku so benennen.
- [ ] **Step 2:** `pre-commit`: gitleaks + `check-docs.sh` wie heute; dann `git diff --cached --name-only | node scripts/pruefungen/nur-doku.ts` → bei Exit 1 `make check-schnell`.
- [ ] **Step 3:** `pre-push`: `main`-Schutz unverändert; je Ref Bereich `remote_sha..local_sha` (neuer Branch: `$(git merge-base origin/dev local_sha)..local_sha`; Löschung überspringen), geänderte Pfade an `nur-doku.ts` → bei Code `make check`.
- [ ] **Step 4: Gegenproben** (je danach zurücknehmen, nicht committen): Datei `src/routes/+page.server.ts` stagen → Commit abgewiesen; `tests/x.test.ts` mit `bob@gmail.com` → abgewiesen; Formatfehler in `src/lib/version.ts` → abgewiesen; reiner Doku-Commit → nur Doku-Check läuft. Ausgaben für den Bericht festhalten.
- [ ] **Step 5:** `make check` → grün (ohne `image`, das in Task 9 kommt).
- [ ] **Step 6: Commit** `chore: make check und Git-Hooks für Code (#15)`.

---

### Task 9: Docker-Image

**Files:**
- Create: `Dockerfile`, `.dockerignore`

**Interfaces:**
- Consumes: `npm run build`, `scripts/migrate.ts`, `drizzle/`.
- Produces: Mehrstufiges Image: Stufe *bau* (`npm ci --ignore-scripts`, `svelte-kit sync`, `npm run build`), Stufe *laufzeit* (`npm ci --omit=dev --ignore-scripts`, kopiert `build/`, `drizzle/`, `scripts/migrate.ts`, `package.json`); Basis `node:26-alpine@sha256:<digest>` (Digest per `docker buildx imagetools inspect node:26-alpine` ermitteln) in beiden Stufen; läuft als Benutzer `node`; `ENV NODE_ENV=production PORT=3000`; `CMD ["node", "build"]`; Migration: `docker run … node scripts/migrate.ts`.

- [ ] **Step 1:** Dockerfile, `.dockerignore` (`node_modules`, `.svelte-kit`, `build`, `.git`, `docs`, `tests`, `test-results`, `.env*` ausser `.env.example`, `intern`).
- [ ] **Step 2:** `make image` → baut. Container gegen lokale DB starten (`--network host` oder `host.docker.internal`): `node scripts/migrate.ts` → Exit 0; App starten, `curl -s localhost:3000/api/status` → `{"status":"ok",…}`; `docker run --rm mytco:lokal ls node_modules` enthält kein `vitest`/`eslint`.
- [ ] **Step 3:** `make check` inkl. `image` → grün.
- [ ] **Step 4: Commit** `chore: Docker-Image mit getrenntem Migrationsbefehl (#15)`.

---

### Task 10: CI und Dependabot

**Files:**
- Modify: `.github/workflows/check.yml`, `.github/dependabot.yml`

**Interfaces:**
- Consumes: Make-Ziele (Task 8), `nur-doku.ts`, `osv_malware_gate.py`.
- Produces: Workflow `Check` mit Jobs: `doku` (immer: `make docs`), `aenderung` (ermittelt mit `git diff --name-only <basis> HEAD | node scripts/pruefungen/nur-doku.ts` den Output `code=true|false`; Basis: PR → `base.sha`, Push → `github.event.before`, bei Null-SHA → `true`), bei `code=true`: `pruefen` (Node per `actions/setup-node` mit `.nvmrc`, `npm ci --ignore-scripts`, `lint`, `check:svelte`, `pruefungen`, `test` mit Service `postgres:18-alpine`, `build`, `build:spa`), `e2e` (Service-DB, Browser installieren, `e2e`, `actions/upload-artifact` `test-results/` mit `retention-days: 30`), `malware` (osv-scanner-Binary mit fester SHA-256 wie Munica, auf `package-lock.json`, dann Gate-Skript), `image` (`docker build`). Alle Jobs `permissions: contents: read`, `timeout-minutes` gesetzt, `persist-credentials: false`. Neue Actions per SHA pinnen (SHA mit `gh api repos/<owner>/<repo>/git/ref/tags/<tag>` ermitteln, Tag als Kommentar). `CI=true` ist gesetzt (`forbidOnly`, `allowOnly`).
- Dependabot zusätzlich: `npm` (`/`), `docker` (`/`), `docker-compose` (`/`); `target-branch: dev`, gleiche Labels/Präfix wie bestehend; `groups` nur für `update-types: [minor, patch]`.

- [ ] **Step 1:** Workflows schreiben. Einen Workflow-Linter gibt es lokal nicht (kein neues Werkzeug); die Syntax belegt der erste Lauf auf `dev` (Task 12), Fehler dort im Branch beheben.
- [ ] **Step 2:** Branch pushen (`git push -u origin chore/issue-015`; löst keine CI aus) — CI läuft erst beim Push auf `dev` (Task 12).
- [ ] **Step 3: Commit** `chore: CI-Jobs für Code und Dependabot für npm und Docker (#15)`.

---

### Task 11: Doku nachführen und Verbot aufheben

**Files:**
- Modify: `docs/ci-cd-und-release.md`, `docs/context-scopes.md`, `README.md`, `docs/versionen.md`, `docs/roadmap.md`, `.claude/skills/tco-branching/SKILL.md`, `CLAUDE.md`

- [ ] **Step 1:** `ci-cd-und-release.md`: Spalte «Stand» → «vorhanden» für alle mit #15; OSV und Secret-Scan als «nur CI»; *Abhängigkeiten*: dep-guard prüft auch `npx`/`npm create`/`exec`, nur Pakete aus `package.json` oder installiert. `context-scopes.md`: Zeilen «App-Oberfläche» (`src/routes/`, `src/lib/`), «Server-Fachlogik und Schnittstellen» (`src/lib/server/`, `src/routes/api/`, `docs/fachmodell.md`, `docs/rollen-und-rechte.md`), «Datenbank und Migrationen» (`src/lib/server/db/`, `drizzle/`, `drizzle.config.ts`, `scripts/migrate.ts`), «Tests» um `tests/`, `**/*.test.ts`, `vitest.config.ts`, `playwright.config.ts` ergänzen, «CI» um `scripts/pruefungen/`, `scripts/ci/`, `Dockerfile`. `README.md`: Abschnitt «Lokal starten» (`npm ci --ignore-scripts`, `make db`, `make dev`, `make check`; Verweis auf `make help`). `versionen.md`: Abschnitt `0.1.0 — Code-Gerüst, nicht ausgeliefert` mit Stichpunkten. `roadmap.md`: Code-Gerüst als erledigt, falls die Roadmap Stände führt. `tco-branching`: in Schritt 1 Hinweis «Wer Code ändert: `npm ci --ignore-scripts` im neuen Worktree».
- [ ] **Step 2:** `make check` → grün. Commit `docs: Doku auf das Code-Gerüst nachgeführt (#15)`.
- [ ] **Step 3: `CLAUDE.md`** — Abschnitt «Doku zuerst — Dauerverbot dieser Phase» ersetzen durch:

```markdown
## Code — Dauerregeln

- Vor Svelte- oder SvelteKit-Code die aktuelle Doku über den Svelte-MCP-Server holen
  (`.mcp.json`); nie aus dem Gedächtnis.
- Server-Code nur in API-Endpunkten (`+server.ts`) und `src/lib/server/`; keine Form Actions,
  keine Server-Loader, keine Remote Functions (Bauregel → ADR-002).
```

- [ ] **Step 4:** `make check` → grün. Commit `docs: Verbot «Doku zuerst» durch Code-Regeln ersetzt (#15)` — letzter Commit des Branches.

---

### Task 12: Nachweis, Review, Merge

- [ ] **Step 1:** `make check` vollständig → grün, Ausgabe sichern.
- [ ] **Step 2:** Review: superpowers-Code-Review und Agent `cas-reviewer`; Befunde klären (Trivial-Fixes im Branch, Rest nach `docs/beobachtungen.md`).
- [ ] **Step 3:** Merge nach `dev` nach Skill `tco-branching` Schritt 4 (Hauptordner: vorher `npm ci --ignore-scripts`, da der pre-push-Hook dort für Code `make check` ausführt). CI-Lauf auf `dev` abwarten → alle Jobs grün; Link und Dauer je Job notieren.
- [ ] **Step 4:** Gemessene Minuten in `docs/ci-cd-und-release.md` (*Actions-Minuten*) als belegt eintragen, Commit `docs: gemessene CI-Dauer (#15)` im Worktree, erneut nach `dev`.
- [ ] **Step 5:** Bericht an den Projektleiter: Nachweise (Screenshot aus dem Artefakt, Gegenproben aus Task 8, dep-guard-Tests aus Task 1), ADR-002-Trigger 1 (gab es wiederholt abgelehnten Svelte-Code?), DoD-Abgleich #15. Release `dev` → `main` und Schliessen des Issues erst nach seiner Freigabe.
