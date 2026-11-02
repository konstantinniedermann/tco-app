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
proxy/proxy.env                     von Hand, Vorlage proxy.env.example
gemeinsam/bin/                      sichern, wiederherstellen, probe, lib.sh (für den Timer)
sicherung.env                       von Hand (Rechte 600), Vorlage sicherung.env.example
```

`<umgebung>` ist `test` oder `live`.

## Von Hand eingerichtet, nie von der CI

- `bin/ausliefern-ssh` und `bin/lib.sh` aus diesem Ordner. Ein neues Image ändert sie nie.
- systemd-Units `systemd/mytco-sicherung.{service,timer}` nach `/etc/systemd/system/`, dann
  `systemctl enable --now mytco-sicherung.timer`.
- `geheim.env` je Umgebung, `proxy/proxy.env`, `sicherung.env`.
- `~/.ssh/authorized_keys` des Benutzers `mytco`, ein Schlüssel je Umgebung:
  `command="/opt/mytco/bin/ausliefern-ssh test",restrict ssh-ed25519 …` (für Live `live`).

Vorausgesetzt wird `PermitUserEnvironment no` (Standard) und das übliche `AcceptEnv` (nur
`LANG`/`LC_*`); der Türsteher setzt `LC_ALL=C` selbst.

Der Passwort-Hash für Test kommt aus `caddy hash-password` und steht in `proxy.env` in
einfachen Anführungszeichen: `MYTCO_TEST_PASSWORT_HASH='$2a$14$…'`. Ohne sie frisst Compose die
`$`-Zeichen.

## Befehle

Alle geben nur `schritt: …` und am Ende `ok` oder `fehler` aus; Einzelheiten stehen in
`<umgebung>/protokoll.log`.

| Zweck | Befehl |
|-------|--------|
| Auslieferung von Hand | `/opt/mytco/bin/ausliefern-ssh <umgebung> <digest> </dev/null` |
| Auf das vorherige Image zurück | `/opt/mytco/<umgebung>/betrieb/bin/zurueck <umgebung>` |
| Sichern | `/opt/mytco/gemeinsam/bin/sichern <umgebung>` |
| Wiederherstellen (neuester oder bestimmter Lauf) | `/opt/mytco/gemeinsam/bin/wiederherstellen <umgebung> [lauf-…]` |
| Probe in einer Wegwerf-Datenbank | `/opt/mytco/gemeinsam/bin/probe <umgebung> [lauf-…]` |

`zurueck` migriert die Datenbank nicht zurück. `wiederherstellen` spielt nur Sicherungen
derselben Umgebung ein und braucht eine ausgelieferte Fassung (`<umgebung>/zustand/aktuell`);
ohne sie meldet es `fehler`.

## Störungen

- Eine unvollständige `fassungen/<digest>/` (ohne ausführbares `betrieb/bin/ausliefern`) wird
  nie überschrieben; die Auslieferung dieses Digests meldet `fehler`, bis der Ordner von Hand
  entfernt ist.
- Eine Sperre `<umgebung>/sperre/`, deren Prozess nicht mehr lebt, übernimmt der nächste Lauf
  selbst.

## Lokaler Nachweis

`make betrieb-nachweis` spielt den ganzen Ablauf auf Docker Desktop mit erfundenen Werten durch
(Wegwerf-Server im Temp-Ordner, lokale Registry, Test und Live über den Türsteher, HTTPS über
Caddy, Trennung, Rückfall, Sicherung, Wiederherstellung, kaputte Einrichtung) und räumt danach
alles ab.
