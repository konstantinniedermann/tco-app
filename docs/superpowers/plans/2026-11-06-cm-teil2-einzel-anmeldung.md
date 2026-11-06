# CM Teil 2 — Einzel-Anmeldung der Mitglieder: Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mitglieder melden sich am Handy selbst zu Einzel-Kategorien der Clubmeisterschaft an
und wieder ab (höchstens 3, nur passende, Bestätigung per Mail). Die Verwaltung warnt beim Ändern
einer Kategorie vor unpassenden Anmeldungen und sperrt das Absagen, solange es aktive gibt.

**Architecture:** Neue reine Fachlogik `src/lib/turnier/passung.ts` (läuft auf Server und im
Browser), neues Server-Modul `src/lib/server/cm/` für die Mitgliederseite nach dem Muster von
`src/lib/server/anlass/` (DB-Funktionen, Mail, Schnittstellen, Dienste), dünne `+server.ts` unter
`src/routes/api/cm/`. Die Verwaltung (`src/lib/server/turnier/`) bekommt Zählung, Warnung und
Sperre. Seite `/clubmeisterschaft/[id]` für Mitglieder, Kachel auf der Startseite, Klassierung im
Profil.

**Tech Stack:** SvelteKit / Svelte 5 (nur `+server.ts`, ADR-002), Drizzle ORM + PostgreSQL,
Vitest (Einheit + Datenbank), Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-06-cm-anmeldung-design.md`, Abschnitte *Teil 2* mit
*Präzisierungen vor dem Bau*, *Teil 1* Ziel 5 und 6, *Regeln, die sich ändern oder neu sind*,
*Datenschutz*, *Oberfläche › Teil 2*. Issue #58.

## Global Constraints

- Keine neuen Dependencies.
- Unter `src/routes` keine Server-Dateien ausser `+server.ts`; keine Form Actions, keine Remote Functions.
- Vor Svelte-Code die Doku über den Svelte-MCP-Server holen; jede `.svelte`-Datei durch `svelte-autofixer`.
- Oberfläche nur aus Bausteinen von `docs/ui-leitbild.md` / `src/lib/design/basis.css`; keine festen Farben/px. Kein Design-Artifact (Entscheid PL); fehlt ein Baustein, zuerst ins Leitbild.
- Texte: Du-Form, Schweizer Schreibweise (ss), Tasten sagen, was passiert, nie «OK»; höchstens eine `taste-haupt` pro Bildschirm.
- Testdaten erfunden (`@example.org`, erfundene Namen). Nie echte Mitgliederdaten.
- Jeder Test nennt im Namen die ID, die er belegt (`FR-06: …`, `A-ANMELDUNG-05: …`); `make check` grün vor dem Merge.
- Dateien einzeln stagen, Commit-Präfixe `feat:`/`fix:`/`docs:`/`test:`/`refactor:`, Issue `(#58)` im Titel.
- Migration `0011` nur einmal erzeugen; Änderungen danach als neue Migration.
- Alle Worktrees teilen die lokale DB `mytco`. Die Migration fügt nur hinzu (keine Werte verboten), parallele Branches bleiben lauffähig.
- Kein `EnterWorktree` in Agenten; absolute Pfade auf den Worktree `/Users/KN/CAS/projekte/tco-app/.claude/worktrees/issue-058`.

## Entscheide dieses Plans (vom Bauenden nicht zu ändern)

- **Klassierung am Mitglied:** Spalte `mitglied.klassierung text` (null = nicht angegeben), Werte `N1…N4, R1…R9, keine` (`keine` = *keine Lizenz*, schwächste Stufe). Sie gehört **nicht** zu `Angaben`/`FELDER` der Verwaltung (Mitglieder-Admin ändert sie nicht, RR-Matrix) und nicht zu `FAIRGATE_FELDER`.
- **Passung Einzel (FR-07):** Kategorie `art = 'einzel'`, `status = 'aktiv'`; Geschlecht `herren` ↔ `m`, `damen` ↔ `w`, `offen` ↔ beide; Jahrgang `jahrgangVon ≤ jahrgang ≤ jahrgangBis` (fehlende Grenze = offen); Klassierung nicht stärker als `klassierungVon` und nicht schwächer als `klassierungBis`; `keine` passt nur, wenn `klassierungBis = 'R9'`. Fehlt eine Angabe des Spielers → passt nicht.
- **Pflichtangaben:** Fehlt Klassierung, Geschlecht oder Jahrgang, zeigt die CM-Seite keine Kategorien, nur die Abfrage. Geschlecht und Jahrgang nimmt der Server nur an, solange sie leer sind (danach still ignoriert); die Klassierung jederzeit.
- **Aktive Anmeldung** = Status `bestaetigt` oder `beantragt`. Grenze 3 je Turnier (FR-06). Jedes Mitglied höchstens eine aktive Anmeldung je Kategorie (FR-09). Neu anmelden nach Abmeldung = neue Zeile; die alte bleibt `zurueckgezogen`.
- **Nebenläufigkeit:** `meldeAn` sperrt die Zeile des Mitglieds (`for update`) und die Kategorie (`for share`); `sageKategorieAb` und `aendereKategorie` sperren die Kategorie `for update`. So zählen Grenze, Doppelanmeldung und Absage-Sperre auch bei parallelen Anfragen.
- **Status:** Anmelden und Abmelden nur bei wirksamem Status `offen` (`wirksamerStatus` aus Teil 1). Früher geschlossen sperrt beides.
- **Laufende Turniere für Mitglieder:** gespeicherter Status ≠ `vorbereitung` und `jahr ≥` aktuelles Jahr (Zürich). Normalerweise genau eines; die Startseite zeigt je laufendes Turnier eine Kachel. Die CM-Seite ist `/clubmeisterschaft/[id]`; ein Turnier in Vorbereitung ergibt 404.
- **Doppel ausgeblendet:** Die Mitgliederseite zeigt nur Einzel-Kategorien (Entscheid PL bis Teil 3).
- **Löschfrist:** Anmeldungen bleiben beim Turnier. `anmeldung_spieler.mitglied_id` ohne Cascade (das Mitglied bleibt bei *gelöscht* mit Namen, FR-04); `anmeldung.kategorie_id` mit Cascade (Turnier löschen in E2E räumt mit).
- **Bestätigungsmail** zählt **nicht** gegen die Code-Grenzen von SI-04 (sonst sperrten drei Anmeldungen den Login-Code einer Stunde). Sie wirft nie; Fehler nur als feste Zeile `Bestätigungs-Mail nicht versandt` (SI-05). Die Anmeldung gilt auch ohne Mail.
- **Kontaktdaten-Hinweis:** als Rückfrage `<dialog class="karte">` beim Tippen auf *Anmelden*, solange das Mitglied in diesem Turnier keine aktive Anmeldung hat. Nichts wird gespeichert.
- **Warnung Kategorie ändern:** Der Server zählt aktive Anmeldungen, deren Spieler nach den neuen Werten nicht mehr passen (mit den heutigen Angaben der Spieler). Ist die Zahl > 0 und fehlt `trotzdem: true` im Körper → 409 `{ fehler: 'unpassend', anzahl }`, nichts gespeichert.
- **Absagen:** mit aktiven Anmeldungen → 409 `{ fehler: 'hat-anmeldungen', anzahl }`.
- **Neue Regel-IDs:** FR-36 (Warnung beim Ändern einer Kategorie mit unpassenden Anmeldungen), FR-37 (Klassierung, Geschlecht, Jahrgang vor der ersten CM-Anmeldung; Geschlecht und Jahrgang einmal selbst). FR-35 bekommt den Satz «nur ohne aktive Anmeldungen».
- **Fehlercodes Mitglieder-Endpunkte:** 401 `abgemeldet`; 404 `nicht-gefunden`; 400 `{fehler:'eingabe', felder}`; 409 `geschlossen`, `voll`, `passt-nicht`, `schon-angemeldet`, `angaben-fehlen`; 415 ohne JSON.

### Bestätigungsmail (Entwurf, vom Projektleiter vor Task 5 gegenzulesen)

```
Betreff: Clubmeisterschaft 2027: deine Anmeldungen

Du hast dich für «Herren R1–R6» angemeldet.          | Du hast dich von «Herren R1–R6» abgemeldet.

Deine Anmeldungen für die Clubmeisterschaft 2027:
- Herren R1–R6
- Senioren 45+
                                                      | (statt der Liste:) Du bist zurzeit für keine Kategorie angemeldet.
Bis zum Anmeldeschluss am Montag, 31. Mai 2027 kannst du dich in MyTCO unter «Clubmeisterschaft 2027» an- und abmelden.

Fragen? Schreib an <kontakt>.
```

## Review Focus

- **Anmeldeschluss-Minute / früher geschlossen:** Anmelden um 23:59 am Schlusstag geht, um 00:00 nicht; nach *jetzt schliessen* durch den CM-Admin geht weder An- noch Abmelden — Tests in Task 4.
- **Vierte Anmeldung parallel:** zwei gleichzeitige Anmeldungen bei 2 bestehenden ergeben genau eine dritte, nie vier — Test in Task 4.
- **Mitglied passt nach Profiländerung nicht mehr:** Eine bestehende Anmeldung bleibt sichtbar und abmeldbar, auch wenn die Kategorie nicht mehr passt; neue Anmeldung dort geht nicht — Tests in Task 4 und 8.
- **Ansicht als …:** Der MyTCO-Admin in der Ansicht sieht die CM-Seite ohne *Anmelden*/*Abmelden*/*Weiter*, und der Server verweigert das Schreiben — Test in Task 6.
- **Mailversand gestört:** SMTP wirft → Anmeldung gilt, Antwort 200, Log nur die feste Zeile — Test in Task 6.

---

### Task 1: Doku vorab

**Files:**
- Modify: `docs/fachmodell.md` (Mitglied: Klassierung mit Werten; Anmeldung: Status *bestätigt / beantragt / abgelehnt / zurückgezogen*, Spieler 1–2; FR-02 ohne Klassierung beim ersten Login; FR-35 Satz «nur ohne aktive Anmeldungen»; neu FR-36, FR-37 mit Status `geplant`)
- Modify: `docs/rollen-und-rechte.md` (Zeile «Eigener Name, Geschlecht, Jahrgang …»: Ausnahme «Geschlecht und Jahrgang einmal selbst, wenn leer (FR-37)»)
- Modify: `docs/anforderungen/anforderungen.md` (Änderungsprotokoll: Klassierung auf der CM-Seite statt beim ersten Login; Doppel bis Teil 3 ausgeblendet)
- Modify: `docs/datenschutz.md` (*Löschen*: CM-Anmeldungen bleiben beim Turnier, beim gelöschten Mitglied nur der Name, Grund Swiss Tennis; *Welche Daten*: Klassierung, Anmeldungen; Namen der bestätigten Anmeldungen für Mitglieder sichtbar)
- Modify: `src/lib/datenschutz/erklaerung.ts` + `erklaerung.test.ts` (Datenschutzerklärung: CM-Anmeldung, Sichtbarkeit der Namen, Aufbewahrung)
- Modify: `docs/sicherheitskonzept.md` (SI-04: Bestätigungsmails der CM zählen nicht gegen die Code-Grenzen)
- Modify: `docs/versionen.md` (unter «Unveröffentlicht»: *Clubmeisterschaft: Mitglieder melden sich selbst an (#58)*)

**Interfaces:** Produces: FR-36, FR-37, die folgende Tests im Namen tragen.

- [ ] **Step 1:** Doku nachführen wie oben; Wortlaut der Regeln aus «Entscheide dieses Plans».
- [ ] **Step 2:** Datenschutzerklärung-Test zuerst um die neuen Sätze erweitern (`'DS-…: Erklärung nennt CM-Anmeldungen und ihre Aufbewahrung'`), rot sehen, dann `erklaerung.ts` ergänzen.
- [ ] **Step 3:** `make check-schnell` → `Doku-Check ok`, `annahmen: ok`, `test-ids: ok`, Einheitstests grün.
- [ ] **Step 4:** Commit `docs: Fachmodell, Rechte und Datenschutz für CM Teil 2 (#58)`.

### Task 2: Schema und Migration

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Create: `drizzle/0011_cm_anmeldung.sql` (+ `drizzle/meta/*` über `npm run db:generate`)
- Test: `src/lib/server/db/schema.db.test.ts`

**Interfaces:**
- Produces:
  - `mitglied.klassierung: text('klassierung')`, Check `mitglied_klassierung_check`: null oder in (`N1`…`N4`, `R1`…`R9`, `keine`).
  - `export type AnmeldungStatus = 'bestaetigt' | 'beantragt' | 'abgelehnt' | 'zurueckgezogen'`.
  - `anmeldung`: `id serial pk`, `kategorieId → kategorie.id on delete cascade not null`, `status text not null default 'bestaetigt'` Check `anmeldung_status_check`, `kommentar text` (Wildcard, Teil 4), `angemeldetAm timestamptz not null`, `geaendertAm timestamptz not null`; Index auf `kategorieId`.
  - `anmeldungSpieler` (`anmeldung_spieler`): `anmeldungId → anmeldung.id cascade`, `mitgliedId → mitglied.id` (ohne Cascade), PK `(anmeldungId, mitgliedId)`; Index auf `mitgliedId`.

- [ ] **Step 1: failing tests:** `'FR-37: Klassierung nur aus der Skala'` (Update `klassierung: 'R10'` wirft `/mitglied_klassierung_check/`, `'keine'` geht); `'FR-06: Anmeldestatus nur aus der Liste'` (`status: 'offen'` wirft `/anmeldung_status_check/`); `'FR-04: Turnier löschen räumt Anmeldungen mit, Mitglied bleibt'`.
- [ ] **Step 2:** `npm run test:db -- schema` → FAIL.
- [ ] **Step 3:** Schema ergänzen, `npm run db:generate`, Datei in `0011_cm_anmeldung.sql` umbenennen (Journal-Tag mitziehen).
- [ ] **Step 4:** `npm run test:db -- schema` → PASS.
- [ ] **Step 5:** Commit `feat: Klassierung am Mitglied und Tabellen für CM-Anmeldungen (#58)`.

### Task 3: Reine Fachlogik Klassierung und Passung

**Files:**
- Modify: `src/lib/turnier/klassierung.ts`, `src/lib/turnier/klassierung.test.ts`
- Create: `src/lib/turnier/passung.ts`, `src/lib/turnier/passung.test.ts`

**Interfaces:**
- Produces:
  - `klassierung.ts`: `export const KLASSIERUNGEN = [...BEREICH, 'keine'] as const; export type Klassierung = (typeof KLASSIERUNGEN)[number]; export const istKlassierung(v: unknown): v is Klassierung; export function klassierungName(k: Klassierung): string` (`'keine'` → `'keine Lizenz'`, sonst der Wert).
  - `passung.ts`: `export type Spieler = { geschlecht: 'w' | 'm' | null; jahrgang: number | null; klassierung: Klassierung | null }`; `export type KategorieRegel = { art: Art; geschlecht: Geschlecht; jahrgangVon: number | null; jahrgangBis: number | null; klassierungVon: string | null; klassierungBis: string | null }`; `export type CmAngabe = 'klassierung' | 'geschlecht' | 'jahrgang'`; `export function fehlendeAngaben(s: Spieler): CmAngabe[]` (Reihenfolge wie im Typ); `export function passtEinzel(k: KategorieRegel, s: Spieler): boolean` (Regeln aus «Entscheide»).

- [ ] **Step 1: failing tests** in `passung.test.ts`:
  `'FR-07: R4-Mann passt in Herren R1–R6, nicht in Damen R4–R9 und nicht in Herren R7–R9'`;
  `'FR-07: keine Lizenz passt nur, wenn der Bereich bis R9 reicht'` (`R1–R9` ja, `R4–R8` nein);
  `'FR-07: Jahrgang 2009 passt in «ab 2009», 2008 nicht; 1982 passt in «bis 1982»'`;
  `'FR-07: offen passt für Frau und Mann, Doppel und Mixed passen nie im Einzel'`;
  `'FR-37: fehlende Angaben machen jede Kategorie unpassend und werden aufgezählt'` (`{geschlecht:null, jahrgang:1990, klassierung:null}` → `['klassierung','geschlecht']`).
  In `klassierung.test.ts`: `'FR-37: keine Lizenz ist eine Klassierung, R10 nicht'`.
- [ ] **Step 2:** `npm run test:einheit -- turnier` → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** `npm run test:einheit -- turnier` → PASS.
- [ ] **Step 5:** Commit `feat: Passung von Spieler und Einzel-Kategorie (#58)`.

### Task 4: DB-Funktionen der Mitgliederseite

**Files:**
- Create: `src/lib/server/cm/angaben.ts`, `src/lib/server/cm/anmeldungen.ts`
- Test: `src/lib/server/cm/angaben.db.test.ts`, `src/lib/server/cm/anmeldungen.db.test.ts`

**Interfaces:**
- Consumes: Tabellen (Task 2), `passtEinzel`, `fehlendeAngaben`, `istKlassierung` (Task 3), `wirksamerStatus` (Teil 1), `schreibeVerlauf` (`src/lib/server/admin/verlauf.ts`), Jahrgangsregel 1900 … aktuelles Jahr wie `pruefeAngaben`.
- Produces:
  - `angaben.ts`: `export type CmFeld = CmAngabe`; `export async function trageCmAngabenNach(db: Db, mitgliedId: number, roh: Record<string, unknown>, jetzt: Date): Promise<{ ergebnis: 'ok' } | { ergebnis: 'eingabe'; felder: Partial<Record<CmFeld, string>> } | { ergebnis: 'nicht-gefunden' }>` — Pflicht sind genau die Felder, die heute fehlen; Klassierung darf zusätzlich kommen; schon gesetzte Geschlecht/Jahrgang werden ignoriert; Verlauf `feld-geaendert` je geändertem Feld, Urheber `mitglied`; `fairgateOffenSeit` bleibt. Meldungen: `klassierung` → `'Bitte deine Klassierung wählen.'`, `geschlecht` → `'Bitte wählen.'`, `jahrgang` → `'Bitte ein Jahr zwischen 1900 und <Jahr> angeben.'`.
    `export async function setzeKlassierung(db: Db, mitgliedId: number, wert: unknown, jetzt: Date): Promise<'ok' | 'eingabe' | 'nicht-gefunden'>` (fürs Profil; gleicher Wert = `ok` ohne Verlauf).
  - `anmeldungen.ts`:
    - `export type CmStand = { id: number; name: string; anmeldeschluss: string; status: TurnierStatus; anzahl: number }`
    - `export async function laufendeTurniere(db: Db, mitgliedId: number, jetzt: Date): Promise<CmStand[]>` (Jahr aufsteigend; `anzahl` = eigene aktive)
    - `export type CmKategorie = KategorieRegel & { id: number; name: string; passt: boolean; anmeldungId: number | null; namen: string[] }` (`namen` = «Vorname Nachname» der bestätigten, nach Nachname, Vorname)
    - `export type CmAnsicht = { turnier: CmStand & { jahr: number }; fehlt: CmAngabe[]; spieler: Spieler; kategorien: CmKategorie[]; eigene: { anmeldungId: number; kategorie: string }[]; grenze: 3 }` — `kategorien` leer, solange `fehlt` nicht leer; sonst aktive Einzel-Kategorien, die passen **oder** in denen das Mitglied aktiv angemeldet ist (dann `passt: false` möglich).
    - `export async function ladeCmAnsicht(db: Db, turnierId: number, mitgliedId: number, jetzt: Date): Promise<CmAnsicht | null>` (`null` bei Vorbereitung oder unbekannt)
    - `export async function meldeAn(db: Db, kategorieId: number, mitgliedId: number, jetzt: Date): Promise<'ok' | 'geschlossen' | 'voll' | 'passt-nicht' | 'schon-angemeldet' | 'angaben-fehlen' | 'nicht-gefunden'>` (Prüfreihenfolge: nicht-gefunden → geschlossen → angaben-fehlen → passt-nicht → schon-angemeldet → voll)
    - `export async function meldeAb(db: Db, anmeldungId: number, mitgliedId: number, jetzt: Date): Promise<'ok' | 'geschlossen' | 'nicht-gefunden'>` (nur eigene aktive)
    - `export async function eigeneKategorien(db: DbOderTx, turnierId: number, mitgliedId: number): Promise<string[]>` (für die Mail, nach Name)
    - Verwaltung: `export async function zaehleAktive(db: DbOderTx, kategorieId: number): Promise<number>`; `export async function zaehleUnpassende(db: DbOderTx, kategorieId: number, neu: KategorieRegel): Promise<number>`

- [ ] **Step 1: failing tests** (jedes Turnier mit eigenem zufälligem Jahr ≥ 3000; Mitglieder mit `@example.org`; `jetzt` fest):
  `angaben.db.test.ts`: `'FR-37: fehlende Angaben nachtragen, gesetztes Geschlecht bleibt, Verlauf ohne Werte'`; `'FR-37: ohne Klassierung ergibt Feldfehler'`; `'FR-37: Klassierung im Profil ändern schreibt den Verlauf'`.
  `anmeldungen.db.test.ts`:
  `'A-ANMELDUNG-03, FR-07: Ansicht zeigt nur passende Einzel-Kategorien mit Namen der bestätigten, Doppel nie'`;
  `'FR-37: fehlt eine Angabe, sind die Kategorien leer und fehlt nennt sie'`;
  `'A-ANMELDUNG-01: anmelden gilt sofort als bestätigt und zählt'`;
  `'FR-06: die vierte Anmeldung ergibt voll, eine zurückgezogene zählt nicht'`;
  `'FR-06: zwei gleichzeitige Anmeldungen bei zwei bestehenden ergeben genau eine dritte'` (`Promise.all` über zwei Kategorien);
  `'FR-09: zweimal dieselbe Kategorie ergibt schon-angemeldet, nach Abmeldung wieder möglich'`;
  `'FR-07: unpassende Kategorie ergibt passt-nicht, bestehende bleibt nach Profiländerung abmeldbar'`;
  `'FR-05, FR-10: am Schlusstag 23:59 an- und abmelden geht, 00:00 nicht; früh geschlossen sperrt beides'`;
  `'FR-10: fremde Anmeldung abmelden ergibt nicht-gefunden'`;
  `'FR-33: Turnier in Vorbereitung ist für Mitglieder nicht sichtbar, laufende Turniere ab diesem Jahr'`;
  `'FR-36: zaehleUnpassende zählt nur aktive, die nach den neuen Werten nicht passen'`.
- [ ] **Step 2:** `npm run test:db -- cm` → FAIL.
- [ ] **Step 3:** Implementieren (Sperren wie in «Entscheide»).
- [ ] **Step 4:** `npm run test:db -- cm` → PASS.
- [ ] **Step 5:** Commit `feat: Mitglieder melden sich zu Einzel-Kategorien an und ab (#58)`.

### Task 5: Bestätigungsmail

**Vorher:** Mailtext aus «Entscheide» vom Projektleiter gegenlesen lassen; Änderungen hier eintragen.

**Files:**
- Create: `src/lib/server/cm/mail.ts`, `src/lib/server/cm/mail.test.ts`

**Interfaces:**
- Consumes: `Mailer` (`src/lib/server/login/dienst.ts`), `datumLang` (`src/lib/verwaltung/turnier-anzeige.ts`).
- Produces:
  - `export type BestaetigungInhalt = { turniername: string; aktion: 'an' | 'ab'; kategorie: string; eigene: string[]; anmeldeschluss: string }`
  - `export function baueBestaetigungsMail(i: BestaetigungInhalt, kontakt: string): { betreff: string; text: string }` (Text wie im Entwurf)
  - `export function erstelleBestaetigung(abh: { mailer: Mailer; kontakt: string }): (an: string, i: BestaetigungInhalt) => Promise<void>` (wirft nie; zählt nicht gegen Bremsen)

- [ ] **Step 1: failing tests:** `'A-ANMELDUNG-05: Mail nach Anmeldung nennt die Kategorie und alle aktuellen Anmeldungen'`; `'A-ANMELDUNG-05: Mail nach letzter Abmeldung sagt, dass keine bleibt'`; `'SI-05: gestörter Versand wirft nicht und loggt nur die feste Zeile'`.
- [ ] **Step 2:** `npm run test:einheit -- cm/mail` → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: Bestätigungsmail nach An- und Abmeldung zur CM (#58)`.

### Task 6: Schnittstellen und Endpunkte der Mitglieder

**Files:**
- Create: `src/lib/server/cm/schnittstellen.ts`, `src/lib/server/cm/index.ts`
- Create: `src/routes/api/cm/+server.ts` (GET laufende Turniere), `src/routes/api/cm/[id]/+server.ts` (GET Ansicht), `src/routes/api/cm/angaben/+server.ts` (POST), `src/routes/api/cm/kategorien/[id]/anmeldung/+server.ts` (POST), `src/routes/api/cm/anmeldungen/[id]/abmelden/+server.ts` (POST)
- Modify: `src/lib/server/profil/schnittstellen.ts` (`getProfil` liefert zusätzlich `klassierung`; neu `postKlassierung`), Create `src/routes/api/profil/klassierung/+server.ts`
- Test: `src/lib/server/cm/schnittstellen.db.test.ts`, `src/lib/server/profil/schnittstellen.db.test.ts`

**Interfaces:**
- Consumes: Task 4 und 5; `antwort`, `istJson`, `leseKoerper`, `formatFehler`, `Ereignis` aus `src/lib/server/login/schnittstellen.ts`; `parseId`.
- Produces: `export type CmDienste = { db: Db; bestaetigung: (an: string, i: BestaetigungInhalt) => Promise<void>; jetzt?: () => Date }`; `getCmTurniere, getCmAnsicht, postCmAngaben, postCmAnmeldung, postCmAbmeldung` (je `(d: CmDienste, e: CmEreignis) => Promise<Response>`), `CmEreignis = Ereignis & Pick<RequestEvent, 'params'>`; `holeCmDienste()` in `index.ts` wie `holeAdminDienste` (Mailer mit `leiteUm`, ohne Bremsen). Anmelden/Abmelden antworten 200 mit der neuen `CmAnsicht`; danach Mail an die Adresse des Mitglieds mit `eigeneKategorien`. `postKlassierung`: Körper `{ klassierung }`, 200 `{}`, 400 `{fehler:'eingabe', felder:{klassierung}}`.

- [ ] **Step 1: failing tests** (Muster und Log-Wächter wie `src/lib/server/anlass/schnittstellen.db.test.ts`, Fake-Mailer sammelt Mails):
  `'A-ANMELDUNG-01, A-ANMELDUNG-05: anmelden antwortet mit neuer Ansicht und schickt eine Bestätigung'`;
  `'FR-06: vierte Anmeldung 409 voll, keine Mail'`;
  `'FR-37: Angaben nachtragen, danach erscheinen die Kategorien'`;
  `'FR-05: nach Anmeldeschluss 409 geschlossen'`;
  `'A-ANMELDUNG-05: Mailversand gestört, Anmeldung gilt trotzdem (200)'`;
  `'A-ROLLE-09: in der Ansicht als … ist Anmelden gesperrt'` (über den Riegel im Hook, wie `ansicht-riegel.test.ts`);
  `'SI-05: ohne Sitzung 401, ohne JSON 415, keine Schnittstelle loggt'`;
  im Profil-Test `'FR-37: Klassierung im Profil speichern, ungültiger Wert ergibt Feldfehler'`.
- [ ] **Step 2:** `npm run test:db -- cm profil` → FAIL.
- [ ] **Step 3:** Implementieren; `+server.ts` je zwei Zeilen wie `src/routes/api/anlaesse/+server.ts`.
- [ ] **Step 4:** `npm run test:db -- cm profil` und `node scripts/pruefungen/bauregel.ts` → PASS.
- [ ] **Step 5:** Commit `feat: Endpunkte für die CM-Anmeldung der Mitglieder (#58)`.

### Task 7: Verwaltung — Zählung, Warnung, Sperre

**Files:**
- Modify: `src/lib/server/turnier/turniere.ts` (`KategorieZeile` + `anmeldungen: number`; `aendereKategorie`, `sageKategorieAb`), `src/lib/server/turnier/schnittstellen.ts`
- Modify: `src/lib/verwaltung/api.ts`, `src/routes/verwaltung/turniere/[id]/+page.svelte` (Spalte *Anmeldungen*), `src/routes/verwaltung/turniere/[id]/kategorien/[kid]/+page.svelte`
- Test: `src/lib/server/turnier/turniere.db.test.ts`, `src/lib/server/turnier/schnittstellen.db.test.ts`, `src/lib/verwaltung/api.test.ts`

**Interfaces:**
- Consumes: `zaehleAktive`, `zaehleUnpassende` (Task 4).
- Produces:
  - `aendereKategorie(db, id, w, trotzdem: boolean): Promise<'ok' | 'vergeben' | 'abgesagt' | 'nicht-gefunden' | { unpassend: number }>`
  - `sageKategorieAb(db, id): Promise<'ok' | 'nicht-gefunden' | { aktiv: number }>`
  - HTTP: `postKategorie` liest `trotzdem === true`; 409 `{fehler:'unpassend', anzahl}`; `postKategorieAbsagen` 409 `{fehler:'hat-anmeldungen', anzahl}`.
  - Client `Antwort` um `{ art: 'unpassend'; anzahl: number }` und `{ art: 'hat-anmeldungen'; anzahl: number }`; `aendereKategorie(id, angaben, trotzdem = false, holen)`.
  - UI: Kategorie-Seite zeigt bei `unpassend` die Rückfrage `<dialog class="karte">` *Anmeldungen passen nicht mehr* / «<n> Anmeldung(en) passen nach der Änderung nicht mehr zu dieser Kategorie. Sie bleiben trotzdem stehen.» / *Abbrechen* · `taste-haupt` *Trotzdem speichern*. Karte *Kategorie absagen*: bei `anmeldungen > 0` statt der Taste «Diese Kategorie hat <n> aktive Anmeldung(en). Absagen geht erst, wenn keine mehr da sind.»; die 409 zeigt denselben Satz als `.fehler`.

- [ ] **Step 1: failing tests:** `'FR-36: Ändern mit unpassenden Anmeldungen ergibt unpassend mit Anzahl, mit trotzdem gespeichert, Anmeldungen bleiben'`; `'FR-35: Absagen mit aktiver Anmeldung ergibt hat-anmeldungen, nach Abmeldung geht es'`; `'FR-36: Turnierseite zählt aktive Anmeldungen je Kategorie'`; HTTP `'FR-36, FR-35: 409 unpassend und hat-anmeldungen mit anzahl'`; Client `'FR-36: 409 unpassend wird eigenes Ergebnis mit anzahl'`.
- [ ] **Step 2:** `npm run test:db -- turnier` und `npm run test:einheit -- verwaltung` → FAIL.
- [ ] **Step 3:** Implementieren; Svelte-Doku über MCP, `svelte-autofixer` bis keine Befunde.
- [ ] **Step 4:** Tests → PASS; `npm run check:svelte && npm run lint`.
- [ ] **Step 5:** Commit `feat: Warnung und Absage-Sperre bei Kategorien mit Anmeldungen (#58)`.

### Task 8: Oberfläche der Mitglieder

**Files:**
- Create: `src/lib/cm/api.ts`, `src/lib/cm/api.test.ts`, `src/lib/cm/anzeige.ts`, `src/lib/cm/anzeige.test.ts`
- Create: `src/routes/clubmeisterschaft/[id]/+page.ts`, `src/routes/clubmeisterschaft/[id]/+page.svelte`
- Modify: `src/routes/+page.ts`, `src/routes/+page.svelte` (Kachel), `src/routes/profil/+page.svelte` (+ `+page.ts`) (Klassierung), `src/lib/ui/navigation.ts` (+ Test: `'/clubmeisterschaft/[id]'` Ebene 1)

**Interfaces:**
- Consumes: Typen aus Task 4/6 über `Json<…>`; `datumLang`, `geschlechtText`, `jahrgangText` aus `src/lib/verwaltung/turnier-anzeige.ts`; `klassierungName`, `KLASSIERUNGEN`.
- Produces:
  - `api.ts`: `Ergebnis<T>` wie `src/lib/anlass/api.ts` mit `geschlossen | voll | passt-nicht | schon-angemeldet | angaben-fehlen | eingabe(felder)`; `holeCmTurniere(holen)`, `holeCmAnsicht(id, holen)`, `sendeCmAngaben(angaben, holen)`, `meldeAn(kategorieId, holen)`, `meldeAb(anmeldungId, holen)`, `speichereKlassierung(k, holen)`.
  - `anzeige.ts`: `standText(anzahl: number): string` (`'Noch keine Anmeldung'`, `'1 Anmeldung'`, `'2 Anmeldungen'`); `kategorieText(k: KategorieRegel): string` (z. B. `'Herren · R1–R6 · ab Jahrgang 2009'`, ohne leere Teile); `namenText(namen: string[]): string` (`'Noch niemand angemeldet.'` bzw. `'Angemeldet (2): Anna Beispiel, Bea Muster'`).

Aufbau:
- **Startseite:** unter *Jetzt aktuell* zuerst je laufendes Turnier eine `a.karte.kachel.hervor` → `/clubmeisterschaft/[id]`: **Name**, leise «Anmeldung bis <datumLang>» bzw. «Anmeldung geschlossen», darunter `standText`. Die Überschrift erscheint, wenn es Turniere oder Anlässe gibt. Lädt das Turnier nicht, bleibt die Startseite nutzbar.
- **`/clubmeisterschaft/[id]`:** `.zurueck`; h1 Name; Plakette `plakette-ok` *Anmeldung offen* bzw. `plakette-gesperrt` *Anmeldung geschlossen* + leise «Anmeldeschluss <datumLang>».
  - `fehlt` nicht leer und offen → `karte` *Deine Angaben für die Clubmeisterschaft*: «Damit MyTCO dir die passenden Kategorien zeigt, braucht es noch:»; `select` *Klassierung* (Werte `KLASSIERUNGEN`, Text `klassierungName`, Hilfe «Steht auf deiner Lizenz bei Swiss Tennis. Ohne Lizenz: keine Lizenz.»); nur wenn fehlend `fieldset.auswahl-gruppe` *Geschlecht* (Frau/Mann) und `.feld` *Jahrgang* (`inputmode="numeric"`); leise «Geschlecht und Jahrgang ändert danach nur die Mitgliederverwaltung.»; `taste-haupt taste-breit` *Weiter zu den Kategorien*. Fehler beim Feld, Fokus aufs erste Fehlerfeld.
  - sonst: `.zaehler` «<n> von 3 Anmeldungen»; bei 3 leise «Mehr als 3 Anmeldungen gehen nicht. Melde dich zuerst irgendwo ab.»; je Kategorie eine `div.karte.kachel`: links **Name**, leise `kategorieText`, leise `namenText`; rechts genau eine Aktion: nicht angemeldet → `taste-neben` *Anmelden* (`disabled` bei 3), angemeldet → `taste-neben` *Abmelden* und links leise «Du bist angemeldet.». Keine passende Kategorie → Satz «Für deine Angaben gibt es keine passende Kategorie.».
  - Geschlossen: keine Tasten, Satz «Die Anmeldung ist geschlossen. Änderungen macht jetzt die Turnierleitung.».
  - Erste Anmeldung im Turnier (`eigene` leer) → `<dialog class="karte">` *Bevor du dich anmeldest* / «Deine Gegner sehen während der Clubmeisterschaft deine E-Mail-Adresse und Telefonnummer, damit ihr die Spiele selbst abmachen könnt. Verbergen geht nicht.» / *Abbrechen* · `taste-haupt` *Anmelden*.
  - Nach An-/Abmelden `role="status"`: «Angemeldet für <Kategorie>. Die Bestätigung kommt per Mail.» bzw. «Abgemeldet von <Kategorie>.»; 409-Meldungen als `.fehler` mit `role="alert"`: `voll` «Du hast schon 3 Anmeldungen.», `geschlossen` «Die Anmeldung ist inzwischen geschlossen.», `passt-nicht` «Diese Kategorie passt nicht zu deinen Angaben.», `schon-angemeldet` → Ansicht neu laden.
  - *Ansicht als …* (`data.ansicht` wie im Profil): keine Tasten, die speichern.
- **Profil, *Meine Angaben*:** Angabe *Klassierung* nach *Lizenznummer* mit «nicht angegeben» bzw. `klassierungName`, *Ändern* öffnet `select` + `taste-neben` *Klassierung speichern* (gleiches Muster wie die anderen Angaben); leise unter dem Feld «Gilt für neue Anmeldungen zur Clubmeisterschaft.».

- [ ] **Step 1: failing tests** (Einheit): `anzeige.test.ts` `'A-ANMELDUNG-02: Stand als Text'`, `'FR-07: Kategorie als Kurztext ohne leere Teile'`, `'A-ANMELDUNG-01: Namen der Angemeldeten'`; `api.test.ts` `'FR-06: 409 voll wird eigenes Ergebnis'`; navigation-Test.
- [ ] **Step 2:** `npm run test:einheit -- cm ui` → FAIL.
- [ ] **Step 3:** Svelte-Doku über MCP holen; Seiten bauen; jede Datei durch `svelte-autofixer`.
- [ ] **Step 4:** Tests → PASS; `npm run check:svelte && npm run lint && npm run pruefungen`.
- [ ] **Step 5:** Commit `feat: CM-Seite, Startseiten-Kachel und Klassierung im Profil (#58)`.

### Task 9: Seed

**Files:**
- Modify: `scripts/beispiel-turnier.ts`, `scripts/erfundene-mitglieder.ts` (falls dort die Angaben stehen), `scripts/seed-lokal.ts`
- Test: `tests/scripts/beispiel-turnier.db.test.ts`

**Interfaces:**
- Consumes: `meldeAn` (Task 4).
- Produces: `legeBeispielTurnierAn(db, jetzt)` legt zusätzlich idempotent erfundene Einzel-Anmeldungen an: mindestens 4 erfundene Mitglieder mit Klassierung, Geschlecht und Jahrgang, je 1–2 Anmeldungen in *Herren R1–R6*, *Herren R7–R9*, *Damen R4–R9*. Die Persona *Mitglied* aus `make seed` bleibt ohne Klassierung (zeigt die Abfrage).
- [ ] **Step 1: failing test** `'A-ANMELDUNG-01: Beispielturnier hat erfundene Anmeldungen, zweiter Lauf legt nichts doppelt an'`.
- [ ] **Step 2:** → FAIL. **Step 3:** implementieren. **Step 4:** → PASS; `make seed` läuft.
- [ ] **Step 5:** Commit `feat: erfundene CM-Anmeldungen über make seed (#58)`.

### Task 10: E2E, Nachweis, Doku-Abschluss

**Files:**
- Create: `tests/e2e/cm-anmeldung.test.ts`
- Modify: `tests/e2e/hilfen/login.ts` (neu `legeOffenesTurnierAn(jahr: number, kategorien: KategorieWerte[]): Promise<{ turnierId: number; kategorieIds: number[] }>` auf Basis von `legeTurnierAn`, Status `offen`)
- Modify: `docs/fachmodell.md` (FR-05, -06, -07, -09 (Einzel), -10, -35, -36, -37 → `umgesetzt`, wo vollständig), `docs/anforderungen/anforderungen.md` (A-ANMELDUNG-01, -02, -03, -05 → `umgesetzt (Einzel; Doppel mit #59)`), `docs/rollen-und-rechte.md`, `docs/context-scopes.md` (Zeile *Clubmeisterschaft (Mitglieder)*), `docs/testkonzept.md` falls dort die Abdeckung je ID steht

- [ ] **Step 1: E2E-Tests** (iPhone und Android; Testjahr je Projekt: iPhone 2097, Android 2096, nicht 2098/2099 aus Teil 1; `pruefeBildschirm` = Screenshot + axe; `startetVomSymbol(page)`):
  `'A-ANMELDUNG-01, A-ANMELDUNG-02, A-ANMELDUNG-03, FR-37: Mitglied ergänzt Angaben, meldet sich an und ab'` — Mitglied ohne Klassierung und Geschlecht; Startseite zeigt Kachel *Clubmeisterschaft <Jahr>* (per Name finden, andere Turniere können da sein); CM-Seite fragt nach Klassierung und Geschlecht, Screenshot `cm-angaben`; nach *Weiter* nur passende Kategorien (Damen-Kategorie fehlt für einen Mann, Doppel fehlt); *Anmelden* → Rückfrage Kontaktdaten → *Anmelden* → `role=status`, Zähler «1 von 3 Anmeldungen», eigener Name in der Kategorie, Screenshot `cm-angemeldet`; zwei weitere Anmeldungen → übrige Tasten gesperrt mit Satz; *Abmelden* → Zähler 2. Keine Konsolenfehler.
  `'FR-36, FR-35: CM-Admin wird gewarnt und kann eine Kategorie mit Anmeldungen nicht absagen'` — Kategorie mit einer Anmeldung auf R7–R9 ändern → Rückfrage mit «1 Anmeldung» → *Trotzdem speichern*; Absage-Karte zeigt den Satz statt der Taste.
- [ ] **Step 2:** `make e2e` → PASS auf allen Projekten (auch die bestehenden Startseiten-Tests mit zusätzlicher Kachel).
- [ ] **Step 3:** Screenshots `cm-angaben` und `cm-angemeldet` ansehen (iPhone + Android) und gegen Leitbild prüfen; Skill `run` für einen Blick in die laufende App.
- [ ] **Step 4:** Doku-Status umstellen, Context-Scopes nachführen; `make check` → grün.
- [ ] **Step 5:** Commits `test: E2E CM-Anmeldung der Mitglieder (#58)` und `docs: CM Teil 2 umgesetzt (#58)`.
