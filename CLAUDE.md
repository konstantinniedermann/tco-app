# MyTCO — Projektkontext für Claude Code

> Für alle Aktionen → `make help`. Worum es geht → `README.md`, Etappen → `docs/roadmap.md`.

## Code — Dauerregeln

- Vor Svelte- oder SvelteKit-Code die aktuelle Doku holen: über den Svelte-MCP-Server
  (`.mcp.json`), ohne ihn über svelte.dev/llms.txt; nie aus dem Gedächtnis.
- Unter `src/routes` keine Server-Dateien ausser `+server.ts`; keine Form Actions,
  keine Remote Functions (Bauregel → ADR-002).
- Oberfläche nur aus den Tokens und Bausteinen von `docs/ui-leitbild.md`; was dort fehlt,
  kommt erst ins Leitbild, dann in den Code.

## Server — Bauregeln

- Eine Route (`+server.ts`) ruft genau eine Schnittstellen-Funktion auf und reicht ihr die
  Dienste. Nie Datenbank, Fachlogik oder Rechteprüfung in der Route.
- Rechte prüft nur der Server. Jede Schnittstelle der Verwaltung läuft über `liest` oder
  `schreibt` und steht in einer der Schnittstellen-Listen; unter `api/admin/` gibt es keine
  Schnittstelle ausserhalb der Listen.
- Fachfunktionen kennen kein HTTP: Sie bekommen Datenbank und Zeit hineingereicht und geben ein
  Ergebnis-Wort zurück. Statuscode und Antwort bauen nur Schnittstellen-Dateien, ihre Antwort-Hilfen, die
  Rechteprüfung und der Riegel der Ansicht, mit den Bausteinen aus `src/lib/server/http.ts`
  (ausser Datei-Antworten wie die Kalender-Datei); nie eine Fachfunktion.
- Die Zeit kommt über die Dienste (`jetzt`), nie direkt aus `new Date()`.
- Schreibende Schnittstellen nehmen nur JSON an.
- Logs enthalten nur feste Texte: nie Fehlermeldungen, Eingaben, Adressen oder Codes.
- Migrationen fügen nur hinzu. Eine schon eingespielte Migration wird nie neu erzeugt; eine
  Änderung kommt als neue Migration.

## Oberfläche — Bauregeln

- Seiten sprechen mit dem Server nur über die Abruf-Module ihres Themas (`src/lib/<thema>/`),
  nie mit eigenem `fetch` im Baustein.
- Ausblenden ist kein Schutz: Was die Oberfläche nicht zeigt, weist der Server trotzdem ab.
- Stile stehen nur unter `src/lib/design/`; kein `<style>` in Bausteinen.

## Tests

- Jede Änderung am Verhalten beginnt mit einem Test, der vorher rot war.
- Tests prüfen Verhalten: Kein Test liest Quelltext der App, kein Schnappschuss-Vergleich. Die
  Struktur prüfen nur ESLint und die Prüfskripte unter `scripts/`.
- Fachlogik läuft im Test gegen die echte Datenbank; Attrappen nur für Mail, Push, Uhr und Abruf.
- E2E nur über `make e2e` bzw. `npm run e2e`. Elemente über Rolle und Beschriftung suchen, nicht
  über CSS-Klassen; keine festen Wartezeiten.
- Eine neue Schnittstelle kommt in die Liste ihres Moduls. Eine neue Liste der Verwaltung kommt
  in `tests/hilfen/verwaltungs-listen.ts` und in die Tabelle der Bauregel; eine neue Liste der
  Mitglieder in Grundprüfung und Routen-Test.
- Nie zwei Builds oder Prüfläufe (`make check`, `make e2e`, `npm run build`) gleichzeitig im
  selben Ordner.

## Mitgliederdaten — Dauerverbote

- Nie echte Mitgliederdaten (Namen, Adressen, Geburtsdaten, Lizenznummern, Kontaktdaten)
  in Repo, Tests, Fixtures, Seed-Daten, Issues, Logs oder Screenshots. Testdaten zu Personen
  sind erfunden.
- Nie Exporte aus Fairgate, Swiss Tennis oder Vereinslisten ins Repo kopieren. Echte
  Vereinsunterlagen liegen nur im gitignorierten Ordner `intern/`. Ausgenommen sind öffentliche
  Daten ohne Personennamen (z. B. Interclub-Resultate der Teams); sie dürfen 1:1 in Tests und Seed.
- Personen aus dem Verein werden in Doku und Issues mit ihrer Rolle benannt, nicht mit
  Namen. Ausnahme: das Original-Anforderungsdokument unter `docs/anforderungen/`.
- Nie eine Funktion planen oder bauen, die Personendaten bearbeitet, ohne sie gegen
  `docs/datenschutz.md` zu prüfen. Was dort nicht steht, wird erst ins Konzept und die
  Datenschutzerklärung aufgenommen, dann gebaut; die Vorgaben `DS-NN` sind verbindlich.

## Branches — Dauerverbote

- **Nie direkt auf `main` pushen.** Der Weg auf `main` ist immer ein PR aus `dev`
  (lokal erzwungen durch `.githooks/pre-push`, aktiviert mit `make hooks`), und nur mit
  ausdrücklicher Freigabe des Projektleiters für genau dieses Release.
- **Nie Squash** beim Merge nach `dev` oder `main` — immer Merge-Commit.
- **Nie `git reset --hard` auf `dev`.**
- **Feature-Branches zweigen ab `origin/dev` ab.**
- **Nie `git add -A` oder `git add .`** — Dateien einzeln stagen.
- **Im Hauptordner nie einen Feature-Branch auschecken.** Er bleibt auf `dev` und dient nur
  Merges und Releases. Jede Session arbeitet an ihrem Issue in einem eigenen Worktree unter
  `.claude/worktrees/` — Ablauf (Start, Merge, Release, Aufräumen) → Skill `tco-branching`.

## Issue-Konventionen

Labels, Milestones und Definition of Done → `docs/issue-konventionen.md`; die Struktur
beim Anlegen gibt `.github/ISSUE_TEMPLATE/` vor.

## Context-Scopes

Welche Pfade bei welcher Aufgabe zu laden sind → `docs/context-scopes.md`.

## Übergangsregeln während des Refactorings

Plan, Stand und Entscheide → `docs/refactoring-analyse.md`. Dieser Block entfällt mit dem
Abschluss des Plans.

- **Feature-Stopp:** keine neue Funktion, keine Verhaltensänderung ausser der im Plan-Schritt
  beschriebenen. Geht ein Schritt nicht auf: abbrechen und melden, keinen Umweg bauen.
- Ausnahme vom Feature-Stopp: #81 (E-47).
- **Ein Schritt, ein Worktree, ein Branch** `refactor/schritt-NN` ab `origin/dev`; Schritte
  strikt nacheinander.
- **Nach jedem Schritt der volle `make check`** auf dem committeten Stand, auch wenn nur ein
  Ordner betroffen scheint.
- **Die Orchestrator-Session bleibt im Hauptordner** und arbeitet mit absoluten Pfaden; sie
  wechselt nicht mit `EnterWorktree` in einen Worktree, solange Subagenten laufen.
- Den Stand eines Schritts führt nur `docs/refactoring-analyse.md`.
- Ab Schritt 06: Antwort, JSON-Prüfung, Körper lesen und die Standardantworten kommen nur aus
  `src/lib/server/http.ts`; kein Themen-Modul definiert sie selbst.
- Ab Schritt 06a: `liest` und `schreibt` kommen nur aus `src/lib/server/admin/rechte.ts`; keine
  neue Schnittstelle prüft Rollen selbst (`zugang.pruefe`). Typen, die ein anderes Modul braucht,
  stehen nicht in einer `schnittstellen.ts`.
- Ab Schritt 07: Im Server (unter `src/`, ohne Tests) entstehen Dienste, Mail- und
  Push-Versender nur in `src/lib/server/dienste.ts`; Skripte und Tests bauen ihre eigenen. Kein
  Modul unter `src/lib/server/` importiert diese Datei.
- Ab Schritt 08: eine Fehlerform `{ fehler, felder? }`; Zusatzangaben nur, wo `src/lib/fehler.ts`
  sie für ein Wort nennt. Fehlerwörter nur aus dieser Liste, die Server und Oberfläche teilen.
- Die Importrichtung zwischen den Server-Modulen setzt ESLint ohne Ausnahme durch; eine Ausnahme
  in `AUSNAHMEN` (`eslint.config.js`) nur mit Entscheid des Projektleiters.
- Ab Schritt 13: Statuscodes deutet nur der Abruf-Baustein (`src/lib/abruf.ts`); ein einzelner
  Abruf gibt `{ art }` zurück. Abläufe aus mehreren Anfragen (Passkey, Push auf dem Gerät) und
  Lade-Hilfen («Daten oder `null`», Wahrheitswert) dürfen eine andere Form haben.
- Ab Schritt 15: Fehlende Sitzung, Rolle oder Bestätigung behandelt nur die gemeinsame
  Wächter-Funktion, in der Ladefunktion und nach einer Aktion; keine Seite schreibt die Umleitung
  zum Login selbst, keine Ladefunktion ruft `fetch` direkt. Das erste Laden einer Seite steht in
  `+page.ts`; im Baustein nur erneutes Laden nach Eingabe oder Aktion.
- Ab Schritt 17: Eine Aktion mit Rückfrage nutzt `Aktionsdialog` oder die gemeinsame
  Ablauf-Funktion; keine neue Sperre und Antwort-Verzweigung von Hand.
- Ab Schritt 18: Stile in den Dateien unter `src/lib/design/` in ihrer festen Reihenfolge;
  neue Regeln kommen in die Datei ihres Bausteins.
