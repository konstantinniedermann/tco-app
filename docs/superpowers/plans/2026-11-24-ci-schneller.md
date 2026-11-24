# CI schneller bis Test — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge mit Code auf `dev` in ~5½ statt 11 Minuten auf Test, ohne Auslieferung ungeprüfter Stände.

**Architecture:** E2E-Matrix in Playwright-Shards; `bauen` parallel zu den Prüfungen; das Tor vor der Auslieferung wandert von `bauen` zu `ausliefern` und wird von `workflow-rechte.ts` erzwungen.

**Tech Stack:** GitHub Actions, Playwright `--shard`, Vitest (Prüfskript-Tests).

**Spec:** `docs/superpowers/specs/2026-11-24-ci-schneller-design.md`

## Global Constraints

- Teile: iphone 3, android 2, desktop 1; Jobname `E2E (<gerät> <teil>/<teile>)`; Artefakt `test-results-<gerät>-<teil>`.
- Tor-Jobs: `doku`, `pruefen`, `e2e`, `malware`, `image`.
- `ausliefern` bleibt ohne npm/node/cache/artifact/uses (bestehende Regel).
- Commit-Präfixe `test:`/`fix:`/`docs:`; Dateien einzeln stagen.

## Review Focus

- Ein roter E2E-Teil muss `ausliefern` überspringen (Matrix-Ergebnis `failure`) — im Workflow über `needs.e2e.result == 'success'`.
- `ausliefern` auf `main`: Tor-Jobs laufen dort auch; `finden` ändert sich nicht.
- Doku-only-Push: Tor-Jobs übersprungen → `bauen` übersprungen → `ausliefern` übersprungen (Bedingung `bauen`/`finden` success bleibt).
- Abgebrochener Lauf (`cancelled()`): `ausliefern` läuft nicht.
- Regel fail-closed: `needs` nicht als Inline-Liste lesbar → Befund.

---

### Task 1: Tor-Regel in `workflow-rechte.ts`

**Files:** Modify `scripts/pruefungen/workflow-rechte.ts`, Test `scripts/pruefungen/workflow-rechte.test.ts`

**Interfaces:** Produces: Konstante `TOR_JOBS = ['doku', 'pruefen', 'e2e', 'malware', 'image']`; Befund `Job ausliefern: wartet nicht auf <job>` bzw. `Job ausliefern: prüft das Ergebnis von <job> nicht`; `needs:` nicht als `[…]` lesbar → `Job ausliefern: \`needs:\` nicht lesbar`. Gilt nur für `CI_DATEI`.

- [ ] Fixture `AUSLIEFERN` im Test um `needs: [bauen, finden, doku, pruefen, e2e, malware, image]` und ein `if:` mit allen `needs.<job>.result == 'success'` ergänzen.
- [ ] Tests: «meldet ausliefern ohne e2e in needs» (1 Befund mit `wartet nicht auf e2e`), «meldet ausliefern ohne Ergebnisprüfung von pruefen» (`prüft das Ergebnis von pruefen nicht`), «meldet needs als Block-Liste als nicht lesbar», «prüft die Regel in anderen Workflow-Dateien nicht». Lauf `npx vitest run scripts/pruefungen/workflow-rechte.test.ts` → rot.
- [ ] Regel umsetzen → grün; `npm run pruefungen` meldet jetzt `check.yml` (heutiges `ausliefern` ohne Tor) — erwartet bis Task 2.
- [ ] Commit `test: Prüfskript verlangt, dass ausliefern auf alle Prüfungen wartet`.

### Task 2: Workflow umbauen

**Files:** Modify `.github/workflows/check.yml`

- [ ] `e2e`: Matrix als `include` mit `geraet`, `teil`, `teile` (6 Einträge); Name `E2E (${{ matrix.geraet }} ${{ matrix.teil }}/${{ matrix.teile }})`; Aufruf `npm run e2e -- --project="$GERAET" --shard="$TEIL/$TEILE"`; Artefaktname mit Teil; Kommentar über dem Job nachführen.
- [ ] `bauen`: `needs: aenderung`; Kommentar: baut parallel, Tor liegt in `ausliefern`.
- [ ] `ausliefern`: `needs: [bauen, finden, doku, pruefen, e2e, malware, image]`; `if` = bisherige Bedingung `&&` alle Tor-Jobs `result == 'success'`.
- [ ] `npm run pruefungen` grün; `npx vitest run scripts/pruefungen` grün.
- [ ] Commit `fix: CI teilt die E2E-Tests und baut das Image parallel zu den Prüfungen`.

### Task 3: Doku, Nachweis, Merge

**Files:** `docs/ci-cd-und-release.md` (Auslieferung Schritt 2, Tabelle der Prüfungen, Actions-Minuten), `docs/versionen.md` (Unveröffentlicht)

- [ ] Doku nachführen; Eintrag «Werkzeug: Die CI teilt die E2E-Tests auf sechs Läufe und baut das Image parallel; ein Merge ist rund doppelt so schnell auf Test. An der App ändert sich nichts.»
- [ ] `make check` (Hintergrund), committen, Branch pushen, `gh workflow run check.yml --ref chore/ci-schneller`, alle Jobs grün, Dauer je Teil notieren.
- [ ] `merge-reviewer`; Merge nach `dev` (tco-branching Schritt 4); erster Lauf auf `dev` bis «Freigeben» grün, Gesamtdauer berichten.
