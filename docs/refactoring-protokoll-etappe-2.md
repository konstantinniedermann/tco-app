[← Refactoring-Analyse](refactoring-analyse.md)

# Refactoring MyTCO — Protokoll Etappe 2

Ausgelagert aus der [Refactoring-Analyse](refactoring-analyse.md) (E-60). Dort heisst dieser Teil
weiter «Anhang E»; Verweise wie «E.3» oder «Anhang E.3» meinen die Abschnitte dieser Datei.
Die Etappe ist abgeschlossen; diese Datei wird nicht mehr nachgeführt.

## Anhang E — Protokoll Etappe 2 [neu]

Nachmessen, Erkenntnisse, Belege und Commits je Schritt der Etappe 2, im Aufbau wie Anhang D. Die
Abschnitte heissen «E.1», «E.2» …; die Entscheide heissen weiter «E-01», «E-02» … (Abschnitt 8),
und [E] ist das Belegzeichen «aus Erkundung».

### E.1 Nachmessen Schritt 13

**Nachmessen Schritt 13** (12.11.2026, Worktree `refactor-schritt-13`, Stand `origin/dev` nach
Schritt 12a, `9c90b0f`, Version 0.20.19)

Am Code gelesen und gezählt, **nichts ausgeführt** (kein Test, kein Lint, kein `svelte-check`, kein
Build, keine Datenbank). Pfade unter `src/lib/`, wenn nichts anderes steht.

- **Ganz gelesen [G]:** `fehler.ts`, `json-post.ts`, `anlass/api.ts`, `cm/api.ts`, `push/api.ts`,
  `push/geraet.ts`, `verwaltung/api.ts`, `verwaltung/mitteilung-api.ts`, `verwaltung/umleiten.ts`,
  `profil/angaben.ts`, `login/anmelden.ts`, `login/passkey.ts`, `login/sitzung.ts`; die
  Ladefunktionen `src/routes/+layout.ts`, `+page.ts`, `profil/+page.ts`, `profil/email/+page.ts`,
  `hilfe/+page.ts`, `datenschutz/+page.ts`; die Tests `anlass/api.test.ts`, `cm/api.test.ts`,
  `push/api.test.ts`, `verwaltung/api.test.ts`, `profil/angaben.test.ts`, `login/anmelden.test.ts`,
  `login/passkey.test.ts`, `login/sitzung.test.ts`; `src/hooks.server.ts`; `CLAUDE.md`
  (Oberfläche-Bauregeln, Übergangsregel «Ab Schritt 13»).
- **In Auszügen [G für die Stelle]:** die Aufrufstellen in `src/routes/profil/+page.svelte`,
  `profil/email/+page.svelte`, `login/+page.svelte`, `login/mail/+page.svelte`, `+page.svelte`,
  `willkommen/+page.svelte`, `clubmeisterschaft/[id]/doppel/[kid]/+page.svelte` (Suche mit
  Abbruch), `anlass/[id]/+page.svelte` (Sätze); `server/cm/schnittstellen.ts` (`FEHLER`,
  `ablehnung`), `server/anlass/angaben.ts` (`ANTWORT_MELDUNG`), `server/gespraech/schnittstellen.ts`
  (`postGelesen`); `eslint.config.js` (Regelblöcke), `vitest.config.ts` (Abdeckung); die 13
  Stellen mit `.route(` unter `tests/e2e/`.
- **Nur per Textsuche [E]:** `verwaltung/mitteilung-api.test.ts` und `push/geraet.test.ts` (Fälle
  mit gestellter Antwort), alle übrigen Ladefunktionen und Seiten (gesucht: `fetch`, `/api/`,
  `sendBeacon`, `XMLHttpRequest`, `EventSource`, `keepalive`, `ergebnis`, `.art`), `tests/e2e/`
  (Fehlermeldungen im Wortlaut), `scripts/pruefungen/` (`fetch`).

#### Ergebnis in Kürze

- **Kein Entscheid des Projektleiters nötig.** Der Baustein kann jeden heutigen Rand genau
  erhalten; das ist dieselbe Linie wie E-44 für Schritt 15 (Verhalten bleibt genau, Abweichungen
  sind benannte Fälle). Für die Nutzerin ändert sich nichts.
- **«Ein Wort gilt nur mit seinem Status» stimmt in jedem Modul [G]** und bleibt. Dazu kommt die
  Gegenrichtung, die die Hinweise nicht nennen: **Für 401, 404 und 429 genügt der Status allein**
  (das Wort liest niemand), für alle anderen Fehler-Status nie. Beides gehört in den Baustein;
  `fehler.ts` bekommt dafür die Tabelle Wort → Status.
- **Es gibt drei Ergebnis-Formen, nicht zwei:** `art` (fünf Module), `ergebnis` als Feld
  (`sende`, `speichereAngaben`, `speichereRufname`) und **blanke Wörter ohne Feld**
  (`starteWechsel`, `bestaetigeWechsel`, alle Passkey-Funktionen, `schalteEin`/`schalteAus`), dazu
  «Daten oder `null`» (`ladeProfil`, `ladeAngaben`, `ladeKontakt`, `ladePasskeys`) und ein
  Wahrheitswert (`hatSitzung`).
- **Die Zeile 13 nennt eine falsche Seite:** `willkommen/+page.svelte` liest kein Ergebnis eines
  Abruf-Moduls (dort heisst eine eigene Zustandsvariable `ergebnis`). Es sind **drei Seiten mit
  zehn Zeilen**, nicht vier. `passkey.ts` hat selbst kein Feld `ergebnis`; es liest nur das von
  `sende` (drei Zeilen).
- **Das Netz ist dünner als «1693 Zeilen» klingt:** 204 in `cm`, `datei`, `inzwischen` und
  `nur-lesen` in der Verwaltung, 401/404 im Profil und im Login, jedes «Wort mit falschem Status»
  und jedes «Zusatzangabe fehlt» ausser einem stellt heute kein Test. 16 Abruf-Funktionen ruft
  kein Einheitstest auf. Darum 57 Zeilen Vorab-Tests (Liste unten).
- **Schnitt:** wie E-41, zwei Läufe; Vorschlag für den Baustein `src/lib/abruf.ts`.

#### Module, Funktionen, Hilfen [G]

| Modul | Abruf-Funktionen | Hilfen | Körper lesen | Ergebnis |
|-------|-----------------:|--------|--------------|----------|
| `anlass/api.ts` | 3 | `rufe`, `feldAus` | immer `r.json()`, vor der Deutung; wirft es, Störung | `art`: `ok` (mit `daten`), `abgemeldet`, `nicht-gefunden`, `geschlossen`, `eingabe` (mit `feld`), `stoerung` |
| `cm/api.ts` | 16 (eine davon für `/api/profil/klassierung`) | `rufe`, `istAbgelehnt`, `istObjekt`, Liste `ABGELEHNT` | 204 zuerst, ohne zu lesen; sonst wie `anlass` | `art`: `ok`, `abgemeldet`, `nicht-gefunden`, zehn Ablehnungen, `eingabe` (mit `felder`), `stoerung` |
| `push/api.ts` | 4 | `rufe` | wie `anlass` | `art`: `ok`, `abgemeldet`, `push-aus`, `stoerung` |
| `verwaltung/api.ts` | 56 | `rufe`, `deute`, `lese`, `schicke` (die zwei letzten exportiert); Typen `Holen`, `Json`, `Antwort<T>` | immer `antwort.json()`; `null` gilt als `{}` | `art`: 31 Varianten (`ok`, 29 Fehler, `stoerung`) |
| `verwaltung/mitteilung-api.ts` | 3 | keine eigene; ruft `lese` und `schicke` | wie `verwaltung` | `Antwort<T>` der Verwaltung |
| `profil/angaben.ts` | 7 | `schicke`, `deute`, `leseJson`, `istObjekt` | nachsichtig: unlesbar oder kein Objekt gilt als `{}` | drei Formen: Feld `ergebnis` (`speichereAngaben`: `ok`, `veraltet`, `stoerung`, `eingabe` mit `felder` und `fremd`; `speichereRufname`: `ok` mit `rufname`, `eingabe` mit `fehler` als Satz, `stoerung`); blankes Wort (`starteWechsel`, `bestaetigeWechsel`: `ok`, `veraltet`, `eingabe`, `gleich`, `zu-viele`, `falsch`, `stoerung`); Daten oder `null` (`ladeProfil`, `ladeAngaben`, `ladeKontakt`) |
| `login/anmelden.ts` | 1 (`sende`, mit Adresse als Argument) | `meldung`; Typ `Holen` (zweite, gleich lautende Definition) | nur bei 400; 2xx und 429 ohne zu lesen | Feld `ergebnis`: `ok`, `falsch`, `benutzt` (mit `kontakt`), `zu-viele`, `stoerung` |
| `login/passkey.ts` | 5 | `post`, `leseJson`, `istObjekt`; für die zweite Anfrage `sende` | nachsichtig (`leseJson` gibt `null`); `entfernePasskey` und `hinweisErledigt` lesen nichts | blanke Wörter: `richtePasskeyEin` `ok`, `vorhanden`, `abgebrochen`, `fehler`; `meldeMitPasskeyAn` `ok`, `abgebrochen`, `falsch`, `zu-viele`, `stoerung`; `entfernePasskey` `ok`, `fehler`; `ladePasskeys` Liste oder `null`; `hinweisErledigt` nichts |
| `login/sitzung.ts` | 1 (`hatSitzung`) | keine | liest nichts | `true` oder `false` |
| `push/geraet.ts` | 0 (ruft `sendeAbo`, `loescheAbo`) | reicht `holen` durch (`browser()` setzt `fetch`) | | blanke Wörter `ein`, `abgelehnt`, `stoerung` bzw. `aus`, `stoerung`; liest `r.art` |

- **Abruf ausserhalb der Module [G für die sechs Dateien, E für «sonst keiner»]:** vier
  Ladefunktionen rufen `fetch('/api/sitzung')` selbst (`+layout.ts`, `+page.ts`,
  `profil/+page.ts`, `profil/email/+page.ts`), `hilfe/+page.ts` hat einen eigenen `holeKontakt`
  (neben `ladeKontakt` im Profil-Modul: derselbe Abruf zweimal). Alle fünf sind Schritt 15. Kein
  Baustein (`.svelte`) ruft `fetch` auf; **einer nennt es:** die Doppel-Seite reicht das globale
  `fetch` als `holen` durch, um an den vierten Parameter `signal` von `sucheDoppelPartner` zu
  kommen (`doppel/[kid]/+page.svelte`, `suchen`).
- **Seiten halten Adressen:** `sende` nimmt die Adresse als Argument; drei Seiten schreiben vier
  Adressen selbst (`/api/login/brief` in `login`, `/api/login/mail-code` und `/api/login/mail` in
  `login/mail`, `/api/logout` in `profil`). Das Zielbild (6.1 Punkt 4) sagt «die Module nennen
  ihre Adressen».
- **Anfrage-Seite, überall gleich:** GET als `{ method: 'GET' }`, alles Ändernde als `jsonPost`
  (POST, `content-type: application/json`). Sonst keine Kopfzeile, kein `keepalive`, keine
  `credentials`- oder `cache`-Angabe. `hatSitzung`, die vier Ladefunktionen und `holeKontakt`
  rufen `holen(pfad)` mit einem Argument. Zwei Tests vergleichen `init` genau
  (`anmelden.test.ts`, `angaben.test.ts`): Der Baustein darf der Anfrage kein Feld hinzufügen.
- **`holen` als Parameter, Vorgabe das globale `fetch`:** in jeder Abruf-Funktion. Zwei Stellen
  hängen daran, welches `fetch` es ist: `clubmeisterschaft/[id]/+page.ts` ruft `holeCmTurniere()`
  bewusst **ohne** das `fetch` der Ladefunktion (sonst lüde `invalidate` nach dem Speichern die
  Seite neu; der Test «lädt nicht neu» der Prüfliste (b) hängt daran), alle anderen
  Ladefunktionen reichen ihres hinein. Der Baustein behält den Parameter.
- **Datei-Antworten:** keine über `fetch`. Die Kalender-Datei ist ein Link
  (`anlass/[id]/+page.svelte`, `href={anlass.kalender}`); Briefe drucken aus JSON, das Einlesen
  schickt Text als JSON.

#### Sonderfälle je Modul [G]

Was aus einer Antwort wird. «St» heisst `stoerung`. Ein Kringel (°) heisst: Diesen Fall stellt
heute kein Test. Spalte «Verwaltung» gilt auch für `mitteilung-api.ts`.

| Nr. | Antwort | `anlass` | `cm` | `push` | Verwaltung | Profil `schicke` | `sende` |
|----:|---------|----------|------|--------|------------|------------------|---------|
| 1 | Netzfehler (`holen` wirft) | St | St | St | St | St | St |
| 2 | 2xx mit JSON | `ok` + `daten` | `ok` + `daten` | `ok` + `daten` | `ok` + `daten` | `ok` | `ok` |
| 3 | 204 ohne Körper | St° | **`ok`, `daten` `{}`°** | St° | St° | `ok`° | `ok`° |
| 4 | 2xx, Körper kein JSON | St° | St° | St° | St° | `ok`° | `ok`° |
| 5 | 401 mit JSON-Objekt, mit oder ohne Wort | `abgemeldet` (ohne Wort°) | `abgemeldet` (ohne Wort°) | `abgemeldet` (ohne Wort°) | `abgemeldet` (ohne Wort°) | **St°** | **St°** |
| 6 | 401, Körper kein JSON | St° | St° | St° | St° | St° | St° |
| 7 | 403 mit `kein-admin`, `unbestaetigt`, `kein-recht`, `nur-ansehen` | St° | St° | St° | das Wort | St° | St° |
| 8 | 404 mit JSON-Objekt | `nicht-gefunden` (ohne Wort°) | `nicht-gefunden` (ohne Wort°) | **St°** | `nicht-gefunden` (ohne Wort°) | St° | St° |
| 9 | 429 mit JSON-Objekt | St° | St° | St° | `zu-viele` | `zu-viele` | `zu-viele` |
| 10 | 429, Körper kein JSON | St° | St° | St° | **St°** | **`zu-viele`°** | **`zu-viele`°** |
| 11 | 400 `eingabe` mit `felder` als Objekt | `eingabe` nur mit Satz bei `antwort` oder `bemerkung` (`antwort` geht vor°), sonst St° | `eingabe` + `felder` | St° | `eingabe` + `felder` | `eingabe` | St° |
| 12 | 400 `eingabe` ohne `felder` | St | St° | St | St° | **`eingabe`** (`speichereAngaben`: leere `felder`, `fremd` falsch°; `speichereRufname`: Satz «Ungültig.»°; `starteWechsel`: `eingabe`) | St° |
| 13 | 400 `eingabe` mit `felder` als Liste | St° | St° | St° | **`eingabe` mit der Liste°** | `eingabe` mit leeren `felder`° | St° |
| 14 | 400 mit anderem Wort | St° | St° | St° | `falsch`; `datei` nur mit `datei` als Objekt (beide `datei`-Fälle°) | `gleich`, `falsch` | `falsch`; `benutzt` nur mit `kontakt` als Text (ohne°) |
| 15 | 409 mit Wort des Moduls | `geschlossen` | zehn Wörter (`nur-lesen`°) | `push-aus` | 19 Wörter; sechs nur mit Zusatzangabe (`unpassend`, `hat-anmeldungen`, `nicht-moeglich`: `anzahl`; `vergeben`: `feld`; `warnung`: Liste; `inzwischen`: Objekt, **`null` gibt St°**); `inzwischen`° und `nur-lesen`° ohne Test; «Zusatz fehlt» nur für `warnung` gestellt | `veraltet` | St° |
| 16 | Wort mit falschem Status (z. B. 400 `veraltet`, 409 `falsch`) | St° | St° | St° | St° | St° | St° |
| 17 | Wort der Liste, das das Modul nicht kennt (z. B. 409 `veraltet` an `push`) | St° | St° | St° | St° | St° | St° |
| 18 | Wort ausserhalb der Liste | St° | St | St | St | St° | St° |
| 19 | 5xx | St | St | St | St | St | St |
| 20 | Fehler-Status mit JSON `null` als Körper | St° | St° | St° | **nach Status°** (`null` gilt als `{}`) | nach Status° | nach Status° |

Dazu, was `speichereAngaben` und `speichereRufname` aus dem Ergebnis von `schicke` machen:
`gleich`, `falsch` und `zu-viele` werden dort zu `stoerung`°, bei `speichereRufname` auch
`veraltet`°.

| Funktion | Sonderfall |
|----------|------------|
| `richtePasskeyEin` | Optionen: nur 2xx mit einem JSON-Objekt, sonst `fehler` (Liste als Körper°, 204°). Zweite Anfrage über `sende`: alles ausser `ok` wird `fehler` (auch 429°) |
| `meldeMitPasskeyAn` | Optionen: 429 ohne den Körper zu lesen `zu-viele` (ohne lesbaren Körper°); sonst nur 2xx mit `optionen` als Objekt und `vorgang` als Text. Zweite Anfrage über `sende`: `ok`, `falsch`, `zu-viele` bleiben, der Rest `stoerung` |
| `entfernePasskey` | **nur genau 204 ist `ok`**; ein 200 wäre `fehler`° |
| `ladePasskeys`, `ladeProfil`, `ladeKontakt` | alles ausser 2xx mit der erwarteten Form gibt `null`: 401 ist von einer Störung nicht zu unterscheiden (so gewollt, Kommentar «`null` bei Störung oder ohne Sitzung») |
| `hatSitzung` | `ok`, sonst und bei Netzfehler `false` |
| `sucheDoppelPartner` | ein Abbruch über `signal` kommt als Störung zurück; die Seite verwirft das Ergebnis, wenn `signal.aborted` |
| Ladefunktionen `+page.ts`, `profil/+page.ts`, `profil/email/+page.ts` | `fetch('/api/sitzung')` ohne `try`: Ein Netzfehler wirft aus der Ladefunktion (Fehlerseite von SvelteKit); nur 401 und «nicht `ok`» sind behandelt. `+layout.ts` fängt ihn. Schritt 15 |

- **Was der Server wirklich sendet [G]:** 204 an vier Stellen (`postGelesen` im Gespräch der
  Mitglieder, Logout, `postEntfernen` und `postHinweis` des Passkeys); die 22 wörtlich
  geschriebenen Wörter je mit genau einem Status (gezählt aus `antwort(4xx, { fehler: '…' })`), die
  übrigen laut D.5 alle mit 409. Die Fälle 3 (ausser `cm` und `sende`), 4, 6, 10, 13, 16, 17 und 20
  erzeugt der eigene Server nie; 6 und 10 kann ein Proxy oder ein abgebrochener Körper erzeugen,
  ein 404 mit JSON-Objekt ohne Wort sendet SvelteKit selbst für eine unbekannte Adresse (D.5).
- **Sichtbar für die Nutzerin sind heute zwei dieser Unterschiede** (bleiben, benannte Fälle für
  Schritt 15): Im Profil (Angaben, Rufname, E-Mail-Wechsel) führt eine abgelaufene Sitzung beim
  Speichern nicht zum Login, sondern zur Meldung «Das hat nicht geklappt …» (Fall 5) [G:
  `profil/+page.svelte` → `speichern`]; in der «Ansicht als …» melden die Module der Mitglieder
  ein abgewiesenes Speichern als Störung (Fall 7), soweit die Seite es dort überhaupt anbietet
  [E]. Das Abmelden ist nicht betroffen: `postLogout` antwortet auch ohne Sitzung mit 204 [G].

#### Wort und Status

- **Gilt ein Fehlerwort überall nur mit seinem Status? Ja [G].** Jede Deutung steht in einer
  Bedingung auf den Status (`anlass`, `cm`, `push`: `r.status === … && fehler === …`;
  `verwaltung/api.ts` → `deute`: je ein Block für 403, 400, 409; `profil/angaben.ts` → `deute`;
  `anmelden.ts` → `sende`: nur im Block für 400). Kein Modul liest ein Wort ohne den Status.
- **Deutet ein Modul den Status ohne Wort? Ja, für drei Status [G]:** 401 (`anlass`, `cm`, `push`,
  Verwaltung), 404 (`anlass`, `cm`, Verwaltung) und 429 (Verwaltung, Profil, `sende`, Passkey).
  Das sind die zwei entfallenen Tests aus D.6 (N-15): `push` 401 mit `{}` gibt weiter
  `abgemeldet`, Verwaltung 404 mit `{}` weiter `nicht-gefunden`. In `anlass`, `cm`, `push` und der
  Verwaltung gilt das nur, wenn der Körper lesbares JSON ist (Fall 6, 10).
- **Empfehlung: beides bleibt, im Baustein an einer Stelle.** (1) `fehler.ts` bekommt die Tabelle
  Wort → Status (heute steht die Zuordnung nur als Kommentar in `FEHLERWOERTER`). Der Baustein
  lässt ein Wort nur mit dem Status seiner Zeile gelten; das schliesst von N-08 den Teil «ein Wort
  ist an keinen Status gebunden» für die Oberfläche. (2) Für 401, 404 und 429 genügt der Status;
  diese drei Status tragen je genau ein Wort (`abgemeldet`, `nicht-gefunden`, `zu-viele`) [G:
  `FEHLERWOERTER`]. **Kein Entscheid nötig:** Beide Regeln sind das heutige Verhalten.
- **Nicht empfohlen in diesem Schritt:** `antwort` im Server an die Tabelle binden (schlösse N-08
  ganz). Es wäre ein zweiter Diff unter `src/lib/server/`, und die Typisierung mit Wörtern aus
  Variablen hat in Schritt 08 schon ein eigenes Glied gebraucht (D.6, Abweichung 3) [V: nicht
  versucht]. Bleibt Beobachtung.

#### Ränder: was der Baustein tragen muss, und warum kein Entscheid nötig ist

Der Baustein braucht je Modul einen kleinen «Vertrag» mit vier Angaben; damit bleibt jede Zeile
der Tabelle oben gleich:

1. **Die Wörter, die das Modul kennt** (auch `abgemeldet`, `nicht-gefunden`, `zu-viele`): erklärt
   die Fälle 5, 7, 8, 9, 15, 17. Was nicht genannt ist, wird Störung.
2. **Körper Pflicht oder nachsichtig:** Pflicht für `anlass`, `cm`, `push`, Verwaltung (unlesbar
   heisst Störung, auch bei 2xx und 401); nachsichtig für Profil, `sende`, Passkey (unlesbar ist
   kein Fehler, die Deutung läuft mit leerem Körper weiter). Erklärt die Fälle 3, 4, 6, 10. Dass
   `sende` den Körper heute nur bei 400 liest, gibt mit «nachsichtig» dieselben Ergebnisse [G:
   jede Zeile der Spalte durchgegangen]. **Falle:** Der Baustein muss «nichts gelesen» von einem
   gelesenen `{}` unterscheidbar zurückgeben. `richtePasskeyEin` öffnet den Dialog des Geräts nur
   mit einem gelesenen Objekt; mit «unlesbar gilt als `{}`» öffnete es ihn mit leeren Optionen.
3. **204 ohne Körper ist Erfolg:** nur `cm` (Fall 3).
4. **Zwei benannte Ränder ohne Sender:** JSON `null` als Fehlerkörper gilt in der Verwaltung als
   `{}`, in `anlass`, `cm`, `push` als Störung (Fall 20); `entfernePasskey` nimmt nur 204.

Die Zusatzangaben (`felder`, `feld`, `anzahl`, `warnungen`, `datei`, `gespraech`, `kontakt`,
`fremd`) liest weiter das Modul aus dem Körper, den der Baustein mitgibt, mit denselben Prüfungen
wie heute; so bleiben die Fälle 11 bis 14 und «Zusatz fehlt heisst Störung», ohne dass ein Modul
einen Statuscode nennt.

- **Kein Entscheid nötig.** Mit diesen vier Angaben ändert die Vereinheitlichung an keinem Rand
  ein Ergebnis. Die Richtung hat der Projektleiter für den gleichen Fall in Schritt 15 schon
  entschieden (E-44: Verhalten bleibt genau, Abweichungen sind benannte Fälle).
- **Vorbereitete Frage, nicht gestellt:** Will der Umsetzer oder der Orchestrator die Angabe 4
  nicht bauen (zwei Schalter für Antworten, die es nicht gibt), dann wäre das eine
  Verhaltensänderung und ginge so an den Projektleiter: «Zwei Antworten, die unser Server nie
  schickt (ein leerer Fehler in der Verwaltung, ein "200" statt "204" beim Entfernen eines
  Passkeys), behandelt die App heute je nach Seite verschieden. A: genau so lassen (zwei kleine
  Sonderregeln im Code). B: angleichen; sichtbar wird nichts, solange der Server sich nicht
  ändert. Empfehlung A, weil der Feature-Stopp keine Ausnahme kennt.» Ohne Frage gilt A.
- **Nicht angleichen, obwohl es naheläge (wäre sichtbar):** 401 im Profil als «abgemeldet» statt
  Störung; `nur-ansehen` in den Modulen der Mitglieder. Beides ändert, was die
  Nutzerin sieht, und gehört nicht in diesen Schritt.

#### Tests [G]

| Datei | Zeilen | Testblöcke | Stellt schon | Fehlt |
|-------|-------:|-----------:|--------------|-------|
| `anlass/api.test.ts` | 63 | 3 | 401, 404, 409 `geschlossen`, 400 mit beiden Feldern einzeln, 400 ohne `felder`, 500, Netzfehler | 204, unlesbar, Status ohne Wort, 403, 429, falscher Status, fremdes Wort, fremdes Feld |
| `cm/api.test.ts` | 240 | 10 (acht zum Abruf) | neun der zehn Ablehnungen, unbekanntes Wort, 401, 404, 500, Netzfehler, 400 mit `felder`, `signal` | **204**, `nur-lesen`, 400 ohne `felder` oder mit Liste, 403, 429, unlesbar; kein Aufruf von `holeGespraech`, `sendeNachricht`, `markiereGelesen` |
| `push/api.test.ts` | 74 | 3 | 401, 409 `push-aus`, unbekanntes Wort, 400, 500, Netzfehler, 502 unlesbar | 401 ohne Wort (N-15), 404, 204, 429, 403 |
| `verwaltung/api.test.ts` | 550 | 29 (zwei davon je viermal) | 403 (vier Wörter), 401, 404, 429, 400 `falsch` und `eingabe`, 17 der 19 Wörter mit 409, `warnung` ohne Liste, unbekanntes Wort, 400 unlesbar, 500, Netzfehler, 201, 202 | 404 ohne Wort (N-15), `datei`, `inzwischen`, `nur-lesen`, 204, 2xx unlesbar, 429 unlesbar, 400 ohne `felder` oder mit Liste, Zusatz fehlt (fünf Wörter), falscher Status, `null`; **13 Funktionen ohne Aufruf** (`zeigeEinleseVorschau`, `liesMitgliederEin`, `beendeSitzungen`, `ladeVerlauf`, `ladeFairgate`, `uebertrageFairgate`, `ladeTurnier`, `aendereTurnier`, `ladeKategorie`, `holeGespraeche`, `holeGespraech`, `sendeAntwort`, `setzeZustand`) |
| `verwaltung/mitteilung-api.test.ts` | 183 | 8 (drei zum Abruf) [E] | Pfade, 400 mit `felder`, 403, Netzfehler | nichts Eigenes (läuft über `lese`, `schicke`) |
| `profil/angaben.test.ts` | 224 | 24 | 200, 202, 409 `veraltet`, 400 `eingabe` mit Feldern, mit `fremd`, ohne `felder` (nur `starteWechsel`), `gleich`, `falsch`, 429, 500, Netzfehler; Laden: 401, 500, Netzfehler, unbekannte Klassierung | 401 und 404 beim Speichern, 429 unlesbar, 2xx unlesbar, `eingabe` ohne `felder` bei `speichereAngaben` und `speichereRufname`, «wird zu Störung» für `gleich`, `falsch`, `zu-viele`, falscher Status |
| `login/anmelden.test.ts` | 92 | 10 (einer dreimal) | 200, 202, 400 `falsch`, `benutzt` mit Kontakt, 429, 500, 400 unlesbar, Netzfehler; vier Blöcke zu `meldung` | 429 unlesbar, 204, 401, 404, `benutzt` ohne Kontakt, falscher Status |
| `login/passkey.test.ts` | 267 | 20 | beide Abläufe mit Abbruch, 401 und 500 ohne Körper, 400 `falsch`, 429 an beiden Stellen, kaputte Optionen, Netzfehler, 204, 404 | 200 statt 204 beim Entfernen, 429 ohne Körper, 429 bei der zweiten Anfrage des Einrichtens, Optionen als Liste |
| `login/sitzung.test.ts` | 21 | 3 | 200, 401, Netzfehler | 5xx |
| `push/geraet.test.ts` | 220 | 14 [E] | 409, 401, 500, Netzfehler über `sendeAbo` und `loescheAbo` | nichts für diesen Schritt |

- **Die Zahl «acht Testdateien, 1693 Zeilen» (1c, Hinweise) stimmt [G]** für die ersten acht
  Zeilen; `sitzung.test.ts` und `geraet.test.ts` kommen dazu.
- **Helfer:** `holer` (eine Antwort oder ein Fehler, merkt Pfad und `init`) und `json(status,
  inhalt)` mit dem bedingten Typ `Koerper<S>` stehen wortgleich in sieben Dateien (`anlass`, `cm`,
  `push`, `verwaltung`, `mitteilung-api`, `profil`, `anmelden`); `passkey.test.ts` hat `fakeHolen` (Antworten der
  Reihe nach), ein `json(inhalt, status)` mit umgekehrter Reihenfolge und `leer(status)`.
  `ungeprueft(status, inhalt)` gibt es in drei Dateien (`cm`, `push`, `verwaltung`), mit drei
  Aufrufen für unbekannte Wörter und einem für `warnung` ohne Liste. Für die Vorab-Tests braucht
  es `ungeprueft` auch in `anlass`, `profil` und `anmelden`. Der Typ `Koerper<S>` bindet kein Wort
  an seinen Status: «Wort mit falschem Status» geht ohne `ungeprueft` durch `json`.
- **Die Abdeckung misst die Abruf-Module nicht** (`vitest.config.ts`: `src/lib/server/**`,
  `src/lib/turnier/**`, zwei Dateien des Anlasses): Ein toter Zweig im Baustein fällt dort nicht
  auf.
- **E2E, gestellte Antworten:** 13 Stellen mit `.route(`, Zeilen wie im Nachtrag zur Prüfliste (b)
  [G: alle 13 bestätigt]. Eine davon heisst `seite.route` (`anlass.test.ts:148`); wer nach
  `page.route` sucht, findet zwölf. Für den Baustein zählen sechs: drei mit Fehlerwort
  (`anlass.test.ts:148` 409 `geschlossen` → `anlass`; `verwaltung.test.ts:209` 409
  `letzter-mytco`, `:588` 409 `veraltet` → Verwaltung), zwei mit 503 (`login.test.ts:105`
  `/api/logout` mit leerem Körper → `sende`; `verwaltung.test.ts:388` → Verwaltung) und eine mit
  502 und Text beim ersten Versuch (`mitteilungen.test.ts:257`). `hilfe.test.ts:51` (Abbruch von `/api/kontakt`) und
  `bewegung.test.ts:88` treffen Ladefunktionen, also Schritt 15.
- **E2E, echte Fehlerantworten des Servers [E, Textsuche nach Meldungen]:** `benutzt` und `falsch`
  im Login (`login.test.ts`, `briefe.test.ts`, `verwaltung.test.ts` beim Bestätigen), `falsch` beim
  Passkey (`passkey.test.ts`), `unpassend` mit Anzahl (`cm-anmeldung.test.ts`, Dialog «Anmeldungen
  passen nicht mehr»), eine Ablehnung in der Doppel-Verwaltung (`cm-doppel-verwaltung.test.ts`).
  Kein E2E läuft 401 nach einer Aktion, 404, 429, `eingabe` vom Server im Profil oder in der CM
  oder das 204 des Gesprächs mit Blick auf das Ergebnis ab. Es bleibt bei «E2E läuft fast nur
  Erfolgswege».

#### Vorab-Tests (erster Commit von Lauf 1, Charakterisierung)

Alle Fälle sind auf dem heutigen Stand grün; «einmal rot» heisst hier: je Gruppe eine Mutation an
der alten Deutung, die genau diese Fälle rot macht (aus einer Sicherungskopie zurück, nicht mit
`git checkout`). Die Fälle für Profil, `sende` und Passkey entstehen im selben Commit, noch mit
`ergebnis`; Lauf 2 ändert an ihnen nur den Namen. `u(…)` heisst `ungeprueft(…)`.

| Nr. | Datei | Fall | Erwartet |
|----:|-------|------|----------|
| 1 | `push/api.test.ts` | `u(401, {})` (N-15) | `abgemeldet` |
| 2 | | 404 `nicht-gefunden` | St |
| 3 | | 204 ohne Körper | St |
| 4 | | 429 `zu-viele` | St |
| 5 | | 403 `nur-ansehen` | St |
| 6 | | 401 ohne lesbaren Körper | St |
| 7 | | 409 `veraltet`; 400 `push-aus` | St; St |
| 8 | | `u(401, null)` | St |
| 9 | `anlass/api.test.ts` | `u(401, {})`; `u(404, {})` | `abgemeldet`; `nicht-gefunden` |
| 10 | | 204; 200 ohne lesbaren Körper; 401 ohne lesbaren Körper | je St |
| 11 | | 429 `zu-viele`; 403 `nur-ansehen` | St; St |
| 12 | | 400 `geschlossen`; 409 `eingabe` mit `felder.bemerkung`; 409 `voll` | je St |
| 13 | | 400 `eingabe` mit `felder: { plz: … }` | St |
| 14 | | 400 `eingabe` mit beiden Feldern | `eingabe`, `feld: 'antwort'` |
| 15 | | `u(404, null)` | St |
| 16 | `cm/api.test.ts` | 204 ohne Körper an `markiereGelesen`, mit Pfad, Methode und Körper | `ok`, `daten` `{}` |
| 17 | | 200 ohne lesbaren Körper; 401 ohne lesbaren Körper | St; St |
| 18 | | `u(401, {})`; `u(404, {})` | `abgemeldet`; `nicht-gefunden` |
| 19 | | 429 `zu-viele`; 403 `nur-ansehen` | St; St |
| 20 | | 400 `eingabe` ohne `felder`; `u(400, { fehler: 'eingabe', felder: ['x'] })` | St; St |
| 21 | | 409 `nur-lesen` an `sendeNachricht`, mit Pfad und Körper; `holeGespraech` mit Pfad | `nur-lesen`; `ok` |
| 22 | | 400 `voll`; 409 `veraltet`; 409 `eingabe` mit `felder` | je St |
| 23 | | `u(401, null)` | St |
| 24 | `verwaltung/api.test.ts` | `u(404, {})` (N-15); `u(401, {})` | `nicht-gefunden`; `abgemeldet` |
| 25 | | 204; 200 ohne lesbaren Körper; 429 ohne lesbaren Körper | je St |
| 26 | | `u(403, {})`; 403 `veraltet` | St; St |
| 27 | | 400 `eingabe` ohne `felder` | St |
| 28 | | `u(400, { fehler: 'eingabe', felder: ['titel'] })` | `eingabe` mit der Liste (benannter Rand) |
| 29 | | 400 `datei` mit `datei` als Objekt; `u(400, { fehler: 'datei' })` | `datei` mit dem Objekt; St |
| 30 | | 409 `inzwischen` mit `gespraech` als Objekt; mit `gespraech: null` | `inzwischen` mit dem Objekt; St |
| 31 | | 409 `nur-lesen` | `nur-lesen` |
| 32 | | `u(409, …)` ohne Zusatz für `unpassend`, `hat-anmeldungen`, `nicht-moeglich`, `vergeben` | je St |
| 33 | | 400 `veraltet`; 409 `falsch`; 409 `push-aus` | je St |
| 34 | | `u(401, null)`; `u(200, null)` | `abgemeldet`; `ok` mit `daten: null` |
| 35 | `profil/angaben.test.ts` | 401 `abgemeldet` und 404 `nicht-gefunden` an `speichereAngaben` und `starteWechsel` | `stoerung` |
| 36 | | 429 ohne lesbaren Körper an `starteWechsel` | `zu-viele` |
| 37 | | 200 ohne lesbaren Körper an `bestaetigeWechsel` und `speichereRufname` | `ok`; `ok` mit `rufname: null` |
| 38 | | 400 `eingabe` ohne `felder` an `speichereAngaben` | `eingabe`, `felder` `{}`, `fremd` falsch |
| 39 | | 400 `eingabe` ohne `felder` an `speichereRufname` | `eingabe`, `fehler: 'Ungültig.'` |
| 40 | | `u(400, { fehler: 'eingabe', felder: ['plz'] })` an `speichereAngaben` | `eingabe`, `felder` `{}` |
| 41 | | 400 `gleich`, 400 `falsch`, 429 an `speichereAngaben`; dazu 409 `veraltet` an `speichereRufname` | je `stoerung` |
| 42 | | 400 `veraltet`; 409 `gleich`; 409 `eingabe` an `starteWechsel` | je `stoerung` |
| 43 | | `ladeProfil`: 200 ohne lesbaren Körper; 200 mit `angaben` als Text | `null`; `null` |
| 44 | | `ladeKontakt`: `kontakt` als Zahl; Netzfehler | `null`; `null` |
| 45 | `login/anmelden.test.ts` | 429 ohne lesbaren Körper | `zu-viele` |
| 46 | | 204 ohne Körper; 200 ohne lesbaren Körper | `ok`; `ok` |
| 47 | | 401 `abgemeldet`; 404 `nicht-gefunden` | `stoerung`; `stoerung` |
| 48 | | `u(400, { fehler: 'benutzt' })` | `stoerung` |
| 49 | | 409 `falsch`; 400 `eingabe`; `u(400, null)` | je `stoerung` |
| 50 | `login/passkey.test.ts` | `entfernePasskey` mit 200 | `fehler`, kein Signal |
| 51 | | `meldeMitPasskeyAn`: Optionen 429 ohne Körper | `zu-viele` |
| 52 | | `meldeMitPasskeyAn`: zweite Anfrage 401 | `stoerung` |
| 53 | | `richtePasskeyEin`: zweite Anfrage 429 | `fehler` |
| 54 | | `richtePasskeyEin`: Optionen als Liste; Optionen 204; Optionen 200 ohne lesbaren Körper | je `fehler`, der Dialog des Geräts wird nicht geöffnet |
| 55 | | `ladePasskeys`: 200 ohne lesbaren Körper | `null` |
| 56 | `login/sitzung.test.ts` | 503 | `false` |
| 57 | `verwaltung/mitteilung-api.test.ts` | 409 `veraltet` an `sendeMitteilung` (läuft über `schicke`) | `veraltet` |

`push/geraet.test.ts` braucht keinen Vorab-Fall.

- **Mutationen für «einmal rot» (Vorschlag, je eine Zeile der alten Deutung):** `cm`: die
  204-Zeile weg (Fall 16); `push`, `anlass`, `cm`, Verwaltung: die 401-Zeile zusätzlich an das
  Wort `abgemeldet` binden (Fälle 1, 9, 18, 24); Verwaltung: die Bedingung `status === 409` um
  den 409-Block weg (Fall 33) und `k.gespraech &&` weg (Fall 30); Profil: die 429-Zeile an das
  Wort `zu-viele` binden (Fall 36) und `leseJson` bei unlesbarem Körper werfen lassen (Fall 37);
  `sende`: die 429-Zeile in den 400-Block (Fall 45); Passkey: `status !== 204` durch `!ok`
  ersetzen (Fall 50). Was davon welche Fälle rot macht, steht dann im Bericht des Laufs.
- **Nicht vorab, sondern Hinweis für Schritt 14:** die 13 Funktionen der Verwaltung ohne Aufruf
  im Test. Lauf 1 fasst ihre Zeilen nicht an (`lese` und `schicke` bleiben); Schritt 14
  verschiebt sie, dort lohnt ein Tabellen-Test «Funktion → Methode und Pfad».

#### Aufrufer [G für die genannten Stellen, E für «sonst keiner»]

| Wer | Liest | Stellen für Lauf 2 |
|-----|-------|--------------------|
| `profil/angaben.ts` | definiert `ergebnis` | 21 Zeilen (Typ `Speichern`, `schicke`, drei Funktionen) |
| `login/anmelden.ts` | definiert `ergebnis` | 11 Zeilen (Typ, `sende`, `meldung`) |
| `login/passkey.ts` | liest `r.ergebnis` von `sende` | 3 Zeilen (`richtePasskeyEin`, `meldeMitPasskeyAn`); die eigenen Ergebnisse sind blanke Wörter |
| `profil/angaben.test.ts` | erwartet `{ ergebnis: … }` | 9 Zeilen; dazu 8 Erwartungen `toBe('…')` an die blanken Wörter (ändern sich nur, wenn die Kleinfrage unten «ja» heisst) |
| `login/anmelden.test.ts` | erwartet `{ ergebnis: … }` | 12 Zeilen |
| `login/passkey.test.ts` | blanke Wörter | 0 |
| `src/routes/profil/+page.svelte` | `r.ergebnis` | 7 Zeilen (`speichereRufname` zwei, `speichereAngaben` vier, Abmelden eine) |
| `src/routes/login/+page.svelte` | `r.ergebnis` | 1 Zeile |
| `src/routes/login/mail/+page.svelte` | `r.ergebnis` | 2 Zeilen |
| `src/routes/willkommen/+page.svelte` | **nichts**: `ergebnis` ist dort der Zustand des Installations-Angebots (`installiere()` aus `hilfe/installation.svelte.ts`) | 0 |
| `src/routes/profil/email/+page.svelte` | blankes Wort von `starteWechsel` (zweimal) und `bestaetigeWechsel`: drei Vergleiche `r === 'ok'`, drei Aufrufe `meldungFuer(r)` | 0, oder 6, wenn die Kleinfrage unten «ja» heisst |
| `src/routes/+page.svelte`, `login/+page.svelte`, `profil/+page.svelte` | blanke Wörter des Passkeys (`r === 'ok'` …) | 0 |
| E2E (`tests/e2e/`) | importiert aus den drei Modulen nur `MELDUNG` | 0 |
| `art`: 65 Dateien unter `src/routes/` und `src/lib/` ohne Server und Tests, davon 47 unter `src/routes/` [E, Textsuche nach `.art`] | | 0 |

- **Zusammen für Lauf 2:** drei Module (35 Zeilen), zwei Testdateien (21 Zeilen), drei Seiten (10
  Zeilen). **Für die Nutzerin ändert sich nichts** (nur der Name eines Felds; kein Meldungstext).
- **Falle beim Umbenennen:** `ergebnis` heisst auch anderes und bleibt: die Ergebnisse der
  Fachfunktionen des Servers (auch in `tests/e2e/hilfen/login.ts` und in `scripts/`), der Zustand
  in `willkommen/+page.svelte` und in `verwaltung/Mitteilungsformular.svelte`, der Helfer
  `ergebnis(status, inhalt)` in `anlass/api.test.ts` und `cm/api.test.ts`. Kein Suchen-und-Ersetzen
  über das Repo.

#### Vorschlag für den Baustein

- **Ort und Name: `src/lib/abruf.ts`, mit `src/lib/abruf.test.ts`,** neben `fehler.ts` und
  `json-post.ts` (B-25 bleibt, wie es ist: kein eigener Ordner für Geteiltes). Die Datei
  importiert nur `./fehler.ts` und `./json-post.ts`, nichts aus `$app` und nichts aus einem
  Thema; so bleibt sie ohne Browser prüfbar. `Holen` (heute zweimal, `verwaltung/api.ts` und
  `login/anmelden.ts`) und `Json` (einmal, `verwaltung/api.ts`) ziehen dorthin; sieben Importe in
  sieben Dateien wechseln die Quelle (`anlass/api.ts`, `cm/api.ts`, `push/api.ts`,
  `push/geraet.ts`, `verwaltung/mitteilung-api.ts`, `profil/angaben.ts`, `login/passkey.ts`),
  keine Seite ist betroffen [G: Textsuche].
- **Form in Worten:** eine Funktion «rufe ab» mit Adresse, Anfrage, `holen` und dem Vertrag des
  Moduls (die vier Angaben oben). Sie wirft nie und gibt eines von drei Dingen zurück: `ok` mit
  den Daten; ein Fehlerwort aus den Wörtern des Vertrags, zusammen mit dem gelesenen Körper;
  `stoerung`. Die Reihenfolge innen: Netzfehler → Störung; 2xx → `ok` (Körper nach Angabe 2 und
  3); 401, 404, 429 → das Wort dieses Status, wenn der Vertrag es kennt; sonst das Wort aus dem
  Körper, wenn es in der Liste steht, laut Tabelle zu diesem Status gehört und im Vertrag steht;
  sonst Störung. Das Feld heisst `art`.
- **Was im Modul bleibt:** Adressen, Typen, sein Vertrag, das Abbilden des Körpers auf seine
  Zusatzangaben (ein Modul sagt z. B. «`unpassend` braucht `anzahl` als Zahl, sonst Störung») und
  Meldungstexte und Anzeige-Hilfen (6.1 Punkt 4). Kein Modul nennt mehr einen Statuscode. Die
  exportierten Ergebnis-Typen (`Ergebnis<T>` je Modul, `Antwort<T>` mit 31 Varianten) bleiben in
  Lauf 1 Zeichen für Zeichen gleich; `lese` und `schicke` bleiben exportiert (Hinweis zu Schritt
  14).
- **Blanke Wörter des Passkeys und von `push/geraet.ts`: bleiben** (benannte Ausnahme zu «das
  Ergebnis heisst `art`»). Sie sind das Ergebnis eines Ablaufs auf dem Gerät aus zwei Anfragen
  und einem Dialog, nicht eines Abrufs; `abgebrochen` und `vorhanden` kommen vom Browser. Die
  Anfragen darin laufen über den Baustein. Ebenso bleiben «Daten oder `null`» der vier
  Lade-Funktionen und `hatSitzung`; den typisierten Abruf der Sitzung baut Schritt 15.
- **Kleinfrage, kein Entscheid des Projektleiters:** `starteWechsel` und `bestaetigeWechsel` sind
  ein einzelner Abruf mit blankem Wort. Empfehlung: in Lauf 2 als eigener Commit auf `{ art }`
  heben (sechs Stellen in `profil/email/+page.svelte`, acht Erwartungen im Test), damit die
  Übergangsregel für jeden einzelnen Abruf gilt; sonst im Bericht ausdrücklich verwerfen.
- **Kleinfrage, kein Entscheid des Projektleiters:** die vier Adressen in den Seiten. Empfehlung:
  in Lauf 2 als eigener Commit vier benannte Funktionen in `login/anmelden.ts` (Brief-Code,
  Mail-Code anfordern, mit Mail-Code anmelden, abmelden); `sende` ist danach nicht mehr
  exportiert. Die Seiten ändern je eine Zeile, der Test von `sende` ruft die neuen Funktionen.
  Sonst ausdrücklich verwerfen und als Beobachtung notieren.
- **N-10, `FEHLER` und `ABGELEHNT`: eine geteilte Liste** unter `src/lib/cm/` (z. B.
  `src/lib/cm/ablehnung.ts`, importiert nur `../fehler.ts`), mit den neun Gründen der Anmeldung.
  `server/cm/schnittstellen.ts` nimmt sie statt `FEHLER` (das `satisfies readonly Ablehnung[]`
  bleibt dort), `cm/api.ts` baut `ABGELEHNT` aus ihr und `nur-lesen` (das kommt aus dem Gespräch,
  nicht aus `ablehnung`). Der Server importiert schon aus `src/lib/turnier/`, `src/lib/anlass/`,
  `src/lib/mitteilung/` und `src/lib/verwaltung/` [G: Textsuche]; ob die Lint-Regel den neuen
  Pfad zulässt, ist nicht ausgeführt [V]. Die Antworten ändern sich nicht. Offen bleibt die
  Gegenrichtung: `ablehnung` macht aus einem Grund, den die Liste nicht kennt, still
  `geschlossen`; dass jeder Grund der Fachfunktionen in der Liste steht, liesse sich als Typ
  prüfen [V], ist aber kein Teil von N-10.
- **N-09, die doppelten Sätze des Anlasses: aufnehmen, als kleinster Schnitt.** `ANTWORT_MELDUNG`
  und `MAX_BEMERKUNG` ziehen aus `server/anlass/angaben.ts` an einen geteilten Ort unter
  `src/lib/anlass/` (der Browser darf aus `src/lib/server/` keinen Wert holen); Server und Seite
  nehmen die zwei Sätze und die Zahl von dort. Die Seite zeigt sie an drei Stellen (Prüfung im
  Browser, Antwort des Servers, `maxlength`). Das Ergebnis von `anlass/api.ts` bleibt
  `{ art: 'eingabe', feld }`. Kein sichtbarer Satz ändert sich; die zwei Sätze stehen wörtlich in
  `server/anlass/schnittstellen.db.test.ts` und halten das fest [G]. Eigener Commit in Lauf 2.
  Wird es dem Umsetzer zu viel, ausdrücklich verwerfen: Der Punkt hängt nicht am Baustein.
- **Lint-Regel «kein `fetch` ausserhalb des Bausteins»: möglich mit Bordmitteln, sinnvoll,
  Vorschlag.** `no-restricted-globals` für `fetch` in `src/routes/**` (ohne `api/`) und
  `src/lib/**` (ohne `server/`, ohne `abruf.ts`, ohne Tests). Das `fetch` einer Ladefunktion ist
  ein Parameter, kein globaler Name, und bleibt erlaubt. Drei Voraussetzungen: (1) Die Vorgabe
  `holen: Holen = fetch` steht heute an 92 Stellen in acht Dateien [G: gezählt]; sie zieht in den Baustein
  (`holen` wird freiwillig, der Baustein nimmt sonst das globale `fetch`), die Aufrufer ändern
  sich dadurch nicht. (2) `sucheDoppelPartner` bekommt `signal` so, dass die Doppel-Seite kein
  `fetch` mehr nennen muss. (3) `push/geraet.ts` → `browser()` lässt `holen` weg. Ob die Regel
  auch `typeof fetch` in einem Typ meldet (`login/sitzung.ts`, `hilfe/+page.ts`), ist nicht
  geprüft [V]. Letzter Code-Commit von Lauf 2, einmal rot belegt; geht (1) nicht ohne Reibung
  auf, verschieben auf Schritt 15, der die Ladefunktionen ohnehin anfasst. Eine Regel der
  Bauregel braucht es dafür nicht.

#### Schnitt in zwei Läufen (E-41)

**Lauf 1: Baustein und die Module mit `art`** (Opus; Review 1 auf dem committeten Zwischenstand)

1. `test:` die Vorab-Fälle 1 bis 57, alle Dateien, auch Profil, `sende`, Passkey; kein Code
   geändert. Einmal rot: die Mutationen oben.
2. `refactor:` Tabelle Wort → Status in `fehler.ts` und `abruf.ts` mit `abruf.test.ts` (Test
   zuerst, je Regel und je Angabe des Vertrags ein Fall). Noch nutzt ihn kein Modul.
3. `refactor:` `anlass/api.ts` und `push/api.ts` auf dem Baustein.
4. `refactor:` `cm/api.ts` (204).
5. `refactor:` `verwaltung/api.ts`: `rufe` und `deute` weg, `lese` und `schicke` rufen den
   Baustein; `Holen` und `Json` aus `abruf.ts`; `mitteilung-api.ts` und `push/geraet.ts` ändern
   nur den Import.
6. `refactor:` N-10, die geteilte Liste (einziger Diff unter `src/lib/server/` in Lauf 1). Einmal
   rot: ein Grund, den nur der Server führt, macht `svelte-check` rot.
7. `docs:` dieses Dokument.

- **Beleg «Tests unverändert»:** Zwischen Commit 1 und dem Ende von Lauf 1 ist der Diff der
  bestehenden `*.test.ts` leer; neu ist nur `abruf.test.ts`. Kein Diff in einer `.svelte`-Datei,
  einer `+page.ts` oder unter `src/routes/api/`. Voller `make check` und E2E am Ende.
- **Einmal rot im Baustein:** eine falsche Zeile in der Tabelle Wort → Status (z. B. `veraltet`
  bei 400) macht die Fälle «Wort mit falschem Status» und die bestehenden 409-Fälle rot.
- **Abbruchstelle:** Lassen sich die 31 Varianten von `Antwort<T>` nicht ohne Umschreiben der
  Seiten aus dem Baustein typisieren [V], abbrechen und melden; `anlass`, `push` und `cm` sind
  dann schon ein brauchbarer Zwischenstand.

**Lauf 2: Profil, Login, Passkey** (Opus; Review 2)

1. `refactor:` `profil/angaben.ts`, `login/anmelden.ts`, `login/passkey.ts` auf dem Baustein, noch
   mit `ergebnis`; Tests unverändert grün.
2. `refactor:` Umbenennung `ergebnis` → `art`: drei Module, zwei Testdateien, drei Seiten. Der
   Diff enthält nur den Namen (66 Zeilen); `svelte-check` einmal rot belegt, indem eine Seite
   noch `r.ergebnis` liest.
3. `refactor:` (Kleinfrage) `starteWechsel` und `bestaetigeWechsel` geben `{ art }`.
4. `refactor:` (Kleinfrage) vier benannte Funktionen statt `sende` mit Adresse.
5. `refactor:` N-09, die Sätze des Anlasses am geteilten Ort.
6. `refactor:` (Vorschlag) die Lint-Regel zu `fetch`, mit Probe.
7. `docs:` dieses Dokument, der Eintrag in der Prüfliste (b), falls sich Zeilen verschoben haben.

- **Probe für den Reviewer:** Commit 2 für sich lesen (nur der Name); der Diff unter
  `src/lib/server/` enthält in Lauf 2 nur N-09 (`anlass/angaben.ts`, `anlass/schnittstellen.ts`),
  unter `src/routes/api/` nichts. Voller `make check` und E2E am Ende, dann ein Merge und eine
  Version für beide Läufe.
- **Modell:** Opus für beide Läufe, wie die Zeile. Lauf 1 ist ein Entwurf (Vertrag, Typen für 31
  Varianten); Lauf 2 wäre als blosse Umbenennung Sonnet, trägt aber die Ränder des Passkeys und
  drei kleine Zusatz-Commits.

#### Abweichungen von der Zeile 13, den Hinweisen und der Prüfliste (b)

1. **«Vier Seiten» (Zeile, Hinweise, 1c):** drei. `willkommen/+page.svelte` liest kein Ergebnis
   eines Abruf-Moduls. In der Zeile berichtigt.
2. **«`passkey` mit der Umbenennung»:** `passkey.ts` gibt blanke Wörter zurück; umzubenennen sind
   dort nur drei Zeilen, die `sende` lesen. In der Zeile vermerkt.
3. **Dritte Ergebnis-Form fehlt im Plan:** blanke Wörter (`starteWechsel`, `bestaetigeWechsel`,
   Passkey, `geraet.ts`) und «Daten oder `null`». Empfehlung oben.
4. **Hinweis «204»:** stimmt, unvollständig: Im Profil und in `sende` ist jedes 2xx ein Erfolg,
   ohne dass der Körper zählt (das 204 des Logouts läuft so durch); `entfernePasskey` verlangt
   genau 204. «Der Server sendet 204 nur für Gespräch, Logout und Passkey» stimmt (vier Stellen).
5. **Hinweis «429»:** stimmt; dazu Profil und Passkey (Status allein, auch ohne lesbaren Körper).
   «Nur mit lesbarem JSON» gilt in `anlass`, `cm`, `push` und der Verwaltung auch für 401 und 404.
6. **Hinweis «`eingabe` ohne `felder`»:** stimmt; im Profil sind es drei verschiedene Folgen
   (Fall 12).
7. **Hinweis «401 wird in Profil und Login zur Störung»:** stimmt; ebenso 404. `push` kennt 404
   nicht.
8. **Hinweis «ein Wort gilt nur mit seinem Status»:** stimmt; es fehlt «für 401, 404 und 429
   genügt der Status» (genau die zwei entfallenen Tests).
9. **Zeile, Dateien:** Es fehlen `src/lib/fehler.ts` (Tabelle), `src/lib/abruf.test.ts`, der Ort
   der geteilten Liste (`src/lib/cm/`), für N-09 ein geteilter Ort unter `src/lib/anlass/`, und,
   je nach Kleinfrage, `src/routes/profil/email/+page.svelte`. `login/sitzung.ts` steht in der
   Zeile, ändert sich in Schritt 13 aber nicht (der typisierte Abruf der Sitzung ist Schritt 15).
10. **Zeile, Probe «Diff unter `src/lib/server/` leer, ausser für N-10»:** mit N-09 kommen zwei
    Dateien des Anlasses dazu.
11. **Netz, «acht Testdateien»:** stimmt; die Lücken sind grösser als «ein Sonderfall, den kein
    Fall stellt»: 16 Abruf-Funktionen ruft kein Test auf, drei Wörter der Verwaltung und das 204
    der CM sind ungetestet.
12. **Prüfliste (b), Nachtrag:** 13 Stellen und alle Zeilen stimmen. Zu ergänzen: `anlass:148`
    heisst `seite.route`; «die Stellen mit Fehlerwort (drei) als Probe im Browser» stimmt, dazu
    tragen zwei 503 und ein 502 den Weg «Störung» durch den Baustein.
13. **B-20, «überstehen Schritt 13 unverändert»:** gilt nur für Lauf 1.
14. **Nicht im Plan:** Seiten halten vier Adressen; die Doppel-Seite nennt `fetch`; `Holen` gibt es
    zweimal; `ladeKontakt` und `holeKontakt` rufen dasselbe ab.

Sonst stimmen Zeile und Hinweise: Risiko mittel, zwei Läufe, Voraussetzung, Modell, Weg, die
Aufnahme von N-10, «Module nehmen `holen` als Parameter» als «bleibt».

#### Bleibt (gut gelöst)

`holen` als Parameter in jeder Abruf-Funktion; `istFehlerwort` und die getippten Helfer `json`
und `ungeprueft` der Tests; dass kein Baustein selbst `fetch` ruft; `jsonPost` als einzige Form
einer ändernden Anfrage; die Trennung «Modul deutet, Seite schreibt den Satz»; `leiteUm` als
eine Stelle für die Umleitungen der Verwaltung.

#### Nicht geprüft, dünn belegt

- **Nichts ausgeführt.** Dass die Vorab-Fälle auf dem heutigen Stand grün sind, ist aus dem
  Code gelesen, nicht gelaufen. Zwei Stellen sind dabei am dünnsten: wie `Response.json(null)`
  und ein `Response` ohne Körper sich in der Testumgebung beim Lesen verhalten (Fälle 8, 15, 23,
  34, 46) [V].
- **Der Baustein ist ein Entwurf in Worten [V]:** nicht getippt, nicht gebaut. Ob sich
  `Antwort<T>` ohne Änderung an den Seiten aus ihm ergibt, zeigt erst Lauf 1.
- **Lint [V]:** ob `no-restricted-globals` `typeof fetch` meldet und ob die Importrichtung den
  Import von `src/lib/cm/ablehnung.ts` aus dem Server zulässt, ist an den Mustern gelesen bzw.
  aus vorhandenen Importen geschlossen.
- **Seiten nur an den Aufrufstellen gelesen [E]:** Was jede der 47 Dateien unter `src/routes/`
  aus `art` macht, ist nicht gelesen; Lauf 1 ändert die Typen nicht, darum hält es `svelte-check`.
- **`mitteilung-api.test.ts` und `geraet.test.ts` nicht ganz gelesen [E].**
- **E2E-Abdeckung aus der Textsuche [E]:** «kein E2E läuft 401 nach einer Aktion ab» heisst: Die
  Meldung kommt unter `tests/e2e/` nicht in diesem Zusammenhang vor.
- **Svelte-Doku nicht nachgeschlagen [V]:** dass das `fetch` der Ladefunktion Abhängigkeiten für
  `invalidate` anlegt, steht hier aus dem Kommentar in `clubmeisterschaft/[id]/+page.ts`.
- **Zeilenzahlen der Aufrufer** sind per Textsuche nach `ergebnis` gezählt und an den Seiten
  einzeln gelesen; mehrzeilige Stellen ohne das Wort fehlen in der Zahl nicht, weil jede Lese-
  und Schreibstelle das Wort trägt.
- **Nicht nachgeführt (der Auftrag liess sonst nichts umschreiben)** [in Lauf 2 nachgeführt, E.3]: «vier Seiten» steht weiter
  im ersten Hinweis zu Schritt 13 und in 1c (Tabelle P);
  B-20 sagt weiter «überstehen Schritt 13 unverändert»; die Zeile «Nächster offener Schritt» oben
  sagt weiter «mit Nachmessen vorab». Es gelten die Zeile 13, der neue Hinweis und dieser
  Abschnitt. Die `CLAUDE.md` ist nicht geändert; die benannte Ausnahme «blanke Wörter des
  Passkeys und von `push/geraet.ts`» zur Übergangsregel «Ab Schritt 13» ist ein Vorschlag für
  den Bericht von Lauf 2 bzw. für Schritt 24.

### E.2 Schritt 13, Lauf 1

**Erkenntnisse Schritt 13, Lauf 1** (13.11.2026, Branch `refactor/schritt-13` ab `origin/dev`
`9c90b0f` mit dem Doku-Commit `ed043c7`; Baustein und die Module mit `art`)

- **Voraussetzungen geprüft:** Schritt 12a erledigt, Nachmessen erledigt (E.1), kein Entscheid
  nötig. Keine neue Abhängigkeit (im Worktree nur `npm ci --ignore-scripts`), keine Lint-Ausnahme,
  `AUSNAHMEN` leer, `CLAUDE.md` unverändert, keine Version.
- **Commits:** `fcd3250` `test:` Vorab-Tests (Charakterisierung); `17008e9` `refactor:` Tabelle
  Wort → Status und Baustein; `9cf1969` `refactor:` `anlass` und `push`; `41fde29` `refactor:`
  `cm`; `fb6e07a` `refactor:` Verwaltung und `mitteilung-api`; `291e4a8` `refactor:` N-10; dazu
  dieser `docs:`-Commit. Jeder Commit lief durch den Hook `check-schnell` (Lint, `svelte-check`,
  Prüfskripte, Einheitstests, ab Commit 2 97 Dateien mit 1386 Tests); die Datenbanktests der CM
  (7 Dateien, 137 Tests) liefen von Hand nach Commit 6, dem einzigen Diff unter `src/lib/server/`.
- **`src/lib/fehler.ts`:** neu `STATUS_DES_WORTS`, der Status je Wort, getippt als
  `{ readonly [W in Fehlerwort]: FehlerStatus }` (ein Wort ohne Zeile oder eine Zeile ohne Wort ist
  ein Typfehler). Gegen den Server gelesen: Die 22 wörtlich geschriebenen Wörter stehen dort mit
  genau diesem Status, die übrigen kommen über Variablen mit 409 [G: Textsuche nach
  `antwort(4xx`]. Die Datei importiert weiter nichts. `antwort` im Server ist nicht an die Tabelle
  gebunden (E.1, «nicht empfohlen»).
- **`src/lib/abruf.ts`** (importiert nur `./fehler.ts`): `Holen`, `Json` (aus `verwaltung/api.ts`
  hierher gezogen), `Vertrag<W>`, `Abruf<T, W>`, `STATUS_ALLEIN` (401 `abgemeldet`, 404
  `nicht-gefunden`, 429 `zu-viele`) und `rufeAb(pfad, init, holen, vertrag)`. Wirft nie; gibt
  `{ art: 'ok', daten }`, `{ art: <Wort des Vertrags>, koerper }` oder `{ art: 'stoerung' }`.
  Reihenfolge: Netzfehler → Störung; 204 nach Angabe 3; Körper lesen nach Angabe 2; 2xx → `ok`;
  JSON `null` als Fehlerkörper nach Angabe 4; 401, 404, 429 → das Wort des Status, wenn der Vertrag
  es nennt; sonst das Wort aus dem Körper, wenn es in der Liste steht, laut Tabelle zu diesem Status
  gehört und im Vertrag steht; sonst Störung. Der Vertrag hat die vier Angaben aus E.1: `woerter`,
  `koerper: 'pflicht' | 'nachsichtig'`, `ohneKoerper?: 'erfolg' | 'einzig'` (204 ohne zu lesen; bei
  `einzig` ist jedes andere 2xx Störung, für `entfernePasskey`), `nullAlsLeer?`. Bei `nachsichtig`
  und unlesbarem Körper ist `daten` `undefined`, nicht `{}` (die Falle aus E.1). `holen` bleibt
  Pflicht-Parameter; die Vorgabe `fetch` steht weiter je Abruf-Funktion. `abruf.test.ts`: 17 Fälle,
  je Regel und je Angabe einer; Abdeckung des Bausteins 100 % (Anweisungen und Zweige, von Hand mit
  `--coverage.include=src/lib/abruf.ts` gemessen; `vitest.config.ts` misst ihn nicht, unten).
- **Die Module:** `anlass`, `push`, `cm` und `verwaltung/api.ts` rufen `rufeAb` mit ihrem Vertrag
  und bilden nur noch Zusatzangaben ab, mit denselben Prüfungen wie vorher (`feldAus`; `felder` als
  Objekt in der CM; in der Verwaltung `felder`, `datei`, `gespraech` als «Objekt oder Liste»,
  `anzahl` als Zahl, `feld` als Text, `warnungen` als Liste). Kein Modul nennt im Code mehr einen
  Statuscode und keines liest `istFehlerwort`. Verträge: `anlass` 4 Wörter, `push` 2, `cm` 13
  (`abgemeldet`, `nicht-gefunden`, zehn Ablehnungen, `eingabe`) mit `ohneKoerper: 'erfolg'`,
  Verwaltung 29 mit `nullAlsLeer`; alle `koerper: 'pflicht'`. Die Wörter der Verwaltung kommen aus
  `Antwort<T>` (`Exclude<…['art'], 'ok' | 'stoerung'>`) und stehen in einem `Record<Wort, true>`:
  Ein fehlendes oder überzähliges Wort ist ein Typfehler. `deute` entfällt; `lese` und `schicke`
  bleiben exportiert (Hinweis zu Schritt 14). Die Ergebnis-Typen (`Ergebnis<T>` je Modul,
  `Antwort<T>` mit 31 Varianten) sind Zeichen für Zeichen gleich; `svelte-check` trägt das ohne
  Änderung an einer Seite. **Die Abbruchstelle aus E.1 trat nicht ein:** Die 21 Wörter ohne Zusatz
  der Verwaltung gibt `{ art: r.art }` als ein Objekt zurück; TypeScript prüft das gegen die
  Vereinigung, solange es höchstens 25 Varianten sind (dieselbe Grenze wie in D.6, Abweichung 3).
  Ein 22. bis 25. Wort ohne Zusatz geht noch; danach braucht `rufe` einen Zweig mehr.
- **N-10:** `src/lib/cm/ablehnung.ts` mit `ABLEHNUNGEN` (die neun Gründe, gegen die Liste
  getippt, holt aus `fehler.ts` nur einen Typ). `server/cm/schnittstellen.ts`:
  `const FEHLER = ABLEHNUNGEN satisfies readonly Ablehnung[]`; `cm/api.ts`:
  `ABGELEHNT = [...ABLEHNUNGEN, 'nur-lesen']`. Lint (Importrichtung) und Bauregel lassen den Import
  aus `src/lib/cm/` in den Server ohne Ausnahme zu (`npm run lint`, `bauregel: ok`); der Server holt
  schon aus `src/lib/turnier/`, `mitteilung/` und `name.ts`.
- **Vorab-Tests** (`fcd3250`, 27 Tests in fünf Dateien, als je ein eigener `describe`-Block
  «Ränder der Deutung» angehängt; die bestehenden Fälle unberührt): die Zeilen 1 bis 34 und 57 aus
  E.1. Die Zeilen 35 bis 56 (Profil, `sende`, Passkey, `sitzung`) gehören zu Lauf 2. Auf dem alten
  Stand alle grün; **E.1 irrt an keinem Rand**, auch nicht an den zwei dünnsten Stellen
  (`Response.json(null)` und eine `Response` ohne Körper, Fälle 8, 15, 23, 34, verhalten sich wie
  gelesen). Dazu, über E.1 hinaus: 200 mit JSON `null` in `anlass`, `cm`, `push` (`ok` mit
  `daten: null`, wie in der Verwaltung, Fall 34); in der Verwaltung 409 mit `null` (Störung),
  `eingabe` mit `felder` als Text, `datei` als Text, `unpassend` mit `anzahl` als Text, `vergeben`
  mit `feld` als Zahl, `warnung` mit `warnungen` als Objekt (je Störung).
- **Rot belegt** (je aus einer Sicherungskopie im Scratchpad zurückgesetzt, `git status` danach
  sauber; kein `git checkout`):
  - Vorab-Tests gegen die alte Deutung, in einem Lauf: 401 an das Wort `abgemeldet` gebunden in
    `push`, `anlass`, `cm`, Verwaltung; 404 an `nicht-gefunden` in der Verwaltung; die 204-Zeile der
    CM weg; `k.gespraech &&` weg; die Zeile `veraltet` der Verwaltung weg → 14 von 86 rot, darunter
    je Modul ein Vorab-Fall (push «401 genügt als Status…», anlass und cm «401 und 404 genügen…»,
    cm «204 ohne Körper ist Erfolg…», Verwaltung «401 und 404…», «JSON null…», «409 inzwischen…»,
    `mitteilung-api` «409 veraltet beim Senden…»: «expected { art: 'stoerung' } to deeply equal
    { art: 'veraltet' }»). Getrennt: die Bedingung `status === 409` um den 409-Block weg → 2 rot
    («403 braucht eines seiner vier Wörter», «ein Wort gilt nur mit seinem Status»: «expected
    { art: 'veraltet' } to deeply equal { art: 'stoerung' }»).
  - Baustein: `abruf.test.ts` vor `abruf.ts` rot («Cannot find module './abruf.ts'»). Tabelle
    `veraltet: 400` → 2 von 17 rot; die Regel «Status allein» weg → 4 von 17 rot. Nach Commit 5
    dieselbe Tabellen-Zeile → 10 rot in `abruf`, Verwaltung und `mitteilung-api` (die bestehenden
    409-Fälle mit `veraltet`). `nullAlsLeer: false` in der Verwaltung → 1 rot (Fall 34).
  - Typen: `inzwischen` aus dem `Record<Wort, true>` der Verwaltung weg → `svelte-check` 1 Fehler
    («Property 'inzwischen' is missing …»).
  - N-10, beide Richtungen: ein Wort, das keine Fachfunktion der CM zurückgibt (`vorbereitung`), in
    `ABLEHNUNGEN` → `svelte-check` 1 Fehler in `server/cm/schnittstellen.ts` (`satisfies`); `voll`
    aus `ABLEHNUNGEN` weg → 5 Fehler in den zwei CM-Seiten («Type '"voll"' is not comparable …»).
- **Beleg «Tests unverändert, keine Seite»** (Befehle im Worktree, Ausgabe vollständig):
  `git diff --name-status fcd3250 HEAD -- '*.test.ts'` → nur `A src/lib/abruf.test.ts`;
  `git diff --name-only fcd3250 HEAD -- '*.svelte' '*+page.ts' '*+layout.ts' src/routes` → leer;
  `git diff --name-only fcd3250 HEAD -- src/lib/server` → nur `src/lib/server/cm/schnittstellen.ts`
  (N-10). Kein Helfer eines Tests geändert, auch keine Import-Quelle (die Tests importieren `Holen`
  und `Json` nicht).
- **Voller `make check`** auf dem Code-Endstand `291e4a8` bei sauberem Arbeitsbaum, im
  Hintergrund, kein zweiter Lauf im Ordner: Exit 0. Lint; `svelte-check` 1538 Dateien ohne Fehler
  und Warnung; Prüfskripte samt `bauregel: ok`; Einheits- und Datenbanktests 153 Dateien mit 2134
  Tests, Abdeckung 97,07 % Anweisungen und 93,56 % Zweige (unverändert, der Baustein zählt nicht
  mit); beide Builds; E2E 414 bestanden, 57 übersprungen, 3,4 Minuten; Image; grüner Stand
  `6d52571e140e` gemerkt. Der Doku-Commit ändert keinen Code.
- **Abweichungen von E.1:**
  1. **Vorab-Tests nur für die Module von Lauf 1** (Auftrag): Zeilen 1 bis 34 und 57; 35 bis 56
     entstehen in Lauf 2, zusammen mit dem Umbau dieser Module.
  2. **`push/geraet.ts` ändert in Lauf 1 nichts** (Auftrag: nicht in diesem Lauf). Darum reicht
     `verwaltung/api.ts` `Holen` aus dem Baustein weiter (`export type { Holen }`, mit Kommentar);
     Lauf 2 stellt den Import in `geraet.ts` um und streicht die Zeile. `profil/angaben.ts` und
     `login/passkey.ts` holen `Holen` weiter aus `login/anmelden.ts` (dort noch eine eigene,
     gleich lautende Definition; Lauf 2). E.1 zählte sieben Importe; in Lauf 1 wechseln vier
     (`anlass`, `cm`, `push`, `mitteilung-api`).
  3. **Der Baustein importiert `json-post.ts` nicht** (E.1 erlaubte es): Die Module bauen ihre
     Anfrage wie bisher selbst.
  4. **Mehr Vorab-Fälle als E.1** (oben) und eine Vollständigkeitsprüfung der Wörter der
     Verwaltung über den Typ, die E.1 nicht vorsah.
  5. **N-10, «einmal rot»:** E.1 schlug «ein Grund, den nur der Server führt» vor. Mit der
     geteilten Liste gibt es keine Server-Liste mehr; belegt sind darum die zwei Richtungen, in
     denen die Liste jetzt bindet (oben).
- **Für die Nutzerin geändert: nichts.** Kein Meldungstext, keine Seite, keine Route; jede Antwort
  ergibt dasselbe Ergebnis wie vorher (Vorab-Tests und bestehende Tests unverändert grün).
- **Was kein Test sieht:**
  - Die Angaben `nachsichtig` und `einzig` haben in Lauf 1 keinen Nutzer; nur `abruf.test.ts`
    hält sie. Ob sie für Profil, `sende` und Passkey genau passen, zeigt erst Lauf 2 mit den
    Vorab-Fällen 35 bis 56.
  - `vitest.config.ts` misst die Abdeckung von `src/lib/abruf.ts` nicht (E.1); ein toter Zweig fällt
    im `make check` nicht auf. Heute 100 %, von Hand gemessen.
  - Die Gegenrichtung von N-10 bleibt offen: Gibt eine Fachfunktion der CM einen neuen Grund zurück,
    der nicht in `ABLEHNUNGEN` steht, sendet `ablehnung` still `geschlossen`; kein Typ prüft, dass
    `Ablehnung` in der Liste aufgeht (E.1, nicht Teil von N-10).
  - E2E läuft die Fehlerwege weiter nur an den sechs Stellen mit gestellter Antwort (E.1, Tests).
  - Die Grenze von 25 Varianten (oben) meldet sich erst, wenn sie erreicht ist, als Typfehler in
    `verwaltung/api.ts`, nicht vorher.
- **Ausserhalb des Schritts aufgefallen (nicht behoben):**
  - Der Kommentar zu `CmFelder` in `cm/api.ts` nennt weiter «bei 400»; das beschreibt den Server,
    kein Code deutet den Status. Unverändert gelassen.
  - Die Vorgabe `holen: Holen = fetch` steht weiter an jeder Abruf-Funktion (Lint-Regel zu `fetch`
    ist Lauf 2 bzw. Schritt 15).
- **Für Lauf 2:** Profil, `sende`, Passkey auf `rufeAb` mit `koerper: 'nachsichtig'`
  (`entfernePasskey` mit `ohneKoerper: 'einzig'`); `push/geraet.ts` und die zwei Module des Logins
  holen `Holen` aus `abruf.ts`, danach entfallen die Weitergabe in `verwaltung/api.ts` und die
  zweite Definition in `login/anmelden.ts`; die Vorab-Fälle 35 bis 56 zuerst.

### E.3 Schritt 13, Lauf 2

**Erkenntnisse Schritt 13, Lauf 2** (13.11.2026, Branch `refactor/schritt-13` ab `970c072`, nach Review 1
«ok» ohne Befund; Profil, Login, Passkey, Umbenennung, Kleinfragen, N-09, Punkte aus dem Review)

- **Voraussetzungen geprüft:** Review von Lauf 1 «ok» (Differenztest des Reviewers alt gegen neu,
  rund 5 Millionen Fälle, 0 Abweichungen). Keine neue Abhängigkeit, keine Lint-Ausnahme, `AUSNAHMEN`
  leer, `CLAUDE.md` unverändert, keine Version. Svelte-Doku vor dem ersten Diff an einer `.svelte`-Datei
  über den MCP-Server geholt (`kit/load`: `fetch` der Ladefunktion, `invalidate`, Einbetten gelesener
  Antworten bei SSR; die App hat `ssr = false`, darum liest der Baustein ohne Folge auch dort den
  Körper, wo das alte Modul es nicht tat).
- **Commits:**

  | Nr. | Commit | Inhalt |
  |----:|--------|--------|
  | 0 | `99b6406` `test:` | Vorab-Tests der Zeilen 35 bis 56 (20 Fälle in vier Dateien) |
  | 1 | `5f3ab9d` `refactor:` | Profil, Login, Passkey, Sitzung auf dem Baustein, noch mit `ergebnis`; `Holen` überall aus `abruf.ts` |
  | 2 | `3c47eb7` `refactor:` | Umbenennung `ergebnis` → `art`, allein |
  | 3 | `c502044` `refactor:` | Kleinfrage: `starteWechsel`, `bestaetigeWechsel` geben `{ art }` |
  | 4 | `119180c` `refactor:` | Kleinfrage: vier benannte Anfragen statt `sende` mit Adresse |
  | 5 | `0eee143` `refactor:` | N-09: `src/lib/anlass/antwort.ts` |
  | 6 | — | Lint-Regel zu `fetch`: **verworfen** (unten) |
  | 7a | `74752c3` `refactor:` | Wortlisten der Verträge an den Typ gebunden (`woerterAus`) |
  | 7b | `bc41749` `test:` | `src/lib/abruf.ts` in der Abdeckung |
  | 8 | dieser `docs:`-Commit | |

  Jeder Commit lief durch den Hook `check-schnell` (Lint, `svelte-check`, Prüfskripte,
  Einheitstests: 97 Dateien, 1406 bis 1408 Tests); die Datenbanktests des Anlasses (25) liefen nach
  Commit 5 von Hand, `npm test` (153 Dateien, 2156 Tests) nach Commit 7b.
- **Commit 1, die Verträge** (alle `koerper: 'nachsichtig'`, keiner mit `nullAlsLeer`, das dort
  ohne Belang ist):

  | Modul | Funktionen | Wörter | Angabe 3 |
  |-------|------------|--------|----------|
  | `profil/angaben.ts` → `schicke` | `speichereAngaben`, `starteWechsel`, `bestaetigeWechsel`, `speichereRufname` | `veraltet`, `eingabe`, `gleich`, `falsch`, `zu-viele` | — |
  | `profil/angaben.ts` → `lade` | `ladeProfil` (und `ladeAngaben`), `ladeKontakt` | keine | — |
  | `login/anmelden.ts` → `sende` | `sende` und die vier neuen Funktionen | `falsch`, `benutzt`, `zu-viele` | — |
  | `login/passkey.ts` | Optionen von `richtePasskeyEin`, `ladePasskeys`, `hinweisErledigt` | keine | — |
  | `login/passkey.ts` | Optionen von `meldeMitPasskeyAn` | `zu-viele` | — |
  | `login/passkey.ts` | `entfernePasskey` | keine | `einzig` (nur ohne Körper ist Erfolg) |
  | `login/sitzung.ts` | `hatSitzung` | keine | — |

  Die Module bilden wie vorher ab: Profil liest `felder`, `fremd`, `rufname` aus dem Körper (kein
  Objekt gilt als `{}`), `speichereAngaben` macht aus `gleich`, `falsch`, `zu-viele` Störung,
  `speichereRufname` dazu aus `veraltet`; `sende` gibt `benutzt` nur mit `kontakt` als Text;
  `richtePasskeyEin` öffnet den Dialog nur mit einem gelesenen Objekt (`daten` ist bei unlesbarem
  Körper `undefined`, die Falle aus E.1 trägt); `ladePasskeys` behält das `try` um die Umwandlung.
  Die Hilfen `leseJson` (Profil, Passkey), `deute` (Profil) und `post` (Passkey) entfallen. `Holen`
  steht nur noch in `abruf.ts`: `push/geraet.ts`, `profil/angaben.ts`, `login/passkey.ts` holen es
  dort; die Weitergabe in `verwaltung/api.ts` und die zweite Definition in `login/anmelden.ts`
  sind weg. **`login/sitzung.ts` ist mit umgestellt** (E.1 sah das erst in Schritt 15 vor):
  `hatSitzung` las `.ok`; jetzt `rufeAb` mit einem Vertrag ohne Wörter, das Ergebnis bleibt ein
  Wahrheitswert, die Anfrage ist `GET` wie vorher (E.1 zählte `holen(pfad)` mit einem Argument; für
  `fetch` ist das dieselbe Anfrage). Der typisierte Abruf der Sitzung bleibt Schritt 15. Die
  Attrappe `fakeHolen` in `passkey.test.ts` gibt echte `Response`s zurück; sie brauchte keine
  Änderung.
- **Commit 2, Umbenennung:** 81 Vorkommen des Worts `ergebnis` als Feld bzw. lokale Variable, nur
  in den acht Dateien `profil/angaben.ts` (24), `login/anmelden.ts` (11), `login/passkey.ts` (5),
  `profil/angaben.test.ts` (15), `login/anmelden.test.ts` (16), `routes/profil/+page.svelte` (7),
  `routes/login/+page.svelte` (1), `routes/login/mail/+page.svelte` (2). Mehr als die 66 aus E.1,
  weil die 20 Vorab-Fälle dazukamen und `schicke` im Profil seine lokale Variable mitbenennt. Der
  Wort-Diff enthält nur `ergebnis` → `art` (52 Felder, 10 `r.ergebnis`, Rest Kurzformen), dazu
  zwei von Prettier umgebrochene Zeilen. Nicht angefasst: `ergebnis` der Fachfunktionen des
  Servers, der Helfer `ergebnis(status, inhalt)` in `cm/api.test.ts` und `anlass/api.test.ts`, die
  Zustände in `willkommen/+page.svelte` und `Mitteilungsformular.svelte`, `tests/e2e/`,
  `scripts/`. Rot belegt: `r.ergebnis` zurück in `login/+page.svelte` → `svelte-check` 1 Fehler
  («Property 'ergebnis' does not exist on type 'Ergebnis'»).
- **Commit 3, Kleinfrage `{ art }`: aufgenommen.** Die Seite `profil/email` ändert drei Zeilen,
  je `const r = (await starteWechsel(email)).art;` bzw. `bestaetigeWechsel`; Vergleiche und
  `meldungFuer` bleiben. In `angaben.test.ts` werden 18 Erwartungen von `toBe('x')` zu
  `toEqual({ art: 'x' })`, dieselben Wörter. Das ist die einzige Stelle, an der eine Erwartung
  ihre Form ändert (nicht ihren Wert).
- **Commit 4, Kleinfrage benannte Anfragen: aufgenommen.** `meldeMitBriefAn(code)`,
  `fordereMailCodeAn(email)`, `meldeMitMailAn(email, code)`, `meldeSichAb()` in
  `login/anmelden.ts`; die drei Seiten ändern Import und je eine Zeile (Funktionsname, die
  Adresse fällt weg, die Angaben stehen als Argumente). Anfrage gleich (neuer Test je Funktion:
  Pfad, Methode, Kopfzeile, Körper als Text; rot belegt mit vertauschter Reihenfolge `{ code,
  email }`). **Abweichung von E.1:** `sende` bleibt exportiert, weil `passkey.ts` die zweite
  Anfrage beider Abläufe darüber schickt; die bestehenden Tests von `sende` bleiben, wie sie sind.
- **Commit 5, N-09: aufgenommen.** `src/lib/anlass/antwort.ts` (importiert nichts) mit
  `MAX_BEMERKUNG` und `ANTWORT_MELDUNG`; `server/anlass/angaben.ts` nimmt die Grenze von dort,
  `server/anlass/schnittstellen.ts` die Sätze, die Seite `anlass/[id]` beide (drei Sätze,
  `maxlength={MAX_BEMERKUNG}`). Zeichengleich belegt: Die alte Seite enthielt den Satz zu `antwort`
  zweimal, den zu `bemerkung` einmal und `maxlength="500"`; die Konstanten sind mit diesen Texten
  identisch (`===`, mit Node geprüft). Der Datenbanktest hält beide Sätze wörtlich; ein geänderter
  Satz macht ihn rot (1 von 8). Lint und Bauregel ohne Ausnahme.
- **Punkt 6, Lint-Regel zu `fetch`: verworfen, als Vorschlag an Schritt 15.** Gemessen mit
  `no-restricted-globals` für `fetch` über `src/lib` und `src/routes` (ohne Server, Tests,
  `routes/api/`): **98 Meldungen** in zehn Dateien: die Vorgaben `holen: Holen = fetch` (Verwaltung
  53, CM 16, Profil 7, Login 5, Passkey 5, Push 4, Anlass 3, Mitteilungen 3), `push/geraet.ts` →
  `browser()` (1) und die Doppel-Seite, die das globale `fetch` für `signal` durchreicht (1). Das
  `fetch` der Ladefunktionen (Parameter) und `typeof fetch` in `login/sitzung.ts` und
  `hilfe/+page.ts` meldet die Regel nicht. Am heutigen Repo ist sie also nicht grün; grün würde
  sie erst mit rund 97 geänderten Signaturen und einer Seite, die mehr als einen Namen ändert. Das
  ist mehr, als der Auftrag erlaubt. **Vorschlag für Schritt 15:** (1) `rufeAb` nimmt `holen`
  freiwillig (`holen ?? fetch`), die Abruf-Funktionen schreiben `holen?: Holen`; (2)
  `sucheDoppelPartner` nimmt `signal` vor `holen` oder in einem Objekt; (3) `geraet.ts` lässt
  `holen` weg; (4) dann die Regel für `src/lib/**` und `src/routes/**` ohne `server/`, `api/`,
  Tests und ohne `abruf.ts`, einmal rot belegt. `clubmeisterschaft/[id]/+page.ts`, das
  `holeCmTurniere()` bewusst ohne das `fetch` der Ladefunktion ruft, bleibt dabei, wie es ist.
- **Punkt 7a, Wortlisten an den Typ gebunden.** `woerterAus<Wort>({ … })` in `abruf.ts`; `Wort`
  kommt in `anlass`, `push`, `cm`, Verwaltung, Profil und Login aus dem Ergebnis-Typ des Moduls
  (`Exclude<…, 'ok' | 'stoerung'>`), die CM hängt die geteilten Ablehnungen an. Die Optionen der
  Passkey-Anmeldung nennen `zu-viele` über denselben Helfer; die Verträge ohne Wörter
  (`Vertrag<never>`) können nichts vergessen. Rot belegt: `geschlossen` aus dem Objekt von `anlass`
  → `svelte-check` 1 Fehler (fehlende Eigenschaft); `veraltet` dazu in `push` → 1 Fehler
  (überzählige Eigenschaft). Ein Fall für `woerterAus` in `abruf.test.ts` (17 → 18).
- **Punkt 7b, Abdeckung.** `src/lib/abruf.ts` steht in `coverage.include`; der Baustein ist ganz
  gedeckt, die Schwellen halten (97,1 % Anweisungen, 93,64 % Zweige gesamt).
- **Vorab-Tests** (`99b6406`, 20 Fälle): die Zeilen 35 bis 56 aus E.1, als je ein `describe`-Block
  «Ränder der Deutung» angehängt; dazu über E.1 hinaus 204 an `speichereAngaben` (`ok`), 429 mit
  JSON `null` (`zu-viele`), 400 mit JSON `null` (Störung) und `eingabe` ohne `felder` an
  `starteWechsel`. **E.1 irrt an keinem Rand.** Rot belegt (aus Sicherungskopien zurück, `git
  status` danach sauber): Profil die 429-Zeile an das Wort gebunden und `leseJson` werfen lassen,
  `sende` 429 erst nach dem Lesen des Körpers, Passkey `status !== 204` durch `!ok`, `hatSitzung`
  `status !== 401` statt `ok` → 5 von 105 rot, je Modul ein Vorab-Fall; getrennt `istObjekt(opt)`
  in `richtePasskeyEin` weg → 1 rot («Dialog öffnet nur mit einem gelesenen Objekt»).
- **Beleg des Laufs** (Befehle im Worktree):
  - `git diff --stat 99b6406 HEAD -- '*.test.ts' tests/` → nur `abruf.test.ts` (ein neuer Fall),
    `anmelden.test.ts` (Umbenennung, Import, ein neuer `describe`), `angaben.test.ts` (Umbenennung,
    Kleinfrage 3); `passkey.test.ts`, `sitzung.test.ts` und `tests/` ohne Diff.
  - `git diff --word-diff=porcelain 99b6406 HEAD -- '*.test.ts'`, alle entfernten Wörter: 31×
    `ergebnis:` und 18 Erwartungen `toBe('…')` aus Kleinfrage 3 (sonst nichts).
  - `.svelte` (`git diff --stat 99b6406 HEAD -- '*.svelte'`): `login`, `login/mail`, `profil`
    (Feldname und, aus Kleinfrage 4, Import und Funktionsname), `profil/email` (drei Zeilen,
    Kleinfrage 3), `anlass/[id]` (N-09: Import, drei Sätze, `maxlength`). Kein Wert und kein Text
    hat sich geändert.
  - Unter `src/lib/server/` nur `anlass/angaben.ts` und `anlass/schnittstellen.ts` (N-09), unter
    `src/routes/api/` nichts.
- **Voller `make check`** auf dem Code-Endstand `bc41749` bei sauberem Arbeitsbaum, im
  Hintergrund, kein zweiter Lauf im Ordner: Exit 0. Lint; `svelte-check` 1539 Dateien ohne Fehler
  und Warnung; Prüfskripte samt `bauregel: ok`; Einheits- und Datenbanktests 153 Dateien mit 2156
  Tests, Abdeckung 97,1 % Anweisungen und 93,64 % Zweige (jetzt mit `abruf.ts`); beide Builds; E2E
  414 bestanden, 57 übersprungen, 3,5 Minuten; Image; grüner Stand `9cba996ee11c` gemerkt. Der
  Doku-Commit ändert keinen Code.
- **Abweichungen von E.1:**
  1. `login/sitzung.ts` ist in Lauf 2 auf dem Baustein (E.1: erst Schritt 15); die Form des
     Ergebnisses (Wahrheitswert) bleibt.
  2. `sende` bleibt exportiert (Kleinfrage 4, oben).
  3. Die Umbenennung zählt 81 statt 66 Stellen (oben).
  4. Die Lint-Regel zu `fetch` ist nicht gebaut (oben); E.1 sah das als möglichen Ausgang vor.
  5. In `.svelte`-Dateien ändert N-09 die Seite des Anlasses, nicht nur Namen; das verlangt N-09
     selbst (Server und Seite nehmen die Sätze vom selben Ort).
  6. Die Attrappe in `passkey.test.ts` brauchte keine Änderung.
- **Benannte Ausnahmen zur Übergangsregel «Ab Schritt 13 … das Ergebnis heisst `art`»** (für den
  Wortlaut der Regel, Entscheid beim Projektleiter, `CLAUDE.md` unverändert). Kein Abruf-Modul
  deutet nach Lauf 2 einen Statuscode selbst; die Form des Ergebnisses weicht hier ab:
  - **Blanke Wörter eines Ablaufs auf dem Gerät** (zwei Anfragen und ein Dialog, Wörter teils vom
    Browser): `richtePasskeyEin` → `'ok' | 'vorhanden' | 'abgebrochen' | 'fehler'`,
    `meldeMitPasskeyAn` → `'ok' | 'abgebrochen' | 'falsch' | 'zu-viele' | 'stoerung'`,
    `entfernePasskey` → `'ok' | 'fehler'`; in `push/geraet.ts` `schalteEin` → `'ein' |
    'abgelehnt' | 'stoerung'` und `schalteAus` → `'aus' | 'stoerung'` (sie lesen `r.art` von
    `sendeAbo` und `loescheAbo`).
  - **Daten oder `null`:** `ladeProfil`, `ladeAngaben`, `ladeKontakt` (Profil), `ladePasskeys`
    (Liste oder `null`); 401 ist dort von einer Störung nicht zu unterscheiden, so gewollt.
  - **Wahrheitswert:** `hatSitzung`.
  - **Nichts:** `hinweisErledigt`.
  - Vorschlag für den Wortlaut: «Ab Schritt 13: Abruf-Module nutzen den gemeinsamen Abruf-Baustein;
    keine eigene Deutung von Statuscodes. Ein einzelner Abruf gibt `{ art }`; Abläufe auf dem
    Gerät (Passkey, Push), Ladefunktionen mit „Daten oder `null`“ und `hatSitzung` sind benannte
    Ausnahmen in E.3.»
- **Für die Nutzerin geändert: nichts.** Kein Satz, keine Anfrage, kein Ergebnis an einem Rand
  (Vorab-Tests und bestehende Erwartungen mit denselben Werten grün, E2E unverändert grün).
- **Was kein Test sieht:**
  - Dass der Baustein bei 2xx und 429 im Login, bei Fehlern des Passkeys und bei `hatSitzung`
    den Körper liest, wo das alte Modul es nicht tat: gleiches Ergebnis, nur liest er bis zum
    Ende. Ein Körper, der nie endet, liesse den Aufruf warten statt sofort zu antworten [V: kein
    solcher Sender]. Mit `ssr = false` bettet SvelteKit keine gelesene Antwort ein.
  - Was die Seiten aus `art` machen, hält in Lauf 2 nur `svelte-check` (wie E.1).
  - Die Lint-Regel zu `fetch` fehlt; ein neues `fetch` in einem Baustein fiele nur im Review auf.
  - Die Gegenrichtung von N-10 bleibt offen (E.2).
- **Ausserhalb des Schritts aufgefallen (nicht behoben):**
  - `hilfe/+page.ts` → `holeKontakt` ruft `/api/kontakt` neben `ladeKontakt` im Profil (Schritt 15,
    E.1).
  - Die Abruf-Module der Login-Seiten heissen nach Kleinfrage 4 `meldeMitBriefAn` usw.;
    `meldeAb` gibt es schon in `cm/api.ts` (CM abmelden), darum `meldeSichAb`.
- **Review von Lauf 2 und Urteil über den ganzen Schritt 13 (13.11.2026): «ok», kein Befund vor dem
  Merge.** Differenztest des Reviewers alt (`970c072`) gegen neu (`fcb5368`): 1 298 478 Fälle über
  alle Abruf-Funktionen von Profil, Login, Passkey und Sitzung, samt sieben gestellten
  Geräte-Verhalten beim Passkey, 0 Abweichungen (Umbenennung und die Form `{ art }` herausgerechnet).
  Die Vorab-Tests laufen gegen den alten Code grün (105); elf Mutationen am neuen Code machen je
  mindestens einen Test rot. Der Körper wird höchstens einmal gelesen, das Cookie ist vor dem Lesen
  gesetzt, kein zusätzlicher Wurf. Voller `make check` des Reviewers auf `fcb5368`: Exit 0, 153
  Dateien mit 2156 Tests, E2E 414 bestanden und 57 übersprungen, grüner Stand `9cba996ee11c`.
- **Wackliger Test ausserhalb des Diffs:** Ein erster `make check` des Reviewers war rot, 1 von 2156:
  `src/lib/server/admin/schnittstellen.db.test.ts`, «A-MITGLIED-02: Liste mit Suche und Status» (die
  Suche nach `Qwxz` gab 15 Mitglieder statt einem). Einmal in sechs Durchläufen; Datei und `admin/`
  sind im Schritt unberührt; Ursache offen. Eintrag in `docs/beobachtungen.md`.
- **Hinweise des Reviews:** `woerterAus` bindet nur mit ausdrücklicher Typangabe (heute überall so;
  kein Lint erzwingt es; für Schritt 14 beachten). Zehn Funktionen der Verwaltung sind weiter ohne
  Aufruf im Einheitstest. Die Tabelle `STATUS_DES_WORTS` ist nicht an `antwort` im Server gebunden.
- **Offen beim Projektleiter (Wortlaut, hält nichts auf):** Die Übergangsregel «Ab Schritt 13» sagt
  «das Ergebnis heisst `art`»; das stimmt für zehn Funktionen bewusst nicht (Liste oben). Vorschlag
  des Reviewers, ohne Verweis auf dieses Dokument: «Ab Schritt 13: Statuscodes deutet nur der
  Abruf-Baustein (`src/lib/abruf.ts`); ein einzelner Abruf gibt `{ art }` zurück. Abläufe aus
  mehreren Anfragen (Passkey, Push auf dem Gerät) und Lade-Hilfen («Daten oder `null`»,
  Wahrheitswert) dürfen eine andere Form haben.»

### E.4 Schritt 14

**Erkenntnisse Schritt 14** (13.11.2026, Branch `refactor/schritt-14` ab `7b4b2af` = `origin/dev`, Version
0.20.20; ein Lauf, Sonnet; kein Nachmessen vorgesehen)

- **Voraussetzungen geprüft:** Schritt 13 gemergt (`7b4b2af`), Arbeitsbaum sauber, keine neue
  Abhängigkeit, keine Lint-Ausnahme, `CLAUDE.md` unverändert, keine Version. `.svelte`-Dateien: nur
  Import-Zeilen geändert, darum keine Svelte-Doku nötig (kein Svelte-Code geschrieben).
- **Commits** (alle `refactor:`, je für sich grün: Lint, `svelte-check`, Prüfskripte, Einheitstests im
  Hook): `a7e3a26` Zugang; `70c7078` Anlass und Gespräch (zusammen, weil ein Lauf des Schnitt-Skripts
  beide erfasste und `api.ts` dabei gemeinsam wuchs; beide Bereiche sind klein); `a60440c` Mitglieder;
  `18ec293` Turnier samt Kopf und Typen des Kerns. Dieser Docs-Commit folgt nach dem `make check`.
- **Der Schnitt** (Funktionen je Datei, Typen mit ihren Funktionen):

  | Datei | Funktionen | Inhalt |
  |---|---:|---|
  | `zugang-api.ts` | 6 | `ladeZugang`, `fordereCodeAn`, `bestaetige`, `ladeRollenListe`, `schaueAls`, `beendeAnsicht` |
  | `anlass-api.ts` | 5 | die fünf `…Anlass…`-Funktionen |
  | `gespraech-api.ts` | 4 | `holeGespraeche`, `holeGespraech`, `sendeAntwort`, `setzeZustand` |
  | `mitglieder-api.ts` | 19 | Liste, Angaben, Rollen, Sitzungen beenden, Austritt, Wiedereintritt, Löschen (`mitgliedschaft`), Auskunft, Verlauf, Briefe, Einlesen, Fairgate |
  | `turnier-api.ts` | 22 | Turniere, Kategorien, Anmeldungen, Entscheid, Spielersuche, Klassierung, Doppel, Anfragen (`mitTrotzdem`) |
  | `api.ts` (Kern) | 2 (`lese`, `schicke`) | `Antwort<T>`, `Wort`, `WOERTER`, `VERTRAG`, `rufe`, `ADMIN`, die Typen unter der Antwort |

  Kein weiterer Bereich geschnitten: Rollen und Ansicht sind Sitzung (Zugang), Briefe, Einlesen,
  Fairgate und Verlauf hängen alle an `/api/admin/mitglieder` oder am Mitglied, Kategorien und Doppel
  am Turnier. Eine Funktion in zwei Bereichen gab es nicht, einen Kreis beim Laden auch nicht: die
  Bereichs-Dateien importieren `api.ts`, nie umgekehrt. Dafür bleibt `GespraechVerlauf` im Kern (die
  Antwort `inzwischen` trägt es); `anlass-api.ts` und die anderen holen `Antwort`, `lese` und `schicke`
  von dort.
- **Belege (Zeichen für Zeichen):** Skript `vergleich.mjs` (Scratchpad) zerlegt die alte und die neuen
  Dateien in Blöcke ab `ADMIN` und vergleicht den Text ohne jede Normalisierung (ausser `export` vor
  `ADMIN`): «Blöcke original: 56 gefunden: 56». Das Skript `schnitt.mjs` hat die Blöcke ausgeschnitten,
  nichts von Hand umgeschrieben.
- **Nur Import-Zeilen:** Skript `importe-nur.mjs` entfernt aus jeder geänderten Datei ausser den
  Bereichs-Dateien, `api.ts` und den Testdateien alle Import-Anweisungen (auch mehrzeilige) und
  vergleicht den Rest mit `origin/dev`: «geprüft: 42 Dateien, Abweichungen: 0». Darunter 27 `.svelte`-Dateien
  und 15 `.ts`-Dateien (Ladefunktionen und Hilfsdateien) in `src/routes` und `src/lib/verwaltung`. Der
  Plan zählte 61 Dateien, die `verwaltung/api.ts` importieren [G, Textsuche]; 42 davon wechseln die
  Quelle. Wer nur Kern-Typen (`Antwort`, `Feld` usw.) holt, bleibt bei `api.ts` (dazu `mitteilung-api.ts`
  und die Testdateien). `tests/` und `e2e` importieren `verwaltung/api` nicht
  (`scripts/pruefungen/bauregel.test.ts` nennt es nur in einem Beispieltext, unverändert). Die Zahl 61
  stimmt mit keiner meiner Zählungen überein (am Stand `7b4b2af` nennen 47 Dateien in `src/routes` und
  `src/lib/verwaltung` `api.ts` oder `verwaltung/api.ts`, davon auch die Testdatei und
  `mitteilung-api.ts`); der Plan ist nur eine Grössenordnung.
- **Tests:** 44 vorher, 44 nachher; je Datei nachher `api.test.ts` 12 (Regel 3, 401/403, Netzfehler und
  die neun Fälle der Deutung «Ränder»), `zugang-api.test.ts` 5, `mitglieder-api.test.ts` 14 (4 Fälle, 2 × 4
  aus `it.each`, Auskunft, Briefe), `turnier-api.test.ts` 12, `anlass-api.test.ts` 1. Die Fälle sind
  ganz verschoben, ihr Wortlaut ist unverändert (jeder `it`-Block als Text aus der alten Datei
  geschnitten); nur die Importzeilen und die Helfer sind neu, Helfer in
  `tests/hilfen/verwaltung-abruf.ts` (`holer`, `json`, `ungeprueft`, `Koerper`, `Aufruf`). Fälle, die
  Funktionen zweier Bereiche mischen (Regel 3, 401/403, die «Ränder») bleiben in `api.test.ts`, denn
  sie prüfen die Deutung des Kerns und nehmen die Bereichs-Funktionen als Sonden.
- **Einmal rot:** (a) Ein Import in `src/routes/verwaltung/turniere/+page.svelte` auf `api.ts` statt
  `turnier-api.ts`: `svelte-check` 2 Fehler («has no exported member 'ladeTurniere'» und
  «'TurnierListe'»), danach zurückgestellt und 0 Fehler. (b) In `turnier-api.ts` den Pfad
  `…/loeschen` zu `…/loeschn` geändert: `turnier-api.test.ts` 1 von 12 rot («Anmeldungen verwalten mit
  Pfad, Methode und Körper»), danach zurückgestellt und 12 grün. Beide über Sicherungskopien, kein
  `git checkout`.
- **Voller `make check`** auf `18ec293`, sauberer Arbeitsbaum, Exit 0: 157 Dateien mit 2156 Tests
  (vorher 153 Dateien, gleiche 2156; vier neue Testdateien aus dem Verteilen), Abdeckung Statements
  97,1 %, Branches 93,64 %, Funktionen 96,82 %, Zeilen 98,75 %, E2E 414 bestanden, 57 übersprungen
  (3,4 Minuten), grüner Stand `0f04db458c82`. Der bekannte wacklige Test («A-MITGLIED-02: Liste mit
  Suche und Status») blieb grün, keine Wiederholung nötig.
- **Was kein Test sieht:**
  - Zehn Funktionen der Verwaltung haben weiter keinen Einheitstest, jetzt nach Datei: `mitglieder-api.ts`
    `beendeSitzungen`, `ladeVerlauf`, `ladeFairgate`, `uebertrageFairgate`; `turnier-api.ts`
    `ladeTurnier`, `aendereTurnier`, `ladeKategorie`; `gespraech-api.ts` `holeGespraeche`,
    `holeGespraech`, `setzeZustand` (`gespraech-api.ts` hat keine eigene Testdatei). Der Hinweis des
    Reviews, einen Tabellen-Test «Funktion → Methode und Pfad» zu bauen, ist nicht umgesetzt: er wäre
    ein neuer Test, die Vorgabe des Schritts verlangt gleiche Zahlen. Für sie hält nur `svelte-check`
    die Importe, und die Zeichengleichheit ihrer Rümpfe ist oben belegt.
  - Ob eine Seite die richtige Funktion aus dem richtigen Bereich ruft, hält nur `svelte-check`; die
    Importe wechselten ausschliesslich die Quelle.
  - `woerterAus<Wort>` mit Typangabe steht unverändert im Kern; die Bereichs-Dateien rufen es nicht.
- **Ausserhalb des Schritts aufgefallen (nicht behoben):**
  - Sieben Testdateien kopieren `holer`, `json` und `Aufruf` je für sich (`mitteilung-api.test.ts`,
    `cm/api.test.ts`, `anlass/api.test.ts`, `push/api.test.ts`, `abruf.test.ts`, `profil/angaben.test.ts`,
    `login/anmelden.test.ts`); der neue Helfer unter `tests/hilfen/verwaltung-abruf.ts` könnte sie
    ablösen (kleine Aufräum-Gelegenheit, kein Verhalten).
  - `GespraechVerlauf` steht im Kern, obwohl es zu den Gesprächen gehört; es zieht erst um, wenn die
    Antwort `inzwischen` es nicht mehr trägt (Schritt 15 oder später, falls die Antwort schlanker wird).
  - Das Dokument nennt im Hinweis zu Schritt 13 «13 Funktionen» und im Review «zehn Funktionen» ohne
    Aufruf im Test; gezählt sind es zehn (ohne `lese` und `schicke`, die über jede andere Funktion
    laufen).
- **Review (13.11.2026): «ok», kein Befund vor dem Merge.** Eigener voller `make check` des Reviewers
  auf `16386a8`: Exit 0, 157 Dateien mit 2156 Tests, E2E 414 bestanden und 57 übersprungen, grüner
  Stand `0f04db458c82`. Alle 55 Blöcke (56 Funktionen und zwei Helfer) stehen zeichengleich je genau
  einmal in einer Bereichs-Datei; Differenztest jeder der 56 Funktionen alt gegen neu über 1 466 416
  Fälle ohne Abweichung; in den 42 geänderten Dateien nur Import-Anweisungen, jeder der 112
  importierten Namen kommt aus der Datei, in der er definiert ist; alle 38 `it`-Blöcke zeichengleich
  verschoben.
- **Hinweise des Reviews (nicht behoben):** Zehn der neuen Import-Zeilen holen nur Typen, stehen aber
  als `import { type X }` statt `import type { X }` (ohne Wirkung, Lint grün). Dass jeder der vier
  `refactor:`-Commits für sich grün war, ist nur vom Implementer belegt.
- **Modell:** Der Schritt lief mit Sonnet (Plan), das Review mit Fable.

### E.5 Nachmessen Schritt 15

**Nachmessen Schritt 15** (13.11.2026, Worktree `refactor-schritt-15`, Stand `origin/dev` nach
Schritt 14, `baae295`, Version 0.20.21)

*Nachtrag 14.11.2026:* Die Zahlen gelten für den Stand vor #81; was #81 daran ändert (39 Adressen,
30 Ladefunktionen, 25 «nur der Wächter wechselt», Fälle L und M), steht in E.7, Abschnitt 5.

Am Code gelesen und gezählt, **nichts ausgeführt** (kein Test, kein Lint, kein `svelte-check`, kein
Build, keine Datenbank). Pfade unter `src/routes/`, wenn nichts anderes steht; «Zeile» meint die
Datei im genannten Stand.

- **Ganz gelesen [G]:** alle 27 Ladefunktionen (`+layout.ts`, `+page.ts`, die 24 weiteren
  `+page.ts`, `verwaltung/+layout.ts`); `+layout.svelte`, `+page.svelte`, `+error.svelte`,
  `login/+page.svelte`, `login/mail/+page.svelte`, `willkommen/+page.svelte`,
  `clubmeisterschaft/+page.svelte`, `clubmeisterschaft/[id]/kontakt/+page.svelte`,
  `verwaltung/+layout.svelte`, `verwaltung/turniere/+page.svelte`, `anlaesse/+page.svelte`,
  `mitglieder/+page.svelte`, `verlauf/+page.svelte`, `bestaetigen/+page.svelte`,
  `rollen/+page.svelte`; unter `src/lib/`: `abruf.ts`, `login/sitzung.ts`, `login/sitzung.test.ts`,
  `login/mailanfrage.ts`, `verwaltung/umleiten.ts`, `verwaltung/umleiten.test.ts`,
  `verwaltung/zugang-api.ts`, `verwaltung/AnsichtWahl.svelte`, `hilfe/geraet.ts`,
  `ui/fehlerseite.ts`, `ui/Zurueck.svelte`, `push/PushHinweis.svelte`,
  `server/admin/rechte.ts`, `server/sitzung/schnittstellen.ts`; `src/hooks.client.ts`;
  `tests/e2e/startseite.test.ts` (bis Zeile 60), `tests/e2e/hilfen/geraet.ts`,
  `tests/e2e/hilfen/login.ts`; `CLAUDE.md`.
- **Das Skript ganz, das Markup per Textsuche [G für das Skript]:** `profil/+page.svelte`,
  `profil/email/+page.svelte`, `clubmeisterschaft/[id]/+page.svelte`,
  `clubmeisterschaft/[id]/doppel/[kid]/+page.svelte`, `anlass/[id]/+page.svelte`,
  `src/lib/push/Benachrichtigungen.svelte`.
- **In Auszügen [G für die Stelle]:** die 32 Aufrufe von `leiteUm` und die fünf Stellen «Nachladen
  ohne `leiteUm`» in der Verwaltung; `src/lib/ui/navigation.ts` (Zeilen 28 bis 110);
  `src/lib/profil/angaben.ts` (`lade`, `ladeKontakt`); die E2E-Stellen, die ein Ziel einer
  Umleitung prüfen (`login`, `hilfe`, `bewegung`, `verwaltung`, `turnier`, `navigation`, `profil`,
  `passkey`, `mitteilungen`, `cm-gespraech`); `playwright.config.ts`, `vitest.config.ts`,
  `scripts/pruefungen/testmuster.ts`; aus `node_modules/@sveltejs/kit` (Version 3.1.1, im
  Hauptordner, der Worktree hat kein eigenes) `src/runtime/client/client.js`, Zeilen 1395 bis 1529
  und die Stellen mit `load_cache`.
- **Nur per Textsuche [E]:** alle übrigen `.svelte`-Dateien unter `src/routes/` und `src/lib/`
  (gesucht: `goto(`, `redirect(`, `location.`, `leiteUm`, `abgemeldet`, `kein-admin`,
  `unbestaetigt`, `/login`, `/willkommen`, `invalidate`, `refreshAll`, `onMount`, `$effect`,
  `hatSitzung`, `weiter=`, `fetch(`, `holen(`); `tests/e2e/` (gesucht: `toHaveURL`, `waitForURL`,
  `clearCookies`, `beendeAlleSitzungen`, `localStorage`).
- **SvelteKit-Doku nachgeschlagen** (13.11.2026, lesend über `svelte.dev/llms.txt`, Seiten
  `kit/load`, `kit/page-options`, `kit/$app-navigation`, `kit/link-options`, `kit/@sveltejs-kit`):
  `redirect` wirft und darf darum in einer Hilfsfunktion stehen, nicht in einem `try`; Layout- und
  Seiten-Ladefunktionen laufen gleichzeitig; eine Ladefunktion läuft neu, wenn sich ein gelesener
  Teil von `url` oder `params` ändert, wenn `invalidate` eine mit ihrem `fetch` geholte Adresse
  trifft oder nach `refreshAll`; `url.searchParams.get(…)` wird je Parameter verfolgt; ein neuer
  Lauf erzeugt den Baustein nicht neu; mit `ssr = false` laufen universelle Ladefunktionen immer
  im Browser; `data-sveltekit-preload-data="tap"` ruft `load` schon bei `touchstart` oder
  `mousedown`; `isRedirect` gibt es als Prüfhilfe.

#### Ergebnis in Kürze

- **Die Tabelle der Einstiege steht** (unten, 36 Adressen). Die «fünf Wächter» aus 1c stimmen
  in der Sache; dazu kommen **acht benannte Fälle, die 1c und die Hinweise nicht nennen** (Liste
  «Benannte Fälle»).
- **17 statt 14 Stellen** leiten in der Mitglieder-App nach einer Aktion von Hand zum Login:
  CM-Seite neun, Doppel-Seite fünf, dazu Anlass, Benachrichtigungen im Profil und das Gespräch
  mit der Turnierleitung. Das Gespräch nimmt `window.location.assign('/login')` und lädt damit die
  App ganz neu; alle anderen nehmen `goto`.
- **Die Abweichung «Rollen» ist im Browser nicht zu sehen.** Layout und Seite laden gleichzeitig,
  SvelteKit wertet aber vom Layout her aus: Die erste Umleitung von aussen gewinnt [G:
  `client.js`, Schleife ab Zeile 1510]. Das Layout der Verwaltung läuft bei jedem Wechsel der
  Adresse neu (es liest `url.pathname`). Die dreizeiligen Blöcke der zwölf Seiten greifen darum
  nur, wenn sich zwischen zwei gleichzeitigen Abfragen etwas ändert. Folge für das Netz: **E2E
  kann diese zwölf Blöcke nicht festhalten**, nur ein Einheitstest der Ladefunktion.
- **Kein Test hält heute fest**, wohin `/profil`, `/profil/email`, die fünf CM-Seiten,
  `/anlass/[id]` und irgendeine Seite der Verwaltung ohne Sitzung führen, und keiner läuft ein
  401 nach einer Aktion ab. Gedeckt sind nur `/`, `/willkommen`, `/verwaltung` ohne Rolle und
  «unbestätigt» ab `/verwaltung`.
- **Vorab-Test: beide Wege gehen ohne neue Ausnahme, empfohlen ist die Verbindung.** Eine
  E2E-Tabelle über 31 Adressen ohne Anmeldung (kein Konto, kein Mail-Code: die wartende
  Mail-Anfrage wird in den Gerätespeicher geschrieben), acht E2E-Fälle «401 nach einer Aktion»
  und Einheitstests der Ladefunktionen der Verwaltung mit gestelltem `fetch` unter `tests/`
  (B-39 bleibt unberührt, unter `src/routes/` entsteht keine Testdatei).
- **Wächter:** eine reine Tabelle «Antwort, Fall, Lage → Ziel» in `src/lib/login/waechter.ts`
  mit zwei dünnen Hüllen (Ladefunktion: `redirect`; nach einer Aktion: `goto`), ein typisierter
  `ladeSitzung` in `src/lib/login/sitzung.ts`. `leiteUm` behält Namen und Signatur.
- **Schnitt: zwei Läufe, ein Merge.** Lauf 1 (Vorab-Tests, Sitzung, Wächter, alle bestehenden
  Ladefunktionen, Aktionen) ändert für die Nutzerin nichts. Lauf 2 (die vier Listen der
  Verwaltung nach `+page.ts`) hat zwei kleine sichtbare Folgen, die sich nicht vermeiden lassen:
  **Frage F-28**. Dazu **F-29** (zwei Bausteine laden beim Einhängen selbst). Keine der beiden
  Fragen hält Lauf 1 auf.
- **Die Lint-Regel «kein `fetch` ausserhalb des Bausteins» wird auch nach Schritt 15 nicht ohne
  Ausnahme grün** (weiter 98 Meldungen). Möglich wird eine engere Regel: kein Aufruf `fetch(…)`.

#### Einstiege: Seite × Auslöser → Ziel [G]

Alle Umleitungen der Ladefunktionen sind `redirect(307, …)`. «Mail-Code wartet» heisst: Im
Gerätespeicher steht eine höchstens 15 Minuten alte Mail-Anfrage (`leseMailanfrage`). Bis zur
Umleitung zeigt eine Ladefunktion nichts von der Zielseite: Beim ersten Aufruf steht die leere
Schale, bei einem Wechsel in der App bleibt die alte Seite stehen. Kein Ziel trägt einen Parameter
(kein `?weiter=`); nach dem Login geht es immer nach `/`.

*Mitglieder-App und offene Seiten*

| Nr. | Adresse | Stelle, Auslöser | Ohne Sitzung | Ohne Sitzung, Mail-Code wartet | Sonst in der Ladefunktion | Test heute |
|----:|---------|------------------|--------------|--------------------------------|---------------------------|------------|
| 1 | `/` | `+page.ts:12–19`, 401 von `/api/sitzung` | Handy im Browser: `/willkommen`; vom Symbol und am PC: `/login` | `/login/mail`, auch auf dem Handy im Browser | nicht `ok`: Fehlerseite 503 «Die Anmeldung lässt sich gerade nicht prüfen.»; Netz weg: Fehlerseite 500 mit dem allgemeinen Satz | E2E `hilfe:121`, `:141`, `startseite:12`, `login:86`, `:200`, `:251`, `verwaltung` «SI-07» |
| 2 | `/profil` | `profil/+page.ts:10–15`, 401 von `/api/sitzung` | `/login`, auch auf dem Handy im Browser | `/login/mail` | wie 1 | keiner |
| 3 | `/profil/email` | `profil/email/+page.ts:9–12`, 401 von `/api/sitzung` | `/login` | **`/login`** | wie 1; läuft eine «Ansicht als …»: `/profil`; Angaben nicht ladbar: 503 | keiner |
| 4 | `/anlass/[id]` | `anlass/[id]/+page.ts:11–14`, `abgemeldet` von `holeAnlass` | `/login` | `/login/mail` | Störung: 503. **Ist die Nummer keine Zahl, fragt die Seite nichts ab und zeigt auch ohne Sitzung «Diesen Anlass gibt es nicht»** | keiner |
| 5 | `/clubmeisterschaft` | `clubmeisterschaft/+page.ts:13–16`, `abgemeldet` von `holeCmTurniere` | `/login` | `/login/mail` | läuft genau eine CM: ihre Seite; Störung: 503 | keiner ohne Sitzung |
| 6 | `/clubmeisterschaft/[id]` | `[id]/+page.ts:16–19`, `abgemeldet` von `holeCmAnsicht` | `/login` | `/login/mail` | Nummer keine Zahl (vor jeder Abfrage) oder `nicht-gefunden`: `/`, von dort weiter wie Zeile 1; Störung: 503 | keiner ohne Sitzung |
| 7 | `…/[id]/doppel/[kid]` | `doppel/[kid]/+page.ts:17–20`, wie 6 | `/login` | `/login/mail` | wie 6; keine wählbare Kategorie: CM-Seite | keiner ohne Sitzung |
| 8 | `…/[id]/kategorie/[kid]` | `kategorie/[kid]/+page.ts:16–19`, wie 6 | `/login` | `/login/mail` | wie 7 | keiner ohne Sitzung |
| 9 | `…/[id]/kontakt` | `kontakt/+page.ts:14–17`, `abgemeldet` von `holeGespraech` | `/login` | `/login/mail` | wie 6 | keiner ohne Sitzung |
| 10 | `/hilfe`, `/datenschutz` | `hatSitzung` in der Ladefunktion | Seite bleibt, ohne Reiter, Zurück-Link «‹ Anmelden» nach `/login` (`Zurueck.svelte`, `elternVon`) | gleich | `/hilfe`: Kontakt nicht ladbar: Verweis auf den Brief | E2E `navigation:136`, `hilfe:50` |
| 11 | `/willkommen` | `willkommen/+page.ts:13`, das Gerät, nicht die Sitzung | am PC und vom Symbol: `/login`; Handy im Browser: bleibt (auch mit Sitzung) | gleich | Link «Ohne Startbildschirm weiter» nach `/login` | E2E `hilfe:141`, `:163`, `bewegung:54` |
| 12 | `/login`, `/login/mail` | keine Ladefunktion | bleibt | `/login/mail` beginnt beim Feld «Code aus der Mail» | mit Sitzung bleibt die Seite ebenfalls (kein Wächter zurück); nach Erfolg `goto('/')` | E2E `login`, `passkey` |
| 13 | Fehlerseite | `+error.svelte` | Link «Zur Startseite» bzw. unter `/verwaltung` «Zur Verwaltung» (`fehlerseite.ts`) | gleich | | Einheitstest `fehlerseite.test.ts` |

*Verwaltung.* Das Layout prüft jede Adresse unter `/verwaltung`, bei jedem Wechsel der Adresse
neu. Es schaut nie auf den Mail-Code.

| Nr. | Adresse | Stelle, Auslöser | Ziel | Test heute |
|----:|---------|------------------|------|------------|
| 14 | alle 22 Adressen unter `/verwaltung` | `verwaltung/+layout.ts:15`, `abgemeldet` von `ladeZugang` | `/login`, auch wenn ein Mail-Code wartet | keiner |
| 15 | dieselben | `:16`, `kein-admin` | `/` | E2E `verwaltung:187` (nur `/verwaltung`) |
| 16 | dieselben | `:17`, sonst nicht `ok` | Fehlerseite 503 «Die Verwaltung lässt sich gerade nicht öffnen.» | E2E `verwaltung:388` (gestellte 503) |
| 17 | alle ausser `bestaetigen` | `:20`, `bestaetigt` ist falsch | `/verwaltung/bestaetigen` | E2E ab `/verwaltung` (`verwaltung:59`, `briefe:69`, `einlesen:52`, `mitgliedschaft:54`), ab `/verwaltung/mitglieder` (`turnier:188`) |
| 18 | `/verwaltung/bestaetigen` | `:21`, schon bestätigt | Startziel der Rollen (`/verwaltung/mitglieder`, nur CM: `/verwaltung/turniere`) | Einheitstest `startziel` |
| 19 | Seite ausserhalb der lesbaren Bereiche | `:22–23`, `umleitung` | Startziel | E2E `turnier:193`, `:196`, `mitteilungen:366`, `verwaltung:614`; Einheitstest `umleitung` |
| 20 | `…/neu` ohne Schreibrecht | `:22–23`, `umleitung` | Liste des Bereichs | Einheitstest `umleitung` |
| 21 | `/verwaltung` | `verwaltung/+page.ts:8` | Startziel | E2E (jeder Einstieg in die Verwaltung) |
| 22 | elf Seiten mit `+page.ts`: `anlaesse/[id]:16–18`, `briefe:10–12`, `fairgate:11–13`, `mitglieder/[id]:10–12`, `mitglieder/[id]/auskunft:10–12`, `mitteilungen:10–12`, `turniere/[id]:10–12`, `…/kategorien/[kid]:48–50`, `…/kategorien/neu:9–11`, `…/nachrichten:9–11`, `…/nachrichten/[gid]:11–13` | der dreizeilige Block auf die eigene Abfrage | `abgemeldet`: `/login`; `kein-admin`: `/`; `unbestaetigt`: `/verwaltung/bestaetigen` | keiner (und im Browser hinter dem Layout nicht zu sehen) |
| 23 | `/verwaltung/rollen` | `rollen/+page.ts:11–13` | wie 22, aber **`kein-admin`: `/verwaltung`** | keiner |
| 24 | `turniere`, `anlaesse`, `mitglieder`, `verlauf` (keine `+page.ts`) | `leiteUm` nach dem ersten Laden im Baustein | wie 22; bis dahin steht die Seite mit Titel und leerer Liste | keiner |
| 25 | `turniere/neu`, `anlaesse/neu`, `mitglieder/neu`, `einlesen`, `bestaetigen` (keine `+page.ts`, kein erstes Laden) | nur das Layout | Zeilen 14 bis 20 | wie dort |
| 26 | Seiten mit eigener Umleitung ohne Bezug zum Zugang | `…/nachrichten/[gid]:14–15`: Gespräch gehört zu einem anderen Turnier oder fehlt | Posteingang des Turniers | E2E `cm-gespraech:412` |

*Nach einer Aktion (im Baustein)*

| Nr. | Wo | Auslöser | Ziel, Art |
|----:|----|----------|-----------|
| 27 | CM-Seite `clubmeisterschaft/[id]/+page.svelte`, neun Stellen: `:137` (`neuLaden`), `:164`, `:228`, `:269`, `:301`, `:347`, `:387`, `:418`, `:463` | `abgemeldet` | `goto('/login')`, ohne Blick auf den Mail-Code |
| 28 | Doppel-Seite `doppel/[kid]/+page.svelte`, fünf Stellen: `:77` (Suche), `:131` (`neuLaden`), `:154`, `:203`, `:247` | `abgemeldet` | wie 27 |
| 29 | Anlass `anlass/[id]/+page.svelte:68` | `abgemeldet` | wie 27 |
| 30 | Benachrichtigungen im Profil `src/lib/push/Benachrichtigungen.svelte:79` (Thema schalten) | `abgemeldet` | wie 27 |
| 31 | Gespräch `clubmeisterschaft/[id]/kontakt/+page.svelte:67` (Senden) | `abgemeldet` | **`window.location.assign('/login')`: die App lädt ganz neu** |
| 32 | CM-Seite `:136`, Doppel-Seite `:130` | `nicht-gefunden` beim Nachladen | `goto('/')` (kein Zugangsfall, bleibt in der Seite) |
| 33 | Verwaltung: `leiteUm` (`src/lib/verwaltung/umleiten.ts`), 32 Aufrufe in 23 Dateien (17 Seiten, sechs Bausteine unter `src/lib/verwaltung/`); vier davon sind das erste Laden aus Zeile 24 | `abgemeldet`, `kein-admin`, `unbestaetigt` | `goto` nach `/login`, `/`, `/verwaltung/bestaetigen` |
| 34 | Band «Ansicht als …», `+layout.svelte:132` («Beenden») | `abgemeldet` | `refreshAll()`: Die Ladefunktion der Seite leitet dann selbst um |
| 35 | Profil: Angaben, Rufname, Klassierung, Passkey einrichten und entfernen; E-Mail ändern; Passkey- und Push-Hinweis der Startseite; «gelesen» im Gespräch; Push ein und aus | 401 | **keine Umleitung:** Meldung «Das hat nicht geklappt …» bzw. nichts (E.1, Fall 5) |
| 36 | Verwaltung, Nachladen nach einer Aktion ohne `leiteUm`: `mitteilungen/+page.svelte:14`, `anlaesse/[id]/+page.svelte:40`, `:61`, `turniere/[id]/+page.svelte:60`, `…/kategorien/[kid]/+page.svelte:48` | alles ausser `ok` | **nichts:** Der alte Stand bleibt stehen |
| 37 | Profil `profil/+page.svelte:352` | Abmelden gelungen | `goto('/login')` (kein Wächter, aber eine von Hand geschriebene Umleitung zum Login) |

Gezählt [G]: 51 Zeilen unter `src/routes/` und `src/lib/` (ohne Server, Tests und die
Abruf-Module des Logins) nennen `/login`; B-21 zählte 47.

#### Gruppen und Abweichungen

1. **Startseite** (Zeile 1): drei Ziele. Der Mail-Code geht der Einstiegsseite vor.
2. **Mitglieder-Seiten mit Mail-Code** (Zeilen 2, 4 bis 9): Mail-Code wartet → `/login/mail`,
   sonst `/login`. Innerhalb der Gruppe zwei Auslöser: `/profil` fragt `/api/sitzung`, die sechs
   anderen lesen `abgemeldet` aus ihrer eigenen Abfrage und fragen die Sitzung nie. Keine führt zur
   Einstiegsseite: Auf dem Handy im Browser führt nur `/` nach `/willkommen`.
3. **`/profil/email`** (Zeile 3): nur `/login`.
4. **Verwaltung** (Zeilen 14 bis 22, 24, 33): `/login` ohne Mail-Code, `kein-admin` → `/`,
   `unbestaetigt` → `/verwaltung/bestaetigen`.
5. **`/verwaltung/rollen`** (Zeile 23): `kein-admin` → `/verwaltung`.
6. **Aktionen** (Zeilen 27 bis 31): immer `/login`, ohne Mail-Code.

**Benannte Fälle für den Wächter (E-44).** A bis C nennt der Plan schon, D bis K sind neu:

- **A** `/profil/email` ohne Mail-Code (Zeile 3).
- **B** `rollen`: `kein-admin` → `/verwaltung` (Zeile 23). Im Browser endet der Weg trotzdem am
  selben Ort wie überall: Das Layout leitet zuerst um; und käme die Seite doch zum Zug, führte
  `/verwaltung` über das Layout weiter nach `/` oder zum Startziel.
- **C** Aktionen ohne Mail-Code (Zeilen 27 bis 30).
- **D** Das Gespräch lädt die App beim Umleiten ganz neu (Zeile 31). Mit `goto` bliebe der Zustand
  der App im Speicher (gemerkte Klappen, Rollpositionen, Vorgeladenes). Bleibt als eigene Art des
  Falls «nach einer Aktion».
- **E** Die Verwaltung schaut nie auf den Mail-Code (Zeile 14); das ist dieselbe Abweichung wie A,
  nur steht sie in 1c nicht als solche.
- **F** Nur `/` kennt die Einstiegsseite; `/profil` und die Datenseiten führen auch auf dem Handy
  im Browser nach `/login` (Zeilen 2, 4 bis 9).
- **G** Netz weg beim Prüfen der Sitzung: `+page.ts`, `profil/+page.ts` und `profil/email/+page.ts`
  fangen den Wurf von `fetch` nicht; es erscheint die Fehlerseite mit Status 500 und dem
  allgemeinen Satz «Etwas ist schiefgelaufen …». Antwortet der Server mit einer Störung, steht
  dort 503 und «Die Anmeldung lässt sich gerade nicht prüfen.». `+layout.ts` fängt beides und
  zeigt nur kein Band (E.1 nannte den Wurf schon). Der Abruf-Baustein wirft nie: Ohne Vorkehrung
  würde aus dem ersten Fall der zweite.
- **H** `/anlass/<keine Zahl>` zeigt ohne Sitzung die Seite «gibt es nicht» samt Reitern; eine
  CM-Adresse mit ungültiger Nummer führt vor jeder Abfrage nach `/` (Zeilen 4 und 6).
- **I** Aktionen, die bei 401 nicht umleiten (Zeilen 35 und 36). Sie sind kein Fall des
  Wächters, stehen aber hier, damit der Schritt sie nicht «mitrepariert».
- **J** «Ansicht beenden» leitet nicht selbst um (Zeile 34).
- **K** `/willkommen` leitet nach dem Gerät um, nicht nach der Sitzung (Zeile 11); die Stelle
  bleibt in ihrer Ladefunktion und ist die einzige erlaubte Umleitung zum Login ausserhalb des
  Wächters. Das Abmelden (Zeile 37) nimmt die Aktions-Hülle des Wächters.

#### Wo geladen wird [G]

- **36 Adressen**, 35 mit Baustein und `/verwaltung` nur mit Ladefunktion. **27 Ladefunktionen**
  (2 Layouts, 25 Seiten). **Elf Seiten haben keine `+page.ts`:** `login`, `login/mail` und in der
  Verwaltung `turniere`, `anlaesse`, `mitglieder`, `verlauf`, `turniere/neu`, `anlaesse/neu`,
  `mitglieder/neu`, `einlesen`, `bestaetigen`.
- **Erstes Laden im Baustein einer Seite: vier**, wie die Hinweise sagen: `turniere` und
  `anlaesse` (`$effect` mit `lade()`), `mitglieder` (`$effect` mit 200 ms Wartezeit, auch für
  Suche und Filter), `verlauf` (`$effect` auf `?mitglied=` aus der Adresse). Die fünf anderen
  Seiten ohne `+page.ts` laden nichts.
- **Erstes Laden in einem Baustein unter `src/lib/`: zwei, in keinem Dokument genannt:**
  `push/Benachrichtigungen.svelte:36` (`onMount`, im Profil; zeigt bis dahin «Wird geladen …») und
  `push/PushHinweis.svelte:31` (`onMount`, auf der Startseite, nur auf dem Handy mit Push-fähigem
  Browser). Beide rufen `holeBenachrichtigungen`; bei 401 zeigen sie die Störung bzw. nichts.
  Der Wortlaut von C-5 («im Baustein nur erneutes Laden nach Eingabe oder Aktion») deckt sie
  nicht: Frage F-29.
- **`fetch` direkt in einer Ladefunktion: fünf Stellen**, sonst keine [G: Textsuche nach `fetch(`
  und `holen(`]: `/api/sitzung` in `+layout.ts:15`, `+page.ts:12`, `profil/+page.ts:10`,
  `profil/email/+page.ts:9`; `/api/kontakt` in `hilfe/+page.ts:13` (`holeKontakt`). Alle anderen
  reichen das `fetch` der Ladefunktion an ein Abruf-Modul; `clubmeisterschaft/[id]/+page.ts:15`
  ruft `holeCmTurniere()` bewusst ohne (E.1).
- **Erneutes Laden nach Eingabe oder Aktion (bleibt im Baustein):** Suche und Filter der
  Mitgliederliste; `neuLaden` der CM-Seite, der Doppel-Seite und der Seiten der Verwaltung
  (Zeile 36); Passkey-Liste und Angaben im Profil; Partnersuche und Spielersuche. `verlauf` hat
  **kein** erneutes Laden im Baustein: Sein Filter ist die Adresse, also ein Seitenwechsel; die
  ganze Abfrage zieht in die `+page.ts` (Abweichung vom Hinweis «`mitglieder` und `verlauf` laden
  nach Suche und Filter erneut; das bleibt im Baustein»).
- **Umfang des Umbaus:**

  | Art | Dateien |
  |-----|--------:|
  | Ladefunktion, nur der Wächter wechselt (9 Mitglieder-App, Layout und 12 Seiten der Verwaltung) | 22 |
  | Ladefunktion, nur der Abruf wechselt (`+layout.ts` Sitzung, `hilfe/+page.ts` Kontakt) | 2 |
  | Ladefunktion unverändert (`datenschutz`, `willkommen`, `verwaltung/+page.ts`) | 3 |
  | Baustein, nur der Aufruf wechselt (CM, Doppel, Anlass, Gespräch, Benachrichtigungen, Abmelden im Profil) | 6 |
  | Laden nach `+page.ts` verschieben (vier neue `+page.ts`, vier `+page.svelte`) | 8 |
  | Neu oder geändert unter `src/lib/` (`login/waechter.ts` mit Test, `login/sitzung.ts` mit Test, `verwaltung/umleiten.ts`) | 5 |
  | Vorab-Tests (zwei neue Dateien unter `tests/`) | 2 |

  Zusammen rund 45 Dateien ohne dieses Dokument. Die 32 Aufrufe von `leiteUm` bleiben, wenn die
  Funktion ihren Namen behält.

#### Das Netz [G für die genannten Stellen, E für «sonst keiner»]

- **E2E, die ein Ziel ohne Sitzung festhalten:** nur für `/` (`hilfe:121` je Gerät, `hilfe:141`,
  `startseite:12`, `login:86` nach dem Abmelden, `login:200` mit wartendem Mail-Code, `login:251`
  und `verwaltung` «SI-07» nach beendeten Sitzungen, beide laden `/` neu) und `/willkommen`
  (`hilfe:141`, `bewegung:54`). Für die Verwaltung: ohne Rolle ab `/verwaltung`
  (`verwaltung:187`), unbestätigt ab `/verwaltung` und einmal ab `/verwaltung/mitglieder`, falscher
  Bereich an vier Stellen. Die Geräte unterscheiden die Tests über `startetVomSymbol` und den
  Projektnamen.
- **Einheitstests:** `login/sitzung.test.ts` (vier Fälle zu `hatSitzung`), `mailanfrage.test.ts`,
  `hilfe/geraet.test.ts`, `ui/navigation.test.ts`, `ui/fehlerseite.test.ts`,
  `verwaltung/umleiten.test.ts` (`umleitung`, `startziel`, `rechte`, `bereichVon`, `nurAnsehen`).
  **`leiteUm` ruft kein Test auf.** Unter `src/routes/` gibt es ausserhalb von `api/` keine
  Testdatei; keine Ladefunktion wird von einem Test gerufen.
- **Ohne Test sind damit** aus der Tabelle: Zeilen 2 bis 9 (ohne Sitzung), 14 (jede Seite der
  Verwaltung ohne Sitzung), 15 und 17 für alle Seiten ausser dem Einstieg, 22 bis 24 ganz, und
  alle Aktionen 27 bis 37. Dass die Sitzung bei jedem Seitenwechsel geprüft wird (B-21), hält nur
  das Neuladen fest, nicht der Wechsel in der App.
- **Was E2E nicht sehen kann:** die Blöcke der Zeilen 22 und 23 (das Layout gewinnt) und den
  Unterschied zwischen `goto` und `redirect`. Den Unterschied zwischen `goto` und vollem Neuladen
  (Fall D) sieht ein Test nur über eine Marke am `window`, die das Neuladen löscht.

#### Vorab-Test (erster Commit von Lauf 1, Charakterisierung)

**Empfehlung: Verbindung aus drei Teilen.** Die Einheitstests der Wächter-Funktion allein können
nicht «vorab» sein, weil es die Funktion noch nicht gibt; die E2E-Tabelle allein sieht die Blöcke
der Verwaltungsseiten nicht.

- **Teil 1, E2E-Tabelle** (neu `tests/e2e/waechter.test.ts`, alle drei Geräte, im Browser-Modus
  ohne `startetVomSymbol`, kein Konto, keine Datenbank-Hilfe, kein Mail-Code). Der Server prüft
  die Sitzung vor der Nummer (`mitSitzung`), darum genügt eine beliebige Nummer.

  | Zustand | Adressen | Erwartetes Ziel |
  |---------|----------|-----------------|
  | ohne Sitzung | `/` | PC `/login`, Handy `/willkommen` |
  | ohne Sitzung | `/profil`, `/profil/email`, `/anlass/1`, `/clubmeisterschaft`, `/clubmeisterschaft/1`, `…/1/kategorie/1`, `…/1/doppel/1`, `…/1/kontakt` | `/login` |
  | ohne Sitzung | die 22 Adressen der Verwaltung (Nummern beliebig) | `/login` |
  | ohne Sitzung, Mail-Anfrage im Gerätespeicher (wie `login.test.ts:239`, per `addInitScript`) | `/` und die acht Mitglieder-Seiten ausser `/profil/email` | `/login/mail` |
  | dasselbe | `/profil/email` und die 22 Adressen der Verwaltung | `/login` |
  | ohne Sitzung | `/anlass/abc` | bleibt, Text «gibt es nicht» (Fall H) |
  | ohne Sitzung | `/clubmeisterschaft/abc` | PC `/login`, Handy `/willkommen` (Fall H) |

- **Teil 2, E2E mit Konto** (dieselbe Datei; Login mit Brief-Code aus den Hilfen, kein
  Mail-Code):

  | Zustand | Handlung | Erwartung |
  |---------|----------|-----------|
  | Mitglied ohne Rolle | die 22 Adressen der Verwaltung | `/` mit «Hoi …» |
  | Admin, nicht bestätigt | die 21 Adressen ausser `bestaetigen` | `/verwaltung/bestaetigen` |
  | Mitglied, Cookies gelöscht | Reiter «Profil» antippen | `/login`; mit Mail-Anfrage `/login/mail` (Prüfung bei jedem Seitenwechsel, B-21) |
  | Mitglied auf der CM-Seite, Cookies gelöscht | «Anmelden» | `/login`, auch mit Mail-Anfrage (Fall C) |
  | Mitglied auf der Doppel-Seite, Cookies gelöscht | Partner suchen | `/login` |
  | Mitglied auf dem Anlass, Cookies gelöscht | Antwort senden | `/login` |
  | Mitglied im Gespräch, Cookies gelöscht | Nachricht senden | `/login`, und die Marke am `window` ist weg (Fall D) |
  | Mitglied im Profil, Cookies gelöscht | ein Thema der Benachrichtigungen schalten | `/login` |
  | Mitglied im Profil, Cookies gelöscht | Telefon speichern | bleibt auf `/profil`, Meldung der Störung (Fall I) |
  | Admin auf `bestaetigen`, Cookies gelöscht | «Code schicken» | `/login` (`leiteUm`, ohne dass ein Code verschickt wird) |

- **Teil 3, Einheitstests der Ladefunktionen der Verwaltung** (neu z. B.
  `tests/oberflaeche/ladefunktionen.test.ts`, Projekt `einheit`): je `+page.ts` der Zeilen 22 und
  23 mit gestelltem `fetch` die Antworten 401, 403 `kein-admin`, 403 `unbestaetigt`, 404 und 503;
  erwartet wird der Wurf (`isRedirect` und `location`, bzw. der Status des Fehlers). Dazu
  `verwaltung/+layout.ts` mit gestelltem `url`, `depends` und `parent` für die Zeilen 14 bis 20.
  Rund 70 Fälle, als Tabelle. Diese Ladefunktionen brauchen keinen Browser (`window`, `navigator`
  und der Gerätespeicher kommen dort nicht vor); die der Mitglieder-App brauchen ihn, darum deckt
  sie Teil 1. Der Test importiert die Ladefunktion, er liest keinen Quelltext. Er liegt unter
  `tests/`, **B-39 ist nicht berührt** und es braucht keine neue Abhängigkeit [V: nicht
  ausgeführt; `./$types` ist ein reiner Typ-Import, `umleiten.test.ts` zeigt, dass der
  Einheitslauf `$app/…` auflöst].
- **Einmal rot:** je Teil eine Probe aus Sicherungskopien, z. B. in `profil/email/+page.ts` den
  Mail-Code beachten (Teil 1 rot), in `kontakt/+page.svelte` `goto` statt `assign` (Teil 2 rot), in
  `rollen/+page.ts` `/` statt `/verwaltung` (Teil 3 rot; Teil 1 und 2 bleiben dabei grün, das ist
  der Beleg für «E2E sieht es nicht»).
- **Kosten [V, nicht gemessen]:** Teil 1 rund 65 Aufrufe je Gerät, Teil 2 rund 45 Aufrufe und
  zehn Logins je Gerät; jeder Aufruf ist ein Kaltstart der App. Geschätzt ein bis drei Minuten
  Arbeitszeit der Läufer über alle drei Geräte, bei 3,4 bis 5,3 Minuten heute. Als mehrere Tests
  je Zustand schneiden und `test.setTimeout(90_000)` setzen (Falle «Zeitgrenze WebKit-CI»). Ist
  das zu teuer, laufen die zwei Tabellen der Verwaltung aus Teil 2 nur auf dem PC: Ihr Ziel hängt
  nicht am Gerät. Das Budget der Mail-Codes je IP ist nicht berührt.
- **Für Lauf 2 dazu (vor dem Verschieben, auf dem alten Stand grün):** je Liste ein E2E-Fall mit
  gestellter 503 auf die Listen-Abfrage: Der Seitenkopf bleibt, die Meldung der Störung steht in
  der Seite, keine Fehlerseite. Für `mitglieder`: Beim Öffnen geht genau eine Abfrage an
  `/api/admin/mitglieder` (zählen wie `navigation.test.ts:312`).
- **Nachtrag zur Prüfliste (b):** `tests/e2e/waechter.test.ts` ist nach dem Schritt die Stelle, an
  der E2E am Ziel einer Umleitung hängt. `bewegung.test.ts:84` mit der Verzögerung in `:88`
  stimmt weiter (Zeilen geprüft); `wartetAufVorladen` steht in `hilfen/seite.ts:71`,
  `wartetAufMitgliederliste` in `:102`. Der zweite hängt am Status «N Mitglied(er)» und damit an
  der Mitgliederliste, die Lauf 2 umbaut.

#### Vorschlag für Sitzung und Wächter [V: Entwurf in Worten, nicht getippt]

- **`src/lib/login/sitzung.ts`:** `ladeSitzung(holen)` auf `rufeAb`, Vertrag mit dem Wort
  `abgemeldet` und Körper «nachsichtig» (401 gilt nach dem Status, wie heute). Ergebnis: `ok` mit
  den sechs Feldern von `getSitzung`, `abgemeldet`, `stoerung`. `hatSitzung` bleibt als
  `ladeSitzung(…).art === 'ok'`, seine vier Tests bleiben. Die vier Ladefunktionen reichen ihr
  `fetch` hinein: Damit bleibt `/api/sitzung` eine Abhängigkeit der Ladefunktion wie heute, und
  die Anfrage bleibt ein `GET` ohne Kopfzeile.
  - *Fall G genau nachbilden:* `ladeSitzung` merkt sich, ob `holen` geworfen hat, und gibt den Wurf
    bei den drei Seiten weiter (im Layout nicht). Das sind wenige Zeilen in dieser einen Datei und
    ein Fall im Test. Ohne das zeigte «Netz weg» den Satz der Server-Störung statt des allgemeinen:
    eine sichtbare Änderung, die E-44 nicht deckt.
  - *Keine neue Abfrage:* Die sechs Datenseiten und die Verwaltung fragen `/api/sitzung` heute
    nicht und sollen es auch danach nicht (sonst eine Anfrage mehr je Seitenwechsel, und
    `navigation.test.ts` «lädt nicht neu» zählt Anfragen).
- **`src/lib/login/waechter.ts`:** der Kern ist eine reine Funktion ohne Browser, etwa
  `zielOhneZugang(art, fall, lage)`: `art` ist `abgemeldet`, `kein-admin` oder `unbestaetigt`;
  `fall` ist einer der benannten Fälle; `lage` nennt «Mail-Code wartet» und «Einstiegsseite
  zeigen». Sie gibt die Adresse zurück. Die Fälle als Wörter:

  | `fall` | `abgemeldet` | `kein-admin` | `unbestaetigt` | Wer |
  |--------|--------------|--------------|----------------|-----|
  | `start` | Mail-Code → `/login/mail`; Einstieg → `/willkommen`; sonst `/login` | | | `/` |
  | `mitglied` | Mail-Code → `/login/mail`; sonst `/login` | | | `/profil`, Anlass, fünf CM-Seiten |
  | `ohne-mailcode` | `/login` | | | `/profil/email`; jede Aktion der Mitglieder-App |
  | `verwaltung` | `/login` | `/` | `/verwaltung/bestaetigen` | Layout, elf Seiten, `leiteUm` |
  | `verwaltung-rollen` | `/login` | `/verwaltung` | `/verwaltung/bestaetigen` | `rollen/+page.ts` |

  Ein Einheitstest läuft die Tabelle ganz ab (15 Zellen mal Lage), vor der Funktion geschrieben.
- **Zwei Hüllen**, beide ohne eigene Entscheidung:
  - *für die Ladefunktion:* nimmt das Ergebnis eines Abrufs und den Fall, liest für `start` und
    `mitglied` Gerätespeicher und Gerät und ruft `redirect(307, ziel)`; sonst kehrt sie zurück.
    Als Zusicherung getippt, damit die Ladefunktion danach mit dem verengten Typ weiterarbeitet
    und der Typprüfer einen vergessenen Aufruf an den Folgezeilen merkt. Nie in einem `try`
    (Doku, `kit/load`).
  - *nach einer Aktion:* `goto` zum Ziel, Rückgabe «umgeleitet» wie `leiteUm`. Für das Gespräch
    eine Angabe «ganz neu laden» (Fall D). `leiteUm` in `umleiten.ts` bleibt mit Namen und
    Signatur und nimmt sein Ziel aus der Tabelle (Fall `verwaltung`); so bleiben seine 32
    Aufrufe ohne Diff. Die 17 Stellen der Mitglieder-App und das Abmelden rufen die Hülle statt
    `goto(resolve('/login'))`.
- **Zielbild «eine Funktion je App»:** Mit einer Tabelle und zwei Hüllen ist es eine Tabelle für
  beide Apps; `leiteUm` ist die Hülle der Verwaltung. Das erfüllt 6.1 Punkt 5 im Sinn, nicht im
  Wortlaut («eine für die Mitglieder-App und eine für die Verwaltung»).
- **`hilfe/+page.ts`:** `holeKontakt` entfällt, die Seite ruft `ladeKontakt(fetch)` aus
  `src/lib/profil/angaben.ts`. Beide geben bei jeder Störung `null`; sie unterscheiden sich nur,
  wenn `kontakt` kein Text ist (dann `null` statt des Werts), und das sendet der Server nie [G:
  `routes/api/kontakt/+server.ts`]. `hilfe.test.ts:51` (abgebrochene Anfrage) hält den Weg.
  Kleinigkeit ohne Entscheid: `ladeKontakt` liegt im Thema `profil`; ein Umzug wäre ein eigener
  Diff und gehört nicht hierher.
- **Lint-Regel zu `fetch`:**
  - Die in E.3 verworfene Regel (`no-restricted-globals` für `fetch`) meldet nach Schritt 15
    unverändert 98 Stellen [V: nicht ausgeführt; die fünf Stellen des Schritts meldet sie laut E.3
    gar nicht, weil dort `fetch` ein Parameter ist]. Ohne Ausnahme grün wird sie erst mit den vier
    Punkten aus E.3 (`holen` freiwillig in `rufeAb` und in rund 97 Signaturen, `signal` der
    Partnersuche, `push/geraet.ts`). Das ist ein eigener Umbau an zehn Abruf-Modulen ohne Bezug
    zum Wächter. **Empfehlung: nicht in Schritt 15;** als Hinweis an Schritt 20 oder verwerfen.
  - **Neu möglich** ist eine engere Regel, die den Satz der Übergangsregel trifft: kein Aufruf
    `fetch(…)` unter `src/routes/` (ohne `api/`) und `src/lib/` (ohne `server/`, ohne Tests), z. B.
    über `no-restricted-syntax`. Nach Lauf 1 gibt es dort keinen solchen Aufruf mehr [G: heute
    genau die fünf Stellen des Schritts]. Sie fängt nicht `window.fetch(…)` und kein
    weitergereichtes `fetch`. Aufnehmen als letzter Commit von Lauf 1, einmal rot belegt, oder im
    Bericht ausdrücklich verwerfen.
  - Für «keine Seite schreibt die Umleitung zum Login selbst» gibt es keine billige Regel:
    `/login` steht zu Recht in Links, im Zurück-Baustein und in `willkommen/+page.ts`. Der
    Reviewer prüft per Textsuche: Nach dem Schritt nennen `/login` voraussichtlich [V] nur noch `waechter.ts`,
    `ui/navigation.ts`, `willkommen/+page.ts`, `willkommen/+page.svelte` und
    `login/+page.svelte` (Link auf `/login/mail`).

#### Schnitt und Risiko

- **Ein Schritt, zwei Läufe mit je eigenem Review und committetem Zwischenstand, ein Merge, eine
  Version** (wie Schritt 13). Modell Opus für beide Läufe, Review wie bisher. Risiko «mittel»
  stimmt: viele Dateien, aber jede Änderung ist klein und gleichförmig; das Wagnis liegt in den
  Fällen, die kein Test sah, und die hält jetzt der Vorab-Test.
- **Lauf 1** (ändert für die Nutzerin nichts):

  | Nr. | Commit | Inhalt |
  |----:|--------|--------|
  | 0 | `test:` | Vorab-Tests Teil 1 bis 3, auf dem alten Stand grün, je Teil einmal rot belegt |
  | 1 | `refactor:` | `ladeSitzung` mit Test; `+layout.ts`, `+page.ts`, `profil/+page.ts`, `profil/email/+page.ts` darauf; `hilfe/+page.ts` auf `ladeKontakt` |
  | 2 | `refactor:` | `waechter.ts`: Tabelle und Hüllen, Einheitstest zuerst |
  | 3 | `refactor:` | die neun Ladefunktionen der Mitglieder-App auf dem Wächter |
  | 4 | `refactor:` | `verwaltung/+layout.ts` und die zwölf `+page.ts` auf dem Wächter; `leiteUm` nimmt die Tabelle |
  | 5 | `refactor:` | die 17 Stellen der Mitglieder-App und das Abmelden auf der Aktions-Hülle |
  | 6 | `refactor:` | engere Lint-Regel zu `fetch(…)`, oder im Bericht verworfen |

  Probe für den Reviewer: Der Diff der Vorab-Tests nach Commit 0 ist leer; der Diff unter
  `src/lib/server/` und `src/routes/api/` ist leer; in den fünf Bausteinen aus Commit 5 ändert
  sich je Stelle genau die eine Zeile mit `goto` bzw. `assign`.
- **Lauf 2** (nach der Antwort auf F-28): zuerst die zwei Vorab-Fälle je Liste, dann je Seite
  ein Commit: `turniere`, `anlaesse`, `verlauf`, zuletzt `mitglieder` (die einzige mit erneutem
  Laden im Baustein; der `$effect` darf beim Einhängen keine zweite Abfrage schicken). Die
  Störung bleibt eine Meldung in der Seite: Die Ladefunktion gibt dafür «nicht geladen» zurück und
  ruft kein `error(503)`. Lautet die Antwort auf F-28 «B», entfällt Lauf 2, und die Übergangsregel
  bekommt die vier Seiten als benannte Ausnahme.
- **Schnitt zu Schritt 16:** bleibt wie im Hinweis. An den neun Stellen der CM-Seite und den fünf
  der Doppel-Seite wechselt nur der Aufruf.
- **Wo sich etwas sichtbar ändern könnte:**

  | Nr. | Stelle | Vermeidbar? |
  |----:|--------|-------------|
  | S1 | Netz weg beim Prüfen der Sitzung: anderer Satz auf der Fehlerseite (Fall G) | ja, `ladeSitzung` gibt den Wurf weiter |
  | S2 | Gespräch: `goto` statt vollem Neuladen (Fall D) | ja, benannter Fall |
  | S3 | `profil/email`, `rollen`, Aktionen: Mail-Code bzw. Ziel vereinheitlicht (Fälle A bis C, E, F) | ja, Tabelle des Wächters; der Vorab-Test hält A, C, E und F im Browser, B im Einheitstest |
  | S4 | Eine zusätzliche Abfrage von `/api/sitzung` auf Seiten, die sie heute nicht stellen | ja, der Wächter fragt nicht selbst |
  | S5 | Reihenfolge der Abfragen im Profil (erst Sitzung, dann drei zugleich) und in der Verwaltung (`ladeZugang` und `parent()` zugleich) | ja, bleibt, wie sie steht; `bewegung.test.ts:84` hängt daran |
  | S6 | Vier Listen: Die Störung erschiene als Fehlerseite statt als Meldung in der Seite | ja, siehe Lauf 2 |
  | S7 | Vier Listen: Die Seite erscheint erst, wenn die Liste da ist. Heute stehen Titel und Tasten sofort, die Zeilen folgen | **nein**, das ist die Wirkung von `+page.ts` (F-28) |
  | S8 | Vier Listen: SvelteKit lädt die Liste schon beim Berühren eines Links vor. Wer einen Link zur Liste berührt, ihm nicht folgt, auf der Seite etwas ändert, das ohne `invalidate` nachlädt (Status oder Angaben eines Turniers, Angaben eines Anlasses), und dann doch zur Liste geht, sieht dort den Stand vor der Änderung, bis zum nächsten Wechsel. Heute lädt die Liste immer frisch | **nein**, ohne zusätzlichen Code (F-28). Denselben Rand haben heute schon alle Seiten mit `+page.ts` (Kommentar in `…/kategorien/[kid]/+page.svelte:67`) [G: `client.js`, `load_cache`] |
  | S9 | Vier Listen: Das kurze Aufblitzen der leeren Liste vor einer Umleitung fällt weg; `mitglieder` fragt sofort statt nach 200 ms | nein, aber nur im Rennen bzw. gar nicht zu sehen |
  | S10 | Benachrichtigungen: «Wird geladen …» fiele weg, wenn das Laden in die `+page.ts` des Profils zöge | ja, wenn die zwei Bausteine bleiben (F-29) |

#### Abweichungen von Zeile 15, den Hinweisen und Zeile 16

1. **17 Stellen, nicht 14,** leiten in der Mitglieder-App nach einer Aktion von Hand um (dazu
   Anlass, Benachrichtigungen, Gespräch); die Spalte «Dateien» nannte nur CM- und Doppel-Seite.
   Die Stelle im Gespräch gehört zum Wächter, als eigener Fall D. In Zeile 15 nachgetragen.
2. **Die fünf Wächter stimmen, sind aber nicht alle sichtbar:** Abweichung 5 (`rollen`) und die
   elf Blöcke der Verwaltungsseiten liegen hinter dem Layout. Der Hinweis «je mit einem Fall im
   Vorab-Test» geht für sie nur als Einheitstest der Ladefunktion.
3. **Gruppe 2 hat zwei Auslöser** (`/api/sitzung` in `/profil`, die eigene Abfrage in den sechs
   anderen); der Wächter nimmt darum das Ergebnis eines Abrufs entgegen und fragt nicht selbst.
4. **Acht benannte Fälle mehr** (D bis K), davon zwei mit sichtbarer Wirkung, wenn man sie
   übersieht (D, G).
5. **`verlauf` behält kein Laden im Baustein** (sein Filter ist die Adresse); der Hinweis nannte
   es neben `mitglieder`.
6. **Zwei Bausteine unter `src/lib/push/` laden beim Einhängen selbst;** Zeile, Hinweise und C-5
   kennen sie nicht (F-29).
7. **Der Umzug der vier Listen ist nicht ganz ohne sichtbare Wirkung** (S7, S8); die Zeile sagt
   «kein geändertes Verhalten» (F-28).
8. **`login/sitzung.ts` ist schon auf dem Baustein** (seit Schritt 13, Lauf 2); neu ist nur
   `ladeSitzung`. `leiteUm` braucht keinen neuen Aufruf an 32 Stellen.
9. **Der Hinweis zum Mail-Code [V] ist bestätigt:** Die wartende Anfrage lässt sich in den
   Gerätespeicher schreiben; kein Vorab-Fall fordert einen Code an.
10. **«Schritt 15 kann die Lint-Regel zu `fetch` mitnehmen»** (Ergebnis Schritt 13) stimmt nur für
    die engere Regel.
11. **Zeile 16 stimmt:** neun Stellen der CM-Seite [G, einzeln gelesen], Voraussetzung 15, die
    Doppel-Seite hat 425 Zeilen und fünf Stellen [G]. Die Kleinfrage zur Doppel-Seite bleibt, wie
    sie steht; aus diesem Nachmessen nur ein Beitrag: Ihre vier Handler und `neuLaden` gleichen
    denen der CM-Seite im Gerüst, die Suche mit Abbruch (`:64–82`) hat dort kein Gegenstück.
12. **1c, Tabelle «Netz»:** «SI-07 (Login und Verwaltung)» prüft in beiden Dateien das Neuladen
    von `/`, keine Seite der Verwaltung.

#### Fragen an den Projektleiter

**F-28** und **F-29** stehen in Abschnitt 9.1. Keine hält Lauf 1 auf; F-28 ist vor Lauf 2 zu
beantworten.

#### Bleibt (gut gelöst)

- `leiteUm` ist für die Verwaltung schon der eine Ort «nach einer Aktion»; alle 32 Stellen nutzen
  ihn gleich.
- `mailanfrage.ts` nimmt den Speicher als Parameter und fängt jeden Zugriff; `geraet.ts` nimmt
  Kennung und Fenster als Parameter. Der Wächter kann beides ohne Browser prüfen.
- Die Umleitungen der Ladefunktionen stehen vor jeder Anzeige; keine Seite zeigt Inhalt und
  leitet danach um, ausser den vier Listen.
- Das Layout der Verwaltung prüft bei jedem Wechsel und entscheidet Bereich und Schreibrecht an
  einer Stelle (`umleitung`, mit Einheitstest).
- Die Trennung «Ladefunktion reicht ihr `fetch` weiter, die CM-Seite bewusst nicht» ist
  kommentiert und durch einen E2E-Test gehalten.

#### Nicht geprüft, dünn belegt

- **Nichts ausgeführt.** Dass die Vorab-Fälle auf dem heutigen Stand grün sind, ist aus dem Code
  gelesen. Am dünnsten: ob die E2E-Tabelle ohne Konto auf jeder Adresse sauber endet (keine
  Konsolenfehler, kein hängender Übergang), und die Laufzeit [V].
- **Einheitstest der Ladefunktionen [V]:** dass sich `+page.ts` und `+layout.ts` der Verwaltung
  im Einheitslauf importieren lassen, ist aus den Importen geschlossen, nicht probiert.
- **Der Wächter ist ein Entwurf in Worten [V];** ob die Zusicherung im Typ an allen 22
  Ladefunktionen ohne Umstellen der Folgezeilen passt, zeigt Lauf 1.
- **Lint [V]:** Die Zahl 98 stammt aus E.3; die engere Regel ist nicht gelaufen.
- **Markup der grossen Seiten nur per Textsuche [E]:** `profil`, CM-Seite, Doppel-Seite, Anlass und
  alle Seiten der Verwaltung ausser den genannten; gesucht war nach Umleitungen und Links zum
  Login, nicht nach jedem Link.
- **«Im Browser nicht zu sehen» für `rollen` [G für den Ablauf in `client.js`, V für das Rennen]:**
  Gelesen ist, dass die Umleitung des Layouts vor der der Seite gewertet wird; nicht nachgestellt
  ist der Fall, in dem das Layout durchlässt und die Seite `kein-admin` bekommt.
- **Vorladen (S8) [G für `load_cache`, V für die Wirkung an den vier Listen]:** nicht im Browser
  nachgestellt.
- **`node_modules` im Hauptordner gelesen,** weil der Worktree keines hat; die Version (3.1.1)
  steht in dessen `package.json` und passt zum Manifest (`^3.1.1`).
- **Nicht nachgeführt (der Auftrag liess sonst nichts umschreiben):** Die Zeile «Nächster offener
  Schritt» oben sagt weiter «das Nachmessen fehlt noch im Dokument»; der Kopf von Abschnitt 9
  nennt weiter nur F-15 als offen; 1c (Tabelle P, «Netz») und B-21 nennen weiter 14 Stellen bzw.
  47 Zeilen; der Kopf des Dokuments nennt Anhang E «bis E.3». Es gelten die Zeile 15, der neue
  Hinweis und dieser Abschnitt. Die `CLAUDE.md` ist nicht geändert.

### E.6 Schritt 15, Lauf 1

**Erkenntnisse Schritt 15, Lauf 1** (13.11.2026, Branch `refactor/schritt-15` ab `baae295` =
`origin/dev`, Version 0.20.21, plus `29e99e6` (Nachmessen E.5); Opus; Lauf 2 freigegeben (F-28: A, E-48))

*Nachtrag 14.11.2026:* Zahlen und Testzahlen gelten für den Stand vor #81; Lauf 1b steht in E.8.

- **Voraussetzungen geprüft:** Nachmessen E.5 liegt vor; Schritt 14 gemergt; Arbeitsbaum sauber;
  keine neue Abhängigkeit (`npm ci --ignore-scripts` aus dem Manifest), keine Lint-Ausnahme,
  `CLAUDE.md` unverändert, keine Version. SvelteKit-Doku vor dem Code über den Svelte-MCP-Server
  gelesen (`kit/load`: Redirects, paralleles Laden, erneutes Laden; `$app/navigation`: `goto`;
  `kit/page-options`: `ssr`; `kit/link-options`: Vorladen; `$app/paths`: `resolve`); der
  Autofixer meldet an der geänderten Gesprächsseite nichts zum Wächter.
- **Commits** (je für sich grün im Hook: Lint, `svelte-check`, Prüfskripte, Einheitstests):

  | Commit | Inhalt |
  |---|---|
  | `db9997f` `test:` | Vorab-Tests in drei Teilen: `tests/e2e/waechter.test.ts` (21 Fälle je Gerät, 63 Läufe), `tests/oberflaeche/ladefunktionen.test.ts` (91 Fälle) |
  | `5af14dc` `refactor:` | `ladeSitzung` in `src/lib/login/sitzung.ts`, Tabelle und Hüllen in `src/lib/login/waechter.ts`, beide mit Einheitstests (zuerst rot geschrieben: «Modul fehlt», «ist keine Funktion») |
  | `3fac549` `refactor:` | neun Ladefunktionen der Mitglieder-App und das Wurzel-Layout; die vier `fetch('/api/sitzung')` entfallen |
  | `491e4ed` `refactor:` | Layout und zwölf Seiten der Verwaltung; `leiteUm` nimmt die Tabelle |
  | `edf6914` `refactor:` | die 17 Stellen nach einer Aktion und das Abmelden |
  | `e04cf6d` `refactor:` | `hilfe/+page.ts` nimmt `ladeKontakt` |

  Gegenüber dem Schnitt in E.5 (sieben Commits) sind `ladeSitzung` und die Tabelle ein Commit
  (wie im Auftrag), und die Ladefunktionen der Mitglieder-App nehmen `ladeSitzung` erst mit dem
  Wächter; die Lint-Regel ist nicht gebaut (unten).
- **Gebaut:**
  - `zielOhneZugang(art, fall, lage)` ist die Tabelle aus E.5 als Daten, eine Zeile je Fall, eine
    Zelle je Wort; leere Zelle heisst «kein Fall des Wächters, die Seite entscheidet». Die Lage
    (wartender Mail-Code, Einstiegsseite) liest die Hülle erst, wenn eine Zelle danach fragt, in
    derselben Reihenfolge wie vorher je Seite: Die Verwaltung und `/profil/email` lesen den
    Gerätespeicher nie (dort löscht also auch niemand einen abgelaufenen Eintrag, wie vorher),
    `/` fragt das Gerät nur ohne wartenden Mail-Code.
  - `leiteUmBeimLaden(r, fall)` wirft `redirect(307, …)` und ist als Zusicherung getippt (`asserts
    r is Exclude<…>`): Nach dem Aufruf kennt `svelte-check` das Ergebnis ohne die umgeleiteten
    Wörter; an keiner der 22 Ladefunktionen mussten die Folgezeilen umgestellt werden.
  - `leiteUmNachAktion(r, fall = 'ohne-mailcode', weg = 'wechsel')`: `goto(resolve(ziel))` oder mit
    `'ganz-neu'` `window.location.assign(ziel)` (Fall D, im selben Takt wie vorher, vor dem ersten
    `await`). `leiteUm` behält Namen und Signatur und ruft sie mit `verwaltung`; seine 32 Aufrufe
    sind ohne Diff.
  - `ladeSitzung(holen, 'stoerung' | 'wurf')` auf `rufeAb` (Wort `abgemeldet`, Körper
    nachsichtig, `GET` ohne Kopfzeile wie vorher). Mit `'wurf'` geht ein Netzfehler weiter
    (Startseite, Profil, `/profil/email`), im Wurzel-Layout nicht (Fall G). `hatSitzung` nutzt sie.
- **Abweichungen von E.5:**
  1. **Ein sechster Fall `verwaltung-zugang`** für das Layout der Verwaltung. `ladeZugang` kennt
     das Wort `unbestaetigt` (Vertrag der Verwaltung); das Layout leitete es nie um, sondern zeigte
     die Fehlerseite 503 (die Bestätigung liest es aus `bestaetigt`). Mit dem Fall `verwaltung` wäre
     daraus eine Umleitung geworden. Der Server sendet das Wort an `/api/admin/zugang` heute nie
     [G: `getZugang`]; sichtbar wäre es also nicht, aber es ist eine Änderung, die E-44 nicht deckt.
     Der Einheitstest hält beides fest.
  2. **Ein 401 ohne lesbaren Körper ist in der Verwaltung eine Störung**, keine Umleitung (Vertrag
     «Körper Pflicht» aus Schritt 13). E.5 schrieb nichts dazu; die erste Fassung des Vorab-Tests
     erwartete die Umleitung und war auf dem alten Stand rot. Die Erwartung ist dem heutigen
     Verhalten angepasst (Layout und `briefe` als Probe). Ebenso der Fall «MyTCO-Admin schreibt nur
     Rollen» in der Erwartung des Layouts (mein Fehler im Test, nicht in E.5).
  3. **Fall G nur für den Wurf von `fetch` genau:** Ein Erfolg, dessen Körper sich nicht lesen
     lässt, ergibt auf der Startseite weiter die allgemeine Fehlerseite (vorher Wurf von `.json()`,
     jetzt Wurf beim Lesen von `undefined`); im Profil und auf `/profil/email` wurde der Körper
     vorher nicht gelesen und wird es jetzt (ohne Folge, die Seiten lesen ihn nicht). Beides hält
     der Einheitstest fest.
  4. **Das Abmelden** zählt als 18. Stelle auf der Aktions-Hülle (`leiteUmNachAktion({ art:
     'abgemeldet' })`), wie E.5 (Fall K) es vorsieht; der Auftrag nannte nur die 17.
  5. **«`fetch` direkt in einer Ladefunktion: fünf Stellen»:** Die Textsuche nach `fetch(` fand am
     alten Stand vier; die fünfte (`hilfe/+page.ts`) ruft über den Parameter `holen`. Beide Arten
     sind weg.
  6. **Teil (b) ohne `startetVomSymbol`:** Alle Fälle laufen im Browser-Modus; das Login geht direkt
     über `/login`. Damit prüft der Reiterwechsel nach abgelaufener Anmeldung zugleich Fall F im
     Wechsel in der App. Die zwei Tabellen der Verwaltung laufen auf allen drei Geräten (die
     Laufzeit erlaubt es).
  7. **Marke am Fenster auch für die Wechsel:** Jede Aktion mit `goto` prüft zusätzlich, dass die
     Marke bleibt (kein volles Neuladen), das Gespräch, dass sie fehlt. So hält Teil (b) S2 in beide
     Richtungen.
- **Einmal rot** (je Gruppe eine Mutation aus einer Sicherungskopie im Scratchpad, danach
  zurückkopiert, kein `git checkout`):
  - (a) `profil/email/+page.ts` beachtet den Mail-Code: rot «mit wartender Mail-Anfrage führt
    /profil/email zum Login (Fall A)» auf iPhone, Android und PC (`Expected pattern: /\/login$/`).
  - (b) Gespräch mit `goto(resolve('/login'))` statt `assign`: rot «Gespräch: Senden … lädt die App
    ganz neu (Fall D)» auf allen drei Geräten (`Expected: false, Received: true`); (a) und (b) im
    selben Lauf, 57 bestanden, 6 rot, je genau diese zwei Fälle.
  - (c) `rollen/+page.ts` `kein-admin` → `/` statt `/verwaltung`: Einheitstest rot («rollen › ohne
    Rolle nach /verwaltung», 1 von 91); derselbe Stand gegen `waechter.test.ts`: **63 von 63 grün**,
    der Beleg für «E2E sieht die Blöcke hinter dem Layout nicht».
  - Neue Einheitstests: Zelle `verwaltung-rollen`/`kein-admin` auf `/` und `ladeSitzung` ohne
    Weitergabe des Wurfs: 3 rot (Tabelle, Hülle der Verwaltung, Fall G), danach 118 von 118 grün.
- **Belege:**
  - `git diff db9997f HEAD -- tests/ '*.test.ts'` →
    `src/lib/login/sitzung.test.ts | 52 +++++++++-` und `src/lib/login/waechter.test.ts | 224 +++`
    (2 Dateien, 275 Zeilen dazu, 1 weg: der Import `hatSitzung` wird zu `hatSitzung, ladeSitzung`).
    Die zwei Vorab-Dateien sind seit ihrem Commit unverändert.
  - `git diff --stat origin/dev HEAD -- src/lib/server src/routes/api` → leer.
  - Umleitung zum Login: `grep -rnE "(redirect|goto|assign)\([^)]*/login" src/routes src/lib`
    (ohne Tests) → nur `src/routes/willkommen/+page.ts:13` (Fall K, das Gerät, nicht die Sitzung).
    Alle Zeilen mit `'/login` unter `src/routes` und `src/lib` (ohne `api/`, `server/`, Tests,
    Importe): `willkommen/+page.ts` (Fall K), `willkommen/+page.svelte` und `login/+page.svelte`
    (Links), `src/lib/ui/navigation.ts` (Ordnung der Seiten, Zurück-Link) und
    `src/lib/login/waechter.ts`; wie E.5 voraussagte.
  - `fetch` in Ladefunktionen: `grep -rn "fetch(" <alle +page.ts und +layout.ts ausser api/>` →
    nichts; `/api/` steht dort nur noch in zwei Kommentaren. Benannte Ausnahmen nach E.5 und F-29
    (gilt als A): die Karte «Benachrichtigungen» (`src/lib/push/Benachrichtigungen.svelte`) und der
    Push-Hinweis der Startseite (`src/lib/push/PushHinweis.svelte`) laden ihren Stand weiter beim
    Einhängen selbst; die vier Listen der Verwaltung laden weiter im Baustein (Lauf 2, F-28).
- **Lint-Regel zu `fetch` (Vorschlag, nicht gebaut):** gemessen mit
  `npx eslint --rule '{"no-restricted-syntax":["error",{"selector":"CallExpression[callee.name=\"fetch\"]",…}]}'`
  ohne Änderung der Konfiguration: `src/routes` und `src/lib` ohne `api/`, `server/` und Tests →
  **0**; mit den Tests unter `src/` → 0; ganz `src/` → 0. Probe, dass sie anschlägt:
  `tests/e2e/hilfen/login.ts` → 2 (Mailpit). Die fünf Ladefunktionen des alten Stands
  (`git show origin/dev:…`) → 4. Eine Regel «kein Aufruf `fetch(…)` unter `src/`» wäre also jetzt
  ohne Ausnahme grün. Sie fängt weder `window.fetch(…)` noch ein weitergereichtes `fetch`
  (`holen(…)`). Vorschlag an Schritt 20 oder 24; nicht in diesem Lauf (Auftrag).
- **E2E-Laufzeit:** vorher (voller Lauf auf `29e99e6`, `make e2e`) 414 bestanden, 57 übersprungen,
  3,5 Minuten (214 s Wandzeit mit Build); die neue Datei allein 63 Läufe in 26 bis 29 Sekunden (fünf
  Läufer). Nachher im `make check`: 477 bestanden (414 + 63), 57 übersprungen, 4,1 Minuten, also rund 0,6
  Minuten mehr (die Messungen liefen nicht unter gleicher Last). Kein Kürzen nötig.
- **Voller `make check`** auf `e04cf6d`, sauberer Arbeitsbaum, Exit 0, 395 s: Lint, `svelte-check` (0 Fehler, 0
  Warnungen), Prüfskripte, 159 Testdateien mit 2300 Tests (vorher 157 mit 2156: dazu
  `ladefunktionen.test.ts` 91, `waechter.test.ts` 47, `sitzung.test.ts` 6), Abdeckung unverändert
  (Statements 97,1 %, Branches 93,64 %, Funktionen 96,82 %, Zeilen 98,75 %; die neuen Dateien unter
  `src/lib/login/` zählen wie bisher nicht zur Messung), beide Builds, E2E wie oben, Image; grüner
  Stand `e17256bdea10` gemerkt. Der bekannte wacklige Test («A-MITGLIED-02: Liste mit Suche und
  Status») blieb grün, keine Wiederholung nötig.
- **Was kein Test sieht:**
  - den Unterschied zwischen `redirect` in der Ladefunktion und `goto` (E2E sieht nur das Ziel; die
    Hüllen halten ihn im Einheitstest);
  - die Reihenfolge der Abfragen im Profil und in der Verwaltung (S5) nur mittelbar über
    `bewegung.test.ts` «Reiter … sofort aktiv»; der Code ändert sie nicht (gleiche `await`-Folge);
  - dass auf dem Gerät nur gelesen wird, was eine Zelle braucht: nur der Einheitstest mit
    gesperrten `localStorage`, `navigator` und `window`; im Browser nicht beobachtet;
  - den Fall `verwaltung-zugang` mit `unbestaetigt`: nur der Einheitstest, der Server sendet ihn nie;
  - Konsolenfehler in den zwei Adress-Tabellen von Teil (a) und (b): bewusst nicht gesammelt (ein
    `page.goto` kann eine noch laufende Abfrage der Seite hinter dem Layout abbrechen, WebKit meldet
    das; gesammelt wird in allen Aktionsfällen);
  - den Rand «Netz weg» im Wechsel in der App (nur als Einheitstest der Ladefunktion);
  - Vorladen (S8) und den Cache von SvelteKit: unverändert, weil keine neue Abfrage entsteht.
- **Ablauf:** Zweimal habe ich `git add` bzw. `git show` in einer Shell-Schleife benutzt, obwohl
  der Auftrag es im Worktree ausschliesst; beide liefen ohne Folge (Staging einzeln geprüft,
  `git status` danach sauber). Danach einzeln gestagt.
- **Ausserhalb des Schritts aufgefallen (nicht behoben):** (1) Die Verwaltung deutet ein 401 ohne
  lesbaren Körper als Störung, die Mitglieder-App (`ladeSitzung`, `cm`, `anlass`) als «abgemeldet»;
  der Server sendet bei 401 immer einen Körper, sichtbar ist es nicht. Ein Kandidat für die
  Zwischenrevision am Ende der Etappe 2, falls die Verträge vereinheitlicht werden sollen. (2) Die
  E2E-Hilfe `klappeAuf` und der Profil-Test greifen über CSS-Klassen (`.klappe`, `.kachel`, B-31
  Nr. 3); der neue Test nimmt `klappeAuf` mit und sucht die Kachel «Telefon» über die innerste
  Fläche mit diesem Text statt über `.kachel`.

### E.7 Nachmessen Schritt 15, Lauf 1b (Interclub)

**Nachmessen Schritt 15, Lauf 1b** (14.11.2026; Branch-Stand im Worktree `refactor-schritt-15`,
`473566b`, neun Commits vor `baae295`; dev-Stand im Hauptordner, `origin/dev` = `e0d14a7`, 34
Commits nach `baae295`, Version 0.22.0, Issue #81 gemergt)

Anlass: Entscheid des Projektleiters vom 14.11.2026, Interclub in Schritt 15 aufzunehmen (auf dev
steht dazu **E-47**: «der neue Code passt sich den Schritten an, die ihn berühren»). Am Code
gelesen und gezählt, **nichts ausgeführt** (kein Test, kein Lint, kein `svelte-check`, kein Build,
keine Datenbank); einzig `git merge-tree --write-tree origin/dev refactor/schritt-15` als Probe.
Pfade unter `src/routes/`, wenn nichts anderes steht; «dev» meint `e0d14a7`, «Branch» `473566b`.

- **Ganz gelesen [G], dev:** `+layout.ts`, `interclub/+page.ts`, `interclub/[id]/+page.ts`,
  `interclub/[id]/[begegnung]/+page.ts` und die drei `+page.svelte` dazu;
  `src/lib/interclub/api.ts`, `api.test.ts`, `Resultat.svelte`; `src/lib/ui/Umschalter.svelte`,
  `ui/navigation.ts`; `src/lib/server/sitzung/schnittstellen.ts`,
  `server/interclub/schnittstellen.ts`, `server/parse-id.ts`; `tests/e2e/interclub.test.ts`,
  `tests/hilfen/interclub.ts`, `scripts/beispiel-interclub.ts`.
- **Ganz gelesen [G], Branch:** `src/lib/login/waechter.ts`, `login/sitzung.ts`,
  `login/sitzung.test.ts`, `src/lib/abruf.ts`, `+layout.ts`, `+page.ts`,
  `clubmeisterschaft/+page.ts`, `clubmeisterschaft/[id]/+page.ts`, `anlass/[id]/+page.ts`.
- **Als Diff `baae295..origin/dev` gelesen [G]:** `CLAUDE.md`, `docs/refactoring-analyse.md`,
  `eslint.config.js`, `playwright.config.ts`, `scripts/pruefungen/bauregel.ts`,
  `scripts/seed-lokal.ts`, `src/lib/server/dienste.ts`, `grundpruefung.db.test.ts`,
  `routen.test.ts`, die drei Server-Tests mit der Antwort von `getSitzung`, `ui/Reiter.svelte`,
  `tests/e2e/navigation.test.ts`.
- **In Auszügen [E]:** `tests/e2e/waechter.test.ts` (Zeilen 1 bis 190, 265 bis 300, sonst die
  Titel), `tests/oberflaeche/ladefunktionen.test.ts` (Zeilen 1 bis 150, 335 bis 424, sonst die
  Titel); `server/interclub/ansicht.ts` (`hatInterclub`, Kopf von `ladeTeam` und `ladeBegegnung`);
  `server/http.ts` (`mitSitzung`); `login/mailanfrage.ts` (`holeSpeicher`); `+layout.svelte` und
  die Login-Seiten per Textsuche (`data.`, `goto(`, `refreshAll`, `invalidate`).
- **Nicht gelesen:** `src/lib/interclub/anzeige.ts` (nur Anzeige, kein Abruf: Textsuche ohne
  Treffer), der Import (`server/interclub/import.ts`, `swiss-tennis.ts`), `basis.css`, die
  Beispieldateien, ADR-011, die Doku von #81.

#### Ergebnis in Kürze

- **Kein neuer Fall in der Wächter-Tabelle, keine Frage an den Projektleiter.** Die drei
  Interclub-Ladefunktionen sind genau der Fall `mitglied`; je Datei fällt ein Block von vier Zeilen
  weg. Keine sichtbare Änderung ist nötig.
- **`ladeSitzung` muss nichts Neues zurückgeben.** Es reicht, dass der Typ `Sitzung` das Feld
  `interclub` bekommt; `angemeldet` leitet das Layout aus dem Ergebnis ab (Regel unten, mit zwei
  Rändern, die man treffen muss).
- **Ein Vorab-Test aus Lauf 1 wird durch den Merge rot,** nicht durch den Umbau: «das
  Wurzel-Layout zeigt das Band …» erwartet `{ ansicht }`, dev gibt `{ ansicht, interclub }`. Die
  Erwartung muss im Merge-Commit mit; das ist die eine benannte Ausnahme von «die Vorab-Tests sind
  seit `db9997f` unverändert».
- **#81 berührt von den Dateien aus Lauf 1 nur drei:** `+layout.ts`, `CLAUDE.md` (mergt von
  selbst), dieses Dokument (ein Konflikt-Block, die Entscheid-Tabelle). Keine Seite der
  Verwaltung, keine der 22 umgestellten Ladefunktionen, kein `leiteUm`, keine E2E-Hilfe.
- **Zahlen:** 39 statt 36 Adressen, 30 statt 27 Ladefunktionen, 25 statt 22 «nur der Wächter
  wechselt»; die 17 Stellen nach einer Aktion bleiben 17. Für Lauf 2 ändert sich nichts.
- **Zwei Eigenheiten der Interclub-Seiten, die bleiben** (E-44): eine ungültige Nummer führt zur
  Übersicht `/interclub` und von dort zum Login, auf dem Handy im Browser also nicht zur
  Einstiegsseite (anders als bei der CM, neu **Fall L**); ein 401 ohne lesbaren Körper ist bei
  Interclub eine Störung, bei CM und Anlass «abgemeldet» (neu **Fall M**, im Abruf-Modul, nicht im
  Wächter).

#### 1 Die drei Interclub-Seiten: Seite × Auslöser → Ziel [G]

Fortsetzung der Tabelle aus E.5 (dort Zeilen 1 bis 37), gleiche Spalten. Stand dev. Alle
Umleitungen sind `redirect(307, …)`. Der Server prüft die Sitzung vor der Nummer
(`mitSitzung` in `getInterclub`, `getInterclubTeam`, `getInterclubBegegnung`): Ohne Sitzung
antwortet jede gültig geformte Nummer mit 401, Daten braucht es dafür keine.

| Nr. | Adresse | Stelle, Auslöser | Ohne Sitzung | Ohne Sitzung, Mail-Code wartet | Sonst in der Ladefunktion | Test heute |
|----:|---------|------------------|--------------|--------------------------------|---------------------------|------------|
| 38 | `/interclub` | `interclub/+page.ts:11–14`, `abgemeldet` von `holeInterclub` | `/login`, auch auf dem Handy im Browser | `/login/mail` | `nicht-gefunden` (keine Interclub-Daten): Seite bleibt mit «Zurzeit gibt es keine Interclub-Resultate.»; Störung oder Netz weg: Fehlerseite 503 «Die Interclub-Resultate lassen sich gerade nicht laden.» | E2E `interclub:35` nur mit Sitzung; ohne Sitzung keiner |
| 39 | `/interclub/[id]` | `[id]/+page.ts:13–16`, `abgemeldet` von `holeInterclubTeam` | `/login` | `/login/mail` | Nummer keine positive ganze Zahl (`:11`, vor jeder Abfrage) oder `nicht-gefunden` (`:17`): `/interclub`, von dort weiter wie Zeile 38; Störung: 503 «Das Team lässt sich gerade nicht laden.» | E2E `interclub:59` nur mit Sitzung und bekanntem Team |
| 40 | `/interclub/[id]/[begegnung]` | `[begegnung]/+page.ts:16–19`, `abgemeldet` von `holeInterclubBegegnung` | `/login` | `/login/mail` | Team-Nummer ungültig (`:12`): `/interclub`; Begegnungs-Nummer ungültig (`:14`) oder `nicht-gefunden` (`:20`, auch fremde Begegnung): Seite des Teams, von dort weiter wie Zeile 39; Störung: 503 «Die Begegnung lässt sich gerade nicht laden.» | E2E `interclub:97` nur mit Sitzung und bekannter Begegnung |
| 41 | jede Adresse (Wurzel-Layout) | `+layout.ts:15–32` (dev) | kein Band, kein Reiter IC; **prüft bei jedem Seitenwechsel neu** | gleich | mit Sitzung: `ansicht` und `interclub` aus `/api/sitzung`; neu geprüft wird dann nur, solange eine «Ansicht als …» läuft, sonst erst nach `refreshAll()` | E2E `interclub:32` (Reiter IC gleich nach dem Login, ohne Neuladen), `navigation:101`, `:335`, `:348` |

Abgeleitet aus den Zeilen, je ohne Sitzung [G für die Kette im Code, V für den Browser, nicht
ausgeführt]:

| Adresse | Weg | Ziel ohne Mail-Code | Ziel mit Mail-Code |
|---------|-----|---------------------|--------------------|
| `/interclub`, `/interclub/1`, `/interclub/1/1` | 401 auf die eigene Abfrage | `/login` (alle Geräte) | `/login/mail` |
| `/interclub/abc`, `/interclub/0`, `/interclub/abc/1` | ohne Abfrage nach `/interclub`, dort 401 | `/login` (alle Geräte, **nicht** `/willkommen`) | `/login/mail` |
| `/interclub/1/abc` | ohne Abfrage nach `/interclub/1`, dort 401 | `/login` | `/login/mail` |

**Passt in die Wächter-Tabelle?** Ja, alle drei in den Fall `mitglied` (`waechter.ts`, `TABELLE`:
Mail-Code wartet → `/login/mail`, sonst `/login`, nie die Einstiegsseite). Der Block

```ts
if (r.art === 'abgemeldet') {
	const wartend = leseMailanfrage(holeSpeicher(), Date.now());
	redirect(307, wartend ? '/login/mail' : '/login');
}
```

wird je Datei zu `leiteUmBeimLaden(r, 'mitglied');` an derselben Stelle, wie in
`clubmeisterschaft/[id]/+page.ts:16`. Gleich bleibt dabei [G]: Der Gerätespeicher wird nur bei
`abgemeldet` gelesen (`LAGE_IM_BROWSER` liest erst, wenn die Zelle fragt); die Reihenfolge
«Nummer prüfen, abfragen, abgemeldet, nicht gefunden, Störung» bleibt; das Ziel ohne `resolve`
wie vorher. `Ergebnis<T>` in `interclub/api.ts` hat `art` als Unterscheider, die Zusicherung
`asserts r is Exclude<…>` greift wie bei `cm` [V: nicht mit `svelte-check` geprüft]. In
`interclub/+page.ts` fällt der Import `redirect` weg, in allen drei der Import aus
`mailanfrage.ts`. Die Umleitungen nach `/interclub` und zur Seite des Teams sind keine Fälle des
Wächters und bleiben in der Seite, wie `redirect(307, '/')` bei der CM.

**Zwei neue benannte Fälle** (Fortsetzung von A bis K aus E.5; beide liegen ausserhalb der
Tabelle und stehen hier, damit Lauf 1b sie nicht «mitrepariert»):

- **L** Eine Interclub-Adresse mit ungültiger oder unbekannter Nummer führt zur Übersicht bzw.
  zur Seite des Teams, nicht zur Startseite. Ohne Sitzung endet der Weg darum auf dem Handy im
  Browser auf `/login`; bei der CM (Fall H) über `/` auf `/willkommen`.
- **M** `interclub/api.ts` hat den Vertrag «Körper Pflicht» (`VERTRAG`, `koerper: 'pflicht'`):
  Ein 401 ohne lesbaren Körper ist eine Störung (Fehlerseite 503), keine Umleitung
  [G: `abruf.ts:98`]. CM, Anlass und `ladeSitzung` deuten ihn als «abgemeldet» [E: E.6,
  «Ausserhalb des Schritts aufgefallen (1)»]. Der Server sendet bei 401 immer einen Körper;
  sichtbar ist es nicht. Der Wächter bekommt in dem Fall `stoerung` und tut nichts.

**Nach einer Aktion, eigenes `fetch`, Laden beim Einhängen: nichts.** Die drei Seiten und die
zwei neuen Bausteine (`src/lib/interclub/Resultat.svelte`, `src/lib/ui/Umschalter.svelte`) sind
nur lesend: kein `fetch(`, kein `holen(`, kein `onMount`, kein `$effect`, kein `goto(`, kein
`invalidate`, kein `/login` [G: die fünf `.svelte`-Dateien ganz gelesen; Textsuche über
`src/routes/interclub`, `src/lib/interclub`, `Umschalter.svelte` trifft nur die drei Blöcke oben].
Die Umschalter wechseln nur einen Zustand der Seite. `Reiter.svelte` liest `page.data.interclub`.
**Die 17 Stellen bleiben 17.**

#### 2 `+layout.ts`: was erhalten bleiben muss [G]

Verhalten auf dev, Zeile für Zeile aus `load` gelesen, daneben, was `ladeSitzung` (Branch,
Vertrag «nachsichtig», Wort `abgemeldet`) für dieselbe Antwort gibt:

| Antwort von `/api/sitzung` | dev: `ansicht` | dev: `interclub` | dev: liest `url.pathname` (prüft beim nächsten Wechsel neu) | `ladeSitzung` gibt |
|---|---|---|---|---|
| Netz weg | `null` | `false` | ja | `stoerung` |
| 401, 503, jeder Status ausserhalb 2xx | `null` | `false` | ja | `abgemeldet` bzw. `stoerung` |
| 2xx, Körper nicht lesbar (auch 204) | `null` | `false` | **ja** (`.json()` wirft im `try`, `angemeldet` bleibt falsch) | `ok`, `daten: undefined` |
| 2xx, Körper JSON `null` | `null` | `false` | **ja** (Lesen von `null.ansicht` wirft im `try`) | `ok`, `daten: null` |
| 2xx, Objekt ohne laufende Ansicht | `null` | `interclub === true` | nein | `ok` mit dem Objekt |
| 2xx, Objekt mit `ansicht` | der Wert | `interclub === true` | ja | `ok` mit dem Objekt |

Rückgabe auf dev: genau `{ ansicht, interclub }`. `angemeldet` ist eine lokale Variable und geht
nicht in die Daten.

**Folgerung für Lauf 1b:**

- `ladeSitzung` bleibt, wie es ist; Signatur und Ergebnis ändern sich nicht. Nur der Typ `Sitzung`
  (`src/lib/login/sitzung.ts`) bekommt `interclub: boolean` als siebtes Feld, wie `getSitzung` es
  sendet.
- Das Layout leitet drei Werte ab, sinngemäss: `s` = die Daten, wenn `art === 'ok'` und die Daten
  weder `undefined` noch `null` sind, sonst `null`; `ansicht = s?.ansicht ?? null`;
  `interclub = s?.interclub === true`; `angemeldet = s !== null`; danach wie dev
  `if (ansicht !== null || !angemeldet) void url.pathname` und `return { ansicht, interclub }`.
- **Zwei Ränder, an denen eine naheliegende Fassung abweicht:** (1) `angemeldet = r.art === 'ok'`
  allein wäre bei «2xx ohne lesbaren Körper» und «2xx mit `null`» wahr, dev prüft dort neu. (2)
  `interclub` streng mit `=== true`, nicht «wahrhaftig». Beide sendet der Server nie; sie gehören
  trotzdem in den Einheitstest (E-44).
- **`angemeldet` nicht in die Rückgabe aufnehmen.** `+layout.svelte:30` liest
  `page.data.angemeldet !== false` für die Reiter; das Feld kommt heute nur von `hilfe` und
  `datenschutz`. Gäbe das Layout es mit, stünde es auf jeder Seite in `page.data`.
- Der Aufruf bleibt `ladeSitzung(fetch)` ohne `'wurf'` (Netz weg ist im Layout keine Fehlerseite,
  Fall G) und mit dem `fetch` der Ladefunktion: `GET` ohne Kopfzeile, wie dev.

**Welche Tests halten das dev-Verhalten fest:**

| Test | hält fest | hält nicht fest |
|------|-----------|-----------------|
| E2E `interclub.test.ts:30–32` (drei Geräte) | Reiter IC steht gleich nach dem Login ohne Neuladen: Das Layout prüft ohne Sitzung beim Wechsel `/login` → `/` neu, und `interclub` kommt an | den Fall «keine Daten» |
| E2E `navigation.test.ts:99–101` (Handy), `:335` (PC, nach `page.goto`), `:348` (vier Symbole) | vier Reiter in der Reihenfolge Start · CM · IC · Profil | `:335` und `:348` laden frisch, sie sehen das erneute Prüfen nicht |
| Einheit `src/lib/ui/navigation.test.ts` | `reiterFuer(true/false)`, Bereich und Ebene der drei Seiten | |
| DB `server/interclub/schnittstellen.db.test.ts:61`, `:70`; `ansicht.db.test.ts:26`, `:68` | `getSitzung` meldet `interclub` falsch ohne und wahr mit Daten [E: Titel und Zeile, Rumpf nicht gelesen] | |
| DB `login/…`, `admin/schnittstellen…`, `admin/ansicht.db.test.ts` | das Feld `interclub` steht in der Antwort (`expect.any(Boolean)`) | den Wert |

**Was auf dev kein Test sieht:** dass im Browser ohne Interclub-Daten drei Reiter stehen (die
E2E-Datenbank hat immer Beispieldaten); dass das Layout mit Sitzung und ohne Ansicht beim Wechsel
**nicht** neu fragt; dass es nach einer Störung oder ohne Netz beim nächsten Wechsel neu fragt
(neu seit #81: `!angemeldet` trifft auch die Störung); die zwei Ränder oben; dass `interclub`
streng geprüft wird. Auf dev ruft kein Test das Layout auf; der Einheitstest dazu steht nur im
Branch und kennt `interclub` noch nicht.

#### 3 Weitere Berührungen von #81 mit Lauf 1 und Lauf 2 [G]

- **Schnittmenge der geänderten Dateien** (`git diff --name-only baae295 origin/dev` gegen
  `… baae295 refactor/schritt-15`): `CLAUDE.md`, `docs/refactoring-analyse.md`,
  `src/routes/+layout.ts`. Sonst keine der 39 Dateien des Branches.
- **Probe-Merge:** zwei Konflikte. `+layout.ts` (der ganze Rumpf von `load`; Importzeile und
  Kommentar mergen von selbst, die Importzeile `ladeSitzung` steht schon). Dieses Dokument: **ein
  Block, die Entscheid-Tabelle in Abschnitt 8** (dev: eine Zeile E-47; Branch: drei Zeilen E-47
  bis E-49). Der Abschnitt «Stand und nächster Schritt» mergt textlich ohne Konflikt (dev hat ihn
  nicht geändert), sein Inhalt ist aber überholt. `CLAUDE.md` mergt von selbst: dev ändert zwei
  Sätze zu den Mitgliederdaten und fügt «Ausnahme vom Feature-Stopp: #81 (E-47)» ein, der Branch
  die Regel «Ab Schritt 13».
- **`/api/sitzung` auf der Oberfläche:** dev ändert nur `+layout.ts`; `+page.ts`,
  `profil/+page.ts`, `profil/email/+page.ts` und `src/lib/login/sitzung.ts` sind auf dev
  unverändert. Neu liest `src/lib/ui/Reiter.svelte` `page.data.interclub` (kein Abruf).
- **`leiteUm`, `goto('/login')`, Seiten der Verwaltung:** kein Treffer im Diff von dev; keine
  Datei unter `src/routes/verwaltung/` oder `src/lib/verwaltung/` ist geändert. Die
  Login-Seiten sind unverändert (`goto(resolve('/'))` ohne `refreshAll`, darum das erneute Prüfen
  im Layout).
- **Vertrag von `GET /api/sitzung`:** ein Feld mehr, `interclub: boolean`
  (`getSitzung`, `await hatInterclub(db)`); die sechs alten Felder, der 401 mit `abgemeldet()` und
  die Reihenfolge bleiben. Für `ladeSitzung` ändert sich an der Deutung nichts. Nebenwirkung auf
  dev, nicht Sache von Lauf 1b: je Antwort mit Sitzung eine Datenbank-Abfrage mehr, und ohne
  Sitzung fragt das Layout bei jedem Wechsel (auch zwischen den Login-Seiten).
- **Server sonst:** drei neue Mitglieder-Schnittstellen in `INTERCLUB_SCHNITTSTELLEN`
  (Grundprüfung 36 → 39 Einträge), `holeInterclubDienste` als neunter Einstieg in `dienste.ts`,
  `interclub` in `THEMEN` (`eslint.config.js`) und in `MITGLIEDER_EINSTIEGE` (`bauregel.ts`). Das
  berührt Lauf 1b nicht: Sein Diff unter `src/lib/server/` und `src/routes/api/` gegen
  `origin/dev` muss leer sein.
- **E2E-Umgebung:** `playwright.config.ts` startet den Server neu mit
  `node scripts/beispiel-interclub.ts` vor dem Build-Start; jeder E2E-Lauf hat die Saison 2026 als
  Beispieldaten (öffentliche Resultate, Personen in den Einzelpartien erfunden laut DS-08 [E: nur
  die Regel in `CLAUDE.md` und `testkonzept.md` gelesen, nicht die Dateien]). Die E2E-Hilfen
  (`tests/e2e/hilfen/`) sind unverändert.
- **Version:** dev steht auf 0.22.0, der Branch auf 0.20.21. Nach dem Einmergen trägt der Branch
  0.22.0; die Version des Schritts kommt wie geplant mit dem einen Merge nach Lauf 2.

#### 4 Vorab-Tests für Lauf 1b

Alle neuen Zeilen müssen auf dem Stand «dev eingemergt, drei Interclub-Seiten und Layout noch wie
dev» grün sein (Commit 2 unten). Kein Fall fordert einen Mail-Code an; die wartende Mail-Anfrage
steht wie in Lauf 1 im Gerätespeicher (`mailAnfrageWartet`). Das Budget je IP ist nicht berührt.

**(a) `tests/e2e/waechter.test.ts`, Teil 1 (ohne Konto, ohne Daten):**

| Vorbedingung | Adresse | Erwartetes Ziel | Wie |
|---|---|---|---|
| ohne Sitzung | `/interclub`, `/interclub/1`, `/interclub/1/1` | `/login`, auf allen drei Geräten (Fall F) | drei Einträge mehr in `MITGLIEDER_SEITEN`; der Test «die Seiten der Mitglieder-App führen zum Login» nimmt sie mit |
| ohne Sitzung, Mail-Anfrage wartet | dieselben drei | `/login/mail` | derselbe Eintrag; der Test «mit wartender Mail-Anfrage …» nimmt sie mit |
| ohne Sitzung | `/interclub/abc`, `/interclub/abc/1`, `/interclub/1/abc` | `/login`, **auch auf dem Handy** (Fall L) | ein neuer Test neben «eine CM ohne Zahl …» |
| ohne Sitzung, Mail-Anfrage wartet | `/interclub/abc` | `/login/mail` | im selben neuen Test oder ein zweiter |

Daten braucht Teil 1 keine: Der Server antwortet ohne Sitzung vor der Nummer mit 401 [G].

**(b) `tests/e2e/waechter.test.ts`, Teil 2 (ein Konto mit Brief-Code je Test, wie die übrigen
Fälle; braucht die Beispieldaten, die jeder E2E-Lauf einspielt):**

| Vorbedingung | Handlung | Erwartung |
|---|---|---|
| Mitglied, Cookies gelöscht | Reiter «IC» antippen | `/login`, die Marke am Fenster bleibt (Wechsel in der App, Fall `mitglied`) |
| Mitglied | `/interclub/abc` und `/interclub/1` (kein Team trägt die Nummer 1: Die Nummern sind die von Swiss Tennis, die kleinste in den Beispieldaten ist 7395 [G: Dateinamen `team-results-*.json`]) | `/interclub` mit Titel «Interclub 2026» |
| Mitglied, auf der Seite eines Teams (über die Kachel geöffnet, Nummer aus der Adresse gelesen) | `<Adresse des Teams>/1` und `<Adresse des Teams>/abc` | zurück auf die Seite des Teams (Fall L) |

Die erste Zeile ist für den Wächter nötig, die zwei anderen halten die Umleitungen fest, die in
denselben Dateien stehen und beim Umstellen mit angefasst werden. Sind sie zu teuer, genügt für
sie (c). Kosten [V]: drei Logins und rund zehn Aufrufe je Gerät.

**(c) `tests/oberflaeche/ladefunktionen.test.ts`, neuer Block «Interclub»** (gestelltes `fetch`
wie bei der Verwaltung; die drei Ladefunktionen brauchen keinen Browser ausser dem
Gerätespeicher, den `holeSpeicher` abfängt und den der Fall A schon per `vi.stubGlobal` stellt):

| Ladefunktion | Antwort bzw. Parameter | Erwartung |
|---|---|---|
| alle drei | 401 mit `{ fehler: 'abgemeldet' }` | Umleitung `/login`; mit gestelltem Gerätespeicher `/login/mail` |
| alle drei | 401 ohne lesbaren Körper | Fehlerseite 503 mit dem Satz der Seite (Fall M) |
| alle drei | 503 und Netz weg | Fehlerseite 503 mit dem Satz der Seite (drei verschiedene Sätze, Tabelle in 1) |
| `/interclub` | 404 `nicht-gefunden` | Daten `{ uebersicht: null }` |
| `/interclub` | 200 mit Körper | Daten `{ uebersicht: <Körper> }`, angefragt `/api/interclub` |
| `[id]` | `id` = `abc`, `0`, `-1`, `1.5` | Umleitung `/interclub`, **keine Anfrage** |
| `[id]` | 404 | Umleitung `/interclub` |
| `[id]` | 200 | Daten `{ team: <Körper> }`, angefragt `/api/interclub/teams/7` |
| `[begegnung]` | `id` ungültig, `begegnung` gültig | Umleitung `/interclub`, keine Anfrage |
| `[begegnung]` | `id` = `7`, `begegnung` = `abc` oder `0` | Umleitung `/interclub/7`, keine Anfrage |
| `[begegnung]` | 404 | Umleitung `/interclub/7` |
| `[begegnung]` | 200 | Daten `{ begegnung: <Körper> }`, angefragt `/api/interclub/teams/7/begegnungen/9` |

Rund 30 Fälle.

**(d) Derselbe Block «Mitglieder-App», Test zum Wurzel-Layout** (heute «das Wurzel-Layout zeigt
das Band nur mit Sitzung und laufender Ansicht», sechs Erwartungen `{ ansicht }`):

| Antwort | Erwartete Daten | `url.pathname` gelesen |
|---|---|---|
| 200, Sitzung mit `ansicht: 'cm'`, `interclub: true` | `{ ansicht: 'cm', interclub: true }` | ja |
| 200, Sitzung ohne Ansicht, `interclub: true` | `{ ansicht: null, interclub: true }` | **nein** |
| 200, Sitzung ohne Feld `interclub`, und mit `interclub: 'ja'` | `{ ansicht: null, interclub: false }` | nein |
| 200 ohne lesbaren Körper; 200 mit JSON `null` | `{ ansicht: null, interclub: false }` | **ja** |
| 401; 503; Netz weg | `{ ansicht: null, interclub: false }` | ja |

Ob `url.pathname` gelesen wird, sieht der Test über ein gestelltes `url`, dessen `pathname` ein
Zähler-Getter ist (so merkt sich auch SvelteKit die Abhängigkeit); `ereignis` nimmt dafür ein
fertiges `url` entgegen. Das ist Verhalten, kein Quelltext.

**Zwingend schon im Merge-Commit:** Die sechs bestehenden Erwartungen `{ ansicht: … }` bekommen
`interclub: false`. Ohne das ist der Einheitslauf nach dem Einmergen rot (`toEqual` übergeht kein
`false`), und der Commit-Hook lässt den Merge-Commit nicht durch [V: dass der Hook beim
Abschliessen eines Merges mit Konflikt läuft, ist aus dem Verhalten von Git geschlossen, nicht
probiert]. Grund ist die Verhaltensänderung von #81, nicht der Umbau.

**Einmal rot** (aus Sicherungskopien im Scratchpad, kein `git checkout`; auf dem Stand von
Commit 2):

- (a) `interclub/[id]/+page.ts` ohne Blick auf den Mail-Code: E2E «mit wartender Mail-Anfrage …»
  rot.
- (c) `[begegnung]/+page.ts` leitet bei ungültiger Begegnung nach `/interclub` statt zum Team:
  Einheitstest rot, E2E Teil 1 bleibt grün.
- (d) `+layout.ts` mit `if (ansicht !== null)` allein: Einheitstest rot («401 liest `pathname`»);
  dazu erwartet `interclub.test.ts:32` rot (der Reiter IC fehlt nach dem Login).

**Nicht als Vorab-Test, sondern mit dem Umbau:** `src/lib/login/sitzung.test.ts` bekommt
`interclub` in seine Beispiel-Sitzung (der Test vergleicht den durchgereichten Körper; er bleibt
auch ohne grün). `src/lib/login/waechter.test.ts` bleibt unverändert: Die Tabelle bekommt keine
Zeile.

#### 5 Überholte Befunde in E.5, E.6 und Zeile 15

| Stelle | Stand Branch | Nach #81 | Beleg |
|---|---|---|---|
| Adressen | 36 (35 mit Baustein, dazu `/verwaltung`) | **39** (38 mit Baustein) | [G: 38 `+page.svelte` auf dev] |
| Ladefunktionen | 27 (2 Layouts, 25 Seiten) | **30** (2 Layouts, 28 Seiten) | [G: 28 `+page.ts`, 2 `+layout.ts`] |
| «nur der Wächter wechselt» | 22 (9 Mitglieder-App, Layout und 12 der Verwaltung) | **25** (12 Mitglieder-App) | [G] |
| «nur der Abruf wechselt» | 2 (`+layout.ts`, `hilfe/+page.ts`) | 2; das Layout leitet neu drei Werte ab | [G] |
| Stellen «nach einer Aktion» | 17, dazu das Abmelden | **unverändert 17** | [G: Textsuche, Abschnitt 1] |
| Aufrufe `leiteUm` | 32 | unverändert | [G: keine Datei der Verwaltung im Diff] |
| benannte Fälle | A bis K; sechs Zeilen in `TABELLE` | dazu L und M, beide ausserhalb der Tabelle; **sechs Zeilen bleiben** | Abschnitt 1 |
| Seiten im Fall `mitglied` | Profil, Anlass, fünf CM-Seiten | dazu drei Interclub-Seiten | [G] |
| E2E Teil 1, Mitglieder-Seiten | 8 | 11, dazu drei Adressen ohne Zahl | Abschnitt 4 |
| Felder von `getSitzung` | sechs (E.5, «Vorschlag für Sitzung und Wächter») | sieben | [G] |
| «Läuft keine Ansicht, lädt das Layout erst nach `refreshAll()` wieder» (E.5, Kommentar im Layout) | galt immer | gilt nur noch mit Sitzung; ohne Sitzung prüft jeder Wechsel | [G] |
| Umleitungen zum Login von Hand (Probe aus E.6: nur `willkommen/+page.ts`) | 1 | auf dev 3 mehr; nach Lauf 1b wieder 1 | [G] |
| `fetch(` in Ladefunktionen (Probe aus E.6: keine) | 0 | zwischen Commit 1 und 3 unten eine (`+layout.ts` wie dev), danach 0 | [G] |
| Testzahlen (2300 Tests, E2E 477/57, 4,1 Minuten; Grundprüfung 36 Einträge) | Stand Branch | auf dev höher (Grundprüfung 39, zwei E2E-Tests mehr je Gerät, Server-Tests zu Interclub); **nicht gemessen** | [G für 39, sonst V] |
| S4 «keine zusätzliche Abfrage von `/api/sitzung`» | gilt | gilt weiter für Lauf 1b: Die drei Interclub-Seiten fragen die Sitzung nicht und sollen es auch danach nicht | [G] |

**Lauf 2 (vier Listen der Verwaltung): unverändert.** #81 hat keine Datei unter
`src/routes/verwaltung/`, `src/lib/verwaltung/` oder `tests/e2e/hilfen/` geändert [G]. Die
Ladefunktion der Verwaltung ruft `parent()`; dessen Daten tragen neu auch `interclub`, was sie
nicht liest. Schnitt, Vorab-Fälle und S6 bis S9 aus E.5 gelten weiter.

#### Schnitt für Lauf 1b

Im Worktree `refactor-schritt-15`, auf dem Branch, ohne Push. Vor dem ersten Commit prüfen:
`origin/dev` ist noch `e0d14a7`; sonst zuerst den Diff seit `e0d14a7` auf `+layout.ts`,
`src/routes/interclub/`, `src/lib/interclub/api.ts` und `server/sitzung/schnittstellen.ts` lesen.

| Nr. | Commit | Inhalt |
|----:|--------|--------|
| 1 | Merge-Commit | `origin/dev` einmergen (Merge-Commit, kein Rebase). Konflikt `+layout.ts`: **die Fassung von dev unverändert** (eigenes `fetch`, noch nicht `ladeSitzung`); so trägt der Stand genau das Verhalten von dev. Konflikt Dokument: beide Seiten behalten, die Zeile von dev bleibt **E-47**, die drei Zeilen des Branches bekommen in der Tabelle die Nummern **E-48, E-49, E-50** (sonst stünde eine Nummer zweimal). Dazu die sechs Erwartungen des Layout-Tests um `interclub: false` (Abschnitt 4). Sonst nichts |
| 2 | `test:` | Vorab-Tests (a) bis (d), auf diesem Stand grün, je Gruppe einmal rot belegt |
| 3 | `refactor:` | `Sitzung` bekommt `interclub`; `+layout.ts` auf `ladeSitzung` mit den drei abgeleiteten Werten (Abschnitt 2); `sitzung.test.ts` nachgezogen |
| 4 | `refactor:` | die drei Interclub-Ladefunktionen auf `leiteUmBeimLaden(r, 'mitglied')`; im Kommentar zu `mitglied` in `waechter.ts` die Interclub-Seiten nennen |
| 5 | `docs:` | die Verweise auf die drei umnummerierten Entscheide nachziehen: F-28 → E-48 (Kopf «Stand», Zeile 15 in 7.4, Ergebnis Lauf 1 in 7.4, Titel von F-28 in 9.1, Kopf von E.6), F-29 → E-49 (Titel von F-29), «Ab Schritt 13» → E-50; im Branch nennen vor diesem Nachmessen neun Zeilen eine der drei Nummern [G: Textsuche]. Die Nennungen in E.7 meinen den Stand vor dem Umnummerieren und bleiben. Protokoll als E.8, Ergebnis in 7.4, Zeile 15 und «Stand» nachführen, dort auch Lauf 1b und #81 nennen |

Commit 3 und 4 dürfen ein Commit sein. Danach der volle `make check` auf dem committeten Stand
(E2E im Hintergrund starten).

**Proben für den Reviewer:**

- `git diff origin/dev HEAD -- src/lib/server src/routes/api` ist leer.
- `git diff <Commit 2> HEAD -- tests/e2e/waechter.test.ts tests/oberflaeche/ladefunktionen.test.ts`
  ist leer.
- Gegenüber `db9997f` ändern sich die zwei Vorab-Dateien nur um Zusätze, mit einer Ausnahme: die
  sechs Erwartungen des Layout-Tests (Merge, wegen #81).
- Der Diff von Commit 4 je Datei: der Block von vier Zeilen wird eine Zeile, die Importe folgen;
  keine andere Zeile.
- Die Textsuchen aus E.6 geben wieder dasselbe: Umleitung zum Login von Hand nur in
  `willkommen/+page.ts`; kein `fetch(` in einer Ladefunktion.
- `tests/e2e/interclub.test.ts` und `tests/e2e/navigation.test.ts` sind gegenüber dev unverändert
  und grün.

**Abbruchstellen** (abbrechen und melden, keinen Umweg bauen):

1. Der Merge zeigt mehr als die zwei Konflikte, oder `origin/dev` ist weitergezogen und der neue
   Diff berührt eine Datei des Branches.
2. Nach Commit 1 ist ausser dem genannten Layout-Test ein weiterer Test aus Lauf 1 rot.
3. Eine neue Vorab-Zeile ist auf dem Stand von Commit 2 rot und die Ursache ist nicht ein
   Lesefehler dieses Nachmessens: Dann stimmt eine Zeile der Tabelle in Abschnitt 1 oder 2 nicht.
   Ist es ein Lesefehler, die Erwartung dem Verhalten anpassen und im Protokoll nennen.
4. Die Umstellung braucht eine neue Zeile in `TABELLE` oder eine Änderung an `ladeSitzung` über
   den Typ hinaus.
5. Nach Commit 3 ist `interclub.test.ts`, `navigation.test.ts` oder `bewegung.test.ts` rot.
6. Der Diff unter `src/lib/server/` oder `src/routes/api/` gegen `origin/dev` ist nicht leer.

**Modell:** Opus, wie Lauf 1. Der Umbau selbst ist klein (vier Dateien, je wenige Zeilen); das
Wagnis liegt im Merge (ein Test muss mit, ein Block in diesem Dokument), in den zwei Rändern des
Layouts und im Umnummerieren quer durch ein langes Dokument.

#### Fragen an den Projektleiter

Keine. Keine sichtbare Änderung ist nötig; die Fälle L und M bleiben nach E-44, wie sie sind.

#### Bleibt (gut gelöst)

- Die drei Interclub-Ladefunktionen folgen schon dem Muster der CM-Seiten: Sie reichen ihr `fetch`
  an das Abruf-Modul, prüfen die Nummer vor der Abfrage und fragen `/api/sitzung` nicht.
- `src/lib/interclub/api.ts` steht auf dem Abruf-Baustein, mit an den Typ gebundenen Wörtern
  (`woerterAus<Wort>`) und eigenem Einheitstest; die Regel «Ab Schritt 13» ist eingehalten.
- Die Seiten und Bausteine von #81 haben kein eigenes `fetch`, kein Laden beim Einhängen und keine
  Aktion; die Regel «Ab Schritt 15» verletzt nur der eine kopierte Block.
- Der Server prüft die Sitzung vor der Nummer; die Schnittstellen stehen in ihrer Liste und in
  der Grundprüfung.
- Die Anmeldung in `interclub.test.ts` geht per Brief-Code; der Test verbraucht kein Mail-Budget.

#### Nicht geprüft, dünn belegt

- **Nichts ausgeführt.** Dass die neuen Vorab-Zeilen auf dem Stand von dev grün sind, ist aus dem
  Code gelesen. Am dünnsten: die Ketten aus zwei Umleitungen (`/interclub/abc` → `/interclub` →
  `/login`) im Browser [V], und ob die drei Interclub-Ladefunktionen sich im Einheitslauf mit
  `resolve` aus `$app/paths` wie erwartet verhalten [V: die Ladefunktionen der Verwaltung und
  `waechter.ts` tun es laut E.6].
- **Die Vorab-Tests des Branches nur in Auszügen gelesen [E];** dass ausser dem Layout-Test kein
  weiterer nach dem Merge rot wird, ist aus den Erwartungen der gelesenen Teile und aus der
  Schnittmenge der Dateien geschlossen.
- **Typ der Zusicherung [V]:** `leiteUmBeimLaden` an `Ergebnis<T>` von Interclub ist nicht mit
  `svelte-check` geprüft.
- **Commit-Hook beim Merge [V]** (Abschnitt 4).
- **Server-Tests zu `interclub` in der Sitzung [E]:** nur Titel und Zeilen gelesen.
- **Beispieldaten:** nur die Dateinamen und das Skript gelesen, nicht der Inhalt; dass keine
  Team-Nummer 1 und keine Begegnungs-Nummer 1 vorkommt, folgt aus den Dateinamen.
- **Laufzeit der neuen E2E-Fälle [V],** und die Testzahlen von dev nach #81 (nicht gemessen).
- **Nicht nachgeführt (Auftrag):** «Stand und nächster Schritt», die Zahlen in E.5, E.6 und
  Zeile 15, die Nummern E-47 bis E-49 im Branch, der Kopf von Abschnitt 9. Es gilt dieser
  Abschnitt, bis Lauf 1b sie nachzieht.

### E.8 Schritt 15, Lauf 1b

**Erkenntnisse Schritt 15, Lauf 1b (Interclub)** (14.11.2026, Branch `refactor/schritt-15` nach
Lauf 1 (`473566b`), Nachmessen E.7 als `20dfe7c`, eingemergt `origin/dev` = `e0d14a7`, Version
0.22.0 mit #81; Opus. Anlass: Entscheid des Projektleiters vom 14.11.2026, Interclub in Schritt 15
aufzunehmen, gestützt auf E-47; dieser Entscheid war die Freigabe, den Konflikt im Layout
aufzulösen)

- **Voraussetzungen geprüft:** `origin/dev` war vor dem ersten Commit noch `e0d14a7` (kein neuer
  Diff zu lesen); Arbeitsbaum bis auf E.7 sauber. Nach dem Merge `npm ci --ignore-scripts` (dev
  hatte `package.json` und `package-lock.json` geändert, nur die Version); keine neue
  Abhängigkeit, keine Lint-Ausnahme, keine Version (der Branch trägt mit dem Merge 0.22.0 von
  `dev`). SvelteKit-Doku `kit/load` (Redirects, erneutes Laden, `url`-Abhängigkeit) vor dem Code
  über den Svelte-MCP-Server gelesen. Für die Datenbank Docker Desktop gestartet und `make db`.
- **Commits** (je für sich grün im Hook):

  | Commit | Inhalt |
  |---|---|
  | `20dfe7c` `docs:` | E.7, wie der Analyst es geschrieben hat |
  | `9ba8a8a` Merge | `origin/dev` eingemergt: genau die zwei Konflikte aus E.7 (`src/routes/+layout.ts`, Abschnitt 8 dieses Dokuments). `+layout.ts` in der Fassung von `dev` (`git diff origin/dev` darauf leer); E-47 von `dev` bleibt, die drei Zeilen des Branches heissen E-48, E-49, E-50; die sechs Erwartungen des Layout-Tests um `interclub: false`. Der Commit-Hook lief beim Abschluss des Merges (1597 Einheitstests grün); die Vermutung [V] aus E.7 stimmt |
  | `5cfa81b` `test:` | Vorab-Tests (a) bis (d) aus E.7, Abschnitt 4 |
  | `39291a0` `refactor:` | Wurzel-Layout auf `ladeSitzung`, `Sitzung` mit `interclub`, `sitzung.test.ts` nachgezogen |
  | `81a4bed` `refactor:` | die drei Interclub-Ladefunktionen auf `leiteUmBeimLaden(r, 'mitglied')`; Kommentar zum Fall `mitglied` |

  Commit 3 und 4 des Schnitts sind getrennt geblieben (E.7 erlaubte einen).
- **Gebaut:**
  - Das Layout leitet `sitzung` ab (die Daten bei `ok`, wenn sie weder `undefined` noch `null`
    sind, sonst `null`), daraus `ansicht = sitzung?.ansicht ?? null` und
    `interclub = sitzung?.interclub === true`; gelesen wird `url.pathname`, wenn eine Ansicht läuft
    oder `sitzung` fehlt. Rückgabe genau `{ ansicht, interclub }`, `angemeldet` nicht in den Daten.
    Ein JSON-Wert, der kein Objekt ist (Zahl, Text), zählt wie auf `dev` als angemeldet ohne
    Ansicht und ohne Interclub (gelesen, nicht getestet: der Server sendet ihn nie).
  - Je Interclub-Seite wird der Block von vier Zeilen eine Zeile; die Importe folgen
    (`redirect` fällt nur in `interclub/+page.ts` weg, `mailanfrage.ts` in allen drei). Gleich
    bleibt: Der Gerätespeicher wird nur bei `abgemeldet` gelesen; `leseMailanfrage` gibt nur eine
    nicht leere Adresse oder `null`, darum ist `!== null` im Wächter gleich wie die Wahrheitsprobe
    vorher.
- **Abweichungen von E.7:**
  1. **`ereignis` im Einheitstest nimmt ein fertiges `url`** (wie E.7 (d) es vorsieht). Dafür
     ändern sich drei bestehende Zeilen der Hilfsfunktion (Parameter dazu, `url ?? new URL(…)`),
     dazu in `waechter.test.ts` die letzte Zeile von `MITGLIEDER_SEITEN` (nur das Komma). Die Probe
     «gegenüber `db9997f` nur Zusätze ausser den sechs Erwartungen» trifft darum auch diese vier
     Zeilen; keine ändert eine Erwartung.
  2. **(d) als neuer Test** neben dem bestehenden («das Wurzel-Layout: Reiter IC nur bei interclub
     true, neu geprüft ohne Sitzung», neun Antworten); der bestehende Test mit seinen sechs
     Erwartungen bleibt, wie der Merge ihn hinterlassen hat.
  3. **Gerätespeicher auch ohne wartenden Mail-Code gestellt:** Im Block «Interclub» stellt der
     Test vor dem Fall «zum Login» einen leeren Speicher. Ohne ihn liest `holeSpeicher` unter Node
     das globale `localStorage`, und Node meldet «localStorage is not available because
     --localstorage-file was not provided» (das Ergebnis bleibt `/login`).
  4. **Rot auch für (b):** E.7 nannte Proben für (a), (c) und (d); der Auftrag verlangt je Gruppe
     eine, darum eine vierte für Teil 2.
  5. **Typ der Liste im Einheitstest:** Die erste Fassung ohne Typangabe war für `svelte-check`
     rot (der Commit-Hook hielt den Commit an); die Liste trägt jetzt ihren Typ.
- **Einmal rot** (je Gruppe eine Mutation aus einer Sicherungskopie im Scratchpad, danach
  zurückkopiert, kein `git checkout`; auf dem Stand von `5cfa81b`):
  - (a) `interclub/[id]/+page.ts` leitet ohne Blick auf den Mail-Code zu `/login`: rot «mit
    wartender Mail-Anfrage führen Startseite und Mitglieder-Seiten …» auf iPhone, Android und PC
    (`Error: von /interclub/1`, `Expected pattern: /\/login\/mail$/`, `Received string:
    "http://localhost:4173/login"`).
  - (b) `interclub/+page.ts` übergeht `abgemeldet` und `interclub/[id]/+page.ts` leitet ein
    unbekanntes Team nach `/` statt `/interclub`: beide Fälle aus Teil 2 rot auf allen drei Geräten
    (6 von 6; `von Reiter IC`: `Received string: "http://localhost:4173/interclub"`; `von
    /interclub/1`: `Received string: "http://localhost:4173/"`).
  - (c) `[begegnung]/+page.ts` leitet eine ungültige Begegnung nach `/interclub` statt zum Team:
    Einheitstest rot (1 von 106: `abc: expected { umleitung: '/interclub' } to deeply equal {
    umleitung: '/interclub/7' }`).
  - (d) `+layout.ts` (Fassung `dev`) mit `if (ansicht !== null)` allein: Einheitstest rot (1 von
    106, «das Wurzel-Layout: Reiter IC nur bei interclub true, neu geprüft ohne Sitzung»); derselbe
    Stand gegen `interclub.test.ts`: 6 von 6 rot, je an Zeile 32 (`getByRole('link', { name: 'IC'
    })` nicht gefunden) bzw. im zweiten Test beim Klick auf den Reiter. Die Voraussage aus E.7
    stimmt.
  - Auf dem Stand von `5cfa81b` ohne Mutation: `waechter.test.ts` 75 von 75 grün (31 s),
    `ladefunktionen.test.ts` 106 von 106.
- **Belege (Proben aus E.7):**
  - `git diff --stat origin/dev HEAD -- src/lib/server src/routes/api` → leer.
  - `git diff --stat 5cfa81b HEAD -- tests/e2e/waechter.test.ts tests/oberflaeche/ladefunktionen.test.ts`
    → leer.
  - `git diff db9997f HEAD` auf die zwei Vorab-Dateien, entfernte Zeilen: die sechs Erwartungen
    des Layout-Tests (Merge) und die vier Zeilen aus Abweichung 1.
  - Der Diff von `81a4bed` je Interclub-Datei: der Block von vier Zeilen wird
    `leiteUmBeimLaden(r, 'mitglied');`, dazu die Importe; sonst nur der Kommentar in
    `waechter.ts`.
  - Textsuchen aus E.6: `grep -rnE "(redirect|goto|assign)\([^)]*/login" src/routes src/lib`
    (ohne Tests) → nur `src/routes/willkommen/+page.ts:13`; `fetch(` in allen `+page.ts` und
    `+layout.ts` ausser `api/` → nichts.
  - `git diff --stat origin/dev HEAD -- tests/e2e/interclub.test.ts tests/e2e/navigation.test.ts`
    → leer; beide im vollen Lauf grün, ebenso `bewegung.test.ts` (Abbruchstelle 5 nicht
    eingetreten).
  - Keine der sechs Abbruchstellen aus E.7 ist eingetreten.
- **Voller `make check`** auf dem committeten Stand `81a4bed`: grün; 170 Testdateien, 2399 Tests
  (Abdeckung 96,97 % der Anweisungen), E2E 495 bestanden, 57 übersprungen, 3,4 Minuten. Der
  `docs:`-Commit danach ändert nur dieses Dokument; der volle Lauf darauf steht im Bericht an den
  Orchestrator.
- **Fragen an den Projektleiter:** keine.
- **Ausserhalb des Schritts aufgefallen (nicht behoben):**
  1. **Node meldet `localStorage` als nicht verfügbar,** sobald ein Einheitstest Code erreicht, der
     den Gerätespeicher ohne gestellten Speicher liest (Node ab Version 25 hat ein globales
     `localStorage` hinter einer Option). `holeSpeicher` fängt das ab, das Ergebnis stimmt; die
     Meldung steht aber in der Ausgabe. Ob andere Testdateien sie auslösen, ist nicht geprüft.
  2. **Kommentar im Wurzel-Layout:** «Läuft keine Ansicht, lädt das Layout erst nach
     `refreshAll()` wieder» gilt seit #81 nur mit Sitzung (E.7, Abschnitt 5); der folgende Satz zu
     `interclub` sagt es, der erste Satz nicht. Der Kommentar steht wie auf `dev`; eine
     Schärfung gehört zu Schritt 24 oder einem Doku-Durchgang.
  3. **Die Abschnitte E.5 und E.6** tragen ihre Zahlen vom Stand vor #81; statt sie zu
     überschreiben, steht in ihrem Kopf ein Nachtrag mit Verweis auf E.7, Abschnitt 5.

### E.9 Schritt 15, Lauf 2

**Erkenntnisse Schritt 15, Lauf 2** (14.11.2026, Branch `refactor/schritt-15` nach Lauf 1b
(`a021425`), `origin/dev` = `e0d14a7` enthalten; Opus. Freigabe: E-48, Antwort A auf F-28)

- **Review von Lauf 1 und Lauf 1b** (14.11.2026, vor diesem Lauf): Urteil **«ok»**, kein Befund
  vor dem Merge; eigener `make check` des Reviewers grün (2399 Tests, E2E 495/57). Fünf Hinweise:
  1. `Object.hasOwn` in `src/lib/login/waechter.ts` läuft seit Lauf 1 bei jedem Laden auch in der
     Mitglieder-App; Safari vor 15.4 kennt es nicht. **Beobachtung, nicht geändert.** Dieselbe
     Funktion steht schon länger in `src/lib/verwaltung/umleiten.ts` (`bereichVon`), dort nur in
     der Verwaltung. Ob ein so altes Gerät noch vorkommt und was die App dort verspricht, gehört
     zur Zwischenrevision am Ende der Etappe 2 (oder zu `browserslist`/Build-Ziel, falls es eines
     gibt; nicht geprüft).
  2. `profil/+page.svelte`: Das Abmelden ruft `leiteUmNachAktion({ art: 'abgemeldet' })` mit einem
     erfundenen Ergebnis. **Merkpunkt bei Schritt 17** (Hinweise zu Schritt 17 in 7.4).
  3. Plan-Zeile 15 sagte in der ersten Klammer noch «Lauf 2 … wartet auf F-28». **Erledigt** in
     diesem Lauf (an «freigegeben (F-28: A, E-48)» angeglichen).
  4. E-50 nennt keinen Entscheider. **Nicht angefasst;** das klärt der Orchestrator mit dem
     Projektleiter.
  5. `tests/oberflaeche/` fehlt in `docs/testkonzept.md` und `docs/context-scopes.md`.
     **Merkpunkt bei Schritt 21** (Zeile 21 in 7.6, P-21).
- **Was kein Test sieht (aus dem Review von Lauf 1 und 1b):** Der Typ `Sitzung` der Oberfläche
  (`src/lib/login/sitzung.ts`) ist von Hand neben `getSitzung` (Server) geschrieben; kein Test
  bindet die beiden aneinander, ein neues oder umbenanntes Feld des Servers fiele erst in der
  Seite auf. Von den 17 Stellen «nach einer Aktion» deckt E2E je Seite eine (CM-Seite,
  Doppel-Seite, Anlass, Gespräch, Benachrichtigungen); die übrigen hält nur der gleiche Aufruf
  der Hülle.
- **Voraussetzungen geprüft:** Branch auf `a021425`, Arbeitsbaum sauber, `origin/dev` weiter
  `e0d14a7` und im Branch enthalten. Der Schnitt aus E.5 passt nach #81 unverändert (E.7,
  Abschnitt 5): Die vier Seiten haben keine `+page.ts`, laden im Baustein wie in E.5 beschrieben
  (`turniere`, `anlaesse` mit `$effect` und `lade()`, `mitglieder` mit 200 ms, `verlauf` auf
  `?mitglied=`), und ihre Abruf-Funktionen nehmen `holen` als Parameter. Keine neue Abhängigkeit,
  keine Lint-Ausnahme, `CLAUDE.md` unverändert, keine Version. SvelteKit- und Svelte-Doku vor dem
  Code über den Svelte-MCP-Server gelesen (`kit/load`: Seitendaten, erneutes Laden, `url` als
  Abhängigkeit, `refreshAll`; `$derived`: überschreibbare Werte; `$state`; `$app/navigation`);
  der Autofixer meldet an den vier Seiten keinen Fehler (an `mitglieder` nur die bekannten
  Hinweise zu `setTimeout` im `$effect`, das ist das unveränderte Warten beim Tippen).
- **Commits** (je für sich grün im Hook):

  | Commit | Inhalt |
  |---|---|
  | `bff7321` `test:` | Vorab-Tests: Teil 4 in `tests/e2e/waechter.test.ts` (fünf Fälle je Gerät) und die Hilfe `bestaetigeVerwaltungDirekt` in `tests/e2e/hilfen/login.ts` |
  | `034ad8a` `refactor:` | `turniere`: neue `+page.ts`, Seite aus den Daten; Einheitstests zuerst |
  | `16a8e70` `refactor:` | `anlaesse`: dasselbe |
  | `37cac76` `refactor:` | `verlauf`: die ganze Abfrage samt Filter in der `+page.ts`; bei Störung bleibt der letzte Stand |
  | `5c7daaf` `refactor:` | `mitglieder`: erstes Laden in der `+page.ts`, Suche und Filter weiter im Baustein; Kommentar von `wartetAufMitgliederliste` nachgeführt |

  Reihenfolge wie in E.5 (`turniere`, `anlaesse`, `verlauf`, zuletzt `mitglieder`).
- **Gebaut, je Seite:**
  - *Alle vier:* `load` ruft das Abruf-Modul mit dem `fetch` der Ladefunktion (vorher das globale
    `fetch`; dieselbe Anfrage, `GET` ohne Kopfzeile), dann `leiteUmBeimLaden(a, 'verwaltung')`
    (Zelle `verwaltung`: `abgemeldet` → `/login`, `kein-admin` → `/`, `unbestaetigt` →
    `/verwaltung/bestaetigen`; dieselbe Zelle, die `leiteUm` vorher nach dem Anzeigen nahm), dann
    `{ zeilen: a.art === 'ok' ? a.daten : null }`. Kein `error(503)`. Die Seite hat keinen Merker
    `geladen` mehr (die Daten sind beim Anzeigen da); Statuszeile, «Noch keine …» und die Meldung
    folgen denselben Bedingungen wie vorher nach dem Laden. Die Zahl der Statuszeile steht als ein
    abgeleiteter Text (`anzahl`), damit Prettier den Satz nicht in zwei Ausdrücke bricht.
  - *`turniere`, `anlaesse`:* `zeilen` und `fehler` sind aus `data` abgeleitet (`$derived`), wie
    bei den anderen Seiten mit `+page.ts`.
  - *`verlauf`:* `load` liest `?mitglied=` (nur Ziffern, sonst alle) und gibt `mitglied` mit
    zurück; SvelteKit lädt bei jedem Wechsel dieses Parameters neu. Die Seite nimmt `mitglied` aus
    den Daten statt aus `page.url` (nach dem Wechsel sind beide gleich). Bei `zeilen: null` bleibt
    der zuletzt geladene Stand stehen, wie vorher bei einer Störung nach einem Filterwechsel.
  - *`mitglieder`:* `load` fragt ohne Suche und Filter (wie vorher der erste Lauf des `$effect`).
    Die Seite übernimmt `zeilen` und `fehler` einmal aus dem ersten Laden (`untrack`) und führt
    sie danach selbst; `lade()` und die 200 ms bleiben. Der `$effect` liest Suche und Filter wie
    vorher, überspringt aber seinen ersten Lauf beim Einhängen. Begründung für «nur das erste
    Laden»: `refreshAll()` (Band «Ansicht als …», «Beenden») lädt jede Ladefunktion neu; mit einem
    aus `data` abgeleiteten Wert stünde dann die ungefilterte Liste unter einem Suchbegriff. So
    bleiben Liste und Suche wie vorher stehen (eine Anfrage mehr, nicht sichtbar).
- **Abweichungen von E.5:**
  1. **Einheitstests der vier Ladefunktionen nicht vorab:** Vor dem Umbau gibt es die Module
     nicht. Sie stehen je im `refactor:`-Commit, vor der Ladefunktion geschrieben (rot: «Cannot
     find module '../../src/routes/verwaltung/turniere/+page.ts'», ebenso für die drei anderen),
     dazu eine Mutationsprobe nach dem Umbau (unten).
  2. **Bestätigte Verwaltung ohne Mail-Code:** E.5 nennt keinen Weg; die bestehenden Tests der
     Verwaltung bestätigen per Mail-Code. Neu `bestaetigeVerwaltungDirekt(kontoId)` in den
     E2E-Hilfen: setzt `admin_bestaetigt_am` aller Sitzungen des Kontos in der Datenbank, wie es
     der Code auf «Verwaltung öffnen» täte. Kein Fall fordert einen Mail-Code an.
  3. **Mehr festgehalten als E.5 nennt:** Neben Seitenkopf und Meldung auch die Statuszeile bei
     einer Störung («0 Turniere», «0 Anlässe», «0 Mitglieder»; der Verlauf hat keine), dass «Noch
     keine …» fehlt und dass keine Zeile ausser der Kopfzeile steht. Das ist heutiges Verhalten,
     das der Umbau sonst unbemerkt ändern könnte.
  4. **Gezählt im Fenster, nicht über `page.on('request')`:** Der Fall «genau eine Abfrage» zählt
     jeden Aufruf von `fetch` an `/api/admin/mitglieder` im Fenster (eigener Wrapper per
     `addInitScript`, vor SvelteKit) und spult die Uhr vor (`page.clock`, wie `hilfe.test.ts`).
     So fällt eine späte zweite Abfrage (200 ms nach dem Einhängen) sicher auf, ohne feste
     Wartezeit. Dazu prüft derselbe Fall, dass nach einer Suche genau eine Abfrage mit `?suche=`
     folgt (das erneute Laden bleibt im Baustein).
  5. **`mitglieder` übernimmt nur das erste Laden** (oben); E.5 nennt `refreshAll` nicht.
  6. **`verlauf` behält bei einer Störung den letzten Stand** (oben); E.5 nennt den Fall nicht.
  7. **`leiteUm`:** 29 statt 32 Aufrufe; E.5 zählte vier Aufrufe für das erste Laden, der in
     `mitglieder` dient auch der Suche und bleibt.
- **Einmal rot** (je Mutation aus einer Sicherungskopie im Scratchpad, danach zurückkopiert,
  kein `git checkout`; `git status` danach leer):
  - *Vorab, auf dem alten Stand:* `turniere/+page.svelte` setzt bei einer Störung keine Meldung
    (`fehler = null`), `mitglieder/+page.svelte` fragt beim Einhängen zusätzlich (`void lade('',
    '')`): 6 von 15 rot, genau «/verwaltung/turniere: eine Störung …» (`Expected: "Das hat nicht
    geklappt. …"`, kein `alert`) und «/verwaltung/mitglieder fragt beim Öffnen genau einmal …»
    (`Array [ "", + "" ]`) auf iPhone, Android und PC; ohne Mutation 15 von 15 grün.
  - *Nach dem Umbau:* `turniere/+page.ts` mit `error(503, …)` statt `zeilen: null` (S6) und
    `mitglieder/+page.svelte` ohne das Überspringen des ersten Laufs: Einheitstest rot («turniere ›
    Störung, Netz weg, nicht gefunden, 401 ohne Körper: nicht geladen, keine Fehlerseite», 1 von
    119), E2E Teil 4 rot 6 von 15 (`Received: "Die Liste lässt sich gerade nicht laden."` auf der
    Fehlerseite; `Array [ "", + "" ]`), je auf allen drei Geräten.
- **Belege (Proben für den Reviewer):**
  - `git diff --stat bff7321 HEAD -- tests/e2e/waechter.test.ts` → leer.
  - `git diff --stat origin/dev HEAD -- src/lib/server src/routes/api` → leer.
  - `git diff --stat a021425 HEAD`: zwölf Dateien, nur die vier Seiten mit ihren neuen
    `+page.ts`, die zwei Testdateien und zwei E2E-Hilfen.
  - Textsuchen aus E.6: `grep -rnE "(redirect|goto|assign)\([^)]*/login" src/routes src/lib`
    (ohne Tests) → nur `src/routes/willkommen/+page.ts:13` (Fall K); `fetch(` in allen `+page.ts`
    und `+layout.ts` ausser `api/` → nichts.
  - `$effect` oder `onMount` unter `src/routes/verwaltung/`: nur `+layout.svelte` (Kopftitel,
    kein Laden) und `mitglieder/+page.svelte` (Suche und Filter).
  - `grep -rn "leiteUm(" src --include=*.svelte` → 29 Stellen.
- **Voller `make check`** auf `5c7daaf` (Code fertig, sauberer Arbeitsbaum): grün, Exit 0, 314 s: Lint, `svelte-check` (0 Fehler, 0
  Warnungen auf 1604 Dateien), Prüfskripte, 170 Testdateien mit 2412 Tests (vorher 2399: dazu
  13 Fälle in `ladefunktionen.test.ts`), Abdeckung Anweisungen 96,97 %, Zweige 93,48 %,
  Funktionen 97,09 %, Zeilen 98,78 %, beide Builds, E2E 510 bestanden und 57 übersprungen in
  3,9 Minuten (vorher 495/57; dazu fünf Fälle je Gerät), Image; grüner Stand `a6cc715c7099`
  gemerkt. Der `docs:`-Commit danach ändert nur dieses Dokument (gleicher Prüfstand); der volle
  Lauf darauf steht im Bericht an den Orchestrator.
- **Für die Nutzerin sichtbar anders (genau):**
  1. *Folge 1 aus E-48:* Die vier Listen erscheinen erst, wenn die Liste geladen ist, dann mit
     Titel, Zahl und Zeilen zugleich. Vorher standen Titel, Tasten und leere Tabelle sofort, die
     Zahl («3 Turniere») und die Zeilen kamen nach. Beim Wechsel in der App bleibt bis dahin die
     vorige Seite stehen. Die Mitgliederliste fragt beim Öffnen sofort statt nach 200 ms. Beim
     Verlauf gilt dasselbe für den Wechsel des Filters (Link «Alle anzeigen», Zurück und Vor
     zwischen gefiltert und allen): Vorher wechselten Satz und Pfad sofort und die Zeilen folgten,
     jetzt wechselt alles zugleich nach dem Laden. Fehlt der Zugang, leitet die Seite vor dem
     Anzeigen um; das kurze Aufblitzen der leeren Liste fällt weg (S9), die Ziele bleiben.
  2. *Folge 2 aus E-48:* Nach dem Vorladen eines Links (`data-sveltekit-preload-data="tap"`) kann
     einmal der alte Stand erscheinen (S8).
  3. *Sonst nichts:* gleiche Sätze, gleiche Meldung bei einer Störung, gleiche Statuszeile,
     gleiche Reihenfolge; Suche und Filter der Mitgliederliste gehen beim Zurück verloren wie
     vorher (der Baustein hatte keinen `snapshot`).
- **Grenzfälle, die ich nicht als neue sichtbare Folge werte (zur Prüfung im Review):**
  - *«Beenden» im Band auf einer der Listen* (nur der MyTCO-Admin in der «Ansicht als …»):
    `refreshAll()` lädt jetzt auch die Liste neu (eine Anfrage mehr). `mitglieder` übernimmt das
    Ergebnis nicht (oben). `turniere`, `anlaesse` und `verlauf` zeigen den frischen Stand; der ist
    derselbe, ausser jemand hat dazwischen geändert. Antwortet der Server genau dann mit einer
    Störung, erscheint die Meldung (bei `turniere` und `anlaesse` ohne Zeilen, beim Verlauf mit
    dem letzten Stand); vorher blieb die Liste ohne Meldung stehen. So verhalten sich alle
    anderen Seiten mit `+page.ts` (dort sogar mit der Fehlerseite).
  - *Vorleser:* Die Statuszeile (`role="status"`) wurde vorher nach dem Laden gefüllt und darum
    angesagt; jetzt steht die Zahl schon beim Anzeigen darin. Nicht sichtbar, aber ein Vorleser
    sagt die Zahl beim Öffnen möglicherweise nicht mehr von selbst an. Nicht geprüft.
- **Übergangsregel «Ab Schritt 15» der `CLAUDE.md` nach Lauf 2:** Für die vier Listen stimmt
  der Wortlaut jetzt (erstes Laden in `+page.ts`, im Baustein nur das erneute Laden der
  Mitgliederliste nach Eingabe). Er nennt die benannten Ausnahmen nicht: E-49 (Karte
  «Benachrichtigungen» im Profil und Push-Hinweis der Startseite laden beim Einhängen selbst; das
  widerspricht «im Baustein nur erneutes Laden») und Fall K (`willkommen/+page.ts` leitet nach dem
  Gerät zum Login; das widerspricht «keine Seite schreibt die Umleitung zum Login selbst»).
  **Nicht geändert** (Auftrag); E-49 legt die Schärfung des Wortlauts auf Schritt 24. Vorschlag
  für dann: «… Benannte Ausnahmen: E-49 und Fall K (Anhang E.5).»
- **Was kein Test sieht:**
  - die zwei Folgen aus E-48 selbst (wann die Seite erscheint, Vorladen);
  - «Beenden» im Band auf einer Liste (oben); kein E2E läuft die Ansicht auf einer Liste ab;
  - den Wechsel des Filters im Verlauf innerhalb der Seite («Alle anzeigen», Zurück): nur der
    Einstieg über «Ganzer Verlauf» (`verwaltung.test.ts:133`) und der Einheitstest der
    Ladefunktion;
  - «bei Störung bleibt der letzte Stand» im Verlauf (nur gelesen);
  - die Ansage der Statuszeile im Vorleser.
- **Fragen an den Projektleiter:** keine; die Grenzfälle oben gehen an das Review.
- **Ausserhalb des Schritts aufgefallen (nicht behoben):**
  1. **Mail-Codes in den Tests der Verwaltung:** Die Hilfe `bestaetigeVerwaltungDirekt` könnte
     in den bestehenden E2E-Tests der Verwaltung den Mail-Code ersetzen, wo der Test nicht die
     Bestätigung selbst prüft (weniger Mails in Mailpit, kürzere Läufe). Kandidat für Schritt 20
     oder die Zwischenrevision der Etappe 2; die Bestätigung per Code bleibt dann in den Tests,
     die sie prüfen.
  2. **`wartetAufMitgliederliste`** (`tests/e2e/hilfen/seite.ts`) ist nach Lauf 2 beim Öffnen fast
     überflüssig (Titel und Zahl erscheinen zugleich); sie schadet nicht und hilft weiter nach
     einer Suche. Nur der Kommentar ist nachgeführt.
  3. **`$effect` mit Zeitgeber in `mitglieder`:** Der Autofixer schlägt vor, das Warten beim
     Tippen nicht im `$effect` zu führen (etwa im Ereignis der Eingabe). Das wäre ein eigener
     Umbau ohne Bezug zu diesem Schritt.
- **Review von Lauf 2 und Urteil über den ganzen Schritt 15 (14.11.2026): «ok», kein Befund vor dem
  Merge.** Eigener `make check` des Reviewers auf `d9d4ac5` grün (2412 Tests, E2E 510/57).
  `origin/dev` seit dem Merge `9ba8a8a` unverändert. Diff des Schritts: 52 Dateien, leer unter
  `src/lib/server` und `src/routes/api`.
  1. **Befund 1 (Entscheid nötig, erledigt):** «Beenden» im Band auf `turniere`, `anlaesse`,
     `verlauf` ist eine dritte sichtbare Folge ausserhalb des Wortlauts von E-48. Der
     Projektleiter hat sie am 14.11.2026 angenommen (Nachtrag bei E-48), kein Umbau.
  2. **Hinweis, Statuszeile `role="status"`:** Die Zahl steht beim Anzeigen schon da; ein
     Vorleser sagt sie beim Öffnen sehr wahrscheinlich nicht mehr von selbst an (hörbare Seite
     von Folge 1, innerhalb E-48; nicht mit einem Vorleser geprüft). Nach Suche oder Filter in
     `mitglieder` wird sie weiter angesagt. Auf `turniere` und `anlaesse` ändert sich die Zeile
     nie mehr, die Rolle ist dort wirkungslos: Kandidat für die Zwischenrevision der Etappe 2.
  3. **Hinweis, `verlauf/+page.svelte`:** Die Ableitung «letzter Stand bleibt» schreibt in eine
     gewöhnliche Variable (`$derived.by` mit Seiteneffekt). Funktioniert, kein Test hält es;
     bei Schritt 16 oder 17 prüfen, ob es ohne Seiteneffekt geht.
  4. **Hinweis:** Dieses Protokoll nennt für `git diff --stat a021425 HEAD` zwölf Dateien; mit
     dem Dokument sind es dreizehn.
  - **Was kein Test sieht:** «Beenden» im Band auf einer der vier Listen; der Filterwechsel im
    Verlauf innerhalb der Seite und «letzter Stand bleibt»; die Mitgliederliste nach
    `refreshAll` mit aktiver Suche; die Folgen aus E-48 und die Ansage der Statuszeile; die
    Reihenfolge der Umleitungen von Layout und Seite bei einer Rolle ohne Bereich.
  - **Nicht geprüft vom Reviewer:** kein Vorleser, Befund 1 und das Vorladen nicht im Browser
    nachgestellt, Rot-Proben nicht wiederholt, CI nicht angesehen.
  - **E-50:** vom Projektleiter am 14.11.2026 bestätigt.

### E.10 Nachmessen Schritt 16

**Nachmessen vor Schritt 16** (14.11.2026, Worktree `refactor/schritt-16` auf `86f6430` =
`origin/dev`, Version 0.22.1; nur gelesen und gezählt, kein `make check`, kein E2E, keine
Datenbank). Ganz gelesen [G]: `src/routes/clubmeisterschaft/[id]/+page.svelte`,
`…/doppel/[kid]/+page.svelte`, `src/lib/cm/api.ts`, `src/lib/login/waechter.ts`,
`src/lib/verwaltung/Aktionsdialog.svelte`, `tests/e2e/cm-doppel.test.ts`, der erste Test von
`cm-anmeldung.test.ts`. In Auszügen [E]: `cm-verwaltung.test.ts:189–232`,
`cm-doppel-verwaltung.test.ts:340–362`, `navigation.test.ts:265–328`, `waechter.test.ts:364–417`,
`Anmeldungsliste.svelte` (`fuehreAus`), `vitest.config.ts`, `src/lib/fehler.ts`.

**Kurz:** Die Plan-Zeile stimmt in der Sache. Kein Entscheid des Projektleiters nötig, keine neue
Frage. Vier Dinge gehen der Zeile vor: (1) Die Funktion passt für **sieben** der acht Handler ohne
Rest; `angabenSenden` weicht in vier Punkten ab. (2) Die **Doppel-Seite wird aufgenommen**, als
zweiter Teil mit eigener Abbruchstelle, sofern die Funktion «Folge je Wort» als Angabe nimmt.
(3) Den **Fokus nach einer Aktion hält heute genau eine Stelle** in E2E, und die nur lose; vier der
acht Handler haben gar keinen E2E-Fall. Es braucht Vorab-E2E über die Einheitstests hinaus.
(4) «Rund 250 Zeilen» ist zu hoch gegriffen, eher 170 bis 210 [V].

#### 1 CM-Seite heute (nach Schritt 15 und #81)

- **Zahlen [G]:** 1039 Zeilen (Plan: 1038; eine Import-Zeile mehr aus Schritt 15), Skript 1–479.
  Acht Handler, die eine Anfrage schicken; **neun** Aufrufe `leiteUmNachAktion(` (acht Handler plus
  `neuLaden`, Zeilen 138, 165, 229, 270, 302, 348, 388, 419, 464); drei rohe Dialoge
  (`kontaktHinweis`, `wildcardDialog`, `suchtextDialog`); neun `{#snippet}`. Die acht Handler
  messen zusammen **266 Zeilen** (27 + 49 + 31 + 27 + 38 + 29 + 27 + 38), nicht «rund 330» (B-22);
  330 kommt nur mit den Hilfen (`uebernimm`, `neuLaden`, `fokusBei`, `fokusNachAnfrage`,
  `…Tippen`, `…Oeffnen`) zusammen. Die zwei Text-Dialoge messen 80 Zeilen Markup (678–757).
- **Seit der Plan-Zeile berührt [G: `git log` je Datei]:** nur `edf6914` (Schritt 15: Aufruf der
  Aktions-Hülle statt `goto('/login')`, 19 bzw. 11 Zeilen). #81 hat keine der beiden Seiten und
  nichts unter `src/lib/cm/` angefasst.
- **Gemeinsames Gerüst der sieben Handler mit `switch`** (`wildcardSenden`, `anmelden`,
  `abmelden`, `annehmen`, `ablehnen`, `zurueckziehen`, `suchtextSenden`) [G]: `if (laeuft) return`
  → `laeuft = true` → `meldung = null`, `fehler = null` → Abruf → **`laeuft = false` vor der
  Folge** → nach `art`. Die Sperre muss vor der Folge fallen: `fokusBei` setzt den Fokus auf eine
  Taste mit `disabled={laeuft}`; eine gesperrte Taste nimmt keinen Fokus.

  | Handler | Abruf (`src/lib/cm/api.ts`) | `ok` | Wort mit Satz, dann `neuLaden` | Wort still, dann `neuLaden` | `eingabe` | sonst | Fokus danach | E2E |
  |---|---|---|---|---|---|---|---|---|
  | `anmelden` | `meldeAn` | `uebernimm`, Meldung «Angemeldet für …» | `voll`, `geschlossen`, `passt-nicht` (`FEHLER`) | `schon-angemeldet`, `angaben-fehlen`, `nicht-gefunden` | Störung | Störung auf der Seite | `ok`: `fokusBei(k.id)` (neue Taste «Abmelden»); Fehler: keiner | `cm-anmeldung:140–168`, `navigation:297` (lädt nicht neu), `waechter:364` (abgemeldet). Fokus: **kein Test** |
  | `abmelden` | `meldeAb` | `uebernimm`, «Abgemeldet von …» bzw. «Antrag für … zurückgezogen.» | `geschlossen` | `nicht-gefunden` | Störung | Störung | `ok`: `fokusBei(k.id)` | `cm-anmeldung:176`, `cm-doppel:333` (nur der Satz «Abgemeldet»). Variante Wildcard («Zurückziehen») und Fokus: **kein Test** |
  | `annehmen` | `nimmAnfrageAn` | `uebernimm`, «Angemeldet mit … für …» | `voll`, `geschlossen`, `passt-nicht`, `schon-angemeldet` (`ANNEHMEN_FEHLER`), `hinfaellig` | `angaben-fehlen`, `nicht-gefunden` | Störung | Störung | `ok`: `fokusNachAnfrage(kategorieId)`; Fehler mit Neuladen: `fokusNachAnfrage()` | `cm-doppel:196`, `:311`. Fokus: **kein Test** |
  | `ablehnen` | `lehneAnfrageAb` | `uebernimm`, «Anfrage von … abgelehnt.» | `geschlossen` | `nicht-gefunden` | Störung | Störung | immer `fokusNachAnfrage()` (nächste Anfrage-Karte, sonst Titel «Deine Angaben», sonst Seitentitel) | `cm-doppel:378–385`: einzige Fokus-Prüfung, nur «nicht `BODY`» |
  | `zurueckziehen` | `zieheAnfrageZurueck` | `uebernimm`, «Anfrage an … zurückgezogen.» | `geschlossen` | `nicht-gefunden` | Störung | Störung | `ok`: `fokusBei(k.id)` (im Doppel der Link «Anmelden») | **kein Test** (`cm-doppel:170` sieht die Taste nur) |
  | `wildcardSenden` | `beantrageWildcard` | `uebernimm`, **dann** Dialog zu, «Wildcard beantragt. …» | `voll`, `geschlossen`, `keine-wildcard`, `passt-nicht`; Dialog zu | `schon-angemeldet`, `angaben-fehlen`, `nicht-gefunden`; Dialog zu | Satz am Feld (`felder.kommentar`, sonst Störung), Fokus ins Feld, Dialog bleibt | Störung **am Feld**, Dialog bleibt, kein Fokuswechsel | `ok`: `fokusBei(k.id)` (neue Taste «Zurückziehen») | `cm-verwaltung:220–232` (nur der gute Weg). Leerer Kommentar, Fehler, Fokus: **kein Test** |
  | `suchtextSenden` | `setzeSuchtext` | Dialog zu, **dann** `uebernimm`, «Kommentar gespeichert.» | `geschlossen`; Dialog zu | `nicht-gefunden`; Dialog zu | Satz am Feld (`felder.suchtext`), Fokus ins Feld | Störung am Feld | `ok`: `fokusBei(k.id)`; das ist in `eigeneSuche` die Taste **«Abmelden»**, nicht «Kommentar ändern» | **kein Test**: `cm-doppel:270` sieht nur die Taste; der Dialog wird in keinem E2E geöffnet |

  Bei `abgemeldet` rufen alle `leiteUmNachAktion(r)` (Fall C, nur Login). Den Rückgabewert von
  `neuLaden` wertet keiner der sieben aus. «sonst» fängt auch die Wörter der Liste `ABLEHNUNGEN`,
  die der Handler nicht nennt (etwa `voll` beim Abmelden): Störung.
- **`angabenSenden` weicht ab [G]** (Zeilen 142–168): (a) die Sperre hält **bis zum Ende**, auch
  über `neuLaden` und den Fokus; (b) `meldung` wird nicht geleert, dafür `feldFehler`; (c) `ok`
  liefert keine Ansicht, darum `neuLaden` mit ausgewertetem Ergebnis (nicht geladen → Störung,
  auch wenn `neuLaden` gerade zur Startseite oder zum Login wechselt); (d) kein Wort mit Satz:
  alles ausser `ok`, `eingabe`, `abgemeldet` ist Störung. Fokus: `ok` → Seitentitel, `eingabe` →
  erstes Feld mit Fehler. E2E: `cm-anmeldung:121–123` (guter Weg); Feldfehler und Fokus: kein Test.
  **Folge:** Die Funktion nimmt ihn nur, wenn «Sperre bis zum Ende» eine Angabe ist, die kein
  anderer Handler braucht. Sonst bleibt er von Hand und der Bericht nennt «sieben plus einer»;
  die Sperre für ihn früher zu lösen wäre eine Verhaltensänderung (zweites Absenden während des
  Neuladens möglich) und ist nicht erlaubt.
- **Die zwei Text-Dialoge [G]:** gleiche Verschachtelung (`dialog.karte` › `h2`, `p.leise`, `form
  novalidate` › `div.feld` › `label`, `span.feld-hilfe`, `textarea`, `span.feld-hilfe` (Zähler),
  `p.fehler[role=alert]`; `div.leiste` mit «Abbrechen» und Haupttaste). Unterschiede: Titel,
  Beschriftung (einmal mit `<span class="leise">(freiwillig)</span>`, also kein reiner Text),
  Hinweistext, `rows` 4/3, `maxlength` 300/120, `required` nur bei der Wildcard, Zähler-Funktion,
  Text der Haupttaste, die `id`s (`cm-kommentar-hilfe` gegen `cm-suchtext-zaehler`). Nur die
  Wildcard prüft vor dem Senden auf leer (ohne Anfrage; Satz und Fokus ins Feld). Die Reihenfolge
  in `aria-describedby` ist bei beiden gleich (Hinweis, Zähler, Fehler). Das Feld «Kommentar
  (freiwillig)» der Doppel-Seite (`kommentarEingabe`) ist dasselbe Feld ohne Dialog; es bleibt
  von Hand (E-20: kein Baustein «Feld»).
- **Beobachtungen, nicht zu ändern (Feature-Stopp), nur festhalten:** Nach «Kommentar gespeichert»
  steht der Fokus auf «Abmelden». Nach einem Fehler mit Neuladen bei `anmelden`, `abmelden`,
  `zurueckziehen` setzt niemand den Fokus; verschwindet dabei die Taste, fällt er in den
  Seitenkörper (WCAG 2.4.3) [V: gelesen, nicht im Browser nachgestellt]. Die Tabelle `FEHLER`
  steht mit denselben drei Sätzen auch in der Doppel-Seite.

#### 2 Doppel-Seite: aufnehmen

- **Zahlen [G]:** 426 Zeilen, **fünf** Aufrufe `leiteUmNachAktion(` (Zeilen 78, 132, 155, 204,
  248): `suchen`, `neuLaden` und drei Handler mit Sperre (`anfrageSenden`, `zurueckziehen`,
  `alleinAnmelden`; zusammen 110 Zeilen).
- **Deckt sich:** Sperre → Abruf → Sperre lösen → `switch` über `art` → `abgemeldet` an den
  Wächter, Wörter mit Satz (`FEHLER`), stille Wörter, `eingabe` am Feld, sonst Störung. Derselbe
  Typ `Ergebnis<CmAnsicht>`, dieselben Abruf-Funktionen (`meldeAn`, `zieheAnfrageZurueck`).
- **Weicht ab, genau:**

  | Handler | Abweichung vom Gerüst der CM-Seite |
  |---|---|
  | `anfrageSenden` | leert `meldung`/`fehler` nicht (das tut `anfragenTippen` beim Öffnen); schliesst die Rückfrage **vor** jeder Verzweigung, auch bei Störung; `ok` verlässt die Seite (`zurCmSeite` mit Satz im Seitenzustand `cmMeldung`); `schon-angefragt`, `passt-nicht`, `nicht-gefunden`: Satz mit Namen, danach **`suchen(true)` statt `neuLaden`**; `anfrage-offen`: still `neuLaden` |
  | `zurueckziehen` | `ok`: Ansicht übernehmen, Vorgeladenes verwerfen, **Trefferliste von Hand nachführen**, Fokus auf die Taste des Treffers; `nicht-gefunden`: still `suchen(true)` statt `neuLaden` |
  | `alleinAnmelden` | schliesst zuerst den Hinweis; `ok`: `kommentar = ''` (sonst fragt der Zurück-Link nach Ungespeichertem, `navigation:265`), dann `zurCmSeite`; `eingabe` am Feld mit Fokus; Störung **auf der Seite**, nicht am Feld |
  | `suchen` | keine Aktion: keine Sperre, 250 ms, Abbruch veralteter Anfragen, eigener Merker `suchFehler`. **Bleibt von Hand** |
  | `neuLaden` | führt zur CM-Seite, wenn die Kategorie nicht mehr zur Wahl steht (`doppelZurWahl`). **Bleibt von Hand** |

- **Urteil:** Dieselbe Funktion passt für die drei Handler, **wenn** sie zwei Dinge als Angabe
  nimmt statt fest eingebaut: was bei `ok` geschieht (die Seite gibt es mit) und **je Wort: Satz
  oder keiner, und was danach geschieht** (Standard: neu laden; auf der Doppel-Seite an vier
  Stellen «Suche neu»). Beides braucht die CM-Seite ohnehin (`annehmen`/`ablehnen` setzen nach dem
  Neuladen den Fokus, die anderen nicht). Eine nur auf `uebernimm` und `fokusBei` zugeschnittene
  Funktion passte nicht.
- **Empfehlung: aufnehmen**, als zweiter Teil nach der grünen CM-Seite, mit eigenen Commits.
  Gründe: (1) gleiche Fachsache, gleicher Ergebnis-Typ, gleiche Sätze; bliebe sie liegen, wäre sie
  nach Schritt 17 die eine Seite der CM mit Sperre und Verzweigung von Hand, gegen die
  Übergangsregel «Ab Schritt 17». (2) Die Seite steht in keinem anderen Schritt (P-16). (3) Kein
  sichtbares Verhalten ändert sich. **Dagegen spricht:** Der Gewinn ist klein (rund 40 bis 50
  Zeilen [V]), und das Netz ist dünner als bei der CM-Seite (unten). Darum die Abbruchstelle:
  Braucht die Funktion für die Doppel-Seite eine Angabe, die kein Handler der CM-Seite nutzt, wird
  die Doppel-Seite **ausdrücklich verworfen** und der Bericht sagt es; Teil 1 geht dann allein.
- **E2E der Doppel-Seite heute [G]:** `anfrageSenden` guter Weg (`cm-doppel:152–168`, `:301–307`,
  `cm-doppel-verwaltung:340–344`); `alleinAnmelden` guter Weg mit Hinweis (`cm-doppel:255–264`);
  `suchen` bei `abgemeldet` (`waechter:393`); ungespeicherter Kommentar (`navigation:265`).
  **Kein Test:** `zurueckziehen` (die Taste wird nur gesehen, `cm-doppel-verwaltung:357`), jeder
  Fehlerzweig, jeder Fokus.

#### 3 Absicherung

- **Was trägt [G]:** der gute Weg von sechs der acht Handler der CM-Seite (Tabelle oben), «lädt
  nicht neu» für `anmelden` (`navigation:297–328`: keine Anfrage an `/api/cm` und
  `/api/cm/<id>`), `abgemeldet` für `anmelden` (`waechter:364`), die Konsolenfehler-Prüfung in
  allen diesen Tests, das Bild der Dialoge (`pruefeBildschirm` «cm-wildcard-antrag»).
- **Wo kein Test hinsieht [G]:** `suchtextSenden` und `zurueckziehen` ganz; die Wildcard mit
  leerem Kommentar; **jeder** Fehlerzweig aller acht Handler (kein `page.route` auf `/api/cm/…`
  ausser `navigation:60`); die Feldfehler der Angaben; **der Fokus nach jeder Aktion ausser
  «Ablehnen»**, und dort nur «nicht im Seitenkörper». Der Hinweis «Den Fokus … hält nur fest, wo
  ein E2E ihn prüft [V]» ist damit gemessen: eine Stelle.
- **Folge: Vorab-E2E sind nötig.** Die Einheitstests der Funktion sehen weder Fokus noch die
  Reihenfolge «Dialog zu, Ansicht übernehmen, Fokus» im Browser; genau dort liegt das Risiko der
  Zeile (WCAG 2.4.3). Es gibt kein Werkzeug für Bausteine ohne Browser (`package.json`: Vitest und
  Playwright, keine Testbibliothek für Svelte-Bausteine [G]); der neue Dialog-Baustein ist nur
  über E2E prüfbar.
- **Vorschlag Vorab-E2E** (neue Datei `tests/e2e/cm-ablauf.test.ts`, damit `cm-anmeldung.test.ts`
  für Schritt 17 unberührt bleibt; nur Handy wie die anderen `cm-*`; Anmelden mit Brief-Code wie
  bisher, **kein Mail-Code**; Vorbedingungen über die vorhandenen Hilfen `stelleAnfrageDirekt`,
  `beantrageWildcardDirekt`, `setzeSpielerangaben`; Fehlerzweige mit `page.route` auf die eine
  Schreib-Adresse, Status nach `STATUS_DES_WORTS`; Fokus mit `toBeFocused()` auf Rolle und
  Beschriftung). Vier gebündelte Tests statt zwölf einzelner (weniger Anmeldungen, weniger Zeit):

  | Test | Fälle (alle halten den heutigen Stand fest) |
  |---|---|
  | T1 Einzel und Wildcard | «Anmelden» (über den Hinweis) → Fokus auf «Abmelden» derselben Karte; «Abmelden» → Fokus auf «Anmelden». Wildcard: leerer Kommentar → Satz «Bitte schreib kurz …», Fokus im Feld, keine Anfrage; mit Text → Dialog zu, Fokus auf «Zurückziehen» der Karte; «Zurückziehen» → «Antrag für … zurückgezogen.», Fokus auf «Wildcard beantragen». Gestellt: Anmelden mit `geschlossen` → `alert` mit dem Satz und genau eine Anfrage `GET /api/cm/<id>`; Anmelden mit 503 → Störung auf der Seite, kein Neuladen; Wildcard mit 503 → Störung **im** Dialog, Dialog offen; Wildcard mit `geschlossen` → Dialog zu, `alert` auf der Seite |
  | T2 Allein im Doppel | (allein angemeldet über die Doppel-Seite) «Kommentar ändern» → Feld mit dem alten Text; gestellt `eingabe` mit `felder.suchtext` → Satz am Feld, Fokus im Feld, Dialog offen; echt speichern → Dialog zu, «Kommentar gespeichert.», neuer Text in der Karte, Fokus auf «Abmelden» |
  | T3 Anfragen | eigene Anfrage auf der CM-Seite «Zurückziehen» → Satz, Fokus auf dem Link «Anmelden» der Doppel-Karte. Zwei Anfragen an mich: erste «Ablehnen» → Fokus auf der Überschrift der verbleibenden Anfrage; «Annehmen» → Fokus auf «Abmelden» der eigenen Paar-Karte. Gestellt: «Annehmen» mit `hinfaellig` → «Diese Anfrage gilt nicht mehr.» |
  | T4 Doppel-Seite (nur für Teil 2) | «Zurückziehen» in der Trefferliste → Satz, Taste heisst «Anfragen», Fokus darauf, **keine** Anfrage `GET /api/cm/<id>`. Gestellt: «Anfrage senden» mit `schon-angefragt` → Rückfrage zu, `alert` «Du hast … schon angefragt.», Seite bleibt, eine neue Suche folgt; «Allein anmelden» mit `eingabe` → Satz am Feld, Fokus im Feld |

  Jeder Test muss auf dem alten Stand grün sein und einmal rot werden (Mutation aus einer
  Sicherungskopie, kein `git checkout`). Zeigt ein Fall ein anderes heutiges Verhalten als hier
  gelesen, gilt das gemessene und der Bericht nennt es. Zeitgrenze wie die Nachbarn
  (`test.setTimeout(90_000)`), der Lauf im Hintergrund.
- **Einheitstests der Funktion** (`src/lib/cm/ablauf.test.ts`, vor der Funktion, ohne Browser):
  `ok` ruft die Folge der Seite und **nicht** das Neuladen; Wort mit Satz → Satz, dann Folge des
  Worts; stilles Wort → nur die Folge; unbekanntes Wort und `stoerung` → Störung am genannten Ort;
  `eingabe` mit und ohne Feld-Folge; `abgemeldet` → Wächter, kein Satz, kein Neuladen; zweiter
  Aufruf während des ersten tut nichts; Meldung und Fehler sind vor dem Abruf geleert; **die
  Sperre ist gelöst, bevor die Folge läuft**. Die Funktion bekommt Sperre, Meldung, Fehler,
  Neuladen und Wächter hineingereicht; so braucht der Test `$app/navigation` nicht zu stellen
  (sonst wie `src/lib/login/waechter.test.ts` mit `vi.mock`). `src/lib/cm/**` zählt heute nicht
  zur Abdeckung (`vitest.config.ts`, `coverage.include`); ob `ablauf.ts` dort wie `abruf.ts`
  aufgenommen wird, entscheidet der Schritt (eine Zeile, eine Datei mehr).

#### 4 Abgrenzung zu Schritt 17

- **Keine gemeinsame Datei [G]:** Schritt 17 fasst `src/lib/verwaltung/Anmeldungsliste.svelte` und
  allenfalls `Aktionsdialog.svelte` an (Typ `Antwort<T>` der Verwaltung mit `warnung`/`trotzdem`,
  `leiteUm` der Verwaltung). Schritt 16 bleibt in `src/lib/cm/` und den zwei Seiten der
  Mitglieder-App (Typ `Ergebnis<T>`, `leiteUmNachAktion`).
- **Gehört in 16:** die Ablauf-Funktion der CM, der Text-Dialog (zwei gleiche Dialoge mit einem
  Textfeld in einem `<form>`), die drei Handler der Doppel-Seite, auf Wunsch die eine Tabelle
  `FEHLER` für beide Seiten.
- **Gehört nicht in 16:** `Aktionsdialog` anfassen, verschieben oder für die Mitglieder-App
  öffnen; den Text-Dialog auf `Aktionsdialog` bauen (er hat kein `<form>`, zöge Typen und
  Umleitung der Verwaltung in die Mitglieder-App und änderte das Markup); die Ablauf-Funktion so
  allgemein machen, dass sie `fuehreAus` ersetzt (Schritt 17 ersetzt `fuehreAus` durch den
  Baustein). Die Rückfragen ohne Textfeld (`kontaktHinweis` auf beiden Seiten, «… anfragen?» auf
  der Doppel-Seite) bleiben rohe Dialoge; kein Schritt nennt sie, Kandidat für die
  Zwischenrevision der Etappe 2.
- **Nach beiden Schritten gibt es zwei Abläufe,** einen je App (`Aktionsdialog` in der
  Verwaltung, `ablauf.ts` in der CM der Mitglieder). Das ist die Lesart der Übergangsregel «Ab
  Schritt 17» («`Aktionsdialog` oder die gemeinsame Ablauf-Funktion») [V: Wortlaut]; Schritt 24
  kann den Wortlaut schärfen.
- **Merkpunkt «Abmelden mit erfundenem Ergebnis»** (`profil/+page.svelte`): berührt 16 nicht; die
  Funktion reicht dem Wächter nur echte Ergebnisse. **Merkpunkt `verlauf/+page.svelte`** aus dem
  Review von Schritt 15 («bei Schritt 16 oder 17 prüfen»): liegt in keiner Datei von 16 und in
  keiner von 17; gehört zur Zwischenrevision der Etappe 2.

#### 5 Überholt oder zu berichtigen

1. «statt neun eigener Stellen» (Zeile 16, P-16): Die neun Stellen rufen seit Schritt 15 schon
   den Wächter. Schritt 16 zieht acht der neun Aufrufe in die Funktion; der in `neuLaden` bleibt.
2. «acht Handler als eine Funktion»: sieben sicher, `angabenSenden` nur mit eigener Angabe
   (oben). «Rund 250 Zeilen»: Handler 266 → etwa 110 bis 130, Dialoge 80 → etwa 30, dazu ein
   Dutzend Zustandszeilen; eher **170 bis 210** in der Seite [V]. Die Zeile setzt kein Ziel für
   die Zeilenzahl; nur die Erwartung ist zu berichtigen.
3. B-22 «rund 330 Zeilen» meint die Handler samt Hilfen; die Handler allein sind 266.
4. Prüfliste (b), für 16 nachgeprüft [G]: `navigation:297` (Anfragen in `:312–316`, Erwartung
   `:326`), `.karte` in `cm-anmeldung:70`, `cm-doppel:106`, `navigation:318`, `.karte-kopf
   .plakette` in `cm-anmeldung:74`, `cm-doppel:266`, `:317`: alle Zeilen stimmen.
5. Seit Schritt 13 heisst das Ergebnis `art`, die Ablehnungsgründe stehen in
   `src/lib/cm/ablehnung.ts`; die Tabelle «Wort → Satz» der Funktion lässt sich daran binden.

#### 6 Schnitt

**Ein Branch, ein Merge, zwei Teile, ein Review am Ende** (Opus, Subagent, wie die Zeile). Vor dem
Code die Svelte-Doku über den Svelte-MCP-Server (Baustein mit `bind:this` und exportierter
Funktion wie `Aktionsdialog.oeffne`, `$bindable`, Snippet für die Beschriftung).

| Nr. | Commit | Inhalt |
|---|---|---|
| 1 | `test:` | Vorab-E2E T1 bis T3 in `tests/e2e/cm-ablauf.test.ts`; auf dem alten Stand grün, je Test einmal rot |
| 2 | `refactor:` | `src/lib/cm/ablauf.ts` mit `ablauf.test.ts` (Tests zuerst); noch von keiner Seite benutzt |
| 3 | `refactor:` | CM-Seite: die sieben Handler auf der Funktion; `angabenSenden` nach der Regel oben. Sätze, Reihenfolge «Dialog zu / übernehmen» je Handler und Fokusziele unverändert |
| 4 | `refactor:` | Text-Dialog als Baustein unter `src/lib/cm/` (Vorschlag `Textdialog.svelte`), die zwei Dialoge der CM-Seite darauf; Klassen, Verschachtelung, `required`, `rows`, Reihenfolge in `aria-describedby` gleich. Die `id`s dürfen aus einem Präfix entstehen, wenn Beschriftung und Beschreibung gleich verknüpft bleiben |
| — | | **Teil 1 fertig:** voller `make check` |
| 5 | `test:` | Vorab-E2E T4 (Doppel-Seite), auf dem Stand nach Commit 4 grün, einmal rot |
| 6 | `refactor:` | Doppel-Seite: `anfrageSenden`, `zurueckziehen`, `alleinAnmelden` auf der Funktion; `suchen` und `neuLaden` bleiben; die Tabelle `FEHLER` einmal unter `src/lib/cm/` |
| 7 | `docs:` | dieses Dokument (Ergebnis in 7.4, Protokoll E.11, Stand); voller `make check` auf dem committeten Stand |

**Abbruchstellen:**

1. Ein Vorab-Fall ist auf dem alten Stand nicht grün zu bekommen, ohne die App zu ändern →
   Erwartung an das gemessene Verhalten angleichen und nennen; ist das Verhalten nicht stabil
   (Flake), den Fall streichen und als Lücke melden, nicht mit Wartezeit stopfen.
2. Die Funktion braucht für einen Handler eine Angabe, die sonst keiner nutzt → dieser Handler
   bleibt von Hand, benannt (gilt für `angabenSenden`).
3. Ein Fokus-Fall wird nach Commit 3 oder 4 rot und ist nur mit geänderter Reihenfolge oder
   einem zusätzlichen `tick` an anderer Stelle zu retten → den Handler zurücknehmen und melden.
4. Der Baustein kann das Markup eines der zwei Dialoge nicht gleich erzeugen (etwa die
   Beschriftung mit dem `span`) → Commit 4 entfällt, die Dialoge bleiben; Teil 1 gilt trotzdem.
5. Teil 2 braucht eine neue Angabe an der Funktion oder T4 ist nicht stabil → Doppel-Seite
   ausdrücklich verwerfen, Commits 5 und 6 nicht mergen.
6. Irgendeine für die Nutzerin sichtbare Änderung wird nötig → abbrechen, Frage an den
   Projektleiter (E-45).

**Proben für den Reviewer:**

- `git diff --stat origin/dev HEAD -- src/lib/server src/routes/api src/lib/design
  src/lib/verwaltung src/lib/login` → leer (kein Server, kein Stil, nichts aus Schritt 17, der
  Wächter unverändert).
- `git diff --stat <Commit 1> HEAD -- tests/e2e` → nur T4 kommt dazu; kein bestehender Test und
  kein Vorab-Fall ist nach dem Umbau geändert.
- CM-Seite: `leiteUmNachAktion(` genau einmal (`neuLaden`), dazu höchstens einmal in
  `angabenSenden`; `laeuft = true` höchstens einmal; `<dialog` genau einmal (`kontaktHinweis`);
  `{#snippet` weiter neun. Doppel-Seite: `leiteUmNachAktion(` genau zweimal (`suchen`,
  `neuLaden`).
- Jeder Satz aus `FEHLER`, `ANNEHMEN_FEHLER` und jede Meldung steht noch genau einmal im
  Quelltext (Textsuche nach den Sätzen der Tabelle in Abschnitt 1).
- Im geänderten Code kein `fetch(`, kein `goto(…/login`, kein `<style>`.
- Im Browser nachstellen, was kein Test hält: «Kommentar ändern» mit der Tastatur (Enter im
  Feld sendet nicht, die Taste «Speichern» sendet; Esc schliesst und leert das Ziel), Fokus nach
  einem Fehler mit Neuladen.

**Dateien des Schritts:** `src/routes/clubmeisterschaft/[id]/+page.svelte`,
`src/routes/clubmeisterschaft/[id]/doppel/[kid]/+page.svelte` (Teil 2), neu
`src/lib/cm/ablauf.ts`, `src/lib/cm/ablauf.test.ts`, `src/lib/cm/Textdialog.svelte`, neu
`tests/e2e/cm-ablauf.test.ts`; allenfalls `src/lib/cm/anzeige.ts` (Tabelle `FEHLER`) und
`vitest.config.ts` (Abdeckung); dieses Dokument. Keine neue Abhängigkeit, keine Migration, keine
Änderung an `CLAUDE.md`.

#### 7 Nicht geprüft, dünne Belege

- Nichts ausgeführt: kein Test, kein Browser. Alle Aussagen zum Fokus sind **gelesen**, nicht
  gesehen; besonders «Fokus auf „Abmelden“ nach dem Speichern des Kommentars» und «Fokus fällt
  nach einem Fehler mit Neuladen in den Seitenkörper» [V]. Die Vorab-E2E entscheiden.
- Ob `dialog.close()` den Fokus in WebKit und Chromium gleich an die öffnende Taste zurückgibt,
  bevor `fokusBei` läuft, ist nicht geprüft; T1 und T2 laufen auf beiden.
- Die Zeilenschätzung (170 bis 210, Doppel-Seite 40 bis 50) ist überschlagen, nicht gebaut.
- `cm-gespraech.test.ts`, `cm-verwaltung.test.ts` und `cm-doppel-verwaltung.test.ts` nur per
  Textsuche und in Auszügen; dass dort kein weiterer Fall die CM-Seite der Mitglieder bedient,
  stützt sich auf die Suche nach den Beschriftungen der Tasten [E].
- Ob das Anmelden mit Brief-Code ein eigenes Budget je Adresse hat, ist nicht nachgelesen [V];
  die vier Tests melden je ein bis drei Konten an, wie die Nachbarn.
- Die Lint-Regeln zur Importrichtung auf der Seite der Oberfläche (`src/lib/cm/` →
  `src/lib/login/`) sind nicht nachgelesen; mit hineingereichtem Wächter stellt sich die Frage
  nicht.

### E.11 Schritt 16, Teil 1

**Erkenntnisse Schritt 16, Teil 1** (14.11.2026, Branch `refactor/schritt-16` auf `b5907e3`
(Nachmessen E.10) über `86f6430` = `origin/dev`; Opus, Subagent. Nur die CM-Seite; Teil 2
(Doppel-Seite) ist nicht Teil dieses Laufs)

- **Voraussetzungen geprüft:** Branch auf `b5907e3`, Arbeitsbaum sauber, `origin/dev` enthalten;
  E.10 liegt vor (Nachmessen vorab erledigt). Die Seite stand wie in E.10 gezählt (1039 Zeilen,
  acht Handler, neun `leiteUmNachAktion(`, drei rohe Dialoge, neun `{#snippet}`). Keine neue
  Abhängigkeit, keine Lint-Ausnahme, keine Version, `CLAUDE.md` unverändert. Svelte-Doku vor dem
  Code über den Svelte-MCP-Server gelesen (`$bindable`, `$props`, `{#snippet}` samt `children`,
  `bind:` mit `bind:this` auf Bausteine und exportierten Funktionen); der Autofixer meldet am
  Baustein keinen Fehler (nur den allgemeinen Hinweis «`bind:this` liesse sich durch ein Attachment
  ersetzen», wie überall im Repo).
- **Commits** (je für sich grün im Hook):

  | Commit | Inhalt |
  |---|---|
  | `0f5330b` `test:` | Vorab-E2E T1 bis T3 in `tests/e2e/cm-ablauf.test.ts` |
  | `619edd5` `refactor:` | `src/lib/cm/ablauf.ts` mit `ablauf.test.ts` (Tests zuerst), noch unbenutzt; `vitest.config.ts`: `ablauf.ts` zählt zur Abdeckung |
  | `7c4b823` `refactor:` | CM-Seite: sieben Handler auf der Funktion, `angabenSenden` von Hand |
  | `15d20a6` `refactor:` | `src/lib/cm/Textdialog.svelte`, die zwei Text-Dialoge der Seite darauf |

- **Vorab-E2E, gemessen statt vermutet.** Zuerst ein Messlauf, der nach jeder Aktion
  `document.activeElement` ausgibt (iPhone = WebKit, Android = Chromium), dann die Tests auf das
  Gemessene. Ein früher Messwert ohne Warten auf das Neuladen («hinfällig» auf dem iPhone im
  Seitenkörper) war ein Zeitfehler der Messung; die Tests warten darum vor jeder Fokus-Prüfung nach
  einem Wort auf die Anfrage `GET /api/cm/<id>` (Zähler über `requestfinished`), nie mit fester
  Wartezeit. Gemessen gegen die Spalte «Fokus danach» der Tabelle in E.10, Abschnitt 1:

  | Handler und Fall | E.10 | gemessen (beide Geräte, wo nicht anders genannt) |
  |---|---|---|
  | `anmelden` `ok` (über den Hinweis) | `fokusBei` → «Abmelden» | «Abmelden» derselben Karte (bestätigt) |
  | `anmelden` `geschlossen` | keiner | **Seitenkörper**; genau ein Neuladen |
  | `anmelden` Störung | keiner | **Seitenkörper**; kein Neuladen |
  | `abmelden` `ok` | `fokusBei` → «Anmelden» | «Anmelden» (bestätigt) |
  | `abmelden` als Wildcard («Zurückziehen») `ok` | `fokusBei` | «Wildcard beantragen» (bestätigt); Satz «Antrag für … zurückgezogen.» |
  | `wildcardSenden` leer | Fokus ins Feld | Feld; keine Anfrage (bestätigt) |
  | `wildcardSenden` Störung | kein Fokuswechsel | Satz im Dialog, Dialog offen, kein Neuladen; Fokus **Android im Seitenkörper, iPhone auf dem Dialog** (der Test hält nur «nicht im Feld» fest) |
  | `wildcardSenden` `geschlossen` | — | Dialog zu, Satz auf der Seite, ein Neuladen, **Seitenkörper** |
  | `wildcardSenden` `ok` | `fokusBei` → «Zurückziehen» | «Zurückziehen» (bestätigt) |
  | `suchtextSenden` `eingabe` | Fokus ins Feld | Feld, Dialog offen (bestätigt) |
  | `suchtextSenden` `ok` | «Abmelden», nicht «Kommentar ändern» [V] | **«Abmelden»** (bestätigt) |
  | `zurueckziehen` `ok` | Link «Anmelden» der Doppel-Karte | Link «Anmelden» (bestätigt) |
  | `annehmen` `hinfaellig` | `fokusNachAnfrage()` | Titel der **ersten** Anfrage-Karte; die Anfrage steht noch |
  | `ablehnen` `ok` | nächste Anfrage-Karte | Titel der verbleibenden Anfrage (bestätigt; bisher prüfte E2E nur «nicht im Körper») |
  | `annehmen` `ok` | `fokusNachAnfrage(kategorieId)` | «Abmelden» der eigenen Paar-Karte (bestätigt) |

  **Warum der Seitenkörper** (anders als in E.10 vermutet, dort «verschwindet dabei die Taste»):
  Die auslösende Taste hat `disabled={laeuft}` und verliert den Fokus schon, während die Anfrage
  läuft; das gilt auch, wenn sie danach stehen bleibt. Aus demselben Grund geht der Fokus nach
  «hinfällig» nicht zurück auf «Annehmen», sondern `fokusNachAnfrage()` findet den Körper und
  nimmt den ersten Titel.
- **Abweichungen vom Vorschlag der Vorab-E2E (E.10, Abschnitt 3):** (1) Die Tests heissen nach
  ihrem Inhalt, nicht T1 bis T3. (2) T2: «allein angemeldet» über die Fachlogik (`meldeZurCmAn` mit
  Kommentar) statt über die Doppel-Seite; die Doppel-Seite gehört zu Teil 2. (3) T3: zwei
  Doppel-Kategorien (eigene Anfrage in der einen, zwei Anfragen an mich in der anderen); «hinfällig»
  läuft vor dem Ablehnen, sein Fokus ist zusätzlich festgehalten. (4) T1: die gestellten
  Wildcard-Fehler vor dem echten Antrag (danach gäbe es die Taste nicht mehr); zusätzlich «Störung
  zeigt keine Meldung» (`role="status"` leer). (5) Gestellte Antworten mit `page.route(…, { times:
  1 })`, die Konsole lässt nur die gestellten 503 durch (wie `waechter.test.ts`, Teil 4). Kein
  Mail-Code, Zeitgrenze 90 s; die Datei läuft auf beiden Geräten zusammen in rund 15 s.
- **Rot-Proben:** *E2E:* Seite aus einer Sicherungskopie dreifach mutiert (`fokusBei` nach dem
  Anmelden, `fokusBei` nach dem Speichern des Kommentars, `fokusNachAnfrage` nach dem Ablehnen
  entfernt) → **6 von 6 rot** (je Test und Gerät an der erwarteten Zeile: `toBeFocused` auf
  «Abmelden», auf «Abmelden» der eigenen Karte, auf dem Titel der verbleibenden Anfrage); danach die
  Sicherungskopie zurück, Arbeitsbaum ohne Diff. *Einheitstests:* ohne `ablauf.ts` rot (Modul
  fehlt); mit `ablauf.ts` 15 grün; Mutation «Sperre erst am Ende lösen» (`try … finally`) → die drei
  Fälle «die Sperre ist gelöst, bevor die Folge läuft» rot, die übrigen zwölf grün. *Auf dem alten
  Stand:* die drei E2E dreimal hintereinander grün (18 von 18).
- **Die Funktion, Angaben:** `abruf`, `ok`, `woerter` (je Wort Satz oder `null`), `vorher`,
  `vorWort`, `danach`, `eingabe`, `stoerung`. Jede wird von der CM-Seite gebraucht: `vorher` und
  `stoerung` von den zwei Dialogen (Satz am Feld leeren, Störung am Feld), `vorWort` von denselben
  (Dialog zu vor dem Satz, Reihenfolge wie vorher), `danach` von `annehmen` und `ablehnen`
  (Neuladen, dann `fokusNachAnfrage()`), `eingabe` von den Dialogen. Nichts nur für die
  Doppel-Seite. **`danach` gilt je Aktion, nicht je Wort:** Die CM-Seite braucht kein Wort mit
  eigener Folge. E.10 nennt für die Doppel-Seite «je Wort … was danach geschieht» (`anfrageSenden`:
  drei Wörter `suchen(true)`, `anfrage-offen` still `neuLaden`; `zurueckziehen`: `nicht-gefunden`
  `suchen(true)`). Ob Teil 2 dafür eine neue Angabe braucht (etwa das Wort als Argument von
  `danach`), ist **vor Teil 2 gegen Abbruchstelle 5 zu prüfen**; hier nicht gebaut.
- **Abbruchstellen:** (2) **eingetreten wie vorhergesagt**: `angabenSenden` bleibt von Hand
  («sieben plus einer»); die Sperre dort fällt weiter erst am Ende. (1), (3), (4) und (6) nicht
  eingetreten: Alle Vorab-Fälle waren auf dem alten Stand stabil grün; kein Fokus-Fall wurde nach
  Commit 3 oder 4 rot, kein zusätzliches `tick`; der Baustein erzeugt die Beschriftung mit dem
  `span` gleich (Inhalt als `children`, kein `{#snippet}` in der Seite).
- **Markup gleich, nachgewiesen:** Ein Probelauf (nicht committet) schrieb `main` der CM-Seite in
  sieben Zuständen (Wildcard offen, leer, Störung, beantragt; Doppel mit Anfrage; Kommentar mit
  Feldfehler; nach «Abbrechen») auf beiden Geräten heraus, ohne Kommentarknoten, Ziffern und
  Zufallsteile vereinheitlicht. Nach Commit 3: **kein Unterschied**. Nach Commit 4 nur: (a) die
  `id`s aus dem Präfix (`wildcard-titel` → `cm-kommentar-titel`, `cm-kommentar-hilfe` →
  `cm-kommentar-zaehler`, `cm-fehler-kommentar` → `cm-kommentar-fehler`, ebenso `suchtext-titel` →
  `cm-suchtext-titel`, `cm-fehler-suchtext` → `cm-suchtext-fehler`; Beschriftung, Titel und
  Beschreibung gleich verknüpft, keine `id` sonst verwendet); (b) die Reihenfolge der Attribute
  `required`/`maxlength` und `role`/`id`; (c) der Hinweistext der Wildcard steht ohne den
  Zeilenumbruch und die Tabulatoren aus dem Quelltext im DOM (vorher brach Prettier den Text im
  `span`); sichtbar und vorgelesen gleich, weil Weissraum zusammenfällt.
- **Proben für den Reviewer (E.10, Abschnitt 6), selbst gezählt:** Diff unter `src/lib/server`,
  `src/routes/api`, `src/lib/design`, `src/lib/verwaltung`, `src/lib/login` leer; unter
  `tests/e2e` nur die neue Datei. CM-Seite: `leiteUmNachAktion(` **zweimal** (`neuLaden`,
  `angabenSenden`; der Wächter geht als `waechter: leiteUmNachAktion` ohne Aufruf in `seite`),
  `laeuft = true` einmal (`angabenSenden`), `<dialog` einmal (`kontaktHinweis`), `{#snippet` neun.
  Jeder Satz aus `FEHLER`, `ANNEHMEN_FEHLER` und jede Meldung genau einmal im Quelltext; kein
  `fetch(`, kein `goto(…/login`, kein `<style>`. Der Browser-Test «Kommentar ändern mit der
  Tastatur» (Enter, Esc) ist nicht von Hand nachgestellt; das Markup des Formulars ist gleich
  (`<form novalidate>`, `textarea`, Taste `type="submit"`).
- **Netz zusätzlich:** alle `cm-*`-E2E, `navigation` und `waechter` nach Commit 3 grün (195 bestanden,
  42 übersprungen), nach Commit 4 die `cm-*`-E2E und `navigation` (105/42).
- **Voller `make check`** auf `15d20a6` (Commit 4): grün, 5,3 Minuten; 171 Testdateien, **2427
  Tests** (vorher 2412; +15 aus `ablauf.test.ts`), Abdeckung 96,99 % Anweisungen, 93,52 % Zweige;
  `svelte-check` 0 Fehler, 0 Warnungen; **E2E 516 bestanden, 60 übersprungen** in 3,3 Minuten
  (vorher 510/57: drei Tests mehr, je zwei Handys bestanden und am PC übersprungen).
- **Beobachtungen, nicht geändert (Feature-Stopp):**
  1. WCAG 2.4.3: Nach einem Fehler mit Neuladen und nach einer Störung (Anmelden, Wildcard
     `geschlossen`; nach E.10 ebenso Abmelden und Zurückziehen) fällt der Fokus in den
     Seitenkörper, weil die gesperrte Taste ihn verliert. Jetzt gemessen und im E2E festgehalten;
     wer es ändert, ändert den Test mit. Bei der Wildcard-Störung hängt der Fokus vom Browser ab
     (Android Körper, iPhone Dialog). Kandidat für die Zwischenrevision der Etappe 2.
     **Nachtrag 14.11.2026 (E-54):** Der E2E hält den Seitenkörper nicht mehr fest. Die drei
     Prüfungen wackelten auf der iPhone-CI (WebKit unter Linux, Lauf 43610003599) und sind mit
     Version 0.22.3 entfernt; die Messwerte «Körper» in der Tabelle oben gelten für den Mac,
     nicht als Vertrag. Möglicher nächster Wackler aus demselben Mechanismus: der Fokus nach
     «hinfällig» (Punkt 2), im roten Lauf grün; bei einem roten Lauf dort gleich verfahren.
  2. Nach «hinfällig» geht der Fokus auf den Titel der ersten Anfrage-Karte, nicht auf die Anfrage,
     die man angetippt hat (bei mehreren Anfragen). Gleiche Ursache.
  3. Ein Feldfehler bleibt im geschlossenen Dialog stehen, bis er wieder geöffnet wird (dann
     geleert); unsichtbar, nur festgehalten.
- **Nicht geprüft, dünne Belege:** Kein Browser von Hand (Tastatur im Dialog, VoiceOver). Der
  Svelte-Autofixer lief nur über den neuen Baustein, nicht über die ganze Seite; `svelte-check`
  mit `--fail-on-warnings` deckt die Seite. Teil 2 und T4 sind nicht begonnen.
- **Review von Teil 1 (14.11.2026): «ok», nichts vor dem Merge zu beheben; keine Freigabe zum
  Merge, solange Teil 2 offen ist.** Eigener `make check` des Reviewers auf `653ad0f` grün
  (2427 Tests, E2E 516/60). Sieben Handler je Zweig gleich, `angabenSenden` zeichengleich; die
  drei gemessenen Fokus-Abweichungen sind am alten Code als altes Verhalten bestätigt.
  1. **Entscheid nötig vor Teil 2 → F-30:** `danach` gilt je Aktion, die Doppel-Seite braucht es
     je Wort; nach dem Wortlaut Abbruchstelle 5.
  2. **Hinweis:** `tests/e2e/cm-ablauf.test.ts:67` sucht über `div.karte` (CSS-Klasse); in die
     Prüfliste (b) für Schritt 18 aufnehmen.
  3. **Hinweis:** `Textdialog.svelte` fehlt in der Tabelle «Code-Stelle» von `docs/ui-leitbild.md`
     (kein neues Muster; Nachtrag spätestens in Schritt 24).
  4. **Hinweis:** `Seite.meldung` in `ablauf.ts` wird nur gesetzt, nie gelesen (Getter tot).
  5. **Hinweis:** Fehlerzweige von «Abmelden» und «Zurückziehen» und der Fokus danach sind nur
     gelesen, nicht im Browser gehalten.
  - **Was kein Test sieht:** Tastatur im Textdialog (Enter, Esc), Fokus-Rückgabe bei
    «Abbrechen», `abgemeldet` in sechs der sieben Handler im Browser, die stillen Wörter und
    `voll`, `passt-nicht`, `keine-wildcard`, `schon-angemeldet`, `eingabe` der Wildcard vom
    Server, Störung im Suchtext-Dialog.
  - **Nicht geprüft vom Reviewer:** Rot-Proben und «vorab grün» nur nach E.11; kein Browser von
    Hand, kein VoiceOver; WebKit-CI nicht gelaufen.
- **Stand am Ende der Orchestrator-Session vom 14.11.2026:** Branch gepusht, Worktree
  `refactor-schritt-16` bleibt stehen. Nächster Lauf: F-30 beantworten lassen; bei A Merge von
  Teil 1 (vorher `origin/dev` einmergen und `make check`), bei B Teil 2.
- **Abschluss (14.11.2026, Orchestrator):** Der Projektleiter antwortet auf F-30 mit **A, verwerfen** (E-51). Schritt 16 endet mit Teil 1; das Review von Teil 1 gilt als Review des ganzen Schritts. `origin/dev` stand unverändert auf dem Abzweigpunkt (`86f6430`), nichts einzumergen. Merge nach `dev` als Version 0.22.2.

### E.12 Schritt 17

**Erkenntnisse Schritt 17** (14.11.2026, Branch `refactor/schritt-17` ab `origin/dev` =
`7dcb889`, Version 0.22.2; Opus, Subagent. Nur die Einzel-Anmeldungsliste; `DoppelListe.svelte`
unverändert)

- **Voraussetzungen geprüft:** 04 (Prüfliste (b), Schritt 04 erledigt) und 14 (`turnier-api.ts`
  als eigene Bereichs-Datei) sind auf `dev`; kein Nachmessen vorab verlangt. Arbeitsbaum sauber,
  Stand wie im Plan: `Anmeldungsliste.svelte` 507 Zeilen mit `fuehreAus` und fünf rohen
  `<dialog>`, `Aktionsdialog.svelte` 125 Zeilen, nur von `DoppelListe.svelte` genutzt. Keine neue
  Abhängigkeit, keine Lint-Ausnahme, keine Version, `CLAUDE.md` und UI-Leitbild unverändert.
  Svelte-Doku vor dem Code über den Svelte-MCP-Server gelesen (`bind:` samt `bind:this` auf
  Bausteine, `$props`, `{#snippet}` und `children`); der Autofixer meldet an beiden Bausteinen
  keinen Fehler (nur den allgemeinen Hinweis zu `bind:this` und Attachments, wie überall im Repo).
- **Commits** (je für sich grün im Hook):

  | Commit | Inhalt |
  |---|---|
  | `58734bc` `test:` | Vorab-E2E `tests/e2e/anmeldungsliste-ablauf.test.ts` |
  | `887be3a` `refactor:` | `Aktionsdialog`: Angaben `neben` und `ohneHaupttaste`; der Ablauf nimmt Aktion und Satz als Argument |
  | `50647ae` `refactor:` | `Anmeldungsliste.svelte`: fünf Rückfragen auf dem `Aktionsdialog` |

- **Vorab-E2E** (vier Fälle, nur Handy wie `cm-verwaltung`; der PC läuft über `turnier.test.ts`):
  (1) Von Hand anmelden: zwei Warnungen in der Reihenfolge des Servers (Satz für Satz geprüft,
  nicht als ein Text), «Trotzdem anmelden», neue Wahl verwirft die Warnungen, Störung bleibt im
  Dialog und die Taste geht wieder, neues Öffnen ohne Altlasten, Folge-Satz
  `schon-angemeldet` schliesst und lädt neu, Fokus auf dem Satz; (2) Verschieben: Warnung, neue
  Zielwahl verwirft sie, Folge-Satz `nicht-gefunden`, ohne anderes Ziel nur «Abbrechen»;
  (3) Klassierung: Taste erst bei anderer Klassierung, Störung bleibt im Dialog und bei neuer Wahl
  stehen; Löschen: Tasten «Abbrechen», «Löschen», Folge-Satz; (4) Wildcard-Antrag: Tasten
  «Abbrechen», «Ablehnen», «Bestätigen» in dieser Reihenfolge, Störung beim Ablehnen, Folge-Satz
  `nicht-beantragt`, Bestätigen. Neuladen über die Anfragen
  `GET …/kategorien/<id>/anmeldungen` gezählt, keine feste Wartezeit; gestellte Antworten mit
  `page.route(…, { times: 1 })`, die Konsole lässt nur die gestellten 503 und 404 durch;
  Verwaltung direkt in der Datenbank bestätigt, **kein Mail-Code**; Elemente über Rolle und
  Beschriftung. Rund 2,5 s je Fall.
- **Rot-Probe:** Auf dem alten Stand zwei Mutationen in `Anmeldungsliste.svelte` (Fokus auf den
  Satz nach einer Aktion entfernt; beim Wechsel des Ziels im «Verschieben» die Warnungen nicht
  mehr geleert) → **4 von 4 rot** auf dem iPhone, je an der erwarteten Zeile (`toBeFocused` in
  drei Fällen, `alert` noch da im Verschieben); danach die Datei aus dem Commit zurück. Auf dem
  alten Stand vorher grün (8 von 8, iPhone und Android), nach dem Umbau unverändert grün.
- **Netz nach dem Umbau** (alle Geräte): `anmeldungsliste-ablauf` 8 bestanden / 4 übersprungen,
  `cm-verwaltung` 13/8, `turnier` 6/0, `cm-anmeldung` 6/3, `cm-doppel-verwaltung` 15/3; keiner
  rot. `svelte-check` 0 Fehler, 0 Warnungen (1609 Dateien).
- **Entscheid Wildcard-Antrag:** Baustein erweitert (`neben`), Begründung im Ergebnis in 7.4.
  Gegen «von Hand» spricht: Der ganze Ablauf bliebe für einen Dialog als dritte Baustufe stehen,
  und die Übergangsregel «Ab Schritt 17» hätte eine zweite benannte Ausnahme. Die Nebentaste ist
  wie die Haupttaste an `bereit` gebunden (beim Wildcard-Antrag immer frei, also wie vorher nur
  während der Anfrage gesperrt).
- **Vorher-Nachher-Bilder für E-21** (iPhone 15, 393 px breit, erfundene Testdaten «Beispiel,
  Bruno» und «Muster, Dario», Turnier 2096, Anmeldeschluss vorbei: Warnungen «Passt nicht zur
  Kategorie.» und «Anmeldung ist geschlossen.»; nicht im Repo, kein Bildvergleich nach E-19):
  `/private/tmp/claude-501/-Users-KN-CAS-projekte-tco-app/ddc0b6f9-37a1-4fa5-929e-47cf9b8fbf4f/scratchpad/schritt-17/vorher.png`
  und `nachher.png` (Von Hand anmelden), `verschieben-vorher.png` und `verschieben-nachher.png`
  (Verschieben). Andere Dialoge zeigen keine Warnung. Der Scratchpad ist flüchtig; wer die Bilder
  aufheben will, legt sie selbst ab.
- **Sichtbare Abweichungen** (das Review hat zwei weitere gefunden, 5 und 6 unten im Abschnitt «Review»):
  1. **Gewollt (E-21):** Warnung als Liste statt als Satz; Sätze und Reihenfolge gleich. Auf dem
     Bild «Von Hand anmelden» wird der Dialog dadurch etwas höher und 11 px schmaler (gemessen:
     382 statt 393 px; der lange Satz zog ihn vorher auf die volle Breite, die Liste nicht). Im
     «Verschieben» bleibt die Breite.
  2. **Nach einer Störung im «Verschieben»:** Eine neue Zielwahl löscht auch den Störungs-Satz
     (vorher nur die Warnungen). So hielten es «Von Hand anmelden» und die Doppel-Liste schon
     vorher; aus dem Code abgeleitet, nicht im Test (der Test hält es nicht fest, weil es sich
     ändert).
  3. **Wettlauf «neue Wahl, während die Anfrage läuft»** (Taste gesperrt, Wahl noch möglich):
     Neu zeigt der Dialog die Antwort auf die alte Wahl nicht mehr (keine Warnung, kein Fehler);
     bei Erfolg oder Folge-Satz lädt die Seite neu und zeigt den Satz, **der Dialog bleibt aber
     offen**. Vorher schloss er, und eine verspätete Warnung zur alten Wahl erschien samt
     «Trotzdem …», das dann die neue Wahl mit `trotzdem` schickte. Aus dem Code, nicht im Test.
  4. **Wettlauf «Abbrechen, während die Anfrage läuft», Antwort Erfolg oder Folge-Satz:** Neu geht
     der Fokus nach dem Neuladen auf den Satz; vorher erschien der Satz ohne Fokuswechsel. Aus dem
     Code, nicht im Test.
  - Unsichtbar: Wirft das Neuladen, bleiben die Tasten nicht mehr gesperrt (`finally` im
    Baustein). Eine Warnung mit leerer Liste gibt es nicht (der Server antwortet `warnung` nur
    mit mindestens einem Eintrag).
  - **Gleich geblieben** (geprüft im Test oder am Markup): Titel und `id`s der Dialoge
    (`anmelden-titel` usw.), Tasten-Wortlaut, Reihenfolge und Klassen, «Trotzdem …», jeder Satz,
    Fokus auf den Satz nach jeder Aktion, Neuladen, Dialog «Ändern», die Tabelle (Markup
    zeichengleich). Kein `onschliessen`: Nach «Abbrechen» gibt der Browser den Fokus zurück wie
    vorher (nicht im Test).
- **Prüfliste (b):** Die Einträge zu `cm-verwaltung` (`.zelle-kurz` :477, `.tabelle` :458,
  `.hinweis` :306, `.seitenkopf` :309, :373, `.plakette`/`.karte-kopf` :232) hängen an der Tabelle
  und der Seite, deren Markup unverändert ist; die Datei ist grün. Der neue Test sucht über keine
  CSS-Klasse und nutzt `wartetAufVorladen` (B-31 Nr. 4) und `waehleAktion`.
- **Beobachtungen, nicht geändert (Feature-Stopp):**
  1. `warnungText` (`src/lib/verwaltung/turnier-anzeige.ts`) wird nur noch von seinem Test
     benutzt: Kandidat für Schritt 20 (ungenutzte Exporte).
  2. `doppelWarnungen` heisst nach dem Doppel, liefert jetzt aber auch die Einzel-Warnungen;
     Umbenennen wäre reine Kosmetik (Schritt 20 oder 24).
  3. Die Doppel-Liste zeigt im «Verschieben» ohne anderes Ziel eine gesperrte Haupttaste, die
     Einzel-Liste nur «Abbrechen»; beides wie vorher, nun mit einer Angabe am Baustein
     angleichbar (eine Verhaltensänderung, braucht einen Entscheid).
  4. `docs/ui-leitbild.md` beschreibt die Rückfrage als «Abbrechen · Bestätigen»; die Form mit
     Nebentaste (Wildcard-Antrag, schon vorher so) und die Warnung als Liste stehen dort nicht.
     Nachtrag mit dem Entscheid zu E-21, spätestens in Schritt 24.
  5. Merkpunkt «Abmelden im Profil» aus den Hinweisen zu Schritt 17: nicht im Umfang des Schritts,
     offen (Schritt 20 oder 24).
  6. Der Pre-Commit-Hook prüft auch nicht versionierte Dateien unter `tests/e2e/` mit Prettier;
     ein Hilfs-Test für die Bilder musste vor jedem Commit aus dem Worktree.
- **Voller `make check`** auf `8a4d860` (alle Commits des Schritts, Arbeitsbaum sauber): grün,
  5,4 Minuten; 171 Testdateien, **2427 Tests** (unverändert, der Schritt hat keine
  Einheitstests), Abdeckung 96,99 % Anweisungen, 93,52 % Zweige; `svelte-check` 0 Fehler,
  0 Warnungen (1609 Dateien); **E2E 524 bestanden, 64 übersprungen** in 3,5 Minuten (vorher
  516/60: vier Fälle mehr, je zwei Handys bestanden und am PC übersprungen).
- **Nicht geprüft, dünne Belege:** Die Abweichungen 2 bis 4 sind aus dem Code abgeleitet, nicht
  im Browser nachgestellt. Kein Browser von Hand (Tastatur, Esc, VoiceOver), keine Fokus-Rückgabe
  nach «Abbrechen» im Test, die neuen Fälle nicht am PC (dort `turnier.test.ts`), WebKit-CI nicht
  gelaufen. Kein Review.
- **Review (14.11.2026, refactor-reviewer): «ok», nichts vor dem Merge zu beheben; keine Freigabe
  zum Merge, solange der Entscheid E-21 aussteht.** Kein eigener `make check` (grüner Stand für
  `cbe8268` gemerkt). Die Abweichungen 2 bis 4 sind am alten und neuen Code bestätigt. Dass der
  Dialog im Wettlauf nach Erfolg offen bleibt (3), ist das bestehende Verhalten des Bausteins und
  gilt für die Doppel-Liste schon auf `dev`; schliessen bei Erfolg wäre eine Änderung am Baustein
  und ein eigener Entscheid. Zwei weitere Abweichungen, beide nur im Wettlauf:
  5. **Sperre je Dialog statt gemeinsam:** Früher sperrte ein `laeuft` die Tasten aller fünf
     Dialoge. Neu kann man nach «Abbrechen» während einer laufenden Anfrage einen anderen Dialog
     öffnen und eine zweite Anfrage parallel schicken.
  6. **Abbrechen und denselben Dialog neu öffnen, während die Anfrage läuft:** Früher landete die
     verspätete Antwort im neu geöffneten Dialog; neu wird sie verworfen, bei Erfolg lädt die
     Seite neu und der Dialog bleibt offen. Gleiche Ursache wie 3; das Fenster öffnet sich auch
     durch Tippen im Suchfeld (`Spielersuche` ruft `onwahl(null)`).
  - **Hinweise:** (1) `docs/ui-leitbild.md` beschreibt die Rückfrage als «Abbrechen · Bestätigen»;
    zweite Entscheid-Taste und Warnung als Liste nachtragen, spätestens Schritt 24. (2)
    `Aktionsdialog.svelte`: Löst die Nebentaste je eine Warnung aus, schickt der nächste Klick auf
    die Haupttaste `trotzdem`; heute nicht erreichbar, merken, falls `neben` einmal mit einer
    warnenden Aktion genutzt wird. (3) Der Eintrag in `docs/versionen.md` nennt den Entscheid als
    offen; beim Merge ersetzen.
  - **Was kein Test sieht:** die Wettläufe 3 bis 6, Abweichung 2, Fokus-Rückgabe nach «Abbrechen»
    und Esc, Umleitung zum Login aus einem der fünf Dialoge, der Folge-Satz `vorbereitung`, die
    neuen Fälle am PC, die Form der Warnung selbst.
  - **Nicht geprüft vom Reviewer:** Rot-Probe und «vorab grün» nur nach Protokoll; kein Browser
    von Hand; von den vier Bildern nur `nachher.png`.
- **CI zum Merge von Schritt 16 (Orchestrator, 14.11.2026):** Der Lauf 43610003599 auf `dev`
  (`7dcb889`) war im Job «E2E (iphone)» rot, nach Wiederholung nur dieses Jobs grün: ein Wackler.
  Gerissen ist `tests/e2e/cm-ablauf.test.ts:186` (`fokusImSeitenkoerper` nach «Anmelden» mit
  `geschlossen`; 5 Sekunden lang lag der Fokus nicht im Seitenkörper). Lokal (WebKit auf dem Mac)
  dreimal grün. Die Ursache ist nicht gemessen; E.11 hält schon fest, dass der Fokus nach der
  gesperrten Taste vom Browser abhängt. Der Fall hält ein altes, zufälliges Verhalten fest und
  ist auf der iPhone-CI nicht stabil.
- **Checkpoint E-21 (14.11.2026, Orchestrator):** Der Projektleiter hat die vier Bilder gesehen und entschieden: die Liste bleibt (E-52), die Abweichungen 2 bis 6 sind angenommen (E-53), die wacklige Fokus-Prüfung wird in einem eigenen Nachtrag entschärft (E-54, Version 0.22.3, vor diesem Merge). Merge von Schritt 17 als Version 0.22.4.

### E.13 Schritt 18

**Erkenntnisse Schritt 18** (14.11.2026, Branch `refactor/schritt-18` ab `origin/dev` = `c7dafc3`, Version 0.22.4; Sonnet, Subagent)

- **Voraussetzungen geprüft:** Schritt 04 erledigt (`make css-vergleich`, E-13 gilt), kein Nachmessen vorab verlangt. Seit dem Plan hat `basis.css` durch #81 (Interclub: Resultatzeile, Partie, Rangliste mit `@container (width < 18rem)`) 2533 statt 2287 Zeilen; die Hinweise zu den Zeilen 1851 (PC-Block) und 2170 (Druck) gelten jetzt für 2097 und 2416. Der Schnitt ist davon nicht berührt, alle Nahtstellen liegen zwischen Regeln der obersten Ebene (per Skript geprüft: Klammertiefe 0, Leerzeile davor). Kein `@import`, kein `url()`, kein `/*!`.
- **Zuschnitt (Zeilen der alten Datei):** 1–117 `grundlagen`; 118–547 `rahmen` (Seitenaufbau, Mitglieder-App, Bänder, Kopfleiste, Reiter, Balken, Seitenleiste); 548–840 `bedienelemente` (Tasten, Pfad, Felder, Auswahlfläche, Kennzahlen); 841–1346 `karten` (Karten, Plaketten, Umschalter, Interclub-Stile, Rangliste samt Container-Abfrage); 1347–1421 `verwaltung`; 1422–1954 `anleitung`; 1955–2095 `uebergaenge`; 2096–2341 `pc-layout`; 2342–2485 `druck`; 2486–Ende `verlauf` (Verlauf-Nachricht und Sprechblase, stehen nach dem Druck-Block und werden darum nicht dorthin gezogen). Die Teile hintereinander ergaben vor dem Einsetzen der Kopfkommentare genau die alte Datei.
- **Beweis:** `npm run build` und `npm run build:spa` je vor und nach dem Schnitt, nacheinander im selben Ordner und mit demselben `node_modules`; die CSS-Dateien wurden dazwischen ausserhalb des Repos gesichert. Ergebnis `node scripts/css-vergleich.ts` für Node `gleich: 2 CSS-Datei(en), Namen und Inhalt` (Exit 0), für SPA ebenso; auch über `make css-vergleich` gleich. Der Hash des Bündels (`0.BwMLfSHU.css`) blieb gleich. Die SPA-Ausgabe hat dieselben zwei CSS-Dateien in denselben Bytes wie der Node-Build, die Vermutung aus C.3/C.4 ist damit belegt.
- **Rot-Probe:** in `verlauf.css` die Regeln `.blase-leitung` und `.blase-eigen` vertauscht (nach dem Commit, Sicherungskopie im Scratchpad, danach zurückkopiert; `git status` leer). Ergebnis: `Inhalt anders: 0.BwMLfSHU.css → 0.DkLldOBK.css: erste Abweichung bei Zeichen 36393 (Länge 36529 → 36529)`, Exit 1. Die Länge bleibt gleich.
- **Nachgezogen:** siehe 7.4, «Ergebnis Schritt 18». Nicht angefasst: `docs/beobachtungen-archiv.md` (Verweis auf `basis.css` als Fundort einer alten Beobachtung) und die Pläne und Specs unter `docs/superpowers/` (Geschichte).
- **Übergangsregel «Ab Schritt 18» in der `CLAUDE.md`:** Wortlaut stimmt weiter («Stile in den Dateien unter `src/lib/design/` in ihrer festen Reihenfolge; neue Regeln kommen in die Datei ihres Bausteins»). Hinweis: Die Reihenfolge steht nur in `+layout.svelte` und im Kopf von `grundlagen.css`, nicht in einer Prüfung; eine Datei, die dort fehlt oder an anderer Stelle importiert wird, bemerkt nur ein erneuter `make css-vergleich` oder das Auge. Die Mockups binden die zehn Dateien von Hand ein; ein neues Teilstück muss an drei Orten eingetragen werden (Layout, vier Mockups, Leitbild). Nicht behoben.
- **Nicht geprüft:** das Aussehen der Mockups im Browser (der E2E-Test `mockups.test.ts` öffnet `index.html` und ist grün); der Brief-Bündel `brief.css` ist unberührt. Kein Bildvergleich (E-19).
- **Prüfung:** voller `make check` auf `932ebb7` grün: Einheitstests 2427 in 171 Dateien, E2E 524 bestanden, 64 übersprungen (3,5 Minuten), Gesamtdauer 5,6 Minuten, `gruener-stand` gemerkt.
- **Review (14.11.2026, refactor-reviewer): ein Befund vor dem Merge, sonst hält alles.** Die zehn
  Dateien, in der Importreihenfolge aneinandergehängt, unterscheiden sich vom alten `basis.css`
  nur durch 13 neue Kommentarzeilen (vier im Kopf von `grundlagen.css`, je eine in den neun
  anderen); keine Zeile gelöscht oder geändert. Den CSS-Vergleich für den normalen Build hat der
  Reviewer in einer Kopie selbst gezogen: «gleich», beide Dateien mit gleicher SHA-256.
  - **Befund, behoben (Orchestrator, reine Doku, ein Wort):** `docs/ui-leitbild.md`, Zeile
    «Rangliste», nannte weiter `basis.css`; jetzt `karten.css`. Damit sind es sechs nachgezogene
    Stellen im Leitbild, nicht vier. Kein zweites Review für dieses eine Wort; geprüft per
    Textsuche (keine lebende Nennung von `basis.css` mehr im Leitbild).
  - **Hinweise:** (1) Die Zeilenbereiche im Zuschnitt oben sind um eine Zeile versetzt (die
    trennende Leerzeile liegt am Anfang der nächsten Datei); die Regeln stimmen. (2)
    `grundlagen.css:4` sagt unverändert «Neue Bausteine erst ins Leitbild, dann hierher»; passt
    nicht mehr ganz zur Übergangsregel, Kandidat für Schritt 21 oder 24. (3) Keine Prüfung
    erzwingt die Reihenfolge der zehn Dateien; kein Werkzeug sortiert Importe um. Merkpunkt für
    Schritt 20: kleine Prüfung «Design-Importe nur im Wurzel-Layout, in der Reihenfolge der
    Liste».
  - **Nicht geprüft vom Reviewer:** SPA-Vergleich und Rot-Probe nur nach diesem Protokoll; kein
    Browser.
