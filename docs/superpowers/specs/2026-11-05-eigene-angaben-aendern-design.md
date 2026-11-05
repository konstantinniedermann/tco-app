# Eigene Angaben im Profil ändern — Entwurf

Issue [#50](https://github.com/konstantinniedermann/tco-app/issues/50) · Anforderungen A-KONTO-01, A-KONTO-02 ·
Stand 05.11.2026, Brainstorming mit dem Projektleiter

## Ziel und Anlass

Ein Mitglied hält seine Kontaktangaben in MyTCO selbst aktuell, ohne den Admin zu fragen. Beim
ersten Test am Handy fehlte im Profil genau das. Die Datenschutzerklärung verspricht es schon
(«E-Mail und Telefon ändern Sie selbst in der App»).

Gebaut wird mit markierten Annahmen zu K-19.1 und K-19.2. Antwortet der Vorstand anders, wird
zurückgebaut (z. B. die Adresse wieder gesperrt).

## Ziele

- Das Mitglied sieht im Profil seine Angaben.
- Es ändert **Telefon**, **Postadresse** und **Lizenznummer** selbst; die Änderung gilt sofort.
- Es ändert seine **E-Mail-Adresse** selbst; sie gilt erst nach Bestätigung mit je einem Code an
  die alte und die neue Adresse (SI-09).
- Der Admin sieht in einer Liste, welche selbst geänderten Kontaktangaben (Adresse, E-Mail,
  Telefon) er noch nach Fairgate übertragen muss, und hakt sie ab.
- Jede Änderung steht im bestehenden Änderungsverlauf als «Mitglied selbst».

## Nicht-Ziele

- Name, Jahrgang, Geschlecht und Mitgliedernummer ändern: Diese Angaben werden nur angezeigt und
  weiterhin vom Admin geändert (Name für Turniere und Lizenzen, Jahrgang für Kategorien).
- Die Pflicht-Abfrage fehlender Angaben beim ersten Login (A-LOGIN-03, FR-02): eigenes Vorhaben;
  hier nur die freie Änderung der Lizenznummer im Profil (Entscheid Projektleiter, deckt sich mit
  der Zeile FR-02 in Rollen und Rechte).
- Ein E-Mail-Wechsel ohne Zugang zur alten Adresse: Dafür wendet sich das Mitglied an den Admin
  (Entscheid Projektleiter, deckt sich mit SI-09 und der Datenschutzerklärung).
- Mails an den Admin bei Änderungen.
- Angaben anderer Mitglieder ändern (Junioren: #45).
- Anbindung an Fairgate oder Abgleich beim Einlesen der Mitgliederliste (#46, siehe Hinweis unten).

## Anti-Ziele

- Ein Konto lässt sich mit einer fremden, offenen Sitzung allein **nicht** übernehmen: Wer nur das
  entsperrte Handy hat, darf die E-Mail-Adresse nicht wechseln können (B-06).
- Die Änderung verrät nicht, ob eine eingegebene Adresse schon einem anderen Mitglied gehört (SI-04).
- Selbst geänderte Kontaktangaben gehen nicht stillschweigend verloren, bevor sie in Fairgate
  stehen. Vor allem darf eine neue E-Mail-Adresse nie auf die alte zurückfallen: Sie ist das Login.
- Im Änderungsverlauf stehen keine Werte, nur Feldnamen (FR-26).

## Was das Mitglied tut

### Telefon, Postadresse und Lizenznummer

Das Mitglied ändert Telefon, Strasse, PLZ, Ort bzw. Lizenznummer und speichert. Es gelten dieselben Prüfungen
wie bei der Erfassung durch den Admin (`pruefeAngaben`). Die Telefonnummer darf leer werden; Pflicht
wird sie erst mit der CM-Anmeldung (#51).

- Annahme K-19.1 (Telefon selbst ändern) und Annahme K-19.2 (Adresse selbst ändern) stehen im Code
  so, dass `make annahmen K=K-19` sie findet.
- Hat jemand die Angaben in der Zwischenzeit geändert (z. B. der Admin), gilt dieselbe
  «veraltet»-Prüfung wie in der Verwaltung: Das Mitglied sieht den neuen Stand und speichert erneut.
- Jedes geänderte Feld kommt als `feld-geaendert` mit Urheber `mitglied` in den Änderungsverlauf.
- Ändert sich Strasse, PLZ, Ort oder Telefon, ist das Mitglied ab da «für Fairgate offen» (siehe
  unten). Die Lizenznummer nicht *(Entscheid Claude)*: Sie gehört zu Swiss Tennis, ob Fairgate sie
  führt, klärt K-45.

### E-Mail-Adresse

1. Das Mitglied gibt die neue Adresse ein.
2. MyTCO schickt einen Code an die **alte** und einen anderen Code an die **neue** Adresse.
   Die Antwort ist immer gleich, egal ob die neue Adresse frei ist.
3. Das Mitglied tippt beide Codes ein. Erst dann wird die neue Adresse gespeichert, klein
   geschrieben wie jede Adresse in MyTCO (`pruefeAngaben`, eindeutig ohne Rücksicht auf
   Gross-/Kleinschreibung), und ist ab sofort das Login.
4. Änderungsverlauf: `feld-geaendert` / `email`, Urheber `mitglied`. Das Mitglied ist ab da
   «für Fairgate offen».

Werte wie beim Login-Mail-Code (SI-03, SI-04): 15 Minuten gültig, nach 5 Fehlversuchen ungültig,
Codes nur als HMAC gespeichert, höchstens 3 Wechsel-Anfragen pro Konto und Stunde und 10 pro Tag.
Ein neuer Wechsel ersetzt einen angefangenen. Die bisherige Adresse bleibt bis zur Bestätigung das Login.
Damit Schritt 2 ein Neuladen übersteht (Wechsel in die Mail-App), merkt sich das Gerät die neue
Adresse 15 Minuten, wie beim Login die Code-Anfrage *(Entscheid Claude beim Bau)*.

**Grenzen** *(Entscheid Claude)*: Beide Mails eines Wechsels (auch der Hinweis «schon in Gebrauch»)
zählen gegen die bestehende Grenze **pro Empfänger-Adresse** (3 pro Stunde, 10 pro Tag, gemeinsam mit
Login- und Admin-Code-Mails) und gegen die Grenze **pro IP**. So kann niemand mit einer offenen Sitzung
fremde Adressen mit Mails überhäufen. Ist die Grenze der **alten** (eigenen) Adresse erreicht, sieht
das Mitglied «Zu viele Versuche, bitte später nochmals» (verrät nichts Fremdes). Ist die Grenze der
**neuen** Adresse erreicht, geht still keine Mail hinaus, die Antwort bleibt gleich. Dass drei
Wechsel-Versuche den Login-Code der alten Adresse für eine Stunde bremsen, ist hingenommen: Das
Mitglied ist in diesem Moment ja angemeldet.

**Neue Adresse gehört schon einem anderen Mitglied** *(Entscheid Claude)*: Statt eines Codes erhält
die neue Adresse einen Hinweis («Diese Adresse ist bei MyTCO schon in Gebrauch, eine Änderung ist
nicht möglich»). Die Bestätigung scheitert dann mit derselben Meldung wie ein falscher Code. So
erfährt nur, wer die Adresse besitzt, dass sie vergeben ist. Gleiche Adresse wie bisher (auch in
anderer Gross-/Kleinschreibung): sofortige Meldung «Das ist schon deine Adresse», ohne Mail.

## Was der Admin tut: Für Fairgate

Neuer Punkt in der Verwaltung, Bereich Admin: **«Für Fairgate»** (Entscheid Projektleiter: alle
Kontaktangaben, nicht nur die Adresse).

- Die Liste zeigt jedes Mitglied, das «für Fairgate offen» ist: Name, Mitgliedernummer, welche
  Angaben sich geändert haben (Adresse, E-Mail, Telefon) mit ihren aktuellen Werten, Datum der
  letzten Änderung. Älteste zuerst.
- Knopf **«In Fairgate übertragen»** je Zeile: Die Markierung wird gelöscht, die Zeile verschwindet,
  und der Änderungsverlauf erhält eine neue Aktion `fairgate-uebertragen` mit Urheber `admin`.
  Bei zwei Admins ist so klar, wer es erledigt hat.
- Das Abhaken gilt dem angezeigten Stand *(Entscheid Claude beim Bau)*: Hat das Mitglied seither
  weiter geändert, lehnt MyTCO ab (`veraltet`), und die Liste zeigt den neuen Stand. Sonst
  überträgt der Admin alte Werte, und die neue Änderung verschwindet ungesehen.
- Ändert ein Mitglied vor dem Abhaken mehrmals etwas, bleibt es **ein** Eintrag je Mitglied mit
  allen seither geänderten Angaben, den aktuellen Werten und dem neuesten Datum.
- Ändert der Admin selbst eine Angabe in der Verwaltung, entsteht **kein** Eintrag (er trägt sie
  ohnehin gleich in Fairgate nach); ein schon offener Eintrag bleibt bestehen.
- Zugang wie die übrige Verwaltung: Rolle Admin und frischer Mail-Code (SI-08).
- Annahmen K-19.1 und K-19.2: Die Liste existiert nur, weil das Mitglied die Angaben selbst ändert.

**Hinweis für #46 (Einlesen der Fairgate-Liste):** Angaben eines Mitglieds, das «für Fairgate offen»
ist, darf das Einlesen nicht überschreiben — sie sind neuer als Fairgate. Das gilt besonders für die
E-Mail-Adresse (Login).

## Oberfläche

Visueller Entwurf: [Design-Artifact «MyTCO Profil bearbeiten»](https://claude.ai/artifact/GFs8jg4p9W4V1UxRNdnsjF)
auf dem [Design System «MyTCO»](https://claude.ai/artifact/B9WzQ6CmeP3QUq1NYAbSsi), nur mit erfundenen Daten.

- **Profil, Variante A** (Entscheid Projektleiter): Aufklappbereich «Meine Angaben» oben, geöffnet.
  Jede änderbare Angabe (E-Mail, Telefon, Adresse, Lizenznummer) steht als Text mit einer Nebentaste
  «Ändern»; «Ändern» öffnet die Felder dieser einen Angabe an Ort und Stelle mit Haupttaste
  «… speichern» und «Abbrechen» (höchstens eine Haupttaste, UI-04). Name, Jahrgang und
  Mitgliedernummer als Nebentext darunter mit «ändert der Admin» und Kontakt (K-21). Darunter wie
  heute «Anmelden mit Passkey» und «Abmelden». Variante B (alle Felder direkt) ist verworfen.
- **E-Mail ändern:** eigene Unterseite mit «‹ Zurück» und Zähler, Schritt 1 neue Adresse
  («Codes senden»), Schritt 2 zwei Code-Felder (bisherige / neue Adresse, «E-Mail ändern», «Neue
  Codes senden»). Danach zurück im Profil mit Hinweis «E-Mail geändert» und «Schliessen».
- **Verwaltung «Für Fairgate»:** Punkt in der Seitenleiste mit Anzahl offener Einträge; Tabelle
  Mitglied · Nr. · Geändert · Neue Angaben · Seit · «In Fairgate übertragen».
- Abnahme per Bildvergleich: Screenshot der App neben dem jeweiligen Artboard.

## Daten

- `mitglied`: Markierung «für Fairgate offen seit» (Zeitpunkt), gesetzt bei Selbständerung von
  Adresse, E-Mail oder Telefon, gelöscht beim Abhaken. Welche Felder geändert wurden, muss die Liste
  zeigen können (z. B. aus dem Änderungsverlauf seit dem Zeitpunkt oder als eigene Feldliste —
  dem Bauenden überlassen).
- Für den laufenden E-Mail-Wechsel je Konto höchstens ein Eintrag: neue Adresse, zwei Code-Hashes,
  Ablauf, Fehlversuche. Er liegt nur im Arbeitsspeicher des Servers, nicht in der Datenbank
  *(Entscheid Claude beim Bau)*, und wird bei Bestätigung, nach 5 Fehlversuchen oder bei neuem
  Wechsel gelöscht bzw. ersetzt; abgelaufene (15 Minuten) räumt MyTCO spätestens 10 Minuten später
  weg, ein Neustart löscht alle.
- Änderungsverlauf: neue Aktion `fairgate-uebertragen`.
- Migration nur additiv (eine neue Spalte); keine bestehende Migration ändern.

## Datenschutz und Sicherheit

Geprüft gegen `docs/datenschutz.md`. Keine neue Datenart: E-Mail, Telefon und Adresse stehen schon
unter *Welche Daten*, der Admin sieht Adressen schon heute. Nachzuführen:

- **Datenschutzkonzept:** Selbständerung von Adresse und Lizenznummer (Annahme K-19.2, FR-02);
  Markierung «für Fairgate offen»; die neue Adresse eines laufenden Wechsels (nur im Arbeitsspeicher,
  höchstens 15 Minuten gültig, weg nach Ablauf oder Neustart; dazu 15 Minuten im Gerätespeicher des
  eigenen Geräts) unter *Welche Daten* und *Löschen*.
- **Datenschutzerklärung,** Abschnitt *Ihre Rechte*: «E-Mail, Telefon, Adresse und Lizenznummer
  ändern Sie selbst in der App»; geänderte Kontaktangaben überträgt der Verein von Hand nach Fairgate.
- **Sicherheitskonzept:** SI-09 ist damit für die Selbständerung umgesetzt; die Grenzen oben (pro
  Konto, pro Empfänger-Adresse, pro IP) in SI-04/SI-09 ergänzen.
- Logs ohne Codes und ohne Adressen (DS-06). Testdaten erfunden (DS-08).

## Hilfe

Die Hilfe-Seite erhält den Abschnitt «Eigene Angaben ändern» (A-HILFE-01): was man selbst ändert,
dass die E-Mail zwei Codes braucht und an wen man sich wendet, wenn die alte Adresse nicht mehr geht.

## Nachweis (Definition of Done aus #50)

- Tests mit A-KONTO-01 bzw. A-KONTO-02 im Namen: Telefon, Adresse und Lizenznummer ändern, «veraltet»-Fall,
  E-Mail-Wechsel mit beiden Codes, falscher Code, Ablauf, Fehlversuche, vergebene Adresse
  (gleiche Antwort), Grenzen pro Konto, pro Empfänger-Adresse und pro IP, Verlauf mit Urheber
  «Mitglied selbst».
- Liste «Für Fairgate»: Eintrag entsteht bei Selbständerung von Adresse, E-Mail oder Telefon (nicht
  bei Lizenznummer, nicht bei Admin-Änderung), zeigt die geänderten Felder, verschwindet nach
  Abhaken, Verlauf `fairgate-uebertragen`, nur mit Admin-Zugang.
- E2E mit Screenshots iPhone/Android, axe ohne Verstösse; Bildvergleich mit dem Design-Artifact.
- Anforderungen (A-KONTO-01 auf *umgesetzt\**, A-KONTO-02 von *offen/später* auf *umgesetzt\** mit Annahme, Änderungsprotokoll),
  Fachmodell, Rollen und Rechte (Zeilen Adresse und Lizenznummer), Datenschutz, Datenschutzerklärung,
  Sicherheitskonzept, Testkonzept und Hilfe nachgeführt.

## Dem Bauenden überlassen

- Aufteilung in Schnittstellen unter `src/routes/api/…` (nur `+server.ts`, ADR-002) und Module unter
  `src/lib/server/…`; Wiederverwendung von Code-Erzeugung, Hash, Bremse und Mailer aus dem Login.
- Ob der E-Mail-Wechsel eine eigene Tabelle oder Spalten am Konto bekommt.
- Wortlaut der Mails und Meldungen (kurz, Du-Form wie im Login).
- Aufbau der Profilseite und der Liste «Für Fairgate»: kommt aus dem Design-Artifact, nur mit Tokens und
  Bausteinen aus `docs/ui-leitbild.md`.
