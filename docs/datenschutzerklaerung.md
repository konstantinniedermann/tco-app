[← Datenschutzkonzept](datenschutz.md)

# Datenschutzerklärung MyTCO — Entwurf

Text für die Mitglieder, in MyTCO und als Verweis auf den Login-Briefen. Folgt dem
[Datenschutzkonzept](datenschutz.md). Entwurf, Freigabe durch den Gesamtvorstand (K-06.2);
Platzhalter in eckigen Klammern füllt der Verein aus.

Die App zeigt den Teil nach der Trennlinie unter «Datenschutz» an (`src/lib/datenschutz/erklaerung.ts`).
Dort nur: eine Überschrift `##`, Absätze, Aufzählungen mit `- ` und `**fett**`; keine Links,
keine nummerierten Listen, keine weitere Trennlinie.

---

## Datenschutz in MyTCO

Stand: [Datum]

MyTCO ist die Mitglieder-App des Tennis-Club Olten (TCO). Fragen zum Datenschutz an:
[Ansprechperson], [E-Mail-Adresse des Vereins].

**Welche Daten:** Name, Postadresse, E-Mail, Telefon, Geschlecht, Jahrgang, Mitgliedernummer,
Lizenznummer und Klassierung, deine Anmeldungen, Resultate und Lizenzanträge, deine An- oder
Abmeldung zu Anlässen wie der Generalversammlung mit einer freiwilligen Bemerkung. Deine Grunddaten übernimmt
der Verein aus seiner Mitgliederliste. Legt ein Admin einen Anlass an, speichert MyTCO, wer ihn
angelegt hat, damit sich Rückfragen klären lassen.

**Wozu:** für dein Konto, die Clubmeisterschaft, Anlässe, Lizenzanträge und Benachrichtigungen, die
du selbst einschaltest. Für nichts anderes.

**Wer sieht was:**

- Der Admin sieht alle deine Daten und, ohne Inhalt, wer wann welche Angabe geändert oder
  welche Aktion ausgelöst hat (12 Monate). Deinen Einmal-Code kann nach dem Versand niemand mehr abrufen. Die Verantwortlichen von
  Clubmeisterschaft und Lizenzen sehen deinen Namen, deine E-Mail und Telefonnummer und was
  sie für ihre Aufgabe brauchen. Deine An- oder Abmeldung zu einem Anlass und deine Bemerkung sehen
  nur du und der Admin. Schreib in die Bemerkung bitte keine Angaben zur Gesundheit.
- Alle Mitglieder sehen Name, Kategorien und Resultate der Clubmeisterschaft. Wer einen
  Doppelpartner sucht, sieht die Namen der Mitglieder, die für die Kategorie in Frage kommen.
- Deine Gegner und dein Doppelpartner sehen während der Clubmeisterschaft deine E-Mail und
  Telefonnummer, damit ihr die Spiele absprechen könnt.
- Den Spielplan des Finalwochenendes sehen alle, auch ohne Login.
- Die Kalenderdatei eines Anlasses (Titel, Zeit, Ort, Einladung) ist über ihren Link auch ohne
  Login abrufbar; sie enthält keine Angaben zu Personen.
- Swiss Tennis erhält Anmeldungen, Resultate und Lizenzanträge.

**Wo:** Die Daten liegen bei Infomaniak in der Schweiz; E-Mails versendet [E-Mail-Dienst].
Push-Nachrichten stellt der Hersteller deines Browsers oder Handys zu (z. B. Google, Apple);
sie enthalten keine Daten anderer Mitglieder.

**Wie lange:** Solange du Mitglied bist. Nach einem Austritt wird dein Konto gesperrt; deine
Daten bleiben noch eine Frist lang, falls du zurückkommst [Frist, **Vorschlag K-38:** 1 Jahr], und werden
dann gelöscht. Löscht der Verein dein Mitglied, zum Beispiel auf deinen Wunsch, ist dein Konto
sofort gesperrt, und deine Daten werden nach einer Woche gelöscht. In beiden Fällen bleibt dein
Name in vergangenen Resultaten. Deine An- oder Abmeldung zu einem Anlass löschen wir ein Jahr
nach dem Anlass [**Vorschlag K-50**].

**Login:** Du loggst dich mit einem Einmal-Code ein, nicht mit einem Passwort. Danach merkt sich
dein Gerät das Login mit einem Cookie, bis du MyTCO ein Jahr nicht genutzt hast oder dich
abmeldest; MyTCO speichert dazu je Gerät einen Eintrag mit dem Zeitpunkt der Anmeldung und der
letzten Nutzung, ohne IP-Adresse und Gerätenamen. Forderst
du einen neuen Code an, schickt MyTCO ihn an deine E-Mail-Adresse. Bis du den Code
eingetippt hast, merkt sich dein Gerät diese Adresse; ist die Anfrage älter als 15 Minuten,
löscht MyTCO sie spätestens beim nächsten Start. Deine IP-Adresse wird dabei höchstens
24 Stunden gespeichert, damit niemand Codes durchprobieren kann; ebenso die eingetippte
E-Mail-Adresse, nur im Arbeitsspeicher und nur, um die Zahl der Code-Mails zu begrenzen. Änderst du deine
E-Mail-Adresse, bestätigst du die Änderung mit je einem Code an die alte und die neue
Adresse. Bis du beide Codes eingetippt hast, merkt sich dein Gerät die neue Adresse; ist die
Änderung bestätigt, mit «‹ Zurück» abgebrochen oder du meldest dich ab, löscht MyTCO sie sofort; sonst nach 15 Minuten spätestens beim nächsten Start der App. Auf
dem Server liegt die neue Adresse bis dahin nur im Arbeitsspeicher und verfällt nach 15 Minuten;
für die Grenze der Code-Mails merkt sich MyTCO sie dort höchstens 24 Stunden. Ändert der Admin deine Adresse, erhält die alte einen Hinweis. Richtest du freiwillig einen
Passkey ein, speichert MyTCO je Passkey nur dessen öffentlichen Schlüssel, eine Kennung, einen
Zähler, die Adresse der App, eine grobe Gerätebezeichnung (z. B. «iPhone») sowie wann du ihn
eingerichtet und zuletzt benutzt hast. Diese Angaben löschen wir, sobald du den Passkey
entfernst. Dazu kommt eine zufällige Kennung deines Kontos; sie entsteht, sobald du das erste Mal
einen Passkey einrichten willst (auch wenn du abbrichst), und bleibt, bis dein Konto gelöscht wird. Deinen Namen und deine E-Mail-Adresse zeigt dein Gerät aus dem eigenen
Schlüsselbund an, MyTCO speichert sie dafür nicht zusätzlich. Ob der Hinweis auf den Passkey
noch erscheint, merkt sich MyTCO an deiner Sitzung.

**Kein Tracking:** MyTCO speichert im Browser nur, was fürs Login und den Wechsel der E-Mail-Adresse nötig ist. Keine Werbung,
keine Analyse-Dienste.

**Deine Rechte:** Du kannst jederzeit erfahren, welche Daten MyTCO über dich hat, und sie
berichtigen oder löschen lassen. E-Mail, Telefon, Adresse und Lizenznummer änderst du selbst in
der App; geänderte Kontaktangaben überträgt der Verein von Hand in seine Mitgliederliste
(Fairgate).
