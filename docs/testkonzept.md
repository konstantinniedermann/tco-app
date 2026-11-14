[← Übersicht](index.md)

# Testkonzept

Wie MyTCO getestet wird. Gearbeitet wird testgetrieben: erst der Test, dann der Code. Ein
Fehler wird zuerst mit einem Test nachgestellt, dann behoben. Fertig ist eine Änderung erst,
wenn die CI grün ist und, bei Änderungen an der Oberfläche, Screenshots sie zeigen.

Technik nach [ADR-002](adr/adr-002-sveltekit-postgresql.md). Wie die CI aufgebaut ist und
wann ausgeliefert wird, regelt [CI/CD und Release](ci-cd-und-release.md).

## Testebenen

| Ebene | Was | Werkzeug | Läuft |
|-------|-----|----------|-------|
| Fachlogik | Fachregeln `FR-NN` aus dem [Fachmodell](fachmodell.md): Fristen, Grenzen, Zustände, Berechnungen | Vitest | `make check`, CI |
| Schnittstellen und Rechte | Jede Schnittstelle (`+server.ts`) gegen eine echte PostgreSQL; für jede Rolle, ob sie zugreifen darf ([Rollen und Rechte](rollen-und-rechte.md), `RR-NN`) | Vitest, PostgreSQL im Container | `make check`, CI |
| Ende-zu-Ende | Wichtige Abläufe durch die Oberfläche, mit Barrierefreiheits-Prüfung (N-BARRIEREFREI-01) | Playwright, axe | `make check`, CI |
| Betrieb | Einrichtungs- und Auslieferungsskripte (`betrieb/bin`) mit Ersatz-docker; Gesamtnachweis auf Docker Desktop | Vitest (`tests/betrieb`), `make betrieb-nachweis` | `make check` (Vitest-Teil), Nachweis von Hand |
| Echte Geräte | Installation, Push, E-Mail auf echten Handys | von Hand, [Checkliste](#checkliste-vor-dem-release) | vor jedem Release, sobald Test läuft |

**Fachlogik** liegt in Server-Modulen (Bauregel in ADR-002). Vorgabe dieses Konzepts: Die
Fachregeln selbst greifen nicht auf Datenbank oder Oberfläche zu, sondern erhalten ihre
Daten übergeben. So sind sie ohne Aufbau testbar; hier entstehen die meisten Tests.

**Oberfläche:** Keine eigenen Tests für einzelne Bausteine der Oberfläche; sie enthält keine
Fachlogik und wird über die Ende-zu-Ende-Tests und das Review geprüft. Reine Logik der Oberfläche
(z. B. `src/lib/ui/navigation.ts`, `src/lib/verwaltung/zeilenaktionen.ts`) darf Einheitstests haben.

**Rechte:** Die Berechtigung prüft immer der Server (ADR-001), also wird sie dort getestet.
Pro Schnittstelle gibt es einen Test, der jede Rolle durchspielt, auch ohne Login und mit
dem Konto eines anderen Mitglieds (RR-06: *eigene* und *beteiligt*): erlaubte Rollen erhalten
die Daten, alle anderen nicht. Das gesperrte Konto (RR-08) wird nicht pro Schnittstelle
geprüft, sondern einmal zentral: Die Sitzungsprüfung behandelt es wie «nicht angemeldet»
(Tests in `sitzung.db.test.ts`), und jede Schnittstelle geht über sie.

**Rechte-Matrix der Admin-Rollen:** `src/lib/server/admin/rechte-matrix.db.test.ts` ruft jede
schreibende Schnittstelle der Verwaltung als MyTCO-Admin auf und erwartet überall ausser bei
den Rollen eine Absage, ohne dass sich in der Datenbank etwas ändert; dazu Lesen je Bereich und
die fremden Bereiche der anderen Rollen. Eine neue schreibende Schnittstelle fällt dort
automatisch hinein. Den Riegel von *Ansicht als …* (SI-20) prüfen
`src/lib/server/ansicht-riegel.test.ts` und `src/lib/server/admin/ansicht.db.test.ts`.

**Ende-zu-Ende** in drei Umgebungen:

| Umgebung | Steht für |
|----------|-----------|
| Safari-Engine (WebKit), Handygrösse | iPhone, gut die Hälfte der Mitglieder (ADR-001) |
| Chrome, Handygrösse | Android |
| Chrome, Desktop | Verwaltung am PC |

**Passkey:** Die Ende-zu-Ende-Tests nutzen einen virtuellen Authenticator (Chrome DevTools
Protocol) und laufen darum nur in Chrome. WebKit bietet das nicht, die Safari-Engine prüft
den Passkey-Ablauf also nicht. Wie sich ein echter Authenticator auf iPhone und Android
verhält, zeigt allein die [Checkliste](#checkliste-vor-dem-release).

Die Ende-zu-Ende-Tests decken die Abläufe einer Etappe ab, nicht jede Einzelheit. Heute
(`tests/e2e/`): Login per Einmal-Code und eingeloggt bleiben, Passkey, Startseite, Hilfe und
Datenschutzerklärung ohne Login, Profil mit E-Mail-Wechsel und Rufname, Benachrichtigungen, Anlässe,
Mitteilungen, Verwaltung mit Rollen, Einlesen einer Datei, Briefe einzeln und als Serie mit Druckansicht, Austritt,
Löschen und Auskunft, Turnier und Kategorien,
CM-Anmeldung mit Wildcard-Antrag und Anmeldungen verwalten, Doppel mit Partner-Anfragen und Doppel-Verwaltung durch den CM-Admin, Kontaktdaten in den Anmeldelisten, Gespräch mit der Turnierleitung, Seite einer Kategorie, Navigation und Tiefe der Seiten, Titel in der Kopfleiste, Verwaltung am PC (klebender Seitenkopf, einzeilige Tabellen mit «Ändern»), dazu Bedienung (Wappen,
Statusleiste, Fusszeile, Fokusrahmen). Später *Daten ergänzen* beim ersten Login (FR-02, noch
geplant).

**Grenzen pro IP:** Alle Browser eines Laufs kommen von 127.0.0.1 an denselben Server; die
Grenze von 10 Code-Anfragen pro IP und Stunde (SI-04) gilt für den ganzen Lauf, Login-Codes
und E-Mail-Wechsel zusammen. Jeder Test braucht darum nur die nötigen Anfragen; den Login mit
der neuen Adresse nach einem E-Mail-Wechsel prüft nur das iPhone.

## Abdeckung

Die CI misst, welcher Code durch Tests läuft. **Mindestens 90 %** gilt für Fachlogik und
Rechte-Prüfung (`src/lib/server/`, dazu die Fachlogik, die auch im Browser läuft: `src/lib/turnier/`,
`src/lib/anlass/stand.ts` und `zeit.ts`); darunter schlägt die CI an. Für die Oberfläche gibt es keine Zahl; dort
zählen die Ende-zu-Ende-Tests und das Review.

## Anforderung → Testfall

Jeder Test, der eine Fachregel, einen Grundsatz oder eine Anforderung prüft, nennt im Namen die ID, z. B.
`FR-24: Einmal-Code gilt nur einmal` oder `RR-04: Datenbank enthält den Brief-Code nicht im Klartext`.
Ein Test darf mehrere IDs nennen.

Die CI prüft, dass jede dieser IDs mindestens einen Test hat (sie sucht die ID irgendwo in
einer Testdatei; dass sie im Namen des richtigen Tests steht, sichert das Review):

- jede Fachregel `FR-NN` aus dem Fachmodell,
- jeder Grundsatz `RR-NN` aus Rollen und Rechte,
- jede funktionale Anforderung (`A-…`) mit Status `umgesetzt` in den
  [Anforderungen](anforderungen/anforderungen.md); ist sie nur von Hand prüfbar (z. B.
  A-LOGIN-01, Brief per Post), zählt ihr Punkt in der
  [Checkliste vor dem Release](#checkliste-vor-dem-release) als Test.

Als Test zählt nur eine Datei, die Vitest oder Playwright auch ausführt; eine Testdatei
ausserhalb ihrer Muster (`scripts/pruefungen/testmuster.ts`) ist ein Fehler.

Fachregeln und Grundsätze von Etappen, die noch nicht gebaut sind, nimmt die Prüfung aus.
Massgebend ist die Spalte *Status*: Die CI verlangt einen Test nur für `umgesetzt`.
Nicht-funktionale Anforderungen (`N-…`), Datenschutz-Vorgaben (`DS-NN`) und
Sicherheits-Vorgaben (`SI-NN`, [Sicherheitskonzept](sicherheitskonzept.md)) erhalten
Tests, wo sie prüfbar sind (z. B. DS-06: keine Einmal-Codes im Log), ohne Pflicht.

## Testdaten

Nur erfundene Personendaten (DS-08); öffentliche Daten ohne Personennamen, etwa die Interclub-Resultate der Teams von Swiss Tennis, dürfen 1:1 verwendet werden. Nie echte Mitgliederdaten, auch nicht zur Fehlersuche und nie
eine Kopie der Datenbank vom Server. Die Regeln unten gelten für Daten im Repo.

- Wenige erfundene Personen, von Hand geschrieben und fest im Repo, ohne Generator für Namen
  oder Adressen. Seed-Daten und Testdaten der Test-Umgebung
  (beide aus `scripts/erfundene-mitglieder.ts`; Mona und Theo nur lokal aus `scripts/seed-lokal.ts`); der Musterbrief nimmt dieselbe erste Person, aber mit eigener Adresse.
  Die Beispiel-GV (`scripts/beispiel-anlass.ts`) legt für `make seed` fünf weitere erfundene
  Mitglieder an, das Beispielturnier (`scripts/beispiel-turnier.ts`) sechs weitere erfundene
  Spieler mit Login (ohne Brief-Code), mit Einzel- und Doppel-Anmeldungen, einem Wildcard-Antrag, Spielern, die einen Partner suchen, und einer offenen Partner-Anfrage; Kontaktperson ist Hanna Muster (CM-Admin).
- Ausnahme für die lokale Datenbank: Der Testbestand von `make seed`
  (`scripts/beispiel-mitglieder.ts`) kombiniert feste Vornamen mit erkennbar erfundenen
  Nachnamen zu 185 Mitgliedern (zusammen mit den Personas rund 200), ohne Zufall und ohne
  Bibliothek; dazu ein zweiter Anlass mit gemischten Antworten. Er ist bei jedem Lauf gleich und
  legt nichts doppelt an.
- Jeder E2E-Lauf (`npm run e2e`, also auch `make e2e`, `make check`, der Pre-Push-Hook und die
  CI) läuft über `scripts/e2e.ts` auf einer eigenen, frisch angelegten Datenbank
  (`mytco_e2e_<Zeit>_<Zufall>`) und löscht sie danach; Reste abgebrochener Läufe, die älter als
  ein Tag sind, räumt der nächste Lauf weg. Die lokale Datenbank `mytco` gehört so nur
  `make seed`, `make dev` und `make dev-handy` und wächst nicht mit den Testkonten der Läufe.
  Ebenso baut jeder Lauf in einen eigenen Ordner (`.e2e-build/<Name der Datenbank>/`, über
  `MYTCO_E2E_BUILD` in `vite.config.ts`) und löscht ihn danach: Ein anderer Build im selben Ordner
  gäbe dem laufenden Server sonst eine neue `version.json`, und SvelteKit lüde Fehlerseiten endlos
  neu.
- Tests, die ein Mitglied anlegen, geben ihm eine eindeutige Adresse
  (`test-<UUID>@example.org`), damit parallele Tests einander nicht stören.
- E-Mail-Adressen nur `@example.org` (für Beispiele reserviert). Telefonnummern im Format
  `+41 00 …`, das es nicht gibt. Strassen erfunden.
- Die CI meldet in Testdaten (auch denen der Test-Umgebung), Seed-Daten, Beispieldaten und Musterbrief jede
  andere Mail-Domain.
- Einmal-Codes und Sitzungen in Tests sind erzeugt, nie fest eingetragen.

## Screenshots als Nachweis

Playwright macht bei jedem Ende-zu-Ende-Test Screenshots in Handy- und Desktop-Grösse. Die
CI legt sie als Anhang des Laufs ab (höchstens 30 Tage); der PR verlinkt den Lauf. Ein
Pixelvergleich findet nicht statt: Screenshots belegen, dass etwas so aussieht, sie
blockieren keine gewollte Design-Änderung.

## Checkliste vor dem Release

Auf der [Test-Umgebung](ci-cd-und-release.md#umgebungen) `test.my.tcolten.ch`, mit einem
iPhone (Safari) und einem Android-Handy (Chrome) und den erfundenen Mitgliedern der
Test-Umgebung (Erika Beispiel, Kurt Erfunden, Hanna Muster, alle `@example.org`). Sie entstehen
bei jeder Auslieferung neu; nach jeder Auslieferung kommt ein Brief-Code für Erika Beispiel per
E-Mail. Alle Mails von Test, auch die Codes per E-Mail für die erfundenen Mitglieder, gehen über
die Umleitung (`MAIL_NUR_AN`) an den Projektleiter; der Betreff nennt den ursprünglichen
Empfänger. Die Test-Umgebung auf dem Server entsteht mit [#39](https://github.com/konstantinniedermann/tco-app/issues/39); bis dahin lässt sich die Checkliste nur lokal (`make betrieb-nachweis`) vorbereiten. Jeder Punkt nennt die IDs, die er prüft:

- [ ] QR-Code aus einem Testbrief öffnet MyTCO; im Brief für Live steht `my.tcolten.ch` (A-LOGIN-01, A-LOGIN-04)
- [ ] Brief aus der Druckansicht der Verwaltung in Chrome und in Safari auf Papier drucken (Massstab 100 %): Adresse liegt im Fenster des Kuverts C5/6, eine Seite je Brief (A-LOGIN-01)
- [ ] MyTCO lässt sich auf den Startbildschirm legen und startet von dort
- [ ] Login mit Einmal-Code klappt; nach Neustart des Handys weiterhin eingeloggt (A-LOGIN-08, A-LOGIN-09)
- [ ] Neuer Code per E-Mail kommt an und landet nicht im Spam (A-LOGIN-10)
- [ ] iPhone, App vom Startbildschirm: Code per E-Mail anfordern, App ganz schliessen, wieder öffnen → das Feld «Code aus der Mail» steht da (A-LOGIN-10)
- [ ] Passkey auf einem echten iPhone **in der App vom Startbildschirm**: nach einem Code-Login einrichten (die Passkey-Abfrage erscheint beim ersten Tippen), abmelden, mit Passkey anmelden; die Abfrage darf sich nicht wiederholen oder hängen (A-LOGIN-07, [ADR-005](adr/adr-005-passkey-simplewebauthn.md), Restrisiken). Offen, bis die Test-Umgebung (#39) steht
- [ ] Passkey auf einem Android-Handy (Chrome): einrichten und anmelden (A-LOGIN-07). Offen, bis #39 steht
- [ ] Anmeldung am PC mit dem Passkey vom Handy per QR-Code (A-LOGIN-07). Offen, bis #39 steht
- [ ] iPhone (Safari): QR-Code scannen → Einstiegsseite mit Anleitung; die Schritte und Beschriftungen stimmen mit Safari überein; nach dem Ablegen startet MyTCO vom Symbol direkt mit dem Login (A-HILFE-02)
- [ ] Android (Chrome): Taste «MyTCO installieren» öffnet den Dialog von Android; die Anleitung über das Menü stimmt mit Chrome überein; im Samsung-Browser beobachten, ob die Anleitung passt (A-HILFE-02)
- [ ] Seite Hilfe ohne Login über die Fusszeile erreichbar, der Kontakt stimmt (A-HILFE-01)
- [ ] Anlass: «In den Kalender» auf einem echten iPhone **in der App vom Startbildschirm** und auf einem Android-Handy; der Termin landet mit Datum, Zeit und Ort im Kalender des Geräts (A-ANLASS-01, SI-19); vorher als Erika in der Verwaltung einen Anlass anlegen (Test ist nach jeder Auslieferung ohne Anlass)
- [ ] iPhone, App vom Startbildschirm: Telefon und Adresse im Profil ändern; E-Mail ändern, in die Mail-App wechseln und zurück → Schritt 2 mit den zwei Code-Feldern steht da, beide Mails kommen an (über die Umleitung), danach Login mit der neuen Adresse (A-KONTO-01, A-KONTO-02, SI-09)
- [ ] Verwaltung am PC: die Selbständerung erscheint unter *Für Fairgate* und verschwindet nach dem Abhaken (A-KONTO-02)
- [ ] iPhone (App vom Startbildschirm) und Android: Reiterwechsel blendet über, Hilfe schiebt sich herein und mit «‹ Start» hinaus, Aufklappbereich öffnet weich, der Seitentitel blendet beim Scrollen in die Kopfleiste über, auch in der Verwaltung; kein grauer Tipp-Blitz, kein Link-Menü beim langen Drücken auf Reiter und Tasten; mit «Bewegung reduzieren» alles ohne Bewegung (UI-09, #54)
- [ ] iPhone und Android: Kopfleiste und Reiter bleiben beim Scrollen stehen, auch die Kopfleiste der Verwaltung, ohne hellen Schleier über Uhr und Akku (Leitbild «Statusleisten-Band»); Tipp auf einen Reiter wirkt auch, während der Inhalt nachläuft; mit offener Tastatur (z. B. Adresse im Profil) sind die Reiter weg, die Kopfleiste bleibt oben, nichts springt, «Weiter» führt ins nächste Feld (Leitbild «Eingabe mit Tastatur», #54)
- [ ] iPhone (App vom Startbildschirm) und Android: Tipp aufs Wappen führt zur Startseite; mit offener Tastatur schliesst er nur die Tastatur; nach einer ungespeicherten Änderung (z. B. Telefon im Profil) kommt «Nicht gespeichert – trotzdem verlassen?», *Abbrechen* bleibt, *Verlassen* geht weiter (Leitbild «Ungespeicherte Änderungen»)
- [ ] Steht ein Einrichtungsabend an: mobile Daten statt Club-WLAN, oder die Grenzen pro IP vorher prüfen ([ADR-004](adr/adr-004-login-einmal-code.md), Restrisiken)
- [ ] Push auf einem echten iPhone **in der App vom Startbildschirm** und auf einem Android-Handy: Push einschalten, als Mitglieder-Admin eine Mitteilung zu einem Anlass schicken → sie kommt an, ein Tipp darauf öffnet den Anlass; nach dem Abmelden kommt keine mehr an (FR-40, FR-44). Offen, bis #39 steht
- [ ] Erika Beispiel (MyTCO- und Mitglieder-Admin) öffnet auf Test die Verwaltung mit Code per Mail (SI-08, A-ROLLE-02)
- [ ] Rollen: `rechte-matrix.db.test.ts` ist im Lauf von `make check` grün; auf Test gibt Erika Hanna Muster die Rolle CM-Admin, schaltet *Ansicht als CM-Admin* ein: Band oben, Turniere ohne Speicher-Tasten, eine Mitgliedseite, die schon vorher in einem zweiten Tab offen war, meldet beim Speichern «In der Ansicht kannst du nichts speichern.» (Riegel, SI-20); *Beenden* bringt die Tasten zurück; danach die Rolle wieder entziehen (A-ROLLE-01, A-ROLLE-09)
- [ ] Verwaltung am PC: die geänderten Funktionen einmal durchgehen
- [x] Löschfristen gebaut (Etappe 3 von #43): Änderungsverlauf nach 12 Monaten (FR-26), Anlass-Antworten ein Jahr nach Beginn des Anlasses (K-50), Austritt plus 1 Jahr (K-38); auf Test prüfen, dass der Zeitgeber läuft (`ZEITGEBER` nicht auf `aus`)
- [ ] `admin-festlegen` einmal auf Test über `docker compose exec` ausgeführt

Nach dem Release einmal `my.tcolten.ch` öffnen: Die Fusszeile zeigt die neue Version.

## Testgruppe

Eine Testgruppe des Projektleiters prüft vor dem Briefversand, ob Mitglieder mit Brief,
Anleitung und Hilfe alleine zurechtkommen (Etappe *Pilot*). Sie nutzt MyTCO auf Live mit
ihren eigenen echten Daten, mit einer Vorabversion 0.x vor 1.0.0; davor gilt die
Checkliste oben auf Test. Das ist Betrieb, kein Test im Sinne von DS-08; vorher muss die
Datenschutzerklärung gelten.

**Älteres Handy:** ein iPhone mit iOS 16 oder 17 oder ein Android-Handy mit Android 9 bis 11
(darunter gibt es keine Passkeys). Eine Untergrenze für MyTCO ist damit nicht festgelegt;
die Testgruppe liefert Erfahrungswerte.

Ablauf, Aufträge, Texte und Auswertung → [Testgruppe](testgruppe.md).

## Werkzeuge

Vitest (mit Abdeckungsmessung), Playwright und axe für Playwright. Mails fängt
Mailpit ab (lokal und in der CI); die Ende-zu-Ende-Tests lesen Codes über seine Schnittstelle.
