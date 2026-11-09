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
