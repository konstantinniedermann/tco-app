[← ADR-Index](adr-index.md)

# ADR-004: Mitglieder melden sich mit einem Einmal-Code an, ohne Passwort

**Status:** Entschieden · **Datum:** 2026-11-02 · **Issue:** #29

## Kontext

Mitglieder erhalten ihren Zugang per Brief (A-LOGIN-01) und melden sich ohne Passwort an
(A-LOGIN-08). Danach bleiben sie ein Jahr gleitend angemeldet (A-LOGIN-09), und wer
herausfällt, holt sich einen Code per E-Mail (A-LOGIN-10). Die Werte stehen im
[Sicherheitskonzept](../sicherheitskonzept.md#login) (SI-01 bis SI-07, SI-10), die Löschfristen
im [Datenschutzkonzept](../datenschutz.md#löschen) (DS-06).

Randbedingungen:

- Auf dem iPhone hat die App auf dem Startbildschirm einen eigenen Speicher. Ein Login in
  Safari, etwa über einen Link oder einen QR-Code, kommt dort nicht sicher an (Recherche zu
  #29, auf echten Geräten noch nicht geprüft).
- Ein App-Prozess auf einem Server ([ADR-003](adr-003-hosting-infomaniak-vps.md)), einige
  hundert Mitglieder.
- Die Bauregel aus [ADR-002](adr-002-sveltekit-postgresql.md): Der Server bietet nur
  JSON-Schnittstellen, keine Form Actions.

## Optionen

| Option | Dafür | Dagegen |
|--------|-------|---------|
| **A · Code in der App auf dem Startbildschirm eintippen** (Brief-Code, Ersatz per Mail-Code) | Der Login passiert in der App selbst, das klappt auch auf dem iPhone; nichts zu merken | 10 Zeichen abtippen; wer das Postfach hat, hat das Konto |
| **B · Login-QR im Brief, vor dem Hinzufügen zum Startbildschirm scannen** | Nichts abtippen | Ob die Sitzung auf dem iPhone in die App übergeht, ist offen |
| **C · Link in der Mail** | Ein Tipp | Der Link öffnet Safari oder die Mail-App, nicht die App auf dem Startbildschirm |
| **D · Passwort** | Vertraut | Wer es vergisst, braucht ohnehin einen Weg per Mail; A-LOGIN-02 ist verworfen |
| **E · Passkey** | Am sichersten | Nicht auf jedem Gerät der Mitglieder; kommt später als Zusatz (A-LOGIN-07) |

## Entscheidung

**Mitglieder tippen einen Einmal-Code in die App auf dem Startbildschirm: zuerst den Code aus
dem Brief, später bei Bedarf einen Code aus der Mail (Variante A). Die Sitzung liegt in einer
Tabelle, die Bremsen gegen Durchprobieren liegen im Arbeitsspeicher.**

| Thema | Entscheid | Begründung |
|-------|-----------|------------|
| Zwei Codes je Konto | Brief-Code und Mail-Code in getrennten Feldern. Ein neuer Code ersetzt nur den alten derselben Art; ein Login mit einem der beiden macht beide ungültig, der Brief-Code gilt dann als «benutzt» | Ein angeforderter Mail-Code entwertet keinen ungeöffneten Brief. Ein gestohlener und benutzter Brief fällt auf (B-03) |
| Speicherung | Beide Codes als HMAC-SHA-256 mit Server-Schlüssel | Ein Leck der Datenbank macht die rund 50 Bit des Brief-Codes nicht durchrechenbar (SI-01) |
| Meldung beim Mail-Code | Falsch, abgelaufen, nach 5 Fehlversuchen ungültig oder unbekannte Adresse: immer dieselbe Meldung | Eine eigene Meldung verriete, dass zur Adresse ein Konto besteht (B-02, SI-04) |
| Bremsen | Zähler pro IP und pro Adresse nur im Arbeitsspeicher; ein Neustart setzt sie zurück. Die 5 Fehlversuche je Mail-Code stehen in der Datenbank | Keine IP-Adresse auf der Festplatte (DS-06), kein Aufräum-Job; ein Prozess genügt |
| Sitzung | Tabelle statt signiertem Cookie, siehe unten | Abmelden und Widerruf wirken sofort |
| Herkunftsschutz | Ändernde Schnittstellen nehmen nur JSON an, siehe unten | SvelteKits eigene Prüfung greift bei JSON nicht |

### Sitzungstabelle statt signiertem Cookie

Das Issue spricht von einem «signierten Cookie». Gebaut ist eine Tabelle: Das Cookie trägt
nur eine zufällige Kennung (32 Bytes), die Datenbank ihren SHA-256-Hash, eine Zeile pro
Gerät. Ein signiertes Cookie bliebe bis zum Ablauf gültig; Abmelden auf einem Gerät (SI-06)
ginge nur mit einer Sperrliste, also wieder mit einer Tabelle. Die Sitzungsversion (SI-07)
wirkt zusätzlich. Preis: eine Datenbankabfrage pro Aufruf einer Schnittstelle, bei einigen
hundert Mitgliedern unerheblich.

### Herkunftsschutz

Jede ändernde Schnittstelle nimmt nur `Content-Type: application/json` an, sonst antwortet
sie mit 415. Eine fremde Seite kann JSON nur nach einem CORS-Preflight schicken, und den
erlaubt MyTCO nicht. Dazu kommt das Cookie mit `SameSite=Lax` (SI-10).

SvelteKits eigene Herkunftsprüfung hilft hier nicht: Sie prüft nur Anfragen ohne oder mit
Formular-Content-Type (`application/x-www-form-urlencoded`, `multipart/form-data`,
`text/plain`) und Remote Functions, und nur im Produktionsbetrieb (Quelle 1). JSON-Anfragen
lässt sie durch.

### Freigegebene Pakete

Freigegeben vom Projektleiter am 02.11.2026:

| Paket | Version | Art | Lizenz, Abhängigkeiten |
|-------|---------|-----|------------------------|
| `nodemailer` | 10.x | dependencies (Code-Mail, läuft live) | MIT-0, keine |
| `qrcode-generator` | 2.x | devDependencies (vorerst nur Musterbrief) | MIT, keine |
| Docker-Image `axllent/mailpit` | v1.33 | nur lokal und in der CI | — |

### Varianten B und C

Bleiben offen für den Test in konstantinniedermann/reflexionsinstrument#41. Diese Entscheidung
verbaut sie nicht: Beide wären ein weiterer Weg zur selben Sitzung. Ob Variante A auf echten
Geräten klappt, prüft die [Checkliste vor dem Release](../testkonzept.md#checkliste-vor-dem-release)
auf der Test-Umgebung (#32).

## Konsequenzen

**Leichter:** Kein Passwort, also kein Zurücksetzen und kein Passwortspeicher. Abmelden und
Widerruf wirken beim nächsten Aufruf.

**Schwerer:** Jedes Mitglied braucht einen Brief (K-16) und eine erreichbare E-Mail-Adresse
(K-11). Hinter dem Reverse Proxy muss die App die Client-IP aus einer vertrauenswürdigen
Kopfzeile lesen, sonst teilen alle Mitglieder eine IP und damit die Bremsen
([Schnittstelle zu #32](../ci-cd-und-release.md#einstellungen-der-app)).

**Restrisiken:**

- Wer eine Adresse kennt, kann mit 5 falschen Versuchen den laufenden Mail-Code entwerten.
  Das Mitglied fordert einen neuen an; die IP-Grenze bremst den Angreifer.
- Beim Mail-Code zählt die IP-Grenze jeden Versuch, auch erfolgreiche. Im gemeinsamen WLAN
  des Clubhauses sind so höchstens 10 Logins per Mail-Code pro Stunde möglich. Der Brief-Code
  zählt nur Fehlversuche.
- Ein Neustart setzt die Bremsen zurück.

**Kosten:** keine neuen; der Mail-Versand hängt an K-11 ([ADR-003](adr-003-hosting-infomaniak-vps.md)).

## Reevaluations-Trigger

1. Der Test in reflexionsinstrument#41 oder die Checkliste vor dem Release zeigt, dass B oder
   C auf dem iPhone zuverlässig klappt, oder dass A scheitert.
2. MyTCO läuft in mehr als einem App-Prozess: Dann hat jeder Prozess eigene Zähler, und die
   Bremsen gehören in die Datenbank.
3. Zwei-Faktor-Login oder Passkeys werden verlangt (A-LOGIN-06, A-LOGIN-07).

## Quellen

Abgerufen am 02.11.2026.

1. SvelteKit 3.1.1: `src/runtime/server/csrf.js` (`is_csrf_forbidden`) und
   `src/utils/http.js` (`is_form_content_type`) im Paket `@sveltejs/kit`;
   [Konfiguration `csrf`](https://svelte.dev/docs/kit/configuration#csrf) — «CSRF checks only
   apply in production»
