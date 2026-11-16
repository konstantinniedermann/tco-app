# Interclub-Einzelpartien (#81 Teil 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mitglieder sehen zu jeder gespielten Begegnung eines TCO-Teams die Einzelpartien mit Sätzen, TCO-Spieler mit Name und Klassierung, Gegner nur als Team.

**Architecture:** `make ic-import` holt zusätzlich je eigene, gespielte Begegnung den Spielbericht (`encounter-results` bzw. für Auf-/Abstieg `tableau-results`), prüft ihn in `swiss-tennis.ts` und speichert ihn in drei neuen Tabellen (Bericht › Partie › TCO-Spieler), die per Kaskade am `ic_team` hängen. Eine neue Schnittstelle liefert eine Begegnung; eine neue Seite `/interclub/[id]/[begegnung]` zeigt sie (zweite Stufe unter dem Reiter).

**Tech Stack:** SvelteKit 2 / Svelte 5, Drizzle + PostgreSQL, Vitest (DB-Tests gegen echte DB), Playwright.

**Spec:** `/private/tmp/claude-501/-Users-KN-CAS-projekte-tco-app/48d3afa2-d667-4e68-85e3-edcde4940b1a/scratchpad/2026-11-13-interclub-einzelpartien-design.md`

## Global Constraints

- Arbeitsort: Worktree `.claude/worktrees/issue-81-einzelpartien`, Branch `feat/issue-81-einzelpartien` ab `origin/dev` (Skill `tco-branching`). Hauptordner bleibt auf `dev`.
- Datenschutz-Doku (Task 1) ist committet, bevor irgendein Code entsteht.
- Nie echte Spielernamen oder echte Personennummern in Repo, Tests, Seed, Logs, Screenshots. Rohdaten nur im Scratchpad `…/scratchpad/st/`.
- Von Gegnerspielern wird nichts gespeichert (kein Name, keine Klassierung, keine Nummer).
- Von TCO-Spielern gespeichert: Name, Klassierung, Rangliste-Nummer, Personennummer. An die Oberfläche (JSON der Schnittstelle) gehen nur Name und Klassierung.
- Kein Löschen alter Saisons.
- Bauregeln `CLAUDE.md`: Route ruft genau eine Schnittstellen-Funktion; Fachfunktionen ohne HTTP; Abruf nur über `src/lib/interclub/api.ts`; erstes Laden in `+page.ts`; Stile nur unter `src/lib/design/`, neue Bausteine erst ins Leitbild; Logs nur feste Texte; schreibende Teile gibt es keine.
- Migration nur hinzufügend, erzeugt mit `npm run db:generate`; vor dem Merge dev einmergen und die Nummer prüfen (Memory «Migrationsnummer parallel»); `mytco` erst nach dem Merge migrieren.
- Tests rot zuerst; Fachlogik gegen echte DB; nie zwei Prüfläufe gleichzeitig; E2E nur `make e2e`, im Hintergrund.
- Commits: `docs:`/`feat:`/`test:`/`fix:` mit `(#81)`; Dateien einzeln stagen.

## Review Focus

1. **Aufgabe/w.o.:** Partie mit `wo: 1` auf einer Seite und unvollständigen Sätzen (`["6:3","5:3",""]`, `["1:0","",""]`) → Sieger ist die andere Seite, Anzeige «aufgegeben» bzw. «w.o.» statt falscher Farbe. (Test in Task 2 und Task 5.)
2. **Auf-/Abstiegsspiel:** `encounter-results` antwortet `null`, `tableau-results` liefert den Bericht → Einzelpartien erscheinen auch dort. (Test in Task 4.)
3. **TCO auswärts:** `clubNumber` 2202 bei `awayTeam` → Sätze aus TCO-Sicht gedreht, Spieler von `away`. (Test in Task 2 und Task 5.)
4. **Bericht fehlt** (`null` von beiden Abfragen, Resultat noch nicht erfasst) → Begegnung gespeichert, Seite sagt «Einzelpartien noch nicht da», Import `ok`. (Test in Task 4 und Task 7.)
5. **Gegnerdaten rutschen durch:** JSON der Schnittstelle und Tabellen enthalten keinen Gegnernamen, keine `stId`/`rangliste`. (Test in Task 4 und Task 6.)

---

### Task 0: Worktree

- [ ] Skill `tco-branching` (Start): Worktree `.claude/worktrees/issue-81-einzelpartien`, Branch `feat/issue-81-einzelpartien` ab `origin/dev`, Label `in-arbeit` an #81. `npm ci --ignore-scripts` im Worktree, falls `node_modules` fehlt.

### Task 1: Datenschutz-Nachtrag (vor jedem Code)

**Files:** Modify `docs/datenschutz.md`, `docs/datenschutzerklaerung.md`

- [ ] Inhalte genau nach Abschnitt «Datenschutz-Nachtrag» der Spec einfügen: *Welche Daten* (neue Zeile), *Wer sieht was* (Zeile *Alle Mitglieder* ergänzen), *Löschen* (neuer Punkt «bleiben über die Saisons»), *Junioren* (Absatz), DS-08 (Satz zu erfundenen Namen/Nummern in Beispieldaten), *Änderungen* (Eintrag 13.11.2026, #81 Teil 2). Erklärung: *Welche Daten*, *Wer sieht was* (neuer Punkt), *Wie lange*; Formatregeln am Dateikopf beachten. Knapp halten (Memory «Konzepte minimal»).
- [ ] `make docs` (bzw. die Doku-Prüfung aus `make help`) grün; `npx vitest run src/lib/datenschutz` grün (die Erklärung wird in der App gerendert).
- [ ] Commit `docs: Datenschutz für Interclub-Einzelpartien nachgeführt (#81)`.

### Task 2: Bericht prüfen (`swiss-tennis.ts`)

**Files:** Modify `src/lib/server/interclub/swiss-tennis.ts`; Test `src/lib/server/interclub/swiss-tennis.test.ts`

**Interfaces — Produces:**
```ts
export type StSpieler = { stId: number; name: string; klassierung: string; rangliste: number };
export type StPartie = {
  art: 'einzel' | 'doppel';
  position: number;
  saetze: string[];          // 0–3 Einträge, nur nicht-leere, aus TCO-Sicht ("7:5" = TCO 7)
  aufgabe: 'tco' | 'gegner' | null;   // welche Seite wo: 1 hat
  spieler: StSpieler[];      // TCO-Seite, 1 (Einzel) bzw. 2 (Doppel)
};
export type StBericht = {
  tcoHeim: boolean;
  saetze: { tco: number; gegner: number };
  games: { tco: number; gegner: number };
  partien: StPartie[];
};
/** null = Form weicht ab; 'fehlt' = Swiss Tennis hat keinen Bericht (JSON null). */
export function pruefeBericht(json: unknown, verein: number): StBericht | 'fehlt' | null;
```

- [ ] Tests (erfundene Werte, im Test als Objekt gebaut, Form wie im Spec-Befund):
  - `pruefeBericht: TCO heim, Einzel und Doppel` → `tcoHeim: true`, Spieler `{ stId: 900001, name: 'Max Muster', klassierung: 'R6', rangliste: 9497 }` aus `"Max Muster R6 (9497)"`, `saetze: ['5:7','0:6']` (leerer dritter Satz entfernt), Doppel mit 2 Spielern.
  - `pruefeBericht: TCO auswärts dreht Sätze` → Heim `"6:3"` wird `"3:6"`, Spieler aus `away`, `saetze.tco` = `awayTeam.sets`.
  - `pruefeBericht: wo` → `home.wo: 1`, TCO heim → `aufgabe: 'tco'`; `away.wo: 1` → `'gegner'`; Sätze `["1:0","",""]` → `['1:0']`.
  - `pruefeBericht: nichts vom Gegner` → `JSON.stringify(ergebnis)` enthält den erfundenen Gegnernamen und dessen `id` nicht.
  - `pruefeBericht: null → 'fehlt'`.
  - `pruefeBericht: Formfehler → null` je Fall: keine oder zwei Seiten mit `clubNumber` = verein; TCO-Name ohne «Klassierung (Nummer)»; Klassierung `X5`; Einzel mit 2 TCO-Spielern; `results` nicht Länge 3; Satz `"6-3"`; `wo: 2`; `position` keine Zahl; `singles` fehlt.
- [ ] Rot laufen lassen: `npx vitest run src/lib/server/interclub/swiss-tennis.test.ts` → FAIL (`pruefeBericht` fehlt).
- [ ] Implementieren. Name-Muster: `/^(.*\S) ([RN]\d) \((\d+)\)$/`. Gegnerseite: nur prüfen, dass `members` ein Array und `wo` 0/1 ist; Inhalt nicht lesen.
- [ ] Grün; Commit `feat: Spielbericht von Swiss Tennis prüfen (#81)`.

### Task 3: Tabellen

**Files:** Modify `src/lib/server/db/schema.ts`; Create `drizzle/00NN_*.sql` (generiert)

**Interfaces — Produces** (Drizzle-Namen):
- `icBericht` `ic_bericht`: `saison`, `teamId`, `begegnungId` (PK alle drei; FK `(saison, teamId)` → `ic_team` cascade), `tcoHeim` bool, `tcoSaetze`, `gegnerSaetze`, `tcoGames`, `gegnerGames` int.
- `icPartie` `ic_partie`: `saison`, `teamId`, `begegnungId`, `art` text check `('einzel','doppel')`, `position` int (PK alle fünf; FK → `ic_bericht` cascade), `saetze` text[] not null, `aufgabe` text null check `('tco','gegner')`.
- `icSpieler` `ic_spieler`: Schlüssel der Partie + `nr` int (1/2) (PK; FK → `ic_partie` cascade), `stId` int, `name` text, `klassierung` text, `rangliste` int, alle not null.

- [ ] Schema ergänzen, `npm run db:generate`, erzeugte SQL lesen (nur `CREATE TABLE`/Constraints).
- [ ] `npx vitest run src/lib/server/interclub` grün (Migration läuft in den DB-Tests mit).
- [ ] Commit `feat: Tabellen für Interclub-Einzelpartien (#81)`.

### Task 4: Import und Beispieldaten

**Files:** Modify `src/lib/server/interclub/import.ts`, `scripts/beispiel-interclub.ts`; Create `scripts/beispiel-interclub/2026/bericht-<encounterId>.json` (63 Dateien); Test `src/lib/server/interclub/import.db.test.ts`. Generator nur im Scratchpad: `…/scratchpad/pseudonymisiere.py`.

**Interfaces — Consumes:** `pruefeBericht`, `icBericht/icPartie/icSpieler`. **Produces:** Import speichert Berichte; `beispielAbruf()` beantwortet `encounter-results` und `tableau-results` aus `bericht-<id>.json` (Datei mit Inhalt `null` für Auf-/Abstieg bei `encounter-results`; siehe unten).

- [ ] **Beispieldaten erzeugen (Scratchpad-Skript, nicht im Repo):** Für die 63 eigenen Begegnungen der Repo-Dateien `team-results-*.json` (Gruppe: `results` mit «Olten» und Endstand; Auf-/Abstieg: `tableau.results`) die Rohantwort aus `st/b2026/` nehmen; für die 10 Auf-/Abstiegs-Nummern (in `b2026` `null`) `tableau-results` mit 1 s Pause holen. Ersetzen: jedes `members[].name` → erfundener Name + echte Klassierung + echte Rangliste (`"<Vorname> <Nachname> R6 (9497)"`), jedes `members[].id` → `900000 + laufende Nummer`; gleiche echte `id` → gleicher Ersatz, Heim wie Gast; `title` → `"Beispiel"`. Erfundene Namen aus festen Listen (z. B. 40 Vornamen × 40 Nachnamen wie «Muster», «Beispiel», «Platzhalter»), deterministisch. Ablage: `bericht-<id>.json` = Bericht (für Auf-/Abstieg der `tableau-results`-Bericht).
- [ ] **Namensprüfung vor dem Commit:** Skript im Scratchpad sammelt alle echten Namen und Nachnamen (Token ≥ 3 Zeichen) aus `st/b2026` + Tableau-Rohdaten und sucht sie in `scripts/beispiel-interclub/2026/bericht-*.json`; erwartet 0 Treffer; dazu 0 echte `id`s. Ergebnis (nur Zahlen) im Bericht an den PL.
- [ ] `beispielAbruf`: `encounter-results` → für Nummern aus `tableau` des Teams `null`, sonst Datei; `tableau-results` → Datei; Nummer ohne Datei → `null` (Bericht fehlt). Für Tests eine Option `ohneBericht?: number[]` (→ beide Abfragen `null`) und `berichtKaputt?: number[]` (→ `{}`).
- [ ] Tests (`import.db.test.ts`, eigene Test-DB wie bestehend):
  - `importiert Einzelpartien aller eigenen Begegnungen` → Anzahl `ic_bericht` = 63, Partien je Junioren-Begegnung 3, je Aktiven-Begegnung 9 (oder nach Liga aus den Dateien zählen).
  - `Auf-/Abstiegsspiel holt den Bericht über tableau-results` → Bericht zu einer Nummer aus `tableau` vorhanden.
  - `fehlender Bericht: Begegnung bleibt, kein Bericht, Wort ok` (`ohneBericht`).
  - `kaputter Bericht: Wettbewerb 'form', alter Stand inkl. alter Berichte bleibt` (`berichtKaputt`, vorher ein erfolgreicher Import).
  - `Abruf des Berichts scheitert: 'stoerung', alter Stand bleibt`.
  - `speichert nichts vom Gegner` → kein Gegnername der Beispieldatei in `ic_spieler`; Anzahl `ic_spieler` = Summe der TCO-Mitglieder.
  - `zweiter Import ersetzt Berichte` (keine Doppel-Schlüssel).
  - Begegnungen ohne TCO und ungespielte werden nicht abgefragt (Zähler der `holen`-Aufrufe).
- [ ] Rot, dann `import.ts`: nach dem Prüfen der Team-Resultate je eigene gespielte Begegnung abrufen (Gruppe: `encounter-results`; Auf-/Abstieg: `tableau-results`; mit `competition`, `year`, `lang=de`), `pruefeBericht(json, verein)`; `null` → `'form'`, `'fehlt'` → überspringen; Einfügen in derselben Transaktion nach `icTeam`. «Eigen» für Gruppen wie in `ansicht.ts` (Name = Teamname), für Auf-/Abstieg `heim.stTeamId`/`gast.stTeamId` = `teamId`.
- [ ] Grün: `npx vitest run src/lib/server/interclub scripts`; `make seed` lokal läuft durch.
- [ ] Commit (Dateien einzeln, Bericht-Dateien per Liste) `feat: Interclub-Import holt die Einzelpartien (#81)`.

### Task 5: Fachlogik Begegnung

**Files:** Modify `src/lib/server/interclub/ansicht.ts`; Test `src/lib/server/interclub/ansicht.db.test.ts`

**Interfaces — Produces:**
```ts
// IcSpiel bekommt dazu:
begegnungId: number;
export type IcPartie = {
  position: number;
  spieler: { name: string; klassierung: string }[];
  saetze: string[];                       // aus TCO-Sicht
  ergebnis: 'sieg' | 'niederlage' | null; // null = weder w.o. noch Satzmehrheit
  aufgabe: 'tco' | 'gegner' | null;
};
export type IcBegegnung = {
  saison: number; teamId: number; liga: string;
  spiel: IcSpiel;                          // Kopf: Begegnung, Endstand, Datum, Heim/Auswärts
  gegner: string;                          // Teamname der Gegenseite
  saetze: { tco: number; gegner: number } | null;
  partien: { einzel: IcPartie[]; doppel: IcPartie[] } | null;  // null = Bericht fehlt
};
export async function ladeBegegnung(db: Db, teamId: number, begegnungId: number): Promise<IcBegegnung | null>;
```

- [ ] Tests (Beispieldaten über `legeBeispielInterclubAn`):
  - `ladeBegegnung: Einzel und Doppel nach Position` → Einzel 1…n, Doppel 1…m; Spieler nur `{name, klassierung}` (kein `stId`, keine `rangliste` im Objekt).
  - `ergebnis`: `aufgabe: 'gegner'` → `'sieg'`; `'tco'` → `'niederlage'`; sonst Satzmehrheit aus TCO-Sicht; Dreisatz `['6:2','3:6','10:8']` → `'sieg'`.
  - `TCO auswärts` → `spiel.tcoHeim false`, Sätze aus TCO-Sicht.
  - `Begegnung ohne Bericht` → `partien: null`.
  - `fremde Begegnung der Gruppe` (ohne TCO) und unbekannte Nummer → `null`; Begegnung eines anderen Teams unter falscher `teamId` → `null`.
  - Neueste Saison des Teams (wie `ladeTeam`).
  - `ladeTeam`/`ladeUebersicht` liefern `begegnungId` in jedem Spiel.
- [ ] Rot, implementieren, grün; Commit `feat: Begegnung mit Einzelpartien laden (#81)`.

### Task 6: Schnittstelle und Abruf

**Files:** Modify `src/lib/server/interclub/schnittstellen.ts`, `src/lib/server/routen.test.ts`, `src/lib/interclub/api.ts`, `src/lib/interclub/api.test.ts`, `src/lib/server/interclub/schnittstellen.db.test.ts`; Create `src/routes/api/interclub/teams/[id]/begegnungen/[begegnung]/+server.ts`

**Interfaces — Produces:** `getInterclubBegegnung(d, e)` in `INTERCLUB_SCHNITTSTELLEN`; `GET /api/interclub/teams/[id]/begegnungen/[begegnung]` → 200 `IcBegegnung` | 404 `nicht-gefunden` | 401 ohne Sitzung; `holeInterclubBegegnung(teamId: number, begegnungId: number, holen?)`: `Ergebnis<Begegnung>`; `export type Begegnung = Json<IcBegegnung>`, `Partie = Json<IcPartie>`.

- [ ] Tests: Schnittstelle 200 mit Sitzung, 401 ohne, 404 bei unbekannter/ungültiger Nummer (`parseId` beider Parameter); Antwort-JSON enthält keinen Gegnernamen aus der Beispieldatei und kein `stId`/`rangliste`. Routen-Test-Eintrag `'/api/interclub/teams/[id]/begegnungen/[begegnung]': { GET: [getInterclubBegegnung, 'interclub'] }`. `api.test.ts`: Pfad und Wörter wie `holeInterclubTeam`.
- [ ] Rot, implementieren (Route eine Zeile wie `teams/[id]/+server.ts`), grün; Commit `feat: Schnittstelle für eine Interclub-Begegnung (#81)`.

### Task 7: Entwurf, Leitbild, Seite

**Files:** Design-Artifact «MyTCO Interclub» (https://claude.ai/artifact/N4Zs4dk2aYnUiqumh8HB9h); Modify `docs/ui-leitbild.md`, `src/lib/ui/navigation.ts` (+ Test), `src/lib/interclub/Resultat.svelte`, `src/lib/interclub/anzeige.ts` (+ Test), `src/routes/interclub/+page.svelte`, `src/routes/interclub/[id]/+page.svelte`, Datei(en) unter `src/lib/design/`; Create `src/routes/interclub/[id]/[begegnung]/+page.ts`, `+page.svelte`; Test `tests/e2e/interclub.test.ts`

- [ ] **Entwurf zuerst:** Artifact lesen (`action: read`), Bildschirm *Begegnung* ergänzen (Kopf; Karte *Einzel*, Karte *Doppel*; Zeile je Partie: Position, Spieler «Name · R6» (Doppel zweizeilig), Sätze, Plakette gewonnen/verloren grün/rot, «aufgegeben»/«w.o.»; Hinweis «Einzelpartien noch nicht da»; antippbare Resultatzeile in «Spiele» und «Resultate»), mit erfundenen Namen; veröffentlichen; **PL-Abnahme abwarten**.
- [ ] Leitbild: Baustein *Partie* (Zeile) und Seite *Begegnung* nachtragen; antippbare *Resultatzeile* beschreiben.
- [ ] `navigation.ts`: `'/interclub/[id]/[begegnung]'` Bereich `/interclub`, Ebene 2, Zurück `{ route: '/interclub/[id]', text: null }` (wie CM-Unterseiten) — Unit-Test zuerst.
- [ ] Svelte-Doku über MCP holen (`get-documentation`), Seite bauen; erstes Laden in `+page.ts` mit der Wächter-Funktion wie `[id]/+page.ts` (unbekannt → Team-Seite). `Resultat.svelte`: bei eigenem, gespieltem Spiel als Link auf die Begegnung (`resolve('/interclub/[id]/[begegnung]', …)`). Svelte-Autofixer laufen lassen.
- [ ] E2E (Rolle/Beschriftung, `startetVomSymbol` auf Mobil, Brief-Code-Login wie bestehend): von Team-Seite eine Begegnung antippen → Überschrift, Bereiche «Einzel»/«Doppel», ein erfundener Name aus der Beispieldatei sichtbar, Gegnername der Partie nicht sichtbar; Zurück führt zur Team-Seite; Auf-/Abstiegsspiel öffnet sich ebenfalls; axe über `pruefeBildschirm`. `make e2e` im Hintergrund.
- [ ] Bildvergleich App ↔ Entwurf (iPhone und Desktop, Beispieldaten) und dem PL zeigen.
- [ ] Commits `feat: Seite einer Interclub-Begegnung (#81)`, `test: E2E Begegnung (#81)`, `docs: Leitbild Begegnung (#81)`.

### Task 8: Doku, Prüfung, Merge

- [ ] Doku: A-INTERCLUB-01, `docs/fachmodell.md` (Bericht/Partie/Spieler; «ohne Personendaten» weg), Glossar (*Begegnung*, *Einzelpartie*, *w.o.*), arc42 (falls Interclub genannt), Issue #81 Body (DoD «Löschung alter Saisons» streichen; Lösungsrichtung «nur laufende und letzte Saison» ersetzen durch «bleiben über die Saisons»), `docs/beobachtungen.md` Hinweise für Session 3 angleichen. Commit `docs: … (#81)`.
- [ ] `make check` auf dem committeten Stand (im Hintergrund), grün.
- [ ] Review: superpowers-Code-Review + Agent `merge-reviewer`; Befunde abarbeiten.
- [ ] `origin/dev` einmergen, Migrationsnummer prüfen (bei Kollision eigene, nie eingespielte Migration neu erzeugen), erneut `make check`.
- [ ] Merge nach `dev` nach Skill `tco-branching` (Merge-Commit, Version); Aufräumen.
- [ ] Danach im Hauptordner: `mytco` migrieren, `make ic-import JAHR=2026` gegen Swiss Tennis; Nachweis als Zahlen (Berichte, Partien, Spieler; 0 Gegnerangaben), kein Screenshot mit echten Namen. Dem PL anbieten: `make ic-import` für 2021–2025.
- [ ] Kommentar an #81 mit Stand.
