#!/usr/bin/env bash
# PostToolUse (Edit|Write): Ändert sich eine Seite der Verwaltung oder ein Baustein darunter, erinnert
# der Hook daran, die Seiteninfo der Seite zu prüfen (UI-Leitbild, Baustein Seiteninfo). Pro Session
# und Datei nur einmal, damit er nicht bei jeder Änderung meldet.
set -euo pipefail

eingabe=$(cat)
datei=$(jq -r '.tool_input.file_path // empty' <<<"$eingabe")
session=$(jq -r '.session_id // "ohne"' <<<"$eingabe")

case "$datei" in
	*/src/routes/verwaltung/*+page.svelte | */src/lib/verwaltung/*.svelte) ;;
	*) exit 0 ;;
esac

merker="${TMPDIR:-/tmp}/seiteninfo-erinnerung-${session//[^A-Za-z0-9_-]/_}"
if [ -f "$merker" ] && grep -qxF "$datei" "$merker"; then
	exit 0
fi
printf '%s\n' "$datei" >>"$merker"

kurz=${datei##*/src/}
text="Seiteninfo prüfen: src/${kurz} wurde geändert. Stimmt die Seiteninfo der betroffenen Seite noch mit dem überein, was die Seite jetzt kann (Aktionen, Verweise, wofür sie nicht gedacht ist)? Sonst den Text anpassen und dem Projektleiter vorlegen."
jq -n --arg t "$text" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $t}}'
