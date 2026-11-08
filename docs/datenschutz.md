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
- Projektleiter und die Admin-Rollen (MyTCO-, Mitglieder-, CM- und Lizenz-Admin) bearbeiten
  Daten nur für ihre Aufgabe ([Rollen und Rechte](rollen-und-rechte.md)).
- Hoster und E-Mail-Dienst bearbeiten Daten nur im Auftrag des Vereins (Art. 9 nDSG).

## Welche Daten

Nur diese Felder (vom Vorstand bestätigt, K-07):

| Feld | Wozu | Pflicht |
|------|------|---------|
| Vorname, Nachname | Konto, Anmeldung, Resultate | ja |
| Postadresse | Login-Briefe | ja |
| E-Mail-Adresse | Bestätigungen, Benachrichtigungen, neuer Einmal-Code (A-LOGIN-10); je Mitglied eine eigene (FR-25) | ja, ausser bei Junioren, die ein Elternteil führt (Vorschlag K-08) |
| Telefonnummer | Absprache der Gruppenspiele | für die CM ja |
| Geschlecht, Jahrgang | Zulassung zu Kategorien; für die CM reicht der Jahrgang (K-40.2); volles Geburtsdatum nur, falls Swiss Tennis es für Lizenzanträge verlangt (hängt an K-40.1) | für die CM ja, beim Anlegen freiwillig; leer trägt das Mitglied sie einmal selbst ein (FR-37) |
| Mitgliedernummer aus Fairgate | Wiedererkennen beim Einlesen (A-MITGLIED-07) | Pflicht beim Einlesen und beim Befehl *Admin festlegen*, sonst freiwillig |
| Lizenznummer, Klassierung | Anmeldung (die Klassierung fragt die CM-Seite vor der ersten Anmeldung ab, FR-37), Lizenzanträge, Export an Swiss Tennis | nein; Klassierung für die CM ja |
| Konto, Rollen, Benachrichtigungs-Einstellungen: Themen *Anlässe*, *Clubmeisterschaft*, *Verein* (für neue Konten an) | Login, Berechtigungen, Mitteilungen abstellen | ja |
| Push-Abo je Gerät (nur nach Einschalten durch das Mitglied): Adresse beim Push-Dienst, zwei Schlüssel, eingerichtet am, zugehörige Sitzung | Push zustellen (FR-40) | nein |
| Verlauf der Mitteilungen: Absender, Zeit, Titel, Text, Auswahl in Worten, Weg, Zahlen; keine Empfängernamen (FR-45) | Doppelte Mitteilungen vermeiden, nachvollziehen | — |
| Sitzungen: je angemeldetes Gerät *angemeldet am* und *zuletzt genutzt*, ohne IP-Adresse und Gerätenamen; beim MyTCO-Admin die Rolle einer laufenden *Ansicht als …* | Login merken und nach einem Jahr ohne Nutzung beenden (*zuletzt genutzt*); *angemeldet am*, um Missbrauch nachzuvollziehen, etwa wenn ein Mitglied ein fremdes Gerät vermutet; die Ansicht, damit sie nur lesend bleibt | — |
| Passkey (A-LOGIN-07): je Passkey Kennung, öffentlicher Schlüssel, Zähler, Übertragungswege, Adresse der App (Relying-Party-ID), grobe Gerätebezeichnung (nur das Etikett aus dem Browser, z. B. *iPhone*), eingerichtet am, zuletzt benutzt; je Konto eine zufällige Passkey-Kennung (keine Personendaten); je Sitzung ein Merker, ob der Passkey-Hinweis noch erscheint. Name und E-Mail-Adresse liegen nur im Schlüsselbund des Mitglieds (sein Gerät zeigt sie an), MyTCO speichert sie dafür nicht zusätzlich | Login ohne Code | nein |
| IP-Adresse bei Login-Versuchen und E-Mail-Wechseln; eingetippte E-Mail-Adresse einer Code-Anfrage, Empfänger-Adressen eines E-Mail-Wechsels und des Hinweises an die alte Adresse | Schutz vor Durchprobieren von Codes und E-Mail-Adressen; die Adresse nur im Arbeitsspeicher und nur für die Grenze; beides höchstens 24 Stunden | — |
| Laufender E-Mail-Wechsel (A-KONTO-01, SI-09): neue Adresse, beide Codes nur als Hash, Ablauf, Fehlversuche; nur im Arbeitsspeicher des Servers, gültig höchstens 15 Minuten. Die neue Adresse liegt dazu im Gerätespeicher des eigenen Geräts, damit Schritt 2 ein Neuladen übersteht (wie die Code-Anfrage beim Login); gelöscht nach Bestätigung, bei «‹ Zurück», beim Abmelden, sonst nach Ablauf (15 Minuten) spätestens beim nächsten Start der App | Neue Adresse mit je einem Code an die alte und die neue bestätigen | — |
| Markierung *für Fairgate offen seit* (Annahme K-19.2) | Der Mitglieder-Admin sieht, welche selbst geänderten Kontaktangaben (Adresse, E-Mail, Telefon) er noch von Hand nach Fairgate übertragen muss (Liste *Für Fairgate*, A-KONTO-02) | — |
| Anmeldungen zur CM (Kategorie, Status, bei Wildcard mit Kommentar, im Doppel bei *sucht Partner* mit freiwilligem Kommentar bis 120 Zeichen), Spiele, Resultate, Lizenzanträge | Clubmeisterschaft, Lizenzen | — |
| Partner-Anfragen zur CM (Kategorie, von, an, gestellt am); erledigte Anfragen werden gelöscht | Doppelpartner anfragen, annehmen oder ablehnen | — |
| Anmeldungen zu Anlässen: Antwort *kommt* / *kommt nicht*, freiwillige Bemerkung (ohne Angaben zur Gesundheit) | Planung des Anlasses, z. B. der Generalversammlung (A-ANLASS-01) | nein |
| *Erstellt von* am Anlass: der Mitglieder-Admin, der ihn angelegt hat | Rückfragen zum Anlass: nachvollziehen, wer ihn angelegt hat | — |
| Austrittsdatum; Zeitpunkt der Löschvormerkung und Zustand davor | Löschfrist, Bedenkzeit, Rückgängig | — |
| *Verwaltet von*: Elternteil, der das Konto eines Juniors führt (Vorschlag K-08) | Kind ohne eigenes Login | — |
| Änderungsverlauf: wer hat wann welches Feld geändert oder welche Aktion ausgelöst, ohne Werte (SI-12) | Fehler und Missbrauch nachvollziehen, Abgleich mit Fairgate (A-MITGLIED-07) | — |

E-Mail, Telefon und Lizenznummer (Annahme K-19.1, FR-02) sowie die Adresse (Annahme K-19.2) ändert das Mitglied selbst im Profil; die E-Mail erst nach je einem Code an die alte und die neue Adresse (SI-09). Geschlecht und Jahrgang trägt das Mitglied einmal selbst ein, wenn sie leer sind (FR-37), danach ändert sie der Mitglieder-Admin; Name und Mitgliedernummer ändert weiterhin nur er. Ändert er die E-Mail-Adresse, erhält die alte einen Hinweis ohne Adressen (SI-09). Neue Datenarten entstehen dadurch nicht.

Der Befehl *Admin festlegen* legt nur den ersten Admin selbst an (MyTCO- und Mitglieder-Admin, Annahme K-18.4); alle anderen Mitglieder kommen über das Einlesen oder die Verwaltung.

Keine Gesundheitsdaten (auch nicht als Grund für eine Abmeldung), keine Fotos, keine
Bankdaten.

## Wer sieht was

| Wer | Sieht |
|-----|-------|
| Mitglied | alle eigenen Daten, auch die eigenen Anmeldungen zu Anlässen; den Änderungsverlauf zum eigenen Konto auf Anfrage bei der Ansprechperson |
| Elternteil, der ein Kind führt | alle Daten des Kindes, ändert sie und meldet es an (Vorschlag K-08) |
| Mitglieder-Admin | alle Daten der Mitglieder (von der CM nur bestätigte Anmeldungen, ohne Wildcard-Anträge und Kommentare) und den Änderungsverlauf; in der Liste *Für Fairgate* die selbst geänderten Kontaktangaben, bis er sie abhakt; alle Anmeldungen zu Anlässen mit Bemerkung (**Annahme K-50:** nur Mitglieder- und MyTCO-Admins, nicht der ganze Vorstand); Einmal-Codes sind nach der Ausgabe für niemanden abrufbar |
| MyTCO-Admin | alles, was eine der anderen Rollen sieht, auch Bemerkungen zu Anlässen und Wildcard-Kommentare, und den Änderungsverlauf; nur lesend. **Zweck:** die anderen Rollen unterstützen, Fehler suchen, die Rollenvergabe prüfen. *Ansicht als …* zeigt ihm nichts darüber hinaus. **Annahme K-18.4:** Die Rolle erhalten nur Personen, die MyTCO technisch betreuen (Projektleiter und seine Stellvertretung, vgl. SI-16), nicht weitere Vorstandsmitglieder; eine Abmachung des Vereins, die App erzwingt sie nicht |
| CM-Admin | Name, E-Mail und Telefon aller Mitglieder (K-42); Anmeldungen mit Kommentar und Wildcard-Antrag; Klassierung, Geschlecht und Jahrgang der Spieler (zum Zuordnen in Kategorien). Die Klassierung korrigiert auch der CM-Admin (A-ANMELDUNG-06, Matrix in `rollen-und-rechte.md`); Geschlecht und Jahrgang ändert nur der Mitglieder-Admin |
| Lizenz-Admin | Name, E-Mail und Telefon aller Mitglieder (K-42); Lizenzanträge |
| Alle Mitglieder | Name, Kategorien (Namen der bestätigten Anmeldungen) und Resultate der Clubmeisterschaft; wer in einer Doppelkategorie *sucht Partner* mit seinem Kommentar; bei der Wahl des Doppelpartners die Namen und die Klassierung der Mitglieder, die für die Kategorie passen, dazu den Vermerk *Klassierung fehlt* oder *Angaben fehlen* (im Doppel: Geschlecht fehlt) |
| Angefragter Doppelpartner | mit der Anfrage Name, Klassierung und Telefonnummer (sonst E-Mail) des Anfragenden, den dieser damit freigibt; die Kontaktdaten des Angefragten sieht der Anfragende erst nach dem Annehmen |
| Gegner und Doppelpartner | E-Mail und Telefon, bis zum Ende der CM, ohne weitere Einwilligung (K-31); beim Doppelpartner erst nach dem Annehmen der Anfrage |
| Alle, ohne Login | Kalenderdatei eines Anlasses über einen nicht erratbaren Link: Titel, Beginn, Ort, Einladung, keine Personendaten |
| Alle, ohne Login | Spielplan des Finalwochenendes mit Name, Kategorie, Platz, Zeit, Resultat (**Vorschlag K-39**, spätere Etappe) |
| Swiss Tennis | Anmeldungen, Resultate und Lizenzanträge, als Export von Hand |

**Kontaktdaten:** Wer sich zur CM anmeldet, wird vorher darauf hingewiesen, dass Gegner
und Doppelpartner E-Mail und Telefon sehen. Verbergen geht nicht — die Spieler sprechen
die Gruppenspiele selbst ab. Wer das nicht will, meldet sich nicht an.
Ein Doppelpartner wird vor dem Annehmen einer Anfrage nochmals darauf hingewiesen. Wer
eine Partner-Anfrage stellt, gibt dem Angefragten Name, Klassierung und Telefonnummer (sonst
E-Mail) frei; die Kontaktdaten des Angefragten sieht er erst nach dem Annehmen. Der Kommentar
bei *sucht Partner* soll keine Angaben zur Gesundheit enthalten.

## Löschen

- **Austritt:** Der Mitglieder-Admin erfasst ihn. Konto sofort inaktiv (Login gesperrt, Sitzungen und
  Push-Abos weg; Passkeys und Rollen bleiben, damit sie nach einem Wiedereintritt wieder wirken).
  Einzel- und Doppel-Anmeldungen zur CM (auch Wildcard-Anträge) werden bis zum Datum des Anmeldeschlusses zurückgezogen, auch wenn der CM-Admin die Anmeldung vorher von Hand geschlossen hat; danach bleiben sie stehen (im Doppel bekommt der Partner eine Meldung ohne Grund), offene Partner-Anfragen verfallen,
  Antworten zu kommenden Anlässen gelöscht, die Markierung *für Fairgate offen* entfernt. Die Daten
  bleiben eine Frist lang, falls das Mitglied zurückkommt, dann werden sie gelöscht; der Name bleibt in
  vergangenen Resultaten (**Vorschlag K-38:** Austritt plus 1 Jahr; die Frist legt der Verein fest).
  Heute erfasst der Mitglieder-Admin den Austritt von Hand; später übernimmt das das Einlesen der
  Mitgliederliste (A-MITGLIED-07, K-17.1, [#46](https://github.com/konstantinniedermann/tco-app/issues/46)).
- **Zeitgeber:** Ein täglicher Zeitgeber der App (auch kurz nach jedem Start; `ZEITGEBER=aus` schaltet
  ihn ab, ein Datenbank-Sperrschloss verhindert parallele Läufe) löscht, was fällig ist. Die Frist nach
  dem Austritt und die Bedenkzeit rechnen nach Schweizer Kalenderzeit; gelöscht wird nie vor dem
  angezeigten Datum. Verlauf und Antworten zu Anlässen löscht der Lauf nach einer Grenze von 12 Monaten (UTC).
- **Was bei der Löschung bleibt:** nur Vor- und Nachname. Konto mit Sitzungen, Passkeys, Rollen und
  Push-Abos, die eigenen Verlauf-Einträge und die Antworten zu Anlässen entfallen. Verweise als *erstellt
  von*, Urheber oder Absender werden leer und erscheinen als *gelöschtes Konto*.
- **Auskunft** (Mitglieder-Admin, DS-07): druckbare Seite mit allen gespeicherten Daten des Mitglieds
  ausser Geheimnissen; Verlauf-Einträge, in denen die Person nur Urheber bei anderen ist, fehlen (sie
  nennen Dritte). Schritte der Verwaltung zeigt die Auskunft als «Mitgliederverwaltung», nicht mit dem
  Namen des Admins. Von der CM enthält sie nur bestätigte Anmeldungen, ohne Wildcard-Kommentar, weil
  der Mitglieder-Admin Wildcard-Anträge nicht sieht; die übrigen Anmeldungen, Wildcard-Anträge und Kommentare
  gibt auf Wunsch der CM-Admin bekannt. Das Erstellen steht im Änderungsverlauf.
- **Mitglied löschen** (Mitglieder-Admin, DS-07): Bedenkzeit von 7 Tagen (Anzeige «wird gelöscht»); wie beim Austritt werden offene Anmeldungen zurückgezogen und Antworten zu kommenden Anlässen gelöscht. Die Markierung *für Fairgate offen* entfernt nur der Austritt; die Löschung räumt sie ohnehin ab. In dieser Zeit steht das Mitglied
  im Zustand *Löschung vorgemerkt*, das Login ist gesperrt, und der Mitglieder-Admin kann die Löschung
  rückgängig machen; dann gilt wieder der Zustand davor (*aktiv*, oder *ausgetreten* mit dem alten Austrittsdatum). Nach der Woche wird gelöscht wie nach der Frist beim Austritt.
- **CM-Anmeldungen:** bleiben beim vergangenen Turnier, wie Resultate. Wird ein Mitglied gelöscht, bleibt in seinen Anmeldungen nur der Name (der Wildcard-Kommentar einer Einzel-Anmeldung und der Kommentar *sucht Partner* werden geleert, Partner-Anfragen gelöscht); Grund: Die Turniergeschichte mit Namen und Resultaten ist bei Swiss Tennis ohnehin öffentlich einsehbar.
- **Partner-Anfragen:** Abgelehnte, zurückgezogene und verfallene Anfragen werden gelöscht, sobald die Meldung verschickt ist; angenommene werden zur Anmeldung. Der Kommentar *sucht Partner* wird gelöscht, sobald ein Partner gefunden ist oder der Spieler abmeldet.
- **Ende der CM:** Kontaktdaten sind für Gegner nicht mehr sichtbar.
- **Lizenzanträge:** Ende des Folgejahres.
- **Anmeldungen zu Anlässen:** ein Jahr nach Beginn des Anlasses (**Vorschlag K-50**), vom Zeitgeber gelöscht;
  mit dem Anlass sind alle Anmeldungen dazu ohnehin gelöscht.
- **Push-Abo:** mit der Sitzung (Abmelden, Sitzung beendet, nach einem Jahr ohne Nutzung), beim Abschalten, wenn der Push-Dienst es als ungültig meldet, beim Austritt und bei der Löschvormerkung sowie mit dem Konto.
- **Verlauf der Mitteilungen:** 365 Tage nach dem Versand, ohne Hintergrund-Job: Jeder neue Versand löscht ältere Einträge mit; mit dem Anlass, wenn er gelöscht wird.
- **Merker «Push-Hinweis abgelehnt»:** nur im Gerätespeicher.
- **Eingelesene Mitgliederliste** (A-MITGLIED-07): wird nach dem Einlesen nicht aufbewahrt;
  übernommen werden nur Felder aus [Welche Daten](#welche-daten).
- **Logs und Backups:** höchstens 30 Tage.
- **Änderungsverlauf:** 12 Monate, vom Zeitgeber gelöscht; Einträge zu einem Mitglied früher, sobald es den Status *gelöscht* hat (FR-04).
- **IP-Adressen** (Schutz vor Durchprobieren von Codes, Logs): höchstens 24 Stunden.
- **E-Mail-Adresse einer Code-Anfrage** (Grenze pro Adresse): nur im Arbeitsspeicher, höchstens 24 Stunden.
- **Passkeys:** wenn das Mitglied ihn entfernt, sonst mit dem Konto. Die zufällige Passkey-Kennung des Kontos entsteht beim ersten Einrichten-Versuch (auch bei Abbruch) und bleibt, bis das Konto gelöscht wird.
- **Sitzungen:** beim Abmelden, beim Widerruf oder nach einem Jahr ohne Nutzung (dann beim
  nächsten Login eines Mitglieds). Die Rolle einer *Ansicht als …* mit *Beenden*, beim Abmelden
  oder mit dem Entzug der Rolle MyTCO-Admin.
- ***Erstellt von* am Anlass:** mit dem Anlass; wird der Mitglieder-Admin als Mitglied gelöscht, bleibt der
  Anlass ohne diese Angabe.
- **E-Mail-Adresse im Gerätespeicher** während einer Code-Anfrage: nach dem Login, sonst beim
  nächsten Start der App, sobald die Anfrage älter als 15 Minuten ist.
- **Laufender E-Mail-Wechsel** (neue Adresse, Code-Hashes): nur im Arbeitsspeicher; weg bei
  Bestätigung oder neuem Wechsel, nach 5 Fehlversuchen, abgelaufen (15 Minuten) spätestens
  10 Minuten später, und mit jedem Neustart von MyTCO.
- **Neue E-Mail-Adresse im Gerätespeicher** während eines E-Mail-Wechsels: nach der
  Bestätigung, bei «‹ Zurück» zu Schritt 1, beim Abmelden, sonst nach Ablauf (15 Minuten)
  spätestens beim nächsten Start der App.
- **Markierung für Fairgate offen:** sobald der Mitglieder-Admin die Angaben als übertragen abhakt; das
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
| DS-05 | Push-Nachrichten und Sammel-E-Mails ohne Daten anderer Mitglieder („Neues Resultat in Ihrer Gruppe“); E-Mails gehen je Empfänger einzeln, nie mehrere Adressen in einem Empfängerfeld. Bei Mitteilungen (FR-42) weist das Formular darauf hin; die Vorschau zeigt dem Mitglieder-Admin nur Namen, die er schon sehen darf |
| DS-06 | Löschfristen aus [Löschen](#löschen) sind umgesetzt; Logs ohne Inhalte (keine Einmal-Codes, Kontaktdaten, Resultate); IP-Adressen höchstens 24 Stunden, auch in Logs |
| DS-07 | Der Mitglieder-Admin kann die Daten eines Mitglieds als druckbare Auskunft ausgeben und das Mitglied löschen (umgesetzt, Etappe 3 von #43) |
| DS-08 | Entwicklung und Tests nur mit erfundenen Daten |
| DS-09 | Die Datenschutzerklärung ist in MyTCO auch ohne Login erreichbar |
| DS-10 | Datensicherheit (verschlüsselte Verbindung, Einmal-Codes nur als Hash, Zugriff nach Rolle) regelt das [Sicherheitskonzept](sicherheitskonzept.md) |

## Offene Fragen an den Verein

K-06.1 (Ansprechperson), K-08 (Konten der Junioren), K-09 (Vertrag mit Metanet
für E-Mail), K-18.4 (wer die Admin-Rollen übernimmt), K-38 (Löschfrist), K-39 (öffentlicher Spielplan), K-40.1
(Jahrgang für Lizenzanträge) — alle in den [Abklärungen](abklaerungen.md). Was schon entschieden ist, steht unter
[Beantwortet](abklaerungen.md#beantwortet).

## Änderungen an diesem Konzept

Bevor eine Funktion Personendaten neu erhebt, anders verwendet, anderen zeigt, an einen
neuen Dienst gibt oder länger aufbewahrt: dieses Konzept und die
[Datenschutzerklärung](datenschutzerklaerung.md) anpassen, bei Bedarf eine Frage in den
[Abklärungen](abklaerungen.md) eintragen. Jedes Issue prüft das im Abschnitt *Datenschutz*
der Issue-Vorlage.
