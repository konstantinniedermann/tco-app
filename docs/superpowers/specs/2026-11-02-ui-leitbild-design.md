# UI-Leitbild und Mockups (#13) — Design

Stand: 02.11.2026 · Issue #13 · Brainstorming mit dem Projektleiter, Mockups im Browser abgestimmt.

## Absicht

MyTCO bekommt ein verbindliches Corporate Design, an dem sich jede spätere Oberfläche
orientiert. Erfahrung aus früheren Projekten mit Claude Code: Ohne festes Leitbild entsteht
Design-Wildwuchs (jeder Bildschirm eigene Farben, Grössen, Tasten). Das soll von Anfang an
verhindert werden — nicht nur durch ein Dokument, sondern durch eine Prüfung, die es erzwingt.

Zweites Ziel: Ändert sich das Design (z. B. weil der Verein K-13 anders beantwortet), wird
zuerst das Leitbild geändert, und daraus ist ableitbar, welche Stelle im Code nachzuziehen ist.

Zielgruppe der App sind Vereinsmitglieder, darunter viele ältere. Lesbarkeit geht vor Dichte.

## Ziele

- `docs/ui-leitbild.md` als Corporate Design: Farben, Schrift, Abstände, Bausteine, Layout,
  Navigation, Sprache, Barrierefreiheit — jede Festlegung mit der Code-Stelle, die sie umsetzt.
- Alle Design-Werte genau einmal im Code (Token-Datei); die CI gleicht Leitbild und Token-Datei ab.
- Die CI verbietet Farb- und Grössenwerte ausserhalb der Token-Datei.
- MyTCO folgt der Schriftgrösse, die das Mitglied an seinem Gerät eingestellt hat.
- Mockups der Bildschirme *Login*, *Erstes Login*, *Startseite*, *CM-Anmeldung* (Handy) und
  *Mitgliederverwaltung* (PC) im Repo, gebaut aus denselben Tokens und Bausteinen;
  vom Projektleiter abgenommen.
- Wappen von tcolten.ch als App-Symbol (Favicon, Startbildschirm-Symbol).
- Dauerregel in `CLAUDE.md`: Oberfläche nur aus Tokens und Bausteinen des Leitbilds.

## Nicht-Ziele

- Keine echten Bildschirme bauen (Login usw. kommen mit #29 und den Etappen-Issues).
- Keine Svelte-Komponenten für die Bausteine jetzt — sie entstehen, wenn ein Bildschirm sie
  braucht, und setzen dann die Baustein-Klassen aus `basis.css` um (YAGNI).
- Kein Dunkelmodus. Die Tokens erlauben ihn später an einer Stelle.
- Keine visuelle Regressionsprüfung (Screenshot-Vergleich) — vom Projektleiter als
  übertrieben verworfen.
- Kein Web-App-Manifest und kein Service Worker (gehört zur PWA-Arbeit, ADR-001); hier nur
  die Symbol-Dateien, die ein Manifest später verwendet.
- `docs/abklaerungen.md` wird nicht umgebaut.

## Anti-Ziele

- Ein Leitbild, das nur Text ist und vom Code abweicht.
- Feste Pixel-Schriftgrössen, die die Systemeinstellung des Handys aushebeln.
- Bedeutung nur über Farbe (Status immer mit Text).
- Verstecktes Menü (☰) für Mitglieder.

## Entscheidungen des Projektleiters

| Thema | Entscheid |
|-------|-----------|
| App-Symbol | Vereinslogo von tcolten.ch — **Annahme K-13** (Freigabe des Vereins steht aus). Logo und Farben nur von der öffentlichen Website. |
| Farbkonzept | **Variante C:** eigenes Grün, vom TCO-Petrol Richtung Rasengrün verschoben, Haupttaste in Sandplatz-Rot — **Annahme K-13.2** (wie stark MyTCO sich abgrenzt). |
| Schrift | Systemschrift (keine Schriftdateien; DS-03 schliesst Google Fonts ohnehin aus). |
| Grundgrösse | 18 px bei Standardeinstellung, Kontrast mindestens WCAG AA, Tipp-Flächen mind. 48 px. |
| Systemschriftgrösse | MyTCO folgt der Schriftgrösse des Geräts. |
| Anrede | **Du** (im Verein ist man per Du). |
| Zähler | Formulare mit mehreren Schritten zeigen einen Schritt-Zähler; Kontingente einen Mengen-Zähler (gleicher Baustein). |
| Navigation | Reiter unten (Start · CM · Profil, später Lizenz; max. 4), Startseite mit „Jetzt aktuell", Unterseiten mit „‹ Zurück", kein ☰. Reiter-Bezeichnung „CM". |
| Verwaltung | Vor allem am PC: Seitenleiste + Tabelle. |
| Quelle der Werte | Leitbild **und** Token-Datei; die CI gleicht beide ab. |
| Schutz gegen Wildwuchs | Feste Bausteinliste im Leitbild, Dauerregel in CLAUDE.md, CI-Prüfung gegen Festwerte, Mockups als Referenz im Repo (die letzten zwei auf Empfehlung, Projektleiter: „entscheide du"). |

## Gestaltung (abgestimmt in den Mockups v1/v2)

### Farben

Alle Paare Text/Hintergrund erfüllen mindestens AA (gemessen):

| Token | Wert | Verwendung | Kontrast |
|-------|------|------------|----------|
| `--farbe-marke` | `#0f6b4f` | Kopfleiste, Titel, Links, aktiver Reiter | Weiss darauf 6.5 : 1 |
| `--farbe-marke-dunkel` | `#0b5640` | Seitenleiste Verwaltung | Weiss 8.7 : 1 |
| `--farbe-marke-hell` | `#cde3b9` | Wappen auf Grün, Bereichsüberschriften Verwaltung | auf marke-dunkel 6.3 : 1 |
| `--farbe-marke-zart` | `#e3efdc` | Plakette „aktiv", Tabellenkopf | marke darauf 5.5 : 1 |
| `--farbe-aktion` | `#a84f1f` | nur die Haupttaste (eine pro Bildschirm), Hervorhebung „Jetzt aktuell" | Weiss 5.5 : 1 |
| `--farbe-aktion-dunkel` | `#8c4018` | Haupttaste gedrückt/Hover | Weiss 7.3 : 1 |
| `--farbe-flaeche` | `#ffffff` | Karten, Eingabefelder | — |
| `--farbe-hintergrund` | `#f4f7f2` | Seitenhintergrund | Text 13 : 1 |
| `--farbe-text` | `#1f2a2a` | Fliesstext | — |
| `--farbe-text-leise` | `#4a5a58` | Hilfetexte, Nebeninfos | 6.7 : 1 auf Hintergrund |
| `--farbe-rand` | `#4a5a58` | Rand von Eingabefeldern (≥ 3 : 1, WCAG 1.4.11) | 7.3 : 1 |
| `--farbe-linie` | `#d5ddd9` | Trennlinien (rein dekorativ) | — |
| `--farbe-fehler` | `#b3261e` | Fehlermeldungen, Plakette „gesperrt" | 6.5 : 1 |
| `--farbe-hinweis` | `#7a5200` | Hinweise, Plakette „Brief offen" | 6.3 : 1 auf hinweis-flaeche |
| `--farbe-hinweis-flaeche` | `#fdf3e7` | Hintergrund von Hinweisen | — |

Herkunft: `#095d5d` (Petrol) und `#cde3b9` (Lindgrün) aus dem CSS von tcolten.ch;
`--farbe-marke` ist das Petrol, im Farbton Richtung Grün verschoben.

### Schrift

- Familie: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; Codes in
  `ui-monospace, "SF Mono", Menlo, Consolas, monospace`.
- Vier Stufen, alle in `rem`: klein 1rem · text 1.125rem · gross 1.375rem · titel 1.75rem
  (= 16/18/22/28 px bei Standardeinstellung). Zeilenhöhe 1.5 (Titel 1.25).

### Systemschriftgrösse

- Alle Grössen und Abstände in `rem`, nie in `px` (Ausnahme: Rahmenstärken und Radius als Tokens).
- `html` setzt keine Schriftgrösse in px (das würde die Systemeinstellung abschneiden).
- `<meta name="text-scale" content="scale">` in `src/app.html`: Chrome für Android (ab 146)
  übernimmt dann die Textgrösse des Systems.
- iPhone/Safari: `@supports (font: -apple-system-body) { html { font: -apple-system-body; } }` —
  Safari übernimmt die Dynamic-Type-Grösse. Die Grundgrösse 1.125rem sitzt auf `body`, nicht auf
  `html`, sonst bricht die Verbindung.
- PC: Browser-Zoom und -Schriftgrösse wirken über `rem` ohnehin.
- Layout bricht bei grosser Schrift um statt abzuschneiden (Bausteine mit `flex-wrap`, keine
  festen Höhen); bis 200 % Schrift ohne waagrechtes Scrollen (ausser Tabellen der Verwaltung).

### Abstände, Formen

- Abstände: `--abstand-1` … `--abstand-6` = 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 rem.
- `--radius` 10 px, `--tippflaeche` 3rem (48 px), `--rand-duenn` 1 px, `--rand-dick` 2 px.

### Bausteine

Jeder Baustein ist im Leitbild beschrieben und genau einmal als CSS-Klasse in
`src/lib/design/basis.css` gebaut. Neue Bausteine erst ins Leitbild, dann in den Code.

| Baustein | Klasse | Regel |
|----------|--------|-------|
| Kopfleiste | `.kopf` | Grün, Wappen + „MyTCO" |
| Reiter | `.reiter` | unten, 3–4 Einträge, Symbol + Text, aktiver mit Balken oben |
| Seitenleiste | `.seitenleiste` | nur Verwaltung, Bereiche nach Rolle |
| Haupttaste | `.taste-haupt` | Sandplatz-Rot, **höchstens eine pro Bildschirm** |
| Nebentaste | `.taste-neben` | weiss mit grünem Rand |
| Link | `a` | grün, unterstrichen |
| Zurück | `.zurueck` | „‹ Zurück" oben links auf Unterseiten |
| Eingabefeld | `.feld` | Bezeichnung über dem Feld, Hilfetext darunter, „(freiwillig)" statt Sternchen für Pflicht |
| Code-Feld | `.feld-code` | Festbreitenschrift, grösser |
| Karte | `.karte` | weisse Fläche auf Hintergrund |
| Kachel | `.kachel` | Karte als Link mit „›"; `.hervor` = Rand in Aktion-Farbe |
| Zähler | `.zaehler` | Balkensegmente + Text: „Schritt 2 von 3 · Kontakt" oder „1 von 3 Anmeldungen" |
| Plakette | `.plakette` (`-ok`, `-offen`, `-gesperrt`) | Status immer mit Text |
| Hinweis | `.hinweis` | ocker, Rand links |
| Fehlermeldung | `.fehler` | rot, direkt beim Feld |
| Tabelle | `.tabelle` | nur Verwaltung; auf schmalem Bildschirm waagrecht scrollbar |
| Symbol | `.symbol` | eigene SVG-Symbole, 24er-Raster, Strich 2, immer mit Text |

### Layout und Navigation

- **Mitglieder-App (Handy zuerst):** Kopfleiste oben, eine Spalte, max. Breite ~40rem, Reiter
  unten. Ab ~60rem Breite (PC) wandern die Reiter als Textlinks in die Kopfleiste.
- **Reiter:** Start · CM · Profil; Lizenz kommt mit der Etappe *Lizenzanträge*. Höchstens 4.
- **Startseite:** „Hoi <Vorname>", Bereich „Jetzt aktuell" (Kacheln, die wichtigste
  hervorgehoben), „Du bist angemeldet" (A-STARTSEITE-02, -04).
- **Verwaltung:** erreichbar über einen Eintrag unter *Profil*, nur bei Rollen über *Mitglied*
  hinaus (RR-07). Dunkelgrüne Seitenleiste mit „MyTCO Verwaltung", Bereiche nach Rolle,
  „‹ Zur App". Inhalt: Titel, Kennzahlen, Leiste (Suche, Filter, Nebentaste, Haupttaste), Tabelle.
- **Formulare:** mehr als ~4 Felder → in Schritte teilen mit Schritt-Zähler. Erstes Login:
  1 Angaben prüfen (vom Verein erfasst, nur lesen) · 2 Kontakt · 3 Tennis (Lizenznummer, Klassierung).

### Sprache

- Du-Form, kurze Sätze, Schweizer Schreibweise (ss statt ß), Begrüssung „Hoi".
- Tasten sagen, was passiert („Anmelden", „Speichern und weiter"), nicht „OK".
- Fachbegriffe wie im Glossar; „CM" ist die Kurzform von Clubmeisterschaft (Reiter), im Titel
  ausgeschrieben.

### Barrierefreiheit (Grundsätze)

- WCAG 2.2 Stufe AA als Untergrenze; die bestehenden E2E-Tests mit axe prüfen das später je Bildschirm.
- Schrift folgt der Systemeinstellung; Layout bis 200 % ohne Abschneiden.
- Tipp-Flächen mind. 48 × 48 px; sichtbarer Fokusrahmen (`--farbe-marke`, 3 px, Abstand 2 px).
- Bedeutung nie nur über Farbe; Symbole immer mit Text.
- Fehlermeldungen beim Feld, in Worten, mit Lösungsweg.
- Codes: Eingabe unabhängig von Gross-/Kleinschreibung und Bindestrich.

## Umsetzung im Repo

| Datei | Inhalt |
|-------|--------|
| `docs/ui-leitbild.md` | das Corporate Design (Inhalt wie oben, als Nachschlagewerk; jede Tabelle mit Spalte „Code-Stelle") |
| `src/lib/design/tokens.css` | alle Tokens als CSS-Variablen auf `:root`; Kommentare `Annahme K-13` / `Annahme K-13.2` |
| `src/lib/design/basis.css` | Grundstil (`html`/`body`, Textgrösse, Fokus) und die Baustein-Klassen; nur `var(--…)` |
| `src/routes/+layout.svelte` | bindet beide Dateien global ein |
| `src/app.html` | `meta text-scale`, Favicon- und Touch-Icon-Links, `theme-color` |
| `static/favicon.svg`, `static/apple-touch-icon.png` (180), `static/icon-192.png`, `static/icon-512.png` | Wappen lindgrün auf `--farbe-marke`; Kommentar/Doku `Annahme K-13` |
| `src/lib/design/wappen.svg` | Wappen als Form (`currentColor`), für Kopfleiste und Mockups |
| `docs/ui-mockups/*.html` | abgenommene Mockups; binden `tokens.css` und `basis.css` per relativem Pfad ein, eigenes CSS nur für den Geräterahmen |
| `scripts/pruefungen/design-tokens.ts` (+ Test) | Abgleich: jede Token-Zeile im Leitbild (`` `--name` `` + Wert) existiert mit gleichem Wert in `tokens.css` und umgekehrt |
| `scripts/pruefungen/design-festwerte.ts` (+ Test) | in `src/**/*.svelte` und `src/**/*.css` ausser `tokens.css`: keine Farbwerte (`#…`, `rgb(`, `hsl(`) und keine `px`-Angaben |
| `Makefile` | `design-tokens` läuft in `make docs` (nur Node, greift auch bei reinen Doku-Änderungen); `design-festwerte` in `npm run pruefungen` |
| `CLAUDE.md` | Dauerregel: Oberfläche nur aus Tokens und Bausteinen des UI-Leitbilds; Neues erst ins Leitbild |
| `docs/context-scopes.md`, `docs/index.md` | Leitbild und Mockups eintragen |
| `.gitignore` | `.superpowers/` (Arbeitsdateien des Browser-Begleiters) |

Annahmen werden an jeder Wirkstelle markiert: `Annahme K-13: …` bzw. `Annahme K-13.2: …`
in Leitbild, Token-Datei, Symbol-Dateien.

**Ableitbarkeit:** Jede Zeile im Leitbild nennt Token oder Klasse. Ändert jemand einen Wert im
Leitbild, schlägt `design-tokens` fehl, bis `tokens.css` nachgezogen ist — und umgekehrt.
Ändert sich eine Regel (z. B. Navigation), nennt die Spalte „Code-Stelle" die Datei.

**Laufende App am Ende von #13 (Entscheid Claude):** `+layout.svelte` bekommt die Kopfleiste
(Wappen + „MyTCO") und den Grundstil; der bestehende Platzhalter-Text bleibt als Inhalt.
Keine Reiter — sie kämen ohne Zielseiten; sie entstehen mit den ersten echten Bildschirmen.
Bestehende E2E-Tests (Startseite, axe) bleiben grün bzw. werden angepasst.

**Mockups im Repo (Entscheid Claude):** Grundlage sind die im Browser abgestimmten Entwürfe:
v2 (Du-Form, Login, Erstes Login mit Schritt-Zähler, Startseite, CM-Anmeldung, grosse Schrift)
und aus v1 die Mitgliederverwaltung, auf Du umgestellt. Die Startseite kommt als fünfter
Bildschirm dazu, weil sie die Navigation zeigt. Die Entwürfe sind die Vorlage, nicht die
Abnahme: Der Projektleiter nimmt die Mockups im Repo ab, **bevor** nach `dev` gemergt wird
(Haltepunkt im Plan). Die Browser-Entwürfe bleiben bis dahin unter `.superpowers/` liegen.

## Nachweis (Definition of Done #13)

- Leitbild mit Farb-, Schrift- und Barrierefreiheitskonzept liegt vor.
- Mockups (Login, Erstes Login, Startseite, CM-Anmeldung, Mitgliederverwaltung) im Repo und vom
  Projektleiter abgenommen (Screenshot im Bericht).
- Tests der zwei Prüfskripte grün; `make check` grün.
- Screenshot der laufenden App (Platzhalter-Startseite mit Kopfleiste) bei 100 % und 200 % Schrift.

## Dem Umsetzer überlassen

- Genaue Regex der Festwert-Prüfung (z. B. Umgang mit `0`, `%`, `em`, Kommentaren).
- Wie die PNG-Symbole aus dem SVG entstehen (einmalig erzeugen und versionieren genügt).
- Aufbau der Mockup-Dateien (eine Datei je Bildschirm oder eine Übersicht).
