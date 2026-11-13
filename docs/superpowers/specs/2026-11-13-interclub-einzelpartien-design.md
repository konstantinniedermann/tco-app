# #81 Teil 2 — Interclub-Einzelpartien: Design

## Absicht

Mitglieder beantworten in MyTCO «Wie hat XY gespielt?»: Zu jeder gespielten Begegnung eines
TCO-Teams sehen sie die Einzelpartien (Einzel und Doppel) mit Satzresultaten. Mit Namen
erscheinen nur TCO-Spieler, auch Junioren; Gegner nur mit Teamnamen. Grund: ein Grund mehr, die
App ausserhalb der CM zu öffnen (#81). Teil 1 (Endstände, Spielplan, Tabelle, ohne Namen) ist
auf dev (0.21.0).

Ausblick (Entscheid PL, nicht in dieser Session): Die Daten bleiben über die Saisons, damit MyTCO
später Verläufe zeigen kann (je Spieler, Team, Saison, Rangliste). Deshalb werden für TCO-Spieler
schon jetzt Personennummer und Rangliste-Nummer von Swiss Tennis mitgespeichert.

## Ziele

1. **Datenschutz zuerst** (vor jedem Code, eigener Commit): `docs/datenschutz.md` und
   `docs/datenschutzerklaerung.md` nachgeführt (Inhalt unten).
2. Import holt die Einzelpartien jeder gespielten TCO-Begegnung (Gruppe sowie Auf-/Abstieg) und
   speichert sie normalisiert, nur mit den erlaubten Feldern.
3. Eigene Seite *Begegnung* (IC › Team › Begegnung) mit Einzel und Doppel.

## Nicht-Ziele

- **Kein Löschen alter Saisons** (Entscheid PL; ersetzt den Vorschlag aus dem Issue, nur laufende
  und letzte Saison zu halten). Session 3 baut es auch nicht.
- Kein Ausblenden einzelner Spieler (Entscheid PL: MyTCO zeigt nicht mehr, als Swiss Tennis
  öffentlich zeigt; bewusst nicht gebaut).
- Keine Verknüpfung der Spieler mit MyTCO-Konten (kein «meine Partien», nicht in der Auskunft).
- Keine Verlaufs-Anzeige (Spieler, Rangliste über Saisons); nur die Daten dafür.
- Kein regelmässiger Abruf, kein Push (Session 3).
- Keine Einzelpartien für Begegnungen ohne TCO-Team (die Gruppenliste enthält auch solche).

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es läuft)

- Irgendeine Angabe zu Gegnerspielern (Name, Klassierung, Rangliste-Nummer, Personennummer)
  landet in der Datenbank, in Seed/Tests oder Logs.
- Echte Spielernamen oder echte Personennummern in Repo, Beispieldaten, Tests oder Screenshots
  (DS-08).
- Ein Import, der bei einer abweichenden Antwort trotzdem speichert.

## Befund Swiss Tennis

Abgerufen am 13.11.2026: 63 TCO-Begegnungen 2026 (Aktive und Junioren), dazu je eine 2023.
Rohdaten nur im Scratchpad, ausgewertet ohne Namen.

**Abfragen:** Gruppenspiele `/encounter-results?encounterId=…&competition=ic|jic&year=…&lang=de`.
Für Auf-/Abstiegsspiele (Nummern aus `tableau`, z. B. 45486) antwortet diese Abfrage mit `null`;
dort liefert `/tableau-results?encounterId=…` (gleiche Parameter) dieselbe Form.

**Form** (alle 53 Gruppen-Antworten 2026 gleich; `ic` und `jic` gleich):

```
title: text (mehrzeilig)   subtitle: "02. Mai 2026"
homeTeam / awayTeam: { name, clubNumber (TCO 2202), points, sets, games }
singles[] / doubles[]: {
  position: Zahl,
  players: { home: { members: [{ id, name }], wo: 0|1 }, away: { … } },
  results: ["5:7", "0:6", ""]   // immer 3 Einträge, "" = nicht gespielt; 3. Satz z. B. "11:9"
}
leagueId, groupId
```

- `name` = «Vorname Nachname R6 (9497)»: In allen 872 Namen 2026 hängen Klassierung (R1–R9,
  N1–N4) und Rangliste-Nummer in Klammern am Ende.
- `members[].id` ist über die Saisons gleich (5 Spieler 2023 und 2026 verglichen). Klassierung und
  Rangliste-Nummer sind die **damaligen** (2023 andere Nummern als 2026).
- Swiss Tennis liefert 2021–2026; 2020 und 2019 nicht mehr (HTTP 500).
- TCO-Seite = Seite mit `clubNumber` = Vereinsnummer (`IC_VEREIN`). Zwei TCO-Teams spielen nie
  gegeneinander (PL); genau eine Seite ist TCO, sonst Formfehler.
- Einzel: 1 Spieler je Seite, Doppel: 2. Junioren 2 Einzel + 1 Doppel, Aktive 6 + 3.
- **w.o./Aufgabe:** `wo: 1` steht bei der Seite, die aufgegeben hat (10 Fälle 2026). Die Sätze sind
  dann unvollständig, z. B. `["6:3","5:3",""]`, `["3:6","6:3","3:0"]`, `["1:0","",""]`.
  Regel für «gewonnen»: Hat eine Seite `wo: 1`, gewinnt die andere; sonst gewinnt, wer mehr Sätze
  hat. Anzeige: Sätze wie geliefert und das Wort «w.o.» bzw. «aufgegeben»; welches Wort genau,
  entscheidet der Entwurf.

## Was gespeichert wird

Je Partie: Saison, Begegnung (Swiss-Tennis-Nummer), Art (Einzel/Doppel), Position, je Seite
Teamname (`homeTeam.name`/`awayTeam.name`), ob TCO, `wo`, die Sätze (bis 3). Je Begegnung
Punkte, Sätze und Games beider Teams (keine Personendaten).

**Nur für die TCO-Seite**, je Spieler (Entscheide PL): Vor- und Nachname, Klassierung,
Rangliste-Nummer und Personennummer von Swiss Tennis. Angezeigt werden vorerst nur Name und
Klassierung.

Nicht gespeichert: alles zu Gegnerspielern, `title`, `leagueId`, `groupId`.

## Datenschutz-Nachtrag (Inhalt der Doku-Änderung)

`docs/datenschutz.md`:
- **Welche Daten**, neue Zeile: *Interclub-Einzelpartien der TCO-Teams: Einzel/Doppel, Position,
  Sätze, w.o.; von den TCO-Spielern Vor- und Nachname, Klassierung, Rangliste-Nummer und
  Personennummer bei Swiss Tennis, aus Swiss Tennis übernommen (dort öffentlich); Gegner nur mit
  Teamnamen, ohne Angaben zu den Spielern.* — Wozu: Resultate der TCO-Teams zeigen («Wie hat XY
  gespielt?») und über die Saisons verfolgen.
- **Wer sieht was**, Zeile *Alle Mitglieder*: Interclub-Resultate der TCO-Teams mit Einzelpartien,
  Name und Klassierung der TCO-Spieler; ohne Login nichts. Rangliste- und Personennummer zeigt
  MyTCO nicht.
- **Löschen**, neuer Punkt: Interclub-Daten bleiben über die Saisons (Verlauf der Teams und
  Spieler), wie bei Swiss Tennis öffentlich. Austritt und Löschung eines Mitglieds ändern daran
  nichts; die Namen hängen nicht an Konten und stehen deshalb nicht in der Auskunft (DS-07). Kein
  Ausblenden auf Wunsch: MyTCO zeigt nicht mehr als Swiss Tennis.
- **Junioren**: Name und Klassierung von Junioren in Interclub-Einzelpartien, sichtbar für alle
  eingeloggten Mitglieder, wie bei Swiss Tennis öffentlich.
- **DS-08**: in der Sache unverändert; ergänzen, dass Beispieldaten mit Spielernamen und
  Personennummern erfunden sind (die 1:1-Ausnahme gilt nur ohne Personennamen).
- **Änderungen an diesem Konzept**: Eintrag 13.11.2026 (#81 Teil 2).
- DS-03 (nur der Server ruft ab), DS-05 (Push erst Session 3, nur Team + Endstand), DS-06 (Logs
  nur feste Texte, ohne Namen und Resultate): erfüllt bzw. unverändert.

`docs/datenschutzerklaerung.md`:
- **Welche Daten**: Interclub-Resultate der TCO-Teams mit Einzelpartien.
- **Wer sieht was**, neuer Punkt: Alle eingeloggten Mitglieder sehen die Interclub-Resultate der
  TCO-Teams, auch die Einzelpartien mit Name und Klassierung der TCO-Spieler (auch Junioren).
  MyTCO übernimmt sie von Swiss Tennis, wo sie öffentlich sind, und zeigt nicht mehr als dort;
  Gegner ohne Namen.
- **Wie lange**: Interclub-Resultate bleiben über die Saisons, wie bei Swiss Tennis.
- Format der Erklärung beachten (nur `##`, Absätze, `- `, `**fett**`; Kopf der Datei).

Danach: `docs/anforderungen/anforderungen.md` A-INTERCLUB-01 («ohne Spielernamen» →
Einzelpartien mit Namen der TCO-Spieler), `docs/fachmodell.md` (Entität *Einzelpartie*, «ohne
Personendaten (Teil 1)» anpassen), Glossar (*Begegnung*, *Einzelpartie*, *w.o.*),
`docs/ui-leitbild.md` (Seite *Begegnung*), arc42 falls die Bausteinsicht Interclub nennt.
Issue #81: Body (DoD «Löschung alter Saisons» streichen, Lösungsrichtung «nur laufende und
letzte Saison» ersetzen) und `docs/beobachtungen.md` (Hinweise für Session 3) angleichen.

## Ansätze

**Import und Speicherung**
- **Gewählt:** Einzelpartien im bestehenden `make ic-import`, eigene Tabelle(n), in derselben
  Transaktion wie Teams/Begegnungen eines Wettbewerbs. Gut 60 Abrufe mehr, mit der bestehenden
  Pause.
- Verworfen: Abruf erst beim Öffnen der Begegnung, denn das widerspricht der Kopie, die Session 3
  für Push und Ausfälle braucht.
- Verworfen: Antwort roh als JSON speichern, denn dann lägen Gegnernamen in der Datenbank.

**Ansicht** (Entscheid PL)
- **Gewählt:** eigene Seite *Begegnung*, zweite Stufe unter dem Reiter. Erreichbar durch Antippen
  einer gespielten TCO-Begegnung in «Spiele» der Team-Seite (auch Auf-/Abstiegsspiele) und in
  «Resultate» der Übersicht. «‹ <Liga>» führt immer zur Team-Seite. Inhalt: Kopf mit Begegnung,
  Endstand, Datum, Heim/Auswärts; Karte *Einzel*, Karte *Doppel*; je Partie Position,
  TCO-Spieler mit Klassierung, Sätze, gewonnen/verloren aus TCO-Sicht (grün/rot wie Teil 1).
- Verworfen: Aufklappen in «Spiele», denn die Liste wird lang und «Resultate» hat kein Ziel.

## Meine Entscheide (beim Lesen prüfen)

- **Fehlende Einzelpartien:** Antwortet Swiss Tennis für eine Begegnung mit `null` (noch nicht
  erfasst), wird die Begegnung ohne Einzelpartien gespeichert. Die Seite zeigt dann «Einzelpartien
  noch nicht da», und der Import läuft weiter. Weicht eine Antwort in der Form ab oder schlägt
  ein Abruf fehl, gilt wie in Teil 1: Der ganze Wettbewerb wird nicht gespeichert, der alte Stand
  bleibt.
- **Name zerlegen:** Muster «<Name> <Klassierung> (<Nummer>)». Passt ein Name der TCO-Seite nicht,
  gilt das als Formfehler. Gegnernamen werden nicht geprüft, nur verworfen.
- **TCO-Begegnung erkennen:** an `clubNumber` in der Antwort und am Team der Abfrage, nicht am
  Namen.
- **Alte Saisons:** Nach dem Merge kann der PL lokal `make ic-import JAHR=2021…2025` laufen
  lassen, solange Swiss Tennis sie liefert. Die Übersicht zeigt weiterhin die neueste Saison.

## Vorgegeben (aus Projekt und Entscheiden)

- Bauregeln aus `CLAUDE.md`: Route ruft eine Schnittstellen-Funktion; neue Schnittstelle in
  `INTERCLUB_SCHNITTSTELLEN`, Grundprüfung und Routen-Test; Fachlogik ohne HTTP; Abruf-Modul
  unter `src/lib/interclub/`; erstes Laden in `+page.ts` über die Wächter-Funktion; Stile nur
  unter `src/lib/design/` aus dem Leitbild (neue Bausteine erst ins Leitbild).
- Migration nur hinzufügend; vor dem Merge dev einmergen und die Nummer prüfen; die gemeinsame DB
  `mytco` erst danach migrieren.
- Tests rot zuerst; Fachlogik gegen die echte DB; Abruf als Attrappe. **Beispiel-Antworten
  (Entscheid PL): die echten Antworten von Swiss Tennis 2026 für alle TCO-Begegnungen 1:1**
  (Positionen, Sätze, w.o., Klassierungen, Rangliste-Nummern, auch die `null`-Antworten), nur
  **Namen und Personennummern aller Spieler durch erfundene ersetzt** (gleiche Person → gleicher
  erfundener Name und gleiche Nummer, auch beim Gegner, damit nichts Echtes übrig bleibt). Ein
  Skript erzeugt sie aus den Rohdaten im Scratchpad; die Rohdaten selbst kommen nie ins Repo.
  Vor dem Commit prüfen, dass kein echter Name in den Dateien steht (Abgleich gegen die
  Rohdaten).
- Screenshots und Bildvergleich der Seite *Begegnung* nur mit den Beispieldaten, nie mit echten
  Namen (Nachweis gegen die echte Schnittstelle als Tabelle/Zahlen, nicht als Bild).
- Entwurf zuerst im Design-Artifact «MyTCO Interclub» (Seite *Begegnung*), Abnahme durch den PL,
  dann Bildvergleich App ↔ Entwurf.
- E2E über `make e2e`, Rolle/Beschriftung, axe auf allen drei Geräten.

## Dem Builder überlassen

- Tabellenschnitt (eine Tabelle `ic_partie` mit Spieler-Spalten vs. Partie + Spieler-Tabelle),
  Fremdschlüssel/Kaskade.
- Schnittstelle und Pfad (z. B. `GET /api/interclub/teams/[id]/begegnungen/[bid]`,
  Seite `/interclub/[id]/[begegnung]`).
- Erzeugung der Beispiel-Antworten (Dateien vs. im Beispiel-Abruf erzeugt).
