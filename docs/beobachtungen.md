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

### 2026-11-03 — ADR-003: Reevaluations-Trigger 1 steht kurz vor dem Auslösen (Stellvertretung)

**Thema:** Betrieb

**Fundort:** `docs/adr/adr-003-hosting-infomaniak-vps.md`, Reevaluations-Trigger 1; Antwort K-05.

**Beobachtung:** Laut K-05 übernimmt vorerst niemand den Betrieb, im Notfall springt die Hauptansprechperson übergangsweise ein. Der Trigger «niemand übernimmt die Server-Pflege → verwaltete Plattform» greift damit, sobald der Projektleiter ausfällt.

**Ursprung:** Übertragung der Antworten vom 03.11.2026, Review.

**Einschätzung:** Keine sofortige Folge. Wieder ansehen, wenn sich der Vorstand zur Stellvertretung äussert oder vor dem ersten Live-Release.

### 2026-11-03 — Mockups zeigen noch Termine nach dem alten Fahrplan

**Thema:** Arbeitsablauf

**Fundort:** `docs/ui-mockups/index.html` (Zeilen 98, 124), `docs/ui-mockups/grosse-schrift.html` (Zeile 44): «Anmeldung offen bis 15. Mai».

**Beobachtung:** Die Beispieldaten passen knapp noch zum neuen Fahrplan (Anmeldung ab Mitte April, Auslosung Anfang Juni), stammen aber aus dem alten. Beim Vorzeigen vor dem Vorstand kann das irritieren.

**Ursprung:** Review der Übertragung vom 03.11.2026.

**Einschätzung:** Kosmetik. Beim nächsten Anfassen der Mockups oder nach der Antwort zu K-24.2 (Anmeldeschluss) angleichen.

### 2026-11-03 — Dependabot-PR #38 (TypeScript 7) rot wegen Peer-Abhängigkeiten

**Thema:** Betrieb

**Fundort:** PR #38, CI-Lauf 41442207777 (Jobs „Prüfen", „E2E", „Docker-Image");
`package.json` (`typescript`, `svelte-check`, `typescript-eslint`, `@sveltejs/kit`).

**Beobachtung:** `npm ci` bricht mit ERESOLVE ab, bevor Lint, Tests oder Build laufen.
Stand 03.11.: `svelte-check` 4.7.8 verlangt TypeScript `^5 || ^6`, `typescript-eslint`
8.72.1 `>=4.8.4 <6.1.0`, `@sveltejs/kit` 3.1.1 `^6`. Keine dieser Fassungen erlaubt
TypeScript 7 (Neufassung des Compilers in Go). Am eigenen Code liegt es nicht.

**Ursprung:** Nutzerhinweis „PR #38 weiterhin rot", Diagnose in der Session vom 03.11.

**Einschätzung:** PR bleibt nach Entscheid des Nutzers offen, bis die drei Pakete
TypeScript 7 erlauben; dann `@dependabot rebase` und CI erneut laufen lassen.
Nicht mit `--legacy-peer-deps` umgehen. Prüfen mit
`npm view svelte-check typescript-eslint @sveltejs/kit peerDependencies`.

### 2026-11-03 — SMTP-Verbindung: Zertifikatsprüfung abschaltbar, kein eigenes Zeitlimit

**Thema:** Betrieb

**Fundort:** `src/lib/server/einstellungen.ts` → `tlsErzwungen`, Mail-Versand über `MYTCO_SMTP_URL`.

**Beobachtung:** `tlsErzwungen` prüft nur das Schema und `requireTLS`. nodemailer übernimmt weitere Optionen aus der Query der URL; `tls.rejectUnauthorized=false` schaltete die Prüfung des Zertifikats ab. Ein eigenes Zeitlimit für SMTP fehlt (Vorgaben von nodemailer: 2 Minuten Verbindungsaufbau, 10 Minuten Leerlauf); ein hängender Mailserver verzögert auf Test den Schritt «testdaten laden».

**Ursprung:** #39, Final-Review.

**Einschätzung:** Tritt nur bei absichtlicher Fehleinstellung durch den Betreiber auf. Vorläufig: Einstellungssache des Betreibers; in `betrieb/README.md` dokumentieren, wenn der Mail-Anbieter gewählt ist (K-11).

### 2026-11-03 — Datenbank-Container loggen bei scheiterndem Einspielen Werte

**Thema:** Betrieb

**Fundort:** `docker logs` der db-Dienste (Test und Live), Einspielen in `betrieb/bin/wiederherstellen`.

**Beobachtung:** Scheitert das Einspielen, schreibt der Postgres-Server in sein eigenes Log `DETAIL: Failing row contains (…)` und `STATEMENT: COPY …` mit Werten aus der Datenbank. Das liegt ausserhalb von `protokoll.log`, das die Werte bewusst nicht enthält.

**Ursprung:** #39, Review Task 6.

**Einschätzung:** Betrifft DS-06 und die zeitliche Begrenzung der Docker-Logs (offener Teil von #39, Rotation nach Zeit). Vorläufig: beim Einrichten des Servers klären, ob `log_error_verbosity` oder die Log-Aufbewahrung reicht.

### 2026-11-03 — Nächtliche Sicherung nimmt keine Sperre gegenüber `wiederherstellen`

**Thema:** Betrieb

**Fundort:** `betrieb/bin/sichern` (`forget --prune`), `betrieb/bin/wiederherstellen` (zwischen `snapshot suchen` und `einspielen`).

**Beobachtung:** Der nächtliche `sichern`-Lauf nimmt keine Sperre. Läuft er zwischen `snapshot suchen` und `einspielen` von `wiederherstellen`, kann sein `forget --prune` einen knapp 30 Tage alten, gerade gewählten Lauf entfernen.

**Ursprung:** #39, Review Task 6.

**Einschätzung:** Selten (enges Zeitfenster, nur bei ältestem Lauf). Vorläufig: bewusst nichts tun, wieder ansehen, wenn Wiederherstellungen häufiger werden.

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

### 2026-11-03 — Die Seite `/datenschutz` gibt es nicht, Brief und Erklärung verweisen darauf

**Thema:** Datenschutz

**Fundort:** `src/lib/server/brief/brief.ts` (Link `<Adresse>/datenschutz`), `docs/datenschutzerklaerung.md`, Login-Seite, DS-09, Matrix in `docs/rollen-und-rechte.md`.

**Beobachtung:** Der Brief und die Datenschutzerklärung nennen `<Adresse>/datenschutz`. Unter `src/routes` gibt es die Seite nicht, und die Login-Seite verlinkt sie nicht, obwohl DS-09 und die Matrix von Rollen und Rechte sie vorsehen.

**Ursprung:** Doku-Abgleich vor Release 0.3.0.

**Einschätzung:** Blockiert den Versand echter Briefe an Mitglieder, nicht das Release ohne Server. Vor #40 (Testgruppe) bauen.

### 2026-11-03 — `ausliefern` auf Test: Fehler nach `down --volumes` führt nicht zum Rückfall

**Thema:** Betrieb

**Fundort:** `betrieb/bin/ausliefern`, Schritte «migrieren» und «testdaten laden».

**Beobachtung:** Auf Test wird die Datenbank vorher mit `down --volumes` verworfen. Scheitert danach «migrieren» oder «testdaten laden», endet der Lauf mit `scheitern`, nicht mit `rueckfall`; Test bleibt ohne laufende App. Die Doku sagt nur «scheitert».

**Ursprung:** Doku-Abgleich vor Release 0.3.0.

**Einschätzung:** Auf Test vertretbar, da es keine Daten zu schützen gibt. Beim Inbetriebnehmen (#39) entscheiden und die Doku entsprechend präzisieren.

### 2026-11-03 — `probe` ignoriert Zusatzargumente still

**Thema:** Betrieb

**Fundort:** `betrieb/bin/probe` gegen `betrieb/bin/sichern` und `betrieb/bin/wiederherstellen`.

**Beobachtung:** `sichern` und `wiederherstellen` weisen überzählige Argumente mit `fehler` ab, `probe` ignoriert sie ohne Meldung.

**Ursprung:** Doku-Abgleich vor Release 0.3.0.

**Einschätzung:** Niedrig. Bei der nächsten Änderung an `probe` angleichen.

### 2026-11-03 — Live-Sperre und `geheim.env`: zwei Restlücken

**Thema:** Betrieb

**Fundort:** `betrieb/bin/lib.sh` → `mail_umleitung_gesetzt`, `compose()`; `betrieb/nachweis/rauchtest.sh`.

**Beobachtung:** Ein Wert in Anführungszeichen über zwei Zeilen (`MAIL_NUR_AN="` und die Adresse auf der nächsten Zeile) sieht die Sperre als leer; ob Compose so einen Wert durchreicht, ist nicht geprüft. Ausserdem ist nur `MAIL_NUR_AN` vor der Shell-Umgebung geschützt (`unset`): Andere Werte aus `geheim.env` (z. B. `ORIGIN`, `POSTGRES_PASSWORD`) kann eine gesetzte Shell-Variable beim Aufruf weiterhin überschreiben. `rauchtest.sh` lädt `lib.sh` nicht (nur lokal).

**Ursprung:** #39, Final-Review und Nachprüfung der Korrekturrunde.

**Einschätzung:** Beides nur bei absichtlich verbogener Datei oder Shell auf dem Server. Beim Härten des Servers (#39) prüfen, ob `compose()` die Werte von `geheim.env` generell vor der Shell schützen soll.

### 2026-11-04 — DB-Test mit späterem «jetzt» löscht Sitzungen anderer Testdateien

**Thema:** Tests

**Fundort:** `erstelleSitzung` in `src/lib/server/login/sitzung.ts`; Passkey-Tests in `src/lib/server/login/passkey.db.test.ts`.

**Beobachtung:** Alle DB-Tests teilen dieselbe Datenbank. `erstelleSitzung` löscht abgelaufene Sitzungen global. Ein DB-Test mit einem späteren «jetzt» kann so bei parallelem Lauf Sitzungen anderer Testdateien löschen. Als Behelf wurden die Daten der Passkey-Tests auf 2026-11-02 angeglichen (#44).

**Ursprung:** #44, Passkey (04.11.2026).

**Einschätzung:** Niedrig, solange alle Tests ähnliche Daten nehmen. Kommt zurück, wenn ein Test mit weit entferntem Datum flackert; dann das Aufräumen auf das eigene Konto beschränken.

### 2026-11-04 — Passkey: Zähler wird ohne Vergleich geschrieben

**Thema:** Login

**Fundort:** `src/lib/server/login/passkey.ts` → `anmelden`, Update von `zaehler`.

**Beobachtung:** Der neue Zähler wird ohne Vergleich mit dem gespeicherten Wert geschrieben. Zwei parallele Anmeldungen mit demselben Passkey könnten den Zähler senken. Abhilfe wäre `GREATEST(zaehler, neu)` im Update.

**Ursprung:** #44, Final-Review.

**Einschätzung:** Niedrig. Synchronisierte Passkeys melden ohnehin immer 0; der Zähler schützt hier kaum.

### 2026-11-04 — Passkey: Zahl der Passkeys je Konto unbegrenzt

**Thema:** Login

**Fundort:** `src/lib/server/login/passkey.ts` → `einrichten`.

**Beobachtung:** Ein Mitglied kann beliebig viele Passkeys einrichten. Betroffen ist nur das eigene Konto (Liste, Speicher).

**Ursprung:** #44, Final-Review.

**Einschätzung:** Niedrig. Eine Obergrenze (z. B. 20) erst, wenn Missbrauch oder eine lange Liste auffällt.

### 2026-11-04 — Startseite: Fokus landet nach dem Passkey-Hinweis auf dem Seitenrumpf

**Thema:** Barrierefreiheit

**Fundort:** `src/routes/+page.svelte` → `neinDanke`, `einrichten`.

**Beobachtung:** Verschwindet der Hinweis nach «Nein, danke» oder nach dem Einrichten, landet der Fokus auf dem `body`. Tastatur- und Screenreader-Nutzer verlieren ihre Stelle.

**Ursprung:** #44, Final-Review.

**Einschätzung:** Niedrig bis mittel. Fokus auf die Überschrift «Hoi …» setzen, sobald der Hinweis weg ist.

### 2026-11-04 — Passkey: Einrichten-Challenge gilt je Konto, nicht je Gerät

**Thema:** Login

**Fundort:** `src/lib/server/login/challenge.ts`, `optionenEinrichten` in `src/lib/server/login/passkey.ts`.

**Beobachtung:** Die Challenge zum Einrichten wird je Konto abgelegt. Richtet dasselbe Mitglied auf zwei Geräten gleichzeitig ein, überschreibt die zweite Anfrage die erste, und das erste Gerät scheitert (Meldung «Das hat nicht geklappt»).

**Ursprung:** #44, Final-Review.

**Einschätzung:** Sehr niedrig; das Mitglied versucht es einfach neu. Nur angehen, wenn es in der Praxis gemeldet wird.

### 2026-11-04 — Zwei Admins überschreiben sich beim Speichern der Angaben still

**Thema:** Tests

**Fundort:** `aendereAngaben` in `src/lib/server/admin/mitglieder.ts`, Seite *Mitglied* der Verwaltung.

**Beobachtung:** Das Speichern schreibt alle Felder. Öffnen zwei Admins (oder zwei Tabs) dasselbe Mitglied, überschreibt der zweite Speichern die Änderung des ersten ohne Hinweis.

**Ursprung:** Final-Review #43 Etappe 1.

**Einschätzung:** Bei wenigen Admins selten. Abhilfe: nur geänderte Felder schicken, oder den alten Stand mitschicken und bei Abweichung mit 409 antworten.

### 2026-11-04 — Fehlerseite unter /verwaltung ohne Rahmen

**Thema:** Barrierefreiheit

**Fundort:** `src/routes/verwaltung/+layout.svelte`, Fehlerfall im `+layout.ts`.

**Beobachtung:** Bei einem Fehler (z. B. 503 beim Laden des Zugangs) zeigt die Fehlerseite keinen Rahmen: kein `main`, kein Weg zurück.

**Ursprung:** Final-Review #43 Etappe 1.

**Einschätzung:** Selten, aber eine Sackgasse. Beim nächsten Anfassen der Verwaltungs-Oberfläche eine `+error.svelte` mit Rahmen und Link anlegen.

### 2026-11-04 — Mitgliedernummer ist nur bei gleicher Gross-/Kleinschreibung eindeutig

**Thema:** Datenschutz

**Fundort:** Eindeutigkeit der Mitgliedernummer in `src/lib/server/db/schema.ts` und `src/lib/server/admin/mitglieder.ts`.

**Beobachtung:** «A12» und «a12» gelten als verschiedene Nummern. Die E-Mail-Adresse wird dagegen ohne Rücksicht auf Gross-/Kleinschreibung verglichen (FR-25).

**Ursprung:** Final-Review #43 Etappe 1.

**Einschätzung:** Vor Etappe 2 (Einlesen der Mitgliederliste, A-MITGLIED-07) entscheiden, sonst entstehen beim Abgleich Doppelte.

### 2026-11-04 — Bauregel prüft nicht, ob Admin-Routen nur Funktionen aus ADMIN_SCHNITTSTELLEN nutzen

**Thema:** Tests

**Fundort:** `scripts/pruefungen/bauregel.ts`, `ADMIN_SCHNITTSTELLEN` in `src/lib/server/admin/schnittstellen.ts`.

**Beobachtung:** Die Bauregel prüft, woher eine Admin-Route importiert, aber nicht, dass jede importierte Funktion in `ADMIN_SCHNITTSTELLEN` steht. Nur diese Liste deckt der Test «ohne Sitzung 401, ohne Rolle 403, unbestätigt 403» ab.

**Ursprung:** Final-Review #43 Etappe 1.

**Einschätzung:** Vor der ersten neuen Admin-Route in Etappe 2 schliessen, sonst kann eine Route ohne Rechteprüfung unbemerkt bleiben.

### 2026-11-04 — Login-Schnittstellen importieren admin/rollen.ts: Kopplung in beide Richtungen

**Thema:** Login

**Fundort:** `src/lib/server/login/schnittstellen.ts` importiert `src/lib/server/admin/rollen.ts`.

**Beobachtung:** Der Login kennt die Rollen der Verwaltung, und die Verwaltung kennt den Login: Die Module sind in beide Richtungen gekoppelt.

**Ursprung:** Final-Review #43 Etappe 1.

**Einschätzung:** Funktioniert. Bei der nächsten grösseren Änderung an Rollen die Rollenabfrage in ein gemeinsames Modul verschieben.

### 2026-11-04 — Etappe 3: Austritt und Löschen müssen die Sperre aus rollen.ts nehmen

**Thema:** Arbeitsablauf

**Fundort:** `src/lib/server/admin/rollen.ts` (RR-03, letzter Admin), Etappe 3 von #43 (Austritt, Löschen).

**Beobachtung:** Austritt und Löschen eines Mitglieds mit der Rolle Admin müssen die Sperre «der letzte Admin bleibt» berücksichtigen. Die Löschfrist (Bedenkzeit) braucht einen Zeitgeber; ohne pg-boss ist das ein Nachtrag zu ADR-002.

**Ursprung:** Final-Review #43 Etappe 1.

**Einschätzung:** Beim Planen von Etappe 3 mitnehmen; den ADR-Nachtrag vor dem Bauen schreiben.

### 2026-11-04 — Profil: erneutes Einrichten auf einem Gerät mit Passkey bleibt ohne Rückmeldung

**Thema:** Login

**Fundort:** `src/routes/profil/+page.svelte` → `einrichten` (Ergebnis `'vorhanden'`).

**Beobachtung:** Tippt ein Mitglied im Profil «Passkey auf diesem Gerät einrichten», obwohl das Gerät schon einen hat, passiert sichtbar nichts. Die Taste steht auch unter der Kachel des eigenen Geräts. Ein eigener Text («Auf diesem Gerät ist schon ein Passkey eingerichtet.») bräuchte die Freigabe des Projektleiters.

**Ursprung:** #44, Final-Review (Entscheid beim Fix: wie Abbruch behandeln).

**Einschätzung:** Niedrig bis mittel. Mit der Testgruppe (#40) prüfen, ob es verwirrt; dann Text freigeben lassen.

### 2026-11-04 — Profil: «Entfernen» nennt für Screenreader nicht das Gerät

**Thema:** Barrierefreiheit

**Fundort:** `src/routes/profil/+page.svelte`, Taste «Entfernen» je Kachel.

**Beobachtung:** Bei mehreren Passkeys heissen alle Tasten gleich. Wer mit dem Screenreader die Tasten durchgeht, hört nicht, welches Gerät gemeint ist.

**Ursprung:** #44, Review Task 7.

**Einschätzung:** Niedrig. `aria-label="<Gerät> entfernen"` wäre ein Einzeiler.

### 2026-11-04 — Startseite: Scheitert «Nein, danke» am Server, kommt der Hinweis zurück

**Thema:** Login

**Fundort:** `src/routes/+page.svelte` → `neinDanke`.

**Beobachtung:** Der Hinweis verschwindet sofort; scheitert der Aufruf an den Server, merkt das niemand, und nach dem Neuladen ist er wieder da.

**Ursprung:** #44, Final-Review.

**Einschätzung:** Sehr niedrig, harmlos. Nur angehen, wenn gemeldet.

### 2026-11-04 — Kleine Doppelungen im Login-Code

**Thema:** Login

**Fundort:** `src/routes/+page.ts` und `src/routes/profil/+page.ts` (Sitzungsprüfung mit Umleitung); `post` in `src/lib/login/passkey.ts` neben `sende` in `src/lib/login/anmelden.ts` (JSON-Kopf); `istEindeutigkeitsfehler` aus `dienst.ts` in `passkey.ts`.

**Beobachtung:** Drei kleine Doppelungen bzw. Kopplungen ohne Verhaltensfehler. Die Sitzungsprüfung steht zweimal, der JSON-Kopf zweimal, und der Passkey-Dienst holt eine Hilfsfunktion aus dem Code-Login-Dienst.

**Ursprung:** #44, Task-Reviews und cas-reviewer.

**Einschätzung:** Niedrig. Zusammenlegen, wenn eine dritte Seite oder ein dritter Aufrufer dazukommt.

### 2026-11-04 — E2E: Profil-Navigation mehrfach kopiert, Fehlversuche pro IP nicht zentral gezählt

**Thema:** Tests

**Fundort:** `tests/e2e/passkey.test.ts`, `tests/e2e/login.test.ts`.

**Beobachtung:** Der Klick auf den Reiter «Profil» steht in mehreren Tests einzeln. Alle Browser kommen von 127.0.0.1, die Grenzen (10 Fehlversuche pro Stunde) gelten für den ganzen Lauf; wie viele Fehlversuche alle E2E-Dateien zusammen verbrauchen, prüft niemand. Heute 4 Passkey-Zählungen pro Lauf.

**Ursprung:** #44, Review Task 8.

**Einschätzung:** Niedrig. Ein gemeinsamer Helfer in `tests/e2e/hilfen/seite.ts`; die Zählung wird erst eng, wenn weitere Fehlversuch-Tests dazukommen.

### 2026-11-04 — Neue Migration auf einem Branch setzt die geteilte lokale Datenbank zurück

**Thema:** Arbeitsablauf

**Fundort:** lokale Docker-Datenbank `mytco` (`make db`), von allen Worktrees geteilt.

**Beobachtung:** In #44 wurde die noch nicht ausgelieferte Migration 0003 neu erzeugt. Die lokale Datenbank hatte die alte Fassung schon eingespielt; ein Subagent hat sie darum gelöscht und neu angelegt. Eine parallele Session (Worktree `issue-043`) nutzt dieselbe Datenbank und kann davon unbemerkt betroffen sein.

**Ursprung:** #44, Fix nach dem Final-Review.

**Einschätzung:** Mittel bei Parallelarbeit. Optionen: eigene Datenbank je Worktree (Name aus dem Worktree) oder Regel «Migrationen nie neu erzeugen, sobald sie migriert wurden».

### 2026-11-04 — Nach einem Merge mit neuen Paketen ist der Pre-Push-Hook im Hauptordner rot

**Thema:** Arbeitsablauf

**Fundort:** Hauptordner `tco-app`, `.githooks/pre-push` → `make check`.

**Beobachtung:** Der Hauptordner hatte `node_modules` vom alten Stand. Nach dem Merge von #44 (zwei neue Pakete) scheiterte `svelte-check` beim Push von `dev`, bis `npm ci --ignore-scripts` lief.

**Ursprung:** #44, Merge nach `dev`.

**Einschätzung:** Niedrig. `make voraussetzungen` könnte prüfen, ob `node_modules` zur Lock-Datei passt, oder der Branching-Skill nennt `npm ci` nach Merges mit Paketänderungen.

### 2026-11-04 — K-48 Website-Umzug: Antwort zieht ADR-003, Kosten und Sicherheitskonzept nach sich

**Thema:** Betrieb

**Fundort:** `docs/abklaerungen.md` K-48; `docs/adr/adr-003-hosting-infomaniak-vps.md`, `docs/kosten.md`, `docs/sicherheitskonzept.md`.

**Beobachtung:** K-48 ist nirgends als `Annahme K-48` markiert, `make annahmen` meldet bei einer Antwort also nichts. Zieht die Website auf den MyTCO-Server, braucht es einen Nachtrag zu ADR-003 (eigener Container, abgeschottet von Datenbank und Netz von MyTCO), neue Posten in `kosten.md` (Postfächer, wegfallendes Metanet-Paket) und eine Bedrohung im Sicherheitskonzept (Lücke im Admin-Bereich der Website auf demselben Server).

**Ursprung:** Nutzerhinweis, Session vom 04.11.2026 (Website weg von Metanet).

**Einschätzung:** Erst relevant, wenn K-09.1 und K-48 beantwortet sind. Dann zusammen bewerten: gleicher Server oder eigenes Webhosting bei Infomaniak.
