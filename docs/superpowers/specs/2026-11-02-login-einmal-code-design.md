# Design: Login per Einmal-Code (#29, Variante A)

**Datum:** 2026-11-02 · **Issue:** [#29](https://github.com/konstantinniedermann/tco-app/issues/29)
· **Status:** freigegeben (Projektleiter, 02.11.2026)

## Absicht

Mitglieder legen MyTCO einmal auf den Startbildschirm, tippen den Code aus ihrem Brief ein und
bleiben ein Jahr lang angemeldet, gleitend und ohne Passwort. Wer herausfällt (lange Pause,
neues Handy, Brief verloren), holt sich mit der E-Mail-Adresse einen kurzlebigen Code.
Gebaut wird **Variante A** (Code in der Startbildschirm-App eintippen), weil sie nach der
Recherche auf dem iPhone als einzige immer klappt. Die Varianten B und C bleiben für den Test
in reflexionsinstrument#41 offen, und dieses Design verbaut sie nicht.

Dieses Issue baut den Login **lokal** und belegt ihn mit Einheitstests, DB-Tests und E2E-Tests.
Die Live-Auslieferung kommt mit #32 (läuft parallel), das Aussehen mit #13 (Leitbild liegt
auf `dev`).

Massgebend und hier nicht wiederholt: [Sicherheitskonzept](../../sicherheitskonzept.md)
(SI-01 bis SI-07, Tabelle *Login*: Werte beider Codes), [Datenschutz](../../datenschutz.md)
(DS-06, DS-08, DS-10), [Fachmodell](../../fachmodell.md) (FR-24, FR-25),
[Rollen und Rechte](../../rollen-und-rechte.md) (RR-04), [ADR-002](../../adr/adr-002-sveltekit-postgresql.md)
(Bauregel), [UI-Leitbild](../../ui-leitbild.md) (Bausteine, Sprache, UI-07),
[Testkonzept](../../testkonzept.md) (Testdaten, Test-IDs).

## Ziele

1. Ein Mitglied meldet sich mit dem Brief-Code an und bleibt angemeldet, auch nach einem
   Neuladen und einem Neustart des Browsers (FR-24, A-LOGIN-08, A-LOGIN-09).
2. Über die E-Mail-Adresse erhält es einen Mail-Code. Bekannte und unbekannte Adressen
   bekommen dieselbe Antwort, und die Rate Limits greifen (A-LOGIN-10, SI-03, SI-04).
3. Erhöht der Server die Sitzungsversion, enden alle Sitzungen des Kontos (SI-07). Abmelden
   beendet die Sitzung dieses Geräts (SI-06).
4. Ein Musterbrief mit QR-Code, Brief-Code und Anleitung entsteht als PDF aus erfundenen
   Daten (A-LOGIN-01).
5. Die Login-Wahl ist als ADR-004 begründet. Fachmodell, Sicherheits- und Datenschutzkonzept
   sind auf die Entscheide unten nachgeführt.

## Nicht-Ziele

- **Keine Admin-Oberfläche** und keine Rollen. «Brief-Code ausstellen» und «alle Sitzungen
  beenden» gibt es nur als Server-Funktionen mit Tests. Die Oberfläche kommt mit der
  Mitgliederverwaltung (Etappe *Mitglieder-Login*, eigenes Issue).
- **Kein Tagescode für Admins** (SI-08, K-12).
- Keine Änderung der E-Mail-Adresse (FR-25, SI-09), kein «erstes Login» mit Ergänzen der
  Daten (A-LOGIN-03), kein Austritt (FR-04), kein Änderungsverlauf (FR-26).
- Keine Mitgliederfelder über das hinaus, was Login und Brief brauchen.
- Kein Link in der Mail (Variante C) und kein Login-QR (Variante B).
- Keine Auslieferung, kein echter Mailanbieter, keine Reverse-Proxy-Konfiguration (→ #32).
- Kein pg-boss: Die Code-Mail geht direkt aus dem Prozess.
- Kein Service Worker und kein Offline-Betrieb (kommt mit der PWA-Arbeit). Das Manifest
  gehört dazu, siehe unten.
- Kein eigenes Aussehen über das Leitbild hinaus.

## Anti-Ziele (wäre ein Fehlschlag, auch wenn alles grün ist)

- Ein Code, eine Sitzungskennung oder eine E-Mail-Adresse in einem Log (SI-05, DS-06).
- Eine IP-Adresse auf der Festplatte (DS-06).
- Die Antwort beim Anfordern eines Mail-Codes verrät durch Inhalt, Statuscode oder Dauer, ob
  ein Konto besteht (SI-04).
- Ein Code im Klartext in der Datenbank, oder ein Code, der fest in einem Test steht (SI-01,
  Testkonzept).
- Echte Personendaten irgendwo, auch nicht im Musterbrief (DS-08).
- Ein Sonderweg im Produktivcode, der nur in Tests aktiv ist und die Prüfung umgeht
  (z. B. ein Endpunkt, der Codes ausgibt).
- Die Bauregel aus ADR-002 gebrochen (Server-Loader, Form Actions).

## Entscheidungen des Projektleiters (02.11.2026)

| Thema | Entscheid |
|-------|-----------|
| Sitzung | **Sitzungstabelle:** Das Cookie trägt eine zufällige Kennung, die Datenbank eine Zeile pro Gerät mit dem Hash der Kennung. Abmelden löscht die Zeile. Die Sitzungsversion wirkt zusätzlich: Eine Sitzung mit älterer Version ist ungültig |
| Rate Limit | **Arbeitsspeicher:** Zähler pro IP und pro Adresse leben nur im Prozess, ein Neustart setzt sie zurück. Die 5 Fehlversuche pro Mail-Code stehen in der Datenbank (gehören zum Code) |
| Umfang | **Nur Server-Funktionen** für «Brief-Code ausstellen» und «Sitzungen beenden». Konten für Tests und lokale App aus erfundenen Seed-Daten, der Musterbrief aus einem Skript |
| Test-Mails | **Mailpit-Container** in `docker-compose.yml` und als Service in der CI. Die App verschickt echt per SMTP, der E2E-Test liest den Code über die HTTP-Schnittstelle von Mailpit |
| Codes | **Zwei getrennte Codes je Konto:** Ein neuer Mail-Code ersetzt nur den alten Mail-Code, ein neuer Brief-Code nur den alten Brief-Code. Ein erfolgreicher Login mit einem der beiden macht **beide** ungültig. Weicht vom bisherigen Fachmodell ab («ein Code je Konto»), das wird nachgeführt |
| Mail-Paket | **nodemailer** (Abhängigkeit, läuft live) |
| QR-Paket | **qrcode-generator** (vorerst Entwicklungsabhängigkeit, nur für den Musterbrief) |
| PDF | **HTML mit Druck-Layout, PDF über Playwright** (schon vorhanden), kein neues Paket |
| Manifest | **Schlankes Web-App-Manifest in diesem Issue**, ohne Service Worker. Ohne Manifest öffnet sich MyTCO vom Startbildschirm nicht als eigene App, und Variante A wäre nicht prüfbar |
| Adresse beim Mail-Code | **Kurz im Gerätespeicher** (`localStorage`), gelöscht nach dem Login oder spätestens nach 15 Minuten. Nie auf dem Server über die Anfrage hinaus. Datenschutzkonzept und Datenschutzerklärung erhalten je einen Satz |

Freigegebene Pakete (Versionen laut npm am 02.11.2026; der Builder nimmt die dann aktuelle):

| Paket | Version | Art | Eigene Abhängigkeiten |
|-------|---------|-----|------------------------|
| `nodemailer` | 10.3.1 | dependencies | keine, Typen dabei, Lizenz MIT-0 |
| `qrcode-generator` | 2.0.4 | devDependencies | keine, Typen dabei, Lizenz MIT |
| Docker-Image `axllent/mailpit` | v1.33 | nur lokal und CI | — |

## Annahmen (an der wirkenden Stelle markieren)

- **Annahme K-11:** Versand über einen SMTP-Zugang, konfiguriert mit einer URL in einer
  Umgebungsvariablen. Welcher Anbieter (Metanet oder Scaleway), ist offen. Der Anbieter wird
  nur durch die Konfiguration gewechselt.
- **Annahme K-21:** Die Ansprechperson bei Login-Problemen ist eine Einstellung
  (Umgebungsvariable, ein freier Text wie «das Sekretariat, sekretariat@…»). Sie steht im
  Brief und in der Meldung «Code schon benutzt». In Tests und im Musterbrief ist sie
  erfunden.
- **Annahme K-10:** Die App-Adresse im QR-Code ist eine Einstellung, Standard
  `https://my.tcolten.ch`.
- **K-16.1** (wer druckt) spielt für den Code keine Rolle.

## Ablauf in der App

1. **Login-Seite** nach dem Mockup im Leitbild (`docs/ui-mockups/index.html`, Bild 1): Titel
   «Anmelden», ein Feld «Code aus dem Brief» (`.feld-code`, `autocomplete="one-time-code"`),
   Haupttaste «Anmelden», Link «Kein Brief zur Hand? Code per E-Mail». Die Eingabe ignoriert
   Gross-/Kleinschreibung, Leerzeichen und Bindestriche (UI-07).
2. **Code per E-Mail:** Ein Feld für die E-Mail-Adresse und die Taste «Code schicken». Danach
   kommt immer der Hinweis «Falls ein Konto zu dieser Adresse besteht, ist eine Mail
   unterwegs», dazu das Feld «Code aus der Mail» (6 Ziffern) und die Taste «Anmelden». Der
   Link «Neuen Code schicken» führt zurück zum Adressfeld.
   - Die Adresse und der Zeitpunkt der Anfrage liegen in `localStorage`. Lädt das iPhone die
     App nach dem Wechsel in die Mail-App neu, steht wieder das Feld «Code aus der Mail» da.
   - Gelöscht wird der Eintrag nach dem erfolgreichen Login, über «Neuen Code schicken» mit
     einer anderen Adresse und spätestens 15 Minuten nach der Anfrage. Beim Start prüft die
     App das Alter und löscht abgelaufene Einträge.
3. **Angemeldet:** Die Startseite zeigt «Hoi <Vorname>» und die Taste «Abmelden». Mehr gibt
   es noch nicht. Ist niemand angemeldet, leitet jede Seite ausser der Login-Seite dorthin
   um.
4. **Meldungen** (UI-06, beim Feld, mit Lösungsweg):
   - falscher, abgelaufener oder ersetzter Code, oder Konto gesperrt bzw. nicht aktiv:
     «Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen per E-Mail schicken.»
     Ein gesperrtes Konto bekommt bewusst dieselbe Meldung (meine Annahme).
   - Brief-Code schon benutzt: «Dieser Code wurde schon benutzt. Wende dich an
     <Ansprechperson>.» (SI-02, B-03)
   - Mail-Code falsch, abgelaufen oder nach 5 Fehlversuchen ungültig: immer dieselbe Meldung
     «Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen schicken.» Eine eigene
     Meldung nach dem 5. Fehlversuch würde verraten, dass zur Adresse ein Konto besteht
     (SI-04, B-02). Meine Entscheidung nach dem Review.
   - Limit pro IP erreicht: «Zu viele Versuche. Versuch es in einer Stunde nochmals.»
5. **Widerruf:** Beim nächsten Aufruf einer Schnittstelle ist die Sitzung ungültig, die App
   zeigt die Login-Seite.

Die Wörter und das Aussehen darf #13 später ändern. Die Bedeutung der Meldungen bleibt.

## Codes

| | Brief-Code | Mail-Code |
|---|---|---|
| Alphabet | `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 Zeichen, ohne 0/O/1/I/L) | Ziffern 0–9 |
| Länge | 10 (≈ 49.5 Bit), gedruckt als zwei Fünfergruppen `K7MPQ-R4XHT` | 6 |
| Gültig | 90 Tage ab Ausstellung | 15 Minuten |
| Eingabe | ohne E-Mail-Adresse | zusammen mit der E-Mail-Adresse |
| Gespeichert | HMAC-SHA-256 mit Server-Schlüssel, eindeutiger Index (Suche über den Hash) | HMAC-SHA-256 über Konto-ID und Code |
| Bremse | 10 Fehlversuche pro IP und Stunde | 5 Fehlversuche, dann ungültig (Datenbank) |

- Zufall nur aus `node:crypto`. Zeichen gleichverteilt ziehen (Verwerfen statt Modulo).
- Der Server-Schlüssel kommt aus einer Umgebungsvariablen. Fehlt er, startet die App nicht.
  Ein Wechsel des Schlüssels macht alle offenen Codes ungültig, das ist gewollt.
- Ein Brief-Code bleibt nach der Benutzung als «benutzt» gespeichert, bis er abläuft oder ein
  neuer Brief-Code ihn ersetzt. Nur so kann die Meldung «schon benutzt» kommen.
- Ein erfolgreicher Login mit einem der beiden Codes macht beide ungültig. Der Brief-Code
  gilt danach als «benutzt», damit ein gestohlener Brief auffällt.
- Bei einem Login mit einem gültigen Code eines gesperrten oder nicht aktiven Kontos wird der
  Code nicht verbraucht, und die Meldung ist dieselbe wie bei einem falschen Code.

## Sitzung

- Die Kennung besteht aus 32 Zufallsbytes (base64url) und steht im Cookie. In der Datenbank
  liegt nur ihr SHA-256-Hash. Bei so viel Entropie braucht es kein HMAC.
- Cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, 365 Tage. Gesetzt wird es über die
  Cookie-Funktionen von SvelteKit, damit es auf `http://localhost` in den Tests funktioniert.
- **Gleitend:** Bei einer Anfrage mit gültiger Sitzung, deren letzte Verlängerung mehr als
  24 Stunden zurückliegt, setzt der Server «zuletzt genutzt» neu und schickt das Cookie mit
  neuer Laufzeit. Gültig ist eine Sitzung höchstens 365 Tage nach «zuletzt genutzt».
- **Gültig** ist eine Sitzung, wenn die Zeile existiert, nicht abgelaufen ist, ihre
  Sitzungsversion der des Kontos entspricht, das Konto nicht gesperrt und das Mitglied
  *aktiv* ist.
- **Login:** Der Server legt eine neue Zeile an. Schickt das Gerät dabei ein altes Cookie mit,
  wird dessen Zeile gelöscht (SI-06: beim Login eine neue Kennung).
- **Abmelden** löscht die Zeile und das Cookie.
- **Widerruf:** Die Server-Funktion erhöht die Sitzungsversion und löscht die Zeilen des
  Kontos.
- **Aufräumen:** Abgelaufene Zeilen löscht der Server bei jedem Login, in derselben
  Transaktion. Einen eigenen Job gibt es nicht.
- Gespeichert werden keine IP-Adresse und kein Gerätename.
- `hooks.server.ts` prüft das Cookie bei jeder Anfrage an `/api/*` und legt das Konto in
  `event.locals` ab. Die Schnittstellen entscheiden selbst, ob sie eine Sitzung verlangen
  (SI-11).

## Rate Limits (Arbeitsspeicher)

| Schlüssel | Grenze | Bei Überschreitung |
|-----------|--------|---------------------|
| Fehlversuche Brief-Code pro IP | 10 pro Stunde | Meldung «zu viele Versuche», Status 429 |
| Code-Anfragen pro IP | 10 pro Stunde | Status 429, dieselbe Meldung für alle |
| Code-Mails pro Adresse | 3 pro Stunde, 10 pro Tag | keine Mail, aber **dieselbe** Antwort wie sonst |
| Fehlversuche Mail-Code pro IP | 10 pro Stunde (meine Annahme, analog Brief-Code) | wie Brief-Code |

- Gleitende Fenster in einer `Map`. Einträge werden spätestens nach 24 Stunden vergessen
  (DS-06), ein Zeitgeber räumt auf. Die Zeit kommt von aussen, damit sie testbar ist.
- Der Zähler pro Adresse arbeitet mit der normalisierten Adresse (klein geschrieben,
  ohne Leerzeichen am Rand) und zählt jede Anfrage, ob ein Konto besteht oder nicht.
- Die Client-IP liefert `event.getClientAddress()`. Hinter dem Reverse Proxy von #32 muss
  `adapter-node` die richtige Kopfzeile lesen (`ADDRESS_HEADER`, `XFF_DEPTH`). Das ist eine
  **Schnittstelle zu #32** und wird in `docs/ci-cd-und-release.md` vermerkt.

## Code per E-Mail anfordern

- Die Schnittstelle antwortet sofort mit 202 und demselben Inhalt, sobald die Grenze pro IP
  geprüft ist. Konto suchen, Code erzeugen, speichern und die Mail verschicken passiert
  **nach** der Antwort im selben Prozess, ohne dass die Antwort darauf wartet. So dauert die
  Antwort für bekannte und unbekannte Adressen gleich lang.
- Für ein gesperrtes oder nicht aktives Konto geht keine Mail hinaus.
- Ein Fehler beim Versand wird ohne Inhalt geloggt («Code-Mail nicht versandt», höchstens mit
  dem Fehlercode). Das Mitglied fordert dann einfach nochmals an.
- **Die Mail** hat den Betreff «Dein Code für MyTCO». Im Text steht der Code gross und
  zuerst, dazu die Gültigkeit von 15 Minuten und der Satz «Hast du keinen Code angefordert?
  Dann kannst du diese Mail ignorieren.» Sie ist Text-only, ohne Link und ohne Bilder.
- **Absender, SMTP-URL** und Ansprechperson kommen aus Umgebungsvariablen (Annahmen K-11,
  K-21). Lokal zeigt `.env.example` auf Mailpit.
- Damit die Tests auf die Arbeit nach der Antwort warten können, gibt die Server-Funktion ein
  Promise zurück. Der Endpunkt wartet nicht darauf, der Test schon. Das ist kein Sonderweg
  für Tests, sondern derselbe Code.

## Schnittstellen (`src/routes/api/…/+server.ts`)

| Methode, Pfad | Zweck | Antwort |
|---------------|-------|---------|
| `POST /api/login/brief` | Login mit Brief-Code `{ code }` | 200 + Cookie · 400 `{ fehler: 'falsch' \| 'benutzt', kontakt? }` · 429 |
| `POST /api/login/mail-code` | Mail-Code anfordern `{ email }` | immer 202 `{}` · 429 nur über die IP-Grenze |
| `POST /api/login/mail` | Login mit Mail-Code `{ email, code }` | 200 + Cookie · 400 `{ fehler: 'falsch' }` (auch für unbekannte Adressen und verbrauchte Codes) · 429 |
| `GET /api/sitzung` | Wer bin ich? | 200 `{ vorname }` · 401 |
| `POST /api/logout` | Abmelden | 204, Cookie gelöscht |

Ändernde Anfragen schicken JSON. Fremde Seiten können das nur mit CORS-Preflight, und den
erlaubt MyTCO nicht. Zusammen mit `SameSite=Lax` reicht das als Herkunftsschutz (SI-10).
Der Builder prüft, ob SvelteKits eigener Origin-Check zusätzlich greift, und dokumentiert das
im ADR.

## Daten (Drizzle, neue Migration)

- **`mitglied`:** `id`, `vorname`, `nachname`, `strasse`, `plz`, `ort`, `email` (eindeutig,
  klein geschrieben gespeichert), `status` (`aktiv` · `ausgetreten` · `geloescht`). Die
  übrigen Felder aus dem Fachmodell kommen mit späteren Issues.
- **`konto`:** `id`, `mitglied_id` (eindeutig), `sitzungsversion` (Ganzzahl, Start 1),
  `gesperrt`, `brief_code_hash` (eindeutig, darf leer sein), `brief_code_ablauf`,
  `brief_code_benutzt_am`, `mail_code_hash`, `mail_code_ablauf`, `mail_code_fehlversuche`.
- **`sitzung`:** `kennung_hash` (Primärschlüssel), `konto_id`, `sitzungsversion`,
  `erstellt_am`, `zuletzt_genutzt`.

**Server-Funktionen** (Fachlogik in `src/lib/server/login/`, Regeln ohne Datenbankzugriff wie
im Testkonzept, die Datenbank in einer dünnen Schicht darüber):
`stelleBriefCodeAus(kontoId) → Klartext-Code` (der einzige Moment, in dem der Code existiert,
RR-04), `beendeAlleSitzungen(kontoId)`, plus das, was die Schnittstellen brauchen.

**Seed-Daten:** 2–3 erfundene Mitglieder mit Adressen `@example.org`, unter `tests/` bzw. als
`seed`-Datei, damit die Prüfung `testdaten` greift. `make dev` bekommt damit lokal ein Konto.
Einen Brief-Code dafür stellt ein Skript aus und gibt ihn einmal in der Konsole aus. Das ist
nur lokal und mit erfundenen Daten erlaubt.

## Manifest

- `static/manifest.webmanifest` mit `name` «MyTCO», `short_name`, `start_url` `/`,
  `scope` `/`, `display` `standalone`, Hintergrund- und Themenfarbe aus den Tokens,
  Symbole `icon-192.png` und `icon-512.png` (liegen schon in `static/`).
- Verweis in `src/app.html` (`<link rel="manifest">`). Das `apple-touch-icon` ist schon da.
- Die Farbwerte im Manifest sind Festwerte ausserhalb von `tokens.css`. Sie gehören ins
  Leitbild (Tabelle «Code-Stelle»), bevor sie in die Datei kommen (Regel in `CLAUDE.md`).
  Die Prüfung `design-festwerte` muss die Datei kennen oder ausnehmen.
- E2E: Das Manifest wird geladen und ist gültiges JSON mit `display: standalone`. Ob es
  die Content-Security-Policy erlaubt, prüft der Builder, falls schon eine gesetzt ist.
- Die Anleitung im Brief beschreibt das Hinzufügen mit diesem Manifest. Auf Android ist das
  «App installieren» bzw. «Zum Startbildschirm hinzufügen» in Chrome, auf dem iPhone
  «Teilen → Zum Home-Bildschirm».

## Musterbrief

- Eine HTML-Vorlage (Funktion, die HTML erzeugt, alle eingesetzten Werte HTML-maskiert) in
  A4 mit Druck-CSS. Inhalt:
  - Adressfeld für ein Fensterkuvert. Annahme K-16.1: C5/6 mit Fenster rechts, die Position
    ist eine Konstante.
  - Begrüssung «Hoi <Vorname>».
  - QR-Code zur App-Adresse mit der Adresse als Text darunter.
  - Der Brief-Code gross, in Festbreitenschrift, in zwei Fünfergruppen, dazu «gültig bis
    <Datum>».
  - Eine bebilderte Anleitung in fünf Schritten für iPhone und Android. Die Bilder sind
    eigene einfache SVG-Symbole im Stil des Leitbilds (Teilen-Symbol, Drei-Punkte-Menü),
    keine Bildschirmfotos (meine Annahme).
  - Die Ansprechperson bei Problemen (Annahme K-21) und der Hinweis auf die
    Datenschutzerklärung (Art. 19 nDSG).
- Die Farben und Schriften kommen aus `tokens.css`, wie beim Leitbild.
- `make musterbrief` erzeugt mit Playwright (`page.setContent`, `page.pdf`) die Datei
  `build/musterbrief.pdf` (gitignoriert) aus einem erfundenen Mitglied und einem frisch
  erzeugten, nirgends gespeicherten Code.
- Später druckt der Admin denselben Brief aus der Verwaltung. Dafür wandert
  `qrcode-generator` zu den `dependencies`. Das gehört nicht zu diesem Issue.

## Tests und Nachweis

| Ebene | Was |
|-------|-----|
| Einheit | Code-Erzeugung (Alphabet, Länge, Gleichverteilung grob), Normalisierung (UI-07), HMAC, Ablauf, Rate Limiter mit falscher Zeit, Gleitregel der Sitzung, Brief-HTML maskiert und enthält Code, QR und Ansprechperson |
| Datenbank | FR-24 Code gilt nur einmal, beide Codes nach Login ungültig, Brief-Code «benutzt», Mail-Code ersetzt nur Mail-Code, 5 Fehlversuche, gesperrtes Konto, Widerruf über Sitzungsversion (SI-07), Abmelden, abgelaufene Sitzung, Aufräumen, Schnittstellen mit/ohne Sitzung, SI-04 gleiche Antwort, Grenze pro Adresse, RR-04 kein Klartext in der Datenbank, SI-05 kein Code und keine Adresse im Log (Konsole abfangen) |
| E2E (iPhone, Android, Desktop) | Login mit Brief-Code → Startseite → Neuladen bleibt angemeldet → Abmelden. Code per E-Mail über Mailpit, mit Neuladen zwischen Anfrage und Eingabe (Adresse bleibt erhalten). Manifest geladen. Widerruf → nächster Aufruf zeigt Login. Meldung bei benutztem Code. axe auf jedem Bildschirm, Screenshots |
| Von Hand | Startbildschirm-App auf echtem iPhone und Android: Checkliste vor dem Release auf der Test-Umgebung (#32). Lokal nicht nachweisbar, das wird im Bericht so gesagt |

Die Test-IDs folgen dem Testkonzept. Werden FR-24 und RR-04 im Fachmodell auf `umgesetzt`
gesetzt, verlangt die CI ihre Tests. A-LOGIN-08, -09 und -10 bleiben `geplant`, bis sie
live sind. Dieser Punkt bleibt dem Builder überlassen, solange die CI es erlaubt.

## Doku, die mitgeht

- **ADR-004** «Login per Einmal-Code ohne Passwort»: Code statt Passwort, Brief-Code,
  Mail-Code, Sitzungstabelle statt signiertem Cookie (weicht von der Wortwahl «signiertes
  Cookie» im Issue ab, mit Begründung), Rate Limit im Arbeitsspeicher, zwei getrennte Codes,
  einheitliche Meldung beim Mail-Code, Pakete. Restrisiko: Wer eine Adresse kennt, kann mit
  5 falschen Versuchen den laufenden Mail-Code entwerten. Das Mitglied fordert dann einen
  neuen an, und die IP-Grenze bremst das. Die Varianten B und C bleiben als «offen, Test in reflexionsinstrument#41».
- **Fachmodell:** Konto mit zwei Codes, FR-24 präzisiert. **RR-04** sinngemäss.
- **Sicherheitskonzept:** Tabelle *Login* um «ersetzt nur Codes derselben Art, Login macht
  beide ungültig» ergänzen. SI-06 um die Sitzungstabelle ergänzen.
- **Datenschutz:** Unter *Löschen* neu «Sitzungen: beim Abmelden, beim Widerruf oder nach einem
  Jahr ohne Nutzung» und «E-Mail-Adresse im Gerätespeicher während der Code-Anfrage:
  nach dem Login, spätestens nach 15 Minuten». Unter *Welche Daten* ist «Konto» schon
  erfasst. Die Datenschutzerklärung erhält einen Satz zum Gerätespeicher und wird geprüft,
  ob sie die Sitzungstabelle abdeckt.
- **`docs/ci-cd-und-release.md`:** neue Umgebungsvariablen (Code-Schlüssel, SMTP-URL,
  Absender, Ansprechperson, App-Adresse, Client-IP-Kopfzeile) als Schnittstelle zu #32.
- `docs/context-scopes.md`, `docs/versionen.md` (Unveröffentlicht), `.env.example`, README
  bei Bedarf.
- `docs/abklaerungen.md` wird **nicht** umgebaut.

## Dem Builder überlassen

Dateischnitt innerhalb von `src/lib/server/login/`, Namen von Funktionen und Spalten, die
Svelte-Komponenten der Login-Seite (aktuelle Doku über den Svelte-MCP), wie die E2E-Tests
Seed und Brief-Code anlegen (direkt über die Server-Funktionen im Global-Setup), der genaue
Wortlaut der Mail und des Briefs innerhalb der Vorgaben oben, und die Reihenfolge der
Umsetzung (TDD).
