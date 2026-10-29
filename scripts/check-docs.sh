#!/usr/bin/env bash
# Doku-Check: läuft lokal (make check) und in der CI identisch.
#  1. keine Merge-Konfliktmarker in versionierten Textdateien
#  2. relative Markdown-Links zeigen auf existierende Dateien
#  3. kein literales \n in Mermaid-Blöcken (wird in VS Code als Text gerendert)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# Dateinamen mit Umlauten nicht in Anführungszeichen setzen, sonst werden sie still übersprungen
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.quotePath GIT_CONFIG_VALUE_0=false

fehler=0
melde() { echo "  ✗ $1"; fehler=1; }

echo "Konfliktmarker …"
while IFS= read -r treffer; do
  melde "Konfliktmarker: $treffer"
done < <(git ls-files -z -- ':!*.pdf' ':!*.png' ':!*.jpg' \
  | xargs -0 grep -nE '^(<<<<<<<|>>>>>>>)( |$)' 2>/dev/null || true)

echo "Relative Links in Markdown …"
while IFS= read -r datei; do
  verzeichnis=$(dirname "$datei")
  # Inline-Code entfernen, damit Beispiel-Syntax in Backticks nicht als Link zählt
  while IFS= read -r ziel; do
    ziel=${ziel%%#*}
    ziel=${ziel%% *}
    [ -z "$ziel" ] && continue
    case "$ziel" in
      http://*|https://*|mailto:*) continue ;;
    esac
    [ -e "$verzeichnis/$ziel" ] || melde "$datei → $ziel existiert nicht"
  done < <(sed -E 's/`[^`]*`//g' "$datei" | grep -oE '\]\([^)]+\)' | sed -E 's/^\]\((.*)\)$/\1/' || true)
done < <(git ls-files '*.md')

echo "Mermaid-Labels ohne literales \\n …"
while IFS= read -r datei; do
  awk -v f="$datei" '
    /^```mermaid/ { im = 1; next }
    /^```/        { im = 0 }
    im && /\\n/   { printf "  ✗ %s:%d: literales \\n in Mermaid\n", f, NR; bad = 1 }
    END { exit bad }
  ' "$datei" || fehler=1
done < <(git ls-files '*.md')

if [ "$fehler" -ne 0 ]; then
  echo "Doku-Check fehlgeschlagen."
  exit 1
fi
echo "Doku-Check ok."
