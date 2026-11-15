[← ADR-Index](adr-index.md)

# ADR-013: Jeder gemeinsame Baustein hat einen festen Ort, ESLint und Prüfskripte halten die Struktur fest

**Status:** Entschieden · **Datum:** 2026-11-15 · **Issue:** #80

Entstanden im Abschluss des Refactorings (Schritt 25), entschieden vom Projektleiter am
15.11.2026 (E-106). Er hält das «Warum» fest, das sonst nur in der
[Refactoring-Analyse](../refactoring-analyse.md#8-entscheide) steht; die Nummern E-NN verweisen
auf deren Abschnitt 8, F-NN auf die beantworteten Fragen (9.2), B-NN auf die Befunde
(Abschnitt 3). Wie die Bausteine
heute aussehen: [arc42, Bausteinsicht](../arc42.md#5-bausteinsicht); was immer gilt: die
`CLAUDE.md`.

## Kontext

MyTCO ist in wenigen Wochen Session für Session gewachsen. Die Analyse vom 11.11.2026 fand den
Anwendungscode in gutem Zustand; die Wachstumsspuren waren Duplikate und fehlende gemeinsame
Bausteine, keine falsche Architektur: Hilfsfunktionen der Schnittstellen mehrfach oder am
falschen Ort, der Zusammenbau der Dienste über sechs Dateien verteilt, gegenseitige
Abhängigkeiten zwischen Server-Modulen, eine uneinheitliche Fehlerform, sechs Abruf-Module mit
je eigener Deutung der Antworten, der Anmelde-Wächter in jede Seite kopiert, ein einziges
Stylesheet (B-12 bis B-15, B-20, B-21, B-23). Das Refactoring (#80, 11. bis 15.11.2026, unter
Feature-Stopp) hat dafür das Zielbild umgesetzt.

## Optionen

Verworfen oder aus dem Refactoring herausgehalten wurde, was über die gemeinsamen Bausteine
hinausging. Die Spalte «Dafür» nennt den
Befund, den die Option angegangen wäre.

| Option | Dafür | Dagegen |
|--------|-------|---------|
| Stile in die einzelnen Bausteine | ein Stylesheet mit 2287 Zeilen (B-23) | widerspräche der Regel des Leitbilds, grosser Umbau mit Risiko fürs Aussehen (F-07, E-13) |
| Ein Werkzeug für die Struktur (toter Code, Zyklen) | Eigenbau-Prüfer statt vorhandener Werkzeuge (B-07) | neue Abhängigkeit; ESLint mit Bordmitteln reicht für die Richtung der Importe (F-05, E-11) |
| Der Wächter vereinheitlicht die Umleitungen | Umleitung in jede Seite kopiert (B-21) | **im Refactoring verworfen, nachholbar:** wäre eine Verhaltensänderung gewesen, die der Feature-Stopp nicht zuliess; der Wächter bildet das alte Verhalten nach, Abweichungen sind benannte Fälle (F-27, E-44). Das Vereinheitlichen lässt sich als eigene kleine Änderung nachholen |
| `admin/` aufteilen (Mitglieder, Rollen und Zugang, Löschung) | verwischte Modulgrenzen (B-14) | viel Bewegung ohne Verhaltensgewinn; sinnvoll erst, wenn `admin/` weiter wächst (F-06, E-12) |
| Die Doppel-Seite auf die Ablauf-Funktion | derselbe Ablauf in drei Baustufen (B-34) | `src/lib/cm/ablauf.ts` bräuchte eine Angabe «Folge je Wort» nur für diese eine Seite (E-51) |
| Ein Baustein «Feld» | Formularfelder überall von Hand verdrahtet (B-35) | fasst jedes Formular an und kann die Bedienung mit Screenreader verschlechtern; die Verdrahtung ist richtig und geprüft (F-14, E-20) |
| Die Profil-Seite trennen | sehr grosse Seiten (B-22) | drei unabhängige Teile, die sich nicht stören; brächte keine gemeinsame Logik, nur Bewegung im Diff (Analyse 7.1, alter Schritt 18) |
| Ein Bildvergleich der Oberfläche | Screenshots sind Nachweise, kein Vergleichsnetz (B-33) | bräuchte festen Datenbestand, eine feste Uhr in der App und einen eigenen Schritt; lohnt sich erst, wenn das Aussehen wieder häufig geändert wird (F-13, E-19) |
| Die Auslieferungskette mit aufräumen | gebaut, aber nie in echt gelaufen (B-02) | **im Refactoring unberührt (E-16); Sache von #39:** ein Nachweis-Lauf in der CI ist ein eigener Vorgang, wenn der Server da ist (F-10) |

## Entscheidung

Jeder Baustein, den mehrere Stellen brauchen, hat genau einen Ort; Struktur und Importrichtung
halten ESLint und die Prüfskripte unter `scripts/` fest, ohne Fremdpaket (E-11).

- **Server:** Antwort, JSON-Prüfung, Körper lesen, Standardantworten, «mit Sitzung» und
  «ändernd» kommen nur aus `src/lib/server/http.ts`; die Schnittstellen lesen die Zeit mit `jetzt`
  von dort (Zielbild 6.1 Punkt 1). Vier Fachdienste (Login, Passkey, Zugang der Verwaltung,
  E-Mail-Wechsel) und `getSitzung` setzen `new Date()` nur als Vorgabe, wenn keine Uhr
  hineingereicht wird; der Zeitgeber in `src/hooks.server.ts` reicht dem Löschlauf `new Date()`
  direkt (Beobachtung «Dauerregeln der `CLAUDE.md` sagen an fünf Stellen mehr als der Code»).
  Dienste, Mail- und Push-Versender und Bremsen entstehen nur in `src/lib/server/dienste.ts`,
  der obersten Schicht: Kein Modul unter `src/lib/server/` darf sie importieren (6.1 Punkte 2
  und 8). Dazu gilt die Regel der `CLAUDE.md`: Die Zeit kommt über die Dienste
  (`jetzt`), nie direkt aus `new Date()`.
- **Fehler:** eine Fehlerform `{ fehler, felder? }` und eine Liste der Fehlerwörter in
  `src/lib/fehler.ts`, die Server und Oberfläche teilen; Zusatzangaben nur, wo die Liste sie für
  ein Wort nennt (E-36).
- **Rechte:** Die Verwaltung prüft Rechte nur über `liest` und `schreibt` aus
  `src/lib/server/admin/rechte.ts` (E-28). Ihre Schnittstellen liegen je Thema in einer eigenen
  Datei mit eigener Liste; der Schutz hängt am Dateipfad (E-38).
- **Oberfläche:** Statuscodes deutet nur der Abruf-Baustein `src/lib/abruf.ts`; ein einzelner
  Abruf gibt `{ art }` zurück (E-50). Wohin die App ohne Sitzung, Rolle oder Bestätigung führt,
  steht in der Wächter-Tabelle `src/lib/login/waechter.ts`; sie bildet das Verhalten vor dem
  Umbau genau nach, Abweichungen sind benannte Fälle (E-44). Eine Aktion mit Rückfrage nutzt
  `Aktionsdialog` oder `src/lib/cm/ablauf.ts`; der Bestand von Hand bleibt, bis eine Seite ohnehin
  umgebaut wird (E-51).
- **Stile:** global unter `src/lib/design/`, in mehreren Dateien (E-13), die nur das
  Wurzel-Layout importiert, in fester Reihenfolge; ausgenommen `brief.css`, die nur der Briefdruck
  importiert (6.1 Punkt 7). Beweis für den Schnitt war das Zeichen für Zeichen gleiche gebaute
  Stylesheet.
- **Importrichtung:** `db` und `http` unten, darüber `login`, darüber die Themen; kein Thema
  importiert die Schnittstellen eines anderen. ESLint setzt das ohne Ausnahme durch; eine
  Ausnahme nur mit Entscheid des Projektleiters (E-94).
- **Bleibt, wie es ist:** deutsche Namen im Code (Analyse 6.3); `admin/` als ein Modul, die
  Profil-Seite als eine Datei, kein Baustein «Feld», kein Bildvergleich (siehe Optionen).
- **Auslieferungskette:** im Refactoring unberührt (E-16); ob und wie ihr Nachweis in die CI
  kommt, ist Sache von [#39](https://github.com/konstantinniedermann/tco-app/issues/39).
- **Format der Schnittstellen:** Interne Schnittstellen dürfen ihr Format ändern, wenn Server und
  Oberfläche im selben Merge mitziehen (E-18). Begründet war das damit, dass es weder Live noch
  fremde Nutzer der Schnittstellen gibt (F-12).
- **Migrationen:** Im Refactoring unverändert; sie werden unmittelbar vor dem ersten Live
  zusammengelegt, als eigener Vorgang (E-08), aufgenommen bei
  [#39](https://github.com/konstantinniedermann/tco-app/issues/39). Dieses Zusammenlegen ist die
  **einzige benannte Ausnahme** von der Dauerregel «Migrationen fügen nur hinzu» der `CLAUDE.md`
  (Entscheid E-08 des Projektleiters, bestätigt am 15.11.2026, E-106); danach gilt die Regel ohne
  Ausnahme.

Begründung: Ein grundlegendes Refactoring war nach der Analyse die falsche Grösse, richtig war
gezieltes Aufräumen an wenigen, klar benennbaren Stellen (Kurzfazit der Analyse). Ein Baustein
an einem Ort beseitigt die Duplikate, und eine Prüfung, die ihn verlangt, hält neue fern. Die
verworfenen Optionen hätten viel Bewegung, ein Risiko für Aussehen oder Bedienung oder eine
Verhaltensänderung gebracht.

## Konsequenzen

- Die Regeln stehen als Dauerregeln in der `CLAUDE.md`; ESLint (Importrichtung, kein Aufruf
  `fetch(…)` unter `src/`) und die Prüfskripte (`bauregel`, Reihenfolge der Design-Importe)
  melden Abweichungen in Hook und CI.
- Was sie nicht fassen, hält nur das Review: Die Bauregel liest Importe mit regulären Ausdrücken
  und prüft jede Datei für sich; Feldnamen in `felder` sind frei, und kein Typ bindet ein
  Fehlerwort an seinen Status (Beobachtungen «Bauregel: zwei benannte Grenzen …» und «Vertrag
  zwischen Server und Oberfläche …»).
- Von Hand bleiben die Doppel-Seite und die übrigen Formulare und Rückfragen der Verwaltung; die
  Zeilenzahl einer Seite ist kein Ziel. Die grossen Fachfunktionen der Clubmeisterschaft bleiben,
  weil sie fachlich dicht und gut getestet sind (Analyse 6.3).
- Keine neue Abhängigkeit, keine laufenden Kosten.

## Reevaluations-Trigger

- Das erste Live (`AUSLIEFERUNG_LIVE` steht auf `an`): Dann sprechen offene alte Apps mit einem
  neuen Server (Beobachtung «Offene App lädt nach einer Auslieferung nicht von selbst neu»); ob
  E-18 weiter gilt, ist neu zu entscheiden. Vorher die Migrationen zusammenlegen (E-08).
- Ein neues Thema ausserhalb von Clubmeisterschaft und Verwaltung braucht eine Aktion mit
  Rückfrage, die zu keinem der zwei Abläufe passt.
- `admin/` wächst weiter, oder die Profil-Seite bekommt einen vierten Teil.
- Das Aussehen wird wieder häufig geändert (Bildvergleich), oder eine Lücke der Struktur-Prüfung,
  die ESLint mit Bordmitteln nicht schliesst, richtet Schaden an (Paketvorschlag nach E-11).
