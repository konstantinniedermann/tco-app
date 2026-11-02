#!/usr/bin/env bash
# Code-Stand: SHA-256 (die ersten 40 Hex-Zeichen) über alle versionierten Dateien ausser
# Doku. Dieselbe Image-Kennung gilt für Test und Live: Zwei Commits mit gleichem Code-Stand
# ergeben dasselbe Image. Die Doku-Regel ist dieselbe wie `istNurDoku` in
# scripts/pruefungen/nur-doku.ts (Pfad unter `docs/` oder Endung `.md`); ändert sich eine
# Stelle, muss die andere mit.
# Aufruf im Wurzelordner des Repos; Ausgabe: 40 Hex-Zeichen und ein Zeilenumbruch.
set -euo pipefail

if command -v sha256sum >/dev/null 2>&1; then
	hash_256() { sha256sum; }
else
	hash_256() { shasum -a 256; }
fi

# `git ls-files -s`: "<modus> <blob> <stufe><TAB><pfad>" — die Zeile enthält Modus, Blob,
# Stufe und Pfad; die Pfade der Doku fallen heraus.
git ls-files -s \
	| awk -F '\t' '{ pfad = substr($0, index($0, "\t") + 1) } pfad !~ /^docs\// && pfad !~ /\.md$/' \
	| hash_256 \
	| cut -c1-40
