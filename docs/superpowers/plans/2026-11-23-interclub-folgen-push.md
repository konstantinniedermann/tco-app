# Interclub: Teams folgen und Push nach neuem Endstand — Bauplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mitglieder folgen Interclub-Teams und bekommen nach jedem neuen Endstand (mit Spielbericht) einen Push.

**Architecture:** Zwei neue Tabellen (`ic_folgen`, `ic_gemeldet`). Fachfunktionen in `src/lib/server/interclub/folgen.ts` (Folgen) und `melden.ts` (Push nach dem Abruf, im selben Zeitgeber-Lauf direkt nach `fuehreAbrufAus`). Schnittstellen in `interclub/schnittstellen.ts`; Oberfläche: Schalter auf der Teamseite, Gruppe «Interclub-Teams» in `Benachrichtigungen.svelte`.

**Tech Stack:** SvelteKit 3 / Svelte 5, Drizzle + Postgres, Vitest (Projekte `einheit`, DB-Tests `*.db.test.ts`), Playwright-E2E über `make e2e`.

**Spec:** `docs/superpowers/specs/2026-11-23-interclub-folgen-push-design.md`

**Worktree:** `/Users/KN/CAS/projekte/tco-app/.claude/worktrees/issue-081-push`, Branch `feat/issue-081-push`. Nur schlichte Git-Befehle, Dateien einzeln stagen, Commit-Texte per `-F <datei>` mit den Zeilen `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` und `Claude-Session: https://claude.ai/code/session_01PepCy9EJB7Xx39k6dJgPhe`. Nicht mergen, nicht pushen.

## Global Constraints

- `CLAUDE.md` des Projekts gilt vollständig (Bauregeln Server/Oberfläche/Tests); vor Svelte-Code die Doku über den Svelte-MCP-Server holen.
- Jede Verhaltensänderung beginnt mit einem Test, der vorher rot war. Fachlogik-Tests gegen die echte Datenbank; Attrappen nur für Push-Versand, Uhr, Abruf.
- Nur Push, nie E-Mail. Push-Text ohne Spielernamen (DS-05, DS-08). Logs nur feste Texte.
- Zeit nur über `jetzt` (Dienste), nie `new Date()` in Fachlogik.
- Migrationen: `npm run db:generate` erzeugt eine neue; nichts an bestehenden Migrationen ändern.
- Push-Titel exakt «Interclub»; Zeile exakt `<Liga>: <Heim> – <Gast> <H>:<G>` (Gedankenstrich U+2013 mit Leerzeichen), Zeilen mit `\n` getrennt.
- Fenster: Datum von heute (Zürich) bis 7 Tage zurück, nur laufende Saison (`jahrInZuerich(jetzt)`).
- Oberflächentexte exakt: «Diesem Team folgen», Hilfetext «Push nach jedem Endstand», ohne Push «Mit Push kannst du diesem Team folgen.» mit Link «Push einrichten» (→ `/profil`), Profil-Legende «Interclub-Teams», ohne Team «Du folgst keinem Team. Folgen kannst du auf der Seite eines Teams unter IC.», ohne Push in der Liste «Ohne Push bekommst du keine Mitteilung.», mit Teams und Push «Push nach jedem Endstand. Folgen kannst du auf der Seite eines Teams unter IC.»
- Neues Fehlerwort `kein-push` (409) in `src/lib/fehler.ts`.

## Review Focus

1. Erster Lauf nach Neu-Aufsetzen / Nachholen alter Saisons: alte Endstände (älter als 7 Tage oder andere Saison) lösen nie einen Push aus — Test in Task 3.
2. Endstand ohne Spielbericht (Zwischenstand) wird nicht gemeldet und auch nicht in `ic_gemeldet` eingetragen; kommt der Bericht später, wird er dann gemeldet — Test in Task 3.
3. Konto folgt beiden TCO-Teams einer Begegnung TCO gegen TCO: eine Zeile, ein Push — Test in Task 3.
4. Abo ungültig (Push-Dienst meldet `ungueltig`): Abo wird gelöscht, Begegnung bleibt gemeldet, kein zweiter Versuch — Test in Task 3.
5. Konto folgt, hat aber kein Abo mehr: Teamseite zeigt Schalter (an), Entfolgen geht — Tests in Task 2 und Task 5.

---

### Task 1: Datenschutz vor dem Code

**Files:**
- Modify: `docs/datenschutz.md` (Welche Daten, Wer sieht was, Löschen, Änderungsprotokoll am Ende)
- Modify: `docs/datenschutzerklaerung.md` (Abschnitt «Mitteilungen»)

- [ ] **Step 1:** In *Welche Daten* bei der Zeile «Konto, Rollen, Benachrichtigungs-Einstellungen» die gefolgten Interclub-Teams (Team-Nummer von Swiss Tennis, seit wann) ergänzen; Zweck «Push nach neuem Endstand (A-INTERCLUB-02)»; freiwillig. Satz, dass die Liste der gemeldeten Begegnungen keine Personendaten enthält.
- [ ] **Step 2:** *Wer sieht was*: nur das Mitglied selbst; Auskunft (DS-07) zeigt sie. *Löschen*: mit dem Konto; beim Austritt bleiben sie wie die Themen (Push gibt es ohne Abo nicht). Eintrag im Änderungsprotokoll mit Datum 23.11.2026.
- [ ] **Step 3:** Datenschutzerklärung, Abschnitt Mitteilungen: «Folgst du Interclub-Teams, bekommst du nach jedem neuen Endstand einen Push mit Team und Resultat, ohne Namen. MyTCO speichert dafür, welchen Teams du folgst; abwählen kannst du sie auf der Seite des Teams oder im Profil.»
- [ ] **Step 4:** `make annahmen` und `npm run lint` grün; Commit `docs: Datenschutz für Interclub-Teams folgen und Push (#81)`.

### Task 2: Folgen — Tabelle, Fachfunktionen, Schnittstellen, Routen

**Files:**
- Modify: `src/lib/server/db/schema.ts` (neu `icFolgen`, `icGemeldet`), neue Migration aus `npm run db:generate`
- Create: `src/lib/server/interclub/folgen.ts`, Test `src/lib/server/interclub/folgen.db.test.ts`
- Modify: `src/lib/server/interclub/schnittstellen.ts`, Test `src/lib/server/interclub/schnittstellen.db.test.ts`
- Modify: `src/lib/fehler.ts` (`kein-push`: 409)
- Create: `src/routes/api/interclub/folgen/+server.ts` (GET), `src/routes/api/interclub/teams/[id]/folgen/+server.ts` (POST)

**Interfaces:**
- Produces (schema): `icFolgen` = `ic_folgen` (`konto_id` int not null FK `konto.id` on delete cascade, `team_id` int not null, `seit` timestamptz not null; PK (`konto_id`,`team_id`)). `icGemeldet` = `ic_gemeldet` (`saison` int, `begegnung_id` int, `gemeldet_am` timestamptz, alle not null; PK (`saison`,`begegnung_id`)).
- Produces (`folgen.ts`):
  - `type FolgenStand = { folgt: boolean; push: boolean }` (push = Konto hat irgendein `push_abo`)
  - `type GefolgtesTeam = { teamId: number; liga: string }`
  - `ladeFolgenStand(db: Db, kontoId: number, teamId: number): Promise<FolgenStand>`
  - `setzeFolgen(db: Db, kontoId: number, teamId: number, folgen: boolean, jetzt: Date): Promise<'ok' | 'nicht-gefunden' | 'kein-push'>` — `nicht-gefunden`, wenn `teamId` in keiner Saison in `ic_team` steht; `kein-push` nur beim Folgen ohne Abo; Entfolgen immer `ok` (auch wenn nicht gefolgt); Folgen doppelt ist `ok` (`onConflictDoNothing`).
  - `ladeGefolgteTeams(db: Db, kontoId: number): Promise<{ teams: GefolgtesTeam[]; push: boolean }>` — Teams der neuesten Saison in `ic_team`, denen das Konto folgt, in `reihenfolge`.
- Produces (Schnittstellen, in `INTERCLUB_SCHNITTSTELLEN`): `getInterclubTeam` antwortet `{ ...IcTeam, folgen: FolgenStand }`; neu `postInterclubFolgen` (Körper `{ folgen: boolean }`, nur JSON, Antwort 200 `{ folgt: boolean }`, Fehler über das Wort) und `getInterclubFolgen` (200 `{ teams, push }`).

- [ ] **Step 1: Failing DB-Tests in `folgen.db.test.ts`** (eigene Test-DB wie in `ansicht.db.test.ts`, Team aus `importiereBeispiel` bzw. direkt eingefügt):
  - `folgen ohne Abo: kein-push, nichts gespeichert`
  - `folgen mit Abo: ok, ladeFolgenStand = { folgt: true, push: true }`
  - `entfolgen ohne Abo: ok, folgt false`
  - `unbekanntes Team: nicht-gefunden`
  - `ladeGefolgteTeams: nur Teams der neuesten Saison, mit Liga, in Reihenfolge; Team ohne neueste Saison fehlt`
  - `Konto gelöscht: ic_folgen weg`
- [ ] **Step 2:** `npx vitest run src/lib/server/interclub/folgen.db.test.ts` → FAIL (Modul fehlt).
- [ ] **Step 3:** Schema ergänzen, `npm run db:generate`, `folgen.ts` implementieren.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Failing Schnittstellen-Tests** in `schnittstellen.db.test.ts`: `getInterclubTeam` liefert `folgen`; `postInterclubFolgen` 409 `{ fehler: 'kein-push' }` ohne Abo, 200 `{ folgt: true }` mit Abo, 404 bei unbekanntem Team, 400 bei `{ folgen: 'ja' }`, 415 ohne JSON; `getInterclubFolgen` liefert `{ teams, push }`. Grundprüfung und Routen-Test (`tests/hilfen/mitglieder-listen.ts`) decken die neuen Einträge über `INTERCLUB_SCHNITTSTELLEN` von selbst ab.
- [ ] **Step 6:** Schnittstellen und zwei Routen (`+server.ts` ruft genau eine Funktion mit `holeInterclubDienste()`), `kein-push` in `fehler.ts`. Tests → PASS; `npm run lint` und `npm run check:svelte` grün.
- [ ] **Step 7:** Commit `feat: Interclub-Teams folgen und entfolgen (#81)`.

### Task 3: Melden nach dem Abruf

**Files:**
- Create: `src/lib/server/interclub/melden.ts`, Test `src/lib/server/interclub/melden.db.test.ts`
- Modify: `src/lib/server/dienste.ts` (`holeInterclubAbruf` liefert zusätzlich `melder`), `src/hooks.server.ts` (Lauf: erst `fuehreAbrufAus`, dann `meldeEndstaende`)

**Interfaces:**
- Consumes: `icFolgen`, `icGemeldet` (Task 2); `sendePush(db, push, abo, nutzlast): Promise<boolean>` und `type PushSender` aus `../mitteilung/versand.ts`; `heuteInZuerich`, `jahrInZuerich`, `plusTage` aus `../datum.ts`.
- Produces: `type MeldeDienste = { db: Db; push: PushSender | null; adresse: string; jetzt: () => Date }` und `meldeEndstaende(d: MeldeDienste): Promise<number>` (Anzahl neu eingetragener Begegnungen; wirft nie). `holeInterclubAbruf()` gibt `{ dienste, verein, melder: MeldeDienste }` zurück (`push` aus `holePush(e)`, `adresse` aus `e.adresse`).

- [ ] **Step 1: Failing DB-Tests in `melden.db.test.ts`** (Push als Attrappe, die Abo und Nutzlast sammelt; Uhr fest auf einen Tag im Mai der Testsaison; Spielbericht = Zeile in `ic_bericht`):
  - `neuer Endstand mit Bericht: ein Push an das folgende Konto, Titel «Interclub», Text «2L Herren 1: Olten 1 – Villmergen 8:1», Link <adresse>/interclub/<teamId>/<begegnungId>`
  - `Endstand ohne Bericht: kein Push, nicht in ic_gemeldet; nach Bericht im nächsten Lauf gemeldet`
  - `zweiter Lauf: kein zweiter Push`
  - `älter als 7 Tage oder andere Saison: kein Push, nicht eingetragen`
  - `ohne Follower: eingetragen, kein Push; wer danach folgt, bekommt ihn nicht`
  - `zwei Endstände eines Kontos im selben Lauf: ein Push, zwei Zeilen, Link <adresse>/interclub`
  - `TCO gegen TCO, Konto folgt beiden Teams: eine Zeile`
  - `Auf-/Abstiegsspiel (ic_entscheid) wird gemeldet wie ein Gruppenspiel`
  - `ohne Abo, gesperrtes Konto, ausgetretenes Mitglied: kein Push`
  - `push null (kein VAPID): eingetragen, kein Versand`
  - `Push-Dienst meldet ungueltig: Abo gelöscht, Begegnung bleibt gemeldet`
  - `Nutzlast enthält keine Spielernamen aus ic_spieler`
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** `meldeEndstaende` implementieren. Ablauf: Kandidaten sammeln (`ic_begegnung` mit eigenem Team wie in `ladeLage`: `heim` oder `gast` = `teamName` des Teams; `ic_entscheid` mit `heimId`/`gastId` = `teamId`), beide Punkte gesetzt, Bericht vorhanden (`ic_bericht` mit `saison`, `teamId`, `begegnungId`), nicht in `ic_gemeldet`; alle in **einer** Anweisung in `ic_gemeldet` eintragen (`onConflictDoNothing`, nur die tatsächlich eingetragenen gelten als neu); dann je Konto (aktiv, nicht gesperrt, mit Abos, folgt mindestens einem beteiligten Team) eine Nutzlast `JSON.stringify({ titel, text, link })` an jedes Abo über `sendePush`. Liga einer Begegnung TCO gegen TCO: die des Teams mit der kleineren `reihenfolge`. Zeilen nach Datum, dann `reihenfolge`. Alles in `try/catch`, Rückgabe 0 bei Fehler.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** `dienste.ts` und `hooks.server.ts` verdrahten: der Zeitgeber-Lauf ist `async () => { await fuehreAbrufAus(ic.dienste, ic.verein); await meldeEndstaende(ic.melder); }`. `npm run lint`, `npm run check:svelte` grün.
- [ ] **Step 6:** Commit `feat: Push nach neuem Interclub-Endstand an gefolgte Teams (#81)`.

### Task 4: Auskunft

**Files:**
- Modify: `src/lib/server/admin/auskunft.ts` (Feld `interclubTeams: GefolgtesTeam[]`, Quelle `ladeGefolgteTeams` bzw. alle gefolgten Teams mit Liga der neuesten Saison, in der es sie gibt), Druckseite `src/routes/verwaltung/mitglieder/[id]/auskunft/+page.svelte` (Zeile «Interclub-Teams» bei den Themen, «keine» wenn leer)
- Test: der bestehende Auskunft-DB-Test (`src/lib/server/admin/auskunft*.db.test.ts`)

- [ ] **Step 1:** Failing Test `Auskunft nennt gefolgte Interclub-Teams mit Liga`.
- [ ] **Step 2:** Implementieren; Test → PASS; Commit `feat: Auskunft nennt gefolgte Interclub-Teams (#81)`.

### Task 5: Oberfläche und E2E

**Files:**
- Modify: `src/lib/interclub/api.ts` (`Team` enthält `folgen`; neu `setzeFolgen(teamId, folgen, holen)`, `holeGefolgteTeams(holen)`; Wort `kein-push` im Vertrag)
- Modify: `src/routes/interclub/[id]/+page.svelte` (Schalter bzw. Satz mit Link, zwischen Teamzeile und Umschalter; in der Ansicht (`data.ansicht !== null`, wie Profil) kein Schalter)
- Modify: `src/lib/push/Benachrichtigungen.svelte` (Gruppe «Interclub-Teams» unter dem Satz zu den Themen; lädt `holeGefolgteTeams` selbst, wie die Klappe schon ihren Stand lädt)
- Modify: `docs/ui-leitbild.md` (Teamseite: Schalter «Diesem Team folgen»; Benachrichtigungen: Gruppe «Interclub-Teams»)
- Create/Modify: `tests/e2e/interclub.test.ts`, Hilfe zum Anlegen eines Push-Abos für ein Konto in `tests/e2e/hilfen/login.ts` (Abo an eine eigene, in der DB angelegte Sitzung des Kontos; Endpunkt frei erfunden)

- [ ] **Step 1: Failing E2E** (Konto per Brief-Code, kein Mail-Code):
  - `#81: ohne Push zeigt die Teamseite «Mit Push kannst du diesem Team folgen.» mit Link zum Profil`
  - `#81: mit Push folgt der Schalter dem Team, das Profil listet es, Abwählen im Profil entfolgt` (nach Neuladen der Teamseite ist der Schalter aus)
  - `#81: folgt ohne Abo: Schalter angehakt, Entfolgen geht, danach der Satz` 
- [ ] **Step 2:** `make e2e` im Hintergrund → die neuen Tests rot.
- [ ] **Step 3:** Leitbild ergänzen, dann Abruf-Modul und Bausteine bauen. Schalter wie in `Benachrichtigungen.svelte`: gilt sofort, eine Anfrage nach der anderen, bei Fehler Stand des Servers und `MELDUNG.stoerung`, `abgemeldet` über `leiteUmNachAktion`; `kein-push` → Seite zeigt den Satz. Entwurf: Design-Artifact «MyTCO Interclub», Reihe «Folgen und Push» (8a–8d).
- [ ] **Step 4:** `make e2e` im Hintergrund → grün; Screenshots der Teamseite (aus, an, ohne Push) und des Profils mit dem Entwurf vergleichen.
- [ ] **Step 5:** Commit `feat: Interclub-Teams folgen auf der Teamseite und im Profil (#81)`.

### Task 6: Doku, echter Push, Abschluss

**Files:**
- Modify: `docs/anforderungen/anforderungen.md` (neu A-INTERCLUB-02 «Mitglieder folgen Teams und bekommen nach jedem neuen Endstand mit Spielbericht einen Push», Änderungsprotokoll), Fachmodell, Glossar («folgen»), `docs/adr/adr-011-…` (Melden nach dem Abruf, nur mit Spielbericht), `docs/versionen.md` unter «Unveröffentlicht»

- [ ] **Step 1:** Doku nachführen; `make annahmen` grün.
- [ ] **Step 2:** Echter Push lokal: Playwright mit `channel: 'chrome'` (ohne `--disable-background-networking`), Abo einrichten, Konto folgt einem Team, Endstand mit Bericht in die lokale DB, `meldeEndstaende` per Skript aufrufen, `registration.getNotifications()` zeigt Titel «Interclub» und die Zeile. VAPID-`subject` nicht `http`.
- [ ] **Step 3:** `make check` im Hintergrund, grün auf dem committeten Stand.
- [ ] **Step 4:** Commit `docs: Interclub folgen und Push in Anforderungen, Fachmodell, Glossar, ADR-011 (#81)`.
