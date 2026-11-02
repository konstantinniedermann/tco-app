#!/usr/bin/env bash
# Treiber für die Tests: lädt lib.sh und ruft die als Argumente genannte Funktion auf.
# "zeige NAME" gibt den Wert der Variable NAME aus.
set -euo pipefail
# shellcheck source=../../betrieb/bin/lib.sh
source "$(dirname "$0")/../../betrieb/bin/lib.sh"
if [ "$1" = "zeige" ]; then
	printf '%s\n' "${!2}"
else
	"$@"
fi
