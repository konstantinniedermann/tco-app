# Übersichtliche Navigation (#69) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zurück-Links nennen ihr Ziel, die Reiter Start · CM · Profil stehen auf allen Seiten nach dem Login, der neue Reiter CM führt zur laufenden Clubmeisterschaft, die Verwaltung zeigt einen Pfad über dem Titel.

**Architecture:** Die feste Ordnung (Seite → Bereich → Elternseite) steht als reine Funktionen in `src/lib/ui/navigation.ts`. Reiter, Layout und ein neuer Baustein `Zurueck.svelte` lesen sie über `page.route.id`, `page.params` und zwei Flags in `page.data` (`angemeldet`, `bereichsWurzel`). Die neue Seite `/clubmeisterschaft` entscheidet per reiner Funktion `cmEinstieg`, ob sie einen Hinweis, Kacheln oder (Umleitung) die einzige CM zeigt. Die Verwaltung bekommt einen Baustein `Pfad.svelte`.

**Tech Stack:** SvelteKit 2 / Svelte 5 (Runes), TypeScript, Vitest, Playwright mit axe.

**Spec:** `docs/superpowers/specs/2026-11-08-navigation-design.md`

## Global Constraints

- Vor Svelte-/SvelteKit-Code die Doku über den Svelte-MCP-Server holen, nie aus dem Gedächtnis; danach `svelte-autofixer` auf jede geänderte Komponente.
- Unter `src/routes` keine Server-Dateien ausser `+server.ts` (ADR-002); Seiten laden über `+page.ts` (läuft nur im Browser, `ssr = false`).
- Oberfläche nur aus Tokens/Bausteinen von `docs/ui-leitbild.md` — darum Task 1 (Leitbild) vor jedem UI-Code.
- Keine neuen Dependencies. Keine echten Personendaten in Tests (erfundene Namen).
- Texte exakt: «‹ Start», «‹ Profil», «‹ Anmelden», «‹ Clubmeisterschaft», «‹ <Name der CM>», «‹ Andere Adresse»; Hinweis ohne CM: Titel «Clubmeisterschaft», Text «Zurzeit läuft keine Clubmeisterschaft. Sobald die Anmeldung offen ist, steht sie hier.»
- Reiter-Text «CM», Symbol wie im Entwurf: `<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6a9 9 0 0 1 0 12.8"/><path d="M18.4 5.6a9 9 0 0 0 0 12.8"/>`.
- Dateien einzeln stagen (nie `git add -A`/`.`), Commit-Präfixe `feat:`/`docs:`/`test:`/`refactor:`, Trailer wie im Repo üblich.
- Unit-Tests: `npx vitest run --project einheit <datei>`. E2E im Hintergrund starten (`run_in_background`), eigene DB per `DATABASE_URL`, falls parallel eine andere Session E2E fährt (Skill `tco-branching`).

## Review Focus

1. **Zurück-Taste des Browsers nach Tipp auf «CM» bei genau einer CM** — darf nicht zwischen `/clubmeisterschaft` und `/clubmeisterschaft/[id]` pendeln; erwartet: einmal zurück → die Seite vor dem Tipp. (Test in Task 5.)
2. **Reiter nochmals antippen auf einer Unterseite mit ungespeicherten Änderungen** (E-Mail ändern, Doppel-Partnerwahl) — erwartet: Rückfrage, nicht stilles Verlassen. (Test in Task 7.)
3. **Sehr langer Name einer CM/Kategorie im Zurück-Link bei 200 % Schrift** — erwartet: einzeilig, mit «…», kein horizontales Scrollen. (Test in Task 4.)
4. **Hilfe/Datenschutz direkt aufgerufen, Sitzung abgelaufen** — erwartet: keine Reiter, «‹ Anmelden». (Test in Task 3.)
5. **Mehrere laufende CMs in der E2E-Datenbank** — jede E2E-DB hat viele Testturniere (Jahre 2075–2099 zählen als «laufend»); Tests für «keine» und «eine» CM dürfen nicht von der DB abhängen → `/api/cm` per `page.route` ersetzen. (Task 5.)

---

### Task 1: UI-Leitbild und Datenschutz-Texte nachführen

**Files:**
- Modify: `docs/ui-leitbild.md` (Bausteine-Tabelle Zeile «Zurück» ~176, Layout und Navigation ~237–246, Bewegung und Bedienung ~294–307)
- Modify: `docs/datenschutz.md:43,138`, `docs/datenschutzerklaerung.md:95` (Wort «‹ Zurück» → «‹ Andere Adresse» beim E-Mail-Wechsel, Inhalt unverändert)
- Modify: `docs/versionen.md` (Eintrag unter «Unveröffentlicht»)

- [ ] **Step 1:** Leitbild ändern:
  - Reiter: «Start · CM · Profil» (Satz «heute Start · Profil, *CM* kommt mit der Etappe …» streichen). Reiter stehen auf jeder Seite nach dem Login; Zuordnung Seite → Reiter als Tabelle (aus der Spec, «Feste Ordnung»). Verwaltung ohne Reiter.
  - «Unterseiten: ‹ Zurück, keine Reiter» ersetzen: Zurück-Link «‹ <Titel der Elternseite>», führt eine Stufe höher in der festen Ordnung, einzeilig, mit «…» gekürzt.
  - Neuer Abschnitt «Reiter CM» (oberste Seite `/clubmeisterschaft`: keine / eine / mehrere laufende CM, Text aus Global Constraints).
  - Baustein `.zurueck` in der Tabelle: «‹ <Ziel>» einzeilig; neuer Baustein *Pfad* (`nav.pfad`, Verwaltung: Stufen als Links, aktuelle fett ohne Link, schmal nur «‹ <Elternseite>», nicht im Druck).
  - Bewegung: Wechsel in einen anderen Bereich (z. B. Kachel CM auf Start) blendet über; Reiter stehen beim Schieben still, wenn beide Seiten sie zeigen (bisher «alte Seite und Reiter weichen um 28 %» → nur noch die Seite). Reiter nochmals antippen: auf einer Unterseite zur obersten Seite des Bereichs, auf der obersten nach oben.
  - Teil 2 als Vorgabe: höchstens zwei Stufen unter dem Reiter; Bausteine *Umschalter* (Unterreiter mit Balken, Entwurf 2b) und *Blatt von unten* (`<dialog>`), beide «noch nicht gebaut, kommt mit dem CM-Betrieb».
- [ ] **Step 2:** `make docs` → Erwartet: «Doku-Check ok.» (neue/umbenannte Anker: Links im Leitbild prüfen).
- [ ] **Step 3:** Commit `docs: UI-Leitbild für Navigation mit Reiter CM und Pfad (#69)`.

### Task 2: Feste Ordnung in `navigation.ts`

**Files:**
- Modify: `src/lib/ui/navigation.ts`
- Test: `src/lib/ui/navigation.test.ts`

**Interfaces:**
- Produces:
  - `type Bereich = '/' | '/clubmeisterschaft' | '/profil'`
  - `const REITER: readonly Bereich[] = ['/', '/clubmeisterschaft', '/profil']`
  - `bereichVon(routeId: string | null): Bereich | null`
  - `zeigtReiter(routeId: string | null, angemeldet: boolean): boolean`
  - `aktiverReiter(aktuell: string | null, ziel: string | null): Bereich | null` (neue Bedeutung)
  - `type Eltern = { route: string; text: string | null }` (`text: null` = die Seite liefert den Namen)
  - `elternVon(routeId: string | null, k: { angemeldet: boolean; bereichsWurzel: boolean }): Eltern | null`
  - `uebergang(...)` unverändert in der Signatur
  - `istReiterSeite` entfällt (Aufrufer in Task 3 umstellen)

- [ ] **Step 1: Failing tests** in `navigation.test.ts` (bestehende `istReiterSeite`-Tests ersetzen):

```ts
it.each([
	['/', '/'], ['/anlass/[id]', '/'], ['/hilfe', '/'], ['/datenschutz', '/'],
	['/clubmeisterschaft', '/clubmeisterschaft'], ['/clubmeisterschaft/[id]', '/clubmeisterschaft'],
	['/clubmeisterschaft/[id]/doppel/[kid]', '/clubmeisterschaft'],
	['/profil', '/profil'], ['/profil/email', '/profil'],
	['/login', null], ['/login/mail', null], ['/willkommen', null], ['/verwaltung/mitglieder', null], [null, null]
])('bereichVon(%s) = %s', (r, b) => expect(bereichVon(r)).toBe(b));

it('Reiter nach dem Login überall, Hilfe/Datenschutz ohne Sitzung ohne', () => {
	expect(zeigtReiter('/anlass/[id]', false)).toBe(true);
	expect(zeigtReiter('/hilfe', true)).toBe(true);
	expect(zeigtReiter('/hilfe', false)).toBe(false);
	expect(zeigtReiter('/datenschutz', false)).toBe(false);
	expect(zeigtReiter('/login', true)).toBe(false);
	expect(zeigtReiter('/verwaltung/turniere', true)).toBe(false);
});

it('der angetippte Bereich gilt sofort', () => {
	expect(aktiverReiter('/profil/email', '/')).toBe('/');
	expect(aktiverReiter('/', '/clubmeisterschaft/[id]')).toBe('/clubmeisterschaft');
	expect(aktiverReiter('/profil', '/login')).toBe('/profil');
	expect(aktiverReiter('/profil/email', null)).toBe('/profil');
});

const k = { angemeldet: true, bereichsWurzel: false };
it.each([
	['/anlass/[id]', k, { route: '/', text: 'Start' }],
	['/profil/email', k, { route: '/profil', text: 'Profil' }],
	['/clubmeisterschaft/[id]', k, { route: '/clubmeisterschaft', text: 'Clubmeisterschaft' }],
	['/clubmeisterschaft/[id]', { ...k, bereichsWurzel: true }, null],
	['/clubmeisterschaft/[id]/doppel/[kid]', k, { route: '/clubmeisterschaft/[id]', text: null }],
	['/hilfe', k, { route: '/', text: 'Start' }],
	['/hilfe', { ...k, angemeldet: false }, { route: '/login', text: 'Anmelden' }],
	['/datenschutz', { ...k, angemeldet: false }, { route: '/login', text: 'Anmelden' }],
	['/login/mail', { ...k, angemeldet: false }, { route: '/login', text: 'Anmelden' }],
	['/', k, null], ['/clubmeisterschaft', k, null], ['/profil', k, null]
])('elternVon(%s)', (r, kk, e) => expect(elternVon(r, kk)).toEqual(e));

it('Wechsel des Bereichs blendet über', () => {
	expect(uebergang('/', '/clubmeisterschaft/[id]', 'link')).toBe('blende');
	expect(uebergang('/profil', '/hilfe', 'link')).toBe('blende');
	expect(uebergang('/', '/anlass/[id]', 'link')).toBe('tiefer');
	expect(uebergang('/clubmeisterschaft/[id]', '/clubmeisterschaft/[id]/doppel/[kid]', 'link')).toBe('tiefer');
	expect(uebergang('/profil/email', '/profil', 'link')).toBe('zurueck');
	expect(uebergang('/login', '/hilfe', 'link')).toBe('tiefer');
});
```

- [ ] **Step 2:** `npx vitest run --project einheit src/lib/ui/navigation.test.ts` → FAIL (Funktionen fehlen).
- [ ] **Step 3:** Implementieren. `EBENE` um `'/clubmeisterschaft': 0` ergänzen. In `uebergang`: haben beide Seiten einen Bereich und sind sie verschieden → `'blende'` (vor dem Ebenen-Vergleich, nach der `popstate`-Regel).
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat: feste Ordnung Seite → Bereich → Elternseite (#69)`.

### Task 3: Reiter auf allen Seiten, Reiter CM, Bewegung

**Files:**
- Modify: `src/lib/ui/Reiter.svelte`, `src/routes/+layout.svelte`, `src/lib/design/basis.css` (Reiter-Regeln beim Schieben ~1530–1600)
- Modify: `src/routes/hilfe/+page.ts`, `src/routes/datenschutz/+page.ts` (liefern `angemeldet: boolean`)
- Test: `tests/e2e/navigation.test.ts` (neu), `tests/e2e/bewegung.test.ts` (Erwartungen anpassen, falls sie das Weichen der Reiter prüfen)

**Interfaces:**
- Consumes: `REITER`, `zeigtReiter`, `aktiverReiter` (Task 2)
- Produces: `page.data.angemeldet?: boolean` (nur Hilfe/Datenschutz), `page.data.bereichsWurzel?: boolean` (Task 5 setzt es); Reiter liest beide.

- [ ] **Step 1: Failing E2E** in `tests/e2e/navigation.test.ts` (Login-Hilfen aus `tests/e2e/hilfen/login.ts`, `startetVomSymbol`, `pruefeBildschirm` mit axe):
  - `Reiter stehen auf Unterseiten, der Bereich ist markiert`: angemeldet → Profil → E-Mail ändern: `nav.reiter` sichtbar, Link «Profil» hat `aria-current="page"`; Anlass-Seite → «Start» markiert.
  - `drei Reiter Start · CM · Profil`: `nav.reiter a` hat genau die Texte `['Start', 'CM', 'Profil']`.
  - `Reiter nochmals antippen führt zur obersten Seite`: auf `/profil/email` «Profil» antippen → URL `/profil`.
  - `Hilfe ohne Sitzung: keine Reiter, ‹ Anmelden`: abgemeldet `/hilfe` → `nav.reiter` count 0, Link «‹ Anmelden» → `/login`. Mit Sitzung: Reiter da, «Start» markiert.
- [ ] **Step 2:** E2E im Hintergrund (`npx playwright test tests/e2e/navigation.test.ts`) → FAIL.
- [ ] **Step 3:** Umsetzen:
  - `Reiter.svelte`: Einträge aus `REITER` (Start, CM mit Symbol aus Global Constraints, Profil). `antippen`: nur wenn die aktuelle Seite die oberste ihres Bereichs ist (`page.route.id === aktiv` oder `page.data.bereichsWurzel === true`) → `preventDefault` und nach oben scrollen; sonst normaler Link (Rückfrage bei Ungespeichertem kommt aus dem Layout).
  - Layout: `mitReiter = zeigtReiter(page.route.id, page.data.angemeldet !== false)`.
  - `hilfe/+page.ts`, `datenschutz/+page.ts`: `angemeldet = (await fetch('/api/sitzung')).ok`, bei Netzfehler `false`; bestehende Rückgaben behalten.
  - `basis.css`: Beim Schieben (`tiefer`/`zurueck`) behalten die Reiter ihren `view-transition-name` und laufen ohne Animation (wie beim Überblenden), wenn beide Seiten Reiter zeigen; dazu setzt das Layout in `onNavigate` `data-reiter-bleibt` auf `<html>`, wenn `zeigtReiter(von, true) && zeigtReiter(nach, true)`, und entfernt es mit `data-uebergang`.
- [ ] **Step 4:** E2E `navigation.test.ts` und `bewegung.test.ts` → PASS auf desktop, iphone, android.
- [ ] **Step 5:** Commit `feat: Reiter Start · CM · Profil auf allen Seiten nach dem Login (#69)`.

### Task 4: Baustein Zurück mit Ziel

**Files:**
- Create: `src/lib/ui/Zurueck.svelte`
- Modify: `src/lib/design/basis.css` (`.zurueck` ~503)
- Modify: `src/routes/anlass/[id]/+page.svelte:97,103`, `src/routes/profil/email/+page.svelte:135,137`, `src/routes/hilfe/+page.svelte:45`, `src/routes/datenschutz/+page.svelte:19`, `src/routes/login/mail/+page.svelte:78`, `src/routes/clubmeisterschaft/[id]/doppel/[kid]/+page.svelte:~250`
- Test: `tests/e2e/navigation.test.ts`; bestehende E2E, die «‹ Zurück» in der App suchen (`grep -rn "Zurück" tests/e2e`), auf die neuen Texte umstellen

**Interfaces:**
- Consumes: `elternVon` (Task 2); `page.data.angemeldet`, `page.data.bereichsWurzel`
- Produces: `<Zurueck text?: string onclick?: (e: MouseEvent) => void href?: string />` — ohne `href` aus `elternVon(page.route.id, …)` + `page.params` aufgelöst; `text` überschreibt `Eltern.text` (Pflicht, wenn dieser `null` ist); rendert nichts, wenn `elternVon` `null` liefert und kein `href` gegeben ist.

- [ ] **Step 1: Failing E2E:**
  - `Zurück nennt sein Ziel`: Anlass → «‹ Start»; E-Mail ändern → «‹ Profil», nach «Weiter» in Schritt 2 → «‹ Andere Adresse» (führt zu Schritt 1); Doppel-Seite → «‹ <Name der CM>» führt zur CM-Seite; `/login/mail` → «‹ Anmelden».
  - `langer Name bleibt einzeilig` (Review Focus 3): Testturnier mit 80 Zeichen langem Namen, Doppel-Seite bei `font-size: 200%` (wie bestehende Schriftgrössen-Tests): Höhe des Links = eine Zeile (≤ 1.6 × computed line-height), `scrollWidth <= clientWidth` des `main`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** `Zurueck.svelte` bauen (Doku über Svelte-MCP: `$app/state`, `resolve` mit Parametern); `.zurueck`: `max-width: 100%`, `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, `vertical-align: top`. Seiten umstellen; bestehende `onclick`/`data-*`-Attribute der Links (Doppel: Ungespeichert-Logik, E-Mail Schritt 2: `zuSchritt1`) bleiben erhalten.
- [ ] **Step 4:** → PASS; `svelte-autofixer` auf `Zurueck.svelte`.
- [ ] **Step 5:** Commit `feat: Zurück-Link nennt sein Ziel (#69)`.

### Task 5: Oberste Seite des Reiters CM

**Files:**
- Create: `src/lib/cm/einstieg.ts`, `src/lib/cm/einstieg.test.ts`
- Create: `src/lib/cm/CmKachel.svelte` (Kachel aus `src/routes/+page.svelte:80-91` herausgelöst; Startseite nutzt sie)
- Create: `src/routes/clubmeisterschaft/+page.ts`, `src/routes/clubmeisterschaft/+page.svelte`
- Modify: `src/routes/+page.svelte`, `src/routes/clubmeisterschaft/[id]/+page.ts`, `src/routes/clubmeisterschaft/[id]/+page.svelte:470` (Zurück über `<Zurueck />`)
- Test: `tests/e2e/navigation.test.ts`

**Interfaces:**
- Consumes: `holeCmTurniere`, Typ `CmStand` (`src/lib/cm/api.ts`); `<Zurueck />` (Task 4)
- Produces: `cmEinstieg(turniere: CmStand[]): { art: 'keine' } | { art: 'eine'; id: number } | { art: 'mehrere'; turniere: CmStand[] }`; `[id]/+page.ts` liefert zusätzlich `bereichsWurzel: boolean` (true genau dann, wenn `cmEinstieg` `{ art: 'eine', id }` mit dieser `id` ergibt; bei Fehler von `/api/cm` false).

- [ ] **Step 1: Failing unit test** `einstieg.test.ts`: `[]` → `{art:'keine'}`; ein Stand mit `id: 7` → `{art:'eine', id: 7}`; zwei → `{art:'mehrere', turniere}` in gegebener Reihenfolge.
- [ ] **Step 2:** → FAIL; **Step 3:** implementieren; **Step 4:** → PASS.
- [ ] **Step 5: Failing E2E** (Review Focus 1 und 5; `/api/cm` per `page.route` ersetzen, für «eine» mit dem Stand eines echten Testturniers, Jahr 2074 iphone / 2073 android / 2072 desktop, über `legeOffenesTurnierAn`):
  - `Reiter CM ohne laufende CM zeigt den Hinweis`: Titel «Clubmeisterschaft», Hinweistext exakt.
  - `Reiter CM mit einer CM zeigt sie direkt`: Start → «CM» → URL `/clubmeisterschaft/<id>`, Titel = Name, kein `.zurueck`; «CM» nochmals antippen bleibt auf der Seite (scrollt nach oben); `page.goBack()` → URL `/` (kein Pendeln).
  - `Reiter CM mit mehreren CMs zeigt Kacheln`: zwei Kacheln; Kachel antippen → CM-Seite mit «‹ Clubmeisterschaft».
  - `Kachel auf Start führt in den Reiter CM`: Kachel antippen → «CM» markiert.
- [ ] **Step 6:** → FAIL; **Step 7:** umsetzen: `+page.ts` wie die CM-Seite (abgemeldet → Login, Fehler → 503), `eine` → `redirect(307, resolve('/clubmeisterschaft/[id]', …))`. Vorher über Svelte-MCP klären, ob ein `redirect` aus `load` bei Client-Navigation einen eigenen Verlaufseintrag erzeugt; falls ja, stattdessen `goto(…, { replaceState: true })`.
- [ ] **Step 8:** → PASS (desktop, iphone, android, axe). **Step 9:** Commit `feat: Reiter CM mit oberster Seite der Clubmeisterschaft (#69)`.

### Task 6: Pfad in der Verwaltung

**Files:**
- Create: `src/lib/verwaltung/Pfad.svelte`
- Modify: `src/lib/design/basis.css` (Baustein `.pfad` laut Leitbild aus Task 1)
- Modify: `src/routes/verwaltung/mitglieder/[id]/+page.svelte:243`, `mitglieder/neu/+page.svelte:40`, `verlauf/+page.svelte:42`, `anlaesse/[id]/+page.svelte:95`, `anlaesse/neu/+page.svelte:38`, `turniere/[id]/+page.svelte:111`, `turniere/neu/+page.svelte:41`, `turniere/[id]/kategorien/[kid]/+page.svelte:112`, `turniere/[id]/kategorien/neu/+page.svelte:49`; `mitglieder/[id]/auskunft/+page.svelte:47` (nur Tastentext «‹ <Nachname, Vorname>»)
- Test: `tests/e2e/navigation.test.ts`; bestehende Verwaltungs-E2E, die «‹ Zurück»/«‹ <Turnier>» suchen, umstellen

**Interfaces:**
- Produces: `<Pfad stufen: { text: string; href: string }[] aktuell: string />` — rendert `<nav class="pfad nicht-drucken" aria-label="Pfad"><ol>` mit je `<li><a>` und zuletzt `<li aria-current="page"><strong>{aktuell}</strong></li>`; auf schmalem Bildschirm stattdessen nur `<a class="zurueck">‹ {letzte Stufe}</a>`.

- [ ] **Step 1: Failing E2E** (CM-Admin bzw. Mitglieder-Admin aus `hilfen/login.ts`):
  - desktop: Kategorie-Seite → `nav[aria-label="Pfad"]` Text «Turniere › <Turnier> › <Kategorie>», «Turniere» und Turnier sind Links, Kategorie ist kein Link; Mitglied-Seite «Mitglieder › <Nachname, Vorname>»; Verlauf eines Mitglieds «Mitglieder › <Name> › Änderungsverlauf»; Auskunft hat keinen Pfad, Taste «‹ <Nachname, Vorname>».
  - iphone: Kategorie-Seite zeigt «‹ <Turnier>» statt des Pfads, einzeilig.
- [ ] **Step 2:** → FAIL. **Step 3:** umsetzen; erste Stufe = Eintrag der Seitenleiste («Mitglieder», «Anlässe», «Turniere»); Namen von Mitgliedern als «Nachname, Vorname»; den Namen im Verlauf über `ladeMitglied` holen, falls die Verlaufsdaten ihn nicht enthalten. Wann der Pfad zu «‹ …» wird, entscheidet der Umsetzer (Breite der Seitenleisten-Umschaltung liegt nahe).
- [ ] **Step 4:** → PASS; `svelte-autofixer`. **Step 5:** Commit `feat: Pfad über dem Titel in der Verwaltung (#69)`.

### Task 7: Rückfrage über Reiter, Gesamtlauf, Nachweis

**Files:**
- Test: `tests/e2e/navigation.test.ts`
- Modify: `docs/versionen.md` (Eintrag vervollständigen)

- [ ] **Step 1: Failing/abdeckender E2E** (Review Focus 2): `Reiter antippen mit ungespeicherten Änderungen fragt zurück`: auf `/profil/email` Adresse eintippen, «Profil» antippen → Dialog «Nicht gespeichert – trotzdem verlassen?»; «Abbrechen» bleibt, «Verlassen» → `/profil`. Gleiches auf der Doppel-Seite mit «CM».
- [ ] **Step 2:** → PASS (die Rückfrage kommt aus dem Layout; schlägt er fehl, im Reiter `antippen` nachbessern).
- [ ] **Step 3:** `make check` im Hintergrund → grün (Lint, Svelte-Check, Einheit/DB, E2E alle Projekte).
- [ ] **Step 4:** Screenshots (iPhone, Android, Verwaltung am PC) auf frischer DB: Start, Reiter CM, CM-Seite, Doppel, E-Mail ändern, Kategorie in der Verwaltung; neben die Artboards des Entwurfs legen und Abweichungen notieren bzw. beheben.
- [ ] **Step 5:** Commit `test: Rückfrage über Reiter, Nachweis Navigation (#69)`.

### Task 8: Design System «MyTCO» nachführen

**Files:** Artifact https://claude.ai/artifact/B9WzQ6CmeP3QUq1NYAbSsi (Design System, keine Repo-Datei)

- [ ] **Step 1:** Artifact lesen (`files`-Liste, README, Komponenten zu Navigation).
- [ ] **Step 2:** Nur was #69 berührt nachführen: Reiter Start · CM · Profil, Zurück mit Ziel, Pfad (Verwaltung), Bausteine *Umschalter* und *Blatt von unten* (als «Vorgabe, noch nicht gebaut»), README-Abschnitt Navigation. `tokens.css`/`basis.css` aus dem Branch übernehmen.
- [ ] **Step 3:** Veröffentlichen; im Abschlussbericht verlinken. Der übrige Rückstand bleibt in `docs/beobachtungen.md`.
