[← Übersicht](../../index.md)

# Gespräch mit der Turnierleitung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Mitglied schreibt aus der CM-Seite der Turnierleitung und liest die Antwort in MyTCO; alle CM-Admins sehen jeden Fall im Posteingang des Turniers (#71).

**Architecture:** Zwei neue Tabellen `gespraech` (eines je Mitglied und Turnier) und `nachricht`. Ein Fachmodul `src/lib/server/gespraech/` mit Lese- und Schreibfunktionen und den Schnittstellen. Mitglieder nutzen `/api/cm/[id]/gespraech`, die Verwaltung `/api/admin/…` im Bereich `cm`. Meldungen laufen über den bestehenden Weg `meldeMitgliedern` (FR-47). Gelöscht wird im bestehenden Löschlauf `raeumeAuf`.

**Tech Stack:** SvelteKit (Svelte 5 Runes), TypeScript, Drizzle/PostgreSQL, Vitest (`*.test.ts`, `*.db.test.ts`), Playwright (`tests/e2e`).

**Spec:** `docs/superpowers/specs/2026-11-09-gespraech-turnierleitung-design.md`, Entwurf: https://claude.ai/artifact/XoDzxKrqDgmbUPbLE6mvWZ

## Global Constraints

- Svelte-Code nur nach aktueller Doku über den Svelte-MCP-Server; jede geänderte `.svelte`-Datei läuft durch `svelte-autofixer`.
- Oberfläche nur aus Tokens und Bausteinen von `docs/ui-leitbild.md`; die Sprechblase kommt zuerst ins Leitbild, dann genau einmal nach `src/lib/design/basis.css`.
- Unter `src/routes` keine Server-Dateien ausser `+server.ts` (ADR-002). Keine neuen Abhängigkeiten.
- Datenschutzkonzept und Datenschutzerklärung werden **vor** dem Code nachgeführt (Task 1).
- Testdaten erfunden; Seed-Persona «Hanna Muster» ist CM-Admin und Kontaktperson.
- Neue IDs: **A-TURNIER-04** (Anforderung), **FR-50 bis FR-54** (Regeln, Wortlaut in Task 1). Jeder Test nennt die ID, die er belegt (`make check` prüft das über `test-ids`).
- Wortlaut aus Spec und Entwurf:
  - CM-Seite, Karte: Titel «Fragen oder Probleme?», leise «Kontaktperson: <Name> (CM-Admin)», Kachel «Schreib der Turnierleitung ›»; ohne Kontaktperson mit Gespräch: Kachel «Dein Gespräch mit der Turnierleitung ›»; Plakette «neue Antwort» (`plakette-offen`) im Kartenkopf
  - Gesprächsseite: Titel «Frage an die Turnierleitung», Zurück «‹ <Name der CM>», Absender «Du» / «Turnierleitung», Plakette «neu», Feld «Deine Nachricht», Hilfe «Alle CM-Admins lesen mit. Bitte keine Angaben zur Gesundheit.», Haupttaste «Senden»; nur lesend: «Schreiben geht zurzeit nicht.» *(Entscheid Claude)*
  - Startseite: Kachel hervorgehoben «Neue Antwort der Turnierleitung» mit leise dem Turniernamen; Verwaltung-Kachel leise «N Nachrichten an die Turnierleitung offen» (1: «1 Nachricht …»)
  - Verwaltung: Abschnitt «Nachrichten», «Fragen an die Turnierleitung», Plakette «N offen», Kachel «Posteingang · N offen, M erledigt ›»; Titel Posteingang «Nachrichten an die Turnierleitung», Spalten «Mitglied · Letzte Nachricht · Zuletzt · Stand», darunter «Alle Gespräche dieses Turniers werden am 31. Dezember <Jahr> gelöscht.»; Gespräch: Feld «Antwort der Turnierleitung», Hilfe «<Rufname/Vorname> sieht als Absender nur «Turnierleitung».», Tasten «Antworten» / «Als erledigt markieren» bzw. «Wieder öffnen»; Absender «Turnierleitung (Vorname Nachname)», gelöscht «Turnierleitung (gelöschtes Konto)»; Hinweis bei Gleichzeitigkeit «Inzwischen hat jemand geantwortet. Lies die Antwort, dann sende deine trotzdem oder ändere sie.»
  - Meldung an die Kontaktperson: Titel «Clubmeisterschaft», Text «Neue Nachricht an die Turnierleitung.», Pfad `/verwaltung/turniere/<tid>/nachrichten/<gid>`; ans Mitglied: Text «Die Turnierleitung hat dir geantwortet.», Pfad `/clubmeisterschaft/<tid>/kontakt`
- Nachricht: nach `trim` 1 bis 1000 Zeichen, gezählt in Unicode-Codepunkten (`[...text].length`, wie `char_length` in Postgres).
- Commits `feat:` / `docs:` / `test:`, Dateien einzeln stagen. Migration mit `npm run db:generate`, nie eine eingespielte neu erzeugen. E2E immer im Hintergrund starten.

## Review Focus

1. **Kontaktperson verliert die Rolle, ist gesperrt oder das Turnierjahr ist vorbei, während das Mitglied die Seite offen hat:** Senden gibt 409 `nur-lesen`; die Seite zeigt dann den Verlauf ohne Feld und den Satz «Schreiben geht zurzeit nicht.» (Task 2 DB-Test, Task 5 Komponente).
2. **Leere Nachricht, nur Leerraum, 1001 Zeichen oder 1000 Emoji:** Leer und 1001 geben 400 mit `felder.text`, 1000 Emoji gehen durch (Task 3).
3. **Zwei CM-Admins antworten fast gleichzeitig:** Der zweite bekommt 409 `inzwischen` mit dem neuen Verlauf und sendet erst mit `trotzdem: true` (Task 3).
4. **Wer darf was lesen:** Mitglieder-Admin und gewöhnliches Mitglied bekommen 403 auf den Admin-Schnittstellen; die Mitglieder-Antwort enthält nie `adminMitgliedId` oder Admin-Namen; MyTCO-Admin bekommt 403 beim Schreiben; «Ansicht als …» blockt auch `gelesen` (Task 3).
5. **Mitglied wird endgültig gelöscht oder ein antwortender Admin wird gelöscht:** Gespräch des Mitglieds weg; Antworten des Admins zeigen «Turnierleitung (gelöschtes Konto)» (Task 4).

---

### Task 1: Doku vorweg — Datenschutz, Anforderung, Regeln, Rollen, Leitbild

**Files:**
- Modify: `docs/datenschutz.md` (*Welche Daten*, *Wer sieht was* für Mitglied, CM-Admin, MyTCO-Admin, *Löschen*, *Auskunft*, Änderungsprotokoll)
- Modify: `docs/datenschutzerklaerung.md`
- Modify: `docs/anforderungen/anforderungen.md` (A-TURNIER-04, Änderungsprotokoll), `docs/fachmodell.md` (Gespräch, Nachricht, FR-50 … FR-54), `docs/rollen-und-rechte.md` (Matrix unter *CM-Anmeldung*)
- Modify: `docs/ui-leitbild.md` (Baustein Sprechblase, Karte «Fragen?» auf der CM-Seite, feste Ordnung für `/clubmeisterschaft/[id]/kontakt` und die zwei Verwaltungsseiten, Startseite)

- [ ] **Step 1: Datenschutz und Erklärung** nach Abschnitt *Datenschutz* der Spec; Änderungseintrag 09.11.2026. Knapp halten (eine Zeile je Stelle).
- [ ] **Step 2: Anforderung und Regeln.** A-TURNIER-04 «Ein Mitglied schreibt der Turnierleitung und liest die Antwort in MyTCO; alle CM-Admins sehen und beantworten die Gespräche», Quelle PL, Etappe CM-Anmeldung, Status umgesetzt. Regeln (Status umgesetzt):
  - FR-50 Ein Gespräch je Mitglied und Turnier; es entsteht mit der ersten Nachricht. Eine Nachricht hat 1–1000 Zeichen, nur Text, und lässt sich nicht ändern oder löschen.
  - FR-51 Schreiben darf ein aktives Mitglied, solange das Turnier für Mitglieder sichtbar ist, eine gültige Kontaktperson hat und das Turnierjahr nicht vorbei ist; die Kontaktperson selbst schreibt nicht als Mitglied. Sonst nur lesen. Antworten dürfen CM-Admins bis Ende des Turnierjahres.
  - FR-52 Zustand *offen*/*erledigt*: Eine Nachricht des Mitglieds setzt *offen*, eine Antwort ändert ihn nicht; jeder CM-Admin setzt ihn.
  - FR-53 Meldung ohne Inhalt und ohne Namen (DS-05): bei einer Nachricht des Mitglieds nur an die gültige Kontaktperson, bei einer Antwort ans Mitglied; das Mitglied sieht nie, welcher Admin antwortet.
  - FR-54 Gelöscht werden die Gespräche eines Turniers ab dem 1.1. nach dem Turnierjahr (Zürich) und das Gespräch eines Mitglieds bei seiner endgültigen Löschung.
- [ ] **Step 3: Rollen.** Matrixzeile «Gespräch mit der Turnierleitung»: Mitglied S (eigenes), CM-Admin S, Mitglieder-Admin –, Lizenz-Admin –, MyTCO-Admin L.
- [ ] **Step 4: Leitbild.** Baustein *Sprechblase* `.verlauf` (Liste) / `.blase` mit `.blase-eigen` (rechts, `farbe-marke-zart`) und `.blase-leitung` (links, `farbe-flaeche`), Kopf `.blase-kopf` leise; nur in der Mitglieder-App. Seiten nach Spec und Entwurf.
- [ ] **Step 5:** `make doku-check` (bzw. Doku-Check aus `make help`). Expected: «Doku-Check ok.» Commit `docs: Gespräch mit der Turnierleitung in Datenschutz, Anforderungen und Leitbild (#71)`.

### Task 2: Datenbank und Fachlogik

**Files:**
- Modify: `src/lib/server/db/schema.ts`; Create: `drizzle/0018_*.sql` (generiert)
- Create: `src/lib/server/gespraech/gespraech.ts`
- Test: `src/lib/server/gespraech/gespraech.db.test.ts`

**Interfaces:**
- Produces (Schema):
  - `gespraech`: `id` serial, `turnierId` → `turnier.id` on delete cascade, `mitgliedId` → `mitglied.id`, `zustand` text `'offen'|'erledigt'` default `'offen'` (Check), `gelesenAm` timestamptz nullbar (zuletzt vom Mitglied geöffnet), `letzteAm` timestamptz not null; unique `(turnier_id, mitglied_id)`
  - `nachricht`: `id` serial, `gespraechId` → `gespraech.id` cascade, `von` text `'mitglied'|'leitung'` (Check), `adminMitgliedId` → `mitglied.id` nullbar (nur bei `leitung`), `text` text not null mit Check `char_length(text) between 1 and 1000`, `gesendetAm` timestamptz not null; Index auf `gespraech_id`
- Produces (Funktionen in `gespraech.ts`, alle mit `db: DbOderTx` zuerst):
  - `type EigeneNachricht = { id: number; von: 'du' | 'leitung'; text: string; gesendetAm: Date; neu: boolean }`
  - `type EigenesGespraech = { turnier: { id: number; name: string }; kontakt: Namensteile | null; schreiben: boolean; nachrichten: EigeneNachricht[] }`
  - `ladeEigenesGespraech(db, turnierId, mitgliedId, jetzt): Promise<EigenesGespraech | null>` — `null` bei unbekanntem Turnier oder `vorbereitung`; ohne Gespräch `nachrichten: []`
  - `gespraechStand(db, turnierId, mitgliedId, jetzt): Promise<{ vorhanden: boolean; neueAntwort: boolean; schreiben: boolean }>`
  - `schreibeAlsMitglied(db, turnierId, mitgliedId, text, jetzt): Promise<{ ergebnis: 'ok'; gespraechId: number; kontaktId: number } | 'nicht-gefunden' | 'nur-lesen'>`
  - `markiereGelesen(db, turnierId, mitgliedId, jetzt): Promise<void>`
  - `type GespraechZeile = { id: number; mitglied: Namensteile; letzte: { von: 'mitglied' | 'leitung'; text: string; gesendetAm: Date }; zustand: 'offen' | 'erledigt' }`
  - `listeGespraeche(db, turnierId): Promise<{ turnier: { id: number; name: string; jahr: number }; kontakt: Namensteile | null; zeilen: GespraechZeile[] } | null>` — offene zuerst, darin neueste Nachricht des Mitglieds oben
  - `type AdminNachricht = { id: number; von: 'mitglied' | 'leitung'; admin: Namensteile | null; text: string; gesendetAm: Date }`
  - `ladeGespraech(db, gespraechId, jetzt): Promise<{ id: number; turnier: { id: number; name: string }; mitglied: Namensteile; zustand: 'offen' | 'erledigt'; antworten: boolean; nachrichten: AdminNachricht[] } | null>` — `antworten: false` ab 1.1. nach dem Turnierjahr
  - `antworte(db, gespraechId, adminId, text, nachLetzter: number, trotzdem: boolean, jetzt): Promise<{ ergebnis: 'ok'; mitgliedId: number; turnierId: number } | { ergebnis: 'inzwischen' } | 'nicht-gefunden' | 'nur-lesen'>` — `inzwischen`, wenn nach `nachLetzter` eine Antwort der Leitung kam und `trotzdem` false ist
  - `setzeZustand(db, gespraechId, zustand: 'offen' | 'erledigt'): Promise<'ok' | 'nicht-gefunden'>`
  - `offeneZahlen(db, turnierIds: number[]): Promise<Map<number, { offen: number; erledigt: number }>>`
  - `offeneGespraecheGesamt(db, jetzt): Promise<number>` — offene Gespräche in Turnieren ab `jahrInZuerich(jetzt)`, nicht in Vorbereitung
- Consumes: `kontaktGueltig` (`src/lib/server/turnier/kontakt.ts`), `namensSpalten` (`src/lib/server/namen.ts`), `jahrInZuerich` (`src/lib/server/datum.ts`)

- [ ] **Step 1: Failing DB-Tests** (`describe('A-TURNIER-04 …')`, je Regel ein `test('FR-5x …')`):
  - FR-50: zwei Nachrichten desselben Mitglieds → ein Gespräch, zwei Nachrichten; Gespräch entsteht erst mit `schreibeAlsMitglied`, nicht mit `ladeEigenesGespraech`
  - FR-51: ohne Kontaktperson, Kontaktperson ohne Rolle `cm`, mit gesperrtem Konto, Turnier in `vorbereitung` (→ `nicht-gefunden`), `jetzt` = 2028-01-01T00:30+01:00 bei Turnier 2027, und die Kontaktperson selbst → je `nur-lesen` bzw. `schreiben: false`; `antworte` am 2028-01-01 → `nur-lesen`
  - FR-52: Antwort lässt `erledigt` stehen; neue Nachricht des Mitglieds setzt `offen`
  - `neu`/`neueAntwort`: Antwort nach `gelesenAm` ist `neu`; nach `markiereGelesen` nicht mehr
  - `antworte` mit veraltetem `nachLetzter` → `inzwischen`; mit `trotzdem: true` → `ok`
  - `ladeEigenesGespraech` gibt keine Admin-Daten zurück (`JSON.stringify` enthält den Admin-Namen nicht)
  - `listeGespraeche`-Ordnung und `offeneZahlen`
- [ ] **Step 2:** `npx vitest run src/lib/server/gespraech` → FAIL (Modul fehlt).
- [ ] **Step 3:** Schema ergänzen, `npm run db:generate`, Migration prüfen (zwei `CREATE TABLE`, Checks, Unique, Index). Funktionen umsetzen; `schreibeAlsMitglied` per `insert … on conflict (turnier_id, mitglied_id) do update set zustand='offen', letzte_am=…` in einer Transaktion.
- [ ] **Step 4:** Tests → PASS; `make seed` läuft.
- [ ] **Step 5:** Commit `feat: Gespräch und Nachricht mit Regeln FR-50 bis FR-52 (#71)`.

### Task 3: Schnittstellen und Meldungen

**Files:**
- Create: `src/lib/server/gespraech/schnittstellen.ts`, `src/lib/server/gespraech/meldung.ts`
- Create: `src/routes/api/cm/[id]/gespraech/+server.ts` (GET, POST), `src/routes/api/cm/[id]/gespraech/gelesen/+server.ts` (POST)
- Create: `src/routes/api/admin/turniere/[id]/gespraeche/+server.ts` (GET), `src/routes/api/admin/gespraeche/[id]/+server.ts` (GET, POST), `src/routes/api/admin/gespraeche/[id]/zustand/+server.ts` (POST)
- Modify: `src/lib/server/cm/anmeldungen.ts` (`CmAnsicht.gespraech`, `CmStand.neueAntwort`), `src/lib/server/login/schnittstellen.ts` (`getSitzung`: `nachrichtenOffen`), `src/lib/server/turnier/turniere.ts` (`TurnierDetail.nachrichten`, `TurnierZeile.offen`)
- Test: `src/lib/server/gespraech/schnittstellen.db.test.ts`, `src/lib/server/gespraech/meldung.test.ts`, bestehende Tests von `cm/anmeldungen`, `login/schnittstellen`, `turnier/turniere` ergänzen

**Interfaces:**
- Consumes: Task 2; `CmDienste` (`melde`), `MitteilungAdminDienste`, `liest`/`schreibt` mit Bereich `'cm'`, `antwort`, `istJson`, `leseKoerper`, `parseId`
- Produces:
  - `getGespraech(d: CmDienste, e)`, `postGespraech(d: CmDienste, e)` (Körper `{ text }`; 200 `EigenesGespraech`; 400 `{ fehler: 'eingabe', felder: { text } }`; 409 `{ fehler: 'nur-lesen' }`), `postGelesen(d, e)` → 204
  - `getGespraeche(d: MitteilungAdminDienste, e)`, `getAdminGespraech(d, e)`, `postAntwort(d, e)` (Körper `{ text, nachLetzter, trotzdem? }`; 409 `{ fehler: 'inzwischen' }` mit `gespraech`), `postZustand(d, e)` (Körper `{ zustand }`)
  - `meldung.ts`: `NACHRICHT_TEXT = 'Neue Nachricht an die Turnierleitung.'`, `ANTWORT_TEXT = 'Die Turnierleitung hat dir geantwortet.'`, `pfadVerwaltung(tid, gid)`, `pfadMitglied(tid)`
  - `CmAnsicht.gespraech: { vorhanden: boolean; neueAntwort: boolean; schreiben: boolean }`, `CmStand.neueAntwort: boolean`, Sitzung `nachrichtenOffen: number` (nur bei wirksamer Rolle `cm`, sonst 0), `TurnierDetail.nachrichten: { offen: number; erledigt: number }`, `TurnierZeile.offen: number`
  - Browser-Typen in `src/lib/cm/api.ts` (`holeGespraech`, `sendeNachricht`, `markiereGelesen`) und `src/lib/verwaltung/api.ts` (`holeGespraeche`, `holeGespraech`, `sendeAntwort`, `setzeZustand`) nach den bestehenden Mustern (`rufe`, `Json<…>`)

- [ ] **Step 1: Failing Tests:**
  - 401 ohne Sitzung; 403 für Mitglieder-Admin und Mitglied auf Admin-Routen; MyTCO-Admin liest (200), schreibt nicht (403)
  - `postGespraech` mit `''`, `'   '`, 1001 × «a» → 400 `felder.text`; 1000 × «🎾» → 200
  - Meldung (FR-53, Melder als Spy): Nachricht des Mitglieds → genau `[kontaktId]` mit `NACHRICHT_TEXT` und Verwaltungs-Pfad; ohne gültige Kontaktperson keine Meldung (409 vorher); Antwort → `[mitgliedId]` mit `ANTWORT_TEXT`; Text der Meldung enthält weder Nachrichtentext noch Namen
  - `postAntwort` veraltet → 409 `inzwischen` mit aktuellem Verlauf; mit `trotzdem: true` → 200
  - «Ansicht als …»: `postGelesen` und `postGespraech` werden vom `riegel` abgewiesen (nicht in `ERLAUBT_IN_ANSICHT`)
  - `getSitzung`: CM-Admin mit 2 offenen → `nachrichtenOffen: 2`; MyTCO-Admin → 0
  - `ladeCmAnsicht` und `laufendeTurniere` liefern `gespraech` bzw. `neueAntwort`
- [ ] **Step 2:** Run `npx vitest run src/lib/server` → FAIL.
- [ ] **Step 3:** Umsetzen. Meldungen nach dem Speichern, ohne darauf zu warten (`void … .catch(() => {})` wie `melde` in `turnier/schnittstellen.ts`); keine Meldung, wenn Empfänger = Absender.
- [ ] **Step 4:** Tests → PASS; `npm run check` ohne Typfehler.
- [ ] **Step 5:** Commit `feat: Schnittstellen und Meldungen für das Gespräch mit der Turnierleitung (#71)`.

### Task 4: Löschen (FR-54)

**Files:**
- Modify: `src/lib/server/admin/loeschung.ts` (`loescheKonten`, `raeumeAuf`, `Loeschlauf.gespraeche: number`)
- Modify: `src/lib/server/admin/auskunft.ts` nicht (Spec: Gespräche nicht in der Auskunft)
- Test: `src/lib/server/admin/loeschung.db.test.ts`

- [ ] **Step 1: Failing Tests `FR-54`:** `raeumeAuf` am 2027-12-31T23:30+01:00 lässt die Gespräche von 2027, am 2028-01-01T00:30+01:00 sind sie weg (Nachrichten per Cascade); endgültige Löschung eines Mitglieds entfernt sein Gespräch, Vormerken nicht; Löschung eines antwortenden Admins setzt `nachricht.adminMitgliedId` auf `null`, `ladeGespraech` liefert `admin: null`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** In `loescheKonten` (Schritt 1) `nachricht.adminMitgliedId` leeren und Gespräche der `ids` löschen; in `raeumeAuf` Gespräche löschen, deren Turnier `jahr < jahrInZuerich(jetzt)`; Log-Zeile um `gespraeche` ergänzen. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: Gespräche nach dem Turnierjahr und mit dem Mitglied löschen (#71)`.

### Task 5: Mitglieder-App — CM-Karte, Gesprächsseite, Startseite

**Files:**
- Modify: `src/lib/design/basis.css` (`.verlauf`, `.blase`, `.blase-eigen`, `.blase-leitung`, `.blase-kopf`, nur Tokens)
- Modify: `src/routes/clubmeisterschaft/[id]/+page.svelte` (Satz → Karte «Fragen oder Probleme?»)
- Create: `src/routes/clubmeisterschaft/[id]/kontakt/+page.ts`, `+page.svelte`
- Modify: `src/lib/ui/navigation.ts` (Route `/clubmeisterschaft/[id]/kontakt`: Bereich CM, Stufe 2, Eltern `/clubmeisterschaft/[id]`), `src/routes/+page.svelte` (Kachel «Neue Antwort…» je Turnier mit `neueAntwort` zuoberst unter «Jetzt aktuell»; Verwaltung-Kachel mit Zähler)
- Test: `src/lib/ui/navigation.test.ts`, neue E2E `tests/e2e/cm-gespraech.test.ts`

- [ ] **Step 1: Failing Tests:** Navigation (Eltern und Stufe der neuen Route); E2E (iPhone- und Android-Profil, `startetVomSymbol(page)`): Mitglied sieht die Karte mit Kontaktperson, öffnet das Gespräch, sendet «Kann ich die Gruppenspiele vorziehen?», sieht die eigene Blase; ohne Kontaktperson keine Karte; die Kontaktperson selbst sieht die Karte ohne Kachel; nur lesend ohne Feld mit «Schreiben geht zurzeit nicht.»; nach einer Antwort (per Schnittstelle als Seed-Admin) Plakette «neue Antwort» auf der CM-Seite und Kachel auf der Startseite, nach dem Öffnen beide weg.
- [ ] **Step 2:** Run (E2E im Hintergrund) → FAIL.
- [ ] **Step 3:** Umsetzen nach Entwurf (Artboards «B – CM-Seite», «A – Gespräch als Sprechblasen», «Startseite: neue Antwort», «Startseite CM-Admin»). Die Seite ruft nach dem Laden `markiereGelesen` auf (nicht in «Ansicht als …»). Fehler 409 `nur-lesen` lädt das Gespräch neu und zeigt den Satz. Feld mit `maxlength` 1000, Fehler beim Feld (UI-06).
- [ ] **Step 4:** Run → PASS; `svelte-autofixer` ohne Befunde, axe ohne Verstösse.
- [ ] **Step 5:** Commit `feat: Gespräch mit der Turnierleitung in der Mitglieder-App (#71)`.

### Task 6: Verwaltung — Abschnitt im Turnier, Posteingang, Gespräch

**Files:**
- Modify: `src/routes/verwaltung/turniere/[id]/+page.svelte` (Abschnitt «Nachrichten» vor «Anmeldung»), `src/routes/verwaltung/turniere/+page.svelte` (Spalte «Offen» mit `TurnierZeile.offen`)
- Create: `src/routes/verwaltung/turniere/[id]/nachrichten/+page.ts`, `+page.svelte`; `src/routes/verwaltung/turniere/[id]/nachrichten/[gid]/+page.ts`, `+page.svelte`
- Test: E2E `tests/e2e/cm-gespraech.test.ts` (Verwaltungsteil)

- [ ] **Step 1: Failing E2E:** Kontaktperson (Hanna Muster) bekommt eine Mail «Neue Nachricht an die Turnierleitung.» (Mailpit, ohne Abo); ein zweiter CM-Admin sieht im Posteingang «offen», antwortet, Mitglied liest «Turnierleitung»; «Als erledigt markieren» → Plakette «erledigt», Zähler sinkt; gleichzeitige Antwort zeigt den Hinweis «Inzwischen hat jemand geantwortet …»; MyTCO-Admin sieht alles mit «Nur ansehen» und ohne Feld; `gid` aus einem anderen Turnier → zurück zum Posteingang.
- [ ] **Step 2:** Run (Hintergrund) → FAIL.
- [ ] **Step 3:** Umsetzen nach Entwurf (Seitenkopf mit Pfad «Turniere › <Turnier> › Nachrichten › <Nachname, Vorname>», Tabelle, Kennzahlen, Verlauf als Kartenteile, `fieldset.nur-lesen` für lesende Rollen).
- [ ] **Step 4:** Run → PASS; `svelte-autofixer`, axe.
- [ ] **Step 5:** Commit `feat: Posteingang der Turnierleitung in der Verwaltung (#71)`.

### Task 7: Seed, Restdoku, Abschluss

**Files:**
- Modify: `scripts/beispiel-turnier.ts` (erfundene Gespräche: eines offen, eines erledigt, eines mit neuer Antwort von Hanna Muster), `docs/context-scopes.md`, `docs/versionen.md` («Unveröffentlicht»)
- Modify: `docs/abklaerungen.md` (neue Frage K-NN an den Vorstand: Chats unter Mitgliedern in MyTCO?) — die Fragen-Tabelle ergänzt die Hauptsession, nicht der Implementer

- [ ] **Step 1:** Seed ergänzen, `make seed` → läuft; Doku nachführen; `make annahmen` ok.
- [ ] **Step 2:** `make check` auf dem committeten Stand (Hintergrund) → grün.
- [ ] **Step 3:** Screenshots auf Handy-Breite (CM-Seite mit Karte, Gespräch, Startseite) und PC (Posteingang, Gespräch) für den Bildvergleich mit dem Entwurf.
- [ ] **Step 4:** Commit `docs: Seed und Doku zum Gespräch mit der Turnierleitung (#71)`.
