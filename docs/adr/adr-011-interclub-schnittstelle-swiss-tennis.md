[← ADR-Index](adr-index.md)

# ADR-011: MyTCO liest die Interclub-Daten von der nicht dokumentierten Schnittstelle von Swiss Tennis

**Status:** Entschieden · **Datum:** 2026-11-13 · **Issue:** #81

## Kontext

Der Verein hat 17 Interclub-Teams. Die Resultate führt Swiss Tennis; Mitglieder sehen sie heute nur auf mytennis.ch. Die Seite mytennis.ch lädt sie von einer Schnittstelle (`low-scalability.microservices.swisstennis.ch/interclub`), die ohne Login antwortet, nicht dokumentiert und nicht offiziell freigegeben ist. MyTCO soll die Resultate der TCO-Teams zeigen, ohne dass jemand sie von Hand pflegt.

## Optionen

| Option | Dafür | Dagegen |
|--------|-------|---------|
| A: Schnittstelle nutzen, ohne Swiss Tennis zu fragen | sofort machbar, keine Handarbeit, aktuelle Daten | nicht freigegeben; kann sich ändern oder gesperrt werden |
| B: Swiss Tennis um eine Freigabe bitten | verlässlicher | Antwort offen, keine Zusage zu erwarten, blockiert den Bau |
| C: Resultate von Hand eingeben | volle Kontrolle | dauernde Handarbeit, wird nicht durchgehalten |
| D: Nur auf mytennis.ch verlinken | kein Risiko, kein Aufwand | die Resultate kommen nicht in die App, kein Grund mehr, sie zu öffnen |

## Entscheidung

Option A, Entscheid des Projektleiters: MyTCO nutzt die Schnittstelle ohne Anfrage bei Swiss Tennis. Sie liefert Daten, die mytennis.ch jedem Besucher ohne Login zeigt; es gehen nur Vereinsnummer und Team-Nummern hinaus, keine Personendaten.

## Konsequenzen

- Swiss Tennis kann die Schnittstelle jederzeit ändern oder sperren. Dann fällt nur der Bereich Interclub weg; die App zeigt den letzten Stand.
- Nur der Server fragt ab, nie der Browser (DS-03). Eine Kopie in der Datenbank trägt die Anzeige.
- Der Abruf prüft die Form der Antwort, bevor er speichert; eine veränderte Form lässt den alten Stand stehen.
- Wenig Last: nur die Teams des Vereins, mit Pausen zwischen den Abfragen.
- Logs enthalten nur feste Texte.
- Kosten: keine laufenden.

## Reevaluations-Trigger

Swiss Tennis sperrt die Schnittstelle oder ändert ihre Form dauerhaft, oder Swiss Tennis veröffentlicht eine offizielle Schnittstelle oder äussert sich zur Nutzung.
