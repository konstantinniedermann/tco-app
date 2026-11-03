#!/usr/bin/env bash
# Lokaler Gesamtnachweis auf Docker Desktop: nachweis.sh [image] (Standard mytco:lokal).
# Baut in einem Temp-Ordner einen Wegwerf-Server (MYTCO_BASIS) auf, schiebt das Image in eine
# lokale Registry und liefert über den Türsteher bin/ausliefern-ssh nach Test und Live aus,
# so wie es der Server tut. Prüft die Testdaten auf Test, HTTPS über Caddy, die Trennung der
# Umgebungen, den Rückfall, Sicherung/Probe/Wiederherstellung (auch einer älteren Sicherung nach
# einer neuen Migration), die Sicherung vor einer Live-Auslieferung, das Abweisen einer kaputten
# Einrichtung und dass der Proxy keine IP-Adressen protokolliert.
# Ausgabe je Prüfung "prüfung: <name> … ok|fehler", am Ende die Summe; Exit 1 bei einem Fehler.
# Alle Werte sind erfunden. Bei jedem Ende wird aufgeräumt: Compose-Projekte mytco-test,
# mytco-live, mytco-proxy samt Netzen und Volumes, Registry, gebaute Images, Temp-Ordner.
# Die Prüfungen laufen über `pruefung <name> <funktion>`; shellcheck sieht diese Aufrufe nicht.
# shellcheck disable=SC2329
set -euo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BETRIEB="$(cd "$HIER/.." && pwd)"
QUELLE="${1:-mytco:lokal}"
# Eigene Markierung des Images für diesen Lauf: eine parallele Session kann mytco:lokal
# jederzeit neu bauen, der Nachweis prüft aber durchgehend dasselbe Image.
BILD="mytco-nachweis:d1-$$"

# Registry nur für diesen Nachweis, per Digest gepinnt (Index-Digest von registry:3.1.2).
REGISTRY_IMAGE="registry:3.1.2@sha256:d4032d4cc323c1731c707931ecada07a53076eac38e3b61ae57533f170f2c6c3"
# Dasselbe Caddy-Image wie der Proxy (für caddy hash-password).
CADDY_IMAGE=$(sed -n 's/^[[:space:]]*image:[[:space:]]*\(caddy:[^[:space:]]*\)[[:space:]]*$/\1/p' \
	"$BETRIEB/compose.proxy.yml" | sed -n 1p)
KENNUNG="nachweis-$$"
REGISTRY_NAME="mytco-$KENNUNG-registry"
EIGENE_IMAGES="$BILD mytco-nachweis:d2-$$ mytco-nachweis:d3-$$ mytco-nachweis:d4-$$ mytco-nachweis:d5-$$"
PROJEKTE="mytco-test mytco-live mytco-proxy"
NETZE="mytco-proxy-test mytco-proxy-live"
WARTEZEIT=60
BENUTZER=nachweis
PASSWORT="nachweis-erfunden-$$"
ANZAHL_OK=0
ANZAHL_FEHLER=0

abbruch() {
	echo "Abbruch: $1" >&2
	exit 1
}

# --- Vorbedingungen: nichts Fremdes anfassen ----------------------------------------------
docker image inspect "$QUELLE" >/dev/null 2>&1 || abbruch "Image $QUELLE fehlt (make image)."
[ -n "$CADDY_IMAGE" ] || abbruch "Caddy-Image nicht in compose.proxy.yml gefunden."
for projekt in $PROJEKTE; do
	if [ -n "$(docker ps -aq --filter "label=com.docker.compose.project=$projekt")" ] ||
		[ -n "$(docker volume ls -q --filter "label=com.docker.compose.project=$projekt")" ] ||
		[ -n "$(docker network ls -q --filter "label=com.docker.compose.project=$projekt")" ]; then
		abbruch "Compose-Projekt $projekt existiert schon (Rest eines abgebrochenen Laufs?). Bitte von Hand entfernen."
	fi
done
for netz in $NETZE; do
	if docker network inspect "$netz" >/dev/null 2>&1; then
		abbruch "Netz $netz existiert schon. Bitte von Hand entfernen."
	fi
done

TEMP="$(mktemp -d "${TMPDIR:-/tmp}/mytco-nachweis.XXXXXX")"
TEMP="$(cd "$TEMP" && pwd -P)"
BASIS="$TEMP/basis"
LOG="$TEMP/nachweis.log"

aufraeumen() {
	local rc=$? id ref projekt netz bild
	set +e
	{
		for projekt in $PROJEKTE; do
			for id in $(docker ps -aq --filter "label=com.docker.compose.project=$projekt"); do
				docker rm -f "$id"
			done
		done
		# Reste einer abgebrochenen Probe (sie räumt sonst selbst auf).
		for id in $(docker ps -aq --filter "name=^mytco-probe-"); do docker rm -f "$id"; done
		for id in $(docker network ls -q --filter "name=^mytco-probe-"); do docker network rm "$id"; done
		docker rm -f "$REGISTRY_NAME"
		for projekt in $PROJEKTE; do
			for id in $(docker volume ls -q --filter "label=com.docker.compose.project=$projekt"); do
				docker volume rm -f "$id"
			done
			for id in $(docker network ls -q --filter "label=com.docker.compose.project=$projekt"); do
				docker network rm "$id"
			done
		done
		for netz in $NETZE; do docker network rm "$netz"; done
		# Images nur über ihre Namen entfernen, nie über die ID: D1 ist dasselbe Image wie
		# mytco:lokal, das bleiben muss.
		if [ -n "${REPO-}" ]; then
			for ref in $(docker image ls --digests --format '{{.Repository}}@{{.Digest}}' "$REPO"); do
				case "$ref" in *@sha256:*) docker image rm "$ref" ;; esac
			done
			for ref in $(docker image ls --format '{{.Repository}}:{{.Tag}}' "$REPO"); do
				case "$ref" in *:\<none\>) ;; *) docker image rm "$ref" ;; esac
			done
		fi
		for bild in $EIGENE_IMAGES; do docker image rm "$bild"; done
	} >/dev/null 2>&1
	rm -rf "$TEMP"
	exit "$rc"
}
trap aufraeumen EXIT
trap 'exit 130' INT TERM
docker tag "$QUELLE" "$BILD"

# --- Hilfsfunktionen ----------------------------------------------------------------------

# pruefung <name> <funktion> [args…]: führt die Funktion in einer Subshell mit set -e aus.
# Ihre Ausgabe erscheint nur bei einem Fehler (eingerückt) als Begründung.
pruefung() {
	local name="$1" rc=0
	shift
	set +e
	(
		set -e
		"$@"
	) >"$TEMP/grund" 2>&1
	rc=$?
	set -e
	if [ "$rc" = 0 ]; then
		echo "prüfung: $name … ok"
		ANZAHL_OK=$((ANZAHL_OK + 1))
	else
		echo "prüfung: $name … fehler"
		sed 's/^/    /' "$TEMP/grund" | tail -n 20
		ANZAHL_FEHLER=$((ANZAHL_FEHLER + 1))
	fi
	cat "$TEMP/grund" >>"$LOG"
}

summe() {
	echo "summe: $ANZAHL_OK ok, $ANZAHL_FEHLER fehler"
	if [ "$ANZAHL_FEHLER" != 0 ]; then
		local u
		for u in test live; do
			if [ -f "$BASIS/$u/protokoll.log" ]; then
				echo "--- letzte Zeilen von $u/protokoll.log (erfundene Werte) ---"
				tail -n 25 "$BASIS/$u/protokoll.log"
			fi
		done
		exit 1
	fi
	exit 0
}

freier_port() {
	node -e "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})"
}

lies() {
	cat "$TEMP/wert-$1" 2>/dev/null || true
}

merke_wert() {
	printf '%s\n' "$2" >"$TEMP/wert-$1"
}

pruefsumme() {
	cksum <"$1"
}

# Ruft den Türsteher so auf wie sshd mit command="…/bin/ausliefern-ssh <umgebung>": die
# Anfrage des Clients steht in SSH_ORIGINAL_COMMAND, die Standardeingabe ist leer (kein Token).
tuersteher() {
	SSH_ORIGINAL_COMMAND="$2" MYTCO_BASIS="$BASIS" MYTCO_REPO="$REPO" MYTCO_WARTEZEIT="$WARTEZEIT" \
		"$BASIS/bin/ausliefern-ssh" "$1" </dev/null
}

# Ein Server-Skript aus gemeinsam/bin, wie es der Timer oder der Betreiber aufruft.
gemeinsam() {
	local skript="$1"
	shift
	MYTCO_BASIS="$BASIS" MYTCO_REPO="$REPO" "$BASIS/gemeinsam/bin/$skript" "$@" </dev/null
}

# erwarte_ausgabe <ok|fehler> <rc> <ausgabe>: nur Zeilen "schritt: …", genau ein Ergebnis am
# Ende, passender Exit-Code.
erwarte_ausgabe() {
	local soll="$1" rc="$2" ausgabe="$3" fremd ergebnisse
	printf '%s\n' "$ausgabe"
	fremd=$(grep -vxE 'schritt: [a-z -]+|ok|fehler' <<<"$ausgabe" || true)
	[ -z "$fremd" ] || {
		echo "unerlaubte Ausgabe: $fremd"
		return 1
	}
	ergebnisse=$(grep -cxE 'ok|fehler' <<<"$ausgabe" || true)
	[ "$ergebnisse" = 1 ] || {
		echo "erwartet genau ein Ergebnis, erhalten $ergebnisse"
		return 1
	}
	[ "$(tail -n 1 <<<"$ausgabe")" = "$soll" ] || {
		echo "erwartet $soll als letzte Zeile"
		return 1
	}
	if [ "$soll" = ok ]; then [ "$rc" = 0 ]; else [ "$rc" != 0 ]; fi || {
		echo "Exit-Code $rc passt nicht zu $soll"
		return 1
	}
}

# erwarte_lauf <ok|fehler> <umgebung> <digest>
erwarte_lauf() {
	local ausgabe rc=0
	[ -n "$3" ] || {
		echo "Digest fehlt"
		return 1
	}
	ausgabe=$(tuersteher "$2" "$3") || rc=$?
	erwarte_ausgabe "$1" "$rc" "$ausgabe"
}

# abfrage <host> <pfad> [curl-Argumente…]: HTTPS über Caddy; gibt den Status aus, Köpfe in
# $TEMP/kopf, Inhalt in $TEMP/inhalt.
abfrage() {
	local host="$1" pfad="$2"
	shift 2
	curl -sS -k --max-time 10 --resolve "$host:$HTTPS_PORT:127.0.0.1" \
		-D "$TEMP/kopf" -o "$TEMP/inhalt" -w '%{http_code}' "$@" "https://$host:$HTTPS_PORT$pfad" ||
		echo 000
}

# warte_status <host> <pfad> <status> [curl-Argumente…]: bis zu WARTEZEIT Sekunden.
warte_status() {
	local host="$1" pfad="$2" soll="$3" ist="" n=0
	shift 3
	while [ "$n" -lt "$WARTEZEIT" ]; do
		ist=$(abfrage "$host" "$pfad" "$@")
		[ "$ist" = "$soll" ] && return 0
		n=$((n + 1))
		sleep 1
	done
	echo "$host$pfad: erwartet $soll, erhalten $ist"
	return 1
}

kopf_anzahl() {
	tr -d '\r' <"$TEMP/kopf" | grep -ci "^$1:" || true
}

kopf_wert() {
	tr -d '\r' <"$TEMP/kopf" | grep -i "^$1:" | sed -n 1p | sed 's/^[^:]*:[[:space:]]*//'
}

erwarte_kopf_einmal() {
	local anzahl
	anzahl=$(kopf_anzahl "$1")
	[ "$anzahl" = 1 ] || {
		echo "$1: erwartet genau einmal, erhalten $anzahl"
		return 1
	}
}

status_ok() {
	grep -q '"status":"ok"' "$TEMP/inhalt" || {
		echo "Inhalt ohne \"status\":\"ok\": $(head -c 200 "$TEMP/inhalt")"
		return 1
	}
}

live_status_ok() {
	warte_status mytco.localhost /api/status 200
	status_ok
}

test_status_ok() {
	warte_status test.mytco.localhost /api/status 200 -u "$BENUTZER:$PASSWORT"
	status_ok
}

# tcp_versuch <container> <ziel> [port]: "verbunden" oder der Grund des Scheiterns (3 s).
tcp_versuch() {
	docker exec "$1" node -e "
const s = require('net').connect({ host: process.argv[1], port: Number(process.argv[2]) });
s.setTimeout(3000);
s.on('connect', () => { console.log('verbunden'); process.exit(0); });
s.on('timeout', () => { console.log('zeitueberschreitung'); process.exit(2); });
s.on('error', (e) => { console.log('gescheitert ' + e.code); process.exit(3); });
" "$2" "${3:-5432}" || true
}

container_ip() {
	docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' "$1" | tr -s ' ' '\n' | sed '/^$/d'
}

psql_live() {
	docker exec mytco-live-db-1 psql -U mytco -d mytco -At -c "$1"
}

# restic wie auf dem Server: über restic_docker aus der von Hand eingerichteten lib.sh.
restic_nachweis() {
	(
		MYTCO_BASIS="$BASIS"
		# shellcheck source=../bin/lib.sh
		source "$BASIS/bin/lib.sh"
		restic_docker "$@" </dev/null
	)
}

# Läufe, die sichern im Protokoll von Live als abgelegt meldet (der neueste zuletzt).
abgelegte_laeufe() {
	sed -n 's/^sichern: \(lauf-[0-9]\{8\}T[0-9]\{6\}Z\) abgelegt$/\1/p' "$BASIS/live/protokoll.log"
}

# Zählung (schema.tabelle|anzahl) eines Laufs von Live aus dem Sicherungsziel.
zaehlung_von() {
	restic_nachweis dump --tag "live,$1" --path /zaehlung.txt latest /zaehlung.txt
}

# Manifest-Abrufe eines Digests im Zugriffsprotokoll der Registry.
manifest_abrufe() {
	docker logs "$REGISTRY_NAME" 2>&1 | grep -cE "\"(GET|HEAD) /v2/mytco/manifests/$1 " || true
}

# baue <kürzel> <Dockerfile-Inhalt> [Datei…]: Image mytco-nachweis:<kürzel>-PID aus einem
# eigenen Kontext (die Dateien werden hineinkopiert).
baue() {
	local kuerzel="$1" inhalt="$2" kontext="$TEMP/bau-$1"
	shift 2
	mkdir -p "$kontext"
	printf '%s\n' "$inhalt" >"$kontext/Dockerfile"
	if [ "$#" -gt 0 ]; then cp "$@" "$kontext/"; fi
	docker build -q -t "mytco-nachweis:$kuerzel-$$" "$kontext" >>"$LOG" 2>&1
}

# schiebe <quelle> <kürzel>: in die Registry, Digest aus RepoDigests (gegengeprüft mit der
# Ausgabe von push) nach wert-<kürzel>. Danach wird die lokale Markierung entfernt, damit der
# Türsteher das Image wirklich per Digest aus der Registry holen muss.
schiebe() {
	local ziel="$REPO:$2" ausgabe gemeldet digest
	docker tag "$1" "$ziel"
	ausgabe=$(docker push "$ziel" 2>&1) || {
		echo "$ausgabe" | tail -n 5
		return 1
	}
	gemeldet=$(sed -n 's/.*digest: \(sha256:[0-9a-f]\{64\}\) size:.*/\1/p' <<<"$ausgabe" | tail -n 1)
	digest=$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$ziel" |
		sed -n "s#^$REPO@\(sha256:[0-9a-f]\{64\}\)\$#\1#p" | sed -n 1p)
	[ -n "$digest" ] && [ "$digest" = "$gemeldet" ] || {
		echo "Digest unklar: RepoDigests '$digest', push '$gemeldet'"
		return 1
	}
	docker image rm "$ziel" >>"$LOG" 2>&1
	merke_wert "$2" "$digest"
}

# --- Einrichtung des Wegwerf-Servers ------------------------------------------------------
REG_PORT=$(freier_port)
HTTP_PORT=$(freier_port)
HTTPS_PORT=$(freier_port)
while [ "$HTTP_PORT" = "$REG_PORT" ]; do HTTP_PORT=$(freier_port); done
while [ "$HTTPS_PORT" = "$REG_PORT" ] || [ "$HTTPS_PORT" = "$HTTP_PORT" ]; do HTTPS_PORT=$(freier_port); done
REPO="localhost:$REG_PORT/mytco"

einrichten() {
	docker run --rm --entrypoint test "$BILD" -x /app/betrieb/bin/ausliefern || {
		echo "$QUELLE enthält keine Einrichtung unter /app/betrieb"
		return 1
	}
	# Registry nur auf der Loopback-Schnittstelle; der Docker-Daemon erreicht "localhost"
	# über IPv6, darum beide Adressen.
	docker run -d --name "$REGISTRY_NAME" -p "127.0.0.1:$REG_PORT:5000" -p "[::1]:$REG_PORT:5000" \
		"$REGISTRY_IMAGE" >>"$LOG"
	local n=0
	until curl -sf "http://127.0.0.1:$REG_PORT/v2/" >/dev/null; do
		n=$((n + 1))
		[ "$n" -lt 30 ] || {
			echo "Registry antwortet nicht"
			return 1
		}
		sleep 1
	done

	# Von Hand eingerichtet: Türsteher und lib.sh, Geheimnisse, Proxy-Einstellungen, Sicherung.
	mkdir -p "$BASIS/bin" "$BASIS/proxy" "$BASIS/test" "$BASIS/live"
	cp -p "$BETRIEB/bin/ausliefern-ssh" "$BETRIEB/bin/lib.sh" "$BASIS/bin/"

	local hash
	hash=$(docker run --rm "$CADDY_IMAGE" caddy hash-password --plaintext "$PASSWORT" 2>>"$LOG")
	# shellcheck disable=SC2016 # Muster eines bcrypt-Hashes, keine Variable
	grep -qE '^\$2[aby]\$' <<<"$hash" || {
		echo "kein bcrypt-Hash"
		return 1
	}
	# Hash in einfachen Anführungszeichen, sonst frisst Compose die $-Zeichen.
	{
		echo "MYTCO_ADRESSE_LIVE=mytco.localhost"
		echo "MYTCO_ADRESSE_TEST=test.mytco.localhost"
		echo "MYTCO_TLS=internal"
		echo "MYTCO_TEST_BENUTZER=$BENUTZER"
		echo "MYTCO_TEST_PASSWORT_HASH='$hash'"
		echo "MYTCO_HTTP_PORT=127.0.0.1:$HTTP_PORT"
		echo "MYTCO_HTTPS_PORT=127.0.0.1:$HTTPS_PORT"
	} >"$BASIS/proxy/proxy.env"
	login_einstellungen() {
		echo "MYTCO_CODE_SCHLUESSEL=$(openssl rand -base64 48 | tr -d '\n/+=')"
		echo "MYTCO_SMTP_URL=smtp://mail.invalid:25"
		echo "MYTCO_MAIL_ABSENDER=MyTCO <mytco@example.org>"
		echo "MYTCO_KONTAKT=Sekretariat (erfunden), sekretariat@example.org"
	}
	{
		echo "POSTGRES_PASSWORD=nachweis-erfunden-test"
		login_einstellungen
		echo "ORIGIN=https://test.mytco.localhost:$HTTPS_PORT"
		echo "MAIL_NUR_AN=nachweis@example.org"
	} >"$BASIS/test/geheim.env"
	{
		echo "POSTGRES_PASSWORD=nachweis-erfunden-live"
		login_einstellungen
		echo "ORIGIN=https://mytco.localhost:$HTTPS_PORT"
		echo "MAIL_NUR_AN="
	} >"$BASIS/live/geheim.env"
	{
		echo "RESTIC_REPOSITORY=$BASIS/sicherung"
		echo "RESTIC_PASSWORD=nachweis-erfunden-sicherung"
	} >"$BASIS/sicherung.env"
	chmod 600 "$BASIS/proxy/proxy.env" "$BASIS/test/geheim.env" "$BASIS/live/geheim.env" "$BASIS/sicherung.env"
}

# --- 1 Auslieferung -----------------------------------------------------------------------
p1_pull() {
	local vorher="$1" nachher
	[ "$(lies d1-lokal)" = fehlt ] || {
		echo "$REPO@D1 war schon vor der Auslieferung lokal vorhanden"
		return 1
	}
	nachher=$(manifest_abrufe "$(lies d1)")
	[ "$nachher" -ge $((vorher + 2)) ] || {
		echo "Registry sah $((nachher - vorher)) Manifest-Abrufe von D1, erwartet mindestens 2"
		return 1
	}
	docker image inspect "$REPO@$(lies d1)" >/dev/null
}

p1_laeuft() {
	local u bild
	for u in test live; do
		bild=$(docker inspect -f '{{.Config.Image}}' "mytco-$u-app-1")
		[ "$bild" = "$REPO@$(lies d1)" ] || {
			echo "mytco-$u-app-1 läuft mit $bild"
			return 1
		}
		[ "$(head -n 1 "$BASIS/$u/zustand/aktuell")" = "$(lies d1)" ] || {
			echo "$u/zustand/aktuell ist nicht D1"
			return 1
		}
	done
}

psql_test() {
	docker exec mytco-test-db-1 psql -U mytco -d mytco -At -c "$1"
}

# Testdaten nach dem Zurücksetzen von Test: Mitglieder angelegt, der Mail-Versuch scheitert
# (smtp://mail.invalid), und das Protokoll nennt keine Adresse (DS-06).
p1_testdaten() {
	local log="$BASIS/test/protokoll.log" anzahl adressen
	grep -qxF "testdaten: 3 erfundene Mitglieder angelegt" "$log" || {
		echo "Zeile «3 erfundene Mitglieder angelegt» fehlt in test/protokoll.log"
		return 1
	}
	grep -qxF "testdaten: Mail mit Brief-Code nicht versandt" "$log" || {
		echo "Zeile «Mail mit Brief-Code nicht versandt» fehlt in test/protokoll.log"
		return 1
	}
	anzahl=$(psql_test "select count(*) from mitglied")
	[ "$anzahl" = 3 ] || {
		echo "test-db hat $anzahl Mitglieder, erwartet 3"
		return 1
	}
	adressen=$(grep -c '@example\.org' "$log" || true)
	[ "$adressen" = 0 ] || {
		echo "test/protokoll.log enthält $adressen Zeilen mit einer Adresse"
		return 1
	}
	[ "$(psql_live "select count(*) from mitglied")" = 0 ] || {
		echo "live-db hat Mitglieder"
		return 1
	}
}

# Von Hand ein zweites Mal: bricht ab, weil schon Mitglieder da sind; nichts doppelt.
p1_testdaten_zweimal() {
	local ausgabe rc=0
	ausgabe=$(docker exec mytco-test-app-1 node scripts/testdaten.ts 2>&1) || rc=$?
	echo "$ausgabe"
	[ "$rc" != 0 ] || {
		echo "zweiter Lauf endete mit Exit 0"
		return 1
	}
	[ "$ausgabe" = "testdaten: Mitglieder schon vorhanden: testdaten laufen nur auf einer leeren Datenbank" ] || {
		echo "unerwartete Ausgabe"
		return 1
	}
	[ "$(psql_test "select count(*) from mitglied")" = 3 ]
}

# --- 2 HTTPS über Caddy -------------------------------------------------------------------
p2_test_ohne_passwort() {
	local status
	status=$(abfrage test.mytco.localhost /api/status)
	[ "$status" = 401 ] || {
		echo "erwartet 401, erhalten $status"
		return 1
	}
	[ "$(kopf_wert Content-Security-Policy)" = "frame-ancestors 'none'" ] || {
		echo "401 ohne frame-ancestors: $(kopf_wert Content-Security-Policy)"
		return 1
	}
	erwarte_kopf_einmal Strict-Transport-Security
	erwarte_kopf_einmal X-Content-Type-Options
	erwarte_kopf_einmal Referrer-Policy
}

p2_app_datei() {
	local datei pfad
	datei=$(docker exec mytco-live-app-1 find build/client/_app -type f | sort | sed -n 1p)
	[ -n "$datei" ] || {
		echo "keine Datei unter build/client/_app"
		return 1
	}
	pfad="${datei#build/client}"
	echo "Datei: $pfad"
	warte_status mytco.localhost "$pfad" 200
	erwarte_kopf_einmal Strict-Transport-Security
	erwarte_kopf_einmal X-Content-Type-Options
	erwarte_kopf_einmal Referrer-Policy
	erwarte_kopf_einmal Content-Security-Policy
	[ "$(kopf_wert Strict-Transport-Security)" = "max-age=31536000; includeSubDomains" ]
	[ "$(kopf_wert Content-Security-Policy)" = "frame-ancestors 'none'" ] || {
		echo "CSP: $(kopf_wert Content-Security-Policy)"
		return 1
	}
}

p2_seite() {
	local csp
	warte_status mytco.localhost / 200
	erwarte_kopf_einmal Strict-Transport-Security
	erwarte_kopf_einmal X-Content-Type-Options
	erwarte_kopf_einmal Referrer-Policy
	erwarte_kopf_einmal Content-Security-Policy
	csp=$(kopf_wert Content-Security-Policy)
	echo "CSP: $csp"
	# Die strengere CSP der App (mit default-src und script-src) kommt unverändert durch.
	grep -qF "default-src 'self'" <<<"$csp"
	grep -qF "script-src" <<<"$csp"
	grep -qF "frame-ancestors 'none'" <<<"$csp"
}

# --- 3 Trennung ---------------------------------------------------------------------------
p3_gegenprobe() {
	local ergebnis live_ip
	ergebnis=$(tcp_versuch mytco-test-app-1 db)
	[ "$ergebnis" = verbunden ] || {
		echo "test-app erreicht ihre eigene db nicht: $ergebnis"
		return 1
	}
	live_ip=$(container_ip mytco-live-db-1 | sed -n 1p)
	ergebnis=$(tcp_versuch mytco-live-app-1 "$live_ip")
	[ "$ergebnis" = verbunden ] || {
		echo "live-app erreicht live-db ($live_ip) nicht: $ergebnis"
		return 1
	}
	# Gegenprobe zur Prüfung per Name: der Containername löst im eigenen Netz auf.
	ergebnis=$(tcp_versuch mytco-live-app-1 mytco-live-db-1)
	[ "$ergebnis" = verbunden ] || {
		echo "live-app erreicht mytco-live-db-1 per Name nicht: $ergebnis"
		return 1
	}
}

# Ergebnis eines TCP-Versuchs muss ein Scheitern sein (leer heisst: Versuch lief gar nicht).
erwarte_gescheitert() {
	[ -n "$1" ] || {
		echo "kein Ergebnis des Verbindungsversuchs"
		return 1
	}
	[ "$1" != verbunden ] || {
		echo "Verbindung gelang, obwohl sie scheitern muss"
		return 1
	}
}

p3_ip() {
	local live_ip ergebnis
	live_ip=$(container_ip mytco-live-db-1)
	[ "$(wc -l <<<"$live_ip" | tr -d ' ')" = 1 ] || {
		echo "live-db hat nicht genau eine Adresse: $live_ip"
		return 1
	}
	ergebnis=$(tcp_versuch mytco-test-app-1 "$live_ip")
	echo "test-app -> $live_ip:5432: $ergebnis"
	erwarte_gescheitert "$ergebnis"
}

p3_db_name() {
	local aufgeloest test_ip live_ip
	aufgeloest=$(docker exec mytco-test-app-1 node -e \
		"require('dns').lookup('db', (e, a) => { console.log(e ? 'gescheitert' : a); })")
	test_ip=$(container_ip mytco-test-db-1)
	live_ip=$(container_ip mytco-live-db-1)
	echo "db -> $aufgeloest, test-db $test_ip, live-db $live_ip"
	[ -n "$test_ip" ] && [ "$aufgeloest" = "$test_ip" ] || {
		echo "db löst nicht auf die Test-DB auf"
		return 1
	}
	[ "$aufgeloest" != "$live_ip" ] || {
		echo "db löst auf die Live-DB auf"
		return 1
	}
}

p3_live_name() {
	local ergebnis
	ergebnis=$(tcp_versuch mytco-test-app-1 mytco-live-db-1)
	echo "test-app -> mytco-live-db-1:5432: $ergebnis"
	erwarte_gescheitert "$ergebnis"
}

# --- 4 Rückfall ---------------------------------------------------------------------------
p4_bauen() {
	baue d2 "FROM $BILD
CMD [\"node\",\"-e\",\"process.exit(1)\"]"
	schiebe "mytco-nachweis:d2-$$" d2
}

p4_rueckfall() {
	local ausgabe rc=0
	[ -n "$(lies d2)" ] || {
		echo "Digest D2 fehlt"
		return 1
	}
	ausgabe=$(tuersteher test "$(lies d2)") || rc=$?
	erwarte_ausgabe fehler "$rc" "$ausgabe"
	grep -qxF "schritt: rueckfall" <<<"$ausgabe" || {
		echo "kein Schritt rueckfall"
		return 1
	}
}

p4_danach() {
	test_status_ok
	[ "$(head -n 1 "$BASIS/test/zustand/aktuell")" = "$(lies d1)" ] || {
		echo "aktuell: $(cat "$BASIS/test/zustand/aktuell")"
		return 1
	}
	[ "$(docker inspect -f '{{.Config.Image}}' mytco-test-app-1)" = "$REPO@$(lies d1)" ]
}

# --- 5 Sicherung --------------------------------------------------------------------------
p5_zeile() {
	psql_live "create table nachweis (id serial primary key, email text not null);
insert into nachweis (email) values ('nachweis@example.org');" >/dev/null
	[ "$(psql_live "select count(*) from nachweis")" = 1 ]
}

# Das Sicherungsziel ist noch nicht angelegt: sichern meldet fehler und legt nichts an (auch
# nicht in einem Wegwerf-Container, der danach gelöscht würde).
p5_ohne_ziel() {
	local ausgabe rc=0
	ausgabe=$(gemeinsam sichern live) || rc=$?
	erwarte_ausgabe fehler "$rc" "$ausgabe"
	grep -qF "sichern: Sicherungsziel nicht erreichbar oder nicht angelegt" "$BASIS/live/protokoll.log" || {
		echo "keine Meldung 'nicht angelegt' im Protokoll"
		return 1
	}
	[ ! -e "$BASIS/sicherung/config" ] || {
		echo "sichern hat das Repo selbst angelegt"
		return 1
	}
	[ -z "$(abgelegte_laeufe)" ] || {
		echo "ein Lauf wurde trotzdem als abgelegt gemeldet"
		return 1
	}
}

# Einmaliger Handschritt des Betriebs (README): das restic-Repo anlegen.
p5_ziel_anlegen() {
	restic_nachweis init >>"$LOG" 2>&1 || {
		echo "restic init gescheitert"
		return 1
	}
	[ -f "$BASIS/sicherung/config" ] || {
		echo "kein Repo unter $BASIS/sicherung"
		return 1
	}
}

p5_sichern() {
	local ausgabe rc=0 lauf
	ausgabe=$(gemeinsam sichern live) || rc=$?
	erwarte_ausgabe ok "$rc" "$ausgabe"
	lauf=$(abgelegte_laeufe | tail -n 1)
	[ -n "$lauf" ] || {
		echo "kein Lauf im Protokoll"
		return 1
	}
	merke_wert lauf "$lauf"
}

p5_probe() {
	local ausgabe rc=0
	ausgabe=$(gemeinsam probe live "$@") || rc=$?
	erwarte_ausgabe ok "$rc" "$ausgabe"
}

p5_wiederherstellen() {
	local ausgabe rc=0
	psql_live "delete from nachweis" >/dev/null
	[ "$(psql_live "select count(*) from nachweis")" = 0 ] || {
		echo "Zeile nicht gelöscht"
		return 1
	}
	ausgabe=$(gemeinsam wiederherstellen live) || rc=$?
	erwarte_ausgabe ok "$rc" "$ausgabe"
	[ "$(psql_live "select email from nachweis")" = "nachweis@example.org" ] || {
		echo "Zeile nicht wieder da"
		return 1
	}
	live_status_ok
}

snapshot_abweisungen() {
	grep -cxF "wiederherstellen: kein Snapshot dieser Umgebung gefunden" "$BASIS/test/protokoll.log" 2>/dev/null || true
}

p5_fremder_lauf() {
	local ausgabe rc=0 lauf vorher
	lauf=$(lies lauf)
	[ -n "$lauf" ] || {
		echo "Lauf fehlt"
		return 1
	}
	vorher=$(snapshot_abweisungen)
	ausgabe=$(gemeinsam wiederherstellen test "$lauf") || rc=$?
	erwarte_ausgabe fehler "$rc" "$ausgabe"
	# Abgewiesen schon bei der Suche nach dem Snapshot, bevor die App angehalten wird.
	[ "$(grep '^schritt: ' <<<"$ausgabe")" = "schritt: snapshot suchen" ] || {
		echo "nicht bei der Snapshot-Suche abgewiesen"
		return 1
	}
	[ "$(snapshot_abweisungen)" -eq $((vorher + 1)) ] || {
		echo "keine neue Meldung 'kein Snapshot dieser Umgebung' im Protokoll"
		return 1
	}
	[ -z "$(docker exec mytco-test-db-1 psql -U mytco -d mytco -At -c "select to_regclass('public.nachweis')")" ] || {
		echo "Live-Tabelle ist in der Test-Datenbank gelandet"
		return 1
	}
	test_status_ok
}

# D5: dasselbe Image mit einer zusätzlichen Migration (neue Tabelle), wie ein späteres Release.
p5_bauen_d5() {
	printf '%s\n' 'CREATE TABLE "nachweis_spaeter" ("id" serial PRIMARY KEY);' >"$TEMP/0001_nachweis.sql"
	node -e "
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[1], 'utf-8'));
const letzte = j.entries[j.entries.length - 1];
j.entries.push({ idx: letzte.idx + 1, version: letzte.version, when: letzte.when + 1000, tag: '0001_nachweis', breakpoints: true });
fs.writeFileSync(process.argv[2], JSON.stringify(j, null, 2));
" "$BETRIEB/../drizzle/meta/_journal.json" "$TEMP/_journal.json"
	baue d5 "FROM $BILD
COPY 0001_nachweis.sql /app/drizzle/0001_nachweis.sql
COPY _journal.json /app/drizzle/meta/_journal.json" "$TEMP/0001_nachweis.sql" "$TEMP/_journal.json"
	schiebe "mytco-nachweis:d5-$$" d5
}

# Anzahl der Migrationen im Image ohne D5 (aus dem Journal), damit der Nachweis neue Migrationen übersteht.
migrationen_basis() {
	node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1], 'utf-8')).entries.length)" "$BETRIEB/../drizzle/meta/_journal.json"
}

migrationen_live() {
	psql_live "select count(*) from drizzle.__drizzle_migrations"
}

# Zweite Live-Auslieferung auf eine Datenbank mit Daten: Vorher läuft eine vollständige
# Sicherung, deren Zählung die erfundene Zeile enthält; danach gibt es die neue Tabelle.
p5_live_d5() {
	local vorher nachher lauf zaehlung
	vorher=$(abgelegte_laeufe | wc -l | tr -d ' ')
	erwarte_lauf ok live "$(lies d5)"
	nachher=$(abgelegte_laeufe | wc -l | tr -d ' ')
	[ "$nachher" -eq $((vorher + 1)) ] || {
		echo "erwartet einen neuen abgelegten Lauf, gezählt $vorher -> $nachher"
		return 1
	}
	lauf=$(abgelegte_laeufe | tail -n 1)
	zaehlung=$(zaehlung_von "$lauf") || {
		echo "Zählung von $lauf nicht lesbar"
		return 1
	}
	echo "Zählung von $lauf:"
	printf '%s\n' "$zaehlung"
	grep -qxF 'public.nachweis|1' <<<"$zaehlung" || {
		echo "Zählung enthält public.nachweis|1 nicht"
		return 1
	}
	if grep -qF nachweis_spaeter <<<"$zaehlung"; then
		echo "Sicherung lief nach der Migration statt davor"
		return 1
	fi
	[ "$(psql_live "select to_regclass('public.nachweis_spaeter')")" = nachweis_spaeter ] || {
		echo "Migration von D5 lief nicht"
		return 1
	}
	merke_wert lauf_vor_d5 "$lauf"
	live_status_ok
}

# Die ältere Sicherung (vor der Migration) zurückspielen: Die spätere Tabelle und ihr Eintrag
# in der Migrationstabelle verschwinden, die Daten der Sicherung sind da.
p5_alt_zurueck() {
	local ausgabe rc=0 lauf
	lauf=$(lies lauf_vor_d5)
	[ -n "$lauf" ] || {
		echo "Lauf vor D5 fehlt"
		return 1
	}
	[ "$(migrationen_live)" = "$(($(migrationen_basis) + 1))" ] || {
		echo "vor dem Zurückspielen nicht $(($(migrationen_basis) + 1)) Migrationen: $(migrationen_live)"
		return 1
	}
	ausgabe=$(gemeinsam wiederherstellen live "$lauf") || rc=$?
	erwarte_ausgabe ok "$rc" "$ausgabe"
	[ -z "$(psql_live "select to_regclass('public.nachweis_spaeter')")" ] || {
		echo "Tabelle der späteren Migration ist stehen geblieben"
		return 1
	}
	[ "$(migrationen_live)" = "$(migrationen_basis)" ] || {
		echo "Migrationstabelle nicht auf dem Stand der Sicherung: $(migrationen_live)"
		return 1
	}
	[ "$(psql_live "select email from nachweis")" = "nachweis@example.org" ] || {
		echo "Zeile der Sicherung fehlt"
		return 1
	}
	live_status_ok
}

# Danach läuft dieselbe Migration bei der nächsten Auslieferung wieder durch.
p5_live_d5_erneut() {
	erwarte_lauf ok live "$(lies d5)"
	[ "$(psql_live "select to_regclass('public.nachweis_spaeter')")" = nachweis_spaeter ] || {
		echo "Migration lief nicht erneut"
		return 1
	}
	[ "$(migrationen_live)" = "$(($(migrationen_basis) + 1))" ] || {
		echo "erwartet $(($(migrationen_basis) + 1)) Migrationen, gezählt $(migrationen_live)"
		return 1
	}
	[ "$(psql_live "select email from nachweis")" = "nachweis@example.org" ] || {
		echo "Zeile fehlt nach der Auslieferung"
		return 1
	}
	live_status_ok
}

# --- 6 Einrichtung ------------------------------------------------------------------------
p6_bauen() {
	# Absichtlich kaputt: eine Direktive, die es nicht gibt. Den Platzhalter löst Caddy auf.
	# shellcheck disable=SC2016
	printf '%s\n' '{$MYTCO_ADRESSE_TEST} {' '	diese_direktive_gibt_es_nicht' '}' >"$TEMP/test.caddy"
	baue d3 "FROM $BILD
COPY test.caddy /app/betrieb/caddy/umgebungen/test.caddy" "$TEMP/test.caddy"
	schiebe "mytco-nachweis:d3-$$" d3
	# Gültig, aber mit einer geänderten gemeinsamen Datei: Test darf sie nicht übernehmen.
	cp "$BETRIEB/caddy/Caddyfile" "$TEMP/Caddyfile"
	echo "# nachweis: geänderte gemeinsame Datei" >>"$TEMP/Caddyfile"
	baue d4 "FROM $BILD
COPY Caddyfile /app/betrieb/caddy/Caddyfile" "$TEMP/Caddyfile"
	schiebe "mytco-nachweis:d4-$$" d4
}

p6_kaputt() {
	local vorher ausgabe rc=0 meldungen_vorher meldungen_nachher d3
	d3=$(lies d3)
	[ -n "$d3" ] || {
		echo "Digest D3 fehlt"
		return 1
	}
	vorher=$(pruefsumme "$BASIS/proxy/caddy/umgebungen/test.caddy")
	meldungen_vorher=$(caddy_abweisungen)
	ausgabe=$(tuersteher test "$d3") || rc=$?
	erwarte_ausgabe fehler "$rc" "$ausgabe"
	# Abgewiesen hat die Prüfung von Caddy, nicht schon das Holen oder Entnehmen: die kaputte
	# Datei war entnommen, der letzte Schritt war die Übernahme, das Protokoll nennt Caddy.
	grep -qF diese_direktive_gibt_es_nicht "$BASIS/fassungen/$d3/betrieb/caddy/umgebungen/test.caddy" || {
		echo "kaputtes test.caddy nicht in fassungen/D3 entnommen"
		return 1
	}
	[ "$(grep '^schritt: ' <<<"$ausgabe" | tail -n 1)" = "schritt: einrichtung uebernehmen" ] || {
		echo "letzter Schritt war nicht die Übernahme der Einrichtung"
		return 1
	}
	meldungen_nachher=$(caddy_abweisungen)
	[ "$meldungen_nachher" -eq $((meldungen_vorher + 1)) ] || {
		echo "keine neue Meldung 'Caddy-Konfiguration ungültig' im Protokoll"
		return 1
	}
	[ "$(pruefsumme "$BASIS/proxy/caddy/umgebungen/test.caddy")" = "$vorher" ] || {
		echo "test.caddy wurde nicht zurückgesetzt"
		return 1
	}
	[ "$(head -n 1 "$BASIS/test/zustand/aktuell")" = "$(lies d1)" ] || {
		echo "aktuell ist nicht mehr D1"
		return 1
	}
}

caddy_abweisungen() {
	grep -cxF "ausliefern: Caddy-Konfiguration ungültig, alles zurückgesetzt" "$BASIS/test/protokoll.log" || true
}

p6_antworten() {
	live_status_ok
	test_status_ok
}

p6_caddyfile() {
	local vorher
	vorher=$(pruefsumme "$BASIS/proxy/caddy/Caddyfile")
	erwarte_lauf ok test "$(lies d4)"
	[ "$(pruefsumme "$BASIS/proxy/caddy/Caddyfile")" = "$vorher" ] || {
		echo "proxy/caddy/Caddyfile wurde durch Test verändert"
		return 1
	}
	# Gegenprobe: das Image brachte wirklich eine andere gemeinsame Datei mit.
	[ "$(pruefsumme "$BASIS/test/betrieb/caddy/Caddyfile")" != "$vorher" ] || {
		echo "D4 enthielt kein geändertes Caddyfile"
		return 1
	}
	[ "$(head -n 1 "$BASIS/test/zustand/aktuell")" = "$(lies d4)" ]
	test_status_ok
}

# --- 7 Fehlerseite von Caddy --------------------------------------------------------------
p7_fehlerseite() {
	local status
	docker stop mytco-test-app-1 >>"$LOG" 2>&1
	status=$(abfrage test.mytco.localhost /api/status -u "$BENUTZER:$PASSWORT")
	echo "Status bei gestoppter App: $status, Inhalt: $(head -c 100 "$TEMP/inhalt")"
	# Caddy erreicht app-test nicht: 502 aus handle_errors, nicht 200.
	[ "$status" = 502 ] || {
		echo "erwartet 502, erhalten $status"
		return 1
	}
	grep -q '^502 ' "$TEMP/inhalt" || {
		echo "Inhalt stammt nicht aus handle_errors"
		return 1
	}
	[ "$(kopf_wert Content-Security-Policy)" = "frame-ancestors 'none'" ] || {
		echo "502 ohne frame-ancestors: $(kopf_wert Content-Security-Policy)"
		return 1
	}
	erwarte_kopf_einmal Strict-Transport-Security
	live_status_ok
}

# Kein Eintrag im Docker-Log des Proxys darf eine IP-Adresse oder ein Feld dafür tragen. Fehler,
# die handle_errors beantwortet (wie der 502 oben), schreibt Caddy nur auf Stufe debug; darum
# zusätzlich die wirksame Konfiguration: Der Standard-Logger entfernt die Felder jedes Eintrags.
# Ohne Filter trägt u. a. jeder Eintrag der Admin-Schnittstelle remote_ip (im Lauf gesehen).
p7_keine_ip() {
	local log konfig feld netz ip gateways
	konfig=$(docker exec mytco-proxy-caddy-1 wget -qO- http://127.0.0.1:2019/config/logging/logs/default)
	for feld in remote_ip remote_port 'request\u003eremote_ip' 'request\u003eremote_port' \
		'request\u003eclient_ip' 'request\u003eheaders\u003eX-Forwarded-For' \
		'request\u003eheaders\u003eX-Real-Ip' 'request\u003eheaders\u003eForwarded'; do
		grep -qF "\"$feld\":{\"filter\":\"delete\"}" <<<"$konfig" || {
			echo "Standard-Logger entfernt $feld nicht: $konfig"
			return 1
		}
	done
	log=$(docker logs mytco-proxy-caddy-1 2>&1)
	# Gegenprobe: Es gibt Einträge, die ohne Filter eine Adresse trügen (Anfragen an die
	# Admin-Schnittstelle bei jedem caddy reload und die Abfrage eben).
	grep -qF '"logger":"admin.api","msg":"received request"' <<<"$log" || {
		echo "keine Einträge der Admin-Schnittstelle im Log, die Prüfung hätte nichts gesehen"
		return 1
	}
	for feld in '"remote_ip"' '"client_ip"' 'X-Forwarded-For' 'X-Real-Ip' '"Forwarded"'; do
		if grep -qF "$feld" <<<"$log"; then
			echo "Log enthält $feld:"
			grep -F "$feld" <<<"$log" | head -n 3
			return 1
		fi
	done
	# 127.0.0.1:2019 ist Caddys eigene Admin-Schnittstelle (Startmeldung, Host-Kopf der Abfrage
	# oben), keine Client-Adresse; jedes andere Vorkommen von 127.0.0.1 wäre eine.
	if grep -E '(^|[^0-9.])127\.0\.0\.1([^0-9]|$)' <<<"${log//127.0.0.1:2019/}"; then
		echo "Log enthält 127.0.0.1 (Zeilen oben)"
		return 1
	fi
	# Die Adresse, unter der Docker die Anfragen an den Proxy weiterreicht (Gateway der Netze).
	for netz in mytco-proxy-test mytco-proxy-live; do
		gateways=$(docker network inspect -f '{{range .IPAM.Config}}{{.Gateway}} {{end}}' "$netz") || {
			echo "Netz $netz nicht lesbar"
			return 1
		}
		[ -n "${gateways// /}" ] || {
			echo "Netz $netz ohne Gateway-Adresse"
			return 1
		}
		for ip in $gateways; do
			if grep -qF "$ip" <<<"$log"; then
				echo "Log enthält die Gateway-Adresse $ip"
				return 1
			fi
		done
	done
}

# --- Ablauf -------------------------------------------------------------------------------
pruefung "0 wegwerf-server einrichten" einrichten
[ "$ANZAHL_FEHLER" = 0 ] || summe

pruefung "1 image $QUELLE in die registry (D1)" schiebe "$BILD" d1
D1=$(lies d1)
if docker image inspect "$REPO@$D1" >/dev/null 2>&1; then merke_wert d1-lokal vorhanden; else merke_wert d1-lokal fehlt; fi
ABRUFE_VORHER=$(manifest_abrufe "$D1")
pruefung "1 ausliefern-ssh test D1 → ok" erwarte_lauf ok test "$D1"
pruefung "1 ausliefern-ssh live D1 → ok" erwarte_lauf ok live "$D1"
pruefung "1 image per digest aus der registry geholt" p1_pull "$ABRUFE_VORHER"
pruefung "1 test und live laufen mit D1" p1_laeuft
pruefung "1 testdaten auf test geladen, mail-versuch protokolliert" p1_testdaten
pruefung "1 testdaten zweiter lauf → abgebrochen, nichts doppelt" p1_testdaten_zweimal
# Ohne laufende Umgebungen sind alle weiteren Prüfungen ohne Aussage.
[ "$ANZAHL_FEHLER" = 0 ] || summe

pruefung "2 live /api/status über https → ok" live_status_ok
pruefung "2 test ohne passwort → 401" p2_test_ohne_passwort
pruefung "2 test mit passwort → ok" test_status_ok
pruefung "2 /_app-datei: HSTS, frame-ancestors, köpfe je einmal" p2_app_datei
pruefung "2 seite /: CSP der app unverändert, köpfe je einmal" p2_seite

pruefung "3 gegenprobe: verbindungen innerhalb einer umgebung gelingen" p3_gegenprobe
pruefung "3 test-app erreicht live-db per ip nicht" p3_ip
pruefung "3 db löst in test-app auf die test-db auf" p3_db_name
pruefung "3 test-app erreicht mytco-live-db-1 per name nicht" p3_live_name

pruefung "4 image mit fehlerhaftem start (D2)" p4_bauen
pruefung "4 ausliefern-ssh test D2 → fehler mit rückfall" p4_rueckfall
pruefung "4 test danach ok, aktuell = D1" p4_danach

pruefung "5 erfundene zeile in live-db" p5_zeile
pruefung "5 sichern live ohne angelegtes ziel → fehler, nichts angelegt" p5_ohne_ziel
pruefung "5 sicherungsziel von hand anlegen (restic init)" p5_ziel_anlegen
pruefung "5 sichern live → ok" p5_sichern
pruefung "5 probe live → ok" p5_probe
pruefung "5 wiederherstellen live → zeile wieder da" p5_wiederherstellen
pruefung "5 probe live <lauf> → ok (lauf gültig)" p5_probe "$(lies lauf)"
pruefung "5 wiederherstellen test <lauf von live> → fehler" p5_fremder_lauf
pruefung "5 image mit neuer migration (D5)" p5_bauen_d5
pruefung "5 ausliefern-ssh live D5 → ok, vorher vollständig gesichert (mit zeile)" p5_live_d5
pruefung "5 wiederherstellen live <lauf vor D5> → spätere tabelle weg" p5_alt_zurueck
pruefung "5 ausliefern-ssh live D5 erneut → ok, migration läuft wieder durch" p5_live_d5_erneut

pruefung "6 images mit kaputtem test.caddy (D3) und geändertem Caddyfile (D4)" p6_bauen
pruefung "6 ausliefern-ssh test D3 → fehler, test.caddy zurückgesetzt" p6_kaputt
pruefung "6 live und test antworten weiter" p6_antworten
pruefung "6 test-auslieferung (D4) lässt proxy/Caddyfile unverändert" p6_caddyfile

pruefung "7 app gestoppt → caddy antwortet mit 502" p7_fehlerseite
pruefung "7 proxy-log ohne ip-adressen" p7_keine_ip

summe
