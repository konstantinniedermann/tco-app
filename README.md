# MyTCO

Mitglieder-App des **Tennis-Club Olten (TCO)**. Mitglieder melden sich an, verwalten
ihre Lizenzanträge und nehmen an der Clubmeisterschaft teil — Anmeldung, Spielplan,
Resultate. Admins pflegen die Mitglieder und bereiten die Daten für Swiss Tennis auf.

Geplant als Mobile-App für Android und iOS (mit Push-Benachrichtigungen) und einer
Admin-Oberfläche. MyTCO wird vorerst **eigenständig** aufgebaut, ohne Anbindung an die
Mitgliederverwaltung Fairgate oder die Website tcolten.ch.

## Stand

Phase **Fundament**, Version 0.2.0 (noch nicht ausgeliefert): Login per Einmal-Code mit
Musterbrief sowie Auslieferung und Sicherung sind gebaut und lokal nachgewiesen; der Server
folgt, weitere Funktionen kommen mit den Etappen. Termine und Umfang der Etappen
→ [`docs/roadmap.md`](docs/roadmap.md).

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

Voraussetzungen: Node 26 (genau die Hauptversion aus `.nvmrc`; Make und Hooks brechen sonst ab),
Docker Desktop, gitleaks.

```bash
npm ci --ignore-scripts
npm exec --no -- playwright install chromium webkit
make hooks   # einmalig: Git-Hooks aktivieren
cp .env.example .env   # je Ordner bzw. Worktree: lokale Einstellungen (nur erfundene Werte)
make db      # lokale PostgreSQL und Mail-Fänger Mailpit starten
make seed    # erfundene Mitglieder anlegen, gibt einen Brief-Code zum Anmelden aus
make dev     # Entwicklungsserver
make check   # alle Prüfungen (braucht Docker)
```

Neue Migration nach einer Änderung an `src/lib/server/db/schema.ts`: `npm run db:generate`
(schreibt sie nach `drizzle/`); eingespielt wird sie lokal mit `make seed`, in den Tests und
beim Ausliefern von selbst.

Code-Mails landen lokal in Mailpit (`http://localhost:58025`). `make musterbrief` erzeugt
einen Musterbrief als PDF unter `musterbrief/musterbrief.pdf`.

Alle weiteren Befehle: `make help`.

## Arbeitsweise

- Branches: `main` (Produktion) ← PR ← `dev` (Integration) ← `feat/issue-NNN`
- Der Hauptordner bleibt auf `dev`. Jede Session arbeitet in einem eigenen Worktree unter
  `.claude/worktrees/issue-NNN` (gitignoriert); Ablauf im Skill
  [`tco-branching`](.claude/skills/tco-branching/SKILL.md).
- Jede Änderung hängt an einem Issue mit Definition of Done.
- Fertig heisst nachgewiesen: Tests, CI oder Screenshot belegen die Änderung.
- Vor jedem Commit: `make check` (dasselbe prüft die CI). Einmalig `make hooks` aktiviert
  die versionierten Git-Hooks: vor jedem Commit Secret-Scan und `make docs` (nur Doku) bzw.
  `make check-schnell` (mit Code), vor dem Push `make check`, wenn Code dabei ist; kein
  direkter Push auf `main`.

## Datenschutz

Das Repo enthält **keine echten Mitgliederdaten**. Echte Vereinsunterlagen gehören in
den gitignorierten Ordner `intern/`, Testdaten sind erfunden. Was MyTCO mit Personendaten
tut und welche Vorgaben für jede Funktion gelten → [`docs/datenschutz.md`](docs/datenschutz.md).
