# Beobachtungen

Posteingang für Befunde, die **kein eigener Vorgang** sind: Dinge, die beim
Arbeiten an etwas anderem auffallen, aber weder in den laufenden Scope gehören
noch für sich genommen ein GitHub-Issue rechtfertigen.

**Warum die Datei existiert:** Ohne sie gibt es nur zwei Ablagen — „jetzt erledigen"
oder „Issue anlegen". Alles dazwischen wird zwangsläufig zum Issue, und die
Issue-Liste wächst schneller, als sie abgearbeitet werden kann (Erfahrung aus
früheren Projekten). Diese Datei ist die dritte Ablage.

## Wie sie benutzt wird

**Eintragen** (Claude, ohne Rückfrage): Ein Befund, der Regel 3 der
übergeordneten `CLAUDE.md` nicht erfüllt, kommt hier als kurzer Eintrag rein.
Kein Definition of Done, kein Milestone, keine Labels.

Form eines Eintrags:

```markdown
### JJJJ-MM-TT — Titel, der den Befund in einem Satz sagt

**Thema:** Kurzes Stichwort

**Fundort:** Datei, Symbol, Seite — worauf sich der Befund bezieht.

**Beobachtung:** Was auffiel.

**Ursprung:** Woraus der Befund fiel (Issue, Release, Session).

**Einschätzung:** Erste Bewertung — ausdrücklich vorläufig.
```

**Das Thema wird wiederverwendet, nicht erfunden.** Vor dem Schreiben:

```bash
sed -n '/^## Offen/,$p' docs/beobachtungen.md \
  | grep '^\*\*Thema:\*\*' | sort | uniq -c | sort -rn
```

Gibt es das Stichwort schon, wird genau dieses genommen. Beschreibt ein
bestehender Eintrag denselben Befund aus derselben Ursache, wird **dort
ergänzt** statt neu angelegt. Der Zweck ist nicht Ordnung, sondern Sichtbarkeit:
Häufungen sollen beim Eintragen auffallen und nicht erst bei der Auswertung.

**Auswerten** (gemeinsam, in Ruhe): über den Skill `beobachtungen-auswerten`.
Er verifiziert jeden offenen Eintrag am aktuellen Stand des Repos, bevor
entschieden wird — ein Eintrag ist eine Behauptung, kein Befund. Danach bekommt
jeder Eintrag genau einen von sechs Ausgängen:

| Ausgang | Bedeutung |
|---------|-----------|
| **Verworfen** | Die Behauptung trifft nicht zu. Der **Gegenbeleg** steht in der Commit-Nachricht der Auswertung — er verhindert, dass derselbe Fund wiederkommt |
| **Abhaken** | Trifft zu, wir tun bewusst nichts. Mit Begründung, und wo sinnvoll mit **Reevaluations-Trigger** („kommt zurück, wenn …") |
| **Mitmachen** | Trivial-Fix, sofort erledigt, eigener Commit |
| **Doku / Regel / Memory** | Erkenntnis ohne Vorgang — ADR, arc42, `CLAUDE.md` oder Memory |
| **Vereinsthema** | Braucht eine Entscheidung oder Auskunft des Vereins → offener Punkt für die nächste Sitzung in `docs/abklaerungen.md` |
| **Issue** | Erfüllt Regel 3 der `CLAUDE.md`. Neu, an ein bestehendes angehängt, oder mehrere gebündelt — nur auf ausdrückliche Zustimmung |

**„Abhaken" ist ein vollwertiges Ergebnis und ausdrücklich der Normalfall.** Ein
Eintrag, der monatelang unangetastet bleibt, hat sich damit selbst beantwortet.

**Es gibt keinen automatischen Auslöser.** Wann ausgewertet wird, entscheidet
der Nutzer. Der Skill `session-wrap-up` nennt am Session-Ende nur die Zahl der
offenen Einträge und das Datum der letzten Auswertung — als Information, nicht
als Empfehlung.

### Bleibt ein Eintrag nach einer Auswertung offen

Dann trägt er, was die Verifikation ergeben hat:

```markdown
**Verifiziert:** TT.MM.JJJJ gegen vX.Y.Z-prod — belegt
(`pfad/zur/datei` → `symbol`, kurze Begründung).
Offen ist nur die Entscheidung, ob …
```

Die nächste Auswertung verifiziert einen solchen Eintrag **nicht neu**. Sie
prüft nur, ob sich an den im Beleg genannten Pfaden seither etwas bewegt hat
(`git log --since='<Datum> 00:00' -- <pfade>`); ist dort nichts passiert, gilt
der Beleg weiter.

**Die Uhrzeit gehört zwingend dazu.** `--since=2026-08-30` heisst für git nicht
„seit Mitternacht", sondern „seit dem 30.08. um die jetzige Uhrzeit" — taggleiche
Commits fallen still heraus, und das Ergebnis ist eine leere Ausgabe, die aussieht
wie „nichts hat sich bewegt". Taggleich ist hier der Normalfall, weil Auswertung
und Folgelauf oft am selben Tag liegen. Wo ein Commit-Ref vorliegt, ist
`git log <ref>..HEAD -- <pfade>` die robustere Form.

Drei Bedingungen, ohne die das Feld nicht zählt und die volle Verifikation
wieder greift:

- **Es setzt nur die Auswertung, nie das Eintragen.** Ein frischer Eintrag hat
  kein `Verifiziert`-Feld — er ist unverifiziert, und genau das soll man sehen.
- **Es braucht eine Fundstelle**, auf die `git log` zeigen kann: Datei und
  Symbol, oder ein Kommando mit Ausgabe. Ein Beleg ohne Fundstelle zählt nicht.
- **Einträge vom Typ „Abwägung" bekommen keines.** Wo keine Tatsachenbehauptung
  steht, kann auch nichts veralten — dort ist die offene Entscheidung der ganze
  Inhalt. Hat die Verifikation dort trotzdem **Fakten korrigiert**, steht das als
  Absatz `**Korrektur (TT.MM.JJJJ, Beobachtungs-Auswertung).**` im Eintrag: Er trägt
  dieselbe Belegpflicht wie ein `Verifiziert`-Feld, taugt aber nicht als Abkürzung für
  den nächsten Lauf — die Entscheidung bleibt in jedem Fall zu treffen.

Zwei Regeln, die sich in den Auswertungen als tragend erwiesen haben:

- **„Notieren" ist kein Ausgang.** Es klingt nach Entscheidung, ist aber
  Vertagung, und genau daran wächst die Datei. Wo etwas später wieder relevant
  wird, ist der richtige Ausgang „Abhaken **mit Trigger**".
- **Erledigtes wird gelöscht, nicht archiviert.** Je Eintrag eine Zeile (Titel, Ausgang,
  Verweis), die Bilanz und bei verworfenen Einträgen der Gegenbeleg stehen in der
  Commit-Nachricht der Auswertung, deren Betreff mit `docs: Beobachtungs-Auswertung` beginnt;
  wiederfinden mit `git log --grep='Beobachtungs-Auswertung' -- docs/beobachtungen.md`. Die
  Begründung lebt dort, wo sie hingehört (Issue-Body, Commit, Doku, Memory).

Ausgewertete Einträge bis zum 18.11.2026 stehen im [Archiv](beobachtungen-archiv.md); es wird nicht
mehr fortgeschrieben.

Letzte Auswertung: 24.11.2026

---

## Offen

### 2026-11-24 — `npm ci` kostet jeden CI-Job rund 50 Sekunden

**Thema:** Code

**Fundort:** `.github/workflows/check.yml` (Schritt `npm ci --ignore-scripts` in `pruefen`, `e2e` und weiteren Jobs)

**Beobachtung:** Seit die E2E-Tests in zwölf Teilen laufen, ist der Vorlauf jedes Jobs der grösste Posten bis Test: `npm ci` braucht 45–52 s, obwohl `setup-node` den npm-Cache schon mitbringt (B: Schrittzeiten von Lauf 45491470229). Der längste E2E-Teil und `pruefen` enden etwa gleichzeitig (4:03 bzw. 4:07); ein Aufteilen von `pruefen` brächte darum nur Sekunden.

**Ursprung:** CI-Beschleunigung `chore/ci-shards` (Wartezeit bis Test 11:11 → 5:20).

**Einschätzung:** Ein Zwischenspeicher für `node_modules` (Schlüssel aus `package-lock.json` und Node-Version) könnte jeden Job um rund 40 s kürzen. Vorher klären: Gefahr eines vergifteten Speichers aus einem Branch (GitHub trennt Caches nach Branch, `dev` und `main` lesen nur eigene), Grösse des Speichers, und ob `npm ci` dann noch die Integrität prüft.

### 2026-11-24 — Die Container-Ablage auf GitHub räumt niemand auf

**Thema:** Code

**Fundort:** `.github/workflows/check.yml` (Job `bauen`), `betrieb/bin/ausliefern` (Aufräumen nur auf dem Server)

**Beobachtung:** Jeder Push mit Code auf `dev` legt ein Image `commit-<sha>` in die private Ablage (ghcr.io); seit `bauen` parallel zu den Prüfungen läuft, auch für rote Stände. Gelöscht wird nur auf dem Server, nicht in der Ablage; dort lagen am 24.11.2026 schon 57 Versionen (B: `gh api`, Review des Branches `chore/ci-schneller`).

**Ursprung:** Review von `chore/ci-schneller` (CI schneller bis Test).

**Einschätzung:** Kein Risiko für die Auslieferung (rote Images bekommen kein `code-…` und werden nie ausgeliefert), nur wachsender Bestand. Möglich: ein Schritt nach `freigeben`, der Versionen ohne `code-…` älter als N Tage löscht; vorher prüfen, ob die Ablage für öffentliche Repos ein Speicherlimit hat.
