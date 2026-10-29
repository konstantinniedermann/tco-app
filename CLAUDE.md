# MyTCO — Projektkontext für Claude Code

> Für alle Aktionen → `make help`

## Was ist MyTCO?

Mitglieder-App des Tennis-Club Olten (TCO): Login für Mitglieder, Mitgliederverwaltung
für Admins, Anmeldung und Betrieb der Clubmeisterschaft, Lizenzanträge. Geplant als
Mobile-App (Android, iOS) mit Admin-Oberfläche. Ehrenamtliches Projekt.
Ausführlich: `README.md`. Termine und Umfang je Etappe: `docs/roadmap.md`.

## Doku zuerst — Dauerverbot dieser Phase

Kein Produktcode, solange der Milestone *Fundament* offen ist. Zuerst entstehen
Anforderungen, Fachmodell, Datenschutz- und Sicherheitskonzept und die Technik-ADRs;
das Code-Gerüst ist ein eigenes Issue, das von diesen Dokumenten blockiert ist.

## Mitgliederdaten — Dauerverbote

- Nie echte Mitgliederdaten (Namen, Adressen, Geburtsdaten, Lizenznummern, Kontaktdaten)
  in Repo, Tests, Fixtures, Seed-Daten, Issues, Logs oder Screenshots. Testdaten sind erfunden.
- Nie Exporte aus Fairgate, Swiss Tennis oder Vereinslisten ins Repo kopieren. Echte
  Vereinsunterlagen liegen nur im gitignorierten Ordner `intern/`.
- Personen aus dem Verein werden in Doku und Issues mit ihrer Rolle benannt, nicht mit
  Namen. Ausnahme: das Original-Anforderungsdokument unter `docs/anforderungen/`.

## Branches — Dauerverbote

- **Nie direkt auf `main` pushen.** Der Weg auf `main` ist immer ein PR aus `dev`.
- **Nie Squash** beim Merge nach `dev` oder `main` — immer Merge-Commit.
- **Nie `git reset --hard` auf `dev`.**
- **Feature-Branches zweigen ab `origin/dev` ab.**
- **Nie `git add -A` oder `git add .`** — Dateien einzeln stagen.

## Issue-Konventionen

Labels, Milestones und Definition of Done → `docs/issue-konventionen.md`; die Struktur
beim Anlegen gibt `.github/ISSUE_TEMPLATE/` vor.

## Context-Scopes

Welche Pfade bei welcher Aufgabe zu laden sind → `docs/context-scopes.md`.
