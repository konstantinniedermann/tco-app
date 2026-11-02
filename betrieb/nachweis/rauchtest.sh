#!/usr/bin/env bash
# Rauchtest: startet App und Datenbank eines Images mit erfundenen Werten wie in einer
# Umgebung, migriert und wartet auf "healthy". Aufruf: rauchtest.sh <image>
# Ausgabe nur "ok" oder "fehler"; Container, Netz, Volume und Temp-Ordner werden immer entfernt.
set -euo pipefail

image="${1-}"
if [ -z "$image" ]; then
	echo fehler
	exit 1
fi

hier="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
compose_datei="$hier/../compose.umgebung.yml"
projekt=mytco-rauch
netz=mytco-proxy-rauch
temp="$(mktemp -d)"

export MYTCO_UMGEBUNG=rauch
export MYTCO_IMAGE="$image"

# Direkt docker compose statt lib.sh: dort sind nur test und live als Umgebung erlaubt.
rauch_compose() {
	docker compose -p "$projekt" -f "$compose_datei" --env-file "$temp/geheim.env" "$@"
}

aufraeumen() {
	rauch_compose down -v --remove-orphans >/dev/null 2>&1 || true
	docker network rm "$netz" >/dev/null 2>&1 || true
	rm -rf "$temp"
}
trap aufraeumen EXIT

# Erfundene Werte, keine echten Geheimnisse.
schluessel=$(openssl rand -base64 48 | tr -d '\n/+=')
cat >"$temp/geheim.env" <<EOF
POSTGRES_PASSWORD=rauchtest-erfunden
ORIGIN=http://localhost:3000
MAIL_NUR_AN=
MYTCO_CODE_SCHLUESSEL=$schluessel
MYTCO_SMTP_URL=smtp://mail.invalid:25
MYTCO_MAIL_ABSENDER=MyTCO <mytco@example.org>
MYTCO_KONTAKT=Sekretariat (erfunden), sekretariat@example.org
EOF

if {
	docker network create "$netz" &&
		rauch_compose up -d --wait db &&
		rauch_compose run --rm --no-deps app node scripts/migrate.ts &&
		rauch_compose up -d --wait
} >"$temp/lauf.log" 2>&1; then
	echo ok
else
	echo fehler
	exit 1
fi
