[← Übersicht](index.md)

# Datenschutzkonzept

Was MyTCO mit Personendaten tut. Grundlage ist das Schweizer Datenschutzgesetz (nDSG):
nur nötige Daten, für die Mitglieder erkennbar, gelöscht, wenn sie nicht mehr gebraucht
werden (Art. 6 nDSG). Eine Einwilligung braucht es dafür nicht.

**Grundlage für jede Funktion:** Was hier nicht steht, baut MyTCO nicht — erst wird das
Konzept angepasst, dann die Funktion ([Änderungen](#änderungen-an-diesem-konzept)).

**Vorschlag K-NN** = vom Vorstand noch zu bestätigen, Frage in den [Abklärungen](abklaerungen.md).

## Verantwortung

- Verantwortlich ist der **TC Olten**. Fragen von Mitgliedern gehen an eine Person, die der
  Vorstand bestimmt (**Vorschlag K-06.1:** Präsidium). Die Datenschutzerklärung gibt der
  Gesamtvorstand frei (K-06.2).
- Projektleiter, Admins und Verantwortliche von CM und Lizenzen bearbeiten Daten nur für
  ihre Aufgabe ([Rollen und Rechte](rollen-und-rechte.md)).
- Hoster und E-Mail-Dienst bearbeiten Daten nur im Auftrag des Vereins (Art. 9 nDSG).

## Welche Daten

Nur diese Felder (vom Vorstand bestätigt, K-07):

| Feld | Wozu | Pflicht |
|------|------|---------|
| Vorname, Nachname | Konto, Anmeldung, Resultate | ja |
| Postadresse | Login-Briefe | ja |
| E-Mail-Adresse | Bestätigungen, Benachrichtigungen, neuer Einmal-Code (A-LOGIN-10); je Mitglied eine eigene (FR-25) | ja |
| Telefonnummer | Absprache der Gruppenspiele | für die CM ja |
| Geschlecht, Jahrgang | Zulassung zu Kategorien; für die CM reicht der Jahrgang (K-40.2); volles Geburtsdatum nur, falls Swiss Tennis es für Lizenzanträge verlangt (hängt an K-40.1) | ja |
| Lizenznummer, Klassierung | Anmeldung, Lizenzanträge, Export an Swiss Tennis | nein |
| Konto, Rollen, Benachrichtigungs-Einstellungen | Login, Berechtigungen, Push | ja |
| IP-Adresse bei Login-Versuchen; eingetippte E-Mail-Adresse einer Code-Anfrage | Schutz vor Durchprobieren von Codes und E-Mail-Adressen; die Adresse nur im Arbeitsspeicher und nur für die Grenze; beides höchstens 24 Stunden | — |
| Anmeldungen (mit Kommentar zum Wildcard-Antrag), Spiele, Resultate, Lizenzanträge | Clubmeisterschaft, Lizenzen | — |
| Austrittsdatum | Löschfrist nach Austritt | — |
| Änderungsverlauf: wer hat wann welches Feld geändert oder welche Aktion ausgelöst, ohne Werte (SI-12) | Fehler und Missbrauch nachvollziehen, Abgleich mit Fairgate (K-14) | — |

Keine Gesundheitsdaten (auch nicht als Grund für eine Abmeldung), keine Fotos, keine
Bankdaten.

## Wer sieht was

| Wer | Sieht |
|-----|-------|
| Mitglied | alle eigenen Daten; den Änderungsverlauf zum eigenen Konto auf Anfrage bei der Ansprechperson |
| Admin | alle Daten der Mitglieder und den Änderungsverlauf; Einmal-Codes sind nach der Ausgabe für niemanden abrufbar |
| CM-Verantwortlicher | Name, E-Mail und Telefon aller Mitglieder (K-42); Anmeldungen mit Kommentar und Wildcard-Antrag; Klassierung der Spieler |
| Lizenzverantwortlicher | Name, E-Mail und Telefon aller Mitglieder (K-42); Lizenzanträge |
| Alle Mitglieder | Name, Kategorien und Resultate der Clubmeisterschaft; bei der Wahl des Doppelpartners die Namen der Mitglieder, die für die Kategorie passen |
| Gegner und Doppelpartner | E-Mail und Telefon, bis zum Ende der CM, ohne weitere Einwilligung (K-31) |
| Alle, ohne Login | Spielplan des Finalwochenendes mit Name, Kategorie, Platz, Zeit, Resultat (**Vorschlag K-39**, spätere Etappe) |
| Swiss Tennis | Anmeldungen, Resultate und Lizenzanträge, als Export von Hand |

**Kontaktdaten:** Wer sich zur CM anmeldet, wird vorher darauf hingewiesen, dass Gegner
und Doppelpartner E-Mail und Telefon sehen. Verbergen geht nicht — die Spieler sprechen
die Gruppenspiele selbst ab. Wer das nicht will, meldet sich nicht an.

## Löschen

- **Austritt:** Konto sofort gesperrt, Daten nach 3 Monaten gelöscht; der Name bleibt in
  vergangenen Resultaten (**Vorschlag K-38**). Wie MyTCO vom Austritt erfährt, klärt K-14.
- **Ende der CM:** Kontaktdaten sind für Gegner nicht mehr sichtbar.
- **Lizenzanträge:** Ende des Folgejahres.
- **Eingelesene Mitgliederliste** (A-MITGLIED-07): wird nach dem Einlesen nicht aufbewahrt;
  übernommen werden nur Felder aus [Welche Daten](#welche-daten).
- **Logs und Backups:** höchstens 30 Tage.
- **Änderungsverlauf:** 12 Monate; Einträge zu einem Mitglied früher, sobald es den Status *gelöscht* hat (FR-04).
- **IP-Adressen** (Schutz vor Durchprobieren von Codes, Logs): höchstens 24 Stunden.
- **E-Mail-Adresse einer Code-Anfrage** (Grenze pro Adresse): nur im Arbeitsspeicher, höchstens 24 Stunden.
- **Sitzungen:** beim Abmelden, beim Widerruf oder nach einem Jahr ohne Nutzung (dann beim
  nächsten Login eines Mitglieds).
- **E-Mail-Adresse im Gerätespeicher** während einer Code-Anfrage: nach dem Login, sonst beim
  nächsten Start der App, sobald die Anfrage älter als 15 Minuten ist.

## Junioren

Junioren spielen ab der Clubmeisterschaft 2027 mit und erhalten ein Konto wie alle Mitglieder
(K-46): dieselben Felder, dieselben Rechte, der Login-Brief geht an ihre Postadresse. Über
Junioren speichert MyTCO nicht mehr als über Erwachsene. Das gilt ab der CM-Anmeldung.

Offen (hängt an K-08): Führt das Kind das Konto selbst oder die Eltern? Davon hängt ab, wessen
E-Mail und Telefon im Konto stehen und was Gegner und Doppelpartner sehen (K-31). Eine
E-Mail-Adresse gehört zu höchstens einem Mitglied (FR-25); eine Familienadresse für mehrere
Kinder geht so nicht.

## Rechte der Mitglieder

Mitglieder können erfahren, welche Daten MyTCO über sie hat, sie als Datei erhalten,
berichtigen und löschen lassen (Art. 25, 28, 32 nDSG). Die Ansprechperson antwortet innert
30 Tagen. Informiert werden die Mitglieder über die
[Datenschutzerklärung](datenschutzerklaerung.md), auf die die Login-Briefe verweisen
(Art. 19 nDSG).

## Vorgaben für Technik und Hosting

Verbindlich für ADRs, Code und Tests, insbesondere
[Backend und Hosting](https://github.com/konstantinniedermann/tco-app/issues/8).

| ID | Vorgabe |
|----|---------|
| DS-01 | Server, Datenbank, Backups und E-Mail-Versand in der Schweiz oder in der EU/EWR (Art. 16 nDSG) |
| DS-02 | Hoster und E-Mail-Dienst mit Auftragsbearbeitungsvertrag oder passenden AGB (Infomaniak: [ADR-003](adr/adr-003-hosting-infomaniak-vps.md); Metanet-Postfach: K-09; Scaleway: DPA vorhanden, [Kosten](kosten.md)) |
| DS-03 | Kein Tracking, keine Werbung, keine Inhalte von fremden Servern (CDN, Google Fonts); nur technisch nötige Cookies, deshalb kein Cookie-Banner |
| DS-04 | Nur Felder aus [Welche Daten](#welche-daten); Exporte nur mit den Feldern, die Swiss Tennis braucht |
| DS-05 | Push-Nachrichten und Sammel-E-Mails ohne Daten anderer Mitglieder („Neues Resultat in Ihrer Gruppe“; Empfänger in BCC) |
| DS-06 | Löschfristen aus [Löschen](#löschen) sind umgesetzt; Logs ohne Inhalte (keine Einmal-Codes, Kontaktdaten, Resultate); IP-Adressen höchstens 24 Stunden, auch in Logs |
| DS-07 | Der Admin kann die Daten eines Mitglieds exportieren und löschen |
| DS-08 | Entwicklung und Tests nur mit erfundenen Daten |
| DS-09 | Die Datenschutzerklärung ist in MyTCO auch ohne Login erreichbar |
| DS-10 | Datensicherheit (verschlüsselte Verbindung, Einmal-Codes nur als Hash, Zugriff nach Rolle) regelt das [Sicherheitskonzept](sicherheitskonzept.md) |

## Offene Fragen an den Verein

K-06.1 (Ansprechperson), K-08 (Konten der Junioren), K-09 (Vertrag mit Metanet
für E-Mail), K-14 (Austritte), K-38 (Löschfrist), K-39 (öffentlicher Spielplan), K-40.1
(Jahrgang für Lizenzanträge) — alle in den [Abklärungen](abklaerungen.md). Was schon entschieden ist, steht unter
[Beantwortet](abklaerungen.md#beantwortet).

## Änderungen an diesem Konzept

Bevor eine Funktion Personendaten neu erhebt, anders verwendet, anderen zeigt, an einen
neuen Dienst gibt oder länger aufbewahrt: dieses Konzept und die
[Datenschutzerklärung](datenschutzerklaerung.md) anpassen, bei Bedarf eine Frage in den
[Abklärungen](abklaerungen.md) eintragen. Jedes Issue prüft das im Abschnitt *Datenschutz*
der Issue-Vorlage.
