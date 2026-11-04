# Admin-Oberfläche, Etappe 1 (Grundlage) — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Admin öffnet nach einem frischen Mail-Code die Verwaltung, findet Mitglieder,
legt sie von Hand an, bearbeitet sie, vergibt Rollen und beendet Sitzungen; jede Änderung
steht im Änderungsverlauf. Der erste Admin entsteht per Befehl auf dem Server.

**Architecture:** Fachlogik in `src/lib/server/admin/` (Angaben prüfen ohne DB, Verlauf,
Rollen, Zugang nach SI-08, Mitglieder), zusammengesteckt in `index.ts` wie beim Login. Die
Schnittstellen liegen als Funktionen in `admin/schnittstellen.ts` und laufen alle durch einen
Wächter (`mitAdmin`); die `+server.ts` unter `src/routes/api/admin/` rufen sie nur auf. Die
Oberfläche ist SPA unter `src/routes/verwaltung/` und spricht nur mit `/api/*`.

**Tech Stack:** SvelteKit 3, Svelte 5 (Runes), Drizzle + PostgreSQL, Vitest (`einheit`,
`datenbank`), Playwright + axe, Mailpit. Keine neuen Pakete.

**Spec:** `docs/superpowers/specs/2026-11-04-admin-mitgliederverwaltung-design.md`. Jede
Aufgabe gilt zusammen mit dem Spec. Etappe 2 (Einlesen, Briefe) und 3 (Austritt, Löschen,
Export) bekommen je einen eigenen Plan nach dem Merge dieser Etappe.

**Abweichung vom Spec (Entscheid beim Planen):** «Neuer Brief-Code» auf der Seite eines
Mitglieds kommt mit Etappe 2, weil er dieselbe Druckansicht wie die Brief-Serie braucht.

## Global Constraints

- Keine neuen Pakete. Blockt `dep-guard`, anhalten und melden.
- Vor jedem Svelte-/SvelteKit-Code die Doku über den Svelte-MCP holen und `svelte-autofixer`
  laufen lassen (CLAUDE.md).
- Unter `src/routes` nur `+server.ts`, `+page.svelte`, `+page.ts`, `+layout.*`; keine Form
  Actions (ADR-002, `make check` prüft es).
- Ändernde Anfragen nur mit `application/json`, sonst 415 `{ fehler: 'format' }` (SI-10, wie
  `login/schnittstellen.ts`). Alle Antworten `cache-control: no-store`.
- Logs: nie Code, Sitzungskennung, E-Mail-Adresse, IP oder Werte aus Mitgliederdaten (SI-05,
  DS-06). Nur feste Texte.
- Änderungsverlauf ohne alte und neue Werte (FR-26). Feld- und Rollennamen sind erlaubt.
- Admin-Code (SI-08): 6 Ziffern, gültig 15 Minuten, ungültig nach 5 Fehlversuchen, Bestätigung
  gilt 24 Stunden für diese Sitzung. Mails zählen in `mailsProAdresseStunde` (3/h) und
  `mailsProAdresseTag` (10/Tag).
- Oberfläche nur aus Tokens und Bausteinen des Leitbilds; neue Bausteine erst ins Leitbild
  (Task 1), dann in `basis.css` (Task 10). Texte duzen, Schweizer Schreibweise (kein ß).
- Testdaten nur erfunden, Adressen `@example.org`, Telefon `+41 00 …` (Testkonzept).
- Testnamen nennen die geprüften IDs (`FR-26: …`, `RR-03: …`, `SI-08: …`).
- Imports mit `.ts`-Endung wie im Repo. Prettier und ESLint grün.
- Vor dem Erzeugen der Migration `git merge origin/dev` (#44 ändert parallel das Schema).
- Commit-Präfixe `feat:`, `test:`, `docs:`, `fix:`, `refactor:`; Dateien einzeln stagen (nie
  `git add -A`/`.`); jede Nachricht endet mit den Attributionszeilen der Session.

## Review Focus

1. **Zwei Admins entziehen sich gleichzeitig gegenseitig die Rolle:** Erwartet: Einer bleibt
   Admin (RR-03), die zweite Anfrage bekommt `letzter-admin`. Sperre in derselben Transaktion
   (`pg_advisory_xact_lock`). Test in Task 5.
2. **Direkter Aufruf einer Admin-Schnittstelle** ohne Sitzung, ohne Rolle oder ohne frische
   Bestätigung (z. B. `curl` auf `/api/admin/mitglieder`): Erwartet: 401 bzw. 403, nie Daten.
   Test über alle Einträge von `ADMIN_SCHNITTSTELLEN` plus Prüfung der Routen-Dateien in Task 8.
3. **E-Mail ändern auf eine Adresse, die schon jemand hat, nur anders geschrieben**
   (`Erika.Beispiel@EXAMPLE.org`): Erwartet: 409 mit `feld: 'email'`, Meldung beim Feld, kein
   500. Test in Task 7.
4. **Bestätigung nach Sitzungsende oder «Alle Sitzungen beenden»:** Erwartet: Die neue
   Sitzung ist unbestätigt; ein Login-Mail-Code öffnet die Verwaltung nicht, ein Admin-Code
   loggt nicht ein. Test in Task 6.
5. **Speichern ohne echte Änderung** (nur Leerzeichen am Rand, E-Mail in Grossbuchstaben):
   Erwartet: kein Verlaufseintrag, Antwort `geaendert: []`. Test in Task 4 und Task 7.

---

### Task 1: Doku vor dem Bauen

**Files:**
- Modify: `docs/datenschutz.md`, `docs/datenschutzerklaerung.md`, `docs/fachmodell.md`,
  `docs/rollen-und-rechte.md`, `docs/ui-leitbild.md`, `docs/ui-mockups/index.html`,
  `docs/abklaerungen.md`

- [ ] **Step 1: Leitbild aus #44 holen.** Ist #44 auf `origin/dev`: `git merge origin/dev`.
  Sonst `git checkout origin/feat/issue-44 -- docs/ui-leitbild.md` (nur diese Datei, nichts
  sonst aus #44). Erwartet: UI-08 und `.klappe` stehen im Leitbild.
- [ ] **Step 2: Leitbild ergänzen** (Tabelle *Bausteine*, nur Verwaltung):
  `Feld-Zeile` `.feld-zeile` — Bezeichnung links, Eingabe rechts, gleiche Schriftgrösse; unter
  `60rem` Bezeichnung über dem Feld. `Inaktive Taste` — `.taste-haupt:disabled` grau, solange
  es nichts zu speichern gibt; die Taste nennt, was sie speichert («Angaben speichern»).
  `Spalten` `.spalten` — zwei Spalten in der Verwaltung ab `60rem`. Bei `.klappe` den Zusatz:
  in der Verwaltung als `.karte.klappe`, Titelzeile darf rechts eine Kurzinfo in `.leise` tragen.
- [ ] **Step 3: Mockup 6** «Mitglied (Admin, PC)» nach `docs/ui-mockups/index.html`, aus
  `.superpowers/brainstorm/*/content/mitglied-detail-v3.html` übernommen, ohne die Gruppen
  *Mitgliedschaft* und *Daten* (Etappe 3) und ohne «Neuen Brief-Code» (Etappe 2); Stile nur
  aus `basis.css` (die Entwurfsklassen dort ergänzt Task 10). Bis Task 10 steht, darf das
  Mockup ungestylt sein; `tests/e2e/mockups.test.ts` muss grün bleiben.
- [ ] **Step 4: Datenschutzkonzept** *Welche Daten*: Zeile «Mitgliedernummer aus Fairgate |
  Wiedererkennen beim Einlesen (A-MITGLIED-07) | ja beim Einlesen, sonst nein». Unter *Löschen*
  Bedenkzeit 1 Woche bei «Mitglied löschen» (Zustand *Löschung vorgemerkt*, Login gesperrt).
  Hinweis: Der Befehl *Admin festlegen* legt nur den Admin selbst an. Datenschutzerklärung
  entsprechend (Mitgliedernummer; Löschung nach einer Woche).
- [ ] **Step 5: Fachmodell:** Attribut *Mitgliedernummer* bei *Mitglied*; Zustand
  *Löschung vorgemerkt* im Zustandsabschnitt; FR-04 um «Löschen: Login sofort gesperrt, eine
  Woche rückgängig machbar, danach wie nach der Frist» ergänzen; FR-26 «an *gesperrt*»
  streichen (Sperren nur über Austritt/Löschung). Rollen und Rechte: Matrixzeile «Konto
  sperren, …» → «Neuer Code für einen Brief, Sitzungen beenden».
- [ ] **Step 6: Abklärungen:** K-45 um «führt Fairgate eine feste Mitgliedernummer, und ist sie
  im Export?» ergänzen.
- [ ] **Step 7:** `make docs` → `Doku-Check ok.`; `npx playwright test tests/e2e/mockups.test.ts` → PASS.
- [ ] **Step 8:** Commit `docs: Datenschutz, Fachmodell und Leitbild für die Mitgliederverwaltung (#43)`.

### Task 2: Schema und Migration

**Files:**
- Modify: `src/lib/server/db/schema.ts`, `src/lib/server/db/index.ts`
- Create: `drizzle/0003_*.sql` (über `npm run db:generate -- --name admin`)
- Test: `src/lib/server/db/schema.db.test.ts`

**Interfaces:**
- Produces (Drizzle-Tabellen und Typen):
  - `mitglied` neu: `mitgliedernummer text unique` (leer erlaubt), `telefon text`,
    `geschlecht text` (check `in ('w','m')` oder leer), `jahrgang integer`, `lizenznummer text`.
    Eindeutigkeit der Nummer als `uniqueIndex('mitglied_mitgliedernummer_unique')`.
  - `kontoRolle` (`konto_rolle`): `kontoId` (FK `konto.id`, cascade), `rolle text` (check
    `in ('admin','cm','lizenz')`), Primärschlüssel `(kontoId, rolle)`.
  - `aenderung`: `id serial`, `mitgliedId` (FK `mitglied.id`, cascade), `zeitpunkt timestamptz`,
    `urheberArt text` (check `in ('admin','mitglied','automatisch')`), `urheberMitgliedId`
    (FK `mitglied.id`, `on delete set null`), `aktion text`, `detail text` (Feld- oder
    Rollenname, leer erlaubt); Index auf `(mitgliedId, zeitpunkt)` und `zeitpunkt`.
  - `sitzung` neu: `adminBestaetigtAm timestamptz`, `adminCodeHash text`,
    `adminCodeAblauf timestamptz`, `adminCodeFehlversuche integer not null default 0`.
  - In `db/index.ts`: `export type DbOderTx = Db | Parameters<Parameters<Db['transaction']>[0]>[0];`

- [ ] **Step 1:** `git merge origin/dev`. Erwartet: ohne Konflikt oder Konflikt selbst gelöst.
- [ ] **Step 2: Failing tests** in `schema.db.test.ts`:
  - `Mitgliedernummer ist eindeutig, leer mehrfach erlaubt` (zwei Mitglieder mit `null`
    gehen, zweimal `'10234'` wirft Code `23505`).
  - `konto_rolle: unbekannte Rolle wird abgewiesen` (`'chef'` wirft `23514`).
  - `aenderung: Urheber wird leer, wenn sein Mitglied verschwindet; der Eintrag bleibt`.
- [ ] **Step 3:** `npx vitest run --project datenbank src/lib/server/db/schema.db.test.ts` → FAIL.
- [ ] **Step 4:** Schema ergänzen, `npm run db:generate -- --name admin`, erzeugtes SQL lesen.
- [ ] **Step 5:** Tests → PASS.
- [ ] **Step 6:** Commit `feat: Schema für Rollen, Änderungsverlauf und Admin-Bestätigung (#43)`.

### Task 3: Angaben prüfen (ohne Datenbank)

**Files:**
- Create: `src/lib/server/admin/angaben.ts`
- Test: `src/lib/server/admin/angaben.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const FELDER = ['mitgliedernummer', 'vorname', 'nachname', 'strasse', 'plz', 'ort',
    'email', 'telefon', 'geschlecht', 'jahrgang', 'lizenznummer'] as const;
  export type Feld = (typeof FELDER)[number];
  export type Angaben = {
    mitgliedernummer: string | null; vorname: string; nachname: string; strasse: string;
    plz: string; ort: string; email: string; telefon: string | null;
    geschlecht: 'w' | 'm' | null; jahrgang: number | null; lizenznummer: string | null;
  };
  export type Pruefung =
    | { ok: true; angaben: Angaben }
    | { ok: false; fehler: Partial<Record<Feld, string>> };
  export function pruefeAngaben(roh: unknown, opt: { nummerPflicht: boolean; jahr: number }): Pruefung;
  ```
  Etappe 2 (CSV) und der Befehl (Task 9) nutzen dieselbe Funktion.

- [ ] **Step 1: Failing tests** (Werte aus der Tabelle *Einleseschema* des Specs):
  - `A-MITGLIED-01: vollständige Angaben werden angenommen, Ränder getrimmt, E-Mail klein`
    (`' Erika '` → `'Erika'`, `'Erika.Beispiel@Example.org'` → `'erika.beispiel@example.org'`).
  - `Pflichtfelder fehlen → je Feld 'fehlt'` (vorname, nachname, strasse, plz, ort, email;
    mitgliedernummer nur bei `nummerPflicht: true`).
  - `PLZ braucht 4 Ziffern` (`'460'`, `'D-79100'` → `fehler.plz === '4 Ziffern'`).
  - `E-Mail ohne @ oder über 254 Zeichen → 'keine gültige E-Mail-Adresse'`.
  - `Jahrgang vierstellig zwischen 1900 und dem aktuellen Jahr` (`1899`, `jahr + 1`, `'19a2'` →
    Fehler; `'1962'` → `1962`).
  - `Geschlecht nur w, m oder leer`, `Telefon 6–20 Zeichen aus Ziffern, Leerzeichen, +`,
    `Mitgliedernummer und Lizenznummer 1–20 Ziffern oder Buchstaben`, `Texte höchstens 100 Zeichen`.
  - `freiwillige Felder leer → null` (`''`, `'  '`, fehlend).
  - `Kein Objekt (null, Array, String) → ok: false, ohne Ausnahme`.
- [ ] **Step 2:** `npx vitest run --project einheit src/lib/server/admin/angaben.test.ts` → FAIL.
- [ ] **Step 3:** `pruefeAngaben` implementieren. Unbekannte Schlüssel werden ignoriert (nur
  `FELDER` werden gelesen). Fehlertexte wörtlich wie in den Tests.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** Commit `feat: Prüfung der Mitgliederangaben (#43)`.

### Task 4: Änderungsverlauf

**Files:**
- Create: `src/lib/server/admin/verlauf.ts`
- Test: `src/lib/server/admin/verlauf.test.ts`, `src/lib/server/admin/verlauf.db.test.ts`
- Modify: `tests/hilfen/mitglieder.ts` (optional `rollen` und Angaben-Felder im `Teil`)

**Interfaces:**
- Consumes: `Angaben`, `Feld` (Task 3); `DbOderTx` (Task 2).
- Produces:
  ```ts
  export type Urheber = { art: 'admin' | 'mitglied'; mitgliedId: number } | { art: 'automatisch' };
  export type Aktion = 'angelegt' | 'feld-geaendert' | 'rolle-vergeben' | 'rolle-entzogen'
    | 'sitzungen-beendet';            // Etappen 2 und 3 ergänzen weitere
  export type Eintrag = { aktion: Aktion; detail?: string };
  export function geaenderteFelder(alt: Angaben, neu: Angaben): Feld[];
  export async function schreibeVerlauf(tx: DbOderTx, mitgliedId: number, urheber: Urheber,
    eintraege: Eintrag[], jetzt: Date): Promise<void>;
  export type VerlaufZeile = { zeitpunkt: Date; urheber: string; aktion: Aktion;
    detail: string | null; mitglied: { id: number; name: string } };
  export async function ladeVerlauf(db: DbOderTx,
    filter: { mitgliedId?: number; grenze: number }): Promise<VerlaufZeile[]>;
  ```
  `urheber` in `VerlaufZeile`: «Vorname Nachname» des Urheber-Mitglieds, `'MyTCO'` bei
  *automatisch*, `'gelöschtes Konto'` nur wenn `urheberMitgliedId` leer ist, aber die Art nicht
  *automatisch*. `name` des Mitglieds: «Nachname, Vorname». Neueste zuerst.

- [ ] **Step 1: Failing tests**
  - Einheit: `FR-26: geaenderteFelder nennt nur echt geänderte Felder` (drei geändert → drei
    Namen in der Reihenfolge von `FELDER`; gleiche Werte → `[]`).
  - DB: `FR-26: schreibt je Eintrag eine Zeile, ohne Werte` (prüft die Spalten der Zeile:
    nur `aktion`, `detail` = Feldname, kein Wert des Mitglieds in irgendeiner Spalte).
  - DB: `A-MITGLIED-06: ladeVerlauf zeigt Urheber mit Namen, automatisch als MyTCO, neueste zuerst`.
  - DB: `A-MITGLIED-06: Filter nach Mitglied und Grenze`.
- [ ] **Step 2:** Tests laufen lassen → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** Commit `feat: Änderungsverlauf ohne Werte (#43)`.

### Task 5: Rollen und letzter Admin

**Files:**
- Create: `src/lib/server/admin/rollen.ts`
- Test: `src/lib/server/admin/rollen.db.test.ts`

**Interfaces:**
- Consumes: `Urheber`, `schreibeVerlauf` (Task 4).
- Produces:
  ```ts
  export const ROLLEN = ['admin', 'cm', 'lizenz'] as const;
  export type Rolle = (typeof ROLLEN)[number];
  export async function ladeRollen(db: DbOderTx, kontoId: number): Promise<Rolle[]>;
  export async function istAdmin(db: DbOderTx, kontoId: number): Promise<boolean>;
  export async function setzeRollen(db: Db, urheber: Urheber, kontoId: number,
    rollen: Rolle[], jetzt: Date): Promise<'ok' | 'letzter-admin' | 'nicht-gefunden'>;
  ```
  Als Admin zählen nur Konten mit Rolle `admin`, `gesperrt = false` und Mitglied `aktiv`.
  `setzeRollen` läuft in einer Transaktion mit `select pg_advisory_xact_lock(4301)` vor dem
  Zählen; je vergebener/entzogener Rolle ein Verlaufseintrag (`detail` = Rollenname).

- [ ] **Step 1: Failing tests**
  - `A-ROLLE-01, RR-01: Admin vergibt und entzieht Rollen, Verlauf je Rolle`.
  - `RR-03: der letzte Admin kann sich die Rolle nicht entziehen` → `'letzter-admin'`, Rolle bleibt.
  - `RR-03: zwei Admins entziehen sich gleichzeitig die Rolle — einer bleibt` (`Promise.all`
    mit zwei `setzeRollen`; danach genau ein Admin, ein Ergebnis `'letzter-admin'`).
  - `RR-08: ein gesperrtes Konto zählt nicht als Admin` (`istAdmin` → `false`).
  - `Unveränderte Rollen → kein Verlaufseintrag`.
- [ ] **Step 2:** `npx vitest run --project datenbank src/lib/server/admin/rollen.db.test.ts` → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** Commit `feat: Rollen mit Schutz des letzten Admins (#43)`.

### Task 6: Zugang zur Verwaltung (SI-08)

**Files:**
- Create: `src/lib/server/admin/zugang.ts`
- Modify: `src/lib/server/login/sitzung.ts` (`AngemeldetesKonto` + `pruefeSitzung`),
  `src/lib/server/login/codes.ts` (`hashAdminCode`), `src/app.d.ts` (Typ folgt `AngemeldetesKonto`)
- Test: `src/lib/server/admin/zugang.db.test.ts`, bestehende Sitzungstests anpassen

**Interfaces:**
- Consumes: `istAdmin` (Task 5); `erzeugeMailCode`, `normalisiereMailCode`, `gleich`,
  `MAIL_CODE_GUELTIG_MS`, `MAIL_CODE_MAX_FEHLVERSUCHE` (`codes.ts`); `Bremsen`, `Mailer`.
- Produces:
  ```ts
  // sitzung.ts
  export type AngemeldetesKonto = { kontoId: number; mitgliedId: number; vorname: string; sitzungHash: string };
  // codes.ts
  export function hashAdminCode(schluessel: string, sitzungHash: string, code: string): string; // hmac `admin:${sitzungHash}:${code}`
  // zugang.ts
  export const ADMIN_BESTAETIGUNG_MS = 24 * 60 * 60 * 1000;
  export type Zugang =
    | { stufe: 'bestaetigt'; kontoId: number; mitgliedId: number }
    | { stufe: 'unbestaetigt' } | { stufe: 'kein-admin' } | { stufe: 'abgemeldet' };
  export type ZugangDienst = {
    pruefe(konto: AngemeldetesKonto | undefined): Promise<Zugang>;
    fordereCodeAn(konto: AngemeldetesKonto): { annahme: 'ok' | 'zu-viele'; arbeit: Promise<void> };
    bestaetige(konto: AngemeldetesKonto, eingabe: unknown): Promise<'ok' | 'falsch' | 'zu-viele'>;
  };
  export function erstelleZugangDienst(abh: { db: Db; schluessel: string; kontakt: string;
    mailer: Mailer; bremsen: Bremsen; jetzt?: () => Date }): ZugangDienst;
  export function baueAdminCodeMail(code: string, kontakt: string): { betreff: string; text: string };
  ```
  Mail: Betreff `Dein Code für die Verwaltung von MyTCO`; Text
  `${code} ist dein Code für die Verwaltung von MyTCO.` / Leerzeile /
  `Der Code gilt 15 Minuten und nur einmal.` / Leerzeile /
  `Hast du keinen Code angefordert? Dann melde dich bei ${kontakt}.`
  Code und Fehlversuche liegen an der Sitzungszeile; `bestaetige` reserviert den Versuch atomar
  wie `loginMitMailCode` und setzt bei Erfolg `adminBestaetigtAm`, Code-Felder leer.
  `fordereCodeAn` nur für Admins (sonst `annahme: 'ok'` ohne Mail); Adresse aus der DB, Mail
  über die Adress-Bremsen.

- [ ] **Step 1: Failing tests**
  - `SI-08, RR-09: Admin bestätigt mit Code, danach 24 Stunden bestätigt` (gestellte Uhr:
    nach 23 h 59 min `bestaetigt`, nach 24 h 1 min `unbestaetigt`).
  - `SI-08: falscher Code fünfmal → auch der richtige gilt nicht mehr` (`'falsch'`).
  - `SI-08: Bestätigung gilt nur für diese Sitzung` (zweite Sitzung desselben Kontos `unbestaetigt`).
  - `SI-07, SI-08: nach «Alle Sitzungen beenden» ist eine neue Sitzung unbestätigt`.
  - `SI-08: ein Login-Mail-Code öffnet die Verwaltung nicht, ein Admin-Code loggt nicht ein`.
  - `RR-07: Konto ohne Rolle admin → kein-admin, Code-Anfrage schickt keine Mail`.
  - `SI-05: Admin-Code steht nur als Hash in der Datenbank`.
  - Bestehende Tests von `pruefeSitzung` erwarten zusätzlich `mitgliedId` und `sitzungHash`.
- [ ] **Step 2:** Tests laufen lassen → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** `make test` → PASS, Abdeckung ≥ 90 %.
- [ ] **Step 5:** Commit `feat: Zugang zur Verwaltung mit Tagescode (SI-08, #43)`.

### Task 7: Mitglieder-Dienst

**Files:**
- Create: `src/lib/server/admin/mitglieder.ts`
- Test: `src/lib/server/admin/mitglieder.db.test.ts`

**Interfaces:**
- Consumes: Tasks 3–5; `beendeAlleSitzungen(db, kontoId)` aus `login/sitzung.ts`.
- Produces:
  ```ts
  export type MitgliedStatus = 'aktiv' | 'ausgetreten' | 'geloescht';
  export type LoginStand = 'ohne-brief' | 'brief-offen' | 'eingeloggt' | 'gesperrt';
  export type Listenzeile = { id: number; mitgliedernummer: string | null; name: string;
    email: string; jahrgang: number | null; rollen: Rolle[]; status: MitgliedStatus; login: LoginStand };
  export async function listeMitglieder(db: Db,
    filter: { suche?: string; status?: MitgliedStatus }): Promise<Listenzeile[]>;
  export type Detail = { id: number; kontoId: number; status: MitgliedStatus; angaben: Angaben;
    rollen: Rolle[]; login: { stand: LoginStand; briefGueltigBis: Date | null;
      geraete: number; zuletztGenutzt: Date | null }; verlauf: VerlaufZeile[] };
  export async function ladeMitglied(db: Db, id: number): Promise<Detail | null>;
  type Vergeben = { ergebnis: 'vergeben'; feld: 'email' | 'mitgliedernummer' };
  export async function legeMitgliedAn(db: Db, urheber: Urheber, angaben: Angaben,
    jetzt: Date): Promise<{ ergebnis: 'ok'; id: number } | Vergeben>;
  export async function aendereAngaben(db: Db, urheber: Urheber, id: number, angaben: Angaben,
    jetzt: Date): Promise<{ ergebnis: 'ok'; geaendert: Feld[] } | Vergeben | { ergebnis: 'nicht-gefunden' }>;
  export async function beendeSitzungenVon(db: Db, urheber: Urheber, id: number,
    jetzt: Date): Promise<'ok' | 'nicht-gefunden'>;
  ```
  `login`: `gesperrt` wenn Konto gesperrt; `eingeloggt` wenn mindestens eine gültige Sitzung;
  `brief-offen` wenn Brief-Code gültig und nicht benutzt; sonst `ohne-brief`. Liste sortiert
  nach Nachname, Vorname; Suche ohne Rücksicht auf Gross-/Kleinschreibung in Name, E-Mail und
  Nummer, `%`, `_` und `\` maskiert; ohne Statusfilter alle ausser *gelöscht*. `name` =
  «Nachname, Vorname». `legeMitgliedAn` legt Mitglied und Konto ohne Brief-Code in einer
  Transaktion an (FR-01), Verlauf «angelegt». `aendereAngaben` schreibt je Feld aus
  `geaenderteFelder` einen Eintrag. Eindeutigkeitsfehler (`23505`) werden über den Namen des
  Index zu `feld` übersetzt.

- [ ] **Step 1: Failing tests**
  - `A-MITGLIED-01, FR-01: Admin legt Mitglied mit Konto an, ohne Brief-Code, Verlauf «angelegt»`.
  - `FR-25: gleiche E-Mail in anderer Schreibweise → vergeben (email)`; gleiche Nummer → `mitgliedernummer`.
  - `A-MITGLIED-02, FR-26: Bearbeiten schreibt je geändertem Feld einen Eintrag`.
  - `FR-26: Speichern ohne echte Änderung schreibt nichts` (`geaendert: []`).
  - `Suche findet Teil von Name, E-Mail und Nummer; «100%» sucht wörtlich`.
  - `Liste zeigt Login-Stand: ohne-brief, brief-offen, eingeloggt, gesperrt`.
  - `SI-07, FR-24: Sitzungen beenden erhöht die Sitzungsversion, Verlauf «sitzungen-beendet»`.
- [ ] **Step 2:** Tests laufen lassen → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** Commit `feat: Mitglieder anlegen, bearbeiten und finden (#43)`.

### Task 8: Schnittstellen `/api/admin/…`

**Files:**
- Create: `src/lib/server/admin/schnittstellen.ts`, `src/lib/server/admin/index.ts`,
  `src/routes/api/admin/zugang/+server.ts`, `src/routes/api/admin/zugang/code/+server.ts`,
  `src/routes/api/admin/mitglieder/+server.ts`, `src/routes/api/admin/mitglieder/[id]/+server.ts`,
  `src/routes/api/admin/mitglieder/[id]/rollen/+server.ts`,
  `src/routes/api/admin/mitglieder/[id]/sitzungen/+server.ts`, `src/routes/api/admin/verlauf/+server.ts`
- Modify: `src/lib/server/login/schnittstellen.ts` (`getSitzung` liefert `verwaltung: boolean`)
- Test: `src/lib/server/admin/schnittstellen.db.test.ts`, `scripts/pruefungen/bauregel.ts` (+ Test)

**Interfaces:**
- Consumes: Tasks 3–7; `holeLoginDienst`-Muster für `holeAdminDienst()`.
- Produces: `export const ADMIN_SCHNITTSTELLEN` (Name → Funktion `(d, e) => Promise<Response>`),
  `mitAdmin(d, e, fn)`, und diese Routen:

  | Methode und Pfad | Körper / Query | Antworten |
  |---|---|---|
  | `GET /api/admin/zugang` | — | 200 `{ bestaetigt: boolean }`, 401, 403 `kein-admin` |
  | `POST /api/admin/zugang/code` | `{}` | 202, 429 `zu-viele` |
  | `POST /api/admin/zugang` | `{ code }` | 200, 400 `falsch`, 429 |
  | `GET /api/admin/mitglieder` | `?suche=&status=` | 200 `Listenzeile[]` |
  | `POST /api/admin/mitglieder` | `Angaben` (roh) | 201 `{ id }`, 400 `{ fehler: 'eingabe', felder }`, 409 `{ fehler: 'vergeben', feld }` |
  | `GET /api/admin/mitglieder/[id]` | — | 200 `Detail`, 404 |
  | `POST /api/admin/mitglieder/[id]` | `Angaben` (roh) | 200 `{ geaendert }`, 400, 404, 409 |
  | `POST /api/admin/mitglieder/[id]/rollen` | `{ rollen: Rolle[] }` | 200, 400, 404, 409 `letzter-admin` |
  | `POST /api/admin/mitglieder/[id]/sitzungen` | `{}` | 200, 404 |
  | `GET /api/admin/verlauf` | `?mitglied=&grenze=` (≤ 500, Standard 100) | 200 `VerlaufZeile[]` |

  Alle ausser den beiden `zugang`-POST und `GET zugang` laufen durch `mitAdmin`: 401
  `{ fehler: 'abgemeldet' }`, 403 `{ fehler: 'kein-admin' }` bzw. `{ fehler: 'unbestaetigt' }`.
  Die `zugang`-Routen verlangen Sitzung und Rolle, aber keine Bestätigung. Urheber ist immer
  `{ art: 'admin', mitgliedId }` aus dem Zugang. `[id]` keine positive Ganzzahl → 404.

- [ ] **Step 1: Failing tests**
  - `RR-07, RR-09: jede Admin-Schnittstelle antwortet ohne Sitzung 401, ohne Rolle 403, unbestätigt 403`
    (Schleife über `ADMIN_SCHNITTSTELLEN` ausser den Zugang-Einträgen).
  - `SI-10: ändernde Admin-Schnittstellen lehnen text/plain mit 415 ab`.
  - `A-MITGLIED-01: POST mitglieder mit fehlender PLZ → 400 mit felder.plz`.
  - `RR-07: GET /api/sitzung meldet verwaltung: true nur mit Rolle admin`.
  - Bauregel-Test: `jede +server.ts unter api/admin importiert nur aus admin/index.ts und admin/schnittstellen.ts`.
- [ ] **Step 2:** Tests laufen lassen → FAIL.
- [ ] **Step 3:** Implementieren; `tests/hilfen/anfrage.ts` um `url`, `params`, `method` und
  `locals.konto` erweitern.
- [ ] **Step 4:** `make test` und `npm run pruefungen` → PASS.
- [ ] **Step 5:** Commit `feat: Schnittstellen der Mitgliederverwaltung (#43)`.

### Task 9: Erster Admin per Befehl, Admin auf Test

**Files:**
- Create: `scripts/admin-festlegen.ts`, `scripts/admin-festlegen.db.test.ts`
- Modify: `Makefile` (Ziel `admin`), `Dockerfile` (Skript ins Laufzeit-Image),
  `scripts/testdaten.ts`, `scripts/seed-lokal.ts`, `scripts/erfundene-mitglieder.ts`,
  `betrieb/README.md`

**Interfaces:**
- Consumes: `pruefeAngaben` (mit `nummerPflicht: true`), `legeMitgliedAn`, `setzeRollen`.
- Produces: `export async function legeAdminFest(db: Db, roh: Record<string, string | undefined>,
  jetzt: Date): Promise<{ ergebnis: 'angelegt' | 'rolle-vergeben' | 'schon-admin' } | { ergebnis: 'fehler'; fehler: Partial<Record<Feld, string>> }>`
  und `export async function machAdmin(db: Db, kontoId: number, jetzt: Date): Promise<void>`
  in `erfundene-mitglieder.ts`. Aufruf `node scripts/admin-festlegen.ts --mitgliedernummer … --vorname …`
  (Argumente = `FELDER`, über `node:util` `parseArgs`); `make admin ARGS='…'` lädt `.env`.
  Gibt nur das Ergebnis und Feldnamen mit Grund aus, nie Werte (DS-06).

- [ ] **Step 1: Failing tests**
  - `A-ROLLE-02: legeAdminFest legt Mitglied an und gibt die Rolle admin, Urheber automatisch`.
  - `legeAdminFest: bestehendes Mitglied (gleiche Nummer oder E-Mail) bekommt nur die Rolle`.
  - `legeAdminFest: fehlende Pflichtangaben → fehler, nichts angelegt`.
  - `testdaten: Erika Beispiel ist auf Test Admin` (bestehender Testdaten-Test erweitert).
- [ ] **Step 2:** Tests laufen lassen → FAIL.
- [ ] **Step 3:** Implementieren; `testdaten.ts` und `seed-lokal.ts` machen das erste erfundene
  Mitglied zum Admin. `betrieb/README.md`: Abschnitt «Ersten Admin festlegen» mit
  `docker compose exec` und dem Hinweis, dass der Befehl nur den Admin selbst anlegt.
- [ ] **Step 4:** Tests → PASS; `make image` baut.
- [ ] **Step 5:** Commit `feat: Befehl für den ersten Admin, Admin auf Test (#43)`.

### Task 10: Oberfläche der Verwaltung

**Files:**
- Modify: `src/lib/design/basis.css` (`.feld-zeile`, `.taste-haupt:disabled`, `.spalten`,
  `.karte.klappe`; `.klappe` aus #44, falls noch nicht da), `src/routes/+page.svelte`,
  `src/routes/+page.ts`
- Create: `src/lib/verwaltung/api.ts` (+ Test), `src/routes/verwaltung/+layout.svelte`,
  `src/routes/verwaltung/+layout.ts`, `src/routes/verwaltung/+page.ts` (weiter zu `mitglieder`),
  `src/routes/verwaltung/bestaetigen/+page.svelte`, `src/routes/verwaltung/mitglieder/+page.svelte`,
  `src/routes/verwaltung/mitglieder/neu/+page.svelte`,
  `src/routes/verwaltung/mitglieder/[id]/+page.svelte` (+ `+page.ts`),
  `src/routes/verwaltung/verlauf/+page.svelte`
- Test: `tests/e2e/verwaltung.test.ts`, `tests/e2e/hilfen/login.ts` (`legeAdminMitBriefCodeAn`)

**Interfaces:**
- Consumes: Routen aus Task 8.
- Produces: keine für spätere Tasks dieser Etappe; Etappen 2 und 3 hängen Seiten in dieselbe
  Seitenleiste.

Abläufe und Texte:
- **Startseite:** bei `verwaltung: true` eine Kachel «Verwaltung ›» unter dem Gruss (RR-07).
- **Layout `/verwaltung`:** lädt `GET /api/admin/zugang`; 401 → `/login`, 403 `kein-admin` →
  `/`, `bestaetigt: false` → `/verwaltung/bestaetigen`. Seitenleiste: Admin · Mitglieder ·
  Änderungsverlauf · ‹ Zur App.
- **Bestätigen:** h1 «Verwaltung öffnen», Text «Zum Schutz der Mitgliederdaten bestätigst du
  einmal am Tag mit einem Code per E-Mail.», Taste «Code schicken», danach Feld «Code aus der
  Mail» (`.feld-code`) und Taste «Bestätigen»; Meldungen aus `MELDUNG` (`login/anmelden.ts`).
- **Mitglieder:** wie Mockup 5 mit Spalte Nummer, Suche «Name, E-Mail oder Nummer», Filter
  Status, Taste «Mitglied anlegen»; Plaketten `aktiv`, `Brief offen`, `ohne Brief`, `gesperrt`.
- **Neu:** Formular mit `.feld-zeile` je Feld, Nummer «(freiwillig)», Taste «Mitglied anlegen»;
  Fehler beim Feld (UI-06); nach Erfolg zur Seite des Mitglieds.
- **Mitglied:** Mockup 6: Gruppen *Angaben* (offen), *Verlauf* links; *Login* (Stand, Geräte,
  «Alle Sitzungen beenden» mit `<dialog>`-Rückfrage «Alle Geräte von <Vorname> werden
  abgemeldet.»), *Rollen* («Rollen speichern», Meldung bei `letzter-admin`: «Du bist der letzte
  Admin. Gib zuerst jemand anderem die Rolle Admin.») rechts. «Angaben speichern» erst aktiv
  nach einer Änderung, danach Rückmeldung «Gespeichert».
- **Änderungsverlauf:** Tabelle Zeit · Wer · Mitglied · Was, neueste zuerst, 100 Einträge.

- [ ] **Step 1:** Svelte-Doku über den MCP holen (Runes, `load` in `+layout.ts`, `goto`,
  `<dialog>`); nach jeder Komponente `svelte-autofixer`.
- [ ] **Step 2: Failing tests**
  - Einheit `src/lib/verwaltung/api.test.ts`: Antworten 401/403/400/409 werden zu typisierten
    Ergebnissen, Netzfehler zu `stoerung`.
  - E2E `SI-08, A-MITGLIED-01, A-MITGLIED-02, A-ROLLE-01, A-MITGLIED-06: Admin bestätigt, legt an, bearbeitet, vergibt Rolle, sieht den Verlauf`
    (Code über `holeMailCode`, Screenshots `verwaltung-mitglieder`, `verwaltung-mitglied`).
  - E2E `SI-07: Alle Sitzungen beenden meldet das Mitglied auf seinem Gerät ab` (zweiter Kontext).
  - E2E `RR-07: Mitglied ohne Rolle sieht keine Kachel und landet bei /verwaltung auf der Startseite`.
  - E2E `RR-03: der letzte Admin sieht die Meldung beim Entzug seiner Rolle`.
- [ ] **Step 3:** `make e2e` → FAIL.
- [ ] **Step 4:** Bausteine in `basis.css`, dann Seiten bauen.
- [ ] **Step 5:** `make e2e` → PASS ohne Konsolenfehler und ohne axe-Befund; `make check` grün.
- [ ] **Step 6:** Commit `feat: Oberfläche der Mitgliederverwaltung (#43)`.

### Task 11: Doku nachführen und Nachweis

**Files:**
- Modify: `docs/rollen-und-rechte.md`, `docs/fachmodell.md`, `docs/anforderungen/anforderungen.md`,
  `docs/testkonzept.md`, `docs/context-scopes.md`, `docs/versionen.md`, `docs/sicherheitskonzept.md`

- [ ] **Step 1:** Status `umgesetzt` für RR-01, RR-03, RR-07, RR-08, RR-09, FR-01, FR-03 und
  A-MITGLIED-01, -02, -06, A-ROLLE-01, -02, je nur, wo ein Test die ID nennt. FR-26 bleibt
  `geplant` mit Vermerk «Löschung nach 12 Monaten kommt mit Etappe 3». `make docs` meldet
  fehlende Tests.
- [ ] **Step 2:** Testkonzept: Zeilen *Anforderung → Testfall* für die neuen Tests; Checkliste
  vor dem Release: «Erika Beispiel öffnet auf Test die Verwaltung mit Code per Mail».
- [ ] **Step 3:** Context-Scopes: Zeile «Mitgliederverwaltung» mit `src/lib/server/admin/`,
  `src/routes/api/admin/`, `src/routes/verwaltung/`, `src/lib/verwaltung/`,
  `scripts/admin-festlegen.ts`.
- [ ] **Step 4:** `docs/versionen.md` unter «Unveröffentlicht»: Etappe 1 von #43.
- [ ] **Step 5:** `make check` → grün. Screenshots der E2E-Läufe ansehen.
- [ ] **Step 6:** Commit `docs: Mitgliederverwaltung Etappe 1 nachgeführt (#43)`.
- [ ] **Step 7:** Review: superpowers-Review und Agent `cas-reviewer`; Befunde klären, dann
  Merge nach `dev` nach Skill `tco-branching` (Schritt 4). `in-arbeit` bleibt (Etappe 2 folgt).
