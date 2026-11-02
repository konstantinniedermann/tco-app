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
| Werte (Farben, Schrift, Abstände, Formen) | `src/lib/design/tokens.css` |
| Grundstil und Bausteine | `src/lib/design/basis.css` |
| Wappen und App-Symbol (Farben fest in der Datei) | `static/wappen.svg`, `static/favicon.svg`, `static/*.png` |
| Farbe der Browserleiste, Systemschrift-Einstellung | `src/app.html` |
| Kopfleiste, Seitenaufbau | `src/routes/+layout.svelte` |

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
| `--farbe-aktion` | `#a84f1f` | nur die Haupttaste (UI-04), Hervorhebung „Jetzt aktuell" | Weiss 5.5 : 1 |
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
  Schriftgrösse; die Grundgrösse sitzt auf `body`.
- Android (Chrome ab Version 146): `<meta name="text-scale" content="scale">` in `src/app.html`.
- iPhone (Safari): `html { font: -apple-system-body; }` in `basis.css` übernimmt die
  Dynamic-Type-Grösse.
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
| `--schatten-karte` | `0 1px 3px rgb(0 0 0 / 0.13)` | Karten, Tabellen |
| `--breite-inhalt` | `40rem` | maximale Breite des Inhalts |

Ab einer Breite von `60em` gilt das PC-Layout. Massgebend ist die Breite des App-Rahmens
`.app` (Container-Abfrage), nicht die des Fensters; so zeigen auch die Mockups im
Handy-Rahmen das Handy-Layout. Der Wert steht nur in `basis.css`, weil Abfragen keine Tokens
erlauben. Weil `.app` ein Container ist, gehen Überlagerungen nur mit `<dialog>`, nicht mit
`position: fixed`.

## Bausteine

Jeder Baustein ist genau einmal als Klasse in `src/lib/design/basis.css` gebaut. Svelte-
Komponenten entstehen erst, wenn ein Bildschirm sie braucht, und verwenden diese Klassen.

| Baustein | Klasse | Regel |
|----------|--------|-------|
| Kopfleiste | `.kopf` | grün, Wappen + „MyTCO"; auf dem PC zusätzlich die Reiter als Textlinks |
| Reiter | `.reiter` | unten, 3–4 Einträge, Symbol + Text, aktiver Eintrag mit Balken oben |
| Seitenleiste | `.seitenleiste` | nur Verwaltung, Bereiche nach Rolle |
| Haupttaste | `.taste-haupt` | Sandplatz-Rot, höchstens eine pro Bildschirm (UI-04) |
| Nebentaste | `.taste-neben` | weiss mit grünem Rand |
| Link | `a` | grün, unterstrichen |
| Zurück | `.zurueck` | „‹ Zurück" oben links auf Unterseiten |
| Eingabefeld | `.feld` | Bezeichnung über dem Feld, Hilfetext darunter, „(freiwillig)" bei optionalen Feldern |
| Code-Feld | `.feld-code` | Festbreitenschrift, grösser |
| Karte | `.karte` | weisse Fläche auf Hintergrund |
| Kachel | `.kachel` | Karte als Link mit „›"; `.hervor` = Rand in Aktion-Farbe für das Wichtigste |
| Zähler | `.zaehler` | Balkensegmente + Text: „Schritt 2 von 3 · Kontakt" oder „1 von 3 Anmeldungen" |
| Plakette | `.plakette` (`.plakette-ok`, `.plakette-offen`, `.plakette-gesperrt`) | Status immer mit Text (UI-05) |
| Hinweis | `.hinweis` | ocker, Rand links |
| Fehlermeldung | `.fehler` | rot, direkt beim Feld (UI-06) |
| Tabelle | `.tabelle` | nur Verwaltung; auf schmalem Bildschirm waagrecht scrollbar |
| Symbol | `.symbol` | eigene SVG-Symbole, 24er-Raster, Strich 2, immer mit Text |
| App-Rahmen | `.app` | umschliesst Kopfleiste, Inhalt und Reiter; misst die Breite fürs PC-Layout |
| Inhaltsbereich | `.inhalt` | eine Spalte, höchstens `--breite-inhalt`, Seitenrand |
| Leiste | `.leiste` | Suche, Filter und Tasten nebeneinander, bricht bei Platzmangel um |
| Verwaltungsrahmen | `.verwaltung` | Seitenleiste links, Inhalt rechts; auf schmalem Bildschirm untereinander |
| Nebentext | `.leise` | kleiner und leiser, für Hilfen und Nebeninfos |
| Breite Taste | `.taste-breit` | Zusatz zu einer Taste: volle Breite (Formulare auf dem Handy) |

Teile eines Bausteins heissen `<baustein>-<teil>`, z. B. `.kopf-wappen`, `.feld-hilfe`,
`.zaehler-balken`, `.zaehler-text`, `.kachel-pfeil`, `.seitenleiste-bereich`. Der aktive Reiter
und der aktive Eintrag der Seitenleiste tragen `aria-current="page"`, keine eigene Klasse.

## Layout und Navigation

**Mitglieder-App (Handy zuerst):** Kopfleiste oben, Inhalt in einer Spalte (höchstens
`--breite-inhalt`), Reiter unten. Ab `60em` Breite wandern die Reiter als Textlinks in die
Kopfleiste.

- **Reiter:** Start · CM · Profil; *Lizenz* kommt mit der Etappe *Lizenzanträge*. Höchstens
  4 Reiter, kein verstecktes Menü (☰). „CM" ist die Kurzform, weil „Clubmeisterschaft" bei
  grosser Schrift nicht in den Reiter passt; Seitentitel schreiben es aus.
- **Startseite:** „Hoi <Vorname>", darunter „Jetzt aktuell" (Kacheln, die wichtigste
  hervorgehoben) und „Du bist angemeldet" (A-STARTSEITE-02, A-STARTSEITE-04).
- **Unterseiten:** „‹ Zurück" oben links.
- **Formulare:** mehr als etwa 4 Felder werden in Schritte geteilt, mit Schritt-Zähler. Das
  erste Login hat 3 Schritte: 1 Angaben prüfen (vom Verein erfasst, nur lesen) · 2 Kontakt ·
  3 Tennis (Lizenznummer, Klassierung).
- **Kontingente** zeigt der Mengen-Zähler, z. B. „1 von 3 Anmeldungen" (FR-06).

**Verwaltung (vor allem am PC):** erreichbar über einen Eintrag unter *Profil*, nur für
Konten mit einer Rolle über *Mitglied* hinaus (RR-07). Dunkelgrüne Seitenleiste mit
„MyTCO Verwaltung", den Bereichen der eigenen Rollen und „‹ Zur App". Inhalt: Titel,
Kennzahlen, eine Leiste mit Suche, Filter, Nebentaste und Haupttaste, darunter die Tabelle.

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
| UI-03 | Tasten, Felder und Reiter sind mindestens 48 × 48 px gross (`--tippflaeche`). Der Fokus ist immer sichtbar (`--farbe-marke`, `--fokus-breite`). |
| UI-04 | Höchstens eine Haupttaste pro Bildschirm. |
| UI-05 | Bedeutung nie nur über Farbe: Status als Plakette mit Text, Symbole immer mit Text. |
| UI-06 | Fehlermeldungen stehen beim Feld, in Worten, mit Lösungsweg. |
| UI-07 | Codes werden unabhängig von Gross-/Kleinschreibung, Leerzeichen und Bindestrich angenommen. |

Lange Wörter („Clubmeisterschaft") werden getrennt statt abgeschnitten (`hyphens: auto`
auf `body`, Sprache `de-CH` in `src/app.html`).

## Mockups

Vorlagen für die ersten Bildschirme (Abnahme durch den Projektleiter in #13). Sie binden `tokens.css`
und `basis.css` direkt ein und ändern sich mit, wenn sich ein Token ändert. Im Browser öffnen:

- [Mockups](ui-mockups/index.html): Login, erstes Login (Schritt 2 von 3), Startseite mit
  Reitern, CM-Anmeldung, Mitgliederverwaltung am PC
- [Grosse Schrift](ui-mockups/grosse-schrift.html): Startseite und CM-Anmeldung bei 150 %
  Systemschrift
