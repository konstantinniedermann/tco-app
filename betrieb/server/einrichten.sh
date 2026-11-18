#!/usr/bin/env bash
# Richtet einen frischen Ubuntu-LTS-Server für MyTCO ein (SI-13, DS-06) und prüft ihn danach
# mit pruefen.sh. Als root, aus einem Checkout des Repos (nur betrieb/ wird gebraucht):
#   sudo betrieb/server/einrichten.sh <admin-benutzer>
# <admin-benutzer> meldet sich danach per SSH-Schlüssel an und wird mit sudo root. Gibt es ihn
# nicht, legt das Skript ihn an und übernimmt die Schlüssel von root. Ohne hinterlegten
# Schlüssel bricht es ab, bevor SSH umgestellt wird (sonst sperrt man sich aus).
# Mehrfach ausführbar. Nur Pakete aus Ubuntu und dem offiziellen Docker-Repository.
set -euo pipefail
HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BETRIEB="$(dirname "$HIER")"
DATEIEN="$HIER/dateien"
ADMIN="${1:-}"

abbruch() {
	echo "einrichten: $1" >&2
	exit 1
}
schritt() { echo "schritt: $1"; }

[ "$(id -u)" = 0 ] || abbruch "als root ausführen"
[ -n "$ADMIN" ] || abbruch "Aufruf: einrichten.sh <admin-benutzer>"
[ "$ADMIN" != root ] && [ "$ADMIN" != mytco ] || abbruch "admin-benutzer weder root noch mytco"
# shellcheck source=/dev/null
. /etc/os-release
[ "${ID:-}" = ubuntu ] || abbruch "nur für Ubuntu"
export DEBIAN_FRONTEND=noninteractive

schritt "pakete"
apt-get update -q
apt-get install -y -q ca-certificates curl ufw unattended-upgrades logrotate

schritt "docker"
if ! command -v docker >/dev/null 2>&1; then
	# Offizielle Anleitung: https://docs.docker.com/engine/install/ubuntu/
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
	chmod a+r /etc/apt/keyrings/docker.asc
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" \
		>/etc/apt/sources.list.d/docker.list
	apt-get update -q
	apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

schritt "benutzer"
if ! id "$ADMIN" >/dev/null 2>&1; then
	useradd --create-home --shell /bin/bash --groups sudo "$ADMIN"
	install -d -o "$ADMIN" -g "$ADMIN" -m 0700 "/home/$ADMIN/.ssh"
	[ -s /root/.ssh/authorized_keys ] || abbruch "root hat keinen SSH-Schlüssel zum Übernehmen"
	install -o "$ADMIN" -g "$ADMIN" -m 0600 /root/.ssh/authorized_keys "/home/$ADMIN/.ssh/authorized_keys"
	# Anmeldung nur mit Schlüssel, darum sudo ohne Passwort.
	echo "$ADMIN ALL=(ALL) NOPASSWD:ALL" >"/etc/sudoers.d/90-mytco-$ADMIN"
	chmod 0440 "/etc/sudoers.d/90-mytco-$ADMIN"
	visudo -cf "/etc/sudoers.d/90-mytco-$ADMIN" >/dev/null
fi
ADMIN_HOME=$(getent passwd "$ADMIN" | cut -d: -f6)
[ -s "$ADMIN_HOME/.ssh/authorized_keys" ] || abbruch "$ADMIN hat keinen SSH-Schlüssel"
id -nG "$ADMIN" | tr ' ' '\n' | grep -qx sudo || abbruch "$ADMIN ist nicht in der Gruppe sudo"
if ! id mytco >/dev/null 2>&1; then
	useradd --create-home --shell /bin/bash mytco
fi
usermod -aG docker mytco
install -d -o mytco -g mytco -m 0700 /home/mytco/.ssh

schritt "ssh"
install -o root -g root -m 0644 "$DATEIEN/sshd-mytco.conf" /etc/ssh/sshd_config.d/00-mytco.conf
sshd -t
# Ubuntu startet sshd je Verbindung über ssh.socket; läuft der Dienst, lädt er neu.
systemctl try-reload-or-restart ssh.service

schritt "firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw logging off
ufw --force enable

schritt "updates"
install -o root -g root -m 0644 "$DATEIEN/20auto-upgrades" /etc/apt/apt.conf.d/20auto-upgrades
systemctl enable --now unattended-upgrades

schritt "protokolle"
install -d -m 0755 /etc/systemd/journald.conf.d
install -o root -g root -m 0644 "$DATEIEN/journald-mytco.conf" /etc/systemd/journald.conf.d/mytco.conf
systemctl restart systemd-journald
journalctl --vacuum-time=24h >/dev/null
# rsyslog schriebe dieselben Zeilen samt IP nach /var/log/auth.log (Wochenrotation): aus.
if systemctl list-unit-files rsyslog.service >/dev/null 2>&1; then
	systemctl disable --now rsyslog.service >/dev/null 2>&1 || true
	systemctl mask rsyslog.service >/dev/null 2>&1 || true
fi
rm -f /var/log/auth.log* /var/log/syslog* /var/log/kern.log* /var/log/ufw.log*
install -o root -g root -m 0644 "$DATEIEN/logrotate-mytco" /etc/logrotate.d/mytco
sed -e 's/NAME/wtmp/' -e 's/MODUS/0664/' "$DATEIEN/logrotate-anmeldung" >/etc/logrotate.d/wtmp
sed -e 's/NAME/btmp/' -e 's/MODUS/0660/' "$DATEIEN/logrotate-anmeldung" >/etc/logrotate.d/btmp
chmod 0644 /etc/logrotate.d/wtmp /etc/logrotate.d/btmp
logrotate --debug /etc/logrotate.conf >/dev/null 2>&1 || abbruch "logrotate-Konfiguration ungültig"

schritt "betrieb"
install -d -o mytco -g mytco -m 0750 /opt/mytco
install -d -o root -g root -m 0755 /opt/mytco/bin
install -o root -g root -m 0755 "$BETRIEB/bin/ausliefern-ssh" "$BETRIEB/bin/lib.sh" /opt/mytco/bin/

schritt "pruefen"
"$HIER/pruefen.sh"
