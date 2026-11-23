<!-- Vorlage für den Release-PR dev → main (Skill tco-branching, Schritt 5). Claude füllt sie aus;
     der Projektleiter hakt die Handpunkte ab. Erst dann `gh pr ready` und Merge. -->

## Release X.Y.Z — <Kurztitel>

Abschnitt in `docs/versionen.md`: <Link>. Test zeigt `X.Y.Z · <commit>`.

### Prüflauf Test (`make test-pruefung`)

| Punkt | Ergebnis |
|---|---|
| <Punkt> | ok / rot |

Screenshots: lokal unter `test-results/test-server/` (nicht angehängt, erfundene Daten).

### Automatisch (CI)

Grüner Lauf auf dem Commit des Abgleichs: <Link zum CI-Lauf>. Punkte und tragende Tests:
Testkonzept, «Checkliste vor dem Release», Abschnitt *Automatisch (CI)*.

### Von Hand

Auswahl: <Grundrunde + berührte Punkte, oder volle Runde> — Begründung: <ein Satz je Runde>.

**Grundrunde**
- [ ] iPhone: …
- [ ] Android: … <oder: Android: ausgesetzt, Grund …>

**<Runde>**
- [ ] …

### Doku-Abgleich

<Fixes, Beobachtungen, Befunde auf hoch>
