# Interclub: regelmässiger Abruf — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die App holt die Interclub-Daten der TCO-Teams selbst von Swiss Tennis: stündlich in Spielwochen, sonst täglich, nur Neues, fehlende Saisons ab 2021 einzeln nach.

**Architecture:** Ein zweiter Takt im Zeitgeber der App (ADR-008) ruft jede Stunde `fuehreAbrufAus`. Die reine Funktion `istFaellig` wählt aus den gemerkten Versuchen (neue Tabelle `ic_abruf`) die fälligen Paare aus Saison und Wettbewerb; `importiereSaison` holt sie mit Zeitgrenze und behält gespeicherte Spielberichte. Eingeschaltet nur mit `IC_ABRUF=an` (Test, Live).

**Tech Stack:** SvelteKit, TypeScript, Drizzle/PostgreSQL, Vitest (Einheit + DB), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-22-interclub-abruf-design.md`

## Global Constraints

- Worktree `/Users/KN/CAS/projekte/tco-app/.claude/worktrees/issue-081`, Branch `feat/issue-081-abruf`. Kein `EnterWorktree`; Pfade absolut oder `(cd <worktree> && …)`. Git-Befehle einzeln, Commit-Texte per Datei (`git commit -F`). Dateien einzeln stagen, nie `git add -A`/`.`.
- Bauregeln der `CLAUDE.md` gelten: Zeit über `jetzt`; kein Aufruf `fetch(…)` unter `src/` (der Server bekommt `holen` aus `dienste.ts`); Dienste nur in `src/lib/server/dienste.ts`; Logs nur feste Texte; Migrationen nur hinzufügen (`npm run db:generate`, nie eine bestehende ändern); Fachfunktionen kennen kein HTTP.
- Jede Verhaltensänderung beginnt mit einem roten Test. DB-Tests gegen die echte Datenbank, nur eigene Saisons (≥ 2070) benutzen und aufräumen.
- Feste Werte: Zeitgrenze **15 000 ms** je Abfrage; Stundentakt **3 600 000 ms**, erster Schlag **2 Minuten** nach dem Start; Nacht **23:00–07:00 Zürich** ohne Lauf; «frisch» = Datum von heute bis **7 Tage** zurück; Tageslauf und Nachholen frühestens **24 h** nach dem letzten Versuch; Nachholen ab Saison **2021**, **höchstens ein Paar pro Tag**; Sperrschloss-Nummer **4303**.
- Feste Log-Texte: `Interclub-Abruf gestört`, `Interclub-Abruf: Form unerwartet`, `Interclub-Abruf fehlgeschlagen` (Zeitgeber fängt einen Wurf).
- Lokal, im E2E und in allen Tests läuft der Abruf nie von selbst (DS-08); nur `IC_ABRUF=an` schaltet ihn ein.
- Texte in der Oberfläche nur nach `docs/ui-leitbild.md`; neue Zustände eines Bausteins erst dort beschreiben.
- Prüfläufe (`make check`, `make e2e`) nie gleichzeitig; im Hintergrund starten.

## Review Focus

1. **Neustart mitten in der Spielwoche:** Die App startet um 10:05, der letzte Stundenversuch war 09:30 → kein Lauf vor 10:30 (Test in Task 3).
2. **Swiss Tennis hängt:** `holen` antwortet nie → der Lauf endet nach der Zeitgrenze mit `stoerung`, der alte Stand bleibt, der nächste Schlag läuft wieder (Task 2, Task 4).
3. **Gespeicherter Bericht verschwindet nicht:** Zweiter Abruf, Swiss Tennis gibt für eine schon gespeicherte Begegnung jetzt `null` → Bericht, Partien und Spieler bleiben (Task 2).
4. **Saison 2027 vor der Freigabe:** `club-teams` antwortet mit dem 404-Fehler → Übersicht zeigt weiter 2026, Versuch `keine-teams` gemerkt, nächster Versuch erst nach 24 h (Task 3, Task 4).
5. **Schlag überlappt:** Ein Lauf dauert länger als eine Stunde → der nächste Schlag startet keinen zweiten (Task 4).

---

### Task 1: Zeitgeber mit mehreren Takten

**Files:**
- Modify: `src/lib/server/zeitgeber.ts`
- Test: `src/lib/server/zeitgeber.test.ts`

**Interfaces:**
- Produces: `export type ZeitgeberArt = { name: string; fehler: string }`; `export const LOESCHLAUF: ZeitgeberArt = { name: 'loeschlauf', fehler: 'Löschlauf fehlgeschlagen' }`; `export const STUNDE: number`; `starteZeitgeber(lauf, takt?, art: ZeitgeberArt = LOESCHLAUF): () => void`. Merker je Art: `Symbol.for('mytco.zeitgeber.' + art.name)`.

- [ ] **Step 1: Failing tests** in `zeitgeber.test.ts` (bestehende bleiben unverändert grün):
  - `'zwei Arten laufen nebeneinander, je mit eigenem Takt'`: `starteZeitgeber(a, {start:10, abstand:100})` und `starteZeitgeber(b, {start:20, abstand:50}, {name:'test', fehler:'Test fehlgeschlagen'})`; nach 120 ms `a` 2×, `b` 3×.
  - `'ein Wurf loggt den festen Text der Art'`: `b` wirft `new Error('geheim')` → `console.error` mit `'Test fehlgeschlagen'`, nie mit `'geheim'`.
  - `'der Stopp einer Art beendet die andere nicht'`.
- [ ] **Step 2:** `npx vitest run src/lib/server/zeitgeber.test.ts` → die neuen Tests FAIL.
- [ ] **Step 3:** Implementieren wie in Interfaces; der Kommentar im `catch` nennt den Text der Art statt «Löschlauf».
- [ ] **Step 4:** Test-Befehl → PASS (alle).
- [ ] **Step 5:** Commit `refactor: Zeitgeber trägt mehrere Takte (je Art ein Merker)`.

### Task 2: Import mit Zeitgrenze, Auswahl und gespeicherten Berichten

**Files:**
- Modify: `src/lib/server/interclub/import.ts`, `src/lib/server/interclub/swiss-tennis.ts` (`pruefeBericht`), `scripts/ic-import.ts`
- Test: `src/lib/server/interclub/import.db.test.ts`, `src/lib/server/interclub/import-bericht.db.test.ts`, `src/lib/server/interclub/swiss-tennis-bericht.test.ts`

**Interfaces:**
- Produces:
  - `ImportDienste.holen: (url: string, init?: { signal?: AbortSignal }) => Promise<Response>`; neu optional `ImportDienste.zeitgrenze?: number` (Vorgabe `ZEITGRENZE = 15_000`, exportiert).
  - `export type Berichte = 'alle' | 'fehlende' | 'frische'`.
  - `importiereSaison(d, jahr, verein, o?: { nur?: Wettbewerb; berichte?: Berichte }): Promise<Partial<Record<Wettbewerb, ImportWort>>>`. Ohne `o`: alle Wettbewerbe, `berichte: 'alle'` (heutiges Verhalten, `make ic-import`). Mit `nur`: nur dieser Schlüssel im Ergebnis.
  - `berichte`: `'alle'` holt jeden Bericht gespielter eigener Begegnungen; `'fehlende'` nur die ohne gespeicherten Bericht; `'frische'` nur die ohne gespeicherten Bericht mit Datum ≥ heute − 7 Tage (Zürich, aus `d.jetzt()`).
  - Gespeicherte Berichte (samt `ic_partie`, `ic_spieler`) von Begegnungen, die im neuen Stand noch vorkommen und nicht neu geholt wurden, werden in derselben Transaktion vor dem Löschen gelesen und danach wieder eingefügt. Gilt in allen drei Modi (bei `'alle'` ersetzt ein neu geholter Bericht den alten; liefert Swiss Tennis jetzt `null`, bleibt der alte).
  - Die Schreib-Transaktion nimmt zuerst `pg_advisory_xact_lock(4303)` (wartet).
- [ ] **Step 1: Failing tests:**
  - `swiss-tennis-bericht.test.ts` → `'doppelte Position im selben Bericht gibt null (form)'`: zwei Einzel mit `position` 1 → `pruefeBericht(...) === null`.
  - `import.db.test.ts` → `'Zeitgrenze: holen antwortet nie → stoerung, alter Stand bleibt'`: erst Import mit `beispielAbruf()`, dann mit `holen = (_u, i) => new Promise((_, nein) => i?.signal?.addEventListener('abort', () => nein(new Error('abbruch'))))` und `zeitgrenze: 20` → Ergebnis `{ ic: 'stoerung', jic: 'stoerung' }`, `zaehle(saison)` unverändert.
  - `import.db.test.ts` → `'nur: holt nur den genannten Wettbewerb'`: zählt URLs mit `competition=jic` → 0; Ergebnis hat nur `ic`.
  - `import-bericht.db.test.ts` → `'fehlende: zweiter Abruf holt keinen gespeicherten Bericht neu'`: Abfragen an `encounter-results`/`tableau-results` beim zweiten Lauf = 0, Zahl der `ic_partie`/`ic_spieler` gleich.
  - `import-bericht.db.test.ts` → `'fehlende: Bericht, der beim ersten Mal fehlte, kommt beim zweiten'` (erster Lauf mit `ohneBericht: [id]`).
  - `import-bericht.db.test.ts` → `'alle: Swiss Tennis gibt null für einen gespeicherten Bericht → er bleibt'`.
  - `import-bericht.db.test.ts` → `'frische: fragt nur Begegnungen der letzten 7 Tage ohne Bericht an'` (`jetzt` 3 Tage nach einem Spieltag der Beispieldaten; ältere fehlende werden nicht angefragt).
- [ ] **Step 2:** `npx vitest run src/lib/server/interclub` (mit laufender DB, `make db`) → neue Tests FAIL.
- [ ] **Step 3:** Implementieren. `abrufen` reicht `{ signal: AbortSignal.timeout(d.zeitgrenze ?? ZEITGRENZE) }` an `d.holen`. `pruefeBericht` prüft Eindeutigkeit von (`art`, `position`). `scripts/ic-import.ts` übergibt `holen: (u, i) => fetch(u, i)` (Skript, nicht unter `src/`).
- [ ] **Step 4:** Test-Befehl → PASS (alle bisherigen Interclub-Tests eingeschlossen).
- [ ] **Step 5:** Commit `feat: Interclub-Import mit Zeitgrenze, nur fehlenden Berichten und Sperrschloss (#81)`.

### Task 3: `istFaellig` — wer ist dran

**Files:**
- Create: `src/lib/server/interclub/faellig.ts`
- Test: `src/lib/server/interclub/faellig.test.ts`

**Interfaces:**
- Consumes: `Wettbewerb`, `WETTBEWERBE` aus `swiss-tennis.ts`; `ImportWort` und `Berichte` aus `import.ts`.
- Produces:
  ```ts
  export type Paar = { saison: number; wettbewerb: Wettbewerb };
  export type Versuch = Paar & { versuchtAm: Date; wort: ImportWort };
  export type Lage = {
    jetzt: Date;
    versuche: Versuch[];      // letzter Versuch je Paar (Tabelle ic_abruf)
    vorhanden: Paar[];        // Paare mit Eintrag in ic_stand (Import gelungen, auch von Hand)
    frisch: Wettbewerb[];     // laufende Saison: Wettbewerbe mit eigenem Spiel von heute bis 7 Tage zurück, ohne Resultat oder ohne Bericht
    ab?: number;              // erste Saison zum Nachholen, Vorgabe ERSTE_SAISON (Tests setzen sie höher)
  };
  export type Auftrag = Paar & { berichte: Berichte };
  export const ERSTE_SAISON = 2021;
  export function istFaellig(l: Lage): Auftrag[];
  ```
- Regeln (Reihenfolge der Ausgabe: laufende Saison `ic`, `jic`, dann Nachholen):
  - Stunde in Zürich ≥ 23 oder < 7 → `[]`.
  - Laufende Saison = Jahr von `jetzt` in Zürich. Je Wettbewerb: in `frisch` → fällig, wenn kein Versuch oder letzter ≥ 55 Minuten her, mit `berichte: 'frische'`; sonst fällig, wenn kein Versuch oder letzter ≥ 24 h her, mit `berichte: 'fehlende'`.
  - Nachholen: Kandidaten = Paare mit Saison `ERSTE_SAISON` … Vorjahr, nicht in `vorhanden`, letzter Versuch nicht `ok` und nicht `keine-teams`. Hat ein Paar der Vorjahre einen Versuch < 24 h her → kein Nachholen. Sonst genau ein Kandidat mit `berichte: 'fehlende'`: zuerst nie versuchte (Saison aufsteigend, `ic` vor `jic`), dann der mit dem ältesten `versuchtAm`.
- [ ] **Step 1: Failing tests** (Zeiten in UTC, Zürich = UTC+2 im Sommer, UTC+1 im Winter):
  - `'Spielwoche: ic frisch, letzter Versuch 60 min her → ic mit frische'`.
  - `'Neustart: letzter Versuch 35 min her → nichts für ic'` (Review Focus 1).
  - `'ruhige Woche: ic nicht frisch, letzter Versuch 3 h her → nichts; 25 h her → ic mit fehlende'`.
  - `'noch nicht freigeschaltet: letzter Versuch keine-teams vor 2 h → nichts'` (Review Focus 4).
  - `'nur ic läuft: jic mit keine-teams vor 25 h → jic täglich, ic stündlich'`.
  - `'Nacht: 23:30 Zürich → leer, 06:59 → leer, 07:00 → nicht leer'`.
  - `'Nachholen: leere Datenbank im Mai 2027 → ein Auftrag 2021 ic'`.
  - `'Nachholen: 2021 ic mit form vor 30 h, 2021 jic nie versucht → 2021 jic'` (nie versucht zuerst).
  - `'Nachholen: alle versucht, keiner ok → der mit dem ältesten Versuch'` (keine Blockade).
  - `'Nachholen: keine-teams ist endgültig, vorhanden zählt als erledigt'`.
  - `'Nachholen: ein Versuch der Vorjahre vor 3 h → kein Nachholen'`.
- [ ] **Step 2:** `npx vitest run src/lib/server/interclub/faellig.test.ts` → FAIL.
- [ ] **Step 3:** Implementieren (Zürich-Zeit über die vorhandene Hilfe `utcZuZuerich` aus `src/lib/anlass/zeit.ts`).
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: Interclub-Abruf entscheidet, welche Saison fällig ist (#81)`.

### Task 4: Versuche merken und Abruf ausführen

**Files:**
- Modify: `src/lib/server/db/schema.ts` (Tabelle `icAbruf`), neue Migration unter `drizzle/` (über `npm run db:generate`)
- Create: `src/lib/server/interclub/abruf.ts`
- Test: `src/lib/server/interclub/abruf.db.test.ts`

**Interfaces:**
- Consumes: `istFaellig`, `Lage`, `Auftrag` (Task 3); `importiereSaison`, `ImportDienste` (Task 2).
- Produces:
  - Tabelle `ic_abruf`: `saison integer`, `wettbewerb text` (Check `ic`/`jic`), `versucht_am timestamptz`, `wort text` (Check `ok`, `keine-teams`, `form`, `stoerung`), Primärschlüssel (`saison`, `wettbewerb`). Kein Fremdschlüssel auf `ic_team` (Versuche gibt es auch ohne Teams).
  - `export async function ladeLage(db: Db, jetzt: Date): Promise<Lage>` (`frisch`: eigene Begegnungen bzw. Entscheide der laufenden Saison, eigen = Heim- oder Gastname gleich `ic_team.team_name` bzw. `heim_id`/`gast_id` gleich `team_id`, wie in `ansicht.ts`).
  - `export async function fuehreAbrufAus(d: ImportDienste, verein: number): Promise<void>`: Wird gerade ein Lauf ausgeführt (Merker im Modul), sofort zurück. Sonst `istFaellig(await ladeLage(d.db, d.jetzt()))`, je Auftrag `importiereSaison(d, saison, verein, { nur, berichte })`, danach Upsert in `ic_abruf` mit `versuchtAm = d.jetzt()` und Wort (auch bei `stoerung`/`form`). Bei `stoerung` `console.error('Interclub-Abruf gestört')`, bei `form` `console.error('Interclub-Abruf: Form unerwartet')`. Wirft nie über Störungen hinaus; Merker im `finally` zurücksetzen.
- [ ] **Step 1: Failing tests** (`abruf.db.test.ts`, Saisons 2080–2089, `jetzt` als Mittwoch 10:00 Zürich; Vereinsnummer 2202, `beispielAbruf`):
  - `'leere Datenbank: holt die laufende Saison und genau ein Paar zum Nachholen'` → `ic_abruf` hat die Paare (Jahr, ic), (Jahr, jic) und eines der Vorjahre; Wörter `ok`.
  - `'zweiter Lauf 10 min später holt nichts'` → `holen` nicht aufgerufen (Review Focus 1, durch die DB).
  - `'Störung: Versuch mit stoerung gemerkt, Log fester Text, alter Stand bleibt'` (Review Focus 2).
  - `'keine-teams gemerkt; Übersicht zeigt weiter die Vorjahressaison'` (`ladeUebersicht`, Review Focus 4).
  - `'überlappender Schlag startet keinen zweiten Lauf'`: erster Lauf hängt an einer Promise, zweiter Aufruf kehrt sofort zurück, `holen`-Zähler bleibt (Review Focus 5).
  - `'ladeLage: Spiel von gestern ohne Bericht → ic frisch; Spiel vor 8 Tagen ohne Resultat → nicht frisch'`.
  Damit die Tests nur ihre Saisons sehen: `jetzt` im Jahr 2085 und `fuehreAbrufAus(d, verein, { ab: 2083 })`; `ladeLage(db, jetzt, ab?)` legt `ab` in die `Lage`. Signatur damit: `fuehreAbrufAus(d: ImportDienste, verein: number, o?: { ab?: number }): Promise<void>`.
- [ ] **Step 2:** Schema ergänzen, `npm run db:generate`, Migration prüfen (nur `CREATE TABLE`), `make db` + Tests → FAIL.
- [ ] **Step 3:** `abruf.ts` implementieren.
- [ ] **Step 4:** `npx vitest run src/lib/server/interclub` → PASS.
- [ ] **Step 5:** Commit `feat: Interclub-Abruf merkt jeden Versuch und holt nur Fälliges (#81)`.

### Task 5: Einschalten auf Test und Live

**Files:**
- Modify: `src/lib/server/einstellungen.ts`, `src/lib/server/dienste.ts`, `src/hooks.server.ts`, `betrieb/compose.umgebung.yml`, `.env.example`
- Test: `src/lib/server/einstellungen.test.ts`

**Interfaces:**
- Consumes: `fuehreAbrufAus` (Task 4), `starteZeitgeber`, `STUNDE` (Task 1).
- Produces:
  - `Einstellungen.icAbruf: { verein: number } | undefined` — gesetzt nur bei `IC_ABRUF === 'an'`; `verein` aus `IC_VEREIN` (positive Ganzzahl), Vorgabe 2202; ungültige Nummer → Start bricht ab wie bei anderen Einstellungen.
  - `dienste.ts`: `export function holeInterclubAbruf(): { dienste: ImportDienste; verein: number } | null` — `null` ohne `icAbruf`; `holen: fetch.bind(globalThis)`, `jetzt: () => new Date()`, `pause` 1500 ms.
  - Hook `init`: nach dem Löschlauf, nur ohne `ZEITGEBER=aus`: `const ic = holeInterclubAbruf(); if (ic) starteZeitgeber(() => fuehreAbrufAus(ic.dienste, ic.verein), { start: 2 * 60_000, abstand: STUNDE }, { name: 'interclub', fehler: 'Interclub-Abruf fehlgeschlagen' })`.
  - `compose.umgebung.yml`: `IC_ABRUF: 'an'` und `IC_VEREIN: ${IC_VEREIN:-2202}` beim App-Dienst, mit Kommentar (DS-08: nur Test und Live).
  - `.env.example`: `# IC_ABRUF=an` mit dem Hinweis, dass er lokal aus bleibt (DS-08).
- [ ] **Step 1: Failing tests** (`einstellungen.test.ts`): `'ohne IC_ABRUF ist der Abruf aus'`, `'IC_ABRUF=an ohne IC_VEREIN → verein 2202'`, `'IC_ABRUF=an mit IC_VEREIN=abc wirft'`, `'IC_ABRUF=ja schaltet nicht ein'`.
- [ ] **Step 2:** → FAIL. **Step 3:** implementieren. **Step 4:** → PASS; `npm run lint` grün (Importrichtung, `fetch`-Regel).
- [ ] **Step 5:** Commit `feat: Interclub-Abruf nur mit IC_ABRUF=an, auf Test und Live eingeschaltet (#81)`.

### Task 6: Übersicht — vergangenes Spiel ohne Resultat, Doppelte, «abgeschlossen»

**Files:**
- Modify: `src/lib/server/interclub/ansicht.ts` (`ladeUebersicht`), `src/lib/interclub/Resultat.svelte`, `src/routes/interclub/+page.svelte`, `docs/ui-leitbild.md` (Resultatzeile: Zustand «Resultat folgt»)
- Test: `src/lib/server/interclub/ansicht.db.test.ts`

**Interfaces:**
- Produces (Verhalten von `ladeUebersicht`, Typen unverändert):
  - `letzte`: eigene Spiele mit Datum in [heute − 6, heute] und Resultat, **plus** eigene mit Datum in [heute − 6, heute − 1] ohne Resultat.
  - Je `begegnungId` nur ein Eintrag in `letzte` und `naechste` (zwei TCO-Teams gegeneinander).
  - `abgeschlossen`: eigene nicht leer, alle eigenen Spiele mit Datum < heute − 6 (ein nie gekommenes Resultat hält die Saison nicht offen).
  - `Resultat.svelte`: neue Eigenschaft `folgt?: boolean`; ungespielt und `folgt` → rechts `<span class="leise">Resultat folgt</span>`. Die Seite setzt `folgt` in «Letzte Resultate».
- [ ] **Step 1: Failing DB-Tests:** `'vergangenes Spiel ohne Resultat steht in letzte'`, `'zwei TCO-Teams gegeneinander: Begegnung einmal in letzte'`, `'Spiel vor 10 Tagen ohne Resultat: Saison gilt als abgeschlossen'`.
- [ ] **Step 2:** → FAIL. **Step 3:** Leitbild-Zeile zuerst, dann Code. **Step 4:** → PASS; `npx svelte-check` ohne Fehler.
- [ ] **Step 5:** Commit `fix: Interclub-Übersicht mit «Resultat folgt» und ohne doppelte Begegnungen (#81)`.

### Task 7: Begegnung — «noch nicht da» oder «keine Einzelpartien»

**Files:**
- Modify: `src/lib/server/interclub/ansicht.ts` (`ladeBegegnung`, Typ `IcBegegnung`), `src/lib/server/interclub/schnittstellen.ts` (reicht `jetzt(d)` weiter), `src/lib/interclub/api.ts` (Typ), `src/routes/interclub/[id]/[begegnung]/+page.svelte`, `docs/ui-leitbild.md`
- Test: `src/lib/server/interclub/begegnung.db.test.ts`, `src/lib/server/interclub/schnittstellen.db.test.ts`

**Interfaces:**
- Produces: `ladeBegegnung(db, teamId, begegnungId, jetzt: Date)`; `IcBegegnung.ohneBericht: 'noch' | 'keiner' | null` — `null` mit Bericht; `'keiner'`, wenn kein Bericht und Datum < heute − 7 (Zürich); sonst `'noch'`.
  - Seite: `'noch'` → «Einzelpartien noch nicht da.»; `'keiner'` → «Swiss Tennis hat für diese Begegnung keine Einzelpartien.» (Wortlaut ins Leitbild).
  - Leertext «Nicht gespielt: Die Begegnung war nach den Einzeln entschieden.» nur im Reiter *Doppel*; im Reiter *Einzel* ohne Partie «Keine Einzel gemeldet.».
- [ ] **Step 1: Failing DB-Tests:** `'ohne Bericht, 3 Tage her → noch'`, `'ohne Bericht, 9 Tage her → keiner'`, `'mit Bericht → null'`.
- [ ] **Step 2:** → FAIL. **Step 3:** implementieren. **Step 4:** → PASS; `npx svelte-check`.
- [ ] **Step 5:** Commit `fix: Interclub-Begegnung unterscheidet «noch nicht da» und «keine Einzelpartien» (#81)`.

### Task 8: Doku und Abschluss

**Files:**
- Modify: `docs/datenschutz.md` (DS-08 + Änderungsprotokoll), `docs/adr/adr-008-zeitgeber-in-der-app.md` (Nachtrag: zwei Takte), `docs/adr/adr-011-interclub-schnittstelle-swiss-tennis.md` (Konsequenzen: Takt, nur Neues, Zeitgrenze), arc42-Kapitel mit Laufzeit/Verteilung (Abruf im Zeitgeber, `IC_ABRUF`), `docs/betrieb-und-uebergabe.md` (Test holt Saisons selbst, eine alte pro Tag), `docs/testkonzept.md` (Release-Checkliste: «Stand: …» auf Test jünger als ein Tag), `docs/versionen.md` (unter «Unveröffentlicht»)
- DS-08 Zusatz wörtlich: «Auf Test, hinter dem Test-Passwort, stehen die echten Interclub-Daten von Swiss Tennis, wie auf mytennis.ch öffentlich (Entscheid Projektleiter, 22.11.2026). Screenshots fürs Repo und für Issues zeigen davon nur Teams, Endstände und Tabellen, nie Einzelpartien mit Namen.»
- `versionen.md`-Eintrag: «Interclub: Die Resultate aktualisieren sich von selbst, in Spielwochen stündlich; ältere Saisons ab 2021 kommen nach. Übersicht zeigt «Resultat folgt», die Begegnung sagt, wenn Swiss Tennis keine Einzelpartien hat (#81).»
- [ ] **Step 1:** Doku schreiben, `make docs` → «Doku-Check ok», `annahmen: ok`.
- [ ] **Step 2:** Commit `docs: Interclub-Abruf in Datenschutz, ADR-008/011, arc42, Betrieb und Testkonzept (#81)`.
- [ ] **Step 3:** `make check` im Hintergrund auf dem committeten Stand → grün (Zahlen der Tests notieren).
- [ ] **Step 4:** Agent `merge-reviewer` und superpowers-Code-Review über den Branch; Befunde klären.
- [ ] **Step 5 (nach Merge nach `dev` und Auslieferung auf Test, ~13 Min.):** Auf Test prüfen: «Stand: …» der Übersicht jünger als 2 h; nach Tagen die älteren Saisons in `ic_stand` (per Skript im Container, `reference_skript_auf_test`). Screenshot der Übersicht (nur Teams und Endstände) für den Abschlusskommentar in #81.
