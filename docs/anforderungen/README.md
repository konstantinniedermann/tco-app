[← Übersicht](../index.md)

# Anforderungen

## Quellen

| Datum | Quelle | Datei |
|-------|--------|-------|
| 22.10.2026 | Anforderungsdokument „Anforderungen MyTCO“, Version 1.2, vom Verein | [`2026-10-22-anforderungen-mytco-v1.2.pdf`](2026-10-22-anforderungen-mytco-v1.2.pdf) |
| 29.10.2026 | Zielsetzung des Projektleiters nach dem ersten Gespräch mit dem Verein | dieser Abschnitt unten |

Die Anforderungen werden im Milestone *Fundament* einzeln mit IDs erfasst, damit ADRs,
Issues und Tests darauf verweisen können. Bis dahin gelten das PDF und die Zielsetzung.

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
