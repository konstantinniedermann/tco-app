# Rollen nur noch auf der Seite «Rollen» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der MyTCO-Admin vergibt und entzieht Rollen nur noch auf der Seite «Rollen»; die Seite eines Mitglieds zeigt sie nur noch an (#96).

**Architecture:** Zwei Einzel-Aktionen ersetzen die Schnittstelle mit der ganzen Rollenmenge:
Fachfunktionen `vergibRolle` / `entziehRolle` in `src/lib/server/admin/rollen.ts`, Schnittstellen
`postRolleVergeben` / `postRolleEntziehen` (Bereich `rollen`), Abruf-Funktionen in
`src/lib/verwaltung/zugang-api.ts`. Die Seite «Rollen» bekommt je Rolle «… vergeben» (Aktionsdialog
mit Spielersuche) und je Eintrag «Entziehen» (Aktionsdialog als Rückfrage).

**Tech Stack:** SvelteKit 2 / Svelte 5, Drizzle + PostgreSQL, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-rollen-seite-design.md`

## Global Constraints

- Vor Svelte-Code die Doku über den Svelte-MCP-Server holen; nach jedem Baustein `svelte-autofixer`.
- Route ruft genau eine Schnittstellen-Funktion; Rechte nur über `schreibt(…, 'rollen', …)` / `liest`.
- Fehlerwörter nur aus `src/lib/fehler.ts` (`letzter-mytco`, `nicht-gefunden`, `eingabe` …); keine neuen.
- Zeit über `jetzt(d)`, nie `new Date()` im Server.
- Kein `<style>` in Bausteinen; nur Tokens und Bausteine aus `docs/ui-leitbild.md`.
- Neue Aktion mit Rückfrage nur über `src/lib/verwaltung/Aktionsdialog.svelte`.
- Kein `fetch(…)` in Seiten; nur über Abruf-Module mit `holen`.
- Jede Verhaltensänderung beginnt mit einem roten Test. E2E nur über `make e2e` / `npm run e2e`, im Hintergrund.
- Mitgliederliste (`src/routes/verwaltung/mitglieder/+page.svelte`) nur in der Seiteninfo anfassen (#92 baut sie parallel um).
- Testdaten erfunden; Dateien einzeln stagen; Commits `feat:` / `test:` / `docs:` / `refactor:` mit `(#96)`.

## Review Focus

1. **Selbst-Entzug MyTCO-Admin:** Nach Erfolg landet der Admin nicht auf einer leeren/kaputten Seite «Rollen», sondern das Layout leitet ihn weg (`invalidateAll` → Umleitung). Abgedeckt in Task 4, E2E-Schritt mit gestellter 200-Antwort ist nicht nötig; geprüft wird die Rückfrage-Zeile.
2. **Doppelt vergeben / schon entzogen** (zwei Admins gleichzeitig): 200, kein zweiter Verlaufseintrag, keine Fehlermeldung. Abgedeckt in Task 1 (DB-Test).
3. **Rolle an ein Mitglied, das sie schon hat:** in der Suche gesperrt «hat die Rolle schon». Abgedeckt in Task 4 (E2E).
4. **Alte Route weg:** `POST /api/admin/mitglieder/[id]/rollen` antwortet nicht mehr (Routen-Test kennt sie nicht, Datei gelöscht). Abgedeckt in Task 2.
5. **Ansicht als …:** In der Ansicht weist der Server Vergeben und Entziehen mit `nur-ansehen` ab (deckt `schreibt` ab; die Rechte-Schleife der Grundprüfung nimmt neue Listeneinträge automatisch mit). Abgedeckt in Task 2.

---

### Task 1: Fachfunktionen `vergibRolle` und `entziehRolle`

**Files:**
- Modify: `src/lib/server/admin/rollen.ts` (`setzeRollen` und `gleicheMenge` entfallen)
- Modify: `src/lib/server/admin/mitgliedschaft.ts:70` (Kommentar nennt `setzeRollen` → `entziehRolle`)
- Test: `src/lib/server/admin/rollen.db.test.ts`, `src/lib/server/admin/ansicht.db.test.ts:323-330`

**Interfaces:**
- Produces:
  - `vergibRolle(db: Db, urheber: Urheber, mitgliedId: number, rolle: Rolle, jetzt: Date): Promise<'ok' | 'nicht-gefunden'>`
  - `entziehRolle(db: Db, urheber: Urheber, mitgliedId: number, rolle: Rolle, jetzt: Date): Promise<'ok' | 'letzter-mytco' | 'nicht-gefunden'>`

- [ ] **Step 1: Tests umschreiben** (in `rollen.db.test.ts` jeden `setzeRollen`-Test auf die neuen Funktionen; Schlüssel ist jetzt `mitgliedId`):
  - `vergibRolle` setzt `cm`, Verlauf `{aktion:'rolle-vergeben', detail:'cm'}`; zweites `vergibRolle` gleicher Rolle → `'ok'`, Rollen weiter `['cm']`, Verlauf weiter genau 1 Eintrag.
  - `entziehRolle` nimmt `cm`, Verlauf `rolle-entzogen`; zweites `entziehRolle` → `'ok'`, kein zweiter Eintrag.
  - Unbekanntes Mitglied (`2_000_000_000`) → `'nicht-gefunden'` bei beiden.
  - Einziger zählender MyTCO-Admin: `entziehRolle(…, 'mytco')` → `'letzter-mytco'`, Rolle bleibt; mit zweitem MyTCO-Admin → `'ok'`.
  - Gleichzeitiger Entzug zweier MyTCO-Admins (bestehender Parallel-Test): Ergebnisse sortiert `['letzter-mytco','ok']`.
  - Gesperrtes/ausgetretenes Konto zählt nicht (bestehender Test mit `{ art: 'automatisch' }`) bleibt sinngemäss.
  - In `ansicht.db.test.ts`: Entzug von `mytco` per `entziehRolle` beendet die Ansicht; erneutes `vergibRolle(…,'mytco')` lässt sie nicht wieder aufleben.
- [ ] **Step 2:** `npx vitest run src/lib/server/admin/rollen.db.test.ts src/lib/server/admin/ansicht.db.test.ts` → FAIL (Import fehlt).
- [ ] **Step 3: Implementieren.** Beide in einer Transaktion: zuerst `sperreRollen(tx)`, dann Konto über `konto.mitgliedId` suchen (fehlt → `'nicht-gefunden'`), `ladeRollen`. Vergeben: schon vorhanden → `'ok'` ohne Schreiben; sonst `insert` + `schreibeVerlauf(…rolle-vergeben…)`. Entziehen: nicht vorhanden → `'ok'`; `rolle === 'mytco' && waereLetzterMytco` → `'letzter-mytco'`; sonst `delete`, bei `mytco` `sitzung.ansichtRolle = null` für das Konto, `schreibeVerlauf(…rolle-entzogen…)`.
- [ ] **Step 4:** Tests aus Step 2 → PASS.
- [ ] **Step 5: Commit** `feat: Rollen einzeln vergeben und entziehen (#96)`.

### Task 2: Schnittstellen und Routen

**Files:**
- Modify: `src/lib/server/admin/schnittstellen.ts` (`postRollen` raus, `postRolleVergeben`, `postRolleEntziehen` rein, auch in `ADMIN_SCHNITTSTELLEN`)
- Create: `src/routes/api/admin/rollen/vergeben/+server.ts`, `src/routes/api/admin/rollen/entziehen/+server.ts`
- Delete: `src/routes/api/admin/mitglieder/[id]/rollen/+server.ts`
- Test: `src/lib/server/routen.test.ts:227`, `src/lib/server/admin/rechte-matrix.db.test.ts` (Liste Z. 78, Tests Z. 244-275), `src/lib/server/admin/schnittstellen-letzter-admin.db.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `POST /api/admin/rollen/vergeben` und `POST /api/admin/rollen/entziehen`, Körper `{ mitgliedId: number, rolle: Rolle }`; Antworten `200 {}`, `409 { fehler: 'letzter-mytco' }` (nur entziehen), `404 { fehler: 'nicht-gefunden' }`, `400` (Eingabefehler wie `eingabeFehler()`).

- [ ] **Step 1: Tests anpassen.**
  - Routen-Test: `'/api/admin/rollen/vergeben': { POST: [postRolleVergeben, 'admin'] }`, dito `entziehen`; Eintrag `mitglieder/[id]/rollen` weg.
  - Rechte-Matrix: Namen `postRolleVergeben`, `postRolleEntziehen` statt `postRollen` in der Liste der Rollen-Schnittstellen; «MyTCO-Admin: Vergeben 200, Entziehen 200»; «Mitglieder-Admin und CM-Admin: beide → 403 `kein-admin`, Rollen unverändert».
  - Eingabe: `rolle: 'admin'` oder `mitgliedId: 'x'` → 400; unbekannte `mitgliedId` → 404.
  - `schnittstellen-letzter-admin`: Entzug der eigenen `mytco` als einziger → `409 { fehler: 'letzter-mytco' }`.
- [ ] **Step 2:** `npx vitest run src/lib/server/routen.test.ts src/lib/server/admin/rechte-matrix.db.test.ts src/lib/server/admin/schnittstellen-letzter-admin.db.test.ts` → FAIL.
- [ ] **Step 3: Implementieren** über `schreibt(d, e, 'rollen', …)`; `mitgliedId` wie `mitgliedIdAus` (ganze Zahl 1…`INTEGER_MAX`), `rolle` mit einem Typwächter über `ROLLEN`; Zeit `jetzt(d)`. Routen nach dem Muster von `src/routes/api/admin/rollen/+server.ts` mit `holeAdminDienste()`.
- [ ] **Step 4:** Tests aus Step 2 → PASS; `npx eslint src/lib/server src/routes/api/admin` sauber.
- [ ] **Step 5: Commit** `feat: Schnittstellen Rolle vergeben und entziehen, alte Rollen-Schnittstelle entfernt (#96)`.

### Task 3: Abruf-Funktionen und Meldung «letzter MyTCO-Admin»

**Files:**
- Modify: `src/lib/verwaltung/zugang-api.ts` (neu `vergibRolle`, `entziehRolle`)
- Modify: `src/lib/verwaltung/mitglieder-api.ts:72-78` (`speichereRollen` raus)
- Modify: `src/lib/verwaltung/anzeige.ts` (`LETZTER_MYTCO` exportieren; `fehlerText` nennt ihn bei `letzter-mytco`)
- Test: `src/lib/verwaltung/zugang-api.test.ts`, `src/lib/verwaltung/mitglieder-api.test.ts:56-60`, `src/lib/verwaltung/anzeige.test.ts`

**Interfaces:**
- Produces:
  - `vergibRolle(mitgliedId: number, rolle: Rolle, holen?: Holen): Promise<Antwort<Record<string, never>>>` → POST `${ADMIN}/rollen/vergeben`
  - `entziehRolle(mitgliedId: number, rolle: Rolle, holen?: Holen): Promise<Antwort<Record<string, never>>>` → POST `${ADMIN}/rollen/entziehen`
  - `LETZTER_MYTCO = 'Du bist der letzte MyTCO-Admin. Gib zuerst jemand anderem die Rolle MyTCO-Admin.'`

- [ ] **Step 1: Tests.** zugang-api: beide schicken `{ mitgliedId: 7, rolle: 'cm' }` an den richtigen Pfad; `409 letzter-mytco` → `{ art: 'letzter-mytco' }`. anzeige: `fehlerText({ art: 'letzter-mytco' })` → `LETZTER_MYTCO`. Test zu `speichereRollen` entfernen.
- [ ] **Step 2:** `npx vitest run src/lib/verwaltung` → FAIL.
- [ ] **Step 3:** Implementieren mit `schicke` wie die übrigen Abrufe.
- [ ] **Step 4:** PASS. (Die Mitgliedseite kompiliert erst nach Task 5 wieder ohne `speichereRollen`: Tasks 3–5 vor `npm run check` gemeinsam abschliessen oder die Mitgliedseite in Task 3 schon auf die Zeile umstellen — Wahl des Ausführenden.)
- [ ] **Step 5: Commit** `feat: Abruf Rolle vergeben und entziehen (#96)`.

### Task 4: Seite «Rollen» mit Vergeben und Entziehen

**Files:**
- Modify: `src/routes/verwaltung/rollen/+page.svelte`
- Modify: `src/lib/design/*.css` nur, falls ein Baustein fehlt (vorher ins Leitbild)
- Test: `tests/e2e/verwaltung.test.ts` (Tests Z. 208-236 und Z. 441-470)

**Interfaces:**
- Consumes: Task 3 (`vergibRolle`, `entziehRolle`, `LETZTER_MYTCO`), `Spielersuche` (`gesperrt`, `onwahl`), `Aktionsdialog` (`oeffne()`), `data.eigeneMitgliedId` aus dem Layout.

Aufbau: je Rolle die bestehende `details.karte.klappe`; darin die Mitglieder als `ul.trefferliste` (Name als Link links, Nebentaste «Entziehen» rechts); darunter Nebentaste «<Rollenname> vergeben». Ein `Aktionsdialog` «<Rollenname> vergeben» mit `Spielersuche` (`label="Mitglied suchen"`, `gesperrt`: «hat die Rolle schon», `bereit` erst mit Wahl, Haupttaste «Vergeben», Erfolg «<Name> ist jetzt <Rollenname>.»). Ein `Aktionsdialog` «Rolle <Rollenname> entziehen?» mit dem Namen, Haupttaste «Entziehen», Erfolg «<Name> hat die Rolle <Rollenname> nicht mehr.»; beim eigenen `mytco` zusätzlich «Du kannst danach keine Rollen mehr vergeben und siehst diese Seite nicht mehr.» `onfertig` → `invalidateAll()`. Seiteninfo wörtlich: «Wer welche Rolle hat. Hier werden Rollen vergeben und entzogen; ein MyTCO-Admin bleibt immer.»

- [ ] **Step 1: E2E umschreiben.**
  - Test Z. 441: Statt Klappe auf der Mitgliedseite: Seite «Rollen» → Klappe «CM-Admin» → «CM-Admin vergeben» → `Mitglied suchen` mit dem erfundenen Nachnamen → Treffer wählen → «Vergeben» → Link `${nachname}, Selma` in der Klappe; danach «Entziehen» bei ihm → Dialog «Rolle CM-Admin entziehen?» → «Entziehen» → Link weg. Screenshot `rollen-seite` (bestehend) und neu `rollen-vergeben`.
  - Test Z. 208 (RR-03): `page.route('**/api/admin/rollen/entziehen', …409 letzter-mytco)`; auf der Seite «Rollen» beim eigenen Namen in «MyTCO-Admin» «Entziehen» → Dialog zeigt «Du kannst danach keine Rollen mehr vergeben …»; «Abbrechen» schliesst; erneut → «Entziehen» → `LETZTER_MYTCO` im Dialog sichtbar. Screenshot `verwaltung-letzter-admin`.
  - Gesperrter Treffer: Wer die Rolle schon hat, zeigt in der Suche «hat die Rolle schon».
- [ ] **Step 2:** `make e2e` im Hintergrund (bzw. gezielt `npm run e2e -- -g "RR-03|A-ROLLE-01, RR-07"`) → FAIL.
- [ ] **Step 3:** Seite bauen; `svelte-autofixer` bis ohne Befund.
- [ ] **Step 4:** E2E aus Step 2 → PASS (Desktop und iPhone-Projekt).
- [ ] **Step 5: Commit** `feat: Rollen auf der Seite «Rollen» vergeben und entziehen (#96)`.

### Task 5: Seite eines Mitglieds nur noch mit Zeile, Doku

**Files:**
- Modify: `src/routes/verwaltung/mitglieder/[id]/+page.svelte` (Klappe «Rollen» Z. 364-410, Dialog Z. 413-422 und Zustand Z. 89-158 raus; Zeile rein)
- Modify: `src/routes/verwaltung/mitglieder/+page.svelte:63-66` (nur Seiteninfo)
- Modify: `docs/rollen-und-rechte.md` (Ort der Vergabe: Seite «Rollen»), `docs/ui-leitbild.md:231` (Beispiel «Rollen speichern» → «Angaben speichern» o. ä.; Seite «Rollen» falls dort beschrieben), `docs/versionen.md` (Eintrag unter «Unveröffentlicht»)
- Test: `tests/e2e/verwaltung.test.ts` (Tests Z. 68-135 und Z. 299-312)

Zeile unter Rufname/Mitgliedernummer: `<p class="leise">Rollen: {['Mitglied', …ROLLEN_NAME].join(' · ')}</p>`; nur wenn `data.darfSchreiben.rollen`: Link «Auf der Seite «Rollen» ändern» auf `/verwaltung/rollen`. Seiteninfo «Mitglieder» wörtlich: «Alle Mitglieder suchen und über «Bearbeiten» ihre Seite öffnen: Angaben, Mitgliedschaft und Login. Rollen vergibt und entzieht der MyTCO-Admin auf der Seite «Rollen».»

- [ ] **Step 1: E2E umschreiben.**
  - Test Z. 68: Rollen-Abschnitt ersetzen: Zeile «Rollen: Mitglied» sichtbar, `getByRole('button', { name: 'Rollen speichern' })` hat Anzahl 0, kein Häkchen `CM-Admin`; der Admin aus `legeAdminMitBriefCodeAn` ist MyTCO-Admin → Link «Auf der Seite «Rollen» ändern» sichtbar. Verlauf-Erwartung «Rolle CM-Admin vergeben» entfällt hier (deckt Task 4 über den DB-Test bzw. Task 1 ab).
  - Neu (oder in bestehendem Mitglieder-Admin-Test): Mitglieder-Admin sieht die Zeile, aber keinen Link.
  - Test Z. 299: Teil «Zweiter Konflikt, danach Rollen speichern» streichen oder durch eine andere Speicheraktion ersetzen, die neu lädt.
- [ ] **Step 2:** gezielter E2E-Lauf → FAIL.
- [ ] **Step 3:** Seite umbauen, Seiteninfo, Doku; `svelte-autofixer`.
- [ ] **Step 4:** `make check` (im Hintergrund) grün; dann `make e2e` grün; Screenshots PC und Handy von Seite «Rollen» (offen mit Dialog) und Mitgliedseite mit Zeile ansehen.
- [ ] **Step 5: Commit(s)** `feat: Rollen auf der Seite eines Mitglieds nur noch angezeigt (#96)` und `docs: Rollen und Rechte, Leitbild, Versionen nachgeführt (#96)`.
