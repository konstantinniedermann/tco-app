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

### 2026-11-23 — Doku-Prüfung erkennt kaputte Anker in Links nicht

**Thema:** Tests

**Fundort:** `scripts/check-docs.sh` (Schritt «Relative Links in Markdown», `make docs`)

**Beobachtung:** Die Prüfung meldet nur Links auf Dateien, die fehlen. Ein Link auf einen Abschnitt, der umbenannt oder gelöscht wurde (`testgruppe.md#bereit-für-lauf-1` nach dem Umbau der Testgruppe), bleibt grün. Gefunden hat das nur das Review von Hand.

**Ursprung:** Review des Branches zum Probelauf der Testgruppe (#40)

**Einschätzung:** Klein: Überschriften je Datei in Anker umrechnen (GitHub-Schema, Umlaute bleiben) und `datei.md#anker` dagegen prüfen. Historische Pläne unter `docs/superpowers/` müssten ausgenommen werden, sie verweisen bewusst auf alte Stände.

### 2026-11-23 — Dialog «Von Hand anmelden» im Doppel ist höher als ein iPhone-Fenster

**Thema:** Oberfläche

**Fundort:** `src/lib/verwaltung/DoppelListe.svelte` (Rückfrage «Von Hand anmelden»), Seite
`verwaltung/turniere/[id]/kategorien/[kid]` einer Doppel-Kategorie.

**Beobachtung:** Schon vor #94 ist der Inhalt des Dialogs auf dem iPhone höher als das Fenster
(891 px Inhalt in 617 px, Android 1017 in 797 px). Nach dem Klick auf «Anmelden» schiebt die
Liste der Warnungen die Knöpfe aus dem sichtbaren Bereich; erreichbar sind sie nur durch Scrollen
im Dialog.

**Ursprung:** #94, beim E2E der Doppel-Aktionen mit dem Häkchen «Spieler benachrichtigen».

**Einschätzung:** Vorläufig. Bedienbar, aber leicht zu übersehen; denkbar: Warnungen über den
Feldern zeigen oder nach der Warnung zu den Knöpfen scrollen.

### 2026-11-23 — `neue-version.test.ts` auf dem iPhone einmal rot unter Last im vollen `make check`

**Thema:** Tests

**Fundort:** `tests/e2e/neue-version.test.ts`, Projekt `iphone` (WebKit).

**Beobachtung:** Im vollen `make check` schlug der Test einmal fehl mit «Importing a module script
failed»; einzeln lief die Datei danach 9/9 grün. Der Lauf fiel in eine Zeit hoher Rechnerlast.

**Ursprung:** #94, Prüflauf vor dem Abschluss.

**Einschätzung:** Vorläufig. Vermutlich ein Ladefehler von WebKit unter Last (wie die bekannten
Zeitgrenzen); erst nachgehen, wenn es sich wiederholt.

### 2026-11-23 — Push-Nachweis: Abo ging in einem Lauf verloren, Meldung kam per E-Mail

**Thema:** Tests

**Fundort:** Lokaler Push-Nachweis (Playwright mit Chrome, `getNotifications()`), Meldung der
Verwaltung nach FR-56; `src/lib/server/mitteilung/versand.ts` (`sendePush`).

**Beobachtung:** Im ersten Lauf ging das Push-Abo verloren, und die Meldung fiel auf die E-Mail
zurück. Ursache unbekannt, vermutlich eine Antwort 404/410 des Push-Diensts, nach der das Abo
gelöscht wird. Der zweite Lauf, unverändert, lieferte den Push wie erwartet.

**Ursprung:** #94, Push-Nachweis der Meldungen.

**Einschätzung:** Vorläufig. Der Rückfall auf E-Mail wirkt wie vorgesehen; ob der Push-Dienst das
frische Abo zurückwies oder der Testbrowser es verlor, ist offen. Beim nächsten Nachweis die
Antwort des Push-Diensts mitschreiben.

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

**Nachtrag 23.11.2026 (Docker bei Bedarf):** Dasselbe Bild bei Load 10–17, während eine andere Session lief: 11 rot (`abruf`, `import`, `import-bericht`, dazu der Seed-Test mit Fremdschlüssel-Folgefehlern). Einzeln 45/45 grün, der zweite volle Lauf bei Load 17 ganz grün. Weil `make check` rot war, wies der Pre-Push-Hook auch den Push des Branches ab.

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

**Nachtrag 2026-11-23 (#92):** Verlauf und Briefe haben jetzt die *Tabellen-Steuerung* (Box scrollt, Titel kleben in der Box). Offen bleiben Anmeldelisten, Anlass-Antworten, Fairgate, Posteingang und Mitteilungen.

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

### 2026-11-23 — Neuer E2E zum Selbst-Entzug einmal auf Android in der CI rot, Ursache offen

**Thema:** Tests

**Fundort:** `tests/e2e/verwaltung.test.ts` («#96: MyTCO-Admin entzieht sich die Rolle und landet auf seiner übrigen Verwaltung»).

**Beobachtung:** Im ersten CI-Lauf auf dem Branch von #96 war nach dem Klick auf «Entziehen» keine Rückfrage offen, die Seite stand oben (Zeitgrenze 30 s). In den zwei folgenden CI-Läufen grün (einer mit `spur=true`), lokal 20-mal grün, auch mit 25 weiteren MyTCO-Admins und auf 3 s gestreckter Aufklapp-Animation. Der Test bestätigt jetzt erst, wenn die Rückfrage den eigenen Namen nennt.

**Ursprung:** CI-Lauf 45170920154 auf `feat/issue-096`, Session vom 23.11.2026.

**Einschätzung:** Tritt es wieder auf, den Lauf mit `-f spur=true` wiederholen und den Trace auswerten.

### 2026-11-23 — Design System «MyTCO» steht bis auf die Seiteninfo auf dem Stand vom 09.11.

**Thema:** Oberfläche

**Fundort:** Artifact «MyTCO» (Design System, `project/components/bundle.css`, `tokens.json` mit `meta.ref` dev@6b764e8), `src/lib/design/`.

**Beobachtung:** Das Design System wurde zuletzt am 09.11. abgeglichen. Seither ist `basis.css` in mehrere Dateien unter `src/lib/design/` aufgeteilt, und neue Bausteine sind dazugekommen (z. B. Umschalter, Resultatzeile, Partie, Rangliste, Sprechblase). In #93 kam nur die Seiteninfo dazu, angehängt an `bundle.css`. Entwürfe auf dem Design System binden darum besser die echten Stil-Dateien aus dem Repo ein, wie in #93.

**Ursprung:** Nachführen des Design Systems in #93, Session vom 23.11.2026.

**Einschätzung:** Ein ganzer Abgleich (Bausteine, Tokens, `bundle.css` aus den aufgeteilten Dateien) lohnt sich vor dem nächsten grösseren Oberflächen-Entwurf; sonst genügt es, wie in #93 die Repo-Dateien einzubinden.

**Nachtrag 2026-11-23 (#92):** Auch der Baustein *Tabellen-Steuerung* fehlt im Design System; der Entwurf zu #92 band ebenfalls die Stil-Dateien aus dem Repo ein.

### 2026-11-23 — Kaltstart von Docker Desktop über make db noch nicht echt ausprobiert

**Thema:** Tests

**Fundort:** `scripts/docker-bereit.sh` (Ziel `voraussetzungen-docker` im `Makefile`).

**Beobachtung:** Ist Docker nicht erreichbar, startet das Skript Docker Desktop mit `open -ga Docker` und wartet bis 120 s. Belegt sind nur die Abzweigungen (Test mit Attrappen) und der Fall «Docker läuft schon». Den echten Kaltstart (Docker Desktop beendet, dann `make db`) hat niemand ausprobiert, weil eine parallele Session die gemeinsame Datenbank nutzte.

**Ursprung:** Review des Branches `feat/docker-bei-bedarf`, Session vom 23.11.2026.

**Einschätzung:** Einmal von Hand prüfen, wenn keine Session läuft: Erwartet sind «Docker Desktop startet …», danach laufende DB und Mailpit. Reicht die Frist nicht oder öffnet sich das Fenster von Docker Desktop, im Skript nachziehen.

### 2026-11-23 — Tabellen-Steuerung: kleine Lücken aus dem Review von #92

**Thema:** Oberfläche

**Fundort:** `src/lib/verwaltung/Spaltentitel.svelte`, `tabellen-stand.svelte.ts`, `src/routes/verwaltung/{mitglieder,briefe}/+page.svelte`, `src/lib/design/verwaltung.css`.

**Beobachtung:** Aus dem Review von #92, bewusst nicht im Branch behoben: Der Aufklapper wird nicht an den Bildschirmrand geklemmt (200 %, breiter Aufklapper «Was») und kann einen Moment bei (0,0) aufblitzen; die Leseansicht der Briefe rechnet die Auswahlspalte in die Gesamtbreite (3,5 rem zu breit); die Breite wird bei jeder Mausbewegung statt beim Loslassen gespeichert; die Textfelder haben kein `maxlength` (der Verlauf weist über 100 Zeichen mit «Störung» ab); eine Suche aus dem Gedächtnis zeigt kurz die ungesuchte Liste; ein am Handy gesetzter Filter «Status» wirkt nach dem Verbreitern weiter; kein E2E für einen Filter aus der Adresse auf dem Handy. Am PC kürzen sich bei 1280 px die Titel «Nummer» und «Jahrgang» zu «Num…» und «Jahrga…».

**Ursprung:** Review des Branches `feat/issue-092`, Session vom 23.11.2026.

**Einschätzung:** Je Minuten bis eine Stunde; gebündelt in einem Durchgang, wenn die Tabellen-Steuerung auf weitere Listen kommt. Die gekürzten Titel könnte ein leiser Pfeil nur bei Zeigen/Fokus beheben (Leitbild-Entscheid).

### 2026-11-23 — CI: Seiteninfo von «Für Fairgate» läuft auf dem iPhone bei 200 % um 1 px über

**Thema:** Tests

**Fundort:** `tests/e2e/verwaltung.test.ts` («#93: jede Menüseite der Verwaltung erklärt sich in ihrer Seiteninfo»), Seite `/verwaltung/fairgate`.

**Beobachtung:** Der Job «E2E (iphone)» der CI ist rot: Bei 200 % Schrift ist die Seiteninfo auf `/verwaltung/fairgate` 1 px breiter als ihr Inhalt erlaubt (`scrollWidth - clientWidth` = 1 statt 0). Lokal und am PC und auf Android grün. Schon auf `dev` vor dem Merge von #92 rot (Lauf auf 41a2980), ebenso auf dem Branch von #92.

**Ursprung:** CI-Lauf auf `feat/issue-092`, Session vom 23.11.2026.

**Einschätzung:** Langes Wort in der Seiteninfo von «Für Fairgate» bricht in WebKit/Linux nicht um (Silbentrennung fehlt dort?). Mit `gh workflow run check.yml --ref dev -f spur=true` den Trace holen. Nachtrag: Auch in allen drei CI-Läufen auf dem Branch von #96 rot; ein Trace liegt im Artefakt `test-results-iphone` des Laufs 45172782300 (`spur=true`). Nachtrag 2: Ursache war der Textblock der Seiteninfo als Flex-Kind ohne `min-width: 0` (Linux-Systemschrift breiter, keine Silbentrennung); behoben mit `fix/seiteninfo-schmal`, CI auf dem Branch grün.

### 2026-11-23 — Caddy-Fehlerlog könnte die Abfrage samt Suchtext enthalten

**Thema:** Sicherheit

**Fundort:** `betrieb/caddy/Caddyfile` (globaler `log`-Filter, Zeilen 8–18).

**Beobachtung:** Der Filter entfernt IP-Adressen, aber nicht die angefragte Adresse mit Query. Schreibt Caddy zu einer Anfrage einen Fehler, könnten `suche=` (Mitgliederliste, schon heute) sowie `wer=` und `name=` (Verlauf, seit #92) mit Namensteilen im Log stehen.

**Ursprung:** merge-reviewer zu #92, Session vom 23.11.2026.

**Einschätzung:** Kein neues Risiko von #92; prüfen, ob der Filter auch `request>uri` kürzen oder die Query entfernen soll (DS-06: Logs ohne Inhalte).


### 2026-11-23 — Suche beim Vergeben einer Rolle zeigt Angaben der Clubmeisterschaft

**Thema:** Oberfläche

**Fundort:** `src/routes/verwaltung/rollen/+page.svelte` (Dialog «… vergeben»), `src/lib/verwaltung/Spielersuche.svelte` (`trefferText`).

**Beobachtung:** Die Seite «Rollen» nutzt die Spielersuche der Clubmeisterschaft. Unter jedem Treffer stehen darum Vermerke wie «Klassierung fehlt · Geschlecht fehlt · Jahrgang fehlt», die für eine Rollenvergabe keine Rolle spielen. Keine neuen Personendaten (der MyTCO-Admin darf sie lesen), nur unpassend.

**Ursprung:** Review von #96, Session vom 23.11.2026.

**Einschätzung:** Spielersuche um eine Wahl für den Text unter dem Namen ergänzen (z. B. nur Mitgliedernummer) oder eine schlanke Mitgliedersuche für die Verwaltung.

### 2026-11-23 — Interclub-Spielberichte werden nach dem ersten Abruf nie aktualisiert, die Datenschutzerklärung verspricht «nicht mehr als Swiss Tennis»

**Thema:** Sicherheit

**Fundort:** `src/lib/server/interclub/import.ts` (`holen`, `alteBerichte`, `setzeAlteBerichteEin`), `faellig.ts`; `docs/datenschutzerklaerung.md` (Abschnitt Interclub), `docs/datenschutz.md` (Begründung für «kein Ausblenden»).

**Beobachtung:** Auf Test und Live holt der Abruf nur frische und fehlende Spielberichte; ein gespeicherter Bericht wird beim Import wieder eingesetzt. Korrigiert oder entfernt Swiss Tennis einen Namen oder eine Partie, bleibt der alte Stand in MyTCO sichtbar. Volle Neuladung nur lokal (`make ic-import`).

**Ursprung:** Doku-Abgleich vor dem Release 0.24.0 (Audit Datenschutz).

**Einschätzung:** Entscheid Projektleiter vor Live: Code angleichen (Berichte der laufenden und letzten Saison regelmässig neu holen, nicht mehr gelieferte löschen) oder Zusage präzisieren («übernimmt den Bericht einmal nach dem Spiel»), dann braucht es einen Korrekturweg von Hand.

### 2026-11-23 — Datenschutz: vier kleine Abweichungen zwischen Code und Zusage

**Thema:** Sicherheit

**Fundort:** `src/lib/server/interclub/faellig.ts` (`ERSTE_SAISON`), `src/lib/server/interclub/folgen.ts`, `src/routes/verwaltung/mitglieder/[id]/auskunft/`, `src/lib/push/Benachrichtigungen.svelte`, `src/lib/verwaltung/tabelle.ts`; `docs/datenschutz.md`, `docs/datenschutzerklaerung.md`.

**Beobachtung:** (1) Der Abruf holt Saisons ab 2021 nach und speichert so auch frühere TCO-Spieler, die keine Mitglieder mehr sind; Zeitraum und ehemalige Spieler nennt keine Doku. (2) `ic_folgen.seit` wird gespeichert, aber nirgends gelesen und fehlt in der Auskunft. (3) Ein gefolgtes Team, das in der neuesten Saison fehlt, bleibt gespeichert, ist im Profil aber unsichtbar und dort nicht abwählbar. (4) Die Verwaltung speichert Spaltenbreiten im `localStorage` (#92); die Erklärung sagt, im Browser liege «nur» Login, E-Mail-Wechsel und Push-Hinweis.

**Ursprung:** Doku-Abgleich vor dem Release 0.24.0 (Audit Datenschutz).

**Einschätzung:** Je beide Wege möglich (Code angleichen / Zusage präzisieren); vor Live klären, zusammen mit der Freigabe der Erklärung (K-06.2).

### 2026-11-23 — Zusammenlegen der Migrationen vor Live trifft Test, das seine Datenbank behält

**Thema:** Architektur

**Fundort:** `docs/ci-cd-und-release.md` (Zwei Schalter, E-08), `docs/adr/adr-013-gemeinsame-bausteine.md`; `scripts/migrate.ts`, `betrieb/bin/ausliefern`, `betrieb/test-neu-aufsetzen`.

**Beobachtung:** E-08 legt die Migrationen unmittelbar vor dem ersten Live zusammen. Test behält seit dem 18.11. seine Datenbank samt Migrationsliste; eine neue erste Migration würde dort gegen bestehende Tabellen laufen und die Auslieferung scheitern lassen, bis jemand den Zähler erhöht. Aus dem Code abgeleitet, nicht ausgeführt.

**Ursprung:** Doku-Abgleich vor dem Release 0.24.0 (Audit Betrieb).

**Einschätzung:** Entscheid Projektleiter: Der Branch, der zusammenlegt, erhöht zugleich `betrieb/test-neu-aufsetzen` (in CI/CD festhalten), oder E-08 fallen lassen.

### 2026-11-23 — Vor «AUSLIEFERUNG_LIVE = an» fehlt eine Liste der Voraussetzungen

**Thema:** Architektur

**Fundort:** `betrieb/README.md` (Einschalten), `docs/ci-cd-und-release.md` (Geheimnisse); `docs/kosten.md` und `docs/betrieb-und-uebergabe.md` (Preis Object Storage).

**Beobachtung:** «Einschalten» nennt für Live nur die Variable. Es fehlen verstreut oder ganz: Geheimnis `SSH_SCHLUESSEL_LIVE` und Live-Eintrag beim Türsteher, `live/geheim.env` ohne `MAIL_NUR_AN` und mit echtem SMTP (K-11.2), `sicherung.env` mit `restic init`, Zusammenlegen der Migrationen (Eintrag oben), Sicherungs-Timer nach der ersten Live-Auslieferung, DNS. Nebenbei: Object Storage steht mit zwei Preisständen in der Doku (2021 pro TiB, 18.11.2026 pro GB und Stunde).

**Ursprung:** Doku-Abgleich vor dem Release 0.24.0 (Audit Betrieb).

**Einschätzung:** Mit #61 (Live) eine Liste «Vor `AUSLIEFERUNG_LIVE=an`» unter «Einschalten» anlegen; Preis einheitlich auf den neueren Stand.

### 2026-11-23 — make seed, make admin und make e2e prüfen die Node-Version nicht

**Thema:** Code

**Fundort:** `Makefile` (Ziele `seed`, `admin`, `e2e` ohne `voraussetzungen`), `scripts/pruefe-node.sh`; README «Lokal starten» («Make und Hooks brechen sonst ab»).

**Beobachtung:** Bei falscher Node-Version enden `seed-lokal.ts`, `admin-festlegen.ts` und `e2e.ts` still mit Exit 0 (`import.meta.main`); ein `make e2e` meldet dann grün ohne einen Test. `make check` ist geschützt.

**Ursprung:** Doku-Abgleich vor dem Release 0.24.0 (Audit Setup).

**Einschätzung:** `voraussetzungen` vor die drei Ziele setzen (Minuten-Fix mit Test); sonst den README-Satz eingrenzen.

### 2026-11-23 — Seiteninfo «Briefe» sagt «Anmeldecode» und «anmelden» statt Login

**Thema:** Oberfläche

**Fundort:** `src/routes/verwaltung/briefe/+page.svelte` (Seiteninfo), auch `src/routes/verwaltung/einlesen/+page.svelte`; `docs/glossar.md` (Login statt Anmelden).

**Beobachtung:** Das Glossar reserviert «Anmeldung» für CM und Anlässe. Die mit #93 freigegebenen Texte sagen «Brief mit Anmeldecode» und «Wer sich nicht mehr anmelden kann».

**Ursprung:** Doku-Abgleich vor dem Release 0.24.0 (Audit App).

**Einschätzung:** Dem Projektleiter vorlegen: «Brief mit Brief-Code» und «Wer sich nicht mehr einloggen kann, holt sich beim Login selbst einen «Code per E-Mail».»

### 2026-11-23 — `make test-pruefung` meldet rote Punkte teils ohne klaren Grund

**Thema:** Tests

**Fundort:** `scripts/test-pruefung.ts` (`ausPlaywright`, Abbruch bei SSH),
`scripts/test-pruefung-server.ts` (`pruefeServer`), `playwright.test-server.config.ts`.

**Beobachtung:** Aus der Review des Prüflaufs, nicht behoben, weil nur die Meldung leidet, nie das
Ergebnis:
- Die Tabelle nennt bei roten Browser-Punkten keinen Grund; er steht nur in der Ausgabe von
  Playwright darüber (erst übernehmen, wenn die Meldung sicher keinen Zugang enthält).
- Kein `actionTimeout`: Ohne Zugang (Formular statt App) wartet jeder Test bis 90 s.
- `MYTCO_TEST_URL` wird nicht auf `test.…` geprüft.
- Der SSH-Abbruch nennt immer `ssh-add`, auch bei einem Host-Key-Fehler.
- «keine Antwort des Server-Teils» ohne Hinweis auf ein älteres Image ohne das Skript.
- Selten Fehlalarm beim Interclub-Abruf, wenn sich der Takt über die Nachtpause verschiebt
  (Abstand bis etwa 32 h statt 26 h).
- Die Regel «zählt als MyTCO-Admin» ist aus `src/lib/server/admin/rollen.ts`
  (`zaehlendeMytcoAdmins`, nicht exportiert) kopiert.

**Ursprung:** Abschluss-Review und `merge-reviewer` des Branches `feat/release-checkliste`.

**Einschätzung:** Vorläufig. Nach dem ersten echten Lauf gegen Test neu bewerten; was dort stört,
in einem Zug nachziehen.

### 2026-11-23 — Häkchen «benachrichtigen»: zwei bewusst gelassene Grenzen der Oberfläche

**Thema:** Oberfläche

**Fundort:** `src/lib/verwaltung/Mitgliedschaft.svelte` (Karten-Häkchen), `src/routes/verwaltung/rollen/+page.svelte` (Dialog «Rolle vergeben»).

**Beobachtung:** (1) Leitbild und Entwurf sagen «kein Häkchen beim eigenen Mitglied»; die Karte
«Mitgliedschaft» blendet es auf der eigenen Seite nicht aus. Der Fall tritt praktisch nicht auf
(eigenes Konto vorgemerkt = gesperrt), und der Server meldet einem Admin nie eigene Änderungen.
(2) In «Rolle vergeben» bleibt ein gesetztes Häkchen stehen, wenn die Wahl auf sich selbst und
zurück wechselt; bei der eigenen Wahl geht immer «nicht melden» an den Server.

**Ursprung:** Gesamtprüfung und Nachprüfung #94.

**Einschätzung:** Ohne Wirkung für Mitglieder. Beim nächsten Umbau der Seiten angleichen oder die
Formulierung im Leitbild auf Angaben und Rollen einschränken.

### 2026-11-24 — Anlass-Seite lädt die Vorlagen der Mitteilungen nach «Angaben speichern» nicht neu

**Thema:** Oberfläche

**Fundort:** `src/routes/verwaltung/anlaesse/[id]/+page.svelte` (Neuladen nach dem Speichern der Angaben, etwa Zeile 52–75)

**Beobachtung:** Nach dem Speichern lädt die Seite nur den Anlass neu; die Vorlagen der Mitteilungen (mit Beginn und Anmeldeschluss im Text) erst nach dem Senden. Wer Beginn oder Anmeldeschluss verschiebt und gleich eine Vorlage wählt, bekommt das alte Datum in den Text. Die Turnierseite hatte dasselbe Muster und lädt jetzt beides parallel neu.

**Ursprung:** Schlussprüfung #95/#97, 24.11.2026.

**Einschätzung:** Klein: wie auf der Turnierseite Anlass und Mitteilungen in einem Zug neu laden, mit E2E (Datum ändern, Vorlage wählen).

### 2026-11-24 — Spielberechtigt ohne Kategorie trifft alle mit fehlenden Angaben, wenn keine Kategorie mehr aktiv ist

**Thema:** Code

**Fundort:** `src/lib/server/mitteilung/empfaenger.ts` (Auswahl *berechtigt* ohne Kategorie)

**Beobachtung:** Hat ein geöffnetes Turnier keine aktive Kategorie mehr (alle abgesagt), liefert die Auswahl «Spielberechtigt, noch nicht angemeldet» ohne Kategorie alle Mitglieder mit fehlenden Angaben, obwohl niemand mehr mitspielen kann.

**Ursprung:** Schlussprüfung #95/#97, 24.11.2026.

**Einschätzung:** Seltener Fall. Guard `aktive.length > 0` mit Test in `empfaenger-turnier.db.test.ts`.

### 2026-11-24 — Auswahl «an eine Rolle» ist nicht an die Liste der Rollen gebunden

**Thema:** Code

**Fundort:** `src/lib/mitteilung/auswahl.ts` (`rolleAus`), `src/lib/server/mitteilung/empfaenger.ts` (`mitRolle`)

**Beobachtung:** `rolleAus` castet mit `as Rolle`, ohne dass der Typ der Auswahl an `ROLLEN` hängt; `mitRolle(r: string)` nimmt jeden Text. Eine neue oder umbenannte Rolle fiele dem Typprüfer nicht auf.

**Ursprung:** Schlussprüfung #95/#97, 24.11.2026.

**Einschätzung:** Klein: Auswahl als `` `rolle-${Rolle}` `` typisieren und `mitRolle` auf `Rolle` umstellen; kein Verhalten ändert sich.
