# Mitteilungen an Gruppen: Clubmeisterschaft und Rollen — Entwurf

Issues: [#97](https://github.com/konstantinniedermann/tco-app/issues/97),
[#95](https://github.com/konstantinniedermann/tco-app/issues/95); schliesst den offenen Punkt
«Mitteilung zur CM» aus [#63](https://github.com/konstantinniedermann/tco-app/issues/63).
Baut auf dem Entwurf [Mitteilungen](2026-11-06-mitteilungen-design.md) auf (Ziele 6–12); was
dort entschieden ist, gilt weiter, wo hier nichts anderes steht.

## Absicht

Mitteilungen gehen heute nur an alle (Verein) oder nach der Antwort auf einen Anlass. Zwei Lücken:

1. **Clubmeisterschaft:** Der CM-Admin will die Spieler gezielt erreichen: an den Anmeldeschluss
   erinnern, wer spielen dürfte und sich noch nicht angemeldet hat; eine Regenverschiebung oder den
   Finaltag an die Angemeldeten einer Kategorie; wer im Doppel noch einen Partner sucht. Heute
   gibt es dafür nur Nachrichten an Einzelne oder eine Mitteilung des Mitglieder-Admins an alle.
2. **Funktionsträger:** Der Vorstand will die Inhaber einer Rolle erreichen, z. B. alle
   CM-Admins, ohne den ganzen Verein anzuschreiben.

## Ziele

- CM-Admin schickt auf der Seite eines Turniers eine Mitteilung an eine Empfänger-Auswahl, wahlweise
  auf eine Kategorie eingeschränkt, mit Vorschau, Rückfrage und Verlauf am Turnier.
- Mitglieder-Admin schickt auf der Seite *Mitteilungen* eine Mitteilung an alle Inhaber einer Rolle.

## Nicht-Ziele (später oder verworfen)

| Was | Wo es hingehört |
|-----|-----------------|
| Interclub: Mitteilung an die Spieler eines Teams, Teamliste von Hand | Runde 2, eigener Entwurf; wer pflegt (Spielleiter oder Lizenz-Admin) klärt der Projektleiter, Frage K-53 in `abklaerungen.md` |
| Gruppen nach Jahrgang (z. B. Seniorencup) | mit dem Einlesen aus Fairgate ([#46](https://github.com/konstantinniedermann/tco-app/issues/46)), wenn alle Mitglieder einen Jahrgang haben; dann Zweck im Datenschutz erweitern |
| Junioren / Eltern | mit [#45](https://github.com/konstantinniedermann/tco-app/issues/45) |
| «Lizenz nicht bestätigt» | mit [#53](https://github.com/konstantinniedermann/tco-app/issues/53) |
| «Hat MyTCO noch nie geöffnet» (aus #95) | verworfen (Entscheid Projektleiter, nicht gewählt) |
| Frei kombinierbare Filter (Baukasten) | verworfen, siehe Wege |
| Filter nach Geschlecht, Alter, Klassierung | verworfen (Entscheid Projektleiter, 06.11.): nur über die Spielberechtigung |
| «Wildcard beantragt» als Auswahl | nicht jetzt *(mein Vorschlag)*: über jeden Antrag entscheidet der CM-Admin einzeln, der Entscheid geht ohnehin als Meldung |

## Anti-Ziele

- Ein Mitglied bekommt eine CM-Mitteilung zu einer Kategorie, in der es nicht spielen darf, oder
  die Vorschau zählt anders als die Anmeldung rechnet. Darum dieselbe Passungsregel wie die
  Anmeldung (`src/lib/turnier/passung.ts`), keine zweite.
- Push oder Mail mit Daten anderer Mitglieder (DS-05): Hinweis im Formular wie heute.
- Ein Admin sendet ausserhalb seines Bereichs: Rechte nur über `liest`/`schreibt`.

## Wege (gewählt: 1)

1. **Bestehendes Mitteilungswerkzeug erweitern** *(gewählt, Entscheid Projektleiter)*: dritter
   Bezug *Turnier* mit eigener Auswahl und der Kategorie als Zusatz; beim Verein neue Auswahlen je
   Rolle. Vorschau, Weg, Rückfrage, Versand (`versand.ts`) und Verlauf bleiben. Baut auf dem
   Getesteten auf.
2. *Gruppen-Baukasten* mit kombinierbaren Filtern: flexibler, widerspricht dem Entscheid «keine
   Filter nach Geschlecht, Alter, Klassierung», Vorschau schwer verständlich; für vier Rollen und
   wenige CM-Gruppen zu viel.
3. *CM-Mitteilung je Kategorie-Seite*: passt nicht für turnierweite Mitteilungen
   («Finaltag verschoben»), Verlauf verstreut.

## Entscheide

### A — Mitteilung zur Clubmeisterschaft

1. **Wer, wo:** Der CM-Admin (Bereich `cm`) sendet auf der Verwaltungsseite des Turniers
   (`/verwaltung/turniere/[id]`); der MyTCO-Admin sieht Verlauf und Formular nur lesend (wie beim
   Anlass, *Ansicht als …*). Der Mitglieder-Admin hat hier nichts (Entscheid 06.11., Ziel 6).
2. **Wann:** Senden geht, solange das Turnier für Mitglieder sichtbar ist, also nicht im Status
   *in Vorbereitung*; sonst führt der Link ins Leere *(mein Vorschlag)*. Auch nach dem
   Anmeldeschluss (Spielplan, Finaltag).
3. **Thema:** *Clubmeisterschaft* (FR-41). Wer es abgeschaltet hat, fällt weg.
4. **Link** des Push und der Mail: die Seite dieses Turniers für Mitglieder
   (`/clubmeisterschaft/[id]`), nicht die Übersicht `/clubmeisterschaft` *(meine Entscheidung)*:
   Die Übersicht zeigt nur Turniere ab dem laufenden Jahr und führt bei zwei Turnieren auf eine
   Auswahl; die Turnierseite öffnet jedes Turnier, das nicht *in Vorbereitung* ist.
5. **Vorlagen** (Platzhalter beim Wählen gefüllt, danach frei änderbar; Sätze legt der Builder
   fest, Grenzen FR-42):
   - *Erinnerung*: «Clubmeisterschaft {Jahr}: Anmeldung bis {Anmeldeschluss}»
   - *Änderung*: «Clubmeisterschaft {Jahr}: Änderung, bitte in MyTCO nachsehen»
   - *Anmeldung offen*: «Clubmeisterschaft {Jahr}: Anmeldung ist offen bis {Anmeldeschluss}»
6. **Empfänger.** Grundmenge wie heute (`grundmenge` in `empfaenger.ts`): aktive Mitglieder, Konto
   nicht gesperrt und Thema an, oder ohne Konto. Dann genau eine Auswahl, dazu wahlweise eine
   Kategorie des Turniers (*alle Kategorien* vorbelegt). Abgesagte Kategorien stehen nicht zur
   Wahl und zählen nirgends.

   | Auswahl | ohne Kategorie | mit Kategorie X |
   |---------|----------------|-----------------|
   | *alle* | alle der Grundmenge | — (Kategorie nicht wählbar) |
   | *angemeldet* | in mindestens einer Kategorie angemeldet | in X angemeldet |
   | *spielberechtigt, noch nicht angemeldet* | in mindestens einer Kategorie berechtigt und in keiner angemeldet; wer noch Angaben fehlen hat, zählt mit | in X berechtigt und in X nicht angemeldet; wer Angaben fehlen hat, zählt nicht |
   | *Doppel: sucht Partner* | allein in einer Doppel-Kategorie angemeldet | allein in X angemeldet (nur bei Doppel-Kategorien wählbar) |

   - **Angemeldet** (Entscheid 06.11.): Anmeldung in der Kategorie, die nicht *zurückgezogen* oder
     *abgelehnt* ist, also *bestätigt* oder *beantragt*, allein oder als Paar.
   - **Spielberechtigt:** Einzel nach `passtEinzel` (Geschlecht, Jahrgang, Klassierung; nur mit
     Wildcard erreichbare Kategorien zählen nicht, Entscheid 06.11.); Doppel nach
     `passtDoppelAllein`. Der Entwurf vom 06.11. sagte «Doppel: nur das Geschlecht»; die
     Anmeldung prüft seit #59 Geschlecht und Klassierung. Es gilt die Regel der Anmeldung
     *(meine Entscheidung: eine Regel, nicht zwei)*.
   - Wer schon die Höchstzahl der Anmeldungen hat (FR-06, 3), fällt bei *spielberechtigt, noch
     nicht angemeldet* weg (Entscheid 06.11.).
   - **Sucht Partner:** Doppel-Anmeldung mit einem Spieler, aktiv (*bestätigt*).
   - Offene Partner-Anfragen zählen nirgends als Anmeldung (wie FR-06).
7. **Auswahl in Worten** (Verlauf, Rückfrage): z. B. «angemeldet · Damen R7–R9», «spielberechtigt,
   noch nicht angemeldet · alle Kategorien». Gespeichert wird die Kategorie als Text mit, damit der
   Verlauf auch nach einer Umbenennung stimmt *(mein Vorschlag)*.
8. **Vorschau mit Namen** wie heute: Namen anderer Mitglieder darf der CM-Admin sehen (RR-05).
9. **Verlauf** am Turnier: wie beim Anlass, 365 Tage (FR-45). Ein Turnier lässt sich nicht
   löschen, darum kein Mitlöschen.

### B — Mitteilung an eine Rolle

10. **Wer, wo:** Mitglieder-Admin auf der Seite *Mitteilungen* wie heute.
11. **Auswahl:** *alle* (wie heute) oder *alle mit Rolle …*: MyTCO-Admin, Mitglieder-Admin,
    CM-Admin, Lizenz-Admin; genau eine. Mitglieder ohne Konto haben keine Rolle und fallen weg.
12. **Thema** *Verein* gilt wie überall (Entscheid Projektleiter, 24.11.): Wer es abgeschaltet
    hat, bekommt auch Mitteilungen an seine Rolle nicht.
13. **Auswahl in Worten:** «alle mit Rolle CM-Admin».

### C — Datenschutz (vor dem Code)

- `docs/datenschutz.md`: Bei den Anmeldungen zur CM und bei Geschlecht, Jahrgang, Klassierung als
  Zweck ergänzen: «Empfänger von Mitteilungen zur CM auswählen (über die Spielberechtigung)».
  Bei den Rollen: «Empfänger von Mitteilungen an eine Rolle». Kein neues Datum, keine neue Frist.
- `docs/datenschutzerklaerung.md`, Abschnitt *Mitteilungen*: Auch der CM-Admin kann Mitteilungen
  zur Clubmeisterschaft schicken, ausgewählt nach Anmeldung und danach, ob du mitspielen darfst;
  der Mitglieder-Admin kann Mitteilungen an Inhaber einer Rolle schicken.
- DS-05 und FR-45 (Verlauf ohne Empfängernamen) gelten unverändert.

### D — Nachzuführen

- Fachmodell: FR-42 (Bezug Turnier, Absender CM-Admin), FR-43 (Auswahlen Turnier und Rolle).
- `docs/rollen-und-rechte.md`: neue Zeile «Mitteilung zur CM senden, Verlauf» (CM-Admin S,
  MyTCO-Admin L); Zeile *Verein* um Rolle ergänzen.
- Anforderungen N-APP-02, Änderungsprotokoll.
- Seiteninfo der Seiten *Mitteilungen* und *Turnier* (Regel aus #93): neuen Text dem
  Projektleiter zeigen.
- `docs/versionen.md` unter «Unveröffentlicht».

## Dem Builder überlassen

- Speicherung: Spalte(n) für Turnier und Kategorie in `mitteilung`, Check für den neuen Bezug;
  neue Migration (nur hinzufügen).
- Form der Auswahl im Körper (z. B. `auswahl` + `kategorieId`, oder zusammengesetzt) und ihre
  Prüfung; Fehlerwörter aus `src/lib/fehler.ts`.
- Ort der Schnittstellen (neue Liste unter `turnier`/`cm` oder in `mitteilung`), mit Eintrag in
  `tests/hilfen/verwaltungs-listen.ts` und der Tabelle der Bauregel, falls neu.
- Die genauen Vorlagensätze und die Beschriftungen.
- Aufbau des Formulars (`Mitteilungsformular` weiterverwenden, Kategorie-Auswahl nur bei
  passenden Auswahlen).

## Nachweis (Definition of Done)

- DB-Tests der Empfänger je Auswahl und Kategorie, inkl. Höchstzahl, fehlender Angaben, abgesagter
  Kategorie, Thema aus, gesperrtes Konto; Rollen-Empfänger.
- Rechte: CM-Admin sendet, Mitglieder-Admin nicht beim Turnier; MyTCO-Admin nur lesend; kein
  Senden in *in Vorbereitung*.
- E2E: CM-Admin schickt auf einer Turnierseite eine Mitteilung an eine Kategorie (Vorschau zeigt
  die Zahl); Mitglieder-Admin schickt an eine Rolle.
- Screenshot PC und Handy.
