[← Refactoring-Analyse](refactoring-analyse.md)

# Refactoring MyTCO — Protokoll Etappe 1

Ausgelagert aus der [Refactoring-Analyse](refactoring-analyse.md) (E-60). Dort heisst dieser Teil
weiter «Anhang D»; Verweise wie «D.3» oder «Anhang D.3» meinen die Abschnitte dieser Datei.
Die Etappe ist abgeschlossen; diese Datei wird nicht mehr nachgeführt.

## Anhang D — Protokoll Etappe 1 [neu]

Erkenntnisse, Belege und Commits je Schritt der Etappe 1. Die Kurzfassung steht je Schritt in 7.3
(«Ergebnis Schritt NN»).

### D.1 Schritt 06

**Erkenntnisse Schritt 06** (11.11.2026, Branch `refactor/schritt-06`)

- **Bestand am Code nachgelesen, Befunde B-12 und B-38 bestätigt.** `antwort`, `istJson`,
  `leseKoerper`, `formatFehler`, `Ereignis` standen in `login/schnittstellen.ts` und wurden aus acht
  Dateien importiert (sieben Schnittstellen-Dateien der Themen und `admin/ansicht.ts`), dazu aus
  `login/passkey-schnittstellen.ts` und `tests/hilfen/anfrage.ts`. `nichtGefunden` sechsmal
  (`admin`, `anlass`, `cm`, `gespraech`, `mitteilung`, `turnier`), `eingabeFehler` zweimal (`admin`,
  `turnier`), `jetzt` neunmal (sechs Module, dazu `jetztAdmin` in `mitteilung` und `gespraech`,
  `jetztMitglied` in `gespraech`), `mitSitzung` dreimal (`anlass`, `cm` exportiert, `mitteilung`),
  `mitKonto` zweimal, `aendernd` zweimal (`cm` exportiert, von `gespraech` benutzt; `profil`). Alle
  gleichnamigen Definitionen waren bis auf den Parametertyp Zeichen für Zeichen gleich, ausser
  `mitKonto` und `aendernd` (B-38).
- **Charakterisierungstest (erster Commit `17d71cf`):** In `grundpruefung.db.test.ts` ein fünfter Test
  über **alle** schreibenden Einträge der Listen (26 Mitglieder, 42 Verwaltung): ohne Sitzung und
  ohne JSON antwortet jede 415 `{ fehler: 'format' }` mit `no-store`. Benannte Ausnahmen
  (`OHNE_BEIDES_ANDERS`): keine. Die Verwaltung gehört dazu, weil `schreibt` dieselbe Reihenfolge hat.
  **Einmal rot** (je auf committetem Stand, per Edit zurückgenommen): `aendernd` in `cm` prüft die
  Sitzung zuerst → `cm.postCmAngaben` 401 `abgemeldet` statt 415; `schreibt` prüft das Format nur mit
  Konto → `admin.postMitglieder` 401 statt 415. Beide Male blieben die vier bisherigen Tests grün:
  Die Lücke aus «Was das Netz deckt» war echt.
- **Unterschiede zwischen «gleichen» Bausteinen und ihr Netz:** `mitSitzung` (`anlass`, `cm`,
  `mitteilung`) und `mitKonto` von `profil` sind im Verhalten gleich (401 `abgemeldet`); das deckt
  die 401-Schleife über alle 36 Einträge. `aendernd` von `cm` und von `profil` unterscheiden sich nur
  darin, wann der Körper gelesen wird; beide Formen bleiben (unten), darum kein neuer Test.
- **Formen festgelegt:**
  1. **`mitKonto`:** Das von `profil` ist `mitSitzung` (nur Sitzung) und heisst jetzt so. Das der
     Verwaltung bleibt in `admin/schnittstellen.ts`: Es ruft `zugang.pruefe` und antwortet auch 403
     `kein-admin`, gehört also zur Rechteprüfung. Ob es mit nach `admin/rechte.ts` zieht, entscheidet
     Schritt 06a (Hinweise zu 06a).
  2. **`aendernd`:** zwei Funktionen in `http.ts`. `aendernd(e, fn)` ohne Körper (Form von `cm`),
     `aenderndMitKoerper(e, fn)` liest den Körper nach der Sitzung und reicht ihn mit (Form von
     `profil`, gebaut als `aendernd(e, async (konto) => fn(konto, await leseKoerper(e)))`; gleiche
     Reihenfolge: Format, Sitzung, Körper, `fn`). Eine einzige Form, die immer liest, änderte
     Verhalten: Die CM-Schnittstellen lesen den Körper selbst, ein zweites `request.json()` wirft, und
     `leseKoerper` gäbe dann `{}`. Eine Form ohne Lesen hätte die fünf Profil-Schnittstellen
     umgeschrieben statt verschoben.
  3. **`jetzt`:** eine Funktion über `{ jetzt?: () => Date }` (wie im Plan). Die Typen weichen kaum
     auf: Der Parameter ist ein «schwacher» Typ (nur optionale Felder); TypeScript weist ein Objekt
     ohne gemeinsames Feld ab, `jetzt(e)` mit einem Ereignis kompiliert also nicht. Möglich ist
     `jetzt({})`; das schreibt niemand aus Versehen. In `gespraech` hiessen lokale Variablen `jetzt`;
     sie heissen jetzt `t` (wie in `cm`).
  4. **Typ des Kontos:** `Konto = NonNullable<App.Locals['konto']>` in `http.ts`, gleich
     `AngemeldetesKonto`, ohne Import aus `login/`. `cm` und `mitteilung` nutzen `AngemeldetesKonto`
     weiter für eigene Hilfsfunktionen (erlaubt, unverändert).
- **Umgebaut, ohne Verhalten zu ändern:** sieben `refactor:`-Commits, jeder einzeln grün (Hook
  `check-schnell`, dazu von Hand Lint, `svelte-check`, `importrichtung.test.ts`, Routen-Test und die
  Datenbanktests der betroffenen Module): `56db45b` `http.ts` und `login`; `1c696d9` `admin`;
  `f0622f2` `anlass`, `mitteilung`, `profil`; `36c7e44` `cm`, `gespraech`; `c2fcb16` `turnier`;
  `ae2ce31` Übergang entfernt (bis dahin reichte `login/schnittstellen.ts` die Bausteine weiter, damit
  jeder Commit grün bleibt); `ec086cf` die sieben `schritt`-Texte auf «06a: …» (E-28). Jeder
  Modul-Commit strich genau seine Ausnahmen, weil `importrichtung.test.ts` eine nicht mehr gebrauchte
  Ausnahme rot meldet.
- **Ausnahmen:** vorher 19, nachher 11 (acht nach `login/schnittstellen.ts` gestrichen; die
  Konstante `S06_HTTP` entfällt). Die Lint-Regel ist unverändert. `gespraech/schnittstellen.ts` →
  `cm/schnittstellen.ts` bleibt für `CmDienste` und `CmEreignis` (06a).
- **Tests geändert:** nur Importpfade: `tests/hilfen/anfrage.ts` (`Ereignis`),
  `admin/schnittstellen.db.test.ts` (`antwort`). Dazu der neue Test oben. Routen-Test, Grundprüfung
  (die vier bisherigen Tests) und Bremsen-Test unverändert. Die Einheitstests sinken von 1160 auf
  1152: Das sind die acht Fälle «Ausnahme ist noch nötig» der gestrichenen Ausnahmen.
- **Nicht betroffen, am Code bestätigt:** Routen (`+server.ts`), `src/hooks.server.ts` (importiert nur
  `behandleFehler` und `ladeSitzungSicher`), `bauregel.ts`. Aus `login/schnittstellen.ts` holen
  ausserhalb von `login` nur noch die fünf Login-Routen, der Hook und Tests (`getSitzung`,
  `postLogout` und die Login-Funktionen).
- **Ausserhalb des Schritts aufgefallen, nicht behoben:**
  - *Von Hand geschriebene Standardantworten* (für Schritt 08, der sie ohnehin anfasst):
    `antwort(400, { fehler: 'eingabe' })` in `gespraech` (dreimal), `mitteilung` (zweimal), `profil`,
    `turnier` (einmal, obwohl die Datei `eingabeFehler` schon hatte); `antwort(404, { fehler:
    'nicht-gefunden' })` in `profil` (viermal) und im Passkey (`postEntfernen`);
    `antwort(401, { fehler: 'abgemeldet' })` in den Zugangsprüfungen der Verwaltung und in
    `postAnsicht`, `postAnsichtBeenden` (dort mit eigenem Konto-Check statt `mitSitzung`).
  - *«ändernd» von Hand:* `anlass.postAnmeldung` und die drei schreibenden Schnittstellen der
    Mitteilungen schreiben `if (!istJson(e)) return formatFehler(); return mitSitzung(…)` aus,
    gleichwertig zu `aendernd`. Nicht umgestellt, um nur zu verschieben.
  - Die Fachdienste (`login/dienst.ts`, `login/passkey.ts`, `admin/zugang.ts`,
    `profil/email-wechsel.ts`) haben je ein eigenes `abh.jetzt ?? (() => new Date())`. Das ist kein
    Baustein der Schnittstellen und gehört nicht nach `http.ts`.
- **Für die Folgeschritte:**
  - **06a:** `schreibt` hat die Form von `aenderndMitKoerper` (Format, Rechte, Körper, `fn`), `liest`
    und `mitRolle` nutzen `antwort`. Eine neue Datei `admin/rechte.ts` darf `../http.ts` importieren
    (Thema → unterste Schicht). Die Reihenfolge «Format vor Rechten» hält der neue Test auch für die
    Verwaltung fest.
  - **07:** nichts; `http.ts` trägt keinen Zustand und baut nichts beim Laden.
  - **08:** Die Fehlerform der Standardantworten (`formatFehler`, `nichtGefunden`, `eingabeFehler`, 401
    in `mitSitzung`) ändert sich an einer Stelle in `http.ts`; die Liste oben nennt die Stellen, die
    noch von Hand schreiben. `nichtAngemeldet` (Passkey) und das 401 `{}` von `getSitzung` bleiben bis
    dahin. Wer die Reihenfolge «Format vor Sitzung» ändern will, ändert Verhalten (Test
    `OHNE_BEIDES_ANDERS`).

### D.2 Schritt 06a

**Erkenntnisse Schritt 06a** (11.11.2026, Branch `refactor/schritt-06a`)

- **Bestand am Code nachgelesen, Hinweise zu 06a bestätigt.** Aus `admin/schnittstellen.ts` holten
  `gespraech` (`liest`, `schreibt`, `AdminEreignis`, `AdminUrheber`), `mitteilung` (`liest`,
  `schreibt`, `AdminDienste`, `AdminEreignis`) und `turnier` (alle fünf). `MitteilungAdminDienste`
  aus `mitteilung/schnittstellen.ts` holten `admin`, `gespraech`, `turnier` (dazu `mitteilung/index.ts`
  im eigenen Modul); `CmDienste`, `CmEreignis` aus `cm/schnittstellen.ts` nur `gespraech` (dazu
  `cm/index.ts`). Keine Route importiert einen dieser Namen. `mitRolle`, `liest`, `schreibt` und
  `mitKonto` brauchen `antwort`, `istJson`, `formatFehler`, `leseKoerper`, `Ereignis` (`http.ts`),
  `ZugangDienst` (`zugang.ts`), `BriefAbh` (`briefe.ts`), `Urheber` (`verlauf.ts`) und `darf`, `Art`,
  `Bereich` (`src/lib/verwaltung/bereiche.ts`); `verlauf` und `briefe` liefern nur Typen.
- **Ausgangslage und Netz (vor dem Umbau, nichts committet):** Rechte-Matrix, die Schnittstellen-Tests
  von `admin`, `turnier`, `mitteilung`, `gespraech`, `cm`, `ansicht`, `auskunft`, «letzter Admin»,
  Grundprüfung und Bremsen-Test: 16 Dateien, 200 Tests grün; Routen-Test, `importrichtung.test.ts`,
  `bauregel.test.ts`: 71 grün; `bauregel: ok`. **Abschwächung 1:** in `mitRolle` die Zeile
  `unbestaetigt` gestrichen → 4 rot (Rechte-Matrix «Unbestätigt: …», `admin/schnittstellen.db.test.ts`
  zweimal, `turnier/schnittstellen.db.test.ts` «RR-07: …»). **Abschwächung 2:** die Prüfung
  `kein-recht` gestrichen → 5 rot (Rechte-Matrix «MyTCO-Admin: jede schreibende Schnittstelle …»,
  `admin`, `mitteilung/admin-schnittstellen.db.test.ts` «FR-42: …», `turnier` zweimal). Beide Male aus
  einer Sicherungskopie zurückgesetzt, `git diff` leer. **Nach dem Umbau** dieselbe Abschwächung 1 in
  `admin/rechte.ts`: dieselben 4 rot; zurückgesetzt, `git diff` leer. Das Netz hält die Prüfung auch
  am neuen Ort.
- **Umgebaut, ohne Verhalten zu ändern:** vier `refactor:`-Commits, jeder einzeln grün (Hook
  `check-schnell`, dazu von Hand `svelte-check`, Routen-Test, `importrichtung.test.ts`,
  `bauregel.test.ts`, `bauregel.ts` und die Datenbanktests der betroffenen Module): `4db07da`
  `admin/rechte.ts` (drei Ausnahmen); `17100d6` `mitteilung/typen.ts` (drei); `fc77d1b` `cm/typen.ts`
  (eine); `2ccbbca` der veraltete Kommentar in `eslint.config.js` («dazu kommt mit Schritt 06
  `http.ts`»). Kein Test-Commit: Der Schritt braucht keinen neuen Test (Hinweise zu 06a, «Netz»).
- **Inhalt unverändert:** Diff des alten Blocks in `admin/schnittstellen.ts` gegen `admin/rechte.ts`
  ohne Importzeilen: `mitRolle`, `liest`, `schreibt` und die drei Typen Zeichen für Zeichen gleich;
  bei `mitKonto` nur `export` und eine Kommentarzeile («Nur für `postZugangCode` und `postZugang` …»).
  `MitteilungAdminDienste` (mit seinem Kommentar), `CmDienste` und `CmEreignis` ebenso gleich.
- **Entscheid `mitKonto`: zieht mit nach `admin/rechte.ts`.** Massstab aus dem Auftrag: Die
  Rechteprüfung liegt an einem Ort, `admin/schnittstellen.ts` enthält nur Schnittstellen und ihre
  Listen. `mitKonto` ruft `zugang.pruefe` und antwortet 401 `abgemeldet` und 403 `kein-admin`; das ist
  Rechteprüfung, nur ohne Bereich. Blieb es, stünde weiter ein Stück Rechteprüfung in einer
  Schnittstellen-Datei. Preis: Es ist jetzt exportiert und damit für jedes Modul erreichbar. Eine
  Verwaltungs-Schnittstelle, die es statt `liest`/`schreibt` benutzte, fiele in der Rechte-Matrix und
  den Schleifen auf, solange sie in einer Liste steht: In `ADMIN_SCHNITTSTELLEN` und `TURNIER_SCHNITTSTELLEN` verlangt die Schleife je Eintrag `unbestaetigt`, in `MITTEILUNG_ADMIN_SCHNITTSTELLEN` fällt es über «`cm` → `kein-admin`» auf. Die vier Zugangs-Schnittstellen bleiben in
  `admin/schnittstellen.ts`.
- **Dateinamen:** `admin/rechte.ts` wie geplant; für die Dienst-Typen `typen.ts` in `mitteilung/` und
  `cm/`, nicht `dienste.ts` (Verwechslung mit dem `dienste.ts` aus Schritt 07 und seiner Lint-Regel).
  Keiner endet auf `schnittstellen.ts`: Der Routen-Test ersetzt ihre Funktionen nicht, Schicht 4 der
  Lint-Regel greift nicht. **Routen-Test:** Bisher ersetzte er auch `liest` und `schreibt` durch
  Aufzeichner, weil sie aus einem Modul `*schnittstellen.ts` kamen; aufgerufen wurden sie dort nie
  (die Schnittstellen-Funktionen, die sie benutzen, sind selbst Aufzeichner). Jetzt bleiben sie echt;
  Ergebnis und Zahl der Tests gleich.
- **Bauregel nicht angepasst, am Code geprüft:** `bauregel.ts` hängt an den Listen
  (`ADMIN_SCHNITTSTELLEN` …) und an den Pfaden `admin|mitteilung/(index|schnittstellen).ts`,
  `turnier/schnittstellen.ts`, nicht an `liest`, `schreibt` oder den Typen. Eine Admin-Route, die
  `admin/rechte.ts` importierte, meldet `ERLAUBTER_IMPORT`; eine andere Route jeden Import aus
  `lib/server/admin` (`ADMIN_MODUL`). Die neuen `typen.ts` sieht die Bauregel nicht; sie enthalten nur
  Typen, ein Import gäbe keiner Route Zugriff.
- **Ausnahmen:** vorher 11, nachher 4: `turnier/schnittstellen.ts` → `gespraech/schnittstellen.ts`
  (Schritt 11), `login/schnittstellen.ts` → `admin/rollen.ts` und → `gespraech/gespraech.ts`,
  `login/sitzung.ts` → `admin/rollen.ts` (Schritt 10). Die Lint-Regel ist unverändert.
- **Tests geändert:** nur Importpfade (die Typen und `liest`/`schreibt` aus `admin/rechte.ts`,
  `mitteilung/typen.ts`, `cm/typen.ts`): `grundpruefung.db.test.ts`, `admin/rechte-matrix.db.test.ts`,
  `admin/schnittstellen.db.test.ts`, `admin/schnittstellen-letzter-admin.db.test.ts`,
  `admin/ansicht.db.test.ts`, `admin/auskunft.db.test.ts`, `turnier/schnittstellen.db.test.ts`,
  `gespraech/schnittstellen.db.test.ts`, `mitteilung/admin-schnittstellen.db.test.ts`,
  `cm/schnittstellen.db.test.ts`. Routen-Test, Bremsen-Test, `importrichtung.test.ts` und
  `bauregel.test.ts` unverändert. Die Einheitstests sinken um sieben (die Fälle «Ausnahme ist noch
  nötig» der gestrichenen Ausnahmen).
- **Übergangsregel «Ab Schritt 06a» der `CLAUDE.md` stimmt wörtlich nicht ganz** (nicht geändert,
  zur Entscheidung des Projektleiters): «Rechteprüfung der Verwaltung und Dienst-Typen stehen in keiner
  `schnittstellen.ts`.» (1) Weiter in Schnittstellen-Dateien stehen die Dienst-Typen, die kein anderes
  Modul braucht und die E-28 nicht nennt: `AnlassDienste`, `AnlassEreignis` (`anlass`),
  `ProfilDienste` (`profil`), `MitteilungDienste` (`mitteilung`). (2) `getZugang` und `postAnsicht`
  prüfen den Zugang selbst (`zugang.pruefe`), `postAnsichtBeenden` nur das Konto; das sind die
  Schnittstellen, die den Zugang erst öffnen, und sie bleiben laut Auftrag Schnittstellen. Möglich
  wäre, die Regel auf das Gemeinte zu präzisieren (`mitRolle`, `liest`, `schreibt`, `mitKonto` und
  die Dienst-Typen, die andere Module importieren) oder die vier übrigen Typen in einem späteren
  Schritt zu verschieben (07 fasst die `index.ts` ohnehin an).
- **Ausserhalb des Schritts aufgefallen, nicht behoben:**
  - Abschnitt 4 («Rechte an einer Stelle») nennt noch `admin/schnittstellen.ts` → `mitRolle`; das ist
    der Stand der Analyse (0.20.5), der Ort ist jetzt `admin/rechte.ts`.
  - `postAnsicht` wiederholt einen Teil von `mitRolle` von Hand (abgemeldet, `kein-admin`,
    `unbestaetigt`) mit den echten Rollen statt der Ansicht; gewollt (Kommentar dort), aber eine zweite
    Stelle, an der eine Rollenprüfung steht.
- **Für die Folgeschritte:**
  - **07:** `dienste.ts` holt `AdminDienste` aus `admin/rechte.ts`, `MitteilungAdminDienste` aus
    `mitteilung/typen.ts`, `CmDienste` aus `cm/typen.ts`; die `index.ts` tun das schon. Keine
    Ausnahme nötig.
  - **09, 11:** `anlass/`, `cm/`, `gespraech/` holen `liest`, `schreibt` und die `Admin*`-Typen aus
    `admin/rechte.ts` (Thema → Fachdatei eines anderen Themas, erlaubt). Ein neues
    Schnittstellen-Modul darf `admin/rechte.ts` importieren, aber nicht `admin/schnittstellen.ts`.
  - **12:** In `AUSNAHMEN` stehen nur noch die drei Einträge für Schritt 10 und der eine für 11.

### D.3 Nachmessen Schritt 07

**Nachmessen Schritt 07** (12.11.2026, Worktree `refactor-schritt-07`, Stand `dev` nach Schritt 06a,
Version 0.20.11)

Am Code gelesen und gezählt, **nichts ausgeführt** (kein Test, kein Build, keine Datenbank).
Dateien unter `src/lib/server/`, wenn nichts anderes steht.

- **Ganz gelesen [G]:** `src/hooks.server.ts`, die sechs `index.ts` und `db/index.ts`,
  `login/bremse.ts`, `login/challenge.ts`, `login/mail.ts`, `profil/email-wechsel.ts`,
  `mitteilung/web-push.ts`, `mitteilung/meldung.ts`, `mitteilung/typen.ts`,
  `mitteilung/schnittstellen.ts`, `gespraech/schnittstellen.ts`, `gespraech/meldung.ts`,
  `admin/hinweis-mail.ts`, `cm/mail.ts`, `cm/typen.ts`, `einstellungen.ts`, `zeitgeber.ts`,
  `scripts/pruefungen/bauregel.ts`, `eslint.config.js`, `scripts/importrichtung.test.ts`.
- **In Auszügen [G für die Stelle]:** `mitteilung/versand.ts` (ab Zeile 50), `profil/schnittstellen.ts`,
  `admin/schnittstellen.ts` (`meldeRueckzug`), `admin/rechte.ts` (Typen), `routen.test.ts`
  (`EINSTIEGE`, `ROUTEN`, der Ablauf), `src/routes/api/bremsen.db.test.ts` (Kopf),
  `scripts/pruefungen/bauregel.test.ts` (alle Fälle mit `index.ts`), `scripts/testdaten.ts`,
  `tests/e2e/hilfen/login.ts`.
- **Nur per Textsuche [E]:** alle übrigen Dateien unter `src/lib/server/` ohne Tests, darunter aus
  den drei genannten Modulen `mitteilung/{abo,angaben,empfaenger,themen,verlauf}.ts`,
  `profil/angaben.ts` und `gespraech/gespraech.ts`. Gesucht: Variable auf Modulebene (`let`, `var`,
  `const … = new …`, `const … = Aufruf(…)`), Klassen und Klassenfelder, `new Map/Set/WeakMap`,
  `setInterval`/`setTimeout`, `globalThis`, `process.on`, `Symbol.for`, dazu jede Verwendung von
  `erstelleSmtpMailer`, `leiteUm`, `erstelleWebPush`, `erstelleBremsen`, `erstelleDb`,
  `ChallengeSpeicher`, `WechselSpeicher`, `createTransport`.

#### Einzelstücke und ihr Zustand [G]

Alle Einzelstücke hängen an einer Variablen auf Modulebene, entstehen **träge beim ersten Aufruf**
ihres Einstiegs und leben **bis zum Ende des Prozesses**; keines wird je zurückgesetzt. Beim Laden
einer Datei entsteht nichts. Die Zuweisung geschieht erst nach gelungenem Bau (`if (!dienst) { … }`
bzw. `??=`): Wirft `leseEinstellungen`, bleibt die Variable leer, und der nächste Aufruf versucht
es neu.

| Stück | Datei → Symbol | Zustand | Benutzt von (Routen-Dateien) | Heute geteilt? | Beim Zusammenlegen |
|-------|----------------|---------|------------------------------|----------------|--------------------|
| Datenbank-Verbindung | `db/index.ts` → `db`, `holeDb` (`erstelleDb`: ein `pg.Pool`) | Verbindungs-Pool | jeder Einstieg; Hook (`init` → Löschlauf); `/api/sitzung`, `/api/status` direkt | ja, eine | bleibt in `db/` (unterste Schicht); `dienste.ts` holt sie nur |
| Bremsen | `login/index.ts` → `bremsen`, `holeBremsen`; `login/bremse.ts` → `erstelleBremsen` | acht `Bremse` (je eine Map Schlüssel → Zeitstempel, Fenster 1 h oder 24 h) und ein Aufräum-Takt alle 10 Minuten (`unref`) | Login-Dienst, Passkey-Dienst, `zugang` und `hinweis` der Verwaltung, `wechsel` des Profils | ja, **genau eine Instanz** im Server (`erstelleBremsen` ruft unter `src/` nur `holeBremsen`) | **muss eine bleiben;** in `dienste.ts` privat, nicht exportiert |
| Login-Dienst | `login/index.ts` → `dienst`, `holeLoginDienst` | keiner (Closure über Datenbank, Schlüssel, Versender, Bremsen) | Hook bei jeder Anfrage unter `/api/`; 4 (`login/brief`, `login/mail`, `login/mail-code`, `logout`) | eine | Einstieg bleibt, Name gleich |
| Passkey-Dienst mit offenen Anfragen | `login/index.ts` → `passkeyDienst`, `holePasskeyDienst`; `login/challenge.ts` → `ChallengeSpeicher` | Map mit höchstens 1000 Anfragen, je 5 Minuten gültig, einmal einlösbar | 7 (`/api/passkey/…`); «Optionen» und «Einlösen» sind zwei Anfragen an zwei Routen | eine | **muss eine bleiben** (sonst findet das Einlösen die Anfrage nicht) |
| Dienste der Verwaltung | `admin/index.ts` → `dienste`, `holeAdminDienste` | keiner ausser den geteilten Bremsen in `zugang` und `hinweis` | 27 | eine | Einstieg bleibt |
| Dienste der Mitteilungs-Verwaltung | `mitteilung/index.ts` → `adminDienste`, `holeMitteilungAdminDienste` | keiner; die Felder der Verwaltung sind kopiert (`zugang`, `hinweis`, `brief`, `db` sind dieselben Objekte), dazu Pool-Versender, Push-Versender, Adresse | 24 (Mitteilungen, Turnier-Verwaltung, Gespräch der Verwaltung, Austritt) | eigenes Objekt neben `holeAdminDienste` | **muss ein eigenes Objekt bleiben** (Routen-Test: Dienste von genau einem Einstieg) |
| Dienste des Profils mit laufenden E-Mail-Wechseln | `profil/index.ts` → `dienste`, `holeProfilDienste`; `profil/email-wechsel.ts` → `erstelleEmailWechselDienst` (darin `WechselSpeicher`) | Map mit höchstens 1000 Wechseln (einer je Konto, 15 Minuten gültig, Zähler der Fehlversuche im Eintrag) und ein Aufräum-Takt alle 10 Minuten (`unref`) | 5 (`/api/profil/…`); «Starten» und «Bestätigen» sind zwei Routen | eine | **muss eine bleiben** |
| Dienste der CM | `cm/index.ts` → `dienste`, `holeCmDienste` | keiner | 14 (CM und Gespräch der Mitglieder) | eine | Einstieg bleibt |
| Dienste der Mitteilungen (Mitglieder) | `mitteilung/index.ts` → `dienste`, `holeMitteilungDienste` | keiner (`db`, öffentlicher VAPID-Schlüssel) | 3 | eine | Einstieg bleibt |
| Dienste der Anlässe | `anlass/index.ts` → `dienste`, `holeAnlassDienste` | keiner (`db`); liest wie der Passkey-Dienst keine Einstellungen | 4 | eine | Einstieg bleibt, weiter ohne Einstellungen |
| SMTP-Versender | `login/mail.ts` → `erstelleSmtpMailer`, aufgerufen in fünf `index.ts` | je ein `nodemailer`-Transport; vier ohne Pool, einer mit (`pool: true`, 5 Verbindungen) | siehe «Mail» | **nein, fünf** | zwei: einer ohne Pool, einer mit |
| Push-Versender | `mitteilung/web-push.ts` → `erstelleWebPush`, aufgerufen in `cm/index.ts` und `mitteilung/index.ts` | keiner (nur das Options-Objekt mit dem VAPID-Paar) | siehe «Push» | **nein, zwei** | einer |
| Zeitgeber des Löschlaufs | `zeitgeber.ts` → Merker auf `globalThis`; gestartet in `hooks.server.ts` → `init` | ein Takt (erster Lauf nach einer Minute, dann täglich); nicht beim Bauen, nicht mit `ZEITGEBER=aus` | Hook | einer | kein Teil von `dienste.ts`, bleibt |

Zahl der Routen-Dateien je Einstieg, gezählt über alle 90 `+server.ts`: 27 + 24 − 1 (eine Datei
holt beide Verwaltungs-Einstiege) + 14 + 4 + 4 + 7 + 3 + 5 + 2 (`holeDb`) + 1 (`/api/kontakt`, kein
Einstieg) = 90.

- **Sonst kein Zustand [E]:** Was die Suche ausser dem Genannten auf Modulebene findet, sind
  unveränderliche Konstanten (`Intl.DateTimeFormat`, `Intl.Collator`, feste `Set`, Tabellen des
  Schemas, vorbereitete Bedingungen für Abfragen). `mitteilung/`, `profil/` und `gespraech/` tragen
  ausser dem `WechselSpeicher` keinen Zustand; alle `Map` und `Set` dort leben nur in einem Aufruf.
- **Einstellungen sind kein Einzelstück [G]:** `leseEinstellungen` liest bei jedem Aufruf neu aus
  der Umgebung. Aufgerufen wird sie je einmal beim Bau von sechs Einstiegen (alle ausser Passkey und
  Anlass), in `init` und bei jeder Anfrage an `/api/kontakt`.
- **B-16 bestätigt und ergänzt:** Bremsen, Passkey-Anfragen und E-Mail-Wechsel sind die drei
  Zustandsträger; dazu kommen zwei Aufräum-Takte, die B-16 nicht nennt. B-13 ist an einer Stelle
  ungenau: «fünf offene SMTP-Zugänge» stimmt für die Zahl der Versender, aber offene Verbindungen
  hält nur der eine mit Pool (Kommentar bei `MAILS_GLEICHZEITIG` in `mitteilung/versand.ts` [G];
  dass ein Transport ohne Pool je Mail eine Verbindung öffnet und wieder schliesst, ist
  Bibliothekswissen [V], `node_modules` gibt es im Worktree nicht).

#### Mail [G]

Fünf Versender, alle aus `MYTCO_SMTP_URL` und `MYTCO_MAIL_ABSENDER`, alle von Hand in `leiteUm(…,
einstellungen.mailNurAn)` gewickelt. Vier bekommen die Adresse als Text, der fünfte
`{ url, pool: true, maxConnections: MAILS_GLEICHZEITIG }` (5).

| Weg | Route (Beispiel) | Einstieg | Versender heute |
|-----|------------------|----------|-----------------|
| Login-Code | POST `/api/login/mail-code` | `login` | ohne Pool (`login`) |
| Code der Verwaltung | POST `/api/admin/zugang/code` | `admin` | ohne Pool (`admin`) |
| Hinweis an die alte Adresse | POST `/api/admin/mitglieder/[id]` | `admin` | ohne Pool (`admin`) |
| Adresswechsel, zwei Mails | POST `/api/profil/email` | `profil` | ohne Pool (`profil`) |
| Bestätigung der CM-Anmeldung | POST `/api/cm/kategorien/[id]/anmeldung` | `cm` | ohne Pool (`cm`) |
| Meldung an Einzelne, von Mitgliedern ausgelöst (`d.melde`) | POST `/api/cm/[id]/gespraech`, Doppel-Anfragen | `cm` | ohne Pool (`cm`), nach dem Push der CM |
| Mitteilung an viele | POST `/api/admin/mitteilungen/senden`, `/api/admin/anlaesse/[id]/mitteilungen/senden` | `mitteilungAdmin` | **Pool** |
| Meldung an Einzelne, von der Verwaltung ausgelöst (`meldeMitgliedern` mit `d.mailer`) | POST `/api/admin/gespraeche/[id]`, `/api/admin/mitglieder/[id]/austritt`, Turnier-Verwaltung | `mitteilungAdmin` | **Pool**, nach dem Push der Mitteilungen |

- **`MAIL_NUR_AN` wirkt heute über jeden Einstieg:** Alle fünf Stellen wickeln den Versender in
  `leiteUm`; ausserhalb der fünf `index.ts` entsteht unter `src/` kein Versender. Gelesen wird der
  Wert beim Bau des Einstiegs, also einmal je Einstieg und Prozess. Kein Test prüft das je Weg
  (nur `leiteUm` als Einzelfunktion in `login/mail.test.ts`, und `leseEinstellungen`); Routen-Test
  und Bremsen-Test setzen `MAIL_NUR_AN` auf leer.
- **Welcher Versender welchen Weg bedient,** hält kein Test fest (so schon in «Was das Netz deckt»).
  Die zwei letzten Zeilen der Tabelle sind die Stelle, an der man es beim Zusammenlegen verwechselt:
  Meldungen an Einzelne gehen heute je nach Auslöser über zwei verschiedene Versender.

#### Push [G]

Zwei Versender mit gleicher Konfiguration (`einstellungen.vapid`, `kontaktFuerPush(adresse,
mailAbsender)`): einer in `holeCmDienste` (für `melde`), einer in `holeMitteilungAdminDienste`.
Ohne VAPID-Paar sind beide `null`, dann gehen Meldungen per Mail. Der Versender hält keinen
Zustand: `erstelleWebPush` baut ein Options-Objekt und reicht es je Aufruf an `sendNotification`.
Den öffentlichen Schlüssel für die Mitglieder liest `holeMitteilungDienste` getrennt. **Für Push
gibt es keine Umleitung wie `MAIL_NUR_AN`:** Ein Push geht immer an das gespeicherte Abo.

#### Wo Zusammenlegen Verhalten ändern würde

1. **Bremsen: nirgends.** Es gibt heute **keine** Bremse, die je Einstieg getrennt zählt; alle
   fünf Nutzer bekommen dieselbe Instanz. Geändert würde das Verhalten nur, wenn beim Umbau eine
   zweite Instanz entsteht; das fängt der Bremsen-Test (Anhang C.2: Profil, Verwaltung oder Hinweis
   mit eigenen Bremsen machten ihn rot). Nicht gefangen: eine eigene Instanz für den Passkey-Dienst
   (seine Bremse nutzt nur er; ohne Wirkung, C.2).
2. **Ein einziger Mail-Versender für alles wäre eine Verhaltensänderung, in beide Richtungen.**
   Alles über den Pool: Ein Login-Code stünde hinter einer laufenden Mitteilung an Hunderte an
   (fünf Verbindungen) [V, Bibliothekswissen]. Alles ohne Pool: Die Mitteilung öffnete je Mail eine
   Verbindung. Darum zwei Versender, wie es das Zielbild schon sagt, **und die Zuordnung bleibt
   wie in der Tabelle:** Das Feld `mailer` der Mitteilungs-Verwaltung ist der Pool, alles andere
   der Versender ohne Pool. Vier Versender ohne Pool zu einem zusammenzulegen ändert nichts [V].
3. **Die zwei Verwaltungs-Einstiege zu einem Objekt:** Der Routen-Test würde rot (er verlangt
   genau einen Einstieg je Aufruf), und 27 Routen bekämen Pool-Versender und Push in die Hand. Nicht
   Teil des Schritts.
4. **Alles auf einmal bauen statt je Einstieg:** Die zwei Aufräum-Takte starteten früher, und
   `holeAnlassDienste` und `holePasskeyDienst` brauchten plötzlich gültige Mail-Einstellungen. In Produktion ohne Folge
   (`init` prüft die Einstellungen beim Start), in Tests schon. Darum bleibt jeder Einstieg für
   sich träge (so steht es im Plan).
5. **Einstellungen einmal statt fünfmal lesen:** ohne Folge; sie sind reine Werte, und die
   Umgebung ändert sich im laufenden Prozess nicht. Betroffen wäre nur ein Test, der die Umgebung
   zwischen zwei ersten Aufrufen ändert; das tut keiner.
6. **Was der Hook lädt:** `hooks.server.ts` importiert künftig `dienste.ts` und damit alle Themen
   samt `web-push`, schon beim Start und beim Bauen (heute erst mit der ersten Route, die es
   braucht). Gebaut wird dabei nichts; dass das Laden von `web-push` nichts auslöst, ist nicht
   gemessen [V]. Der Build in `make check` zeigt es.
7. **Bauregel, der einzige Punkt mit Gewicht:** siehe «Bauregel», Nr. 2.

**Kein Punkt braucht einen Entscheid zum Verhalten:** Mit dem Schnitt unten bleibt alles gleich.

#### Tests und Hilfen [G]

- **`routen.test.ts`:** importiert die Einstiege aus den sechs `index.ts` (sechs Import-Zeilen) und
  `holeDb`; `EINSTIEGE` hat neun Schlüssel. Bleiben die Namen der Einstiege, ändern sich nur die
  Import-Zeilen; `EINSTIEGE` und `ROUTEN` bleiben wörtlich. Der Test ruft für jede Route **alle**
  Einstiege auf (`hole()` im Vergleich) und braucht dafür die gestellte Umgebung, die er schon hat.
- **`login/schnittstellen.db.test.ts`:** importiert `holeLoginDienst` aus `./index.ts` für den Test
  «liefert dieselbe Instanz». Er bekommt den neuen Pfad; dasselbe deckt der Routen-Test für jeden
  Einstieg ohnehin (Identität zwischen Route und Test).
- **`src/routes/api/bremsen.db.test.ts`:** importiert nur `holeDb` (`db/index.ts`) und Routen;
  keine Anpassung, solange `holeDb` bleibt, wo es ist.
- **`src/routes/api/status/status.db.test.ts`:** prüft `holeDb` mit `vi.resetModules` und
  dynamischem Import von `db/index.ts`. Ein Grund mehr, `holeDb` nicht zu verlegen.
- **Kein Test setzt ein Einzelstück zurück** (`vi.resetModules` nur im Status-Test, dort für `db`).
  Die Tests der Module, die Grundprüfung und die Rechte-Matrix bauen ihre Dienste selbst
  (`erstelleBremsen`, `erstelleEmailWechselDienst` …) und kennen die `index.ts` nicht: bleibt.
- **E2E-Hilfen:** `tests/e2e/hilfen/login.ts` baut im Test-Prozess einen eigenen Login-Dienst mit
  eigenen Bremsen und einem Versender, der wirft; es importiert keine `index.ts` und keinen
  Einstieg. Keine Anpassung. Dasselbe gilt für `scripts/testdaten.ts` (eigener Login-Dienst, eigene
  Bremsen, eigener Versender mit `leiteUm`) und `scripts/seed-lokal.ts`: eigene Prozesse.
- **Der Hook hat keinen eigenen Test;** dass er `holeLoginDienst` vom neuen Ort holt, zeigt nur
  E2E (`tests/e2e/cookie.test.ts` und jeder Login).

#### Bauregel [G]

`scripts/pruefungen/bauregel.ts` nennt die `index.ts` an vier Stellen:

| Muster | Heute | Nach Schritt 07 |
|--------|-------|-----------------|
| `ERLAUBTER_IMPORT` | Admin-Route darf `admin/index.ts`, `mitteilung/index.ts` und die drei Schnittstellen-Dateien | `dienste.ts` statt der zwei `index.ts` |
| `AUS_INDEX` (daraus `DIENSTE`) | je Datei **ein** erlaubter Name | eine Datei, **zwei** erlaubte Namen (`holeAdminDienste`, `holeMitteilungAdminDienste`); jeder andere Name aus `dienste.ts` ist in einer Admin-Route ein Befund |
| `MITTEILUNG_INDEX` in `pruefeMitteilungImporte` | ausserhalb von `api/admin/` ist `holeMitteilungAdminDienste` aus `mitteilung/index.ts` (auch als Ordner-Import) verboten | Muster auf `dienste.ts`; die Liste der verbotenen Namen wächst (Nr. 2) |
| Text `ERLAUBT_IMPORT` | nennt die zwei `index.ts` | neuer Wortlaut |

1. **Die Prüfung «Dienste nur direkt als erstes Argument»** hängt an den Namen in `DIENSTE`, nicht
   am Pfad. Bleiben die Namen, bleibt sie Zeichen für Zeichen.
2. **Im Plan nicht genannt: `ADMIN_MODUL` deckt den Verwaltungs-Einstieg nicht mehr.** Heute kann
   keine Route ausserhalb von `api/admin/` `holeAdminDienste` holen, weil er in `admin/index.ts`
   liegt und jeder Import aus `lib/server/admin` dort ein Befund ist. In `dienste.ts` liegt er
   neben den Einstiegen der Mitglieder, und diese Datei importiert jede Route. Der Schutz muss vom
   Pfad auf den Namen wechseln: ausserhalb von `api/admin/` sind aus `dienste.ts` **beide**
   Verwaltungs-Namen verboten (heute gibt es den Namens-Wächter nur für
   `holeMitteilungAdminDienste`). Vorschlag: **eine** Liste der Verwaltungs-Einstiege in
   `bauregel.ts`, die beide Richtungen speist (Admin-Routen dürfen aus `dienste.ts` nur diese,
   andere Routen alles ausser diesen). Ein neuer Verwaltungs-Einstieg, der in der Liste fehlt, ist
   dann für Admin-Routen gesperrt und fällt sofort auf. `ADMIN_MODUL` selbst bleibt (kein Import
   aus `lib/server/admin` ausserhalb von `api/admin/`).
3. **Gleiche Strenge wie heute verlangt:** `dienste.ts` nur statisch und mit Namen (kein `* as`,
   kein `export *`, kein `import()`), mit und ohne Endung, auch als `$lib/server/dienste`; `as`
   wird durchschaut. Das sind die Fälle, die `pruefeMitteilungImporte` heute für `mitteilung/index.ts`
   hat.
4. **Was `dienste.ts` exportiert, ist Teil des Schutzes:** nur die acht Einstiege. Bremsen,
   Versender und Push bleiben privat; sonst holt sie eine Mitglieder-Route, und die Bauregel sieht
   es nicht (sie verbietet dort nur die zwei Verwaltungs-Namen). Der Reviewer prüft die Exportliste.
5. **`bauregel.test.ts`:** Fälle mit `index.ts` eines Moduls stehen an den Zeilen 67, 79, 80, 108,
   127, 138 bis 149, 169, 214, 225, 228, 257, 266 bis 280. Neu und je einmal rot: Admin-Route holt
   einen Mitglieder-Einstieg aus `dienste.ts`; Admin-Route holt weiter aus `admin/index.ts`; Route
   ausserhalb von `api/admin/` holt `holeAdminDienste` aus `dienste.ts` (mit `as`, als
   Ordner-Import, als `* as`, dynamisch); dieselbe mit `holeMitteilungAdminDienste`;
   `holeAdminDienste().db` in einer Admin-Route mit dem neuen Import.
6. **`betrifftBauregel`** nennt keine `index.ts`; keine Änderung. `docs/ci-cd-und-release.md`
   (Zeile zur Bauregel) nennt nur die Namen der Einstiege und stimmt weiter.
7. **Als Verhalten gedeckt** ist die Gegenseite schon: Der Routen-Test verlangt je Route die
   Dienste des Einstiegs aus `ROUTEN`. Eine Mitglieder-Route mit `holeAdminDienste()` machte ihn rot.

#### Lint [G]

- **Heute:** `dienste.ts` läge direkt unter `src/lib/server/` und fiele in den Block
  `files: ['src/lib/server/*.ts']` mit `regel('.')` («importieren nur `db`»). Die sechs `index.ts`
  sind von der Regel erfasst, verletzen sie aber nicht (sie importieren keine Schnittstellen-Datei
  eines anderen Moduls); der Kommentar oben in `eslint.config.js` («nicht erfasst: die `index.ts`»)
  ist in dem Punkt ungenau.
- **Zu ändern in `eslint.config.js`:** (a) `dienste.ts` aus dem Block für `*.ts` herausnehmen
  (`ignores`), ohne Eintrag in `AUSNAHMEN`; (b) das Verbot «niemand importiert `dienste.ts`» **in
  `gruppe()`** als weiteres Muster für `.`, `login` und die Themen (`db` meldet `../dienste.ts`
  schon: «db importiert aus dem Server nichts»). Ein eigener Block ginge nicht: `no-restricted-imports`
  wird je Datei vom letzten passenden Block ersetzt, nicht ergänzt. Die Blöcke der Dateien mit
  Ausnahme laufen ebenfalls über `regel()` und erben das Muster. (c) Kommentar oben nachführen.
  Tests bleiben ausgenommen (`**/*.test.ts`), der Routen-Test darf `dienste.ts` also importieren.
- **`scripts/importrichtung.test.ts`, neue Fälle:** `anlass/neu.ts`, `login/neu.ts` und `datum.ts`
  melden den Import von `dienste.ts` (relativ, mit `$lib/server/dienste`, mit `.js`); `dienste.ts`
  selbst darf `./login/…`, ein Thema und eine Schnittstellen-Datei importieren. Die Wächter «genau
  die Ordner» und «keine Unterordner» sind nicht betroffen (`dienste.ts` ist eine Datei).
- **Nicht durchgesetzt:** dass Versender, Bremsen und Dienste **nur** in `dienste.ts` entstehen. Die
  Regel verbietet den Import von `dienste.ts`, nicht den Aufruf von `erstelleSmtpMailer` in einem
  Modul. Das bleibt Aufgabe des Reviews (kein Vorschlag für eine weitere Regel).

#### Routen [G, gezählt]

90 `+server.ts`. **87 ändern ihre Import-Zeile** (88 Zeilen: `/api/admin/kategorien/[id]` holt
beide Verwaltungs-Einstiege, künftig in einer Zeile). Unverändert bleiben drei: `/api/sitzung` und
`/api/status` holen `holeDb` aus `db/index.ts`, `/api/kontakt` ruft `leseEinstellungen` selbst.
Je Modul: `admin/index.ts` 27, `mitteilung/index.ts` 27 (24 Verwaltung, 3 Mitglieder), `cm` 14,
`login` 11 (4 Login, 7 Passkey), `profil` 5, `anlass` 4.

#### Abweichungen vom Plan

1. **Dateiliste, «alle `+server.ts`»:** 87 von 90 (oben).
2. **Dateiliste, Hook «(`holeDb`, `holeLoginDienst`)»:** nur der Import von `holeLoginDienst`
   ändert sich; `holeDb` bleibt in `db/index.ts`.
3. **Dateiliste, es fehlt:** die neue Testdatei für `MAIL_NUR_AN`; der Kommentar in
   `eslint.config.js`. Die sechs `index.ts` werden gelöscht, nicht geändert.
4. **Nutzen «ein SMTP-Zugang statt fünf»:** zwei Versender statt fünf (einer davon der Pool), ein
   Push-Versender statt zwei. Zielbild 6.1 Punkt 2 sagt es schon richtig.
5. **Hinweis «Bauregel»:** nennt drei Muster und die Argument-Prüfung. Es fehlt der Wechsel des
   Schutzes vom Pfad auf den Namen für `holeAdminDienste` (Bauregel Nr. 2) und die Exportliste von
   `dienste.ts` als Teil des Schutzes (Nr. 4). Die Argument-Prüfung braucht dagegen keine Änderung.
6. **Hinweis «Routen-Test: nur `EINSTIEGE`»:** Mit gleichen Namen ändert sich nicht einmal
   `EINSTIEGE`, nur die Import-Zeilen des Tests.
7. **Hinweis «Wer ausser den Routen die Einstiege holt»:** stimmt (Hook, `routen.test.ts`,
   `login/schnittstellen.db.test.ts`, `bauregel.ts` als Text). `holeDb` holen dazu zwei weitere
   Tests (Bremsen, Status).
8. **Dienst-Typen:** `dienste.ts` braucht `ProfilDienste`, `MitteilungDienste` und `AnlassDienste`,
   und die stehen noch in ihrer `schnittstellen.ts` (D.2). Die Lint-Regel lässt das zu
   (`dienste.ts` darf alles importieren), die Übergangsregel «Ab Schritt 06a» sagt aber: «Typen, die
   ein anderes Modul braucht, stehen nicht in einer `schnittstellen.ts`». Vorschlag: Schritt 07
   verschiebt die drei Typen im ersten Commit nach `profil/typen.ts`, `anlass/typen.ts` (beide neu)
   und `mitteilung/typen.ts` (vorhanden), Zeichen für Zeichen wie in 06a; betroffen sind nur die
   drei Schnittstellen-Dateien, `grundpruefung.db.test.ts` (zwei Importe) und die drei `index.ts`,
   die ohnehin wegfallen. Kein Verhalten, kein Entscheid nötig; ohne das Verschieben liest man die
   Regel als «Modul = Ordner», und `dienste.ts` ist keiner.
9. **B-13:** Wortlaut «fünf offene SMTP-Zugänge» ungenau (oben). Befund und Schritt bleiben richtig.

Sonst stimmen Zeile 07 und die Hinweise: Risiko, Absicherung, Voraussetzung, «Einstiege bleiben
träge», «`init` läuft beim Bauen mit», die fünf Stellen mit `leiteUm`.

#### Vorschlag für den Schnitt von `dienste.ts`

- **Dort entsteht (privat, je für sich träge):** die Bremsen; der Versender ohne Pool; der
  Versender mit Pool; der Push-Versender (`null` ohne VAPID-Paar). `leiteUm` sitzt an **einer**
  Stelle, durch die beide Versender entstehen, damit kein Weg ohne Umleitung gebaut werden kann.
- **Dort entsteht (exportiert, je für sich träge):** die acht Einstiege mit ihren heutigen Namen
  (`holeLoginDienst`, `holePasskeyDienst`, `holeAdminDienste`, `holeMitteilungAdminDienste`,
  `holeProfilDienste`, `holeCmDienste`, `holeMitteilungDienste`, `holeAnlassDienste`). Gleiche Namen
  heisst: In den 87 Routen ändert sich nur der Pfad, `DIENSTE` in der Bauregel und `EINSTIEGE` im
  Routen-Test bleiben. `holeMitteilungAdminDienste` bleibt ein eigenes Objekt aus den Feldern der
  Verwaltung plus Pool, Push und Adresse; `holeAnlassDienste` und `holePasskeyDienst` lesen weiter keine Einstellungen.
  Zugewiesen wird wie heute erst nach gelungenem Bau.
- **Zuordnung der Versender wie heute:** ohne Pool für Login, Verwaltung (`zugang`, `hinweis`),
  Profil und CM (`bestaetigung`, `melde`); Pool nur als `mailer` der Mitteilungs-Verwaltung. Der eine
  Push-Versender dient `melde` der CM und der Mitteilungs-Verwaltung.
- **In den Modulen bleibt:** jede Fabrik und jeder Typ (`erstelleLoginDienst`,
  `erstellePasskeyDienst`, `erstelleZugangDienst`, `erstelleHinweis`, `erstelleEmailWechselDienst`
  samt `WechselSpeicher`, `erstelleBestaetigung`, `meldeMitgliedern`, `erstelleSmtpMailer`,
  `leiteUm`, `erstelleWebPush`, `kontaktFuerPush`, `erstelleBremsen`, `ChallengeSpeicher`,
  `erstelleSimpleWebAuthnPruefer`). Sie bekommen weiter alles hineingereicht; Tests und Skripte
  rufen sie wie bisher.
- **Die sechs `index.ts` fallen weg.** Als Weiterleitung könnten sie nicht bleiben: Sie müssten
  `dienste.ts` importieren, und das verbietet die neue Regel. `db/index.ts` bleibt unverändert
  (`erstelleDb`, `holeDb`, die Typen); es ist das Modul der Datenbank, kein Zusammenbau, und
  Skripte, Tests und der Status-Test hängen daran.
- **Nicht Teil des Schritts:** `/api/kontakt` (liest die Einstellung selbst), `/api/sitzung`
  (`holeDb`; Schritt 10 fasst die Route an), `new Date()` im Hook.
- **Reihenfolge der Commits (Vorschlag):** (1) Test `MAIL_NUR_AN`, grün auf dem alten Stand, je Weg
  einmal rot; (2) die drei Dienst-Typen nach `typen.ts`; (3) `dienste.ts` mit Lint-Regel und
  `importrichtung.test.ts`, Hook, Routen, Bauregel und `bauregel.test.ts`, die zwei Tests, die sechs
  `index.ts` gelöscht. (3) lässt sich kaum teilen: Solange eine `index.ts` und `dienste.ts`
  nebeneinander bauen, gibt es zwei Sätze Bremsen.

#### Charakterisierungstest `MAIL_NUR_AN` (Grundlage)

- **Ort und Bau:** eigene Datei neben `src/routes/api/bremsen.db.test.ts`, gleicher Aufbau (echte
  Routen, echte Einstiege, Attrappe nur `nodemailer`). Eigene Datei, weil die Einstiege
  `MAIL_NUR_AN` beim ersten Aufruf lesen und der Bremsen-Test es leer setzt. Die Bauregel lässt
  den Ort zu: Der Bremsen-Test importiert dort schon Admin-Routen über ihren relativen Pfad.
- **Wege:** die acht Zeilen der Tabelle «Mail», also alle fünf heutigen Einstiege mit Versender;
  VAPID leer, damit Meldungen per Mail gehen; je Weg ein eigenes Mitglied (Grenze drei Mails je
  Adresse und Stunde).
- **Geprüft je Weg:** mindestens eine Mail ist hinausgegangen (sonst ist der Test leer grün), jede
  hat als Empfänger die Adresse aus `MAIL_NUR_AN`, und der Betreff beginnt mit «[Test für …]».
- **Zusätzlich empfohlen:** Die Attrappe merkt sich, womit `createTransport` gerufen wurde, und der
  Test hält je Weg fest, ob der Versender mit oder ohne Pool lief. Das schliesst die Lücke «welcher
  Versender einen Weg bedient» aus «Was das Netz deckt» ohne Mehraufwand.
- **Einmal rot:** `leiteUm` an einer der fünf Stellen entfernen; genau die Wege dieses Einstiegs
  werden rot.

#### Frage an den Projektleiter

**F-20 [neu, BEANTWORTET 12.11.2026: A, E-37] — Für wen gilt «Dienste, Mail- und Push-Versender entstehen nur in
`dienste.ts`»?** (Übergangsregel «Ab Schritt 07» der `CLAUDE.md`; nicht dringend, hält Schritt 07
nicht auf)

Wörtlich genommen verletzen die Regel `scripts/testdaten.ts` (eigener Versender mit `leiteUm`,
eigener Login-Dienst, eigene Bremsen), `scripts/seed-lokal.ts`, `tests/e2e/hilfen/login.ts` und
jeder Datenbanktest, der seine Dienste selbst baut. Das sind eigene Prozesse oder Tests, und dass
Tests ihre Dienste selbst hineinreichen, ist gut gelöst und bleibt (B-13). Am Verhalten ändert
keine Antwort etwas.

- A: Wortlaut präzisieren: «Im Server (unter `src/`, ohne Tests) entstehen Dienste, Mail- und
  Push-Versender nur in `src/lib/server/dienste.ts`; Skripte und Tests bauen ihre eigenen.»
- B: Auch die Skripte holen ihre Dienste aus `dienste.ts`. Dann zieht `scripts/testdaten.ts` alle
  Module und alle Einstellungen in das Skript, das im Laufzeit-Image läuft: eine Verhaltensänderung
  ausserhalb des Plans.
- C: Wortlaut lassen; die Lesart steht hier.
- **Empfehlung: A.** Ein Satz, der sagt, was gemeint ist, erspart die Rückfrage im Review von
  Schritt 07.

#### Nicht geprüft, dünn belegt

- **Nichts ausgeführt:** kein Test, kein Lint, kein Build. Dass die vorgeschlagenen Lint-Muster so
  greifen und dass `web-push` beim Laden nichts auslöst, zeigt erst der Schritt.
- **Bibliotheken nicht gelesen [V]:** Verhalten von `nodemailer` mit und ohne Pool (Verbindung je
  Mail, Warteschlange im Pool) und von `web-push`; im Worktree gibt es kein `node_modules`.
- **Nur per Textsuche [E]:** die Fachdateien ohne Treffer (Liste oben). Ein Zustand, der sich
  hinter keinem der gesuchten Muster verbirgt (zum Beispiel ein Objekt-Literal auf Modulebene, das
  später verändert wird), fiele nicht auf; `const … = {}` und `= []` auf Modulebene waren Teil der
  Suche und ohne Treffer.
- **Entwicklungs-Server [V]:** Lädt Vite ein Modul neu, entstehen dessen Einzelstücke neu. Mit
  `dienste.ts` hängt jedes Einzelstück an jeder Fachdatei; eine Änderung irgendwo leert dann auch
  Bremsen, Passkey-Anfragen und E-Mail-Wechsel. Nur lokal, nicht gemessen.
- **Zeilen der Routen in `ROUTEN`:** nur für die Mail-Wege einzeln nachgelesen; die Zahl je
  Einstieg stammt aus den Import-Zeilen der `+server.ts`.
- **Nicht eingetragen:** F-20 steht nur hier und im Abschnitt «Stand und nächster Schritt», nicht
  in Abschnitt 9 (der Auftrag liess sonst nichts umschreiben). Die Tabelle «Vorab nachzumessen» in
  7.7 nennt Schritt 07 weiter; erledigt ist es laut Zeile 07 und diesem Abschnitt.
- **Ausserhalb des Schritts aufgefallen, nicht behoben:** Meldungen an Einzelne aus der Verwaltung
  laufen über den Pool der Mitteilungen und stehen damit hinter einer laufenden Mitteilung an [V
  für die Warteschlange]. Der Kommentar über `holeBremsen` ist unvollständig (C.2) und fällt mit der
  Datei weg. Die Zeile «Nächster Checkpoint» oben nennt noch Schritt 06a.

### D.4 Schritt 07

**Erkenntnisse Schritt 07** (12.11.2026, Branch `refactor/schritt-07`)

- **Bestand am Code nachgelesen, D.3 bestätigt:** fünf `leiteUm` in den fünf `index.ts`, ein
  Versender mit Pool (`mitteilung/index.ts`), zwei Push-Versender, Bremsen nur über `holeBremsen`.
  87 Routen mit 88 Import-Zeilen (`/api/admin/kategorien/[id]` jetzt eine Zeile), der Hook nur mit
  `holeLoginDienst`, dazu `routen.test.ts` und `login/schnittstellen.db.test.ts`.
- **Commits:** `bc111d6` `test:` Charakterisierung `MAIL_NUR_AN`; `bad5f36` `refactor:` die drei
  Dienst-Typen nach `typen.ts`; `a3ab6b5` `refactor:` `dienste.ts` mit Lint-Regel,
  `importrichtung.test.ts`, Hook, 87 Routen, Bauregel, `bauregel.test.ts`, den zwei Tests und den
  gelöschten `index.ts` (wie in D.3 nicht teilbar). Dazu dieser `docs:`-Commit.
- **Charakterisierungstest `MAIL_NUR_AN`** (`src/routes/api/mail-nur-an.db.test.ts`): echte Routen,
  echte Einstiege, Attrappe nur `nodemailer`; die Attrappe merkt sich je Transport, ob er mit
  `pool: true` gebaut wurde. Acht Tests, einer je Weg aus D.3: Login-Code (`/api/login/mail-code`),
  Code der Verwaltung (`/api/admin/zugang/code`), Hinweis an die alte Adresse
  (`/api/admin/mitglieder/[id]`), zwei Codes des Adresswechsels (`/api/profil/email`),
  Bestätigung der CM-Anmeldung (`/api/cm/kategorien/[id]/anmeldung`), Meldung an die
  Kontaktperson (`/api/cm/[id]/gespraech`), Mitteilung an den Verein
  (`/api/admin/mitteilungen/senden`), Meldung ans Mitglied aus der Verwaltung
  (`/api/admin/gespraeche/[id]`). Je Weg: die Mails, die er auslöst (gezählt ab dem Auslösen),
  sind mindestens eine je erwarteter Adresse, jede geht an die Adresse aus `MAIL_NUR_AN`, der
  Betreff beginnt mit «[Test für …] » und nennt jede erwartete Adresse, und alle laufen über den
  erwarteten Versender (Pool nur bei den zwei Wegen der Mitteilungs-Verwaltung). VAPID leer.
- **Rot belegt, alter Stand** (je `mailNurAn` an einer Stelle durch `undefined` ersetzt, aus einer
  Sicherungskopie zurückgesetzt, `git status` danach leer): `login/index.ts` → 1 rot (Login);
  `admin/index.ts` → 2 rot (Code, Hinweis); `profil/index.ts` → 1 rot; `cm/index.ts` → 2 rot
  (Bestätigung, Meldung); `mitteilung/index.ts` → 2 rot (Mitteilung, Meldung der Verwaltung). Je
  genau die Wege des Einstiegs, die übrigen grün. Dazu der Pool: `mitteilung/index.ts` mit der URL
  statt des Pool-Objekts → die zwei Wege der Mitteilungs-Verwaltung rot; `cm/index.ts` mit Pool →
  die zwei CM-Wege rot.
- **Rot belegt, neuer Stand** (auf `a3ab6b5`, ebenso zurückgesetzt): Umleitung in `baueMailer`
  entfernt → alle 8 rot; Mitteilungs-Verwaltung mit `holeMailer` statt `holePoolMailer` → 2 rot;
  Versender ohne Pool mit Pool gebaut → die 6 übrigen rot; Profil mit eigenen Bremsen
  (`erstelleBremsen()`) → Bremsen-Test 5 von 6 rot.
- **Dienst-Typen:** `ProfilDienste`, `AnlassDienste`, `MitteilungDienste` Zeichen für Zeichen (Diff
  der `export type`-Zeilen gleich). `AnlassEreignis` bleibt in `anlass/schnittstellen.ts`.
  **Zur Kenntnis des Projektleiters:** E-33 sagt, diese Typen «bleiben, wo sie sind»; der Auftrag
  hat sie nach D.3 Nr. 8 verschoben, weil `dienste.ts` sie jetzt als anderes Modul braucht. Kein
  Verhalten betroffen.
- **`dienste.ts` im Einzelnen:** Jeder Einstieg liest die Einstellungen wie bisher selbst; die
  geteilten Versender entstehen beim ersten Einstieg, der sie braucht, mit dessen Einstellungen
  (D.3 Nr. 5: ohne Folge). `holeAnlassDienste` und `holePasskeyDienst` lesen weiter keine
  Einstellungen. Der Kommentar über den Bremsen nennt jetzt alle fünf Nutzer (C.2 erledigt).
  `holeMitteilungAdminDienste` bleibt ein eigenes Objekt (`...holeAdminDienste()` plus Push,
  Pool-Versender, Adresse).
- **Lint:** `gruppe()` liefert für `.`, `login` und die Themen das Muster «`dienste` mit
  `\.ts`/`\.js` oder ohne, relativ oder über `$lib/server/`»; `zusatz` trägt dafür eine eigene
  Ebene, die Meldung heisst «kein Modul unter src/lib/server/ importiert dienste.ts (oberste
  Schicht)». `db` meldet `../dienste.ts` mit seiner eigenen Regel. `dienste.ts` steht in den
  `ignores` aller Blöcke, ohne Eintrag in `AUSNAHMEN`. Kommentar oben nachgeführt (Ebene 4; der
  ungenaue Satz zu den `index.ts` fällt weg). `importrichtung.test.ts`: 13 neue Fälle (8 Meldungen
  samt `login/sitzung.ts` als Datei mit Ausnahme, `db`, 4 erlaubte Importe in `dienste.ts`), 29 →
  42 Tests.
- **Lint rot belegt:** `anlass/anlaesse.ts` mit `import … from '../dienste.ts'` und `datum.ts` mit
  `export … from '$lib/server/dienste'` → je `no-restricted-imports` mit der neuen Meldung, Exit 1;
  das Muster für die Themen gestrichen → 3 Fälle rot; `dienste.ts` aus den `ignores` genommen → 4
  Fälle rot (und 18 Meldungen in `dienste.ts`).
- **Bauregel:** `ERLAUBTER_IMPORT` erlaubt `dienste.ts` statt der zwei `index.ts`;
  `AUS_INDEX`/`DIENSTE` sind `VERWALTUNGS_EINSTIEGE` (dieselben zwei Namen, darum die
  Argument-Prüfung unverändert); `MITTEILUNG_INDEX` ist `DIENSTE_MODUL`, und
  `pruefeMitteilungImporte` heisst `pruefeVerwaltungImporte` und sperrt ausserhalb von
  `api/admin/` beide Namen. `ADMIN_MODUL` und `betrifftBauregel` unverändert.
  `bauregel.test.ts`: die Fälle mit `index.ts` auf `dienste.ts` umgestellt (die Pfad-Fälle für
  `lib/server/admin` bleiben, sie prüfen `ADMIN_MODUL`), neu: Admin-Route holt
  `holeMitteilungDienste`, `holeLoginDienst`, `holeCmDienste`, `holeDb` oder `* as` aus
  `dienste.ts`; Admin-Route holt weiter aus `admin/index.ts` oder `mitteilung/index.ts`; beide
  Verwaltungs-Einstiege in einer Zeile sind erlaubt; Mitglieder-Route mit `holeAdminDienste` bzw.
  `holeMitteilungAdminDienste` aus `dienste.ts` (direkt, mit `as`, neben `type`, ohne Endung, `.js`,
  `$lib`, `export { … } from`); `dienste.ts` ausserhalb mit `* as`, Standard-Import, `export *`,
  `import()`. 36 Tests.
- **Bauregel rot belegt** (je ein Muster zurückgedreht, zurückgesetzt): `ERLAUBTER_IMPORT` mit den
  zwei `index.ts` → 1 rot; Admin-Route darf jeden Namen aus `dienste.ts` → 2 rot; ausserhalb nur
  `holeMitteilungAdminDienste` gesperrt (die alte Regel) → 1 rot (der Fall `holeAdminDienste`);
  `DIENSTE_MODUL` ohne `.js` und Anhang → 2 rot; `dienste.ts` ausserhalb auch ohne Namen → 2 rot;
  `VERWALTUNGS_EINSTIEGE` ohne `holeAdminDienste` → 8 rot. Am echten Repo: `/api/profil` mit
  `holeAdminDienste as h` → `bauregel: … dürfen 'holeAdminDienste' nutzen`, Exit 1.
- **Prüfläufe:** jeder Commit mit dem Hook `check-schnell`; vor dem Umbau-Commit von Hand
  Prettier, ESLint, `svelte-check`, `bauregel: ok`, Einheitstests 342, die Datenbanktests unter
  `src/routes/api/` samt Grundprüfung und Login 61. Voller `make check` auf `a3ab6b5`: grün (Lint; `svelte-check` 1522 Dateien ohne Fehler;
  Prüfskripte samt `bauregel: ok`; Einheits- und Datenbanktests 149 Dateien mit 1901 Tests,
  Abdeckung 97,07 % Anweisungen, 93,56 % Zweige; beide Builds; E2E 414 bestanden, 57
  übersprungen, 3,6 Minuten; Image; grüner Stand `834ab0083c18` gemerkt). Auf `e9958f1` (nur
  Doku dazu) noch einmal voll: dieselben Zahlen, E2E 3,4 Minuten.
- **Abweichungen von D.3:**
  1. Der Test läuft auf einer **eigenen Datenbank**, nicht auf der gemeinsamen wie der
     Bremsen-Test: Die Mitteilung an den Verein geht an alle aktiven Mitglieder der Datenbank, und
     `speichereMitteilung` löscht dabei Mitteilungen aller Bezüge, die älter als 365 Tage sind
     (FR-45); auf der gemeinsamen Datenbank wirkte das auf andere Testdateien. Dafür gibt
     `legeEigeneDatenbankAn` (`tests/hilfen/eigene-datenbank.ts`) auch die URL zurück; der Test setzt
     `DATABASE_URL` darauf, bevor `holeDb` zum ersten Mal läuft.
  2. **Typen:** Neben `grundpruefung.db.test.ts` (drei Importe, nicht zwei) holten auch die
     Schnittstellen-Tests von `profil`, `mitteilung` und `anlass` die Typen aus der
     `schnittstellen.ts`; nur Importpfade geändert.
  3. **`DIENSTE_MODUL` strenger als «mit und ohne Endung»:** auch `.js` (Vite löst es auf `.ts`
     auf) und ein Anhang `?…`. Der alte Pfad-Schutz `ADMIN_MODUL` fing `holeAdminDienste` mit jeder
     Endung; ohne `.js` hätte der Namens-Schutz eine Lücke, die es vorher nicht gab.
  4. **Ordner-Import:** `dienste.ts` ist kein Ordner; die Fälle dafür sind «ohne Endung» und
     `$lib/server/dienste`.
  5. **Eigene Meldung** für das Lint-Muster (D.3 sagte nur «weiteres Muster»): Sonst hiesse die
     Meldung bei einem Thema «ein Thema importiert nicht die Schnittstellen eines anderen Moduls».
- **Was kein Test sieht:**
  - die **Exportliste von `dienste.ts`**: Ein weiterer Export (z. B. die Bremsen) wäre für jede
    Mitglieder-Route erreichbar, die Bauregel verbietet dort nur die zwei Verwaltungs-Namen. Bleibt
    Aufgabe des Reviews.
  - dass Versender und Dienste **nur** in `dienste.ts` entstehen (D.3, keine Regel);
  - **Push:** Kein Test baut einen Push-Versender (VAPID überall leer), also auch nicht, dass CM und
    Mitteilungs-Verwaltung denselben bekommen; der Zweig mit VAPID-Paar in `holePush` läuft nie;
  - eine eigene Instanz der Bremsen nur für den Passkey (ohne Wirkung, C.2) und ein zweiter
    `ChallengeSpeicher` (nur E2E über zwei Anfragen);
  - dass der Hook jetzt beim Start alle Module samt `web-push` lädt: nur der Build in `make check`
    und E2E zeigen, dass dabei nichts entsteht;
  - der Entwicklungs-Server, der beim Neuladen einer Fachdatei alle Einzelstücke neu baut (D.3, [V]).
- **Ausserhalb des Schritts aufgefallen:**
  - `docs/ci-cd-und-release.md` (Zeile zur Bauregel) um den Namens-Schutz ergänzt (gleiches Thema,
    eine Zeile, in diesem `docs:`-Commit).
  - Die Lint-Meldung endet für jedes Muster mit «Heutige Verletzungen stehen in AUSNAHMEN»; für
    `dienste.ts` gibt es keine. Nicht geändert (Text gemeinsam für alle Muster).
  - `bauregel.test.ts` behält Pfad-Fälle mit `lib/server/admin/index.ts`, einer Datei, die es nicht
    mehr gibt; sie prüfen den Pfad-Schutz, der für jeden Pfad unter `lib/server/admin` gilt.
  - Meldungen an Einzelne aus der Verwaltung laufen weiter über den Pool (D.3, unverändert, jetzt
    vom Test festgehalten).
- **Für die Folgeschritte:**
  - **08:** keine Abhängigkeit.
  - **09, 11:** Eine neue Verwaltungs-Liste ändert an der Bauregel nur noch die Listen; ein neuer
    Einstieg der Verwaltung gehört in `VERWALTUNGS_EINSTIEGE`.
  - **12:** das Muster für `dienste.ts` einmal mit verletzen (Absicherung von 12); `AUSNAHMEN` hat
    weiter die vier Einträge von 10 und 11.

**Korrekturrunde nach dem Review** (12.11.2026, derselbe Branch; Code sonst «ok»)

- **Befunde des Reviews:** (1) In «Prüfläufe» stand ein Platzhalter statt des Ergebnisses von
  `make check`. (2) Ausserhalb von `api/admin/` war der Schutz eine Sperrliste nach Namen. Zwei
  Formen, die der alte Pfad-Schutz für `holeAdminDienste` fing, gingen durch:
  `import { holeAdminDienste/**/as/**/h } …` (ohne Kommentare liest die Prüfung den Namen
  `holeAdminDiensteash`) und ein Unicode-Escape im Bezeichner (`holeAdminDienst\u0065`).
  (3) `holeCmDienste` baute die Datenbank vor dem Versender, `cm/index.ts` umgekehrt. (4) F-20
  stand nicht in Abschnitt 9. Dazu der Hinweis, dass im Test `MAIL_NUR_AN` ein Nachzügler des
  siebten Tests in das Fenster des achten fiele.
- **Geändert:**
  - `1193548` `refactor:` `holeCmDienste` wieder in der Reihenfolge von `cm/index.ts`:
    Einstellungen, Versender, Datenbank, Push. Gleiches Fehlerverhalten mit einer Einschränkung,
    die zum Teilen gehört: Ist der Versender ohne Pool schon von einem anderen Einstieg gebaut,
    entsteht er hier nicht noch einmal (kein `createTransport`). Kein Test sieht die Reihenfolge.
  - `06cf0d2` `refactor:` Entscheid des Orchestrators: ausserhalb von `api/admin/` eine
    Erlaubt-Liste `MITGLIEDER_EINSTIEGE` (`holeLoginDienst`, `holePasskeyDienst`,
    `holeProfilDienste`, `holeCmDienste`, `holeMitteilungDienste`, `holeAnlassDienste`) statt der
    Sperrliste. Jeder andere Name aus `dienste.ts` ist ein Befund: die zwei Verwaltungs-Namen mit
    der bisherigen Meldung, alles Übrige mit «aus dienste.ts nur Einstiege der Mitglieder, nicht
    '…'». Ein neuer Export von `dienste.ts` ist damit ohne Eintrag auf beiden Seiten gesperrt (die
    Liste wird geführt, nicht aus `dienste.ts` abgeleitet). Die Admin-Seite ist unverändert.
    `bauregel.test.ts`: vier neue Fälle (alle sechs Mitglieder-Einstiege erlaubt, auch mit `as`;
    Kommentar statt Leerzeichen um `as`; Unicode-Escape; ein Name, den `dienste.ts` heute nicht
    exportiert: `holeBremsen`, `holeMailer`, `holeDb`, `type Bremsen`); im bestehenden Fall ist
    `type X` durch `type holeProfilDienste` ersetzt (`X` ist jetzt selbst ein Befund). 36 → 40
    Tests. Am echten Repo `bauregel: ok`.
  - `51fae98` `test:` nur ein Kommentar im achten Test zum Fenster der Zählung: Ein Nachzügler der
    Mitteilung fiele hinein und liefe ebenfalls über den Pool, also ohne aufzufallen; die Route
    der Mitteilung wartet den Versand aber ab, bevor sie antwortet. Die ungenaue Angabe
    «vorheriger Test» im Kommentar daneben ist berichtigt. Am Test sonst nichts.
  - Dieser `docs:`-Commit: Platzhalter ersetzt, F-20 in 9.1 (Zählung jetzt drei offene Fragen),
    Ergebnis in 7.3 und Stand nachgeführt.
- **Rot belegt** (aus einer Sicherungskopie zurückgesetzt, `git status` danach ohne diese
  Änderung): `pruefeVerwaltungImporte` wieder als Sperrliste → 3 rot (Kommentar, Unicode-Escape,
  unbekannter Name); der Name nur am Anfang verglichen (`startsWith`) → 1 rot (Kommentar, weil
  `holeProfilDiensteasp` mit einem erlaubten Namen beginnt). Am echten Repo: `/api/profil` mit
  `holeAdminDienste/**/as/**/h` → `bauregel: … nicht 'holeAdminDiensteash'; erlaubt sind nur …`,
  Exit 1; auf `dev` fing das der Pfad `lib/server/admin`.
- **Grenze, ausserhalb des Auftrags, nicht behoben (zur Entscheidung):** Der Import-Parser der
  Bauregel (`importe()`) erkennt einen Import mit einem Namen in Anführungszeichen nicht
  (`import { 'erstelleDb' as e } from '…/db/index.ts'`, «arbitrary module namespace names»
  aus ES2022): Die Klausel darf dort keine Anführungszeichen enthalten, die Zeile gilt gar nicht
  als Import. Am Code geprüft: eine Admin-Route mit dieser Form aus `db/index.ts` und eine
  Mitglieder-Route aus `lib/server/admin/mitglieder.ts` bzw. `admin/index.ts` melden je nichts,
  also schon vor Schritt 07 und für jede Regel der Bauregel, nicht nur für `dienste.ts`. Ob
  TypeScript und Vite des Projekts die Form übersetzen, ist nicht geprüft [V]. Sonst gleicher Art:
  `\u{65}` mit geschweifter Klammer liest die Prüfung nicht als Namensliste, das ergibt aber einen
  Befund («nur statisch und mit Namen»). Die Sperrliste der Verwaltungs-Schnittstellen aus
  `mitteilung/schnittstellen.ts` ausserhalb von `api/admin/` hat dieselbe Schwäche wie die alte
  Sperrliste für `dienste.ts` (Kommentar, Escape); nicht Teil dieser Runde.
- **Prüfläufe:** jeder Commit mit dem Hook `check-schnell`; voller `make check` auf dem Endstand
  `b342d0a`: Exit 0, 149 Dateien mit 1905 Tests, Abdeckung 97,07 % Anweisungen und 93,56 % Zweige,
  `bauregel: ok`, E2E 414 bestanden und 57 übersprungen in 3,4 Minuten, grüner Stand `5e1f20e7adee`.
- **Zweites Review (12.11.2026): «ok».** Der Reviewer hat die Bauregel am Repo, `bauregel.test.ts`
  (40 von 40) und 38 Import-Formen alte gegen neue Regel laufen lassen: Keine Form ist offen, die auf
  `origin/dev` zu war. Offen wie vorher: Namen in Anführungszeichen, nicht normalisierte Pfade,
  `import.meta.glob`, Weiterreichen über eine Datei unter `src/lib/` ausserhalb von `server/`.
- **Liegen geblieben (Hinweis des Reviews, kein Code geändert):** Der Kommentar über
  `VERWALTUNGS_EINSTIEGE` in `scripts/pruefungen/bauregel.ts` sagt noch «alle anderen Routen alles
  ausser diesen»; seit der Erlaubt-Liste stimmt das nicht mehr. Berichtigen mit dem nächsten
  Schritt, der die Datei anfasst (09).
- **Zum Ablauf:** Der `refactor-analyst` hatte beim Nachmessen (D.3) kein Edit-Werkzeug zur Hand,
  obwohl es im Frontmatter steht (E-32), und hat dieses Dokument per Skript über Bash geschrieben;
  geändert war nur diese Datei (vom Orchestrator am Diff geprüft).

### D.5 Nachmessen Schritt 08

**Nachmessen Schritt 08** (12.11.2026, Worktree `refactor-schritt-08`, Stand `dev` nach Schritt 07,
`6c6dd27`, Version 0.20.12)

Am Code gelesen und gezählt, **nichts ausgeführt** (kein Test, kein Lint, kein Build, keine
Datenbank). Server-Dateien unter `src/lib/server/`, wenn nichts anderes steht.

- **Ganz gelesen [G]:** `http.ts`, `admin/rechte.ts`, `admin/ansicht.ts`, alle neun
  Schnittstellen-Dateien (`admin`, `anlass`, `cm`, `gespraech`, `mitteilung`, `profil`, `turnier`,
  `login/schnittstellen.ts`, `login/passkey-schnittstellen.ts`), `status.ts`, `src/hooks.server.ts`,
  die Routen `api/status` und `api/kontakt`; in der Oberfläche `src/lib/anlass/api.ts`,
  `cm/api.ts`, `push/api.ts`, `verwaltung/api.ts`, `verwaltung/mitteilung-api.ts`,
  `verwaltung/umleiten.ts`, `profil/angaben.ts`, `login/anmelden.ts`, `login/passkey.ts`,
  `login/sitzung.ts`, `src/lib/json-post.ts`, `src/routes/+layout.ts`, `+page.ts`,
  `profil/+page.ts`, `profil/email/+page.ts`; `eslint.config.js` (Regel der Importrichtung);
  `CLAUDE.md` (Übergangsregel «Ab Schritt 08»).
- **In Auszügen [G für die Stelle]:** `grundpruefung.db.test.ts` (Zeilen 165 bis 265), die
  Rückgabetypen der Fachfunktionen, deren Ergebnis-Wort eine Schnittstelle als Variable sendet
  (`turnier/turniere.ts`, `cm/verwaltung.ts`, `cm/verwaltung-doppel.ts`, `cm/anmeldungen.ts`,
  `cm/doppel.ts`, `admin/mitgliedschaft.ts`, `admin/rollen.ts`, `gespraech/gespraech.ts`), die
  Prüf-Funktionen mit Feldfehlern (`*/angaben.ts`), die Seiten, die Feldfehler zeigen
  (`src/routes/anlass/[id]/+page.svelte`, sechs Seiten der Verwaltung,
  `Mitteilungsformular.svelte`, `profil/email/+page.svelte`), `src/lib/verwaltung/anzeige.ts`
  (`fehlerText`, `VERGEBEN`), `tsconfig.json`, `package.json`.
- **Nur per Textsuche [E]:** die übrigen 88 `+server.ts` (gesucht: `Response`, `json(`, `error(`,
  `status:`; ohne Treffer ausser `api/status` und `api/kontakt`), die Einheitstests der
  Abruf-Module und die Datenbanktests der Schnittstellen (gezählt: Stellen mit `fehler: '…'`),
  `tests/e2e/` (`.route(`, `fulfill`, `abort`, Wortlaut der betroffenen Meldungen), die Seiten der
  Clubmeisterschaft (Fehlerwörter in `case`), `docs/` ohne dieses Dokument (Fehlerform wird sonst
  nirgends beschrieben), `src/service-worker/` (beantwortet keine Anfrage an `/api/`).

#### Ergebnis in Kürze

- **41 Fehlerwörter**, nicht 23 (B-15 zählte nur die wörtlich geschriebenen; 18 weitere sendet der
  Server über eine Variable aus dem Ergebnis der Fachfunktion). 95 wörtliche Fehlerantworten
  (`antwort(4xx, …)`) in 12 Dateien, davon vier Definitionen in `http.ts`.
- **Echte Abweichungen von `{ fehler, felder? }`: 20 Stellen in fünf Gruppen.** Vier Stellen in
  drei Gruppen sind Fehler der Form (401 `{}`, `feld` beim Anlass, `felder` als Liste bei den
  Mitteilungen). Sechs Stellen sind `feld` beim Wort `vergeben`, zehn sind Zusatzangaben zu einem
  Wort (Anzahl, Warnungen, Kontakt und andere), die die Oberfläche braucht. Dazu 18 Stellen, die
  eine Standardantwort von Hand schreiben (gleiche Form, falscher Ort).
- **Sichtbar wird nichts.** Jede Abweichung lässt sich auf die gemeinsame Form bringen, ohne dass
  sich ein Meldungstext oder ein Verhalten ändert; Bedingungen unten. Das 401 `{}` liest in der
  Oberfläche niemand: Alle sieben Stellen deuten nur den Statuscode.
- **Eine Frage an den Projektleiter (F-21):** was neben `fehler` und `felder` im Körper stehen
  darf. Empfehlung A (Zusatzangaben bleiben, je Wort in der Liste benannt).
- **Schnitt:** ein Schritt, ein Subagent (Opus), sieben Commits; rund 34 Dateien, keine Seite,
  keine Route. Trennstelle für den Notfall nach dem dritten Commit.

#### Alle Fehlerwörter des Servers [G]

Status und Fundstelle je Wort; «Oberfläche» sagt, welches Abruf-Modul das Wort als Wort liest.
«nur Status» heisst: Die Oberfläche schaut auf den Statuscode, das Wort liest niemand.

| Wort | Status | Server: Datei → Funktion | Zusatz | Oberfläche |
|------|-------:|--------------------------|--------|------------|
| `format` | 415 | `http.ts` → `formatFehler` (20 Aufrufe, dazu über `aendernd` und `schreibt`) | | niemand (wird Störung) |
| `abgemeldet` | 401 | `http.ts` → `mitSitzung`; `admin/rechte.ts` → `mitKonto`, `mitRolle`; `admin/schnittstellen.ts` → `getZugang`, `postAnsicht` (zweimal), `postAnsichtBeenden` | | nur Status (`anlass`, `cm`, `push`, `verwaltung`) |
| `nicht-gefunden` | 404 | `http.ts` → `nichtGefunden` (97 Aufrufe); von Hand: `profil` → `getProfil`, `postProfil`, `postKlassierung`, `postRufname`; Passkey → `postEntfernen` | | nur Status (`anlass`, `cm`, `verwaltung`) |
| `eingabe` | 400 | `http.ts` → `eingabeFehler` (21 Aufrufe); 28-mal wörtlich in `admin`, `anlass`, `cm`, `gespraech`, `mitteilung`, `profil`, `turnier` | `felder`, `feld`, `fremd` (unten) | `verwaltung`, `cm`, `profil`, `anlass` |
| `zu-viele` | 429 | `login/schnittstellen.ts` → `loginAntwort`, `postMailCode`; Passkey → `postAnmeldenOptionen`; `admin` → `postZugangCode`; `profil` → `postEmail` | | nur Status (`verwaltung`, `profil`, `login`) |
| `falsch` | 400 | `loginAntwort`; Passkey → `falsch` (`postEinrichten`, `postEntfernen`); `admin` → `postZugang`; `profil` → `postEmailBestaetigen` | | `verwaltung`, `profil`, `login/anmelden.ts` |
| `benutzt` | 400 | `loginAntwort` | `kontakt` | `login/anmelden.ts` |
| `kein-admin` | 403 | `admin/rechte.ts` → `mitKonto`, `mitRolle`; `admin` → `getZugang`, `postAnsicht` | | `verwaltung` |
| `unbestaetigt` | 403 | `mitRolle`; `postAnsicht` | | `verwaltung` |
| `kein-recht` | 403 | `mitRolle` | | `verwaltung` |
| `nur-ansehen` | 403 | `mitRolle`; `admin/ansicht.ts` → `riegel` (im Hook vor jeder schreibenden Schnittstelle) | | `verwaltung`; die Module der Mitglieder machen daraus Störung |
| `vergeben` | 409 | `turnier` → `postTurniere`, `postTurnier` (`jahr`), `postKategorien`, `postKategorie` (`name`); `admin` → `postMitglieder`, `postMitglied` (`email` oder `mitgliedernummer`) | `feld` | `verwaltung` |
| `veraltet` | 409 | `admin` → `postMitglied`, `postRollen`, `uebergang` (alle vier Übergänge), `postEinlesen`, `postFairgate`; `profil` → `postProfil` | | `verwaltung`, `profil` |
| `letzter-mytco` | 409 | `admin` → `postRollen`, `postAustritt`, `postLoeschen` | | `verwaltung` |
| `eigenes-konto` | 409 | `admin` → `postAustritt`, `postLoeschen` | | `verwaltung` |
| `frist-abgelaufen` | 409 | `admin` → `postWiedereintritt` | | `verwaltung` |
| `nicht-moeglich` | 409 | `admin` → `postBriefe`, `postBrief` | `anzahl` | `verwaltung` |
| `datei` | 400 | `admin` → `postEinlesenVorschau`, `postEinlesen` | `datei` | `verwaltung` |
| `gleich` | 400 | `profil` → `postEmail` | | `profil` |
| `push-aus` | 409 | `mitteilung` → `postAbo` | | `push` |
| `geschlossen` | 409 | `anlass` → `postAnmeldung`; `cm` → `postCmAbmeldung`, `ablehnung` (auch für jedes unbekannte Wort) | | `anlass`, `cm` |
| `voll`, `passt-nicht`, `keine-wildcard`, `schon-angefragt`, `anfrage-offen`, `hinfaellig`, `angaben-fehlen` | 409 | `cm` → `ablehnung` (Liste `FEHLER`) | | `cm` (Liste `ABGELEHNT`) |
| `schon-angemeldet` | 409 | `cm` → `ablehnung`; `turnier` → `postAnmeldungVonHand`, `postVerschieben`, `abgelehnt` | | `cm`, `verwaltung` |
| `vorbereitung` | 409 | `turnier` → `postAnmeldungVonHand`, `postVerschieben`, `abgelehnt` | | `verwaltung` |
| `nicht-beantragt` | 409 | `turnier` → `postEntscheid` | | `verwaltung` |
| `nur-lesen` | 409 | `gespraech` → `nurLesen` (`postGespraech`, `postAntwort`, `postZustand`) | | `cm`, `verwaltung` |
| `inzwischen` | 409 | `gespraech` → `postAntwort` | `gespraech` | `verwaltung` |
| `schluss-vorbei`, `keine-kategorie`, `unzulaessig` | 409 | `turnier` → `postTurnierStatus` | | `verwaltung` |
| `abgesagt`, `art-gesperrt` | 409 | `turnier` → `postKategorie` | | `verwaltung` |
| `unpassend` | 409 | `turnier` → `postKategorie` | `anzahl` | `verwaltung` |
| `hat-anmeldungen` | 409 | `turnier` → `postKategorieAbsagen` | `anzahl` | `verwaltung` |
| `warnung` | 409 | `turnier` → `warnung` (`postAnmeldungVonHand`, `postVerschieben`, über `abgelehnt` auch `postDoppelVonHand`, `postZusammenlegen`, `postPartnerAendern`, `postAnfrageAlsPaar`) | `warnungen` | `verwaltung` |

- **Über eine Variable gesendet (neun Stellen, 18 Wörter):** `turnier/schnittstellen.ts` Zeilen 113,
  152, 231, 259, 299, 454; `admin/schnittstellen.ts` 215, 295 (`uebergang`);
  `cm/schnittstellen.ts` 96 (`ablehnung`). Die Wörter stehen als Typ im Rückgabewert der
  Fachfunktion, nicht in der Schnittstelle.
- **Jedes Wort, das die Oberfläche als Wort liest, sendet der Server auch.** Umgekehrt liest die
  Oberfläche `format` nie und `abgemeldet`, `nicht-gefunden`, `zu-viele` nur über den Status.
- **Bleibt (gut gelöst):** Die Statuscodes sind durchgehend gleich vergeben (400 Eingabe, 401
  Sitzung, 403 Recht, 404, 409 Zustand, 415 Format, 429 Bremse); jede Fehlerantwort trägt
  `cache-control: no-store`; ausser den Körpern unten weicht nichts ab. Der Schritt benennt kein
  Wort um (jede Umbenennung bräuchte beide Seiten und wäre keine Formfrage).

#### Abweichungen von der Fehlerform [G]

| Nr. | Abweichung | Status und Körper heute | Fundstelle | Stellen |
|----:|------------|-------------------------|------------|--------:|
| 1 | 401 ohne Wort | 401 `{}` | `login/passkey-schnittstellen.ts` → `nichtAngemeldet` (benutzt von `postEinrichtenOptionen`, `postEinrichten`, `getPasskeys`, `postEntfernen`, `postHinweis`); `login/schnittstellen.ts` → `getSitzung` | 2 (6 Funktionen) |
| 2 | `feld` statt `felder` bei Eingabe | 400 `{ fehler: 'eingabe', feld }`, `feld` ist `antwort` oder `bemerkung` | `anlass/schnittstellen.ts` → `postAnmeldung` (aus `anlass/angaben.ts` → `pruefeAntwort`) | 1 |
| 3 | `felder` als Liste von Namen | 400 `{ fehler: 'eingabe', felder: ['titel', …] }` | `mitteilung/schnittstellen.ts` → `mitEmpfaengern` (`postVereinVorschau`, `postVereinSenden`, `postAnlassVorschau`, `postAnlassSenden`; aus `mitteilung/angaben.ts` → `pruefeMitteilung`) | 1 (4 Funktionen) |
| 4 | `feld` beim Wort `vergeben` | 409 `{ fehler: 'vergeben', feld }` | `turnier/schnittstellen.ts` → `postTurniere`, `postTurnier`, `postKategorien`, `postKategorie`; `admin/schnittstellen.ts` → `postMitglieder`, `postMitglied` | 6 |
| 5 | Zusatzangabe zu einem Wort | `benutzt` + `kontakt` (400); `eingabe` + `felder: {}` + `fremd: true` (400); `unpassend`, `hat-anmeldungen`, `nicht-moeglich` + `anzahl` (409); `warnung` + `warnungen` (409); `inzwischen` + `gespraech` (409); `datei` + `datei` (400) | `loginAntwort`; `profil` → `postProfil`; `turnier` → `postKategorie`, `postKategorieAbsagen`, `warnung`; `admin` → `postBriefe`, `postBrief`, `postEinlesenVorschau`, `postEinlesen`; `gespraech` → `postAntwort` | 10 |
| 6 | Standardantwort von Hand (Form stimmt, Ort nicht; Übergangsregel «Ab Schritt 06») | 400 `eingabe` ohne `felder`: `gespraech` (3), `mitteilung` (2), `profil` → `postEmail`, `turnier` → `postTurnierStatus`; 404: `profil` (4), Passkey (1); 401 `abgemeldet`: `admin/rechte.ts` (2), `admin/schnittstellen.ts` (4) | wie in D.1 genannt, hier gezählt | 18 |

- **Nicht Teil der Fehlerform, bleibt:** Antworten von SvelteKit selbst (unbekannte Adresse 404,
  falsche Methode 405, unerwarteter Fehler 500 mit `{ message: 'Interner Fehler' }` aus
  `behandleFehler`) und `/api/status` (503 mit `{ status: 'fehler', … }`, das liest der
  Healthcheck). Die Oberfläche macht aus allen eine Störung.
- **Kein Formfehler, aber uneinheitlich:** Die Werte in `felder` sind meist ganze Sätze, bei den
  Angaben der Mitglieder Bruchstücke («fehlt», «4 Ziffern»; `admin/angaben.ts` →
  `pruefeAngaben`). Bleibt; es ist Wortlaut, keine Form.
- **Drei Arten, wie aus einem Feldfehler ein Satz wird:** (a) der Server schickt den Satz in
  `felder` (meist); (b) der Server schickt nur den Namen in `feld`, die Seite schreibt den Satz
  (Anlass, `vergeben`); (c) der Server schickt Namen als Liste, `mitMeldungen` in
  `src/lib/verwaltung/mitteilung-api.ts` macht daraus Sätze. (c) ist der eine «Übersetzer», der
  entfällt; einen zweiten gibt es nicht.

#### Die Gegenseite: wer in der Oberfläche Fehlerantworten deutet [G]

| Modul | Funktion | Liest vom Körper | Besonderheit |
|-------|----------|------------------|--------------|
| `src/lib/anlass/api.ts` | `rufe` | `fehler` (`geschlossen`), `feld` | 400 zählt nur mit `feld` gleich `antwort` oder `bemerkung`, sonst Störung |
| `src/lib/cm/api.ts` | `rufe` | `fehler` (zehn Wörter in `ABGELEHNT`), `felder` | 204 ohne Körper; 400 zählt nur mit `felder` als Objekt; dient auch `/api/profil/klassierung` |
| `src/lib/push/api.ts` | `rufe` | `fehler` (`push-aus`) | 400 wird Störung |
| `src/lib/verwaltung/api.ts` | `deute` | `fehler` (26 Wörter), `felder`, `feld`, `anzahl`, `warnungen`, `datei`, `gespraech` | fehlt die Zusatzangabe oder `felder`, wird es Störung; eine Liste gilt als Objekt und geht durch |
| `src/lib/verwaltung/mitteilung-api.ts` | `mitMeldungen` | `felder` als Liste | der Übersetzer: Namen zu Sätzen (`FELD_MELDUNG`) |
| `src/lib/profil/angaben.ts` | `deute`, `schicke` | `fehler` (`veraltet`, `eingabe`, `gleich`, `falsch`), `felder`, `fremd` | Ergebnis heisst `ergebnis`; 401 und 404 werden Störung; `eingabe` gilt auch ohne `felder` |
| `src/lib/login/anmelden.ts` | `sende` | `fehler` (`benutzt`, `falsch`), `kontakt` | 401 wird Störung; auch für `/api/logout` und Passkey |
| `src/lib/login/passkey.ts` | alle | nichts | nur `ok`, 204, 429 |
| `src/lib/login/sitzung.ts` | `hatSitzung` | nichts | nur `ok` |

- **Das 401 `{}` deuten sieben Dateien, alle nur über den Status:** für `/api/sitzung`
  `src/routes/+layout.ts` (`ok`), `src/routes/+page.ts`, `profil/+page.ts`,
  `profil/email/+page.ts` (je `status === 401`, sonst `ok`), `src/lib/login/sitzung.ts` (`ok`,
  gerufen von `hilfe/+page.ts` und `datenschutz/+page.ts`); für den Passkey
  `src/lib/login/passkey.ts` (`ok`, 204) und über `sende` `src/lib/login/anmelden.ts` (401 wird
  Störung). Keine liest den Körper eines 401. Kein Baustein (`.svelte`) ruft selbst ab.
- **`eingabe` ohne `felder` bedeutet je Modul etwas anderes:** in `verwaltung`, `cm` und `push`
  Störung, im Profil «ungültige E-Mail-Adresse» (`postEmail`). Das ist heutiges Verhalten und
  bleibt in Schritt 08; **Falle:** Wer `eingabeFehler` ein leeres `felder: {}` mitgibt, macht in der
  Verwaltung aus der Störungsmeldung eine Antwort ohne jede Meldung. Für Schritt 13 ist es ein
  Sonderfall mehr (zusammen mit 204, `ergebnis` statt `art`, 401 als Störung im Profil und im
  Login-Modul, «Zusatzangabe fehlt heisst Störung»).
- **Seiten, die `feld` oder `vergeben` selbst in einen Satz setzen:**
  `src/routes/anlass/[id]/+page.svelte` (zwei Sätze); `verwaltung/mitglieder/neu`,
  `mitglieder/[id]` (aus `VERGEBEN` in `src/lib/verwaltung/anzeige.ts`); `turniere/neu`,
  `turniere/[id]` (Jahr), `turniere/[id]/kategorien/neu`, `kategorien/[kid]` (Name). Die vier
  Turnier-Seiten lesen `feld` gar nicht, sie kennen das Feld.
- **Doppelte Liste:** `FEHLER` in `cm/schnittstellen.ts` (neun Wörter) und `ABGELEHNT` in
  `src/lib/cm/api.ts` (dieselben neun und `nur-lesen` aus dem Gespräch). Sie stimmen heute
  überein.

#### Tests, die Wörter oder Körper als Text führen [G für E2E, E für die Zahlen]

- **E2E, `page.route`:** 13 Stellen, nicht zwölf. Die Prüfliste (b) nennt alle 13 mit richtiger
  Zeile, zählt aber `mitteilungen.test.ts:206` unter «zählt Anfragen» und nicht als `page.route`.
  **Ein Fehlerwort tragen nur drei:** `anlass.test.ts:147` (409 `geschlossen`),
  `verwaltung.test.ts:208` (409 `letzter-mytco`), `verwaltung.test.ts:587` (409 `veraltet`). Die
  übrigen zehn stellen keine Fehlerform: 503 mit leerem Körper oder `{}` (`login.test.ts:105`,
  `verwaltung.test.ts:387`), 502 mit Text (`mitteilungen.test.ts:257`), Abbruch
  (`hilfe.test.ts:51`), Erfolg oder Verzögerung (`mitteilungen.test.ts:206`, `:305`, `:327`,
  `navigation.test.ts:60`, `:441`, `bewegung.test.ts:88`). Keine der drei Stellen ändert in
  Schritt 08 ihre Form; sie werden nur gegen die Liste getippt.
- **Einheitstests der Abruf-Module:** 87 Stellen mit `fehler: '…'` in acht Dateien:
  `verwaltung/api.test.ts` 41, `cm/api.test.ts` 20, `profil/angaben.test.ts` 10,
  `anlass/api.test.ts` 4, `push/api.test.ts` 4, `login/anmelden.test.ts` 3,
  `login/passkey.test.ts` 3, `verwaltung/mitteilung-api.test.ts` 2; dazu zwei in
  `push/geraet.test.ts`. Drei davon sind absichtlich unbekannte Wörter (`unbekannt`, `anderes`,
  `sonst`). Die Form, die Schritt 08 ändert, steht an vier Stellen: `anlass/api.test.ts:47`
  (`feld: 'bemerkung'`), `mitteilung-api.test.ts:89` (`felder` als Liste),
  `verwaltung/api.test.ts:161` und `:280` (`vergeben` mit `feld`; nur bei Variante B von F-21).
- **Datenbanktests des Servers:** 176 Stellen mit `fehler: '…'` in 17 Dateien; sie prüfen die
  echte Antwort und brauchen die Liste nicht. Die geänderte Form steht in
  `anlass/schnittstellen.db.test.ts` (`feld`), `mitteilung/admin-schnittstellen.db.test.ts:274`,
  `:311` (Liste) und, nur bei Variante B, `turnier/schnittstellen.db.test.ts:219`, `:233`, `:276`,
  `:280`, `admin/schnittstellen.db.test.ts:425`, `:481`.

#### Vertragstests aus Schritt 03: was bewusst anzupassen ist [G]

- **`grundpruefung.db.test.ts`, `OHNE_SITZUNG_ANDERS`:** Die fünf Zeilen des Passkeys (`[401, {}]`)
  fallen weg; dann gilt für sie die Regel `[401, { fehler: 'abgemeldet' }]`. Es bleiben die drei
  gewollten Ausnahmen (`anlass.getKalender`, `passkey.postAnmeldenOptionen`,
  `passkey.postAnmelden`). Der Kommentar über der Liste nennt den Befund und Schritt 08 und fällt
  mit weg. Die Zählung 36 und der Test «jede Ausnahme gehört zu einem Eintrag» bleiben.
- **`getSitzung` hält kein Test am Körper fest:** `login/schnittstellen.db.test.ts` prüft an drei
  Stellen (Zeilen 229, 249, 295) nur den Status 401; ebenso `passkey-schnittstellen.db.test.ts`
  (167, 177). Der Schritt braucht darum zuerst eine Erwartung an den Körper von `getSitzung`
  (einmal rot); für den Passkey leistet das die Grundprüfung.
- **Passkey: die Prüfung bleibt, nur der Körper ändert sich.** `angemeldet` verlangt Konto **und**
  Sitzungs-Cookie (Test «Konto ohne Sitzungs-Cookie ergibt 401»). `mitSitzung` aus `http.ts` prüft
  nur das Konto; ein Tausch gegen `mitSitzung` wäre eine Verhaltensänderung.
- **Unverändert:** `OHNE_JSON_ANDERS` und `OHNE_BEIDES_ANDERS` (beide leer; 415 `format` bleibt),
  `routen.test.ts`, `bremsen.db.test.ts`, `mail-nur-an.db.test.ts`, die Rechte-Matrix.

#### Was sich für die Nutzerin ändert

**(b) Sichtbare Änderung: keine nötig.** Keine der Abweichungen erzwingt einen anderen Text oder ein
anderes Verhalten. Darum gibt es zu (b) keine Frage an den Projektleiter.

**(a) Rein internes Format, unsichtbar, je mit der Bedingung, unter der es unsichtbar bleibt:**

| Nr. | Wird zu | Unsichtbar, weil | Bedingung |
|----:|---------|------------------|-----------|
| 1 | 401 `{ fehler: 'abgemeldet' }` | alle sieben Stellen der Oberfläche lesen nur den Status | Passkey behält `angemeldet` |
| 2 | 400 `{ fehler: 'eingabe', felder: { bemerkung: Satz } }` | die Seite zeigt weiter ihren eigenen Satz | `anlass/api.ts` liest das Feld aus `felder` und gibt wie heute `{ art: 'eingabe', feld }` zurück; 400 ohne eines der zwei Felder bleibt Störung |
| 3 | 400 `{ fehler: 'eingabe', felder: { titel: Satz, … } }` | es sind dieselben vier Sätze, die heute `FELD_MELDUNG` liefert | die Sätze stehen einmal an einem geteilten Ort (unten), Server und beide Testsätze nehmen sie von dort; `mitMeldungen` entfällt, das Ergebnis des Moduls bleibt gleich |
| 4 | bleibt (Variante A von F-21) | keine Änderung | bei Variante B: Sätze wörtlich übernehmen, vorher ein E2E-Test je Meldung |
| 5 | bleibt, je Wort in der Liste benannt | keine Änderung | |
| 6 | Aufruf aus `http.ts` | derselbe Körper, Zeichen für Zeichen | `eingabeFehler` bekommt kein `felder` |

- **Das trägt nur, wenn die Ergebnisse der Abruf-Module in Schritt 08 gleich bleiben.** Dann
  ändert sich keine Seite, und die Einheitstests der Module belegen die Unsichtbarkeit selbst:
  Gefüttert wird die neue Form, erwartet wird dasselbe Ergebnis wie heute. Den Ergebnis-Typ
  vereinheitlicht Schritt 13.
- **Dünn [E]:** Die zwei geänderten Fehlerwege (Anlass 400, Mitteilung 400) läuft kein E2E-Test
  ab. Die Felder tragen `maxlength`, die Seite prüft die Auswahl vorher selbst; die Sätze kommen
  in `tests/e2e/` nicht vor (Textsuche). «E2E Anlass und Mitteilungen» in der Zeile 08 sichert
  diese Wege also nicht.

#### Ort der geteilten Liste

- **Vorschlag: eine Datei direkt unter `src/lib/`, Arbeitstitel `src/lib/fehler.ts`,** die nichts
  importiert. Inhalt: die 41 Wörter als eine Liste, daraus der Typ des Worts, der Typ des
  Fehlerkörpers (Wort, `felder` als «Feldname → Satz», Zusatzangaben je Wort) und eine Prüfung
  «ist ein Fehlerwort».
- **Warum dort [G]:** (1) Unter `src/lib/server/` ginge es nicht: Die Oberfläche braucht die Liste
  als Wert, aus dem Server holt sie nur Typen (so steht es in `login/passkey.ts` und
  `profil/angaben.ts`). (2) Es gibt das Muster schon: `src/lib/name.ts` (elf Importe aus dem
  Server), `src/lib/version.ts`, `src/lib/json-post.ts`. (3) Die Lint-Regel lässt es zu, ohne
  Änderung und ohne Eintrag in `AUSNAHMEN`: Für `http.ts` (Block `src/lib/server/*.ts`) sind nur
  `./login/…`, `./<Thema>/…` und `./dienste` gesperrt, der Pfad `../fehler.ts` trifft keines der
  Muster; für die Themen ebenso. Importe zwischen `src/lib/server/` und dem Rest von `src/lib/`
  erfasst die Regel nach ihrem eigenen Kommentar nicht (B-25). Nicht ausgeführt.
- **B-25 bleibt, wie es ist.** Ein eigener Ordner für Geteiltes wäre der Anfang einer Antwort auf
  B-25 und steht nicht im Plan. Der Kommentar oben in `http.ts` («importiert aus dem Server
  nichts») stimmt weiter.
- **Die vier Sätze der Mitteilungen** gehören neben `MAX_TITEL` und `MAX_TEXT` nach
  `src/lib/mitteilung/` (dort liegen `vorlagen.ts` und `auswahl.ts`, die der Server schon
  importiert).
- **Wie die Typisierung greift [V, nicht ausgeführt]:** Am wenigsten Umbau hat der Server, wenn
  `antwort` in `http.ts` für die sieben Fehler-Status (400, 401, 403, 404, 409, 415, 429) nur einen
  Fehlerkörper annimmt und für die vier Erfolgs-Status (200, 201, 202, 204) wie heute. Dann prüft
  der Compiler alle 95 Stellen, ohne dass eine umgeschrieben wird; jeder Aufruf nennt den Status
  heute als feste Zahl [G, Textsuche]. Anzupassen ist eine Stelle: `ablehnung` in
  `cm/schnittstellen.ts` reicht eine Zeichenkette durch und braucht einen Typwächter. In der
  Oberfläche liest jedes Modul `fehler` über die Prüfung «ist ein Fehlerwort»; ein Vergleich mit
  einem Wort, das es nicht gibt, ist dann ein Typfehler. Die Brücke zwischen den Seiten (B-29) ist
  der **Typ des Körpers in den Helfern der Einheitstests** (`json(…)`, `holer(…)`): Fällt eine
  Form aus dem Typ, werden die Tests rot, die sie noch füttern. `tsconfig.json` schliesst `tests`
  und `scripts` ein, `svelte-check` sieht sie also [G für die Datei].
- **Nicht durchgesetzt:** Dass niemand an `antwort` vorbei eine `Response` mit Fehler baut, prüft
  kein Werkzeug; heute tut es keiner [E].

#### Abweichungen vom Plan

1. **B-15, «23 Fehlerwörter»:** es sind 41 (23 wörtlich, 18 über Variable).
2. **B-15, «drei Formen von Eingabefehlern»:** stimmt, aber `vergeben` ist kein Eingabefehler
   (409), und die grösste Gruppe fehlt: Zusatzangaben zu einem Wort (zehn Stellen). Ob sie zur
   Form gehören, ist F-21.
3. **Zeile 08, Dateien:** Es fehlen `http.ts` (dort wird die Form zum Typ), `admin/rechte.ts` und
   `admin/ansicht.ts` (senden Fehler, sind keine `schnittstellen.ts`), `src/lib/verwaltung/api.ts`,
   `push/api.ts`, `profil/angaben.ts`, `login/anmelden.ts`, die Einheitstests und die zwei
   E2E-Dateien. `src/lib/cm/api.ts` ändert nur den Typ seiner Liste. Seiten und Routen sind nicht
   betroffen.
4. **Zeile 08, «mit ihren Gegenstücken in der Oberfläche» (401 `{}`):** Es gibt kein Gegenstück,
   das sich ändert; keine Datei der Oberfläche liest den Körper.
5. **Zeile 08, Absicherung «E2E Anlass und Mitteilungen»:** Die geänderten Fehlerwege laufen sie
   nicht ab (oben). Das Netz sind die Tests der Module beider Seiten.
6. **Zeile 08, «nehmen ihre Wörter aus der Liste, nicht als Text»:** Gleich viel Schutz bei viel
   weniger Umbau gibt «gegen die Liste getippt» (rund zehn Helfer statt 87 Stellen). Vorschlag: so
   lesen.
7. **Hinweise, «zwölf `page.route`-Stellen»:** 13; ein Fehlerwort tragen drei. B-29 nennt
   ebenfalls zwölf.
8. **Hinweise, 401:** stimmt. Zu ergänzen: `getSitzung` und der Passkey sind am Körper von keinem
   eigenen Test gehalten; `angemeldet` darf nicht durch `mitSitzung` ersetzt werden.
9. **«Was das Netz deckt», Zeile 08:** stimmt; zu ergänzen ist, dass die Grundprüfung den Körper
   nur für 401 und 415 hält, nicht für 400 und 409.
10. **Übergangsregel «Ab Schritt 08» in `CLAUDE.md`:** Wörtlich verbietet sie die Zusatzangaben
    (F-21).

Sonst stimmen Zeile 08 und die Hinweise: Risiko mittel, Voraussetzung 06 und E-18, «ein
Übersetzer entfällt», keine Abhängigkeit zu Schritt 07, Modell und Weg.

#### Vorschlag für den Schnitt

- **Ein Schritt, ein Subagent, Opus.** Der Umfang ist breit, aber flach: rund 34 Dateien (eine
  neue; elf im Server; sieben Abruf-Module; neun Einheitstests der Oberfläche; vier Tests des
  Servers; zwei E2E-Dateien), dazu dieses Dokument und `CLAUDE.md`. Die Form ändert sich an vier
  Stellen des Servers, der Rest ist Typ. Opus, weil der Typ des Fehlerkörpers mit Zusatzangaben
  je Wort ein Entwurf ist und weil 18 der 41 Wörter über Variablen aus sieben Fachdateien kommen.
- **Nicht teilen in «Form» und «401 `{}`»:** Das 401 sind zwei Zeilen im Server und fünf in einem
  Test, ohne Datei der Oberfläche; als eigener Schritt kostete es einen Worktree, ein Review und
  eine Version für einen Commit.
- **Commits, jeder für sich grün:**
  1. `refactor:` `src/lib/fehler.ts` und der Typ an `antwort`; die heutigen Abweichungen 1 bis 3
     stehen als benannte Altformen im Typ. Kein Test ändert sich. Einmal rot: ein verschriebenes
     Wort im Server.
  2. `refactor:` Abruf-Module lesen `fehler` über die Liste; `ABGELEHNT` und `FEHLER` gegen die
     Liste; Helfer der Einheitstests und die drei E2E-Stellen getippt. Kein erwartetes Ergebnis
     ändert sich. Einmal rot: ein verschriebenes Wort in einem Test.
  3. `refactor:` die 18 Standardantworten von Hand kommen aus `http.ts` (dazu dort die Antwort
     «abgemeldet»). Kein Test ändert sich.
  4. `refactor:` 401 `{}` wird `abgemeldet`; Altform 1 aus dem Typ; Grundprüfung fünf Zeilen
     weniger, neue Erwartung für `getSitzung` (vorher rot).
  5. `refactor:` Anlass, Server und `anlass/api.ts` zusammen; Altform 2 aus dem Typ.
  6. `refactor:` Mitteilungen, Server und `mitteilung-api.ts` zusammen, Sätze an den geteilten
     Ort, `mitMeldungen` weg; Altform 3 aus dem Typ.
  7. `docs:` dieses Dokument und der Wortlaut «Ab Schritt 08» nach F-21.
- **Warum die Altformen im Typ:** Fällt eine aus dem Typ, zeigt der Compiler auf die Stelle im
  Server und auf die Tests der Oberfläche, die sie noch füttern. So muss jede Formänderung beide
  Seiten im selben Commit anfassen; das ist die Antwort auf das falsche Grün aus B-29.
- **Trennstelle für den Notfall:** nach Commit 3 (bis dort ändert sich kein Körper und kein
  Test-Ergebnis). Geht die Typisierung an `antwort` nicht auf [V], abbrechen und melden, nicht 95
  Stellen von Hand umschreiben.
- **Review:** prüft je Commit 1 bis 3, dass kein erwarteter Wert in einem Test geändert ist; je
  Commit 4 bis 6, dass in den Tests der Abruf-Module nur die gefütterte Antwort geändert ist,
  nicht das erwartete Ergebnis; dass keine `.svelte`-Datei und keine `+server.ts` im Diff steht.
- **Nicht Teil des Schritts:** Ergebnis-Typ der Abruf-Module und die Sonderfälle (Schritt 13),
  der direkte Abruf von `/api/sitzung` in vier Ladefunktionen (Schritt 15), `feld` bei `vergeben`
  (bei Variante A), Wortlaut der Feldmeldungen, Umbenennen von Wörtern, die Antworten von
  SvelteKit selbst.

#### Frage an den Projektleiter

**F-21 [neu, OFFEN]** steht in Abschnitt 9.1: Was darf eine Fehlerantwort neben dem Fehlerwort und
den Feldmeldungen enthalten? Empfehlung A. Für die Nutzerin ändert keine der Antworten etwas. B
baut auf A auf, C ist eine andere Form; ohne Antwort ist darum nur A ohne Folgen für später.

#### Nicht geprüft, dünn belegt

- **Nichts ausgeführt:** kein Test, kein Lint, kein `svelte-check`. Dass die Lint-Regel den Import
  von `src/lib/fehler.ts` aus `http.ts` zulässt, ist an den Mustern gelesen. Dass der Typ an
  `antwort` mit dem `tsconfig` des Projekts so greift, ist eine Vermutung [V]; im Worktree gibt es
  kein `node_modules`.
- **Die 88 übrigen `+server.ts` nicht einzeln gelesen [E]:** Textsuche ohne Treffer; dass jede
  genau eine Schnittstellen-Funktion ruft, sichert `routen.test.ts`.
- **Tests nur gezählt [E]:** Die 87 und 176 Stellen stammen aus einer Textsuche nach
  `fehler: '…'`; Körper, die anders geschrieben sind (Variable, mehrzeilig), fehlen in der Zahl.
  Die vier bzw. zehn Stellen mit der geänderten Form sind einzeln gelesen.
- **Seiten nur per Textsuche [E]:** Welche Seite welches Wort in welchen Satz setzt, ist für
  Anlass, `vergeben` und Mitteilungen gelesen, für die Clubmeisterschaft und die übrige Verwaltung
  nur gesucht. Für Variante A ändert sich dort nichts.
- **E2E-Abdeckung aus der Textsuche geschlossen [E]:** «kein E2E läuft den Weg ab» heisst: Der
  Satz kommt unter `tests/e2e/` nicht vor. Ein Test, der den Weg abläuft, ohne den Satz zu
  prüfen, fiele so nicht auf.
- **SvelteKit nicht nachgeschlagen [V]:** dass ein Wert aus `src/lib/server/` im Browser nicht
  importiert werden darf, steht hier aus den Kommentaren im Code, nicht aus der Doku.
- **Nicht nachgeführt:** Die Zeile «Nächster offener Schritt» oben sagt weiter «braucht Nachmessen
  vorab», die Tabelle «Vorab nachzumessen» in 7.7 nennt Schritt 08 weiter, B-15 und B-29 nennen
  weiter 23 Wörter und zwölf Stellen (der Auftrag liess sonst nichts umschreiben). Erledigt ist
  das Nachmessen laut Zeile 08 und diesem Abschnitt. *(Nachgeführt mit Schritt 08, Anhang D.6.)*

### D.6 Schritt 08

**Erkenntnisse Schritt 08** (12.11.2026, Branch `refactor/schritt-08`, ab `6c6dd27` und dem
Doku-Commit `898341b`; F-21 nach Variante A, vorläufig vom Orchestrator gesetzt)

- **Commits:** `ec52ab7` `refactor:` `src/lib/fehler.ts` und der Typ an `antwort`; `eb054ab`
  `refactor:` Abruf-Module und gestellte Antworten der Tests gegen die Liste; `c8ef953`
  `refactor:` die 18 Standardantworten von Hand aus `http.ts` (neu dort `abgemeldet`); `8cf5734`
  `refactor:` 401 `{}` wird `abgemeldet`; `ae408d7` `refactor:` Anlass; `404eaca` `refactor:`
  Mitteilungen, `mitMeldungen` weg. Dazu dieser `docs:`-Commit. Sieben Commits wie in D.5, jeder
  mit dem Hook `check-schnell` und zusätzlich von Hand mit den Datenbanktests (ab Commit 3) grün.
  36 Dateien (D.5: rund 34), keine `.svelte`-Datei, keine `+server.ts`, keine Änderung an
  `eslint.config.js` oder `AUSNAHMEN`, `CLAUDE.md` unverändert.
- **`src/lib/fehler.ts`** (importiert nichts): `FEHLERWOERTER` (die 41 Wörter aus D.5, nach Status
  geordnet), `Fehlerwort`, `istFehlerwort`, `FehlerStatus` (400, 401, 403, 404, 409, 415, 429),
  `Feldmeldungen` («Feldname → Satz»), `WortOhneZusatz` und `Fehlerkoerper`. Die Zusatzangaben
  stehen je Wort im privaten Typ `Zusatz`: `eingabe` (`fremd?`), `benutzt` (`kontakt`),
  `vergeben` (`feld`), `datei` (`datei`), `nicht-moeglich`, `unpassend`, `hat-anmeldungen`
  (`anzahl`), `warnung` (`warnungen`), `inzwischen` (`gespraech`). `felder` ist bei jedem Wort
  erlaubt; damit verbaut nichts Variante B (`vergeben` mit `felder`). Weil die Datei nichts
  importiert, sind die grossen Zusatzangaben nur grob getippt (`datei: object`,
  `gespraech: object | null`, `warnungen: readonly string[]`).
- **Typ an `antwort`** (`http.ts`, zwei Überladungen): Fehler-Status nur mit `Fehlerkoerper`,
  Erfolg (200, 201, 202, 204) wie bisher mit beliebigem Körper. Ein Fehler-Status ohne Körper, ein
  anderer Status oder ein Wort aus einer `string`-Variablen sind Typfehler. Die Vermutung aus D.5
  [V] ist damit bestätigt, mit zwei Ergänzungen (Abweichungen 2 und 3 unten).
- **Abruf-Module:** `anlass`, `cm`, `push`, `verwaltung`, `profil/angaben.ts`, `login/anmelden.ts`
  lesen `fehler` einmal über `istFehlerwort` und vergleichen danach nur noch mit Wörtern der
  Liste; ein verschriebenes Wort ist ein Typfehler. `ABGELEHNT` in `src/lib/cm/api.ts` ist mit
  `satisfies readonly Fehlerwort[]` gegen die Liste getippt, `FEHLER` in `cm/schnittstellen.ts`
  über den neuen Typwächter `istAbgelehnt` und `antwort`. `login/passkey.ts` und
  `login/sitzung.ts` lesen kein Wort und sind unverändert.
- **Gestellte Antworten der Tests:** Der Helfer `json` in acht Einheitstests nimmt bei einem
  Fehler-Status nur einen `Fehlerkoerper` an (`Koerper<S>`, bedingter Typ über den Status);
  Hüllen wie `ergebnis(status, inhalt)` sind dafür generisch. `push/geraet.test.ts` und die drei
  `page.route`-Stellen mit Fehlerwort (`anlass.test.ts:147`, `verwaltung.test.ts:208`, `:587`)
  tippen den Körper mit `satisfies Fehlerkoerper`. Vier Antworten sind absichtlich falsch und
  laufen über den Helfer `ungeprueft`: die drei unbekannten Wörter (`unbekannt`, `anderes`,
  `sonst`) und `warnung` ohne Liste.
- **Formänderungen (Server und Oberfläche je im selben Commit):**
  - 401: Passkey (`postEinrichtenOptionen`, `postEinrichten`, `getPasskeys`, `postEntfernen`,
    `postHinweis`) und `getSitzung` antworten `{ fehler: 'abgemeldet' }`. Der Passkey prüft weiter
    mit `angemeldet` (Konto und Cookie), nicht mit `mitSitzung`. `nichtAngemeldet` entfällt.
  - Anlass: `postAnmeldung` antwortet `felder: { antwort | bemerkung: Satz }`. Die zwei Sätze
    stehen als `ANTWORT_MELDUNG` in `src/lib/server/anlass/angaben.ts`, gleich lautend wie auf der
    Seite; `pruefeAntwort` ist unverändert, die Schnittstelle setzt den Satz ein.
    `src/lib/anlass/api.ts` liest das Feld aus `felder` (`feldAus`) und gibt wie bisher
    `{ art: 'eingabe', feld }` zurück.
  - Mitteilungen: die vier Schnittstellen antworten `felder: { Feld: Satz }`. Die vier Sätze
    stehen als `FELD_MELDUNG` in `src/lib/mitteilung/vorlagen.ts` neben `MAX_TITEL` und `MAX_TEXT`;
    `pruefeMitteilung` gibt weiter die Liste der Namen, die Schnittstelle setzt die Sätze ein.
    `mitMeldungen` und die Liste der Sätze in `mitteilung-api.ts` entfallen.
  - Die Altformen 1 bis 3 standen ab Commit 1 im Typ und fielen je mit ihrem Commit weg; seit
    `404eaca` gibt es keine mehr.
- **Rot belegt** (je aus einer Sicherungskopie zurückgesetzt, `git status` danach sauber):
  - Commit 1, `svelte-check`: `veraltett` in `profil/schnittstellen.ts` → 1 Fehler; dazu eine
    Probedatei mit fünf Fällen → je ein Fehler: `vergeben` ohne `feld`, `veraltet` mit `anzahl`,
    `gleich` mit `feld`, 403 ohne Körper, Wort aus einer `string`-Variablen. 6 Fehler in 2
    Dateien.
  - Commit 2, `svelte-check`: `letzter-mytko` in `verwaltung/api.test.ts`, `veraltt` in
    `tests/e2e/verwaltung.test.ts`, `frist-abgelaufn` als Vergleich in `verwaltung/api.ts` → 3
    Fehler in 3 Dateien. Vorher hatte der getippte Helfer genau die vier absichtlich falschen
    Antworten gemeldet (darum `ungeprueft`).
  - Commit 4, gegen den alten Server: Grundprüfung «ohne Sitzung 401» rot
    (`passkey.postEinrichtenOptionen`: erwartet `{ fehler: 'abgemeldet' }`, erhalten `{}`) und
    `GET /api/sitzung` rot («expected {} to deeply equal { fehler: 'abgemeldet' }»); 2 von 38.
  - Commit 5, gegen den alten Stand: `anlass/schnittstellen.db.test.ts` 2 von 8 rot (zu lange
    Bemerkung, ungültige Antwort), `anlass/api.test.ts` 1 von 3 rot («expected { art: 'stoerung' }
    to deeply equal { art: 'eingabe', feld: 'bemerkung' }»).
  - Commit 6, gegen den alten Server: `admin-schnittstellen.db.test.ts` 2 von 10 rot. Der
    Einheitstest von `mitteilung-api.ts` mit der neuen Form war schon auf dem alten Stand grün
    (`mitMeldungen` liess ein Objekt durch); das belegt, dass die neue Form dasselbe Ergebnis gibt.
  - Nach Commit 6, `svelte-check`: Server mit `feld` (Anlass) bzw. mit der Liste (Mitteilungen)
    und ein Test, der die Liste füttert → 3 Fehler in 3 Dateien. Damit ist das falsche Grün aus
    B-29 für diese Formen zu: Eine Seite allein lässt sich nicht mehr ändern.
- **Prüfläufe:** jeder Commit mit dem Hook `check-schnell` (Einheitstests 95 Dateien, 1166 Tests);
  Datenbanktests von Hand nach den Commits 3 bis 6 (54 Dateien, 739 bzw. ab Commit 5 740 Tests).
  Voller `make check` auf dem Code-Endstand `404eaca`: Exit 0 (Lint; `svelte-check` 1523 Dateien
  ohne Fehler; Prüfskripte samt `bauregel: ok`; Einheits- und Datenbanktests 149 Dateien mit 1906
  Tests, Abdeckung 97,07 % Anweisungen und 93,56 % Zweige; beide Builds; E2E 414 bestanden, 57
  übersprungen, 3,6 Minuten; Image; grüner Stand `12cfb50766ef` gemerkt). Auf dem Doku-Commit
  läuft `make check` noch einmal voll; sein Ergebnis steht im Bericht an den Orchestrator (der
  Code ist derselbe, der grüne Stand zählt Doku nicht mit).
- **Abweichungen von D.5:**
  1. **`getSitzung` war am Körper festgehalten:** `login/schnittstellen.db.test.ts:230` erwartet
     seit #29 `toEqual({})`. D.5 nannte nur die Zeilen mit dem Status. Die «neue Erwartung» ist
     darum diese Zeile, auf `{ fehler: 'abgemeldet' }` umgestellt und gegen den alten Server rot;
     ein eigener `test:`-Commit war nicht nötig. Am Plan ändert das nichts, das Netz war dichter
     als gemessen.
  2. **Drei Stellen statt einer brauchten einen engeren Typ:** neben `ablehnung` (Typwächter) auch
     `uebergang` und `mitRueckzug` in `admin/schnittstellen.ts`, deren Wort aus einer generischen
     Fachfunktion kommt (`E extends string` → `E extends WortOhneZusatz`).
  3. **Ein Glied für die Wörter ohne Zusatz:** TypeScript prüft ein Objekt mit einem
     zusammengesetzten Wort (`{ fehler: r }`) gegen eine Vereinigung nur bis 25 Kombinationen. Darum
     stehen die Wörter ohne Zusatz in einem Glied `{ fehler: WortOhneZusatz; felder? }`, die neun
     mit Zusatz je in einem eigenen.
  4. **Zwei weitere gestellte Antworten mit `{}`:** `push/api.test.ts` (401) und
     `verwaltung/api.test.ts` (404) fütterten `{}`, eine Form, die der Server dort nie sendete.
     Mit Altform 1 fiel sie aus dem Typ; die Antworten tragen jetzt das Wort des Servers, das
     erwartete Ergebnis ist gleich.
  5. **Die Sätze der Mitteilungen in den Tests:** D.5 sah vor, dass beide Testsätze sie aus
     `FELD_MELDUNG` nehmen. Der Datenbanktest erwartet sie wörtlich (so fällt eine Änderung am
     Wortlaut auf), der Einheitstest füttert sie aus `FELD_MELDUNG` und erwartet die Sätze wie
     bisher wörtlich.
  6. **Anlass, strenger gelesen:** `anlass/api.ts` verlangt jetzt neben dem Feld auch das Wort
     `eingabe`. Vorher zählte jede 400 mit `feld` als Eingabefehler. Der Server sendet die 400 nur
     mit `eingabe`; für echte Antworten ändert sich nichts.
  7. **Neue Fälle:** Datenbanktest «ungültige Antwort 400 mit Feld» (vorher deckte kein Test das
     Feld `antwort` an der Schnittstelle), in `anlass/api.test.ts` das Feld `antwort` und «`eingabe`
     ohne `felder` bleibt Störung».
  8. **Neun statt acht Wörter mit Zusatz:** D.5 zählte `eingabe` mit `fremd` nicht mit.
- **Für die Nutzerin geändert: nichts.** Kein Meldungstext, keine Seite, keine Route; die Ergebnisse
  der Abruf-Module sind gleich (in deren Tests wechselt nur die gefütterte Antwort, kein erwartetes
  Ergebnis). Die Sätze von Anlass und Mitteilungen lauten wie vorher.
- **Was kein Test sieht:**
  - eine `Response` mit Fehler, die jemand an `antwort` vorbei baut (D.5; heute keine);
  - die Namen in `felder`: Jeder Feldname passt in den Typ; ein umbenanntes Feld fällt nicht auf;
  - den inneren Aufbau der grossen Zusatzangaben (`datei`, `gespraech`, `warnungen`): Die Liste
    prüft nur, dass es sie gibt; die Abruf-Module lesen sie weiter mit `as`;
  - eine Hülle in einem Test mit `status: number`: Dann greift der bedingte Typ nicht (bei einem
    breiten `number` gilt `unknown`). Heute ist jede Hülle generisch; das hält nur das Review;
  - `ungeprueft` umgeht die Liste mit Absicht; ein neuer Aufruf dort fällt nur im Review auf;
  - die zwei geänderten Fehlerwege (Anlass 400, Mitteilung 400) im Browser: kein E2E (D.5);
  - dass die Seite des Anlasses denselben Satz zeigt wie `ANTWORT_MELDUNG`: zwei Stellen, kein
    Test vergleicht sie (die Seite zeigt weiter ihren eigenen).
- **Ausserhalb des Schritts aufgefallen (nicht behoben):**
  - Die zwei Listen `FEHLER` (`cm/schnittstellen.ts`) und `ABGELEHNT` (`src/lib/cm/api.ts`) gibt
    es weiter doppelt; beide sind jetzt gegen die gemeinsame Liste getippt, aber nicht
    gegeneinander. Ein Grund, den der Server neu kennt, fällt in der Oberfläche als Störung an.
    Kandidat für Schritt 13.
  - `profil` → `postProfil` antwortet bei einem unlesbaren Stand `{ fehler: 'eingabe', felder: {} }`
    (ohne `fremd`); die Seite zeigt dann keine Feldmeldung. Unverändert, war so.
  - `deute` in `src/lib/verwaltung/api.ts` liess eine Liste als `felder` durch («Liste gilt als
    Objekt», D.5). Der Server sendet keine mehr, der Typ verbietet sie; die Prüfung im Modul ist
    unverändert (Schritt 13).
- **Vorschlag für den Wortlaut der Übergangsregel «Ab Schritt 08»** (nicht eingespielt;
  `CLAUDE.md` unverändert, Entscheid des Projektleiters mit F-21):
  «Ab Schritt 08: eine Fehlerform `{ fehler, felder? }`; Zusatzangaben nur, wo
  `src/lib/fehler.ts` sie für ein Wort nennt. Fehlerwörter nur aus dieser Liste, die Server und
  Oberfläche teilen.»
- **Für die Folgeschritte:**
  - **09 bis 11:** Eine verschobene Schnittstelle behält ihre Antworten; der Typ an `antwort`
    prüft sie am neuen Ort mit.
  - **13:** Jede Fehlerantwort trägt ein Wort der Liste; die Module lesen es schon über
    `istFehlerwort`. Offen bleiben die Sonderfälle aus D.5 und die doppelte Liste der CM.
  - **Variante B von F-21:** `vergeben` darf `felder` schon tragen; es fiele nur `feld` aus
    `Zusatz` weg, und der Compiler zeigte die sechs Stellen im Server und die zwei Tests.

**Review und Abschluss (Orchestrator, 12.11.2026)**

- **Voller `make check` auf dem Endstand `5690462`** (Implementer und, unabhängig, Reviewer): Exit 0,
  149 Dateien mit 1906 Tests, Abdeckung 97,07 % Anweisungen und 93,56 % Zweige, `bauregel: ok`, E2E
  414 bestanden und 57 übersprungen (3,5 bzw. 3,6 Minuten), grüner Stand `12cfb50766ef`.
- **Review: «ok», kein Befund vor dem Merge.** Kein Weg gefunden, auf dem eine Seite anderen Text
  zeigt oder sich anders verhält; den Körper des 401 liest niemand; die Sätze von Anlass und
  Mitteilungen sind zeichengleich; keine Erwartung aufgeweicht. Typprobe des Reviewers gegen
  `src/lib/fehler.ts`: neun falsche Formen sind rot.
- **Hinweise des Reviews, nicht behoben (für Schritt 13 bzw. den Projektleiter):**
  - Zwei Fälle «Status allein genügt» sind entfallen (`src/lib/push/api.test.ts`, 401, und
    `src/lib/verwaltung/api.test.ts`, 404, fütterten vorher `{}`); mit `ungeprueft(…, {})` liessen
    sie sich behalten. Nützlich spätestens für Schritt 13.
  - Der Typ bindet kein Wort an seinen Status (`antwort(404, { fehler: 'veraltet' })` geht durch),
    ebenso ein Objekt aus einer Variablen mit überzähligen Feldern und jeder `any`-Wert. Heute gibt
    es keine solche Stelle; das hält nur das Review.
  - Die geänderten Fehlerwege (Anlass 400, Mitteilung 400) läuft kein E2E ab; das Netz sind die
    Datenbanktests mit wörtlichen Sätzen und Feldnamen.
  - Die Sätze des Anlasses stehen doppelt (Server `ANTWORT_MELDUNG`, Seite); die Seite schreibt
    «500» fest, der Server nimmt `MAX_BEMERKUNG`. Der Server-Satz ist unbenutzt, bis Variante B oder
    Schritt 13 ihn aufgreift.
  - Dass `src/lib/fehler.ts` nichts importiert, setzt kein Werkzeug durch.
- **Offen beim Projektleiter:** Bestätigung von F-21 (Variante A läuft vorläufig) und der Wortlaut
  der Übergangsregel «Ab Schritt 08» in `CLAUDE.md` (Vorschlag oben in D.6).

### D.7 Nachmessen Schritt 09

**Nachmessen Schritt 09** (12.11.2026, Worktree `refactor-schritt-09`, Stand `dev` nach Schritt 08,
`8b04e30`, Version 0.20.13)

Am Code gelesen und gezählt, **nichts ausgeführt** (kein Test, kein Lint, kein Build, keine
Datenbank; auch die Bauregel nicht). Server-Dateien unter `src/lib/server/`, wenn nichts anderes
steht.

- **Ganz gelesen [G]:** `scripts/pruefungen/bauregel.ts`, `admin/schnittstellen.ts`,
  `admin/rechte.ts`, `mitteilung/schnittstellen.ts`, `anlass/schnittstellen.ts`, `routen.test.ts`,
  `grundpruefung.db.test.ts`, `eslint.config.js`, die sechs `+server.ts` unter
  `src/routes/api/admin/anlaesse/`, die Projekt-`CLAUDE.md`.
- **In Auszügen [G für die Stelle]:** `turnier/schnittstellen.ts` (Zeilen 1 bis 75, alle
  Export-Zeilen, die Liste), `gespraech/schnittstellen.ts` (Zeilen 1 bis 54, Export-Zeilen, Liste),
  `cm/schnittstellen.ts` (Import- und Export-Zeilen), `admin/rechte-matrix.db.test.ts` (Zeilen 150
  bis 440), `admin/schnittstellen.db.test.ts` (56 bis 215, 287 bis 317, 815 bis 884),
  `turnier/schnittstellen.db.test.ts` (374 bis 432), `mitteilung/admin-schnittstellen.db.test.ts`
  (325 bis 341), `scripts/pruefungen/bauregel.test.ts` (Titel aller Fälle, Zeilen 55 bis 73 und
  351 bis 390), `scripts/importrichtung.test.ts` (Titel und die Fälle mit `schnittstellen`),
  `docs/ci-cd-und-release.md` (Zeile 321), `docs/arc42.md` (Zeile 88), `docs/context-scopes.md`
  (Zeile 17).
- **Nur per Textsuche [E]:** die Import-Quellen aller 90 `+server.ts` (je Quelle gezählt), jede
  Verwendung von `getAdminAnl…` und `postAdminAnl…`, von `liest` und `schreibt`, der Listen-Namen
  in `src/`, `scripts/`, `tests/` und `docs/`; `tests/e2e/anlass.test.ts` (nur der Titel des einen
  Tests); die vier Testdateien unter `src/routes/` (nur ihre Import-Zeilen).

#### Ergebnis in Kürze

- **Es gibt heute drei Formen, nicht zwei.** Reine Verwaltungs-Datei mit eigener Liste (`admin/`,
  `turnier/`), gemischte Datei mit zwei Listen und Namens-Wächter (`mitteilung/`), gemischte Datei
  ohne eigene Liste (`gespraech/`: vier Verwaltungs-Funktionen, über `turnier/` weitergereicht).
  Variante A gibt es also schon zweimal, Variante B einmal; die dritte Form ist die schwächste.
- **Schritt 09 ist klein:** fünf Funktionen, 44 von 500 Zeilen, drei Routen mit fünf Methoden.
  `AUSNAHMEN` (vier Einträge) berührt er nicht. Auf Ordner-Ebene entsteht eine neue gegenseitige
  Abhängigkeit `admin` ↔ `anlass` (erlaubt, vom Lint nicht erfasst).
- **Empfehlung A ist bestätigt [G],** mit zwei Zusätzen (unten). Kurz: Unter A hängt der Schutz
  ausserhalb von `api/admin/` am Pfad, unter B am Namen; die Namens-Prüfung der Bauregel ist ihr
  schwächster Teil (drei Formen gehen heute durch), und unter B würde sie von einer auf vier
  Dateien ausgedehnt.
- **A kostet mehr als im Plan steht:** Das Lint-Muster für Schnittstellen-Dateien kennt nur
  `schnittstellen` und `passkey-schnittstellen`; eine Datei `verwaltung-schnittstellen.ts` fiele
  ohne Änderung an `eslint.config.js` aus der Importregel.
- **Die zwei bekannten Schwächen der Bauregel:** «Namen in Anführungszeichen» schliesst keine
  Variante (eigener Commit nötig); die Sperrliste für `mitteilung/schnittstellen.ts` verschwindet
  unter A, sobald auch `mitteilung` getrennt ist, sonst bleibt sie.
- **B-37 lässt sich im selben Schritt entschärfen:** Vier der fünf Stellen sind Tests und können
  die Menge der Listen aus einer gemeinsamen Stelle nehmen; der Routen-Test bindet sie dann an die
  Routen. Übrig bleiben zwei Stellen (Tests, Bauregel).

#### Wie Verwaltungs-Schnittstellen heute liegen [G]

| Form | Datei | Liste | Einträge | Admin-Routen | Schutz ausserhalb von `api/admin/` in der Bauregel |
|------|-------|-------|---------:|-------------:|-----------------------------------------------------|
| reine Verwaltungs-Datei | `admin/schnittstellen.ts` | `ADMIN_SCHNITTSTELLEN` | 30 | 24 | Pfad `lib/server/admin` (`ADMIN_MODUL`) |
| reine Verwaltungs-Datei | `turnier/schnittstellen.ts` | `TURNIER_SCHNITTSTELLEN` | 26 (22 eigene, 4 weitergereicht) | 20 | **keiner** |
| gemischt, zwei Listen | `mitteilung/schnittstellen.ts` | `MITTEILUNG_ADMIN_SCHNITTSTELLEN` neben `MITTEILUNG_SCHNITTSTELLEN` (4) | 6 | 6 | Sperrliste nach Namen (`pruefeVerwaltungImporte`) |
| gemischt, ohne eigene Liste | `gespraech/schnittstellen.ts` | keine; `getGespraeche`, `getAdminGespraech`, `postAntwort`, `postZustand` stehen in `TURNIER_SCHNITTSTELLEN`; daneben `GESPRAECH_SCHNITTSTELLEN` (3) | (4, oben mitgezählt) | (3, über `turnier/`, oben mitgezählt) | **keiner** |

- Summe 62 Einträge, davon 42 schreibend (20, 18, 4); 50 Admin-Routen, jede holt aus genau einer
  der drei Dateien (gezählt an den Import-Zeilen).
- Weitere Verwaltungs-Schnittstellen ausserhalb dieser vier Dateien gibt es nicht: `liest` und
  `schreibt` rufen nur `admin/`, `turnier/`, `mitteilung/` und `gespraech/schnittstellen.ts` auf
  [E, Textsuche].
- **Was die Bauregel für Admin-Routen prüft** (`pruefeAdminRoute`): Quelle nur `dienste.ts`, eine
  der drei Dateien oder `./$types`, relativ und mit `.ts`; nur statisch und mit Namen; aus
  `dienste.ts` nur die zwei `VERWALTUNGS_EINSTIEGE`, nur direkt als erstes Argument; jeder Name aus
  einer Schnittstellen-Datei muss in der **Vereinigung** der drei Listen stehen, nicht in der Liste
  seiner Datei.
- **Was sie für alle anderen Dateien unter `src/routes/` prüft:** nichts aus `lib/server/admin`
  (Pfad); aus `dienste.ts` nur die sechs `MITGLIEDER_EINSTIEGE` (Erlaubt-Liste); aus
  `mitteilung/schnittstellen.ts` kein Name der Verwaltungs-Liste (Sperrliste). `turnier/` und die
  vier Funktionen in `gespraech/` kennt dieser Teil nicht: Eine Mitglieder-Route, die `postTurniere`
  oder `postAntwort` importiert, meldet die Bauregel nicht.
- **Einordnung:** Dieser Teil der Bauregel ist die dritte Linie. Die erste ist `liest`/`schreibt`
  in jeder Funktion (geprüft über die Listen), die zweite der Routen-Test (dritter Test: Eine Route
  ausserhalb von `/api/admin/` darf nur Funktionen aus den Listen der Mitglieder oder `OHNE_LISTE`
  rufen; er prüft die Funktion selbst und hängt an keiner Schreibweise des Imports). Unersetzt ist
  die Bauregel für: «Admin-Route nimmt nur Gelistetes» als Regel vor dem Test, und «die Dienste nur
  weiterreichen» (kein `.db` aus `holeAdminDienste()`).

#### Wo die Menge der Listen von Hand steht [G]

| Nr. | Stelle | Fundstelle | Befund |
|----:|--------|------------|--------|
| 1 | Routen-Test | `routen.test.ts` → `VERWALTUNG` (Zeile 296) | drei Listen aufgezählt |
| 2 | Grundprüfung | `grundpruefung.db.test.ts` → `verwaltungsDienste()` (Zeile 140) | drei Listen; 415 über 42 |
| 3 | Rechte-Matrix | `admin/rechte-matrix.db.test.ts`, zweimal (Zeilen 203 und 423) | drei Listen je von Hand zusammengefügt |
| 4 | Schleife je Modul | `admin/schnittstellen.db.test.ts` (zweimal, feste Zahl 26), `turnier/schnittstellen.db.test.ts` (26), `mitteilung/admin-schnittstellen.db.test.ts` (6) | Die Schleife der Mitteilungen prüft nur «CM-Admin 403»; 401 und `unbestaetigt` über alle sechs prüft niemand |
| 5 | Bauregel | `scripts/pruefungen/bauregel.ts`, **acht Stellen:** `ERLAUBTER_IMPORT`, die drei Konstanten `…_DATEI`, `SCHNITTSTELLEN_IMPORT`, die Texte `ERLAUBT_IMPORT` und `ERLAUBT_LISTEN`, `adminSchnittstellen()`, `pruefeBauregel` (`mitteilungVerwaltung`), `betrifftBauregel` | D.4 sagte «ändert an der Bauregel nur noch die Listen»; es sind acht Stellen |

Nicht in B-37, aber ebenfalls von Hand: die gestellten Listen in `bauregel.test.ts`,
`docs/ci-cd-und-release.md` (Zeile 321) und `docs/arc42.md` (Zeile 88, beide nennen die drei
Listen), der Kopfkommentar in `bauregel.ts` und der Kommentar über `GESPRAECH_SCHNITTSTELLEN`. Die
`CLAUDE.md` («Tests») nennt vier Stellen (ohne die Schleife je Modul); das passt, sobald die
gemeinsame Schleife aus Schritt 09 in der Grundprüfung steht.

#### Was Schritt 09 verschiebt [G]

Durchgesehen sind alle 30 Einträge von `ADMIN_SCHNITTSTELLEN`. Fachlich in ein anderes Modul
gehören nur die fünf des Anlasses; alles andere (Zugang, Ansicht, Mitglieder, Rollen, Sitzungen,
Briefe, Einlesen, Mitgliedschaft, Auskunft, Verlauf, Fairgate) ruft Fachlogik aus `admin/` und
bleibt (E-12).

| Funktion | Zeilen | Route | Dienste | Bereich |
|----------|--------|-------|---------|---------|
| `getAdminAnlaesse` | 423 bis 425 | `GET /api/admin/anlaesse` | `holeAdminDienste` | `mitglieder`, lesen |
| `postAdminAnlaesse` | 427 bis 433 | `POST /api/admin/anlaesse` | `holeAdminDienste` | `mitglieder`, schreiben |
| `getAdminAnlass` | 435 bis 447 | `GET /api/admin/anlaesse/[id]` | `holeAdminDienste` | `mitglieder`, lesen |
| `postAdminAnlass` | 449 bis 458 | `POST /api/admin/anlaesse/[id]` | `holeAdminDienste` | `mitglieder`, schreiben |
| `postAdminAnlassLoeschen` | 460 bis 466 | `POST /api/admin/anlaesse/[id]/loeschen` | `holeAdminDienste` | `mitglieder`, schreiben |

- **Umfang:** 44 von 500 Zeilen. Mit ihnen gehen die Importe `pruefeAnlass` (`anlass/angaben.ts`),
  die fünf Fachfunktionen aus `anlass/anlaesse.ts` und `utcZuZuerich` (`src/lib/anlass/zeit.ts`).
  Die Funktionen teilen keine Hilfe mit dem Rest der Datei.
- **Routen:** drei der sechs `+server.ts` unter `api/admin/anlaesse/` ändern eine Import-Zeile;
  die drei unter `…/[id]/mitteilungen/` holen aus `mitteilung/schnittstellen.ts` und bleiben.
  Dienste, Adressen und Methoden bleiben gleich; in `ROUTEN` (Routen-Test) ändert sich keine Zeile,
  nur der Import oben.
- **Tests, die die fünf heute decken:**
  - `admin/schnittstellen.db.test.ts`: die Schleife «401, `kein-admin`, `unbestaetigt`» und die
    Schleife «CM-Admin 403» (beide über 26 Einträge, künftig 21), die Liste «415 bei `text/plain`»
    (nennt die drei schreibenden), und der Ablauf-Test «A-ANLASS-01» (Zeilen 815 bis 883: anlegen,
    Feldfehler, ändern, lesen, Liste, löschen, zweites Löschen 404). Er ist der einzige Test, der
    Ändern und Löschen abläuft.
  - `admin/rechte-matrix.db.test.ts`: `postAdminAnlaesse` legt dort den Anlass für die Matrix an;
    die drei schreibenden stehen in «MyTCO-Admin → 403 `kein-recht`», `getAdminAnlaesse` in «MyTCO-
    Admin liest → 200» (über `ADMIN_SCHNITTSTELLEN.getAdminAnlaesse`, braucht den neuen Namen der
    Liste).
  - `grundpruefung.db.test.ts`: 415 über die 42 schreibenden (Zahl bleibt, wenn die neue Liste in
    `verwaltungsDienste()` steht).
  - `routen.test.ts`: die drei Routen mit fünf Methoden.
  - `tests/e2e/anlass.test.ts`: ein Test «Admin erstellt Anlass, Mitglied meldet sich ab und wieder
    an, Admin sieht die Antwort» [E, nur der Titel gelesen].
- **Importrichtung:** Kein Eintrag in `AUSNAHMEN` betrifft `admin` und `anlass`; es fällt keiner
  weg, und es braucht keinen neuen (`anlass/` holt `liest`, `schreibt` und die Typen aus
  `admin/rechte.ts`, keiner Schnittstellen-Datei). Nach der Zählung von B-14: `admin` → `anlass`
  sinkt von drei Import-Zeilen auf eine (`admin/mitgliedschaft.ts` → `anlass/anlaesse.ts` bleibt),
  und **neu entsteht `anlass` → `admin`**. Heute importiert `anlass/` nichts aus `admin/`; danach
  hängen die zwei Ordner gegenseitig aneinander, wie schon `turnier`, `mitteilung` und `gespraech`
  an `admin/rechte.ts`. Das Zielbild erlaubt es, der Lint meldet es nicht; als «weniger
  Abhängigkeiten» darf der Schritt aber nicht gelten.
- **Was frei wird:** an `AUSNAHMEN` nichts. Der Gewinn ist die Auffindbarkeit: Wer nach
  `docs/context-scopes.md` (Zeile «Anlässe») lädt, bekommt `src/lib/server/anlass/`, heute aber
  nicht die fünf Funktionen der Verwaltung.

#### Die drei Varianten von F-17

**A: eigene Datei je Modul** (Arbeitstitel `anlass/verwaltung-schnittstellen.ts`, Liste
`ANLASS_ADMIN_SCHNITTSTELLEN`)

- **Neu:** `anlass/verwaltung-schnittstellen.ts` (rund 60 Zeilen) und ihre Testdatei.
- **Geändert:** `admin/schnittstellen.ts` (minus 44 Zeilen, Liste 30 → 25), drei Routen,
  `routen.test.ts`, `grundpruefung.db.test.ts`, `admin/rechte-matrix.db.test.ts`,
  `admin/schnittstellen.db.test.ts`, `bauregel.ts` und `bauregel.test.ts`, **dazu
  `eslint.config.js` und `scripts/importrichtung.test.ts`** (unten), zwei Doku-Zeilen.
- **Lint, im Plan nicht genannt:** `SCHNITTSTELLEN = '(?:passkey-)?schnittstellen'`
  (`eslint.config.js`, Zeile 28) trifft `verwaltung-schnittstellen` nicht. Ohne Änderung dürfte
  jedes andere Thema die neue Datei importieren (Ebene 3 griffe nicht). Das Muster wird erweitert
  (Vorschlag: jeder Vorsatz mit Bindestrich, dann deckt es auch eine Datei aus Schritt 10), mit
  einem Fall in `importrichtung.test.ts`, einmal rot. Kein Eintrag in `AUSNAHMEN`.
- **Routen-Test:** Das Muster `*schnittstellen.ts` trifft die neue Datei; keine Anpassung.
- **Bauregel danach:** «Admin-Routen importieren nur `dienste.ts` und die Dateien **einer
  Tabelle** (Datei → Liste), aus jeder Datei nur Namen ihrer Liste. Jede andere Datei unter
  `src/routes/` importiert keine reine Verwaltungs-Datei der Tabelle, nichts unter
  `lib/server/admin`, und aus `dienste.ts` nur die Einstiege der Mitglieder.» Die acht Stellen
  werden eine Tabelle; daneben bleiben die zwei Listen der Einstiege.
- **Schutz:** für Admin-Routen derselbe Code wie heute (eine Datei mehr). Ausserhalb kommt eine
  Pfad-Sperre dazu, die heute fehlt (`turnier/`) oder nur als Sperrliste nach Namen besteht. Der
  Pfad-Schutz ist die Form, die beim Review von Schritt 07 alle geprüften Schreibweisen fing
  (D.4). Zusätzlich möglich und empfohlen: Name gegen die Liste **seiner** Datei statt gegen die
  Vereinigung. **Mindestens gleich stark, ausserhalb stärker.**
- **Schritt 11:** `cm/verwaltung-schnittstellen.ts` mit 13 Einträgen (rund 250 Zeilen aus
  `turnier/schnittstellen.ts`), `gespraech/verwaltung-schnittstellen.ts` mit vier Einträgen;
  `turnier/schnittstellen.ts` behält neun und bleibt reine Verwaltungs-Datei. Beim Gespräch ist es
  mehr als «eigene Liste»: Die vier Funktionen ziehen in eine eigene Datei und teilen `pruefeText`
  und `antwortOderWeg` mit den drei der Mitglieder [G]. Am Ende sechs Listen (25, 5, 9, 13, 4, 6).
- **Schritt 12:** `AUSNAHMEN` wird leer (die eine Ausnahme `turnier` → `gespraech` fällt in 11,
  die drei von Schritt 10 dort).
- **Offen innerhalb von A:** `mitteilung/schnittstellen.ts` bleibt in Schritt 09 gemischt (nicht
  im Plan). Solange es so ist, gibt es weiter zwei Formen und die Sperrliste nach Namen. Die
  Trennung ist sauber möglich (Zeilen 80 bis 208 teilen keine Hilfe mit dem Mitglieder-Teil;
  sechs Routen, vier Testdateien nur an Importen) und passt in Schritt 11.

**B: gemischte Datei** (die fünf Funktionen in `anlass/schnittstellen.ts`, zweite Liste)

- **Neu:** keine Datei; `anlass/schnittstellen.ts` wächst von 86 auf rund 140 Zeilen.
- **Geändert:** wie A ohne `eslint.config.js` und `importrichtung.test.ts`.
- **Bauregel danach:** Admin-Seite wie A. Ausserhalb von `api/admin/` braucht jede gemischte Datei
  eine Prüfung nach Namen. Als Kopie der heutigen Sperrliste wäre sie so schwach wie diese (unten);
  gleich stark wird B nur, wenn sie als Erlaubt-Liste neu gebaut wird («aus einer gemischten Datei
  nur Namen ihrer Mitglieder-Liste»). Das geht: Die neun Mitglieder-Routen, die aus
  `mitteilung/`, `anlass/` und `gespraech/schnittstellen.ts` holen, importieren nur gelistete
  Funktionen [G, Import-Zeilen]; für die zwölf Routen aus `cm/schnittstellen.ts` nicht gelesen.
- **Schutz:** erreichbar gleich stark, aber über den Teil der Bauregel, der Namen aus Quelltext
  liest. Dazu eine neue Stelle: Weil Admin-Routen dann gemischte Dateien importieren dürfen, wird
  die Prüfung «Name in der Vereinigung aller Listen» zur Lücke, sobald eine Mitglieder-Funktion so
  heisst wie eine der Verwaltung in einem anderen Modul. Gleiche Namen über Module gibt es heute
  schon (`postKlassierung` in `profil` und `turnier`, `postBrief` in `login` und `admin`; in den
  künftig gemischten Dateien noch keinen). Unter B muss die Prüfung je Datei gelten.
- **Schritt 11:** `gespraech/` bekommt nur die eigene Liste (kleinster Umbau). `cm/schnittstellen.ts`
  wächst von 395 auf rund 640 Zeilen, mit zwölf Mitglieder- und 13 Verwaltungs-Funktionen und zwei
  Dienst-Typen in einer Datei.
- **Schritt 12:** wie A, `AUSNAHMEN` wird leer.

**C: Schritte 09 und 11 streichen**

- **Geändert:** nichts am Code. Im Plan: Zeilen 09 und 11, Zeile 12 und die Übergangsregel «ab
  Schritt 12 ist die Liste leer» der `CLAUDE.md` (die Ausnahme `turnier/schnittstellen.ts` →
  `gespraech/schnittstellen.ts` bekäme den Vermerk «bleibt»), E-12.
- **Schutz:** unverändert, samt der Lücken oben (`turnier/` und `gespraech/` ausserhalb ohne
  Regel, Sperrliste bei `mitteilung`).
- **Folge:** Die dritte Form (`gespraech/` ohne eigene Liste) bleibt, B-14 bleibt an zwei von drei
  Beispielen offen, Schritt 12 wird nicht scharf.
- **Zwischenform, zur Kenntnis:** Nur Schritt 09 zu streichen, liesse Schritt 12 unberührt
  (Schritt 09 streicht keine Ausnahme). Dagegen spricht: Schritt 09 ist mit fünf Funktionen und
  drei Routen der kleine Erstfall für das Muster, bevor Schritt 11 17 Funktionen und 14 Routen
  bewegt.

**Gegenüberstellung**

| | A | B | C |
|---|---|---|---|
| Dateien in Schritt 09 (ohne die gemeinsame Stelle der Tests) | rund 17, davon zwei neu; Lint-Muster geändert | rund 15, keine neu | keine |
| Bauregel, Stellen für die Menge der Listen | 1 Tabelle (statt 8) | 1 Tabelle, dazu Namens-Prüfung für jede gemischte Datei | 8 wie heute |
| Schutz ausserhalb von `api/admin/` | Pfad | Name | wie heute |
| Sperrliste `mitteilung` | entfällt, wenn `mitteilung` getrennt wird | muss zur Erlaubt-Liste umgebaut werden | bleibt |
| «Namen in Anführungszeichen» | bleibt | bleibt | bleibt |
| Schritt 11 | drei Dateien, sechs Listen | `cm/schnittstellen.ts` rund 640 Zeilen | entfällt |
| Schritt 12 | Liste leer | Liste leer | ein Eintrag bleibt |

**Empfehlung: A, bestätigt.** Belege: (1) A gibt es schon zweimal (`admin/`, `turnier/`), B einmal;
mit A endet der Umbau bei einer Form. (2) Die Namens-Prüfung ausserhalb von `api/admin/` hat heute
drei offene Formen (unten); A braucht sie für Schnittstellen nicht mehr, B dehnt sie aus. (3)
Die Prüfung gegen die Vereinigung der Listen ist unter A harmlos, unter B eine Lücke bei gleichen
Namen. (4) Schritt 11 ergäbe unter B eine Datei von rund 640 Zeilen. Gegen A spricht nur der
Aufwand: eine Datei und eine Testdatei mehr, das Lint-Muster, und am Ende sechs Listen (darum die
gemeinsame Stelle für die Tests, unten). Kein Entwurf gebaut; die Belege sind am Code gelesen.

#### Die zwei bekannten Schwächen der Bauregel

1. **Namen in Anführungszeichen** (`import { 'x' as y } from '…'`): `importe()` lässt in der
   Klausel kein Anführungszeichen zu (`bauregel.ts`, Zeile 78), die Zeile gilt nicht als Import
   [G]. Betroffen ist jede Regel der Bauregel in jeder Variante, auch die Pfad-Sperre von A (sie
   läuft über dieselbe Funktion). **Keine Variante schliesst das.** TypeScript 6.0.3 steht in
   `package.json`; dass es die Form übersetzt, ist nicht geprüft [V]. Vorschlag: eigener Commit in
   Schritt 09 (der Schritt fasst `bauregel.ts` ohnehin an, der Reviewer liest den Diff ganz): Eine
   Import- oder Export-Klausel mit Anführungszeichen ist in jeder Datei unter `src/routes/` ein
   Befund; zwei Fälle in `bauregel.test.ts` (Admin-Route, Mitglieder-Route), je einmal rot. Das
   verschärft eine Prüfung über die Zeile 09 hinaus, darum als Zusatz zu F-17 beim Projektleiter.
   Ein eigener Schritt wäre möglich, kostete aber eine Version und einen vollen Prüflauf für ein
   Muster.
2. **Sperrliste für `mitteilung/schnittstellen.ts` ausserhalb von `api/admin/`**
   (`pruefeVerwaltungImporte`, Zweig `verwaltung?.has(name)`): Am Code gelesen gehen drei Formen
   durch. Kommentar um `as` (ohne Kommentare liest die Prüfung `getVereinMitteilungenash`) und
   Unicode-Escape im Bezeichner, wie in D.4 vermerkt; **dazu neu der Pfad:**
   `MITTEILUNG_SCHNITTSTELLEN` kennt die Endung `.js` und einen Anhang `?…` nicht (anders als
   `DIENSTE_MODUL`), eine solche Quelle prüft der Zweig gar nicht [G; nicht ausgeführt]. Folge je
   Form: Die Bauregel schweigt; `liest`/`schreibt` und der Routen-Test fangen es. **Unter A
   entfällt die Sperrliste von selbst, sobald `mitteilung` getrennt ist** (Pfad-Sperre statt
   Namen); ohne die Trennung bleibt sie und bräuchte einen eigenen kleinen Umbau zur Erlaubt-Liste.
   Unter B ist dieser Umbau Teil der Variante. Unter C bleibt sie.

#### Abweichungen vom Plan

1. **«Zwei Muster» (Zeile 09, 7.7, F-17):** Es sind drei Formen; die dritte (`gespraech/`) nennt
   der Plan nur bei Schritt 11.
2. **Hinweise, Punkt (2):** `pruefeMitteilungImporte` heisst seit Schritt 07
   `pruefeVerwaltungImporte`. «Den Wächter gibt es nur für `mitteilung`» stimmt weiter; zu
   ergänzen: Für `turnier/` und die vier Funktionen in `gespraech/` gibt es ausserhalb von
   `api/admin/` gar keine Regel.
3. **B-37 und Hinweise, «fünf Stellen»:** Die Zählung stimmt. Genauer: in `bauregel.ts` acht
   Stellen, in der Rechte-Matrix zwei; die Schleife der Mitteilungen prüft weder 401 noch
   `unbestaetigt` über alle Einträge; dazu zwei Doku-Zeilen.
4. **Zeile 09, Dateien:** Es fehlen `admin/schnittstellen.db.test.ts`, eine neue Testdatei in
   `anlass/`, `docs/ci-cd-und-release.md`, `docs/arc42.md`; bei A `eslint.config.js` und
   `scripts/importrichtung.test.ts`. Von «Routen `src/routes/api/admin/anlaesse/`» ändern sich drei
   von sechs. In der Zeile nachgetragen.
5. **Zeile 09, «braucht keine neue [Ausnahme]»:** stimmt. Unter A ändert der Schritt trotzdem die
   Lint-Regel (Muster, nicht Liste).
6. **Zeile 09, Nutzen:** «wird kleiner» sind 44 von 500 Zeilen; die Importrichtung wird nicht
   besser (neu `anlass` → `admin`). Der Nutzen ist Auffindbarkeit und der Erstfall für Schritt 11.
7. **Zeile 09, Absicherung, «mit den vier benannten Ausnahmen»:** Am Code gelesen gelten sie nicht
   für alle drei Erwartungen. 401 ohne Sitzung antworten alle 30, auch die vier; `kein-admin` ohne
   Rolle alle ausser `postAnsichtBeenden` (200); `unbestaetigt` alle ausser den vier. Die Schleife
   soll die Ausnahmen je Erwartung mit ihrer heutigen Antwort benennen (wie `OHNE_SITZUNG_ANDERS`),
   nicht die vier Einträge auslassen. Ein unbestätigtes Konto mit der Rolle `mytco` genügt für alle
   Listen (es liest jeden Bereich). `zugang.pruefe` ist dafür nicht gelesen [E]; nichts ausgeführt.
8. **Zeile 09, Absicherung, «an einer Stelle (Grundprüfung, `verwaltungsDienste()`)»:** Dann
   führen Routen-Test und Rechte-Matrix ihre Aufzählung weiter selbst, und B-37 bleibt bei vier
   Stellen. Vorschlag: eine gemeinsame Stelle der Tests (zum Beispiel unter `tests/hilfen/`, dort
   gilt die Importregel nicht), aus der Grundprüfung, Routen-Test und Rechte-Matrix die Listen
   nehmen. Dann fängt der Routen-Test eine vergessene Liste: Eine Admin-Route, die aus ihr ruft,
   wird rot. Die Schleifen je Modul können danach entfallen oder bleiben.
9. **«Was das Netz deckt», Zeile 09, 11:** stimmt.
10. **D.4, «Für die Folgeschritte: 09, 11 … nur noch die Listen»:** acht Stellen (oben).
11. **Bestätigt:** Risiko mittel (Bauregel und Lint-Muster ändern sich), Voraussetzung 06a und 07,
    Modell Opus, Weg Subagent, Dateiname muss auf `schnittstellen.ts` enden, die Zählungen 36, 26
    und 42 bleiben.

#### Vorschlag für den Schnitt (bei Antwort A)

Ein Schritt, ein Subagent, Opus. Fünf Commits; nach dem dritten ist noch keine Funktion bewegt.

1. `test:` die gemeinsame Stelle für die Verwaltungs-Listen und die Schleife «401, `kein-admin`,
   `unbestaetigt`» über alle Listen in der Grundprüfung, Ausnahmen je Erwartung; Routen-Test und
   Rechte-Matrix nehmen die Listen von dort. Einmal rot: eine Liste aus der gemeinsamen Stelle
   genommen (Routen-Test), `mitRolle` abgeschwächt (Schleife).
2. `refactor:` `bauregel.ts` auf eine Tabelle Datei → Liste, ohne neue Datei; `bauregel.test.ts`
   bleibt dabei unverändert grün. Dazu die Pfad-Sperre ausserhalb von `api/admin/` für
   `turnier/schnittstellen.ts` und der Name gegen die Liste seiner Datei, je ein Fall, einmal rot.
   Der veraltete Kommentar über `VERWALTUNGS_EINSTIEGE` (D.4) wird berichtigt. Falls freigegeben,
   als eigener Commit: Klausel mit Anführungszeichen ist ein Befund.
3. `refactor:` Lint-Muster für `…-schnittstellen.ts` und Fall in `importrichtung.test.ts`, einmal
   rot.
4. `refactor:` die fünf Funktionen nach `anlass/verwaltung-schnittstellen.ts` mit
   `ANLASS_ADMIN_SCHNITTSTELLEN`; drei Routen; Tabelle der Bauregel und ihre Fälle; die gemeinsame
   Stelle der Tests; `admin/schnittstellen.db.test.ts` (26 → 21, 415-Liste); der Test A-ANLASS-01
   zieht in die neue Testdatei. Namen der Funktionen und Bereich `mitglieder` bleiben.
5. `docs:` `docs/ci-cd-und-release.md`, `docs/arc42.md`, dieses Dokument.

Die Tests unter `src/routes/` (vier Dateien) importieren Routen und Fachlogik, keine
Schnittstellen-Datei; die neue Pfad-Sperre trifft sie nicht [E, Import-Zeilen].

#### Schritte 10 und 11, soweit es sich nebenbei zeigte

- **Schritt 10:** Am Ort für `getSitzung` ändert das Nachmessen nichts. Berührung nur am
  Lint-Muster: Wird es in Schritt 09 allgemein erweitert (jeder Vorsatz mit Bindestrich), gilt eine
  neue Datei wie `…-schnittstellen.ts` aus Schritt 10 ohne weitere Änderung als
  Schnittstellen-Datei; wird nur `verwaltung-` ergänzt, muss Schritt 10 das Muster noch einmal
  anfassen. Das eigene Nachmessen von Schritt 10 bleibt nötig.
- **Schritt 11, vorläufige Zuordnung der 26 Einträge [E, nach Namen und Importen, Rümpfe nicht
  gelesen]:** neun Turnier und Kategorie (`getTurniere` bis `postKategorieAbsagen`), 13
  Anmeldungs-Verwaltung der CM (`getAnmeldungen` bis `postKlassierung`), vier Gespräch. Routen: 6,
  11 und 3. `postKategorie` und `postKategorieAbsagen` nehmen die Dienste der Mitteilungen und
  melden hinfällige Anfragen; ob sie bei `turnier` bleiben, klärt das Nachmessen vor Schritt 11.

#### Frage an den Projektleiter

**F-17** steht in Abschnitt 9.1, geschärft: A, B oder C; Empfehlung A. Dazu zwei Zusätze, je mit
ja oder nein: (a) A gilt auch für `mitteilung` (Trennung in Schritt 11), damit eine Form übrig
bleibt und die Sperrliste nach Namen entfällt; (b) die Lücke «Namen in Anführungszeichen» wird in
Schritt 09 als eigener Commit geschlossen. Empfehlung je ja. Ohne Antwort startet Schritt 09 nicht.

#### Nicht geprüft, dünn belegt

- **Nichts ausgeführt:** Die Aussagen zur Bauregel (drei Formen an der Sperrliste, Namen in
  Anführungszeichen, was `turnier/` betrifft) sind an den Mustern gelesen, nicht mit einer
  gestellten Datei geprüft. Ebenso die Aussage, dass das Lint-Muster `verwaltung-schnittstellen`
  nicht trifft, und die Antworten der vier Ausnahmen.
- **TypeScript und Vite [V]:** ob das Projekt Importe mit Namen in Anführungszeichen übersetzt und
  `.js` auf `.ts` auflöst, ist nicht geprüft (D.4 nennt das zweite als gegeben).
- **Kein Entwurf gebaut:** Zeilenzahlen nach dem Umbau («rund 60», «rund 640») sind aus den
  heutigen Zeilenbereichen geschätzt. Dass die Tabelle in `bauregel.ts` alle acht Stellen ersetzt
  und `bauregel.test.ts` dabei unverändert grün bleibt, ist ein Vorschlag, kein Befund.
- **Die gemeinsame Stelle der Tests** ist nicht erprobt: dass der Routen-Test die Listen von dort
  mit den echten Funktionen bekommt (seine Aufzeichner entstehen erst in `beforeAll`), ist am
  Aufbau gelesen.
- **`turnier/schnittstellen.ts` ab Zeile 76, `gespraech/schnittstellen.ts` ab Zeile 55,
  `cm/verwaltung*.ts`:** nur Export-Zeilen und Hilfen-Namen; die Zuordnung für Schritt 11 ist
  vorläufig.
- **E2E:** `tests/e2e/anlass.test.ts` nur am Titel; welche der fünf Schnittstellen der eine Test
  abläuft, ist nicht gelesen.
- **`docs/superpowers/`:** neun Dateien nennen `admin/schnittstellen.ts`; als Geschichte geführt
  (E-15), nicht durchgesehen.
- **Nicht nachgeführt:** Die Zeile «Nächster offener Schritt» oben sagt weiter «braucht Nachmessen
  vorab», die Tabelle «Vorab nachzumessen» in 7.7 nennt Schritt 09 weiter als offen, B-37, A-18
  und D.4 sind nicht berichtigt (der Auftrag liess sonst nichts umschreiben). Erledigt ist das
  Nachmessen laut Zeile 09 und diesem Abschnitt.
- **Zum Ablauf:** Ein Edit-Werkzeug stand nicht zur Verfügung; dieses Dokument ist per Skript
  geschrieben (jede Fundstelle genau einmal ersetzt, Kopie des alten Stands im Scratchpad der
  Session). Geändert ist nur diese Datei.

### D.8 Schritt 09

**Erkenntnisse Schritt 09** (12.11.2026, Branch `refactor/schritt-09`, ab `8b844f1`)

- **Voraussetzungen geprüft:** 06a und 07 erledigt, F-17 beantwortet (E-38), Nachmessen liegt vor
  (D.7). Keine Freigabe fehlte.
- **Commits:** `c1f0022` `test:` Rechte-Schleife über alle Verwaltungs-Listen und
  `tests/hilfen/verwaltungs-listen.ts`; `ca51c35` `refactor:` Tabelle `VERWALTUNGS_DATEIEN` in
  `bauregel.ts` ohne neue Datei; `061093c` `fix:` Namen in Anführungszeichen (Zusatz 2 von E-38) und
  der Kommentar über `VERWALTUNGS_EINSTIEGE`; `4caea15` `refactor:` Lint-Muster; `3660bda`
  `refactor:` die fünf Funktionen, drei Routen, Zeile der Tabelle, Tests. Dazu dieser `docs:`-Commit.
- **Charakterisierung (erster Commit):** In der Grundprüfung ein Test «die Listen der Verwaltung haben
  62 Einträge» und die Schleife «ohne Sitzung 401 `abgemeldet`, ohne Rolle 403 `kein-admin`,
  unbestätigt 403 `unbestaetigt`, je `no-store`» über alle Listen. Ohne Rolle: ein Mitglied ohne
  Verwaltungsrolle; unbestätigt: ein Konto mit `mytco` ohne eingelösten Code (liest jeden Bereich).
  Die Ausnahmen stimmen mit D.7 Nr. 7 überein und stehen je Erwartung mit der heutigen Antwort:
  401 keine; `kein-admin` nur `admin.postAnsichtBeenden` (200 `{}`); `unbestaetigt`
  `admin.getZugang` (200 `{ bestaetigt: false, rollen: ['mytco'] }`), `admin.postZugangCode` (202
  `{}`), `admin.postZugang` (400 `falsch`), `admin.postAnsichtBeenden` (200 `{}`). Auf dem alten
  Stand grün beim ersten Lauf.
- **Rot belegt, erster Commit** (je aus einer Sicherungskopie zurückgesetzt, `git status` danach ohne
  diese Änderung): `TURNIER_SCHNITTSTELLEN` aus `VERWALTUNGS_LISTEN` genommen → Routen-Test rot
  («Routen der Verwaltung rufen nur Einträge der Verwaltungs-Listen», zuerst `POST
  /api/admin/anfragen/[id]/loeschen`), Grundprüfung 3 rot (Zählung 62, die zwei 415-Tests);
  in `mitRolle` die Zeile «unbestätigt → 403» gestrichen → die neue Schleife rot (zuerst
  `admin.getMitglieder`).
- **Tabelle der Bauregel (zweiter Commit):** `VERWALTUNGS_DATEIEN` mit `datei`, `liste` und `aussen`
  (`ordner`: der ganze Ordner `lib/server/admin` über `ADMIN_MODUL`; `namen`: Sperrliste der
  gemischten Datei; `offen`: keine Regel; im fünften Commit dazu `pfad`). Daraus entstehen die
  erlaubten Importe, das Muster der Schnittstellen, beide Meldungstexte, die Vereinigung der Listen,
  die Sperrliste und `betrifftBauregel`. Die erste Zeile (`ADMIN_SCHNITTSTELLEN`) muss es geben, jede
  andere Liste gilt wie bisher als leer, wenn sie fehlt. Geprüft: alte und neue Fassung über 5184
  gestellte Fälle (drei Routen-Arten, drei Schreibweisen des Pfads, 18 Quellen, 16 Import-Formen, mit
  und ohne Listen) ohne Unterschied im Urteil. Rot: die Zeile der Mitteilungen gestrichen → 4 Fälle
  in `bauregel.test.ts` rot, am echten Repo sechs Admin-Routen der Mitteilungen.
- **Namen in Anführungszeichen (dritter Commit):** Die Klausel darf Texte in Anführungszeichen
  enthalten, je als Ganzes bis zum schliessenden Zeichen derselben Zeile; ausserhalb davon beendet
  sie ein `;` wie bisher. So findet die Prüfung jeden Import, den sie vorher fand (5184 Fälle gegen
  den zweiten Commit ohne Unterschied), und dazu die neue Form. Ein Name ohne Escape gilt wie ohne
  Anführungszeichen (1440 Paare «mit» gegen «ohne» über Admin- und Mitglieder-Route, `import` und
  `export … from`, einfache und doppelte: gleiches Urteil). Mit Escape bleibt der Name samt
  Anführungszeichen stehen: Er passt auf keine Erlaubt-Liste, die Sperrliste der Mitteilungen meldet
  ihn mit «lässt sich nicht lesen» (in keinem der 1440 Fälle fiel dabei ein Befund weg).
  `bauregel.test.ts`: fünf Fälle (gelisteter Name gilt wie ohne; Admin-Route vier Formen;
  Mitglieder-Route vier Formen; Escape in Admin-Route und an der Sperrliste; Text in Anführungszeichen
  ausserhalb eines Imports ändert nichts). Rot: auf dem alten Stand vier der fünf Fälle (der fünfte
  ist eine Wache gegen ein zu weites Muster und war schon grün). Am echten Repo: `/api/profil` mit
  `import { 'holeAdminDienste' as h }` aus `dienste.ts` und `/api/admin/mitglieder` mit
  `import { 'erstelleDb' as e }` aus `db/index.ts` → zwei Befunde, Exit 1; mit der Bauregel des
  zweiten Commits dieselben Zeilen `bauregel: ok`. Der veraltete Kommentar über
  `VERWALTUNGS_EINSTIEGE` (D.4, «alle anderen Routen alles ausser diesen») ist berichtigt.
  **Berichtigt in der Korrekturrunde:** «So findet die Prüfung jeden Import, den sie vorher fand»
  stimmte nicht. Die 5184 Fälle enthielten keine Zeile mit ungeradem Anführungszeichen; ein
  einzelner Apostroph in einem Template- oder Regex-Literal liess die Klausel über einen echten
  Import hinweglaufen, und `matchAll` setzte dahinter fort (auf `dev` geschlossen). «Mit Escape ein
  Befund» galt nur für `\u…` und `\x…`; `\'` und `\"` im Namen machten die Zeile unsichtbar (schon
  auf `dev` offen). Beides behoben, unten.
- **Lint (vierter Commit):** `SCHNITTSTELLEN = '(?:[a-z]+-)?schnittstellen'`, Kommentar zu Ebene 3
  nachgeführt. `importrichtung.test.ts` 42 → 47: drei Meldungen (`cm` → `../anlass/verwaltung-
  schnittstellen.ts`, `admin` → über `$lib` ohne Endung, `turnier` → `export … from` mit `.js`), zwei
  erlaubte Importe (eigenes Modul; `verwaltungschnittstellen` ohne Bindestrich ist keine
  Schnittstellen-Datei). Rot: auf dem alten Muster die drei Meldungen. Kein Eintrag in `AUSNAHMEN`;
  ESLint über `src/lib/server` ohne Meldung.
- **Verschieben (fünfter Commit):** Die fünf Funktionen (45 Zeilen) stehen unverändert in der neuen
  Datei (Textvergleich des ausgeschnittenen Blocks). `ANLASS_ADMIN_SCHNITTSTELLEN` prüft mit
  `satisfies` gegen `AdminDienste` statt `MitteilungAdminDienste`, sonst hinge `anlass` an
  `mitteilung/typen.ts`. Neue Testdatei `anlass/verwaltung-schnittstellen.db.test.ts`: die zwei
  Schleifen aus `admin/schnittstellen.db.test.ts` über die neue Liste (5), 415 für die drei
  schreibenden und A-ANLASS-01 Zeichen für Zeichen; in `admin/schnittstellen.db.test.ts` 26 → 21 und
  die 415-Liste ohne die drei. In der Bauregel die Zeile mit `aussen: 'pfad'`: ausserhalb von
  `api/admin/` meldet jede Datei unter `src/routes/` einen Import der Datei einmal, mit jeder dieser Endungen
  (`.ts`, `.js`, ohne), über `$lib`, mit Anhang, auch `import()` mit festem Pfad. `bauregel.test.ts`
  45 → 50 (Admin-Route mit der Liste; 13 Formen ausserhalb; `betrifftBauregel` für die vier Dateien
  und nicht für `anlass/schnittstellen.ts`); die zwei Meldungstexte mit der Menge der Listen stehen
  dort einmal oben (`LISTEN`, `DATEIEN`). Rot: ohne die Zeile 7 Fälle rot, am echten Repo meldeten
  die drei Anlass-Routen je den Import; mit `aussen: 'offen'` statt `pfad` der Fall «ausserhalb» rot;
  am echten Repo `/api/anlaesse` mit `getAdminAnlaesse` aus `$lib/server/anlass/verwaltung-
  schnittstellen` → Befund, Exit 1. Neue Testdatei: in `getAdminAnlaesse` den Bereich `cm` statt
  `mitglieder` → «cm bekommt an ihnen 403» rot.
- **Prüfläufe:** jeder Commit mit dem Hook `check-schnell`, grün. Voller `make check` auf dem Code-Stand `3660bda`: Exit 0 (Lint; `svelte-check` 1526 Dateien ohne Fehler und Warnung; Prüfskripte samt `bauregel: ok`; Einheits- und Datenbanktests 150 Dateien mit 1926 Tests, Abdeckung 97,07 % Anweisungen, 93,56 % Zweige; beide Builds; E2E 414 bestanden, 57 übersprungen, 3,4 Minuten; Image; grüner Stand `2ed54929bcf6` gemerkt).
- **Abweichungen von D.7:**
  1. **Sechs Commits statt fünf:** Zusatz 2 als eigener Commit (E-38) nach der Tabelle, nicht im
     selben Commit.
  2. **Nicht umgesetzt: Pfad-Sperre für `turnier/schnittstellen.ts` und «Name gegen die Liste
     seiner Datei».** Der Auftrag nahm `turnier/` aus dem Schritt, und E-38 nennt die Prüfung je
     Datei nicht. `turnier/` steht mit `aussen: 'offen'` in der Tabelle; die Sperre ist dort eine
     Zeile (`offen` → `pfad`) und am echten Repo heute grün (keine Route ausserhalb von `api/admin/`
     importiert die Datei [G, Textsuche]). Admin-Routen prüfen den Namen weiter gegen die
     Vereinigung aller Listen; unter A harmlos (D.7).
  3. **`bauregel.test.ts` im Tabellen-Commit nicht ganz unverändert:** eine Erwartung, weil der Text
     «erlaubt sind nur …» jetzt die Dateien nennt statt der Ordner («anlass/» wäre mehrdeutig).
  4. **Zusatz 2 anders als in D.7 vorgeschlagen:** D.7 schlug vor, jede Klausel mit Anführungszeichen
     unter `src/routes/` zu melden. Umgesetzt ist die erste Form des Auftrags: Die Zeile gilt als
     Import und wird nach denselben Regeln beurteilt; nur ein Name mit Escape ist für sich ein
     Befund. Ob TypeScript 6 die Form übersetzt, ist weiter nicht geprüft; für die Prüfung ist es
     ohne Belang.
  5. **Schleifen je Modul bleiben,** die neue Datei hat ihre eigenen zwei (D.7 liess es offen).
  6. **Zeilen:** neue Datei 68 Zeilen (D.7: rund 60), `admin/schnittstellen.ts` 500 → 441 (die 44
     Zeilen der Funktionen, fünf Einträge der Liste, zehn Zeilen Importe).
  7. **Bestätigt:** die Ausnahmen je Erwartung (D.7 Nr. 7), keine Route ausserhalb von `api/admin/`
     und keine Testdatei unter `src/routes/` importiert die neue Datei, `admin` → `anlass` nur noch
     über `admin/mitgliedschaft.ts`, neu `anlass` → `admin/rechte.ts`; die Zählungen 36, 26 und 42
     bleiben.
- **Was kein Test sieht:**
  - dass die Zeile einer neuen Verwaltungs-Datei in `VERWALTUNGS_DATEIEN` das richtige `aussen`
    trägt: Mit `offen` wäre die Datei ausserhalb von `api/admin/` ohne Regel, und nur der Fall in
    `bauregel.test.ts` dieser Datei fiele auf (der Routen-Test fängt den Aufruf, nicht den Import);
  - eine neue Datei sieht die Bauregel am echten Repo erst, wenn sie im Git-Index steht
    (`versionierteDateien`); ungestaged meldet sie jede Admin-Route der Datei (so beim Umbau
    gesehen, Falle «nur versioniert»);
  - Namen mit Escape ausserhalb der geprüften Quellen und `export { x as 'actions' }` (unten);
  - weiter offen wie nach Schritt 07: nicht normalisierte Pfade, `import.meta.glob`,
    Weiterreichen über eine Datei unter `src/lib/` ausserhalb von `server/`.
- **Ausserhalb des Schritts aufgefallen, nicht behoben:**
  - Die Prüfung auf Form Actions (`exportiertActions`) erkennt `export { x as 'actions' }` nicht:
    gleiche Art wie Zusatz 2, aber eine andere Regel; nicht im Auftrag. Klein (Anführungszeichen vom
    Namen lösen), mit einem Fall in `bauregel.test.ts`.
  - Die `CLAUDE.md` («Tests») nennt für eine neue Liste der Verwaltung vier Stellen (Grundprüfung,
    Routen-Test, Rechte-Matrix, Bauregel); jetzt sind es zwei: `tests/hilfen/verwaltungs-listen.ts`
    und die Tabelle in `bauregel.ts`. Der Satz stimmt in der Wirkung weiter, nennt aber Dateien, die
    die Listen nicht mehr selbst führen. Vorschlag für den Projektleiter: «… kommt in
    `tests/hilfen/verwaltungs-listen.ts` und in die Tabelle der Bauregel». Nicht geändert.
  - Die Sperrliste der Mitteilungen behält ihre drei Schwächen aus D.7 (Kommentar um `as`,
    Unicode-Escape im Bezeichner, `.js` und Anhang am Pfad); sie entfällt mit Schritt 11 (E-38).
  - Die Mitglieder-Listen führt die Grundprüfung (`mitgliederDienste()`) und der Routen-Test
    (`MITGLIEDER`) weiter je von Hand; nicht Teil von B-37.
- **Für die Folgeschritte:**
  - **10:** keine Berührung; das Lint-Muster kennt jede `…-schnittstellen.ts`.
  - **11:** je neue Datei eine Zeile in `VERWALTUNGS_DATEIEN` mit `aussen: 'pfad'` und ein Eintrag in
    `VERWALTUNGS_LISTEN`; die Zeile `mitteilung/schnittstellen.ts` wechselt von `namen` zur neuen
    Datei mit `pfad`, dann entfallen `GEMISCHT` und die Sperrliste. Die Zeile `turnier/` wird
    `pfad`, sobald dort nur noch Verwaltung liegt (dann ist auch die Lücke aus D.7 zu). Die
    Meldungstexte stehen in `bauregel.test.ts` einmal oben.
  - **12:** `AUSNAHMEN` unverändert (4).

**Korrekturrunde nach dem Review** (12.11.2026, derselbe Branch ab `5710101`; Verschieben,
Rechte-Schleife, Lint und Doku «ok»)

- **Befunde des Reviews:** (M-1) Das Muster `statisch` aus `061093c` verschluckte Importe: Ein Text
  in Anführungszeichen reichte bis zum nächsten gleichen Zeichen derselben Zeile; ein einzelner
  Apostroph in einem Template- oder Regex-Literal (`` `'` ``, `/'/`) paarte falsch, ein früher
  beginnender Treffer lief über einen echten Import hinweg, und `matchAll` setzte dahinter fort.
  Offen waren so in einer Mitglieder-Route `holeAdminDienste` aus `dienste.ts`, `getMitglieder` aus
  `$lib/server/admin/schnittstellen`, ein Verwaltungsname aus `mitteilung/schnittstellen.ts` und die
  neue Pfad-Sperre, in einer Admin-Route `erstelleDb` aus `db/index.ts`; auf `origin/dev` war die
  Form zu. (M-2) `import { 'a\'b' as g, holeAdminDienste } from …` (auch mit `\"`) galt gar nicht
  als Import, schon auf `dev`; D.8 und «Ergebnis Schritt 09» behaupteten «mit Escape ein Befund».
  Hinweise: (H-1) `alleVerwaltung()` überschrieb einen doppelten Namen still; (H-2) die Pfad-Sperre
  zählte Endungen auf; (H-3) ein Kommentar in `bauregel.test.ts` stand über dem falschen `describe`;
  (H-4) der Kopfkommentar in `routen.test.ts` nannte noch `VERWALTUNG`.
- **Geändert:**
  - `7a3d1e0` `fix:` `importe()` setzt an jedem Schlüsselwort `import` und `export` einzeln an
    (Sticky-Muster) statt fortlaufend mit `matchAll`, nach dem Vorschlag des Reviewers, mit zwei
    Abweichungen von seinem Entwurf: Je Schlüsselwort gilt zuerst `import '…'`, dann die Klausel
    ohne Anführungszeichen genau wie vor Schritt 09, erst dann die mit Namen in Anführungszeichen;
    und Texte stehen in dieser nur in geschweiften Klammern oder direkt nach `as` (`export * as
    'ns' from …`). Der Entwurf liess Texte überall in der Klausel zu: Ein `import '…'` ohne
    Semikolon vor einem weiteren Import ging dann als Klausel des zweiten durch und war weg, und
    eine Zeile wie `export const a = 'x'` ohne Semikolon gab Befunde zu viel. Texte escape-fest
    (`'(?:[^'\\\n]|\\.)*'`, ebenso für `"`). Die Pfad-Sperre (H-2) nimmt den Pfad ohne Endung und
    danach alles ausser einem weiteren Zeichen des Dateinamens (`(?![\w-])`): strenger als vorher,
    eine Datei `verwaltung-schnittstellen-alt.ts` bleibt frei. H-3 erledigt. `bauregel.test.ts`
    50 → 63.
  - `cd1454e` `test:` `alleVerwaltung()` bricht bei einem Namen in zwei Listen ab (H-1); der
    Kopfkommentar in `routen.test.ts` nennt `VERWALTUNGS_LISTEN` (H-4).
- **Neue Fälle** in `bauregel.test.ts` («Text in Anführungszeichen verschluckt keinen Import»): je
  für `` `'` ``, `/'/`, `` `"` ``, `/"/` eine Mitglieder-Route mit vier Importen (`dienste.ts`,
  `admin/schnittstellen`, Verwaltungsname der Mitteilungen, `anlass/verwaltung-schnittstellen.ts`)
  und eine Admin-Route mit `erstelleDb` aus `db/index.ts`, je zwischen zwei solchen Literalen und
  vor einem weiteren `export … from`; `'a\'b'` und `"a\"b"` als Name neben `holeAdminDienste`;
  `export * as 'ns' from` aus `dienste.ts`; `import '…admin/rollen.ts'` ohne Semikolon vor einem
  weiteren Import. Bei der Pfad-Sperre `.mjs`, `.d.ts`, `#a` und die freie Datei
  `verwaltung-schnittstellen-alt.ts`.
- **Rot belegt:** dieselbe Testdatei gegen `bauregel.ts` aus `5710101` (dann zurückgesetzt): 12
  Tests rot (die acht Literal-Fälle, die zwei Escape-Namen, «ohne Semikolon», die Pfad-Sperre mit
  `.mjs`); der Fall `export * as 'ns'` ist gegen `5710101` grün (dort durfte ein Text überall in der
  Klausel stehen), auf `dev` offen und war gegen den Zwischenstand dieser Runde rot (Texte nur in
  Klammern): darum die Ausnahme «direkt nach `as`». H-1:
  `getAdminAnlaesse` zusätzlich in einer zweiten Liste → Rechte-Matrix 2 Tests rot mit «steht in
  zwei Listen der Verwaltung».
- **Nirgends lockerer als `dev`:** mit den Skripten des Reviewers gegen eine Kopie von
  `origin/dev` (`bauregel.ts` mit `origin/dev` verglichen, gleich): 1 049 760 gestellte Fälle (fünf
  Arten von Routen, vier Schreibweisen des Pfads, zwölf Quellen, sechs Endungen, neun Namen, 27
  Formen, drei Arten der Listen) mit **keiner** Abweichung im Urteil und keinem Befund von `dev`, der
  fehlt; 37 Angriffsformen (Verschlucken, Anführungszeichen, Escape) alle zu, die vier guten Formen
  ohne Befund; die neue Pfad-Sperre über acht Präfixe und 17 Endungen gleich wie `lib/server/admin`;
  die 164 echten Dateien ohne Befund. Eigener Vergleich: 1440 Paare mit und ohne Anführungszeichen
  gleich. Am echten Repo `bauregel: ok`.
- **Was weiter kein Test sieht:** Text in Anführungszeichen ausserhalb von Klammern und ausser nach
  `as` beginnt keine Klausel; eine Form, die das braucht, gibt es in gültigem Code nicht. Weiter
  offen wie vorher: nicht normalisierte Pfade, `import.meta.glob`, Weiterreichen über `src/lib/`
  ausserhalb von `server/`, die Sperrliste der Mitteilungen (Schritt 11), `export { x as 'actions' }`.
- **Ausserhalb des Schritts aufgefallen, nicht behoben:** Ein Lauf von `make check` auf `6ef22fa`
  (nur Doku dazu) brach im Datenbanktest `src/lib/server/db/schema.db.test.ts` («FR-34: Geschlecht
  und Status ausserhalb der Werte werden abgewiesen») mit `turnier_jahr_unique` ab: Das Jahr 8504
  gab es schon. Mehrere Testdateien legen Turniere mit einem zufälligen Jahr in derselben
  Test-Datenbank an (`schema.db.test.ts` 3000 bis 92999, neun weitere Dateien mit zehn Stellen 3000 bis 8999 [G, vom Reviewer gezählt;
  Textsuche]); trifft es dasselbe Jahr, scheitert einer. Seltener Flake ohne Bezug zu Schritt 09
  (Datei unverändert); Abhilfe wäre ein eigener Bereich je Datei oder ein Jahr aus einer Folge.
- **Prüfläufe:** jeder Commit mit dem Hook `check-schnell`, grün. Voller `make check` auf dem Code-Endstand `cd1454e`: Exit 0 (Lint; `svelte-check` 1526 Dateien ohne Fehler und Warnung; Prüfskripte samt `bauregel: ok`; Einheits- und Datenbanktests 150 Dateien mit 1939 Tests, Abdeckung 97,07 % Anweisungen, 93,56 % Zweige; beide Builds; E2E 414 bestanden, 57 übersprungen, 3,5 Minuten; Image; grüner Stand `78ff7ecad0b2` gemerkt).
- **Zweites Review (12.11.2026): «ok», kein Befund vor dem Merge.** Der Reviewer hat mit eigenen
  Skripten gegen `origin/dev` verglichen (1 049 760 gestellte Fälle, 0 Abweichungen im Urteil), dazu
  32 Importformen in 26 Umfeldern gegen die neue Bauart: in keinem Fall lockerer als `dev`. Die
  Pfad-Sperre fängt alles, was der Ordner-Schutz von `admin/` fängt. Der Flake ist richtig
  eingeordnet (Schritt 09 legt kein zusätzliches Turnier an); er steht in `docs/beobachtungen.md`.
- **Was weiter kein Test sieht (Rest von Zusatz 2, Hinweis des Reviews):** `ohneKommentare` in
  `scripts/pruefungen/bauregel.ts` entfernt einen Zeilenkommentar direkt hinter einem
  Anführungszeichen nicht; ein mehrzeiliger Import mit `'holeAdminDienste'// it's` und `as h` auf der
  nächsten Zeile bleibt ohne Befund. Das war auf `dev` schon so; Prettier schreibt die Zeile um.
- **Vorschlag für die `CLAUDE.md`, «Tests» (nicht eingespielt, Entscheid des Projektleiters):** «Eine
  neue Liste der Verwaltung kommt in `tests/hilfen/verwaltungs-listen.ts` und in die Tabelle der
  Bauregel.» Der heutige Satz nennt vier Stellen, an denen seit Schritt 09 nichts mehr einzutragen
  ist.

### D.9 Nachmessen Schritt 10

**Nachmessen Schritt 10** (12.11.2026, Worktree `refactor-schritt-10`, Stand `dev` nach Schritt 09,
`80d7c5a`, Version 0.20.14)

Am Code gelesen und gezählt, **nichts ausgeführt** (kein Test, kein Lint, kein Build, keine
Datenbank). Server-Dateien unter `src/lib/server/`, wenn nichts anderes steht.

- **Ganz gelesen [G]:** `login/schnittstellen.ts`, `admin/rollen.ts`, `dienste.ts`, `http.ts`,
  `eslint.config.js`, `scripts/importrichtung.test.ts`, `scripts/pruefungen/bauregel.ts`,
  `src/routes/api/sitzung/+server.ts` (dazu `/api/status`, `/api/kontakt`), `src/hooks.server.ts`,
  `src/app.d.ts`, die vier Ladefunktionen und `src/lib/login/sitzung.ts`, die Projekt-`CLAUDE.md`.
- **In Auszügen [G für die Stelle]:** `routen.test.ts` (1 bis 140, 150 bis 200, 270 bis 407),
  `grundpruefung.db.test.ts` (60 bis 110), `login/sitzung.ts` (1 bis 80), `login/schnittstellen.db.test.ts`
  (215 bis 300), die Stellen mit `getSitzung` in vier weiteren Testdateien, `profil/schnittstellen.ts`
  (1 bis 25), `tests/e2e/bewegung.test.ts` (78 bis 100), `docs/context-scopes.md` (Zeile 14),
  `docs/arc42.md` (Zeile 80), `vitest.config.ts` (Abdeckung).
- **Nur per Textsuche [E]:** jede Nennung von `getSitzung`, `/api/sitzung`, `AnsichtRolle` und
  `ANSICHT_ROLLEN` in `src/`, `tests/`, `scripts/` und `docs/`.

#### Ergebnis in Kürze

- **Ort: ein neues Modul `sitzung/` mit der einen Datei `sitzung/schnittstellen.ts`.** `getSitzung`
  zieht Zeichen für Zeichen dorthin, samt Signatur. Kein bestehender Ort trägt sie ohne neue
  Ausnahme oder ohne Umbau (Tabelle unten).
- **`AUSNAHMEN` 4 → 1, keine neue.** Übrig bleibt `turnier/schnittstellen.ts` →
  `gespraech/schnittstellen.ts` (Schritt 11).
- **Bauregel unverändert, Lint bekommt einen Eintrag** (`THEMEN`). Die Route ändert eine
  Import-Zeile; Adresse, Dienste und Antwort bleiben. Für die Nutzerin ändert sich nichts.
- **Kein Entscheid des Projektleiters nötig.** Zeile 10 stimmt im Kern; sieben kleine Abweichungen
  (unten), die grösste: Die Tests «ziehen» nicht «mit», fünf Testdateien ändern ihren Import.

#### `getSitzung` heute [G]

- **Wo:** `login/schnittstellen.ts`, Zeilen 62 bis 82 (18 Zeilen Rumpf, drei Zeilen Kommentar).
  Signatur `getSitzung(e, db, jetzt = () => new Date())`: die Anfrage zuerst, dann die Datenbank,
  die Zeit als dritter Wert mit Vorgabe. Jede andere Schnittstelle hat `(d, e)`.
- **Was sie liest:** `e.locals.konto` (legt der Hook hinein); `verwaltungsrollen(db, kontoId)` und
  `effektiveRollen(…, konto.ansicht)` aus `admin/rollen.ts`; nur wenn `cm` unter den wirksamen
  Rollen ist, `offeneGespraecheGesamt(db, jetzt())` aus `gespraech/gespraech.ts`; `abgemeldet`,
  `antwort`, `Ereignis` aus `http.ts`; den Typ `Db`. **Aus `login` selbst braucht sie nichts**
  (weder `LoginDienst` noch `sitzung.ts`); `profil`, `mitteilung` und `cm` importiert sie nicht.
- **Was sie antwortet:** ohne Sitzung 401 `{ fehler: 'abgemeldet' }` (seit Schritt 08); sonst 200
  mit `vorname`, `rufname`, `passkeyHinweis`, `verwaltung`, `ansicht`, `nachrichtenOffen`. Nie
  `mitgliedId` oder `sitzungHash`.
- **Ausnahmen, die an ihr hängen:** zwei (`login/schnittstellen.ts` → `admin/rollen.ts` und →
  `gespraech/gespraech.ts`). Die dritte für Schritt 10 hängt nicht an ihr, sondern am Typ:
  `login/sitzung.ts` → `admin/rollen.ts` (`AnsichtRolle` für `AngemeldetesKonto.ansicht` und eine
  SQL-Spalte in `pruefeSitzung`).
- **Route:** `src/routes/api/sitzung/+server.ts`, `GET: (e) => getSitzung(e, holeDb())`. `holeDb`
  kommt direkt aus `db/index.ts`, nicht aus `dienste.ts`; die Zeit reicht die Route nicht hinein,
  im Betrieb gilt die Vorgabe `new Date()`.
- **Wer die Antwort liest (fünf Abrufe, alle über `fetch('/api/sitzung')`):**

  | Stelle | Liest |
  |--------|-------|
  | `src/routes/+layout.ts` | bei 200 das Feld `ansicht` (Band «Ansicht als …») |
  | `src/routes/+page.ts` | 401 → Umleitung; bei 200 `vorname`, `rufname`, `passkeyHinweis`, `verwaltung`, `nachrichtenOffen` |
  | `src/routes/profil/+page.ts`, `profil/email/+page.ts` | nur den Status (401, nicht ok) |
  | `src/lib/login/sitzung.ts` → `hatSitzung` (für `hilfe/+page.ts`, `datenschutz/+page.ts`) | nur `ok` |

  Kein Abruf-Modul, kein gemeinsamer Typ für die Antwort: `+page.ts` und `+layout.ts` schreiben die
  Felder je selbst hin (B-29; Schritte 13 und 15).

#### Tests [G]

| Datei | Aufrufe | Hält fest |
|-------|--------:|-----------|
| `login/schnittstellen.db.test.ts` (Block «GET /api/sitzung», dazu Logout) | 4 | 401 mit Körper und `no-store`; 200 mit allen sechs Feldern; 401 nach `beendeAlleSitzungen` und nach Logout |
| `login/passkey-schnittstellen.db.test.ts` | 2 | `passkeyHinweis` vor und nach `postHinweis` |
| `admin/schnittstellen.db.test.ts` (RR-07, zwei Tests) | 4 | alle sechs Felder für einen Admin; `verwaltung` je Rolle; 401 (nur Status) |
| `admin/ansicht.db.test.ts` | 3 | alle sechs Felder vor und in der Ansicht; `lizenz` öffnet nicht |
| `gespraech/schnittstellen.db.test.ts` (FR-52) | 1 | `nachrichtenOffen` nur mit wirksamer Rolle `cm`; einzige Stelle, die `jetzt` hineinreicht |

- **Routen-Test:** `ROUTEN['/api/sitzung'] = { GET: [getSitzung, 'db'] }`, dazu `OHNE_LISTE`. Er
  ersetzt die Funktionen jeder Datei, die auf `schnittstellen.ts` endet; eine Datei
  `sitzung/schnittstellen.ts` erfasst er ohne Änderung am Muster.
- **Grundprüfung:** `getSitzung` kommt nicht vor (keine Liste). Das 401 prüfen zwei Tests, einer
  mit Körper; die Lücke aus B-30 besteht für sie also nicht.
- **E2E:** Eine Stelle nennt die Adresse (`tests/e2e/bewegung.test.ts:88`, verzögert die Antwort,
  B-31 Nr. 1). Mittelbar läuft jeder Test mit Anmeldung über sie (Startseite, Layout).
- **Was beim Verschieben mitzieht:** nichts ausser Import-Zeilen. Die fünf Testdateien und
  `routen.test.ts` ändern je den Pfad; der Block «GET /api/sitzung» kann in der Login-Testdatei
  bleiben (er braucht deren Hilfen `meldeAn` und `ladeSitzung`; Tests sind von der Richtungsregel
  ausgenommen). Die Abdeckung gilt über alles, nicht je Datei.

#### Der Ort: Kandidaten

| Kandidat | Lint | Bauregel, Routen-Test | Urteil |
|----------|------|-----------------------|--------|
| **Neues Modul `sitzung/schnittstellen.ts`** | `sitzung` in `THEMEN`; ein Thema darf die Fachlogik anderer Themen importieren (`admin/rollen.ts`, `gespraech/gespraech.ts`), nur nicht deren Schnittstellen-Dateien. Keine Ausnahme. `login` darf `sitzung/` nicht importieren (richtig so) | Bauregel kennt den Ordner nicht und sperrt nichts; Routen-Test erfasst die Datei | **empfohlen** |
| Bestehendes Thema `profil/schnittstellen.ts` | erlaubt (`profil` importiert `admin` schon sechsmal); neu `profil` → `gespraech` | ginge | fachlich schief: Die Antwort speist Startseite, Band und Navigation, nicht das Profil. Die Signatur passte nicht zu `PROFIL_SCHNITTSTELLEN`; mit `holeProfilDienste` baute die Route beim ersten Aufruf den E-Mail-Wechsel samt Versender |
| Bestehendes Thema `gespraech/` oder `cm/` | erlaubt | ginge | fachlich falsch; die Zahl der offenen Gespräche ist ein Feld von sechs |
| `admin/` | erlaubt | **Bauregel verbietet es:** Keine Route ausserhalb von `api/admin/` importiert `lib/server/admin` (`ADMIN_MODUL`) | scheidet aus |
| Datei direkt unter `src/lib/server/` | Schicht «importieren nur `db`»: zwei neue Ausnahmen | – | scheidet aus |
| In `dienste.ts` selbst | – | der Routen-Test ersetzt sie nicht («0 Aufrufe»); die Erlaubt-Liste `MITGLIEDER_EINSTIEGE` nähme eine Schnittstelle auf; die Übergangsregel sieht dort nur Dienste | scheidet aus |
| `getSitzung` bleibt in `login`, `dienste.ts` reicht ihr einen Dienst (Rollen, offene Gespräche) | keine Ausnahme | neuer Einstieg in `MITGLIEDER_EINSTIEGE` und `EINSTIEGE`; Schutz der Bauregel geändert (A-18) | mehr Umbau als Verschieben; die Regel «welche Rolle zählt, nur `cm` sieht die Zahl» stünde im Zusammenbau oder bräuchte doch ein Modul |

- **Begründung der Empfehlung:** Die Funktion setzt drei Themen zusammen (Sitzung aus `login`,
  Rollen aus `admin`, Gespräche aus `gespraech`) und gehört darum über alle drei, aber als
  Schnittstelle unter die Routen. Genau das ist ein eigenes Thema. Es ist reines Verschieben: 21
  Zeilen und vier Import-Zeilen, kein Zeichen im Rumpf.
- **Der Name ist ein Arbeitstitel.** `sitzung/` entspricht der Adresse `/api/sitzung`. Schwäche:
  Es gibt schon `login/sitzung.ts` (Speicher und Prüfung der Sitzung) und `src/lib/login/sitzung.ts`
  (Oberfläche). Ein Kopfkommentar in der neuen Datei sollte sagen, dass hier nur die Antwort an die
  Oberfläche entsteht und die Sitzung selbst in `login/` lebt. Kein Entscheid, der Implementer darf
  einen treffenderen Namen wählen, solange die Datei auf `schnittstellen.ts` endet.
- **Auf Ordner-Ebene:** `login` → `admin` (2) und `login` → `gespraech` (1) fallen weg; neu
  `sitzung` → `admin`, `sitzung` → `gespraech`, `admin` → `login` (für den Typ, gab es schon).

#### Dienste und Liste: bleibt, wie es ist

- **Die Route reicht weiter `holeDb()`.** Die Bauregel der `CLAUDE.md` («ruft genau eine
  Schnittstellen-Funktion und reicht ihr die Dienste») ist erfüllt; die Übergangsregel «Ab Schritt
  07» betrifft `holeDb` nicht (es liegt in `db/`, D.3). `MITGLIEDER_EINSTIEGE` wird nicht berührt,
  weil die Route `dienste.ts` nicht importiert.
- **`getSitzung` bleibt in `OHNE_LISTE`.** Eine Liste mit einem Eintrag bräuchte die Signatur
  `(d, e)`, einen Dienst-Typ, einen neunten Einstieg in `dienste.ts`, einen Namen mehr in der
  Erlaubt-Liste der Bauregel und 14 geänderte Aufrufe in den Tests. Gewonnen wäre ein 401 in der
  Grundprüfung, das zwei Tests schon halten.
- **Nicht Teil des Schritts, als Stand festgehalten:** (1) Zielbild 6.1 Punkt 2 («die Routen holen
  ihre Dienste nur von dort») gilt weiter für 87 von 90 Routen; `/api/sitzung`, `/api/status` und
  `/api/kontakt` bleiben daneben. (2) Die Vorgabe `() => new Date()` in der Signatur steht in einer
  Schnittstellen-Funktion; die Regel «Zeit über die Dienste» erfüllt sie nur der Form nach (wie
  `jetzt` in `http.ts`, das dieselbe Vorgabe hat). Beides wäre ein eigener, kleiner Umbau nach
  Schritt 12 und ist kein Fehler im Verhalten.

#### `AnsichtRolle` [G]

- **Empfehlung: `login/sitzung.ts`, nicht `db/`.** Dort steht `AngemeldetesKonto.ansicht`, das Feld,
  das den Typ braucht; `db/schema.ts` führt die vier Werte nur als Text in der Prüfung
  `sitzung_ansicht_rolle_check`.
- **Die Konstante muss mit:** `AnsichtRolle` ist aus `ANSICHT_ROLLEN` abgeleitet, und
  `istAnsichtRolle` (bleibt in `admin/rollen.ts`) braucht die Konstante. Also ziehen Konstante und
  Typ; `admin/rollen.ts` importiert sie aus `login/sitzung.ts` und reicht beide weiter.
- **Mit dem Weiterreichen bleibt alles andere unverändert:** `admin/auskunft.ts`, `admin/ansicht.ts`,
  `admin/schnittstellen.ts` und in der Oberfläche `src/lib/verwaltung/api.ts` und `rollen-namen.ts`
  (beide holen den Typ aus `server/admin/rollen.ts`).
- **Richtung:** `admin` → `login/sitzung.ts` ist erlaubt (keine Schnittstellen-Datei); danach
  importiert in `login/` keine Datei mehr ein Thema.

#### Was sich an Lint, Bauregel und Tests ändert

- **`eslint.config.js`:** `THEMEN` um `sitzung` ergänzt (damit auch `MODULE`); die drei Einträge
  für Schritt 10 aus `AUSNAHMEN` gestrichen. Das Muster `SCHNITTSTELLEN` passt schon.
- **`scripts/importrichtung.test.ts`, zwei Stellen statt der einen aus den Hinweisen:**
  1. «eine Ausnahme gibt nur ihre Datei und ihr Ziel frei» (Zeilen 99 bis 110) rechnet mit der
     Ausnahme `login/sitzung.ts` → `admin/rollen.ts` und wird rot. Vorschlag: eine gestellte
     Ausnahme über `baueImportrichtung([…])` in einem eigenen `ESLint`, wie es der Test «ist noch
     nötig» schon baut; das hält auch, wenn Schritt 12 die Liste leert.
  2. Der Fall `['login/sitzung.ts', "… '../dienste.ts'"]` (Zeile 73) steht für «auch eine Datei mit
     Ausnahme darf `dienste.ts` nicht importieren». Er bleibt grün, prüft aber nach dem Schritt
     keine Datei mit Ausnahme mehr; auf die gestellte Ausnahme umstellen oder bis Schritt 11 auf
     `turnier/schnittstellen.ts`.
  Der Wächter «genau die Ordner» folgt `MODULE` von selbst. Ein neuer Fall «`login/neu.ts`
  importiert `../sitzung/schnittstellen.ts`» ist sinnvoll, einmal rot.
- **Die Lint-Probe ist das Netz für die Ausnahmen:** «Ausnahme … ist noch nötig» wird rot, solange
  ein Eintrag steht, dessen Import weg ist; Lint wird rot, solange ein Import steht, dessen Eintrag
  weg ist.
- **`scripts/pruefungen/bauregel.ts` und `bauregel.test.ts`:** keine Änderung. Der Fall «gilt nur
  unter `api/admin`» benutzt den Pfad der Route mit `holeDb` und bleibt richtig.
- **`routen.test.ts`:** eine Import-Zeile; `ROUTEN`, `EINSTIEGE`, `OHNE_LISTE` unverändert.
- **`login/schnittstellen.ts`:** verliert `getSitzung` und drei Import-Zeilen (`Db`, `gespraech`,
  `admin`); `abgemeldet` braucht die Datei danach nicht mehr.
- **Doku:** `docs/context-scopes.md` (Zeile «Login und Sitzung») und `docs/arc42.md` (Zeile 80,
  Liste der Fachmodule) nennen den neuen Ordner noch nicht.

#### Abweichungen vom Plan

1. **Dateien, es fehlt:** die neue Datei; `THEMEN` neben `AUSNAHMEN`; `routen.test.ts`; die zwei
   Doku-Dateien. In Zeile 10 ergänzt.
2. **Absicherung «`login/schnittstellen.db.test.ts` (zieht mit)»:** Fünf Testdateien rufen
   `getSitzung` (14 Aufrufe); keine muss umziehen. In Zeile 10 ergänzt. Dieselbe Formulierung steht
   in «Was das Netz für die Etappe 1 deckt», dort nicht geändert.
3. **Hinweis «ihr 401 prüft nur ihr eigener Test»:** zwei Tests (Login mit Körper, Verwaltung nur
   Status).
4. **Hinweis zu `importrichtung.test.ts`:** zwei Fälle hängen an der Ausnahme, nicht einer.
5. **Ziel «(`login/` oder `db/`)»:** `login/sitzung.ts`, und die Konstante zieht mit dem Typ.
6. **Modell:** Die Bedingung «solange das Ziel nicht feststeht» ist erfüllt; nach dem Wortlaut
   genügt Sonnet. Der Schritt ist Verschieben plus zwei Testfälle der Lint-Regel.
7. **B-14 «`login` → `admin`»:** zählt zwei Dateien; nur eine davon ist `getSitzung`.

Sonst stimmt Zeile 10: Risiko niedrig, Voraussetzung 06, drei Ausnahmen, Route und `OHNE_LISTE`.
Der Schritt streicht keine Zeile der Bauregel und ändert keinen Schutz (anders als 07, 09, 11).

#### Was sich für die Nutzerin ändert

Nichts. Adresse, Methode, Status, Körper und Kopfzeilen bleiben; kein Baustein der Oberfläche wird
angefasst.

#### Vorschlag für den Schnitt

1. `refactor:` `ANSICHT_ROLLEN` und `AnsichtRolle` nach `login/sitzung.ts`, `admin/rollen.ts` reicht
   sie weiter; Ausnahme `login/sitzung.ts` → `admin/rollen.ts` gestrichen; die zwei Fälle in
   `importrichtung.test.ts` umgestellt.
2. `refactor:` `getSitzung` nach `sitzung/schnittstellen.ts`; `THEMEN`; Route, `routen.test.ts` und
   fünf Testdateien an der Import-Zeile; zwei Ausnahmen gestrichen; neuer Lint-Fall.
3. `docs:` Context-Scopes, arc42, dieses Dokument.

Kein Charakterisierungstest vorab: Körper, Status und Kopfzeile sind in fünf Dateien festgehalten.

#### Frage an den Projektleiter

Keine. Der Ort folgt aus Lint-Regel und Bauregel; Verhalten, Schutz und Abhängigkeiten nach aussen
bleiben. In 9.1 ist nichts eingetragen.

#### Nicht geprüft, dünn belegt

- **Nichts ausgeführt:** Dass ein Thema `sitzung` mit den vier Importen ohne Meldung durch den Lint
  geht und dass der Routen-Test die neue Datei erfasst, ist an den Mustern gelesen. Ebenso, dass
  die zwei Fälle in `importrichtung.test.ts` so reagieren wie beschrieben.
- **Weiterreichen des Typs [V]:** dass `admin/rollen.ts` Konstante und Typ aus `login/sitzung.ts`
  weiterreichen kann, ohne dass `svelte-check` oder der Build der Oberfläche etwas meldet, ist
  nicht erprobt (`rollen-namen.ts` und `verwaltung/api.ts` holen nur den Typ).
- **Leser der Antwort nur per Textsuche:** Ein Abruf mit zusammengesetzter Adresse fiele nicht auf.
  E2E-Hilfen unter `tests/e2e/hilfen/` sind nicht gelesen.
- **Prüfskripte der Doku:** ob `make docs` oder ein Prüfskript auf einen neuen Ordner unter
  `src/lib/server/` reagiert, ist nicht geprüft; `docs/superpowers/` nicht durchgesehen (E-15).
- **Stand des Worktrees:** an den vier Einträgen in `AUSNAHMEN` und am Lint-Muster aus Schritt 09
  erkannt, nicht über Git im Worktree abgefragt.
- **Nicht nachgeführt:** Die Zeile «Nächster offener Schritt» oben sagt weiter «braucht das kurze
  Nachmessen»; die Zeile 10 in «Was das Netz für die Etappe 1 deckt», B-14 und die älteren Hinweise
  zu Schritt 10 sind nicht berichtigt (der Auftrag liess sonst nichts umschreiben). **Nachgeführt
  in Schritt 10 (D.10):** «Nächster offener Schritt», die Zeile 10 in «Was das Netz deckt», B-14
  und die zwei älteren Hinweise zu Schritt 10.
- **Zum Ablauf:** Ein Edit-Werkzeug stand nicht zur Verfügung; dieses Dokument ist per Skript
  geschrieben (jede Fundstelle genau einmal ersetzt, Kopie des alten Stands im Scratchpad der
  Session). Geändert ist nur diese Datei.

### D.10 Schritt 10

**Erkenntnisse Schritt 10** (12.11.2026, Branch `refactor/schritt-10`, ab `191b548` = `origin/dev`
`80d7c5a` plus das Nachmessen D.9)

- **Voraussetzungen geprüft:** 06 erledigt, Nachmessen liegt vor (D.9), kein Entscheid des
  Projektleiters nötig (E-40: ohne Halt). Keine Freigabe fehlte; keine neue Abhängigkeit.
- **Commits:** `99d6bb2` `test:` die zwei Fälle mit Datei-Ausnahme gegen eine gestellte Ausnahme;
  `1958575` `refactor:` `ANSICHT_ROLLEN` und `AnsichtRolle` nach `login/sitzung.ts`, Ausnahme
  `login/sitzung.ts` → `admin/rollen.ts` gestrichen; `2b4035f` `refactor:` `getSitzung` nach
  `sitzung/schnittstellen.ts`, `THEMEN`, Route, `routen.test.ts` und fünf Testdateien an der
  Import-Zeile, zwei Ausnahmen gestrichen, neue Lint-Fälle; `1878907` `docs:` Context-Scopes und
  arc42. Dazu dieser `docs:`-Commit.
- **Verschieben:** Der Block «Kommentar RR-07 bis Ende von `getSitzung`» (21 Zeilen) ist per Skript
  aus `login/schnittstellen.ts` ausgeschnitten und unverändert in die neue Datei gesetzt; die
  Gegenprobe «Block steht Zeichen für Zeichen in der neuen Datei» lief im selben Skript. Die neue
  Datei hat vier Import-Zeilen (`Db`, `offeneGespraecheGesamt`, `effektiveRollen` und
  `verwaltungsrollen`, `abgemeldet`/`antwort`/`Ereignis`); `login/schnittstellen.ts` verliert drei
  Import-Zeilen und `abgemeldet`. `ANSICHT_ROLLEN` und `AnsichtRolle` ziehen samt Kommentar;
  `admin/rollen.ts` importiert beide und reicht sie mit `export { ANSICHT_ROLLEN, type AnsichtRolle }`
  weiter, `istAnsichtRolle` und `effektiveRollen` bleiben.
- **Weiterreichen hält:** `svelte-check` (1527 Dateien, 0 Fehler, 0 Warnungen), `npm run build` und
  `npm run build:spa` grün; `src/lib/verwaltung/api.ts` und `rollen-namen.ts` holen den Typ weiter
  aus `server/admin/rollen.ts` (nur `import type`, im Build ohne Wirkung).
- **Rot belegt** (je aus einer Sicherungskopie im Scratchpad zurückgesetzt, `git status` danach ohne
  diese Änderung):
  1. *Gestellte Ausnahme (erster Commit):* In `baueImportrichtung` die Blöcke für Dateien mit Ausnahme
     ohne Regel (`rules: {}`) → 4 rot: die zwei umgestellten Fälle und die zwei Proben
     «Ausnahme `login/schnittstellen.ts` → … ist noch nötig». Auf dem alten Stand vor dem Umstellen
     47 grün, danach 47 grün.
  2. *`login` importiert wieder `admin/rollen.ts`:* nach dem zweiten Commit in `login/sitzung.ts`
     `import type { Rolle } from '../admin/rollen.ts'` → ESLint `no-restricted-imports` «login
     importiert kein Thema», Exit 1; nach dem dritten Commit in `login/schnittstellen.ts` die Importe
     aus `admin/rollen.ts` und `gespraech/gespraech.ts` → zwei Meldungen derselben Ebene.
  3. *Ein Thema importiert `sitzung/schnittstellen.ts`:* in `profil/schnittstellen.ts`
     `import { getSitzung } from '../sitzung/schnittstellen.ts'` → «ein Thema importiert nicht die
     Schnittstellen eines anderen Moduls».
  4. *Ausnahme stehen gelassen:* `login/schnittstellen.ts` → `admin/rollen.ts` wieder in `AUSNAHMEN`
     → «Ausnahme … ist noch nötig» rot («importiert admin/rollen.ts nicht mehr: Ausnahme streichen»).
  5. *Neue Fälle:* `sitzung` aus `THEMEN` genommen → 4 rot: die drei neuen Meldungen (`login` und
     `anlass` → `../sitzung/schnittstellen.ts`, `sitzung` → `../admin/schnittstellen.ts`) und «genau
     die Ordner unter `src/lib/server/`».
- **Abweichungen von D.9:**
  1. *Vier Code-Commits statt zwei:* Die Umstellung der zwei Lint-Fälle steht als eigener `test:`-
     Commit vor der Änderung (grün auf dem alten Stand), Context-Scopes und arc42 als eigener
     `docs:`-Commit vor dem Prüflauf. Inhalt wie im Vorschlag.
  2. *Gestellte Ausnahme mit erfundener Datei:* `login/gestellt.ts` → `admin/rollen.ts` statt der
     echten Datei `login/sitzung.ts`; so liest kein Fall eine echte Datei als «mit Ausnahme». Der Bau
     des ESLint für eine Liste von Ausnahmen ist eine Hilfe `mitAusnahmen` (auch die Probe «ist noch
     nötig» nutzt sie, Verhalten gleich).
  3. *Sechs neue Lint-Fälle statt einem:* gemeldet `login` und `anlass` → `sitzung/schnittstellen.ts`
     und `sitzung` → `admin/schnittstellen.ts`; zugelassen `sitzung` → `admin/rollen.ts`,
     `gespraech/gespraech.ts`, `login/sitzung.ts`. Der Auftrag verlangte beide Richtungen.
  4. *Import-Zeilen in den Tests:* In `login/schnittstellen.db.test.ts` und `admin/ansicht.db.test.ts`
     teilt sich der eine Import in zwei (Login-Funktionen und `getSitzung`); in
     `passkey-schnittstellen.db.test.ts` steht die Zeile bei den Importen aus `../`. Keine Erwartung
     geändert.
  Sonst wie D.9: `bauregel.ts` und `bauregel.test.ts` unverändert, `routen.test.ts` nur der Import,
  `CLAUDE.md` unverändert.
- **Prüfläufe:** jeder Commit mit dem Hook `check-schnell`, grün. Voller `make check` auf dem Code-Endstand `1878907` (Code wie `2b4035f`, dazu nur die zwei Doku-Zeilen): **erster Lauf Exit 2**, alles grün bis auf E2E mit 3 rot, 411 bestanden, 57 übersprungen, 5,9 Minuten; rot waren drei Tests ohne Bezug zu `/api/sitzung`, je auf einem Gerät und auf den zwei anderen grün (`cm-doppel-verwaltung.test.ts` FR-48 auf Android, Trefferliste leer; `passkey.test.ts` A-LOGIN-07 auf Android, Zeitgrenze beim Klick auf «Anmelden mit Passkey»; `mitgliedschaft.test.ts` RR-10 auf Desktop, Zähler der Mitgliederliste leer). Zur selben Zeit lief im Worktree `fragen-2026-11-12` einer anderen Session ein E2E-Lauf (Last um 53); das passt zu B-10, nicht zum Schritt. Den Flake in `schema.db.test.ts` gab es in keinem Lauf. **Zweiter Lauf nach dem Ende des fremden Laufs, unverändert: Exit 0** (Lint; `svelte-check` 1527 Dateien ohne Fehler und Warnung; Prüfskripte samt `bauregel: ok`; Einheits- und Datenbanktests 150 Dateien mit 1942 Tests, Abdeckung 97,07 % Anweisungen, 93,56 % Zweige; beide Builds; E2E 414 bestanden, 57 übersprungen, 3,5 Minuten; Image; grüner Stand `d8f277ba89b9` gemerkt). Gegen Schritt 09 (1939 Tests): +3 aus `importrichtung.test.ts` (47 → 50).
- **Was kein Test sieht:** Dass der Kopfkommentar der neuen Datei stimmt; dass `admin/rollen.ts` Liste
  und Typ weiterreicht, hält nur der Typprüfer fest (ein Wegfall machte `svelte-check` rot, kein
  Test). Weiter wie vorher: Die Grundprüfung kennt `getSitzung` nicht (keine Liste), der Routen-Test
  prüft Funktion und Einstieg `db`, nicht dass die Zeit nicht hineingereicht wird.
- **Ausserhalb des Schritts aufgefallen, nicht behoben:** Die Pläne unter `docs/superpowers/plans/`
  nennen `getSitzung` und `AnsichtRolle` weiter an den alten Orten; sie sind historisch (E-15) und
  bleiben. Kein weiterer Befund.
- **Review (12.11.2026): «ok», kein Befund vor dem Merge.** Eigener voller `make check` des
  Reviewers auf `a2eea9b` bei ruhiger Maschine: Exit 0, 150 Dateien mit 1942 Tests, E2E 414
  bestanden und 57 übersprungen. `getSitzung` ist zeichengleich verschoben, kein Zyklus beim Laden,
  `AUSNAHMEN` hat genau einen Eintrag. Zu den drei roten E2E-Tests des ersten Laufs, genauer als
  oben: Sie laufen wie jeder angemeldete Test mittelbar über `/api/sitzung`, haben aber keinen Bezug
  zur Änderung; die Abbruchstellen liegen hinter der Anmeldung und passen zu Last (B-10), und zwei
  volle Läufe auf demselben Code sind grün.
- **Hinweis des Reviews für Schritt 12:** Die gestellte Ausnahme in `scripts/importrichtung.test.ts`
  deckt nur eine Datei in `login` mit einem Ziel; mehrere Ziele je Datei oder eine Datei in einem
  Thema prüft bis Schritt 11 nur die echte Ausnahme mit. Bedenken, wenn die Liste leer ist.
- **Parallele Session:** Zwischen Abzweig und Merge hat eine andere Session `docs/fragen-2026-11-12`
  nach `dev` gemergt (Version 0.20.15, Antworten des Vorstands, Kommentare im Code); Schritt 10
  trägt darum die Version 0.20.16.

### D.11 Nachmessen Schritt 11

**Nachmessen Schritt 11** (12.11.2026, Worktree `refactor-schritt-11`, Stand `origin/dev` nach
Schritt 10, `a07d7a0`, Version 0.20.16)

Am Code gelesen und gezählt, **nichts ausgeführt** (kein Test, kein Lint, kein Build, keine
Datenbank; auch die Bauregel nicht). Server-Dateien unter `src/lib/server/`, wenn nichts anderes
steht.

- **Ganz gelesen [G]:** `turnier/schnittstellen.ts`, `gespraech/schnittstellen.ts`,
  `mitteilung/schnittstellen.ts`, `mitteilung/typen.ts`, `mitteilung/meldung.ts`, `cm/typen.ts`,
  `gespraech/meldung.ts`, `dienste.ts`, `routen.test.ts`, `grundpruefung.db.test.ts`,
  `admin/rechte-matrix.db.test.ts`, `eslint.config.js`, `scripts/pruefungen/bauregel.ts`,
  `scripts/importrichtung.test.ts`, `tests/hilfen/verwaltungs-listen.ts`, die 26 `+server.ts` unter
  `src/routes/api/admin/`, die aus `turnier/` oder `mitteilung/schnittstellen.ts` holen; die
  Projekt-`CLAUDE.md`.
- **In Auszügen [G für die Stelle]:** `scripts/pruefungen/bauregel.test.ts` (Zeilen 61 bis 170 und
  353 bis 669, Titel aller Fälle), `turnier/schnittstellen.db.test.ts` (1 bis 146, 334 bis 445,
  1130 bis 1185, Titel aller Tests), `cm/schnittstellen.ts` (Gerüst und 180 bis 226),
  `cm/doppel-meldung.ts` (Kopf und Export-Zeilen), `docs/ci-cd-und-release.md` (Zeile 321),
  `docs/arc42.md` (Zeile 88), `docs/context-scopes.md` (Zeilen 18 und 19).
- **Nur per Textsuche oder Zählung [E]:** `gespraech/schnittstellen.db.test.ts` und
  `mitteilung/admin-schnittstellen.db.test.ts` (Titel, Import-Zeilen, Zahl der Aufrufe);
  `cm/verwaltung.ts`, `cm/verwaltung-doppel.ts`, `turnier/turniere.ts` (Import- und Export-Zeilen);
  welcher Testblock welche Funktion ruft (Zählung je Funktion und Zeilenbereich); jede Nennung der
  drei Dateien und der Listen-Namen in `src/`, `scripts/`, `tests/`, `docs/`; die E2E-Dateien nur
  am Namen.

#### Ergebnis in Kürze

- **Die Zuordnung 9, 13, 4 ist bestätigt [G]**, an den Rümpfen, nicht nur an den Namen. Keine der
  26 Funktionen ist strittig. Alle prüfen den Bereich `cm`.
- **Eine Hilfe brauchen zwei Zielmodule:** `melde` (`turnier/schnittstellen.ts`, Zeilen 192 bis
  205) rufen die neun schreibenden der CM und, über `meldeHinfaellige`, die zwei Kategorie-
  Schnittstellen des Turniers. Im Plan steht sie nicht. Vorschlag: eine Fachdatei in `cm/` (unten).
- **Beim Gespräch teilen Mitglieder und Verwaltung vier Hilfen** (`pruefeText`, `antwortOderWeg`,
  `nurLesen`, `textFehler`). Unter Variante A brauchen sie einen Ort ausserhalb der zwei
  Schnittstellen-Dateien.
- **Die Ausnahme fällt von selbst weg,** und damit ist `AUSNAHMEN` schon **nach Schritt 11 leer**,
  nicht erst nach Schritt 12. Die Vorab-Prüfung der Zeile 12 (`it.each` mit leerer Liste) und der
  Hinweis des Reviews aus D.10 gehören darum in Schritt 11.
- **`mitteilung/` trennt sich sauber** bei Zeile 80: sechs Funktionen, neun Hilfen und Typen, keine
  geteilte Hilfe. Einstieg, Dienst-Typ und Liste bleiben, wie sie sind. Die Arbeit liegt in der
  Bauregel: Die Sperrliste nach Namen entfällt ganz, rund acht Stellen in `bauregel.test.ts` hängen
  an ihr, und für eine Datei wird die Bauregel dabei bewusst lockerer.
- **Zielzustand:** sechs Listen (25, 9, 13, 4, 6, 5), Summe **62 bleibt**, 42 schreibend bleibt.
  `VERWALTUNGS_DATEIEN` hat sechs Zeilen, eine `ordner`, fünf `pfad`; `namen` und `offen` gibt es
  nicht mehr.
- **Umfang:** 23 Funktionen ziehen um (17 ohne Mitteilungen), 20 von 50 Admin-Routen ändern ihre
  Import-Zeile (14 ohne Mitteilungen), rund neun Testdateien, drei Doku-Zeilen.
- **Empfehlung: zwei Teile,** 11a (Turnier, CM, Gespräch) und 11b (Mitteilungen), je eigener
  Merge, beide Opus. Das ist ein Schritt mehr als geplant, darum Frage **F-22**. Ohne Antwort läuft
  Schritt 11 als ein Schritt, mit den Mitteilungen zuletzt.
- **Für die Nutzerin ändert sich nichts** [G]: Jede Route behält Adresse, Methode, Einstieg und
  Funktion; es ändert sich je eine Import-Zeile.

#### Die 26 Einträge von `TURNIER_SCHNITTSTELLEN` [G]

Zeilen in `turnier/schnittstellen.ts`; die vier des Gesprächs in `gespraech/schnittstellen.ts`.
Einstieg: A = `holeAdminDienste`, M = `holeMitteilungAdminDienste`. Rechte: `get…` über `liest`,
`post…` über `schreibt`, alle im Bereich `cm`. Adressen unter `/api/admin/`.

| Nr. | Funktion | Zeilen | Ziel | Fachlogik | Route | Einstieg |
|----:|----------|--------|------|-----------|-------|----------|
| 1 | `getTurniere` | 65–67 | turnier | `listeTurniere` (`turnier/turniere.ts`) | `GET turniere` | A |
| 2 | `postTurniere` | 69–77 | turnier | `pruefeTurnier` (`turnier/angaben.ts`), `legeTurnierAn` | `POST turniere` | A |
| 3 | `getTurnier` | 79–85 | turnier | `ladeTurnier` | `GET turniere/[id]` | A |
| 4 | `postTurnier` | 87–103 | turnier | `pruefeTurnier`, `aendereTurnier` | `POST turniere/[id]` | A |
| 5 | `postTurnierStatus` | 105–116 | turnier | `setzeStatus` | `POST turniere/[id]/status` | A |
| 6 | `postKategorien` | 118–130 | turnier | `ladeTurnier`, `pruefeKategorie`, `legeKategorieAn` | `POST turniere/[id]/kategorien` | A |
| 7 | `getKategorie` | 132–138 | turnier | `ladeKategorie` | `GET kategorien/[id]` | A |
| 8 | `postKategorie` | 140–157 | turnier | `ladeKategorie`, `pruefeKategorie`, `aendereKategorie`; `meldeHinfaellige` → `melde` | `POST kategorien/[id]` | M |
| 9 | `postKategorieAbsagen` | 159–172 | turnier | `sageKategorieAb`; `meldeHinfaellige` → `melde` | `POST kategorien/[id]/absagen` | M |
| 10 | `getAnmeldungen` | 236–243 | cm | `ladeAnmeldungen` (`cm/verwaltung.ts`), `ladeKategorie` (`turnier/turniere.ts`) | `GET kategorien/[id]/anmeldungen` | M |
| 11 | `postAnmeldungVonHand` | 246–272 | cm | `meldeVonHandAn`, `ladeKategorie`; `melde` | `POST kategorien/[id]/anmeldungen` | M |
| 12 | `postVerschieben` | 275–310 | cm | `artDerAnmeldung`, `verschiebeDoppel` (`cm/verwaltung-doppel.ts`), `verschiebe`; `melde`, `meldeAlle`, `abgelehnt`, `warnung` | `POST anmeldungen/[id]` | M |
| 13 | `postAnmeldungLoeschen` | 313–337 | cm | `artDerAnmeldung`, `loescheDoppel`, `loescheAnmeldung`; `melde`, `meldeAlle` | `POST anmeldungen/[id]/loeschen` | M |
| 14 | `getDoppel` | 340–346 | cm | `ladeDoppel` | `GET kategorien/[id]/doppel` | M |
| 15 | `postDoppelVonHand` | 349–375 | cm | `meldeDoppelVonHandAn`; `meldeAlle`, `abgelehnt` | `POST kategorien/[id]/doppel` | M |
| 16 | `postZusammenlegen` | 378–390 | cm | `legeZusammen`; `meldeAlle`, `abgelehnt` | `POST anmeldungen/[id]/zusammenlegen` | M |
| 17 | `postPartnerAendern` | 393–409 | cm | `aenderePartner`; `meldeAlle`, `abgelehnt` | `POST anmeldungen/[id]/partner` | M |
| 18 | `postAnfrageAlsPaar` | 412–423 | cm | `meldeAnfrageAlsPaarAn`; `meldeAlle`, `abgelehnt` | `POST anfragen/[id]/paar` | M |
| 19 | `postAnfrageLoeschen` | 426–437 | cm | `loescheAnfrage`; `meldeAlle` | `POST anfragen/[id]/loeschen` | M |
| 20 | `postEntscheid` | 443–461 | cm | `entscheide` (`cm/verwaltung.ts`); `melde` | `POST anmeldungen/[id]/entscheid` | M |
| 21 | `getSpieler` | 464–470 | cm | `sucheSpieler` (`cm/verwaltung.ts`) | `GET spieler` | M |
| 22 | `postKlassierung` | 473–481 | cm | `korrigiereKlassierung` (`cm/verwaltung.ts`), `istKlassierung` (`src/lib/turnier/klassierung.ts`) | `POST spieler/[id]/klassierung` | M |
| 23 | `getGespraeche` | 103–109 | gespraech | `listeGespraeche` (`gespraech/gespraech.ts`) | `GET turniere/[id]/gespraeche` | M |
| 24 | `getAdminGespraech` | 111–117 | gespraech | `ladeGespraech` | `GET gespraeche/[id]` | M |
| 25 | `postAntwort` | 134–163 | gespraech | `antworte`, `ladeGespraech`; `meldeAntwort`, `pruefeText`, `textFehler`, `nurLesen`, `antwortOderWeg` | `POST gespraeche/[id]` | M |
| 26 | `postZustand` | 165–177 | gespraech | `setzeZustand`, `ladeGespraech`; `nurLesen`, `antwortOderWeg` | `POST gespraeche/[id]/zustand` | M |

- **Bestätigt:** neun Turnier und Kategorie (6 Routen, 9 Methoden, 6 schreibend), 13
  Anmeldungs-Verwaltung der CM (11 Routen, 13 Methoden, 10 schreibend), vier Gespräch (3 Routen,
  4 Methoden, 2 schreibend). Zusammen 20 Routen und 18 schreibende, wie D.7.
- **`postKategorie` und `postKategorieAbsagen` bleiben beim Turnier** (in D.7 offen gelassen): Ihre
  Fachlogik liegt in `turnier/turniere.ts` und `turnier/angaben.ts`. Aus `cm/` brauchen sie nur den
  Text `anfrageGeloeschtText` (`cm/doppel-meldung.ts`, eine Fachdatei) und die Hilfe `melde`.
- **`getSpieler` und `postKlassierung` gehören zur CM:** Die Adresse sagt «Spieler», die Fachlogik
  steht in `cm/verwaltung.ts`.
- **Einstiege, zur Kenntnis, nicht zu ändern:** `getAnmeldungen`, `getDoppel`, `getSpieler` und
  `postKlassierung` verlangen nur `AdminDienste`, ihre Routen reichen aber
  `holeMitteilungAdminDienste()`; `getGespraeche`, `getAdminGespraech` und `postZustand` verlangen
  `MitteilungAdminDienste`, ohne zu melden. Der Routen-Test hält genau das fest; der Schritt
  verschiebt und ändert es nicht (Feature-Stopp).
- **Hilfen der Datei:** nur CM: `SUCHE_MAX`, `GRUND_MAX`, `idAus`, `trotzdemAus`, `warnung`,
  `meldeAlle`, `abgelehnt`. Nur Turnier: `meldeHinfaellige`. **Beide: `melde`.**

**Tests, die die 26 heute decken**

| Netz | Fundstelle | Deckt |
|------|------------|-------|
| Ablauf-Tests Turnier | `turnier/schnittstellen.db.test.ts`, Block «Turnier-Schnittstellen» (Zeilen 147 bis 442, neun Tests) | ruft nur die neun des Turniers [E, gezählt] |
| Ablauf-Tests CM | dieselbe Datei, Blöcke «Anmeldungen verwalten» (537 bis 898, neun Tests) und «Doppel verwalten» (913 bis 1136, fünf Tests) | rufen nur die 13 der CM [E, gezählt] |
| ein Test über die Grenze | dieselbe Datei, letzter Test (1138 bis 1184) | ruft `postKategorieAbsagen` und `postKategorie` (Turnier), mit den Hilfen der CM-Blöcke (`cmTurnier`, `doppelSpieler`, `mailsAn`) [G] |
| Rechte-Schleife `cm` | dieselbe Datei, Zeilen 374 bis 428, feste Zahl 26 | je Eintrag: 401, `kein-admin`, `unbestaetigt`, CM-Admin weder 401 noch 403, MyTCO-Admin `kein-recht` beim Schreiben, Mitglieder- und Lizenz-Admin `kein-admin`, 415 [G] |
| Ablauf-Tests Gespräch | `gespraech/schnittstellen.db.test.ts` (15 Tests, 31 Aufrufe der vier, 11 der drei der Mitglieder) | beide Seiten in einer Datei [E] |
| Grundprüfung | `grundpruefung.db.test.ts` | 401, `kein-admin`, `unbestaetigt` über alle 62; 415 über die 42 schreibenden [G] |
| Rechte-Matrix | `admin/rechte-matrix.db.test.ts` | MyTCO-Admin `kein-recht` an allen schreibenden (zehn der CM beim Namen verlangt); liest `getTurniere`, `getAnmeldungen`, `getSpieler`, `getDoppel` über `TURNIER_SCHNITTSTELLEN.…` [G] |
| Routen-Test | `routen.test.ts` → `ROUTEN` | Funktion und Einstieg je Methode der 20 Routen [G] |
| E2E | `tests/e2e/turnier.test.ts`, `cm-verwaltung.test.ts`, `cm-doppel-verwaltung.test.ts`, `cm-gespraech.test.ts` | nicht gelesen [E, Dateinamen] |

- **Lücke, die beim Teilen der Schleife zählt:** «Der Admin des anderen Bereichs bekommt 403
  `kein-admin`» prüft für diese 26 nur die Schleife mit der festen Zahl. Grundprüfung und
  Rechte-Matrix sähen nicht, wenn eine verschobene Funktion den Bereich wechselte oder eine der
  drei neuen Listen keine eigene Schleife bekäme. Darum der Vorab-Test unten.

#### Die letzte Ausnahme [G]

- **Was importiert wird:** `turnier/schnittstellen.ts`, Zeilen 36 bis 41: die vier Funktionen
  `getAdminGespraech`, `getGespraeche`, `postAntwort`, `postZustand` aus
  `gespraech/schnittstellen.ts`; Zeile 483 reicht sie weiter (`export { … }`), Zeilen 509 bis 512
  führen sie in der Liste. Sonst nichts.
- **Fällt sie von selbst weg?** Ja. Sobald die vier ihre eigene Liste und ihre drei Routen den
  eigenen Import haben, braucht `turnier/schnittstellen.ts` weder Import noch Weiterreichen. Es
  entsteht kein neuer Import einer Schnittstellen-Datei: `cm/verwaltung-schnittstellen.ts` und
  `gespraech/verwaltung-schnittstellen.ts` holen nur Fachdateien, `admin/rechte.ts`, `http.ts` und
  `mitteilung/typen.ts`.
- **Folge, im Plan anders:** `AUSNAHMEN` (`eslint.config.js`, Zeilen 52 bis 58) ist dann leer. Die
  Probe «Ausnahme … ist noch nötig» (`importrichtung.test.ts`, Zeile 160) läuft als `it.each` über
  eine leere Liste. Ob Vitest (`package.json`: `^5.0.5`) das ohne Fehler hinnimmt, ist nicht
  geprüft [V]; die Zeile 12 nennt diese Prüfung «vorab», sie fällt aber schon hier an.
- **Auf Ordner-Ebene:** `turnier` → `cm/verwaltung.ts` und → `cm/verwaltung-doppel.ts` fallen weg;
  `turnier` → `cm/doppel-meldung.ts` und → `cm/anmeldungen.ts` bleiben. Neu: `cm` →
  `turnier/turniere.ts` (`ladeKategorie`), `cm` → `admin/rechte.ts`, `cm` → `mitteilung/typen.ts`.
  `cm` und `turnier` hängen schon heute gegenseitig aneinander; der Lint erfasst das nicht
  (Fachlogik zwischen Themen). Als «weniger Abhängigkeiten» darf der Schritt nicht gelten, nur als
  «keine über Schnittstellen-Dateien».

#### Hilfen, die mehrere Ziele brauchen

1. **`melde`** (`turnier/schnittstellen.ts`, Zeilen 187 bis 205; Turnier und CM). Drei Wege:
   - (a) *Fachdatei in `cm/`* (Arbeitstitel `cm/verwaltung-meldung.ts`), `melde` unverändert, dazu
     nur `export`. `turnier/schnittstellen.ts` holt sie von dort; `turnier` importiert schon heute
     Fachdateien aus `cm/`. Der Name endet nicht auf `schnittstellen`, also weder Lint-Ebene 3 noch
     Aufzeichner des Routen-Tests.
   - (b) *Zwei Kopien* (je 14 Zeilen). Kein Import, aber derselbe Titel «Clubmeisterschaft» und
     derselbe Pfad an zwei Stellen; eine dritte, eigene Fassung hat schon das Gespräch
     (`meldeAntwort`).
   - (c) *In einer der zwei Schnittstellen-Dateien lassen und aus der anderen importieren:* nicht
     möglich, das wäre genau die Art Import, die der Schritt abschafft (neue Ausnahme).
   - **Vorschlag: (a).** Kein Entscheid des Projektleiters: Es ändert kein Verhalten und keine
     Regel.
2. **Gespräch: `pruefeText`, `antwortOderWeg`, `nurLesen`, `textFehler`** (mit `TEXT_MIN`,
   `TEXT_MAX`; `gespraech/schnittstellen.ts`, Zeilen 35 bis 51). `pruefeText` ist exportiert, aber
   von keiner anderen Datei importiert [G, Textsuche]. Vorschlag: eine Fachdatei im Modul
   (Arbeitstitel `gespraech/antworten.ts`), aus der beide Schnittstellen-Dateien holen. Der Import
   aus `./schnittstellen.ts` wäre nach dem Lint erlaubt (eigenes Modul), liesse aber Hilfen aus
   einer Schnittstellen-Datei exportieren; der Routen-Test ersetzt dort jede exportierte Funktion
   durch einen Aufzeichner. `meldeAntwort` braucht nur die Verwaltung und zieht mit.
3. **Mitteilungen:** keine geteilte Hilfe (unten).
4. **Im Test:** Der Kopf von `turnier/schnittstellen.db.test.ts` (Zeilen 48 bis 145: `baue`,
   `bestaetigt`, `post`, `hole`, `EINZEL`) wird von allen drei Blöcken gebraucht; die neue
   Testdatei der CM braucht ihn als Kopie, wie jede Testdatei ihren eigenen Aufbau hat. Der Test
   über die Grenze (Zeile 1138) zieht mit den CM-Blöcken und importiert die zwei Funktionen aus
   `../turnier/schnittstellen.ts` (Tests sind vom Lint ausgenommen), oder bleibt beim Turnier und
   bekommt seine drei Hilfen dort. Beides ändert keine Erwartung.

#### `mitteilung/schnittstellen.ts` [G]

| Teil | Zeilen | Inhalt | Routen |
|------|--------|--------|--------|
| Mitglieder | 31 bis 78 | `stand` (Hilfe), `getBenachrichtigungen`, `postThemen`, `postAbo`, `postAboLoeschen`, Liste `MITTEILUNG_SCHNITTSTELLEN` (4) | drei unter `/api/benachrichtigungen/`, Einstieg `holeMitteilungDienste` |
| Verwaltung | 80 bis 208 | Typen `AdminHandler`, `Ziel`, `Versand`; Hilfen `bezug`, `mitZiel`, `verlauf`, `mitEmpfaengern`, `vorschauFuer`, `sendenFuer`; die sechs `getVereinMitteilungen`, `postVereinVorschau`, `postVereinSenden`, `getAnlassMitteilungen`, `postAnlassVorschau`, `postAnlassSenden`; Liste `MITTEILUNG_ADMIN_SCHNITTSTELLEN` (6) | sechs unter `/api/admin/mitteilungen/` und `/api/admin/anlaesse/[id]/mitteilungen/`, Einstieg `holeMitteilungAdminDienste`, Bereich `mitglieder` |

- **Geteilt wird nichts Eigenes:** Beide Teile holen `antwort` und `jetzt` aus `http.ts` und je
  ihren Dienst-Typ aus `./typen.ts`. Alle anderen Importe gehören genau einem Teil (Mitglieder:
  `abo.ts`, `themen.ts`, `mitSitzung`, `istJson`, `formatFehler`, `leseKoerper`, `eingabeFehler`;
  Verwaltung: `liest`, `schreibt`, `angaben.ts`, `empfaenger.ts`, `verlauf.ts`, `versand.ts`,
  `parseId`, `nichtGefunden`, die zwei Dateien unter `src/lib/mitteilung/`). Der Schnitt liegt bei
  Zeile 80.
- **`holeMitteilungAdminDienste` und der Dienst-Typ:** unberührt. Der Typ `MitteilungAdminDienste`
  steht seit Schritt 07 in `mitteilung/typen.ts`, keiner Schnittstellen-Datei; der Einstieg steht
  in `dienste.ts` und in `VERWALTUNGS_EINSTIEGE` der Bauregel. An `typen.ts` ändert sich nur der
  Kopfkommentar (er nennt, wer den Typ holt). Zur Kenntnis: Der Typ trägt «Mitteilung» im Namen,
  wird aber von Turnier, CM und Gespräch als «Verwaltung mit Meldung» gebraucht (16 der 20
  Routen aus `turnier/schnittstellen.ts`); umbenennen ist nicht Teil des Schritts.
- **Die sechs Funktionen sind Konstanten** (`export const … = verlauf('verein')`), keine
  Funktions-Deklarationen. Für Liste, Bauregel und Routen-Test ohne Belang (der Routen-Test
  vergleicht die Funktion, nicht den Namen).
- **Tests:** `mitteilung/admin-schnittstellen.db.test.ts` (zehn Tests, importiert Liste und alle
  sechs; die Schleife «CM-Admin 403» über sechs) und `mitteilung/schnittstellen.db.test.ts` (nur
  die vier der Mitglieder, bleibt). Die Trennung der Tests gibt es also schon; es ändert sich der
  Import, und die Datei kann zum Muster passend `verwaltung-schnittstellen.db.test.ts` heissen.
  Dazu Rechte-Matrix (Import der Liste), Routen-Test (ein Import-Block wird zwei),
  `tests/hilfen/verwaltungs-listen.ts`. E2E: `tests/e2e/mitteilungen.test.ts` [E, Dateiname].
- **Die Sperrliste nach Namen fällt ganz weg.** Die Zeile wechselt auf die neue Datei mit `pfad`;
  dann gibt es keine Zeile `namen` mehr. In `bauregel.ts` sind danach ohne Wirkung: `GEMISCHT`, der
  Parameter `gemischt` und der Zweig `verwaltung?.has(name)` in `pruefeVerwaltungImporte`, der
  Zweig «lässt sich nicht lesen» samt `inAnfuehrungszeichen` (er greift nur bei gemischten Dateien;
  für `dienste.ts` fängt die Erlaubt-Liste jeden Namen vorher). `pruefeVerwaltungImporte` selbst
  bleibt für `dienste.ts`. Vorschlag: die zwei Arten `namen` und `offen` aus dem Typ `Aussen` und
  den toten Code streichen, als eigener Commit; sonst bleibt Schutz-Code stehen, den kein echter
  Fall mehr übt.
- **Die Bauregel wird dabei an einer Stelle lockerer, mit Grund:** Heute meldet sie in einer
  Mitglieder-Route `export * from` und `import()` auf `mitteilung/schnittstellen.ts` («nur statisch
  und mit Namen»). Nach der Trennung enthält die Datei nur noch Schnittstellen der Mitglieder und
  steht nicht mehr in der Tabelle; diese Formen sind dann frei wie bei `anlass/schnittstellen.ts`.
  Strenger wird sie an zwei Stellen: Eine Admin-Route darf `mitteilung/schnittstellen.ts` gar nicht
  mehr importieren, und die neue Datei ist ausserhalb am Pfad gesperrt (damit sind die drei
  Schwächen der Sperrliste aus D.7 erledigt). Der Vergleich «nirgends lockerer als `dev`» aus dem
  Review von Schritt 09 kann hier nicht ohne Abweichung aufgehen; die erwartete Abweichung ist
  genau diese eine Datei.
- **`bauregel.test.ts`, was an der Sperrliste hängt [G]:** der Block «Mitteilungen ausserhalb von
  api/admin» (zwei Tests), in «Namen in Anführungszeichen» zwei Fälle (`export { 'postVereinSenden'
  as p }`, Escape `\x6e` an der Sperrliste), in «Text in Anführungszeichen verschluckt keinen
  Import» eine von vier Zeilen je Literal, der Fall «Mitteilungen der Verwaltung nur aus …» (Pfad
  der Datei), `betrifftBauregel` (eine Zeile) und die zwei Texte `LISTEN` und `DATEIEN` oben.

#### Zielzustand nach Variante A

**Dateien und Listen**

| Datei | Liste | Einträge | schreibend | entsteht aus |
|-------|-------|---------:|-----------:|--------------|
| `admin/schnittstellen.ts` | `ADMIN_SCHNITTSTELLEN` | 25 | 17 | unverändert |
| `turnier/schnittstellen.ts` | `TURNIER_SCHNITTSTELLEN` | 9 | 6 | bleibt, 513 → rund 170 Zeilen |
| `cm/verwaltung-schnittstellen.ts` (neu) | `CM_ADMIN_SCHNITTSTELLEN` | 13 | 10 | `turnier/schnittstellen.ts`, rund 290 Zeilen |
| `gespraech/verwaltung-schnittstellen.ts` (neu) | `GESPRAECH_ADMIN_SCHNITTSTELLEN` | 4 | 2 | `gespraech/schnittstellen.ts` ab Zeile 101, rund 95 Zeilen |
| `mitteilung/verwaltung-schnittstellen.ts` (neu) | `MITTEILUNG_ADMIN_SCHNITTSTELLEN` (Name bleibt) | 6 | 4 | `mitteilung/schnittstellen.ts` ab Zeile 80, rund 150 Zeilen |
| `anlass/verwaltung-schnittstellen.ts` | `ANLASS_ADMIN_SCHNITTSTELLEN` | 5 | 3 | unverändert |

- **Summe 62, schreibend 42:** bleibt (25 + 9 + 13 + 4 + 6 + 5; 17 + 6 + 10 + 2 + 4 + 3; die 17
  von `admin/` sind aus 42 errechnet, nicht gezählt). Die Listen der Mitglieder bleiben bei 36 und
  26: `GESPRAECH_SCHNITTSTELLEN` (3) und `MITTEILUNG_SCHNITTSTELLEN` (4) bleiben in ihren Dateien.
- **Dazu zwei Fachdateien** (Arbeitstitel `cm/verwaltung-meldung.ts`, `gespraech/antworten.ts`)
  und eine neue Testdatei `cm/verwaltung-schnittstellen.db.test.ts`.
- **`turnier/schnittstellen.ts` behält seinen Namen:** Im Turnier gibt es keine Schnittstellen der
  Mitglieder (die liegen in `cm/`), die Datei ist wie `admin/schnittstellen.ts` eine reine
  Verwaltungs-Datei. Umbenennen brächte sechs weitere Routen und keinen Schutz (E-12).
- **Kein Namensstreit:** Kein Name der 23 steht in einer zweiten Liste der Verwaltung
  (`alleVerwaltung()` bräche sonst ab); `postKlassierung` gibt es auch in `PROFIL_SCHNITTSTELLEN`,
  das ist eine Liste der Mitglieder und stört nicht (der Routen-Test führt beide schon unter zwei
  Namen).

**`VERWALTUNGS_DATEIEN` danach** (`scripts/pruefungen/bauregel.ts`)

| `datei` | `liste` | `aussen` | heute |
|---------|---------|----------|-------|
| `admin/schnittstellen.ts` | `ADMIN_SCHNITTSTELLEN` | `ordner` | gleich |
| `turnier/schnittstellen.ts` | `TURNIER_SCHNITTSTELLEN` | `pfad` | `offen` |
| `cm/verwaltung-schnittstellen.ts` | `CM_ADMIN_SCHNITTSTELLEN` | `pfad` | neu |
| `gespraech/verwaltung-schnittstellen.ts` | `GESPRAECH_ADMIN_SCHNITTSTELLEN` | `pfad` | neu |
| `mitteilung/verwaltung-schnittstellen.ts` | `MITTEILUNG_ADMIN_SCHNITTSTELLEN` | `pfad` | `mitteilung/schnittstellen.ts` mit `namen` |
| `anlass/verwaltung-schnittstellen.ts` | `ANLASS_ADMIN_SCHNITTSTELLEN` | `pfad` | gleich |

- Eine Zeile `ordner`, fünf `pfad`, **keine `namen`, kein `offen`.** Damit ist die Lücke aus D.7
  zu («für `turnier/` und die vier in `gespraech/` gibt es ausserhalb keine Regel»).
- `turnier/schnittstellen.ts` auf `pfad` ist am echten Repo heute schon grün: Keine Datei unter
  `src/routes/` ausserhalb von `api/admin/` importiert sie [G, Textsuche über alle Dateien dort,
  auch die vier Tests].
- `SCHNITTSTELLEN_IMPORT`, `ERLAUBTER_IMPORT`, die zwei Meldungstexte, `adminSchnittstellen()` und
  `betrifftBauregel` entstehen aus der Tabelle und brauchen keine eigene Änderung.
  `mitteilung/schnittstellen.ts` und `gespraech/schnittstellen.ts` «betreffen» die Bauregel danach
  nicht mehr (wie `anlass/schnittstellen.ts`).
- Admin-Routen prüfen den Namen weiter gegen die Vereinigung aller Listen, nicht gegen die Liste
  ihrer Datei (D.8, Abweichung 2). Unter A harmlos; nicht Teil des Schritts.

**`tests/hilfen/verwaltungs-listen.ts` danach:** sechs Einträge in `VERWALTUNGS_LISTEN`: `admin`,
`turnier`, `'cm-admin'`, `'gespraech-admin'`, `'mitteilung-admin'`, `'anlass-admin'`; zwei
Import-Zeilen neu, eine mit neuem Pfad. Typ und `alleVerwaltung()` bleiben.

**Was sich sonst ändert**

| Stelle | Änderung |
|--------|----------|
| Lint, `eslint.config.js` | `AUSNAHMEN` wird `[]`; der Kopfkommentar (Zeilen 22 bis 24, «Schritt 12 leert die Liste») stimmt dann nicht mehr. `THEMEN` bleibt (kein neuer Ordner). Das Muster `SCHNITTSTELLEN` bleibt: Es kennt `verwaltung-schnittstellen` seit Schritt 09 |
| `scripts/importrichtung.test.ts` | die Probe «ist noch nötig» und «jede Ausnahme nennt einen Schritt» laufen über eine leere Liste; die gestellte Ausnahme deckt nur eine Datei in `login` mit einem Ziel (Hinweis aus D.10) |
| Routen-Test | `ROUTEN` und `EINSTIEGE` bleiben Zeile für Zeile. Oben werden aus dem Import-Block `turnier/` drei (Turnier, CM, Gespräch-Verwaltung), aus `mitteilung/` und `gespraech/` je zwei. Das Muster `*schnittstellen.ts` trifft die neuen Dateien; die zwei Fachdateien nicht (gewollt) |
| Grundprüfung | **keine Zeile**, entgegen der Zeile 11: Sie nimmt die Listen aus `VERWALTUNGS_LISTEN`; 62 und 42 bleiben, die Ausnahmen heissen alle `admin.…`. In den Meldungen heisst es `cm-admin.getAnmeldungen` statt `turnier.getAnmeldungen` |
| Rechte-Matrix | Import-Zeilen; `TURNIER_SCHNITTSTELLEN.getAnmeldungen`, `.getSpieler`, `.getDoppel` kommen aus der Liste der CM. `alleVerwaltung()`, die verlangten Namen und «mindestens 31» bleiben |
| Schleifen je Modul | 26 wird 9, 13 und 4, je in der Testdatei ihres Moduls; die Schleife der Mitteilungen (6) bleibt |
| Doku | `docs/ci-cd-und-release.md` (Zeile 321) und `docs/arc42.md` (Zeile 88) nennen die vier Listen und Dateien; `docs/context-scopes.md` (Zeile 18, «Clubmeisterschaft (Verwaltung)») nennt weder die Routen `anmeldungen/`, `anfragen/`, `spieler/` noch `cm/verwaltung.ts`; Kopfkommentare in `bauregel.ts`, `mitteilung/typen.ts` und über `GESPRAECH_SCHNITTSTELLEN` |

#### Umfang und Schnitt

| | 11a Turnier, CM, Gespräch | 11b Mitteilungen | zusammen |
|---|---:|---:|---:|
| Funktionen, die umziehen | 17 (13 + 4) | 6 | 23 |
| Hilfen und Typen, die mitziehen | 7 + 1, dazu `melde` und die vier des Gesprächs in Fachdateien | 9 | |
| Admin-Routen (Import-Zeile) | 14 (11 + 3) | 6 | 20 von 50 |
| neue Dateien | 2 Schnittstellen, 2 Fachdateien, 1 Test | 1 Schnittstellen (Test wird umbenannt) | 6 |
| Testdateien | `turnier/…db.test.ts` (geteilt), `gespraech/…db.test.ts`, Rechte-Matrix, Routen-Test, `verwaltungs-listen.ts`, `bauregel.test.ts`, `importrichtung.test.ts` | `mitteilung/admin-…db.test.ts`, Rechte-Matrix, Routen-Test, `verwaltungs-listen.ts`, `bauregel.test.ts` | rund 9 |
| Bauregel | zwei Zeilen neu, `offen` → `pfad` | `namen` → `pfad`, Sperrliste und zwei Arten gestrichen | |
| Lint | `AUSNAHMEN` leer | nichts | |
| Art des Risikos | viel Mechanik, dichtes Netz | wenig Mechanik, Eingriff in den Schutz-Code | |

**Empfehlung: zwei Teile mit je eigenem Merge** (Frage F-22, weil der Plan damit einen Schritt und
eine Version mehr hat; E-28 war dafür ein Entscheid).

- **Dafür:** (1) Die zwei Teile tragen verschiedene Risiken. 11a ist Verschieben mit starkem Netz
  (Routen-Test bindet Funktion und Einstieg, Zählung 62, Typprüfer). 11b bewegt wenig, streicht
  aber Schutz-Code und macht die Bauregel für eine Datei lockerer; der Reviewer liest diesen Diff
  ganz und vergleicht gegen `dev` mit einer erwarteten Abweichung. In einem Schritt läge dieser
  Diff neben einer verschobenen Testdatei von rund 740 Zeilen. (2) Schritt 09 brauchte für fünf
  Funktionen eine Korrekturrunde, und zwar an der Bauregel. (3) 11b hängt an 11a nur über
  gemeinsam berührte Dateien (Tabelle, Listen der Tests, zwei Doku-Zeilen); nacheinander gibt es
  keinen Konflikt. (4) Geht ein Teil nicht auf, bricht er einzeln ab.
- **Dagegen:** eine Version und ein voller Prüflauf mehr (Etappe 1: neun statt acht Versionen);
  E-38 sagt wörtlich «in Schritt 11».
- **Als ein Schritt machbar:** ja, für einen Subagenten, wenn die Commits so liegen, dass die
  Mitteilungen am Ende stehen. Dann dieselbe Reihenfolge wie unten, hintereinander.

**Commit-Reihenfolge 11a**

1. `test:` vorab, grün auf dem alten Stand: (a) Charakterisierung «Bereich `cm`» in der
   Rechte-Matrix: die 26 Namen wörtlich, je über `alleVerwaltung()`: Mitglieder-Admin 403
   `kein-admin`, bestätigter CM-Admin weder 401 noch 403. Der Test bleibt durch den Umzug
   unverändert. (b) In `importrichtung.test.ts` eine zweite gestellte Ausnahme: eine Datei in einem
   Thema mit zwei Zielen (Hinweis aus D.10), damit die Deckung nicht sinkt, wenn die echte
   Ausnahme fällt.
2. `refactor:` Bauregel: `turnier/schnittstellen.ts` von `offen` auf `pfad`, ein Fall «ausserhalb
   von `api/admin/`».
3. `refactor:` Gespräch (klein zuerst): vier Hilfen in die Fachdatei, vier Funktionen und
   `meldeAntwort` nach `gespraech/verwaltung-schnittstellen.ts` mit Liste; drei Routen;
   `turnier/schnittstellen.ts` verliert Import, Weiterreichen und vier Einträge (26 → 22);
   Tabelle, `VERWALTUNGS_LISTEN`, Routen-Test; `AUSNAHMEN` leer samt Kommentar und, falls nötig,
   Anpassung der Probe; Schleife über die vier.
4. `refactor:` CM: `melde` in die Fachdatei; 13 Funktionen und sieben Hilfen nach
   `cm/verwaltung-schnittstellen.ts` mit Liste; elf Routen; Tabelle, `VERWALTUNGS_LISTEN`,
   Routen-Test, Rechte-Matrix; die zwei Testblöcke in die neue Testdatei; Schleifen 22 → 9 und 13.
5. `docs:` die drei Doku-Zeilen und dieses Dokument.

**Commit-Reihenfolge 11b**

1. `refactor:` sechs Funktionen mit ihren neun Hilfen und Typen nach
   `mitteilung/verwaltung-schnittstellen.ts`; sechs Routen; Zeile der Tabelle auf die neue Datei
   mit `pfad`; `VERWALTUNGS_LISTEN`, Routen-Test, Rechte-Matrix; Testdatei umbenannt;
   `bauregel.test.ts`: die Fälle der Sperrliste auf den Pfad umgestellt (die 16 Formen wie beim
   Anlass).
2. `refactor:` Bauregel: `namen` und `offen` aus `Aussen`, `GEMISCHT` und die zwei toten Zweige
   gestrichen. Der Reviewer liest den Diff ganz.
3. `docs:`.

**Einmal rot zu belegen**

- 11a: in je einer verschobenen Funktion der CM und des Gesprächs den Bereich `mitglieder` statt
  `cm` → Charakterisierung und Schleife des Moduls rot; je neue Liste aus `VERWALTUNGS_LISTEN`
  genommen → Routen-Test rot; je neue Zeile der Tabelle gestrichen → Bauregel am echten Repo rot,
  mit `offen` statt `pfad` der Fall «ausserhalb» rot; eine Mitglieder-Route importiert
  `turnier/schnittstellen.ts` → Befund; `turnier/schnittstellen.ts` importiert wieder
  `../gespraech/schnittstellen.ts` → ESLint meldet (keine Ausnahme mehr); ein Thema importiert
  `cm/verwaltung-schnittstellen.ts` → ESLint meldet.
- 11b: Zeile der Tabelle gestrichen → sechs Admin-Routen am echten Repo rot; eine Mitglieder-Route
  importiert die neue Datei → Befund in jeder Form; eine Admin-Route importiert
  `mitteilung/schnittstellen.ts` → Befund (neu).

**Modell: Opus für beide Teile** (und für den einen Schritt, falls nicht geteilt wird). Das Risiko
ist mittel, nicht hoch: 11a schreibt keine neue Logik und hat das dichteste Netz der Etappe; 11b
schreibt kein neues Muster, sondern nutzt die Pfad-Sperre, die Schritt 09 gebaut und das Review
über eine Million gestellte Fälle geprüft hat, und streicht Code. Das stärkere Modell wäre erst
angezeigt, wenn die Bauregel neue Muster bekäme. Die Sorgfalt gehört ins Review von 11b.

#### Abweichungen von der Zeile 11 und ihren Hinweisen

1. **Ziel, «die des Gesprächs bekommen in `gespraech` ihre eigene Liste (sie liegen schon
   dort)»:** Unter Variante A ziehen sie in eine eigene Datei; vier Hilfen teilen sie mit den
   Mitgliedern. Hinweis «Zu tun bleibt: eigene Liste, Rechte-Schleife, Bauregel»: dazu die Datei
   und die Fachdatei für die Hilfen.
2. **Ziel:** `mitteilung/` fehlt in der Zeile (E-38 Zusatz 1 steht nur im Entscheid und bei
   «Nächster offener Schritt»).
3. **Nicht im Plan:** die Hilfe `melde`, die Turnier und CM brauchen.
4. **Dateien, es fehlen:** `mitteilung/` (Schnittstellen, Kommentar in `typen.ts`),
   `tests/hilfen/verwaltungs-listen.ts`, `turnier/schnittstellen.db.test.ts` (wird geteilt), eine
   neue Testdatei in `cm/`, `gespraech/schnittstellen.db.test.ts`,
   `mitteilung/admin-schnittstellen.db.test.ts`, `scripts/importrichtung.test.ts`, drei Doku-Dateien.
   **Zu viel:** `grundpruefung.db.test.ts` braucht keine Änderung; `routen.test.ts` nur Importe.
   «Routen unter `src/routes/api/admin/`»: 20 von 50 (14 ohne Mitteilungen).
5. **Absicherung, «mit der Schleife aus Schritt 09 über die neuen Listen»:** Sie läuft von selbst
   über jede Liste in `VERWALTUNGS_LISTEN`, prüft aber nicht den Bereich. Dafür der Vorab-Test
   und die Schleifen je Modul. E2E: zu «alle `cm-*`» und `turnier.test.ts` kommt für die
   Mitteilungen `mitteilungen.test.ts`.
6. **Absicherung, Bauregel:** nicht nur «je geändertes Muster ein Fall»: In 11b fällt Schutz-Code
   weg, und rund acht Stellen in `bauregel.test.ts` werden umgestellt.
7. **Hinweis «`cm/schnittstellen.ts` hat schon 430 Zeilen»:** 395 [G]; unter A wächst die Datei
   nicht.
8. **Hinweis «Neue Listen: wie bei Schritt 09 in alle fünf Stellen; … nur, wenn sie in
   `verwaltungsDienste()` steht»:** überholt seit Schritt 09. Es sind zwei Stellen
   (`VERWALTUNGS_LISTEN`, `VERWALTUNGS_DATEIEN`) und die Schleife des Moduls.
9. **Zeilen 11 und 12, Ausnahmen:** `AUSNAHMEN` ist nach Schritt 11 leer. «Vorab prüfen, ob
   `it.each(AUSNAHMEN …)` mit leerer Liste grün bleibt» (Zeile 12) fällt in Schritt 11 an.
10. **F-17 und D.7, «17 Funktionen und 14 Routen»:** stimmt ohne Mitteilungen; mit ihnen 23 und 20.
11. **D.7, «vier Testdateien nur an Importen» (Mitteilungen):** An Importen ändern sich vier
    (Testdatei der Verwaltung, Rechte-Matrix, Routen-Test, Listen der Tests); `bauregel.test.ts`
    kommt mit mehr als Importen dazu.
12. **Bestätigt:** Zuordnung 9, 13, 4; Routen 6, 11, 3; Risiko mittel; Voraussetzungen 06a, 07, 09
    (alle erledigt); Modell Opus; Weg Subagent; keine neue Ausnahme; das Lint-Muster kennt die
    neuen Namen; die Zählungen 62, 42, 36 und 26 bleiben.

#### Was sich für die Nutzerin ändert

Nichts. Die 20 Routen behalten Adresse, Methode, Einstieg und Funktion; die Funktionen ziehen
unverändert um. Kein Text, keine Antwort, kein Recht ändert sich. Das Netz dafür: Routen-Test,
Grundprüfung, Rechte-Matrix, die Ablauf-Tests der Module, E2E.

#### Was für Schritt 12 bleibt

- **Die Liste ist schon leer.** Schritt 12 leert nichts mehr; er weist nach: jede Lint-Regel
  einmal absichtlich verletzt (auch die für `dienste.ts`), `bauregel.test.ts` grün.
- **Der Hinweis aus D.10** (die gestellte Ausnahme deckt nur eine Datei in `login` mit einem Ziel)
  wird mit dem Vorab-Commit von 11a erledigt, sonst bleibt er für 12.
- **Kommentare:** `eslint.config.js` («Jede heutige Verletzung steht einzeln in AUSNAHMEN …
  Schritt 12 leert die Liste») und der Kopf von `importrichtung.test.ts`.
- **Feste Pfade in `bauregel.ts`:** Nach Schritt 11 bleibt dafür nichts [G, die Tabelle ist die
  einzige Stelle].
- **Zu bedenken, kein Auftrag:** Schritt 12 ist danach sehr klein. Ob er als eigener Schritt mit
  eigener Version bleibt oder am Ende von Schritt 11 mitläuft, ist eine Frage des Zuschnitts; die
  Übergangsregel «ab Schritt 12 ist die Liste leer» der `CLAUDE.md` stimmt in beiden Fällen.

#### Fragen an den Projektleiter

- **F-22** (Abschnitt 9.1): Schritt 11 in zwei Teilen (11a, 11b) oder als ein Schritt. Empfehlung:
  zwei Teile. Hält den Start nicht auf: Ohne Antwort gilt der Plan (ein Schritt).
- **F-23** (Abschnitt 9.1): Wortlaut der Regel «Eine neue Liste der Verwaltung kommt in …» der
  `CLAUDE.md` (Vorschlag aus D.8, dort ohne Frage geblieben). Schritt 11 ist der zweite
  Anwendungsfall. Hält den Start nicht auf.
- **Kein Entscheid nötig für:** die Zuordnung (eindeutig), die Namen der Dateien und Listen (Muster
  aus Schritt 09), den Ort von `melde` und der Hilfen des Gesprächs (ändert weder Verhalten noch
  Regel), das Streichen der Sperrliste (E-38 Zusatz 1, D.8).

#### Nicht geprüft, dünn belegt

- **Nichts ausgeführt.** Alle Aussagen zur Bauregel (toter Code nach dem Wegfall von `namen`, was
  lockerer und was strenger wird, `turnier/` auf `pfad` am echten Repo grün) sind am Code gelesen,
  nicht mit einer gestellten Datei geprüft.
- **`it.each` über eine leere Liste [V]:** nicht geprüft. Ausserhalb des Worktrees ist dafür nur
  eine Zeile gelesen (die installierte Vitest-Version im Hauptordner, 5.1.0); der Code von Vitest
  nicht.
- **Testdateien nur in Teilen:** Von `turnier/schnittstellen.db.test.ts` sind die Rümpfe der
  Zeilen 147 bis 333 und 446 bis 1129 nicht gelesen; welcher Block welche Funktion ruft, ist
  gezählt (Textsuche je Funktion und Zeilenbereich). `gespraech/schnittstellen.db.test.ts` und
  `mitteilung/admin-schnittstellen.db.test.ts` nur an Titeln und Importen. Ob die Tests des
  Gesprächs sich sauber in zwei Dateien teilen liessen, ist offen; nötig ist es nicht (eine Datei
  mit zwei Importen genügt).
- **E2E:** nur Dateinamen. Welche der 26 und der sechs ein E2E-Test abläuft, ist nicht gelesen.
- **Fachdateien:** `cm/verwaltung.ts`, `cm/verwaltung-doppel.ts`, `turnier/turniere.ts` nur an
  Import- und Export-Zeilen; dass kein Import-Kreis beim Laden entsteht, wenn `cm/` neu
  `turnier/turniere.ts` holt (und `turnier/turniere.ts` schon `cm/anmeldungen.ts`), ist nicht
  geprüft. Beide Richtungen gibt es heute schon zwischen Fachdateien, und alle Importe sind
  Funktionen, die erst im Aufruf gebraucht werden [V].
- **Kein Entwurf gebaut:** Zeilenzahlen der neuen Dateien sind aus den Bereichen geschätzt; die
  Namen der zwei Fachdateien sind Arbeitstitel.
- **Die 17 schreibenden von `admin/`** sind aus 42 errechnet; `admin/schnittstellen.ts` ist nicht
  gelesen.
- **`docs/superpowers/`:** nennt die alten Orte, als Geschichte geführt (E-15), nicht durchgesehen.
- **Nicht nachgeführt:** Die Zeile «Nächster offener Schritt» oben sagt weiter «Nachmessen vorab»
  (der Auftrag nannte nur «Vorab nachzumessen» und «Offene Fragen»); B-14, B-37 und die Hinweise
  zu Schritt 12 sind nicht berichtigt.
- **Zum Ablauf:** Ein Edit-Werkzeug stand nicht zur Verfügung; dieses Dokument ist per Skript
  geschrieben (jede Fundstelle genau einmal ersetzt, Kopie des alten Stands im Scratchpad der
  Session). Geändert ist nur diese Datei.

### D.12 Schritt 11, Lauf 1

**Erkenntnisse Schritt 11, Lauf 1** (12.11.2026, Branch `refactor/schritt-11`, ab `5291676` =
`origin/dev` `a07d7a0` plus das Nachmessen D.11; Turnier, CM und Gespräch, Variante A von F-17)

- **Voraussetzungen geprüft:** 06a, 07, 09 und 10 erledigt, Nachmessen liegt vor (D.11), E-38 gilt,
  kein Entscheid nötig (E-40). Keine Freigabe fehlte, keine neue Abhängigkeit (im Worktree nur
  `npm ci --ignore-scripts`). Der Lauf wurde einmal durch eine Nutzungsgrenze unterbrochen und
  im selben Worktree fortgesetzt; danach lief Docker nicht mehr und wurde für die Datenbanktests
  wieder gestartet (`make db`).
- **Commits:** `e2aafd6` `test:` eindeutige Turnierjahre (vom Orchestrator vorab beauftragt,
  ausserhalb des Plans); `959c940` `test:` Vorab-Tests (Bereich `cm` über 26 Namen, zweite gestellte
  Ausnahme); `62f990a` `refactor:` Bauregel, `turnier/schnittstellen.ts` von `offen` auf `pfad`;
  `9de0baa` `refactor:` Gespräch; `95a1899` `refactor:` CM; `67ec8a2` `docs:` arc42, CI/CD,
  Context-Scopes. Dazu dieser `docs:`-Commit.
- **Turnierjahre (`e2aafd6`):** Zwölf Datenbanktests zogen ein Jahr zufällig (sieben Dateien mit
  `zufallsJahr`, drei Stellen inline, zwei in `schema.db.test.ts`, zwei eigene Bereiche). Neu
  `tests/hilfen/turnierjahre.ts`: eine Tabelle Datei → Bereich ohne Überschneidung und ein Zähler
  je Bereich (auch über zwei Stellen derselben Datei); `naechstesJahr(4)` gibt einen Block für den
  Test mit vier Jahren hintereinander (FR-33 in `cm/anmeldungen.db.test.ts`; mit dem Zähler allein
  wäre seine Schleife nie fertig geworden). Eine Datei ohne Bereich bricht ab. Die Bereiche bleiben
  in den alten Grenzen (3000 bis 8999 aufgeteilt, 9100 bis 9899, 9960 bis 9999, `schema` 10000
  bis 92999), weil Tests aus dem Jahr ein Datum für `new Date` bauen (vierstellig). Geprüft, ob
  Jahre liegen bleiben: Jeder `vitest run` legt in `tests/setup/datenbank-global.ts` eine frische
  Datenbank an und löscht sie danach; die Tests räumen ihre Turniere nicht auf, brauchen es aber
  nicht. Ein Test, der das Jahr mit dem laufenden Jahr vergleicht, liegt in einer eigenen
  Datenbank (`gespraech.db.test.ts`, `offeneGespraecheGesamt`) und hängt nicht am Bereich. Keine
  Erwartung geändert. Rot: zwei Bereiche überlappend → «kein Jahr gehört zwei Dateien» rot; Block
  zählt nur eins weiter → zwei Fälle rot. Der Eintrag in `docs/beobachtungen.md` steht jetzt im
  Archiv («Erledigt im Refactoring, Schritt 11»).
- **Vorab-Tests (`959c940`), grün auf dem alten Stand:** Rechte-Matrix «Bereich cm»: die 26 Namen
  wörtlich, je über `alleVerwaltung()`: Mitglieder-Admin 403 `kein-admin`, CM-Admin weder 401 noch
  403; durch den Umzug unverändert. `importrichtung.test.ts`: gestellte Ausnahme `cm/gestellt.ts`
  mit zwei Zielen in zwei Modulen (`turnier/schnittstellen.ts`, `anlass/verwaltung-schnittstellen.ts`):
  beide frei, vier andere Ziele und eine andere Datei gemeldet, ohne eine der zwei genau ihr Ziel
  gemeldet (drei Tests). Rot: `getSpieler` mit Bereich `mitglieder` → Charakterisierung rot
  (`getSpieler` 200 statt 403); nur die erste Ausnahme je Datei → «zwei Ziele» rot; Dateien mit
  Ausnahme ohne Regel (`rules: {}`) → fünf Fälle rot, darunter die zwei neuen Proben.
- **`it.each` über eine leere Liste [G]:** Vitest 5.1 meldet für eine Datei, die nur ein leeres
  `it.each` enthält, «no tests» und Exit 1; in einer Datei mit weiteren Tests entsteht kein Fall,
  die Datei bleibt grün (gestellt im Worktree geprüft). In `importrichtung.test.ts` fällt die Probe
  «Ausnahme … ist noch nötig» darum still weg (52 statt 53 Tests); nicht umgebaut, weil die
  gestellten Ausnahmen die Mechanik prüfen und eine neue echte Ausnahme die Probe von selbst
  wieder erzeugt.
- **Bauregel (`62f990a`, dann je eine Zeile in den zwei Umzügen):** `VERWALTUNGS_DATEIEN` hat
  `turnier/schnittstellen.ts`, `cm/verwaltung-schnittstellen.ts` und
  `gespraech/verwaltung-schnittstellen.ts` mit `pfad`; die Zeile der Mitteilungen (`namen`) ist
  unverändert. `bauregel.test.ts` 63 → 71: ein `describe.each` über die drei Zeilen, je «Admin-Route
  nur mit Einträgen der Liste» und «ausserhalb von `api/admin/` elf Importformen gemeldet»;
  `LISTEN`, `DATEIEN` und `betrifftBauregel` mit den neuen Dateien. Rot: je Zeile mit `offen`
  statt `pfad` der Fall «ausserhalb» rot; je Zeile gestrichen am echten Repo die Admin-Routen der
  Datei (drei beim Gespräch, elf bei der CM), Exit 1; eine Mitglieder-Route mit Import aus
  `turnier/schnittstellen.ts`, aus `$lib/server/gespraech/verwaltung-schnittstellen` und mit
  `export * from …/cm/verwaltung-schnittstellen.js` → je Befund, Exit 1. Am echten Repo
  `bauregel: ok`.
- **Gespräch (`9de0baa`):** Die vier Funktionen und `meldeAntwort` (76 Zeilen) stehen per Skript
  ausgeschnitten und Zeichen für Zeichen in `gespraech/verwaltung-schnittstellen.ts` (97 Zeilen),
  Liste `GESPRAECH_ADMIN_SCHNITTSTELLEN` (4, `satisfies` gegen `MitteilungAdminDienste`). Die vier
  geteilten Hilfen mit `TEXT_MIN` und `TEXT_MAX` in `gespraech/antworten.ts` (22 Zeilen; nur
  `export` dazu). `gespraech/schnittstellen.ts` 187 → 72 Zeilen. `turnier/schnittstellen.ts`
  verliert Import, Weiterreichen und vier Einträge; `AUSNAHMEN` ist `[]`, der Kopfkommentar von
  `eslint.config.js` nachgeführt. Drei Admin-Routen nur an der Import-Zeile.
- **CM (`95a1899`):** Die 13 Funktionen (248 Zeilen) und die sieben Hilfen stehen Zeichen für Zeichen
  in `cm/verwaltung-schnittstellen.ts` (341 Zeilen), Liste `CM_ADMIN_SCHNITTSTELLEN` (13). `melde`
  unverändert, nur exportiert, in `cm/verwaltung-meldung.ts`; Turnier (`meldeHinfaellige`) und CM
  holen sie dort. `turnier/schnittstellen.ts` 513 → 160 Zeilen, `TURNIER_SCHNITTSTELLEN` 9. Elf
  Admin-Routen nur an der Import-Zeile. Kein Kreis beim Laden: `cm/verwaltung-schnittstellen.ts` →
  `turnier/turniere.ts` → `cm/anmeldungen.ts` → `turnier/kontakt.ts` führt nicht zurück; alle
  Testdateien laden.
- **Rot belegt (Umzüge, je aus einer Sicherungskopie zurückgesetzt, `git diff` danach gleich):**
  `getAdminGespraech` bzw. `getSpieler` mit Bereich `mitglieder` → Charakterisierung und Schleife
  des Moduls rot (dazu je ein Ablauf-Test); die neue Liste aus `VERWALTUNGS_LISTEN` genommen →
  Routen-Test rot (beim Gespräch dazu Grundprüfung 3 rot: 58 statt 62, 40 statt 42);
  `turnier/schnittstellen.ts` mit `export … from '../gespraech/schnittstellen.ts'` → ESLint «ein
  Thema importiert nicht die Schnittstellen eines anderen Moduls» (keine Ausnahme mehr);
  `cm/schnittstellen.ts` bzw. `turnier/schnittstellen.ts` importiert
  `gespraech/` bzw. `cm/verwaltung-schnittstellen.ts` → dieselbe Meldung.
- **Tests je Datei, vorher (Stand `a07d7a0`) → nachher:** `turnier/schnittstellen.db.test.ts` 24 → 9;
  `cm/verwaltung-schnittstellen.db.test.ts` neu 16 (die 15 der zwei CM-Blöcke samt dem Test über
  die Grenze, Zeichen für Zeichen, und die Rechte-Schleife über die 13); `gespraech/schnittstellen.db.test.ts`
  15 → 16 (Rechte-Schleife über die vier); `admin/rechte-matrix.db.test.ts` 9 → 10;
  `scripts/importrichtung.test.ts` 50 → 52 (+3 vorab, −1 die Probe der gestrichenen Ausnahme);
  `scripts/pruefungen/bauregel.test.ts` 63 → 71; `tests/hilfen/turnierjahre.test.ts` neu 4;
  `routen.test.ts` 3 und `grundpruefung.db.test.ts` 7 unverändert. Kein Test ging verloren: Die 24
  des Turniers sind 9 + 15.
- **Abweichungen von D.11:**
  1. *Sieben Commits statt fünf:* Turnierjahre vorab (Auftrag), die drei Doku-Zeilen als eigener
     `docs:`-Commit vor dem Prüflauf, dieses Protokoll danach.
  2. *Bauregel-Fall als `describe.each`* über alle Zeilen mit `pfad` ausser den Anlässen, elf statt
     16 Formen (die Anlässe behalten ihre 16).
  3. *Rechte-Schleife des Gesprächs* als neuer Test in `gespraech/schnittstellen.db.test.ts`, keine
     eigene Testdatei; die Datei importiert Mitglieder- und Verwaltungs-Funktionen getrennt.
  4. *Rechte-Matrix:* `getTurniere` weiter über `TURNIER_SCHNITTSTELLEN`, die drei der CM über
     `CM_ADMIN_SCHNITTSTELLEN`.
  5. *Test über die Grenze* zieht mit den CM-Blöcken und holt `postKategorie` und
     `postKategorieAbsagen` aus `../turnier/schnittstellen.ts` (D.11, erster Weg). In der neuen
     Testdatei ist ein Kommentar ohne den Verweis auf «die festen Jahre oben» angepasst, und der
     Bereich der Turnierjahre zieht mit (Schlüssel in `tests/hilfen/turnierjahre.ts` umbenannt).
  6. *Namen der Fachdateien:* `cm/verwaltung-meldung.ts` und `gespraech/antworten.ts` wie die
     Arbeitstitel.
  7. *`gespraech/schnittstellen.ts`:* Kopfkommentar auf die Mitglieder beschränkt, die Marke
     «---- Mitglied ----» entfällt.
  Sonst wie D.11: Grundprüfung ohne Änderung, Routen-Test nur Importe, `CLAUDE.md` unverändert.
- **Prüfläufe:** jeder Commit mit dem Hook `check-schnell`, grün. Voller `make check` auf dem
  Code-Endstand `67ec8a2`: **Exit 0** (Lint; `svelte-check` 1534 Dateien ohne Fehler und Warnung;
  Prüfskripte samt `bauregel: ok`; Einheits- und Datenbanktests 152 Dateien mit 1959 Tests,
  Abdeckung 97,07 % Anweisungen, 93,56 % Zweige; beide Builds; E2E 414 bestanden, 57
  übersprungen, 3,6 Minuten; Image). Gegen Schritt 10 (150 Dateien, 1942 Tests): +2 Dateien
  (`cm/verwaltung-schnittstellen.db.test.ts`, `tests/hilfen/turnierjahre.test.ts`), +17 Tests (4
  Turnierjahre, 1 Rechte-Matrix, +2 Lint, +8 Bauregel, 2 Rechte-Schleifen). Den grünen Stand hat
  `make check` nicht gemerkt, weil während des Laufs die zwei Dateien `docs/beobachtungen*.md`
  dieses Commits schon geändert im Arbeitsbaum lagen (kein Code). Kein fremder Prüflauf auf der
  Maschine (Last um 3 bis 4).
- **Was kein Test sieht:**
  - dass `gespraech/antworten.ts` und `cm/verwaltung-meldung.ts` keine Schnittstellen-Dateien sind:
    Der Routen-Test ersetzt sie nicht durch Aufzeichner (gewollt), die Bauregel kennt sie nicht,
    eine Route ausserhalb von `api/admin/` dürfte sie importieren. `antworten.ts` baut Antworten
    (`antwort`, `nichtGefunden`); es ist keine Fachlogik, sondern die geteilte Hilfe zweier
    Schnittstellen-Dateien — zur Prüfung im Review gegen «Fachfunktionen kennen kein HTTP»;
  - die Probe «Ausnahme … ist noch nötig» bei leerer Liste (oben);
  - dass die Kopfkommentare der neuen Dateien stimmen;
  - weiter wie vorher: Admin-Routen prüfen den Namen gegen die Vereinigung aller Listen, nicht gegen
    die Liste ihrer Datei (D.8, Abweichung 2).
- **Ausserhalb des Schritts aufgefallen, nicht behoben:**
  - Die Meldung der Lint-Regel sagt weiter «Heutige Verletzungen stehen in AUSNAHMEN
    (eslint.config.js)», obwohl die Liste leer ist. Ein Fall in `importrichtung.test.ts` prüft den
    Text nicht wörtlich; Schritt 12 (Kommentare, D.11 «Was für Schritt 12 bleibt»).
  - Der Typ `MitteilungAdminDienste` heisst nach den Mitteilungen, ist aber jetzt der Dienst-Typ
    von `turnier/`, `cm/` und `gespraech/`-Verwaltung (D.11, zur Kenntnis).
- **Für Lauf 2:** Die Zeile `mitteilung/schnittstellen.ts` (`namen`) und die Sperrliste stehen
  unverändert; `bauregel.test.ts` nennt die Mitteilungen in `LISTEN` und `DATEIEN` an der fünften
  bzw. sechsten Stelle. `tests/hilfen/verwaltungs-listen.ts` hat schon die sechs Einträge des
  Zielzustands (`admin`, `turnier`, `'cm-admin'`, `'gespraech-admin'`, `'mitteilung-admin'`,
  `'anlass-admin'`); in Lauf 2 ändert sich dort nur der Pfad der Mitteilungen.

### D.13 Schritt 11, Lauf 2

**Erkenntnisse Schritt 11, Lauf 2** (12.11.2026, Branch `refactor/schritt-11` ab `fa763e6`, nach
dem Review «ok» von Lauf 1; die Mitteilungen, E-38 Zusatz 1)

- **Voraussetzungen geprüft:** Lauf 1 gereviewt «ok», D.11 gilt, kein Entscheid nötig (E-40);
  keine neue Abhängigkeit, keine neue Lint-Ausnahme.
- **Commits:** `dd80e41` `refactor:` sechs Funktionen nach `mitteilung/verwaltung-schnittstellen.ts`,
  Zeile der Tabelle auf `pfad`, Fälle der Sperrliste auf die Pfad-Sperre umgestellt; `b519b16`
  `refactor:` toter Code der Bauregel gestrichen; `5fc7ce5` `docs:` arc42 und CI/CD. Dazu dieser
  `docs:`-Commit.
- **Verschieben:** Der Teil ab «--- Verwaltung ---» (127 Zeilen: `AdminHandler`, `Ziel`, `Versand`,
  `bezug`, `mitZiel`, `verlauf`, `mitEmpfaengern`, `vorschauFuer`, `sendenFuer`, die sechs
  Konstanten und die Liste) steht per Skript ausgeschnitten und Zeichen für Zeichen in der neuen
  Datei (146 Zeilen); `mitteilung/schnittstellen.ts` 208 → 65 Zeilen, nur die vier der Mitglieder.
  Keine geteilte Hilfe (wie D.11). Einstieg `holeMitteilungAdminDienste` und der Typ in
  `mitteilung/typen.ts` unverändert, dort nur der Kopfkommentar. Sechs Admin-Routen nur an der
  Import-Zeile. `mitteilung/admin-schnittstellen.db.test.ts` heisst
  `verwaltung-schnittstellen.db.test.ts` (`git mv`, nur der Import); Routen-Test (ein Import-Block
  wird zwei), Rechte-Matrix und `tests/hilfen/verwaltungs-listen.ts` nur am Import. Ein Kommentar in
  `tests/e2e/mitteilungen.test.ts` nennt den neuen Namen der Testdatei. Kein Kreis beim Laden:
  Die neue Datei holt nur Fachdateien ihres Moduls, `admin/rechte.ts`, `http.ts` und
  `src/lib/mitteilung/`.
- **Bauregel, Umzug (`dd80e41`):** Die Zeile zeigt auf `mitteilung/verwaltung-schnittstellen.ts` mit
  `pfad`; danach gibt es keine Zeile `namen` und keine `offen`. `bauregel.test.ts` 71 → 74:
  - mit dem Wechsel der Zeile wurden 14 Fälle rot: acht hingen an der Sperrliste, fünf nur am
    Meldungstext `DATEIEN`, einer an `betrifftBauregel`. Die acht prüfen jetzt die Pfad-Sperre der
    neuen Datei, keiner ist ersatzlos gestrichen: «Mitteilungen der Verwaltung nur aus …» (Pfad der Liste), «keine
    Dienste und Schnittstellen der Verwaltung ausserhalb» (Name `postVereinSenden` → Import der
    neuen Datei; `import()` und `export *` der neuen Datei), «Namen in Anführungszeichen»
    (`export { 'postVereinSenden' as p }` aus der neuen Datei; der Escape-Fall an der Sperrliste
    wird ein Escape-Fall an der Erlaubt-Liste von `dienste.ts`, `'holeProfilDienst\x65'`), die vier
    Literal-Fälle in «Text in Anführungszeichen verschluckt keinen Import», `betrifftBauregel`
    und `DATEIEN`;
  - neu: die Zeile der Mitteilungen im `describe.each` der Pfad-Sperre (zwei Fälle), dazu dort zwei
    Formen für alle Zeilen (Name in Anführungszeichen, Name mit Escape); «die Datei der Mitglieder
    ist ausserhalb von api/admin in jeder Form frei» (die gewollte Lockerung); «Admin-Route
    importiert die Datei der Mitglieder» (die neue Strenge); `betrifftBauregel` lässt
    `mitteilung/schnittstellen.ts` und `gespraech/schnittstellen.ts` aus.
- **Bauregel, toter Code (`b519b16`):** gestrichen sind die Arten `namen` und `offen` im Typ
  `Aussen`, `GEMISCHT`, der Parameter `gemischt`, die Zweige «Name der Liste» und «lässt sich nicht
  lesen» samt `inAnfuehrungszeichen`. Die Funktion prüft nur noch Importe aus `dienste.ts` und
  heisst `pruefeDiensteImporte`. `bauregel.test.ts` dabei unverändert grün (74).
- **Vergleich alter gegen neuer Bauregel** (eigenes Skript nach der Vorlage des Reviewers aus Lauf 1,
  im Scratchpad der Session: `l2/vergleich.ts`; fünf Arten von Routen, vier Schreibweisen des Pfads,
  19 Quellen, sechs Endungen, 15 Namen, 27 Formen, drei Arten der Listen; die alte Fassung mit dem
  Aufbau vor Lauf 2, die neue mit dem danach):
  1. `bauregel.ts` aus `fa763e6` gegen `b519b16`, die sechs Admin-Routen mit ihrer neuen
     Import-Zeile: **2 741 040 Fälle; ein Befund der alten Fassung fehlt in 11 208 Fällen, alle
     «andere Route, Quelle `mitteilung/schnittstellen`»** — genau die eine erwartete Lockerung
     (z. B. `import * as d from …/mitteilung/schnittstellen.ts` in `/api/profil`: alt «nur
     statisch und mit Namen», neu frei; ein Verwaltungsname daraus, den es dort nicht mehr gibt,
     war alt ein Befund). An Admin-Routen keine Abweichung. Strenger in 75 384 Fällen, alle
     «andere Route, Quelle `mitteilung/verwaltung-schnittstellen`» (die neue Datei war vorher
     ungeschützt, weil es sie nicht gab).
  2. Ohne die Umstellung der Admin-Routen dazu strenger: Admin-Route mit Import aus
     `mitteilung/schnittstellen` (192 Fälle; alt erlaubt, neu nicht).
  3. `dd80e41` gegen `b519b16` (nur der tote Code): 2 770 200 Fälle in beiden Aufbauten, **0
     Abweichungen**.
  Am echten Repo `bauregel: ok`.
- **Rot belegt** (je aus einer Sicherungskopie zurückgesetzt, `git diff` danach gleich): Zeile der
  Mitteilungen mit `namen` statt `pfad` → 7 Fälle rot (Pfad-Sperre, Sperrliste-Fälle als
  Pfad-Fälle, Literal-Fälle); Zeile gestrichen → am echten Repo die sechs Admin-Routen der
  Mitteilungen; `/api/admin/mitteilungen` importiert `postThemen` aus
  `mitteilung/schnittstellen.ts` → Befund «erlaubt sind nur …», Exit 1 (neu); `/api/benachrichtigungen`
  importiert `getVereinMitteilungen` über `$lib` aus der neuen Datei → Befund, Exit 1; die neue
  Testdatei gegen die alte `bauregel.ts` → 17 Fälle rot, darunter die Lockerung und die neue
  Strenge; im gekürzten `pruefeDiensteImporte` die Meldung für die Einstiege der Verwaltung
  gestrichen → 10 Fälle rot (die vereinfachte Funktion wirkt).
- **Tests je Datei, vorher (`fa763e6`) → nachher:** `scripts/pruefungen/bauregel.test.ts` 71 → 74;
  `mitteilung/admin-schnittstellen.db.test.ts` 10 → `mitteilung/verwaltung-schnittstellen.db.test.ts`
  10; `mitteilung/schnittstellen.db.test.ts` 12, `admin/rechte-matrix.db.test.ts` 10,
  `routen.test.ts` 3, `grundpruefung.db.test.ts` 7 unverändert. Kein Fall ging verloren, keine
  Erwartung ausser den Meldungen der Bauregel änderte sich.
- **Abweichungen von D.11:**
  1. *Tests der Sperrliste im Umzugs-Commit, nicht im Streich-Commit:* Sobald die Zeile auf `pfad`
     zeigt, hängen die Fälle nicht mehr an der Sperrliste und müssen im selben Commit umgestellt
     werden; der Streich-Commit ändert keinen Test, das belegt, dass der Code tot war.
  2. *Der Escape-Fall* der Sperrliste prüft jetzt die Erlaubt-Liste von `dienste.ts`; die
     Pfad-Sperre meldet jeden Namen, auch mit Escape (Form im `describe.each`).
  3. *Name der Funktion:* `pruefeVerwaltungImporte` heisst `pruefeDiensteImporte`.
  4. *Doku-Zeilen:* `docs/context-scopes.md` nennt die Mitteilungen nur am Ordner und blieb
     unverändert.
- **Prüfläufe:** jeder Commit mit dem Hook `check-schnell`, grün. Voller `make check` auf dem Code-Endstand `5fc7ce5` bei sauberem Arbeitsbaum: **Exit 0** (Lint; `svelte-check` 1535 Dateien ohne Fehler und Warnung; Prüfskripte samt `bauregel: ok`; Einheits- und Datenbanktests 152 Dateien mit 1962 Tests, Abdeckung 97,07 % Anweisungen, 93,56 % Zweige; beide Builds; E2E 414 bestanden, 57 übersprungen, 3,6 Minuten; Image; grüner Stand `151c1aa09229` gemerkt). Gegen Lauf 1 (1959 Tests): +3 in `bauregel.test.ts`. Kein fremder Prüflauf auf der Maschine.
- **Was kein Test sieht:**
  - wie Lauf 1: Admin-Routen prüfen den Namen gegen die Vereinigung aller Listen, nicht gegen die
    Liste ihrer Datei; die Hilfsdateien `cm/verwaltung-meldung.ts` und `gespraech/antworten.ts` kennt
    die Bauregel nicht;
  - dass ein Verwaltungs-Name in `mitteilung/schnittstellen.ts` wieder auftaucht: Die Datei ist nun
    frei; dagegen steht nur der Routen-Test (eine Admin-Route darf sie nicht importieren) und die
    Grundprüfung (eine Schnittstelle ohne Liste wird nicht geprüft);
  - weiter offen wie nach Schritt 09: nicht normalisierte Pfade, `import.meta.glob`, Weiterreichen
    über `src/lib/` ausserhalb von `server/`, `export { x as 'actions' }`.
- **Für Schritt 12 notiert (aus dem Review von Lauf 1):** `expect(AUSNAHMEN).toEqual([])` als Test;
  die veraltete Lint-Meldung «Heutige Verletzungen stehen in AUSNAHMEN» (`eslint.config.js`,
  Zeile 109); der Wortlaut «Statuscode und Antwort baut nur die Schnittstellen-Funktion» der
  `CLAUDE.md` ist bei `gespraech/antworten.ts` gedehnt (wie bei `admin/rechte.ts`). In die Hinweise
  zu Schritt 12 übernommen; `CLAUDE.md` unverändert.
- **Ausserhalb des Schritts aufgefallen, nicht behoben:** Der Plan unter
  `docs/superpowers/plans/2026-11-06-mitteilungen-push.md` nennt noch
  `mitteilung/admin-schnittstellen.db.test.ts`; historisch (E-15), bleibt.
- **Review von Lauf 2 und Urteil über den ganzen Schritt 11 (12.11.2026): «ok», kein Befund vor dem
  Merge.** Eigener voller `make check` des Reviewers auf `f3203e2`: Exit 0, 152 Dateien mit 1962
  Tests, Abdeckung 97,07 % Anweisungen und 93,56 % Zweige, E2E 414 bestanden und 57 übersprungen,
  grüner Stand `151c1aa09229`. Eigener Vergleich der Bauregel in drei Fassungen über 926 640
  gestellte Importe: «alt Befund, neu keiner» nur in der erwarteten Lockerung (andere Route, Quelle
  `mitteilung/schnittstellen`) und im Spiegelbild der Admin-Routen (neue Datei erlaubt, alte nicht
  mehr); das Streichen des toten Codes ergibt 0 Abweichungen; Anführungszeichen und Escapes bleiben
  zu.
- **Restlücke nach Lauf 2 (Review, klein und nicht neu):** Eine Verwaltungs-Funktion, die in einer
  Mitglieder-Datei auftaucht und in einer Mitglieder-Liste steht, liefe durch keine 403-Schleife;
  die Rechte hingen allein an `liest`/`schreibt` in der Funktion. **Vorschlag für Schritt 12:** eine
  Regel (ESLint oder Bauregel), dass `liest` und `schreibt` aus `admin/rechte.ts` nur in den Dateien
  der Tabelle `VERWALTUNGS_DATEIEN` importiert werden; heute ist das genau so erfüllt.
- **Form:** `scripts/pruefungen/bauregel.ts`, Zeile 93, ist ein überlanger Kommentar (Lint grün); mit
  Schritt 12 umbrechen.
- **Zum Ablauf:** Lauf 1 wurde einmal durch eine Nutzungsgrenze unterbrochen und fortgesetzt; der
  Reviewer hat nichts Halbfertiges gefunden. F-22 (Schritt teilen) wurde nicht gestellt; der Schritt
  lief als ein Schritt mit einem Merge in zwei Läufen mit je eigenem Review. Der Vorab-Commit
  `e2aafd6` (eindeutige Turnierjahre) liegt ausserhalb des Plans und behebt den Flake, der die CI
  zum Merge von Schritt 10 einmal rot machte.

### D.14 Schritt 12

**Erkenntnisse Schritt 12** (12.11.2026, Branch `refactor/schritt-12` ab `origin/dev` `5ffbc6d`,
Version 0.20.17; Importregeln scharf stellen, letzter Schritt der Etappe 1)

- **Voraussetzungen geprüft:** 05, 06, 06a, 07, 09, 10 und 11 erledigt (Tabelle 7.3), `AUSNAHMEN`
  ist `[]`, kein Nachmessen verlangt, kein Entscheid nötig (E-40). Keine neue Abhängigkeit (im
  Worktree nur `npm ci --ignore-scripts`), keine neue Lint-Ausnahme, kein App-Code geändert.
- **Commits:** `bdaa17a` `test:` «`AUSNAHMEN` ist leer»; `6ea55cd` `refactor:` Meldung der
  Importrichtung samt Test des Texts, Kommentar zu `AUSNAHMEN`, Kopf von `importrichtung.test.ts`;
  `787764d` `refactor:` Kommentar der Bauregel umgebrochen; `b02ea53` `fix:` Regel für
  `liest`/`schreibt` in der Bauregel samt Fällen; `83ccfcc` `docs:` arc42 und CI/CD. Dazu dieser
  `docs:`-Commit.
- **«`AUSNAHMEN` ist leer» (`bdaa17a`):** `expect(AUSNAHMEN).toEqual([])` in
  `scripts/importrichtung.test.ts`; Liste, `baueImportrichtung` und die Probe «Ausnahme … ist noch
  nötig» bleiben, die zwei gestellten Ausnahmen prüfen die Mechanik weiter. **Rot belegt:** (a)
  gestellter Eintrag `turnier/schnittstellen.ts` → `gespraech/schnittstellen.ts` ohne Import → zwei
  Fälle rot («ist noch nötig» und «ist leer»); (b) derselbe Eintrag mit einem echten Import in
  `turnier/schnittstellen.ts` → `eslint` Exit 0, nur «ist leer» rot. Das ist der Fall, den der Test
  schliesst: Eine gebrauchte Ausnahme fiel vorher keinem Test auf. Beides zurückgesetzt.
- **Meldung (`6ea55cd`):** vorher «Falsche Richtung: … Heutige Verletzungen stehen in AUSNAHMEN
  (eslint.config.js).», jetzt «Falsche Richtung: <Ebene>. Es gibt keine Ausnahme; eine neue
  (AUSNAHMEN in eslint.config.js) braucht den Entscheid des Projektleiters.» (gilt auch für die
  Meldung zu `dienste.ts`). Kein bestehender Test erwartete den alten Text wörtlich (die Fälle zu
  `dienste.ts` prüfen nur die Ebene); neu prüft ein Fall den Text an `login`. **Rot belegt:** neuer
  Fall gegen die alte `eslint.config.js` → rot, mit der neuen grün. ESLint stellt seinen eigenen
  Satz voran («'…' import is restricted from being used by a pattern.»), darum `stringContaining`.
- **Jede Regel einmal verletzt** (Skript im Scratchpad der Session, `s12/proben.py`: Zeile vorn in
  die Datei, `npx eslint --format json`, Meldung in Zeile 1, Datei aus Sicherungskopie zurück bzw.
  gelöscht; danach `git status` sauber). Alle 22 mit Exit 1 und genau einer Meldung:

  | Regel | Probe (Datei: Zeile) | Meldung (Ebene) |
  |-------|----------------------|-----------------|
  | `db` | `db/probe.ts` (neu): `import { x } from '../datum.ts'` | db importiert aus dem Server nichts |
  | `db` | `db/index.ts` (bestehend): `import { x } from '../login/sitzung.ts'` | db importiert aus dem Server nichts |
  | `db`, Ordner | `db/probe.ts` (neu): `import { x } from '..'` | db importiert aus dem Server nichts |
  | unterste Schicht | `probe.ts` (neu): `import { x } from './login/sitzung.ts'` | Dateien direkt unter src/lib/server/ importieren nur db |
  | unterste Schicht | `http.ts` (bestehend): `import { x } from '$lib/server/admin/rechte'` | Dateien direkt unter src/lib/server/ importieren nur db |
  | `login` | `login/probe.ts` (neu): `import { x } from '../admin/rollen.ts'` | login importiert kein Thema |
  | `login` | `login/sitzung.ts` (bestehend): `import { x } from '../cm/anmeldungen.ts'` | login importiert kein Thema |
  | `login`, Ordner | `login/probe.ts` (neu): `import { x } from '$lib/server/admin'` | login importiert kein Thema |
  | Thema → Schnittstellen | `anlass/probe.ts` (neu): `import { x } from '../cm/schnittstellen.ts'` | ein Thema importiert nicht die Schnittstellen eines anderen Moduls |
  | Thema → Schnittstellen | `turnier/schnittstellen.ts` (bestehend): `export type { CmDienste as _P } from '../gespraech/schnittstellen.ts'` | dieselbe |
  | Thema → `login` | `profil/probe.ts` (neu): `import type { X } from '../login/passkey-schnittstellen.ts'` | dieselbe |
  | Thema → `verwaltung-schnittstellen` | `cm/probe.ts` (neu): `import { x } from '../anlass/verwaltung-schnittstellen.ts'` | dieselbe |
  | Thema → `verwaltung-schnittstellen` | `cm/schnittstellen.ts` (bestehend): `import { x } from '$lib/server/mitteilung/verwaltung-schnittstellen'` | dieselbe |
  | `dienste.ts`, Thema | `anlass/probe.ts` (neu): `import { x } from '../dienste.ts'` | kein Modul unter src/lib/server/ importiert dienste.ts (oberste Schicht) |
  | `dienste.ts`, Thema | `mitteilung/typen.ts` (bestehend): `import { x } from '$lib/server/dienste'` | dieselbe |
  | `dienste.ts`, `login` | `login/probe.ts` (neu): `export { x } from '../dienste.js'` | dieselbe |
  | `dienste.ts`, unterste Schicht | `probe.ts` (neu): `import { x } from './dienste.ts'` | dieselbe |
  | `dienste.ts`, `db` | `db/probe.ts` (neu): `import { x } from '../dienste.ts'` | db importiert aus dem Server nichts (eigene Regel, wie geplant) |
  | `sitzung` → Schnittstellen | `sitzung/probe.ts` (neu): `import { x } from '../admin/schnittstellen.ts'` | ein Thema importiert nicht die Schnittstellen eines anderen Moduls |
  | `sitzung` → `verwaltung-schnittstellen` | `sitzung/schnittstellen.ts` (bestehend): `import { x } from '../cm/verwaltung-schnittstellen.ts'` | dieselbe |
  | `login` → `sitzung` | `login/probe.ts` (neu): `import { x } from '../sitzung/schnittstellen.ts'` | login importiert kein Thema |
  | Thema → `sitzung` | `anlass/probe.ts` (neu): `import { x } from '../sitzung/schnittstellen.ts'` | ein Thema importiert nicht die Schnittstellen eines anderen Moduls |

  Dazu die zwei Wächter des Tests: neuer Ordner `src/lib/server/neu/` → «genau die Ordner» rot;
  Unterordner `cm/sub/` → «keine Unterordner» rot; beide entfernt. `dienste.ts` selbst darf alles
  (vier Fälle im Test, unverändert grün).
- **Bauregel, Form und feste Pfade (`787764d`):** Kommentar der Zeile 93 auf drei Zeilen. Feste
  Pfade: nur die Tabelle `VERWALTUNGS_DATEIEN`, `ADMIN_MODUL`, `SERVER` und die Muster für Routen;
  die Schritte 07, 09 und 11 haben nichts stehen lassen. `bauregel.test.ts` dabei unverändert grün.
- **Neue Regel `liest`/`schreibt` (`b02ea53`):**
  - *Am Repo vorher geprüft:* `liest`/`schreibt` importieren genau `admin/schnittstellen.ts`,
    `turnier/schnittstellen.ts` und die vier `verwaltung-schnittstellen.ts`; dazu nur ein Test
    (`admin/schnittstellen.db.test.ts`). Andere Dateien holen aus `admin/rechte.ts` nur Typen
    (`dienste.ts`, `mitteilung/typen.ts`, `cm/verwaltung-meldung.ts`; Tests und
    `tests/hilfen/verwaltungs-listen.ts`).
  - *Ort:* in `bauregel.ts`, gespeist aus `VERWALTUNGS_DATEIEN` (Meldung und Freigabe). ESLint
    hätte die Tabelle verdoppeln müssen (`no-restricted-imports` mit `importNames` je Datei, die
    Liste der freien Dateien als `ignores`); darum nicht dort.
  - *Was sie meldet:* in jeder Datei unter `src/` ausser `src/routes/` und Tests (`istTestquelle`
    aus `dateien.ts`), die nicht in der Tabelle steht, jeden Import aus `src/lib/server/admin/rechte`
    (Pfad aufgelöst: relativ und normalisiert, auch `./../`; über `$lib` mit `.ts`, `.js`, ohne
    Endung, mit Anhang, aber **nicht normalisiert**, berichtigt im Nachtrag unten), der `liest` oder `schreibt` nennt (auch umbenannt, in Anführungszeichen, als
    `export … from`), einen Namen, der kein schlichter Bezeichner ist (Escape, Kommentar statt
    Leerzeichen um `as`), oder ohne Namen auskommt (`* as`, `export *`, Standard-Import, Import ohne
    Klausel, `import()`). Routen sind ausgenommen, weil ihre eigenen Regeln strenger sind (keine
    Route ausserhalb von `api/admin/` darf `lib/server/admin` nutzen, Admin-Routen nur die Tabelle
    und `dienste.ts`); so gibt es keine doppelte Meldung.
  - *Auswahl der Dateien:* `betrifftBauregel` blieb unverändert (seine Fälle sagen, dass
    Mitglieder-Dateien für die Routen-Regeln frei sind); die neue `betrifftRechteImporte` wählt die
    Dateien der neuen Regel, der Aufruf nimmt beide.
  - *Fälle:* `bauregel.test.ts` 74 → 115 (41 neu). **Rot belegt:** die 28 Fälle mit Befund bzw. zu
    `betrifftRechteImporte` vor der Umsetzung rot; danach je aus einer Sicherungskopie
    zurückgesetzt, `cmp` gleich: `RECHTE_PRUEFUNG` leer → 12 Fälle rot; Prüfung des Bezeichners
    weg → 3 rot; Tests nicht ausgenommen → 2 rot und am echten Repo zwei Befunde in
    `admin/schnittstellen.db.test.ts`. **Am echten Repo:** `cm/schnittstellen.ts` mit
    `import { liest } …` und `mitteilung/typen.ts` mit `schreibt` → je ein Befund, Exit 1; Zeile der
    Anlässe aus der Tabelle genommen → `anlass/verwaltung-schnittstellen.ts` mit `liest` und
    `schreibt` gemeldet (die Meldung nennt fünf Dateien; dazu die Befunde der Admin-Routen der
    Anlässe). Unverändert `bauregel: ok`.
- **Doku (`83ccfcc`):** `docs/ci-cd-und-release.md` und `docs/arc42.md` beschrieben die
  Importrichtung gar nicht, also auch nicht mit Ausnahmen. Nachgeführt: Die Prüfliste nennt die
  Importrichtung (ohne Ausnahme) und die neue Regel, arc42 beides bei den Fachmodulen.
  `docs/context-scopes.md` braucht nichts.
- **Tests je Datei, vorher (`5ffbc6d`) → nachher:** `scripts/importrichtung.test.ts` 52 → 54;
  `scripts/pruefungen/bauregel.test.ts` 74 → 115. Keine Erwartung eines bestehenden Falls geändert.
- **Prüfläufe:** jeder Commit mit dem Hook `check-schnell`, grün. Vorher `uptime` (Last 9,5,
  abklingend) und `ps`: kein anderer Prüflauf. Voller `make check` auf dem Code-Endstand
  `83ccfcc` bei sauberem Arbeitsbaum: **Exit 0** (Lint; `svelte-check` 1535 Dateien ohne Fehler und
  Warnung; Prüfskripte samt `bauregel: ok`; Einheits- und Datenbanktests 152 Dateien mit 2005
  Tests, Abdeckung 97,07 % Anweisungen, 93,56 % Zweige; beide Builds; E2E 414 bestanden, 57
  übersprungen, 3,6 Minuten; Image; grüner Stand `34524cbe8b42` gemerkt). Gegen Schritt 11 (1962
  Tests): +43 (2 Importrichtung, 41 Bauregel).
- **Abweichungen vom Plan:**
  1. *Ein Test mehr in `importrichtung.test.ts`:* Der Meldungstext hat einen eigenen Fall (Test zuerst
     rot), im selben Commit wie die Änderung (A-15).
  2. *Neue Regel* (Auftrag des Orchestrators aus dem Review von Schritt 11, nicht in der Zeile 12):
     eigener `fix:`-Commit; dazu `node:path` (eingebaut, keine Abhängigkeit).
  3. *Doku-Dateien:* arc42 und CI/CD hatten keine Ausnahmen zu streichen; ergänzt statt
     berichtigt.
  4. *Zwei JSDoc-Zeilen* der neuen Funktionen von Anfang an umgebrochen; andere überlange
     Kommentarzeilen der Bauregel (`benannteNamen`, `pruefeDiensteImporte`, `betrifftBauregel`, je
     über 100 Zeichen) sind nicht angefasst (Auftrag nannte nur Zeile 93).
- **Was kein Test sieht:**
  - *Weiterreichen:* Eine Datei der Tabelle könnte `liest` weiterreichen (`export { liest } from
    '../admin/rechte.ts'`), eine Mitglieder-Datei desselben Moduls es dort holen. Die Regel prüft
    nur Importe aus `admin/rechte.ts`; heute reicht keine Datei weiter. Wie bisher «jede Datei für
    sich» (Kommentar «Grenze» in `bauregel.ts`).
  - *`mitKonto`* (die dritte Prüfung in `admin/rechte.ts`, nur für zwei Zugangs-Schnittstellen)
    war nicht gesperrt. **Erledigt im Nachtrag** (unten).
  - *Berechnete dynamische Importe* (`import(variable)`) ausserhalb von Routen meldet die Regel
    nicht; es gibt keine in `src/` ausser Tests.
  - *`.svelte`-Dateien* prüft die Regel nicht; SvelteKit verbietet ihnen `$lib/server/` im Browser.
  - *Nachtrag Review:* `import.meta.glob(…)`, `require(…)` und Dateien mit `.mts`/`.cts` sieht die
    Regel nicht (es gibt keine in `src/`).
  - *Nachtrag Review, bestehender Befund, hier nicht behoben:* `ohneKommentare` (`bauregel.ts`)
    liest `//` in einem Importpfad als Zeilenkommentar: `'$lib/server//admin/rechte.ts'` in einer
    Mitglieder-Datei verschwindet samt Import, kein Befund. `ADMIN_MODUL` erwartet
    `lib/server/admin` zusammenhängend: `'$lib/server/cm/../admin/rechte'` in einer Mitglieder-Route
    bleibt ohne Befund (gestellt geprüft, Ausgabe `[]`), und die neue Regel nimmt Routen aus. Der
    Satz oben «Routen sind ausgenommen, weil ihre eigenen Regeln strenger sind» gilt also nur für
    normal geschriebene Pfade. Eingetragen in `docs/beobachtungen.md` (Thema Sicherheit).
  - weiter offen wie nach Schritt 11: Fachlogik-Importe zwischen Themen (C.5), nicht normalisierte
    Pfade und `import()` in der Lint-Regel; die Probe «Ausnahme … ist noch nötig» erzeugt bei leerer
    Liste keinen Fall (jetzt fängt «ist leer» einen neuen Eintrag).
- **Vorschlag zur Übergangsregel der `CLAUDE.md` (nicht umgesetzt, `CLAUDE.md` unverändert):** Der
  Satz «Keine neue Ausnahme in `AUSNAHMEN` (`eslint.config.js`) ohne Entscheid des Projektleiters;
  ab Schritt 12 ist die Liste leer.» stimmt, der Teil «ab Schritt 12 ist die Liste leer» ist jetzt
  Stand und vom Test festgehalten. Vorschlag: «Die Importrichtung zwischen den Server-Modulen setzt
  ESLint ohne Ausnahme durch; eine Ausnahme in `AUSNAHMEN` (`eslint.config.js`) nur mit Entscheid
  des Projektleiters.» Und zur neuen Regel braucht die `CLAUDE.md` nichts: Sie stützt «Jede
  Schnittstelle der Verwaltung läuft über `liest` oder `schreibt` und steht in einer der
  Schnittstellen-Listen» und setzt sie für die Dateien durch. Zur Zwischenrevision (Etappenende).
- **Ausserhalb des Schritts aufgefallen, nicht behoben:**
  - Die Zeile «Stand des Dokuments» ganz oben nennt noch den Checkpoint der Etappe 0 (11.11.2026,
    `bad624f`); die Tabelle darunter ist aktuell. Zur Zwischenrevision.
  - Der Typ `MitteilungAdminDienste` heisst weiter nach den Mitteilungen (D.12, zur Kenntnis).
- **Nachtrag nach dem Review** (12.11.2026; Review «ok» ohne Befund vor dem Merge, zwei Hinweise im
  selben Branch umgesetzt; Commit `2f9ad27` `fix:`, dazu dieser `docs:`-Commit):
  1. *Nicht normalisierte Pfade:* `zielVon` normalisiert jetzt auch den Zweig über `$lib`
     (`posix.normalize`) und kennt Pfade ab der Projektwurzel (`/src/…`, so löst Vite auf). Neu als
     Befund in einer Mitglieder-Datei: `'$lib/server/cm/../admin/rechte'`,
     `'$lib/server/admin/./rechte.ts'`, `'$lib/../lib/server/admin/rechte.ts'`,
     `'/src/lib/server/admin/rechte.ts'`. Nur die neue Regel; die Routen-Regeln sind unverändert.
  2. *`mitKonto`* steht in `RECHTE_PRUEFUNG`; die Meldung heisst «liest, schreibt und mitKonto nur
     in …» (aus der Liste gebaut). Einziger Nutzer ist `admin/schnittstellen.ts` (in der Tabelle).
  - *Fälle:* `bauregel.test.ts` 115 → 122 (vier Pfade, zwei Formen mit `mitKonto` in einer
    Mitglieder-Datei, `admin/schnittstellen.ts` darf `mitKonto`). Die Erwartung der Meldung
    (Konstante im Test) zieht mit.
  - *Rot belegt* (je aus einer Sicherungskopie zurückgesetzt, `cmp` gleich): neue Tests gegen den
    Stand `3b33a29` → 21 rot (die sechs neuen Formen und die Meldung); `zielVon` wie vorher → genau
    die fünf Fälle mit diesen Pfaden rot; `mitKonto` aus der Prüfung genommen (Meldung gleich) →
    genau die zwei `mitKonto`-Fälle rot. Am echten Repo: `cm/schnittstellen.ts` mit
    `import { liest } from '$lib/server/cm/../admin/rechte'` und
    `import { mitKonto } from '/src/lib/server/admin/rechte.ts'` → zwei Befunde, Exit 1;
    zurückgesetzt `bauregel: ok`.
- **Review (12.11.2026): «ok», kein Befund vor dem Merge; Nachreview des Nachtrags: «ok».** Der
  Reviewer hat die Bauregel von `5ffbc6d` und `3b33a29` gegen den Endstand über 7 983 360 gestellte
  Fälle verglichen: bei Routen 0 Abweichungen, ausserhalb nur Zusatz mit Ziel `admin/rechte`, nichts
  lockerer. Eigene Lint-Matrix mit 1311 Proben ohne Abweichung von der erwarteten Richtung. Endstand
  der Tests: `bauregel.test.ts` 122, `importrichtung.test.ts` 54; voller `make check` auf `0b49d01`
  mit 2012 Tests, E2E 414 bestanden und 57 übersprungen, grüner Stand `3b0a2cff114f`.
- **Modell:** Der Plan nannte Sonnet; der Schritt lief mit Opus, weil die Regel für die
  Rechte-Importe dazukam (Entscheid des Orchestrators).

### D.15 Schritt 12a

**Erkenntnisse Schritt 12a** (12.11.2026, Branch `refactor/schritt-12a` ab `origin/dev` `f1fc3c0`
mit den zwei Doku-Commits des Orchestrators bis `5413b6f`; Reste der Bauregel, E-42)

- **Voraussetzungen geprüft:** Schritt 12 erledigt, kein Nachmessen verlangt, kein Entscheid nötig.
  Keine neue Abhängigkeit (im Worktree nur `npm ci --ignore-scripts`), keine Lint-Ausnahme, **kein
  Diff unter `src/`** (`git diff origin/dev -- src` leer), `CLAUDE.md` unverändert. Der Lauf wurde
  einmal durch eine Nutzungsgrenze unterbrochen und nach `df46080` fortgesetzt; der uncommittete
  Stand (Punkt 1) war stimmig, keine rote Probe stand im Arbeitsbaum.
- **Commits** (je Punkt ein `fix:` mit Test und Änderung, weil der Pre-Commit-Hook `check-schnell`
  rote Tests nicht zulässt; rot je per Probe belegt, A-15): `df46080` Punkt 2, `4224178` Punkt 1,
  `5a6bf32` Punkt 3, `ff4a265` Punkt 4, `26c46fe` Punkt 5; dazu dieser `docs:`-Commit. Punkt 6 ohne
  Code (verworfen, unten).
- **Punkt 2, Kommentare nur ausserhalb von Texten (`df46080`, N-01):** `ohneKommentare` läuft über
  ein Muster, das an jeder Stelle zuerst einen Text in '…' oder "…" (je auf einer Zeile), ein
  Template-Literal (über Zeilen, `${…}` zählt zum Text) oder ein Regex-Literal (nach einem Zeichen
  oder Wort, hinter dem kein Wert endet, oder am Zeilenanfang) überspringt und nur sonst einen
  Kommentar entfernt. Die Schranke «kein Zeilenkommentar direkt nach `:` oder `\`» bleibt wie vorher;
  die nach `'`, `"` und `` ` `` entfällt, weil Texte jetzt ganz übersprungen werden. Damit lässt `//`
  im Pfad (`'$lib/server//admin/rechte.ts'`) und `/*` in einem Text keinen Import mehr verschwinden,
  und ein Zeilenkommentar direkt hinter einem Text (`'holeAdminDienste'// it's`, D.8) wird entfernt.
  Kein Parser: Ein Regex-Literal nach `)` liest das Muster als Division (unten).
- **Punkt 1, Pfade auch in Routen aufgelöst (`4224178`, N-02):** Neue Hilfe `trifft(muster, pfad,
  quelle)`: Eine Sperre trifft, wenn der Pfad, wie er steht, **oder** der aufgelöste Pfad passt
  (`aufgeloest`: `$lib`, `/src/…` und relativ, normalisiert, mit Endung, ohne Anhang; `zielVon` ist
  `aufgeloest` ohne `.ts`/`.js`). Das «oder» hält jeden alten Befund am geschriebenen Pfad. Gilt für
  `ADMIN_MODUL`, die Pfad-Sperren der Verwaltungs-Dateien und `DIENSTE_MODUL`. Admin-Routen: Ein
  erlaubter Import muss weiter wie bisher geschrieben sein (`ERLAUBTER_IMPORT`, mit `.ts`) **und** auf
  die erlaubte Datei zeigen (`ZIELE_DER_ADMIN_ROUTE`); falsche Tiefe, ein Paket
  (`paket/lib/server/…`) und `/lib/…` ohne `src` sind jetzt ein Befund. Erste Fassung im Lauf
  berichtigt: Mit der Endung gestrichen galt `…/lib/server/admin.ts` (Datei neben dem Ordner) als
  Ordner `admin`; der Kleinvergleich zeigte es, darum prüft `trifft` mit Endung.
- **Punkt 3, Form Actions (`5a6bf32`, N-05):** `exportiertActions` liest die Namen mit `leseName`
  (`'actions'` = `actions`, auch `export { 'actions' } from …`); ein Name mit Escape (`'acti\u006fns'`,
  `acti\u006fns`) ist ein Befund, gesperrt im Zweifel.
- **Punkt 4, nicht prüfbares Laden (`ff4a265`, N-03):** `import.meta.glob`, `require(` und
  `createRequire(` (nicht `x.require`) sind in Routen und in den Dateien der Rechte-Regel (`src/` ohne
  Routen und Tests, auch die Dateien der Tabelle) ein Befund «… lässt sich nicht prüfen; nur
  statische Importe»; ein berechnetes `import()` dort neu ebenfalls («dynamischer Import mit
  berechnetem Pfad …», wie in Routen). **Kleinfrage `.mts`/`.cts`: aufgenommen.**
  `betrifftRechteImporte` nimmt `.mts`, `.cts`, `.mjs` und `.cjs` wie `.ts` und `.js`: Vite lädt sie
  so, und eine `.mts`-Datei in einem Thema war für die Rechte-Regel unsichtbar. Routen betrifft das
  nicht (jede Datei unter `src/routes/` wird ohnehin geprüft; SvelteKit kennt `+server.mts` nicht).
- **Punkt 5, nicht weiterreichen (`26c46fe`, N-04):** neue `pruefeWeiterreichen` für die Dateien
  der Tabelle `VERWALTUNGS_DATEIEN` (bisher ganz frei): Aus `admin/rechte.ts` nur statisch und mit
  Namen (wie für alle anderen Dateien); `export { liest } from`, `export * from` admin/rechte.ts sind
  ein Befund; ein importiertes `liest`, `schreibt` oder `mitKonto` (auch umbenannt, auch in
  Anführungszeichen) darf im Code nur direkt vor `(` stehen. So fallen `export { liest }`, `export
  default`, `export const x = l`, `{ liest }` und `const a = liest; export { a }` alle auf, ohne
  Datenfluss zu verfolgen (Vorbild: die Regel «`holeAdminDienste()` nur direkt als erstes Argument»).
  Die Import-Anweisung selbst wird dafür über ihren Bereich (`bereich`, neu im Typ `Import`, dazu
  `wort` = `import`/`export`) ausgeblendet, Texte zählen nicht («Die Verwaltung liest …»). Am Repo
  stehen die drei Namen in den sechs Dateien nur als Aufruf, in Kommentaren und im Import [G:
  Textsuche vor dem Bau].
- **Punkt 6, Hilfsdateien `gespraech/antworten.ts` und `cm/verwaltung-meldung.ts` (N-06):
  verworfen.** Gründe: (a) Beide prüfen keine Rechte und öffnen nichts, was nicht schon offen ist:
  `antworten.ts` baut drei Antworten und prüft die Länge eines Texts, und zwar für die Mitglieder
  und die Verwaltung (eine Sperre am Pfad wäre falsch); `verwaltung-meldung.ts` ruft nur
  `meldeMitgliedern` aus `mitteilung/meldung.ts`, das jeder Route frei steht wie jede Fachdatei (die
  Bauregel erfasst Fachlogik-Importe bewusst nicht, C.5). Eine Regel nur für diese zwei Dateien
  schützte nichts. (b) Die Form «nur von den Schnittstellen-Dateien ihres Moduls importierbar» meldete
  am echten Repo sofort `turnier/schnittstellen.ts` → `cm/verwaltung-meldung.ts` (anderes Modul), und
  App-Code wird nicht geändert. Der Punkt geht wie geplant an Schritt 20, Hinweis (e).
- **Fälle, vorher rot:** `bauregel.test.ts` 122 → 181 (+59). Jede neue Datei gegen die Fassung vor
  ihrem Punkt und gegen `origin/dev` gelaufen (alte `bauregel.ts` aus einer Sicherungskopie
  eingesetzt, danach zurück, `cmp` gleich): Punkt 2 7 von 129 rot; Punkt 1 15 rot (gegen den Stand
  nach Punkt 2 und gegen `origin/dev` je 15); Punkt 3 6 rot; Punkt 4 16 rot; Punkt 5 15 rot. Jeder
  neue Fall war rot, keiner gehört zu «vorher schon grün» (Hinweise zu 12a). Im Lauf zusätzlich rot:
  der Fall «dynamischer Import über `$lib/…/../admin`» war mit der neuen Fassung rot, weil
  `import('$lib/…')` schon vorher als berechnet gilt (unten); der Fall nimmt jetzt einen relativen
  Pfad.
- **Vergleich alter (`origin/dev`) gegen neuer Bauregel** (Skript im Scratchpad der Session,
  `s12a/vergleich.ts`, nach den Vorlagen des Reviewers `s12/diff2.ts` und `s11/c/diff.ts`): 17
  geprüfte Dateien (sechs Routen, sieben weitere Dateien, zwei Dateien der Tabelle, `.mts` und
  `.cts`), 18 Schreibweisen des Pfads (die zehn der Vorlage, dazu `//` an vier Stellen, falsche Tiefe,
  Paket, `/lib/…`, `./../`), 18 Quellen (dazu die zwei Hilfsdateien), sechs Endungen, elf Namen, 83
  Formen (36 der Vorlagen, dazu 25 für Punkt 2, je 6 für Punkt 3 und 4, 10 für Punkt 5), die sieben
  Listen nach Schritt 11; gleiche Codes je Datei nur einmal: **25 843 536 Fälle**, 16,7 Minuten.
  - **Strenger: 2 435 163 Fälle**, alle bei den sechs Formen (Zuordnung im Skript nach Form, Pfad,
    Datei): Punkt 1 (Pfad) 702 874, Punkt 2 670 514, Punkt 3 644 761, Punkt 4 145 894, dazu 18 760
    für `.mts`/`.cts` und 3 180 für berechnete Importe ausserhalb der Routen, Punkt 5 249 180;
    **«unerwartet» 0**. (Die Zahlen je Punkt enthalten auch Fälle, in denen eine Form eines Punktes
    durch einen anderen Punkt strenger wird, z. B. `//` im Pfad in einer Form von Punkt 3.)
  - **Alter Befund fehlt, neu ein anderer: 108 381 Fälle.** Das Urteil bleibt «Befund»; neu ist nur
    die Meldung. Davon 96 864 mit `//` im Pfad (die alte Fassung meldete Bruchstücke wie «importiert
    '$lib/server\nexport { x as '»), 11 517 ohne: Admin-Routen mit falscher Tiefe, bei denen die alte
    Fassung einen Namen bemängelte und die neue den Pfad.
  - **Alt Befund, neu keiner: 39 824 Fälle, zwei Klassen, beide erklärt:**
    1. 38 624 in der Form `const a = 'x'// import { … } from '…';`: ein auskommentierter Import
       direkt hinter einem Anführungszeichen. Die alte Fassung entfernte diesen Kommentar nicht und
       las den Import darin als Code; die neue entfernt ihn (genau die Korrektur von Punkt 2, D.8).
       JavaScript führt ihn nicht aus; ein auskommentierter Import ist schon vorher frei (Fall
       «lässt `// import { liest } …` zu»). Mit `;` vor dem Kommentar (`'x';// import …`) urteilen
       beide gleich.
    2. 1 200 dynamische Importe mit `//` im Pfad (`import('/src/lib/server//http.ts')`,
       `import('…//dienste.mjs')`): Die alte Fassung las ab `//` alles als Kommentar, sah darum
       einen berechneten Import und meldete das. Die neue liest den Pfad; er zeigt auf eine freie
       Datei. Probe: Über denselben Pfad ohne `//` urteilt auch die alte Fassung «frei», in 1 200
       von 1 200 Fällen (`s12a/fall3.ts`).
  - **Widerlegt im Review (M-1):** Dieser Vergleich hatte keine Form, in der das neue Muster einen
    Text zu weit oder zu kurz liest. Der Generator des Reviewers (TypeScript-Parser als Wahrheit)
    fand eine dritte Klasse «alt Befund, neu keiner», in der der gesperrte Import wirklich im Code
    steht: 249 595 von 22 526 400 Fällen. Die Aussagen «nur zwei erklärte Klassen» und «kein Schutz
    geht verloren» galten für diese Fassung nicht. Behoben in der Korrekturrunde (unten).
- **Keine Fehlalarme an echtem Code** (`s12a/echt.ts`): alle 441 versionierten Dateien unter `src/`
  (auch `.svelte`, Tests, Markup) gegen beide Fassungen, je an ihrem Pfad (mit den echten Listen),
  als Seite `src/routes/probe/+page.ts`, als Admin-Route, als Datei der Tabelle und als Fachdatei:
  2 205 Fälle. **An ihrem Pfad 0 Abweichungen.** Abweichungen nur verschoben: 62 echte Admin-Routen
  an einem anderen Ort (ihre relativen Pfade zeigen dann ins Leere, jetzt ein Befund, gewollt nach
  Punkt 1) und `routen.test.ts` mit `import.meta.glob` als Seite oder Fachdatei (ein Test, an
  seinem Pfad ausgenommen). Am echten Repo `bauregel: ok`.
- **Was die Bauregel weiterhin nicht sieht:**
  - Sie liest Text, keinen Syntaxbaum. *Berichtigt in der Korrekturrunde:* Ein Regex-Literal nach
    `)`, eine Division nach `a!`, `i++` oder `{}` und ein Backtick in einem Ausdruck oder im Markup
    lassen das neue Muster einen Text falsch lesen. Die alte Fassung sah die Importe dahinter, und
    weil jetzt beide Lesarten gelten, sieht die Bauregel sie weiterhin. Offen bleibt nur, was keine
    der beiden Lesarten sieht.
  - Weiterreichen anderer Namen als `liest`/`schreibt`/`mitKonto` und über Dateien ausserhalb der
    Tabelle (N-04, benannte Grenze «jede Datei für sich»); innerhalb der Tabelle `liest` in einem
    `${…}` eines Template-Literals.
  - `export const acti\u006fns` (Escape in der Deklaration; nur der Export in Klammern ist erfasst).
  - Laden über `eval`, `new Function` oder ein importiertes `require` unter anderem Namen;
    `import.meta['glob']` (lädt nichts, Vite ersetzt nur die wörtliche Form).
  - Namen gegen die Vereinigung der Listen statt gegen die Liste der Datei (N-07, Beobachtung).
  - Die Hilfsdateien des Gesprächs und der CM (Punkt 6, Schritt 20 Hinweis (e)).
  Das zweite Netz für Routen bleibt der Routen-Test (welche Schnittstelle eine Route mit welchen
  Diensten aufruft), für die Rechte die Rechte-Matrix.
- **Ausserhalb des Schritts aufgefallen, nicht behoben (beides vor dem Schritt so, nicht lockerer):**
  - `import('$lib/…')` mit einem Pfad über `$lib` gilt als berechnet, weil das Muster für
    dynamische Importe kein `$` im Pfad zulässt: in Routen ein Befund «berechnet» statt der
    genaueren Meldung, ausserhalb neu ebenfalls (Punkt 4). Streng, aber ungenau gemeldet.
  - Admin-Routen dürfen keinen Pfad über `$lib` nutzen (`ERLAUBTER_IMPORT` verlangt `lib/server/…`
    nach `/` oder am Anfang). Unverändert gelassen, sonst wäre es eine Lockerung; alle Admin-Routen
    schreiben relativ.
- **Tests je Datei, vorher (`5413b6f`) → nachher:** `scripts/pruefungen/bauregel.test.ts` 122 → 181;
  sonst keine Testdatei geändert. Eine Konstante (`VERWALTUNG`, Meldung der Rechte-Regel) zog in den
  Kopf der Testdatei, keine Erwartung eines bestehenden Falls geändert.
- **Doku:** `docs/ci-cd-und-release.md` (Zeile zur Bauregel); der Eintrag «Bauregel übersieht
  Importpfade mit `//` oder `..` vor `admin`» aus `docs/beobachtungen.md` ins Archiv (erledigt im
  Refactoring); dieses Dokument (Kopf, «Stand und nächster Schritt», 1c Tabelle N, Zeile und
  Hinweise 12a, «Ergebnis Schritt 12a», Netz, Hinweis (e) zu Schritt 20, 7.7).
- **Prüfläufe:** jeder Commit mit dem Hook `check-schnell`, grün. Vorher `uptime` (Last 3,9) und
  `ps`: kein anderer Prüflauf; Docker lief. Voller `make check` auf dem Code-Endstand `26c46fe` bei sauberem Arbeitsbaum (Doku dafür
  per `git stash` beiseite): **Exit 0** (Lint; `svelte-check` 1535 Dateien ohne Fehler und Warnung;
  Prüfskripte samt `bauregel: ok`; Einheits- und Datenbanktests 152 Dateien mit 2071 Tests,
  Abdeckung 97,07 % Anweisungen, 93,56 % Zweige; beide Builds; E2E 414 bestanden, 57 übersprungen,
  3,8 Minuten; Image; grüner Stand `abb775131027` gemerkt). Gegen Schritt 12 (2012 Tests): +59, alle
  in `bauregel.test.ts`.
- **Für den Reviewer:** den Diff an `bauregel.ts` ganz lesen; den Vergleich mit eigenem Generator
  wiederholen, besonders die zwei Klassen «alt Befund, neu keiner». Skripte:
  `/private/tmp/claude-501/-Users-KN-CAS-projekte-tco-app/8815b149-c947-436e-b94c-710910cee959/scratchpad/s12a/`
  (`vergleich.ts`, `fall3.ts`, `echt.ts`; `alt/` ist `bauregel.ts` aus `origin/dev`).

**Korrekturrunde nach dem Review** (12.11.2026, derselbe Branch ab `69e9d8a`; Punkte 1, 3, 4, 5
und das Verwerfen von Punkt 6 «ok»)

- **Befunde des Reviews:** (M-1) `ohneKommentare` verschluckt echte Importe, die die Fassung bis
  Schritt 12 meldet (oben, «Widerlegt im Review»). Zwei Mechanismen: Ein Backtick, den das Muster
  nicht als Teil eines Texts erkennt, öffnet einen «Text» bis zum nächsten Backtick, und Kommentare
  dazwischen bleiben stehen; ein falsch geschlossener Text endet vor einem `//`, das in Wahrheit in
  einem Text steht, und der Rest der Zeile verschwindet. Auslöser u. a. ein Regex-Literal mit
  Backtick nach `)`, `a! / 2`, `a++ / 2`, `{} / 2` und ein Backtick in einem `${…}` (`!`, `+`, `-`,
  `}` und `>` stehen in der Liste der Zeichen, nach denen ein Regex-Literal beginnen darf). (M-2) Die
  Doku behauptete das Gegenteil. (H-3) Dieselbe Ursache beim Ausblenden der Texte in
  `pruefeWeiterreichen`. (H-4) Positivfälle für die Punkte 4 und 5 fehlten. (H-1, H-2) Fehlalarme
  der neuen Regeln. (H-6) Die Doku nannte nur `.mts`/`.cts`. H-5 und H-7 zum Vermerk (unten).
- **Geändert (`d85a516` `fix:`):** Neue `ohneKommentareBisher` (die Lesart bis Schritt 12, Zeichen
  für Zeichen wie auf `origin/dev`) und `LESARTEN = [ohneKommentare, ohneKommentareBisher]`. Alles,
  was von den Kommentaren abhängt (Admin-Routen, andere Routen, nicht prüfbares Laden, Rechte-Regel,
  Weiterreichen), steht in `pruefeLesart(pfad, text, liste)` und läuft je Lesart; die Befunde beider
  werden vereinigt, gleiche zählen einmal. Was am rohen Inhalt prüft (Server-Datei neben Seite, Form
  Actions, Remote Functions, Konfiguration), läuft wie bisher einmal. Damit ist die Bauregel per
  Bauart nirgends lockerer als `origin/dev`; die Klasse «auskommentierter Import direkt hinter einem
  Anführungszeichen» ist wieder ein Befund (gesperrt im Zweifel). `importe(inhalt)` entfällt; die
  Prüfungen nehmen den kommentarfreien Text. In `pruefeWeiterreichen` (H-3) werden die Texte
  ebenfalls auf zwei Arten ausgeblendet (alle Texte samt Template- und Regex-Literalen, und nur '…'
  und "…"); eine Stelle aus einer von beiden gilt. H-1/H-2, je eine Zeile ohne Lockerung:
  `liest<T>(…)` ist ein Aufruf, `typeof liest` kein Weiterreichen, `function require(` (auch
  `declare function require(`) lädt nichts.
- **Fälle:** `bauregel.test.ts` 181 → 200 (+19). **Rot belegt** gegen `69e9d8a` (Sicherungskopie
  eingesetzt, danach zurück, `cmp` gleich): 14 von 19 rot, nämlich sechs Formen in einer Datei der
  Mitglieder (Regex-Literal mit Backtick nach `)`; `a! / 2` vor einem Template; `a! / 2` und
  `i++ / 2` mit Blockkommentar in der Klausel; Backtick in `${…}` als Text und im Kommentar), drei
  Routen (`/'/` nach `)` mit `'//cdn/x'` vor `import()`; Backtick in `${…}` mit `"//"`; Backtick im
  Svelte-Markup vor `<script>`), eine Admin-Route, H-3 und die drei Fehlalarme `liest<T>(…)`,
  `typeof liest`, `declare function require(`. Die übrigen fünf (H-4) sind Positivfälle und waren
  schon grün: Aufruf `liest(…)` ein- und mehrzeilig, Name in einer Meldung, `x.require(`,
  `meta.glob` und eine Methode `require` in einer Route. Ein erster Satz eigener Fälle für M-1 war
  gegen `69e9d8a` grün (traf den Fehler nicht, weil der Import auf eigener Zeile stand); ersetzt
  durch die Fälle des Reviewers (`s12a-review/reg.ts`), die dort «alt Befund, neu keiner» zeigen.
- **Vergleich nach der Korrekturrunde:**
  - Generator des Reviewers (`s12a-review/fuzz.ts`, alt = `origin/dev`, Wahrheit vom
    TypeScript-Parser, 12,5 Minuten): **22 526 400 Fälle, 0 «alt Befund, neu keiner»** (vorher
    249 595 mit echtem und 7 238 mit ungültigem Code). Strenger mit echtem Import 4 759 891; neu
    Befund ohne echten Import 469 890 (408 212 gültig, 61 678 ungültig), z. B. eine Division nach
    `a!` und dahinter auf derselben Zeile `// it's import { … }`: Die neue Lesart hält den
    auskommentierten Import für Code. Strenge im Zweifel; an echtem Code 0 (unten).
  - Eigener Generator (`s12a/vergleich.ts`, unverändert, 25,1 Minuten): **25 843 536 Fälle, 0 «alt
    Befund, neu keiner»**; strenger 2 546 151 (Punkt 1 735 742, Punkt 2 702 430, Punkt 3 669 385,
    Punkt 4 150 646, dazu 19 604 `.mts`/`.cts` und 3 180 berechnet ausserhalb der Routen, Punkt 5
    265 164; «unerwartet» 0); alter Befund fehlt bei neu anderem Befund 11 670 (Admin-Routen mit
    falscher Tiefe: neu wird der Pfad bemängelt statt eines Namens; die Bruchstück-Meldungen bei
    `//` sind wieder dabei, weil die bisherige Lesart mitläuft).
  - Echte Dateien (`s12a/echt.ts`): alle 441 versionierten Dateien unter `src/`, darunter
    `src/app.d.ts`, an ihrem Pfad **0 Abweichungen**; verschoben wie vorher nur die 62 Admin-Routen
    und `routen.test.ts`. Am echten Repo `bauregel: ok`.
- **Bekannte Strenge (H-1, H-2), bewusst nicht gelockert:** `require(` in einem Text ist ein Befund,
  ebenso `import.meta.globEager` (lädt wie `glob`); `liest` als Objektschlüssel (`{ liest: 1 }`) gilt
  als Weiterreichen, weil es sich in einer Zeile nicht von `a ? liest : b` trennen lässt; ein Name
  der Rechteprüfung in einem Template-Literal gilt in der zweiten Art des Ausblendens als Code. Am
  Repo trifft keine dieser Formen zu.
- **Zum Vermerk:** (H-5) `export { x as '<anderer Name mit Escape>' }` meldet «Form Actions …» (gesperrt im
  Zweifel, Meldung ungenau); `exportiertActions` liest weiter den rohen Inhalt samt Kommentaren und
  Texten. (H-7) `src/lib/server/anlass/schnittstellen.ts`, `getKalender`
  (Zeile 69), baut die Antwort für die Kalender-Datei mit `new Response(…)` direkt; der Satz der
  `CLAUDE.md` «Statuscode und Antwort … immer mit den Bausteinen aus `src/lib/server/http.ts`» trifft
  dort nicht zu. Entschieden mit E-46 (12.11.2026): Der Satz hat die Ausnahme «ausser Datei-Antworten wie
  die Kalender-Datei»; der App-Code bleibt unverändert.
- **Doku (dieser `docs:`-Commit):** M-2 berichtigt (Kopf, «Ergebnis Schritt 12a», Netz-Zeile 12a,
  die widerlegten Sätze oben), H-6 (`.mjs`/`.cjs` in `docs/ci-cd-und-release.md` und hier), drei
  beim ersten Schreiben aufgelöste Escapes (`acti\u006fns`) wiederhergestellt.
- **Prüfläufe:** jeder Commit mit dem Hook `check-schnell`, grün. Vorher `uptime` (Last 2,3) und
  `ps`: kein anderer Prüflauf, Docker lief. Voller `make check` auf dem Code-Endstand
  `d85a516` bei sauberem Arbeitsbaum (ohne `git stash`; die Doku entstand nach dem Lauf): **Exit 0**
  (Lint; `svelte-check` 1535 Dateien ohne Fehler und Warnung; Prüfskripte samt `bauregel: ok`;
  Einheits- und Datenbanktests 152 Dateien mit 2090 Tests, Abdeckung 97,07 % Anweisungen, 93,56 %
  Zweige; beide Builds; E2E 414 bestanden, 57 übersprungen, 3,5 Minuten; Image; grüner Stand
  `0dd26d76e40a` gemerkt). Gegen die erste Fassung (2071 Tests): +19, alle in `bauregel.test.ts`.
- **Zweites Review (12.11.2026): «ok», kein Muss-Befund.** `ohneKommentareBisher` ist zeichengleich
  mit der Fassung von `f1fc3c0`, jede Regel, die vom kommentarfreien Text abhängt, läuft auf beiden
  Lesarten. Parser-Vergleich des Reviewers gegen `75c35bb`: 22 526 400 Fälle, 0 «alt Befund, neu
  keiner»; 32 gezielte Proben zu den drei Entschärfungen, keine öffnet etwas.
- **Bekannte Strenge nach dem zweiten Review (als Beobachtung in `docs/beobachtungen.md`):** Ein
  Zeilenend-Kommentar hinter einer Division nach `a!`, `i++` oder `}` bleibt in der neuen Lesart als
  Code stehen; enthält er `liest`, `schreibt`, `mitKonto` oder `require(`, meldet die Bauregel in
  einer geprüften Datei zu Unrecht (Prettier lässt solche Kommentare auf der Zeile). Ebenso gilt
  `liest<Map<string, number>>(a)` (verschachteltes Typ-Argument) als Weiterreichen. Beides ist ein
  falscher roter Lauf, kein Schutzverlust, und kommt am Repo nicht vor.
