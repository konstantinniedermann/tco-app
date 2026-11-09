[← Übersicht](../../index.md)

# CM-Übersicht entschlacken — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Seite einer CM zeigt den eigenen Stand als Plakette, keine Namenslisten mehr (die stehen auf einer neuen Seite der Kategorie), und nennt die vom CM-Admin gewählte Kontaktperson.

**Architecture:** Eine neue nullbare Spalte `turnier.kontakt_mitglied_id`. Die Verwaltung setzt sie über das bestehende Turnierformular. `ladeCmAnsicht` liefert den Namen nur, solange die Person gültig CM-Admin ist. Die neue Seite `/clubmeisterschaft/[id]/kategorie/[kid]` liest dieselbe Antwort `GET /api/cm/[id]` wie die Übersicht. Eine neue Schnittstelle für Mitglieder gibt es nicht.

**Tech Stack:** SvelteKit (Svelte 5 Runes), TypeScript, Drizzle/PostgreSQL, Vitest (`*.test.ts`, `*.db.test.ts`), Playwright (`tests/e2e`).

**Spec:** `docs/superpowers/specs/2026-11-09-cm-uebersicht-design.md`

## Global Constraints

- Svelte-Code nur nach aktueller Doku über den Svelte-MCP-Server. Jede geänderte `.svelte`-Datei läuft durch `svelte-autofixer`.
- Oberfläche nur aus Tokens und Bausteinen von `docs/ui-leitbild.md`. Neue Bausteine kommen zuerst ins Leitbild und dann genau einmal als Klasse nach `src/lib/design/basis.css`.
- Unter `src/routes` keine Server-Dateien ausser `+server.ts` (ADR-002).
- Keine neuen Abhängigkeiten.
- Testdaten sind erfunden. Die Seed-Persona «Hanna Muster» (CM-Admin) darf als Kontaktperson im Beispielturnier stehen.
- Datenschutzkonzept und Datenschutzerklärung werden **vor** dem Code nachgeführt (Task 1).
- Wortlaut aus der Spec:
  - Kontakt-Satz: «Bei Fragen oder Problemen melde dich bei <Name> (CM-Admin).»
  - Plaketten: «angemeldet» (`plakette-ok`), «sucht Partner» (`plakette-offen`), «Wildcard beantragt» (`plakette-offen`)
  - Link-Kachel: «N angemeldet», im Doppel «N Paare» (1: «1 Paar»), bei 0 «Noch niemand angemeldet», jeweils mit «›»
  - Klappe der Suchenden: «N suchen Partner» (1: «1 sucht Partner»)
  - Verwaltung: «Keine Kontaktperson gewählt.» bzw. «Die Kontaktperson ist nicht mehr CM-Admin.»; Wahl «<Name> (nicht mehr CM-Admin)»
- Commits: `feat:` / `docs:` / `test:`. Dateien einzeln stagen.
- Migrationen: `npm run db:generate`. Nie eine eingespielte Migration neu erzeugen.

## Review Focus

1. **Person verliert die Rolle, wird gesperrt, tritt aus oder wird zum Löschen vorgemerkt:** Der Satz verschwindet sofort, ohne dass jemand das Turnier neu speichert (Task 3, DB-Tests).
2. **Speichern des Turniers mit einer ungültig gewordenen Kontaktperson, ohne sie zu ändern:** Das geht, und der Wert bleibt. Wählt man dagegen jemand Neues ohne Rolle, lehnt der Server ab (Task 2, DB-Tests).
3. **Direktaufruf von `/clubmeisterschaft/[id]/kategorie/[kid]` mit einer fremden, abgesagten oder unpassenden Kategorie oder einer Kategorie aus einem anderen Turnier:** Die Seite leitet zur Seite der CM um (Task 6, E2E).
4. **Grosse Schrift oder ein langer Kategoriename auf 375 px Breite:** Die Plakette rutscht unter den Namen und schneidet nichts ab (Task 5, Screenshot-Prüfung mit `page.setViewportSize` und langem Namen).
5. **Fehlende Angaben (Karte «Deine Angaben») oder keine passende Kategorie:** Der Kontakt-Satz steht trotzdem am Ende der Seite (Task 5, E2E).

---

### Task 1: Doku vorweg — Datenschutz, Leitbild, Fachmodell, Rollen

**Files:**
- Modify: `docs/datenschutz.md` (Zeile *Alle Mitglieder* in «Wer sieht was», Abschnitt «Änderungen an diesem Konzept»)
- Modify: `docs/datenschutzerklaerung.md` (Aufzählung «Alle Mitglieder sehen …», Zeile 50)
- Modify: `docs/ui-leitbild.md` (Bausteine, Beschreibung der CM-Seite, feste Ordnung)
- Modify: `docs/fachmodell.md`, `docs/rollen-und-rechte.md`

- [ ] **Step 1: Datenschutz.** Bei *Alle Mitglieder* ergänzen: «den Namen (mit Rufname) der Kontaktperson, die der CM-Admin für das Turnier gewählt hat, ohne E-Mail und Telefon». Änderungseintrag mit Datum 09.11.2026. Erklärung: ein Satz im selben Sinn bei «Alle Mitglieder sehen …».
- [ ] **Step 2: Leitbild, Bausteine.**
  - Neue Zeile *Kartenkopf* `.karte-kopf`: Titel einer Karte links, eine Plakette mit dem eigenen Stand rechts oben. Bricht bei Platzmangel um, die Plakette steht dann unter dem Titel. Der Titel wird nie abgeschnitten.
  - *Aufklappbereich* ergänzen: innerhalb einer Karte als `details.klappe.karte-teil`, ohne eigene Fläche, Trennlinie oben wie ein Kartenteil.
  - *Kachel* ergänzen: als Kartenteil `a.kachel.karte-teil`, z. B. «12 angemeldet ›».
  - Beim Baustein *Zähler* das Beispiel «1 von 3 Anmeldungen» streichen.
- [ ] **Step 3: Leitbild, Seiten.** Feste Ordnung: neue Zeile «Kategorie einer CM | CM | „‹ <Name der CM>"». Beschreibung der CM-Seite nach der Spec anpassen (kein Zähler, Kartenkopf, Link-Kachel, Kontakt-Satz am Seitenende).
- [ ] **Step 4: Fachmodell und Rollen.** Fachmodell: Turnier hat 0..1 Kontaktperson (Mitglied mit Rolle CM-Admin). Rollen-und-Rechte: Der CM-Admin wählt die Kontaktperson, der MyTCO-Admin liest nur.
- [ ] **Step 5: Prüfen und committen.** Run `make doku-check` (bzw. den Doku-Check aus `make help`). Expected: «Doku-Check ok.»
  ```bash
  git add docs/datenschutz.md docs/datenschutzerklaerung.md docs/ui-leitbild.md docs/fachmodell.md docs/rollen-und-rechte.md
  git commit -m "docs: Kontaktperson pro Turnier und neue Bausteine der CM-Seite"
  ```

### Task 2: Kontaktperson speichern (Datenbank, Verwaltungs-Schnittstelle)

**Files:**
- Modify: `src/lib/server/db/schema.ts` (Tabelle `turnier`)
- Create: `drizzle/00NN_*.sql` (generiert)
- Modify: `src/lib/server/turnier/angaben.ts` (`TurnierWerte`, `pruefeTurnier`)
- Modify: `src/lib/server/turnier/turniere.ts` (`TurnierDetail`, `ladeTurnier`, `aendereTurnier`)
- Modify: `src/lib/server/turnier/schnittstellen.ts` (`postTurnier`: 400 mit `felder.kontakt`)
- Modify: `scripts/beispiel-turnier.ts` (Hanna Muster als Kontaktperson, falls vorhanden)
- Test: `src/lib/server/turnier/turniere.db.test.ts`, `src/lib/server/turnier/schnittstellen.db.test.ts`, `src/lib/server/turnier/angaben.test.ts`

**Interfaces:**
- Produces:
  - Spalte `turnier.kontaktMitgliedId: integer('kontakt_mitglied_id').references(() => mitglied.id, { onDelete: 'set null' })`, nullbar
  - `TurnierWerte.kontakt?: number | null`. Fehlt der Schlüssel im Körper, bleibt die Kontaktperson unverändert. `null` heisst keine. Erlaubt ist eine positive ganze Zahl, sonst `felder.kontakt = 'Bitte eine Person aus der Liste wählen.'`
  - `TurnierDetail.kontakt: { mitgliedId: number; name: Namensteile; gueltig: boolean } | null`
  - `TurnierDetail.kontaktWahl: { mitgliedId: number; name: Namensteile }[]`: alle gültigen CM-Admins (aktiv, Konto nicht gesperrt), sortiert nach Nachname, dann Vorname
  - `export async function kontaktGueltig(db: DbOderTx, mitgliedId: number): Promise<boolean>` in `turniere.ts`. Gültig heisst: Mitglied `status = 'aktiv'`, Konto nicht gesperrt, Rolle `cm`. Task 3 nutzt die Funktion.
  - `aendereTurnier` liefert zusätzlich `'kontakt-ungueltig'`, wenn `kontakt` gesetzt ist, vom gespeicherten Wert abweicht und `kontaktGueltig` falsch ist. `postTurnier` antwortet dann `400 { fehler: 'eingabe', felder: { kontakt: 'Diese Person ist nicht CM-Admin.' } }`.
  - `legeTurnierAn` ignoriert `kontakt` (Neues Turnier hat kein Feld, *Entscheid Claude*).

- [ ] **Step 1: Failing Tests.**
  - `angaben.test.ts`, «kontakt fehlt → undefined, null → null, 7 → 7, 'x' / 0 / -1 → Feldfehler kontakt».
  - `turniere.db.test.ts`:
    - «speichert einen CM-Admin als Kontakt, ladeTurnier zeigt ihn gueltig»
    - «lehnt ein Mitglied ohne Rolle cm ab (kontakt-ungueltig)»
    - «behält eine ungültig gewordene Kontaktperson beim Speichern ohne Änderung, ladeTurnier meldet gueltig: false»
    - «kontaktWahl enthält nur aktive, nicht gesperrte CM-Admins»
    - «Speichern ohne Schlüssel kontakt lässt ihn stehen»
- [ ] **Step 2:** Run `npx vitest run src/lib/server/turnier`. Expected: die neuen Tests FAIL.
- [ ] **Step 3:** Spalte ergänzen, `npm run db:generate`, Migration prüfen (nur `ALTER TABLE … ADD COLUMN … REFERENCES … ON DELETE SET NULL`). Dann `pruefeTurnier`, `ladeTurnier`, `aendereTurnier` und `postTurnier` wie oben umsetzen. Namen über `namensSpalten` aus `src/lib/server/namen.ts`.
- [ ] **Step 4:** Run `npx vitest run src/lib/server/turnier`. Expected: PASS. Dazu `make seed`: läuft ohne Fehler.
- [ ] **Step 5: Commit** `feat: Kontaktperson pro Turnier speichern (nur CM-Admins)`

### Task 3: Kontaktperson in der Ansicht der Mitglieder

**Files:**
- Modify: `src/lib/server/cm/anmeldungen.ts` (`CmAnsicht`, `ladeCmAnsicht`)
- Test: `src/lib/server/cm/anmeldungen.db.test.ts` (bzw. die bestehende DB-Testdatei zu `ladeCmAnsicht`)

**Interfaces:**
- Consumes: `kontaktGueltig` (Task 2)
- Produces: `CmAnsicht.kontakt: Namensteile | null`, gefüllt auch dann, wenn `fehlt.length > 0`

- [ ] **Step 1: Failing Tests.** «kontakt ist der Name der gewählten CM-Admin». Dazu je ein Test, dass `kontakt` null ist:
  - wenn keine Person gewählt ist
  - nach Entzug der Rolle `cm`
  - bei gesperrtem Konto
  - bei Status `ausgetreten`
  - bei Status `vorgemerkt`
  - auch wenn dem Spieler Angaben fehlen (dann ist `kontakt` trotzdem gesetzt)
- [ ] **Step 2:** Run den Test. Expected: FAIL.
- [ ] **Step 3:** `ladeCmAnsicht` liest `t.kontaktMitgliedId`, prüft ihn mit `kontaktGueltig` und lädt die Namensteile.
- [ ] **Step 4:** Run. Expected: PASS. Dazu `npx tsc --noEmit -p .` bzw. `npm run check`: keine Typfehler (der Browser-Typ `CmAnsicht` in `src/lib/cm/api.ts` leitet sich davon ab).
- [ ] **Step 5: Commit** `feat: Kontaktperson der CM für Mitglieder, nur solange sie CM-Admin ist`

### Task 4: Kontaktperson im Turnierformular

**Files:**
- Modify: `src/lib/verwaltung/Turnierformular.svelte` (neues Feld, nur wenn die Prop `kontaktWahl` gesetzt ist)
- Modify: `src/lib/verwaltung/api.ts` (Typ `TurnierAnsicht`, `TurnierFeld` um `'kontakt'`, Senden von `kontakt`)
- Modify: `src/routes/verwaltung/turniere/[id]/+page.svelte` (Prop übergeben, Hinweis anzeigen)
- Test: `tests/e2e/turnier.test.ts`

**Interfaces:**
- Consumes: `TurnierDetail.kontakt`, `TurnierDetail.kontaktWahl` (Task 2)
- Produces: Formular-Wert `TurnierWerte.kontakt: string` (`''` = keine, sonst Mitglied-ID als Text). `werteAusTurnier` belegt ihn vor.

- [ ] **Step 1: Failing E2E.** In `turnier.test.ts`, Test «Kontaktperson wählen»:
  - Der CM-Admin öffnet das Beispielturnier und wählt im Auswahlfeld «Kontaktperson» (Label exakt) eine CM-Admin-Person.
  - Er speichert, lädt neu, und der Wert steht noch.
  - Mit «keine» gespeichert, erscheint der Text «Keine Kontaktperson gewählt.».
- [ ] **Step 2:** Run `npm run e2e -- tests/e2e/turnier.test.ts` (im Hintergrund, siehe Memory zum E2E-Lauf). Expected: FAIL.
- [ ] **Step 3: Umsetzen.**
  - Das Feld folgt dem Baustein *Eingabefeld* (`select`): Bezeichnung «Kontaktperson» mit «(freiwillig)», Hilfetext «Ihren Namen sehen alle Mitglieder auf der Seite der Clubmeisterschaft.»
  - Optionen: «keine», dann `kontaktWahl` mit `nameText(n, 'vorname-zuerst')`. Bei `kontakt.gueltig === false` zusätzlich die gespeicherte Person als «<Name> (nicht mehr CM-Admin)», vorgewählt.
  - Der Hinweistext steht unter dem Formular (`.leise`).
  - `geaendert` berücksichtigt `kontakt`.
  - Im Nur-lesen-Modus ist das Feld gesperrt.
- [ ] **Step 4:** Run E2E erneut. Expected: PASS. Dazu `svelte-autofixer` auf beide Svelte-Dateien: keine Befunde.
- [ ] **Step 5: Commit** `feat: Kontaktperson im Turnierformular wählen`

### Task 5: Seite einer CM umbauen

**Files:**
- Modify: `src/lib/cm/anzeige.ts` (neue Funktionen, `namenText` / `paareText` / `weiterePaare` entfernen, sobald unbenutzt)
- Modify: `src/lib/design/basis.css` (`.karte-kopf`, `details.klappe.karte-teil`, `a.kachel.karte-teil`)
- Modify: `src/routes/clubmeisterschaft/[id]/+page.svelte`
- Test: `src/lib/cm/anzeige.test.ts`, `tests/e2e/cm-anmeldung.test.ts`, `tests/e2e/cm-doppel.test.ts`, `tests/e2e/cm-verwaltung.test.ts` (Zeile 242)

**Interfaces:**
- Consumes: `CmAnsicht.kontakt` (Task 3)
- Produces (in `src/lib/cm/anzeige.ts`):
  - `standPlakette(k: CmKategorie, wildcard: boolean): { text: 'angemeldet' | 'sucht Partner' | 'Wildcard beantragt'; art: 'ok' | 'offen' } | null`
  - `anmeldungenText(k: CmKategorie): string`: «Noch niemand angemeldet», «1 angemeldet», «12 angemeldet»; im Doppel «1 Paar» bzw. «5 Paare»
  - `suchendeText(n: number): string`: «1 sucht Partner», «3 suchen Partner»
  - `KONTAKT_FRAGEN = (name: string) => \`Bei Fragen oder Problemen melde dich bei ${name} (CM-Admin).\``

- [ ] **Step 1: Failing Unit-Tests** in `anzeige.test.ts`, mit den exakten Texten oben:
  - Einzel angemeldet → «angemeldet»/ok
  - Doppel `eigen.art === 'paar'` → «angemeldet»/ok
  - Doppel `eigen.art === 'sucht'` → «sucht Partner»/offen
  - Wildcard mit `anmeldungId` → «Wildcard beantragt»/offen
  - nicht angemeldet → null
  - `anmeldungenText`: 0, 1 und 12 im Einzel, 1 und 5 im Doppel
  - `suchendeText`: 1 und 3
- [ ] **Step 2:** Run `npx vitest run src/lib/cm/anzeige.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Die Funktionen umsetzen. Run erneut. Expected: PASS.
- [ ] **Step 4: E2E anpassen (failing).**
  - `cm-anmeldung.test.ts`:
    - Die Zähler-Erwartungen (`'N von 3 Anmeldungen'`) ersetzen durch «kein Text `von 3 Anmeldungen`».
    - Nach dem Anmelden trägt die Karte die Plakette «angemeldet», nach dem Abmelden nicht mehr.
    - Bei 3 Anmeldungen erscheint «Mehr als 3 Anmeldungen gehen nicht.».
    - Statt `Angemeldet (1): …` steht die Link-Kachel «1 angemeldet»; die Namen stehen nicht in der Übersicht.
  - `cm-doppel.test.ts:320`: Kachel «1 Paar». Suchende zugeklappt: Der Name ist erst nach dem Tipp auf «1 sucht Partner» sichtbar.
  - Neuer Test «Kontakt-Satz»: Mit gewählter Kontaktperson (über die Verwaltungs-API im Test-Setup) steht «Bei Fragen oder Problemen melde dich bei … (CM-Admin).» am Seitenende. Das gilt auch für ein Mitglied, dem Angaben fehlen. Ohne Kontaktperson fehlt der Satz.
  - `cm-verwaltung.test.ts:242`: Zähler-Erwartung durch die Plakette ersetzen.
- [ ] **Step 5: Seite umbauen.**
  - Zähler-Block und `zaehlerBereich` entfernen; der Fokus geht nach dem Speichern der Angaben auf das `h1` der Seite (mit `tabindex="-1"`).
  - Alle Karten: Kopf als `.karte-kopf` mit Name (strong bzw. `h2`) und `standPlakette`.
  - «Du bist angemeldet.», `namenText`, `paareText`, «Weitere Paare» sowie die Plakette «sucht Partner» im Fliesstext von `eigeneSuche` entfernen.
  - Je Karte eine Link-Kachel `a.kachel.karte-teil` auf `/clubmeisterschaft/[id]/kategorie/[kid]` mit `anmeldungenText(k)`.
  - Snippet `suchende`: `details.klappe.karte-teil` mit `summary` = `suchendeText`. Der Zustand wird über `merkeKlappe('cm-suchende-<kid>')` gemerkt.
  - Den Satz «Zu starke Paare meldet die Turnierleitung an.» streichen.
  - Ganz am Ende der Seite, ausserhalb des `{#if fragtAngaben}`-Zweigs: `{#if cm.kontakt}<p class="leise">…KONTAKT_FRAGEN(nameText(cm.kontakt, 'vorname-zuerst'))…</p>{/if}`
  - CSS für die drei Bausteine einmal in `basis.css`, nur mit Tokens.
- [ ] **Step 6:** Run `npx vitest run` und die drei E2E-Dateien (Hintergrund). Expected: PASS. Dazu `svelte-autofixer` ohne Befunde und `make lint` grün.
- [ ] **Step 7: Commit** `feat: CM-Seite mit Plakette, ohne Zähler und Namenslisten, mit Kontaktperson`

### Task 6: Seite einer Kategorie

**Files:**
- Create: `src/routes/clubmeisterschaft/[id]/kategorie/[kid]/+page.ts`, `+page.svelte`
- Modify: `src/lib/cm/api.ts` (`kategorieZumAnsehen`)
- Modify: `src/lib/ui/navigation.ts` (BEREICH, EBENE = 2, `elternVon` → `{ route: '/clubmeisterschaft/[id]', text: null }`)
- Test: `src/lib/ui/navigation.test.ts`, `src/lib/cm/api.test.ts`, `tests/e2e/cm-anmeldung.test.ts`, `tests/e2e/cm-doppel.test.ts`

**Interfaces:**
- Produces: `export function kategorieZumAnsehen(cm: CmAnsicht, kategorieId: number): { kategorie: CmKategorie; wildcard: boolean } | null`. Gesucht wird in `cm.kategorien`, dann in `cm.wildcard`; nur Kategorien, die die Übersicht zeigt.

- [ ] **Step 1: Failing Tests.**
  - `api.test.ts`: findet eine Kategorie aus `kategorien` und eine aus `wildcard`; eine unbekannte ID gibt null.
  - `navigation.test.ts`: Bereich CM, Ebene 2, Eltern sind die Seite der CM.
  - E2E Einzel: Tipp auf «1 angemeldet ›» öffnet die Seite mit Titel = Kategoriename, Zurück-Link «‹ <Name der CM>» und dem eigenen Namen in der Liste.
  - E2E Doppel: Die Seite zeigt das Paar «A / B» und unter «Sucht Partner» Name und Kommentar.
  - E2E: Der Direktaufruf mit einer erfundenen `kid` (999999) landet auf der Seite der CM.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Umsetzen.**
  - `+page.ts` wie `doppel/[kid]/+page.ts`, mit `kategorieZumAnsehen` statt `doppelZurWahl`.
  - Seite:
    - `Zurueck` mit dem Namen der CM, `h1` mit dem Kategorienamen, darunter `kategorieText` bzw. `doppelText` als `.leise` und die eigene `standPlakette`
    - eine Karte «Angemeldet (N)» mit einer Zeile pro Name (`<Name>`) bzw. pro Paar (`paarText`)
    - im Doppel eine zweite Karte «Sucht Partner» mit Name und Kommentar
    - bei 0 der Text «Noch niemand angemeldet.»
    - keine Tasten
  - `svelte:head` title «<Kategorie> – MyTCO».
- [ ] **Step 4:** Run. Expected: PASS. Dazu `svelte-autofixer` ohne Befunde.
- [ ] **Step 5: Commit** `feat: Seite einer Kategorie mit allen Anmeldungen`

### Task 7: Abschluss — Doku, ganzer Check, Screenshots

**Files:**
- Modify: `docs/context-scopes.md` (Zeile *Clubmeisterschaft (Mitglieder)*: neue Route; Zeile *Verwaltung*: unverändert), `docs/versionen.md` («Unveröffentlicht»)

- [ ] **Step 1:** Doku nachführen. `docs/versionen.md` bekommt unter «Unveröffentlicht» den Eintrag: «CM-Seite übersichtlicher: eigener Stand als Plakette, Namen auf eigener Seite der Kategorie, Kontaktperson pro Turnier».
- [ ] **Step 2:** `make check` auf dem committeten Stand (im Hintergrund). Expected: grün.
- [ ] **Step 3:** Screenshots auf 390 px Breite (Playwright oder `make dev` mit `make seed`): Übersicht als Mitglied mit Doppel-Paar und Einzel-Anmeldung; Seite einer Kategorie; Turnierformular mit Kontaktperson. Ablage im Scratchpad, nicht im Repo.
- [ ] **Step 4:** Agent `cas-reviewer` und das superpowers-Review über den Branch. Befunde klären.
- [ ] **Step 5: Commit** `docs: Context-Scopes und Versionshinweis für die CM-Übersicht`
