# Test-Umgebung vorbereiten und Absicherungen (#39 ohne Server) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die erste Auslieferung auf Test ergibt eine benutzbare Demo, Test schickt nie eine Mail an jemand anderen als `MAIL_NUR_AN`, und vier Absicherungen aus der Beobachtungs-Auswertung sind gebaut und belegt.

**Architecture:** App-seitig drei kleine reine Bausteine (IP-Schlüssel, Mail-Umleitung, Einstellungsprüfung) plus ein Skript `scripts/testdaten.ts`, das im Laufzeit-Image läuft. Betriebsseitig Änderungen an den Bash-Skripten unter `betrieb/bin/`, belegt mit neuen Prüfungen in `betrieb/nachweis/nachweis.sh` (Docker Desktop).

**Tech Stack:** SvelteKit/Node 26 (TypeScript mit Type-Stripping, Imports mit `.ts`-Endung), drizzle-orm, nodemailer, Vitest (Projekte `einheit` und `datenbank`), Bash, Docker Compose, restic, PostgreSQL 18.

**Spec:** `docs/superpowers/specs/2026-11-03-test-ohne-server-design.md`

## Global Constraints

- Keine neue Abhängigkeit (auch keine transitive direkt nutzen, z. B. kein esbuild).
- Testdaten nur erfunden, alle Adressen `@example.org` (DS-08, Prüfung `scripts/pruefungen/testdaten.ts`).
- Fehlertexte nennen nur den Namen einer Variablen, nie ihren Wert (SI-05).
- Kein Wert aus der Datenbank, kein Code und keine Mitglieder-Adresse erreicht `protokoll.log` (DS-06).
- Betreff-Vorsatz der Umleitung exakt: `[Test für <ursprünglicher Empfänger>] ` (mit Leerzeichen danach).
- Betriebsskripte geben nur `schritt: <a-z -…>`, `ok` oder `fehler` aus (Nachweis-Helfer `erwarte_ausgabe`).
- Nichts darf auf Live wirken, solange `MAIL_NUR_AN` dort leer ist.
- Commits: Präfixe `feat:`/`fix:`/`docs:`/`test:`/`refactor:`, Dateien einzeln stagen, Abschluss mit den Attribution-Zeilen der Session.
- Vor jedem Commit greifen die Hooks (gitleaks, Doku-Check, Prüfungen); `make check` braucht Docker Desktop.
- Im Worktree einmal `npm ci --ignore-scripts` vor dem ersten Test.

## Review Focus

- `MAIL_NUR_AN` mit Leerzeichen oder in Anführungszeichen (`MAIL_NUR_AN=''`, `MAIL_NUR_AN=" "`) in `live/geheim.env` → muss als leer gelten (sonst blockiert Live grundlos) und `MAIL_NUR_AN=x@y` mit Anführungszeichen als gesetzt. Test in Task 5.
- IPv6 in Kurzschreibweise mit weniger als vier Gruppen vor `::` (`2001:db8::1`) und IPv4-mapped (`::ffff:192.0.2.1`) → gleicher Schlüssel wie die Langform bzw. die IPv4. Test in Task 1.
- `wiederherstellen` ohne Lauf-Angabe nach der neuen Sicherung → spielt den vorher neuesten Lauf ein, nicht den eben gesicherten. Nachweis in Task 6.
- `testdaten.ts` zweimal hintereinander (z. B. von Hand) → zweiter Lauf bricht ab, weil Mitglieder da sind; nichts doppelt. Test in Task 4.
- `MYTCO_SMTP_URL` mit Grossbuchstaben im Schema oder `requireTLS=false` → in Produktion abgewiesen. Test in Task 2.

---

### Task 1: Bremsen pro IPv6-Anschluss

**Files:**
- Create: `src/lib/server/login/ip-schluessel.ts`, `src/lib/server/login/ip-schluessel.test.ts`
- Modify: `src/lib/server/login/dienst.ts` (alle Stellen, an denen `ip` an `bremsen.*ProIp` geht: `loginMitBriefCode`, `fordereMailCodeAn`, `loginMitMailCode`)
- Modify: `docs/ci-cd-und-release.md` (Absatz «Schnittstelle zu #32»: Zusammenfassung ist gebaut, in der App), `docs/sicherheitskonzept.md` (SI-02/SI-04 bzw. Tabelle «Bremse»: «pro IP; IPv6 pro /64-Netz»)

**Interfaces:**
- Produces: `ipSchluessel(ip: string): string`

- [ ] **Step 1: Failing tests** in `ip-schluessel.test.ts`:
  - `'192.0.2.1'` → `'192.0.2.1'`
  - `'::ffff:192.0.2.1'` → `'192.0.2.1'`
  - `'2001:db8:1:2:3:4:5:6'` und `'2001:0db8:0001:0002:ffff::1'` → beide `'2001:db8:1:2::/64'`
  - `'2001:db8::1'` → `'2001:db8:0:0::/64'`
  - `'fe80::1%eth0'` → `'fe80:0:0:0::/64'`
  - `'2001:DB8::1'` → gleich wie `'2001:db8::1'`
  - Nicht als IP lesbar (`'kein-ip'`, `''`) → Eingabe unverändert zurück (Bremse zählt dann eben pro Zeichenkette).
  - In `dienst`-Tests (bestehende Datei der Bremsen-Nutzung, z. B. `brief.db.test.ts` oder ein neuer Einheitstest mit Fake-Bremsen): zwei Adressen desselben /64 teilen sich die Grenze von 10 Fehlversuchen.
- [ ] **Step 2:** `npx vitest run --project einheit src/lib/server/login/ip-schluessel.test.ts` → FAIL (Modul fehlt).
- [ ] **Step 3:** `ipSchluessel` implementieren: Zone (`%…`) abschneiden; `::ffff:a.b.c.d` → IPv4; IPv6 mit `node:net` `isIPv6` prüfen, `::` expandieren, erste vier Gruppen ohne führende Nullen, klein, `+ '::/64'`. In `dienst.ts` einmal am Anfang jeder der drei Funktionen `const schluessel = ipSchluessel(ip)` und nur diesen an die Bremsen geben.
- [ ] **Step 4:** `npx vitest run --project einheit` und `npm run test:db` → PASS.
- [ ] **Step 5:** Doku anpassen, Commit `feat: Bremsen zählen IPv6 pro /64-Netz`.

### Task 2: Einstellungen — `MAIL_NUR_AN` und TLS-Pflicht

**Files:**
- Modify: `src/lib/server/einstellungen.ts`, `src/lib/server/einstellungen.test.ts`
- Modify: `docs/ci-cd-und-release.md` (Tabelle der Einstellungen: Zeile `MAIL_NUR_AN`; Satz zu TLS mit der Ausnahme), `betrieb/geheim.env.example` (Kommentar `MYTCO_SMTP_URL`: Form `smtps://…` oder `smtp://…?requireTLS=true`)

**Interfaces:**
- Produces: `Einstellungen.mailNurAn: string | undefined`; `leseEinstellungen` wirft bei Verstössen.

- [ ] **Step 1: Failing tests** in `einstellungen.test.ts`:
  - ohne `MAIL_NUR_AN` bzw. `''` → `mailNurAn` ist `undefined`
  - `MAIL_NUR_AN: 'pl@example.org'` → `mailNurAn === 'pl@example.org'`
  - `MAIL_NUR_AN: 'keine adresse'` → wirft `'MAIL_NUR_AN ist keine Mail-Adresse'`
  - `NODE_ENV: 'production'` mit `smtp://mail.example.org:587` → wirft `'MYTCO_SMTP_URL ohne TLS (smtps:// oder requireTLS=true)'`
  - production + `smtp://mail.example.org:587?requireTLS=false` → wirft dasselbe
  - production + `smtps://mail.example.org:465` → ok; + `smtp://mail.example.org:587?requireTLS=true` → ok; + `SMTPS://MAIL.EXAMPLE.ORG` → ok
  - production + `smtp://localhost:51025`, `smtp://127.0.0.1:25`, `smtp://[::1]:25`, `smtp://mail.invalid:25` → ok (Ausnahme)
  - ohne `NODE_ENV=production` + `smtp://mail.example.org:25` → ok (wie bisher)
- [ ] **Step 2:** `npx vitest run --project einheit src/lib/server/einstellungen.test.ts` → FAIL.
- [ ] **Step 3:** Umsetzen. Adress-Prüfung schlicht (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). TLS-Prüfung mit `new URL()`: Schema `smtps:` ok; `smtp:` nur mit `searchParams.get('requireTLS') === 'true'` (nodemailer wandelt Query-Werte `true` in Booleans, belegt in `nodemailer/dist/esm/shared/index.js` → `parseConnectionUrl`). Ausnahme nur für Hosts `localhost`, `127.0.0.1`, `[::1]` und Endung `.invalid` (RFC 2606: löst nie auf, auf Live kann so keine echte Mail unverschlüsselt gehen). Kommentar im Code mit dieser Begründung.
- [ ] **Step 4:** Tests PASS; `make rauchtest` (nutzt `smtp://mail.invalid:25`, `NODE_ENV=production` im Image) → healthy.
- [ ] **Step 5:** Doku, Commit `feat: Mail-Versand in Produktion nur mit TLS, MAIL_NUR_AN als Einstellung`.

### Task 3: Mail-Umleitung

**Files:**
- Modify: `src/lib/server/login/mail.ts`, `src/lib/server/login/mail.test.ts`, `src/lib/server/login/index.ts`
- Modify: `docs/ci-cd-und-release.md` (Tabelle *Umgebungen*, Zeile E-Mail → «alle Mails gehen an die Adresse des Projektleiters, der Betreff nennt den ursprünglichen Empfänger (hängt an K-11)»), `betrieb/geheim.env.example` (Kommentar `MAIL_NUR_AN` nennt den Betreff-Vorsatz), `betrieb/compose.umgebung.yml` (Kommentar «Mails gehen ausschliesslich an diese Adresse» → «werden an diese Adresse umgeleitet»)

**Interfaces:**
- Consumes: `Mailer` aus `dienst.ts`, `Einstellungen.mailNurAn` (Task 2)
- Produces: `leiteUm(mailer: Mailer, ziel: string | undefined): Mailer`

- [ ] **Step 1: Failing tests** in `mail.test.ts` (Fake-Mailer, der Aufrufe sammelt):
  - `leiteUm(m, undefined)` gibt `m` selbst zurück (`toBe`)
  - `leiteUm(m, 'pl@example.org')({ an: 'erika.beispiel@example.org', betreff: 'Dein Code für MyTCO', text: 'x' })` → `m` erhält `{ an: 'pl@example.org', betreff: '[Test für erika.beispiel@example.org] Dein Code für MyTCO', text: 'x' }`
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** `leiteUm` in `mail.ts`; in `index.ts` `mailer: leiteUm(erstelleSmtpMailer(…), einstellungen.mailNurAn)`.
- [ ] **Step 4:** `npx vitest run --project einheit` PASS; `make e2e` bleibt grün (E2E ohne `MAIL_NUR_AN`).
- [ ] **Step 5:** Doku, Commit `feat: MAIL_NUR_AN leitet alle Mails um, Empfänger im Betreff`.

### Task 4: Testdaten auf Test

**Files:**
- Create: `scripts/testdaten.ts`, `scripts/testdaten.test.ts`, `scripts/erfundene-mitglieder.ts`
- Modify: `scripts/seed-lokal.ts` (nutzt `scripts/erfundene-mitglieder.ts`)
- Modify: `Dockerfile` (Laufzeit-Stufe: `COPY src/lib/server ./src/lib/server` ohne Tests — z. B. `.dockerignore`-Zeile `**/*.test.ts` nur wenn sie den Bau nicht stört, sonst gezielte COPY-Zeilen —, `COPY scripts/testdaten.ts scripts/erfundene-mitglieder.ts ./scripts/`)
- Modify: `betrieb/nachweis/nachweis.sh` (neue Prüfung nach «1 test und live laufen mit D1»)
- Modify: `docs/testkonzept.md` (*Checkliste vor dem Release*, Einleitung: erfundene Mitglieder statt Konto mit der Adresse des Projektleiters, Codes über die Umleitung, Brief-Code kommt nach jeder Auslieferung per Mail), `docs/ci-cd-und-release.md` (Schritt «testdaten laden», Mail mit Brief-Code, Abbruchregeln), Context-Scopes-Zeile «Datenbank und Migrationen» um `scripts/testdaten.ts` ergänzen

**Interfaces:**
- Consumes: `leiteUm` (Task 3), `leseEinstellungen` (Task 2), `erstelleLoginDienst`, `formatiereBriefCode`, `erstelleSmtpMailer`
- Produces:
  - `scripts/erfundene-mitglieder.ts`: `ERFUNDENE_MITGLIEDER: readonly { vorname: string; nachname: string; email: string }[]` (mindestens Erika Beispiel und Kurt Erfunden wie heute, weitere frei, alle `@example.org`, Adresse `Erfundenweg 1, 4600 Olten`) und `legeErfundeneMitgliederAn(db: Db): Promise<number[]>` (Konto-IDs, mehrfach ausführbar wie heute in `seed-lokal.ts`)
  - `scripts/testdaten.ts`: `testdatenVerweigert(env: Record<string, string | undefined>, anzahlMitglieder: number): string | null` (Grund oder `null`) und `baueBriefCodeMail(code: string, gueltigBis: Date, adresse: string): { betreff: string; text: string }`

- [ ] **Step 1: Failing tests** in `scripts/testdaten.test.ts`:
  - `testdatenVerweigert({}, 0)` → `'MAIL_NUR_AN fehlt: testdaten laufen nur auf Test'`
  - `testdatenVerweigert({ MAIL_NUR_AN: 'pl@example.org' }, 3)` → `'Mitglieder schon vorhanden: testdaten laufen nur auf einer leeren Datenbank'`
  - `testdatenVerweigert({ MAIL_NUR_AN: 'pl@example.org' }, 0)` → `null`
  - `baueBriefCodeMail('ABCD-EFGH-…', datum, 'https://test.example.org')`: Betreff `'Brief-Code für die Test-Umgebung'`, Text enthält Code, Datum (Format wie im Brief), Adresse
  - `ERFUNDENE_MITGLIEDER` alle `@example.org`
- [ ] **Step 2:** `npx vitest run scripts/testdaten.test.ts` → FAIL.
- [ ] **Step 3:** Umsetzen. Ablauf von `testdaten.ts` (nur bei `import.meta.main`):
  1. `leseEinstellungen()`; Mitglieder zählen; `testdatenVerweigert` ≠ `null` → Grund auf stderr, `process.exitCode = 1`, nichts schreiben.
  2. `legeErfundeneMitgliederAn(db)`; Brief-Code für das erste Konto über `erstelleLoginDienst(...).stelleBriefCodeAus`.
  3. Mail an `'erika.beispiel@example.org'` über `leiteUm(erstelleSmtpMailer(…), einstellungen.mailNurAn)` mit `baueBriefCodeMail`; Adresse = `env.MYTCO_ADRESSE || env.ORIGIN || einstellungen.adresse`.
  4. Ausgabe nur `testdaten: <n> erfundene Mitglieder angelegt` und bei Erfolg `testdaten: Mail mit Brief-Code verschickt`; scheitert der Versand: `testdaten: Mail mit Brief-Code nicht versandt` und trotzdem Exit 0. Nie Code oder Adresse ausgeben.
  `seed-lokal.ts` auf `legeErfundeneMitgliederAn` umstellen (Verhalten unverändert, `seed-lokal.test.ts` grün).
- [ ] **Step 4:** Tests PASS; `make image` und dann `docker run --rm --entrypoint node mytco:lokal -e "import('./scripts/testdaten.ts')"` ohne Umgebung → bricht mit Einstellungsfehler ab (zeigt, dass Imports im Image auflösen; kein `ERR_MODULE_NOT_FOUND`).
- [ ] **Step 5: Nachweis-Prüfung** `p1_testdaten`: `"$BASIS/test/protokoll.log"` enthält `testdaten: 3 erfundene Mitglieder angelegt` (bzw. die gewählte Zahl) und `testdaten: Mail mit Brief-Code nicht versandt` (Nachweis hat `smtp://mail.invalid:25`); die Test-DB hat so viele Zeilen in `mitglied`; das Protokoll enthält kein `@example.org` ausser im Text dieser Zeilen (d. h. keine Adresse). Registrieren als `pruefung "1 testdaten auf test geladen, mail-versuch protokolliert" p1_testdaten`. `make betrieb-nachweis` → alle ok.
- [ ] **Step 6:** Doku, Commit `feat: Testdaten auf Test mit Brief-Code per umgeleiteter Mail`.

### Task 5: Live-Sperre bei gesetztem `MAIL_NUR_AN`

**Files:**
- Modify: `betrieb/bin/lib.sh` (neu `mail_umleitung_gesetzt <umgebung>`), `betrieb/bin/ausliefern`, `betrieb/bin/zurueck`
- Modify: `betrieb/nachweis/nachweis.sh`, `docs/ci-cd-und-release.md` (Schutz des Auslieferungswegs), `betrieb/README.md` (falls dort die Befehle beschrieben sind)
- Test: `tests/betrieb/lib.test.ts` (Vitest treibt `lib.sh` über `tests/betrieb/lib-treiber.sh`), `tests/betrieb/ausliefern.test.ts` (mit den Stubs unter `tests/betrieb/stubs`)

**Interfaces:**
- Produces: `mail_umleitung_gesetzt <umgebung>`: Exit 0, wenn in `$MYTCO_BASIS/<umgebung>/geheim.env` eine Zeile `MAIL_NUR_AN=` mit einem Wert steht, der nach Entfernen von Leerzeichen und umschliessenden `'`/`"` nicht leer ist; sonst Exit 1. Datei fehlt → Exit 1.

- [ ] **Step 1: Failing tests** in `tests/betrieb/lib.test.ts` und ein Fall in `ausliefern.test.ts` (live mit gesetztem Wert → `fehler`, kein Schritt nach `pruefen`): Werte `MAIL_NUR_AN=` / `MAIL_NUR_AN=''` / `MAIL_NUR_AN=" "` / keine Zeile → 1; `MAIL_NUR_AN=pl@example.org` / `MAIL_NUR_AN='pl@example.org'` → 0.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Funktion in `lib.sh`. In `ausliefern` direkt nach dem Nehmen der Sperre und vor «Live sichern»: `if [ "$UMGEBUNG" = live ] && mail_umleitung_gesetzt live; then scheitern "MAIL_NUR_AN ist auf Live gesetzt"; fi`. In `zurueck` vor dem Start des vorherigen Images dieselbe Prüfung (eigener `scheitern`-Text mit Präfix `zurueck:`).
- [ ] **Step 4: Nachweis** `p1_live_umleitung`: `MAIL_NUR_AN=nachweis@example.org` vorübergehend in `$BASIS/live/geheim.env` setzen, `erwarte_lauf fehler live "$D1"` und `gemeinsam zurueck live` → fehler; `zustand/aktuell` von Live unverändert, Live-Status ok; Meldung im Protokoll; danach Wert wieder leeren. Einordnen nach den Prüfungen von Abschnitt 1. `make betrieb-nachweis` → alle ok.
- [ ] **Step 5:** Doku, Commit `feat: Auslieferung und Rückfall auf Live verweigern gesetztes MAIL_NUR_AN`.

### Task 6: Zurückspielen sicher machen

**Files:**
- Modify: `betrieb/bin/sichern` (zweites Argument `ohne-aufraeumen` überspringt nur `forget … --prune`; jedes andere zweite Argument → fehler)
- Modify: `betrieb/bin/wiederherstellen` (Argumente, Sicherung vorher, `VERBOSITY=sqlstate`)
- Modify: `betrieb/bin/probe` (Fehlerausgabe von `pg_restore` nur als Zahl)
- Modify: `betrieb/bin/lib.sh` (neu `nur_fehlerzahl <präfix>`)
- Modify: `betrieb/nachweis/nachweis.sh`, `betrieb/README.md`, `docs/ci-cd-und-release.md` (Tabelle der Befehle: `wiederherstellen <umgebung> [lauf] [ohne-sicherung]`, `sichern <umgebung> [ohne-aufraeumen]`; Absatz «Protokolle auf dem Server»: keine Werte aus der Datenbank)

**Interfaces:**
- Produces:
  - `wiederherstellen <umgebung> [lauf] [ohne-sicherung]`: Argument genau `ohne-sicherung` setzt den Notschalter (an Position 2 oder 3); das übrige optionale Argument ist der Lauf; mehr Argumente oder unbekannte → fehler, bevor etwas passiert.
  - `nur_fehlerzahl <präfix>`: liest stdin, schreibt genau eine Zeile `<präfix>: <n> Fehlerzeilen von pg_restore (Inhalt verworfen)` wenn n > 0, sonst nichts; zählt Zeilen, die mit `pg_restore: error:` beginnen.

- [ ] **Step 0: Failing tests** in `tests/betrieb/sicherung.test.ts` (Stubs für docker/restic): Argument-Prüfung von `wiederherstellen` (ok: `live`, `live lauf-x`, `live ohne-sicherung`, `live lauf-x ohne-sicherung`, `live ohne-sicherung lauf-x`; fehler: `live etwas`, drei Zusatzargumente), Schrittfolge `snapshot suchen, sichern, app stoppen, einspielen, app starten` bzw. ohne `sichern` mit Notschalter, `sichern … ohne-aufraeumen` ruft kein `forget --prune`; in `lib.test.ts`: `nur_fehlerzahl` mit 0, 2 Fehlerzeilen und einer Zeile mit `DETAIL: Key (email)=(x@example.org)` → Ausgabe enthält `x@example.org` nie. Danach `npx vitest run tests/betrieb` → FAIL.
- [ ] **Step 1: Ablauf `wiederherstellen` festlegen:** `snapshot suchen` (Lauf bestimmen, wie heute zuerst) → Sperre → neuer Schritt `sichern` (ruft `"$(dirname …)/sichern" "$UMGEBUNG" ohne-aufraeumen`, Ausgabe ins Protokoll; scheitert → `scheitern "Sicherung vor dem Einspielen gescheitert"`; mit Notschalter stattdessen Protokollzeile `wiederherstellen: ohne Sicherung vorher (Notschalter)` und kein Schritt `sichern`) → `app stoppen` → `einspielen` mit `psql -X -q -v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate …` → `app starten`.
- [ ] **Step 2:** `probe`: `pg_restore … 2>&1 | nur_fehlerzahl probe >>"$LOG"` (pipefail erhält den Exit-Code von `pg_restore`; keine Zwischendatei).
- [ ] **Step 3: Nachweis**, neue Prüfungen in Abschnitt 5 (Reihenfolge so, dass bestehende Prüfungen gültig bleiben; `p5_fremder_lauf` erwartet weiterhin als einzigen Schritt `snapshot suchen`):
  - `p5_wiederherstellen` erweitern: Anzahl `abgelegte_laeufe` danach = vorher + 1; eingespielt wurde der vorher neueste Lauf (Zeile wieder da).
  - `p5_notschalter`: `gemeinsam wiederherstellen live ohne-sicherung` → ok, Laufzahl unverändert, Protokollzeile Notschalter da.
  - `p5_unbekanntes_argument`: `gemeinsam wiederherstellen live etwas` und `… live lauf-x ohne-sicherung zuviel` → fehler, App läuft weiter.
  - `p5_keine_werte`: erfundene Tabelle mit eindeutiger Spalte und Wert `geheim-nachweis-wert@example.org` in Live, sichern; dann in Live eine Dublette erzwingen, die das Einspielen scheitern lässt (z. B. Tabelle in einem Schema ausserhalb von `public`/`drizzle` vorher anlegen, in die der Dump schreibt — Weg wählt der Bauende); `wiederherstellen` → fehler und `probe` mit präpariertem Lauf → fehler; danach `grep -c geheim-nachweis-wert "$BASIS/live/protokoll.log"` = 0; Gegenprobe: das Protokoll enthält eine SQLSTATE-Zeile (z. B. `23505`) bzw. die Fehlerzahl-Zeile von `probe`. Live danach wieder sauber und Status ok.
  - `sichern ohne-aufraeumen` → ok ohne `forget`-Zeile im Protokoll dieses Laufs; `sichern live falsch` → fehler.
- [ ] **Step 4:** `make betrieb-nachweis` → alle ok (Zahl im Bericht nennen).
- [ ] **Step 5:** Doku, Commit `feat: wiederherstellen sichert vorher, Notschalter ohne-sicherung, Protokoll ohne Werte`.

### Task 7: Abschluss

**Files:**
- Modify: `docs/versionen.md` (*Unveröffentlicht*: ein Eintrag für #39, Teil ohne Server)
- Modify: `docs/beobachtungen.md` nur falls beim Bauen Befunde ausserhalb des Scopes auftauchten

- [ ] **Step 1:** `make check` → grün.
- [ ] **Step 2:** `make betrieb-nachweis` → alle ok.
- [ ] **Step 3:** Commit `docs: Versionen und Doku für #39 ohne Server`.
- [ ] **Step 4:** Issue #39: Kommentar mit den erledigten DoD-Teilen (Testdaten, `MAIL_NUR_AN` wirkt, Absicherungen 1–4 aus der Beobachtungs-Auswertung) und Belegen (Nachweis-Zahl, Tests); offen bleibt der Teil mit Server.
