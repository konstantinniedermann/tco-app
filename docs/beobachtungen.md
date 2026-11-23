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

Letzte Auswertung: 22.11.2026 (nur Entscheide)

---

## Offen

### 2026-11-21 — make seed legt die Beispiel-GV fest am 19.03.2027 an; danach antwortet niemand mehr

**Thema:** Tests

**Fundort:** `scripts/beispiel-anlass.ts` (`legeBeispielAnlassAn`: `TITEL = 'Generalversammlung 2027'`,
Beginn `2027-03-19T19:30`, Anmeldeschluss `2027-03-16T23:59`); `src/lib/server/anlass/anlaesse.ts`
(`melde` → `geschlossen` nach dem Schluss).

**Beobachtung:** Wie beim Beispielturnier (behoben am 21.11.2026 mit `beispielJahr`) steht die
Beispiel-GV fest im Jahr 2027. Ein frischer `make seed` nach dem 16.03.2027 legt sie in der
Vergangenheit an, und alle Beispielantworten (`melde`, `meldeBeispielAntworten`) ergeben still
`geschlossen`. Der Clubabend rechnet schon relativ zum Seed-Datum (`legeBeispielClubabendAn`).

**Ursprung:** Beobachtungs-Auswertung vom 21.11.2026, Nebenbefund beim Umbau des Beispielturniers.

**Einschätzung:** Vorläufig. Datum relativ zum Seed wie beim Clubabend (Titel mit Jahr, damit ein
zweiter Lauf sie wiederfindet), mit Test; spätestens vor dem 16.03.2027.

**Nachtrag (21.11.2026), dieselbe Ursache:** Die Kategorien des Beispielturniers haben feste
Jahrgangsgrenzen für 2027 (`scripts/beispiel-turnier.ts` → `KATEGORIEN`: «Junioren U18» ab 2009,
«Senioren 45+» bis 1982, «Seniorinnen 40+» bis 1987). Legt `beispielJahr` ab dem 1.6.2027 die CM
2028 an, stimmen Namen und Grenzen um ein Jahr nicht mehr; die Anmeldungen gelingen trotzdem.

### 2026-11-21 — `konto.gesperrt` wird überall gelesen, aber von keinem Code gesetzt

**Thema:** Sicherheit

**Fundort:** `src/lib/server/db/schema.ts` (`konto.gesperrt`, Vorgabe `false`); gelesen u. a. in
`cm/anmeldungen.ts` (`hatLogin`), `admin/rollen.ts`, `admin/briefe.ts`, Login und Passkey;
`admin/mitgliedschaft.ts` → `sperreLogin` (beendet nur Sitzungen und Push-Abos).

**Beobachtung:** `git grep "gesperrt: true"` unter `src/` ohne Tests ist leer: Kein Ablauf setzt die
Spalte. «Login sofort gesperrt» (FR-04, RR-08) wirkt über `mitglied.status`, den Login, Passkey und
Sitzung prüfen. Abfragen, die nur `hatLogin` prüfen (z. B. `offeneAnfragenAn`), sehen ein
ausgetretenes Mitglied darum als «mit Login»; heute ohne Folge, weil Austritt und Vormerken seine
Anfragen löschen. FR-55 und das Fachmodell nennen «Konto gesperrt» als eigenen Zustand.

**Ursprung:** Beobachtungs-Auswertung vom 21.11.2026, Nebenbefund beim Prüfen der offenen
Partner-Anfragen (jener Eintrag ist verworfen).

**Einschätzung:** Vorläufig. Entweder eine geplante Sperre durch den Admin (#43?), dann bleibt die
Spalte; oder sie ist ein Überbleibsel, dann Doku und Abfragen auf `mitglied.status` ausrichten.

### 2026-11-22 — Unter Last scheitern Tests an der Vorgabe-Zeitgrenze von 5 s, zuletzt ein Seed-Test

**Thema:** Tests

**Fundort:** `tests/scripts/beispiel-turnier.db.test.ts` («A-TURNIER-01: Ist eine Beispielkategorie lokal abgesagt …», ohne eigene Zeitgrenze); im Pre-Commit-Hook wechselnd `src/lib/server/routen.test.ts`, `scripts/importrichtung.test.ts`, `scripts/design-importe.test.ts`, `scripts/migrate.test.ts`.

**Beobachtung:** Während einer parallelen Session und eines Spiels (Load 15–30) scheiterte `make check` zweimal mit 540–650 roten Tests («Connection terminated due to connection timeout» zur lokalen Datenbank) und der Pre-Commit-Hook viermal an wechselnden Tests mit 5 s. Bei Load um 9 blieb nur der Seed-Test oben rot (5 s); seine zwei Geschwister haben seit bb322e0 schon 20 s. Einzeln liefen alle grün.

**Ursprung:** #81 Teil 3a, Session vom 22.11.2026.

**Einschätzung:** Kein Fehler im Code. Der Seed-Test bräuchte wohl dieselben 20 s wie seine Geschwister (Minuten-Fix). Für den Rest ist offen, ob die Vorgabe-Zeitgrenze für Tests mit Kindprozessen steigen soll oder ob «kein schwerer Lauf parallel» genügt.

**Nachtrag 23.11.2026 (#81 Teil 3b):** `make check` wieder 9 rot bei Load 8–14, während eine andere Session E2E laufen liess: vier Interclub-DB-Tests (`abruf`, `import`, `import-bericht`) an 5 s, dazu der Seed-Test mit Folgefehlern (Aufräumen scheitert an Fremdschlüsseln, nächste Tests sehen alte Zeilen). Einzeln 140/140 grün, der zweite volle Lauf bei Load 2 ganz grün.

### 2026-11-23 — Themen, gültige Sitzungen und Passkeys werden an drei Stellen fast gleich geladen

**Thema:** Code

**Fundort:** `src/lib/server/admin/mitglied-einstellungen.ts` (`ladeMitgliedEinstellungen`), `mitglieder.ts` (`ladeMitglied`, `gueltigeSitzungen`), `auskunft.ts` (`ladeAuskunft`).

**Beobachtung:** `ladeMitglied` fragt die gültigen Sitzungen zweimal ab (für `login` und für `einstellungen`) und liest die Themen-Spalten nochmals, obwohl die Konto-Zeile schon geladen ist. `ladeAuskunft` baut Themen, Sitzungen und Passkeys fast gleich nach und verwirft dabei das Ergebnis aus `ladeMitglied`. Die Regel «gültiges Gerät» steht so an drei Stellen.

**Ursprung:** Review der Karte «Einstellungen» (Verwaltung), Session vom 23.11.2026.

**Einschätzung:** Kein Fehler, kleine Datenmengen. Beim nächsten Umbau der Auskunft `ladeAuskunft` auf `detail.einstellungen` stützen und die Sitzungsabfrage zusammenlegen.

### 2026-11-23 — E2E der Karte «Einstellungen» prüft Passkey-Liste und «Kein Gerät angemeldet.» nicht

**Thema:** Tests

**Fundort:** `tests/e2e/verwaltung.test.ts` («Einstellungen: …»), `src/lib/verwaltung/Einstellungen.svelte`.

**Beobachtung:** Der E2E deckt Themen, zwei Geräte (Push an/aus) und «Kein Passkey.» ab. Die Zeile eines Passkeys («iPhone · eingerichtet am … · zuletzt benutzt am …») und der Fall ohne Gerät sind nur in der Datenschicht geprüft (`mitglied-einstellungen.db.test.ts`), nicht in der Anzeige.

**Ursprung:** Review der Karte «Einstellungen» (merge-reviewer), Session vom 23.11.2026.

**Einschätzung:** Geringes Risiko, reine Textzweige. Bei der nächsten Änderung an der Karte einen Passkey per E2E-Hilfe anlegen und beide Zweige mitprüfen.

### 2026-11-23 — Interclub-Übersicht zeigt nur die Junioren, wenn deren neue Saison vor den Aktiven da ist

**Thema:** Interclub

**Fundort:** `src/lib/server/interclub/ansicht.ts`, `ladeUebersicht` (neueste Saison über IC und JIC zusammen).

**Beobachtung:** Die Übersicht nimmt die neueste Saison über beide Wettbewerbe. Holt der Abruf im Frühling den Junioren-Interclub des neuen Jahres vor dem Interclub der Aktiven (er holt je Wettbewerb), zeigt die Übersicht bis zum Import der Aktiven nur die Junioren. Für die Liste der gefolgten Teams im Profil ist das in #81 Teil 3b behoben (neueste Saison je Wettbewerb).

**Ursprung:** Final-Review #81 Teil 3b, Session vom 23.11.2026.

**Einschätzung:** Vorübergehend, meist nur Stunden bis Tage im Frühling. Gleiche Regel wie im Profil (je Wettbewerb) wäre ein kleiner Fix; zusammen mit Hinweis 5 aus #81 («Form 2027 im Frühling prüfen») ansehen.

### 2026-11-23 — Andere lange Tabellen der Verwaltung scrollen am PC in ihrer Box, Spaltentitel kleben nicht

**Thema:** Oberfläche

**Fundort:** `src/lib/design/pc-layout.css` (`.tabelle-lang`), Tabellen in `src/routes/verwaltung/` (Verlauf, Briefe, Anmeldungslisten, Anlass-Antworten).

**Beobachtung:** Nur die Mitgliederliste hat klebende Spaltentitel (`.tabelle-lang`). Die übrigen Tabellen bleiben eigene Scrollbereiche; scrollt man eine lange Liste, verschwinden ihre Spaltentitel. Dazu war die Mitgliederliste mit langen E-Mails breiter als ihr Platz, obwohl das Leitbild sagt, Tabellen passten ab `60rem`. Bei anderen Tabellen ist das nicht geprüft.

**Ursprung:** Rückmeldung des Projektleiters zur Mitgliederliste, Branch fix/verwaltung-rueckmeldung.

**Einschätzung:** `.tabelle-lang` auf weitere lange Listen übertragen, jeweils mit `.zelle-dehnbar` und einem E2E im schmalsten PC-Fenster. Passt eventuell zu #92 (Spalten sortieren und ziehen).

### 2026-11-23 — Folgen-Schalter: drei kleine Lücken auf Teamseite und Profil

**Thema:** Oberfläche

**Fundort:** `src/routes/interclub/[id]/+page.svelte`, `src/lib/push/Benachrichtigungen.svelte`, `tests/e2e/interclub.test.ts`.

**Beobachtung:** (1) Der Link «Push einrichten» auf der Teamseite öffnet `/profil`, die Klappe «Benachrichtigungen» kann dort zu sein; man muss sie selbst finden. (2) Eine Störungsmeldung beim Folgen bleibt je Team gemerkt: Team A → B → A zeigt die alte Meldung von A wieder, bis zum nächsten Umschalten. (3) Die Ansicht («Ansicht als …») ist für den Schalter auf der Teamseite und die Gruppe «Interclub-Teams» im Profil nicht per Test belegt (der Server weist das Speichern ohnehin ab).

**Ursprung:** Reviews #81 Teil 3b, Session vom 23.11.2026 (Ruling: geparkt, Minor).

**Einschätzung:** Kein Fehler mit Folgen. (1) wäre ein Sprung auf die geöffnete Klappe, (2) ein Zurücksetzen beim Teamwechsel, (3) ein kurzer E2E; zusammen unter einer Stunde.

### 2026-11-23 — A-INTERCLUB-01 und -02 stehen auf «geplant», obwohl gebaut

**Thema:** Interclub

**Fundort:** `docs/anforderungen/anforderungen.md` (A-INTERCLUB-01, A-INTERCLUB-02).

**Beobachtung:** Beide Anforderungen sind auf `dev` gebaut, stehen aber auf «geplant». `make docs` verlangt für «umgesetzt» einen Test, der die ID nennt; keiner tut das bisher.

**Ursprung:** Task 6 und merge-reviewer #81 Teil 3b, Session vom 23.11.2026.

**Einschätzung:** Beim Doku-Abgleich vor dem Release klären: Test-Namen um die ID ergänzen und Status setzen, oder bewusst «geplant» lassen, bis #81 geschlossen ist.

### 2026-11-23 — Rollen werden auf der Seite des Mitglieds vergeben, gewünscht ist nur die Seite «Rollen»

**Thema:** Oberfläche

**Fundort:** `src/routes/verwaltung/mitglieder/[id]/+page.svelte` (Klappe «Rollen»), `src/routes/verwaltung/rollen/+page.svelte`.

**Beobachtung:** Der MyTCO-Admin vergibt und entzieht Rollen heute in der Klappe «Rollen» auf der Seite eines Mitglieds; die Seite «Rollen» zeigt nur, wer welche hat. Der Projektleiter möchte Vergeben und Entziehen nur noch über die Seite «Rollen» (sie sieht nur der MyTCO-Admin); der Mitglieder-Admin soll die Rollen in der Mitgliederliste sehen. Die Seiteninfo von «Rollen» beschreibt den heutigen Stand.

**Ursprung:** Freigabe der Texte zu #93, Session vom 23.11.2026.

**Einschätzung:** Umbau von Oberfläche und Rechteprüfung (RR-07, Regel 2 und 3), mit E2E; danach die Seiteninfo von «Rollen» anpassen. Eher ein eigenes Issue.

**Stand:** Mit Zustimmung des Projektleiters als Issue #96 angelegt (23.11.2026).

### 2026-11-23 — Mitteilungen gehen nur an alle oder an Gruppen eines Anlasses; zur Clubmeisterschaft gar nicht

**Thema:** Oberfläche

**Fundort:** `src/lib/mitteilung/auswahl.ts` (`VEREIN_AUSWAHLEN` nur «alle»), Seiten unter `src/routes/verwaltung/turniere/` (kein Mitteilungsformular).

**Beobachtung:** Der Projektleiter beschrieb «Mitteilungen» als Versand an Mitglieder oder Untergruppen, Mitteilungen zu Anlass oder CM über die jeweilige Seite. Heute gibt es Untergruppen nur bei einem Anlass (nach Antwort); eine allgemeine Mitteilung geht an alle aktiven Mitglieder, eine Mitteilung an die Teilnehmenden einer CM gibt es nicht (nur Nachrichten mit einzelnen Mitgliedern).

**Ursprung:** Freigabe der Texte zu #93, Session vom 23.11.2026.

**Einschätzung:** Zwei mögliche Erweiterungen (Empfängergruppen ohne Anlass; Mitteilung an Teilnehmende einer Kategorie bzw. eines Turniers). Gegen `docs/datenschutz.md` prüfen, bevor geplant wird; dann die Seiteninfo von «Mitteilungen» anpassen.

**Stand:** Mit Zustimmung des Projektleiters als Issue #97 angelegt (23.11.2026).

### 2026-11-23 — Rollen werden auf zwei Wegen geschrieben: `setzeRollen` neben `vergibRolle`/`entziehRolle`

**Thema:** Architektur

**Fundort:** `src/lib/server/admin/rollen.ts` (`setzeRollen`, `vergibRolle`, `entziehRolle`), `src/lib/server/admin/erster-admin.ts` (`machAdmin`), `tests/e2e/hilfen/login.ts`.

**Beobachtung:** Seit #96 vergibt und entzieht die Verwaltung Rollen einzeln. `setzeRollen` (ganze Menge mit `vorher`) bleibt nur für das Skript zum ersten Admin und die E2E-Hilfe. Beide Wege enthalten die Regeln zum letzten MyTCO-Admin, zum Ende der «Ansicht als …» und zum Verlauf; eine neue Regel kann an einer Stelle fehlen. Daneben zeigt `docs/ui-mockups/index.html` noch die Taste «Rollen speichern».

**Ursprung:** Review von #96, Session vom 23.11.2026.

**Einschätzung:** `machAdmin` und die E2E-Hilfe auf `vergibRolle` umstellen und `setzeRollen` streichen; die Meldung «inzwischen geändert» des Skripts entfällt dann. Klein, eigener Branch.

### 2026-11-23 — Design System «MyTCO» steht bis auf die Seiteninfo auf dem Stand vom 09.11.

**Thema:** Oberfläche

**Fundort:** Artifact «MyTCO» (Design System, `project/components/bundle.css`, `tokens.json` mit `meta.ref` dev@6b764e8), `src/lib/design/`.

**Beobachtung:** Das Design System wurde zuletzt am 09.11. abgeglichen. Seither ist `basis.css` in mehrere Dateien unter `src/lib/design/` aufgeteilt, und neue Bausteine sind dazugekommen (z. B. Umschalter, Resultatzeile, Partie, Rangliste, Sprechblase). In #93 kam nur die Seiteninfo dazu, angehängt an `bundle.css`. Entwürfe auf dem Design System binden darum besser die echten Stil-Dateien aus dem Repo ein, wie in #93.

**Ursprung:** Nachführen des Design Systems in #93, Session vom 23.11.2026.

**Einschätzung:** Ein ganzer Abgleich (Bausteine, Tokens, `bundle.css` aus den aufgeteilten Dateien) lohnt sich vor dem nächsten grösseren Oberflächen-Entwurf; sonst genügt es, wie in #93 die Repo-Dateien einzubinden.
