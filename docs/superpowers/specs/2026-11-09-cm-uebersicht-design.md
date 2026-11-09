[← Übersicht](../../index.md)

# CM-Übersicht entschlacken, Seite einer Kategorie, Kontaktperson pro Turnier

Rückmeldung des Projektleiters nach einem Test (angemeldet mit einer Testperson im Doppel).
Teil 2, das Kontaktformular mit Posteingang für alle CM-Admins, ist #71.

## Warum

Die Seite einer CM (`/clubmeisterschaft/[id]`) liest sich heute wie ein Formular und nicht
wie eine Übersicht:

- «1 von 3 Anmeldungen» mit Balken wirkt wie Schritt 1 von 3 eines Formulars. Man meint,
  man müsse weitermachen.
- Wo man angemeldet ist, sieht man schlecht. «Anmelden» und «Abmelden» sehen gleich aus,
  «Du bist angemeldet.» ist klein und geht unter.
- Die Namen aller Angemeldeten stehen in jeder Karte. Mit 20 und mehr Anmeldungen pro
  Kategorie wird die Seite unübersichtlich.
- «Zu starke Paare meldet die Turnierleitung an» hilft nicht weiter. Gebraucht wird
  stattdessen, an wen man sich wenden kann.

**Erfolg:** Ein Blick auf die Seite zeigt, in welchen Kategorien man dabei ist. Die Karten
sind kurz, und wer wissen will, wer sonst noch dabei ist, tippt sich hinein.

**Anti-Ziel:** Die Seite wirkt weiterhin wie ein mehrstufiges Formular, oder der eigene
Stand ist erst beim zweiten Hinsehen zu finden.

## Was sich ändert

### 1. Zähler weg

Balken und «N von 3 Anmeldungen» fallen weg. Die Grenze von 3 Anmeldungen gilt weiter. Der
Satz «Mehr als 3 Anmeldungen gehen nicht. Melde dich zuerst irgendwo ab.» erscheint wie
heute erst, wenn man 3 hat. Der Fokus nach dem Speichern der Angaben, der heute auf dem
Zähler landet, geht auf den Seitentitel *(Entscheid Claude)*.

### 2. Eigener Stand als Plakette neben dem Kategorienamen

Jede Kategorie-Karte trägt rechts oben neben dem Namen eine Plakette, sobald man dort dabei
ist:

| Stand | Plakette |
|-------|----------|
| Einzel angemeldet, Doppel mit Partner | `plakette-ok` «angemeldet» |
| Doppel allein, sucht Partner | `plakette-offen` «sucht Partner» |
| Wildcard beantragt | `plakette-offen` «Wildcard beantragt» (wandert von unten nach oben) |

«Du bist angemeldet.» und die Plakette «sucht Partner» im Fliesstext der eigenen
Doppel-Karte fallen weg. Ein offener eigener Antrag an jemanden («Deine Anfrage an …»)
bleibt in der Karte, wie er ist. Die Plakette ist Text (UI-05), Farbe allein trägt nichts.
Den Baustein «Kopfzeile einer Karte mit Plakette rechts» gibt es im Leitbild noch nicht:
Er kommt zuerst nach `docs/ui-leitbild.md`. Auf schmalen Bildschirmen und bei grosser Schrift
rutscht die Plakette unter den Namen, statt den Namen abzuschneiden.

### 3. Namen raus aus der Übersicht, neue Seite einer Kategorie

Aus den Karten der Übersicht fallen weg:
- «Angemeldet: …» (Einzel und Wildcard)
- «Paare: …» (Doppel)
- «Weitere Paare: …» (eigenes Paar)

Die eigene Partnerin bzw. der eigene Partner mit Kontakt bleibt in der eigenen Doppel-Karte
stehen, weil man ihn braucht.

Stattdessen trägt jede Karte einen Link mit der Anzahl, z. B. «12 angemeldet ›», im Doppel
«5 Paare ›». *(Wortlaut: Entscheid Claude.)* Bei 0 lautet er «Noch niemand angemeldet ›»
und führt trotzdem auf die Seite.

Der Link führt auf die neue **Seite einer Kategorie**
`/clubmeisterschaft/[id]/kategorie/[kid]`:
- Reiter CM, Zurück-Link «‹ <Name der CM>» (feste Ordnung im Leitbild nachtragen)
- Titel: Name der Kategorie, darunter die Bedingungen (derselbe Text wie in der Karte) und der
  eigene Stand als Plakette
- Einzel: Liste der Angemeldeten, ein Name pro Zeile (Baustein *Name*, mit Rufname)
- Doppel: Liste der Paare, darunter «Sucht Partner» mit Kommentar
- Die Liste ist dieselbe wie heute in der Karte (bestätigte Anmeldungen, sortiert wie heute).
  Angezeigt werden keine Daten, die Mitglieder nicht schon heute sehen.
- Keine Handlungen auf dieser Seite. Anmelden, Abmelden und Partner anfragen bleiben in der
  Übersicht bzw. auf der Seite *Partner anfragen*. *(Entscheid Claude: so bleibt Handeln an
  einer Stelle. Im CM-Betrieb wird das die Seite mit Gruppen und Spielen, vgl. Leitbild «CM ›
  Herren R5/R9 › Spiel gegen X».)*
- Die Daten stammen aus derselben Antwort wie die Übersicht (`GET /api/cm/[id]`). Eine neue
  Schnittstelle ist nicht nötig.
- Kategorie unbekannt oder für einen nicht sichtbar: Umleitung wie bei der Seite *Partner
  anfragen* (`doppel/[kid]/+page.ts`), also zurück auf die Seite der CM, bei unbekanntem
  Turnier auf die Startseite.
- Den Link tragen alle Karten der Übersicht, auch die Wildcard-Kategorien. Das eigene Paar
  steht auf der Seite einer Kategorie in der Liste wie alle anderen. *(Entscheid Claude.)*

### 4. «sucht Partner» in der Doppel-Karte zugeklappt

Die Liste der Suchenden in den Doppel-Karten der Übersicht, auch in der eigenen Karte
«sucht Partner», steht zugeklappt in der Karte,
z. B. «3 suchen Partner». Ein Tipp öffnet sie, mit Namen und Kommentar wie heute. Ob sie
offen ist, merkt sich die Seite wie die anderen Klappen (`merkeKlappe`). Ohne Suchende fällt
die Zeile weg.

### 5. Kontaktperson pro Turnier statt «Zu starke Paare …»

Der Satz «Zu starke Paare meldet die Turnierleitung an.» fällt weg. Die Erklärung zur Summe
der Klassierungen im Doppel bleibt. Ganz am Ende der Seite einer CM steht, auch wenn noch
Angaben fehlen oder keine Kategorie passt *(Entscheid Claude: gerade dann braucht man jemanden
zum Fragen)*:

> Bei Fragen oder Problemen melde dich bei Vorname Nachname (CM-Admin).

- Der Name erscheint nur als Text, ohne E-Mail-Adresse, ohne Telefonnummer, ohne Link. In
  #71 wird er zum Link auf das Kontaktformular.
- **Verwaltung:** Im Turnierformular kommt ein Feld «Kontaktperson» dazu. Zur Auswahl stehen
  nur Mitglieder mit der Rolle CM-Admin, dazu «keine». Das Feld ist freiwillig.
- **Datenbank:** `turnier.kontakt_mitglied_id`, nullbar, Verweis auf das Mitglied, beim
  Löschen des Mitglieds auf `null`. Neue Migration.
- **Prüfung beim Speichern:** Der Server nimmt als neue Wahl nur ein Mitglied an, das jetzt
  CM-Admin ist (gesperrte Konten zählen wie bei `cmAdmins` nicht). Ist die gespeicherte Person
  nicht mehr CM-Admin, zeigt das Formular sie als zusätzliche Wahl «Vorname Nachname (nicht
  mehr CM-Admin)», vorgewählt. Speichern ohne Änderung behält sie, damit Name oder
  Anmeldeschluss änderbar bleiben. Mitglieder sehen sie trotzdem nicht. *(Entscheid Claude.)*
- **Ohne gültige Kontaktperson fällt der Satz weg.** Das gilt, wenn keine gewählt ist, die
  Person die Rolle CM-Admin verloren hat, ausgetreten ist oder zum Löschen vorgemerkt ist.
  Die Schnittstelle der Mitglieder liefert in diesen Fällen `kontakt: null`. Die Verwaltung
  sieht im Turnier den Hinweis «Keine Kontaktperson gewählt» bzw. «Die Kontaktperson ist
  nicht mehr CM-Admin».

## Datenschutz

- **Neu:** Alle Mitglieder sehen auf der Seite einer CM den Namen (mit Rufname, wie überall)
  der vom CM-Admin gewählten Kontaktperson. Weder E-Mail noch Telefon werden gezeigt.
  Vor dem Bau nachtragen in `docs/datenschutz.md`, Zeile *Alle Mitglieder* in *Wer sieht was*,
  und in `docs/datenschutzerklaerung.md`. DS-05 ist nicht berührt: Der Name steht auf einer
  Seite, nicht in einer Meldung.
- **Unverändert:** Die Seite einer Kategorie zeigt dieselben Namen und Kommentare, die die
  Übersicht heute zeigt, nur an anderer Stelle.

## Nachzuführen

- `docs/ui-leitbild.md`: Baustein für die Kopfzeile mit Plakette; Seite einer Kategorie in der
  festen Ordnung; Beschreibung der CM-Seite
- `docs/fachmodell.md`: Turnier hat eine optionale Kontaktperson (CM-Admin)
- `docs/rollen-und-rechte.md`: CM-Admin wählt die Kontaktperson
- `docs/context-scopes.md`: neue Route
- `docs/versionen.md`: Eintrag unter «Unveröffentlicht»

## Nachweis

- Unit-Tests: Plakette je Stand; Linktext mit Anzahl; Kontakt `null` bei fehlender Rolle,
  bei Austritt und bei Vormerkung zum Löschen; Server lehnt eine Person ohne CM-Admin-Rolle ab
- E2E (`tests/e2e/cm-anmeldung.test.ts`, `cm-doppel.test.ts`, `turnier.test.ts`): kein Zähler
  mehr; Plakette nach dem Anmelden, weg nach dem Abmelden; keine Namen in der Übersicht; Seite
  einer Kategorie zeigt die Namen; Suchende zugeklappt; Kontaktperson im Turnierformular
  wählen, Satz erscheint, nach Entzug der Rolle verschwindet er
- Screenshot der laufenden App auf Handy-Breite (Übersicht mit eigener Anmeldung, Seite einer
  Kategorie, Turnierformular) für den Projektleiter

## Ausdrücklich nicht

- Kein Kontaktformular, keine Nachrichten (#71)
- Keine Änderung an Anmelden, Abmelden, Partnerwahl, Wildcard-Antrag selbst
- Keine Änderung an den Tasten «Anmelden» / «Abmelden»: Die Plakette macht den Stand sichtbar.
- Keine neuen Daten über Mitglieder ausser dem Namen der Kontaktperson
