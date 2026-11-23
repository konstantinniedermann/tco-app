# Seiteninfo in der Verwaltung — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8 Menüseiten der Verwaltung zeigen unter dem Titel eine Seiteninfo (Variante B).

**Architecture:** Neuer Baustein im UI-Leitbild, Klasse in `verwaltung.css`, Svelte-Komponente
`Seiteninfo.svelte` mit dem Text als Kinder; jede Seite setzt sie direkt unter `<Seitenkopf>`.

**Tech Stack:** SvelteKit, Svelte 5, Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-11-23-seiteninfo-verwaltung-design.md`

## Global Constraints

- Texte wörtlich aus der Tabelle «Texte» der Spec; «Clubmeisterschaft» bekommt keine.
- Nur Tokens; kein `<style>` in Bausteinen; Regeln in `src/lib/design/verwaltung.css`.
- Vor Svelte-Code die Doku über den Svelte-MCP holen, danach `svelte-autofixer`.
- Die Seiteninfo steht ausserhalb von `.seitenkopf`.
- Elemente im E2E über Rolle und Beschriftung: die Seiteninfo ist `role="note"` mit
  `aria-label="Über diese Seite"`.

## Review Focus

- Rolle *Nur ansehen* (MyTCO-Admin auf Mitglieder-Seiten): Seiteninfo steht unter dem Hinweis,
  Text ohne «du kannst». Test: E2E läuft als MyTCO-Admin.
- Handy, 200 % Schrift: Symbol und Text brechen sauber um, nichts waagrecht gescrollt.
- Anzahl mit `role="status"` (Mitglieder, Anlässe) bleibt eine eigene Zeile unter der Seiteninfo.
- Änderungsverlauf mit Filter: Zeile «Nur dieses Mitglied … Alle anzeigen» bleibt darunter.
- Bestehende E2E, die alte Sätze suchen (`briefe.test.ts`), ziehen mit.

---

### Task 1: Baustein Seiteninfo und die 8 Seiten

**Files:**
- Modify: `docs/ui-leitbild.md` (Bausteintabelle nach *Hinweis*; «Welche Fläche wofür»)
- Modify: `src/lib/design/verwaltung.css` (`.seiteninfo`, `.seiteninfo-symbol`)
- Create: `src/lib/verwaltung/Seiteninfo.svelte`
- Modify: `src/routes/verwaltung/{mitglieder,einlesen,briefe,anlaesse,mitteilungen,fairgate,verlauf,rollen}/+page.svelte`
- Test: `tests/e2e/verwaltung.test.ts`, `tests/e2e/briefe.test.ts:103-107`

**Interfaces:**
- Produces: `Seiteninfo.svelte` mit Props `{ children: Snippet }`, rendert
  `<div class="seiteninfo" role="note" aria-label="Über diese Seite">` mit Symbol (Kreis mit «i»,
  `aria-hidden="true"`) und `<div>{@render children()}</div>`.

- [ ] **Step 1: Failing E2E** in `verwaltung.test.ts`:
  `test('#93: jede Menüseite der Verwaltung erklärt sich in ihrer Seiteninfo', …)` — MyTCO-Admin
  (`legeRollenkontoMitBriefCodeAn('Selina', ['mytco'])`, `oeffneVerwaltung`), dann für jede der
  8 Adressen `page.goto(...)` und
  `expect(page.getByRole('note', { name: 'Über diese Seite' })).toContainText(<Kernsatz>)`, Kernsätze:
  Mitglieder «über «Bearbeiten» ihre Seite öffnen», Einlesen «Für das erste Einlesen», Briefe
  «Nicht für verlorene Zugänge» und «Code per E-Mail», Anlässe «Erinnerungen an alle, die noch nicht
  geantwortet haben», Mitteilungen «über die Seite eines Anlasses», Für Fairgate «Mitgliedersystem
  Fairgate», Änderungsverlauf «ohne alte und neue Werte», Rollen «in der Klappe «Rollen»».
  Auf `/verwaltung/turniere`: `getByRole('note', { name: 'Über diese Seite' })` hat Anzahl 0.
  `pruefeBildschirm(page, info, 'seiteninfo-briefe')` auf Briefe; keine Konsolenfehler.
  In `briefe.test.ts` den alten Satz durch die Seiteninfo mit «Nicht für verlorene Zugänge» ersetzen.
- [ ] **Step 2: Rot prüfen** — `npm run e2e -- tests/e2e/verwaltung.test.ts -g "#93"` im
  Hintergrund; erwartet: FAIL, kein `note`.
- [ ] **Step 3: Leitbild** — Zeile «Seiteninfo | `.seiteninfo` | nur Verwaltung: …» mit den
  Werten der Spec («Entschieden»), Satz «Ändert sich, was die Seite kann, wird ihre Seiteninfo
  mitgeprüft»; in «Welche Fläche wofür» Zeile «Seiteninfo (grüner Balken) | wozu die Seite da ist |
  bleibt immer».
- [ ] **Step 4: CSS und Komponente** — Werte aus der Spec, wie im Entwurf `seiteninfo-b`.
- [ ] **Step 5: Seiten** — `<Seiteninfo>` direkt nach `</Seitenkopf>`; die bisherigen leisen
  Erklärsätze entfallen (Einlesen, Briefe, Mitteilungen, Fairgate, Rollen; Verlauf behält nur die
  Zeile zur Auswahl ohne «Ohne alte und neue Werte.»). Anzahl-Zeilen bleiben darunter.
- [ ] **Step 6: Grün** — derselbe E2E-Lauf und `tests/e2e/briefe.test.ts`: PASS.
- [ ] **Step 7: Commit** — `feat: Seiteninfo auf den Menüseiten der Verwaltung (#93)`.

### Task 2: Doku, Hook, Abschluss

**Files:**
- Modify: `docs/versionen.md` (Unveröffentlicht), `docs/beobachtungen.md` (2 Einträge unter «Offen»)
- Create (schon geschrieben): `.claude/settings.json`, `.claude/hooks/seiteninfo-erinnerung.sh`

- [ ] **Step 1:** Eintrag «Verwaltung: Jede Menüseite erklärt unter dem Titel kurz, wozu sie da ist;
  bei «Briefe» mit dem Hinweis, dass verlorene Zugänge über «Code per E-Mail» gehen (#93).»
- [ ] **Step 2:** Beobachtungen: Rollen nur über die Seite «Rollen» vergeben (Wunsch PL);
  Mitteilungen zur CM und an Untergruppen ohne Anlass fehlen.
- [ ] **Step 3: Commit** — `docs: …` bzw. `feat: Projekt-Hook erinnert an die Seiteninfo`.
- [ ] **Step 4:** `make check` im Hintergrund, grün; Design System «MyTCO» um den Baustein
  nachführen; Screenshots PC und Handy neben dem Entwurf; `merge-reviewer`.
