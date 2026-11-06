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

### 2026-11-06 — Kleinbefunde aus den Reviews von #43 (Rollen schärfen)

**Thema:** Rollen und Rechte

**Fundort:** `src/lib/server/admin/`, `src/lib/verwaltung/`, `src/routes/`, `scripts/`, `tests/e2e/`, `drizzle/0009_rollen_schaerfen.sql`

**Beobachtung:** Aus den Task- und Schluss-Reviews, als «nicht vor dem Merge» eingestuft:
- `postMitglied` (`src/lib/server/admin/schnittstellen.ts`): Dass der Hinweis an die alte Adresse bei `vergeben`/`veraltet` ausbleibt, ist ungetestet.
- `src/lib/server/admin`: einmaliger, nicht reproduzierter Flake in den DB-Tests (vermutlich die geteilte DB).
- `machAdmin` (`src/lib/server/admin/erster-admin.ts`) wertet das Ergebnis `veraltet` von `setzeRollen` nicht aus.
- `src/lib/server/admin/schnittstellen-letzter-admin.db.test.ts` hängt von der Reihenfolge ab.
- Migrationstest 0009 schreibt die Ausgangsdaten mit dem aktuellen TS-Schema; er altert mit jedem Schema-Wechsel.
- `scripts/seed-lokal.ts` koppelt Rollen und Personas über Indizes.
- Rechte-Matrix-Test (`src/lib/server/admin/rechte-matrix.db.test.ts`): Der Spread zweier Listen kann eine Namenskollision verdecken; Aufbau mit gleichen IDs; Testnamen ohne RR-/SI-Kennung.
- `ANSICHT_ROLLEN` steht doppelt (Schema-Literal in `src/lib/server/db/schema.ts` und `src/lib/server/admin/rollen.ts`).
- `ansicht_rolle` wird nur in `setzeRollen` gelöscht (`src/lib/server/admin/rollen.ts`); vor Etappe 3 beachten.
- Ansicht als …: Eine Störung von `/api/sitzung` lässt die Tasten wieder erscheinen (der Server weist ab); zwei Quellen für denselben Zustand.
- `src/routes/anlass/[id]/+page.svelte`: Hinweis «Datum oder Ort geändert» steht in der Ansicht ohne Aktion.
- `nur-ansehen` ausserhalb der Verwaltung (zweiter Tab) ohne eigene Meldung.
- Root-Load (`src/routes/+layout.ts`) fragt `/api/sitzung` auch auf öffentlichen Seiten ab; doppelte Anfrage in `src/routes/+page.ts` und `src/routes/profil/+page.ts`.
- `fieldset.nur-lesen` ohne Erklärung für Screenreader; Band-Name «Ansicht» knapp.
- Sperrmuster in 4 Formularen kopiert; Name `nurAnsehen` doppeldeutig; Export `NUR_ANSEHEN` (`src/lib/verwaltung/anzeige.ts`) ausserhalb der Datei unbenutzt.
- E2E (`tests/e2e/verwaltung.test.ts`): axe nicht ganz am Testende; kein E2E für «keine Rückfrage in der Ansicht».
- Befehlsname «Admin festlegen» (`make admin`, `scripts/admin-festlegen.ts`) passt nicht mehr zum Wortgebrauch der vier Rollen.

**Ursprung:** #43 Reviews Rollen-Umbau.

**Einschätzung:** Alles klein. `ansicht_rolle` und die doppelte Quelle für die Ansicht vor Etappe 3 ansehen; der Befehlsname lässt sich mit der nächsten Arbeit an den Skripten angleichen.

### 2026-11-06 — CI: langsamer Ubuntu-Spiegel macht den E2E-Lauf rot, auch nach dem Fix der apt-Sperre

**Thema:** Betrieb

**Fundort:** `.github/workflows/check.yml`, Job «E2E (Playwright)», Schritt «Systempakete für die Browser» (`playwright install-deps`, höchstens 8 Minuten)

**Beobachtung:** Lauf 42186755560 auf `dev` (Merge 0.5.2): Die Paketlisten kamen in einer Sekunde, danach lieferte `azure.archive.ubuntu.com` die Pakete im Minutentakt (Get:2 bis Get:6 in gut 5 Minuten, dann nichts mehr); nach 8 Minuten brach der Schritt ab. Derselbe langsame Spiegel stand hinter den beiden apt-Sperren vom 05.11. (Läufe 41999966173, 42058627189), also 3-mal in rund 57 Läufen. Der Lauf auf dem Branch eine Viertelstunde vorher brauchte für denselben Schritt 1½ Minuten. Der Fix 6fea09a beseitigt nur die Selbstsperre, nicht den langsamen Spiegel.

**Ursprung:** Beobachtungs-Auswertung vom 06.11.2026, CI nach dem Merge.

**Einschätzung:** Ein Neustart des Jobs hilft meist. Dauerhaft wohl nur ohne apt: den E2E-Job im offiziellen Playwright-Container laufen lassen (Image mit Browsern und Systempaketen) — eine neue Abhängigkeit, braucht Freigabe. Alternativ apt mit eigenem Zeitlimit je Verbindung und einem zweiten Versuch, der den ersten sicher beendet (`sudo timeout …`).

**Entscheid Nutzer (06.11.2026):** vorerst nichts ändern, Container allenfalls später. Abwägung: deutlich stabiler (kein Ubuntu-Download mehr), kaum schneller (der Pull des Images frisst den Gewinn grösstenteils), Image-Version muss mit Playwright mitgezogen werden.

**Nachtrag (06.11.2026, nachmittags):** Nach dem Entscheid noch dreimal am selben Tag, jedes Mal mit demselben Abbruch nach 8 Minuten und nach einem Neustart des Jobs grün: Release-PR #62 (desktop), Merge 0.6.1 auf `dev` (android), Merge 0.7.0 auf `dev`, Lauf 42223464675 (iphone).

**Umgesetzt (06.11.2026):** Entscheid revidiert, die E2E-Jobs laufen im Playwright-Image (Branch `fix/ci-playwright-container`); kein apt mehr. Der Umbau deckte einen App-Fehler auf (veraltete Seite nach dem Speichern durch Vorladen beim Überfahren), behoben in `fix/vorladen-veraltet`. Bei der nächsten Auswertung ins Archiv.

### 2026-11-06 — make check baut die App doppelt: einmal selbst, einmal im Webserver der E2E-Tests

**Thema:** Betrieb

**Fundort:** `Makefile` (`check`: `npm run build`, dann `make e2e`), `playwright.config.ts` (`webServer.command`: `npm run build && …`)

**Beobachtung:** `make check` baut die App mit `npm run build` und startet danach die E2E-Tests, deren Webserver noch einmal `npm run build` ausführt. In der CI baut jeder der drei E2E-Jobs ebenfalls selbst. Kostet lokal geschätzt 20–30 s pro voller Prüfung.

**Ursprung:** Analyse, warum Merges lange dauern (Branch `feat/schnellere-merges`).

**Einschätzung:** Kleine Ersparnis; ein Umbau müsste sicherstellen, dass die E2E-Tests nie gegen einen veralteten Build laufen. Erst angehen, wenn die Prüfdauer wieder stört.

### 2026-11-06 — «Importing a module script failed» lokal in make check: zwei rote von drei vollen Läufen

**Thema:** Betrieb

**Fundort:** Profil `iphone` (WebKit), `tests/e2e/verwaltung.test.ts:212` (SI-08) und `tests/e2e/anlass.test.ts:158` (A-ANLASS-01); Seitenfehler-Sammlung `fehler`

**Beobachtung:** Lokal mit 5 Workern zweimal am selben Vormittag rot, jeweils nur durch den Seitenfehler «TypeError: Importing a module script failed.»; einzeln mit `--repeat-each 5` grün, der dritte volle Lauf grün. Branch ohne App-Code. Das Archiv (Eintrag vom 04.11.) zählt nur CI-Läufe; lokal kostet jeder Fehlversuch ein ganzes `make check` und verlängert so den Merge.

**Ursprung:** Branch `feat/schnellere-merges`, Nachweisläufe von `make check`.

**Einschätzung:** Vermutlich derselbe Wettlauf wie im archivierten Thema, unter lokaler Last mit mehr Workern häufiger. Der Trigger im Archiv zählt nur CI; lokal wäre eine eigene Regel zu überlegen (z. B. den Seitenfehler gezielt ignorieren, wenn die Seite danach korrekt geladen ist).

### 2026-11-06 — Grüner Stand: Abwägung «lokal weniger prüfen, CI fängt auf» ohne ADR

**Thema:** Betrieb

**Fundort:** `scripts/pruefungen/gruener-stand.ts`, `.githooks/pre-push`, `docs/ci-cd-und-release.md` («Grüner Stand»)

**Beobachtung:** Der Pre-Push-Hook lässt `make check` aus, wenn derselbe Stand schon grün geprüft wurde und seither nur Doku und die Versionsnummer dazukamen. Die Begründung (Wartezeit gegen lokale Schranke, die CI prüft jeden Push auf `dev`) steht nur in der Release-Doku und im Commit, nicht als ADR. Die Versionsregel bekam für eine Abwägung von ähnlichem Gewicht nachträglich ADR-007.

**Ursprung:** Review (`cas-reviewer`) des Branches `feat/schnellere-merges`.

**Einschätzung:** Ein kurzes ADR wäre konsistent mit ADR-007; nötig wird es spätestens, wenn jemand die Schranke wieder verschärfen oder weiter lockern will.

### 2026-11-06 — npm-Skript e2e:browser wird nirgends mehr aufgerufen

**Thema:** Betrieb

**Fundort:** `package.json` (`e2e:browser`)

**Beobachtung:** Die CI installiert Systempakete und Browser jetzt pro Gerät direkt über `playwright install-deps`/`install`. `e2e:browser` (beide Browser mit `--with-deps`) ruft weder die CI noch das Makefile noch die Doku auf.

**Ursprung:** Review (`cas-reviewer`) des Branches `feat/schnellere-merges`.

**Einschätzung:** Entweder als lokaler Einrichtungsbefehl in README/Makefile nennen oder entfernen; eine Änderung an `package.json` zählt als Code und bringt eine Versionsnummer, daher mit dem nächsten Code-Merge erledigen.

**Nachtrag (06.11.2026):** Die CI installiert gar nichts mehr, die E2E-Jobs laufen im Playwright-Image (`fix/ci-playwright-container`). `e2e:browser` bleibt damit erst recht ungenutzt; lokal installiert die README die Browser mit `playwright install chromium webkit`.

### 2026-11-06 — Live-Schlüssel könnte jetzt in einer Deployment-Umgebung nur für main liegen

**Thema:** Betrieb

**Fundort:** `.github/workflows/check.yml` (Job `ausliefern`, `SSH_SCHLUESSEL_LIVE`), `docs/ci-cd-und-release.md` («Schutz des Auslieferungswegs»), `docs/sicherheitskonzept.md` («Neu zu bestätigen»)

**Beobachtung:** Seit das Repo öffentlich ist, gibt es Deployment-Umgebungen mit Schutzregeln ohne GitHub Pro. Die SSH-Schlüssel liegen aber noch als gewöhnliche Repo-Secrets: Ein Workflow, der auf `dev` gepusht wird, kann den Live-Schlüssel lesen. Eine Umgebung `live` mit «nur `main` darf ausliefern» würde genau das Restrisiko schliessen, das im Sicherheitskonzept noch zu bestätigen ist. Zudem prüft jetzt auch GitHub selbst auf Secrets (mit Sperre beim Push); der Kommentar in `secret-scan.yml` («für private Repos kostenpflichtig») stimmt nicht mehr ganz, gitleaks bleibt trotzdem nützlich. Ebenso veraltet: der Kommentar in `check.yml` (Zeilen 5–6, Minuten über alle privaten Repos geteilt). Und `docs/betrieb-und-uebergabe.md` («Restrisiko plötzlicher Ausfall») hält die Nachfolger-Einstellung von GitHub-Privatkonten für ungeprüft «für private Repos»; für das jetzt öffentliche Repo neu prüfen.

**Ursprung:** Session «Actions-Minuten», Wechsel des Repos auf öffentlich.

**Einschätzung:** Lohnt sich vor der ersten Live-Auslieferung (`AUSLIEFERUNG_LIVE`); Änderung am Workflow zählt als Code und braucht einen Probelauf auf `dev` und `main`. Der Kern (Umgebungen für die Schlüssel) ist mit Zustimmung des Projektleiters jetzt Issue [#61](https://github.com/konstantinniedermann/tco-app/issues/61), wartet auf das Hosting (#39); offen hier bleiben nur die veralteten Kommentare und die Nachfolger-Einstellung.

### 2026-11-06 — Repo öffentlich: Entscheid ohne ADR, Vereinsunterlagen jetzt einsehbar

**Thema:** Betrieb

**Fundort:** `docs/ci-cd-und-release.md` («Öffentliches Repo, `main` auf GitHub geschützt»), `docs/anforderungen/` (Anforderungs-PDF, Autorfeld in den Metadaten), `CLAUDE.md` (Ausnahme für das Anforderungsdokument)

**Beobachtung:** Der Wechsel auf öffentlich kehrt den früheren Entscheid «privat, kein GitHub Pro» um und lässt sich nicht ganz zurücknehmen. Begründung und Alternativen (Budget erhöhen, GitHub Pro, CI-Minuten senken) stehen nur in einem Nebensatz der CI/CD-Doku, nicht als ADR. Öffentlich sind jetzt auch Anforderungs-PDF, Abklärungen, Recherchen, Issues und CI-Logs. Im Autorfeld des PDFs steht der volle Name der verfassenden Person aus dem Vorstand; der Projektleiter hat entschieden, es so zu lassen und den Vorstand nicht zu informieren. Die Ausnahme in `CLAUDE.md` für das Anforderungsdokument stammt aus der Zeit, als das Repo privat war.

**Ursprung:** Review (`cas-reviewer`) des Branches `docs/repo-oeffentlich`.

**Einschätzung:** Ein kurzes ADR würde den Entscheid und die Alternativen festhalten (ähnlich ADR-007). Neue Vereinsdokumente vor dem Einchecken auf Metadaten prüfen.

### 2026-11-06 — Turnierjahr ändern prüft bestehende Kategorien nicht gegen das neue Jahr

**Thema:** Turnier-Verwaltung

**Fundort:** `src/lib/server/turnier/turniere.ts`, `aendereTurnier`

**Beobachtung:** Wird das Turnierjahr geändert, werden bestehende Kategorien nicht gegen das neue Jahr geprüft. Ein Jahrgang bis kann dadurch grösser als das Turnierjahr werden.

**Ursprung:** Review #57.

**Einschätzung:** Niedrig; in der Praxis bleibt das Jahr eines Turniers fest.

### 2026-11-06 — Letzte Kategorie absagen kann ein offenes Turnier ohne aktive Kategorie hinterlassen

**Thema:** Turnier-Verwaltung

**Fundort:** `src/lib/server/turnier/turniere.ts`, `sageKategorieAb`

**Beobachtung:** `sageKategorieAb` sperrt die Turnierzeile nicht. Zusammen mit dem Absagen der letzten Kategorie kann ein offenes Turnier ohne aktive Kategorie entstehen.

**Ursprung:** Review #57.

**Einschätzung:** Mit #58 (Absage-Sperre) mitlösen.

### 2026-11-06 — Kategorientabelle am Handy: Klassierung nur durch seitliches Schieben erreichbar

**Thema:** Turnier-Verwaltung

**Fundort:** `src/routes/verwaltung/turniere/[id]/+page.svelte`, Tabelle *Kategorien*

**Beobachtung:** Am Handy ist die Spalte Klassierung nur durch seitliches Schieben erreichbar; «Einzel» und «Doppel» werden getrennt umbrochen (Ein-zel, Dop-pel).

**Ursprung:** Review #57.

**Einschätzung:** Mit der Spalte Anmeldungen in #58 neu ansehen.

### 2026-11-06 — Kleinbefunde aus den Reviews von #57 (Politur, Testlücken)

**Thema:** Turnier-Verwaltung

**Fundort:** `src/lib/server/turnier/`, `src/lib/verwaltung/`, `src/routes/verwaltung/turniere/`, `scripts/beispiel-turnier.ts`

**Beobachtung:** Aus den Task-Reviews, im Gesamt-Review als «nicht vor dem Merge» eingestuft:
- Hilfetext Mindestsumme sagt «ohne Lizenz», das Fachmodell «keine Lizenz» (`Kategorieformular.svelte`).
- Keine Unit-Tests für `startziel`/`offenFuerCm` (`src/lib/verwaltung/umleiten.ts`); nur E2E.
- Hinweis «Mixed gibt es nur im Doppel.» nicht per `aria-describedby` an die Gruppe gebunden.
- Grenzen der Turniernummern im Browser kopiert (`Turnierformular.svelte`), nicht aus einem gemeinsamen Modul.
- RR-08-Bedingung (nicht gesperrt, Mitglied aktiv) steht zweimal in `src/lib/server/admin/rollen.ts`.
- Seed prüft im Test nur die Kategorienamen, nicht ihre Werte; Zweig «nach dem Anmeldeschluss → in Vorbereitung» ungetestet; Ergebnisse von `legeKategorieAn`/`setzeStatus` werden verworfen.
- Die E2E-Turniere 2097–2099 bleiben nach dem Lauf in der E2E-Datenbank stehen.
- Am Handy hatte der Entwurf zwei Tasten in voller Breite (`taste-breit`), die App nicht.

**Ursprung:** Task- und Gesamt-Review #57.

**Einschätzung:** Alles klein. «keine Lizenz» und die Anzeige am Handy mit Teil 2 (#58) angleichen; RR-08 doppelt fällt beim Rollen-Umbau (Entwurf «Rollen schärfen») ohnehin an.

### 2026-11-06 — Abgewiesener Push nach dev: «nächste freie Nummer» scheitert am eigenen Pre-Push-Hook, wenn dev zwei Schritte weiter ist

**Thema:** Betrieb

**Fundort:** `.claude/skills/tco-branching/SKILL.md` (Schritt 4, «Wird der Push abgewiesen …»), `docs/adr/adr-007-version-pro-merge.md`, `scripts/pruefungen/version-merge.ts` (Vergleich mit dem ersten Elternteil)

**Beobachtung:** Der Hook vergleicht jeden Commit mit seinem ersten Elternteil. Nach `pull --no-commit origin dev` ist das der eigene, noch nicht gepushte Merge-Commit. Hat `dev` inzwischen zwei Code-Merges oder eine Nebenversion bekommen, ist die nächste freie Nummer kein einzelner Schritt mehr, und der Push wird dauerhaft abgewiesen; zurücksetzen verbietet der Ablauf. In einem Wegwerf-Repo nachgestellt: `version-merge: …: 0.6.1 → 0.6.3 ist kein einzelner Schritt`, Exit 1. Kein Test deckt den Fall ab.

**Ursprung:** Doku-Abgleich vor dem Release vom 06.11.2026.

**Einschätzung:** Randfall, blockiert nur den Merge nach `dev`. Lösungsweg: bei einem Merge-Commit gegen die höchste Version aller Elternteile prüfen, mit eigenem Test.

### 2026-11-06 — Turnierseite verspricht eine Anmeldung der Mitglieder, die es noch nicht gibt

**Thema:** Turnier-Verwaltung

**Fundort:** `src/routes/verwaltung/turniere/[id]/+page.svelte` (Texte bei *Anmeldung offen* «Mitglieder melden sich bis … an» und bei *geschlossen* «Mitglieder sehen ihre Anmeldungen …»)

**Beobachtung:** Für Mitglieder gibt es weder Seite noch Schnittstelle zum Turnier; die kommt mit Teil 2 (#58). Der CM-Verantwortliche liest aber, Mitglieder könnten sich jetzt anmelden. In `docs/versionen.md` (0.6.0) ist der Stand jetzt nachgetragen.

**Ursprung:** Doku-Abgleich vor dem Release vom 06.11.2026.

**Einschätzung:** Heute ohne Wirkung, weil weder Test noch Live ausgeliefert werden. Text anpassen oder bis #58 so lassen; spätestens bevor ein CM-Verantwortlicher die Verwaltung auf Test oder Live sieht.

### 2026-11-06 — Kleinbefunde aus dem Doku-Abgleich vor dem Release (Code-Kommentare, Tests)

**Thema:** Turnier-Verwaltung

**Fundort:** `src/lib/verwaltung/Kategorieformular.svelte`, `src/lib/turnier/klassierung.ts`, `src/lib/server/turnier/schnittstellen.db.test.ts`, `vitest.config.ts`, `.githooks/pre-push`, `Makefile` (Ziel `hooks`), `docs/fachmodell.md`

**Beobachtung:**
- Annahmen nicht dort markiert, wo sie wirken: Vorbelegung der Mindestsumme 9 (K-51) im Kategorieformular, Skala N1–N4/R1–R9 (K-25.1) in `klassierung.ts`; `make annahmen` findet sie nicht.
- Rechte-Test der Turnier-Schnittstellen spielt die Rolle `lizenz` nicht durch (Testkonzept: «jede Rolle»); `lizenz` ist anderswo als Nicht-Verwaltungsrolle getestet.
- `src/lib/turnier/` (Status FR-33, Klassierungsreihenfolge FR-34) liegt ausserhalb der Abdeckungsmessung (`src/lib/server/**`), wie schon `src/lib/anlass/`.
- `.githooks/pre-push` begründet den lokalen Schutz noch mit «Branch-Schutz für private Repos nur mit Pro»; `make help` beim Ziel `hooks` nennt die Versionsprüfung beim Push auf `dev` nicht.
- Fachmodell-Diagramm nennt `AnmeldungAnlass`, der Code `anlassAnmeldung` / `anlass_anmeldung`, obwohl die Namen im Code dem Diagramm folgen sollen.

**Ursprung:** Doku-Abgleich vor dem Release vom 06.11.2026.

**Einschätzung:** Alles klein, Code-Änderungen mit `make check` und Korrekturnummer; nicht im reinen Doku-Release mitgemacht. Abdeckung: entweder `src/lib/turnier/**` mitmessen oder die Ausnahme im Testkonzept festhalten.

### 2026-11-06 — «Importing a module script failed» auch einzeln reproduzierbar (SI-07, iPhone)

**Thema:** Betrieb

**Fundort:** Profil `iphone` (WebKit), `tests/e2e/verwaltung.test.ts:134` (SI-07), Seitenfehler-Sammlung `fehler` der Admin-Seite

**Beobachtung:** Nachtrag zum Eintrag «lokal in make check: zwei rote von drei vollen Läufen»: SI-07 ist nicht nur unter Last rot. Einzeln mit `--project=iphone --repeat-each=10` auf dem Code von `origin/dev` 2 von 10 rot, nur durch «TypeError: Importing a module script failed.»; im vollen `make check` einmal rot, einmal grün. Der Test öffnet einen zweiten Browser-Kontext neben der Admin-Seite.

**Ursprung:** Branch `feat/wappen-start`, Nachweisläufe von `make check`.

**Einschätzung:** Gut reproduzierbar, damit untersuchbar: Mit `--repeat-each` lässt sich eine Ursache (z. B. ein Modul, das während eines Seitenwechsels nachgeladen und abgebrochen wird) eingrenzen. Bis dahin kostet er Wiederholungen von `make check`.

### 2026-11-06 — Rückfrage «Nicht gespeichert» nach Speichern, wenn das Nachladen scheitert

**Thema:** App-Oberfläche

**Fundort:** `src/routes/verwaltung/turniere/[id]/+page.svelte` (Speichern; Status setzen, Fall «unzulässig»), `src/routes/verwaltung/turniere/[id]/kategorien/[kid]/+page.svelte`, `src/routes/verwaltung/anlaesse/[id]/+page.svelte`; Marker `data-ungespeichert`

**Beobachtung:** Scheitert nach erfolgreichem Speichern das Nachladen des Stands, wird das Formular nicht neu aufgebaut; es gilt weiter als geändert, und beim Verlassen kommt die Rückfrage, obwohl gespeichert ist. Wird beim Turnier ein Status-Wechsel als «unzulässig» abgewiesen, lädt die Seite den neuen Stand, baut das Formular aber nicht neu auf: Hat inzwischen ein anderer Admin etwas geändert, gilt das unberührte Formular als geändert. Die graue Speichern-Taste verhält sich schon bisher genauso.

**Ursprung:** Review (`cas-reviewer`) des Branches `feat/wappen-start`.

**Einschätzung:** Nur bei Störungen oder gleichzeitiger Bearbeitung; die Rückfrage schadet dann nicht (Verlassen geht). Beheben, wenn diese Seiten ohnehin angefasst werden: das Formular nach jedem Nachladen neu aufbauen wie bei den Angaben eines Mitglieds (`nachSpeichern`).

### 2026-11-06 — Auswahlfeld «Geschlecht» ist im iPhone-Profil der Verwaltung nur halb so hoch wie die Textfelder

**Thema:** App-Oberfläche

**Fundort:** `src/lib/design/basis.css` (`.feld-zeile select`), sichtbar in `src/lib/verwaltung/Angabenformular.svelte` auf iPhone (WebKit)

**Beobachtung:** Im E2E-Screenshot (iPhone-Profil) zeigt WebKit das `<select>` mit eigenem Aussehen (`menulist`): schmal, ohne den dicken Rand und ohne `--tippflaeche` als Mindesthöhe. Das gilt gesperrt (Baustein *Nur lesen*) wie bearbeitbar; das Kategorieformular hat dieselben Felder. Im selben Bild läuft auch die lange E-Mail-Adresse im Feld abgeschnitten.

**Ursprung:** Screenshots zu #43 (Task 5, Rollen-Umbau der Oberfläche).

**Einschätzung:** Vermutlich verletzt es UI-03 (48 px) am iPhone; die Abhilfe wäre wahrscheinlich `appearance: none` mit einem eigenen Pfeil. Das trifft alle Auswahlfelder, darum erst ins Leitbild und dann am Gerät prüfen.

### 2026-11-06 — Migration, die alte Werte verbietet, legt Seed und E2E paralleler Worktrees lahm

**Thema:** Betrieb

**Fundort:** gemeinsame lokale Datenbank `mytco` aller Worktrees; `drizzle/0009_rollen_schaerfen.sql` (`konto_rolle_rolle_check` ohne `admin`)

**Beobachtung:** Eine Migration, die alte Werte verbietet (hier die Rolle `admin`), lässt Seed und E2E paralleler Worktrees mit älterem Code scheitern, sobald ein Worktree sie in die gemeinsame Datenbank eingespielt hat. Zurück geht es nur mit einer neu aufgesetzten Datenbank. Die Wappen-Session musste auf eine eigene Datenbank `mytco_wappen` ausweichen.

**Ursprung:** #43, Rollen-Umbau.

**Einschätzung:** Eigene Datenbank pro Worktree für E2E erwägen, z. B. `DATABASE_URL` aus dem Namen des Worktrees ableiten, oder den Ausweg im Skill `tco-branching` beschreiben.

### 2026-11-06 — Testkonten aus E2E-Läufen sammeln sich in der gemeinsamen Datenbank an

**Thema:** Betrieb

**Fundort:** gemeinsame lokale Datenbank `mytco`; Seite `/verwaltung/rollen`

**Beobachtung:** Jeder E2E-Lauf legt neue erfundene Konten mit Rollen an, aufgeräumt wird nicht. Auf der Seite *Rollen* stehen z. B. 474 MyTCO-Admins. Das stört Screenshots als Nachweis, weil Listen und Zahlen nicht nach dem Verein aussehen.

**Ursprung:** #43, Screenshots der Seite *Rollen*.

**Einschätzung:** Zusammen mit dem Eintrag oben lösen: Eine eigene Datenbank pro Worktree oder pro Lauf hält die Listen klein; sonst Screenshots auf einer frisch mit `make seed` aufgesetzten Datenbank machen.
