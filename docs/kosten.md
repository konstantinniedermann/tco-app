[← Übersicht](index.md)

# Kosten

Was MyTCO den Verein kostet, mit der Technik aus [ADR-001](adr/adr-001-web-app-zuerst.md)
und [ADR-003](adr/adr-003-hosting-infomaniak-vps.md). Den Rahmen gibt N-KOSTEN-01 vor:
laufend im niedrigen dreistelligen Bereich pro Jahr. Die Kosten trägt der Verein; einzig
GitHub läuft auf dem Privatkonto des Projektleiters (siehe unten).

**Legende:** **B·n** = belegt mit Quelle n · **S** = Schätzung · **V** = Vermutung.
Beträge in CHF inkl. MwSt 8.1 %, wo nicht anders vermerkt; 1 EUR ≈ 0.94 CHF,
1 USD ≈ 0.80 CHF (S, wie ADR-003). Preise Stand 02.11.2026, Mitgliederzahl 03.11.2026.

## Laufende Kosten

Die Mitgliederzahl ändert diese Kosten kaum, weil Server und Sicherung pauschal kosten.

| Posten | Rhythmus | CHF/Jahr | Status |
|--------|----------|---------:|--------|
| Server: Infomaniak VPS Lite, 2 vCPU / 4 GB | jährlich, im Voraus | 93 (CHF 7.20/Monat exkl. MwSt bei 12 Monaten, B·1) | belegt |
| Sicherungsablage in der Schweiz: Infomaniak Object Storage, Abrechnung nach Verbrauch | monatlich | unter 1 (CHF 11.21 pro TiB und Monat exkl. MwSt, Preisstand 2021, B·2; Sicherungen unter 1 GB, S) | Schätzung |
| oder Infomaniak Swiss Backup, 1 TB plus 1 Gerät für Cloud-Sicherung | jährlich | 78 (CHF 4.18 + 1.84 pro Monat exkl. MwSt, B·3) | belegt über Drittquelle |
| E-Mail-Versand über Scaleway (EU) | nach Verbrauch | unter 5 (300 Mails/Monat gratis, danach EUR 0.25 pro 1000, B·4; Mengen siehe [Szenarien](#szenarien)) | belegt, Menge geschätzt |
| Datenbank (PostgreSQL) und Test-Umgebung | — | 0 (Container auf demselben VPS, [ADR-002](adr/adr-002-sveltekit-postgresql.md), [CI/CD und Release](ci-cd-und-release.md)) | belegt |
| Domain: Subdomain `my.tcolten.ch` | — | 0 | Annahme K-10: MyTCO läuft auf einer Subdomain der bestehenden Domain, keine eigene Domain |
| Push-Benachrichtigungen (Web Push) | — | 0 (Push-Dienste der Browser, ohne Konto, B·5) | belegt |
| Code-Ablage und CI: GitHub im Gratisplan | — | 0 auf dem Privatkonto des Projektleiters; reicht das Kontingent an Actions-Minuten nicht, wird das Budget des Kontos erhöht ([CI/CD und Release](ci-cd-und-release.md)) | belegt |
| **Total laufend** | | **ca. 95–175** | Schätzung |

Die Wahl der Sicherungsablage fällt in #10; bis dahin gilt die Spanne. Scaleway hat einen
Vertrag zur Auftragsbearbeitung und verarbeitet E-Mails nur in Frankreich (B·6), damit sind
DS-01 und DS-02 erfüllt. Den Inhalt einer Mail löscht Scaleway nach dem Versand, die
Versandprotokolle mit Empfängeradresse bleiben aber, solange die Absender-Domain aktiv ist;
eine Verkürzung ist für 2027 angekündigt (B·6). Löschen lassen sich einzelne Einträge nur per
Support-Ticket. Ob das zu den Löschfristen im [Datenschutzkonzept](datenschutz.md#löschen)
passt, ist offen; Hinweis dazu in
[#29](https://github.com/konstantinniedermann/tco-app/issues/29) (Wahl des Mailwegs). Scaleway stellt keine
Schweizer MwSt in Rechnung (V).

**Künftig eventuell wenige Franken pro Jahr:** GitHub und der E-Mail-Versand kosten heute
nichts, weil sie Gratiskontingente nutzen. Das Kontingent an Actions-Minuten teilt MyTCO mit
anderen privaten Repos des Projektleiters ([Actions-Minuten](ci-cd-und-release.md#actions-minuten)).
Bei Scaleway fallen ohne Gratiskontingent bei 500 Mitgliedern ca. CHF 4 pro Jahr an (S).
Reicht ein Kontingent nicht mehr, entstehen Kosten von wenigen Franken pro Jahr (S).

Annahme K-11: MyTCO verschickt seine E-Mails über Scaleway, nicht über ein Postfach von
@tcolten.ch. ADR-003 gibt dem Postfach Vorrang, wenn K-11 es erlaubt; dessen Kosten stehen
unter [Nur falls](#nur-falls). Damit stiege die Obergrenze auf ca. CHF 250 pro Jahr.

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
| Postfach @tcolten.ch, Business Mail bei Metanet | K-11 erlaubt den Versand darüber, und das heutige Paket enthält es nicht schon (K-09) | ca. 71–77 pro Jahr (CHF 5.90/Monat, ob inkl. MwSt: offen, B·7) | belegt |
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
| Laufend pro Jahr | ca. 95–175 | ca. 95–175 | ca. 95–175 |
| Druck Login-Brief, Startjahr | ca. 15–30 | ca. 20–40 | ca. 25–50 |
| **Total Startjahr** | **ca. 110–205** | **ca. 115–215** | **ca. 120–225** |
| **Total Folgejahre** | **ca. 95–175** | **ca. 95–175** | **ca. 95–175** |
| Porto, falls einzeln verschickt (B- bis A-Post) | 330–420 | 440–560 | 550–700 |

Die untere Grenze gilt mit Object Storage, die obere mit Swiss Backup. Monate mit
Clubmeisterschaft können ein Mehrfaches an Mails bringen. Selbst das Dreifache in diesen
Monaten bleibt unter CHF 10 pro Jahr (S).

## Vergleich

Sollte Fairgate den Mitglieder-Teil abdecken, müsste der Verein Intranet und Kurs- und
Eventmodul Lite dazubuchen: ca. CHF 280–400 pro Jahr, dazu ca. 280–400 einmalig (S, aus der
[Recherche Systemlandschaft](recherche/README.md), Stand 29.10.2026). MyTCO bleibt mit
ca. 95–175 pro Jahr darunter, weil die Entwicklung ehrenamtlich ist.

## Jährliche Überprüfung

Einmal im Jahr, rechtzeitig vor dem Vereinsbudget, ruft der Projektleiter die Preise neu ab
und führt diese Seite nach: Betrag, Quelle, Datum. Wann das Budget entsteht, hängt an K-03.
Ausserhalb des Takts löst eine Preiserhöhung beim VPS eine Überprüfung aus
(Reevaluations-Trigger 4 in [ADR-003](adr/adr-003-hosting-infomaniak-vps.md)).

## Offene Fragen

- **K-03:** Gilt der Budgetrahmen, wer gibt die Posten frei, und wie bezahlt der Verein
  Online-Dienste (Rechnung, Kreditkarte)? Die Freigabe der Kosten durch den Verein steht aus;
  der Vorstand entscheidet am 16.11.2026, im Gespräch sind CHF 300–500 pro Jahr.
- **K-09:** Was kostet das heutige Paket des Vereins bei Metanet, und enthält es schon
  E-Mail-Postfächer?
- **K-48:** Lohnt es sich, die Website von Metanet zu Infomaniak umzuziehen, damit Website
  und MyTCO bei einem Anbieter laufen? Das hängt an den Kosten aus K-09 und daran, ob die
  E-Mail-Postfächer mitziehen.
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
