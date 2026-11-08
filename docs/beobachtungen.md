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

### 2026-11-08 — Kleinbefunde aus den Reviews von #43 (Etappe 2a Briefe)

**Thema:** App-Oberfläche

**Fundort:** `src/lib/server/admin/briefe.ts`, `src/lib/server/admin/schnittstellen.ts` (`postBriefe`, `postBrief`), `src/routes/verwaltung/briefe/+page.svelte`, `tests/e2e/briefe.test.ts`, `tests/e2e/mitgliedschaft.test.ts`

**Beobachtung:** Aus den Task- und Schluss-Reviews, als «nicht vor dem Merge» eingestuft:
- Tests: kein DB-Test, dass ein Mitglied mit abgelaufener oder veralteter Sitzung in der Liste *Briefe* bleibt; der Doppelklick-Riegel und die Speicherprüfung (RR-04) sind nur auf der Seite *Briefe* per E2E belegt, nicht auf der Mitgliedsseite; der 409-E2E prüft nicht, dass serverseitig kein Code entstand (der DB-Test deckt es); die Rückfrage mit mehreren zurückkehrenden Rollen («die Rollen X, Y») hat keinen E2E; `readFileSync` mit relativem Pfad in `briefe.test.ts`.
- Code: `stelleBriefeAus` zählt `anzahl` bei doppelten IDs falsch (die Schnittstelle weist Doppel mit 400 ab) und öffnet bei leerer Liste eine Transaktion; die Abbildung ok → 200 / sonst 409 steht in `postBriefe` und `postBrief` doppelt; wird ein Mitglied zwischen Lesen und Ausstellen gelöscht, antwortet `postBrief` 409 statt 404.
- Oberfläche: mehr als 1000 gewählte Zeilen ergeben eine allgemeine Störungsmeldung statt eines klaren Hinweises (`MAX_BRIEFE`); eine Antwort mit 1000 Briefen wäre mehrere MB gross.
- Nicht entschieden: Ein Mitglieder-Admin kann für sein eigenes Konto einen Brief-Code ausstellen (RR-10 deckt nur Austritt und Löschen); zwei Admins, die gleichzeitig Serien für dieselben Mitglieder erzeugen, machen den ersten Ausdruck ungültig (folgt aus FR-24).
- `INTEGER_MAX` schützt nur `leseIds`; andere Schnittstellen mit IDs im JSON-Körper wurden nicht darauf geprüft.

**Ursprung:** #43 Etappe 2a, Task-Reviews 2–6 und Schluss-Review.

**Einschätzung:** Alles niedrig, für einen Verein mit 300–500 Mitgliedern unkritisch. Die Testlücken bei Gelegenheit schliessen, die zwei offenen Fragen bei Bedarf dem Projektleiter vorlegen.

### 2026-11-08 — Nach einem 409 bei den Briefen fällt der Fokus auf `body`

**Thema:** App-Oberfläche

**Fundort:** `src/routes/verwaltung/briefe/+page.svelte` («Briefe erzeugen»), `src/routes/verwaltung/mitglieder/[id]/+page.svelte` («Neuen Brief-Code ausstellen»)

**Beobachtung:** Antwortet der Server mit 409, lädt die Seite den neuen Stand; die Taste, die die Rückfrage geöffnet hat, verschwindet dabei, und der Fokus fällt auf `body`. Die Meldung selbst kommt über `role="alert"` an.

**Ursprung:** Review Task 5, #43 Etappe 2a.

**Einschätzung:** Klein, Feinschliff für die Barrierefreiheit: den Fokus nach dem Neuladen auf die Meldung oder den Titel der Karte setzen.

### 2026-11-08 — Briefe-Liste im lokalen E2E über tausend Zeilen, Tests darum langsam

**Thema:** Betrieb

**Fundort:** `tests/e2e/briefe.test.ts`, gemeinsame lokale Datenbank `mytco`

**Beobachtung:** Die Seite *Briefe* zeigt alle aktiven Mitglieder, die MyTCO nie geöffnet haben. Jeder E2E-Lauf legt solche Test-Mitglieder an und räumt sie nicht weg; lokal stehen schon rund 1300 in der Liste. axe und das ganzseitige Bildschirmfoto (über 60 000 px hoch) brauchen dafür so lange, dass die Datei ein Zeitlimit von 90 s braucht. In der CI (frische Datenbank) ist die Liste klein. Dasselbe trifft schon andere Dateien: `mitteilungen.test.ts` «FR-42: allgemeine Mitteilung an den Verein» läuft auf dem iPhone ins 30-s-Limit, weil die Vorschau lokal 10 630 aktive Mitglieder zählt (auch beim Wiederholen rot).

**Ursprung:** #43 Etappe 2a, Aufgabe 4.

**Einschätzung:** Solange die Läufe grün bleiben, abhaken; wächst die Laufzeit weiter, Test-Mitglieder beim Lauf aufräumen oder die lokale Datenbank zurücksetzen.

### 2026-11-08 — Profil: leere Kachel sagt je Feld etwas anderes

**Thema:** App-Oberfläche

**Fundort:** `src/routes/profil/` (Karte *Meine Angaben*), Kacheln Rufname, Klassierung, Telefon, Lizenznummer

**Beobachtung:** Ist ein freiwilliges Feld leer, sagt die Kachel bei Rufname und Klassierung «nicht angegeben», bei Telefon und Lizenznummer «nicht erfasst». Uneinheitlich im Profil.

**Ursprung:** Schlussreview Rufname (#67).

**Einschätzung:** Niedrig, nur Wortwahl. Bei Gelegenheit auf eine Formulierung vereinheitlichen (inkl. Tests und Hilfe).

### 2026-11-08 — Übergabe an #59: Namenssuche und Namensanzeige wiederverwenden

**Thema:** Rufname

**Fundort:** `src/lib/server/namen.ts` (`nameEnthaelt`), `src/lib/ui/Name.svelte`, Spec `docs/superpowers/specs/2026-11-08-rufname-design.md` (Tabelle «Wo der Name erscheint»)

**Beobachtung:** Wer #59 (Partnerwahl im Doppel) nach #67 merged, nutzt für die Partnersuche `nameEnthaelt` und für die Anzeige `<Name>`, nicht eigene Namensbausteine.

**Ursprung:** Schlussreview Rufname (#67).

**Einschätzung:** Hinweis zur Übergabe, kein Fehler; erledigt sich mit dem Merge von #59.

### 2026-11-08 — Turnierleitung am Handy: Namensspalte bricht silbenweise um

**Thema:** Verwaltung, Oberfläche

**Fundort:** `src/lib/verwaltung/Anmeldungsliste.svelte` (Tabelle der Anmeldungen einer Kategorie), Breite 390 px

**Beobachtung:** Die Namensspalte ist so schmal, dass ein Name mit Rufname («Hannes» plus «Nachname, Johannes») in Silben umbricht; die übrigen Spalten nehmen den Platz, die Tabelle scrollt waagrecht.

**Ursprung:** Screenshot im Schlussnachweis Rufname (#67).

**Einschätzung:** Niedrig, die Verwaltung wird meist am Computer genutzt. Bei Gelegenheit der Namensspalte eine Mindestbreite geben oder die Tabelle am Handy als Karten zeigen.

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

**Nachtrag (08.11.2026, Merge von #43 Etappe 2a):** Dieselbe Ursache trifft die Malware-Prüfung: Job *Malware-Prüfung (OSV)* in `check.yml`, Schritt *osv-scanner installieren*, zweimal `curl: (22) … 504` (Lauf 42468002707), auch ein Abruf von Hand bekam 504. Alle übrigen Jobs grün. Der Fix mit `--retry` gehört in beide Workflows.

### 2026-11-08 — Automatische Pushes zu CM-Resultaten und Restzeit haben keine Anforderung

**Thema:** Benachrichtigungen

**Fundort:** `docs/superpowers/specs/2026-11-08-cm-gruppenphase-design.md` (*Rund um die Kategorieseite*, *Grenzen und Sonderfälle*), `docs/superpowers/specs/2026-11-06-mitteilungen-design.md` («Kein automatischer Push»), A-ANMELDUNG-08

**Beobachtung:** Das Konzept zu #66 enthält Push-Texte («Neues Resultat in deiner Gruppe …», «Noch 7 Tage Gruppenphase …»). #63 verschickt nur per Knopf, A-ANMELDUNG-08 deckt nur neue Spiele und einen geänderten Spielplan. Für automatische Pushes zu Resultaten und Restzeit gibt es keine Anforderung und kein Issue.

**Ursprung:** Review (`cas-reviewer`) des Konzepts zu #66.

**Einschätzung:** Mittel bis niedrig: fällt erst mit CM-Betrieb ins Gewicht. Braucht dann eine eigene Anforderung (Auslöser, Zeitgeber, Einstellung des Spielers); Push hat beim Projektleiter Vorrang vor Mail.

### 2026-11-08 — Pre-Push-Hook und `make check` gleichzeitig im selben Worktree: E2E rot

**Thema:** CI

**Fundort:** `.githooks/pre-push` (volle Prüfung samt E2E), `make check`

**Beobachtung:** Ein `git push` lief, während im selben Worktree `make check` auf einer eigenen Datenbank lief. Beide E2E-Läufe gleichzeitig: 19 Tests rot (Verwaltung, Bewegung, Mitgliedschaft, auf allen Geräten), dieselben Tests einzeln danach grün. Ursache nicht geklärt (gemeinsamer Ordner `test-results`, Mailpit oder die gemeinsame DB `mytco` des Hooks).

**Ursprung:** #43 Etappe 2b, Session vom 08.11.2026.

**Einschätzung:** Niedrig: Pushen erst nach grünem `make check` (dann prüft der Hook nicht noch einmal voll). Vielleicht ein Satz im Skill `tco-branching`.

### 2026-11-08 — Einlesen: Übernahme von 2000 Zeilen nur berechnet, nicht mit der DB belegt

**Thema:** Verwaltung, Oberfläche

**Fundort:** `src/lib/server/admin/einlesen.ts` (`liesEin`, je ein Insert für Mitglieder, Konten, Verlauf)

**Beobachtung:** Die Grenze von 2000 Zeilen ist nur beim Lesen der Datei getestet. 2000 × 11 Felder ergeben etwa 22'000 Parameter, PostgreSQL erlaubt 65'535; kein Test legt wirklich 2000 an. Zudem vergleicht die Übernahme nur die Anzahl der neuen Zeilen mit der Vorschau, nicht welche es sind (doppelte Mitglieder verhindert die Datenbank trotzdem).

**Ursprung:** Review (`cas-reviewer`) von #43 Etappe 2b.

**Einschätzung:** Niedrig: Der Verein hat 300–500 Mitglieder. Ein DB-Test mit 2000 Zeilen würde die gemeinsame Test-DB jedes Mal um 2000 Mitglieder wachsen lassen; nur mit eigener DB sinnvoll.

### 2026-11-08 — Kleinbefunde und offene Fragen aus #59 (Etappe 1 Doppel)

**Thema:** App-Oberfläche

**Fundort:** `src/routes/clubmeisterschaft/[id]/+page.svelte`, `src/routes/clubmeisterschaft/[id]/doppel/[kid]/+page.svelte`, `src/lib/server/cm/doppel.ts`, `src/lib/server/cm/anmeldungen.ts`, `src/lib/cm/anzeige.ts`, `src/lib/server/db/schema.ts`, `tests/e2e/cm-doppel.test.ts`, Design-System-Artifact «MyTCO»

**Beobachtung:**
- E2E-Hänger, einmal: «Allein anmelden» blieb gesperrt, die Mails kamen nicht innert 15 s; auf gleichem Stand danach grün. Nicht nachgestellt (Umgebung oder Race).
- Design System «MyTCO»: Es fehlen die Bausteine Trefferliste und Kartenteil aus dem UI-Leitbild (Nachtrag zur Beobachtung «Design System «MyTCO» hinkt dem UI-Leitbild hinterher»).
- Für Etappe 2 bzw. den Projektleiter: Das Login wird nur beim Annehmenden geprüft, nicht beim Anfragenden; die Kontaktdaten eines nach dem Anmeldeschluss Ausgetretenen bleiben für den Partner sichtbar; Ablehnen und Zurückziehen einer Anfrage sind nach dem Schluss serverseitig nicht gesperrt; es gibt keine Obergrenze für Anfragen.
- Aufgeschoben aus den Reviews (Code-Hygiene): CM-Seite gross (rund 1000 Zeilen; Handler-Skelett mehrfach, Kommentarfeld und `FEHLER` doppelt); Fokus-Kleinigkeiten (nach einem Fehler der Suche, nach «Kommentar gespeichert», nach `art-gesperrt`); Fehler fern der Karte (UI-06); wiederholte Sperr- und Prüfblöcke in `doppel.ts` und `anmeldungen.ts`; `bisWartend` dreifach kopiert; `meldeAb` ohne Obergrenze der Neustarts; Schema-Tests ohne Constraint-Namen; `weiterePaare` vergleicht Namen statt IDs; Suche ohne Längenobergrenze.

**Ursprung:** #59 Etappe 1, Task-Reviews, Task-9-Review und Schluss-Review.

**Einschätzung:** Niedrig für den Verein; nichts davon hält den Merge auf. Die Fragen an den Projektleiter mit Etappe 2 (Doppel in der Verwaltung) klären; die Code-Hygiene beim nächsten Umbau der CM-Seite, etwa beim Aufteilen in Komponenten.

### 2026-11-08 — Lokale DB `mytco` wächst durch E2E auf über 11'000 Mitglieder, Pre-Push-Hook wird rot

**Thema:** CI

**Fundort:** `.githooks/pre-push` (volle Prüfung auf der gemeinsamen DB `mytco`), `tests/e2e/mitteilungen.test.ts` («FR-42: allgemeine Mitteilung an den Verein», `pruefeBildschirm`)

**Beobachtung:** Beim Push des Merges von #59 nach `dev` war im Hook ein E2E rot: axe brauchte auf der Vorschau der Mitteilung länger als 30 s (Timeout), auch einzeln wiederholt. Die lokale DB `mytco` hatte 11'332 Mitglieder aus früheren Testläufen. Auf einer frischen DB lief derselbe Stand mit `make check` vollständig grün (328 E2E), die CI ebenso.

**Ursprung:** #59 Etappe 1, Merge nach `dev` am 08.11.2026.

**Einschätzung:** Mittel für die Arbeitsweise: Jede Session kann daran scheitern, ohne Fehler im Code. Denkbar: `make check`/Hook auf einer frisch angelegten DB, oder die Test-Mitglieder in `mytco` regelmässig aufräumen (Verwandt: Beobachtung «Pre-Push-Hook und `make check` gleichzeitig im selben Worktree»).
