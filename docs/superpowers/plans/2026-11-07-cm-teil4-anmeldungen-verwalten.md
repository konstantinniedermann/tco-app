# CM Teil 4 — Anmeldungen verwalten und Wildcard-Anträge (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der CM-Admin pflegt die Einzel-Anmeldungen einer Kategorie (Liste, von Hand anmelden,
verschieben, löschen, Klassierung korrigieren, Wildcard entscheiden); Mitglieder beantragen eine
Wildcard für eine stärkere Kategorie. Betroffene bekommen eine kurze Meldung per *Push, sonst
E-Mail*.

**Architektur:** Neue Fachlogik in `src/lib/server/cm/verwaltung.ts` (Verwaltung) und
`src/lib/server/cm/anmeldungen.ts` (Wildcard des Mitglieds), Passungsregel für die Wildcard in
`src/lib/turnier/passung.ts`. Persönliche Meldungen über ein neues Modul
`src/lib/server/mitteilung/meldung.ts`, das Push und Mail aus `versand.ts` wiederverwendet. Die
neuen Admin-Schnittstellen hängen an `TURNIER_SCHNITTSTELLEN` (Bauregel, Rechte-Test) und
bekommen die Dienste von `holeMitteilungAdminDienste()` (Push, Mailer, Adresse).

**Tech Stack:** SvelteKit (nur `+server.ts`, ssr aus), Drizzle/Postgres, Vitest (Einheit + DB),
Playwright (iPhone/Android/Desktop, axe).

**Spec:** `docs/superpowers/specs/2026-11-06-cm-anmeldung-design.md`, Abschnitt *Teil 4* mit
*Präzisierungen vor dem Bau (07.11.2026)*. Issue #60.

## Global Constraints

- Nur Einzel; Doppel-Verwaltung baut #59.
- Keine neuen Dependencies; keine Migration nötig (Status `beantragt`/`abgelehnt` und
  `anmeldung.kommentar` gibt es schon).
- Vor Svelte-Code die Doku über den Svelte-MCP-Server holen, danach `svelte-autofixer`.
- Unter `src/routes` nur `+server.ts`; Admin-Routen importieren nur `holeMitteilungAdminDienste`
  bzw. `holeAdminDienste` und Einträge aus `TURNIER_SCHNITTSTELLEN` (`scripts/pruefungen/bauregel.ts`).
- Oberfläche nur aus Bausteinen von `docs/ui-leitbild.md`; fehlt einer, zuerst ins Leitbild.
  Namen in der Verwaltung als «Nachname, Vorname». Höchstens eine Haupttaste je Bildschirm
  (im `<dialog>` zählt der Dialog als eigener Bildschirm).
- Texte kurz und knapp: Push, Ersatz-Mail und Oberfläche ein, höchstens zwei Sätze.
- Meldungen: Weg *Push, sonst E-Mail*, Themen-Schalter (FR-41) gelten nicht, ohne Abschalt-Fuss.
  Die Bestätigungsmail aus Teil 2 bleibt eine Mail.
- SI-05: Server loggt keine Adressen oder Fehlerdetails; SI-10: ändernde Anfragen nur als JSON.
- Testdaten erfunden (DS-08). Jede ID, die auf *umgesetzt* geht, steht im Namen eines Tests
  (`npm run pruefungen` → `test-ids`).
- Kommentar Wildcard: Pflicht, 1–300 Zeichen nach `trim`. Grund der Ablehnung: freiwillig,
  höchstens 200 Zeichen, wird nicht gespeichert.
- Commits einzeln stagen, Präfixe `feat:`/`fix:`/`docs:`/`test:`, Endzeilen laut Session.

## Review Focus

1. Mitglied zieht zurück, während der CM-Admin verschiebt oder entscheidet → kein doppelter
   Zustand; Sperrreihenfolge wie `meldeAn` (Mitglied `for update`, dann Kategorie `for share`,
   dann Anmeldung `for update`). Test in Task 4.
2. Verschieben in die eigene Kategorie oder in eine, in der der Spieler schon aktiv ist →
   `schon-angemeldet`, nichts geändert. Test in Task 4.
3. Entscheid über einen Antrag, der inzwischen zurückgezogen oder schon entschieden ist → 409
   `nicht-beantragt`, Seite lädt neu. Test in Task 4 und 5.
4. Wildcard «nach unten» (R4 in R7–R9) oder nur wegen Geschlecht/Jahrgang unpassend → keine
   Wildcard (`keine-wildcard`), auch wenn die Anfrage direkt an die Schnittstelle geht. Test in
   Task 2 und 6.
5. Turnier *in Vorbereitung*, Kategorie *abgesagt* oder Doppel → von Hand anmelden/verschieben
   abgewiesen (`vorbereitung` bzw. `nicht-gefunden`). Test in Task 4.

---

### Task 1: Doku vor dem Bau (Datenschutz, Rollen, Fachmodell)

**Files:**
- Modify: `docs/datenschutz.md` (*Wer sieht was*, Zeile CM-Admin)
- Modify: `docs/datenschutzerklaerung.md` (Wer sieht was: CM-Admin)
- Modify: `docs/rollen-und-rechte.md` (Matrix, RR-Regeln)
- Modify: `docs/fachmodell.md` (FR-08, FR-10, neue FR-46, FR-47)

- [ ] **Step 1:** Datenschutz: CM-Admin sieht zusätzlich *Geschlecht und Jahrgang der Spieler*
  (zum Zuordnen in Kategorien), ändern nur Mitglieder-Admin. Dieselbe Aussage in der
  Datenschutzerklärung, Abschnitt *Wer sieht was*.
- [ ] **Step 2:** RR-Matrix: Zeile «Eigener Name, Geschlecht, Jahrgang …» bleibt; neue Zeile unter
  *CM-Anmeldung*: «Geschlecht und Jahrgang der Spieler (zum Zuordnen)» = Mitglied `–`, CM-Admin
  `L`, Lizenz-Admin `–`, Mitglieder-Admin `S`, MyTCO-Admin `L`. Unter der Matrix ein Satz: Der
  CM-Admin darf sich selbst von Hand anmelden und über den eigenen Wildcard-Antrag entscheiden.
- [ ] **Step 3:** Fachmodell: FR-08 präzisieren («nur Einzel, nur in eine stärkere Kategorie,
  die nur wegen der Klassierung nicht passt; Pflichtkommentar; nach Ablehnung erneut möglich»).
  Neu, Status *geplant*:
  - `FR-46 | Der CM-Admin meldet von Hand an und verschiebt auch gegen FR-06, FR-07 und den
    Anmeldeschluss: MyTCO warnt, nach Bestätigung gilt es; nicht während *in Vorbereitung* |
    A-ANMELDUNG-06 | geplant`
  - `FR-47 | Meldungen der CM an Einzelne (Wildcard-Antrag an die CM-Admins, Entscheid, Änderung
    durch den CM-Admin) gehen *Push, sonst E-Mail*; die Themen (FR-41) gelten nicht |
    A-ANMELDUNG-06, A-ANMELDUNG-10 | geplant`
- [ ] **Step 4:** `make docs` → `Doku-Check ok.`
- [ ] **Step 5:** Commit `docs: Datenschutz, Rollen und Fachmodell für CM Teil 4 (#60)`

### Task 2: Wildcard-Regel in der Passung

**Files:**
- Modify: `src/lib/turnier/passung.ts`
- Test: `src/lib/turnier/passung.test.ts`

**Interfaces:**
- Produces: `wildcardEinzel(k: KategorieRegel, s: Spieler): boolean` — wahr genau dann, wenn
  `passtEinzel` falsch ist, alle Angaben vorhanden sind, Geschlecht und Jahrgang passen, die
  Kategorie einen Klassierungsbereich hat und der Spieler schwächer ist als `klassierungBis`
  (`keine` gilt als schwächer als R9).
- Produces: `warnungenEinzel(k: KategorieRegel, s: Spieler): ('angaben-fehlen' | 'passt-nicht')[]`
  — für die Warnung beim Anmelden von Hand.

- [ ] **Step 1: Failing tests** in `passung.test.ts`, Name `FR-08: Wildcard nur nach oben und nur wegen der Klassierung`:
  - R8, m, 1990 in Herren R4–R6 → `true`; `keine` in Herren R1–R6 → `true`
  - R2 in Herren R4–R6 → `false` (stärker, «nach unten» geht nur von Hand)
  - R5 in Herren R4–R6 → `false` (passt schon)
  - R8, w in Herren R4–R6 → `false`; R8, Jahrgang 1990 in Junioren ab 2009 → `false`
  - fehlende Klassierung → `false`; Doppel → `false`
  - `warnungenEinzel`: fehlende Angabe → `['angaben-fehlen']`; R2 in R7–R9 → `['passt-nicht']`; passt → `[]`
- [ ] **Step 2:** `npx vitest run src/lib/turnier/passung.test.ts` → FAIL (nicht definiert)
- [ ] **Step 3:** Beide Funktionen in `passung.ts` implementieren, `passtEinzel` und `BEREICH` wiederverwenden.
- [ ] **Step 4:** Test → PASS
- [ ] **Step 5:** Commit `feat: Wildcard-Regel in der Passung (#60)`

### Task 3: Persönliche Meldung (Push, sonst E-Mail)

**Files:**
- Create: `src/lib/server/mitteilung/meldung.ts`
- Modify: `src/lib/server/mitteilung/versand.ts` (`sendePush`, `sendeMail` exportieren, sonst unverändert)
- Test: `src/lib/server/mitteilung/meldung.db.test.ts`

**Interfaces:**
- Produces: `type Melder = { db: Db; push: PushSender | null; mailer: Mailer; adresse: string }`
- Produces: `meldeMitgliedern(d: Melder, mitgliedIds: number[], m: { titel: string; text: string; pfad: string }): Promise<void>`
  — je Mitglied (aktiv, Konto nicht gesperrt oder ohne Konto): Push an alle Abos; gelingt keiner
  (oder `push === null`, oder kein Abo) und es gibt eine E-Mail, eine Mail mit Betreff `titel`
  und Text `text + '\n\n' + adresse + pfad`. Kein Abschalt-Fuss, Themen egal, doppelte IDs nur
  einmal. Wirft nie, loggt nichts.
- Produces: `cmAdmins(db: Db): Promise<number[]>` — Mitglied-IDs aller nicht gesperrten Konten mit Rolle `cm`.

- [ ] **Step 1: Failing DB-Tests**, `describe('FR-47: persönliche Meldung')`:
  - Mitglied mit Abo und gelungenem Push → keine Mail (Mailer-Spion leer)
  - Mitglied mit Abo, Push `'fehler'` → genau eine Mail an seine Adresse, Text endet mit `adresse + pfad`
  - Mitglied ohne Abo, Thema *Clubmeisterschaft* aus → trotzdem eine Mail
  - gesperrtes Konto und ausgetretenes Mitglied → nichts
  - `push: null` → Mail; Mailer wirft → `meldeMitgliedern` wirft nicht, `console.error` nicht aufgerufen
  - `cmAdmins` liefert nur Konten mit Rolle `cm`, ohne gesperrte
- [ ] **Step 2:** `npx vitest run src/lib/server/mitteilung/meldung.db.test.ts` → FAIL
- [ ] **Step 3:** Implementieren; Abos und Konto-Status wie `mitAbos`/`grundmenge` in `empfaenger.ts` laden, aber ohne Themen-Bedingung.
- [ ] **Step 4:** Test → PASS; `npx vitest run src/lib/server/mitteilung` bleibt grün.
- [ ] **Step 5:** Commit `feat: persönliche Meldung per Push, sonst E-Mail (#60)`

### Task 4: Verwaltungslogik der Anmeldungen

**Files:**
- Create: `src/lib/server/cm/verwaltung.ts`
- Test: `src/lib/server/cm/verwaltung.db.test.ts`

**Interfaces:**
- Consumes: `warnungenEinzel` (Task 2), `wirksamerStatus`, `spielerAus`, `schreibeVerlauf`.
- Produces:
  - `type Warnung = 'angaben-fehlen' | 'passt-nicht' | 'voll' | 'geschlossen'`
  - `type AnmeldungZeile = { anmeldungId: number; status: 'bestaetigt' | 'beantragt'; kommentar: string | null; mitgliedId: number; name: string; geschlecht: 'w' | 'm' | null; jahrgang: number | null; klassierung: Klassierung | null }`
    (`name` = «Nachname, Vorname», sortiert wie die Verwaltung)
  - `ladeAnmeldungen(db: Db, kategorieId: number): Promise<AnmeldungZeile[]>` — nur aktive
  - `type SpielerTreffer = { mitgliedId: number; name: string; geschlecht; jahrgang; klassierung }`
  - `sucheSpieler(db: Db, suche: string): Promise<SpielerTreffer[]>` — aktive Mitglieder, Vor- oder Nachname enthält `suche` (ohne Gross/Klein), höchstens 20, leer bei `suche.trim().length < 2`
  - `meldeVonHandAn(db: Db, kategorieId: number, mitgliedId: number, jetzt: Date, trotzdem: boolean): Promise<'ok' | { warnungen: Warnung[] } | 'schon-angemeldet' | 'vorbereitung' | 'nicht-gefunden'>`
  - `verschiebe(db: Db, anmeldungId: number, zielKategorieId: number, jetzt: Date, trotzdem: boolean): Promise<{ ergebnis: 'ok'; mitgliedId: number; von: string; nach: string; turnierId: number } | { warnungen: Warnung[] } | 'schon-angemeldet' | 'vorbereitung' | 'nicht-gefunden'>`
  - `loescheAnmeldung(db: Db, anmeldungId: number, jetzt: Date): Promise<{ mitgliedId: number; kategorie: string; turnierId: number } | 'nicht-gefunden'>` (setzt *zurückgezogen*)
  - `entscheide(db: Db, anmeldungId: number, bestaetigt: boolean, jetzt: Date): Promise<{ mitgliedId: number; kategorie: string; turnierId: number } | 'nicht-beantragt' | 'nicht-gefunden'>`
  - `korrigiereKlassierung(db: Db, urheber: { art: 'admin'; mitgliedId: number }, mitgliedId: number, klassierung: Klassierung, jetzt: Date): Promise<'ok' | 'nicht-gefunden'>` — Verlauf `feld-geaendert`, Detail `klassierung`; unverändert → kein Eintrag

Regeln: `voll` zählt die übrigen aktiven Anmeldungen des Spielers im Turnier (beim Verschieben
ohne die verschobene); `geschlossen` = wirksamer Status nicht `offen`; Warnungen nur ohne
`trotzdem`. Kategorie muss `einzel`, `aktiv` und im selben Turnier sein. Von Hand angelegt und
verschoben ist *bestätigt*; ein verschobener Antrag wird *bestätigt* (der CM-Admin hat entschieden).
Sperrreihenfolge wie `meldeAn`.

- [ ] **Step 1: Failing DB-Tests** (`describe('A-ANMELDUNG-06, FR-46: Anmeldungen verwalten')`):
  - von Hand: passt → `'ok'`, Status *bestätigt*; R2 in R7–R9 ohne `trotzdem` → `{ warnungen: ['passt-nicht'] }`, nichts angelegt; mit `trotzdem` → `'ok'`
  - nach Anmeldeschluss → Warnung `geschlossen`; mit 3 aktiven → `voll`; fehlende Angaben → `angaben-fehlen`
  - Turnier *in Vorbereitung* → `'vorbereitung'`; Kategorie abgesagt oder Doppel → `'nicht-gefunden'`; schon aktiv → `'schon-angemeldet'`
  - verschieben: in andere Kategorie → `ok` mit `von`/`nach`; in eigene oder belegte → `'schon-angemeldet'`; in Kategorie eines anderen Turniers → `'nicht-gefunden'`; Antrag wird *bestätigt*
  - löschen → *zurückgezogen*, zählt nicht mehr (`zaehleAktive`); danach Kategorie absagen geht (`sageKategorieAb` → `'ok'`)
  - `FR-08`: entscheiden bestätigt/abgelehnt; zweiter Entscheid und Entscheid nach Rückzug → `'nicht-beantragt'`
  - Klassierung korrigieren: Feld geändert, ein Verlaufseintrag mit Urheber admin + ID; gleicher Wert → kein Eintrag
  - `ladeAnmeldungen` ohne zurückgezogene/abgelehnte, sortiert; `sucheSpieler('pr')` findet «Probe», nicht ausgetretene
  - Review Focus 1: `meldeAb` des Mitglieds und `verschiebe` gleichzeitig (`Promise.all`) → am Ende genau ein konsistenter Zustand (entweder zurückgezogen oder verschoben und aktiv), kein Fehler
- [ ] **Step 2:** `npx vitest run src/lib/server/cm/verwaltung.db.test.ts` → FAIL
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Test → PASS
- [ ] **Step 5:** Commit `feat: Anmeldungen verwalten — Logik (#60)`

### Task 5: Admin-Schnittstellen und Routen

**Files:**
- Modify: `src/lib/server/turnier/schnittstellen.ts`
- Modify: `src/lib/server/turnier/schnittstellen.db.test.ts`, `src/lib/server/admin/rechte-matrix.db.test.ts` (Zahl der Schnittstellen, Dienste mit `push: null`, Mailer-Spion, `adresse`)
- Create (je `+server.ts`, dünn wie `kategorien/[id]/absagen`, Dienste aus `holeMitteilungAdminDienste()`):
  - `src/routes/api/admin/kategorien/[id]/anmeldungen/+server.ts` (GET, POST)
  - `src/routes/api/admin/anmeldungen/[id]/+server.ts` (POST = verschieben)
  - `src/routes/api/admin/anmeldungen/[id]/loeschen/+server.ts` (POST)
  - `src/routes/api/admin/anmeldungen/[id]/entscheid/+server.ts` (POST)
  - `src/routes/api/admin/spieler/+server.ts` (GET `?suche=`)
  - `src/routes/api/admin/spieler/[id]/klassierung/+server.ts` (POST)

**Interfaces:**
- Consumes: Task 3 (`meldeMitgliedern`), Task 4.
- Produces: `TURNIER_SCHNITTSTELLEN` mit zusätzlich `getAnmeldungen`, `postAnmeldungVonHand`,
  `postVerschieben`, `postAnmeldungLoeschen`, `postEntscheid`, `getSpieler`, `postKlassierung`;
  `satisfies Record<string, (d: MitteilungAdminDienste, e: AdminEreignis) => Promise<Response>>`.
  Bereich `cm`: lesen mit `liest`, schreiben mit `schreibt`.
- Antworten: `200` mit Daten bzw. `{}`; Warnungen `409 { fehler: 'warnung', warnungen }`;
  `409 { fehler: 'schon-angemeldet' | 'vorbereitung' | 'nicht-beantragt' }`; Eingabefehler `400 { fehler: 'eingabe' }`
  (Körper: `{ mitgliedId: number, trotzdem?: boolean }`, `{ kategorieId: number, trotzdem?: boolean }`,
  `{ bestaetigt: boolean, grund?: string }`, `{ klassierung: Klassierung }`).
- Meldungen nach dem Speichern (DS-05: keine Namen anderer Mitglieder, auch nicht des Urhebers; Pfad `/clubmeisterschaft/<turnierId>`):
  - von Hand: Titel `Clubmeisterschaft`, Text `Der CM-Admin hat dich in «<Kategorie>» angemeldet. Gegner sehen deine E-Mail und Telefonnummer.`
  - verschieben: `Der CM-Admin hat dich von «<von>» nach «<nach>» verschoben.`
  - löschen: `Der CM-Admin hat deine Anmeldung für «<Kategorie>» gelöscht.`
  - Entscheid: `Deine Wildcard für «<Kategorie>» ist bestätigt.` bzw. `Deine Wildcard für «<Kategorie>» ist abgelehnt.` + bei Grund ` Grund: <Grund>`
  - Klassierung: keine Meldung.

- [ ] **Step 1: Failing Tests** in `schnittstellen.db.test.ts`: je Schnittstelle der Erfolgsfall mit Meldung (Mailer-Spion: Empfänger und Text wie oben), `409 warnung` und Wiederholung mit `trotzdem: true`, `grund` > 200 Zeichen → 400; Rechte-Schleife mit neuer Zahl (16) besteht für alle (MyTCO-Admin: `post*` → 403 `kein-recht`).
- [ ] **Step 2:** `npx vitest run src/lib/server/turnier` → FAIL
- [ ] **Step 3:** Schnittstellen und Routen bauen.
- [ ] **Step 4:** Tests → PASS; `npm run pruefungen` → `bauregel: ok`
- [ ] **Step 5:** Commit `feat: Schnittstellen zum Verwalten der Anmeldungen (#60)`

### Task 6: Wildcard-Antrag des Mitglieds (Server)

**Files:**
- Modify: `src/lib/server/cm/anmeldungen.ts`, `src/lib/server/cm/schnittstellen.ts`, `src/lib/server/cm/index.ts`, `src/lib/server/cm/mail.ts`
- Create: `src/routes/api/cm/kategorien/[id]/wildcard/+server.ts`
- Test: `src/lib/server/cm/anmeldungen.db.test.ts`, `src/lib/server/cm/schnittstellen.db.test.ts`, `src/lib/server/cm/mail.test.ts`

**Interfaces:**
- Consumes: `wildcardEinzel` (Task 2), `meldeMitgliedern`, `cmAdmins` (Task 3).
- Produces:
  - `CmAnsicht.wildcard: CmKategorie[]` — Kategorien mit `wildcardEinzel`, nur wenn keine Angabe fehlt; mit `anmeldungId` falls schon beantragt
  - `CmAnsicht.eigene: { anmeldungId: number; kategorie: string; status: 'bestaetigt' | 'beantragt' }[]`
  - `beantrageWildcard(db: Db, kategorieId: number, mitgliedId: number, kommentar: string, jetzt: Date): Promise<'ok' | 'geschlossen' | 'voll' | 'keine-wildcard' | 'schon-angemeldet' | 'angaben-fehlen' | 'nicht-gefunden'>` — Status *beantragt*, zählt für FR-06
  - `CmDienste.melde: (mitgliedIds: number[], m: { titel: string; text: string; pfad: string }) => Promise<void>` (in `index.ts` aus `meldeMitgliedern` gebaut)
  - `BestaetigungInhalt.aktion: 'an' | 'ab' | 'antrag'`; `eigene` als Text inkl. `« (beantragt)»`
- Schnittstelle `postCmWildcard`: Körper `{ kommentar: string }` (1–300 nach `trim`, sonst `400 { fehler: 'eingabe', felder: { kommentar } }`). Bei `ok`: Bestätigungsmail an den Spieler (erste Zeile `Du hast eine Wildcard für «<Kategorie>» beantragt.`) und Meldung an `cmAdmins` — Titel `Wildcard-Antrag`, Text `Neuer Wildcard-Antrag für «<Kategorie>».` (DS-05: ohne Namen des Spielers), Pfad `/verwaltung/turniere/<turnierId>/kategorien/<kategorieId>`.
- Zurückziehen eines Antrags = bestehendes `meldeAb` (unverändert).

- [ ] **Step 1: Failing Tests**, Namen mit `A-ANMELDUNG-10, FR-08`: Antrag R8 in R4–R6 → *beantragt*, zählt bei der Grenze, Namen der Kategorie zeigen ihn nicht (`fuelleNamen` nur bestätigt); R2 in R7–R9 → `keine-wildcard`; leerer Kommentar → 400; nach Ablehnung erneuter Antrag → `ok`; Ansicht listet die Kategorie unter `wildcard`; Meldung an Hanna (CM-Admin) mit obigem Text, Bestätigungsmail an den Spieler.
- [ ] **Step 2:** `npx vitest run src/lib/server/cm` → FAIL
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests → PASS
- [ ] **Step 5:** Commit `feat: Wildcard-Antrag des Mitglieds (#60)`

### Task 7: Oberfläche Verwaltung — Anmeldungen der Kategorie

**Files:**
- Modify: `src/routes/verwaltung/turniere/[id]/kategorien/[kid]/+page.svelte`, `+page.ts` (Anmeldungen mitladen)
- Modify: `src/lib/verwaltung/api.ts` (Client-Funktionen zu Task 5), `src/lib/verwaltung/turnier-anzeige.ts` (+ Test) für Texte
- Optional Create: `src/lib/verwaltung/Anmeldungsliste.svelte`, falls die Seite sonst unübersichtlich wird
- Test: `src/lib/verwaltung/turnier-anzeige.test.ts`, `src/lib/verwaltung/api.test.ts`

**Interfaces:**
- Consumes: Schnittstellen aus Task 5.
- Produces: `warnungText(w: Warnung[]): string` — z. B. `['passt-nicht','voll']` → `Passt nicht zur Kategorie. Hat schon 3 Anmeldungen.`; Texte je Warnung:
  `angaben-fehlen` «Angaben fehlen.», `passt-nicht` «Passt nicht zur Kategorie.», `voll` «Hat schon 3 Anmeldungen.», `geschlossen` «Anmeldung ist geschlossen.»

Aufbau (nur Einzel, nicht bei *abgesagt*; bei Doppel ein Satz «Doppel verwalten kommt später.»):
- Karte *Anmeldungen* mit Zähler («5 Anmeldungen, 1 Wildcard-Antrag»), Nebentaste *Von Hand anmelden*.
- `.tabelle`: Name · Klassierung (`fehlt` als `.plakette-offen`) · Geschlecht · Jahrgang · Status (`.plakette-ok` «bestätigt», `.plakette-offen` «Wildcard beantragt») · Aktionen (Nebentasten *Verschieben*, *Klassierung*, *Löschen*; bei Antrag zusätzlich *Entscheiden*). Kommentar eines Antrags als `.leise` unter dem Namen.
- Dialoge (`<dialog class="karte">`, bestätigende Taste = Haupttaste): *Von Hand anmelden* (Suchfeld, Trefferliste als Auswahlflächen, «Anmelden»), *Verschieben* (Auswahl der übrigen aktiven Einzel-Kategorien), *Klassierung korrigieren* (Auswahl `KLASSIERUNGEN`), *Löschen* («Anmeldung löschen?» · «Löschen»), *Entscheiden* (Kommentar anzeigen, Feld «Grund (freiwillig)» mit Zähler bis 200, Tasten «Ablehnen» (Neben) · «Bestätigen» (Haupt)). Bei `409 warnung` derselbe Dialog mit `warnungText` und «Trotzdem …».
- MyTCO-Admin: Liste mit Kommentaren sichtbar, keine Tasten (`nurLesen`).
- Nach jeder Aktion: Liste und Kopf neu laden, Rückmeldung kurz («Verschoben.»).

- [ ] **Step 1:** Svelte-Doku über MCP holen (`$state`, `$derived`, Dialoge/Events).
- [ ] **Step 2: Failing Tests** für `warnungText` und die Client-Funktionen (Pfade, Methoden, Antwort-Arten `warnung`, `schon-angemeldet`, `nicht-beantragt`).
- [ ] **Step 3:** Implementieren; `svelte-autofixer` auf jede geänderte Komponente bis ohne Befund.
- [ ] **Step 4:** `npx vitest run src/lib/verwaltung` → PASS; `npm run check:svelte` → 0 Fehler, 0 Warnungen.
- [ ] **Step 5:** Commit `feat: Anmeldungen in der Verwaltung verwalten (#60)`

### Task 8: Oberfläche Mitglied — Wildcard beantragen

**Files:**
- Modify: `src/routes/clubmeisterschaft/[id]/+page.svelte`, `src/lib/cm/api.ts` (+ Test), `src/lib/cm/anzeige.ts` (+ Test)

- [ ] **Step 1:** Svelte-Doku über MCP holen.
- [ ] **Step 2: Failing Tests** für `beantrageWildcard(kategorieId, kommentar)` im Client (Pfad `/api/cm/kategorien/<id>/wildcard`, Antwort-Arten wie `meldeAn` plus `keine-wildcard`, `eingabe`).
- [ ] **Step 3:** Unter den Kategorien ein `.karte.klappe` (zu) «Weitere Kategorien mit Wildcard-Antrag», nur wenn `cm.wildcard` nicht leer und Turnier offen. Je Kategorie eine Kachel mit Nebentaste «Wildcard beantragen» (gesperrt bei `voll`, Satz wie bei den Anmelde-Tasten) bzw. Plakette «beantragt» mit «Zurückziehen». Dialog: Feld «Warum möchtest du hier spielen?» (Pflicht, Zähler bis 300), Haupttaste «Beantragen»; Kontakt-Hinweis vor der ersten Anmeldung wie beim Anmelden. In der Liste der eigenen Anmeldungen bei *beantragt* die Plakette «Wildcard beantragt». Rückmeldung: «Wildcard beantragt. Du bekommst Bescheid.»
- [ ] **Step 4:** `svelte-autofixer`; `npx vitest run src/lib/cm` → PASS; `npm run check:svelte` → 0/0.
- [ ] **Step 5:** Commit `feat: Wildcard beantragen auf der CM-Seite (#60)`

### Task 9: Seed, E2E, Doku-Status

**Files:**
- Modify: `scripts/beispiel-turnier.ts` (Urs Probe, R8: Wildcard-Antrag für «Herren R1–R6» mit Kommentar «Möchte mich mit Stärkeren messen.»; wiederholbar)
- Modify: `tests/e2e/hilfen/login.ts` (Hilfe `beantrageWildcardDirekt(kategorieId, mitgliedId, kommentar)` falls nötig)
- Create: `tests/e2e/cm-verwaltung.test.ts`
- Modify: `docs/anforderungen/anforderungen.md` (A-ANMELDUNG-06, -10 → umgesetzt, Hinweis «Einzel; Doppel mit #59»), `docs/fachmodell.md` (FR-08, FR-10, FR-46, FR-47 → umgesetzt), `docs/rollen-und-rechte.md` (Zeilen *Klassierung korrigieren*, *Wildcard* → umgesetzt, falls dort Status), `docs/versionen.md` (*Unveröffentlicht*), `docs/datenschutz.md`/`docs/testkonzept.md` nur falls dort Zählungen stehen

- [ ] **Step 1: E2E** (Testjahre wie `turnier.test.ts`, eigenes Turnier je Projekt, Mails aus Mailpit):
  - `A-ANMELDUNG-06, FR-46, FR-47, FR-10: CM-Admin meldet von Hand an, verschiebt, korrigiert die Klassierung und löscht` — Warnung «Passt nicht zur Kategorie.» → «Trotzdem anmelden»; Mail an den Spieler mit `hat dich in «…» angemeldet`; nach Löschen lässt sich die Kategorie absagen; `pruefeBildschirm` für Liste und Warnungsdialog
  - `A-ANMELDUNG-10, FR-08: Mitglied beantragt eine Wildcard, CM-Admin lehnt mit Grund ab` — Mitglied öffnet die Klappe, beantragt mit Kommentar, sieht «Wildcard beantragt»; Mail an den CM-Admin `Neuer Wildcard-Antrag für «…»`; CM-Admin lehnt mit Grund ab; Mail an den Spieler enthält `Grund:`; `pruefeBildschirm` für Klappe (iPhone/Android) und Entscheid-Dialog
  - MyTCO-Admin sieht die Liste mit Kommentar, ohne Tasten (`RR-07`)
- [ ] **Step 2:** `make seed` → läuft zweimal hintereinander ohne Fehler; Verwaltung zeigt bei «Herren R1–R6» einen Antrag.
- [ ] **Step 3:** Doku-Status nachführen, Eintrag unter *Unveröffentlicht* (kurz: was der CM-Admin jetzt kann, Wildcard, Push, sonst E-Mail).
- [ ] **Step 4:** `make check` im Hintergrund → grün (Lint, Svelte, Prüfungen inkl. `test-ids`, alle Tests, E2E).
- [ ] **Step 5:** Commit `test: E2E für Anmeldungen verwalten und Wildcard (#60)` und `docs: CM Teil 4 umgesetzt (#60)`
