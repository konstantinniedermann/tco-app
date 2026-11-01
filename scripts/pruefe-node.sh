#!/usr/bin/env bash
# Bricht ab, wenn die Hauptversion von Node nicht der aus .nvmrc entspricht. Ältere Versionen
# kennen import.meta.main nicht: Die Prüfskripte endeten dort still mit Exit 0 («nur Doku»).
# Aufgerufen von make docs, make voraussetzungen und den Git-Hooks.
set -euo pipefail

soll=$(tr -d '[:space:]v' < .nvmrc | cut -d. -f1)
if ! command -v node >/dev/null 2>&1; then
  echo "Abbruch: node fehlt — Node $soll installieren (siehe .nvmrc)." >&2
  exit 1
fi
ist=$(node -p 'process.versions.node.split(".")[0]')
if [ "$ist" != "$soll" ]; then
  echo "Abbruch: Node $ist statt $soll (.nvmrc) — passende Version aktivieren, z. B. mit «nvm use»." >&2
  exit 1
fi
