[← Übersicht](index.md)

# Rollen und Rechte

Welche Rollen MyTCO kennt und wer was sehen und ändern darf — für die Etappen
*Mitglieder-Login* bis *Lizenzanträge*. Objekte und Fachregeln `FR-NN` stehen im
[Fachmodell](fachmodell.md), Sichtbarkeit von Personendaten im
[Datenschutzkonzept](datenschutz.md).

**Vorschlag K-NN** = vom Vorstand noch zu bestätigen, Frage in den [Abklärungen](abklaerungen.md).

## Rollen

| Rolle | Ab Etappe | Aufgabe | Anforderung |
|-------|-----------|---------|-------------|
| **Mitglied** | Mitglieder-Login | Eigene Daten pflegen, sich zur CM anmelden, Resultate melden, Lizenz beantragen | A-ROLLE-03 |
| **Admin** | Mitglieder-Login | Mitglieder und Konten verwalten, Rollen vergeben; vertritt die beiden Verantwortlichen | A-ROLLE-02 |
| **CM-Verantwortlicher** | CM-Anmeldung | Turnier und Kategorien anlegen, Wildcard-Anträge entscheiden, Anmeldungen von Hand, Gruppen und Tableaus aus Advantage übernehmen, Resultate erfassen und Streitfälle entscheiden | A-ROLLE-07 |
| **Lizenzverantwortlicher** | Lizenzanträge | Stichtag der Lizenzrunde setzen, Anträge ansehen, exportieren und abhaken | A-ROLLE-08 |

Der Vorstand hat die Rollen bestätigt und will zwei Admins (K-18.1, K-18.3). Wer diese Rollen im Verein übernimmt, klärt K-18.2.

## Grundsätze

**Status:** `geplant` · `umgesetzt` (mit Test, siehe [Testkonzept](testkonzept.md#anforderung--testfall))

| ID | Regel | Status |
|----|-------|--------|
| RR-01 | Jedes Konto hat die Rolle *Mitglied*; weitere vergibt der Admin. Eine Person kann mehrere Rollen haben, ihre Rechte addieren sich (FR-03) | umgesetzt |
| RR-02 | Der Admin darf alles, was CM- und Lizenzverantwortlicher dürfen — als Stellvertretung, ohne sich die Rolle zu geben | geplant |
| RR-03 | Der letzte Admin kann sich die Rolle *Admin* nicht entziehen und sein Konto nicht löschen | umgesetzt\* (Entzug der Rolle; Austritt und Löschen mit Etappe 3) |
| RR-04 | Einmal-Codes (Brief- und Mail-Code) sind nur als Hash gespeichert und nach der Ausgabe für niemanden abrufbar, auch nicht für den Admin. Er kann einen neuen Brief-Code ausstellen, der nur den alten Brief-Code ersetzt, und alle Sitzungen eines Kontos beenden; einen Code per E-Mail holt sich das Mitglied selbst (A-LOGIN-10, [#29](https://github.com/konstantinniedermann/tco-app/issues/29)) | umgesetzt\* (Sitzungen beenden in der Verwaltung; neuer Brief-Code mit Etappe 2 von #43) |
| RR-05 | Für die Rolle *Mitglied* gibt es kein Mitgliederverzeichnis. Namen anderer Mitglieder erscheinen nur in Listen der CM und bei der Wahl des Doppelpartners (nur Mitglieder, die für die Kategorie passen und noch frei sind) | geplant |
| RR-06 | *eigene* und *beteiligt* hängen am Objekt, nicht an der Rolle: MyTCO prüft bei jedem Zugriff, ob das Konto Spieler der Anmeldung oder des Spiels ist | geplant |
| RR-07 | Die Admin-Oberfläche sieht nur, wer mindestens eine Rolle über *Mitglied* hinaus hat; sie zeigt ihm nur die Bereiche seiner Rollen (N-APP-03) | umgesetzt\* (nur Admin; CM und Lizenz mit ihren Etappen; geplant mit #57: `cm` öffnet die Verwaltung mit nur dem Bereich *Clubmeisterschaft*) |
| RR-08 | Ein gesperrtes Konto hat keine Rechte (FR-04) | umgesetzt\* (für die Admin-Rechte; Sperre durch Austritt folgt mit Etappe 3) |
| RR-09 | Die Admin-Oberfläche verlangt höchstens einmal pro 24 Stunden einen frischen Code per E-Mail ([SI-08](sicherheitskonzept.md#vorgaben), K-12.1) | umgesetzt |

## Matrix

**S** = lesen und ändern · **L** = lesen · **eigene** = nur die eigenen ·
**beteiligt** = als Spieler, Gegner oder Doppelpartner · **–** = nichts.
Jede Spalte zeigt alle Rechte der Rolle, die der Rolle *Mitglied* eingeschlossen.

| Daten / Funktion | Ohne Login | Mitglied | CM-Verantwortlicher | Lizenzverantwortlicher | Admin |
|------------------|:----------:|:--------:|:-------------------:|:----------------------:|:-----:|
| **Mitglieder-Login** | | | | | |
| Datenschutzerklärung, Login-Seite (DS-09) | L | L | L | L | L |
| Eigene E-Mail, Telefon, Lizenznummer, Klassierung, Benachrichtigungen (FR-02; E-Mail, Telefon und Lizenznummer: Annahme K-19.1, die E-Mail erst nach zwei Codes, SI-09) | – | S eigene | S eigene | S eigene | S eigene |
| Eigene Adresse (Annahme K-19.2) | – | S eigene | S eigene | S eigene | S |
| Eigener Name, Geschlecht, Jahrgang, Mitgliedernummer | – | L eigene | L eigene | L eigene | S |
| Mitglieder anlegen, bearbeiten, löschen, exportieren (DS-07) | – | – | – | – | S |
| Neuer Code für einen Brief, Sitzungen beenden | – | – | – | – | S |
| Rollen vergeben | – | – | – | – | S |
| Änderungsverlauf (FR-26) | – | – | – | – | L |
| Liste *Für Fairgate*: selbst geänderte Kontaktangaben sehen und abhaken (A-KONTO-02, Annahme K-19.2) | – | – | – | – | S |
| Namen anderer Mitglieder (RR-05) | – | L | L | L | S |
| E-Mail und Telefon anderer Mitglieder | – | L beteiligt, bis Turnierende (FR-19) | L alle (K-42) | L alle (K-42) | S |
| **CM-Anmeldung** | | | | | |
| Turnier, Turniernummern, Kategorien | – | L | S | L | S |
| Eigene Anmeldung, bis Anmeldeschluss (FR-10) | – | S eigene | S eigene | S eigene | S eigene |
| Anmeldungen aller (Name, Kategorie) | – | L bestätigte | S | L bestätigte | S |
| Klassierung der Spieler korrigieren (A-ANMELDUNG-06, K-28) | – | – | S | – | S |
| Wildcard-Antrag und Kommentar (FR-08) | – | S eigene | S, entscheidet | S eigene | S |
| **CM-Betrieb** | | | | | |
| Gruppen, KO-Tableaus, Spiele aus Advantage (FR-12) | – | L | S | L | S |
| Resultat melden, bestätigen, bestreiten (FR-16) | – | S beteiligt | S beteiligt | S beteiligt | S beteiligt |
| Resultate aller, Ranglisten | – | L | L | L | L |
| Resultat erfassen, Streit entscheiden, Rangliste korrigieren (FR-15 bis FR-17) | – | – | S | – | S |
| Export an Swiss Tennis: Anmeldungen, Resultate (FR-23) | – | – | S | – | S |
| **Lizenzanträge** | | | | | |
| Eigener Lizenzantrag (FR-20) | – | S eigene | S eigene | S eigene | S eigene |
| Lizenzrunde, Antragsliste, Export, abhaken (FR-22) | – | – | – | S | S |
| **Anlässe** | | | | | |
| Kommende Anlässe (FR-27) | – | L | L | L | S (erstellen, ändern, löschen) |
| Eigene Anmeldung zum Anlass, bis Anmeldeschluss (FR-28) | – | S eigene | S eigene | S eigene | S eigene |
| Anmeldungen aller zum Anlass: Name, Antwort, Bemerkung (Annahme K-50) | – | – | – | – | L |
| Kalenderdatei eines Anlasses, ohne Personendaten (SI-19) | L über den Link | L | L | L | L |

## Später

- **Gast** (A-ROLLE-06): nur für die Registrierung über tcolten.ch.
- **Junioren-Leiter** (A-ROLLE-05), vom Vorstand als Juniorenverantwortliche angeregt
  (K-18.1): mit den Junioren-Funktionen. Junioren gibt es schon ab der CM 2027 (K-46).
  Vorschlag K-08: Ein Mitglied handelt für sein Kind mit den Rechten von *Mitglied*, bis das
  Kind ab der Altersgrenze des Vereins ein eigenes Login hat.
- **Anlässe-Veranstalter** (A-ROLLE-04): kommt mit allgemeinen Anlässen. Die CM leitet
  bis dahin der CM-Verantwortliche.

Neue Rollen und Rechte kommen erst in diese Matrix und, wo sie Personendaten zeigen, ins
[Datenschutzkonzept](datenschutz.md#änderungen-an-diesem-konzept), dann in den Code.

## Offene Fragen an den Verein

K-08 (Konten der Junioren), K-16.1 (Briefversand), K-18.2 (wer übernimmt welche Rolle) —
alle in den [Abklärungen](abklaerungen.md). Was schon entschieden ist, steht unter
[Beantwortet](abklaerungen.md#beantwortet).
