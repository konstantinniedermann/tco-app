[← Anforderungen](README.md)

# Anforderungen mit IDs

Jede Anforderung aus dem Anforderungsdokument v1.2 und der Zielsetzung vom 29.10.2026
mit fester ID. ADRs, Issues und Tests verweisen auf diese IDs. Quellen und Änderungsprotokoll
stehen im [README](README.md), offene Fragen in den [Abklärungen](../abklaerungen.md); die Begriffe im [Glossar](../glossar.md).

## Lesehilfe

**ID-Schema:** `A-<BEREICH>-NN` für funktionale, `N-<THEMA>-NN` für nicht-funktionale
Anforderungen. Die Bereiche sind Wörter aus dem Glossar. Eine ID bleibt fest, auch
wenn sich die Anforderung verschiebt; eine gestrichene ID wird nie neu vergeben. Neue
Anforderungen bekommen die nächste freie Nummer im Bereich.

**Quelle:** `PDF 5b` = Abschnitt im Anforderungsdokument v1.2 · `Ziel` = Zielsetzung vom
29.10.2026 · `PL` = Vorgabe des Projektleiters ausserhalb beider Dokumente · `K-NN` = Antwort des Vereins
in den [Abklärungen](../abklaerungen.md#beantwortet).

**Etappe:** Milestone laut [Roadmap](../roadmap.md) — *Fundament*, *Mitglieder-Login*,
*CM-Anmeldung*, *CM-Betrieb*, *Lizenzanträge* — oder *später* (Backlog / Optional).
*Pilot* ist die Vorstufe von *Mitglieder-Login*: Deren Anforderungen stehen unter
*Mitglieder-Login*, auch wenn ihr Issue im Milestone *Pilot* liegt.
*durchgehend* heisst: gilt ab der ersten Etappe mit Produktcode für alles Weitere.

**Status:** `geplant` · `später` · `offen` (wartet auf eine Antwort des Vereins) ·
`umgesetzt` (mit Test, siehe [Testkonzept](../testkonzept.md#anforderung--testfall)) ·
`verworfen` (mit Begründung).

**\*** = Etappe oder Status ist ein Vorschlag des Projektleiters, weil die Quellen ihn
nicht festlegen. Vom Verein zu bestätigen.

## Funktionale Anforderungen

### LOGIN — Einloggen

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-LOGIN-01 | Mitglieder erhalten ihren Zugang per Post in einem Brief: QR-Code zur App-Adresse, Einmal-Code als Text, kurze Anleitung zum Startbildschirm (ursprünglich zwei getrennte Briefe) | PDF 2, Ziel, PL | Mitglieder-Login | geplant\* |
| A-LOGIN-02 | Das Einmalpasswort muss beim ersten Login ersetzt werden | PDF 2, Ziel | — | verworfen — MyTCO hat kein Passwort, Login per Einmal-Code (A-LOGIN-08) |
| A-LOGIN-03 | Beim ersten Login ergänzt das Mitglied fehlende Daten, insbesondere die Lizenznummer; die Klassierung fragt die CM-Seite ab (FR-37) | PDF 3b-i | Mitglieder-Login | geplant |
| A-LOGIN-04 | Direktes Login in MyTCO, ohne Umweg über tcolten.ch (z. B. über `my.tcolten.ch`) | PDF 3b | Mitglieder-Login | geplant |
| A-LOGIN-05 | Login-Feld oben rechts auf tcolten.ch, das nach dem Login zu MyTCO weiterleitet | PDF 3b | später | später |
| A-LOGIN-06 | Zwei-Faktor-Login (App oder SMS/E-Mail, zwingend oder freiwillig) | PDF 2 | später | später |
| A-LOGIN-07 | Login mit Passkey, freiwillig neben dem Einmal-Code: bequemer am PC und auf weiteren Geräten. Der Mail-Code bleibt gültig, der Passkey schützt also nicht gegen ein gehacktes Postfach ([#44](https://github.com/konstantinniedermann/tco-app/issues/44)) | PDF 2, K-02.1 | Mitglieder-Login\* | umgesetzt\* (Prüfung auf echten Geräten offen, siehe [Checkliste](../testkonzept.md#checkliste-vor-dem-release)) |
| A-LOGIN-08 | Login ohne Passwort, nur per Einmal-Code: aus dem Brief, später per E-Mail (A-LOGIN-10) | PDF 2, PL | Mitglieder-Login | umgesetzt\* |
| A-LOGIN-09 | Nach dem Login bleibt das Mitglied eingeloggt; ausgeloggt wird es erst nach einem Jahr ohne Nutzung, oder wenn der Mitglieder-Admin seine Sitzungen beendet | PL | Mitglieder-Login | umgesetzt (Sitzungen beenden in der Verwaltung, #43) |
| A-LOGIN-10 | Wer ausgeloggt ist (lange Pause, neues Handy, Brief verloren), erhält nach Eingabe seiner E-Mail-Adresse einen neuen Code per E-Mail | PL | Mitglieder-Login | umgesetzt\* |
| A-LOGIN-11 | Einmal-Code per SMS oder App statt per Brief oder E-Mail (abgespalten aus A-LOGIN-08) | PDF 2 | später | später |

### MITGLIED — Mitgliederverwaltung durch den Mitglieder-Admin

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-MITGLIED-01 | Der Mitglieder-Admin legt Mitgliederkonten nach manueller Prüfung einfach und schnell von Hand an | PDF 4a, Ziel | Mitglieder-Login | umgesetzt |
| A-MITGLIED-02 | Der Mitglieder-Admin bearbeitet die Daten eines Mitglieds | Ziel | Mitglieder-Login | umgesetzt |
| A-MITGLIED-03 | Der Mitglieder-Admin löscht Mitgliederkonten | PDF 4a | Mitglieder-Login\* | geplant |
| A-MITGLIED-04 | Selbstregistrierung über die Website tcolten.ch, damit der Briefversand entfallen kann (mit der zuständigen Person) | PDF 4a | später\* | später |
| A-MITGLIED-05 | Anbindung an die Mitgliederverwaltung Fairgate prüfen | PDF 2 | später | später |
| A-MITGLIED-06 | Mitglieder- und MyTCO-Admin sehen im Änderungsverlauf, wer wann welches Feld eines Mitglieds geändert oder welche Aktion ausgelöst hat (Verwaltung, Mitglied selbst oder automatisch), ohne alte und neue Werte; 12 Monate | PL | Mitglieder-Login | umgesetzt (Verlauf der Änderungen; Löschung nach 12 Monaten durch den Zeitgeber) |
| A-MITGLIED-07 | Der Mitglieder-Admin liest die Mitgliederliste aus Fairgate ein (Excel oder CSV) und führt so Ein- und Austritte nach; zum Start erfasst der Projektleiter die Mitglieder ([#46](https://github.com/konstantinniedermann/tco-app/issues/46)) | K-17.1 | CM-Anmeldung\* | offen (hängt an K-45) |
| A-MITGLIED-08 | Ein Mitglied erfasst sein Kind und erledigt für es das Administrative (Daten, CM-Anmeldung), bis das Kind ab der Altersgrenze des Vereins ein eigenes Login hat (Vorschlag K-08) ([#45](https://github.com/konstantinniedermann/tco-app/issues/45)) | K-46, PL | CM-Anmeldung\* | offen (hängt an K-08) |

### ROLLE — Benutzerrollen

Was jede Rolle darf, legt [Rollen und Rechte](../rollen-und-rechte.md) fest.

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-ROLLE-01 | Rolle *MyTCO-Admin*: vergibt und entzieht die Benutzerrollen mit den zugehörigen Berechtigungen, als Einziger (RR-01); sieht alle Bereiche der Verwaltung, ändert dort nichts (RR-07) | PDF 4a, PL | Mitglieder-Login | umgesetzt |
| A-ROLLE-02 | Rolle *Mitglieder-Admin*: Mitgliederverwaltung mit Briefen, Sitzungen, Liste *Für Fairgate* und Anlässen | PDF 4a, Ziel | Mitglieder-Login | umgesetzt |
| A-ROLLE-03 | Rolle *Mitglied* | PDF 4a | Mitglieder-Login | umgesetzt |
| A-ROLLE-04 | Rolle *Anlässe-Veranstalter*; bis dahin gehören die Anlässe zum Mitglieder-Admin (A-ROLLE-02), die CM leitet der CM-Admin (A-ROLLE-07) | PDF 4a | später\* | später |
| A-ROLLE-05 | Rolle *Junioren-Leiter* | PDF 4a | später\* | später |
| A-ROLLE-06 | Rolle *Gast*: nur für die Registrierung, kein Zugriff auf weitere Seiten | PDF 4a | später\* | später |
| A-ROLLE-07 | Rolle *CM-Admin* (vorher *CM-Verantwortlicher*): Turnier, Kategorien, Anmeldungen, Gruppen und Resultate der Clubmeisterschaft | PL | CM-Anmeldung | umgesetzt\* (Turnier und Kategorien, #57; Einzel-Anmeldungen, #60; Doppel, Gruppen und Resultate folgen mit ihren Etappen) |
| A-ROLLE-08 | Rolle *Lizenz-Admin* (vorher *Lizenzverantwortlicher*): Lizenzrunde und Lizenzanträge | PL | Lizenzanträge | geplant |
| A-ROLLE-09 | *Ansicht als …*: Der MyTCO-Admin sieht App und Verwaltung so, wie sie eine gewählte Rolle sieht, nur lesend; der Server weist jedes Speichern ab ([Rollen und Rechte](../rollen-und-rechte.md#ansicht-als-), SI-20) | PL | Mitglieder-Login | umgesetzt |

### KONTO — Eigene Daten ändern

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-KONTO-01 | Das Mitglied ändert E-Mail-Adresse und Telefonnummer selbst, dazu die Lizenznummer (FR-02); die E-Mail erst nach Bestätigung mit je einem Code an die alte und die neue Adresse (SI-09). Annahme K-19.1 ([#50](https://github.com/konstantinniedermann/tco-app/issues/50)) | PDF 3e | Mitglieder-Login\* | umgesetzt\* |
| A-KONTO-02 | Das Mitglied ändert seine Adresse selbst; selbst geänderte Kontaktangaben (Adresse, E-Mail, Telefon) sieht der Mitglieder-Admin in der Liste *Für Fairgate* und hakt sie nach dem Übertragen ab. Annahme K-19.2 ([#50](https://github.com/konstantinniedermann/tco-app/issues/50)) | PDF 3e | Mitglieder-Login\* | umgesetzt\* |
| A-KONTO-03 | Das Mitglied wählt die Zustellart der Jahresrechnung | PDF 3e | später\* | später |
| A-KONTO-04 | Das Mitglied ändert seine Mitgliedschaft | PDF 1 | später\* | offen |

Lizenz bestellen und abbestellen (PDF 3e) steht unter [LIZENZ](#lizenz--lizenzanträge-und-lizenzliste).

### STARTSEITE

Die Anordnung links, Mitte, rechts im PDF gilt für breite Bildschirme; wie die Startseite
auf dem Handy aussieht, klärt das UI-Leitbild (Issue #13).

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-STARTSEITE-01 | Die Startseite zeigt das eingeloggte Konto und einen Logout-Knopf | PDF 3c | Mitglieder-Login\* | geplant |
| A-STARTSEITE-02 | Die Startseite bietet Shortcuts zu den wichtigsten Funktionen | PDF 3c | CM-Anmeldung\* | geplant |
| A-STARTSEITE-03 | Die Shortcuts lassen sich später einfach ändern (z. B. für die Anmeldung zu einem bestimmten Anlass) | PDF 3c | CM-Anmeldung\* | geplant |
| A-STARTSEITE-04 | Die Startseite zeigt die Anlässe, für die das Mitglied angemeldet ist | PDF 3c | CM-Anmeldung\* | geplant |

### HILFE — Hilfe beim Start

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-HILFE-01 | MyTCO hat eine Seite *Hilfe*, ohne Login erreichbar über den Link «Hilfe» in der Fusszeile: MyTCO auf den Startbildschirm legen, neuen Code anfordern, Passkey einrichten, eigene Angaben ändern (A-KONTO-01, [#50](https://github.com/konstantinniedermann/tco-app/issues/50)), Kontakt für Fragen (K-21) ([#47](https://github.com/konstantinniedermann/tco-app/issues/47)) | PL | Mitglieder-Login | umgesetzt\* (Prüfung auf echten Geräten offen, siehe [Checkliste](../testkonzept.md#checkliste-vor-dem-release)) |
| A-HILFE-02 | Solange MyTCO auf dem Handy im Browser statt vom Startbildschirm läuft, zeigt eine eigene Einstiegsseite zuerst die Anleitung zum Startbildschirm mit Animation, je nach iPhone oder Android, und erst danach den Login. Auf Android öffnet die Taste «MyTCO installieren» den Dialog von Android, wenn Chrome ihn anbietet. Der Brief behält seine Kurzanleitung (A-LOGIN-01) ([Design](../superpowers/specs/2026-11-04-hilfe-beim-start-design.md)) | PL | Mitglieder-Login | umgesetzt\* (Prüfung auf echten Geräten offen, siehe [Checkliste](../testkonzept.md#checkliste-vor-dem-release)) |

### NEWSFEED

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-NEWSFEED-01 | Platz für einen Blog oder Newsfeed auf der Startseite | PDF 3c | später | später |
| A-NEWSFEED-02 | Der Newsfeed übernimmt die Ankündigungen aus der geplanten WhatsApp-Gruppe | PDF 3c | — | verworfen\* |

A-NEWSFEED-02: Nachrichten aus normalen WhatsApp-Gruppen lassen sich nicht automatisch
auslesen ([Recherche Systemlandschaft](../recherche/README.md)). Machbar ist nur der
umgekehrte Weg: News in MyTCO schreiben und den Link in der Gruppe teilen.

### ANLASS — Anmeldung zu Anlässen

Die Clubmeisterschaft ist der erste Anlass; ihre Anmeldung steht unter
[ANMELDUNG](#anmeldung--anmeldung-zur-clubmeisterschaft).

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-ANLASS-01 | Mitglieder melden sich direkt in MyTCO für Anlässe an | PDF 3d | Mitglieder-Login\* | umgesetzt\* |
| A-ANLASS-02 | Anmeldung zum Junioren-Training (evtl. ab 2028) | PDF 3d | später | später |
| A-ANLASS-03 | Anmeldung zu Junioren-Turnieren (ab 2028) | PDF 3d | später | später |
| A-ANLASS-04 | Teilnehmerlisten für Junioren-Training und weitere Turniere, ähnlich der Lizenzliste | PDF 4b | später | später |

A-ANLASS-01: Erster Anlass neben der Clubmeisterschaft ist die Generalversammlung ([#52](https://github.com/konstantinniedermann/tco-app/issues/52),
[Design](../superpowers/specs/2026-11-05-gv-anmeldung-design.md)). Gebaut als Vorschlag für den
Vorstand: Der Mitglieder-Admin erstellt einen Anlass, alle Mitglieder sehen ihn auf der Startseite, melden
sich an oder ab (mit freiwilliger Bemerkung) und speichern ihn im Kalender. Vorschlag K-50:
Liste nur für Mitglieder- und MyTCO-Admins; Anträge, Zielgruppen und Stimmrecht später. Etappe und Status mit \*: Der
Bau ist ein Vorschlag, der Vorstand bestätigt ihn mit K-50; den Kalendereintrag auf echten
Geräten prüft die [Checkliste vor dem Release](../testkonzept.md#checkliste-vor-dem-release).

### LIZENZ — Lizenzanträge und Lizenzliste

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-LIZENZ-01 | Das Mitglied beantragt in MyTCO eine Lizenz oder deren Aktualisierung | PDF 3e, Ziel | Lizenzanträge | geplant |
| A-LIZENZ-02 | Das Mitglied beantragt in MyTCO das Storno seiner Lizenz | PDF 3e, Ziel | Lizenzanträge | geplant |
| A-LIZENZ-03 | Der Lizenzverantwortliche sieht zu einem Stichtag die Liste aller beantragten Lizenzen und Stornos | Ziel | Lizenzanträge | geplant |
| A-LIZENZ-04 | Der Lizenzverantwortliche exportiert diese Liste, um sie von Hand bei Swiss Tennis einzutragen | Ziel | Lizenzanträge | geplant |
| A-LIZENZ-05 | Jährliche Liste aller aktuellen Lizenzen als PDF, Änderungen zum Vorjahr klar ersichtlich; Format wird mit der zuständigen Person abgesprochen | PDF 4b | später | später |

### TURNIER — Clubmeisterschaft anlegen

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-TURNIER-01 | Der CM-Admin legt jedes Jahr die Clubmeisterschaft als Turnier an | PDF 5a | CM-Anmeldung | umgesetzt |
| A-TURNIER-02 | Zum Turnier werden die Swiss-Tennis-Turniernummern erfasst | PDF 5a | CM-Anmeldung | umgesetzt |
| A-TURNIER-03 | Zum Turnier werden alle Kategorien erfasst, eingeteilt nach Geschlecht, Alter, Klassierungsbereich (Einzel; im PDF: Stärkekategorie) bzw. Mindestsumme der Klassierungen (Doppel, Annahme K-51) und Einzel/Doppel | PDF 5a | CM-Anmeldung | umgesetzt |

### ANMELDUNG — Anmeldung zur Clubmeisterschaft

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-ANMELDUNG-01 | Alle Mitglieder können sich zur Clubmeisterschaft anmelden | PDF 5b, Ziel | CM-Anmeldung | umgesetzt |
| A-ANMELDUNG-02 | Ein Spieler hat höchstens 3 Anmeldungen gleichzeitig | PDF 5b | CM-Anmeldung | umgesetzt |
| A-ANMELDUNG-03 | MyTCO zeigt nur die Kategorien an, die für den Spieler möglich sind (Klassierung evtl. ausgenommen, weil die Klassierung nicht automatisch von Swiss Tennis kommt) | PDF 5b | CM-Anmeldung | umgesetzt |
| A-ANMELDUNG-04 | Bei einer Doppelkategorie zeigt MyTCO sofort alle verfügbaren Spieler des Clubs zur Wahl des Doppelpartners | PDF 5b | CM-Anmeldung | umgesetzt (Mitglieder; Verwaltung mit Etappe 2) |
| A-ANMELDUNG-05 | Nach der Anmeldung erhält der Spieler eine automatische Bestätigung mit seinen Kategorien | PDF 5b | CM-Anmeldung | umgesetzt |
| A-ANMELDUNG-06 | Der CM-Admin fügt Anmeldungen von Hand hinzu oder ändert sie (z. B. die Klassierung) | PDF 5b | CM-Anmeldung | umgesetzt (Einzel; Doppel mit #59) |
| A-ANMELDUNG-07 | Die Anmeldung schliesst zu einem Anmeldeschluss | PDF 5c (abgeleitet) | CM-Anmeldung\* | umgesetzt |
| A-ANMELDUNG-08 | Der Spieler wählt, ob er bei Neuigkeiten, die ihn betreffen (neue Spiele, geänderter Spielplan), benachrichtigt wird | PDF 5b | CM-Betrieb\* | geplant |
| A-ANMELDUNG-09 | Benachrichtigung per SMS oder WhatsApp (zuerst E-Mail und Push, siehe N-APP-02) | PDF 5b | später\* | später |
| A-ANMELDUNG-10 | Für eine Kategorie ausserhalb des eigenen Klassierungsbereichs meldet sich der Spieler mit Wildcard-Antrag und Kommentar an; der CM-Admin entscheidet | PL | CM-Anmeldung | umgesetzt (Einzel; Doppel mit #59) |

### ADVANTAGE — Datenaustausch mit Swiss Tennis

Advantage nimmt Lizenznummern per Copy-Paste an, exportiert Excel und kann keine
Resultate importieren ([Recherche Systemlandschaft](../recherche/README.md)).

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-ADVANTAGE-01 | Nach Anmeldeschluss exportiert MyTCO die Anmeldungen in einem für Swiss Tennis möglichst guten Format | PDF 5c, Ziel | CM-Betrieb | geplant |
| A-ADVANTAGE-02 | MyTCO übernimmt die in Advantage erstellten Kategorien mit Gruppen bzw. Tableaus | PDF 5c, Ziel | CM-Betrieb | geplant |
| A-ADVANTAGE-03 | Kategorien laufen entweder als Gruppenspiele (Gruppengrösse und -anzahl variabel) oder im KO-System; Details mit den zuständigen Personen | PDF 5c | CM-Betrieb | geplant |
| A-ADVANTAGE-04 | MyTCO liefert die Resultate in einer Form, die sich schnell und einfach in Advantage eintragen lässt | PDF 5d, Ziel | CM-Betrieb | geplant |
| A-ADVANTAGE-05 | MyTCO übernimmt die KO-Tableaus fürs Finalwochenende (neu eröffnete und fortgesetzte Kategorien) | PDF 5e-i | später\* | später |
| A-ADVANTAGE-06 | Nach dem Finalwochenende liefert MyTCO die Resultate zum Eintragen in Advantage | PDF 5e-ii | später\* | später |

### RESULTAT — Resultatmeldung und Rangliste

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-RESULTAT-01 | Der Spieler sieht seine Spiele und alle für ihn wichtigen Daten | PDF 5d | CM-Betrieb\* | geplant |
| A-RESULTAT-02 | Der Spieler sieht die Kontaktmöglichkeiten seiner Gegner | PDF 5d | CM-Betrieb\* | offen |
| A-RESULTAT-03 | Der Spieler meldet seine Resultate selbst | PDF 5d, Ziel | CM-Betrieb | geplant |
| A-RESULTAT-04 | Der Gegner bestätigt ein gemeldetes Resultat | PDF 5d | CM-Betrieb | offen |
| A-RESULTAT-05 | Alle Resultate der anderen Kategorien lassen sich mitverfolgen | PDF 5d | CM-Betrieb\* | geplant |
| A-RESULTAT-06 | Für jede Gruppe entsteht live eine Rangliste nach den Regeln von Swiss Tennis | PDF 5d | CM-Betrieb\* | geplant |
| A-RESULTAT-07 | Der CM-Admin erfasst Resultate von Hand | PDF 5d | CM-Betrieb\* | geplant |

### SPIELPLAN — Finalwochenende

Advantage kann Plätze benennen, ein Spielzeitraster erzeugen und auf Doppelbelegung
prüfen. Ob ein eigener Planer nötig ist, hängt davon ab, ob der Spielplan in Advantage in
der Praxis reicht ([K-33](../abklaerungen.md#vor-cm-betrieb-01062027)).

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| A-SPIELPLAN-01 | Kalender-Raster mit frei einstellbarer Anzahl Tage (ggf. per Kalender wählbar) | PDF 5e-i | später | später |
| A-SPIELPLAN-02 | Anzahl Plätze und deren Namen einstellbar (u. a. für die neue Tennisanlage Gheid) | PDF 5e-i | später | später |
| A-SPIELPLAN-03 | Geplante Spieldauer pro Kategorie einstellbar (z. B. kürzer für Junioren) | PDF 5e-i | später | später |
| A-SPIELPLAN-04 | Spiele per Drag-and-Drop in einem 30-Minuten-Raster platzieren | PDF 5e-i | später | später |
| A-SPIELPLAN-05 | Automatische Prüfung, ob Spieler gleichzeitig oder direkt hintereinander spielen müssten, auch für künftige Spiele (z. B. Finals); Konflikte farbig markiert | PDF 5e-i | später | später |
| A-SPIELPLAN-06 | Schnelles Verschieben, z. B. bei Regen | PDF 5e-i | später | später |
| A-SPIELPLAN-07 | Spieler sehen den finalisierten Plan jederzeit, mit Änderungen live | PDF 5e-ii | später | später |
| A-SPIELPLAN-08 | Der CM-Admin trägt per Klick auf ein Spiel das Resultat ein; es erscheint im Kalender der öffentlichen Seite | PDF 5e-ii | später | später |

## Nicht-funktionale Anforderungen

| ID | Anforderung | Quelle | Etappe | Status |
|----|-------------|--------|--------|--------|
| N-APP-01 | MyTCO ist eine einfache Mobile-App für Android und iOS; das PDF nennt noch eine Web-App mit möglicher App später. Zuerst als installierbare Web-App, die Store-App ist N-APP-04 | Ziel, PDF 1 | Fundament ([ADR-001](../adr/adr-001-web-app-zuerst.md)) | geplant |
| N-APP-02 | Benachrichtigungen per Push und E-Mail | Ziel, PDF 5b | Fundament ([ADR-001](../adr/adr-001-web-app-zuerst.md)); Mitteilungen an Anlass und Verein: #63 (FR-40 bis FR-45), die Clubmeisterschaft folgt | umgesetzt\* (Anlass und Verein, #63; Clubmeisterschaft folgt) |
| N-APP-03 | Die Admin-Rollen arbeiten in einer eigenen Verwaltung, als Bereich in MyTCO, der nur mit einer dieser Rollen sichtbar ist und nur deren Bereiche zeigt (RR-07) | PL | Fundament ([ADR-001](../adr/adr-001-web-app-zuerst.md)) | umgesetzt\* (Mitglieder-, CM- und MyTCO-Admin, #43, #57; Lizenz mit ihrer Etappe) |
| N-APP-04 | MyTCO ist als App im App Store und bei Google Play erhältlich | Ziel | später ([ADR-001](../adr/adr-001-web-app-zuerst.md)) | später |
| N-DESIGN-01 | Das Design lehnt sich an die Website tcolten.ch an, mit abgeändertem Farbkonzept zur Abgrenzung | PDF 3a | Fundament (UI-Leitbild, #13) | geplant |
| N-DESIGN-02 | Mobile-first: zuerst fürs Handy gestaltet, funktioniert auch auf dem PC (responsive) | PDF 3a, PL | durchgehend | geplant |
| N-DATENSCHUTZ-01 | Die Bearbeitung der Mitgliederdaten entspricht dem Schweizer Datenschutzgesetz (nDSG) | PL | Fundament ([Datenschutzkonzept](../datenschutz.md), #5) | geplant |
| N-DATENSCHUTZ-02 | Kontaktdaten anderer Mitglieder sind nur sichtbar, soweit der Verein es festlegt: Gegner und Doppelpartner bis zum Ende der CM (K-31), CM- und Lizenz-Admin von allen (K-42) | PDF 5d, PL | Fundament ([Datenschutzkonzept](../datenschutz.md), #5) | geplant |
| N-SICHERHEIT-01 | Weitere Sicherheitsmassnahmen werden mit den zuständigen Personen festgelegt | PDF 2 | Fundament ([Sicherheitskonzept](../sicherheitskonzept.md), #6) | geplant |
| N-BETRIEB-01 | Verfügbarkeit: MyTCO ist besonders während Anmeldephase, Gruppenspielen und Finalwochenende erreichbar; kein fester Zielwert, ein kurzer Ausfall wird in Kauf genommen (K-15) | PL | Fundament (Betrieb, #10) | geplant |
| N-BARRIEREFREI-01 | MyTCO ist für Mitglieder jeden Alters bedienbar; Zielniveau WCAG 2.1 AA\* | PL | durchgehend | geplant |
| N-KOSTEN-01 | Laufende Kosten im niedrigen dreistelligen Bereich pro Jahr | Ziel | Fundament (Kosten, #9) | geplant |
| N-KOSTEN-02 | Die Kosten werden im Detail dokumentiert und analysiert | Ziel | Fundament (Kosten, #9) | geplant |
| N-EIGENSTAENDIG-01 | MyTCO entsteht vorerst ohne Anbindung an Fairgate und ohne Einbindung in tcolten.ch | Ziel | durchgehend ([ADR-006](../adr/adr-006-eigenstaendig-ohne-fairgate.md)) | geplant |
| N-ERWEITERBAR-01 | MyTCO ist modular aufgebaut: weitere Anlässe und Funktionen der Clubverwaltung lassen sich einfach ergänzen | PDF 1, 3d | Fundament (Fachmodell, #3) | geplant |
