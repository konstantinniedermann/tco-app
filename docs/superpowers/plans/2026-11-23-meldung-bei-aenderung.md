# Meldung bei Änderung durch die Verwaltung — Umsetzungsplan (#94)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Verwaltung wählt bei jeder Änderung an einem Mitglied mit dem Häkchen «Mitglied benachrichtigen», ob das Mitglied eine Meldung (Push, sonst E-Mail) bekommt.

**Architecture:** Jede betroffene schreibende Schnittstelle liest ein freiwilliges `benachrichtigen` (Wahrheitswert) aus dem JSON-Körper; fehlt es, gilt der Standard des Bereichs. Nach dem Speichern meldet die Schnittstelle über `meldeMitgliedern` (FR-47-Weg). Die Oberfläche zeigt das Häkchen im Formular bzw. in der Rückfrage und reicht es über die Abruf-Module mit.

**Tech Stack:** SvelteKit 2 / Svelte 5, Drizzle + PostgreSQL, Vitest (DB-Tests gegen echte DB), Playwright (`make e2e`).

**Spec:** `docs/superpowers/specs/2026-11-23-meldung-bei-aenderung-design.md`

## Global Constraints

- Körperfeld heisst `benachrichtigen`; erlaubt `true`/`false`/fehlend; anderer Typ → `400 { fehler: 'eingabe' }`, nichts gespeichert.
- Standard ohne Angabe: CM-Aktionen (ausser Klassierung) `true`; Profil, Rollen, Wiedereintritt, Rücknahme, Klassierung `false`.
- Wildcard-Entscheid (`postEntscheid`) und Kategorie ändern (`postKategorie`) melden unverändert immer, ohne Häkchen.
- Hinweis an die alte Adresse beim E-Mail-Wechsel (SI-09) geht immer, unabhängig vom Häkchen.
- Betrifft die Änderung den Admin selbst (`mitgliedId === urheber.mitgliedId`), keine Meldung.
- Meldung nennt nie den neuen Wert, keine Namen anderer Mitglieder (DS-05; Doppel wie heute).
- Meldung erst nach dem Commit, ohne Warten, Fehler still (SI-05, kein Log).
- Texte exakt (Titel · Text · Pfad):
  - Profil: `Dein Profil` · `Die Verwaltung hat dein Profil geändert: <Feldnamen, ", "-getrennt, Reihenfolge von FELDER>.` · `/profil`
  - Rolle vergeben: `MyTCO` · `Du hast neu die Rolle «<ROLLEN_NAME>».` · `/`
  - Rolle entzogen: `MyTCO` · `Deine Rolle «<ROLLEN_NAME>» wurde entfernt.` · `/`
  - Wiedereintritt und Rücknahme der Löschung: `MyTCO` · `Dein Zugang zu MyTCO ist wieder offen.` · `/`
  - Klassierung: `Clubmeisterschaft` · `Der CM-Admin hat deine Klassierung geändert.` · `/profil`
  - übrige CM-Aktionen: Texte wie heute.
- Häkchen-Beschriftung überall: `Mitglied benachrichtigen` (im Doppel `Spieler benachrichtigen`).
- Bauregeln aus `CLAUDE.md`: Route ruft eine Schnittstellen-Funktion; Fachfunktionen ohne HTTP; kein `fetch(…)` ausser über `abruf.ts`; keine `<style>` in Bausteinen; Oberfläche nur aus `docs/ui-leitbild.md`.
- Jede Verhaltensänderung beginnt mit einem roten Test; Commits einzeln stagen (`git add <datei>`), Präfix `feat:`/`docs:`/`test:`.

## Review Focus

1. **Falsch grün bei «keine Meldung»:** `melde` wartet nicht; ein sofortiges `expect(mails).toEqual([])` beweist nichts. Jeder Test «ohne Häkchen keine Meldung» löst danach eine Aktion mit Meldung aus, wartet per `vi.waitFor` auf genau diese eine Mail und prüft, dass nur sie da ist.
2. **Falscher Typ:** `benachrichtigen: 'ja'` oder `1` → 400 und keine Änderung in der DB (Task 2, 3, 4, 5).
3. **Nichts geändert:** Profil speichern ohne geänderte Felder, Häkchen an → keine Meldung (Task 3).
4. **Trotzdem-Weg:** Nach `409 warnung` schickt der Aktionsdialog «Trotzdem …» mit demselben Häkchen-Wert (Task 6, Abruf-Test).
5. **E-Mail-Wechsel mit Häkchen:** Hinweis an die alte Adresse **und** Meldung an die neue (ohne VAPID per Mail); ohne Häkchen nur der Hinweis (Task 3).

---

### Task 1: Konzepte zuerst nachführen

**Files:**
- Modify: `docs/fachmodell.md` (FR-47 präzisieren, neue Regel FR-56)
- Modify: `docs/datenschutz.md` (Meldungen der Verwaltung an das Mitglied), Änderungsprotokoll unten
- Modify: `docs/datenschutzerklaerung.md:81` (Absatz Mitteilungen)
- Modify: `docs/ui-leitbild.md:190` (Auswahlfläche)
- Modify: `docs/sicherheitskonzept.md` (SI-09): Satz, dass der Hinweis unabhängig vom Häkchen geht

- [ ] **Step 1:** FR-56 anlegen: «Ändert die Verwaltung Angaben, Rollen, Mitgliedschaft (Wiedereintritt, Rücknahme) oder CM-Anmeldungen eines Mitglieds, wählt sie pro Änderung, ob das Mitglied eine Meldung bekommt (*Push, sonst E-Mail*, ohne neuen Wert); vorbelegt nur bei der CM» — mit Anforderung A-MITGLIED-02/A-ANMELDUNG-06, Status «umgesetzt» erst in Task 7. FR-47 um «ausser die Verwaltung wählt ab (FR-56); der Wildcard-Entscheid immer» ergänzen.
- [ ] **Step 2:** `datenschutz.md` und `datenschutzerklaerung.md`: ein Satz zu persönlichen Meldungen der Verwaltung über Änderungen an den eigenen Daten (nur welches Feld, nicht der Wert). Änderungsprotokoll mit Datum 23.11.2026, #94.
- [ ] **Step 3:** `ui-leitbild.md`, Auswahlfläche: neuer Satz «Im Formular oder in einer Rückfrage gilt ein Häkchen erst mit der Taste: *Mitglied benachrichtigen* über der Haupttaste.»
- [ ] **Step 4:** `make annahmen` und `npm run lint` (Doku-Prüfungen) grün.
- [ ] **Step 5:** Commit `docs: Konzepte für Meldung bei Änderung durch die Verwaltung (#94)`.

### Task 2: Gemeinsame Bausteine — Körperfeld lesen und Feldnamen

**Files:**
- Modify: `src/lib/server/http.ts` (neue Hilfe)
- Create: `src/lib/feld-namen.ts` (`FELD_NAMEN` aus `src/lib/verwaltung/anzeige.ts` hierher verschieben; `anzeige.ts` importiert von dort)
- Test: `src/lib/server/http.test.ts` (neu)

**Interfaces:**
- Produces: `leseBenachrichtigen(koerper: Record<string, unknown>, standard: boolean): boolean | null` — `null` heisst Eingabefehler.
- Produces: `FELD_NAMEN` in `src/lib/feld-namen.ts` (gleicher Typ wie heute).

- [ ] **Step 1: Test** `leseBenachrichtigen`: fehlt → `standard` (für `true` und `false`); `true`/`false` → wie gegeben; `'ja'`, `1`, `null` → `null`.
- [ ] **Step 2:** Test rot laufen lassen (`npx vitest run src/lib/server/http.test.ts`).
- [ ] **Step 3:** Implementieren; `FELD_NAMEN` verschieben. ESLint-Importrichtung prüfen (`npm run lint`); Server darf `src/lib/feld-namen.ts` importieren wie `src/lib/fehler.ts`.
- [ ] **Step 4:** Tests und Lint grün.
- [ ] **Step 5:** Commit `feat: Körperfeld benachrichtigen lesen (#94)`.

### Task 3: Profil — Meldung nach dem Speichern durch den Mitglieder-Admin

**Files:**
- Create: `src/lib/server/admin/meldung.ts` (Texte der Verwaltung: Profil, Rolle, Zugang)
- Modify: `src/lib/server/admin/schnittstellen.ts:167-191` (`postMitglied` nimmt `MitteilungAdminDienste`)
- Modify: `src/routes/api/admin/mitglieder/[id]/+server.ts` (`holeMitteilungAdminDienste()`)
- Test: `src/lib/server/admin/schnittstellen.db.test.ts`, `src/lib/server/admin/meldung.test.ts`

**Interfaces:**
- Consumes: `leseBenachrichtigen`, `FELD_NAMEN`, `meldeMitgliedern` (`mitteilung/meldung.ts`).
- Produces: `type Meldung = { titel: string; text: string; pfad: string }`; `profilMeldung(geaendert: Feld[]): Meldung`, `rolleMeldung(rolle: Rolle, art: 'vergeben' | 'entzogen'): Meldung`, `zugangMeldung(): Meldung`; `meldeVerwaltung(d: MitteilungAdminDienste, urheber: AdminUrheber, mitgliedId: number, m: Meldung): void` (Selbst-Ausnahme, still, ohne Warten — wie `cm/verwaltung-meldung.ts`).

- [ ] **Step 1: Tests (DB)** in `schnittstellen.db.test.ts`, Dienste mit `push: null` und Mail-Attrappe wie in `cm/verwaltung-schnittstellen.db.test.ts:baue`:
  - `FR-56: mit benachrichtigen meldet die Änderung ohne Wert` → Mail an das Mitglied, Betreff `Dein Profil`, Text beginnt mit `Die Verwaltung hat dein Profil geändert: Telefon, Strasse.`, enthält den neuen Wert nicht.
  - `FR-56: ohne Angabe keine Meldung` (Review Focus 1).
  - `FR-56: nichts geändert, keine Meldung` (Review Focus 3).
  - `FR-56: eigenes Profil, keine Meldung`.
  - `FR-56: E-Mail mit Häkchen → Hinweis an alt und Meldung an neu; ohne nur Hinweis` (Review Focus 5).
  - `FR-56: benachrichtigen 'ja' → 400, nichts gespeichert` (Review Focus 2).
- [ ] **Step 2:** rot (`npx vitest run src/lib/server/admin/schnittstellen.db.test.ts`).
- [ ] **Step 3:** `meldung.ts` und `postMitglied` umsetzen; Route auf `holeMitteilungAdminDienste()`. `vorher` und `benachrichtigen` sind keine Angaben: prüfen, dass `pruefeAngaben` das Zusatzfeld duldet.
- [ ] **Step 4:** grün, dazu `routen.test.ts`/Rechte-Matrix grün.
- [ ] **Step 5:** Commit `feat: Meldung nach Profiländerung durch die Verwaltung (#94)`.

### Task 4: Rollen, Wiedereintritt und Rücknahme

**Files:**
- Modify: `src/lib/server/admin/schnittstellen.ts` (`postRolleVergeben`, `postRolleEntziehen`, `postWiedereintritt`, `postLoeschenRueckgaengig`; `uebergang` bekommt die Meldung nur für diese zwei)
- Modify: Routen `src/routes/api/admin/rollen/vergeben/+server.ts`, `…/rollen/entziehen/+server.ts`, `…/mitglieder/[id]/wiedereintritt/+server.ts`, `…/loeschen-rueckgaengig/+server.ts` → `holeMitteilungAdminDienste()`
- Test: `src/lib/server/admin/schnittstellen.db.test.ts`

**Interfaces:**
- Consumes: `rolleMeldung`, `zugangMeldung`, `meldeVerwaltung` (Task 3); `ROLLEN_NAME` (heute in `src/lib/verwaltung/rollen-namen.ts`; wie `FELD_NAMEN` nach `src/lib/` verschieben, falls der Server ihn sonst nicht importieren darf).

- [ ] **Step 1: Tests (DB):** je Schnittstelle «mit Häkchen genau eine Meldung mit dem Text aus den Global Constraints», «ohne keine» (Review Focus 1), «falscher Typ → 400, nichts geändert». Austritt und Vormerken bleiben ohne neue Meldung (bestehende Tests unverändert grün). Rolle an sich selbst: keine Meldung.
- [ ] **Step 2:** rot.
- [ ] **Step 3:** umsetzen. `uebergang` liest den Körper bisher nicht: für Wiedereintritt/Rücknahme den Körper lesen; Austritt/Löschen weiter ohne `benachrichtigen`.
- [ ] **Step 4:** grün.
- [ ] **Step 5:** Commit `feat: Meldung bei Rollen und Wiedereintritt (#94)`.

### Task 5: CM — Häkchen statt immer melden

**Files:**
- Modify: `src/lib/server/cm/verwaltung-schnittstellen.ts` (alle `melde`/`meldeAlle`-Aufrufe ausser `postEntscheid`; `postKlassierung` neu mit Meldung, nimmt `MitteilungAdminDienste`)
- Modify: `src/lib/server/turnier/schnittstellen.ts:125-137` (`postKategorieAbsagen` liest den Körper)
- Modify: `src/routes/api/admin/spieler/[id]/klassierung/+server.ts` → `holeMitteilungAdminDienste()`
- Test: `src/lib/server/cm/verwaltung-schnittstellen.db.test.ts`

**Interfaces:**
- Consumes: `leseBenachrichtigen` (Task 2), `melde` (`cm/verwaltung-meldung.ts`, unverändert).

- [ ] **Step 1: Tests (DB):**
  - Bestehende Meldungs-Tests bleiben grün (Standard `true`).
  - `FR-56: verschieben mit benachrichtigen false meldet nicht` (Review Focus 1), dasselbe für ein Doppel (`postPartnerAendern`): keiner der Beteiligten bekommt eine Meldung.
  - `FR-56: Kategorie absagen mit false meldet hinfällige Anfragen nicht`.
  - `FR-56: Klassierung mit true meldet «Der CM-Admin hat deine Klassierung geändert.», ohne Angabe nicht`.
  - `FR-56: Wildcard-Entscheid meldet auch mit benachrichtigen false`.
  - `benachrichtigen 1 → 400` bei einer Einzel- und einer Doppel-Schnittstelle (Review Focus 2).
- [ ] **Step 2:** rot.
- [ ] **Step 3:** umsetzen; `postAnmeldungLoeschen`, `postAnfrageLoeschen`, `postKategorieAbsagen` lesen dafür den Körper. Den Doc-Kommentar «ohne Meldung» an `postKlassierung` anpassen.
- [ ] **Step 4:** grün.
- [ ] **Step 5:** Commit `feat: CM-Meldungen der Verwaltung abwählbar (#94)`.

### Task 6: Oberfläche — Häkchen in Formular und Rückfragen

**Files:**
- Modify: `src/lib/verwaltung/Aktionsdialog.svelte` (Prop `benachrichtigen?: { standard: boolean; text?: string }`; ohne Prop kein Häkchen; `aktion: (trotzdem: boolean, benachrichtigen: boolean) => …`)
- Modify: Abruf-Module `src/lib/verwaltung/mitglieder-api.ts`, `zugang-api.ts`, `turnier-api.ts`: jede betroffene Funktion bekommt `benachrichtigen: boolean` als Parameter vor `holen` und schickt es im Körper
- Modify: `src/routes/verwaltung/mitglieder/[id]/+page.svelte` (Häkchen über «Speichern», leer), `src/lib/verwaltung/Mitgliedschaft.svelte` (Rückfragen Wiedereintritt und Rücknahme, leer), `src/routes/verwaltung/rollen/+page.svelte` (beide Dialoge, leer), `src/lib/verwaltung/Anmeldungsliste.svelte` und `DoppelListe.svelte` (alle Aktionen ausser Entscheid, vorbelegt; Klassierung leer), `src/routes/verwaltung/turniere/[id]/kategorien/[kid]/+page.svelte` (Absagen, vorbelegt)
- Modify: `src/lib/design/<datei der Auswahlfläche>.css` nur falls die Auswahlfläche im Dialog Abstand braucht
- Test: `src/lib/verwaltung/mitglieder-api.test.ts`, `zugang-api.test.ts`, `turnier-api.test.ts`; E2E `tests/e2e/verwaltung.test.ts` (Profil) und `tests/e2e/cm-verwaltung.test.ts` (eine CM-Aktion)

- [ ] **Step 1: Tests Abruf:** je Modul ein Test, dass `benachrichtigen` im Körper steht (true und false); Trotzdem-Weg schickt denselben Wert (Review Focus 4).
- [ ] **Step 2: E2E:** (a) Mitglieder-Admin ändert Telefon mit Häkchen → Erfolgsmeldung; Mail in Mailpit mit Betreff `Dein Profil` an das Mitglied (bestehende Mailpit-Hilfe der E2E nutzen, Adressen mit 127.0.0.1). (b) CM-Admin verschiebt mit abgewähltem Häkchen → keine Mail an den Spieler, danach eine zweite Aktion mit Häkchen → genau eine Mail. Elemente über Rolle/Beschriftung (`getByRole('checkbox', { name: 'Mitglied benachrichtigen' })`).
- [ ] **Step 3:** rot.
- [ ] **Step 4:** umsetzen; Häkchen als *Auswahlfläche* mit `type="checkbox"` nach Leitbild (Task 1).
- [ ] **Step 5:** `npm run check`, Abruf-Tests grün; `make e2e` **im Hintergrund** (`run_in_background`), grün.
- [ ] **Step 6:** Commit `feat: Häkchen «Mitglied benachrichtigen» in der Verwaltung (#94)`.

### Task 7: Abschluss und Nachweis

**Files:**
- Modify: `docs/versionen.md` (Eintrag unter «Unveröffentlicht»: «Die Verwaltung kann bei jeder Änderung wählen, ob das Mitglied eine Meldung bekommt (#94).»)
- Modify: `docs/fachmodell.md` (FR-56 «umgesetzt»), Seiteninfo-Texte der geänderten Seiten (`Seiteninfo`-Inhalte) falls sie das Melden beschreiben
- Modify: `docs/testkonzept.md` falls dort FR-47-Tests aufgezählt sind

- [ ] **Step 1:** Seiteninfo von *Mitglied*, *Rollen*, *Kategorie* prüfen; neuen Text dem Projektleiter zeigen, erst nach Ok committen.
- [ ] **Step 2:** Echter Push lokal nachgewiesen (Playwright `channel: 'chrome'`, `getNotifications()` als Beleg; siehe Memory «Push-Nachweis lokal»): Profiländerung mit Häkchen erzeugt die Notification `Dein Profil`.
- [ ] **Step 3:** Screenshot Profil-Formular mit Häkchen (Handy und PC).
- [ ] **Step 4:** `make check` grün auf dem committeten Stand (im Hintergrund).
- [ ] **Step 5:** Commit `docs: Abschluss Meldung bei Änderung (#94)`.
