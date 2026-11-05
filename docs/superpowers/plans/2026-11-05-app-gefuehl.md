# Ruhiges App-Gefühl (#54) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Weiche, Apple-ähnliche Seitenwechsel und App-typische Bedienung in der Mitglieder-App, mit erweitertem UI-Leitbild.

**Architecture:** Das Leitbild legt Bewegung, Dauern und Bedienung zuerst fest (UI-09, neue Tokens). Reine Entscheidungsfunktionen (welcher Übergang, welcher Reiter aktiv, wo die Fusszeile steht) liegen in `src/lib/ui/navigation.ts` und sind einzeln getestet. `+layout.svelte` verbindet sie mit SvelteKit (`onNavigate` + View Transitions API, `beforeNavigate`/`afterNavigate` für die Scrollposition). Die Bewegung selbst steht in `basis.css`, ausser das weiche Aufklappen (`src/lib/ui/klappe.ts`, Web Animations API, weil Safari Höhen auf `auto` nicht per CSS animiert).

**Tech Stack:** SvelteKit 3 / Svelte 5 (Runes), View Transitions API, Web Animations API, CSS `@starting-style`, Vitest, Playwright + axe. Keine neuen Pakete.

**Spec:** GitHub-Issue #54 (Body), abgenommenes Muster https://claude.ai/artifact/44395Xfoo5mh4HUa2Cs631

## Global Constraints

- Keine neuen Dependencies.
- Vor Svelte-/SvelteKit-Code die Doku über den Svelte-MCP-Server holen; `svelte-autofixer` auf jede geänderte `.svelte`-Datei.
- Unter `src/routes` keine neuen Server-Dateien (ADR-002).
- Erst Leitbild, dann Code; Farben und `px` nur in `tokens.css`, keine `style`-Attribute im Markup (`design-festwerte`).
- Dauern und Kurven (verbindlich, aus dem Muster): Überblenden `150ms` linear · Markierung, Aufklappen, Dialog `250ms` `cubic-bezier(0.2, 0, 0, 1)` · Schieben `350ms` `cubic-bezier(0.32, 0.72, 0, 1)` · Verschiebung der alten Seite beim Schieben `-28%`.
- Bei `prefers-reduced-motion: reduce`: kein Übergang, kein weiches Aufklappen; Wechsel sofort.
- Ohne View Transitions im Browser: Wechsel sofort wie heute, kein Fehler in der Konsole.
- Fusszeile nur auf `/willkommen`, `/login`, `/login/mail`, `/`. Reiter auf Unterseiten bleiben weg.
- Texte: Du-Form, Schweizer Schreibweise (ss), erfundene Testdaten.
- Commits: `feat:` / `fix:` / `docs:` / `test:` / `refactor:`, Dateien einzeln stagen (nie `git add -A`/`.`).

## Review Focus

1. **Login, Abmelden, erneut anmelden ohne Neuladen:** Die gemerkte Scrollposition darf nicht ins nächste Konto übergehen; nach Abmelden beginnt Start oben. → Test in Task 4.
2. **Doppeltippen auf einen Reiter während des Ladens:** Kein Hängen, kein doppelter Übergang (`startViewTransition` darf nicht in einen laufenden Übergang stolpern) → Test in Task 5 (zwei Klicks kurz hintereinander, Ziel erreicht, keine Konsolenfehler).
3. **Fehlerseite (unbekannte Adresse) aus einem Reiter heraus:** Kein Übergang mit falscher Richtung, keine Fusszeile → Tests in Task 3 und Task 5.
4. **Tastatur:** Enter/Leertaste auf der Titelzeile eines Aufklappbereichs klappt weiterhin auf und zu, auch mit weichem Aufklappen → Test in Task 7.
5. **`bind:open` auf der Einstiegsseite** (`/willkommen`, Menü-Klappe): Bindung bleibt richtig, wenn das weiche Aufklappen `open` selbst setzt → Test in Task 7.

---

### Task 1: Leitbild und Tokens

**Files:**
- Modify: `docs/ui-leitbild.md` (Code-Stellen-Tabelle; neuer Abschnitt *Bewegung* mit Token-Tabelle nach *Abstände und Formen*; Bausteine *Reiter*, *Kachel*, *Nebentaste*, *Karte* (Dialog), *Aufklappbereich*, *Fusszeile*; neuer Unterabschnitt *Bewegung und Bedienung* in *Layout und Navigation*; UI-09)
- Modify: `src/lib/design/tokens.css` (Block `/* Bewegung */`)
- Modify: `docs/ui-mockups/hilfe.html:268` (Bildschirm *Hilfe* ohne Fusszeile, Begleittext dort anpassen)

**Interfaces:**
- Produces: Tokens `--dauer-kurz: 150ms`, `--dauer-mittel: 250ms`, `--dauer-schieben: 350ms`, `--kurve-standard: cubic-bezier(0.2, 0, 0, 1)`, `--kurve-schieben: cubic-bezier(0.32, 0.72, 0, 1)` — alle späteren Tasks nutzen nur diese.

- [ ] **Step 1:** Token-Tabelle *Bewegung* ins Leitbild (Spalten Token · Wert · Verwendung wie die übrigen Tabellen): `--dauer-kurz` Überblenden beim Reiterwechsel, Gedrückt-Zustand · `--dauer-mittel` Markierung des Reiters, Aufklappbereich, Rückfrage-Dialog · `--dauer-schieben` Unterseite hinein und zurück · `--kurve-standard` alles ausser Schieben · `--kurve-schieben` Schieben (iOS-ähnlich).
- [ ] **Step 2:** `make docs` → erwartet ROT: `design-tokens` meldet die fünf Tokens als «fehlt in src/lib/design/tokens.css».
- [ ] **Step 3:** Die fünf Tokens in `tokens.css` unter `/* Bewegung */` eintragen.
- [ ] **Step 4:** UI-09 neu fassen: Bewegung nur, wo sie Orientierung gibt — Reiterwechsel (Überblenden), Unterseite hinein/zurück (Schieben), Markierung des Reiters, Aufklappbereich, Rückfrage-Dialog, Baustein Anleitung (bisheriger Text zur Anleitung bleibt wörtlich). Kopfleiste, Statusleisten-Band und Reiter stehen beim Wechsel still. Bei «Bewegung reduzieren» wechselt alles sofort. Ohne Unterstützung im Browser sofort.
- [ ] **Step 5:** Unterabschnitt *Bewegung und Bedienung* schreiben:
  - Tabelle der Übergänge: gleiche Ebene (Start ↔ Profil, Login ↔ Willkommen, Login → Start) = Überblenden; tiefer (Start/Login → Hilfe, Datenschutz, Login mit Mail-Code) = von rechts herein, alte Seite und Reiter weichen um 28 % nach links; zurück = umgekehrt; Zurück-Taste bzw. -Geste des Browsers, Verwaltung, Fehlerseite = ohne Bewegung (der Browser animiert die Geste selbst).
  - Reiter: reagieren beim Antippen sofort, Markierung gleitet; jeder Reiter merkt sich die Scrollposition, solange die App offen ist (nicht über Abmelden hinweg); aktiven Reiter antippen → nach oben.
  - Antippen: kein grauer Blitz; Gedrückt-Zustand: Reiter (Farbe `--farbe-marke`, Symbol etwas kleiner), Kachel (`--farbe-marke-zart`, leicht verkleinert), Nebentaste, Zurück, Titelzeile Aufklappbereich, Textlink (`--farbe-marke-zart`), Haupttaste wie bisher.
  - Nicht markierbar, kein Link-Menü beim langen Drücken: Kopfleiste, Reiter, Tasten, Zurück, Kachel, Titelzeile Aufklappbereich. Markierbar bleiben Fliesstext, Codes, Angaben, Tabellen.
  - Doppeltipp zoomt nicht; Zoomen mit zwei Fingern bleibt. MyTCO ist immer hell (`color-scheme: light`); die Schrift bläht sich im Querformat nicht auf.
- [ ] **Step 6:** Bausteine nachführen: *Reiter* (+ gleitende Markierung `.reiter-balken`, Gedrückt-Zustand, nicht markierbar), *Kachel* und *Nebentaste* (+ Gedrückt-Zustand), *Karte* (Rückfrage-Dialog öffnet weich), *Aufklappbereich* (öffnet/schliesst weich), *Fusszeile* (nur Willkommen, Login, Login mit Mail-Code, Startseite; nicht auf Profil, Hilfe, Datenschutz, Fehlerseite, Verwaltung). Code-Stellen-Tabelle: `src/lib/ui/navigation.ts` (Übergänge, Fusszeile, aktiver Reiter), `src/lib/ui/klappe.ts` (weiches Aufklappen), `src/lib/ui/Reiter.svelte`.
- [ ] **Step 7:** Mockup `docs/ui-mockups/hilfe.html`: Fusszeile beim Bildschirm *Hilfe* entfernen, Begleittext anpassen.
- [ ] **Step 8:** `make docs` → GRÜN. `npx playwright test tests/e2e/mockups.test.ts --project desktop` → GRÜN.
- [ ] **Step 9:** Commit `docs: Leitbild — Bewegung, Bedienung und Fusszeile (#54)` (Leitbild, tokens.css, Mockup, dieser Plan).

### Task 2: Entscheidungsfunktionen

**Files:**
- Create: `src/lib/ui/navigation.ts`
- Test: `src/lib/ui/navigation.test.ts`

**Interfaces:**
- Produces:
  - `type Uebergang = 'blende' | 'tiefer' | 'zurueck'`
  - `istReiterSeite(routeId: string | null): boolean` — `'/'`, `'/profil'`
  - `uebergang(von: string | null, nach: string | null, typ: string): Uebergang | null`
  - `aktiverReiter(aktuell: string | null, ziel: string | null): string | null` — Ziel, wenn es eine Reiter-Seite ist, sonst `aktuell`
  - `zeigtFusszeile(routeId: string | null, fehler: boolean): boolean`
  - `stellStandWiederHer(nach: string | null, typ: string): boolean` — `typ === 'link'` und Reiter-Seite
  - `vergisstStand(nach: string | null): boolean` — `'/login'`, `'/login/mail'`, `'/willkommen'`

- [ ] **Step 1: Tests schreiben** (`describe('Übergänge (UI-09)')` usw.), mit genau diesen Fällen:
  - `uebergang('/', '/profil', 'link')` → `'blende'`; `('/profil', '/', 'link')` → `'blende'`; `('/login', '/', 'goto')` → `'blende'`; `('/willkommen', '/login', 'link')` → `'blende'`
  - `('/', '/hilfe', 'link')` → `'tiefer'`; `('/login', '/datenschutz', 'link')` → `'tiefer'`; `('/login', '/login/mail', 'link')` → `'tiefer'`
  - `('/hilfe', '/', 'link')` → `'zurueck'`; `('/hilfe', '/login', 'goto')` → `'zurueck'`
  - `('/', '/hilfe', 'popstate')` → `null`; `('/', '/', 'link')` → `null`; `('/profil', '/verwaltung', 'link')` → `null`; `('/', null, 'link')` → `null`; `(null, '/', 'goto')` → `null`
  - `aktiverReiter('/', '/profil')` → `'/profil'`; `('/', '/hilfe')` → `'/'`; `('/profil', null)` → `'/profil'`
  - `zeigtFusszeile`: `'/'`, `'/login'`, `'/login/mail'`, `'/willkommen'` → `true`; `'/profil'`, `'/hilfe'`, `'/datenschutz'`, `'/verwaltung/mitglieder'`, `null` → `false`; `('/', true)` → `false`
  - `stellStandWiederHer('/', 'link')` → `true`; `('/profil', 'popstate')` → `false`; `('/hilfe', 'link')` → `false`
  - `vergisstStand('/login')` → `true`; `('/')` → `false`
- [ ] **Step 2:** `npx vitest run --project einheit src/lib/ui/navigation.test.ts` → FAIL (Modul fehlt).
- [ ] **Step 3:** Implementieren. `uebergang`: Ebenen `'/'`, `'/profil'`, `'/login'`, `'/willkommen'` = 0; `'/hilfe'`, `'/datenschutz'`, `'/login/mail'` = 1; `popstate`, gleiche Route oder unbekannte Route → `null`; sonst Vergleich der Ebenen. Kommentar mit Verweis auf UI-09.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat: Entscheidungen für Übergänge, Reiter und Fusszeile (#54)`.

### Task 3: Fusszeile nur, wo sie hilft

**Files:**
- Modify: `src/routes/+layout.svelte` (Fusszeile nur wenn `zeigtFusszeile(page.route.id, page.error !== null)`; `aria-current` an den Fusszeilen-Links entfällt, weil die Fusszeile auf Hilfe und Datenschutz nicht mehr steht)
- Modify: `tests/e2e/hilfe.test.ts:28-39`, `tests/e2e/datenschutz.test.ts:16-18` (Prüfung `aria-current` der Fusszeile ersetzen durch: auf der Seite gibt es keine `contentinfo`)
- Create: `tests/e2e/bewegung.test.ts`

**Interfaces:**
- Consumes: `zeigtFusszeile` (Task 2)
- Produces in `tests/e2e/bewegung.test.ts` die Hilfe `meldeAn(page: Page, vorname: string): Promise<void>` (Brief-Code wie `meldeMitBriefAn` in `tests/e2e/login.test.ts`, inkl. `startetVomSymbol`), die Tasks 4–7 weiterverwenden; `test.afterAll(schliesseLoginHilfen)`.

- [ ] **Step 1: Test** `'Fusszeile nur vor dem Login und auf der Startseite'`: ohne Sitzung `/login`, `/login/mail` → `getByRole('contentinfo')` sichtbar mit Link «Hilfe» und «Datenschutz»; `/hilfe`, `/datenschutz`, `/gibt-es-nicht` → `contentinfo` Anzahl 0. Mit Sitzung (`meldeAn`) `/` → sichtbar, Version sichtbar; Reiter «Profil» → `contentinfo` Anzahl 0. Bei `iphone`/`android` zusätzlich `/willkommen` ohne `startetVomSymbol` → sichtbar.
- [ ] **Step 2:** `npx playwright test tests/e2e/bewegung.test.ts` (über `make e2e`-Port-Logik oder mit gesetztem `E2E_PORT`) → FAIL bei `/profil`, `/hilfe`, `/datenschutz`.
- [ ] **Step 3:** Layout umsetzen; die beiden bestehenden Tests anpassen.
- [ ] **Step 4:** `make e2e` für `bewegung`, `hilfe`, `datenschutz`, `startseite` → PASS auf allen drei Projekten.
- [ ] **Step 5:** Commit `feat: Fusszeile nur vor dem Login und auf der Startseite (#54)`.

### Task 4: Reiter reagieren sofort, merken sich den Stand

**Files:**
- Modify: `src/lib/ui/Reiter.svelte` (aktiver Reiter = `aktiverReiter(page.route.id, navigating.to?.route.id ?? null)`; `data-aktiv` = Index des aktiven Reiters, `data-anzahl` = Anzahl Reiter am `<nav>`; Element `<span class="reiter-balken" aria-hidden="true">`; Klick auf den aktiven Reiter: `preventDefault`, `window.scrollTo({ top: 0, behavior })` mit `'auto'` bei reduzierter Bewegung, sonst `'smooth'`; `data-sveltekit-preload-code="eager"` am `<nav>`)
- Modify: `src/routes/+layout.svelte` (`Map<string, number>` der Scrollpositionen; `beforeNavigate`: von Reiter-Seite → `scrollY` merken, `vergisstStand(nach)` → Map leeren; `afterNavigate`: `stellStandWiederHer(...)` und Eintrag vorhanden → `disableScrollHandling()`, `scrollTo(0, wert)`)
- Modify: `src/lib/design/basis.css` (`.reiter` `position` für den Balken; `.reiter-balken`: oben, Höhe `--rand-akzent`, Breite `100% / data-anzahl`, `transform: translateX(data-aktiv × 100%)` über Attribut-Regeln für Anzahl 2–4 und Index 0–3, `transition: transform var(--dauer-mittel) var(--kurve-standard)`; bisherige `box-shadow` am aktiven Reiter auf dem Handy entfernen; ab `60rem` Balken ausgeblendet, PC-Stil wie heute)
- Test: `tests/e2e/bewegung.test.ts`

**Interfaces:**
- Consumes: `aktiverReiter`, `istReiterSeite`, `stellStandWiederHer`, `vergisstStand` (Task 2), `meldeAn` (Task 3)

- [ ] **Step 1: Tests**
  - `'Reiter ist beim Antippen sofort aktiv, auch wenn der Server langsam antwortet'`: `meldeAn`; `page.route('**/api/sitzung', …)` hält jede Antwort 2 s zurück; Klick auf Reiter «Profil»; `expect(profilLink).toHaveAttribute('aria-current', 'page', { timeout: 500 })` während `expect(page).toHaveURL(/\/$/)`; danach `toHaveURL(/\/profil$/)`.
  - `'Jeder Reiter merkt sich die Scrollposition; aktiver Reiter führt nach oben'`: `meldeAn`; `main` per `evaluate` auf `min-height: 300vh` (bleibt über Navigationen, weil es im Layout liegt); `scrollTo(0, 400)`; Profil → `scrollY` 0; `scrollTo(0, 200)`; Start → `scrollY` 400 (`toPass`/Poll); Start nochmals → `scrollY` wird 0 (Poll).
  - `'Nach Abmelden und neuem Login beginnt Start oben'` (Review Focus 1): Start auf 400 scrollen, Profil, Abmelden, erneut `meldeAn` im selben Tab → `scrollY` 0.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Umsetzen (Svelte-Doku über MCP, `svelte-autofixer`).
- [ ] **Step 4:** Tests → PASS auf allen drei Projekten; `pruefeBildschirm(page, info, 'reiter-profil')` im ersten Test → axe ohne Befund.
- [ ] **Step 5:** Commit `feat: Reiter reagieren sofort und merken sich die Scrollposition (#54)`.

### Task 5: Übergänge mit View Transitions

**Files:**
- Modify: `src/routes/+layout.svelte` (`onNavigate`: ohne `document.startViewTransition`, bei reduzierter Bewegung oder `uebergang(...) === null` nichts tun; sonst `document.documentElement.dataset.uebergang = art`, `startViewTransition(async () => { resolve(); await navigation.complete; })` — Callback-Form, nicht die Objekt-Form, weil Safari vor 18.2 keine `types` kennt; nach `finished` das Attribut entfernen; läuft schon ein Übergang, diesen mit `skipTransition()` beenden)
- Modify: `src/lib/design/basis.css` (`view-transition-name`: `kopf` an `.kopf`, `statusleiste` an `.statusleiste`, `reiter` an `.reiter`; Gruppen `kopf`/`statusleiste` ohne Animation; `html[data-uebergang='blende']`: `root` alt/neu Überblenden `--dauer-kurz` linear, `reiter`: alt ausgeblendet, neu ohne Animation (die Markierung gleitet live); `tiefer`: neu `root` von `translateX(100%)`, alt `root` und alt `reiter` nach `translateX(-28%)` mit leichter Abdunkelung, `--dauer-schieben` `--kurve-schieben`; `zurueck`: umgekehrt, neue `reiter` kommt von `-28%`; `@media (prefers-reduced-motion: reduce)`: alle `::view-transition-*` ohne Animation)
- Test: `tests/e2e/bewegung.test.ts`

**Interfaces:**
- Consumes: `uebergang` (Task 2), `meldeAn` (Task 3)

- [ ] **Step 1: Tests** — `addInitScript` umhüllt `document.startViewTransition` (falls vorhanden) und schreibt bei jedem Aufruf `document.documentElement.dataset.uebergang` in `window.__uebergaenge`; `unterstuetzt = 'startViewTransition' in document`.
  - `'Übergänge: Reiter blenden, Unterseiten schieben (UI-09)'`: `meldeAn`; Profil, Start, Fusszeile «Hilfe», «‹ Zurück» → `__uebergaenge` gleich `unterstuetzt ? ['blende', 'blende', 'tiefer', 'zurueck'] : []`; Konsolenfehler `[]`.
  - `'Bewegung reduzieren: kein Übergang (UI-09)'`: `page.emulateMedia({ reducedMotion: 'reduce' })`; Profil, Start → `[]`.
  - `'Zwei schnelle Reiter-Klicks hintereinander'` (Review Focus 2): Profil und sofort Start → URL `/`, Start aktiv, Konsolenfehler `[]`.
  - `'Unbekannte Adresse aus einem Reiter: Fehlerseite ohne Fusszeile, kein Fehler'` (Review Focus 3): `page.goto('/gibt-es-nicht')` nach `meldeAn` → Überschrift der Fehlerseite, `contentinfo` 0, Konsolenfehler nur die erwartete 404.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Umsetzen.
- [ ] **Step 4:** Tests → PASS auf allen drei Projekten.
- [ ] **Step 5:** Commit `feat: weiche Übergänge zwischen Reitern und Unterseiten (#54)`.

### Task 6: Tipp-Gefühl und Bedienelemente

**Files:**
- Modify: `src/lib/design/basis.css` (`html`: `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`, `-webkit-text-size-adjust: 100%`, `text-size-adjust: 100%`; `:root { color-scheme: light }`; `user-select: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none` an `.kopf`, `.reiter`, `.taste-haupt`, `.taste-neben`, `.zurueck`, `.kachel`, `.klappe > summary`; `:active`-Zustände wie im Leitbild mit `transition` `--dauer-kurz` `--kurve-standard`)
- Test: `tests/e2e/bewegung.test.ts`

- [ ] **Step 1: Test** `'Bedienelemente wie in einer App, Text bleibt markierbar'`: `meldeAn`; berechnete Stile: Reiter-Link `user-select` `none`; `h1` nicht `none`; `html` `touch-action` `manipulation`, `color-scheme` `light`; `-webkit-tap-highlight-color` von `html` ist `rgba(0, 0, 0, 0)` (nur wo der Browser die Eigenschaft kennt; Wert per `getPropertyValue`, leer = nicht unterstützt → keine Erwartung).
- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** CSS umsetzen.
- [ ] **Step 4:** Test → PASS; `make check-schnell` grün (`design-festwerte`).
- [ ] **Step 5:** Commit `feat: Tipp-Gefühl und Bedienelemente wie in einer App (#54)`.

### Task 7: Weiches Öffnen von Aufklappbereich und Dialog

**Files:**
- Create: `src/lib/ui/klappe.ts`
- Modify: `src/routes/+layout.svelte` (ein `click`-Listener auf `document` für `details.klappe > summary`, eingerichtet in `onMount`, beim Abbau entfernt)
- Modify: `src/lib/design/basis.css` (`dialog.karte` und `::backdrop`: Einblenden mit `@starting-style` von `opacity: 0` und `scale(0.94)`, `transition` `--dauer-mittel` `--kurve-standard` inkl. `display`/`overlay` `allow-discrete`; Schliessen `--dauer-kurz`; bei reduzierter Bewegung ohne)
- Test: `tests/e2e/bewegung.test.ts`

**Interfaces:**
- Produces: `klappeWeich(ereignis: MouseEvent): void` — ist das Ziel die `summary` eines `details.klappe` und Bewegung erlaubt: `preventDefault`, Höhe des `details` von geschlossen auf offen (bzw. umgekehrt) mit `element.animate` animieren, Dauer und Kurve aus `--dauer-mittel` / `--kurve-standard` (per `getComputedStyle(document.documentElement)`), beim Schliessen `open = false` erst am Ende; während der Animation `overflow: hidden` über eine Klasse `.klappe-bewegt` in `basis.css` (kein `style`-Attribut im Markup); ein zweiter Klick während der Animation kehrt sie um (laufende Animation abbrechen, von der aktuellen Höhe aus neu). Bei reduzierter Bewegung nichts tun (Browser klappt sofort).

- [ ] **Step 1: Tests** (auf `/hilfe` ohne Login)
  - `'Aufklappbereich öffnet und schliesst weich (UI-09)'`: in einem `evaluate` `summary.click()` und direkt danach `details.getAnimations().length` zurückgeben → `> 0`; danach `details` hat `open`; zweiter Klick → nach Ende kein `open`.
  - `'Aufklappbereich bei «Bewegung reduzieren» sofort'`: `reducedMotion: 'reduce'` → Anzahl Animationen `0`, `open` sofort gesetzt.
  - `'Aufklappbereich mit der Tastatur'` (Review Focus 4): Titelzeile fokussieren, `Enter` → offen; `Space` → zu.
  - `'Menü auf der Einstiegsseite bleibt richtig gebunden'` (Review Focus 5, nur `iphone`/`android` per `info.project.name`, sonst Rückkehr ohne Prüfung — kein `test.skip`): `/willkommen` → Menü-Klappe öffnen und schliessen; der davon abhängige Inhalt erscheint bzw. verschwindet wie heute.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Umsetzen.
- [ ] **Step 4:** Tests → PASS auf allen drei Projekten; bestehende `hilfe.test.ts` und `verwaltung.test.ts` → PASS.
- [ ] **Step 5:** Commit `feat: Aufklappbereich und Rückfrage öffnen weich (#54)`.

### Task 8: Abschluss und Nachweis

**Files:**
- Modify: `docs/versionen.md` (Abschnitt «Unveröffentlicht»: weiche Seitenwechsel, Reiter, Bedienung, Fusszeile, #54)

- [ ] **Step 1:** Eintrag in `docs/versionen.md`.
- [ ] **Step 2:** `make check` → grün (Docker Desktop nötig).
- [ ] **Step 3:** Screenshots aus den E2E-Läufen (iphone) neben das Muster legen; Bildvergleich im Bericht.
- [ ] **Step 4:** Nutzer prüft am echten iPhone über `make dev-handy` (Login per Code): Reiterwechsel, Hilfe, Aufklappen; Aufnahme vorher/nachher als Nachweis (DoD).
- [ ] **Step 5:** Commit `docs: Versionshinweis zu weichen Seitenwechseln (#54)`.
