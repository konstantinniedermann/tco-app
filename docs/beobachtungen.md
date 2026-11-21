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

### 2026-11-16 — Junioren-CM verlangt bei Swiss Tennis ein eigenes Turnier

**Thema:** Clubmeisterschaft

**Fundort:** FR-33 (`docs/fachmodell.md`, ein Turnier je Jahr), Etappe *CM-Anmeldung* mit Junioren (K-46).

**Beobachtung:** Laut Ausschreibung «Club Champion Trophy» 2026 (Ziff. 10) müssen Juniorenkategorien bei Swiss Tennis ein eigenes Turnier «Next Gen Trophy» sein. In MyTCO gibt es ein Turnier je Jahr; Junioren melden sich 2027 in MyTCO an. Ob die freiwilligen Turniernummern (0..n) das schon abdecken oder Juniorenkategorien eine eigene Zuordnung brauchen, ist nicht geprüft.

**Ursprung:** Recherche «CM hinter den Kulissen» (`docs/recherche/2026-11-16-cm-ablauf.md`), Frage F10 in #88.

**Einschätzung:** Vermutlich reicht eine zweite Turniernummer je Jahr; spätestens nach dem Gespräch #88 prüfen, vor der Etappe *CM-Anmeldung*.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`schema.ts` → `turnier.jahr` eindeutig, Tabelle `turniernummer` 0..n; `kategorie` hat keinen Bezug zu `turniernummer`, eine zweite Nummer allein trennt die Junioren-Kategorien also nicht). F10 steht im Body von #88 (Lösungsrichtung 2), das Gespräch ist nicht geführt. Offen bis nach #88.

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

### 2026-11-12 — Kostenseite hinkt der Schätzung für den Vorstand nach

**Thema:** Kosten

**Fundort:** `docs/kosten.md` (Laufende Kosten, Nur falls, Szenarien); Kostenschätzung als Artifact «MyTCO Kostenschätzung» für die Vorstandssitzung vom 16.11.2026

**Beobachtung:** Die Schätzung für den Vorstand rechnet mit Posten und Preisen, die `kosten.md` nicht führt: nächste VPS-Stufe 4 vCPU / 4 GB CHF 9.00/Mt. als Worst Case (Infomaniak, 12.11.); GitHub rechnet Actions nicht mehr in Minuten, sondern als Guthaben (Free USD 12, Pro USD 18 pro Monat, Linux USD 0.006/Min.; Pro USD 4/Mt.); Überwachung (Healthchecks.io gratis bis USD 5/Mt.) und Passwort-Tresor (K-49, gratis bis ca. USD 40/Jahr); Best Case Website-Umzug (K-48): Metanet-Webhosting Listenpreise CHF 12.90–24.90/Mt. entfällt, Postfächer zu Infomaniak Mail Service ab CHF 2.29/Mt., Ersparnis ca. CHF 100–245/Jahr. Totals dort: laufend ca. 100–400, Startjahr ca. 120–440. Fairgate-Vergleich und SMS stehen nur noch in `kosten.md`.

**Ursprung:** Kostenschätzung für den Vorstand (Nutzerauftrag, Session 12.11.2026)

**Einschätzung:** `kosten.md` nach dem Vorstandsentscheid (K-03, 16.11.) nachführen, damit Repo und Vorstandsfassung dieselben Zahlen haben; den Abschnitt zu den Actions-Minuten in `ci-cd-und-release.md` auf das Guthaben-Modell prüfen.

**Verifiziert:** 21.11.2026 gegen `dev` 8cb8edf — belegt (`docs/kosten.md` ohne VPS-Stufe CHF 9.00, ohne Actions-Guthaben, Healthchecks, Passwort-Tresor und Zahlen zum Website-Umzug; `docs/ci-cd-und-release.md` «Actions-Minuten» rechnet in Gratisminuten). Das Guthaben-Modell von GitHub ist nicht nachgeprüft.

**Korrektur (21.11.2026, Beobachtungs-Auswertung).** Der Vorstandsentscheid zu K-03 kam am 17.11.2026 («bis CHF 500 pro Jahr», `docs/abklaerungen.md`); `kosten.md` hat K-03.1–3 nachgeführt, die Posten der Vorstandsfassung nicht. Offen ist nur, ob `kosten.md` die Zahlen übernimmt.
