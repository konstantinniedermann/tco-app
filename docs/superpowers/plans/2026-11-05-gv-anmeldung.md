# Anmeldung zu Anlässen (GV) — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Admin erstellt in der Verwaltung einen Anlass (z. B. die GV); er erscheint bei allen
Mitgliedern auf der Startseite, sie melden sich an oder ab (mit freiwilliger Bemerkung) und
speichern den Termin über eine `.ics`-Datei im Kalender; der Admin sieht die Antworten.

**Architecture:** Fachlogik in `src/lib/server/anlass/` (Zeit, Kalenderdatei, Anlässe und
Anmeldungen). Schnittstellen als Funktionen wie bei `admin/schnittstellen.ts`; die Admin-Teile
laufen durch `mitAdmin` und stehen in `ADMIN_SCHNITTSTELLEN`, die Mitglieder-Teile brauchen eine
Sitzung, nur die Kalenderdatei nicht. `+server.ts` rufen nur auf. Oberfläche als SPA unter
`src/routes/anlass/` und `src/routes/verwaltung/anlaesse/`.

**Tech Stack:** SvelteKit 3, Svelte 5 (Runes), Drizzle + PostgreSQL, Vitest (`einheit`,
`datenbank`), Playwright + axe. Keine neuen Pakete.

**Spec:** `docs/superpowers/specs/2026-11-05-gv-anmeldung-design.md` (freigegeben). Jede Aufgabe
gilt zusammen mit dem Spec.

## Global Constraints

- Keine neuen Pakete. Blockt `dep-guard`, anhalten und melden.
- Vor jedem Svelte-/SvelteKit-Code die Doku über den Svelte-MCP holen und `svelte-autofixer`
  laufen lassen (CLAUDE.md).
- Unter `src/routes` nur `+server.ts`, `+page.svelte`, `+page.ts`, `+layout.*` (ADR-002).
- Ändernde Anfragen nur `POST` mit `application/json` (`jsonPost`), sonst 415
  `{ fehler: 'format' }` (SI-10); alle Antworten über `antwort()` mit `cache-control: no-store`.
  Ausnahme: die Kalenderdatei (`text/calendar; charset=utf-8`, ebenfalls `no-store`).
- Logs nur feste Texte, nie Bemerkungen, Namen, Kennungen (SI-05, DS-06).
- Zeiten in der DB als `timestamptz` (UTC); Eingabe und Anzeige in `Europe/Zurich`.
- Bemerkung: höchstens 500 Zeichen nach `trim()`, leer wird `null`; nur bei `kommt-nicht`.
- Kalender-Kennung: 32 Zufallsbytes, base64url (`randomBytes(32).toString('base64url')`).
- Annahme Dauer im Kalender: 2 Stunden (`DAUER_MS = 2 * 60 * 60 * 1000`).
- Texte duzen, Schweizer Schreibweise (kein ß); wörtliche Texte aus dem Spec übernehmen:
  «Ich komme», «Ich komme nicht», «Antwort senden», «In den Kalender», «Bemerkung (freiwillig)»,
  Hilfetext «Ein Grund ist nicht nötig, bitte keine Angaben zur Gesundheit. Die Bemerkung lesen
  nur die Admins.», «Datum oder Ort geändert, bitte prüfe deine Antwort».
- Oberfläche nur aus Tokens und Bausteinen des Leitbilds; neue Bausteine erst ins Leitbild
  (Task 1), dann in `basis.css` (Task 8). `style`-Attribute und px ausserhalb `tokens.css`
  verboten (`design-festwerte`).
- Testdaten nur erfunden, `@example.org` (DS-08). Testnamen nennen die IDs (`FR-28: …`).
- Imports mit `.ts`-Endung. Prettier und ESLint grün.
- Vor dem Erzeugen der Migration `git merge origin/dev`; nie eine eingespielte Migration neu
  erzeugen.
- Commit-Präfixe `feat:`, `test:`, `docs:`, `fix:`, `refactor:`; Dateien einzeln stagen; jede
  Nachricht endet mit den Attributionszeilen der Session.

## Review Focus

1. **Antwort genau am Anmeldeschluss und eine Minute danach:** Erwartet: bis und mit
   Anmeldeschluss `ok`, danach `geschlossen` (409), die alte Antwort bleibt. Test in Task 5.
2. **Bemerkung nur aus Leerzeichen, über 500 Zeichen, oder bei «kommt» mitgeschickt:** Erwartet:
   leer → `null`; 501 Zeichen → 400 `eingabe` mit `feld: 'bemerkung'`; bei `kommt` gespeichert als
   `null`. Test in Task 5.
3. **Beginn in der Zeitumstellung** (`2027-03-28T02:30` gibt es in Zürich nicht;
   `2027-10-31T02:30` gibt es zweimal) und Sommer/Winter allgemein: Erwartet: Sommerzeit UTC+2,
   Winterzeit UTC+1; die nicht existierende Zeit wird abgewiesen (`null`), die doppelte nimmt die
   erste. Test in Task 3.
4. **Einladung mit Komma, Semikolon, Backslash, Zeilenumbruch und Umlauten** in der
   Kalenderdatei: Erwartet: nach RFC 5545 maskiert, Zeilen höchstens 75 Oktette ohne zerrissenes
   UTF-8-Zeichen, CRLF. Test in Task 4.
5. **Anlass inzwischen gelöscht, Mitglied sendet trotzdem / ruft Kalender ab:** Erwartet: 404
   `nicht-gefunden`, die Seite zeigt «Diesen Anlass gibt es nicht mehr.» mit «‹ Zur Startseite».
   Test in Task 6 (Schnittstelle) und Task 9 (Seite).

---

### Task 1: Doku vor dem Bauen

**Files:**
- Modify: `docs/datenschutz.md`, `docs/datenschutzerklaerung.md`, `docs/fachmodell.md`,
  `docs/rollen-und-rechte.md`, `docs/ui-leitbild.md`, `docs/anforderungen/anforderungen.md`,
  `docs/sicherheitskonzept.md`

- [ ] **Step 1: Datenschutz:** *Welche Daten* neue Zeile «Anmeldungen zu Anlässen: Antwort
  *kommt* / *kommt nicht*, freiwillige Bemerkung | Planung des Anlasses (A-ANLASS-01) | nein».
  *Wer sieht was*: bei Mitglied «die eigenen Anmeldungen zu Anlässen», bei Admin «alle Anmeldungen
  zu Anlässen mit Bemerkung»; neue Zeile «Alle, ohne Login | Kalenderdatei eines Anlasses über
  einen nicht erratbaren Link, ohne Personendaten». *Löschen*: «Anmeldungen zu Anlässen ein Jahr
  nach dem Anlass (Vorschlag K-50); bis die Löschfristen gebaut sind, löscht der Admin den
  Anlass.» Datenschutzerklärung im selben Sinn ergänzen.
- [ ] **Step 2: Fachmodell:** Objekte **Anlass** und **Anmeldung (Anlass)** mit den Angaben aus
  dem Spec; Fachregeln FR-27 bis FR-32 wörtlich aus dem Spec, Spalte Anforderung `A-ANLASS-01`,
  Status `geplant`; in *Ausblick* den Satz zu Anlässen anpassen (gebaut für alle Mitglieder, ohne
  Zielgruppe).
- [ ] **Step 3: Rollen und Rechte:** Matrix-Abschnitt **Anlässe** mit den drei Zeilen aus dem
  Spec (CM und Lizenz: wie Mitglied); bei Admin-Oberfläche den Bereich *Anlässe*.
- [ ] **Step 4: Sicherheitskonzept:** neue Vorgabe `SI-NN` (nächste freie Nummer): «Die
  Kalenderdatei eines Anlasses ist ohne Login über eine Kennung aus 32 Zufallsbytes abrufbar; sie
  enthält nur Titel, Beginn, Ort und Einladung.»
- [ ] **Step 5: UI-Leitbild,** Tabelle *Bausteine*: **Auswahlfläche** `.auswahl` — Radio als
  Fläche mit `--rand-dick` in `--farbe-rand`, Höhe mindestens `--tippflaeche`; gewählt Rand
  `--farbe-marke`, Hintergrund `--farbe-marke-zart`, fett. **Eingabefeld** `.feld` um «auch
  mehrzeilig (`textarea`)» ergänzen. **Kennzahl** `.kennzahl` — nur Verwaltung: Karte mit Zahl
  in `--groesse-titel` und Text in `.leise`, mehrere nebeneinander, brechen um. Unter *Layout und
  Navigation* Startseite: Anlässe als hervorgehobene Kachel unter «Jetzt aktuell»; Verwaltung:
  Bereich *Anlässe* in der Seitenleiste.
- [ ] **Step 6: Anforderungen:** A-ANLASS-01 Etappe `Mitglieder-Login`, Status `geplant`; den
  Absatz darunter auf den gebauten Umfang (Spec) kürzen, «Vorschlag K-50» bleibt.
- [ ] **Step 7:** `make docs` → `Doku-Check ok.`
- [ ] **Step 8:** Commit `docs: Datenschutz, Fachmodell, Rechte und Leitbild für Anlässe (#52)`.

### Task 2: Schema und Migration

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Create: `drizzle/0006_anlass.sql` (über `npm run db:generate -- --name anlass`)
- Test: `src/lib/server/db/schema.db.test.ts`

**Interfaces:**
- Produces:
  - `anlass`: `id serial pk`, `titel text not null`, `beginn timestamptz not null`,
    `ort text not null`, `einladung text not null default ''`, `anmeldeschluss timestamptz not
    null`, `kalenderKennung text not null unique`, `terminGeaendertAm timestamptz` (leer),
    `erstelltVon integer` (FK `mitglied.id`, `on delete set null`), `erstelltAm timestamptz not
    null default now()`; check `anlass_schluss_check`: `anmeldeschluss <= beginn`.
  - `anlassAnmeldung` (`anlass_anmeldung`): `anlassId` (FK `anlass.id`, cascade), `mitgliedId`
    (FK `mitglied.id`, cascade), `antwort text not null` (check `in ('kommt','kommt-nicht')`),
    `bemerkung text`, `geaendertAm timestamptz not null`; Primärschlüssel `(anlassId,
    mitgliedId)`; check `anlass_anmeldung_bemerkung_check`: `antwort = 'kommt-nicht' or bemerkung
    is null`.
  - Typen `export type Antwort = 'kommt' | 'kommt-nicht';` in `schema.ts`.

- [ ] **Step 1:** `git merge origin/dev`.
- [ ] **Step 2: Failing tests** in `schema.db.test.ts`:
  - `FR-29: je Mitglied und Anlass höchstens eine Anmeldung` (zweites Insert wirft `23505`).
  - `FR-30: Bemerkung nur bei kommt-nicht` (`antwort 'kommt'` mit Bemerkung wirft `23514`).
  - `FR-28: Anmeldeschluss nach Beginn wird abgewiesen` (`23514`).
  - `FR-31: Löschen des Anlasses löscht seine Anmeldungen`.
- [ ] **Step 3:** `npx vitest run --project datenbank src/lib/server/db/schema.db.test.ts` → FAIL.
- [ ] **Step 4:** Schema ergänzen, `npm run db:generate -- --name anlass`, erzeugtes SQL lesen.
- [ ] **Step 5:** Tests → PASS.
- [ ] **Step 6:** Commit `feat: Tabellen für Anlässe und Anmeldungen (#52)`.

### Task 3: Schweizer Zeit

**Files:**
- Create: `src/lib/anlass/zeit.ts` (läuft in Browser und Server)
- Test: `src/lib/anlass/zeit.test.ts`

**Interfaces:**
- Produces:
  - `zuerichZuUtc(lokal: string): Date | null` — nimmt `YYYY-MM-DDTHH:MM` (Wert von `<input
    type="datetime-local">`), gibt den Zeitpunkt; ungültig oder nicht existierend → `null`;
    doppelt (Herbst) → der frühere.
  - `utcZuZuerich(d: Date): string` — Gegenstück für das Formular (`YYYY-MM-DDTHH:MM`).
  - `formatiereBeginn(iso: string): string` — z. B. `Freitag, 19. März 2027, 19.30 Uhr`.
  - `formatiereTag(iso: string): string` — z. B. `Di, 16. März` (für «Bitte bis … »).
  - `formatiereZeitpunkt(iso: string): string` — z. B. `02.03.2027, 14.05` (Tabelle).

- [ ] **Step 1: Failing tests:**
  - `zuerichZuUtc: Winterzeit UTC+1` (`'2027-03-19T19:30'` → `'2027-03-19T18:30:00.000Z'`).
  - `zuerichZuUtc: Sommerzeit UTC+2` (`'2027-06-12T10:00'` → `'2027-06-12T08:00:00.000Z'`).
  - `zuerichZuUtc: Zeit in der Lücke der Umstellung gibt es nicht` (`'2027-03-28T02:30'` → `null`).
  - `zuerichZuUtc: doppelte Stunde im Herbst nimmt die frühere` (`'2027-10-31T02:30'` →
    `'2027-10-31T00:30:00.000Z'`).
  - `zuerichZuUtc: Unsinn gibt null` (`''`, `'2027-02-30T10:00'`, `'19.03.2027'`).
  - `utcZuZuerich ist das Gegenstück` (beide Beispiele oben hin und zurück).
  - `formatiereBeginn`, `formatiereTag`, `formatiereZeitpunkt` mit den Beispielen oben.
- [ ] **Step 2:** `npx vitest run --project einheit src/lib/anlass/zeit.test.ts` → FAIL.
- [ ] **Step 3:** Umsetzen mit `Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', … })`:
  Versatz über `formatToParts` bestimmen, Kandidat zurückrechnen und prüfen, dass er wieder die
  eingegebene Lokalzeit ergibt (sonst Lücke → `null`). Uhrzeit mit Punkt und «Uhr».
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** Commit `feat: Umrechnung und Anzeige in Schweizer Zeit (#52)`.

### Task 4: Kalenderdatei

**Files:**
- Create: `src/lib/server/anlass/kalender.ts`
- Test: `src/lib/server/anlass/kalender.test.ts`

**Interfaces:**
- Produces: `baueKalender(a: { kennung: string; titel: string; beginn: Date; ort: string;
  einladung: string }, jetzt: Date): string` — ein `VCALENDAR` (`VERSION:2.0`,
  `PRODID:-//MyTCO//Anlass//DE`, `METHOD:PUBLISH`) mit einem `VEVENT`: `UID:<kennung>@mytco`,
  `DTSTAMP` = jetzt, `DTSTART` = beginn, `DTEND` = beginn + `DAUER_MS`, alle UTC
  (`YYYYMMDDTHHMMSSZ`), `SUMMARY`, `LOCATION`, `DESCRIPTION`.

- [ ] **Step 1: Failing tests:**
  - `A-ANLASS-01: Kalenderdatei enthält Beginn, Ende nach zwei Stunden, Titel und Ort`
    (`DTSTART:20270319T183000Z`, `DTEND:20270319T203000Z`, Zeilenende `\r\n`).
  - `Kalender: Komma, Semikolon, Backslash und Zeilenumbruch sind maskiert` (`a,b;c\d\ne` →
    `a\,b\;c\\d\ne`).
  - `Kalender: lange Zeilen sind nach 75 Oktetten gefaltet, ohne UTF-8-Zeichen zu zerreissen`
    (Einladung aus 100 × `ä`; jede Zeile ≤ 75 Bytes, Fortsetzung beginnt mit Leerzeichen,
    entfaltet ergibt sie den Text).
- [ ] **Step 2:** `npx vitest run --project einheit src/lib/server/anlass/kalender.test.ts` → FAIL.
- [ ] **Step 3:** Umsetzen.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** Commit `feat: Kalenderdatei für einen Anlass (#52)`.

### Task 5: Anlässe und Anmeldungen (Fachlogik)

**Files:**
- Create: `src/lib/server/anlass/angaben.ts`, `src/lib/server/anlass/anlaesse.ts`
- Test: `src/lib/server/anlass/angaben.test.ts`, `src/lib/server/anlass/anlaesse.db.test.ts`

**Interfaces:**
- Consumes: Tabellen aus Task 2, `zuerichZuUtc` aus Task 3.
- Produces:
  - `type AnlassFeld = 'titel' | 'beginn' | 'ort' | 'einladung' | 'anmeldeschluss'`
  - `type AnlassWerte = { titel: string; beginn: Date; ort: string; einladung: string;
    anmeldeschluss: Date }`
  - `pruefeAnlass(roh: Record<string, unknown>): { ok: true; werte: AnlassWerte } | { ok: false;
    felder: Partial<Record<AnlassFeld, string>> }` — Titel und Ort Pflicht (getrimmt, ≤ 120
    Zeichen), Einladung ≤ 5000 Zeichen, `beginn`/`anmeldeschluss` als Lokalzeit-Text;
    Meldungen: «Bitte einen Titel angeben.», «Bitte Datum und Zeit angeben.», «Bitte einen Ort
    angeben.», «Der Anmeldeschluss darf nicht nach dem Beginn liegen.», «Höchstens 120 Zeichen.»,
    «Höchstens 5000 Zeichen.».
  - `pruefeAntwort(roh): { ok: true; antwort: Antwort; bemerkung: string | null } | { ok: false;
    feld: 'antwort' | 'bemerkung' }`
  - `legeAnlassAn(db, erstelltVon: number, w: AnlassWerte): Promise<number>`
  - `aendereAnlass(db, id: number, w: AnlassWerte, jetzt: Date): Promise<'ok' | 'nicht-gefunden'>`
    — setzt `terminGeaendertAm = jetzt`, wenn Beginn oder Ort anders sind (FR-32).
  - `loescheAnlass(db, id: number): Promise<'ok' | 'nicht-gefunden'>`
  - `type AnlassMitglied = { id: number; titel: string; beginn: Date; ort: string; einladung:
    string; anmeldeschluss: Date; offen: boolean; antwort: Antwort | null; bemerkung: string |
    null; zuPruefen: boolean; kalenderKennung: string }`
  - `kommendeAnlaesse(db, mitgliedId: number, jetzt: Date): Promise<AnlassMitglied[]>` — Beginn
    > jetzt, nach Beginn aufsteigend (FR-27); `zuPruefen` = Antwort älter als `terminGeaendertAm`.
  - `ladeAnlassFuerMitglied(db, id, mitgliedId, jetzt): Promise<AnlassMitglied | null>` — auch
    vergangene; `null`, wenn es ihn nicht gibt.
  - `melde(db, anlassId, mitgliedId, a: { antwort: Antwort; bemerkung: string | null }, jetzt):
    Promise<'ok' | 'geschlossen' | 'nicht-gefunden'>` — Upsert, `geaendertAm = jetzt`; bei
    `kommt` Bemerkung `null` (FR-29, FR-30); nach Anmeldeschluss `geschlossen` (FR-28).
  - `type AnlassListe = { id; titel; beginn: Date; anmeldeschluss: Date; kommen: number;
    kommenNicht: number }`, `listeAnlaesse(db): Promise<AnlassListe[]>` (alle, neueste zuerst)
  - `type AnlassAdmin = AnlassWerte & { id: number; zahlen: { kommen: number; kommenNicht:
    number; keineAntwort: number }; anmeldungen: { name: string; antwort: Antwort; bemerkung:
    string | null; geaendertAm: Date }[] }`, `ladeAnlassAdmin(db, id): Promise<AnlassAdmin |
    null>` — `keineAntwort` = Mitglieder mit `status = 'aktiv'` ohne Anmeldung; Tabelle nach
    Nachname.
  - `ladeKalenderAnlass(db, kennung: string): Promise<{ kennung; titel; beginn; ort; einladung }
    | null>`

- [ ] **Step 1: Failing tests** (`angaben.test.ts`, Einheit): Pflichtfelder mit den Meldungen,
  `FR-28: Anmeldeschluss nach Beginn wird abgewiesen`, Längen; `FR-30: Bemerkung wird getrimmt,
  leer wird null, 501 Zeichen sind zu lang, bei kommt fällt sie weg`; unbekannte Antwort →
  `feld: 'antwort'`.
- [ ] **Step 2: Failing tests** (`anlaesse.db.test.ts`): `FR-27: kommende Anlässe für alle aktiven
  Mitglieder, vergangene nicht, nach Beginn sortiert`; `FR-28: Antwort bis und mit
  Anmeldeschluss, eine Minute danach geschlossen, alte Antwort bleibt`; `FR-29: neue Antwort
  ersetzt die alte`; `FR-30: Wechsel auf kommt löscht die Bemerkung`; `FR-31: loescheAnlass`;
  `FR-32: Ändern von Beginn oder Ort markiert ältere Antworten als zu prüfen, neue Antwort hebt es
  auf; Ändern nur des Titels nicht`; `ladeAnlassAdmin zählt keine Antwort nur bei aktiven
  Mitgliedern`; unbekannte Kennung → `null`.
- [ ] **Step 3:** Beide Dateien laufen lassen → FAIL.
- [ ] **Step 4:** Umsetzen (`kalenderKennung` beim Anlegen erzeugen).
- [ ] **Step 5:** Tests → PASS.
- [ ] **Step 6:** Commit `feat: Anlässe anlegen und An- oder Abmelden (#52)`.

### Task 6: Schnittstellen und Routen

**Files:**
- Create: `src/lib/server/anlass/schnittstellen.ts`, `src/lib/server/anlass/index.ts`,
  `src/routes/api/anlaesse/+server.ts`, `src/routes/api/anlaesse/[id]/+server.ts`,
  `src/routes/api/anlaesse/[id]/anmeldung/+server.ts`,
  `src/routes/api/kalender/[kennung]/+server.ts`, `src/routes/api/admin/anlaesse/+server.ts`,
  `src/routes/api/admin/anlaesse/[id]/+server.ts`,
  `src/routes/api/admin/anlaesse/[id]/loeschen/+server.ts`
- Modify: `src/lib/server/admin/schnittstellen.ts`
- Test: `src/lib/server/anlass/schnittstellen.db.test.ts`,
  `src/lib/server/admin/schnittstellen.db.test.ts`

**Interfaces:**
- Consumes: Task 4 und 5; `antwort`, `istJson`, `leseKoerper`, `formatFehler` aus
  `login/schnittstellen.ts`; `mitAdmin`, `parseId` aus `admin/schnittstellen.ts` (`parseId`
  exportieren).
- Produces:
  - `type AnlassDienste = { db: Db; jetzt?: () => Date }`, `holeAnlassDienste()` in `index.ts`.
  - Mitglied (Sitzung nötig, sonst 401 `abgemeldet`): `getAnlaesse` → 200
    `AnlassMitglied[]`, dabei `kalenderKennung` ersetzt durch `kalender: '/api/kalender/<kennung>'`;
    `getAnlass` → 200 / 404; `postAnmeldung` → 200 `AnlassMitglied` / 400 `{ fehler: 'eingabe',
    feld }` / 404 / 409 `{ fehler: 'geschlossen' }`.
  - Ohne Login: `getKalender(d, e)` → 200 `text/calendar; charset=utf-8`,
    `content-disposition: inline; filename="anlass.ics"`, sonst 404.
  - Admin (in `ADMIN_SCHNITTSTELLEN`, durch `mitAdmin`): `getAdminAnlaesse` → `AnlassListe[]`;
    `postAdminAnlaesse` → 201 `{ id }` / 400 `{ fehler: 'eingabe', felder }`; `getAdminAnlass`
    → `AnlassAdmin` mit `beginn`/`anmeldeschluss` zusätzlich als `beginnLokal`/`schlussLokal`
    (`utcZuZuerich`); `postAdminAnlass` → 200 / 400 / 404; `postAdminAnlassLoeschen` → 200 / 404.

- [ ] **Step 1: Failing tests:**
  - In `admin/schnittstellen.db.test.ts` den Wächtertest auf 12 geschützte Schnittstellen
    (`toHaveLength(12)`).
  - `anlass/schnittstellen.db.test.ts`: `A-ANLASS-01: ohne Sitzung 401`; `postAnmeldung ohne JSON
    415`; `postAnmeldung nach Anmeldeschluss 409 geschlossen`; `gelöschter Anlass 404`;
    `Kalender ohne Login: richtige Kennung 200 text/calendar, falsche 404, enthält keine
    Personendaten` (kein Name, keine Bemerkung im Text); `Admin legt an, Mitglied sieht ihn in
    getAnlaesse`.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Umsetzen; Routen-Dateien nur Einzeiler wie `api/admin/mitglieder/+server.ts`.
- [ ] **Step 4:** Tests → PASS; `npm run pruefungen` → grün (Bauregel).
- [ ] **Step 5:** Commit `feat: Schnittstellen für Anlässe und Kalender (#52)`.

### Task 7: Abfragen im Browser

**Files:**
- Create: `src/lib/anlass/api.ts`, `src/lib/anlass/stand.ts`
- Modify: `src/lib/verwaltung/api.ts`
- Test: `src/lib/anlass/api.test.ts`, `src/lib/anlass/stand.test.ts`,
  `src/lib/verwaltung/api.test.ts`

**Interfaces:**
- Produces:
  - `src/lib/anlass/api.ts`: `type AnlassAnsicht = Json<AnlassMitglied ohne kalenderKennung> &
    { kalender: string }`; `holeAnlaesse(holen)`, `holeAnlass(holen, id)`, `sendeAntwort(holen, id,
    { antwort, bemerkung })` → `{ art: 'ok'; daten } | { art: 'abgemeldet' } | { art:
    'nicht-gefunden' } | { art: 'geschlossen' } | { art: 'eingabe'; feld } | { art: 'stoerung' }`.
  - `src/lib/anlass/stand.ts`: `standText(a: AnlassAnsicht): string` — offen ohne Antwort «Bitte
    bis <formatiereTag(schluss)> an- oder abmelden»; `zuPruefen` «Datum oder Ort geändert, bitte
    prüfe deine Antwort»; sonst «Du kommst» / «Du kommst nicht»; geschlossen ohne Antwort
    «Anmeldung geschlossen».
  - `verwaltung/api.ts`: `holeAnlaesseAdmin`, `holeAnlassAdmin`, `legeAnlassAn`,
    `aendereAnlass`, `loescheAnlass` im Stil der vorhandenen Funktionen (`Antwort<T>` um
    `{ art: 'eingabe-anlass'; felder: Partial<Record<AnlassFeld, string>> }` ergänzen).
- [ ] **Step 1: Failing tests** für jede Statusabbildung (200, 401, 404, 409, 400, 500) und für
  `standText` mit allen fünf Fällen.
- [ ] **Step 2:** → FAIL. **Step 3:** Umsetzen. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: Anlässe im Browser abfragen (#52)`.

### Task 8: Bausteine in basis.css

**Files:**
- Modify: `src/lib/design/basis.css`

- [ ] **Step 1:** `.auswahl` (Label mit Radio, `:has(input:checked)` für gewählt), `.feld
  textarea` wie `.feld input`, `.kennzahl` und `.kennzahlen` (Reihe, `flex-wrap`) nach Leitbild
  Task 1; nur Tokens.
- [ ] **Step 2:** `npm run pruefungen` → grün (`design-festwerte`); `make docs` → grün.
- [ ] **Step 3:** Commit `feat: Bausteine Auswahlfläche, mehrzeiliges Feld und Kennzahl (#52)`.

### Task 9: Mitglieder-Oberfläche

**Files:**
- Modify: `src/routes/+page.ts`, `src/routes/+page.svelte`
- Create: `src/routes/anlass/[id]/+page.ts`, `src/routes/anlass/[id]/+page.svelte`

**Interfaces:**
- Consumes: Task 3 und 7.

- [ ] **Step 1:** Svelte-MCP: Doku zu `$state`, `$derived`, `load` in `+page.ts` holen.
- [ ] **Step 2: Startseite:** `load` holt zusätzlich `holeAnlaesse` (Störung → leere Liste,
  Startseite bleibt nutzbar). Ist die Liste nicht leer: `<h2>Jetzt aktuell</h2>`, je Anlass
  `<a class="karte kachel hervor" href="/anlass/{id}">` mit `<strong>{titel}</strong>`,
  `formatiereBeginn` und `standText` in `.leise`, Pfeil `›`.
- [ ] **Step 3: Anlass-Seite:** `‹ Zurück`; `<h1>{titel}</h1>`; Karte *Einladung* (Beginn, Ort,
  Einladung mit `white-space: pre-line` über eine Klasse aus basis.css, falls nötig ins Leitbild);
  ist eine Antwort da und nicht in Bearbeitung: Karte *Deine Antwort* mit Plakette («Du kommst» →
  `.plakette-ok`, «Du kommst nicht» → `.plakette-offen`), bei `zuPruefen` ein `.hinweis` mit dem
  Text aus den Global Constraints, Nebentaste «Antwort ändern» (nur wenn offen); sonst Karte
  *Kommst du?* mit zwei `.auswahl` (`name="antwort"`), bei «Ich komme nicht» das Feld
  *Bemerkung (freiwillig)* (`textarea`, `maxlength=500`) mit Hilfetext, Haupttaste «Antwort
  senden»; Fehler beim Feld (UI-06): `geschlossen` → «Die Anmeldung ist geschlossen.»;
  Nebentaste-Link «In den Kalender» (`href={kalender}`). Unbekannter Anlass: Karte «Diesen
  Anlass gibt es nicht mehr.» und «‹ Zur Startseite».
- [ ] **Step 4:** `svelte-autofixer` auf beiden Dateien, bis keine Meldung bleibt;
  `npm run check:svelte` → 0 Fehler.
- [ ] **Step 5:** Commit `feat: Anlass auf der Startseite und An- oder Abmelden (#52)`.

### Task 10: Verwaltung

**Files:**
- Modify: `src/routes/verwaltung/+layout.svelte`
- Create: `src/routes/verwaltung/anlaesse/+page.svelte`, `src/routes/verwaltung/anlaesse/neu/+page.svelte`,
  `src/routes/verwaltung/anlaesse/[id]/+page.svelte`, `src/routes/verwaltung/anlaesse/[id]/+page.ts`,
  `src/lib/verwaltung/Anlassformular.svelte`

- [ ] **Step 1:** Seitenleiste: Link «Anlässe» nach «Mitglieder».
- [ ] **Step 2: Liste:** `<h1>Anlässe</h1>`, `.leiste` mit Haupttaste-Link «Neuer Anlass»,
  `.tabelle` (Titel als Link, Beginn, Anmeldeschluss, kommen, kommen nicht); leer: «Noch keine
  Anlässe.»; Fehler wie in `mitglieder/+page.svelte` (`umleiten.ts`).
- [ ] **Step 3: Formular** `Anlassformular.svelte` (Props: Anfangswerte, `onspeichern`,
  Tastentext): `.feld-zeile` für Titel, Beginn (`datetime-local`), Ort, Anmeldeschluss
  (`datetime-local`, beim neuen Anlass leer, beim Verlassen von *Beginn* vorbelegt mit 3 Tagen
  davor, 23.59, falls leer — Annahme K-50), Einladung (`textarea`); Fehler beim Feld. *Neu*:
  Taste «Anlass erstellen», danach zur Seite des Anlasses.
- [ ] **Step 4: Anlass-Seite:** Titel, `.kennzahlen` (kommen, kommen nicht, noch keine Antwort),
  Karte mit dem Formular (Taste «Angaben speichern», inaktiv ohne Änderung), `.tabelle` der
  Antworten (Name, Antwort als Plakette, Bemerkung, geändert am; leer «Noch keine Antworten.»),
  Nebentaste «Anlass löschen» mit `<dialog class="karte">` (Abbrechen · «Löschen» als
  Haupttaste), danach zur Liste.
- [ ] **Step 5:** `svelte-autofixer` auf allen neuen Dateien; `npm run check:svelte` → 0 Fehler.
- [ ] **Step 6:** Commit `feat: Anlässe in der Verwaltung (#52)`.

### Task 11: Beispieldaten für `make seed`

**Files:**
- Create: `scripts/beispiel-anlass.ts`
- Modify: `scripts/seed-lokal.ts`
- Test: `scripts/beispiel-anlass.db.test.ts` (falls das Muster in
  `scripts/pruefungen/testmuster.ts` es nicht erfasst: unter `tests/scripts/`)

**Interfaces:**
- Produces: `legeBeispielAnlassAn(db, erstelltVon: number, jetzt: Date): Promise<void>` — legt
  fünf weitere erfundene Mitglieder (`…@example.org`, ohne Konto) und den Anlass
  «Generalversammlung 2027» (Beginn `2027-03-19T19:30` Zürich, Ort «Clubhaus, Musterweg 1,
  Olten», Einladung mit sechs Traktanden wie im Entwurf, Anmeldeschluss `2027-03-16T23:59`) an,
  mit drei Zusagen und einer Absage mit Bemerkung «Bin leider in den Ferien.»; mehrfach
  ausführbar (gibt es den Titel schon, nichts tun).
- [ ] **Step 1: Failing test** `legeBeispielAnlassAn ist mehrfach ausführbar` (zweimal → ein
  Anlass, vier Antworten).
- [ ] **Step 2:** → FAIL. **Step 3:** Umsetzen, in `seed()` nach `machAdmin` aufrufen
  (`erstelltVon` = Erika). **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: Beispiel-GV für make seed (#52)`.

### Task 12: E2E, Nachweis, Doku abschliessen

**Files:**
- Create: `tests/e2e/anlass.test.ts`
- Modify: `docs/fachmodell.md`, `docs/anforderungen/anforderungen.md`, `docs/versionen.md`,
  `docs/rollen-und-rechte.md`

- [ ] **Step 1: E2E** (Muster `verwaltung.test.ts`, eigene erfundene Konten):
  `A-ANLASS-01: Admin erstellt Anlass, Mitglied meldet sich ab und wieder an, Admin sieht die
  Antwort` — Admin legt «Testanlass <UUID>» an; Mitglied sieht die Kachel, öffnet sie, wählt «Ich
  komme nicht», schreibt Bemerkung, sendet, sieht «Du kommst nicht», ändert auf «Ich komme»;
  «In den Kalender» liefert `text/calendar` (per `page.request.get(href)`); Admin sieht «kommt»,
  keine Bemerkung. `pruefeBildschirm` für Startseite, Anlass-Seite, Antwort, Verwaltungsliste und
  Anlass in der Verwaltung (Screenshots und axe auf iPhone, Android, PC).
- [ ] **Step 2:** `make e2e` → alle grün.
- [ ] **Step 3:** Status von FR-27 bis FR-32 und A-ANLASS-01 auf `umgesetzt`, Rechte-Matrix
  unverändert; `docs/versionen.md` unter «Unveröffentlicht»: Anmeldung zu Anlässen (#52).
- [ ] **Step 4:** `make check` → grün.
- [ ] **Step 5:** Commit `docs: Anlässe umgesetzt (#52)`.
- [ ] **Step 6:** Screenshots dem Projektleiter zeigen; Handprüfung Kalender auf iPhone und
  Android über `make dev-handy` bitten.
