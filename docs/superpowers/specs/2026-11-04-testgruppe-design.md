# Testgruppe — Design (#40)

Stand 04.11.2026. Grundlage: Brainstorming mit dem Projektleiter am 04.11.2026, Issue #40.

## Zweck

Vor dem Briefversand an alle Mitglieder probiert eine kleine Gruppe MyTCO so aus, wie es
beim echten Start läuft: mit dem Brief, der Anleitung und der Hilfe, die alle Mitglieder
bekommen, und mit Aufträgen aus dem Alltag. Geprüft wird nicht, ob die App läuft (das
belegen Tests und die Checkliste), sondern **ob Mitglieder mit dem mitgegebenen Material
alleine zurechtkommen** und wo Anleitung oder Hilfe fehlen.

## Ziele, Nicht-Ziele, Anti-Ziele

- **Ziel:** Stolpersteine bei Zugang, Installation und den ersten Aufgaben finden, bevor
  300–500 Mitglieder einen Brief bekommen. Ergebnis pro Lauf: Liste der Befunde, sortiert
  nach «Doku fehlt», «App ändern», «passt».
- **Nicht-Ziel:** Funktionstest der App, Lasttest, Prüfung am Laptop (nur freiwillig).
- **Anti-Ziel:** Ein Test, bei dem im Chat sofort geholfen wird. Dann misst er die Hilfe des
  Projektleiters, nicht die Doku.

## Entscheide des Projektleiters (04.11.2026)

1. Die Testpersonen sucht der Projektleiter selbst. Eine Handvoll hat zugesagt, weitere
   Antworten stehen aus. Auch der Vorstand kann mitmachen.
2. Ein WhatsApp-Chat des Projektleiters dient der Koordination. Er gehört nicht zu MyTCO.
3. Der Testlauf läuft wie der echte Start, mit allen Infos, Anleitungen und der Hilfe, die
   beim Start mitgehen. Dazu kommen Aufträge, die den Alltag nachstellen (z. B. Angaben
   ändern, Passkey einrichten, Anmeldung zur CM).
4. Feedback kommt auf zwei Wegen: Probleme sofort im Chat, am Ende jedes Laufs ein kurzes
   Google Formular. Gefragt wird auch, ob es mehr oder andere Doku braucht.
5. Zugang per **Mail mit dem Brief als PDF**, mit dem Hinweis: am Laptop öffnen und mit dem
   Handy einrichten. Getestet wird vor allem auf dem Smartphone.
6. Der Pilot läuft auf Live mit einer **Vorabversion 0.x** (der letzten vor 1.0.0, keine feste
   Nummer). Befunde werden eingearbeitet, dann folgt 1.0.0 für alle Mitglieder zusammen mit
   dem Briefversand.
7. Die Hilfe beim Start (Hilfe-Seite in MyTCO, Anleitung zum Startbildschirm mit Animation)
   ist ein **eigenes Vorhaben B**. Es kommt in diesem Issue nur als Anforderung dazu und
   muss vor Lauf 1 stehen. Es bekommt ein eigenes Issue (Zustimmung des Projektleiters),
   #40 trägt `Blocked by` darauf.
8. Die Mail mit dem Brief-PDF verschickt der Projektleiter über sein privates Postfach.

Weiter gilt aus #40 (02.11.2026): Der Pilot läuft auf Live mit echten Daten. Das ist
Betrieb, kein Test im Sinne von DS-08. Die Konten bleiben danach bestehen.

## Ablauf

### Lauf 1 — Vorabversion 0.x (*Mitglieder-Login*), ohne festes Datum

Lauf 1 startet, sobald die Voraussetzungen erfüllt sind, möglicherweise schon im November
oder Dezember 2026 (Entscheid Projektleiter, 04.11.2026). Getestet wird, was bis dahin
gebaut ist: Ein Auftrag, dessen Funktion noch fehlt, entfällt in Lauf 1 und wandert in
einen späteren Lauf.

Voraussetzungen (alles vor dem ersten Mail):
- Live in Betrieb (#39), Login per Einmal-Code auf Live (#29)
- Mitgliederverwaltung mit Brief-Code und Brief als PDF (#43, Etappe 2)
- Vorhaben B (Hilfe-Seite, Animation zum Startbildschirm) ausgeliefert
- Datenschutzerklärung auf Live erreichbar (DS-09), Kontaktangabe für Fragen (K-21)
  geklärt, der Hinweis an die alte E-Mail-Adresse gebaut (FR-25, Checkliste)

Schritte:
1. Der Admin legt die Testpersonen in MyTCO an, mit ihren echten Daten.
2. Der Projektleiter schickt jeder Person eine Mail: Begrüssung, Zweck, Zeitraum, Regeln,
   Brief als PDF im Anhang. **Nur im Pilot:** Beim echten Start kommt der Brief per Post
   (A-LOGIN-01). `testgruppe.md` nennt diese Abweichung offen: Der Weg vom Papier ins Handy
   wird nur nachgestellt (PDF am Laptop, Scan mit dem Handy).
3. Die Testpersonen arbeiten die Aufträge ab (unten), zuerst alleine.
4. Probleme melden sie im Chat, am Ende füllen sie das Formular aus.
5. Der Projektleiter wertet aus (Abschnitt Auswertung). Befunde gehen in die Doku, die App
   oder `docs/beobachtungen.md`.

### Lauf 2 — vor dem 15.04.2027 (*CM-Anmeldung*)

Dieselbe Gruppe, derselbe Chat. Aufträge: zur CM anmelden, im Doppel mit einem Partner aus
der Gruppe, wieder abmelden. **Offen bis dahin:** Auf Live wäre das eine echte Anmeldung.
Entweder eine Probe-Clubmeisterschaft auf Live, die danach gelöscht wird, oder Lauf 2 auf
Test mit erfundenen Konten. Das wird vor Lauf 2 entschieden. Das Design hier legt nur
Lauf 1 im Detail fest.

## Aufträge Lauf 1

| Nr | Auftrag | Anforderung |
|----|---------|-------------|
| 1 | Brief-PDF am Laptop öffnen, QR-Code mit dem Handy scannen, MyTCO auf den Startbildschirm legen | A-LOGIN-01, -04, Vorhaben B |
| 2 | MyTCO über das Symbol öffnen, den Code eintippen, fehlende Angaben ergänzen | A-LOGIN-08, -03 |
| 3 | Eigene E-Mail-Adresse oder Telefonnummer ändern | A-KONTO-01 |
| 4 | Einen Passkey einrichten | A-LOGIN-07 |
| 5 | Handy neu starten, MyTCO öffnen: noch angemeldet? | A-LOGIN-09 |
| 6 | Ausloggen, einen neuen Code per Mail anfordern und damit einloggen | A-LOGIN-10 |
| 7 | Freiwillig: MyTCO am Laptop öffnen und mit dem Passkey vom Handy anmelden | A-LOGIN-07 |


Aufträge nach Rolle (z. B. Admin legt ein Mitglied an) gibt es in Lauf 1 nicht: Auf Live
entstünde ein echtes Konto, und die Admin-Seite prüft die Checkliste vor dem Release.

## Regeln für die Testpersonen

- Zuerst alleine mit Mail, Brief und Hilfe in MyTCO versuchen, wie es ein Mitglied ohne
  Testgruppe auch müsste. Erst dann im Chat fragen.
- Im Chat sagen, bei welchem Auftrag es hakt, gern mit Screenshot. Screenshots möglichst
  ohne fremde Daten.
- Der Projektleiter notiert jede Frage als Befund, auch wenn sie sich sofort klären lässt.

## Formular (Google Formular, eines pro Lauf)

Ohne Name und ohne E-Mail-Adresse, Option «E-Mail-Adressen erfassen» aus, keine Anmeldung
nötig.

1. Handy: iPhone / Android
2. Mailanbieter: Bluewin / Gmail / GMX / iCloud / anderer / weiss nicht
3. Pro Auftrag: ging ohne Hilfe / ging mit Mühe / ging nicht / nicht gemacht
4. Was hat in Brief, Mail oder Hilfe gefehlt oder war unklar? (Freitext)
5. Was sollten wir sonst noch wissen? (Freitext)

## Datenschutz

- **Liste der Testpersonen** (Name, Handymodell, Softwareversion, Mailanbieter,
  Altersgruppe grob nach Einschätzung des Projektleiters, z. B. unter 30 / 30–60 / über 60)
  nur in `intern/`. Der Projektleiter gibt sie Claude vor Lauf 1 durch (Entscheid
  04.11.2026); Claude legt die Datei an.
  Gelöscht nach Lauf 2. Ins Repo kommen nur Anzahl, Verteilung iPhone/Android, Altersspanne
  grob und ob ein älteres Handy dabei ist.
- **Formularantworten** liegen bei Google (ausserhalb CH/EU) und haben deshalb keinen
  Personenbezug. Bei 5–10 Personen lässt sich eine Antwort trotzdem manchmal einer Person
  zuordnen. Deshalb gibt es nur grobe Angaben und keinen Jahrgang. Die Antworten werden nach
  der Auswertung des Laufs gelöscht, die Auswertung ohne Namen bleibt im Repo.
- **WhatsApp-Chat** ist privat beim Projektleiter, nicht Teil von MyTCO. Inhalte daraus
  kommen nur als Befund ohne Namen ins Repo.
- **Daten auf Live** sind Betrieb (DS-08 gilt nicht). Die Konten bleiben nach dem Pilot.
- **Mail mit Brief-PDF:** Das PDF enthält Name, Adresse und Einmal-Code der Testperson und
  geht über das private Postfach des Projektleiters an sie selbst. Der Code gilt nur bis zum
  ersten Login, die Mail sagt das. Nach dem Versand löscht der Projektleiter die Mails im
  Ordner «Gesendet».
- **Datenschutzerklärung bleibt unverändert** (Claudes Festlegung): Liste, Formular und
  Chat sind Organisation des Pilots durch den Projektleiter, nicht Teil von MyTCO. Die Mail
  sagt den Testpersonen kurz, was mit Liste, Formular und Chat passiert und wann gelöscht
  wird. Die Begründung steht in `docs/datenschutz.md` im neuen Abschnitt *Testgruppe*; dazu
  Einträge unter *Löschen*.

## «Älteres Handy» (Festlegung)

Für Lauf 1 zählt, was Startbildschirm und Passkey brauchen. Claude ordnet die Handys anhand
der Softwareversion in der Liste ein; im Formular wird nicht danach gefragt, weil viele ihre
Version nicht kennen. Ein Handy gilt als älter, wenn
es ein iPhone mit iOS 16 oder 17 ist oder ein Android-Handy mit Android 9 bis 11. Darunter
gibt es keine Passkeys. Eine Untergrenze für MyTCO legt bisher kein Dokument fest; das
bleibt so, die Testgruppe liefert nur Erfahrungswerte. Steht so im Testkonzept unter
*Testgruppe* (Claudes Festlegung, Projektleiter kann sie ändern).

## Auswertung

Pro Lauf eine Tabelle in `docs/testgruppe.md`: Auftrag × Ergebnis (Anzahl ohne Hilfe / mit
Mühe / ging nicht), dazu die Befunde ohne Namen mit Einordnung (Doku fehlt / App ändern /
passt) und wohin sie gingen. Befunde aus dem Chat und dem Formular landen in derselben
Liste.

## Milestone *Pilot* (Entscheid Projektleiter, 04.11.2026)

Neue Etappe **Pilot** ohne Datum, vor *Mitglieder-Login*. Sie ist erreicht, wenn Lauf 1
ausgewertet ist.

| Milestone | Issues |
|-----------|--------|
| *Pilot* (neu, ohne Datum) | #29, #39, #44, Issue B (neu), #40 |
| *Mitglieder-Login* (28.02.2027) | #43 (Etappe 3 kommt erst danach), neues Issue «Release 1.0.0 und Briefversand an alle» (Zustimmung des Projektleiters) |

#43 bleibt in *Mitglieder-Login*, steht aber in #40 unter `Blocked by` (Etappe 2: Brief-Code
und Brief als PDF). #40 deckt Lauf 1 ab. Lauf 2 kommt vor der *CM-Anmeldung* als
Beobachtung bzw. eigenes Issue dazu, sobald die CM-Anmeldung gebaut wird.

## Was in welche Datei kommt

| Datei | Inhalt |
|-------|--------|
| `docs/testgruppe.md` (neu) | Ablauf, Voraussetzungen, Aufträge, Regeln, Mailtext zum Kopieren, Chat-Nachrichten zum Kopieren (Begrüssung, Start Lauf, Erinnerung, Dank), Formularfragen, Auswertung (leer bis Lauf 1) |
| `docs/datenschutz.md` | Abschnitt *Testgruppe*, Einträge unter *Löschen* |
| `docs/testkonzept.md` | Abschnitt *Testgruppe*: Verweis auf `testgruppe.md`, Definition «älteres Handy», Vorabversion 0.x |
| `docs/ci-cd-und-release.md` | Pilot mit der letzten Vorabversion 0.x auf Live, 1.0.0 nach dem Pilot für alle |
| `docs/roadmap.md` | Neue Etappe *Pilot* ohne Datum vor *Mitglieder-Login* (Vorabversion 0.x, Lauf 1); *Mitglieder-Login* = 1.0.0 und Briefversand bis 28.02.2027 |
| `docs/issue-konventionen.md` | nur falls dort Etappen aufgezählt sind |
| `docs/anforderungen/anforderungen.md` + Änderungsprotokoll | Neue Anforderungen zu Vorhaben B: Hilfe-Seite in MyTCO; Anleitung zum Startbildschirm mit Animation auf der Einstiegsseite, je nach iPhone/Android, nur solange MyTCO im Browser läuft |
| `docs/abklaerungen.md` | K-20 nach *Beantwortet*: Der Projektleiter stellt die Gruppe selbst zusammen, der Vorstand kann mitmachen |
| Fragen-Tabelle | K-20 umformuliert: Wer vom Vorstand mitmachen will, trägt sich auf *Wer ist wer* ein. Spalten D/E bleiben bis zur Übernahme nach `intern/` |
| `docs/versionen.md` | Eintrag unter *Unveröffentlicht* |
| Issue #40 | Body auf diesen Stand bringen, `Blocked by:` Issue für B. Die Punkte, die auf Lauf 1 warten, bleiben offen |
| Neues Issue B | Hilfe-Seite in MyTCO und Anleitung zum Startbildschirm mit Animation; Milestone *Mitglieder-Login*, `Blocks: #40`. Wird in einer eigenen Session gebrainstormt |

Das Google Formular legt Claude über den Chrome-Browser des Projektleiters an und spielt es
einmal durch (Screenshot), sobald `testgruppe.md` steht.

## Festlegungen von Claude (nach Prüfung, 04.11.2026)

Zum Gegenlesen durch den Projektleiter: Brief per Mail nur im Pilot · Altersgruppe grob in
`intern/` statt aus den Konten · keine Aufträge nach Rolle in Lauf 1 · Vorabversion ohne
feste Nummer · Termin 28.02.2027 bleibt · Datenschutzerklärung unverändert · Definition
«älteres Handy».

## Dem Umsetzenden überlassen

Formulierung von Mail und Chat-Nachrichten (kurz, Du-Form, Mundart-nah wie die übrigen
Texte an den Verein), Aufbau von `testgruppe.md`, genaue Formularoptionen.
