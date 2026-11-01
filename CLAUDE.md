# MyTCO — Projektkontext für Claude Code

> Für alle Aktionen → `make help`. Worum es geht → `README.md`, Etappen → `docs/roadmap.md`.

## Code — Dauerregeln

- Vor Svelte- oder SvelteKit-Code die aktuelle Doku holen: über den Svelte-MCP-Server
  (`.mcp.json`), ohne ihn über svelte.dev/llms.txt; nie aus dem Gedächtnis.
- Unter `src/routes` keine Server-Dateien ausser `+server.ts`; keine Form Actions,
  keine Remote Functions (Bauregel → ADR-002).

## Mitgliederdaten — Dauerverbote

- Nie echte Mitgliederdaten (Namen, Adressen, Geburtsdaten, Lizenznummern, Kontaktdaten)
  in Repo, Tests, Fixtures, Seed-Daten, Issues, Logs oder Screenshots. Testdaten sind erfunden.
- Nie Exporte aus Fairgate, Swiss Tennis oder Vereinslisten ins Repo kopieren. Echte
  Vereinsunterlagen liegen nur im gitignorierten Ordner `intern/`.
- Personen aus dem Verein werden in Doku und Issues mit ihrer Rolle benannt, nicht mit
  Namen. Ausnahme: das Original-Anforderungsdokument unter `docs/anforderungen/`.
- Nie eine Funktion planen oder bauen, die Personendaten bearbeitet, ohne sie gegen
  `docs/datenschutz.md` zu prüfen. Was dort nicht steht, wird erst ins Konzept und die
  Datenschutzerklärung aufgenommen, dann gebaut; die Vorgaben `DS-NN` sind verbindlich.

## Branches — Dauerverbote

- **Nie direkt auf `main` pushen.** Der Weg auf `main` ist immer ein PR aus `dev`
  (lokal erzwungen durch `.githooks/pre-push`, aktiviert mit `make hooks`).
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
