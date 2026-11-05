# Eigene Angaben im Profil ändern — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Mitglied ändert im Profil Telefon, Adresse und Lizenznummer selbst und wechselt seine
E-Mail-Adresse mit je einem Code an die alte und die neue Adresse; der Admin hakt selbst geänderte
Kontaktangaben in der Liste «Für Fairgate» ab.

**Architecture:** Neue Fachlogik in `src/lib/server/profil/` (eigene Angaben, E-Mail-Wechsel mit
Speicher im Arbeitsspeicher), zusammengesteckt in `profil/index.ts` wie Login und Admin; die
Schnittstellen als Funktionen in `profil/schnittstellen.ts`, die `+server.ts` unter
`src/routes/api/profil/` rufen sie nur auf. «Für Fairgate» erweitert das Admin-Modul (eine Spalte
am Mitglied, zwei Schnittstellen im Wächter `mitAdmin`). Oberfläche: Profil nach Variante A,
Unterseite `/profil/email`, Verwaltungsseite `/verwaltung/fairgate`.

**Tech Stack:** SvelteKit, Svelte 5 (Runes), Drizzle + PostgreSQL, Vitest (`einheit`, `datenbank`),
Playwright + axe, Mailpit. Keine neuen Pakete.

**Spec:** `docs/superpowers/specs/2026-11-05-eigene-angaben-aendern-design.md` — jede Aufgabe gilt
zusammen mit dem Spec. Visueller Entwurf: https://claude.ai/artifact/GFs8jg4p9W4V1UxRNdnsjF
(Artboards «Profil A», «E-Mail ändern 1–3», «Verwaltung – Für Fairgate»).

**Entscheid beim Planen:** Der laufende E-Mail-Wechsel liegt **im Arbeitsspeicher** (wie
`ChallengeSpeicher`), nicht in der Datenbank. Der Spec lässt Tabelle oder Spalten offen; der
Arbeitsspeicher erfüllt «höchstens 15 Minuten gültig, spätestens nach 24 Stunden weg» ohne
Aufräum-Job und ohne Migration, und es gibt nur einen App-Prozess (wie bei den Bremsen). Ein
Neustart verwirft angefangene Wechsel; das Mitglied fordert neue Codes an.

## Global Constraints

- Keine neuen Pakete. Blockt `dep-guard`, anhalten und melden.
- Vor jedem Svelte-/SvelteKit-Code die Doku über den Svelte-MCP holen und `svelte-autofixer` laufen
  lassen (CLAUDE.md).
- Unter `src/routes` nur `+server.ts`, `+page.svelte`, `+page.ts`, `+layout.*` (ADR-002).
- Ändernde Anfragen nur mit `application/json`, sonst 415 `{ fehler: 'format' }`; alle Antworten
  über `antwort()` aus `login/schnittstellen.ts` (`cache-control: no-store`). Ohne Sitzung 401
  `{ fehler: 'abgemeldet' }`.
- Logs: nie Code, E-Mail-Adresse, IP oder Werte aus Mitgliederdaten (SI-05, DS-06); nur feste Texte.
- Änderungsverlauf ohne Werte, nur Feldnamen (FR-26).
- Wechsel-Codes: 6 Ziffern (`erzeugeMailCode`), gültig 15 Minuten (`MAIL_CODE_GUELTIG_MS`), nach 5
  Fehlversuchen ungültig (`MAIL_CODE_MAX_FEHLVERSUCHE`), nur als HMAC im Speicher.
- Grenzen: 3 Wechsel-Anfragen pro Konto und Stunde, 10 pro Tag; jede Mail zählt in
  `mailsProAdresseStunde`/`mailsProAdresseTag` der Empfänger-Adresse (klein geschrieben, getrimmt);
  jede Anfrage in `anfragenProIp` (über `ipSchluessel`).
- Annahmen im Code als Kommentar `Annahme K-19.1` (Telefon, Lizenznummer, E-Mail) bzw. `Annahme
  K-19.2` (Adresse, Liste «Für Fairgate»), damit `make annahmen K=K-19` sie findet.
- Oberfläche nur aus Tokens und Bausteinen des Leitbilds (`karte klappe`, `kachel`, `taste-haupt`,
  `taste-neben`, `feld`, `feld-code`, `zaehler`, `zurueck`, `hinweis`, `tabelle`, `seitenleiste`);
  höchstens eine Haupttaste pro Bildschirm (UI-04). Texte duzen, Schweizer Schreibweise.
- Testdaten nur erfunden, Adressen `@example.org`. Testnamen nennen die IDs (`A-KONTO-01: …`,
  `A-KONTO-02: …`, `SI-09: …`, `FR-26: …`).
- Imports mit `.ts`-Endung. Prettier und ESLint grün. Vor der Migration `git merge origin/dev`.
- Commits mit Präfix, Dateien einzeln stagen, Attributionszeilen der Session am Ende.

## Review Focus

1. **Zwei Tabs:** Das Mitglied öffnet das Profil zweimal und speichert in beiden. Erwartet: die
   zweite Anfrage bekommt 409 `veraltet`, die Seite lädt den neuen Stand, nichts wird still
   überschrieben. Test in Task 2.
2. **Neue Adresse = bisherige Adresse in anderer Schreibweise** (`Lea.Beispiel@EXAMPLE.org`).
   Erwartet: 400 `{ fehler: 'gleich' }`, keine Mail, kein Zählen. Test in Task 3.
3. **Codes vertauscht eingetippt** (Code der neuen Adresse ins Feld der alten). Erwartet: `falsch`,
   ein Fehlversuch gezählt, nach 5 Versuchen ist der Wechsel weg. Test in Task 3.
4. **Admin ändert die E-Mail, während ein Wechsel läuft.** Erwartet: Die Bestätigung schlägt fehl
   (`falsch`), weil die bisherige Adresse nicht mehr stimmt; die Admin-Änderung bleibt. Test in Task 3.
5. **Lizenznummer leeren und Telefon leeren.** Erwartet: beides erlaubt (`null`), Lizenznummer setzt
   die Fairgate-Markierung nicht, Telefon schon. Test in Task 2.

---

### Task 1: Spalte «für Fairgate offen», neue Verlaufs-Aktion, «(selbst)» im Verlauf

**Files:**
- Modify: `src/lib/server/db/schema.ts` (Tabelle `mitglied`)
- Create: `drizzle/0006_fairgate_offen.sql` (über `npm run db:generate`, Name anpassen)
- Modify: `src/lib/server/admin/verlauf.ts` (`Aktion`, `ladeVerlauf`)
- Modify: `src/lib/verwaltung/anzeige.ts` (`aktionText`)
- Test: `src/lib/server/admin/verlauf.db.test.ts`, `src/lib/verwaltung/anzeige.test.ts`

**Interfaces:**
- Produces: Spalte `mitglied.fairgateOffenSeit: timestamp('fairgate_offen_seit', { withTimezone: true })`,
  leer erlaubt. `Aktion` um `'fairgate-uebertragen'` erweitert. `ladeVerlauf` liefert für
  `urheberArt === 'mitglied'` den Urheber als `` `${vorname} ${nachname} (selbst)` ``, wenn der
  Urheber das betroffene Mitglied ist.

- [ ] **Step 1: Failing tests**
  - `anzeige.test.ts`: `expect(aktionText({ aktion: 'fairgate-uebertragen', detail: null })).toBe('In Fairgate übertragen')`.
  - `verlauf.db.test.ts`, `A-MITGLIED-06: Änderung durch das Mitglied selbst heisst «(selbst)»`:
    `schreibeVerlauf(db, id, { art: 'mitglied', mitgliedId: id }, [{ aktion: 'feld-geaendert', detail: 'telefon' }], t)`,
    dann `(await ladeVerlauf(db, { mitgliedId: id, grenze: 10 }))[0].urheber` ist `'Lea Beispiel (selbst)'`.
- [ ] **Step 2:** `npx vitest run src/lib/verwaltung/anzeige.test.ts src/lib/server/admin/verlauf.db.test.ts` → FAIL.
- [ ] **Step 3:** Spalte, Aktion, Text, Urheber-Anzeige umsetzen; `git merge origin/dev`, dann
  `npm run db:generate`, Migration auf `0006_fairgate_offen.sql` umbenennen (Journal mitziehen).
- [ ] **Step 4:** Tests von Step 2 plus `src/lib/server/db/schema.db.test.ts` → PASS.
- [ ] **Step 5:** Commit `feat: Spalte für Fairgate offen und Verlaufs-Aktion (#50)`.

### Task 2: Eigene Angaben lesen und ändern

**Files:**
- Create: `src/lib/server/profil/angaben.ts`
- Test: `src/lib/server/profil/angaben.db.test.ts`

**Interfaces:**
- Consumes: `pruefeAngaben`, `FELDER`, `Angaben`, `Feld` aus `admin/angaben.ts`; `geaenderteFelder`,
  `schreibeVerlauf` aus `admin/verlauf.ts`; `angabenAusZeile` aus `admin/mitglieder.ts` (exportieren,
  falls nicht exportiert).
- Produces:
  - `EIGENE_FELDER = ['telefon', 'strasse', 'plz', 'ort', 'lizenznummer'] as const`,
    `type EigenesFeld`; `FAIRGATE_FELDER: readonly Feld[] = ['email', 'telefon', 'strasse', 'plz', 'ort']`.
  - `type EigeneAngaben = Angaben` (alle Felder zum Anzeigen).
  - `ladeEigeneAngaben(db: DbOderTx, mitgliedId: number): Promise<EigeneAngaben | null>`
  - `aendereEigeneAngaben(db: Db, mitgliedId: number, neu: Partial<Record<EigenesFeld, unknown>>, vorher: EigeneAngaben, jetzt: Date): Promise<{ ergebnis: 'ok'; geaendert: Feld[] } | { ergebnis: 'eingabe'; fehler: Partial<Record<Feld, string>> } | { ergebnis: 'veraltet' } | { ergebnis: 'nicht-gefunden' }>`
    — Transaktion mit `for('update')`; nur Schlüssel aus `EIGENE_FELDER` werden übernommen (andere
    still ignoriert), Prüfung über `pruefeAngaben` auf den zusammengeführten Angaben
    (`nummerPflicht: false`); Verlauf `feld-geaendert` je Feld mit Urheber
    `{ art: 'mitglied', mitgliedId }`; ändert sich ein Feld aus `FAIRGATE_FELDER`, wird
    `fairgateOffenSeit = jetzt` gesetzt (auch wenn schon gesetzt: neuestes Datum).

- [ ] **Step 1: Failing tests** (`angaben.db.test.ts`, erfundenes Mitglied «Lea Beispiel»):
  - `A-KONTO-01: Telefon ändern speichert, schreibt Verlauf als Mitglied und markiert für Fairgate` —
    `geaendert` = `['telefon']`, Verlauf-Zeile `urheberArt 'mitglied'`, `fairgateOffenSeit` = `jetzt`.
  - `A-KONTO-02: Adresse ändern markiert für Fairgate` — `strasse`, `plz`, `ort` geändert, Marker gesetzt.
  - `A-KONTO-01: Lizenznummer ändern und leeren markiert nicht für Fairgate` — `lizenznummer: ''` →
    gespeichert `null`, `fairgateOffenSeit` bleibt `null`.
  - `A-KONTO-01: Telefon leeren ist erlaubt` → `telefon` `null`.
  - `A-KONTO-01: Name, Jahrgang und E-Mail im Körper werden ignoriert` — `{ vorname: 'X', email: 'x@example.org', telefon: '079 000 00 00' }` ändert nur `telefon`.
  - `A-KONTO-02: leere Strasse ergibt Fehler beim Feld` → `{ ergebnis: 'eingabe', fehler: { strasse: 'fehlt' } }`.
  - `A-KONTO-01: veralteter Stand (zweiter Tab) wird abgewiesen` — `vorher` mit altem Telefon nach einer Änderung → `veraltet`, Datenbank unverändert.
- [ ] **Step 2:** `npx vitest run src/lib/server/profil/angaben.db.test.ts` → FAIL.
- [ ] **Step 3:** `angaben.ts` nach den Signaturen oben; Kommentare `Annahme K-19.1` (Telefon,
  Lizenznummer) und `Annahme K-19.2` (Adresse) bei `EIGENE_FELDER`.
- [ ] **Step 4:** Test von Step 2 → PASS.
- [ ] **Step 5:** Commit `feat: eigene Angaben lesen und ändern (#50)`.

### Task 3: E-Mail-Wechsel mit zwei Codes

**Files:**
- Create: `src/lib/server/profil/email-wechsel.ts`
- Modify: `src/lib/server/login/codes.ts` (Hash), `src/lib/server/login/bremse.ts` (zwei Bremsen),
  `src/lib/server/login/mail.ts` (zwei Mails)
- Test: `src/lib/server/profil/email-wechsel.db.test.ts`, `src/lib/server/login/mail.test.ts`

**Interfaces:**
- Consumes: `erzeugeMailCode`, `normalisiereMailCode`, `gleich`, `MAIL_CODE_GUELTIG_MS`,
  `MAIL_CODE_MAX_FEHLVERSUCHE`; `Bremsen`; `ipSchluessel`; `Mailer`; `AngemeldetesKonto`;
  `schreibeVerlauf`; `FAIRGATE_FELDER` aus Task 2.
- Produces:
  - `hashWechselCode(schluessel: string, kontoId: number, art: 'alt' | 'neu', code: string): string` in `codes.ts`.
  - In `Bremsen`: `wechselProKontoStunde` (3, 1 h), `wechselProKontoTag` (10, 24 h).
  - `baueWechselCodeMail(code: string, art: 'alt' | 'neu'): { betreff: string; text: string }` und
    `baueAdresseVergebenMail(kontakt: string): { betreff: string; text: string }` in `mail.ts`.
  - `erstelleEmailWechselDienst(abh: { db: Db; schluessel: string; kontakt: string; mailer: Mailer; bremsen: Bremsen; jetzt?: () => Date }): EmailWechselDienst`
  - `EmailWechselDienst.starte(k: AngemeldetesKonto, neueEmail: unknown, ip: string): Promise<{ annahme: 'ok' | 'zu-viele' | 'gleich' | 'ungueltig'; arbeit: Promise<void> }>`
  - `EmailWechselDienst.bestaetige(k: AngemeldetesKonto, codeAlt: unknown, codeNeu: unknown): Promise<'ok' | 'falsch'>`

Ablauf `starte`: Adresse prüfen wie `pruefeAngaben` (`ungueltig`); gleich der bisherigen ohne
Rücksicht auf Gross-/Kleinschreibung → `gleich` (nichts zählen). Sonst IP-, Konto- und
Adressgrenzen prüfen; ist die Grenze pro IP, pro Konto oder der **alten** Adresse erreicht →
`zu-viele`. Zählen, Eintrag im Speicher ersetzen (Schlüssel `kontoId`: bisherige Adresse, neue
Adresse wie eingegeben, zwei Hashes, `bis`, Fehlversuche 0, `vergeben`). Ist die Grenze der
**neuen** Adresse erreicht, geht still keine Mail an sie (Antwort trotzdem `ok`). Gehört die neue
Adresse einem anderen Mitglied (`lower(email)`), erhält sie `baueAdresseVergebenMail` statt eines
Codes und der Eintrag trägt `vergeben: true`. Mails in `arbeit`, Fehler nur als feste Logzeile.

Ablauf `bestaetige`: Eintrag holen, Fehlversuch **vor** dem Vergleich zählen; abgelaufen, mehr als
5 Versuche, `vergeben`, ein Code falsch, oder die aktuelle Adresse des Mitglieds ≠ gespeicherte
bisherige → `falsch` (nach dem 5. Versuch Eintrag löschen). Sonst in einer Transaktion `email`
setzen, `fairgateOffenSeit = jetzt`, Verlauf `feld-geaendert`/`email` als Mitglied; Eintrag löschen.
Verletzt das Update die Eindeutigkeit (Wettlauf) → `falsch`. Speicher: Map mit höchstens 1000
Einträgen, ältester fliegt zuerst (wie `ChallengeSpeicher`), abgelaufene beim Zugriff verworfen.

- [ ] **Step 1: Failing tests** (Mailer als Attrappe, die Mails sammelt; Bremsen mit `jetzt`-Attrappe):
  - `SI-09: Wechsel braucht Code der alten und der neuen Adresse` — zwei Mails (alt, neu), `bestaetige` mit beiden → `ok`, `mitglied.email` neu, Verlauf `email` als Mitglied, `fairgateOffenSeit` gesetzt.
  - `SI-09: nur ein richtiger Code genügt nicht` und `SI-09: vertauschte Codes sind falsch` → `falsch`, E-Mail unverändert.
  - `SI-09: nach 5 Fehlversuchen ist der Wechsel ungültig` — 6. Versuch mit richtigen Codes → `falsch`.
  - `SI-09: nach 15 Minuten abgelaufen` → `falsch`.
  - `SI-09: gleiche Adresse anders geschrieben` → `gleich`, keine Mail.
  - `SI-04: vergebene Adresse bekommt Hinweis statt Code, Antwort gleich` — Antwort `ok`, Mail an die neue Adresse mit Betreff aus `baueAdresseVergebenMail`, kein Code darin, `bestaetige` → `falsch`.
  - `SI-09: Grenze pro Konto 3 pro Stunde` — 4. `starte` → `zu-viele`.
  - `SI-04: Grenze der neuen Adresse erreicht: keine Mail, Antwort ok` (drei Login-Mails an die neue Adresse vorab zählen).
  - `SI-09: Admin ändert die Adresse während des Wechsels` → `bestaetige` liefert `falsch`.
  - `mail.test.ts`: `baueWechselCodeMail('123456', 'alt').text` enthält `123456` und das Wort «bisherige»; `baueAdresseVergebenMail('kontakt@example.org').text` enthält keine Ziffernfolge von 6 Stellen.
- [ ] **Step 2:** `npx vitest run src/lib/server/profil/email-wechsel.db.test.ts src/lib/server/login/mail.test.ts` → FAIL.
- [ ] **Step 3:** Umsetzen nach den Signaturen; Kommentar `Annahme K-19.1` am Dienst. Bremsen-Test
  (`bremse.test.ts`) um die zwei neuen Fenster ergänzen.
- [ ] **Step 4:** Tests von Step 2 plus `src/lib/server/login/bremse.test.ts` → PASS.
- [ ] **Step 5:** Commit `feat: E-Mail-Wechsel mit Code an alte und neue Adresse (#50)`.

### Task 4: Profil-Schnittstellen

**Files:**
- Create: `src/lib/server/profil/schnittstellen.ts`, `src/lib/server/profil/index.ts`
- Create: `src/routes/api/profil/+server.ts`, `src/routes/api/profil/email/+server.ts`,
  `src/routes/api/profil/email/bestaetigen/+server.ts`
- Test: `src/lib/server/profil/schnittstellen.db.test.ts`

**Interfaces:**
- Consumes: Task 2 und 3; `antwort`, `istJson`, `leseKoerper`, `formatFehler`, `Ereignis`; `holeDb`,
  `holeBremsen`, `leseEinstellungen`, `erstelleSmtpMailer`, `leiteUm` (wie `admin/index.ts`).
- Produces:
  - `type ProfilDienste = { db: Db; wechsel: EmailWechselDienst; jetzt?: () => Date }`; `holeProfilDienste(): ProfilDienste`.
  - `getProfil(d, e)`: 200 `{ angaben: EigeneAngaben }`.
  - `postProfil(d, e)`: Körper `{ angaben: Partial<Record<EigenesFeld, string>>, vorher: EigeneAngaben }` → 200 `{ geaendert }`, 400 `{ fehler: 'eingabe', felder }`, 409 `{ fehler: 'veraltet' }`.
  - `postEmail(d, e)`: Körper `{ email }` → 202 `{}` (`ok`, nicht auf `arbeit` warten), 400 `{ fehler: 'gleich' | 'eingabe' }`, 429 `{ fehler: 'zu-viele' }`.
  - `postEmailBestaetigen(d, e)`: Körper `{ codeAlt, codeNeu }` → 200 `{}` oder 400 `{ fehler: 'falsch' }`.
  - Alle: ohne `e.locals.konto` 401; ändernde ohne JSON 415.

- [ ] **Step 1: Failing tests** — je Schnittstelle: 401 ohne Sitzung; 415 ohne JSON; Erfolgsfall mit
  erfundenem Konto; `postProfil` mit `vorher` aus `getProfil` → 200, zweites Mal mit demselben
  `vorher` → 409.
- [ ] **Step 2:** `npx vitest run src/lib/server/profil/schnittstellen.db.test.ts` → FAIL.
- [ ] **Step 3:** Umsetzen; `+server.ts` nur `export const GET/POST: RequestHandler = (e) => …(holeProfilDienste(), e)`.
- [ ] **Step 4:** Test → PASS; `make check-schnell` grün (Routen-Regel ADR-002).
- [ ] **Step 5:** Commit `feat: Schnittstellen für eigene Angaben und E-Mail-Wechsel (#50)`.

### Task 5: Liste «Für Fairgate» (Logik und Schnittstellen)

**Files:**
- Create: `src/lib/server/admin/fairgate.ts`
- Modify: `src/lib/server/admin/schnittstellen.ts` (zwei Funktionen, `ADMIN_SCHNITTSTELLEN`)
- Create: `src/routes/api/admin/fairgate/+server.ts`, `src/routes/api/admin/fairgate/[id]/+server.ts`
- Test: `src/lib/server/admin/fairgate.db.test.ts`, `src/lib/server/admin/schnittstellen.db.test.ts`

**Interfaces:**
- Consumes: `fairgateOffenSeit` (Task 1), `FAIRGATE_FELDER` (Task 2), `schreibeVerlauf`, `mitAdmin`, `parseId`.
- Produces:
  - `type FairgateZeile = { id: number; name: string; mitgliedernummer: string | null; seit: Date; felder: Feld[]; angaben: Pick<Angaben, 'email' | 'telefon' | 'strasse' | 'plz' | 'ort'> }`
  - `listeFuerFairgate(db: DbOderTx): Promise<FairgateZeile[]>` — alle Mitglieder mit gesetztem
    `fairgateOffenSeit`, älteste zuerst (`seit` = `fairgateOffenSeit`); `felder` = die Felder aus
    `FAIRGATE_FELDER` mit Verlaufseintrag `feld-geaendert`, Urheber `mitglied` = das Mitglied selbst,
    `zeitpunkt` nach dem letzten `fairgate-uebertragen` dieses Mitglieds (ohne solchen: alle);
    `strasse`/`plz`/`ort` bleiben einzeln, die Anzeige fasst sie zusammen (Task 7).
  - `markiereUebertragen(db: Db, urheber: Urheber, mitgliedId: number, jetzt: Date): Promise<'ok' | 'nicht-offen'>` — setzt `fairgateOffenSeit = null`, Verlauf `fairgate-uebertragen`.
  - `getFairgate` → 200 `FairgateZeile[]`; `postFairgate` (`params.id`) → 200 `{}`, 404 bei `nicht-offen`.
  - Annahme K-19.2 als Kommentar in `fairgate.ts`.

- [ ] **Step 1: Failing tests:**
  - `A-KONTO-02: Selbständerung erscheint in der Liste mit geänderten Feldern` — nach Adress- und E-Mail-Änderung: eine Zeile, `felder` enthält `strasse`, `email`.
  - `A-KONTO-02: mehrere Änderungen bleiben ein Eintrag mit neuestem Datum`.
  - `A-KONTO-02: Admin-Änderung erzeugt keinen Eintrag` (`aendereAngaben` mit Urheber admin).
  - `A-KONTO-02: Abhaken entfernt den Eintrag und schreibt Verlauf` — danach leer, Verlauf `fairgate-uebertragen` mit Urheber admin; zweites Abhaken → `nicht-offen`.
  - `A-KONTO-02: nach dem Abhaken zeigt eine neue Änderung nur die neuen Felder`.
  - Bestehender Test über `ADMIN_SCHNITTSTELLEN` deckt 401/403 für die zwei neuen Einträge ab.
- [ ] **Step 2:** `npx vitest run src/lib/server/admin/fairgate.db.test.ts src/lib/server/admin/schnittstellen.db.test.ts` → FAIL.
- [ ] **Step 3:** Umsetzen.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** Commit `feat: Liste Für Fairgate mit Abhaken (#50)`.

### Task 6: Profil (Variante A) und E-Mail-Unterseite

**Files:**
- Modify: `src/routes/profil/+page.ts`, `src/routes/profil/+page.svelte`
- Create: `src/lib/profil/angaben.ts` (Browser: Laden, Speichern, Meldungen)
- Create: `src/routes/profil/email/+page.ts`, `src/routes/profil/email/+page.svelte`
- Test: `src/lib/profil/angaben.test.ts`

**Interfaces:**
- Consumes: `/api/profil`, `/api/profil/email`, `/api/profil/email/bestaetigen` (Task 4); `sende`, `meldung`, `MELDUNG` aus `lib/login/anmelden.ts`.
- Produces: `ladeAngaben(fetch): Promise<EigeneAngaben | null>`, `speichereAngaben(neu, vorher)`,
  `starteWechsel(email)`, `bestaetigeWechsel(codeAlt, codeNeu)` mit Ergebnissen
  `'ok' | 'veraltet' | 'eingabe' | 'gleich' | 'zu-viele' | 'falsch' | 'stoerung'`.

Aufbau nach Artboard «Profil A»: `details.karte.klappe` «Meine Angaben» offen, oberhalb von
«Anmelden mit Passkey». Je Angabe (E-Mail, Telefon, Adresse, Lizenznummer) eine `kachel` mit Wert und
`taste-neben` «Ändern»; E-Mail-«Ändern» ist ein Link auf `/profil/email`. «Ändern» öffnet an Ort und
Stelle die Felder dieser Angabe mit `taste-haupt` «Telefon speichern» / «Adresse speichern» /
«Lizenznummer speichern» und `taste-neben` «Abbrechen»; immer nur eine Angabe offen (UI-04). Fokus
nach Öffnen aufs erste Feld, nach Speichern/Abbrechen zurück auf «Ändern». Bei `veraltet`: Meldung
«Deine Angaben wurden inzwischen geändert. Hier ist der neue Stand.» und neu laden. Darunter
Nebentext «Name, Jahrgang und Nummer ändert der Admin …» mit dem Kontakt aus `/api/kontakt` (hängt an K-21).
Unterseite nach Artboards «E-Mail ändern 1–2»: «‹ Zurück», `zaehler` «Schritt 1 von 2 · Neue
Adresse» / «Schritt 2 von 2 · Bestätigen», zwei `feld feld-code` mit `autocomplete="one-time-code"`
und `inputmode="numeric"`. Nach `ok` zurück auf `/profil?email=geaendert`; das Profil zeigt dann den
`hinweis` «E-Mail geändert. Ab sofort meldest du dich mit … an.» mit «Schliessen» (Artboard 3).
Meldung bei `falsch`: «Mindestens ein Code stimmt nicht oder ist abgelaufen. Prüfe beide Mails oder
fordere neue Codes an.»

- [ ] **Step 1: Failing tests** (`angaben.test.ts`, `fetch`-Attrappe): Status 409 → `'veraltet'`,
  400 `{ fehler: 'gleich' }` → `'gleich'`, 429 → `'zu-viele'`, Netzfehler → `'stoerung'`.
- [ ] **Step 2:** `npx vitest run src/lib/profil/angaben.test.ts` → FAIL.
- [ ] **Step 3:** Svelte-Doku über MCP holen, Seiten bauen, `svelte-autofixer` bis ohne Befund.
- [ ] **Step 4:** Test → PASS; `make check-schnell` grün.
- [ ] **Step 5:** Commit `feat: Profil mit eigenen Angaben und E-Mail-Wechsel (#50)`.

### Task 7: Verwaltungsseite «Für Fairgate»

**Files:**
- Create: `src/routes/verwaltung/fairgate/+page.svelte`, `src/routes/verwaltung/fairgate/+page.ts`
- Modify: `src/routes/verwaltung/+layout.svelte` (Punkt «Für Fairgate (N)» zwischen «Mitglieder» und «Änderungsverlauf»), `src/routes/verwaltung/+layout.ts` (Anzahl laden)
- Modify: `src/lib/verwaltung/anzeige.ts` (Feldnamen für die Spalte «Geändert», z. B. `strasse`/`plz`/`ort` → «Adresse»)
- Test: `src/lib/verwaltung/anzeige.test.ts`

Aufbau nach Artboard «Verwaltung – Für Fairgate»: Titel, Nebentext, `tabelle` mit Mitglied · Nr. ·
Geändert · Neue Angaben · Seit · `taste-neben` «In Fairgate übertragen» je Zeile; nach Abhaken Zeile
weg, Anzahl in der Seitenleiste nachgeführt. Leer: «Nichts zu übertragen.»

- [ ] **Step 1: Failing test:** `geaendertText(['strasse', 'plz', 'email'])` ist `'Adresse, E-Mail'`.
- [ ] **Step 2:** `npx vitest run src/lib/verwaltung/anzeige.test.ts` → FAIL.
- [ ] **Step 3:** Seite und Navigation bauen (Svelte-MCP, Autofixer).
- [ ] **Step 4:** Test → PASS; `make check-schnell` grün.
- [ ] **Step 5:** Commit `feat: Verwaltungsseite Für Fairgate (#50)`.

### Task 8: E2E, Hilfe, Doku

**Files:**
- Create: `tests/e2e/profil.test.ts`
- Modify: `tests/e2e/verwaltung.test.ts`, `src/routes/hilfe/+page.svelte`
- Modify: `docs/anforderungen/anforderungen.md` (A-KONTO-01 *umgesetzt\**, A-KONTO-02 von *später\*/offen* auf
  *Mitglieder-Login\*/umgesetzt\** mit Annahme K-19.2) und Änderungsprotokoll in `docs/anforderungen/README.md`;
  `docs/fachmodell.md` (Mitglied: Markierung «für Fairgate offen»); `docs/rollen-und-rechte.md` (Zeilen
  Adresse und Lizenznummer); `docs/datenschutz.md`, `docs/datenschutzerklaerung.md`,
  `docs/sicherheitskonzept.md` (SI-04/SI-09), `docs/testkonzept.md` — Inhalte laut Spec, Abschnitt
  «Datenschutz und Sicherheit»; die neue Adresse eines laufenden Wechsels liegt nur im Arbeitsspeicher
  (höchstens 15 Minuten, weg nach Ablauf oder Neustart) — so in Datenschutzkonzept und -erklärung; `docs/versionen.md` unter «Unveröffentlicht».

- [ ] **Step 1: E2E** (Projekte iphone, android; erfundenes Konto über `legeKontoMitBriefCodeAn`):
  - `A-KONTO-01, A-KONTO-02: Mitglied ändert Telefon und Adresse im Profil` — danach Werte sichtbar; `pruefeBildschirm(page, info, 'profil')`.
  - `SI-09, A-KONTO-01: Mitglied wechselt die E-Mail mit zwei Codes` — Codes per `holeMailCode` an beide Adressen, Hinweis «E-Mail geändert», Login mit der neuen Adresse klappt; `pruefeBildschirm` auf Schritt 2.
  - In `verwaltung.test.ts`: `A-KONTO-02: Admin sieht die Selbständerung unter Für Fairgate und hakt ab` (desktop), `pruefeBildschirm(page, info, 'fairgate')`.
- [ ] **Step 2:** `make e2e` → neue Tests grün, axe ohne Verstösse.
- [ ] **Step 3:** Hilfe-Abschnitt «Eigene Angaben ändern» (A-HILFE-01): was man selbst ändert, zwei
  Codes bei der E-Mail, Admin hilft, wenn die alte Adresse nicht mehr geht. Doku nachführen.
- [ ] **Step 4:** `make check` grün; `make annahmen K=K-19` listet die Stellen aus Task 2, 3, 5.
- [ ] **Step 5:** Bildvergleich: Screenshots aus Step 2 neben die Artboards legen, Abweichungen
  beheben oder im Bericht nennen.
- [ ] **Step 6:** Commit `test: E2E eigene Angaben` und `docs: eigene Angaben ändern nachgeführt (#50)`.
