# Design: Test-Umgebung vorbereiten und Absicherungen (#39, Teil ohne Server)

Stand 03.11.2026 · Issue [#39](https://github.com/konstantinniedermann/tco-app/issues/39) ·
baut auf dem [Design zu Server und Auslieferung](2026-11-02-server-und-auslieferung-design.md) auf.

## Absicht

Der Server ist noch nicht bestellt: Der Projektleiter wartet die Antwort des Vereins zu K-04
(auf wen die Konten laufen) ab, weil der VPS Lite ein Jahr bindet. Alles aus #39, was ohne
Server gebaut und belegt werden kann, wird jetzt fertig. Ist der Server da, bleibt nur
Bestellen, Härten, Einrichten und Einschalten.

Ziel ist, dass die erste Auslieferung auf Test sofort eine benutzbare Demo ergibt und dass
Test nie eine Mail an jemand anderen als den Projektleiter schickt.

## Umfang

**Dabei** (vom Projektleiter gewählt):

1. Testdaten auf Test
2. Mail-Umleitung auf Test (`MAIL_NUR_AN`)
3. Absicherungen aus der Beobachtungs-Auswertung vom 03.11.2026
   ([Kommentar in #39](https://github.com/konstantinniedermann/tco-app/issues/39#issuecomment-6598339123)):
   Mail nur mit TLS, Bremsen pro IPv6-Anschluss, `wiederherstellen` ohne Daten im Protokoll und
   mit Sicherung vorher

**Nicht dabei** (bleibt in #39 für den Teil mit Server): Server bestellen, härten, einrichten;
Protokolle nach Zeit begrenzen (Logs 30 Tage, IP 24 h); Ergänzung `betrieb/README.md` zum
Betriebsbenutzer; Geheimnisse auf GitHub; Ein- und Ausschalten von Test und Live.

**Anti-Ziele:** Keine Mail von Test erreicht eine Adresse ausser `MAIL_NUR_AN`. Nichts davon
darf auf Live wirken. Keine echten Personendaten in Testdaten (DS-08). Keine neue Abhängigkeit.

## 1 · Mail-Umleitung auf Test

**Entscheid des Projektleiters: umleiten, nicht verwerfen.** Ist `MAIL_NUR_AN` gesetzt, geht
jede Mail der App an diese eine Adresse; der Betreff beginnt mit
`[Test für <ursprünglicher Empfänger>] `. Ist sie leer oder fehlt sie, ändert sich nichts.

- `leseEinstellungen` liest `MAIL_NUR_AN` als optionale Einstellung; ist sie gesetzt, muss sie
  wie eine Mail-Adresse aussehen (sonst startet die App nicht, Fehlertext nennt nur den Namen).
- Die Umleitung umhüllt den bestehenden `Mailer` (z. B. `leiteUm(mailer, ziel)`), damit
  `dienst.ts` davon nichts weiss. Verdrahtet in `src/lib/server/login/index.ts`.
- Der Name `MAIL_NUR_AN` bleibt (steht schon in Compose, `geheim.env.example`, Nachweis).
- **Meine Wahl, Schutz für Live:** `betrieb/bin/ausliefern live` und `betrieb/bin/zurueck live`
  (beide starten die Live-App mit `live/geheim.env`) brechen ab, bevor sie etwas ändern, wenn dort
  `MAIL_NUR_AN` nicht leer ist. Sonst gingen Codes der Mitglieder an den Projektleiter. Eine
  gemeinsame Prüfung in `lib.sh`; belegt im Nachweis.
- Doku angleichen: `docs/ci-cd-und-release.md` (Tabelle *Umgebungen*, Zeile E-Mail: «alle Mails
  gehen an die Adresse des Projektleiters, der Betreff nennt den ursprünglichen Empfänger»; die
  Tabelle der Einstellungen bekommt eine Zeile `MAIL_NUR_AN`), `betrieb/geheim.env.example`
  (Kommentar bleibt «umleiten», nennt den Betreff-Vorsatz).

## 2 · Testdaten auf Test

`betrieb/bin/ausliefern` setzt Test schon heute bei jeder Auslieferung zurück
(`down --volumes`), migriert und ruft danach `node scripts/testdaten.ts` im App-Container auf,
**sofern das Image die Datei enthält**. Diese Datei fehlt; sie wird jetzt gebaut.

- Legt einige erfundene Mitglieder mit Konto an, alle mit `@example.org` (Testmuster-Prüfung
  `scripts/pruefungen/testmuster.ts` muss sie erfassen). Mindestens die beiden aus
  `seed-lokal.ts`; Anzahl und Namen sind Sache des Bauenden.
- Stellt für ein Mitglied einen Brief-Code aus und **schickt ihn per Mail** über den normalen
  Mailer mit Umleitung: Betreff z. B. «Brief-Code für die Test-Umgebung», Text mit dem
  formatierten Code, der Gültigkeit und der Adresse der App (`MYTCO_ADRESSE`, sonst `ORIGIN`).
  Durch die Umleitung landet er beim Projektleiter, ohne Zugang zum Server. **Meine Wahl:**
  Der Code steht nie im Protokoll (`protokoll.log`).
- **Sperre:** Das Skript bricht ab (Exit ≠ 0, ohne etwas zu schreiben), wenn `MAIL_NUR_AN` leer
  ist. Damit läuft es auf Live nie, auch nicht von Hand. Eine Mitgliederdatenbank darf es nie
  anfassen. **Meine Wahl, zweite Sperre:** Es bricht ebenso ab, wenn die Tabelle der Mitglieder
  nicht leer ist (Test ist direkt davor zurückgesetzt). Das unterscheidet es von `seed-lokal.ts`,
  das mehrfach laufen darf; gemeinsam ist nur das Anlegen der erfundenen Mitglieder.
- **Meine Wahl, scheiternder Versand:** Scheitert nur die Mail mit dem Brief-Code, bleiben die
  Testdaten geladen und das Skript endet mit Erfolg; ins Protokoll kommt eine Zeile «Mail mit
  Brief-Code nicht versandt» (ohne Code, ohne Adresse). Sonst würde ein gestörter Mail-Zugang jede
  Auslieferung auf Test verhindern, und Test bliebe nach dem Zurücksetzen leer und gestoppt. Der
  Betriebs-Nachweis arbeitet weiter mit `smtp://mail.invalid:25` und prüft genau diese Zeile; die
  Umleitung selbst belegen die Unit-Tests.
- Login per Mail-Code mit jedem erfundenen Mitglied funktioniert danach ohne Weiteres: Der Code
  geht durch die Umleitung an den Projektleiter.
- **Image:** Die Laufzeit-Stufe im `Dockerfile` enthält heute nur `build/`, `drizzle/`,
  `scripts/migrate.ts` und Produktionsabhängigkeiten, **kein `src/`**. `testdaten.ts` braucht
  aber Schema, Login-Dienst, Codes und Mailer aus `src/lib/server/`. Wie das ins Image kommt,
  entscheidet der Bauende (z. B. eigener Bundle-Schritt im Build, oder die nötigen Dateien mit
  kopieren); Bedingung: läuft mit `node scripts/testdaten.ts` im Laufzeit-Image, nur mit
  Produktionsabhängigkeiten, ohne neue Abhängigkeit. Belegt mit `make rauchtest` oder
  `make betrieb-nachweis` (Testdaten auf Test geladen, Mail an `MAIL_NUR_AN` mit
  Betreff-Vorsatz).
- Gemeinsames mit `scripts/seed-lokal.ts` (erfundene Mitglieder anlegen) nicht doppelt halten.
- Doku: `docs/testkonzept.md`, *Checkliste vor dem Release*: Das Testkonto nutzt nicht mehr die
  Adresse des Projektleiters, sondern erfundene Mitglieder; Codes kommen über die Umleitung.
  `docs/ci-cd-und-release.md` beschreibt den Schritt «testdaten laden».

## 3 · Absicherungen

### 3a · Mail-Versand nur mit TLS

`docs/ci-cd-und-release.md` verlangt `smtps://` oder erzwungenes STARTTLS; `leseEinstellungen`
prüft das nicht. Neu: Mit `NODE_ENV=production` startet die App nicht, wenn `MYTCO_SMTP_URL`
weder `smtps://` ist noch STARTTLS erzwingt. Wie «erzwungen» in der URL ausgedrückt wird, legt
der Bauende fest und belegt es an der Dokumentation von nodemailer (z. B. `requireTLS`).

**Bedingung:** Rauchtest (`smtp://mail.invalid:25`), Betriebs-Nachweis, CI und E2E (Mailpit
mit `smtp://localhost:51025`) laufen weiter. Eine Ausnahme darf auf Live nicht unbemerkt greifen
können; der Bauende wählt den Weg (z. B. Ausnahme nur für lokale bzw. offensichtlich
nicht-produktive Hosts) und begründet ihn im Code-Kommentar und in `ci-cd-und-release.md`.
Fehlertext nennt nur den Namen der Variablen (SI-05).

### 3b · Bremsen pro IPv6-Anschluss

Heute zählen die Bremsen pro IP-Adresse; ein IPv6-Anschluss hat viele Adressen, ein Wechsel
umgeht die Grenzen. Neu: Vor dem Zählen wird die Adresse zum Schlüssel gemacht — IPv4 bleibt,
IPv6 wird auf das /64-Netz gekürzt, IPv4-mapped (`::ffff:a.b.c.d`) gilt als IPv4. Eine reine
Funktion mit Unit-Tests (kurze Schreibweise mit `::`, Zonenangabe, ungültige Eingabe), angewendet
an allen Stellen, an denen `dienst.ts` eine IP an eine Bremse gibt. Doku:
`docs/ci-cd-und-release.md` (Abschnitt um «IPv6-Clients … /64»), `docs/sicherheitskonzept.md`,
wo die Bremsen beschrieben sind.

### 3c · Keine Daten aus der Datenbank im Protokoll

`wiederherstellen` spielt per `psql` ein; scheitert eine Anweisung, stehen in `CONTEXT` (bei
`COPY` die ganze Zeile) und `DETAIL` (z. B. `Key (email)=(…)`) Werte im `protokoll.log`.
`probe` spielt per `pg_restore` ein, mit demselben Risiko.

**Massstab (meine Wahl, aus DS-06):** Kein Wert aus der Datenbank erreicht `protokoll.log`, auch
nicht über die Hauptzeile einer Fehlermeldung (z. B. `invalid input syntax for type date: "…"`).
`terse` allein reicht darum nicht. Dafür wird in Kauf genommen, dass das Protokoll weniger zur
Fehlersuche hergibt; die Sicherung selbst bleibt zum Nachsehen von Hand.

- `wiederherstellen`: `psql` meldet nur den Fehlercode (`VERBOSITY=sqlstate`) bzw. gleichwertig.
- `probe`: Von der Fehlerausgabe von `pg_restore` kommt nur die Zahl der Fehler (oder die
  SQLSTATE-Codes) ins Protokoll; der Rest wird verworfen. Der Bauende wählt die Umsetzung.
- **Nachweis:** Je ein Fall mit absichtlich scheiterndem Einspielen (z. B. Dublette einer
  eindeutigen Spalte) zeigt, dass ein erfundener Wert **nicht** im Protokoll steht, und als
  Gegenprobe, dass ohne die Massnahme er dort stünde (oder dass der Fehler überhaupt auftrat).

### 3d · Sicherung vor dem Zurückspielen

`wiederherstellen` ruft heute `sichern` nicht auf; ein Fehlgriff überschreibt Live ohne Rückweg.
Neu: Nach dem Nehmen der Sperre und **bevor** die App gestoppt wird, ruft `wiederherstellen`
`sichern <umgebung>` auf; scheitert das, bricht es ab, ohne etwas zu ändern. Für Test gilt
dasselbe (einfacher, schadet nicht).

**Entscheid des Projektleiters, Notschalter:** Ist die Datenbank kaputt, scheitert gerade diese
Sicherung. Darum gibt es eine ausdrückliche Angabe `ohne-sicherung` (Form der Angabe wählt der
Bauende, sie wird streng geprüft wie die übrigen); dann wird nicht gesichert, und das Protokoll
hält es fest. Nur von Hand auf dem Server, nie aus der CI oder dem Türsteher. Doku in
`betrieb/README.md` und `docs/ci-cd-und-release.md` (Tabelle der Befehle).

**Meine Wahl, kein Aufräumen dabei:** `sichern` endet sonst mit `forget --keep-within 30d --prune`.
Die Sicherung vor dem Zurückspielen räumt nicht auf, sonst könnte ein knapp 30 Tage alter, gerade
gewählter Lauf zwischen Auswahl und Einspielen verschwinden.

**Falle:** Ohne Lauf-Angabe spielt `wiederherstellen` den neuesten Snapshot ein. Der Lauf muss
**vor** der neuen Sicherung bestimmt werden, sonst wird gerade der eben gesicherte Stand
eingespielt. Nachweis: Ein bestehender Fall «wiederherstellen live → Zeile wieder da» bleibt
grün, und es gibt danach einen Snapshot mehr.

## Nachweis

- `make check` grün (Lint, Unit-Tests, Abdeckung, E2E, Doku-Prüfungen).
- Unit-Tests: Umleitung (Empfänger, Betreff-Vorsatz, ohne `MAIL_NUR_AN` unverändert),
  Einstellungen (`MAIL_NUR_AN` ungültig, SMTP ohne TLS in Produktion), IP-Schlüssel,
  Sperre von `testdaten.ts`.
- `make betrieb-nachweis` mit neuen Prüfungen: Testdaten auf Test geladen (Zeile «Mail mit
  Brief-Code nicht versandt», weil der Nachweis keinen Mail-Zugang hat); `ausliefern live` und
  `zurueck live` mit gesetztem `MAIL_NUR_AN` → fehler, nichts geändert; Protokoll ohne Werte bei
  scheiterndem Einspielen (`wiederherstellen` und `probe`); `wiederherstellen` legt vorher eine
  Sicherung an, mit `ohne-sicherung` nicht.

## Doku und Issue

- `docs/versionen.md` → *Unveröffentlicht*.
- `docs/beobachtungen.md`: nichts Neues erwartet; Befunde beim Bauen dorthin.
- Issue #39: erledigte Punkte der DoD abhaken bzw. in einem Kommentar belegen; offen bleibt der
  Teil mit Server. Label danach `needs-input` (Server-Bestellung wartet auf K-04).

## Dem Bauenden überlassen

Dateinamen und Aufteilung der Funktionen, Zahl und Namen der erfundenen Mitglieder, wie
`testdaten.ts` ins Laufzeit-Image kommt, wie STARTTLS-Zwang in der URL ausgedrückt wird und
welche Ausnahme für Test-Hosts gilt, wie `probe` die Fehlerausgabe säubert.
