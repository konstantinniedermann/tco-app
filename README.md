# MyTCO

Mitglieder-App des **Tennis-Club Olten (TCO)**. Mitglieder melden sich an, verwalten
ihre Lizenzanträge und nehmen an der Clubmeisterschaft teil — Anmeldung, Spielplan,
Resultate. Admins pflegen die Mitglieder und bereiten die Daten für Swiss Tennis auf.

Geplant als Mobile-App für Android und iOS (mit Push-Benachrichtigungen) und einer
Admin-Oberfläche. MyTCO wird vorerst **eigenständig** aufgebaut, ohne Anbindung an die
Mitgliederverwaltung Fairgate oder die Website tcolten.ch.

## Stand

Phase **Fundament**: Architektur und Grundlagen werden dokumentiert, bevor Code
entsteht. Termine und Umfang der Etappen → [`docs/roadmap.md`](docs/roadmap.md).

## Einstieg

| Wofür | Wo |
|-------|----|
| Alle Befehle | `make help` |
| Doku-Übersicht | [`docs/index.md`](docs/index.md) |
| Anforderungen | [`docs/anforderungen/`](docs/anforderungen/README.md) |
| Architektur-Entscheidungen | [`docs/adr/adr-index.md`](docs/adr/adr-index.md) |
| Wie Issues angelegt werden | [`docs/issue-konventionen.md`](docs/issue-konventionen.md) |
| Arbeitsregeln für Claude Code | [`CLAUDE.md`](CLAUDE.md) |

## Arbeitsweise

- Branches: `main` (Produktion) ← PR ← `dev` (Integration) ← `feat/issue-NNN`
- Parallele Sessions arbeiten in Worktrees unter `.worktrees/` im Repo (gitignoriert):
  `git worktree add .worktrees/issue-NNN -b feat/issue-NNN origin/dev`
- Jede Änderung hängt an einem Issue mit Definition of Done.
- Fertig heisst nachgewiesen: Tests, CI oder Screenshot belegen die Änderung.
- Vor jedem Commit: `make check` (dasselbe prüft die CI). Einmalig `make hooks` aktiviert
  die versionierten Git-Hooks: Secret-Scan und Doku-Check vor jedem Commit, kein direkter
  Push auf `main`.

## Datenschutz

Das Repo enthält **keine echten Mitgliederdaten**. Echte Vereinsunterlagen gehören in
den gitignorierten Ordner `intern/`, Testdaten sind erfunden.
