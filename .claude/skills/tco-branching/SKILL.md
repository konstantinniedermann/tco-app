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
- **Merges macht Claude**, nicht der Nutzer: Feature → `dev` sobald fertig, Release
  `dev` → `main` am Session-Ende, wenn der Stand es wert ist. Immer Merge-Commit.

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
Alle Worktrees teilen die lokale Datenbank `mytco`; `make seed` und `make e2e` spielen dort die
Migrationen des eigenen Branches ein (`make dev` nicht: vorher einmal `make seed`). Eine Migration, die schon eingespielt
wurde, wird darum nie neu erzeugt — eine Änderung kommt als neue Migration dazu.

**2 — Arbeiten:** TDD bzw. Doku, Dateien einzeln stagen, committen, Branch pushen
(`git push -u origin <typ>/issue-NNN` — löst kein Deploy aus). Spec- und Plan-Dateien
gehören in den Feature-Branch. Zieht `dev` weiter: `git merge origin/dev` im Worktree.

**3 — Review:** `make check` grün, Agent `cas-reviewer`, Befunde klären.

**4 — Nach `dev` mergen (im Hauptordner):** Vorher den Worktree mit `ExitWorktree` (`keep`)
verlassen — aus dem Worktree heraus verweigert Claude Code Git-Befehle auf den Hauptordner.
Dann prüfen, ob der Hauptordner frei ist:

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M status --short                          # muss leer sein
git -C $M rev-parse -q --verify MERGE_HEAD        # muss leer sein
```

Erst wenn beide Prüfungen leer sind, mergen — ohne Commit, denn die Versionsnummer kommt
in den Merge-Commit selbst:

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M pull --ff-only origin dev
git -C $M merge --no-ff --no-commit <typ>/issue-NNN
git -C $M diff --cached --name-only --no-renames HEAD | node $M/scripts/pruefungen/nur-doku.ts && echo nur-doku || echo code
```

**Versionsnummer** (`docs/ci-cd-und-release.md#versionen`): Bei `nur-doku` bleibt sie, weiter
mit dem Commit. Bei `code` vergibt sie jetzt, wer mergt — nie der Feature-Branch:

- **Korrektur** (`patch`) bei jedem Merge mit Code, der Normalfall.
- **Nebenversion** (`minor`, Korrektur zurück auf 0), wenn etwas Grösseres dazukommt: neue
  Etappe oder spürbare neue Funktion. Im Bericht nennen, dass und warum.
- **Hauptversion** (`major`) nur im Auftrag des Projektleiters.

```bash
M=/Users/KN/CAS/projekte/tco-app
cd $M && npm version patch --no-git-tag-version --ignore-scripts   # bzw. minor / major
```

Dann in `docs/versionen.md` zuoberst unter «Unveröffentlicht» einen Abschnitt
`## X.Y.Z — <Kurztitel>` anlegen und die Einträge aus «Unveröffentlicht» hineinschieben
(auch liegengebliebene aus Doku-Merges); «Unveröffentlicht» bleibt leer stehen. Hat der
Branch keinen Eintrag geschrieben, einen kurzen ergänzen. Dann abschliessen:

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M add package.json package-lock.json docs/versionen.md
git -C $M commit --no-edit
git -C $M push origin dev
gh run list -R konstantinniedermann/tco-app --branch dev --limit 3   # CI grün?
```

Der Pre-Push-Hook weist den Push ab, wenn ein Merge mit Code die Version nicht um genau
einen Schritt erhöht, ihr Abschnitt nicht zuoberst steht oder reine Doku die Version erhöht
(`version-merge.ts`). Was schon auf `main` liegt, prüft er nicht (Realign nach dem Release).

Wird der Push abgewiesen, weil `origin/dev` inzwischen weitergezogen ist: nichts
zurücksetzen (kein Reset auf `dev`), sondern

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M pull --no-rebase --no-commit origin dev
```

Dann bekommt die eigene Arbeit die nächste freie Nummer über der neuesten von `origin/dev`,
ausdrücklich gesetzt (`cd $M && npm version X.Y.Z --no-git-tag-version --ignore-scripts
--allow-same-version`), auch wenn Git `package.json` ohne Konflikt zusammengeführt hat. In
`docs/versionen.md` bleibt der fremde Abschnitt, der eigene kommt mit der neuen Nummer darüber.
Stagen und committen wie oben, erneut pushen; der Hook prüft diesen Commit wie einen Merge.

**Dependabot-PRs** werden nicht auf GitHub gemergt, sondern wie ein Branch über diesen Schritt:
`git -C $M fetch origin`, dann `git -C $M merge --no-ff --no-commit origin/<branch des PR>` und
weiter wie oben (Korrektur, Abschnitt «Abhängigkeiten aktualisiert»). GitHub schliesst den PR
nach dem Push von selbst als gemergt. Ein Merge auf GitHub ginge am Hook vorbei.

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
Checkliste auf Test abgehakt und genau dieses Release freigegeben haben. Das Release erhöht
die Version nicht: Live bekommt die Nummer, die `dev` trägt (vergeben beim Merge, Schritt 4).
Den Tag und den Text des GitHub-Release (alle Abschnitte seit dem letzten Release) setzt die CI.

**Code, aber noch keine Live-Auslieferung** (`AUSLIEFERUNG_LIVE` nicht `an`): Ablauf wie oben,
ohne Marker in `docs/versionen.md`; kein Tag, kein GitHub-Release, auch nicht von Hand. Die Checkliste entfällt nur, solange auch
`AUSLIEFERUNG_TEST` aus ist; läuft Test schon, wird sie dort abgehakt
(`docs/ci-cd-und-release.md#versionen`). Freigabe des Projektleiters für genau dieses Release
trotzdem einholen.

**Nur Doku** (seit `main` keine Datei ausser Doku geändert, Regel aus `nur-doku.ts`): Ablauf
unten ohne Checkliste. Enthält das Release Code, ist die Version seit `main` schon gestiegen —
auch bei Werkzeugen wie Skripten oder Workflows; sonst fehlt eine Nummer aus Schritt 4.

**4a — Doku-Abgleich (vor jedem Release, auch nur Doku):** im Worktree eines Release-Branches
ab `origin/dev` (`docs/release-<datum>`), Start wie Schritt 1, ohne Label. Bringt der Abgleich
Code mit (Kleinigkeit in einem Skript), bekommt sein Merge eine Korrektur wie in Schritt 4.

1. Skill `doku-audit` über alle Domänen. Abweichend vom Skill **keine Issues**: Kleinigkeiten
   als eigener Commit (`docs: Doku-Abgleich vor Release …`), alles andere in
   `docs/beobachtungen.md`. Ein Befund, der Mitglieder, Vorstand oder Betrieb in die Irre
   führt oder blockiert, hält das Release auf, bis er behoben ist — übersteuern nur mit
   ausdrücklicher Freigabe des Nutzers.
2. Liegengebliebene Einträge unter «Unveröffentlicht» (aus Doku-Merges) in den obersten
   Versionsabschnitt schieben.
3. `make release-check` muss grün sein: Version aus `package.json` hat genau einen Abschnitt
   in `docs/versionen.md`, und er steht zuoberst; die Version sinkt nicht und ist gestiegen,
   sobald Code dabei ist; ändert sie sich, ist «Unveröffentlicht» leer; keine als «nicht
   ausgeliefert» markierte Version hat einen Tag.
4. Jede Issue-Nummer in den Versionsabschnitten seit dem letzten Release mit `gh issue view NNN -R konstantinniedermann/tco-app`
   gegen den echten Titel halten — nicht der Formulierung früherer Einträge vertrauen.
5. Nach `dev` mergen und aufräumen wie Schritt 4. Das Ergebnis (Fixes, Beobachtungen,
   Befunde auf hoch) kommt kurz in den Text des Release-PR.

**5 — PR anlegen und mergen:** Direkt davor im Hauptordner `make release-check` noch einmal —
andere Sessions können seit 4a nach `dev` gemergt haben.
Rot: wie 4a über einen Release-Branch nachziehen.

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
  Verweis auf das Release. Prüfen, welche Issues dadurch frei werden (`Blocked by` im Body),
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
  Einträge behalten (Konfliktregel in Schritt 4). Versionsnummern schreibt nur der Merge nach
  `dev`, nie der Feature-Branch.
- `docs/beobachtungen.md`: Beide Sessions hängen unter „Offen“ an → bei Konflikt beide neuen
  Einträge behalten. Einträge, die auf der anderen Seite gelöscht sind, bleiben gelöscht: Das ist
  eine Auswertung, die sie ins Archiv verschoben hat. Ein Nachtrag des eigenen Branches zu einem
  solchen Eintrag kommt als neuer Eintrag zurück, nicht der alte Eintrag. Kein `merge=union` — es holt
  bei Konflikten gelöschte Einträge still zurück.
- Nachrichten zwischen Sessions (`SendMessage`) können vom Empfänger zurückgehalten werden —
  Abschlussberichte daher in der eigenen Antwort ausgeben, nicht nur per Nachricht.
