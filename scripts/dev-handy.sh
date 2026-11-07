#!/usr/bin/env bash
# Entwicklungsserver fürs Handy im selben WLAN (`make dev-handy`, nur macOS, nur im eigenen WLAN).
# Nur im Entwicklungsserver setzt SvelteKit das Login-Cookie ohne `Secure`, darum klappt der Login
# per Code über http. Passkey braucht HTTPS und geht hier nicht.
#
# Ein fester Name je Rolle im WLAN (mDNS, macOS-Bordmittel `dns-sd`): Die Verknüpfungen auf dem
# Startbildschirm bleiben gültig, auch wenn der Laptop eine neue Adresse bekommt, und weil ein
# Login immer zu einer Adresse gehört, hat jeder Name sein eigenes Login. Die Namen nie
# umbenennen, sonst sind Verknüpfung und Login weg; eine neue Rolle bekommt einen neuen Namen
# nach dem Muster `mytco-<rolle>admin.local`.
set -euo pipefail

PORT=5173
MAILPIT=http://localhost:58025

# Name | Bezeichnung in dns-sd | Persona (Rolle) | Mailadresse der Persona
PERSONAS=(
	"mytco-mitglied.local|MyTCO Mitglied|Kurt Erfunden (Mitglied)|kurt.erfunden@example.org"
	"mytco-mytcoadmin.local|MyTCO MyTCO-Admin|Theo Platzhalter (MyTCO-Admin)|theo.platzhalter@example.org"
	"mytco-mitgliederadmin.local|MyTCO Mitglieder-Admin|Mona Vorlage (Mitglieder-Admin)|mona.vorlage@example.org"
	"mytco-cmadmin.local|MyTCO CM-Admin|Hanna Muster (CM-Admin)|hanna.muster@example.org"
)

ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
if [ -z "$ip" ]; then
	echo "Abbruch: keine WLAN-Adresse gefunden — ist der Laptop im WLAN?" >&2
	exit 1
fi

pids=()
namen=()
trap 'kill "${pids[@]}" 2>/dev/null || true' EXIT

echo ""
echo "  Am iPhone öffnen (je eine Verknüpfung auf dem Startbildschirm):"
for eintrag in "${PERSONAS[@]}"; do
	IFS='|' read -r name bezeichnung persona _ <<<"$eintrag"
	dns-sd -P "$bezeichnung" _http._tcp local "$PORT" "$name" "$ip" >/dev/null 2>&1 &
	pids+=("$!")
	namen+=("$name")
	printf '    %-34s http://%s:%s\n' "$persona:" "$name" "$PORT"
done
echo "  Ohne festen Namen: http://$ip:$PORT"
# Mailpit wird nicht geleert: Andere Worktrees lesen dort gerade ihre E2E-Codes. Die Links
# zeigen nur die Mails der Personas.
echo "  Mails (nur am Laptop):"
for eintrag in "${PERSONAS[@]}"; do
	IFS='|' read -r _ _ persona mail <<<"$eintrag"
	printf '    %-34s %s/search?q=to%%3A%s\n' "$persona:" "$MAILPIT" "${mail/@/%40}"
done
echo ""

erlaubt=$(
	IFS=,
	echo "${namen[*]}"
)

MYTCO_ADRESSE="http://mytco-mitglied.local:$PORT" \
	__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="$erlaubt" \
	node --env-file=.env node_modules/vite/bin/vite.js dev --host "$ip" --port "$PORT" --strictPort
