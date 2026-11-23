# Sortieren, Filtern und Spaltenbreite in Tabellen der Verwaltung — Umsetzungsplan (#92)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mitglieder, Briefe und Änderungsverlauf der Verwaltung lassen sich am PC im Spaltentitel sortieren und filtern, und die Spaltenbreite lässt sich ziehen; auf dem Handy bleibt alles wie heute.

**Architecture:** Ein reines Modul rechnet Sortieren, Filtern, Adresse und Breiten (`tabelle.ts`), ein Gedächtnis im Arbeitsspeicher hält den Stand je Tabelle für die Rückkehr zur Liste, zwei Svelte-Bausteine zeichnen Spaltentitel und Kopfzeile. Mitglieder und Briefe filtern im Browser; der Verlauf schickt die Filter an den Server, der die neuesten 100 Treffer liefert.

**Tech Stack:** SvelteKit 3 / Svelte 5 (Runen), TypeScript, Drizzle/Postgres, Vitest (`einheit`, `datenbank`), Playwright (`make e2e`).

**Spec:** `docs/superpowers/specs/2026-11-23-tabellen-sortieren-filtern-design.md` (Entwurf: https://claude.ai/artifact/DEFgwhFuiWMwGmVhyjJMyt, Variante A)

## Global Constraints

- Vor jedem Svelte-/SvelteKit-Code die Doku über den Svelte-MCP holen; Bausteine mit `svelte-autofixer` prüfen.
- Keine neue Abhängigkeit.
- Stile nur unter `src/lib/design/` (neue Regeln: Tabelle in `verwaltung.css`, alles nur ab `60rem` in `pc-layout.css`); kein `<style>`, keine Festwerte (`make check` → `design-festwerte`: keine px, keine Farbfunktionen, keine Hex-Werte ausserhalb `tokens.css`). Einziger Inline-Wert: die Custom Property `--breite` am `<col>` (`style:--breite`), gelesen nur in `pc-layout.css`.
- Seiten sprechen mit dem Server nur über `src/lib/verwaltung/mitglieder-api.ts`; erstes Laden in `+page.ts`, erneutes Laden nur im Baustein nach Eingabe.
- Route ruft genau eine Schnittstellen-Funktion; Fehlerantworten nur `{ fehler: 'eingabe' }` über `eingabeFehler()`.
- Adresse der Seite: nur Sortierung, Häkchen- und Zahlen-Filter; **nie** Text aus Name, E-Mail, Nummer, Wer, Mitglied oder Suche. Gerätespeicher: nur Breiten.
- Adresse ändern ohne Neuladen: in SvelteKit 3 `goto(url, { shallow: true, replace: true })` (Shallow Routing; `replaceState` ist veraltet, weitere Optionen per MCP prüfen). Bei Shallow Routing beschreibt `page.url` die gerenderte Seite, die sichtbare Adresse steht in `page.shallow?.url`.
- Texte Du-Form, Schweizer Schreibweise; Wörter aus dem Entwurf: «<Spalte> filtern», «<Spalte> zeigen», «Alle zeigen», «Schliessen», «Filter zurücksetzen», «Breiten zurücksetzen», «N von M Mitgliedern», «Konto: Brief offen, ohne Brief», «Filter <Spalte> entfernen».
- E2E nur über `make e2e`, im Hintergrund starten; neue PC-Tests mit `test.skip(info.project.name !== 'desktop', 'nur PC')`; Verwaltung über `bestaetigeVerwaltungDirekt`, kein Mail-Code; Elemente über Rolle und Beschriftung.
- Testdaten erfunden; Tests auf der gemeinsamen E2E-Datenbank filtern auf eigene Zeilen (eindeutiger Nachname).
- Nie zwei Prüfläufe gleichzeitig im Worktree.

## Review Focus

- Unbekannte oder kaputte Werte in der Adresse (`?sort=xyz`, `jahrgang=abc`, `konto=foo`) werden still ignoriert, die Seite lädt normal → Test in Task 2.
- Ein Filter, der keine Zeile übrig lässt: Liste leer, Anzahl «0 von 412 Mitgliedern», Hinweis bleibt, «Filter zurücksetzen» bringt alles zurück → Test in Task 4.
- Leere Werte (ohne E-Mail, ohne Nummer, ohne Jahrgang) stehen beim Sortieren immer zuletzt, in beide Richtungen → Test in Task 2.
- Gespeicherte Breite ausserhalb Min/Max, kaputtes JSON oder werfender Speicher → Standardbreite, kein Fehler → Test in Task 2.
- 200 % Schrift am PC: Spaltentitel, Trichter und Griff bleiben bedienbar, die Box scrollt, die Seite nicht → Test in Task 4.

---

### Task 1: Leitbild — Baustein «Tabellen-Steuerung» und Änderung am Baustein «Tabelle»

**Files:**
- Modify: `docs/ui-leitbild.md` (Tabelle der Bausteine bei *Tabelle*, *Seitenkopf*; Abschnitt Verwaltung; Regel zu Überlagerungen)
- Modify: `docs/superpowers/specs/2026-11-23-tabellen-sortieren-filtern-design.md` (nur falls eine Entscheidung unten den Entwurf ändert: Satz dazu)

Entscheide, die das Leitbild festhält (sie weichen bewusst vom Entwurf ab, wo der Entwurf gegen Regeln verstiess):

- [ ] **Step 1: Baustein *Tabellen-Steuerung* (`.tabelle-steuerung`) beschreiben**, nur ab `60rem`, mit diesen Werten:
  - Box: eigener Scrollbereich in beide Richtungen, `max-height: calc(100dvh - var(--hoehe-seitenkopf, 0rem) - var(--abstand-6))`; die Seite scrollt, bis die Box unter dem Seitenkopf liegt, dann scrollt die Box. Was über der Tabelle steht (Seiteninfo aus #93, Leiste), zählt nicht in die Höhe.
  - Spaltentitel kleben oben in der Box (`top: 0`), nicht mehr unter dem Seitenkopf.
  - Spaltentitel = Sortiertaste (Titeltext + Pfeil: sortiert in `--farbe-marke` mit ↑/↓, sonst leises ↕ in `--farbe-text-leise`), Trichter-Knopf (`aria-label="<Spalte> filtern"`, `aria-expanded`; Filter aktiv: Fläche `--farbe-marke`, Symbol gefüllt in `--farbe-flaeche`), Ziehgriff (`role="separator"`, `aria-orientation="vertical"`, `aria-valuenow/min/max` in rem, Pfeil links/rechts = 0,5 rem; Strich `--rand-dick` in `--farbe-linie`, beim Zeigen und Ziehen `--farbe-marke`). Sortiertaste und Trichter mindestens `--tippflaeche` hoch, Trichter quadratisch `--tippflaeche` (kein 2rem-Knopf wie im Entwurf).
  - Aufklapper: Element mit `popover` (oberste Ebene, Esc und Klick daneben schliessen, Fokus zurück zum Trichter), unter dem Titel verankert; Karte mit `--schatten-karte` (kein zweiter Schatten), Titel «<Spalte> zeigen», Häkchen als Auswahlflächen (`.auswahl`), von–bis oder Textfeld in `.feld` mit normaler Feldschrift; jede Wahl wirkt sofort; Fuss «Alle zeigen» (Textlink) · «Schliessen» (Nebentaste); mehr als 8 Werte zweispaltig. Ergänzt die Regel «Überlagerungen nur mit `<dialog>`» um «oder `popover` für den Aufklapper».
  - Kopfzeile über der Tabelle: Anzahl (`role="status"`), je aktiver Filter ein Wort «<Spalte>: <Werte>» mit Taste × («Filter <Spalte> entfernen»), rechts «Filter zurücksetzen» (nur bei aktivem Filter) und «Breiten zurücksetzen» als Textlinks.
  - Klebende Spalten: Aktionsspalte rechts, Häkchen-Spalte links, getrennt durch eine Linie `--rand-duenn` `--farbe-linie` (kein Schatten).
  - Breiten: je Spalte Start/Min/Max in rem, gezogen bis Max, darüber hinaus nicht; die Tabelle darf breiter werden als ihr Platz und scrollt dann in der Box.
  - Unter `60rem`: nur der Titeltext, kein Pfeil, kein Trichter, kein Griff, keine Breiten.
- [ ] **Step 2: Baustein *Tabelle* anpassen:** Die Regel «die Seite scrollt ab 60rem nie zur Seite / lange Listen sind kein eigener Scrollbereich» gilt nur noch für Tabellen ohne Steuerung; `.tabelle-lang` mit Steuerung folgt *Tabellen-Steuerung*. Liste der Tabellen mit Steuerung: Mitglieder, Briefe, Änderungsverlauf.
- [ ] **Step 3: Prüfen:** `make check-schnell` (bzw. `node scripts/pruefungen/design-festwerte.ts` und Doku-Check) grün.
- [ ] **Step 4: Commit** `docs: Baustein Tabellen-Steuerung im UI-Leitbild (#92)`

### Task 2: Reines Modul `tabelle.ts` (Sortieren, Filtern, Adresse, Breiten) und Gedächtnis

**Files:**
- Create: `src/lib/verwaltung/tabelle.ts`, `src/lib/verwaltung/tabelle.test.ts`
- Create: `src/lib/verwaltung/tabellen-gedaechtnis.ts` (Map im Arbeitsspeicher)

**Interfaces (Produces):**

```ts
export type Richtung = 'auf' | 'ab';
export type Sortierung = { spalte: string; richtung: Richtung } | null;
export type FilterArt =
	| { art: 'text' }
	| { art: 'bereich'; zahl: 'ganz' | 'datum' }           // Jahrgang ganz, Zeit ISO-Tag
	| { art: 'werte'; werte: readonly { wert: string; text: string }[] };
export type FilterWert =
	| { art: 'text'; text: string }
	| { art: 'bereich'; von: string | null; bis: string | null }
	| { art: 'werte'; werte: readonly string[] };
export type Filter = Readonly<Record<string, FilterWert>>;
export type Spalte<Z> = {
	schluessel: string;               // auch Name in der Adresse
	titel: string;
	sortwert?: (z: Z) => string | number | null;   // fehlt = nicht sortierbar
	filter?: FilterArt;
	filterwert?: (z: Z) => string | number | readonly string[] | null; // Text, Zahl/ISO oder Werte
	breite: { start: number; min: number; max: number };            // rem
};
export function sortiere<Z>(zeilen: readonly Z[], spalten: readonly Spalte<Z>[], s: Sortierung): Z[];
export function filtere<Z>(zeilen: readonly Z[], spalten: readonly Spalte<Z>[], f: Filter): Z[];
export function naechsteSortierung(s: Sortierung, spalte: string): Sortierung; // keine/andere→auf, auf→ab, ab→auf
export function ausAdresse<Z>(q: URLSearchParams, spalten: readonly Spalte<Z>[]): { sortierung: Sortierung; filter: Filter };
export function inAdresse<Z>(q: URLSearchParams, spalten: readonly Spalte<Z>[], s: Sortierung, f: Filter): URLSearchParams;
export function hatTabellenwerte<Z>(q: URLSearchParams, spalten: readonly Spalte<Z>[]): boolean;
export function klemme(rem: number, b: Spalte<unknown>['breite']): number;
export function ladeBreiten(tabelle: string, spalten: readonly Spalte<unknown>[]): Record<string, number>;
export function speichereBreiten(tabelle: string, breiten: Record<string, number>): void;
// tabellen-gedaechtnis.ts
export type Stand = { sortierung: Sortierung; filter: Filter; suche?: string };
export function merke(tabelle: string, stand: Stand): void;
export function erinnere(tabelle: string): Stand | undefined;
```

Adressformat: `sort=<schluessel>`, `richtung=ab` (fehlt = auf); Werte `<schluessel>=a,b`; Bereich `<schluessel>=von..bis` (eine Seite darf leer sein: `2008..`). `inAdresse` lässt alle anderen Parameter (z. B. `mitglied`) stehen, entfernt eigene leere und schreibt **nie** `art: 'text'`. Breiten im Gerätespeicher unter `mytco.breiten.<tabelle>`, jeder Zugriff in `try/catch`.

- [ ] **Step 1: Failing tests** in `tabelle.test.ts`:
  - `sortiert nach de-CH, Zahlen als Zahl, leere Werte zuletzt in beide Richtungen` — Namen `['Zürcher', 'Ammann', 'Äbi', null]` auf → `Äbi, Ammann, Zürcher, null`; ab → `Zürcher, Ammann, Äbi, null`; Nummern `'1047','988'` als Zahl → `988` vor `1047`.
  - `sortiere(null)` lässt die Reihenfolge des Servers.
  - `filtert Text enthält ohne Gross/Klein, Bereich inklusiv, Werte mit Schnittmenge` — `'kel'` trifft «Keller, Thomas»; Jahrgang `2008..2014` trifft 2008 und 2014, nicht 2015; Bereich mit leerem Wert trifft nie; Rollen `['cm']` trifft Zeile mit `['mitglied','cm']`; mehrere Filter = und.
  - `naechsteSortierung` keine→auf→ab→auf, andere Spalte → auf.
  - `Adresse hin und zurück ohne Text` — `inAdresse` mit Text-, Werte- und Bereichsfilter ergibt `konto=brief-offen,ohne-brief&jahrgang=2008..2014&sort=jahrgang`, kein `name=`; `ausAdresse` liest es zurück; fremder Parameter `mitglied=5` bleibt.
  - `kaputte Adresse wird ignoriert` — `sort=xyz`, `konto=foo`, `jahrgang=abc..` → keine Sortierung, kein Filter für unbekannte Werte, `jahrgang` nur mit gültigen Teilen.
  - `Breiten: klemmen, kaputter Speicher und Ausnahme ergeben Start` — `localStorage` per `vi.stubGlobal` mit `'{kaputt'`, mit `{ name: 99 }` (über Max) und mit werfendem `getItem` → `ladeBreiten` liefert Start bzw. Max.
  - `Gedächtnis gibt den letzten Stand je Tabelle zurück`.
- [ ] **Step 2: Run** `npx vitest run --project einheit src/lib/verwaltung/tabelle.test.ts` → FAIL (Modul fehlt).
- [ ] **Step 3: Implement** beide Dateien nach den Interfaces (`Intl.Collator('de-CH', { numeric: true, sensitivity: 'base' })`, stabile Sortierung).
- [ ] **Step 4: Run** wie Step 2 → PASS.
- [ ] **Step 5: Commit** `feat: Sortieren, Filtern und Breiten als reines Modul (#92)`

### Task 3: Bausteine `Spaltentitel.svelte`, `Tabellenkopfzeile.svelte`, Zustand `tabellen-stand.svelte.ts` und Stile

**Files:**
- Create: `src/lib/verwaltung/Spaltentitel.svelte`, `src/lib/verwaltung/Tabellenkopfzeile.svelte`, `src/lib/verwaltung/tabellen-stand.svelte.ts`
- Modify: `src/lib/design/verwaltung.css`, `src/lib/design/pc-layout.css`

**Interfaces:**
- Consumes: alles aus Task 2.
- Produces:

```ts
// tabellen-stand.svelte.ts — ein Objekt je Seite
export class Tabellenstand<Z> {
	constructor(tabelle: string, spalten: readonly Spalte<Z>[], url: URL); // Stand: Adresse, sonst Gedächtnis
	readonly spalten: readonly Spalte<Z>[];
	sortierung: Sortierung;        // $state
	filter: Filter;                // $state
	breiten: Record<string, number>; // $state, aus ladeBreiten
	sortiere(schluessel: string): void;
	setzeFilter(schluessel: string, wert: FilterWert | undefined): void;
	leereFilter(): void;
	setzeBreite(schluessel: string, rem: number): void; // klemmt, speichert
	leereBreiten(): void;
	zeige(zeilen: readonly Z[]): Z[];           // filtern, dann sortieren
	woerter(): { schluessel: string; text: string }[]; // «Konto: Brief offen, ohne Brief»
	// Nach jeder Änderung: merke(tabelle, …) und Adresse per goto(…, { shallow, replace, keepFocus, noScroll })
}
```

`Spaltentitel.svelte` rendert das ganze `<th scope="col">` mit `aria-sort` (`ascending`/`descending`/`none`): Props `{ stand: Tabellenstand<any>; schluessel: string; anzahlen?: Record<string, number> }`. Ohne `sortwert` nur Titeltext. `Tabellenkopfzeile.svelte`: Props `{ stand: Tabellenstand<any>; anzahl: string }` (Anzahltext kommt von der Seite). Die `<col>`-Elemente setzt die Seite mit `style:--breite="{stand.breiten[s]}rem"`; `pc-layout.css` liest `--breite` nur in `.tabelle-steuerung col` und setzt dort `table-layout: fixed`, Box-Höhe und klebende Spalten. Ziehen mit Pointer-Events am Griff (`setPointerCapture`), Breite in rem aus Pixeln über die Schriftgrösse von `<html>`.

- [ ] **Step 1:** Svelte-Doku holen (`$state` in Klassen, `.svelte.ts`, `popover`, `goto` mit `shallow`), Bausteine schreiben, `svelte-autofixer` bis ohne Meldung. Kein eigener Test hier: Verhalten belegen die E2E in Task 4 bis 6 (Projekt hat keine Baustein-Tests).
- [ ] **Step 2:** `npm run check:svelte` und `npm run lint` grün.
- [ ] **Step 3: Commit** `feat: Bausteine Spaltentitel und Tabellenkopfzeile (#92)`

### Task 4: Mitgliederliste mit Steuerung

**Files:**
- Modify: `src/routes/verwaltung/mitglieder/+page.svelte`
- Modify: `src/lib/verwaltung/anzeige.ts` (Schlüssel der Plakette: `kontoZustand(z): 'aktiv' | 'brief-offen' | 'ohne-brief' | 'gesperrt' | 'ausgetreten' | 'vorgemerkt'`, Text weiter aus `plakette`)
- Test: `tests/e2e/verwaltung.test.ts`, `src/lib/verwaltung/anzeige.test.ts`

Spalten: Nummer (Text, Zahl sortiert, 5–12 rem, Start 6,5), Name (Text, 8–30, 13), E-Mail (Text, 8–30, 15), Jahrgang (Bereich ganz, 6–12, 7,5), Rollen (Werte = die vier Rollen aus `ROLLEN_NAME`, Sortwert = Rollentext, 8–25, 12), Konto (Werte = sechs Zustände in Plakettenreihenfolge, Anzahl je Zustand aus den geladenen Zeilen, 7–15, 9), Aktion (nicht sortierbar, fest 7, klebt rechts). Anzahltext: ohne Filter wie heute «412 Mitglieder», mit Filter «9 von 412 Mitgliedern». Filter «Status» bekommt eine Klasse, die ihn ab `60rem` ausblendet; Suche bleibt Anfrage an den Server und kommt ins Gedächtnis.

- [ ] **Step 0: Bestand sichten:** `grep -n "Status\|columnheader\|scrollY\|wartetAufMitgliederliste" tests/e2e/*.test.ts` — der Test «Seitenkopf und Spaltentitel kleben» (~Zeile 850) prüft das alte Verhalten (Fenster scrollt, Titel unter dem Seitenkopf) und wird auf die Box umgeschrieben: Box scrollt, Titel bleiben in der Box sichtbar, «Bearbeiten» der letzten Zeile im Bild.
- [ ] **Step 1: Failing E2E** (desktop, eigene Mitglieder mit Nachname `Steuer<zufall>`):
  - `#92: Mitglieder sortieren und filtern im Spaltentitel` — Klick auf «Jahrgang» → `aria-sort="ascending"`, erste eigene Zeile hat den kleinsten Jahrgang; nochmals → `descending`. «Konto filtern» → Aufklapper «Konto zeigen», Häkchen «Brief offen» → Anzahl `/^\d+ von \d+ Mitgliedern$/`, Wort «Konto: Brief offen» sichtbar, Adresse enthält `konto=brief-offen` und `sort=jahrgang`.
  - `#92: Name-Filter steht nie in der Adresse` — «Name filtern», Text eingeben → Adresse ohne den Text, Liste zeigt nur Treffer.
  - `#92: Ansicht bleibt nach Bearbeiten über Zurück und über den Pfad` — Filter Konto + Name setzen, «Bearbeiten» öffnen, `page.goBack()` → beide Filter aktiv; erneut öffnen, Pfad «Mitglieder» klicken → beide aktiv; `page.reload()` → Konto aktiv, Name leer.
  - `#92: kein Treffer und Zurücksetzen` — Name-Filter ohne Treffer → «0 von … Mitgliedern» und «Keine Mitglieder gefunden …»; «Filter zurücksetzen» → `/^\d+ Mitglied(er)?$/`.
  - `#92: Breite ziehen mit Tastatur und Maus, Liste scrollt zur Seite` — Griff «Breite E-Mail» fokussieren, 20× Pfeil rechts → `aria-valuenow` = Max; Box `scrollWidth > clientWidth`; Box ganz nach rechts scrollen → «Bearbeiten» der ersten Zeile `toBeInViewport()`; Maus-Ziehen über `boundingBox()` ändert `aria-valuenow`; `page.reload()` → Breite bleibt; «Breiten zurücksetzen» → Start.
  - `#92: 200 % Schrift` — `html { font-size: 200% }` per `page.addStyleTag`, Viewport 1920×1080: Trichter «Konto filtern» klickbar (`click({ trial: true })`), `document.documentElement.scrollWidth <= clientWidth`.
  - `#92: Handy unverändert` (iphone/android) — kein «Konto filtern», kein Separator, Filter «Status» sichtbar, Bildschirmfoto `pruefeBildschirm(…, 'verwaltung-mitglieder')` wie bisher.
  - Unit: `kontoZustand` für alle sechs Fälle.
- [ ] **Step 2: Run** `make e2e` im Hintergrund (nur diese Datei, wenn `make help` das anbietet) → neue Tests rot.
- [ ] **Step 3: Implement** Seite mit `Tabellenstand` und den Bausteinen.
- [ ] **Step 4: Run** Unit + `make e2e` → grün, inkl. umgeschriebenem Klebe-Test.
- [ ] **Step 5: Commit** `feat: Mitgliederliste sortieren, filtern und Breite ziehen (#92)`

### Task 5: Briefe mit Jahrgang und Steuerung

**Files:**
- Modify: `src/lib/server/admin/briefe.ts` (`BriefZeile.jahrgang: number | null`, im Select `mitglied.jahrgang`)
- Modify: `src/routes/verwaltung/briefe/+page.svelte`
- Test: `src/lib/server/admin/briefe.db.test.ts`, `tests/e2e/briefe.test.ts`

Spalten: Häkchen (klebt links, nicht sortierbar, «Alle gezeigten wählen»), Name (Text), Nummer (Text), Jahrgang (Bereich ganz), Brief (Werte: `gueltig` «Code gültig», `abgelaufen` «Code abgelaufen», `kein-brief` «noch kein Brief», `adresse-fehlt` «Adresse fehlt»). **Auswahl:** Ändert sich der Filter, verwirft die Seite die Wahl jeder ausgeblendeten Zeile (`gewaehlt = gewaehlt ∩ gezeigt`); «Alle gezeigten wählen» wählt nur gezeigte, wählbare Zeilen. Anzahl: «4 von 17 Mitgliedern · 4 gewählt».

- [ ] **Step 1: Failing tests:**
  - DB: `listeBriefEmpfaenger liefert den Jahrgang` — erfundenes Mitglied mit Jahrgang 2011 → `jahrgang: 2011`; ohne → `null`.
  - E2E desktop `#92: Briefe filtern und nur Gezeigte wählen` — drei eigene Mitglieder (Jahrgang 1960, 2010, 2012): Filter Name auf eigenen Nachnamen, A und B wählen, Jahrgang `2011..` → B ausgeblendet, Taste «Briefe erzeugen (1)»; Filter entfernen → B nicht gewählt, Taste (1); «Briefe erzeugen» → Rückfrage nennt 1 Brief.
- [ ] **Step 2: Run** `npx vitest run --project datenbank src/lib/server/admin/briefe.db.test.ts` und `make e2e` → rot.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** beide → grün; bestehende Brief-Tests grün.
- [ ] **Step 5: Commit** `feat: Briefe mit Jahrgang, Filter und Auswahl nur der gezeigten (#92)`

### Task 6: Verlauf mit Filter auf dem Server

**Files:**
- Modify: `src/lib/server/admin/verlauf.ts` (`ladeVerlauf`), `src/lib/server/admin/schnittstellen.ts` (`getVerlauf`), `src/lib/server/datum.ts` (`beginnDesTagesInZuerich(iso: string): Date`)
- Modify: `src/lib/verwaltung/mitglieder-api.ts` (`ladeVerlauf`), `src/routes/verwaltung/verlauf/+page.ts`, `+page.svelte`
- Test: `src/lib/server/admin/verlauf.db.test.ts`, `src/lib/server/admin/schnittstellen.db.test.ts` (oder bestehende Datei der Verlauf-Schnittstelle), `tests/e2e/verwaltung.test.ts`

**Interfaces:**

```ts
// verlauf.ts
export const AKTIONEN: Record<Aktion, true>;   // Laufzeitliste für `was`
export type VerlaufFilter = {
	mitgliedId?: number; grenze?: number;
	von?: Date; bisVor?: Date;      // [von, bisVor), Grenzen = Beginn des Zürcher Tages
	wer?: string; name?: string;    // enthält, ohne Gross/Klein, % und _ maskiert
	was?: readonly Aktion[];
};
export function ladeVerlauf(db: DbOderTx, filter: VerlaufFilter): Promise<VerlaufZeile[]>;
// mitglieder-api.ts
export function ladeVerlauf(filter: { mitglied?: number; von?: string; bis?: string; wer?: string; name?: string; was?: readonly string[] }, holen?: Holen): Promise<Antwort<VerlaufEintrag[]>>;
```

Schnittstelle: `von`, `bis` als `YYYY-MM-DD` (gültiges Datum, sonst `eingabe`); `bis` zählt inklusiv (→ `bisVor` = Beginn des Folgetages); `wer`, `name` getrimmt, höchstens 100 Zeichen (länger → `eingabe`), leer = kein Filter; `was` mehrfach (`?was=a&was=b`), unbekannt → `eingabe`. Alle Filter mit `und`, zusammen mit `mitglied`; `grenze` wie heute (Standard 100, höchstens 500), gilt nach dem Filtern. `wer` trifft «Nachname, Vorname», Nachname oder Vorname des Urhebers; enthält «mytco» (ohne Gross/Klein) im Wort «MyTCO», trifft es auch die automatischen Einträge. `name` trifft «Nachname, Vorname» des Mitglieds. Seite: `+page.ts` baut den ersten Filter aus Adresse (`mitglied`, `zeit=von..bis`, `was=a,b`) und Gedächtnis (`wer`, `name`); danach lädt die Seite selbst nach jeder Filteränderung (200 ms warten, nur die neueste Antwort zählt, wie die Mitgliedersuche) und schreibt die Adresse per `goto` shallow. Sortieren nach Spalte im Browser über die Treffer; ohne Wahl «neueste zuerst» (Zeit ↓). Text über der Tabelle: ohne Filter wie heute, mit Filter «Die neuesten 100 Treffer im ganzen Verlauf, neueste zuerst. Ohne alte und neue Werte.» und Anzahl «N Treffer».

- [ ] **Step 1: Failing tests:**
  - DB `ladeVerlauf filtert nach Zeit, Wer, Name und Was` — erfundene Einträge an 30.09., 01.10. 00:30 Zürich, 31.10. 23:30 Zürich, 01.11.: `von=01.10.`, `bisVor=01.11. 00:00 Zürich` trifft genau die zwei mittleren; `wer: 'mytco'` trifft automatische; `wer: '50%'` trifft nur wörtlich «50%»; `was: ['rolle-vergeben']` nur diese; Filter + `grenze: 1` → neuester Treffer.
  - Schnittstelle: `?von=2026-13-01` → 400 `{ fehler: 'eingabe' }`; `?was=foo` → 400; `?wer=<101 Zeichen>` → 400; `?von=2026-10-01&bis=2026-10-31&was=rolle-vergeben` → 200.
  - E2E desktop `#92: Verlauf filtert auf dem Server und behält die Ansicht` — eigenes Mitglied mit Rollenänderung; «Was filtern» → «Rolle vergeben»; «Mitglied filtern» → eigener Nachname; genau die eigenen Zeilen; Adresse hat `was=rolle-vergeben`, keinen Namen; Mitglied öffnen, `goBack()` → beide Filter, gleiche Zeilen; `reload()` → nur Was.
- [ ] **Step 2: Run** `npx vitest run --project datenbank src/lib/server/admin/verlauf.db.test.ts` (+ Schnittstellen-Test) und `make e2e` → rot.
- [ ] **Step 3: Implement** (Datenbank, Schnittstelle, Abruf, Seite).
- [ ] **Step 4: Run** → grün; bestehende Verlauf-Tests (u. a. `?mitglied=`, «Alle anzeigen») grün.
- [ ] **Step 5: Commit** `feat: Änderungsverlauf filtert auf dem Server (#92)`

### Task 7: Abschluss — Versionen, Nachweis, Design System, Issue

**Files:**
- Modify: `docs/versionen.md` (Unveröffentlicht), Issue #92 (Body), Design-System-Artifact «MyTCO»

- [ ] **Step 1:** Eintrag unter «Unveröffentlicht»: «Verwaltung: In den Listen Mitglieder, Briefe und Änderungsverlauf sortiert und filtert man am PC direkt im Spaltentitel, und die Spaltenbreite lässt sich ziehen. Briefe zeigen den Jahrgang (#92).»
- [ ] **Step 2:** Bildvergleich: Screenshots am PC (1440×900) der drei Seiten mit offenem Aufklapper neben den Artboards des Entwurfs; Abweichungen nur dort, wo Task 1 bewusst vom Entwurf abweicht. Dateien ins Scratchpad, nicht ins Repo.
- [ ] **Step 3:** Design System «MyTCO» nachführen (Memory `feedback_ui_ablauf_mit_design`, Falle `falle_design_system_publish`): Baustein *Tabellen-Steuerung* und aktuelle CSS-Dateien; ist der Abstand zum Repo-Stand grösser als dieser Baustein (Stand 09.11.), den Rest als Eintrag in `docs/beobachtungen.md` statt in diesem Branch.
- [ ] **Step 4:** Issue #92: Lösungsrichtung und DoD auf drei Seiten und Jahrgang in Briefe nachführen (`gh issue edit 92 --body-file …`).
- [ ] **Step 5:** `make check` auf dem fertigen, committeten Stand (im Hintergrund); `merge-reviewer`; CI auf dem Branch (`gh workflow run check.yml --ref feat/issue-092`, neue E2E zu Fokus und Navigation).
- [ ] **Step 6: Commit** `docs: Versionseintrag und Design-Abgleich (#92)`
