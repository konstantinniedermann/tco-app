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

### 2026-11-18 — Kein Prüflauf merkt, wenn das Image die Testdaten nicht laden kann

**Thema:** Tests

**Fundort:** `Dockerfile` (Laufzeit-Image), `betrieb/nachweis/rauchtest.sh`, `make check`

**Beobachtung:** `scripts/testdaten.ts` scheiterte im Image mit `ERR_MODULE_NOT_FOUND`
(`src/lib/anlass/zeit.ts`), weil das Image nur `src/lib/server` kopierte, der Server-Code aber
geteilte Module unter `src/lib` importiert. Aufgefallen ist es nur in `make betrieb-nachweis`,
das nicht zu `make check` und nicht zur CI gehört; der Rauchtest der CI führt nur
`migrate.ts` aus. Die erste Auslieferung auf Test wäre daran gescheitert. Behoben in #39
(Image kopiert ganz `src/lib`).

**Ursprung:** #39, lokaler Nachweis vor der Inbetriebnahme

**Einschätzung:** Der Rauchtest könnte `testdaten.ts` gegen seine Wegwerf-Datenbank laufen
lassen (mit `MAIL_NUR_AN` und einer `.invalid`-SMTP-Adresse), dann fiele ein fehlendes Modul in
der CI auf. Klein, aber eigener Prüflauf.

### 2026-11-16 — Junioren-CM verlangt bei Swiss Tennis ein eigenes Turnier

**Thema:** Clubmeisterschaft

**Fundort:** FR-33 (`docs/fachmodell.md`, ein Turnier je Jahr), Etappe *CM-Anmeldung* mit Junioren (K-46).

**Beobachtung:** Laut Ausschreibung «Club Champion Trophy» 2026 (Ziff. 10) müssen Juniorenkategorien bei Swiss Tennis ein eigenes Turnier «Next Gen Trophy» sein. In MyTCO gibt es ein Turnier je Jahr; Junioren melden sich 2027 in MyTCO an. Ob die freiwilligen Turniernummern (0..n) das schon abdecken oder Juniorenkategorien eine eigene Zuordnung brauchen, ist nicht geprüft.

**Ursprung:** Recherche «CM hinter den Kulissen» (`docs/recherche/2026-11-16-cm-ablauf.md`), Frage F10 in #88.

**Einschätzung:** Vermutlich reicht eine zweite Turniernummer je Jahr; spätestens nach dem Gespräch #88 prüfen, vor der Etappe *CM-Anmeldung*.

### 2026-11-16 — Kontakt des Doppelpartners und des Anfragenden ohne Ende der CM

**Thema:** Datenschutz

**Fundort:** `src/lib/server/cm/anmeldungen.ts` (`ladeCmAnsicht`: Kontakt des Partners nur nach
`mitgliedStatus`; `offeneAnfragenAn`: Kontakt des Anfragenden ohne Jahresgrenze),
`src/routes/api/cm/[id]/+server.ts`; `src/lib/server/admin/loeschung.ts` (offene Anfragen nur
bei der endgültigen Löschung); `src/lib/server/db/schema.ts` (Turnier ohne Zustand
«abgeschlossen»). Zusage: `docs/datenschutz.md` (Tabelle «Wer sieht was»: «bis zum Ende der
CM», Löschen: «Ende der CM»), `docs/datenschutzerklaerung.md` («während der
Clubmeisterschaft»), `docs/fachmodell.md` FR-19, K-31.

**Beobachtung:** Die CM-Seite liefert für jedes Turnier, das nicht mehr in Vorbereitung ist,
also auch für Vorjahre, E-Mail und Telefon des Doppelpartners (solange er aktiv ist) und den
Kontakt des Anfragenden einer offenen Anfrage. Die Übersicht zeigt nur das laufende Jahr; über
die direkte Adresse ist das alte Turnier erreichbar. Ein «Ende der CM» kennt der Code nicht; nur
der CM-Admin hat eine Grenze (`kontaktSichtbar`, 1.1. nach dem Turnierjahr, K-42). Offene
Partner-Anfragen haben keine Löschfrist.

**Ursprung:** Doku-Audit vor Release 0.23.0 (16.11.2026), Domäne Daten/Tests; am Code
nachgeprüft. Schweregrad hoch, vom Projektleiter für 0.23.0 übersteuert: Das Verhalten steckt
schon auf `main`, das Release liefert nichts aus (Test und Live aus), es gibt keine echten Daten.

**Einschätzung:** Muss vor `AUSLIEFERUNG_LIVE=an` behoben sein (Prüfpunkt in #39). Naheliegend:
«Ende der CM» wie beim CM-Admin auf den 1.1. nach dem Turnierjahr legen (`kontaktSichtbar`
gibt es schon) und offene Anfragen dann mit den Gesprächen löschen; die Grenze ist ein
Entscheid des Projektleiters, die Zusage bleibt das Soll.

### 2026-11-16 — Telefonnummern in Tests nicht im Format «+41 00 …»; Prüfung sieht sie nicht

**Thema:** Tests

**Fundort:** rund 16 Testdateien, z. B. `tests/e2e/navigation.test.ts`, `tests/e2e/cm-verwaltung.test.ts`,
`tests/e2e/cm-doppel-verwaltung.test.ts`, `tests/e2e/wappen.test.ts`,
`src/lib/server/profil/angaben.db.test.ts`, `src/lib/server/cm/*.db.test.ts`,
`src/lib/server/admin/fairgate.db.test.ts`; `scripts/pruefungen/testdaten.ts`
(`istTestdatei`); Regel in `docs/testkonzept.md` («Testdaten»).

**Beobachtung:** (1) Die Tests nutzen Handynummern im echten Format («+41 79 …», «079 …»);
das Testkonzept verlangt «+41 00 …». Die Prüfung der Testdaten prüft nur Mail-Domains. (2) Sie
erkennt Dateien nur am Namen (`beispiel-…`, Ordner `seed(s)`); die JSON-Dateien unter
`scripts/beispiel-interclub/2026/` (`bericht-*`, `team-results-*`) fallen durch. Heute stehen
dort keine Adressen.

**Ursprung:** Doku-Audit vor Release 0.23.0 (16.11.2026), Domäne Daten/Tests.

**Einschätzung:** Keine Mitgliederdaten, aber womöglich vergebene Nummern in einem öffentlichen
Repo. (1) mechanisch ersetzbar, eigener kleiner Branch; ob die Prüfung Telefonnummern prüfen
soll, mit entscheiden. (2) Ordner mit Präfix `beispiel-` mitzählen, mit Testfall.

### 2026-11-16 — Fachmodell trennt Gebautes nicht von Geplantem; drei npm-Skripte ohne Nutzer

**Thema:** Struktur

**Fundort:** `docs/fachmodell.md` (Turnier-Zustände *läuft*, *abgeschlossen*; Anmeldung
*Gruppe*, *Rang-Korrektur*; Gruppe, KoTableau, Spiel, Resultat, Satz, Lizenzrunde,
Lizenzantrag; Mitglied *verwaltet von*) gegen `src/lib/server/db/schema.ts`
(`mitglied_geloescht_check`: kein nicht gelöschtes Mitglied ohne E-Mail); `package.json`
(`test:db`, `db:migrate`, `format`).

**Beobachtung:** (1) Das Fachmodell beschreibt Objekte, Attribute und Zustände der späteren
Etappen ohne Vermerk «geplant»; nur die Fachregeln tragen ihren Status. Juniorenkonten ohne
eigene Adresse (*verwaltet von*) lässt das Schema heute nicht zu. (2) Die npm-Skripte `test:db`,
`db:migrate` und `format` nennt keine Doku, und kein Makefile, Workflow oder Dockerfile ruft sie;
Migrationen laufen überall über `node scripts/migrate.ts`.

**Ursprung:** Doku-Audit vor Release 0.23.0 (16.11.2026), Domänen Daten/Tests und Setup.

**Einschätzung:** Niedrig. (1) «(geplant)» an den Stellen ergänzen, am besten mit der Etappe,
die sie baut. (2) `format` und `test:db` im Testkonzept nennen oder `db:migrate` entfernen
(Code-Frage).

### 2026-11-15 — Fallen aus dem Session-Gedächtnis stehen nicht im Repo

**Thema:** Arbeitsweise

**Fundort:** Session-Gedächtnis von Claude Code (ausserhalb des Repos, Index `MEMORY.md`); im Repo
`CLAUDE.md`, Skill `tco-branching`, `docs/testkonzept.md`, `docs/ci-cd-und-release.md`.

**Beobachtung:** Rund 30 Notizen «Falle: …» liegen nur im Gedächtnis einer Maschine. Viele treffen
jede Session in diesem Repo: E2E gleich im Hintergrund starten, eigene Datenbank der E2E, Budget
der Mail-Codes je IP, Mails und `localhost`, Einstiegsseite ohne Sitzung, Sitzungen mit
Zukunftsdatum in Datenbanktests, «neueste Saison» nur auf eigener Test-Datenbank, Migrationsnummer
bei parallelen Branches, `git` im Worktree. Eine Session auf einer anderen Maschine kennt sie nicht.

**Ursprung:** Refactoring (#80), Zielbild 6.2 Punkt 6 und Befund B-26 in
`docs/refactoring-analyse.md`; nicht Teil des Plans (E-69), übergeben in Schritt 25.

**Einschätzung:** Eigener Vorgang nach dem Abschluss des Refactorings. Je Falle entscheiden: Skill
(Ablauf), `docs/` (Fakt), Test oder Prüfskript (wo ein Werkzeug sie abfängt), sonst Gedächtnis.
In Schritt 25 nur der Index gelesen, die Notizen selbst nicht.

### 2026-11-15 — Dauerregeln der `CLAUDE.md` sagen an fünf Stellen mehr als der Code

**Thema:** Arbeitsweise

**Fundort:** `CLAUDE.md` (Server, Oberfläche); `src/routes/api/status/+server.ts:5–10`,
`src/routes/api/kontakt/+server.ts:6–10`; `src/routes/verwaltung/+layout.ts:20–21`;
`src/lib/server/admin/schnittstellen.ts` (`getZugang`, `postZugangCode`, `postZugang`,
`postAnsicht`); die Vorgabe `() => new Date()` in `login/dienst.ts`, `login/passkey.ts`,
`admin/zugang.ts`, `profil/email-wechsel.ts`, `sitzung/schnittstellen.ts` und `hooks.server.ts`;
Kommentar zur Regel `fetch` in `eslint.config.js`.

**Beobachtung:** (1) «Nie Datenbank … in der Route» und «Statuscode und Antwort bauen nur
Schnittstellen-Dateien …»: Die Routen `status` und `kontakt` bauen Antwort und Statuscode selbst
mit `json` aus SvelteKit; `status` holt dort die Datenbank, `kontakt` die Einstellungen. Die
Ausnahme stand nur im Zielbild des Refactorings und ist bewusst nicht in die `CLAUDE.md`
aufgenommen (E-84); arc42 Kapitel 5 nennt sie. (2) «Fehlende Sitzung, Rolle oder Bestätigung
behandelt nur der Wächter»: Das Layout der Verwaltung leitet ohne frische Bestätigung selbst nach
`/verwaltung/bestaetigen` um; der Wächter (Fall `verwaltung-zugang`) deckt nur Sitzung und Rolle.
(3) «Jede Schnittstelle der Verwaltung läuft über `liest` oder `schreibt`»: Die vier
Zugangs-Schnittstellen sind die Zugangsprüfung selbst (`zugang.pruefe` bzw. `mitKonto`, E-34).
(4) «Die Zeit kommt über die Dienste, nie direkt aus `new Date()`»: Vier Fachdienste und
`getSitzung` nehmen `new Date()` als Vorgabe, wenn keine Uhr hineingereicht wird, und der Hook
reicht dem Löschlauf `new Date()`; gemeint ist die Fachlogik. (5) Der Kommentar zur Regel `fetch` sagt, auch der Service Worker
bekomme `holen` hineingereicht; er holt nichts (E-89).

**Ursprung:** Review von Schritt 24 (15.11.2026, Hinweise (a) bis (c)); Refactoring-Analyse 1c,
N-13 und N-14; (5) beim Angleichen der Kommentare in Schritt 25.

**Einschätzung:** Kein Fehler im Code: Die Regeln sind absolut gefasst, der Code hat benannte
Ränder. Eine Session, die nur die `CLAUDE.md` kennt, könnte die Stellen «reparieren». Wege: die
Ränder in den Regeln nennen (kostet Länge) oder lassen. Entscheid des Projektleiters.

**Nachtrag 2026-11-16 (Doku-Abgleich vor 0.23.0):** Zu (4) eine sechste Stelle:
`src/lib/server/http.ts` (`jetzt` als Vorgabe) ist im Betrieb die einzige Uhr der
Schnittstellen, weil `dienste.ts` `jetzt` nirgends setzt; ADR-013 beschreibt das richtig.

### 2026-11-15 — Regeltexte nach Schritt 24 an zwei Stellen uneinheitlich

**Thema:** Arbeitsweise

**Fundort:** `CLAUDE.md`; `docs/issue-konventionen.md:75–77` (Definition of Done); Skill
`tco-branching`, Ende von «Session-Ende».

**Beobachtung:** (1) Schritt 24 hat einen Satz gestrichen, den ein Werkzeug hält (Import von
`dienste.ts`, E-86), drei solche aber behalten: den Satz zu `fetch` (ESLint), die Importe der
Design-Dateien (`scripts/design-importe.test.ts`) und den ersten Halbsatz zur Importrichtung
(ESLint). (2) Die Definition of Done nennt «Doku nachgeführt» je Issue; der Skill legt README und
Doku in den Abgleich vor einem Release, nach jedem Issue bleibt nur die Doku des Branches (E-97).
Eine leichte Spannung, kein Widerspruch.

**Ursprung:** Review von Schritt 24 (15.11.2026, Hinweise (d) und (e)).

**Einschätzung:** (1) Kürzen oder lassen entscheidet der Projektleiter; den Satz zu `fetch` hat
E-89 behalten, weil er den Weg für Neues nennt. (2) Wenn es stört, in `issue-konventionen.md`
«Doku des Branches nachgeführt» schreiben.

### 2026-11-15 — Prüfung der Versionen: drei Ränder

**Thema:** Arbeitsweise

**Fundort:** `scripts/pruefungen/version-merge.ts` (`pruefeVersionsschritte`, `eintragszeilen`),
`scripts/pruefungen/release.ts` (Meldung «„Unveröffentlicht" ist nicht leer»); Skill
`tco-branching` Schritt 4a, `docs/ci-cd-und-release.md`, ADR-012.

**Beobachtung:** (1) Eine Zeile, die wortgleich schon unter «Unveröffentlicht» steht (etwa ein
zweites «Abhängigkeiten aktualisiert»), zählt nicht als neu; der Push wird abgewiesen. Dass ein
Revert mit Code einen eigenen Eintrag braucht, steht schon im Skill und in
`docs/ci-cd-und-release.md`; für die wortgleiche Zeile fehlt der Satz. (2) Die Meldung zu
«Unveröffentlicht ist nicht leer» spricht von einer Version, die sich «von … auf … ändert», auch
im ersten ihrer zwei Fälle, in dem für dieses Release noch keine Nummer gesetzt ist: beim ersten
Release trägt `dev` schon 0.22.11 und `main` 0.20.5. (3) Beim ersten Release erkennt `make
release-check` eine vergessene Nummer nicht, weil `dev` der Nummer von `main` schon voraus ist; die
erste Nummer (0.23.0) steht nur in Skill, `docs/ci-cd-und-release.md` und ADR-012 (bewusst, E-81).

**Ursprung:** Review von Schritt 23, Teil 3 (15.11.2026; `docs/refactoring-analyse.md`, G.4).

**Einschätzung:** (1) lässt nichts Falsches durch, es verlangt nur einen anders formulierten
Eintrag (einen Satz im Skill wert). (2) verwirrt höchstens; die Meldung nennt beide Wege. (3) ist
die einzige echte Lücke und gilt nur einmal. Spätestens beim ersten Release ansehen.

**Nachtrag 2026-11-16 (Doku-Abgleich vor 0.23.0):** (3) ist gemessen anders: `make release-check`
meldet eine ganz vergessene Nummer auch beim ersten Release (rot, «Unveröffentlicht» nicht leer).
Durch kommt nur, wer dem zweiten Weg der Meldung folgt und die Einträge in den Abschnitt
«0.22.11» nachrückt. Skill, `docs/ci-cd-und-release.md` und ADR-012 (Nachtrag) sind
entsprechend berichtigt. Mit dem Release 0.23.0 ist (3) erledigt.

### 2026-11-15 — Prüfung der Workflow-Rechte sieht Eingaben in `run:` nicht

**Thema:** Sicherheit

**Fundort:** `scripts/pruefungen/workflow-rechte.ts`; `.github/workflows/check.yml` (Eingabe `spur`
von `workflow_dispatch`).

**Beobachtung:** Die Prüfung liest Rechte und Secrets der Jobs, aber nicht, ob eine Eingabe von
`workflow_dispatch` als Ausdruck `${{ inputs.… }}` direkt in einem `run:` landet (dort könnte sie
Befehle einschleusen). Heute gibt es eine Eingabe, einen Wahrheitswert, und sie geht über `env:`.

**Ursprung:** Refactoring Schritt 20, Lauf 2 (`docs/refactoring-protokoll-etappe-3.md`, F.5;
Refactoring-Analyse 1e, H3-13).

**Einschätzung:** Heute ohne Folge. Eine Prüfung lohnt ab der zweiten Eingabe oder der ersten mit
freiem Text.

### 2026-11-15 — Bauregel: zwei benannte Grenzen beim Schutz der Admin-Routen

**Thema:** Sicherheit

**Fundort:** `scripts/pruefungen/bauregel.ts` (`adminSchnittstellen`, `pruefeAdminRoute`,
Kommentar «Geprüft wird jede Datei für sich»).

**Beobachtung:** (1) Eine Admin-Route darf jeden Namen aus der Vereinigung aller Listen der
Verwaltung nutzen, nicht nur aus der Liste ihrer Datei; ein Name in zwei Listen fällt in
`alleVerwaltung()` (`tests/hilfen/verwaltungs-listen.ts`) auf. (2) Geprüft wird jede Datei für
sich: Ein Modul unter `src/lib/` ausserhalb von `server/`, das Admin-Funktionen weiterreicht, fällt
nicht auf (das Weiterreichen von `liest`, `schreibt` und `mitKonto` fängt die Regel).

**Ursprung:** Refactoring Etappe 1 (Refactoring-Analyse 1c, N-04 und N-07; Protokoll Etappe 1,
D.4, D.8, D.13, D.14).

**Einschätzung:** Kein Code nutzt die Lücken; zur Laufzeit prüft jede Schnittstelle der Verwaltung
ihre Rechte über `liest` oder `schreibt`. Schliessen nur, wenn die Bauregel ohnehin einen Parser
bekommt (Eintrag vom 12.11.2026 zur Bauregel).

### 2026-11-15 — Vertrag zwischen Server und Oberfläche: was die Typen nicht binden

**Thema:** Struktur

**Fundort:** `src/lib/fehler.ts` (`STATUS_DES_WORTS`, Zusatzangaben), `src/lib/server/http.ts`
(`antwort`), `src/lib/abruf.ts` (`woerterAus`), `src/lib/cm/ablehnung.ts` (`ABLEHNUNGEN`),
`src/lib/verwaltung/api.ts`.

**Beobachtung:** (1) Der Typ bindet ein Fehlerwort nicht an seinen Status: `antwort(404, { fehler:
'veraltet' })` geht durch; `STATUS_DES_WORTS` gilt nur in der Oberfläche. (2) Feldnamen in
`felder` sind frei; Zusatzangaben liest die Oberfläche mit `as`. (3) `woerterAus` bindet nur mit
Typangabe; zehn Abruf-Funktionen der Verwaltung haben keinen Aufruf im Einheitstest. (4) Dass
`fehler.ts` nichts importiert, steht nur im Kommentar; kein Werkzeug hält es. (5) Ein neuer
Ablehnungsgrund der CM-Fachfunktion, der nicht in `ABLEHNUNGEN` steht, wird in der Oberfläche still
zu `geschlossen`. (6) 401 ohne lesbaren Körper deutet die Verwaltung als Störung, die
Mitglieder-App als «abgemeldet»; der Server sendet immer einen Körper.

**Ursprung:** Refactoring Etappen 1 und 2 (Refactoring-Analyse 1c, N-08 und N-18; 1d, H-14, H-20,
H-21; Protokolle D.6, E.1 bis E.3, E.6).

**Einschätzung:** Für die Nutzerin unsichtbar, solange Server und Oberfläche im selben Merge
mitziehen. (1) und (5) zuerst ansehen, wenn eine Schnittstelle neue Wörter oder Gründe bekommt.
(6) anzugleichen wäre eine Verhaltensänderung. In Schritt 25 nur (1), (4) und die Listen in (5)
neu gelesen, der Rest aus den Protokollen.

### 2026-11-15 — Tests: drei kleine Lücken im Netz ohne heutige Folge

**Thema:** Tests

**Fundort:** `tests/hilfen/turnierjahre.ts`; `src/lib/server/dienste.ts` (`holePush`);
`src/lib/server/grundpruefung.db.test.ts` (Methode aus dem Namen), `src/lib/server/routen.test.ts`
(Fall «Name passt zur Methode»).

**Beobachtung:** (1) Der Zähler der Turnierjahre lebt im Modul, die Datenbank im Lauf: Läuft eine
Testdatei im Watch-Modus ein zweites Mal gegen dieselbe Datenbank, vergibt sie dieselben Jahre
(aus dem Code geschlossen, nicht ausgeführt). (2) Kein Test baut einen Push-Versender über
`holePush`; der Zweig mit VAPID-Paar läuft im Test nie. (3) Die Grundprüfung leitet die Methode aus
dem Namen ab (`post…`, sonst GET): Ein Listeneintrag ohne Route liefe dort nach seinem Namen, eine
künftige Schnittstelle `put…` oder `delete…` als GET; der Routen-Test prüft «Name passt zur
Methode» nur für GET und POST.

**Ursprung:** Refactoring Etappen 1 und 3 (Refactoring-Analyse 1c, N-16 und N-17; 1e, H3-12;
Protokolle D.4, F.5).

**Einschätzung:** (1) nur lokal. (2) fällt beim ersten Server mit Push auf. (3) kleiner Abschluss:
eine Prüfung «jeder Listeneintrag hat eine Route», spätestens mit der ersten dritten Methode.

### 2026-11-15 — Pre-Commit-Hook prüft auch nicht versionierte E2E-Dateien

**Thema:** Tests

**Fundort:** `.githooks/pre-commit` (`make check-schnell`, darin Prettier).

**Beobachtung:** Der Pre-Commit-Hook prüft mit Prettier auch nicht versionierte Dateien unter
`tests/e2e/`; eine liegengelassene Datei hält einen Commit auf, der sie nicht enthält.

**Ursprung:** Refactoring Etappe 2 (Refactoring-Analyse 1d, H-25; Protokoll E.12).

**Einschätzung:** Ohne Folge für die App. Prettier im Hook nur auf versionierte Dateien anwenden,
wenn es wieder stört.

### 2026-11-15 — Rückfragen der Verwaltung: zwei Randfälle und ein Zustand ohne Test

**Thema:** Verwaltung UI

**Fundort:** `src/lib/verwaltung/Aktionsdialog.svelte` (`ausfuehren`), «Verschieben» in Einzel- und
Doppel-Liste der Anmeldungen; `src/routes/verwaltung/verlauf/+page.svelte:14`.

**Beobachtung:** (1) Wählt man im `Aktionsdialog` während der Anfrage neu oder tippt «Abbrechen»,
bleibt der Dialog bei Erfolg offen, die Seite lädt neu. Hat die zweite Entscheid-Taste (`neben`)
einmal eine Warnung ausgelöst, schickt der nächste Klick auf die Haupttaste `trotzdem`. (2)
«Verschieben» ohne anderes Ziel: Die Doppel-Liste zeigt eine gesperrte Haupttaste, die
Einzel-Liste nur «Abbrechen». (3) Der Verlauf hält «letzter Stand bleibt» in einem `$derived.by`
mit Seiteneffekt; kein Test hält das fest.

**Ursprung:** Refactoring Schritte 15 und 17 (Refactoring-Analyse 1d, H-10, H-12, H-26; Protokolle
E.9, E.12; E-53).

**Einschätzung:** (1) ist angenommen (E-53); «bei Erfolg immer schliessen» wäre eine Änderung am
Baustein. (2) anzugleichen ist Verhalten und braucht einen Entscheid. (3) nur mit Test umbauen.

### 2026-11-15 — Turniere und Anlässe der Verwaltung: die Zahl sagt ein Vorleser wohl nicht an

**Thema:** Barrierefreiheit

**Fundort:** `src/routes/verwaltung/turniere/+page.svelte:22`,
`src/routes/verwaltung/anlaesse/+page.svelte:22` (`role="status"`).

**Beobachtung:** Seit die beiden Listen in `+page.ts` laden (E-48), steht der Text mit
`role="status"` beim Einhängen schon fertig da und ändert sich danach nicht mehr. Eine solche
Region wird gewöhnlich nur bei Änderungen angesagt.

**Ursprung:** Review von Schritt 15, Lauf 2 (Refactoring-Analyse 1d, H-16; Protokoll E.9).

**Einschätzung:** Nicht mit einem Vorleser geprüft. Mit VoiceOver und TalkBack ansehen; sonst
`role="status"` weglassen.

### 2026-11-15 — Wächter nutzt `Object.hasOwn`; welche Geräte die App trägt, ist nicht festgelegt

**Thema:** Struktur

**Fundort:** `src/lib/login/waechter.ts:74`.

**Beobachtung:** `Object.hasOwn` läuft bei jedem Laden einer Seite; Safari vor 15.4 kennt es nicht.
Ein Build-Ziel für ältere Browser ist nicht gefunden (nicht gesucht).

**Ursprung:** Review von Schritt 15 (Refactoring-Analyse 1d, H-15; Protokoll E.9).

**Einschätzung:** Fachfrage, kein Refactoring: Was verspricht die App älteren Geräten? Danach
entweder nichts tun oder die Stelle ersetzen.

### 2026-11-15 — Aufräumreste: Name eines Dienst-Typs, toter Code ohne Werkzeug

**Thema:** Struktur

**Fundort:** `MitteilungAdminDienste` (`src/lib/server/mitteilung/typen.ts`, 44 Dateien unter
`src/`, `scripts/`, `tests/`); exportierte Namen im ganzen Repo.

**Beobachtung:** (1) Der Dienst-Typ heisst nach den Mitteilungen, dient aber fünf Themen (`admin`,
`turnier`, `cm`, `gespraech`, `mitteilung`). (2) Am 14.11.2026 hatten unter `src/lib` 83
exportierte Namen keinen Nutzer ausserhalb ihrer Datei, 51 nur Tests. Schritt 20 hat drei entfernt
und bei 25 nur `export` weggenommen; der Rest bleibt mit Grund (Typen in Signaturen, Listen, von
Tests geprüft). Dass neue tote Namen auffallen, hielte nur ein Werkzeug fest (ein Paket wie `knip`).

**Ursprung:** Refactoring Schritt 20, Nachmessen (Refactoring-Analyse 1c, N-12; 1e, H3-07 und
H3-08; Protokoll F.3).

**Einschätzung:** (1) Umbenennen berührt die Erlaubt-Liste der Bauregel und 44 Dateien; nur mit
einem Umbau dort. (2) wäre eine neue Abhängigkeit und braucht die Freigabe des Projektleiters.

### 2026-11-15 — Datenbanktest reisst die Zeitgrenze für die Verbindung (3 s)

**Thema:** Tests

**Fundort:** `src/routes/api/mail-nur-an.db.test.ts`, Test «Verwaltung: der Hinweis an die alte
Adresse (SI-09, ohne Pool)»; `src/lib/server/db/index.ts` (`connectionTimeoutMillis: 3000`).

**Beobachtung:** In einem vollen `make check` brach der Test mit «timeout exceeded when trying to
connect» ab (in `gueltigeSitzungen`); der nächste Lauf auf demselben Stand war grün (2484 von
2484). Der Branch änderte nur Kommentare und Doku.

**Ursprung:** Refactoring, Nachtrag zur Etappe 3 (`docs/refactoring-analyse.md`, 7.6).

**Einschätzung:** Kein Fehler der App. Vermutung: Last auf dem gemeinsamen Datenbank-Container
(paralleler Prüflauf einer anderen Session oder Docker kurz nach dem Start); die Tests «ohne Pool»
bauen je eine eigene Verbindung auf. Tritt es wieder auf, die Zeitgrenze für Tests höher setzen.
Verwandt: der Eintrag vom 13.11.2026 zu «Liste mit Suche».

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

### 2026-11-14 — Die Regel «nicht über CSS-Klassen suchen» hält die Praxis nicht

**Thema:** Tests

**Fundort:** `CLAUDE.md` (Abschnitt Tests); rund 108 Suchen über Klasse oder Element in 22 E2E-Dateien, z. B. `div.karte` in `cm-ablauf.test.ts`, `cm-anmeldung.test.ts`, `cm-verwaltung.test.ts`, `cm-doppel.test.ts`.

**Beobachtung:** Die Karte einer Kategorie ist ein `<div class="karte">` ohne Rolle und Namen; für «Rolle und Beschriftung» bräuchte sie beides (ändert, was ein Bildschirmleser vorliest).

**Ursprung:** Refactoring Schritt 20, Nachmessen (`docs/refactoring-analyse.md`, F.3, Hinweis (g)).

**Einschätzung:** Gehört in die Revision der `CLAUDE.md` (Schritt 24: Regel so fassen, wie sie gilt). Zahl über ein Muster gezählt, nicht einzeln geprüft.

**Ergänzung (15.11.2026, Refactoring Schritt 25).** Gezählt am Stand `4c7b340` (Refactoring-Analyse
1e, C3 (b), jeder Selektor nach seiner Form): 146 Suchen über einen CSS-Selektor in 24 Dateien
(22 Tests, 2 Hilfen), davon 104 über eine Klasse (`details.klappe` 7, `div.karte` 6, `header.kopf`
6, `.kachel` 5, `.kopf-titel` 5, `.brief-code` 5), 32 nur über ein Element (`summary` 18, `html` 4),
5 über ein Attribut, 5 über eine `id`; dagegen 1527 über Rolle, Beschriftung oder Text. Sieben
Dateien tragen 111 davon: `verwaltung` 28, `hilfe` 17, `navigation` 15, `bewegung` 14, `briefe`
14, `cm-gespraech` 13, `cm-verwaltung` 10. Nicht gezählt: 9 `querySelector` in `page.evaluate`, 12
Prüfungen `toHaveClass` oder `toHaveCSS`. Die «rund 108» oben kamen aus einem engeren Muster.
Schritt 24 hat die Regel so gefasst, wie sie gilt (E-68, E-92: Element oder Klasse nur, wo es
weder Rolle noch Beschriftung gibt); der Bestand bleibt. Offen ist nur noch der Abbau als eigener
Vorgang: Karten und Klappen bräuchten Rolle und Namen, das ändert, was ein Bildschirmleser
vorliest, und braucht je Stelle einen Entscheid.

### 2026-11-14 — CM-Seite: Fokus nach einer Aktion hängt vom Zeitpunkt im Browser ab

**Thema:** Barrierefreiheit

**Fundort:** `src/routes/clubmeisterschaft/[id]/+page.svelte`, `fokusNachAnfrage()`; Fehlerzweige
der Aktionen (Anmelden, Wildcard, Abmelden, Zurückziehen) über `src/lib/cm/ablauf.ts`.

**Beobachtung:** Nach «hinfällig» setzt die Seite den Fokus nur dann auf den Titel der ersten
Anfrage, wenn die gesperrte Taste ihn schon verloren hat; das entscheidet der Browser je nach
Zeitpunkt. Sonst bleibt er auf der Taste. Gesetzt wird zudem der erste Titel, nicht die Anfrage,
die man angetippt hat. In den Fehlerzweigen mit Neuladen fällt der Fokus in den Seitenkörper
(WCAG 2.4.3).

**Ursprung:** Refactoring Schritt 16; zwei rote Läufe der iPhone-CI am 14.11.2026
(`docs/refactoring-analyse.md`, Abschnitt 1d «Fokus-Wackler», E-54, E-55).

**Einschätzung:** Altes Verhalten, vom Refactoring nur sichtbar gemacht. Richtig wäre: Fokus
unbedingt auf den Titel derselben Anfrage, Fehlerzweige ohne Fokusverlust. Das ändert Verhalten
und wartet auf das Ende des Feature-Stopps. Die E2E-Prüfung ist bis dahin gelockert.

**Ergänzung (15.11.2026, Refactoring Schritt 25).** Der Feature-Stopp ist mit dem Merge von
Schritt 24 am 15.11.2026 beendet (E-95); der Eintrag wartet auf nichts mehr. Die Lösung heisst in
der Refactoring-Analyse «B2» (1d, Unterabschnitt «Fokus-Wackler», H-27): nach einem Wort den Fokus
unbedingt auf den Titel derselben Anfrage, wenn sie noch steht, die Fehlerzweige ohne Fokus auf die
Taste der Kategorie. Aufwand dort: Seite und Vorab-E2E anpassen, vor dem Merge einmal die CI auf
dem Branch (Skill `tco-branching`, Schritt 3).

### 2026-11-13 — Interclub: Kleinigkeiten der Seite einer Begegnung

**Thema:** Interclub

**Fundort:** `src/routes/interclub/[id]/[begegnung]/+page.svelte`, `src/lib/server/interclub/swiss-tennis.ts` (`pruefeBericht`)

**Beobachtung:** (1) «Einzelpartien noch nicht da» steht auch, wenn Swiss Tennis einen Bericht dauerhaft nicht hat (z. B. ältere Saisons nach `make ic-import JAHR=2021`). (2) Der Leertext «Nicht gespielt: Die Begegnung war nach den Einzeln entschieden.» erschiene auch im Reiter *Einzel*, wenn dort keine Partie steht (in den Daten 2026 nie). (3) Eine doppelte Position im selben Bericht meldet der Import als `stoerung` statt `form`; der alte Stand bleibt in beiden Fällen.

**Ursprung:** #81 Teil 2, Code-Review (als klein eingestuft)

**Einschätzung:** Beim Nachladen alter Saisons (1) prüfen; (2) und (3) nur bei Bedarf. Vorläufig.

### 2026-11-13 — E2E «Reiter ist beim Antippen sofort aktiv» wackelt unter Last

**Thema:** Tests

**Fundort:** `tests/e2e/bewegung.test.ts:93` (Zeitgrenze 500 ms auf `aria-current`)

**Beobachtung:** Im vollen `make check` einmal rot auf Android, einzeln 3× grün (54/54). Die 500 ms reichen bei voller Last mit drei Workern knapp nicht.

**Ursprung:** #81 Teil 2, `make check` vor dem Merge

**Einschätzung:** Kein Fehler der App; bei Wiederholung die Zeitgrenze des Tests prüfen. Vorläufig.

**Nachtrag 2026-11-15:** In der CI auf `dev` (Lauf 43728560539, Merge von Dependabot #82, mit
SvelteKit 3.2 aus #86) war ein zweiter Test derselben Datei auf dem iPhone rot: «Zwei schnelle
Reiter-Klicks hintereinander» (`tests/e2e/bewegung.test.ts:323`, Überschrift «Hoi …» nach 5 s
nicht sichtbar). Lokal im vollen Lauf auf allen drei Geräten grün, in der CI beim Neustart des
Jobs grün. Damit wackeln zwei Tests der Reiter-Bewegung; eine Regression durch SvelteKit 3.2 ist
nicht belegt, aber auch nicht ausgeschlossen. Kommt es wieder: Trace holen, bevor die Zeitgrenze
steigt.

### 2026-11-15 — E2E «Spielersuche springt nicht» einmal rot auf Android

**Thema:** Tests

**Fundort:** `tests/e2e/cm-verwaltung.test.ts:408` («Keine Treffer.» im Dialog nach 5 s nicht
sichtbar)

**Beobachtung:** Einmal rot in der CI auf `dev` (Lauf 43728026093, Merge von Dependabot #86 mit
SvelteKit 3.2.0); lokal im vollen Lauf auf allen drei Geräten grün, beim Neustart des Jobs grün.

**Ursprung:** Merge der Dependabot-PRs #86 und #82 nach dem Refactoring (#80).

**Einschätzung:** Wackler oder Folge von SvelteKit 3.2, offen. Kommt es wieder: Trace mit Netzwerk
holen. Vorläufig.

### 2026-11-13 — Interclub: Randfälle der Übersicht und Import ohne Zeitgrenze

**Thema:** Interclub

**Fundort:** `src/lib/server/interclub/ansicht.ts` (`ladeUebersicht`), `scripts/ic-import.ts`

**Beobachtung:** (1) Ein Spiel, dessen Datum vorbei ist, aber noch ohne Resultat, fällt aus beiden Karten der Übersicht (letzte Resultate und nächste Spiele) und kann die Pausen-Karte falsch machen. (2) Spielen zwei TCO-Teams in derselben Gruppe gegeneinander, erscheint dieselbe Begegnung zweimal in «Letzte Resultate» (einmal als Sieg, einmal als Niederlage). (3) `scripts/ic-import.ts` hat keine Zeitgrenze für den Abruf (`fetch` ohne Timeout).

**Ursprung:** #81 Teil 1, Reviews

**Einschätzung:** Für Teil 3 (Aktualität, regelmässiger Abruf) prüfen: (1) und (2) betreffen die Ansicht in der Saison, (3) wird mit dem regelmässigen Abruf wichtig. Vorläufig.

### 2026-11-13 — Rangliste läuft bei 320 px und grosser Schrift über

**Thema:** Interclub

**Fundort:** Rangliste auf der Team-Seite (`src/routes/interclub/[id]/+page.svelte`, Stile unter `src/lib/design/`)

**Beobachtung:** Auf 320 px breiten Bildschirmen ab etwa 175 % Schrift läuft die Rangliste (zweizeilige Form) noch über: Die Köpfe «Partien» und «Sätze» passen nicht nebeneinander. Die E2E-Geräte (393/412 px, PC) sind nicht betroffen.

**Ursprung:** #81 Teil 1, E2E (Task 9)

**Einschätzung:** Randfall; Kopfbeschriftung kürzen oder die Spalten bei sehr schmalem Platz umbrechen. Vorläufig.

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

