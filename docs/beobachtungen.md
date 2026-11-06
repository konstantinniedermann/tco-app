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

### 2026-11-06 — CI: langsamer Ubuntu-Spiegel macht den E2E-Lauf rot, auch nach dem Fix der apt-Sperre

**Thema:** Betrieb

**Fundort:** `.github/workflows/check.yml`, Job «E2E (Playwright)», Schritt «Systempakete für die Browser» (`playwright install-deps`, höchstens 8 Minuten)

**Beobachtung:** Lauf 42186755560 auf `dev` (Merge 0.5.2): Die Paketlisten kamen in einer Sekunde, danach lieferte `azure.archive.ubuntu.com` die Pakete im Minutentakt (Get:2 bis Get:6 in gut 5 Minuten, dann nichts mehr); nach 8 Minuten brach der Schritt ab. Derselbe langsame Spiegel stand hinter den beiden apt-Sperren vom 05.11. (Läufe 41999966173, 42058627189), also 3-mal in rund 57 Läufen. Der Lauf auf dem Branch eine Viertelstunde vorher brauchte für denselben Schritt 1½ Minuten. Der Fix 6fea09a beseitigt nur die Selbstsperre, nicht den langsamen Spiegel.

**Ursprung:** Beobachtungs-Auswertung vom 06.11.2026, CI nach dem Merge.

**Einschätzung:** Ein Neustart des Jobs hilft meist. Dauerhaft wohl nur ohne apt: den E2E-Job im offiziellen Playwright-Container laufen lassen (Image mit Browsern und Systempaketen) — eine neue Abhängigkeit, braucht Freigabe. Alternativ apt mit eigenem Zeitlimit je Verbindung und einem zweiten Versuch, der den ersten sicher beendet (`sudo timeout …`).

**Entscheid Nutzer (06.11.2026):** vorerst nichts ändern, Container allenfalls später. Abwägung: deutlich stabiler (kein Ubuntu-Download mehr), kaum schneller (der Pull des Images frisst den Gewinn grösstenteils), Image-Version muss mit Playwright mitgezogen werden.

### 2026-11-06 — make check baut die App doppelt: einmal selbst, einmal im Webserver der E2E-Tests

**Thema:** Betrieb

**Fundort:** `Makefile` (`check`: `npm run build`, dann `make e2e`), `playwright.config.ts` (`webServer.command`: `npm run build && …`)

**Beobachtung:** `make check` baut die App mit `npm run build` und startet danach die E2E-Tests, deren Webserver noch einmal `npm run build` ausführt. In der CI baut jeder der drei E2E-Jobs ebenfalls selbst. Kostet lokal geschätzt 20–30 s pro voller Prüfung.

**Ursprung:** Analyse, warum Merges lange dauern (Branch `feat/schnellere-merges`).

**Einschätzung:** Kleine Ersparnis; ein Umbau müsste sicherstellen, dass die E2E-Tests nie gegen einen veralteten Build laufen. Erst angehen, wenn die Prüfdauer wieder stört.

### 2026-11-06 — «Importing a module script failed» lokal in make check: zwei rote von drei vollen Läufen

**Thema:** Betrieb

**Fundort:** Profil `iphone` (WebKit), `tests/e2e/verwaltung.test.ts:212` (SI-08) und `tests/e2e/anlass.test.ts:158` (A-ANLASS-01); Seitenfehler-Sammlung `fehler`

**Beobachtung:** Lokal mit 5 Workern zweimal am selben Vormittag rot, jeweils nur durch den Seitenfehler «TypeError: Importing a module script failed.»; einzeln mit `--repeat-each 5` grün, der dritte volle Lauf grün. Branch ohne App-Code. Das Archiv (Eintrag vom 04.11.) zählt nur CI-Läufe; lokal kostet jeder Fehlversuch ein ganzes `make check` und verlängert so den Merge.

**Ursprung:** Branch `feat/schnellere-merges`, Nachweisläufe von `make check`.

**Einschätzung:** Vermutlich derselbe Wettlauf wie im archivierten Thema, unter lokaler Last mit mehr Workern häufiger. Der Trigger im Archiv zählt nur CI; lokal wäre eine eigene Regel zu überlegen (z. B. den Seitenfehler gezielt ignorieren, wenn die Seite danach korrekt geladen ist).

### 2026-11-06 — Grüner Stand: Abwägung «lokal weniger prüfen, CI fängt auf» ohne ADR

**Thema:** Betrieb

**Fundort:** `scripts/pruefungen/gruener-stand.ts`, `.githooks/pre-push`, `docs/ci-cd-und-release.md` («Grüner Stand»)

**Beobachtung:** Der Pre-Push-Hook lässt `make check` aus, wenn derselbe Stand schon grün geprüft wurde und seither nur Doku und die Versionsnummer dazukamen. Die Begründung (Wartezeit gegen lokale Schranke, die CI prüft jeden Push auf `dev`) steht nur in der Release-Doku und im Commit, nicht als ADR. Die Versionsregel bekam für eine Abwägung von ähnlichem Gewicht nachträglich ADR-007.

**Ursprung:** Review (`cas-reviewer`) des Branches `feat/schnellere-merges`.

**Einschätzung:** Ein kurzes ADR wäre konsistent mit ADR-007; nötig wird es spätestens, wenn jemand die Schranke wieder verschärfen oder weiter lockern will.

### 2026-11-06 — npm-Skript e2e:browser wird nirgends mehr aufgerufen

**Thema:** Betrieb

**Fundort:** `package.json` (`e2e:browser`)

**Beobachtung:** Die CI installiert Systempakete und Browser jetzt pro Gerät direkt über `playwright install-deps`/`install`. `e2e:browser` (beide Browser mit `--with-deps`) ruft weder die CI noch das Makefile noch die Doku auf.

**Ursprung:** Review (`cas-reviewer`) des Branches `feat/schnellere-merges`.

**Einschätzung:** Entweder als lokaler Einrichtungsbefehl in README/Makefile nennen oder entfernen; eine Änderung an `package.json` zählt als Code und bringt eine Versionsnummer, daher mit dem nächsten Code-Merge erledigen.
