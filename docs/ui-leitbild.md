[← Übersicht](index.md)

# UI-Leitbild

Das Corporate Design von MyTCO: Farben, Schrift, Abstände, Bausteine, Layout, Navigation,
Sprache und Barrierefreiheit. Jede Oberfläche von MyTCO hält sich daran. Die Regeln
`UI-NN` sind verbindlich.

## Zweck und Gebrauch

**Erst das Leitbild, dann der Code.** Wer am Design etwas ändern will, ändert zuerst dieses
Dokument. Jede Festlegung nennt die Stelle im Code, die sie umsetzt:

| Was | Code-Stelle |
|-----|-------------|
| Werte (Farben, Schrift, Abstände, Formen, Bewegung) | `src/lib/design/tokens.css` |
| Grundstil und Bausteine | `src/lib/design/basis.css` |
| Wappen und App-Symbol (Farben fest in der Datei) | `static/wappen.svg`, `static/favicon.svg`, `static/*.png` |
| Manifest (Name, Farben fest in der Datei; `theme_color` und `background_color` stimmen von Hand mit `--farbe-marke` und `--farbe-hintergrund` überein) | `static/manifest.webmanifest` |
| Farbe der Browserleiste, Systemschrift-Einstellung, sichere Abstände zu Statusleiste und Notch über `env(safe-area-inset-*)` (`viewport-fit=cover`; nie `apple-mobile-web-app-status-bar-style` `black-translucent`, das schaltet den Schutz vor dem Schleier von iOS ab) | `src/app.html` |
| Kopfleiste, Fusszeile, Seitenaufbau mit Rollbereich, Seitenwechsel, Scrollposition | `src/routes/+layout.svelte` |
| Welcher Übergang, welcher Reiter aktiv, wo die Fusszeile steht | `src/lib/ui/navigation.ts` |
| Reiter (sofort aktiv, gleitende Markierung, nochmals antippen → nach oben) | `src/lib/ui/Reiter.svelte` |
| Weiches Auf- und Zuklappen, gemerkte Aufklappbereiche | `src/lib/ui/klappe.ts` |
| Eingabe mit Tastatur (Reiter weg, Feld ins Blickfeld, «Weiter», Wappen schliesst die Tastatur) | `src/lib/ui/tastatur.ts` |
| Rückfrage bei ungespeicherten Änderungen (wann sie kommt), Wappen als Weg zur Startseite | `src/lib/ui/ungespeichert.ts`, `src/routes/+layout.svelte`, `src/routes/verwaltung/+layout.svelte` |
| Band *Ansicht als …*, Hinweis *Nur ansehen*, Bereiche der Verwaltung je Rolle und Umleitung | `src/routes/+layout.svelte`, `src/routes/verwaltung/+layout.svelte`, `src/lib/verwaltung/umleiten.ts`, `src/lib/verwaltung/AnsichtWahl.svelte` |
| Baustein Anleitung (Zeichnung, Ablauf) | `src/lib/ui/Anleitung.svelte`, `src/lib/ui/ZeichnungIphone.svelte`, `src/lib/ui/ZeichnungAndroid.svelte` |
| Brief mit Einmal-Code (Druck-Layout, Symbole der Anleitung) | `src/lib/server/brief/brief.ts`, `src/lib/server/brief/symbole.ts` |

Zwei Prüfungen halten Leitbild und Code beisammen:

- **`design-tokens`** (läuft in `make docs`, auch bei reinen Doku-Änderungen): Jede
  Token-Zeile der Tabellen unten muss in `tokens.css` mit demselben Wert stehen und
  umgekehrt. Weicht etwas ab, nennt die Prüfung Token und beide Werte.
- **`design-festwerte`** (läuft in `npm run pruefungen`): In `src/` stehen Farbwerte und
  `px`-Angaben nur in `tokens.css`; `style`-Attribute im Markup sind verboten. So kann kein
  Bildschirm eigene Farben oder Grössen einführen.

Neue Bausteine oder Tokens kommen erst hierher, dann in den Code.

## Herkunft und Annahmen

Das Design lehnt sich an die Website [tcolten.ch](https://tcolten.ch) an, mit abgeändertem
Farbkonzept (N-DESIGN-01). Von der öffentlichen Website übernommen: das Wappen (Teil des
Vereinslogos), das Petrol `#095d5d` und das Lindgrün `#cde3b9`. Die Website nutzt die Schrift
Poppins; MyTCO nimmt die Systemschrift (siehe [Schrift](#schrift-und-systemschriftgrösse)).

- **Annahme K-13:** Vereinslogo von tcolten.ch als App-Symbol, Freigabe des Vereins steht aus
  (Frage K-13 in den [Abklärungen](abklaerungen.md)).
- **Annahme K-13.2:** Farbkonzept Variante C (eigenes Grün + Sandplatz-Rot) als Abgrenzung von
  tcolten.ch. Das Petrol der Website ist dafür im Farbton Richtung Rasengrün verschoben.

Antwortet der Verein anders, ändern sich die Farbtabelle und die Symbol-Dateien; sonst nichts.

## Farben

Alle Paare von Text und Hintergrund erfüllen mindestens WCAG AA (gemessen).

| Token | Wert | Verwendung | Kontrast |
|-------|------|------------|----------|
| `--farbe-marke` | `#0f6b4f` | Kopfleiste, Titel, Links, aktiver Reiter, Fokusrahmen | Weiss darauf 6.5 : 1 |
| `--farbe-marke-dunkel` | `#0b5640` | Seitenleiste der Verwaltung | Weiss 8.7 : 1 |
| `--farbe-marke-hell` | `#cde3b9` | Wappen auf Grün, Bereichstitel der Verwaltung | auf marke-dunkel 6.3 : 1 |
| `--farbe-marke-zart` | `#e3efdc` | Plakette *aktiv*, Tabellenkopf | marke darauf 5.5 : 1 |
| `--farbe-aktion` | `#a84f1f` | nur die Haupttaste (UI-04), Hervorhebung „Jetzt aktuell", Tipp-Kreis der Anleitung (sagt wie die Haupttaste „hier tippen") | Weiss 5.5 : 1 |
| `--farbe-aktion-dunkel` | `#8c4018` | Haupttaste gedrückt | Weiss 7.3 : 1 |
| `--farbe-flaeche` | `#ffffff` | Karten, Eingabefelder, Reiter | — |
| `--farbe-hintergrund` | `#f4f7f2` | Seitenhintergrund | Text 13 : 1 |
| `--farbe-text` | `#1f2a2a` | Fliesstext | — |
| `--farbe-text-leise` | `#4a5a58` | Hilfetexte, Nebeninfos | 6.7 : 1 auf Hintergrund |
| `--farbe-rand` | `#4a5a58` | Rand von Eingabefeldern | 7.3 : 1 (mind. 3 : 1 nötig) |
| `--farbe-linie` | `#d5ddd9` | Trennlinien, rein dekorativ | — |
| `--farbe-fehler` | `#b3261e` | Fehlermeldungen, Plakette *gesperrt* | 6.5 : 1 |
| `--farbe-hinweis` | `#7a5200` | Hinweise, Plakette *Brief offen* | 6.3 : 1 auf hinweis-flaeche |
| `--farbe-hinweis-flaeche` | `#fdf3e7` | Hintergrund von Hinweisen | — |

Fest eingebrannt (HTML und Bilder kennen keine Tokens), bei Änderung von Hand nachziehen:
`--farbe-marke` in `src/app.html` (`theme-color`) und `static/favicon.svg`;
`--farbe-marke-hell` in `static/wappen.svg` und `static/favicon.svg`; die PNG-Symbole werden
aus `static/favicon.svg` neu erzeugt.

## Schrift und Systemschriftgrösse

MyTCO nutzt die Schrift des Geräts (iPhone: San Francisco, Android: Roboto, Windows: Segoe UI).
Sie lädt nichts nach, ist auf jedem Gerät gut lesbar und erfüllt DS-03 (keine Inhalte von
fremden Servern). Codes stehen in Festbreitenschrift, damit man sie leichter abtippt.

| Token | Wert | Verwendung |
|-------|------|------------|
| `--schrift-text` | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | alles ausser Codes |
| `--schrift-code` | `ui-monospace, 'SF Mono', Menlo, Consolas, monospace` | Brief- und Mail-Codes |
| `--groesse-klein` | `1rem` | Hilfetexte, Plaketten, Reiter-Text (16 px) |
| `--groesse-text` | `1.125rem` | Grundgrösse (18 px) |
| `--groesse-gross` | `1.375rem` | Zwischentitel, Kopfleiste, Codes (22 px) |
| `--groesse-titel` | `1.75rem` | Seitentitel (28 px) |
| `--groesse-symbol` | `1.5rem` | Symbole in Reitern und Kacheln (24 px) |
| `--zeilenhoehe-text` | `1.5` | Fliesstext |
| `--zeilenhoehe-titel` | `1.25` | Titel |

Die px-Angaben gelten bei Standardeinstellung. **MyTCO folgt der Schriftgrösse, die das
Mitglied an seinem Gerät eingestellt hat:**

- Alle Grössen und Abstände sind in `rem`, nie in `px` (UI-02). `html` setzt keine
  Schriftgrösse in px; die Grundgrösse sitzt auf `body`.
- Android (Chrome ab Version 146): `<meta name="text-scale" content="scale">` in `src/app.html`.
- iPhone und iPad (Safari): `html { font: -apple-system-body; }` in `basis.css` übernimmt die
  Dynamic-Type-Grösse (Standard 17 px statt 16 px, Grundschrift also gut 19 px). Die Regel
  greift nur auf iOS (`-webkit-touch-callout`); Safari am Mac setzte sonst 13 px.
- PC: Zoom und Schriftgrösse des Browsers wirken über `rem`.

## Abstände und Formen

| Token | Wert | Verwendung |
|-------|------|------------|
| `--abstand-1` | `0.25rem` | innerhalb eines Bausteins |
| `--abstand-2` | `0.5rem` | Bezeichnung zu Feld |
| `--abstand-3` | `0.75rem` | zwischen Karten, Innenabstand klein |
| `--abstand-4` | `1rem` | Seitenrand Handy, Innenabstand Karte |
| `--abstand-5` | `1.5rem` | zwischen Abschnitten |
| `--abstand-6` | `2rem` | grosse Abschnitte, Seitenrand PC |
| `--radius` | `10px` | Karten, Tasten, Felder |
| `--radius-rund` | `999px` | Plaketten, Zähler-Balken |
| `--tippflaeche` | `3rem` | Mindesthöhe von Tasten, Feldern, Reitern (48 px) |
| `--rand-duenn` | `1px` | Trennlinien |
| `--rand-dick` | `2px` | Rand von Feldern und Nebentasten |
| `--fokus-breite` | `3px` | Fokusrahmen |
| `--fokus-abstand` | `2px` | Abstand des Fokusrahmens |
| `--rand-akzent` | `4px` | Akzentbalken: aktiver Reiter, Rand von hervorgehobener Kachel und Hinweis |
| `--schatten-karte` | `0 1px 3px rgb(0 0 0 / 0.13)` | Karten, Tabellen |
| `--breite-inhalt` | `40rem` | maximale Breite des Inhalts |

Ab einer Breite von `60rem` (960 px bei Standardschrift, also auch Tablets quer) gilt das
PC-Layout. Massgebend ist die Breite des App-Rahmens
`.app` (Container-Abfrage), nicht die des Fensters; so zeigen auch die Mockups im
Handy-Rahmen das Handy-Layout. Der Wert steht nur in `basis.css`, weil Abfragen keine Tokens
erlauben. Weil `.app` ein Container ist, gehen Überlagerungen nur mit `<dialog>`, nicht mit
`position: fixed`. Einzige Ausnahme ist das Statusleisten-Band; es steht ausserhalb von `.app`.

In der Mitglieder-App (nicht in der Verwaltung) ist `.app` genau so hoch wie der sichtbare
Bildschirm (`.schale`): Kopfleiste oben und Reiter unten stehen fest, nur der Rollbereich
dazwischen scrollt. Die Seite als Ganzes scrollt nie.

## Bewegung

Dauern und Kurven aller Bewegungen ausser der Anleitung (UI-09). Die Werte sind einem
iPhone nachempfunden und am Muster abgenommen (#54). Wo Bewegung vorkommt, steht unter
[Bewegung und Bedienung](#bewegung-und-bedienung).

| Token | Wert | Verwendung |
|-------|------|------------|
| `--dauer-kurz` | `150ms` | Überblenden beim Reiterwechsel, Gedrückt-Zustand, Schliessen der Rückfrage |
| `--dauer-mittel` | `250ms` | Markierung des Reiters, Aufklappbereich, Öffnen der Rückfrage |
| `--dauer-schieben` | `350ms` | Unterseite hinein und zurück |
| `--kurve-standard` | `cubic-bezier(0.2, 0, 0, 1)` | alles ausser Schieben und Überblenden (dieses linear) |
| `--kurve-schieben` | `cubic-bezier(0.32, 0.72, 0, 1)` | Schieben, ähnlich der Feder-Bewegung von iOS |

## Bausteine

Jeder Baustein ist genau einmal als Klasse in `src/lib/design/basis.css` gebaut. Svelte-
Komponenten entstehen erst, wenn ein Bildschirm sie braucht, und verwenden diese Klassen.

| Baustein | Klasse | Regel |
|----------|--------|-------|
| Kopfleiste | `.kopf` | grün, Wappen + „MyTCO"; auf dem PC zusätzlich die Reiter als Textlinks; reicht auf dem Handy unter die Statusleiste (Abstand `env(safe-area-inset-top)`), damit Wappen und Titel unter Uhr und Akku frei bleiben, und steht fest oben (nur der Rollbereich darunter scrollt, in der Verwaltung `sticky`), damit kein Inhalt unter Uhr und Akku durchläuft; seitlich mindestens der sichere Bereich (Querformat, Notch). Das Wappen ist ein Link zur Startseite (`.kopf-start`, zugänglicher Name «Zur Startseite»): in der App zu Start, in der Verwaltung zu deren erster Seite. Die Kopfleiste sieht aus wie ohne Link; die Tippfläche reicht unsichtbar über das Wappen hinaus auf `--tippflaeche` (UI-03). Bei offener Tastatur schliesst der Tipp nur die Tastatur ([Eingabe mit Tastatur](#eingabe-mit-tastatur)), bei ungespeicherten Änderungen kommt zuerst die Rückfrage ([Ungespeicherte Änderungen](#ungespeicherte-änderungen)) |
| Band *Ansicht als …* | `.ansicht-band` | nur solange der MyTCO-Admin *Ansicht als …* nutzt, auf jeder Seite von App und Verwaltung; liegt über der Kopfleiste. Fläche `--farbe-hinweis-flaeche`, Text `--farbe-hinweis`, unten ein Balken `--rand-akzent` in `--farbe-hinweis`; Text «Ansicht als <Rolle> — nur ansehen» und die Nebentaste *Beenden* (zurück zu den eigenen Rollen, die Seite lädt neu, sie bleibt dieselbe). Reicht wie die Kopfleiste unter die Statusleiste; die Kopfleiste darunter beginnt dann ohne diesen Abstand. Steht beim Seitenwechsel still wie die Kopfleiste; in der Verwaltung scrollt es mit der Seite weg wie deren Kopfleiste |
| Statusleisten-Band | `.statusleiste` | ausserhalb von `.app`, fest oben, deckend in `--farbe-marke` wie die Kopfleiste darunter (auch in der Verwaltung). Im Browser so hoch wie `env(safe-area-inset-top)` (am PC 0); in der iPhone-App vom Startbildschirm (`display-mode: standalone`, nur iOS) zusätzlich `--abstand-3` hoch, also über dem oberen Rand der Kopfleiste und über 10 px; nicht in der Verwaltung (`.statusleiste-verwaltung`), weil deren Kopfleiste mit der Seitenleiste wegscrollt. iOS legt sonst über Web-Apps vom Startbildschirm einen hellen Schleier über die Statusleiste; iOS lässt ihn nur weg, wenn oben in der Mitte ein fester oder mitlaufender, deckender, fast bildschirmbreiter Streifen liegt |
| Rollbereich | `.rollbereich` | Mitglieder-App: der einzige Bereich, der scrollt, zwischen Kopfleiste und Reitern; enthält Inhalt und Fusszeile. Beim Überziehen federt nur er, Kopfleiste und Reiter bleiben stehen |
| Seitenhintergrund (iPhone-App vom Startbildschirm) | `html`, `body` in `display-mode: standalone`, nur iOS | `--farbe-marke`; `.app` trägt dann `--farbe-hintergrund`. Was an Schleier bleibt, ist so grün statt hell |
| Reiter | `.reiter` | unten, 3–4 Einträge, Symbol + Text, aktiver Eintrag mit Balken oben (`.reiter-balken`, gleitet zum gewählten Reiter); Abstand `env(safe-area-inset-bottom)` über dem Home-Balken; reagiert beim Antippen sofort, auch wenn der Inhalt noch nachläuft; nicht markierbar; weg, solange die Tastatur offen ist ([Eingabe mit Tastatur](#eingabe-mit-tastatur)) ([Bewegung und Bedienung](#bewegung-und-bedienung)) |
| Seitenleiste | `.seitenleiste` | nur Verwaltung, Bereiche nach Rolle |
| Haupttaste | `.taste-haupt` | Sandplatz-Rot, höchstens eine pro Bildschirm (UI-04) |
| Nebentaste | `.taste-neben` | weiss mit grünem Rand; gedrückt `--farbe-marke-zart` |
| Link | `a` | grün, unterstrichen |
| Zurück | `.zurueck` | „‹ Zurück" oben links auf Unterseiten |
| Eingabefeld | `.feld` | Bezeichnung über dem Feld, Hilfetext darunter, „(freiwillig)" bei optionalen Feldern; auch mehrzeilig (`textarea`); bei einer festen Höchstlänge zählt der Hilfetext mit („12 von 50 Zeichen", `.feld-hilfe`); Verhalten mit Tastatur unter [Eingabe mit Tastatur](#eingabe-mit-tastatur) |
| Auswahlfläche | `.auswahl` | eine Wahl aus wenigen (Radio) als Fläche: Rand `--rand-dick` in `--farbe-rand`, mindestens `--tippflaeche` hoch, Text neben dem Kreis; gewählt Rand `--farbe-marke`, Hintergrund `--farbe-marke-zart`, fett. Mehrere untereinander in einem `<fieldset class="auswahl-gruppe">` mit `<legend>`. Als Schalter (Ein/Aus, gilt sofort, ohne Speichern-Taste) dieselbe Fläche mit Häkchen statt Kreis (`type="checkbox"`), angehakt heisst ein: *Benachrichtigungen* im Profil |
| Code-Feld | `.feld-code` | Festbreitenschrift, grösser |
| Karte | `.karte` | weisse Fläche auf Hintergrund; als `<dialog class="karte">` die Rückfrage vor einer folgenreichen Aktion (Abbrechen · Bestätigen); im modalen `<dialog>` ist die bestätigende Taste die Haupttaste, und der Dialog zählt für UI-04 als eigener Bildschirm; die Rückfrage blendet weich ein (leicht vergrössert, `--dauer-mittel`) und schneller aus (`--dauer-kurz`) |
| Aufklappbereich | `.klappe` | Karte mit Titelzeile zum Auf- und Zuklappen (`<details>`/`<summary>`), Pfeil rechts in der Titelzeile; in der Verwaltung als `.karte.klappe`, die Titelzeile darf rechts eine Kurzinfo in `.leise` tragen; klappt weich auf und zu (`--dauer-mittel`) |
| Kachel | `.kachel` | Eintrag mit Titel links und rechts entweder „›" (der ganze Eintrag ist ein Link) oder genau einer Aktion; `.hervor` = Balken links in Aktion-Farbe für das Wichtigste; ist der ganze Eintrag ein Link, gedrückt `--farbe-marke-zart` und leicht verkleinert und nicht markierbar; eine Kachel mit eigener Aktion bleibt ruhig und markierbar |
| Zähler | `.zaehler` | Balkensegmente + Text: „Schritt 2 von 3 · Kontakt" oder „1 von 3 Anmeldungen" |
| Plakette | `.plakette` (`.plakette-ok`, `.plakette-offen`, `.plakette-gesperrt`) | Status immer mit Text (UI-05) |
| Anleitung | `.anleitung` | gezeichnetes Handy (`.anleitung-film`, ein `.anleitung-bild` pro Schritt), darunter die Taste (`.anleitung-taste`) und die nummerierten Schritte (`.anleitung-schritte`), am Schluss ein Eintrag „Fertig!" (`.anleitung-fertig`, mit ✓ statt Nummer); die Zeichnung ist für Screenreader verborgen, die Schritte tragen die Bedeutung; ein Schritt gehört zu genau einem Bild; in der Zeichnung nur Beschriftungen, die in der Hilfe von Apple bzw. Google belegt sind, sonst graue Balken (`.anleitung-eintrag.leer`); der Tipp-Kreis (`.anleitung-tipp`) zeigt, wo man tippt; Bewegung nach UI-09 |
| Hinweis | `.hinweis` | ocker, Balken links; immer mit einer Aktion zum Erledigen und einer zum Wegklicken („Nein, danke", „Schliessen"). Einzige Ausnahme ist *Nur ansehen*: oben auf Verwaltungsseiten, auf denen die eigene Rolle etwas nur lesen darf, «**Nur ansehen.** Ändern kann hier nur der <Rolle>.», ohne Aktion; er bleibt, solange die Rolle nur liest. In der Ansicht steht er nicht, dort sagt es das Band |
| Nur lesen | `fieldset.nur-lesen` | Formular, das die eigene Rolle oder die Ansicht nur lesen lässt: die Felder stehen in `<fieldset disabled class="nur-lesen">` (ohne Rand und Abstand, Text in `--farbe-text`, damit er gut lesbar bleibt); Absende- und Aktions-Tasten fehlen, auch «Weitere …», «Entfernen», «… löschen» und Tasten zum Anlegen. In der Ansicht fehlen in der ganzen App alle Tasten, die etwas speichern (Profil, Antwort auf einen Anlass, Passkey); *Abmelden* bleibt |
| Fehlermeldung | `.fehler` | rot, direkt beim Feld (UI-06); betrifft sie das ganze Formular (z. B. *Inzwischen hat jemand anderes dieses Mitglied geändert*), unter dem Formular, mit dem Lösungsweg als Nebentaste daneben (*Neuen Stand laden*) |
| Tabelle | `.tabelle` | nur Verwaltung; auf schmalem Bildschirm waagrecht scrollbar; enthält sie keine Links oder Tasten, ist der Bereich eine benannte Region mit `tabindex="0"`, damit er per Tastatur scrollt |
| Symbol | `.symbol` | eigene SVG-Symbole, 24er-Raster, Strich 2, immer mit Text |
| App-Rahmen | `.app` | umschliesst Kopfleiste, Inhalt und Reiter; misst die Breite fürs PC-Layout |
| Inhaltsbereich | `.inhalt` | eine Spalte, höchstens `--breite-inhalt`, Seitenrand, im Querformat mindestens der sichere Bereich (`env(safe-area-inset-left/right)`) |
| Leiste | `.leiste` | Suche, Filter und Tasten nebeneinander, bricht bei Platzmangel um |
| Verwaltungsrahmen | `.verwaltung` | Seitenleiste links, Inhalt rechts; auf schmalem Bildschirm untereinander |
| Fusszeile | `footer.inhalt.leise` | nur vor dem Login (Einstiegsseite, Login, Login mit Mail-Code) und auf der Startseite: Links „Hilfe" · „Datenschutz" · Version; nicht auf Profil, Hilfe, Datenschutz, Fehlerseite und in der Verwaltung; als letztes Element (ohne Reiter) mit Abstand über dem Home-Balken |
| Nebentext | `.leise` | kleiner und leiser, für Hilfen und Nebeninfos |
| Breite Taste | `.taste-breit` | Zusatz zu einer Taste: volle Breite (Formulare auf dem Handy) |
| Feld-Zeile | `.feld-zeile` | nur Verwaltung: Bezeichnung links, Eingabe rechts, gleiche Schriftgrösse; unter `60rem` steht die Bezeichnung über dem Feld |
| Inaktive Taste | `.taste-haupt:disabled`, `.taste-neben:disabled` | nur Verwaltung: grau, solange es nichts zu speichern gibt; die Taste nennt, was sie speichert («Angaben speichern», «Rollen speichern»); Haupt- und Nebentaste sehen inaktiv gleich aus |
| Spalten | `.spalten` | nur Verwaltung: zwei Spalten ab `60rem` |
| Kennzahl | `.kennzahl` in `.kennzahlen` | nur Verwaltung: Karte mit einer Zahl in `--groesse-titel` und dem Text darunter in `.leise` (*kommen*, *noch keine Antwort*); mehrere nebeneinander, brechen um |
| Mehrzeiliger Text | `.mehrzeilig` | Freitext mit Zeilenumbrüchen anzeigen, wie eingegeben (Einladung eines Anlasses) |

### Welche Fläche wofür

**UI-08: Jedes Thema einer Seite steht in einer eigenen Fläche.** Wer eine Seite öffnet, soll
sich an den Flächen zurechtfinden, ohne den ganzen Text zu lesen. Welche Fläche es ist, sagt
ihre Funktion und wie lange sie bleibt; Farbe und Balken zeigen das an. Eine neue Art Fläche
kommt nur hierher, wenn sie sich in Funktion oder Lebensdauer von allen bestehenden
unterscheidet.

| Fläche | Bedeutung | Lebensdauer |
|--------|-----------|-------------|
| Karte | ein festes Thema der Seite (Login: *Mit Passkey*, *Mit Code*) | bleibt immer |
| Aufklappbereich | ein festes Thema auf einer langen Seite (Profil) | bleibt immer |
| Kachel | führt weiter oder löst eine Aktion für einen Eintrag aus (*Clubmeisterschaft 2027 ›*, *iPhone · Entfernen*) | so lange, wie es den Eintrag gibt |
| Kachel hervorgehoben (roter Balken) | das Wichtigste, was gerade läuft; man kann sie nicht wegklicken | solange es aktuell ist |
| Hinweis (ocker Balken) | eine Mitteilung oder ein Angebot an das Mitglied (*Passkey einrichten*, *Brief-Code läuft bald ab*) | vorübergehend: verschwindet, wenn erledigt oder weggeklickt; *Nur ansehen* bleibt, solange die Rolle nur liest |

Teile eines Bausteins heissen `<baustein>-<teil>`, z. B. `.kopf-wappen`, `.feld-hilfe`,
`.zaehler-balken`, `.zaehler-voll`, `.zaehler-text`, `.kachel-pfeil`, `.seitenleiste-bereich`,
`.klappe-titel`. Der aktive Reiter
und der aktive Eintrag der Seitenleiste tragen `aria-current="page"`, keine eigene Klasse.

## Layout und Navigation

**Mitglieder-App (Handy zuerst):** Kopfleiste oben, Inhalt in einer Spalte (höchstens
`--breite-inhalt`), Reiter unten. Ab `60rem` Breite wandern die Reiter als Textlinks in die
Kopfleiste.

- **Reiter:** Start · CM · Profil (heute Start · Profil, *CM* kommt mit der Etappe
  *CM-Anmeldung*); *Lizenz* kommt mit der Etappe *Lizenzanträge*. Höchstens
  4 Reiter, kein verstecktes Menü (☰). „CM" ist die Kurzform, weil „Clubmeisterschaft" bei
  grosser Schrift nicht in den Reiter passt; Seitentitel schreiben es aus.
- **Startseite:** „Hoi <Vorname>", für Konten mit Verwaltungsrolle direkt darunter die Kachel
  „Verwaltung ›", dann „Jetzt aktuell" (Kacheln, die wichtigste hervorgehoben) und „Du bist angemeldet" (A-STARTSEITE-02, A-STARTSEITE-04). Kommende Anlässe
  stehen unter „Jetzt aktuell" als hervorgehobene Kachel mit Datum und dem eigenen Stand
  (A-ANLASS-01). Angebote stehen vor „Jetzt aktuell", jedes als eigener Hinweis
  und immer nur eines zugleich (UI-04): zuerst *Passkey einrichten*, danach *Mitteilungen aufs Handy?*.
- **Unterseiten:** „‹ Zurück" oben links, keine Reiter (bei der CM-Anmeldung neu prüfen).
- **Einstiegsseite** (nur im Handy-Browser, nicht vom Symbol aus): „Willkommen bei MyTCO", eine Karte „Zuerst auf den Startbildschirm" mit der Anleitung bzw. auf Android der Haupttaste „MyTCO installieren", darunter der Link „Ohne Startbildschirm weiter" zum Login.
- **Hilfe:** ohne Login, über die Fusszeile; jedes Thema ein Aufklappbereich, der Kontakt eine Karte.
- **Datenschutz:** ohne Login, über die Fusszeile (DS-09); Text der Datenschutzerklärung in einer Karte, solange er nicht freigegeben ist mit dem leisen Vermerk «Entwurf».
- **Fehlerseite** (Seite nicht gefunden oder gerade nicht erreichbar): Kopfleiste und Inhalt
  wie in der Mitglieder-App, auch unter der Verwaltung; oben links „‹ Zur Startseite" bzw.
  „‹ Zur Verwaltung", darunter eine Karte mit Titel und Meldung in Worten (UI-06).
- **Formulare:** mehr als etwa 4 Felder werden in Schritte geteilt, mit Schritt-Zähler. Das
  erste Login hat 3 Schritte: 1 Angaben prüfen (vom Verein erfasst, nur lesen) · 2 Kontakt ·
  3 Tennis (Lizenznummer, Klassierung).
- **Kontingente** zeigt der Mengen-Zähler, z. B. „1 von 3 Anmeldungen" (FR-06).

**Verwaltung (vor allem am PC):** erreichbar über die Kachel „Verwaltung ›" auf der
Startseite, direkt unter der Begrüssung, nur für Konten mit einer Rolle über *Mitglied* hinaus
(RR-07). Dunkelgrüne Seitenleiste mit
„MyTCO Verwaltung", den Bereichen, die eine der eigenen Rollen lesen darf, und „‹ Zur App":
*Mitgliederverwaltung* (Mitglieder, Anlässe, Mitteilungen, Für Fairgate mit Zahl der offenen,
Änderungsverlauf) für Mitglieder- und MyTCO-Admin, *Clubmeisterschaft* (Turniere) für CM- und
MyTCO-Admin, *MyTCO* (Rollen) nur für den MyTCO-Admin. Inhalt: Titel,
Kennzahlen, eine Leiste mit Suche, Filter, Nebentaste und Haupttaste, darunter die Tabelle.
Darf die Rolle einen Bereich nur lesen, gilt der Baustein *Nur lesen* mit dem Hinweis *Nur
ansehen*. Eine Seite ausserhalb der eigenen Bereiche führt zur ersten Seite der Verwaltung, eine
Seite zum Anlegen ohne Schreibrecht zur Liste ihres Bereichs.

- **Rollen** (nur MyTCO-Admin): je Rolle ein Aufklappbereich mit der Zahl in der Titelzeile und
  den Mitgliedern als Links zu ihrer Seite (vergeben und entzogen wird dort, in der Klappe
  *Rollen*). Darunter die Karte *Ansicht als …*: vier Auswahlflächen (Mitglied,
  Mitglieder-Admin, CM-Admin, Lizenz-Admin) und die Haupttaste «Ansehen». Danach geht es zur
  ersten Seite dieser Rolle; bei Mitglied und Lizenz-Admin, die keine Verwaltung haben, zur
  Startseite der App.
- **Mitteilungen** (Seite des Anlasses und Bereich *Mitteilungen*): Taste «Neue Mitteilung», beim
  Anlass dann eine Vorlage oder «Leer anfangen». Titel, Text, Empfänger und Weg stehen in einer
  Karte; «Vorschau» zeigt die Zahlen und aufklappbar die Namen. «Senden» geht erst mit einer
  Vorschau zu den aktuellen Eingaben, fragt zurück (`<dialog class="karte">`) und ist während des
  Sendens gesperrt («Wird gesendet …»). Darunter der Verlauf als Tabelle, ohne Empfängernamen. Das
  Formular sieht nur, wer schreiben darf.
Namen von Mitgliedern stehen in allen Tabellen und Listen der Verwaltung als „Nachname,
Vorname", damit sie sich gleich lesen und sortieren.

### Bewegung und Bedienung

MyTCO soll sich anfühlen wie eine App auf dem iPhone: Was man antippt, reagiert sofort, und
die Bewegung zeigt, wohin man gegangen ist. Dauern und Kurven stehen unter
[Bewegung](#bewegung).

**Seitenwechsel** (View Transitions; ohne Unterstützung im Browser sofort):

| Wechsel | Beispiele | Bewegung |
|---------|-----------|----------|
| gleiche Ebene | Start ↔ Profil, Einstiegsseite → Login, Login → Start | Inhalt blendet über (`--dauer-kurz`, linear) |
| eine Ebene tiefer | Start → Hilfe, Login → Datenschutz, Login → Login mit Mail-Code, Profil → E-Mail ändern, Start → Anlass | neue Seite schiebt sich von rechts herein, alte Seite und Reiter weichen um 28 % nach links (`--dauer-schieben`, `--kurve-schieben`) |
| zurück | „‹ Zurück" | umgekehrt: Seite schiebt sich nach rechts weg |
| Zurück-Taste oder -Geste des Browsers, Verwaltung, unbekannte Adresse | | keine; die Geste animiert der Browser selbst, eine unbekannte Adresse lädt die Seite neu. Lässt sich eine bekannte Seite nicht laden, bewegt sich die Fehlerseite wie die Seite, die sie ersetzt |

Kopfleiste und Statusleisten-Band stehen beim Wechsel still, die Reiter auch, solange sie
auf beiden Seiten stehen.

**Reiter:** Der angetippte Reiter wird sofort aktiv, auch wenn die Seite noch lädt; der
Balken gleitet hinüber (`--dauer-mittel`). Weil nur der Rollbereich scrollt, wirkt der Tipp
auch, während der Inhalt noch nachläuft. Jeder Reiter beginnt oben; wer den aktiven Reiter
nochmals antippt, kommt ebenfalls nach oben. Nur «‹ Zurück» und die Zurück-Taste oder -Geste
des Browsers bringen eine Seite dorthin zurück, wo man sie verlassen hat.

**Aufklappbereiche im Profil** (*Meine Angaben*, *Anmelden mit Passkey*, *Benachrichtigungen*)
sind anfangs zu und merken sich, ob sie offen sind, solange die App offen ist; nach dem
Abmelden sind sie wieder zu.

**Antippen:** kein grauer Blitz des Browsers, dafür ein Gedrückt-Zustand (`--dauer-kurz`):
Reiter in `--farbe-marke` mit etwas kleinerem Symbol; Kachel als Link in `--farbe-marke-zart`, leicht
verkleinert; Nebentaste, „‹ Zurück", Titelzeile des Aufklappbereichs und Textlinks in
`--farbe-marke-zart`; Haupttaste in `--farbe-aktion-dunkel`.

**Markieren:** Kopfleiste, Reiter, Tasten, „‹ Zurück", Kacheln als Link und Titelzeilen der
Aufklappbereiche lassen sich nicht markieren und öffnen beim langen Drücken kein Link-Menü.
Fliesstext, Codes, Angaben und Tabellen bleiben markier- und kopierbar.

**Grundeinstellungen:** Doppeltippen zoomt nicht; Zoomen mit zwei Fingern bleibt. MyTCO ist
immer hell (`color-scheme: light`), auch wenn das Gerät dunkel eingestellt ist. Im
Querformat bläht der Browser die Schrift nicht auf.

### Eingabe mit Tastatur

Gilt für jedes Feld, das die Tastatur des Handys öffnet: Profil, Login, Anmeldung zu
Anlässen, später CM und Lizenzen. Vorbild sind Formulare in iOS-Apps: Die Tastatur
schiebt sich über die Reiter, das Feld steht ruhig darüber.

- **Reiter weg:** Solange ein Feld den Fokus hat, sind die Reiter weg (Handy-Layout, Bedienung
  per Finger). Am PC und mit Maus bleiben sie.
- **Nichts springt:** Die Kopfleiste bleibt oben stehen, der Rollbereich endet über der
  Tastatur. Das Feld rückt mit seiner Bezeichnung einmal ins Blickfeld; danach bewegt sich
  nur, was man selbst scrollt.
- **Eingabetaste:** «Weiter» springt ins nächste Feld desselben Formulars, im letzten Feld
  sendet «Fertig» das Formular ab (Bedienung per Finger). Am PC, auch in der Verwaltung,
  sendet die Eingabetaste wie gewohnt sofort ab.
- **Wappen:** Ein Tipp aufs Wappen schliesst bei offener Tastatur nur die Tastatur, wie ein
  Tipp auf den Hintergrund; er führt nicht zur Startseite. Erst der nächste Tipp führt weiter.
- **Nach dem Absenden** geht die Tastatur zu, der Fokus geht zum Ergebnis (z. B. zu
  «Ändern» der gespeicherten Angabe).
- **Jedes Feld** hat die passende Tastatur (`type`, `inputmode`) und `autocomplete`.
  Schrift in Feldern nie unter 16 px (`--groesse-text`), sonst zoomt das iPhone hinein.

### Ungespeicherte Änderungen

Wer in einem Formular etwas geändert und nicht gespeichert hat und die Seite in der App
verlässt (Wappen, Reiter, «‹ Zurück», Seitenleiste und andere Links der Verwaltung), bekommt
zuerst die Rückfrage als `<dialog class="karte">`: **«Nicht gespeichert – trotzdem
verlassen?»** mit *Abbrechen* (Nebentaste: bleibt auf der Seite, die Eingaben bleiben) ·
*Verlassen* (Haupttaste: die Eingaben verfallen, die App geht zum Ziel).

- **Ungespeichert** ist ein Formular nur, solange ein Feld vom geladenen Stand abweicht. Wer
  etwas tippt und es wieder zurücksetzt, wird nicht gefragt; nach dem Speichern auch nicht.
- **Welche Formulare:** alle, die Angaben speichern: *Meine Angaben* im Profil, die Antwort auf
  einen Anlass, in der Verwaltung Mitglied (Angaben und Rollen), Anlass, Turnier und
  Kategorie, jeweils beim Anlegen und Bearbeiten, und die Mitteilung, bis sie gesendet ist (geladener Stand: leer oder die gewählte Vorlage). Login, Codes und E-Mail-Wechsel nicht: Sie haben keinen
  gespeicherten Stand, nur einen Ablauf. Im Code trägt das Formular `data-ungespeichert`,
  solange es abweicht.
- **Nur lesen:** Auf Seiten nur zum Lesen und in der Ansicht sind die Formulare gesperrt
  ([Baustein *Nur lesen*](#bausteine)); dort kommt keine Rückfrage.
- **Ohne Rückfrage:** Wechsel, die die App selbst auslöst (nach dem Speichern zur neuen Seite,
  abgelaufene Sitzung, Abmelden), Links aus der App hinaus (Kalender), die Zurück-Taste oder
  -Geste des Browsers oder Handys (auch am PC) und das Schliessen der App. Bei der Geste
  zeigt der Browser die vorige Seite schon an, bevor die App davon erfährt; beim Schliessen gibt es nur den Dialog des
  Browsers, nicht diese Rückfrage.

## Brief (Druck)

Der Brief mit dem Einmal-Code (A-LOGIN-01) ist eine A4-Seite ohne Seitenrand des Druckers
(`@page { size: A4; margin: 0 }`). Er nutzt dieselben Farb-, Schrift- und Abstands-Tokens wie
die App; nur Werte auf dem Papier stehen in absoluten Einheiten (Masse in `mm`, die
Grundschrift in `pt`), deshalb in eigenen Tokens. Die Symbole der
Anleitung (Teilen, Drei-Punkte-Menü) folgen dem Baustein *Symbol*: 24er-Raster, Strich 2,
Farbe `currentColor`, immer mit Text.

**Annahme K-16.1:** Fensterkuvert C5/6 mit Fenster rechts. Die Lage des Adressfelds ist eine
Konstante; ändert sich das Kuvert, ändern sich nur diese Tokens.

Der Brief setzt seine Grundschrift `--brief-schrift` auf `html`; alle Schrift- und
Abstands-Tokens in `rem` werden damit auf Briefgrösse verkleinert, damit alles auf eine Seite
passt.

| Token | Wert | Verwendung |
|-------|------|------------|
| `--brief-rand` | `20mm` | Seitenrand des Briefs |
| `--brief-fenster-oben` | `45mm` | Abstand des Adressfelds vom oberen Blattrand |
| `--brief-fenster-links` | `118mm` | Abstand des Adressfelds vom linken Blattrand |
| `--brief-fenster-breite` | `80mm` | Breite des Adressfelds |
| `--brief-qr` | `35mm` | Kantenlänge des QR-Codes |
| `--brief-schrift` | `12pt` | Grundschrift des Briefs (1 rem auf Papier) |

## Sprache

- **Du-Form**, kurze Sätze, Schweizer Schreibweise (ss statt ß), Begrüssung „Hoi".
- Tasten sagen, was passiert („Anmelden", „Speichern und weiter"), nie „OK".
- Optionale Felder tragen „(freiwillig)"; Pflichtfelder bleiben unmarkiert, kein Sternchen.
- Fachbegriffe wie im [Glossar](glossar.md).
- Beispiele in Mockups und Tests nur mit erfundenen Namen und Adressen `@example.org`.

## Barrierefreiheit

| ID | Regel |
|----|-------|
| UI-01 | WCAG 2.2 Stufe AA ist die Untergrenze; die E2E-Tests prüfen jeden Bildschirm mit axe auf iPhone, Android und PC. |
| UI-02 | Schrift folgt der Systemeinstellung des Geräts; Grössen und Abstände nur in `rem`. Bis 200 % Schrift wird nichts abgeschnitten und nichts waagrecht gescrollt, ausser Tabellen der Verwaltung. |
| UI-03 | Tasten, Felder und Reiter sind mindestens 48 × 48 px gross (`--tippflaeche`). Der Fokus ist immer sichtbar (`--farbe-marke`, `--fokus-breite`); auf grünen Flächen (Kopfleiste, Seitenleiste, Reiter am PC) in `--farbe-marke-hell`. |
| UI-04 | Höchstens eine Haupttaste pro Bildschirm. |
| UI-05 | Bedeutung nie nur über Farbe: Status als Plakette mit Text, Symbole immer mit Text. |
| UI-06 | Fehlermeldungen stehen beim Feld, in Worten, mit Lösungsweg. |
| UI-07 | Codes werden unabhängig von Gross-/Kleinschreibung, Leerzeichen und Bindestrich angenommen. |
| UI-09 | Bewegung gibt es nur, wo sie Orientierung gibt: beim Seitenwechsel, an der Markierung des Reiters, beim Auf- und Zuklappen, bei der Rückfrage ([Bewegung und Bedienung](#bewegung-und-bedienung), Dauern unter [Bewegung](#bewegung)) und im Baustein Anleitung. Bei „Bewegung reduzieren" wechselt alles sofort. Die Anleitung: weiche Überblendung, 3,5 s pro Schritt, 6 s für „Fertig", höchstens 3 Durchläufe, danach steht sie bei „Fertig". Eine Taste hält an (Anhalten · Abspielen · Nochmals abspielen). Bei „Bewegung reduzieren" keine Bewegung und keine Taste; die Bilder stehen nummeriert still nebeneinander. |

Lange Wörter („Clubmeisterschaft") werden getrennt statt abgeschnitten (`hyphens: auto`
auf `body`, Sprache `de-CH` in `src/app.html`). Ausnahme sind Tabellenköpfe (`.tabelle th`):
Sie trennen nicht, weil die Tabelle auf schmalem Bildschirm ohnehin waagrecht scrollt.

## Mockups

Vorlagen für die ersten Bildschirme (Abnahme durch den Projektleiter in #13). Sie binden `tokens.css`
und `basis.css` direkt ein und ändern sich mit, wenn sich ein Token ändert. Im Browser öffnen:

- [Mockups](ui-mockups/index.html): Login, erstes Login (Schritt 2 von 3), Startseite mit
  Reitern, CM-Anmeldung, Mitgliederverwaltung am PC
- [Passkey](ui-mockups/passkey.html): Hinweis nach dem Login, Login in zwei Karten, Profil mit
  Aufklappbereich
- [Hilfe beim Start](ui-mockups/hilfe.html): Einstiegsseite auf iPhone und Android (mit und
  ohne Taste), „Bewegung reduzieren", Seite Hilfe, Login mit Fusszeile
- [Grosse Schrift](ui-mockups/grosse-schrift.html): Startseite und CM-Anmeldung bei 150 %
  Systemschrift
