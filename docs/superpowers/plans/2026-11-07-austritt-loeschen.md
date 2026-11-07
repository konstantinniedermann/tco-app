# Austritt, Löschen, Auskunft und Löschfristen — Umsetzungsplan

> **Für ausführende Agenten:** PFLICHT-SKILL: superpowers:subagent-driven-development (empfohlen)
> oder superpowers:executing-plans, Task für Task. Schritte mit Checkbox (`- [ ]`).

**Ziel:** Der Mitglieder-Admin erfasst Austritt und Wiedereintritt, merkt ein Mitglied zum
Löschen vor und gibt eine druckbare Auskunft heraus. Ein Zeitgeber in der App vollzieht die
Löschfristen.

**Architektur:** Der Lebenslauf eines Mitglieds steht in `mitglied` (neuer Status
`vorgemerkt`, drei neue Spalten). Die Übergänge liegen in einem neuen Modul
`admin/mitgliedschaft.ts`, das Löschen in `admin/loeschung.ts`. Das Löschen läuft nur über den
Zeitgeber (`zeitgeber.ts`), den `hooks.server.ts` beim Start einschaltet. Schnittstellen und
Seiten folgen dem Muster der bestehenden Verwaltung (`schreibt`/`liest`, Bereich `mitglieder`).

**Tech-Stack:** SvelteKit (SPA, nur `+server.ts`), Drizzle + PostgreSQL, Vitest (Einheit/DB),
Playwright (E2E, Profile iPhone/Android/Desktop).

**Spec:** [`docs/superpowers/specs/2026-11-07-austritt-loeschen-design.md`](../specs/2026-11-07-austritt-loeschen-design.md)
(freigegeben 07.11.2026), Design-Entwurf
[MyTCO Mitgliedschaft und Auskunft](https://claude.ai/artifact/5UiDtGffbPejwFudsGNunU), Variante A.

## Globale Vorgaben

- Status in DB und Code: `aktiv`, `ausgetreten`, `vorgemerkt`, `geloescht`. Anzeige: «aktiv», «ausgetreten», «wird gelöscht», «gelöscht».
- Frist nach Austritt: **1 Kalenderjahr** ab `austritt_am` (7.11.2026 → 7.11.2027), Konstante mit Kommentar `// Annahme K-38: …`. Bedenkzeit: **7 Tage** ab `vorgemerkt_am`.
- Fällig ist eine Löschung, wenn `jetzt >= loeschtAm`; nie früher. Angezeigt wird das Datum von `loeschtAm` in Schweizer Zeit.
- Verlauf: 12 Monate. Anlass-Antworten: ein Jahr nach `anlass.beginn` (**Vorschlag K-50**, Kommentar an der Konstante).
- Rückzug beim Austritt und beim Vormerken: CM-Anmeldungen nur in Kategorien `art = 'einzel'` und nur, solange `wirksamerStatus(...) === 'offen'`; Antworten zu Anlässen mit `beginn > jetzt` werden gelöscht. Keine Mitteilung.
- Rollen bleiben beim Austritt und Vormerken gespeichert (wirken nicht, RR-08), Passkeys bleiben bis zur Löschung. Sitzungen und Push-Abos sind sofort weg.
- RR-03: Austritt und Vormerken des letzten zählenden MyTCO-Admins → `letzter-mytco`, unter derselben Advisory-Sperre wie `setzeRollen` (`SPERRE_ROLLEN`).
- Bereits eingespielte Migrationen (`0000`–`0012`) nie neu erzeugen. Neue Migration mit `npm run db:generate`.
- Ändernde Anfragen nur als JSON (SI-10), Antworten ohne Personendaten. Logs nur mit Anzahl und Mitglied-ID (SI-05).
- Verlauf ohne Werte (FR-26). Neue Aktionen: `ausgetreten`, `wiedereingetreten`, `loeschung-vorgemerkt`, `loeschung-zurueckgenommen`, `auskunft-erstellt`.
- Oberfläche nur aus `docs/ui-leitbild.md`. Das Drucklayout der Auskunft kommt zuerst ins Leitbild. Svelte-Code nur nach aktueller Doku über den Svelte-MCP-Server, jede geänderte Komponente durch `svelte-autofixer`.
- Texte wörtlich aus dem Design-Entwurf (siehe Task 8). Du-Form, Schweizer Schreibweise.
- Nur erfundene Testdaten (DS-08). Keine neuen Dependencies.
- E2E und `make seed` im Worktree auf eigener Datenbank: in `.env` `DATABASE_URL=…/mytco_043` (Datenbank einmal anlegen). #60 baut parallel; vor dem Merge `origin/dev` einmergen und die Migrationsnummer anpassen, falls #60 eine Migration mitbringt.

## Review-Fokus

1. **Zwei Admins ändern gleichzeitig denselben Zustand** (A erfasst den Austritt, B merkt zum Löschen vor). Jeder Übergang sperrt die Zeile (`for update`) und prüft den Ausgangszustand; der zweite bekommt `409 veraltet` statt eines vermischten Zustands (Task 2).
2. **Der Zeitgeber läuft zweimal gleichzeitig** (Neustart, zwei Prozesse). Der zweite Lauf überspringt (`pg_try_advisory_xact_lock`), nichts wird doppelt oder halb gelöscht (Task 4).
3. **Grenze der Frist:** Bei `jetzt = loeschtAm − 1 ms` bleibt alles stehen, bei `jetzt = loeschtAm` wird gelöscht. Gilt für Austritt und Bedenkzeit, auch über die Sommerzeit-Umstellung (Task 4).
4. **Gelöschte Person war Urheber, Absender oder Ersteller.** Verlauf anderer Mitglieder, Anlass-Seite der Verwaltung und Verlauf der Mitteilungen laden weiter und zeigen *gelöschtes Konto* statt des Namens (Task 4).
5. **Ausgetretenes Mitglied mit offener Sitzung, Push-Abo oder Passkey.** Die nächste Anfrage ist abgemeldet, ein Code-Login und ein Passkey-Login verhalten sich wie bei einer unbekannten Adresse, ebenso bei `vorgemerkt` (Task 2).

---

### Task 1: Datenmodell und Verlauf-Aktionen

**Files:**
- Modify: `src/lib/server/db/schema.ts` (`mitglied`)
- Create: `drizzle/0013_mitgliedschaft.sql` (generiert) und `drizzle/meta/*`
- Modify: `src/lib/server/admin/mitglieder.ts` (`MitgliedStatus`), `src/lib/server/admin/schnittstellen.ts` (`STATUS`), `src/lib/server/admin/verlauf.ts` (`Aktion`), `src/lib/verwaltung/anzeige.ts` (`aktionText`, `plakette`)
- Test: `src/lib/server/db/schema.db.test.ts`, `src/lib/verwaltung/anzeige.test.ts`

**Interfaces:**
- Produces: Spalten `austrittAm`, `vorgemerktAm` (beide `timestamp with tz`, leer erlaubt), `statusVorher` (`text`, `'aktiv' | 'ausgetreten'`, leer erlaubt). `strasse`, `plz`, `ort`, `email` dürfen leer sein, aber nur bei `geloescht`. `MitgliedStatus = 'aktiv' | 'ausgetreten' | 'vorgemerkt' | 'geloescht'`. Fünf neue `Aktion`-Werte (Globale Vorgaben).

- [ ] **Step 1: Tests schreiben**
  - `schema.db.test.ts`: `'vorgemerkt'` wird angenommen; ein Mitglied mit `email: null` und Status `aktiv` wird abgelehnt (`mitglied_geloescht_check`); mit Status `geloescht` und nur Vor-/Nachname angenommen; `status_vorher` nur `aktiv`/`ausgetreten` (`mitglied_status_vorher_check`); `vorgemerkt` verlangt `vorgemerkt_am` und `status_vorher` (`mitglied_vorgemerkt_check`); `ausgetreten` verlangt `austritt_am` (`mitglied_ausgetreten_check`).
  - `anzeige.test.ts`: `aktionText` für die fünf Aktionen → «Austritt erfasst», «Wiedereintritt erfasst», «zum Löschen vorgemerkt», «Löschung rückgängig gemacht», «Auskunft erstellt». `plakette({status: 'vorgemerkt'})` → `{ text: 'wird gelöscht', klasse: 'plakette plakette-gesperrt' }`.
- [ ] **Step 2:** `npx vitest run src/lib/server/db/schema.db.test.ts src/lib/verwaltung/anzeige.test.ts` → FAIL
- [ ] **Step 3:** Schema, Checks und Typen ändern, `npm run db:generate`, die erzeugte SQL lesen (nur `ALTER`, keine Daten verloren). Wo `$inferSelect` jetzt `string | null` liefert (aktive Mitglieder), mit `?? ''` bzw. engerem Typ auflösen, nicht mit `!` über Gelöschte hinweg.
- [ ] **Step 4:** Tests → PASS; `npm run check:svelte` → 0 Fehler.
- [ ] **Step 5:** Commit `feat: Status vorgemerkt und Spalten für Austritt und Löschen (#43)`

### Task 2: Übergänge Austritt, Wiedereintritt, Vormerken, Rückgängig

**Files:**
- Create: `src/lib/server/admin/mitgliedschaft.ts`, `src/lib/server/cm/austritt.ts`
- Modify: `src/lib/server/admin/rollen.ts` (Sperre und Untergrenze exportieren), `src/lib/server/anlass/anlaesse.ts` (`loescheKommendeAntworten`), `src/lib/server/cm/anmeldungen.ts` (nur `istAktiv` exportieren), `src/lib/server/admin/mitglieder.ts` (`Detail.mitgliedschaft`)
- Test: `src/lib/server/admin/mitgliedschaft.db.test.ts`, `src/lib/server/login/mailcode.db.test.ts`, `src/lib/server/login/passkey.db.test.ts`, `src/lib/server/login/sitzung.db.test.ts`

**Interfaces:**
- Produces in `rollen.ts`: `sperreRollen(tx: DbOderTx): Promise<void>`; `waereLetzterMytco(tx: DbOderTx, kontoId: number): Promise<boolean>` (dasselbe wie in `setzeRollen`, das darauf umgestellt wird).
- Produces in `mitgliedschaft.ts`:
  - `FRIST_AUSTRITT` und `BEDENKZEIT` als Konstanten; `loeschtAm(m: { status: MitgliedStatus; austrittAm: Date | null; vorgemerktAm: Date | null }): Date | null`
  - `erfasseAustritt(db: Db, urheber: Urheber, id: number, jetzt: Date): Promise<'ok' | 'nicht-gefunden' | 'veraltet' | 'letzter-mytco'>` (nur aus `aktiv`)
  - `erfasseWiedereintritt(db, urheber, id, jetzt): Promise<'ok' | 'nicht-gefunden' | 'veraltet' | 'frist-abgelaufen'>` (nur aus `ausgetreten`; setzt `austrittAm` auf `null`)
  - `merkeZumLoeschenVor(db, urheber, id, jetzt): Promise<'ok' | 'nicht-gefunden' | 'veraltet' | 'letzter-mytco'>` (aus `aktiv` oder `ausgetreten`, setzt `statusVorher`)
  - `nimmLoeschungZurueck(db, urheber, id, jetzt): Promise<'ok' | 'nicht-gefunden' | 'veraltet'>` (zurück nach `statusVorher`, `austrittAm` unverändert)
  - `veraltet` = Ausgangszustand passt nicht (Zeile `for update` gelesen).
- Produces in `cm/austritt.ts`: `zieheOffeneEinzelZurueck(tx: DbOderTx, mitgliedId: number, jetzt: Date): Promise<number>`; in `anlaesse.ts`: `loescheKommendeAntworten(tx: DbOderTx, mitgliedId: number, jetzt: Date): Promise<number>`.
- Produces in `mitglieder.ts`: `Detail.mitgliedschaft: { austrittAm: Date | null; vorgemerktAm: Date | null; loeschtAm: Date | null }`.

- [ ] **Step 1: Tests schreiben** (`mitgliedschaft.db.test.ts`, feste `jetzt`)
  - Austritt: Status `ausgetreten`, `austrittAm = jetzt`, `fairgateOffenSeit = null`, Sitzungen und Push-Abos weg, Passkeys und Rollen noch da, Verlauf `ausgetreten`.
  - Austritt zieht eine bestätigte Einzel-Anmeldung eines offenen Turniers zurück (`zurueckgezogen`), lässt eine nach Anmeldeschluss und eine Doppel-Anmeldung stehen; löscht die Antwort zu einem kommenden Anlass, behält die zu einem vergangenen.
  - Austritt eines aktiven Mitglieds aus `ausgetreten` → `veraltet`; des letzten MyTCO-Admins → `letzter-mytco`, nichts geändert.
  - Wiedereintritt innert Frist → `aktiv`, Rollen wirken wieder (`istMytcoAdmin` true), Zurückgezogenes bleibt zurückgezogen; bei `jetzt = loeschtAm` → `frist-abgelaufen`.
  - Vormerken aus `ausgetreten`, dann Rückgängig → `ausgetreten` mit altem `austrittAm`; aus `aktiv` → zurück `aktiv`.
  - `loeschtAm`: Austritt 2026-11-07T08:00Z → 2027-11-07T08:00Z; Vormerken → +7 Tage.
  - Gleichzeitig: `Promise.all([erfasseAustritt(...), merkeZumLoeschenVor(...)])` → genau ein `ok`, das andere `veraltet` (Review-Fokus 1).
  - Login (`mailcode.db.test.ts`, `passkey.db.test.ts`, `sitzung.db.test.ts`): bei `ausgetreten` und `vorgemerkt` dieselbe Antwort wie für eine unbekannte Adresse, kein Mail-Versand; Passkey-Login → wie unbekannt; bestehende Sitzung nach Austritt → `ladeSitzung` null (Review-Fokus 5).
- [ ] **Step 2:** `npx vitest run src/lib/server/admin/mitgliedschaft.db.test.ts src/lib/server/login` → FAIL
- [ ] **Step 3:** Implementieren. Jede Funktion in einer Transaktion: `sperreRollen` zuerst (gleiche Reihenfolge wie `setzeRollen`, keine Verklemmung), dann Mitglied `for update`. `ladeMitglied` liefert `mitgliedschaft`.
- [ ] **Step 4:** Tests → PASS; bestehende Tests in `src/lib/server/admin` und `src/lib/server/cm` bleiben grün.
- [ ] **Step 5:** Commit `feat: Austritt, Wiedereintritt und Löschung vormerken (#43)`

### Task 3: Folgen für Fairgate, Anlässe und Mitgliederliste

**Files:**
- Modify: `src/lib/server/admin/fairgate.ts`, `src/lib/server/anlass/anlaesse.ts` (`listeAnlaesse`, `ladeAnlassAdmin`), `src/lib/server/admin/mitglieder.ts` (`listeMitglieder`), `src/routes/verwaltung/mitglieder/+page.svelte` (Filter), `src/routes/verwaltung/fairgate/+page.svelte`
- Test: `src/lib/server/admin/fairgate.db.test.ts`, `src/lib/server/anlass/anlaesse.db.test.ts`, `src/lib/server/admin/mitglieder.db.test.ts`

- [ ] **Step 1: Tests:** «Für Fairgate» zeigt ein nicht aktives Mitglied mit gesetzter Markierung nicht; `listeAnlaesse` und `ladeAnlassAdmin` zählen *kommen* und *kommen nicht* nur über aktive Mitglieder, `anmeldungen` listet nur aktive; `listeMitglieder({status: 'vorgemerkt'})` findet das vorgemerkte. Ohne Filter erscheinen alle ausser `geloescht`. Ist der Verlauf zu einer offenen Markierung gelöscht (älter als 12 Monate), liefert «Für Fairgate» `felder: []` und `verlaufGeloescht: true`; die Seite zeigt dann «Änderung älter als 12 Monate, Angaben in Fairgate prüfen.» (Befund 3 vom 06.11.).
- [ ] **Step 2:** Tests → FAIL
- [ ] **Step 3:** Filter ergänzen. In der Seite: Option `vorgemerkt` («wird gelöscht») dazu, Option «gelöscht» weg. Gelöschte haben kein Konto mehr und erscheinen in der Verwaltung nicht (`innerJoin konto` bleibt). `svelte-autofixer`.
- [ ] **Step 4:** Tests → PASS
- [ ] **Step 5:** Commit `fix: Fairgate und Anlässe zählen nur aktive Mitglieder (#43)`

### Task 4: Löschen und Löschfristen

**Files:**
- Create: `src/lib/server/admin/loeschung.ts`
- Test: `src/lib/server/admin/loeschung.db.test.ts`

**Interfaces:**
- Consumes: `loeschtAm` (Task 2).
- Produces: `raeumeAuf(db: Db, jetzt: Date): Promise<{ lief: boolean; konten: number[]; verlauf: number; antworten: number }>`. `lief: false`, wenn ein anderer Lauf die Sperre hält (`pg_try_advisory_xact_lock(4302)`).

- [ ] **Step 1: Tests schreiben**
  - Ein ausgetretenes Mitglied mit fälliger Frist: Von `mitglied` bleiben `id`, `vorname`, `nachname`, Status `geloescht`, alles andere `null`. Konto, Sitzungen, Passkeys, Rollen und Push-Abos sind weg, ebenso Anlass-Antworten und der eigene Verlauf. Die CM-Anmeldung samt `anmeldung_spieler` bleibt.
  - Verweise geleert: `aenderung.urheber_mitglied_id` bei einem anderen Mitglied, `anlass.erstellt_von`, `mitteilung.absender_id`. `ladeVerlauf` des anderen zeigt `gelöschtes Konto`; `ladeAnlassAdmin` und der Verlauf der Mitteilungen laden ohne Fehler (Review-Fokus 4).
  - Grenze: `jetzt = loeschtAm − 1 ms` → nichts; `jetzt = loeschtAm` → gelöscht. Einmal mit einem Austritt am 2026-03-28T23:30Z über die Sommerzeit (Review-Fokus 3).
  - Vorgemerkt nach 7 Tagen → gelöscht; nach 6 Tagen → nicht.
  - Verlauf: Eintrag mit `zeitpunkt` vor 12 Monaten weg, einer von gestern bleibt. Anlass-Antworten: Anlass vor mehr als einem Jahr → Antworten weg, Anlass bleibt; jünger → bleiben.
  - Zwei Läufe gleichzeitig: genau einer mit `lief: true`, Ergebnis wie ein Lauf (Review-Fokus 2). Ein zweiter Lauf danach findet nichts.
  - Log: genau `console.info('Löschlauf', { konten, verlauf, antworten })`, ohne Namen und Adressen.
- [ ] **Step 2:** `npx vitest run src/lib/server/admin/loeschung.db.test.ts` → FAIL
- [ ] **Step 3:** Implementieren. Eine Transaktion pro Lauf. Die Reihenfolge erlaubt keine Lücke: zuerst Verweise leeren, dann Konto und Daten löschen, dann das Mitglied leeren.
- [ ] **Step 4:** Tests → PASS
- [ ] **Step 5:** Commit `feat: Löschfristen für Konten, Verlauf und Anlass-Antworten (#43)`

### Task 5: Zeitgeber in der App

**Files:**
- Create: `src/lib/server/zeitgeber.ts`, `src/lib/server/zeitgeber.test.ts`
- Modify: `src/hooks.server.ts` (`init`), `playwright.config.ts` (Webserver mit `ZEITGEBER=aus`), `.env.example` (`ZEITGEBER` dokumentiert)

**Interfaces:**
- Consumes: `raeumeAuf` (Task 4).
- Produces: `starteZeitgeber(lauf: () => Promise<unknown>, takt?: { start: number; abstand: number }): () => void`. Standard `start` 60 000 ms, `abstand` 24 h. Gibt eine Stopp-Funktion zurück, Timer mit `unref()`. Ein Fehler im Lauf → `console.error('Löschlauf fehlgeschlagen')` ohne Meldungstext, der nächste Lauf findet trotzdem statt.

- [ ] **Step 1: Tests** (`vi.useFakeTimers`): erster Lauf nach `start`, dann alle `abstand`; ein werfender Lauf stoppt den Takt nicht; ein zweiter Aufruf von `starteZeitgeber` im selben Prozess startet keinen zweiten Takt (Merker auf `globalThis`, wichtig für den Neustart der Hooks im Dev-Server); Stopp beendet den Takt.
- [ ] **Step 2:** `npx vitest run src/lib/server/zeitgeber.test.ts` → FAIL
- [ ] **Step 3:** Implementieren. In `init`: `if (!building && process.env.ZEITGEBER !== 'aus') starteZeitgeber(() => raeumeAuf(db, new Date()))`. Die Datenbank kommt wie in `holeAdminDienste`.
- [ ] **Step 4:** Tests → PASS; `make check-schnell` grün.
- [ ] **Step 5:** Commit `feat: Zeitgeber räumt täglich und nach dem Start auf (#43)`

### Task 6: Schnittstellen

**Files:**
- Modify: `src/lib/server/admin/schnittstellen.ts`
- Create: `src/routes/api/admin/mitglieder/[id]/austritt/+server.ts`, `…/wiedereintritt/+server.ts`, `…/loeschen/+server.ts`, `…/loeschen-rueckgaengig/+server.ts`, `…/auskunft/+server.ts` (je eine Zeile wie `sitzungen/+server.ts`)
- Create: `src/lib/server/admin/auskunft.ts`
- Test: `src/lib/server/admin/schnittstellen.db.test.ts`, `src/lib/server/admin/rechte-matrix.db.test.ts`, `src/lib/server/admin/auskunft.db.test.ts`

**Interfaces:**
- Consumes: die vier Übergänge (Task 2).
- Produces: `postAustritt`, `postWiedereintritt`, `postLoeschen`, `postLoeschenRueckgaengig` (POST, leerer JSON-Körper, `schreibt(…, 'mitglieder')`; `ok` → 200 `{}`, `veraltet`/`letzter-mytco`/`frist-abgelaufen` → 409 `{ fehler }`, sonst 404). `getAuskunft` (`liest(…, 'mitglieder')`, 200 `Auskunft`, schreibt Verlauf `auskunft-erstellt` mit dem Lesenden als Urheber). Alle in `ADMIN_SCHNITTSTELLEN`.
- Produces in `auskunft.ts`: `ladeAuskunft(db: Db, id: number, jetzt: Date): Promise<Auskunft | null>` mit
  `Auskunft = { erstelltAm: Date; name: string; angaben: Angaben; status: MitgliedStatus; mitgliedschaft: Detail['mitgliedschaft']; rollen: Rolle[]; login: { geraete: number; zuletztGenutzt: Date | null; passkeys: { eingerichtetAm: Date }[]; pushGeraete: number }; anlaesse: { titel: string; beginn: Date; antwort: Antwort; bemerkung: string | null }[]; cm: { turnier: string; kategorie: string; status: AnmeldungStatus }[]; verlauf: VerlaufZeile[] }`.

- [ ] **Step 1: Tests**
  - Schnittstellen: Mitglieder-Admin erfasst den Austritt → 200, zweiter Aufruf → 409 `veraltet`; ohne JSON → Formatfehler; unbekannte ID → 404; letzter MyTCO-Admin → 409 `letzter-mytco`. In der *Ansicht als* → 403 `nur-ansehen`.
  - Rechte-Matrix: Die vier POST stehen in der Liste der schreibenden Schnittstellen. MyTCO-Admin → 403 `kein-recht`, CM-Admin → 403 `kein-admin`. MyTCO-Admin liest `getAuskunft` → 200.
  - Auskunft: enthält erfundene Angaben, Anlass, CM-Anmeldung und Verlauf. Das JSON enthält keinen der Schlüssel `briefCodeHash`, `kennungHash`, `publicKey`, `endpoint`, `p256dh`, `auth` (rekursiv geprüft). Der Aufruf schreibt `auskunft-erstellt`.
- [ ] **Step 2:** Tests → FAIL
- [ ] **Step 3:** Implementieren
- [ ] **Step 4:** Tests → PASS
- [ ] **Step 5:** Commit `feat: Schnittstellen für Mitgliedschaft und Auskunft (#43)`

### Task 7: Leitbild — Drucklayout der Auskunft

**Files:**
- Modify: `docs/ui-leitbild.md`, `src/lib/design/basis.css`
- Test: `tests/e2e/mockups.test.ts` bzw. die bestehende Prüfung `design-tokens` (`make check-schnell`)

- [ ] **Step 1:** Ins Leitbild: Baustein *Druckseite* (weisser Grund, Tabellen mit 1px-Linien in `farbe-rand`, Kopfzeile mit Wappen auf `farbe-marke`). Klasse `nicht-drucken` blendet unter `@media print` aus. Plakette *wird gelöscht* = `plakette-gesperrt`, als Zustand in der Tabelle der Plaketten. Der Design-Entwurf ist als Quelle verlinkt.
- [ ] **Step 2:** `basis.css`: `.druckseite` und `@media print { .nicht-drucken, .seitenleiste, .kopf { display: none } }`, nur mit Tokens.
- [ ] **Step 3:** `make check-schnell` grün.
- [ ] **Step 4:** Commit `docs: Leitbild – Druckseite und Plakette wird gelöscht (#43)`

### Task 8: Oberfläche — Karte Mitgliedschaft, Rückfragen, Auskunft

**Files:**
- Create: `src/lib/verwaltung/Mitgliedschaft.svelte`, `src/routes/verwaltung/mitglieder/[id]/auskunft/+page.svelte`, `…/auskunft/+page.ts`
- Modify: `src/routes/verwaltung/mitglieder/[id]/+page.svelte` (Karte rechts oben, über *Login*), `src/lib/verwaltung/api.ts` (+ Test), `src/lib/verwaltung/anzeige.ts` (Datumstext, + Test)

**Interfaces:**
- Consumes: Schnittstellen (Task 6), `Detail.mitgliedschaft` (Task 2).
- Produces in `api.ts`: `erfasseAustritt(id)`, `erfasseWiedereintritt(id)`, `loescheMitglied(id)`, `nimmLoeschungZurueck(id)` → `Promise<'ok' | 'veraltet' | 'letzter-mytco' | 'frist-abgelaufen' | 'stoerung'>`; `ladeAuskunft(id)`.

Texte (wörtlich, `{datum}` = Schweizer Datum):
- aktiv: «Aktiv. Kommt der Austritt aus Fairgate, erfasse ihn hier: Das Login ist dann sofort gesperrt.» Tasten «Austritt erfassen», «Mitglied löschen».
- ausgetreten: «Ausgetreten am {austritt}. Das Login ist gesperrt. Ohne Wiedereintritt löscht MyTCO die Daten am {loeschtAm}; dann bleibt nur der Name.» Tasten «Wiedereintritt erfassen», «Mitglied löschen».
- vorgemerkt: «Zum Löschen vorgemerkt am {vorgemerkt}. Das Login ist gesperrt. MyTCO löscht die Daten am {loeschtAm}; dann bleibt nur der Name.» Taste «Löschung rückgängig machen», darunter leise «Danach ist das Mitglied wieder {aktiv|ausgetreten}, wie vorher.»
- immer: Link «Auskunft über die Daten ›».
- Rückfrage Austritt: Titel «Austritt von {Vorname Nachname} erfassen?», Text «Das Login ist ab sofort gesperrt. Kommende Anmeldungen werden zurückgezogen.», leise «Ein Wiedereintritt geht bis {loeschtAm}.», Tasten «Abbrechen» / «Austritt erfassen».
- Rückfrage Löschen: Titel «{Vorname Nachname} löschen?», Text «Das Login ist ab sofort gesperrt. Am {loeschtAm} löscht MyTCO die Daten; dann bleibt nur der Name.», leise «Bis dahin kannst du das rückgängig machen.», Tasten «Abbrechen» / «Mitglied löschen».
- Fehler: `letzter-mytco` → «Das ist der letzte MyTCO-Admin. Gib die Rolle zuerst jemand anderem.»; `veraltet` → bestehender Text `VERALTET` mit «Neuen Stand laden»; `frist-abgelaufen` → «Die Frist für den Wiedereintritt ist vorbei. Leg das Mitglied neu an.»
- Auskunft: Titel «Auskunft über die Daten von {Vorname Nachname}», Untertitel «Das speichert MyTCO zu dir, Stand {datum, zeit}. Erstellt von der Mitgliederverwaltung.», Abschnitte wie im Entwurf, Tasten «‹ Zurück» und «Drucken oder als PDF speichern» (`window.print()`, Klasse `nicht-drucken`), Schluss «Ohne alte und neue Werte. Wer was sieht und wie lange MyTCO Daten aufbewahrt, steht in der Datenschutzerklärung in MyTCO.»

- [ ] **Step 1: Tests** für `api.ts` (Antwortcodes → Ergebnis) und für den Datumstext in `anzeige.ts` (Zürich, z. B. 2026-11-07T23:30Z → «8.11.2026»).
- [ ] **Step 2:** Tests → FAIL
- [ ] **Step 3:** Komponenten nach aktueller Svelte-Doku (MCP). Rückfragen mit `<dialog class="karte">` wie *Sitzungen beenden*. Bei «Nur ansehen» (`nurLesen`) keine Tasten, Link zur Auskunft bleibt. `svelte-autofixer` für jede Datei.
- [ ] **Step 4:** Tests → PASS; `npm run check:svelte` → 0/0.
- [ ] **Step 5:** Commit `feat: Karte Mitgliedschaft und Auskunft in der Verwaltung (#43)`

### Task 9: E2E, Screenshots und Bildvergleich

**Files:**
- Create: `tests/e2e/mitgliedschaft.test.ts`
- Modify: `tests/e2e/hilfen/*` nur falls eine Hilfe fehlt

- [ ] **Step 1: E2E** (alle drei Profile, erfundene Mitglieder aus dem Seed oder per Hilfe angelegt; Start über `startetVomSymbol(page)` wo nötig):
  - Mitglieder-Admin erfasst den Austritt (Rückfrage bestätigen) → Plakette «ausgetreten», Text mit Löschdatum. Das Mitglied fordert einen Code an: dieselbe Rückmeldung wie bei einer unbekannten Adresse, in Mailpit keine Mail.
  - Wiedereintritt → «aktiv».
  - Löschen vormerken → «wird gelöscht», Rückgängig → «aktiv».
  - Auskunft öffnen → Titel und Abschnitte sichtbar; im Druck-Medium (`page.emulateMedia({ media: 'print' })`) ist die Drucktaste unsichtbar.
  - axe ohne Verstösse auf Mitgliederseite (drei Zustände) und Auskunft.
- [ ] **Step 2:** `make e2e` im Hintergrund starten (`run_in_background`) → grün.
- [ ] **Step 3:** Screenshots iPhone und Desktop der Karte in drei Zuständen, beider Rückfragen und der Auskunft neben die Artboards des Entwurfs legen. Abweichungen beheben oder begründen.
- [ ] **Step 4:** Commit `test: E2E Austritt, Löschen und Auskunft (#43)`

### Task 10: Vermerk in der CM-Anmeldeliste (erst wenn #60 auf `dev` ist)

**Files:**
- Modify: die Anmeldeliste der Verwaltung aus #60 (`src/routes/verwaltung/turniere/[id]/kategorien/[kid]/+page.svelte` und ihre Daten in `src/lib/server/cm/verwaltung.ts`)

- [ ] **Step 1:** `git merge origin/dev`, prüfen, dass #60 drin ist. Sonst Task auslassen und im Bericht als Nacharbeit nennen.
- [ ] **Step 2: Test** (DB): Die Liste liefert pro Anmeldung `status` des Mitglieds; ein ausgetretenes Mitglied hat `ausgetreten`.
- [ ] **Step 3:** Neben dem Namen die Plakette «ausgetreten» bzw. «wird gelöscht». `svelte-autofixer`.
- [ ] **Step 4:** Tests und betroffene E2E → PASS
- [ ] **Step 5:** Commit `feat: CM-Anmeldeliste zeigt ausgetretene Mitglieder (#43)`

### Task 11: Doku nachführen

**Files:**
- Modify: `docs/fachmodell.md` (FR-04 → umgesetzt, Zustände mit `vorgemerkt`, FR-26 Aktionen und Löschung nach 12 Monaten), `docs/datenschutz.md` (*Löschen*: Zeitgeber, Rückzug beim Austritt, Verweise auf Gelöschte, DS-07 umgesetzt), `docs/datenschutzerklaerung.md` (nur wenn der Wortlaut abweicht), `docs/rollen-und-rechte.md` (RR-03, RR-08 → umgesetzt), `docs/anforderungen/anforderungen.md`, `docs/testkonzept.md` (Release-Checkliste: Löschfristen gebaut), arc42 (Zeitgeber als Baustein und im Laufzeitkapitel), `docs/versionen.md` (*Unveröffentlicht*)
- Kommentar in #59: Fall «ein Doppelpartner tritt aus» ist dort zu regeln.

- [ ] **Step 1:** Doku anpassen; neue Dateien zuerst stagen (`make annahmen` sieht nur Versioniertes).
- [ ] **Step 2:** `make check-schnell` grün.
- [ ] **Step 3:** Commit `docs: Austritt, Löschen und Zeitgeber in Fachmodell, Datenschutz und arc42 (#43)`

### Abschluss

- [ ] `make check` auf dem fertigen, committeten Stand, Review (`/code-review` und `cas-reviewer`), Befunde klären, dann Merge nach `dev` nach Skill `tco-branching`. Die Version steigt um eine Nebenversion, weil eine Etappe dazukommt.
