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
| E-Mail-Adresse | Bestätigungen, Benachrichtigungen, neuer Einmal-Code (A-LOGIN-10); je Mitglied eine eigene (FR-25) | ja, ausser bei Junioren, die ein Elternteil führt (Vorschlag K-08) |
| Telefonnummer | Absprache der Gruppenspiele | für die CM ja |
| Geschlecht, Jahrgang | Zulassung zu Kategorien; für die CM reicht der Jahrgang (K-40.2); volles Geburtsdatum nur, falls Swiss Tennis es für Lizenzanträge verlangt (hängt an K-40.1) | für die CM ja, beim Anlegen freiwillig |
| Mitgliedernummer aus Fairgate | Wiedererkennen beim Einlesen (A-MITGLIED-07) | Pflicht beim Einlesen und beim Befehl *Admin festlegen*, sonst freiwillig |
| Lizenznummer, Klassierung | Anmeldung, Lizenzanträge, Export an Swiss Tennis | nein |
| Konto, Rollen, Benachrichtigungs-Einstellungen | Login, Berechtigungen, Push | ja |
| Passkey (A-LOGIN-07): je Passkey Kennung, öffentlicher Schlüssel, Zähler, Übertragungswege, Adresse der App (Relying-Party-ID), grobe Gerätebezeichnung (nur das Etikett aus dem Browser, z. B. *iPhone*), eingerichtet am, zuletzt benutzt; je Konto eine zufällige Passkey-Kennung (keine Personendaten); je Sitzung ein Merker, ob der Passkey-Hinweis noch erscheint. Name und E-Mail-Adresse liegen nur im Schlüsselbund des Mitglieds (sein Gerät zeigt sie an), MyTCO speichert sie dafür nicht zusätzlich | Login ohne Code | nein |
| IP-Adresse bei Login-Versuchen und E-Mail-Wechseln; eingetippte E-Mail-Adresse einer Code-Anfrage, Empfänger-Adressen eines E-Mail-Wechsels | Schutz vor Durchprobieren von Codes und E-Mail-Adressen; die Adresse nur im Arbeitsspeicher und nur für die Grenze; beides höchstens 24 Stunden | — |
| Laufender E-Mail-Wechsel (A-KONTO-01, SI-09): neue Adresse, beide Codes nur als Hash, Ablauf, Fehlversuche; nur im Arbeitsspeicher des Servers, gültig höchstens 15 Minuten. Die neue Adresse liegt dazu 15 Minuten im Gerätespeicher des eigenen Geräts, damit Schritt 2 ein Neuladen übersteht (wie die Code-Anfrage beim Login) | Neue Adresse mit je einem Code an die alte und die neue bestätigen | — |
| Markierung *für Fairgate offen seit* (Annahme K-19.2) | Der Admin sieht, welche selbst geänderten Kontaktangaben (Adresse, E-Mail, Telefon) er noch von Hand nach Fairgate übertragen muss (Liste *Für Fairgate*, A-KONTO-02) | — |
| Anmeldungen (mit Kommentar zum Wildcard-Antrag), Spiele, Resultate, Lizenzanträge | Clubmeisterschaft, Lizenzen | — |
| Austrittsdatum | Löschfrist nach Austritt | — |
| *Verwaltet von*: Elternteil, der das Konto eines Juniors führt (Vorschlag K-08) | Kind ohne eigenes Login | — |
| Änderungsverlauf: wer hat wann welches Feld geändert oder welche Aktion ausgelöst, ohne Werte (SI-12) | Fehler und Missbrauch nachvollziehen, Abgleich mit Fairgate (A-MITGLIED-07) | — |

E-Mail, Telefon und Lizenznummer (Annahme K-19.1, FR-02) sowie die Adresse (Annahme K-19.2) ändert das Mitglied selbst im Profil; die E-Mail erst nach je einem Code an die alte und die neue Adresse (SI-09). Name, Geschlecht, Jahrgang und Mitgliedernummer ändert weiterhin der Admin. Neue Datenarten entstehen dadurch nicht.

Der Befehl *Admin festlegen* legt nur den Admin selbst an; alle anderen Mitglieder kommen über das Einlesen oder die Verwaltung.

Keine Gesundheitsdaten (auch nicht als Grund für eine Abmeldung), keine Fotos, keine
Bankdaten.

## Wer sieht was

| Wer | Sieht |
|-----|-------|
| Mitglied | alle eigenen Daten; den Änderungsverlauf zum eigenen Konto auf Anfrage bei der Ansprechperson |
| Elternteil, der ein Kind führt | alle Daten des Kindes, ändert sie und meldet es an (Vorschlag K-08) |
| Admin | alle Daten der Mitglieder und den Änderungsverlauf; in der Liste *Für Fairgate* die selbst geänderten Kontaktangaben, bis er sie abhakt; Einmal-Codes sind nach der Ausgabe für niemanden abrufbar |
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

- **Austritt:** Konto sofort inaktiv (Login gesperrt). Die Daten bleiben eine Frist lang, falls
  das Mitglied zurückkommt, dann werden sie gelöscht; der Name bleibt in vergangenen
  Resultaten (**Vorschlag K-38:** 1 Jahr; die Frist legt der Verein fest). Vom Austritt erfährt MyTCO über die eingelesene Mitgliederliste (A-MITGLIED-07, K-17.1).
- **Mitglied löschen** (Admin, DS-07): Bedenkzeit von 1 Woche. In dieser Zeit steht das Mitglied
  im Zustand *Löschung vorgemerkt*, das Login ist gesperrt, und der Admin kann die Löschung
  rückgängig machen; dann gilt wieder der Zustand davor (*aktiv*, oder *ausgetreten* mit dem alten Austrittsdatum). Nach der Woche wird gelöscht wie nach der Frist beim Austritt.
- **Ende der CM:** Kontaktdaten sind für Gegner nicht mehr sichtbar.
- **Lizenzanträge:** Ende des Folgejahres.
- **Eingelesene Mitgliederliste** (A-MITGLIED-07): wird nach dem Einlesen nicht aufbewahrt;
  übernommen werden nur Felder aus [Welche Daten](#welche-daten).
- **Logs und Backups:** höchstens 30 Tage.
- **Änderungsverlauf:** 12 Monate; Einträge zu einem Mitglied früher, sobald es den Status *gelöscht* hat (FR-04).
- **IP-Adressen** (Schutz vor Durchprobieren von Codes, Logs): höchstens 24 Stunden.
- **E-Mail-Adresse einer Code-Anfrage** (Grenze pro Adresse): nur im Arbeitsspeicher, höchstens 24 Stunden.
- **Passkeys:** wenn das Mitglied ihn entfernt, sonst mit dem Konto. Die zufällige Passkey-Kennung des Kontos entsteht beim ersten Einrichten-Versuch (auch bei Abbruch) und bleibt, bis das Konto gelöscht wird.
- **Sitzungen:** beim Abmelden, beim Widerruf oder nach einem Jahr ohne Nutzung (dann beim
  nächsten Login eines Mitglieds).
- **E-Mail-Adresse im Gerätespeicher** während einer Code-Anfrage: nach dem Login, sonst beim
  nächsten Start der App, sobald die Anfrage älter als 15 Minuten ist.
- **Laufender E-Mail-Wechsel** (neue Adresse, Code-Hashes): nur im Arbeitsspeicher; weg bei
  Bestätigung oder neuem Wechsel, nach 5 Fehlversuchen, abgelaufen (15 Minuten) spätestens
  10 Minuten später, und mit jedem Neustart von MyTCO.
- **Neue E-Mail-Adresse im Gerätespeicher** während eines E-Mail-Wechsels: nach der
  Bestätigung, bei «‹ Zurück» zu Schritt 1, sonst beim nächsten Öffnen der Seite, sobald der
  Wechsel älter als 15 Minuten ist.
- **Markierung für Fairgate offen:** sobald der Admin die Angaben als übertragen abhakt; das
  Abhaken steht im Änderungsverlauf.
- **Testgruppe:** Liste der Testpersonen nach Lauf 2, spätestens zu Beginn der
  CM-Anmeldung; Formularantworten nach der Auswertung des jeweiligen Laufs; Spalten zur
  Testgruppe in der Fragen-Tabelle bei der Übernahme in die Liste ([Testgruppe](#testgruppe)).

## Testgruppe

Vor dem Briefversand prüft eine Testgruppe den Start auf Live ([Testgruppe](testgruppe.md)).

- **Daten auf Live** sind Betrieb, kein Test: DS-08 gilt nicht. Die Konten der Testpersonen
  bleiben nach dem Pilot bestehen.
- **Liste der Testpersonen** (Name, Gerät, Softwareversion, Mailanbieter, Altersgruppe grob)
  nur im gitignorierten Ordner `intern/`, vom Projektleiter selbst angelegt. An Claude
  (Anthropic, USA) gehen nur die Angaben ohne Namen. Ins Repo kommen nur Anzahl und Verteilung.
- **Fragen-Tabelle** (Google): Wer aus dem Vorstand mitmachen will, trägt sich auf *Wer ist
  wer* mit Handymodell ein. Die Spalten werden bei der Übernahme in die Liste geleert.
- **Formular** (Google, ausserhalb CH/EU): ohne Name, ohne E-Mail-Adresse, ohne Jahrgang.
  Bei wenigen Personen lässt sich eine Antwort manchmal trotzdem zuordnen; deshalb nur grobe
  Angaben.
- **Chat** (WhatsApp-Gruppe des Projektleiters) ist nicht Teil von MyTCO. In der Gruppe sehen
  alle die Telefonnummern der anderen; das sagt die Mail. Codes und Adressen gehören nicht in
  den Chat. Inhalte kommen nur als Befund ohne Namen ins Repo.
- **Mail mit dem Brief als PDF** (Name, Adresse, Einmal-Code der Person an sie selbst) geht
  über das private Postfach des Projektleiters (Google, USA), nicht über den Mailversand von
  MyTCO, für den DS-01 gilt. Vertretbar, weil es nur die eigenen Daten der Person sind, nur
  wenige Personen im Pilot, und der Code einmal und höchstens 90 Tage gilt. Der Projektleiter
  löscht die gesendeten Mails und lokalen PDFs nach dem Versand, die Testpersonen Mail und
  PDF nach dem ersten Login. Beim echten Start kommt der Brief per Post.

Die [Datenschutzerklärung](datenschutzerklaerung.md) bleibt unverändert: Liste, Formular,
Chat und Mail sind Organisation des Pilots durch den Projektleiter, nicht Funktionen von
MyTCO. Die Testpersonen erfahren in der [Mail](testgruppe.md#mail-an-die-testpersonen), was
damit geschieht und wann es gelöscht wird.

## Junioren

Junioren spielen ab der Clubmeisterschaft 2027 mit (K-46). Über Junioren speichert MyTCO nicht
mehr als über Erwachsene. Sie werden zum Start mit allen Mitgliedern erfasst (K-17.1),
spätestens bis zur CM-Anmeldung.

**Vorschlag K-08:**

- Ein Mitglied erfasst sein Kind und erledigt für es das Administrative (Daten, CM-Anmeldung).
  Das Kind braucht dann weder eigene E-Mail noch eigenes Login; für Gegner und Doppelpartner
  gelten E-Mail und Telefon des Elternteils (K-31).
- Ab einem Alter, das der Verein festlegt, erhält der Junior ein eigenes Login und braucht
  dann eine eigene E-Mail-Adresse (FR-25).
- Die Altersgrenze steht danach hier und in der Datenschutzerklärung. Offen ist auch, was gilt,
  wenn die Eltern nicht Mitglied sind.

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
| DS-07 | Der Admin kann die Daten eines Mitglieds exportieren und löschen (Stand 0.4.0: noch nicht gebaut, kommt mit Etappe 3 von #43; bis dahin Auskunft und Löschung von Hand) |
| DS-08 | Entwicklung und Tests nur mit erfundenen Daten |
| DS-09 | Die Datenschutzerklärung ist in MyTCO auch ohne Login erreichbar |
| DS-10 | Datensicherheit (verschlüsselte Verbindung, Einmal-Codes nur als Hash, Zugriff nach Rolle) regelt das [Sicherheitskonzept](sicherheitskonzept.md) |

## Offene Fragen an den Verein

K-06.1 (Ansprechperson), K-08 (Konten der Junioren), K-09 (Vertrag mit Metanet
für E-Mail), K-38 (Löschfrist), K-39 (öffentlicher Spielplan), K-40.1
(Jahrgang für Lizenzanträge) — alle in den [Abklärungen](abklaerungen.md). Was schon entschieden ist, steht unter
[Beantwortet](abklaerungen.md#beantwortet).

## Änderungen an diesem Konzept

Bevor eine Funktion Personendaten neu erhebt, anders verwendet, anderen zeigt, an einen
neuen Dienst gibt oder länger aufbewahrt: dieses Konzept und die
[Datenschutzerklärung](datenschutzerklaerung.md) anpassen, bei Bedarf eine Frage in den
[Abklärungen](abklaerungen.md) eintragen. Jedes Issue prüft das im Abschnitt *Datenschutz*
der Issue-Vorlage.
