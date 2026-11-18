# Server in Betrieb nehmen: Demo auf Test (#39)

**Stand:** 18.11.2026 · **Issue:** [#39](https://github.com/konstantinniedermann/tco-app/issues/39) ·
**Baut auf:** [Design zu #32](2026-11-02-server-und-auslieferung-design.md) (Auslieferung, Sicherung, Türsteher)

**Legende:** **B** = belegt (Quelle genannt) · **S** = Schätzung · **V** = Vermutung.

## Absicht

MyTCO läuft zum ersten Mal auf einem echten Server: zuerst nur die Demo auf Test mit erfundenen
Daten unter einer Übergangsadresse, damit der Projektleiter sie zeigen und die Checkliste vor dem
Release auf Test abhaken kann. Live mit der Testgruppe folgt in einer eigenen Session. Der Vorstand
hat das Hosting freigegeben (bis CHF 500 pro Jahr, K-03.1). Zugang zu Metanet (DNS von
`tcolten.ch`) fehlt noch (K-09.1, K-10.2).

## Ziele

- Server bestellt, nach SI-13 gehärtet, jede Massnahme belegt.
- Merge nach `dev` liefert auf Test aus; Demo unter der Übergangsadresse, nur mit Passwort.
- Sicherung auf einen Speicher ausserhalb des Servers in der Schweiz, mit Probe.
- Auslastung gemessen und festgehalten, als Grundlage für den Entscheid, ob die Website
  `tcolten.ch` auf denselben Server passt (K-48).
- Effektive Kosten in `docs/kosten.md`; Beobachtung vom 12.11.2026 («Kostenseite hinkt der
  Schätzung nach») dabei abgearbeitet.

## Nicht-Ziele

- Live, Testgruppe, `AUSLIEFERUNG_LIVE=an`, Zusammenlegen der Migrationen, Punkte «Vor
  `AUSLIEFERUNG_LIVE=an`» aus #39: eigene Session.
- Überwachung von aussen und Wächter der Sicherung: kommen mit Live.
- Die Website bauen oder umziehen.
- Vergrössern des Servers ausprobieren (siehe Entscheide).

## Anti-Ziele

- Eine Einrichtung, die beim Umzug des Kontos auf den Verein neu aufgebaut werden muss.
- Eine Einrichtung, in der eine spätere Website die Datenbanken oder Netze von MyTCO erreicht.
- Personendaten, private Adressen oder Zugangsdaten im öffentlichen Repo. Server-IP und
  Übergangsadresse stehen weder im Repo noch im Issue; Nachweise werden geschwärzt
  (*Call des Umsetzers*; mit `my.tcolten.ch` wird die IP ohnehin öffentlich).

## Entscheide des Projektleiters (18.11.2026)

| Thema | Entscheid |
|-------|-----------|
| Server | Infomaniak VPS Lite 2 vCPU / 4 GB, kein Puffer. Klein anfangen; Vergrössern («Angebot ändern», ca. 20 Min. Ausfall) wird erst ein Thema, wenn der Server nicht reicht. Ob die Daten dabei bleiben, ist dann mit einer Sicherung vorher zu belegen. |
| Konto | Vorerst auf den Projektleiter (K-04.1 sieht die Vereinsadresse vor, die es noch nicht gibt). |
| Sicherungsziel | Infomaniak Object Storage, jetzt festgelegt. |
| Website | Nicht jetzt bauen, aber nichts verbauen: Caddy und Docker-Netze so, dass ein eigener, abgeschotteter Container dazukommen kann. |
| Mail auf Test | *Geändert am 18.11. (Projektleiter):* Mail-Fänger (Mailpit) auf dem Server statt Scaleway; kein Konto, kein DNS. Der Mailweg für Live bleibt bei K-11.2 (Scaleway oder Postfach bei Infomaniak nach dem Website-Umzug); die zwei Punkte «`MAIL_NUR_AN` echt prüfen» und «Antwort erst nach dem ganzen Versand» (B-17) wandern dorthin. Ursprünglich: Scaleway mit Subdomain einer Domain des Projektleiters. |
| DNS-Bitte an den Verein | Text an die Hauptansprechperson (Thema liegt dort schon): `my.tcolten.ch`, `test.my.tcolten.ch`, SPF/DKIM für Scaleway; Werte folgen mit Server und IP. |
| Reihenfolge | wie unten, vom Projektleiter bestätigt. |
| Freigaben | Bestellen, Konten anlegen, Geheimnisse auf GitHub und `AUSLIEFERUNG_TEST=an` nur mit Freigabe. |

## Ansätze

**Mail auf Test** (zuerst gewählt: A; am 18.11. auf C gewechselt, weil der Live-Weg offen ist und ein Scaleway-Konto sonst ein Wegwerf-Konto werden könnte)

- **A · Scaleway mit Subdomain einer eigenen Domain:** Konto braucht es für Live ohnehin; Test
  nimmt denselben Weg wie Live; DNS beim Projektleiter, darum sofort machbar.
- B · Brevo-Konto eines anderen Projekts mitnutzen: kein DNS nötig, aber ein Dienst, der in
  ADR-003 und `kosten.md` nicht vorkommt, und ein geteiltes Kontingent, das fremde Alarme trägt.
- C · Mail-Fänger auf dem Server: nichts geht hinaus, aber Codeänderung an der TLS-Pflicht
  (SI-17) und `MAIL_NUR_AN` nicht echt belegt.
- D · Warten auf DNS bei `tcolten.ch`: keine Übergangslösung, aber die Demo hängt am
  Metanet-Zugang.

**Vergrössern belegen** (gewählt: nicht jetzt). Ausprobieren hiesse dauerhaft das grössere
Angebot (Verkleinern beschreibt Infomaniak nicht, V), ca. CHF 23 pro Jahr mehr (S).

## Umzug des Kontos ohne Neuaufbau

Der Projektleiter legt im Infomaniak-Manager eine **eigene Organisation** für MyTCO an, getrennt
von privaten Produkten; Server und Object Storage entstehen darin. Infomaniak überträgt «fast
alle Produkte» an eine andere Organisation, ohne Unterbruch; ausgenommen genannt ist nur kSuite
(B: [FAQ 2024](https://www.infomaniak.com/en/support/faq/2024/transferring-a-product-from-one-organization-to-another)).
Ob VPS Lite und Object Storage darunterfallen, nennt die Seite nicht (V, zeigt sich beim
Umzug). Später zwei Wege, beide ohne Neuaufbau:

1. **Organisation übergeben:** Die Vereinsadresse wird Benutzerin und Administratorin der
   Organisation, Zahlungsweg und Rechnungsadresse wechseln, der Projektleiter tritt aus.
2. **Produkte übertragen:** an die Organisation des Vereins, die mit dem Umzug der Website (K-48)
   ohnehin entsteht. Der Transfer startet ein Admin der abgebenden Organisation, ein Admin der
   empfangenden bestätigt. Rechnungen bleiben zurück, Benutzer und Gruppen ziehen nicht mit (B,
   FAQ); die Rechte sind danach neu zu vergeben.

Das Scaleway-Konto entsteht ebenfalls als eigene Organisation; ob Scaleway den Besitz einer
Organisation übertragen kann, wird beim Anlegen geprüft (V).

**Falls sich VPS Lite nicht übertragen lässt** (Entscheid Projektleiter): Es wird ohne Rückfrage
bei Infomaniak bestellt; die Kosten trägt der Verein (K-03.3). Lässt sich der Server später nicht
übertragen, kommt der Umzug zum Vertragsende: neuer Server auf den Verein, Einrichtung aus dem
Repo, Daten aus der Sicherung (Umzugsplan nach ADR-003, ca. ein halber Tag, S).

## Vorsorge für die Website (nur dokumentieren)

Heute (B, `betrieb/compose.proxy.yml`, `betrieb/bin/ausliefern`): Caddy hängt an einem eigenen
Netz pro Umgebung (`mytco-proxy-test`, `mytco-proxy-live`); die App jeder Umgebung hängt nur an
ihrem Proxy-Netz und an ihrem internen Netz ohne Weg nach aussen; die Datenbank nur am internen
Netz. Caddy liest jede Datei unter `caddy/umgebungen/`; `ausliefern` überschreibt nur die Datei
der eigenen Umgebung. Damit kommt eine Website später mit:

- eigenem Compose-Projekt (`mytco-website`) und eigenem Netz `mytco-proxy-website`, das
  `compose.proxy.yml` dazubekommt;
- eigener Datei `caddy/umgebungen/website.caddy`;
- Grenzen für Speicher und CPU, damit sie die App nicht verdrängt.

Ohne Änderung jetzt; festgehalten in `betrieb/README.md` und als Nachtrag in ADR-003. Den
Entscheid «gleicher Server oder getrennt» trifft K-48 mit den Messwerten aus Schritt 7.

## Übergangsadresse

Zwei Namen aus der IP über sslip.io (Test und, später, Live). **Nur für Test:** Passkeys,
Push-Anmeldungen und die App auf dem Startbildschirm hängen an der Adresse und gehen beim Wechsel
auf `test.my.tcolten.ch` verloren; für die Demo mit erfundenen Daten ist das hinzunehmen. Live
startet erst unter `my.tcolten.ch`. In `test/geheim.env` stehen `ORIGIN` und `MYTCO_ADRESSE` auf
der Übergangsadresse. Ob der fremde Namensdienst etwas an der Datenschutzerklärung ändert, ist vor
der Testgruppe zu prüfen (Abschnitt Datenschutz in #39); auf Test gibt es nur erfundene Daten.

## Sicherungsziel

Infomaniak Object Storage, S3-kompatibel, Daten in der Schweiz, Abrechnung nach Verbrauch ohne
Mindestbetrag: CHF 0.000016 pro GB und Stunde, also ca. CHF 0.14 pro GB und Jahr (B:
[Produktseite](https://www.infomaniak.com/en/hosting/public-cloud/object-storage), abgerufen
18.11.2026; ob inkl. MwSt, widerspricht sich die Seite). Der Vertrag zur Auftragsbearbeitung von
Infomaniak (ADR-003, B·3) gilt für das Konto; dass er Object Storage abdeckt, ist V und beim
Bestellen zu prüfen. Ob restic damit läuft, belegt ein echter Lauf (`init`, `sichern test`,
`probe test`). Restrisiko bleibt: Server und Sicherung am selben Konto.

## Reihenfolge

1. **Worktree, DNS-Text** an die Hauptansprechperson (erledigt in der Session).
2. **Im Repo vorbereiten**, was ohne Server geht:
   - Protokolle zeitlich begrenzen: Docker-Logs und `<umgebung>/protokoll.log` höchstens 30 Tage,
     IP-Adressen höchstens 24 Stunden (DS-06); Weg (logrotate, journald, Docker-Treiber) im Plan.
     DS-06 gilt wörtlich auch für die Protokolle des Systems («auch in Logs»): Systemjournal und
     `auth.log` (sshd) höchstens 24 Stunden, Firewall ohne Protokoll, kein fail2ban (Login nur
     mit Schlüssel macht es entbehrlich). *Call des Umsetzers.*
   - Rechte des Betriebsbenutzers (`/opt/mytco`, Docker-Gruppe) in `betrieb/README.md`.
   - Befunde aus den Kommentaren in #39 (04.11. und 06.11.), *Call des Umsetzers:* in dieser
     Session behoben werden die für Test: SMTP-Zertifikatsprüfung nicht per URL abschaltbar und
     Zeitlimits gesetzt, Schutz der Werte aus `geheim.env` vor der Shell (samt mehrzeiligem
     `MAIL_NUR_AN`), Rückfall oder bewusst «Test bleibt leer» nach `down --volumes`. Das
     DB-Server-Log wird auf dem Server mit absichtlich scheiterndem Einspielen angesehen (Schritt
     5). Der Rückfall bei scheiternder Migration auf Live gehört in die Live-Session. Soll ein
     Befund nicht behoben, sondern hingenommen werden, entscheidet der Projektleiter (Haltepunkt).
   - Vorsorge für die Website dokumentieren (siehe oben).
3. **Bestellen und Konten** (Freigabe): Infomaniak-Organisation, VPS Lite mit aktuellem Ubuntu
   LTS und eigenem SSH-Schlüssel, Object Storage; Scaleway-Konto mit Subdomain. Zwei-Faktor-Login
   auf allen (SI-15).
4. **Härten nach SI-13**, jede Massnahme belegt: Root-Login abgewiesen, Passwort-Login
   abgewiesen, Port-Scan zeigt nur 22/80/443, automatische Sicherheits-Updates aktiv.
5. **Einrichten:** Docker, Benutzer `mytco`, Türsteher (`root:root` 0755), zwei CI-Schlüssel mit
   Zwangsbefehl, `geheim.env` für Test, `proxy.env` mit Übergangsadresse, `sicherung.env`,
   restic-Repository anlegen und mit Probe belegen, Mailweg über Scaleway mit `MAIL_NUR_AN`
   prüfen. Timer bleibt aus bis Live. Konsolenzugang ohne SSH im Infomaniak-Konto prüfen.
6. **Vor `AUSLIEFERUNG_TEST=an`:**
   - Entscheide des Projektleiters: Versionsnummer auf Test (ADR-012) und offene App nach
     einer Auslieferung (E-65).
   - Antwort erst nach dem ganzen Versand (B-17) mit echtem SMTP prüfen.
   - Nachweis der Auslieferungskette als von Hand startbarer CI-Lauf: entscheiden, ob jetzt.
   - Server und Adressen in die sensiblen Ziele des Auto-Modus eintragen.
   - Projektleiter bestätigt das Restrisiko «Schreibrecht auf GitHub reicht bis root».
   - Mit Freigabe: Geheimnisse in die GitHub-Umgebung `test`, `AUSLIEFERUNG_TEST=an`; erste
     Auslieferung, Rückfall einmal ausprobiert, Test-Schlüssel kann nicht auf Live, Demo
     erreichbar nur mit Passwort, Testdaten und `MAIL_NUR_AN` belegt.
7. **Messen und nachführen:** RAM, Platte, CPU mit Test (Live erst mit Live) festhalten: in Ruhe,
   während einer Auslieferung und bei einer kurzen Lastspitze mit Bordmitteln; kein eigener
   Lasttest (*Call des Umsetzers*);
   effektive Kosten in `kosten.md`, Beobachtung vom 12.11.2026 abarbeiten (Posten und Preise der
   Vorstandsfassung, Actions-Guthaben in `ci-cd-und-release.md` prüfen);
   `ci-cd-und-release.md`, `betrieb-und-uebergabe.md`, `beobachtungen.md` nachführen.

## Dem Umsetzer überlassen

- Werkzeuge für Härtung und Port-Scan, Form der Nachweise (Befehl plus Ausgabe im Issue).
- Weg der zeitlichen Begrenzung der Protokolle, solange 30 Tage / 24 Stunden belegt sind.
- Namen der Subdomain und des Absenders auf Test (nur in `test/geheim.env`, nicht im Repo).
- Wo im Repo die Messwerte stehen (Vorschlag: `docs/betrieb-und-uebergabe.md`, neuer Abschnitt).
