# Design: Probelauf mit Rollen auf Test (ersetzt Lauf 1)

Stand 23.11.2026, Brainstorming mit dem Projektleiter (PL). Ersetzt den Lauf 1 aus
`docs/testgruppe.md` und das Design `docs/superpowers/specs/2026-11-04-testgruppe-design.md`
in den Punkten, die hier anders stehen. *(Claude)* = Entscheid von Claude, vom PL nicht
ausdrücklich bestätigt.

## Absicht

Eine Testgruppe spielt die ganze App durch, nicht nur den Einstieg. Jede Person übernimmt eine
Rolle; ein Drehbuch stellt eine Saison mit Clubmeisterschaft nach, jede Person hat ihr Rollenbuch.
Rückmeldung gibt es pro Schritt: «hat funktioniert?» und «gut gelöst?», dazu Freitext zum
Produkt. Ziel: Fehler, umständliche Stellen und fehlende Erklärungen finden, bevor alle
Mitglieder den Brief bekommen.

Ausgangslage: 3 Testpersonen stehen fest (1 iPhone, 2 Android). An der AOGV am Donnerstag,
26.11.2026, kommen evtl. weitere dazu, und der PL fragt dort die künftige Mitgliederverwaltung
und die CM-Leitung an. Der PL treibt die nötigen Personen auf; das Drehbuch sagt, wie viele es
braucht und welche Rolle bei Mangel wegfällt.

## Ziele

- Jede gebaute Funktion, die ein Mitglied, der Mitglieder-Admin oder der CM-Admin braucht,
  kommt im Drehbuch mindestens einmal vor, auf iPhone, Android und PC.
- Die Rollen spielen zusammen: Was eine Rolle auslöst (Partner-Anfrage, Wildcard-Entscheid,
  Mitteilung, Austritt), erlebt eine andere als Meldung, Push oder Mail.
- Echte Mails: Code-Mails, Meldungen und Mitteilungen kommen im Postfach der Testperson an;
  der Lauf zeigt, ob sie ankommen und nicht im Spam landen.
- Rückmeldung pro Schritt in zwei Dimensionen (funktioniert / gut gelöst) und als Freitext,
  ohne Namen, auf dem Handy in wenigen Minuten pro Akt.
- Claude kann die Antworten selbst lesen und auswerten.

## Nicht-Ziele

- Kein Test von Live und der endgültigen Adresse; diese Punkte aus «Bereit für Lauf 1»
  wandern in die Checkliste vor 1.0.0.
- Kein CM-Betrieb (Gruppen, Tableaus, Resultate): nicht gebaut (#75–#79, blockiert durch #88).
  Kommt später als zweiter Lauf.
- Kein Ersatz für die [Checkliste vor dem Release](../../testkonzept.md#checkliste-vor-dem-release).
- Kein Feedback-Knopf in der App.

## Anti-Ziele (wäre ein Misserfolg, auch wenn es läuft)

- Der PL erklärt im Chat, was die App selbst erklären müsste; dann misst der Lauf nichts.
  Regel bleibt: zuerst alleine, dann fragen; jede Frage ist ein Befund.
- Zu viel Aufwand für Freiwillige: ein Akt mehr als etwa 15 Minuten pro Person, oder das
  Formular mehr als etwa 3 Minuten pro Akt.
- Echte Daten auf Test ausser der vereinbarten Ausnahme (Mail-Adresse, siehe Datenschutz);
  Namen von Testpersonen im Repo.

## Voraussetzungen für den Start

- [ ] **Echter Mailversand auf Test.** Weg wird entschieden, wenn der Lauf näher rückt (PL):
  entweder K-11 (Absender `mytco@tcolten.ch` mit DNS-Einträgen) oder ein Übergangs-Absender
  bei einem Anbieter in CH/EU (DS-01) mit einer Domain des PL, nur für Test. Laufende Kosten
  und neues Konto brauchen dann die Freigabe des PL.
- [ ] **Erlaubt-Liste statt Umleitung auf Test** (Code, eigenes Issue nach Freigabe des PL):
  Mails an freigegebene Adressen (die Testpersonen) gehen hinaus, alle anderen werden wie heute
  an `MAIL_NUR_AN` umgeleitet. Sonst gingen Mails an die erfundenen `@example.org`-Adressen,
  kämen zurück und schadeten dem Ruf des Absenders. Ohne echten Versand entfällt sie.
- [ ] **Datenschutz-Nachtrag** (siehe unten) vor der Erlaubt-Liste.
- [ ] **Test neu aufsetzen** kurz vor Akt 0 (Zähler `betrieb/test-neu-aufsetzen`); danach die
  Interclub-Daten 2026 neu einlesen (Claude), damit «Team folgen» geht. Nach dem Lauf Test
  nochmals neu aufsetzen und die Demo-Daten (CM 2027, GV, Interclub) wieder laden.
- [ ] Test-Passwort an die Testpersonen (Entscheid PL, steht in `testgruppe.md`).
- [ ] Liste in `intern/` mit Zuordnung Person → Persona, Gerät, Mail-Adresse (PL).
- [ ] Formular angelegt und einmal selbst durchgespielt.
- [ ] Hilfe-Seite (#47) gebaut — ist sie es nicht, fällt der Hinweis auf die Hilfe weg.

## Rahmen

- **Umgebung:** nur Test, mit erfundenen Personas. Testpersonen geben ausser ihrer
  Mail-Adresse keine eigenen Daten ein. Live bleibt aus.
- **Zeit:** Die Zeit auf Test ist echt. Die Regie legt in Akt 0 einen Kalender mit echten
  Daten fest (Öffnen, Frist, verschobene Frist, Anmeldeschluss). Der Austritt liegt vor dem
  Anmeldeschluss, sonst zieht er die Doppel-Anmeldung nicht zurück (FR-04). Die Daten halten
  einen Tag Verzug aus: der verschobene Anmeldeschluss liegt mindestens zwei Tage nach dem
  geplanten Akt 7, und der ganze Lauf liegt im selben Kalenderjahr (FR-33), also nicht über
  Neujahr *(Claude)*. Start nach der AOGV
  *(Claude)*.
- **Turnier:** Nach dem Neuaufsetzen gibt es kein Turnier; der CM-Admin legt eine Probe-CM an.
  Der Anmeldeschluss muss im Turnierjahr liegen (FR-33): Läuft der Lauf im Dezember 2026, ist es
  die CM 2026, im Januar 2027 die CM 2027. Der Kalender der Regie legt Jahr und Daten fest
  (ein Turnier pro Jahr, nicht löschbar — nach dem Lauf setzt Test neu auf).
- **Mitteilung zur CM:** Eine eigene gibt es nicht (FR-42: nur Anlass oder Verein, nur
  Mitglieder-Admin). «Die CM ist offen» schickt der Mitglieder-Admin als Mitteilung an den
  Verein, wie im echten Betrieb *(Claude)*.
- **Während des Laufs:** kein `make test-pruefung`, keine Mitteilungen ausserhalb des Drehbuchs,
  `betrieb/test-neu-aufsetzen` nicht hochzählen. Merges nach `dev` liefern weiter aus (Daten
  bleiben), damit Befunde im Lauf behoben werden können *(Claude)*.
- **Nur Gebautes:** Ein Schritt, dessen Funktion beim Start fehlt, fällt weg.
- **Texte:** kurz, Chat-Texte in Mundart (Stil der bestehenden Chat-Nachrichten).

## Entscheide des PL

| Frage | Entscheid |
|---|---|
| Verhältnis zu Lauf 1 | **Ersetzt Lauf 1.** Der Einstieg (Brief, QR, Startbildschirm, Login, Passkey) wird Akt der Personas auf Test. Kein eigener Lauf auf Live vor 1.0.0 |
| Ablauf | **Verteilt** in Akten **8 Akte in 8 Tagen**, ein Akt pro Tag, plus Akt 0 vorher. Der PL gibt jeden Akt im WhatsApp-Gruppenchat frei |
| Admin-Rollen | **Zuerst die künftigen echten Admins** (Mitgliederverwaltung, CM-Leitung) an der AOGV fragen; sonst Testpersonen mit PC |
| Admins als Mitglieder | **Alle Admins sind auch Mitglieder** und testen die Mitglieder-Funktionen mit (z. B. CM-Admin meldet sich selbst an) |
| Personen | Drehbuch nennt die nötige Anzahl und gibt den Rollen **Prioritäten**; bei Mangel fallen die unwichtigsten weg |
| Testdaten | **Test vor dem Start neu aufsetzen** |
| Umfang | **Alle Funktionen eines Mitglieds** und die verbundenen Admin-Schritte; Admin-Funktionen ohne Mitglieder-Bezug als freiwilliger Zusatz, wenn sich Leute für die Admin-Rollen finden |
| Mails | **Echte Mails, nicht der Mail-Fänger.** Weg (K-11 oder Übergangs-Absender) wird später entschieden |
| Ablauf im Akt | **Rollenbuch pro Person wie im Theater**; im Chat meldet man den erledigten Einsatz, damit der nächste drankommt |
| Feedback | **Google Formular** mit Abschnitten (Variante A); Claude erstellt es und wertet es aus |

## Varianten (erwogen)

**Feedback-Werkzeug**

- **A — Google Formular mit Abschnitten (gewählt).** Ein Link für alle; Einstieg wählt Persona
  und Akt, das Formular springt in den passenden Abschnitt. Pro Schritt zwei Raster, dazu
  Freitext. Kein Code, mobil tauglich. Nachteil: Rückmeldung erst nach dem Akt; dafür bleibt
  WhatsApp für Sofortprobleme.
- **B — Knopf «Rückmeldung» in MyTCO, nur auf Test.** Verworfen: neue Funktion mit
  Datenschutz-Nachtrag und eigenem Issue, keine Übersicht pro Schritt. Später möglich.
- **C — Google-Tabelle zum Abhaken.** Verworfen: mühsam auf dem Handy, alle sähen alle Antworten.

**Verhältnis zu Lauf 1:** zusätzlich / ersetzt / Lauf 1 auf Live erweitern. Gewählt: ersetzt.

**Ablauf:** verteilt / ein gemeinsamer Abend / kombiniert. Gewählt: verteilt — realistisch
(Push und Mail kommen unterwegs) und misst «alleine zurechtkommen».

**Testdaten:** neu aufsetzen / behalten. Gewählt: neu aufsetzen — der CM-Admin legt das
Turnier selbst an, und Mitteilungen an alle treffen nur die Personas.

**Formular erstellen:** Claude hat keinen Zugriff auf Google Formulare (nur Drive, Tabellen,
Docs). Gewählt *(Claude)*: ein Google-Apps-Script, das Formular, Abschnitte, Raster, Sprünge
und die verknüpfte Antwort-Tabelle anlegt; der PL führt es einmal unter script.google.com aus.
Alternative: PL baut es von Hand nach Vorlage (etwa 30 Minuten, fehleranfällig bei Sprüngen).

## Rollen und Personas

Jede Person spielt genau eine Persona. Admin-Personas sind zugleich Mitglieder. Der Aussteiger
ist nie eine Admin-Persona (sein Login wird gesperrt).

| Prio | Persona | Rolle | Gerät | Als Mitglied | Zusammenspiel |
|---|---|---|---|---|---|
| 1 | **CM-Leitung** | CM-Admin + Mitglied | PC + Handy | GV zusagen, Einzel anmelden, schickt der *Zögerin* eine Doppel-Anfrage | legt die CM an, entscheidet die Wildcard, beantwortet Nachrichten, legt zusammen, sagt eine Kategorie ab |
| 1 | **Mitgliederverwaltung** | Mitglieder-Admin + Mitglied (solange niemand aus der echten Mitgliederverwaltung mitmacht: dazu MyTCO-Admin) | PC + Handy | GV zusagen, Doppel allein mit «sucht Partner» | vergibt in Akt 1 auf der Seite *Rollen* sich den Mitglieder-Admin und der CM-Leitung den CM-Admin; legt die Personas an, schickt Mitteilungen, erfasst Austritt und Wiedereintritt des *Partners* |
| 1 | **Doppel-Sucherin** | Mitglied | iPhone | Einzel und Doppel: schickt dem *Partner* eine Anfrage, schreibt der Turnierleitung | bekommt nach dem Austritt des Partners die Meldung |
| 1 | **Partner** | Mitglied | Android | nimmt die Anfrage an, folgt einem Interclub-Team | tritt in Akt 7 aus und wieder ein (durch die Mitgliederverwaltung) |
| 2 | **Zögerin** | Mitglied | Android | lehnt die Anfrage der CM-Leitung ab, beantragt eine Wildcard, zieht eine eigene Anfrage zurück, sucht allein einen Partner | Wildcard-Entscheid und geänderte Daten kommen als Meldung |
| 3 | **Spätzünder** | Mitglied | beliebig, gern älteres Handy | schickt in der kleinen Doppelkategorie eine Anfrage, die durch die Absage verfällt; meldet sich erst nach der verschobenen Frist an und wieder ab, holt einen neuen Code per Mail | Sitzungen werden von der Verwaltung beendet |
| 4+ | **weitere Mitglieder** | Mitglied | beliebig | Einzel anmelden, Anlass, Push | füllt die Listen; mehr Geräte und Mailanbieter |

**Besetzung Stand 23.11.2026** (ohne Namen, Zuordnung nur in `intern/`): ein Mitglied mit
iPhone → *Doppel-Sucherin*; ein Mitglied mit Android → *Partner*; die künftige CM-Admin-Person →
*CM-Leitung*; die künftige MyTCO-Admin-Person → *Mitgliederverwaltung* (mit MyTCO-Admin, testet
dazu die Seite *Rollen*); PL → Regie. Damit ist Prio 1 besetzt. Gesucht (an der GV):
*Zögerin* (Android), *Spätzünder* (gern älteres Handy), gern jemand aus der echten
Mitgliederverwaltung und weitere Mitglieder. Kommt jemand aus der Mitgliederverwaltung dazu,
übernimmt er die *Mitgliederverwaltung*; die MyTCO-Admin-Person spielt dann eine eigene Persona
*MyTCO-Admin* (Rollen vergeben, *Ansicht als …*, sonst wie «Weiteres Mitglied») *(Claude)*.

**Anzahl:** mindestens **4 Personen** (Prio 1), vollständig **5** (Prio 1–2), gut **6**
(Prio 1–3). Dazu der PL als Regie. Geräte: mindestens ein iPhone und ein Android unter den
Mitglieder-Personas, zwei PCs für die Admins.

**Fällt eine Rolle weg:**

- ohne *Zögerin*: Die *Doppel-Sucherin* beantragt die Wildcard; «Anfrage ablehnen» und
  «zurückziehen» fallen weg, die CM-Leitung meldet sich nur im Einzel an; «sucht Partner» und
  Zusammenlegen macht die Mitgliederverwaltung mit dem *Spätzünder*.
- ohne *Spätzünder*: Die Mitgliederverwaltung (als Mitglied) schickt die Anfrage in der kleinen
  Doppelkategorie, bekommt die Meldung nach der Absage und meldet sich nach der verschobenen
  Frist an; Sitzungen beenden trifft die *Doppel-Sucherin*.
- Persona *ohne Handy* spielt niemand; sie wird nur angelegt und von Hand angemeldet.
- ohne eine der Prio-1-Rollen: kein Lauf.
- **weitere Mitglieder** (Prio 4+) bekommen ein gemeinsames Rollenbuch «Weiteres Mitglied» nur
  mit Einsätzen auf das Stichwort «Akt-Beginn» (Einstieg, Daten, GV, Einzel anmelden, Push,
  Interclub); niemand wartet auf sie. Im Formular eine eigene Persona «Weiteres Mitglied».

**Besetzung zuschneiden** *(Claude)*: Einsatzliste und Rollenbücher werden für die volle
Besetzung (Prio 1–3) geschrieben; jeder Einsatz einer Prio-2/3-Persona nennt, wer ihn ohne sie
übernimmt oder ob er entfällt, und jedes Stichwort auf einen solchen Einsatz nennt das Ersatz-
Stichwort. Steht die Besetzung fest (nach der AOGV), schneidet Claude Einsatzliste, Rollenbücher
und Formular-Skript auf sie zu, bevor die Rollenbücher verschickt werden.

Namen, Jahrgang, Geschlecht und Klassierung der Personas legt der Bauende fest, sodass
Kategorien, Doppel und Wildcard passen (FR-06, FR-08). Wer welche Persona spielt, steht nur in
`intern/`.

## Umfang (Entscheid PL)

**Alle Funktionen, die ein normales Mitglied tätigen kann, und die damit verbundenen Schritte
der Admins** sind Pflicht. Admin-Funktionen ohne Bezug zu einer Mitglieder-Aktion (Einlesen,
Auskunft drucken, Mitgliederliste sortieren/filtern, Seiteninfo, Briefe als Serie, Löschen
vormerken und rückgängig, Anfrage löschen, Partner ändern) sind ein **freiwilliger Zusatz**
für die Admin-Personas: nur, wenn sich Testpersonen finden, die die Admin-Rollen übernehmen
(bzw. die echten Admins Zeit haben). Im Formular eigener Raster «Zusatz», darf leer bleiben.

## Abdeckung

Inventar aus `src/routes` und `docs/anforderungen/anforderungen.md` (Status `umgesetzt`),
Stand 23.11.2026. Der Bauende gleicht es beim Start nochmals ab (neu gebaute Funktionen
dazu, z. B. #94 Meldung bei Änderung durch die Verwaltung, sobald auf `dev`).

| Bereich | Mitglied | Verbundener Admin-Schritt | Akt | Persona |
|---|---|---|---|---|
| Einstieg | Brief am Laptop, QR, Einstiegsseite, Startbildschirm, Code, Angaben ergänzen | Mitglied anlegen, Brief erzeugen (MV) | 1, 2 | alle |
| Einstieg | Neustart: noch angemeldet | — | 2 | alle |
| Einstieg | Passkey einrichten / anmelden / entfernen; am PC mit Passkey vom Handy (freiwillig) | — | 2, 6, 8 | alle |
| Einstieg | Logout, neuer Code per Mail | Sitzungen beenden, neuer Brief-Code (MV) | 6, 7 | S, DS |
| Daten | Telefon, Adresse, Lizenznummer, Rufname, Klassierung | Liste «Für Fairgate» abhaken (MV) | 3 | alle |
| Daten | E-Mail ändern (zwei Codes, Hinweis an alte Adresse) | — | 3 | wer eine zweite echte Adresse hat |
| Daten | Meldung nach Änderung durch die Verwaltung (sobald #94 auf `dev`) | Daten eines Mitglieds ändern, Verlauf (MV) | 3 | Z |
| Push | Push ein-/ausschalten, gefolgte Teams im Profil | — | 2, 6 | alle |
| Anlass/GV | auf der Startseite sehen, zu-/absagen, Antwort ändern, «In den Kalender» | GV anlegen, ändern, Antworten ansehen, Mitteilung an «noch keine Antwort» (MV) | 2, 3 | alle |
| Mitteilung | Mitteilung an den Verein empfangen (Push oder Mail) | Mitteilung an den Verein (MV) | 2, 4 | alle |
| CM | passende Kategorien sehen, Einzel anmelden, Bestätigung per Mail | Turnier und Kategorien anlegen, öffnen (CM) | 1, 4 | alle |
| CM | sich abmelden; höchstens 3 Anmeldungen | — | 6 | S |
| CM | Doppel: Partner suchen, Anfrage, annehmen | — | 4, 5 | DS, P |
| CM | Doppel: Anfrage ablehnen | — | 5 | Z |
| CM | Doppel: Anfrage zurückziehen | — | 5 | Z |
| CM | Doppel allein mit «sucht Partner» | zwei Partnersuchende zusammenlegen (CM) | 5 | Z, MV |
| CM | Wildcard beantragen | Wildcard bestätigen oder ablehnen mit Grund (CM) | 4, 5 | Z |
| CM | der Turnierleitung schreiben, Antwort lesen | Nachricht beantworten, erledigt (CM) | 5, 6 | DS |
| CM | Frist verschoben: Spätanmeldung | Frist ändern (CM) | 6 | S |
| CM | — (Mitglied ohne Handy) | Anmeldung von Hand, Klassierung korrigieren (CM) | 6 | Persona ohne Login |
| CM | Meldung «Anfrage verfallen», weil die Kategorie abgesagt wurde (Absagen geht nur ohne aktive Anmeldungen, FR-35) | Kategorie absagen (CM) | 5, 6 | S |
| CM | eigene Anmeldungen nach Schluss | Anmeldung schliessen, Anmeldeliste (CM) | 8 | alle |
| Interclub | Teams, Spiele, Einzelpartien, Team folgen, Push bei Endstand | — | 4, 8 | P, DS |
| Austritt | Meldung «Doppel zurückgezogen» | Austritt erfassen (MV) | 7 | P → DS |
| Austritt | nach Wiedereintritt neu einloggen | Wiedereintritt (MV) | 7 | P |
| Sonst | Hilfe-Seite, Kontakt für Fragen, Datenschutzerklärung | — | 2, 8 | alle |
| Rollen | Admin-Bereich erscheint nach der Vergabe | Rollen vergeben auf der Seite *Rollen* (MyTCO-Admin, hier MV) | 1 | MV, CM |

Abkürzungen: CM = CM-Leitung, MV = Mitgliederverwaltung, DS = Doppel-Sucherin, P = Partner,
Z = Zögerin, S = Spätzünder.

**Zusatz Admins (freiwillig):** MV — Mitgliederliste sortieren und filtern, Seiteninfo lesen
(Akt 1); Briefe als Serie (Akt 1); Mitgliederliste einlesen (Datei mit erfundenen Mitgliedern,
Akt 3); Auskunft drucken (Akt 7); Persona ohne Login zum Löschen vormerken und rückgängig machen
(Akt 7). CM — Partner einer Anmeldung ändern, eine Anfrage löschen (Akt 6). MV (als MyTCO-Admin) — *Ansicht als …* (Akt 8).

**Nicht dabei:** Lizenzen, Resultate, Junioren, CM-Betrieb — nicht gebaut.

## Drehbuch (Akte)

**Ein Akt pro Tag, Lauf 8 Tage** (Entscheid PL) plus Akt 0 vorher; echte Daten aus dem
Kalender der Regie. Die Regie eröffnet den Akt am Morgen im Gruppenchat; am Abend füllt jede
Person ihren Formular-Abschnitt aus. Höchstens etwa 15 Minuten pro Person und Akt (ohne Zusatz).

**Einsätze wie im Theater (Entscheid PL):** Jeder Akt besteht aus nummerierten **Einsätzen**
(z. B. `4.3`). Ein Einsatz hat: Persona, **Stichwort** (worauf sie wartet: Akt-Beginn oder die
Chat-Meldung eines früheren Einsatzes), Handlung (Schritte) und die **Meldung**, die sie danach in
den Gruppenchat schreibt (z. B. «✅ 4.3 Doppel-Anfrage an Partner geschickt»). Wer die Meldung
liest, deren Einsatz als Stichwort im eigenen Rollenbuch steht, ist dran. Einsätze mit dem
Stichwort «Akt-Beginn» laufen parallel, alles andere nacheinander. Pro Akt höchstens drei
Übergaben nacheinander; wo eine Antwort auf eine andere Person wartet (Anfrage annehmen,
Wildcard entscheiden, Nachricht beantworten), kommt sie wenn möglich erst im nächsten Akt
*(Claude)*. Die Meldung nennt nur Nummer
und Persona, keine Codes, Adressen oder echten Namen.

**Wenn es stockt** *(Claude)*: Kommt eine erwartete Meldung bis zum Mittag nicht, fragt die Regie
nach; kann die Person nicht, übernimmt die Regie den Einsatz nicht selbst, sondern verschiebt ihn
auf den nächsten Tag. Was eine Person nicht schafft, meldet sie mit «⏭ 4.3 ausgelassen», damit der
nächste Einsatz trotzdem drankommt, wo das fachlich geht; das Rollenbuch sagt beim Stichwort, ob
es auch nach «ausgelassen» weitergeht.

Die Tabelle unten ist die Übersicht pro Akt; die verbindliche Reihenfolge steht in der
**Einsatzliste** (alle Einsätze in Reihenfolge, Sicht der Regie), aus der die Rollenbücher
entstehen.

| Akt | CM-Leitung | Mitgliederverwaltung | Mitglieder-Personas |
|---|---|---|---|
| **0 Vorbereitung** (Regie) | — | — | Regie legt die zwei Admin-Personas an, gibt der *Mitgliederverwaltung* den MyTCO-Admin (die übrigen Rollen vergibt sie in Akt 1 selbst), schickt die Brief-PDFs; entzieht den Konten aus den Testdaten (`@example.org`) alle Admin-Rollen, nachdem sie sich selbst MyTCO-Admin gegeben hat; legt den Kalender fest |
| **1 Einstieg Verwaltung** | Einstieg als Mitglied (Brief, QR, Startbildschirm, Code, Passkey), Verwaltung bestätigen, Probe-CM mit Einzel- und Doppelkategorien anlegen, dazu eine kleine Doppelkategorie zum Absagen (noch zu) | Einstieg als Mitglied, Verwaltung bestätigen, Mitglieder-Personas anlegen (dazu eine Persona *ohne Handy*), Brief-PDFs erzeugen und der Regie schicken | — |
| **2 Einstieg Mitglieder** | — | GV als Anlass anlegen, Mitteilung an den Verein «Einladung GV» | Brief, QR, Startbildschirm, Code, Angaben ergänzen, Rufname, Passkey, Push ein, Hilfe-Seite ansehen, Neustart; GV auf der Startseite sehen |
| **3 Eigene Daten und GV** | als Mitglied: GV zusagen | Antworten ansehen, Mitteilung an «noch keine Antwort», Daten der *Zögerin* ändern, Liste «Für Fairgate» abhaken | Telefon, Adresse, Lizenznummer, Klassierung ändern; E-Mail ändern (wer kann); GV zu- oder absagen, Antwort ändern, «In den Kalender» |
| **4 CM ist offen** | Anmeldung öffnen; als Mitglied Einzel anmelden und der *Zögerin* eine Doppel-Anfrage schicken | Mitteilung an den Verein «Die CM ist offen» | passende Kategorien ansehen, Einzel anmelden, Bestätigung prüfen; DS schickt P eine Anfrage; Z beantragt eine Wildcard; P folgt einem Interclub-Team |
| **5 Antworten** | Wildcard entscheiden, Nachricht der DS beantworten, Z und MV als Doppel zusammenlegen | als Mitglied Doppel allein mit «sucht Partner» | P nimmt an; Z lehnt die Anfrage der CM-Leitung ab, schickt S eine Anfrage und zieht sie zurück, meldet sich dann allein mit «sucht Partner» an; DS schreibt der Turnierleitung; S schickt DS in der kleinen Doppelkategorie eine Anfrage (DS antwortet nicht) |
| **6 Änderungen** | Frist verschieben, Persona *ohne Handy* von Hand anmelden, ihre Klassierung korrigieren, eine kleine Kategorie absagen | — | DS liest die Antwort; S bekommt die Meldung zur abgesagten Kategorie (Anfrage aus Akt 5 an DS, die DS nicht beantwortet), meldet sich nach der verschobenen Frist im Einzel an und wieder ab; Logout, neuer Code per Mail, Anmelden mit Passkey; Push aus und wieder ein |
| **7 Austritt** | — | Austritt des *Partners* erfassen, danach Wiedereintritt; Sitzungen der *Spätzünders* beenden | DS sieht «Doppel zurückgezogen»; P loggt sich nach dem Wiedereintritt neu ein; S loggt sich neu ein |
| **8 Anmeldeschluss** | Anmeldung schliessen, Anmeldeliste ansehen | Verlauf ansehen | eigene Anmeldungen ansehen; Interclub-Einzelpartien ansehen; Datenschutzerklärung finden; Passkey entfernen; Formular «Gesamt» |

Der Austritt (Akt 7) liegt vor dem Anmeldeschluss (Akt 8), sonst zieht er das Doppel nicht
zurück (FR-04). Fehlt eine Prio-2/3-Persona, übernimmt eine andere ihre Schritte nach den Regeln
unter «Fällt eine Rolle weg». Feinverteilung und Wortlaut legt der Bauende fest; Bedingung:
jede Zeile der Abdeckung kommt vor.

## Rollenbuch pro Person (Entscheid PL)

Jede Testperson bekommt **ein Dokument für den ganzen Ablauf**, wie ein Rollenbuch im Theater:
klar, was sie wann tut. Aufbau:

1. **Kopf:** wer du bist (Persona mit Steckbrief und Eigenheit), deine Geräte, der Kalender
   (Tag → Akt), die Regeln (zuerst alleine, Hilfe in der Fusszeile, nur die eigene Persona,
   Screenshots ohne Code und Adresse), Link zum Formular.
2. **Pro Akt:** deine Einsätze in Reihenfolge, je mit *Stichwort* («Du bist dran, wenn im Chat
   steht: ✅ 4.2 …»), *Handlung* (nummerierte Schritte ohne Lösungsweg — «Melde dich im Doppel
   an», nicht «tippe auf …») und *Meldung* (was du danach in den Chat schreibst, zum Kopieren).
   Am Ende des Akts: «Formular, Abschnitt <Persona> – Akt N».
3. **Zusatz (freiwillig)** bei den Admin-Personas, pro Akt getrennt.

Admin-Personas haben ein Rollenbuch, das Admin- und Mitglieder-Einsätze zusammen enthält.

**Form und Versand** *(Claude)*: Quelle ist eine Markdown-Datei im Repo mit einem Abschnitt pro
Persona, erzeugt aus der Einsatzliste. Die Testpersonen bekommen ihr Rollenbuch als PDF (oder
Google-Dokument), privat vom PL; welches Format, entscheidet der PL beim Versand. Der Chat bleibt
für Eröffnung, Meldungen und Fragen; die Begrüssung, Erinnerung und Dank aus `testgruppe.md`
bleiben. Die Brief-PDFs der Personas schickt der PL privat.

## Formular

Ein Google Formular für den ganzen Probelauf, ohne Namen und ohne E-Mail-Adresse («E-Mail-Adressen
erfassen» aus, keine Begrenzung auf eine Antwort pro Person). Über jedem Freitext: «Bitte keine
Namen».

1. **Einstieg:** Persona (Liste, mit «Weiteres Mitglied»), Akt (1–8), Geräte (Mehrfachauswahl
   iPhone / Android / PC; Admins nutzen PC und Handy im selben Akt). Sprung in den
   Abschnitt «Persona × Akt»; Akt 8 endet mit «Gesamt». Pro Persona statt pro Rolle, weil die
   Personas verschiedene Schritte haben *(Claude)*.
2. **Abschnitt Persona × Akt:** Raster «Hat es funktioniert?» (Zeilen = Schritte der Persona in diesem Akt, mit der
   Einsatznummer davor, wörtlich wie im Rollenbuch; Spalten: ging / ging mit Mühe / ging nicht / nicht gemacht). Raster «Wie gut
   gelöst?» (gut gelöst / geht so / umständlich). Kam die Mail an? (im Posteingang / im Spam /
   nicht angekommen / keine erwartet). Freitext «Was war unklar oder hat gefehlt?». Danach absenden; nach Akt 8 weiter zu
   «Gesamt».
3. **Gesamt:** Was gefällt dir? Was fehlt? Würdest du MyTCO nutzen (gern / vielleicht / eher
   nicht)? Mailanbieter (Bluewin / Gmail / GMX / iCloud / anderer). Was sollten wir sonst wissen?

**Bau:** Google-Apps-Script (`FormApp`), erzeugt aus derselben Einsatzliste wie die Rollenbücher;
legt die verknüpfte Antwort-Tabelle an. Der PL führt es einmal aus und gibt Claude den Link der
Tabelle. Ablage neben `docs/testgruppe.md`, damit der Lauf zum CM-Betrieb es wiederverwendet
*(Claude)*. Werkzeug ausserhalb des Produkts, ohne Eintrag im Manifest.

**Auswertung:** Claude liest die Antwort-Tabelle. Pro Persona, Akt und Schritt: Anzahl je
Antwort beider Raster und der Mail-Frage; Freitext als Befunde ohne Namen, eingeordnet als
*Doku fehlt*, *App ändern* oder *passt*, mit Ziel (Doku, Issue, Beobachtungen). Zwischenauswertung
nach jedem Akt, damit Fehler noch im Lauf behoben werden. Befunde aus Chat und Formular in
dieselbe Liste.

## Datenschutz

`docs/datenschutz.md#testgruppe` wird vor der Umsetzung angepasst (kurz halten):

- Der Probelauf läuft auf Test mit erfundenen Personas. **Ausnahme von DS-08:** Die Persona
  trägt die echte Mail-Adresse der Testperson, mit ihrem Einverständnis; die Adresse sieht auch
  der Mitglieder-Admin, der die Persona anlegt. Gelöscht beim Neuaufsetzen nach dem Lauf.
  Mailversand über einen Anbieter in CH/EU (DS-01). Der Satz «Pilot auf Live ist Betrieb»
  entfällt.
- Testpersonen bekommen das Test-Passwort und sehen damit die öffentlichen Interclub-Resultate
  mit Spielernamen (wie schon für die Android-Person vorgesehen).
- Formular: Der PL kennt die Zuordnung Person → Persona, die Antworten sind für ihn also nicht
  anonym; das sagt die Begrüssung offen. Antworten und Tabelle werden nach der Auswertung
  gelöscht.
- Liste in `intern/` mit Person → Persona, Gerät, Mail-Adresse; an Claude nur Persona, Gerät,
  Softwareversion, Altersgruppe grob.
- **Mail-Fänger:** Mails an Adressen ausserhalb der Erlaubt-Liste (die erfundenen Konten der
  Testdaten) landen weiter im Mail-Fänger hinter dem Test-Passwort. Damit darüber niemand in die
  Verwaltung mit den echten Adressen kommt, haben diese Konten im Lauf keine Admin-Rolle (Akt 0).
  Zweite Adressen fürs «E-Mail ändern» kommen ebenfalls auf die Erlaubt-Liste.
- Ob die Datenschutzerklärung etwas dazu braucht, prüft der Bauende (die Testpersonen sind keine
  Nutzer von Live).

## Was sich in der Doku ändert

- `docs/testgruppe.md`: «Bereit für Lauf 1», «Ablauf», «Aufträge», Mail und Chat-Start werden
  zum Probelauf (Voraussetzungen, Rollen und Personas mit Prioritäten, Kalender, Drehbuch,
  Einsatzliste, Formular, Auswertung); neu `docs/testgruppe-rollenbuecher.md` mit einem
  Rollenbuch pro Persona. «Lauf 2» wird der spätere Lauf zum CM-Betrieb.
- `docs/testkonzept.md#testgruppe`: Testgruppe auf Test statt Live.
- `docs/roadmap.md`, Etappe *Pilot*: Testgruppe auf Test.
- Checkliste vor 1.0.0 (Ort wählt der Bauende): übernimmt die Live-Punkte aus «Bereit für
  Lauf 1» — endgültige Adresse, Mail-Zustellung auf Live, Datenschutzerklärung auf Live.
- Issue #40: Body auf den neuen Stand; #39 und #29 blockieren den Probelauf nicht mehr, nur das
  Release 1.0.0; neu blockiert ihn der echte Mailversand auf Test.
- Das alte Design `2026-11-04-testgruppe-design.md` bekommt oben einen Verweis auf dieses.
- Die Erlaubt-Liste für Mails ist Code und eigenes Vorhaben (Issue nur nach Freigabe des PL);
  dieses Design legt nur fest, dass sie nötig ist.

## Dem Bauenden überlassen

- Genaue Schritte pro Akt und Persona aus den gebauten Funktionen, Eigenschaften der Personas,
  Wortlaut der Rollenbücher und Meldungen.
- Aufbau des Apps-Scripts.
- Ort der Checkliste-Punkte für 1.0.0.
