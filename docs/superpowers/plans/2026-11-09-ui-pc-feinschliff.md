# Feinschliff PC und Titel in der Kopfleiste — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reiter am PC mit Symbolen mittig in der Kopfleiste, Spielersuche ohne Springen, stehende Seitenleiste und klebender Titel in der Verwaltung am PC, einzeilige Tabellen mit «Ändern»-Dialog, Seitentitel, der beim Scrollen in die Kopfleiste überblendet.

**Architecture:** Zuerst kommen alle Regeln ins UI-Leitbild, danach in den Code. Den Code bauen wir in drei Schichten:
- Layout: ein Rahmen `.app-rahmen` in der App, als Raster ab `60rem`, und die Verwaltung mit eigener Kopfleiste ausserhalb der Seitenleiste.
- Ein kleiner Beobachter `kopftitel.ts`, gemeinsam für App und Verwaltung.
- Neue Bausteine der Verwaltung (`Seitenkopf`, `Zeilentasten`, `Zeilenaktionen`), die die bestehenden Listen übernehmen.

Keine neue Abhängigkeit.

**Tech Stack:** SvelteKit 2 / Svelte 5 (Runes), reines CSS mit Tokens (`src/lib/design/`), Vitest, Playwright (Projekte `iphone`, `android`, `desktop`).

**Spec:** `docs/superpowers/specs/2026-11-09-ui-pc-feinschliff-design.md`

## Global Constraints

- Vor Svelte-Code die Doku über den Svelte-MCP-Server holen; jede geänderte `.svelte`-Datei durch `svelte-autofixer`, bis er nichts mehr meldet.
- Oberfläche nur aus Tokens und Bausteinen von `docs/ui-leitbild.md`; Neues zuerst ins Leitbild (Task 1). Keine `style`-Attribute im Markup (Prüfung `design-festwerte`).
- PC-Layout ab `60rem` Breite des App-Rahmens, per `@container app (min-width: 60rem)`; der Container `.app` selbst lässt sich so nicht stylen, nur seine Nachkommen.
- Überlagerungen nur mit `<dialog>`, kein `position: fixed` ausser `.statusleiste`.
- UI-03: Tippfläche ≥ `--tippflaeche`, Fokus auf Grün in `--farbe-marke-hell`. UI-01: axe auf allen Bildschirmen (`pruefeBildschirm`).
- «Bewegung reduzieren»: keine Bewegung, Endzustand sofort.
- Testdaten erfunden; keine echten Namen.
- Dateien einzeln stagen, nie `git add -A`/`.`; Commits `feat:`/`fix:`/`docs:`/`test:`/`refactor:`.
- E2E nur über `npm run e2e -- <datei> [--project desktop]`, immer mit `run_in_background` (läuft er im Vordergrund, stirbt der Webserver nach ~3 Min.).
- Kein `EnterWorktree`; im Worktree `/Users/KN/CAS/projekte/tco-app/.claude/worktrees/ui-pc-feinschliff` mit absoluten Pfaden arbeiten.
- Texte der Oberfläche exakt: «Ändern», «Abbrechen», «Ab 2 Buchstaben.», «Keine Treffer.», «MyTCO», «Verwaltung».

## Review Focus

1. **Langer Titel** (z. B. Anlass mit 80 Zeichen) in der Kopfleiste am Handy (375 px) und am PC: einzeilig mit «…», verschiebt weder Wappen noch Reiter → Test in Task 3.
2. **Titel wechselt ohne Seitenwechsel** (`/profil/email` Schritt 1 → 2 tauscht das `<h1>`): Die Kopfleiste zeigt den neuen Titel, nicht den alten → Test in Task 3.
3. **Zurück mit gespeicherter Scrollposition:** Die Seite kommt weit unten zurück, und der Titel steht sofort in der Kopfleiste → Test in Task 3.
4. **Band «Ansicht als …» aktiv** in Verwaltung und App: Kopfleiste und klebender Titel liegen nicht unter dem Band und nicht übereinander → Test in Task 4.
5. **Zeile mit genau zwei Aktionen** (Anfragen: «Als Paar anmelden», «Löschen") bleibt mit zwei Tasten ohne «Ändern» und einzeilig → Test in Task 7.

---

### Task 1: UI-Leitbild nachführen

**Files:**
- Modify: `docs/ui-leitbild.md` (Bausteine Kopfleiste, Statusleisten-Band, Reiter, Seitenleiste, Pfad, Tabelle, Auswahlgruppe; Abschnitte «Layout und Navigation», «Bewegung und Bedienung»)

**Interfaces:**
- Produces: die Klassen- und Bausteinnamen, die alle weiteren Tasks benutzen:
  - `.app-rahmen`: Rahmen in der App, ab `60rem` ein Raster mit drei Spalten `1fr auto 1fr`. Kopfleiste über die ganze Breite, Reiter in der Mitte.
  - `.kopf-titel`: eingeblendeter Seitentitel. Sichtbar mit `data-sichtbar`, sonst durchsichtig; immer `aria-hidden="true"`.
  - `.kopf-zusatz`: «Verwaltung» in der Kopfleiste der Verwaltung. Blendet aus, solange der Titel sichtbar ist.
  - `.seitenkopf`: Pfad und `<h1>` einer Seite der Verwaltung. Klebt am PC oben.
  - `.zelle-kurz`: Zelle mit freiem Text, einzeilig und mit «…» gekürzt.
  - `.treffer`: Trefferbereich der Spielersuche mit fester Höhe.
  - Baustein «Ändern»-Dialog.

- [ ] **Step 1:** Bausteintabelle und Texte nach der Spec anpassen. Jede neue Klasse kommt in die Liste der erlaubten Klassen (Abschnitt «Welche Fläche wofür» / Klassenliste um Zeile 229). Die Regel «in der Verwaltung scrollt die Kopfleiste mit der Seitenleiste weg» entfällt, beim Statusleisten-Band ebenso. Beim Baustein Tabelle kommen dazu: die Einzeilig-Regel ab `60rem`, höchstens zwei kurze Tasten, ab drei Aktionen «Ändern», und die Ausnahme Paare.
- [ ] **Step 2:** `make docs` (oder `node scripts/pruefungen/…` laut `make help`), Erwartung: «Doku-Check ok.»
- [ ] **Step 3:** Commit `docs: UI-Leitbild für Reiter am PC, Titel in der Kopfleiste und einzeilige Tabellen`

### Task 2: Reiter am PC mittig in der Kopfleiste

**Files:**
- Modify: `src/routes/+layout.svelte` (Kopfleiste, Rollbereich und `<Reiter />` in `<div class="app-rahmen">`; das Band «Ansicht als …» bleibt ausserhalb)
- Modify: `src/lib/design/basis.css`:
  - `.app-rahmen` auf dem Handy: `display: flex; flex-direction: column; flex: 1; min-height: 0`.
  - Im PC-Block: Raster mit `grid-template-columns: 1fr auto 1fr` und `grid-template-rows: auto minmax(0, 1fr)`. `.kopf` liegt in Zeile 1 über alle Spalten, mit `display: grid; grid-template-columns: subgrid`; der Inhalt der Kopfleiste steht in Spalte 1. `.reiter` liegt in Zeile 1, Spalte 2. `.rollbereich` liegt in Zeile 2 über alle Spalten.
  - Die Regeln `.reiter a .symbol { display: none }` und die Unterstreichung entfallen.
  - Aktiver Reiter: Pille `background: var(--farbe-flaeche); color: var(--farbe-marke); border-radius: var(--radius)`, fett. Nicht aktiv: weisse Schrift; beim Hover leichte Aufhellung.
  - Die bisherigen `order`-Regeln für `.kopf`/`.reiter` entfallen.
- Test: `tests/e2e/navigation.test.ts`

**Interfaces:**
- Produces: `.app-rahmen` und eine Kopfleiste am PC mit Spalte 1 für Wappen, «MyTCO» und später `.kopf-titel` (Task 3).

- [ ] **Step 1: Failing test** `test('PC: Reiter mit Symbol mittig in der Kopfleiste, aktiver als Pille', …)`, nur Projekt `desktop` (`test.skip(testInfo.project.name !== 'desktop')`):
  - anmelden, `/profil` öffnen;
  - `nav.reiter a .symbol` ×3 sichtbar;
  - Mitte von `nav.reiter` (boundingBox) = Mitte des Fensters ±2 px;
  - Oberkante und Höhe von `nav.reiter` liegen innerhalb der boundingBox von `header.kopf`;
  - `getByRole('link', { name: 'Profil' })` hat `aria-current="page"`;
  - dessen `backgroundColor` (computed) ≠ dem von «Start»;
  - `pruefeBildschirm`.
- [ ] **Step 2:** `npm run e2e -- tests/e2e/navigation.test.ts --project desktop` (Hintergrund). Erwartung: neuer Test FAIL (Symbol versteckt).
- [ ] **Step 3:** Layout und CSS wie oben.
- [ ] **Step 4:** Ganze Datei auf allen Projekten laufen lassen: `npm run e2e -- tests/e2e/navigation.test.ts`. Erwartung: alles PASS (Handy unverändert: Reiter unten).
- [ ] **Step 5:** Commit `feat: Reiter am PC mit Symbol mittig in der Kopfleiste`

### Task 3: Seitentitel blendet in die Kopfleiste über (Mitglieder-App)

**Files:**
- Create: `src/lib/ui/kopftitel.ts`
- Modify: `src/routes/+layout.svelte` (`<span class="kopf-titel" aria-hidden="true" data-sichtbar=…>` nach «MyTCO», davor ein Trenner per CSS; Beobachter in `onMount`)
- Modify: `src/lib/design/basis.css` (`.kopf-titel`: einzeilig, `--groesse-text`, normal fett, `overflow: hidden; text-overflow: ellipsis; min-width: 0`; Übergang `opacity` und `translate` mit `--dauer-mittel`/`--kurve-standard`, unter `prefers-reduced-motion` ohne Übergang)
- Test: `tests/e2e/navigation.test.ts`

**Interfaces:**
- Produces:
  ```ts
  /**
   * Beobachtet das <h1> in `inhalt` (auch wenn es ausgetauscht wird) und meldet seinen Text,
   * solange es nicht im sichtbaren Teil von `wurzel` liegt (null = Fenster), abzüglich `oben` px
   * (Höhe einer klebenden Kopfleiste). Meldet null, sobald es wieder sichtbar ist oder fehlt.
   * Gibt eine Funktion zum Aufräumen zurück.
   */
  export function beobachteKopftitel(o: {
  	inhalt: HTMLElement;
  	wurzel: HTMLElement | null;
  	oben: () => number;
  	melde: (titel: string | null) => void;
  }): () => void;
  ```
  Ansatz: `IntersectionObserver` auf das `<h1>`, `root: wurzel`, `rootMargin: -oben px 0 0 0`, `threshold: 0`. Gemeldet wird nur, wenn das `<h1>` *oberhalb* liegt (`boundingClientRect.bottom <= rootBounds.top`), nicht unterhalb. Ein `MutationObserver` (`childList`, `subtree`, `characterData`) auf `inhalt` hängt sich an ein neues `<h1>` und meldet dessen neuen Text.
- Consumes: Task 2 (`.kopf` am PC als Raster; der Titel in Spalte 1, darf die Reiter nicht verschieben).

- [ ] **Step 1: Failing tests** (alle Projekte):
  - `test('Titel blendet beim Scrollen in die Kopfleiste über', …)`:
    - Fensterhöhe 500 (`page.setViewportSize`), `/profil`;
    - `.kopf-titel` hat kein `data-sichtbar`;
    - `.rollbereich` per `evaluate` ganz nach unten scrollen → `.kopf-titel` hat `data-sichtbar` und Text «Profil»;
    - nach oben scrollen → kein `data-sichtbar`.
  - `test('Langer Titel in der Kopfleiste bleibt einzeilig', …)`:
    - Anlass mit Titel aus 80 Zeichen (`legeOffenenAnlassAn` mit Titel), öffnen, ganz nach unten scrollen;
    - die Höhe von `header.kopf` ist dieselbe wie vor dem Scrollen;
    - am PC: die x-Position von `nav.reiter` ist unverändert;
    - `.kopf-titel` hat `scrollWidth > clientWidth` (gekürzt).
  - `test('Neuer Titel ohne Seitenwechsel', …)`:
    - `/profil/email` Schritt 1 → 2 (vorhandene Hilfen aus `profil.test.ts`), dann scrollen;
    - Text «Zwei Codes eintippen».
  - `test('Zurück an gespeicherte Stelle zeigt den Titel sofort', …)`:
    - CM-Seite mit Doppel-Kategorie, nach unten scrollen, Kategorie öffnen, «‹ <CM-Name>»;
    - `.kopf-titel` hat `data-sichtbar` mit dem Namen der CM, ohne erneut zu scrollen.
- [ ] **Step 2:** `npm run e2e -- tests/e2e/navigation.test.ts`. Erwartung: neue Tests FAIL.
- [ ] **Step 3:** `beobachteKopftitel` umsetzen. Im Layout: `inhalt` = `main.inhalt`, `wurzel` = `rollbereich`, `oben` = `() => 0` (der Rollbereich beginnt unter der Kopfleiste), `melde` setzt `$state` `kopftitel`. `data-sichtbar` gilt, wenn `kopftitel !== null`. Der Text bleibt beim Ausblenden stehen, bis die nächste Meldung kommt; so blendet er nicht leer aus.
- [ ] **Step 4:** Tests erneut, Erwartung PASS. Danach `npm run e2e -- tests/e2e/bewegung.test.ts tests/e2e/statusleiste.test.ts`, Erwartung PASS.
- [ ] **Step 5:** Commit `feat: Seitentitel blendet beim Scrollen in die Kopfleiste über`

### Task 4: Verwaltung — Kopfleiste fest, Seitenleiste stehend, Titel in der Kopfleiste (Handy)

**Files:**
- Modify: `src/routes/verwaltung/+layout.svelte`:
  - `<header class="kopf">` kommt aus `nav.seitenleiste` heraus, mit Wappen, «MyTCO», ` <span class="kopf-zusatz">Verwaltung</span>` und `.kopf-titel`.
  - Kopfleiste und Seitenleiste stecken zusammen in `<div class="verwaltung-leiste">`.
  - Beobachter aus Task 3 mit `inhalt` = `main.inhalt`, `wurzel` = `null`, `oben` = Höhe von `header.kopf`.
- Modify: `src/routes/+layout.svelte`: `statusleiste-verwaltung` entfällt, wo die Spec es verlangt; das Band gilt nun auch in der Verwaltung.
- Modify: `src/lib/design/basis.css`:
  - Handy: `.verwaltung-leiste { display: contents }`, damit `.kopf` (sticky) über die ganze Seite klebt.
  - PC: `.verwaltung-leiste { position: sticky; top: 0; align-self: start; max-height: 100dvh; overflow-y: auto }`, dunkelgrün wie die Seitenleiste.
  - `.verwaltung .kopf-titel { display: none }` am PC.
  - `.kopf[data-titel] .kopf-zusatz` blendet aus. Das Attribut setzt das Layout, solange der Titel sichtbar ist; oder ein gleichwertiger Selektor über `:has(.kopf-titel[data-sichtbar])`.
  - Die Regeln mit `.statusleiste-verwaltung` und `.ansicht-band ~ .verwaltung .kopf` anpassen.
- Test: `tests/e2e/verwaltung.test.ts`

**Interfaces:**
- Consumes: `beobachteKopftitel` (Task 3), `.kopf-titel`.
- Produces: `.verwaltung-leiste`; Seitenleiste am PC stehend.

- [ ] **Step 1: Failing tests** in `verwaltung.test.ts`:
  - `test('Handy: Kopfleiste bleibt stehen, Titel ersetzt «Verwaltung»', …)` (nur iphone/android):
    - Fensterhöhe 500, eine Seite mit langem Inhalt (Mitglieder-Detail oder Turnier);
    - nach unten scrollen (`window.scrollTo`);
    - `header.kopf` hat boundingBox y ≤ 1;
    - `.kopf-titel` hat `data-sichtbar` und den Text des `<h1>`;
    - `.kopf-zusatz` hat opacity 0 (computed);
    - nach oben scrollen → «Verwaltung» wieder sichtbar.
  - `test('PC: Seitenleiste bleibt beim Scrollen stehen', …)` (nur desktop):
    - Fenster 1280×500, scrollen;
    - `nav.seitenleiste` hat boundingBox y ≤ 1;
    - der Link «Turniere» ist weiterhin im Bild.
  - `test('Band «Ansicht als …» und feste Kopfleiste überlappen nicht', …)`:
    - MyTCO-Admin mit Ansicht (vorhandene Hilfe), scrollen;
    - die boundingBox der Kopfleiste schneidet die des Bandes nicht.
    - Gleich in der App auf `/profil`.
- [ ] **Step 2:** `npm run e2e -- tests/e2e/verwaltung.test.ts`. Erwartung: neue Tests FAIL.
- [ ] **Step 3:** Layout und CSS wie oben.
- [ ] **Step 4:** `npm run e2e -- tests/e2e/verwaltung.test.ts tests/e2e/statusleiste.test.ts tests/e2e/wappen.test.ts`. Erwartung: PASS. Ändert die Statusleiste ihr Verhalten in der Verwaltung, muss `statusleiste.test.ts` die neue Regel aus dem Leitbild prüfen, nicht die alte.
- [ ] **Step 5:** Commit `feat: Verwaltung mit fester Kopfleiste und stehender Seitenleiste`

### Task 5: Pfad und Titel kleben am PC (`Seitenkopf`)

**Files:**
- Create: `src/lib/verwaltung/Seitenkopf.svelte`
- Modify: jede Seite unter `src/routes/verwaltung/**/+page.svelte` mit `<h1>` (Liste: `grep -rn "<h1" src/routes/verwaltung`), ausser `mitglieder/[id]/auskunft` (Druckseite) und `bestaetigen` (ohne Seitenleiste, so lassen)
- Modify: `src/lib/design/basis.css`: `.seitenkopf` klebt nur am PC (`position: sticky; top: 0; z-index: 1; background: var(--farbe-hintergrund)`), mit Abstand oben wie `.inhalt`. Die Linie unten (`--rand-duenn`, `--farbe-linie`) erscheint erst, wenn der Kopf klebt; ohne JS per `animation-timeline: scroll()`, oder immer sichtbar, falls das nicht sicher geht (eigene Wahl). Im Druck nicht sticky.
- Test: `tests/e2e/cm-verwaltung.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // Seitenkopf.svelte
  type Props = {
  	/** Wie Pfad.svelte; fehlt auf obersten Seiten. */
  	pfad?: { stufen: { text: string; href: string }[]; aktuell: string };
  	children: Snippet; // das <h1> der Seite, unverändert (tabindex, bind:this bleiben auf der Seite)
  };
  ```
  Ausgabe: `<div class="seitenkopf">{#if pfad}<Pfad {...pfad} />{/if}{@render children()}</div>`.

- [ ] **Step 1: Failing test** `test('PC: Pfad und Titel der Kategorie bleiben beim Scrollen sichtbar', …)` (nur desktop), im bestehenden Ablauf mit Kategorie und Anmeldungen:
  - Fenster 1280×500, `window.scrollTo(0, document.body.scrollHeight)`;
  - `getByRole('heading', { level: 1 })` ist im Bild (`toBeInViewport()`);
  - `getByRole('navigation', { name: 'Pfad' })` ist im Bild.
- [ ] **Step 2:** `npm run e2e -- tests/e2e/cm-verwaltung.test.ts --project desktop`. Erwartung: FAIL.
- [ ] **Step 3:** `Seitenkopf` bauen und jede Seite umstellen (`<Pfad …/><h1>` → `<Seitenkopf pfad={…}><h1>…</h1></Seitenkopf>`).
- [ ] **Step 4:** `npm run e2e -- tests/e2e/cm-verwaltung.test.ts tests/e2e/turnier.test.ts tests/e2e/verwaltung.test.ts tests/e2e/navigation.test.ts`. Erwartung: PASS (`pruefePfad` unverändert grün).
- [ ] **Step 5:** Commit `feat: Pfad und Titel der Verwaltung kleben am PC`

### Task 6: Spielersuche mit fester Höhe

**Files:**
- Modify: `src/lib/verwaltung/Spielersuche.svelte`:
  - Unter dem Feld steht immer `<div class="treffer">`.
  - Inhalt je nach Zustand: «Ab 2 Buchstaben.» (leise) vor der Suche; Fehler; «Keine Treffer.»; oder die `fieldset.auswahl-gruppe`.
  - Der Hilfetext unter dem Feld zeigt nur noch `hilfe` (falls vorhanden); `aria-describedby` zeigt dann darauf.
  - «Ab 2 Buchstaben.» steht nicht doppelt.
- Modify: `src/lib/design/basis.css`:
  - `.treffer { height: <5 Treffer>; overflow-y: auto }`.
  - Höhe in `rem` aus den Tokens: 5 × Höhe einer `.auswahl` mit zwei Zeilen (Tippfläche plus zweite Zeile). Wert im Leitbild (Task 1) nachtragen.
  - Der Bereich ist per Tastatur scrollbar: Er ist eine benannte Region mit `tabindex="0"`, wenn er Treffer hat; sonst nicht.
- Test: `tests/e2e/cm-verwaltung.test.ts`

- [ ] **Step 1: Failing test** `test('Spielersuche springt nicht', …)` (alle Projekte), im Dialog «Von Hand anmelden»:
  - `h0` = Höhe des Dialogs (boundingBox) direkt nach dem Öffnen;
  - zwei Buchstaben eines Nachnamens mit Treffer tippen, warten auf den ersten Treffer → Höhe `h1`;
  - «zzq» tippen, warten auf «Keine Treffer.» → Höhe `h2`;
  - `expect(Math.abs(h1 - h0)).toBeLessThanOrEqual(1)`, ebenso für `h2`;
  - `getByText('Ab 2 Buchstaben.')` hat vor dem Tippen genau 1 Treffer.
- [ ] **Step 2:** `npm run e2e -- tests/e2e/cm-verwaltung.test.ts`. Erwartung: FAIL.
- [ ] **Step 3:** Umsetzen.
- [ ] **Step 4:** `npm run e2e -- tests/e2e/cm-verwaltung.test.ts tests/e2e/cm-doppel-verwaltung.test.ts`. Erwartung: PASS. Partner ändern benutzt dieselbe Suche.
- [ ] **Step 5:** Commit `feat: Spielersuche mit fester Höhe`

### Task 7: «Ändern»-Dialog und einzeilige Anmeldungs- und Doppelliste

**Files:**
- Create: `src/lib/verwaltung/zeilenaktionen.ts`, Test `src/lib/verwaltung/zeilenaktionen.test.ts`
- Create: `src/lib/verwaltung/Zeilentasten.svelte`, `src/lib/verwaltung/Zeilenaktionen.svelte`
- Modify: `src/lib/verwaltung/Anmeldungsliste.svelte`, `src/lib/verwaltung/DoppelListe.svelte`
- Modify: `src/lib/design/basis.css`:
  - Im PC-Block: `.tabelle th, .tabelle td { white-space: nowrap }`.
  - `.zelle-kurz { max-width: 16rem; overflow: hidden; text-overflow: ellipsis }`, auf Text-Spans auch `display: inline-block; vertical-align: bottom`.
- Modify tests: `tests/e2e/cm-verwaltung.test.ts`, `tests/e2e/cm-doppel-verwaltung.test.ts`, `tests/e2e/turnier.test.ts` (jede Stelle `zeile(…).getByRole('button', { name: 'Verschieben' | 'Klassierung' | 'Löschen' | 'Entscheiden' | 'Partner ändern' | 'Zusammenlegen' })` geht über «Ändern»). Dafür eine Hilfe `waehleAktion(page, zeile: Locator, name: string)` in `tests/e2e/hilfen/seite.ts`: Sie klickt «Ändern», wenn die Zeile diese Taste hat, sonst direkt die Taste der Aktion; im Dialog «Ändern» dann die Taste `name`.

**Interfaces:**
- Produces:
  ```ts
  // zeilenaktionen.ts
  export type Zeilenaktion = { name: string; los: () => void };
  export const AENDERN_AB = 3;
  /** Ab drei Aktionen steht in der Zeile nur «Ändern» (UI-Leitbild, Tabelle). */
  export function zeigtAendern(anzahl: number): boolean;
  ```
  ```ts
  // Zeilentasten.svelte – in der letzten Zelle einer Zeile
  type Props = { aktionen: Zeilenaktion[]; beschrieben: string; onaendern: () => void };
  // < 3: je eine .taste-neben mit aria-describedby={beschrieben}; ≥ 3: eine «Ändern».
  ```
  ```ts
  // Zeilenaktionen.svelte – einmal pro Liste
  type Props = { id: string };
  export function zeige(wahl: { name: Namensteile; text?: string | null; aktionen: Zeilenaktion[] }): void;
  // <dialog class="karte" aria-labelledby="{id}-titel">, <h2>Ändern</h2>, <p><Name form="nachname-zuerst"/></p>,
  // Text vollständig (.mehrzeilig), je Aktion .taste-neben (schliesst, dann los()), «Abbrechen».
  ```
  Bei Paaren übergibt die Doppelliste `name` des ersten Spielers. Ein zweiter Name kommt in `text`, damit der Dialog beide nennt (`nameText` aus `src/lib/name.ts`).

- [ ] **Step 1: Failing unit test** `zeilenaktionen.test.ts`: `zeigtAendern(1) === false`, `zeigtAendern(2) === false`, `zeigtAendern(3) === true`, `zeigtAendern(4) === true`.
- [ ] **Step 2:** `npx vitest run src/lib/verwaltung/zeilenaktionen.test.ts`. Erwartung: FAIL (Modul fehlt).
- [ ] **Step 3:** `zeilenaktionen.ts` umsetzen; Test PASS.
- [ ] **Step 4: Failing E2E** in `cm-verwaltung.test.ts`: `test('PC: Anmeldungen einzeilig, Aktionen über «Ändern»', …)` (nur desktop):
  - Anmeldung mit Kommentar aus 200 Zeichen (Wildcard-Antrag, vorhandener Ablauf);
  - die Zeile hat genau eine Taste «Ändern»;
  - boundingBox-Höhe der Zeile ≤ 72;
  - der Kommentar-Span hat `getClientRects().length === 1`;
  - «Ändern» → Dialog «Ändern» zeigt den vollen Kommentar und die Tasten «Entscheiden», «Verschieben», «Klassierung», «Löschen»;
  - «Klassierung» → Dialog «Klassierung korrigieren» offen, «Ändern» zu.
  
  In `cm-doppel-verwaltung.test.ts`: `test('PC: Anfrage mit zwei Tasten bleibt ohne «Ändern»', …)`:
  - Anfragezeile hat «Als Paar anmelden» und «Löschen», keine Taste «Ändern»;
  - die Zeile ist ≤ 72 hoch;
  - die Paarzeile hat «Ändern», jeder Spielername darin ist einzeilig (`getClientRects().length === 1`).
- [ ] **Step 5:** `npm run e2e -- tests/e2e/cm-verwaltung.test.ts tests/e2e/cm-doppel-verwaltung.test.ts --project desktop`. Erwartung: FAIL.
- [ ] **Step 6:** Komponenten bauen; Listen umstellen.
  - Kommentar in der Anmeldungsliste: hinter dem Namen als `<span class="leise zelle-kurz">`.
  - Suchende in der Doppelliste: Kommentar-Spalte mit `.zelle-kurz`.
  - Bestehende Dialoge und `Aktionsdialog` bleiben; `los` öffnet sie wie heute die Tasten.
  - Bestehende Tests auf `waehleAktion` umstellen.
- [ ] **Step 7:** `npm run e2e -- tests/e2e/cm-verwaltung.test.ts tests/e2e/cm-doppel-verwaltung.test.ts tests/e2e/turnier.test.ts`. Erwartung: PASS auf allen Projekten.
- [ ] **Step 8:** Commit `feat: einzeilige Anmeldungs- und Doppelliste mit «Ändern»-Dialog`

### Task 8: Übrige Tabellen der Verwaltung einzeilig

**Files:**
- Modify nach Befund: `src/lib/verwaltung/Mitteilungsverlauf.svelte`, `src/routes/verwaltung/{verlauf,einlesen,mitglieder,mitglieder/[id],anlaesse,anlaesse/[id],fairgate,turniere,turniere/[id],briefe}/+page.svelte`
- Test: der jeweils zuständige E2E (`mitteilungen`, `einlesen`, `verwaltung`, `anlass`, `briefe`, `turnier`, `mitgliedschaft`)

- [ ] **Step 1: Bestand aufnehmen.**
  - `make seed`, `make dev` im Worktree (eigene `.env` per `cp .env.example .env`).
  - Als Erika (alle Lesebereiche) jede der Seiten bei 1280 px per Playwright-Skript im Scratchpad fotografieren.
  - Notieren, welche Zeilen umbrechen: mehrere Tasten oder freier Text.
- [ ] **Step 2:** Für jede Fundstelle:
  - freier Text → `.zelle-kurz`, voller Text über `title` (nur wo es keine Detailseite gibt);
  - ≥ 3 Aktionen → `Zeilentasten` + `Zeilenaktionen` (Task 7).
  
  Passen Tests, die über Tasten der Zeile gehen, auf `waehleAktion` an.
- [ ] **Step 3:** Pro geänderter Tabelle eine Prüfung im zuständigen E2E ergänzen (nur desktop): die erste Datenzeile ≤ 72 hoch, oder bei Tabellen ohne Tasten ≤ 48.
- [ ] **Step 4:** Die betroffenen E2E-Dateien laufen lassen. Erwartung: PASS.
- [ ] **Step 5:** Commit `feat: Tabellen der Verwaltung einzeilig`. Den Bestand aus Step 1 (welche Tabelle geändert, welche schon passte) als Liste in die Commit-Nachricht.

### Task 9: Nachweis, Design System, Versionseintrag

**Files:**
- Modify: `docs/versionen.md` (unter «Unveröffentlicht» ein Eintrag, ohne Versionsnummer)
- Design System «MyTCO» (Artifact `https://claude.ai/artifact/B9WzQ6CmeP3QUq1NYAbSsi`): geänderte Bausteine nachführen (Kopfleiste, Reiter am PC, Tabelle, Spielersuche, «Ändern»-Dialog). Dabei die Fallen aus der Memory `falle_design_system_publish` beachten: erst `read` ohne `path`, Index zuletzt.

- [ ] **Step 1:** Screenshots für den Projektleiter, per Playwright-Skript im Scratchpad gegen `make dev` mit Seed, Ablage im Scratchpad:
  - vorher: `origin/dev`, Hauptordner, gleicher Seed;
  - nachher: der Branch;
  - PC 1280 px: `/profil` oben und gescrollt, Kategorie «Damen R4/R9» oben und gescrollt, Dialog «Von Hand anmelden» leer und mit Treffern, Dialog «Ändern»;
  - iPhone: `/clubmeisterschaft/[id]` gescrollt mit Titel in der Kopfleiste, Verwaltung gescrollt.
- [ ] **Step 2:** `make check` auf dem committeten Stand (Hintergrund). Erwartung: grün.
- [ ] **Step 3:** Design System nachführen (nur geänderte Dateien publizieren).
- [ ] **Step 4:** Commit `docs: Versionseintrag Feinschliff PC`
