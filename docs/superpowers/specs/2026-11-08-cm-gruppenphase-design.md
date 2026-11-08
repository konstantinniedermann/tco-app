# Entwurf: Clubmeisterschaft während der Gruppenphase (#66)

Stand 08.11.2026. Brainstorming mit dem Projektleiter. Grundlage: A-RESULTAT-01 bis -07,
A-ADVANTAGE-03, A-ANMELDUNG-08, N-DATENSCHUTZ-02, DS-05, `docs/datenschutz.md` (*Wer sieht was*).
Entwurf der Bildschirme: [Design «MyTCO CM Gruppenphase»](https://claude.ai/artifact/4LQmmTj6VUkJHEhym5y5eY),
Reihen «Mischung» und «KO-System».

## Wozu

In der Gruppenphase verteilen sich die Spiele über Wochen. Zwei Dinge fehlen:

- **Antrieb:** Gruppenspiele werden spät abgemacht und stauen sich vor dem Ende der Gruppenphase.
- **Spannung:** Jeder spielt für sich, und man merkt wenig davon, dass ein Turnier läuft.

Die Kategorieseite eines Spielers soll beides lösen. Sie zeigt zuerst, was er tun muss, und danach,
wo er steht. Offene Spiele sind für alle sichtbar, wie auf der Turniertafel im Clubhaus.

## Ziele

1. Zuoberst steht, was der Spieler tun muss: seine offenen Spiele, mit «Resultat melden».
2. Darunter steht der Stand: die Rangliste der Gruppe bzw. der eigene Weg im KO-Baum.
3. Sichtbar für alle Mitglieder: wer wie viele Spiele noch offen hat.

## Nicht-Ziele

- Ticker über alle Kategorien, «Krimi der Woche», Plaketten wie «Krimi» oder «Überraschung».
- Fortschrittsbalken für Gruppe oder Turnier.
- Hinweise wie «Was es für dich braucht» (welches Resultat wozu reicht).
- Finalwochenende, Rückblick über die Jahre, Werbung für die Anmeldung.
- Das Formular «Resultat melden» selbst und die Bestätigung durch den Gegner (A-RESULTAT-03, -04):
  Sie gehören zu CM-Betrieb. Dieser Entwurf legt nur fest, wo die Taste steht.

## Anti-Ziele

- Kein Punktesystem, keine Abzeichen, kein Wettbewerb neben dem Turnier. MyTCO ist eine Vereinsapp
  unter Freunden.
- Push-Texte nennen keine anderen Mitglieder (DS-05).
- Die Seite zeigt keine Personendaten, die `docs/datenschutz.md` nicht zusagt.

## Aufbau der Kategorieseite

Gilt für jede Kategorie, in der der Spieler angemeldet ist. Kopf wie bisher: Seitentitel
«Clubmeisterschaft 2027», darunter Kategorie und Gruppe bzw. «KO-System» und das Ende der laufenden
Phase oder Runde.

Von oben nach unten, jedes Thema in einer eigenen Fläche:

| # | Fläche | Gruppenspiele | KO-System | Zustand am Anfang |
|---|---|---|---|---|
| 1 | Kachel hervorgehoben | Dein offenes Spiel bzw. Deine offenen Spiele | gleich | immer sichtbar, solange etwas offen ist |
| 2 | Aufklappbereich | Rangliste | Dein Weg | aufgeklappt |
| 3 | Aufklappbereich | — | Ganzer Turnierbaum | zugeklappt |
| 4 | Aufklappbereich | Gemeldete Resultate (Anzahl) | gleich | zugeklappt |
| 5 | Aufklappbereich | Noch offen in der Gruppe (Anzahl) | Noch offen in der Kategorie (Anzahl) | zugeklappt |

Die App merkt sich je Bereich, ob der Spieler ihn auf- oder zugeklappt hat (wie die bestehenden
Aufklappbereiche, `src/lib/ui/klappe.ts`).

### 1 — Offene Spiele

- **Ein offenes Spiel** (Entwurf D): Die Kachel nennt Gegner und Restzeit («Noch 12 Tage Zeit zum
  Abmachen»). Darunter stehen die Haupttaste «Resultat melden» und die Nebentaste «Kontakt anzeigen».
- **Mehrere offene Spiele** (Entwurf E2): Die Kachel ist ein Link, der Gegner und Restzeit zusammenfasst
  («Deine offenen Spiele (2) · gegen … und … · Noch 12 Tage Zeit»). Sie führt auf die Unterseite
  **«Deine offenen Spiele»**. Dort steht je Spiel eine Karte mit Gegner, Telefon, E-Mail und der
  Nebentaste «Resultat melden». Am Schluss: «Die Kontaktdaten siehst du bis zum Ende der
  Clubmeisterschaft.»
- **Kein offenes Spiel:** Die Kachel fällt weg. Die Seite beginnt mit Bereich 2.

Bei mehreren Spielen trägt jedes eine Nebentaste, weil ein Bildschirm höchstens eine Haupttaste hat
(UI-04).

### 2 — Rangliste (Gruppenspiele)

Spalten: Platz, Name, Siege, Sätze, offen. Die Reihenfolge folgt FR-15 (Siege, dann
Direktbegegnung, Satz- und Gamedifferenz, danach Korrektur durch den CM-Admin). Die eigene Zeile ist hinterlegt und trägt «(du)». Die Rangliste sagt nicht, wer
weiterkommt (siehe *Grenzen und Sonderfälle*).

### 2 — Dein Weg (KO-System)

Nur die Runden, die den Spieler betreffen, untereinander, je mit einem Balken in Farbe:

- grün (`farbe-marke`): gespielt, mit Gegner, Resultat und Plakette «gewonnen»
- rot (`farbe-aktion`): die offene Runde, mit Gegner und Plakette «offen»
- grau (`farbe-linie`): spätere Runden, mit dem möglichen Gegner («Sieger aus … – …») bzw.
  «am Finalwochenende»

Bedeutung nie nur über Farbe (UI-05): Jede Runde trägt ihren Zustand als Wort. Scheidet der Spieler
aus, endet der Weg mit der verlorenen Runde, Plakette «ausgeschieden».

### 4 und 5 — Resultate und offene Spiele

- **Gemeldete Resultate:** alle Spiele der Gruppe bzw. Kategorie mit Resultat, neueste zuerst,
  der Sieger fett, darunter Resultat und Datum.
- **Noch offen:** alle offenen Paarungen der Gruppe bzw. Kategorie, das eigene Spiel mit «Dein Spiel»
  markiert, je mit Plakette «offen».

## Rund um die Kategorieseite

- **Startseite:** Die hervorgehobene Kachel «Clubmeisterschaft» nennt, was offen ist («1 Spiel offen,
  noch 12 Tage» und den Platz in der Gruppe) und führt auf die Kategorieseite. Kein Fortschrittsbalken.
- **Nach dem Melden eines Resultats:** Bestätigung mit dem Resultat, Hinweis «… bekommt das Resultat
  zum Bestätigen» und dem neuen Stand in einem Satz («Du bist auf Platz 2. Deine 4 Gruppenspiele sind
  alle gespielt.»). Keine Aussage, ob der Spieler weiterkommt.
- **Push** (Vorlage, siehe *Grenzen und Sonderfälle*), ohne Namen anderer:
  «Neues Resultat in deiner Gruppe. Du bist jetzt auf Platz 2.» ·
  «Noch 7 Tage Gruppenphase. Du hast 1 Spiel offen.»

## Datenschutz

Laut `docs/datenschutz.md` sehen alle Mitglieder schon Name, Kategorien und Resultate der CM. Neu
für alle sichtbar werden die **offenen Spiele** (wer gegen wen noch nicht gespielt hat) und
**gemeldete, noch nicht bestätigte oder bestrittene Resultate**. Vor der Umsetzung kommen deshalb dazu:

- `docs/datenschutz.md`, *Wer sieht was*, Zeile *Alle Mitglieder*: «… und Resultate der
  Clubmeisterschaft» wird zu «…, Spiele (offen und gespielt) und Resultate der Clubmeisterschaft,
  auch gemeldete, noch nicht bestätigte».
- `docs/datenschutzerklaerung.md`: derselbe Zusatz im Satz «Alle Mitglieder sehen …».

Kontaktdaten zeigt die Seite nur Gegnern und Doppelpartnern, bis zum Ende der CM (FR-19,
N-DATENSCHUTZ-02, K-31). Die Push-Texte bleiben ohne Namen anderer (DS-05).

## Fürs UI-Leitbild

Vor dem Code kommen ins Leitbild (`docs/ui-leitbild.md`) und danach ins Design System:

- **Rangliste:** Raster mit fünf Spalten, eigene Zeile hinterlegt (`farbe-marke-zart`). In der App
  gibt es sonst keine Tabellen.
- **Weg-Liste:** Runden untereinander mit Balken (`rand-akzent`) in Grün, Rot oder Grau und dem
  Zustand als Plakette. Der rote Balken der offenen Runde ist eine neue Verwendung von
  `farbe-aktion`; die Leitbild-Zeile dazu wird erweitert.
- **Plakette «unbestätigt»:** für gemeldete, noch nicht bestätigte Resultate.

## Annahmen und offene Fragen

- **Restzeit:** gerechnet bis zum Ende der Gruppenphase bzw. der Runde. Woher das Datum kommt, legt
  CM-Betrieb fest.
- **Offene Spiele für alle:** Ob die CM-Verantwortlichen das so wollen, ist nicht gefragt. Eine
  Rückfrage braucht es nur, wenn der Projektleiter sie für nötig hält.

## Grenzen und Sonderfälle

Entscheid des Projektleiters:

- **Gemeldet, noch nicht bestätigt:** In einer Gruppe zählt das Resultat sofort in Rangliste,
  «offen» und «Gemeldete Resultate». Bis zur Bestätigung (FR-16: durch den Gegner oder nach 3 Tagen)
  trägt das Spiel die Plakette «unbestätigt». Bestreitet der Gegner, entscheidet der CM-Admin; der
  Stand kann dann zurückspringen. Im KO rückt der Sieger erst nach der Bestätigung ins Folgespiel
  (FR-14); bis dahin steht das Resultat mit «unbestätigt» im Weg und in den Resultaten. FR-18 im
  Fachmodell ist entsprechend angepasst.
- **Wer weiterkommt (Gruppenspiele):** MyTCO behauptet es nicht: keine Linie in der Rangliste, keine
  Karte «Du bist weiter», kein Hinweis nach dem Melden. Die Kategorien regeln das unterschiedlich
  (z. B. kommt teils der beste Gruppenzweite weiter). Im KO-System zeigt «Dein Weg» die nächste
  Runde, weil sie dort feststeht.

Entscheide von Claude, vom Projektleiter beim Lesen zu prüfen:

- **Umfang:** #66 baut nur die Anzeige (Kategorieseite, Unterseite, Startseiten-Kachel, Seite nach
  dem Melden) und die Leitbild-Bausteine. Spiele, Runden, Resultate und deren Testdaten liefert
  CM-Betrieb. #66 startet erst, wenn dieses Datenmodell steht.
- **Doppel:** Das Paar ist ein Eintrag («Name / Name») in Rangliste, Weg und Listen. Für beide
  Partner gilt die Seite wie für einen Spieler: «Dein Spiel», «(du)», «Resultat melden». Die Kachel
  nennt beide Gegner. Kontakte zeigt sie nach N-DATENSCHUTZ-02 (Gegner und Partner).
- **Wer nicht mitspielt:** sieht dieselbe Kategorieseite ohne Bereich 1 und ohne «(du)», erreichbar
  über die Liste der Kategorien des Turniers. Rangliste, Weg, Resultate und offene Spiele sieht jedes
  Mitglied (siehe Datenschutz).
- **Mehrere Kategorien:** Die Startseite hat eine einzige hervorgehobene Kachel. Sie fasst zusammen
  («2 Spiele offen in 2 Kategorien») und führt bei einer Kategorie direkt auf deren Seite, sonst auf
  die Turnierseite. «Deine offenen Spiele» gilt je Kategorie.
- **Push:** nicht Teil von #66, und noch ohne Platz: #63 verschickt nur per Knopf, nie automatisch,
  und A-ANMELDUNG-08 deckt nur neue Spiele und einen geänderten Spielplan. Automatische Pushes zu
  Resultaten und Restzeit brauchen eine eigene Anforderung; die Texte oben sind die Vorlage dafür.
- **Junioren ohne eigenes Login:** Es gilt, was #45 festlegt. Bis dahin zeigt die Seite nur Spiele
  des eigenen Kontos.

## Was der Umsetzung überlassen bleibt

Datenmodell der Spiele und Runden, Berechnung der Rangliste, Wortlaut kleiner Hilfetexte und die
Darstellung des ganzen Turnierbaums (Bereich 3), solange er auf dem Handy nicht die Seite
waagrecht scrollen lässt.

## Abhängigkeiten

Blocked by: Spiele, Gruppen bzw. Tableaus und Resultate aus CM-Betrieb (A-ADVANTAGE-02,
A-RESULTAT-01, -03, -06; noch ohne Issue). Verwandt: #63 (Mitteilungen per Push).
