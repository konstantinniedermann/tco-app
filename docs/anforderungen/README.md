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
| 29.10.2026 | Fachmodell ([`fachmodell.md`](../fachmodell.md)): Junioren vorerst ausgeklammert, alle Mitglieder wie Volljährige (K-08 bleibt offen); neu der Wildcard-Antrag für Kategorien ausserhalb des eigenen Klassierungsbereichs (A-ANMELDUNG-10) | Projektleiter |
| 29.10.2026 | [Rollen und Rechte](../rollen-und-rechte.md): neue Rollen CM-Verantwortlicher (A-ROLLE-07) und Lizenzverantwortlicher (A-ROLLE-08); sie übernehmen die CM- bzw. Lizenzaufgaben, der Admin vertritt sie (A-ANMELDUNG-06, A-RESULTAT-07, N-APP-03 angepasst). Anlässe-Veranstalter auf *später* verschoben (A-ROLLE-04) | Projektleiter |
| 29.10.2026 | [Rollen und Rechte](../rollen-und-rechte.md): neue Rollen CM-Verantwortlicher (A-ROLLE-07) und Lizenzverantwortlicher (A-ROLLE-08); sie übernehmen die CM- bzw. Lizenzaufgaben, der Admin vertritt sie (A-ANMELDUNG-06, A-RESULTAT-07, N-APP-03 angepasst). Anlässe-Veranstalter auf *später* verschoben (A-ROLLE-04) | Projektleiter |

## Offene Fragen an den Verein

Alle offenen Fragen an Vorstand, Website-Betreuer, Hoster und Verantwortliche stehen mit
fester ID, Ansprechperson und Fälligkeit in den [Abklärungen beim Verein](../abklaerungen.md).
Beantwortete Fragen wandern mit Antwort ins Änderungsprotokoll oben.
