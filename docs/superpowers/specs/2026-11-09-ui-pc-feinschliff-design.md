# Feinschliff PC und Titel in der Kopfleiste — Design

Kein Issue (Wunsch des Projektleiters nach einem Test am PC) · Stand 09.11.2026 ·
Branch `feat/ui-pc-feinschliff`

## Warum

Beim Durchklicken am PC sind fünf Dinge aufgefallen. Die Reiter Start, CM und Profil sehen am PC
anders aus als auf dem Handy, und man sieht schlecht, welcher Reiter gewählt ist. Die Spielersuche
in «Von Hand anmelden» wächst beim Tippen, der Dialog springt. In der Verwaltung scrollen die
Seitenleiste und der Titel weg: Wer in «Damen R4/R9» weit unten ist, weiss nicht mehr, wo er ist.
Die Anmeldungsliste bricht jede Zeile um und wird dadurch lang und unruhig. Die
Kategorienliste ist dagegen einzeilig und kompakt.

## Ziele

1. Am PC stehen die Reiter mit denselben Symbolen wie auf dem Handy in der Mitte der Kopfleiste,
   und der aktive Reiter ist klar zu erkennen.
2. Die Spielersuche hat von Anfang an ihre volle Höhe. Tippen und Treffer ändern die Grösse
   nicht.
3. In der Verwaltung am PC bleiben Seitenleiste, Pfad und Titel beim Scrollen sichtbar.
4. Die Tabellen der Verwaltung sind einzeilig und kompakt.
5. Scrollt der Seitentitel aus dem Bild, blendet er weich in die Kopfleiste über, neben «MyTCO».

## Nicht-Ziele

- Keine neuen Funktionen in Listen oder Dialogen. Die Aktionen bleiben dieselben, nur ihr Zugang
  ändert sich.
- Kein Umbau von Navigation oder Feste Ordnung (#69 bleibt, wie er ist).
- Die Reiter auf dem Handy bleiben, wie sie sind.

## Anti-Ziele

- Ein Titel in der Kopfleiste, der flackert, springt oder umbricht.
- Eine Tabellenzeile, die doch wieder zweizeilig wird, sobald ein Name lang ist.
- Eine Aktion, die nach dem Umbau mehr Klicks braucht, ohne dass die Liste dafür ruhiger wird.
  Bei einer Zeile mit nur einer Aktion bleibt die Aktion direkt als Taste stehen.

## Teil 1 — Reiter am PC

- Gilt ab `60rem` (PC-Layout). Die Reiter stehen in der Kopfleiste, waagrecht in der Mitte der
  Kopfleiste (bezogen auf die ganze Breite, nicht auf den Platz rechts vom Wappen).
- Jeder Reiter zeigt Symbol und Wort nebeneinander, in einer Zeile. Es sind dieselben Symbole wie
  auf dem Handy.
- Nicht aktiv: weisse Schrift auf Grün.
- Aktiv: eine helle Pille (`--farbe-flaeche` oder `--farbe-marke-zart`), darauf grüne Schrift
  (`--farbe-marke`), fett. Die bisherige Unterstreichung entfällt.
- Hover zeigt eine leichte Aufhellung. Den Fokus zeigt wie heute ein Rahmen in
  `--farbe-marke-hell` (UI-03).
- Tippfläche mindestens `--tippflaeche` (UI-03).
- Die Reiter stehen in derselben Zeile wie Wappen und «MyTCO», nicht mehr in einer eigenen
  Zeile darunter (meine Wahl; so ist die Kopfleiste am PC eine einzige grüne Zeile, wie in der
  Freigabe gezeigt).

## Teil 2 — Spielersuche mit fester Höhe

Gilt für den Baustein `Spielersuche` überall (Von Hand anmelden, Doppelpartner ändern).

- Unter dem Suchfeld steht immer ein Trefferbereich mit fester Höhe. Er hat Platz für etwa
  5 Treffer zu je zwei Zeilen (Name, darunter leise Angaben).
- Vor der Suche (weniger als 2 Buchstaben) steht darin leise «Ab 2 Buchstaben.» (meine Wahl). Der
  Hilfetext unter dem Feld kann dann wegfallen oder bleibt, falls die Seite einen eigenen
  Zusatz mitgibt. Das entscheidet, wer baut. Die Information darf aber nicht doppelt stehen.
- Bei «Keine Treffer.» und bei einem Fehler steht der Text im selben Bereich, die Höhe bleibt.
- Bei mehr als 5 Treffern scrollt nur der Bereich, mit Tastatur und Finger.
- Der Bereich ist im Leitbild ein Baustein oder eine Ergänzung von `.auswahl-gruppe`. Wo er
  steht, entscheidet, wer baut.

## Teil 3 — Verwaltung am PC: Seitenleiste, Pfad und Titel bleiben stehen

- Ab `60rem`: Die Seitenleiste bleibt beim Scrollen des Inhalts stehen (sticky, volle
  Bildschirmhöhe). Ist sie höher als der Bildschirm, scrollt sie für sich.
- Pfad und `<h1>` der Seite bleiben zusammen oben am Inhalt kleben, auf einer Fläche in der
  Hintergrundfarbe der Seite und mit einer dünnen Linie darunter, sobald darunter Inhalt
  durchläuft (meine Wahl).
- Seiten ohne Pfad (oberste Seiten) kleben nur mit dem Titel.
- Unter `60rem` (Verwaltung auf dem Handy) bleibt der Titel nicht kleben. Dort gilt Teil 5.
- Im Druck wie heute: keine Seitenleiste, kein Pfad, nichts klebt.

## Teil 4 — Tabellen der Verwaltung einzeilig

Neue Regel im Leitbild beim Baustein Tabelle, gültig ab `60rem` (auf dem Handy scrollen
Tabellen wie heute waagrecht; meine Wahl): **Jede Zeile ist einzeilig.** Text, der nicht passt,
endet mit «…». Der volle Text ist in der Detailseite oder im Dialog zu lesen, oder als `title`,
wo es keines von beiden gibt. Höchstens zwei kurze Tasten pro Zeile; ab drei Aktionen steht dort
eine Taste «Ändern» (meine Wahl).

**Ausnahme Paare (Entscheid Projektleiter):** In Tabellen mit Doppelpaaren (`DoppelListe`: Paare
und Anfragen) steht jeder Spieler in einer eigenen Zeile, also zwei Zeilen pro Paar. Jede dieser
Zeilen ist einzeilig, und alles Übrige der Zeile (Status, Taste) steht nur einmal pro Paar.

### Anmeldungsliste (Einzel, `Anmeldungsliste.svelte`)

- Spalten wie heute: Name, Klassierung, Geschlecht, Jahrgang, Status, dazu für Schreibende eine
  letzte Spalte mit **einer** Taste «Ändern».
- Der Vermerk zum Mitglied (z. B. ausgetreten) bleibt als Plakette hinter dem Namen.
- Der Kommentar steht nicht mehr als zweite Zeile unter dem Namen. Hat eine Anmeldung einen
  Kommentar, zeigt die Zeile einen kurzen Hinweis darauf, einzeilig und gekürzt. Ob er in einer
  eigenen Spalte oder hinter dem Namen steht, entscheidet, wer baut. Vollständig steht der
  Kommentar im Dialog «Ändern».
- «Ändern» öffnet einen kleinen Dialog (`<dialog class="karte">` wie die übrigen) mit dem Namen,
  dem vollen Kommentar und den Aktionen, die gerade gehen, je als Taste: «Entscheiden» (nur bei
  Status beantragt), «Verschieben» (nur bei offener Anmeldung), «Klassierung», «Löschen». Jede
  Taste schliesst diesen Dialog und öffnet den heutigen Dialog der Aktion. Abbrechen schliesst.
  Den Dialog statt eines aufklappenden Menüs habe ich gewählt, weil die Verwaltung überall
  Dialoge nutzt (meine Wahl).
- Geht in einer Zeile nur eine Aktion, steht statt «Ändern» direkt diese Taste (Anti-Ziel oben).
- Wer nur liest, sieht die Zeile ohne Taste.

### Übrige Tabellen

Alle Tabellen der Verwaltung werden gegen die neue Regel geprüft:
`DoppelListe`, `Mitteilungsverlauf`, `verlauf`, `einlesen`, `mitglieder`, `mitglieder/[id]`,
`anlaesse`, `anlaesse/[id]`, `fairgate`, `turniere`, `turniere/[id]`, `briefe`. Ausgenommen ist
die Druckseite `mitglieder/[id]/auskunft`.
- Wo eine Zeile drei oder mehr Aktionen hat, gilt dasselbe Muster wie bei den Anmeldungen (eine
  Taste «Ändern», Dialog mit den Aktionen). Zwei kurze Tasten bleiben stehen, solange die Zeile
  einzeilig bleibt.
- Wo sie umbricht, weil Text zu lang ist, wird gekürzt.
- Bestehende Dialoge wie `Aktionsdialog` in der Doppelliste bleiben, «Ändern» führt zu ihnen.
- Geprüft wird bei PC-Breite (1280 px) mit den Seed-Daten.

## Teil 5 — Titel blendet in die Kopfleiste über

- Gilt in der Mitglieder-App (Handy und PC) und in der Verwaltung auf dem Handy (unter `60rem`).
  In der Verwaltung am PC klebt stattdessen der Titel (Teil 3).
- Sobald das `<h1>` der Seite beim Scrollen unter der Kopfleiste verschwindet, blendet sein Text
  in der Kopfleiste ein: Wappen, «MyTCO», ein dünner Trenner, dann der Titel in kleinerer Schrift
  (z. B. `--groesse-text`). Zu lang: einzeilig mit «…».
- Scrollt das `<h1>` wieder ins Bild, blendet der Titel in der Kopfleiste aus.
- Die Bewegung ist eine kurze Überblendung mit etwas Verschieben von unten
  (`--dauer-kurz`/`--dauer-mittel`, `--kurve-standard`). Bei «Bewegung reduzieren» erscheint der
  Titel ohne Bewegung.
- Gilt für jede Seite mit `<h1>`, auch Start («Hoi Kurt») (meine Wahl, keine Ausnahmen).
  Seiten ohne `<h1>` zeigen nichts.
- Beim Seitenwechsel beginnt die neue Seite oben, der Titel in der Kopfleiste ist also weg. Eine
  Seite, die mit gespeicherter Scrollposition zurückkommt (Zurück-Link), zeigt ihn sofort,
  falls ihr `<h1>` dann nicht im Bild ist.
- Für Screenreader wiederholt die Kopfleiste den Titel nicht (`aria-hidden`), denn das `<h1>`
  steht ja auf der Seite.
- Am PC (Mitglieder-App) steht der Titel zwischen «MyTCO» und den Reitern in der Mitte. Ist zu
  wenig Platz, wird er gekürzt. Die Reiter verschiebt er nie.
- **Verwaltung auf dem Handy:** Heute scrollt dort die Kopfleiste mit der Seitenleiste weg. Damit
  der Titel einblenden kann, bleibt sie neu oben stehen, wie in der App (meine Wahl, Folge von
  Teil 5). Das Statusleisten-Band gilt dann auch dort. Die Seitenleiste darunter scrollt weiter
  weg. Die Kopfleiste kommt dafür aus `nav.seitenleiste` heraus.
- In der Kopfleiste der Verwaltung (Handy) ersetzt der eingeblendete Titel das Wort
  «Verwaltung» (Entscheid Projektleiter): oben «MyTCO Verwaltung», gescrollt «MyTCO │ Damen
  R4/R9».

## Leitbild zuerst

Vor dem Code werden in `docs/ui-leitbild.md` angepasst: Kopfleiste (Reiter am PC, Titel beim
Scrollen, Verwaltung auf dem Handy), Reiter am PC, Statusleisten-Band, Seitenleiste (sticky),
Pfad und Titel (kleben am PC), Tabelle (einzeilig, eine Taste), Spielersuche bzw.
Auswahlgruppe (feste Höhe) und unter «Bewegung» der Titel in der Kopfleiste. Das Design System
«MyTCO» (Artifact) wird danach nachgeführt.

## Nachweis

- E2E-Tests der betroffenen Abläufe laufen weiter. Wo Tasten wegfallen, gehen sie über
  «Ändern» (`turnier.test.ts`, `cm-doppel-verwaltung.test.ts`, `cm-anmeldung.test.ts` u. a.).
- Neue E2E-Prüfungen:
  - Am PC: aktiver Reiter mit `aria-current`, Symbole sichtbar.
  - Höhe der Spielersuche vor und nach der Suche gleich.
  - Seitenleiste und Titel nach dem Scrollen im Bild (Verwaltung PC).
  - Titel in der Kopfleiste nach dem Scrollen sichtbar, davor nicht.
  - Zeilenhöhe der Anmeldungsliste gleich einer Zeile (PC-Breite).
- axe auf iPhone, Android und PC wie bisher (UI-01).
- Screenshots vorher/nachher bei PC-Breite und auf dem iPhone für den Projektleiter.

## Dem Bauenden überlassen

Genaue Abstände und Höhen im Rahmen der Tokens; wie der Titel technisch erkannt wird (z. B.
IntersectionObserver auf das `<h1>` im Rollbereich); ob Pfad und Titel in einen gemeinsamen
Baustein wandern; wo der Kommentar-Hinweis in der Anmeldungszeile steht.
