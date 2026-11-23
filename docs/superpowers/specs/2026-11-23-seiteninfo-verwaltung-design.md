# Seiteninfo in der Verwaltung (#93) — kurzer Entwurf

## Absicht

Der Projektleiter findet sich im Menü der Verwaltung zurecht, aber auf den Seiten fehlt, wozu
sie da sind. Jede Menüseite bekommt darum unter dem Titel ein bis zwei Sätze: was man hier tut
und wofür die Seite nicht gedacht ist. Am wichtigsten ist «Briefe»: Die Mitgliederverwaltung soll
dort keinen Brief für einen verlorenen Zugang erzeugen, denn dafür holt sich das Mitglied selbst
einen Code per E-Mail.

## Ziele, Nicht-Ziele

- Ziel: 8 Menüseiten der Verwaltung (Mitglieder, Einlesen, Briefe, Anlässe, Mitteilungen,
  Für Fairgate, Änderungsverlauf, Rollen), auf PC und Handy gleich.
- Nicht-Ziel: «Clubmeisterschaft» (braucht keine) und die Unterseiten (Mitglied, Anlass, Turnier, Kategorie, Nachrichten, «Neu …»).
  Sie kommen bei Bedarf später dazu; der Baustein ist dafür gebaut.
- Anti-Ziel: ein Text, der nur das Offensichtliche sagt, oder eine Fläche, die man mit dem
  Hinweis verwechselt (ocker = vorübergehend, mit Aktion).

## Ansätze

| | Ansatz | Abwägung |
|---|---|---|
| A | leiser Satz unter dem Titel (wie heute auf 5 Seiten) | ruhig, wird aber leicht übersehen |
| **B** | **Info-Fläche: weiss, grüner Balken links, Info-Symbol, normale Schrift, ohne Aktion** | **fällt auf, ohne zu drängen; neue Fläche im Leitbild** |
| C | aufklappbar «Was mache ich hier?» | spart Platz, versteckt aber genau das, was fehlte |

Gewählt: **B** (Entwurf «MyTCO Seiteninfo», https://claude.ai/artifact/K5evK4L9ZZ13Trw1BvT9fQ).
Auf dem Handy offen, nicht zugeklappt.

## Entschieden

- Baustein **Seiteninfo** (`.seiteninfo`, Symbol `.seiteninfo-symbol`): Fläche `--farbe-flaeche`,
  Balken `--rand-akzent` in `--farbe-marke`, `--radius`, Innenabstand `--abstand-3`, Schrift
  `--groesse-klein` in `--farbe-text`, Info-Symbol (Kreis mit «i», 24er-Raster, Strich 2,
  `aria-hidden`) in `--farbe-marke`, höchstens `--breite-inhalt` breit. Kein Schatten, keine Taste,
  nicht wegklickbar. Steht direkt unter dem Seitenkopf, nie darin (sonst klebt sie am PC mit und
  verschiebt die klebenden Spaltentitel). Steht der Hinweis *Nur ansehen* auf der Seite, bleibt er
  über dem Titel.
- Leitbild: neue Zeile in der Bausteintabelle und in «Welche Fläche wofür»
  (Seiteninfo = wozu die Seite da ist; bleibt immer). Dann Design System «MyTCO» nachführen.
- Die bisherigen leisen Erklärsätze unter dem Titel gehen in der Seiteninfo auf. Die Anzahl
  (Mitglieder, Anlässe) bleibt als leise Statuszeile unter der Seiteninfo; beim
  Änderungsverlauf bleibt die Zeile «Die letzten 100 Einträge …» bzw. «Nur dieses Mitglied …
  Alle anzeigen» ebenso darunter.
- Texte gelten für jede Rolle, die die Seite sieht, auch für *Nur ansehen*: keine Aufforderung
  «du kannst …», die eine lesende Rolle nicht kann.
- Svelte-Komponente `Seiteninfo.svelte` unter `src/lib/verwaltung/` (Symbol und Fläche; Text als
  Kinder, damit fett und Verweise gehen).

## Texte

Freigegeben vom Projektleiter am 23.11.2026. «Clubmeisterschaft» bekommt keine Seiteninfo (der
leise Satz unten bleibt); also 8 Seiten.

| Seite | Seiteninfo |
|---|---|
| Mitglieder | Alle Mitglieder suchen und über «Bearbeiten» ihre Seite öffnen: Angaben, Mitgliedschaft, Login und Rollen. Neue Mitglieder kommen einzeln über «Mitglied anlegen» oder als Datei über «Einlesen». |
| Einlesen | Für das erste Einlesen oder wenn viele Mitglieder auf einmal dazukommen: neue Mitglieder aus einer CSV-Datei anlegen; wer schon in MyTCO ist, bleibt unverändert. Einzelne Mitglieder kommen unter «Mitglieder» über «Mitglied anlegen» dazu. |
| Briefe | Der erste Brief mit Anmeldecode, für Mitglieder, die MyTCO noch nie geöffnet haben; ein neuer Code ersetzt den alten. **Nicht für verlorene Zugänge:** Wer sich nicht mehr anmelden kann, holt sich beim Login selbst einen «Code per E-Mail». |
| Anlässe | Neue Anlässe erstellen und sehen, wer kommt. Auf der Seite eines Anlasses gehen auch Erinnerungen an alle, die noch nicht geantwortet haben, und andere Mitteilungen zum Anlass hinaus. |
| Mitteilungen | Allgemeine Mitteilungen an alle aktiven Mitglieder, per Push oder E-Mail. An einen Teil der Mitglieder (z. B. wer noch nicht geantwortet hat) geht eine Mitteilung über die Seite eines Anlasses. |
| Für Fairgate | Änderungen, die Mitglieder in MyTCO selbst gemacht haben, zum Übernehmen ins Mitgliedersystem Fairgate; danach abhaken. |
| Änderungsverlauf | Wer wann an welchem Mitglied etwas geändert hat, ohne alte und neue Werte. |
| Rollen | Wer welche Rolle hat. Vergeben und entziehen lassen sich Rollen beim Mitglied, in der Klappe «Rollen». |

Ausserhalb von #93 (in `docs/beobachtungen.md`): Rollen nur noch über die Seite «Rollen» vergeben;
Mitteilungen zur Clubmeisterschaft und an Untergruppen ohne Anlass.

## Nachweis

- E2E: Jede der 8 Seiten zeigt ihre Seiteninfo (über Rolle und Text gesucht); «Briefe» mit dem
  Hinweis auf «Code per E-Mail». Bestehende Tests, die die alten Sätze suchen, ziehen mit.
- Screenshot PC und Handy (Briefe), neben dem Entwurf.

## Dem Bauenden überlassen

- Die Rolle der Fläche für Screenreader (z. B. `<aside aria-label="Über diese Seite">` oder
  schlichter Absatz) nach WCAG-Prüfung.
