# Interclub: regelmässiger Abruf (#81, Teil 3a)

Stand 22.11.2026 · Issue [#81](https://github.com/konstantinniedermann/tco-app/issues/81) ·
baut auf Teil 1 (Ansicht, 0.21.0) und Teil 2 (Einzelpartien, 0.22.0) auf.

## Absicht

Die Interclub-Resultate der TCO-Teams sollen in MyTCO von selbst aktuell sein, ohne dass jemand
`make ic-import` von Hand startet. Mitglieder sollen die App auch ausserhalb der CM öffnen, weil
dort die Resultate vom Wochenende stehen. Ziel ist der Saisonstart im Mai 2027. Heute steht der
Import-Befehl nicht im Image, deshalb sind die Daten auf Test nach jedem Neu-Aufsetzen weg.

## Ziele

1. Ein Abruf läuft regelmässig im Zeitgeber der App: jede Stunde, solange die laufende Saison
   nicht abgeschlossen ist, sonst einmal am Tag.
2. Er holt nur, was neu ist: Ein Spielbericht, der schon gespeichert ist, wird nicht noch einmal
   geholt.
3. Er holt fehlende Saisons ab 2021 einmal nach. Damit hat auch ein frisch aufgesetztes Test die
   Saisons 2021–2026 (erste Hälfte von «Teil 4»).
4. Jede Abfrage hat eine Zeitgrenze. Bei Störung oder veränderter Form bleibt der alte Stand
   stehen (wie heute), und das Log enthält nur einen festen Text.
5. Die Hinweise vom 21.11.2026 zu Übersicht und Begegnung (Kommentar in #81) werden behoben,
   soweit sie unten stehen.

## Nicht-Ziele

- **Teams folgen und Push** kommen in die nächste Session, mit Entwurf (Entscheid PL 22.11.2026).
- Saisonwahl in der Ansicht (zweite Hälfte von «Teil 4»): Die Ansicht zeigt weiter nur die
  neueste Saison.
- Rangliste bei 320 px, Bedeutung des «*», Form offener Begegnungen 2027 (Hinweise 3–5): bleiben
  im Issue. Hinweis 5 lässt sich erst prüfen, wenn Swiss Tennis den Spielplan 2027 freigibt.
- Link auf die Seite einer offenen Begegnung (Hinweis 1, «am Rand»): bleibt.

## Anti-Ziele

- Der Abruf läuft nie lokal oder im E2E von selbst: Echte Spielernamen in der Entwicklungs-
  Datenbank oder auf Screenshots verletzen DS-08.
- Keine Last auf Swiss Tennis über das Nötige hinaus: keine Abfrage in der Nacht ohne Grund, keine
  Wiederholung im Sekundentakt nach einer Störung.
- Kein Fehler im Abruf darf die App stören, eine Anfrage bremsen oder den Löschlauf verhindern.

## Vorgaben

- Bauregeln der `CLAUDE.md`: Zeit über `jetzt`, `holen` über die Dienste hineingereicht (kein
  `fetch(…)` unter `src/`), Dienste entstehen nur in `src/lib/server/dienste.ts`, Logs nur mit
  festen Texten, Migrationen fügen nur hinzu.
- ADR-008 (Zeitgeber in der App) und ADR-011 (Schnittstelle von Swiss Tennis, wenig Last, Pausen
  zwischen Abfragen, Form prüfen).
- Datenschutz: DS-03 (nur der Server fragt ab), DS-06 (Logs ohne Resultate), DS-08 (siehe unten).

## Ansätze

| Ansatz | Dafür | Dagegen |
|--------|-------|---------|
| **A: Zeitgeber in der App** (gewählt) | kein neuer Dienst, keine Kosten; Regeln und Tests im selben Code; holt nach dem Start auch auf Test fehlende Saisons | läuft nur, solange die App läuft (der nächste Start holt es nach) |
| B: systemd-Timer auf dem Server ruft den Import-Befehl im Container | unabhängig vom Prozess der App | zweiter Ort für Betrieb und Doku; Befehl müsste ins Image; lokal und im Test nicht von selbst prüfbar |
| C: geplanter Lauf auf GitHub | — | käme nicht an die Datenbank, ohne sie nach aussen zu öffnen |

Entscheid PL 22.11.2026: **A**. Kosten: keine laufenden, alles auf dem bezahlten VPS.

## Entscheide des Projektleiters (22.11.2026)

1. Umfang: zuerst nur der Abruf, «Teams folgen» und Push danach.
2. Weg: Zeitgeber in der App (A).
3. Test holt dieselben echten Daten wie Live, auch die Spielberichte mit Namen. DS-08 wird
   präzisiert: Auf Test, hinter dem Test-Passwort, stehen die echten Interclub-Daten, wie auf
   mytennis.ch öffentlich. Screenshots fürs Repo und für Issues zeigen nur Teams, Endstände und
   Tabellen, nie Einzelpartien mit Namen.

## Wie es arbeitet

### Einschalten

- Der Abruf läuft nur, wenn die Umgebung ihn einschaltet: `IC_ABRUF=an`. Ohne diesen Wert ist er
  aus. Das gilt lokal (`make dev`, `make dev-handy`), im E2E und in jedem Test.
- `betrieb/compose.umgebung.yml` setzt `IC_ABRUF=an` für Test und Live. `ZEITGEBER=aus` schaltet
  weiterhin alle Zeitgeber ab.
- Die Vereinsnummer kommt wie beim Skript aus `IC_VEREIN`, Vorgabe 2202.

### Takt

- Ein eigener Takt neben dem Löschlauf: erster Schlag kurz nach dem Start, danach jede Stunde.
  Heute erlaubt `starteZeitgeber` nur einen Takt (ein Merker auf `globalThis`). Er wird so
  erweitert, dass je Name ein Takt läuft, und der Löschlauf bleibt unverändert.
- **Alles gilt je Saison und Wettbewerb** (`ic`, `jic`), nie für die Saison als Ganzes: `ic` kann
  laufen, während `jic` noch nicht freigeschaltet ist (meine Wahl).
- **Jeder Versuch wird gemerkt**, in der Datenbank, nicht im Speicher: je Saison und Wettbewerb
  Zeitpunkt des letzten Versuchs und sein Ergebnis-Wort (`ok`, `keine-teams`, `form`,
  `stoerung`). `ic_stand` schreibt heute nur bei `ok`; dafür kommt eine neue Tabelle (neue
  Migration). So löst ein Neustart keinen Lauf aus, der eben erst lief (meine Wahl).
- Bei jedem Schlag entscheidet eine reine Funktion `istFaellig` (testbar ohne Uhr), welche Paare
  aus Saison und Wettbewerb jetzt dran sind. **Laufende Saison** = Kalenderjahr von `jetzt` in
  Zürich.
  - **Stündlich:** die laufende Saison eines Wettbewerbs, solange eines ihrer eigenen Spiele
    «frisch» ist: Datum von heute bis 7 Tage zurück, und noch ohne Resultat oder ohne
    Spielbericht. Damit läuft der Stundenlauf nur in Spielwochen und hört von selbst auf, auch
    wenn ein Resultat nie kommt (meine Wahl; ersetzt «abgeschlossen» als Bedingung).
  - **Täglich** (letzter Versuch dieses Paars mindestens 24 h her): die laufende Saison in jedem
    anderen Fall, also noch nicht freigeschaltet, ruhige Woche oder Saison vorbei. So merkt der
    Abruf, wann Swiss Tennis den neuen Spielplan freigibt.
  - **Nachholen**, höchstens ein Paar pro Tag: siehe *Fehlende Saisons*.
- In der Nacht (23–7 Uhr Zürich) läuft nichts.

### Nur Neues holen

- Der Abruf je Saison und Wettbewerb holt wie heute `club-teams` und je Team `team-results`.
- Spielberichte holt er nur für gespielte eigene Begegnungen, zu denen noch **kein** Bericht
  gespeichert ist. Der Stundenlauf fragt dabei nur Begegnungen der letzten 7 Tage an, der
  Tageslauf alle ohne Bericht. Ein Bericht, den Swiss Tennis erst spät bringt, kommt so noch an,
  ohne stündliche Last (meine Wahl).
- Gespeicherte Berichte bleiben samt Partien und Spielern erhalten, wenn der Stand in der
  Transaktion ersetzt wird.
- `make ic-import JAHR=…` bleibt die volle Neuladung, die alle Berichte neu holt. Sie läuft nur
  lokal, das Skript kommt nicht ins Image: Eine Korrektur, die Swiss Tennis an einem schon
  gespeicherten Bericht macht, kommt auf Test und Live nicht an. Der Fall ist selten; zurück aufs
  Tapet, wenn er vorkommt (meine Wahl).

### Fehlende Saisons

- Paare aus Saison (2021 bis Vorjahr) und Wettbewerb, für die noch kein Abruf mit `ok` gelungen
  ist, holt der Abruf nach: **höchstens ein Paar pro Tag**. Eine volle Saison sind etwa 50
  Abfragen je Wettbewerb.
- Reihenfolge: zuerst die nie versuchten Paare, die älteste Saison zuerst, danach das mit dem
  ältesten Versuch. Eine Saison, die immer wieder `form` oder `stoerung` gibt, blockiert so die
  anderen nicht, sie kommt einfach später wieder dran (meine Wahl).
- `keine-teams` für eine alte Saison ist endgültig: Das Paar wird nicht wieder versucht.

### Zeitgrenze und Störungen

- Jede Abfrage bricht nach 15 Sekunden ab (`holen(url, { signal })`); ein Abbruch gilt wie heute
  als `stoerung`.
- Bei `stoerung` oder `form` bleibt der alte Stand; der nächste Schlag versucht es wieder.
- Läuft noch ein Abruf, startet der nächste Schlag keinen zweiten. Ein Sperrschloss der
  Datenbank verhindert, dass Zeitgeber und `make ic-import` gleichzeitig schreiben.
- Log je Lauf nur fester Text, z. B. «Interclub-Abruf gestört» oder «Interclub-Abruf: Form
  unerwartet», nie URL, Team, Resultat oder Meldungstext.

### Hinweise vom 21.11.2026, die mitkommen

1. **Begegnung, «fehlt noch» und «fehlt dauerhaft»:** Liegt eine gespielte Begegnung ohne Bericht
   mehr als 7 Tage zurück, sagt die Seite, dass Swiss Tennis keine Einzelpartien hat. Sonst
   bleibt «Einzelpartien noch nicht da».
2. **Leertext «Nicht gespielt …»** erscheint nur im Reiter *Doppel*.
3. **Doppelte Position** im selben Bericht: `pruefeBericht` weist sie als `form` ab, statt dass
   der Schlüssel in der Transaktion als `stoerung` scheitert.
4. **Vergangenes Spiel ohne Resultat:** Es erscheint in «Letzte Resultate» mit «Resultat folgt»
   (bis 6 Tage zurück, wie die übrigen) und macht die Pausen-Karte nicht falsch.
5. **Zwei TCO-Teams gegeneinander:** Die Begegnung steht in «Letzte Resultate» nur einmal
   (zusammengefasst nach `begegnungId`).
6. **Zeitgrenze des Abrufs**, siehe oben.

## Doku, die mitkommt

- `docs/datenschutz.md`: DS-08 präzisiert (Test mit echten Interclub-Daten), Änderungsprotokoll.
- ADR-008: Nachtrag, dass der Zeitgeber zwei Takte trägt (Löschlauf, Interclub-Abruf).
  ADR-011: Takt und «nur Neues» unter Konsequenzen.
- arc42 Laufzeitsicht bzw. Verteilung: Abruf im Zeitgeber, Schalter `IC_ABRUF`.
- `betrieb/README.md` bzw. `docs/betrieb-und-uebergabe.md`: Test holt die Saisons selbst, nach
  dem Neu-Aufsetzen dauert das einige Tage (eine alte Saison pro Tag).
- Testkonzept / Release-Checkliste: auf Test prüfen, dass der Abruf läuft («Stand: …» jünger als
  ein Tag).
- `docs/versionen.md` unter «Unveröffentlicht».

## Nachweis

- Einheitstests: `istFaellig` für alle Fälle (Spielwoche, ruhige Woche, Nacht, noch nicht
  freigeschaltet, nur `ic` läuft, Nachholen mit Reihenfolge und Blockade-Fall, Neustart kurz nach
  einem Versuch), Zeitgrenze mit einer `holen`-Attrappe, die nicht antwortet.
- DB-Tests gegen die echte Datenbank: Zweiter Abruf holt keinen gespeicherten Bericht neu und
  lässt ihn stehen; neue Begegnung bekommt ihren Bericht; fehlende Saison wird geholt; doppelte
  Position gibt `form`; Übersicht mit vergangenem Spiel ohne Resultat und mit zwei TCO-Teams
  gegeneinander.
- E2E: Begegnung «keine Einzelpartien» und «Resultat folgt» in der Übersicht, auf den drei
  Geräten.
- Auf Test nach dem Ausliefern: Saisons kommen ohne Handgriff zurück; Screenshot der Übersicht
  (nur Teams und Endstände). Neue Resultate aus dem echten Spielbetrieb lassen sich erst ab dem
  Frühling 2027 zeigen.

## Dem Bauenden überlassen

- Ob `istFaellig` und der Lauf in `interclub/import.ts` oder in einer neuen Datei `abruf.ts` des
  Themas stehen; wie der Merker je Takt heisst.
- Name und Spalten der neuen Tabelle für die Versuche; ob das Sperrschloss wartet oder
  überspringt; Länge der Pausen zwischen Abfragen (heute 1,5 s).
- Die genaue Formulierung der Leer- und Hinweistexte, nach `docs/ui-leitbild.md`.
