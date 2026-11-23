# Einstellungen eines Mitglieds in der Verwaltung — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Detailseite eines Mitglieds in der Verwaltung zeigt den aktuellen Stand seiner Einstellungen (Themen, Geräte mit Push, Passkeys).

**Architecture:** `ladeMitglied` liefert im `Detail` ein neues Feld `einstellungen`, geladen in einem eigenen Modul `src/lib/server/admin/mitglied-einstellungen.ts`. Die Seite zeigt es in einer neuen Klappe «Einstellungen». Keine neue Schnittstelle, keine Migration.

**Tech Stack:** SvelteKit, Drizzle/PostgreSQL, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-einstellungen-mitglied-design.md`

## Global Constraints

- Keine Geheimnisse im Detail: kein Push-Endpunkt, `p256dh`, `auth`, keine Passkey-Kennung oder Schlüssel, keine Sitzungs-Hashes.
- Nur gültige Sitzungen (Sitzungsversion des Kontos, nicht abgelaufen) zählen als Gerät.
- Left-Join flach selektieren (verschachteltes Objekt wird `null`).
- Oberfläche nur aus Bausteinen des UI-Leitbilds (`.karte.klappe`, `.tabelle`); kein `<style>`.
- Doku: Zweck «Hilfe bei Problemen» in `docs/datenschutz.md` und `docs/datenschutzerklaerung.md`.

## Review Focus

- Mitglied ohne Sitzung, ohne Passkey: Klappe zeigt «Kein Gerät angemeldet.» / «Kein Passkey.», kein Absturz.
- Push-Abo an einer abgelaufenen oder durch Versionswechsel ungültigen Sitzung: erscheint nicht als Gerät.
- Alle Themen aus: «keine» statt leerer Zeile.
- Ausgetretenes Mitglied (Sitzungen weg): Themen bleiben sichtbar, Geräte leer.
- Antwort-JSON enthält keine Geheimnisse (Test mit erkennbaren Werten).

---

### Task 1: Einstellungen laden

**Files:**
- Create: `src/lib/server/admin/mitglied-einstellungen.ts`
- Modify: `src/lib/server/admin/mitglieder.ts` (Typ `Detail`, `ladeMitglied`)
- Test: `src/lib/server/admin/mitglied-einstellungen.db.test.ts` (eigene DB per `legeEigeneDatenbankAn`)

**Interfaces:**
- Produces:
  ```ts
  export type MitgliedEinstellungen = {
    themen: Thema[];                       // Reihenfolge anlaesse, cm, verein
    geraete: { angemeldetAm: Date; zuletztGenutzt: Date; pushSeit: Date | null }[]; // zuletzt genutzt zuerst
    passkeys: { geraet: string; eingerichtetAm: Date; zuletztBenutzt: Date | null }[]; // eingerichtet aufsteigend
  };
  export async function ladeMitgliedEinstellungen(db: DbOderTx, kontoId: number, jetzt: Date): Promise<MitgliedEinstellungen>;
  // Detail.einstellungen: MitgliedEinstellungen
  ```

- [ ] Test: zwei Sitzungen (eine mit Push), eine abgelaufene Sitzung mit Push, Passkey «iPhone», `themaCm=false` → `themen` = `['anlaesse','verein']`, `geraete` hat 2 Einträge, neueste zuerst, nur einer mit `pushSeit`; `passkeys` = `[{geraet:'iPhone',…}]`; `JSON.stringify(detail)` enthält kein `GEHEIM`.
- [ ] Test: Mitglied ohne alles → `geraete: []`, `passkeys: []`, `themen` alle drei.
- [ ] Rot laufen lassen, implementieren, grün, committen (`feat:`).

### Task 2: Klappe «Einstellungen» auf der Detailseite und Doku

**Files:**
- Modify: `src/routes/verwaltung/mitglieder/[id]/+page.svelte` (neue Klappe nach «Login»)
- Modify: `docs/datenschutz.md`, `docs/datenschutzerklaerung.md`, `docs/versionen.md` (Unveröffentlicht)
- Test: `tests/e2e/verwaltung.test.ts` (neuer Test)

- Klappe `details.karte.klappe`, Titel «Einstellungen», Kurzinfo «Push auf N Geräten» / «ohne Push».
- Zeile «Mitteilungen: Anlässe, Clubmeisterschaft» (Namen aus bestehender `THEMA`-Abbildung) bzw. «keine».
- Tabelle «Geräte» mit Kopf *Angemeldet · Zuletzt genutzt · Push* (Push: «an seit TT.MM.JJJJ» / «aus»), benannte Region.
- Liste «Passkeys»: «iPhone · eingerichtet … · zuletzt …».
- [ ] E2E: Mitglieder-Admin öffnet Detail eines Mitglieds mit Sitzung → Region «Einstellungen» zeigt Themen und Zeile mit Push «aus»; rot, dann grün; Screenshot.
- [ ] Doku-Zweck ergänzen, Eintrag in `versionen.md`, committen.
