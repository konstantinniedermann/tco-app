# Design: Mitteilungen per Push und E-Mail (N-APP-02)

**Datum:** 2026-11-06 · **Issue:** [#63](https://github.com/konstantinniedermann/tco-app/issues/63) · **Status:** freigegeben (Projektleiter, 06.11.2026)

## Absicht

Wer einen Anlass oder die Clubmeisterschaft (CM) verantwortet, soll die Mitglieder **gezielt
und mit einem Tipp** erreichen: an die Anmeldung erinnern, eine kurzfristige Änderung melden,
auf einen neuen Anlass hinweisen. Heute geht das nur per Mail von Hand an eine selbst
zusammengesuchte Liste. MyTCO kennt die Antworten zu Anlässen und die Anmeldungen zur CM. Darum
kann es die Empfänger selbst bestimmen, z. B. «alle, die zur GV noch nicht geantwortet haben»
oder «alle, die in *Damen R7–R9* spielen dürfen und noch nicht angemeldet sind».

In MyTCO gibt es noch keinen Push. Dieser Entwurf bringt deshalb beides: die Grundlage für
Push nach [ADR-001](../../adr/adr-001-web-app-zuerst.md) (Web Push, das Mitglied schaltet ihn
selbst ein) und das Werkzeug, mit dem die Admins Mitteilungen verschicken. Beschrieben und
geplant wird alles zusammen (Entscheid Projektleiter).

**Wörter:** Eine *Mitteilung* ist eine Nachricht, die ein Admin von Hand verschickt, als Push,
als E-Mail oder als beides. *Push eingeschaltet* heisst: Das Mitglied hat auf mindestens einem
Gerät Push erlaubt, und MyTCO hat dafür ein gültiges Abo gespeichert.

## Ziele

### A — Push einschalten (Mitglied)

1. **Profil, Karte *Benachrichtigungen*:** Schalter «Push auf diesem Gerät». Beim Einschalten
   fragt der Browser um Erlaubnis. Push gilt je Gerät; die Karte zeigt, ob er auf diesem Gerät
   an ist. Eingeschaltet werden kann nur durch einen Tipp des Mitglieds (iPhone verlangt das).
2. **iPhone ohne Startbildschirm:** Statt des Schalters steht der Hinweis, dass Push auf dem
   iPhone nur geht, wenn MyTCO auf dem Startbildschirm liegt, mit Link zur bestehenden
   Anleitung (Hilfe beim Start, #47). Android: Push geht auch im Browser.
3. **Einmaliger Hinweis auf der Startseite:** Ist Push auf dem Gerät aus und lässt er sich dort
   einschalten, erscheint eine eigene Fläche «Mitteilungen aufs Handy?» mit «Einschalten» und
   «Nein, danke». Nach «Nein, danke» kommt sie auf diesem Gerät nicht wieder *(mein Vorschlag)*.
4. **Drei Themen:** Im Profil drei Schalter **Anlässe**, **Clubmeisterschaft**, **Verein**.
   Sie gelten für Push **und** für die E-Mail einer Mitteilung (Entscheid Projektleiter, «für
   den Moment»; eine Trennung später ist möglich). Für neue Konten sind alle drei an
   *(mein Vorschlag)*. Bestätigungs-Mails (Anmeldung, Login-Code) betreffen sie nicht.
5. **Abmelden vom Gerät:** Beim Abmelden (Logout) und beim Beenden einer Sitzung wird das Push-Abo
   dieses Geräts gelöscht, damit ein weitergegebenes Handy nichts mehr bekommt *(mein Vorschlag)*.

### B — Mitteilung verschicken (Admin)

6. **Wer, worüber:**

   | Bezug | Wer sendet | Ort in der Verwaltung | Thema beim Mitglied | Tipp auf den Push öffnet |
   |-------|-----------|------------------------|---------------------|--------------------------|
   | Anlass | Mitglieder-Admin | Seite des Anlasses | Anlässe | Anlass-Seite |
   | CM (Turnier) | CM-Admin | Seite des Turniers | Clubmeisterschaft | CM-Seite |
   | allgemein | Mitglieder-Admin | eigener Bereich *Mitteilungen* *(mein Vorschlag)* | Verein | Startseite |

   Keine neue Rolle (Entscheid Projektleiter). Der MyTCO-Admin sieht alles nur lesend
   (*Ansicht als …*, A-ROLLE-09); Senden weist der Server ihm ab.

7. **Vorlagen:** Knopf «Neue Mitteilung», dann Wahl einer Vorlage oder «Leer anfangen».
   Vorlagen je Bezug:
   - Anlass: *Erinnerung* («{Titel}: Bitte melde dich bis {Anmeldeschluss} an oder ab»),
     *Änderung* («{Titel}: Datum, Zeit oder Ort geändert, bitte prüfe deine Antwort»),
     *Neuer Anlass* («Neu in MyTCO: {Titel} am {Beginn}, melde dich an»).
   - CM: *Erinnerung* («Clubmeisterschaft {Jahr}: Anmeldung bis {Anmeldeschluss}»),
     *Änderung*, *Anmeldung offen*.
   - allgemein: keine Vorlage, nur leer.

   Die Platzhalter füllt MyTCO beim Wählen der Vorlage aus dem Anlass bzw. Turnier, nicht erst
   beim Senden. Titel und Text sind danach frei änderbar. Die genauen Sätze legt der Builder
   fest *(Vorlagen im Code, nicht in der Verwaltung pflegbar; mein Vorschlag)*.

8. **Felder:** Titel (1–50 Zeichen) und Text (1–200 Zeichen) *(Grenzen mein Vorschlag:
   iPhone kürzt längere Pushes)*. Darunter der feste Hinweis «Keine Namen, Telefonnummern oder
   Resultate: Die Mitteilung kann auf dem Sperrbildschirm stehen» (DS-05). MyTCO prüft den
   Inhalt nicht maschinell.

9. **Empfänger.** Grundmenge sind immer die **aktiven Mitglieder**. Dann je Bezug:

   - **Anlass:** *alle* · *noch keine Antwort* · *kommt* · *kommt nicht* · *zu prüfen* (Antwort
     älter als die letzte Terminänderung, FR-32). Genau eine Auswahl.
   - **CM:**
     - *alle*
     - *angemeldet*, wahlweise in Kategorie X
     - *spielberechtigt und noch nicht angemeldet*, wahlweise in Kategorie X. Ohne Kategorie
       heisst das: in mindestens eine Kategorie berechtigt und noch in keiner angemeldet. Mit
       Kategorie: in X berechtigt und in X nicht angemeldet.

     Wer nicht berechtigt ist, bekommt keine Erinnerung zu dieser Kategorie (Entscheid
     Projektleiter). **Spielberechtigt** heisst hier (Entscheide Projektleiter):
     - **Einzel:** Geschlecht, Jahrgang und Klassierung passen zur Kategorie (FR-07, aus #58).
       Kategorien, die nur mit Wildcard-Antrag gingen, zählen **nicht**.
     - **Doppel:** nur das Geschlecht passt (Herren, Damen; Mixed passt für alle). Im Doppel
       gibt es keine Alterskategorien, und die Klassierungssumme prüft erst die Anmeldung mit
       dem Partner.
     - **Fehlende Angaben** (Geschlecht, Jahrgang oder Klassierung leer): Das Mitglied zählt
       bei *spielberechtigt und noch nicht angemeldet* **ohne** Kategorie mit, bei einer
       bestimmten Kategorie nicht. Die CM-Seite fragt es dann nach den Angaben.

     **Angemeldet** ist, wer in der Kategorie eine Anmeldung hat, die nicht *zurückgezogen*
     oder *abgelehnt* ist: bestätigt, Wildcard beantragt, sucht Partner oder als Partner
     eingetragen (Entscheid Projektleiter). Nicht mitgezählt werden abgesagte Kategorien und
     Mitglieder, die schon die Höchstzahl von 3 Anmeldungen haben *(mein Vorschlag)*.
   - **allgemein:** alle aktiven Mitglieder.

   Keine Filter nach Geschlecht, Alter oder Klassierung (Entscheid Projektleiter): Die
   Berechtigung deckt das ab, und diese Felder bleiben bei ihrem bisherigen Zweck.

   Zum Schluss fallen alle weg, die das Thema der Mitteilung abgeschaltet haben (Ziel 4).

10. **Weg** (Entscheid Projektleiter, pro Mitteilung):
    - *nur Push*
    - *Push, und E-Mail an alle ohne Push* (Vorauswahl *(mein Vorschlag)*)
    - *Push und E-Mail an alle* (wer Push hat, bekommt beides)

11. **Vorschau vor dem Senden:** «37 Mitglieder: 12 per Push, 25 per E-Mail» (bei «an alle»:
    «12 per Push und E-Mail, 25 nur per E-Mail»), darunter aufklappbar die Namen (Entscheid
    Projektleiter). Mitglieder ohne E-Mail-Adresse und ohne Push zählt sie als «nicht
    erreichbar: 2». Dann eine Rückfrage «Jetzt an 37 Mitglieder senden?», danach geht sie raus.
    Kein Senden zu einem späteren Zeitpunkt, kein automatisches Senden.

12. **Verlauf:** Am Anlass, am Turnier und im Bereich *Mitteilungen* eine Liste der verschickten
    Mitteilungen: wann, von wem, Titel und Text, gewählte Empfänger (in Worten, z. B. «noch keine
    Antwort»), Weg und Zahlen (Push zugestellt, E-Mails verschickt). Keine Namensliste der
    Empfänger im Verlauf *(mein Vorschlag: Namen nur in der Vorschau, nicht gespeichert)*.

### C — Zustellung

13. **Push:** Web Push nach W3C über die Push-Dienste der Browser, mit eigenem
    Schlüsselpaar (VAPID) des Servers. Inhalt: Titel, Text, Link. Meldet der Push-Dienst ein
    Abo als ungültig (abgelaufen, Push auf dem Gerät entzogen), löscht MyTCO es.
14. **E-Mail:** über den bestehenden Mailweg (Scaleway, `src/lib/server/login/mail.ts`).
    Je Empfänger eine eigene Mail an seine Adresse; kein CC, keine sichtbaren anderen Empfänger
    (DS-05). Betreff = Titel, Inhalt = Text und Link zur Seite. Fusszeile: «Diese Mitteilungen
    kannst du im Profil abschalten» mit Link.
15. **Push scheitert:** Kommt beim Weg *Push, und E-Mail an alle ohne Push* jedes Abo eines
    Mitglieds als ungültig oder fehlgeschlagen zurück, bekommt es ersatzweise die E-Mail. Darum
    zuerst Push, dann Mails. Der Verlauf zählt «ersatzweise per E-Mail» eigens *(mein Vorschlag)*.
16. **Ein Fehler bei einem Empfänger hält die anderen nicht auf.** Das Formular zeigt nach dem
    Senden die Zahlen aus Ziel 12. Ohne Push im Hintergrund-Job: Der Versand läuft in der Anfrage
    (bei 300–500 Mitgliedern Sekunden) *(mein Vorschlag; bei Bedarf der Builder)*.

## Nicht-Ziele

- Kein automatischer Push (bei neuem Anlass, Terminänderung, Anmeldeschluss). Immer per Knopf.
- Keine geplante Mitteilung für später.
- Keine Filter nach Geschlecht, Alter, Klassierung oder freien Kriterien.
- Keine Antwort oder Rückfrage auf eine Mitteilung; keine Lesebestätigung.
- Keine Mitteilungs-Liste für Mitglieder in der App (Posteingang).
- Kein nativer Push über APNs/FCM (erst mit einer Store-App, ADR-001).
- Keine neue Rolle *Anlässe-Veranstalter* (A-ROLLE-04 bleibt «später»).
- Keine Mitteilung an Junioren-Eltern (#45 ist noch offen; was dort entsteht, bestimmt später,
  ob ein Elternteil die Mitteilungen des Kindes bekommt).

## Anti-Ziele

- Eine Mitteilung, die bei Mitgliedern ankommt, die sie nicht betrifft, z. B. eine
  CM-Erinnerung zu einer Kategorie, in der man nicht spielen darf.
- Ein Push, der Personendaten Dritter auf den Sperrbildschirm bringt.
- Ein Versand, den der Admin nicht vorher an Zahl und Namen prüfen konnte.
- Ein Mitglied, das Mitteilungen nicht abstellen kann.

## Datenschutz

Geprüft gegen [Datenschutz](../../datenschutz.md). Neu:

| Daten | Zweck | Löschen |
|-------|-------|---------|
| Push-Abo je Gerät: Adresse beim Push-Dienst, zwei Schlüssel, eingerichtet am, zugehörige Sitzung | Push zustellen | mit der Sitzung, beim Abschalten, wenn der Push-Dienst es als ungültig meldet, mit dem Konto |
| Themen-Schalter Anlässe / CM / Verein | Mitteilungen abstellen | mit dem Konto |
| Merker «Push-Hinweis abgelehnt» | Hinweis nicht wiederholen | nur im Gerätespeicher |
| Verlauf der Mitteilungen: Absender, Zeit, Titel, Text, Empfänger in Worten, Zahlen | Doppelte Mitteilungen vermeiden, nachvollziehen | *(mein Vorschlag:)* ein Jahr nach dem Versand, ohne Hintergrund-Job: Jeder neue Versand löscht ältere Einträge mit; mit dem Anlass, wenn er gelöscht wird |

Die Zeile *Konto, Rollen, Benachrichtigungs-Einstellungen* in «Welche Daten» deckt die
Einstellungen schon ab. Ergänzt werden: Push-Abo, Verlauf, Merker, und in der
Datenschutzerklärung ein Absatz zu Push (Daten an Apple, Google oder Mozilla: nur die
Mitteilung selbst, verschlüsselt ohne Namen; DS-05). Geschlecht, Jahrgang und Klassierung
werden nur über die Spielberechtigung genutzt, also für ihren bisherigen Zweck (Zulassung zu
Kategorien). Der Mitglieder-Admin und der CM-Admin sehen in der Vorschau nur Namen, die sie
schon sehen dürfen (Wer sieht was; K-42).

Erst Konzept und Datenschutzerklärung, dann Code (CLAUDE.md).

## Rahmen

- Bauregel [ADR-002](../../adr/adr-002-sveltekit-postgresql.md): Server nur über `+server.ts`.
- Oberfläche nur aus [UI-Leitbild](../../ui-leitbild.md). Formular, Vorschau und Verlauf
  brauchen voraussichtlich keine neuen Bausteine; was fehlt, kommt zuerst ins Leitbild.
- Service Worker: SvelteKit-eigener (`src/service-worker.ts`), nur für den Empfang von Push und
  den Tipp darauf, **kein Offline-Cache** *(mein Vorschlag: Caching ist ein eigenes Thema)*.
- Neue Abhängigkeit: voraussichtlich `web-push` (Versand mit VAPID). Freigabe im Plan.
- VAPID-Schlüssel als Server-Geheimnis je Umgebung (lokal, Test, Live), wie die übrigen
  Geheimnisse ([Sicherheitskonzept](../../sicherheitskonzept.md)).
- Kosten: Web Push CHF 0. Mails: eine Mitteilung an alle sind 300–500 Mails; Scaleway
  EUR 0.25 je 1000 über dem Gratis-Kontingent ([Kosten](../../kosten.md)).
- Abhängig von [#58](https://github.com/konstantinniedermann/tco-app/issues/58) (Spielberechtigung FR-07, Anmeldungen) für die CM-Empfänger. Push,
  Anlass und allgemein hängen nicht davon ab.
- Prüfbar: Versand an den Push-Dienst in Tests gegen eine Attrappe; E2E prüft Formular,
  Vorschau, Rückfrage und Verlauf. **Nachweis echter Push:** lokal in Chrome auf dem Mac über
  `localhost` (gilt als sichere Verbindung), mit Screenshot der Mitteilung. Der Handtest auf
  iPhone und Android braucht HTTPS, also den Test-Server (#39); bis dahin bleibt er ein
  offener Punkt der Definition of Done, kein Blocker *(mein Vorschlag)*.

## Dem Builder überlassen

- Die Datenstruktur (Tabellen für Abos, Mitteilungen, Einstellungen).
- Die genauen Vorlagen-Sätze und die Gestaltung des Formulars im Rahmen des Leitbilds.
- Die Reihenfolge und den Schnitt in Teil-Issues (Vorschlag: Push-Grundlage, Anlass und
  allgemein, dann CM nach #58).
