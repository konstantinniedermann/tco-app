# Etappe 2a Briefe (#43) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Mitglieder-Admin stellt Brief-Codes aus – einzeln auf der Seite eines Mitglieds
oder als Serie auf der neuen Seite *Briefe* – und druckt die Login-Briefe aus einer
Druckansicht des Browsers.

**Architecture:** Der Server stellt die Codes in **einer** Transaktion aus, schreibt je Mitglied
den Verlaufseintrag und liefert pro Brief fertiges, maskiertes HTML (`baueBriefInhalt`). Die
Oberfläche zeigt es in einer Druckansicht (`Briefdruck.svelte`) nur im Arbeitsspeicher. Die
Druckstile liegen neu in `src/lib/design/brief.css` statt eingebettet, damit die
Content-Security-Policy keine Ausnahme braucht; der Musterbrief bettet dieselbe Datei ein.

**Tech Stack:** SvelteKit (SPA, nur `+server.ts`), Drizzle/PostgreSQL, Vitest (Einheit + DB),
Playwright (E2E), `qrcode-generator` (vorhanden).

**Spec:** `docs/superpowers/specs/2026-11-04-admin-mitgliederverwaltung-design.md` (Abschnitte
*Briefe*, *Bauetappen* mit «Etappe 2 geteilt», *Anti-Ziele*)

## Global Constraints

- Keine neuen Abhängigkeiten; keine Migration (Spalte `aenderung.aktion` ist `text` ohne CHECK).
- Bauregel ADR-002: unter `src/routes` nur `+server.ts`, keine Form Actions/Remote Functions.
- Vor Svelte-Code die Doku über den Svelte-MCP holen, nach dem Schreiben `svelte-autofixer`.
- Oberfläche nur aus Tokens/Bausteinen von `docs/ui-leitbild.md`; Neues zuerst ins Leitbild.
- RR-04 / Anti-Ziel: Ein Brief-Code existiert im Klartext nur in der Antwort der Schnittstelle
  und in der Druckansicht – nie in DB, Verlauf, Log, URL, `localStorage`/`sessionStorage`.
- FR-26: Verlaufseintrag `brief-code-ausgestellt` ohne `detail`, ohne Wert.
- Schreiben nur Mitglieder-Admin (Bereich `mitglieder`); MyTCO-Admin liest, stellt nichts aus.
- Ein neuer Brief-Code ersetzt den alten (FR-24, `briefCodeBenutztAm` wird `null`).
- Testdaten erfunden (DS-08); Testnamen beginnen mit der Anforderungs-/Regel-ID
  (`A-LOGIN-01: …`, `RR-04: …`).
- Texte knapp, Du-Form, Schweizer Schreibweise (ss statt ß).
- Dateien einzeln stagen, Commit-Präfixe `feat:`/`test:`/`docs:`/`refactor:`.

## Review Focus

1. **Adressfenster verrutscht im Ausdruck aus der App** (Rand von `.inhalt`, Schriftgrösse von
   `html`, fehlende benannte Seite): Erwartet wird dieselbe Lage wie im Musterbrief. → E2E in Task 4.
2. **Ausgewähltes Mitglied wird zwischen Liste und «Briefe erzeugen» ungeeignet** (ausgetreten,
   gesperrt, Adresse gelöscht): Erwartet wird, dass gar kein Code ausgestellt wird und die Seite
   es sagt. → DB-Test Task 2, Schnittstelle Task 3, Meldung Task 4.
3. **Doppelklick auf «Briefe erzeugen»** stellt zwei Code-Sätze aus, der gedruckte wäre ungültig:
   Erwartet genau eine Anfrage. → E2E Task 4 (genau ein Verlaufseintrag).
4. **Codes bleiben im Browser liegen** (Speicher, URL, Verlauf der Seite nach «Zurück»):
   Erwartet nichts davon. → E2E Task 4.
5. **Name mit `<`, `&` oder Anführungszeichen** erscheint wörtlich im Brief, nicht als Markup,
   auch über `{@html}`. → Einheitstest Task 1.

---

### Task 1: Brief in Inhalt und Druckstil trennen

**Files:**
- Create: `src/lib/design/brief.css`
- Modify: `src/lib/server/brief/brief.ts`, `scripts/musterbrief.ts`, `docs/ui-leitbild.md` (Abschnitt *Brief (Druck)*)
- Test: `src/lib/server/brief/brief.test.ts`

**Interfaces:**
- Produces: `baueBriefInhalt(d: BriefDaten): string` – nur `<article class="brief">…</article>`
  (statt bisher `<main>`, weil es in der App im `<main>` der Verwaltung steht);
  `baueBriefHtml(d: BriefDaten, stile: string): string` – eigenständiges Dokument, `stile` ist
  `tokens.css` + `brief.css` aneinandergehängt, `<body>` enthält `baueBriefInhalt(d)`.

- [ ] **Step 1: Failing tests**, in `brief.test.ts` (bestehende Tests auf die neue Signatur umstellen, `stile` = Inhalt beider Dateien):
  - `RR-04: Briefinhalt kommt ohne Stil aus (CSP)`: `baueBriefInhalt(daten())` enthält weder `<style` noch ` style=`, beginnt mit `<article class="brief">`.
  - `A-LOGIN-01: Briefinhalt maskiert Namen mit Sonderzeichen`: Vorname `Ana<b>&"'` → Ausgabe enthält `Ana&lt;b&gt;&amp;&quot;&#39;`, nicht `<b>`.
  - `A-LOGIN-01: eigenständiger Brief bettet die Stile ein`: `baueBriefHtml(d, 'X-STIL')` enthält `<style>` mit `X-STIL` und den Inhalt von `baueBriefInhalt(d)`.
- [ ] **Step 2:** `npx vitest run src/lib/server/brief` → FAIL (Funktion fehlt).
- [ ] **Step 3: Implementieren.** `DRUCK_CSS` nach `brief.css` verschieben und dabei auf den Brief begrenzen, weil die Datei in der App global wirkt:
  - `@page brief { size: A4; margin: 0; }` und `.brief { page: brief; }` (benannte Seite, die Auskunft behält ihren Druckrand).
  - Was heute auf `html`/`body`/`*`/`h1, h2, p, ol, address` liegt, auf `.brief` bzw. `.brief :is(…)` setzen; `html { font-size: var(--brief-schrift) }` wird `@media print { html:has(.brief) { font-size: var(--brief-schrift); } }`.
  - `.brief + .brief { break-before: page; }` (eine Seite je Brief, keine Leerseite am Schluss).
  - Kommentar mit der Annahme K-16.1 wandert mit.
  `musterbrief.ts` hängt `tokens.css` und `brief.css` aneinander. Leitbild: *Brief (Druck)* nennt `brief.css`, die benannte Seite und die Regel «nur unter `.brief`».
- [ ] **Step 4:** `npx vitest run src/lib/server/brief` → PASS; `make musterbrief` → «Musterbrief: musterbrief/musterbrief.pdf» (eine Seite); PDF mit dem Stand von `dev` vergleichen (sichtbar gleich, sonst Stil nachziehen); `make check-schnell` grün (enthält Lint und Design-Tokens).
- [ ] **Step 5: Commit** `refactor: Brief in Inhalt und Druckstil getrennt (#43)`

### Task 2: Briefe ausstellen und Empfänger auflisten (Server-Fachlogik)

**Files:**
- Create: `src/lib/server/admin/briefe.ts`, `src/lib/server/admin/briefe.db.test.ts`
- Modify: `src/lib/server/login/dienst.ts` (Ausstellen in Transaktion), `src/lib/server/admin/verlauf.ts` (Aktion), `src/lib/verwaltung/anzeige.ts` (Text)
- Test: `src/lib/server/admin/briefe.db.test.ts`, bestehende Login-Tests bleiben grün

**Interfaces:**
- Consumes: `baueBriefInhalt` (Task 1); `erzeugeBriefCode`, `hashBriefCode`, `BRIEF_CODE_GUELTIG_MS` aus `login/codes.ts`; `schreibeVerlauf`.
- Produces:
  ```ts
  // login/dienst.ts – LoginDienst.stelleBriefCodeAus ruft das mit db auf
  export function stelleBriefCodeAusIn(tx: DbOderTx, schluessel: string, kontoId: number, jetzt: Date): Promise<{ code: string; gueltigBis: Date }>;
  // admin/briefe.ts
  export const MAX_BRIEFE = 1000;
  export type BriefZeile = { id: number; name: string; mitgliedernummer: string | null; briefGueltigBis: Date | null; adresseFehlt: boolean };
  export type BriefAbh = { schluessel: string; adresse: string; kontakt: string };
  export type AusgestellterBrief = { mitgliedId: number; name: string; html: string };
  export function listeBriefEmpfaenger(db: Db, jetzt: Date): Promise<BriefZeile[]>;
  export function stelleBriefeAus(db: Db, abh: BriefAbh, urheber: Urheber, ids: readonly number[], jetzt: Date):
    Promise<{ ergebnis: 'ok'; briefe: AusgestellterBrief[] } | { ergebnis: 'nicht-moeglich'; anzahl: number }>;
  ```
  Verlauf-Aktion `'brief-code-ausgestellt'`, Anzeige «Brief-Code ausgestellt».

Regeln (Entscheide der Planung, im Bericht nennen):
- **Empfänger der Serie** = Status `aktiv`, Konto nicht gesperrt, `briefCodeBenutztAm IS NULL` (jedes Login per Brief- oder Mail-Code setzt es) **und** keine gültige Sitzung (deckt den Fall «neuer Brief-Code für ein schon eingeloggtes Gerät» ab). Sortiert nach Nachname, Vorname. `briefGueltigBis` nur bei noch gültigem, nicht benutztem Code, sonst `null`. `adresseFehlt`, wenn Strasse, PLZ oder Ort leer ist.
- **Ausstellen möglich** (Serie und einzeln) = Status `aktiv`, nicht gesperrt, Adresse vollständig. Ein einzelner Brief geht auch an schon eingeloggte Mitglieder.
- **Alles oder nichts:** Ist eine ID nicht möglich, wird kein Code ausgestellt (`anzahl` = Zahl der unmöglichen IDs). Sonst je Mitglied Code + Verlaufseintrag in derselben Transaktion; Briefe in der Reihenfolge Nachname, Vorname.
- `stelleBriefCodeAusIn` wiederholt bei Kollision des Hashs (heute `MAX_VERSUCHE_AUSSTELLEN = 3`) innerhalb eines Savepoints (`tx.transaction(...)`), damit die äussere Transaktion nicht abbricht.

- [ ] **Step 1: Failing tests** in `briefe.db.test.ts` (Mitglieder über `tests/hilfen/mitglieder.ts`, gemeinsame Test-DB wie in `mitglieder.db.test.ts`):
  - `A-LOGIN-01: Liste zeigt nur aktive, ungesperrte Mitglieder ohne Login`: aktiv ohne Brief → drin mit `briefGueltigBis: null`; mit offenem Code → drin mit Datum; Brief benutzt → nicht drin; gültige Sitzung → nicht drin; ausgetreten, vorgemerkt, gesperrt → nicht drin; ohne Strasse → drin mit `adresseFehlt: true`.
  - `RR-04: Ausstellen speichert nur den Hash, der Code meldet an`: `stelleBriefeAus(…[id])` → `ok`, ein Brief, `html` enthält `formatiereBriefCode(code)` und den Vornamen; `konto.briefCodeHash` ≠ Code; ein `erstelleLoginDienst(...).loginMitBriefCode(code, …)` mit dem Code aus dem HTML liefert `ok`.
  - `FR-24: neuer Code ersetzt den alten`: zweimal ausstellen → erster Code meldet nicht mehr an, `briefCodeBenutztAm` ist nach dem zweiten Ausstellen `null`.
  - `FR-26: je Mitglied ein Eintrag «brief-code-ausgestellt» ohne detail`, Urheber = Admin.
  - `A-LOGIN-01: alles oder nichts`: IDs [aktiv, ausgetreten] → `{ ergebnis: 'nicht-moeglich', anzahl: 1 }`, beim aktiven weder Hash noch Verlaufseintrag; ebenso für gesperrt, Adresse fehlt, unbekannte ID.
- [ ] **Step 2:** `make db`, dann `npx vitest run src/lib/server/admin/briefe.db.test.ts` → FAIL.
- [ ] **Step 3: Implementieren** wie in *Interfaces* und *Regeln*; `anzeige.ts`: `case 'brief-code-ausgestellt': return 'Brief-Code ausgestellt';`.
- [ ] **Step 4:** Datei grün; `src/lib/server/login` (Einheit + DB) grün.
- [ ] **Step 5: Commit** `feat: Brief-Codes für mehrere Mitglieder in einer Transaktion ausstellen (#43)`

### Task 3: Schnittstellen

**Files:**
- Create: `src/routes/api/admin/briefe/+server.ts` (GET, POST), `src/routes/api/admin/mitglieder/[id]/brief/+server.ts` (POST)
- Modify: `src/lib/server/admin/schnittstellen.ts` (`AdminDienste.brief`, drei Funktionen, `ADMIN_SCHNITTSTELLEN`), `src/lib/server/admin/index.ts` (Verdrahtung aus `leseEinstellungen()`: `codeSchluessel`, `adresse`, `kontakt`), jede Test-Datei, die `AdminDienste` baut (`grep -rn "hinweis: " src/lib/server --include=*.test.ts`)
- Test: `src/lib/server/admin/schnittstellen.db.test.ts`; `rechte-matrix.db.test.ts` deckt die neuen Funktionen über `ADMIN_SCHNITTSTELLEN` von selbst ab

**Interfaces:**
- Consumes: Task 2.
- Produces:
  - `AdminDienste.brief: BriefAbh`
  - `getBriefe` – `liest(…, 'mitglieder')` → 200 `BriefZeile[]`
  - `postBriefe` – `schreibt(…, 'mitglieder')`, Körper `{ ids: number[] }` → 200 `{ briefe: AusgestellterBrief[] }`; 400 `{ fehler: 'eingabe' }` wenn `ids` keine Liste von 1 bis `MAX_BRIEFE` verschiedenen ganzen Zahlen > 0 ist; 409 `{ fehler: 'nicht-moeglich', anzahl }`
  - `postBrief` – `schreibt(…, 'mitglieder')`, Pfad `[id]`, leerer Körper → 200 `{ briefe: [AusgestellterBrief] }`; 404 bei ungültiger ID; 409 `{ fehler: 'nicht-moeglich', anzahl: 1 }`

- [ ] **Step 1: Failing tests** in `schnittstellen.db.test.ts` (Muster der vorhandenen Tests dort):
  - `A-LOGIN-01: Mitglieder-Admin erzeugt Briefe für eine Auswahl` → 200, `briefe.length` = 2, je `html` mit `class="brief"`.
  - `A-LOGIN-01: Liste der Briefe für den MyTCO-Admin lesbar` → `getBriefe` 200.
  - `RR-04: Eingabe ohne Liste, leer, doppelt oder über MAX_BRIEFE → 400`.
  - `A-LOGIN-01: einzelner Brief für ein ausgetretenes Mitglied → 409 nicht-moeglich`, unbekannte ID → 404.
- [ ] **Step 2:** Test-Datei → FAIL.
- [ ] **Step 3: Implementieren**; die zwei `+server.ts` nach dem Muster von `api/admin/mitglieder/[id]/sitzungen/+server.ts`.
- [ ] **Step 4:** `schnittstellen.db.test.ts`, `rechte-matrix.db.test.ts` (MyTCO-Admin → `kein-recht` für beide POST, kein Log), `scripts/pruefungen/bauregel.test.ts` grün; `npm run check` (Typen) grün.
- [ ] **Step 5: Commit** `feat: Schnittstellen für Briefe einzeln und als Serie (#43)`

### Task 4: Seite *Briefe* mit Druckansicht

**Files:**
- Create: `src/lib/verwaltung/Briefdruck.svelte`, `src/routes/verwaltung/briefe/+page.svelte`, `src/routes/verwaltung/briefe/+page.ts`, `tests/e2e/briefe.test.ts`
- Modify: `src/lib/verwaltung/api.ts` (Aufrufe, `Antwort` um `nicht-moeglich`), `src/lib/verwaltung/umleiten.ts` (`SEITEN.briefe = 'mitglieder'`), `src/routes/verwaltung/+layout.svelte` (Link «Briefe» nach «Mitglieder»), `src/lib/design/basis.css` (nur Bildschirm/Druck der Druckansicht), `docs/ui-leitbild.md` (Baustein *Briefdruck*)

**Interfaces:**
- Consumes: Task 3; `brief.css` (Task 1).
- Produces:
  ```ts
  // api.ts
  export type BriefListe = Json<BriefZeile>[];
  export type { AusgestellterBrief };
  export const ladeBriefe: (holen?: Holen) => Promise<Antwort<BriefListe>>;
  export const erzeugeBriefe: (ids: number[], holen?: Holen) => Promise<Antwort<{ briefe: AusgestellterBrief[] }>>;
  export const erzeugeBrief: (id: number, holen?: Holen) => Promise<Antwort<{ briefe: AusgestellterBrief[] }>>;
  // deute(): 409 { fehler: 'nicht-moeglich', anzahl } → { art: 'nicht-moeglich'; anzahl: number }
  ```
  `Briefdruck.svelte` – Props `{ briefe: AusgestellterBrief[]; zurueck: () => void }`; importiert `../design/brief.css`; Leiste `.nicht-drucken` mit «‹ Zurück» und «Drucken oder als PDF speichern» (`window.print()`), darunter `.leise.nicht-drucken` «Die Codes stehen nur hier. Drucke jetzt oder speichere als PDF.», danach je Brief `{@html b.html}` in einem Rahmen `.briefdruck` (auf dem Bildschirm waagrecht scrollbar, weisser Grund; unter `@media print` ohne Rand, `.inhalt:has(.brief)` ohne Innenabstand). Wird von Task 5 wiederverwendet.

Seite (Texte so übernehmen):
- Titel «Briefe». Einleitung: «Mitglieder, die MyTCO noch nie geöffnet haben. Ein neuer Code ersetzt den alten.»
- Tabelle (Baustein *Tabelle*): Auswahl · Name · Nummer · Brief. Spalte Brief: «Code gültig bis TT.MM.JJJJ» / «noch kein Brief» / «Adresse fehlt» (dann Auswahlfeld `disabled`). Kopf: Feld «Alle auswählen» (nur wählbare Zeilen).
- Leer: «Alle aktiven Mitglieder haben MyTCO schon geöffnet.»
- Taste `.taste` «Briefe erzeugen (N)», `disabled` bei N = 0. Rückfrage im `<dialog>` (Muster *Sitzungen beenden*): Titel «N Briefe erzeugen?», Text «Die Codes erscheinen nur in der Druckansicht. Schliesst du sie ohne zu drucken, erzeugst du neue Briefe.», Tasten «Briefe erzeugen» / «Abbrechen». Senden über einen Riegel wie `einzeln()` auf der Mitgliedsseite.
- 409: `.fehler` «Nicht alle ausgewählten Mitglieder können einen Brief erhalten (inzwischen ausgetreten, gesperrt oder ohne Adresse). Es wurde kein Code ausgestellt.», Liste neu laden.
- Erfolg: Statt der Liste `Briefdruck`; «‹ Zurück» verwirft die Briefe (Zustand auf `null`) und lädt die Liste neu (`invalidateAll`).
- MyTCO-Admin/Ansicht: Liste ohne Auswahlfelder und ohne Taste (Hinweis *Nur ansehen* kommt über `SEITEN` vom Layout).

- [ ] **Step 1: Failing E2E** `tests/e2e/briefe.test.ts` (Anmelden und Bestätigen wie in `mitgliedschaft.test.ts`, Mitglieder über `legeKontoAn` mit eindeutigem Nachnamen je Projekt):
  - `A-LOGIN-01: Serie – Auswahl, Rückfrage, Druckansicht, Code meldet an`: Mitglied in der Liste mit «noch kein Brief»; auswählen; «Briefe erzeugen (1)»; Dialog; **Doppelklick** auf «Briefe erzeugen» im Dialog; Druckansicht zeigt «Hoi <Vorname>»; Code aus `.brief-code` lesen; in neuem Browser-Kontext mit dem Code anmelden → «Hoi <Vorname>»; zurück in der Verwaltung: «‹ Zurück» → Mitglied nicht mehr in der Liste; Mitgliedsseite: genau **ein** Verlaufseintrag «Brief-Code ausgestellt».
  - `RR-04: Druckansicht hinterlässt den Code nirgends`: nach dem Erzeugen `localStorage.length` und `sessionStorage.length` = 0, `page.url()` ohne Code; nach «‹ Zurück» kein `.brief-code` mehr im DOM.
  - `A-LOGIN-01: Adressfenster im Ausdruck wie im Musterbrief`: `page.emulateMedia({ media: 'print' })`; Lage von `.brief` = (0, 0) und Abstand `.brief-fenster` zu `.brief` gleich (±1 px) wie in einer zweiten Seite mit `setContent(baueBriefHtml(daten, tokens + brief.css))` unter derselben Emulation.
  - `A-LOGIN-01: Adresse fehlt – Zeile nicht wählbar` (Mitglied ohne Strasse über die DB-Hilfe anlegen).
  - In jedem Test `pruefeBildschirm(page, info, …)` (axe) für Liste und Druckansicht, `sammleKonsolenfehler` leer (CSP!), Screenshot über `SCREENSHOTS` wie in `mitgliedschaft.test.ts`.
- [ ] **Step 2:** `make db`, dann `E2E_PORT=<freier Port> npm run e2e -- tests/e2e/briefe.test.ts` mit `run_in_background` (Falle: im Vordergrund nach ~3 Min. abgebrochen) → FAIL.
- [ ] **Step 3: Implementieren**; Svelte-Doku per MCP vorher, `svelte-autofixer` nachher; neue Klassen erst ins Leitbild.
- [ ] **Step 4:** E2E-Datei grün in allen Projekten; `make check` grün.
- [ ] **Step 5: Commit** `feat: Seite Briefe mit Druckansicht (#43)`

### Task 5: Einzelner Brief auf der Seite eines Mitglieds, Doku

**Files:**
- Modify: `src/routes/verwaltung/mitglieder/[id]/+page.svelte` (Karte *Login*), `tests/e2e/briefe.test.ts`, `docs/rollen-und-rechte.md` (RR-04 Status: neuer Brief-Code umgesetzt), `docs/context-scopes.md` (Zeile *Brief*: `src/lib/design/brief.css`, `src/lib/server/admin/briefe.ts`, `src/routes/api/admin/briefe/`, `src/routes/api/admin/mitglieder/[id]/brief/`, `src/routes/verwaltung/briefe/`, `src/lib/verwaltung/Briefdruck.svelte`, `tests/e2e/briefe.test.ts`), `docs/versionen.md` (unter «Unveröffentlicht»), `docs/testkonzept.md` falls dort E2E-Dateien aufgezählt sind, `docs/superpowers/specs/2026-11-04-admin-mitgliederverwaltung-design.md` (Etappe 2a erledigt)

**Interfaces:**
- Consumes: `erzeugeBrief`, `Briefdruck` (Task 4).

Verhalten: In der Karte *Login* Nebentaste «Neuen Brief-Code ausstellen», nur wenn die Rolle schreibt, Status `aktiv`, nicht gesperrt und Adresse vollständig (sonst `.leise` «Für einen Brief fehlt die Adresse.» bei fehlender Adresse). Rückfrage im `<dialog>`: Titel «Neuen Brief-Code ausstellen?», Text «Der alte Brief-Code gilt dann nicht mehr. Eingeloggte Geräte bleiben eingeloggt.», Tasten «Ausstellen» / «Abbrechen». Danach ersetzt `Briefdruck` den Inhalt der Seite; «‹ Zurück» zeigt wieder das Mitglied (`invalidateAll`). 409 → `.fehler` «Für dieses Mitglied lässt sich kein Brief erstellen.»

- [ ] **Step 1: Failing E2E** in `briefe.test.ts`:
  - `A-LOGIN-01, RR-04: einzelner Brief auf der Mitgliedsseite ersetzt den alten Code`: Mitglied mit Brief-Code (`legeAdminMitBriefCodeAn`-Muster bzw. Hilfe mit Code), «Neuen Brief-Code ausstellen» → Dialog → Druckansicht; alter Code meldet nicht an, neuer schon; Karte *Login* zeigt «Brief-Code gültig bis …».
  - `RR-07: MyTCO-Admin sieht keine Taste «Neuen Brief-Code ausstellen»`.
- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3: Implementieren** und Doku nachführen (Liste oben). Eintrag in `versionen.md`: «Briefe (#43, Etappe 2a): Der Mitglieder-Admin stellt einen neuen Brief-Code einzeln aus oder erzeugt Briefe für alle, die MyTCO noch nie geöffnet haben, und druckt sie aus einer Druckansicht des Browsers. Der Code erscheint nur dort; Verlaufseintrag «Brief-Code ausgestellt».»
- [ ] **Step 4:** `make check` grün auf dem committeten Stand; Screenshots Liste, Dialog, Druckansicht (iPhone + PC) mit `SCREENSHOTS=<scratchpad>` erzeugen und ansehen; `make musterbrief` noch eine Seite.
- [ ] **Step 5: Commit** `feat: neuer Brief-Code auf der Seite eines Mitglieds (#43)` und `docs: Etappe 2a Briefe nachgeführt (#43)`
