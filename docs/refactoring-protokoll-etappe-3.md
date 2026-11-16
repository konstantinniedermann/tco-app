[← Refactoring-Analyse](refactoring-analyse.md)

# Refactoring MyTCO — Protokoll Etappe 3

> **Abgeschlossen** (15.11.2026): Das Refactoring ist abgeschlossen. Diese Datei ist Geschichte
> und wird nicht mehr nachgeführt; was gilt, steht in der [`CLAUDE.md`](../CLAUDE.md), in
> [arc42](arc42.md), den [ADRs](adr/adr-index.md) und den [Beobachtungen](beobachtungen.md).

Ausgelagert aus der [Refactoring-Analyse](refactoring-analyse.md) (E-60). Dort heisst dieser Teil
weiter «Anhang F»; Verweise wie «F.3» oder «Anhang F.3» meinen die Abschnitte dieser Datei.
Die Etappe ist abgeschlossen; diese Datei wird nicht mehr nachgeführt.

## Anhang F — Protokoll Etappe 3 [neu]

Nachmessen und Protokolle der Schritte 19, 20 und 20a. Die Kurzfassung je Schritt steht in 7.5.

### F.1 Nachmessen Schritt 19

**Nachmessen vor Schritt 19** (14.11.2026, Worktree `refactor/schritt-19` auf `7159355` =
`origin/dev`, Version 0.22.5; gelesen, gezählt und ein Probe-Build in einer Kopie im Scratchpad;
kein `make check`, kein E2E, keine Datenbank, kein laufender Server). Ganz gelesen [G]:
`src/lib/server/version.ts`, `version.test.ts`, `status.ts`, `src/lib/version.ts`,
`src/routes/api/status/+server.ts`, `vite.config.ts`, `Dockerfile`, `src/service-worker/index.ts`,
`src/routes/+layout.ts`, `src/app.html`, `src/app.d.ts`, `src/hooks.client.ts`,
`src/lib/ui/ungespeichert.ts`, `.dockerignore`. In Auszügen [E]: `src/routes/+layout.svelte`
(Zeilen 1 bis 135 und 221), `src/hooks.server.ts`, `status.db.test.ts`, `status.test.ts`,
`tests/e2e/startseite.test.ts`, `playwright.config.ts`, `betrieb/nachweis/nachweis.sh`,
`.github/workflows/check.yml` (Job `image`), `docs/ci-cd-und-release.md` (Zeilen 382 bis 467),
`docs/testkonzept.md:118–127`. SvelteKit: das **installierte Paket 3.1.1**
(`node_modules/@sveltejs/kit`, Quelltext und Typen) [G] und die Doku-Seiten von svelte.dev
(`@sveltejs-kit-vite`, `$app-state`, `service-workers`, `link-options`, `single-page-apps`, am
14.11.2026 abgerufen) [G]; der Text zu `version` ist in Paket und Doku wortgleich. Die Werkzeuge
des Svelte-MCP-Servers standen diesem Lauf nicht zur Verfügung.

**Kurz:** Das Ziel der Zeile 19 stimmt, aber drei Annahmen gehen der Zeile vor. (1) **Das
Bordmittel ist schon heute aktiv und braucht keine Einstellung**; es lädt aber **nur im
Fehlerfall** neu, nicht «beim nächsten Seitenwechsel». Für den Seitenwechsel nennt die Doku von
SvelteKit eine Ergänzung von fünf Zeilen im Wurzel-Layout; das ist eigener Code, klein, aber
keine reine Einstellung. (2) **Die Kennung bleibt der Zeitstempel des Builds** (nichts setzen):
Sie erkennt auch «neu ausgeliefert, gleiche Versionsnummer» und hängt nicht an F-15. (3) **Was
die Doku heute verspricht, deckt kein Bordmittel**: eine vom Server bei jeder Antwort genannte
Mindestversion und «eine angefangene Eingabe bleibt erhalten». Beides ist auch heute nicht
gebaut. Es braucht einen Entscheid des Projektleiters (**F-35**, dazu kurz **F-36**).
`Dockerfile` und `src/service-worker/index.ts` fallen aus der Dateiliste.

#### 1 Der Eigenbau heute [G]

| Stück | Fundstelle | Was es tut | Wer es liest |
|---|---|---|---|
| `MINDESTVERSION = '0.1.0'` | `src/lib/server/version.ts:2` | feste Zeichenkette, seit dem Gerüst nie erhöht | `status.ts:4`, `version.test.ts`, `status.db.test.ts` (Import und vier Erwartungen) |
| `istVersionVertraeglich` | `src/lib/server/version.ts:16` | vergleicht zwei Nummern `x.y.z` | nur `version.test.ts` (16 Fälle); kein Aufruf unter `src/` ausserhalb des Tests |
| Feld `mindestversion` | `status.ts:9` und `:23` (`StatusAntwort`, `ermittleStatus`) | steht in der Antwort von `/api/status` | niemand: keine Oberfläche, kein Skript, kein Betrieb [G: Textsuche über das Repo ohne `node_modules`] |
| Feld `version` | `status.ts:23`, aus `APP_VERSION` (`src/lib/version.ts`, von `vite.config.ts:53` aus `package.json` eingesetzt) | Paketversion in der Antwort | niemand ausser den Tests; die Fusszeile liest `APP_VERSION` direkt (`+layout.svelte:221`) |
| Kopfzeile «Mindestversion bei jeder Antwort» | **gibt es nicht** | die Doku nennt sie (`ci-cd-und-release.md:421`) | — |
| Prüfung in der Oberfläche | **gibt es nicht** | kein `updated`, kein Vergleich, kein Neuladen wegen einer Version unter `src/` | — |

- **Wer `/api/status` liest, und was davon [G]:** der Healthcheck (`Dockerfile:31`, nur
  `j.status`), `betrieb/nachweis/nachweis.sh` (Statuscode und die Zeichenfolge `"status":"ok"`,
  Zeilen 254 bis 269, 551, 1169), `betrieb/nachweis/rauchtest.sh` und der CI-Job `image` (warten
  auf «healthy», also wieder nur `status`), `tests/e2e/startseite.test.ts:120` (nur Kopfzeilen),
  `routen.test.ts:303` (Eintrag `EIGEN`), `status.test.ts` (nur `antwort.status` und das Log),
  `docs/betrieb-und-uebergabe.md:81` (Überwachung: «ok»). **Keiner liest `mindestversion`.**
- **Was beim Entfernen frei wird:** die Datei `src/lib/server/version.ts` (31 Zeilen) und
  `version.test.ts` (33 Zeilen) ganz; in `status.ts` ein Import, ein Feld des Typs, ein Feld der
  Antwort; in `status.db.test.ts` ein Import und vier Erwartungen. `src/lib/version.ts`
  (`APP_VERSION`) und `__APP_VERSION__` bleiben: Fusszeile und `/api/status`.
- **Was daran hängt:** nichts im Betrieb. Die Antwort von `/api/status` verliert ein Feld; das
  ist eine Änderung der Schnittstelle nach aussen, die die Zeile 19 nennt. Die Abdeckung
  (`vitest.config.ts`, `src/lib/server/**`, Schwelle 90 %) verliert eine voll gedeckte Datei
  [V: Wirkung auf die Zahl nicht gemessen, bei rund 31 Zeilen vernachlässigbar].
- **Historische Stellen, die der Schritt nicht anfasst:** `docs/superpowers/plans/` und
  `…/specs/` (Gerüst, Auslieferung) nennen `MINDESTVERSION`; sie sind abgelegte Pläne (B-06,
  Schritt 22). `docs/beobachtungen-archiv.md:640` und `:680` ebenso.

#### 2 Was SvelteKit 3.1.1 mitbringt [G: Paket und Doku]

- **Ort der Einstellung:** `version: { name, pollInterval }` im Aufruf `sveltekit({ … })` in
  `vite.config.ts` (es gibt keine `svelte.config.js`; die Doku-Seite heisst «@sveltejs/kit/vite»).
  Heute ist nichts gesetzt.
- **Kennung (`name`):** Voreinstellung ist `Date.now()` beim Laden der Konfiguration
  (`core/config/options.js:279`). Wer `name` setzt, muss einen festen Wert liefern (die Doku nennt
  den Commit). Die Kennung steht an drei Stellen des Builds: in `_app/version.json`, in der
  ausgelieferten HTML-Hülle (dort liest sie die App beim Start) und im gebündelten Service
  Worker. **In keinem der Bausteine unter `_app/immutable/`.**
- **Probe-Build [G]:** zweimal `vite build` auf demselben Quelltext: Kennungen `1794677043246`
  und `1794677053312`; von 329 Dateien unter `build/client` unterscheiden sich genau
  `version.json` und `service-worker.js` (je mit `.br` und `.gz`), alle Bausteine haben dieselben
  Namen und Inhalte. Der statische Build (`MYTCO_SPA=1`) schreibt dieselbe Kennung in
  `build/_app/version.json` und in `index.html`.
- **Wann geprüft wird** (`runtime/app/state/client.svelte.js`, `runtime/client/client.js`):
  - nach `pollInterval` (Voreinstellung eine Stunde, `0` schaltet nur das ab);
  - wenn das Fenster den Fokus bekommt und wenn der Tab wieder sichtbar wird
    (`client.js:3125–3133`); beim Handy also, wenn die App in den Vordergrund kommt [V: auf
    einem echten iPhone als Startbildschirm-App nicht geprüft];
  - wenn ein Seitenwechsel scheitert (siehe unten);
  - über die Kopfzeile `x-sveltekit-version`. **Die greift bei MyTCO nie:** Der Server setzt sie
    nur auf Antworten von Server-Ladefunktionen (`__data.json`), Form Actions und Remote
    Functions (`with_version_header`, vier Aufrufstellen), und die Bauregel verbietet alle drei.
    Die eigenen Schnittstellen unter `/api/` tragen sie nicht.
  - Geprüft wird mit einem Abruf von `_app/version.json` (Anfrage mit `cache-control: no-cache`);
    weicht die Kennung ab, wird `updated.current` wahr und bleibt es. Im Entwicklungsserver ist
    die Prüfung aus (`if (DEV) return false`).
- **Wann von selbst neu geladen wird:** nur in zwei Fällen, je nach einer Prüfung mit Ergebnis
  «neue Version»: (a) der Code der Zielseite lässt sich nicht laden (`client.js:1538`; der alte
  Baustein fehlt auf dem neuen Server); (b) die Zielseite endet mit einem Status ab 400
  (`client.js:2072`). Dann aktualisiert SvelteKit erst den Service Worker und lädt die Zieladresse
  als ganzes Dokument. **Ein gewöhnlicher Seitenwechsel lädt nicht neu**, auch wenn
  `updated.current` wahr ist. Der Ausgangspunkt aus dem Review von Schritt 02 stimmt also; neu ist
  nur die Prüfung bei Fokus (damals: «Tab wieder im Vordergrund»).
- **Für den gewöhnlichen Seitenwechsel** nennt die Doku eine Ergänzung im Wurzel-Layout:
  `beforeNavigate(({ willUnload, to }) => { if (updated.current && !willUnload && to?.url)
  location.href = to.url.href; })`, mit `updated` aus `$app/state`. Das ist der Baustein für die
  Zeile 19 («lädt beim nächsten Seitenwechsel neu»).
- **`data-sveltekit-reload`:** ein Attribut an einem Link (oder einem Element darüber), das
  diesen Link immer als ganzes Dokument lädt. Für Schritt 19 unpassend: Es gilt immer, nicht nur
  nach einer neuen Version.
- **`ssr = false`** (`+layout.ts:4`): ändert nichts. Die Hülle rendert der Node-Server bei jeder
  Anfrage mit seiner Kennung; ein Neustart der App holt also immer den Stand des Servers.
- **Node-Adapter:** `version.json` liegt ausserhalb von `_app/immutable/` und bekommt darum
  nicht «ein Jahr unveränderlich» (`adapter-node/src/static.js:142–145`). Die Hülle trägt einen
  `etag` über ihren Inhalt (`render.js:624`) und keine eigene Cache-Angabe [G: Quelltext; **nicht
  an einem laufenden Server gemessen**, auch nicht hinter Caddy].
- **Service Worker der App:** `src/service-worker/index.ts` hat nur `push` und
  `notificationclick`, keinen `fetch`-Handler und keinen Cache (Kommentar Zeile 2, bestätigt
  gelesen). **Er hält keine alte App am Leben.** Er importiert keine `version`; die Kennung
  gelangt trotzdem in sein Bündel (als Wert der globalen Startangaben), darum ist die Datei nach
  jedem Build neu, und der Browser richtet nach jeder Auslieferung einen neuen ein. Das ist heute
  schon so und folgenlos, solange alter und neuer dasselbe tun. Randfall, **Beobachtung, nicht
  Schritt 19** [V]: Ändert ein Release die Form der Push-Nutzlast, zeigt ein noch aktiver alter
  Service Worker den Push nicht an (`leseNutzlast` gibt `null`), bis er abgelöst ist.
- **Statischer Build (E-10):** `updated` und `beforeNavigate` laufen dort gleich; die Ergänzung
  bräche den Build nicht [V: nicht gebaut, weil kein Code geschrieben wurde]. In einer
  Store-App läge `version.json` aber **in** der App und wäre immer gleich der eigenen Kennung:
  Das Bordmittel bliebe dort stumm. Eine Store-App braucht für «Bitte aktualisieren» eine eigene
  Lösung; die gibt es nicht, und E-09 baut sie nicht.
- **E-27 (eigener Build-Ordner je E2E-Lauf):** bleibt nötig und unberührt, solange die Kennung
  der Zeitstempel ist. Eine feste Kennung (Paketversion) hätte den Fall aus Anhang C.1 («zweiter
  Build im selben Ordner») nur verdeckt, wenn beide Builds dieselbe Nummer tragen.

#### 3 Zusage der Doku gegen Code und Bordmittel

Die Anforderung steht nur in `docs/ci-cd-und-release.md`, Abschnitt «Alte Versionen auf dem
Handy» (Zeilen 415 bis 424), dazu ein Satz im Ausblick (Zeile 466). In den Anforderungen, im
Datenschutzkonzept und in den ADR steht dazu nichts [G: Textsuche unter `docs/` nach
«Mindestversion», «alte Version», «lädt neu»].

| Satz der Doku | Code heute | Bordmittel ohne Zutun | mit der Ergänzung im Layout |
|---|---|---|---|
| «Die Web-App speichert sich auf dem Handy zwischen (Service Worker)» | **falsch**: kein Cache, mit Absicht | — | — |
| «Eine neue Version lädt beim nächsten Start von selbst» | **stimmt**, weil nichts zwischengespeichert wird und der Server die Hülle je Anfrage liefert | stimmt | stimmt |
| «Der Server nennt bei jeder Antwort die Mindestversion» | **nicht gebaut** (nur ein Feld in `/api/status`, das niemand liest) | **nein**: `x-sveltekit-version` gibt es nur für Antworten, die MyTCO nicht hat | nein |
| «Ist eine offene App älter, lädt sie neu» | **nicht gebaut**; es wirkt nur das Bordmittel im Fehlerfall | nur, wenn ein Baustein fehlt oder die Zielseite mit Status ab 400 endet | beim nächsten Seitenwechsel, nachdem die App die neue Version bemerkt hat (Vordergrund, Fokus, stündlich) |
| «eine angefangene Eingabe bleibt dabei erhalten» | **nicht gebaut** | **nein** | nein; es bleibt die Rückfrage «Nicht gespeichert» (siehe 5) |
| «Die Mindestversion steigt nur, wenn eine Schnittstelle sich unverträglich ändert. Sonst bleiben Schnittstellen mit dem vorherigen Release verträglich» | erster Halbsatz gegenstandslos; der zweite ist eine Arbeitsregel ohne Werkzeug | — | — |
| «Die Store-App prüft dieselbe Mindestversion …» (Zeile 466) | nicht gebaut | nein (siehe 2) | nein |

- **Was das Bordmittel deckt:** den häufigen Fall «App offen, neue Auslieferung, die Nutzerin
  wechselt die Seite». Mit der Ergänzung wird aus «nur wenn etwas scheitert» ein «beim nächsten
  Seitenwechsel».
- **Was kein Bordmittel deckt, und was mit E-09 verloren geht:** Der Server kann eine alte App
  nicht **zwingen**. Wer nach einer Auslieferung auf derselben Seite bleibt und dort speichert,
  schickt mit altem Code an neue Schnittstellen; die App bemerkt die neue Version zwar (Fokus,
  Stunde), handelt aber erst beim Seitenwechsel. Den Hebel «diese Auslieferung ist unverträglich,
  alle müssen sofort neu laden» gibt es dann nicht. Verloren geht damit nur ein Versprechen, kein
  Verhalten: Gebaut war er nie. Ersatz ist die Arbeitsregel «Schnittstellen bleiben mit dem
  vorherigen Release verträglich», die schon dasteht.
- **Kritisch gelesen:** Der Rückfall aus E-09 («Doku auf ‹gibt es noch nicht›») wäre für den
  Fehlerfall selbst falsch, denn der ist gebaut (von SvelteKit) und in Anhang C.1 beobachtet. Auch
  beim Rückfall müsste die Doku sagen, was heute gilt.

#### 4 Kennung, Paketversion und F-15

- **Zwei Dinge, die heute beide «Version» heissen [G]:** (a) die **Paketversion** aus
  `package.json` (`__APP_VERSION__` → `APP_VERSION`): Fusszeile, `/api/status`, Changelog, Tag;
  an ihr hängen ADR-007, die Regel «jeder Merge mit Code bekommt eine Version», E-07 und F-15.
  (b) die **Kennung des Builds** von SvelteKit: Zeitstempel, für Menschen unsichtbar, nur für
  «ist der Server neuer als meine App».
- **Empfehlung: `version.name` nicht setzen.** Gründe: (1) Der Zeitstempel ist je Build neu,
  erkennt also auch «neu ausgeliefert, gleiche Versionsnummer»; die Paketversion als Kennung
  erkennte das nicht. (2) Er hängt nicht an F-15: Was nach Schritt 23 eine Version ist und wie
  oft sie steigt, ändert an der Erkennung nichts. Die Paketversion als Kennung nähme F-15 vorweg
  (bei Antwort B von F-15 stiege sie gar nicht). (3) Test und Live bekommen dasselbe Image
  (`check.yml`, Kommentar zur Auslieferung), also dieselbe Kennung; Live «bemerkt» nichts, was
  nicht ausgeliefert wurde. (4) Der Commit als Kennung (Vorschlag der Doku) ginge im Image nicht
  ohne Umbau: `.dockerignore` schliesst `.git` aus; es bräuchte ein Build-Argument in CI und
  `Dockerfile` (ausserhalb des Schritts, E-16).
- **Folge:** Schritt 19 berührt weder die Paketversion noch die Versionsregel. Er selbst bekommt
  wie jeder Merge mit Code eine Version (E-07 gilt bis Schritt 23).
- **«Bewusst festzulegen»** (Hinweis aus dem Review von Schritt 02) heisst danach: bewusst
  **nicht** setzen und das an der Stelle sagen (ein Kommentar in `vite.config.ts`, ein Satz in
  der Doku). `Dockerfile:9` und `docs/testkonzept.md:126` nennen den «Bauzeitstempel von
  `version.json`» und bleiben damit richtig.
- **`pollInterval`:** Voreinstellung lassen. Für eine App, die auf dem Handy in den Vordergrund
  geholt wird, trägt die Prüfung bei Sichtbarkeit; die Stunde ist nur der Boden für einen Tab,
  der offen bleibt.

#### 5 Sichtbar für die Nutzerin, Absicherung

- **Entfernen des Eigenbaus:** nichts sichtbar [G: niemand liest ihn].
- **Die Ergänzung im Layout, ohne neue Auslieferung:** nichts sichtbar; `updated.current` bleibt
  falsch.
- **Nach einer Auslieferung, App war offen:** Der nächste Seitenwechsel lädt die Zielseite als
  ganzes Dokument statt in der App. Sichtbar: kurzer Neuaufbau statt des Schiebe-Übergangs
  (`onNavigate`, `+layout.svelte:98`); die gemerkten Rollstände und Klappen sind weg (`stand`,
  `vergissKlappen`, nur im Speicher). Einmal je Auslieferung und Gerät. **Das ist eine sichtbare
  Verhaltensänderung im Sinn von E-45**, klein und selten (F-36).
- **Halb ausgefülltes Formular [G]:** Das Wurzel-Layout hat schon ein `beforeNavigate`
  (`+layout.svelte:74`): Trägt die Seite ein Formular mit `data-ungespeichert` und kommt der
  Wechsel von einem Link, bricht es ab und zeigt die Rückfrage; «Verlassen» wechselt mit `goto`.
  Die Ergänzung muss **nach** dieser Prüfung stehen, dann fragt die App zuerst, wie heute. Zehn
  Stellen tragen das Merkmal [E: Textsuche; fünf Formulare der Verwaltung, Profil, CM-Seite,
  Doppel-Seite, Mitglied, Anlass]. Eingaben ohne Merkmal (Suchfelder, Filter) gehen beim
  Seitenwechsel schon heute verloren.
- **Drei Ränder der Vorlage aus der Doku, die der Schritt entscheiden muss [G für die Stellen, V
  für die Wirkung]:** (a) `goto` mit Zustand: `clubmeisterschaft/[id]/doppel/[kid]/+page.svelte:118`
  reicht `cmMeldung` als `state` mit; ein ganzes Laden verlöre die Rückmeldung. (b) Wechsel mit
  `replaceState` (Wächter, Umleitungen): `location.href` legte einen Eintrag im Verlauf an statt
  ihn zu ersetzen. (c) Zurück-Geste (`popstate`): `location.href = to.url.href` schöbe einen
  neuen Eintrag nach, statt zurückzugehen. **Vorschlag:** nur Wechsel der Art `link` laden neu
  (Reiter, Karten, Zurück-Link sind Links [E]); `goto` und `popstate` bleiben in der App. Das ist
  enger als die Vorlage und genügt: Der nächste angetippte Link kommt bald. Als reine Funktion
  neben `fragtVorWechsel` (`src/lib/ui/`), mit Einheitstest, wie `ungespeichert.ts`.
- **Endlosschleife (Betriebsrisiko aus Anhang C.1):** Die Ergänzung erzeugt keine. Sie lädt je
  angetipptem Link einmal; die neu geladene App liest ihre Kennung aus der frischen Hülle.
  Weicht `version.json` dauerhaft von der Hülle ab (nur denkbar bei einem Zwischenspeicher vor
  dem Server oder beim Fall aus C.1), lädt jeder Link ganz, bleibt aber bedienbar. Die Schleife
  aus C.1 (Fehlerseite ab Status 400) ist Bordmittel, besteht heute und bleibt.
- **Tests heute [G]:** keiner prüft eine neue Version. `tests/e2e/startseite.test.ts:20` und
  `bewegung.test.ts:47` prüfen die Paketversion in der Fusszeile; `ungespeichert.test.ts` und
  `tests/e2e/navigation.test.ts` die Rückfrage.
- **Tests für den Schritt:**
  1. `status.db.test.ts`: die vier Erwartungen auf `{ status, version }`, zuerst im Test (rot),
     dann der Code. `toEqual` hält fest, dass kein drittes Feld bleibt.
  2. Einheit: die neue Funktion «lädt dieser Wechsel neu?» (`link` und neue Version → ja; `goto`,
     `popstate`, `willUnload`, ohne neue Version → nein), vorher rot.
  3. E2E, eine Datei, ohne Konto und ohne Mail-Code (Seiten vor dem Login: `/login`, `/hilfe`,
     `/datenschutz`): `page.route('**/_app/version.json')` schiebt eine fremde Kennung unter;
     die Prüfung löst der Test mit einem `focus`-Ereignis am Fenster aus und wartet auf die
     Antwort (keine feste Wartezeit); dann ein Link. Erwartung: Die Zielseite ist als Dokument
     geladen (eine Marke am `window` ist weg). Gegenprobe im selben Test: ohne fremde Kennung
     bleibt die Marke. **Auf dem alten Stand rot** (heute lädt der Link nicht neu), das ist der
     Test «vorher rot» für die Verhaltensänderung. Dazu ein Fall «geändertes Formular: zuerst
     die Rückfrage» nur, wenn er ohne Konto geht; sonst deckt ihn die Reihenfolge im Einheitstest
     [V].
  4. Charakterisierung des Bordmittels (fehlender Baustein lädt neu): **nicht empfohlen**; der
     Test müsste den Namen eines gebündelten Bausteins erraten und prüfte SvelteKit, nicht MyTCO.
  5. E2E läuft gegen den gebauten Server; im Entwicklungsserver ist die Prüfung aus, dort ist
     nichts zu sehen. Vor dem Merge einmal die WebKit-CI auf dem Branch (N-23, P2-19c).
  6. Beide Builds (`npm run build`, `build:spa`) sind Teil von `make check`.
- **Nur von Hand prüfbar:** eine echte Auslieferung (alter Container weg, neuer da) mit einer
  offenen App auf einem echten Handy, auch als Startbildschirm-App auf dem iPhone. Das geht erst,
  wenn eine Umgebung läuft (B-02); bis dahin trägt der E2E mit untergeschobener Kennung.

#### 6 Dateien, Schnitt, Abbruchstellen, Risiko

**Dateiliste bei Antwort B (Empfehlung):**

| Datei | Änderung |
|---|---|
| `src/lib/server/version.ts`, `src/lib/server/version.test.ts` | entfallen |
| `src/lib/server/status.ts` | Import und Feld `mindestversion` weg |
| `src/routes/api/status/status.db.test.ts` | Import weg, vier Erwartungen ohne `mindestversion` |
| `src/lib/ui/` neue Datei mit Test (Name beim Schritt, Vorbild `ungespeichert.ts`) | reine Funktion «lädt dieser Wechsel neu?» |
| `src/routes/+layout.svelte` | Import `updated`; im vorhandenen `beforeNavigate` nach der Rückfrage der Aufruf |
| `tests/e2e/` neue Datei | der E2E aus 5 |
| `vite.config.ts` | nur ein Kommentar: Kennung ist mit Absicht der Zeitstempel des Builds |
| `docs/ci-cd-und-release.md` | Abschnitt «Alte Versionen auf dem Handy» (415 bis 424) neu, Satz zur Store-App (466) auf «gibt es noch nicht» |
| `docs/testkonzept.md:126` | ein Halbsatz: mit einer fremden `version.json` lädt auch jeder Link ganz |
| `docs/refactoring-analyse.md` | Stand, Zeile 19, Anhang F.2 |
| `package.json`, `package-lock.json`, `docs/versionen.md` | Version beim Merge, wie bei jedem Schritt [E] |

- **Nicht mehr in der Liste:** `Dockerfile` (der Healthcheck liest nur `status`, die Zeile 9
  bleibt richtig), `src/service-worker/index.ts` (kein Cache, nichts zu ändern),
  `status.test.ts`, `routen.test.ts`, `tests/e2e/startseite.test.ts`, `betrieb/` (E-16).
- **Bei Antwort A:** ohne die neue Funktion, ohne `+layout.svelte`, ohne E2E; die Doku
  beschreibt den Fehlerfall. **Bei Antwort C:** wie A, die Doku sagt «gibt es noch nicht».
- **`docs/ui-leitbild.md`:** bei B nicht nötig (keine neue Fläche, kein Text). Ein sichtbarer
  Hinweis «Neue Version» wäre neue Oberfläche und fiele unter «erst Leitbild, dann Code»; nicht
  vorgeschlagen.

**Schnitt in Commits (B):** (1) Eigenbau weg: Test zuerst, dann `version.ts`, `status.ts`.
(2) `test:` Einheitstest der neuen Funktion und der E2E, rot belegt. (3) Funktion und Layout,
Kommentar in `vite.config.ts`. (4) `docs:` beide Doku-Dateien und dieses Dokument. Commit (1) ist
für sich mergbar; an ihm endet der Schritt, wenn (2) oder (3) abbricht.

**Abbruchstellen:**

1. Die untergeschobene `version.json` macht `updated.current` im E2E nicht verlässlich wahr
   (auf einem der drei Geräte, besonders WebKit): kein Umweg über feste Wartezeiten; der Schritt
   endet nach Commit (1) mit der Doku nach Antwort A und meldet es.
2. Das ganze Laden stört die Rückfrage «Nicht gespeichert», den Schiebe-Übergang oder erzeugt
   Konsolenfehler, die `startseite.test.ts` fängt: abbrechen, melden.
3. Ein bestehender E2E wird rot, obwohl keine fremde Kennung im Spiel ist: abbrechen (die
   Ergänzung muss ohne neue Version wirkungslos sein).
4. Der statische Build bricht.
5. Es zeigt sich ein Leser von `mindestversion` ausserhalb der Textsuche (etwa im Ordner
   `intern/`, den dieser Lauf nicht liest): melden, nicht anpassen.

**Risiko:** Antwort B «mittel» (Wurzel-Layout und Navigation, ein neuer E2E auf WebKit; aber
wirkungslos ohne neue Version, und eine einzige Verzweigung). Antwort A und C «niedrig».
**Modell:** bei B Opus, wie die Zeile; bei A oder C genügt Sonnet. **Weg:** Subagent, ein Lauf;
der Schritt ist klein (unter 100 Zeilen Code und Tests ohne die Doku [V]) und fasst keine Datei
an, die 20 oder 20a brauchen, ausser `+layout.svelte` (Schritt 20, Hinweis (j), ein Kommentar).

#### Abweichungen von der Zeile 19 und den Hinweisen

- «Mit den Bordmitteln … lädt beim nächsten Seitenwechsel neu»: Das Bordmittel allein tut das
  nicht; es braucht die Ergänzung aus der Doku (eigener Code im Layout).
- «`kit.version.name` ist bewusst festzulegen»: Ergebnis ist «bewusst nicht setzen».
- «`Dockerfile` (Zeile 9)», «allenfalls `src/service-worker/index.ts`»: entfallen.
- «Ein Test kann `version.json` per `page.route` unterschieben»: bestätigt als Weg; dazu braucht
  es einen Auslöser der Prüfung (Fokus-Ereignis), sonst wartet der Test eine Stunde.
- Zeile 19 nennt als Nutzen nur B-04. Der Abschnitt der Doku wird bei jeder Antwort neu
  geschrieben; fünf seiner sieben Sätze stimmen heute nicht (Tabelle in 3).
- Voraussetzung «der Nachtrag zur Etappe 2 ist gemergt»: Im gemessenen Stand `7159355` ist er
  es nicht (`package.json` 0.22.5) [G]. Der Nachtrag ändert keine Datei dieses Schritts.

#### Fragen an den Projektleiter

F-35 (Bordmittel, Ergänzung oder nur entfernen) und F-36 (Halt nach dem Schritt), Wortlaut in
9.1. Kein weiterer Entscheid nötig: Kennung, Abfrage-Abstand, Schnitt und Tests folgen aus dem
Gemessenen.

#### Bleibt (gut gelöst)

- Der Service Worker ohne Cache: Er ist der Grund, warum «neue Version beim nächsten Start» ohne
  jeden Code stimmt.
- `APP_VERSION` an einer Stelle (`src/lib/version.ts`) und die Fusszeile mit Test.
- `/api/status` mit `no-store`, ohne Details im Fehlerfall, und der Healthcheck, der nur
  `status` liest: Darum ist das Entfernen ohne Folgen für den Betrieb.
- Die Rückfrage «Nicht gespeichert» als reine Funktion mit Test; sie ist das Vorbild für die
  neue Funktion.
- Der eigene Build-Ordner je E2E-Lauf (E-27).

#### Nicht geprüft, dünn belegt

- Kein laufender Server: Kopfzeilen der Hülle und von `version.json` (Cache) sind aus dem
  Quelltext gelesen, nicht gemessen; Caddy (`betrieb/caddy/`) nur nach Cache-Angaben durchsucht
  (keine gefunden) [E].
- Die Ergänzung ist nicht getippt und nicht gebaut; dass `focus` am Fenster die Prüfung in
  allen drei Geräteprofilen auslöst, folgt aus dem Quelltext von SvelteKit, nicht aus einem Lauf
  [V]. Darum Abbruchstelle 1.
- Verhalten auf einem echten Handy (Startbildschirm-App im Hintergrund, Rückkehr) [V].
- Vorladen beim Antippen (`data-sveltekit-preload-data="tap"`, `app.html:22`): Wie ein
  gescheitertes Vorladen und das Neuladen im Fehlerfall zusammenspielen, ist nicht gelesen [V].
- `+layout.svelte` ab Zeile 136 und die 36 Seiten sind nicht darauf gelesen, ob eine von ihnen
  Zustand über einen Link-Wechsel im Speicher trägt; gefunden ist nur `cmMeldung` (über `goto`)
  [E: Textsuche nach `state:`].
- «Zehn Stellen mit `data-ungespeichert`» und «Reiter sind Links» aus Textsuche [E].
- Der Ordner `intern/` ist nicht gelesen; `docs/superpowers/` nur über die Textsuche.
- Die Wirkung auf die Abdeckung ist nicht gemessen.

### F.2 Schritt 19

**Lauf** (14.11.2026, refactor-implementer auf Opus, Worktree `refactor/schritt-19` auf
`origin/dev` `8c4f8d2`, Version 0.22.6, plus das Nachmessen; Auftrag nach E-61, Antwort B).
Gelesen [G]: Kopf, Zeile 19 mit den Hinweisen, F.1, E-09, E-61, E-62, F-35, F-36; beide
`CLAUDE.md`; `docs/ci-cd-und-release.md` (Abschnitte «Alte Versionen auf dem Handy» und
«Ausblick: Store-App»), `docs/testkonzept.md` (Testdaten, Zeile 126), `docs/datenschutz.md`
(Textsuche). SvelteKit-Doku über den Svelte-MCP-Server (`$app/state`, `$app/navigation`,
`@sveltejs/kit/vite`, 14.11.2026) und der Quelltext des installierten Pakets 3.1.1
(`runtime/app/state/client.svelte.js`, `runtime/client/client.js`: `updated.check`, Ereignisse
`focus` und `visibilitychange`, `_before_navigate`, Klick auf Links) [G].

**Ergebnis: Antwort A.** Der Eigenbau ist weg. Die Ergänzung zum Bordmittel ist gebaut und im
Verhalten auf allen drei Geräten gelungen, aber an **Abbruchstelle 2** gescheitert: Das ganze
Laden erzeugt auf dem iPhone-Profil (WebKit) Konsolenfehler. Nach E-61 endet der Schritt darum
mit A, ohne Umweg; die Ergänzung ist nicht im Branch.

#### 1 Was gebaut und geprüft wurde

- **Eigenbau weg (bleibt):** `src/lib/server/version.ts` und `version.test.ts` gelöscht, in
  `src/lib/server/status.ts` Import, Feld des Typs und Feld der Antwort weg; `status.db.test.ts`
  erwartet `{ status, version }` (viermal `toEqual`). `APP_VERSION` bleibt für Fusszeile und
  `/api/status`. Abbruchstelle 5 nicht eingetreten: kein Leser von `mindestversion` ausserhalb
  der Tests, auch nicht in `intern/` (den Ordner gibt es im Hauptordner nicht) [G: Textsuche über
  das Repo ohne `node_modules`, `.git`, Build-Ordner].
- **Ergänzung (verworfen):** eine reine Funktion `laedtGanzNeu(wechsel, { neueVersion,
  ungespeichert })` unter `src/lib/ui/neue-version.ts` (wahr nur für `link`, ohne `willUnload`,
  mit neuer Version und wenn die Rückfrage nicht kommt), fünf Einheitsfälle; im vorhandenen
  `beforeNavigate` des Wurzel-Layouts nach der Rückfrage:
  `if (to && laedtGanzNeu(navigation, { neueVersion: updated.current, ungespeichert })) { navigation.cancel(); location.href = to.url.href; return; }`.
  `cancel()` statt der Vorlage, damit der Wechsel in der App nicht neben dem Laden weiterläuft.
  Autofixer: keine Probleme.
- **E2E (verworfen):** `tests/e2e/neue-version.test.ts`, drei Fälle, ohne Mail-Code (Brief-Code),
  über Rolle und Beschriftung, ohne feste Wartezeit: `page.route('**/_app/version.json')` mit
  fremder Kennung, `focus` am Fenster, Warten auf die Antwort; ganzes Laden erkannt an einer
  Marke am `window`. (1) Gegenprobe ohne fremde Kennung; (2) Link nach neuer Version; (3)
  geändertes Formular: Rückfrage zuerst, «Abbrechen» behält die Eingabe, «Verlassen» (`goto`)
  und die Zurück-Geste bleiben in der App, erst der nächste Link lädt neu.
  Abbruchstelle 1 **nicht** eingetreten: `updated` wurde in jedem Lauf wahr.

#### 2 Zahlen

| Lauf | Ergebnis |
|---|---|
| `status.db.test.ts` auf dem alten Code | rot, 4 von 9 (die vier Erwartungen) |
| E2E auf dem alten Stand (ohne Ergänzung) | rot, 6 von 9: Fälle 2 und 3 je Gerät, genau an der Erwartung «Marke weg»; Rückfrage, `goto` und Zurück schon grün; Gegenprobe grün |
| Einheitstest, zwei Mutationen | je 1 von 5 rot (ohne Rückfrage-Prüfung; `type !== 'leave'` statt `=== 'link'`), danach 5 von 5 |
| E2E mit der Ergänzung (`cancel`), 15 Wiederholungen | Android und Desktop 90 von 90 grün; iPhone 36 von 45, **9 rot**, alle nur an `expect(fehler).toEqual([])`: `TypeError: Load failed` (7), `… /api/kontakt due to access control checks.` (1), `… /api/sitzung due to access control checks.` (1), `TypeError: Importing a module script failed.` (1); Fall 2: 2 von 15 rot, Fall 3: 7 von 15 |
| E2E mit der wörtlichen Vorlage der SvelteKit-Doku (ohne `cancel`, kein `return`), nur iPhone, 15 Wiederholungen | 43 von 45, **2 rot**, ebenso Konsolenfehler (`… /api/anlaesse`, `/api/cm`, `/api/kontakt`, `/api/sitzung … due to access control checks.`) |
| voller `make check` auf `28a37df` (Stand A) | grün, Exit 0: Lint, `svelte-check`, Prüfskripte, 2411 Tests in 170 Dateien (vorher 2427; 16 Fälle von `version.test.ts` entfallen), Abdeckung 96,98 % Anweisungen, beide Builds, E2E 524 bestanden, 64 übersprungen, 3,5 Minuten |

- **Deutung [E]:** Das ganze Laden bricht Abrufe und Modul-Ladevorgänge ab, die beim Antippen
  schon laufen (Vorladen beim Antippen, `data-sveltekit-preload-data="tap"`; die Reiter laden
  ihren Code `eager`). WebKit meldet abgebrochene Abrufe als Fehler in der Konsole; Chromium
  nicht. Für die Nutzerin ist nichts zu sehen, das Verhalten stimmt. Der Wortlaut von
  Abbruchstelle 2 («erzeugt Konsolenfehler, die `startseite.test.ts` fängt») trifft aber zu,
  und dieselbe Sammlung (`sammleKonsolenfehler`) hält jeder E2E fest, der einen solchen Link
  antippt.
- **Warum kein Umweg:** Jede Rettung wäre ein Umweg im Sinn von E-61: im Test die Meldungen von
  WebKit herausfiltern (schwächt die Konsolen-Prüfung), das Vorladen nach einer neuen Version
  abschalten oder abwarten (neues Verhalten), das Neuladen nach dem Wechsel in der App
  (`afterNavigate` und `location.reload()`, lädt doppelt). Entscheiden müsste das der
  Projektleiter.

#### 3 Was im Branch bleibt (Antwort A)

| Commit | Inhalt |
|---|---|
| `92a23a1` `test:` | `status.db.test.ts` ohne `mindestversion` (rot belegt) |
| `7b9b38e` `refactor:` | `version.ts` mit Test weg, `status.ts` ohne Feld |
| `8ba6016` `test:` | E2E zur Ergänzung (auf dem alten Stand rot belegt) |
| `38979d7` `test:` | derselbe E2E zurückgenommen (Abbruchstelle 2) |
| `28a37df` `docs:` | `docs/ci-cd-und-release.md` («Alte Versionen auf dem Handy» neu, Satz zur Store-App), Kommentar in `vite.config.ts`, `docs/versionen.md` «Unveröffentlicht» |

- Die Funktion `neue-version.ts` mit Test und die Änderung am Layout sind **nie committet**; der
  E2E steht in `8ba6016` im Verlauf. Für einen späteren Versuch genügt die Zeile oben.
- `docs/testkonzept.md` bleibt unverändert: Zeile 126 ist bei A in der Sache richtig (F.1,
  Abschnitt 4), die Datei nennt sonst weder Mindestversion noch Neuladen [G].
- `docs/ui-leitbild.md` unverändert (keine Fläche, kein Text).
- **Datenschutz:** nicht berührt. Entfernt wird ein Feld ohne Personenbezug; das Bordmittel
  ruft nur die statische Datei `_app/version.json` ab; der Gerätespeicher (Code- und
  Wechselanfrage) übersteht ein Neuladen wie bisher [G: Textsuche in `docs/datenschutz.md`].

#### 4 Für die Nutzerin

Nichts. Was die Doku bisher zusagte (Mindestversion bei jeder Antwort, Eingabe bleibt erhalten,
Store-App prüft die Mindestversion), war nie gebaut und steht nicht mehr da. Eine offene App
lädt wie bisher nur neu, wenn ein Seitenwechsel scheitert; sonst läuft der alte Code bis zum
nächsten Start.

#### 5 Ausserhalb des Schritts (Beobachtungen, nicht behoben)

- **WebKit und abgebrochene Abrufe:** Dasselbe gilt für das Neuladen, das das Bordmittel im
  Fehlerfall heute schon macht: Auch dort meldet WebKit abgebrochene Abrufe in der Konsole. Kein
  E2E prüft den Fehlerfall (F.1, Test 4: nicht empfohlen); für die Nutzerin unsichtbar.
- **Autofixer zum Wurzel-Layout:** schlägt für bestehenden Code vor, `zeigeTitel` und
  `kopftitel` nicht in einem `$effect` zu setzen und `bind:this` durch eine Attachment zu
  ersetzen; keine Fehler. Nicht Teil dieses Schritts (Schritt 20 kennt das Layout nur für einen
  Kommentar).
- **Hook und roter Einheitstest (A-15):** wie bekannt; der rote Einheitstest der Funktion stand
  darum nur im Bericht.

#### 6 Nicht geprüft

- Ein echtes Handy, auch als Startbildschirm-App auf dem iPhone; eine echte Auslieferung mit
  offener App (B-02).
- WebKit unter Linux (iPhone-CI): nicht gelaufen. Für A ohne neuen E2E nicht nötig (P2-19c).
- Ob die Konsolenfehler auch auf einem echten iPhone (Safari) auftreten [V].
- Der Fehlerfall des Bordmittels (fehlender Baustein, Status ab 400) ist nur aus dem Quelltext
  belegt (F.1), nicht in einem Lauf.
- **Review (14.11.2026, refactor-reviewer): «ok», nichts vor dem Merge zu beheben.** Stand entspricht
  Antwort A, von B ist nichts übrig, der Eigenbau ist ganz weg (kein Leser in `betrieb/`, CI,
  `Dockerfile`, Skripten); die Aussagen der Doku sind an SvelteKit 3.1.1 und am Service Worker
  nachgelesen. Hinweise, erledigt (Orchestrator): Einleitungssatz in `docs/ci-cd-und-release.md`
  enger gefasst («Der Service Worker speichert nichts zwischen», der Browser hält die gehashten
  Bausteine); E-61 und F-35 tragen den Ausgang; Kopf nachgeführt. Lesart, offengelegt:
  Abbruchstelle 2 nennt Konsolenfehler, «die `startseite.test.ts` fängt»; gefangen hat sie der
  neue E2E über dieselbe Sammlung, die Stelle trifft dem Sinn nach zu. Nicht geprüft vom Reviewer:
  die Messläufe zu B (nie committet), `make check` (grüner Stand bestätigt), WebKit unter Linux.

### F.3 Nachmessen Schritt 20

**Nachmessen vor Schritt 20** (14.11.2026, Worktree `refactor/schritt-20` auf `29b0023` =
`origin/dev`, Version 0.22.7; gelesen und gezählt, kein `make check`, kein E2E, keine Datenbank,
kein laufender Server, nichts installiert). Ganz gelesen [G]: `tests/e2e/hilfen/login.ts`,
`tests/hilfen/turnierjahre.ts`, `tests/hilfen/verwaltung-abruf.ts`, `playwright.config.ts`,
`src/lib/server/mitteilung/typen.ts`, `src/routes/+layout.ts`. In Auszügen [E]: `scripts/e2e.ts`
(Zeilen 58 bis 159), `.github/workflows/check.yml` (Job `e2e`), `grundpruefung.db.test.ts`
(60 bis 150), `routen.test.ts` (285 bis 345), `tests/hilfen/verwaltungs-listen.ts`,
`turnier-anzeige.ts` (80 bis 130), die 25 E2E-Dateien nur über Textsuche. GitHub [G]: Läufe
43622414674 (grün) und 43616298374 (iPhone rot), Dauer der Jobs und Grösse der Artefakte.

**Kurz:** Der Schritt ist kleiner in der Sache und grösser in der Zahl der Dateien, als die
Zeile 20 sagt. (1) Von rund 1180 exportierten Namen nutzt **drei** niemand (entfernen), bei
**25** genügt «`export` weg»; die übrigen Kandidaten sind Typen in Signaturen oder Namen, die ein
Test direkt prüft, und bleiben. Handarbeit reicht, **kein Paketvorschlag** (E-11). (2) Den alten
Weg mit festem Turnierjahr ruft **kein Test mehr** auf; es gibt keinen offenen Branch, der ihn
bräuchte. (3) Von den elf Hinweisen werden **sechs aufgenommen** ((b), (c), (f), (h), (j), und
(k) nach F-37), **fünf verworfen** ((a), (d), (e), (g), (i)). (4) Die Begründung von (i) trägt
nicht: Der Code der Verwaltung zählt je Adresse, nicht je IP. (5) Vorschlag: **zwei Läufe** mit
je eigenem Review, Lauf 1 Sonnet (Löschen, Umbenennen, Verschieben), Lauf 2 Opus (Testlogik).
Eine Frage an den Projektleiter: **F-37** (Spur in der CI, Kosten nach E-06).

#### 1 Ungenutzte Exporte

**Wie gesucht [G für die Zählung, E für die Methode]:** Textsuche in zwei Durchgängen über alle
versionierten Dateien unter `src`, `scripts`, `tests` (`.ts`, `.svelte`) und die
Einstellungsdateien der Wurzel. Erfasst sind `export function`, `async function`, `const`,
`let`, `type`, `interface`, `class`, `enum`: 1181 Namen in 175 Dateien, ohne Testdateien und
ohne die Routen-Dateien `+*.ts` (deren `load`, `GET`, `POST`, `ssr`, `prerender` liest
SvelteKit). Durchgang 1: Der Name kommt als ganzes Wort in keiner anderen Datei vor.
Durchgang 2: Keine andere Datei nennt den Namen **und** importiert ein Modul dieses Dateinamens
(findet Namen, die zufällig zweimal vorkommen, z. B. `bereichVon`, `THEMEN`, `GespraechZeile`).
Von Hand dazu: die drei Listen `export { … }` (`einlesen.ts:13`, `rollen.ts:87`: alle fünf Namen
haben Nutzer), `export default` (nur `tests/setup/datenbank-global.ts`, liest Vitest),
Namespace- und dynamische Importe (`import * as schema` in `db/index.ts`, `await import` nur in
Tests), Dateien ohne Importeur unter `src/lib` und den Test-Hilfen (keine). Bei allen Werten
und bei den 26 nur von Tests genutzten Namen mit zwei Eigennennungen ist die Nutzung in der
eigenen Datei als Code gelesen, nicht als Kommentar [G].

**Was die Suche nicht sieht:** (a) einen Namen, den eine andere Datei nennt, die dasselbe Modul
aus anderem Grund importiert, oder ein gleichnamiges Modul (`api`, `schnittstellen`, `angaben`
gibt es mehrfach): Er gilt als genutzt; die Liste ist darum eine Untergrenze. (b) Nutzung, die
nur noch von totem Code kommt (keine Erreichbarkeit von den Routen aus). (c) Eigenschaften
exportierter Objekte und Felder von Typen. (d) Namen in Zeichenketten. Was die Suche zu viel
meldete, fängt nach dem Entfernen `svelte-check` und ESLint (`no-unused-vars` meldet einen
Namen, der nach «`export` weg» gar nicht mehr gebraucht wird).

**Ergebnis gegen B-18** («rund 60 ohne Nutzer, weitere 35 nur von Tests», Stand 11.11.2026
[E]): heute unter `src/lib` **83** ohne Nutzer ausserhalb der eigenen Datei und **51** nur von
Tests genutzt [G, Zählung]; dazu `scripts/pruefungen` 7 und 22, Test-Hilfen 7.

| Urteil | Zahl | Namen (Datei) |
|---|---:|---|
| **entfernen** | 3 | `warnungText` (`src/lib/verwaltung/turnier-anzeige.ts:94`; nur sein Test, drei Erwartungen in `turnier-anzeige.test.ts:93–99`; Hinweis (f)); `RangZeile` (`src/lib/interclub/api.ts:19`; keine Nennung, der Import `IcRangZeile` geht mit); `GespraechZeile` (`src/lib/verwaltung/gespraech-api.ts:11`; keine Nennung, der Import-Alias `ServerGespraechZeile` geht mit; der gleichnamige Typ in `server/gespraech/gespraech.ts` bleibt) |
| **nur `export` weg** (Werte, nur in der eigenen Datei gebraucht) | 25 | `scripts/pruefungen`: `pruefstand` (`gruener-stand.ts`), `vergleicheVersionen` (`release.ts`). `src/lib`: `DURCHLAEUFE` (`hilfe/ablauf.ts`), `browserWebauthn` (`login/passkey.ts`), `RUFNAME_MAX`, `RUFNAME_MAX_TEXT` (`name.ts`), `BEDENKZEIT`, `FRIST_AUSTRITT` (`server/admin/mitgliedschaft.ts`), `VERWALTUNGSROLLEN` (`server/admin/rollen.ts`), `MAX_KURZ`, `MAX_EINLADUNG` (`server/anlass/angaben.ts`), `DAUER_MS` (`server/anlass/kalender.ts`), `fuerBrowser` (`server/anlass/schnittstellen.ts`), `SWISS_TENNIS` (`server/interclub/import.ts`), `THEMEN` (`server/mitteilung/themen.ts`), `MAX_TURNIERNAME`, `MAX_KATEGORIENAME`, `MAX_BEZEICHNUNG`, `MAX_NUMMER`, `JAHR_MIN`, `JAHR_MAX`, `JAHRGANG_MIN`, `SUMME_MAX` (`server/turnier/angaben.ts`), `titelText` (`ui/kopftitel.ts`). Test-Hilfe: `TCO_VEREIN` (`tests/hilfen/interclub.ts`) |
| **bleibt**, weil Typ in der Signatur eines exportierten Namens oder Teil eines exportierten Typs | 70 | `src/lib` 59 Typen (u. a. die sieben `St…` in `server/interclub/swiss-tennis.ts`, die `…Abh` der Dienste, `CsvZeile`, `CsvErgebnis`, `FehlerZeile`, `GueltigeZeile`, `Dateipruefung`, `DoppelErgebnis`, `DoppelSpieler`, `Zugangsfall`, `OhneZugang`, `Fehlerangaben`, die `…Liste` und `…Zeile` der Verwaltungs-Abrufe); `scripts/pruefungen` 5 (`Fragenstand`, `Markierung`, `Releasestand`, `Dokus`, `Testmuster`); Test-Hilfen 6 (`TestTurnier`, `E2eEinstellungen`, `Jahresbereich`, `Aufruf`, `Optionen`, `VerwaltungsSchnittstelle`). «`export` weg» ginge technisch (keine Deklarations-Ausgabe), nähme dem Aufrufer aber den Namen für das, was er bekommt; kein Gewinn |
| **bleibt**, weil eine Liste der Schnittstellen (liest Grundprüfung und Routen-Test, Dauerregel «Tests») | 7 | `ANLASS_`, `CM_`, `GESPRAECH_`, `INTERCLUB_`, `PASSKEY_`, `MITTEILUNG_`, `PROFIL_SCHNITTSTELLEN` |
| **bleibt**, weil in der eigenen Datei gebraucht und von einem Test direkt geprüft | 43 + 22 | `src/lib` 43 (z. B. `STATUS_ALLEIN`, `FEHLERWOERTER`, `Bremse`, `WechselSpeicher`, `mussVerlaengern`, `pruefeDatei`, `baueAdminCodeMail`, `zielOhneZugang`, beide `bereichVon`); `scripts/pruefungen` 22 (die `pruefe…`-Funktionen, die ihr Test aufruft) |

`doppelWarnungen` ist genutzt (`Aktionsdialog.svelte:123`), nur falsch benannt: Hinweis (f).

**E-11:** Die Handarbeit reicht für diesen Schritt. Ein Werkzeug für toten Code (ein Paket wie
`knip`) bräuchte es nur, wenn die Liste dauerhaft leer bleiben soll: Die grobe Suche vom
11.11.2026 fand rund 60, diese 83 (ein Teil des Unterschieds ist die Methode, ein Teil kam mit
#81 dazu). Das ist kein Antrag; Beobachtung für Schritt 24 oder danach.

#### 2 Festes Turnierjahr (N-26)

- **Stand [G]:** `legeTurnierAn(festesJahr)` hat **keinen** Aufrufer (einziger Aufruf:
  `verwaltung.test.ts:438`, ohne Jahr); `legeOffenesTurnierAn(festesJahr, …)` hat **keinen**
  (46 Aufrufe in 9 Dateien, alle mit der Liste der Kategorien als erstem Argument, auch die
  mehrzeiligen). Es gibt keinen offenen Feature-Branch (`origin` führt nur `dev`, `main` und
  vier von Dependabot) und keinen fremden Worktree. Die Bedingung des Eintrags vom 09.11.2026
  («entfernen, sobald die damals offenen Branches gemergt sind») ist erfüllt.
- **Was wegfällt:** in `login.ts` die Überladung `legeTurnierAn(festesJahr: number)`
  (Zeilen 121 bis 125), `legeTurnierMitFestemJahrAn` (127 bis 132), die Überladung
  `legeOffenesTurnierAn(festesJahr, kategorien)` samt der Verzweigung `typeof erstes ===
  'number'` (ab Zeile 162), die zwei Absätze der Kommentare dazu; rund 30 Zeilen. Kein Test
  ändert sich.
- **Was bleibt:** `loescheTurnier(jahr)`. `turnier.test.ts:67` legt ein Turnier über das
  Formular an (Jahr 2097 bis 2099 je Gerät) und räumt es vorher weg; das ist kein Rest des alten
  Wegs. `FREIE_JAHRE` bleibt. `tests/hilfen/turnierjahre.ts` (Datenbanktests) ist ein anderer,
  intakter Weg.
- **Kosten:** ein Commit, eine Datei, dazu der Eintrag in `docs/beobachtungen.md` (schliessen).
  Risiko: keines für die App; `svelte-check` und der E2E-Lauf zeigen einen übersehenen Aufrufer.

#### 3 Teilung von `tests/e2e/hilfen/login.ts`

- **Heute [G]:** 478 Zeilen, 37 Exporte (36 Funktionen, Typ `TestTurnier`), 13 Importe aus
  `src/lib/server/`; 25 der 29 E2E-Dateien importieren daraus. Ausserhalb von `tests/e2e/` nennt
  nur `docs/context-scopes.md:20` die Datei.
- **Aufrufer je Export (Zahl der Testdateien) [G]:** `schliesseLoginHilfen` 25,
  `legeKontoMitBriefCodeAn` 20, `holeMailCode` 14, `legeKontoAn` 11, `legeOffenesTurnierAn` 9,
  `legeRollenkontoMitBriefCodeAn` 9, `setzeSpielerangaben` 8, `legeAdminMitBriefCodeAn` 7,
  `legeCmMitBriefCodeAn` 6, `legeOffenenAnlassAn` 5, `meldeZurCmAn` 5, `warteAufMail` 4, `gibLogin`
  3, `setzeKontaktperson` 3, `stelleAnfrageDirekt` 3, je 2: `beantrageWildcardDirekt`,
  `bestaetigeVerwaltungDirekt`, `meldeZumAnlass`, `setzeAnmeldeschluss`, `setzeRufname`,
  `setzeTelefon`, `stelleBriefCodeAus`; je 1: `antworteAlsLeitung`, `beendeAlleSitzungen`,
  `benenneTurnier`, `entferneKontaktperson`, `laesstBriefCodeAblaufen`, `leereStrasse`,
  `legeEhemaligesAn`, `legeTurnierAn`, `loescheTurnier`, `meldePaarDirektAn`, `schreibeNachricht`,
  `setzeAusgetreten`; `TestTurnier` 0 (nur in der Datei). Jeder Export hat einen Aufrufer.
- **Vorgeschlagener Schnitt** (fünf Dateien unter `tests/e2e/hilfen/`, keine reicht etwas
  weiter, wie in Schritt 14):

  | Datei | Inhalt | Zeilen [V] |
  |---|---|---:|
  | `verbindung.ts` (neu) | `hole()` (eine Datenbank-Verbindung und ein Login-Dienst je Prozess) und das Schliessen; nur für die Hilfen | 35 |
  | `login.ts` (bleibt, kleiner) | Konten und Mitglieder: die fünf `lege…Konto…An`, `legeEhemaligesAn`, `gibLogin`, `stelleBriefCodeAus`, `laesstBriefCodeAblaufen`, `beendeAlleSitzungen`, `bestaetigeVerwaltungDirekt`, `setzeAusgetreten`, `leereStrasse`, `setzeRufname`, `setzeTelefon`, `schliesseLoginHilfen` | 160 |
  | `turnier.ts` (neu) | Turnier, CM und Gespräch: `TestTurnier`, `legeTurnierAn`, `legeOffenesTurnierAn`, `loescheTurnier`, `benenneTurnier`, `setzeAnmeldeschluss`, `setzeKontaktperson`, `entferneKontaktperson`, `setzeSpielerangaben`, `meldeZurCmAn`, `stelleAnfrageDirekt`, `meldePaarDirektAn`, `beantrageWildcardDirekt`, `schreibeNachricht`, `antworteAlsLeitung` | 200 |
  | `anlass.ts` (neu) | `legeOffenenAnlassAn`, `meldeZumAnlass` | 35 |
  | `mail.ts` (neu) | `holeMailCode`, `warteAufMail` (Mailpit, ohne Datenbank) | 65 |

  `login.ts` behält den Namen und `schliesseLoginHilfen`: So bleibt in allen 25 Dateien die
  Import-Zeile auf `./hilfen/login.ts` stehen, und `test.afterAll` ändert sich nirgends.
- **Was wechselt [G, gezählt je Datei]:** **19** Testdateien ändern nur ihre Importe (die
  bestehende Anweisung wird kürzer, **32** Import-Anweisungen kommen dazu: 11 auf `turnier.ts`,
  6 auf `anlass.ts`, 15 auf `mail.ts`); 6 Dateien bleiben unverändert (`benachrichtigungen`,
  `bewegung`, `cookie`, `hilfe`, `interclub`, `passkey`). Kein Testfall ändert sich.
- **B-11 bleibt, wie es ist:** Die Hilfen rufen weiter Fachfunktionen des Servers; aus einer
  Fassade werden vier Dateien mit Server-Importen. Das war nie Ziel des Schritts.

#### 4 Die elf Hinweise

| | Stand heute, Stellen | Aufwand, Risiko | Urteil |
|---|---|---|---|
| **(a)** `finally` in `scripts/e2e.ts` | unverändert: `scripts/e2e.ts:150–156`, erst `entferneBuildOrdner` (`rmSync` mit `force`), dann `stelleTypenWiederHer`, dann das Löschen der Datenbank [G] | rund 10 Zeilen im Werkzeug, das jeder Prüflauf braucht; `main()` hat keinen Test | **verwerfen.** Beide Folgen heilen von selbst: alte Datenbanken und Build-Ordner räumt der nächste Lauf nach einem Tag (`raeumeAlteAuf`, `raeumeAlteBuildsAuf`), `svelte-kit sync` läuft in jedem `npm run check:svelte` (`package.json:13`). Kein Vorfall belegt [E]. Bleibt in Anhang C.1 festgehalten |
| **(b)** «schreibend» erkennen | Grundprüfung `grundpruefung.db.test.ts:146` (`startsWith('post')`), Rechte-Matrix `rechte-matrix.db.test.ts:211` (`!startsWith('get')`); dieselbe Annahme an 12 weiteren Stellen in fünf Modul-Tests. Heute gleichwertig: alle 101 Namen der 13 Listen beginnen mit `get` (33) oder `post` (68) [G, aus den Listen gelesen] | eine Prüfung im Routen-Test, rund 8 Zeilen; Testlogik | **aufnehmen**, als eine Prüfung statt als Umbau: «Zu `GET` gehört ein Name mit `get`, zu `POST` einer mit `post`» in `routen.test.ts` (dort steht je Adresse und Methode die Funktion). Damit ist das Präfix eine geprüfte Abmachung, beide Erkennungen bleiben. Vorher rot mit einem umbenannten Eintrag |
| **(c)** Listen der Mitglieder (N-11) | zwei Stellen von Hand: `grundpruefung.db.test.ts:74–112` (`mitgliederDienste()`, sieben Listen mit je eigenen Diensten), `routen.test.ts:320–330` (`MITGLIEDER`) [G] | neue Datei `tests/hilfen/mitglieder-listen.ts` (Schlüssel Modul → Liste), zwei Testdateien; die Grundprüfung ordnet je Schlüssel die Dienste zu, ein fehlender Schlüssel ist ein Typfehler; Testlogik | **aufnehmen.** Schliesst die Lücke aus D.8 (neue Liste läuft durch keine 401/415-Schleife). Rot-Probe: eine Liste aus der Datei nehmen (Routen-Test rot), einen Schlüssel ohne Dienste (Typfehler). **Folge:** Der Satz der `CLAUDE.md` zu neuen Listen der Mitglieder ändert sich (C-1); der Implementer meldet ihn, er ändert die Datei nicht |
| **(d)** `MitteilungAdminDienste` (N-12) | Typ als ganzes Wort: **17 Dateien, 63 Nennungen** (8 App-Dateien, 8 Tests, `tests/hilfen/verwaltungs-listen.ts`). Dazu der Einstieg `holeMitteilungAdminDienste`: **28 Dateien, 69 Nennungen** (24 Routen unter `api/admin/`, `dienste.ts`, `routen.test.ts`, `bauregel.ts:87` in `VERWALTUNGS_EINSTIEGE`, `bauregel.test.ts`). Zusammen 44 Dateien wie in 1d gezählt; Doku 8 Dateien [G] | nur der Typ: 17 Dateien, mechanisch; mit dem Einstieg: 44 Dateien und die Erlaubt-Liste der Bauregel | **verwerfen.** Nur den Typ umzubenennen liesse `holeMitteilungAdminDienste` mit dem alten Namen stehen (halbe Arbeit); beides fasst Schutz-Code und 24 Routen an, für einen Namen. Bleibt Beobachtung (N-12) für nach dem Feature-Stopp |
| **(e)** Hilfsdateien ohne Regel (N-06) | unverändert seit D.15: `gespraech/antworten.ts` (22 Zeilen, zwei Importeure im eigenen Modul), `cm/verwaltung-meldung.ts` (26 Zeilen, importiert von `cm/verwaltung-schnittstellen.ts:40` und `turnier/schnittstellen.ts:12`) [G] | Regel in `bauregel.ts` mit Tests; Prüfwerkzeug | **verwerfen, endgültig.** Die zwei Gründe aus D.15 gelten weiter: Beide Dateien prüfen keine Rechte, eine Regel schützte nichts; die naheliegende Form meldete sofort den Import aus `turnier/`, und App-Code wird nicht geändert |
| **(f)** Namen der Warnungen (H-03, H-04) | `warnungText`: `turnier-anzeige.ts:94`, nur der Test. `doppelWarnungen`: `turnier-anzeige.ts:100`, `Aktionsdialog.svelte:13` und `:123`, Test `:9`, `:173–182` [G] | zwei kleine Commits, drei Dateien | **aufnehmen**, beide Teile: `warnungText` mit seinen Erwartungen weg; `doppelWarnungen` → `warnungsSaetze` (der Kommentar sagt dann «Einzel und Doppel») |
| **(g)** Suche über `div.karte` (H-05) | `cm-ablauf.test.ts:70`; **dieselbe Hilfe** steht in `cm-anmeldung.test.ts:70`, `cm-verwaltung.test.ts:88`, `cm-doppel.test.ts:106`, dazu `navigation.test.ts:318`, `cm-gespraech.test.ts:283`. Die Karte einer Kategorie ist ein `<div class="karte">` ohne Rolle und ohne Namen (`clubmeisterschaft/[id]/+page.svelte:480`, `:528`) [G] | ohne Eingriff in die App nicht lösbar: Für «Rolle und Beschriftung» bräuchte die Karte eine Rolle und einen Namen (ändert, was ein Bildschirmleser vorliest; erst Leitbild, dann Code) | **verwerfen.** Eine Stelle von sechs zu ändern hilft nicht, und der saubere Weg ist eine Verhaltensänderung (Feature-Stopp). **Befund dazu:** Die Dauerregel «nicht über CSS-Klassen» hält die Praxis nicht: rund 108 Suchen über Klasse oder Element in 22 E2E-Dateien [E, Muster]. Das gehört in die Revision der `CLAUDE.md` (Schritt 24: Regel so fassen, wie sie gilt) und als Beobachtung in `docs/beobachtungen.md` |
| **(h)** kopierte Test-Hilfen (H-18) | heute **acht** Kopien von `Aufruf`, `holer`, `json` (sieben aus E.4 und seit #81 `interclub/api.test.ts`): `src/lib/abruf.test.ts:11`, `anlass/api.test.ts:5`, `cm/api.test.ts:26`, `interclub/api.test.ts:5`, `login/anmelden.test.ts:13`, `profil/angaben.test.ts:19`, `push/api.test.ts:5`, `verwaltung/mitteilung-api.test.ts:19`. `login/passkey.test.ts:14` hat eine andere Hilfe (Antworten der Reihe nach) und bleibt. Fünf Verwaltungs-Tests nutzen die gemeinsame Datei schon [G] | je Datei rund 18 Zeilen weg, eine Import-Zeile dazu; mechanisch | **aufnehmen.** Die gemeinsame Datei heisst dann besser `tests/hilfen/abruf.ts` (sie dient nicht mehr nur der Verwaltung): Umbenennen mit `git mv`, fünf Import-Zeilen mehr. Weicht eine Kopie ab (z. B. der Typ `Holen` in `abruf.test.ts`), bleibt diese Datei, und der Bericht nennt sie. Zahl der Testfälle unverändert |
| **(i)** Bestätigung ohne Mail-Code (H-19) | Den Code der Verwaltung holen **56 Tests in 12 Dateien** (je Gerät einmal, also bis 168 Codes je Lauf): `verwaltung` 16, `briefe` 8, `cm-verwaltung` 7, `mitteilungen` 6, `cm-doppel-verwaltung` 5, je 3 `cm-gespraech`, `einlesen`, `mitgliedschaft`, `turnier` 2, je 1 `anlass`, `cm-anmeldung`, `wappen` [G, über die Hilfen der Datei gezählt]. `bestaetigeVerwaltungDirekt` nutzen heute 5 Tests (`anmeldungsliste-ablauf` 4, `waechter` 1) | zwölf Hilfsfunktionen umbauen (anmelden, direkt bestätigen, Ziel aufrufen); Testlogik in 12 Dateien | **verwerfen.** Die Begründung trägt nicht: Der Code der Verwaltung zählt **je Adresse** (`admin/zugang.ts:121–127`, `mailsProAdresseStunde` und `…Tag`), nicht je IP, und jeder Test hat ein eigenes Konto. Das Budget von 10 je Stunde und IP (`login/bremse.ts:78`, `anfragenProIp`) teilen nur der Login-Code und der E-Mail-Wechsel; dort fragen heute `login.test.ts` (1 Test), `profil.test.ts` (1 Test) und `mitgliedschaft.test.ts:104` (nur Android) an. Der Gewinn wäre Laufzeit, nicht gemessen [V]. **Diese Tests prüfen die Bestätigung selbst und behielten den Code in jedem Fall:** `verwaltung.test.ts:65` (SI-08, Admin bestätigt) und `:229` (SI-08, falscher Code, zwei Codes), `turnier.test.ts:60` und `:179` (RR-07, Ziel nach der Bestätigung für die Rolle CM); ohne Code prüfen die Seite `waechter.test.ts:280` und `:510`. Wohin die Bestätigung je Rolle führt, prüfen auch die Hilfen `bestaetige` in `cm-verwaltung.test.ts:61` und `mitteilungen.test.ts:41` [E] |
| **(j)** zwei Kommentare (H-23) | `src/lib/cm/api.ts:59` («bei 400»); der zweite steht in `src/routes/+layout.ts:9` (nicht in `+layout.svelte`, wie die Zeile 20 sagt): «Läuft keine Ansicht, lädt das Layout erst nach `refreshAll()` wieder» gilt nur mit Sitzung, die Zeilen 12 bis 14 sagen es schon richtig [G] | zwei Sätze | **aufnehmen** |
| **(k)** Spur bei rotem E2E in der CI (N-23) | siehe unten | siehe unten | **nach F-37**; Empfehlung: als Schalter aufnehmen (Antwort B) |

**Zu (k), was heute aufgezeichnet wird [G]:** `playwright.config.ts:29–36`: `screenshot: 'on'`
(ein Bild je Test), kein `trace`, kein `video`, keine `retries`. Der Job `e2e` in `check.yml`
(Zeilen 148 bis 215) läuft je Gerät, Zeitgrenze 20 Minuten, und lädt `test-results/` immer hoch
(`if: always()`, 30 Tage). Gemessen am Lauf 43622414674 (grün): iPhone 10,0 Minuten, Android
4,1, Desktop 3,9, zusammen 18 Minuten; Artefakte 78, 81 und 22 MB, zusammen 181 MB. Der rote
Lauf 43616298374 ist gleich gross (78, 81, 22 MB): Aus den Artefakten lernt man bei Rot nicht
mehr als bei Grün. Das Repo ist öffentlich [G]; Minuten und Speicher auf den Standard-Runnern
kosten dann kein Geld [E, Regel von GitHub, nicht nachgelesen], wohl aber Wartezeit.

**Was eine Spur kostet:** `trace: 'retain-on-failure'` zeichnet für **jeden** Test auf (Abbilder
der Seite, Netz, Konsole) und wirft die Spur bei Grün weg. Der Zuschlag auf die Laufzeit trifft
also jeden Lauf, auch den grünen; wie gross er hier ist, ist **nicht gemessen** [V] und ohne
E2E-Lauf nicht messbar. Ein einzelner Messlauf entscheidet es auch nicht sicher: Der iPhone-Job
schwankt ohnehin zwischen 7,9 und 10,8 Minuten (N-23). Die Artefakte wachsen nur bei Rot, um
eine Datei je rotem Test [V: einige MB]. **Wiederholungen braucht es dafür nicht.**
`on-first-retry` (Spur nur im zweiten Versuch) brauchte `retries: 1`; das kostet bei Grün
nichts, macht aber aus einem Wackler einen bestandenen Test und zeigt im Wackel-Fall die Spur
des gelungenen Versuchs. Nicht empfohlen.

**Weg ohne laufende Kosten:** `trace` nur, wenn eine Umgebungsvariable gesetzt ist, und im
Workflow eine Eingabe beim Handstart (`workflow_dispatch` gibt es schon, `check.yml:13`). Push-
und PR-Läufe bleiben, wie sie sind; wer einen roten Lauf aufklären will, startet ihn von Hand
mit Spur. Schwäche: Ein Wackler muss im zweiten Lauf wieder auftreten. Weil Kosten dem
Projektleiter vorbehalten sind (E-06), steht die Wahl als **F-37** in 9.1.

#### 5 Vorschlag für den Schritt

Der Schritt fasst 66 bis 69 Dateien an, die meisten mit einer Zeile. Reines Aufräumen und
geänderte Testlogik gehören nicht in denselben Lauf (Zeile 20 nennt Sonnet; die Etappe 1 hat
für Prüfwerkzeug Opus gebraucht). Vorschlag: **zwei Läufe im selben Branch, je eigenes Review,
ein Merge** (wie Schritt 13 und 15).

**Lauf 1 — Löschen, Umbenennen, Verschieben (Sonnet)**

| Commit | Inhalt | Absicherung | Abbruchstelle |
|---|---|---|---|
| 1 `refactor:` | drei tote Namen weg (`warnungText` mit seinen Erwartungen, `RangZeile`, `GespraechZeile` der Verwaltung) samt frei werdender Importe | `svelte-check`, ESLint, Vitest | ein Name hat doch einen Nutzer: Name bleibt, Bericht nennt die Stelle |
| 2 `refactor:` | `export` weg bei den 25 Werten | `svelte-check`, ESLint (`no-unused-vars`), Vitest | wie Commit 1, je Name |
| 3 `refactor:` | `doppelWarnungen` → `warnungsSaetze` (drei Dateien) | `svelte-check`, Test der Datei | keine |
| 4 `docs:` | zwei Kommentare (j) | keine nötig | keine |
| 5 `test:` | fester Weg des Turnierjahrs weg; Eintrag vom 09.11.2026 in `docs/beobachtungen.md` geschlossen | `svelte-check` (ein Aufrufer mit Jahr wäre ein Typfehler) | ein Aufrufer mit Jahr taucht auf: abbrechen und melden |
| 6 `test:` | `login.ts` geteilt (vier neue Dateien), 19 Testdateien nur Importe; `docs/context-scopes.md:20` | `svelte-check`; Diff der Testdateien nur in Import-Anweisungen; E2E voll, Zahl der Tests wie vorher (524 bestanden, 64 übersprungen) | eine Testdatei braucht mehr als Importe: abbrechen |
| 7 `test:` | acht Kopien von `holer`, `json`, `Aufruf` durch die gemeinsame Datei ersetzt, diese nach `tests/hilfen/abruf.ts` umbenannt | Vitest, Zahl der Fälle je Datei wie vorher | eine Kopie weicht ab: Datei bleibt, Bericht nennt sie |

Am Ende des Laufs der volle `make check` auf dem committeten Stand. Erwartung: Vitest um die
Fälle von `warnungText` kleiner, sonst gleich; E2E gleich. Für die Nutzerin nichts.

**Lauf 2 — Testlogik (Opus)**

| Commit | Inhalt | Absicherung | Abbruchstelle |
|---|---|---|---|
| 8 `test:` | (c) `tests/hilfen/mitglieder-listen.ts`; Grundprüfung und Routen-Test nehmen die Listen von dort | zwei Rot-Proben (Liste entfernt; Schlüssel ohne Dienste); Zahl der geprüften Einträge in den 401/415-Schleifen wie vorher (im Bericht) | die Dienste je Liste lassen sich nicht ohne Umbau der Grundprüfung zuordnen: verwerfen, bleibt Beobachtung |
| 9 `test:` | (b) Prüfung «Methode und Präfix passen» im Routen-Test | einmal rot mit einem umbenannten Eintrag | ein heutiger Name verletzt sie: melden, nichts umbenennen |
| 10 `test:` | (k) nur bei F-37 B oder C: Schalter oder feste Einstellung in `playwright.config.ts`, bei B die Eingabe in `check.yml`, ein Satz in `docs/ci-cd-und-release.md` | ein Handstart auf dem Branch mit Spur (`gh workflow run check.yml --ref refactor/schritt-20`); bei C der Vergleich der Job-Dauer mit 10,0 / 4,1 / 3,9 Minuten | `scripts/pruefungen/workflow-rechte.ts` meldet die Eingabe; bei C: iPhone-Job über 12 Minuten |

Am Ende der volle `make check`. Der Implementer meldet den neuen Wortlaut für den Satz der
`CLAUDE.md` zu den Listen der Mitglieder (C-1) und ändert die Datei nicht.

**Reihenfolge und Abhängigkeiten:** Lauf 1 vor Lauf 2. Commit 5 vor 6 (sonst zieht der alte Weg
mit um). Die Commits 1 bis 4 und 7 hängen an nichts. Lauf 2 hängt nicht an Lauf 1, ausser dass
beide im selben Branch stehen; fällt Lauf 2 aus, ist Lauf 1 für sich mergebar.

**Vollständige Dateiliste**

- *Lauf 1, App und Skripte (21):* `src/lib/verwaltung/turnier-anzeige.ts`,
  `turnier-anzeige.test.ts`, `Aktionsdialog.svelte`, `gespraech-api.ts`;
  `src/lib/interclub/api.ts`; `src/lib/hilfe/ablauf.ts`; `src/lib/login/passkey.ts`;
  `src/lib/name.ts`; `src/lib/ui/kopftitel.ts`; `src/lib/cm/api.ts`; `src/routes/+layout.ts`;
  `src/lib/server/admin/mitgliedschaft.ts`, `admin/rollen.ts`, `anlass/angaben.ts`,
  `anlass/kalender.ts`, `anlass/schnittstellen.ts`, `interclub/import.ts`,
  `mitteilung/themen.ts`, `turnier/angaben.ts`; `scripts/pruefungen/gruener-stand.ts`,
  `release.ts`.
- *Lauf 1, E2E (24):* `tests/e2e/hilfen/login.ts`, neu `verbindung.ts`, `turnier.ts`,
  `anlass.ts`, `mail.ts`; die 19 Testdateien `anlass`, `anmeldungsliste-ablauf`, `briefe`,
  `cm-ablauf`, `cm-anmeldung`, `cm-doppel-verwaltung`, `cm-doppel`, `cm-gespraech`,
  `cm-verwaltung`, `einlesen`, `login`, `mitgliedschaft`, `mitteilungen`, `navigation`, `profil`,
  `turnier`, `verwaltung`, `waechter`, `wappen` (je `.test.ts`).
- *Lauf 1, Test-Hilfen und Einheitstests (15):* `tests/hilfen/interclub.ts`;
  `tests/hilfen/verwaltung-abruf.ts` → `tests/hilfen/abruf.ts`; `src/lib/abruf.test.ts`,
  `anlass/api.test.ts`, `cm/api.test.ts`, `interclub/api.test.ts`, `login/anmelden.test.ts`,
  `profil/angaben.test.ts`, `push/api.test.ts`, `verwaltung/mitteilung-api.test.ts`; wegen des
  neuen Namens `verwaltung/anlass-api.test.ts`, `api.test.ts`, `mitglieder-api.test.ts`,
  `turnier-api.test.ts`, `zugang-api.test.ts`.
- *Lauf 1, Doku (3):* `docs/beobachtungen.md` (Eintrag vom 09.11.2026 schliessen; neu der Befund
  zu den CSS-Suchen aus (g)), `docs/context-scopes.md`, `docs/refactoring-analyse.md`.
- *Lauf 2 (3 bis 6):* neu `tests/hilfen/mitglieder-listen.ts`;
  `src/lib/server/grundpruefung.db.test.ts`, `src/lib/server/routen.test.ts`; bei F-37 B oder C
  `playwright.config.ts`, bei B dazu `.github/workflows/check.yml`, `docs/ci-cd-und-release.md`.
- *Dazu je Merge:* `package.json` und `package-lock.json` (Version).
- *Fällt gegenüber der Zeile 20 weg:* `scripts/e2e.ts` (a), `mitteilung/typen.ts` mit seinen
  Importen (d), `scripts/pruefungen/bauregel.ts` (e), `tests/e2e/cm-ablauf.test.ts` als
  inhaltliche Änderung (g; die Datei wechselt nur Importe), die E2E-Dateien der Verwaltung als
  inhaltliche Änderung (i), `src/routes/+layout.svelte` (der Kommentar steht in `+layout.ts`).

#### Abweichungen von der Zeile 20 und den Hinweisen

- «Einzelne Dateien unter `src/lib/`» sind 19 Dateien unter `src/`, dazu zwei Skripte; «ungenutzte Exporte
  entfernt» heisst bei 25 von 28 Namen «`export` weg», nicht «gelöscht».
- Modell: Sonnet nur für Lauf 1; Lauf 2 mit Opus.
- Hinweis (h): acht Kopien, nicht sieben. Hinweis (j): `+layout.ts`, nicht `+layout.svelte`.
- Hinweis (i): Die Begründung «entlastet das Code-Budget je IP» (H-19) ist falsch [G].
- Hinweis (d): Die Zahl 44 aus 1d stimmt nur als Teilwort-Suche; sie zählt den Einstieg
  `holeMitteilungAdminDienste` mit. Der Typ allein steht in 17 Dateien.

#### Bleibt (gut gelöst)

- **Die freien Turnierjahre** (`FREIE_JAHRE`, zufällig, bei «vergeben» ein neuer Versuch) und
  die Jahresbereiche der Datenbanktests (`tests/hilfen/turnierjahre.ts`): zwei Wege, je passend.
- **Eine Verbindung je Testprozess** und der Login-Dienst, der beim Versuch, eine Mail zu
  schicken, abbricht (`login.ts:36–54`).
- **`tests/hilfen/verwaltungs-listen.ts`** als Vorbild für (c); **die Listen der Schnittstellen**
  als Exporte nur für die Tests.
- **`screenshot: 'on'`** und das Hochladen bei jedem Ausgang: der Nachweis je Test bleibt.
- **`holeMailCode` mit Betreff-Filter** (parallele Meldungen an CM-Admins stören nicht).
- **Die Bremsen je Adresse und je IP getrennt**; die Tests teilen das knappe Budget bewusst
  (`mitgliedschaft.test.ts:97–100` fragt nur auf einem Gerät an).

#### Nicht geprüft, dünn belegt

- Kein Lauf: ob nach «`export` weg» wirklich alles übersetzt, zeigt erst `svelte-check`; die
  Liste ist Textsuche in zwei Durchgängen, kein Werkzeug [E]. Die 59 Typen und die 43 nur von
  Tests genutzten Namen sind nicht einzeln gelesen (nur die 26 mit zwei Eigennennungen).
- Die acht Kopien aus (h) sind am Kopf verglichen, nicht Zeile für Zeile bis `json` und
  `ungeprueft` [E].
- Die Zahl «56 Tests mit Code der Verwaltung» stammt aus einem Zählskript über die Hilfen je
  Datei, nicht aus einem Lauf; übersprungene Tests je Gerät sind nicht abgezogen [E].
- Der Zuschlag einer Spur auf Laufzeit und Artefakte ist nicht gemessen [V]; die Regel von
  GitHub zu öffentlichen Repos ist nicht nachgelesen [E].
- Die rund 108 CSS-Suchen sind über ein Muster gezählt; welche davon Rolle und Beschriftung
  hätten, ist nicht geprüft [E].
- Ob `scripts/pruefungen/workflow-rechte.ts` eine neue Eingabe im Workflow beanstandet, ist
  nicht gelesen [V].
- Offene Branches: geprüft sind die Branches, die der lokale Stand von `origin` kennt (kein
  `git fetch` in diesem Lauf).

### F.4 Schritt 20, Lauf 1

**Lauf** (14.11.2026, refactor-implementer auf Sonnet, Worktree `refactor/schritt-20` auf `29b0023`,
Version 0.22.7, plus das Nachmessen). Gelesen: Kopf, Zeile 20, Hinweise, F.3, beide `CLAUDE.md`.
Jeder Commit lief durch den Pre-Commit-Hook (Doku, Lint, `svelte-check`, Prüfskripte,
Einheitstests: 1623 Fälle grün).

| Commit | Titel | Inhalt |
|---|---|---|
| `40f23a1` | refactor: Drei ungenutzte Namen entfernt | `warnungText` und sein Test «FR-46: Warnungen beim Anmelden von Hand …» (drei Erwartungen), `RangZeile` samt Import `IcRangZeile`, `GespraechZeile` samt Alias |
| `52d2c5b` | refactor: export bei 25 Werten entfernt | 15 Dateien; je Name per Textsuche bestätigt (`THEMEN` und `titelText` haben gleichnamige lokale Namen in `eslint.config.js`, `Benachrichtigungen.svelte`, `profil/+page.svelte`, keine Importe); ESLint und `svelte-check` ohne Meldung |
| `716d8ba` | refactor: doppelWarnungen heisst warnungsSaetze | drei Dateien, Kommentar sagt «Einzel und Doppel» |
| `491c791` | docs: Zwei veraltete Kommentare | `CmFelder`: «beim Fehlerwort «eingabe»»; Wurzel-Layout: das Neuladen nach `refreshAll()` gilt mit Sitzung |
| `98f69ca` | test: Fester Weg des Turnierjahrs weg | Überladungen von `legeTurnierAn` und `legeOffenesTurnierAn`, `legeTurnierMitFestemJahrAn`; kein Aufrufer mit Jahr (Textsuche, `svelte-check`); Eintrag ins Archiv |
| `2d1ac39` | test: E2E-Hilfen login.ts nach Themen geteilt | 4 neue Dateien; 19 Testdateien, 32 Import-Anweisungen mehr, Diff der Testdateien nur Import-Zeilen; `docs/context-scopes.md` nennt `turnier.ts` und `verbindung.ts` dazu; E2E voll 524/64 |
| `c1c4c6f` | test: Acht Kopien … abgeloest | `git mv` nach `tests/hilfen/abruf.ts`; acht Kopien weg (dazu die Kopien von `ungeprueft` und `Koerper`, wo sie standen), jetzt unbenutzte Typ-Importe weg; fünf Verwaltungs-Tests nur Importpfad |

**Abweichungen von F.3:** Keine Kopie wich ab (die in `abruf.test.ts` trug nur den Typ `Holen`, der
Rückgabetyp passt). `passkey.test.ts` bleibt mit seiner eigenen Hilfe. Die Datei der Hilfen
`schliesseLoginHilfen` bleibt in `login.ts` als dünne Hülle um `schliesseVerbindung` in
`verbindung.ts` (kein Weiterreichen). Dazu: der Befund zu den CSS-Suchen aus (g) steht jetzt als Eintrag in
`docs/beobachtungen.md`.

**Rot-Probe:** Es gibt keine neue Prüfung; der Lauf entfernt, benennt um und verschiebt. Als
Beweis dienen `svelte-check`, ESLint und die unveränderten Zahlen (Einheit 2410 statt 2411, E2E
524/64).

**Nicht geprüft:** keine CI auf dem Branch; die Spur (F-37) und Lauf 2 liegen nicht in diesem
Lauf; E2E lief einmal auf dem Stand von Commit 6 und im vollen `make check`.

**Ausserhalb des Schritts aufgefallen (nicht behoben):**

- Der Titel des Tests «FR-46: Warnungen im Doppel als Liste wie im Einzel …» in
  `turnier-anzeige.test.ts` sagt «im Doppel», die Funktion heisst jetzt `warnungsSaetze`; der
  Test ändert nichts, was er prüft, der Titel bleibt.
- `legeTurnierImJahrAn` in `tests/e2e/hilfen/turnier.ts` hat nach dem Entfernen des festen Jahrs
  nur noch einen Aufrufer (`legeTurnierAn`) und könnte hineingezogen werden.
- Die Dauerregel «Elemente über Rolle und Beschriftung» hält die Praxis nicht (F.3, Hinweis (g)).

### F.5 Schritt 20, Lauf 2

**Lauf** (14.11.2026, refactor-implementer auf Opus, Worktree `refactor/schritt-20` auf `98b9225`,
nach Lauf 1). Gelesen: Kopf, Zeile 20 mit den Hinweisen, F.3, F.4, Zeile 20a, F-37; beide
`CLAUDE.md`, `docs/ci-cd-und-release.md` (Prüfungen in der CI), `scripts/pruefungen/workflow-rechte.ts`.
Entscheid des Projektleiters zu F-37: B (E-63). Jeder Commit lief durch den Pre-Commit-Hook.

| Commit | Titel | Inhalt |
|---|---|---|
| `882875a` | test: Listen der Mitglieder an einer Stelle | neu `tests/hilfen/mitglieder-listen.ts`: `MITGLIEDER_LISTEN` (sieben Listen, Schlüssel und Reihenfolge wie bisher `cm`, `anlass`, `interclub`, `profil`, `gespraech`, `passkey`, `mitteilung`), Typ `MitgliederDienste` (Dienste je Schlüssel) und `MitgliederSchnittstelle<K>`; `grundpruefung.db.test.ts` baut die Einträge über `eintraegeVon(modul, dienste)` mit `dienste: MitgliederDienste`; `routen.test.ts` bildet `MITGLIEDER` aus der Datei; die sieben Listen-Importe dort fallen weg, die Kommentare zu «neue Liste» nennen die Datei |
| `953ecbf` | test: Routen-Test prüft, dass der Name zur Methode passt | vierter Fall in `routen.test.ts`: je Route und Methode GET oder POST jeder Name, unter dem die Funktion in einer Liste der Verwaltung oder der Mitglieder steht, beginnt mit `get` bzw. `post`; ohne Liste der Name der Funktion |
| `298835e` | test: Spur nur beim Handstart der CI mit Schalter | `check.yml`: `workflow_dispatch` mit Eingabe `spur` (boolean, Vorgabe aus), im Schritt «E2E-Tests» `MYTCO_E2E_SPUR: ${{ inputs.spur && 'an' \|\| 'aus' }}`; `playwright.config.ts`: `trace: 'on'` nur bei `MYTCO_E2E_SPUR=an`, sonst kein Schlüssel `trace`; `docs/ci-cd-und-release.md`: Absatz «Spur beim Handstart» unter den Prüfungen der CI |
| `3f13d00` | docs: F-37 beantwortet (B, E-63) | E-63 in Abschnitt 8, F-37 in 9.1 als beantwortet, Eintrag unter «Unveröffentlicht» in `docs/versionen.md` |

**Zählung unverändert (c):** Mitglieder 39 Einträge, davon 26 schreibend, zusammen mit der
Verwaltung 26 + 42 in der Schleife «ohne Sitzung und ohne JSON»; diese Zahlen prüft die
Grundprüfung selbst, sie blieben grün. Die Reihenfolge der Schlüssel ist die der alten
Aufzählung. Die Namen der Einträge sind nicht vorher gegen nachher verglichen (nur Zahl und
Reihenfolge der Listen, beide sichtbar gleich).

**Rot-Proben** (jeweils auf dem committeten Stand angebracht, danach mit `git checkout` der
betroffenen Dateien zurückgenommen, `git status` danach leer):

| Commit | Probe | Ergebnis |
|---|---|---|
| (c) 1 | Liste `interclub` aus `mitglieder-listen.ts` (Typ und Objekt) und ihre Dienste aus der Grundprüfung genommen, wie eine nie eingetragene Liste | Routen-Test rot: `expected [ 'GET /api/interclub', false ] to deeply equal [ 'GET /api/interclub', true ]`; Grundprüfung rot: `to have a length of 39 but got 36`; 2 von 10 Fällen rot |
| (c) 2 | Schlüssel `gespraech` ohne Dienste in der Grundprüfung | `svelte-check`: 1 Fehler, `Property 'gespraech' is missing … but required in type 'MitgliederDienste'` |
| (c) 3 | `gespraech: anlass` (Dienste vom falschen Typ) | `tsc`: `Type 'AnlassDienste' is missing the following properties from type 'CmDienste': bestaetigung, melde` |
| (b) 1 | Eintrag in `GESPRAECH_SCHNITTSTELLEN` umbenannt (`getGelesen: postGelesen`) | nur der neue Fall rot: `POST /api/cm/[id]/gespraech/gelesen` meldet `[ "getGelesen" ]`; 1 von 4 |
| (b) 2 | Funktion umbenannt (`postGelesen` → `getGelesen` in Modul, Route und Routen-Test) | nur der neue Fall rot, dieselbe Meldung; die drei übrigen Fälle grün |
| (k) | ein E2E (`datenschutz.test.ts`, Desktop) dreimal: ohne `MYTCO_E2E_SPUR`, mit `an`, mit `aus` | ohne: `test-results/` nur `datenschutz.png`, `test-finished-1.png`, `.last-run.json`; mit `an`: dazu `trace.zip` (2 104 623 Bytes); mit `aus`: wie ohne. Je 1 bestanden |

**Abweichungen von F.3:**

- **(b) Name in der Liste statt Name der Funktion.** Der erste Entwurf prüfte den Namen der
  Funktion (`Function.name`) und jeden Namen in den Listen; er war am heutigen Stand rot für
  `GET /api/admin/anlaesse/[id]/mitteilungen` mit «(ohne Namen)»: Die sechs Schnittstellen in
  `mitteilung/verwaltung-schnittstellen.ts:132–137` sind aus Fabriken gebaut (`verlauf('verein')`
  usw.) und haben zur Laufzeit keinen Namen. Das ist keine Verletzung der Abmachung (der Name in
  der Liste und der Export stimmen), darum keine Abbruchstelle; geprüft wird jetzt, was
  Grundprüfung und Rechte-Matrix lesen. Nichts umbenannt.
- **(b) nur GET und POST.** Eine andere Methode prüft der Fall nicht (es gibt heute keine). Die
  Rechte-Matrix fängt ein künftiges `put…`/`delete…` der Verwaltung schon («nicht `get`»); die
  Grundprüfung schickte es als GET. Beobachtung unten.
- **(k) `trace: 'on'`** statt `retain-on-failure` (F.3 Abschnitt 4 sprach von «behalten nur bei
  Rot» für C): Mit `retain-on-failure` hätte ein grüner Handstart keine Spur im Artefakt, und
  der Nachweis «die Artefakte enthalten die Spur» ginge nur mit einem roten Test. Die Laufzeit
  ist bei beiden gleich, nur das Artefakt wächst. **Schätzung [V]:** rund 175 Tests je Gerät zu
  2 bis 10 MB, also 0,4 bis 2 GB je Gerät und Handstart statt 22 bis 81 MB; nicht gemessen.
- **Kein Handstart in der CI** (kein Push in diesem Lauf). Den holt der Orchestrator nach:
  `gh workflow run check.yml --ref refactor/schritt-20 -f spur=true`, danach im Artefakt
  `test-results-<gerät>` je Test eine `trace.zip`; Dauer der E2E-Jobs gegen 10,0 / 4,1 / 3,9
  Minuten vergleichen (Zeitgrenze des Jobs 20 Minuten).

**Prüfskripte zur Änderung am Workflow:** `workflow-rechte.ts` meldet «ok» (die Eingabe steht
unter `on:`, ausserhalb der Jobs; keine Rechte, kein Secret); `workflow-rechte.test.ts` und
`nur-doku.test.ts` grün (36 Fälle); `nur-doku.ts` stuft `check.yml` weiter als Code ein; die
Datei ist gültiges YAML (mit Ruby gelesen: `on` hat `pull_request`, `push`, `workflow_dispatch`
mit `inputs.spur`). `actionlint` ist nicht installiert, nicht geprüft.

**Voller `make check`** auf `3f13d00` (4,6 Minuten, E2E 3,5 Minuten): grün; Lint, `svelte-check`, Prüfskripte,
2411 Tests mit Abdeckung, beide Builds, E2E 524 bestanden, 64 übersprungen (unverändert), Image.

**Vorschlag für die `CLAUDE.md` (C-1), nicht geändert:** Unter «Tests» steht heute «Eine neue
Liste der Verwaltung kommt in `tests/hilfen/verwaltungs-listen.ts` und in die Tabelle der
Bauregel; eine neue Liste der Mitglieder in Grundprüfung und Routen-Test.» Neu: «Eine neue
Liste der Verwaltung kommt in `tests/hilfen/verwaltungs-listen.ts` und in die Tabelle der
Bauregel; eine neue Liste der Mitglieder in `tests/hilfen/mitglieder-listen.ts`.» (Die Dienste in
der Grundprüfung erzwingt der Typ.)

**Nicht geprüft:** keine CI auf dem Branch, also auch kein Handstart mit Spur und keine Grösse
der Artefakte unter Last; die Spur lokal nur mit einem Test auf Desktop, nicht auf WebKit; die
Namen der 39 Einträge nicht einzeln vorher gegen nachher (nur Zahl und Reihenfolge der Listen);
die Rückfall-Lesart «Name der Funktion» in (b) ohne eigene Rot-Probe (fünf Funktionen ohne Liste).

**Ausserhalb des Schritts aufgefallen (nicht behoben):**

- Die sechs Schnittstellen der Mitteilungen der Verwaltung haben zur Laufzeit keinen
  Funktionsnamen (`verlauf('verein')` usw.); Meldungen des Routen-Tests nennen sie darum
  «(ohne Namen)». Stört heute nicht; eine Fabrik könnte den Namen setzen (App-Code, nach dem
  Feature-Stopp).
- Die Grundprüfung leitet die Methode aus dem Präfix ab (`post…` → POST, sonst GET). Eine
  künftige Schnittstelle mit `put…` oder `delete…` liefe dort als GET; der neue Fall im
  Routen-Test prüft nur GET und POST. Stoff für Schritt 24, wenn es je eine dritte Methode gibt.
- `scripts/pruefungen/workflow-rechte.ts` liest nur Rechte und Secrets; ob eine Eingabe von
  `workflow_dispatch` sicher in `run:` landet (Ausdruck statt Umgebungsvariable), prüft kein
  Werkzeug. Hier über `env:` gelöst.
- **Review Lauf 1 (14.11.2026, refactor-reviewer): «ok», nichts vor dem Merge zu beheben.** Gelesen
  am festen Commit `98b9225`, nichts ausgeführt. Die 28 geänderten Namen unabhängig nachgesucht
  (kein Nutzer ausserhalb der eigenen Datei); die 19 E2E-Dateien ändern nur Importe; jede Zeile
  des alten `login.ts` steht in einer der fünf Dateien, der Zustand (eine Verbindung je Prozess)
  ist gleich geteilt; die acht Kopien sind zur Laufzeit gleich wie `tests/hilfen/abruf.ts`.
  Hinweise: Im Archiv der Beobachtungen fehlte der Commit-Hash (nachgetragen, Orchestrator);
  `login.ts` hatte 35 verschiedene exportierte Namen, nicht 37 (39 `export`-Zeilen wegen der
  Überladungen; ohne Folge); `tests/e2e/hilfen/anlass.ts` und `mail.ts` stehen in keiner Zeile
  von `docs/context-scopes.md` (Merkpunkt für Schritt 21). Nicht geprüft vom Reviewer: kein Lauf;
  `turnier.ts` nur in den Deklarationen gelesen.
- **Review Lauf 2 (14.11.2026, refactor-reviewer): «ok», nichts vor dem Merge zu beheben.** Listen und
  Reihenfolge gleich; drei Rot-Proben zu Commit 8 und zwei zu Commit 9 nachgestellt, darunter der
  Rückfall «Name der Funktion» (`/api/logout` als GET: rot), der oben unter «Nicht geprüft» stand.
  Die Lesart von Hinweis (b) (Name in der Liste) trägt. Der Schalter ist sicher verdrahtet (nur
  `workflow_dispatch`, über `env`, Job ohne Secret); in eine Spur gelangen nur erfundene Testdaten
  des CI-Containers. Hinweise: Ein Listeneintrag ohne Route liefe in der Grundprüfung ungeprüft
  nach seinem Präfix (heute keiner; Beobachtung); der Satz der `CLAUDE.md` unter «Tests» stimmt
  nach dem Merge nicht mehr (Vorschlag oben; geht an den Projektleiter).
- **Handstart mit Spur, gemessen (Orchestrator, Lauf 43629593490 auf dem Branch, `spur=true`):**
  alle Jobs grün. E2E-Jobs: iPhone 9,0 Minuten, Desktop 5,1, Android 5,0 (ohne Spur zuletzt 10,0 /
  3,9 / 4,1; die Spur kostet rund eine Minute, die Zeitgrenze von 20 Minuten ist weit). Artefakte:
  Desktop 216 MB, Android 509 MB, iPhone 301 MB, zusammen rund 1 GB (ohne Spur 181 MB). Damit
  ist `trace: 'on'` vertretbar; die Schätzung «0,4 bis 2 GB je Gerät» war zu hoch, und «die
  Laufzeit trifft beide Formen gleich» bleibt eine Annahme [V] (nur `on` gemessen). Der Inhalt
  einer `trace.zip` aus der CI ist nicht geöffnet worden; die Grösse der Artefakte ist der Beleg.
  `docs/ci-cd-und-release.md` nennt Dauer, Grösse und Aufbewahrung.

### F.6 Schritt 20a

**Lauf** (14.11.2026, refactor-implementer auf Opus, Worktree `refactor/schritt-20a` ab
`origin/dev` = `2d207f5`, Version 0.22.8). Gelesen: Kopf, Zeile 20a mit den Hinweisen, E-56, H-07
und H-13 in 1d, die Übergangsregeln «Ab Schritt 15» und «Ab Schritt 18»; im Protokoll der Etappe 2
E.3 (verworfene Regel, 98 Meldungen mit `no-restricted-globals`), E.6 (0 Meldungen mit der
Auswahl nach dem Aufruf) und E.13 (Reihenfolge der zehn Dateien); beide `CLAUDE.md`,
`eslint.config.js`, `scripts/importrichtung.test.ts`, `scripts/pruefungen/`,
`docs/ci-cd-und-release.md`. Svelte-Doku über den MCP-Server (`svelte/compiler`: `parse`,
`parseCss`). Jeder Commit lief durch den Pre-Commit-Hook.

**Messung vorab** (`npx eslint --no-inline-config --rule '{"no-restricted-syntax":…
"CallExpression[callee.name=\"fetch\"]"…}'`):

| Bereich | Meldungen |
|---|---|
| `src/` ganz (Seiten, Bausteine, Ladefunktionen, Abruf-Module, `abruf.ts`, Server, Service Worker, Hooks, Tests) | **0** |
| `scripts/`, `tests/` | 6 in 5 Dateien: `scripts/ic-import.ts`, `tests/e2e/hilfen/mail.ts`, `tests/e2e/mitgliedschaft.test.ts`, `tests/e2e/mitteilungen.test.ts`, `tests/e2e/verwaltung.test.ts` |
| `src/`, Aufrufe mit Punkt (`x.fetch(…)`, `fetch.call(…)`) | 0 |

Die Textsuche `fetch(` unter `src/` findet einen Treffer, den Text `'Failed to fetch'` in
`src/lib/login/anmelden.test.ts:53`. `fetch` steht sonst nur als Vorgabe `holen: Holen = fetch`
(rund 90 Stellen in den Abruf-Modulen) und in Kommentaren. **Erlaubte Stellen: keine.** Der
Abruf-Baustein braucht keine (er ruft `holen(pfad, init)`, `abruf.ts:94`), Server, Service
Worker und Tests unter `src/` auch nicht.

| Commit | Titel | Inhalt |
|---|---|---|
| `9b5bd6e` | test: Lint-Regel kein Aufruf fetch unter src/ (Schritt 20a) | `eslint.config.js`: Block `FETCH_REGEL` (am Schluss der Konfiguration, mit Typ `Linter.Config`); neu `scripts/fetch-regel.test.ts` (30 Fälle) |
| `cb6d8ef` | test: Prüfung der Design-Importe (Schritt 20a) | neu `scripts/design-importe.test.ts` (30 Fälle): `REIHENFOLGE`, `pruefeDesignImporte`, Proben, echtes Repo |
| `1839963` | docs: Lint-Regel zu fetch und Prüfung der Design-Importe in CI/CD (Schritt 20a) | zwei Zeilen in «Prüfungen in der CI» |

**Test vor der Regel (fetch):** `scripts/fetch-regel.test.ts` ohne den Block in
`eslint.config.js`: `Tests 16 failed | 14 passed (30)`; rot waren alle 15 Fälle «meldet …» und
die Meldung, grün die erlaubten Formen, die Grenzen und das echte Repo. **Abweichung vom Auftrag
«Test vor der Regel committen»:** Test und Regel stehen im selben Commit, weil der
Pre-Commit-Hook (`make check-schnell`) einen roten Test nicht durchlässt. Der rote Lauf ist hier
belegt. Bei der Prüfung der Design-Importe ist der Test die Prüfung; es gibt kein «davor».

**Rot-Proben am echten Repo** (nach den Commits, je mit Sicherungskopie im Scratchpad, danach
zurückkopiert; `git status` danach leer; kein `git checkout`):

| Probe | Ergebnis |
|---|---|
| Layout: `bedienelemente.css` und `karten.css` vertauscht | `design-importe` rot, 1 von 30 («das echte Repo hat keinen Befund») |
| Layout: Zeile `druck.css` gelöscht | rot, 1 von 30 |
| Layout: `karten.css` ein zweites Mal am Schluss | rot, 1 von 30 |
| `src/lib/ui/Zurueck.svelte` importiert `$lib/design/karten.css` | rot, 1 von 30 |
| `src/lib/verwaltung/Pfad.svelte` importiert `../design/brief.css` | rot, 1 von 30 |
| neue Datei `src/lib/design/neu.css`, nirgends eingetragen | rot, 1 von 30 |
| Prüfung verfälscht (Vergleich der Folge auf `false`) | rot, 1 von 30 («meldet zwei vertauschte Zeilen») |
| `void fetch('/api/status')` in `Zurueck.svelte`, `({ fetch }) => fetch('/api/status')` in `src/routes/hilfe/+page.ts` | ESLint: 2 Fehler `no-restricted-syntax` (2:7, 12:73); `fetch-regel` rot, 1 von 30, nennt beide Stellen |
| `fetch('/api/status')` in `hilfe/+page.ts` hinter `// eslint-disable-next-line no-restricted-syntax` | ESLint grün (Exit 0); `fetch-regel` rot, 1 von 30 (`hilfe/+page.ts:13`) |
| nach allen Proben | beide Tests 30 von 30 grün |

**Eingebettete Proben** (gestellte Dateien, kein Eingriff ins Repo): fetch: 15 Formen gemeldet
(darunter `fetch?.(…)`, `(fetch)(…)`, `.svelte.ts`, `.js`), 7 zugelassen (Vorgabe und Übergabe von
`holen`, das Ereignis `'fetch'`, der Text `'Failed to fetch'`, `scripts/`, `tests/e2e/`), 6 Grenzen
als «fängt nicht». Design: vertauscht, fehlend, als Zeilen- oder Blockkommentar oder als Text
(zählt als fehlend), doppelt, `brief.css` und eine fremde Datei im Layout, die Schreibweisen
`$lib`, `/src` und `?inline` (gleich), fehlendes Layout; ausserhalb des Layouts Baustein,
`<script module>`, Unter-Layout, Ladefunktion mit `?raw`, `import()`, `export … from`, Test,
`@import` in einer Design-Datei, `@import url(…)`; `brief.css` an zweiter Stelle; Briefdruck ohne
`brief.css` oder mit `tokens.css`; neue Datei ohne Eintrag, Eintrag ohne Datei; zugelassen fremde
CSS, Pfad im Text, im Kommentar, Lesen per `readFileSync`.

**Voller `make check`** auf `1839963` (5,5 Minuten, E2E 3,5 Minuten): grün; Lint, `svelte-check`,
Prüfskripte, 2471 Tests in 172 Dateien mit Abdeckung (vorher 2411), beide Builds, E2E 524
bestanden, 64 übersprungen (unverändert), Image; grüner Stand gemerkt.

**Was die Prüfungen nicht fangen:**

- *fetch:* `window.fetch(…)`, `globalThis.fetch(…)`, `self.fetch(…)`, ein weitergereichtes `holen`,
  `fetch.call(…)`/`apply`, `fetch` mit Typ-Zusatz (`as`, `!`); ein späterer Konfigurationsblock,
  der für dieselben Dateien `no-restricted-syntax` setzt, ersetzt die Regel still (ESLint mischt
  die Optionen einer Regel nicht; im Kommentar vermerkt). Ein `eslint-disable` fängt nicht der
  Lint, aber der Test.
- *Design:* `import.meta.glob`, ein berechneter Pfad, `<link>` im Markup, Dateien unter
  `src/lib/design/`, die nicht auf `.css` enden; die Reihenfolge in den vier Mockups, im Kopf von
  `grundlagen.css` und im Leitbild (Handarbeit, H-07).

**Nicht geprüft:** keine CI auf dem Branch (kein Push); die Laufzeit des Tests am echten Repo
(rund 4 Sekunden für ESLint über `src/`) unter Last der CI.

**Ausserhalb des Schritts aufgefallen (nicht behoben):**

- Der Kopf «Stand» und die Zeile 20 in 7.5 standen nach dem Merge von Schritt 20 noch auf
  «Review offen»; in diesem Lauf nach F.5 und `docs/versionen.md` nachgetragen (reine Doku).
- `docs/ui-leitbild.md:17` sagt «Reihenfolge wie in `src/routes/+layout.svelte`»; das stimmt,
  nennt aber die Prüfung nicht. Kandidat für Schritt 21.
- Die strengere Form der Regel (auch `x.fetch(…)`) wäre heute grün; ob sie kommt, entscheidet
  Schritt 24 mit dem Wortlaut der Dauerregel (C-13).
- **Review (14.11.2026, refactor-reviewer): «ok», nichts vor dem Merge zu beheben.** Die wirksame
  Konfiguration je Dateiart ist mit `--print-config` geprüft (Regel als Fehler für Bausteine,
  Ladefunktionen, Server und Service Worker; vorher gab es kein `no-restricted-syntax`, nichts
  wird verdrängt). Drei Rot-Proben am Repo nachgestellt (`fetch(` im Markup eines Bausteins;
  zwei Design-Dateien vertauscht; Design-Import in einem anderen Baustein), dazu der rote Lauf
  ohne Regel (16 von 30). Hinweise, nicht behoben (Merkpunkte für Schritt 24, wo die Regeln
  Dauerregeln werden): (1) `import()` einer Design-Datei im Svelte-Markup bleibt in der
  Design-Prüfung still grün und fehlt in den Listen «nicht erfasst»; (2) im Kommentar von
  `scripts/design-importe.test.ts` steht `docs/mockups/` statt `docs/ui-mockups/`; (3) die
  Meldung der fetch-Regel nennt «Abruf-Module des Themas», was für Server-Code nicht passt;
  braucht der Server einmal einen eigenen Abruf, fällt ein Entscheid über eine Ausnahme an; (4)
  `fetch-regel.test.ts` hat keinen Fall für Markup (die Regel wirkt dort); (5) die strengere
  Form mit `x.fetch(…)` wäre heute ebenfalls ohne Meldung. Nicht geprüft vom Reviewer: CI auf dem
  Branch, voller `make check` (grüner Stand bestätigt), die Mockups gegen die Liste.
