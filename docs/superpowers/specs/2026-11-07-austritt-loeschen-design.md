# Entwurf: Austritt, Löschen, Auskunft und Löschfristen (#43, Etappe 3)

Stand 07.11.2026. Brainstorming mit dem Projektleiter. Grundlage: FR-04, FR-26, DS-07, RR-03, RR-08,
`docs/datenschutz.md` (*Löschen*) und die Kommentare in #43 vom 06.11.2026.

## Wozu

Die Mitgliederverwaltung braucht Austritt, Wiedereintritt und Löschen, bevor echte Mitglieder in
MyTCO sind. Die Datenschutzerklärung verspricht schon Löschfristen, die nicht gebaut sind. Die
Release-Checkliste (`docs/testkonzept.md`) verlangt sie vor dem ersten Live-Release mit Mitgliedern.

## Ziele

1. **Austritt** erfassen und **Wiedereintritt** innert Frist, durch den Mitglieder-Admin.
2. **Mitglied löschen** mit einer Woche Bedenkzeit, rückgängig machbar.
3. **Auskunft** (DS-07): alle Daten eines Mitglieds auf einer druckbaren Seite.
4. **Zeitgeber**, der die Löschfristen ohne Zutun vollzieht.
5. Folgen des Austritts: kommende Anmeldungen zurückziehen, «Für Fairgate» und die Zählungen der
   Anlässe nur mit aktiven Mitgliedern.

## Nicht-Ziele

- Austritt über das Einlesen der Fairgate-Liste (#46). Etappe 3 baut den Schritt so, dass #46 ihn
  später aufruft.
- Auskunft für das Mitglied selbst (Selbstbedienung). DS-07 nennt den Mitglieder-Admin.
- Mitteilung an das ausgetretene oder gelöschte Mitglied.
- Löschfrist für CM-Anmeldungen und Lizenzanträge (offen bzw. eigenes Issue).

## Anti-Ziele

- Das Login verrät nie, ob eine Adresse einmal Mitglied war.
- Der Zeitgeber löscht nie etwas vor Ablauf der Frist, auch nicht bei Zeitzonen- oder
  Neustart-Effekten. Im Zweifel einen Tag später.
- Keine neue Abhängigkeit, kein zusätzlicher Dienst auf dem Server.

## Zustände eines Mitglieds

| Zustand | Login | Wie hinein | Wie hinaus |
|---|---|---|---|
| *aktiv* | ja | Anlegen, Wiedereintritt, Löschung rückgängig | Austritt, Löschung vormerken |
| *ausgetreten* | nein | Austritt | Wiedereintritt (innert Frist), Löschung vormerken, Zeitgeber nach Frist |
| *Löschung vorgemerkt* | nein | *Mitglied löschen* | rückgängig (zurück in den Zustand davor), Zeitgeber nach 1 Woche |
| *gelöscht* | nein | Zeitgeber | — (endgültig) |

- **Frist nach Austritt:** 1 Jahr ab Austrittsdatum (**Annahme K-38**, im Code als Annahme markiert).
- **Bedenkzeit:** 1 Woche ab Vormerken.
- Zurück aus *Löschung vorgemerkt* gilt wieder der Zustand davor: *aktiv*, oder *ausgetreten* mit
  dem alten Austrittsdatum. Ist die Frist des Austritts in der Woche abgelaufen, löscht der nächste
  Lauf des Zeitgebers.
- Nach der Frist gilt ein Wiedereintritt als neues Mitglied (neu anlegen).

## Austritt (Entscheide des Projektleiters)

- Der Mitglieder-Admin erfasst ihn auf der Seite des Mitglieds, mit Rückfrage. Er gilt **ab
  sofort**, ein anderes Datum gibt es nicht.
- Das Login ist sofort gesperrt: Sitzungen und Push-Abos sind weg. **Passkeys bleiben** bis zur
  Löschung, damit ein Wiedereintritt ohne Neueinrichtung geht.
- Beim Login antwortet MyTCO **wie bei jeder unbekannten Adresse** (es kommt kein Code; Passkey
  führt nicht hinein). **Rollen bleiben gespeichert** und wirken nicht, solange das Mitglied nicht
  aktiv ist (RR-08). Nach Wiedereintritt oder Rückgängig wirken sie sofort wieder (Entscheid des
  Projektleiters). Der Login prüft den Status heute schon (`login/dienst.ts`, `passkey.ts`,
  `sitzung.ts`); Etappe 3 belegt das mit Tests auch für *Löschung vorgemerkt*.
- **Kommende Anmeldungen werden zurückgezogen:**
  - CM-Anmeldungen und Wildcard-Anträge **nur, solange die Anmeldung des Turniers offen ist** (vor
    dem Anmeldeschluss): Status *zurückgezogen*. Danach bleiben sie stehen; die CM-Verantwortlichen
    sehen in ihrer Anmeldeliste (#60) den Vermerk *ausgetreten* und entscheiden selbst (Entscheid
    des Projektleiters). Keine Mitteilung.
  - **Nur Einzel** (meine Entscheidung): Doppel-Anmeldungen gibt es erst mit #59; den Fall «ein
    Partner tritt aus» regelt #59 (dort als Hinweis eintragen).
  - Antworten zu Anlässen, deren Beginn noch kommt, werden gelöscht.
  - Vergangenes bleibt. Beim Wiedereintritt bleibt Zurückgezogenes zurückgezogen.
- Der Austritt ist im Änderungsverlauf (FR-26), ebenso Wiedereintritt, Vormerken und Rückgängig.
- Der letzte MyTCO-Admin kann weder austreten noch zum Löschen vorgemerkt werden (RR-03). Dieselbe
  Untergrenze wie in `setzeRollen`, unter derselben Sperre (`SPERRE_ROLLEN`), damit zwei
  gleichzeitige Schritte sie nicht unterlaufen.

## Löschen

- *Mitglied löschen* (Mitglieder-Admin, mit Rückfrage) setzt *Löschung vorgemerkt*. Das Login ist
  gesperrt wie beim Austritt. Kommende Anmeldungen werden wie beim Austritt zurückgezogen.
- Während der Woche zeigt die Seite *Löschung rückgängig machen*.
- **Was die Löschung (Zeitgeber) tut:**
  - Vom Mitglied bleiben nur Vor- und Nachname, Status *gelöscht*. Alle anderen Felder sind leer.
  - Das Konto ist weg, mit Sitzungen, Passkeys, Rollen und Push-Abos (Cascade über `konto`).
  - Antworten zu Anlässen und der eigene Änderungsverlauf sind weg.
  - CM-Anmeldungen bleiben mit dem Namen (Turniergeschichte, `docs/datenschutz.md`).
  - Verweise auf die Person werden geleert, damit ihr Name nirgends mehr als Handelnde erscheint:
    Urheber im Änderungsverlauf anderer Mitglieder, *Erstellt von* am Anlass, Absender im Verlauf
    der Mitteilungen. Angezeigt wird *gelöschtes Konto* (meine Entscheidung). Heute zeigt
    `admin/verlauf.ts` das nur, wenn die Mitglied-Zeile fehlt; das muss auch für leere Verweise
    gelten.

## Auskunft (DS-07)

- Eine **druckbare Seite** pro Mitglied, für den Mitglieder-Admin (Lesen: auch MyTCO-Admin nach
  `bereiche.ts`). Über den Browser als PDF speicherbar. Keine Datei, keine neue Abhängigkeit.
- Inhalt: alles, was MyTCO zu der Person speichert, nach *Welche Daten* in `docs/datenschutz.md`:
  Angaben, Status mit Daten, Rollen, Login (Anzahl Sitzungen und Passkeys mit Datum, ohne
  Kennungen), Push-Abos (Anzahl), Antworten zu Anlässen, CM-Anmeldungen, Änderungsverlauf.
  Keine Geheimnisse (Codes, Hashes, Schlüssel).
- Der Aufruf der Auskunft steht im Änderungsverlauf.

## Zeitgeber (Entscheid: in der App, täglich)

- Neuer Baustein: Der laufende Server räumt **einmal pro Tag** auf und **kurz nach jedem Start**.
  Verpasste Läufe holt der nächste nach, weil jeder Lauf alles Fällige erledigt.
- Ein Lauf erledigt:
  1. Konten löschen, deren Frist nach Austritt oder deren Bedenkzeit abgelaufen ist.
  2. Einträge im Änderungsverlauf löschen, die älter als 12 Monate sind.
  3. Antworten zu Anlässen löschen, deren Anlass mehr als ein Jahr zurückliegt (**Vorschlag K-50**).
- Läuft MyTCO einmal doppelt (Neustart, zwei Prozesse), darf nichts doppelt oder falsch passieren:
  Sperre in der Datenbank, jeder Schritt wiederholbar.
- Der Zeitgeber muss sich in Tests mit einer festen Uhrzeit aufrufen lassen; in E2E und beim
  Seed darf er nichts Unerwartetes löschen.
- Was der Lauf gelöscht hat, steht im Server-Log (nur Anzahl und Mitglied-ID, keine Namen).

## Folgen für andere Bereiche

- **«Für Fairgate»** zeigt nur aktive Mitglieder; beim Austritt wird die Markierung gelöscht.
- **Anlässe** zählen *kommen*, *kommen nicht* und *noch keine Antwort* nur über aktive Mitglieder
  (`ladeAnlassAdmin`, `listeAnlaesse`).
- **CM-Anmeldeliste der Verwaltung** (#60): Vermerk *ausgetreten* bzw. *Löschung vorgemerkt* bei
  Anmeldungen nach dem Anmeldeschluss. Baut auf #60 auf: erst nach dessen Merge, sonst als
  Nacharbeit.
- **Mitgliederliste:** Der Statusfilter kennt *Löschung vorgemerkt*. Gelöschte bleiben wie heute
  ohne Filter verborgen.
- Wenn der Verlauf gelöscht ist, zeigt «Für Fairgate» verständlich, dass die Angaben älter sind
  (Befund 3 vom 06.11.).

## Oberfläche

- Seite des Mitglieds: eigene Fläche **Mitgliedschaft** (Leitbild: jedes Thema eigene Fläche) mit
  Zustand und Daten (*ausgetreten am …*, *wird gelöscht am …*) und den passenden Tasten.
  Die Plakette im Titel zeigt den Zustand.
- Druckbare Seite **Auskunft**.
- Design-Entwurf: [MyTCO Mitgliedschaft und Auskunft](https://claude.ai/artifact/5UiDtGffbPejwFudsGNunU).
  Gewählt (Projektleiter): **Variante A** — Karte *Mitgliedschaft* rechts oben über Login und
  Rollen, mit Zustand, Löschdatum und Tasten (aktiv: *Austritt erfassen*, *Mitglied löschen*;
  ausgetreten: *Wiedereintritt erfassen*, *Mitglied löschen*; vorgemerkt: *Löschung rückgängig
  machen*), Link *Auskunft über die Daten ›*. Plakette *wird gelöscht* mit `plakette-gesperrt`.
  Rückfragen nennen, was sofort passiert und bis wann es rückgängig geht. Auskunft wie im
  Entwurf (A4, Tabellen, Taste *Drucken oder als PDF speichern*, nicht auf dem Ausdruck).
- Abnahme per Screenshot neben dem Entwurf und axe. Das Drucklayout der Auskunft kommt erst ins
  `docs/ui-leitbild.md`, dann in den Code.

## Rahmen

- Bauregel ADR-002: Schnittstellen als `+server.ts`, keine Form Actions.
- Rechte nach `bereiche.ts`: schreiben nur Mitglieder-Admin, Rechte-Matrix-Test um die neuen
  Schnittstellen erweitern; *Ansicht als …* bleibt nur lesend.
- Die Datenbank braucht eine Migration (neuer Status, Austrittsdatum, Zeitpunkt des Vormerkens und
  Zustand davor; Felder, die bei *gelöscht* leer werden, dürfen leer sein). Parallel baut #60 im
  selben Bereich (CM-Anmeldungen, Rechte-Matrix): eigene Datenbank per `DATABASE_URL`, vor dem
  Merge `origin/dev` einmergen, Migrationsnummer dann anpassen.
- Testdaten erfunden (DS-08).

## Doku nachführen

`docs/fachmodell.md` (FR-04, FR-26, Zustände), `docs/datenschutz.md` (*Löschen*, DS-07),
`docs/datenschutzerklaerung.md` (falls Wortlaut abweicht), `docs/rollen-und-rechte.md` (RR-03,
RR-08), `docs/anforderungen/anforderungen.md`, `docs/testkonzept.md`, arc42 (Zeitgeber als neuer
Baustein), `docs/versionen.md` unter *Unveröffentlicht*.

## Dem Bauenden überlassen

- Uhrzeit und Mechanik des täglichen Laufs, Art der Datenbanksperre.
- Aufbau der Migration und der Schnittstellen.
- Aufteilung in Schritte im Plan.

## Entscheide ohne Rückfrage (zur Prüfung beim Lesen)

- Passkeys bleiben beim Austritt bis zur Löschung.
- Der Austritt gilt ab sofort, ohne wählbares Datum.
- Beim Austritt wird die Markierung «Für Fairgate» gelöscht.
- Beim Austritt werden nur Einzel-Anmeldungen zurückgezogen; Doppel regelt #59.
- Bei der Löschung werden Urheber, *Erstellt von* und Absender geleert, angezeigt als *gelöschtes Konto*.
- Löschläufe stehen nur im Server-Log (Anzahl, Mitglied-ID), nicht im Änderungsverlauf.
- Der Aufruf der Auskunft steht im Änderungsverlauf.
