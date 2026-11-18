#!/usr/bin/env bash
# Prüft die Härtung des Servers nach SI-13 und die Fristen der Protokolle nach DS-06.
# Als root ausführen: pruefen.sh [admin-benutzer]. Ändert nichts. Mit Admin-Benutzer prüft es
# auch, dass er ohne Passwort root wird. Gibt je Massnahme "ok <name>" oder "fehler <name>" aus,
# am Ende "ok" oder "fehler" (Exit 0 bzw. 1), nie einen Wert.
# MYTCO_WURZEL (Vorgabe /) lenkt /etc und /opt um, nur für die Tests.
# Die Prüfungen ruft `massnahme` über ihren Namen auf.
# shellcheck disable=SC2329
set -uo pipefail
W="${MYTCO_WURZEL:-/}"
W="${W%/}"
ADMIN="${1:-}"
FEHLER=0

melde() {
	if [ "$2" = 0 ]; then echo "ok $1"; else echo "fehler $1" && FEHLER=1; fi
}

# Läuft die Prüfung $2… und meldet unter dem Namen $1; Ausgaben der Werkzeuge verworfen.
massnahme() {
	local name="$1" rc=0
	shift
	"$@" >/dev/null 2>&1 || rc=1
	melde "$name" "$rc"
}

SSHD=$(sshd -T 2>/dev/null || true)
sshd_hat() { printf '%s\n' "$SSHD" | grep -qx "$1"; }

ssh_passwort() { sshd_hat 'passwordauthentication no' && sshd_hat 'kbdinteractiveauthentication no'; }
ssh_root() { sshd_hat 'permitrootlogin no'; }
ssh_umgebung() { sshd_hat 'permituserenvironment no'; }

# Aktiv, Protokoll aus, eingehend standardmässig verboten; erlaubt genau 22, 80, 443 (tcp).
firewall() {
	local status ports port
	status=$(ufw status verbose 2>/dev/null) || return 1
	printf '%s\n' "$status" | grep -qx 'Status: active' || return 1
	printf '%s\n' "$status" | grep -qx 'Logging: off' || return 1
	printf '%s\n' "$status" | grep -q '^Default: deny (incoming)' || return 1
	ports=$(printf '%s\n' "$status" | awk '/ ALLOW/ { print $1 }' | sort -u)
	for port in $ports; do
		case "$port" in
		22/tcp | 80/tcp | 443/tcp) ;;
		*) return 1 ;;
		esac
	done
	for port in 22/tcp 80/tcp 443/tcp; do
		printf '%s\n' "$ports" | grep -qx "$port" || return 1
	done
}

updates() {
	local apt
	systemctl is-active unattended-upgrades || return 1
	apt=$(apt-config dump) || return 1
	printf '%s\n' "$apt" | grep -q '^APT::Periodic::Unattended-Upgrade "1";'
}

# Letzter wirksamer Wert eines Schlüssels aus `systemd-analyze cat-config`.
journal_wert() {
	systemd-analyze cat-config systemd/journald.conf 2>/dev/null |
		sed -nE "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" | tail -n 1 | tr -d '[:space:]'
}

# Zeitspanne von systemd (z. B. 24h, 1d, 90min, 86400) in Sekunden; leer bei Unbekanntem.
sekunden() {
	local zahl einheit
	zahl=$(printf '%s' "$1" | sed -nE 's/^([0-9]+)[a-z]*$/\1/p')
	einheit=$(printf '%s' "$1" | sed -nE 's/^[0-9]+([a-z]*)$/\1/p')
	[ -n "$zahl" ] || return 1
	case "$einheit" in
	'' | s | sec | second | seconds) echo "$zahl" ;;
	m | min | minute | minutes) echo $((zahl * 60)) ;;
	h | hr | hour | hours) echo $((zahl * 3600)) ;;
	d | day | days) echo $((zahl * 86400)) ;;
	*) return 1 ;;
	esac
}

# MaxRetentionSec löscht nur abgelegte Dateien; die laufende wechselt erst nach MaxFileSec
# (Vorgabe ein Monat). Ein Eintrag bleibt darum höchstens beide zusammen.
journal() {
	local frist datei
	[ "$(journal_wert Storage)" = persistent ] || return 1
	frist=$(sekunden "$(journal_wert MaxRetentionSec)") || return 1
	datei=$(sekunden "$(journal_wert MaxFileSec)") || return 1
	[ "$frist" -gt 0 ] && [ "$datei" -gt 0 ] && [ $((frist + datei)) -le 86400 ]
}

rsyslog() { ! systemctl is-active rsyslog; }

# Block "<pfad> { … }" aus einer logrotate-Datei.
block() { awk -v p="$2 {" '$0 == p { an = 1; next } an && /^}/ { exit } an { print }' "$1"; }

# Täglich, höchstens 30 Tage, ohne Neustart des Schreibers.
frist_30() {
	local inhalt alter
	inhalt=$(block "$1" "$2")
	printf '%s\n' "$inhalt" | grep -qE '^[[:space:]]*daily$' || return 1
	printf '%s\n' "$inhalt" | grep -qE '^[[:space:]]*copytruncate$' || return 1
	alter=$(printf '%s\n' "$inhalt" | sed -nE 's/^[[:space:]]*maxage[[:space:]]+([0-9]+)$/\1/p')
	[ -n "$alter" ] && [ "$alter" -le 30 ]
}

protokolle() {
	local datei="$W/etc/logrotate.d/mytco"
	[ -f "$datei" ] || return 1
	frist_30 "$datei" '/opt/mytco/*/protokoll.log' &&
		frist_30 "$datei" '/var/lib/docker/containers/*/*-json.log'
}

# wtmp und btmp halten die Adressen der Anmeldungen: täglich, alte Datei sofort weg. lastlog,
# wtmpdb und lastlog2 leert der Timer mytco-anmeldungen täglich.
anmeldungen() {
	local name inhalt
	systemctl is-active mytco-anmeldungen.timer || return 1
	for name in wtmp btmp; do
		[ -f "$W/etc/logrotate.d/$name" ] || return 1
		inhalt=$(block "$W/etc/logrotate.d/$name" "/var/log/$name")
		printf '%s\n' "$inhalt" | grep -qE '^[[:space:]]*daily$' || return 1
		printf '%s\n' "$inhalt" | grep -qE '^[[:space:]]*rotate[[:space:]]+0$' || return 1
	done
}

betrieb() {
	[ "$(stat -c '%U:%G %a' "$W/opt/mytco")" = 'mytco:mytco 750' ] || return 1
	[ "$(stat -c '%U:%G %a' "$W/opt/mytco/bin")" = 'root:root 755' ] || return 1
	id -nG mytco | tr ' ' '\n' | grep -qx docker
}

massnahme ssh-passwort ssh_passwort
massnahme ssh-root ssh_root
massnahme ssh-umgebung ssh_umgebung
massnahme firewall firewall
massnahme updates updates
massnahme journal journal
massnahme rsyslog rsyslog
massnahme protokolle protokolle
massnahme anmeldungen anmeldungen
massnahme betrieb betrieb
admin() { sudo -u "$ADMIN" sudo -n true; }
if [ -n "$ADMIN" ]; then massnahme admin admin; fi

if [ "$FEHLER" = 0 ]; then
	echo ok
	exit 0
fi
echo fehler
exit 1
