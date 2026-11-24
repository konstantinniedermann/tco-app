# CI schneller bis Test — Entwurf (kurz)

Freigegeben vom Projektleiter am 24.11.2026 («los»).

## Ziel und Grund

Ein Merge mit Code auf `dev` soll in rund 5½ statt 11 Minuten auf Test sein. Actions-Minuten
spielen keine Rolle, das Repo ist öffentlich (ADR-010). Der Schutz bleibt: Ausgeliefert wird nur,
was in allen Prüfungen grün ist.

Nicht Ziel: lokale Prüfung (`make check`) kürzen (Weg B) oder den zweiten Lauf auf `dev` sparen
(Weg C); beides später abwägen.

## Ausgangslage (Lauf 45391979705, Merge mit Code)

Kritischer Pfad: E2E iPhone 8:54 (davon ~1:20 Vorlauf: Container, `npm ci`), danach `bauen` 1:10,
`ausliefern` 0:36, `freigeben` 0:05. Android 5:50, Desktop 4:50, `pruefen` 3:42, `image` 1:42.

## Ansätze

- **A (gewählt): CI parallel.** E2E je Gerät in Teile (Playwright `--shard`), `bauen` startet
  sofort, `ausliefern` wartet ausdrücklich auf alle Prüfungen.
- B: lokal E2E und Image weglassen — Fehler zeigte sich erst auf `dev`, Test bliebe stehen.
- C: grüner Branch-Lauf ersetzt den Lauf auf `dev` — aufwendig, bei diesem Umfang nicht lohnend.

## Entscheide

- Teile: iPhone 3, Android 2, Desktop 1. Jeder Teil baut die App selbst (eigener Runner, eigene
  Datenbank und Mailpit). Verteilt wird nach Datei (`fullyParallel` bleibt aus), damit die
  Reihenfolge in einer Datei bleibt.
- Jobnamen «E2E (iphone 1/3)», Artefakte `test-results-iphone-1` usw. Die Pflichtprüfungen des
  Rulesets auf `main` nennen keine E2E-Jobs; nichts bricht.
- `bauen` hängt nur noch an `aenderung`; Bedingungen (Push auf `dev`, Code, `AUSLIEFERUNG_TEST`)
  bleiben. Folge: Das Image eines roten Stands liegt in der privaten Ablage, wird aber nie
  ausgeliefert, bekommt kein `code-`-Kennzeichen und fällt beim Aufräumen nach der nächsten
  Auslieferung weg. Vom Projektleiter so angenommen.
- `ausliefern` braucht `doku`, `pruefen`, `e2e`, `malware`, `image` in `needs` und verlangt im
  `if` je `result == 'success'`. Das erzwingt `workflow-rechte.ts` (neue Regel), sonst könnte
  der Wegfall der Prüfungen vor `bauen` später still eine Lücke öffnen.
- `finden` (Live) bleibt unverändert hinter allen Prüfungen.
- Den Job `image` nicht mit `bauen` zusammenlegen: Er läuft auch bei PRs, dort ohne Schreibrecht.

## Nachweis

`workflow-rechte`-Tests rot → grün; ein Handstart der CI auf dem Branch (liefert nie aus) mit allen
Teilen grün und Dauer je Teil; nach dem Merge der erste Lauf auf `dev` bis «Freigeben» grün, mit
Gesamtdauer.
