#!/usr/bin/env bash
# Treiber für die Tests: lädt lib.sh und ruft die als Argumente genannte Funktion auf.
# "zeige NAME" gibt den Wert der Variable NAME aus.
set -euo pipefail
# shellcheck source=../../betrieb/bin/lib.sh
source "$(dirname "$0")/../../betrieb/bin/lib.sh"
case "$1" in
zeige) printf '%s\n' "${!2}" ;;
# nimmt und gibt die Sperre im selben Prozess wieder frei
sperre_zyklus) sperre_nehmen "$2" && sperre_freigeben "$2" ;;
*) "$@" ;;
esac
