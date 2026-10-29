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

Wer diese Rollen im Verein übernimmt, klärt K-18.

## Grundsätze

| ID | Regel |
|----|-------|
| RR-01 | Jedes Konto hat die Rolle *Mitglied*; weitere vergibt der Admin. Eine Person kann mehrere Rollen haben, ihre Rechte addieren sich (FR-03) |
| RR-02 | Der Admin darf alles, was CM- und Lizenzverantwortlicher dürfen — als Stellvertretung, ohne sich die Rolle zu geben |
| RR-03 | Der letzte Admin kann sich die Rolle *Admin* nicht entziehen und sein Konto nicht löschen |
| RR-04 | Niemand sieht Passwörter. Der Admin kann nur ein neues Einmalpasswort ausstellen; wie es zum Mitglied kommt, klären K-16 und das [Sicherheitskonzept](https://github.com/konstantinniedermann/tco-app/issues/6) |
| RR-05 | Es gibt kein Mitgliederverzeichnis. Namen anderer Mitglieder erscheinen nur in Listen der CM und bei der Wahl des Doppelpartners |
| RR-06 | *eigene* und *beteiligt* hängen am Objekt, nicht an der Rolle: MyTCO prüft bei jedem Zugriff, ob das Konto Spieler der Anmeldung oder des Spiels ist |
| RR-07 | Die Admin-Oberfläche sieht, wer mehr als die Rolle *Mitglied* hat; sie zeigt nur die Bereiche der eigenen Rollen (N-APP-03) |
| RR-08 | Ein gesperrtes Konto hat keine Rechte (FR-04) |

## Matrix

**S** = lesen und ändern · **L** = lesen · **eigene** = nur die eigenen ·
**beteiligt** = als Spieler, Gegner oder Doppelpartner · **–** = nichts.
Jede Spalte zeigt alle Rechte der Rolle, die der Rolle *Mitglied* eingeschlossen.

| Daten / Funktion | Ohne Login | Mitglied | CM-Verantwortlicher | Lizenzverantwortlicher | Admin |
|------------------|:----------:|:--------:|:-------------------:|:----------------------:|:-----:|
| **Mitglieder-Login** | | | | | |
| Datenschutzerklärung, Login-Seite (DS-09) | L | L | L | L | L |
| Eigene Daten, Passwort, Benachrichtigungen | – | S eigene | S eigene | S eigene | S eigene |
| Mitglieder anlegen, bearbeiten, löschen, exportieren (DS-07) | – | – | – | – | S |
| Konto sperren, neues Einmalpasswort | – | – | – | – | S |
| Rollen vergeben | – | – | – | – | S |
| Namen anderer Mitglieder (RR-05) | – | L | L | L | S |
| Kontaktdaten anderer Mitglieder | – | L beteiligt, bis Turnierende (FR-19) | L alle (K-42) | L alle (K-42) | S |
| **CM-Anmeldung** | | | | | |
| Turnier, Turniernummern, Kategorien | – | L | S | L | S |
| Eigene Anmeldung, bis Anmeldeschluss (FR-10) | – | S eigene | S eigene | S eigene | S eigene |
| Anmeldungen aller (Name, Kategorie) | – | L | S | L | S |
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

## Später

- **Gast** (A-ROLLE-06): nur für die Registrierung über tcolten.ch.
- **Junioren-Leiter** (A-ROLLE-05) und Konten für Junioren oder Eltern: mit den
  Junioren-Funktionen (K-08).
- **Anlässe-Veranstalter** (A-ROLLE-04): kommt mit allgemeinen Anlässen. Die CM leitet
  bis dahin der CM-Verantwortliche.

Neue Rollen und Rechte kommen erst in diese Matrix und, wo sie Personendaten zeigen, ins
[Datenschutzkonzept](datenschutz.md#änderungen-an-diesem-konzept), dann in den Code.

## Offene Fragen an den Verein

K-08 (Junioren), K-16 (neues Passwort), K-18 (wer übernimmt welche Rolle), K-42
(Kontaktdaten für die Verantwortlichen) — alle in den [Abklärungen](abklaerungen.md).
