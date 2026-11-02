# Login per Einmal-Code — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mitglieder melden sich mit Brief-Code oder Mail-Code an und bleiben ein Jahr gleitend angemeldet. Lokal belegt durch Einheits-, DB- und E2E-Tests, dazu ein Musterbrief als PDF.

**Architecture:** Die Fachregeln liegen ohne Datenbank in `src/lib/server/login/` (Codes, Bremse, Regeln). Darüber liegt ein Login-Dienst mit Drizzle, der über Abhängigkeiten zusammengesteckt wird. Die Schnittstellen sind dünne Funktionen, die `+server.ts` nur aufruft. `hooks.server.ts` liest das Sitzungs-Cookie. Die Oberfläche ist SPA (`ssr = false`) und spricht nur mit `/api/*`.

**Tech Stack:** SvelteKit 3, Svelte 5 (Runes), Drizzle + PostgreSQL 18, Vitest (Projekte `einheit`, `datenbank`), Playwright + axe, nodemailer, qrcode-generator, Mailpit (Docker).

**Spec:** `docs/superpowers/specs/2026-11-02-login-einmal-code-design.md` — jede Aufgabe gilt zusammen mit dem Spec.

## Global Constraints

- Neue Pakete nur diese: `nodemailer` (dependencies), `qrcode-generator` (devDependencies). Installation mit `--ignore-scripts`. Blockt `dep-guard`, anhalten und melden, nicht umgehen.
- Vor jedem Svelte-/SvelteKit-Code die Doku über den Svelte-MCP holen und `svelte-autofixer` laufen lassen (CLAUDE.md).
- Unter `src/routes` nur `+server.ts`, `+page.svelte`, `+page.ts`, `+layout.*` (keine `*.server.ts` sonst, keine Form Actions).
- Imports mit `.ts`-Endung wie im Repo. Prettier und ESLint grün.
- Brief-Code: Alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, Länge 10, Anzeige `XXXXX-XXXXX`, gültig 90 Tage. Mail-Code: 6 Ziffern, gültig 15 Minuten, ungültig nach 5 Fehlversuchen.
- Grenzen: Fehlversuche Brief-Code 10/IP/h, Fehlversuche Mail-Code 10/IP/h, Code-Anfragen 10/IP/h, Code-Mails 3/Adresse/h und 10/Adresse/Tag. Einträge in der Bremse spätestens nach 24 h vergessen.
- Sitzung: Cookie `mytco_sitzung`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `maxAge` 365 Tage, Verlängerung höchstens einmal pro 24 h, gültig bis 365 Tage nach `zuletzt_genutzt`.
- Logs: nie Code, Kennung, E-Mail-Adresse oder IP (SI-05, DS-06). Nur feste Texte, höchstens mit Fehlercode wie in `src/lib/server/status.ts`.
- Testdaten: nur erfundene Personen, Adressen `@example.org`. Codes in Tests immer erzeugt, nie fest eingetragen.
- Umgebungsvariablen (alle über `process.env`, wie `DATABASE_URL`, Begründung in `src/lib/server/db/index.ts`):
  `MYTCO_CODE_SCHLUESSEL` (Pflicht, ≥ 32 Zeichen) · `MYTCO_SMTP_URL` · `MYTCO_MAIL_ABSENDER` · `MYTCO_KONTAKT` · `MYTCO_ADRESSE` (Standard `https://my.tcolten.ch`).
- Annahmen an der wirkenden Stelle markieren: `Annahme K-11:` (SMTP), `Annahme K-21:` (Kontakt), `Annahme K-10:` (App-Adresse), `Annahme K-16.1:` (Fensterkuvert). `docs/abklaerungen.md` nicht umbauen.
- Neue Dateien mit `Annahme K-NN`-Markierung erst stagen (`git add <datei>`), dann `make docs`/`make annahmen` laufen lassen. Die Prüfung sieht nur versionierte Dateien.
- Commit-Präfixe `feat:`, `test:`, `docs:`, `fix:`, `refactor:`; Dateien einzeln stagen; jede Nachricht endet mit den Attributionszeilen der Session.

## Review Focus

1. **Gefälschte Anfrage von fremder Seite mit `Content-Type: text/plain`:** braucht keinen CORS-Preflight. Erwartet: Jede ändernde Schnittstelle lehnt alles ausser `application/json` mit 415 ab. Test in Task 8.
2. **Eingabe mit Leerzeichen, Bindestrich, Kleinbuchstaben oder verwechselbaren Zeichen** (`k7mpq r4xht`, `K7MPQ-R4XHT`, `O` statt `0`): Erwartet: Normalisierung nach UI-07. Ein Zeichen ausserhalb des Alphabets ergibt «falsch» und wirft keinen Fehler. Test in Task 2.
3. **Unsinnige Körper** (kein JSON, `code` fehlt oder ist eine Zahl, 10 000 Zeichen lang): Erwartet: 400 `{ fehler: 'falsch' }` bzw. 202 beim Anfordern, kein 500, kein Log mit Inhalt. Test in Task 8.
4. **Zwei gleichzeitige Logins mit demselben Brief-Code:** Erwartet: genau einer erhält eine Sitzung (bedingtes `UPDATE … WHERE brief_code_benutzt_am IS NULL`). Test in Task 6.
5. **Abgelaufener Gerätespeicher oder kaputter `localStorage`-Eintrag** (privates Fenster, JSON kaputt, älter als 15 min): Erwartet: Die App zeigt das Adressfeld und stürzt nicht ab. Test in Task 9.

---

### Task 1: Pakete, Einstellungen, `.env.example`

**Files:**
- Modify: `package.json`, `package-lock.json` (über npm)
- Create: `src/lib/server/einstellungen.ts`
- Test: `src/lib/server/einstellungen.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces:
  ```ts
  export type Einstellungen = {
    codeSchluessel: string; smtpUrl: string; mailAbsender: string;
    kontakt: string; adresse: string;
  };
  export function leseEinstellungen(env?: Record<string, string | undefined>): Einstellungen;
  ```

- [ ] **Step 1:** `npm install --ignore-scripts nodemailer@^10.3.1` und `npm install --ignore-scripts -D qrcode-generator@^2.0.4`. Erwartet: beide in `package.json`, Lockfile aktualisiert.
- [ ] **Step 2: Failing tests** in `einstellungen.test.ts`:
  - `wirft ohne MYTCO_CODE_SCHLUESSEL` → `toThrow('MYTCO_CODE_SCHLUESSEL fehlt oder ist kürzer als 32 Zeichen')`. Gleiches bei 31 Zeichen.
  - `Standardadresse ist https://my.tcolten.ch` bei fehlendem `MYTCO_ADRESSE`.
  - `liest alle Werte` mit einem vollständigen Objekt.
  - `SMTP-URL, Absender und Kontakt sind Pflicht` → Fehlertext nennt nur den **Namen** der Variablen, nie den Wert.
- [ ] **Step 3:** Test laufen lassen: `npx vitest run --project einheit src/lib/server/einstellungen.test.ts` → FAIL.
- [ ] **Step 4:** `leseEinstellungen(env = process.env)` implementieren. Kommentare am jeweiligen Feld: `Annahme K-11: Versand über einen austauschbaren SMTP-Zugang (URL), Anbieter offen`, `Annahme K-21: Ansprechperson bei Login-Problemen ist eine Einstellung`, `Annahme K-10: App-Adresse my.tcolten.ch`.
- [ ] **Step 5:** Tests → PASS.
- [ ] **Step 6:** `.env.example` ergänzen. Erzeugen lässt sich der Schlüssel mit `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Eingetragen wird ein fester, als lokal markierter Wert mit ≥ 32 Zeichen, dazu `MYTCO_SMTP_URL=smtp://localhost:51025`, `MYTCO_MAIL_ABSENDER=MyTCO <mytco@example.org>`, `MYTCO_KONTAKT=das Sekretariat (erfunden), sekretariat@example.org`, `MYTCO_ADRESSE=http://localhost:5173`.
- [ ] **Step 7:** Commit `feat: Pakete für Mail und QR-Code, Einstellungen für den Login (#29)`.

### Task 2: Codes (ohne Datenbank)

**Files:**
- Create: `src/lib/server/login/codes.ts`
- Test: `src/lib/server/login/codes.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const BRIEF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  export const BRIEF_CODE_GUELTIG_MS = 90 * 24 * 60 * 60 * 1000;
  export const MAIL_CODE_GUELTIG_MS = 15 * 60 * 1000;
  export const MAIL_CODE_MAX_FEHLVERSUCHE = 5;
  export function erzeugeBriefCode(zufall?: (n: number) => Uint8Array): string;   // 10 Zeichen, ohne Bindestrich
  export function erzeugeMailCode(zufall?: (n: number) => Uint8Array): string;    // 6 Ziffern
  export function normalisiereBriefCode(eingabe: string): string | null;          // null = kann kein Brief-Code sein
  export function normalisiereMailCode(eingabe: string): string | null;
  export function formatiereBriefCode(code: string): string;                       // 'K7MPQ-R4XHT'
  export function hashBriefCode(schluessel: string, code: string): string;        // HMAC-SHA-256, hex
  export function hashMailCode(schluessel: string, kontoId: number, code: string): string;
  export function gleich(a: string, b: string): boolean;                           // timingSafeEqual
  ```

- [ ] **Step 1: Failing tests** (Namen mit IDs):
  - `SI-01: Brief-Code hat 10 Zeichen aus dem Alphabet` — 1000 Codes, alle passen auf `/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/`.
  - `SI-01: Brief-Code verwirft Bytes über 247 statt Modulo` — ein `zufall`, das zuerst `[255, 248]` und dann `[0, …]` liefert, ergibt ein `A` an der ersten Stelle (Verwerfen statt Modulo; 248 = 8 × 31).
  - `SI-01: grobe Gleichverteilung` — 31 000 Zeichen, jedes Zeichen zwischen 800 und 1200 Mal.
  - `SI-01: Mail-Code hat 6 Ziffern, auch mit führender Null` — `zufall`, der 0 liefert, ergibt `'000000'`.
  - `UI-07: normalisiert Gross/klein, Leerzeichen und Bindestrich` — `' k7mpq-r4xht '` → `'K7MPQR4XHT'`. `'K7MPQ R4XHT'` ebenso.
  - `UI-07: falsche Länge oder fremde Zeichen → null` — `'K7MPQR4XH0'` (enthält 0), `'K7MPQ'`, `'x'.repeat(10000)` → `null`.
  - `normalisiereMailCode` — `' 012 345 '` → `'012345'`, `'12345a'` → `null`.
  - `formatiereBriefCode('K7MPQR4XHT')` → `'K7MPQ-R4XHT'`.
  - `DS-10: Hash hängt vom Schlüssel ab und ist deterministisch`. `hashMailCode` unterscheidet Konten (gleicher Code, Konto 1 und 2 → verschiedene Hashes).
- [ ] **Step 2:** `npx vitest run --project einheit src/lib/server/login/codes.test.ts` → FAIL.
- [ ] **Step 3:** Implementieren mit `node:crypto` (`randomBytes`, `createHmac`, `timingSafeEqual`). Für die Zeichen Bytes ≥ 248 verwerfen, damit die Verteilung gleich bleibt (Ziffern: Bytes ≥ 250 verwerfen).
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** Commit `feat: Einmal-Codes erzeugen, normalisieren und hashen (#29)`.

### Task 3: Bremse (Rate Limit im Arbeitsspeicher)

**Files:**
- Create: `src/lib/server/login/bremse.ts`
- Test: `src/lib/server/login/bremse.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export class Bremse {
    constructor(opt: { grenze: number; fensterMs: number; jetzt?: () => number });
    erlaubt(schluessel: string): boolean;   // zählt nicht
    zaehle(schluessel: string): void;
    raeumeAuf(): void;                      // entfernt Zeitstempel ausserhalb des Fensters und leere Schlüssel
    get groesse(): number;                  // Zahl der Schlüssel, nur für Tests lesend
  }
  export type Bremsen = {
    briefFehlerProIp: Bremse; mailFehlerProIp: Bremse; anfragenProIp: Bremse;
    mailsProAdresseStunde: Bremse; mailsProAdresseTag: Bremse;
  };
  export function erstelleBremsen(jetzt?: () => number): Bremsen;  // Werte aus Global Constraints
  ```

- [ ] **Step 1: Failing tests** mit einer einstellbaren Zeit:
  - `SI-02: nach 10 gezählten Fehlversuchen ist die IP gesperrt, nach einer Stunde wieder frei` (gleitend: Ein Versuch bei t=0 fällt bei t=60 min + 1 ms heraus).
  - `SI-04: 3 Mails pro Adresse und Stunde, 10 pro Tag` über `erstelleBremsen`.
  - `DS-06: raeumeAuf vergisst Schlüssel ohne Eintrag im Fenster` — nach 24 h + 1 ms ist die interne Grösse 0 (Getter `groesse` nur lesend).
  - Schlüssel sind unabhängig (`'a'` gesperrt, `'b'` frei).
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implementieren: `Map<string, number[]>` mit Zeitstempeln. `zaehle` und `erlaubt` verwerfen Stempel ausserhalb des Fensters, leere Listen werden gelöscht. Da alle Fenster ≤ 24 h sind, erfüllt das DS-06. `erstelleBremsen` startet einen `setInterval(raeumeAuf, 10 min)` mit `.unref()`.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: Rate Limit im Arbeitsspeicher (#29)`.

### Task 4: Schema, Migration, Testdatenbank migriert

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Create: `drizzle/0001_*.sql` (über `npm run db:generate`), `drizzle/meta/*`
- Modify: `tests/setup/datenbank-global.ts`
- Create: `tests/hilfen/mitglieder.ts`
- Test: `src/lib/server/db/schema.db.test.ts`

**Interfaces:**
- Produces (Drizzle-Tabellen, `snake_case` in SQL):
  - `mitglied`: `id serial pk`, `vorname text not null`, `nachname text not null`, `strasse text not null`, `plz text not null`, `ort text not null`, `email text not null unique`, `status text not null default 'aktiv'` mit Check `in ('aktiv','ausgetreten','geloescht')`.
  - `konto`: `id serial pk`, `mitglied_id int not null unique references mitglied on delete cascade`, `sitzungsversion int not null default 1`, `gesperrt boolean not null default false`, `brief_code_hash text unique`, `brief_code_ablauf timestamptz`, `brief_code_benutzt_am timestamptz`, `mail_code_hash text`, `mail_code_ablauf timestamptz`, `mail_code_fehlversuche int not null default 0`.
  - `sitzung`: `kennung_hash text pk`, `konto_id int not null references konto on delete cascade`, `sitzungsversion int not null`, `erstellt_am timestamptz not null`, `zuletzt_genutzt timestamptz not null`, Index auf `konto_id`.
  - `tests/hilfen/mitglieder.ts`: `legeMitgliedAn(db: Db, teil?: Partial<{ vorname: string; status: string; gesperrt: boolean }>): Promise<{ mitgliedId: number; kontoId: number; email: string; vorname: string }>` — erfundene Werte, `email` = `test-${randomUUID()}@example.org`.

- [ ] **Step 1: Failing test** `schema.db.test.ts`: `FR-25: E-Mail-Adresse gehört zu höchstens einem Mitglied` (zweites Insert mit gleicher Adresse wirft) und `Konto wird mit dem Mitglied gelöscht`.
- [ ] **Step 2:** `make db && npm run test:db -- src/lib/server/db/schema.db.test.ts` → FAIL (Tabelle fehlt).
- [ ] **Step 3:** Schema schreiben, `npm run db:generate -- --name login`. `datenbank-global.ts` führt nach `CREATE DATABASE` die Migrationen aus (`migrate` aus `drizzle-orm/node-postgres/migrator`, wie `scripts/migrate.ts`). So migrieren parallele Test-Dateien nicht gleichzeitig.
- [ ] **Step 4:** → PASS. Zusätzlich laufen alle DB-Tests (`npm run test:db`) grün, auch «Migrationen laufen auf leerer Datenbank durch».
- [ ] **Step 5:** Commit `feat: Tabellen für Mitglied, Konto und Sitzung (#29)`.

### Task 5: Sitzungen

**Files:**
- Create: `src/lib/server/login/sitzung.ts`
- Test: `src/lib/server/login/sitzung.test.ts` (Regeln), `src/lib/server/login/sitzung.db.test.ts`

**Interfaces:**
- Consumes: Tabellen aus Task 4.
- Produces:
  ```ts
  export const SITZUNG_COOKIE = 'mytco_sitzung';
  export const SITZUNG_GUELTIG_MS = 365 * 24 * 60 * 60 * 1000;
  export const VERLAENGERN_NACH_MS = 24 * 60 * 60 * 1000;
  // Regeln ohne DB
  export function sitzungAbgelaufen(zuletztGenutzt: Date, jetzt: Date): boolean;
  export function mussVerlaengern(zuletztGenutzt: Date, jetzt: Date): boolean;
  // DB
  export type AngemeldetesKonto = { kontoId: number; vorname: string };
  export function erstelleSitzung(db: Db, kontoId: number, jetzt: Date, alteKennung?: string): Promise<string>; // Klartext-Kennung
  export function pruefeSitzung(db: Db, kennung: string, jetzt: Date): Promise<{ konto: AngemeldetesKonto; verlaengert: boolean } | null>;
  export function beendeSitzung(db: Db, kennung: string): Promise<void>;
  export function beendeAlleSitzungen(db: Db, kontoId: number): Promise<void>;
  ```

- [ ] **Step 1: Failing tests (Regeln):** `A-LOGIN-09: Sitzung gilt 365 Tage nach letzter Nutzung` (365 Tage − 1 ms gültig, + 1 ms abgelaufen) und `mussVerlaengern` erst nach 24 h.
- [ ] **Step 2: Failing tests (DB):**
  - `SI-06: Kennung hat 32 Zufallsbytes und steht nur als Hash in der Datenbank` — Kennung base64url mit 43 Zeichen. `select kennung_hash` ≠ Kennung und = SHA-256(Kennung) hex.
  - `SI-06: Login mit altem Cookie löscht dessen Sitzung`.
  - `FR-24/SI-07: beendeAlleSitzungen erhöht die Sitzungsversion und beendet die Sitzungen aller Geräte` — zwei Sitzungen, danach liefern beide `null`, und `konto.sitzungsversion` ist um 1 höher.
  - `SI-07: Sitzung mit älterer Sitzungsversion ist ungültig`, auch wenn die Zeile noch existiert (Version von Hand per SQL erhöhen).
  - `gesperrtes Konto oder nicht aktives Mitglied → null`.
  - `gleitend: pruefeSitzung nach 25 h setzt zuletzt_genutzt neu und meldet verlaengert`. Nach 1 h `verlaengert: false` und die Zeile ist unverändert.
  - `abgelaufene Sitzungen löscht erstelleSitzung` (Zeile mit `zuletzt_genutzt` vor 366 Tagen ist danach weg).
  - `beendeSitzung löscht nur diese Zeile`.
- [ ] **Step 3:** → FAIL.
- [ ] **Step 4:** Implementieren. `erstelleSitzung` löscht in einer Transaktion abgelaufene Zeilen (aller Konten) und die alte Kennung und fügt die neue ein. `pruefeSitzung` liest Sitzung, Konto und Mitglied mit einem Join.
- [ ] **Step 5:** → PASS.
- [ ] **Step 6:** Commit `feat: Sitzungen mit Sitzungsversion und gleitender Laufzeit (#29)`.

### Task 6: Brief-Code ausstellen und einlösen

**Files:**
- Create: `src/lib/server/login/dienst.ts`
- Test: `src/lib/server/login/brief.db.test.ts`

**Interfaces:**
- Consumes: Task 2 (Codes), Task 3 (`Bremsen`), Task 5 (Sitzungen).
- Produces:
  ```ts
  export type Mailer = (n: { an: string; betreff: string; text: string }) => Promise<void>;
  export type LoginAbh = { db: Db; schluessel: string; kontakt: string; mailer: Mailer; bremsen: Bremsen; jetzt?: () => Date };
  export type LoginErgebnis =
    | { ergebnis: 'ok'; kennung: string }
    | { ergebnis: 'falsch' }
    | { ergebnis: 'benutzt'; kontakt: string }
    | { ergebnis: 'zu-viele' };
  export type LoginDienst = {
    stelleBriefCodeAus(kontoId: number): Promise<{ code: string; gueltigBis: Date }>;   // RR-04: einziger Moment mit Klartext
    loginMitBriefCode(eingabe: unknown, ip: string, alteKennung?: string): Promise<LoginErgebnis>;
    // Task 7 ergänzt: fordereMailCodeAn, loginMitMailCode
    beendeAlleSitzungen(kontoId: number): Promise<void>;
    pruefeSitzung(kennung: string): ReturnType<typeof pruefeSitzung>;
    beendeSitzung(kennung: string): Promise<void>;
  };
  export function erstelleLoginDienst(abh: LoginAbh): LoginDienst;
  ```

- [ ] **Step 1: Failing tests** (jede Datei baut ihren Dienst mit eigenen `erstelleBremsen()` und fester Zeit):
  - `FR-24: Brief-Code gilt nur einmal` — erster Login `ok`, zweiter `benutzt` mit `kontakt`.
  - `RR-04: Datenbank enthält den Brief-Code nicht im Klartext` — weder `brief_code_hash` noch eine andere Spalte des Kontos enthält den Code.
  - `neuer Brief-Code ersetzt nur den alten Brief-Code` — alter Code danach `falsch`. Ein offener Mail-Code bleibt gültig (Hash unverändert).
  - `Login mit Brief-Code macht den Mail-Code ungültig` — `mail_code_hash` danach `null`.
  - `Brief-Code nach 90 Tagen abgelaufen → falsch` (Zeit + 90 Tage + 1 ms).
  - `Eingabe mit Kleinbuchstaben und Bindestrich wird angenommen (UI-07)`.
  - `gesperrtes Konto: gültiger Code → falsch, Code bleibt unverbraucht` — nach dem Entsperren klappt derselbe Code.
  - `SI-02: 10 Fehlversuche pro IP, dann zu-viele, auch für einen gültigen Code`. Eine andere IP ist nicht betroffen.
  - `unsinnige Eingabe (Zahl, null, 10 000 Zeichen) → falsch, ohne Fehler`.
  - `Review Focus 4: zwei gleichzeitige Logins mit demselben Code → genau ein ok` (`Promise.all`).
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implementieren. Einlösen per bedingtem `UPDATE konto SET brief_code_benutzt_am = jetzt, mail_code_hash = null … WHERE brief_code_hash = $h AND brief_code_benutzt_am IS NULL AND brief_code_ablauf > jetzt AND NOT gesperrt AND <Mitglied aktiv> RETURNING id`. Kommt nichts zurück, unterscheidet eine zweite Abfrage zwischen `benutzt` und `falsch`. Nur `falsch` zählt in der Bremse. Ein gesperrtes Konto liefert `falsch` (Spec, Abschnitt *Codes*).
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: Brief-Code ausstellen und einlösen (#29)`.

### Task 7: Mail-Code anfordern und einlösen, Mailversand

**Files:**
- Create: `src/lib/server/login/mail.ts`
- Modify: `src/lib/server/login/dienst.ts`
- Test: `src/lib/server/login/mail.test.ts`, `src/lib/server/login/mailcode.db.test.ts`

**Interfaces:**
- Consumes: Task 6 (`LoginAbh`, `Mailer`, `LoginErgebnis`).
- Produces:
  ```ts
  // mail.ts
  export function baueCodeMail(code: string): { betreff: string; text: string };
  export function erstelleSmtpMailer(transport: string | object, absender: string): Mailer; // nodemailer.createTransport
  // dienst.ts, LoginDienst ergänzt um
  fordereMailCodeAn(email: unknown, ip: string): { annahme: 'ok' | 'zu-viele'; arbeit: Promise<void> };
  loginMitMailCode(email: unknown, eingabe: unknown, ip: string, alteKennung?: string): Promise<LoginErgebnis>; // nie 'benutzt'
  ```

- [ ] **Step 1: Failing tests `mail.test.ts`:**
  - `baueCodeMail`: Betreff `'Dein Code für MyTCO'`. Der Text beginnt mit dem Code, enthält `'15 Minuten'` und `'Hast du keinen Code angefordert? Dann kannst du diese Mail ignorieren.'`, aber kein `http`.
  - `erstelleSmtpMailer` mit `{ jsonTransport: true }` verschickt mit `from` = Absender, `to`, `subject`, `text` und ohne `html`.
- [ ] **Step 2: Failing tests `mailcode.db.test.ts`** (Mailer ist eine Funktion, die Nachrichten in einem Array sammelt; auf `arbeit` wird gewartet):
  - `A-LOGIN-10: bekannte Adresse erhält einen 6-stelligen Code, der einmal gilt`.
  - `Adresse wird normalisiert` (`'  Test-…@Example.org '` findet das Konto).
  - `SI-04: unbekannte Adresse → gleiche Annahme, keine Mail`. `annahme` ist für beide `'ok'`, und das Objekt ohne `arbeit` ist gleich.
  - `SI-04: Annahme wartet nicht auf die Arbeit` — der Mailer hängt (Promise ohne Auflösung), trotzdem kehrt `fordereMailCodeAn` synchron zurück.
  - `SI-04: höchstens 3 Mails pro Adresse und Stunde, 10 pro Tag` — die 4. Anfrage liefert `annahme: 'ok'`, aber keine Mail. Nach 1 h geht wieder eine.
  - `SI-04: 10 Anfragen pro IP und Stunde, dann zu-viele`.
  - `gesperrtes Konto oder nicht aktives Mitglied → keine Mail`.
  - `neuer Mail-Code ersetzt nur den alten Mail-Code` — der Brief-Code bleibt gültig (Entscheid «zwei getrennte Codes»).
  - `Login mit Mail-Code macht Brief-Code ungültig` — der Brief-Code liefert danach `benutzt`.
  - `SI-03: nach 5 Fehlversuchen ist der Mail-Code ungültig`, auch der richtige → `falsch`.
  - `Mail-Code nach 15 Minuten abgelaufen → falsch`.
  - `B-02: unbekannte Adresse und verbrauchter Code liefern beide falsch`.
  - `SI-05: Versandfehler loggt nur eine feste Zeile` — der Mailer wirft `Error('smtp://user:pw@host ' + email)`. Danach gilt `console.error.mock.calls` = `[['Code-Mail nicht versandt']]`.
- [ ] **Step 3:** → FAIL.
- [ ] **Step 4:** Implementieren. Die `arbeit` fängt jeden Fehler selbst ab (keine unbehandelte Ablehnung). Der Code wird erst gespeichert, dann versandt. Fehlversuche werden per `UPDATE … SET mail_code_fehlversuche = mail_code_fehlversuche + 1`, ab 5 gilt der Code als ungültig. Fehlversuche zählen zusätzlich in `mailFehlerProIp`. Am Mailer der Kommentar `Annahme K-11: …`.
- [ ] **Step 5:** → PASS.
- [ ] **Step 6:** Commit `feat: Mail-Code anfordern und einlösen (#29)`.

### Task 8: Schnittstellen und Sitzungs-Hook

**Files:**
- Create: `src/lib/server/login/schnittstellen.ts`, `src/lib/server/login/index.ts` (`holeLoginDienst()`: Singleton aus `leseEinstellungen()`, `holeDb()`, `erstelleSmtpMailer`, `erstelleBremsen()`)
- Create: `src/routes/api/login/brief/+server.ts`, `src/routes/api/login/mail-code/+server.ts`, `src/routes/api/login/mail/+server.ts`, `src/routes/api/sitzung/+server.ts`, `src/routes/api/logout/+server.ts`
- Modify: `src/hooks.server.ts`, `src/app.d.ts` (`App.Locals { konto?: AngemeldetesKonto }`)
- Create: `tests/hilfen/anfrage.ts`
- Test: `src/lib/server/login/schnittstellen.db.test.ts`

**Interfaces:**
- Consumes: `LoginDienst` (Tasks 6–7), `SITZUNG_COOKIE`.
- Produces:
  ```ts
  type Ereignis = Pick<RequestEvent, 'request' | 'cookies' | 'getClientAddress' | 'locals'>;
  export function postBrief(d: LoginDienst, e: Ereignis): Promise<Response>;
  export function postMailCode(d: LoginDienst, e: Ereignis): Promise<Response>;
  export function postMail(d: LoginDienst, e: Ereignis): Promise<Response>;
  export function getSitzung(e: Ereignis): Response;
  export function postLogout(d: LoginDienst, e: Ereignis): Promise<Response>;
  export function ladeSitzung(d: LoginDienst, e: Ereignis): Promise<void>; // setzt e.locals.konto, verlängert Cookie
  ```
  `tests/hilfen/anfrage.ts`: `ereignis(opt: { body?: unknown; contentType?: string; cookie?: string; ip?: string }): Ereignis & { gesetzt: Map<string, { wert: string; opt: object }>; geloescht: string[] }`.
- Antworten wie in der Spec (Tabelle *Schnittstellen*). Alle mit `cache-control: no-store`.

- [ ] **Step 1: Failing tests:**
  - `POST /api/login/brief mit gültigem Code → 200 und Cookie mit HttpOnly, Secure, SameSite=Lax, Path=/, maxAge 365 Tage` (Optionen aus `gesetzt` prüfen).
  - `… benutzt → 400 { fehler: 'benutzt', kontakt }`, `… falsch → 400 { fehler: 'falsch' }`, `… zu viele → 429`.
  - `Review Focus 1: text/plain → 415` für alle drei POST-Login-Schnittstellen und Logout.
  - `Review Focus 3: kein JSON, fehlendes Feld oder Zahl → 400 falsch` (Login) bzw. `202` (Anfordern), kein Wurf.
  - `SI-04: POST /api/login/mail-code → 202 {} für bekannte und unbekannte Adresse`, gleicher Körper, gleiche Kopfzeilen.
  - `GET /api/sitzung ohne Cookie → 401`, `mit Cookie → 200 { vorname }`, `nach beendeAlleSitzungen → 401`.
  - `ladeSitzung verlängert das Cookie nach 25 h` und setzt bei 1 h nichts.
  - `SI-06: Logout löscht Sitzung und Cookie → 204`. Danach → 401.
  - `SI-05: Kein Log enthält Code, Kennung, Adresse oder IP` — `console.error`, `console.warn`, `console.log` über den ganzen `describe` abfangen. Danach enthält kein Aufruf eines der verwendeten Geheimnisse.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implementieren. `+server.ts` je eine Zeile, z. B. `export const POST = (e) => postBrief(holeLoginDienst(), e)`. Der Hook ruft `ladeSitzung` nur für `event.url.pathname.startsWith('/api/')` auf, die bestehenden Sicherheits-Header bleiben. `export const init` in `hooks.server.ts` ruft `leseEinstellungen()` auf (die App startet nicht ohne Schlüssel). Vorher die Svelte-MCP-Doku zu `init` prüfen.
- [ ] **Step 4:** → PASS. Danach `npm test` (alle, mit Abdeckung ≥ 90 % für `src/lib/server/**`).
- [ ] **Step 5:** Commit `feat: Login-Schnittstellen und Sitzungs-Hook (#29)`.

### Task 9: Mailpit, E2E-Umgebung, Oberfläche, E2E-Abläufe

**Files:**
- Modify: `docker-compose.yml` (Service `mail`: `axllent/mailpit:v1.33`, Ports `51025:1025`, `58025:8025`), `Makefile` (`db` startet auch `mail`; neues Ziel `seed`), `.github/workflows/check.yml` (E2E-Job: Service `mail` mit denselben Ports, Umgebungsvariablen aus `.env.example`)
- Modify: `playwright.config.ts` (`webServer.command`: `npm run build && node scripts/migrate.ts && node build`; `env` mit allen `MYTCO_*`, Standardwerte wie `.env.example`, `MYTCO_ADRESSE` = `baseURL`)
- Create: `scripts/seed-lokal.ts` (legt 2 erfundene Mitglieder an und gibt für das erste einmal einen Brief-Code aus. Bricht ab, wenn der Host von `DATABASE_URL` nicht `localhost`/`127.0.0.1` ist)
- Create: `src/lib/login/mailanfrage.ts` + `src/lib/login/mailanfrage.test.ts`
- Create: `src/routes/login/+page.svelte`, `src/routes/login/mail/+page.svelte`, `src/routes/+page.ts`
- Modify: `src/routes/+page.svelte`
- Create: `tests/e2e/hilfen/login.ts` (Konto anlegen und Brief-Code ausstellen über `erstelleLoginDienst` mit `MYTCO_CODE_SCHLUESSEL` aus der Playwright-Umgebung, Mail-Code aus Mailpit über `GET http://localhost:58025/api/v1/search?query=to:"<adresse>"` und `GET /api/v1/message/<ID>` lesen)
- Test: `tests/e2e/login.test.ts`; `tests/e2e/startseite.test.ts` anpassen (Startseite leitet ohne Sitzung auf `/login`)

**Interfaces:**
- Consumes: Schnittstellen aus Task 8.
- Produces:
  ```ts
  // src/lib/login/mailanfrage.ts — Speicher wird übergeben, damit testbar ohne Browser
  export const MAILANFRAGE_SCHLUESSEL = 'mytco-mailanfrage';
  export function merkeMailanfrage(s: Pick<Storage, 'setItem'>, email: string, jetzt: number): void;
  export function leseMailanfrage(s: Pick<Storage, 'getItem' | 'removeItem'>, jetzt: number): string | null; // löscht abgelaufene/kaputte Einträge
  export function vergissMailanfrage(s: Pick<Storage, 'removeItem'>): void;
  ```
  Jeder Zugriff steht in `try/catch`, ein Fehler gilt als «kein Eintrag».

- [ ] **Step 1: Failing tests `mailanfrage.test.ts`:** Der Eintrag ist 15 Minuten lesbar und danach `null` und gelöscht. `Review Focus 5:` Bei kaputtem JSON, einem `getItem`, der wirft, und einem `setItem`, der wirft, entsteht kein Wurf und das Ergebnis ist `null`.
- [ ] **Step 2:** → FAIL. Dann implementieren → PASS.
- [ ] **Step 3:** Mailpit, Make, CI und Playwright konfigurieren. `make db` → `docker compose ps` zeigt `mail` als laufend. `make seed` gibt einen Code in der Form `XXXXX-XXXXX` aus.
- [ ] **Step 4: Failing E2E** `tests/e2e/login.test.ts` (alle drei Projekte, jeder Test mit eigenem Konto; Konsolenfehler wie in `startseite.test.ts` sammeln und am Ende `[]` erwarten; axe auf jedem Bildschirm `[]`; Screenshot je Bildschirm):
  - `A-LOGIN-08: Login mit Brief-Code` — `/` leitet auf `/login`. Code in Kleinbuchstaben mit Bindestrich eintippen, «Anmelden» → «Hoi <Vorname>».
  - `A-LOGIN-09: nach Neuladen und in neuem Tab weiterhin angemeldet`.
  - `SI-06: Abmelden führt zur Login-Seite`. `/` leitet danach wieder um.
  - `SI-02: benutzter Brief-Code zeigt «Dieser Code wurde schon benutzt. Wende dich an <Kontakt>.»`.
  - `A-LOGIN-10: Code per E-Mail, mit Neuladen zwischen Anfrage und Eingabe` — Adresse eingeben, «Code schicken». Der Hinweis «Falls ein Konto zu dieser Adresse besteht, ist eine Mail unterwegs» erscheint. Danach `page.reload()`, das Feld «Code aus der Mail» steht noch da. Code aus Mailpit eintippen → «Hoi <Vorname>».
  - `SI-07: nach beendeAlleSitzungen führt der nächste Aufruf zur Login-Seite`.
- [ ] **Step 5:** → FAIL. Vorher die Svelte-MCP-Doku holen (Abschnitte zu `$state`, `load`, `goto`, `redirect`).
- [ ] **Step 6:** Oberfläche bauen nach dem Mockup «Login» (`docs/ui-mockups/index.html`). Nur Bausteine aus `basis.css` verwenden (`.feld`, `.feld-code`, `.feld-hilfe`, `.taste-haupt`, `.taste-breit`, `.taste-neben`, `.fehler`, `.hinweis`, `.leise`), Texte wörtlich aus Spec *Ablauf in der App*. `+page.ts` für `/` lädt `/api/sitzung` und leitet bei 401 per `redirect(307, '/login')` um. «Abmelden» ist `.taste-neben` (UI-04). Danach `svelte-autofixer` für jede Komponente.
- [ ] **Step 7:** `make e2e` → PASS (alle Projekte, auch die angepassten Startseiten-Tests).
- [ ] **Step 8:** Commit(s) `feat: Login-Oberfläche mit Brief- und Mail-Code (#29)` und `test: E2E-Abläufe für den Login (#29)`.

### Task 10: Web-App-Manifest

**Files:**
- Create: `static/manifest.webmanifest`
- Modify: `src/app.html` (`<link rel="manifest" href="%sveltekit.assets%/manifest.webmanifest" />`), `docs/ui-leitbild.md` (Tabelle *Code-Stelle*: Zeile «Manifest (Name, Farben fest in der Datei)» → `static/manifest.webmanifest`)
- Test: `tests/e2e/startseite.test.ts` (neuer Test)

- [ ] **Step 1: Failing E2E** `Manifest ist gültig und macht MyTCO zur eigenständigen App` — `request.get('/manifest.webmanifest')` → 200, JSON mit `display: 'standalone'`, `start_url: '/'`, `scope: '/'`, `name: 'MyTCO'`, Symbole 192 und 512, die beide mit 200 laden. Auf `/login` existiert `link[rel=manifest]`, und es entsteht kein Konsolenfehler (CSP).
- [ ] **Step 2:** → FAIL. Leitbild-Zeile zuerst, dann Datei: `theme_color` = Wert von `--farbe-marke` (`#0f6b4f`, wie in `app.html`), `background_color` = Wert des Hintergrund-Tokens aus `tokens.css`, mit Kommentar in der Leitbild-Zeile, dass die Werte von Hand mit den Tokens übereinstimmen müssen.
- [ ] **Step 3:** `make e2e` → PASS. `make docs` grün.
- [ ] **Step 4:** Commit `feat: Web-App-Manifest für die Startbildschirm-App (#29)`.

### Task 11: Musterbrief

**Files:**
- Modify: `docs/ui-leitbild.md` (neuer Abschnitt «Brief (Druck)» mit Token-Tabelle), `src/lib/design/tokens.css` (dieselben Tokens)
- Create: `src/lib/server/brief/brief.ts`, `src/lib/server/brief/symbole.ts` (SVG-Symbole Teilen und Drei-Punkte-Menü, 24er-Raster, Strich 2)
- Test: `src/lib/server/brief/brief.test.ts`
- Create: `scripts/musterbrief.ts`, Make-Ziel `musterbrief`

**Interfaces:**
- Produces:
  ```ts
  export type BriefDaten = {
    vorname: string; nachname: string; strasse: string; plz: string; ort: string;
    code: string; gueltigBis: Date; adresse: string; kontakt: string;
  };
  export function baueBriefHtml(d: BriefDaten, tokensCss: string): string;
  ```
- Brief-Tokens (Werte in `mm`, deshalb nur in `tokens.css`): `--brief-rand` 20mm, `--brief-fenster-oben` 45mm, `--brief-fenster-links` 118mm, `--brief-fenster-breite` 80mm, `--brief-qr` 35mm. Am Leitbild-Abschnitt: `Annahme K-16.1: Fensterkuvert C5/6 mit Fenster rechts`.

- [ ] **Step 1: Failing tests:**
  - `A-LOGIN-01: Brief enthält Code als zwei Fünfergruppen, gültig bis, App-Adresse als Text, QR-Code als <svg>, Ansprechperson und Datenschutz-Hinweis`.
  - `Brief maskiert alle eingesetzten Werte` — `vorname: '<script>x</script>'` erscheint als `&lt;script&gt;`, ebenso `&`, `"` in Kontakt und Adresse.
  - `QR-Code kodiert genau die App-Adresse`. Prüfung: Das SVG ändert sich mit der Adresse und ist für dieselbe Adresse gleich. Ein Rückwärts-Lesen ist nicht nötig.
  - `Anleitung hat fünf Schritte für iPhone und Android` (`ol` mit 5 `li` je System).
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Implementieren. `qrcode-generator` mit Fehlerkorrektur `M`, `createSvgTag({ scalable: true, margin: 4 })`. Die Druck-CSS (`@page { size: A4; margin: 0 }`) nutzt nur `var(--brief-…)` und Leitbild-Tokens. Den Text schreibt der Builder innerhalb der Spec, Du-Form.
- [ ] **Step 4:** → PASS. `npm run pruefungen` grün (`design-festwerte`). `make docs` grün (`design-tokens`).
- [ ] **Step 5:** `scripts/musterbrief.ts`: erfundenes Mitglied (Name, Strasse, PLZ und Ort erfunden), `erzeugeBriefCode()` (nicht gespeichert), `gueltigBis` heute + 90 Tage, `MYTCO_KONTAKT` und `MYTCO_ADRESSE` aus der Umgebung, sonst wie `.env.example`. Chromium aus `@playwright/test` → `page.setContent(html)` → `page.pdf({ path: 'build/musterbrief.pdf', format: 'A4', printBackground: true })`. Make-Ziel `musterbrief: ## Musterbrief als PDF mit erfundenen Daten (build/musterbrief.pdf)`.
- [ ] **Step 6:** `make musterbrief` → Datei existiert. PDF lesen (Read-Tool) und prüfen: Code sichtbar, QR sichtbar, Adresse im Fensterbereich rechts, eine Seite.
- [ ] **Step 7:** Commit `feat: Musterbrief mit QR-Code und Anleitung (#29)`.

### Task 12: Doku nachführen

**Files:**
- Create: `docs/adr/adr-004-login-einmal-code.md`. Modify: `docs/adr/adr-index.md`
- Modify: `docs/fachmodell.md`, `docs/rollen-und-rechte.md`, `docs/sicherheitskonzept.md`, `docs/datenschutz.md`, `docs/datenschutzerklaerung.md`, `docs/ci-cd-und-release.md`, `docs/context-scopes.md`, `docs/versionen.md`, `README.md` (nur falls Befehle fehlen: `make seed`, `make musterbrief`)

- [ ] **Step 1:** ADR-004 nach `docs/adr/vorlage.md`. Inhalt laut Spec, Abschnitt *Doku, die mitgeht*:
  - Optionen und Begründung.
  - Abweichung «Sitzungstabelle statt signiertem Cookie».
  - Herkunftsschutz: nur JSON, 415 sonst, `SameSite=Lax`.
  - Restrisiko «5 Fehlversuche entwerten Mail-Code».
  - Freigegebene Pakete mit Version und Lizenz.
  - B und C offen (reflexionsinstrument#41).
  - Reevaluations-Trigger: Testergebnis A/B/C, Wechsel zu mehreren App-Prozessen, weil die Bremse dann nicht mehr im Arbeitsspeicher reicht.
- [ ] **Step 2:** Fachmodell:
  - Konto mit Brief-Code und Mail-Code getrennt beschreiben (Hash, Ablauf, benutzt am, Fehlversuche).
  - FR-24 präzisieren: Ein neuer Code ersetzt nur einen Code derselben Art, und ein Login macht beide ungültig.
  - Den Status von FR-24 auf `umgesetzt` setzen, die Tests aus Task 5–7 nennen die ID.
  - RR-04 sinngemäss angleichen, Status bleibt `geplant`, weil die Admin-Oberfläche fehlt.
- [ ] **Step 3:** Sicherheitskonzept:
  - Tabelle *Login*: Zeile «Ersetzt» und Bremse «10 Fehlversuche pro IP und Stunde» beim Mail-Code.
  - SI-03: «immer dieselbe Meldung».
  - SI-06: Sitzungstabelle, Kennung nur als Hash, Herkunftsschutz über JSON.
- [ ] **Step 4:** Datenschutz:
  - *Löschen*: zwei neue Punkte, die Sitzungen und die E-Mail-Adresse im Gerätespeicher.
  - Datenschutzerklärung: ein Satz zum Gerätespeicher.
  - Prüfen, ob die Sitzung dort abgedeckt ist, sonst einen Satz ergänzen.
- [ ] **Step 5:** `ci-cd-und-release.md`:
  - Abschnitt «Einstellungen der App» mit den fünf `MYTCO_*` und dem Hinweis `ADDRESS_HEADER`/`XFF_DEPTH` hinter dem Reverse Proxy, als **Schnittstelle zu #32**.
  - Mailpit lokal und in der CI.
  - Im Text die Annahmen markieren (K-10, K-11, K-21).
- [ ] **Step 6:** `context-scopes.md`: Zeile «Login und Sitzung» → `src/lib/server/login/`, `src/routes/api/login/`, `src/routes/login/`, `src/hooks.server.ts`, `docs/sicherheitskonzept.md`, `docs/adr/adr-004-login-einmal-code.md`. Zeile «Brief» → `src/lib/server/brief/`, `scripts/musterbrief.ts`. `versionen.md` unter «Unveröffentlicht»: Login per Einmal-Code (lokal), Manifest, Musterbrief.
- [ ] **Step 7:** `make docs` → «Doku-Check ok», `test-ids: ok`, `annahmen: ok`, `design-tokens: ok`.
- [ ] **Step 8:** Commit `docs: ADR-004 und Konzepte auf den gebauten Login nachgeführt (#29)`.

### Task 13: Gesamtprüfung

- [ ] **Step 1:** `make check` → alles grün (Lint, svelte-check, Prüfskripte, Tests mit Abdeckung, beide Builds, E2E, Image).
- [ ] **Step 2:** Prüfen, dass das Image `nodemailer` enthält und startet: `docker run --rm -e MYTCO_CODE_SCHLUESSEL=… -e … mytco:lokal node -e "import('nodemailer').then(()=>console.log('ok'))"` → `ok`.
- [ ] **Step 3:** Screenshots aus `test-results/` für Login, Mail-Code und Startseite auf iPhone und Android sowie `build/musterbrief.pdf` als Nachweis bereitlegen.
- [ ] **Step 4:** Branch pushen `git push -u origin feat/issue-029`, danach Review (superpowers-Review und Agent `cas-reviewer`).
