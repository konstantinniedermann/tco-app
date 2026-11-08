# Etappe 2b Einlesen (#43) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Mitglieder-Admin liest eine CSV-Datei im MyTCO-Schema ein: Vorschau in drei
Gruppen (neu, fehlerhaft, schon vorhanden), Rückfrage, dann legt der Server alle neuen
Mitglieder in einer Transaktion an.

**Architecture:** Ein eigener CSV-Leser ohne Abhängigkeit (`csv.ts`) liefert Zeilen mit
Zeilennummer; `einlesen.ts` prüft Kopf und Grenzen, jede Zeile mit der gemeinsamen
`pruefeAngaben` und gleicht mit der Datenbank ab. Der Browser schickt den Text der Datei im
JSON-Körper zweimal (Vorschau, Übernahme), der Server bewahrt nichts auf. Die Übernahme
prüft in ihrer Transaktion erneut und bricht mit `veraltet` ab, wenn die Zahl der neuen
Zeilen nicht mehr stimmt.

**Tech Stack:** SvelteKit (SPA, nur `+server.ts`), Drizzle/PostgreSQL, Vitest (Einheit + DB),
Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-11-04-admin-mitgliederverwaltung-design.md` (Abschnitte
*Einleseschema (CSV)*, *Anti-Ziele*, *Bauetappen*)

## Global Constraints

- Keine neuen Abhängigkeiten, keine Migration.
- Bauregel ADR-002: unter `src/routes` nur `+server.ts`.
- Vor Svelte-Code die Doku über den Svelte-MCP holen, nach dem Schreiben `svelte-autofixer`.
- Oberfläche nur aus Bausteinen von `docs/ui-leitbild.md`; die Dateiwahl kommt zuerst ins Leitbild.
- Grenzen: höchstens **400 KB** (UTF-8-Bytes des Texts) und **2000** Datenzeilen.
- Spalten genau `FELDER` aus `admin/angaben.ts`; Pflicht: `mitgliedernummer`, `vorname`,
  `nachname`, `strasse`, `plz`, `ort`, `email`. Unbekannte Spalte = Fehler der ganzen Datei.
- Anti-Ziel: Datei und Zeilen werden nie gespeichert oder geloggt (SI-05, DS-06).
- Vorschau nennt Werte nicht, ausser dem Namen (Vorname Nachname).
- Schreiben (Vorschau und Übernahme) nur Bereich `mitglieder`; MyTCO-Admin sieht die Seite
  ohne Dateiwahl.
- Verlauf je Mitglied `angelegt` mit `detail: 'einlesen'`, Anzeige «angelegt (Einlesen)».
- Testdaten erfunden (DS-08); Testnamen mit ID (`A-MITGLIED-07: …`, `RR-07: …`).
- Texte knapp, Du-Form, ss statt ß. Dateien einzeln stagen.

## Review Focus

1. **Excel speichert «CSV (Trennzeichen-getrennt)» in Windows-1252**: Umlaute kommen als
   U+FFFD an. Erwartet: Fehler der ganzen Datei mit dem Hinweis auf «CSV UTF-8», keine
   verstümmelten Namen. → Einheitstest Task 2, E2E Task 4.
2. **Leere Zeilen von Excel** (`;;;;;;` am Schluss, Leerzeilen, CRLF): Erwartet: still
   übersprungen, Zeilennummern bleiben die der Datei. → Einheitstest Task 1.
3. **Dieselbe Datei zweimal oder Doppelklick auf «Anlegen»**: Erwartet: keine Doppelten; beim
   zweiten Mal alle unter «schon vorhanden». → DB-Test Task 3, E2E Task 4.
4. **Nummer oder E-Mail in der Datei doppelt, oder nur in Gross-/Kleinschreibung anders**:
   Erwartet: alle betroffenen Zeilen fehlerhaft. → Einheitstest Task 2.
5. **Kopfzeile mit Grossbuchstaben, Leerzeichen oder BOM** (`Vorname`, ` email`): Erwartet:
   erkannt. → Einheitstest Task 1/2.

---

### Task 1: CSV lesen

**Files:** Create `src/lib/server/admin/csv.ts`, `src/lib/server/admin/csv.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type CsvZeile = { nummer: number; felder: string[] }; // nummer = Zeile in der Datei, Kopf = 1
  export type CsvErgebnis = { ok: true; kopf: string[]; zeilen: CsvZeile[] } | { ok: false; grund: 'leer' | 'anfuehrungszeichen' };
  export function leseCsv(text: string): CsvErgebnis;
  ```
- Regeln: BOM am Anfang weg; Trennzeichen aus der Kopfzeile (`;`, wenn sie mehr `;` als `,`
  ausserhalb von Anführungszeichen hat, sonst `,`); RFC 4180 (`""` im Feld, Zeilenumbruch im
  Feld); Zeilenenden CRLF, LF, CR; Zeilen, deren Felder alle leer sind, fallen weg; offenes
  Anführungszeichen am Ende → `anfuehrungszeichen`; nur Leerraum → `leer`. Kopfnamen werden
  getrimmt und klein geschrieben, Felder bleiben roh.

- [ ] Tests: Komma/Semikolon, BOM, CRLF, `"a;""b"""`, Umbruch im Feld (Nummer der Folgezeile
  zählt weiter), `;;;` übersprungen, offenes Anführungszeichen, leere Datei, Kopf ` Vorname`.
- [ ] FAIL, implementieren, grün, Commit `feat: CSV-Leser für das Einlesen (#43)`

### Task 2: Datei prüfen (rein)

**Files:** Create `src/lib/server/admin/einlesen.ts` (reiner Teil), `src/lib/server/admin/einlesen.test.ts`

**Interfaces:**
- Consumes: `leseCsv`, `pruefeAngaben`, `FELDER`, `Angaben`, `Feld`.
- Produces:
  ```ts
  export const MAX_BYTES = 400 * 1024; export const MAX_ZEILEN = 2000;
  export const PFLICHT_SPALTEN: readonly Feld[];
  export type DateiFehler =
    | { grund: 'leer' | 'zu-gross' | 'zu-viele-zeilen' | 'kodierung' | 'anfuehrungszeichen' | 'keine-zeilen' }
    | { grund: 'spalten'; unbekannt: string[]; fehlend: string[]; doppelt: string[] };
  export type GueltigeZeile = { zeile: number; angaben: Angaben };
  export type FehlerZeile = { zeile: number; name: string; fehler: Partial<Record<Feld | 'zeile', string>> };
  export function pruefeDatei(text: string, jahr: number):
    { ok: true; gueltig: GueltigeZeile[]; fehlerhaft: FehlerZeile[] } | ({ ok: false } & DateiFehler);
  ```
- Regeln: Grösse in UTF-8-Bytes vor dem Lesen; U+FFFD irgendwo → `kodierung`; mehr als
  `MAX_ZEILEN` Datenzeilen → `zu-viele-zeilen`; keine Datenzeile → `keine-zeilen`. Falsche
  Feldzahl → `fehler.zeile = 'N Felder statt M'`. Sonst `pruefeAngaben(objekt, { nummerPflicht: true, jahr })`.
  Danach Nummer und E-Mail (klein) in der Datei eindeutig: jede Zeile mit einem mehrfachen Wert
  bekommt `'kommt in der Datei mehrfach vor'` beim Feld und zählt als fehlerhaft. `name` =
  roher Vorname + Nachname, getrimmt, höchstens 100 Zeichen.

- [ ] Tests (`A-MITGLIED-07: …`): gültige Datei; jede Gruppe der Datei-Fehler; Zeilenfehler je
  Feld ohne Wert im Text; doppelte Nummer `A1`/`a1` und doppelte E-Mail → beide Zeilen;
  Windows-1252-Fall (`'M�ller'`); Grenze genau 400 KB ok, ein Byte mehr nicht.
- [ ] FAIL, implementieren, grün, Commit `feat: Prüfung der Einlese-Datei (#43)`

### Task 3: Vorschau und Übernahme (Datenbank)

**Files:** Modify `src/lib/server/admin/einlesen.ts`, `verlauf.ts`, `mitglieder.ts`
(`vergebenesFeld` exportieren), `src/lib/verwaltung/anzeige.ts`; Create `einlesen.db.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Vorschau = {
    neu: { zeile: number; name: string }[];
    fehlerhaft: FehlerZeile[];
    vorhanden: { zeile: number; name: string; grund: 'nummer' | 'email' | 'beides' }[];
  };
  export function zeigeVorschau(db: DbOderTx, text: string, jetzt: Date): Promise<({ ok: true } & Vorschau) | ({ ok: false } & DateiFehler)>;
  export function liesEin(db: Db, urheber: Urheber, text: string, erwartet: number, jetzt: Date):
    Promise<{ ergebnis: 'ok'; angelegt: number } | { ergebnis: 'veraltet' } | ({ ergebnis: 'datei' } & DateiFehler)>;
  // verlauf.ts
  export function schreibeVerlaufFuer(tx: DbOderTx, mitgliedIds: readonly number[], urheber: Urheber, eintrag: Eintrag, jetzt: Date): Promise<void>;
  ```
- Regeln: vorhanden, wenn `lower(mitgliedernummer)` oder `lower(email)` eines bestehenden
  Mitglieds (jeder Status) gleich ist; zwei Abfragen mit `inArray` über alle Zeilen. `liesEin`:
  eine Transaktion, `zeigeVorschau(tx, …)`; `neu.length !== erwartet` oder `erwartet < 1` →
  `veraltet`; dann alle Mitglieder in einem Insert, alle Konten in einem, Verlauf über
  `schreibeVerlaufFuer` mit `{ aktion: 'angelegt', detail: 'einlesen' }`. Eindeutigkeitsverletzung
  (`vergebenesFeld` ≠ null) → `veraltet`. `jahr` aus `jahrInZuerich(jetzt)`.
  `aktionText`: `angelegt` mit `detail === 'einlesen'` → «angelegt (Einlesen)».

- [ ] DB-Tests: drei Gruppen inkl. ausgetretenes Mitglied als vorhanden, Gross-/Kleinschreibung;
  Übernahme legt Mitglied + Konto ohne Brief-Code an, Verlauf mit Urheber Admin und detail;
  zweite Übernahme derselben Datei → `veraltet`, danach Vorschau alles vorhanden; `erwartet`
  falsch → nichts angelegt; Datei-Fehler → `datei`.
- [ ] FAIL, implementieren, grün, Commit `feat: Vorschau und Übernahme beim Einlesen (#43)`

### Task 4: Schnittstellen, Seite *Einlesen*, Doku

**Files:**
- Create: `src/routes/api/admin/einlesen/+server.ts`, `src/routes/api/admin/einlesen/vorschau/+server.ts`,
  `src/routes/verwaltung/einlesen/+page.svelte`, `static/mytco-einlesen-vorlage.csv`, `tests/e2e/einlesen.test.ts`
- Modify: `schnittstellen.ts` (`postEinlesenVorschau`, `postEinlesen`, `ADMIN_SCHNITTSTELLEN`),
  `schnittstellen.db.test.ts`, `src/lib/verwaltung/api.ts`, `umleiten.ts` (`SEITEN.einlesen`),
  `src/routes/verwaltung/+layout.svelte` (Link «Einlesen» nach «Mitglieder»), `basis.css`,
  `docs/ui-leitbild.md` (Baustein *Dateiwahl*), Doku (siehe unten)

**Interfaces:**
- `POST /api/admin/einlesen/vorschau` `{ text: string }` → 200 `Vorschau`; 400 `{ fehler: 'datei', …DateiFehler }`; 400 `eingabe` ohne Text.
- `POST /api/admin/einlesen` `{ text, erwartet }` → 200 `{ angelegt }`; 409 `{ fehler: 'veraltet' }`; 400 wie oben.
- api.ts: `zeigeEinleseVorschau(text)`, `liesMitgliederEin(text, erwartet)`, `Antwort` um `{ art: 'datei'; fehler: DateiFehler }`.

Seite: Titel «Einlesen», Einleitung «Neue Mitglieder aus einer CSV-Datei anlegen. Wer schon in
MyTCO ist, bleibt unverändert.» Klappe «Aufbau der Datei» mit Tabelle der Spalten, Link
«Vorlage herunterladen» und «In Excel: Datei › Speichern unter › CSV UTF-8». Dateiwahl «CSV-Datei»
(nur wer schreibt); Grösse vor dem Schicken prüfen. Vorschau: Kennzahlen *neu*, *fehlerhaft*,
*schon vorhanden*; Klappen je Gruppe (fehlerhaft offen) mit «Zeile N · Name · Feld: Grund».
Haupttaste «N Mitglieder anlegen», Rückfrage im `<dialog>` «N Mitglieder anlegen?» / «Briefe
erzeugst du danach auf der Seite Briefe.» / «Anlegen» · «Abbrechen», Riegel gegen Doppelklick.
Erfolg «N Mitglieder angelegt.» mit Link «Zu den Briefen». `veraltet` → Hinweis und neue Vorschau.

- [ ] Schnittstellen-Tests (200, 400 ohne Text, 409, MyTCO-Admin kein Recht über Rechte-Matrix).
- [ ] E2E: `A-MITGLIED-07: Einlesen – Vorschau, Rückfrage, Übernahme, Briefe` (Doppelklick, danach
  Vorschau alles vorhanden, Neue in *Briefe*); `A-MITGLIED-07: Windows-1252 → Hinweis CSV UTF-8`;
  `RR-07: MyTCO-Admin sieht keine Dateiwahl`; axe, keine Konsolenfehler, Screenshot.
- [ ] Doku: `docs/anforderungen/anforderungen.md` (A-MITGLIED-07 teilweise), `docs/context-scopes.md`,
  `docs/versionen.md` (Unveröffentlicht), Spec-Stand, `docs/testkonzept.md` falls E2E-Dateien aufgezählt.
- [ ] `make check` grün, Commit(s).
