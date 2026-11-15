[← ADR-Index](adr-index.md)

# ADR-012: Eine Versionsnummer entsteht beim Release nach main, nicht beim Merge nach dev

**Status:** Entschieden · **Datum:** 2026-11-15 · **Issue:** #80

Bestätigt vom Projektleiter am Checkpoint vom 15.11.2026 (E-71 bis E-83 in der
[Refactoring-Analyse](../refactoring-analyse.md#8-entscheide)).

## Kontext

Seit [ADR-007](adr-007-version-pro-merge.md) bekommt jeder Merge nach `dev` mit Code eine
eigene Nummer. Der Grund war, dass jeder Stand auf `dev` und auf Test an der Fusszeile
erkennbar sein sollte. Die Erfahrung: Zwischen dem letzten Stand auf `main` (0.20.5) und dem
Merge, der diese ADR einführt, liegen 29 Nummern in wenigen Tagen; keine davon ist je
ausgeliefert worden, es gibt weder Test noch Live, keinen Tag und kein GitHub-Release. Jeder
Merge fasst dafür drei Dateien an (`package.json`, `package-lock.json`,
[Versionen](../versionen.md)), die jede parallele Session ebenfalls anfasst; für den Fall, dass
zwei Sessions gleichzeitig mergen, brauchte es eine eigene Regel im Skill und mit dem «grünen
Stand» ([ADR-009](adr-009-gruener-stand.md)) einen zweiten Mechanismus. Die frühere Antwort
«danach nur noch bei Auslieferung auf Test» hätte nichts geändert: Test wird bei jedem Merge
mit Code ausgeliefert.

## Optionen

| Option | Dafür | Dagegen |
|--------|-------|---------|
| A: Nummer beim Release `dev` → `main` | eine Nummer benennt, was `dev` verlässt; Merges nach `dev` fassen `package.json` nicht mehr an; die Regel zur Nummer bei gleichzeitigen Merges entfällt | Stände zwischen zwei Releases tragen dieselbe Nummer; sobald Test läuft, sind sie dort nur am Commit zu unterscheiden |
| B: Nummer bei jeder Auslieferung auf Test | Stände auf Test unterscheidbar | ist dasselbe wie heute, sobald Test läuft; bis dahin entstünde gar keine Nummer |
| C: Nummer bei jedem Merge mit Code (ADR-007 bleibt) | nichts umzubauen | die Kosten bleiben, ohne dass eine der Nummern je jemand ausserhalb des Repos sieht |

## Entscheidung

Option A: Eine Versionsnummer entsteht nur noch beim Release `dev` → `main`. Claude setzt sie
im Doku-Abgleich vor dem PR und macht aus «Unveröffentlicht» den Abschnitt dieser Nummer; der
Abgleich kommt als gewöhnlicher Merge nach `dev`, erst danach entsteht der PR. Ein Merge nach
`dev` vergibt keine Nummer; der Branch schreibt seinen Eintrag unter «Unveröffentlicht» in den
[Versionen](../versionen.md), und der Pre-Push-Hook verlangt ihn bei einem Merge mit Code (bei
Dependabot schreibt ihn, wer mergt). Die Stufe: Nebenversion, wenn das Release für Mitglieder
oder Verwaltung etwas spürbar Neues bringt; Korrektur, wenn es nur Fehler behebt oder Inneres
und Werkzeug ändert; Hauptversion nur im Auftrag des Projektleiters. Claude schlägt Nummer und
Grund mit der Bitte um Freigabe vor; die Freigabe des Releases gilt auch für die Nummer. Der
Abgleich setzt die Nummer nur bei einem Release mit Code; ein Release, das nur Doku enthält,
lässt sie stehen, und seine Einträge bleiben unter «Unveröffentlicht» bis zum nächsten
Release mit Code.

Begründung: Eine Nummer soll einen Stand benennen, den jemand bekommt; solange nur `main` ein
solcher Stand ist, genügt eine Nummer je Release. Ablauf im Einzelnen:
[CI/CD und Release](../ci-cd-und-release.md#versionen) und Skill `tco-branching`.

## Konsequenzen

- Die Fusszeile zeigt zwischen zwei Releases dieselbe Nummer; zwei Stände auf `dev`
  unterscheidet der Commit. Kein Zusatz in der Fusszeile.
- Ein Merge nach `dev` ändert `package.json` und `package-lock.json` nicht mehr. Gleichzeitige
  Merges können sich nur noch in einer Datei treffen (den Versionen), als Textkonflikt mit der
  Regel «beide Einträge behalten».
- Der Hook prüft auf `dev` nur noch schmal: Ein Merge mit Code bringt einen neuen Eintrag unter
  «Unveröffentlicht»; steigt die Nummer (im Abgleich), dann um genau einen Schritt, mit ihrem
  Abschnitt zuoberst und leerem «Unveröffentlicht». Eine Nummer, die jemand aus Gewohnheit
  beim Merge vergibt, fängt er nicht; sie hat dieselbe Form wie der Abgleich.
- Der Doku-Abgleich eines Releases mit Code ist nie mehr reine Doku: Er setzt die Nummer und
  läuft darum durch die volle Prüfung, ausser sein Stand ist schon grün geprüft (ADR-009 gilt
  weiter; die Ausnahme für die Nummer wird genau dafür gebraucht).
- Die 29 Nummern seit 0.20.5 bleiben als Abschnitte stehen. Der Merge, der diese ADR einführt,
  trägt als letzter nach der alten Regel 0.22.11; das nächste Release trägt 0.23.0. Beim ersten
  Release erkennt die Prüfung vor dem Release eine vergessene Nummer nicht, weil `dev` der
  Nummer von `main` schon voraus ist; darum steht die Zahl fest. Ab dem zweiten Release erkennt
  sie eine fehlende Nummer selbst.
- Tag und GitHub-Release setzt weiter nur die CI nach einer Live-Auslieferung; an den Jobs
  ändert sich nichts.

## Reevaluations-Trigger

- `AUSLIEFERUNG_TEST` steht auf `an`. Dann ist zu entscheiden: (1) ob Stände auf Test an der
  Nummer unterscheidbar sein müssen (der Einwand aus ADR-007) oder ein Zusatz wie die Kurzform
  des Commits in der Fusszeile genügt; (2) die Reihenfolge: Die Nummer zählt zum Code-Stand
  des Images, sie muss vor der Checkliste auf Test gesetzt sein, sonst geht ein anderes Image
  live als das geprüfte.
- Merges nach `dev` laufen nicht mehr lokal (z. B. auf GitHub), so dass der Hook sie nicht
  sieht.
