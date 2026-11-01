# MyTCO

Mitglieder-App des **Tennis-Club Olten (TCO)**. Mitglieder melden sich an, verwalten
ihre Lizenzanträge und nehmen an der Clubmeisterschaft teil — Anmeldung, Spielplan,
Resultate. Admins pflegen die Mitglieder und bereiten die Daten für Swiss Tennis auf.

Geplant als Mobile-App für Android und iOS (mit Push-Benachrichtigungen) und einer
Admin-Oberfläche. MyTCO wird vorerst **eigenständig** aufgebaut, ohne Anbindung an die
Mitgliederverwaltung Fairgate oder die Website tcolten.ch.

## Stand

Phase **Fundament**: Architektur und Grundlagen werden dokumentiert; das Code-Gerüst
(Version 0.1.0) steht, Funktionen folgen mit den Etappen. Termine und Umfang der Etappen → [`docs/roadmap.md`](docs/roadmap.md).

## Einstieg

| Wofür | Wo |
|-------|----|
| Alle Befehle | `make help` |
| Doku-Übersicht | [`docs/index.md`](docs/index.md) |
| Anforderungen | [`docs/anforderungen/`](docs/anforderungen/README.md) |
| Architektur-Entscheidungen | [`docs/adr/adr-index.md`](docs/adr/adr-index.md) |
| Wie Issues angelegt werden | [`docs/issue-konventionen.md`](docs/issue-konventionen.md) |
| Arbeitsregeln für Claude Code | [`CLAUDE.md`](CLAUDE.md) |

## Lokal starten

Voraussetzungen: Node 26, Docker Desktop, gitleaks.

```bash
npm ci --ignore-scripts
npm exec --no -- playwright install chromium webkit
make hooks   # einmalig: Git-Hooks aktivieren
make db      # lokale PostgreSQL starten
make dev     # Entwicklungsserver
make check   # alle Prüfungen (braucht Docker)
```

Alle weiteren Befehle: `make help`.

## Arbeitsweise

- Branches: `main` (Produktion) ← PR ← `dev` (Integration) ← `feat/issue-NNN`
- Der Hauptordner bleibt auf `dev`. Jede Session arbeitet in einem eigenen Worktree unter
  `.claude/worktrees/issue-NNN` (gitignoriert); Ablauf im Skill
  [`tco-branching`](.claude/skills/tco-branching/SKILL.md).
- Jede Änderung hängt an einem Issue mit Definition of Done.
- Fertig heisst nachgewiesen: Tests, CI oder Screenshot belegen die Änderung.
- Vor jedem Commit: `make check` (dasselbe prüft die CI). Einmalig `make hooks` aktiviert
  die versionierten Git-Hooks: Secret-Scan und Doku-Check vor jedem Commit, kein direkter
  Push auf `main`.

## Datenschutz

Das Repo enthält **keine echten Mitgliederdaten**. Echte Vereinsunterlagen gehören in
den gitignorierten Ordner `intern/`, Testdaten sind erfunden. Was MyTCO mit Personendaten
tut und welche Vorgaben für jede Funktion gelten → [`docs/datenschutz.md`](docs/datenschutz.md).
