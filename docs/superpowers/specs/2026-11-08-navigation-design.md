# Übersichtliche Navigation — Design

Issue: [#69](https://github.com/konstantinniedermann/tco-app/issues/69) · Stand 08.11.2026 ·
Entwurf: Design-Artifact «MyTCO Navigation und Tiefe» (https://claude.ai/artifact/TWLgEFy4xqH68NwhUaqELJ,
privat, gewählt 2b)

## Warum

Auf Unterseiten steht heute nur «‹ Zurück», und die Reiter verschwinden. Das Mitglied sieht
weder, wohin «Zurück» führt, noch in welchem Bereich es ist. In der Verwaltung ist es schon heute
drei Stufen tief, in der App wird es mit dem CM-Betrieb tiefer (Kategorie, Gruppe, Spiel,
Resultat). Eine feste, sichtbare Ordnung soll das von Anfang an tragen, bevor die CM-Seiten
dazukommen.

## Ziele

- Jeder Zurück-Link nennt sein Ziel.
- Nach dem Login stehen die Reiter auf jeder Seite der App, der Bereich der Seite ist markiert.
- Neuer Reiter **CM** zwischen Start und Profil: Start · CM · Profil.
- Die Verwaltung zeigt über dem Titel den Pfad zur Seite.
- Eine Vorgabe im UI-Leitbild, die alles Künftige auf höchstens zwei Stufen unter dem Reiter hält.

## Nicht-Ziele

- Kein Umbau der Verwaltung (Seitenleiste, Bereiche bleiben).
- Teil 2 (Umschalter, Blatt von unten) wird nur im UI-Leitbild und im Design System festgehalten,
  nicht gebaut. Gebaut wird er mit den Issues des CM-Betriebs.
- Keine Übersicht früherer Clubmeisterschaften und keine Ranglisten.
- Kein eigener Reiter *Lizenz* (kommt mit der Etappe *Lizenzanträge*).

## Anti-Ziele

- Ein Zurück-Link, der je nach Herkunft woandershin führt. Er folgt immer der festen Ordnung.
- Ein Pfad, der auf dem Handy umbricht oder mehr Platz nimmt als der Titel.
- Reiter, die je nach Seite erscheinen und verschwinden (ausser vor dem Login und bei offener
  Tastatur, wie heute).
- Ein Reiter CM, der ins Leere führt (leere Seite ohne Erklärung).

## Teil 1 — wird gebaut

### 1. Zurück-Link nennt sein Ziel

- Text «‹ <Titel der Elternseite>», z. B. «‹ Clubmeisterschaft 2027», «‹ Profil», «‹ Start».
- Er führt immer eine Stufe höher in der festen Ordnung (Tabelle unten), egal woher man kam.
- Zurück-Taste und -Geste des Geräts gehen weiter den Verlauf des Browsers zurück (unverändert).
- Steht immer einzeilig; ein zu langer Name wird am Ende mit «…» gekürzt.
- Formularschritte: In *E-Mail ändern* Schritt 2 darf der Link den Schritt nennen
  («‹ Andere Adresse») statt zur Elternseite zu führen (wie heute: zu Schritt 1).

### 2. Reiter auf allen Seiten nach dem Login

- Reiter Start · CM · Profil auf jeder Seite der App nach dem Login, die Unterseite markiert den
  Reiter ihres Bereichs (Tabelle unten).
- Vor dem Login (Einstiegsseite, Login, Login mit Mail-Code, Hilfe und Datenschutz ohne Sitzung)
  keine Reiter, wie heute.
- Wer den markierten Reiter nochmals antippt, kommt zur obersten Seite des Bereichs; ist er dort
  schon, nach oben (wie heute).
- Bei ungespeicherten Änderungen kommt zuerst die Rückfrage, wie heute.
- Bei offener Tastatur verschwinden die Reiter, wie heute.
- Am PC (ab `60rem`) stehen die Reiter wie heute als Textlinks in der Kopfleiste, auch auf
  Unterseiten.
- Die Regel «Unterseiten: keine Reiter» im UI-Leitbild fällt weg.

### 3. Reiter CM

- Für alle eingeloggten Mitglieder sichtbar. Symbol wie im Entwurf (Tennisball).
- Oberste Seite des Reiters: neue Adresse `/clubmeisterschaft`. Was sie zeigt, hängt von den
  *laufenden* Clubmeisterschaften ab — dieselbe Regel wie heute auf der Startseite (freigegeben,
  also nicht in Vorbereitung, und aus dem laufenden Jahr):
  - **keine:** Titel «Clubmeisterschaft» und ein Hinweis «Zurzeit läuft keine
    Clubmeisterschaft. Sobald die Anmeldung offen ist, steht sie hier.»
  - **eine:** direkt die Seite dieser Clubmeisterschaft (heutige Seite `/clubmeisterschaft/[id]`),
    ohne Zwischenliste. Sie ist dann die oberste Stufe und hat keinen Zurück-Link.
  - **mehrere:** Titel «Clubmeisterschaft» und je eine Kachel wie heute auf der Startseite.
    Die Seite der einzelnen CM ist dann eine Stufe tiefer, mit «‹ Clubmeisterschaft».
- Die Startseite zeigt die CM-Kachel unter «Jetzt aktuell» weiter. Antippen führt in den
  Bereich CM: unten wird CM markiert, und der Wechsel sieht aus wie ein Reiterwechsel
  (Überblenden), nicht wie «eine Stufe tiefer».

### 4. Verwaltung: Pfad über dem Titel

- Über dem Titel jeder Unterseite der Verwaltung, z. B. «Turniere › Clubmeisterschaft 2027 ›
  Herren R5/R9». Jede Stufe ist ein Link, die aktuelle Seite steht fett und ohne Link.
- Der Pfad ersetzt den heutigen «‹ …»-Link über dem Titel.
- Auf schmalem Bildschirm, wo der Pfad nicht in eine Zeile passt: nur «‹ <Elternseite>» (einzeilig,
  gekürzt mit «…»), nie ein umbrechender Pfad.
- Die obersten Seiten der Bereiche (Einträge der Seitenleiste) haben keinen Pfad.
- Druckansichten bekommen keinen Pfad. Die Auskunft behält ihre Leiste mit Taste und «Drucken»;
  die Taste heisst neu «‹ <Name des Mitglieds>». Der Briefdruck (Überlagerung auf Mitglied und
  Briefe) behält «‹ Zurück», weil er nur die Ansicht schliesst und keine Stufe ist.
- Die Verwaltung bekommt keine Reiter, auch auf dem Handy nicht; sie behält Seitenleiste und
  «‹ Zur App».

### Feste Ordnung: Seite → Reiter → Elternseite

Mitglieder-App:

| Seite | Reiter | Elternseite / Zurück-Link |
|---|---|---|
| `/` Start | Start | — (oberste Stufe) |
| `/clubmeisterschaft` | CM | — (oberste Stufe) |
| `/clubmeisterschaft/[id]` | CM | keine, wenn sie die einzige laufende ist; sonst «‹ Clubmeisterschaft» |
| `/clubmeisterschaft/[id]/doppel/[kid]` | CM | «‹ <Name der Clubmeisterschaft>» |
| `/anlass/[id]` | Start | «‹ Start» |
| `/profil` | Profil | — (oberste Stufe) |
| `/profil/email` | Profil | «‹ Profil» (Schritt 2: «‹ Andere Adresse») |
| `/hilfe`, `/datenschutz` mit Sitzung | Start | «‹ Start» |
| `/hilfe`, `/datenschutz` ohne Sitzung | keine | «‹ Anmelden» (zum Login) |
| `/login/mail` | keine | «‹ Anmelden» |
| Fehlerseite | wie heute | wie heute («‹ Zur Startseite» / «‹ Zur Verwaltung») |

Verwaltung (Pfad; die erste Stufe ist der Eintrag der Seitenleiste):

| Seite | Pfad |
|---|---|
| `mitglieder/[id]` | Mitglieder › <Nachname, Vorname> |
| `verlauf?mitglied=…` | Mitglieder › <Name> › Änderungsverlauf |
| `mitglieder/neu` | Mitglieder › Neues Mitglied |
| `anlaesse/[id]`, `anlaesse/neu` | Anlässe › <Titel> bzw. Neuer Anlass |
| `turniere/[id]`, `turniere/neu` | Turniere › <Name> bzw. Neues Turnier |
| `turniere/[id]/kategorien/[kid]`, `…/neu` | Turniere › <Turnier> › <Kategorie> bzw. Neue Kategorie |

Die Bezeichnungen der Pfad-Stufen folgen den heutigen Seitentiteln. Weicht ein Titel ab
(«Neues Mitglied» o. ä.), gilt der Seitentitel.

## Teil 2 — nur Vorgabe im UI-Leitbild und im Design System

- **Höchstens zwei Stufen unter dem Reiter**, z. B. CM › Herren R5/R9 › Spiel gegen X. Was
  tiefer wäre, wird ein Umschalter auf derselben Seite oder ein Blatt von unten.
- **Baustein *Umschalter*** (Entwurf 2b, «Unterreiter mit Balken»): Einträge wie Spiele ·
  Rangliste · Teilnehmer oben auf der Seite, der aktive grün mit Balken unten, die anderen leise.
  Kein Seitenwechsel, keine neue Stufe. Variante «Segmente» (2a) ist verworfen.
- **Baustein *Blatt von unten*** für das letzte Stück eines Ablaufs (z. B. «Resultat melden»,
  Entwurf 4), als `<dialog>`; «Abbrechen» schliesst es, die Seite darunter bleibt.

Mit dem Reiter CM wird die oberste Stufe einer laufenden CM später (Gruppenphase) die Seite der
CM mit «Deine Kategorien» und «Alle Kategorien» (Entwurf 1). Das baut der CM-Betrieb.

## Festgelegt vom Projektleiter (08.11.2026)

- Lösungsrichtung Teil 1 und 2 wie im Issue, Entwurf 2b.
- Reiter CM kommt mit #69 (nicht erst mit der Etappe CM-Anmeldung).
- Keine laufende CM: Hinweis; mehrere: Kacheln; eine: direkt ihre Seite.
- Die CM-Kachel auf der Startseite bleibt.

## Entscheide des Umsetzers (beim Lesen prüfen)

- Neue Adresse `/clubmeisterschaft` als oberste Seite des Reiters CM.
- Hilfe und Datenschutz mit Sitzung gehören zu Start; ohne Sitzung «‹ Anmelden».
- Auf der Auskunft nennt die Taste den Namen des Mitglieds statt «Zurück»; Druckansichten ohne Pfad.
- Design System «MyTCO»: nachgeführt wird nur, was #69 berührt (Navigation, Reiter CM, Zurück mit
  Ziel, Pfad, *Umschalter*, *Blatt von unten*, samt README-Abschnitt Navigation). Der übrige
  Rückstand des Design Systems gegenüber dem Leitbild bleibt der Eintrag in `docs/beobachtungen.md`.
- Ein Wechsel in einen anderen Bereich (Kachel auf Start → CM) überblendet wie ein Reiterwechsel.

## Dem Umsetzer überlassen

- Wo die feste Ordnung im Code steht (eine Tabelle neben `EBENE` in `src/lib/ui/navigation.ts`
  liegt nahe) und wie die Seiten ihren Zurück-Link bzw. Pfad daraus bekommen.
- Ob `/clubmeisterschaft` bei genau einer CM umleitet oder deren Inhalt selbst zeigt — die
  Adresse in der Leiste und die Zurück-Taste des Browsers dürfen sich dabei nicht im Kreis drehen.
- Wann der Pfad in der Verwaltung zu «‹ Elternseite» wird (Breite oder Messung).
- Bewegung beim Seitenwechsel (`EBENE`) für die neuen Stufen nachführen.

## Datenschutz

Keine neuen Personendaten. Der Reiter CM zeigt dasselbe wie die heutige CM-Seite. Der Pfad in der
Verwaltung zeigt den Namen eines Mitglieds nur auf dessen eigenen Seiten (Mitglied, Auskunft,
Verlauf; auf dem Verlauf steht er schon in jeder Zeile der Tabelle) und nur den Admins, die diese
Seiten heute schon sehen.

## Nachweis (Definition of Done aus #69)

- UI-Leitbild nachgeführt (Zurück mit Ziel, Reiter auf Unterseiten samt Zuordnung, Reiter CM,
  höchstens zwei Stufen, Pfad in der Verwaltung, Bausteine *Umschalter* und *Blatt von unten*).
- Design System «MyTCO» nachgeführt (was #69 berührt, siehe Entscheide).
- Unit-Tests: Zuordnung Seite → Reiter und Ziel des Zurück-Links.
- E2E: Reiter auf Unterseiten, «Reiter nochmals antippen» führt zur obersten Seite, Rückfrage
  bei ungespeicherten Änderungen, Reiter CM mit keiner, einer und mehreren laufenden CM,
  Pfad in der Verwaltung; auf Desktop, iPhone, Android mit axe.
- Bildvergleich gegen den Entwurf (iPhone, Android, Verwaltung am PC).
