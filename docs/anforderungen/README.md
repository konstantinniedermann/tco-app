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
- **Bis März 2027:** Rolle Mitglieder-Admin mit einer Seite zur Mitgliederverwaltung. Mitglieder
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
| 30.10.2026 | Erste Antworten aus den [Abklärungen](../abklaerungen.md#beantwortet): N-BETRIEB-01 ohne festen Zielwert (K-15); Kontaktdaten für Gegner, Doppelpartner und Verantwortliche wie vorgeschlagen, N-DATENSCHUTZ-02 damit festgelegt (K-31, K-42); kein Nenngeld (K-25); *Fundament* neu bis 26.11.2026 ([Roadmap](../roadmap.md)) | Projektleiter |
| 31.10.2026 | Login ohne Passwort ([#29](https://github.com/konstantinniedermann/tco-app/issues/29)): ein Brief mit Einmal-Code statt zwei Briefen (A-LOGIN-01), kein Passwortwechsel (A-LOGIN-02 verworfen), Login per Code vorgezogen (A-LOGIN-08; per SMS oder App neu A-LOGIN-11, später), eingeloggt bleiben bis ein Jahr ohne Nutzung (A-LOGIN-09), neuer Code per E-Mail (A-LOGIN-10). Grund: Eine Startbildschirm-App auf dem iPhone übernimmt keine Anmeldung aus einem Link, und bei seltener Nutzung ist ein vergessenes Passwort der Normalfall. Dem Vorstand als Vorschlag vorgelegt (K-02) | Projektleiter |
| 01.11.2026 | [Sicherheitskonzept](../sicherheitskonzept.md) (#6): neu der Änderungsverlauf für Admins (A-MITGLIED-06); jede E-Mail-Adresse gehört zu höchstens einem Mitglied (FR-25); Admin-Oberfläche mit frischem Mail-Code statt Zwei-Faktor-App (SI-08, Vorschlag K-12; A-LOGIN-06 bleibt *später*) | Projektleiter |
| 03.11.2026 | Antworten des Vorstands aus den [Abklärungen](../abklaerungen.md#beantwortet): neue Termine, CM-Anmeldung ab 15.04.2027, *CM-Betrieb* bis 01.06.2027, Lizenzanträge ab 01.04.2028 (K-01, [Roadmap](../roadmap.md)); Junioren ab der CM 2027 mit eigenem Konto (K-46); Datenumfang bestätigt (K-07), für die CM reicht der Jahrgang (K-40.2); Passwort gewünscht (K-02.1, K-16.3), stattdessen ein freiwilliger Passkey als Komfort, kein Schutz gegen ein gehacktes Postfach (A-LOGIN-07 auf *Mitglieder-Login*, ADR-004 bleibt); neu das Einlesen der Mitgliederliste aus Fairgate (A-MITGLIED-07, K-17.1); Admin-Bestätigung per Mail-Code bestätigt (K-12.1) | Vorstand, Projektleiter |
| 03.11.2026 | Vorschläge an den Vorstand nach Rücksprache mit dem Projektleiter: Ein Mitglied führt das Konto seines Kindes bis zu einer Altersgrenze des Vereins (A-MITGLIED-08, K-08); ausgetretene Mitglieder bleiben eine Frist lang inaktiv statt nach 3 Monaten gelöscht (FR-04, K-38) | Projektleiter |
| 04.11.2026 | [Testgruppe](../testgruppe.md) (#40): neu die Hilfe beim Start (A-HILFE-01, -02), weil die Testgruppe auch die Hilfe prüft, die beim Start mitgeht; Etappe *Pilot* als Vorstufe von *Mitglieder-Login* ([Roadmap](../roadmap.md)) | Projektleiter |
| 04.11.2026 | Hilfe beim Start ([#47](https://github.com/konstantinniedermann/tco-app/issues/47), [Design](../superpowers/specs/2026-11-04-hilfe-beim-start-design.md)): A-HILFE-01, -02 auf *umgesetzt\**; A-HILFE-02 präzisiert (eigene Einstiegsseite im Handy-Browser, Android-Taste); «eigene Angaben ändern» kommt mit A-KONTO-01 in die Hilfe | Projektleiter |
| 04.11.2026 | Freiwilliger Passkey ([#44](https://github.com/konstantinniedermann/tco-app/issues/44), [ADR-005](../adr/adr-005-passkey-simplewebauthn.md)): A-LOGIN-07 auf *umgesetzt\**; die Prüfung auf echten Geräten steht in der Release-Checkliste | Projektleiter |
| 05.11.2026 | A-ANLASS-01 als Vorschlag für den Vorstand gebaut ([#52](https://github.com/konstantinniedermann/tco-app/issues/52), [Design](../superpowers/specs/2026-11-05-gv-anmeldung-design.md)): Admin erstellt Anlässe, alle Mitglieder melden sich an oder ab (Bemerkung freiwillig) und speichern den Termin im Kalender; Etappe *Mitglieder-Login* als Vorschlag, Bestätigung mit K-50; Anträge an die GV, Zielgruppen und Stimmrecht später | Projektleiter |
| 05.11.2026 | Eigene Angaben ändern ([#50](https://github.com/konstantinniedermann/tco-app/issues/50), [Design](../superpowers/specs/2026-11-05-eigene-angaben-aendern-design.md)): A-KONTO-01 auf *umgesetzt\**, mit Lizenznummer und E-Mail-Wechsel per zwei Codes (Annahme K-19.1); A-KONTO-02 von *später\*/offen* auf *Mitglieder-Login\*/umgesetzt\** mit der Liste *Für Fairgate* (Annahme K-19.2); A-HILFE-01 um «Eigene Angaben ändern» ergänzt. Antwortet der Vorstand anders, wird zurückgebaut | Projektleiter |
| 06.11.2026 | Begründung zu N-EIGENSTAENDIG-01 als [ADR-006](../adr/adr-006-eigenstaendig-ohne-fairgate.md) festgehalten ([#16](https://github.com/konstantinniedermann/tco-app/issues/16)): eigene Mitgliederliste ohne Anbindung an Fairgate, mit Reevaluations-Triggern; A-MITGLIED-05 bleibt *später* | Projektleiter |
| 06.11.2026 | CM Teil 1, Turnier und Kategorien anlegen ([#57](https://github.com/konstantinniedermann/tco-app/issues/57), [Design](../superpowers/specs/2026-11-06-cm-anmeldung-design.md)): Turniernummern freiwillig (A-TURNIER-02; Swiss Tennis vergibt sie oft erst später); Doppelkategorien nach Mindestsumme der Klassierungen statt Klassierungsbereich (A-TURNIER-03, Annahme K-51); Kategorien lassen sich absagen; FR-33 bis FR-35 | Projektleiter |
| 06.11.2026 | CM Teil 1 umgesetzt ([#57](https://github.com/konstantinniedermann/tco-app/issues/57)): A-TURNIER-01 bis -03 und A-ANMELDUNG-07 auf *umgesetzt*, A-ROLLE-07 auf *umgesetzt\** (Turnier und Kategorien); A-TURNIER-03 präzisiert: Klassierungsbereich im Einzel, Mindestsumme im Doppel | Projektleiter |
| 06.11.2026 | Rollen schärfen ([#43](https://github.com/konstantinniedermann/tco-app/issues/43), [Design](../superpowers/specs/2026-11-06-rollen-schaerfen-design.md)): statt «Admin» vier Admin-Rollen, einzeln vergeben (Vorschlag K-18.4). A-ROLLE-01 neu *MyTCO-Admin* (vergibt Rollen, sieht alles, ändert nichts), A-ROLLE-02 neu *Mitglieder-Admin*; A-ROLLE-07 und -08 heissen *CM-Admin* und *Lizenz-Admin*; neu A-ROLLE-09 *Ansicht als …*. Die Stellvertretung durch den Admin entfällt (RR-02 verworfen); A-LOGIN-09, A-MITGLIED-01 bis -07, A-KONTO-02, A-ANLASS-01 und N-APP-03 nennen die neue Rolle | Projektleiter |
| 06.11.2026 | CM Teil 2, Einzel-Anmeldung ([#58](https://github.com/konstantinniedermann/tco-app/issues/58), [Design](../superpowers/specs/2026-11-06-cm-anmeldung-design.md)): Die Klassierung fragt die CM-Seite ab statt der erste Login (A-LOGIN-03, FR-02, FR-37); Geschlecht und Jahrgang trägt das Mitglied einmal selbst ein; Warnung beim Ändern einer Kategorie (FR-36); Doppel-Kategorien sind für Mitglieder bis Teil 3 ausgeblendet | Projektleiter |
| 06.11.2026 | CM Teil 2 umgesetzt ([#58](https://github.com/konstantinniedermann/tco-app/issues/58)): A-ANMELDUNG-01, -02, -03 und -05 auf *umgesetzt* für Einzel-Kategorien; Doppel folgen mit [#59](https://github.com/konstantinniedermann/tco-app/issues/59) | Projektleiter |
| 07.11.2026 | CM Teil 4 umgesetzt ([#60](https://github.com/konstantinniedermann/tco-app/issues/60)): A-ANMELDUNG-06 und -10 auf *umgesetzt* für Einzel-Kategorien (Anmeldungen von Hand, verschieben, löschen, Klassierung korrigieren, Wildcard-Antrag und Entscheid); Doppel folgen mit [#59](https://github.com/konstantinniedermann/tco-app/issues/59) | Projektleiter |
| 08.11.2026 | Doppel umgesetzt ([#59](https://github.com/konstantinniedermann/tco-app/issues/59)): A-ANMELDUNG-01 bis -06 und -10 auch für Doppel-Kategorien auf *umgesetzt* (Partner-Anfragen, Suche nach Partner, Doppel-Verwaltung durch den CM-Admin) | Projektleiter |
| 08.11.2026 | Einlesen ([#43](https://github.com/konstantinniedermann/tco-app/issues/43)): A-MITGLIED-07 teilweise (Einlesen einer Datei) | Projektleiter |
| 09.11.2026 | N-DATENSCHUTZ-02: Kontaktdaten für CM- und Lizenz-Admin nach Aufgabe statt von allen (K-42 eingegrenzt) | Projektleiter |
| 09.11.2026 | Gespräch mit der Turnierleitung ([#71](https://github.com/konstantinniedermann/tco-app/issues/71), [Design](../superpowers/specs/2026-11-09-gespraech-turnierleitung-design.md)): neu A-TURNIER-04 (*geplant*) | Projektleiter |
| 09.11.2026 | Gespräch mit der Turnierleitung umgesetzt ([#71](https://github.com/konstantinniedermann/tco-app/issues/71)): A-TURNIER-04 auf *umgesetzt* (FR-50 bis FR-54); A-MITGLIED-03 auf *umgesetzt* (Löschen mit Bedenkzeit) | Projektleiter |
| 12.11.2026 | Antworten des Vorstands: Die vier Admin-Rollen und ihre Besetzung gelten (K-18.4). Junioren ohne Altersgrenze: jedes Kind ein eigenes Konto; ein Elternteil führt es nur, solange das Kind keine eigene Adresse hat (A-MITGLIED-08, Vorschlag K-08, Bestätigung ausstehend) | Hauptansprechperson im Vorstand |

## Offene Fragen an den Verein

Alle offenen Fragen an Vorstand, Website-Betreuer, Hoster und Verantwortliche stehen mit
fester ID, Ansprechperson und Fälligkeit in den [Abklärungen beim Verein](../abklaerungen.md).
Beantwortete Fragen wandern mit Antwort ins Änderungsprotokoll oben.
