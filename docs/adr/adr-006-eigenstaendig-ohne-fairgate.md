[← ADR-Index](adr-index.md)

# ADR-006: MyTCO führt seine eigene Mitgliederliste, ohne Anbindung an Fairgate

**Status:** Entschieden · **Datum:** 2026-10-29 (festgehalten 2026-11-06) · **Issue:** #16

## Kontext

Der TCO verwaltet seine Mitglieder und Finanzen in Fairgate, gebucht sind «Basis Medium»
und «Finance Pro». Mitgliederbereich (Intranet) und Kurs- und Eventmodul hat er dort nicht
(B). Das Anforderungsdokument v1.2 sieht MyTCO als Ort, an dem Mitglieder sich anmelden,
ihre Daten ändern, sich für Anlässe und die Clubmeisterschaft anmelden und Lizenzen
beantragen; die Anbindung an Fairgate soll geprüft werden (A-MITGLIED-05).

Die [Recherche Systemlandschaft](../recherche/2026-10-29-systemlandschaft.html) vom
29.10.2026 hat drei Wege verglichen und Weg A empfohlen. Am selben Tag hat der
Projektleiter Weg C gewählt (N-EIGENSTAENDIG-01). Dieses ADR hält fest, warum.

**Legende:** **B** = belegt, **S** = Schätzung, **V** = Vermutung, **offen** = nicht
geklärt; Quellen und Einzelbelege in der Recherche. PT = Personentag zu 8 Stunden.

## Optionen

| Option | Dafür | Dagegen |
|--------|-------|---------|
| **A · Fairgate ausbauen, MyTCO nur für die Clubmeisterschaft** — Intranet und Eventmodul bei Fairgate dazubuchen; MyTCO macht nur, was es nirgends gibt | Nur eine Mitgliederliste; weniger Eigenbau (Etappen 1–3 ca. 41–65 PT, S) | Zwei Logins für die Mitglieder, sofern Fairgate kein gemeinsames erlaubt (V); Module ca. CHF 280–400/Jahr plus einmalig gleich viel (S), dazu trotzdem Hosting für MyTCO; das Eventmodul kann die Regeln der Clubmeisterschaft nicht (höchstens 3 Anmeldungen, Filter nach Kategorie, Doppelpartner, S); Login, Erstanmeldung und Abläufe gibt Fairgate vor |
| **B · MyTCO als Hub, Fairgate im Hintergrund** — Mitglieder sehen nur MyTCO, Änderungen gehen über die Schnittstelle nach Fairgate | Ein Login; nur eine führende Mitgliederliste; die volle Vision des Anforderungsdokuments | Steht und fällt mit dem Schreibzugriff auf Fairgate: ob die Kontakt-Schnittstelle in «Basis» enthalten ist, schreiben kann und was sie kostet, ist offen; Eigenbau ca. 55–89 PT plus Anbindung (S); jede Änderung bei Fairgate kann MyTCO brechen |
| **C · MyTCO eigenständig** — eigene Mitgliederliste neben Fairgate; Fairgate bleibt für die Finanzen | Ein Login; Abläufe frei wählbar; keine Abhängigkeit von einer ungeklärten Schnittstelle; keine Zusatzmodule bei Fairgate | Doppelte Datenpflege, weil Finance Pro die Mitgliederdaten für die Rechnungen braucht (V); Eigenbau ca. 55–89 PT plus Datenübernahme (S); die ganze Datenschutzverantwortung für MyTCO liegt beim Verein |

## Entscheidung

**MyTCO führt eine eigene Mitgliederliste und ist nicht an Fairgate angebunden; Fairgate
bleibt die Mitgliederverwaltung für Finanzen und Rechnungen (Weg C).**

Begründung:

- **Ein Login für alles:** Mitglieder kennen nur MyTCO. Weg A hätte ihnen voraussichtlich
  ein zweites Login bei Fairgate zugemutet (V).
- **Keine Wette auf die Schnittstelle:** Ob Fairgate Daten schreiben lässt, ist offen.
  Weg B wäre erst baubar, wenn das geklärt ist, und könnte dann immer noch scheitern.
- **Eigene Abläufe:** Login per Brief-Code ohne Passwort ([ADR-004](adr-004-login-einmal-code.md)),
  Konten der Junioren, Anmeldung zur Clubmeisterschaft und Anlässe folgen den Bedürfnissen
  des Vereins, nicht dem Funktionsumfang der Fairgate-Module.
- **Kosten:** Intranet und Eventmodul kosten ca. CHF 280–400 pro Jahr plus einmalig gleich
  viel (S), MyTCO selbst laufend ca. CHF 95–175 pro Jahr ([Kosten](../kosten.md), S). Die
  Module decken die Clubmeisterschaft trotzdem nicht ab, und das Hosting braucht MyTCO auf
  jedem Weg.

Die Einbindung in die Website tcolten.ch (Login-Feld, News) ist nicht Teil dieser
Entscheidung; sie steht in der [Roadmap](../roadmap.md) unter «Vorerst nicht dabei».

## Konsequenzen

**Doppelte Datenpflege:** Es gibt zwei Mitgliederlisten. Was der Verein ohnehin in Fairgate
pflegt, kommt per Datei nach MyTCO; was Mitglieder in MyTCO selbst ändern, überträgt ein
Admin von Hand nach Fairgate. Dafür gibt es:

- die Liste *Für Fairgate* mit selbst geänderten Kontaktangaben zum Abhaken (A-KONTO-02,
  Annahme K-19.2),
- das Einlesen der Mitgliederliste aus Fairgate für Ein- und Austritte (A-MITGLIED-07,
  #46, hängt an K-45),
- die Mitgliedernummer aus Fairgate als gemeinsamer Schlüssel ([Fachmodell](../fachmodell.md);
  ob Fairgate eine feste Nummer führt und exportiert, hängt an K-45).

**Datenschutz:** Der Verein ist für die Daten in MyTCO allein verantwortlich: Konzept,
Datenschutzerklärung, Löschfristen und Sicherheit ([Datenschutz](../datenschutz.md),
[Sicherheitskonzept](../sicherheitskonzept.md)).

**Kosten:** Bei Fairgate kommt nichts dazu; «Basis Medium» und «Finance Pro» laufen weiter
wie bisher. Die Kosten von MyTCO selbst stehen in [ADR-003](adr-003-hosting-infomaniak-vps.md)
und [Kosten](../kosten.md).

**Leichter:** Login, Profil, Anlässe und Clubmeisterschaft aus einem Guss; Änderungen an
Fairgate treffen höchstens das Einlesen der Mitgliederliste, nicht den Betrieb von MyTCO.

**Schwerer:** Die Admins der Mitgliederverwaltung arbeiten in zwei Systemen. Fehler beim
Übertragen lassen die Listen auseinanderlaufen.

## Reevaluations-Trigger

- Fairgate bietet dem Verein eine Schnittstelle an, über die MyTCO Mitgliederdaten lesen
  und schreiben kann (dann Weg B prüfen).
- Die Admins der Mitgliederverwaltung melden, dass die Doppelpflege nicht mehr zu
  schaffen ist, oder die Listen laufen trotz Liste *Für Fairgate* sichtbar auseinander.
- Der Verein bucht bei Fairgate den Mitgliederbereich oder wechselt die
  Mitgliederverwaltung.
- Vor der Etappe *Lizenzanträge*: Nutzt der Verein die Lizenzverwaltung von Fairgate, die
  Lizenzen direkt bei Swiss Tennis bestellt und sistiert? Dann gehören die Lizenzanträge
  vielleicht dorthin statt nach MyTCO.
