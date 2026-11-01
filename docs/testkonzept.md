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
| Echte Geräte | Installation, Push, E-Mail auf echten Handys | von Hand, [Checkliste](#checkliste-vor-dem-release) | vor jedem Release |

**Fachlogik** liegt in Server-Modulen (Bauregel in ADR-002). Vorgabe dieses Konzepts: Die
Fachregeln selbst greifen nicht auf Datenbank oder Oberfläche zu, sondern erhalten ihre
Daten übergeben. So sind sie ohne Aufbau testbar; hier entstehen die meisten Tests.

**Oberfläche:** Keine eigenen Tests für einzelne Bausteine der Oberfläche; sie enthält keine
Fachlogik und wird über die Ende-zu-Ende-Tests und das Review geprüft.

**Rechte:** Die Berechtigung prüft immer der Server (ADR-001), also wird sie dort getestet.
Pro Schnittstelle gibt es einen Test, der jede Rolle durchspielt, auch ohne Login, mit
gesperrtem Konto (RR-08) und mit dem Konto eines anderen Mitglieds (RR-06: *eigene* und
*beteiligt*): erlaubte Rollen erhalten die Daten, alle anderen nicht.

**Ende-zu-Ende** in drei Umgebungen:

| Umgebung | Steht für |
|----------|-----------|
| Safari-Engine (WebKit), Handygrösse | iPhone, gut die Hälfte der Mitglieder (ADR-001) |
| Chrome, Handygrösse | Android |
| Chrome, Desktop | Admin am PC |

Die Ende-zu-Ende-Tests decken die Abläufe einer Etappe ab, nicht jede Einzelheit; zuerst
Login per Einmal-Code, Daten ergänzen und eingeloggt bleiben (die geplanten
A-LOGIN-Anforderungen der Etappe *Mitglieder-Login*).

## Abdeckung

Die CI misst, welcher Code durch Tests läuft. **Mindestens 90 %** gilt für Fachlogik und
Rechte-Prüfung; darunter schlägt die CI an. Für die Oberfläche gibt es keine Zahl; dort
zählen die Ende-zu-Ende-Tests und das Review.

## Anforderung → Testfall

Jeder Test nennt im Namen die ID, die er prüft, z. B.
`FR-24: Einmal-Code gilt nur einmal` oder `RR-04: Admin kann keinen Code abrufen`.
Ein Test darf mehrere IDs nennen.

Die CI prüft, dass jede dieser IDs mindestens einen Test hat:

- jede Fachregel `FR-NN` aus dem Fachmodell,
- jeder Grundsatz `RR-NN` aus Rollen und Rechte,
- jede funktionale Anforderung (`A-…`) mit Status `umgesetzt` in den
  [Anforderungen](anforderungen/anforderungen.md); ist sie nur von Hand prüfbar (z. B.
  A-LOGIN-01, Brief per Post), zählt ihr Punkt in der
  [Checkliste vor dem Release](#checkliste-vor-dem-release) als Test.

Fachregeln und Grundsätze von Etappen, die noch nicht gebaut sind, nimmt die Prüfung aus;
wie, legt das Code-Gerüst ([#15](https://github.com/konstantinniedermann/tco-app/issues/15))
fest. Nicht-funktionale Anforderungen (`N-…`), Datenschutz-Vorgaben (`DS-NN`) und
Sicherheits-Vorgaben (`SI-NN`, [Sicherheitskonzept](sicherheitskonzept.md)) erhalten
Tests, wo sie prüfbar sind (z. B. DS-06: keine Einmal-Codes im Log), ohne Pflicht.

## Testdaten

Nur erfundene Daten (DS-08), nie echte Mitgliederdaten, auch nicht zur Fehlersuche und nie
eine Kopie der Datenbank vom Server. Die Regeln unten gelten für Daten im Repo.

- Wenige erfundene Personen, von Hand geschrieben und fest im Repo, ohne Generator. Für die
  Seed-Daten der lokalen Entwicklung dieselben Personen.
- E-Mail-Adressen nur `@example.org` (für Beispiele reserviert). Telefonnummern im Format
  `+41 00 …`, das es nicht gibt. Strassen erfunden.
- Die CI meldet in Testdaten und Seed-Daten jede andere Mail-Domain.
- Einmal-Codes und Sitzungen in Tests sind erzeugt, nie fest eingetragen.

## Screenshots als Nachweis

Playwright macht bei jedem Ende-zu-Ende-Test Screenshots in Handy- und Desktop-Grösse. Die
CI legt sie als Anhang des Laufs ab (höchstens 30 Tage); der PR verlinkt den Lauf. Ein
Pixelvergleich findet nicht statt: Screenshots belegen, dass etwas so aussieht, sie
blockieren keine gewollte Design-Änderung.

## Checkliste vor dem Release

Auf der [Test-Umgebung](ci-cd-und-release.md#umgebungen) `test.my.tcolten.ch`, mit einem
iPhone (Safari) und einem Android-Handy (Chrome) und einem erfundenen Testkonto. Es entsteht
bei jeder Auslieferung neu und nutzt die Adresse des Projektleiters, damit der Code per
E-Mail ankommt. Jeder Punkt nennt die IDs, die er prüft:

- [ ] QR-Code aus einem Testbrief öffnet MyTCO; im Brief für Live steht `my.tcolten.ch` (A-LOGIN-01, A-LOGIN-04)
- [ ] MyTCO lässt sich auf den Startbildschirm legen und startet von dort
- [ ] Login mit Einmal-Code klappt; nach Neustart des Handys weiterhin eingeloggt (A-LOGIN-08, A-LOGIN-09)
- [ ] Neuer Code per E-Mail kommt an und landet nicht im Spam (A-LOGIN-10)
- [ ] Push einschalten und erhalten (ab Etappe *CM-Betrieb*)
- [ ] Admin-Seite am PC: die geänderten Funktionen einmal durchgehen

Nach dem Release einmal `my.tcolten.ch` öffnen: Die Fusszeile zeigt die neue Version.

Falls der Verein eine Testgruppe stellt (K-20), prüft sie vor dem ersten Release
*Mitglieder-Login* Brief, Installation und Login, ebenfalls mit erfundenen Testkonten.

## Werkzeuge

Vitest (mit Abdeckungsmessung), Playwright und axe für Playwright. Sie werden mit dem
Code-Gerüst (#15) zur Freigabe vorgelegt und installiert; vorher kommt keine Abhängigkeit
ins Repo.
