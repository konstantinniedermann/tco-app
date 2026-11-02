# Test- und Live-Umgebung, Auslieferung, Sicherung — Umsetzungsplan (#32)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zwei getrennte Docker-Stapel (Test, Live) hinter Caddy, ein Auslieferungs-Skript mit
Rückfall, Sicherung, Wiederherstellung und Probe mit restic, CI-Jobs hinter Schaltern, alles
lokal mit `make betrieb-nachweis` belegt.

**Architecture:** Alles Betriebliche liegt in `betrieb/` und reist im App-Image mit. Auf dem
Server entnimmt ein von Hand eingerichteter Türsteher (`ausliefern-ssh`) dem Image mit
geprüftem Digest die Einrichtung und startet daraus `ausliefern`. Die Bash-Skripte werden mit
Vitest und einem Docker-Ersatz im `PATH` getestet, der echte Ablauf mit einem Nachweis-Skript
gegen Docker Desktop.

**Tech Stack:** Bash (kompatibel mit 3.2 auf macOS und 5 auf Ubuntu), Docker Compose,
Caddy, restic, PostgreSQL 18, GitHub Actions, Vitest, Node-Bordmittel.

**Spec:** `docs/superpowers/specs/2026-11-02-server-und-auslieferung-design.md`

## Global Constraints

- Keine neuen npm-Pakete. Neue Docker-Images nur `caddy`, `restic/restic`, `registry` (nur
  Nachweis), dazu `postgres:18-alpine`. Alle in `betrieb/` per **Digest** gepinnt
  (`image: name:tag@sha256:…`), den Digest mit `docker buildx imagetools inspect` ermitteln.
- Bash: `#!/usr/bin/env bash`, `set -euo pipefail`. Keine Bash-4-Mittel (keine assoziativen
  Arrays, kein `mapfile`, kein `${x,,}`), kein `flock` (Sperre per `mkdir`), weil der lokale
  Nachweis mit Bash 3.2 läuft. Shellcheck-sauber schreiben (lokal vorhanden, kein Gate).
- Umgebung nur `test` oder `live`. Digest nur `^sha256:[0-9a-f]{64}$`. Eingaben nie mit
  `eval`, `sh -c` oder ungequotet auswerten.
- Die Ausgabe der Server-Skripte an den Aufrufer enthält nur Zeilen der Form
  `schritt: <name>`, `ok` oder `fehler`, nie die Ausgabe von docker, psql oder der App. Alles
  andere geht in `$MYTCO_BASIS/<umgebung>/protokoll.log` (DS-01, DS-06, SI-05).
- Wartezeit auf die Statusabfrage: Einstellung `MYTCO_WARTEZEIT`, Standard `60` Sekunden.
- Sicherungen: restic-Tag `<umgebung>` und `lauf-<JJJJMMTTThhmmssZ>`, Aufbewahrung
  `forget --keep-within 30d --prune`.
- Markierungen genau so: `Annahme K-10: …` (Adressen `my.tcolten.ch`, `test.my.tcolten.ch`),
  `hängt an K-11` (`MAIL_NUR_AN`). Nichts zu Geld, Konten, Recht annehmen.
- Prettier formatiert `*.yml`, `*.ts`, `*.json`. Neue Dateien in Formaten, die es nicht kennt
  (`.sh`, ohne Endung, `Caddyfile`, `*.caddy`, `*.service`, `*.timer`), sind davon nicht
  betroffen.
- Skripte ohne Endung in `betrieb/bin/` und `tests/betrieb/stubs/` sind ausführbar
  versioniert (`git add --chmod=+x`).
- Echte Geheimnisse nie im Repo. Vorlagen enden auf `.env.example`, echte Dateien
  (`geheim.env`, `proxy.env`, `sicherung.env`) sind gitignoriert.
- Commits: `feat:`/`test:`/`docs:`/`chore:`, Dateien einzeln stagen, Abschluss mit den
  Attributionszeilen der Session.

## Review Focus

1. **Manipulierte SSH-Anfrage:** Digest mit Grossbuchstaben, Zeilenumbruch, Leerzeichen, `;`,
   `$(…)` oder einem zweiten Wort → `fehler`, kein docker-Aufruf (Test in Task 4).
2. **Zwei Läufe gleichzeitig / abgestürzter Lauf:** Ein zweiter Lauf auf dieselbe Umgebung
   bricht mit `fehler` ab, statt sich einzumischen. Eine Sperre, deren PID nicht mehr lebt,
   wird übernommen (Test in Task 1).
3. **Allererster Lauf:** keine Zustandsdatei, keine Datenbank, keine gemeinsamen Teile. Die
   Auslieferung gelingt. Ein Rückfall ohne «vorher» meldet `fehler`, ohne abzustürzen (Test
   in Task 3).
4. **Sicherungsziel fehlt oder ist nicht initialisiert:** Ein noch nicht initialisiertes Repo
   wird angelegt. Ist das Ziel nicht erreichbar, bricht die Live-Auslieferung vor jeder
   Änderung ab, und die alte Version läuft weiter (Tests in Task 3 und 5).
5. **Platte läuft voll:** Nach jedem erfolgreichen Lauf werden Images des Repos gelöscht,
   ausser «aktuell» und «vorher» beider Umgebungen (Test in Task 3).

---

## Dateien

| Datei | Zweck |
|-------|-------|
| `betrieb/bin/lib.sh` | Gemeinsame Funktionen: Eingabeprüfung, Ausgabe, Protokoll, Sperre, Compose-Aufruf |
| `betrieb/bin/ausliefern-ssh` | Türsteher: Digest und Token annehmen, Image holen, Einrichtung entnehmen, `ausliefern` starten |
| `betrieb/bin/ausliefern`, `betrieb/bin/zurueck` | Ablauf der Auslieferung, Rückfall von Hand |
| `betrieb/bin/sichern`, `wiederherstellen`, `probe` | Sicherung, Wiederherstellung und Probe mit restic |
| `betrieb/compose.umgebung.yml` | App und Datenbank einer Umgebung |
| `betrieb/compose.proxy.yml`, `betrieb/caddy/Caddyfile`, `betrieb/caddy/umgebungen/{test,live}.caddy` | Webserver |
| `betrieb/geheim.env.example`, `betrieb/proxy.env.example`, `betrieb/sicherung.env.example` | Vorlagen ohne Werte |
| `betrieb/systemd/mytco-sicherung.{service,timer}` | Nächtliche Sicherung und Probe (von Hand eingerichtet) |
| `betrieb/nachweis/rauchtest.sh`, `betrieb/nachweis/nachweis.sh` | Rauchtest (CI) und lokaler Gesamtnachweis |
| `betrieb/README.md` | Aufbau auf dem Server, Einrichtung von Hand, Befehle (kurz) |
| `tests/betrieb/hilfe.ts`, `tests/betrieb/stubs/docker` | Test-Gerüst: Skript mit Ersatz-docker ausführen |
| `tests/betrieb/*.test.ts` | Einheitstests der Skripte |
| `scripts/ci/code-stand.sh` | Hash des Code-Stands (ohne Doku) |
| `scripts/pruefungen/workflow-rechte.ts` (+ `.test.ts`) | Rechteprüfung der Workflows |

**Aufbau auf dem Server** (`MYTCO_BASIS`, Standard `/opt/mytco`; in Tests ein Temp-Ordner):

```
bin/ausliefern-ssh, bin/lib.sh     von Hand eingerichtet, nie von der CI
<umgebung>/geheim.env              von Hand
<umgebung>/zustand/aktuell|vorher  Digest je Zeile
<umgebung>/betrieb/                Einrichtung aus dem zuletzt ausgelieferten Image
<umgebung>/protokoll.log
<umgebung>/sperre/                 Sperre (mkdir), enthält pid
fassungen/<digest>/betrieb/        entnommene Einrichtung vor dem Lauf
proxy/                             gemeinsame Teile: compose.proxy.yml, Caddyfile, proxy.env (von Hand)
proxy/umgebungen/<umgebung>.caddy  je Umgebung
gemeinsam/bin/                     sichern, wiederherstellen, probe, lib.sh (für den Timer)
sicherung.env                      von Hand
```

---

### Task 1: Test-Gerüst und `lib.sh`

**Files:**
- Create: `betrieb/bin/lib.sh`, `tests/betrieb/hilfe.ts`, `tests/betrieb/stubs/docker`, `tests/betrieb/lib.test.ts`

**Interfaces:**
- Produces (`lib.sh`, wird mit `source` geladen):
  - `pruefe_umgebung <wert>` → Exit 0 bei `test|live`, sonst `fehler` auf stdout und Exit 1
  - `pruefe_digest <wert>` → wie oben für `^sha256:[0-9a-f]{64}$` (ganzer Wert, kein Umbruch)
  - `schritt <name>` → druckt `schritt: <name>`
  - `protokoll <umgebung> <befehl…>` → führt den Befehl aus, stdout/stderr ans Protokoll angehängt, gibt dessen Exit-Code zurück
  - `sperre_nehmen <umgebung>` / `sperre_freigeben <umgebung>` → `mkdir`-Sperre mit `pid`-Datei; lebt die PID nicht mehr (`kill -0`), wird die Sperre übernommen; sonst Exit 1
  - `compose <umgebung> <args…>` → `docker compose -p mytco-<umgebung> -f $MYTCO_BASIS/<umgebung>/betrieb/compose.umgebung.yml --env-file $MYTCO_BASIS/<umgebung>/geheim.env <args…>`
  - `ZAEHL_SQL` → SQL, das je Tabelle `schema.tabelle|anzahl` sortiert ausgibt (über `query_to_xml`, alle `BASE TABLE` ausser `pg_catalog`/`information_schema`)
- Produces (`hilfe.ts`): `fuehreAus(skript: string, args: string[], optionen?: { stdin?: string; env?: Record<string,string>; stub?: Record<string,string> }): { status: number; stdout: string; stderr: string; aufrufe: string[]; basis: string }`. Legt einen Temp-`MYTCO_BASIS` an und stellt `tests/betrieb/stubs` vor den `PATH`. `aufrufe` sind die vom Ersatz-docker protokollierten Argumentzeilen. `stub` setzt Umgebungsvariablen, mit denen der Ersatz Fehler simuliert.
- Ersatz-docker: hängt `"$*"` an `$STUB_PROTOKOLL` an. Antwortet je nach Variable: `STUB_FEHLER_BEI=<muster>` (Exit 1, wenn die Argumente das Muster enthalten), `STUB_AUSGABE_<NAME>`. Gibt auf stderr immer `STUB-GEHEIM-LOG` aus, damit die Ausgabetests Lecks finden.

- [ ] **Step 1: Tests schreiben** (`tests/betrieb/lib.test.ts`, über ein kleines Treiberskript, das `lib.sh` lädt und eine Funktion aufruft)
  - `pruefe_umgebung`: `test`, `live` → 0; `Test`, `prod`, `test live`, `''`, `test\n` → 1 und stdout genau `fehler\n`
  - `pruefe_digest`: gültiger 64-Hex-Digest → 0; Grossbuchstaben, 63 Zeichen, `sha256:…;ls`, `sha256:…\n`, `$(id)` → 1
  - Sperre: zweites `sperre_nehmen test` bei lebender PID → 1; mit `pid`-Datei einer toten PID → 0
  - `protokoll test docker ps`: stdout enthält kein `STUB-GEHEIM-LOG`, das Protokoll schon
- [ ] **Step 2:** `npx vitest run tests/betrieb/lib.test.ts` → FAIL (lib.sh fehlt)
- [ ] **Step 3:** `lib.sh`, `hilfe.ts` und Ersatz-docker umsetzen
- [ ] **Step 4:** Test → PASS; `shellcheck betrieb/bin/lib.sh tests/betrieb/stubs/docker` → ohne Befund
- [ ] **Step 5:** Commit `test: Test-Gerüst für Betriebsskripte und gemeinsame Funktionen (#32)`

### Task 2: Compose, Caddy, Vorlagen, Dockerfile, Rauchtest

**Files:**
- Create: `betrieb/compose.umgebung.yml`, `betrieb/compose.proxy.yml`, `betrieb/caddy/Caddyfile`, `betrieb/caddy/umgebungen/test.caddy`, `betrieb/caddy/umgebungen/live.caddy`, `betrieb/*.env.example`, `betrieb/nachweis/rauchtest.sh`
- Modify: `Dockerfile`, `.gitignore`, `Makefile` (Ziel `rauchtest`), `.github/dependabot.yml` (`docker-compose` auch für `/betrieb`)

**Interfaces:**
- `compose.umgebung.yml`: Dienste `app` (Image `${MYTCO_IMAGE}`) und `db` (`postgres:18-alpine@sha256:…`, Volume `daten`). Netz `intern` mit `internal: true` (beide Dienste), Netz `proxy` = extern `mytco-proxy-${MYTCO_UMGEBUNG}` (nur `app`). Die DB veröffentlicht keinen Port. `app` bekommt `DATABASE_URL=postgres://mytco:${POSTGRES_PASSWORD}@db:5432/mytco`, `ORIGIN`, `ADDRESS_HEADER=X-Forwarded-For`, `XFF_DEPTH=1` und `MAIL_NUR_AN`. Logging `json-file` mit `max-size`/`max-file`.
- `compose.proxy.yml`: `caddy:…@sha256:…`, beide Proxy-Netze, Ports `${MYTCO_HTTP_PORT:-80}:80` und `${MYTCO_HTTPS_PORT:-443}:443`, Volume für Caddys Daten, Bind-Mount von `Caddyfile` und `umgebungen/`.
- `Caddyfile`: Snippet `(sicherheit)` mit `Strict-Transport-Security "max-age=31536000; includeSubDomains"`, `X-Content-Type-Options nosniff`, `Referrer-Policy same-origin`, `Content-Security-Policy "frame-ancestors 'none'"`. Kein `log`-Block. `import umgebungen/*.caddy`.
- `live.caddy` / `test.caddy`: `{$MYTCO_ADRESSE_LIVE}` bzw. `{$MYTCO_ADRESSE_TEST}`, `tls {$MYTCO_TLS}` nur wenn gesetzt (lokal `internal`), `import sicherheit`, `reverse_proxy app-<umgebung>:3000`. Test zusätzlich `basic_auth` mit `{$MYTCO_TEST_BENUTZER} {$MYTCO_TEST_PASSWORT_HASH}`. Der App-Container bekommt im Proxy-Netz den Alias `app-<umgebung>`.
- `geheim.env.example`: `POSTGRES_PASSWORD=` (Hinweis: `openssl rand -hex 32`), `ORIGIN=`, `MAIL_NUR_AN=` (nur Test, hängt an K-11). `proxy.env.example`: Adressen mit `Annahme K-10: …`, `MYTCO_TLS=`, Benutzer und Hash für Test. `sicherung.env.example`: `RESTIC_REPOSITORY=`, `RESTIC_PASSWORD=`, S3-Zugang (leer; Ziel aus #10).
- `.gitignore`: `betrieb/**/*.env` ignorieren, `!betrieb/**/*.env.example` erlauben.
- Dockerfile Laufzeit: `COPY betrieb ./betrieb`. `HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 CMD ["node","-e", "<fetch http://127.0.0.1:3000/api/status, Exit 0 nur bei status==='ok'>"]`. In der Bau-Stufe `svelte-kit sync` streichen, wenn `npm run build` ohne es dasselbe `build/` erzeugt (vorher und nachher vergleichen). Sonst bleibt es, mit Kommentar.
- `rauchtest.sh <image>`: legt einen Temp-`MYTCO_BASIS` mit `geheim.env` aus erfundenen Werten an, erzeugt das Netz `mytco-proxy-rauch`, startet `compose.umgebung.yml` als Projekt `mytco-rauch`, führt `node scripts/migrate.ts` aus und wartet mit `up -d --wait` auf «healthy». Es druckt nur `ok`/`fehler` und räumt immer auf (`trap`). Makefile: `rauchtest: image` → `bash betrieb/nachweis/rauchtest.sh mytco:lokal`.

- [ ] **Step 1:** `make rauchtest` → FAIL (Ziel fehlt)
- [ ] **Step 2:** Dateien oben umsetzen, Digests ermitteln
- [ ] **Step 3:** `make rauchtest` → `ok`; `docker compose -f betrieb/compose.umgebung.yml config` und `docker run --rm -v "$PWD/betrieb/caddy:/etc/caddy" caddy@… caddy validate --config /etc/caddy/Caddyfile` (mit Beispielwerten in der Umgebung) → ohne Fehler
- [ ] **Step 4:** `make check-schnell` → grün (Prettier, Annahmen-Prüfung erkennt die Markierungen: `make annahmen K=K-10` listet die neue Stelle)
- [ ] **Step 5:** Commit `feat: Compose-Stapel für Test und Live, Caddy, Rauchtest (#32)`

### Task 3: `ausliefern` und `zurueck`

**Files:**
- Create: `betrieb/bin/ausliefern`, `betrieb/bin/zurueck`, `tests/betrieb/ausliefern.test.ts`

**Interfaces:**
- Consumes: `lib.sh` (Task 1), Compose- und Caddy-Dateien (Task 2).
- `ausliefern <umgebung> <digest>`: läuft aus `fassungen/<digest>/betrieb/bin/`. `MYTCO_REPO` (Standard `ghcr.io/konstantinniedermann/tco-app`) ergibt `MYTCO_IMAGE=$MYTCO_REPO@<digest>`. Exit 0 und letzte Zeile `ok`, oder Exit 1 und letzte Zeile `fehler`.
- `zurueck <umgebung>`: startet `vorher`, tauscht `aktuell`/`vorher`; ohne `vorher` → `fehler`.

Ablauf von `ausliefern` (jeder Punkt ein `schritt:`):
1. Prüfen, Sperre nehmen (bei jedem Ende freigeben, `trap`).
2. **Einrichtung übernehmen:** `fassungen/<digest>/betrieb/` → `<umgebung>/betrieb/` und `<umgebung>.caddy` → `proxy/umgebungen/`. Gemeinsame Teile (`Caddyfile`, `compose.proxy.yml`, `bin/sichern|wiederherstellen|probe|lib.sh` → `gemeinsam/bin/`) nur, wenn `<umgebung>` = `live` **oder** `live/zustand/aktuell` fehlt. Danach `caddy validate` im laufenden Proxy-Container (oder ein Wegwerf-Container, falls keiner läuft). Ist die Konfiguration ungültig, werden die vorherigen Caddy-Dateien wiederhergestellt → `fehler`. Ist sie gültig, Proxy starten bzw. `caddy reload`.
3. Nur Live und nur, wenn die DB läuft: `gemeinsam/bin/sichern live`. Bei Fehler → `fehler`, nichts geändert.
4. Nur Test: `compose test down --volumes`.
5. `compose <u> up -d --wait db`, dann Migration mit neuem Image (`compose run --rm --no-deps app node scripts/migrate.ts`). Bei Fehler → `fehler`, App unverändert.
6. Nur Test: falls das Image `scripts/testdaten.ts` enthält, `node scripts/testdaten.ts` ausführen.
7. `compose <u> up -d --wait --wait-timeout $MYTCO_WARTEZEIT app` mit neuem Image.
8. Gesund: `aktuell` → `vorher`, Digest → `aktuell`, alte Images aufräumen (alle `$MYTCO_REPO`-Images ausser `aktuell`/`vorher` beider Umgebungen) → `ok`. Nicht gesund: mit `vorher` neu starten (falls vorhanden) → `fehler`.

- [ ] **Step 1: Tests schreiben** (Ersatz-docker, `fuehreAus`)
  - erfolgreicher Erstlauf Test: Aufrufe enthalten `down --volumes`, Migration, `up -d --wait`. `aktuell` = Digest, `vorher` fehlt, stdout endet auf `ok`
  - Test-Lauf mit vorhandenem `live/zustand/aktuell` kopiert `Caddyfile` nicht nach `proxy/`; ein Live-Lauf tut es
  - Live: `sichern` scheitert (`STUB_FEHLER_BEI=restic`) → `fehler`, kein `up` der App, `aktuell` unverändert
  - Migration scheitert → `fehler`, kein `up … app`
  - App nicht gesund (`STUB_FEHLER_BEI=--wait-timeout`) mit `vorher` → zweiter `up` mit dem vorherigen Digest, `fehler`; ohne `vorher` → `fehler`, kein Absturz (Review Focus 3)
  - `caddy validate` scheitert → alte Caddy-Dateien wieder da, `fehler`
  - Aufräumen: Images ausser `aktuell`/`vorher` beider Umgebungen werden mit `image rm` gelöscht (Review Focus 5)
  - in keinem Fall erscheint `STUB-GEHEIM-LOG` auf stdout/stderr; jede stdout-Zeile passt auf `^(schritt: [a-z -]+|ok|fehler)$`
  - `zurueck test` ohne `vorher` → `fehler`; mit `vorher` → `up` mit diesem Digest, Zustände getauscht
- [ ] **Step 2:** `npx vitest run tests/betrieb/ausliefern.test.ts` → FAIL
- [ ] **Step 3:** `ausliefern` und `zurueck` umsetzen
- [ ] **Step 4:** Test → PASS, Shellcheck ohne Befund
- [ ] **Step 5:** Commit `feat: Auslieferung mit Rückfall auf das vorherige Image (#32)`

### Task 4: Türsteher `ausliefern-ssh`

**Files:**
- Create: `betrieb/bin/ausliefern-ssh`, `tests/betrieb/ausliefern-ssh.test.ts`

**Interfaces:**
- Aufruf über `authorized_keys`: `command="/opt/mytco/bin/ausliefern-ssh test",restrict ssh-ed25519 …`. Umgebung = `$1`. Digest = `$SSH_ORIGINAL_COMMAND`, falls gesetzt, sonst `$2` (Handbetrieb). Token = Standardeingabe, falls sie nicht leer ist und kein Terminal.
- Ist ein Token da: `DOCKER_CONFIG` = `mktemp -d`, `docker login <registry-host> -u mytco --password-stdin`, am Ende löschen (`trap`).
- Danach `docker pull`, `docker create` (ohne Start), `docker cp <id>:/app/betrieb fassungen/<digest>/`, `docker rm`, dann `exec fassungen/<digest>/betrieb/bin/ausliefern <umgebung> <digest>`.
- Darf keine Datei aus `fassungen/` oder dem Image ausführen, bevor beide Eingaben geprüft sind. Lädt `lib.sh` aus dem **eigenen** Ordner (`bin/`, von Hand eingerichtet), nicht aus dem Image.

- [ ] **Step 1: Tests schreiben**
  - Umgebung `prod` oder fehlend → `fehler`, keine docker-Aufrufe
  - `SSH_ORIGINAL_COMMAND` = `sha256:<64hex> extra`, `sha256:<64hex>;id`, `$(id)`, Grossbuchstaben, mit `\n` → `fehler`, keine docker-Aufrufe (Review Focus 1)
  - gültiger Digest mit Token auf stdin: Aufrufe in der Reihenfolge `login … --password-stdin`, `pull <repo>@<digest>`, `create`, `cp`, `rm`. Das Token erscheint in keiner Argumentzeile, der Temp-`DOCKER_CONFIG` ist danach weg
  - ohne Token: kein `login`
  - mit `test` als Umgebung und `SSH_ORIGINAL_COMMAND="live sha256:…"` → `fehler` (die Umgebung kommt nie aus der Anfrage)
  - `pull` scheitert → `fehler`, kein `exec`
  - Ausgabe nur `schritt:`/`ok`/`fehler`, kein `STUB-GEHEIM-LOG`
- [ ] **Step 2:** Test → FAIL
- [ ] **Step 3:** umsetzen (für `docker cp` legt der Ersatz-docker den Ordner `betrieb/bin/ausliefern` als kleines Skript an, das `ok` druckt)
- [ ] **Step 4:** Test → PASS, Shellcheck ohne Befund
- [ ] **Step 5:** Commit `feat: Türsteher für die Auslieferung per SSH (#32)`

### Task 5: Sicherung, Wiederherstellung, Probe

**Files:**
- Create: `betrieb/bin/sichern`, `betrieb/bin/wiederherstellen`, `betrieb/bin/probe`, `betrieb/systemd/mytco-sicherung.service`, `betrieb/systemd/mytco-sicherung.timer`, `tests/betrieb/sicherung.test.ts`

**Interfaces:**
- restic läuft als `docker run --rm -i --env-file $MYTCO_BASIS/sicherung.env [-v <ordner>:<ordner>] restic/restic@sha256:… <befehl>`. Ein lokaler Ordner als Ziel wird gemountet, wenn `RESTIC_REPOSITORY` mit `/` beginnt. Fehlt das Repo (`restic cat config` scheitert), wird es mit `init` angelegt.
- `sichern <umgebung>`: Lauf-ID `lauf-$(date -u +%Y%m%dT%H%M%SZ)`. Zählung (`ZAEHL_SQL`) vor und nach dem Dump. Weichen sie ab, bis zu 3 Versuche, sonst `fehler`. `pg_dump -Fc` → `restic backup --stdin --stdin-filename mytco-<u>.dump --tag <u> --tag <lauf>`, Zählung → `--stdin-filename zaehlung.txt` mit denselben Tags. Danach `forget --tag <u> --keep-within 30d --prune`. Gibt `ok` aus, Lauf-ID ins Protokoll.
- `wiederherstellen <umgebung> [lauf]`: Snapshot nur mit `--tag <umgebung>,<lauf>` (ohne `lauf` der neueste Lauf dieser Umgebung). Nicht gefunden → `fehler`. `compose <u> stop app`, `restic dump … /mytco-<u>.dump | pg_restore --clean --if-exists -d mytco`, `compose <u> start app`.
- `probe <umgebung> [lauf]`: Wegwerf-Netz `--internal`, Wegwerf-`postgres@…`, Restore wie oben, `ZAEHL_SQL` mit `zaehlung.txt` des Laufs vergleichen, bei jedem Ende Container und Netz entfernen (`trap`). Gleich → `ok`, sonst `fehler`.
- systemd: `Type=oneshot`, `User=mytco`, `ExecStart=/opt/mytco/gemeinsam/bin/sichern live`, `ExecStartPost=/opt/mytco/gemeinsam/bin/probe live`. Timer `OnCalendar=*-*-* 02:30:00`, `Persistent=true`.

- [ ] **Step 1: Tests schreiben** (Ersatz-docker liefert Zählungen über `STUB_AUSGABE_ZAEHLUNG`)
  - `sichern live`: Aufrufe enthalten `--tag live` und `--tag lauf-…` zweimal (Dump, Zählung) und `forget --tag live --keep-within 30d --prune`
  - Repo fehlt (`STUB_FEHLER_BEI="cat config"`) → `init` vor `backup` (Review Focus 4)
  - Ziel nicht erreichbar (`STUB_FEHLER_BEI=backup`) → `fehler`
  - `wiederherstellen test lauf-x` filtert mit `--tag test,lauf-x`. Liefert restic keinen Snapshot (z. B. weil er nur `live` trägt) → `fehler`, kein `pg_restore`
  - `probe live`: Wegwerf-Netz mit `--internal`. Bei abweichender Zählung `fehler`, und `rm`/`network rm` laufen trotzdem
  - Ausgabe nur `schritt:`/`ok`/`fehler`
- [ ] **Step 2:** Test → FAIL
- [ ] **Step 3:** umsetzen
- [ ] **Step 4:** Test → PASS, Shellcheck ohne Befund
- [ ] **Step 5:** Commit `feat: Sicherung, Wiederherstellung und Probe mit restic (#32)`

### Task 6: Lokaler Gesamtnachweis `make betrieb-nachweis`

**Files:**
- Create: `betrieb/nachweis/nachweis.sh`, `betrieb/README.md`
- Modify: `Makefile` (Ziel `betrieb-nachweis: voraussetzungen-docker image`)

**Interfaces:**
- Consumes: alle Skripte aus Task 2–5 unverändert. Der Nachweis ruft `bin/ausliefern-ssh` so auf, wie es der Server tut.
- Einrichtung: Temp-`MYTCO_BASIS` (in `$TMPDIR`, von Docker Desktop freigegeben). Darin
  liegen `bin/ausliefern-ssh` und `bin/lib.sh`, kopiert wie bei der Einrichtung von Hand. `registry:…@sha256:…` auf `127.0.0.1:<freier Port>`, `MYTCO_REPO=localhost:<port>/mytco`. Ports für Caddy frei gewählt (`MYTCO_HTTP_PORT`/`MYTCO_HTTPS_PORT`). Adressen `mytco.localhost` und `test.mytco.localhost`, `MYTCO_TLS=internal`, Passwort-Hash mit `caddy hash-password`, `sicherung.env` mit `RESTIC_REPOSITORY=<basis>/sicherung`. Alles erfunden.
- Druckt je Prüfung `prüfung: <name> … ok|fehler` und am Ende die Summe. Exit 1 bei einem Fehler. Räumt immer auf (`trap`: Compose-Projekte, Netze, Registry, Temp-Ordner).

Prüfungen in dieser Reihenfolge:
1. Image `mytco:lokal` in die Registry, Digest D1. `ausliefern-ssh test` und `ausliefern-ssh live` mit `SSH_ORIGINAL_COMMAND=D1` → beide `ok`
2. `curl --resolve` über HTTPS (`-k`): Live `/api/status` → `"status":"ok"`. Test ohne Passwort → 401, mit Passwort → ok. Auf `/_app/…` (erste Datei aus dem Build) stehen `Strict-Transport-Security` und `frame-ancestors 'none'`
3. Trennung: Aus `mytco-test-app-1` scheitert eine TCP-Verbindung (`node -e` mit `net.connect`, 3 s) zur IP von `mytco-live-db-1`, und `db` löst dort auf die Test-DB auf. Ebenso scheitert eine Verbindung zu `mytco-live-db-1` per Name
4. Rückfall: Image `FROM mytco:lokal` mit `CMD ["node","-e","process.exit(1)"]` → Digest D2. `ausliefern-ssh test D2` → `fehler`, danach Test-Status wieder ok und `aktuell` = D1
5. Sicherung: erfundene Zeile in eine Tabelle der Live-DB (`create table nachweis(…)`, `@example.org`), `sichern live` → ok, `probe live` → ok, Zeile löschen, `wiederherstellen live` → Zeile wieder da. `wiederherstellen test <lauf von live>` → `fehler`
6. Einrichtung: Image D3 mit absichtlich kaputtem `test.caddy` → `ausliefern-ssh test D3` → `fehler`, Live und Test antworten weiter. Eine Test-Auslieferung lässt `proxy/Caddyfile` unverändert (Prüfsumme vorher/nachher)

- [ ] **Step 1:** `make betrieb-nachweis` → FAIL (Ziel fehlt)
- [ ] **Step 2:** `nachweis.sh` und README umsetzen
- [ ] **Step 3:** `make betrieb-nachweis` → alle Prüfungen `ok`. Ausgabe als Nachweis für den Bericht festhalten. Danach dürfen `docker ps -a` und `docker network ls` nichts von `mytco-` mehr zeigen ausser dem Entwicklungs-Container `mytco-db-1`
- [ ] **Step 4:** Commit `test: lokaler Gesamtnachweis für Auslieferung und Sicherung (#32)`

### Task 7: Rechteprüfung der Workflows

**Files:**
- Create: `scripts/pruefungen/workflow-rechte.ts`, `scripts/pruefungen/workflow-rechte.test.ts`
- Modify: `package.json` (`pruefungen` um `node scripts/pruefungen/workflow-rechte.ts` ergänzen)

**Interfaces:**
- `export function pruefeWorkflow(pfad: string, yaml: string): string[]` gibt Befunde der Form `<pfad>: Job <name>: <Regel>` zurück. Die Datei liest nur die nötige Struktur über Einrückung (Abschnitt `jobs:`, Job-Schlüssel, `permissions:`-Blöcke), ohne YAML-Paket. Hauptteil wie die übrigen Prüfungen (`import.meta.main`, `meldeErgebnis('workflow-rechte', …)`), Dateien aus `.github/workflows/*.yml` über `versionierteDateien()`.
- Regeln:
  - Workflow-Ebene `permissions:` ist genau `contents: read`
  - Die wirksamen Rechte eines Jobs (eigener Block, sonst Workflow-Ebene) sind genau: `bauen` → `contents: read, packages: write`; `finden` → `contents: read, packages: read`; `ausliefern` → `packages: read`; `release` → `contents: write`; jeder andere Job → `contents: read`. `write-all`/`read-all` sind immer ein Befund
  - `secrets.` ausser `secrets.GITHUB_TOKEN` kommt nur im Job `ausliefern` vor
  - Job `ausliefern` enthält kein `uses:`, kein `npm`, `npx`, `node`, `cache`, `artifact`

- [ ] **Step 1: Tests schreiben** (Fixtures als Strings im Test)
  - korrekter Workflow mit allen vier Jobs → `[]`
  - `pruefen` mit `packages: write` → Befund; Job ohne Block bei Workflow-Ebene `contents: read` → ok
  - Workflow ohne Workflow-Ebene `permissions` → Befund
  - `secrets.SSH_SCHLUESSEL_TEST` in `bauen` → Befund
  - `ausliefern` mit `- uses: actions/checkout@…` oder `run: npm ci` → je ein Befund
  - `release` mit `contents: read` statt `write` → Befund
  - die echten Dateien `check.yml` und `secret-scan.yml` im jetzigen Stand → `[]`
- [ ] **Step 2:** `npx vitest run scripts/pruefungen/workflow-rechte.test.ts` → FAIL
- [ ] **Step 3:** umsetzen
- [ ] **Step 4:** Test → PASS; `npm run pruefungen` → `workflow-rechte: ok`
- [ ] **Step 5:** Commit `feat: Prüfung der Rechte in den CI-Workflows (#32)`

### Task 8: CI-Jobs

**Files:**
- Create: `scripts/ci/code-stand.sh`, `scripts/ci/code-stand.test.ts`
- Modify: `.github/workflows/check.yml`

**Interfaces:**
- `code-stand.sh` druckt 40 Hex-Zeichen: SHA-256 über `git ls-files -s` (Modus, Blob, Pfad), ohne Pfade unter `docs/` und ohne `*.md`. Dieselbe Regel wie `istNurDoku` in `nur-doku.ts`. Ein Kommentar verweist auf beide Stellen.
- `check.yml`:
  - Job `image`: nach dem Bau `bash betrieb/nachweis/rauchtest.sh mytco:ci`. Gilt immer, wenn `code == 'true'`.
  - Job `bauen`: `if: github.event_name == 'push' && github.ref == 'refs/heads/dev' && needs.aenderung.outputs.code == 'true' && vars.AUSLIEFERUNG_TEST == 'an'`, `needs: [aenderung, doku, pruefen, e2e, malware, image]`. Checkout ohne Zugangsdaten, `docker build`, Login bei `ghcr.io` mit `GITHUB_TOKEN` über stdin. Tags `ghcr.io/<repo klein>:code-<hash>` und `:commit-<sha>`, Push. Ausgabe `digest` aus `RepoDigests`.
  - Job `finden`: gleich, aber `refs/heads/main` und `vars.AUSLIEFERUNG_LIVE == 'an'`. `docker buildx imagetools inspect ghcr.io/<repo>:code-<hash>` ergibt den Digest. Fehlt das Image → Fehler mit der Meldung `Kein auf Test ausgeliefertes Image zu diesem Code-Stand`.
  - Job `ausliefern`: `needs: [bauen, finden]`, `if: always() && (needs.bauen.result == 'success' || needs.finden.result == 'success')`. `concurrency: { group: ausliefern-${{ github.ref_name }}, cancel-in-progress: false }`. Nur `run:`-Schritte: Schlüssel (`secrets.SSH_SCHLUESSEL_TEST` bzw. `_LIVE` je nach Branch) und `secrets.SSH_BEKANNTE_HOSTS` in Temp-Dateien schreiben, `printf '%s' "$TOKEN" | ssh -i … -o StrictHostKeyChecking=yes -o UserKnownHostsFile=… mytco@"$SERVER" "$DIGEST" >/dev/null 2>&1`. Danach druckt der Schritt nur `ok` oder `fehler` (Exit 1). `SERVER` aus `secrets.SERVER_ADRESSE`, Token = `github.token`.
  - Job `release`: `needs: ausliefern`, nur `refs/heads/main`. Checkout. Version aus `package.json` (mit `node -p`, nur Bordmittel), Text = Abschnitt `## <version>…` aus `docs/versionen.md` bis zur nächsten `## `-Überschrift. `gh release create v<version> --target "$GITHUB_SHA" --title "v<version>" --notes-file …` mit `GH_TOKEN=github.token`.
  - Alle neuen Jobs mit `timeout-minutes` und eigenem `permissions`-Block nach Task 7.

- [ ] **Step 1: Test schreiben** (`code-stand.test.ts`, in einem Temp-Git-Repo): Eine Änderung an `docs/x.md` oder `README.md` lässt den Hash gleich. Eine Änderung an `src/a.ts` ändert ihn. Die Ausgabe passt auf `^[0-9a-f]{40}\n$`
- [ ] **Step 2:** Test → FAIL, dann `code-stand.sh` umsetzen → PASS
- [ ] **Step 3:** `check.yml` erweitern. `npm run pruefungen` → `workflow-rechte: ok`. `npm run lint` → grün
- [ ] **Step 4:** Rauchtest-Schritt lokal nachstellen: `docker build -t mytco:ci . && bash betrieb/nachweis/rauchtest.sh mytco:ci` → `ok`
- [ ] **Step 5:** Commit `feat: CI-Jobs für Bauen, Ausliefern und Release hinter Schaltern, Rauchtest aktiv (#32)`

Der Beleg in der CI (Rauchtest grün, neue Jobs «skipped») folgt nach dem Merge nach `dev` mit `gh run view`.

### Task 9: Doku nachführen

**Files:**
- Modify: `docs/ci-cd-und-release.md`, `docs/sicherheitskonzept.md`, `docs/context-scopes.md`, `docs/beobachtungen.md`, `docs/versionen.md`

Inhalt:
- `ci-cd-und-release.md`, *Umgebungen*: Übergangsadresse, Demo auf Test, Testgruppe auf Live. «Wer baut die Auslieferung» → #32 gebaut, Inbetriebnahme #39. *Auslieferung*: Türsteher, Einrichtung im Image, Live nur mit dem Image von Test (Code-Stand), zwei Schalter, Sicherung/Probe, Befehle `zurueck`, `wiederherstellen`, `probe`. *Geheimnisse*: die Namen `SSH_SCHLUESSEL_TEST`, `SSH_SCHLUESSEL_LIVE`, `SSH_BEKANNTE_HOSTS`, `SERVER_ADRESSE` sowie die Dateien `geheim.env`, `proxy.env`, `sicherung.env`. *Prüfungen*: Zeilen «Rauchtest des Images» und «Rechte der Workflows» mit Stand `vorhanden`. Markierungen K-10/K-11 an den Adressen und an der Mail.
- `sicherheitskonzept.md`: SI-13 verweist auf #39 statt #32. *Restrisiken* «Schreibrecht auf GitHub reicht bis Live» ergänzt um: reicht über die Einrichtung im Image bis auf den Server (Geheimnisse beider Umgebungen, Sicherungszugang). Der Türsteher bleibt von Hand. Die Bedingungen sind unverändert.
- `context-scopes.md`: Zeile «Betrieb und Auslieferung» → `betrieb/`, `tests/betrieb/`, `scripts/ci/`, `.github/workflows/`, `Dockerfile`, `docs/ci-cd-und-release.md`, `docs/sicherheitskonzept.md`.
- `beobachtungen.md`: als **Erledigt 2026-11-02** (#32) markieren: HEALTHCHECK und `svelte-kit sync` im Dockerfile, `/_app/*` ohne Header, Rauchtest des Images, `frame-ancestors`. Neue Beobachtungen nur, wenn welche anfallen.
- `versionen.md`, *Unveröffentlicht*: ein Eintrag zu Umgebungen, Auslieferung und Sicherung (#32).

- [ ] **Step 1:** Dateien anpassen
- [ ] **Step 2:** `make docs` → grün, `make annahmen K=K-10` zeigt die neuen Stellen
- [ ] **Step 3:** Commit `docs: Betrieb, Auslieferung und Restrisiko nachgeführt (#32)`

### Abschluss

- [ ] `make check` grün, `make betrieb-nachweis` grün (Ausgabe in den Bericht)
- [ ] Review: superpowers-Code-Review und Agent `cas-reviewer`; Befunde klären
- [ ] Merge nach `dev` nach Skill `tco-branching`. CI-Lauf prüfen: Rauchtest grün, `bauen`/`finden`/`ausliefern`/`release` übersprungen
- [ ] DoD in #32 abhaken (mit Verweisen), #32 schliessen erst nach dem Release, nach `tco-branching`
