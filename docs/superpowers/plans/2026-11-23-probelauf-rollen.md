# Probelauf mit Rollen — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Doku für den Probelauf der Testgruppe auf Test (Rollen, Personas, Drehbuch in 8 Akten mit Einsätzen wie im Theater, ein Rollenbuch pro Person, Datenschutz) und ein Google-Apps-Script, das das Feedback-Formular samt Antwort-Tabelle baut.

**Architecture:** Reine Doku unter `docs/` (gilt als Doku nach `scripts/pruefungen/nur-doku.ts`, keine Versionsnummer). `docs/testgruppe.md` ist die Sicht der Regie; `docs/testgruppe.md` enthält die **Einsatzliste** (alle Einsätze in Reihenfolge); `docs/testgruppe-rollenbuecher.md` hat daraus ein Rollenbuch pro Persona; `docs/testgruppe-formular.gs` enthält dieselben Schritte als Daten und baut daraus das Formular. Kein Code der App ändert sich.

**Tech Stack:** Markdown, Google Apps Script (`FormApp`, `SpreadsheetApp`), Node nur zur Prüfung im Scratchpad.

**Spec:** `docs/superpowers/specs/2026-11-23-probelauf-rollen-design.md` (liegt bis Task 1 unter `/private/tmp/claude-501/-Users-KN-CAS-projekte-tco-app/bccf7411-a929-426f-82f1-aa52a68ca452/scratchpad/2026-11-23-probelauf-rollen-design.md`).

## Global Constraints

- Arbeit im Worktree `.claude/worktrees/probelauf` auf Branch `docs/probelauf-rollen` ab `origin/dev` (Skill `tco-branching`); Hauptordner bleibt auf `dev`.
- Keine echten Personennamen; Personas erfunden, Namen nicht gleich den Seed-Personas (Erika, Kurt, Hanna, Mona, Theo). Vereinspersonen nur mit Rolle.
- Chat-Texte, Meldungen und Rollenbücher kurz, Rahmen in Mundart wie die bestehenden Chat-Nachrichten in `docs/testgruppe.md`; die **Schritte** selbst neutral und kurz (sie stehen wörtlich auch als Zeilen im Formular).
- Schritte sagen *was*, nicht *wie* («Melde dich im Doppel an», nicht «tippe auf …»).
- Höchstens etwa 8 Schritte pro Persona und Akt (≈ 15 Minuten), Zusatz nicht mitgezählt.
- Jeder Einsatz: Nummer `<Akt>.<n>`, Persona, Stichwort (`Akt-Beginn` oder Nummer eines früheren Einsatzes), Schritte, Meldung `✅ <Nr> <Kurztext>`; Meldungen ohne Codes, Adressen, echte Namen.
- Ein Akt pro Tag, 8 Akte in 8 Tagen, Akt 0 vorher (Entscheid PL).
- Keine neue Dependency; das Apps-Script steht in keinem Manifest.
- Neue Dateien vor `make docs` stagen (die Prüfung sieht nur versionierte Dateien); Dateien einzeln stagen, nie `git add -A`/`.`; Commit-Präfix `docs:`; Merge-Commit, kein Squash.
- Kein `\n` in Mermaid-Labels (falls ein Diagramm entsteht).

## Review Focus

- **Höchstens 3 Anmeldungen je Spieler (FR-06):** Jede Persona bleibt über alle Akte bei ≤ 3 aktiven Anmeldungen (Wildcard-Anträge und Doppel zählen, offene Anfragen nicht). → Prüftabelle in Task 3, Schritt 3.
- **Austritt vor dem wirksamen Anmeldeschluss (FR-04):** Sonst zieht der Austritt des *Partners* das Doppel nicht zurück. → Kalender in Task 3.
- **Kategorie absagen geht nur ohne aktive Anmeldungen (FR-35):** Die kleine Doppelkategorie darf bis Akt 6 nur die offene Anfrage des *Spätzünders* haben. → Prüftabelle Task 3.
- **Anmeldeschluss im Turnierjahr (FR-33):** Probe-CM-Jahr = Jahr der Laufdaten, Lauf nicht über Neujahr. → Kalender Task 3.
- **Verzug:** Eine Person meldet einen Tag zu spät. Erwartet: höchstens drei Übergaben nacheinander pro Akt, Antworten auf andere wenn möglich im nächsten Akt; der verschobene Anmeldeschluss liegt mindestens zwei Tage nach dem geplanten Akt 7, sodass FR-04 und FR-33 trotzdem halten. → Kalender und Einsatzliste Task 3, Prüfskript Task 4.
- **Besetzung kleiner als geplant:** Fehlt eine Prio-2/3-Persona, wartet kein Einsatz auf ein Stichwort, das nie kommt. → Ersatz-Spalte Task 3, Zuschnitt Task 9.
- **Personas passen zu ihren Kategorien:** Geschlecht, Alter und Klassierung jeder Persona erlauben die geplanten Paare; Wildcard nur Einzel und nur für eine stärkere Kategorie (FR-08); Partner-Anfragen nur an Mitglieder mit Login, die für die Kategorie passen und frei sind (RR-05). → Prüftabelle Task 3.

---

### Task 1: Worktree, Spec und Plan ablegen

**Files:**
- Create: `docs/superpowers/specs/2026-11-23-probelauf-rollen-design.md` (Kopie aus dem Scratchpad)
- Create: `docs/superpowers/plans/2026-11-23-probelauf-rollen.md` (diese Datei)
- Modify: `docs/superpowers/specs/2026-11-04-testgruppe-design.md` (oben eine Zeile)

- [ ] **Step 1:** Skill `tco-branching` (Start) folgen: Worktree `.claude/worktrees/probelauf`, Branch `docs/probelauf-rollen` ab `origin/dev`, Label `in-arbeit` auf #40.
- [ ] **Step 2:** Spec und Plan aus dem Scratchpad kopieren; im Spec den Pfad im Kopf nicht ändern.
- [ ] **Step 3:** In `2026-11-04-testgruppe-design.md` unter dem Titel einfügen: `> Abgelöst in Ablauf und Aufträgen durch den [Probelauf mit Rollen](2026-11-23-probelauf-rollen-design.md) (23.11.2026).`
- [ ] **Step 4:** `make docs` → grün.
- [ ] **Step 5:** Commit `docs: Design und Plan Probelauf mit Rollen (#40)`.

### Task 2: Datenschutz nachführen

**Files:**
- Modify: `docs/datenschutz.md` (Abschnitt `## Testgruppe` ab Zeile ~163, Zeile DS-08 in der Vorgaben-Tabelle ~234, Änderungsliste ~255)

- [ ] **Step 1:** Prüfen, dass noch keine Stelle die Ausnahme kennt: `grep -n "Probelauf" docs/datenschutz.md` → keine Treffer.
- [ ] **Step 2:** Abschnitt `## Testgruppe` neu nach Spec, Abschnitt «Datenschutz», fünf Punkte, kurz: Probelauf auf Test mit erfundenen Personas; Ausnahme echte Mail-Adresse (Einverständnis, sieht auch der Mitglieder-Admin, gelöscht beim Neuaufsetzen nach dem Lauf, Versand CH/EU nach DS-01); Test-Passwort und öffentliche Interclub-Daten; Formular ohne Namen, für den PL über die Persona zuordenbar, nach der Auswertung gelöscht; Liste in `intern/` (Person → Persona, Gerät, Mail-Adresse; an Claude nur Persona, Gerät, Softwareversion, Altersgruppe grob); Mail-Fänger (erfundene Konten weiter dort, deshalb im Lauf ohne Admin-Rolle; zweite Adressen fürs «E-Mail ändern» auf der Erlaubt-Liste); Chat-Punkt bleibt. Die Punkte «Daten auf Live sind Betrieb» und «Mail mit dem Brief als PDF über das private Postfach» entfallen (Brief-PDF ist jetzt erfundene Persona). Schlusssatz zur Datenschutzerklärung: bleibt unverändert, weil der Probelauf auf Test läuft und Liste, Formular und Chat Organisation des PL sind.
- [ ] **Step 3:** DS-08 um einen Satz ergänzen: «Ausnahme Probelauf der [Testgruppe](#testgruppe): Die erfundene Persona trägt die echte Mail-Adresse der Testperson, mit ihrem Einverständnis; gelöscht beim Neuaufsetzen von Test nach dem Lauf (Entscheid Projektleiter, 23.11.2026).»
- [ ] **Step 4:** Eintrag in der Änderungsliste im Stil der Zeile vom 22.11.2026: `- 23.11.2026: Testgruppe läuft als Probelauf auf Test statt auf Live; DS-08 mit Ausnahme für die Mail-Adresse der Testpersonen (Entscheid Projektleiter, #40).`
- [ ] **Step 5:** `make docs` → grün; `grep -n "Betrieb, kein Test" docs/datenschutz.md` → keine Treffer.
- [ ] **Step 6:** Commit `docs: Datenschutz für den Probelauf der Testgruppe auf Test (#40)`.

### Task 3: `testgruppe.md` als Regie-Sicht

**Files:**
- Modify: `docs/testgruppe.md` (ganz umbauen)

Aufbau (Überschriften genau so): Einleitung · `## Voraussetzungen` · `## Rollen und Personas` · `## Kalender` · `## Drehbuch` · `## Einsatzliste` · `## Abdeckung` · `## Regeln` · `## Chat-Nachrichten` · `## Formular` · `## Auswertung` · `## Zusammensetzung` · `## Später: Lauf zum CM-Betrieb`. Abschnitte «Bereit für Lauf 1», «Ablauf Lauf 1», «Aufträge Lauf 1», «Mail an die Testpersonen», «Lauf 2» entfallen; Anker, auf die andere Dateien verlinken (`#zusammensetzung`, `#auswertung`), bleiben.

- [ ] **Step 1:** Einleitung: Probelauf auf Test mit erfundenen Personas, ganze App nach Rollen, ersetzt Lauf 1; Verweis auf Spec und `testgruppe-rollenbuecher.md`. Voraussetzungen: Checkliste aus dem Spec, Abschnitt «Voraussetzungen für den Start», wörtlich in den Punkten.
- [ ] **Step 2:** Rollen und Personas: Prio-Tabelle, Anzahl (4 / 5 / 6), Regeln «Fällt eine Rolle weg» aus dem Spec. Dazu ein Steckbrief je Persona (6 gespielte + *ohne Handy*): erfundener Vor- und Nachname, Geschlecht, Jahrgang, Klassierung, Gerät, Eigenheit. Attribute so wählen, dass die Paare und Anträge der Prüftabelle (Step 3) nach den Kategorie-Regeln im Fachmodell möglich sind; Kategorien, die die CM-Leitung in Akt 1 anlegt, als Liste mit Geschlecht, Alter, Klassierungsbereich, Einzel/Doppel (darunter die kleine Doppelkategorie zum Absagen und eine stärkere Einzelkategorie für die Wildcard).
- [ ] **Step 3:** Prüftabelle (im Dokument, unter den Steckbriefen): je Persona ihre Anmeldungen und Anfragen pro Akt mit Kategorie und laufender Zahl aktiver Anmeldungen. Erwartet: keine Persona über 3 (FR-06); kleine Doppelkategorie bis zur Absage ohne aktive Anmeldung (FR-35); Wildcard nur Einzel, stärkere Kategorie (FR-08); jedes Paar passt nach Geschlecht/Alter/Klassierung.
- [ ] **Step 4:** Kalender: Tabelle Tag 0–8 (Akt, Freigabe am Morgen, Formular bis am Abend) und die CM-Daten: Turnierjahr = Jahr der Laufdaten (FR-33), ursprünglicher Anmeldeschluss, verschobener Anmeldeschluss. Vorher in `src/lib/server/turnier/turniere.ts` (`wirksamerStatus`, `vorSchluss`) nachlesen, ob der Schluss-Tag selbst noch offen ist und ob ein späteres Datum eine wirksam geschlossene Anmeldung wieder öffnet; danach die Daten so legen, dass der Austritt (Akt 7) vor dem wirksamen Schluss liegt, auch bei einem Tag Verzug (verschobener Schluss ≥ 2 Tage nach dem geplanten Akt 7), und der Lauf im selben Kalenderjahr bleibt. Akt 0 nennt: Regie gibt sich MyTCO-Admin und entzieht den Konten der Testdaten (`@example.org`) alle Admin-Rollen. Ob der *Spätzünder* vorher «geschlossen» sieht, folgt daraus; im Text festhalten.
- [ ] **Step 5:** Drehbuch (Tabelle der 8 Akte aus dem Spec, angepasst an Step 2–4, dazu die Regeln «Einsätze wie im Theater» und «Wenn es stockt» aus dem Spec), Einsatzliste und Abdeckung (Tabelle aus dem Spec, Spalte *Akt* durch die Einsatznummern ersetzt). Einsatzliste als Tabelle `| Nr | Persona | Stichwort | Schritte | Meldung | weiter nach «ausgelassen» | ohne diese Persona |` je Akt (letzte Spalte nur bei Prio-2/3-Personas: wer übernimmt oder «entfällt», plus Ersatz-Stichwort für die Wartenden; Regeln aus dem Spec, «Fällt eine Rolle weg»); höchstens drei Übergaben nacheinander pro Akt; jede Zeile der Prüftabelle (Step 3) und der Abdeckung ist einem Einsatz zugeordnet; die Reihenfolge erfüllt die fachlichen Abhängigkeiten (z. B. Anfrage vor Annehmen, Wildcard-Antrag vor Entscheid, Nachricht vor Antwort). Vor dem Übernehmen das Inventar gegen `src/routes` und `docs/anforderungen/anforderungen.md` (Status `umgesetzt`) abgleichen; liegt #94 auf `dev`, die Zeile «Meldung nach Änderung durch die Verwaltung» aufnehmen, sonst mit «sobald #94 auf `dev`» stehen lassen.
- [ ] **Step 6:** Regeln (bestehende behalten, dazu: nur die eigene Persona; Test-Passwort und Brief-PDF nur privat; Mails kommen echt). Chat-Nachrichten: Begrüssung (neu: Probelauf auf Test, ein Akt pro Tag, Formular ohne Namen, aber über die Persona für den PL zuordenbar), Vorlage «Akt N beginnt» (ein Satz: wer «Akt-Beginn» als Stichwort hat, legt los) und das Format der Meldungen `✅ <Nr> <Kurztext>` bzw. `⏭ <Nr> ausgelassen`, Erinnerung, Dank. Formular: Zweck, Link auf `testgruppe-formular.gs`, Anleitung für den PL in 5 Schritten (script.google.com → Neues Projekt → Inhalt einfügen → `erstelleFormular` ausführen und Berechtigungen erlauben → Links aus dem Ausführungsprotokoll: Formular, Bearbeiten, Antwort-Tabelle; Link der Tabelle an Claude). Auswertung: Vorgehen aus dem Spec; Tabellenkopf pro Akt `| Persona | Schritt | ging | mit Mühe | ging nicht | nicht gemacht | gut gelöst | geht so | umständlich |`, «Noch nicht gelaufen». Zusammensetzung wie bisher, ergänzt um Persona-Zuordnung nur in `intern/`. Später: Lauf zum CM-Betrieb (Gruppen, Resultate), sobald #75–#77 gebaut.
- [ ] **Step 7:** `make docs` → grün.
- [ ] **Step 8:** Commit `docs: Testgruppe als Probelauf mit Rollen und Drehbuch (#40)`.

### Task 4: Rollenbücher

**Files:**
- Create: `docs/testgruppe-rollenbuecher.md`
- Modify: `docs/index.md` (Link neben Testgruppe)

**Interfaces:**
- Consumes: Einsatzliste und Steckbriefe aus `docs/testgruppe.md` (Task 3).
- Produces: je Persona ein Abschnitt `## Rollenbuch <Persona>`; darin je Akt `### Akt N` und je Einsatz `#### <Nr>` mit den Zeilen `Stichwort: …`, nummerierten Schritten `N. <Text>` und `Meldung:` mit einem ```` ```text ```` Block zum Kopieren; Zusatz unter `#### Zusatz Akt N (freiwillig)`. Dazu `## Rollenbuch Weiteres Mitglied` nur mit Einsätzen auf `Akt-Beginn`. Task 5 übernimmt die Schritte wörtlich, mit der Einsatznummer davor (`4.3 · <Text>`).

- [ ] **Step 1: Prüfskript im Scratchpad** (`einsaetze-pruefen.mjs`, nicht committen): liest die Einsatzliste aus `docs/testgruppe.md` und die Rollenbücher. Erwartet: jeder Einsatz steht genau einmal im Rollenbuch seiner Persona, mit gleichen Schritten und gleicher Meldung; jedes Stichwort ist `Akt-Beginn` oder ein Einsatz mit kleinerer Nummer im selben oder einem früheren Akt; keine Persona hat in einem Akt mehr als 8 Schritte ohne Zusatz; jede Meldung beginnt mit `✅ <eigene Nr>`; pro Akt keine Kette länger als drei Übergaben; jeder Einsatz einer Prio-2/3-Persona hat einen Eintrag «ohne diese Persona»; «Weiteres Mitglied» hat nur `Akt-Beginn`.
- [ ] **Step 2:** Run `node <scratchpad>/einsaetze-pruefen.mjs docs/testgruppe.md docs/testgruppe-rollenbuecher.md` → FAIL (Datei fehlt).
- [ ] **Step 3:** `docs/testgruppe-rollenbuecher.md` schreiben: Kopf der Datei (Zweck, Quelle ist die Einsatzliste, «Platzhalter `[…]` vor dem Versand ersetzen», je Persona ein eigener Abschnitt, damit der PL ihn einzeln als PDF oder Google-Dokument verschicken kann). Je Rollenbuch der Kopf nach Spec, Abschnitt «Rollenbuch pro Person» (Persona mit Steckbrief, Geräte, Kalender Tag → Akt, Regeln, Formular-Link), dann die Einsätze. Admins in Akt 1: Verwaltung über den Code per Mail bestätigen. E-Mail-Ändern-Schritt mit «nur wenn du eine zweite Mail-Adresse hast». Rahmen in Mundart, Schritte neutral.
- [ ] **Step 4:** Run wie Step 2 → PASS.
- [ ] **Step 5:** In `docs/index.md` den Link `[Rollenbücher der Testgruppe](testgruppe-rollenbuecher.md)` neben «Testgruppe» setzen; `make docs` → grün.
- [ ] **Step 6:** Commit `docs: Rollenbücher pro Persona für den Probelauf (#40)`.

### Task 5: Formular-Skript (Google Apps Script)

**Files:**
- Create: `docs/testgruppe-formular.gs`

**Interfaces:**
- Consumes: die Schritte aus `docs/testgruppe-rollenbuecher.md` (Task 4), wörtlich mit Einsatznummer davor (`4.3 · <Text>`).
- Produces: `function erstelleFormular(): void` — legt Formular und verknüpfte Tabelle an und schreibt drei Links ins Protokoll (`Logger.log`).

Daten oben in der Datei:
- `const PERSONAS: string[]` — die gespielten Personas in Prio-Reihenfolge und «Weiteres Mitglied» (ohne *ohne Handy*).
- `const SCHRITTE: Record<string, Record<number, string[]>>` — Persona → Akt → Schritte.
- `const ZUSATZ: Record<string, Record<number, string[]>>` — nur Admin-Personas.
- `const SPALTEN_GING = ['ging', 'ging mit Mühe', 'ging nicht', 'nicht gemacht']`, `const SPALTEN_GUT = ['gut gelöst', 'geht so', 'umständlich']`, `const MAIL = ['im Posteingang', 'im Spam', 'nicht angekommen', 'keine erwartet']`.

Aufbau (FormApp): Titel «MyTCO Probelauf – Rückmeldung», Beschreibung «Ohne Namen. Bitte keine Namen in die Textfelder.»; `setCollectEmail(false)`, `setLimitOneResponsePerUser(false)`. Seite «Start»: Geräte (Kästchen iPhone / Android / PC, Pflicht), Persona (Pflicht, Auswahl springt je Persona auf deren Seite «Akt»). Seite «Akt – <Persona>»: Auswahl nur der Akte, für die `SCHRITTE` Einträge hat, springt in den Abschnitt «<Persona> – Akt N». Abschnitt: Raster «Hat es funktioniert?» (`SCHRITTE`), Raster «Wie gut gelöst?» (dieselben Zeilen), bei Admin-Personas mit `ZUSATZ` zwei weitere Raster «Zusatz: …» (nicht Pflicht), Frage «Kam die Mail an?» (`MAIL`), Absatz «Was war unklar oder hat gefehlt?», danach Absenden, nach dem Abschnitt Akt 8 weiter zur Seite «Gesamt» (`setGoToPage`). Seite «Gesamt»: «Was gefällt dir?», «Was fehlt?» (Absätze), «Würdest du MyTCO nutzen?» (gern / vielleicht / eher nicht), Mailanbieter (Bluewin / Gmail / GMX / iCloud / anderer), «Was sollten wir sonst wissen?». Antwort-Tabelle: `SpreadsheetApp.create('MyTCO Probelauf – Antworten')`, `form.setDestination(FormApp.DestinationType.SPREADSHEET, id)`. Raster-Pflicht aus, damit «nicht gemacht» nicht erzwungen wird.

- [ ] **Step 1: Prüf-Attrappe im Scratchpad** (`formular-attrappe.mjs`, nicht committen): stellt `FormApp`, `SpreadsheetApp`, `Logger` als Attrappen bereit, die angelegte Seiten, Raster und Sprünge zählen, lädt den Inhalt von `docs/testgruppe-formular.gs` per `new Function`, ruft `erstelleFormular()` auf. Erwartet: Anzahl Abschnitte = Anzahl nicht-leerer Einträge in `SCHRITTE`; jede Sprung-Auswahl zeigt auf eine angelegte Seite; jede Rasterzeile (ohne `<Nr> · `) kommt wörtlich als Schritt dieses Einsatzes in `docs/testgruppe-rollenbuecher.md` vor; keine Rasterzeile doppelt im selben Raster.
- [ ] **Step 2:** Run `node <scratchpad>/formular-attrappe.mjs docs/testgruppe-formular.gs docs/testgruppe-rollenbuecher.md` → FAIL (Datei fehlt).
- [ ] **Step 3:** `docs/testgruppe-formular.gs` schreiben (Daten aus Task 4, Aufbau wie oben). Kopfkommentar: Zweck, Ausführen durch den PL, kein Teil der App, Formular und Tabelle nach der Auswertung löschen.
- [ ] **Step 4:** Run wie Step 2 → PASS.
- [ ] **Step 5:** `make docs` → grün.
- [ ] **Step 6:** Commit `docs: Apps-Script für das Formular des Probelaufs (#40)`.
- [ ] **Step 7 (Handpunkt PL, vor dem Merge — das ist der Nachweis, die Attrappe ist nur Vorprüfung):** PL führt das Skript aus, füllt eine Probe-Antwort aus und gibt den Link der Tabelle; Claude liest sie mit `mcp__claude_ai_Google_Sheets__get_values` (Kopfzeile und Probe-Zeile) und hakt damit den DoD-Punkt «Formular angelegt und einmal selbst durchgespielt» ab. Die Probe-Zeile danach löschen. Das Formular bleibt bestehen; wird das Skript in Task 9 geändert, löscht der PL Formular und Tabelle und führt es neu aus.

### Task 6: Übrige Doku nachziehen

**Files:**
- Modify: `docs/testkonzept.md` (`## Testgruppe` ~348; Checkliste vor dem Release ~219ff.)
- Modify: `docs/roadmap.md` (Zeile *Pilot*)
- Modify: `docs/ci-cd-und-release.md` (Tabelle «Umgebungen», Spalte *Rolle*)
- Modify: jede weitere Fundstelle von `grep -rn "Lauf 1\|Pilot.*Live\|Testgruppe.*Live" docs --include=*.md` ausser `docs/superpowers/`, `docs/beobachtungen*.md`, `docs/refactoring-*`

- [ ] **Step 1:** `grep` wie oben ausführen, Fundstellen notieren.
- [ ] **Step 2:** `testkonzept.md#testgruppe`: Testgruppe als Probelauf auf Test mit Personas (DS-08 mit Ausnahme), Verweis auf `testgruppe.md`; «Älteres Handy» bleibt. In der Checkliste einen Unterabschnitt `#### Einmal vor 1.0.0 (Live)` mit drei Punkten: Live unter der endgültigen Adresse (K-10); ein neuer Code per Mail kommt auf Live bei verbreiteten Anbietern an und landet nicht im Spam (A-LOGIN-10); Datenschutzerklärung auf Live erreichbar (DS-09).
- [ ] **Step 3:** Roadmap *Pilot*: «Eine Testgruppe probiert … auf Live aus» → Probelauf auf Test mit Rollen und Drehbuch, startet, sobald der echte Mailversand auf Test steht; Live-Punkte vor 1.0.0 in der Checkliste. `ci-cd-und-release.md`: Rolle Test «Demo, Checkliste und Probelauf der Testgruppe», Rolle Live «alle Mitglieder ab 1.0.0».
- [ ] **Step 4:** Restliche Fundstellen aus Step 1 angleichen.
- [ ] **Step 5:** `make docs` → grün; `grep` aus Step 1 → nur noch gewollte Treffer.
- [ ] **Step 6:** Commit `docs: Testkonzept, Roadmap und Betrieb auf den Probelauf angeglichen (#40)`.

### Task 7: Issues nachführen

- [ ] **Step 1:** Body von #40 neu (Datei im Scratchpad, `gh issue edit 40 --body-file …`): Kontext, Lösungsrichtung (Entscheide aus dem Spec), DoD (Datenschutz ✓, `testgruppe.md` mit Einsatzliste ✓, Rollenbücher ✓, Formular-Skript ✓, Formular ausgeführt und durchgespielt, Voraussetzungen erfüllt, Lauf durchgeführt und ausgewertet), Datenschutz-Verweis, `Blocked by: echter Mailversand auf Test (Weg offen, Entscheid PL)`, `Blocks: #48`, `Verwandt: #94, #47, #44, #63`.
- [ ] **Step 2:** In #29, #39, #43, #47 die Zeile `Blocks:` lesen und `#40` entfernen, wo sie steht (die Live-Punkte blockieren nur noch #48); Body sonst unverändert.
- [ ] **Step 3:** Labels von #40 prüfen: `blocked` bleibt, `needs-input` bleibt (Mailweg), `in-arbeit` bis zum Merge.

### Task 8: Review und Merge

- [ ] **Step 1:** Agent `merge-reviewer` über den Branch; Befunde beheben oder begründet ablehnen.
- [ ] **Step 2:** Skill `tco-branching` (Merge nach `dev`): ob ein Eintrag unter «Unveröffentlicht» in `docs/versionen.md` nötig ist, entscheidet der Hook bzw. der Skill (reine Doku); Merge-Commit nach `dev`, Push, Worktree und Branch aufräumen, `in-arbeit` von #40 entfernen (Issue bleibt offen).
- [ ] **Step 3:** Dem PL melden: was steht, und die offenen Handpunkte (Formular ausführen; Mailweg entscheiden; Erlaubt-Liste als eigenes Vorhaben; Rollenbücher vor dem Versand als PDF oder Google-Dokument erzeugen).

### Task 9: Besetzung zuschneiden (nach der AOGV, vor dem Versand)

Eigener Branch nach demselben Ablauf, sobald der PL die Besetzung nennt (Anzahl, welche Prio-Rollen besetzt, Geräte; ohne Namen).

- [ ] **Step 1:** Einsatzliste in `docs/testgruppe.md` nach der Spalte «ohne diese Persona» auf die Besetzung schneiden: unbesetzte Personas und ihre Einsätze heraus, Ersatz-Einsätze und Ersatz-Stichwörter hinein; Abdeckung nachführen, was entfällt, als «entfällt mangels Besetzung» markieren.
- [ ] **Step 2:** `python3 docs/testgruppe-werkzeug/erzeuge.py .` erzeugt Rollenbücher und Formular-Skript neu (Generator seit dem Review im Repo); Ausgabe `ok`.
- [ ] **Step 3:** Kalender mit echten Daten füllen (Start nach der AOGV, nicht über Neujahr).
- [ ] **Step 4:** `make docs` → grün; Commit `docs: Probelauf auf die Besetzung zugeschnitten (#40)`; Merge wie Task 8. PL löscht das alte Formular und führt das Skript neu aus; Claude liest die Probe-Antwort wie in Task 5 Step 7.
