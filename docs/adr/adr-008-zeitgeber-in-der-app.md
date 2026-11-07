[← ADR-Index](adr-index.md)

# ADR-008: Die Löschfristen setzt ein täglicher Zeitgeber in der App durch

**Status:** Entschieden · **Datum:** 2026-11-07 · **Issue:** #43

## Kontext

Die Löschfristen (FR-04, FR-26, [Datenschutzkonzept](../datenschutz.md#löschen)) müssen ohne
Zutun eines Admins greifen: ausgetretene Mitglieder nach einem Jahr, vorgemerkte nach der
Bedenkzeit, Verlauf und Antworten zu Anlässen nach ihrer Frist. MyTCO läuft als ein Container
auf einem VPS ([ADR-003](adr-003-hosting-infomaniak-vps.md)).

## Optionen

| Option | Dafür | Dagegen |
|--------|-------|---------|
| A: Cron auf dem Server | bewährt, unabhängig von der App | zweiter Ort für Betrieb und Doku; braucht Zugang zum Code oder einen eigenen Aufruf |
| B: Job in der Datenbank (z. B. `pg_cron`) | läuft auch ohne App | Erweiterung in PostgreSQL; Löschregeln doppelt, in SQL statt TypeScript |
| C: «nebenbei» bei Anfragen | kein Takt nötig | löscht nur, wenn jemand die App nutzt; macht Anfragen langsamer |
| D: Takt in der App, täglich und kurz nach dem Start | kein neuer Dienst, keine neue Abhängigkeit; Regeln im selben Code und getestet | löscht nur, solange die App läuft |

## Entscheidung

Option D: Der Zeitgeber (`src/lib/server/zeitgeber.ts`) ruft einmal am Tag und kurz nach jedem
Start den Löschlauf `raeumeAuf` auf. Er braucht weder einen neuen Dienst noch eine neue
Abhängigkeit und läuft auf dem einen VPS. Ein Sperrschloss der Datenbank
(`pg_try_advisory_xact_lock`) verhindert doppelte Läufe. Was während eines Stillstands fällig
wurde, holt der Lauf nach dem Start nach.

## Konsequenzen

- Laufen mehrere Instanzen, startet jede ihren Takt; das Sperrschloss lässt trotzdem nur einen
  Lauf zur Zeit zu.
- Läuft die App nicht, wird nichts gelöscht; der nächste Start holt es nach.
- Die Release-Checkliste prüft auf Test, dass der Zeitgeber läuft
  ([Testkonzept](../testkonzept.md)).
- `ZEITGEBER=aus` schaltet ihn ab; die E2E-Tests tun das, damit kein Lauf ihre Daten löscht. Das
  wirkt nur lokal und im E2E: `betrieb/compose.umgebung.yml` reicht die Variable nicht durch, auf
  Test und Live läuft der Zeitgeber immer.

## Reevaluations-Trigger

- MyTCO läuft dauerhaft mit mehreren Instanzen oder ohne ständig laufenden Prozess (z. B.
  Serverless).
- Ein Lauf dauert so lange, dass er Anfragen spürbar bremst.
