# MyTCO

Mitglieder-App des **Tennis-Club Olten (TCO)**. Mitglieder melden sich an, verwalten
ihre Lizenzanträge und nehmen an der Clubmeisterschaft teil — Anmeldung, Spielplan,
Resultate. Die Admin-Rollen pflegen die Mitglieder und bereiten die Daten für Swiss Tennis auf.

Geplant als Mobile-App für Android und iOS (mit Push-Benachrichtigungen) und einer
Verwaltung. MyTCO wird vorerst **eigenständig** aufgebaut, ohne Anbindung an die
Mitgliederverwaltung Fairgate ([ADR-006](docs/adr/adr-006-eigenstaendig-ohne-fairgate.md))
oder die Website tcolten.ch.

## Stand

Die Etappe **Pilot** läuft, das *Fundament* ist erledigt; noch nicht ausgeliefert (aktuelle Nummer: [Versionen](docs/versionen.md)). Gebaut sind: Login per Einmal-Code mit
Musterbrief und freiwilligem Passkey, Hilfe beim Start, Mitgliederverwaltung für Mitglieder-Admins mit
Liste «Für Fairgate», Einlesen einer Mitgliederliste als CSV-Datei, Login-Briefen einzeln und als Serie aus einer Druckansicht, Austritt, Löschen mit Bedenkzeit, Auskunft und automatischen Löschfristen, Rollen mit *Ansicht als …* für MyTCO-Admins, eigene Angaben im Profil ändern (mit freiwilligem Rufnamen, der überall vor dem amtlichen Namen steht), Datenschutzerklärung in der App,
Anmeldung zu Anlässen wie der Generalversammlung (Vorschlag für den Vorstand, K-50),
Turnier der Clubmeisterschaft mit Kategorien anlegen und Anmeldungen verwalten (Wildcard-Anträge
entscheiden, von Hand anmelden) für die CM-Admins, Einzel- und Doppel-Anmeldung der Mitglieder
zur Clubmeisterschaft (Wildcard-Antrag im Einzel, Doppel mit Partner-Anfrage), Gespräch mit der
Turnierleitung (Kontaktperson je Turnier),
Mitteilungen per Push und E-Mail zu Anlässen und an den Verein für Mitglieder-Admins,
Interclub-Resultate der TCO-Teams mit Einzelpartien im Reiter *IC* (die App holt sie auf Test und
Live selbst von Swiss Tennis, lokal per Import-Befehl; Mitglieder folgen Teams und bekommen nach
jedem neuen Endstand einen Push, Profil › Benachrichtigungen),
Auslieferung und Sicherung sowie die Test-Umgebung (umgeleitete Mails, erfundene Testdaten; Interclub mit den öffentlichen Daten von Swiss Tennis) sind
gebaut; die Test-Umgebung läuft auf dem Server, Live folgt mit 1.0.0, weitere Funktionen
kommen mit den Etappen. Vor 1.0.0 spielt eine Testgruppe die ganze App in einem Probelauf auf
Test durch (Etappe *Pilot*, [`docs/testgruppe.md`](docs/testgruppe.md)). Termine und Umfang der Etappen
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

## Aufbau

| Wo | Was |
|----|-----|
| `src/routes/` | Seiten (`+page.*`, laufen im Browser) und Schnittstellen (`api/**/+server.ts`) |
| `src/lib/<thema>/`, `src/lib/ui/` | Oberfläche je Thema; Daten holt nur der Abruf-Baustein `src/lib/abruf.ts` über die Abruf-Module des Themas, Umleitungen zum Login der Wächter `src/lib/login/waechter.ts` |
| `src/lib/design/` | Stil-Dateien und Tokens |
| `src/lib/server/<thema>/` | Fachlogik und Schnittstellen-Funktionen; `dienste.ts` baut die Dienste zusammen, `http.ts` die Antworten |
| `tests/` | Ende-zu-Ende-Tests (`e2e/`, Hilfen in `e2e/hilfen/`), Hilfen der übrigen Tests (`hilfen/`), Tests der Ladefunktionen (`oberflaeche/`), Tests der Skripte (`scripts/`) und der Betriebsskripte (`betrieb/`), Einrichtung der Test-Datenbank (`setup/`); die Einheits- und Datenbanktests liegen neben dem Code |
| `scripts/` | Prüfungen für Hook und CI (`pruefungen/`), Seed, Import, Musterbrief |
| `docs/` | Doku; Bausteine und ihre Regeln → [`docs/arc42.md`](docs/arc42.md), Tests → [`docs/testkonzept.md`](docs/testkonzept.md) |

## Lokal starten

Voraussetzungen: Node 26 (genau die Hauptversion aus `.nvmrc`; Make und Hooks brechen sonst ab),
Docker Desktop, gitleaks. Docker Desktop darf zwischen den Läufen aus sein: Alles, was Docker
braucht (`make db`, `make check` …), startet es auf dem Mac selbst und wartet, bis es bereit ist.

```bash
npm ci --ignore-scripts
npm exec --no -- playwright install chromium webkit
make hooks   # einmalig: Git-Hooks aktivieren
cp .env.example .env   # je Ordner bzw. Worktree: lokale Einstellungen (nur erfundene Werte)
make db      # lokale PostgreSQL und Mail-Fänger Mailpit starten
make seed    # Testbestand anlegen (rund 200 erfundene Mitglieder, zwei Anlässe, ein Beispielturnier fürs nächste offene CM-Jahr, Interclub-Resultate 2026), gibt Brief-Codes für die Personas aus (make help)
make dev     # Entwicklungsserver
make check   # alle Prüfungen (braucht Docker)
```

Neue Migration nach einer Änderung an `src/lib/server/db/schema.ts`: `npm run db:generate`
(schreibt sie nach `drizzle/`); eingespielt wird sie lokal mit `make seed`, in den Tests und
beim Ausliefern von selbst.

Formatieren: `npm run format` (Prettier; `make check` prüft nur).

Code-Mails landen lokal in Mailpit (`http://localhost:58025`). `make dev-handy` startet den
Entwicklungsserver stattdessen fürs iPhone im selben WLAN (macOS, nur im eigenen WLAN), mit
einem festen Namen je Rolle: `mytco-mitglied.local` (Kurt, Mitglied), `mytco-mytcoadmin.local` (Theo,
MyTCO-Admin), `mytco-mitgliederadmin.local` (Mona, Mitglieder-Admin) und `mytco-cmadmin.local`
(Hanna, CM-Admin): je Name eine
Verknüpfung auf dem Startbildschirm mit eigenem Login. Login per Code klappt dort, Passkey nicht
(braucht HTTPS); vorher einmal `make seed`, am Laptop dann über die WLAN-Adresse statt
localhost. `make musterbrief` erzeugt
einen Musterbrief als PDF unter `musterbrief/musterbrief.pdf`.

Alle weiteren Befehle: `make help`.

## Arbeitsweise

- Branches: `main` (Produktion) ← PR ← `dev` (Integration) ← `feat/issue-NNN`
- Der Hauptordner bleibt auf `dev`. Jede Session arbeitet in einem eigenen Worktree unter
  `.claude/worktrees/issue-NNN` (gitignoriert); Ablauf im Skill
  [`tco-branching`](.claude/skills/tco-branching/SKILL.md).
- Jede Änderung hängt an einem Issue mit Definition of Done.
- Release dev → main: Doku-Abgleich und `make release-check`, Ablauf im Skill `tco-branching`.
- Fertig heisst nachgewiesen: Tests, CI oder Screenshot belegen die Änderung.
- Vor dem Push: `make check` auf dem fertigen, committeten Stand (dasselbe prüft die CI); nur
  dann merkt es sich den grünen Stand. Einmalig `make hooks` aktiviert
  die versionierten Git-Hooks: vor jedem Commit Secret-Scan und `make docs` (nur Doku) bzw.
  `make check-schnell` (mit Code), vor dem Push `make check`, wenn Code dabei ist und der
  Stand nicht schon grün geprüft ist ([Grüner Stand](docs/ci-cd-und-release.md#prüfungen-in-der-ci));
  kein direkter Push auf `main`.

## Datenschutz

Das Repo enthält **keine echten Mitgliederdaten**. Echte Vereinsunterlagen gehören in
den gitignorierten Ordner `intern/`, Testdaten sind erfunden. Was MyTCO mit Personendaten
tut und welche Vorgaben für jede Funktion gelten → [`docs/datenschutz.md`](docs/datenschutz.md).
