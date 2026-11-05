# Design: Anmeldung zur Generalversammlung (#52, A-ANLASS-01)

**Datum:** 2026-11-05 · **Issue:** [#52](https://github.com/konstantinniedermann/tco-app/issues/52)
· **Status:** Vorschlag des Projektleiters, wird in einer späteren Session verbessert; hängt an K-50

## Absicht

Ein Mitglied meldet sich mit wenigen Tipps zur Generalversammlung (GV) an oder ab. Der Vorstand
sieht jederzeit, wer kommt. Die GV ist der erste Anlass neben der Clubmeisterschaft und die
**Vorlage für weitere Anlässe** (Saisoneröffnung, Clubabend): Was hier entsteht, heisst
allgemein *Anlass*, nicht *GV*.

Wie der Verein die GV-Anmeldung heute führt, ist nicht bekannt. Das fragt K-50. Bis zur Antwort
gilt dieser Vorschlag; jede Annahme ist markiert.

## Was die Statuten 2026 vorgeben

| Artikel | Vorgabe | Folge für MyTCO |
|---------|---------|-----------------|
| Art. 27 | Ordentliche GV jährlich, üblicherweise im Frühling; Einladung mit Traktandenliste mindestens 21 Tage vorher, per E-Mail erlaubt | Einladung und Traktanden beim Anlass zeigen |
| Art. 18 | Stimmberechtigt: Aktiv-, Frei-, Ehrenmitglieder, Studierende/Lernende. Junioren und Passivmitglieder mit beratender Stimme. Keine Stellvertretung | Liste zeigt die Stimmberechtigten getrennt |
| Art. 30 | Anträge schriftlich und kurz begründet an den Präsidenten, mindestens 12 Tage vor der GV | Antragsfrist eigener Termin, früher als der Anmeldeschluss möglich |

Eine Anmeldung oder Entschuldigung verlangen die Statuten nicht; sie ist Brauch des Vereins.

## Ziele

1. Das Mitglied sieht auf der Startseite eine eigene Karte zur GV mit Datum, Ort und dem Link zu
   Einladung und Traktanden.
2. Es sagt mit einem Tipp **«Ich komme»** oder **«Ich komme nicht»**; bei der Abmeldung kann es
   eine Bemerkung dazuschreiben (Entschuldigung). Bis zum Anmeldeschluss lässt sich die Antwort
   ändern.
3. Wer sich anmeldet, kann **freiwillig** einen **Antrag** an die GV (Art. 30) oder eine
   **Frage an den Vorstand** einreichen (Opt-in, standardmässig zugeklappt).
4. Der Admin legt den Anlass an (Titel, Datum, Zeit, Ort, Einladung als Text oder PDF,
   Anmeldeschluss, Antragsfrist) und sieht die Liste: kommt, kommt nicht, keine Antwort; dazu
   Bemerkungen, Anträge und Fragen.
5. Geht ein Antrag oder eine Frage ein, erhalten die Admins eine E-Mail. Anmeldungen allein
   lösen keine Mail aus.

## Nicht-Ziele

- Kein Abstimmen und keine Wahlen in MyTCO.
- Die Einladung selbst verschickt weiterhin der Vorstand wie heute (Art. 27). MyTCO zeigt sie
  zusätzlich an.
- Kein Entscheid über Anträge in MyTCO; ob ein Antrag traktandiert wird, klärt der Vorstand
  ausserhalb.
- Keine Begleitpersonen, keine Essens- oder Menüwahl. Weitere Anlässe brauchen das vielleicht;
  dann kommt es als Zusatzfeld des Anlasses dazu.
- Keine neue Rolle *Vorstand* oder *Präsident*.

## Annahmen bis zur Antwort auf K-50

- Annahme K-50: Anmelden geht ab dem Versand der Einladung bis zum Anmeldeschluss, den der Admin
  setzt (Vorschlag: 3 Tage vor der GV).
- Annahme K-50: Anträge und Fragen gehen bis zur Antragsfrist ein, standardmässig 12 Tage vor
  der GV (Art. 30); danach ist nur noch An- und Abmelden möglich.
- Annahme K-50: Ein Antrag über MyTCO gilt als «schriftlich» im Sinne von Art. 30.
- Annahme K-50: Die Liste sehen nur Admins; der Präsident ist laut Vorschlag K-18.2 nicht
  zwingend Admin, darum geht ein Antrag per Mail an alle Admins, nicht an eine Person.
- Annahme K-50: Mitglieder sehen nur ihre eigene Antwort, nicht wer sonst kommt (RR-05).
- Annahme K-50: Eingeladen sind alle Mitglieder; Junioren und Passivmitglieder sind in der Liste
  als «beratend» markiert (Art. 18). Ob Schüler und Interclub-Mitglieder eingeladen sind, lassen
  die Statuten offen.
- Annahme K-50: Juniorenkonten meldet nach Vorschlag K-08 ein Elternteil an.

## Fachmodell (Skizze)

Das Fachmodell sieht schon ein eigenes Objekt *Anlass* mit Anmeldungen vor, getrennt vom
Turnier. Vorschlag:

| Objekt | Angaben |
|--------|---------|
| **Anlass** | Titel, Datum und Zeit, Ort, Einladung (Text, optional PDF), Anmeldeschluss, Antragsfrist (optional), Status *Entwurf* → *offen* → *geschlossen* → *vorbei* |
| **Teilnahme** | Anlass, Mitglied, Antwort *kommt* / *kommt nicht*, Bemerkung (optional), geändert am |
| **Eingabe** | Anlass, Mitglied, Art *Antrag* / *Frage*, Text, eingereicht am |

Die Antragsfrist ist optional, weil spätere Anlässe keine Anträge kennen.

## Datenschutz (vor dem Bau nachführen)

Neu sind die Teilnahme mit Bemerkung und die Eingaben. Vor der Umsetzung in
[`datenschutz.md`](../../datenschutz.md) aufnehmen: *Welche Daten* (Antwort, Bemerkung, Eingaben),
*Wer sieht was* (Mitglied eigene, Admin alle), *Löschen* (Vorschlag: Teilnahmen und Bemerkungen
nach der GV mit dem Protokoll, spätestens nach einem Jahr; Anträge bleiben beim Vorstand
ausserhalb von MyTCO). Danach in die Datenschutzerklärung.

## Oberfläche

Entwurf als Design-Artifact auf dem Design System *MyTCO* (Handy-Artboards), nach dem
[UI-Leitbild](../../ui-leitbild.md): eine eigene Karte für die GV auf der Startseite, Antrag und
Frage als aufklappbarer Bereich. Fehlende Bausteine kommen erst ins Leitbild.

## Offen für die spätere Session

- Entwurf mit dem Projektleiter verbessern und freigeben.
- Antwort auf K-50 einarbeiten, Etappe von A-ANLASS-01 festlegen (Kandidat: GV 2027, sofern sie
  nach dem Release *Mitglieder-Login* am 28.02.2027 liegt).
- Datenschutz, Rollen und Rechte (Matrix), Fachmodell nachführen; dann Plan.
