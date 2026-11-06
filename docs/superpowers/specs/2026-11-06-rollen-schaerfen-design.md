# Design: Rollen schärfen — vier Admin-Rollen statt eines «Admin» (#43)

**Datum:** 2026-11-06 · **Issue:** [#43](https://github.com/konstantinniedermann/tco-app/issues/43)
· **Status:** Entwurf, Konzept vom Projektleiter im Gespräch festgelegt; Frage an den Vorstand
K-18.4

## Absicht

Das Wort «Admin» steht in MyTCO heute für zwei verschiedene Dinge:

1. **Betrieb:** Wer MyTCO technisch betreibt, also GitHub, Hosting, Server, Programmcode,
   Datensicherung und Zugangsdaten (K-04, K-05, K-49).
2. **Vereinsarbeit in der App:** Wer die Stammdaten der Mitglieder pflegt.

Der Vorstand hat «Admin» in K-18.2 als Betrieb verstanden (Vorschlag dort: Projektleiter und
Hauptansprechperson). Die Mitgliederverwaltung bekäme dann keine Rolle, obwohl sie die
Stammdaten führt. Darum verschwindet der Begriff «Admin» ohne Zusatz. Jede Rolle sagt im
Namen, wofür sie da ist. Die Rollen sind **Bausteine**: Eine Person kann mehrere haben, jede
lässt sich einzeln geben und wieder entziehen (Entscheid Projektleiter, 06.11.2026).

## Rollen

| Rolle | Beispiel im Verein (Vorschlag K-18.4) | Darf in MyTCO | Ausserhalb von MyTCO |
|-------|---------------------------------------|---------------|----------------------|
| **MyTCO-Admin** | Projektleiter, Hauptansprechperson | **Sieht alles, ändert nichts** ausser Rollen. Vergibt und entzieht Rollen. *Ansicht als …* | GitHub, Hosting, Server, Code, Datensicherung, Zugangsdaten |
| **Mitglieder-Admin** | Mitgliederverwaltung, evtl. Aktuarin | Mitglieder anlegen, bearbeiten, Austritt, Export und Löschen (DS-07), Brief-Codes und Briefe drucken, Sitzungen beenden, Liste *Für Fairgate*, Anlässe (GV-Anmeldung) | — |
| **CM-Admin** | CM-Leitung, Projektleiter | wie heute *CM-Verantwortlicher* (A-ROLLE-07) | — |
| **Lizenz-Admin** | Lizenzverantwortlicher | wie heute *Lizenzverantwortlicher* (A-ROLLE-08) | — |
| **Mitglied** | alle | wie heute | — |

Die Anlässe (GV-Anmeldung, #52) gehören zum Mitglieder-Admin, bis es eine eigene Rolle braucht
(A-ROLLE-04, Entscheid Projektleiter).

## Regeln

Ersetzen RR-02, RR-03, RR-07 und RR-09 in [Rollen und Rechte](../../rollen-und-rechte.md);
Nummern beim Nachführen dort vergeben.

1. **Bausteine:** Jedes Konto hat *Mitglied*. Die vier Admin-Rollen kommen einzeln dazu, die
   Rechte addieren sich (wie RR-01).
2. **Nur der MyTCO-Admin vergibt und entzieht Rollen,** auch sich selbst. Jede Vergabe und
   jeder Entzug steht im Änderungsverlauf (FR-26).
3. **MyTCO-Admin liest, ändert nicht.** Er sieht in der Verwaltung alle Bereiche und alle Daten,
   die eine der anderen Rollen sieht. Absenden kann er nur in der Rollenvergabe. Die Server-
   Schnittstellen prüfen das selbst; ein ausgeblendeter Knopf reicht nicht.
4. **Keine stille Stellvertretung:** Die Regel «Admin darf alles, was die Verantwortlichen
   dürfen» (RR-02) entfällt. Muss jemand einspringen, gibt der MyTCO-Admin sich oder einer
   anderen Person die Rolle. Das steht dann im Änderungsverlauf. Das ändert die Antwort des
   Vorstands auf K-18.1 («der Admin vertritt die anderen»); K-18.4 sagt das ausdrücklich.
5. **Mindestens ein MyTCO-Admin:** Der letzte kann sich die Rolle nicht entziehen und sein Konto
   nicht löschen (wie RR-03). Technisch geprüft wird nur diese Untergrenze von einem. Dass der
   Verein zwei MyTCO-Admins will (K-18.3), ist eine Abmachung, keine Sperre (Entscheid des
   Bauenden; mit einem Einrichtungs-Skript entsteht sonst kein gültiger Anfang).
6. **Mail-Code für die Verwaltung:** Jede Admin-Rolle bestätigt die Verwaltung höchstens
   einmal pro 24 Stunden mit einem frischen Code per E-Mail (wie RR-09, SI-08).
7. **Verwaltung zeigt nur die eigenen Bereiche** (wie RR-07): Mitglieder-Admin nur Mitglieder,
   Fairgate, Anlässe, Verlauf; CM-Admin nur Clubmeisterschaft; Lizenz-Admin nur Lizenzen;
   MyTCO-Admin alle, nur lesend, dazu *Rollen*.
8. **Briefe:** Der Mitglieder-Admin erzeugt die Briefe. Wie in Etappe 2 der
   [Mitgliederverwaltung](2026-11-04-admin-mitgliederverwaltung-design.md) druckt sie der
   Browser, kein PDF vom Server; «Als PDF sichern» im Druckdialog genügt, um die Datei
   weiterzugeben. Wer druckt und verschickt, braucht keine Rolle (Vorschlag K-16.1). Hinweis in
   der Druckansicht: Die Briefe enthalten die Codes aller Empfänger, eine gesicherte Datei nach
   dem Druck löschen.
9. **Konten mit Admin-Rolle sind nicht besonders geschützt** (Entscheid Projektleiter,
   06.11.2026): Der Mitglieder-Admin darf auch bei ihnen E-Mail ändern, Brief-Code ausstellen,
   Sitzungen beenden, Austritt erfassen und löschen. Damit könnte er sich in das Konto eines
   MyTCO-Admins einloggen und sich Rollen geben. Unter Vereinsmitgliedern angenommen; ins
   Sicherheitskonzept als Restrisiko, der Änderungsverlauf zeigt jede solche Aktion.
   **Voraussetzung für den Umbau:** der Hinweis an die alte Adresse, wenn jemand anders die
   E-Mail eines Kontos ändert (SI-09, heute noch nicht gebaut). So merkt der Betroffene die
   Übernahme, statt dass sie nur im Verlauf steht.

## Ansicht als …

Der MyTCO-Admin wählt in der Verwaltung *Ansicht als* eine Rolle (Mitglied, Mitglieder-Admin,
CM-Admin, Lizenz-Admin). MyTCO zeigt ihm dann App und Verwaltung so, wie sie jemand mit genau
dieser Rolle sieht, mit seinem eigenen Konto als Person.

- **Nur ansehen,** in jeder Umgebung gleich (lokal, Test, Live). Die Ansicht ist ein Zustand der
  Sitzung auf dem Server. Solange sie läuft, weist jede Schnittstelle, die etwas speichert, die
  Anfrage ab, auch ausserhalb der Verwaltung und auch Eigenes (eigene Angaben, eigene
  Anmeldung). Ausgenommen sind nur *Beenden* der Ansicht, Logout und die Bestätigung der
  Verwaltung per Mail-Code (SI-08). Es reicht nicht, sich auf Regel 3 zu verlassen: Ein Konto kann zusätzlich
  Mitglieder-Admin sein und hat immer die Rechte von *Mitglied* (Entscheid des Bauenden, aus
  «nur ansehen» abgeleitet). Zum Ausprobieren mit Klicken dienen die erfundenen Testkonten
  (`make seed`, Test).
- Ein Band oben zeigt dauernd «Ansicht als CM-Admin — nur ansehen» und *Beenden*.
- Die Ansicht gilt nur für die eigene Sitzung und endet mit *Beenden* oder dem Logout.
- Sie erzeugt keinen Eintrag im Änderungsverlauf (nichts wird geändert).

## Rechte (Änderung an der Matrix)

Die Spalte *Admin* in [Rollen und Rechte](../../rollen-und-rechte.md#matrix) teilt sich:

| Daten / Funktion | Mitglieder-Admin | MyTCO-Admin |
|------------------|:----------------:|:-----------:|
| Mitglieder anlegen, bearbeiten, löschen, exportieren | S | L |
| Neuer Brief-Code, Briefe drucken, Sitzungen beenden | S | – |
| Rollen vergeben | – | S |
| Änderungsverlauf | L | L |
| Liste *Für Fairgate* | S | L |
| E-Mail und Telefon aller Mitglieder | S | L |
| Anlässe erstellen, ändern, löschen | S | L |
| Anmeldungen aller zum Anlass (Name, Antwort, Bemerkung) | L | L |
| CM- und Lizenzbereich | wie Mitglied | L |

CM-Admin und Lizenz-Admin übernehmen die Spalten der heutigen Verantwortlichen unverändert.

## Datenschutz (vor dem Bau nachführen)

- *Wer sieht was:* Neu sieht der MyTCO-Admin alle Daten, ohne sie ändern zu dürfen, auch
  Bemerkungen zur GV und Wildcard-Kommentare. **Zweck:** Unterstützung der anderen Rollen,
  Fehlersuche und Prüfung der Rollenvergabe (DS «nur für ihre Aufgabe»). Darum erhalten die
  Rolle nur Personen, die MyTCO auch technisch betreuen (Projektleiter und seine Stellvertretung
  nach K-04.2/K-05, vgl. SI-16), nicht weitere Vorstandsmitglieder. Diese Regel gilt für den
  Verein; die App erzwingt sie nicht (Entscheid des Bauenden). In die Datenschutzerklärung: wer
  die Rollen hat, was sie sehen und wozu.
- Die Mitglieder-Admins sehen, was heute der Admin sieht, ausser der Rollenvergabe.
- Briefe: Hinweis zum Löschen einer gesicherten Datei nach dem Druck (Regel 8).
- Sicherheitskonzept: Restrisiko aus Regel 9 aufnehmen.

## Übergang im Code

- Bestehende Konten mit `admin` erhalten beim Umbau **MyTCO-Admin und Mitglieder-Admin**,
  damit niemand Rechte verliert. Danach nimmt der MyTCO-Admin die Rollen von Hand auseinander.
- Der erste Admin aus dem Einrichtungs-Skript wird MyTCO-Admin und Mitglieder-Admin.
- Schlüssel im Code und in der Datenbank wählt der Bauende. Was schon eingespielt ist, ändert
  eine neue Migration.
- [#57](https://github.com/konstantinniedermann/tco-app/issues/57) (CM Teil 1) baut auf «der
  Admin darf, was CM darf». Nach dem Umbau gilt: Der MyTCO-Admin liest den CM-Bereich, ändern
  darf nur der CM-Admin. Den Umbau erst beginnen, wenn #57 auf `dev` ist, oder mit der Session
  von #57 abstimmen.

## Nachführen in der Doku

[Rollen und Rechte](../../rollen-und-rechte.md), [Anforderungen](../../anforderungen/anforderungen.md)
(A-ROLLE-01, -02 umschreiben, A-ROLLE-07, -08 umbenennen, neue Anforderung *Ansicht als*;
Änderungsprotokoll), [Glossar](../../glossar.md), [Fachmodell](../../fachmodell.md),
[Datenschutz](../../datenschutz.md), [Datenschutzerklärung](../../datenschutzerklaerung.md),
[Sicherheitskonzept](../../sicherheitskonzept.md) (SI-08, SI-09, SI-12, B-04, B-08, Restrisiko
aus Regel 9), [Design GV-Anmeldung](2026-11-05-gv-anmeldung-design.md) (Admin → Mitglieder-Admin),
[Design CM-Anmeldung](2026-11-06-cm-anmeldung-design.md) («darf auch der Admin» → nur lesen).
Oberfläche: Band *Ansicht als* erst ins [UI-Leitbild](../../ui-leitbild.md).

## Nicht-Ziele

- Keine Rolle *Briefversand*: Das PDF reicht (K-16.1).
- Keine Rolle *Anlässe*, *Junioren-Leiter*, *Gast*: kommen später (A-ROLLE-04 bis -06).
- In *Ansicht als* nichts absenden, auch nicht auf Test.
- Keine Rechte pro Person ausserhalb der Rollen.

## Nachweis

Je Rolle Datenbank- und Schnittstellentests: Was die Matrix erlaubt, geht, alles andere wird
abgewiesen, besonders Schreiben durch den MyTCO-Admin. E2E: MyTCO-Admin vergibt eine Rolle,
schaltet *Ansicht als CM-Admin* ein, sieht den CM-Bereich, kann nicht absenden, beendet die
Ansicht. Screenshot, axe ohne Verstösse.

## Offene Fragen an den Verein

K-18.4 (wer übernimmt welche der neuen Rollen; ersetzt den ersten Vorschlag in K-18.2 und
ändert die Antwort auf K-18.1, weil die Stellvertretung durch den Admin entfällt),
K-16.1 (Briefversand ohne Rolle, Vorschlag).
