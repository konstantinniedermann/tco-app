# Meldung an das Mitglied bei Änderung durch die Verwaltung — Entwurf (#94)

## Absicht

Ändert die Verwaltung etwas, das ein Mitglied betrifft, soll das Mitglied davon erfahren können,
z. B. «Die Verwaltung hat deine Telefonnummer geändert» oder «Du wurdest aus der Kategorie X
entfernt». Die Verwaltung entscheidet **pro Änderung** mit einem Häkchen «Mitglied
benachrichtigen» (Entscheid Projektleiter, 23.11.2026).

## Ziele

- Häkchen bei jeder Änderung der Verwaltung am Mitglied: Profil (Mitglieder-Admin), Rollen
  (MyTCO-Admin, Seite «Rollen»), Wiedereintritt und Rücknahme einer Löschung (Mitglieder-Admin),
  Anmeldungen zur CM (CM-Admin).
- Meldung wie FR-47: *Push, sonst E-Mail*, Themen (FR-41) gelten nicht, erst nach dem Speichern,
  ohne auf Push und Mail zu warten.
- Text nennt das geänderte Feld bzw. die Änderung, **nie den neuen Wert** (Push steht auf dem
  Sperrbildschirm); keine Namen anderer Mitglieder (DS-05, Ausnahme Doppel wie heute).

## Nicht-Ziele

- Keine Meldung bei Austritt oder Vormerken zum Löschen: Das Mitglied ist danach nicht mehr aktiv,
  Push-Abos und Sitzungen sind weg (Entscheid 23.11.2026). Die Meldungen an den Doppelpartner und
  bei hinfälligen Anfragen nach einem Austritt bleiben unverändert immer.
- Keine Einstellung pro Admin, kein späteres «jetzt benachrichtigen».
- Keine neue Meldung bei Briefen, Zugangscodes oder Sitzungen beenden.

## Vorgaben

- **CM:** Häkchen **vorbelegt** (heute wird immer gemeldet). Gilt für von Hand anmelden,
  verschieben, löschen, alle Doppel-Aktionen, Kategorie absagen (samt hinfälliger Anfragen) und
  Klassierung korrigieren. Bei einem Doppel gilt ein Häkchen für alle Beteiligten.
  **Ohne Häkchen:** der Entscheid über einen Wildcard-Antrag; er ist die Antwort auf den Antrag und
  wird immer gemeldet.
- **Profil, Rollen, Wiedereintritt:** Häkchen **leer** (Admin trägt oft nur nach, was das Mitglied
  selbst gemeldet hat).
- **E-Mail-Wechsel:** Der Hinweis an die alte Adresse bleibt Pflicht (SI-09), unabhängig vom
  Häkchen. Mit Häkchen kommt zusätzlich die normale Meldung (Push, sonst an die neue Adresse).
- Ändert ein Admin sich selbst, entfällt die Meldung (wie heute bei FR-47).
- Alle Profilfelder lösen mit Häkchen eine Meldung aus; mehrere geänderte Felder ergeben **eine**
  Meldung.

## Ansätze

1. **Gewählt — Angabe in der bestehenden Anfrage:** Jede schreibende Schnittstelle nimmt ein
   freiwilliges `benachrichtigen` (Wahrheitswert) im JSON-Körper. Fehlt es, gilt der Standard des
   Bereichs (CM: ja, sonst: nein); ein anderer Typ ist ein Eingabefehler. Die Fachfunktion bleibt
   ohne HTTP und gibt wie heute zurück, was sich geändert hat; die Schnittstelle meldet danach.
2. Verworfen — zweite Anfrage «jetzt benachrichtigen»: zwei Schritte, der zweite kann verloren
   gehen; widerspricht «eine Route, eine Schnittstellen-Funktion».
3. Verworfen — Einstellung pro Admin: widerspricht dem Entscheid «pro Änderung».

## Texte (Vorschlag, knapp)

| Anlass | Titel | Text | Link |
|---|---|---|---|
| Profil | Dein Profil | Die Verwaltung hat deine Telefonnummer und Adresse geändert. | `/profil` |
| Rolle vergeben | MyTCO | Du hast neu die Rolle «CM-Admin». | Startseite |
| Rolle entzogen | MyTCO | Deine Rolle «CM-Admin» wurde entfernt. | Startseite |
| Wiedereintritt / Rücknahme | MyTCO | Dein Zugang zu MyTCO ist wieder offen. | Startseite |
| CM | Clubmeisterschaft | Texte wie heute | wie heute |

Feldnamen in der Meldung wie die Beschriftungen im Formular der Verwaltung.

## Oberfläche

- Profil des Mitglieds (Verwaltung): Häkchen über dem Speichern-Knopf.
- Rollen, Wiedereintritt, Rücknahme, CM-Aktionen: Häkchen im `Aktionsdialog` der Aktion bzw. in
  der bestehenden Rückfrage; nur Tokens und Bausteine aus `docs/ui-leitbild.md`.
- Seiteninfo der betroffenen Seiten prüfen und neuen Text dem Projektleiter zeigen.

## Datenschutz

Neue Meldungen gehen nur an das betroffene Mitglied selbst, über Daten, die es schon hat. Vor dem
Bau `docs/datenschutz.md` (Meldungen der Verwaltung) und `docs/datenschutzerklaerung.md`
(Abschnitt Mitteilungen/persönliche Meldungen) nachführen.

## Dem Bauenden überlassen

- Name der neuen Regel im Fachmodell (FR-56) und Nachführen von FR-47.
- Wie die Schnittstellen den Standard je Bereich lesen (gemeinsame Hilfe in `http.ts` o. ä.).
- Wo im Code die Texte entstehen (bei den Meldungen der CM, `verwaltung-meldung.ts`).
- Nachweis: DB-Tests je Schnittstelle (mit/ohne Häkchen, Selbständerung, E-Mail-Hinweis bleibt),
  E2E für Profil und eine CM-Aktion, echter Push lokal.
