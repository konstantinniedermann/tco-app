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

### 2026-11-04 — E2E im iPhone-Profil (WebKit, Linux-CI) scheitert vereinzelt, ohne sich zu wiederholen

**Thema:** Betrieb

**Fundort:** `tests/e2e/hilfe.test.ts:23` (Klick auf «Hilfe» in der Fusszeile), CI-Lauf 41900100215 auf `dev`.

**Beobachtung:** Beim Merge des Releases 0.4.0 nach `dev` blieb der Klick 30 Sekunden bei «waiting for element to be visible, enabled and stable» hängen; Screenshot und Seitenbaum zeigen die Login-Seite normal, auf `/login` läuft keine Animation. Der Neustart desselben Jobs und der PR-Lauf auf demselben Code waren grün. Früher am selben Tag trafen zwei rote Läufe ebenfalls nur das iPhone-Profil, aber andere Tests (`verwaltung.test.ts:177`, `passkey.test.ts:145`).

**Ursprung:** Release 0.4.0, CI auf `dev`.

**Einschätzung:** Vermutlich die Stabilitätsprüfung von Playwright unter WebKit auf einer ausgelasteten Linux-Maschine, nicht die App; nicht belegt. Häufen sich solche Ausreisser, lohnt ein Blick auf Wiederholungen (`retries`) nur in der CI oder auf die Zahl paralleler Worker im iPhone-Profil.

### 2026-11-04 — Doku-Abgleich vor 0.4.0: offene Punkte ohne Sofort-Fix

**Thema:** Betrieb

**Fundort:** `betrieb/bin/ausliefern:233-246`, `docs/ci-cd-und-release.md` (Rückfall, Ausblick, Actions-Minuten), `docs/testkonzept.md:30-32, 47-49`, `src/lib/server/admin/schnittstellen.db.test.ts`, `src/lib/server/admin/mitglieder.db.test.ts:73, 82, 177`, `src/lib/server/db/schema.ts:58`, `docs/fachmodell.md:59, 61`, `docs/ui-leitbild.md:214`, `src/routes/+page.svelte:39-44`, `docs/datenschutz.md` (Sitzungen).

**Beobachtung:** (1) Scheitert die Migration beim Ausliefern, wird Test vorher geleert und bleibt ohne App; auf Live läuft die alte App weiter, die neue Einrichtung bleibt aber unter `live/betrieb/`. Die Doku beschreibt den Rückfall nur für «App antwortet nicht». (2) Das Testkonzept verspricht pro Schnittstelle den Fall «gesperrtes Konto»; die Schnittstellen-Tests der Verwaltung prüfen ihn nicht, nur der Rollen-Dienst. (3) Die Verwaltung ist eine Kachel auf der Startseite, laut UI-Leitbild ein Eintrag unter *Profil* — Entscheid des Projektleiters offen. (4) Kleinigkeiten: Tests zur Mitgliedernummer tragen die ID FR-25 statt A-MITGLIED-07; FR-25 ist teilweise umgesetzt (eindeutige E-Mail), steht auf geplant; Fachmodell nennt beim Passkey nur Schlüssel und Kennung (Datenschutz ist vollständig) und beim Verlauf nicht «gelöschtes Konto»; Datenschutz nennt den Zeitpunkt der Anmeldung je Sitzung nicht ausdrücklich; Testkonzept nennt als ersten E2E-Ablauf «Daten ergänzen» (FR-02, noch geplant); Kommentar `schema.ts:58` zur Passkey-Kennung ungenau; `proxy.env`-Werte `MYTCO_TEST_BENUTZER`, `MYTCO_TLS`, `MYTCO_HTTP_PORT`/`HTTPS_PORT`, Uhrzeit des Timers (02:30), Wiederholung von `sichern` und Aufräumen alter Images nicht dokumentiert; «innert einer Minute (S)» ist belegt (B); `secret-scan.yml` bricht vorherige Läufe ab, anders als in «Actions-Minuten» gesagt.

**Ursprung:** Doku-Abgleich vor Release 0.4.0 (Bereiche App, Setup, Betrieb, Daten/Tests).

**Einschätzung:** Nichts davon führt Mitglieder oder Vorstand in die Irre. (1) vor der ersten Auslieferung mit #39 klären; (2) mit der nächsten Etappe von #43; (3) braucht eine Entscheidung; (4) gesammelt bei Gelegenheit.

### 2026-11-04 — Ein Teil der Arbeitsweise liegt nicht im Repo und ginge bei einer Übergabe verloren

**Thema:** Betrieb

**Fundort:** `CLAUDE.md` (verweist auf die übergeordnete CLAUDE.md und auf Skills ausserhalb), `docs/betrieb-und-uebergabe.md` (Übergabe-Checkliste, Schritt 1).

**Beobachtung:** Die Nachfolge soll wie der Projektleiter mit Claude Code arbeiten. Das Repo bringt aber nur die Projekt-`CLAUDE.md` und den Skill `tco-branching` mit. Nur auf dem Mac des Projektleiters liegen: die übergeordnete CLAUDE.md (Workflow, Dependencies, Commit-Konvention, Umgang mit Befunden), die Skills `session-start` und `session-wrap-up`, der Agent `cas-reviewer`, der Hook `dep-guard`, das superpowers-Plugin und die Memories mit den Fallen (z. B. WebKit in der CI, Worktree-Isolation, Einstiegsseite im E2E).

**Ursprung:** #10, Brainstorming zur Übergabe; vom Projektleiter bewusst aus #10 ausgeklammert.

**Einschätzung:** Vor einer Übergabe nötig, vorher ohne Folge. Was nur für tco-app gilt, liesse sich ins Repo holen (`.claude/`, Fallen nach `docs/`); berührt die gemeinsamen Regeln der anderen CAS-Projekte.

### 2026-11-04 — Hilfe beim Start: Kleinigkeiten aus dem Review

**Thema:** App

**Fundort:** `src/lib/ui/Zeichnung*.svelte`, `src/lib/ui/Anleitung.svelte`, `src/lib/server/brief/symbole.ts`, `src/routes/willkommen/+page.svelte`, `src/routes/hilfe/+page.svelte`, `src/lib/hilfe/installation.svelte.ts`.

**Beobachtung:** (1) Die Zeichnung der Anleitung zeigt fest `my.tcolten.ch`, auch auf Test. (2) Teilen- und Menü-Symbol stehen in Anleitung, Zeichnung und Brief je einzeln; ändert Apple oder Google ein Symbol, sind vier Stellen nachzuziehen (das Teilen-Symbol steht seit dem Layout-Hinweis zweimal in der Anleitung). (3) Nach «Abbrechen» im Android-Dialog ist die Karte «Zuerst auf den Startbildschirm» bis auf Titel und Satz leer, die Anleitung steht im offenen Bereich «Klappt nicht?» darunter. (4) Solange der Android-Dialog offen ist, baut die Seite kurz um (Anleitung in der Karte, Bereich «Klappt nicht?» weg). (5) MyTCO hält Chromes eigenen Install-Hinweis auf jeder Seite zurück, die Taste gibt es nur auf der Einstiegsseite. (6) «‹ Zurück» auf der Hilfe führt immer nach `/`, im Handy-Browser also zur Einstiegsseite statt zurück zum Login. (7) Annahme des Projektleiters für die Anleitung: iPhones mit iOS 26 oder neuer, Android-Handys höchstens 5 Jahre alt; betrifft den Eintrag zur Untergrenze unten.

**Ursprung:** #47, abschliessendes Code-Review und cas-reviewer.

**Einschätzung:** Für den Pilot ohne Folge. Was die Testgruppe dazu meldet, entscheidet über (3), (5) und (6); (2) lohnt sich, sobald ein Symbol sich ändert.

### 2026-11-04 — Keine Untergrenze für iOS- und Android-Versionen festgelegt

**Thema:** Betrieb

**Fundort:** `docs/testkonzept.md` (*Testgruppe*), `docs/anforderungen/anforderungen.md` (N-APP).

**Beobachtung:** Das Testkonzept definiert «älteres Handy» (iOS 16/17, Android 9–11), aber kein Dokument sagt, ab welcher Version MyTCO unterstützt wird. Passkeys gibt es erst ab iOS 16 und Android 9, Web Push auf dem iPhone erst ab iOS 16.4.

**Ursprung:** #40, Brainstorming und Review der Testgruppe.

**Einschätzung:** Bis zum Pilot ohne Folge, die Testgruppe liefert Erfahrungswerte. Vor dem Briefversand (#48) sollte feststehen, was die Hilfe Mitgliedern mit älteren Handys sagt.

### 2026-11-04 — Dependabot-PR #38 hat seit dem Neuaufsetzen keinen CI-Lauf

**Thema:** Betrieb

**Fundort:** PR #38, Head `7fc79b06` (neu aufgesetzt am 04.11.2026 um 09:48 UTC); `.github/workflows/check.yml` (`pull_request` auf `dev`).

**Beobachtung:** `gh pr checks 38` meldet «no checks reported», `mergeable` steht auf UNKNOWN. Der Head liegt 40 Commits hinter `dev`. Ein roter Lauf wäre wegen der Peer-Abhängigkeiten zu erwarten, aber es läuft gar keiner.

**Ursprung:** Beobachtungs-Auswertung vom 04.11.2026 (Prüfung des PR-Eintrags).

**Einschätzung:** Ohne Folge, solange der PR offen bleibt. Die Ursache ist unbekannt. Kommt Dependabot mit einer Fassung, die TypeScript 7 erlaubt, fehlt sonst die Prüfung; dann `@dependabot rebase` und kontrollieren, ob `Check` läuft.

### 2026-11-04 — «Ganzer Verlauf» zeigt höchstens 100 Einträge, ohne es zu sagen

**Thema:** Verwaltung

**Fundort:** `src/routes/verwaltung/verlauf/+page.svelte` (ruft `ladeVerlauf` ohne `grenze`), `getVerlauf` in `src/lib/server/admin/schnittstellen.ts` (`VERLAUF_STANDARD = 100`).

**Beobachtung:** Die Seite eines Mitglieds sagt jetzt «die letzten 50 Einträge» und verlinkt «Ganzer Verlauf ›». Die Verlaufsseite holt aber standardmässig nur 100 Einträge und zeigt nicht an, wenn es mehr gibt. Die Seite ohne Filter (alle Mitglieder) ist genauso gekürzt.

**Ursprung:** Nacharbeit zu #43 (Kurzinfo «die letzten 50»).

**Einschätzung:** Heute ohne Folge, kaum ein Mitglied hat über 100 Einträge. Mit dem Einlesen (Etappe 2) wächst der Gesamtverlauf schnell; dann braucht die Verlaufsseite die gleiche ehrliche Anzeige oder ein Weiterblättern.

### 2026-11-04 — «Rollen speichern» überschreibt Rollen, die ein anderer Admin inzwischen vergeben hat

**Thema:** Verwaltung

**Fundort:** `setzeRollen` in `src/lib/server/admin/rollen.ts`, `speichereRollen` in `src/lib/verwaltung/api.ts`.

**Beobachtung:** Die Seite schickt die ganze Rollenliste, der Server ersetzt die gespeicherten Rollen ohne Vergleich mit dem geladenen Stand. Admin A vergibt «CM»; Admin B hat die Seite noch offen, vergibt «Lizenz» und entzieht damit As «CM» still. Der Schutz für den letzten Admin (RR-03) hält, der Verlauf zeigt das Entziehen. Bei den Angaben ist dasselbe seit der Nacharbeit zu #43 geschützt (409 «veraltet»).

**Ursprung:** Review (cas-reviewer) der Nacharbeit zu #43.

**Einschätzung:** Bei zwei bis drei Admins selten. Ein Fix übernimmt das Muster der Angaben (geladene Rollen mitschicken, in der Transaktion vergleichen, 409).
### 2026-11-05 — Datenschutz-Seite zeigt Platzhalter und interne Kennungen

**Thema:** App

**Fundort:** `/datenschutz` (Text aus `docs/datenschutzerklaerung.md`)

**Beobachtung:** Die Seite zeigt «[Ansprechperson]», «[Datum]», «[E-Mail-Dienst]» und «Vorschlag K-38», sichtbar als Entwurf markiert.

**Ursprung:** Review (cas-reviewer) zum Handy-Feedback, Session vom 05.11.2026.

**Einschätzung:** Für lokale Tests passend. Vor einer Auslieferung auf Live ausfüllen und freigeben lassen (K-06.2, DS-09; DoD von #40 und #48).

### 2026-11-05 — Verwaltung am Handy: Kopfleiste bleibt nicht oben stehen

**Thema:** Verwaltung

**Fundort:** `src/routes/verwaltung/+layout.svelte`, `.seitenleiste .kopf` in `basis.css`

**Beobachtung:** In der Mitglieder-App bleibt die Kopfleiste beim Scrollen oben stehen. In der Verwaltung steckt sie in der Seitenleiste und scrollt auf dem schmalen Bildschirm mit weg; unter Uhr und Akku liegt dann nur noch das grüne Statusleisten-Band. Dazu: In der Mitglieder-App kann die mitlaufende Kopfleiste ein fokussiertes Element verdecken (WCAG 2.4.11), `scroll-padding-top` deckt nur das Band ab, nicht die Höhe der Kopfleiste.

**Ursprung:** Review (cas-reviewer) zum Handy-Feedback, Session vom 05.11.2026.

**Einschätzung:** Die Verwaltung ist vor allem für den PC gedacht. Am iPhone prüfen; falls störend, die Seitenleiste auf dem Handy als Kopf mit Menü neu denken (gehört in den Design-Ablauf).

### 2026-11-05 — Datenschutz-Seite ist am Handy eine lange Textwand

**Thema:** App

**Fundort:** `/datenschutz` (`src/routes/datenschutz/+page.svelte`)

**Beobachtung:** Die ganze Erklärung steht in einer Karte; am iPhone sind das mehrere Bildschirmlängen ohne Gliederung (Screenshot im E2E `datenschutz.test.ts`).

**Ursprung:** Handy-Test des Projektleiters, Session vom 05.11.2026.

**Einschätzung:** Passt zur Vorgabe «grosse Seiten aufklappbar»: jeder fette Abschnittsanfang («Welche Daten:», «Wozu:» …) ein Aufklappbereich wie in der Hilfe. Über den Design-Ablauf, vor der Freigabe durch den Vorstand (K-06.2).

### 2026-11-05 — Lokale Logins hängen am unbenannten Docker-Speicher

**Thema:** Betrieb

**Fundort:** `docker-compose.yml` (Service `db`, kein benanntes Volume)

**Beobachtung:** Die lokale Datenbank liegt in einem anonymen Volume. `docker compose down` oder ein Zurücksetzen von Docker Desktop legt beim nächsten `make db` eine leere Datenbank an; die Handy-Verknüpfungen aus `make dev-handy` sind dann abgemeldet, Brief-Codes weg.

**Ursprung:** Frage des Projektleiters, ob die Verknüpfungen später wieder gehen, Session vom 05.11.2026.

**Einschätzung:** Für erfundene Daten verkraftbar (`make seed` gibt neue Codes). Ein benanntes Volume würde es robuster machen, kostet beim Umstellen einmal die vorhandenen Daten.

### 2026-11-05 — CI: Browser-Installation scheitert an gesperrtem apt

**Thema:** Betrieb

**Fundort:** `.github/workflows/check.yml`, Job «E2E (Playwright)», Schritt Browser-Installation (`--with-deps`)

**Beobachtung:** Lauf 41999966173 auf `dev` (Merge `fix/anleitung-hinweis`) brach ab mit «Could not get lock /var/lib/dpkg/lock-frontend. It is held by process … (apt-get)», Code 100. Der nächste Lauf auf demselben Code lief durch.

**Ursprung:** Wrap-up der Session vom 05.11.2026.

**Einschätzung:** Störung des GitHub-Runners (apt läuft im Hintergrund), nicht des Codes. Häuft es sich: vor der Installation auf die apt-Sperre warten oder den Job neu starten lassen.

### 2026-11-05 — Leitbild sagt «Verwaltung über Profil», die App zeigt sie auf der Startseite

**Thema:** Verwaltung

**Fundort:** `docs/ui-leitbild.md` (Layout und Navigation, «Verwaltung … erreichbar über einen Eintrag unter *Profil*»), `src/routes/+page.svelte:39`

**Beobachtung:** Das Leitbild nennt einen Eintrag unter Profil als Weg in die Verwaltung. Im Code steht die Kachel «Verwaltung» auf der Startseite; im Profil gibt es keinen solchen Eintrag.

**Ursprung:** #54 (Ruhiges App-Gefühl), beim Nachführen des Leitbilds.

**Einschätzung:** Doku-Drift, keine Funktionsstörung. Entscheiden, wo der Eintrag hingehört, dann Leitbild oder Code angleichen.

### 2026-11-05 — Mockup «Hilfe beim Start» zeigt die Fusszeile ohne «Datenschutz»

**Thema:** App

**Fundort:** `docs/ui-mockups/hilfe.html` (Fusszeilen der Bildschirme Einstiegsseite und Login)

**Beobachtung:** Die Mockups zeigen «Hilfe · Version», die App seit DS-09 «Hilfe · Datenschutz · Version». Die Abweichung ist älter als #54.

**Ursprung:** Review (cas-reviewer) zu #54.

**Einschätzung:** Kosmetik in der Doku. Beim nächsten Umbau der Mockups (Design-Ablauf mit Artifacts) mitnehmen.

### 2026-11-05 — Reiter: aria-current wechselt, bevor die neue Seite da ist

**Thema:** App

**Fundort:** `src/lib/ui/Reiter.svelte` (`aktiv` folgt `navigating.to`)

**Beobachtung:** Damit der Reiter sofort reagiert, folgt auch `aria-current` dem Ziel der Navigation. Ein Screenreader kann «Profil, aktuelle Seite» ansagen, während noch Start zu sehen ist; leitet das Laden um, springt es zurück. Sauberer wäre: `aria-current` an `page.route.id`, nur Farbe und Balken (`data-aktiv`) folgen dem Ziel.

**Ursprung:** Code-Review zu #54.

**Einschätzung:** Kurze Zeitspanne (Ladezeit), kein Fehler im Ablauf. Bei der nächsten Arbeit an den Reitern trennen; braucht eine eigene Markierung fürs Aussehen.

### 2026-11-05 — Rückfrage: Ausblenden ohne `overlay` an falscher Stelle

**Thema:** Verwaltung

**Fundort:** `dialog.karte` in `src/lib/design/basis.css`

**Beobachtung:** Browser ohne die CSS-Eigenschaft `overlay` (Firefox, wohl auch Safari) nehmen die Rückfrage beim Schliessen sofort aus der obersten Ebene; die 150 ms Ausblenden laufen dann an ihrer Stelle im Seitenfluss. Ein zweiter Tipp ist abgefangen (`pointer-events: none`).

**Ursprung:** Code-Review zu #54.

**Einschätzung:** Kurz und nur in der Verwaltung. Am Mac in Safari ansehen; stört es, das Ausblenden nur dort zeigen, wo `overlay` unterstützt ist (`@supports`).

### 2026-11-05 — «Für Fairgate» zeigt auch ausgetretene und gelöschte Mitglieder

**Thema:** Verwaltung

**Fundort:** `listeFuerFairgate` in `src/lib/server/admin/fairgate.ts`

**Beobachtung:** Die Liste filtert nicht nach Status. Tritt ein Mitglied aus, nachdem es Angaben selbst geändert hat, bleibt es mit «für Fairgate offen» in der Liste, bis der Admin abhakt.

**Ursprung:** Gesamtreview zu #50.

**Einschätzung:** Hängt am Austritt und Löschen (FR-04, Etappe 3 von #43). Dort entscheiden, ob der Austritt die Markierung löscht oder die Liste nur aktive Mitglieder zeigt.

### 2026-11-05 — «Für Fairgate»: Feinschliff aus den Reviews

**Thema:** Verwaltung

**Fundort:** `src/routes/verwaltung/+layout.ts`, `src/routes/verwaltung/fairgate/+page.svelte`, `src/lib/server/admin/fairgate.ts`

**Beobachtung:** Der Zähler in der Seitenleiste lädt die ganze Liste, nur um sie zu zählen. Hat ein anderer Admin schon abgehakt, verschwindet die Zeile ohne Rückmeldung. Liegt die letzte Selbständerung länger als die Aufbewahrung des Verlaufs zurück, bleiben «Geändert» und «Neue Angaben» leer. Namen erscheinen als «Nachname, Vorname», der Entwurf zeigte «Vorname Nachname».

**Ursprung:** Task- und Gesamtreview zu #50.

**Einschätzung:** Bei der Vereinsgrösse ohne Folgen. Bei der nächsten Arbeit an der Verwaltung mitnehmen.

### 2026-11-05 — Passkey zeigt nach dem E-Mail-Wechsel weiter die alte Adresse

**Thema:** App

**Fundort:** Schlüsselbund des Geräts (Name des Passkeys), `src/lib/server/profil/email-wechsel.ts`

**Beobachtung:** Der Passkey trägt im Schlüsselbund die Adresse, die beim Einrichten galt. Nach einem E-Mail-Wechsel steht dort weiter die alte. Das Anmelden klappt, weil der Passkey an seiner Kennung hängt.

**Ursprung:** Gesamtreview zu #50.

**Einschätzung:** Nur kosmetisch. Prüfen, ob WebAuthn den Namen nachführen kann (Signal-API), sonst in der Hilfe erwähnen.

### 2026-11-05 — Profil: abgelaufene Sitzung beim Speichern zeigt «Störung» statt Login

**Thema:** App

**Fundort:** `src/routes/profil/+page.svelte`, `src/lib/profil/angaben.ts`

**Beobachtung:** Läuft die Sitzung während des Bearbeitens ab, meldet die Seite eine Störung und leitet nicht zur Anmeldung. Die Seite ist zudem auf rund 430 Zeilen gewachsen; ein eigener Baustein «Meine Angaben» wäre leichter zu lesen.

**Ursprung:** Task-Review zu #50 (Verhalten bestand schon vorher bei Passkey und Abmelden).

**Einschätzung:** Selten, die Sitzung hält ein Jahr. Beim nächsten Umbau der Profilseite beides angehen.

### 2026-11-05 — Wartende Login-Mailanfrage bleibt nach dem Abmelden im Gerätespeicher

**Thema:** App

**Fundort:** `abmelden()` in `src/routes/profil/+page.svelte`, `src/lib/login/mailanfrage.ts`

**Beobachtung:** Der E-Mail-Wechsel räumt seinen Eintrag beim Abmelden jetzt ab, die wartende Login-Mailanfrage nicht. Sie verfällt nach 15 Minuten und wird beim nächsten Start der App gelöscht.

**Ursprung:** Gesamtreview zu #50.

**Einschätzung:** Altbestand, kurze Frist. Der Konsequenz halber beim Abmelden ebenfalls löschen; eine Zeile.

### 2026-11-05 — Leitbild hat keinen Baustein für zwei Felder nebeneinander

**Thema:** App

**Fundort:** `docs/ui-leitbild.md`, Adresse im Profil (`src/routes/profil/+page.svelte`)

**Beobachtung:** PLZ und Ort stehen im Profil untereinander, der Entwurf zeigte sie nebeneinander. Ohne Inline-Stile fehlt dafür ein Baustein im Leitbild.

**Ursprung:** Bildvergleich zu #50.

**Einschätzung:** Kein Fehler. Kommt ein zweiter Fall dazu (z. B. Formulare der CM-Anmeldung), einen Baustein «Feldzeile» ins Leitbild aufnehmen.

### 2026-11-05 — E2E: gemeinsame IP-Grenze und geteilte Testdatenbank

**Thema:** Betrieb

**Fundort:** `tests/e2e/profil.test.ts`, `tests/e2e/verwaltung.test.ts`, `docs/testkonzept.md`

**Beobachtung:** Alle E2E-Läufe teilen sich die Grenze von 10 Code-Anfragen pro IP und Stunde. Darum prüft nur das iPhone-Projekt den Login mit der neuen Adresse. Die geteilte Testdatenbank füllt zudem die Liste «Für Fairgate» mit Einträgen aus anderen Tests, was den Screenshot unruhig macht.

**Ursprung:** Task 8 zu #50.

**Einschätzung:** Hält, solange die Zahl der Mail-Tests klein bleibt. Kommen weitere dazu, eine Testeinstellung für die Grenzen oder eine IP je Projekt vorsehen.

### 2026-11-05 — Anlass: Kachel und Seite nennen den Anmeldeschluss zu ungenau

**Thema:** App

**Fundort:** `src/lib/anlass/stand.ts`, `src/routes/anlass/[id]/+page.svelte`

**Beobachtung:** Die Kachel sagt nur den Tag («Bitte bis Di, 16. März …»); setzt der Admin den Schluss auf 12.00 Uhr, schliesst die Anmeldung schon mittags. Auf der Anlass-Seite steht nirgends, bis wann sich die Antwort ändern lässt.

**Ursprung:** Code-Review und cas-reviewer zu #52.

**Einschätzung:** Klein. Uhrzeit nennen, wenn sie nicht 23.59 ist; auf der Seite «Antwort änderbar bis …» ergänzen. Mit der Überarbeitung des Vorschlags nach K-50 erledigen.

### 2026-11-05 — Anlass: Kalenderdatei ohne SEQUENCE, Steuerzeichen nicht entfernt, 404 als rohes JSON

**Thema:** App

**Fundort:** `src/lib/server/anlass/kalender.ts`, `src/lib/server/anlass/schnittstellen.ts` (`getKalender`)

**Beobachtung:** Nach einer Terminänderung (FR-32) ersetzen manche Kalender den alten Eintrag beim erneuten Import nicht, weil `SEQUENCE`/`LAST-MODIFIED` fehlen. Steuerzeichen ausser Zeilenumbrüchen werden nicht entfernt (RFC 5545). Für einen gelöschten Anlass zeigt der Browser `{"fehler":"nicht-gefunden"}`, weil der Link ausserhalb der App öffnet.

**Ursprung:** Code-Review und cas-reviewer zu #52.

**Einschätzung:** Klein. `LAST-MODIFIED` aus *Termin geändert am*, Steuerzeichen in `maskiere` entfernen, für 404 kurzen Text liefern. Bei der Handprüfung auf echten Geräten (Release-Checkliste) mit ansehen.

### 2026-11-05 — Verwaltung Anlässe: Meldung bei Zeitumstellung, «Gespeichert» und Zählung ausgetretener Mitglieder

**Thema:** Verwaltung

**Fundort:** `src/lib/server/anlass/angaben.ts`, `src/routes/verwaltung/anlaesse/[id]/+page.svelte`, `ladeAnlassAdmin`

**Beobachtung:** Eine Zeit in der Lücke der Umstellung meldet «Bitte Datum und Zeit angeben.», obwohl beides angegeben ist. Scheitert nach dem Speichern das Neuladen, fehlt «Gespeichert». *kommen* und *kommen nicht* zählen auch Antworten von Mitgliedern, die inzwischen ausgetreten sind; *noch keine Antwort* zählt nur aktive.

**Ursprung:** Code-Review und cas-reviewer zu #52.

**Einschätzung:** Klein. Eigene Meldung für die Umstellung; bei Neuladefehler trotzdem rückmelden; Zählung auf aktive Mitglieder beschränken, sobald der Austritt gebaut ist (Etappe 3 von #43).

### 2026-11-05 — Löschfrist für Anmeldungen zu Anlässen ist versprochen, aber nicht gebaut

**Thema:** Betrieb

**Fundort:** `docs/datenschutz.md` (*Löschen*), `docs/datenschutzerklaerung.md`, DS-06

**Beobachtung:** Datenschutzkonzept und -erklärung nennen «ein Jahr nach dem Anlass» (Vorschlag K-50). Gebaut ist nur das Löschen von Hand mit dem Anlass; das ist im Design so entschieden.

**Ursprung:** Code-Review und cas-reviewer zu #52.

**Einschätzung:** Mit den übrigen Löschfristen bauen (Austritt, K-38). Bis dahin löscht der Admin vergangene Anlässe. Vor dem Live-Gang mit Mitgliederdaten prüfen, ob DS-06 dafür erfüllt sein muss.

### 2026-11-05 — Beispiel-GV in make seed läuft im März 2027 ab

**Thema:** Betrieb

**Fundort:** `scripts/beispiel-anlass.ts`

**Beobachtung:** Die Daten sind fest (Beginn 19.03.2027). Nach dem Anmeldeschluss legt das Skript keine Antworten mehr an, nach dem Beginn erscheint die GV nicht mehr auf der Startseite.

**Ursprung:** Code-Review und cas-reviewer zu #52.

**Einschätzung:** Klein, nur lokal. Daten relativ zu `jetzt` berechnen, wenn der Vorschlag nach dem März 2027 noch vorgezeigt wird.

### 2026-11-05 — E2E «Menü auf der Einstiegsseite bleibt beim weichen Aufklappen richtig gebunden» schlägt auf Android gelegentlich fehl

**Thema:** App

**Fundort:** `tests/e2e/bewegung.test.ts:283` (Projekt `android`)

**Beobachtung:** Lokal in `make check` einmal, bei `--repeat-each 3` einmal von drei Läufen: Die Taste «MyTCO installieren» erscheint nicht innerhalb von 30 s nach `bietetInstallationAn(page, 'dismissed')`. Die übrigen Läufe und die CI auf `dev` sind grün.

**Ursprung:** Abschluss-Prüfung zu #52 (der Branch ändert Einstiegsseite und Test nicht).

**Einschätzung:** Vermutlich Wettlauf zwischen dem nachgestellten Install-Angebot und dem Laden der Seite. Bei der nächsten Arbeit an #54 oder der Einstiegsseite ansehen.

**Nachtrag 2026-11-05:** In der CI auf `dev` (Lauf 42041712102) scheiterte im Projekt `iphone` einmal auch `bewegung.test.ts:210` «Zwei schnelle Reiter-Klicks hintereinander» (`toHaveURL` nach 5 s); der erneute Lauf war grün. Die Tests zu den weichen Seitenwechseln wirken unter WebKit in der CI zeitempfindlich.

**Nachtrag 2026-11-05 (Nacharbeit #54):** Lokal nicht nachgestellt: zwei volle E2E-Läufe und `bewegung.test.ts` mit `--repeat-each 4` auf `iphone` und `android` waren grün, auch beide Tests oben. Seit der Nacharbeit scrollt nur noch der Rollbereich; ob das die Zeitempfindlichkeit in der CI ändert, zeigen erst die nächsten CI-Läufe.

### 2026-11-05 — Mockups zeigen den Rollbereich noch nicht

**Thema:** App

**Fundort:** `docs/ui-mockups/*.html` (Handy-Rahmen `.handy` in `mockup.css`)

**Beobachtung:** Seit der Nacharbeit zu #54 scrollt in der App nur der Rollbereich (`.app.schale` mit `.rollbereich`), Kopfleiste und Reiter stehen fest. Die Mockups bauen die Seite noch ohne `.schale` und `.rollbereich`; im Handy-Rahmen scrollt der ganze Rahmen samt Kopfleiste und Reiter.

**Ursprung:** Nacharbeit #54 (Test am iPhone), beim Abschluss.

**Einschätzung:** Nur Darstellung der Mockups, die App ist richtig. Beim nächsten Mockup-Umbau `.schale` und `.rollbereich` übernehmen und den Rahmen auf `height: 100 %` der Schale stellen.

### 2026-11-05 — E2E A-LOGIN-09 «nach Neuladen weiterhin angemeldet» scheiterte einmal auf dem iPhone

**Thema:** App

**Fundort:** `tests/e2e/login.test.ts` (A-LOGIN-09, Projekt `iphone`)

**Beobachtung:** Im vollen E2E-Lauf des Pre-Push-Hooks einmal rot; einzeln mit `--repeat-each 5` fünfmal grün, in drei vollen Läufen davor ebenfalls grün.

**Ursprung:** Fix-Branch zu #54 (Beschriftung der Eingabetaste), beim Pushen.

**Einschätzung:** Zeitempfindlich unter Last wie die schon erfassten Ausreisser der Seitenwechsel-Tests; zusammen mit diesen ansehen.

### 2026-11-05 — Datenschutzerklärung verspricht Löschung des Änderungsverlaufs nach 12 Monaten, nicht gebaut

**Thema:** Betrieb

**Fundort:** `docs/datenschutzerklaerung.md` (Änderungsverlauf «12 Monate»), FR-26 (geplant), DS-06

**Beobachtung:** Die Erklärung in der App nennt 12 Monate für den Änderungsverlauf; gelöscht wird nichts. Ebenso sind die Fristen bei Austritt und Löschen (FR-04) nicht gebaut. Nur die Zeile zu den Anlässen trägt in `docs/datenschutz.md` den Vermerk «bis die Löschfristen gebaut sind».

**Ursprung:** Doku-Abgleich vor 0.5.0 (Bereiche App sowie Daten/Tests).

**Einschätzung:** Heute ohne Folge (nicht ausgeliefert, Erklärung als Entwurf markiert). Die Release-Checkliste in `docs/testkonzept.md` verlangt jetzt vor dem ersten Live-Release mit Mitgliedern, dass Hinweis an die alte Adresse, Verlauf-Löschung und Anlass-Löschung gebaut sind oder die Erklärung angepasst ist. Mit dem Eintrag zur Löschfrist der Anlass-Anmeldungen zusammen bauen.

### 2026-11-05 — «erstellt von» am Anlass ist ein Personenbezug ohne aufgeführten Zweck

**Thema:** Verwaltung

**Fundort:** `src/lib/server/db/schema.ts` (`anlass.erstellt_von`), `docs/fachmodell.md` (Objekt Anlass, Personendaten «—»), `docs/datenschutz.md` (*Welche Daten*)

**Beobachtung:** Die Spalte verweist auf den Admin, der den Anlass anlegt; sie wird geschrieben, aber nirgends gelesen oder angezeigt. Fachmodell und Datenschutzkonzept führen sie nicht als Personendatum (DS-04: nur aufgeführte Felder).

**Ursprung:** Doku-Abgleich vor 0.5.0 (Bereiche App sowie Daten/Tests).

**Einschätzung:** Entweder streichen (neue Migration) oder mit Zweck ins Konzept und Fachmodell. Entscheid bei der nächsten Arbeit an den Anlässen.

### 2026-11-05 — Test-IDs und Testdaten-Regel weichen vom Testkonzept ab

**Thema:** App

**Fundort:** `src/lib/login/passkey.test.ts` (Tests mit A-LOGIN-10 und A-LOGIN-11), `scripts/pruefungen/test-ids.ts`, `scripts/pruefungen/testdaten.ts`, `scripts/beispiel-anlass.ts`, `docs/testkonzept.md`

**Beobachtung:** Zwei Passkey-Tests nennen A-LOGIN-10 bzw. A-LOGIN-11 (SMS/App, «später»), prüfen aber Passkey-Funktionen (A-LOGIN-07). Die Prüfung `test-ids` lässt die ID irgendwo in der Datei genügen, auch im Kommentar, strenger klingt das Testkonzept («jeder Test nennt im Namen die ID»). `scripts/beispiel-anlass.ts` legt fünf weitere erfundene Mitglieder an; das Testkonzept nennt nur `scripts/erfundene-mitglieder.ts`, und `testdaten` prüft die Datei nicht (nur Dateinamen `seed*`, `erfundene-*`). Die Daten selbst sind erfunden (`@example.org`).

**Ursprung:** Doku-Abgleich vor 0.5.0 (Bereich Daten/Tests).

**Einschätzung:** Kleinere Prüf-Lücken ohne Folge für Mitglieder. IDs umbenennen (prüfen, ob A-LOGIN-10 dann noch einen Test hat), Prüfung `testdaten` um die Datei erweitern, Satz im Testkonzept angleichen.

### 2026-11-05 — Fachmodell und Anforderungen bei den Anlässen nicht ganz nachgeführt

**Thema:** App

**Fundort:** `docs/fachmodell.md` (Überblick-Diagramm), `docs/anforderungen/anforderungen.md` (A-STARTSEITE-04), FR-27, `src/lib/server/anlass/` (`ladeAnlassFuerMitglied`)

**Beobachtung:** Im Überblick-Diagramm fehlen `Anlass` und die Anmeldung (Code-Name `anlassAnmeldung`). A-STARTSEITE-04 steht auf «geplant», die Startseite zeigt aber schon kommende Anlässe mit dem eigenen Stand. FR-27 sagt «sichtbar, solange der Beginn nicht vorbei ist»; die Detailseite liefert auch vergangene Anlässe aus (nur mit der eigenen Antwort).

**Ursprung:** Doku-Abgleich vor 0.5.0 (Bereich Daten/Tests).

**Einschätzung:** Nur Doku-Stand, ohne Datenschutzfolge. Bei der nächsten Arbeit an den Anlässen nachziehen; FR-27 klären (Detailseite nach dem Anlass sperren oder Satz anpassen).

### 2026-11-05 — Datenschutzerklärung siezt, die App duzt

**Thema:** App

**Fundort:** `docs/datenschutzerklaerung.md` gegen `docs/ui-leitbild.md` (Sprache: Du-Form)

**Beobachtung:** Die Erklärung (in der App unter «Datenschutz») spricht die Mitglieder mit «Sie» an, Leitbild, Hilfe und App duzen.

**Ursprung:** Doku-Abgleich vor 0.5.0 (Bereich App).

**Einschätzung:** Entscheid des Projektleiters bzw. Vorstands zusammen mit der Freigabe der Erklärung (K-06.2).

### 2026-11-05 — E2E RR-03 auf dem iPhone-Profil einmal mit «Importing a module script failed»

**Thema:** Betrieb

**Fundort:** `tests/e2e/verwaltung.test.ts:184` (RR-03, letzter Admin), Profil `iphone` (WebKit)

**Beobachtung:** In `make check` schlug der Test fehl, weil `fehler` den Seitenfehler «TypeError: Importing a module script failed.» enthielt. Einzeln mit `--repeat-each=3` lief die Datei dreimal grün durch. Der Branch änderte keinen App-Code (nur Versionsregel, Skripte, Doku).

**Ursprung:** Umstellung der Versionsnummern (Branch `chore/versionsregel`).

**Einschätzung:** Vermutlich ein Wettlauf zwischen Laden eines Moduls und Seitenwechsel unter Last (paralleler Lauf). Beobachten; wiederholt er sich, das Sammeln der Seitenfehler im Test robuster machen.

**Nachtrag 2026-11-06:** Wiederholt, diesmal in `tests/e2e/verwaltung.test.ts:212` (SI-08), wieder `iphone`, wieder in `make check` mit 5 Workern; einzeln mit `--repeat-each 5` grün. Branch `feat/schnellere-merges` ohne App-Code. Damit trifft der Trigger «wiederholt sich» zu. Im nächsten vollen Lauf derselben Session gleich noch einmal, in `tests/e2e/anlass.test.ts:158` (A-ANLASS-01): zwei rote von drei vollen Läufen, jeder Fehlversuch kostet einen ganzen `make check`. In der CI (1 Worker pro Gerät) bisher nicht aufgetreten.

### 2026-11-05 — Versionsregel ohne ADR, Begründung steht in der Release-Doku

**Thema:** Betrieb

**Fundort:** `docs/ci-cd-und-release.md#versionen`, `docs/adr/`

**Beobachtung:** Die neue Vergabe der Versionsnummern (Korrektur bei jedem Merge nach `dev` mit Code, Nummer im Merge-Commit, Release erhöht nicht mehr) begründet sich nur in einem Satz der Release-Doku («So beanspruchen zwei parallele Sessions nie dieselbe Nummer»). Nach der Ablageregel gehört ein «Warum» in eine ADR. Das frühere Versionsschema hatte auch keine.

**Ursprung:** Review (`cas-reviewer`) der Umstellung der Versionsnummern.

**Einschätzung:** Ermessensfrage. Eine kurze ADR lohnt, falls die Regel noch einmal umgebaut wird oder die Begründung in der Release-Doku zu wachsen beginnt.

### 2026-11-05 — Issues werden geschlossen, ohne dass die Haken der Definition of Done gesetzt sind

**Thema:** Betrieb

**Fundort:** Issue #50 (alle sieben Punkte ohne Haken), Skill `tco-branching` Schritt 7, `docs/issue-konventionen.md#definition-of-done`

**Beobachtung:** Der Abschlusskommentar von #50 meldete «Definition of Done vollständig», im Body war aber kein Punkt abgehakt. Wer nur den Body liest, sieht ein unfertiges Issue. Schritt 7 im Skill sagt, wann ein Issue geschlossen wird, aber nicht, dass die Haken vorher nachgeführt werden.

**Ursprung:** Prüfung der Issue-Labels.

**Einschätzung:** Ein Satz in Schritt 7 («Haken der DoD im Body setzen, Nachweis im Abschlusskommentar») würde reichen. Klein, aber es betrifft jedes Issue.

### 2026-11-05 — #29: Vorschläge für die DoD aus der Auswertung vom 03.11. stehen nur im Kommentar

**Thema:** Betrieb

**Fundort:** Issue #29, Kommentar vom 03.11.2026 (vier Punkte: Seite `/datenschutz`, Du-Form der Erklärung, Spalte `sitzung.erstellt_am`, Fenster der Bremse)

**Beobachtung:** Der Kommentar schlägt vier Punkte für die Definition of Done vor («über die Aufnahme entscheidet, wer #29 führt»). Im Body steht keiner davon, und dass darüber entschieden wurde, ist nirgends vermerkt. Ein Teil davon ist inzwischen vermutlich gebaut (die Datenschutzerklärung ist seit 0.5.0 in der App).

**Ursprung:** Prüfung der Issue-Labels.

**Einschätzung:** Beim nächsten Arbeiten an #29 die vier Punkte am Code prüfen und entweder in die DoD übernehmen (erledigt bzw. offen) oder bewusst verwerfen.

### 2026-11-06 — make check baut die App doppelt: einmal selbst, einmal im Webserver der E2E-Tests

**Thema:** Betrieb

**Fundort:** `Makefile` (`check`: `npm run build`, dann `make e2e`), `playwright.config.ts` (`webServer.command`: `npm run build && …`)

**Beobachtung:** `make check` baut die App mit `npm run build` und startet danach die E2E-Tests, deren Webserver noch einmal `npm run build` ausführt. In der CI baut jeder der drei E2E-Jobs ebenfalls selbst. Kostet lokal geschätzt 20–30 s pro voller Prüfung.

**Ursprung:** Analyse, warum Merges lange dauern (Branch `feat/schnellere-merges`).

**Einschätzung:** Kleine Ersparnis; ein Umbau müsste sicherstellen, dass die E2E-Tests nie gegen einen veralteten Build laufen. Erst angehen, wenn die Prüfdauer wieder stört.
