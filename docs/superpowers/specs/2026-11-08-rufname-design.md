# Rufname — Design

Issue: [#67](https://github.com/konstantinniedermann/tco-app/issues/67) · Stand 08.11.2026

## Warum

Viele im Club sind nicht unter ihrem amtlichen Vor- und Nachnamen bekannt, sondern unter einem
Rufnamen. In der App erkennen sich die Mitglieder darum schlecht wieder, etwa in den
Teilnehmerlisten der Clubmeisterschaft oder bei der Partnerwahl. Mit dem Rufnamen steht künftig
der Name im Vordergrund, unter dem man jemanden kennt. Der amtliche Name steht klein daneben,
damit klar bleibt, wer gemeint ist.

## Ziele

- Jedes Mitglied kann im Profil freiwillig einen Rufnamen eintragen, ändern und löschen.
- Wo ein Rufname gesetzt ist, steht er überall dort im Vordergrund, wo Mitglieder oder die
  Turnier-, Anlass- und Mitteilungsverwaltung einen Namen sehen.
- Der amtliche Name bleibt immer sichtbar, damit man die Person sicher erkennt.

## Nicht-Ziele

- Kein Rufname in Fairgate oder in Exporten an Swiss Tennis.
- Admins setzen oder ändern keinen Rufnamen, auch nicht für Junioren. Kommt das Führen von
  Junioren-Konten (#45), entscheidet das Issue dort, ob der Elternteil ihn setzt.
- Keine Prüfung, ob ein Rufname «passend» ist. Es gibt auch keine Freigabe durch den Vorstand.

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- Ein Rufname, der den amtlichen Namen verdrängt, sodass man nicht mehr erkennt, wer gemeint ist.
- Ein Rufname, der in den amtlichen Bereichen auftaucht: Postbrief, Adresse, Exporte.
- Eine Darstellung, die an verschiedenen Stellen unterschiedlich aussieht.

## Entscheidungen des Projektleiters

1. **Freiwillig.** Ein leeres Feld heisst «kein Rufname». Dann bleibt jede Anzeige genau wie heute.
2. **Nur das Mitglied** setzt, ändert oder löscht seinen Rufnamen, im Profil.
3. **Darstellung:** Der Rufname steht in normaler Schrift und Grösse, ohne «» und ohne eigene
   Farbe. Dahinter folgt der volle amtliche Name als Nebentext (kleiner, grau; Baustein `.leise`
   aus dem UI-Leitbild). Beispiel: **Hannes** <small>Johannes Muster</small>.
4. **Begrüssung** auf der Startseite: nur der Rufname («Hoi Hannes»). Ohne Rufname wie heute
   der Vorname.
5. **Amtlich bleiben:** Mitgliederverwaltung, Auskunft und der ganze Postbrief, also Adresse *und*
   Anrede («Hoi Johannes»). In der Mitgliederverwaltung und in der Auskunft erscheint der
   Rufname zusätzlich als eigenes Feld.
6. **Die übrigen Verwaltungsbereiche zeigen die Namen wie die App:** Turnierleitung der CM
   (Kategorien, Anmeldungen), Antworten auf Anlässe, Empfänger von Mitteilungen.
7. **Namen im Fliesstext** (etwa die graue Zeile «Angemeldet (3): …» der CM-Seite) bekommen die
   kurze Textform: «Hannes (Johannes Muster)». Die Zeile bleibt eine Zeile und bleibt grau.

**Mein Vorschlag, nicht ausdrücklich entschieden:** Der Rufname erscheint nur für eingeloggte
Nutzer. Seiten ohne Login, etwa der geplante öffentliche Spielplan des Finalwochenendes (K-39),
zeigen nur den amtlichen Namen. So bleibt die Zusage der Datenschutzerklärung «andere Mitglieder
sehen ihn» wahr.

## Wo der Name erscheint und was sich ändert

| Stelle | Heute | Neu |
|---|---|---|
| Startseite, Begrüssung (`src/routes/+page.svelte`, Vorname aus `sitzung.ts`) | Hoi Vorname | Hoi Rufname, sonst Vorname |
| Profil, Zeile zur Person (`src/routes/profil/+page.svelte`, `personText`) | Vorname Nachname · Jahrgang · Nr. | Rufname-Darstellung · Jahrgang · Nr.; dazu das neue Feld *Rufname* |
| CM-Seite für Mitglieder, Namen der bestätigten Anmeldungen (`src/lib/server/cm/anmeldungen.ts`, `namenText` in `src/lib/cm/anzeige.ts`, `src/routes/clubmeisterschaft/[id]/`) | Vorname Nachname in einer grauen Zeile | kurze Textform «Hannes (Johannes Muster)», Zeile bleibt grau (Entscheidung 7) |
| Partnerwahl im Doppel (#59, in Arbeit) | — | Rufname-Darstellung; die Suche findet auch den Rufnamen |
| Turnierleitung (`src/lib/server/cm/verwaltung.ts`, `src/routes/verwaltung/turniere/…`) | Nachname, Vorname | Rufname-Darstellung |
| Antworten auf Anlässe (`src/lib/server/anlass/anlaesse.ts`, `src/routes/verwaltung/anlaesse/[id]/`) | Nachname, Vorname | Rufname-Darstellung |
| Empfänger von Mitteilungen (`src/lib/server/mitteilung/empfaenger.ts`) | Nachname, Vorname | Rufname-Darstellung |
| Absender im Verlauf der Mitteilungen (`src/lib/server/mitteilung/verlauf.ts`) | Nachname, Vorname | Rufname-Darstellung *(mein Vorschlag, gehört zu den Mitteilungen)* |
| Mitgliederverwaltung: Liste, Detail, Rollen, Änderungsverlauf, *Für Fairgate* (`src/lib/server/admin/…`, `src/routes/verwaltung/{mitglieder,rollen,verlauf,fairgate}/`) | Nachname, Vorname | bleibt; im Detail zusätzlich das Feld *Rufname* (nur lesen) |
| Auskunft (`src/lib/server/admin/auskunft.ts`, `…/auskunft/+page.svelte`) | Name | bleibt; zusätzlich Zeile *Rufname*, wenn gesetzt |
| Postbrief (`src/lib/server/brief/brief.ts`) | Adresse und «Hoi Vorname» | bleibt unverändert |

Die Liste ist der Stand vom 08.11.2026 auf `dev`. Kommt bis zur Umsetzung eine neue Namensstelle
dazu, gilt dieselbe Regel: Bereiche für Mitglieder und die Bereiche aus Entscheidung 6 zeigen
den Rufnamen, alles unter Mitgliederverwaltung bleibt amtlich, Seiten ohne Login ebenfalls.

## Regeln für das Feld

- **Länge** (Entscheidung des Projektleiters: Rufnamen sind kurze Spitznamen): höchstens 10
  Zeichen nach dem Kürzen der Leerzeichen am Anfang und am Ende. Ist er länger, zeigt das Profil
  die Meldung «Höchstens 10 Zeichen.» Leer gilt als «kein Rufname» und wird als leer gespeichert, nicht als
  Leerstring.
- **Gleich wie der Vorname** *(mein Vorschlag)*: Stimmt der Rufname ohne Rücksicht auf Gross- und
  Kleinschreibung mit dem Vornamen überein, behandelt die Anzeige ihn wie «kein Rufname». So
  entsteht kein «Johannes Johannes Muster». Gespeichert wird er trotzdem so, wie eingegeben.
- **Zeichen:** dieselben Regeln wie beim Vornamen in `pruefeAngaben`, sonst keine
  Einschränkung.
- **Änderungsverlauf:** Eine Änderung wird wie die anderen eigenen Felder als «Feld geändert»
  ohne Wert festgehalten (SI-12).
- **Fairgate:** Der Rufname zählt nicht zu `FAIRGATE_FELDER`. Seine Änderung setzt *für Fairgate
  offen* nicht.
- **Löschen eines Mitglieds:** Der Rufname wird mitgelöscht. Es bleiben wie bisher nur Vor- und
  Nachname (`BLEIBT` in `loeschung.ts`). Vergangene CM-Anmeldungen zeigen danach den amtlichen
  Namen.
- **Austritt:** keine Sonderregel. Der Rufname bleibt während der Frist wie die übrigen Angaben.
- **Sortierung** *(mein Vorschlag)*: unverändert nach Nachname, dann Vorname. Der Rufname
  ändert keine Reihenfolge.
- **Suche** *(mein Vorschlag)*: Die Suche in der Mitgliederverwaltung findet ein Mitglied auch über
  den Rufnamen, obwohl sie den Rufnamen in der Liste nicht zeigt. Die Partnersuche aus #59 findet
  ihn ebenfalls.

## Darstellung als Baustein

- Ins UI-Leitbild (`docs/ui-leitbild.md`) kommt *vor* dem Code ein Baustein «Name mit Rufname»:
  Rufname in `--farbe-text` und Grundgrösse, dahinter mit einem Leerzeichen der amtliche Name als
  `.leise`. Bricht die Zeile auf dem Handy um, darf der amtliche Name in die nächste Zeile
  rutschen. Ohne Rufname nur der amtliche Name in normaler Schrift.
- **Kurze Textform** für Namen im Fliesstext (Entscheidung 7) und für reinen Text: «Rufname
  (Vorname Nachname)», ohne Rufname «Vorname Nachname». Kommt als zweite Form desselben Bausteins
  ins Leitbild.
- In der App heisst der amtliche Name «Vorname Nachname». In den Verwaltungsbereichen aus
  Entscheidung 6 behält er die dort übliche Form «Nachname, Vorname» *(mein Vorschlag: so bleiben
  Liste und Sortierung lesbar, auch wenn nur ein Teil der Mitglieder einen Rufnamen hat)*.
- Screenreader lesen den Namen so, wie er dasteht («Hannes Johannes Muster»). Der graue Teil
  wird nicht versteckt.
- Alle Stellen nutzen eine gemeinsame Svelte-Komponente und eine gemeinsame Funktion für reinen
  Text, etwa für die Begrüssung. Der Server liefert dafür statt eines fertigen Strings die Teile
  (`rufname`, `vorname`, `nachname`).

## Profil

- Neues Feld *Rufname* in der Karte *Meine Angaben*, bearbeitbar wie Telefon und Adresse über
  denselben Ablauf (Ändern → Speichern, Schutz gegen veraltete Stände).
- Hilfetext: «Freiwillig. Unter diesem Namen sehen dich die anderen im Club.»
- Ist kein Rufname gesetzt, zeigt die Kachel «nicht angegeben» wie bei anderen freiwilligen
  Feldern.
- Die Mitgliederverwaltung zeigt das Feld nur zum Lesen. Das Angabenformular des Admins
  enthält es nicht zum Bearbeiten (Entscheidung 2).

## Datenschutz (vor dem Code)

Der Rufname ist eine neue Personenangabe, die andere Mitglieder sehen. Vor der Umsetzung werden
angepasst:

- `docs/datenschutz.md`:
  - **Welche Daten:** neue Zeile *Rufname* | Wiedererkennen im Club, angezeigt neben dem Namen |
    nein (freiwillig, setzt nur das Mitglied).
  - **Wer sieht was:** Bei «Alle Mitglieder» heisst «Name» künftig «Name und Rufname».
  - **Löschen:** Der Rufname wird mitgelöscht, es bleiben nur Vor- und Nachname.
  - Absatz zu den selbst geänderten Feldern: ergänzt um den Rufnamen.
  - **Wer sieht was:** Die Zeilen «Alle, ohne Login» bekommen den Zusatz «ohne Rufname».
- `docs/datenschutzerklaerung.md`: Rufname bei *Welche Daten* (freiwillig). Bei *Wer sieht was*
  ein Satz: Eingeloggte Mitglieder sehen ihn neben deinem Namen, öffentliche Seiten nicht. Du
  kannst ihn jederzeit im Profil ändern oder löschen.
- Auskunft (DS-07): nennt den Rufnamen, wenn er gesetzt ist.
- `docs/fachmodell.md`: Attribut *Rufname (freiwillig, pflegt das Mitglied selbst)* beim Mitglied.

## Testdaten

`scripts/erfundene-mitglieder.ts` bzw. der Seed bekommt für einige erfundene Mitglieder einen
erfundenen Rufnamen. Bei mindestens einem ist der Rufname gleich dem Vornamen, damit diese Regel
sichtbar wird. Keine echten Spitznamen aus dem Verein.

## Nachweis

- Server-Tests: Rufname setzen, ändern, löschen; Länge; leer → null; Änderungsverlauf ohne Wert;
  kein *für Fairgate offen*; Löschung leert ihn; Admin-Formular kann ihn nicht setzen; Suche in
  der Mitgliederverwaltung findet ihn.
- Tests der Anzeige-Funktion: mit Rufname, ohne Rufname, Rufname gleich Vorname, beide
  Namensformen, kurze Textform in `namenText`.
- E2E: Mitglied setzt Rufname im Profil → Begrüssung und CM-Teilnehmerliste zeigen ihn. Brief
  und Mitgliederverwaltung zeigen den amtlichen Namen.
- Screenshot auf Handy-Breite: Startseite, Profil, CM-Liste.

## Abhängigkeiten zu laufender Arbeit

- **#59 (Partnerwahl im Doppel)** läuft parallel. Wer später nach `dev` mergt, bringt die
  Partnerwahl auf die Rufname-Darstellung und die Suche auf den Rufnamen.
- **#43 (Mitgliederverwaltung)** läuft parallel und kann dieselben Dateien unter
  `src/lib/server/admin/` und `src/routes/verwaltung/mitglieder/` ändern. Konflikte beim Merge
  werden inhaltlich zusammengeführt.
- **Migration:** neue Spalte `rufname text` (leer erlaubt) in `mitglied`. Bringen parallele
  Branches eigene Migrationen, wird vor dem Merge die Nummer geprüft. Für E2E nimmt der Branch
  eine eigene Datenbank (`DATABASE_URL`), weil sich alle Worktrees sonst eine Datenbank teilen.

## Dem Umsetzer überlassen

- Name und Ort der Komponente und der Text-Funktion.
- Ob der Server die Namensteile pro Stelle einzeln oder über eine gemeinsame Auswahl liefert.
- Reihenfolge der Kacheln in *Meine Angaben*.
