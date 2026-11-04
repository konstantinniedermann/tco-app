[← ADR-Index](adr-index.md)

# ADR-005: Der freiwillige Passkey wird mit SimpleWebAuthn gebaut

**Status:** Entschieden · **Datum:** 2026-11-04 · **Issue:** #44

## Kontext

Der Vorstand wünscht eine bequemere Anmeldung (K-02.1). [ADR-004](adr-004-login-einmal-code.md)
bleibt bei Einmal-Codes ohne Passwort und nimmt dazu einen **freiwilligen Passkey als
Komfort** auf (A-LOGIN-07): Er ist ein weiterer Weg zur selben Sitzung, der Mail-Code bleibt
gültig. Offen war, wie der Passkey gebaut wird und mit welchem Paket. Das Design steht in der
[Spec zu #44](../superpowers/specs/2026-11-04-passkey-design.md).

Randbedingungen:

- Die Prüfung einer Passkey-Antwort (Challenge, Herkunft, Signatur, Zähler) ist
  sicherheitskritisch und fehleranfällig: CBOR, COSE-Schlüssel, ASN.1-Signaturen.
- Ein App-Prozess, einige hundert Mitglieder ([ADR-003](adr-003-hosting-infomaniak-vps.md)).
- Die Bauregel aus [ADR-002](adr-002-sveltekit-postgresql.md): nur JSON-Schnittstellen.
- Der Nutzer schreibt keinen Code; die Technik muss dem Agenten gut bekannt und breit
  dokumentiert sein.
- Ein neues Paket braucht die Freigabe des Projektleiters.

## Optionen

| Option | Dafür | Dagegen |
|--------|-------|---------|
| **A · Selbst bauen** (Web Crypto, eigener CBOR-Parser) | Keine Abhängigkeit | Kryptografie und Formatprüfung selbst zu pflegen ist das grösste Risiko des Vorhabens; Fehler fallen nicht auf |
| **B · SimpleWebAuthn** (`@simplewebauthn/server`, `/browser`) | Verbreitet, gut dokumentiert, TypeScript, MIT; Server 14.0.3 vom 25.09.2026 gepflegt; Server und Browser passen zusammen | Zwei neue Pakete mit Unterpaketen |
| **C · Andere Bibliothek** (z. B. `fido2-lib` nur für den Server, `@github/webauthn-json` nur für den Browser) | Teils kleiner | Weniger verbreitet oder nur eine Hälfte (Browser oder Server); schlechter dokumentiert |
| **D · Dienst eines Anbieters** (gehostete Passkey-Anmeldung) | Wenig Code | Laufende Kosten, Mitgliederdaten bei einem Dritten (Vorgaben im [Datenschutzkonzept](../datenschutz.md)), Abhängigkeit für den Login |

## Entscheidung

**Der freiwillige Passkey wird mit SimpleWebAuthn gebaut (Variante B).** Die Prüfung der
Antworten ist Sache einer geprüften, verbreiteten Bibliothek, nicht von eigenem Code. Die
Challenges liegen im Arbeitsspeicher, die Passkeys in der Datenbank; das Ergebnis ist eine
Sitzung wie beim Code-Login.

Freigegeben vom Projektleiter am 04.11.2026:

| Paket | Version | Art | Lizenz, Unterpakete |
|-------|---------|-----|---------------------|
| `@simplewebauthn/server` | 14.0.3 | dependencies (läuft live) | MIT; `@peculiar/*` (ASN.1, X.509), `@levischuck/tiny-cbor`, `@hexagon/base64`, `reflect-metadata` |
| `@simplewebauthn/browser` | 14.0.0 | dependencies (im Browser-Bundle) | MIT, keine |

Festwerte der Relying Party: Name `MyTCO`; ID = Hostname der Adresse, erwartete Herkunft = deren
Origin; `residentKey` und `userVerification` jeweils `required`; `attestationType` `none`.

## Konsequenzen

**Leichter:** Kein eigener Krypto- und Formatcode. Die Bibliothek wirft bei jeder
ungültigen Antwort einen Fehler; die Schnittstelle übersetzt ihn in eine feste Meldung.

**Schwerer:** Zwei Pakete mit eigenen Unterpaketen sind zu beobachten (Updates, Meldungen).
Die Typen der Bibliothek ändern sich zwischen Hauptversionen; die Feldnamen von 14.x gelten.

**Restrisiken:**

- Ein Adresswechsel der App (anderer Hostname) macht alle Passkeys ungültig, weil die
  Relying-Party-ID am Hostnamen hängt. Der Mail-Code bleibt der Weg zurück.
- Es gibt Fehlerberichte zu Passkey-Abfragen in iPhone-Apps vom Startbildschirm: Die Abfrage
  wiederholt sich oder hängt (Quelle 1, iOS 18.6.2). Auf echten Geräten noch nicht geprüft;
  der Passkey ist freiwillig, der Code funktioniert immer.
- Gerätevoraussetzung: iOS 16 bzw. Android 9, jeweils mit Bildschirmsperre (Quellen 2, 3).
  Ältere Geräte nutzen den Code.
- Ein synchronisierter Passkey ist so sicher wie das Apple- bzw. Google-Konto dahinter
  (Quelle 5). Er ersetzt den Mail-Code nicht und schützt daher nicht gegen ein gehacktes
  Postfach (siehe ADR-004, Nachtrag). Mehrere Wege zum Konto sind für die Wiederherstellung
  gewollt (Quelle 4).
- Challenges im Arbeitsspeicher: Ein Neustart verwirft offene Vorgänge; das Mitglied
  versucht es neu.
- Das Anfordern der Anmelde-Optionen ist nicht begrenzt: Wer es massenhaft tut, füllt die
  höchstens 1000 offenen Challenges und verdrängt echte. Das blockiert nur den Passkey-Weg,
  der Login per Code bleibt (Entscheid R3).
- Auch erfolgreiche Passkey-Anmeldungen zählen zur Grenze von 10 pro IP und Stunde. Gezählt
  wird vor dem ersten `await`, damit parallele Anfragen die Grenze nicht umgehen. Mitglieder
  hinter einer gemeinsamen Verbindung (z. B. Club-WLAN) fallen dann auf den Code zurück
  (Entscheid R4).
- Die Antwortzeit unterscheidet einen unbekannten von einem bekannten Passkey; messbar wäre
  nur, ob eine zufällige Credential-ID existiert. Die IDs sind nicht erratbar, die Bremse
  gilt.
- Wird ein Konto in den Millisekunden zwischen Laden und Anlegen der Sitzung gelöscht, ergibt
  das einen Fehler 500 statt einer Sitzung.
- Die Relying-Party-ID ist die Adresse, unter der die App läuft (in Produktion aus `ORIGIN`).
  Der Wechsel von der Übergangsadresse zu `my.tcolten.ch` (K-10) macht darum alle Passkeys
  ungültig: Mitglieder melden sich mit dem Code an und sehen den Hinweis wieder.

**Kosten:** keine laufenden.

## Reevaluations-Trigger

1. Die Bibliothek wird mehr als 12 Monate nicht mehr gepflegt (keine Version, offene
   Sicherheitsmeldungen).
2. Ein Passkey soll den Mail-Code für das Konto sperren (Schutz gegen ein gehacktes Postfach):
   neuer Entscheid mit Weg zurück über den Admin.
3. Eine Store-App kommt ([ADR-001](adr-001-web-app-zuerst.md)): Relying-Party-ID und
   Verknüpfung der App mit der Domain neu klären.
4. MyTCO läuft in mehr als einem App-Prozess: Die Challenges gehören dann in die Datenbank.

## Quellen

Abgerufen am 04.11.2026.

1. Apple Developer Forums, Thread 815784 (Feb. 2026): Passkey-Abfragen wiederholen sich oder
   hängen bei einer vom Startbildschirm gestarteten Web-App, iOS 18.6.2
   <https://developer.apple.com/forums/thread/815784>
2. Swisscom Trust Services, Hilfeseite zu Passkeys: Voraussetzungen iOS 16 und Android 9 mit
   Bildschirmsperre
   <https://trustservices.swisscom.com/en/support/help-center/what-do-i-need-to-use-passkey>
3. Cathay Pacific, FAQ zu Passkeys: Geräte- und Systemvoraussetzungen
   <https://www.cathaypacific.com/cx/en_AU/faqs/cathay-membership-programme/sign-in-account-security/passkey/what-do-i-need-to-create-a-passkey.html>
4. FIDO Alliance, White Paper zu mehreren Authenticators und zur Kontowiederherstellung
   <https://fidoalliance.org/white-paper-multiple-authenticators-for-reducing-account-recovery-needs-for-fido-enabled-consumer-accounts/>
5. Yubico, Blog zu synchronisierten Passkeys und NIST AAL2
   <https://yubico.com/blog/new-nist-guidance-on-passkeys-key-takeaways-for-enterprises>
6. npm: `@simplewebauthn/server` 14.0.3 (geändert am 25.09.2026, MIT)
