# CM Teil 3, Etappe 1 — Doppel mit Anfrage (Mitgliederseite) (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mitglieder melden sich in Doppelkategorien an: allein als *sucht Partner* (mit
freiwilligem Kommentar) oder per **Anfrage** an einen Partner, die dieser annimmt oder ablehnt.
Partner sehen sich gegenseitig E-Mail und Telefon; Abmelden und Austritt ziehen das Paar
zurück. Meldungen laufen *Push, sonst E-Mail*.

**Architektur:** Regeln (Passung, Summe, Vermerk) rein in `src/lib/turnier/passung.ts`. Neue
Server-Fachlogik in `src/lib/server/cm/doppel.ts` (Suche, Anfragen, Suchtext), Ansicht und
Abmelden in `src/lib/server/cm/anmeldungen.ts` erweitert, Texte der Meldungen in
`src/lib/server/cm/doppel-meldung.ts`. Offene Anfragen in einer neuen Tabelle
`partner_anfrage`; was erledigt ist, wird gelöscht. Neue Seite
`/clubmeisterschaft/[id]/doppel/[kid]` zum Anfragen oder Alleinanmelden.

**Tech Stack:** SvelteKit (nur `+server.ts`, ssr aus), Drizzle/Postgres, Vitest (Einheit + DB),
Playwright (iPhone/Android/Desktop, axe).

**Spec:** `docs/superpowers/specs/2026-11-06-cm-anmeldung-design.md`, Abschnitt *Teil 3* mit
*Präzisierungen vor dem Bau (08.11.2026)*; Design-Artifact
[MyTCO CM Doppel](https://claude.ai/artifact/5N9wh3oa2D9ULWvvZEya7q), Variante A. Issue #59.

## Global Constraints

- Nur die Mitgliederseite; die Verwaltung der Doppel (Liste, von Hand, verschieben, Partner
  ändern, zusammenlegen, offene Anfragen nach Anmeldeschluss) ist Etappe 2. Ausnahme: die
  Sperre *Einzel/Doppel wechseln* und die Doppel-Warnung FR-36 (Task 6), weil Doppel-Anmeldungen
  ab dieser Etappe entstehen.
- Keine neuen Dependencies. Genau eine neue Migration (`npm run db:generate`), nie eine
  eingespielte neu erzeugen.
- Vor Svelte-Code die Doku über den Svelte-MCP-Server holen, danach `svelte-autofixer` bis ohne Befund.
- Unter `src/routes` nur `+server.ts` (dünn, Dienste aus `holeCmDienste()`); Bauregel `npm run pruefungen`.
- Oberfläche nur aus Bausteinen von `docs/ui-leitbild.md`; neu ist nur die **Trefferliste**
  (Task 1). Höchstens eine Haupttaste je Bildschirm (Dialog = eigener Bildschirm).
- Klassierung zählt R1 = 1 … R9 = 9, `keine` = 10, N1–N4 = 0; ein Paar passt, wenn die Summe
  **≥ Mindestsumme** ist. Im *Mixed* eine Frau und ein Mann. **Im Doppel gibt es keinen
  Jahrgang** (Entscheid Projektleiter, 08.11.2026): Doppel-Passung, Suche und Warnungen prüfen
  nur Geschlecht und Mindestsumme.
- Austritt und Löschvormerkung ziehen bis zum **Datum** des Anmeldeschlusses zurück, auch wenn
  von Hand früher geschlossen (Entscheid Projektleiter, 08.11.2026; auch Einzel).
- Kommentar *sucht Partner*: freiwillig, 0–120 Zeichen nach `trim` (leer = `null`).
- Wählbar und anfragbar ist nur, wer ein Login hat: Konto nicht gesperrt und
  `konto.briefCodeBenutztAm` gesetzt; Mitglied *aktiv*.
- Meldungen: `CmDienste.melde` (FR-47), Titel `Clubmeisterschaft`, Pfad
  `/clubmeisterschaft/<turnierId>`, ein, höchstens zwei Sätze, nennen den anderen Spieler,
  **nie** eine Telefonnummer, einen CM-Admin oder einen Grund. Die Bestätigungsmail aus Teil 2
  bekommt nur, wer selbst handelt.
- SI-05: Server loggt keine Adressen oder Fehlerdetails; SI-10: ändernde Anfragen nur als JSON.
- Testdaten erfunden (DS-08). Jede ID, die auf *umgesetzt* geht, steht im Namen eines Tests (`test-ids`).
- Commits einzeln stagen, Präfixe `feat:`/`fix:`/`docs:`/`test:`, Endzeilen laut Session.

## Review Focus

1. **Gekreuzte Anfragen:** Lea fragt Marco, Marco fragt Lea, beide nehmen gleichzeitig an →
   genau eine Anmeldung, beide Anfragen weg, kein Fehler. Sperrreihenfolge: beide Mitglieder
   `for update` nach aufsteigender ID, dann Kategorie `for share`. Test in Task 4.
2. **Annehmen, wenn sich etwas geändert hat:** Anfragender hat inzwischen 3 Anmeldungen →
   `voll`, nichts geändert, Anfrage bleibt; Anfragender ist inzwischen mit jemand anderem
   gepaart → `schon-angemeldet`, Anfrage gelöscht; Anmeldeschluss vorbei → `geschlossen`,
   Anfrage bleibt (Etappe 2). Test in Task 4.
3. **Direkt an die Schnittstelle:** Anfrage an sich selbst, an ein Mitglied ohne Login, an
   einen unpassenden Partner (Summe zu klein, falsches Geschlecht) oder in eine Einzel- oder
   abgesagte Kategorie → abgewiesen, nichts gespeichert. Test in Task 4 und 7.
4. **Abmelden aus dem Paar** durch den einen, während der andere abmeldet → beide Antworten
   ohne Fehler, Anmeldung genau einmal *zurückgezogen*, höchstens eine Meldung je Person. Test
   in Task 4.
5. **Fremde Daten:** Ansicht und Suche zeigen keine Telefonnummer und E-Mail, ausser des
   eigenen Partners und des Anfragenden in einer Anfrage an einen selbst; Klassierung nur in
   der Suche und in der Anfrage. Test in Task 5.

---

### Task 1: Doku vor dem Bau (Fachmodell, Datenschutz, Rechte, UI-Leitbild)

**Files:**
- Modify: `docs/fachmodell.md`, `docs/anforderungen/anforderungen.md`, `docs/datenschutz.md`,
  `docs/datenschutzerklaerung.md`, `docs/rollen-und-rechte.md`, `docs/abklaerungen.md`,
  `docs/ui-leitbild.md`, `src/lib/design/basis.css`

- [ ] **Step 1: Fachmodell.** FR-06: «ein Doppel zählt für beide Partner; offene Anfragen
  zählen nicht». FR-07: Doppel nur nach Geschlecht beider Spieler und Mindestsumme, ohne Jahrgang
  (Skala wie oben, Annahme K-51). FR-09 neu: «Ein Doppelpartner wird angefragt und nimmt an
  oder lehnt ab (Entscheid Projektleiter); jedes Mitglied steht je Kategorie in höchstens einer
  aktiven Anmeldung». Neu, Status *geplant*:
  - `FR-48 | Partner-Anfrage: nur an Mitglieder mit Login, die passen; mehrere gleichzeitig;
    Annehmen prüft FR-06, FR-07 und den Anmeldeschluss neu und lässt die übrigen offenen
    Anfragen beider in der Kategorie verfallen; Ablehnen ohne Grund; erledigte Anfragen werden
    gelöscht | A-ANMELDUNG-04 | geplant`
  - `FR-49 | Wer allein im Doppel angemeldet ist, *sucht Partner* und kann einen Kommentar
    (0–120 Zeichen) setzen, den alle Mitglieder sehen; er wird gelöscht, sobald ein Partner
    gefunden ist oder der Spieler abmeldet | A-ANMELDUNG-04 | geplant`
  - FR-10 ergänzen: «im Doppel zieht Abmelden das Paar zurück, der Partner bekommt eine
    Meldung»; FR-04 ergänzen: Austritt/Vormerkung zieht offene Doppel zurück, Meldung an den
    Partner ohne Grund, offene Anfragen verfallen; FR-36 ergänzen: Einzel/Doppel wechseln nur
    ohne aktive Anmeldungen.
  - Entität *Partner-Anfrage* (Kategorie, von, an, gestellt am) und bei *Anmeldung* das Feld
    *Kommentar «sucht Partner»*; Lebenszyklus *Anfrage*: offen → angenommen (wird Anmeldung) /
    abgelehnt / zurückgezogen / verfallen (gelöscht).
- [ ] **Step 2: Anforderungen.** A-ANMELDUNG-04 bleibt *geplant*, Hinweis «Mitgliederseite mit
  #59 Etappe 1, Verwaltung Etappe 2».
- [ ] **Step 3: Datenschutz und Erklärung** nach Spec-Abschnitt *Datenschutz*: Kommentar
  *sucht Partner* (alle Mitglieder, Löschung), Klassierung bei der Partnerwahl, Freigabe von
  Name, Klassierung und Telefon (sonst E-Mail) mit der Anfrage, Kontaktdaten erst nach dem
  Annehmen, erledigte Anfragen gelöscht, Vermerke *Klassierung fehlt*/*Angaben fehlen*.
  *Wer sieht was* und *Löschen* nachführen; Erklärung in Laiensprache, kurz.
- [ ] **Step 4: Rollen und Rechte.** Matrix unter *CM-Anmeldung*: «Klassierung passender
  Mitglieder (Partnerwahl)» Mitglied `L`; «Kontaktdaten des Doppelpartners» Mitglied `L`
  (eigener Partner); «Partner anfragen, annehmen, ablehnen» Mitglied `S eigene`.
- [ ] **Step 5: Abklärungen.** Bei K-27 vermerken: Zustimmung im Doppel per Anfrage (Entscheid
  Projektleiter, 08.11.2026); die Frage an den Verein bleibt offen.
- [ ] **Step 6: UI-Leitbild und `basis.css`.** Neuer Baustein in der Tabelle:
  `| Trefferliste | ul.trefferliste | Ergebnisse einer Suche unter dem Suchfeld: je Treffer eine Kachel mit Trennlinie oben, Name links, genau eine Nebentaste rechts; Vermerke als Plakette unter dem Namen; erscheint ab zwei Buchstaben |`.
  In `basis.css`: `.trefferliste` (ohne Aufzählungszeichen, ohne Einzug, Spalte) und
  `.trefferliste > li` (`.kachel`-Abstände `--abstand-3`, `border-top: var(--rand-duenn) solid var(--farbe-linie)`); nur Tokens.
- [ ] **Step 7:** `make docs` → `Doku-Check ok.`; `npm run pruefungen` → `design-tokens: ok`, `annahmen: ok` (neue Doku-Dateien vorher stagen).
- [ ] **Step 8:** Commit `docs: Fachmodell, Datenschutz, Rechte und Trefferliste für CM-Doppel (#59)`

### Task 2: Regeln für das Doppel

**Files:**
- Modify: `src/lib/turnier/passung.ts`, `src/lib/turnier/klassierung.ts`, `src/lib/server/cm/anmeldungen.ts` (`regelAus`)
- Test: `src/lib/turnier/passung.test.ts`, `src/lib/turnier/klassierung.test.ts`

**Interfaces:**
- Produces: `punkte(k: Klassierung): number` (klassierung.ts) — N1–N4 → 0, R*n* → *n*, `keine` → 10.
- Produces: `KategorieRegel.mindestsumme: number | null` (neu im Typ; `regelAus` füllt es).
- Produces: `passtDoppelAllein(k: KategorieRegel, s: Spieler): boolean` — `art` doppel, keine
  Angabe fehlt, Geschlecht (`herren` m, `damen` w, `mixed` und `offen` beide); der Jahrgang zählt im Doppel nicht.
- Produces: `type Vermerk = 'angaben-fehlen' | 'klassierung-fehlt'`;
  `vermerk(s: Spieler): Vermerk | null` — `angaben-fehlen`, sobald das Geschlecht fehlt, sonst `klassierung-fehlt`, sonst `null`.
- Produces: `passtAlsPaar(k: KategorieRegel, a: Spieler, b: Spieler, streng: boolean): boolean`
  — `streng = false` (Suche): fehlende Angaben von `b` gelten als passend, fehlende Klassierung
  wird nicht summiert; `a` muss vollständig sein. `streng = true` (Annehmen): beide vollständig.
  Geschlecht (Mixed: genau eine `w`, ein `m`), `punkte(a) + punkte(b) >= mindestsumme`; kein Jahrgang.

- [ ] **Step 1: Failing tests**, Name `FR-07: Doppel nach Geschlecht und Mindestsumme, ohne Jahrgang`:
  - `punkte`: N2 → 0, R4 → 4, `keine` → 10
  - R4+R5 in Herren Doppel (9) → `true`; R3+R5 → `false`; R1+R8 → `true`; N1+R9 → `false`
  - Mixed: w+m → `true`; w+w → `false`; Damen: w+m → `false`
  - Jahrgang spielt keine Rolle: Kategorie mit `jahrgangVon` 2000, Spieler 1970 → trotzdem `true`
  - Suche (`streng=false`): `b` ohne Klassierung → `true`; `b` ohne Geschlecht in Mixed → `true`; Annehmen (`streng=true`): dieselben → `false`
  - `passtDoppelAllein`: m in Mixed → `true`; w in Herren Doppel → `false`; Einzel-Kategorie → `false`
  - `vermerk`: ohne Geschlecht → `angaben-fehlen`; nur ohne Jahrgang → `null`; nur ohne Klassierung → `klassierung-fehlt`; vollständig → `null`
  - Einzel unverändert: bestehende Tests grün; `passtEinzel` für Doppel bleibt `false`
- [ ] **Step 2:** `npx vitest run src/lib/turnier` → FAIL
- [ ] **Step 3:** Implementieren; Typ-Fehler aus `mindestsumme` in bestehenden Aufrufern mit `regelAus` bzw. `mindestsumme: null` beheben (`npm run check:svelte`).
- [ ] **Step 4:** `npx vitest run src/lib/turnier` → PASS
- [ ] **Step 5:** Commit `feat: Regeln für das Doppel in der Passung (#59)`

### Task 3: Schema für Anfrage und Kommentar

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Create: `drizzle/0014_*.sql` (generiert) und `drizzle/meta/*`
- Test: `src/lib/server/cm/doppel.db.test.ts` (nur Schema-Fall)

**Interfaces:**
- Produces: `anmeldung.suchtext: text('suchtext')` (nullable), Check `char_length(suchtext) <= 120`.
- Produces: Tabelle `partnerAnfrage` (`partner_anfrage`): `id serial pk`, `kategorieId` (→
  `kategorie.id`, cascade), `vonId`, `anId` (→ `mitglied.id`, ohne cascade), `gestelltAm
  timestamptz not null`; `unique(kategorieId, vonId, anId)`, Check `von_id <> an_id`, Index auf `anId`.

- [ ] **Step 1: Failing DB-Test** `FR-48: offene Anfrage je Paar nur einmal`: doppelte Zeile → Unique-Fehler; `vonId = anId` → Check-Fehler; Suchtext mit 121 Zeichen → Check-Fehler.
- [ ] **Step 2:** Test → FAIL
- [ ] **Step 3:** Schema ergänzen, `npm run db:generate`, Migration lesen (nur die zwei Änderungen), eigene DB per `DATABASE_URL` wie `tests/hilfen/eigene-datenbank.ts` (gemeinsame DB `mytco` anderer Worktrees nicht brechen).
- [ ] **Step 4:** Test → PASS
- [ ] **Step 5:** Commit `feat: Schema für Partner-Anfrage und Kommentar «sucht Partner» (#59)`

### Task 4: Fachlogik Doppel (anmelden, Anfrage, Abmelden)

**Files:**
- Create: `src/lib/server/cm/doppel.ts`
- Modify: `src/lib/server/cm/anmeldungen.ts` (`meldeAn` für Doppel, `meldeAb`, `eigeneKategorien`)
- Test: `src/lib/server/cm/doppel.db.test.ts`, `src/lib/server/cm/anmeldungen.db.test.ts`

**Interfaces:**
- Consumes: Task 2, Task 3, `GRENZE`, `istAktiv`, `eigeneAnmeldungen`, `wirksamerStatus`, `spielerAus`.
- Produces (alle mit `jetzt: Date`, eine Transaktion, Sperrreihenfolge wie Review Focus 1):
  - `type Hinfaellig = { anIds: number[]; mitName: string }` — für die Meldung «… hat inzwischen einen Partner»
  - `meldeAn(db, kategorieId, mitgliedId, jetzt, suchtext?: string | null)` — bei Doppel: allein
    anmelden (*sucht Partner*), braucht `passtDoppelAllein`, sonst `'passt-nicht'`; Rückgaben wie bisher
  - `setzeSuchtext(db: Db, anmeldungId: number, mitgliedId: number, suchtext: string | null, jetzt: Date): Promise<'ok' | 'geschlossen' | 'nicht-gefunden'>` — nur eigene, aktive Anmeldung mit genau einem Spieler
  - `sucheDoppelPartner(db: Db, kategorieId: number, mitgliedId: number, suche: string): Promise<PartnerTreffer[]>` mit
    `type PartnerTreffer = { mitgliedId: number; name: string; klassierung: Klassierung | null; vermerk: Vermerk | null; suchtPartner: boolean; kommentar: string | null; anfrageId: number | null }`
    — leer bei `suche.trim().length < 2`, höchstens 20, «Vorname Nachname», sortiert nach Nachname, dann Vorname; Filter nach Spec *Wer in der Suche steht* (Login, `passtAlsPaar(…, false)`, nicht schon zu zweit, Grenze); `anfrageId` = eigene offene Anfrage an ihn
  - `stelleAnfrage(db: Db, kategorieId: number, vonId: number, anId: number, jetzt: Date): Promise<'ok' | 'geschlossen' | 'voll' | 'passt-nicht' | 'schon-angemeldet' | 'schon-angefragt' | 'angaben-fehlen' | 'nicht-gefunden'>`
  - `zieheAnfrageZurueck(db, anfrageId, vonId, jetzt): Promise<'ok' | 'nicht-gefunden'>` (löscht)
  - `lehneAnfrageAb(db, anfrageId, anId, jetzt): Promise<{ vonId: number; kategorie: string; turnierId: number } | 'nicht-gefunden'>` (löscht)
  - `nimmAnfrageAn(db, anfrageId, anId, jetzt): Promise<{ ergebnis: 'ok'; vonId: number; kategorie: string; turnierId: number; hinfaellig: Hinfaellig[] } | 'geschlossen' | 'voll' | 'passt-nicht' | 'schon-angemeldet' | 'angaben-fehlen' | 'nicht-gefunden'>`
    — prüft `passtAlsPaar(…, true)`, Grenze für beide (eine eigene *sucht-Partner*-Anmeldung in der
    Kategorie zählt schon mit), Anmeldeschluss; Paar landet nach Spec *Wo das Paar landet*;
    Suchtext der übernommenen Anmeldung → `null`; löscht diese Anfrage und alle übrigen offenen
    der beiden in der Kategorie (als `hinfaellig` zurückgegeben); `schon-angemeldet` löscht die Anfrage.
  - `meldeAb(...)` gibt neu `{ ergebnis: 'ok'; partnerId: number | null } | 'geschlossen' | 'nicht-gefunden'` zurück; Doppel: ganze Anmeldung *zurückgezogen*, `suchtext` → `null`.
  - `eigeneKategorien`: Doppel als `«<Kategorie> (mit <Vorname Nachname>)»` bzw. `«<Kategorie> (sucht Partner)»`.
  - `trageEin` (und `stelleAnfrage`, `nimmAnfrageAn`) lesen die Turnier-Zeile mit `for share`
    nach der Kategorie, damit ein gleichzeitiges Schliessen (`setzeStatus` sperrt das Turnier)
    nicht zwischen Prüfung und Eintrag fällt.

- [ ] **Step 1: Failing DB-Tests**, `describe('A-ANMELDUNG-04, FR-48, FR-49: Doppel')`:
  - allein anmelden (`meldeAn` mit Doppel-Kategorie) mit Suchtext → aktive Anmeldung mit einem Spieler, Suchtext gespeichert; w in Herren Doppel → `passt-nicht`; zweites Mal → `schon-angemeldet`; mit 3 aktiven → `voll`; nach Anmeldeschluss → `geschlossen`
  - Turnier-Sperre: `meldeAn` und `setzeStatus(…, 'geschlossen')` gleichzeitig (`Promise.all`) → entweder Anmeldung vor dem Schliessen oder `geschlossen`, nie eine Anmeldung in einem danach geschlossenen Turnier mit späterem Zeitstempel
  - Suche `'ma'` findet Marco (R5) für Lea (R6, Mixed, 9), nicht Mia (w), nicht Moritz (R2: 8 < 9), nicht Mitglied ohne Login, nicht wer schon gepaart ist, nicht wer 3 hat; Manuel ohne Klassierung mit `klassierung-fehlt`; Suchender mit `suchtPartner` und Kommentar; `'m'` → leer
  - Anfrage stellen → `ok`; zweite an denselben → `schon-angefragt`; an sich selbst / ohne Login / unpassend / Einzel-Kategorie → `passt-nicht` bzw. `nicht-gefunden`; mehrere Anfragen gleichzeitig ok, zählen nicht bei der Grenze (Lea mit 2 Anmeldungen + 3 Anfragen → `eigeneAnmeldungen` = 2)
  - Annehmen ohne Anmeldungen → neue Anmeldung mit beiden; Marco sucht schon → Lea in seiner, Suchtext weg; beide suchen → Leas eigene *zurückgezogen*; übrige Anfragen beider in der Kategorie gelöscht und in `hinfaellig`
  - Annehmen: Lea inzwischen 3 → `voll`, Anfrage bleibt; Lea inzwischen gepaart → `schon-angemeldet`, Anfrage weg; nach Anmeldeschluss → `geschlossen`, Anfrage bleibt; Marco ohne Klassierung → `angaben-fehlen`
  - Ablehnen und Zurückziehen löschen die Anfrage; fremde Anfrage → `nicht-gefunden`
  - `FR-10`: Abmelden aus dem Paar → *zurückgezogen*, `partnerId` des anderen; Abmelden als Suchender → Suchtext `null`
  - Review Focus 1: gekreuzte Anfragen, `Promise.all` beider `nimmAnfrageAn` → genau eine aktive Anmeldung, keine Anfrage übrig
  - Review Focus 4: beide Partner `meldeAb` gleichzeitig → einmal `ok` mit `partnerId`, einmal `nicht-gefunden`
- [ ] **Step 2:** `npx vitest run src/lib/server/cm` → FAIL
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests → PASS (auch die bestehenden Einzel-Tests)
- [ ] **Step 5:** Commit `feat: Doppel anmelden, Partner anfragen, gemeinsam abmelden (#59)`

### Task 5: Ansicht der CM-Seite mit Doppel

**Files:**
- Modify: `src/lib/server/cm/anmeldungen.ts` (`ladeCmAnsicht`, `laufendeTurniere`, Typen)
- Test: `src/lib/server/cm/anmeldungen.db.test.ts`

**Interfaces:**
- Produces in `CmKategorie`: `art: Art`, `mindestsumme: number | null`, `paare: string[]`
  («Vorname Nachname / Vorname Nachname», bestätigt, nach erstem Nachnamen),
  `suchende: { name: string; kommentar: string | null }[]` (ohne einen selbst),
  `eigen: { art: 'paar'; partner: { name: string; telefon: string | null; email: string | null } } | { art: 'sucht'; kommentar: string | null } | null`,
  `meineAnfragen: { anfrageId: number; an: string }[]`. Einzel: `paare`/`suchende`/`meineAnfragen` leer, `eigen` `null`, `namen` wie bisher.
- Produces in `CmAnsicht`: `anfragen: { anfrageId: number; kategorieId: number; kategorie: string; von: string; klassierung: Klassierung | null; kontakt: { art: 'telefon' | 'email'; wert: string } | null }[]` — offene Anfragen an einen selbst; Kontakt = Telefon, sonst E-Mail.
- Produces in `CmStand`: `anfragen: number` (offene an einen selbst).
- Doppelkategorien erscheinen, wenn `passtDoppelAllein` oder man dort angemeldet ist.

- [ ] **Step 1: Failing DB-Tests** `A-ANMELDUNG-04, FR-19: Doppel auf der CM-Seite`: Mixed erscheint für w und m, Herren Doppel nicht für w; `paare` und `suchende` mit Kommentar; `eigen` mit Telefon und E-Mail des Partners; Anfrage an Marco erscheint bei Marco unter `anfragen` mit Leas Klassierung und Telefon (ohne Telefon: E-Mail), bei Lea unter `meineAnfragen`; `laufendeTurniere` zählt `anfragen`.
- [ ] **Step 2:** Review Focus 5 als Test: JSON der Ansicht für Dritte (Nina) enthält weder Telefon noch E-Mail von Lea oder Marco, keine Klassierung anderer.
- [ ] **Step 3:** `npx vitest run src/lib/server/cm/anmeldungen.db.test.ts` → FAIL
- [ ] **Step 4:** Implementieren.
- [ ] **Step 5:** Tests → PASS; Commit `feat: Doppel, Anfragen und Partner-Kontakt in der CM-Ansicht (#59)`

### Task 6: Austritt, Löschung, Kategorie ändern

**Files:**
- Modify: `src/lib/server/cm/austritt.ts`, `src/lib/server/admin/mitgliedschaft.ts`, `src/lib/server/admin/schnittstellen.ts` (Austritt und Vormerkung), deren Routen unter `src/routes/api/admin/mitglieder/[id]/` (Dienste aus `holeMitteilungAdminDienste()`), `src/lib/server/admin/loeschung.ts`, `src/lib/server/cm/anmeldungen.ts` (`zaehleUnpassende`), `src/lib/server/turnier/turniere.ts` (`aendereKategorie`), Kategorie-Formular und -Schnittstelle (`409 { fehler: 'art-gesperrt' }`, Text «Einzel oder Doppel lässt sich nur ändern, solange niemand angemeldet ist.»)
- Test: `src/lib/server/admin/mitgliedschaft.db.test.ts`, `src/lib/server/admin/loeschung.db.test.ts`, `src/lib/server/turnier/turniere.db.test.ts`, betroffene Schnittstellen-Tests

**Interfaces:**
- Produces: `zieheOffeneZurueck(tx: DbOderTx, mitgliedId: number, jetzt: Date): Promise<{ partner: { mitgliedId: number; kategorie: string; turnierId: number }[]; hinfaellig: { anderer: number; kategorie: string; turnierId: number }[] }>` (ersetzt `zieheOffeneEinzelZurueck`) — Einzel und Doppel, solange `jetzt` vor dem Ende des Anmeldeschluss-Tages (24 Uhr Zürich) liegt, **unabhängig vom gespeicherten oder von Hand gesetzten Status** (Entscheid Projektleiter); löscht alle offenen Anfragen von und an das Mitglied.
- `erfasseAustritt` und `merkeZumLoeschenVor` geben bei Erfolg `{ ergebnis: 'ok'; cm: Awaited<ReturnType<typeof zieheOffeneZurueck>> }` statt `'ok'`; die Schnittstellen melden danach: Partner `Eure Anmeldung für «<Kategorie>» ist zurückgezogen.`, Anfragen `Die Anfrage für «<Kategorie>» ist hinfällig.`
- Löschung: Suchtext und Anfragen der Gelöschten weg (wie heute `kommentar`), Kommentar «das Doppel regelt #59» entfernen.
- `aendereKategorie`: `art` anders als gespeichert und `zaehleAktive > 0` → `'art-gesperrt'` (auch mit `trotzdem`). `zaehleUnpassende` misst Doppel mit `passtAlsPaar(…, true)` bzw. `passtDoppelAllein` für Suchende.

- Doppel ohne Jahrgang: `pruefeKategorie` (`src/lib/server/turnier/angaben.ts`) setzt bei `art = 'doppel'` `jahrgangVon`/`jahrgangBis` auf `null`; `src/lib/verwaltung/Kategorieformular.svelte` zeigt das Fieldset *Jahrgang* nur bei *Einzel* (Svelte-Doku und Autofixer wie in Task 8).

- [ ] **Step 1: Failing Tests**: `FR-04: Austritt zieht offene Doppel zurück` (Paar → *zurückgezogen*, Meldung an Partner per Spion mit obigem Text, offene Anfragen weg; nach Anmeldeschluss bleibt das Paar); `FR-04: Austritt zieht auch zurück, wenn der CM-Admin früh geschlossen hat` (Status *geschlossen* von Hand, Datum noch nicht erreicht → Einzel und Doppel *zurückgezogen*); `FR-34: Doppel ohne Jahrgang` (`pruefeKategorie` mit Doppel und Jahrgang → Werte ohne Jahrgang); Löschung leert Suchtext und Anfragen; `FR-36: Einzel/Doppel wechseln nur ohne Anmeldungen` (mit aktiver → `art-gesperrt`, ohne → `ok`); Warnung zählt ein Paar, das nach höherer Mindestsumme nicht mehr passt.
- [ ] **Step 2:** Tests → FAIL
- [ ] **Step 3:** Implementieren; Rechte-Tests (`rechte-matrix.db.test.ts`) mit den neuen Diensten nachziehen.
- [ ] **Step 4:** `npx vitest run src/lib/server` → PASS
- [ ] **Step 5:** Commit `feat: Austritt und Löschung ziehen Doppel zurück, Art-Wechsel gesperrt (#59)`

### Task 7: Schnittstellen, Routen und Meldungen

**Files:**
- Create: `src/lib/server/cm/doppel-meldung.ts` (+ `doppel-meldung.test.ts`)
- Modify: `src/lib/server/cm/schnittstellen.ts` (+ `schnittstellen.db.test.ts`)
- Create (je dünnes `+server.ts`):
  - `src/routes/api/cm/kategorien/[id]/partner/+server.ts` (GET `?suche=`)
  - `src/routes/api/cm/kategorien/[id]/anfragen/+server.ts` (POST `{ anId }`)
  - `src/routes/api/cm/anfragen/[id]/annehmen/+server.ts`, `…/ablehnen/+server.ts`, `…/zurueckziehen/+server.ts` (POST `{}`)
  - `src/routes/api/cm/anmeldungen/[id]/suchtext/+server.ts` (POST `{ suchtext }`)
- `postCmAnmeldung` nimmt für Doppel `{ suchtext?: string }`.

**Interfaces:**
- Produces in `doppel-meldung.ts` (je `{ titel: 'Clubmeisterschaft'; text: string; pfad: string }`):
  - `anfrageMeldung(von, kategorie, turnierId)` → `<von> möchte mit dir «<Kategorie>» spielen. Annehmen oder ablehnen kannst du in MyTCO.`
  - `angenommenMeldung(an, …)` → `<an> hat angenommen. Ihr seid für «<Kategorie>» angemeldet.`
  - `abgelehntMeldung(an, …)` → `<an> hat deine Anfrage für «<Kategorie>» abgelehnt.`
  - `hinfaelligMeldung(mitName, …)` → `<mitName> hat inzwischen einen Partner für «<Kategorie>». Die Anfrage ist hinfällig.`
  - `abgemeldetMeldung(wer, …)` → `<wer> hat sich von «<Kategorie>» abgemeldet. Eure Anmeldung ist zurückgezogen.`
  - `austrittMeldung(…)`, `austrittAnfrageMeldung(…)` → Texte aus Task 6
- Antworten: Erfolg `200` mit neuer `CmAnsicht` (Suche: `PartnerTreffer[]`); Ablehnung `409 { fehler }` mit den Werten aus Task 4 (`FEHLER`-Liste ergänzen um `schon-angefragt`); Suchtext > 120 → `400 { fehler: 'eingabe', felder: { suchtext: 'Höchstens 120 Zeichen.' } }`.
- Bestätigungsmail (Teil 2) an den Handelnden bei allein anmelden (`an`), annehmen (`an`) und abmelden (`ab`); Meldungen erst nach dem Speichern, `void`, ohne auf sie zu warten (wie `postCmWildcard`).

- [ ] **Step 1: Failing Tests** für die Texte (exakt wie oben, ohne Ziffernfolgen einer Telefonnummer) und je Schnittstelle: Erfolg mit Meldung an die richtige Person (Spion auf `melde`), Bestätigungsmail nur an den Handelnden; 401 ohne Sitzung; Nicht-JSON → 415/400 wie bisher; Review Focus 3 direkt an `postCmAnfrage`.
- [ ] **Step 2:** `npx vitest run src/lib/server/cm` → FAIL
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests → PASS; `npm run pruefungen` → `bauregel: ok`
- [ ] **Step 5:** Commit `feat: Schnittstellen und Meldungen für Doppel und Anfragen (#59)`

### Task 8: Oberfläche (CM-Seite, Anmelde-Seite, Startseite)

**Files:**
- Modify: `src/routes/clubmeisterschaft/[id]/+page.svelte`, `src/routes/+page.svelte`, `src/lib/cm/api.ts` (+ Test), `src/lib/cm/anzeige.ts` (+ Test)
- Create: `src/routes/clubmeisterschaft/[id]/doppel/[kid]/+page.svelte`, `+page.ts` (lädt wie die CM-Seite)

**Interfaces:**
- Consumes: Task 5 und 7.
- Produces in `api.ts`: `sucheDoppelPartner(kategorieId, suche)`, `stelleAnfrage(kategorieId, anId)`, `nimmAnfrageAn(id)`, `lehneAnfrageAb(id)`, `zieheAnfrageZurueck(id)`, `setzeSuchtext(anmeldungId, suchtext)`, `meldeAn(kategorieId, suchtext?)`; `ABGELEHNT` + `schon-angefragt`; `CmFelder` + `suchtext`.
- Produces in `anzeige.ts`: `doppelText(k)` → `Doppel · <Geschlecht> · zusammen mind. <n>`; `vermerkText(v)` → `Klassierung fehlt` / `Angaben fehlen`; `SUCHTEXT_MAX = 120`; `standText` nennt offene Anfragen («2 Anmeldungen · 1 Anfrage»).

Aufbau genau nach dem Design-Entwurf, Variante A (Texte von dort):
- **CM-Seite:** oben Karte *Anfrage für «<Kategorie>»* je offene Anfrage (Name · Klassierung, Telefon-/Mail-Link, Satz zu den Kontaktdaten, *Ablehnen* Neben, *Annehmen* Haupt — höchstens eine Haupttaste: bei mehreren Anfragen alle Nebentasten). Doppelkategorie als Karte: Kachel mit Name, `doppelText`, Paaren und *Anmelden* (Link zur Anmelde-Seite, gesperrt bei `voll`); darunter *sucht Partner* (Plakette `plakette-offen`) mit Namen und Kommentar. Eigene Doppel-Anmeldung als eigene Karte: Paar mit Kontakt-Links und *Abmelden* (Satz «Dann ist auch <Vorname> abgemeldet und bekommt eine Meldung.»); allein mit Plakette, Kommentar, eigenen offenen Anfragen (*Zurückziehen*) und Leiste *Partner anfragen* · *Kommentar ändern* · *Abmelden*. Kontakt-Hinweis vor der ersten Anmeldung nennt auch den Doppelpartner.
- **Anmelde-Seite:** «‹ Zurück», Titel = Kategorie, Karte *Partner anfragen* (Suchfeld `type="search"`, Hilfe, `ul.trefferliste` ab zwei Buchstaben, verzögert 250 ms; Treffer «Name · R5» bzw. Vermerk-Plakette, *sucht Partner* mit Kommentar, *Anfragen* bzw. Plakette *angefragt* mit *Zurückziehen*; leer: «Niemand gefunden, der mit dir passt.»), Karte *Noch keinen Partner?* (Kommentar mit Hinweis «Alle Mitglieder sehen ihn. Bitte keine Angaben zur Gesundheit.», Zähler, *Allein anmelden*; ausgeblendet, wenn man schon allein angemeldet ist). Rückfrage-Dialog vor dem Senden mit Text aus dem Entwurf, Haupttaste *Anfrage senden*. Danach zurück zur CM-Seite mit «Anfrage an <Name> gesendet.».
- Fehlen einem Angefragten Angaben (`cm.fehlt`), steht die Anfrage-Karte über der Karte
  *Deine Angaben*, ohne *Annehmen*, mit dem Satz «Trag zuerst deine Angaben ein, dann kannst du
  annehmen.»; *Ablehnen* geht.
- Nach dem Anmeldeschluss: keine Tasten, Anfragen an einen ohne *Annehmen* mit Satz «Über offene Anfragen entscheidet jetzt die Turnierleitung.»; in *Ansicht als …* keine speichernden Tasten.
- Fehler `voll`, `geschlossen`, `passt-nicht`, `schon-angemeldet`, `angaben-fehlen` mit kurzem Satz und neu laden, wie heute.
- Nach jedem Speichern auf CM- und Anmelde-Seite die vorgeladene Startseite ungültig machen (`invalidateAll` bzw. wie die Kategorieseite der Verwaltung mit `refreshAll()`), damit der Zähler stimmt; scheitert das Nachladen, bleibt `MELDUNG.stoerung` statt einer Fehlerseite.

- [ ] **Step 1:** Svelte-Doku über MCP holen (`$state`, `$derived`, `$effect` für die verzögerte Suche, `<dialog>`).
- [ ] **Step 2: Failing Tests** für Client-Funktionen (Pfade, Methoden, Antwort-Arten) und `doppelText`, `vermerkText`, `standText`.
- [ ] **Step 3:** Implementieren; `svelte-autofixer` je Komponente bis ohne Befund.
- [ ] **Step 4:** `npx vitest run src/lib/cm` → PASS; `npm run check:svelte` → 0 Fehler, 0 Warnungen.
- [ ] **Step 5:** Commit `feat: Doppel und Partner-Anfrage auf der CM-Seite (#59)`

### Task 9: Seed, E2E mit Bildvergleich, Doku-Status

**Files:**
- Modify: `scripts/beispiel-turnier.ts` (+ `tests/scripts/beispiel-turnier.db.test.ts`), `tests/e2e/hilfen/login.ts`
- Create: `tests/e2e/cm-doppel.test.ts`
- Modify: `docs/fachmodell.md`, `docs/anforderungen/anforderungen.md`, `docs/versionen.md` (*Unveröffentlicht*), `docs/context-scopes.md` (Zeile *Clubmeisterschaft (Mitglieder)* um `doppel.ts`, `doppel-meldung.ts`, die neue Seite, `cm-doppel.test.ts`, diesen Plan)

- [ ] **Step 1: Seed** (wiederholbar, zweiter Lauf ändert nichts): Mixed Doppel Max/Lena als Paar, Damen Doppel Sara allein mit Kommentar «Suche jemanden auf R5–R7-Niveau, eher abends.», Herren Doppel Paul allein ohne Kommentar, eine offene Anfrage Urs → Paul, ein Spieler ohne Klassierung. Test: zwei Läufe, gleiche Zeilenzahl.
- [ ] **Step 2: E2E** (eigenes Turnier je Projekt, Mails aus Mailpit, `startetVomSymbol`):
  - `A-ANMELDUNG-04, FR-48, FR-19: Lea fragt Marco an, Marco nimmt an, beide sehen sich` — Suche «ma» zeigt «Marco Muster · R5»; Rückfrage; Mail an Marco `möchte mit dir «Mixed Doppel» spielen`; Marco sieht die Anfrage mit Leas Telefon, nimmt an; Lea sieht Marcos Telefon und E-Mail; `pruefeBildschirm` für Anmelde-Seite, Rückfrage, Anfrage-Karte, eigene Doppel-Karte
  - `FR-49, FR-10: allein mit Kommentar, Kommentar sichtbar, Abmelden zieht Paar zurück` — Kommentar erscheint bei der Kategorie für ein drittes Mitglied; nach dem Paaren ist er weg; Marco meldet ab → Mail an Lea `hat sich von «Mixed Doppel» abgemeldet`
  - `FR-48: Ablehnen` — Mail an Lea `hat deine Anfrage für «Mixed Doppel» abgelehnt`
- [ ] **Step 3: Bildvergleich:** Screenshots iPhone und Android der vier Bildschirme neben die Artboards des Entwurfs legen; Abweichungen ausser Inhalt beheben oder im Bericht begründen.
- [ ] **Step 4:** Status nachführen: FR-06, FR-07, FR-09, FR-10, FR-48, FR-49 → *umgesetzt (Mitglieder; Verwaltung mit Etappe 2)*; FR-19 → *umgesetzt (Doppelpartner)*; FR-04, FR-36 ergänzt *umgesetzt*. Eintrag unter *Unveröffentlicht* (kurz: Doppel mit Anfrage, «Partner gesucht» mit Kommentar).
- [ ] **Step 5:** `make check` im Hintergrund (`run_in_background`) → grün.
- [ ] **Step 6:** Commits `test: E2E für Doppel mit Partner-Anfrage (#59)` und `docs: CM Teil 3 Etappe 1 umgesetzt (#59)`; Design System *MyTCO* um die Trefferliste nachführen (nur geänderte Dateien).
