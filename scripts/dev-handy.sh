#!/usr/bin/env bash
# Entwicklungsserver fürs Handy im selben WLAN (`make dev-handy`, nur macOS, nur im eigenen WLAN).
# Nur im Entwicklungsserver setzt SvelteKit das Login-Cookie ohne `Secure`, darum klappt der Login
# per Code über http. Passkey braucht HTTPS und geht hier nicht.
#
# Zwei feste Namen im WLAN (mDNS, macOS-Bordmittel `dns-sd`): Die Verknüpfungen auf dem
# Startbildschirm bleiben gültig, auch wenn der Laptop eine neue Adresse bekommt, und weil ein
# Login immer zu einer Adresse gehört, hat jeder Name sein eigenes Login (Erika und Kurt).
set -euo pipefail

PORT=5173
ADMIN=mytco-admin.local
MITGLIED=mytco-mitglied.local
MAILPIT=http://localhost:58025

ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
if [ -z "$ip" ]; then
	echo "Abbruch: keine WLAN-Adresse gefunden — ist der Laptop im WLAN?" >&2
	exit 1
fi

dns-sd -P "MyTCO Admin" _http._tcp local "$PORT" "$ADMIN" "$ip" >/dev/null 2>&1 &
admin_pid=$!
dns-sd -P "MyTCO Mitglied" _http._tcp local "$PORT" "$MITGLIED" "$ip" >/dev/null 2>&1 &
mitglied_pid=$!
trap 'kill "$admin_pid" "$mitglied_pid" 2>/dev/null || true' EXIT

echo ""
echo "  Am iPhone öffnen (je eine Verknüpfung auf dem Startbildschirm):"
echo "    Erika (Admin):   http://$ADMIN:$PORT"
echo "    Kurt (Mitglied): http://$MITGLIED:$PORT"
echo "  Ohne festen Namen: http://$ip:$PORT"
# Mailpit wird nicht geleert: Andere Worktrees lesen dort gerade ihre E2E-Codes. Die Links
# zeigen nur die Mails der beiden Personas.
echo "  Mails (nur am Laptop):"
echo "    Erika: $MAILPIT/search?q=to%3Aerika.beispiel%40example.org"
echo "    Kurt:  $MAILPIT/search?q=to%3Akurt.erfunden%40example.org"
echo ""

MYTCO_ADRESSE="http://$MITGLIED:$PORT" \
	__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="$ADMIN,$MITGLIED" \
	node --env-file=.env node_modules/vite/bin/vite.js dev --host "$ip" --port "$PORT" --strictPort
