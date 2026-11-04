# Hilfe beim Start — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einstiegsseite mit animierter Anleitung zum Startbildschirm (iPhone, Android mit Install-Taste), Seite *Hilfe* ohne Login und Link «Hilfe» in der Fusszeile (A-HILFE-01, A-HILFE-02, #47).

**Architecture:** Neuer Baustein *Anleitung* zuerst im UI-Leitbild und in `basis.css`, dann als Svelte-Komponente. Gerät und «vom Symbol» erkennt eine reine Funktion im Browser; die Weiche sitzt im Laden von `/`. Der Kontakt kommt aus der bestehenden Einstellung `MYTCO_KONTAKT` über einen öffentlichen `+server.ts`-Endpunkt.

**Tech Stack:** SvelteKit 3 (ssr aus), Svelte 5 (Runes), TypeScript, Vitest, Playwright (Projekte `iphone`, `android`, `desktop`), axe.

**Spec:** `docs/superpowers/specs/2026-11-04-hilfe-beim-start-design.md` · Mockup: `docs/ui-mockups/hilfe.html`

## Global Constraints

- Vor jedem Svelte-/SvelteKit-Code die Doku über den Svelte-MCP-Server holen, nie aus dem Gedächtnis; jede `.svelte`-Datei mit `svelte-autofixer` prüfen.
- Unter `src/routes` keine Server-Dateien ausser `+server.ts` (ADR-002, Prüfung `bauregel`).
- Oberfläche nur aus Tokens und Bausteinen von `docs/ui-leitbild.md`; Farben und `px` nur in `tokens.css`, keine `style`-Attribute (Prüfung `design-festwerte`). Masse in `rem`.
- Keine neuen Abhängigkeiten.
- Testnamen nennen die geprüfte ID (`A-HILFE-01: …`, `A-HILFE-02: …`), sonst schlägt `test-ids` an.
- Nur erfundene Daten (`@example.org`); Erkennung iPhone/Android nie speichern, nie an den Server schicken.
- Texte wörtlich aus der Spec (Tabelle der Schritte, Fertig-Text, Karte «Fragen?», Rückfalltext). Du-Form, «ss».
- Zeiten: Schritt 3500 ms, Bild «Fertig» 6000 ms, höchstens 3 Durchläufe; Überblendung 0,7 s.
- Dateien einzeln stagen; Commits `feat:`/`docs:`/`test:` mit `(#47)`.

## Review Focus

1. **Mail-Code wartet im Handy-Browser** → `/` muss weiter zu `/login/mail` führen, nicht zur Einstiegsseite (Reihenfolge der Prüfungen in `+page.ts`). Bestehender E2E-Test in `login.test.ts` (Zeile ~204) bleibt unverändert und muss auf `iphone`/`android` grün bleiben (Task 7).
2. **Mit Sitzung im Handy-Browser** (über «Ohne Startbildschirm weiter» angemeldet) → `/` zeigt die Startseite, nie die Einstiegsseite (Test in Task 7).
3. **Install-Angebot abgelehnt:** `prompt()` gilt nur einmal → danach Taste weg, Aufklappbereich «Klappt nicht? Über das Menü» offen (Test in Task 7).
4. **`/api/kontakt` antwortet nicht** → Karte zeigt «Den Kontakt findest du in deinem Brief.», Seite bleibt bedienbar (Test in Task 6).
5. **`/willkommen` direkt aufgerufen** am PC oder vom Symbol → weiter zu `/login` (Test in Task 7).

## Dateien

| Datei | Zweck |
|-------|-------|
| `docs/ui-leitbild.md` | Baustein Anleitung, Fusszeile, UI-09 Bewegung, Ausnahme Rot, Mockup-Eintrag |
| `src/lib/design/basis.css` | Klassen des Bausteins Anleitung (aus dem Mockup übernommen, umbenannt) |
| `docs/ui-mockups/hilfe.html` | nutzt danach die Klassen aus `basis.css`, behält nur Skript und Rahmen |
| `src/lib/hilfe/geraet.ts` (+ `.test.ts`) | Erkennung Gerät, anderer iPhone-Browser, vom Symbol, Einstieg ja/nein |
| `src/lib/hilfe/ablauf.ts` (+ `.test.ts`) | Takt der Animation (nächster Schritt, Dauer, Ende nach 3 Durchläufen) |
| `src/lib/hilfe/installation.svelte.ts` | `beforeinstallprompt` abfangen, `installiere()` |
| `src/hooks.client.ts` | ruft `beobachteInstallation(window)` beim Start auf |
| `src/lib/ui/Anleitung.svelte` | Baustein: Zeichnung + Taste + Schritte, Ablauf, «Bewegung reduzieren» |
| `src/lib/ui/ZeichnungIphone.svelte`, `ZeichnungAndroid.svelte` | die Bilder der Zeichnung |
| `src/routes/api/kontakt/+server.ts` (+ `kontakt.test.ts`) | GET → `{ kontakt }` ohne Login |
| `src/routes/hilfe/+page.svelte`, `+page.ts` | Seite Hilfe |
| `src/routes/willkommen/+page.svelte`, `+page.ts` | Einstiegsseite |
| `src/routes/+page.ts` | Weiche ohne Sitzung |
| `src/routes/+layout.svelte` | Fusszeile mit Link «Hilfe» |
| `src/lib/server/brief/brief.ts` (+ `.test.ts`) | Kurzanleitung nachgeführt |
| `tests/e2e/hilfen/geraet.ts` | `startetVomSymbol(page)`, `bietetInstallationAn(page)` |
| `tests/e2e/hilfe.test.ts` | E2E Hilfe, Einstiegsseite, Weiche |
| `tests/e2e/startseite.test.ts`, `tests/e2e/login.test.ts` | an die Weiche angepasst |

---

### Task 1: Baustein Anleitung im Leitbild und in `basis.css`

**Files:**
- Modify: `docs/ui-leitbild.md` (Bausteine, *Welche Fläche wofür*, Barrierefreiheit, Farben `--farbe-aktion`, Mockups)
- Modify: `src/lib/design/basis.css`
- Modify: `docs/ui-mockups/hilfe.html`

**Interfaces:**
- Produces (Klassen, Präfix nach Leitbild-Regel `<baustein>-<teil>`): `.anleitung`, `.anleitung-film`, `.anleitung-bild` (+ `.aktiv`), `.anleitung-taste`, `.anleitung-schritte` (`li.aktiv`, `li.anleitung-fertig`), `.anleitung-ruhig` (still, zwei Spalten), `.anleitung-angehalten`; Zeichnungsteile `.anleitung-kopf`, `.anleitung-zeile`, `.anleitung-leiste` (`.unten`/`.oben`), `.anleitung-menue`, `.anleitung-eintrag` (`.leer` = grauer Balken), `.anleitung-blatt`, `.anleitung-dialog`, `.anleitung-schalter`, `.anleitung-app`, `.anleitung-home`, `.anleitung-symbol-app`, `.anleitung-erledigt` («✓ Fertig» im Bild), `.anleitung-tipp` mit Lage-Klassen `.anleitung-tipp-ios-1` … `-ios-4`, `-and-1` … `-and-3`, `-home`; Bewegungsklassen `.anleitung-rein-unten`, `-rein-oben`, `-rein-blatt`, `-rein-dialog`, `-rein-symbol`, `-scrollt`. Fusszeile `.fuss` (Link «Hilfe» · Version).

- [ ] **Step 1: Leitbild ergänzen.** Tabelle *Bausteine*: Zeile *Anleitung* (Regel: Zeichnung `aria-hidden`, Schritte tragen die Bedeutung, ein Schritt = ein Bild, Beschriftungen nur belegte, sonst graue Balken) und Zeile *Fusszeile* (Link «Hilfe» · Version, auf jeder Seite der Mitglieder-App). Neue Regel **UI-09** unter *Barrierefreiheit*: «Bewegung nur im Baustein Anleitung: höchstens 3 Durchläufe, Taste Anhalten/Abspielen/Nochmals abspielen, bei «Bewegung reduzieren» still.» Bei `--farbe-aktion`: «… und der Tipp-Kreis der Anleitung (Ausnahme: sagt ‹hier tippen›)». Code-Stellen-Tabelle: `src/lib/ui/Anleitung.svelte`, `Zeichnung*.svelte`. Mockup-Liste: «`[Hilfe beim Start](ui-mockups/hilfe.html)`: Einstiegsseite iPhone/Android, Bewegung reduziert, Hilfe, Login mit Fusszeile».
- [ ] **Step 2: CSS nach `basis.css`.** Den `<style>`-Block des Mockups unter den neuen Namen übernehmen; Farben nur über Tokens, keine `px`. `@media (prefers-reduced-motion: reduce)` und `.anleitung-ruhig` setzen Animation und Übergang aus. Im Mockup den `<style>`-Block entfernen, Klassen umbenennen, Skript behalten.
- [ ] **Step 3: Prüfen.** `make docs` → `design-tokens: ok`; `npm run pruefungen` → keine Meldung von `design-festwerte`; Mockup per Playwright-Screenshot öffnen (Handy 1 und 4) und mit dem Stand vor dem Umbau vergleichen: gleich.
- [ ] **Step 4: Commit** `docs: Baustein Anleitung und Fusszeile im UI-Leitbild (#47)` (Leitbild, `basis.css`, Mockup).

### Task 2: Erkennung von Gerät und Start vom Symbol

**Files:**
- Create: `src/lib/hilfe/geraet.ts`, `src/lib/hilfe/geraet.test.ts`

**Interfaces:**
- Produces:
  - `type Geraet = 'iphone' | 'android' | 'andere'`
  - `erkenneGeraet(userAgent: string): Geraet` — `iPhone` → iphone; `Android` → android (auch Tablet); sonst (iPad gibt sich als Mac aus, PC) andere
  - `istAndererIphoneBrowser(userAgent: string): boolean` — `CriOS|FxiOS|EdgiOS`
  - `laeuftVomSymbol(fenster: { matchMedia(q: string): { matches: boolean }; navigator: { standalone?: boolean } }): boolean` — `(display-mode: standalone)` oder `navigator.standalone === true`
  - `zeigeEinstieg(userAgent: string, vomSymbol: boolean): boolean` — Gerät ≠ andere und nicht vom Symbol

- [ ] **Step 1: Failing tests** mit echten User-Agent-Beispielen (iPhone Safari iOS 26, iPhone CriOS, Pixel/Chrome, Samsung-Tablet `SM-X…` Android, iPad `Macintosh`, Windows Chrome):
  - `A-HILFE-02: iPhone und Android (auch Tablet) zählen als Handy, iPad und PC nicht`
  - `A-HILFE-02: Chrome, Firefox und Edge auf dem iPhone sind andere Browser, Safari nicht`
  - `A-HILFE-02: vom Symbol bei display-mode standalone oder navigator.standalone`
  - `A-HILFE-02: Einstieg nur auf dem Handy im Browser` (iphone+false → true, iphone+true → false, andere+false → false)
- [ ] **Step 2:** `npx vitest run src/lib/hilfe/geraet.test.ts` → FAIL (Modul fehlt).
- [ ] **Step 3:** `geraet.ts` mit den Signaturen oben umsetzen.
- [ ] **Step 4:** gleicher Befehl → PASS.
- [ ] **Step 5: Commit** `feat: Erkennung von Handy und Start vom Symbol (#47)`.

### Task 3: Takt der Animation

**Files:**
- Create: `src/lib/hilfe/ablauf.ts`, `src/lib/hilfe/ablauf.test.ts`

**Interfaces:**
- Produces:
  - `SCHRITT_MS = 3500`, `FERTIG_MS = 6000`, `DURCHLAEUFE = 3`
  - `type Ablauf = { schritt: number; durchlauf: number; anzahl: number }` (`schritt` 0-basiert, letztes Bild = `anzahl - 1` = «Fertig»)
  - `start(anzahl: number): Ablauf` → `{ schritt: 0, durchlauf: 1, anzahl }`
  - `dauerMs(a: Ablauf): number` → `FERTIG_MS` auf dem letzten Bild, sonst `SCHRITT_MS`
  - `weiter(a: Ablauf): Ablauf | 'ende'` → nächstes Bild; nach dem letzten Bild Durchlauf + 1 und Bild 0; nach dem letzten Bild des 3. Durchlaufs `'ende'`

- [ ] **Step 1: Failing tests:**
  - `A-HILFE-02: Schritt dauert 3,5 s, das Bild Fertig 6 s`
  - `A-HILFE-02: nach dem Bild Fertig beginnt der nächste Durchlauf bei Bild 1`
  - `A-HILFE-02: nach drei Durchläufen endet die Animation beim Bild Fertig` (von `start(5)` aus 14× `weiter` → letzter Wert `{ schritt: 4, durchlauf: 3 }`, 15. Aufruf → `'ende'`)
- [ ] **Step 2:** `npx vitest run src/lib/hilfe/ablauf.test.ts` → FAIL.
- [ ] **Step 3:** `ablauf.ts` umsetzen.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5: Commit** `feat: Takt der Anleitung mit Ende nach drei Durchläufen (#47)`.

### Task 4: Komponente Anleitung

**Files:**
- Create: `src/lib/ui/Anleitung.svelte`, `src/lib/ui/ZeichnungIphone.svelte`, `src/lib/ui/ZeichnungAndroid.svelte`

**Interfaces:**
- Consumes: Klassen aus Task 1; `start`, `weiter`, `dauerMs` aus Task 3.
- Produces: `<Anleitung geraet="iphone" | "android" />`. Rendert `.anleitung` mit Zeichnung (`aria-hidden="true"`), Taste (`type="button"`, Text «Anhalten» → «Abspielen»; nach `'ende'` «Nochmals abspielen», die wieder bei Bild 1, Durchlauf 1 beginnt), `<ol class="anleitung-schritte">` mit den Texten der Spec-Tabelle; der letzte Eintrag hat `class="anleitung-fertig"` und den Fertig-Text. Bei iPhone unter der Liste `<p class="leise">Siehst du das Teilen-Symbol schon direkt in der Leiste? Dann tipp gleich darauf.</p>`. Bei `prefers-reduced-motion: reduce` (per `matchMedia`, beim Mount gelesen): Klasse `.anleitung-ruhig`, kein Timer, keine Taste, kein `li.aktiv`. Timer mit `setTimeout` und `dauerMs`, beim Zerstören aufgeräumt. Mehrere Instanzen auf einer Seite laufen unabhängig.
- Zeichnungen: Markup wie im Mockup (`<template id="film-ios">`, `film-android`), unter den Klassen aus Task 1; Teilen- und Menü-Symbol wie `src/lib/server/brief/symbole.ts` (Baustein *Symbol*), App-Symbol `asset('favicon.svg')`.

- [ ] **Step 1:** Svelte-Doku holen (Runes `$state`, `$effect` mit Aufräumen, `$props`), Komponenten bauen.
- [ ] **Step 2:** `svelte-autofixer` auf alle drei Dateien → keine Befunde; `npm run check:svelte` → 0 Fehler.
- [ ] **Step 3: Commit** `feat: Baustein Anleitung als Svelte-Komponente (#47)`. (Geprüft wird sie im E2E von Task 6 und 7.)

### Task 5: Kontakt-Endpunkt

**Files:**
- Create: `src/routes/api/kontakt/+server.ts`, `src/routes/api/kontakt/kontakt.test.ts`

**Interfaces:**
- Produces: `GET /api/kontakt` → 200 `{ kontakt: string }` aus `leseEinstellungen().kontakt`, Kopf `cache-control: no-store`, ohne Sitzung. Fehlt die Einstellung, wirft `leseEinstellungen` → SvelteKit antwortet 500 (kein eigener Fang).

- [ ] **Step 1: Failing test** (Einheit, `vi.stubEnv` für `MYTCO_CODE_SCHLUESSEL`, `MYTCO_SMTP_URL`, `MYTCO_MAIL_ABSENDER`, `MYTCO_KONTAKT='das Sekretariat (erfunden), sekretariat@example.org'`):
  `A-HILFE-01: Kontakt für Fragen ohne Login abrufbar` → `res.status === 200`, `await res.json()` gleich `{ kontakt: 'das Sekretariat (erfunden), sekretariat@example.org' }`, `cache-control` = `no-store`.
- [ ] **Step 2:** `npx vitest run src/routes/api/kontakt/kontakt.test.ts` → FAIL.
- [ ] **Step 3:** `+server.ts` umsetzen (Muster `src/routes/api/status/+server.ts`).
- [ ] **Step 4:** → PASS; `npm run pruefungen` → `bauregel` ok.
- [ ] **Step 5: Commit** `feat: Kontakt für Fragen als öffentlicher Endpunkt (#47)`.

### Task 6: Seite Hilfe und Fusszeile

**Files:**
- Create: `src/routes/hilfe/+page.ts`, `src/routes/hilfe/+page.svelte`, `tests/e2e/hilfe.test.ts`
- Modify: `src/routes/+layout.svelte` (Fusszeile)

**Interfaces:**
- Consumes: `<Anleitung>` (Task 4), `erkenneGeraet` (Task 2), `GET /api/kontakt` (Task 5).
- Produces: `/hilfe`. `load` holt `/api/kontakt` → `{ kontakt: string | null }` (`null` bei Fehler oder Netzfehler). Seite: `<a class="zurueck" href={resolve('/')}>‹ Zurück</a>`, `<h1>Hilfe</h1>`, Aufklappbereiche (`details.karte.klappe`) mit `id` `startbildschirm-iphone`, `startbildschirm-android`, `neuer-code`, `passkey`; Reihenfolge der zwei Startbildschirm-Themen nach `erkenneGeraet` (Android zuerst nur auf Android). Texte aus Mockup Bild 5. Karte «Fragen?»: «Klappt etwas nicht? Melde dich bei {kontakt}.» bzw. «Den Kontakt findest du in deinem Brief.» Die Adresse im Text «Öffne … in Safari/Chrome» ist `location.host`.
- Fusszeile im Layout: `<footer class="inhalt leise fuss"><p><a href={resolve('/hilfe')}>Hilfe</a> · <span data-testid="version">Version {APP_VERSION}</span></p></footer>`; auf `/hilfe` trägt der Link `aria-current="page"`.

- [ ] **Step 1: Failing E2E** in `tests/e2e/hilfe.test.ts` (alle drei Projekte):
  - `A-HILFE-01: Hilfe ohne Login über die Fusszeile erreichbar` — `goto('/login')`, Link «Hilfe» → URL `/hilfe`, `h1` «Hilfe», vier Aufklappbereiche mit den Titeln aus der Spec, Karte enthält `das Sekretariat (erfunden)`; `pruefeBildschirm(page, info, 'hilfe')`; keine Konsolenfehler.
  - `A-HILFE-01: Thema fürs eigene Handy steht zuoberst` — auf `android` ist der erste Titel «Auf den Startbildschirm: Android», sonst «… iPhone».
  - `A-HILFE-01: ohne Antwort zum Kontakt verweist die Karte auf den Brief` — `page.route('**/api/kontakt', r => r.abort())` → Text «Den Kontakt findest du in deinem Brief.»
  - `A-HILFE-02: bei Bewegung reduzieren keine Animation und keine Taste` — `emulateMedia({ reducedMotion: 'reduce' })`, Thema iPhone aufklappen → `.anleitung-ruhig` sichtbar, keine Taste «Anhalten», kein `li.aktiv`.
  - `A-HILFE-02: Animation hält an und läuft weiter` — Thema aufklappen, «Anhalten» → Taste heisst «Abspielen», aktiver Schritt bleibt nach 4 s derselbe; «Abspielen» → «Anhalten».
- [ ] **Step 2:** `make e2e` (bzw. `npx playwright test tests/e2e/hilfe.test.ts`) → FAIL.
- [ ] **Step 3:** Seite und Fusszeile umsetzen; `svelte-autofixer`.
- [ ] **Step 4:** → PASS in allen drei Projekten; `startseite.test.ts` «Version sichtbar» weiterhin grün.
- [ ] **Step 5: Commit** `feat: Seite Hilfe ohne Login, Link in der Fusszeile (#47)`.

### Task 7: Einstiegsseite, Weiche und Install-Taste

**Files:**
- Create: `src/lib/hilfe/installation.svelte.ts`, `src/hooks.client.ts`, `src/routes/willkommen/+page.ts`, `src/routes/willkommen/+page.svelte`, `tests/e2e/hilfen/geraet.ts`
- Modify: `src/routes/+page.ts`, `tests/e2e/hilfe.test.ts`, `tests/e2e/startseite.test.ts:12-20`, `tests/e2e/login.test.ts:47-61,79-89`

**Interfaces:**
- Consumes: `erkenneGeraet`, `istAndererIphoneBrowser`, `laeuftVomSymbol`, `zeigeEinstieg` (Task 2); `<Anleitung>` (Task 4).
- Produces:
  - `installation.svelte.ts`: `const installation: { angebot: boolean; installiert: boolean }` (reaktiv); `beobachteInstallation(fenster: Window): void` (fängt `beforeinstallprompt` mit `preventDefault()` ab und merkt es; `appinstalled` → `installiert = true`); `installiere(): Promise<'angenommen' | 'abgelehnt' | 'nicht-moeglich'>` (ruft `prompt()` genau einmal, danach `angebot = false`).
  - `hooks.client.ts`: `init` ruft `beobachteInstallation(window)` (Doku per MCP prüfen; falls `init` fehlt: `onMount` im Layout).
  - `/` ohne Sitzung: Mail-Anfrage wartet → `/login/mail` (unverändert zuerst); sonst `zeigeEinstieg(navigator.userAgent, laeuftVomSymbol(window))` → `/willkommen`; sonst `/login`.
  - `/willkommen` `load`: ohne `zeigeEinstieg` → Redirect `/login`. Seite: `h1` «Willkommen bei MyTCO», Karte «Zuerst auf den Startbildschirm» + Satz aus der Spec; iPhone: bei `istAndererIphoneBrowser` zuerst `<p>Öffne diese Seite zuerst in Safari.</p>`, dann `<Anleitung geraet="iphone" />`; Android mit `installation.angebot`: Haupttaste «MyTCO installieren» + Leise-Text, darunter `details.karte.klappe` «Klappt nicht? Über das Menü» mit `<Anleitung geraet="android" />`; nach `'angenommen'` oder `installiert` statt der Taste der Fertig-Text; nach `'abgelehnt'` Taste weg und Aufklappbereich offen; Android ohne Angebot: `<Anleitung geraet="android" />` in der Karte. Darunter `<p class="weiter"><a href={resolve('/login')}>Ohne Startbildschirm weiter</a></p>`.
  - `tests/e2e/hilfen/geraet.ts`: `startetVomSymbol(page: Page): Promise<void>` (Init-Skript: `matchMedia('(display-mode: standalone)').matches === true`); `bietetInstallationAn(page: Page, wahl: 'accepted' | 'dismissed'): Promise<void>` (löst ein nachgebautes `beforeinstallprompt` mit `prompt()` und `userChoice` aus).

- [ ] **Step 1: Bestehende E2E anpassen.** In `startseite.test.ts` (Test «Startseite ohne Sitzung …») und `login.test.ts` (`A-LOGIN-08`, `SI-06`) vor `goto('/')` `await startetVomSymbol(page)` — der echte Weg ist der vom Symbol. Den Mail-Code-Test (~Zeile 204) **nicht** anpassen (Review Focus 1).
- [ ] **Step 2: Failing E2E** in `hilfe.test.ts`:
  - `A-HILFE-02: im Handy-Browser führt die Startseite zur Einstiegsseite, am PC zum Login` — `iphone`/`android`: `goto('/')` → `/willkommen`, `h1` «Willkommen bei MyTCO», `pruefeBildschirm(page, info, 'willkommen')`; `desktop`: → `/login`.
  - `A-HILFE-02: vom Symbol und direkt aufgerufen am PC geht es zum Login` — `startetVomSymbol` + `goto('/willkommen')` → `/login`; auf `desktop` `goto('/willkommen')` → `/login`.
  - `A-HILFE-02: mit Sitzung zeigt die Startseite auch im Handy-Browser Hoi` — Login über `/login` (Hilfe `meldeMitBriefAn`), dann `goto('/')` → `h1` «Hoi …».
  - `A-HILFE-02: iPhone zeigt die Safari-Schritte bis Fertig` (nur `iphone`) — Liste enthält «Zu Home-Bildschirm hinzufügen» und den Fertig-Text; «Ohne Startbildschirm weiter» → `/login`.
  - `A-HILFE-02: Android mit Angebot zeigt die Taste, nach Ablehnen die Anleitung über das Menü` (nur `android`) — `bietetInstallationAn(page, 'dismissed')`, Taste «MyTCO installieren» klicken → Taste weg, Aufklappbereich offen, «Installieren und Verknüpfung erstellen» sichtbar; zweiter Lauf mit `'accepted'` → Fertig-Text, keine Taste.
- [ ] **Step 3:** `make e2e` → neue Tests FAIL, angepasste grün oder FAIL nur wegen fehlender Hilfe.
- [ ] **Step 4:** Umsetzen; `svelte-autofixer`; Unit-Test für die Weiche in `src/lib/hilfe/geraet.test.ts` ist durch `zeigeEinstieg` abgedeckt, `+page.ts` nur verdrahten.
- [ ] **Step 5:** `make e2e` → alles grün in allen drei Projekten.
- [ ] **Step 6: Commit** `feat: Einstiegsseite mit Anleitung und Install-Taste (#47)`.

### Task 8: Brief nachführen

**Files:**
- Modify: `src/lib/server/brief/brief.ts:140-158`, `src/lib/server/brief/brief.test.ts:95-102`

- [ ] **Step 1: Test anpassen:** erwartet `Zu Home-Bildschirm hinzufügen` und `Installieren und Verknüpfung erstellen`; erwartet **nicht** mehr `Zum Home-Bildschirm` und `Zum Startbildschirm hinzufügen`.
- [ ] **Step 2:** `npx vitest run src/lib/server/brief/brief.test.ts` → FAIL.
- [ ] **Step 3:** iPhone Schritt 2: «Tippe auf ••• und dann auf ${SYMBOL_TEILEN} «Teilen», dann auf «Zu Home-Bildschirm hinzufügen».»; Schritt 3: «Lass «Als Web-App öffnen» an und tippe auf «Hinzufügen».». Android Schritt 2: «Tippe auf ${SYMBOL_MENUE} «Menü», dann auf «Installieren und Verknüpfung erstellen».»; Schritt 3: «Bestätige mit «Installieren».». Übrige Schritte bleiben.
- [ ] **Step 4:** → PASS; `make musterbrief` öffnen, Brief passt weiter auf eine A4-Seite (Screenshot/PDF ansehen).
- [ ] **Step 5: Commit** `fix: Kurzanleitung im Brief auf aktuelle iPhone- und Android-Beschriftungen (#47)`.

### Task 9: Doku nachführen und Gesamtprüfung

**Files:**
- Modify: `docs/anforderungen/anforderungen.md` (+ Änderungsprotokoll), `docs/testkonzept.md`, `docs/abklaerungen.md` (K-21), `docs/ci-cd-und-release.md` (`MYTCO_KONTAKT`), `docs/context-scopes.md`, `docs/versionen.md` (Unveröffentlicht)

- [ ] **Step 1:** A-HILFE-01, -02 → `umgesetzt\*` (Prüfung auf echten Geräten offen); A-HILFE-02 präzisiert (eigene Einstiegsseite, Android-Taste); Eintrag im Änderungsprotokoll mit Datum 04.11.2026 (bzw. Tag des Commits).
- [ ] **Step 2:** Testkonzept, Checkliste vor dem Release, neue Punkte: «Einstiegsseite im Handy-Browser, Anleitung stimmt mit Safari (iOS 26) überein, nach Ablegen startet MyTCO vom Symbol mit Login (A-HILFE-02)»; «Android: Taste ‹MyTCO installieren› öffnet den Dialog; Anleitung über das Menü stimmt mit Chrome überein; Samsung-Browser beobachten (A-HILFE-02)»; «Seite Hilfe ohne Login erreichbar, Kontakt stimmt (A-HILFE-01)».
- [ ] **Step 3:** K-21: Kontakt steht auch auf der öffentlichen Hilfe-Seite, darum eine Vereins-Adresse. `ci-cd-und-release.md`: `MYTCO_KONTAKT` «… steht im Brief, in der Meldung ‹Code schon benutzt› und auf der Seite Hilfe (ohne Login lesbar)». Context-Scopes: Zeile «Hilfe und Einstieg» mit `src/lib/hilfe/`, `src/lib/ui/Anleitung.svelte`, `src/lib/ui/Zeichnung*.svelte`, `src/routes/hilfe/`, `src/routes/willkommen/`, `src/routes/api/kontakt/`, `src/hooks.client.ts`, `tests/e2e/hilfe.test.ts`, `docs/ui-mockups/hilfe.html`. Versionen: Eintrag unter *Unveröffentlicht*.
- [ ] **Step 4:** `make check` → grün; `make e2e` → grün. Screenshots Einstiegsseite (iPhone, Android) und Hilfe aus `test-results`/`pruefeBildschirm` für den Bericht sichern.
- [ ] **Step 5: Commit** `docs: Anforderungen, Testkonzept und Betrieb zur Hilfe beim Start nachgeführt (#47)`.
