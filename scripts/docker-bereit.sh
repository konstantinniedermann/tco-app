#!/usr/bin/env bash
# Stellt sicher, dass Docker erreichbar ist. Auf dem Mac startet es Docker Desktop bei Bedarf
# im Hintergrund und wartet, bis es bereit ist: So darf Docker Desktop zwischen den Läufen aus
# sein und braucht keinen Speicher. Frist in Sekunden über DOCKER_START_FRIST (Vorgabe 120).
set -u

docker info >/dev/null 2>&1 && exit 0

if [ "$(uname)" = Darwin ] && open -ga Docker 2>/dev/null; then
	frist="${DOCKER_START_FRIST:-120}"
	echo "Docker Desktop startet …" >&2
	i=0
	while [ "$i" -lt "$frist" ]; do
		sleep 1
		docker info >/dev/null 2>&1 && exit 0
		i=$((i + 1))
	done
	echo "Abbruch: Docker Desktop ist nach $frist s noch nicht bereit." >&2
	exit 1
fi

echo "Abbruch: Docker ist nicht erreichbar — Docker Desktop starten." >&2
exit 1
