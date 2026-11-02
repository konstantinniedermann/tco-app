#!/usr/bin/env bash
# Gemeinsame Funktionen der Betriebsskripte; wird mit `source` geladen.
# Bash-3.2-tauglich: kein flock, kein mapfile, keine assoziativen Arrays.
set -euo pipefail

MYTCO_BASIS="${MYTCO_BASIS:-/opt/mytco}"

# Eingabeprüfung: bei Abweichung genau "fehler" auf stdout, Exit 1.
pruefe_umgebung() {
	case "${1-}" in
	test | live) return 0 ;;
	*)
		echo fehler
		return 1
		;;
	esac
}

# Ganzer Wert muss passen; grep -x prüft zeilenweise, daher Umbrüche vorab abfangen.
pruefe_digest() {
	local wert="${1-}"
	case "$wert" in
	*$'\n'*)
		echo fehler
		return 1
		;;
	esac
	if printf '%s\n' "$wert" | grep -qxE 'sha256:[0-9a-f]{64}'; then
		return 0
	fi
	echo fehler
	return 1
}

schritt() {
	echo "schritt: $1"
}

# Führt den Befehl aus; stdout und stderr gehen nur ins Protokoll der Umgebung.
protokoll() {
	local umgebung="$1"
	shift
	local datei="$MYTCO_BASIS/$umgebung/protokoll.log"
	mkdir -p "$MYTCO_BASIS/$umgebung"
	local rc=0
	"$@" >>"$datei" 2>&1 || rc=$?
	return "$rc"
}

# Übernimmt eine Sperre mit toter PID atomar: umbenennen (nur ein Übernehmer gewinnt),
# prüfen, dass noch die beobachtete PID drinsteht, erst dann aufräumen und neu anlegen.
# Steht eine andere PID drin, war die Sperre inzwischen neu vergeben: zurücklegen, Exit 1.
sperre_uebernehmen() {
	local dir="$MYTCO_BASIS/$1/sperre" gesehen="$2"
	local alt="$dir.alt.$$"
	mv "$dir" "$alt" 2>/dev/null || return 1
	local jetzt=""
	[ -f "$alt/pid" ] && jetzt=$(cat "$alt/pid" 2>/dev/null || true)
	if [ "$jetzt" != "$gesehen" ]; then
		mv "$alt" "$dir" 2>/dev/null || true
		return 1
	fi
	rm -rf "$alt"
	mkdir "$dir" 2>/dev/null || return 1
	echo "$$" >"$dir/pid"
}

# Sperre per mkdir (atomar). Eine Sperre, deren PID nicht mehr lebt, wird übernommen.
# Eine Sperre ohne lesbare PID gilt als belegt (der Halter schreibt sie gerade).
sperre_nehmen() {
	local dir="$MYTCO_BASIS/$1/sperre"
	mkdir -p "$MYTCO_BASIS/$1"
	if mkdir "$dir" 2>/dev/null; then
		echo "$$" >"$dir/pid"
		return 0
	fi
	local pid=""
	[ -f "$dir/pid" ] && pid=$(cat "$dir/pid" 2>/dev/null || true)
	if [ -z "$pid" ] || kill -0 "$pid" 2>/dev/null; then
		return 1
	fi
	sperre_uebernehmen "$1" "$pid"
}

# Gibt nur eine Sperre frei, die dieser Prozess selbst hält.
sperre_freigeben() {
	local dir="$MYTCO_BASIS/$1/sperre" pid=""
	[ -f "$dir/pid" ] && pid=$(cat "$dir/pid" 2>/dev/null || true)
	if [ "$pid" = "$$" ]; then
		rm -rf "$dir"
	fi
	return 0
}

compose() {
	local umgebung="$1"
	shift
	export MYTCO_UMGEBUNG="$umgebung"
	docker compose -p "mytco-$umgebung" \
		-f "$MYTCO_BASIS/$umgebung/betrieb/compose.umgebung.yml" \
		--env-file "$MYTCO_BASIS/$umgebung/geheim.env" "$@"
}

# Compose-Aufruf für den gemeinsamen Webserver (Projekt mytco-proxy, Dateien unter proxy/).
compose_proxy() {
	docker compose -p mytco-proxy \
		-f "$MYTCO_BASIS/proxy/compose.proxy.yml" \
		--env-file "$MYTCO_BASIS/proxy/proxy.env" "$@"
}

# restic-Image, per Digest gepinnt (Index-Digest von restic/restic:0.18.1).
# shellcheck disable=SC2034 # wird von sichern, wiederherstellen und probe genutzt
RESTIC_IMAGE="restic/restic:0.18.1@sha256:39d9072fb5651c80d75c7a811612eb60b4c06b32ffe87c2e9f3c7222e1797e76"

# restic im Container. Ein lokales Ziel (RESTIC_REPOSITORY beginnt mit /) wird am selben Pfad
# eingehängt. Stdin wird durchgereicht (-i); Aufrufer ohne Eingabe leiten </dev/null um.
# --hostname: fester Host, sonst gruppiert forget je zufälligem Container-Namen und löscht nie.
# --log-driver none: Docker darf die Standardausgabe (z. B. restic dump) nicht mitschreiben.
# --retry-lock: kurz auf ein Repo-Schloss warten, statt sofort zu scheitern.
restic_docker() {
	local env_datei="$MYTCO_BASIS/sicherung.env" ziel=""
	ziel=$(sed -n 's/^RESTIC_REPOSITORY=//p' "$env_datei" | head -n 1)
	case "$ziel" in
	/*)
		docker run --rm -i --hostname mytco --log-driver none --env-file "$env_datei" \
			-v "$ziel:$ziel" "$RESTIC_IMAGE" --retry-lock 2m "$@"
		;;
	*)
		docker run --rm -i --hostname mytco --log-driver none --env-file "$env_datei" \
			"$RESTIC_IMAGE" --retry-lock 2m "$@"
		;;
	esac
}

# Snapshots als eine Zeile je Eintrag (restic liefert ein JSON-Array; Einträge beginnen mit "time").
snapshot_zeilen() {
	awk '{ gsub(/\},\{"time":/, "}\n{\"time\":"); print }'
}

# finde_lauf <umgebung> [lauf]: gibt die Lauf-ID aus. Nur Snapshots mit dem Tag der Umgebung
# zählen (ein Live-Stand darf nie auf Test landen, DS-08). Vollständig ist ein Lauf erst mit
# seinem zaehlung.txt-Snapshot (wird zuletzt geschrieben). Ohne Lauf der neueste vollständige
# dieser Umgebung; kein Treffer: Exit 1.
finde_lauf() {
	local umgebung="$1" lauf="${2-}" json="" treffer=""
	if [ -n "$lauf" ]; then
		case "$lauf" in
		*$'\n'*) return 1 ;;
		esac
		printf '%s\n' "$lauf" | grep -qxE 'lauf-[0-9A-Za-z]+' || return 1
		json=$(restic_docker snapshots --tag "$umgebung,$lauf" --json </dev/null) || return 1
		# Gegenprobe im selben Eintrag: Pfad der Zählung und beide Tags.
		treffer=$(printf '%s\n' "$json" | snapshot_zeilen |
			grep -F '"paths":["/zaehlung.txt"]' |
			grep -E "\"tags\":\[[^]]*\"$umgebung\"" |
			grep -E "\"tags\":\[[^]]*\"$lauf\"" || true)
		[ -n "$treffer" ] || return 1
	else
		json=$(restic_docker snapshots --tag "$umgebung" --json </dev/null) || return 1
		lauf=$(printf '%s\n' "$json" | snapshot_zeilen |
			grep -F '"paths":["/zaehlung.txt"]' |
			grep -E "\"tags\":\[[^]]*\"$umgebung\"" |
			grep -o 'lauf-[0-9]\{8\}T[0-9]\{6\}Z' | sort -u | tail -n 1 || true)
		[ -n "$lauf" ] || return 1
	fi
	echo "$lauf"
}

# Je Tabelle "schema.tabelle|anzahl", sortiert (für den Vorher-Nachher-Vergleich).
# shellcheck disable=SC2034 # wird von den Skripten genutzt, die lib.sh laden
ZAEHL_SQL="SELECT table_schema || '.' || table_name || '|' || (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name"
