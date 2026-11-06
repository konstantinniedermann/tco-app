# Mitteilungen per Push und E-Mail — Teil 1 (Push, Anlass, Verein) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mitglieder schalten Push je Gerät ein und wählen drei Themen. Der Mitglieder-Admin verschickt Mitteilungen zu einem Anlass oder an den ganzen Verein, mit Vorlage, Empfängerwahl, Weg, Vorschau, Rückfrage und Verlauf.

**Architecture:** Neues Server-Modul `src/lib/server/mitteilung/` nach dem Muster von `anlass/`: reine Prüf- und Vorlagenfunktionen, DB-Funktionen, Schnittstellen mit injizierbaren Diensten (`PushSender`, `Mailer`, `jetzt`). Das Push-Abo hängt per Fremdschlüssel an der Sitzung und verschwindet mit ihr. Ein SvelteKit-Service-Worker zeigt nur Pushes an und öffnet beim Tipp den Link, ohne Cache.

**Tech Stack:** SvelteKit 3 (Runes, `ssr = false`), Drizzle/PostgreSQL, nodemailer (vorhanden), `web-push` (neu, Freigabe nötig), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-mitteilungen-design.md` (Ziele 1–16). **Nicht in diesem Plan:** der CM-Teil (Ziel 6 Zeile *CM*, Ziel 7 CM-Vorlagen, Ziel 9 *CM*). Er bekommt einen eigenen, kurzen Plan, sobald #58 mit `passtEinzel`, Klassierung und Anmeldungen auf `dev` liegt. Seine Schnittstellen gibt es heute noch nicht, und raten wäre teurer als warten. Die Bausteine hier sind so geschnitten, dass der CM-Teil nur eine Empfänger-Funktion, Vorlagen und zwei Schnittstellen ergänzt.

## Global Constraints

- Kein Code vor Task 1 (Datenschutzkonzept und -erklärung zuerst, CLAUDE.md).
- `web-push` erst installieren, wenn der Projektleiter die Abhängigkeit freigegeben hat. Blockt `dep-guard`, Namen melden und warten.
- Svelte-/SvelteKit-Code nur nach Doku über den Svelte-MCP-Server; Komponenten durch `svelte-autofixer`.
- Unter `src/routes` nur `+server.ts` als Server-Datei (ADR-002).
- Oberfläche nur aus Bausteinen von `docs/ui-leitbild.md`; fehlt einer, zuerst ins Leitbild.
- Eigene Datenbank für diesen Worktree: im Postgres-Container `mytco_063` anlegen. Alle `make seed`, `make e2e` und `make check` laufen mit `DATABASE_URL=postgres://mytco:mytco_lokal@localhost:55432/mytco_063`. Die Migration entsteht erst nach `git merge origin/dev`. Kommt danach eine fremde Migration auf `dev`: eigene Migration löschen, neu erzeugen, `mytco_063` neu aufsetzen.
- Neue IDs: FR-40 bis FR-45, SI-21, SI-22. FR-36/37 und Migration 0011 belegt #58.
- Testnamen beginnen mit der ID (`'FR-42: …'`), wie in `src/lib/server/anlass/schnittstellen.db.test.ts`.
- SI-05: Schnittstellen und Versand loggen nichts, weder Titel noch Text, Adressen oder Endpunkte (Log-Spione wie in den bestehenden DB-Tests).
- DS-05: Mail je Empfänger einzeln, nie mehrere Adressen in `to`.
- Testdaten erfunden (DS-08). Commits einzeln stagen, Präfix `feat:`/`docs:`/`test:`.
- Werte aus dem Spec: Titel 1–50 Zeichen, Text 1–200 Zeichen (nach `trim`). Verlauf 365 Tage. Themen für neue Konten an.

## Review Focus

1. **Fremde Push-Adresse (SSRF):** Der Server schickt an die URL, die der Browser meldet. Erlaubt sind nur `https:` an bekannte Push-Dienste. Alles andere wird mit 400 abgewiesen, bevor es gespeichert wird (Test in Task 4).
2. **Geteiltes Handy:** Meldet sich auf demselben Gerät ein anderes Konto an, darf das alte Konto keine Pushes mehr dorthin bekommen. Derselbe Endpunkt wird übernommen, nicht verdoppelt (Test in Task 4). Nach dem Abmelden gibt es kein Abo mehr (Cascade, Test in Task 3).
3. **Ausgetretene und gesperrte Mitglieder:** Wer `status <> 'aktiv'` hat, bekommt nichts, auch wenn noch ein Abo existiert (Test in Task 6).
4. **Mitglied ohne Push und Thema aus:** Bei *Push und E-Mail an alle* bekommt es trotzdem nichts. Das Thema gilt für beide Wege (Test in Task 6).
5. **Doppelklick auf «Senden»:** Die Oberfläche sperrt die Taste, solange die Anfrage läuft. Ein zweiter Versand ist eine neue Mitteilung im Verlauf, kein Absturz (E2E in Task 8 prüft die gesperrte Taste).

---

### Task 1: Konzept und Datenschutz nachführen

**Files:**
- Modify: `docs/datenschutz.md` (Welche Daten, Löschen, DS-05 unverändert)
- Modify: `docs/datenschutzerklaerung.md` und `src/routes/datenschutz/` bzw. `src/lib/datenschutz/` (dieselbe Erklärung in der App, DS-09; Struktur dort ansehen)
- Modify: `docs/fachmodell.md` (Entitäten *Push-Abo*, *Mitteilung*; Konto um Themen; FR-40 bis FR-45 als *geplant*)
- Modify: `docs/rollen-und-rechte.md` (Matrix: Zeile Benachrichtigungen bleibt; neu unter **Anlässe** «Mitteilung zum Anlass senden, Verlauf» und neuer Block **Verein** «Mitteilung an den Verein senden, Verlauf»: Mitglieder-Admin S, MyTCO-Admin L, sonst –)
- Modify: `docs/sicherheitskonzept.md` (SI-21, SI-22)
- Modify: `docs/anforderungen/anforderungen.md` (N-APP-02: Bezug #63)

**Interfaces:** Produces die IDs, auf die alle Tests verweisen:

| ID | Regel |
|----|-------|
| FR-40 | Push gilt je Gerät und nur nach Einschalten durch das Mitglied; das Abo gehört zur Sitzung und endet mit ihr |
| FR-41 | Themen *Anlässe*, *Clubmeisterschaft*, *Verein*, für neue Konten an; sie gelten für Push und E-Mail einer Mitteilung, nicht für Bestätigungen und Codes |
| FR-42 | Eine Mitteilung verschickt nur der Mitglieder-Admin (Anlass, Verein), von Hand, nach Vorschau und Rückfrage; Titel 1–50, Text 1–200 Zeichen |
| FR-43 | Empfänger sind aktive Mitglieder; beim Anlass genau eine Auswahl *alle*, *noch keine Antwort*, *kommt*, *kommt nicht*, *zu prüfen* (wie FR-32); wer das Thema abgeschaltet hat, fällt weg |
| FR-44 | Weg *nur Push*, *Push, sonst E-Mail*, *Push und E-Mail*; bei *Push, sonst E-Mail* bekommt eine E-Mail, wer kein Abo hat oder bei wem jeder Push scheiterte |
| FR-45 | Der Verlauf nennt Zeit, Absender, Titel, Text, Auswahl, Weg und Zahlen, keine Empfängernamen; Einträge älter als 365 Tage löscht der nächste Versand |
| SI-21 | Push-Endpunkte nur `https:` mit Host `fcm.googleapis.com`, `*.push.apple.com`, `updates.push.services.mozilla.com` oder `*.notify.windows.com`, höchstens 1000 Zeichen; Schlüssel nur base64url |
| SI-22 | VAPID-Schlüsselpaar je Umgebung als Geheimnis; ohne Schlüssel ist Push aus, Mitteilungen gehen nur per E-Mail |

- [ ] **Step 1:** Abschnitte nach der Tabelle oben und dem Abschnitt *Datenschutz* des Spec schreiben. Datenschutzerklärung: ein Absatz in Laiensprache (Push über Apple, Google, Mozilla oder Microsoft; die Nachricht geht verschlüsselt; im Profil abschaltbar). Kurz halten (Memory: Konzepte minimal).
- [ ] **Step 2:** `make docs`. Erwartet: `Doku-Check ok.`, `annahmen: ok`.
- [ ] **Step 3:** Commit `docs: Datenschutz, Fachmodell und Rechte für Mitteilungen (#63)`.

### Task 2: Abhängigkeit und Einstellungen

**Files:**
- Modify: `package.json`, `package-lock.json` (nur nach Freigabe: `web-push`, dev `@types/web-push`)
- Modify: `src/lib/server/einstellungen.ts`, `src/lib/server/einstellungen.test.ts`
- Modify: `.env.example`, `betrieb/geheim.env.example`, `betrieb/compose.umgebung.yml`, `docs/betrieb-und-uebergabe.md` (Geheimnisse-Liste)

**Interfaces:**
- Produces: `Einstellungen.vapid: { oeffentlich: string; privat: string } | undefined` aus `MYTCO_VAPID_OEFFENTLICH` und `MYTCO_VAPID_PRIVAT`. Beide leer heisst `undefined`. Nur einer gesetzt heisst Fehler `'MYTCO_VAPID_OEFFENTLICH und MYTCO_VAPID_PRIVAT nur zusammen'`. Werte müssen base64url sein, sonst Fehler mit dem Variablennamen (SI-05: nie den Wert nennen).

- [ ] **Step 1:** Tests in `einstellungen.test.ts`: `'SI-22: ohne VAPID-Schlüssel ist vapid undefined'`, `'SI-22: nur ein VAPID-Schlüssel wirft'`, `'SI-22: beide gesetzt ergibt vapid'`, `'SI-22: Fehlertext nennt keinen Wert'`.
- [ ] **Step 2:** `npm run test:einheit -- einstellungen` → FAIL.
- [ ] **Step 3:** Umsetzen. In `.env.example` ein nur lokal gültiges Paar eintragen (mit `npx web-push generate-vapid-keys` erzeugt), Kommentar wie beim Code-Schlüssel. In `compose.umgebung.yml` beide als optional durchreichen (`${MYTCO_VAPID_OEFFENTLICH:-}`).
- [ ] **Step 4:** Test → PASS. Commit `feat: VAPID-Schlüssel als Einstellung (SI-22, #63)`.

### Task 3: Datenmodell und Migration

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Create: `drizzle/00NN_mitteilungen.sql` (über `npm run db:generate -- --name mitteilungen`, nach `git merge origin/dev`)
- Test: `src/lib/server/mitteilung/schema.db.test.ts`

**Interfaces (Produces):**
- `konto`: `themaAnlaesse`, `themaCm`, `themaVerein` — `boolean`, not null, default `true`.
- `pushAbo` (`push_abo`): `endpunkt text PK`, `sitzungHash text not null → sitzung.kennungHash on delete cascade`, `kontoId integer not null → konto.id on delete cascade` (Index), `p256dh text not null`, `auth text not null`, `eingerichtetAm timestamptz not null`.
- `mitteilung`: `id serial`, `bezug text` (`'anlass' | 'verein'`, Check; `'cm'` kommt mit dem CM-Plan), `anlassId integer null → anlass.id on delete cascade`, Check `(bezug = 'anlass') = (anlass_id is not null)`, `absenderId integer null → mitglied.id on delete set null`, `gesendetAm timestamptz not null`, `titel text`, `text text`, `auswahl text`, `weg text` (Check `'push' | 'push-sonst-mail' | 'push-und-mail'`), `push integer`, `mails integer`, `ersatzMails integer`, `nichtErreichbar integer` (alle not null default 0). Index `(anlass_id, gesendet_am)`, Index `gesendet_am`.
- Exportierte Typen: `Thema = 'anlaesse' | 'cm' | 'verein'`, `Weg`, `Bezug`.

- [ ] **Step 1:** DB-Tests: `'FR-40: Abmelden löscht das Push-Abo der Sitzung'` (Abo anlegen, `beendeSitzung`, Abo weg), `'FR-41: neue Konten haben alle Themen an'`, `'FR-45: Löschen des Anlasses löscht seine Mitteilungen'`, `'FR-45: Mitteilung zum Anlass ohne anlassId wird abgewiesen'`.
- [ ] **Step 2:** `npm run test:db -- mitteilung/schema` → FAIL.
- [ ] **Step 3:** Schema ergänzen, Migration erzeugen, SQL lesen (nur `CREATE`/`ALTER … ADD`, nichts löschen).
- [ ] **Step 4:** Test → PASS. Commit `feat: Tabellen für Push-Abos und Mitteilungen (#63)`.

### Task 4: Push einschalten — Server

**Files:**
- Create: `src/lib/server/mitteilung/abo.ts`, `abo.test.ts` (reine Prüfung), `abo.db.test.ts`
- Create: `src/lib/server/mitteilung/schnittstellen.ts` (Mitglieder-Teil), `index.ts` (`holeMitteilungDienste()` nach Muster `anlass/index.ts` und `admin/index.ts`)
- Create: `src/routes/api/benachrichtigungen/+server.ts`, `src/routes/api/benachrichtigungen/abo/+server.ts`, `src/routes/api/benachrichtigungen/abo/loeschen/+server.ts`
- Test: `src/lib/server/mitteilung/schnittstellen.db.test.ts`

**Interfaces (Produces):**
- `pruefeAbo(roh: unknown): { ok: true; abo: { endpunkt: string; p256dh: string; auth: string } } | { ok: false }`. Eingabe hat die Form von `PushSubscription.toJSON()`: `{ endpoint, keys: { p256dh, auth } }`. Regeln SI-21.
- `speichereAbo(db, kontoId: number, sitzungHash: string, abo, jetzt: Date): Promise<void>` — Upsert auf `endpunkt`, setzt Konto und Sitzung neu.
- `loescheAbo(db, sitzungHash: string): Promise<void>`
- `ladeEinstellungen(db, kontoId, sitzungHash): Promise<{ themen: Record<Thema, boolean>; pushHier: boolean }>`
- `setzeThemen(db, kontoId, themen: Record<Thema, boolean>): Promise<void>`
- `MitteilungDienste = { db: Db; vapidOeffentlich: string | null; push: PushSender; mailer: Mailer; adresse: string; jetzt?: () => Date }`
- HTTP: `GET /api/benachrichtigungen` → `{ themen, pushHier, schluessel: string | null }`. `POST` dieselbe Adresse mit `{ themen }` → 200 mit neuem Stand. `POST …/abo` mit dem Abo-JSON → 200 `{ pushHier: true }`, 400 `{ fehler: 'eingabe' }`, 409 `{ fehler: 'push-aus' }` ohne VAPID. `POST …/abo/loeschen` → 200. Ohne Sitzung 401, ohne JSON 415 (Helfer aus `login/schnittstellen.ts`). In der *Ansicht als …* greift der bestehende Riegel im Hook.

- [ ] **Step 1:** Einheitstests `abo.test.ts`: `'SI-21: Endpunkt von fcm.googleapis.com ist gültig'`, je einer für `web.push.apple.com`, Mozilla und Windows, `'SI-21: http: wird abgewiesen'`, `'SI-21: fremder Host wird abgewiesen'` (`https://example.org/x`, `https://fcm.googleapis.com.evil.example/x`), `'SI-21: Endpunkt über 1000 Zeichen wird abgewiesen'`, `'SI-21: Schlüssel mit + oder / wird abgewiesen'`.
- [ ] **Step 2:** DB-Tests in `schnittstellen.db.test.ts`: `'FR-40: Abo speichern und pushHier'`, `'FR-40: gleicher Endpunkt von einem anderen Konto übernimmt das Abo'` (danach hat das erste Konto 0 Abos), `'FR-40: Abo löschen'`, `'FR-41: Themen setzen und lesen'`, `'FR-41: Themen mit fehlendem Schlüssel → 400'`, `'SI-22: Abo ohne VAPID → 409 push-aus'`, `'FR-40: ohne Sitzung 401'`, `'SI-10: ohne JSON 415'`.
- [ ] **Step 3:** Tests → FAIL, umsetzen, Tests → PASS.
- [ ] **Step 4:** Commit `feat: Push-Abo und Themen speichern (FR-40, FR-41, SI-21, #63)`.

### Task 5: Push einschalten — Gerät und Oberfläche

**Files:**
- Create: `src/service-worker/index.ts`, `src/service-worker/tsconfig.json`; Modify: `tsconfig.json` (`exclude`), nach MCP-Doku *Service workers*
- Create: `src/lib/push/geraet.ts`, `geraet.test.ts`
- Create: `src/lib/push/api.ts`, `api.test.ts` (nach Muster `src/lib/anlass/api.ts`)
- Create: `src/lib/push/Benachrichtigungen.svelte` (Karte fürs Profil), `src/lib/push/PushHinweis.svelte` (Startseite)
- Modify: `src/routes/profil/+page.svelte`, `src/routes/+page.svelte`
- Test: `tests/e2e/benachrichtigungen.test.ts`

**Interfaces:**
- Consumes: HTTP aus Task 4; `erkenneGeraet`, `laeuftVomSymbol` aus `src/lib/hilfe/geraet.ts`.
- Produces:
  - `pushMoeglich(f: { navigator: Navigator; window: Window }): 'ja' | 'iphone-startbildschirm' | 'nein'` — `'iphone-startbildschirm'` heisst iPhone und nicht vom Symbol gestartet; `'nein'` heisst ohne `PushManager`/`serviceWorker`.
  - `schalteEin(schluessel: string): Promise<'ein' | 'abgelehnt' | 'stoerung'>` — `Notification.requestPermission()` nur aus dem Tipp, dann `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` und POST.
  - `schalteAus(): Promise<void>` — `subscription.unsubscribe()` und POST `…/loeschen`.
  - Service Worker: `push` → `showNotification(titel, { body: text, data: { link }, icon: '/icon-192.png' })`; `notificationclick` → offenes Fenster fokussieren und zu `link` navigieren, sonst `clients.openWindow(link)`. Nur Links mit gleichem Ursprung öffnen. **Kein `fetch`-Handler, kein Cache.**
  - Startseiten-Hinweis: Gerätespeicher-Schlüssel `mytco.pushHinweis = 'nein'` (in try/catch). Der Hinweis erscheint nur, wenn `pushMoeglich === 'ja'`, nichts abonniert ist und der Merker fehlt.

- [ ] **Step 1:** Einheitstests `geraet.test.ts` für die drei Ergebnisse von `pushMoeglich` (iPhone-UA vom Symbol → `'ja'`, iPhone-UA im Browser → `'iphone-startbildschirm'`, ohne `PushManager` → `'nein'`). `api.test.ts` für die Ergebnis-Abbildung (401, 409 `push-aus`, Störung).
- [ ] **Step 2:** FAIL, umsetzen, PASS.
- [ ] **Step 3:** Oberfläche: Profil-Karte *Benachrichtigungen* mit dem Schalter «Push auf diesem Gerät» (bzw. dem iPhone-Hinweis mit Link auf `/hilfe`, bzw. «Push ist hier nicht eingerichtet», wenn `schluessel === null`) und drei Schaltern *Anlässe*, *Clubmeisterschaft*, *Verein*. Startseite: eigene Fläche «Mitteilungen aufs Handy?» mit «Einschalten» und «Nein, danke» (Memory: Themen visuell trennen). `svelte-autofixer` über beide Komponenten.
- [ ] **Step 4:** E2E (`startetVomSymbol(page)` beachten, Memory *E2E und Einstiegsseite*): `'FR-41: Themen im Profil ab- und wieder einschalten bleibt nach Neuladen'`, `'FR-40: «Nein, danke» blendet den Hinweis auf der Startseite dauerhaft aus'`. Echtes Abonnieren nicht im E2E: Der Push-Dienst ist in CI nicht erreichbar.
- [ ] **Step 5:** `make check-schnell`, dann Commit `feat: Push im Profil einschalten, Hinweis auf der Startseite (#63)`.

### Task 6: Empfänger, Vorlagen und Versand

**Files:**
- Create: `src/lib/server/mitteilung/angaben.ts` + `angaben.test.ts` (Prüfung Titel/Text/Auswahl/Weg)
- Create: `src/lib/mitteilung/vorlagen.ts` + `vorlagen.test.ts` (rein, auch im Browser)
- Create: `src/lib/server/mitteilung/empfaenger.ts` + `empfaenger.db.test.ts`
- Create: `src/lib/server/mitteilung/versand.ts` + `versand.db.test.ts`
- Create: `src/lib/server/mitteilung/web-push.ts` (Adapter, ohne eigenen Test; in Task 9 per Hand belegt)

**Interfaces (Produces):**
- `AnlassAuswahl = 'alle' | 'keine-antwort' | 'kommt' | 'kommt-nicht' | 'zu-pruefen'`
- `pruefeMitteilung(roh: unknown, auswahlen: readonly string[]): { ok: true; werte: { titel: string; text: string; auswahl: string; weg: Weg } } | { ok: false; felder: ('titel' | 'text' | 'auswahl' | 'weg')[] }`
- `vorlagenAnlass(a: { titel: string; beginn: Date; anmeldeschluss: Date }): { art: 'erinnerung' | 'aenderung' | 'neu'; titel: string; text: string }[]`. Datum und Zeit in Schweizer Zeit nach `src/lib/anlass/zeit.ts`. Sätze sinngemäss wie Spec Ziel 7, jeder Titel höchstens 50, jeder Text höchstens 200 Zeichen, auch mit einem 120 Zeichen langen Anlasstitel (dann kürzen mit `…`).
- `Empfaenger = { mitgliedId: number; name: string; email: string | null; abos: { endpunkt: string; p256dh: string; auth: string }[] }`
- `anlassEmpfaenger(db, anlassId: number, auswahl: AnlassAuswahl, jetzt: Date): Promise<Empfaenger[]>` — aktive Mitglieder (`mitglied.status = 'aktiv'`, Konto nicht `gesperrt`), `konto.themaAnlaesse = true` oder ohne Konto (dann ohne Abos, nur Mail). *zu prüfen* mit genau der Regel aus `alsAnsicht` in `anlass/anlaesse.ts` (offen, Antwort älter als `terminGeaendertAm`); diese Regel nicht kopieren, sondern als Funktion auslagern und beide Stellen sie nutzen lassen.
- `vereinEmpfaenger(db): Promise<Empfaenger[]>` — dasselbe mit `themaVerein`.
- `PushSender = (abo, nutzlast: string) => Promise<'ok' | 'ungueltig' | 'fehler'>`; `web-push.ts` exportiert `erstelleWebPush(vapid, subject: string): PushSender` (Status 404/410 → `'ungueltig'`, TTL 86400, `subject` = `MYTCO_ADRESSE`).
- `Zahlen = { push: number; mails: number; ersatzMails: number; nichtErreichbar: number }`
- `vorschau(empf: Empfaenger[], weg: Weg): Zahlen & { anzahl: number; namen: string[] }`. Ohne VAPID zählt jeder als ohne Push.
- `versende(d: { push: PushSender | null; mailer: Mailer; db: Db }, empf, m: { titel; text; link: string; weg: Weg }): Promise<Zahlen>` — zuerst alle Pushes, `'ungueltig'` löscht das Abo, dann Mails. Fehler eines Empfängers fangen und weiterzählen, nie werfen, nie loggen.
- Mailtext: `text`, Leerzeile, `link`, Leerzeile, «Diese Mitteilungen kannst du im Profil abschalten: {adresse}/profil». Betreff = `titel`.

- [ ] **Step 1:** Einheitstests: `'FR-42: Titel 50 Zeichen ok, 51 abgewiesen'`, `'FR-42: Text leer nach trim abgewiesen'`, `'FR-44: unbekannter Weg abgewiesen'`, `'FR-42: Vorlagen bleiben in den Grenzen auch mit langem Anlasstitel'`.
- [ ] **Step 2:** DB-Tests `empfaenger.db.test.ts` mit erfundenen Mitgliedern: je ein Test pro Auswahl (`'FR-43: keine-antwort …'` usw.), `'FR-43: ausgetretenes Mitglied mit Abo bekommt nichts'`, `'FR-43: Thema Anlässe aus → nicht dabei'`, `'FR-43: zu-pruefen nach Anmeldeschluss leer'`.
- [ ] **Step 3:** DB-Tests `versand.db.test.ts` mit einem `PushSender`-Stub und gesammelten Mails: `'FR-44: nur Push schickt keine Mail'`, `'FR-44: Push sonst Mail: ohne Abo Mail, mit Abo keine'`, `'FR-44: Push sonst Mail: alle Pushes gescheitert → Ersatz-Mail'`, `'FR-44: Push und Mail: beides'`, `'FR-44: ungueltig löscht das Abo'`, `'FR-44: Mailfehler bei einem hält die anderen nicht auf'`, `'DS-05: jede Mail hat genau einen Empfänger'`, `'FR-44: ohne Mail-Adresse und ohne Push zählt als nicht erreichbar'`.
- [ ] **Step 4:** FAIL, umsetzen, PASS. Commit `feat: Empfänger, Vorlagen und Versand von Mitteilungen (FR-42 bis FR-44, #63)`.

### Task 7: Schnittstellen für den Mitglieder-Admin

**Files:**
- Modify: `src/lib/server/mitteilung/schnittstellen.ts` (Admin-Teil), `index.ts`
- Create: `src/lib/server/mitteilung/verlauf.ts`
- Create routes: `src/routes/api/admin/anlaesse/[id]/mitteilungen/+server.ts` (GET Verlauf und Vorlagen), `…/mitteilungen/vorschau/+server.ts` (POST), `…/mitteilungen/senden/+server.ts` (POST); dieselben drei unter `src/routes/api/admin/mitteilungen/`
- Test: `src/lib/server/mitteilung/admin-schnittstellen.db.test.ts`; Modify: `src/lib/server/admin/rechte-matrix.db.test.ts` (neue Schnittstellen in die Matrix)

**Interfaces:**
- Consumes: `liest`/`schreibt` aus `admin/schnittstellen.ts` mit Bereich `'mitglieder'`, also nur Mitglieder-Admin schreibt, MyTCO-Admin liest. Dafür braucht `MitteilungDienste` zusätzlich `zugang: ZugangDienst`, oder die Funktionen erhalten `AdminDienste` und `MitteilungDienste` getrennt (Implementierer wählt; die Rechte-Matrix muss sie wie die übrigen prüfen).
- Produces HTTP:
  - `GET …/mitteilungen` → `{ vorlagen, verlauf: { gesendetAm, absender: string | null, titel, text, auswahl, weg, push, mails, ersatzMails, nichtErreichbar }[] }` (Verein: `vorlagen: []`).
  - `POST …/vorschau` `{ titel, text, auswahl, weg }` → `{ anzahl, push, mails, nichtErreichbar, namen }` bzw. 400 `{ fehler: 'eingabe', felder }`.
  - `POST …/senden` dasselbe → 201 `Zahlen`. Löscht davor Verlaufseinträge älter als 365 Tage (`jetzt`) und schreibt den neuen Eintrag. Link: `{adresse}/anlass/{id}` bzw. `{adresse}/`.
  - 404 bei unbekanntem Anlass.

- [ ] **Step 1:** DB-Tests: `'FR-42: Mitglieder-Admin sendet, Verlauf zeigt den Eintrag ohne Namen'`, `'FR-42: CM-Admin 403'`, `'FR-42: MyTCO-Admin liest den Verlauf, Senden 403'`, `'FR-42: Ansicht als … senden 403 nur-ansehen'`, `'FR-45: Senden löscht Einträge älter als 365 Tage, jüngere bleiben'`, `'FR-43: Vorschau liefert Namen nach Nachname'`, `'SI-05: nichts geloggt'`. Rechte-Matrix ergänzen.
- [ ] **Step 2:** FAIL, umsetzen, PASS. Commit `feat: Mitteilungen in der Verwaltung senden (FR-42, FR-45, #63)`.

### Task 8: Verwaltung — Formular, Vorschau, Verlauf

**Files:**
- Create: `src/lib/verwaltung/Mitteilungsformular.svelte`, `src/lib/verwaltung/mitteilung-api.ts` + `.test.ts`
- Modify: `src/routes/verwaltung/anlaesse/[id]/+page.svelte` (Abschnitt *Mitteilungen* mit «Neue Mitteilung» und Verlauf)
- Create: `src/routes/verwaltung/mitteilungen/+page.svelte`, `+page.ts`; Modify: Navigation der Verwaltung (Bereich *Mitgliederverwaltung*, RR-07; Ort über `src/lib/verwaltung/bereiche.ts` und `+layout.svelte` finden)
- Test: `tests/e2e/mitteilungen.test.ts`; Modify: `scripts/beispiel-anlass.ts` (ein erfundener Verlaufseintrag für Vorführung)

**Interfaces:** Consumes HTTP aus Task 7, `vorlagenAnlass` nur über die Antwort von GET.

- [ ] **Step 1:** Formular nach Spec Ziel 7–11: Wahl Vorlage/Leer, Titel und Text mit Zeichenzähler, fester DS-05-Hinweis, Auswahl Empfänger (Anlass: fünf Optionen; Verein: keine Wahl), Weg (Vorauswahl *Push, sonst E-Mail*), Taste «Vorschau» → Zahlen und aufklappbare Namen, Taste «Senden» → Rückfrage «Jetzt an {anzahl} Mitglieder senden?» → Senden. Ändert sich ein Feld nach der Vorschau, verfällt sie. Die Taste ist während der Anfrage gesperrt. Ungespeicherte Änderungen nach `src/lib/ui/ungespeichert.ts`. Verlauf als Liste, neueste zuerst. `svelte-autofixer`.
- [ ] **Step 2:** E2E: `'FR-42: Mitglieder-Admin wählt Erinnerung, sieht Vorschau mit Zahl und Namen, sendet nach Rückfrage, Verlauf zeigt den Eintrag'` (Mail kommt in Mailpit an, Betreff geprüft), `'FR-42: Senden-Taste ist während des Sendens gesperrt'`, `'FR-42: allgemeine Mitteilung an den Verein'`, `'FR-42: CM-Admin sieht keinen Bereich Mitteilungen'`, Axe-Prüfung wie in den übrigen Verwaltungs-Tests.
- [ ] **Step 3:** `make e2e` mit `DATABASE_URL=…/mytco_063` → PASS. Commit `feat: Mitteilungen in der Verwaltung: Formular, Vorschau, Verlauf (#63)`.

### Task 9: Nachweis und Abschluss

**Files:** Modify: `docs/fachmodell.md`, `docs/sicherheitskonzept.md`, `docs/anforderungen/anforderungen.md` (Status *umgesetzt*, N-APP-02 *umgesetzt\** mit «CM folgt»), `docs/versionen.md` (Unveröffentlicht), `docs/context-scopes.md` (Zeile *Mitteilungen und Push*), `README.md` nur falls dort Funktionen aufgezählt sind.

- [ ] **Step 1:** Echter Push lokal: `make build`, App aus dem Build auf `localhost` starten (Weg aus `make help`/`docs/ci-cd-und-release.md`; der Service Worker wird nur im Build gebündelt), in Chrome am Mac anmelden, Push einschalten, als Mitglieder-Admin eine Mitteilung *nur Push* an *alle* senden. Screenshot der macOS-Mitteilung und des Verlaufs nach `/private/tmp/…/scratchpad/` (nicht ins Repo). Tipp auf die Mitteilung öffnet den Anlass.
- [ ] **Step 2:** Doku-Status nachführen, `make check` mit eigener DB → grün.
- [ ] **Step 3:** Agent `cas-reviewer` und superpowers-Review über den Branch; Befunde klären.
- [ ] **Step 4:** Commit `docs: Mitteilungen umgesetzt (#63)`; Merge nach `dev` nach Skill `tco-branching` (Nebenversion: spürbare neue Funktion). Im Issue offen bleibt «Handtest iPhone/Android auf Test» und der CM-Teil.
