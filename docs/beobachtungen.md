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

### 2026-11-13 — Datenbanktest «Liste mit Suche» der Verwaltung ist gelegentlich rot

**Thema:** Tests

**Fundort:** `src/lib/server/admin/schnittstellen.db.test.ts`, Test «A-MITGLIED-02: Liste mit Suche
und Status; ungültiger Status → 400» (Suche nach `Qwxz`).

**Beobachtung:** In einem vollen `make check` gab die Suche 15 Mitglieder statt des einen zurück
(IDs 203 bis 233, das erwartete zuletzt); der nächste Lauf war grün. Einmal in sechs Durchläufen.

**Ursprung:** Refactoring Schritt 13 (#80), Review von Lauf 2; `docs/refactoring-analyse.md`,
Anhang E.3. Der Schritt fasst weder die Datei noch `admin/` an.

**Einschätzung:** Ursache offen. Vermutung: Die Suche trifft auch ein anderes Feld (z. B. E-Mail
oder Vorname), und ein zufälliger Bestandteil der Testdaten dieser Datei enthielt in diesem Lauf
die Buchstabenfolge. Dann wäre es ein Testproblem (Suchwort länger oder eindeutig wählen). Zu
prüfen ist aber auch, ob die Suche den Filter unter einer Bedingung nicht anwendet; das wäre ein
Fehler der App.

## Offen

### 2026-11-13 — Allgemeine Zeithilfe liegt im Thema Anlass

**Thema:** Struktur

**Fundort:** `src/lib/interclub/anzeige.ts` und `src/lib/server/interclub/ansicht.ts` importieren `utcZuZuerich` aus `src/lib/anlass/zeit.ts`

**Beobachtung:** Die Umrechnung in Zürcher Zeit ist eine allgemeine Hilfe, liegt aber im Thema Anlass; Interclub hängt damit für die Zeit am Anlass.

**Ursprung:** #81, Review von Task 8 (Oberfläche Interclub)

**Einschätzung:** Kein Fehler. Bei Gelegenheit die Zürcher-Zeit-Funktionen in ein neutrales Modul (z. B. `src/lib/zeit.ts`) verschieben; betrifft auch die Abdeckungsliste in `vitest.config.ts`.

### 2026-11-13 — Interclub: Bedeutung des «*» bei Auf- und Abstiegsspielen unklar

**Thema:** Interclub

**Fundort:** Swiss-Tennis-Schnittstelle `/interclub/team-results`, Feld `tableau.results[].team.home|visitor.name`

**Beobachtung:** Ein führendes «* » im Teamnamen markiert nicht den Sieger nach Endstand: 65+ 1L Herren (Team 7396) zeigt «Neuenhof 2 4 : 2 * Olten». MyTCO speichert die Markierung, zeigt sie aber nicht und leitet Sieg/Niederlage aus dem Endstand ab.

**Ursprung:** #81, Teil 1 (Session 13.11.2026), Abruf der Daten 2026

**Einschätzung:** Vermutlich «bleibt in der Liga» bzw. «steigt auf» nach Reglement. Bei Gelegenheit gegen mytennis.ch prüfen; erst dann eine Anzeige (z. B. «steigt auf») erwägen.

### 2026-11-13 — Interclub: Form noch nicht gespielter Begegnungen erst 2027 prüfbar

**Thema:** Interclub

**Fundort:** Swiss-Tennis-Schnittstelle `/interclub/team-results`, Felder `homeTeamScore`, `visitTeamScore`, `date`

**Beobachtung:** 2026 sind alle Begegnungen gespielt; wie eine offene Begegnung aussieht (Endstand `null`, fehlend oder 0), ist nicht beobachtbar. Der Import nimmt `null` und fehlend als «noch offen» an. Auch die Saison 2027 liefert heute HTTP 500 («Upstream responded with HTTP 404»).

**Ursprung:** #81, Teil 1 (Session 13.11.2026)

**Einschätzung:** Sobald Swiss Tennis den Spielplan 2027 freischaltet (Frühling), einmal `make ic-import JAHR=2027` und die Antwort prüfen; spätestens in Session 3 von #81 (regelmässiger Abruf).

### 2026-11-12 — Kostenseite hinkt der Schätzung für den Vorstand nach

**Thema:** Kosten

**Fundort:** `docs/kosten.md` (Laufende Kosten, Nur falls, Szenarien); Kostenschätzung als Artifact «MyTCO Kostenschätzung» für die Vorstandssitzung vom 16.11.2026

**Beobachtung:** Die Schätzung für den Vorstand rechnet mit Posten und Preisen, die `kosten.md` nicht führt: nächste VPS-Stufe 4 vCPU / 4 GB CHF 9.00/Mt. als Worst Case (Infomaniak, 12.11.); GitHub rechnet Actions nicht mehr in Minuten, sondern als Guthaben (Free USD 12, Pro USD 18 pro Monat, Linux USD 0.006/Min.; Pro USD 4/Mt.); Überwachung (Healthchecks.io gratis bis USD 5/Mt.) und Passwort-Tresor (K-49, gratis bis ca. USD 40/Jahr); Best Case Website-Umzug (K-48): Metanet-Webhosting Listenpreise CHF 12.90–24.90/Mt. entfällt, Postfächer zu Infomaniak Mail Service ab CHF 2.29/Mt., Ersparnis ca. CHF 100–245/Jahr. Totals dort: laufend ca. 100–400, Startjahr ca. 120–440. Fairgate-Vergleich und SMS stehen nur noch in `kosten.md`.

**Ursprung:** Kostenschätzung für den Vorstand (Nutzerauftrag, Session 12.11.2026)

**Einschätzung:** `kosten.md` nach dem Vorstandsentscheid (K-03, 16.11.) nachführen, damit Repo und Vorstandsfassung dieselben Zahlen haben; den Abschnitt zu den Actions-Minuten in `ci-cd-und-release.md` auf das Guthaben-Modell prüfen.

### 2026-11-08 — Doppel: Löscht der CM-Admin eine Anmeldung, sollen die offenen Anfragen mitverfallen

**Thema:** Verwaltung UI

**Fundort:** `src/lib/server/cm/verwaltung-doppel.ts` (`loescheDoppel`, Kommentar «Die Anfragen bleiben.»), `src/lib/server/cm/doppel.ts` (`nimmAnfrageAn`)

**Beobachtung:** Löscht der CM-Admin die Anmeldung eines Suchenden, bleiben dessen offene Anfragen stehen, ebenso die Anfragen **an** ihn. Nimmt jemand später an, entsteht das Paar neu (`nimmAnfrageAn` prüft keine Anmeldung, `bildePaar` legt eine neue an). Beim Selbst-Abmelden (`meldeAb`) ist es heute gleich.

**Ursprung:** Restbefunde aus den Reviews von #59 Etappe 2

**Einschätzung:** **Entscheid Projektleiter (09.11.2026, Beobachtungs-Auswertung): mitlöschen.** Umsetzung offen, eigener Branch mit Brainstorming. Zu klären: gilt es auch beim Selbst-Abmelden; welche Meldung bekommen die Angefragten (DS-05, Push vor Mail); FR-06/FR-48 im Fachmodell nachführen.

**Verifiziert:** 09.11.2026 gegen `dev` e947d25 — belegt (`verwaltung-doppel.ts` → `loescheDoppel` ruft `anfragenVerfallen` nicht auf; `doppel.ts` → `nimmAnfrageAn` ohne Prüfung der Anmeldung des Anfragenden). Offen ist nur die Umsetzung.

### 2026-11-09 — Spielersuche zeigt dem CM-Admin Geschlecht und Jahrgang aller aktiven Mitglieder

**Thema:** Datenschutz

**Fundort:** `src/lib/server/cm/verwaltung.ts` → `sucheSpieler`; `src/lib/verwaltung/turnier-anzeige.ts` → `trefferText`; `docs/datenschutz.md` «Wer sieht was», Zeile CM-Admin; `docs/rollen-und-rechte.md` «Geschlecht und Jahrgang der Spieler (zum Zuordnen)»

**Beobachtung:** Beim Anmelden von Hand findet die Suche jedes aktive Mitglied und zeigt Klassierung, Geschlecht und Jahrgang. Konzept und Matrix nennen Geschlecht und Jahrgang nur «der Spieler». Die Erklärung («um dich in die passenden Kategorien einzuordnen») deckt den Zweck ab.

**Ursprung:** Session K-42, beim Eingrenzen der Kontaktdaten aufgefallen

**Einschätzung:** Niedrig; vermutlich nur Wortlaut («der Spieler und der Treffer der Suche beim Anmelden von Hand»). Beide Wege offen: Zusage präzisieren oder Treffer ohne Jahrgang/Geschlecht.

### 2026-11-09 — E2E-Hilfen nehmen noch ein festes Turnierjahr an

**Thema:** Tests

**Fundort:** `tests/e2e/hilfen/login.ts` → `legeTurnierAn(festesJahr)`, `legeOffenesTurnierAn(festesJahr, kategorien)`

**Beobachtung:** Seit die Hilfen freie Jahre selbst vergeben, braucht kein Test auf `dev` mehr ein festes Jahr. Der Weg mit festem Jahr (vorher löschen, dann anlegen) bleibt nur, damit Tests aus Branches, die vor der Umstellung entstanden sind, nach dem Merge weiterlaufen. Ohne ihn ist eine Kollision wie früher wieder möglich, sobald zwei Dateien dasselbe feste Jahr wählen.

**Ursprung:** Review (`cas-reviewer`) des Branches `test/e2e-turnierjahre`

**Einschätzung:** Niedrig. Entfernen, sobald die damals offenen Branches gemergt sind; vorher mit `grep -rn "legeTurnierAn(\|legeOffenesTurnierAn(" tests/e2e` prüfen, dass niemand mehr ein Jahr übergibt.

### 2026-11-09 — Gespräch mit der Turnierleitung: keine Grenze für Nachrichten eines Mitglieds

**Thema:** Sicherheit

**Fundort:** `src/lib/server/gespraech/schnittstellen.ts` (Senden des Mitglieds), `src/lib/server/gespraech/meldung.ts`

**Beobachtung:** Ein Mitglied kann beliebig viele Nachrichten pro Stunde schicken, und jede löst eine Meldung (Push, sonst E-Mail) an die Kontaktperson aus. Das Sicherheitskonzept verspricht hier nichts, darum kein Doku-Befund.

**Ursprung:** Doku-Abgleich vor dem Release 0.20.5

**Einschätzung:** Niedrig: Absender sind eingeloggte Vereinsmitglieder. Wenn nötig, eine Grenze pro Konto oder höchstens eine Meldung pro Gespräch und Stunde.

### 2026-11-12 — Bauregel kann bei einem Kommentar hinter einer Division zu Unrecht melden

**Thema:** Tests

**Fundort:** `scripts/pruefungen/bauregel.ts`, `ohneKommentare` (Zeichenliste des Regex-Musters:
`!`, `+`, `-`, `}`, `>`) und `pruefeWeiterreichen` (Muster für Typ-Argumente).

**Beobachtung:** Steht hinter einer Division nach `a!`, `i++` oder `}` ein Zeilenend-Kommentar mit
`liest`, `schreibt`, `mitKonto` oder `require(`, meldet die Bauregel in einer geprüften Datei einen
Befund, den es nicht gibt. Ebenso gilt `liest<Map<string, number>>(a)` als Weiterreichen. Im Code
kommt beides heute nicht vor.

**Ursprung:** Refactoring Schritt 12a (#80), zweites Review; `docs/refactoring-analyse.md`, Anhang
D.15.

**Einschätzung:** Falscher roter Lauf, kein Schutzverlust. Wer darauf stösst, formuliert den
Kommentar um oder setzt ihn auf eine eigene Zeile; eine saubere Lösung bräuchte einen Parser statt
Mustern (neue Bauart, eigener Entscheid).

