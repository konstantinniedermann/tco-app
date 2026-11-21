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

Letzte Auswertung: 21.11.2026

---

## Offen

### 2026-11-21 — Offene Partner-Anfragen zeigen den Kontakt, solange der Anfragende ein Login hat

**Thema:** Datenschutz

**Fundort:** `src/lib/server/cm/anmeldungen.ts` (`offeneAnfragenAn`, Bedingung `anfrageVonMitLogin`).

**Beobachtung:** Beim Anfragenden prüft die Abfrage nur, ob er ein nutzbares Login hat, nicht
`mitglied.status`. Austritt und Löschvormerkung räumen die Anfragen heute weg
(`zieheOffeneZurueck`) bzw. sperren das Login. Ob jeder Weg zu «nicht aktiv» eines von beiden
tut, ist nicht geprüft.

**Ursprung:** Beobachtungs-Auswertung vom 21.11.2026, Nebenbefund beim Prüfen von
«Kontakt des Doppelpartners».

**Einschätzung:** Vorläufig, ungeprüft. Gehört zur Grenze «Ende der CM» (Eintrag vom
16.11.2026) und sollte mit ihr angesehen werden.

### 2026-11-21 — Interclub: auf Test nur die Saison 2026, ältere Saisons nachladen

**Thema:** Interclub

**Fundort:** Test-Datenbank; `src/lib/server/interclub/import.ts` (`importiereSaison`),
`scripts/ic-import.ts`, `Dockerfile` (Testdaten)

**Beobachtung:** Auf Test stehen seit 21.11.2026 die echten Interclub-Daten 2026 (Verein 2202),
von Hand im App-Container eingespielt. Die Saisons 2021–2025, die Swiss Tennis noch liefert,
fehlen dort. Das Aufsetzen von Test (`scripts/testdaten.ts`) legt keine Interclub-Daten an, und
`scripts/ic-import.ts` ist nicht im Image: Nach dem Neu-Aufsetzen ist der Reiter IC wieder weg.

**Ursprung:** Nutzerhinweis in der Session zum IC-Stand auf Test.

**Einschätzung:** Nutzer will die alten Resultate später auch nachladen. Von Hand je Jahr wie
2026 möglich; dauerhaft löst es der regelmässige Abruf (#81, Teil 3), oder Test lädt beim
Aufsetzen selbst.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`Dockerfile`: kopiert nur `migrate.ts`, `testdaten.ts`, `erfundene-mitglieder.ts`, `admin-festlegen.ts`, nicht `ic-import.ts`; `scripts/testdaten.ts` legt keine IC-Daten an; `betrieb/bin/ausliefern` → `compose test down --volumes` beim Neu-Aufsetzen). Der Stand auf Test selbst ist nicht nachgemessen.

**Korrektur (21.11.2026, Beobachtungs-Auswertung).** #81 Teil 3 sieht weder das Nachladen alter Saisons noch Daten beim Aufsetzen von Test vor («regelmässiger Abruf, Push (kein Löschen alter Saisons)»); ein Abruf nur der laufenden Saison brächte 2021–2025 nach einem Neu-Aufsetzen nicht zurück. Offen ist nur die Entscheidung, ob das zu #81 kommt oder ein eigener Vorgang wird.

### 2026-11-21 — Interclub: ältere Saisons in der Ansicht kaum erreichbar

**Thema:** Interclub

**Fundort:** `src/routes/interclub/+page.svelte`, `src/lib/server/interclub/ansicht.ts`
(`ladeUebersicht`)

**Beobachtung:** Die Übersicht zeigt nur die neueste Saison; eine Wahl älterer Saisons gibt es
nicht. Sind 2021–2025 geladen, kommt man an sie nicht bequem heran.

**Ursprung:** Nutzerhinweis in der Session zum IC-Stand auf Test.

**Einschätzung:** Nutzer will die Browsebarkeit alter Resultate später verbessern. Braucht einen
Entwurf (UI-Leitbild, Design-Artifact «MyTCO Interclub»), bevor gebaut wird; passt zu den
Saisonverläufen, für die Personen- und Ranglistennummern schon gespeichert sind.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`src/lib/server/interclub/ansicht.ts` → `ladeUebersicht` nimmt `max(icTeam.saison)`, `ladeTeam` und `ladeBegegnung` je Team-Nummer die neueste Saison; die Schnittstellen kennen keinen Saison-Parameter; `ansicht.db.test.ts` «Team-Id früherer Saison zeigt die neueste»). #81 enthält keine Saisonwahl. Offen ist nur, wann der Entwurf gemacht wird.

### 2026-11-20 — make seed legt nach dem 31.05.2027 keine Turnier-Anmeldungen mehr an

**Thema:** Tests

**Fundort:** `scripts/beispiel-turnier.ts` (`JAHR = 2027`, Anmeldeschluss `2027-05-31`), `scripts/beispiel-turnier-fuellung.ts`.

**Beobachtung:** `make seed` nimmt die echte Uhrzeit. Nach dem Anmeldeschluss bleibt das Beispielturnier in Vorbereitung, die Beispielanmeldungen ergeben still `geschlossen`, und die Auffüllung läuft nicht. Die DB-Tests bleiben grün, weil sie ein festes Datum nutzen.

**Ursprung:** Review des Branches `feat/seed-testturnier`.

**Einschätzung:** Jahr und Schluss relativ zum Seed-Datum setzen, spätestens im Frühling 2027.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`scripts/seed-lokal.ts` → `new Date()` an `legeBeispielTurnierAn`; `beispiel-turnier.ts` verwirft das Ergebnis von `setzeStatus`; `beispiel-turnier-fuellung.ts` bricht ohne Meldung ab, wenn das Turnier nicht `offen` ist).

**Korrektur (21.11.2026, Beobachtungs-Auswertung).** Auf frischer Datenbank lautet das Wort `nicht-gefunden` (`trageEin` prüft *in Vorbereitung* vor dem Schluss), `geschlossen` nur, wenn das Turnier aus einem früheren Seed schon offen ist. Ebenso fallen die drei Beispielgespräche still weg (`sichtbaresTurnier` schliesst *in Vorbereitung* aus); ab 2028 sind sie auch bei bestehender Datenbank nur noch lesbar. Der Text von `make help` zu `seed` (Interclub 2026, Beispielturnier 2027, drei Gespräche) sagt dann mehr zu, als der Seed liefert. Offen ist nur der Zeitpunkt: spätestens im Frühling 2027.

### 2026-11-16 — Junioren-CM verlangt bei Swiss Tennis ein eigenes Turnier

**Thema:** Clubmeisterschaft

**Fundort:** FR-33 (`docs/fachmodell.md`, ein Turnier je Jahr), Etappe *CM-Anmeldung* mit Junioren (K-46).

**Beobachtung:** Laut Ausschreibung «Club Champion Trophy» 2026 (Ziff. 10) müssen Juniorenkategorien bei Swiss Tennis ein eigenes Turnier «Next Gen Trophy» sein. In MyTCO gibt es ein Turnier je Jahr; Junioren melden sich 2027 in MyTCO an. Ob die freiwilligen Turniernummern (0..n) das schon abdecken oder Juniorenkategorien eine eigene Zuordnung brauchen, ist nicht geprüft.

**Ursprung:** Recherche «CM hinter den Kulissen» (`docs/recherche/2026-11-16-cm-ablauf.md`), Frage F10 in #88.

**Einschätzung:** Vermutlich reicht eine zweite Turniernummer je Jahr; spätestens nach dem Gespräch #88 prüfen, vor der Etappe *CM-Anmeldung*.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`schema.ts` → `turnier.jahr` eindeutig, Tabelle `turniernummer` 0..n; `kategorie` hat keinen Bezug zu `turniernummer`, eine zweite Nummer allein trennt die Junioren-Kategorien also nicht). F10 steht im Body von #88 (Lösungsrichtung 2), das Gespräch ist nicht geführt. Offen bis nach #88.

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

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`cm/schnittstellen.ts` → `getCmAnsicht` ohne Jahresprüfung; `anmeldungen.ts` → `ladeCmAnsicht` weist nur *in Vorbereitung* ab, `fuelleDoppel` gibt den Kontakt nach `mitgliedStatus`, `offeneAnfragenAn` ohne Jahresgrenze; `kontaktSichtbar` nur in `verwaltung.ts` und `verwaltung-doppel.ts`). Prüfpunkt steht offen in #39 unter «Vor `AUSLIEFERUNG_LIVE=an`».

**Korrektur (21.11.2026, Beobachtungs-Auswertung).** Offene Anfragen fallen nicht nur bei der endgültigen Löschung weg, sondern auch beim Austritt (`austritt.ts` → `zieheOffeneZurueck`), bei der Absage einer Kategorie und bei jeder Paarbildung; eine Frist nach Zeit gibt es keine. Die Übersicht zeigt das laufende und alle künftigen Jahre, nicht nur das laufende. FR-19 (`docs/fachmodell.md`) steht auf «umgesetzt», seine Grenze «bis das Turnier *abgeschlossen* ist» gibt es im Code aber nicht. Offen ist nur die Grenze für «Ende der CM» (Entscheid des Projektleiters).

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

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`scripts/pruefungen/testdaten.ts` → nur Muster `MAIL`, `istTestdatei` ohne Ordner `beispiel-interclub/`; `docs/testkonzept.md` «Telefonnummern im Format `+41 00 …`»). Nachgezählt: 17 Dateien mit 76 Fundstellen (`git grep -lE '(\+41 ?\(?7[0-9]|07[0-9] ?[0-9]{3})' -- tests/ 'src/**/*.test.ts'`), dazu `tests/e2e/neue-version.test.ts`; unter `beispiel-interclub/` fallen 82 Dateien durch (63 `bericht-*`, 17 `team-results-*`, 2 `club-teams-*`), ohne Mail oder Telefon. Offen ist nur, ob ersetzt wird und ob die Prüfung Telefonnummern mitprüft.

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

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`CLAUDE.md` seit dem Eintrag unverändert; Stellen wie unten).

**Korrektur (21.11.2026, Beobachtungs-Auswertung).** (1) Drei Routen, nicht zwei: auch `src/routes/api/sitzung/+server.ts` holt selbst die Datenbank (`getSitzung(e, holeDb())`); arc42 Kapitel 5 nennt alle drei. (3) Fünf Zugangs-Schnittstellen ohne `liest`/`schreibt`: dazu `postAnsichtBeenden` (prüft nur `e.locals.konto`). (4) Mit Hook und `http.ts` sieben Stellen. (5) ist erledigt: Kommentar und Meldung der Regel in `eslint.config.js` sagen jetzt «der Service Worker holt nichts». Offen ist nur der Entscheid des Projektleiters, ob die Ränder in die `CLAUDE.md` kommen.

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

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`src/routes/clubmeisterschaft/[id]/+page.svelte` → `fokusNachAnfrage` bricht ab, wenn die Taste den Fokus noch hat, und nimmt den ersten Titel; `src/lib/cm/ablauf.ts` ohne Fokus in den Fehlerzweigen; `tests/e2e/cm-ablauf.test.ts` prüft nur «nicht `document.body`»). B2/H-27 ist nicht umgesetzt. Am 14.11. waren es drei rote iPhone-Läufe in `cm-ablauf.test.ts`, nicht zwei. Offen ist nur, wann es gebaut wird.

### 2026-11-13 — Interclub: Kleinigkeiten der Seite einer Begegnung

**Thema:** Interclub

**Fundort:** `src/routes/interclub/[id]/[begegnung]/+page.svelte`, `src/lib/server/interclub/swiss-tennis.ts` (`pruefeBericht`)

**Beobachtung:** (1) «Einzelpartien noch nicht da» steht auch, wenn Swiss Tennis einen Bericht dauerhaft nicht hat (z. B. ältere Saisons nach `make ic-import JAHR=2021`). (2) Der Leertext «Nicht gespielt: Die Begegnung war nach den Einzeln entschieden.» erschiene auch im Reiter *Einzel*, wenn dort keine Partie steht (in den Daten 2026 nie). (3) Eine doppelte Position im selben Bericht meldet der Import als `stoerung` statt `form`; der alte Stand bleibt in beiden Fällen.

**Ursprung:** #81 Teil 2, Code-Review (als klein eingestuft)

**Einschätzung:** Beim Nachladen alter Saisons (1) prüfen; (2) und (3) nur bei Bedarf. Vorläufig.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt, alle drei (`[begegnung]/+page.svelte` ohne Unterschied zwischen «fehlt noch» und «fehlt dauerhaft»; `{:else}` gilt für Einzel und Doppel; `pruefeBericht` prüft keine doppelte Position, die Verletzung des Schlüssels von `icPartie` landet im `catch` als `stoerung`). Dazu aus dem Code: `Resultat.svelte` verlinkt nur gespielte eigene Begegnungen, die Seite einer offenen Begegnung erreicht man nur über die Adresse. Hinweis für #81, Session 3 (das Issue verweist auf diese Einträge).

### 2026-11-13 — Interclub: Randfälle der Übersicht und Import ohne Zeitgrenze

**Thema:** Interclub

**Fundort:** `src/lib/server/interclub/ansicht.ts` (`ladeUebersicht`), `scripts/ic-import.ts`

**Beobachtung:** (1) Ein Spiel, dessen Datum vorbei ist, aber noch ohne Resultat, fällt aus beiden Karten der Übersicht (letzte Resultate und nächste Spiele) und kann die Pausen-Karte falsch machen. (2) Spielen zwei TCO-Teams in derselben Gruppe gegeneinander, erscheint dieselbe Begegnung zweimal in «Letzte Resultate» (einmal als Sieg, einmal als Niederlage). (3) `scripts/ic-import.ts` hat keine Zeitgrenze für den Abruf (`fetch` ohne Timeout).

**Ursprung:** #81 Teil 1, Reviews

**Einschätzung:** Für Teil 3 (Aktualität, regelmässiger Abruf) prüfen: (1) und (2) betreffen die Ansicht in der Saison, (3) wird mit dem regelmässigen Abruf wichtig. Vorläufig.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt, alle drei (`ansicht.ts` → `ladeUebersicht`: `letzte` verlangt ein Resultat, `naechste` ein Datum ab heute, `abgeschlossen` alle Resultate; Begegnungen je Team-Zeile, nicht nach `begegnungId` zusammengefasst, 2026 nie zwei TCO-Teams in einer Gruppe; `scripts/ic-import.ts` → `holen: (u) => fetch(u)` ohne `signal`, `import.ts` → `abrufen` ohne Grenze). Hinweis für #81, Session 3.

### 2026-11-13 — Rangliste läuft bei 320 px und grosser Schrift über

**Thema:** Interclub

**Fundort:** Rangliste auf der Team-Seite (`src/routes/interclub/[id]/+page.svelte`, Stile unter `src/lib/design/`)

**Beobachtung:** Auf 320 px breiten Bildschirmen ab etwa 175 % Schrift läuft die Rangliste (zweizeilige Form) noch über: Die Köpfe «Partien» und «Sätze» passen nicht nebeneinander. Die E2E-Geräte (393/412 px, PC) sind nicht betroffen.

**Ursprung:** #81 Teil 1, E2E (Task 9)

**Einschätzung:** Randfall; Kopfbeschriftung kürzen oder die Spalten bei sehr schmalem Platz umbrechen. Vorläufig.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt im Code (`src/lib/design/karten.css`: `th` mit `white-space: nowrap`, unter `@container (width < 18rem)` keine weitere Stufe, nur `td` verkleinert); die Darstellung selbst ist nicht gemessen. Hinweis für #81.

### 2026-11-13 — Interclub: Bedeutung des «*» bei Auf- und Abstiegsspielen unklar

**Thema:** Interclub

**Fundort:** Swiss-Tennis-Schnittstelle `/interclub/team-results`, Feld `tableau.results[].team.home|visitor.name`

**Beobachtung:** Ein führendes «* » im Teamnamen markiert nicht den Sieger nach Endstand: 65+ 1L Herren (Team 7396) zeigt «Neuenhof 2 4 : 2 * Olten». MyTCO speichert die Markierung, zeigt sie aber nicht und leitet Sieg/Niederlage aus dem Endstand ab.

**Ursprung:** #81, Teil 1 (Session 13.11.2026), Abruf der Daten 2026

**Einschätzung:** Vermutlich «bleibt in der Liga» bzw. «steigt auf» nach Reglement. Bei Gelegenheit gegen mytennis.ch prüfen; erst dann eine Anzeige (z. B. «steigt auf») erwägen.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`swiss-tennis.ts` → `pruefeSeite` setzt `markiert`, `import.ts` speichert `heimMarkiert`/`gastMarkiert`, keine Anzeige liest sie; `ansicht.ts` → `ergebnisAusSicht` nur aus den Punkten; `team-results-7396.json`: markiert ist der Verlierer). Offen ist nur die Bedeutung (mytennis.ch oder Reglement).

### 2026-11-13 — Interclub: Form noch nicht gespielter Begegnungen erst 2027 prüfbar

**Thema:** Interclub

**Fundort:** Swiss-Tennis-Schnittstelle `/interclub/team-results`, Felder `homeTeamScore`, `visitTeamScore`, `date`

**Beobachtung:** 2026 sind alle Begegnungen gespielt; wie eine offene Begegnung aussieht (Endstand `null`, fehlend oder 0), ist nicht beobachtbar. Der Import nimmt `null` und fehlend als «noch offen» an. Auch die Saison 2027 liefert heute HTTP 500 («Upstream responded with HTTP 404»).

**Ursprung:** #81, Teil 1 (Session 13.11.2026)

**Einschätzung:** Sobald Swiss Tennis den Spielplan 2027 freischaltet (Frühling), einmal `make ic-import JAHR=2027` und die Antwort prüfen; spätestens in Session 3 von #81 (regelmässiger Abruf).

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`swiss-tennis.ts` → `endstand`: `undefined` und `null` gelten als offen; schickt Swiss Tennis `0`, gälte das Spiel als gespielt, 0:0 unentschieden). Gemessen am 21.11.2026: `team-results` für 2027 gibt `500 {"error":"Java API error: Upstream responded with HTTP 404"}`; `club-teams` 2027, der erste Aufruf des Imports, ist nicht gemessen. Offen bis zum Spielplan 2027.

### 2026-11-12 — Kostenseite hinkt der Schätzung für den Vorstand nach

**Thema:** Kosten

**Fundort:** `docs/kosten.md` (Laufende Kosten, Nur falls, Szenarien); Kostenschätzung als Artifact «MyTCO Kostenschätzung» für die Vorstandssitzung vom 16.11.2026

**Beobachtung:** Die Schätzung für den Vorstand rechnet mit Posten und Preisen, die `kosten.md` nicht führt: nächste VPS-Stufe 4 vCPU / 4 GB CHF 9.00/Mt. als Worst Case (Infomaniak, 12.11.); GitHub rechnet Actions nicht mehr in Minuten, sondern als Guthaben (Free USD 12, Pro USD 18 pro Monat, Linux USD 0.006/Min.; Pro USD 4/Mt.); Überwachung (Healthchecks.io gratis bis USD 5/Mt.) und Passwort-Tresor (K-49, gratis bis ca. USD 40/Jahr); Best Case Website-Umzug (K-48): Metanet-Webhosting Listenpreise CHF 12.90–24.90/Mt. entfällt, Postfächer zu Infomaniak Mail Service ab CHF 2.29/Mt., Ersparnis ca. CHF 100–245/Jahr. Totals dort: laufend ca. 100–400, Startjahr ca. 120–440. Fairgate-Vergleich und SMS stehen nur noch in `kosten.md`.

**Ursprung:** Kostenschätzung für den Vorstand (Nutzerauftrag, Session 12.11.2026)

**Einschätzung:** `kosten.md` nach dem Vorstandsentscheid (K-03, 16.11.) nachführen, damit Repo und Vorstandsfassung dieselben Zahlen haben; den Abschnitt zu den Actions-Minuten in `ci-cd-und-release.md` auf das Guthaben-Modell prüfen.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`docs/kosten.md` ohne VPS-Stufe CHF 9.00, ohne Actions-Guthaben, Healthchecks, Passwort-Tresor und Zahlen zum Website-Umzug; `docs/ci-cd-und-release.md` «Actions-Minuten» rechnet in Gratisminuten). Das Guthaben-Modell von GitHub ist nicht nachgeprüft.

**Korrektur (21.11.2026, Beobachtungs-Auswertung).** Der Vorstandsentscheid zu K-03 kam am 17.11.2026 («bis CHF 500 pro Jahr», `docs/abklaerungen.md`); `kosten.md` hat K-03.1–3 nachgeführt, die Posten der Vorstandsfassung nicht. Offen ist nur, ob `kosten.md` die Zahlen übernimmt.

### 2026-11-08 — Doppel: Löscht der CM-Admin eine Anmeldung, sollen die offenen Anfragen mitverfallen

**Thema:** Verwaltung UI

**Fundort:** `src/lib/server/cm/verwaltung-doppel.ts` (`loescheDoppel`, Kommentar «Die Anfragen bleiben.»), `src/lib/server/cm/doppel.ts` (`nimmAnfrageAn`)

**Beobachtung:** Löscht der CM-Admin die Anmeldung eines Suchenden, bleiben dessen offene Anfragen stehen, ebenso die Anfragen **an** ihn. Nimmt jemand später an, entsteht das Paar neu (`nimmAnfrageAn` prüft keine Anmeldung, `bildePaar` legt eine neue an). Beim Selbst-Abmelden (`meldeAb`) ist es heute gleich.

**Ursprung:** Restbefunde aus den Reviews von #59 Etappe 2

**Einschätzung:** **Entscheid Projektleiter (09.11.2026, Beobachtungs-Auswertung): mitlöschen.** Umsetzung offen, eigener Branch mit Brainstorming. Zu klären: gilt es auch beim Selbst-Abmelden; welche Meldung bekommen die Angefragten (DS-05, Push vor Mail); FR-06/FR-48 im Fachmodell nachführen.

**Verifiziert:** 09.11.2026 gegen `dev` e947d25 — belegt (`verwaltung-doppel.ts` → `loescheDoppel` ruft `anfragenVerfallen` nicht auf; `doppel.ts` → `nimmAnfrageAn` ohne Prüfung der Anmeldung des Anfragenden). Offen ist nur die Umsetzung.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — weiter belegt (`verwaltung-doppel.ts` → `loescheDoppel` ruft `anfragenVerfallen` nicht auf; `doppel.ts` → `nimmAnfrageAn` und `bildePaar` prüfen keine Anmeldung; `anmeldungen.ts` → `meldeAb` ebenso; kein Test zu `loescheDoppel` prüft Anfragen). `59acbd4` berührte nur `ladeDoppel`. Offen ist nur die Umsetzung.

### 2026-11-09 — Spielersuche zeigt dem CM-Admin Geschlecht und Jahrgang aller aktiven Mitglieder

**Thema:** Datenschutz

**Fundort:** `src/lib/server/cm/verwaltung.ts` → `sucheSpieler`; `src/lib/verwaltung/turnier-anzeige.ts` → `trefferText`; `docs/datenschutz.md` «Wer sieht was», Zeile CM-Admin; `docs/rollen-und-rechte.md` «Geschlecht und Jahrgang der Spieler (zum Zuordnen)»

**Beobachtung:** Beim Anmelden von Hand findet die Suche jedes aktive Mitglied und zeigt Klassierung, Geschlecht und Jahrgang. Konzept und Matrix nennen Geschlecht und Jahrgang nur «der Spieler». Die Erklärung («um dich in die passenden Kategorien einzuordnen») deckt den Zweck ab.

**Ursprung:** Session K-42, beim Eingrenzen der Kontaktdaten aufgefallen

**Einschätzung:** Niedrig; vermutlich nur Wortlaut («der Spieler und der Treffer der Suche beim Anmelden von Hand»). Beide Wege offen: Zusage präzisieren oder Treffer ohne Jahrgang/Geschlecht.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`cm/verwaltung.ts` → `sucheSpieler` liefert Klassierung, Geschlecht und Jahrgang für jedes aktive Mitglied, höchstens 20 Treffer; `turnier-anzeige.ts` → `trefferText`; `docs/datenschutz.md` und `docs/rollen-und-rechte.md` nennen «der Spieler»). Offen ist nur der Weg: Zusage präzisieren oder Treffer ohne Jahrgang und Geschlecht.

### 2026-11-21 — Server ohne Swap: bei Speichermangel beendet Linux sofort einen Prozess

**Thema:** Betrieb

**Fundort:** Server (VPS Lite 2 vCPU / 4 GB), `swapon --show` leer; `betrieb/server/einrichten.sh`
legt keinen Swap an.

**Beobachtung:** Der Server hat keinen Auslagerungsspeicher. Gemessen am 21.11.2026 (nur Test
läuft): 0.8 von 3.9 GB belegt, 3.1 GB verfügbar. Wird der Speicher knapp (Live, Website nach
K-48, Spitze beim Build eines Containers), beendet der OOM-Killer ohne Vorwarnung einen Prozess,
im schlimmsten Fall PostgreSQL von Live.

**Ursprung:** Nutzerfrage «reicht ein Server für Test und Live?», einmalige Messung per SSH;
Gedanken zur Lastüberwachung im Kommentar zu #39.

**Einschätzung:** Heute viel Reserve, darum nicht dringend. Kandidat für die Einrichtung vor
`AUSLIEFERUNG_LIVE=an`: kleine Swap-Datei (z. B. 1–2 GB, niedrige `swappiness`) und/oder
Speichergrenzen je Container, damit nicht die Live-DB das Opfer ist. Swap-Datei liegt auf der
Platte des Servers; Datenschutz prüfen (Speicherinhalte der Live-App können ausgelagert werden).

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt im Repo (`git grep -i swap -- betrieb` leer; auch keine Speichergrenzen je Container in `betrieb/compose.*.yml`). Die Messung auf dem Server ist vom selben Tag und nicht wiederholt. #39 führt unter «Vor `AUSLIEFERUNG_LIVE=an`» keinen Punkt zu Speicher. Offen ist nur, ob der Befund dort aufgenommen wird.
