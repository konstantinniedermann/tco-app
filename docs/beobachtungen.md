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

### 2026-11-03 — SMTP-Verbindung: Zertifikatsprüfung abschaltbar, kein eigenes Zeitlimit

**Thema:** Betrieb

**Fundort:** `src/lib/server/einstellungen.ts` → `tlsErzwungen`, Mail-Versand über `MYTCO_SMTP_URL`.

**Beobachtung:** `tlsErzwungen` prüft nur das Schema und `requireTLS`. nodemailer übernimmt weitere Optionen aus der Query der URL; `tls.rejectUnauthorized=false` schaltete die Prüfung des Zertifikats ab. Ein eigenes Zeitlimit für SMTP fehlt (Vorgaben von nodemailer: 2 Minuten Verbindungsaufbau, 10 Minuten Leerlauf); ein hängender Mailserver verzögert auf Test den Schritt «testdaten laden».

**Ursprung:** #39, Final-Review.

**Einschätzung:** Tritt nur bei absichtlicher Fehleinstellung durch den Betreiber auf. Vorläufig: Einstellungssache des Betreibers; in `betrieb/README.md` dokumentieren, wenn der Mail-Anbieter gewählt ist (K-11).

### 2026-11-03 — Datenbank-Container loggen bei scheiterndem Einspielen Werte

**Thema:** Betrieb

**Fundort:** `docker logs` der db-Dienste (Test und Live), Einspielen in `betrieb/bin/wiederherstellen`.

**Beobachtung:** Scheitert das Einspielen, schreibt der Postgres-Server in sein eigenes Log `DETAIL: Failing row contains (…)` und `STATEMENT: COPY …` mit Werten aus der Datenbank. Das liegt ausserhalb von `protokoll.log`, das die Werte bewusst nicht enthält.

**Ursprung:** #39, Review Task 6.

**Einschätzung:** Betrifft DS-06 und die zeitliche Begrenzung der Docker-Logs (offener Teil von #39, Rotation nach Zeit). Vorläufig: beim Einrichten des Servers klären, ob `log_error_verbosity` oder die Log-Aufbewahrung reicht.

### 2026-11-03 — Nächtliche Sicherung nimmt keine Sperre gegenüber `wiederherstellen`

**Thema:** Betrieb

**Fundort:** `betrieb/bin/sichern` (`forget --prune`), `betrieb/bin/wiederherstellen` (zwischen `snapshot suchen` und `einspielen`).

**Beobachtung:** Der nächtliche `sichern`-Lauf nimmt keine Sperre. Läuft er zwischen `snapshot suchen` und `einspielen` von `wiederherstellen`, kann sein `forget --prune` einen knapp 30 Tage alten, gerade gewählten Lauf entfernen.

**Ursprung:** #39, Review Task 6.

**Einschätzung:** Selten (enges Zeitfenster, nur bei ältestem Lauf). Vorläufig: bewusst nichts tun, wieder ansehen, wenn Wiederherstellungen häufiger werden.

### 2026-11-03 — `make release-check`: zwei Restlücken aus dem Review

**Thema:** Arbeitsablauf

**Fundort:** `scripts/pruefungen/release.ts` (`pruefeRelease`, Tag-Abfrage im Hauptteil).

**Beobachtung:** (1) Die Version, die gerade released wird, ist von der Marker-Prüfung ausgenommen. Fehlt bei ausgeschaltetem Live der Marker «nicht ausgeliefert», meldet die Prüfung das erst beim nächsten Release. (2) Gezählt werden die lokalen Tags: Lokal gesetzte Tags zählen mit, auf GitHub gelöschte bleiben lokal stehen.

**Ursprung:** cas-reviewer zu `feat/release-abgleich`, bewusst nicht umgesetzt.

**Einschätzung:** (1) liesse sich mit `gh variable get AUSLIEFERUNG_LIVE` schliessen, dann hinge die Prüfung aber an GitHub. (2) ist ohne Folgen, solange nur die CI Tags setzt. Wieder ansehen, wenn Live eingeschaltet wird.

### 2026-11-03 — Releases nur mit Werkzeug-Änderungen erzwingen eine neue Version

**Thema:** Arbeitsablauf

**Fundort:** `scripts/pruefungen/release.ts` (Regel aus `nur-doku.ts`), Skill `tco-branching` Schritt 4a.

**Beobachtung:** `make release-check` verlangt eine höhere Version, sobald seit `main` irgendeine Datei ausser Doku geändert wurde, also auch bei Skripten, Makefile oder Workflows, die die App nicht verändern. Mit dem Merge von `feat/release-abgleich` gilt das bereits für das nächste Release.

**Ursprung:** Einführung von `make release-check`.

**Einschätzung:** Die Regel ist gleich wie in der CI (Code-Jobs, Auslieferung), darum bewusst so gewählt. Führt das zu vielen Korrekturversionen ohne Änderung an der App, eine engere Regel prüfen (z. B. nur Dateien, die ins Image gehen).

### 2026-11-03 — Die Seite `/datenschutz` gibt es nicht, Brief und Erklärung verweisen darauf

**Thema:** Datenschutz

**Fundort:** `src/lib/server/brief/brief.ts` (Link `<Adresse>/datenschutz`), `docs/datenschutzerklaerung.md`, Login-Seite, DS-09, Matrix in `docs/rollen-und-rechte.md`.

**Beobachtung:** Der Brief und die Datenschutzerklärung nennen `<Adresse>/datenschutz`. Unter `src/routes` gibt es die Seite nicht, und die Login-Seite verlinkt sie nicht, obwohl DS-09 und die Matrix von Rollen und Rechte sie vorsehen.

**Ursprung:** Doku-Abgleich vor Release 0.3.0.

**Einschätzung:** Blockiert den Versand echter Briefe an Mitglieder, nicht das Release ohne Server. Vor #40 (Testgruppe) bauen.

### 2026-11-03 — `ausliefern` auf Test: Fehler nach `down --volumes` führt nicht zum Rückfall

**Thema:** Betrieb

**Fundort:** `betrieb/bin/ausliefern`, Schritte «migrieren» und «testdaten laden».

**Beobachtung:** Auf Test wird die Datenbank vorher mit `down --volumes` verworfen. Scheitert danach «migrieren» oder «testdaten laden», endet der Lauf mit `scheitern`, nicht mit `rueckfall`; Test bleibt ohne laufende App. Die Doku sagt nur «scheitert».

**Ursprung:** Doku-Abgleich vor Release 0.3.0.

**Einschätzung:** Auf Test vertretbar, da es keine Daten zu schützen gibt. Beim Inbetriebnehmen (#39) entscheiden und die Doku entsprechend präzisieren.

### 2026-11-03 — `probe` ignoriert Zusatzargumente still

**Thema:** Betrieb

**Fundort:** `betrieb/bin/probe` gegen `betrieb/bin/sichern` und `betrieb/bin/wiederherstellen`.

**Beobachtung:** `sichern` und `wiederherstellen` weisen überzählige Argumente mit `fehler` ab, `probe` ignoriert sie ohne Meldung.

**Ursprung:** Doku-Abgleich vor Release 0.3.0.

**Einschätzung:** Niedrig. Bei der nächsten Änderung an `probe` angleichen.

### 2026-11-03 — Live-Sperre und `geheim.env`: zwei Restlücken

**Thema:** Betrieb

**Fundort:** `betrieb/bin/lib.sh` → `mail_umleitung_gesetzt`, `compose()`; `betrieb/nachweis/rauchtest.sh`.

**Beobachtung:** Ein Wert in Anführungszeichen über zwei Zeilen (`MAIL_NUR_AN="` und die Adresse auf der nächsten Zeile) sieht die Sperre als leer; ob Compose so einen Wert durchreicht, ist nicht geprüft. Ausserdem ist nur `MAIL_NUR_AN` vor der Shell-Umgebung geschützt (`unset`): Andere Werte aus `geheim.env` (z. B. `ORIGIN`, `POSTGRES_PASSWORD`) kann eine gesetzte Shell-Variable beim Aufruf weiterhin überschreiben. `rauchtest.sh` lädt `lib.sh` nicht (nur lokal).

**Ursprung:** #39, Final-Review und Nachprüfung der Korrekturrunde.

**Einschätzung:** Beides nur bei absichtlich verbogener Datei oder Shell auf dem Server. Beim Härten des Servers (#39) prüfen, ob `compose()` die Werte von `geheim.env` generell vor der Shell schützen soll.
