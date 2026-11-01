# Beobachtungen

Posteingang für Befunde, die **kein eigener Vorgang** sind: Dinge, die beim
Arbeiten an etwas anderem auffallen, aber weder in den laufenden Scope gehören
noch für sich genommen ein GitHub-Issue rechtfertigen.

**Warum die Datei existiert:** Ohne sie gibt es nur zwei Ablagen — „jetzt erledigen"
oder „Issue anlegen". Alles dazwischen wird zwangsläufig zum Issue, und die
Issue-Liste wächst schneller, als sie abgearbeitet werden kann (Erfahrung aus
früheren Projekten). Diese Datei ist die dritte Ablage.

## Wie sie benutzt wird

**Eintragen** (Claude, ohne Rückfrage): Ein Befund, der Regel 3 der
übergeordneten `CLAUDE.md` nicht erfüllt, kommt hier als kurzer Eintrag rein.
Kein Definition of Done, kein Milestone, keine Labels.

Form eines Eintrags:

```markdown
### JJJJ-MM-TT — Titel, der den Befund in einem Satz sagt

**Thema:** Kurzes Stichwort

**Fundort:** Datei, Symbol, Seite — worauf sich der Befund bezieht.

**Beobachtung:** Was auffiel.

**Ursprung:** Woraus der Befund fiel (Issue, Release, Session).

**Einschätzung:** Erste Bewertung — ausdrücklich vorläufig.
```

**Das Thema wird wiederverwendet, nicht erfunden.** Vor dem Schreiben:

```bash
sed -n '/^## Offen/,$p' docs/beobachtungen.md \
  | grep '^\*\*Thema:\*\*' | sort | uniq -c | sort -rn
```

Gibt es das Stichwort schon, wird genau dieses genommen. Beschreibt ein
bestehender Eintrag denselben Befund aus derselben Ursache, wird **dort
ergänzt** statt neu angelegt. Der Zweck ist nicht Ordnung, sondern Sichtbarkeit:
Häufungen sollen beim Eintragen auffallen und nicht erst bei der Auswertung.

**Auswerten** (gemeinsam, in Ruhe): über den Skill `beobachtungen-auswerten`.
Er verifiziert jeden offenen Eintrag am aktuellen Stand des Repos, bevor
entschieden wird — ein Eintrag ist eine Behauptung, kein Befund. Danach bekommt
jeder Eintrag genau einen von sechs Ausgängen:

| Ausgang | Bedeutung |
|---------|-----------|
| **Verworfen** | Die Behauptung trifft nicht zu. Eintrag wandert mit **Gegenbeleg** ins Archiv — der Beleg verhindert, dass derselbe Fund wiederkommt |
| **Abhaken** | Trifft zu, wir tun bewusst nichts. Mit Begründung, und wo sinnvoll mit **Reevaluations-Trigger** („kommt zurück, wenn …") |
| **Mitmachen** | Trivial-Fix, sofort erledigt, eigener Commit |
| **Doku / Regel / Memory** | Erkenntnis ohne Vorgang — ADR, arc42, `CLAUDE.md` oder Memory |
| **Vereinsthema** | Braucht eine Entscheidung oder Auskunft des Vereins → offener Punkt für die nächste Sitzung in `docs/abklaerungen.md` |
| **Issue** | Erfüllt Regel 3 der `CLAUDE.md`. Neu, an ein bestehendes angehängt, oder mehrere gebündelt — nur auf ausdrückliche Zustimmung |

**„Abhaken" ist ein vollwertiges Ergebnis und ausdrücklich der Normalfall.** Ein
Eintrag, der monatelang unangetastet bleibt, hat sich damit selbst beantwortet.

**Es gibt keinen automatischen Auslöser.** Wann ausgewertet wird, entscheidet
der Nutzer. Der Skill `session-wrap-up` nennt am Session-Ende nur die Zahl der
offenen Einträge und das Datum der letzten Auswertung — als Information, nicht
als Empfehlung.

### Bleibt ein Eintrag nach einer Auswertung offen

Dann trägt er, was die Verifikation ergeben hat:

```markdown
**Verifiziert:** TT.MM.JJJJ gegen vX.Y.Z-prod — belegt
(`pfad/zur/datei` → `symbol`, kurze Begründung).
Offen ist nur die Entscheidung, ob …
```

Die nächste Auswertung verifiziert einen solchen Eintrag **nicht neu**. Sie
prüft nur, ob sich an den im Beleg genannten Pfaden seither etwas bewegt hat
(`git log --since='<Datum> 00:00' -- <pfade>`); ist dort nichts passiert, gilt
der Beleg weiter.

**Die Uhrzeit gehört zwingend dazu.** `--since=2026-08-30` heisst für git nicht
„seit Mitternacht", sondern „seit dem 30.08. um die jetzige Uhrzeit" — taggleiche
Commits fallen still heraus, und das Ergebnis ist eine leere Ausgabe, die aussieht
wie „nichts hat sich bewegt". Taggleich ist hier der Normalfall, weil Auswertung
und Folgelauf oft am selben Tag liegen. Wo ein Commit-Ref vorliegt, ist
`git log <ref>..HEAD -- <pfade>` die robustere Form.

Drei Bedingungen, ohne die das Feld nicht zählt und die volle Verifikation
wieder greift:

- **Es setzt nur die Auswertung, nie das Eintragen.** Ein frischer Eintrag hat
  kein `Verifiziert`-Feld — er ist unverifiziert, und genau das soll man sehen.
- **Es braucht eine Fundstelle**, auf die `git log` zeigen kann: Datei und
  Symbol, oder ein Kommando mit Ausgabe. Ein Beleg ohne Fundstelle zählt nicht.
- **Einträge vom Typ „Abwägung" bekommen keines.** Wo keine Tatsachenbehauptung
  steht, kann auch nichts veralten — dort ist die offene Entscheidung der ganze
  Inhalt. Hat die Verifikation dort trotzdem **Fakten korrigiert**, steht das als
  Absatz `**Korrektur (TT.MM.JJJJ, Beobachtungs-Auswertung).**` im Eintrag: Er trägt
  dieselbe Belegpflicht wie ein `Verifiziert`-Feld, taugt aber nicht als Abkürzung für
  den nächsten Lauf — die Entscheidung bleibt in jedem Fall zu treffen.

Zwei Regeln, die sich in den Auswertungen als tragend erwiesen haben:

- **„Notieren" ist kein Ausgang.** Es klingt nach Entscheidung, ist aber
  Vertagung, und genau daran wächst die Datei. Wo etwas später wieder relevant
  wird, ist der richtige Ausgang „Abhaken **mit Trigger**".
- **Erledigtes wird eingedampft** und wandert ins Archiv: eine Zeile mit Ausgang
  und Verweis; die Begründung lebt dort, wo sie hingehört (Issue-Body, Commit,
  Memory). Ausnahme sind verworfene Einträge — die behalten ihren Gegenbeleg.

---

## Offen

### 2026-11-01 — Testgruppe: Handymodell in der Fragen-Tabelle, Löschzeitpunkt fehlt

**Thema:** Verein

**Fundort:** Fragen-Tabelle, Blatt *Wer ist wer*, Spalten D/E; `docs/abklaerungen.md` (Wer ist wer, K-20).

**Beobachtung:** Neben dem Namen steht freiwillig das genaue Handymodell. Gebraucht wird nur, ob ein älteres Handy dabei ist. Die Tabelle kann jeder mit dem Link lesen. Wann die beiden Spalten wieder geleert werden, ist nicht festgehalten.

**Ursprung:** Review (`cas-reviewer`) zur K-20-Notiz; Spalte auf Wunsch des Nutzers eingeführt.

**Einschätzung:** Risiko klein, Name und Aufgabe stehen dort ohnehin. Denkbar: Spalten nach dem Release *Mitglieder-Login* leeren, oder statt Modell nur «älteres Handy ja/nein».

### 2026-11-01 — «Älteres Handy» für die Testgruppe nicht definiert

**Thema:** Verein

**Fundort:** `docs/abklaerungen.md` (K-20 / Wer ist wer), `docs/testkonzept.md` (Testgruppe).

**Beobachtung:** Ins Repo soll kommen, ob ein älteres Handy dabei ist, aber keine Grenze ist festgelegt. Gemeint ist vermutlich die iOS-Version, ab der Web Push klappt.

**Ursprung:** Review (`cas-reviewer`) zur K-20-Notiz.

**Einschätzung:** Festlegen, wenn die Antworten eingehen; gehört dann ins Testkonzept unter *Testgruppe*.
### 2026-11-01 — Für den Aufbau von Server und Auslieferung gibt es kein Issue

**Thema:** Arbeitsablauf

**Fundort:** `docs/ci-cd-und-release.md` (Abschnitt *Umgebungen*, „Wer baut die Auslieferung“); DoD von #15.

**Beobachtung:** #15 baut nur die CI-Prüfungen. Server, Test- und Live-Umgebung, Auslieferungs-Skript, Statusabfrage, Mindestversion und Tag-Job hat kein Issue; sie fallen zwischen #15 und #29 durch.

**Ursprung:** Review von #12 (cas-reviewer).

**Einschätzung:** Aufwand über eine Session, braucht Antworten zu K-04 und K-10 — Kandidat für ein Issue im Milestone *Mitglieder-Login*, sobald die Antworten da sind (nur mit Zustimmung des Projektleiters).

**Erledigt 2026-11-01:** Mit Zustimmung des Projektleiters als #32 angelegt (blocked by #6, #15; blocks #29). Bei der nächsten Auswertung ins Archiv.

### 2026-10-31 — Fragen-Tabelle spricht von «Anmelden», das Glossar verlangt «Login»

**Thema:** Verein

**Fundort:** Fragen-Tabelle an den Verein, Blatt «Vorstand»: K-02.1 («Anmeldecode», «bleibt angemeldet»), K-12.1 («Zwei-Faktor-Anmeldung»), K-16.1, K-16.3, K-21; Sprachregel in `docs/glossar.md` («Login statt Anmelden»).

**Beobachtung:** Das Glossar reserviert *Anmeldung* für die Teilnahme an CM oder Anlass. Die Tabelle verwendet für das Einloggen trotzdem «Anmelden» und «Anmeldecode», auch schon vor #29. In der Repo-Doku ist das seit #29 bereinigt, in der Tabelle nicht.

**Ursprung:** Review `cas-reviewer` zu #29 (Sprachregel), beim Anpassen der Tabelle bemerkt.

**Einschätzung:** Für Vereinsleute ist «Anmeldecode» verständlicher als «Login-Code». Zu entscheiden: Gilt die Sprachregel auch für Texte an den Verein, oder nur für App und Doku? Spätestens bei den Texten im Brief und in der App klären.

### 2026-10-30 — Impressum von tcolten.ch nennt eine frühere Finanzverantwortliche Person

**Thema:** Verein

**Fundort:** tcolten.ch/impressum, Abschnitt «Vertretungsberechtigte Personen».

**Beobachtung:** Das Impressum führt für Finanzen und Mitgliederverwaltung noch die frühere Person; laut Clubleitung und Projektleiter hat die Aufgabe inzwischen jemand anderes übernommen. Das Impressum stammt laut eigener Angabe von 2020.

**Ursprung:** Recherche für das Blatt «Wer ist wer» der Fragen-Tabelle.

**Einschätzung:** Sache des Vereins, nicht von MyTCO. Wird relevant, wenn die Datenschutzerklärung von MyTCO an tcolten.ch anschliesst (K-06); bei Gelegenheit dem Website-Betreuer melden.

### 2026-10-29 — Push-Auslöser sind nirgends festgelegt

**Thema:** Fachmodell

**Fundort:** `docs/adr/adr-001-web-app-zuerst.md` (Push-Auslöser), `docs/fachmodell.md`

**Beobachtung:** ADR-001 verweist für die Auslöser von Push-Nachrichten auf „das Fachmodell (#3) bzw. die Etappe CM-Betrieb“. Das Fachmodell kennt nur den Schalter am Konto und die Benachrichtigung des Doppelpartners; welche Ereignisse (neues Spiel, Resultat gemeldet, Spielplan geändert) eine Nachricht auslösen, steht nirgends.

**Ursprung:** cas-reviewer zu #3

**Einschätzung:** Gehört in die Planung der Etappe CM-Betrieb (A-ANMELDUNG-08); bis dahin unkritisch.

### 2026-10-29 — „Mermaid rendert“ lässt sich lokal nicht nachweisen

**Thema:** Doku-Check

**Fundort:** `scripts/check-docs.sh`, DoD-Punkt „Mermaid-Diagramm rendert“ in Doku-Issues

**Beobachtung:** `make check` prüft in Mermaid-Blöcken nur auf literales `\n`. Ob ein Diagramm rendert, war in #3 nur über den externen Mermaid-Chart-Validator nachweisbar; lokal ist kein `mmdc` installiert, der Reviewer konnte es nicht selbst prüfen.

**Ursprung:** #3, cas-reviewer

**Einschätzung:** Fürs Fundament mit wenigen Diagrammen tragbar; mit arc42 (#14) kommen mehr. Ein Render-Check bräuchte eine neue Abhängigkeit (Freigabe nötig).

### 2026-10-29 — Recherche-Seiten ohne Zeichensatz-Angabe, Schriften von Google

**Thema:** Doku-Darstellung

**Fundort:** `docs/recherche/2026-10-29-systemlandschaft.html` (Kopf); die Seite `2026-10-29-app-varianten-vorstand.html` hat seither ein `<meta charset="utf-8">`.

**Beobachtung:** Die Systemlandschaft-Seite hat weder `<!doctype html>` noch eine Zeichensatz-Angabe. Als lokale Datei geöffnet, kann ein Browser die Umlaute falsch darstellen. Beide Seiten laden Schriften von Google Fonts; beim Öffnen geht die IP-Adresse an Google.

**Ursprung:** Review durch `cas-reviewer` zur Vorstandsseite (Issue #7).

**Einschätzung:** Gering; im Artifact-Viewer kein Problem, weil dort der Zeichensatz gesetzt wird. Für Seiten, die an den Vorstand gehen, eventuell Systemschriften statt Google Fonts (Datenschutz-Optik).

### 2026-10-29 — Doku-Check prüft keine Anker in Markdown-Links

**Thema:** Doku-Check

**Fundort:** `scripts/check-docs.sh` (Prüfung „Relative Links in Markdown“).

**Beobachtung:** Der Check schneidet `#anker` ab und prüft nur, ob die Datei existiert. Links wie `datenschutz.md#änderungen-an-diesem-konzept` brechen still, wenn eine Überschrift umbenannt wird. Beim Kürzen des Datenschutzkonzepts fielen mehrere Anker weg; geprüft wurde nur von Hand.

**Ursprung:** Review durch `cas-reviewer` zu Issue #5.

**Einschätzung:** Gering bis mittel; mit wachsender Doku häufiger. Anker-Prüfung (GitHub-Slug aus Überschriften) wäre ein überschaubarer Ausbau des Skripts.

### 2026-10-29 — Skill tco-branching: Merge nach dev aus dem Worktree heraus wird geblockt

**Thema:** Arbeitsablauf

**Fundort:** `.claude/skills/tco-branching/SKILL.md`, Schritt 4 (`git -C $M …`).

**Beobachtung:** Solange die Session per `EnterWorktree` im Worktree ist, verweigert Claude Code Git-Befehle mit `-C` auf den Hauptordner. Für den Merge muss die Session zuerst `ExitWorktree` (keep) aufrufen; der Skill sagt das erst in Schritt 7.

**Ursprung:** Issue #5, Merge nach `dev`.

**Einschätzung:** Gering; ein Satz in Schritt 4 („vorher `ExitWorktree` mit `keep`“) würde den Fehlversuch vermeiden.

**Erledigt 2026-10-30:** Bei #8 erneut aufgetreten; Hinweis in Schritt 4 des Skills ergänzt (Trivial-Fix). Bei der nächsten Auswertung ins Archiv.

### 2026-10-30 — Vorstandsseite nennt Hosting noch als offen

**Thema:** Doku-Darstellung

**Fundort:** `docs/recherche/2026-10-29-app-varianten-vorstand.html`, Abschnitt *Budget und Kosten* und *Offene Fragen*.

**Beobachtung:** Die Seite schätzt Hosting auf CHF 60–300 pro Jahr, nennt das Metanet-Hosting als mögliche Variante und fragt, ob MyTCO dort laufen darf. Seit ADR-003 ist entschieden: Infomaniak VPS Lite, ca. CHF 110–230 pro Jahr; das Metanet-Webhosting kann keine Node-App betreiben.

**Ursprung:** Issue #8, Abgleich beim Wrap-up.

**Einschätzung:** Gering bis mittel — relevant, sobald die Seite im Gespräch mit dem Vorstand verwendet wird. Als datierte Entscheidungsgrundlage darf sie den alten Stand zeigen; dann ein Hinweis „Hosting inzwischen entschieden → ADR-003“ oder die Kostenübersicht (#9) als aktuelle Quelle.
