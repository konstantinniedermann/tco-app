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
  Vorstand bestimmt (**Vorschlag K-06:** Präsidium).
- Projektleiter, Admins und Verantwortliche von CM und Lizenzen bearbeiten Daten nur für
  ihre Aufgabe ([Rollen und Rechte](https://github.com/konstantinniedermann/tco-app/issues/4)).
- Hoster und E-Mail-Dienst bearbeiten Daten nur im Auftrag des Vereins (Art. 9 nDSG).

## Welche Daten

**Vorschlag K-07** — nur diese Felder:

| Feld | Wozu | Pflicht |
|------|------|---------|
| Vorname, Nachname | Konto, Anmeldung, Resultate | ja |
| Postadresse | Login-Briefe | ja |
| E-Mail-Adresse | Bestätigungen, Benachrichtigungen, Passwort zurücksetzen | ja |
| Telefonnummer | Absprache der Gruppenspiele | für die CM ja |
| Geschlecht, Jahrgang | Zulassung zu Kategorien; volles Geburtsdatum nur, falls Swiss Tennis es verlangt (K-40) | ja |
| Lizenznummer, Klassierung | Anmeldung, Lizenzanträge, Export an Swiss Tennis | nein |
| Konto, Rollen, Benachrichtigungs-Einstellungen | Login, Berechtigungen, Push | ja |
| Anmeldungen, Spiele, Resultate, Lizenzanträge | Clubmeisterschaft, Lizenzen | — |
| E-Mail und Telefon eines Elternteils | nur bei Spielern unter 16 ohne Konto | für die CM ja |

Keine Gesundheitsdaten (auch nicht als Grund für eine Abmeldung), keine Fotos, keine
Bankdaten.

## Wer sieht was

| Wer | Sieht |
|-----|-------|
| Mitglied | alle eigenen Daten |
| Admin, Verantwortliche CM und Lizenzen | was sie für ihre Aufgabe brauchen |
| Alle Mitglieder | Name, Kategorien und Resultate der Clubmeisterschaft |
| Gegner und Doppelpartner | E-Mail und Telefon, bis zum Ende der CM (**Vorschlag K-31**) |
| Alle, ohne Login | Spielplan des Finalwochenendes mit Name, Kategorie, Platz, Zeit, Resultat (**Vorschlag K-39**, spätere Etappe) |
| Swiss Tennis | Anmeldungen, Resultate und Lizenzanträge, als Export von Hand |

**Kontaktdaten:** Wer sich zur CM anmeldet, wird vorher darauf hingewiesen, dass Gegner
und Doppelpartner E-Mail und Telefon sehen. Verbergen geht nicht — die Spieler sprechen
die Gruppenspiele selbst ab. Wer das nicht will, meldet sich nicht an.

## Löschen

- **Austritt:** Konto sofort gesperrt, Daten nach 3 Monaten gelöscht; der Name bleibt in
  vergangenen Resultaten (**Vorschlag K-38**). Wie MyTCO vom Austritt erfährt, klärt K-14.
- **Ende der CM:** Kontaktdaten sind für Gegner nicht mehr sichtbar; Kontakte von Eltern
  werden nach 3 Monaten gelöscht.
- **Lizenzanträge:** Ende des Folgejahres.
- **Logs und Backups:** höchstens 30 Tage.

## Junioren

**Vorschlag K-08:** Ein eigenes Konto gibt es ab 16. Jüngere Spieler erfasst der Admin für
die CM ohne Login, mit E-Mail und Telefon eines Elternteils als Kontakt für die Gegner; der
Elternteil erhält dabei die Datenschutzerklärung per E-Mail. Konten für Eltern und Kinder
kommen mit den Junioren-Funktionen (ab 2028).

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
| DS-02 | Hoster und E-Mail-Dienst mit Auftragsbearbeitungsvertrag oder passenden AGB (K-09) |
| DS-03 | Kein Tracking, keine Werbung, keine Inhalte von fremden Servern (CDN, Google Fonts); nur technisch nötige Cookies, deshalb kein Cookie-Banner |
| DS-04 | Nur Felder aus [Welche Daten](#welche-daten); Exporte nur mit den Feldern, die Swiss Tennis braucht |
| DS-05 | Push-Nachrichten und Sammel-E-Mails ohne Daten anderer Mitglieder („Neues Resultat in Ihrer Gruppe“; Empfänger in BCC) |
| DS-06 | Löschfristen aus [Löschen](#löschen) sind umgesetzt; Logs ohne Inhalte (keine Passwörter, Kontaktdaten, Resultate) |
| DS-07 | Der Admin kann die Daten eines Mitglieds exportieren und löschen |
| DS-08 | Entwicklung und Tests nur mit erfundenen Daten |
| DS-09 | Die Datenschutzerklärung ist in MyTCO auch ohne Login erreichbar |
| DS-10 | Datensicherheit (verschlüsselte Verbindung, Passwörter nur als Hash, Zugriff nach Rolle) regelt das [Sicherheitskonzept](https://github.com/konstantinniedermann/tco-app/issues/6) |

## Offene Fragen an den Verein

K-06 (Ansprechperson), K-07 (Datenumfang), K-08 (Junioren), K-09 (Vertrag mit dem
Hoster), K-14 (Austritte), K-31 (Kontaktdaten), K-38 (Löschfrist), K-39 (öffentlicher
Spielplan), K-40 (Jahrgang) — alle in den [Abklärungen](abklaerungen.md).

## Änderungen an diesem Konzept

Bevor eine Funktion Personendaten neu erhebt, anders verwendet, anderen zeigt, an einen
neuen Dienst gibt oder länger aufbewahrt: dieses Konzept und die
[Datenschutzerklärung](datenschutzerklaerung.md) anpassen, bei Bedarf eine Frage in den
[Abklärungen](abklaerungen.md) eintragen. Jedes Issue prüft das im Abschnitt *Datenschutz*
der Issue-Vorlage.
