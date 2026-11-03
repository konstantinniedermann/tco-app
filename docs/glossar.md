[← Übersicht](index.md)

# Glossar

Fachbegriffe von TCO und Swiss Tennis und wie MyTCO sie nennt. Die Spalte **In MyTCO** gilt
für Oberfläche und Doku; die Namen im Code legt das Fachmodell fest. Die Bereiche der
[Anforderungs-IDs](anforderungen/anforderungen.md) sind Wörter aus diesem Glossar.

Was nicht belegt ist, steht als *Vermutung* da.

## Quellen

| Kürzel | Quelle |
|--------|--------|
| PDF | Anforderungsdokument v1.2 vom 22.10.2026, Abschnittsnummer dahinter ([`anforderungen/`](anforderungen/README.md)) |
| Ziel | Zielsetzung vom 29.10.2026 ([`anforderungen/README.md`](anforderungen/README.md)) |
| ADV | Swiss Tennis: [Benutzerdokumentation Turnieradministration Advantage](https://www.swisstennis.ch/media/3964/benutzerdokumentation_turnierapplikation_de.pdf) (PDF, 43 Seiten, abgerufen 29.10.2026), Seitenzahl dahinter |
| Recherche | [Recherche Systemlandschaft](recherche/README.md) vom 29.10.2026; dort mit Quellen, u. a. [tcolten.ch/wettkampf](https://tcolten.ch/wettkampf) |

## Sprachregeln für MyTCO

- **Login statt Anmelden:** Einloggen heisst in MyTCO *Login*. *Anmeldung* steht nur für
  die Teilnahme an Clubmeisterschaft oder Anlass. So bleibt „Anmeldung“ eindeutig.
  Die Regel gilt für App, Brief und Doku. Fragen und Texte an den Verein dürfen beim
  vertrauten «Anmelden» bleiben.
- **Kategorie statt Konkurrenz:** Der Verein sagt *Kategorie*, Advantage *Konkurrenz*.
  MyTCO folgt dem Verein; beim Datenaustausch entspricht eine Kategorie einer Konkurrenz.
- **Klassierung statt Stärkekategorie:** Das PDF sagt *Stärkekategorie*, Swiss Tennis
  *Klassierung*. MyTCO nimmt den Begriff, den die Spieler von Swiss Tennis kennen.
- Ob die Oberfläche gendert (Advantage schreibt „Spieler:innen“), klärt das UI-Leitbild
  (Issue #13). Die Doku schreibt *Spieler*.

## Clubmeisterschaft und Turnier

| Begriff | Bedeutung | In MyTCO | Quelle |
|---------|-----------|----------|--------|
| Clubmeisterschaft (CM) | Jährliches Turnier des TCO für seine Mitglieder. Heute Anmeldung per E-Mail, Gruppenspiele organisieren die Spieler selbst. Ablauf bisher: Anmeldeschluss Anfang Juni, Gruppenspiele bis Anfang August, Finalwochenende Mitte August. 2027: Anmeldung ab Mitte April, Auslosung Anfang Juni (K-01). *Annahme K-24.1:* Gruppenspiele und Finalwochenende wie bisher | Clubmeisterschaft; in der Doku kurz CM | PDF 5, Recherche |
| Turnier | Bei Swiss Tennis das ganze Turnier mit Plätzen und Konkurrenzen; durchläuft die Status *in Bearbeitung*, *zur Kontrolle bei Swiss Tennis*, *publiziert*, *zu Ende*. Im PDF ist das Turnier die Clubmeisterschaft eines Jahres | Turnier | ADV 5–6, 13–14, 43; PDF 5a |
| Turniernummer | Nummer, unter der Swiss Tennis ein Turnier führt. Das PDF spricht von mehreren Turniernummern je Clubmeisterschaft. Im Advantage-Handbuch nicht erklärt. *Annahme K-25.4:* eine Nummer je Advantage-Turnier, z. B. getrennt für Gruppenphase und Finalwochenende | Turniernummer | PDF 5a, 5e-i |
| Internes Turnier | Turnierkategorie in Advantage: zählt nicht für die Klassierung und erscheint nicht im Turnierkalender. *Vermutung:* die CM ist **kein** internes Turnier, weil ihre Resultate an Swiss Tennis gehen | — (nur Hintergrund) | ADV 11, 15 |
| Kategorie | Einzelner Wettbewerb innerhalb der Clubmeisterschaft, eingeteilt nach Geschlecht, Alter, Stärke und Einzel/Doppel. Entspricht in Advantage einer **Konkurrenz** | Kategorie | PDF 5a |
| Konkurrenz | Advantage-Begriff für einen Wettbewerb im Turnier, festgelegt durch Begegnungsart, Alterskategorie, Klassierungsbereich und Form. Anmeldung, Tableau, Spielplan und Status laufen je Konkurrenz. „Kategorie“ ist in Advantage nur ein Merkmal (Alterskategorie, Turnierkategorie) | Kategorie (siehe Sprachregeln) | ADV 7, 9–10, 15, 27–28, 39, 43 |
| Alterskategorie | Altersmerkmal einer Konkurrenz, z. B. „10&U“, „12&U“. Welche Alterskategorien die CM anbietet, ist nicht belegt | Alterskategorie | ADV 9–10; PDF 5a |
| Begegnungsart | Merkmal einer Konkurrenz. *Vermutung:* Einzel oder Doppel (steht im Handbuch nur in einem Bildschirmfoto) | Einzel / Doppel | ADV 10; PDF 5a |
| Doppelpartner | Mitspieler in einer Doppelkategorie, bei der Anmeldung aus den Spielern des Clubs gewählt. Advantage erfasst ein Doppelteam als zwei Lizenznummern, verbunden mit „/“ | Doppelpartner | PDF 5b; ADV 18 |
| Klassierung | Spielstärke eines Spielers bei Swiss Tennis, z. B. R8. Grundlage für die Zulassung zu einer Konkurrenz (von–bis, z. B. R7–R9) und für die Setzung. *Vermutung:* Skala R1–R9 und N1–N4; im Handbuch steht nur das Beispiel R7–R9 | Klassierung (Wert des Spielers), Klassierungsbereich (zugelassen in einer Kategorie) | ADV 9–11, 29 |
| Stärkekategorie | Wort des PDFs für Klassierung bzw. Klassierungsbereich. Lässt sich nicht automatisch von Swiss Tennis übernehmen | nicht verwendet → Klassierung | PDF 5a, 5b |
| Form | Wie eine Konkurrenz gespielt wird: *Round Robin* (Gruppenspiele), *Draw* oder *Abbruchtableau* | — | ADV 10 |
| Gruppe, Gruppenspiele | Form „Round Robin“: Jeder spielt gegen jeden in seiner Gruppe. Der Organisator legt die Anzahl Gruppen fest und teilt die Spieler zu | Gruppe, Gruppenspiele | ADV 10, 39–41; PDF 5c |
| KO-System | Wer verliert, scheidet aus. In Advantage heisst die Form *Draw*. *Vermutung:* „Draw“ ist das KO-System; das Handbuch erklärt den Begriff nicht | KO-System | PDF 5c; ADV 10 |
| Tableau | Spielfeld einer Konkurrenz mit Positionen; die Grösse ergibt sich aus der Zahl der bestätigten Spieler | Tableau | ADV 10–11, 29–30 |
| Finaltableau | Tableau, das in Advantage auf die Gruppenspiele folgt. Laut PDF eröffnet der TCO dafür neue KO-Turniere (siehe [K-25](abklaerungen.md#vor-cm-anmeldung-15052027)) | Finaltableau | ADV 42; PDF 5e-i |
| Setzung | Die Gesetzten werden aus der Klassierung bestimmt und nach Turnierreglement platziert | Setzung | ADV 29 |
| Auslosung | Teilt nach der Setzung die übrigen Spieler auf die Positionen im Tableau zu | Auslosung | ADV 7, 10, 28–29 |
| Runde | Stufe im Tableau; Spielplan und Resultate werden je Runde erfasst | Runde | ADV 30, 32, 37 |
| Begegnung | Advantage-Wort für ein einzelnes Match | Spiel | ADV 10, 32, 41; PDF 5d |
| Anmeldung | Teilnahme eines Spielers (Einzel) oder eines Doppelteams an einer Kategorie. In Advantage meldet man sich online über myTennis an und landet in der Anmeldeliste; ins Tableau kommt man erst, wenn die Anmeldung *bestätigt* ist. In MyTCO höchstens 3 gleichzeitig | Anmeldung | PDF 5b; ADV 18, 20–23, 28–29 |
| Anmeldeschluss | Datum, nach dem keine Anmeldungen mehr möglich sind; in Advantage je Turnier oder Konkurrenz. Beim TCO bisher Anfang Juni, 2027 vor der Auslosung Anfang Juni (hängt an K-24.2) | Anmeldeschluss | ADV 7, 10, 13, 28; Recherche |
| Nenngeld | Startgebühr in Advantage, je Spieler mit Vermerk „bezahlt“. Die CM hat kein Nenngeld (K-25.2) | Nenngeld | ADV 7, 28 |
| Wildcard-Antrag | Anmeldung für eine Kategorie ausserhalb des eigenen Klassierungsbereichs, mit Kommentar; der CM-Verantwortliche entscheidet | Wildcard-Antrag | [A-ANMELDUNG-10](anforderungen/anforderungen.md#anmeldung--anmeldung-zur-clubmeisterschaft) |
| Folgespiel | Spiel der nächsten KO-Runde, in das der Sieger eines Spiels nachrückt | Folgespiel | [Fachmodell](fachmodell.md) |
| Resultat | Ergebnis eines Spiels. In MyTCO melden die Spieler es selbst. In Advantage erfasst nur der Organisator, von Hand pro Runde oder Spiel; einen Import gibt es nicht | Resultat; der Vorgang heisst *Resultat melden* | PDF 5d; ADV 37, 41, 43 |
| Rangliste | Reihenfolge in einer Gruppe nach gewonnenen Begegnungen. Bei Gleichstand gilt: 1. Direktbegegnung, 2. bessere Satzdifferenz, 3. bessere Gamedifferenz; danach manuelle Anpassung möglich. Das PDF nennt das „Einreihung“ | Rangliste | ADV 41; PDF 5d |
| Finalwochenende | Abschluss der CM Mitte August mit den KO-Spielen | Finalwochenende | PDF 5e; Recherche |
| Spielplan | Spielzeiten und Orte der Spiele, in Advantage je Runde oder direkt im Tableau erfasst | Spielplan | ADV 26, 31–35; PDF 5e |
| Spielzeitraster | Zeitraster, das Advantage aus Plätzen, Matchdauer und Spielbeginn erzeugt. Das PDF wünscht ein Raster in 30-Minuten-Schritten | Spielzeitraster | ADV 7, 34; PDF 5e-i |
| Platz | Tennisplatz, auf dem gespielt wird; in Advantage vor der Spielplanung zu definieren. Plätze werden benannt, u. a. für die neue Anlage Gheid | Platz | ADV 7, 13, 31, 34; PDF 5e-i |
| Spielplanüberprüfung | Prüfung in Advantage auf Abwesenheiten, gleichzeitige Spiele und zu kurze Pausen. Das PDF spricht von Konfliktsituationen | Konflikt | ADV 7, 26, 34; PDF 5e-i |
| Organisator | Club oder Vereinigung, die ein Turnier in Advantage führt. Das PDF spricht vom „Verantwortlichen“ der CM | CM-Verantwortlicher (Rolle) | ADV 6–7, 11, 21, 30; PDF 5a |

## Lizenz

| Begriff | Bedeutung | In MyTCO | Quelle |
|---------|-----------|----------|--------|
| Lizenz | Spielberechtigung von Swiss Tennis, Pflicht für offizielle Turniere. Beim TCO macht der Club das Inkasso, die Lizenz verlängert sich automatisch | Lizenz | ADV 15, 20, 22, 25; Recherche |
| Lizenznummer | Nummer, unter der Swiss Tennis einen lizenzierten Spieler führt. Advantage nimmt eine ganze Spalte Lizenznummern per Copy-Paste an. Das Mitglied ergänzt sie beim ersten Login | Lizenznummer | ADV 17–18; PDF 3b-i |
| Lizenzantrag | Antrag eines Mitglieds in MyTCO, eine Lizenz zu bestellen bzw. zu aktualisieren oder zu stornieren | Lizenzantrag | Ziel; PDF 3e |
| Storno | Antrag, die Lizenz abzubestellen. *Annahme K-34:* entspricht der Sistierung bei Swiss Tennis (siehe [Abklärungen](abklaerungen.md#vor-lizenzanträgen-01102027)) | Storno | Ziel; PDF 3e |
| Sistierung | Beim TCO bis Ende Februar möglich. *Annahme K-34.1:* die Lizenz ruht für die folgende Saison. Im Advantage-Handbuch nicht erwähnt | Sistierung | Recherche |
| Stichtag | Datum, zu dem der Lizenzverantwortliche die Liste der Lizenzanträge sieht und exportiert. *Annahme K-34.2:* liegt vor der Sistierungsfrist Ende Februar | Stichtag | Ziel |
| Lizenzrunde | Alle Lizenzanträge eines Jahres bis zu einem Stichtag; der Lizenzverantwortliche exportiert sie gesammelt | Lizenzrunde | [Fachmodell](fachmodell.md) |
| Lizenzliste | Jährliche Liste aller aktuellen Lizenzen als PDF, mit den Änderungen zum Vorjahr | Lizenzliste | PDF 4b |
| Lizenzverantwortlicher | Person im Verein, die die Lizenzanträge bei Swiss Tennis von Hand einträgt. Keine der fünf Rollen im PDF | Lizenzverantwortlicher (Rolle) | Ziel |

## Systeme

| Begriff | Bedeutung | In MyTCO | Quelle |
|---------|-----------|----------|--------|
| Swiss Tennis | Schweizer Tennisverband; vergibt Lizenzen und Klassierungen, betreibt Advantage und myTennis | Swiss Tennis | Recherche |
| Advantage | Turniersoftware von Swiss Tennis, kostenlos für Turnierorganisatoren. Der TCO führt dort die Clubmeisterschaft. Import nur von Lizenznummern, Export als Excel oder PDF, kein Resultat-Import | Advantage | ADV; Recherche |
| myTennis | Portal von Swiss Tennis (mytennis.ch) mit Login für Spieler; darüber laufen die Online-Anmeldung in Advantage und die Spielersuche | myTennis | ADV 4, 18, 20–21 |
| Fairgate | Mitgliederverwaltung des TCO (Module Basis Medium und Finance Pro). MyTCO wird vorerst ohne Anbindung gebaut | Fairgate | Recherche; Ziel |
| tcolten.ch | Öffentliche Website des TCO, betreut vom Website-Betreuer | tcolten.ch | Recherche; PDF 3a, 3b |
| WhatsApp-Gruppe | Geplante Gruppe für Ankündigungen. Lässt sich nicht automatisch in MyTCO auslesen | — | PDF 3c; Recherche |

## Verein, Rollen und Login

| Begriff | Bedeutung | In MyTCO | Quelle |
|---------|-----------|----------|--------|
| Rolle | Bündel von Berechtigungen, das der Admin einem Konto gibt: Gast, Mitglied, Junioren-Leiter, Anlässe-Veranstalter, Admin; dazu CM-Verantwortlicher und Lizenzverantwortlicher. Was jede Rolle darf, steht in [Rollen und Rechte](rollen-und-rechte.md) | Rolle | PDF 4a |
| Mitglied | Person, die Mitglied im TCO ist; zugleich die Grundrolle in MyTCO | Mitglied | PDF 1, 4a |
| Mitgliedschaft | Zugehörigkeit eines Mitglieds zum TCO. Was ein Mitglied daran selbst ändern kann, ist offen | Mitgliedschaft | PDF 1 |
| Spieler | Mitglied, das an der Clubmeisterschaft teilnimmt | Spieler | PDF 5b, 5d |
| Gast | Rolle nur für die Registrierung, ohne Zugriff auf weitere Seiten | Gast | PDF 4a |
| Admin | Rolle mit Zugang zur Mitgliederverwaltung und zu den Admin-Masken | Admin | PDF 4a; Ziel |
| Junioren-Leiter | Rolle für die Betreuung der Junioren | Junioren-Leiter | PDF 4a |
| Anlässe-Veranstalter | Rolle für die Organisation von Anlässen | Anlässe-Veranstalter, später; die CM leitet der CM-Verantwortliche | PDF 4a |
| Website-Betreuer | Vereinsmitglied, das tcolten.ch programmiert und betreut | Website-Betreuer | Recherche |
| Registrierung | Ein neues Konto selbst anlegen statt per Brief zu erhalten; vorgesehen über tcolten.ch, später | Registrierung | PDF 4a |
| Admin-Oberfläche | Teil von MyTCO für Admin und Verantwortliche. Das PDF nennt die einzelnen Eingabeseiten darin *Admin-Masken* | Admin-Oberfläche | PDF 5b, 5d; Ziel |
| Mitgliederverwaltung | Seite, auf der der Admin Mitglieder von Hand anlegt, bearbeitet und löscht | Mitgliederverwaltung | Ziel; PDF 4a |
| Konto | Zugang eines Mitglieds zu MyTCO mit seinen Daten | Konto | PDF 3e, 4a |
| Login | Einloggen in MyTCO | Login | PDF 2, 3b |
| Einmal-Code | Code zum Eintippen, gilt für ein einziges Login. Kommt per Brief (lange gültig) oder auf Anfrage per E-Mail (kurz gültig). Ersetzt das *Einmalpasswort* aus dem PDF; ein Passwort gibt es in MyTCO nicht | Einmal-Code | PDF 2; [#29](https://github.com/konstantinniedermann/tco-app/issues/29) |
| Sitzung | Zeitraum, in dem ein Gerät nach dem Login eingeloggt bleibt. Endet nach einem Jahr ohne Nutzung, beim Logout oder wenn der Admin sie beendet | Sitzung | [#29](https://github.com/konstantinniedermann/tco-app/issues/29) |
| Änderungsverlauf | Liste für Admins, wer wann welches Feld eines Mitglieds geändert oder welche Aktion ausgelöst hat, ohne alte und neue Werte. Nicht zu verwechseln mit dem *Änderungsprotokoll* der Anforderungen | Änderungsverlauf | [SI-12](sicherheitskonzept.md#vorgaben) |
| Erstes Login | Erstes Einloggen mit dem Code aus dem Brief; das Mitglied ergänzt dabei fehlende Daten | Erstes Login | PDF 3b-i; Ziel |
| Startseite | Erste Seite nach dem Login mit Shortcuts, Konto und Logout | Startseite | PDF 3c |
| Newsfeed | Bereich für Neuigkeiten des Vereins auf der Startseite | Newsfeed | PDF 3c |
| Anlass | Veranstaltung, für die sich Mitglieder anmelden, z. B. Clubmeisterschaft, Junioren-Training, Junioren-Turnier | Anlass | PDF 3d |
