[← ADR-Index](adr-index.md)

# ADR-007: Jeder Merge nach dev mit Code bekommt seine eigene Versionsnummer

**Status:** Entschieden · **Datum:** 2026-11-05 · **Issue:** —

## Kontext

Bis 0.5.0 erhöhte erst das Release die Version: Vor dem PR nach `main` setzte ein Commit auf
`dev` die neue Nummer und machte aus *Unveröffentlicht* einen Abschnitt in den
[Versionen](../versionen.md). Dazwischen lagen auf `dev` viele Merges mit Code unter derselben
Nummer. Mehrere Sessions arbeiten parallel und mergen unabhängig voneinander nach `dev`. Die
Regel wurde mit 0.5.1 umgestellt; ihre Begründung stand bis zu dieser ADR nur als ein Satz in
der Release-Doku.

## Optionen

| Option | Dafür | Dagegen |
|--------|-------|---------|
| A: Version nur beim Release | wenige Nummern, ein Schritt pro Release | Zwischenstände auf `dev` und Test sind nicht unterscheidbar |
| B: Feature-Branch setzt die Nummer | Nummer steht schon im Review | zwei parallele Branches beanspruchen dieselbe Nummer, Konflikt erst beim Merge |
| C: Wer nach `dev` mergt, vergibt die Nummer im Merge-Commit | jede Nummer genau einmal; jeder Stand mit Code erkennbar | mehr Nummern; der Merge hat einen Schritt mehr |

## Entscheidung

Option C: Jeder Merge nach `dev` mit Code erhöht die Version um genau einen Schritt, im
Merge-Commit selbst; reine Doku lässt sie stehen. Weil die Nummer erst beim Merge entsteht und
der Merge auf einen aktuellen `dev` folgt, beanspruchen zwei parallele Sessions nie dieselbe
Nummer. Der Pre-Push-Hook prüft das (`version-merge.ts`). Das Release erhöht nicht mehr selbst,
Live bekommt die Nummer, die `dev` trägt. Ablauf im Einzelnen:
[CI/CD und Release](../ci-cd-und-release.md#versionen) und Skill `tco-branching`.

## Konsequenzen

- Die Nummer in der Fusszeile benennt jeden Stand mit Code eindeutig, auch auf Test.
- Korrekturnummern steigen schnell; ein Release fasst mehrere Abschnitte zusammen (die CI
  schreibt den Release-Text aus allen Abschnitten seit dem letzten Release).
- Wird ein Push abgewiesen, weil `dev` weitergezogen ist, bekommt die eigene Arbeit die nächste
  freie Nummer. Das ist ein Handgriff mehr pro Konflikt.
- Was als Doku zählt, entscheidet eine Regel (`nur-doku.ts`); die Datenschutzerklärung zählt
  als Code, weil die App sie einliest.

## Reevaluations-Trigger

- Merges nach `dev` laufen nicht mehr lokal (z. B. Merge auf GitHub), so dass der Pre-Push-Hook
  sie nicht mehr sieht.
- Die Zahl der Korrekturnummern pro Release stört beim Lesen der Versionen oder der
  Release-Texte.
