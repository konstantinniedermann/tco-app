# CM Teil 3, Etappe 2 — Doppel in der Verwaltung (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der CM-Admin verwaltet Doppel auf der Kategorieseite: Liste mit Paaren, *sucht Partner*
und offenen Anfragen; von Hand anmelden, zusammenlegen, Anfrage als Paar anmelden oder löschen,
Partner ändern (mit oder ohne Ersatz), verschieben, löschen, Klassierung korrigieren. Dazu vier
Nachträge zur Mitgliederseite (Login beider, Kontakt nach Austritt aus, Sperre nach Schluss,
eine offene Anfrage je Kategorie).

**Architektur:** Neue Server-Fachlogik `src/lib/server/cm/verwaltung-doppel.ts` neben der
Einzel-Logik `verwaltung.ts`; Warnungen rein in `src/lib/turnier/passung.ts`; Meldungstexte in
`doppel-meldung.ts`. Die Fachlogik gibt fertige Meldungen (`Benachrichtigung[]`) zurück, die
Schnittstelle verschickt sie nach dem Speichern. Neue Svelte-Komponente
`src/lib/verwaltung/DoppelListe.svelte` ersetzt «Doppel verwalten kommt später».

**Tech Stack:** SvelteKit (nur `+server.ts`, ssr aus), Drizzle/Postgres, Vitest (Einheit + DB),
Playwright (iPhone/Android/Desktop, axe).

**Spec:** `docs/superpowers/specs/2026-11-06-cm-anmeldung-design.md`, Abschnitt *Teil 3*, Block
*Etappe 2 (Brainstorming 08.11.2026)*; dazu *Teil 4* (Einzel-Verwaltung, Vorbild) und der
Etappe-2-Punkt unter *Datenschutz*. Issue #59. Vorgänger: `2026-11-08-cm-teil3-doppel-etappe1.md`.

## Global Constraints

- Keine neuen Dependencies. Genau eine neue Migration (`npm run db:generate`, voraussichtlich
  `0016_*`); vor dem Merge `origin/dev` einmergen, kollidiert die Nummer, eigene (nie
  eingespielte) Migration neu erzeugen. Eigene DB per `DATABASE_URL` (Skill `tco-branching`).
- Vor Svelte-Code die Doku über den Svelte-MCP-Server holen, danach `svelte-autofixer` bis ohne Befund.
- Unter `src/routes` nur dünne `+server.ts` (Dienste aus `holeMitteilungAdminDienste()` bzw.
  `holeAdminDienste()` wie die Nachbarn); `npm run pruefungen` → `bauregel: ok`.
- Oberfläche nur aus Bausteinen von `docs/ui-leitbild.md`, ohne Entwurf; Aufbau wie
  `Anmeldungsliste.svelte` (Tabelle der Verwaltung, Aktionen je Zeile, `<dialog class="karte">`,
  Warnung mit *Trotzdem …*). Höchstens eine Haupttaste je Bildschirm.
- Doppel ohne Jahrgang: Passung nur Geschlecht (Mixed: genau eine `w`, ein `m`) und
  Summe ≥ Mindestsumme (R1 = 1 … R9 = 9, `keine` = 10, N1–N4 = 0).
- CM-Admin übergeht Regeln nach Warnung (`trotzdem`); nie: Spieler doppelt in derselben
  Kategorie, Paar mit mehr als zwei Spielern, Turnier *in Vorbereitung*, Mitglied nicht *aktiv*.
  Login ist für Aktionen des CM-Admins nicht nötig.
- Jede Änderung des CM-Admins: Verlaufseintrag `cm-anmeldung-geaendert` je betroffenem Spieler
  (`schreibeGeaendert`, nicht bei *gelöscht*).
- Meldungen: Titel `Clubmeisterschaft`, Pfad `/clubmeisterschaft/<turnierId>`, ein, höchstens
  zwei Sätze, nennen den anderen Spieler, nie Telefonnummer oder Grund; «Der CM-Admin» als
  Rolle ja, nie sein Name. Betrifft es den CM-Admin selbst, entfällt sie (`melde` in
  `turnier/schnittstellen.ts`).
- Sperrreihenfolge wie Etappe 1: Mitglieder `for update` nach aufsteigender ID
  (`sperreMitglieder`), dann Kategorie/Turnier (`sperreKategorieUndTurnier`), dann Anmeldung/Anfrage.
- SI-05 (keine Adressen/Fehlerdetails im Log), SI-10 (ändernde Anfragen nur JSON), DS-08 (Testdaten erfunden).
- Jede ID, die auf *umgesetzt* geht, steht im Namen eines Tests (`test-ids`).
- Commits einzeln stagen, Präfixe `feat:`/`fix:`/`docs:`/`test:`, Endzeilen laut Session.

## Review Focus

1. **Gleichzeitig Mitglied und CM-Admin:** Marco nimmt Leas Anfrage an, während der CM-Admin
   Marco mit Nina von Hand anmeldet → genau eine aktive Anmeldung mit Marco in der Kategorie,
   die andere Seite bekommt `schon-angemeldet`. Test in Task 4.
2. **Partner ändern auf einen, der schon zu zweit ist** (oder auf den Bleibenden selbst, oder
   auf den Herausfallenden) → `schon-angemeldet` bzw. `eingabe`, nichts geändert. Test in Task 5.
3. **Verschieben in eine Kategorie, in der einer der beiden schon steht** → `schon-angemeldet`,
   nichts geändert; verschieben in eine Einzel- oder abgesagte Kategorie → `nicht-gefunden`.
   Test in Task 5.
4. **Veraltete Liste:** Der CM-Admin löscht/legt zusammen auf einer Anmeldung, die das Mitglied
   inzwischen abgemeldet hat, oder legt eine Anfrage als Paar an, die schon angenommen ist →
   `nicht-gefunden`, die Liste lädt neu, keine Meldung. Test in Task 4 und 5.
5. **Fremde Daten in der Liste:** Die Doppel-Liste enthält weder Telefon noch E-Mail; die
   CM-Seite zeigt Kontakt eines ausgetretenen Partners nicht mehr, auch nicht im JSON. Test in
   Task 3 und 4.

---

### Task 1: Doku vor dem Bau (Fachmodell, Datenschutz, Rechte)

**Files:**
- Modify: `docs/fachmodell.md`, `docs/anforderungen/anforderungen.md`, `docs/datenschutz.md`,
  `docs/datenschutzerklaerung.md`, `docs/rollen-und-rechte.md`, `docs/beobachtungen.md`

- [ ] **Step 1: Fachmodell.**
  - FR-48: «mehrere gleichzeitig» → «höchstens eine eigene offene Anfrage je Kategorie; Anfragen
    an einen selbst unbegrenzt»; ergänzen «Annehmen setzt ein Login beider voraus; nach dem
    Anmeldeschluss ändern Mitglieder nichts mehr an Anfragen, der CM-Admin meldet sie als Paar an
    oder löscht sie»; Status bleibt bis Task 8.
  - FR-19: «… erst nach dem Annehmen der Anfrage; ist der Partner ausgetreten oder zum Löschen
    vorgemerkt, sieht der andere nur noch den Namen».
  - FR-46: Doppel ergänzen: «im Doppel auch zusammenlegen, eine offene Anfrage als Paar anmelden
    oder löschen, Partner ändern (mit oder ohne Ersatz; die alte Anmeldung wird *zurückgezogen*,
    das neue Paar ist eine neue Anmeldung)».
  - FR-35/FR-36: «offene Anfragen der Kategorie werden gelöscht, der Anfragende bekommt eine Meldung».
- [ ] **Step 2: Datenschutz** (`datenschutz.md`): Zeile *CM-Admin* in *Wer sieht was* um «offene
  Partner-Anfragen (von, an, seit wann)» ergänzen; Zeile *Gegner und Doppelpartner* um «nicht
  mehr, wenn der Partner ausgetreten oder zum Löschen vorgemerkt ist»; *Änderungen an diesem
  Konzept* mit Datum 08.11.2026. **Erklärung** (`datenschutzerklaerung.md`), Laiensprache, kurz:
  «Deine Anfragen an Partner sieht auch die Turnierleitung (CM-Admin).» und «Trittst du aus,
  sieht dein Doppelpartner deine E-Mail und Telefonnummer nicht mehr.»
- [ ] **Step 3: Rollen und Rechte.** Matrix *CM-Anmeldung*: «Offene Partner-Anfragen» CM-Admin
  `L`, MyTCO-Admin `L`; «Doppel von Hand anmelden, zusammenlegen, Partner ändern, Anfrage als
  Paar anmelden oder löschen» CM-Admin `S`.
- [ ] **Step 4: Anforderungen.** A-ANMELDUNG-04 und -06: Hinweis «Doppel in der Verwaltung mit
  #59 Etappe 2».
- [ ] **Step 5: Beobachtungen.** Im Eintrag «Kleinbefunde und offene Fragen aus #59 (Etappe 1
  Doppel)» beim Punkt *Für Etappe 2 bzw. den Projektleiter* einen Nachtrag: «Entschieden im
  Design Etappe 2 (08.11.2026), umgesetzt mit #59 Etappe 2.»
- [ ] **Step 6:** `make docs` → `Doku-Check ok.`; `npm run pruefungen` → `annahmen: ok`, `test-ids: ok`.
- [ ] **Step 7:** Commit `docs: Fachmodell, Datenschutz und Rechte für Doppel in der Verwaltung (#59)`

### Task 2: Schema — eine offene Anfrage je Kategorie

**Files:**
- Modify: `src/lib/server/db/schema.ts` (`partnerAnfrage`)
- Create: `drizzle/0016_*.sql` (generiert), `drizzle/meta/*`
- Test: `src/lib/server/cm/doppel.db.test.ts`

**Interfaces:**
- Produces: `unique('partner_anfrage_von_unique').on(t.kategorieId, t.vonId)` ersetzt
  `partner_anfrage_paar_unique`; Check und Index auf `anId` bleiben.

- [ ] **Step 1: Failing DB-Test** `FR-48: höchstens eine eigene offene Anfrage je Kategorie`:
  zweite Zeile mit gleichem `kategorieId`/`vonId`, anderem `anId` → Fehler mit Constraint-Name
  `partner_anfrage_von_unique`; gleiche `vonId` in anderer Kategorie → ok. Den bestehenden
  Schema-Test auf den neuen Namen umstellen.
- [ ] **Step 2:** Test → FAIL
- [ ] **Step 3:** Schema ändern, `npm run db:generate`, Migration lesen (nur Drop + neuer Unique).
- [ ] **Step 4:** Test → PASS (eigene DB)
- [ ] **Step 5:** Commit `feat: höchstens eine offene Partner-Anfrage je Kategorie im Schema (#59)`

### Task 3: Nachträge zur Mitgliederseite

**Files:**
- Modify: `src/lib/server/cm/doppel.ts`, `src/lib/server/cm/anmeldungen.ts` (`offeneAnfragenAn`,
  `laufendeTurniere`, `fuelleDoppel`), `src/lib/server/cm/schnittstellen.ts`, `src/lib/cm/api.ts`,
  `src/routes/clubmeisterschaft/[id]/+page.svelte`, `src/routes/clubmeisterschaft/[id]/doppel/[kid]/+page.svelte`
- Test: `src/lib/server/cm/doppel.db.test.ts`, `src/lib/server/cm/anmeldungen.db.test.ts`,
  `src/lib/server/cm/schnittstellen.db.test.ts`, `src/lib/cm/api.test.ts`

**Interfaces:**
- Produces: `stelleAnfrage(...)` neu mit Rückgabe `'anfrage-offen'`, wenn der Anfragende in der
  Kategorie schon eine offene Anfrage an jemand anderen hat (vor dem Insert geprüft; der Unique
  aus Task 2 fängt den Wettlauf → ebenfalls `'anfrage-offen'`). An denselben bleibt `'schon-angefragt'`.
- Produces: `nimmAnfrageAn(...)` neu mit Rückgabe `'hinfaellig'`: Anfragender ohne Login
  (`hatKontoMitLogin(tx, vonId)` false) → Anfrage gelöscht, keine Meldung.
- Produces: `zieheAnfrageZurueck(db, anfrageId, vonId, jetzt: Date): Promise<'ok' | 'geschlossen' | 'nicht-gefunden'>`
  und `lehneAnfrageAb(db, anfrageId, anId, jetzt: Date): Promise<{…wie bisher} | 'geschlossen' | 'nicht-gefunden'>`
  — nach `wirksamerStatus(...) !== 'offen'` → `'geschlossen'`, Anfrage bleibt.
- Produces: `offeneAnfragenAn` und die Zählung in `laufendeTurniere` zählen nur Anfragen, deren
  Anfragender ein Login hat (Join auf `konto` mit `hatLogin`; `hatLogin` aus `doppel.ts` exportieren).
- Produces: `fuelleDoppel` setzt `partner.telefon` und `partner.email` auf `null`, wenn
  `mitglied.status` des Partners nicht `'aktiv'` ist.
- Schnittstellen: `409 { fehler: 'anfrage-offen' | 'hinfaellig' | 'geschlossen' }`; `FEHLER`/`ABGELEHNT` in `api.ts` ergänzen.
- Oberfläche (Texte):
  - Anmelde-Seite, wenn `meineAnfragen` in dieser Kategorie nicht leer: über der Trefferliste
    «Du hast <Vorname Nachname> angefragt. Zieh die Anfrage zurück, um jemand anderen
    anzufragen.»; *Anfragen* bei allen anderen Treffern ausgeblendet.
  - Fehler `anfrage-offen`: derselbe Satz; `hinfaellig`: «Diese Anfrage gilt nicht mehr.» und neu laden.
  - Eigene Doppel-Karte ohne Kontakt des Partners: nur der Name, keine Links, kein Hinweis.

- [ ] **Step 1: Failing Tests** (`describe('FR-48, FR-19: Nachträge Etappe 2')`):
  - Lea fragt Marco an → `ok`; Lea fragt Max in derselben Kategorie → `anfrage-offen`; Lea fragt Max im Herren Doppel → `ok`; nach `zieheAnfrageZurueck` → Max geht
  - Nina und Paul fragen beide Marco an → beide `ok` (an einen selbst unbegrenzt)
  - Wettlauf: zwei `stelleAnfrage` Leas an Marco und Max mit `Promise.all` → genau eine `ok`, eine `anfrage-offen`
  - Leas Konto gesperrt → Anfrage fehlt in Marcos `anfragen` und im Zähler `laufendeTurniere`; Konto frei → erscheint wieder; gesperrt und Marco nimmt an → `hinfaellig`, Anfrage gelöscht, keine Anmeldung
  - nach Anmeldeschluss: `lehneAnfrageAb` und `zieheAnfrageZurueck` → `geschlossen`, Anfrage bleibt
  - Paar Lea/Marco, Marco tritt nach dem Anmeldeschluss aus → Leas `eigen.partner` hat `telefon` und `email` `null`, Name bleibt; Review Focus 5: JSON der Ansicht enthält Marcos Telefon nicht
  - Schnittstelle: `409 anfrage-offen`, `409 hinfaellig`, `409 geschlossen`
- [ ] **Step 2:** `npx vitest run src/lib/server/cm src/lib/cm` → FAIL
- [ ] **Step 3:** Server implementieren; bestehende Tests, die mehrere Anfragen je Kategorie
  stellen, auf verschiedene Kategorien oder verschiedene Anfragende umbauen (nicht löschen).
- [ ] **Step 4:** Oberfläche: Svelte-Doku holen, ändern, `svelte-autofixer` bis ohne Befund.
- [ ] **Step 5:** Tests → PASS; `npm run check:svelte` → 0 Fehler, 0 Warnungen.
- [ ] **Step 6:** Commit `feat: Doppel – Login beider, Kontakt nach Austritt aus, eine Anfrage je Kategorie (#59)`

### Task 4: Fachlogik Verwaltung — Liste, von Hand, zusammenlegen, Anfragen

**Files:**
- Create: `src/lib/server/cm/verwaltung-doppel.ts`
- Modify: `src/lib/turnier/passung.ts` (+ `passung.test.ts`), `src/lib/server/cm/doppel-meldung.ts` (+ `doppel-meldung.test.ts`), `src/lib/server/cm/verwaltung.ts` (Hilfen exportieren: `CmUrheber`, `schreibeGeaendert`, `Warnung`)
- Test: `src/lib/server/cm/verwaltung-doppel.db.test.ts`

**Interfaces:**
- Consumes: Etappe 1 (`passtAlsPaar`, `passtDoppelAllein`, `fehlendeAngaben`, `sperreMitglieder`,
  `sperreKategorieUndTurnier`, `eigeneAnmeldungen`, `spielerDer`, `GRENZE`, `istAktiv`,
  `nameFuerText`), Task 3.
- Produces in `passung.ts`:
  `warnungenDoppel(k: KategorieRegel, a: Spieler, b: Spieler | null): ('angaben-fehlen' | 'passt-nicht')[]`
  — `angaben-fehlen`, wenn bei `a` oder `b` Geschlecht oder Klassierung fehlt; sonst
  `passt-nicht`, wenn `b === null` und nicht `passtDoppelAllein(k, a)`, bzw. nicht
  `passtAlsPaar(k, a, b, true)`. Grenze und Anmeldeschluss prüft der Server (`voll`, `geschlossen`).
- Produces in `verwaltung-doppel.ts`:
  - `type DoppelSpieler = { mitgliedId: number; name: Namensteile; mitgliedStatus: MitgliedStatus; geschlecht: 'w' | 'm' | null; klassierung: Klassierung | null }`
  - `type DoppelVerwaltung = { paare: { anmeldungId: number; spieler: [DoppelSpieler, DoppelSpieler]; summe: number | null }[]; suchende: { anmeldungId: number; spieler: DoppelSpieler; kommentar: string | null }[]; anfragen: { anfrageId: number; von: DoppelSpieler; an: DoppelSpieler; gestelltAm: Date }[] }`
    — `summe` `null`, wenn eine Klassierung fehlt; Paare und Suchende nach Nachname des ersten
    Spielers (wie `fuelleDoppel`), Anfragen älteste zuerst; **ohne** Telefon und E-Mail.
  - `type Benachrichtigung = { mitgliedId: number; text: string }`
  - `type DoppelErgebnis = { ergebnis: 'ok'; turnierId: number; meldungen: Benachrichtigung[] }`
  - `type DoppelAbgelehnt = { warnungen: Warnung[] } | 'schon-angemeldet' | 'vorbereitung' | 'nicht-gefunden'`
  - `ladeDoppel(db: Db, kategorieId: number): Promise<DoppelVerwaltung | null>` — `null` für Einzel oder unbekannt
  - `meldeDoppelVonHandAn(db: Db, urheber: CmUrheber, kategorieId: number, mitgliedIds: [number] | [number, number], jetzt: Date, trotzdem: boolean): Promise<DoppelErgebnis | DoppelAbgelehnt>`
    — Warnungen: `warnungenDoppel`, `voll` (ein Spieler hat schon `GRENZE` aktive, eine eigene
    Suchende-Anmeldung in der Kategorie zählt schon mit), `geschlossen`. Steht ein Spieler hier
    schon allein, kommt der andere in diese Anmeldung (Suchtext `null`); stehen beide allein oder
    einer zu zweit → `'schon-angemeldet'`. Danach Anfragen beider in der Kategorie wie
    `loescheAnfragenDerBeiden` (aus `doppel.ts` exportieren) löschen, `hinfaellig` als Meldungen.
  - `legeZusammen(db, urheber, anmeldungId: number, mitAnmeldungId: number, jetzt, trotzdem): Promise<DoppelErgebnis | DoppelAbgelehnt>`
    — beide aktiv, je ein Spieler, gleiche Kategorie; der Spieler aus `mitAnmeldungId` kommt in
    `anmeldungId`, `mitAnmeldungId` → *zurückgezogen*; beide Suchtexte `null`; Anfragen wie oben.
  - `meldeAnfrageAlsPaarAn(db, urheber, anfrageId: number, jetzt, trotzdem): Promise<DoppelErgebnis | DoppelAbgelehnt>`
    — wie `nimmAnfrageAn`, aber ohne Login-Prüfung, ohne Anmeldeschluss-Sperre, mit Warnungen.
  - `loescheAnfrage(db, urheber, anfrageId: number, jetzt): Promise<DoppelErgebnis | 'nicht-gefunden'>` — Meldung an den Anfragenden.
- Produces in `doppel-meldung.ts` (reine Texte, `kategorie` in «…»):
  - `vonHandPaarText(partner, kategorie)` → `Der CM-Admin hat dich mit <partner> für «<Kategorie>» angemeldet. Partner und Gegner sehen deine E-Mail und Telefonnummer.`
  - `vonHandAlleinText(kategorie)` → `Der CM-Admin hat dich für «<Kategorie>» angemeldet; du suchst noch einen Partner. Partner und Gegner sehen deine E-Mail und Telefonnummer.`
  - `anfrageGeloeschtText(an, kategorie)` → `Deine Anfrage an <an> für «<Kategorie>» ist hinfällig.`
  - bestehend `hinfaelligMeldung(...).text` für Dritte, deren Anfrage durch eine Paarbildung verfällt.

- [ ] **Step 1: Failing Tests** für `warnungenDoppel` (Name `FR-46: Warnungen im Doppel`: w+m in Herren → `passt-nicht`; R3+R5 bei 9 → `passt-nicht`; R4 ohne Partner in Herren → `[]`; Partner ohne Klassierung → `angaben-fehlen`) und die drei Texte (exakt).
- [ ] **Step 2: Failing DB-Tests** `describe('A-ANMELDUNG-06, FR-46: Doppel in der Verwaltung')`:
  - `ladeDoppel`: Paar Lena/Max mit Summe 9, Paul sucht mit Kommentar, Anfrage Urs → Paul; Einzel-Kategorie → `null`; Review Focus 5: JSON ohne Telefon/E-Mail; ausgetretener Spieler mit `mitgliedStatus` `ausgetreten`
  - von Hand Paar → eine Anmeldung *bestätigt* mit beiden, Meldung an beide mit dem Namen des anderen, Verlauf bei beiden; allein → *sucht Partner*; Paul sucht schon + Urs dazu → Urs in Pauls Anmeldung, Kommentar weg, Anfrage Urs → Paul gelöscht ohne Meldung an Urs/Paul, Anfrage Dritter an Paul gelöscht mit `hinfaellig` an den Dritten
  - Warnungen: unpassend → `{ warnungen: ['passt-nicht'] }`, nichts gespeichert; mit `trotzdem` → gespeichert; Spieler mit 3 → `voll`; nach Schluss → `geschlossen`; ohne Login → gespeichert (kein Fehler); *in Vorbereitung* → `vorbereitung`; einer schon zu zweit → `schon-angemeldet`
  - zusammenlegen: zwei Suchende → ein Paar, zweite *zurückgezogen*, Kommentare `null`, Meldung an beide
  - Anfrage als Paar: legt an wie Annehmen, auch nach Schluss und ohne Login; angenommene/gelöschte Anfrage → `nicht-gefunden` (Review Focus 4)
  - Anfrage löschen → weg, Meldung `Deine Anfrage an … ist hinfällig.` an den Anfragenden
  - Review Focus 1: `nimmAnfrageAn` (Lea → Marco) und `meldeDoppelVonHandAn` (Marco + Nina) per `Promise.all` → genau eine aktive Anmeldung mit Marco
- [ ] **Step 3:** `npx vitest run src/lib/turnier src/lib/server/cm` → FAIL
- [ ] **Step 4:** Implementieren (Sperrreihenfolge laut Global Constraints).
- [ ] **Step 5:** Tests → PASS
- [ ] **Step 6:** Commit `feat: Doppel in der Verwaltung – Liste, von Hand, zusammenlegen, Anfragen (#59)`

### Task 5: Fachlogik Verwaltung — Partner ändern, verschieben, löschen

**Files:**
- Modify: `src/lib/server/cm/verwaltung-doppel.ts`, `src/lib/server/cm/doppel-meldung.ts` (+ Test)
- Test: `src/lib/server/cm/verwaltung-doppel.db.test.ts`

**Interfaces:**
- Consumes: Task 4 (`DoppelErgebnis`, `DoppelAbgelehnt`, `Benachrichtigung`, Warnungen).
- Produces:
  - `aenderePartner(db, urheber, anmeldungId: number, bleibtId: number, neuId: number | null, jetzt, trotzdem): Promise<DoppelErgebnis | DoppelAbgelehnt | 'eingabe'>`
    — nur aktive Paar-Anmeldung; `bleibtId` muss einer der beiden sein, `neuId` keiner der
    beiden (sonst `'eingabe'`). Alte Anmeldung → *zurückgezogen*; neue Anmeldung *bestätigt* mit
    `bleibtId` (+ `neuId`). Sucht `neuId` hier allein → seine Anmeldung *zurückgezogen*; ist er hier
    zu zweit → `'schon-angemeldet'`. Danach die Paarbildungs-Regel (Anfragen weg mit `hinfaellig`).
    Warnungen mit `warnungenDoppel(k, bleibt, neu)` und `voll` für `neuId`.
  - `verschiebeDoppel(db, urheber, anmeldungId: number, zielKategorieId: number, jetzt, trotzdem): Promise<(DoppelErgebnis & { von: string; nach: string }) | DoppelAbgelehnt>`
    — Ziel aktives Doppel desselben Turniers (sonst `'nicht-gefunden'`); einer der Spieler steht
    dort schon → `'schon-angemeldet'`; Warnungen für das Paar bzw. den Suchenden (`voll` zählt
    die verschobene nicht mit). Anfragen der Verschobenen in der alten Kategorie werden gelöscht,
    die anderen bekommen `hinfaellig`; kommt ein Paar an, gilt in der Zielkategorie die
    Paarbildungs-Regel, ein Suchender behält seine Anfragen dort.
  - `loescheDoppel(db, urheber, anmeldungId: number, jetzt): Promise<DoppelErgebnis | 'nicht-gefunden'>` — *zurückgezogen*, Suchtext `null`, auch nach Schluss.
  - `artDerAnmeldung(db: Db, anmeldungId: number): Promise<'einzel' | 'doppel' | null>` — für die Weiche in Task 6.
- Produces in `doppel-meldung.ts`:
  - `herausgenommenText(bleibt, kategorie)` → `Der CM-Admin hat dich aus dem Doppel mit <bleibt> für «<Kategorie>» genommen.`
  - `neuerPartnerText(neu, kategorie)` → `Der CM-Admin hat <neu> als deinen Partner für «<Kategorie>» eingetragen.`
  - `ohneErsatzText(kategorie)` → `Der CM-Admin hat deinen Partner aus «<Kategorie>» genommen. Du suchst jetzt einen Partner.`
  - `verschobenDoppelText(von, nach)` → `Der CM-Admin hat eure Anmeldung von «<von>» nach «<nach>» verschoben.`
  - `geloeschtDoppelText(kategorie)` → `Der CM-Admin hat eure Anmeldung für «<Kategorie>» gelöscht.`
  - Neuer Partner bekommt `vonHandPaarText(bleibt, kategorie)`.

- [ ] **Step 1: Failing Tests** für die Texte (exakt).
- [ ] **Step 2: Failing DB-Tests** (gleiches `describe` wie Task 4):
  - Partner ändern mit Ersatz: alte *zurückgezogen*, neue mit Bleibendem und Neuem, drei Meldungen (herausgenommen/neuer Partner/vonHandPaar); Neuer suchte allein → dessen Anmeldung *zurückgezogen*, seine Anfragen in der Kategorie weg mit `hinfaellig`
  - ohne Ersatz: neue Anmeldung nur mit Bleibendem (*sucht Partner*), Meldungen herausgenommen/ohneErsatz
  - Review Focus 2: `neuId` schon zu zweit → `schon-angemeldet`; `neuId` = Bleibender oder Herausfallender → `eingabe`; `bleibtId` fremd → `eingabe`; nichts geändert
  - verschieben Paar: Kategorie gewechselt, Meldung an beide, Warnung bei Summe unter Ziel-Mindestsumme; Review Focus 3: einer steht im Ziel schon → `schon-angemeldet`; Ziel Einzel/abgesagt → `nicht-gefunden`; Suchender mit Anfrage in alter Kategorie → Anfrage weg, `hinfaellig` an den anderen
  - löschen: *zurückgezogen*, Meldung an beide, auch nach Schluss; abgemeldete Anmeldung → `nicht-gefunden` (Review Focus 4)
- [ ] **Step 3:** Tests → FAIL
- [ ] **Step 4:** Implementieren.
- [ ] **Step 5:** Tests → PASS
- [ ] **Step 6:** Commit `feat: Doppel in der Verwaltung – Partner ändern, verschieben, löschen (#59)`

### Task 6: Schnittstellen, Routen, Absagen mit Meldung

**Files:**
- Modify: `src/lib/server/turnier/schnittstellen.ts` (+ `schnittstellen.db.test.ts`),
  `src/lib/server/turnier/turniere.ts` (`aendereKategorie`, `sageKategorieAb`) (+ Test),
  `src/lib/server/admin/rechte-matrix.db.test.ts`
- Create (je dünnes `+server.ts`):
  - `src/routes/api/admin/kategorien/[id]/doppel/+server.ts` (GET Liste, POST `{ mitgliedIds, trotzdem? }`)
  - `src/routes/api/admin/anmeldungen/[id]/zusammenlegen/+server.ts` (POST `{ mitAnmeldungId, trotzdem? }`)
  - `src/routes/api/admin/anmeldungen/[id]/partner/+server.ts` (POST `{ bleibtId, neuId: number | null, trotzdem? }`)
  - `src/routes/api/admin/anfragen/[id]/paar/+server.ts` (POST `{ trotzdem? }`), `src/routes/api/admin/anfragen/[id]/loeschen/+server.ts` (POST `{}`)
- Bestehend, mit Weiche über `artDerAnmeldung`: `POST /api/admin/anmeldungen/[id]` (verschieben)
  und `…/loeschen` rufen bei Doppel `verschiebeDoppel` bzw. `loescheDoppel`.

**Interfaces:**
- Consumes: Task 4 und 5.
- Produces: `aendereKategorie` und `sageKategorieAb` geben bei Erfolg zusätzlich die gelöschten
  Anfragen zurück (`{ ergebnis: 'ok'; hinfaellig: { vonId: number; an: string; kategorie: string; turnierId: number }[] }`
  statt `'ok'`); die Schnittstellen schicken `anfrageGeloeschtText(an, kategorie)` an jeden `vonId`.
- Antworten wie die Einzel-Nachbarn: Erfolg `200 {}`; Warnung `409 { fehler: 'warnung', warnungen }`;
  `409 { fehler: 'schon-angemeldet' | 'vorbereitung' }`; `400` bei `eingabe` oder falschem Körper
  (`mitgliedIds` Länge 1 oder 2, ganze Zahlen, verschieden); `404` sonst. Rolle `cm` schreibt,
  MyTCO-Admin nur lesend (`liest`/`schreibt`). Meldungen nach dem Speichern über `melde` je `Benachrichtigung`.

- [ ] **Step 1: Failing Tests** je Schnittstelle: Erfolg mit Meldung an die richtigen Personen
  (Spion), Warnung, `400` bei `mitgliedIds: [1, 1]`/`[]`/`[1,2,3]`, `403` für MyTCO-Admin beim
  Schreiben, `200` beim Lesen; Weiche verschieben/löschen für Doppel; Absagen und Art-Wechsel
  mit offener Anfrage → Meldung `… ist hinfällig.` an den Anfragenden (Name `FR-35, FR-36: offene Anfragen mit Meldung gelöscht`).
- [ ] **Step 2:** Tests → FAIL
- [ ] **Step 3:** Implementieren; Rechte-Matrix-Test um die neuen Routen ergänzen.
- [ ] **Step 4:** `npx vitest run src/lib/server` → PASS; `npm run pruefungen` → `bauregel: ok`
- [ ] **Step 5:** Commit `feat: Schnittstellen für Doppel in der Verwaltung (#59)`

### Task 7: Oberfläche Verwaltung

**Files:**
- Create: `src/lib/verwaltung/DoppelListe.svelte`, `src/lib/verwaltung/Spielersuche.svelte`
  (aus `Anmeldungsliste.svelte` herausgelöst: Suchfeld + Trefferliste der Spieler, `onwahl(t: SpielerTreffer)`)
- Modify: `src/lib/verwaltung/Anmeldungsliste.svelte` (nutzt `Spielersuche`), `src/lib/verwaltung/api.ts` (+ Test),
  `src/routes/verwaltung/turniere/[id]/kategorien/[kid]/+page.svelte` (und dessen Laden), `src/lib/verwaltung/turnier-anzeige.ts` (+ Test)

**Interfaces:**
- Consumes: Task 6.
- Produces in `api.ts`: `ladeDoppel(kategorieId)`, `meldeDoppelAn(kategorieId, mitgliedIds, trotzdem)`,
  `legeZusammen(anmeldungId, mitAnmeldungId, trotzdem)`, `aenderePartner(anmeldungId, bleibtId, neuId, trotzdem)`,
  `meldeAnfrageAlsPaarAn(anfrageId, trotzdem)`, `loescheAnfrage(anfrageId)`; Typ `DoppelVerwaltung` als `Json<…>`.
  Verschieben/Löschen nutzen die bestehenden Client-Funktionen.
- Produces in `turnier-anzeige.ts`: `paarText(p)` → `Lena Muster / Max Beispiel`, `summeText(summe)` → `Summe 9` bzw. `Summe offen`.

Aufbau (Leitbild, Texte kurz):
- Karte *Anmeldungen* mit *Neu laden* und *Von Hand anmelden* (Nebentaste), darunter drei
  Tabellen mit Überschrift und Anzahl: *Paare (n)* (Spalten Paar, Klassierungen, Summe,
  Aktionen *Partner ändern* · *Verschieben* · *Klassierung* · *Löschen*), *Sucht Partner (n)*
  (Name, Klassierung, Kommentar, *Zusammenlegen* · *Verschieben* · *Klassierung* · *Löschen*),
  *Offene Anfragen (n)* (Von, An, Seit, *Als Paar anmelden* · *Löschen*). Leere Tabelle: ein Satz
  «Keine.» Plaketten zu Austritt/Löschvormerkung wie im Einzel.
- Dialoge: *Von Hand anmelden* (zwei `Spielersuche`, zweite optional mit Satz «Leer lassen,
  wenn er noch einen Partner sucht.»); *Partner ändern* (Auswahl wer bleibt, `Spielersuche` für
  den Neuen, Satz «Leer lassen: <Bleibender> sucht danach selbst.»); *Zusammenlegen* (Auswahl
  aus den übrigen Suchenden); *Verschieben* (Auswahl Doppelkategorie); *Löschen*/*Anfrage
  löschen*/*Als Paar anmelden* als Rückfrage. Warnungen als Liste im Dialog, Haupttaste wird
  *Trotzdem …*. Texte der Warnungen wie im Einzel; `voll` nennt den Spieler.
- Nur lesend (MyTCO-Admin, *Ansicht als …*): keine Aktionen, keine Tasten.
- Nach jedem Speichern `refreshAll()` wie die Einzel-Liste; Fokus nach dem Schliessen eines
  Dialogs auf die Überschrift der Liste.

- [ ] **Step 1:** Svelte-Doku über MCP holen (`$state`, `$derived`, Snippets/Props, `<dialog>`).
- [ ] **Step 2: Failing Tests** für die Client-Funktionen (Pfad, Methode, Körper) und `paarText`, `summeText`.
- [ ] **Step 3:** Implementieren; `Spielersuche` zuerst herauslösen, Einzel-E2E
  (`tests/e2e/cm-verwaltung.test.ts`) muss unverändert grün bleiben; `svelte-autofixer` je Komponente.
- [ ] **Step 4:** `npx vitest run src/lib/verwaltung` → PASS; `npm run check:svelte` → 0 Fehler, 0 Warnungen.
- [ ] **Step 5:** Commit `feat: Doppel in der Verwaltung auf der Kategorieseite (#59)`

### Task 8: E2E mit Screenshots, Doku-Status

**Files:**
- Create: `tests/e2e/cm-doppel-verwaltung.test.ts`
- Modify: `tests/e2e/hilfen/login.ts` (nur falls eine Hilfe fehlt), `docs/fachmodell.md`,
  `docs/anforderungen/anforderungen.md`, `docs/versionen.md` (*Unveröffentlicht*),
  `docs/context-scopes.md` (Zeile *Clubmeisterschaft (Verwaltung)* um `verwaltung-doppel.ts`,
  `DoppelListe.svelte`, `Spielersuche.svelte`, `cm-doppel-verwaltung.test.ts`, diesen Plan)

- [ ] **Step 1: E2E** (eigenes Turnier je Projekt, `legeCmMitBriefCodeAn`, `stelleAnfrageDirekt`, `meldeZurCmAn`, Mails aus Mailpit):
  - `A-ANMELDUNG-06, FR-46: CM-Admin meldet ein Paar von Hand an und ändert den Partner` — von Hand Herren-Paar mit Summe unter Minimum → Warnung, *Trotzdem anmelden*; Mail an beide `Der CM-Admin hat dich mit … angemeldet`; *Partner ändern* ohne Ersatz → Mail `… aus dem Doppel mit … genommen`; Bleibender steht unter *Sucht Partner*
  - `FR-46, FR-49: zwei Suchende zusammenlegen` — Mail an beide, Kommentare weg
  - `FR-48: offene Anfrage als Paar anmelden und löschen` — nach dem Anmeldeschluss; Mail `… ist hinfällig.` an den Anfragenden beim Löschen
  - `FR-48: nur eine offene Anfrage je Kategorie (Mitglied)` — nach einer Anfrage zeigt die Anmelde-Seite den Satz und keine *Anfragen*-Tasten
  - `pruefeBildschirm` (axe + Screenshot iPhone/Android) für die Liste mit allen drei Tabellen, *Von Hand anmelden* mit Warnung, *Partner ändern*
- [ ] **Step 2:** Status nachführen: FR-46 → *umgesetzt*; FR-48, FR-49 → *umgesetzt*; FR-19 bleibt
  *umgesetzt (Doppelpartner)*; A-ANMELDUNG-04 und -06 → *umgesetzt*, sofern alles grün. Eintrag
  unter *Unveröffentlicht* (kurz: Doppel in der Verwaltung; eine offene Anfrage je Kategorie).
- [ ] **Step 3:** `make check` im Hintergrund (`run_in_background`, eigene DB) → grün.
- [ ] **Step 4:** Screenshots dem Projektleiter zeigen (mit den Meldungstexten aus Task 4 und 5).
- [ ] **Step 5:** Commits `test: E2E für Doppel in der Verwaltung (#59)` und `docs: CM Teil 3 Etappe 2 umgesetzt (#59)`
