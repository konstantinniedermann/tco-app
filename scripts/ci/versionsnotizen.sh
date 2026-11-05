#!/usr/bin/env bash
# Druckt Text aus docs/versionen.md. Aufruf im Wurzelordner des Repos:
#   versionsnotizen.sh <version>             nur der Abschnitt `## <version>` bis zur nächsten
#                                            `## `-Überschrift, ohne die Überschrift
#   versionsnotizen.sh <version> <vorher>    alle Abschnitte mit vorher < Version <= version
#                                            (Text zum Release: alles seit dem letzten Release),
#                                            jeder mit seiner Überschrift als `### `
# Leere Ausgabe heisst: kein Abschnitt oder kein Text.
set -euo pipefail

version="${1:?Version fehlt}"
vorher="${2:-}"
awk -v kopf="## $version" -v bis="$version" -v vorher="$vorher" '
	# Negativ, null oder positiv wie bei sort: a kleiner, gleich oder grösser als b.
	function vergleiche(a, b,    ta, tb, i) {
		split(a, ta, ".")
		split(b, tb, ".")
		for (i = 1; i <= 3; i++) if (ta[i] + 0 != tb[i] + 0) return ta[i] - tb[i]
		return 0
	}
	/^## / {
		if (vorher == "") {
			an = (index($0, kopf) == 1 && (length($0) == length(kopf) || substr($0, length(kopf) + 1, 1) == " "))
		} else {
			an = 0
			if (match($0, /^## [0-9]+\.[0-9]+\.[0-9]+( |$)/)) {
				v = substr($0, 4)
				sub(/ .*/, "", v)
				an = (vergleiche(v, vorher) > 0 && vergleiche(v, bis) <= 0)
			}
			if (an) print "#" $0
		}
		next
	}
	an { print }
' docs/versionen.md
