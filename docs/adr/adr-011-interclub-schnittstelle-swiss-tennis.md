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
- Seit Teil 2 gehen auch Begegnungsnummern hinaus, und es kommen Personendaten herein: die Spieler der Einzelpartien beider Teams, auch Nicht-Mitglieder ([Datenschutzkonzept](../datenschutz.md)).
- Seit Teil 3a (22.11.2026) holt der Zeitgeber der App ([ADR-008](adr-008-zeitgeber-in-der-app.md)) selbst: stündlich, solange ein eigenes Spiel der letzten 7 Tage noch ohne Resultat oder Bericht ist, sonst einmal am Tag, nachts (23–7 Uhr) nie. Gespeicherte Spielberichte holt er nicht noch einmal; fehlende Saisons ab 2021 holt er nach, höchstens eine Saison und einen Wettbewerb pro Tag. Jede Abfrage bricht nach 15 Sekunden ab. Nur mit `IC_ABRUF=an` (Test, Live). `make ic-import` bleibt die volle Neuladung, nur lokal. Folge: Korrigiert Swiss Tennis einen schon gespeicherten Spielbericht, kommt die Korrektur auf Test und Live nicht an; liefert Swiss Tennis für einen gespeicherten Bericht nichts mehr, bleibt er stehen.
- Melden nach dem Abruf (Teil 3b, 23.11.2026): Nach jedem Abruf läuft ein eigener Schritt im selben Takt und hinter demselben Schalter `IC_ABRUF=an`. Er nimmt nur Begegnungen der laufenden Saison mit Datum der letzten 7 Tage, beiden Punkten und gespeichertem Spielbericht, an denen ein TCO-Team beteiligt ist; ohne Spielbericht gilt ein Endstand nicht als fertig (lieber etwa eine Stunde später als ein falscher Zwischenstand). Jede solche Begegnung kommt zuerst in die Liste *gemeldet*, auch ohne Folgende, erst dann geht der Push: je Konto und Lauf einer mit allen neuen Endständen seiner gefolgten Teams. Nur Push, keine E-Mail; scheitert der Versand, gibt es keinen zweiten Versuch und nie einen zweiten Push für dieselbe Begegnung. Ältere Begegnungen und andere Saisons zählen nie, darum bringen Neustart, Neu-Aufsetzen und Nachholen keine Flut.
- Kosten: keine laufenden.

## Reevaluations-Trigger

Swiss Tennis sperrt die Schnittstelle oder ändert ihre Form dauerhaft, oder Swiss Tennis veröffentlicht eine offizielle Schnittstelle oder äussert sich zur Nutzung.
