[← Übersicht](../../index.md)

# Gespräch mit der Turnierleitung (#71)

Teil 2 der [CM-Übersicht](2026-11-09-cm-uebersicht-design.md). Dort steht die Kontaktperson
pro Turnier (`turnier.kontakt_mitglied_id`) und am Ende der Seite einer CM der Satz «Bei Fragen
oder Problemen melde dich bei <Name> (CM-Admin).», noch ohne Link.

## Warum

Ein Mitglied hat eine Frage zur Clubmeisterschaft («Ich bin vom 3. bis 17. Juli in den Ferien,
kann ich die Gruppenspiele vorziehen?»). Heute muss es Telefonnummer oder Mail-Adresse
der Turnierleitung irgendwo finden. Die Antwort liegt dann bei einer Person, und die
anderen CM-Admins wissen nichts davon.

**Erfolg:** Das Mitglied schreibt aus der CM-Seite, ohne Kontaktdaten zu kennen, und liest die
Antwort in MyTCO. Jeder CM-Admin sieht jeden Fall und was geantwortet wurde. Keine Frage bleibt
liegen, weil die Kontaktperson gerade in den Ferien ist.

**Anti-Ziele:** Ein Chat für alles im Verein. Zwei Admins antworten unabhängig voneinander
dasselbe. Eine Meldung verrät auf dem Sperrbildschirm, wer was gefragt hat.

## Entscheide des Projektleiters

| Frage | Entscheid |
|-------|-----------|
| Wie kommt die Antwort zurück? | In der App, als kleiner Verlauf; das Mitglied kann wieder antworten |
| Wer bekommt eine Meldung bei einer neuen Nachricht des Mitglieds? | Nur die gewählte Kontaktperson (Push, sonst E-Mail) |
| Wie viele Gespräche hat ein Mitglied? | Eines pro Turnier |
| Was sieht das Mitglied als Absender? | Nur «Turnierleitung», nie den Namen des Admins |
| Wann wird gelöscht? | Am 31.12. des Turnierjahres alle Gespräche des Turniers |
| Kontaktperson verliert die Rolle mitten im Gespräch | Gespräch und Posteingang bleiben; schreiben kann das Mitglied nur, solange eine gültige Kontaktperson gewählt ist, sonst liest es nur |
| Clubinterne Kommunikation (Reaktionen zu Resultaten, Chats unter Mitgliedern) | Nicht hier: Reaktionen als Idee an #66, private Chats als Frage an den Vorstand |
| Wie merken die anderen CM-Admins, dass etwas wartet? | Zähler an der Kachel «Verwaltung ›» auf der Startseite |
| Wo sieht das Mitglied eine neue Antwort, ohne Push? | Auf der Startseite unter «Jetzt aktuell», dazu die Plakette am Link auf der CM-Seite |
| Oberfläche | Design-Entwurf (Design-Artifact) nach Freigabe dieses Konzepts, vor dem Plan |

## Wie es abläuft

### Mitglied

- Der Name im Satz am Ende der Seite einer CM wird zum Link auf das **Gespräch mit der
  Turnierleitung** (`/clubmeisterschaft/[id]/kontakt`, eine Stufe unter CM). Ohne gültige
  Kontaktperson fällt der Satz weg wie heute. Ein bestehendes Gespräch erreicht das Mitglied dann
  über eine eigene Zeile «Dein Gespräch mit der Turnierleitung ›», nur lesend. *(Entscheid Claude;
  Wortlaut und Form klärt der Entwurf.)*
- Gibt es eine Antwort, die das Mitglied noch nicht gesehen hat, trägt der Link die Plakette
  «neue Antwort», und auf der Startseite steht unter «Jetzt aktuell» eine hervorgehobene Kachel
  «Neue Antwort der Turnierleitung ›» auf das Gespräch, bis das Mitglied es öffnet. Dafür merkt
  sich das Gespräch, wann das Mitglied es zuletzt geöffnet hat.
- Kommen später Chats unter Mitgliedern dazu, könnte ein eigener Reiter die Gespräche bündeln
  (Wunsch Projektleiter). Nicht jetzt; Reiter sind auf 4 begrenzt, *Lizenz* ist schon vorgesehen.
- Die Seite zeigt Zurück-Link «‹ <Name der CM>», darunter den Verlauf (älteste Nachricht oben,
  jeweils «Du» oder «Turnierleitung» mit Datum und Uhrzeit), darunter das Textfeld mit der Taste
  «Senden». Über dem Feld steht ein kurzer Hinweis: Keine Angaben zur Gesundheit, wie beim
  Wildcard-Kommentar.
- Eine Nachricht hat 1 bis 1000 Zeichen, nur Text, keine Anhänge. Gesendete Nachrichten lassen
  sich nicht ändern oder löschen. *(Entscheid Claude.)*
- Das Gespräch entsteht mit der ersten Nachricht, nicht beim Öffnen der Seite.
- Bei jeder Antwort der Turnierleitung bekommt das Mitglied eine Meldung über den bestehenden
  Weg *Push, sonst E-Mail* (`meldeMitgliedern`, FR-47): «Die Turnierleitung hat dir geantwortet.»
  mit Link auf das Gespräch, ohne Inhalt.
- Schreiben kann, wer die Seite der CM sehen darf (Turnier für Mitglieder sichtbar) und ein
  aktives Konto hat. In *Ansicht als …* liest der MyTCO-Admin nur.
- Die Kontaktperson selbst sieht statt des Links nur den Satz, wie heute. Andere CM-Admins
  dürfen als Mitglied schreiben wie alle. *(Entscheid Claude.)*
- Jede Nachricht löst eine eigene Meldung aus, auch mehrere kurz hintereinander; kein
  Bündeln. *(Entscheid Claude.)*

### CM-Admins

- In der Turnierverwaltung (`/verwaltung/turniere/[id]`) kommt ein Abschnitt **Nachrichten** mit
  der Zahl der offenen Gespräche und einem Link auf den **Posteingang**
  (`/verwaltung/turniere/[id]/nachrichten`). In der Liste der Turniere steht die Zahl der offenen
  Gespräche bei jedem Turnier. *(Entscheid Claude; Form klärt der Entwurf.)*
- Auf der Startseite der App trägt die Kachel «Verwaltung ›» für CM-Admins die Zahl der offenen
  Gespräche aller sichtbaren Turniere («2 Nachrichten offen»), damit auch die anderen CM-Admins
  es merken, wenn die Kontaktperson abwesend ist. Für den MyTCO-Admin nicht. *(Letzteres
  Entscheid Claude: Er liest nur.)*
- Der Posteingang listet die Gespräche des Turniers, offene zuerst, darin die mit der neuesten
  Nachricht des Mitglieds oben. Jede Zeile: Name des Mitglieds, Anfang der letzten Nachricht,
  Datum, Zustand *offen* oder *erledigt*.
- Ein Gespräch (`/verwaltung/turniere/[id]/nachrichten/[gid]`) zeigt den ganzen Verlauf. Bei
  Antworten der Turnierleitung steht für die Admins, wer geantwortet hat («Pascal Fischer»).
  Darunter das Antwortfeld (gleiche Grenzen wie beim Mitglied) und die Taste «Erledigt»
  bzw. «Wieder öffnen».
- Jeder CM-Admin kann antworten und den Zustand setzen. Eine Antwort setzt das Gespräch
  **nicht** von selbst auf *erledigt*. *(Entscheid Claude: oft folgt eine Rückfrage.)* Schreibt das
  Mitglied, ist das Gespräch wieder *offen*.
- Antworten zwei Admins fast gleichzeitig, merkt der zweite beim Senden, dass inzwischen eine
  Antwort eingegangen ist, und sieht sie, bevor er seine trotzdem schickt. *(Entscheid Claude.)*
- Bei jeder neuen Nachricht des Mitglieds bekommt **nur die gültige Kontaktperson** eine Meldung
  (Push, sonst E-Mail): «Neue Nachricht an die Turnierleitung.» mit Link auf das Gespräch in der
  Verwaltung, ohne Namen und ohne Inhalt (DS-05). Ohne gültige Kontaktperson geht keine Meldung
  hinaus; die Nachricht steht trotzdem im Posteingang. Der Link führt durch die
  Code-Bestätigung der Verwaltung (RR-09), falls sie fällig ist.
- Der MyTCO-Admin sieht Posteingang und Gespräche nur lesend (RR-07). Der Mitglieder-Admin
  sieht sie nicht.

### Löschen

- Der tägliche Zeitgeber löscht am 31.12. des Turnierjahres (Schweizer Kalenderzeit, also ab dem
  1.1. des Folgejahres) alle Gespräche dieses Turniers samt Nachrichten.
- Ab dem 1.1. nach dem Turnierjahr kann niemand mehr in Gespräche dieses Turniers schreiben,
  auch nicht über einen alten Link; sonst löschte der Zeitgeber eine neue Nachricht ungelesen.
- Wird ein Mitglied endgültig gelöscht (Status *gelöscht*, FR-04, nicht schon beim Vormerken),
  entfernt der Löschablauf sein Gespräch. Beim Austritt bleibt es bis zur Löschung oder bis zum
  Jahresende, je nachdem, was zuerst kommt. *(Entscheid Claude.)*
- Wird ein antwortender Admin gelöscht, erscheint er bei den Admins als *gelöschtes Konto*; das
  Mitglied sieht ohnehin nur «Turnierleitung».
- Kein Eintrag im Änderungsverlauf für Nachrichten oder Zustandswechsel. *(Entscheid Claude: Der
  Verlauf selbst ist die Spur.)*

## Datenschutz

Vor dem Bau nachzuführen (Dauerregel `CLAUDE.md`, Vorgaben DS-NN):

- `docs/datenschutz.md`
  - *Welche Daten:* Gespräche mit der Turnierleitung (Nachrichten mit Text und Zeitpunkt,
    Absender Mitglied oder Turnierleitung mit dem antwortenden Admin, Zustand, zuletzt gelesen)
  - *Wer sieht was:* Mitglied das eigene Gespräch ohne Namen der Admins; CM-Admin alle
    Gespräche der Turniere; MyTCO-Admin lesend; Mitglieder-Admin nicht
  - *Löschen:* wie oben
  - *Auskunft (DS-07):* Die Gespräche stehen nicht in der Auskunft des Mitglieder-Admins (er
    sieht sie nicht); auf Wunsch gibt sie der CM-Admin bekannt, wie bei Wildcard-Anträgen
  - DS-05 ist eingehalten: Meldungen ohne Inhalt, ohne Namen; dem Mitglied nie der Name des Admins
- `docs/datenschutzerklaerung.md`: Zweck, wer mitliest (alle CM-Admins, MyTCO-Admins),
  Löschfrist, Hinweis auf keine Gesundheitsangaben

## Nachzuführen

- `docs/anforderungen/anforderungen.md`: neue Anforderung unter *TURNIER* (nächste freie Nummer
  A-TURNIER-NN) mit Änderungsprotokoll
- `docs/fachmodell.md`: Gespräch und Nachricht, Regeln mit nächsten freien FR-NN (ein Gespräch
  pro Mitglied und Turnier, Zustand, wer schreiben darf, Meldungen, Löschen)
- `docs/rollen-und-rechte.md`: Zeilen in der Matrix unter *CM-Anmeldung*
- `docs/ui-leitbild.md`: Gesprächsseite (Verlauf, Absender, Eingabe) und Posteingang als neue
  Bausteine, falls der Entwurf etwas braucht, das fehlt; feste Ordnung für die neuen Seiten
- `docs/context-scopes.md`: neue Routen
- `docs/versionen.md`: Eintrag unter «Unveröffentlicht»
- Seed (`make seed`): erfundene Gespräche, eines offen, eines erledigt, eines mit neuer Antwort
- #66: Kommentar mit der Idee «Reaktionen und Gratulationen zu Resultaten»
- `docs/abklaerungen.md` und Fragen-Tabelle: Frage an den Vorstand, ob der Verein Chats unter
  Mitgliedern in MyTCO will (Junioren, bestehende WhatsApp-Gruppe)

## Nachweis

- Unit- bzw. DB-Tests mit den neuen IDs: ein Gespräch pro Mitglied und Turnier; Grenzen der
  Nachricht; Schreiben nur mit gültiger Kontaktperson, sonst lesend; Antwort öffnet nicht neu,
  Nachricht des Mitglieds öffnet neu; Meldung nur an die Kontaktperson, ohne Inhalt; Meldung
  an das Mitglied ohne Admin-Namen; Mitglied sieht keine Admin-Namen in der Schnittstelle;
  Mitglieder-Admin und fremde Mitglieder bekommen 403; MyTCO-Admin kann nicht schreiben;
  Zeitgeber löscht ab 1.1., nicht am 31.12.; ab 1.1. kein Schreiben mehr; Löschung des
  Mitglieds nimmt das Gespräch mit; Zähler an der Kachel «Verwaltung» nur für CM-Admins;
  Kachel «Neue Antwort» auf der Startseite erscheint und verschwindet nach dem Öffnen
- E2E: Mitglied schreibt, Kontaktperson sieht die Nachricht im Posteingang, ein anderer
  CM-Admin antwortet, Mitglied sieht «neue Antwort» und liest sie, Admin setzt *erledigt*;
  ohne Kontaktperson kein Link
- Bildvergleich gegen den Entwurf (iPhone/Android), axe ohne Verstösse

## Ausdrücklich nicht

- Keine Pinnwand, keine Reaktionen zu Resultaten, keine Chats zwischen Mitgliedern
- Keine Anhänge, kein Bearbeiten oder Löschen eigener Nachrichten
- Keine Gespräche ausserhalb der Clubmeisterschaft (Anlässe, Lizenzen)
- Keine Meldung an alle CM-Admins
