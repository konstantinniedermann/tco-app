# Betrieb auf dem Server

Kurznotiz für den Betrieb. Das Konzept der Auslieferung steht in `docs/ci-cd-und-release.md`.

## Aufbau unter `/opt/mytco` (`MYTCO_BASIS`)

```
bin/ausliefern-ssh, bin/lib.sh      Türsteher, von Hand eingerichtet
<umgebung>/geheim.env               von Hand (Rechte 600), Vorlage geheim.env.example
<umgebung>/betrieb/                 Einrichtung aus dem zuletzt ausgelieferten Image
<umgebung>/zustand/aktuell|vorher   Digest des laufenden und des vorherigen Images
test/zustand/neu-aufgesetzt         Zähler der letzten geglückten Neuaufsetzung von Test
<umgebung>/protokoll.log            alles, was docker, psql und die App ausgeben
fassungen/<digest>/betrieb/         aus dem Image entnommene Einrichtung
proxy/                              compose.proxy.yml, caddy/Caddyfile, caddy/umgebungen/<umgebung>.caddy
proxy/proxy.env                     von Hand (Rechte 600), Vorlage proxy.env.example
gemeinsam/bin/                      sichern, wiederherstellen, probe, lib.sh (für den Timer)
sicherung.env                       von Hand (Rechte 600), Vorlage sicherung.env.example
```

`<umgebung>` ist `test` oder `live`. Die Skripte legen alles nur für den Benutzer `mytco`
lesbar an; einzig die Caddy-Dateien unter `proxy/caddy/` sind für alle lesbar (der Proxy liest
sie, Geheimnisse stehen darin keine).

## Server einrichten

Ein frischer Server (Ubuntu LTS) wird mit `server/einrichten.sh` eingerichtet, als root aus
einem Checkout des Repos: `sudo betrieb/server/einrichten.sh <admin-benutzer>`. Das Skript ist
mehrfach ausführbar und endet mit `server/pruefen.sh <admin-benutzer>`, das je Massnahme
`ok <name>` oder `fehler <name>` meldet; `pruefen.sh` lässt sich jederzeit allein laufen und
ändert nichts.

- **Anmeldung (SI-13):** nur mit Schlüssel, kein root über SSH (`/etc/ssh/sshd_config.d/00-mytco.conf`,
  vor den Dateien der Distribution gelesen; geprüft wird der wirksame Wert mit `sshd -T`). Der
  Projektleiter meldet sich als `<admin-benutzer>` an (nur `a-z`, `0-9`, `_`, `-`) und wird mit
  `sudo` ohne Passwort root; gibt es den Benutzer nicht, legt das Skript ihn mit den Schlüsseln
  des Aufrufers bzw. von root an, ohne deren Optionen (Cloud-Images sperren root mit
  `command=…`). Kann er sich nicht anmelden oder nicht root werden, bricht es ab, bevor SSH
  umgestellt wird.
- **Firewall:** `ufw` lässt eingehend nur 22, 80 und 443 (tcp) zu, ohne Protokoll. Davor steht
  die Firewall von Infomaniak (Manager → VPS → *Firewall*); sie lässt anfangs nur 22 und ICMP
  herein, 80 und 443 (tcp) sind dort von Hand freizugeben. Fehlen sie, bekommt Caddy kein
  Zertifikat (Let's Encrypt erreicht den Server nicht).
  Docker öffnet veröffentlichte Ports an `ufw` vorbei; veröffentlicht wird darum nur Caddy (80,
  443). Ein Port-Scan von aussen belegt es.
- **Updates:** `unattended-upgrades` spielt die Sicherheits-Updates von Ubuntu täglich ein.
  Docker selbst kommt aus dem Docker-Repository und wird von Hand aktualisiert.
- **Betriebsbenutzer `mytco`:** in der Gruppe `docker`, Besitzer von `/opt/mytco` (0750);
  `/opt/mytco/bin` mit Türsteher und `lib.sh` gehört `root:root` (0755). Die Docker-Gruppe ist
  so viel wie root (Restrisiko im Sicherheitskonzept). `~mytco/.ssh/authorized_keys` enthält nur
  die zwei Schlüssel der CI (siehe unten).

### Protokolle und ihre Fristen (DS-06)

| Protokoll | Inhalt | Frist |
|-----------|--------|-------|
| Systemjournal (auch sshd) | Anmeldungen mit IP-Adresse | 24 Stunden (`journald.conf.d/mytco.conf`: abgelegte Dateien 23 Stunden, neue Datei jede Stunde) |
| `/var/log/wtmp`, `/var/log/btmp` | Anmeldungen mit IP-Adresse | täglich geleert, keine alte Datei |
| `/var/log/lastlog`, wtmpdb, lastlog2 | letzte Anmeldung je Benutzer mit IP-Adresse | täglich geleert (Timer `mytco-anmeldungen`) |
| rsyslog (`/var/log/auth.log` usw.) | dasselbe wie das Journal | abgeschaltet |
| Firewall | Adressen abgewiesener Pakete | kein Protokoll |
| `<umgebung>/protokoll.log` | Ausgaben von Docker, psql und App | 30 Tage (`logrotate.d/mytco`) |
| Logs der Container | Ausgaben der Container, ohne IP-Adressen | 30 Tage (`logrotate.d/mytco`); Compose hält nur eine Datei bis 10 MB |

### Mail-Fänger auf Test

Test verschickt keine Mails nach aussen: Mit `MYTCO_SMTP_URL=smtp://mail.invalid:1025` in
`test/geheim.env` gehen sie an einen Mailpit-Container (Dienst `mailpit`, nur Test, startet mit
der Datenbank). Das Postfach steht unter `https://<adresse von test>/_mail/`, hinter demselben
Passwort wie Test. Er hält höchstens 200 Mails, nur im Container: Er leert sich, wenn
`ausliefern test` Test neu aufsetzt (danach liegt dort die Mail mit dem Brief-Code der
Testdaten) und wenn der Container neu entsteht, etwa mit einem neuen Mailpit-Image. Live startet
ihn nie.

### Test neu aufsetzen

Test behält seine Datenbank über Auslieferungen hinweg, wie Live. Ändert ein Branch, wie die
Testdaten oder Konten entstehen, erhöht er die Zahl in `betrieb/test-neu-aufsetzen` um eins.
Die nächste Auslieferung auf Test leert dann einmal Datenbank und Mail-Fänger und legt die
erfundenen Mitglieder neu an. Erst nach einer geglückten Auslieferung steht die Zahl in
`test/zustand/neu-aufgesetzt`; scheitert sie, setzt die nächste wieder neu auf. Live liest den
Zähler nie.

Zwei Branches, die die Zahl auf denselben Wert erhöhen, mergen ohne Konflikt, und Test wird nur
einmal neu aufgesetzt; die Testdaten des später gemergten fehlen dann. Darum vor dem Merge `dev`
einmergen: Hat `dev` die Zahl seit dem Abzweigen schon erhöht, sie im eigenen Branch noch einmal
erhöhen. Ein frischer Stand für die [Checkliste vor dem Release](../docs/testkonzept.md#checkliste-vor-dem-release)
entsteht auf dieselbe Weise, mit einem Commit, der nur die Zahl erhöht. Ein Image von vor dem
Zähler (etwa ein erneut gestarteter alter Lauf) bringt sein eigenes `ausliefern` mit und setzt
Test wie früher bei jeder Auslieferung neu auf.

### Platz für eine Website

Caddy hängt an einem eigenen Netz je Umgebung (`mytco-proxy-test`, `mytco-proxy-live`); die App
hängt nur an ihrem Proxy-Netz und an ihrem internen Netz, die Datenbank nur am internen. Caddy
liest jede Datei unter `proxy/caddy/umgebungen/`, und `ausliefern` überschreibt nur die Datei
seiner Umgebung. Eine Website (K-48) käme darum dazu mit eigenem Compose-Projekt
(`mytco-website`), eigenem Netz `mytco-proxy-website` in `compose.proxy.yml`, eigener Datei
`umgebungen/website.caddy` und Grenzen für Speicher und CPU. Sie erreicht so weder eine Datenbank
noch eine App von MyTCO. Gebaut ist davon nichts.

## Von Hand eingerichtet, nie von der CI

- `bin/ausliefern-ssh` und `bin/lib.sh` aus diesem Ordner, Ordner und Dateien `root:root` mit
  Rechten 0755 (spielt `server/einrichten.sh` ein): `mytco` kann sie so nicht versehentlich ändern. Ein schädliches Image kann das
  über den Docker-Zugang von `mytco` trotzdem umgehen (Restrisiko im Sicherheitskonzept).
  Ändert sich eine der beiden Dateien im Repo, spielt der Betrieb sie als root neu ein; die CI
  tut das nie. `lib.sh` enthält fest die Container-Ablage (`MYTCO_REPO_STANDARD`), nach einem
  Umzug des Repos also immer.
- `geheim.env` je Umgebung, `proxy/proxy.env`, `sicherung.env`, alle mit Rechten 600.
- `~/.ssh/authorized_keys` des Benutzers `mytco`, ein Schlüssel je Umgebung:
  `command="/opt/mytco/bin/ausliefern-ssh test",restrict ssh-ed25519 …` (für Live `live`).
- **Sicherungsziel einmal anlegen**, bevor Live Daten hat: `sichern` legt nie selbst eines an
  und meldet ohne Ziel `fehler`. `RESTIC_REPOSITORY` in `sicherung.env` ohne Anführungszeichen,
  als absoluter Pfad oder mit Schema (`s3:…`, `sftp:…`, `rest:…` usw.). Anlegen als `mytco`:
  `( . /opt/mytco/bin/lib.sh && restic_docker init </dev/null )`
- systemd-Units `systemd/mytco-sicherung.{service,timer}` nach `/etc/systemd/system/`. Der Timer
  startet jede Nacht um 02:30 (Serverzeit; verpasste Läufe holt er nach). Den Timer
  erst einschalten, wenn Live eingeschaltet und einmal ausgeliefert ist (vorher meldet er jede
  Nacht `fehler`): `systemctl enable --now mytco-sicherung.timer`.

Vorausgesetzt wird `PermitUserEnvironment no` (Standard) und das übliche `AcceptEnv` (nur
`LANG`/`LC_*`); der Türsteher setzt `LC_ALL=C` selbst.

Der Passwort-Hash für Test kommt aus `caddy hash-password` und steht in `proxy.env` in
einfachen Anführungszeichen: `MYTCO_TEST_PASSWORT_HASH='$2a$14$…'`. Ohne sie frisst Compose die
`$`-Zeichen.

Die Test-Sperre (`caddy/umgebungen/test.caddy`) fragt nicht mit dem Passwortfenster des
Browsers, sondern mit einer Seite mit Formular; danach setzt Caddy das Cookie `mytco_test_zugang`
für ein Jahr, und mit ihm fragt er nicht mehr. Der Grund: Die App auf dem iPhone-Startbildschirm
behält ein Passwort aus dem Browserfenster nicht über einen Neustart und fragt nicht neu, Cookies
behält sie. Der Wert des Cookies ist der Passwort-Hash; **ein neues Passwort entwertet darum alle
Cookies**, jedes Gerät meldet sich einmal neu an. Umgekehrt öffnet der Hash Test wie das Passwort
(alle Geräte tragen denselben Wert, einzeln sperren geht nur über ein neues Passwort); er gehört
darum wie das Passwort nur in `proxy.env`. Ohne Passwort erreichbar sind nur Manifest, Service
Worker und Symbole (keine Daten), und nur unter genau ihrem Pfad. `curl -u` geht weiter.

`MYTCO_HTTP_PORT` und `MYTCO_HTTPS_PORT` (Vorgabe 80 und 443) stehen nicht in der Vorlage;
sie braucht nur der lokale Nachweis (`nachweis/nachweis.sh`), auf dem Server bleiben sie leer.

**Änderungen an `proxy.env`** wirken mit der nächsten Auslieferung oder sofort mit
`docker compose -p mytco-proxy -f /opt/mytco/proxy/compose.proxy.yml --env-file /opt/mytco/proxy/proxy.env up -d`.

## Einschalten

Die Repo-Variablen `AUSLIEFERUNG_TEST` und `AUSLIEFERUNG_LIVE` auf `an` setzen. Ausgeliefert wird
erst beim nächsten Push mit Code auf `dev` bzw. `main`; ein Start von Hand in GitHub
(`workflow_dispatch`) liefert nie aus.

## Befehle

Alle geben nur `schritt: …` und am Ende `ok` oder `fehler` aus; Einzelheiten stehen in
`<umgebung>/protokoll.log`. Bricht die Verbindung ab, laufen Auslieferung und `zurueck`
trotzdem zu Ende.

| Zweck | Befehl |
|-------|--------|
| Auslieferung von Hand (Token für die private Ablage über die Standardeingabe) | `printf %s "$TOKEN" \| /opt/mytco/bin/ausliefern-ssh <umgebung> <digest>` |
| Auf das vorherige Image zurück | `/opt/mytco/<umgebung>/betrieb/bin/zurueck <umgebung>` |
| Sichern (mit `ohne-aufraeumen` ohne `forget --prune`) | `/opt/mytco/gemeinsam/bin/sichern <umgebung> [ohne-aufraeumen]` |
| Wiederherstellen (neuester oder bestimmter Lauf; sichert vorher) | `/opt/mytco/gemeinsam/bin/wiederherstellen <umgebung> [lauf-…] [ohne-sicherung]` |
| Probe in einer Wegwerf-Datenbank | `/opt/mytco/gemeinsam/bin/probe <umgebung> [lauf-…]` |

`sichern` zählt die Datensätze vor und nach dem Dump. Weichen die Zahlen ab, weil jemand
währenddessen etwas geändert hat, verwirft es den Lauf und versucht es erneut, höchstens
dreimal. Nach jeder gelungenen Auslieferung löscht `ausliefern` die Images des Repos, ausser
dem aktuellen und dem vorherigen von Test und Live; ein Fehler dabei steht nur im Protokoll.

Ist in `live/geheim.env` `MAIL_NUR_AN` gesetzt (Leerzeichen und Anführungszeichen zählen
nicht; erkannt wird jede Zeilenform, die Compose liest, auch `export MAIL_NUR_AN=…` und
`MAIL_NUR_AN: …`; ein Wert in Anführungszeichen, die auf der Zeile nicht schliessen, gilt immer
als gesetzt, weil Compose ihn über mehrere Zeilen liest), verweigern `ausliefern live` und
`zurueck live` ihre Arbeit und melden `fehler`. Kein Wert aus der Shell des Aufrufers kommt bei
Compose an, wenn `geheim.env` denselben Namen setzt: Massgebend ist allein die Datei.

`zurueck` migriert die Datenbank nicht zurück. `wiederherstellen` spielt nur Sicherungen
derselben Umgebung ein und braucht eine ausgelieferte Fassung (`<umgebung>/zustand/aktuell`);
ohne sie meldet es `fehler`. Es leert vorher die Tabellen der App samt der Liste der
Migrationen, alles in einer Transaktion: Nach dem Zurückspielen einer älteren Sicherung läuft
die nächste Auslieferung ihre Migrationen wieder sauber durch.

Vor dem Einspielen sichert `wiederherstellen` den jetzigen Stand (`sichern <umgebung>
ohne-aufraeumen`, damit der gewählte Lauf nicht weggeräumt wird); scheitert das, bricht es ab,
ohne etwas zu ändern. Der Lauf wird vorher bestimmt: Ohne Angabe wird der bis dahin neueste
eingespielt, nicht die eben angelegte Sicherung. Ist die Datenbank so kaputt, dass gerade diese
Sicherung scheitert, gibt es den Notschalter `ohne-sicherung` (vor oder nach dem Lauf); dann wird
nicht gesichert, und `protokoll.log` hält es fest. Nur von Hand auf dem Server; der Türsteher
und die CI rufen `wiederherstellen` nie auf. Jede andere Angabe weist der Befehl mit `fehler` ab,
bevor er etwas tut.

Scheitert das Einspielen, steht im Protokoll nur der Fehlercode (SQLSTATE) bzw. bei `probe` die
Zahl der Fehlerzeilen, nie ein Wert aus der Datenbank (DS-06). Zum Nachsehen bleibt die
Sicherung selbst.

## Ersten Admin festlegen

Auf Live ist die Datenbank anfangs leer. Der Projektleiter wird einmal per Befehl als Mitglied
angelegt und bekommt die Rollen MyTCO-Admin und Mitglieder-Admin (Mitgliedernummer, Name, Adresse
und E-Mail sind Pflicht):

```
cd /opt/mytco && MYTCO_UMGEBUNG=live \
  MYTCO_IMAGE="ghcr.io/konstantinniedermann/tco-app@$(head -n 1 live/zustand/aktuell)" \
  docker compose -p mytco-live \
  -f live/betrieb/compose.umgebung.yml --env-file live/geheim.env \
  exec app node scripts/admin-festlegen.ts --mitgliedernummer … --vorname … \
  --nachname … --strasse … --plz … --ort … --email …
```

Als Benutzer `mytco` ausführen (er liest `live/zustand/aktuell`); `MYTCO_IMAGE` verlangt die
Compose-Datei bei jedem Aufruf, hier das laufende Image von Live, Ablage wie `MYTCO_REPO_STANDARD`
in `bin/lib.sh`. Der Befehl legt nur den ersten Admin selbst an; alle anderen Mitglieder kommen danach über die
Verwaltung. Gibt es das Mitglied schon (gleiche Nummer oder E-Mail), erhält es nur die fehlenden Rollen.
Die Angaben landen im Shell-Verlauf: Befehl mit führendem Leerzeichen eingeben (bei
`HISTCONTROL=ignorespace`) oder den Verlauf danach bereinigen. Die Ausgabe nennt das Ergebnis und bei Fehlern Feldnamen mit Grund, nie Werte. Danach meldet
sich der erste Admin über «Code per E-Mail» an und verteilt die Rollen auf der Seite *Rollen*. Auf Test
ist Erika Beispiel (erfunden) automatisch MyTCO- und Mitglieder-Admin.

## Auslieferung ohne CI

Fällt die CI aus (GitHub-Ausfall, oder das Repo wird wieder privat und die Actions-Minuten
sind aufgebraucht), baut sie auch kein Image. Dann von Hand:

1. Persönliches Token (classic) bei GitHub anlegen, nur mit `write:packages`, kurze Laufzeit.
2. Lokal bauen und in die Ablage schieben:
   `docker build --platform linux/amd64 -t ghcr.io/konstantinniedermann/tco-app:hand-<datum> .`
   (der Server ist x86_64; ohne `--platform` baut ein Mac mit Apple-Chip ein arm64-Image, das
   auf dem Server nicht startet), anmelden mit
   `printf %s "$TOKEN" | docker login ghcr.io -u <github-name> --password-stdin`, dann
   `docker push …` und den Digest lesen:
   `docker buildx imagetools inspect ghcr.io/konstantinniedermann/tco-app:hand-<datum> --format '{{.Manifest.Digest}}'`.
3. Ausliefern mit demselben Token, erst Test, dann Live mit demselben Digest:
   `printf %s "$TOKEN" | ssh -i <schlüssel der umgebung> mytco@<server> <digest>` oder auf dem
   Server `printf %s "$TOKEN" | /opt/mytco/bin/ausliefern-ssh <umgebung> <digest>`.
4. Token danach löschen.

Die Regel «Live nur mit dem Image, das auf Test `ok` meldete» prüft dabei niemand
automatisch; sie liegt beim Betreiber.

## Störungen

- Eine unvollständige `fassungen/<digest>/` (ohne ausführbares `betrieb/bin/ausliefern`) wird
  nie überschrieben; die Auslieferung dieses Digests meldet `fehler`, bis der Ordner von Hand
  entfernt ist.
- Eine Sperre `<umgebung>/sperre/`, deren Prozess nicht mehr lebt, übernimmt der nächste Lauf
  selbst.

## Lokaler Nachweis

`make betrieb-nachweis` spielt den ganzen Ablauf auf Docker Desktop mit erfundenen Werten durch
(Wegwerf-Server im Temp-Ordner, lokale Registry, Test und Live über den Türsteher, HTTPS über
Caddy, Trennung, Rückfall, Anlegen des Sicherungsziels, Sicherung vor einer Live-Auslieferung,
Wiederherstellung auch einer älteren Sicherung, Testdaten auf Test, Test behält seine Datenbank und wird nur über den Zähler neu aufgesetzt, Sperre von `MAIL_NUR_AN` auf Live, Sicherung vor dem Zurückspielen und Notschalter, keine Datenbankwerte im Protokoll, kaputte Einrichtung, Proxy-Log ohne
IP-Adressen) und räumt danach alles ab.
