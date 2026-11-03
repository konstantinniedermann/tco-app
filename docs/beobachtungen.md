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

### 2026-11-03 — `make release-check`: zwei Restlücken aus dem Review

**Thema:** Arbeitsablauf

**Fundort:** `scripts/pruefungen/release.ts` (`pruefeRelease`, Tag-Abfrage im Hauptteil).

**Beobachtung:** (1) Die Version, die gerade released wird, ist von der Marker-Prüfung ausgenommen. Fehlt bei ausgeschaltetem Live der Marker «nicht ausgeliefert», meldet die Prüfung das erst beim nächsten Release. (2) Gezählt werden die lokalen Tags: Lokal gesetzte Tags zählen mit, auf GitHub gelöschte bleiben lokal stehen.

**Ursprung:** cas-reviewer zu `feat/release-abgleich`, bewusst nicht umgesetzt.

**Einschätzung:** (1) liesse sich mit `gh variable get AUSLIEFERUNG_LIVE` schliessen, dann hinge die Prüfung aber an GitHub. (2) ist ohne Folgen, solange nur die CI Tags setzt. Wieder ansehen, wenn Live eingeschaltet wird.

### 2026-11-03 — Releases nur mit Werkzeug-Änderungen erzwingen eine neue Version

**Thema:** Arbeitsablauf

**Fundort:** `scripts/pruefungen/release.ts` (Regel aus `nur-doku.ts`), Skill `tco-branching` Schritt 4a.

**Beobachtung:** `make release-check` verlangt eine höhere Version, sobald seit `main` irgendeine Datei ausser Doku geändert wurde, also auch bei Skripten, Makefile oder Workflows, die die App nicht verändern. Mit dem Merge von `feat/release-abgleich` gilt das bereits für das nächste Release.

**Ursprung:** Einführung von `make release-check`.

**Einschätzung:** Die Regel ist gleich wie in der CI (Code-Jobs, Auslieferung), darum bewusst so gewählt. Führt das zu vielen Korrekturversionen ohne Änderung an der App, eine engere Regel prüfen (z. B. nur Dateien, die ins Image gehen).

### 2026-11-02 — Doppelte Zeile `RESTIC_REPOSITORY`: geprüft wird die erste, genutzt die letzte

**Thema:** Code-Gerüst

**Fundort:** `betrieb/bin/lib.sh` (`sicherungsziel`, `restic_docker`).

**Beobachtung:** `sicherungsziel` liest die erste Zeile `RESTIC_REPOSITORY=` aus `sicherung.env`; `docker run --env-file` nimmt bei doppelten Schlüsseln die letzte. Steht das Ziel zweimal in der Datei, wird ein anderes Ziel geprüft (und eingehängt) als restic benutzt.

**Ursprung:** #32 Gesamt-Review.

**Einschätzung:** Gering, die Datei wird von Hand einmal angelegt. Abhilfe: mehr als eine Zeile `RESTIC_REPOSITORY=` als ungültig abweisen.

### 2026-11-02 — Large Objects würden die Transaktion beim Wiederherstellen vorzeitig bestätigen

**Thema:** Code-Gerüst

**Fundort:** `betrieb/bin/wiederherstellen` (`sql_zum_einspielen`).

**Beobachtung:** Enthält ein Dump Large Objects, schreibt `pg_restore -f -` dafür eigene `BEGIN`/`COMMIT`-Blöcke. Ein solches `COMMIT` bestätigte die äussere Transaktion samt geleerten Schemas vorzeitig; ein späterer Fehler liesse dann einen halben Stand zurück.

**Ursprung:** #32 Gesamt-Review.

**Einschätzung:** Heute ohne Folgen, die App nutzt keine Large Objects. Wieder aufnehmen, falls Dateien je in der Datenbank landen (dann eher `bytea` nehmen).

### 2026-11-02 — Fehlerzeilen von psql beim Wiederherstellen können Zeilendaten ins Protokoll tragen

**Thema:** Sicherheit

**Fundort:** `betrieb/bin/wiederherstellen` (psql-Ausgabe nach `protokoll.log`).

**Beobachtung:** Scheitert eine Anweisung beim Einspielen, schreibt psql `CONTEXT`-Zeilen, die bei `COPY` die betroffene Datenzeile enthalten können (z. B. eine E-Mail-Adresse). Sie landen in `<umgebung>/protokoll.log` auf dem Server (DS-06).

**Ursprung:** #32 Gesamt-Review.

**Einschätzung:** Gering, nur im Fehlerfall und nur auf dem Server. In #39 zusammen mit der Rotation von `protokoll.log` behandeln (z. B. `CONTEXT`-Zeilen kürzen oder `VERBOSITY terse`); ergänzt den bestehenden Eintrag «Betrieb: Grenzen von Header, Protokoll und Wiederherstellung».

### 2026-11-02 — Das ausgelieferte Image ist nicht das Image aus dem Rauchtest

**Thema:** Code-Gerüst

**Fundort:** `.github/workflows/check.yml`, Jobs `image` und `bauen`.

**Beobachtung:** `image` baut `mytco:ci` und prüft es im Rauchtest; `bauen` baut auf `dev` ein zweites Mal und schiebt diesen Neubau nach GHCR. Docker-Builds sind nicht bitgleich, ausgeliefert wird also ein Image, das den Rauchtest nie gesehen hat. Geprüft wird es erst auf Test über die Statusabfrage der Auslieferung.

**Ursprung:** #32 Gesamt-Review.

**Einschätzung:** Gering: Test fängt ein nicht startendes Image ab, Live bekommt nur, was auf Test lief. Bei Gelegenheit `bauen` das Image aus `image` übernehmen lassen (z. B. als Artefakt oder Bau einmal mit Push) und dafür einen Bau-Lauf sparen.

### 2026-11-02 — Digests von restic und Registry stehen ausserhalb von Dependabot

**Thema:** Code-Gerüst

**Fundort:** `betrieb/bin/lib.sh` (`RESTIC_IMAGE`), `betrieb/nachweis/nachweis.sh` (`REGISTRY_IMAGE`).

**Beobachtung:** Beide Images sind per Digest in Shell-Dateien gepinnt. Dependabot liest nur Dockerfile und Compose-Dateien und schlägt dafür nie ein Update vor; Sicherheits-Updates von restic kämen so nie an.

**Ursprung:** #32 Gesamt-Review.

**Einschätzung:** Gering bis mittel für restic (läuft nächtlich mit dem Sicherungszugang), gering für die Registry (nur lokaler Nachweis). Bis zu einer Lösung von Hand prüfen, z. B. mit jedem Release; Abhilfe wäre, restic als Dienst in eine Compose-Datei zu legen, die Dependabot liest.

### 2026-11-02 — Idee: Migrationen vor der Live-Auslieferung gegen eine Live-Sicherung proben

**Thema:** Code-Gerüst

**Fundort:** `betrieb/bin/ausliefern` (Migration), `betrieb/bin/probe`.

**Beobachtung:** Test startet bei jeder Auslieferung mit leerer Datenbank und erfundenen Testdaten. Eine Migration, die an echten Daten scheitert (z. B. eine neue Pflichtspalte oder ein eindeutiger Index über doppelte Werte), fällt erst bei der Live-Auslieferung auf. Dann greift zwar der Rückfall, aber Live steht kurz.

**Ursprung:** #32 Gesamt-Review.

**Einschätzung:** Idee, kein Fehler. Möglich wäre, vor der Live-Migration die frische Sicherung wie bei `probe` in eine Wegwerf-Datenbank einzuspielen und die Migration dort zuerst laufen zu lassen. Wieder aufnehmen, sobald die erste Migration Daten umbaut.

### 2026-11-02 — Betrieb: Grenzen von Header, Protokoll und Wiederherstellung

**Thema:** Sicherheit

**Fundort:** `src/hooks.server.ts`, `betrieb/caddy/`, `betrieb/bin/wiederherstellen`, `betrieb/bin/probe`.

**Beobachtung:**
- Die Sicherheits-Header sind doppelt definiert, in `hooks.server.ts` und in Caddy. Ändert man eine Stelle, driftet die andere.
- `pg_restore`- und `psql`-Fehlerzeilen können Zeilendaten enthalten und landen im Protokoll auf dem Server (DS-06).
- `wiederherstellen` legt vor dem Überschreiben keine Sicherheitssicherung des aktuellen Stands an.

**Ursprung:** #32 Task-Reviews.

**Einschätzung:** Alle drei gering, solange nur der Projektleiter und seine Stellvertretung den Server bedienen. Beim Protokoll vor der Testgruppe prüfen, ob Fehlerzeilen gekürzt werden müssen; bei `wiederherstellen` vor dem ersten Einsatz auf Live eine Sicherung vorschalten (Inbetriebnahme, [#39](https://github.com/konstantinniedermann/tco-app/issues/39)).

### 2026-11-02 — Kleinbefunde aus den Task-Reviews der Auslieferung (#32)

**Thema:** Code-Gerüst

**Fundort:** siehe Liste.

**Beobachtung:**
- `betrieb/bin/ausliefern`: Das Aufräumen alter Images kann ein Image löschen, das die andere Umgebung gerade holt; die Sperre gilt nur je Umgebung.
- CI: Zwei schnelle Pushes auf `dev` können Test auf einen älteren Stand ausliefern, wenn der Lauf des älteren später fertig wird.
- `fassungen/<digest>/` und die Zwischenordner `fassungen/.neu.*` auf dem Server werden nie aufgeräumt.
- `scripts/pruefungen/workflow-rechte.ts`: Der Nachschlag in `JOB_RECHTE` nutzt kein `Object.hasOwn`; ein Jobname wie `constructor` träfe die Prototyp-Eigenschaft.
- `.github/dependabot.yml`: Dependabot erkennt die Compose-Dateien unter `betrieb/` womöglich nicht (auf GitHub prüfen).
- `betrieb/bin/lib.sh`, `betrieb/bin/sichern`: Das Lesen der Snapshot-JSON hängt an der Feldreihenfolge von restic. Bei jedem restic-Update `make betrieb-nachweis` (Sicherung und Aufbewahrung) erneut laufen lassen.
- `betrieb/bin/sichern`: Die restic-Aufbewahrung (`--keep-within 30d`) zählt ab dem neuesten Snapshot, nicht ab heute; bleibt die Sicherung aus, bleiben auch alte Sicherungen.

**Ursprung:** #32 Task-Reviews.

**Einschätzung:** Keiner davon bricht den Nachweis. Beim Betrieb auf dem Server (#39) mitnehmen, die Dependabot-Frage sofort auf GitHub klären.

**Erledigt 2026-11-02 (#32 Gesamt-Review):** `workflow-rechte.ts` nutzt jetzt `Object.hasOwn` (mit Test für einen Job `constructor`); die Zählung der 30 Tage steht als Fakt in `docs/ci-cd-und-release.md`. Bei der nächsten Auswertung beide Punkte streichen.

*Keine offenen Einträge.*
### 2026-11-01 — Kleinbefunde aus den Task-Reviews des Code-Gerüsts

**Thema:** Code-Gerüst

**Fundort:** siehe Liste.

**Beobachtung:**
- `docs/adr/adr-001-web-app-zuerst.md` (Randbedingungen, Optionen B/C, Konsequenzen) und `adr-002` (Kontext): «`dep-guard` deckt `npm` ab» bzw. «nicht `npx expo install`» ist überholt. Der Hook prüft jetzt auch `npx`, `npm exec` usw.
- `scripts/pruefungen/skip.ts`: `\.fails?\b` meldet auch `assert.fail(`/`expect.fail(`. Ausgefallene Exportformen (`export * as actions`, Destrukturierung) erkennt `bauregel.ts` nicht. Der Test zur Eigenständigkeit von `nur-doku.ts` übersieht reine Seiteneffekt-Imports.
- `Makefile`: `voraussetzungen-docker` und `db` laufen in `check` doppelt. Bei `make -j` ist die Reihenfolge nicht garantiert. Die Hilfe zu `make hooks` erwähnt den Doku-Check nicht mehr.
- `Dockerfile`: `svelte-kit sync` ist redundant, und es gibt keinen `HEALTHCHECK` (→ #32).
- Die Ersatz-`DATABASE_URL` steht mehrfach (`.env.example`, `playwright.config.ts`, Test-Setup, CI).
- Doku-Kosmetik: unruhige Zeilenumbrüche in `docs/ci-cd-und-release.md` (Actions-Minuten) und `README.md` (Stand). In `docs/context-scopes.md` (Zeile CI) sind Unterordner neben `scripts/` doppelt genannt.

**Ursprung:** #15, Task-Reviews und Abschluss-Review, als Minor eingestuft.

**Einschätzung:** Keiner davon lässt eine Prüfung falsch durch. Mitnehmen, wenn die Datei ohnehin angefasst wird. Die ADR-Sätze beschreiben den Stand beim Entscheid, ein kurzer Nachtrag genügt.

**Erledigt 2026-11-02 (#32):** Der Punkt zum `Dockerfile` (`svelte-kit sync` entfernt, `HEALTHCHECK` ergänzt) ist behoben; die übrigen Punkte bleiben offen. Bei der nächsten Auswertung den Punkt streichen.

### 2026-11-01 — Test-ID-Prüfung zählt IDs in Kommentaren und übersprungenen Tests

**Thema:** Code-Gerüst

**Fundort:** `scripts/pruefungen/test-ids.ts` (`fehlendeTests`).

**Beobachtung:** Eine ID gilt als abgedeckt, sobald sie irgendwo in einer ausgeführten Testdatei steht, auch in einem Kommentar oder einem Test mit `// skip: Grund`.

**Ursprung:** #15 Abschluss-Review.

**Einschätzung:** Vor der ersten Fachregel mit Status `umgesetzt` beheben ([#29](https://github.com/konstantinniedermann/tco-app/issues/29)), z. B. nur Testnamen zählen.

### 2026-11-01 — adapter-node liefert `/_app/*` vor `handle` aus, ohne HSTS und nosniff

**Thema:** Sicherheit

**Fundort:** `src/hooks.server.ts`, `build/` (adapter-node).

**Beobachtung:** Statische Dateien unter `/_app/*` beantwortet adapter-node, bevor `handle` läuft; sie tragen die Header aus `hooks.server.ts` nicht.

**Ursprung:** #15 Abschluss-Review.

**Einschätzung:** Header im Reverse-Proxy setzen ([#32](https://github.com/konstantinniedermann/tco-app/issues/32)).

**Erledigt 2026-11-02 (#32):** Caddy setzt die Header für alle Antworten, auch `/_app/*`; belegt mit `make betrieb-nachweis`. Bei der nächsten Auswertung ins Archiv.

### 2026-11-01 — CI: PostgreSQL-Service nur per Tag, Playwright-Browser ohne Cache

**Thema:** Code-Gerüst

**Fundort:** `.github/workflows/check.yml` (Jobs `pruefen`, `e2e`).

**Beobachtung:** Der Service `postgres:18-alpine` ist nur per Tag festgelegt; Dependabot aktualisiert Service-Container in Workflows nicht. Die Playwright-Browser werden in jedem Lauf neu geladen.

**Ursprung:** #15 Abschluss-Review.

**Einschätzung:** Digest pinnen, wenn Dependabot oder ein eigener Schritt ihn nachzieht; Browser-Cache, falls die Actions-Minuten knapp werden.

### 2026-11-01 — E2E nutzt die gemeinsame lokale Datenbank `mytco`

**Thema:** Code-Gerüst

**Fundort:** `playwright.config.ts` (`DATABASE_URL`), `docker-compose.yml`.

**Beobachtung:** Die E2E-Tests laufen gegen die Datenbank `mytco` des gemeinsamen Containers; parallele Läufe aus mehreren Worktrees teilen sie.

**Ursprung:** #15 Abschluss-Review.

**Einschätzung:** Unkritisch, solange E2E nur `select 1` ausführt; eigene Datenbank pro Lauf, sobald E2E Daten schreibt ([#29](https://github.com/konstantinniedermann/tco-app/issues/29)).

**Nachtrag (02.11.2026, #29):** Jetzt schreibt E2E: erfundene Konten und die Migrationen des eigenen Branches landen in der gemeinsamen lokalen Datenbank (`tests/e2e/hilfen/umgebung.ts`, `DATENBANK_URL`). Die Vitest-Tests haben schon eine eigene Datenbank pro Lauf (`tests/setup/datenbank-global.ts`); dasselbe für E2E würde es lösen.

### 2026-11-01 — Start des Images und `node scripts/migrate.ts` ohne Rauchtest in der CI

**Thema:** Code-Gerüst

**Fundort:** `Dockerfile`, `.github/workflows/check.yml` (Job `image`).

**Beobachtung:** Die CI baut das Image nur; ob es startet und die Migration darin läuft, prüft kein Schritt.

**Ursprung:** #15 Abschluss-Review.

**Einschätzung:** Rauchtest (Container starten, Migration, `/api/status`) mit Server und Auslieferung ([#32](https://github.com/konstantinniedermann/tco-app/issues/32)).

**Erledigt 2026-11-02 (#32):** Der Rauchtest läuft im Job `image` der CI. Bei der nächsten Auswertung ins Archiv.

### 2026-11-01 — `$app/env/private` passt nicht zur Test-Datenbank pro Lauf

**Thema:** Code-Gerüst

**Fundort:** `src/lib/server/db/index.ts` (`holeDb`), `vitest.config.ts` (Global-Setup).

**Beobachtung:** SvelteKit 3 prüft die Umgebung gegen einen Schnappschuss vor dem Global-Setup von Vitest; die Test-Datenbank pro Lauf entsteht erst danach (`env_invalid … DATABASE_URL - Value is missing`). Deshalb liest der Code `process.env.DATABASE_URL`.

**Ursprung:** #15 Code-Gerüst.

**Einschätzung:** Umweg bewusst; neu bewerten, wenn Kit die Umgebungsprüfung ändert.

### 2026-11-01 — SPA-Build: CSP nur als Meta-Tag, `frame-ancestors` wirkt dort nicht

**Thema:** Sicherheit

**Fundort:** `vite.config.ts` (CSP), Build mit `MYTCO_SPA=1`.

**Beobachtung:** Der SPA-Build legt die CSP als Meta-Tag ab; `frame-ancestors` ignoriert der Browser dort. Die Direktive muss als Header vom Server kommen.

**Ursprung:** #15 Code-Gerüst.

**Einschätzung:** Gehört zu Server und Auslieferung ([#32](https://github.com/konstantinniedermann/tco-app/issues/32)); dort den Header setzen.

**Erledigt 2026-11-02 (#32):** Caddy setzt `frame-ancestors 'none'` überall, wo die App keine eigene CSP mitgibt. Bei der nächsten Auswertung ins Archiv.

### 2026-11-01 — 22 bekannte Schwachstellen in Entwicklungs- und Build-Werkzeugen, kein Audit-Gate

**Thema:** Sicherheit

**Fundort:** `package.json`, `.github/workflows/check.yml`.

**Beobachtung:** `npm install` meldete 22 bekannte Schwachstellen (5 niedrig, 17 mittel) in Entwicklungs- und Build-Werkzeugen. Das OSV-Gate bricht nur bei Malware ab; ein Audit-Gate ist nicht beschlossen.

**Ursprung:** #15 Code-Gerüst.

**Einschätzung:** `npm audit --omit=dev` als Gate prüfen (Laufzeit-Pakete); Werkzeuge über Dependabot aktuell halten.

### 2026-11-01 — Hash der Screenreader-Hinweis-Regel nach Kit-Updates nachziehen

**Thema:** Code-Gerüst

**Fundort:** `vite.config.ts` (`style-src-attr` mit `sha256-…`), SI-10.

**Beobachtung:** Der Hash gilt für das feste Style-Attribut des Screenreader-Hinweises von SvelteKit. Ändert ein Kit-Update es, bricht die CSP; der E2E-Lauf fängt das ab.

**Ursprung:** #15 Code-Gerüst.

**Einschätzung:** Bei Fehlschlag nach einem Kit-Update den Hash neu berechnen; sonst kein Handlungsbedarf.

### 2026-11-01 — Label `in-arbeit` fehlt in der Issue-Vorlage, Kleinkram in tco-branching

**Thema:** Arbeitsablauf

**Fundort:** `.github/ISSUE_TEMPLATE/aufgabe.md` (Status-Liste), `.gitattributes` (Kommentar), `.claude/skills/tco-branching/SKILL.md` Schritt 4 und 7.

**Beobachtung:** Die Issue-Vorlage listet die Status-Labels ohne `in-arbeit` (das Label setzen Sessions, nicht Menschen beim Anlegen). Der Kommentar in `.gitattributes` liest sich, als gelte er für die ganze Datei, obwohl nur `beobachtungen.md` `merge=union` hat. In Schritt 4 stehen Prüfung und Merge im selben Codeblock; Schritt 7 verweist auf das Lagebild vom Session-Start, das Stunden alt sein kann (entscheidend ist der Guard-Hook). Der Commit f73fd96 nennt noch „versionen.md union“, das wurde im Folgecommit zurückgenommen.

**Ursprung:** Task-Review, `cas-reviewer` und Abschluss-Review der Umsetzung „parallele Sessions“ (`~/CAS/projekte/docs/plans/2026-11-01-parallele-sessions.md`).

**Einschätzung:** Rein kosmetisch bzw. Lesbarkeit; bei der nächsten Überarbeitung des Skills mitnehmen.

### 2026-11-01 — Testgruppe: Handymodell in der Fragen-Tabelle, Löschzeitpunkt fehlt

**Thema:** Verein

**Fundort:** Fragen-Tabelle, Blatt *Wer ist wer*, Spalten D/E; `docs/abklaerungen.md` (Wer ist wer, K-20).

**Beobachtung:** Neben dem Namen steht freiwillig das genaue Handymodell. Gebraucht wird nur, ob ein älteres Handy dabei ist. Die Tabelle kann jeder mit dem Link lesen. Wann die beiden Spalten wieder geleert werden, ist nicht festgehalten.

**Ursprung:** Review (`cas-reviewer`) zur K-20-Notiz; Spalte auf Wunsch des Nutzers eingeführt.

**Einschätzung:** Risiko klein, Name und Aufgabe stehen dort ohnehin. Denkbar: Spalten nach dem Release *Mitglieder-Login* leeren, oder statt Modell nur «älteres Handy ja/nein».

### 2026-11-01 — «Älteres Handy» für die Testgruppe nicht definiert

**Thema:** Verein

**Fundort:** `docs/abklaerungen.md` (K-20 / Wer ist wer), `docs/testkonzept.md` (Testgruppe).

**Beobachtung:** Ins Repo soll kommen, ob ein älteres Handy dabei ist, aber keine Grenze ist festgelegt. Gemeint ist vermutlich die iOS-Version, ab der Web Push klappt.

**Ursprung:** Review (`cas-reviewer`) zur K-20-Notiz.

**Einschätzung:** Festlegen, wenn die Antworten eingehen; gehört dann ins Testkonzept unter *Testgruppe*.
### 2026-11-01 — Für den Aufbau von Server und Auslieferung gibt es kein Issue

**Thema:** Arbeitsablauf

**Fundort:** `docs/ci-cd-und-release.md` (Abschnitt *Umgebungen*, „Wer baut die Auslieferung“); DoD von #15.

**Beobachtung:** #15 baut nur die CI-Prüfungen. Server, Test- und Live-Umgebung, Auslieferungs-Skript, Statusabfrage, Mindestversion und Tag-Job hat kein Issue; sie fallen zwischen #15 und #29 durch.

**Ursprung:** Review von #12 (cas-reviewer).

**Einschätzung:** Aufwand über eine Session, braucht Antworten zu K-04 und K-10 — Kandidat für ein Issue im Milestone *Mitglieder-Login*, sobald die Antworten da sind (nur mit Zustimmung des Projektleiters).

**Erledigt 2026-11-01:** Mit Zustimmung des Projektleiters als #32 angelegt (blocked by #6, #15; blocks #29). Bei der nächsten Auswertung ins Archiv.

### 2026-10-31 — Fragen-Tabelle spricht von «Anmelden», das Glossar verlangt «Login»

**Thema:** Verein

**Fundort:** Fragen-Tabelle an den Verein, Blatt «Vorstand»: K-02.1 («Anmeldecode», «bleibt angemeldet»), K-12.1 («Zwei-Faktor-Anmeldung»), K-16.1, K-16.3, K-21; Sprachregel in `docs/glossar.md` («Login statt Anmelden»).

**Beobachtung:** Das Glossar reserviert *Anmeldung* für die Teilnahme an CM oder Anlass. Die Tabelle verwendet für das Einloggen trotzdem «Anmelden» und «Anmeldecode», auch schon vor #29. In der Repo-Doku ist das seit #29 bereinigt, in der Tabelle nicht.

**Ursprung:** Review `cas-reviewer` zu #29 (Sprachregel), beim Anpassen der Tabelle bemerkt.

**Einschätzung:** Für Vereinsleute ist «Anmeldecode» verständlicher als «Login-Code». Zu entscheiden: Gilt die Sprachregel auch für Texte an den Verein, oder nur für App und Doku? Spätestens bei den Texten im Brief und in der App klären.

### 2026-10-30 — Impressum von tcolten.ch nennt eine frühere Finanzverantwortliche Person

**Thema:** Verein

**Fundort:** tcolten.ch/impressum, Abschnitt «Vertretungsberechtigte Personen».

**Beobachtung:** Das Impressum führt für Finanzen und Mitgliederverwaltung noch die frühere Person; laut Clubleitung und Projektleiter hat die Aufgabe inzwischen jemand anderes übernommen. Das Impressum stammt laut eigener Angabe von 2020.

**Ursprung:** Recherche für das Blatt «Wer ist wer» der Fragen-Tabelle.

**Einschätzung:** Sache des Vereins, nicht von MyTCO. Wird relevant, wenn die Datenschutzerklärung von MyTCO an tcolten.ch anschliesst (K-06); bei Gelegenheit dem Website-Betreuer melden.

### 2026-10-29 — Push-Auslöser sind nirgends festgelegt

**Thema:** Fachmodell

**Fundort:** `docs/adr/adr-001-web-app-zuerst.md` (Push-Auslöser), `docs/fachmodell.md`

**Beobachtung:** ADR-001 verweist für die Auslöser von Push-Nachrichten auf „das Fachmodell (#3) bzw. die Etappe CM-Betrieb“. Das Fachmodell kennt nur den Schalter am Konto und die Benachrichtigung des Doppelpartners; welche Ereignisse (neues Spiel, Resultat gemeldet, Spielplan geändert) eine Nachricht auslösen, steht nirgends.

**Ursprung:** cas-reviewer zu #3

**Einschätzung:** Gehört in die Planung der Etappe CM-Betrieb (A-ANMELDUNG-08); bis dahin unkritisch.

### 2026-10-29 — „Mermaid rendert“ lässt sich lokal nicht nachweisen

**Thema:** Doku-Check

**Fundort:** `scripts/check-docs.sh`, DoD-Punkt „Mermaid-Diagramm rendert“ in Doku-Issues

**Beobachtung:** `make check` prüft in Mermaid-Blöcken nur auf literales `\n`. Ob ein Diagramm rendert, war in #3 nur über den externen Mermaid-Chart-Validator nachweisbar; lokal ist kein `mmdc` installiert, der Reviewer konnte es nicht selbst prüfen.

**Ursprung:** #3, cas-reviewer

**Einschätzung:** Fürs Fundament mit wenigen Diagrammen tragbar; mit arc42 (#14) kommen mehr. Ein Render-Check bräuchte eine neue Abhängigkeit (Freigabe nötig).

### 2026-10-29 — Recherche-Seiten ohne Zeichensatz-Angabe, Schriften von Google

**Thema:** Doku-Darstellung

**Fundort:** `docs/recherche/2026-10-29-systemlandschaft.html` (Kopf); die Seite `2026-10-29-app-varianten-vorstand.html` hat seither ein `<meta charset="utf-8">`.

**Beobachtung:** Die Systemlandschaft-Seite hat weder `<!doctype html>` noch eine Zeichensatz-Angabe. Als lokale Datei geöffnet, kann ein Browser die Umlaute falsch darstellen. Beide Seiten laden Schriften von Google Fonts; beim Öffnen geht die IP-Adresse an Google.

**Ursprung:** Review durch `cas-reviewer` zur Vorstandsseite (Issue #7).

**Einschätzung:** Gering; im Artifact-Viewer kein Problem, weil dort der Zeichensatz gesetzt wird. Für Seiten, die an den Vorstand gehen, eventuell Systemschriften statt Google Fonts (Datenschutz-Optik).

### 2026-10-29 — Doku-Check prüft keine Anker in Markdown-Links

**Thema:** Doku-Check

**Fundort:** `scripts/check-docs.sh` (Prüfung „Relative Links in Markdown“).

**Beobachtung:** Der Check schneidet `#anker` ab und prüft nur, ob die Datei existiert. Links wie `datenschutz.md#änderungen-an-diesem-konzept` brechen still, wenn eine Überschrift umbenannt wird. Beim Kürzen des Datenschutzkonzepts fielen mehrere Anker weg; geprüft wurde nur von Hand.

**Ursprung:** Review durch `cas-reviewer` zu Issue #5.

**Einschätzung:** Gering bis mittel; mit wachsender Doku häufiger. Anker-Prüfung (GitHub-Slug aus Überschriften) wäre ein überschaubarer Ausbau des Skripts.

### 2026-10-29 — Skill tco-branching: Merge nach dev aus dem Worktree heraus wird geblockt

**Thema:** Arbeitsablauf

**Fundort:** `.claude/skills/tco-branching/SKILL.md`, Schritt 4 (`git -C $M …`).

**Beobachtung:** Solange die Session per `EnterWorktree` im Worktree ist, verweigert Claude Code Git-Befehle mit `-C` auf den Hauptordner. Für den Merge muss die Session zuerst `ExitWorktree` (keep) aufrufen; der Skill sagt das erst in Schritt 7.

**Ursprung:** Issue #5, Merge nach `dev`.

**Einschätzung:** Gering; ein Satz in Schritt 4 („vorher `ExitWorktree` mit `keep`“) würde den Fehlversuch vermeiden.

**Erledigt 2026-10-30:** Bei #8 erneut aufgetreten; Hinweis in Schritt 4 des Skills ergänzt (Trivial-Fix). Bei der nächsten Auswertung ins Archiv.

### 2026-10-30 — Vorstandsseite nennt Hosting noch als offen

**Thema:** Doku-Darstellung

**Fundort:** `docs/recherche/2026-10-29-app-varianten-vorstand.html`, Abschnitt *Budget und Kosten* und *Offene Fragen*.

**Beobachtung:** Die Seite schätzt Hosting auf CHF 60–300 pro Jahr, nennt das Metanet-Hosting als mögliche Variante und fragt, ob MyTCO dort laufen darf. Seit ADR-003 ist entschieden: Infomaniak VPS Lite, ca. CHF 110–230 pro Jahr; das Metanet-Webhosting kann keine Node-App betreiben.

**Ursprung:** Issue #8, Abgleich beim Wrap-up.

**Einschätzung:** Gering bis mittel — relevant, sobald die Seite im Gespräch mit dem Vorstand verwendet wird. Als datierte Entscheidungsgrundlage darf sie den alten Stand zeigen; dann ein Hinweis „Hosting inzwischen entschieden → ADR-003“ oder die Kostenübersicht (#9) als aktuelle Quelle.

### 2026-11-01 — Fachmodell kennt keinen Lizenzstatus für die Liste „aktueller Lizenzen“

**Thema:** Fachmodell

**Fundort:** `docs/fachmodell.md`, Objekte *Mitglied* und *Lizenzantrag*; A-LIZENZ-05 (PDF 4b).

**Beobachtung:** Das Anforderungsdokument verlangt jährlich eine Liste aller aktuellen Lizenzen mit den Änderungen zum Vorjahr. Das Fachmodell führt pro Mitglied nur die Lizenznummer (bleibt auch bei Sistierung bestehen) und die Lizenzanträge einer Lizenzrunde. Ob eine Lizenz gerade aktiv oder sistiert ist, lässt sich daraus nicht ableiten, solange nicht jedes Mitglied jedes Jahr einen Antrag stellt.

**Ursprung:** Abgleich des Anforderungsdokuments v1.2 mit dem Doku-Stand, Session vom 01.11.2026.

**Einschätzung:** Gering, solange A-LIZENZ-05 *später* ist. Spätestens beim Fachmodell-Feinschliff vor *Lizenzanträge* entscheiden, z. B. mit einem Lizenzstatus beim Mitglied, den die exportierten Anträge nachführen. Hängt mit K-34 (Storno = Sistierung?) zusammen.


### 2026-11-02 — Prüfung `design-festwerte` meldet Fehlalarme bei Kommentaren und ID-Selektoren

**Thema:** Prüfskripte, UI-Leitbild

**Fundort:** `scripts/pruefungen/design-festwerte.ts`, Funktionen `markup()` und `REGELN`.

**Beobachtung:** HTML-Kommentare im Markup werden nicht entfernt (`<!-- <div style="x"> -->` wird gemeldet), Fliesstext wie „style: modern“ gilt als style-Attribut, und ID-Selektoren oder Verweise aus Hex-Buchstaben (`#add`, `url(#cafe)`) gelten als Farbwert.

**Ursprung:** Code-Review von #13.

**Einschätzung:** Gering; Fehlalarme sind lästig, aber sicher. Beheben, sobald einer auftritt: Kommentare vor der Suche entfernen, Attribut nur innerhalb eines Tags suchen.

### 2026-11-02 — Abgleich Leitbild ↔ Tokens: doppelte Zeilen und Werte mit Zusatz unklar gemeldet

**Thema:** Prüfskripte, UI-Leitbild

**Fundort:** `scripts/pruefungen/design-tokens.ts`, `leseLeitbildTokens()`.

**Beobachtung:** Steht ein Token zweimal im Leitbild, gewinnt still die letzte Zeile. Eine Wertzelle mit Zusatz („`10px` (Karten)“) wird übergangen; die Meldung lautet dann irreführend „fehlt im Leitbild“.

**Ursprung:** Code-Review von #13.

**Einschätzung:** Gering. Doppelte Tokens und Token-Zeilen ohne erkennbaren Wert als eigenen Befund melden.

### 2026-11-02 — Kein Check, ob `var(--…)` auf ein existierendes Token zeigt

**Thema:** Prüfskripte, UI-Leitbild

**Fundort:** `src/lib/design/basis.css`, `docs/ui-mockups/`, künftige Svelte-Dateien.

**Beobachtung:** Wird ein Token im Leitbild und in `tokens.css` gleich umbenannt, aber nicht dort, wo es benutzt wird, bleiben beide Prüfungen grün; `var(--alt)` greift still nicht mehr (z. B. Tasten ohne Farbe).

**Ursprung:** Code-Review von #13.

**Einschätzung:** Mittel, sobald es mehr Bildschirme gibt. Billige Ergänzung: jedes `var(--x)` in `src/**` und `docs/ui-mockups/` muss in `tokens.css` stehen.

### 2026-11-02 — Mockups zeigen Hinweis und Fehlermeldung noch nicht

**Thema:** UI-Leitbild

**Fundort:** `docs/ui-mockups/index.html`; Bausteine `.hinweis`, `.fehler`.

**Beobachtung:** Beide Bausteine sind im Leitbild beschrieben und in `basis.css` gebaut, kommen aber in keinem Mockup vor; die Referenz für ihr Aussehen fehlt.

**Ursprung:** Code-Review von #13.

**Einschätzung:** Gering. Mit dem ersten echten Formular (Login, #29) ergänzen, z. B. Fehlermeldung „Code schon benutzt“.

### 2026-11-02 — Einheitstests der Betriebsskripte lassen ihre Temp-Ordner liegen

**Thema:** Code-Gerüst

**Fundort:** `tests/betrieb/hilfe.ts` (`fuehreAus`), `tests/betrieb/sicherung.test.ts` (`baue`) und weitere `mkdtempSync`-Aufrufe in `tests/betrieb/`.

**Beobachtung:** Jeder Lauf von `npx vitest run tests/betrieb/` legt pro Test einen Ordner `mytco-basis-*` in `$TMPDIR` an und entfernt ihn nicht; lokal liegen davon schon Hunderte.

**Ursprung:** #32, Task 6 (Aufräumprüfung nach `make betrieb-nachweis`).

**Einschätzung:** Gering, nur Platz im Temp-Ordner. Mit einem `afterEach`, das die angelegten Ordner löscht, beheben, wenn die Tests ohnehin angefasst werden.

### 2026-11-02 — `mytco:lokal` ist ein gemeinsamer Tag aller Worktrees

**Thema:** Code-Gerüst

**Fundort:** `Makefile` (`image`, `rauchtest`, `betrieb-nachweis`).

**Beobachtung:** Alle Worktrees bauen in dasselbe Docker unter demselben Tag `mytco:lokal`. Während eines `make betrieb-nachweis` hat eine parallele Session den Tag mit einem Stand ohne `betrieb/` neu gebaut; Images, die danach `FROM mytco:lokal` bauten, waren falsch. Der Nachweis markiert das Image darum beim Start mit einem eigenen Tag. `make rauchtest` und das kurze Fenster zwischen `make image` und dem Start des Nachweises sind weiter betroffen.

**Ursprung:** #32, Task 6 (zweiter Lauf von `make betrieb-nachweis`).

**Einschätzung:** Gering, nur lokal. Abhilfe wäre ein Tag je Worktree (z. B. aus dem Ordnernamen), wenn es öfter zuschlägt.
### 2026-11-02 — Fehlversuche mit dem Brief-Code zählen erst nach der Datenbankabfrage

**Thema:** Sicherheit

**Fundort:** `src/lib/server/login/dienst.ts` (Login mit Brief-Code), `src/lib/server/login/bremse.ts` (`briefFehlerProIp`).

**Beobachtung:** Die Grenze von 10 Fehlversuchen pro IP und Stunde wird vor der Abfrage geprüft, der Fehlversuch aber erst danach gezählt. Ein paralleler Schwall von Anfragen einer IP kann die 10 so einmal pro Fenster überschreiten. Beim Mail-Code ist das behoben (Versuch wird vorher gezählt).

**Ursprung:** #29, Review von Task 6.

**Einschätzung:** Bei rund 50 Bit pro Brief-Code unerheblich. Angleichen, falls die Bremse ohnehin umgebaut wird (z. B. in die Datenbank, ADR-004 Trigger 2).

### 2026-11-02 — Bremse vergisst Einträge erst bis zu 24 h 10 min nach dem letzten Ereignis

**Thema:** Sicherheit

**Fundort:** `src/lib/server/login/bremse.ts` (`erstelleBremsen`, Aufräumen alle 10 Minuten); DS-06 in `docs/datenschutz.md`.

**Beobachtung:** Das Tagesfenster pro Adresse ist 24 h lang, der Zeitgeber räumt alle 10 Minuten auf. Ein Eintrag, der nicht mehr abgefragt wird, liegt so im ungünstigsten Fall rund 24 h 10 min im Arbeitsspeicher. DS-06 sagt «höchstens 24 Stunden». Die IP-Zähler haben nur 1-Stunden-Fenster und sind nicht betroffen.

**Ursprung:** #29, Review.

**Einschätzung:** Gering, nur Arbeitsspeicher und nur die normalisierte Adresse. Wenn es streng gelten soll: Fenster auf 24 h minus Aufräumabstand setzen oder öfter aufräumen.

### 2026-11-02 — E-Mail-Adresse ist eindeutig mit Gross-/Kleinschreibung, der Login sucht ohne

**Thema:** Fachmodell

**Fundort:** `src/lib/server/db/schema.ts` (`mitglied_email_unique`), `src/lib/server/login/dienst.ts` (Suche über `lower(email)`).

**Beobachtung:** Der eindeutige Index auf `mitglied.email` unterscheidet Gross- und Kleinschreibung, die Suche beim Mail-Code vergleicht klein geschrieben. Zwei Mitglieder mit `A@…` und `a@…` wären möglich, der Login fände beide.

**Ursprung:** #29, Review von Task 7.

**Einschätzung:** Heute ohne Folge, Adressen kommen nur aus Seed-Daten. Mit dem Import oder der Verwaltung der Mitglieder einen eindeutigen Index auf `lower(email)` anlegen (FR-25).

**Erledigt 2026-11-02:** In #29 eindeutiger Index `mitglied_email_klein_unique` auf `lower(email)` (Migration `drizzle/0002_email_klein.sql`, Test in `src/lib/server/db/schema.db.test.ts`). Bei der nächsten Auswertung ins Archiv.

### 2026-11-02 — Brief verweist auf eine Datenschutzerklärung, die es in der App noch nicht gibt

**Thema:** Datenschutz

**Fundort:** `src/lib/server/brief/brief.ts` (Verweis auf `<App-Adresse>/datenschutz`), Login-Seite ohne Link «Datenschutz»; DS-09.

**Beobachtung:** Der Musterbrief nennt die Adresse der Datenschutzerklärung, die Seite fehlt aber. Die Login-Seite lässt den Link aus dem Mockup deshalb weg. DS-09 verlangt die Erklärung auch ohne Login erreichbar.

**Ursprung:** #29 (Entscheide des Controllers während der Umsetzung).

**Einschätzung:** Muss vor dem ersten Live-Release gebaut sein, sonst stimmt der Brief nicht (Text ist Entwurf, Freigabe K-06). Dann den Link auf der Login-Seite ergänzen.

### 2026-11-02 — Prüfung `testdaten` hält Zugangsdaten in URLs für E-Mail-Adressen

**Thema:** Code-Gerüst

**Fundort:** `scripts/pruefungen/testdaten.ts` (Muster `MAIL`).

**Beobachtung:** Eine Verbindungs-URL mit Benutzer vor dem `@` (z. B. für SMTP oder die Datenbank) gilt als E-Mail-Adresse mit fremder Domain und wird gemeldet. In #29 wurden die Tests darum umgeschrieben.

**Ursprung:** #29, Review von Task 9.

**Einschätzung:** Gering, Fehlalarm in sicherer Richtung. Beheben, wenn er wieder stört: Treffer direkt nach `://` ausnehmen.

### 2026-11-02 — Abstand vor Nebenaktionen mit `<p><br/>`, das Leitbild hat keinen Baustein

**Thema:** UI-Leitbild

**Fundort:** `src/routes/login/+page.svelte`, `src/routes/login/mail/+page.svelte`; `docs/ui-mockups/index.html`.

**Beobachtung:** Der Abstand vor «Kein Brief zur Hand?» und «Neuen Code schicken» entsteht wie im Mockup mit einem Zeilenumbruch. Einen Baustein oder ein Token für diesen Abstand gibt es im Leitbild nicht.

**Ursprung:** #29, Login-Seite.

**Einschätzung:** Gering. Mit #13 einen Baustein für Nebenaktionen ins Leitbild aufnehmen, dann Mockup und Seiten umstellen.

### 2026-11-02 — Ein-Seiten-Prüfung des Briefs läuft nur in `make musterbrief`

**Thema:** Code-Gerüst

**Fundort:** `scripts/musterbrief.ts` (`zaehleSeiten`).

**Beobachtung:** Dass der Brief auf eine A4-Seite passt, prüft nur das Skript. Die CI erzeugt das PDF nicht, eine Änderung an Text oder Schrift kann den Brief unbemerkt auf zwei Seiten bringen.

**Ursprung:** #29, Task 11.

**Einschätzung:** Gering, solange nur der Musterbrief existiert. Wenn der Admin Briefe aus der Verwaltung druckt, braucht dieser Weg dieselbe Prüfung, am besten als Test.

### 2026-11-02 — Wechselnde IPv6-Adressen umgehen die Grenzen pro IP

**Thema:** Sicherheit

**Fundort:** `src/lib/server/login/bremse.ts` (`briefFehlerProIp`, `mailFehlerProIp`, `anfragenProIp`), `src/lib/server/login/dienst.ts`.

**Beobachtung:** Die Grenzen zählen pro einzelner IP-Adresse. Ein Anschluss mit IPv6 hat meist ein ganzes /64-Netz und kann die Adresse bei jedem Versuch wechseln; so greifen die Grenzen pro IP nicht.

**Ursprung:** #29, abschliessendes Review.

**Einschätzung:** Gering bis mittel; der Brief-Code bleibt durch seine Länge geschützt, Mail-Codes durch die Grenze von 5 Versuchen pro Code. Mit #32 (Betrieb) IPv6-Clients vor dem Zählen auf ihr /64 zusammenfassen, im Proxy oder in der App.

### 2026-11-02 — Ein Mail-Code-Test kann mit Wahrscheinlichkeit 1 zu einer Million scheitern

**Thema:** Code-Gerüst

**Fundort:** `src/lib/server/login/mailcode.db.test.ts`, Test «neuer Mail-Code ersetzt nur den alten».

**Beobachtung:** Der Test stellt zwei Mail-Codes nacheinander aus und erwartet, dass der erste danach nicht mehr gilt. Sind beide zufällig gleich (6 Ziffern), schlägt er fehl.

**Ursprung:** #29, abschliessendes Review.

**Einschätzung:** Sehr gering. Bei Gelegenheit den zweiten Code neu ziehen, falls er dem ersten gleicht.

### 2026-11-02 — Die E2E-Tests brauchen schon 6 der 10 Code-Anfragen pro IP und Stunde

**Thema:** Code-Gerüst

**Fundort:** `tests/e2e/login.test.ts`, Grenzen in `src/lib/server/login/bremse.ts`.

**Beobachtung:** Alle drei Browser-Projekte kommen von 127.0.0.1 an denselben Server. Die Login-Tests verbrauchen pro Lauf 6 der 10 erlaubten Code-Anfragen pro IP und Stunde; zwei weitere Mail-Code-Tests reichen, um an die Grenze zu stossen.

**Ursprung:** #29, abschliessendes Review.

**Einschätzung:** Gering, aber absehbar. Vor dem nächsten Mail-Code-E2E die Grenzen für den E2E-Server einstellbar machen (Einstellung, kein Sonderweg im Code).

### 2026-11-02 — Login-Seiten zeigen nicht, dass eine Anfrage läuft

**Thema:** UI-Leitbild

**Fundort:** `src/routes/login/+page.svelte`, `src/routes/login/mail/+page.svelte`, `src/routes/+page.svelte`.

**Beobachtung:** Tasten bleiben während einer Anfrage aktiv (damit der Fokus nicht verloren geht), doppelte Klicks werden still ignoriert. Bei langsamem Netz sieht das Mitglied keine Rückmeldung.

**Ursprung:** #29, Review Task 9.

**Einschätzung:** Gering bis mittel für die Bedienung. Mit #13 einen «läuft»-Zustand für Tasten ins Leitbild aufnehmen (z. B. `aria-busy` mit sichtbarem Hinweis).

### 2026-11-02 — Beim Einlösen eines Mail-Codes wird die Sperre nicht nochmals geprüft

**Thema:** Sicherheit

**Fundort:** `src/lib/server/login/dienst.ts`, `loginMitMailCode` (bedingtes Verbrauchen nach der Reservierung).

**Beobachtung:** Die Reservierung prüft, ob das Konto gesperrt und das Mitglied aktiv ist, das anschliessende Verbrauchen nicht mehr. Wird ein Konto genau in den Millisekunden dazwischen gesperrt, entsteht trotzdem eine Sitzung.

**Ursprung:** #29, Re-Review Task 7.

**Einschätzung:** Sehr gering. Die Sitzung wäre beim nächsten Aufruf ungültig (Prüfung der Sitzung schaut auf `gesperrt`). Bei Gelegenheit die Bedingung ins Verbrauchen übernehmen.

### 2026-11-02 — Login-Dienst zieht nodemailer in seinen Modulgraphen

**Thema:** Code-Gerüst

**Fundort:** `src/lib/server/login/dienst.ts` (Import `baueCodeMail` aus `mail.ts`), `src/lib/server/login/mail.ts` (Typ `Mailer` aus `dienst.ts`).

**Beobachtung:** Der Mailversand wird in den Dienst hineingereicht, trotzdem importiert der Dienst `mail.ts` und damit nodemailer. Zwischen den beiden Dateien besteht ein Zyklus über Typen.

**Ursprung:** #29, Review Task 7.

**Einschätzung:** Gering, ohne Folge im Betrieb. Beim nächsten Umbau `Mailer` und `baueCodeMail` in ein Modul ohne nodemailer legen.

### 2026-11-02 — Manifest ohne `id` und ohne Symbol für Android-Masken

**Thema:** UI-Leitbild

**Fundort:** `static/manifest.webmanifest`.

**Beobachtung:** Es fehlt ein Symbol mit `purpose: "maskable"`; Android zeigt das App-Symbol deshalb mit weissem Rand. Ohne `id` leitet Chrome die Identität der App aus `start_url` ab.

**Ursprung:** #29, Review Task 10.

**Einschätzung:** Gering. Mit der PWA-Arbeit (Service Worker) ein maskierbares Symbol gestalten und `"id": "/"` setzen.

### 2026-11-02 — MAIL_NUR_AN wird von der App nicht ausgewertet

**Thema:** Test-Umgebung

**Fundort:** `betrieb/compose.umgebung.yml`, `betrieb/geheim.env.example`; in `src/` kein Zugriff auf `MAIL_NUR_AN`.

**Beobachtung:** Test verschickt Codes an jede Mitglieds-Adresse der Test-Datenbank (nur erfundene Daten). Der Filter fehlt vor der Demo.

**Ursprung:** #32 Merge mit #29.

**Einschätzung:** Mittel, vor der Demo mit echten Adressen nötig. Filter im Mail-Versand der App einbauen.

### 2026-11-02 — Bremsen pro IP: IPv6 nicht auf /64 zusammengefasst

**Thema:** Login-Bremsen

**Fundort:** Bremsen pro IP in der App, Caddy-Konfiguration.

**Beobachtung:** IPv6 sollte auf /64 zusammengefasst werden — weder Caddy noch die App tun es. Ein Wechsel der Adresse im selben Netz umgeht die Bremse.

**Ursprung:** #32 Merge mit #29.

**Einschätzung:** Gering bis mittel; Umsetzung in der App beim Bestimmen des Schlüssels.

### 2026-11-02 — Setup-Doku nennt einige Befehle, Hooks und Pfade nicht

**Thema:** Arbeitsablauf

**Fundort:** `README.md` (Hooks), `docs/ci-cd-und-release.md` (Tabelle *Prüfungen in der CI*), `docs/context-scopes.md`, `.claude/skills/tco-branching/SKILL.md` (Schritt 1).

**Beobachtung:** Das README nennt beim Commit nur Secret-Scan und Doku-Check, tatsächlich laufen `make check-schnell` bzw. beim Push `make check`. In der Prüfungstabelle fehlen `skip.ts`, `annahmen.ts` und `pruefe-node.sh`. In den Context-Scopes fehlen `scripts/seed-lokal.ts`, `eslint.config.js`, `.prettierrc` und `tsconfig.json`. `npm run db:generate` für neue Migrationen steht nirgends. Ein neuer Worktree hat keine `.env`, darum brechen `make dev` und `make seed` dort ab; der Skill nennt nur `npm ci`.

**Ursprung:** Doku-Audit vor Release 0.2.0.

**Einschätzung:** Gering, in einem Doku-Durchgang nachführbar.

### 2026-11-02 — A-LOGIN-08 bis -10 stehen auf «geplant», obwohl gebaut und getestet

**Thema:** Fachmodell

**Fundort:** `docs/anforderungen/anforderungen.md` (A-LOGIN-08/09/10), `tests/e2e/login.test.ts`, `docs/testkonzept.md`.

**Beobachtung:** Code und E2E-Tests mit diesen IDs gibt es, FR-24 steht im Fachmodell auf `umgesetzt`. Wann eine Anforderung auf `umgesetzt` wechselt (gebaut, oder erst nach dem Test auf echten Handys aus der DoD von #29), ist nirgends festgelegt.

**Ursprung:** Doku-Audit vor Release 0.2.0.

**Einschätzung:** Mittel. Regel im Testkonzept festlegen, dann den Status nachführen; spätestens beim Abschluss von #29.

### 2026-11-02 — Login: drei kleine Abweichungen vom Sicherheitskonzept

**Thema:** Sicherheit

**Fundort:** `src/lib/server/login/sitzung.ts`, `src/lib/server/einstellungen.ts`, `src/lib/server/login/mail.ts`; `docs/sicherheitskonzept.md` (SI-06, SI-07), `docs/ci-cd-und-release.md` (Mail nur mit TLS).

**Beobachtung:** (1) SI-07 verlangt, dass Sperre und Austritt die Sitzungsversion erhöhen; der Code prüft stattdessen `gesperrt` und `status` bei jedem Aufruf, nach einem Entsperren wären alte Sitzungen wieder gültig. Eine Sperr-Funktion gibt es noch nicht. (2) Eine `smtp://`-URL ohne TLS wird auch in Produktion nicht abgelehnt, die Vorgabe hängt nur an der Konfiguration. (3) Die Sitzung verlängert sich höchstens einmal pro Tag, das «Jahr ohne Nutzung» kann bis zu einen Tag früher enden; SI-06 sagt das nicht.

**Ursprung:** Doku-Audit vor Release 0.2.0.

**Einschätzung:** Gering. (1) beim Bau der Admin-Seite, (2) Prüfung in `einstellungen.ts` oder Doku klarstellen, (3) Halbsatz in SI-06.

### 2026-11-02 — Sitzung speichert `erstellt_am` ohne Zweck; Datenschutzerklärung siezt

**Thema:** Datenschutz

**Fundort:** `src/lib/server/db/schema.ts` (Tabelle `sitzung`), `docs/fachmodell.md`; `docs/datenschutzerklaerung.md`, `docs/ui-leitbild.md` (Du-Form).

**Beobachtung:** `sitzung.erstellt_am` wird geschrieben, aber nur im Test gelesen; Fachmodell und SI-06 nennen nur *zuletzt genutzt*. Die Datenschutzerklärung ist in der Sie-Form geschrieben, das Leitbild verlangt Du für jede Oberfläche, und die Erklärung soll in der App stehen (DS-09).

**Ursprung:** Doku-Audit vor Release 0.2.0.

**Einschätzung:** Gering. Spalte streichen oder im Fachmodell begründen; Erklärung vor der Freigabe durch den Vorstand auf Du umstellen.

### 2026-11-02 — Testdaten-Regel im Testkonzept passt nicht zur Praxis

**Thema:** Code-Gerüst

**Fundort:** `docs/testkonzept.md` (Testdaten), `tests/hilfen/mitglieder.ts`, `scripts/musterbrief.ts`, `scripts/pruefungen/testdaten.ts`.

**Beobachtung:** Das Testkonzept verlangt wenige feste Personen ohne Generator, auch im Seed. Die Tests erzeugen eindeutige Adressen mit UUID, Seed und Musterbrief nutzen eigene Personen. `scripts/musterbrief.ts` fällt nicht unter die Prüfung auf `@example.org`. Alle Daten sind erfunden.

**Ursprung:** Doku-Audit vor Release 0.2.0.

**Einschätzung:** Gering. Regel an die Praxis anpassen (eindeutige Adressen pro Test sind sinnvoll), Prüfung auf die Musterbrief-Daten ausweiten.

### 2026-11-02 — Caddy schreibt INFO statt nur Fehler und Warnungen; Dependabot schliesst auch Node-Hauptversionen aus

**Thema:** Sicherheit

**Fundort:** `betrieb/caddy/Caddyfile` (`log default` ohne `level`), `.github/dependabot.yml`; `docs/ci-cd-und-release.md` (*Netz und Header*, *Updates*).

**Beobachtung:** Ohne `level` gilt Caddys Standard INFO, die Doku nennt nur Fehler und Warnungen; der IP-Filter wirkt auf alle Einträge. Dependabot schliesst ausser PostgreSQL und Caddy auch Node-Hauptversionen aus, die Doku nennt nur die zwei.

**Ursprung:** Doku-Audit vor Release 0.2.0.

**Einschätzung:** Gering. `level WARN` setzen (zur Doku passend, weniger Log) und einen Halbsatz zu Node ergänzen.
