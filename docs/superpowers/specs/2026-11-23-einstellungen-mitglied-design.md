# Einstellungen eines Mitglieds in der Verwaltung — Design (kurz)

## Absicht
Der Mitglieder-Admin soll bei «bekomme nichts» oder «komme nicht rein» sofort sehen, wie ein
Mitglied seine Mitteilungen und Geräte eingestellt hat, und gezielt helfen können.

## Ziele
- Auf der Detailseite eines Mitglieds (Verwaltung) eine Karte «Einstellungen» mit dem **aktuellen
  Stand** aller Einstellungen, die das Mitglied selbst setzt und die auf dem Server liegen:
  - Themen der Mitteilungen (*Anlässe*, *Clubmeisterschaft*, *Verein*), je an/aus
  - Geräte (gültige Sitzungen): angemeldet am, zuletzt genutzt, Push an (seit …) oder aus
  - Passkeys: Gerätebezeichnung, eingerichtet am, zuletzt benutzt
- Später kommt die Zeile «Teams, denen es folgt» mit #81 Teil 3 dazu.

## Nicht-Ziele
- Kein Verlauf der Änderungen (Entscheid PL: nur aktueller Stand).
- Nichts, was nur auf dem Gerät liegt (Merker «Push-Hinweis abgelehnt»).
- Keine Push-Adresse, Schlüssel, Passkey-Kennungen.

## Rahmen
- Rechte wie die Detailseite: Mitglieder-Admin (schreibt), MyTCO-Admin (liest). Kein eigener
  Eintrag im Änderungsverlauf beim Öffnen (wie die Detailseite).
- Keine neue Datenart, keine Migration. `docs/datenschutz.md` und Datenschutzerklärung erhalten
  beim Zweck den Support («Hilfe bei Problemen, sichtbar für den Mitglieder-Admin»).

## Wege
- **A (gewählt):** `ladeMitglied` liefert die Einstellungen im bestehenden Detail mit; die Seite
  zeigt sie in einer neuen Klappe. Ein Abruf, keine neue Schnittstelle.
- B: eigene Schnittstelle — mehr Code und eine Liste mehr, ohne Nutzen.
- C: Auskunft (DS-07) nutzen — für das Mitglied gedacht, jedes Öffnen steht im Verlauf.

## Dem Bauenden überlassen
Aufbau der Klappe aus den Bausteinen des UI-Leitbilds (Tabelle mit Kopfzeile), Reihenfolge der
Geräte (zuletzt genutzt zuerst).
