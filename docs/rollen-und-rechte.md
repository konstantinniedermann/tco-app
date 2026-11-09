[← Übersicht](index.md)

# Rollen und Rechte

Welche Rollen MyTCO kennt und wer was sehen und ändern darf — für die Etappen
*Mitglieder-Login* bis *Lizenzanträge*. Objekte und Fachregeln `FR-NN` stehen im
[Fachmodell](fachmodell.md), Sichtbarkeit von Personendaten im
[Datenschutzkonzept](datenschutz.md).

**Vorschlag K-NN** = vom Vorstand noch zu bestätigen, Frage in den [Abklärungen](abklaerungen.md).

## Rollen

Jede Rolle sagt im Namen, wofür sie da ist; ein «Admin» ohne Zusatz gibt es nicht. Im Code
heissen die Admin-Rollen `mytco`, `mitglieder`, `cm` und `lizenz`.

| Rolle | Ab Etappe | Aufgabe | Anforderung |
|-------|-----------|---------|-------------|
| **Mitglied** | Mitglieder-Login | Eigene Daten pflegen, sich zur CM anmelden, Resultate melden, Lizenz beantragen | A-ROLLE-03 |
| **MyTCO-Admin** | Mitglieder-Login | Betreut MyTCO technisch. Vergibt und entzieht Rollen, sieht alle Bereiche der Verwaltung, ändert dort nichts; *Ansicht als …* | A-ROLLE-01, A-ROLLE-09 |
| **Mitglieder-Admin** | Mitglieder-Login | Mitglieder anlegen, einlesen, bearbeiten, Austritt, Auskunft drucken und Löschen (DS-07); Brief-Codes, Sitzungen beenden, Liste *Für Fairgate*; Anlässe | A-ROLLE-02 |
| **CM-Admin** | CM-Anmeldung | Turnier und Kategorien anlegen, Wildcard-Anträge entscheiden, Anmeldungen von Hand, Gruppen und Tableaus aus Advantage übernehmen, Resultate erfassen und Streitfälle entscheiden | A-ROLLE-07 |
| **Lizenz-Admin** | Lizenzanträge | Stichtag der Lizenzrunde setzen, Anträge ansehen, exportieren und abhaken | A-ROLLE-08 |

Der Vorstand hat die Rollen bestätigt und will zwei Admins (K-18.1, K-18.3). **Vorschlag
K-18.4:** Statt «Admin» die vier Admin-Rollen oben; den MyTCO-Admin bekommen nur Personen, die
MyTCO technisch betreuen (Projektleiter und seine Stellvertretung, vgl. SI-16). Beim Umbau
wurden bisherige Admins MyTCO- und Mitglieder-Admin, damit niemand Rechte verliert; danach
verteilt der MyTCO-Admin die Rollen von Hand. Einzelheiten im
[Design Rollen schärfen](superpowers/specs/2026-11-06-rollen-schaerfen-design.md).

## Grundsätze

**Status:** `geplant` · `umgesetzt` (mit Test, siehe [Testkonzept](testkonzept.md#anforderung--testfall)) · `verworfen`

| ID | Regel | Status |
|----|-------|--------|
| RR-01 | Jedes Konto hat die Rolle *Mitglied*; die vier Admin-Rollen kommen einzeln dazu. Eine Person kann mehrere Rollen haben, ihre Rechte addieren sich (FR-03). Rollen vergibt und entzieht nur der MyTCO-Admin, auch sich selbst; jede Vergabe und jeder Entzug steht im Änderungsverlauf (FR-26). Einmalige Ausnahme: Die Migration des Rollen-Umbaus (`drizzle/0009_rollen_schaerfen.sql`) gab den bisherigen Admins MyTCO- und Mitglieder-Admin ohne Verlaufseintrag | umgesetzt |
| RR-02 | Gestrichen: «Der Admin darf alles, was CM- und Lizenzverantwortlicher dürfen». Es gibt keine stille Stellvertretung: Muss jemand einspringen, gibt der MyTCO-Admin sich oder einer anderen Person die Rolle, und das steht im Änderungsverlauf (Vorschlag K-18.4, ändert die Antwort auf K-18.1) | verworfen (#43) |
| RR-03 | Es bleibt immer mindestens ein MyTCO-Admin: Der letzte kann sich die Rolle nicht entziehen und sein Konto nicht löschen. Zwei MyTCO-Admins (K-18.3) sind eine Abmachung, keine Sperre | umgesetzt (Entzug der Rolle, Austritt und Vormerken zum Löschen) |
| RR-04 | Einmal-Codes (Brief- und Mail-Code) sind nur als Hash gespeichert und nach der Ausgabe für niemanden abrufbar, auch nicht für die Verwaltung. Der Mitglieder-Admin kann einen neuen Brief-Code ausstellen, der nur den alten Brief-Code ersetzt, und alle Sitzungen eines Kontos beenden; einen Code per E-Mail holt sich das Mitglied selbst (A-LOGIN-10, [#29](https://github.com/konstantinniedermann/tco-app/issues/29)) | umgesetzt (Sitzungen beenden und neuer Brief-Code in der Verwaltung, einzeln und als Serie) |
| RR-05 | Für die Rolle *Mitglied* gibt es kein Mitgliederverzeichnis. Namen anderer Mitglieder erscheinen nur in Listen der CM und bei der Wahl des Doppelpartners (nur Mitglieder, die für die Kategorie passen und noch frei sind) | umgesetzt |
| RR-06 | *eigene* und *beteiligt* hängen am Objekt, nicht an der Rolle: MyTCO prüft bei jedem Zugriff, ob das Konto Spieler der Anmeldung oder des Spiels ist | umgesetzt (Anmeldungen; Spiele mit dem CM-Betrieb) |
| RR-07 | Die Verwaltung sieht nur, wer eine Admin-Rolle hat; sie zeigt ihm nur die Bereiche seiner Rollen (N-APP-03): Mitglieder-Admin *Mitgliederverwaltung* (Mitglieder, Einlesen, Briefe, Anlässe, Mitteilungen, Für Fairgate, Verlauf), CM-Admin *Clubmeisterschaft*, Lizenz-Admin *Lizenzen*, MyTCO-Admin alle Bereiche nur lesend und dazu *Rollen*. Was eine Rolle nur lesen darf, weist der Server beim Speichern ab; ein ausgeblendeter Knopf reicht nicht | umgesetzt\* (Lizenzen mit ihrer Etappe) |
| RR-08 | Ein gesperrtes Konto hat keine Rechte (FR-04) | umgesetzt (Austritt und Vormerken sperren das Login; Rollen bleiben gespeichert und wirken nach Wiedereintritt oder Rückgängig wieder; kommen dabei Admin-Rollen zurück, fragt die Verwaltung vorher nach) |
| RR-09 | Wer die Verwaltung öffnet, bestätigt sie höchstens einmal pro 24 Stunden mit einem frischen Code per E-Mail, mit jeder Admin-Rolle ([SI-08](sicherheitskonzept.md#vorgaben), K-12.1) | umgesetzt |
| RR-10 | Ein Mitglieder-Admin erfasst weder den eigenen Austritt noch merkt er sich selbst zum Löschen vor; das macht ein anderer Mitglieder-Admin | umgesetzt |

**Konten mit Admin-Rolle sind nicht besonders geschützt** (Entscheid Projektleiter): Der
Mitglieder-Admin ändert auch bei ihnen E-Mail, Brief-Code, Sitzungen und Austritt; nur den
eigenen Austritt und das eigene Löschen nicht (RR-10). Einen neuen Brief-Code für das eigene
Konto darf er ausstellen: Er ist dann schon eingeloggt, und der neue Code wirft keine Geräte
hinaus (Entscheid Projektleiter). Ändert er
eine E-Mail, erhält die alte Adresse einen Hinweis (SI-09); das Restrisiko steht im
[Sicherheitskonzept](sicherheitskonzept.md#restrisiken).

### Ansicht als …

Der MyTCO-Admin sieht App und Verwaltung so, wie sie eine gewählte Rolle sieht (Mitglied,
Mitglieder-, CM- oder Lizenz-Admin), mit seinem eigenen Konto (A-ROLLE-09).

- **Nur ansehen**, in jeder Umgebung: Solange die Ansicht läuft, weist der Server jede
  speichernde Anfrage ab, auch Eigenes. Ausgenommen sind *Beenden*, Logout und die
  Bestätigung der Verwaltung per Code ([SI-20](sicherheitskonzept.md#vorgaben)).
- Ein Band oben zeigt «Ansicht als … — nur ansehen» und *Beenden*.
- Gilt nur für die eigene Sitzung; endet mit *Beenden*, dem Logout oder dem Entzug der Rolle
  MyTCO-Admin. Die Ansicht selbst schreibt keinen Eintrag im Änderungsverlauf; das Öffnen einer
  Auskunft (DS-07) steht auch hier im Verlauf.

## Matrix

**S** = lesen und ändern · **L** = lesen · **eigene** = nur die eigenen ·
**beteiligt** = als Spieler, Gegner oder Doppelpartner · **–** = nichts.
Jede Spalte zeigt alle Rechte der Rolle, die der Rolle *Mitglied* eingeschlossen.

| Daten / Funktion | Ohne Login | Mitglied | CM-Admin | Lizenz-Admin | Mitglieder-Admin | MyTCO-Admin |
|------------------|:----------:|:--------:|:--------:|:------------:|:----------------:|:-----------:|
| **Mitglieder-Login** | | | | | | |
| Datenschutzerklärung, Login-Seite (DS-09) | L | L | L | L | L | L |
| Eigene E-Mail, Telefon, Lizenznummer, Klassierung, Benachrichtigungen (FR-02; E-Mail, Telefon und Lizenznummer: Annahme K-19.1, die E-Mail erst nach zwei Codes, SI-09) | – | S eigene | S eigene | S eigene | S eigene | S eigene |
| Eigene Adresse (Annahme K-19.2) | – | S eigene | S eigene | S eigene | S | S eigene |
| Eigener Rufname (freiwillig; das Mitglied setzt, ändert und löscht ihn selbst) | – | S eigene | S eigene | S eigene | S eigene, L alle | S eigene, L alle |
| Eigener Name, Geschlecht, Jahrgang, Mitgliedernummer (Geschlecht und Jahrgang einmal selbst, wenn leer, FR-37) | – | L eigene | L eigene | L eigene | S | L |
| Mitglieder anlegen, bearbeiten, löschen, Auskunft drucken (DS-07, das Öffnen steht immer im Änderungsverlauf, auch nur lesend; den eigenen Austritt und sich selbst löschen nicht, RR-10) | – | – | – | – | S | L |
| Mitgliederliste einlesen (A-MITGLIED-07) | – | – | – | – | S | L |
| Liste *Briefe*: wer MyTCO noch nie geöffnet hat (A-LOGIN-01) | – | – | – | – | S | L |
| Neuer Code für einen Brief, Briefe auslösen, Sitzungen beenden | – | – | – | – | S | – |
| Rollen vergeben | – | – | – | – | – | S |
| Änderungsverlauf (FR-26) | – | – | – | – | L | L |
| Liste *Für Fairgate*: selbst geänderte Kontaktangaben sehen und abhaken (A-KONTO-02, Annahme K-19.2) | – | – | – | – | S | L |
| Namen anderer Mitglieder (RR-05) | – | L | L | L | S | L |
| E-Mail und Telefon anderer Mitglieder | – | L beteiligt, bis Turnierende (FR-19) | L alle (K-42) | L alle (K-42) | S | L |
| **CM-Anmeldung** | | | | | | |
| Turnier, Turniernummern, Kategorien | – | L | S | L | L | L |
| Kontaktperson des Turniers (wählen, nur gültige nach FR-55; Mitglieder sehen nur den Namen) | – | L Name | S | L Name | L Name | L |
| Eigene Anmeldung, bis Anmeldeschluss (FR-10) | – | S eigene | S eigene | S eigene | S eigene | S eigene |
| Anmeldungen aller (Name, Kategorie) | – | L bestätigte | S | L bestätigte | L bestätigte | L |
| Geschlecht und Jahrgang der Spieler (zum Zuordnen) | – | – | L | – | S | L |
| Klassierung der Spieler korrigieren (A-ANMELDUNG-06, K-28) | – | – | S | – | – | L |
| Wildcard-Antrag und Kommentar (FR-08) | – | S eigene | S, entscheidet | S eigene | S eigene | L |
| Klassierung passender Mitglieder (Partnerwahl) | – | L | L | L | L | L |
| Kontaktdaten des Doppelpartners, erst nach dem Annehmen (FR-19) | – | L beteiligt | L alle (K-42) | L alle (K-42) | S | L |
| Name, Klassierung und Telefon (sonst E-Mail) des Anfragenden; er gibt sie mit der Anfrage dem Angefragten frei (FR-48, FR-19) | – | L an einen selbst | L an einen selbst | L an einen selbst | L an einen selbst | L an einen selbst |
| Partner anfragen, annehmen, ablehnen (FR-48) | – | S eigene | S eigene | S eigene | S eigene | S eigene |
| Offene Partner-Anfragen (von, an, seit wann) | – | – | L | – | – | L |
| Doppel von Hand anmelden, zusammenlegen, Partner ändern, Anfrage als Paar anmelden oder löschen (FR-46, FR-48) | – | – | S | – | – | L |
| Kommentar *sucht Partner* (FR-49) | – | L; S eigener | L; S eigener | L; S eigener | L; S eigener | L; S eigener |
| Gespräch mit der Turnierleitung: schreiben, lesen, Zustand setzen (FR-50 bis FR-54); das Mitglied sieht nur «Turnierleitung» | – | S eigenes | S | – | – | L |
| **CM-Betrieb** | | | | | | |
| Gruppen, KO-Tableaus, Spiele aus Advantage (FR-12) | – | L | S | L | L | L |
| Resultat melden, bestätigen, bestreiten (FR-16) | – | S beteiligt | S beteiligt | S beteiligt | S beteiligt | S beteiligt |
| Resultate aller, Ranglisten | – | L | L | L | L | L |
| Resultat erfassen, Streit entscheiden, Rangliste korrigieren (FR-15 bis FR-17) | – | – | S | – | – | L |
| Export an Swiss Tennis: Anmeldungen, Resultate (FR-23) | – | – | S | – | – | L |
| **Lizenzanträge** | | | | | | |
| Eigener Lizenzantrag (FR-20) | – | S eigene | S eigene | S eigene | S eigene | S eigene |
| Lizenzrunde, Antragsliste, Export, abhaken (FR-22) | – | – | – | S | – | L |
| **Anlässe** | | | | | | |
| Kommende Anlässe (FR-27) | – | L | L | L | S (erstellen, ändern, löschen) | L |
| Eigene Anmeldung zum Anlass, bis Anmeldeschluss (FR-28) | – | S eigene | S eigene | S eigene | S eigene | S eigene |
| Anmeldungen aller zum Anlass: Name, Antwort, Bemerkung (Annahme K-50) | – | – | – | – | L | L |
| Kalenderdatei eines Anlasses, ohne Personendaten (SI-19) | L über den Link | L | L | L | L | L |
| Mitteilung zum Anlass senden, Verlauf (FR-42) | – | – | – | – | S | L |
| **Verein** | | | | | | |
| Mitteilung an den Verein senden, Verlauf (FR-42) | – | – | – | – | S | L |

Beim MyTCO-Admin heisst **L**: in der Verwaltung lesen, nicht absenden; als Mitglied hat er
daneben die Rechte der Spalte *Mitglied*.

Der CM-Admin darf sich selbst von Hand anmelden und über den eigenen Wildcard-Antrag entscheiden;
sein Name steht im Änderungsverlauf, neutral als «CM-Anmeldung geändert».

## Später

- **Gast** (A-ROLLE-06): nur für die Registrierung über tcolten.ch.
- **Junioren-Leiter** (A-ROLLE-05), vom Vorstand als Juniorenverantwortliche angeregt
  (K-18.1): mit den Junioren-Funktionen. Junioren gibt es schon ab der CM 2027 (K-46).
  Vorschlag K-08: Ein Mitglied handelt für sein Kind mit den Rechten von *Mitglied*, bis das
  Kind ab der Altersgrenze des Vereins ein eigenes Login hat.
- **Anlässe-Veranstalter** (A-ROLLE-04): kommt mit allgemeinen Anlässen. Bis dahin
  gehören die Anlässe zum Mitglieder-Admin, die CM leitet der CM-Admin.

Neue Rollen und Rechte kommen erst in diese Matrix und, wo sie Personendaten zeigen, ins
[Datenschutzkonzept](datenschutz.md#änderungen-an-diesem-konzept), dann in den Code.

## Offene Fragen an den Verein

K-08 (Konten der Junioren), K-16.1 (Briefversand), K-18.2 und K-18.4 (Admin-Rollen und wer sie übernimmt) —
alle in den [Abklärungen](abklaerungen.md). Was schon entschieden ist, steht unter
[Beantwortet](abklaerungen.md#beantwortet).
