[← Übersicht](../index.md)

# Anforderungen

## Quellen

| Datum | Quelle | Datei |
|-------|--------|-------|
| 22.10.2026 | Anforderungsdokument „Anforderungen MyTCO“, Version 1.2, vom Verein | [`2026-10-22-anforderungen-mytco-v1.2.pdf`](2026-10-22-anforderungen-mytco-v1.2.pdf) |
| 29.10.2026 | Zielsetzung des Projektleiters nach dem ersten Gespräch mit dem Verein | dieser Abschnitt unten |

Jede Anforderung aus beiden Quellen steht mit fester ID in
[`anforderungen.md`](anforderungen.md); darauf verweisen ADRs, Issues und Tests.

## Zielsetzung vom 29.10.2026

- MyTCO wird **unabhängig von Fairgate und der heutigen Website** aufgebaut.
- **Bis März 2027:** Admin-Rolle mit einer Seite zur Mitgliederverwaltung. Mitglieder
  werden von Hand hinzugefügt, solange Fairgate nicht angebunden ist. Das Login für
  Mitglieder funktioniert: Die Zugangsdaten gehen per Brief raus, beim ersten Login
  wird das Einmalpasswort ersetzt.
- **Bis Mitte Mai 2027:** Anmeldung zur Clubmeisterschaft möglich.
- **Ab dann:** Funktionen für die Clubmeisterschaft — Datenaustausch Swiss Tennis ↔
  MyTCO, Resultatmeldung durch die Spieler selbst.
- **Bis Oktober 2027:** Lizenz aktualisieren oder stornieren. Ablauf: Mitglieder stellen
  den Antrag in MyTCO. Der Lizenzverantwortliche des Vereins sieht zu einem Stichtag die
  Liste der beantragten Lizenzen und Stornos, exportiert sie und pflegt sie von Hand auf
  der Website von Swiss Tennis.
- **Wunsch:** MyTCO als einfache Mobile-App für Android und iOS, damit Benachrichtigungen
  per Push möglich sind. Muss bei der Wahl der Technik berücksichtigt werden.
- **Kosten:** Laufende Kosten im niedrigen dreistelligen Bereich pro Jahr übernimmt der
  Verein voraussichtlich. Die Kosten werden im Detail dokumentiert und analysiert.

## Änderungsprotokoll

| Datum | Änderung | Quelle |
|-------|----------|--------|
| 29.10.2026 | Zielsetzung und Etappen festgelegt (siehe oben, [Roadmap](../roadmap.md)) | Projektleiter |
| 29.10.2026 | Anforderungen mit IDs erfasst ([`anforderungen.md`](anforderungen.md)); Newsfeed aus der WhatsApp-Gruppe zum Verwerfen vorgeschlagen, weil nicht machbar (A-NEWSFEED-02; Bestätigung durch den Verein offen) | Projektleiter |
| 29.10.2026 | Technik der App entschieden: zuerst installierbare Web-App mit Admin-Bereich und Web Push, Store-App bei Bedarf ([ADR-001](../adr/adr-001-web-app-zuerst.md)); beantwortet die Frage „Store oder Browser zum Mitglieder-Login“ vorläufig | Projektleiter |

## Offene Fragen an den Verein

Punkte für die nächste Sitzung. Erledigte Fragen wandern mit Antwort ins Änderungsprotokoll.

- Bestätigung der Termine *Fundament* (15.12.2026) und *CM-Betrieb* (30.06.2027).
- Wer betreut MyTCO langfristig mit, falls der Projektleiter ausfällt?
- Auf wen laufen die Konten (GitHub, Hosting, App-Stores, Domain)? Kann der Verein als
  Herausgeber in den App-Stores auftreten?
- Wer ist im Verein für den Datenschutz verantwortlich? Dürfen Spieler die Kontaktdaten
  ihrer Gegner sehen?
- Muss der Gegner ein gemeldetes Resultat bestätigen? (Im Anforderungsdokument offen.)
- Was läuft heute bei der Clubmeisterschaft am schlechtesten, und wurde der Spielplan in
  Advantage schon ausprobiert?
- Darf `my.tcolten.ch` für MyTCO verwendet werden? (Absprache mit dem Website-Betreuer.)

**Aus der Erfassung der Anforderungen (29.10.2026)** — IDs siehe [`anforderungen.md`](anforderungen.md):

- Die mit \* markierten Etappen und Status in `anforderungen.md` sind Vorschläge des
  Projektleiters. Passen sie?
- Das PDF nennt vier Personen mit Vornamen: für die Registrierung über die Website, für
  das Format der Lizenzliste und für die Spielformen der Kategorien. Welche Rolle hat
  jede im Verein? (Die Doku nennt nur Rollen.)
- Erwartet der Verein, dass MyTCO im App Store und bei Google Play zu finden ist? MyTCO
  startet als Web-App, die Store-App folgt bei Bedarf ([ADR-001](../adr/adr-001-web-app-zuerst.md)). (N-APP-01)
- Ist der TCO als gemeinnützig anerkannt (z. B. steuerbefreit)? Dann könnte Apple die
  Jahresgebühr von USD 99 für die Store-App erlassen ([ADR-001](../adr/adr-001-web-app-zuerst.md)).
- Wer druckt und verschickt die Briefe mit den Zugangsdaten? Und wie kommt ein Mitglied
  wieder hinein, wenn es sein Passwort vergessen hat — neuer Brief oder E-Mail? (A-LOGIN-01)
- Sollen Mitglieder ihre Adresse in MyTCO ändern können, solange Fairgate nicht angebunden
  ist? Wer überträgt die Änderung dann nach Fairgate? (A-KONTO-02)
- Was gehört zu „Mitgliedschaft ändern“ — Austritt, Wechsel der Mitgliederkategorie,
  anderes? (A-KONTO-04)
- Sind der Lizenzverantwortliche und die Verantwortlichen der Clubmeisterschaft eigene
  Rollen, oder Admin bzw. Anlässe-Veranstalter? (A-ROLLE, A-LIZENZ-03, A-TURNIER-01)
- Ist das Storno einer Lizenz dasselbe wie die Sistierung bei Swiss Tennis (Frist Ende
  Februar)? Welcher Stichtag gilt für die Liste der Anträge? (A-LIZENZ-02, A-LIZENZ-03)
- Höchstens 3 Anmeldungen: Zählt ein Doppel für beide Partner? Muss der Doppelpartner
  zustimmen, und wer gilt als „verfügbar“? (A-ANMELDUNG-02, A-ANMELDUNG-04)
- Wie wird die Klassierung eines Spielers bei der Anmeldung festgelegt: gibt er sie
  selbst an, oder prüft der Admin? (A-ANMELDUNG-03, A-ANMELDUNG-06)
- Dürfen Spieler sich bis zum Anmeldeschluss selbst wieder abmelden oder ummelden?
  (A-ANMELDUNG-07)
- Reichen für Benachrichtigungen zunächst E-Mail und Push? SMS und WhatsApp kosten pro
  Nachricht. (A-ANMELDUNG-08, A-ANMELDUNG-09)
- Soll der Spielplan des Finalwochenendes öffentlich, also ohne Login, sichtbar sein?
  (A-SPIELPLAN-08)
- Welche Ausfallzeit ist akzeptabel, besonders während der Clubmeisterschaft? (N-BETRIEB-01)

**Aus dem Glossar (29.10.2026)** — Begriffe siehe [`glossar.md`](../glossar.md):

- Advantage kennt ein Finaltableau, das direkt auf die Gruppenspiele folgt. Laut PDF
  eröffnet der TCO fürs Finalwochenende aber neue KO-Turniere. Warum, und bleibt das so?
- Gibt es bei der Clubmeisterschaft ein Nenngeld, und soll MyTCO festhalten, wer bezahlt hat?
- Welche Alterskategorien bietet die Clubmeisterschaft an?
