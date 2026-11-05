# Design: Anmeldung zu Anlässen am Beispiel der GV (#52, A-ANLASS-01)

**Datum:** 2026-11-05 · **Issue:** [#52](https://github.com/konstantinniedermann/tco-app/issues/52)
· **Status:** Entwurf zur Freigabe durch den Projektleiter

## Absicht

Der Projektleiter will dem Vorstand **in der laufenden App** zeigen, wie eine Anmeldung zur
Generalversammlung (GV) in MyTCO aussehen könnte. Der Admin erstellt einen Anlass, z. B. die GV.
Er erscheint bei allen Mitgliedern auf der Startseite. Das Mitglied meldet sich mit wenigen Tipps
an oder ab und speichert den Termin in seinem Kalender. Die Admins sehen jederzeit, wer kommt.

Gezeigt wird lokal beim Projektleiter (`make dev`, `make dev-handy`), mit erfundenen Daten. Test
und Live sind noch nicht in Betrieb. Gebaut wird trotzdem normal, ohne Schalter: Was hier
entsteht, geht mit dem nächsten Release mit (Entscheid Projektleiter).

Die GV ist der erste Anlass neben der Clubmeisterschaft. Gebaut wird allgemein *Anlass*, nicht
*GV*, damit Saisoneröffnung oder Clubabend ohne Umbau folgen können.

## Was die Statuten 2026 vorgeben

| Artikel | Vorgabe | Folge |
|---------|---------|-------|
| Art. 27 | Ordentliche GV jährlich, üblicherweise im Frühling; Einladung mit Traktandenliste mindestens 21 Tage vorher, per E-Mail erlaubt | Einladung und Traktanden stehen als Text beim Anlass; der Versand bleibt beim Vorstand |
| Art. 18 | Stimmrecht nur für einen Teil der Kategorien | Nicht gebaut: MyTCO kennt die Mitgliederkategorie nicht (siehe Nicht-Ziele) |
| Art. 30 | Anträge schriftlich an den Präsidenten, 12 Tage vorher | Nicht gebaut (siehe Nicht-Ziele) |

## Ziele

1. **Admin erstellt einen Anlass** in der Verwaltung: Titel, Beginn (Datum und Zeit), Ort,
   Einladung (Freitext, z. B. Traktanden), Anmeldeschluss. Er kann ihn ändern und löschen.
2. **Startseite:** Jeder kommende Anlass erscheint bei **allen Mitgliedern** als hervorgehobene
   Kachel unter «Jetzt aktuell» mit Datum und dem eigenen Stand («Bitte bis … an- oder
   abmelden», «Du kommst», «Du kommst nicht»). Ein vergangener Anlass verschwindet.
3. **Anlass-Seite:** Karte *Einladung*, Karte *Kommst du?* mit zwei Auswahlflächen «Ich komme» /
   «Ich komme nicht», Haupttaste «Antwort senden». Bei «Ich komme nicht» erscheint das Feld
   *Bemerkung (freiwillig)*. Bis zum Anmeldeschluss lässt sich die Antwort ändern; danach zeigt
   die Seite sie nur noch an.
4. **Kalender:** Nebentaste «In den Kalender» öffnet eine `.ics`-Datei; iPhone und Android
   übernehmen sie in den Kalender des Geräts. Ohne neue Abhängigkeit. Der Link funktioniert
   **ohne Login**, weil die App vom Startbildschirm auf dem iPhone ihre Anmeldung nicht an die
   Ansicht weitergibt, die die Datei öffnet. Jeder Anlass hat dafür eine eigene, nicht
   erratbare Kalender-Kennung; die Datei enthält nur Titel, Beginn, Ort und Einladung, keine
   Personendaten.
5. **Verwaltung, Anlass ansehen:** Kennzahlen *kommen*, *kommen nicht*, *noch keine Antwort*
   (alle aktiven Mitglieder ohne Antwort, auch solche ohne Login); Tabelle nur mit den Antworten:
   Name, Antwort, Bemerkung, geändert am.
6. **Termin geändert:** Ändert der Admin Beginn oder Ort, bleiben die Antworten. Wer schon
   geantwortet hat, sieht auf Startseite und Anlass-Seite «Datum oder Ort geändert, bitte prüfe
   deine Antwort», bis er erneut antwortet.
7. **Erfundene Beispieldaten:** `make seed` legt eine GV 2027 mit einigen Antworten erfundener
   Mitglieder an, damit die Ansichten beim Vorzeigen nicht leer sind.

## Nicht-Ziele

- Kein Antrag und keine Frage an den Vorstand über MyTCO (bleibt in K-50).
- Keine Zielgruppe: Jeder Anlass gilt für alle aktiven Mitglieder. Kein Stimmrecht, keine
  Mitgliederkategorie.
- Keine Mails oder Push-Mitteilungen zum Anlass; keine Erinnerungen.
- Kein Export der Liste (DS-04).
- Keine Begleitpersonen, kein Essen, keine Teilnehmerbegrenzung.
- Kein Schalter, keine Entwurfs-Stufe: Ein erstellter Anlass ist sofort sichtbar.

## Regeln

| ID | Regel |
|----|-------|
| FR-27 | Ein Anlass ist für alle aktiven Mitglieder sichtbar, solange sein Beginn nicht vorbei ist |
| FR-28 | An- und abmelden geht bis zum Anmeldeschluss (einschliesslich der Minute); der Anmeldeschluss liegt nicht nach dem Beginn |
| FR-29 | Je Mitglied und Anlass gibt es höchstens eine Antwort, *kommt* oder *kommt nicht*; eine neue Antwort ersetzt die alte |
| FR-30 | Eine Bemerkung gibt es nur bei *kommt nicht*, höchstens 500 Zeichen; wechselt die Antwort auf *kommt*, wird sie gelöscht |
| FR-31 | Löscht der Admin einen Anlass, sind alle Antworten dazu mit gelöscht |
| FR-32 | Ändert der Admin Beginn oder Ort, bleiben die Antworten; eine Antwort, die älter ist als die Änderung, gilt als *zu prüfen*, bis das Mitglied erneut antwortet |

Die Nummern FR-27 bis FR-32 folgen auf die letzte im Fachmodell; vor dem Bau dort prüfen.

## Fachmodell

| Objekt | Angaben | Personendaten |
|--------|---------|---------------|
| **Anlass** | Titel, Beginn, Ort, Einladung (Text), Anmeldeschluss, Kalender-Kennung, Termin geändert am, erstellt von, erstellt am | — |
| **Anmeldung** (zum Anlass) | Anlass, Mitglied, Antwort *kommt* / *kommt nicht*, Bemerkung (optional), geändert am | Antwort, Bemerkung |

Nach dem [Glossar](../../glossar.md) heisst auch die Antwort zur GV *Anmeldung*, auch die
Abmeldung. Im Code `anlass` und `anlass_anmeldung`, getrennt von der künftigen CM-Anmeldung.

## Rechte

| Daten / Funktion | Mitglied | Admin |
|------------------|----------|-------|
| Kommende Anlässe | L | S (erstellen, ändern, löschen) |
| Eigene Anmeldung zum Anlass, bis Anmeldeschluss | S eigene | S eigene |
| Anmeldungen aller (Name, Antwort, Bemerkung) | – | L |
| Kalenderdatei eines Anlasses (ohne Personendaten) | wer den Link hat, auch ohne Login | wer den Link hat |

Die Verwaltung der Anlässe verlangt wie die Mitgliederverwaltung die Bestätigung per Mail-Code
(RR-09). CM- und Lizenzverantwortliche sehen nichts Zusätzliches.

## Datenschutz (vor dem Bau nachführen)

- *Welche Daten:* neue Zeile «Anmeldungen zu Anlässen (Antwort, freiwillige Bemerkung)».
- Die Bemerkung sagt im Hilfetext: «Ein Grund ist nicht nötig, bitte keine Angaben zur
  Gesundheit. Die Bemerkung lesen nur die Admins.» (keine Gesundheitsdaten, auch nicht als Grund
  für eine Abmeldung).
- *Wer sieht was:* Mitglied die eigene; Admin alle.
- *Löschen:* Anmeldungen ein Jahr nach dem Anlass löschen (Vorschlag K-50). Gebaut wird die
  automatische Löschung mit den übrigen Löschfristen, nicht in diesem Issue; bis dahin löscht der
  Admin den Anlass.
- Die Kalenderdatei ist ohne Login abrufbar, enthält aber keine Personendaten (nur Anlassdaten).
- Datenschutzerklärung entsprechend ergänzen.

## Oberfläche

Nach dem [UI-Leitbild](../../ui-leitbild.md) und dem Entwurf
[MyTCO GV-Anmeldung](https://claude.ai/artifact/K3oLGEXvEbqPDWnobf2jA6) (Bildschirme 1–4; der
Bildschirm Verwaltung ohne Stimmrecht, Export und Anträge).

| Seite | Inhalt |
|-------|--------|
| Startseite `/` | Kachel je kommendem Anlass unter «Jetzt aktuell» |
| Anlass `/anlass/[id]` | Einladung, Kommst du?, Bemerkung, «Antwort senden», «In den Kalender» |
| Verwaltung `/verwaltung/anlaesse` | Liste der Anlässe, Haupttaste «Neuer Anlass» |
| Verwaltung `/verwaltung/anlaesse/neu` und `/[id]` | Formular; bei `/[id]` Kennzahlen und Tabelle der Antworten, «Anlass löschen» mit Rückfrage |

Neue Bausteine, die zuerst ins Leitbild kommen: **Auswahlfläche** (Radio als Fläche mit Rand,
gewählt in `--farbe-marke-zart`), **mehrzeiliges Feld** (`textarea` im Baustein *Eingabefeld*),
**Kennzahl** (Zahl und Text in einer Karte, Verwaltung). Die Seitenleiste der Verwaltung erhält
den Bereich *Anlässe*.

## Technik

- Zwei neue Tabellen mit einer neuen Migration; keine Änderung an bestehenden.
- Schnittstellen nur als `+server.ts` (ADR-002): `GET /api/anlaesse`, `GET /api/anlaesse/[id]`,
  `PUT /api/anlaesse/[id]/anmeldung`, `GET /api/kalender/[kennung]` (`text/calendar`, ohne
  Login; Kennung aus 32 Zufallsbytes, base64url);
  `GET`/`POST /api/admin/anlaesse`, `GET`/`PUT`/`DELETE /api/admin/anlaesse/[id]`.
- Kalenderdatei von Hand nach RFC 5545 (UID, DTSTART/DTEND in UTC, SUMMARY, LOCATION,
  DESCRIPTION). Annahme: Dauer 2 Stunden, weil der Anlass kein Ende kennt.
- Anzeige der Zeiten in Schweizer Zeit (`Europe/Zurich`).

## Nachweis

Einheiten- und Datenbanktests für Regeln und Schnittstellen (TDD), E2E für Admin erstellt →
Mitglied sieht Kachel → meldet sich an → Admin sieht Antwort, mit Screenshot auf iPhone, Android
und PC und axe ohne Verstösse. Den Kalendereintrag prüft der Projektleiter von Hand auf einem
echten iPhone und Android-Gerät (`make dev-handy`); der E2E-Test prüft nur die Datei.

## Entscheide des Bauenden

- Die Einladung ist reiner Text, kein PDF (keine Datei-Ablage).
- Admins sehen auch vergangene Anlässe in der Verwaltung; Mitglieder nicht.
- Kacheln auf der Startseite nach Beginn sortiert, der nächste zuerst.
- Nach dem Senden zeigt die Anlass-Seite die Antwort mit Plakette und «Antwort ändern» (Entwurf,
  Bildschirm 4).

## Annahmen bis zur Antwort auf K-50

- Annahme K-50: Anmeldeschluss setzt der Admin frei (Vorschlag in der Maske: 3 Tage vor Beginn).
- Annahme K-50: Liste und Bemerkungen sehen nur die Admins von MyTCO, nicht der ganze Vorstand.
- Annahme K-50: Jeder Anlass gilt für alle aktiven Mitglieder.

`make annahmen` prüft diese Notiz nicht (Historie); die lebenden Markierungen stehen in
Anforderungen, Datenschutz und Fachmodell.
