# CM Teil 1 — Turnier und Kategorien anlegen: Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der CM-Verantwortliche (Rolle `cm`) und der Admin legen in der Verwaltung das Turnier
der Clubmeisterschaft mit Turniernummern und Kategorien an, öffnen die Anmeldung von Hand und
schliessen sie früher oder lassen sie am Anmeldeschluss von selbst schliessen.

**Architecture:** Neues Server-Modul `src/lib/server/turnier/` nach dem Muster von
`src/lib/server/anlass/` (reine Prüfung ohne DB, DB-Funktionen, Schnittstellen-Funktionen), die
Endpunkte als dünne `+server.ts` unter `src/routes/api/admin/turniere/`. Die Zugangsprüfung der
Verwaltung kennt neu die Rollen `admin` und `cm`; Admin-Endpunkte bleiben admin-only (`mitAdmin`),
Turnier-Endpunkte lassen beide zu (`mitCm`). Der Status *Anmeldung geschlossen* nach dem
Anmeldeschluss wird beim Lesen abgeleitet, ohne Hintergrund-Job.

**Tech Stack:** SvelteKit 3 / Svelte 5 (nur `+server.ts`, keine Form Actions, ADR-002),
Drizzle ORM + PostgreSQL, Vitest (Einheit + Datenbank), Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-06-cm-anmeldung-design.md`, Abschnitte *Teil 1*,
*Regeln, die sich ändern oder neu sind* (soweit Teil 1) und *Oberfläche › Teil 1*.
Design-Ziel: Artifact [MyTCO CM Turnier anlegen](https://claude.ai/artifact/HLSqjEwFmHVRD7QWChziPF).

## Global Constraints

- Keine neuen Dependencies.
- Unter `src/routes` keine Server-Dateien ausser `+server.ts`; keine Form Actions, keine Remote Functions.
- Vor Svelte-Code die Doku über den Svelte-MCP-Server holen; jede `.svelte`-Datei durch `svelte-autofixer`.
- Oberfläche nur aus Klassen von `src/lib/design/basis.css` und Tokens; keine festen Farben/px in `src/`.
- Texte: Du-Form, Schweizer Schreibweise (ss), Tasten sagen, was passiert, nie «OK»; «(freiwillig)» bei optionalen Feldern; höchstens eine `taste-haupt` pro Bildschirm.
- Testdaten erfunden (`@example.org`, erfundene Namen); keine echten Swiss-Tennis-Nummern.
- Jeder Test nennt im Namen die ID, die er belegt (`FR-33: …`, `RR-07: …`); `make check` grün vor jedem Merge.
- Dateien einzeln stagen (nie `git add -A`/`.`), Commit-Präfixe `feat:`/`fix:`/`docs:`/`test:`/`refactor:`.
- Eine eingespielte Migration wird nie neu erzeugt; Änderungen kommen als neue Migration.
- Warnung bei unpassenden Anmeldungen und Sperre beim Absagen gehören zu #58, nicht hierher.

## Entscheide dieses Plans (vom Bauenden nicht zu ändern)

- **Klassierung:** Werte `N1 N2 N3 N4 R1 … R9` (Bereichsgrenzen) plus `keine` (*keine Lizenz*, nur am
  Mitglied ab Teil 2). Reihenfolge stark → schwach wie aufgezählt.
- **Anmeldeschluss** ist ein Datum (`date`, `YYYY-MM-DD`); offen bis und mit 23:59 Schweizer Zeit dieses Tages.
- **Status gespeichert:** `vorbereitung | offen | geschlossen`; **wirksam** = `geschlossen`, wenn gespeichert
  `offen` und der Anmeldeschluss vorbei ist, sonst der gespeicherte Wert.
- **Übergänge:** → `offen` aus `vorbereitung` oder `geschlossen`, nur vor Ablauf des Anmeldeschlusses und mit
  mindestens einer nicht abgesagten Kategorie; → `geschlossen` nur aus wirksam `offen`. Kein Weg zurück nach `vorbereitung`.
- **Turniernummern** sind freiwillig (0..n, Fachmodell wird auf `0..*` geändert: Swiss Tennis vergibt sie oft
  erst später). Nummer nur Ziffern, 1–12; Bezeichnung 1–60 Zeichen. Gespeichert wird immer die ganze Liste.
- **Kategorie:** Name 1–60 Zeichen, unter den nicht abgesagten Kategorien eines Turniers eindeutig ohne
  Rücksicht auf Gross-/Kleinschreibung; Jahrgang von/bis je freiwillig, 1900–Turnierjahr, von ≤ bis;
  Einzel: Klassierung von/bis Pflicht, von nicht schwächer als bis, Mindestsumme leer; Doppel: Mindestsumme
  Pflicht 0–20, vorbelegt 9, Klassierung leer; `mixed` nur bei Doppel.
- **Absagen** setzt `status = 'abgesagt'`, ohne Rückweg; die Turnierseite zeigt abgesagte Kategorien mit
  Plakette *abgesagt* ohne Link. Vor dem Absagen eine Rückfrage (`<dialog class="karte">`).
- **Turnier:** Jahr 2020–2100, eindeutig; Name 1–120; das Jahr des Anmeldeschlusses = Turnierjahr.
- **Endpunkte** unter `/api/admin/turniere…` (gemeinsamer Präfix der Verwaltung), Seiten unter `/verwaltung/turniere…`.
- **HTTP-Fehlercodes:** 403 `kein-admin` bleibt der Code für «dieser Bereich ist dir nicht offen» (auch für
  `cm` an Admin-Endpunkten); neu 409 `schluss-vorbei`, `keine-kategorie`, `unzulaessig`; 409 `vergeben` mit `feld`.
- **Neue Regel-IDs im Fachmodell:** FR-33 (Turnier, Jahr, Status, Anmeldeschluss), FR-34 (Kategorie Einzel/Doppel,
  Klassierungsbereich, Mindestsumme, Mixed), FR-35 (Kategorie absagen).
- Spalte *Anmeldungen* in der Kategorientabelle kommt erst mit Teil 2.

## Review Focus

- **Anmeldeschluss am Tag selbst:** Am 31.05.2027 um 23:59 Schweizer Zeit ist die Anmeldung noch offen, um 00:00 des 01.06. geschlossen, auch über die Sommerzeit — Test in Task 3.
- **Wieder öffnen nach Ablauf:** Wer nach dem Anmeldeschluss *Wieder öffnen* drückt, bekommt eine Meldung mit Lösungsweg (Anmeldeschluss verschieben), keinen stillen Fehler — Tests in Task 6 (409) und Task 8 (Meldung).
- **Zweites Turnier im selben Jahr / Jahr ändern auf ein vergebenes:** Fehler beim Feld *Jahr*, kein 500 — Tests in Task 4 und 6.
- **Wechsel Doppel → Einzel im Formular:** Mindestsumme verschwindet, Klassierung wird Pflicht; ein gespeichertes `mixed` bei Einzel ist unmöglich (Prüfung + DB-Check) — Tests in Task 3 und 2.
- **`cm` ohne Admin ruft Admin-Seiten auf** (Lesezeichen `/verwaltung/mitglieder`): landet auf `/verwaltung/turniere`, nie auf einer Fehlerseite — Test in Task 10.

---

### Task 1: Doku nachführen (vor dem Bau)

**Files:**
- Modify: `docs/fachmodell.md` (Klassendiagramm `Turnier "1" *-- "0..*" Turniernummer`; Tabellen *Turnier*, *Turniernummer*, *Kategorie*; Regeln FR-33 bis FR-35 mit Status `geplant`; Lebenszyklus *Turnier* und neu *Kategorie: aktiv → abgesagt*)
- Modify: `docs/rollen-und-rechte.md` (RR-07: `cm` öffnet die Verwaltung, nur Bereich *Clubmeisterschaft*; Status bleibt bis Task 10)
- Modify: `docs/anforderungen/anforderungen.md` (Änderungsprotokoll: Turniernummern freiwillig, Doppel nach Mindestsumme)
- Modify: `docs/glossar.md` falls *Mindestsumme* oder *abgesagt* fehlen
- Modify: `docs/versionen.md` (unter «Unveröffentlicht»: Eintrag *Clubmeisterschaft: Turnier und Kategorien anlegen (#57)*)

**Interfaces:** Produces: die Regel-IDs FR-33, FR-34, FR-35, die alle folgenden Tests im Namen tragen.

- [ ] **Step 1:** Fachmodell-Tabelle *Kategorie* auf: Name, Geschlecht (Herren / Damen / Mixed nur Doppel / offen), Jahrgang von–bis (je optional), Einzel mit Klassierung von–bis **oder** Doppel mit Mindestsumme (vorbelegt 9, Annahme K-51), Status *aktiv / abgesagt*. *Turnier* um Status-Herleitung ergänzen. FR-33/34/35 mit den Werten aus «Entscheide dieses Plans» formulieren; Verweis auf A-TURNIER-01..03, A-ANMELDUNG-07.
- [ ] **Step 2:** `make docs` (bzw. `make check-schnell`) ausführen. Erwartet: `Doku-Check ok`, `annahmen: ok`, `test-ids: ok`.
- [ ] **Step 3:** Commit `docs: Fachmodell und Rollen für CM Teil 1 nachgeführt (#57)`.

### Task 2: Schema und Migration

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Create: `drizzle/0008_turnier.sql` (+ `drizzle/meta/*` über `npm run db:generate`)
- Test: `src/lib/server/db/schema.db.test.ts`

**Interfaces:**
- Produces (Drizzle-Tabellen und Typen in `schema.ts`):
  - `turnier`: `id serial pk`, `jahr integer not null unique`, `name text not null`, `anmeldeschluss date (mode 'string') not null`, `status text not null default 'vorbereitung'` mit Check `in ('vorbereitung','offen','geschlossen')`, `erstelltAm timestamptz default now()`.
  - `turniernummer`: `id serial pk`, `turnierId → turnier.id on delete cascade`, `bezeichnung text not null`, `nummer text not null`, `reihenfolge integer not null`; Index auf `turnierId`.
  - `kategorie`: `id serial pk`, `turnierId → turnier.id cascade`, `name text not null`, `geschlecht text not null` Check `in ('herren','damen','mixed','offen')`, `art text not null` Check `in ('einzel','doppel')`, `jahrgangVon integer`, `jahrgangBis integer`, `klassierungVon text`, `klassierungBis text`, `mindestsumme integer`, `status text not null default 'aktiv'` Check `in ('aktiv','abgesagt')`; Check `kategorie_art_check`: `(art='einzel' and klassierung_von is not null and klassierung_bis is not null and mindestsumme is null and geschlecht <> 'mixed') or (art='doppel' and klassierung_von is null and klassierung_bis is null and mindestsumme is not null)`; Unique-Index `lower(name)` je `turnierId` **wo** `status = 'aktiv'`.
  - Typen `export type TurnierStatus = 'vorbereitung' | 'offen' | 'geschlossen'`, `Geschlecht = 'herren'|'damen'|'mixed'|'offen'`, `Art = 'einzel'|'doppel'`.

- [ ] **Step 1: failing test** in `schema.db.test.ts`: `test('FR-34: Kategorie Einzel ohne Klassierung oder Mixed im Einzel verletzt kategorie_art_check')` — Insert eines Turniers (eindeutiges Jahr, z. B. `3000 + zufällig`), dann `expect(insert({art:'einzel', geschlecht:'mixed', klassierungVon:'R1', klassierungBis:'R6'})).rejects.toThrow(/kategorie_art_check/)` und gleiches für Doppel mit Klassierung. Zweiter Test `'FR-33: pro Jahr ein Turnier'` → zweites Insert gleiches Jahr wirft `/turnier_jahr_unique/`.
- [ ] **Step 2:** `npm run test:db -- schema` → FAIL (Tabelle fehlt).
- [ ] **Step 3:** Schema ergänzen, `npm run db:generate`, erzeugte Datei in `0008_turnier.sql` umbenennen (Journal-Tag mitziehen), `make seed` bzw. Testlauf spielt sie ein.
- [ ] **Step 4:** `npm run test:db -- schema` → PASS.
- [ ] **Step 5:** Commit `feat: Tabellen für Turnier, Turniernummern und Kategorien (#57)` (Schema, SQL, Meta, Test einzeln stagen).

### Task 3: Reine Fachlogik (Klassierung, Prüfung, Status)

**Files:**
- Create: `src/lib/turnier/klassierung.ts` (läuft auch im Browser)
- Create: `src/lib/turnier/status.ts` (läuft auch im Browser)
- Create: `src/lib/server/turnier/angaben.ts`
- Test: `src/lib/turnier/klassierung.test.ts`, `src/lib/turnier/status.test.ts`, `src/lib/server/turnier/angaben.test.ts`

**Interfaces:**
- Produces:
  - `klassierung.ts`: `export const BEREICH = ['N1','N2','N3','N4','R1','R2','R3','R4','R5','R6','R7','R8','R9'] as const; export type Stufe = (typeof BEREICH)[number]; export const istStufe(v: unknown): v is Stufe; export const staerker(a: Stufe, b: Stufe): boolean` (a strikt stärker als b).
  - `status.ts`: `export function schlussZeitpunkt(datum: string): Date` (23:59 Schweizer Zeit über `zuerichZuUtc`); `export function vorSchluss(datum: string, jetzt: Date): boolean` (bis und mit der Minute 23:59, wie `istOffen` bei Anlässen); `export function wirksamerStatus(gespeichert: TurnierStatus, datum: string, jetzt: Date): TurnierStatus`.
  - `angaben.ts`: `export type TurnierFeld = 'jahr'|'name'|'anmeldeschluss'|'nummern'`; `export type TurnierWerte = { jahr: number; name: string; anmeldeschluss: string; nummern: { bezeichnung: string; nummer: string }[] }`; `export function pruefeTurnier(roh: Record<string, unknown>): { ok: true; werte: TurnierWerte } | { ok: false; felder: Partial<Record<TurnierFeld, string>> }`.
    `export type KategorieFeld = 'name'|'geschlecht'|'art'|'jahrgangVon'|'jahrgangBis'|'klassierungVon'|'klassierungBis'|'mindestsumme'`; `export type KategorieWerte = { name; geschlecht: Geschlecht; art: Art; jahrgangVon: number|null; jahrgangBis: number|null; klassierungVon: Stufe|null; klassierungBis: Stufe|null; mindestsumme: number|null }`; `export function pruefeKategorie(roh: Record<string, unknown>, turnierjahr: number): { ok: true; werte: KategorieWerte } | { ok: false; felder: Partial<Record<KategorieFeld, string>> }` — bei Einzel werden `mindestsumme`, bei Doppel `klassierungVon/Bis` auf `null` gesetzt, egal was kam.

- [ ] **Step 1: failing tests** (Auszug, Werte genau so):
  - `status.test.ts`: `'FR-33: Anmeldeschluss 31.05.2027 gilt bis 23:59 Schweizer Zeit'` → `vorSchluss('2027-05-31', new Date('2027-05-31T21:59:00Z'))` true, `new Date('2027-05-31T22:00:00Z')` false (Sommerzeit, UTC+2); Winter: `vorSchluss('2027-12-01', new Date('2027-12-01T22:59:00Z'))` true, `…T23:00:00Z` false. `'FR-33: offen nach Ablauf wirkt geschlossen, Vorbereitung bleibt'` → `wirksamerStatus('offen','2027-05-31', 1.6.)` = `'geschlossen'`, `wirksamerStatus('vorbereitung', …, 1.6.)` = `'vorbereitung'`.
  - `klassierung.test.ts`: `'FR-34: N1 ist stärker als R1, R1 stärker als R9'`.
  - `angaben.test.ts`: `'FR-33: Turnier ohne Name, Jahr 2019 und Schluss in anderem Jahr ergeben Feldfehler'` (Meldungen: `'Bitte einen Namen angeben.'`, `'Bitte ein Jahr zwischen 2020 und 2100 angeben.'`, `'Der Anmeldeschluss muss im Turnierjahr liegen.'`); `'FR-33: Turniernummer nur Ziffern'` (`nummern: [{bezeichnung:'Gruppenphase', nummer:'12a'}]` → `felder.nummern = 'Turniernummern bestehen nur aus Ziffern (höchstens 12).'`); `'FR-34: Einzel braucht Klassierung von nicht schwächer als bis'` (`von:'R6', bis:'R1'` → `felder.klassierungBis = 'Das Ende darf nicht stärker sein als der Anfang.'`); `'FR-34: Mixed nur im Doppel'` (`felder.geschlecht = 'Mixed gibt es nur im Doppel.'`); `'FR-34: Doppel ohne Mindestsumme nimmt nicht 9 still an'` (fehlende Summe → `felder.mindestsumme = 'Bitte eine Zahl von 0 bis 20 angeben.'`); `'FR-34: Wechsel auf Einzel verwirft die Mindestsumme'` (art einzel + mindestsumme 9 → `werte.mindestsumme === null`); `'FR-34: Jahrgang von nach bis ist ein Fehler'`.
- [ ] **Step 2:** `npm run test:einheit -- turnier` → FAIL.
- [ ] **Step 3:** Implementieren; Meldungen als `MELDUNG`-Konstante wie in `anlass/angaben.ts`; Texte trimmen.
- [ ] **Step 4:** `npm run test:einheit -- turnier` → PASS.
- [ ] **Step 5:** Commit `feat: Prüfung von Turnier und Kategorie, Status nach Anmeldeschluss (#57)`.

### Task 4: DB-Funktionen Turnier und Kategorie

**Files:**
- Create: `src/lib/server/turnier/turniere.ts`
- Test: `src/lib/server/turnier/turniere.db.test.ts`

**Interfaces:**
- Consumes: Tabellen aus Task 2, `TurnierWerte`/`KategorieWerte`, `wirksamerStatus`, `vorSchluss` aus Task 3.
- Produces:
  - `export type TurnierZeile = { id: number; jahr: number; name: string; anmeldeschluss: string; status: TurnierStatus; kategorien: number }` (status = wirksam, kategorien = nicht abgesagte).
  - `export type KategorieZeile = KategorieWerte & { id: number; status: 'aktiv'|'abgesagt' }`.
  - `export type TurnierDetail = TurnierWerte & { id: number; status: TurnierStatus; gespeicherterStatus: TurnierStatus; kategorien: KategorieZeile[] }` (Kategorien nach `id`, Nummern nach `reihenfolge`).
  - `listeTurniere(db: Db, jetzt: Date): Promise<TurnierZeile[]>` (neuestes Jahr zuerst)
  - `legeTurnierAn(db: Db, w: TurnierWerte): Promise<{ ergebnis: 'ok'; id: number } | { ergebnis: 'vergeben' }>`
  - `ladeTurnier(db: Db, id: number, jetzt: Date): Promise<TurnierDetail | null>`
  - `aendereTurnier(db: Db, id: number, w: TurnierWerte): Promise<'ok' | 'vergeben' | 'nicht-gefunden'>` (ersetzt die Nummern in derselben Transaktion)
  - `setzeStatus(db: Db, id: number, ziel: 'offen'|'geschlossen', jetzt: Date): Promise<'ok' | 'schluss-vorbei' | 'keine-kategorie' | 'unzulaessig' | 'nicht-gefunden'>` (Zeile `for update`)
  - `legeKategorieAn(db: Db, turnierId: number, w: KategorieWerte): Promise<{ ergebnis: 'ok'; id: number } | { ergebnis: 'vergeben' | 'nicht-gefunden' }>`
  - `ladeKategorie(db: Db, id: number): Promise<(KategorieZeile & { turnierId: number; turnierjahr: number; turniername: string }) | null>`
  - `aendereKategorie(db: Db, id: number, w: KategorieWerte): Promise<'ok' | 'vergeben' | 'abgesagt' | 'nicht-gefunden'>`
  - `sageKategorieAb(db: Db, id: number): Promise<'ok' | 'nicht-gefunden'>` (schon abgesagt → `'ok'`)
  - `'vergeben'` entsteht aus der Unique-Verletzung (Postgres-Code `23505`), nicht aus einer Vorab-Abfrage.

- [ ] **Step 1: failing tests** (jedes Turnier mit eigenem zufälligem Jahr ≥ 3000, die Test-DB ist geteilt):
  `'FR-33: anlegen, laden, Nummern in Reihenfolge, zweites Turnier im selben Jahr ist vergeben'`;
  `'FR-33: Jahr ändern auf ein vergebenes Jahr ergibt vergeben, Nummern werden ersetzt'`;
  `'FR-33: öffnen braucht eine aktive Kategorie und einen Anmeldeschluss in der Zukunft'` (ohne Kategorie → `keine-kategorie`; mit Kategorie, `jetzt` nach Schluss → `schluss-vorbei`; davor → `ok`, Detail `status: 'offen'`);
  `'FR-33: früher schliessen und wieder öffnen; nach Ablauf wirkt offen als geschlossen'` (schliessen aus `vorbereitung` → `unzulaessig`; offen → geschlossen → offen ok; `ladeTurnier` mit `jetzt` nach Schluss → `status 'geschlossen'`, `gespeicherterStatus 'offen'`);
  `'FR-34: Kategorie anlegen und ändern, gleicher Name im selben Turnier ist vergeben, nach Absage wieder frei'`;
  `'FR-35: absagen setzt abgesagt, zählt nicht mehr und lässt sich nicht mehr ändern'` (`aendereKategorie` → `'abgesagt'`; `listeTurniere` zählt sie nicht; öffnen nur mit abgesagter Kategorie → `keine-kategorie`).
- [ ] **Step 2:** `npm run test:db -- turniere` → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** `npm run test:db -- turniere` → PASS.
- [ ] **Step 5:** Commit `feat: Turniere und Kategorien speichern, Anmeldung öffnen und schliessen (#57)`.

### Task 5: Zugang für die Rolle `cm`

**Files:**
- Modify: `src/lib/server/admin/rollen.ts`, `src/lib/server/admin/zugang.ts`, `src/lib/server/admin/schnittstellen.ts` (`mitKonto`, `mitAdmin`, `getZugang`, neu `mitCm`), `src/lib/server/login/schnittstellen.ts:99`
- Test: `src/lib/server/admin/rollen.db.test.ts`, `src/lib/server/admin/zugang.db.test.ts`, `src/lib/server/admin/schnittstellen.db.test.ts`

**Interfaces:**
- Produces:
  - `rollen.ts`: `export type VerwaltungsRolle = 'admin' | 'cm'`; `export async function verwaltungsrollen(db: DbOderTx, kontoId: number): Promise<VerwaltungsRolle[]>` — Rollen `admin`/`cm` eines Kontos, das nicht gesperrt ist und dessen Mitglied aktiv ist (wie RR-08); sortiert `['admin','cm']`. `istAdmin` bleibt.
  - `zugang.ts`: `Zugang = { stufe: 'bestaetigt'; kontoId; mitgliedId; rollen: VerwaltungsRolle[] } | { stufe: 'unbestaetigt'; rollen: VerwaltungsRolle[] } | { stufe: 'keine-rolle' } | { stufe: 'abgemeldet' }`. `pruefe`, `fordereCodeAn`, `bestaetige` lassen jedes Konto mit mindestens einer Verwaltungsrolle zu (heute `istAdmin`).
  - `schnittstellen.ts`: `mitAdmin` antwortet 403 `kein-admin`, wenn `rollen` kein `admin` enthält; neu `export async function mitCm(d: AdminDienste, e: AdminEreignis, fn: (mitgliedId: number) => Promise<Response>): Promise<Response>` (bestätigt und `admin` oder `cm`, sonst wie `mitAdmin`) und `export function aenderndCm(d: AdminDienste, e: AdminEreignis, fn: (mitgliedId: number, koerper: Record<string, unknown>) => Promise<Response>): Promise<Response>` (JSON-Pflicht wie das interne `aendernd`, dann `mitCm`). `getZugang` antwortet `{ bestaetigt, mitgliedId?, rollen }`.
  - Sitzung: `verwaltung: (await verwaltungsrollen(db, konto.kontoId)).length > 0`.

- [ ] **Step 1: failing tests:** `'RR-07: cm ohne Admin bekommt Zugang mit Rollen [cm], Lizenz allein nicht'` (zugang.db.test: Konto mit `rollen:['cm']` → nach Bestätigung `stufe 'bestaetigt', rollen ['cm']`; `['lizenz']` → `keine-rolle`; gesperrtes `cm`-Konto → `keine-rolle`); `'RR-07: cm bekommt an Admin-Endpunkten 403 kein-admin'` (schnittstellen.db.test: `getMitglieder` mit bestätigtem `cm` → 403 `{fehler:'kein-admin'}`); `'RR-07: getZugang nennt die Rollen'`; `'RR-07: Startseite zeigt die Verwaltung auch für cm'` (`getSitzung` → `verwaltung: true`). Bestehende Tests mit `kein-admin` als Zugang-Stufe auf `keine-rolle` umstellen; die HTTP-Codes bleiben.
- [ ] **Step 2:** `npm run test:db -- admin login` → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** `npm run test:db` → PASS (ganze DB-Suite, weil Zugang überall wirkt).
- [ ] **Step 5:** Commit `feat: Rolle cm öffnet die Verwaltung (#57)`.

### Task 6: Schnittstellen und Endpunkte

**Files:**
- Create: `src/lib/server/turnier/schnittstellen.ts`
- Create: `src/routes/api/admin/turniere/+server.ts` (GET Liste, POST anlegen), `src/routes/api/admin/turniere/[id]/+server.ts` (GET Detail, POST ändern), `src/routes/api/admin/turniere/[id]/status/+server.ts` (POST), `src/routes/api/admin/turniere/[id]/kategorien/+server.ts` (POST anlegen), `src/routes/api/admin/kategorien/[id]/+server.ts` (GET, POST ändern), `src/routes/api/admin/kategorien/[id]/absagen/+server.ts` (POST)
- Test: `src/lib/server/turnier/schnittstellen.db.test.ts`

**Interfaces:**
- Consumes: `mitCm`, `aenderndCm`, `AdminDienste`, `AdminEreignis` (Task 5); DB-Funktionen (Task 4); `pruefeTurnier`, `pruefeKategorie` (Task 3).
- Produces: `getTurniere, postTurniere, getTurnier, postTurnier, postTurnierStatus, postKategorien, getKategorie, postKategorie, postKategorieAbsagen` (je `(d: AdminDienste, e: AdminEreignis) => Promise<Response>`), gesammelt in `TURNIER_SCHNITTSTELLEN` mit `satisfies` wie `ADMIN_SCHNITTSTELLEN`. Antworten: 201 `{id}`; 200 Detail/Liste/`{}`; 400 `{fehler:'eingabe', felder}`; 409 `{fehler:'vergeben', feld:'jahr'|'name'}`, `{fehler:'schluss-vorbei'}`, `{fehler:'keine-kategorie'}`, `{fehler:'unzulaessig'}`, `{fehler:'abgesagt'}`; 404 `nicht-gefunden`. Status-Körper `{ status: 'offen' | 'geschlossen' }`, anderes → 400 `eingabe`.

- [ ] **Step 1: failing tests** (Muster und Log-Wächter wie `admin/schnittstellen.db.test.ts`, `jetzt` fest):
  `'A-TURNIER-01, A-TURNIER-02, RR-07: cm legt Turnier mit Nummern an und liest es'`;
  `'A-TURNIER-03, FR-34: cm legt Einzel- und Doppelkategorie an, Fehler kommen beim Feld'`;
  `'A-ANMELDUNG-07, FR-33: öffnen, schliessen, wieder öffnen; nach Ablauf 409 schluss-vorbei'`;
  `'FR-33: Jahr doppelt ergibt 409 vergeben mit feld jahr'`;
  `'FR-35: absagen, danach ändern ergibt 409 abgesagt'`;
  `'RR-07: ohne Rolle 403, unbestätigt 403 unbestaetigt, ändernd ohne JSON 415'`;
  `'SI-05: keine Schnittstelle loggt'` (Log-Wächter wie dort).
  Zusätzlich: jede neue Route steht in `TURNIER_SCHNITTSTELLEN` (Test wie der bestehende für `ADMIN_SCHNITTSTELLEN`, falls vorhanden).
- [ ] **Step 2:** `npm run test:db -- turnier/schnittstellen` → FAIL.
- [ ] **Step 3:** Implementieren; `+server.ts` jeweils zwei Zeilen wie `src/routes/api/admin/anlaesse/+server.ts`.
- [ ] **Step 4:** `npm run test:db -- turnier` und `node scripts/pruefungen/bauregel.ts` → PASS.
- [ ] **Step 5:** Commit `feat: Endpunkte für Turniere und Kategorien (#57)`.

### Task 7: Client-Anbindung und Anzeigehilfen

**Files:**
- Modify: `src/lib/verwaltung/api.ts`
- Create: `src/lib/verwaltung/turnier-anzeige.ts`
- Test: `src/lib/verwaltung/api.test.ts`, `src/lib/verwaltung/turnier-anzeige.test.ts`

**Interfaces:**
- Consumes: Typen aus Task 4 (`TurnierZeile`, `TurnierDetail`, `KategorieZeile`), `TurnierFeld`, `KategorieFeld`, `VerwaltungsRolle`.
- Produces:
  - `api.ts`: `Antwort` um `{art:'schluss-vorbei'}`, `{art:'keine-kategorie'}`, `{art:'unzulaessig'}`, `{art:'abgesagt'}` erweitern; `eingabe.felder` und `vergeben.feld` um `TurnierFeld | KategorieFeld` erweitern. `ladeZugang` liefert `{ bestaetigt: boolean; mitgliedId?: number; rollen: VerwaltungsRolle[] }`. Neu: `ladeTurniere()`, `legeTurnierAn(angaben)`, `ladeTurnier(id)`, `aendereTurnier(id, angaben)`, `setzeTurnierStatus(id, status: 'offen'|'geschlossen')`, `legeKategorieAn(turnierId, angaben)`, `ladeKategorie(id)`, `aendereKategorie(id, angaben)`, `sageKategorieAb(id)`; Typen `TurnierListe = Json<TurnierZeile>[]`, `TurnierAnsicht = Json<TurnierDetail>`, `KategorieAnsicht`.
  - `turnier-anzeige.ts`: `statusText(s: TurnierStatus): { text: string; klasse: 'plakette-offen'|'plakette-ok'|'plakette-gesperrt' }` (`in Vorbereitung`/`Anmeldung offen`/`Anmeldung geschlossen`); `datumLang(datum: string): string` (`'Montag, 31. Mai 2027'`); `datumKurz(datum: string): string` (`'31.5.2027'`); `geschlechtText(g)` (`Herren`/`Damen`/`Mixed`/`offen`); `jahrgangText(von, bis)` (`''`, `'ab 2009'`, `'bis 1982'`, `'1990–1999'`); `klassierungText(k: KategorieWerte)` (`'R1–R6'` bzw. `'Summe ab 9'`).
- [ ] **Step 1: failing tests:** `api.test.ts` `'FR-33: 409 schluss-vorbei und keine-kategorie werden eigene Ergebnisse'`, `'RR-07: ladeZugang liefert die Rollen'`; `turnier-anzeige.test.ts` `'FR-33: Status als Plakette mit Wort'` und `'FR-34: Jahrgang und Klassierung als Kurztext'` mit genau den Werten oben.
- [ ] **Step 2:** `npm run test:einheit -- verwaltung` → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** `npm run test:einheit -- verwaltung` → PASS.
- [ ] **Step 5:** Commit `feat: Verwaltung spricht mit den Turnier-Endpunkten (#57)`.

### Task 8: Oberfläche der Verwaltung

**Files:**
- Modify: `src/routes/verwaltung/+layout.ts`, `src/routes/verwaltung/+layout.svelte`, `src/routes/verwaltung/+page.ts`, `src/routes/verwaltung/bestaetigen/+page.svelte` (Ziel nach Bestätigung)
- Create: `src/routes/verwaltung/turniere/+page.svelte`, `turniere/neu/+page.svelte`, `turniere/[id]/+page.ts`, `turniere/[id]/+page.svelte`, `turniere/[id]/kategorien/neu/+page.svelte`, `turniere/[id]/kategorien/[kid]/+page.ts`, `turniere/[id]/kategorien/[kid]/+page.svelte`
- Create: `src/lib/verwaltung/Turnierformular.svelte`, `src/lib/verwaltung/Kategorieformular.svelte`

**Interfaces:**
- Consumes: alles aus Task 7; Klassen aus `basis.css`.
- Produces: Layout-Daten `{ eigeneMitgliedId, fairgateAnzahl, rollen: VerwaltungsRolle[] }`. Startziel: `admin` → `/verwaltung/mitglieder`, nur `cm` → `/verwaltung/turniere`. Nur-`cm` auf einer Seite ausserhalb `/verwaltung/turniere` und `/verwaltung/bestaetigen` → Umleitung `/verwaltung/turniere` (im Layout, nicht über den 403 der Seite). `fairgateAnzahl` nur für Admins laden.

Aufbau genau nach dem freigegebenen Entwurf:
- **Seitenleiste:** Bereich *Admin* (Mitglieder, Anlässe, Für Fairgate, Änderungsverlauf) nur für `admin`; Bereich *Clubmeisterschaft* mit *Turniere* für `admin` und `cm`; *‹ Zur App*.
- **`/verwaltung/turniere`:** h1 *Clubmeisterschaft*, Zähler *n Turnier(e)*, `leiste` mit `taste-haupt` *Neues Turnier*, Tabelle Jahr · Turnier (Link) · Status (Plakette) · Anmeldeschluss · Kategorien; Satz *Pro Jahr gibt es ein Turnier. Vergangene Turniere bleiben hier stehen und lassen sich ansehen.*
- **`/verwaltung/turniere/neu`:** `Turnierformular` leer, Jahr vorbelegt mit nächstem Jahr, Name *Clubmeisterschaft <Jahr>* mitlaufend bis von Hand geändert; Taste *Turnier anlegen*; danach zur Turnierseite.
- **Turnierseite:** *‹ Zurück*; h1 = Name; leise *Anmeldeschluss <datumLang> · n Kategorien*; h2 *Anmeldung* + `karte` mit Plakette und Text/Taste je Status: Vorbereitung → *Mitglieder sehen das Turnier noch nicht. Prüfe Angaben und Kategorien, dann öffne die Anmeldung.* + `taste-haupt` *Anmeldung öffnen*; offen → *Mitglieder melden sich bis <datumLang> an. Am Ende dieses Tages schliesst die Anmeldung von selbst.* + `taste-neben` *Anmeldung jetzt schliessen*; geschlossen (gespeichert) → *Du hast die Anmeldung vor dem Anmeldeschluss geschlossen. …* + `taste-neben` *Wieder öffnen* + leise *Wieder öffnen geht bis zum Anmeldeschluss. Danach zuerst unten den Anmeldeschluss verschieben.*; geschlossen (abgelaufen) → *Der Anmeldeschluss ist vorbei.* + gleicher leiser Satz, Taste *Wieder öffnen*. Meldungen: `keine-kategorie` → *Lege zuerst mindestens eine Kategorie an.*; `schluss-vorbei` → *Der Anmeldeschluss ist vorbei. Verschiebe ihn unten bei den Angaben, dann öffne die Anmeldung wieder.* (`.fehler`, `role="alert"`). h2 *Kategorien*, `leiste` mit `taste-neben` *Neue Kategorie*, Tabelle Kategorie (Link) · Art · Geschlecht · Jahrgang · Klassierung; abgesagte ohne Link mit `plakette-gesperrt` *abgesagt*. h2 *Angaben*, `karte` mit `Turnierformular`, Taste `taste-neben` *Angaben speichern* (grau bis geändert, wie `Anlassformular nurBeiAenderung`), Rückmeldung *Gespeichert*.
- **`Turnierformular`:** `feld-zeile` Jahr (`inputmode="numeric"`), Name, Anmeldeschluss (`type="date"`, Hilfe *Die Anmeldung schliesst am Ende dieses Tages von selbst.*); `fieldset.auswahl-gruppe` *Turniernummern bei Swiss Tennis (freiwillig)* mit je einer `leiste` aus zwei `.feld` (Bezeichnung, Turniernummer) und `taste-neben` *Entfernen*, darunter `taste-neben` *Weitere Turniernummer*. Fehler beim Feld (UI-06), Fokus aufs erste Fehlerfeld.
- **Kategorie neu/bearbeiten:** *‹ <Turniername>*; h1 Kategoriename bzw. *Neue Kategorie*; `karte` mit `Kategorieformular`: Name; `fieldset.auswahl-gruppe` *Art* (Einzel/Doppel, `.auswahl`); *Geschlecht* (Herren, Damen, Mixed nur bei Doppel, offen) mit leisem *Mixed gibt es nur im Doppel.* bei Einzel (Wechsel Doppel→Einzel setzt Mixed auf leer); *Jahrgang (freiwillig)* von/bis + leise *Leer lassen, wenn es keine Grenze gibt. Beispiel Junioren U18 im Jahr 2027: von 2009, bis leer.*; bei Einzel *Klassierung* von (stärkste)/bis (schwächste) als `select` aus `BEREICH` + leise *Reicht der Bereich bis R9, dürfen auch Spieler ohne Lizenz mitspielen.*; bei Doppel `feld-zeile` *Mindestsumme der Klassierungen* (vorbelegt 9) mit Hilfe *Die Klassierungen beider Spieler zusammengezählt: R1 = 1 bis R9 = 9, ohne Lizenz = 10, N = 0. Bei 9 geht R4 + R5, R3 + R5 nicht.*; `taste-haupt` *Kategorie speichern* bzw. *Kategorie anlegen*. Beim Bearbeiten darunter h2 + `karte` *Kategorie absagen* mit Satz *Mitglieder sehen eine abgesagte Kategorie nicht mehr.* und `taste-neben` *Kategorie absagen* → `<dialog class="karte">` *Kategorie absagen?* / *Das lässt sich nicht rückgängig machen.* / Abbrechen · `taste-haupt` *Absagen*; danach zur Turnierseite.

- [ ] **Step 1:** Svelte-Doku über MCP holen (`list-sections`, dann `$state`, `$derived`, `$props`, `bind:value` auf `select`/Radio).
- [ ] **Step 2:** Layout, Formulare, Seiten bauen; jede Datei durch `svelte-autofixer`, bis keine Befunde.
- [ ] **Step 3:** `npm run check:svelte && npm run lint && npm run pruefungen` → keine Fehler/Warnungen.
- [ ] **Step 4:** `make dev` nach `make seed` (Task 9) und Seiten von Hand durchklicken, Skill `run` für einen ersten Screenshot.
- [ ] **Step 5:** Commit `feat: Verwaltung Clubmeisterschaft – Turnier und Kategorien (#57)`.

### Task 9: Seed

**Files:**
- Create: `scripts/beispiel-turnier.ts`
- Modify: `scripts/seed-lokal.ts`, `Makefile` (Hilfetext von `seed`)
- Test: `tests/scripts/beispiel-turnier.db.test.ts`

**Interfaces:**
- Consumes: `legeTurnierAn`, `legeKategorieAn`, `setzeStatus` (Task 4).
- Produces: `export async function legeBeispielTurnierAn(db: Db, jetzt: Date): Promise<void>` — idempotent über das Jahr 2027: Name *Clubmeisterschaft 2027*, Anmeldeschluss `2027-05-31`, Nummern *Gruppenphase* `123456` und *Finalwochenende* `123457`, Kategorien: *Herren R1–R6* (Einzel, Herren, R1–R6), *Herren R7–R9* (Einzel, Herren, R7–R9), *Damen R4–R9* (Einzel, Damen, R4–R9), *Junioren U18* (Einzel, offen, Jahrgang von 2009, R1–R9), *Senioren 45+* (Einzel, Herren, Jahrgang bis 1982, R1–R9), *Herren Doppel* (Doppel, Herren, 9), *Damen Doppel* (Doppel, Damen, 9), *Mixed Doppel* (Doppel, Mixed, 9); danach Status `offen`, falls `jetzt` vor dem Schluss. `seed-lokal.ts` gibt dem dritten erfundenen Mitglied die Rolle `cm` und gibt auch seinen Brief-Code aus (Persona *CM*).
- [ ] **Step 1: failing test** `'A-TURNIER-01: Beispielturnier 2027 mit 8 Kategorien, zweiter Lauf legt nichts doppelt an'`.
- [ ] **Step 2:** `npm run test:db -- beispiel-turnier` → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Test → PASS; `make seed` zeigt drei Brief-Codes (Admin, Mitglied, CM).
- [ ] **Step 5:** Commit `feat: erfundenes Turnier 2027 und CM-Persona über make seed (#57)`.

### Task 10: E2E, Bildvergleich, Abschluss der Doku

**Files:**
- Create: `tests/e2e/turnier.test.ts`
- Modify: `tests/e2e/hilfen/login.ts` (`legeCmMitBriefCodeAn(vorname)` nach dem Muster von `legeAdminMitBriefCodeAn`; `loescheTurnier(jahr: number)`)
- Modify: `docs/fachmodell.md` (FR-33..35 → `umgesetzt`), `docs/rollen-und-rechte.md` (RR-07: `umgesetzt*` mit Hinweis «Lizenz mit ihrer Etappe»), `docs/anforderungen/anforderungen.md` (A-TURNIER-01..03, A-ANMELDUNG-07 → `umgesetzt`, A-ROLLE-07 Teil Anmeldung), `docs/context-scopes.md` (Zeile *Clubmeisterschaft (Verwaltung)* mit den neuen Pfaden), `docs/ui-leitbild.md` (Seitenleiste: Bereich *Clubmeisterschaft*)

- [ ] **Step 1: E2E-Tests** (iPhone- und Android-Projekt wie die bestehenden, `pruefeBildschirm` macht Screenshot + axe):
  `'RR-07, A-TURNIER-01, A-TURNIER-02, A-TURNIER-03, A-ANMELDUNG-07: CM legt Turnier und Kategorien an, öffnet und schliesst die Anmeldung'` — `cm`-Konto meldet sich an, *Verwaltung* → Bestätigung → landet auf `/verwaltung/turniere`; Seitenleiste ohne *Mitglieder*; *Neues Turnier* mit einem festen Testjahr je Playwright-Projekt (iPhone 2099, Android 2098; Hilfe `loescheTurnier(jahr)` in `tests/e2e/hilfen/login.ts` räumt es vor dem Test weg, weil die E2E-Datenbank Läufe überdauert), Nummer *Gruppenphase*; *Anmeldung öffnen* ohne Kategorie → Meldung *Lege zuerst mindestens eine Kategorie an.*; Einzelkategorie (R1–R6) und Doppelkategorie (Mixed, 9) anlegen; *Anmeldung öffnen* → Plakette *Anmeldung offen*; Screenshot `turnier-offen`; *Anmeldung jetzt schliessen* → *Anmeldung geschlossen*; *Wieder öffnen*; Kategorie absagen über die Rückfrage → Plakette *abgesagt*; Screenshot `kategorie-formular` (Doppel gewählt). Keine Konsolenfehler.
  `'RR-07: cm ohne Admin wird von /verwaltung/mitglieder zu den Turnieren geleitet'`.
- [ ] **Step 2:** `make e2e` → PASS auf allen Projekten.
- [ ] **Step 3: Bildvergleich:** Screenshots `turnier-offen` und `kategorie-formular` neben die Artboards *Turnierseite* und *Kategorie bearbeiten* des Entwurfs legen; Abweichungen ausser Inline-Stilen beheben oder im Bericht nennen.
- [ ] **Step 4:** Doku-Status umstellen, Context-Scopes und Leitbild nachführen; `make check` → grün.
- [ ] **Step 5:** Commits `test: E2E CM legt Turnier an (#57)` und `docs: CM Teil 1 umgesetzt (#57)`.
