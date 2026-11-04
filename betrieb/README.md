# Betrieb auf dem Server

Kurznotiz für den Betrieb. Das Konzept der Auslieferung steht in `docs/ci-cd-und-release.md`.

## Aufbau unter `/opt/mytco` (`MYTCO_BASIS`)

```
bin/ausliefern-ssh, bin/lib.sh      Türsteher, von Hand eingerichtet
<umgebung>/geheim.env               von Hand (Rechte 600), Vorlage geheim.env.example
<umgebung>/betrieb/                 Einrichtung aus dem zuletzt ausgelieferten Image
<umgebung>/zustand/aktuell|vorher   Digest des laufenden und des vorherigen Images
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

## Von Hand eingerichtet, nie von der CI

- `bin/ausliefern-ssh` und `bin/lib.sh` aus diesem Ordner, Ordner und Dateien `root:root` mit
  Rechten 0755: `mytco` kann sie so nicht versehentlich ändern. Ein schädliches Image kann das
  über den Docker-Zugang von `mytco` trotzdem umgehen (Restrisiko im Sicherheitskonzept).
- `geheim.env` je Umgebung, `proxy/proxy.env`, `sicherung.env`, alle mit Rechten 600.
- `~/.ssh/authorized_keys` des Benutzers `mytco`, ein Schlüssel je Umgebung:
  `command="/opt/mytco/bin/ausliefern-ssh test",restrict ssh-ed25519 …` (für Live `live`).
- **Sicherungsziel einmal anlegen**, bevor Live Daten hat: `sichern` legt nie selbst eines an
  und meldet ohne Ziel `fehler`. `RESTIC_REPOSITORY` in `sicherung.env` ohne Anführungszeichen,
  als absoluter Pfad oder mit Schema (`s3:…`, `sftp:…`, `rest:…` usw.). Anlegen als `mytco`:
  `( . /opt/mytco/bin/lib.sh && restic_docker init </dev/null )`
- systemd-Units `systemd/mytco-sicherung.{service,timer}` nach `/etc/systemd/system/`. Den Timer
  erst einschalten, wenn Live eingeschaltet und einmal ausgeliefert ist (vorher meldet er jede
  Nacht `fehler`): `systemctl enable --now mytco-sicherung.timer`.

Vorausgesetzt wird `PermitUserEnvironment no` (Standard) und das übliche `AcceptEnv` (nur
`LANG`/`LC_*`); der Türsteher setzt `LC_ALL=C` selbst.

Der Passwort-Hash für Test kommt aus `caddy hash-password` und steht in `proxy.env` in
einfachen Anführungszeichen: `MYTCO_TEST_PASSWORT_HASH='$2a$14$…'`. Ohne sie frisst Compose die
`$`-Zeichen.

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

Ist in `live/geheim.env` `MAIL_NUR_AN` gesetzt (Leerzeichen und Anführungszeichen zählen
nicht; erkannt wird jede Zeilenform, die Compose liest, auch `export MAIL_NUR_AN=…` und
`MAIL_NUR_AN: …`), verweigern `ausliefern live` und `zurueck live` ihre Arbeit und melden
`fehler`. Ein `MAIL_NUR_AN` aus der Shell des Aufrufers kommt nie bei Compose an: Massgebend
ist allein `geheim.env`.

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
angelegt und bekommt die Rolle Admin (Mitgliedernummer, Name, Adresse und E-Mail sind Pflicht):

```
cd /opt/mytco && MYTCO_UMGEBUNG=live docker compose -p mytco-live \
  -f live/betrieb/compose.umgebung.yml --env-file live/geheim.env \
  exec app node scripts/admin-festlegen.ts --mitgliedernummer … --vorname … \
  --nachname … --strasse … --plz … --ort … --email …
```

Der Befehl legt nur den Admin selbst an; alle anderen Mitglieder kommen danach über die
Verwaltung. Gibt es das Mitglied schon (gleiche Nummer oder E-Mail), erhält es nur die Rolle.
Die Ausgabe nennt das Ergebnis und bei Fehlern Feldnamen mit Grund, nie Werte. Danach meldet
sich der Admin über «Code per E-Mail» an. Auf Test ist Erika Beispiel (erfunden) automatisch
Admin.

## Auslieferung ohne CI (keine Actions-Minuten)

Ohne Minuten baut die CI auch kein Image. Dann von Hand:

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
Wiederherstellung auch einer älteren Sicherung, Testdaten auf Test, Sperre von `MAIL_NUR_AN` auf Live, Sicherung vor dem Zurückspielen und Notschalter, keine Datenbankwerte im Protokoll, kaputte Einrichtung, Proxy-Log ohne
IP-Adressen) und räumt danach alles ab.
