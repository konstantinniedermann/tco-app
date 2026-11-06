[← Übersicht](index.md)

# Versionen

Versionshistorie von MyTCO, neueste zuerst. Jeder Merge nach `dev` mit Code bekommt hier
seinen eigenen Abschnitt; ein Release fasst alle Abschnitte seit dem letzten Release zusammen.
Versionsschema und Ablauf: [CI/CD und Release](ci-cd-und-release.md#versionen).

## Unveröffentlicht

- Architektur als arc42 in `docs/arc42.md`: Ziele, Kontext mit Nachbarsystemen, Lösungsstrategie,
  Bausteine, Server, Querschnittskonzepte und Risiken, mit Verweisen auf die Einzeldokumente (#14).
- Warum MyTCO ohne Anbindung an Fairgate läuft, steht jetzt als
  [ADR-006](adr/adr-006-eigenstaendig-ohne-fairgate.md) mit Optionen, Konsequenzen und
  Reevaluations-Triggern (#16).
- Warum jeder Merge nach `dev` mit Code eine eigene Versionsnummer bekommt, steht jetzt als
  [ADR-007](adr/adr-007-version-pro-merge.md).
- Schnellere Merges: Die E2E-Tests laufen in der CI als drei parallele Jobs (iPhone, Android,
  Desktop) statt nacheinander. Lokal merkt sich ein grünes `make check` den geprüften Stand;
  der Pre-Push-Hook prüft ihn nicht noch einmal voll, wenn seither nur Doku und die
  Versionsnummer dazukamen (`gruener-stand.ts`).

## 0.5.1 — Versionsnummer bei jedem Merge

- Versionsnummern: Jeder Merge nach `dev` mit Code bekommt eine eigene Korrekturnummer, im
  Merge-Commit selbst; grössere Schritte eine Nebenversion, die Hauptversion nur im Auftrag des
  Projektleiters. Das Release erhöht nicht mehr selbst, sein Text auf GitHub fasst alle
  Abschnitte seit dem letzten Release zusammen. Der Pre-Push-Hook weist einen Push auf `dev`
  ohne passende Nummer ab (`version-merge.ts`).

## 0.5.0 — Anlässe, eigene Angaben und ruhiges App-Gefühl, nicht ausgeliefert

Noch kein Server, die Auslieferung ist ausgeschaltet: ohne Tag und ohne Checkliste auf Test
([Versionen](ci-cd-und-release.md#versionen)). Doku-Abgleich vor dem Release: ein Befund auf
hoch behoben (die Datenschutzerklärung, die die App einbaut, zählte in der CI als reine Doku
und wäre bei einer reinen Textänderung nie ausgeliefert worden); die Erklärung präzisiert
(Grenze der Code-Mails, Gerätespeicher beim E-Mail-Wechsel); die Release-Checkliste verlangt
vor dem ersten Live-Release mit Mitgliedern die versprochenen Löschfristen und den Hinweis an
die alte Adresse; Kleinigkeiten behoben, der Rest als Beobachtung eingetragen.

- Anlässe ([#52](https://github.com/konstantinniedermann/tco-app/issues/52), A-ANLASS-01, als
  Vorschlag für den Vorstand, K-50): Der Admin erstellt in der Verwaltung einen Anlass, z. B. die
  Generalversammlung; er erscheint bei allen Mitgliedern unter «Jetzt aktuell». Mitglieder melden
  sich an oder ab (mit freiwilliger Bemerkung), bis zum Anmeldeschluss änderbar, und speichern den
  Termin über «In den Kalender». Ändert der Admin Datum oder Ort, bittet MyTCO um eine Prüfung der
  Antwort (FR-27 bis FR-32). Die Kalenderdatei ist ohne Login über einen nicht erratbaren Link
  abrufbar (SI-19). Datenschutzkonzept, -erklärung, Fachmodell, Rollen und Rechte, Leitbild
  (Auswahlfläche, mehrzeiliges Feld, Kennzahl) nachgeführt; `make seed` legt eine Beispiel-GV an.
- Handy im WLAN: `make dev-handy` startet den Entwicklungsserver für ein Handy im selben WLAN
  (Login per Code, ohne Passkey); ein E2E-Test belegt, dass der Produktions-Build das
  Login-Cookie weiterhin nur über HTTPS schickt (SI-06). Feste Namen `mytco-admin.local` und
  `mytco-mitglied.local` für zwei Verknüpfungen mit getrenntem Login, Links auf die Mails der
  beiden Personas in Mailpit; `make seed` gibt Brief-Codes für Erika (Admin) und Kurt (Mitglied) aus. Datenbank und
  Mailpit lokal nur noch auf dem Laptop erreichbar.
- Datenschutzerklärung in der App (DS-09): Seite «Datenschutz» ohne Login, Link in der Fusszeile,
  Text direkt aus `docs/datenschutzerklaerung.md` (als Entwurf markiert, Freigabe K-06.2 offen).
- Kopfleiste und Reiter reichen auf dem iPhone unter Status- und Home-Balken, die Kopfleiste bleibt
  beim Scrollen oben stehen, seitliche Abstände fürs Querformat. Gegen den Schleier von iOS 26
  oben in der App vom Startbildschirm ein festes, deckendes Statusleisten-Band; ohne
  `black-translucent`, das den Schutz abschaltete. In der App vom Startbildschirm grüner
  Seitenhintergrund, damit beim Scrollen kein heller Schleier bleibt. Am iPhone bestätigt;
  bestehende Verknüpfungen müssen einmal neu auf den Home-Bildschirm.
- Anleitung zum Startbildschirm (iPhone): deutlicher Hinweis für die Safari-Tablayouts «Unten» und
  «Oben» (dort gleich auf «Teilen», weiter bei Schritt 3), im Brief «••• (falls da)». Die
  Animation zeigt weiterhin nur das Vorgabe-Layout «Kompakt» (Entscheid Projektleiter).
- Ruhiges App-Gefühl (#54): Der angetippte Reiter ist sofort aktiv, sein Balken gleitet hinüber,
  der Inhalt blendet über; Unterseiten schieben sich von rechts herein und mit «‹ Zurück»
  wieder hinaus. Kopfleiste und Reiter stehen fest, nur der Inhalt scrollt; ein Tipp auf einen
  Reiter wirkt auch, während der Inhalt nachläuft. Jeder Reiter beginnt oben. Im Profil sind die
  Aufklappbereiche anfangs zu und bleiben offen, was man offen lässt. Mit offener Tastatur sind
  die Reiter weg, die Eingabetaste springt mit «Weiter» ins nächste Feld.
  Aufklappbereiche und Rückfrage öffnen weich. Kein grauer Tipp-Blitz, Gedrückt-Zustände,
  Bedienelemente nicht markierbar, kein Zoom per Doppeltipp, immer hell. Bei «Bewegung
  reduzieren» alles ohne Bewegung (UI-09 erweitert, neue Bewegungs-Tokens). Die Fusszeile steht
  nur noch vor dem Login und auf der Startseite.
- Eigene Angaben ändern (#50, Annahmen K-19.1 und K-19.2): Im Profil unter «Meine Angaben»
  ändert das Mitglied Telefon, Adresse und Lizenznummer selbst; die E-Mail auf einer eigenen
  Seite mit je einem Code an die bisherige und die neue Adresse (SI-09, Grenzen pro Konto,
  Adresse und IP). Neu in der Verwaltung die Liste «Für Fairgate»: selbst geänderte
  Kontaktangaben zum Übertragen nach Fairgate, abhaken mit Eintrag im Änderungsverlauf. Hilfe
  um «Eigene Angaben ändern» ergänzt.

## 0.4.0 — Hilfe beim Start, Mitgliederverwaltung und Passkey, nicht ausgeliefert

Noch kein Server, die Auslieferung ist ausgeschaltet: ohne Tag und ohne Checkliste auf Test
([Versionen](ci-cd-und-release.md#versionen)). Doku-Abgleich vor dem Release: zwei Befunde auf
hoch behoben (Befehl für den ersten Admin auf Live, Türsteher nach einem Umzug des Repos neu
einspielen), Kleinigkeiten behoben, der Rest als Beobachtung eingetragen (u. a. gescheiterte
Migration beim Ausliefern, Ort des Eintrags «Verwaltung»).

- Betrieb und Übergabe (#10): neue Seite [Betrieb und Übergabe](betrieb-und-uebergabe.md) mit
  Konten und Eigentum, Geheimnissen (was ausserhalb des Servers liegen muss), Grundsätzen für
  Sicherung und Überwachung und Übergabe-Checkliste; Sicherungsablage als Vorschlag; neue Frage
  K-49 (Ablage der Geheimnisse). Dazu die [Recherche tcolten.ch](recherche/2026-11-04-tcolten-website.md)
  (Anbieter und Domain, Statuten) mit Stand-Vermerken in den Abklärungen.
- Hilfe beim Start (#47, A-HILFE-01, -02): im Handy-Browser zeigt eine Einstiegsseite zuerst die
  Anleitung zum Startbildschirm als Animation (iPhone, Android mit Taste «MyTCO installieren»),
  danach den Login; Seite Hilfe ohne Login, Link «Hilfe» in der Fusszeile; Baustein Anleitung
  und Regel UI-09 im UI-Leitbild; Kurzanleitung im Brief auf die aktuellen Beschriftungen von
  iPhone und Android gebracht.
- Testgruppe vorbereitet (#40): neue Seite [Testgruppe](testgruppe.md) mit Ablauf, Aufträgen,
  Texten für Mail und Chat und Formularfragen; neue Etappe *Pilot* mit Vorabversion 0.x auf
  Live vor 1.0.0; neue Anforderungen zur Hilfe beim Start (A-HILFE-01, -02); Datenschutzkonzept
  um die Testgruppe ergänzt; K-20.1 vom Projektleiter beantwortet.
- Mitgliederverwaltung für Admins, Etappe 1 von #43 (A-MITGLIED-01, -02, -06, A-ROLLE-01, -02,
  SI-08): Bestätigung mit Mail-Code (24 Stunden), Mitglieder anlegen, suchen und bearbeiten, Rollen
  vergeben (der letzte Admin bleibt), alle Sitzungen eines Mitglieds beenden, Änderungsverlauf ohne Werte (die letzten 50, auf der Seite
  Änderungsverlauf die letzten 100), erster Admin per Befehl `admin-festlegen`. Der Hinweis an die alte E-Mail-Adresse bei einer Änderung durch den Admin fehlt noch
  (kommt mit FR-25, SI-09). Neuer Brief-Code und Brief-Serie folgen mit
  Etappe 2, Austritt (Login gesperrt), Löschen und Export mit Etappe 3.
- Nacharbeit zu #43 vor Etappe 2: Speichern zweier Admins am selben Mitglied überschreibt nichts
  mehr still (Meldung, «Neuen Stand laden»); Fehlerseite mit Rahmen und Weg zurück, auch in der
  Verwaltung; Mitgliedernummer eindeutig ohne Rücksicht auf Gross-/Kleinschreibung (Migration
  `0005`); unsichtbare Sonderzeichen in Name, Strasse und Ort abgelehnt; Kurzinfo «die letzten
  50 Einträge», wenn der Verlauf gekürzt ist; Bauregel prüft die Admin-Routen genauer.
- CI: Der Browser-Download für die E2E-Tests bricht nach 5 Minuten ab und versucht es bis zu
  dreimal, statt bis zum Job-Limit von 20 Minuten zu hängen.
- Freiwilliger Passkey als zweiter Login-Weg (#44, A-LOGIN-07, [ADR-005](adr/adr-005-passkey-simplewebauthn.md)):
  Hinweis nach dem Code-Login, Login in zwei Karten, neue Seite *Profil* mit den Passkeys,
  Reiter *Start* und *Profil*. Neue Pakete `@simplewebauthn/server` und `/browser`. Nachweis mit
  virtuellem Authenticator in Chrome; Prüfung auf echten Geräten offen bis #39.
- Antworten des Vorstands vom 03.11.2026 übertragen: neue Termine der Etappen, Junioren ab der
  CM 2027, Passkey freiwillig als Komfort ab *Mitglieder-Login*, Einlesen der Mitgliederliste geplant,
  Kosten für 300–500 Mitglieder.
- Vorschläge an den Verein: Eltern führen das Konto ihres Kindes bis zu einer Altersgrenze (K-08),
  ausgetretene Mitglieder bleiben eine Frist lang inaktiv (K-38).

## 0.3.0 — Test-Umgebung und Absicherungen, nicht ausgeliefert

Noch kein Server, die Auslieferung ist ausgeschaltet: ohne Tag und ohne Checkliste auf Test
([Versionen](ci-cd-und-release.md#versionen)). Doku-Abgleich vor dem Release: keine Befunde
auf hoch; Kleinigkeiten behoben, drei Beobachtungen eingetragen (u. a. fehlende Seite
`/datenschutz`, nötig vor dem Versand echter Briefe).

- Test ohne Server (#39, Teil ohne Server, lokal nachgewiesen): `MAIL_NUR_AN` leitet alle Mails
  um (Empfänger im Betreff) und sperrt Auslieferung und Rückfall auf Live; Mail-Versand in
  Produktion nur mit TLS; Testdaten auf Test mit Brief-Code per umgeleiteter Mail; Rate-Limits
  zählen IPv6 je /64; `wiederherstellen` sichert vorher, mit Notschalter `ohne-sicherung`, das
  Protokoll enthält keine Datenbankwerte.
- Doku-Abgleich vor jedem Release dev → main (aus Munica übernommen): Doku-Audit gegen Code
  und Konfiguration, Issue-Nummern gegen die echten Titel, dazu `make release-check` für
  Version, Versionen und Tags in beide Richtungen; Ablauf im Skill `tco-branching`.

## 0.2.0 — Login und Auslieferung, nicht ausgeliefert

Noch kein Server, die Auslieferung ist ausgeschaltet: ohne Tag und ohne Checkliste auf Test
([Versionen](ci-cd-und-release.md#versionen)).

- Login per Einmal-Code (#29, lokal, noch nicht ausgeliefert): Brief-Code und Mail-Code,
  Sitzung ein Jahr gleitend in einer Tabelle, Abmelden und Widerruf, Bremsen gegen
  Durchprobieren; Code-Mails lokal und in der CI über Mailpit. Begründung in ADR-004;
  Fachmodell (FR-24 umgesetzt), Sicherheits- und Datenschutzkonzept nachgeführt.
- Web-App-Manifest, damit MyTCO vom Startbildschirm als eigene App startet (noch ohne
  Service Worker).
- Musterbrief mit QR-Code, Brief-Code und Anleitung als PDF aus erfundenen Daten
  (`make musterbrief`); `make seed` legt erfundene Mitglieder an und gibt einen Brief-Code aus.
- Umgebungen, Auslieferung und Sicherung (#32, lokal nachgewiesen mit `make betrieb-nachweis`):
  Test und Live als getrennte Stapel hinter einem Caddy-Proxy, Auslieferung per SSH über einen
  Türsteher mit Rückfall und Vorab-Sicherung bei Live, Live nur mit dem Image, das auf Test lief,
  verschlüsselte Sicherung mit Wiederherstellung und Probe. CI-Jobs dafür hinter zwei Schaltern
  (ausgeschaltet), Rauchtest des Images und Rechteprüfung der Workflows aktiv. Server und
  Inbetriebnahme: #39.
- UI-Leitbild (`docs/ui-leitbild.md`, #13): Corporate Design mit Design-Tokens, Bausteinen,
  Navigation, Du-Form und Barrierefreiheit `UI-NN`; Prüfungen gegen Abweichung zwischen
  Leitbild und Tokens und gegen Farb- und px-Werte im Code; Kopfleiste mit Wappen und
  App-Symbol (Annahmen K-13, K-13.2); Schrift folgt der Systemeinstellung des Geräts; Mockups.
- Kosten (`docs/kosten.md`, #9): laufend ca. CHF 95–175 pro Jahr (VPS, Sicherungsablage,
  E-Mail über Scaleway), einmalig nur der Druck des Login-Briefs (Porto entfällt, der Brief
  geht mit dem Versand der Vereinsdokumente mit); Szenarien für 100, 200 und 300 Mitglieder,
  Store-App und SMS nur als «falls»; jährliche Überprüfung vor dem Vereinsbudget;
  Freigabe offen (K-03).

## 0.1.0 — Code-Gerüst, nicht ausgeliefert

- SvelteKit 3 mit TypeScript 6, Runes und PostgreSQL (Drizzle, leere Start-Migration);
  Server-Code nur in `+server.ts` und `src/lib/server/`, Bauregel per Prüfskript.
- Tests: Vitest (Einheit und Datenbank, Abdeckung mindestens 90 % auf `src/lib/server`),
  Playwright mit axe; Prüfungen für Test-IDs, Testdaten und übersprungene Tests.
- `make check` und Git-Hooks (`make check-schnell` vor dem Commit, `make check` vor dem Push).
- CI: Doku-Check immer, Code-Jobs nur bei Codeänderungen (Prüfen, Ende-zu-Ende, Image,
  Malware-Prüfung); Dependabot für npm, Docker und Actions.
- Dockerfile und `docker-compose.yml` für die lokale Datenbank; Svelte-MCP-Server in `.mcp.json`.
- CSP nur mit `'self'` (eine Ausnahme für den Screenreader-Hinweis von SvelteKit).

## Doku-Stände vor 0.1.0

Ohne Versionsnummer.

- Repo aufgesetzt: Arbeitsweise, Issue-Konventionen, Roadmap, Doku-Check und Secret-Scan
  in der CI, Anforderungsdokument v1.2 und Recherche zur Systemlandschaft abgelegt.
- Anforderungen mit IDs erfasst (`docs/anforderungen/anforderungen.md`), funktional und
  nicht-funktional, je mit Quelle, Etappe und Status; neue offene Fragen an den Verein.
- Glossar der Fachbegriffe (`docs/glossar.md`) mit Sprachregeln für MyTCO und Belegen aus
  dem Advantage-Handbuch von Swiss Tennis.
- Setup gehärtet nach Review: versionierte Git-Hooks (Secret-Scan bricht ohne gitleaks ab,
  kein direkter Push auf `main`), Secret-Scan auch bei PRs, Zeitlimit für CI-Jobs.
- Parallele Sessions: Hauptordner bleibt auf `dev`, jede Session arbeitet in einem Worktree
  unter `.claude/worktrees/`; Ablauf im Skill `tco-branching`.
- ADR-001: MyTCO startet als installierbare Web-App (PWA) mit Admin-Bereich und Web Push,
  E-Mail als Grundlage; Store-App per Capacitor, sobald ein Reevaluations-Trigger greift.
- Entscheidungsgrundlage für den Vorstand zu den App-Varianten mit Budget über fünf Jahre
  (`docs/recherche/2026-10-29-app-varianten-vorstand.html`).
- Abklärungen beim Verein (`docs/abklaerungen.md`): alle offenen Fragen an Vorstand,
  Website-Betreuer, Hoster und Verantwortliche mit ID und Fälligkeit; Regel dazu in den Issue-Konventionen
  und der Issue-Vorlage.
- Datenschutzkonzept nach nDSG (`docs/datenschutz.md`), bewusst knapp gehalten: welche
  Daten, wer sieht was, Löschen, Junioren, Vorgaben `DS-01` bis `DS-10` für Technik und
  Hosting (Daten in der Schweiz oder EU/EWR); Entwurf der
  Datenschutzerklärung (`docs/datenschutzerklaerung.md`). Jedes Issue prüft im neuen
  Abschnitt *Datenschutz* der Issue-Vorlage, ob das Konzept angepasst werden muss.
- Fachmodell (`docs/fachmodell.md`): Objekte von Mitglied und Konto über Clubmeisterschaft
  (Kategorie, Anmeldung als Einzel oder Doppel, Gruppe, KO-Tableau, Spiel, Resultat Satz für
  Satz) bis Lizenzantrag mit Stichtag; Fachregeln `FR-01` bis `FR-23` mit Anforderungs-IDs,
  Annahmen zu offenen Fragen markiert. Junioren vorerst ausgeklammert, Datenschutzkonzept
  entsprechend angeglichen.
- Rollen und Rechte (`docs/rollen-und-rechte.md`): Mitglied, Admin, CM-Verantwortlicher und
  Lizenzverantwortlicher, kombinierbar; Admin vertritt beide Verantwortlichen. Grundsätze
  `RR-01` bis `RR-08` und Matrix Rolle × Daten bis zur Etappe *Lizenzanträge*. CM-Aufgaben in
  Fachmodell und Anforderungen vom Admin zum CM-Verantwortlichen verschoben; Kontaktdaten
  für die Verantwortlichen im Datenschutzkonzept ergänzt (K-42).
- ADR-002: MyTCO wird in TypeScript mit SvelteKit gebaut, Daten in PostgreSQL (Drizzle,
  pg-boss); Bauregel „Server liefert Daten“ für die spätere Store-App, CI-Vorgaben gegen
  veralteten KI-Code. ADR-003: eigener Server bei Infomaniak in der Schweiz, E-Mail-Versand
  je nach K-11 über Metanet oder Scaleway.
- Abklärungen: Fragen gehen über eine Google-Tabelle an den Verein (ein Blatt pro Adressat,
  Auswahl plus Freitext, Priorität 1–3, Teilfragen `K-NN.x`, Blatt *Beantwortet* als
  Historie); Ablauf in `docs/abklaerungen.md`. Neue Fragen K-43 (bestehende Dienste und
  Kosten), K-44 (Code der Website) und K-45 (Export aus Fairgate); erste Antworten zu K-15, K-16, K-25, K-31, K-42
  in Anforderungen, Datenschutz, Fachmodell und Glossar übernommen. *Fundament* neu bis
  26.11.2026.
- Login ohne Passwort (#29): ein Brief mit QR-Code und Einmal-Code, kein Passwortwechsel,
  eingeloggt bleiben bis ein Jahr ohne Nutzung, neuer Code per E-Mail. Nachgeführt in
  Anforderungen (A-LOGIN-01/02/08, neu 09–11), Glossar, Fachmodell (FR-24), Rollen und
  Rechte, Roadmap, Abklärungen, Datenschutzkonzept und Datenschutzerklärung.
- Testkonzept (`docs/testkonzept.md`, #11): Fachlogik mit Vitest ohne Datenbank, Rechte
  pro Schnittstelle gegen echte PostgreSQL, mindestens 90 % Abdeckung; Ende-zu-Ende mit Playwright in Safari-Engine,
  Chrome und Desktop, mit Barrierefreiheits-Prüfung und Screenshots als Nachweis. Jeder Test
  nennt seine ID, die CI prüft Fachregeln, Grundsätze `RR-NN` und umgesetzte Anforderungen
  auf Tests. Nur erfundene Testdaten (`@example.org`), Checkliste auf echten Handys vor jedem
  Release. Neuer Anforderungs-Status `umgesetzt`.
- CI/CD und Release (`docs/ci-cd-und-release.md`, #12): Test-Umgebung (`test.my.tcolten.ch`,
  nur erfundene Daten) und Live auf demselben Server; Merge nach `dev` liefert auf Test aus,
  Merge nach `main` live, mit Sicherung, Statusprüfung und automatischem Rückfall. Liste der
  CI-Prüfungen für das Code-Gerüst, Versionen ab `1.0.0` mit dem Login-Release, alte
  App-Versionen laden neu, Actions-Minuten im Blick. K-10 um die Testadresse ergänzt.
- CI/CD nachgeschärft: auf GitHub nur noch Merge-Commit; ohne GitHub Pro bleibt die
  Live-Auslieferung automatisch, der Live-Schlüssel nur im Auslieferungs-Job; Server und
  Auslieferung als eigenes Issue (#32).
- Sicherheitskonzept (`docs/sicherheitskonzept.md`, #6): Bedrohungen mit Massnahmen,
  Login-Ablauf mit Werten für Brief- und Mail-Code, Vorgaben `SI-01` bis `SI-16`,
  Restrisiken. Admin-Oberfläche mit frischem Mail-Code statt Zwei-Faktor-App (Vorschlag
  K-12), E-Mail-Adresse je Mitglied eindeutig (FR-25), neuer Änderungsverlauf für Admins
  (FR-26, A-MITGLIED-06); Datenschutzkonzept, -erklärung, Rollen und Rechte, Glossar und
  CI/CD (Restrisiko ohne GitHub Pro angenommen) nachgeführt.
- Änderung der E-Mail-Adresse braucht je einen Code an die alte und die neue Adresse; ist die
  alte nicht erreichbar, ändert der Admin nach Rückfrage (SI-09, FR-25). Kein SMS-Code.
- Abgleich mit dem Anforderungsdokument v1.2: neue Fragen an den Verein zu Junioren an der
  Clubmeisterschaft 2027 (K-46) und zu einer Beispieldatei aus Advantage (K-47).
