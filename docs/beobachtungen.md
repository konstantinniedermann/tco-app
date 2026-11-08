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
| **Verworfen** | Die Behauptung trifft nicht zu. Eintrag wandert mit **Gegenbeleg** ins [Archiv](beobachtungen-archiv.md) — der Beleg verhindert, dass derselbe Fund wiederkommt |
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
- **Erledigtes wird eingedampft** und wandert ins [Archiv](beobachtungen-archiv.md),
  als neuer Block pro Auswertung (neuester oben): eine Zeile mit Ausgang und Verweis; die Begründung lebt dort, wo sie hingehört (Issue-Body, Commit,
  Memory). Ausnahme sind verworfene Einträge — die behalten ihren Gegenbeleg.

Ausgewertete Einträge stehen im [Archiv](beobachtungen-archiv.md).

---

## Offen

### 2026-11-08 — Auskunft: neue Angaben je Gerät nur im DB-Test belegt, nicht auf der Seite

**Thema:** App-Oberfläche

**Fundort:** `src/routes/verwaltung/mitglieder/[id]/auskunft/+page.svelte` (Tabelle *Login und Geräte*), `tests/e2e/mitgliedschaft.test.ts`

**Beobachtung:** Seit 0.11.2 nennt die Auskunft je Gerät «Verwaltung bestätigt am …» und «Ansicht als …». Der DB-Test von `ladeAuskunft` belegt die Daten (mit Mutationsprobe); dass die Seite sie zeigt, prüft weder ein E2E-Test noch ein Screenshot.

**Ursprung:** Review (`cas-reviewer`) der Beobachtungs-Auswertung vom 08.11.2026.

**Einschätzung:** Niedrig: Typen sind geprüft, `ansicht` ist per DB-Regel auf vier Werte begrenzt. Ein Schritt im bestehenden Auskunft-E2E würde reichen, wenn die Seite ohnehin angefasst wird.

### 2026-11-08 — Design System «MyTCO» hinkt dem UI-Leitbild hinterher

**Thema:** App-Oberfläche

**Fundort:** Design-System-Artifact «MyTCO» (`project/tokens.json`, `meta.ref` = `dev@36306dc`, synced 2026-11-05), `docs/ui-leitbild.md`, `src/lib/design/tokens.css`

**Beobachtung:** Seit dem Stand des Design Systems haben 23 Commits auf `dev` das UI-Leitbild oder `tokens.css` geändert (u. a. Bewegung und Bedienung, #54). Die README des Design Systems beschreibt z. B. noch Unterseiten nur mit «‹ Zurück». Entwürfe, die nur die Tokens des Design Systems nehmen, könnten veraltete Werte zeigen; die Entwürfe zu #69 binden darum die echten `tokens.css`/`basis.css` aus dem Repo ein.

**Ursprung:** Entwurf zu #69 (Navigation und Tiefe).

**Einschätzung:** Mittel bis niedrig: Entwürfe mit den echten CSS-Dateien sind nicht betroffen. Nachführen spätestens mit den neuen Bausteinen aus #69 (Umschalter, Blatt von unten), wie es dessen DoD ohnehin verlangt.

### 2026-11-08 — Secret-Scan scheitert, wenn GitHub den gitleaks-Download kurz verweigert

**Thema:** CI

**Fundort:** `.github/workflows/secret-scan.yml`, Schritt *gitleaks installieren* (`curl -sSfL` ohne `--retry`)

**Beobachtung:** Der Scan des Merge-Commits von #66 auf `dev` scheiterte zweimal hintereinander mit `curl: (22) … 504` beim Herunterladen von gitleaks aus den GitHub-Releases, nicht an einem Fund. Der Lauf ist rot, obwohl nichts geprüft wurde.

**Ursprung:** Merge von #66 nach `dev` (Konzept Gruppenphase).

**Einschätzung:** Niedrig: Wiederholen hilft, sobald GitHub wieder antwortet. `curl --retry 3 --retry-all-errors` würde kurze Störungen abfangen; zu prüfen, ob das den Prüfsummen-Schritt berührt.

### 2026-11-08 — Automatische Pushes zu CM-Resultaten und Restzeit haben keine Anforderung

**Thema:** Benachrichtigungen

**Fundort:** `docs/superpowers/specs/2026-11-08-cm-gruppenphase-design.md` (*Rund um die Kategorieseite*, *Grenzen und Sonderfälle*), `docs/superpowers/specs/2026-11-06-mitteilungen-design.md` («Kein automatischer Push»), A-ANMELDUNG-08

**Beobachtung:** Das Konzept zu #66 enthält Push-Texte («Neues Resultat in deiner Gruppe …», «Noch 7 Tage Gruppenphase …»). #63 verschickt nur per Knopf, A-ANMELDUNG-08 deckt nur neue Spiele und einen geänderten Spielplan. Für automatische Pushes zu Resultaten und Restzeit gibt es keine Anforderung und kein Issue.

**Ursprung:** Review (`cas-reviewer`) des Konzepts zu #66.

**Einschätzung:** Mittel bis niedrig: fällt erst mit CM-Betrieb ins Gewicht. Braucht dann eine eigene Anforderung (Auslöser, Zeitgeber, Einstellung des Spielers); Push hat beim Projektleiter Vorrang vor Mail.
