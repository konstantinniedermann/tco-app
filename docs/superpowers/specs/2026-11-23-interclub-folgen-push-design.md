[← Übersicht](../../index.md)

# Interclub: Teams folgen und Push nach neuem Endstand (#81, Teil 3b)

Stand 23.11.2026. Grundlage: Issue #81 (Lösungsrichtung «Push, freiwillig»), Teil 3a
([Interclub-Abruf](2026-11-22-interclub-abruf-design.md)), Push-Grundlage FR-40/FR-41.

## Absicht

Ein Mitglied wählt die Interclub-Teams des TCO, die es verfolgen will, und bekommt nach einem
Spiel einen kurzen Push mit dem Endstand, z. B. «2L Herren 1: Olten 1 – Villmergen 8:1». So
erfährt es ohne Nachschauen, wie es gelaufen ist, und die App wird auch ausserhalb der
Clubmeisterschaft nützlich. Ziel: bereit zum Start der Interclub-Saison im Mai 2027.

## Ziele

- Folgen ist freiwillig; am Anfang folgt niemand einem Team.
- Push kommt, sobald der regelmässige Abruf einen **neuen Endstand** eines gefolgten Teams findet
  (Gruppenspiele und Auf-/Abstiegsspiele).
- Jeder Endstand wird höchstens einmal gemeldet, auch nach Neustart, Neu-Aufsetzen von Test oder
  Nachholen alter Saisons.
- Folgen überdauert die Saison: Die Team-Nummer von Swiss Tennis bleibt über die Jahre gleich,
  auch bei Auf- und Abstieg (auf Test geprüft: Team 7395 war 2021 «35+ 1L Herren», 2026 «35+ NLA
  Herren»).

## Nicht-Ziele

- Keine E-Mail, auch nicht als Ersatz für fehlenden Push.
- Kein Push zu einzelnen Partien, Spielplan-Änderungen, Tabellenständen oder Saisonbeginn.
- Kein zweiter Push, wenn Swiss Tennis einen Endstand später korrigiert.
- Kein Folgen von fremden Teams oder einzelnen Spielern.
- Keine Saisonwahl in der Ansicht (zweite Hälfte von Teil 4, eigenes Thema).

## Anti-Ziele

- Keine Push-Lawine: nicht ein Push je Team, wenn ein Abruf mehrere Endstände bringt; keine Flut
  alter Resultate nach einem Neustart oder beim Nachholen.
- Keine Spielernamen im Push (DS-05, DS-08), auch nicht bei Junioren.
- Der eben fertige Abruf (Teil 3a) wird nicht verflochten: Scheitert das Melden, bleibt der Import
  gültig, und umgekehrt.

## Vorgaben

- Bauregeln aus `CLAUDE.md` (Route ruft eine Schnittstellen-Funktion, Rechte über `liest`/
  `schreibt` bzw. die Mitglieder-Listen, Fachfunktionen ohne HTTP, Zeit über `jetzt`, Logs nur
  feste Texte, Migrationen nur hinzufügen).
- Datenschutz vor dem Code: «gefolgte Teams» sind neue Daten zum Mitglied (siehe unten).
- Oberfläche nur aus Tokens und Bausteinen von `docs/ui-leitbild.md`; der Entwurf steht im
  Design-Artifact «MyTCO Interclub» (neue Reihe «Folgen und Push»).
- Push nur mit `IC_ABRUF=an` (Test, Live), weil nur dort der Abruf läuft. Lokal, im E2E und im
  Rauchtest wird das Melden direkt als Fachfunktion aufgerufen.

## Ansätze

Wie merkt der Server, welcher Endstand neu ist?

1. **Eigene Liste «schon gemeldet»** — gewählt. Nach jedem Abruf sucht ein eigener Schritt die
   Endstände der laufenden Saison aus den letzten 7 Tagen, die noch nicht in der Liste stehen,
   schickt die Pushes und trägt sie ein. Vom Import getrennt; robust gegen Neustart, Neu-Aufsetzen
   und Nachholen; kein doppelter Push. Kosten: eine kleine Tabelle.
2. **Vergleich im Import** — verworfen. Keine neue Tabelle, aber der Import aus Teil 3a wird
   verflochten, eine Meldung geht verloren, wenn der Versand scheitert, und der erste Import einer
   Saison bräuchte eine Sonderregel.
3. **Vermerk «gemeldet am» an der Begegnung** — verworfen. Der Import ersetzt die Zeilen einer
   Saison ganz; der Vermerk ginge verloren, und es käme ein zweiter Push.

## Entscheide des Projektleiters (23.11.2026)

- Nur Push. Wer auf keinem Gerät Push hat, sieht statt des Schalters einen Hinweis.
- Folgen auf der Seite eines Teams (Schalter zuoberst) **und** im Profil (Liste zum Abwählen).
- Bauweise: Ansatz 1, eigene Liste «schon gemeldet».
- Ein Endstand gilt erst als fertig, wenn auch der Spielbericht da ist: lieber bis etwa eine
  Stunde später als ein falscher Zwischenstand, der nie korrigiert würde. Ob Swiss Tennis
  Zwischenstände zeigt, lässt sich erst im Mai 2027 an echten Spielen prüfen (zusammen mit
  Hinweis 5 aus #81, «Form 2027 im Frühling prüfen»).

## Wie es arbeitet

### Daten

- **`ic_folgen`** (`konto_id`, `team_id`, `seit`): Schlüssel aus beiden; `team_id` ist die
  Team-Nummer von Swiss Tennis, ohne Saison und ohne Fremdschlüssel auf `ic_team` (das Team einer
  neuen Saison gibt es erst nach deren Import). Löschen mit dem Konto (Fremdschlüssel mit
  `on delete cascade`).
- **`ic_gemeldet`** (`saison`, `begegnung_id`, `gemeldet_am`): Schlüssel `saison` +
  `begegnung_id`. Eine Begegnung zweier TCO-Teams steht so nur einmal. Hängt an keinem Konto.
  Gruppen- und Auf-/Abstiegsspiele teilen sich den Schlüssel wie schon in `ic_bericht`; ihre
  Nummernkreise liegen bei Swiss Tennis weit auseinander (Entscheid des Bauenden nach der
  Prüfung).
- Je eine neue Migration; nichts an bestehenden Tabellen.

### Melden nach dem Abruf

Neue Fachfunktion (z. B. `interclub/melden.ts`), die der Zeitgeber direkt nach `fuehreAbrufAus`
aufruft, im selben Takt und hinter demselben Schalter `IC_ABRUF=an`. Sie bekommt Datenbank,
Push-Versender, Adresse der App und `jetzt` hineingereicht und gibt ein Ergebnis-Wort zurück.

1. **Kandidaten:** alle Begegnungen der laufenden Saison (Gruppenspiele aus `ic_begegnung`,
   Auf-/Abstiegsspiele aus `ic_entscheid`) mit Datum von heute bis 7 Tage zurück, mit beiden
   Punkten gesetzt **und mit gespeichertem Spielbericht** (`ic_bericht`), an denen ein TCO-Team
   beteiligt ist, und die nicht in `ic_gemeldet` stehen. Eine Begegnung, deren Bericht dauerhaft
   fehlt, wird nie gemeldet.
   Älteres und andere Saisons zählen nie — das verhindert die Flut nach Neustart, Neu-Aufsetzen
   und Nachholen.
2. **Eintragen:** Alle Kandidaten kommen in `ic_gemeldet`, auch die, denen niemand folgt. Sonst
   bekäme, wer später in der Woche folgt, ein altes Resultat. Eintragen und Versand: erst
   eintragen, dann senden. Scheitert der Versand, gibt es keinen zweiten Versuch (lieber ein
   verpasster Push als zwei).
3. **Empfänger:** je Konto, das mindestens einem betroffenen Team folgt, aktiv, nicht gesperrt,
   mit mindestens einem Push-Abo. Ohne Abo: nichts (keine Mail).
4. **Ein Push je Konto und Lauf:** alle Endstände des Laufs, die dieses Konto betreffen, in
   **einer** Nachricht. Folgt jemand beiden TCO-Teams einer Begegnung, steht sie einmal darin.
5. **Text:** Titel «Interclub». Je Endstand eine Zeile `<Liga>: <Heim> – <Gast> <H>:<G>`, z. B.
   «2L Herren 1: Olten 1 – Villmergen 8:1»; die Liga ist die des gefolgten Teams (bei TCO gegen
   TCO die des ersten in der Reihenfolge der Übersicht). Teamnamen wie bei Swiss Tennis. Keine
   Spielernamen.
6. **Link:** ein Endstand → Seite der Begegnung; mehrere → Übersicht Interclub.
7. Der Versand nutzt die bestehenden Bausteine (`sendePush`, Abos je Konto, ungültige Abos weg).
   Die Funktion wirft nie und loggt nur feste Texte (DS-06).

### Folgen und Entfolgen

- Zwei Schnittstellen in der Liste der Mitglieder (`tests/hilfen/mitglieder-listen.ts`):
  «folgen» und «nicht mehr folgen» für ein Team, nur JSON, nur das eigene Konto. Die Teamseite
  lädt mit dem Team, ob das Konto folgt und ob es irgendwo Push hat.
- Folgen nur für ein Team, das es in `ic_team` gibt (irgendeine Saison); sonst Fehlerwort aus
  `src/lib/fehler.ts`. Der Server weist Folgen ab, wenn das Konto kein Push-Abo hat
  («Ausblenden ist kein Schutz»). Entfolgen geht immer, auch ohne Abo.
- Push-Abos hängen an der Sitzung und verschwinden mit ihr. Ein Konto kann darum einem Team
  folgen und trotzdem kein Abo mehr haben; die Wahl bleibt, Pushes gibt es bis zum nächsten Abo
  keine.
- Das Profil lädt die gefolgten Teams mit dem Stand der Benachrichtigungen.

### Oberfläche (Entwurf: Design-Artifact «MyTCO Interclub», Reihe «Folgen und Push»)

- **Seite eines Teams:** zuoberst, unter Liga und Teamzeile, vor dem Umschalter, eine Auswahlfläche
  als Schalter wie im Profil: «Diesem Team folgen» mit Hilfetext «Push nach jedem Endstand». Gilt
  sofort, ohne Speichern. Den Schalter gibt es, wenn das Konto auf irgendeinem Gerät Push hat
  **oder** dem Team schon folgt (damit man immer entfolgen kann). Sonst statt des Schalters: «Mit
  Push kannst du diesem Team folgen.» und ein Link zu den Benachrichtigungen im Profil.
- **Profil › Benachrichtigungen:** neue Gruppe «Interclub-Teams» unter den Themen: je gefolgtes
  Team der laufenden (sonst letzten) Saison ein Schalter mit Liga als Beschriftung. Folgt das Konto
  keinem Team: «Du folgst keinem Team. Folgen kannst du auf der Seite eines Teams unter IC.»
  Ein Team, das es in dieser Saison nicht mehr gibt, erscheint nicht; die Wahl bleibt im
  Hintergrund und schadet nicht. Die Liste steht auch ohne Push da, dann mit dem Satz «Ohne Push
  bekommst du keine Mitteilung.» Der Satz «Gilt für Push und E-Mail» bezieht sich weiter nur auf
  die Themen.
- **Push** auf dem Gerät: Titel «Interclub», Zeilen wie oben.

## Datenschutz (vor dem Code nachzuführen)

- `docs/datenschutz.md`, *Welche Daten*: «Gefolgte Interclub-Teams (Team-Nummer von Swiss Tennis,
  seit wann)» bei Konto und Benachrichtigungs-Einstellungen; Zweck «Push nach neuem Endstand»;
  freiwillig. `ic_gemeldet` enthält keine Personendaten.
- *Wer sieht was:* nur das Mitglied selbst; Auskunft (DS-07) zeigt die gefolgten Teams wie die
  Themen.
- *Löschen:* mit dem Konto. Beim Austritt bleiben sie wie die Themen stehen; Push gibt es dann
  ohnehin nicht mehr (Abos weg).
- `docs/datenschutzerklaerung.md`, Abschnitt Mitteilungen: Folgst du Interclub-Teams, bekommst du
  nach jedem neuen Endstand einen Push; MyTCO speichert dafür, welchen Teams du folgst.
- DS-05 bleibt erfüllt: der Push nennt Teams und Endstand, keine Personen.

## Doku, die mitkommt

- A-INTERCLUB-01 bzw. neue Anforderung für Folgen und Push in `docs/anforderungen/anforderungen.md`
  (mit Änderungsprotokoll), Fachmodell (Folgen, Gemeldet), Glossar («folgen»), ADR-011 (Melden
  nach dem Abruf), UI-Leitbild (Schalter auf der Teamseite, falls ein neuer Baustein nötig ist),
  `docs/versionen.md` unter «Unveröffentlicht».

## Nachweis

- DB-Tests gegen die echte Datenbank: Kandidaten (7 Tage, laufende Saison, beide Punkte, nur
  mit Spielbericht, nur TCO), einmal melden auch bei zweitem Lauf, Neu-Aufsetzen/Nachholen ohne Push, ein Push je Konto
  mit mehreren Zeilen, TCO gegen TCO einmal, ohne Abo nichts, gesperrt/ausgetreten nichts, Text
  ohne Spielernamen, Link einer bzw. mehrerer Endstände. Push-Versand als Attrappe.
- Schnittstellen: folgen/entfolgen nur eigenes Konto, Folgen ohne Abo abgewiesen, Entfolgen ohne
  Abo erlaubt, unbekanntes Team abgewiesen, nur JSON.
- E2E (iPhone, Android, Desktop): Schalter auf der Teamseite folgt und entfolgt, Liste im Profil
  zeigt und entfernt, Hinweis ohne Push, Schalter ohne Push, wenn schon gefolgt.
- Echter Push lokal nachgewiesen (Playwright mit Chrome, `getNotifications()` als Beleg), wie
  in der Definition of Done von #81 verlangt.

## Dem Bauenden überlassen

- Namen der Dateien, Funktionen, Fehlerwörter und Testhilfen.
- Ob «Melden» in derselben Zeitgeber-Art läuft wie der Abruf oder als zweiter Schritt im selben
  Lauf (Hauptsache: direkt danach, gleicher Schalter, kein eigener Takt).
- Reihenfolge der Zeilen im Push (Vorschlag: wie die Übersicht «Resultate»).
