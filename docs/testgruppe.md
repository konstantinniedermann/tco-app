[← Übersicht](index.md)

# Testgruppe

Vor dem Briefversand an alle Mitglieder spielt eine Testgruppe die ganze App in einem
**Probelauf auf Test** durch. Jede Person spielt eine erfundene Persona und hat ein
[Rollenbuch](testgruppe-rollenbuecher.md) wie im Theater: was sie wann tut. Wer einen Einsatz
erledigt hat, meldet es im WhatsApp-Chat, dann ist die nächste Person dran. Geprüft wird, ob
alles klappt, was ein Mitglied tun kann, samt den Schritten der Admins dazu, und wo Erklärungen
fehlen. Der Probelauf ersetzt den früheren Lauf 1 auf Live; was nur auf Live prüfbar ist, steht
in der [Checkliste vor dem Release](testkonzept.md#einmal-vor-100-live).

Die Testpersonen sucht der Projektleiter selbst. Koordiniert wird über einen WhatsApp-Chat des
Projektleiters; er gehört nicht zu MyTCO. Design und Entscheide:
[Probelauf mit Rollen](superpowers/specs/2026-11-23-probelauf-rollen-design.md). Die Etappe dazu
heisst *Pilot* ([Roadmap](roadmap.md)). Datenschutz: [Testgruppe](datenschutz.md#testgruppe).

## Voraussetzungen

Der Lauf startet, sobald diese Punkte erfüllt sind. Getestet wird, was bis dahin gebaut ist; ein
Einsatz, dessen Funktion fehlt, fällt weg.

- [ ] **Echter Mailversand auf Test.** Weg wird entschieden, wenn der Lauf näher rückt: K-11
  (Absender `mytco@tcolten.ch` mit DNS-Einträgen) oder ein Übergangs-Absender bei einem Anbieter
  in der Schweiz oder EU (DS-01), nur für Test
- [ ] **Erlaubt-Liste statt Umleitung auf Test:** Mails an die Adressen der Testpersonen gehen
  hinaus, alle anderen werden wie heute umgeleitet (`MAIL_NUR_AN`)
- [ ] **Test neu aufsetzen** kurz vor Akt 0 (Zähler `betrieb/test-neu-aufsetzen`), danach die
  Interclub-Daten neu einlesen; nach dem Lauf nochmals neu aufsetzen und die Demo-Daten laden
- [ ] Test-Passwort an die Testpersonen (Entscheid Projektleiter)
- [ ] Liste in `intern/`: Person → Persona, Gerät, Softwareversion, Mail-Adresse, Altersgruppe grob
- [ ] Besetzung bekannt, Einsatzliste und Rollenbücher darauf zugeschnitten, Kalender mit echten
  Daten
- [ ] [Formular](#formular) angelegt und einmal selbst durchgespielt

**Während des Laufs:** kein `make test-pruefung`, keine Mitteilungen ausserhalb der Einsätze,
`betrieb/test-neu-aufsetzen` nicht hochzählen. Merges nach `dev` liefern weiter aus (die Daten
bleiben), damit Befunde im Lauf behoben werden können.

## Rollen und Personas

Jede Person spielt genau eine Persona. Admin-Personas sind zugleich Mitglieder und testen auch
die Funktionen der Mitglieder. Alle Namen und Daten der Personas sind erfunden; nur die
Mail-Adresse ist die echte der Testperson.

| Prio | Kürzel | Persona | Rolle | Gerät |
|---|---|---|---|---|
| – | R | **Regie** (Rolf Regie) | MyTCO-Admin, spielt nicht mit | PC |
| 1 | CM | **CM-Leitung** (Corinne Meister) | CM-Admin und Mitglied, Kontaktperson des Turniers | PC + Handy |
| 1 | MV | **Mitgliederverwaltung** (Markus Verwalter) | Mitglieder-Admin, MyTCO-Admin (solange niemand aus der echten Mitgliederverwaltung mitmacht) und Mitglied | PC + Handy |
| 1 | DS | **Doppel-Sucherin** (Daniela Doppel) | Mitglied | iPhone |
| 1 | P | **Partner** (Pascal Partner) | Mitglied | Android |
| 2 | Z | **Zögerin** (Zora Zögerlich) | Mitglied | Android |
| 3 | S | **Spätzünder** (Stefan Spät) | Mitglied | älteres Handy |
| 4+ | W | **Weiteres Mitglied** (W1, W2 … mit Namen von der Regie) | Mitglied | beliebig |
| – | – | *Olga Ohnehandy* | Mitglied ohne Handy, spielt niemand | – |

**Anzahl:** mindestens **4 Personen** (Prio 1), vollständig **5** (Prio 1–2), gut **6**
(Prio 1–3), dazu der Projektleiter als Regie. Mindestens ein iPhone und ein Android unter den
Mitglieder-Personas, zwei PCs für die Admins.

**Fällt eine Rolle weg:**

- ohne *Zögerin*: Die *Doppel-Sucherin* beantragt die Wildcard; Ablehnen und Zurückziehen
  einer Anfrage fallen weg, die CM-Leitung schickt keine Doppel-Anfrage; «sucht Partner» und
  Zusammenlegen machen die *Mitgliederverwaltung* und der *Spätzünder* (Mixed geht dann nicht:
  beide Herren, also im Herren-Doppel, das dann nicht abgesagt wird; abgesagt wird das
  Damen-Doppel ohne Anmeldung, die Meldung bekommt niemand).
- ohne *Spätzünder*: Die *Mitgliederverwaltung* schickt dem *Partner* die Anfrage im
  Herren-Doppel und bekommt nach der Absage die Meldung; die Spätanmeldung macht sie selbst im
  Herren-Einzel B; Sitzungen beenden trifft die *Doppel-Sucherin*.
- ohne eine der Prio-1-Rollen: kein Lauf.
- Kommt jemand aus der echten Mitgliederverwaltung dazu, übernimmt er die *Mitgliederverwaltung*;
  die MyTCO-Admin-Person spielt dann ein *Weiteres Mitglied* mit den Einsätzen «Rollen vergeben»
  (1.1) und «Ansicht als …» (Zusatz 8).

### Steckbriefe

| Persona | Geschlecht | Jahrgang | Klassierung | Eigenheit |
|---|---|---|---|---|
| Rolf Regie | Herr | 1980 | R7 | richtet ein, gibt Akte frei |
| Corinne Meister | Dame | 1975 | R5 | leitet die CM, spielt selbst Einzel |
| Markus Verwalter | Herr | 1968 | R7 | verwaltet die Mitglieder, sucht im Mixed einen Partner |
| Daniela Doppel | Dame | 1990 | R6 | spielt Einzel und Mixed mit Pascal |
| Pascal Partner | Herr | 1988 | R4 | nimmt Danielas Anfrage an, tritt aus und wieder ein |
| Zora Zögerlich | Dame | 1995 | R8 | will höher hinaus (Wildcard), sagt Corinne ab, sucht allein |
| Stefan Spät | Herr | 1958 | R9 | kommt zu spät, Senior |
| Olga Ohnehandy | Dame | 1950 | R9 (falsch erfasst, richtig R8) | wird von Hand angemeldet |

Die Klassierung tragen die Personas selbst ein (Akt 3), ebenso Geschlecht und Jahrgang (FR-37).
Adressen und Telefonnummern erfindet jede Person für ihre Persona selbst.

### Kategorien der Probe-CM

Die CM-Leitung legt sie in Akt 1 an. Doppel mit der Mindestsumme 9 (Annahme K-51).

| Kategorie | Art | Geschlecht | Jahrgang | Klassierung / Summe |
|---|---|---|---|---|
| Damen A | Einzel | Damen | – | R1–R5 |
| Damen B | Einzel | Damen | – | R6–R9 |
| Herren A | Einzel | Herren | – | R1–R6 |
| Herren B | Einzel | Herren | – | R7–R9 |
| Herren 55+ | Einzel | Herren | bis 1971 | R1–R9 |
| Mixed | Doppel | Mixed | – | Summe ≥ 9 |
| Damen-Doppel | Doppel | Damen | – | Summe ≥ 9 |
| Herren-Doppel | Doppel | Herren | – | Summe ≥ 9 (wird in Akt 6 abgesagt) |

### Prüftabelle

Aktive Anmeldungen je Persona nach dem jeweiligen Akt (FR-06: höchstens 3; Wildcard-Anträge und
Doppel zählen, offene Anfragen nicht).

| Persona | Akt 4 | Akt 5 | Akt 6 | Akt 7 | Prüfung |
|---|---|---|---|---|---|
| CM | Damen A (1); Anfrage Damen-Doppel an Z | 1 | 1 | 1 | passt: R5 in R1–R5; CM+Z Damen 5+8 = 13 |
| MV | – | Mixed allein (1), mit Z zusammengelegt (1) | 1 | 1 | Herr R7 + Dame R8 = 15 im Mixed |
| DS | Damen B (1); Anfrage Mixed an P | + Mixed mit P (2) | 2 | Mixed zurückgezogen (1) | R6 in R6–R9; Dame R6 + Herr R4 = 10 |
| P | Herren A (1) | + Mixed mit DS (2) | 2 | nach Austritt 0 | R4 in R1–R6 |
| Z | Damen B (1), Wildcard Damen A (2) | + Mixed allein, dann mit MV (3) | 3 | 3 | Wildcard: Einzel, Damen A stärker, R8 passt nur wegen Klassierung nicht (FR-08) |
| S | – | Anfrage Herren-Doppel an MV (0) | Herren 55+ (1), wieder ab (0) | 0 | 1958 ≤ 1971; Herr R9 + Herr R7 = 16 |
| Olga | – | – | Damen B von Hand (1) | 1 | R9 bzw. R8 in R6–R9 |

Im Herren-Doppel gibt es bis zur Absage nur die offene Anfrage von S (FR-35: Absagen geht nur
ohne aktive Anmeldungen). Annehmen und Zusammenlegen in Akt 5 liegen vor dem ersten
Anmeldeschluss (FR-48); das Zusammenlegen durch die CM-Leitung ginge auch danach (FR-46).

## Kalender

Ein Akt pro Tag, acht Tage am Stück, Akt 0 am Vortag. Die Regie eröffnet jeden Akt am Morgen im
Chat; am Abend füllt jede Person ihren Formular-Abschnitt aus. Die echten Daten setzt die Regie,
sobald die Besetzung steht.

| Tag | Akt | CM-Daten |
|---|---|---|
| 0 | Vorbereitung (Regie) | – |
| 1 | 1 Einstieg Verwaltung | CM angelegt, Anmeldeschluss = Tag 5 |
| 2 | 2 Einstieg Mitglieder | GV angelegt (Beginn Tag 20, Anmeldeschluss Tag 15) |
| 3 | 3 Eigene Daten und GV | – |
| 4 | 4 CM ist offen | Anmeldung offen |
| 5 | 5 Antworten | letzter Tag der Anmeldung (offen bis und mit 23:59) |
| 6 | 6 Änderungen | Schluss vorbei; CM-Leitung verschiebt ihn auf Tag 10 |
| 7 | 7 Austritt | – |
| 8 | 8 Anmeldeschluss | CM-Leitung schliesst die Anmeldung von Hand |
| 9–10 | Reserve | verschobener Anmeldeschluss Tag 10 |

- **Turnierjahr:** Der Anmeldeschluss muss im Turnierjahr liegen (FR-33). Tag 1 bis Tag 10
  liegen im selben Kalenderjahr; die Probe-CM trägt dieses Jahr. Der Lauf geht nicht über
  Neujahr.
- **Verzug:** Der Austritt (Akt 7) muss vor dem wirksamen Schluss liegen, sonst zieht er das
  Doppel nicht zurück (FR-04). Mit dem Schluss am Tag 10 hält das zwei Tage Verzug aus.
  Verschiebt sich Akt 4 oder 5, verschiebt die CM-Leitung den ersten Schluss auf Ansage der
  Regie um so viele Tage, damit Annehmen und Zusammenlegen davor liegen.
- Ein verschobener Schluss öffnet eine wirksam geschlossene Anmeldung wieder, weil der
  gespeicherte Status *offen* bleibt (FR-33). Der *Spätzünder* sieht am Morgen von Tag 6 darum
  zuerst «geschlossen» und nach dem Verschieben wieder «offen».

## Drehbuch

Jeder Akt besteht aus nummerierten **Einsätzen** (`4.3`). Ein Einsatz hat eine Persona, ein
**Stichwort** (worauf sie wartet), Schritte und eine **Meldung** für den Gruppenchat. Stichwörter:

- **Akt-Beginn:** sobald die Regie den Akt eröffnet hat; diese Einsätze laufen parallel.
- **✅ Nr:** sobald diese Meldung im Chat steht.
- **ab 18 Uhr:** am Abend, damit die anderen vorher fertig sind.

Pro Akt höchstens drei Übergaben nacheinander. **Wenn es stockt:** Kommt eine erwartete Meldung
bis zum Mittag nicht, fragt die Regie nach. Kann die Person nicht, verschiebt die Regie den
Einsatz auf den nächsten Tag; sie übernimmt ihn nicht selbst. Wer einen Einsatz nicht schafft,
meldet `⏭ Nr ausgelassen`; die Spalte «nach ⏭» sagt, ob der nächste trotzdem drankommt.

| Akt | CM-Leitung | Mitgliederverwaltung | Mitglieder |
|---|---|---|---|
| 0 | – | – | Regie richtet ein |
| 1 | Einstieg, Verwaltung, Probe-CM anlegen | Einstieg, Rollen vergeben, Personas anlegen, Briefe | – |
| 2 | – | GV anlegen, Einladung schicken | Einstieg mit Brief, Passkey, Push, Hilfe |
| 3 | GV zusagen | Daten ändern, Antworten, Erinnerung, «Für Fairgate» | eigene Daten, E-Mail, GV |
| 4 | Anmeldung öffnen, selbst anmelden, Anfrage | Mitteilung «CM ist offen», GV-Ort ändern | Einzel, Anfrage, Wildcard, Interclub |
| 5 | Wildcard entscheiden, Nachricht beantworten, zusammenlegen | «sucht Partner» | annehmen, ablehnen, zurückziehen, Nachricht, GV neu antworten |
| 6 | Schluss verschieben, von Hand anmelden, Kategorie absagen | – | Spätanmeldung, Logout, Code per Mail, Push aus/ein |
| 7 | – | Austritt, Wiedereintritt, Sitzungen beenden | Meldung «Doppel zurückgezogen», neu einloggen |
| 8 | Anmeldung schliessen, Liste | Verlauf | eigene Anmeldungen, Datenschutz, Passkey entfernen, Gesamturteil |

## Einsatzliste

Die verbindliche Reihenfolge. Schritte sind durch « · » getrennt und stehen wörtlich so im
Rollenbuch und im Formular. Meldungen ohne Codes, Adressen und echte Namen. «ohne» steht nur bei
Einsätzen der Prio-2/3-Personas und bei Einsätzen, die auf sie warten.

### Akt 0 – Vorbereitung (Regie)

| Nr | Persona | Stichwort | Schritte | Meldung |
|---|---|---|---|---|
| 0.1 | R | Tag 0 | Als Erika Beispiel einloggen (Brief-Code aus der Mail «Brief-Code für die Test-Umgebung») · Persona Rolf Regie mit der eigenen Adresse anlegen und ihr MyTCO-Admin und Mitglieder-Admin geben · als Rolf Regie einloggen und Erika Beispiel alle Admin-Rollen entziehen · Corinne Meister und Markus Verwalter mit den Adressen ihrer Testpersonen anlegen · Markus Verwalter den MyTCO-Admin geben · Briefe der beiden als PDF erzeugen und privat schicken, mit Rollenbuch und Test-Passwort · Kalender mit echten Daten in den Chat | `✅ 0.1 Bühne steht` |

### Akt 1 – Einstieg Verwaltung

| Nr | Persona | Stichwort | Schritte | Meldung | nach ⏭ |
|---|---|---|---|---|---|
| 1.1 | MV | Akt-Beginn | Brief am Laptop öffnen und den QR-Code mit dem Handy scannen · MyTCO auf den Startbildschirm legen · mit dem Code aus dem Brief einloggen · Passkey einrichten · am PC die Verwaltung öffnen und mit dem Code per Mail bestätigen · auf der Seite «Rollen» dir selbst den Mitglieder-Admin und Corinne Meister den CM-Admin geben | `✅ 1.1 Rollen vergeben` | nein: die Regie vergibt die Rollen |
| 1.2 | CM | Akt-Beginn | Brief am Laptop öffnen und den QR-Code mit dem Handy scannen · MyTCO auf den Startbildschirm legen · mit dem Code aus dem Brief einloggen · Passkey einrichten | `✅ 1.2 eingeloggt` | ja |
| 1.3 | CM | ✅ 1.1 | Am PC die Verwaltung öffnen und mit dem Code per Mail bestätigen · die Probe-CM mit Anmeldeschluss laut Kalender anlegen (Anmeldung noch nicht öffnen) · die acht Kategorien aus der Liste anlegen · dich als Kontaktperson eintragen | `✅ 1.3 CM angelegt` | ja |
| 1.4 | MV | ✅ 1.1 | Die Mitglieder-Personas mit den Adressen von der Regie anlegen (Daniela Doppel, Pascal Partner, Zora Zögerlich, Stefan Spät, Olga Ohnehandy mit erfundener Adresse, Weitere Mitglieder) · Briefe als PDF erzeugen und der Regie privat schicken | `✅ 1.4 Briefe an Regie` | nein: Akt 2 wartet |

Zusatz MV (freiwillig): Mitgliederliste am PC nach Name sortieren und nach Ort filtern · Seiteninfo
der Mitgliederliste lesen · Briefe als Serie für alle neuen Mitglieder erzeugen.

### Akt 2 – Einstieg Mitglieder

| Nr | Persona | Stichwort | Schritte | Meldung | nach ⏭ | ohne |
|---|---|---|---|---|---|---|
| 2.1 | DS | Akt-Beginn | Brief am Laptop öffnen und den QR-Code mit dem Handy scannen · MyTCO auf den Startbildschirm legen · mit dem Code aus dem Brief einloggen · Passkey einrichten · Push einschalten · Handy neu starten und MyTCO öffnen: noch angemeldet? · die Hilfe-Seite und den Kontakt für Fragen finden | `✅ 2.1 eingeloggt` | ja | – |
| 2.2 | P | Akt-Beginn | wie 2.1 | `✅ 2.2 eingeloggt` | ja | – |
| 2.3 | Z | Akt-Beginn | wie 2.1 | `✅ 2.3 eingeloggt` | ja | entfällt |
| 2.4 | S | Akt-Beginn | wie 2.1 | `✅ 2.4 eingeloggt` | ja | entfällt |
| 2.5 | W | Akt-Beginn | wie 2.1 | `✅ 2.5 eingeloggt` | ja | entfällt |
| 2.6 | MV | Akt-Beginn | Die GV als Anlass laut Kalender anlegen | `✅ 2.6 GV angelegt` | ja | – |
| 2.7 | MV | ab 18 Uhr | Mitteilung an den Verein «Einladung zur GV» schicken (Push, sonst E-Mail) | `✅ 2.7 Einladung verschickt` | ja | – |
| 2.8 | DS, P, Z, S, W, CM | ✅ 2.7 | Prüfen, ob die Einladung zur GV per Push oder Mail ankam, und die GV auf der Startseite finden | keine | – | – |

### Akt 3 – Eigene Daten und GV

| Nr | Persona | Stichwort | Schritte | Meldung | nach ⏭ | ohne |
|---|---|---|---|---|---|---|
| 3.1 | DS, P, Z, S, W | Akt-Beginn | Telefon und Adresse im Profil ändern · einen Rufnamen setzen · Lizenznummer eintragen · Geschlecht, Jahrgang und Klassierung laut Steckbrief eintragen · E-Mail-Adresse auf die zweite Adresse ändern (nur wer eine hat) · zur GV zu- oder absagen (Zora und Stefan sagen ab, mit Bemerkung) · Antwort einmal ändern · die GV «In den Kalender» übernehmen | `✅ 3.1 <Kürzel> Daten und GV` | ja | – |
| 3.2 | CM | Akt-Beginn | Zur GV zusagen · Geschlecht, Jahrgang und Klassierung laut Steckbrief eintragen | `✅ 3.2 GV zugesagt` | ja | – |
| 3.3 | MV | Akt-Beginn | Bei Zora Zögerlich die Telefonnummer ändern · Antworten zur GV ansehen | `✅ 3.3 Daten geändert` | ja | ohne Z: bei Pascal Partner |
| 3.4 | MV | ab 18 Uhr | Mitteilung zur GV an «noch keine Antwort» schicken · Liste «Für Fairgate» öffnen und die selbst geänderten Angaben abhaken · im Verlauf die Änderungen von heute ansehen | `✅ 3.4 Erinnerung verschickt` | ja | – |

Zusatz MV (freiwillig): eine Datei mit zwei erfundenen Mitgliedern einlesen (Vorlage von der Regie).

### Akt 4 – CM ist offen

| Nr | Persona | Stichwort | Schritte | Meldung | nach ⏭ | ohne |
|---|---|---|---|---|---|---|
| 4.1 | CM | Akt-Beginn | Die Anmeldung der Probe-CM öffnen | `✅ 4.1 CM offen` | nein | – |
| 4.2 | MV | ✅ 4.1 | Mitteilung an den Verein «Die CM ist offen» schicken · Ort der GV ändern | `✅ 4.2 CM angekündigt` | ja | – |
| 4.3 | CM | ✅ 4.1 | Dich im Einzel Damen A anmelden · im Damen-Doppel Zora Zögerlich als Partnerin anfragen | `✅ 4.3 Anfrage an Z` | ja | ohne Z: keine Anfrage |
| 4.4 | DS | ✅ 4.2 | Prüfen, ob die Mitteilung ankam · die passenden Kategorien ansehen · dich im Einzel Damen B anmelden und die Bestätigung prüfen · im Mixed Pascal Partner als Partner anfragen | `✅ 4.4 Anfrage an P` | ja | – |
| 4.5 | P | ✅ 4.2 | Prüfen, ob die Mitteilung ankam · dich im Einzel Herren A anmelden · im Interclub einem Team folgen | `✅ 4.5 angemeldet` | ja | – |
| 4.6 | Z | ✅ 4.2 | Dich im Einzel Damen B anmelden · für Damen A eine Wildcard mit Begründung beantragen · prüfen, ob die Anfrage von Corinne angekommen ist | `✅ 4.6 Wildcard beantragt` | ja | ohne Z: DS beantragt die Wildcard für Damen A |
| 4.7 | W | ✅ 4.2 | Dich in einer passenden Einzel-Kategorie anmelden | `✅ 4.7 angemeldet` | ja | entfällt |

### Akt 5 – Antworten

| Nr | Persona | Stichwort | Schritte | Meldung | nach ⏭ | ohne |
|---|---|---|---|---|---|---|
| 5.1 | P | Akt-Beginn | Die Anfrage von Daniela annehmen | `✅ 5.1 Mixed mit DS` | ja | – |
| 5.2 | Z | Akt-Beginn | Die Anfrage von Corinne ablehnen · im Mixed Stefan Spät anfragen und die Anfrage wieder zurückziehen · dich im Mixed allein anmelden mit «sucht Partner» und einem Kommentar | `✅ 5.2 Z sucht Partner` | ja | ohne Z: entfällt; ohne S: Anfrage an Markus statt Stefan |
| 5.3 | MV | Akt-Beginn | Dich im Mixed allein anmelden mit «sucht Partner» | `✅ 5.3 MV sucht Partner` | ja | ohne Z: im Herren-Doppel |
| 5.4 | DS | Akt-Beginn | Der Turnierleitung eine Frage schreiben | `✅ 5.4 Frage gestellt` | ja | – |
| 5.5 | S | Akt-Beginn | Im Herren-Doppel Markus Verwalter anfragen (Markus antwortet nicht) | `✅ 5.5 Anfrage an MV` | ja | ohne S: Markus fragt Pascal im Herren-Doppel an |
| 5.6 | CM | Akt-Beginn | Den Wildcard-Antrag von Zora entscheiden (bestätigen) | `✅ 5.6 Wildcard entschieden` | ja | ohne Z: Antrag von Daniela ablehnen, mit Grund |
| 5.7 | CM | ✅ 5.2 und ✅ 5.3 | Zora und Markus im Mixed zum Paar zusammenlegen | `✅ 5.7 zusammengelegt` | ja | ohne Z: Markus und Stefan im Herren-Doppel |
| 5.8 | CM | ✅ 5.4 | Die Frage beantworten und als erledigt markieren | `✅ 5.8 Frage beantwortet` | ja | – |
| 5.9 | DS, P, Z, S, W | Akt-Beginn | Die GV ist «zu prüfen» (Ort geändert): Antwort neu bestätigen | keine | – | – |

### Akt 6 – Änderungen

| Nr | Persona | Stichwort | Schritte | Meldung | nach ⏭ | ohne |
|---|---|---|---|---|---|---|
| 6.1 | S | Akt-Beginn | Versuchen, dich im Einzel Herren 55+ anzumelden (die Anmeldung ist geschlossen) | `✅ 6.1 S zu spät` | ja | ohne S: Markus prüft Herren B |
| 6.2 | CM | ✅ 6.1 | Den Anmeldeschluss auf Tag 10 verschieben · Olga Ohnehandy von Hand im Einzel Damen B anmelden · ihre Klassierung auf R8 korrigieren · das Herren-Doppel absagen | `✅ 6.2 Schluss verschoben` | ja | ohne Z: das Damen-Doppel absagen |
| 6.3 | S | ✅ 6.2 | Die Meldung zum abgesagten Herren-Doppel finden · dich im Einzel Herren 55+ anmelden · dich wieder abmelden | `✅ 6.3 S an- und abgemeldet` | ja | ohne S: Markus, im Herren B |
| 6.4 | DS | Akt-Beginn | Die Antwort der Turnierleitung lesen · ausloggen · einen neuen Code per Mail holen und damit einloggen · ausloggen und mit dem Passkey einloggen | `✅ 6.4 DS wieder drin` | ja | – |
| 6.5 | P, Z, W | Akt-Beginn | Push ausschalten und wieder einschalten · freiwillig: am PC mit dem Passkey vom Handy einloggen | keine | – | – |

Zusatz CM (freiwillig): bei Olga Ohnehandy die Anmeldung in ein anderes Einzel verschieben und zurück.

### Akt 7 – Austritt

| Nr | Persona | Stichwort | Schritte | Meldung | nach ⏭ | ohne |
|---|---|---|---|---|---|---|
| 7.1 | MV | Akt-Beginn | Den Austritt von Pascal Partner erfassen | `✅ 7.1 P ausgetreten` | nein | – |
| 7.2 | DS | ✅ 7.1 | Die Meldung zum zurückgezogenen Mixed finden | `✅ 7.2 Meldung da` | ja | – |
| 7.3 | P | ✅ 7.1 | MyTCO öffnen: was siehst du? | `✅ 7.3 P gesperrt` | ja | – |
| 7.4 | MV | ✅ 7.3 | Den Wiedereintritt von Pascal Partner erfassen · die Sitzungen von Stefan Spät beenden | `✅ 7.4 P wieder da` | ja | ohne S: Sitzungen von Daniela beenden |
| 7.5 | P | ✅ 7.4 | Mit einem neuen Code per Mail einloggen | `✅ 7.5 P eingeloggt` | ja | – |
| 7.6 | S | ✅ 7.4 | MyTCO öffnen und wieder einloggen | `✅ 7.6 S eingeloggt` | ja | ohne S: Daniela |

Zusatz MV (freiwillig): Auskunft für Olga Ohnehandy drucken · Olga zum Löschen vormerken und
wieder rückgängig machen.

### Akt 8 – Anmeldeschluss

| Nr | Persona | Stichwort | Schritte | Meldung | nach ⏭ |
|---|---|---|---|---|---|
| 8.1 | CM | Akt-Beginn | Die Anmeldung schliessen · die Anmeldeliste je Kategorie ansehen | `✅ 8.1 CM geschlossen` | ja |
| 8.2 | DS, P, Z, S, W | ✅ 8.1 | Deine Anmeldungen ansehen · im Interclub ein Spiel mit Einzelpartien öffnen · die Datenschutzerklärung finden · den Passkey entfernen | keine | – |
| 8.3 | MV | Akt-Beginn | Im Verlauf die Änderungen der Woche ansehen | keine | – |
| 8.4 | alle | ab 18 Uhr | Formular «Gesamt» ausfüllen | `✅ fertig` | – |

Zusatz MV (freiwillig, als MyTCO-Admin): «Ansicht als …» Mitglied öffnen und wieder beenden.

## Abdeckung

Alle gebauten Funktionen eines Mitglieds und die Schritte der Admins dazu (Stand 23.11.2026,
Inventar aus `src/routes` und den Anforderungen mit Status *umgesetzt*). Die Meldung an das
Mitglied nach einer Änderung durch die Verwaltung (#94) kommt dazu, sobald sie auf `dev` ist
(Einsatz 3.3).

| Bereich | Mitglied | Admin-Schritt | Einsatz |
|---|---|---|---|
| Einstieg | Brief, QR, Einstiegsseite, Startbildschirm, Code, Rufname | Mitglied anlegen, Brief erzeugen | 1.1, 1.2, 1.4, 2.1, 3.1 |
| Einstieg | Neustart: noch angemeldet | – | 2.1 |
| Passkey | einrichten, anmelden, am PC vom Handy, entfernen | – | 1.1, 2.1, 6.4, 6.5, 8.2 |
| Login | Logout, neuer Code per Mail | Sitzungen beenden | 6.4, 7.4, 7.6 |
| Daten | Telefon, Adresse, Lizenznummer, Geschlecht, Jahrgang, Klassierung | «Für Fairgate» abhaken | 3.1, 3.2, 3.4 |
| Daten | E-Mail ändern (zwei Codes, Hinweis an alte Adresse) | – | 3.1 |
| Daten | Meldung nach Änderung durch die Verwaltung (#94) | Daten ändern, Verlauf | 3.3, 3.4, 8.3 |
| Push | ein, aus, wieder ein | – | 2.1, 6.5 |
| Anlass | Startseite, zu-/absagen, Bemerkung, Antwort ändern, «zu prüfen», Kalender | anlegen, Ort ändern, Antworten ansehen | 2.6, 2.8, 3.1, 3.3, 4.2, 5.9 |
| Mitteilung | empfangen (Push oder Mail) | an den Verein, an «noch keine Antwort» | 2.7, 2.8, 3.4, 4.2 |
| CM | Kategorien sehen, Einzel anmelden, Bestätigung | Turnier, Kategorien, Kontaktperson, öffnen | 1.3, 4.1, 4.3–4.7 |
| CM | geschlossen sehen, Spätanmeldung, abmelden | Schluss verschieben | 6.1–6.3 |
| CM | Doppel: anfragen, annehmen, ablehnen, zurückziehen | – | 4.3, 4.4, 5.1, 5.2 |
| CM | allein mit «sucht Partner» | zusammenlegen | 5.2, 5.3, 5.7 |
| CM | Wildcard beantragen | entscheiden | 4.6, 5.6 |
| CM | Turnierleitung schreiben, Antwort lesen | beantworten, erledigt | 5.4, 5.8, 6.4 |
| CM | Meldung «Anfrage verfallen» | Kategorie absagen | 5.5, 6.2, 6.3 |
| CM | – | von Hand anmelden, Klassierung korrigieren | 6.2 |
| CM | eigene Anmeldungen nach Schluss | schliessen, Anmeldeliste | 8.1, 8.2 |
| Interclub | Team folgen, Einzelpartien | – | 4.5, 8.2 |
| Austritt | Meldung «Doppel zurückgezogen», gesperrt, nach Wiedereintritt neu einloggen | Austritt, Wiedereintritt | 7.1–7.5 |
| Rollen | Verwaltung erscheint nach der Vergabe | Rollen vergeben | 1.1, 1.3 |
| Sonst | Hilfe, Kontakt, Datenschutzerklärung | – | 2.1, 8.2 |
| Zusatz | – | sortieren, filtern, Seiteninfo, Serie, Einlesen, verschieben, Auskunft, Löschen vormerken, Ansicht als | Akt 1, 3, 6, 7, 8 |

Nicht dabei: Lizenzen, Resultate, Junioren, CM-Betrieb — nicht gebaut.

## Regeln

- Zuerst alleine versuchen, mit Rollenbuch und Hilfe in MyTCO. Erst dann im Chat fragen.
- Nur die eigene Persona benutzen.
- Nach jedem Einsatz die Meldung aus dem Rollenbuch in den Chat kopieren.
- Im Chat sagen, bei welchem Einsatz es hakt, gern mit Screenshot. Kein Code und keine Adresse
  auf dem Screenshot und in den Meldungen; sonst privat an den Projektleiter. Im Gruppenchat
  sehen alle die Telefonnummern der anderen.
- Test-Passwort, Brief und Rollenbuch kommen privat vom Projektleiter. Die Mails von MyTCO kommen
  echt an die eigene Adresse.
- Der Projektleiter notiert jede Frage als Befund, auch wenn sie sich sofort klären lässt.

## Chat-Nachrichten

**Begrüssung**

```text
Hoi zäme 👋 Willkommen zum Probelauf von MyTCO!
8 Tage, jeden Tag ein Akt, etwa 15 Minuten. Jede und jeder spielt eine erfundene Person,
alles steht in deinem Rollenbuch (kommt privat von mir).
Wenn du dran bist: machen, dann deine Meldung aus dem Rollenbuch hier reinkopieren.
Regel Nr. 1: zuerst alleine probieren, mit Rollenbuch und Hilfe in MyTCO.
Kein Code und keine Adresse in den Chat. Hier sehen alle eure Nummern.
Deine Mail-Adresse brauche ich, weil MyTCO echte Mails schickt; nach dem Lauf wird sie gelöscht.
Das Formular am Abend ist ohne Namen, ich sehe aber, welche Rolle geantwortet hat.
```

**Akt beginnt**

```text
🎬 Akt [N] beginnt: [Titel]. Wer im Rollenbuch «Akt-Beginn» stehen hat, legt los.
Formular am Abend: [Link]
```

**Meldungen:** `✅ <Nr> <Kurztext>` wie im Rollenbuch, oder `⏭ <Nr> ausgelassen`.

**Nachfragen (bis Mittag keine Meldung)**

```text
[Rolle], kommst du heute noch zu Einsatz [Nr]? Sonst schieben wir ihn auf morgen.
```

**Erinnerung**

```text
Kurze Erinnerung: Formular für Akt [N] bitte bis heute Abend. Merci!
```

**Dank**

```text
Merci vielmal fürs Mitspielen! Wir arbeiten eure Rückmeldungen ein.
Eure Mail-Adressen lösche ich mit dem Neuaufsetzen von Test.
```

## Formular

Ein Google Formular für den ganzen Probelauf, ohne Namen und ohne E-Mail-Adresse. Es fragt
Geräte, Persona und Akt und springt in den Abschnitt «Persona – Akt N». Dort steht pro Schritt
ein Raster «Hat es funktioniert?» (ging / ging mit Mühe / ging nicht / nicht gemacht) und eines
«Wie gut gelöst?» (gut gelöst / geht so / umständlich), dazu «Kam die Mail an?» und ein Freitext.
Nach Akt 8 folgt der Abschnitt «Gesamt».

Gebaut wird es vom Skript [`testgruppe-formular.gs`](testgruppe-formular.gs), das die Schritte
wörtlich aus den Rollenbüchern enthält. So legt der Projektleiter es an:

1. [script.google.com](https://script.google.com) öffnen, «Neues Projekt».
2. Den ganzen Inhalt von `testgruppe-formular.gs` einfügen, speichern.
3. Oben die Funktion `erstelleFormular` wählen und «Ausführen»; die Berechtigungen erlauben.
4. Im Ausführungsprotokoll stehen drei Links: Formular (für die Testpersonen), Bearbeiten,
   Antwort-Tabelle.
5. Den Link der Antwort-Tabelle an Claude geben, einmal selbst eine Probe-Antwort abschicken.

Nach der Auswertung Formular und Tabelle löschen.

## Auswertung

Claude liest die Antwort-Tabelle über den Zugang zu Google-Tabellen und wertet nach jedem Akt
aus, damit Fehler noch im Lauf behoben werden. Pro Persona, Akt und Schritt die Anzahl je
Antwort; Freitext und Fragen aus dem Chat als Befunde ohne Namen, eingeordnet als *Doku fehlt*,
*App ändern* oder *passt*, mit Ziel (Doku, Issue, [Beobachtungen](beobachtungen.md)).

### Probelauf

Noch nicht gelaufen.

| Persona | Schritt | ging | mit Mühe | ging nicht | nicht gemacht | gut gelöst | geht so | umständlich |
|---|---|---|---|---|---|---|---|---|
| – | – | – | – | – | – | – | – | – |

## Zusammensetzung

Folgt vor dem Lauf aus der Liste in `intern/`: Anzahl, iPhone/Android/PC, Altersgruppen, ob ein
älteres Handy dabei ist. Als älter gilt ein iPhone mit iOS 16 oder 17 oder ein Android-Handy mit
Android 9 bis 11 ([Testkonzept](testkonzept.md#testgruppe)). Keine Namen; welche Person welche
Persona spielt, steht nur in `intern/`.

## Später: Lauf zum CM-Betrieb

Sobald Gruppen, Tableaus und Resultate gebaut sind (#75–#77), spielt dieselbe Gruppe einen
zweiten Lauf: Auslosung übernehmen, Resultate melden und bestätigen, Rangliste.
