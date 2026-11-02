#!/usr/bin/env bash
# Druckt den Text der Version aus docs/versionen.md: der Abschnitt `## <version>` bis zur
# nächsten `## `-Überschrift. Aufruf im Wurzelordner des Repos: versionsnotizen.sh <version>.
# Leere Ausgabe heisst: kein Abschnitt oder kein Text.
set -euo pipefail

version="${1:?Version fehlt}"
awk -v kopf="## $version" '
	/^## / {
		an = (index($0, kopf) == 1 && (length($0) == length(kopf) || substr($0, length(kopf) + 1, 1) == " "))
		next
	}
	an { print }
' docs/versionen.md
