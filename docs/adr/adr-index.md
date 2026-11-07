[← Übersicht](../index.md)

# Architektur-Entscheidungen (ADRs)

Architecture Decision Records halten Entscheidungen mit Tragweite fest — *warum* etwas
so gebaut wird, nicht nur *wie*. Jede ADR nennt die geprüften Optionen, die Entscheidung,
die Konsequenzen und einen **Reevaluations-Trigger**: wann die Entscheidung neu zu
bewerten ist. Vorlage: [`vorlage.md`](vorlage.md). Dateiname: `adr-NNN-kurztitel.md`.
Eine neue ADR kommt in diese Tabelle und mit einer Zeile in die
[Lösungsstrategie von arc42](../arc42.md#4-lösungsstrategie).

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| [ADR-001](adr-001-web-app-zuerst.md) | MyTCO startet als installierbare Web-App, die Store-App folgt bei Bedarf | Entschieden | 2026-10-29 |
| [ADR-002](adr-002-sveltekit-postgresql.md) | MyTCO wird in TypeScript mit SvelteKit und PostgreSQL gebaut | Entschieden | 2026-10-30 |
| [ADR-003](adr-003-hosting-infomaniak-vps.md) | MyTCO läuft auf einem eigenen Server bei Infomaniak in der Schweiz | Entschieden | 2026-10-30 |
| [ADR-004](adr-004-login-einmal-code.md) | Mitglieder melden sich mit einem Einmal-Code an, ohne Passwort | Entschieden | 2026-11-02 |
| [ADR-005](adr-005-passkey-simplewebauthn.md) | Der freiwillige Passkey wird mit SimpleWebAuthn gebaut | Entschieden | 2026-11-04 |
| [ADR-006](adr-006-eigenstaendig-ohne-fairgate.md) | MyTCO führt seine eigene Mitgliederliste, ohne Anbindung an Fairgate | Entschieden | 2026-10-29 |
| [ADR-007](adr-007-version-pro-merge.md) | Jeder Merge nach dev mit Code bekommt seine eigene Versionsnummer | Entschieden | 2026-11-05 |
| [ADR-008](adr-008-zeitgeber-in-der-app.md) | Die Löschfristen setzt ein täglicher Zeitgeber in der App durch | Entschieden | 2026-11-07 |
