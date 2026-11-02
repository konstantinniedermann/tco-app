[← ADR-Index](adr-index.md)

# ADR-003: MyTCO läuft auf einem eigenen Server bei Infomaniak in der Schweiz

**Status:** Entschieden · **Datum:** 2026-10-30 · **Issue:** #8

## Kontext

[ADR-002](adr-002-sveltekit-postgresql.md) braucht einen Node-Server mit PostgreSQL und
einen Dienst für den E-Mail-Versand. Randbedingungen:

- **Datenschutz:** Server, Datenbank, Backups und E-Mail-Versand in CH oder EU/EWR (DS-01),
  Vertrag zur Auftragsbearbeitung (DS-02), Logs und Backups höchstens 30 Tage (DS-06), keine Inhalte von fremden Servern (DS-03, umgesetzt in [ADR-002](adr-002-sveltekit-postgresql.md)) —
  siehe [Datenschutzkonzept](../datenschutz.md#vorgaben-für-technik-und-hosting).
- **Kosten:** laufend im niedrigen dreistelligen Bereich pro Jahr (N-KOSTEN-01).
- **Übergabe:** Konto soll auf den Verein laufen können (K-04), Anbieter austauschbar.
- Der Verein hat Webhosting für tcolten.ch bei Metanet (K-09).

**Legende:** **B·n** = belegt mit Quelle n · **S** = Schätzung · **V** = Vermutung.
Preise exkl. MwSt, wo nicht anders vermerkt; MwSt 8.1 %; 1 EUR ≈ 0.94 CHF, 1 USD ≈ 0.80 CHF (S).

## Optionen

| Option | CHF/Jahr | Dafür | Dagegen |
|--------|----------|-------|---------|
| **A · Eigener Server CH** — Infomaniak VPS Lite, App, PostgreSQL und Webserver in Docker | ca. 110–230 (S) | Schweizer Firma und Rechenzentrum (B·1); DPA vorhanden (B·3); PostgreSQL ohne Aufpreis; dieselbe Docker-Konfiguration läuft bei jedem Hoster | Updates und Sicherung in eigener Verantwortung; keine Snapshots, kein SLA (B·1) |
| **B · Verwaltete Plattform EU** — Scaleway Paris, Container und PostgreSQL | ca. 400 (S, B·7) | Kaum Betrieb, tägliche Backups vom Anbieter (B·7) | Am Budgetrand; EU statt CH |
| **C · Render oder fly.io** — Rechenzentrum Frankfurt | Render ca. 130–200 (S, B·8); fly.io mit verwaltetem PostgreSQL ca. 440 (S aus B·9) | Kaum Betrieb; fly.io aus früheren Projekten vertraut | US-Firmen: Zugriff von US-Behörden möglich, DS-01 nur dem Standort nach erfüllt (V); fly.io-PostgreSQL in Vorschau (B·9) |
| **D · Metanet** | Webhosting: untauglich; Cloud Server S ca. 290 inkl. MwSt (B·5) | Bestehende Kundenbeziehung des Vereins | Webhosting ohne Node.js, nur MariaDB (B·4); Cloud Server: gleicher Aufwand wie A, rund dreifache Serverkosten |
| **E · Infomaniak Node.js-Hosting** | ca. 140 (S aus B·2) | Verwaltet, Schweiz | Nur MariaDB, kein PostgreSQL (B·2); Hintergrundprozesse unklar (V) |
| **F · Exoscale** (CH) | ca. 650 (S aus B·6) | Verwaltetes PostgreSQL in der Schweiz | Datenbank allein ca. CHF 510/Jahr (B·6) |

**E-Mail-Versand:** Ein Postfach von @tcolten.ch bei Metanet (K-11; Business Mail CHF 5.90
pro Monat, B·10) oder bei Infomaniak (Limit 200–500 Mails pro Tag und Absender, B·11), oder
ein Versanddienst in der EU wie Scaleway (300 Mails/Monat gratis, danach EUR 0.25 pro
1000, B·12; Vertrag zur Auftragsbearbeitung V, prüfen in #9; *Nachtrag 02.11.2026:* vorhanden, Aufbewahrung der Versandprotokolle offen → [Kosten](../kosten.md)). US-Dienste fallen weg; Postmark bewahrt Daten zudem 45 Tage auf (B·13).

## Entscheidung

**MyTCO läuft auf einem Infomaniak VPS Lite in der Schweiz: App, PostgreSQL und ein
Webserver mit automatischem HTTPS als Docker-Container; die Datenbank wird jede Nacht auf
einen Speicher ausserhalb des Servers in der Schweiz gesichert. E-Mails verschickt MyTCO über
ein Postfach von @tcolten.ch, wenn K-11 das mit ausreichendem Limit erlaubt — sonst über
Scaleway (EU).** (hängt an K-11)

Begründung:

- **Vom Projektleiter gewählt** (VPS Lite und der bedingte E-Mail-Weg), nachdem er
  verwaltete Plattformen in der EU und US-Anbieter wie fly.io verworfen hatte.
- **Datenschutz ohne Umweg:** Schweizer Firma, Schweizer Rechenzentrum, DPA (B·3).
- **Günstigste Variante mit PostgreSQL** — ein verwaltetes PostgreSQL in der Schweiz gibt
  es im Budget nicht (Optionen E, F).
- **Austauschbar:** Die Docker-Konfiguration ist der Umzugsplan; dieselben Container
  laufen bei jedem anderen Hoster oder auf einer verwalteten Plattform (S).
- **Metanet:** Das Webhosting des Vereins kann keine Node-App betreiben (B·4). Von Metanet
  bleiben Domain (`my.tcolten.ch`, K-10) und eventuell das E-Mail-Postfach (K-11).

**Betrieb in Grundzügen** (Anleitung, Konten und Wiederherstellungstest → #10):

| Thema | Festlegung |
|-------|-----------|
| Server | VPS Lite 2 vCPU / 4 GB (B·1), Linux mit automatischen Sicherheits-Updates |
| Container | App (Node), PostgreSQL, Webserver mit automatischem HTTPS (z. B. Caddy, S) |
| Sicherung | Nächtlich `pg_dump`, verschlüsselt auf Speicher in der Schweiz ausserhalb des Servers, bei einem Anbieter mit Vertrag zur Auftragsbearbeitung (DS-02), 30 Tage Rotation (DS-06); Ziel und Preis → #10 |
| Logs | Rotation auf höchstens 30 Tage, ohne Inhalte (DS-06) |
| E-Mail | Versand über Port 587 beim gewählten Dienst — der VPS sperrt Port 25 (B·1) |

## Konsequenzen

**Leichter:** Datenschutzerklärung kann „Infomaniak, Schweiz“ nennen; volle Kontrolle,
keine Bindung an eine Plattform; PostgreSQL ohne Aufpreis.

**Schwerer:** Jemand ist für den Server verantwortlich — Updates von Containern, Prüfen der
Sicherung, Reaktion bei Ausfall. Ohne Snapshots muss die Wiederherstellung aus der
Sicherung geübt sein (#10). Kein SLA; ob das für Anmeldung und Finalwochenende reicht,
hing an K-15. *Nachtrag 30.10.2026:* K-15 ist beantwortet — ein kurzer Ausfall wird in Kauf
genommen, ein VPS ohne SLA reicht.

**Kosten** (Stand 30.10.2026; aktuell, mit Szenarien und Freigabe → [Kosten](../kosten.md)):

| Posten | CHF/Jahr inkl. MwSt | Status |
|--------|----------|--------|
| VPS Lite 2 vCPU / 4 GB, 12 Monate | ca. 93 (CHF 7.20/Monat exkl., B·1) | belegt |
| Sicherungsspeicher ausserhalb des Servers | ca. 20–60 | S |
| E-Mail-Versand | 0–80 (Scaleway fast gratis bis Metanet-Postfach CHF 5.90/Monat, B·10) | S, hängt an K-11 |
| Domain | 0 (Subdomain von tcolten.ch) | V, hängt an K-10 |
| **Total** | **ca. 110–230** | S |

## Reevaluations-Trigger

1. **Betrieb wird zu viel:** Server-Pflege ist im Jahr mehr als ca. 2 Personentage (S),
   oder niemand übernimmt sie (hängt an K-05) → verwaltete Plattform (Option B).
2. **Infomaniak bietet verwaltetes PostgreSQL** im Budget an.
3. **Ausfall während der CM-Anmeldung oder am Finalwochenende**, der den Verein stärker
   stört, als K-15 (kurzer Ausfall wird in Kauf genommen) erwarten liess.
4. **Preis** des VPS steigt über das Budget, oder Infomaniak streicht VPS Lite.

## Quellen

Abgerufen am 30.10.2026.

1. [Infomaniak: VPS Lite](https://www.infomaniak.com/de/hosting/vps-lite) — 2 vCPU / 4 GB CHF 7.20/Monat bei 12 Monaten exkl. MwSt; keine Snapshots, kein SLA, Port 25 gesperrt
2. [Infomaniak: Node.js-Hosting](https://www.infomaniak.com/de/hosting/nodejs-hosting) — CHF 10.91/Monat, MariaDB
3. [Infomaniak: Datenschutz und DPA](https://www.infomaniak.com/de/support/faq/2820/verstehen-sie-datensicherheit-dsgvo-und-datenschutzgesetz)
4. [Metanet: Webhosting](https://www.metanet.ch/de/hosting/webhosting) — PHP, MariaDB, kein Node.js erwähnt
5. [Metanet: Cloud Server](https://www.metanet.ch/de/server/root-cloud-server) — S: CHF 24/Monat inkl. MwSt, 6 Monate Mindestlaufzeit
6. [Exoscale: Preise](https://www.exoscale.com/pricing/) — DBaaS PostgreSQL Hobbyist-2 CHF 42.42/Monat
7. [Scaleway: Managed Databases](https://www.scaleway.com/en/pricing/managed-databases) und [Autobackup](https://scaleway.com/en/docs/managed-databases/postgresql-and-mysql/how-to/enable-autobackup) — nur aus Suchauszug, Seite sperrt automatischen Abruf
8. [Render: Preise](https://render.com/pricing)
9. [fly.io: Preise](https://docs.fly.io/about/pricing) und [Managed Postgres](https://fly.io/docs/mpg) — ab USD 38/Monat, Technical Preview
10. [Metanet: Business Mail](https://www.metanet.ch/de/e-mail-und-domains/business-mail)
11. [Infomaniak: Versandlimits](https://www.infomaniak.com/de/support/faq/2065/die-beschrankungen-fur-ausgehende-e-mails-pro-24-stunden-verstehen)
12. [Scaleway: Transactional Email](https://www.scaleway.com/en/transactional-email-tem) — nur aus Suchauszug
13. [Postmark: Preise](https://postmarkapp.com/pricing)
