# Mitteilungen an Gruppen (CM und Rollen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der CM-Admin schickt auf der Turnierseite Mitteilungen an CM-Gruppen (wahlweise je Kategorie), der Mitglieder-Admin schickt Vereinsmitteilungen an die Inhaber einer Rolle.

**Architecture:** Das bestehende Mitteilungswerkzeug (`src/lib/server/mitteilung/`) bekommt einen dritten Bezug `turnier` und beim Verein Auswahlen je Rolle. Empfänger rechnet `empfaenger.ts` mit der Passungsregel der Anmeldung (`src/lib/turnier/passung.ts`); Vorschau, Weg, Versand und Verlauf bleiben. Die Oberfläche nutzt `Mitteilungsformular.svelte` und `Mitteilungsverlauf.svelte` weiter.

**Tech Stack:** SvelteKit 2 / Svelte 5 (Runes), TypeScript, Drizzle ORM + Postgres, Vitest (DB-Tests gegen echte DB), Playwright (`make e2e`).

**Spec:** `docs/superpowers/specs/2026-11-24-mitteilungen-gruppen-design.md` (lesen; Entscheide A1–A9, B10–B13, C, D).

## Global Constraints

- Arbeitsordner: Worktree `/Users/KN/CAS/projekte/tco-app/.claude/worktrees/issue-95-97`, Branch `feat/issue-95-97`. Nur schlichte `git`-Befehle, Dateien einzeln stagen (nie `git add -A`/`.`), Commit-Texte per `-F` aus Datei oder Heredoc an stdin.
- Jede Verhaltensänderung beginnt mit einem roten Test. Fachlogik gegen die echte DB; keine Attrappen ausser Mail, Push, Uhr, Abruf.
- Vor Svelte-Code die Doku über den Svelte-MCP-Server holen; nach Änderungen an `.svelte` den `svelte-autofixer` laufen lassen.
- Route `+server.ts` ruft genau eine Schnittstellen-Funktion; Rechte nur über `liest`/`schreibt` aus `src/lib/server/admin/rechte.ts`; Antworten nur über `src/lib/server/http.ts`; Fehlerwörter nur aus `src/lib/fehler.ts`.
- Zeit nur über `jetzt(d)`, nie `new Date()` im Server. Logs nur feste Texte.
- Migration nur als neue Datei über `npm run db:generate`; keine bestehende Migration anfassen.
- Stile nur unter `src/lib/design/`, kein `<style>` in Bausteinen; UI nur aus Tokens/Bausteinen von `docs/ui-leitbild.md`.
- Keine echten Mitgliederdaten in Tests; Personen sind erfunden.
- DB-Tests mit Turnieren brauchen einen eigenen Jahresbereich in `tests/hilfen/turnierjahre.ts`: `src/lib/server/mitteilung/empfaenger-turnier.db.test.ts` → `[8400, 8749]`, `src/lib/server/mitteilung/verwaltung-schnittstellen.db.test.ts` → `[8750, 9099]`.
- Gemeinsame Test-DB: Tests über «alle», «ohne Kategorie» oder Rollen prüfen nur, ob **eigene** Mitglieder drin sind oder fehlen (`toContain`/`not.toContain`), nie die Gesamtzahl.
- E2E: Nie eine Mitteilung mit E-Mail an Gruppen schicken, die Konten paralleler Tests enthalten. CM-Mitteilung nur an eine eigene Kategorie; Rollen-Mitteilung nur mit Weg «Nur Push».
- `make check` und `make e2e` nie gleichzeitig; E2E und `make check` mit `run_in_background`.
- Texte: Schweizer Schreibweise (ss statt ß), kurz.

## Review Focus

1. Kategorie eines anderen Turniers oder abgesagte Kategorie im Körper → 400 `eingabe` mit Feld `kategorie`, keine Empfänger. (Task 4)
2. *sucht Partner* mit einer Einzel-Kategorie, *alle* mit einer Kategorie → 400 Feld `kategorie`. (Task 4)
3. Turnier *in Vorbereitung*: Vorschau und Senden → 409 `vorbereitung`; Verlauf lesen geht. (Task 4)
4. Doppel-Paar zählt für beide als *angemeldet*; *zurückgezogen*/*abgelehnt* zählt nicht; wer `GRENZE` (3) aktive Anmeldungen hat, fehlt bei *berechtigt*. (Task 3)
5. Andere Kategorie wählen nach der Vorschau verwirft die Vorschau (Senden gesperrt, bis neu geholt). (Task 5)

---

### Task 1: Konzept und Datenschutz nachführen (vor dem Code)

**Files:**
- Modify: `docs/datenschutz.md` (Tabelle «Welche Daten», Zeilen Anmeldungen/Geschlecht-Jahrgang-Klassierung und Konto-Rollen; Zeile Verlauf der Mitteilungen)
- Modify: `docs/datenschutzerklaerung.md` (Abschnitt **Mitteilungen**, ~Zeile 81)
- Modify: `docs/fachmodell.md` (FR-42, FR-43)
- Modify: `docs/rollen-und-rechte.md` (Tabelle ~Zeile 128–133)

- [ ] **Step 1:** In `datenschutz.md` als Zweck ergänzen: bei CM-Anmeldungen und bei Geschlecht/Jahrgang/Klassierung «Empfänger von Mitteilungen zur CM auswählen (über die Spielberechtigung)»; bei Rollen «Empfänger von Mitteilungen an eine Rolle»; Verlauf: «Auswahl in Worten, bei der CM mit Name der Kategorie». Kein neues Datum, keine neue Frist.
- [ ] **Step 2:** In `datenschutzerklaerung.md`, Abschnitt Mitteilungen: Satz ergänzen, dass auch der CM-Admin Mitteilungen zur Clubmeisterschaft schicken kann, ausgewählt nach deiner Anmeldung und danach, ob du in einer Kategorie mitspielen darfst; und dass der Mitglieder-Admin Mitteilungen an die Inhaber einer Rolle schicken kann.
- [ ] **Step 3:** FR-42: «verschickt der Mitglieder-Admin (Anlass, Verein) oder der CM-Admin (Turnier, nicht *in Vorbereitung*)». FR-43: Auswahlen Verein (*alle*, *alle mit Rolle …*, Thema Verein gilt) und Turnier (Tabelle aus Spec A6 in einem Satz, Kategorie wahlweise, Passung wie FR-07, Höchstzahl FR-06). Status bleibt *umgesetzt* erst nach Task 5; bis dahin *geplant* markieren, wie es das Fachmodell sonst tut.
- [ ] **Step 4:** `rollen-und-rechte.md`: neue Zeile «Mitteilung zur CM senden, Verlauf (FR-42)»: CM-Admin S, MyTCO-Admin L, übrige –. Zeile «Mitteilung an den Verein» um «auch an eine Rolle» ergänzen.
- [ ] **Step 5:** `make annahmen` und `make docs` grün.
- [ ] **Step 6: Commit** `docs: Datenschutz und Fachmodell für Mitteilungen an Gruppen (#95, #97)`

### Task 2: Speicherung und Auswahlen

**Files:**
- Modify: `src/lib/server/db/schema.ts:107-109` (`Bezug`), `:345-371` (`mitteilung`)
- Create: Migration über `npm run db:generate` (neue Datei unter `drizzle/`)
- Modify: `src/lib/mitteilung/auswahl.ts`
- Modify: `src/lib/server/mitteilung/verlauf.ts`
- Test: `src/lib/server/mitteilung/schema.db.test.ts`, `src/lib/server/mitteilung/verlauf`-Fälle in `src/lib/server/mitteilung/verwaltung-schnittstellen.db.test.ts` kommen in Task 4

**Interfaces:**
- Produces:
  - `type Bezug = 'anlass' | 'verein' | 'turnier'` (schema.ts)
  - `mitteilung.turnierId: integer('turnier_id').references(() => turnier.id, { onDelete: 'cascade' })`, `mitteilung.kategorie: text('kategorie')` (Name der Kategorie zum Sendezeitpunkt, sonst `null`)
  - Checks: `mitteilung_bezug_check` mit `'turnier'`; neu `mitteilung_turnier_check`: `(bezug = 'turnier') = (turnier_id is not null)`; neu `mitteilung_kategorie_check`: `kategorie is null or bezug = 'turnier'`; Index `mitteilung_turnier_id_gesendet_am_idx` auf `(turnierId, gesendetAm)`.
  - `auswahl.ts`: `type TurnierAuswahl = 'alle' | 'angemeldet' | 'berechtigt' | 'sucht-partner'`, `TURNIER_AUSWAHLEN`; `import type { Rolle } from '../server/admin/rollen.ts'` (nur Typ); `type VereinAuswahl = 'alle' | 'rolle-mytco' | 'rolle-mitglieder' | 'rolle-cm' | 'rolle-lizenz'`, `VEREIN_AUSWAHLEN` in dieser Reihenfolge; `rolleAus(a: VereinAuswahl): Rolle | null`.
  - `verlauf.ts`: `type Bezug = … | { art: 'turnier'; turnierId: number }`; `VerlaufEintrag.kategorie: string | null`; `speichereMitteilung(db, b, e & { kategorie?: string | null }, jetzt)`; `ladeTurnierKopf(db, id): Promise<{ id: number; jahr: number; anmeldeschluss: string; status: TurnierStatus; kategorien: { id: number; name: string; art: Art }[] } | null>` — `status` gespeichert (nicht wirksam), `kategorien` nur `status = 'aktiv'`, nach `id`.

- [ ] **Step 1: Failing test** in `schema.db.test.ts`: `test('Mitteilung zum Turnier braucht turnier_id, Kategorie nur beim Turnier')` — Insert `bezug: 'turnier'` ohne `turnierId` wirft; `bezug: 'verein'` mit `kategorie: 'X'` wirft; `bezug: 'turnier'` mit gültigem Turnier und `kategorie: 'Damen R7–R9'` geht; Löschen des Turniers (direkt in der DB) löscht den Eintrag mit.
- [ ] **Step 2:** `npx vitest run src/lib/server/mitteilung/schema.db.test.ts` → FAIL.
- [ ] **Step 3:** Schema ändern, `npm run db:generate`, neue Migration prüfen (nur `ADD COLUMN`, `DROP/ADD CONSTRAINT` des Bezug-Checks, neue Checks, Index). Auswahlen und `verlauf.ts` wie oben; `nachBezug` für `turnier` nach `turnierId`.
- [ ] **Step 4:** Test → PASS; `npx svelte-check` ohne neue Fehler.
- [ ] **Step 5: Commit** `feat: Mitteilung mit Bezug Turnier speichern (#97)`

### Task 3: Empfänger nach Rolle und nach CM-Gruppe

**Files:**
- Modify: `src/lib/server/mitteilung/empfaenger.ts`
- Test: `src/lib/server/mitteilung/empfaenger.db.test.ts` (Rolle), Create: `src/lib/server/mitteilung/empfaenger-turnier.db.test.ts` (Turnier)
- Modify: `tests/hilfen/turnierjahre.ts` (Bereiche aus den Global Constraints, beide Dateien gleich mit eintragen)

**Interfaces:**
- Consumes: `TurnierAuswahl`, `VereinAuswahl`, `rolleAus` (Task 2); aus `src/lib/server/cm/anmeldungen.ts`: `GRENZE`, `istAktiv`, `regelAus`; aus `src/lib/server/cm/angaben.ts`: `spielerAus`; aus `src/lib/turnier/passung.ts`: `passtEinzel`, `passtDoppelAllein`, `fehlendeAngaben`.
- Produces:
  - `vereinEmpfaenger(db: Db, auswahl: VereinAuswahl): Promise<Empfaenger[]>` (bisher ohne Auswahl; Aufrufer in Task 4 anpassen)
  - `turnierEmpfaenger(db: Db, turnierId: number, auswahl: TurnierAuswahl, kategorieId: number | null): Promise<Empfaenger[]>` — Grundmenge `grundmenge(eq(konto.themaCm, true))`, Reihenfolge `REIHENFOLGE`. Nur aktive Kategorien des Turniers. Die Gültigkeit von `kategorieId` prüft die Schnittstelle (Task 4); hier gilt: unbekannte/fremde Kategorie → `[]`.

Regeln (Spec A6): *angemeldet* = Spieler einer Anmeldung mit `istAktiv` in einer (bzw. der gewählten) aktiven Kategorie. *berechtigt* ohne Kategorie = (`fehlendeAngaben(s).length > 0` oder passt in mind. eine aktive Kategorie: Einzel `passtEinzel`, Doppel `passtDoppelAllein`) und in keiner aktiven Kategorie des Turniers angemeldet und Zahl der aktiven Anmeldungen im Turnier `< GRENZE`. *berechtigt* mit Kategorie X = passt in X (fehlende Angaben passen nie) und nicht in X angemeldet und `< GRENZE`. *sucht-partner* = Doppel-Anmeldung mit genau einem Spieler und Status `bestaetigt` (ohne Kategorie: in irgendeiner aktiven Doppel-Kategorie). *alle* = Grundmenge.

- [ ] **Step 1: Failing tests Rolle** (`empfaenger.db.test.ts`): `test('Rolle: nur Inhaber der Rolle, Thema Verein gilt, gesperrt fehlt')` — eigene Mitglieder: A mit `rollen: ['cm']`, B ohne Rolle, C `['cm']` mit `themaVerein = false`, D `['cm']` gesperrt; `vereinEmpfaenger(db, 'rolle-cm')` enthält A, nicht B, C, D. `vereinEmpfaenger(db, 'alle')` enthält A und B (wie bisher).
- [ ] **Step 2: Failing tests Turnier** (`empfaenger-turnier.db.test.ts`), je ein `test`, Turnier über `legeTurnierAn`/`legeKategorieAn` aus `turnier/turniere.ts`, Mitglieder mit gesetzten Angaben (Geschlecht/Jahrgang/Klassierung direkt in `mitglied`), Anmeldungen über `meldeAn` bzw. direkte Inserts in `anmeldung`/`anmeldungSpieler` wie in `cm/verwaltung.db.test.ts`:
  - `angemeldet je Kategorie` — Kat. «Herren R1–R5» (Einzel) und «Herren Doppel» (Doppel, Mindestsumme 9); P1 in Einzel bestätigt, P2+P3 als Paar im Doppel, P4 zurückgezogen in Einzel: `('angemeldet', einzel)` = [P1]; `('angemeldet', doppel)` = P2, P3; `('angemeldet', null)` enthält P1, P2, P3, nicht P4.
  - `berechtigt mit Kategorie` — R3-Herr nicht angemeldet: drin; R7-Herr (passt nur mit Wildcard): nicht drin; Dame: nicht drin; Herr ohne Jahrgang: nicht drin; P1 (schon angemeldet): nicht drin.
  - `berechtigt ohne Kategorie` — R3-Herr nicht angemeldet: drin; Herr ohne Angaben: drin; P1 (in Einzel angemeldet): nicht drin; Dame bei nur Herren-Kategorien: nicht drin.
  - `Höchstzahl` — Mitglied mit 3 aktiven Anmeldungen in drei Kategorien des Turniers, passt in eine vierte: bei `('berechtigt', vierte)` nicht drin.
  - `sucht Partner` — allein im Doppel bestätigt: drin bei `('sucht-partner', doppel)` und `('sucht-partner', null)`; Paar P2/P3 nicht drin.
  - `abgesagte Kategorie und fremdes Turnier` — `('angemeldet', abgesagteId)` = []; `('angemeldet', kategorieAusAnderemTurnier)` = [].
  - `Thema Clubmeisterschaft aus` — P1 mit Thema aus fehlt bei `('angemeldet', einzel)`.
- [ ] **Step 3:** `npx vitest run src/lib/server/mitteilung/empfaenger` → FAIL.
- [ ] **Step 4:** `vereinEmpfaenger` mit Auswahl (Join auf `kontoRolle` bei Rolle) und `turnierEmpfaenger` umsetzen. Ein Query für Grundmenge + Angaben, ein Query für aktive Anmeldungen des Turniers (mitgliedId, kategorieId, Spielerzahl, Status), Rest in TypeScript mit den Passungsfunktionen — keine zweite Passungsregel in SQL.
- [ ] **Step 5:** Tests → PASS. `npx eslint src/lib/server/mitteilung` ohne Meldung (Importrichtung: nur Nicht-Schnittstellen-Dateien aus `cm/` und `turnier/`).
- [ ] **Step 6: Commit** `feat: Empfänger nach Rolle und nach CM-Gruppe (#95, #97)`

### Task 4: Schnittstellen der Verwaltung

**Files:**
- Modify: `src/lib/server/mitteilung/verwaltung-schnittstellen.ts`, `src/lib/server/mitteilung/angaben.ts`, `src/lib/mitteilung/vorlagen.ts`
- Create: `src/routes/api/admin/turniere/[id]/mitteilungen/+server.ts`, `…/mitteilungen/vorschau/+server.ts`, `…/mitteilungen/senden/+server.ts` (je wie `api/admin/anlaesse/[id]/mitteilungen/…`)
- Test: `src/lib/server/mitteilung/verwaltung-schnittstellen.db.test.ts`, `src/lib/mitteilung/vorlagen.test.ts`, `src/lib/server/mitteilung/angaben.test.ts`, `src/lib/server/admin/rechte-matrix.db.test.ts`

**Interfaces:**
- Consumes: Task 2 (`ladeTurnierKopf`, Bezug), Task 3 (`turnierEmpfaenger`, `vereinEmpfaenger`).
- Produces:
  - `MitteilungFeld = 'titel' | 'text' | 'auswahl' | 'kategorie' | 'weg'`; `FELD_MELDUNG.kategorie = 'Bitte eine Kategorie dieses Turniers wählen.'`
  - `pruefeKategorie(roh: unknown, auswahl: TurnierAuswahl, kategorien: { id: number; name: string; art: Art }[]): { ok: true; kategorie: { id: number; name: string } | null } | { ok: false }` in `angaben.ts`: `kategorieId` fehlt/`null` → `null`; bei `alle` mit Kategorie, unbekannter Id, oder `sucht-partner` mit Einzel-Kategorie → `{ ok: false }`.
  - `vorlagenTurnier(t: { jahr: number; anmeldeschluss: string }): Vorlage[]` mit `art` `'erinnerung' | 'aenderung' | 'offen'` (VorlageArt um `'offen'` erweitern; `VORLAGE_NAMEN.offen = 'Anmeldung offen'`), Titel ≤ `MAX_TITEL`, Sätze aus Spec A5, Datum über `formatiereTag`.
  - `getTurnierMitteilungen`, `postTurnierVorschau`, `postTurnierSenden` in `MITTEILUNG_ADMIN_SCHNITTSTELLEN`; Bereich `'cm'`. Antwort von GET: `{ vorlagen, verlauf, kategorien }` (aktive Kategorien `{ id, name, art }`).
  - Senden-Link Turnier: `${adresse}/clubmeisterschaft/${turnierId}`; Verlauf speichert `kategorie` (Name) mit.

Regeln: Unbekanntes Turnier → 404. Gespeicherter Status `vorbereitung` → Vorschau und Senden 409 `{ fehler: 'vorbereitung' }` (nach Rechteprüfung, vor der Eingabeprüfung); GET geht. Verein: `pruefeMitteilung(koerper, VEREIN_AUSWAHLEN)` und `vereinEmpfaenger(d.db, auswahl)`.

- [ ] **Step 1: Failing tests** (`verwaltung-schnittstellen.db.test.ts`, Jahresbereich aus den Global Constraints):
  - `CM-Admin: Vorschau an Kategorie zählt nur deren Angemeldete` (2 eigene Angemeldete → `anzahl: 2`).
  - `CM-Admin: Senden schreibt Verlauf mit Kategorie und Link aufs Turnier` — Mailer-Attrappe bekommt Text mit `/clubmeisterschaft/<id>`; GET-Verlauf hat `auswahl: 'angemeldet'`, `kategorie: '<Name>'`.
  - `Kategorie fremd, abgesagt, bei alle oder Einzel bei sucht-partner → 400 Feld kategorie` (vier Fälle, `felder.kategorie === FELD_MELDUNG.kategorie`).
  - `Turnier in Vorbereitung: Vorschau und Senden 409 vorbereitung, Verlauf 200`.
  - `Mitglieder-Admin ohne CM-Rolle: Turnier-Mitteilung 403` (Wort wie die übrigen `schreibt`-Fälle, z. B. `kein-recht`).
  - `Verein an Rolle: Vorschau enthält eigenes CM-Admin-Mitglied, nicht ein eigenes ohne Rolle` (über `namen`).
  - `Verein: unbekannte Auswahl rolle-xyz → 400 Feld auswahl`.
  - `vorlagen.test.ts`: `vorlagenTurnier` liefert drei Vorlagen, Titel ≤ 50, Text ≤ 200, Erinnerung nennt `{Jahr}` und Anmeldeschluss.
  - Rechte-Matrix: Turnier-Mitteilungen im Ablauf wie die Anlass-Mitteilungen ergänzen (MyTCO-Admin liest Verlauf, Senden abgewiesen).
- [ ] **Step 2:** `npx vitest run src/lib/server/mitteilung src/lib/mitteilung src/lib/server/admin/rechte-matrix.db.test.ts` → FAIL.
- [ ] **Step 3:** Umsetzen: `Ziel` um `{ art: 'turnier'; turnier: TurnierKopf }`, `mitZiel` mit Bereich je Art (`anlass`/`verein` → `'mitglieder'`, `turnier` → `'cm'`); Routen anlegen. `src/lib/server/routen.test.ts` muss die neuen Routen ohne neue Liste finden (Liste `mitteilung-admin` gibt es).
- [ ] **Step 4:** Tests → PASS; `make check-schnell` grün (enthält Lint und Prüfskripte samt Bauregel).
- [ ] **Step 5: Commit** `feat: Schnittstellen für Mitteilungen zum Turnier und an Rollen (#95, #97)`

### Task 5: Oberfläche, Seiteninfo und E2E

**Files:**
- Modify: `src/lib/verwaltung/mitteilung-api.ts`, `src/lib/verwaltung/Mitteilungsformular.svelte`, `src/lib/verwaltung/Mitteilungsverlauf.svelte`
- Modify: `src/routes/verwaltung/turniere/[id]/+page.ts`, `+page.svelte` (neuer Abschnitt `<h2>Mitteilungen</h2>` am Ende vor «Angaben», wie in `anlaesse/[id]/+page.svelte:170-182`)
- Modify: `src/routes/verwaltung/mitteilungen/+page.svelte` (Seiteninfo)
- Modify: Stile nur in `src/lib/design/verwaltung.css` bzw. der Datei des Bausteins, falls nötig
- Test: `tests/e2e/mitteilungen.test.ts`; Einheitstests für `auswahlText` in `src/lib/verwaltung/mitteilung-api.test.ts` (anlegen, falls es keine gibt)

**Interfaces:**
- Consumes: Task 4 (Pfade, Antwortformen, `FELD_MELDUNG.kategorie`, `VORLAGE_NAMEN.offen`).
- Produces:
  - `MitteilungWerte` (Oberfläche) `+ kategorieId: number | null`; `gleicheWerte` vergleicht auch `kategorieId`; Körper schickt `kategorieId` nur beim Turnier.
  - `pfad({ art: 'turnier', turnierId })` = `/api/admin/turniere/${turnierId}/mitteilungen`.
  - `auswahlText(auswahl: string, kategorie: string | null = null): string` — Namen: Turnier `alle` «Alle aktiven Mitglieder», `angemeldet` «Angemeldet», `berechtigt` «Spielberechtigt, noch nicht angemeldet», `sucht-partner` «Doppel: sucht Partner»; Verein `rolle-mytco` «Alle mit Rolle MyTCO-Admin» usw. (Rollennamen wie auf der Seite *Rollen*); mit Kategorie `«<Name> · <Kategorie>»`, beim Turnier ohne Kategorie (ausser `alle`) `« · alle Kategorien»`.
  - `Mitteilungsformular` Prop `kategorien?: { id: number; name: string; art: Art }[]` (nur Turnier). Turnier: Radio-Gruppe «Empfänger» über `TURNIER_AUSWAHLEN`, darunter Auswahlliste «Kategorie» (`<select>` mit «Alle Kategorien» + Kategorien; bei `sucht-partner` nur Doppel; bei `alle` nicht angezeigt und `null`). Vorlage *Erinnerung* belegt `berechtigt` vor, sonst `alle`. Verein: Radio-Gruppe über `VEREIN_AUSWAHLEN`.
  - Turnierseite zeigt das Formular nur mit Schreibrecht `cm` und nicht im Status *in Vorbereitung* (dann der Satz «Mitteilungen gehen, sobald die Anmeldung offen ist.»); Verlauf immer.

- [ ] **Step 1: Failing unit test** `auswahlText` für `('angemeldet', 'Damen R7–R9')` → «Angemeldet · Damen R7–R9», `('berechtigt', null)` → «Spielberechtigt, noch nicht angemeldet · alle Kategorien», `('rolle-cm')` → «Alle mit Rolle CM-Admin», `('kommt')` → «Kommen» (unverändert).
- [ ] **Step 2: Failing E2E** in `tests/e2e/mitteilungen.test.ts`:
  - `CM-Admin schickt Mitteilung an die Angemeldeten einer Kategorie` — eigenes offenes Turnier (`legeOffenesTurnierAn`), eigene Kategorie, zwei eigene Spieler angemeldet (`meldeZurCmAn`); CM-Admin (`legeCmMitBriefCodeAn`) öffnet Turnierseite, «Neue Mitteilung», Vorlage «Erinnerung», Empfänger «Angemeldet», Kategorie wählen, «Vorschau» zeigt «2 Mitglieder», Kategorie auf «Alle Kategorien» stellen → Senden gesperrt (Review Focus 5), wieder zurück, Vorschau, «Senden», Rückfrage bestätigen; Verlauf zeigt «Angemeldet · <Kategorie>»; Mail in Mailpit an einen der Spieler mit Link `/clubmeisterschaft/<id>`.
  - `Mitglieder-Admin schickt an eine Rolle (nur Push)` — Empfänger «Alle mit Rolle Lizenz-Admin», Weg «Nur Push», Vorschau zeigt eine Zahl ≥ 1, Senden, Verlauf zeigt «Alle mit Rolle Lizenz-Admin».
  - Elemente über Rolle/Beschriftung; keine festen Wartezeiten; `pruefeBildschirm` wie die bestehenden Tests.
- [ ] **Step 3:** Unit-Test → FAIL; E2E im Hintergrund (`npm run e2e -- tests/e2e/mitteilungen.test.ts`) → FAIL.
- [ ] **Step 4:** Svelte-Doku über MCP holen, umsetzen, `svelte-autofixer` auf beiden geänderten Bausteinen.
- [ ] **Step 5:** Seiteninfo *Mitteilungen* neu: «Allgemeine Mitteilungen an alle aktiven Mitglieder oder an alle mit einer Rolle, per Push oder E-Mail.» / «An einen Teil der Mitglieder geht eine Mitteilung über die Seite eines Anlasses oder, für die Clubmeisterschaft, über die Seite des Turniers.» — **dem Projektleiter vor dem Commit zeigen** (Regel aus #93). Die Turnierseite hat keine Seiteninfo; keine neue anlegen.
- [ ] **Step 6:** Unit-Test und E2E (Hintergrund) → PASS.
- [ ] **Step 7:** Screenshots PC (1280 px) und Handy (390 px) der Turnierseite mit offenem Formular ins Scratchpad; im Bericht zeigen.
- [ ] **Step 8: Commit** `feat: Mitteilungen zum Turnier und an Rollen in der Verwaltung (#95, #97)`

### Task 6: Abschluss

**Files:**
- Modify: `docs/versionen.md` (unter «Unveröffentlicht»), `docs/anforderungen/README.md` (Änderungsprotokoll), `docs/anforderungen/anforderungen.md` (N-APP-02), `docs/fachmodell.md` (FR-42/43 auf *umgesetzt*)

- [ ] **Step 1:** Eintrag unter «Unveröffentlicht»: «Der CM-Admin schickt auf der Seite des Turniers Mitteilungen an Angemeldete, Spielberechtigte oder Spieler, die einen Partner suchen, auch nur für eine Kategorie. Vereinsmitteilungen gehen auch an alle mit einer Rolle (#97, #95).»
- [ ] **Step 2:** Änderungsprotokoll-Zeile 24.11.2026, N-APP-02 ergänzen, FR-42/43 *umgesetzt*.
- [ ] **Step 3:** `make check` im Hintergrund auf dem committeten Stand → grün.
- [ ] **Step 4: Commit** `docs: Mitteilungen an Gruppen nachgeführt (#95, #97)`
