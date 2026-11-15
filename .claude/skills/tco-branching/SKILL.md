---
name: tco-branching
description: 'Use when working on an issue in tco-app (MyTCO) or ending a session there — Worktree anlegen, Branch starten, nach dev mergen, Release dev → main, Branch und Worktree aufräumen, Issues schliessen. Triggers on "wir starten", "neues Issue anfangen", "Issue #", "Worktree", "Feature-Branch", "nach dev mergen", "Release", "dev nach main", "aufräumen", "wrap up", "Session beenden", "pushen". Nur für tco-app.'
---

# tco-branching — Ablauf pro Issue und Release dev → main

Übernommen aus Munica (`munica-branching`), angepasst an tco-app. Die Dauerverbote
(nie direkt auf `main`, nie Squash, nie `reset --hard` auf `dev`, nie `git add -A`, Hauptordner
bleibt auf `dev`) stehen in `CLAUDE.md` und werden hier nicht wiederholt.

## Arbeitsmodell

- **Hauptordner** `/Users/KN/CAS/projekte/tco-app` steht immer auf `dev`. Dort wird nur
  gemergt und released — nie an einem Issue gearbeitet.
- **Jede Session** arbeitet an ihrem Issue in einem eigenen Worktree unter
  `/Users/KN/CAS/projekte/tco-app/.claude/worktrees/issue-NNN` (gitignoriert). So können
  mehrere Sessions parallel laufen, ohne sich Branch oder Dateien wegzunehmen.
- **Merges macht Claude**, nicht der Nutzer: Feature → `dev` sobald fertig. Ein Release
  `dev` → `main` nur mit ausdrücklicher Freigabe des Projektleiters für genau dieses
  Release. Immer Merge-Commit.

## Betrieb mit Subagenten (Orchestrator)

Läuft die Arbeit über Subagenten (z. B. beim Refactoring), gilt abweichend von «Pro Issue»:

- Die Orchestrator-Session bleibt im Hauptordner und wechselt nicht mit `EnterWorktree`
  in einen Worktree: Das sperrt die Subagenten aus.
- Sie legt den Worktree an (`git worktree add … -b <branch> origin/dev`) und nennt dem
  Subagenten Worktree und Branch als absoluten Pfad.
- Im Worktree laufen nur schlichte Git-Befehle: kein `git -C`, keine Schleifen oder
  Heredocs mit `git`, keine Skripte, die Git versteckt aufrufen. Texte für Commits und
  PRs über eine Datei (`-F`, `--body-file`).
- Der Subagent mergt und pusht nicht. Nach dem Ok des Reviews mergt der Orchestrator im
  Hauptordner wie in Schritt 4 und räumt Worktree und Branch sofort weg.
- E2E und `make check` im Hintergrund starten; im Vordergrund bricht der Lauf nach
  einigen Minuten ab.

## Pro Issue

**1 — Start (Session läuft im Hauptordner):**

```bash
M=/Users/KN/CAS/projekte/tco-app
[ "$(git -C $M rev-parse --is-shallow-repository)" = true ] && git -C $M fetch --unshallow origin
git -C $M fetch origin
git -C $M worktree add .claude/worktrees/issue-NNN -b <typ>/issue-NNN origin/dev
gh issue edit NNN -R konstantinniedermann/tco-app --add-label in-arbeit
```

Shell-Variablen wie `M` überleben zwischen zwei Bash-Aufrufen nicht: jeden Block als einen
Aufruf ausführen (er setzt `M` selbst), einzelne Befehle mit ausgeschriebenem Pfad.

Bei mehreren Issues in einem Branch (`issue-1-2`) das Label für jedes Issue setzen.

`<typ>` folgt dem Issue-Präfix (`feat`, `fix`, `docs`, `chore`). Mehrere Issues in einem
Branch: `docs/issue-1-2`. Danach **mit dem Tool `EnterWorktree` und `path`** in den Worktree
wechseln — nicht mit `name`: Ein neuer Worktree über `name` zweigt von `origin/main` ab,
nicht von `origin/dev`. Ab da gelten Pfade relativ zum Worktree; der Hauptordner wird bis
zum Merge nicht angefasst. Einmal pro Worktree `make hooks` ist nicht nötig — die
Git-Konfiguration (`core.hooksPath`) gilt für alle Worktrees.
Wer Code ändert: im neuen Worktree `npm ci --ignore-scripts` (Hooks brauchen `node_modules`;
`make check` zusätzlich Docker Desktop). Für `make dev` und `make seed` braucht der Worktree eine
eigene `.env` (`cp .env.example .env`); sie ist gitignoriert und fehlt in jedem neuen Worktree.
Alle Worktrees teilen die lokale Datenbank `mytco` für `make dev`, `make dev-handy` und
`make seed`; `make seed` spielt dort die Migrationen des eigenen Branches ein (`make dev` nicht:
vorher einmal `make seed`). Eine Migration, die schon eingespielt wurde, wird darum nie neu
erzeugt — eine Änderung kommt als neue Migration dazu.

**E2E und `make check` nehmen `mytco` nicht:** `npm run e2e` (`scripts/e2e.ts`) legt für jeden
Lauf eine eigene, frisch migrierte Datenbank an und löscht sie danach; ebenso baut jeder Lauf in
einen eigenen Ordner unter `.e2e-build/`. Parallele Läufe stören sich darum nicht über die
Datenbank, und ein anderer Build im selben Worktree verändert den laufenden Testserver nicht.
Screenshots entstehen immer auf frischem Stand. Den
Mail-Fänger Mailpit und den Ordner `test-results` teilen sie weiter: Im selben Worktree nicht
gleichzeitig `make check` und einen Push mit voller Prüfung laufen lassen. Verbietet eine
Migration alte Werte (z. B. eine Rolle aus einem Check entfernt), scheitert nur noch `make seed`
paralleler Branches an `mytco`; wer sie baut, warnt die parallelen Sessions.

**2 — Arbeiten:** TDD bzw. Doku, Dateien einzeln stagen, committen, Branch pushen
(`git push -u origin <typ>/issue-NNN` — löst kein Deploy aus). Spec- und Plan-Dateien
gehören in den Feature-Branch. Zieht `dev` weiter: `git merge origin/dev` im Worktree.
Der Branch schreibt seinen Eintrag unter «Unveröffentlicht» in `docs/versionen.md`, bei Code
Pflicht (der Pre-Push-Hook verlangt ihn beim Merge), bei reiner Doku freiwillig: ein bis drei
Zeilen, was sich für die Nutzerin ändert; bei Innerem «An der App ändert sich nichts»; die
Issue-Nummer, wo es eine gibt. Eine Versionsnummer setzt der Branch nie.

**3 — Review:** `make check` grün, Agent `cas-reviewer`, Befunde klären. `make check` zuletzt
auf dem fertigen, committeten Stand laufen lassen: Dann merkt es sich den Stand, und die
Pushes des Branches und des Merge-Commits auf `dev` prüfen nicht noch einmal voll
(`docs/ci-cd-und-release.md`, «Grüner Stand»).

**4 — Nach `dev` mergen (im Hauptordner):** Vorher den Worktree mit `ExitWorktree` (`keep`)
verlassen — aus dem Worktree heraus verweigert Claude Code Git-Befehle auf den Hauptordner.
Dann prüfen, ob der Hauptordner frei ist:

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M status --short                          # muss leer sein
git -C $M rev-parse -q --verify MERGE_HEAD        # muss leer sein
```

Erst wenn beide Prüfungen leer sind, mergen — ohne Commit, damit ein fehlender Eintrag noch in
den Merge-Commit kommt:

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M pull --ff-only origin dev
git -C $M merge --no-ff --no-commit <typ>/issue-NNN
git -C $M diff --cached --name-only --no-renames HEAD | node $M/scripts/pruefungen/nur-doku.ts && echo nur-doku || echo code
git -C $M diff --cached HEAD -- docs/versionen.md   # der Eintrag des Branches
```

**Versionsnummer** (`docs/ci-cd-und-release.md#versionen`, ADR-012): Ein Merge nach `dev`
vergibt keine Nummer und fasst `package.json` und `package-lock.json` nicht an. Die Nummer
entsteht im Doku-Abgleich vor dem Release `dev` → `main` (Schritt 4a). Bei `code` muss der
Merge unter «Unveröffentlicht» in `docs/versionen.md` einen neuen Eintrag bringen (ausser dem
Merge des Abgleichs, der die Nummer setzt und «Unveröffentlicht» leert); hat der
Branch keinen geschrieben, einen kurzen ergänzen (Form wie in Schritt 2) und
`git -C $M add docs/versionen.md`. Bei `nur-doku` ist der Eintrag freiwillig. Dann
abschliessen:

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M commit --no-edit
git -C $M push origin dev
gh run list -R konstantinniedermann/tco-app --branch dev --limit 3   # CI grün?
```

Der Pre-Push-Hook (`version-merge.ts`) prüft jeden Commit der Hauptlinie von `dev` einzeln:
Bringt er Code und bleibt die Nummer, muss unter «Unveröffentlicht» mindestens eine nicht leere
Zeile stehen, die vorher dort nicht stand (ein umgeschriebener Eintrag zählt; blosses Löschen,
Leerzeichen und ein Eintrag in einem schon nummerierten Abschnitt nicht). Steigt die Nummer
(nur im Abgleich), dann um genau einen Schritt, mit ihrem Abschnitt zuoberst und leerem
«Unveröffentlicht». Reine Doku: keine Forderung. Was schon auf `main` liegt, prüft er nicht
(Realign nach dem Release). Darum immer `--no-ff`: Bei einem Fast-Forward müsste jeder
einzelne Commit mit Code einen Eintrag bringen.

Wird der Push abgewiesen, weil `origin/dev` inzwischen weitergezogen ist: nichts
zurücksetzen (kein Reset auf `dev`), sondern

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M pull --no-rebase --no-commit origin dev
```

Ein Konflikt kann nur noch in `docs/versionen.md` entstehen, wenn beide ihren Eintrag an
dieselbe Stelle geschrieben haben: beide Einträge behalten. Der fremde Eintrag kommt mit und
erfüllt die Prüfung für diesen Commit. Brachte der Pull einen Doku-Abgleich mit neuer Nummer,
verlangt der Hook für diesen Commit ein leeres «Unveröffentlicht»: den eigenen Eintrag in den
Abschnitt der neuen Nummer rücken. Stagen, `git -C $M commit --no-edit`, erneut pushen.
Dieser Rand ist selten: Liegt die Nummer des mitgebrachten Abgleichs schon auf `main`, kommt der
eigene Eintrag danach mit einem Doku-Commit zurück unter «Unveröffentlicht».

Ein Revert eines Merges mit Code braucht einen eigenen Eintrag unter «Unveröffentlicht»
(«… zurückgenommen»), sonst weist der Hook den Push ab.

**Dependabot-PRs** werden nicht auf GitHub gemergt, sondern wie ein Branch über diesen Schritt:
`git -C $M fetch origin`, dann `git -C $M merge --no-ff --no-commit origin/<branch des PR>` und
weiter wie oben, ohne Nummer: Wer mergt, schreibt unter «Unveröffentlicht» den Eintrag
«Abhängigkeiten aktualisiert». GitHub schliesst den PR nach dem Push von selbst
als gemergt. Ein Merge auf GitHub ginge am Hook vorbei.

Brachte der Merge eine geänderte `package-lock.json`, vor dem nächsten Push im Hauptordner
`npm ci --ignore-scripts` — sonst prüft der Pre-Push-Hook mit alten `node_modules` und wird rot.

**Direkt nach dem Merge aufräumen, nicht erst nach dem Release.** Der Worktree und der Branch
haben nach dem Merge keinen Zweck mehr. Das gilt auch, wenn in der Definition of Done noch
etwas offen ist; Nacharbeit läuft in einem neuen Worktree ab `origin/dev`.

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M worktree remove .claude/worktrees/issue-NNN
git -C $M branch -d <typ>/issue-NNN
git -C $M push origin --delete <typ>/issue-NNN
```

Das gilt für jeden Worktree der Session, egal wie er heisst (`issue-…`, `beobachtungen-…`,
Release-Branch). Scheitert `worktree remove` an Dateien: ansehen. Reine Caches
(`__pycache__` u. ä.) mit `--force` verwerfen, alles andere committen, erneut mergen, dann
entfernen.

**Label nach dem Merge:**

| Was in der Definition of Done noch offen ist | Label |
|---|---|
| nichts, das Issue wartet nur aufs Release | `in-arbeit` bleibt bis zum Schliessen (Schritt 7) |
| Nacharbeit, die diese Session gleich im neuen Worktree macht | `in-arbeit` bleibt |
| Punkte, die auf Äusseres warten (Freigabe, Server, Verein, anderes Issue) | `in-arbeit` entfernen, `blocked` (mit `Blocked by:` im Body, im anderen Issue `Blocks:`) bzw. `needs-input` setzen, im Issue kommentieren, was offen ist |

**Hauptordner besetzt** heisst: `status --short` zeigt etwas oder `MERGE_HEAD` existiert. Dann
einige Minuten (Richtwert 5) wiederholt prüfen, nichts anfassen. Bleibt er besetzt: anderes
erledigen (Wrap-up, Doku) und später erneut versuchen. Am Session-Ende noch besetzt: Branch
ist gepusht, den Merge im Bericht als offen nennen. Auf eine andere Session wird nie
unbegrenzt gewartet.

**Konflikt** beim Merge (oder beim Einmergen von `origin/dev`): selbst inhaltlich
zusammenführen, `make check`, im Bericht nennen. Den Nutzer nur bei einem echten inhaltlichen
Widerspruch fragen.

## Release `dev` → `main` (am Session-Ende, bewusste Entscheidung)

**Sobald Test und Live ausgeliefert werden** (Merge nach `dev` = Test-Umgebung, Merge nach `main` =
live mit Mitgliederdaten, `docs/ci-cd-und-release.md`): vor dem PR muss der Projektleiter die
Checkliste auf Test abgehakt und genau dieses Release freigegeben haben. Das Release vergibt
die Nummer: Der Doku-Abgleich (4a) setzt sie, bevor der PR entsteht (ADR-012). Sobald Test
läuft, ist die Regel neu anzusehen (Anlass in ADR-012: die Nummer zählt zum Image und müsste
vor der Checkliste stehen). Den Tag und den Text des GitHub-Release (alle Abschnitte seit dem
letzten Release) setzt die CI.

**Code, aber noch keine Live-Auslieferung** (`AUSLIEFERUNG_LIVE` nicht `an`): Ablauf wie oben,
ohne Marker in `docs/versionen.md`; kein Tag, kein GitHub-Release, auch nicht von Hand. Die Checkliste entfällt nur, solange auch
`AUSLIEFERUNG_TEST` aus ist; läuft Test schon, wird sie dort abgehakt
(`docs/ci-cd-und-release.md#versionen`). Freigabe des Projektleiters für genau dieses Release
trotzdem einholen.

**Nur Doku** (seit `main` keine Datei ausser Doku geändert, Regel aus `nur-doku.ts`): Ablauf
unten ohne Checkliste und ohne neue Nummer. Enthält das Release Code — auch Werkzeuge wie
Skripte oder Workflows —, setzt der Abgleich eine neue Nummer.

**4a — Doku-Abgleich (vor jedem Release, auch nur Doku):** im Worktree eines Release-Branches
ab `origin/dev` (`docs/release-<datum>`), Start wie Schritt 1, ohne Label. Bei einem Release mit
Code ist der Abgleich nie reine Doku: Er setzt die Nummer, sein Commit läuft durch
`make check-schnell`, sein Push ist ein Push mit Code (der grüne Stand lässt die Nummer aus,
`docs/ci-cd-und-release.md`, «Grüner Stand»).

1. Skill `doku-audit` über alle Domänen. Abweichend vom Skill **keine Issues**: Kleinigkeiten
   als eigener Commit (`docs: Doku-Abgleich vor Release …`), alles andere in
   `docs/beobachtungen.md`. Ein Befund, der Mitglieder, Vorstand oder Betrieb in die Irre
   führt oder blockiert, hält das Release auf, bis er behoben ist — übersteuern nur mit
   ausdrücklicher Freigabe des Nutzers.
2. **Nummer setzen** (nur bei einem Release mit Code:
   `git diff --name-only --no-renames origin/main...HEAD | node scripts/pruefungen/nur-doku.ts && echo nur-doku || echo code`).
   Die Stufe:
   - **Nebenversion** (`minor`, Korrektur zurück auf 0), wenn das Release für Mitglieder oder
     Verwaltung etwas spürbar Neues bringt;
   - **Korrektur** (`patch`), wenn es nur Fehler behebt oder Inneres und Werkzeug ändert;
   - **Hauptversion** (`major`) nur im Auftrag des Projektleiters (`1.0.0` ist für das Release
     «Mitglieder-Login» vorgesehen).

   Claude wählt nach dieser Regel und nennt Nummer und Grund in der Bitte um Freigabe; die
   Freigabe des Releases gilt auch für die Nummer. **Das erste Release nach ADR-012 trägt
   `0.23.0`**: Bei ihm ist `dev` der Nummer von `main` schon voraus, `make release-check`
   erkennt eine vergessene Nummer darum nicht. Dann
   `npm version minor --no-git-tag-version --ignore-scripts` (bzw. `patch` / `major`), in
   `docs/versionen.md` unter «Unveröffentlicht» einen Abschnitt `## X.Y.Z — <Kurztitel>` anlegen
   und alle Einträge aus «Unveröffentlicht» hineinschieben; «Unveröffentlicht» bleibt leer
   stehen. Bringt der Abgleich selbst Code mit (Kleinigkeit in einem Skript), kommt sein
   Eintrag gleich in diesen Abschnitt. Bei einem Release nur mit Doku bleibt die Nummer, und die
   Einträge bleiben unter «Unveröffentlicht» stehen bis zum nächsten Release mit Code.
3. `make release-check` muss grün sein: Version aus `package.json` hat genau einen Abschnitt
   in `docs/versionen.md`, und er steht zuoberst; die Version sinkt nicht und ist gestiegen,
   sobald Code dabei ist; ändert sie sich, ist «Unveröffentlicht» leer; keine als «nicht
   ausgeliefert» markierte Version hat einen Tag.
4. Jede Issue-Nummer in den Versionsabschnitten seit dem letzten Release mit `gh issue view NNN -R konstantinniedermann/tco-app`
   gegen den echten Titel halten — nicht der Formulierung früherer Einträge vertrauen.
5. Nach `dev` mergen und aufräumen wie Schritt 4. Der Hook nimmt den Merge an, wenn die Nummer
   um genau einen Schritt steigt, ihr Abschnitt zuoberst steht und «Unveröffentlicht» leer ist.
   Das Ergebnis (Fixes, Beobachtungen, Befunde auf hoch) kommt kurz in den Text des Release-PR.

**5 — PR anlegen und mergen:** Direkt davor im Hauptordner `make release-check` noch einmal —
andere Sessions können seit 4a nach `dev` gemergt haben.
Rot, weil «Unveröffentlicht» nicht leer ist (ein Merge mit Code kam nach dem Abgleich): Seine
Einträge in den Abschnitt der neuen Nummer nachrücken, als **eigener Doku-Commit nach dem
Merge** über einen Release-Branch wie in 4a. Im Merge selbst geht es nicht: Der Hook verlangt
beim Merge den Eintrag unter «Unveröffentlicht», die Prüfung vor dem Release verlangt dort
Leere. Anderes Rot: wie 4a über einen Release-Branch nachziehen.

```bash
gh pr create -R konstantinniedermann/tco-app --base main --head dev --title "Release: …" --body-file <datei>
gh pr checks <N> -R konstantinniedermann/tco-app        # warten bis grün
gh pr merge <N> -R konstantinniedermann/tco-app --merge   # Merge-Commit, nie --squash
```

Blockt der Auto-Modus den Merge, den Nutzer um Freigabe genau dieses Merges bitten — den
Merge nicht an ihn delegieren.

**6 — Realign statt Reset:** `main` enthält jetzt einen Merge-Commit, den `dev` nicht hat.

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M fetch origin
git -C $M merge --no-edit origin/main && git -C $M push origin dev
```

Meist ein Vorspulen auf den Merge-Commit von `main`; der Pre-Push-Hook lässt ihn durch, weil
er auf `main` liegt.

**7 — Issues abschliessen** (nach dem Release):

- Jedes Issue, dessen Definition of Done jetzt vollständig auf `main` steht, schliessen, mit
  Verweis auf das Release. Vorher die Haken der Definition of Done im Body setzen
  (`gh issue edit NNN --body-file …`); ein bewusst nicht erfüllter Punkt bleibt offen und wird
  im Abschlusskommentar begründet. Prüfen, welche Issues dadurch frei werden (`Blocked by` im Body),
  und dort `blocked` entfernen, wenn kein weiterer Blocker bleibt.
- Label entfernen (bei `issue-1-2` für jedes Issue): `gh issue edit NNN -R konstantinniedermann/tco-app --remove-label in-arbeit`.
- Ist ein Issue im Release, aber noch nicht fertig: Label wie in der Tabelle in Schritt 4.
- Reste wegräumen wie unten unter **Reste anderer Sessions**.

## Reste anderer Sessions

Bei jedem Release, Wrap-up und Session-Start: Jede Lagebild-Zeile
`gemergt, sauber: Worktree und Branch entfernen` wird sofort erledigt (Befehle aus Schritt 4).
Das gilt auch, wenn eine andere Session den Worktree angelegt hat. Ein gemergter, sauberer
Worktree, in dem keine Session sitzt, gehört niemandem mehr; er fällt nicht unter „Fremdes nie
anfassen“. Dazu gemergte Branches ohne Worktree. Als gemergt gilt nur ein Branch, dessen Name
in einem Merge-Commit auf `origin/dev` steht. `--merged` allein zählt auch frische Branches
ohne eigene Commits mit.

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M fetch --prune origin
git -C $M log origin/dev --merges --format=%s | grep "^Merge branch '"   # gemergte Namen
git -C $M branch --merged origin/dev                 # lokal
git -C $M branch -r --merged origin/dev              # remote
```

Löschen (`branch -d` bzw. `push origin --delete`) nur, was in der ersten Liste und in einer
der beiden anderen steht, ausser `dev`, `main` und Branches aus `git worktree list`.
`branch -d` verweigert ohnehin Branches, die in einem Worktree ausgecheckt sind. Das Lagebild vom Session-Start kann Stunden alt sein, und der Guard-Hook
blockt nur bei sicher erkannter Belegung (fail-open). Darum direkt vor dem Entfernen
`git status --short` im Worktree erneut prüfen. Zeilen `belegt` oder `uncommittete Änderungen` bleiben stehen und kommen in
den Bericht.

## Session-Ende

Skill `session-wrap-up` gilt, aber **ohne** dessen `git push origin main` — stattdessen
Schritt 4, dann **Reste anderer Sessions**. Die Schritte 4a–7 nur, wenn ein Release
beschlossen ist. Fertige Arbeit ist nach dem Merge schon aufgeräumt. Am Ende steht kein
gemergter Worktree und kein gemergter Branch dieser Session mehr. Fertig, aber der Merge ist
noch offen (Hauptordner besetzt): Branch pushen, Worktree und `in-arbeit` bleiben, Merge im
Bericht als offen nennen. Nicht fertige Arbeit: Branch pushen, der Worktree bleibt stehen,
im Bericht nennen; bei unfertig abgegebener Arbeit (niemand führt sie weiter) `in-arbeit`
entfernen.

## Reibungspunkte bei Parallel-Arbeit

- `docs/versionen.md`: Beide Sessions schreiben unter „Unveröffentlicht“ → bei Konflikt beide
  Einträge behalten (Konfliktregel in Schritt 4). Versionsnummern schreibt nur der Doku-Abgleich
  vor einem Release (Schritt 4a), nie ein Feature-Branch und nie ein Merge nach `dev`.
- `docs/beobachtungen.md`: Beide Sessions hängen unter „Offen“ an → bei Konflikt beide neuen
  Einträge behalten. Einträge, die auf der anderen Seite gelöscht sind, bleiben gelöscht: Das ist
  eine Auswertung, die sie ins Archiv verschoben hat. Ein Nachtrag des eigenen Branches zu einem
  solchen Eintrag kommt als neuer Eintrag zurück, nicht der alte Eintrag. Kein `merge=union` — es holt
  bei Konflikten gelöschte Einträge still zurück.
- Nachrichten zwischen Sessions (`SendMessage`) können vom Empfänger zurückgehalten werden —
  Abschlussberichte daher in der eigenen Antwort ausgeben, nicht nur per Nachricht.
