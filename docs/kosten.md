[← Übersicht](index.md)

# Kosten

Was MyTCO den Verein kostet, mit der Technik aus [ADR-001](adr/adr-001-web-app-zuerst.md)
und [ADR-003](adr/adr-003-hosting-infomaniak-vps.md). Den Rahmen gibt N-KOSTEN-01 vor:
laufend im niedrigen dreistelligen Bereich pro Jahr. Der Vorstand hat bis CHF 500 pro Jahr
bewilligt, auch für die teuerste Variante (K-03.1). Die Kosten trägt der Verein; einzig
GitHub läuft auf dem Privatkonto des Projektleiters (siehe unten).

**Freigabe und Zahlung:** Einzelne Ausgaben gibt der Gesamtvorstand frei, die Anfrage geht
über die Hauptansprechperson (K-03.2). Im ersten Jahr bis zur Einrichtung zahlt der
Projektleiter, der Verein erstattet; alle Belege gehen an die Hauptansprechperson. Danach
klärt der Projektleiter mit der Finanzverantwortlichen einen anderen Weg (K-03.3).

**Legende:** **B·n** = belegt mit Quelle n · **S** = Schätzung · **V** = Vermutung.
Beträge in CHF inkl. MwSt 8.1 %, wo nicht anders vermerkt; 1 EUR ≈ 0.94 CHF,
1 USD ≈ 0.80 CHF (S, wie ADR-003). Preise Stand 02. bis 12.11.2026, Mitgliederzahl 03.11.2026.

## Bisher bezahlt

Was tatsächlich angefallen ist. Der Projektleiter streckt die Beträge vor, der Verein erstattet
(K-03.3); die Belege gehen an die Hauptansprechperson.

| Datum | Posten | Zeitraum | CHF inkl. MwSt | Status |
|-------|--------|----------|---------------:|--------|
| 18.11.2026 | Server: Infomaniak VPS Lite, 2 vCPU / 4 GB / 60 GB, bestellt für Test und Live (#39) | 18.11.2026–17.11.2027 | 93.40 | Rechnung von Infomaniak, Erstattung offen |
| ab 18.11.2026 | Sicherungsablage: Infomaniak Object Storage, nach Verbrauch | bis 28.02.2027 | 0 | läuft über das Startguthaben von Infomaniak (CHF 300, gültig bis 28.02.2027); danach Abrechnung nach Verbrauch |
| | **Total bisher** | | **93.40** | |

## Laufende Kosten

Die Mitgliederzahl ändert diese Kosten kaum, weil Server und Sicherung pauschal kosten. Der
**Best Case** rechnet mit den gewählten Diensten, der **Worst Case** damit, dass bei jedem Posten
die teurere Lösung nötig wird. Dieselben Zahlen standen in der Kostenschätzung für die
Vorstandssitzung vom 16.11.2026 (B·12).

| Posten | Best Case CHF/Jahr | Worst Case CHF/Jahr | Status |
|--------|-------------------:|--------------------:|--------|
| Server: Infomaniak VPS Lite | 93 (2 vCPU / 4 GB, CHF 7.20/Monat exkl. MwSt bei 12 Monaten, B·1; bezahlt 93.40, siehe oben) | 117 (nächste Stufe 4 vCPU / 4 GB, CHF 9.00/Monat, B·12) | belegt |
| Sicherungsablage in der Schweiz | unter 1 (Infomaniak Object Storage nach Verbrauch, CHF 0.000016 pro GB und Stunde, ca. CHF 0.14 pro GB und Jahr, Produktseite vom 18.11.2026, [Betrieb und Übergabe](betrieb-und-uebergabe.md#sicherung); Sicherungen unter 1 GB, S) | 78 (Infomaniak Swiss Backup, 1 TB plus 1 Gerät, CHF 4.18 + 1.84 pro Monat exkl. MwSt, B·3) | Best Case gewählt; bis 28.02.2027 über das Startguthaben |
| E-Mail-Versand und Absender `mytco@tcolten.ch` | ca. 3 (Scaleway (EU), 300 Mails/Monat gratis, danach EUR 0.25 pro 1000, B·4; Mengen siehe [Szenarien](#szenarien)) | ca. 80 (eigenes Postfach, z. B. Metanet Business Mail CHF 5.90/Monat, B·7) | belegt, Menge geschätzt |
| Code-Ablage und CI: GitHub | 0 (Gratisplan auf dem Privatkonto des Projektleiters; das Repo ist öffentlich, Actions-Minuten sind dafür gratis und ohne Kontingent, [CI/CD und Release](ci-cd-und-release.md#actions-minuten)) | ca. 40 (GitHub Pro, USD 4/Monat, falls das Repo nicht mehr öffentlich sein soll, B·12) | belegt; siehe Hinweis unten |
| Überwachung: meldet, wenn MyTCO nicht erreichbar ist oder eine Sicherung ausbleibt | 0 (Gratisstufe, z. B. Healthchecks.io, B·12) | ca. 50 (bezahlte Stufe, USD 5/Monat, B·12) | noch nicht eingerichtet (#39) |
| Passwort-Tresor für Zugänge und Notfall-Codes (K-49) | 0 (gratis für 2 Personen, z. B. Bitwarden, B·12) | ca. 35 (bezahlter Plan, USD 40/Jahr, B·12) | hängt an K-49 |
| Datenbank (PostgreSQL) und Test-Umgebung | 0 | 0 | belegt: Container auf demselben VPS ([ADR-002](adr/adr-002-sveltekit-postgresql.md), [CI/CD und Release](ci-cd-und-release.md)) |
| Domain: Subdomain `my.tcolten.ch` | 0 | 0 | erlaubt (K-10): MyTCO läuft auf einer Subdomain der bestehenden Domain, keine eigene Domain |
| Push-Benachrichtigungen (Web Push) | 0 | 0 | belegt: Push-Dienste der Browser, ohne Konto (B·5) |
| **Total laufend** | **ca. 100** | **ca. 400** | Schätzung |

**GitHub Pro:** Mit Pro rechnet GitHub die Actions nicht als freie Minuten ab, sondern über ein
Guthaben (USD 18 pro Monat). Laufen die Tests im heutigen Umfang weiter, kämen ca. CHF 140 pro
Jahr dazu (S, B·12). Das betrifft nur ein nicht öffentliches Repo; das Guthaben-Modell ist
seit dem 12.11.2026 nicht nachgeprüft.

Die Sicherungsablage ist Object Storage, festgelegt am 18.11.2026 ([Betrieb und Übergabe](betrieb-und-uebergabe.md#sicherung)). Scaleway hat einen
Vertrag zur Auftragsbearbeitung und verarbeitet E-Mails nur in Frankreich (B·6), damit sind
DS-01 und DS-02 erfüllt. Den Inhalt einer Mail löscht Scaleway nach dem Versand, die
Versandprotokolle mit Empfängeradresse bleiben aber, solange die Absender-Domain aktiv ist;
eine Verkürzung ist für 2027 angekündigt (B·6). Löschen lassen sich einzelne Einträge nur per
Support-Ticket. Ob das zu den Löschfristen im [Datenschutzkonzept](datenschutz.md#löschen)
passt, ist offen; Hinweis dazu in
[#29](https://github.com/konstantinniedermann/tco-app/issues/29) (Wahl des Mailwegs). Scaleway stellt keine
Schweizer MwSt in Rechnung (V).

**Künftig eventuell wenige Franken pro Jahr:** GitHub und der E-Mail-Versand kosten heute
nichts. Die Actions-Minuten sind gratis, solange das Repo öffentlich ist
([Actions-Minuten](ci-cd-und-release.md#actions-minuten)).
Bei Scaleway fallen ohne Gratiskontingent bei 500 Mitgliedern ca. CHF 4 pro Jahr an (S).
Reicht ein Kontingent nicht mehr, entstehen Kosten von wenigen Franken pro Jahr (S).

Vorschlag K-11.2: MyTCO verschickt seine E-Mails über Scaleway, mit Absender
`mytco@tcolten.ch` (K-11). Über ein Postfach bei Metanet versendet MyTCO nicht, weil es dort
keinen Vertrag zur Auftragsbearbeitung gibt (K-09.7, Entscheid Projektleiter). ADR-003 gibt
einem Postfach @tcolten.ch Vorrang; möglich ist das erst nach dem Umzug der Website, dann bei
Infomaniak (K-48). Ein eigenes Postfach ist im Worst Case mit dem Vergleichspreis von Metanet
gerechnet; mit dem Website-Umzug kostet es weniger (siehe [Mit Website-Umzug](#mit-website-umzug)).

## Einmalige Kosten

| Posten | Wann | CHF | Status |
|--------|------|----:|--------|
| Druck des Login-Briefs, ein Blatt pro Mitglied | Startjahr | ca. 0.05–0.10 pro Brief (S) | Schätzung |
| Porto für den Login-Brief | Startjahr | 0 Mehrkosten | Der Brief geht mit dem bestehenden Versand der Vereinsdokumente mit (Projektleiter, 02.11.2026) |

Annahme K-16.1: Der Verein druckt den Login-Brief selbst und legt ihn dem Versand der
Vereinsdokumente bei.

Zum Vergleich, falls der Brief einzeln verschickt würde: B-Post CHF 1.10, A-Post CHF 1.40
pro Standardbrief bis 50 g, gültig ab 01.01.2027 (B·8). Vermutung: Das zusätzliche Blatt
hebt den gemeinsamen Versand nicht über 50 g. Sonst kostet er als Midibrief mehr
(B-Post CHF 1.35, B·8).

Die Folgejahre sind ohne Briefkosten gerechnet (Vorgabe des Projektleiters). Wer ausgeloggt
ist, erhält einen neuen Code per E-Mail (A-LOGIN-10). Neumitglieder erhalten ebenfalls einen
Brief (A-LOGIN-01); geht er nicht mit dem Vereinsversand mit, kostet er einzeln
CHF 1.10–1.40 Porto plus Druck.

## Nur falls

| Posten | Falls | CHF | Status |
|--------|-------|----:|--------|
| Eigene Domain | MyTCO darf nicht unter `my.tcolten.ch` laufen (K-10 hat es erlaubt) | ca. 10–20 pro Jahr (S, B·12) | Schätzung |
| Apple Developer Program | Store-App ([ADR-001](adr/adr-001-web-app-zuerst.md)) | ca. 80 pro Jahr (USD 99, B·9, ohne MwSt umgerechnet); 0 mit Gebührenerlass für Non-Profits (B·10), ob der TCO berechtigt ist: offen | belegt |
| Google Play Console | Store-App | ca. 20 einmalig (USD 25, B·11, ohne MwSt umgerechnet) | belegt |
| SMS | SMS als Kanal (hängt an K-37) | ca. 0.05–0.10 pro Nachricht | Schätzung aus der [Recherche Systemlandschaft](recherche/README.md) |

## Szenarien

Der Verein hat 300 bis 500 Mitglieder (K-17.2). Gerechnet sind drei Grössen. Mail-Menge:
ca. 3 Mails pro Mitglied und Monat für Mitteilungen, Bestätigungen und Login-Codes (S).

| | 300 Mitglieder | 400 Mitglieder | 500 Mitglieder |
|-|---------------:|---------------:|---------------:|
| Mails pro Monat (S) | ca. 900 | ca. 1200 | ca. 1500 |
| E-Mail-Versand Scaleway pro Jahr | ca. 2 | ca. 3 | ca. 3 |
| Laufend pro Jahr | ca. 100–400 | ca. 100–400 | ca. 100–400 |
| Druck Login-Brief, Startjahr | ca. 15–30 | ca. 20–40 | ca. 25–50 |
| **Total Startjahr** | **ca. 115–430** | **ca. 120–440** | **ca. 125–450** |
| **Total Folgejahre** | **ca. 100–400** | **ca. 100–400** | **ca. 100–400** |
| Porto, falls einzeln verschickt (B- bis A-Post) | 330–420 | 440–560 | 550–700 |

Die untere Grenze ist der Best Case, die obere der Worst Case. Monate mit
Clubmeisterschaft können ein Mehrfaches an Mails bringen. Selbst das Dreifache in diesen
Monaten bleibt unter CHF 10 pro Jahr (S).

## Mit Website-Umzug

Der Umzug von tcolten.ch zu Infomaniak ist bewilligt (K-48). Zieht die Website auf den
MyTCO-Server, getrennt von MyTCO, rechnet sich das so (S, B·12):

| | CHF/Jahr |
|-|---------:|
| Webhosting bei Metanet entfällt (Listenpreise CHF 12.90–24.90 pro Monat; welches Paket der Verein hat, ist offen, K-09.1) | − ca. 155–300 |
| Grössere Serverstufe für Website und MyTCO (CHF 9.00 statt 7.20 pro Monat) | + 24 |
| E-Mail-Postfächer @tcolten.ch zu Infomaniak Mail Service (ab CHF 2.29 pro Monat) | + ca. 30 |
| **Ersparnis für den Verein** | **ca. 100–245** |

MyTCO und Website kosten dann zusammen ca. CHF 150 pro Jahr, gleich viel oder weniger, als der
Verein heute für die Website allein zahlt. Ob die Website auf den MyTCO-Server oder getrennt zu
Infomaniak zieht, ist offen (siehe [Offene Fragen](#offene-fragen)).

## Vergleich

Sollte Fairgate den Mitglieder-Teil abdecken, müsste der Verein Intranet und Kurs- und
Eventmodul Lite dazubuchen: ca. CHF 280–400 pro Jahr, dazu ca. 280–400 einmalig (S, aus der
[Recherche Systemlandschaft](recherche/README.md), Stand 29.10.2026). MyTCO bleibt im Best Case
mit ca. 100 pro Jahr deutlich darunter und erreicht erst im Worst Case denselben Betrag, ohne
die einmaligen Kosten, weil die Entwicklung ehrenamtlich ist.

## Jährliche Überprüfung

Einmal im Jahr, rechtzeitig vor dem Vereinsbudget, ruft der Projektleiter die Preise neu ab
und führt diese Seite nach: Betrag, Quelle, Datum. Erstmals ins Vereinsbudget kommen die
Kosten frühestens an der ordentlichen GV im Februar/März 2027 (Projektleiter, 18.11.2026).
Ausserhalb des Takts löst eine Preiserhöhung beim VPS eine Überprüfung aus
(Reevaluations-Trigger 4 in [ADR-003](adr/adr-003-hosting-infomaniak-vps.md)).

## Offene Fragen

- **K-09.1:** Was kostet das heutige Paket des Vereins bei Metanet, und enthält es schon
  E-Mail-Postfächer?
- **K-48:** Der Umzug der Website von Metanet zu Infomaniak ist bewilligt, samt den
  Postfächern. Offen sind, wer die Website danach betreut, und ob sie auf dem MyTCO-Server oder
  getrennt bei Infomaniak läuft; davon hängen ihre Kosten ab. Zieht die Website auf den MyTCO-Server, braucht es zusätzlich
  einen Nachtrag zu ADR-003 (eigener Container, getrennt von Datenbank und Netz von MyTCO) und
  eine Bedrohung im Sicherheitskonzept (Lücke im Admin-Bereich der Website auf demselben Server).
- **K-43:** Welche Online-Dienste nutzt der Verein heute und zu welchen Kosten? Davon hängt
  ab, ob MyTCO etwas mitnutzen kann.

## Quellen

Abgerufen am 02.11.2026, wo nicht anders vermerkt.

1. [Infomaniak: VPS Lite](https://www.infomaniak.com/de/hosting/vps-lite): 2 vCPU / 4 GB / 60 GB für CHF 7.20 pro Monat bei jährlicher Bindung, zahlbar für 12 Monate im Voraus, exkl. MwSt
2. [Infomaniak: Public Cloud im Vergleich](https://www.infomaniak.com/en/support/faq/2626/public-cloud-comparison-of-offers): Object Storage 1 TiB für CHF 11.21 pro Monat exkl. MwSt, Preisstand 17.08.2021. Die [Preisseite](https://www.infomaniak.com/de/hosting/public-cloud/tarife) lädt die Preise erst im Browser und lässt sich nicht automatisch abrufen
3. [webtesten.ch: Swiss Backup Test](https://webtesten.ch/swiss-backup-test/), geprüft am 19.08.2026: 1 TB für CHF 4.18 pro Monat, Cloud-Sicherung per S3, Swift oder SFTP für CHF 1.84 pro Gerät und Monat, bei Jahresvertrag, exkl. MwSt. Die [Preisseite von Infomaniak](https://www.infomaniak.com/de/swiss-backup/preise) lässt sich nicht automatisch abrufen
4. [Scaleway: Transactional Email](https://www.scaleway.com/en/transactional-email-tem/): EUR 0.25 pro 1000 Mails, 300 Mails pro Monat gratis, jede Empfängerin und jeder Empfänger zählt einzeln
5. [WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/): kein Entwicklerkonto nötig (aus ADR-001, abgerufen am 29.10.2026)
6. [Scaleway: Transactional Email, Datenschutz](https://www.scaleway.com/en/docs/transactional-email/reference-content/data-privacy/) (Wortlaut über den Quelltext [scaleway/docs-content](https://github.com/scaleway/docs-content/blob/main/pages/transactional-email/reference-content/data-privacy.mdx), geprüft am 02.11.2026): Verarbeitung nur in Paris, nichts ausserhalb der EU; Mail-Inhalt nach dem Versand gelöscht (verschlüsselte Backups 7 Tage), Versandprotokolle mit Empfängeradresse solange die Domain aktiv ist, Verkürzung 2027 angekündigt; einzelne Protokolle oder Adressen lassen sich per Support-Ticket löschen; es gelten der Vertrag zur Auftragsbearbeitung (DPA) und die [Vertragsbedingungen](https://www.scaleway.com/en/contracts/)
7. [Metanet: Business Mail](https://www.metanet.ch/de/e-mail-und-domains/business-mail): CHF 5.90 pro Monat (aus ADR-003, abgerufen am 30.10.2026)
8. [SRF: Preise für A- und B-Post-Briefe steigen](https://www.srf.ch/news/wirtschaft/post-passt-preise-an-preise-fuer-a-und-b-post-briefe-steigen) und [Post: Briefe Schweiz](https://www.post.ch/de/briefe-versenden/briefe-schweiz): ab 01.01.2027 A-Post CHF 1.40, B-Post CHF 1.10 für Standardbriefe bis 50 g, B-Post-Midibrief CHF 1.35
9. [Apple: Enrollment](https://developer.apple.com/programs/enroll/): USD 99 pro Mitgliedsjahr (aus ADR-001, abgerufen am 29.10.2026)
10. [Apple: Fee Waiver](https://developer.apple.com/support/fee-waiver/): Gebührenerlass für anerkannte Non-Profits (aus ADR-001, abgerufen am 29.10.2026)
11. [Google Play: Registrierung](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en): USD 25 einmalig (aus ADR-001, abgerufen am 29.10.2026)
12. Kostenschätzung für die Vorstandssitzung vom 16.11.2026, Stand 12.11.2026: Preise der Anbieter, abgefragt vom 02. bis 12.11.2026 (Infomaniak VPS 4 vCPU und Mail Service, Metanet Webhosting, GitHub Pro, Healthchecks.io, Bitwarden). Die einzelnen Anbieterseiten sind dort nicht verlinkt; die jährliche Überprüfung ruft sie neu ab
