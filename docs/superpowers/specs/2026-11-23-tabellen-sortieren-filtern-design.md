# Sortieren, Filtern und Spaltenbreite in langen Tabellen der Verwaltung — Design (#92)

## Absicht

Der Projektleiter und die Mitglieder-Admins arbeiten am PC mit langen Listen. Heute gibt es in der
Mitgliederliste nur eine Suche und den Filter «Status» über der Tabelle; lange Texte enden mit „…".
Sie sollen am PC (Entscheid PL):

- **Gruppen herausfiltern** (z. B. alle mit «Brief offen», alle CM-Admins, Jahrgang 2008–2014),
- **die Reihenfolge ändern** (nach Nummer, Jahrgang, Konto … sortieren, um Lücken, Doppelte oder
  den Abgleich mit Fairgate zu sehen),
- **Abgeschnittenes lesen**, indem sie eine Spalte breiter ziehen.

Ein «Gefühl wie Excel» ist ausdrücklich kein Ziel.

## Ziele

1. Neuer Baustein **Tabellen-Steuerung** im UI-Leitbild, eingebaut in drei Seiten der Verwaltung:
   *Mitglieder*, *Briefe*, *Änderungsverlauf* (Entscheid PL).
2. **Sortieren** über jeden Spaltentitel (Vorschlag Claude): erster Klick aufsteigend, zweiter
   absteigend, ein Pfeil zeigt die Richtung, `aria-sort` am `<th>`. Ohne Wahl gilt die heutige
   Reihenfolge (Mitglieder und Briefe: Name; Verlauf: neueste zuerst). Die Aktionsspalte und die
   Häkchen-Spalte sind nicht sortierbar.
3. **Filtern im Spaltentitel**:
   - Mitglieder (Entscheid PL): *Rollen* (Häkchen je Rolle, Treffer = hat eine der gewählten),
     *Konto* (Häkchen je Zustand der Plakette: aktiv, Brief offen, ohne Brief, gesperrt,
     ausgetreten, wird gelöscht), *Jahrgang* (von–bis), *Nummer*, *Name*, *E-Mail* (je ein
     Textfeld, enthält, ohne Gross/Klein).
   - Briefe (Vorschlag Claude, Jahrgang Entscheid PL): neue Spalte *Jahrgang* zwischen Nummer und
     Brief (der Server liefert ihn in der Briefliste mit; beide Rollen, die die Liste sehen, sehen
     den Jahrgang schon in der Mitgliederliste). Filter: *Name*, *Nummer* (Text), *Jahrgang*
     (von–bis), *Brief* (Häkchen je Zustand: Code gültig, Code abgelaufen, noch kein Brief,
     Adresse fehlt).
   - Verlauf (Vorschlag Claude): *Zeit* (Datum von–bis, Zürcher Kalendertag), *Wer* (Text über
     Nach- und Vorname des Urhebers; «MyTCO» trifft die automatischen Einträge; «gelöschtes Konto»
     und «(selbst)» sind nicht eigens filterbar), *Mitglied* (Text über Nach- und Vorname), *Was*
     (Häkchen je Wert von `aktion`, also 13, beschriftet wie der Anfang des Textes in der Spalte:
     «Angabe geändert», «Rolle vergeben» …; ohne Unterscheidung nach `detail`).
   - Ein aktiver Filter ist am Spaltentitel markiert; «Filter zurücksetzen» leert alle Filter der
     Tabelle. Die Anzahl über der Tabelle sagt dann «23 von 412 Mitgliedern» (Vorschlag Claude).
4. **Spaltenbreite ziehen** (Entscheid PL): Rand eines Spaltentitels ziehen, je Spalte mit Mindest-
   und Höchstbreite. Wird die Tabelle breiter als ihr Platz, **scrollt sie in ihrer Box zur Seite**
   (Entscheid PL). Mit der Tastatur: Griff fokussierbar, Pfeil links/rechts ändert die Breite
   (`role="separator"`, `aria-orientation="vertical"`, `aria-valuenow/min/max`).
5. **Merken** (Entscheid PL): Sortierung, Häkchen-Filter (Rollen, Konto, Brief, Was) und
   Zahlen-Filter (Jahrgang, Zeit) stehen in der Adresse der Seite (Query); Zurück, Neuladen und
   Lesezeichen zeigen dieselbe Ansicht. **Textfilter und Suche nie in der Adresse** (Entscheid PL,
   Datenschutz): Sie bleiben nur im Tab (SvelteKit-`snapshot`, also Sitzungsspeicher des Tabs),
   überstehen «Zurück» aus der Detailseite, nicht aber Lesezeichen oder ein neues Fenster. Die Breiten
   bleiben pro Gerät gespeichert (Vorschlag Claude, Gerätespeicher je Tabelle); eine Taste
   «Breiten zurücksetzen» stellt die Standardbreiten her.
6. **Handy unverändert** (unter `60rem`): keine Sortiertasten, keine Filter im Titel, kein Ziehen.
   Mitglieder behalten Suche und Filter «Status» über der Tabelle wie heute; Briefe und Verlauf
   bleiben, wie sie sind. Ein Filter aus der Adresse (z. B. Lesezeichen vom PC) wirkt auch auf dem
   Handy, ist dort aber nur über «Filter zurücksetzen» über der Tabelle aufhebbar (Vorschlag Claude).

## Nicht-Ziele

- Keine anderen Tabellen (Fairgate, Anmeldungen, Posteingang, Mitteilungen …). Der Baustein ist
  im Leitbild allgemein beschrieben und kann später dazukommen.
- Kein Ausblenden oder Umsortieren von Spalten, kein Export, keine gespeicherten Ansichten mit Namen.
- Keine neue Abhängigkeit (keine Tabellen-Bibliothek).

## Rahmen

- **Leitbild zuerst:** Der Baustein *Tabelle* erlaubt ab `60rem` bisher kein seitliches Scrollen
  ausser Fairgate, und die lange Liste (`.tabelle-lang`) ist kein eigener Scrollbereich. Das
  ändert sich für Tabellen mit Steuerung: Die Box ist so hoch wie der Platz unter dem Seitenkopf
  (`100dvh` minus `--hoehe-seitenkopf` und was über der Tabelle steht, Vorschlag Claude), scrollt in
  beide Richtungen, die Spaltentitel kleben oben in der Box. Grund: Sobald die Box seitlich
  scrollt, kleben Titel nicht mehr am Seitenrand. Die Aktionsspalte («Bearbeiten») klebt rechts,
  die Häkchen-Spalte der Briefe links, damit sie nie aus dem Bild rutschen. Was nicht passt, endet
  weiter mit „…" und `title`; die Breiten der Spalten mit freiem Text gelten als Startbreite.
- **Bauregeln:** Stile nur unter `src/lib/design/`, Bausteine ohne `<style>`. Seiten holen Daten
  nur über ihre Abruf-Module. Erstes Laden in `+page.ts`.
- **Mitglieder und Briefe filtern und sortieren im Browser:** Der Server schickt dort schon die
  ganze Liste (alle Mitglieder ausser gelöschten bzw. alle Briefe). Die Suche der Mitglieder
  bleibt eine Anfrage an den Server wie heute; Filter und Sortierung wirken auf deren Treffer. Der
  Kontofilter ersetzt am PC den Filter «Status» (dort ausgeblendet); auf dem Handy setzt der
  Filter «Status» dieselben Werte (aktiv = aktiv, Brief offen, ohne Brief, gesperrt).
- **Briefe – Auswahl:** «Alle wählen» wählt nur die Zeilen, die der Filter zeigt. Ein
  ausgeblendetes Mitglied zählt nicht zur Auswahl (wie heute bei Mitgliedern, die aus der Liste
  fallen), damit nie Briefe an Unsichtbare gehen (Vorschlag Claude).
- **Verlauf filtert auf dem Server** (Entscheid PL): Der Verlauf zeigt nur die neuesten 100
  Einträge, ein Filter im Browser fände ältere Treffer nicht. `+page.ts` liest die Filter aus der
  Adresse (Zeit, Was) und gibt sie an `ladeVerlauf`; nach einer Eingabe in *Wer* oder *Mitglied*
  lädt der Baustein neu (erlaubt: erneutes Laden nach Eingabe); `GET /api/admin/verlauf` nimmt neu `von`, `bis`, `wer`,
  `name` und `was` (mehrfach) an, zusätzlich zum bestehenden `mitglied=<id>`, und schickt die
  neuesten 100 Treffer. Falsche Werte antworten mit einem Wort aus `src/lib/fehler.ts`. Das
  Sortieren nach Spalte läuft im Browser über diese Treffer. Der Text über der Tabelle sagt
  «Die neuesten 100 Treffer» bzw. wie heute «Die letzten 100 Einträge».
- **Datenschutz:** Keine neuen Daten, alle Rollen sehen dieselben Felder wie heute. In der
  Adresse der Seite (und damit im Browserverlauf) stehen nur Sortierung, Häkchen und Zahlen, nie
  Namen, E-Mails oder Nummern. Textfilter und Suche liegen nur im Sitzungsspeicher des Tabs und
  verschwinden mit ihm. Der Verlauf schickt `wer` und `name` als Abfrage an den Server, wie die
  Suche der Mitglieder heute schon `suche`; Caddy schreibt kein Zugriffsprotokoll, die App loggt
  nur feste Texte. Im Gerätespeicher liegen nur Spaltenbreiten. Damit braucht es keinen neuen
  Eintrag in `docs/datenschutz.md`; der Merge prüft das noch einmal.
- **Tests:** Sortieren und Filtern als reines Modul mit Unit-Tests; Verlauf-Filter als
  Datenbanktest gegen die echte DB; E2E am PC (sortieren, filtern, Adresse nach Zurück, Breite
  ziehen mit Maus und Tastatur, Auswahl der Briefe mit Filter) und auf dem Handy (unverändert).
  Screenshot am PC als Nachweis, Bildvergleich mit dem Design-Entwurf.

## Wege

- **A — Eigener Baustein (gewählt):** Ein gemeinsamer Tabellenkopf-Baustein (Sortiertaste,
  Filter-Aufklapper, Ziehgriff) und ein reines Modul, das Sortieren und Filtern rechnet und den
  Stand aus der Adresse liest und dorthin schreibt. Mitglieder und Briefe filtern im Browser, der
  Verlauf über den Server. Keine neue Abhängigkeit, passt zu Leitbild und Bauregeln, gut testbar;
  Ziehgriff und Tastaturbedienung bauen wir selbst.
- B — Tabellen-Bibliothek (z. B. TanStack Table): neue Abhängigkeit mit Freigabe, Svelte-5-Fassung
  nicht stabil, Aussehen und Zugänglichkeit trotzdem selbst. Für drei Tabellen zu viel.
- C — Alles über den Server: überall gleich, aber jede Filtereingabe eine Anfrage, obwohl
  Mitglieder und Briefe schon im Browser sind; mehr Schnittstellen und Tests ohne Nutzen.

## Entwurf (gewählt)

Design-Artifact «MyTCO Tabellen sortieren und filtern»
(https://claude.ai/artifact/DEFgwhFuiWMwGmVhyjJMyt), gebaut mit den echten Stilen aus
`src/lib/design/`. Der PL hat **Variante A** gewählt (Entscheid PL), B (Filterzeile) ist verworfen:

- Spaltentitel = Sortiertaste (Titel + Pfeil; sortierte Spalte grün mit ↑/↓, die anderen mit
  leisem ↕) + Trichter-Knopf (`aria-expanded`, Name «<Spalte> filtern») + Ziehgriff (dünner Strich
  am rechten Rand, beim Zeigen und Ziehen grün).
- Trichter öffnet einen **Aufklapper**: kleine Karte unter dem Titel mit Titel «<Spalte> zeigen»,
  Häkchen als kompakte Auswahlflächen (beim Konto mit Anzahl je Zustand), von–bis oder Textfeld;
  jede Wahl wirkt sofort; unten «Alle zeigen» (Textlink) und «Schliessen» (Nebentaste). Bei vielen
  Werten (Was im Verlauf) zweispaltig. Ein aktiver Filter füllt den Trichter grün.
- Über der Tabelle eine Zeile: Anzahl («9 von 412 Mitgliedern»), je aktiver Filter ein Wort
  «Konto: Brief offen, ohne Brief ×» (× entfernt ihn), rechts «Filter zurücksetzen» und «Breiten
  zurücksetzen» als Textlinks.
- Beim Ziehen eine grüne Linie durch die Tabelle und die Breite als Zahl («E-Mail: 22 rem»).
- Klebende Spalten mit leichtem Schatten zur scrollenden Seite hin.
- Der Aufklapper darf nicht von der scrollenden Box abgeschnitten werden (z. B. `popover` in der
  obersten Ebene); den Weg wählt der Bauende.

## Ablauf

Leitbild (Baustein *Tabellen-Steuerung*, Änderung am Baustein *Tabelle*), dann Plan, dann Code.
Abnahme per Bildvergleich mit dem Entwurf.

## Dem Bauenden überlassen

- Mindest-, Höchst- und Startbreite je Spalte; Schrittweite der Pfeiltasten.
- Sortierregeln: deutsch nach `de-CH` verglichen, leere Werte immer zuletzt, Nummer und Jahrgang
  als Zahl, Konto in der Reihenfolge der Plaketten, Rollen nach ihrem Text.
- Namen der Parameter in der Adresse; ob Änderungen die Adresse ersetzen statt einen Verlaufseintrag
  anzulegen (Vorschlag: ersetzen, damit «Zurück» zur vorigen Seite führt).
- Verzögerung beim Tippen (wie die Suche heute: 200 ms).
- Aufbau des Filter-Aufklappers im Einzelnen, soweit der Design-Entwurf ihn offen lässt.

