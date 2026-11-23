# Design: Rollen nur noch auf der Seite «Rollen» (#96)

Kurzes Design, abgestimmt mit dem Projektleiter am 23.11.2026.

## Absicht

Alles zu Rollen liegt an einem Ort: Vergeben und Entziehen nur noch auf der Seite «Rollen», die
nur der MyTCO-Admin sieht. Die Seite eines Mitglieds bleibt bei den Angaben der
Mitgliederverwaltung. Herkunft: Freigabe der Seiteninfo-Texte in #93.

## Ziele

- Seite «Rollen»: je Rolle die Liste der Mitglieder, dazu «<Rolle> vergeben» und je Eintrag
  «Entziehen», beides mit Rückfrage im `Aktionsdialog`.
- Seite eines Mitglieds: keine Klappe «Rollen» mehr, keine Häkchen. Stattdessen eine leise Zeile
  unter Rufname und Mitgliedernummer: «Rollen: Mitglied · CM-Admin», sichtbar für Mitglieder- und
  MyTCO-Admin. Nur der MyTCO-Admin hat dazu den Link «Auf der Seite «Rollen» ändern».
- RR-03 bleibt: Der letzte MyTCO-Admin kann sich die Rolle nicht entziehen.
- Wer sich selbst den MyTCO-Admin entzieht, bekommt in der Rückfrage gesagt, dass er danach keine
  Rollen mehr vergeben kann und die Seite «Rollen» nicht mehr sieht.

## Nicht-Ziele

- Mitgliederliste: Die Spalte «Rollen» bleibt wie sie ist; die Liste baut #92 parallel um.
- Keine neuen Rollen, keine Änderung an der Matrix `BEREICHE` (Bereich `rollen` lesen und
  schreiben weiterhin nur `mytco`).
- Keine neuen Personendaten: Wer welche Rollen eines Mitglieds sieht, bleibt gleich (der
  Mitglieder-Admin bekommt sie heute schon in Liste und Detail-Antwort).

## Ansätze

| | Ansatz | Abwägung |
|---|---|---|
| **A (gewählt)** | Zwei Einzel-Aktionen «Vergeben» / «Entziehen» (eine Rolle, ein Mitglied); die Schnittstelle mit der ganzen Rollenmenge entfällt | passt 1:1 zur Bedienung (eine Taste, eine Rückfrage, ein Verlaufseintrag); gleichzeitige Änderungen bleiben einfach; etwas mehr Umbau am Server |
| B | Bestehende Schnittstelle (ganze Menge + `vorher`) behalten, die Seite rechnet | Server fast unverändert, aber die Seite muss die Rollen jedes gesuchten Mitglieds erst laden; fehleranfälliger |
| C | Häkchen-Tabelle pro Mitglied auf der Seite «Rollen» | widerspricht der Liste je Rolle; Mitglieder ohne Rolle fehlen in der Tabelle |

Der Projektleiter hat A gewählt.

## Entscheide

- **Server:** `POST /api/admin/rollen/vergeben` und `POST /api/admin/rollen/entziehen`, Körper
  `{ mitgliedId, rolle }`, beide über `schreibt(…, 'rollen', …)`. Antworten: 200; 409
  `letzter-mytco`; 404 bei unbekanntem Mitglied; 400 bei falscher Eingabe. Die Schnittstelle
  `POST /api/admin/mitglieder/[id]/rollen` entfällt samt Eintrag in der Liste der Schnittstellen.
- **Fachfunktionen** in `src/lib/server/admin/rollen.ts`: `vergibRolle` und `entziehRolle`
  ersetzen `setzeRollen`; gleiche Sperre (`sperreRollen`), gleicher Verlauf (`rolle-vergeben`,
  `rolle-entzogen`), beim Entzug von `mytco` endet die «Ansicht als …» des Kontos wie heute.
- **Suche** beim Vergeben: die bestehende `Spielersuche` (aktive Mitglieder, Schnittstelle des
  Bereichs `cm`, die der MyTCO-Admin lesen darf). Wer die Rolle schon hat, ist als «hat die Rolle
  schon» gesperrt.
- **Seiteninfo** (Wortlaut dem Projektleiter vor dem Merge zeigen):
  - «Rollen»: «Wer welche Rolle hat. Hier werden Rollen vergeben und entzogen; ein MyTCO-Admin
    bleibt immer.»
  - «Mitglieder»: «Alle Mitglieder suchen und über «Bearbeiten» ihre Seite öffnen: Angaben,
    Mitgliedschaft und Login. Rollen vergibt und entzieht der MyTCO-Admin auf der Seite «Rollen».»
- **Doku:** `docs/rollen-und-rechte.md` (Ort der Vergabe), `docs/ui-leitbild.md` (Beispiel
  «Rollen speichern» bei *Inaktive Taste* ersetzen), Eintrag unter «Unveröffentlicht» in
  `docs/versionen.md`.

## Calls von Claude (zum Prüfen)

- **Doppelt ist kein Fehler:** Hat das Mitglied die Rolle schon (Vergeben) oder nicht mehr
  (Entziehen), antwortet der Server mit 200 ohne Verlaufseintrag; die Seite lädt danach ohnehin neu.
  Kein `veraltet`, weil der gewünschte Stand erreicht ist.
- Ausgetretene oder gesperrte Konten lassen sich über die Suche nicht finden; der Server prüft beim
  Vergeben aber nicht zusätzlich (wie heute), Rollen gesperrter Konten wirken ohnehin nicht (RR-08).

## Nachtrag nach dem Review (Entscheid Projektleiter, 23.11.2026)

Die Seite «Rollen» zeigt auch Inhaber, die ausgetreten, zum Löschen vorgemerkt oder gesperrt sind,
mit Plakette und «Entziehen» (Gelöschte nicht). Sonst liessen sich ihre Rollen nirgends mehr
entziehen und kämen beim Wiedereintritt zurück (RR-08). Sie zählen weiter nicht als MyTCO-Admin.

## Nachweis

- DB-Tests für `vergibRolle` / `entziehRolle`: Vergabe und Entzug mit Verlauf, doppelt ohne
  Eintrag, letzter MyTCO-Admin, Ansicht endet, gleichzeitiger Entzug zweier MyTCO-Admins.
- Schnittstellen-Test: Mitglieder-Admin und CM-Admin werden beim Vergeben und Entziehen
  abgewiesen; die alte Route gibt es nicht mehr.
- E2E: MyTCO-Admin vergibt und entzieht mit Rückfrage; letzter MyTCO-Admin bleibt geschützt;
  auf der Seite eines Mitglieds keine Häkchen, dafür die Zeile mit Link.
- Screenshots PC und Handy der Seite «Rollen» und der Zeile auf der Seite eines Mitglieds.
