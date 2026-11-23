# Checkliste vor dem Release automatisieren — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `make test-pruefung` prüft vor dem Release den echten Test-Server (Server-Teil im
Container, Browser-Teil mit Playwright), und die Checkliste ist neu geordnet in *automatisch (CI)*,
*Prüflauf Test* und Handrunden pro Gerät, mit Release-PR als Prüfprotokoll.

**Architecture:** Drei Teile. (1) `scripts/test-pruefung-server.ts` läuft im App-Container auf
Test (per `ssh … docker exec`), legt zwei Prüfkonten an, falls sie fehlen, und meldet die
Server-Punkte als feste Zeilen. (2) `scripts/test-pruefung.ts` läuft auf dem Mac: holt per SSH den
Zugangscookie, startet den Server-Teil, dann Playwright mit eigener Konfiguration gegen Test, und
druckt eine Tabelle. (3) Doku, PR-Vorlage und Skill.

**Tech Stack:** Node (TypeScript ohne Build, wie die übrigen `scripts/`), Drizzle, Vitest
(Datenbanktest auf eigener DB), Playwright (`channel: 'chrome'`), Make, SSH.

**Spec:** `docs/superpowers/specs/2026-11-23-release-checkliste-design.md`

## Global Constraints

- Keine neuen Abhängigkeiten; nur, was in `package.json` steht.
- Der Prüflauf läuft nie in `make check`, `make e2e`, Pre-Push-Hook oder CI.
- Geheimnisse (Wert von `MYTCO_TEST_PASSWORT_HASH`, Codes) nie in Ausgabe, Log, Bericht, Repo;
  an Playwright nur als Umgebungsvariable des Kindprozesses.
- Ausgaben nur feste Texte (Logs-Regel in `CLAUDE.md`, DS-06).
- Der Server-Teil verweigert sich ohne `MAIL_NUR_AN` (= nicht Test), wie `scripts/testdaten.ts`.
- Höchstens 3 Codes pro Lauf (Login Spieler, Login Admin, Bestätigung Verwaltung).
- Prüfkonten (erfunden, DS-08):
  `{ vorname: 'Paul', nachname: 'Prüflauf', email: 'paul.pruefung@example.org' }` (Spieler),
  `{ vorname: 'Pia', nachname: 'Prüflauf', email: 'pia.pruefung@example.org' }` (Rolle
  `mitglieder`). Erika, Kurt, Hanna und alle anderen Konten werden nie verändert.
- Kein Eintrag in `scripts/testdaten.ts`/`erfundene-mitglieder.ts`-Liste, kein höherer Zähler
  `betrieb/test-neu-aufsetzen`.
- Einstellungen lokal aus der Umgebung bzw. `.env` (gitignoriert): `MYTCO_TEST_URL`
  (z. B. `https://test.my.tcolten.ch`), `MYTCO_TEST_SSH` (z. B. `ubuntu@<Server>`),
  `MYTCO_TEST_SSH_SCHLUESSEL` (Vorgabe `~/.ssh/mytco-server`). In `.env.example` nur
  auskommentiert, ohne echte Adresse/IP.
- Commit-Präfixe `feat:`/`docs:`/`test:`; Dateien einzeln stagen.

## Review Focus

- SSH-Agent ohne Schlüssel (kein `ssh-add --apple-load-keychain`): Lauf bricht vor Playwright mit
  festem Text «SSH zu Test nicht möglich (ssh-add --apple-load-keychain?)» ab, Exit ≠ 0.
- Test zeigt ein älteres Image (Deploy noch nicht durch): Fusszeile-Punkt rot mit Text, der
  Nummer bzw. Commit nennt, nicht ein Playwright-Timeout ohne Aussage.
- Nach einem reinen Doku-Merge auf `dev` zeigt Test den Commit des letzten Code-Stands: gilt als
  ok, wenn zwischen ihm und `origin/dev` nur Doku liegt (`istNurDoku`).
- Code-Mail kommt verspätet oder der Mail-Fänger hat ältere Codes derselben Adresse: nur Mails
  nach Startzeit des Tests werten, neueste zuerst.
- Prüfkonten existieren schon (zweiter Lauf) oder Pia hat die Rolle schon: nichts doppelt, keine
  zweite Rollen-Änderung im Verlauf.

---

### Task 1: Testmuster für den Prüflauf

**Files:**
- Modify: `scripts/pruefungen/testmuster.ts`
- Modify: `vitest.config.ts` (falls nötig; liest EINHEIT/DATENBANK schon)
- Modify: `scripts/pruefungen/test-ids.ts` bzw. die Stelle, die `nichtAusgefuehrteTests` die Muster gibt
- Test: `scripts/pruefungen/test-ids.test.ts` (oder bestehender Test der Muster)

**Interfaces:**
- Produces: `export const TESTSERVER: Testmuster = { include: ['tests/test-server/**/*.test.ts'], exclude: [] }`;
  EINHEIT und DATENBANK bekommen `'tests/test-server/**'` in `exclude`.

- [ ] **Step 1:** Test: `nichtAusgefuehrteTests(['tests/test-server/fusszeile.test.ts'])` gibt `[]`;
  ein Pfad `tests/test-server/x.test.ts` passt nicht auf EINHEIT (z. B. über die bestehende
  Hilfsfunktion, die Muster prüft). Rot laufen lassen: `npx vitest run scripts/pruefungen/test-ids.test.ts`.
- [ ] **Step 2:** Muster ergänzen, Prüfung test-ids nimmt TESTSERVER als viertes Muster.
- [ ] **Step 3:** `npx vitest run scripts/pruefungen` grün.
- [ ] **Step 4:** Commit `test: eigenes Testmuster für den Prüflauf gegen Test`.

### Task 2: Server-Teil im Container

**Files:**
- Create: `scripts/test-pruefung-server.ts`
- Create: `scripts/test-pruefung-server.db.test.ts`
- Modify: `Dockerfile:27` (Datei ins Laufzeit-Image kopieren)

**Interfaces:**
- Consumes: `legeErfundeneMitgliederAn(db, liste)` aus `scripts/erfundene-mitglieder.ts`;
  `ladeRollen`, `setzeRollen` aus `src/lib/server/admin/rollen.ts` (Urheber `{ art: 'automatisch' }`);
  Tabellen `konto`, `icAbruf`, Rollen-Tabelle aus `src/lib/server/db/schema.ts`; `jahrInZuerich`.
- Produces:
  - `export const PRUEFKONTEN` (die zwei Einträge aus Global Constraints)
  - `export type Punkt = 'pruefkonten' | 'zeitgeber' | 'ic-abruf' | 'admin'`
  - `export type Befund = { punkt: Punkt; ok: boolean; text: string }` (text: fester Satz)
  - `export async function legePruefkontenAn(db: Db, jetzt: Date): Promise<void>` — idempotent;
    setzt `konto.briefCodeBenutztAm = jetzt` nur, wo null (Login ohne Brief); gibt Pia `mitglieder`
    nur, wenn sie fehlt.
  - `export async function pruefeServer(db: Db, env: Record<string, string|undefined>, jetzt: Date): Promise<Befund[]>`
    — `zeitgeber`: `env.ZEITGEBER !== 'aus'` und `env.IC_ABRUF === 'an'`; `ic-abruf`: Zeile in
    `ic_abruf` mit `saison = jahrInZuerich(jetzt)` und `versuchtAm` jünger als **26 h** (Nachtpause
    23–7 Uhr in `faellig.ts`; Claudes Entscheid gegenüber «24 h» der Spec); `admin`: mindestens
    ein Konto mit Rolle `mytco`.
  - `export function zeile(b: Befund): string` → `pruefung: <punkt> ok|rot <text>`
  - Ausführung (`import.meta.main`): verweigert ohne `MAIL_NUR_AN` mit
    `pruefung: verweigert (nur Test)` und Exit 1; sonst Prüfkonten, dann je Befund eine Zeile;
    DB-Fehler nur `pruefung: abgebrochen`.

- [ ] **Step 1:** DB-Test auf eigener DB (`legeEigeneDatenbankAn('pruefungserver')`, ohne Bindestrich):
  - `legePruefkontenAn` zweimal → genau 2 Mitglieder mit den Adressen, beide `briefCodeBenutztAm` gesetzt,
    Pia hat Rollen `['mitglieder']`, Rollen-Verlauf hat genau einen Eintrag für Pia.
  - `pruefeServer` mit `{ ZEITGEBER: undefined, IC_ABRUF: 'an' }`, Abruf vor 2 h, ein MyTCO-Admin
    → alle `ok: true`.
  - `ZEITGEBER: 'aus'` → `zeitgeber` rot; Abruf vor 27 h → `ic-abruf` rot; Abruf nur Vorjahr → rot;
    kein MyTCO-Admin → `admin` rot.
  - `zeile` enthält nie eine Adresse (Test mit Befunden aus obigem Lauf: kein `@`).
  Rot: `npx vitest run scripts/test-pruefung-server.db.test.ts` (braucht `make db`).
- [ ] **Step 2:** Implementieren; Dockerfile-Zeile 27 um `scripts/test-pruefung-server.ts` ergänzen.
- [ ] **Step 3:** Test grün; `npm run lint` grün.
- [ ] **Step 4:** Commit `feat: Server-Teil des Prüflaufs gegen Test mit eigenen Prüfkonten`.

### Task 3: Befehl `make test-pruefung`

**Files:**
- Create: `scripts/test-pruefung.ts`
- Create: `scripts/test-pruefung.test.ts`
- Modify: `Makefile` (Ziel `test-pruefung` mit `##`-Hilfe), `.env.example`

**Interfaces:**
- Consumes: Task 2 (`zeile`-Format), `istNurDoku` aus `scripts/pruefungen/nur-doku.ts`. Startet zur Laufzeit Playwright mit der Konfiguration aus Task 4.
- Produces:
  - `export function istCodeStandVon(commit: string, devHash: string, git?: (args: string[]) => string): boolean`
  - `export function leseEinstellungen(env): { url, ssh, schluessel } | { fehlt: string[] }`
  - `export function leseServerZeilen(ausgabe: string): Befund[]` (unbekannte Zeilen ignorieren,
    `verweigert`/`abgebrochen` → ein roter Befund)
  - `export function tabelle(befunde: Befund[]): string` (Punkt | ok/rot | Text)
  - Ablauf (`import.meta.main`): Einstellungen prüfen → `git fetch origin` → SSH: Cookie-Wert aus
    `/opt/mytco/proxy/proxy.env` (Zeile `MYTCO_TEST_PASSWORT_HASH=`, Anführungszeichen weg), nur
    in einer Variablen halten → SSH: `sudo docker exec -i -w /app mytco-test-app-1 node scripts/test-pruefung-server.ts`
    → Playwright als Kindprozess mit den Umgebungsvariablen aus Task 4 → Tabelle aus Server-Befunden
    und Playwright-Ergebnis (Reporter `json` in eine Datei unter `test-results/test-server/`) →
    Exit 1, wenn etwas rot ist. Ort der Screenshots am Schluss ausgeben.

- [ ] **Step 1:** Einheitstests: `leseEinstellungen({})` → `fehlt` mit beiden Namen;
  `leseServerZeilen('pruefung: zeitgeber rot …\nfremd\n')` → ein Befund rot;
  `leseServerZeilen('pruefung: verweigert (nur Test)')` → rot; `istCodeStandVon` mit falschem
  `git` (Attrappe): Vorfahre + nur Doku → true, nicht Vorfahre → false, Code dazwischen → false;
  `tabelle` enthält jeden Punkt einmal. Rot laufen lassen.
- [ ] **Step 2:** Implementieren, Makefile-Ziel, `.env.example` (auskommentiert).
- [ ] **Step 3:** `npx vitest run scripts/test-pruefung.test.ts` grün, `make check-schnell` grün.
- [ ] **Step 4:** Commit `feat: make test-pruefung prüft den Test-Server vor dem Release`.

### Task 4: Browser-Teil gegen Test

**Files:**
- Create: `playwright.test-server.config.ts`
- Create: `tests/test-server/hilfen/test-umgebung.ts`
- Create: `tests/test-server/pruefung.test.ts`

**Interfaces:**
- Consumes (Umgebung des Kindprozesses, gesetzt von Task 3): `MYTCO_TEST_URL`,
  `MYTCO_TEST_ZUGANG` (Cookie-Wert), `MYTCO_TEST_ERWARTET_VERSION`, `MYTCO_TEST_ERWARTET_DEV`
  (voller Hash von `origin/dev`). Fehlt eine → Konfiguration wirft
  `Prüflauf nur über make test-pruefung starten.`
- Produces in `test-umgebung.ts`:
  - `export async function holeTestMailCode(request: APIRequestContext, adresse: string, seit: Date): Promise<string>`
    — Suche `subject:"Test für <adresse>" subject:"Dein Code für"` unter `/_mail/api/v1/search`
    mit Cookie, nur Mails mit `Created >= seit`, neueste zuerst, 6-stelliger Code, Abbruch nach 30 s.
- Consumes: `istCodeStandVon` aus `scripts/test-pruefung.ts` (Task 3).

Konfiguration: `testDir: 'tests/test-server'`, `testMatch: '**/*.test.ts'`, ein Projekt
`{ ...devices['Pixel 7'], channel: 'chrome' }` (Handygrösse; `channel: 'chrome'` passt nicht zu
WebKit-Geräten), `baseURL` aus `MYTCO_TEST_URL`,
`storageState` bzw. `addCookies` für `mytco_test_zugang` (Domain aus der URL, `secure: true`),
`screenshot: 'on'`, `outputDir: 'test-results/test-server'`, `workers: 1`, kein `webServer`,
`retries: 0`, `serviceWorkers: 'block'`.

- [ ] **Step 1:** Tests schreiben (ohne Test-Server rot, weil Umgebung fehlt — das ist der rote Lauf):
  - `Prüflauf: Fusszeile zeigt die Nummer und den Code-Stand von dev` — `/login`, `getByTestId('version')`
    hat Text `Version <ERWARTET_VERSION> · <commit>`; `istCodeStandVon(commit, ERWARTET_DEV)` ist true;
    Fehlermeldungen nennen gefundene Nummer/Commit.
  - `Prüflauf A-HILFE-01: Hilfe ohne Login über die Fusszeile` — Link «Hilfe» in der Fusszeile,
    Überschrift Hilfe sichtbar, Abschnitt Kontakt sichtbar.
  - `Prüflauf A-LOGIN-10: Login mit Code per Mail` — als Paul: Code per E-Mail anfordern,
    `holeTestMailCode`, `Hoi Paul` sichtbar, Screenshot.
  - `Prüflauf SI-08: Verwaltung öffnet mit Code per Mail` — als Pia einloggen (Code 2), Verwaltung
    → «Verwaltung öffnen», Code 3, «Bestätigen», Seite Mitglieder sichtbar, Screenshot.
  Beschriftungen aus `tests/e2e/login.test.ts` und `tests/e2e/verwaltung.test.ts` übernehmen
  (Rolle und Beschriftung, keine CSS-Klassen, keine festen Wartezeiten).
- [ ] **Step 2:** `npx playwright test -c playwright.test-server.config.ts` ohne Umgebung → wirft die
  Meldung aus Interfaces.
- [ ] **Step 3:** Implementieren; `npm run lint` grün.
- [ ] **Step 4:** Commit `feat: Browser-Teil des Prüflaufs gegen Test`.

### Task 5: Checkliste, Ablauf, Vorlage

**Files:**
- Modify: `docs/testkonzept.md` (Abschnitt «Checkliste vor dem Release»)
- Modify: `docs/testgruppe.md` (Voraussetzungen vor Live)
- Modify: `docs/ci-cd-und-release.md` (Ablauf, Mermaid)
- Modify: `.claude/skills/tco-branching/SKILL.md` (Release-Schritte)
- Create: `.github/release-pr.md`
- Modify: `docs/versionen.md` («Unveröffentlicht»: «Werkzeug: `make test-pruefung` prüft vor dem
  Release den Test-Server; die Checkliste ist nach Gerät geordnet. An der App ändert sich nichts.»)
- Modify: `docs/context-scopes.md`, falls Release/Test dort eine Zeile hat

- [ ] **Step 1:** Für jeden Kandidaten «automatisch (CI)» die tragende Testdatei per `grep` auf die
  ID bzw. den Testnamen in `tests/e2e/` bzw. `src/**/*.db.test.ts` belegen; ohne Beleg bleibt der
  Punkt in der Handrunde.
- [ ] **Step 2:** Checkliste umbauen: *Automatisch (CI)* (Punkt → Testdatei), *Prüflauf Test*
  (`make test-pruefung`, Punkte aus Task 2/3), *Von Hand*: Grundrunde, iPhone-Runde, Android-Runde
  (in sich lesbar ohne Repo: Test-Adresse, Persona, Schritte, erwartetes Ergebnis; Passwort separat),
  PC-und-Papier-Runde, *Volle Runde* (wann fällig), *Saisonal*; Regel «ausgesetzt mit Grund,
  solange Live aus; vor Live nachholen». Alle IDs bleiben erhalten.
- [ ] **Step 3:** «Spam» und «Einrichtungsabend» nach `docs/testgruppe.md` (Voraussetzungen), dort
  auch die offene Entscheidung zur externen Prüfperson (Mail-Fänger mit allen Codes, echte
  IC-Namen auf Test; vor Zugang gegen `docs/datenschutz.md`).
- [ ] **Step 4:** `.github/release-pr.md`: Abschnitte Prüflauf (Tabelle), Automatisch (CI-Link),
  Handrunden als Kästchen mit Begründung der Auswahl, Doku-Abgleich.
- [ ] **Step 5:** `docs/ci-cd-und-release.md` und Skill: Abgleich → Test zeigt Nummer →
  `make test-pruefung` → PR als Entwurf mit Vorlage → Runden → abhaken → bereit → Merge.
- [ ] **Step 6:** `make docs` grün.
- [ ] **Step 7:** Commit `docs: Checkliste vor dem Release nach Prüfart und Gerät geordnet`.

### Task 6: Abschluss

- [ ] `make check` grün auf dem committeten Stand (im Hintergrund).
- [ ] Agent `merge-reviewer`, Befunde klären.
- [ ] Merge nach `dev` (Skill `tco-branching` Schritt 4), aufräumen.
- [ ] Nachweis nach der Auslieferung auf Test: `make test-pruefung` gegen Test (der Lauf legt die
  zwei Prüfkonten an), Tabelle und Screenshots dem Projektleiter zeigen. Rot → Fix-Branch.
