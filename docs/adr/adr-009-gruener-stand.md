[← ADR-Index](adr-index.md)

# ADR-009: Ein schon grün geprüfter Stand wird vor dem Push nicht noch einmal voll geprüft

**Status:** Entschieden · **Datum:** 2026-11-06 · **Issue:** —

## Kontext

Der Pre-Push-Hook führt `make check` aus (Lint, Typen, Unit-, DB- und Ende-zu-Ende-Tests auf
drei Geräten). Ein Merge nach `dev` pushte denselben Code dabei zweimal: erst den
Feature-Branch nach dem Review, dann den Merge-Commit, der nur die Versionsnummer und Doku
dazubringt. Jeder Lauf kostete mehrere Minuten, und wacklige Ende-zu-Ende-Tests machten den
zweiten Lauf manchmal rot, ohne dass sich Code geändert hatte. Die CI prüft jeden Push auf
`dev` ohnehin voll.

## Optionen

| Option | Dafür | Dagegen |
|--------|-------|---------|
| A: Hook prüft jeden Push voll | einfach; nichts kommt ungeprüft nach `dev` | doppelte Wartezeit pro Merge; Flakes blockieren Pushes ohne Codeänderung |
| B: Hook prüft nur schnell (ohne E2E), CI fängt den Rest | kurz | Fehler fallen erst nach dem Push auf `dev` auf |
| C: Hook merkt sich einen grün geprüften Stand und lässt `make check` aus, wenn seither nur Doku und die Versionsnummer dazukamen | jeder Code-Stand wird lokal einmal voll geprüft; der zweite Push ist sofort durch | eine Regel mehr; ein Fehler darin liesse ungeprüften Code durch |

## Entscheidung

Option C. Ein grünes `make check` auf einem sauberen, committeten Stand merkt sich diesen
Stand (`gruener-stand.ts`); der Pre-Push-Hook lässt die volle Prüfung aus, wenn der gepushte
Stand davon nur in Doku und der Versionsnummer abweicht. Im Zweifel (fremder Code von `dev`,
keine Liste, unlesbare Datei) prüft er voll. Die Abwägung: Wartezeit gegen eine lokale
Schranke, die nichts Neues prüfen würde; die CI auf `dev` bleibt die unabhängige zweite Prüfung.
Einzelheiten: [CI/CD und Release](../ci-cd-und-release.md#prüfungen-in-der-ci).

## Konsequenzen

- Ein Merge nach `dev` kostet lokal nur noch eine volle Prüfung.
- Was als Doku zählt, entscheidet dieselbe Regel wie bei der Version (`nur-doku.ts`); Mockups
  unter `docs/ui-mockups/` zählen als Code, weil ein E2E-Test sie liest.
- `make check` zuletzt auf dem fertigen, committeten Stand laufen lassen, sonst greift die
  Abkürzung nicht (Skill `tco-branching`, Schritt 3).

## Reevaluations-Trigger

- Die CI auf `dev` wird rot durch Code, den die lokale volle Prüfung gefunden hätte.
- Jemand will die Schranke verschärfen (jeden Push voll) oder weiter lockern (ohne E2E).
