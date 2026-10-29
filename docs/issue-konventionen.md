[← Übersicht](index.md)

# Issue-Konventionen

Wie GitHub-Issues in diesem Repo beschriftet und einsortiert werden. Ziel: auf einen
Blick sehen, **was** ein Issue ist, **wo** es hingehört, **wie dringend** es ist und
**wann** es dran ist. Gilt für manuell und KI-erstellte Issues gleichermassen.
Übernommen aus Munica, angepasst an MyTCO.

## Grundprinzip: Labels in vier Dimensionen + ein Milestone

| Dimension | Anzahl | Werte |
|-----------|--------|-------|
| **Typ** — was für eine Änderung? | genau 1 | `bug` · `enhancement` · `refactor` · `documentation` · `chore` |
| **Bereich** — wo im System? | 1 oder mehr | `app` · `admin` · `backend` · `architektur` · `infra` · `security` · `verein` |
| **Priorität** — wie dringend? | genau 1 | `P0` · `P1` · `P2` |
| **Status** — Sonderzustand? | 0 oder mehr | `blocked` · `needs-input` · `win` · `verein-feedback` |
| **Milestone** — welche Etappe? | genau 1 | siehe [Roadmap](roadmap.md) |

## Typ (folgt dem Titel-Präfix)

| Titel-Präfix | Typ-Label | Bedeutung |
|--------------|-----------|-----------|
| `fix:` | `bug` | Etwas ist kaputt und soll repariert werden |
| `feat:` | `enhancement` | Neue Funktion oder Erweiterung |
| `refactor:` / `perf:` | `refactor` | Umbau **ohne** Verhaltensänderung |
| `docs:` | `documentation` | Nur Dokumentation |
| `chore:` / `ops:` / `test:` | `chore` | Wartung, Infrastruktur, Tests, Tooling |

Faustregel: Merkt ein Mitglied oder Admin in der App einen Unterschied? → `bug` oder
`enhancement`. Reine Werkstattarbeit? → `refactor` oder `chore`. Reiner Text? → `documentation`.

## Bereich (mindestens ein Label)

| Label | Umfasst |
|-------|---------|
| `app` | Mobile-App für Mitglieder (Android, iOS), Push-Benachrichtigungen |
| `admin` | Admin-Oberfläche: Mitgliederverwaltung, Clubmeisterschaft, Lizenzlisten |
| `backend` | Server, Schnittstellen, Datenbank, Geschäftslogik |
| `architektur` | Übergreifende Konzepte: Fachmodell, ADRs, arc42 |
| `infra` | Hosting, CI/CD, Deployment, Store-Releases, Backups, Monitoring |
| `security` | Login, Rechte, Datenschutz-Technik, Supply-Chain |
| `verein` | Absprachen mit dem Verein, Anforderungen, Kosten, Konten, Recht |

## Priorität (genau ein Label)

| Label | Bedeutung |
|-------|-----------|
| `P0` | Blockiert den Live-Betrieb — sofort |
| `P1` | Muss vor dem Termin des aktuellen Milestones erledigt sein, **und** bei Nichterledigung entsteht Schaden (Mitglied sieht Falsches, Termin des Vereins platzt, Daten in Gefahr) |
| `P2` | Alles andere — auch Wichtiges ohne Termin |

Issues in *Backlog / Optional* sind per Definition `P2`. „Wichtig" allein macht kein P1.
Sind mehr als etwa ein Drittel der offenen Issues `P1`, ist eine Triage fällig.

## Status (optional)

| Label | Bedeutung |
|-------|-----------|
| `blocked` | Wartet auf ein anderes Issue oder einen externen Auslöser. **Der Body nennt, worauf** (`Blocked by: …`) |
| `needs-input` | Braucht eine Entscheidung des Projektleiters oder des Vereins, die keine KI liefern kann |
| `win` | Hoher Nutzen bei geringem Aufwand — Kandidat zum Vorziehen |
| `verein-feedback` | Stammt aus einer Rückmeldung oder Sitzung mit dem Verein |

## Milestones = Etappen

Jedes offene Issue sitzt in **genau einem** Milestone; die Etappen mit Termin und Umfang
stehen in der [Roadmap](roadmap.md). Was keinen Termin hat, kommt nach *Backlog / Optional*.

## Definition of Done

Jedes Issue enthält eine Checkliste, woran man erkennt, dass es fertig ist — nicht „Code
geschrieben", sondern „was ist danach nachweislich wahr" (Tests grün, Verhalten sichtbar,
Dokument freigegeben, Doku nachgeführt).

## Abhängigkeiten

Im Body notieren:

```
Blocked by: #12     (dieses Issue wartet auf #12)
Blocks: #34         (dieses Issue hält #34 auf)
Verwandt: #56       (gehört inhaltlich dazu, blockiert aber nicht)
```

Beim Schliessen prüfen, ob dadurch andere Issues frei werden, und dort `blocked` entfernen.

## Abklärungen beim Verein

Der Projektleiter kann Vorstand, Website-Betreuer, Hoster der Website und die
Verantwortlichen von Clubmeisterschaft und Lizenzen jederzeit fragen. Deshalb gilt für
jedes Issue mit einer Entscheidung oder einer Annahme über den Verein:

- Vor der Entscheidung prüfen, ob eine Rückfrage Bedürfnisse schärft, Kosten feststellt
  oder eine Vermutung ersetzt.
- Wenn ja, die Frage in [`abklaerungen.md`](abklaerungen.md) mit ID, Ansprechperson und
  Fälligkeit eintragen und im Issue auf die ID verweisen (`Abklärung: K-09`).
- Entscheidungen, die ohne Antwort getroffen werden, nennen die offene Frage als Annahme
  und als Reevaluations-Trigger.

## Datenschutz

Das [Datenschutzkonzept](datenschutz.md) ist Grundlage für jede Funktion. Jedes Issue, das
Personendaten neu erhebt, anders verwendet, anderen zeigt, an einen neuen Empfänger gibt,
länger aufbewahrt oder eine Vorgabe `DS-NN` berührt, passt **vor** der Umsetzung das
Konzept und die Datenschutzerklärung an
([Änderungen am Konzept](datenschutz.md#änderungen-an-diesem-konzept)). Die Definition of
Done enthält dann den Punkt *Datenschutzkonzept und Datenschutzerklärung nachgeführt*.
Betrifft ein Issue keine Personendaten, steht das im Abschnitt *Datenschutz* der Vorlage
in einem Satz.

## Befunde ausserhalb des Scopes

Nicht jeder Befund wird ein Issue. Trivial-Fixes werden mitgemacht, alles andere kommt
nach [`beobachtungen.md`](beobachtungen.md). Ein Issue entsteht nur auf ausdrückliche
Zustimmung (Regel in der übergeordneten `CLAUDE.md`).

## Kurz-Checkliste beim Anlegen

1. **Titel** mit Präfix
2. **1 Typ-Label** passend zum Präfix
3. **≥ 1 Bereich-Label**
4. **1 Prioritäts-Label**
5. ggf. **Status-Label(s)**
6. **1 Milestone**
7. Body mit **Kontext**, **Definition of Done** und **Abhängigkeiten**
8. Prüfen, ob eine [Abklärung beim Verein](#abklärungen-beim-verein) nötig ist
9. Prüfen, ob das [Datenschutzkonzept](#datenschutz) angepasst werden muss
