# Server in Betrieb nehmen (Demo auf Test) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MyTCO läuft auf dem bestellten Infomaniak-Server als Demo auf Test unter einer Übergangsadresse, gehärtet, gesichert und gemessen.

**Architecture:** Teil A (Aufgaben 1–5) bereitet im Repo vor, was ohne Server geht, und wird nach `dev` gemergt (liefert nicht aus, `AUSLIEFERUNG_TEST` ist aus). Teil B (Aufgaben 6–10) läuft auf dem Server mit dem Projektleiter, in der Reihenfolge des Designs, mit Haltepunkten für jede Freigabe. Die Einrichtung des Servers liegt als Skript im Repo, damit ein Umzug ohne Neuaufbau von Hand geht.

**Tech Stack:** Bash (betrieb/), Vitest mit Shell-Stubs (`tests/betrieb/`), SvelteKit/Node (nodemailer), Docker Compose, Caddy, restic, Ubuntu LTS (systemd, journald, ufw, unattended-upgrades).

**Spec:** `docs/superpowers/specs/2026-11-18-server-inbetriebnahme-design.md`

## Global Constraints

- Keine neuen npm-Pakete; auf dem Server nur Pakete aus Ubuntu und Docker (Docker-Repo nach offizieller Anleitung).
- Server-IP, Übergangsadresse, Absender-Domain auf Test, persönliche Mailadressen und Zugangsdaten nie ins Repo oder Issue; Nachweise geschwärzt.
- Logs nur feste Texte. DS-06: Logs höchstens 30 Tage, IP-Adressen höchstens 24 Stunden, auch in Protokollen des Systems.
- SI-13: SSH nur mit Schlüssel, kein Root über SSH, Firewall offen nur 22/80/443, automatische Sicherheits-Updates.
- SI-17: SMTP nur mit TLS.
- Bestellen, Konten anlegen, Geheimnisse auf GitHub, `AUSLIEFERUNG_TEST=an`: nur nach ausdrücklicher Freigabe des Projektleiters im Chat.
- Commits: Präfixe `feat:`/`fix:`/`docs:`/`test:`/`refactor:`, Dateien einzeln stagen, Worktree `.claude/worktrees/issue-039`, Branch `chore/issue-039`.
- Tests prüfen Verhalten; jede Verhaltensänderung beginnt mit einem roten Test.

## Review Focus

1. SMTP-URL mit `?tls.rejectUnauthorized=false` neben `requireTLS=true` — in Produktion abgewiesen (Test in Aufgabe 1).
2. Shell-Variable `POSTGRES_PASSWORD` oder `ORIGIN` exportiert beim Aufruf des Türstehers — Compose bekommt den Wert aus `geheim.env` (Test in Aufgabe 2).
3. Migration der neuen Fassung scheitert auf Test nach `down --volumes` — Test läuft danach mit dem alten Image, Ergebnis `fehler` (Test in Aufgabe 3).
4. Ein sshd-Drop-in der Distribution (`50-cloud-init.conf` mit `PasswordAuthentication yes`) übersteuert die eigene Einstellung — `pruefen.sh` liest den wirksamen Wert (`sshd -T`), nicht die Datei (Test in Aufgabe 4).
5. rsyslog schreibt IP-Adressen nach `/var/log/auth.log` mit wöchentlicher Rotation — `pruefen.sh` meldet `fehler`, solange rsyslog aktiv ist (Test in Aufgabe 4).

---

## Teil A — im Repo, ohne Server

### Task 1: SMTP — TLS nicht per URL abschaltbar, Zeitlimits gesetzt

**Files:**
- Modify: `src/lib/server/einstellungen.ts` (`tlsErzwungen`, ca. Zeile 100)
- Modify: `src/lib/server/login/mail.ts` (`erstelleSmtpMailer`, Zeile 56)
- Test: `src/lib/server/einstellungen.test.ts` (Block «TLS-Pflicht in Produktion»), Test für `erstelleSmtpMailer` neben bestehenden Mail-Tests (`grep -rn erstelleSmtpMailer src tests`)

**Interfaces:**
- Produces: `erstelleSmtpMailer(transport: string | object, absender: string): Mailer` unverändert in der Signatur; bei einem String setzt sie `connectionTimeout: 10_000`, `greetingTimeout: 10_000`, `socketTimeout: 20_000` (ms).

- [ ] **Step 1: Failing tests**
  - `test('requireTLS mit tls.rejectUnauthorized=false wird abgewiesen')`: `leseEinstellungen` mit `NODE_ENV=production`, `MYTCO_SMTP_URL=smtp://u:p@smtp.example.org:587?requireTLS=true&tls.rejectUnauthorized=false` wirft `MYTCO_SMTP_URL ohne TLS`.
  - Gleich für `smtps://u:p@smtp.example.org?tls.rejectUnauthorized=false` und für `…?requireTLS=true&ignoreTLS=true`.
  - Gegenprobe: `smtp://u:p@smtp.example.org:587?requireTLS=true` bleibt gültig.
  - `test('Mailer setzt Zeitlimits')`: mit nodemailer `createTransport` per `vi.spyOn` beobachtet, erste Übergabe enthält die drei Zeitlimits und die URL.
- [ ] **Step 2:** `npx vitest run src/lib/server/einstellungen.test.ts` — rot bei den drei Abweisungen.
- [ ] **Step 3:** `tlsErzwungen` gibt `false`, sobald ein Query-Parameter `tls.rejectUnauthorized` mit einem anderen Wert als `true` oder `ignoreTLS` mit `true` vorkommt (vor den bisherigen Regeln). `erstelleSmtpMailer` übergibt bei einem String `{ url: transport, connectionTimeout, greetingTimeout, socketTimeout }`; vorher im Quelltext von nodemailer (`node_modules/nodemailer/lib/smtp-transport/index.js`) prüfen, dass `url` als Option ausgewertet wird und welche Seite bei Gleichnamigen gewinnt; das Ergebnis als Kommentarzeile.
- [ ] **Step 4:** Tests grün; `npm run lint` ohne Befund.
- [ ] **Step 5:** Commit `fix: SMTP-Zertifikatsprüfung nicht per URL abschaltbar, Zeitlimits (#39)`.

### Task 2: `compose()` schützt alle Werte aus `geheim.env` vor der Shell

**Files:**
- Modify: `betrieb/bin/lib.sh` (`compose`, Zeile 112; Kommentar und `unset MAIL_NUR_AN` Zeile 8–10)
- Test: `tests/betrieb/lib.test.ts` (Block `compose`), Treiber `tests/betrieb/lib-treiber.sh` und Stub `tests/betrieb/stubs/docker` falls die Umgebung des Aufrufs dort noch nicht für beliebige Namen sichtbar ist

**Interfaces:**
- Produces: `compose <umgebung> <args…>` wie bisher; vor `docker compose` wird jeder Name, der in `<umgebung>/geheim.env` als Schlüssel steht (Formen wie `mail_umleitung_gesetzt` sie erkennt: `NAME=`, `export NAME=`, `NAME:`), aus der Umgebung entfernt. `MYTCO_UMGEBUNG` und `MYTCO_IMAGE` bleiben (stehen nie in `geheim.env`).

- [ ] **Step 1: Failing test** `test('aus der Shell exportierte Werte aus geheim.env erreichen Compose nicht')`: `geheim.env` mit `POSTGRES_PASSWORD=datei` und `ORIGIN=https://datei.invalid`, Aufruf mit `env: { POSTGRES_PASSWORD: 'shell', ORIGIN: 'https://shell.invalid' }`; die vom Stub aufgezeichnete Umgebung enthält keinen der beiden Namen. Zweiter Test: `MYTCO_IMAGE` aus dem Aufrufer kommt weiter an.
- [ ] **Step 2:** `npx vitest run tests/betrieb/lib.test.ts` — rot.
- [ ] **Step 3:** Schlüssel aus der Datei lesen (nur `[A-Za-z_][A-Za-z0-9_]*`), in einer Subshell `unset`, dann `docker compose …`. Der globale `unset MAIL_NUR_AN` bleibt (die Live-Sperre in `ausliefern` braucht ihn auch ohne Datei).
- [ ] **Step 4:** Mehrzeiliger `MAIL_NUR_AN`: lokal mit Docker Desktop eine Wegwerf-Datei `MAIL_NUR_AN="` + Zeilenumbruch + Adresse + `"` und `docker compose -f betrieb/compose.umgebung.yml --env-file <datei> config` (mit Pflichtwerten als Platzhalter) prüfen, was Compose daraus macht. Liest Compose eine Adresse, die `mail_umleitung_gesetzt` als leer sieht: roter Test in `describe('mail_umleitung_gesetzt')` und Erkennung erweitern; sonst den Satz «jede Zeilenform, die Compose liest» in `betrieb/README.md` mit dem Befund belegen.
- [ ] **Step 5:** Tests grün, `make betrieb-nachweis` im Hintergrund grün (`… ok, 0 fehler`).
- [ ] **Step 6:** Commit `fix: Werte aus geheim.env vor der Shell geschützt (#39)`.

### Task 3: Test fällt nach `down --volumes` auf das alte Image zurück

**Files:**
- Modify: `betrieb/bin/ausliefern` (Abschnitte «Test zurücksetzen» bis «App starten», Zeile 236–260; `rueckfall` Zeile 59)
- Test: `tests/betrieb/ausliefern.test.ts` (Block «Fehlerfälle»)
- Modify: `docs/ci-cd-und-release.md`, Abschnitt *Auslieferung* (Rückfall auf Test)

**Interfaces:**
- Produces: neue Funktion `rueckfall_test` in `ausliefern`: nur auf Test und nur mit `ALT_DIGEST`; startet mit `MYTCO_IMAGE=$MYTCO_REPO@$ALT_DIGEST` Datenbank, Migration, Testdaten (wenn das alte Image sie hat) und App; endet immer mit `scheitern`. `zustand/aktuell` bleibt `ALT_DIGEST`.

- [ ] **Step 1: Failing tests**
  - `test('Test: Migration scheitert nach dem Zurücksetzen, mit Vorgänger: altes Image wird neu aufgesetzt, fehler')`: Basis mit `test/zustand/aktuell` = `ALT`, `STUB_FEHLER_BEI: 'migrate.ts'` nur für den neuen Digest (Stub ggf. um `STUB_FEHLER_NUR_DIGEST` erweitern); erwartet: Status 1, letzte Zeile `fehler`, ein App-Start mit `ALT`, Migration mit `ALT` aufgerufen, `aktuell` = `ALT`.
  - Gleich für scheiternde Testdaten.
  - `test('Test: erster Lauf, Migration scheitert: fehler ohne Rückfall')`.
  - Bestehender Test «Migration scheitert: … kein Start der App» gilt danach nur noch für Live; umbenennen auf Live.
- [ ] **Step 2:** `npx vitest run tests/betrieb/ausliefern.test.ts` — rot.
- [ ] **Step 3:** In «Datenbank und Migration» und «Testdaten» auf Test `rueckfall_test` statt `scheitern`; App ungesund auf Test ebenfalls `rueckfall_test` (die Datenbank des neuen Images passt nicht zum alten). Live unverändert (gehört in die Live-Session).
- [ ] **Step 4:** Tests grün; `docs/ci-cd-und-release.md` nennt: Test setzt bei jedem Fehler nach dem Zurücksetzen das alte Image samt Testdaten neu auf.
- [ ] **Step 5:** Commit `fix: Test fällt nach dem Zurücksetzen auf das alte Image zurück (#39)`.

### Task 4: Einrichtung und Prüfung des Servers als Skript

**Files:**
- Create: `betrieb/server/einrichten.sh` (als root, idempotent)
- Create: `betrieb/server/pruefen.sh` (als root, nur lesend, gibt je Massnahme `ok <name>` oder `fehler <name>`, am Ende `ok`/`fehler`, Exit 0/1)
- Create: `betrieb/server/dateien/sshd-mytco.conf`, `journald-mytco.conf`, `logrotate-mytco`, `20auto-upgrades`
- Test: `tests/betrieb/server.test.ts` mit Stubs unter `tests/betrieb/stubs/` (`sshd`, `ufw`, `systemctl`, `journalctl`, `id`, `stat` nach Bedarf, Muster wie `stubs/docker`); Pfade über `MYTCO_WURZEL` (Vorgabe `/`) umlenkbar

**Interfaces:**
- Produces: `einrichten.sh <ssh-schluessel-datei>` und `pruefen.sh`; beide lesen `MYTCO_WURZEL` für `/etc` und `/opt`. Benutzer `mytco` (Docker-Gruppe, Besitzer von `/opt/mytco`, 0750), `bin/` als `root:root` 0755.
- Werte, die `pruefen.sh` erzwingt (aus SI-13/DS-06):

| Name | Bedingung |
|------|-----------|
| `ssh-passwort` | `sshd -T` → `passwordauthentication no`, `kbdinteractiveauthentication no` |
| `ssh-root` | `sshd -T` → `permitrootlogin no` |
| `ssh-umgebung` | `sshd -T` → `permituserenvironment no` |
| `firewall` | `ufw status verbose`: aktiv, Standard eingehend `deny`, erlaubt genau 22, 80, 443 (tcp; 443 auch udp für HTTP/3 erlaubt), `Logging: off` |
| `updates` | `unattended-upgrades` aktiv, `APT::Periodic::Unattended-Upgrade "1"` |
| `journal` | wirksames `MaxRetentionSec` ≤ 24 h, `Storage=persistent` |
| `rsyslog` | nicht aktiv (sonst landen IP-Adressen in `/var/log/auth.log` mit Wochenrotation) |
| `protokolle` | logrotate-Regel für `/opt/mytco/*/protokoll.log` und `/var/lib/docker/containers/*/*-json.log`: `daily`, `maxage 30`, `copytruncate` |
| `betrieb` | `/opt/mytco` gehört `mytco`, `/opt/mytco/bin` `root:root` 0755, `mytco` in Gruppe `docker` |

- [ ] **Step 1: Failing tests** in `server.test.ts`: je Zeile der Tabelle ein Fall «Stub meldet unsicheren Wert → `fehler <name>`, Exit 1» und ein Fall «alles sicher → jede Zeile `ok`, letzte Zeile `ok`». Dazu Review Focus 4 (Drop-in mit `PasswordAuthentication yes`: Stub `sshd -T` liefert `passwordauthentication yes` → `fehler ssh-passwort`) und 5 (rsyslog aktiv → `fehler rsyslog`).
- [ ] **Step 2:** `npx vitest run tests/betrieb/server.test.ts` — rot (Skript fehlt).
- [ ] **Step 3:** `pruefen.sh` schreiben bis grün. Dann `einrichten.sh`: Pakete (`ufw`, `unattended-upgrades`, `restic` nicht nötig — läuft als Container), Docker nach offizieller Anleitung, Benutzer, Dateien aus `dateien/` an ihren Ort (`/etc/ssh/sshd_config.d/00-mytco.conf`, damit sie vor `50-cloud-init.conf` gelesen wird), `ufw` setzen, rsyslog stoppen und deaktivieren, `/opt/mytco` anlegen, Schlüssel des Projektleiters für `mytco` hinterlegen, zuletzt `pruefen.sh` aufrufen. Keine Ausgabe von Werten.
- [ ] **Step 4:** Tests grün; `bash -n` auf beide Skripte; `make check-schnell` grün.
- [ ] **Step 5:** Commit `feat: Einrichtung und Prüfung des Servers als Skript (#39)`.

### Task 5: Doku vor dem Server, Merge nach `dev`

**Files:**
- Modify: `betrieb/README.md` (Abschnitt «Server einrichten» mit `einrichten.sh`/`pruefen.sh`; Rechte von `mytco`; Protokolle und ihre Fristen; «Platz für die Website»)
- Modify: `docs/adr/adr-003-hosting-infomaniak-vps.md` (Nachtrag 18.11.2026: Object Storage festgelegt; eigene Organisation; Website-Vorsorge; Scaleway auf Test mit Übergangs-Absender; Vergrössern erst bei Bedarf)
- Modify: `docs/betrieb-und-uebergabe.md` (Konten: Organisation und beide Umzugswege; Sicherung: Ziel festgelegt; Konsolenzugang weiter V bis Aufgabe 8)
- Modify: `docs/versionen.md` (unter «Unveröffentlicht»: «An der App ändert sich nichts: Mailversand mit festen Zeitlimits, Einrichtung des Servers als Skript (#39).»)

- [ ] **Step 1:** Texte nach Spec, Abschnitte «Umzug des Kontos», «Vorsorge für die Website», «Sicherungsziel»; keine IP, keine Domain des Projektleiters.
- [ ] **Step 2:** `make check` im Hintergrund auf dem committeten Stand, grün.
- [ ] **Step 3:** Agent `merge-reviewer` und superpowers-Review über den Branch; Befunde klären.
- [ ] **Step 4:** Nach `dev` mergen nach Skill `tco-branching` Schritt 4 (Merge-Commit, Eintrag geprüft). Worktree bleibt für Teil B (Nacharbeit dieser Session, `in-arbeit` bleibt) — nach dem Merge neuer Worktree ab `origin/dev`.

## Teil B — auf dem Server, mit dem Projektleiter

Jede Aufgabe endet mit einem Nachweis (Befehl und Ausgabe, geschwärzt) als Kommentar in #39. Haltepunkte (⏸) warten auf die Freigabe im Chat.

### Task 6: Bestellen und Konten ⏸

- [ ] Projektleiter (Anleitung von Claude): Infomaniak-Organisation «TC Olten – MyTCO» anlegen, 2FA aktiv; VPS Lite 2 vCPU / 4 GB, aktuelles Ubuntu LTS aus der Auswahl, eigener SSH-Schlüssel (ed25519, neu, nur für diesen Server); Object Storage in derselben Organisation, ein Bucket `mytco-sicherung`, S3-Zugang nur dafür. Bei der Bestellung festhalten: Preis, Laufzeit, ob der DPA Object Storage nennt, ob der Manager eine Übertragung des VPS anbietet.
- [ ] Projektleiter: Scaleway-Organisation, 2FA, Transactional Email, Domain = Subdomain seiner Domain; SPF/DKIM bei Infomaniak für die Subdomain eintragen, Hauptdomain unberührt; Prüfung bei Scaleway «verified». SMTP-Zugang (IAM-Schlüssel nur für TEM). Ob Scaleway eine Organisation übertragen kann, nachlesen.
- [ ] Nachweis: Rechnungsbeträge (für `kosten.md`), Status der Domain bei Scaleway.

### Task 7: Härten nach SI-13

- [ ] Als root (Konsole bzw. erster SSH-Login): Repo-Stand von `dev` holen (nur `betrieb/`), `einrichten.sh <schluessel>`; Ausgabe von `pruefen.sh` endet mit `ok`.
- [ ] Von aussen (Mac): `ssh root@<server>` abgewiesen; `ssh -o PubkeyAuthentication=no mytco@<server>` abgewiesen; Port-Scan aller TCP-Ports zeigt nur 22, 80, 443 (Werkzeug: `nmap`, falls vorhanden, sonst Schleife mit `nc -z -w1`).
- [ ] Konsolenzugang ohne SSH im Infomaniak-Manager ausprobieren; `betrieb-und-uebergabe.md` von V auf B.

### Task 8: MyTCO einrichten

- [ ] Als root: `bin/ausliefern-ssh` und `bin/lib.sh` nach `/opt/mytco/bin/` (root:root 0755).
- [ ] Zwei CI-Schlüssel erzeugen (ed25519, ohne Passphrase, nur lokal in einem Wegwerf-Ordner), in `~mytco/.ssh/authorized_keys` mit `command="/opt/mytco/bin/ausliefern-ssh test",restrict` bzw. `live`. Belegen: Test-Schlüssel mit beliebigem Befehl startet nur den Türsteher; Test-Schlüssel mit Ziel Live → `fehler`.
- [ ] `test/geheim.env` (600): `ORIGIN` und `MYTCO_ADRESSE` = Übergangsadresse Test, SMTP-URL Scaleway mit `requireTLS=true`, Absender auf der Subdomain, `MAIL_NUR_AN` = Adresse des Projektleiters, neue Zufallswerte für Code-Schlüssel, DB-Passwort, VAPID-Paar. `proxy/proxy.env` (600): beide Übergangsadressen (sslip.io), Test-Benutzer und Hash. `sicherung.env` (600): `RESTIC_REPOSITORY=s3:<endpunkt>/mytco-sicherung`, neues `RESTIC_PASSWORD` (sofort in den Passwortmanager des Projektleiters), S3-Zugang.
- [ ] restic: `init` wie in `betrieb/README.md`; Belege mit Test-Daten nach der ersten Auslieferung in Aufgabe 9 (`sichern test`, `probe test` → `ok`).
- [ ] Mailweg: aus dem Image ein Testmail an eine erfundene Adresse auslösen (z. B. `scripts/testdaten.ts` im Rahmen der ersten Auslieferung); es kommt beim Projektleiter an, Betreff `[Test für …]`.
- [ ] DB-Server-Log: auf Test absichtlich scheiterndes Einspielen (`wiederherstellen test` mit manipuliertem Lauf in einer Wegwerf-Kopie), `docker logs` der DB auf Werte ansehen; bei Werten `log_error_verbosity=terse` in `compose.umgebung.yml` (eigener Commit mit Test im Rauchtest) oder bewusst entscheiden ⏸.
- [ ] Timer bleibt aus (erst mit Live).

### Task 9: Test einschalten ⏸

- [ ] Entscheide des Projektleiters einholen: Versionsnummer auf Test (ADR-012), offene App nach einer Auslieferung (E-65), Nachweis der Auslieferungskette als CI-Lauf jetzt oder später; Ergebnisse in ADR-012 bzw. `beobachtungen.md`.
- [ ] Auto-Modus: Server, Container-Ablage und beide Adressen in `~/.claude/settings.json` → `autoMode.environment` eintragen (lokal, nicht im Repo).
- [ ] Projektleiter bestätigt das Restrisiko «Schreibrecht auf GitHub reicht bis root» (Sicherheitskonzept, «Neu zu bestätigen»); im Sicherheitskonzept als bestätigt nachführen.
- [ ] ⏸ Freigabe: Geheimnisse in die GitHub-Umgebung `test` (Namen nach `docs/ci-cd-und-release.md#geheimnisse`), `AUSLIEFERUNG_TEST=an`.
- [ ] Nächster Merge nach `dev` liefert aus; Belege: CI-Lauf `ok`; Demo nur mit Passwort (ohne → 401); Login mit Code per Mail für das erfundene Testkonto; Testdaten vorhanden; `zurueck test` einmal → altes Image läuft; danach wieder vorwärts.
- [ ] B-17: «Mitteilung senden» an alle Testmitglieder mit echtem SMTP, Dauer bis zur Antwort messen; über ca. 30 s → `beobachtungen.md`.

### Task 10: Messen, Kosten, Doku

- [ ] Messen auf dem Server: `free -m`, `df -h /`, `docker stats --no-stream` in Ruhe; dasselbe während einer Auslieferung; Lastspitze mit `xargs -P 20` und `curl` (200 Abrufe der Startseite mit Test-Passwort), dabei `docker stats`. Werte mit Datum in `docs/betrieb-und-uebergabe.md`, neuer Abschnitt «Auslastung» (Live: «folgt mit Live»), und eine Einschätzung für K-48 (Website auf demselben Server: Reserve an RAM und Platte).
- [ ] `docs/kosten.md`: Server und Object Storage mit effektiven Beträgen (B, Rechnung), Scaleway; Beobachtung vom 12.11.2026 abarbeiten: Posten der Vorstandsfassung (nächste VPS-Stufe als Worst Case, Überwachung, Passwort-Tresor, Website-Umzug) übernehmen oder bewusst weglassen, Totals neu; `ci-cd-und-release.md#actions-minuten` gegen das Guthaben-Modell von GitHub prüfen; Eintrag nach `docs/beobachtungen-archiv.md` gemäss Kopf von `beobachtungen.md`.
- [ ] `docs/ci-cd-und-release.md` und `docs/beobachtungen.md` nachführen; DoD-Haken in #39 setzen, Offenes für Live im Issue kommentieren.
- [ ] `make check`, `merge-reviewer`, Merge nach `dev` nach `tco-branching`, aufräumen.
