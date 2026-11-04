[← Beobachtungen](beobachtungen.md)

# Beobachtungen — Archiv

Ausgewertete Einträge aus [`beobachtungen.md`](beobachtungen.md), ein Block pro Auswertung,
neuester oben. Jeder Eintrag steht hier als eine Zeile mit Ausgang und Verweis; die
Begründung lebt im Issue, im Commit oder in der Doku. Verworfene Einträge behalten ihren
Gegenbeleg.

### Auswertung vom 04.11.2026 — 34 Einträge, gegen `dev` (a694133) verifiziert

Bilanz: 0 verworfen (1 teilweise widerlegt, 1 überholt) · 18 abgehakt · 3 mitgemacht · 4 Doku ·
8 an Issues (#39, #43) · 1 auf drei Ausgänge verteilt (Kleinigkeiten der Mitgliederverwaltung),
dazu 2 Nebenbefunde (einer mitgemacht, einer an #46). Bei 19 trug die Begründung ganz oder
teilweise nicht, bei 3 weiteren war sie unvollständig (Tabelle unten). Abschnitt «Offen» danach leer.

**An Issues angehängt**

- 2026-11-03 — SMTP-Verbindung: Zertifikatsprüfung abschaltbar, kein eigenes Zeitlimit → [Kommentar in #39](https://github.com/konstantinniedermann/tco-app/issues/39#issuecomment-6635363278)
- 2026-11-03 — Datenbank-Container loggen bei scheiterndem Einspielen Werte → [Kommentar in #39](https://github.com/konstantinniedermann/tco-app/issues/39#issuecomment-6635363278)
- 2026-11-03 — `ausliefern` auf Test: Fehler nach `down --volumes` führt nicht zum Rückfall → [Kommentar in #39](https://github.com/konstantinniedermann/tco-app/issues/39#issuecomment-6635363278)
- 2026-11-03 — Live-Sperre und `geheim.env`: zwei Restlücken → [Kommentar in #39](https://github.com/konstantinniedermann/tco-app/issues/39#issuecomment-6635363278)
- 2026-11-04 — Zwei Admins überschreiben sich beim Speichern der Angaben still → [Kommentar in #43](https://github.com/konstantinniedermann/tco-app/issues/43#issuecomment-6635363761)
- 2026-11-04 — Fehlerseite unter /verwaltung ohne Rahmen → [Kommentar in #43](https://github.com/konstantinniedermann/tco-app/issues/43#issuecomment-6635363761); Ursache im Wurzel-Layout
- 2026-11-04 — Mitgliedernummer ist nur bei gleicher Gross-/Kleinschreibung eindeutig → [Kommentar in #43](https://github.com/konstantinniedermann/tco-app/issues/43#issuecomment-6635363761), hängt an K-45
- 2026-11-04 — Bauregel prüft nicht, ob Admin-Routen nur Funktionen aus ADMIN_SCHNITTSTELLEN nutzen → [Kommentar in #43](https://github.com/konstantinniedermann/tco-app/issues/43#issuecomment-6635363761), mit zwei weiteren Wegen
- Nebenbefund — Austritte über das Einlesen der Liste müssen RR-03 beachten → [Kommentar in #46](https://github.com/konstantinniedermann/tco-app/issues/46#issuecomment-6635364268)

**Mitgemacht** (Commits direkt auf `dev`)

- 2026-11-04 — DB-Test mit späterem «jetzt» löscht Sitzungen anderer Testdateien → a5853c6, Aufräum-Test mit eigener Datenbank; Gegenprobe mit abgeschaltetem Aufräumen rot
- 2026-11-04 — Passkey: Zähler wird ohne Vergleich geschrieben → 7cf37f1 (`GREATEST`), Test zuerst rot
- 2026-11-04 — Kleine Doppelungen im Login-Code → JSON-Kopf zusammengelegt (269d0cc), Trigger «dritter Aufrufer» war erreicht (`verwaltung/api.ts`). Sitzungsprüfung (2 Stellen) und `istEindeutigkeitsfehler` (auch `vergebenesFeld` in `mitglieder.ts`) abgehakt. Trigger: dritte Seite bzw. dritter Aufrufer
- Nebenbefund — `release-check` verglich ohne `--no-renames` → a3fc82f

**Doku**

- 2026-11-04 — Neue Migration auf einem Branch setzt die geteilte lokale Datenbank zurück → Regel im Skill `tco-branching` (bd924ae); auch `make e2e` migriert die geteilte Datenbank
- 2026-11-04 — Nach einem Merge mit neuen Paketen ist der Pre-Push-Hook im Hauptordner rot → Satz im Skill `tco-branching` (bd924ae); Memory `falle_hauptordner_node_modules` bestand schon
- 2026-11-04 — K-48 Website-Umzug: Antwort zieht ADR-003, Kosten und Sicherheitskonzept nach sich → Folgen in `kosten.md` beim Eintrag K-48 (23ed87a); siehe Verworfen
- 2026-11-04 — Datenschutzerklärung sagt bei «nach einer Woche gelöscht» nicht, dass der Name bleibt → a822d30

**Auf drei Ausgänge verteilt**

- 2026-11-04 — Kleinigkeiten in Oberfläche und Code der Mitgliederverwaltung → mitgemacht: E-Mail mit leeren Domain-Teilen (d79d53f), `STATUS` an `MitgliedStatus` gebunden (4668e3f), Klappe *Rollen* zu, Tabellenköpfe ohne Trennung (Leitbild-Ausnahme), doppeltes CSS (c75eb9d). An #43: Steuerzeichen in Textfeldern, Kurzinfo «50 Einträge» (braucht ein Feld vom Server, darum nicht Kleinkram). Abgehakt: gemeinsames `laeuft`-Flag, `legeAdminFest` ohne Transaktion, `Eintrag.detail` frei, `aenderung.aktion` ohne DB-Check, Höhe des Auswahlfelds auf dem iPhone (nicht gemessen). Trigger: nächste Arbeit an der Stelle

**Abgehakt** — mit Begründung; wo der Punkt zurückkommen kann, mit Trigger

- 2026-11-03 — ADR-003: Reevaluations-Trigger 1 steht kurz vor dem Auslösen → steht wörtlich in ADR-003 und im Kommentar in #10
- 2026-11-03 — Mockups zeigen noch Termine nach dem alten Fahrplan → passt zum neuen Fahrplan (siehe Prämissen). Trigger: Antwort zu K-24.2; 4 Stellen (auch `passkey.html`)
- 2026-11-03 — Dependabot-PR #38 (TypeScript 7) rot → der PR ist der Vorgang; Peers erlauben TS 7 weiterhin nicht. Prüfen je Paket: `npm view svelte-check peerDependencies` usw.
- 2026-11-03 — Nächtliche Sicherung nimmt keine Sperre gegenüber `wiederherstellen` → kein Datenverlust, nur Live; als Info im [Kommentar in #39](https://github.com/konstantinniedermann/tco-app/issues/39#issuecomment-6635363278). Trigger: Wiederherstellungen werden häufiger
- 2026-11-03 — `make release-check`: zwei Restlücken → Trigger: Live wird eingeschaltet
- 2026-11-03 — Releases nur mit Werkzeug-Änderungen erzwingen eine neue Version → bewusste Regel (Skill, `ci-cd-und-release.md`); eine engere Regel betrifft `nur-doku.ts`, `code-stand.sh` und die Image-Kennung. Trigger: viele Korrekturversionen ohne App-Änderung
- 2026-11-03 — Die Seite `/datenschutz` gibt es nicht → Checkliste von #40 («Datenschutzerklärung ist auf Live erreichbar») und Kommentar in #29 (Link auf der Login-Seite)
- 2026-11-03 — `probe` ignoriert Zusatzargumente still → erst ab dem 3. Argument; `ausliefern` und `zurueck` ebenso. Trigger: nächste Änderung an `betrieb/bin`
- 2026-11-04 — Passkey: Zahl der Passkeys je Konto unbegrenzt → Trigger: Missbrauch oder lange Liste
- 2026-11-04 — Passkey: Einrichten-Challenge gilt je Konto → Folge schärfer als notiert (siehe Prämissen), trotzdem selten. Trigger: Meldung aus der Praxis
- 2026-11-04 — Login-Schnittstellen importieren admin/rollen.ts → einziger Import in diese Richtung (`istAdmin`). Trigger: Planung von Etappe 3 (#43), die `rollen.ts` ohnehin umbaut
- 2026-11-04 — Etappe 3: Austritt und Löschen müssen die Sperre aus rollen.ts nehmen → überholt, steht wörtlich in der DoD von #43
- 2026-11-04 — Startseite: Fokus landet nach dem Passkey-Hinweis auf dem Seitenrumpf · Startseite: Scheitert «Nein, danke» am Server, kommt der Hinweis zurück · Profil: erneutes Einrichten bleibt ohne Rückmeldung · Profil: «Entfernen» nennt für Screenreader nicht das Gerät → Entscheid: jetzt nicht. Beide Startseiten-Lücken gelten auch im Zweig `'vorhanden'`. Trigger: Rückmeldung der Testgruppe (#40)
- 2026-11-04 — E2E: Profil-Navigation mehrfach kopiert, Fehlversuche pro IP nicht zentral gezählt → 5 Stellen. Trigger: nächster Test, der Passkey- oder Fehlversuche verbraucht
- 2026-11-04 — Testlücken aus den Task-Reviews der Mitgliederverwaltung → 9 Lücken belegt, Cascades und 404 teilweise getestet. Trigger: Fehler in einem dieser Wege

**Verworfen** — Teilpunkte

- *K-48: `make annahmen` meldet bei einer Antwort nichts* → `scripts/pruefungen/annahmen.ts` zählt jede ID in einem Abschnitt «Offene Fragen»; `make annahmen K=K-48` listet `docs/kosten.md` (Eintrag K-48), nach der Antwort meldet `make docs` «K-48 ist beantwortet — Annahme prüfen»
- *Nebenbefund der Prüfung: «K-09.1 gibt es nicht»* → Unterfragen stehen nur in der Fragen-Tabelle (`abklaerungen.md`, Abschnitt zu Unterfragen); dort Blatt *Website & Hoster*, ebenso K-24.2 auf *Clubmeisterschaft*

**Falsche Prämissen**

| Eintrag | Behauptet | Gemessen |
|---|---|---|
| Mockups alter Fahrplan | Datum stammt aus dem alten Fahrplan | dort war der 15.05.2027 die Öffnung der Anmeldung; als Anmeldeschluss passt es zum neuen |
| PR #38 | CI rot; Prüfbefehl mit drei Paketen | neu aufgesetzt, ohne CI-Lauf; `npm view a b c peerDependencies` zeigt nur `a` |
| DB-Log mit Werten | `STATEMENT: COPY …` trägt Werte | bei `COPY … FROM stdin` nur der Befehl; Werte in DETAIL/CONTEXT (nicht gemessen) |
| Sicherung ohne Sperre | enges Zeitfenster | so lang wie die ganze Vorab-Sicherung; nur Live; kein Datenverlust |
| Release nur Werkzeuge | gilt für das nächste Release | 0.3.0 ist erschienen; das nächste enthält App-Code |
| `/datenschutz` fehlt | Erklärung nennt die Adresse; DS-09 sieht den Link vor | Erklärung nennt keine Adresse; DS-09 verlangt Erreichbarkeit, den Link zeigt das Mockup |
| `ausliefern` auf Test | zwei Schritte ohne Rückfall | drei (auch DB-Start) |
| `probe` | ignoriert Zusatzargumente | 2. Argument wird geprüft, erst ab dem 3. still |
| Live-Sperre | `rauchtest.sh` nur lokal | läuft auch in der CI (`check.yml`) |
| DB-Test «jetzt» | alle DB-Tests teilen eine Datenbank; erst bei weit entferntem Datum | 13 von 17 teilen; Opfer ist `frisch`, schon ab gut einem Tag Abstand |
| Passkey-Zähler | ohne Vergleich | die Bibliothek vergleicht, nur nicht atomar mit dem Update |
| Challenge je Konto | das erste Gerät scheitert | schickt das erste Gerät zuerst ab, scheitern beide |
| Zwei Admins | ohne Hinweis; Abhilfe: nur geänderte Felder | der Verlauf zeigt es; `pruefeAngaben` verlangt alle Pflichtfelder |
| Fehlerseite Verwaltung | Fundort `verwaltung/+layout.svelte`; eine `+error.svelte` dort | Ursache Wurzel-Layout; nötig ist `src/routes/+error.svelte` |
| Mitgliedernummer | E-Mail nach FR-25; Abgleich in Etappe 2 | Kleinschreibung kommt vom Index, nicht von FR-25; Abgleich erst mit #46 |
| Profil erneut einrichten | Taste unter der Kachel des eigenen Geräts | eine Taste unter der ganzen Liste |
| Doppelungen Login | JSON-Kopf zweimal | dreimal (auch `verwaltung/api.ts`); 23505-Erkennung zusätzlich in `mitglieder.ts` |
| E2E Fehlversuche | Fehlversuche zählen | beim Passkey zählt jeder Versuch, auch ein erfolgreicher |
| K-48 | `make annahmen` meldet nichts; K-09.1 | meldet über `kosten.md`; K-09.1 steht in der Tabelle |

Unvollständig, aber nicht falsch: Fokus und «Nein, danke» auf der Startseite (auch Zweig `'vorhanden'`), Bauregel (zwei weitere Wege an der Rechteprüfung vorbei).

### Auswertung vom 03.11.2026 — 32 Einträge, gegen `dev` (bcc921f) verifiziert

Bilanz: 0 ganz verworfen (3 Teilpunkte verworfen) · 1 erledigt · 15 abgehakt · 6 mitgemacht ·
1 Doku · 8 an Issues (#29, #39) · 1 auf drei Ausgänge verteilt (Abweichungen vom
Sicherheitskonzept). Bei 14 trug die Begründung ganz oder teilweise nicht (Tabelle unten). Zwei Einträge vom 03.11. kamen während des Laufs dazu und bleiben unausgewertet offen.

**Strukturbefund:** Der Merge von #29 nach `dev` (637379e) hatte 27 Einträge der Auswertung vom
02.11. zurückgeholt; `merge=union` behielt bei Konflikten auch die gelöschten Einträge. Die 27
sind ohne neuen Ausgang entfernt (ihre Nachträge «Erledigt (#32)» bestätigen die Ausgänge
unten); `merge=union` ist entfernt (767925b), die Konfliktregel steht im Skill `tco-branching`.

**An Issues angehängt**

- 2026-11-02 — Fehlerzeilen von psql können Zeilendaten ins Protokoll tragen · Betrieb: Grenzen von Header, Protokoll und Wiederherstellung (Protokoll, Sicherung vor `wiederherstellen`) → [Kommentar in #39](https://github.com/konstantinniedermann/tco-app/issues/39#issuecomment-6598339123): `VERBOSITY terse`, weil auch DETAIL-Zeilen Werte tragen
- 2026-11-02 — MAIL_NUR_AN wird von der App nicht ausgewertet → steht in der DoD von #39; Widerspruch umleiten/verwerfen im [Kommentar in #39](https://github.com/konstantinniedermann/tco-app/issues/39#issuecomment-6598339123)
- 2026-11-02 — Login: drei kleine Abweichungen vom Sicherheitskonzept, Teil TLS → [Kommentar in #39](https://github.com/konstantinniedermann/tco-app/issues/39#issuecomment-6598339123)
- 2026-11-02 — Wechselnde IPv6-Adressen umgehen die Grenzen pro IP · Bremsen pro IP: IPv6 nicht auf /64 zusammengefasst (Dublette) → steht in der Lösungsrichtung von #39
- 2026-11-02 — Brief verweist auf eine Datenschutzerklärung, die es in der App noch nicht gibt → [Kommentar in #29](https://github.com/konstantinniedermann/tco-app/issues/29#issuecomment-6598339442)
- 2026-11-02 — Sitzung speichert `erstellt_am` ohne Zweck; Datenschutzerklärung siezt → [Kommentar in #29](https://github.com/konstantinniedermann/tco-app/issues/29#issuecomment-6598339442), Entscheid: Spalte streichen
- 2026-11-02 — Bremse vergisst Einträge erst bis zu 24 h 10 min nach dem letzten Ereignis → [Kommentar in #29](https://github.com/konstantinniedermann/tco-app/issues/29#issuecomment-6598339442)

**Mitgemacht** (Commits direkt auf `dev`)

- 2026-11-02 — Einheitstests der Betriebsskripte lassen ihre Temp-Ordner liegen → 0ddd66c; 10 133 alte Ordner in `$TMPDIR` gelöscht
- 2026-11-02 — Ein Mail-Code-Test kann mit Wahrscheinlichkeit 1 zu einer Million scheitern → cfa4579
- 2026-11-02 — Caddy schreibt INFO statt nur Fehler und Warnungen; Dependabot schliesst auch Node-Hauptversionen aus → acf2c06. **Nicht** `level WARN`: `make betrieb-nachweis` (`p7_keine_ip`) braucht die INFO-Einträge der Admin-Schnittstelle als Gegenprobe; die Doku ist auf INFO nachgeführt
- 2026-11-02 — Testdaten-Regel im Testkonzept passt nicht zur Praxis → 289ac04, Prüfung erfasst auch `musterbrief.ts`
- 2026-11-02 — Setup-Doku nennt einige Befehle, Hooks und Pfade nicht → 85be9a7
- 2026-11-02 — A-LOGIN-08 bis -10 stehen auf «geplant» → Entscheid: jetzt `umgesetzt` (afaab6e); der Test auf echten Handys bleibt ein Haken in #29
- 2026-11-02 — Login: drei kleine Abweichungen vom Sicherheitskonzept, Teil Verlängerung einmal am Tag → Halbsatz in SI-06 (afaab6e)

**Doku**

- 2026-11-02 — Digests von restic und Registry stehen ausserhalb von Dependabot → stand schon in `ci-cd-und-release.md`; ergänzt um die Schritte nach einem restic-Update (acf2c06)

**Erledigt**

- 2026-11-02 — E-Mail-Adresse ist eindeutig mit Gross-/Kleinschreibung → 24b929f (`mitglied_email_klein_unique`). Der alte Index `mitglied_email_unique` ist daneben überflüssig, aber harmlos

**Abgehakt** — mit Begründung; wo der Punkt zurückkommen kann, mit Trigger

- 2026-11-02 — Doppelte Zeile `RESTIC_REPOSITORY` → restic (Go) nimmt wie `sicherungsziel` die erste Zeile, beide stimmen überein. Trigger: restic-Update (Schritte in `ci-cd-und-release.md`)
- 2026-11-02 — Large Objects würden die Transaktion vorzeitig bestätigen → App nutzt keine. Trigger: Dateien in der Datenbank (dann `bytea`)
- 2026-11-02 — Das ausgelieferte Image ist nicht das Image aus dem Rauchtest → bewusst, im Job `image` kommentiert; Test fängt ein nicht startendes Image ab. Trigger: Actions-Minuten knapp oder ein Fehler rutscht über Test durch
- 2026-11-02 — Idee: Migrationen gegen eine Live-Sicherung proben → Trigger: erste Migration, die Daten umbaut
- 2026-11-02 — Betrieb: Grenzen …, Teil doppelte Header → bewusst (Dev ohne Caddy braucht die App-Header, auf dem Server entfernt `app_ohne_sicherheit` sie). Trigger: Änderung an einem Sicherheits-Header
- 2026-11-02 — Kleinbefunde aus den Task-Reviews der Auslieferung (#32), übrige Punkte → Image-Aufräumen zwischen Umgebungen, Reihenfolge bei zwei schnellen Pushes, nie aufgeräumte `fassungen/<digest>/`: Trigger: der erste Fehlschlag oder Platzmangel auf dem Server. `Object.hasOwn` und die 30-Tage-Zählung waren erledigt
- 2026-11-02 — `mytco:lokal` ist ein gemeinsamer Tag aller Worktrees → dazu teilen parallele `make rauchtest` Projektname und Netz (`mytco-rauch`). Trigger: schlägt erneut zu
- 2026-11-02 — Fehlversuche mit dem Brief-Code zählen erst nach der Datenbankabfrage → bei rund 50 Bit ohne Folge, als Hinweis im Kommentar in #29. Trigger: Umbau der Bremse (ADR-004 Trigger 2)
- 2026-11-02 — Prüfung `testdaten` hält Zugangsdaten in URLs für E-Mail-Adressen → nur bei Hosts mit Domain-Endung. Trigger: nächster Fehlalarm
- 2026-11-02 — Abstand vor Nebenaktionen mit `<p><br/>` · Login-Seiten zeigen nicht, dass eine Anfrage läuft → beide fehlen im Leitbild (auch «Abmelden» zeigt nichts). Trigger: nächste Arbeit am Leitbild oder die nächste Formularseite
- 2026-11-02 — Ein-Seiten-Prüfung des Briefs läuft nur in `make musterbrief` → Trigger: Briefe aus der Verwaltung
- 2026-11-02 — Die E2E-Tests brauchen 6 der 10 Code-Anfragen pro IP und Stunde → ebenso 6 von 10 bei `mailFehlerProIp`. Trigger: nächster Mail-Code-E2E
- 2026-11-02 — Beim Einlösen eines Mail-Codes wird die Sperre nicht nochmals geprüft · Login: Abweichungen, Teil SI-07 → es gibt noch keine Sperr- oder Austrittsfunktion; SI-07 verlangt beim Bau die Erhöhung der Sitzungsversion, die beide Fenster schliesst (`erstelleSitzung` prüft die Sperre auch beim Brief-Code nicht). Trigger: Bau der Sperr-Funktion
- 2026-11-02 — Login-Dienst zieht nodemailer in seinen Modulgraphen → Zyklus nur über Typen. Trigger: nächster Umbau von Login oder Mail
- 2026-11-02 — Manifest ohne `id` und ohne Symbol für Android-Masken → Trigger: PWA-Arbeit (Service Worker)

**Verworfen** — Teilpunkte des Eintrags «Kleinbefunde aus den Task-Reviews der Auslieferung (#32)»

- *Dependabot erkennt die Compose-Dateien unter `betrieb/` womöglich nicht* → `.github/dependabot.yml`, Ökosystem `docker-compose`: `directories: ['/', '/betrieb']`; der Dependabot-Lauf meldet «Updating the /betrieb directory» und prüft `caddy`, das nur in `betrieb/compose.proxy.yml` steht
- *`fassungen/.neu.*` werden nie aufgeräumt* → `betrieb/bin/ausliefern-ssh` → `ende`: `if [ -n "$TEMP_FASSUNG" ]; then rm -rf "$TEMP_FASSUNG"; fi`; liegen bleibt nur etwas nach einem harten Abbruch
- *Das Lesen der Snapshot-JSON in `sichern` hängt an der Feldreihenfolge* → `sichern` → `verwirf_lauf` sucht nur `"short_id":"…"`; reihenfolgeabhängig ist allein `lib.sh` → `snapshot_zeilen`

**Falsche Prämissen**

| Eintrag | Behauptet | Gemessen |
|---|---|---|
| Doppelte Zeile `RESTIC_REPOSITORY` | Docker/restic nutzt die letzte Zeile | Docker übergibt beide, restic (Go) nimmt die erste |
| Idee: Migration gegen Live-Sicherung | Rückfall greift, Live steht kurz | `ausliefern`: gescheiterte Migration → `scheitern`, alte App läuft weiter; `rueckfall` nur beim App-Start |
| Kleinbefunde #32 | 7 offene Punkte | 3 widerlegt (siehe oben), 2 erledigt |
| Temp-Ordner der Betriebstests | «Hunderte» | 9931 `mytco-basis-*` und 202 `mytco-tmpdir-*`; 156 je Lauf |
| Fehlerzeilen ins Protokoll | Abhilfe: `CONTEXT` kürzen | auch `DETAIL` trägt Werte; nur `VERBOSITY terse` hilft; zwei Wege (psql, pg_restore) |
| Brief-Code-Fehlversuche | Grenze «einmal» pro Fenster überschreitbar | beliebig weit, begrenzt nur durch gleichzeitige Anfragen |
| Bremse 24 h 10 min | DS-06 sagt «höchstens 24 Stunden» | die Frist für Adressen steht unter *Löschen*; DS-06 übernimmt sie |
| IPv6 umgeht Grenzen | «mit #32» beheben | #32 ist gemergt, ohne Kürzung; steht jetzt in #39 |
| Mail-Code-Sperre | Bedingung ins Verbrauchen übernehmen | reicht nicht: `erstelleSitzung` prüft die Sperre nicht, auch beim Brief-Code |
| Login: Abweichungen SI-07 | Code prüft `gesperrt` «statt» der Version | prüft beides; die Version erhöht nur `beendeAlleSitzungen` |
| `testdaten` und URLs | Fix: Treffer nach `://` ausnehmen | Treffer beginnt beim Passwort, nicht nach `://`; nur Hosts mit Domain-Endung betroffen |
| `<p><br/>` vor Nebenaktionen | «wie im Mockup» | gilt nur für «Kein Brief zur Hand?»; das Mockup hat keinen Mail-Code-Schritt |
| Setup-Doku | 3 Prüfungen fehlen in der Tabelle | 5 (auch `design-tokens`, `design-festwerte`) |
| A-LOGIN-08 bis -10 | wann `umgesetzt` gilt, ist nirgends festgelegt | Anforderungsdokument: `umgesetzt` = mit Test |

### Auswertung vom 02.11.2026 — 28 Einträge, alle gegen `dev` (abbcc70) verifiziert

Bilanz: 0 verworfen · 18 abgehakt (einer davon teilweise mitgemacht) · 3 mitgemacht · 1 Doku ·
6 an Issues (#29, #32, #40), dazu 2 Nebenbefunde mitgemacht. Kein Eintrag war gegenstandslos;
bei 8 trug die Begründung ganz oder teilweise nicht (Tabelle unten).

**An Issues angehängt**

- 2026-11-01 — Testgruppe: Handymodell in der Fragen-Tabelle, Löschzeitpunkt fehlt → DoD von [#40](https://github.com/konstantinniedermann/tco-app/issues/40)
- 2026-11-01 — «Älteres Handy» für die Testgruppe nicht definiert → DoD von [#40](https://github.com/konstantinniedermann/tco-app/issues/40)
- 2026-11-01 — E2E nutzt die gemeinsame lokale Datenbank `mytco` → Trigger erreicht (#29 schreibt Daten), [Kommentar in #29](https://github.com/konstantinniedermann/tco-app/issues/29#issuecomment-6576064971)
- 2026-11-01 — Test-ID-Prüfung zählt IDs in Kommentaren und übersprungenen Tests → [Kommentar in #29](https://github.com/konstantinniedermann/tco-app/issues/29#issuecomment-6576064971)
- 2026-11-02 — Scaleway bewahrt Versandprotokolle auf, solange die Domain aktiv ist → [Kommentar in #29](https://github.com/konstantinniedermann/tco-app/issues/29#issuecomment-6576064971); Löschen per Support-Ticket möglich, `kosten.md` nachgeführt
- 2026-11-01 — Für den Aufbau von Server und Auslieferung gibt es kein Issue → erledigt mit #32; die mitgenannte **Mindestversion** fehlt dort, [Kommentar in #32](https://github.com/konstantinniedermann/tco-app/issues/32#issuecomment-6576065403)

**Mitgemacht** (Commits auf `docs/beobachtungen-2026-11-02`)

- 2026-11-01 — Label `in-arbeit` fehlt in der Issue-Vorlage, Kleinkram in tco-branching → Vorlage, `.gitattributes`-Kommentar, Skill Schritt 4 (Prüfung und Merge getrennt) und 7 (Guard ist fail-open). Die Commit-Message von f73fd96 bleibt, wie sie ist
- 2026-10-29 — Recherche-Seiten ohne Zeichensatz-Angabe → `<meta charset>` ergänzt; kein `<!doctype html>`, weil das den Darstellungsmodus der Seite ändert. Google Fonts bleiben: Recherchen sind Momentaufnahmen (`docs/recherche/README.md`), DS-03 gilt für die App
- 2026-10-30 — Vorstandsseite nennt Hosting noch als offen → Nachtrag mit Verweis auf ADR-003
- 2026-11-01 — Kleinbefunde Code-Gerüst, Doku-Teil → README-Umbruch, Doppelungen in `context-scopes.md` (CI, auch App-Oberfläche). Der Umbruch in `ci-cd-und-release.md` war nicht nachvollziehbar
- Nebenbefund — `scripts/ci/osv_malware_gate.py` verwies auf ein pip-audit-Gate aus Munica → Docstring korrigiert
- Nebenbefund — `kosten.md` nannte die Scaleway-Datenschutzseite „nur aus Suchauszug“ → Wortlaut über `scaleway/docs-content` belegt

**Doku**

- 2026-10-31 — Fragen-Tabelle spricht von «Anmelden», das Glossar verlangt «Login» → Entscheid: Die Regel gilt für App, Brief und Doku, nicht für Texte an den Verein; Satz in `glossar.md`. K-12.1 enthielt das Wort schon nicht mehr; betroffen sind K-02.1, K-16.1, K-16.3, K-20, K-21, K-38, K-39

**Abgehakt** — mit Begründung; wo der Punkt zurückkommen kann, mit Trigger

- 2026-11-01 — adapter-node liefert `/_app/*` vor `handle` aus → betrifft alle statischen Dateien; abgedeckt durch die Caddy-Header im Design von #32
- 2026-11-01 — Image-Start und Migration ohne Rauchtest → DoD von #32
- 2026-11-01 — SPA-Build: CSP nur als Meta-Tag → Web-App bekommt die CSP als Header (siehe Prämissen). Trigger: Store-App mit Capacitor
- 2026-11-01 — Kleinbefunde Code-Gerüst, übriger Teil → ADR-Sätze beschreiben den Stand beim Entscheid (und gelten für `expo install` und Flutter sinngemäss weiter); Prüfskript-Lücken (`skip.ts`, `bauregel.ts`, `nur-doku.test.ts`) sind klein. Makefile, Dockerfile und `DATABASE_URL` (6 Stellen) ändern #29 und #32 gerade; Dockerfile ist auf dem lokalen Branch von #32 (noch nicht gepusht) bereits bereinigt. Trigger: nächste Arbeit an Makefile bzw. Prüfskripten
- 2026-11-01 — `$app/env/private` passt nicht zur Test-Datenbank pro Lauf → Trigger: Kit ändert die Umgebungsprüfung (dann auch `einstellungen.ts` aus #29)
- 2026-11-01 — Hash der Screenreader-Hinweis-Regel → Hash stimmt mit Kit 3.1.1 überein. Trigger: CSP-Fehler nach Kit-Update
- 2026-11-01 — CI: PostgreSQL-Service nur per Tag, Playwright ohne Cache → Dependabot erfasst `services:` nicht (dependabot-core#5541), Cache spart nur ca. 15 s. Trigger: Actions-Minuten knapp oder Dependabot unterstützt Workflow-Services
- 2026-11-01 — 22 bekannte Schwachstellen, kein Audit-Gate → 18 nur Entwicklung, 4 niedrig im Laufzeit-Baum; für keine gibt es ein Upgrade. Trigger: Lücke ab «moderate» im Laufzeit-Teil (`npm audit --omit=dev --audit-level=moderate`) oder ein Fix wird angeboten
- 2026-10-30 — Impressum von tcolten.ch nennt eine frühere Person → weiterhin so; Sache des Vereins. Trigger: K-06 (Datenschutzerklärung schliesst an tcolten.ch an)
- 2026-10-29 — Push-Auslöser sind nirgends festgelegt → Trigger: Planung der Etappe *CM-Betrieb* (A-ANMELDUNG-08)
- 2026-11-01 — Fachmodell kennt keinen Lizenzstatus → Trigger: Feinschliff vor *Lizenzanträge*, zusammen mit K-34. Lösung laut Fachmodell (Ausblick) als eigenes Objekt, nicht als Feld am Mitglied
- 2026-10-29 — „Mermaid rendert“ lässt sich lokal nicht nachweisen → Nachweis über den Mermaid-Chart-Validator. Trigger: arc42 (#14)
- 2026-10-29 — Doku-Check prüft keine Anker → heute 0 kaputte von 55 Anker-Links. Trigger: arc42 (#14) oder der erste kaputte Anker
- 2026-11-02 — `design-festwerte`: Fehlalarme · Leitbild ↔ Tokens: doppelte Zeilen · kein Check für `var(--…)` → alle belegt, heute ohne Folge (40 Tokens benutzt, alle definiert). Trigger: erster Fehlalarm bzw. nächste Arbeit an den Design-Prüfungen
- 2026-11-02 — Mockups zeigen Hinweis und Fehlermeldung nicht → die Login-Seiten aus #29 benutzen beide Bausteine und werden die Referenz
- 2026-10-29 — Skill tco-branching: Merge aus dem Worktree → erledigt (ff6fd08)

**Falsche Prämissen**

| Eintrag | Behauptet | Gemessen |
|---|---|---|
| SPA-Build: CSP nur als Meta-Tag | `frame-ancestors` muss als Header von #32 kommen | Der SPA-Build ist nur für Capacitor; die Web-App (adapter-node, `prerender = false`) setzt die CSP schon als Header (`kit/…/page/render.js`) |
| 22 Schwachstellen | nur Entwicklungswerkzeuge; Dependabot hält aktuell | 4 im Laufzeit-Baum; npm bietet nur Downgrades an |
| Kein Issue für Server | erledigt mit #32, „blocks #29“ | Mindestversion fehlt in #32; Kette ist #32 → #39 → #29 |
| Kleinbefunde Code-Gerüst | Docker-Prüfung „doppelt“; Dockerfile „→ #32“ | läuft viermal (`make -n check`); #32 nennt HEALTHCHECK nicht, der lokale Branch baut ihn trotzdem |
| Kleinbefunde Code-Gerüst | Ersatz-`DATABASE_URL` an 4 Stellen | 6 (auch `drizzle.config.ts`, CI doppelt) |
| Fachmodell ohne Lizenzstatus | Lösung: Status am Mitglied | Fachmodell sieht für die Lizenzliste ein eigenes Objekt vor |
| Fragen-Tabelle «Anmelden» | betrifft auch K-12.1 | K-12.1 ist umformuliert; dafür K-20, K-38, K-39 |
| Test-ID-Prüfung | zwei Wege (Kommentar, skip) | drei — auch jeder String |
| «Älteres Handy» | gehört ins Testkonzept unter *Testgruppe* | diesen Abschnitt gibt es nicht; #40 legt ihn an |
