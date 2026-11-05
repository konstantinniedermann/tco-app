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
