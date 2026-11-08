[← ADR-Index](adr-index.md)

# ADR-010: Das Repo ist öffentlich

**Status:** Entschieden · **Datum:** 2026-11-06 · **Issue:** —

## Kontext

Das Repo war privat, ohne GitHub Pro. Private Repos des Kontos teilen sich 2000 Gratisminuten
GitHub Actions pro Monat; MyTCO allein brauchte im November in sechs Tagen über 1100 Minuten,
seit die Ende-zu-Ende-Tests auf drei Geräten laufen. Ohne Pro gab es für private Repos auch
keinen Branch-Schutz für `main` und keine Deployment-Umgebungen. Echte Mitgliederdaten liegen
nie im Repo (`CLAUDE.md`, nur im gitignorierten Ordner `intern/`).

## Optionen

| Option | Dafür | Dagegen |
|--------|-------|---------|
| A: privat, Budget für Actions erhöhen | nichts wird sichtbar | laufende Kosten, die mit jedem Gerät und Test wachsen |
| B: privat, GitHub Pro | Minuten und Branch-Schutz | laufende Kosten pro Monat |
| C: privat, CI-Minuten senken (weniger Geräte, E2E nur vor dem Release) | gratis | weniger Schutz vor Fehlern auf iPhone und Android |
| D: öffentlich | Standard-Runner gratis und ohne Kontingent; Branch-Schutz und Deployment-Umgebungen gratis; GitHub prüft selbst auf Secrets | Code, Doku, Issues und CI-Logs für alle lesbar; lässt sich nicht ganz zurücknehmen (Kopien, Forks, Caches) |

## Entscheidung

Option D, Entscheid des Projektleiters. Ausschlaggebend: keine laufenden Kosten bei voller
Prüfung auf allen Geräten, und der Schutz von `main` kommt gratis dazu. Vertretbar, weil das
Repo nach den Dauerverboten keine echten Mitgliederdaten enthält. Sichtbar sind dadurch auch
das Anforderungsdokument (samt Metadaten), Abklärungen, Recherchen, Issues und CI-Logs; der
Projektleiter hat entschieden, das so zu lassen.

## Konsequenzen

- Neue Vereinsdokumente vor dem Einchecken auf Metadaten prüfen (Autorfeld in PDF und Office).
- Personen aus dem Verein erscheinen in Doku und Issues weiterhin nur mit ihrer Rolle.
- Geheimnisse in Umgebungen nur für `main` sind jetzt möglich
  ([#61](https://github.com/konstantinniedermann/tco-app/issues/61)).
- Wird das Repo wieder privat, gelten die Minuten-Grenze und der Notfall ohne CI
  ([CI/CD und Release](../ci-cd-und-release.md#actions-minuten)).

## Reevaluations-Trigger

- GitHub ändert die Bedingungen für öffentliche Repos (Minuten, Branch-Schutz).
- Der Verein wünscht, dass Unterlagen oder Issues nicht öffentlich sind.
