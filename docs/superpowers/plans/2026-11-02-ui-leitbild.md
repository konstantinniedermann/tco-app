# UI-Leitbild und Mockups (#13) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein verbindliches Corporate Design für MyTCO: Leitbild-Dokument, eine Token-Datei als einzige Quelle der Werte im Code, Baustein-Klassen, zwei CI-Prüfungen gegen Abweichung und Wildwuchs, Wappen als App-Symbol, Mockups im Repo.

**Architecture:** `docs/ui-leitbild.md` beschreibt alles; `src/lib/design/tokens.css` hält die Werte als CSS-Variablen, `src/lib/design/basis.css` den Grundstil und die Baustein-Klassen (nur `var(--…)`). Ein Prüfskript gleicht Leitbild-Tabellen und `tokens.css` ab, ein zweites verbietet Farb- und px-Werte im übrigen `src/`. Die Mockups unter `docs/ui-mockups/` binden dieselben zwei CSS-Dateien ein.

**Tech Stack:** SvelteKit 3 / Svelte 5 (Runes), CSS Custom Properties, Node 26 (TypeScript nativ) für Prüfskripte, Vitest, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-02-ui-leitbild-design.md` — enthält alle Werte (Farbtabelle, Schriftstufen, Abstände, Bausteine, Navigation, Sprache, Barrierefreiheit). Executors lesen Spec und Plan.

## Global Constraints

- Keine neuen Dependencies (`package.json` bleibt bei den Paketen; Prüfskripte nur mit Node-Bordmitteln).
- Vor jedem Svelte-Code die aktuelle Doku über den Svelte-MCP-Server holen (CLAUDE.md), danach `svelte-autofixer`.
- CSP bleibt `'self'`: keine `style=`-Attribute im App-Markup, keine `<style>`-Injektion, Bilder nur aus `static/`.
- Werte exakt wie in der Spec-Farbtabelle; Schriftgrössen und Abstände in `rem`; nie `font-size` in `px` auf `html`.
- Annahmen an jeder Wirkstelle markieren: `Annahme K-13: Vereinslogo von tcolten.ch als App-Symbol, Freigabe des Vereins steht aus` und `Annahme K-13.2: Farbkonzept Variante C (eigenes Grün + Sandplatz-Rot) als Abgrenzung von tcolten.ch`.
- Texte in Du-Form, Schweizer Schreibweise (ss), nur erfundene Namen, Mailadressen nur `@example.org`.
- `docs/abklaerungen.md` nicht ändern.
- Dateien einzeln stagen, Commit-Präfixe `feat:`/`docs:`/`test:`, Trailer laut Session.
- Prettier-Stil: Tabs, einfache Anführungszeichen, Breite 100.

## Review Focus

1. Mitglied stellt am Android-Handy oder iPhone grosse Systemschrift ein → MyTCO wird grösser, nichts wird abgeschnitten, kein waagrechtes Scrollen (Test in Task 3).
2. Jemand ändert im Leitbild einen Farbwert, aber nicht in `tokens.css` (oder umgekehrt, oder benennt ein Token nur auf einer Seite um) → `make docs` schlägt fehl und nennt Token und beide Werte (Tests in Task 1).
3. Ein späterer Bildschirm schreibt `color: #fff`, `padding: 12px`, `rgb(…)` oder ein `style=`-Attribut → `npm run pruefungen` schlägt fehl mit Datei:Zeile; `{#each}`, `href="#x"` und Kommentare lösen keinen Fehlalarm aus (Tests in Task 2).
4. Neue Kopfleiste verletzt Kontrast oder Landmark-Regeln → axe in der bestehenden E2E-Prüfung bleibt leer, auf iPhone, Android und Desktop (Task 3).
5. Mockups weichen von den Tokens ab, weil sie eigene Farben definieren → Mockup-CSS enthält nur Geräterahmen; Sichtprüfung im Review (Task 5).

---

### Task 1: Leitbild, Token-Datei und Abgleich-Prüfung

**Files:**
- Create: `docs/ui-leitbild.md`
- Create: `src/lib/design/tokens.css`
- Create: `scripts/pruefungen/design-tokens.ts`
- Test: `scripts/pruefungen/design-tokens.test.ts`
- Modify: `Makefile` (Ziel `docs`)

**Interfaces:**
- Produces: `leseLeitbildTokens(markdown: string): Map<string, string>` · `leseCssTokens(css: string): Map<string, string>` · `pruefeDesignTokens(leitbild: string, css: string): string[]` (Befunde, leer = ok). Token-Namen und Klassen, die Task 3–5 verwenden (Liste unten).

**Token-Liste (vollständig, Werte aus der Spec):** die 15 Farben der Spec-Tabelle; `--schrift-text`, `--schrift-code`; `--groesse-klein` 1rem, `--groesse-text` 1.125rem, `--groesse-gross` 1.375rem, `--groesse-titel` 1.75rem, `--groesse-symbol` 1.5rem; `--zeilenhoehe-text` 1.5, `--zeilenhoehe-titel` 1.25; `--abstand-1` … `--abstand-6` = 0.25rem / 0.5rem / 0.75rem / 1rem / 1.5rem / 2rem; `--radius` 10px, `--radius-rund` 999px, `--tippflaeche` 3rem, `--rand-duenn` 1px, `--rand-dick` 2px, `--fokus-breite` 3px, `--fokus-abstand` 2px, `--schatten-karte` `0 1px 3px rgb(0 0 0 / 0.13)`, `--breite-inhalt` 40rem.

**Format im Leitbild (vom Prüfskript gelesen):** Tabellenzeilen, deren erste Zelle genau ein `` `--name` `` und deren zweite Zelle genau einen Wert in Backticks enthält. Andere Tabellen (Bausteine, Regeln) haben in Zelle 1 kein `--`-Token und werden ignoriert.

- [ ] **Step 1: Tests schreiben** (`describe('pruefeDesignTokens')`):
  - `liest Token-Zeilen aus Markdown-Tabellen`: `` | `--farbe-marke` | `#0f6b4f` | Kopfleiste | `` → Map mit `'--farbe-marke' → '#0f6b4f'`; Zeilen ohne `--`-Token in Zelle 1 ignoriert.
  - `liest Tokens aus :root`: `':root {\n\t--farbe-marke: #0f6b4f; /* Annahme K-13.2 */\n\t--schrift-text: system-ui, "Segoe UI", sans-serif;\n}'` → zwei Einträge, Kommentar nicht im Wert.
  - `meldet nichts bei Übereinstimmung` (Gross/Kleinschreibung und Mehrfach-Leerzeichen im Wert egal: `#0F6B4F` = `#0f6b4f`).
  - `meldet abweichenden Wert` → genau ein Befund, enthält Token-Name und beide Werte.
  - `meldet Token nur im Leitbild` und `meldet Token nur in tokens.css` → je ein Befund mit Name und Ort.
- [ ] **Step 2:** `npx vitest run scripts/pruefungen/design-tokens.test.ts` → FAIL (Modul fehlt).
- [ ] **Step 3:** `scripts/pruefungen/design-tokens.ts` umsetzen; `if (import.meta.main)` liest `docs/ui-leitbild.md` und `src/lib/design/tokens.css` und meldet über `meldeErgebnis('design-tokens', …)` aus `dateien.ts`. Nur `node:`-Module (läuft in `make docs` ohne `node_modules`). Kommentare `/* … */` vor dem Parsen entfernen.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** `src/lib/design/tokens.css` schreiben: alle Tokens auf `:root`, gruppiert (Farben, Schrift, Abstände, Formen), Kopfkommentar „Einzige Quelle der Design-Werte im Code; Werte und Bedeutung → docs/ui-leitbild.md; die CI gleicht beide ab", Annahme-Kommentare an `--farbe-marke`, `--farbe-aktion`, `--farbe-marke-hell`.
- [ ] **Step 6:** `docs/ui-leitbild.md` schreiben (Rücklink `[← Übersicht](index.md)` wie andere Docs). Abschnitte:
  1. Zweck und Gebrauch — „Erst Leitbild ändern, dann Code"; was die zwei Prüfungen erzwingen; Code-Stellen: `src/lib/design/tokens.css`, `src/lib/design/basis.css`, `static/*.svg|png`.
  2. Herkunft und Annahmen — Petrol `#095d5d`, Lindgrün `#cde3b9`, Wappen von tcolten.ch; Annahme K-13 und K-13.2 im Wortlaut der Global Constraints; Link auf K-13 in `abklaerungen.md` (relativ aus `docs/`).
  3. Farben — Tabelle `Token | Wert | Verwendung | Kontrast` aus der Spec; Hinweis, dass `static/wappen.svg` (`--farbe-marke-hell`) und `static/favicon.svg` + PNGs (`--farbe-marke`, `--farbe-marke-hell`) die Farben fest enthalten und bei Änderung neu zu erzeugen sind.
  4. Schrift und Systemschriftgrösse — Token-Tabelle; Regeln: rem statt px, `meta text-scale`, `-apple-system-body`, Grundgrösse auf `body`.
  5. Abstände und Formen — Token-Tabelle; Umbruch auf PC-Layout bei `60em` (Medienabfragen erlauben keine Variable; steht nur in `basis.css`).
  6. Bausteine — Tabelle `Baustein | Klasse | Regel` aus der Spec, Klassennamen exakt: `.kopf`, `.reiter`, `.seitenleiste`, `.taste-haupt`, `.taste-neben`, `.zurueck`, `.feld`, `.feld-code`, `.karte`, `.kachel` (+ `.hervor`), `.zaehler`, `.plakette` (+ `-ok`, `-offen`, `-gesperrt`), `.hinweis`, `.fehler`, `.tabelle`, `.symbol`; Satz „Neue Bausteine erst hier, dann in `basis.css`".
  7. Layout und Navigation — aus der Spec (Reiter Start · CM · Profil, max. 4; Startseite; Zurück; PC-Kopfleiste; Verwaltung mit Seitenleiste; Formulare in Schritten, erstes Login 3 Schritte).
  8. Sprache — aus der Spec (Du, ss, „Hoi", Tasten sagen was passiert, „(freiwillig)" statt Sternchen).
  9. Barrierefreiheit — Regeln mit IDs `UI-01` … aus der Spec-Liste (AA, Systemschrift/200 %, 48 px, Fokus, nie nur Farbe, Fehler beim Feld, Code-Eingabe tolerant).
  10. Mockups — Links auf `ui-mockups/index.html` und `ui-mockups/grosse-schrift.html` (entstehen in Task 5; bis dahin Link weglassen, in Task 5 ergänzen, damit der Link-Check grün bleibt).
- [ ] **Step 7:** `Makefile`, Ziel `docs`: Zeile `@node scripts/pruefungen/design-tokens.ts` nach `test-ids.ts`. `make docs` → `design-tokens: ok`. Gegenprobe: einen Wert in `tokens.css` ändern → `make docs` schlägt mit Befund fehl; zurücksetzen.
- [ ] **Step 8: Commit** — `git add` der fünf Dateien einzeln; `feat: Design-Tokens, UI-Leitbild und Abgleich-Prüfung (#13)`.

### Task 2: Prüfung gegen Festwerte

**Files:**
- Create: `scripts/pruefungen/design-festwerte.ts`
- Test: `scripts/pruefungen/design-festwerte.test.ts`
- Modify: `package.json` (Skript `pruefungen`)

**Interfaces:**
- Consumes: `leseDateien`, `meldeErgebnis`, `versionierteDateien` aus `dateien.ts`.
- Produces: `pruefeDesignFestwerte(dateien: Map<string, string>): string[]` — Befunde `pfad:zeile: <Grund>`.

Geprüft werden Pfade unter `src/` mit Endung `.css` oder `.svelte`, ausser `src/lib/design/tokens.css`. In `.svelte` nur der Inhalt von `<style>…</style>` auf Werte; zusätzlich jedes `style=`/`style:`-Attribut im Markup (CSP verbietet es, Leitbild ebenso). CSS-Kommentare vorher durch gleich viele Zeilenumbrüche ersetzen (Zeilennummern bleiben stimmig).

- [ ] **Step 1: Tests schreiben** (`describe('pruefeDesignFestwerte')`):
  - meldet je einen Befund für `.a { color: #fff; }`, `#a84f1f`, `rgb(0 0 0)`, `rgba(0,0,0,.1)`, `hsl(1 2% 3%)`, `padding: 12px`, `font-size: 0.5px` in `src/x.css`.
  - meldet `<div style="color: red">` und `<div style:color={c}>` in `src/routes/+page.svelte`.
  - meldet `#fff` innerhalb `<style>` einer `.svelte`-Datei mit Zeilennummer (`src/a.svelte:3`).
  - ignoriert: `{#each xs as x}`, `{#if a}`, `href="#inhalt"` im Markup; `/* 12px #fff */`; `var(--abstand-2)`, `1rem`, `60em`, `100%`, `0`.
  - ignoriert `src/lib/design/tokens.css` und Dateien ausserhalb `src/` (z. B. `docs/ui-mockups/mockup.css`).
- [ ] **Step 2:** `npx vitest run scripts/pruefungen/design-festwerte.test.ts` → FAIL.
- [ ] **Step 3:** umsetzen; `import.meta.main` mit `versionierteDateien()` gefiltert.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** `package.json` → `pruefungen` um `&& node scripts/pruefungen/design-festwerte.ts` ergänzen. `npm run pruefungen` → `design-festwerte: ok` (bestehender Code hat keine Styles).
- [ ] **Step 6: Commit** — `feat: Prüfung gegen Farb- und px-Werte ausserhalb der Tokens (#13)`.

### Task 3: Grundstil, Kopfleiste, Systemschrift, App-Symbol

**Files:**
- Create: `src/lib/design/basis.css`
- Create: `static/wappen.svg`, `static/favicon.svg`, `static/apple-touch-icon.png` (180×180), `static/icon-192.png`, `static/icon-512.png`
- Modify: `src/routes/+layout.svelte`, `src/app.html`
- Test: `tests/e2e/startseite.test.ts`

**Interfaces:**
- Consumes: Tokens und Klassennamen aus Task 1.
- Produces: `basis.css` mit allen Baustein-Klassen aus Leitbild Abschnitt 6 (von Task 5 genutzt); `static/wappen.svg`.

- [ ] **Step 1: E2E-Tests ergänzen** in `tests/e2e/startseite.test.ts` (laufen in allen drei Projekten iphone/android/desktop):
  - `Kopfleiste mit Wappen und MyTCO`: `page.getByRole('banner')` enthält Text `MyTCO`; darin `img` mit leerem `alt` (Wappen ist Schmuck neben dem Namen).
  - `Schrift folgt der Grundgrösse des Geräts`: `meta[name="text-scale"]` hat `content="scale"`; Verhältnis `parseFloat(getComputedStyle(body).fontSize) / parseFloat(getComputedStyle(documentElement).fontSize)` ist `1.125` (±0.01).
  - `Bei 200 % Schrift kein waagrechtes Scrollen`: per `page.evaluate` `document.documentElement.style.fontSize = '200%'` (CSSOM, von CSP erlaubt) → `scrollWidth <= innerWidth`; Screenshot `startseite-200.png` in `info.outputPath`.
  - Bestehender Test (axe leer, keine Konsolenfehler) bleibt unverändert und muss mit Kopfleiste grün sein.
- [ ] **Step 2:** `make check` (bzw. `npm run e2e`) → neue Tests FAIL.
- [ ] **Step 3:** `static/wappen.svg` aus dem Wappen-Pfad (Website-SVG, nur die 6 Pfade links von x=95, `viewBox="11 11 82 134"`, `fill="#cde3b9"`), Kommentar `<!-- Annahme K-13 … ; Quelle: tcolten.ch; Farbe = --farbe-marke-hell -->`. `static/favicon.svg`: quadratisch 512, abgerundeter Hintergrund `#0f6b4f`, Wappen lindgrün zentriert (~60 % Höhe). PNGs einmalig aus `favicon.svg` erzeugen (z. B. Playwright-Screenshot in einem Wegwerf-Skript im Scratchpad); nicht versionierte Hilfsskripte.
- [ ] **Step 4:** `src/app.html`: `<meta name="text-scale" content="scale">` direkt nach `viewport`; `<meta name="theme-color" content="#0f6b4f">` (HTML erlaubt keine Variable; im Leitbild als Code-Stelle von `--farbe-marke` nennen); `<link rel="icon" href="%sveltekit.assets%/favicon.svg" type="image/svg+xml">`, `<link rel="apple-touch-icon" href="%sveltekit.assets%/apple-touch-icon.png">`.
- [ ] **Step 5:** `src/lib/design/basis.css`: Import nicht nötig — `+layout.svelte` importiert `tokens.css` vor `basis.css`. Inhalt: `html` (keine Grösse) + `@supports (font: -apple-system-body) { html { font: -apple-system-body; } }`; `body` mit `--schrift-text`, `--groesse-text`, `--zeilenhoehe-text`, `--farbe-text` auf `--farbe-hintergrund`, `margin: 0`; Überschriften; `a`; `:focus-visible` (Rahmen `--fokus-breite` `--farbe-marke`, Abstand `--fokus-abstand`); alle Baustein-Klassen laut Leitbild mit `flex-wrap`/ohne feste Höhen; `@media (min-width: 60em)` für PC-Kopfleiste/Seitenleiste; `.tabelle` in waagrecht scrollbarem Behälter. Nur `var(--…)`, `rem`, `em`, `%`, `0`.
- [ ] **Step 6:** Svelte-Doku per MCP holen (`list-sections`, dann Abschnitte zu Layouts und globalen Styles). `+layout.svelte`: `import '$lib/design/tokens.css'; import '$lib/design/basis.css';`; Markup `<header class="kopf"><img src="/wappen.svg" alt="" …> MyTCO</header>`, `<main>` mit max. Breite `--breite-inhalt` über Klasse, Fusszeile mit Version unverändert (`data-testid="version"`). Breite/Höhe des `img` über Klasse in `basis.css`, nicht als Attribut-Style. `svelte-autofixer` → keine Befunde.
- [ ] **Step 7:** `make check` → alles grün inkl. neue E2E-Tests und `design-festwerte`. Screenshots `startseite.png` und `startseite-200.png` aus `test-results/` ansehen (Kopfleiste grün, Wappen lindgrün, Text gross).
- [ ] **Step 8: Commit** — `feat: Grundstil, Kopfleiste und App-Symbol nach UI-Leitbild (#13)` (Dateien einzeln).

### Task 4: Dauerregel und Doku-Verweise

**Files:**
- Modify: `CLAUDE.md`, `docs/index.md`, `docs/context-scopes.md`, `docs/versionen.md`, `.gitignore`

- [ ] **Step 1:** `CLAUDE.md`, Abschnitt „Code — Dauerregeln", neue Zeile: `- Oberfläche nur aus den Tokens und Bausteinen von docs/ui-leitbild.md; was dort fehlt, kommt erst ins Leitbild, dann in den Code.`
- [ ] **Step 2:** `docs/index.md`, Tabelle *Architektur*: Zeile `[UI-Leitbild](ui-leitbild.md) | Corporate Design: Farben, Schrift, Bausteine, Navigation, Sprache, Barrierefreiheit `UI-NN`; Mockups`. Falls #13 unter *Geplant* steht: Eintrag entfernen.
- [ ] **Step 3:** `docs/context-scopes.md`, Zeile *App-Oberfläche*: `docs/ui-leitbild.md`, `src/lib/design/`, `static/` ergänzen.
- [ ] **Step 4:** `docs/versionen.md` unter *Unveröffentlicht*: ein Punkt „UI-Leitbild (#13): Design-Tokens, Bausteine, Prüfungen gegen Abweichung und Festwerte, Kopfleiste mit Wappen, Schrift folgt der Systemeinstellung; Mockups".
- [ ] **Step 5:** `.gitignore`: `.superpowers/` ergänzen.
- [ ] **Step 6:** `make docs` → ok. **Commit** — `docs: Dauerregel UI-Leitbild und Verweise (#13)`.

### Task 5: Mockups im Repo — Haltepunkt Abnahme

**Files:**
- Create: `docs/ui-mockups/index.html`, `docs/ui-mockups/grosse-schrift.html`, `docs/ui-mockups/mockup.css`
- Modify: `docs/ui-leitbild.md` (Abschnitt 10 Links)

**Interfaces:**
- Consumes: `../../src/lib/design/tokens.css`, `../../src/lib/design/basis.css`, `../../static/wappen.svg`, Baustein-Klassen aus Task 3.

Vorlage: Browser-Entwürfe `.superpowers/brainstorm/*/content/screens-v2.html` (Login, Erstes Login Schritt 2 von 3, Startseite, CM-Anmeldung) und `screens.html` (nur Mitgliederverwaltung; Texte auf Du umstellen). Inhalte und erfundene Namen von dort übernehmen; Markup aber nur mit den Baustein-Klassen aus `basis.css`. `mockup.css` enthält ausschliesslich Geräterahmen und Anordnung (Handy 360 px breit, PC 1040 px), keine Farben ausser Rahmenfarbe.

- [ ] **Step 1:** `index.html`: Titel „MyTCO — Mockups", Hinweis „Alle Namen erfunden", fünf Bildschirme mit Unterschrift (1 Login · 2 Erstes Login · 3 Startseite mit Reitern · 4 CM-Anmeldung · 5 Mitgliederverwaltung PC). Reiter-Symbole als eigene Inline-SVGs (24er-Raster, Strich 2, Klasse `.symbol`).
- [ ] **Step 2:** `grosse-schrift.html`: Startseite und CM-Anmeldung mit `html { font-size: 150%; }` aus `mockup.css` (Klasse am `html`), Rahmen gleich breit → zeigt Umbruch.
- [ ] **Step 3:** Leitbild Abschnitt 10: Links auf beide Dateien. `make docs` → ok.
- [ ] **Step 4:** Screenshots beider Seiten erzeugen (Playwright, `file://`), ansehen: Darstellung entspricht den Browser-Entwürfen v2.
- [ ] **Step 5: Commit** — `docs: Mockups nach UI-Leitbild (#13)`.
- [ ] **Step 6: HALTEPUNKT** — Projektleiter die Mockups zeigen (Browser-Begleiter oder Screenshots), Abnahme einholen. Korrekturen → zuerst Leitbild/Tokens, dann Mockups; erneut zeigen. Erst nach Abnahme weiter.

### Task 6: Abschluss

- [ ] **Step 1:** `make check` → grün (Ausgabe festhalten).
- [ ] **Step 2:** Agent `cas-reviewer` über den Branch; Befunde klären (trivial → mitmachen, sonst `docs/beobachtungen.md`).
- [ ] **Step 3:** Branch pushen (`git push -u origin docs/issue-013`), dann Schritt 4 aus Skill `tco-branching` (Merge nach `dev`).
