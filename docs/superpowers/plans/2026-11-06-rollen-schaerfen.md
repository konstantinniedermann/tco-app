# Rollen schärfen — Umsetzungsplan

> **Für ausführende Agenten:** PFLICHT-SKILL: superpowers:subagent-driven-development (empfohlen)
> oder superpowers:executing-plans, Task für Task. Schritte mit Checkbox (`- [ ]`).

**Ziel:** Statt einer Rolle `admin` gibt es vier Admin-Rollen (MyTCO-, Mitglieder-, CM-,
Lizenz-Admin). Der MyTCO-Admin liest alles, ändert nur Rollen und kann MyTCO «als» eine Rolle
ansehen, nur lesend.

**Architektur:** Die Rollen bleiben in `konto_rolle`. Neu kommen die Schlüssel `mytco` und
`mitglieder` dazu, `admin` fällt weg. Die Schnittstellen der Verwaltung prüfen pro **Bereich**
(Mitglieder, Clubmeisterschaft, Rollen) getrennt, wer liest und wer schreibt. Die *Ansicht als*
ist eine Spalte der Sitzung. Solange sie gesetzt ist, rechnet der Server mit der gewählten Rolle
statt mit den echten, und ein zentraler Riegel in `hooks.server.ts` weist jede schreibende
Anfrage ab.

**Tech-Stack:** SvelteKit (SPA, nur `+server.ts`), Drizzle + PostgreSQL, Vitest (Einheit/DB),
Playwright (E2E, Profile iPhone/Android/Desktop).

**Spec:** [`docs/superpowers/specs/2026-11-06-rollen-schaerfen-design.md`](../specs/2026-11-06-rollen-schaerfen-design.md)
(freigegeben 06.11.2026), Grundlage
[`2026-11-04-admin-mitgliederverwaltung-design.md`](../specs/2026-11-04-admin-mitgliederverwaltung-design.md).

## Globale Vorgaben

- Rollenschlüssel in Code und DB: `mytco`, `mitglieder`, `cm`, `lizenz` (Entscheid des Bauenden; `cm`/`lizenz` bleiben, damit bestehende Zeilen gelten). Anzeigenamen: «MyTCO-Admin», «Mitglieder-Admin», «CM-Admin», «Lizenz-Admin».
- Übergang: Jedes Konto mit `admin` erhält `mytco` **und** `mitglieder`, danach wird `admin` gelöscht (Spec, *Übergang im Code*). Bereits eingespielte Migrationen (`0000`–`0008`) nie neu erzeugen; Änderungen kommen als neue Migration.
- Es zählt nur ein Konto, das nicht gesperrt ist und dessen Mitglied den Status `aktiv` hat (RR-08, bleibt).
- Admin-Bestätigung per Mail-Code höchstens einmal pro 24 h je Sitzung (SI-08), für jede Rolle, die die Verwaltung öffnet (`mytco`, `mitglieder`, `cm`). `lizenz` öffnet die Verwaltung noch nicht: Den Bereich gibt es erst mit #53 (Spec, *Nicht-Ziele*).
- Ändernde Anfragen nur als JSON (SI-10); Fehler- und Erfolgsantworten ohne Personendaten. Logs ohne Adressen und Codes (SI-05): Die DB-Tests der Schnittstellen prüfen, dass nichts geloggt wird.
- Der Änderungsverlauf ohne Werte (FR-26): Rollen erscheinen als `detail` mit dem Schlüssel.
- Oberfläche nur aus `docs/ui-leitbild.md`. Neues (Band *Ansicht als*, Hinweis *Nur ansehen*) kommt zuerst ins Leitbild, dann in den Code.
- Svelte-Code nur nach aktueller Doku über den Svelte-MCP-Server, jede geänderte Komponente durch `svelte-autofixer`.
- Nur erfundene Testdaten (DS-08). Keine neuen Dependencies.
- Annahme K-18.4 (Besetzung der Rollen) an der wirkenden Stelle markieren: Kommentar `// Annahme K-18.4: …` in `erster-admin.ts` und in `scripts/testdaten.ts`.

## Review-Fokus

1. **MyTCO-Admin schreibt über eine vergessene Schnittstelle.** Jede schreibende Admin-Schnittstelle antwortet ihm `403 kein-recht`. Ein Test geht `ADMIN_SCHNITTSTELLEN` und `TURNIER_SCHNITTSTELLEN` vollständig durch (Task 3).
2. **Ansicht läuft weiter, nachdem `mytco` entzogen wurde.** Dann gilt die Ansicht nicht mehr: echte Rollen, kein Riegel (Task 4).
3. **Schreiben während der Ansicht ausserhalb der Verwaltung** (Profil, Anmeldung zum Anlass, Passkey) wird abgewiesen. *Beenden*, Logout und Mail-Code der Verwaltung gehen weiter (Task 4).
4. **Zwei MyTCO-Admins ändern gleichzeitig die Rollen derselben Person.** Wer zuletzt speichert und einen veralteten Stand hat, bekommt `409 veraltet`, statt den anderen still zu überschreiben (Task 2, Befund aus der Beobachtungs-Auswertung vom 06.11.2026).
5. **Mitglieder-Admin ändert die E-Mail eines anderen Kontos.** Die alte Adresse erhält den Hinweis. Scheitert die Mail, ist die Änderung trotzdem gespeichert, und es gibt nur eine feste Logzeile (Task 1).

---

### Task 1: Hinweis an die alte Adresse, wenn die Verwaltung eine E-Mail ändert (SI-09)

Voraussetzung für den Umbau (Spec, Regel 9). Die Selbständerung (#50) bleibt unverändert.

**Files:**
- Modify: `src/lib/server/admin/mitglieder.ts` (`aendereAngaben`)
- Modify: `src/lib/server/admin/schnittstellen.ts` (`AdminDienste`, `postMitglied`)
- Modify: `src/lib/server/admin/index.ts` (Mailer und Kontakt in die Dienste)
- Create: `src/lib/server/admin/hinweis-mail.ts`
- Test: `src/lib/server/admin/hinweis-mail.test.ts`, `src/lib/server/admin/schnittstellen.db.test.ts`, `src/lib/server/admin/mitglieder.db.test.ts`

**Interfaces:**
- Produces: `baueEmailHinweisMail(kontakt: string): { betreff: string; text: string }`; `AdminDienste` erhält `hinweis: (an: string) => Promise<void>` (wirft nie, Fehler → `console.error('Hinweis-Mail nicht versandt')`); `aendereAngaben` liefert bei `ok` zusätzlich `alteEmail: string | null` (gesetzt nur, wenn `email` unter `geaendert` ist).

- [ ] **Schritt 1: Failing Tests.**
  - `hinweis-mail.test.ts` › `«Hinweis nennt keine Adressen und den Kontakt»`: Betreff und Text genau so (vom Projektleiter am 06.11.2026 festgelegt), ohne alte oder neue Adresse:
    ```text
    Betreff: Deine E-Mail-Adresse in MyTCO wurde geändert

    Die Verwaltung von MyTCO hat die E-Mail-Adresse deines Kontos geändert. Mails von MyTCO gehen ab jetzt an die neue Adresse, auch der Code zum Anmelden.

    Hast du diese Änderung nicht verlangt? Dann melde dich bitte bei <kontakt>.
    ```
  - `mitglieder.db.test.ts` › `«aendereAngaben meldet die alte Adresse nur bei geänderter E-Mail»`: E-Mail geändert → `alteEmail` = alte Adresse; nur Telefon geändert → `alteEmail === null`.
  - `schnittstellen.db.test.ts` › `«postMitglied schickt den Hinweis an die alte Adresse»`: `hinweis` als Spion, E-Mail ändern → genau ein Aufruf mit der alten Adresse; Änderung ohne E-Mail → kein Aufruf. Dazu `«scheitert der Hinweis, bleibt die Änderung gespeichert»`: Spion wirft nicht (Vertrag), aber ein Mailer, der wirft, führt im echten `hinweis` zu genau einer Logzeile `'Hinweis-Mail nicht versandt'` (für diesen Test den Log-Spion der Datei gezielt erwarten und zurücksetzen).
- [ ] **Schritt 2:** `npx vitest run src/lib/server/admin/hinweis-mail.test.ts` und `make test` → FAIL.
- [ ] **Schritt 3: Umsetzen.** `hinweis` wird erst nach dem Commit der Transaktion aufgerufen und nicht abgewartet (`void d.hinweis(alt)`), damit die Antwortzeit nichts verrät und kein Mailfehler die Antwort ändert. In `index.ts` derselbe umgeleitete Mailer wie für den Zugang (`leiteUm(...)`). Die Mail zählt gegen die Grenze der Empfänger-Adresse (SI-04: `bremsen.mailsProAdresseStunde/Tag`). Ist die Grenze erreicht, geht still keine Mail hinaus.
- [ ] **Schritt 4:** Tests → PASS.
- [ ] **Schritt 5:** In `docs/sicherheitskonzept.md` bei SI-09 den zitierten Hinweistext («Falls du das nicht warst …») durch den neuen Wortlaut ersetzen. Den Satz «der Hinweis bei einer Änderung durch den Admin fehlt noch …» ersetzen durch den gebauten Stand. Commit `feat: Hinweis an die alte Adresse, wenn die Verwaltung die E-Mail ändert (SI-09)`.

### Task 2: Rollen im Datenmodell, Übergang und RR-03 für den MyTCO-Admin

**Files:**
- Modify: `src/lib/server/db/schema.ts` (`konto_rolle_rolle_check`)
- Create: `drizzle/0009_rollen_schaerfen.sql` (per `npx drizzle-kit generate`, danach die Datenübernahme von Hand in dieselbe Datei, **vor** dem neuen Check)
- Modify: `src/lib/server/admin/rollen.ts`, `src/lib/server/admin/erster-admin.ts`, `src/lib/server/admin/schnittstellen.ts` (`postRollen`, `leseRollen`), `src/lib/verwaltung/api.ts` (`speichereRollen`), `scripts/seed-lokal.ts`, `scripts/testdaten.ts`, `tests/e2e/hilfen/login.ts`
- Test: `src/lib/server/admin/rollen.db.test.ts`, `src/lib/server/admin/erster-admin.db.test.ts`, `src/lib/server/admin/schnittstellen-letzter-admin.db.test.ts`, neu `src/lib/server/db/migration-0009.db.test.ts`

**Interfaces:**
- Produces:
  - `ROLLEN = ['mytco', 'mitglieder', 'cm', 'lizenz'] as const`, `type Rolle`
  - `VERWALTUNGSROLLEN = ['mytco', 'mitglieder', 'cm'] as const`, `type VerwaltungsRolle`
  - `ROLLEN_NAME: Record<Rolle, string>` (Anzeigenamen wie in *Globale Vorgaben*), in `src/lib/verwaltung/rollen-namen.ts` (vom Browser importierbar, ohne Server-Code)
  - `istMytcoAdmin(db: DbOderTx, kontoId: number): Promise<boolean>` (ersetzt `istAdmin`)
  - `setzeRollen(db, urheber, kontoId, rollen: Rolle[], vorher: Rolle[], jetzt): Promise<'ok' | 'letzter-mytco' | 'veraltet' | 'nicht-gefunden'>`
  - `postRollen` liest `{ rollen, vorher }`; Antworten `409 { fehler: 'letzter-mytco' }`, `409 { fehler: 'veraltet' }`
  - `speichereRollen(id, rollen, vorher, holen?)`

- [ ] **Schritt 1: Failing Tests.**
  - `migration-0009.db.test.ts` › `«admin wird zu mytco und mitglieder»`: Datenbank auf Stand `0008` (Helfer `tests/hilfen/eigene-datenbank.ts`), Konto mit `admin` und `cm` → nach `0009`: genau `{mytco, mitglieder, cm}`. Danach scheitert das Einfügen von `admin` am Check.
  - `rollen.db.test.ts`: `«der letzte MyTCO-Admin kann mytco nicht abgeben»` → `'letzter-mytco'`; `«ein gesperrter zweiter MyTCO-Admin zählt nicht»` → `'letzter-mytco'`; `«veralteter Stand wird abgewiesen»`: `vorher` ≠ gespeichert → `'veraltet'`, nichts geändert, kein Verlaufseintrag; `«mitglieder entziehen ist ohne Untergrenze»` → `'ok'`.
  - `erster-admin.db.test.ts`: Der erste Admin bekommt `mytco` und `mitglieder`; besteht er schon mit `mytco`, gibt es `'schon-admin'`.
  - `schnittstellen-letzter-admin.db.test.ts`: auf `letzter-mytco` umstellen; neu `«postRollen ohne vorher → 400 eingabe»`.
- [ ] **Schritt 2:** DB-Tests → FAIL.
- [ ] **Schritt 3: Umsetzen.** Migration in dieser Reihenfolge: (1) Check fallen lassen, (2) `insert … select konto_id, 'mytco' … where rolle = 'admin' on conflict do nothing` und dasselbe für `'mitglieder'`, (3) `delete … where rolle = 'admin'`, (4) neuer Check `rolle in ('mytco','mitglieder','cm','lizenz')`. `setzeRollen` vergleicht `vorher` (als Menge) innerhalb der Sperre `SPERRE_ROLLEN` mit dem gespeicherten Stand. `seed-lokal.ts`: Die bisherige Admin-Persona bekommt `mytco` + `mitglieder`. Neu eine Persona nur `mitglieder` und eine nur `mytco`, jeweils erfunden und im Kommentar des Skripts genannt. `testdaten.ts` und `erster-admin.ts`: `mytco` + `mitglieder` mit Marker `Annahme K-18.4`. Mitglied-Seite: Rollen-Block schickt `vorher` mit und zeigt bei `veraltet` dieselbe Meldung wie die Angaben.
- [ ] **Schritt 4:** DB-Tests → PASS; `npx svelte-check` ohne Fehler.
- [ ] **Schritt 5:** Commit `feat: vier Admin-Rollen im Datenmodell, Übergang von admin (#43)`.

### Task 3: Bereiche — wer liest, wer schreibt (Regeln 2, 3, 4, 7)

**Files:**
- Modify: `src/lib/server/admin/schnittstellen.ts`, `src/lib/server/turnier/schnittstellen.ts`, `src/lib/server/admin/zugang.ts` (`Zugang.rollen` bleibt `VerwaltungsRolle[]`)
- Create: `src/lib/server/admin/bereiche.ts`, `src/routes/api/admin/rollen/+server.ts`
- Modify: `src/lib/server/admin/rollen.ts` (`listeRollen`)
- Test: neu `src/lib/server/admin/bereiche.test.ts`, neu `src/lib/server/admin/rechte-matrix.db.test.ts`; bestehende `schnittstellen.db.test.ts` und Turnier-Tests auf die neuen Rollen umstellen

**Interfaces:**
- Produces (in `bereiche.ts`, ohne DB):
  - `type Bereich = 'mitglieder' | 'cm' | 'rollen'`
  - `BEREICHE: Record<Bereich, { lesen: readonly VerwaltungsRolle[]; schreiben: readonly VerwaltungsRolle[] }>` mit genau: `mitglieder: { lesen: ['mitglieder','mytco'], schreiben: ['mitglieder'] }`, `cm: { lesen: ['cm','mytco'], schreiben: ['cm'] }`, `rollen: { lesen: ['mytco'], schreiben: ['mytco'] }`
  - `darf(rollen: readonly VerwaltungsRolle[], bereich: Bereich, art: 'lesen' | 'schreiben'): boolean`
- Produces (in `schnittstellen.ts`, ersetzen `mitAdmin`, `mitCm`, `aendernd`, `aenderndCm`):
  - `liest(d, e, bereich: Bereich, fn: (mitgliedId: number) => Promise<Response>)`
  - `schreibt(d, e, bereich: Bereich, fn: (urheber: AdminUrheber, koerper: Record<string, unknown>) => Promise<Response>)`. Verweigert mit `403 { fehler: 'kein-recht' }`, wenn die Rolle den Bereich lesen, aber nicht schreiben darf; `403 kein-admin` bleibt für «Bereich gar nicht offen».
  - `getRollen` (GET `/api/admin/rollen`, Bereich `rollen`): `{ rolle: Rolle; mitglieder: { id: number; name: string }[] }[]`, nur aktive, nicht gesperrte Konten, Reihenfolge wie `ROLLEN`. In `ADMIN_SCHNITTSTELLEN` aufnehmen (Bauregel).
- Zuordnung: Mitglieder, Mitglied, Rollen-**Anzeige** im Detail, Verlauf, Fairgate, Anlässe → `mitglieder`; `postRollen` → `rollen`; Turniere, Kategorien → `cm`; `postSitzungen` und `postMitglied`/`postMitglieder` → `schreibt('mitglieder')`.

- [ ] **Schritt 1: Failing Tests.**
  - `bereiche.test.ts`: Tabelle aller 3 Rollen × 3 Bereiche × 2 Arten gegen die Matrix der Spec (*Rechte*), z. B. `darf(['mytco'],'mitglieder','schreiben') === false`, `darf(['mytco'],'rollen','schreiben') === true`, `darf(['mitglieder'],'rollen','lesen') === false`, `darf(['cm'],'mitglieder','lesen') === false`.
  - `rechte-matrix.db.test.ts` › `«MyTCO-Admin: jede schreibende Schnittstelle ausser Rollen → 403 kein-recht»`: über alle Einträge von `ADMIN_SCHNITTSTELLEN` und `TURNIER_SCHNITTSTELLEN`, deren Name mit `post` beginnt, ausser `postRollen`, `postZugang`, `postZugangCode` und den Ansicht-Schnittstellen aus Task 4. Mit bestätigter Sitzung und gültigem JSON-Körper. Erwartet `403` und `kein-recht`, DB unverändert (Anzahl Zeilen in `mitglied`, `anlass`, `turnier`, `aenderung` gleich). Ein neuer `post…`-Eintrag fällt so automatisch unter den Test.
  - Weitere Fälle in derselben Datei: `«Mitglieder-Admin: postRollen → 403 kein-admin»`, `«CM-Admin: getMitglieder → 403 kein-admin»`, `«MyTCO-Admin liest Mitglieder, Turniere, Verlauf → 200»`, `«getRollen listet nur aktive, nicht gesperrte Konten»`.
- [ ] **Schritt 2:** → FAIL.
- [ ] **Schritt 3:** Umsetzen. `mitRolle` wird zur gemeinsamen Prüfung mit `(bereich, art)`. Reihenfolge der Prüfungen bleibt: abgemeldet → Bereich nicht lesbar (`kein-admin`) → unbestätigt → nur lesbar bei Schreiben (`kein-recht`).
- [ ] **Schritt 4:** → PASS, inkl. `make check-schnell` (enthält die Bauregel).
- [ ] **Schritt 5:** Commit `feat: Verwaltung prüft pro Bereich Lesen und Schreiben (#43)`.

### Task 4: *Ansicht als …* auf dem Server

**Files:**
- Modify: `src/lib/server/db/schema.ts` (`sitzung.ansichtRolle: text('ansicht_rolle')`, nullable, Check: `null` oder `in ('mitglied','mitglieder','cm','lizenz')`)
- Create: `drizzle/0010_ansicht.sql`
- Modify: `src/lib/server/login/sitzung.ts` (`AngemeldetesKonto.ansicht`, `pruefeSitzung`), `src/lib/server/admin/zugang.ts`, `src/lib/server/login/schnittstellen.ts` (`getSitzung`), `src/lib/server/admin/schnittstellen.ts`, `src/hooks.server.ts`
- Create: `src/lib/server/admin/ansicht.ts`, `src/routes/api/admin/ansicht/+server.ts`, `src/routes/api/admin/ansicht/beenden/+server.ts`
- Test: neu `src/lib/server/admin/ansicht.db.test.ts`, neu `src/lib/server/ansicht-riegel.test.ts`

**Interfaces:**
- Produces:
  - `type AnsichtRolle = 'mitglied' | 'mitglieder' | 'cm' | 'lizenz'`; `AngemeldetesKonto.ansicht: AnsichtRolle | null`. `pruefeSitzung` liefert die Ansicht nur, solange das Konto `mytco` hat (Teilabfrage auf `konto_rolle` in derselben Abfrage), sonst `null`.
  - `effektiveRollen(echte: VerwaltungsRolle[], ansicht: AnsichtRolle | null): VerwaltungsRolle[]`: ohne Ansicht `echte`, mit `'mitglied'` oder `'lizenz'` `[]`, sonst `[ansicht]`. `zugang.pruefe` und `getSitzung` (`verwaltung`) rechnen damit. `getSitzung` liefert zusätzlich `ansicht: AnsichtRolle | null`.
  - `postAnsicht` (POST `/api/admin/ansicht`, `{ rolle: AnsichtRolle }`): nur mit **echter** Rolle `mytco` und bestätigter Sitzung, sonst `403 kein-admin` bzw. `403 unbestaetigt`; `200 {}`. `postAnsichtBeenden` (POST `/api/admin/ansicht/beenden`): setzt `null`, `200 {}`, auch ohne Rolle (idempotent). Beide in `ADMIN_SCHNITTSTELLEN`. Kein Verlaufseintrag.
  - In `src/lib/server/admin/ansicht.ts`: `ERLAUBT_IN_ANSICHT = ['/api/admin/ansicht/beenden', '/api/logout', '/api/admin/zugang', '/api/admin/zugang/code'] as const` und `riegel(methode: string, pfad: string, ansicht: AnsichtRolle | null): Response | null`. Er antwortet `403 { fehler: 'nur-ansehen' }` für jede Methode ausser `GET`/`HEAD` unter `/api/`, wenn `ansicht !== null` und der Pfad nicht in der Liste steht. `hooks.server.ts` ruft ihn nach `ladeSitzungSicher` auf.

- [ ] **Schritt 1: Failing Tests.**
  - `ansicht-riegel.test.ts`: `riegel('POST','/api/profil','cm')` → 403 `nur-ansehen`; `riegel('POST','/api/logout','cm')` → `null`; `riegel('GET','/api/admin/mitglieder','cm')` → `null`; `riegel('POST','/api/profil',null)` → `null`; `riegel('DELETE','/api/passkey','mitglied')` → 403.
  - `ansicht.db.test.ts`: `«MyTCO-Admin schaltet Ansicht CM-Admin ein: getZugang zeigt rollen ['cm']»`; `«Mitglieder-Admin ohne mytco: postAnsicht → 403 kein-admin»`; `«unbestätigt: postAnsicht → 403 unbestaetigt»`; `«Ansicht Mitglied: getSitzung verwaltung false, ansicht 'mitglied'»`; `«mytco entzogen: Ansicht gilt nicht mehr, echte Rollen zurück»`; `«in der Ansicht scheitert eine Anmeldung zum Anlass mit 403 nur-ansehen und ändert nichts»` (über den Riegel und die echte Anlass-Schnittstelle); `«Logout beendet die Ansicht»` (Sitzung weg); `«eine zweite Sitzung desselben Kontos sieht keine Ansicht»`; `«ungültige Rolle → 400 eingabe»`.
- [ ] **Schritt 2:** → FAIL.
- [ ] **Schritt 3:** Umsetzen (Migration per `drizzle-kit generate`).
- [ ] **Schritt 4:** → PASS.
- [ ] **Schritt 5:** Commit `feat: Ansicht als … nur lesend, auf dem Server durchgesetzt (#43)`.

### Task 5: Oberfläche — Bereiche, Nur ansehen, Rollen, Band

**Files:**
- Modify zuerst: `docs/ui-leitbild.md` (Bausteine: `.ansicht-band` in der Bausteinliste, liegt über der Kopfleiste, Farbe aus bestehenden Tokens, Text «Ansicht als <Rolle> — nur ansehen» und Taste *Beenden*. Dazu `.hinweis` *Nur ansehen* oben auf Verwaltungsseiten, die die Rolle nur lesen darf. Formulare stehen dann in `<fieldset disabled>`, ihre Absende- und Aktions-Tasten fehlen.)
- Modify: `src/routes/+layout.svelte` (Band in App und Verwaltung), `src/routes/verwaltung/+layout.ts`, `src/routes/verwaltung/+layout.svelte`, `src/lib/verwaltung/umleiten.ts`, `src/lib/verwaltung/api.ts`, alle Verwaltungsseiten mit Formularen oder Aktions-Tasten unter `src/routes/verwaltung/` (mitglieder, mitglieder/neu, mitglieder/[id], anlaesse/…, fairgate, turniere/…)
- Create: `src/routes/verwaltung/rollen/+page.svelte`, `src/routes/verwaltung/rollen/+page.ts`, `src/lib/verwaltung/AnsichtWahl.svelte`
- Test: `src/lib/verwaltung/umleiten.test.ts` (neu oder erweitert), `tests/e2e/verwaltung.test.ts`, `tests/e2e/turnier.test.ts`

**Interfaces:**
- Consumes: `darf`, `BEREICHE` (Task 3; für den Browser nach `src/lib/verwaltung/bereiche.ts` verschieben und vom Server importieren, damit es nur eine Tabelle gibt), `ROLLEN_NAME` (Task 2), `getSitzung.ansicht` und die Ansicht-Schnittstellen (Task 4).
- Produces: Layout-Daten `{ rollen, darfLesen: Record<Bereich, boolean>, darfSchreiben: Record<Bereich, boolean>, ansicht }`; `startziel(rollen)`: `mitglieder`/`mytco` → `/verwaltung/mitglieder`, nur `cm` → `/verwaltung/turniere`.

- [ ] **Schritt 1:** Leitbild nachführen (Baustein, Regel und Text wie oben), Commit `docs: Leitbild – Band Ansicht als und Nur ansehen (#43)`.
- [ ] **Schritt 2: Failing Tests.**
  - `umleiten.test.ts`: `startziel(['mytco'])` → Mitglieder; `startziel(['cm'])` → Turniere. Eine Seite ausserhalb der lesbaren Bereiche leitet zum `startziel` um, z. B. `/verwaltung/rollen` für `['mitglieder']`.
  - `verwaltung.test.ts` › `«MyTCO-Admin vergibt eine Rolle, schaut als CM-Admin, kann nicht absenden, beendet die Ansicht»`: Persona nur `mytco` aus Task 2. Rolle `cm` an ein erfundenes Mitglied vergeben, in der Rollen-Übersicht erscheint es unter «CM-Admin». Dann *Ansicht als* «CM-Admin», das Band ist sichtbar, die Seitenleiste zeigt nur Clubmeisterschaft, auf der Turnierseite fehlt die Taste zum Speichern, und ein direkter `fetch`-POST aus der Seite liefert 403. Nach *Beenden* ist das Band weg. Dazu `«Mitglieder-Admin sieht keine Rollenvergabe»` und `«MyTCO-Admin sieht Mitglied nur lesend (fieldset disabled, Hinweis Nur ansehen)»`. Am Ende jedes Tests axe ohne Verstösse. Screenshot iPhone-Profil der Turnierseite mit Band nach `test-results/` (Pfad im Bericht).
- [ ] **Schritt 3:** → FAIL.
- [ ] **Schritt 4:** Umsetzen. Die Seitenleiste zeigt die Bereiche nach `darfLesen`, dazu «Rollen» für `mytco`. *Ansicht als* wählt man auf der Rollen-Seite: Auswahl der 4 Ansicht-Rollen, Taste «Ansehen». Nach dem Einschalten geht es zur Startseite der gewählten Rolle (Verwaltung oder `/` bei «Mitglied»). Das Band liest `ansicht` aus `/api/sitzung` und lädt nach *Beenden* neu (`invalidateAll`). Antwortet der Server `nur-ansehen`, zeigt die Seite die Meldung «In der Ansicht kannst du nichts speichern.»
- [ ] **Schritt 5:** E2E → PASS auf iPhone, Android, Desktop; `svelte-autofixer` sauber.
- [ ] **Schritt 6:** Commit `feat: Verwaltung nach Rollen, Rollen-Übersicht und Band Ansicht als (#43)`.

### Task 6: Doku nachführen und Abschluss

**Files:** `docs/rollen-und-rechte.md` (RR-02, -03, -07, -09 ersetzen, neue Nummern, Matrix), `docs/anforderungen/anforderungen.md` (A-ROLLE-01, -02 umschreiben, -07, -08 umbenennen, neue Anforderung *Ansicht als*, Änderungsprotokoll), `docs/glossar.md`, `docs/fachmodell.md`, `docs/datenschutz.md` (*Wer sieht was*: MyTCO-Admin liest alles, Zweck), `docs/datenschutzerklaerung.md` (wer welche Rolle hat, was sie sehen, wozu), `docs/sicherheitskonzept.md` (SI-08, SI-12, B-04, B-08, Restrisiko Regel 9), `docs/superpowers/specs/2026-11-05-gv-anmeldung-design.md` und `2026-11-06-cm-anmeldung-design.md` (Admin → Mitglieder-Admin bzw. «nur lesen»), `docs/context-scopes.md` (neue Pfade), `docs/testkonzept.md` (Rechte-Matrix-Test), `betrieb/README.md` (erster Admin wird MyTCO- und Mitglieder-Admin), `docs/versionen.md` unter «Unveröffentlicht».

- [ ] **Schritt 1:** Doku nachführen, knapp (Konzepte minimal). Für jede geänderte Datei `make annahmen K=K-18.4` laufen lassen, neue Dateien vorher stagen.
- [ ] **Schritt 2:** `make check` grün auf dem committeten Stand.
- [ ] **Schritt 3:** Review: `/code-review` und Agent `cas-reviewer`; Befunde beheben oder begründen.
- [ ] **Schritt 4:** Commit `docs: Rollen und Rechte, Datenschutz und Sicherheit nach dem Rollen-Umbau (#43)`; Merge nach `dev` nach `tco-branching` Schritt 4 (Nebenversion `minor`: spürbar neue Rollen). Im Issue kommentieren, was erledigt ist. Danach Etappe 2.
