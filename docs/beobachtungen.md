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

### 2026-11-08 — Restbefunde aus den Reviews von #59 Etappe 2 (Doppel in der Verwaltung)

**Thema:** Verwaltung UI

**Fundort:** `src/lib/server/cm/verwaltung-doppel.ts`, `src/lib/server/cm/doppel.ts`, `src/lib/verwaltung/DoppelListe.svelte`, `src/lib/verwaltung/Aktionsdialog.svelte`, `src/lib/server/cm/verwaltung-doppel.db.test.ts`, `src/lib/server/turnier/schnittstellen.db.test.ts`

**Beobachtung:**
- Für den Projektleiter: Löscht der CM-Admin die Anmeldung eines Suchenden, bleiben dessen eigene offene Anfragen stehen (wie beim Selbst-Abmelden); nimmt der Angefragte später an, entsteht das Paar trotzdem. Mitlöschen oder so lassen?
- *Partner ändern* legt für den Bleibenden eine neue Anmeldung an (`angemeldetAm` = jetzt); falls später etwas nach Anmeldedatum sortiert (Warteliste), beachten.
- Die Warnung «3 Anmeldungen» nennt bei zwei Spielern «A oder B», weil der Server nicht meldet, wer es ist.
- Testlücken: keine Tests mit echter Überschneidung für *Partner ändern* und *Verschieben* (gleiche Sperrfolge wie die getesteten Wege); kein Test, dass die Meldung entfällt, wenn der Anfragende selbst CM-Admin ist; kein Test für das Verwerfen veralteter Antworten im Aktionsdialog und das Aufräumen des Suchtimers; eine Anfrage eines gesperrten Kontos hält dessen Platz (`anfrage-offen`) — gewollt, ungetestet.
- Eine veraltete Umleitung oder `ok` im Aktionsdialog läuft noch vor dem Stand-Vergleich (harmlos).
- `DoppelListe.svelte` hat rund 650 Zeilen; die drei Tabellenteile liessen sich als Komponenten herauslösen.

**Ursprung:** #59 Etappe 2, Task-Reviews und Schluss-Review (SDD-Ledger), nicht im Branch erledigt.

**Einschätzung:** Niedrig für den Verein. Die Frage zum Löschen eines Suchenden mit dem CM-Betrieb klären; Testlücken und Aufteilung beim nächsten Umbau der Verwaltung.

### 2026-11-08 — Einzel-Liste auf Aktionsdialog umstellen

**Thema:** Verwaltung UI

**Fundort:** `src/lib/verwaltung/Anmeldungsliste.svelte` (`fuehreAus`) und
`src/lib/verwaltung/Aktionsdialog.svelte`.

**Beobachtung:** Die Ablauflogik Warnung → *Trotzdem …* → Umleitung bei geändertem Stand gibt es
jetzt doppelt: in der Einzel-Liste von Hand und in `Aktionsdialog` für die Doppel-Liste. Die
Einzel-Liste könnte `Aktionsdialog` übernehmen (dort fehlt etwa das Verwerfen veralteter Antworten).

**Ursprung:** Review Task 7, #59 Etappe 2.

**Einschätzung:** niedrig; Umbau ohne neues Verhalten, lohnt sich beim nächsten Eingriff in die
Einzel-Liste.

### 2026-11-08 — Änderungsverlauf eines Mitglieds zeigt den Pfad erst nach einem zweiten Abruf

**Thema:** Navigation

**Fundort:** `src/routes/verwaltung/verlauf/+page.svelte` (Pfad über `ladeMitglied`)

**Beobachtung:** Der Pfad «Mitglieder › Nachname, Vorname › Änderungsverlauf» erscheint erst, wenn `ladeMitglied` den Namen geliefert hat; bis dahin rutscht der Titel nachträglich nach unten. Schlägt der Abruf fehl (Mitglied gelöscht, Netz weg), fehlt der Rückweg über dem Titel ganz, nur die Seitenleiste bleibt. Der Name stünde schon in den Zeilen des Verlaufs.

**Ursprung:** Review #69 (Code-Review und cas-reviewer)

**Einschätzung:** Klein. Pfad sofort mit Platzhalter zeigen oder den Namen aus den Verlaufszeilen nehmen.

### 2026-11-08 — CM-Seite bei Störung von /api/cm und doppelter Abruf beim Reiter CM

**Thema:** Navigation

**Fundort:** `src/routes/clubmeisterschaft/[id]/+page.ts`, `src/routes/clubmeisterschaft/+page.ts`

**Beobachtung:** Lässt sich die Liste der laufenden CMs nicht laden, zeigt die CM-Seite «‹ Clubmeisterschaft»; läuft nur eine CM, führt dieser Link per Umleitung auf dieselbe Seite zurück. Ausserdem holen beim Tipp auf «CM» mit einer laufenden CM beide Seiten nacheinander `/api/cm`.

**Ursprung:** Review #69 (Code-Review)

**Einschätzung:** Selten und harmlos; beim CM-Betrieb (Umbau der CM-Seite) mitnehmen.

### 2026-11-08 — Elternseite der festen Ordnung nur als Zeichenkette typisiert

**Thema:** Navigation

**Fundort:** `src/lib/ui/navigation.ts` (`Eltern.route`), `src/lib/ui/Zurueck.svelte` (Cast für `resolve`)

**Beobachtung:** `Eltern.route` ist ein `string`; `Zurueck.svelte` castet ihn für `resolve`. Ein Tippfehler in der festen Ordnung fiele erst zur Laufzeit auf, nicht in svelte-check. Die Einheitstests prüfen die Tabelle, nicht ob die Routen existieren.

**Ursprung:** Review #69 (Code-Review)

**Einschätzung:** Typ aus `$app/types` (RouteId) würde es abfangen; kein Laufzeitfehler bekannt.

### 2026-11-08 — Breiter Pfad in der Verwaltung kürzt die aktuelle Stufe

**Thema:** Navigation

**Fundort:** `src/lib/design/basis.css` (`.pfad ol`)

**Beobachtung:** Ab 60rem steht der ganze Pfad einzeilig; ist er zu lang, endet er mit «…», und das kann die fett gesetzte aktuelle Seite treffen. Der Titel darunter nennt sie ohnehin.

**Ursprung:** Review #69 (Code-Review, cas-reviewer)

**Einschätzung:** Kosmetisch; erst angehen, wenn es bei echten Namen stört (z. B. Mittelstufen statt Ende kürzen).

### 2026-11-08 — Auskunft schreibt beim Öffnen einen Verlaufseintrag, auch lesend und in «Ansicht als …»

**Thema:** Rechte

**Fundort:** `src/lib/server/admin/schnittstellen.ts` (`getAuskunft`); `docs/rollen-und-rechte.md` (MyTCO-Admin «L», Ansicht «kein Eintrag»).

**Beobachtung:** `getAuskunft` schreibt beim Öffnen einen Verlaufseintrag «Auskunft erstellt», auch für den nur lesenden MyTCO-Admin und in «Ansicht als …». Die Rechte-Matrix verspricht dort «L» bzw. «kein Eintrag».

**Ursprung:** Doku-Abgleich vor Release 0.17.0

**Einschätzung:** Mittel. Entscheid Projektleiter: Ist der Eintrag gewollt, kommt eine Ausnahme in die Matrix; sonst ohne Eintrag in Ansicht und beim nur lesenden Zugriff.

### 2026-11-08 — Status «geplant» bei gebauten Anforderungen ohne Test-ID

**Thema:** Doku

**Fundort:** `docs/anforderungen/anforderungen.md` (A-LOGIN-01, A-MITGLIED-03), `docs/rollen-und-rechte.md` (RR-05, RR-06), `docs/fachmodell.md` (FR-11).

**Beobachtung:** Diese fünf IDs sind gebaut, stehen aber auf «geplant». Zum Umstellen braucht je ein Test die ID im Namen (Prüfung `test-ids`).

**Ursprung:** Doku-Abgleich vor Release 0.17.0

**Einschätzung:** Niedrig. Beim nächsten Anfassen der Tests die ID in den Testnamen nehmen und den Status umstellen.

### 2026-11-08 — Kontaktdaten für CM- und Lizenz-Admin: Zusage strenger als Doku

**Thema:** Datenschutz

**Fundort:** `docs/rollen-und-rechte.md` (Matrix), `docs/datenschutz.md` (K-42); Verwaltungslisten der CM und Lizenzen.

**Beobachtung:** Matrix und Datenschutz versprechen CM- und Lizenz-Admin E-Mail und Telefon aller Mitglieder (K-42). Die Verwaltungslisten liefern sie bewusst nicht; der Ist-Stand ist strenger als zugesagt.

**Ursprung:** Doku-Abgleich vor Release 0.17.0

**Einschätzung:** Niedrig. Soll stehen lassen (Code folgt bei Bedarf) oder das Ist zeigen; passt zur Regel, dass der Code nicht mehr zeigt als zugesagt.

### 2026-11-08 — Kopfkommentar in doppel-meldung.ts widerspricht DS-05 (präzisiert)

**Thema:** Doku

**Fundort:** `src/lib/server/cm/doppel-meldung.ts` (Kopfkommentar).

**Beobachtung:** Der Kommentar sagt «keinen CM-Admin». Die Texte nennen die Rolle «Der CM-Admin», was gewollt ist: DS-05 erlaubt die Rolle, nicht den Namen.

**Ursprung:** Doku-Abgleich vor Release 0.17.0

**Einschätzung:** Niedrig. Den Kommentar beim nächsten Code-Commit an DS-05 angleichen (nur Doku-Änderungen vor dem Release, darum jetzt nicht).

### 2026-11-08 — testgruppe.md: Brief-Code und Brief als PDF noch offener Prüfpunkt

**Thema:** Doku

**Fundort:** `docs/testgruppe.md` (Zeile 24).

**Beobachtung:** Der Punkt «Brief-Code und Brief als PDF in der Mitgliederverwaltung» (#43, Etappe 2) steht als offen. Ob das zum Stand passt, ist nicht geprüft.

**Ursprung:** Doku-Abgleich vor Release 0.17.0

**Einschätzung:** Niedrig. Mit dem Stand von #43 abgleichen und den Punkt abhaken oder belassen.

### 2026-11-09 — A-LOGIN-09 auf iPhone einmal rot mit «Importing a module script failed»

**Thema:** Tests

**Fundort:** `tests/e2e/login.test.ts:66` (A-LOGIN-09, Projekt `iphone`).

**Beobachtung:** Im vollen `make check` scheiterte der Test einmal: WebKit meldete nach dem Neuladen «TypeError: Importing a module script failed». Der Einzellauf danach (`--repeat-each 3`) war dreimal grün. Der Branch hatte nur das Seed geändert, das E2E nicht benutzt.

**Ursprung:** Session Seed-Fix (Beispielspieler mit Login), `make check`

**Einschätzung:** Niedrig, vermutlich ein Wackler unter Last (Modul nach dem Neuladen noch nicht ausgeliefert). Wiederholt er sich, Trace holen.

### 2026-11-09 — cmAdmins zählt ausgetretene und vorgemerkte Mitglieder mit

**Thema:** Rechte

**Fundort:** `src/lib/server/mitteilung/meldung.ts` (`cmAdmins`) gegenüber `src/lib/server/turnier/kontakt.ts` (`gueltigerCmAdmin`).

**Beobachtung:** `cmAdmins` prüft nur Rolle `cm` und ungesperrtes Konto, nicht den Status des Mitglieds. Die neue Regel für die Kontaktperson verlangt zusätzlich Status *aktiv*. Meldungen an die CM-Admins (z. B. neuer Wildcard-Antrag) können so an ausgetretene oder zum Löschen vorgemerkte Personen gehen; `meldeMitgliedern` filtert allerdings selbst nach `aktiv`, die Mail geht also wohl nicht raus.

**Ursprung:** CAS-Review des Branches feat/cm-uebersicht

**Einschätzung:** Niedrig. Prüfen, ob `cmAdmins` auf `gueltigerCmAdmin` umgestellt werden soll, damit es nur eine Regel gibt.

### 2026-11-09 — E2E-Mails scheitern, wenn das Netz «localhost» nicht auflöst

**Thema:** Tests

**Fundort:** `tests/e2e/hilfen/umgebung.ts` (`MYTCO_SMTP_URL: 'smtp://localhost:51025'`), Mailpit aus `docker-compose.yml` (lauscht nur auf `127.0.0.1`).

**Beobachtung:** nodemailer löst `localhost` zuerst über den DNS-Server des Netzes auf (`resolve4`). Antwortet der mit `ESERVFAIL`, weicht nodemailer auf `::1` aus, wo Mailpit nicht lauscht: Jeder E2E-Test mit Mail scheitert («Keine Mail in Mailpit angekommen», 139 rote Tests). Mit `MYTCO_SMTP_URL=smtp://127.0.0.1:51025` läuft alles.

**Ursprung:** `make check` im Branch feat/cm-uebersicht, nach einem Netzwechsel

**Einschätzung:** Mittel, weil es den Nachweis lahmlegt und wie ein Code-Fehler aussieht. Vorschlag: Standard in `umgebung.ts` (und ggf. `.env.example`) auf `127.0.0.1` stellen.

### 2026-11-09 — Überschrift als erste Zeile einer Karte hat Abstand oben

**Thema:** Verwaltung UI

**Fundort:** `src/lib/design/basis.css` (`h2 { margin-top: var(--abstand-5) }`), z. B. Karte «Deine Angaben» und Seite einer Kategorie («Angemeldet (N)»).

**Beobachtung:** Steht ein `h2` zuoberst in einer `.karte`, kommt zum Innenabstand der Karte noch der Abstand über der Überschrift: sichtbarer Leerraum oben in der Karte.

**Ursprung:** Screenshots der neuen Seite einer Kategorie (feat/cm-uebersicht)

**Einschätzung:** Niedrig, rein optisch. Eine Regel `.karte > h2:first-child { margin-top: 0 }` im Baustein Karte würde es überall beheben; vorher alle Karten mit Überschrift ansehen.

### 2026-11-09 — Restbefunde aus den Reviews der CM-Übersicht

**Thema:** Tests

**Fundort:** `src/routes/clubmeisterschaft/[id]/kategorie/[kid]/+page.svelte`, `tests/e2e/cm-anmeldung.test.ts`

**Beobachtung:** (1) Die Seite einer Kategorie zeigt Paare als Text (`paarText`, «Rufname (Amtlich) / …»), die Einzelliste dagegen mit dem Baustein *Name* — uneinheitlich. (2) «Kontaktperson verliert die Rolle → Satz verschwindet» ist nur im DB-Test belegt, nicht im E2E. (3) Kein Screenshot mit sehr langem Kategorienamen auf 375 px; das CSS von `.karte-kopf` bricht um, ist aber nicht bildlich nachgewiesen.

**Ursprung:** Abschluss-Review und CAS-Review von feat/cm-uebersicht (0.18.0)

**Einschätzung:** Niedrig, nichts davon führt Mitglieder in die Irre.

### 2026-11-09 — «#69: Anmelden auf der CM-Seite lädt die Seite nicht neu» rot, wenn navigation und bewegung zusammen laufen

**Thema:** Tests

**Fundort:** `tests/e2e/navigation.test.ts` (Test «#69: Anmelden auf der CM-Seite lädt die Seite nicht neu»), zusammen mit `tests/e2e/bewegung.test.ts`

**Beobachtung:** `npm run e2e -- tests/e2e/navigation.test.ts tests/e2e/bewegung.test.ts --project iphone --project android` ist auf iPhone und Android reproduzierbar rot: Nach «Anmelden» im Dialog bleibt `role=status` leer, die Kategorie zeigt «Noch niemand angemeldet». Allein läuft die Datei grün, ebenso im vollen `make check`. Auf `origin/dev` (edb8268) gleich, also nicht aus feat/ui-pc-feinschliff.

**Ursprung:** Feinschliff PC (feat/ui-pc-feinschliff), Gegenprobe auf einem frischen Worktree von `origin/dev`

**Einschätzung:** Mittel für die Verlässlichkeit der Tests, kein Hinweis auf einen App-Fehler. Vermutlich gemeinsamer Zustand zwischen den beiden Dateien (Turnierjahre oder laufende CMs); erst Trace mit Netzwerk ansehen.

### 2026-11-09 — Restbefunde aus den Reviews von Feinschliff PC

**Thema:** Verwaltung UI

**Fundort:** `src/lib/design/basis.css`, `src/lib/ui/kopftitel.ts`, `src/lib/verwaltung/Spielersuche.svelte`, Tests dazu

**Beobachtung:** (1) `scroll-padding-top` für den klebenden Seitenkopf am PC ist geschätzt (`--abstand-6 + 8rem`) statt aus Tokens abgeleitet; ein umbrechender langer Titel ist höher. (2) Die flexible Namens-/Kommentarspalte (`max-width: 0` in der Zelle) ist nur in Chromium geprüft, nicht in Safari/Firefox am Desktop. (3) Am PC mit Band «Ansicht als …» ragt die Seitenleiste (100dvh) bei Scrollstand 0 um die Bandhöhe unter den Rand. (4) Spielersuche im Handy-Querformat nur ~136 px hoch (35dvh). (5) Gleiche Route mit anderem Parameter: der neue Titel blitzt kurz in der Kopfleiste auf. (6) Fokus-Rückgabe des «Ändern»-Dialogs nur in Desktop-Chrome getestet. (7) Spielernamen und E-Mail in übrigen Tabellen ungekürzt — bei Extremwerten scrollt die Tabelle in ihrer Box.

**Ursprung:** Task- und Abschluss-Reviews von feat/ui-pc-feinschliff

**Einschätzung:** Niedrig, nichts davon führt in die Irre; (1) und (2) beim nächsten Gang durch die Verwaltung am Mac/Safari ansehen.

### 2026-11-09 — Kontaktperson ohne Fachregel, ihre Tests ohne ID

**Thema:** Tests

**Fundort:** `src/lib/server/turnier/kontakt.ts`, `docs/fachmodell.md` (Turnier), Tests «Kontaktperson: …» in `turniere.db.test.ts`, `anmeldungen.db.test.ts`, `schnittstellen.db.test.ts`, `angaben.test.ts`, `auskunft.db.test.ts`, `tests/scripts/beispiel-turnier.db.test.ts`

**Beobachtung:** Die Regeln zur Kontaktperson (wählbar nur, wer aktiv ist, ein ungesperrtes Konto und die Rolle CM-Admin hat; für Mitglieder sichtbar nur, solange das gilt; die Wahl bleibt gespeichert) stehen nur im Code. Das Fachmodell sagt nur «solange sie CM-Admin ist». Rund 14 Tests nennen darum keine ID. Vorschlag: eine neue Fachregel (FR-50) und die Tests danach benennen.

**Ursprung:** Doku-Abgleich vor dem Release 0.19.1.

**Einschätzung:** Mittel; betrifft nur die Nachvollziehbarkeit, das Verhalten ist getestet.

### 2026-11-09 — Kontaktperson: Schnittstelle liefert den Rufnamen mit, die Zusage nennt Vor- und Nachname

**Thema:** Datenschutz

**Fundort:** `src/lib/server/cm/anmeldungen.ts` (`kontaktperson`, liest `namensSpalten`), `docs/datenschutz.md` («Wer sieht was», alle Mitglieder)

**Beobachtung:** Die CM-Seite zeigt den amtlichen Namen. Die Antwort von `/api/cm` enthält aber auch den Rufnamen. Den dürfen alle Mitglieder ohnehin sehen, darum ist das kein Verstoss, nur eine Abweichung vom Wortlaut. Entweder nur Vor- und Nachname lesen (Code an die Zusage angleichen) oder die Zusage auf «Name mit Rufname» präzisieren.

**Ursprung:** Doku-Abgleich vor dem Release 0.19.1.

**Einschätzung:** Niedrig; Entscheid des Projektleiters, welcher Weg.

### 2026-11-09 — Gespräch Turnierleitung: aufgeschobene Punkte aus dem Final-Review

**Thema:** Gespräch Turnierleitung

**Fundort:** `src/lib/server/gespraech/` (`gespraech.ts`, `schnittstellen.ts`), `src/lib/server/cm/anmeldungen.ts` (`laufendeTurniere`), `src/routes/clubmeisterschaft/[id]/kontakt/`, `src/routes/verwaltung/turniere/[id]/nachrichten/`, Seed, DB-Tests des Gesprächs

**Beobachtung:** Aufgeschoben, nichts davon führt zu falschen Daten:
(1) «erledigt» lässt sich setzen, obwohl inzwischen eine neuere Nachricht des Mitglieds eintraf (der Zustand hat keine `nachLetzter`-Prüfung wie die Antwort).
(2) Der Meldungslink läuft über `/verwaltung/bestaetigen` und landet auf `startziel()`, nicht im Gespräch (RR-09).
(3) `gespraech.letzteAm` wird geschrieben, aber nirgends gelesen.
(4) `maxlength` im Feld zählt UTF-16, der Server zählt Codepunkte (Emoji).
(5) Nichts verknüpft `admin_mitglied_id` mit `von`.
(6) `gespraechStand` in `laufendeTurniere` läuft pro Turnier einzeln (N+1).
(7) DB-Tests, die ihre eigene Datenbank im Testrumpf anlegen, laufen gegen die Standard-Zeitgrenze von 5 s.
(8) Nach erfolgreichem Senden gibt es keine Ansage für Screenreader, weder für Mitglieder noch in der Verwaltung.
(9) Der Seed setzt «neue Antwort» nicht zurück.

**Ursprung:** Final-Review #71

**Einschätzung:** Niedrig; (1) und (2) zuerst ansehen, (6) erst bei vielen Turnieren relevant.
