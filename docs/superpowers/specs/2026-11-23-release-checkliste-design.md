# Checkliste vor dem Release — automatisieren und Handrunde ordnen

## Absicht

Die [Checkliste vor dem Release](../../testkonzept.md#checkliste-vor-dem-release) bleibt
inhaltlich, wie sie ist, aber der Projektleiter will sie so weit wie möglich von der Maschine
prüfen lassen. Für die Punkte, die nur echte Geräte, Papier oder Kamera zeigen, braucht es einen
klaren Ablauf mit Struktur. Heute ist sie eine lose Liste von 26 Punkten, von denen niemand
weiss, welche die CI schon abdeckt, und die bei jedem Release ganz abgearbeitet werden müsste.

Der Projektleiter hat kein Android-Gerät. Die Android-Punkte prüft eine externe Person (z. B.
aus der Testgruppe), die weder Repo noch GitHub kennt. Releases werden deshalb selten: Jedes
braucht Koordination und Handarbeit.

## Ziele, Nicht-Ziele, Anti-Ziele

- Ziel: Jeder Punkt der Checkliste hat genau eine Art, wie er geprüft wird: *automatisch (CI)*,
  *Prüflauf Test* oder *von Hand*, mit Gerät und erwartetem Ergebnis.
- Ziel: Ein Befehl prüft vor dem Release den echten Test-Server und belegt das Ergebnis.
- Ziel: Die Handrunde ist pro Gerät gebündelt und so geschrieben, dass eine externe Person die
  Android-Runde ohne Vorwissen abarbeiten kann.
- Ziel: Pro Release steht im Release-PR, was geprüft wurde und mit welchem Ergebnis.
- Nicht-Ziel: neue Funktionen in der App nur für die Prüfung (keine Statusseite).
- Nicht-Ziel: der Prüflauf in der CI (keine Actions-Minuten, keine neuen Geheimnisse auf GitHub).
- Nicht-Ziel: Geräte-Farmen oder Dienste für echte Handys in der Cloud.
- Anti-Ziel: Ein Prüflauf, der auf Test etwas verändert, das der Projektleiter oder externe Prüfer
  dort gerade nutzen (Rollen, Passkeys, Push-Abos ihrer Personas, Sitzungen auf den Handys).
- Anti-Ziel: ein Prüflauf, der Geheimnisse (Test-Passwort-Hash, Codes) ausgibt oder ins Repo
  schreibt.

## Ansätze

| | Ansatz | Abwägung |
|---|---|---|
| **A** | **Playwright-Tests mit eigener Konfiguration gegen Test, DB-Punkte per SSH** | **nutzt Vorhandenes, Screenshots als Beleg; ca. 1–2 Min.** |
| B | Node-Skript ohne Browser (Schnittstellen + SSH) | schnell, aber kein Beleg, dass die Oberfläche lädt |
| C | Statusseite in der App | neue Funktion nur für die Prüfung, Rechtefrage; verworfen |

Gewählt: **A** (vom Projektleiter). Läuft **lokal vor dem Release**, nicht in der CI (vom
Projektleiter). Abgehakt wird **im Release-PR** (vom Projektleiter). Umfang pro Release:
**Grundrunde + Berührtes** (vom Projektleiter).

## Entschieden

### 1. Neue Ordnung der Checkliste in `docs/testkonzept.md`

Drei Teile, jeder Punkt behält seine IDs:

**Automatisch (CI)**: kostet beim Release nichts, die grüne CI auf dem Commit des Abgleichs ist
der Beleg. Hierher kommen die Punkte, die E2E oder Datenbanktests schon prüfen (Kandidaten:
Hilfe ohne Login, Selbständerung unter *Für Fairgate*, Wappen und «Nicht gespeichert», Rollen und
*Ansicht als* mit Riegel samt `rechte-matrix.db.test.ts`). Jeder Punkt nennt die Testdatei, die
ihn trägt. Was nur teilweise abgedeckt ist (z. B. Verhalten vom Startbildschirm), bleibt mit dem
Rest in der Handrunde.

**Prüflauf Test** (`make test-pruefung`, siehe 2):
- Fusszeile zeigt Version aus `package.json` und Kurzform des Commits von `origin/dev`.
- Login mit Einmal-Code über den Mail-Fänger als Prüf-Spieler (eigenes Prüfkonto, siehe 2).
- Verwaltung öffnet mit Code per Mail als Prüf-Admin (Mitglieder-Admin), inklusive Bestätigung
  (SI-08, A-ROLLE-02).
- Hilfe ohne Login über die Fusszeile, Kontakt sichtbar (A-HILFE-01).
- Zeitgeber läuft: `ZEITGEBER` im App-Container nicht `aus`, und `ic_abruf` hat für die laufende
  Saison einen Versuch jünger als 24 h (#81; der Abruf läuft über den Zeitgeber).
- Ein Admin ist festgelegt (ersetzt «`admin-festlegen` einmal ausgeführt»).

**Von Hand**: gebündelt in Runden, jede mit Gerät, Persona, Schritten und erwartetem Ergebnis:
- *Grundrunde* (bei jedem Release, ca. 5 Min. pro Gerät): iPhone und Android, MyTCO vom
  Startbildschirm starten, Login, ein Push an das Gerät kommt an und öffnet das Ziel.
  Solange Live aus ist, darf die Android-Runde mit Grund ausgesetzt werden (Kästchen
  «Android: ausgesetzt, Grund …» im PR); vor dem Einschalten von Live wird sie nachgeholt, danach
  ist sie Pflicht (vom Projektleiter).
- *iPhone-Runde* (Projektleiter), *Android-Runde* (externe Person), *PC-und-Papier-Runde*
  (Projektleiter: Druck, QR aus dem Testbrief, Passkey vom Handy per QR am PC, geänderte Seiten
  der Verwaltung).
- *Volle Runde*: alle Handpunkte. Fällig vor dem Einschalten von Live und wenn ein Release Login,
  Passkey, Push, Startbildschirm oder Briefe ändert. Sonst nur die Punkte, die das Release
  berührt; Claude wählt sie anhand der Einträge in `docs/versionen.md` seit dem letzten Release
  und der geänderten Pfade aus und begründet die Auswahl im PR.
- *Saisonal*: Interclub-Push nach neuem Endstand (ab Saisonstart Mai 2027).

Aus der Checkliste heraus (gehören nicht dorthin, weil Test sie nicht zeigen kann):
- «Mail landet nicht im Spam»: Auf Test gehen alle Mails in den Mail-Fänger. Wandert zu den
  Voraussetzungen vor dem Einschalten von Live ([Testgruppe](../../testgruppe.md)).
- «Einrichtungsabend: mobile Daten oder Grenzen pro IP prüfen»: Planungshinweis für den Pilot,
  wandert ebenfalls dorthin.

### 2. Prüflauf `make test-pruefung`

- Playwright-Tests in eigenem Ordner (z. B. `tests/test-server/`) mit eigener Konfiguration,
  `channel: 'chrome'`, ein Projekt für Handygrösse reicht.
- Neues Testmuster in `scripts/pruefungen/testmuster.ts`; EINHEIT, DATENBANK und E2E schliessen
  den Ordner aus. `make check`, `make e2e`, Pre-Push-Hook und CI fassen ihn nie an.
- Zugang: Der Befehl holt per SSH (`ubuntu@<Server>`, vorher `ssh-add --apple-load-keychain`) den
  Wert des Zugangscookies aus `proxy.env` und gibt ihn dem Test nur über eine Datei im
  temporären Ordner mit Rechten 600 oder eine Umgebungsvariable des Kindprozesses; nie in Log,
  Bericht oder Repo. Danach gelöscht.
- Codes kommen aus dem Mail-Fänger (`/_mail/api/v1/search`, Suche per Betreff
  `"Test für <adresse>"`, nicht `to:`).
- Prüfkonten (Claudes Entscheid): Der Lauf legt per Skript im App-Container zwei erfundene
  Konten an, falls sie fehlen: einen Prüf-Spieler mit Login und einen Prüf-Admin mit der Rolle
  Mitglieder-Admin, Adressen `@example.org`. Nicht über `scripts/testdaten.ts`: Neue Testdaten
  dort verlangen einen höheren Zähler `betrieb/test-neu-aufsetzen`, und das löscht Passkeys,
  Push-Abos und Sitzungen der Handys. So läuft der Prüflauf auch nach einem Neuaufsetzen grün.
  Erika und die anderen Personas fasst er nicht an.
- DB-Punkte per SSH: `docker exec` im App-Container (`ZEITGEBER`) und eine Abfrage in der
  Test-DB. Nur lesen.
- Der Lauf ändert auf Test nichts ausser neuen Sitzungen und Login-Codes der zwei verwendeten
  Konten (eine Anmeldung beendet andere Sitzungen nicht). Höchstens 3 Codes pro Lauf: Login Spieler,
  Login Admin, Bestätigung Verwaltung (Budget 10/h pro IP; Claudes Entscheid).
- Ausgabe: Tabelle Punkt → ok / rot mit festem Text, Screenshots (Fusszeile, Verwaltung) im
  Ordner des Laufs. Nur erfundene Daten auf den Bildern (DS-08).
- Adresse von Test und Server: aus den bestehenden Einstellungen bzw. `docs`/`betrieb`, nicht neu
  erfunden; fehlt etwas (SSH-Schlüssel, Agent), bricht der Lauf mit klarer Meldung ab.

### 3. Release-PR als Prüfprotokoll

- Neuer Ablauf in Skill `tco-branching` (Release) und `docs/ci-cd-und-release.md`: Abgleich nach
  `dev` → Test zeigt die neue Nummer → `make test-pruefung` → PR `dev` → `main` als **Entwurf**,
  Text aus einer Vorlage → Handrunden → abhaken im PR → PR bereit → Merge.
- Vorlage (z. B. `.github/release-pr.md`): Ergebnis des Prüflaufs, Liste *automatisch (CI)* mit
  Link auf den CI-Lauf, die ausgewählten Handpunkte als Kästchen pro Runde mit Begründung der
  Auswahl, Ergebnis des Doku-Abgleichs.
- Die externe Person hakt nicht auf GitHub ab: Sie bekommt ihre Runde als Text (Schritte, Persona,
  Test-Adresse und Passwort separat), meldet zurück, und der Projektleiter hakt ab. Den Text
  erzeugt Claude aus derselben Quelle wie die Kästchen, damit beide nicht auseinanderlaufen.

### 4. Externe Prüfperson (später entschieden)

- Jetzt gebaut wird nur der Text der Android-Runde (Schritte, erwartetes Ergebnis), so
  geschrieben, dass eine Person ohne Repo und GitHub ihn abarbeiten kann.
- Zugang, Persona und Datenschutz entscheidet der Projektleiter, wenn er jemanden hat (vom
  Projektleiter). Bis dahin ist die Android-Runde ausgesetzt. Als Voraussetzung in
  [Testgruppe](../../testgruppe.md) festhalten: Das Test-Passwort öffnet auch den Mail-Fänger mit
  den Codes aller erfundenen Konten (damit auch die Verwaltung auf Test), und auf Test stehen die
  echten Interclub-Resultate von Swiss Tennis mit Spielernamen (öffentlich, DS-08 präzisiert).
  Vor dem Zugang gegen `docs/datenschutz.md` prüfen.

## Claudes Entscheide (zum Gegenlesen)

- Eigene Prüfkonten statt Erika, angelegt vom Prüflauf selbst statt über `testdaten.ts`.
- Bis 3 Codes pro Lauf.
- «Spam» und «Einrichtungsabend» wandern aus der Checkliste zu den Voraussetzungen vor Live.

## Dem Builder überlassen

- Genauer Ordnername, Name der Konfiguration, Aufbau der Ausgabe.
- Welche bestehenden E2E-Dateien welchen Checklistenpunkt tragen (nachweisen, nicht vermuten);
  ein Punkt ohne tragenden Test bleibt in der Handrunde.
- Ob die Handpunkte als eine Quelle (z. B. eine Datei mit Runden) gepflegt werden, aus der Doku,
  PR-Vorlage und Text für die externe Person entstehen, oder ob die Doku die Quelle ist.
