# Design: Anmeldung zur Generalversammlung (#52, A-ANLASS-01)

**Datum:** 2026-11-05 · **Issue:** [#52](https://github.com/konstantinniedermann/tco-app/issues/52)
· **Status:** Vorschlag des Projektleiters, wird in einer späteren Session verbessert; hängt an K-50

## Absicht

Ein Mitglied meldet sich mit wenigen Tipps zur Generalversammlung (GV) an oder ab. Die Admins
sehen jederzeit, wer kommt. Die GV ist der erste Anlass neben der Clubmeisterschaft und die
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
   eine Bemerkung dazuschreiben (Entschuldigung). Das Feld sagt, dass kein Grund wie eine
   Krankheit nötig ist ([Datenschutz](../../datenschutz.md): keine Gesundheitsdaten, auch nicht
   als Grund für eine Abmeldung). Bis zum Anmeldeschluss lässt sich die Antwort ändern.
3. Wer sich anmeldet, kann **freiwillig** einen **Antrag** an die GV (Art. 30) oder eine
   **Frage an den Vorstand** einreichen (Opt-in, standardmässig zugeklappt).
4. Der Admin legt den Anlass an (Titel, Datum, Zeit, Ort, Einladung als Text oder PDF,
   Anmeldeschluss, Antragsfrist) und sieht die Liste: kommt, kommt nicht, keine Antwort; dazu
   Bemerkungen, Anträge und Fragen.
5. Geht ein Antrag oder eine Frage ein, erhalten die Admins und eine beim Anlass hinterlegte
   Adresse des Präsidiums eine E-Mail; so erreicht ein Antrag den Präsidenten, wie es Art. 30
   verlangt. Anmeldungen allein lösen keine Mail aus.

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
- Annahme K-50: Liste, Bemerkungen und Eingaben sehen nur die Admins von MyTCO (laut K-18 der
  Projektleiter und die Hauptansprechperson), nicht der ganze Vorstand. Der Präsident ist
  nicht zwingend Admin; Anträge und Fragen erhält er per Mail an die Adresse des Präsidiums.
  Wo die App sagt, wer etwas liest, nennt sie genau «Admins» bzw. «Präsidium».
- Annahme K-50: Mitglieder sehen nur ihre eigene Antwort, nicht wer sonst kommt (RR-05).
- Annahme K-50: Eingeladen sind alle Mitglieder; Junioren und Passivmitglieder sind in der Liste
  als «beratend» markiert (Art. 18). Ob Schüler und Interclub-Mitglieder eingeladen sind, lassen
  die Statuten offen.
- Annahme K-50: Juniorenkonten meldet nach Vorschlag K-08 ein Elternteil an.

## Fachmodell (Skizze)

Das Fachmodell sieht schon ein eigenes Objekt *Anlass* mit Anmeldungen vor, getrennt vom
Turnier. Nach dem [Glossar](../../glossar.md) heisst auch die Antwort zur GV *Anmeldung*.
Vorschlag:

| Objekt | Angaben |
|--------|---------|
| **Anlass** | Titel, Datum und Zeit, Ort, Einladung (Text, optional PDF), Anmeldeschluss, Antragsfrist (optional), Adresse für Eingaben (optional), Status *Entwurf* → *offen* → *geschlossen* → *vorbei* |
| **Anmeldung** (zum Anlass) | Anlass, Mitglied, Antwort *kommt* / *kommt nicht*, Bemerkung (optional), geändert am |
| **Eingabe** (neuer Begriff, ins Glossar) | Anlass, Mitglied, Art *Antrag* / *Frage*, Text, eingereicht am |

Die Antragsfrist ist optional, weil spätere Anlässe keine Anträge kennen.

**Stimmrecht:** «Du bist stimmberechtigt» und die Spalte *Stimmrecht* brauchen die
Mitgliederkategorie (Aktiv, Passiv, Junior …, Statuten Art. 5–13). Sie steht heute weder im
Fachmodell noch unter *Welche Daten*. Annahme K-50: Sie kommt mit dem Einlesen aus Fairgate
(K-45) oder wird von Hand gepflegt; ohne sie entfällt die Anzeige des Stimmrechts.

## Datenschutz (vor dem Bau nachführen)

Neu sind die Anmeldung zum Anlass mit Bemerkung, die Eingaben und die Mitgliederkategorie. Vor
der Umsetzung in [`datenschutz.md`](../../datenschutz.md) aufnehmen: *Welche Daten* (Antwort,
Bemerkung, Eingaben, Mitgliederkategorie), *Wer sieht was* (Mitglied eigene, Admin alle,
Eingaben zusätzlich per Mail ans Präsidium), *Löschen* (Vorschlag: Anmeldungen und Bemerkungen
nach der GV mit dem Protokoll, spätestens nach einem Jahr; Anträge bleiben beim Vorstand
ausserhalb von MyTCO). Der Export der Liste («Liste exportieren») widerspricht heute DS-04
(Exporte nur mit den Feldern für Swiss Tennis): DS-04 erweitern oder den Export weglassen.
Danach in die Datenschutzerklärung.

## Oberfläche

Erster Entwurf als Design-Artifact
[MyTCO GV-Anmeldung](https://claude.ai/artifact/K3oLGEXvEbqPDWnobf2jA6) (privat, nur für den
Projektleiter), gebaut aus den Werten von `tokens.css` und den Bausteinen des
[UI-Leitbilds](../../ui-leitbild.md). Das Design System *MyTCO* war noch leer.

1. **Startseite:** GV als hervorgehobene Kachel unter «Jetzt aktuell».
2. **GV-Seite:** Karte *Einladung* (Datum, Ort, Traktanden, PDF, «Du bist stimmberechtigt»), Karte
   *Kommst du?* mit zwei Auswahlflächen, Aufklappbereich *Antrag oder Frage an den Vorstand
   (freiwillig)*, Haupttaste «Antwort senden».
3. **Abmelden:** «Ich komme nicht» gewählt, darunter *Bemerkung (freiwillig)* mit dem Hilfetext
   «Ein Grund ist nicht nötig, bitte keine Angaben zur Gesundheit. Die Bemerkung lesen nur die
   Admins von MyTCO.»
4. **Nach dem Senden:** Karte *Deine Antwort* mit Plakette und Nebentaste «Antwort ändern»,
   Karte mit der eingereichten Frage.
5. **Verwaltung (PC):** Kennzahlen (kommen, davon stimmberechtigt, kommen nicht, keine Antwort),
   Karte *Anträge und Fragen*, Leiste mit Suche, Filter, «Liste exportieren», Tabelle mit
   Stimmrecht und Bemerkung.

**Bausteine, die im Leitbild fehlen** (vor dem Bau dort aufnehmen): Auswahlfläche (Radio als
Fläche mit Rand, gewählt in `--farbe-marke-zart`), mehrzeiliges Eingabefeld, Kennzahl-Kachel der
Verwaltung, Plakette *kommt nicht* bzw. *keine Antwort*.

## Offen für die spätere Session

- Entwurf mit dem Projektleiter verbessern und freigeben.
- Antwort auf K-50 einarbeiten, Etappe von A-ANLASS-01 festlegen (Kandidat: GV 2027, sofern sie
  nach dem Release *Mitglieder-Login* am 28.02.2027 liegt).
- Datenschutz, Rollen und Rechte (Matrix), Fachmodell und Glossar (*Eingabe*) nachführen; dann
  Plan.
- `make annahmen` prüft diese Notiz nicht (Ordner `docs/superpowers/` gilt als Historie). Kommt
  die Antwort auf K-50, die Annahmen oben von Hand abgleichen; die lebende Markierung steht
  unter A-ANLASS-01 in den Anforderungen.
