---
name: tco-branching
description: Use when working on an issue in tco-app (MyTCO) or ending a session there — Worktree anlegen, Branch starten, nach dev mergen, Release dev → main, Branch und Worktree aufräumen, Issues schliessen. Triggers on "wir starten", "neues Issue anfangen", "Issue #", "Worktree", "Feature-Branch", "nach dev mergen", "Release", "dev nach main", "aufräumen", "wrap up", "Session beenden", "pushen". Nur für tco-app.
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
`make check` zusätzlich Docker Desktop).

**2 — Arbeiten:** TDD bzw. Doku, Dateien einzeln stagen, committen, Branch pushen
(`git push -u origin <typ>/issue-NNN` — löst kein Deploy aus). Spec- und Plan-Dateien
gehören in den Feature-Branch. Zieht `dev` weiter: `git merge origin/dev` im Worktree.

**3 — Review:** `make check` grün, Agent `cas-reviewer`, Befunde klären.

**4 — Nach `dev` mergen (im Hauptordner):** Vorher den Worktree mit `ExitWorktree` (`keep`)
verlassen — aus dem Worktree heraus verweigert Claude Code Git-Befehle auf den Hauptordner.
Dann prüfen, ob der Hauptordner frei ist (das Label `in-arbeit` bleibt auch nach dem Merge
nach `dev` bis zum Schliessen des Issues):

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M status --short                          # muss leer sein
git -C $M rev-parse -q --verify MERGE_HEAD        # muss leer sein
```

Erst wenn beide Prüfungen leer sind, mergen:

```bash
M=/Users/KN/CAS/projekte/tco-app
git -C $M pull --ff-only origin dev
git -C $M merge --no-ff <typ>/issue-NNN
git -C $M push origin dev
gh run list -R konstantinniedermann/tco-app --branch dev --limit 3   # CI grün?
```

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
Checkliste auf Test abgehakt und genau dieses Release freigegeben haben; dazu ein Commit auf
`dev`, der die Version in `package.json` und `docs/versionen.md` setzt. Den Tag setzt die
CI.

**Code, aber noch keine Live-Auslieferung** (`AUSLIEFERUNG_LIVE` nicht `an`): Versions-Commit
auf `dev` wie oben, in `docs/versionen.md` als «nicht ausgeliefert» gekennzeichnet; kein Tag,
kein GitHub-Release, auch nicht von Hand. Die Checkliste entfällt nur, solange auch
`AUSLIEFERUNG_TEST` aus ist; läuft Test schon, wird sie dort abgehakt
(`docs/ci-cd-und-release.md#versionen`). Freigabe des Projektleiters für genau dieses Release
trotzdem einholen.

**Nur Doku:** Ablauf unten ohne Checkliste und ohne Version.

**5 — PR anlegen und mergen:**

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

**7 — Aufräumen** (nur Released):

- Issues schliessen mit Verweis auf die Commits; prüfen, welche Issues dadurch frei werden
  (`Blocked by` im Body), dort `blocked` entfernen, wenn kein weiterer Blocker bleibt.
- Label entfernen (bei `issue-1-2` für jedes Issue): `gh issue edit NNN -R konstantinniedermann/tco-app --remove-label in-arbeit`.
- Worktree verlassen (`ExitWorktree` mit `keep`), dann
  `git -C /Users/KN/CAS/projekte/tco-app worktree remove .claude/worktrees/issue-NNN` — nur, wenn keine andere
  Session ihn belegt. Das Lagebild vom Session-Start kann Stunden alt sein, und der
  Guard-Hook blockt nur bei sicher erkannter Belegung (fail-open) — er ist kein harter Schutz.
  Belegt oder im Zweifel: stehen lassen und im Bericht nennen.
- Branch löschen: `git -C /Users/KN/CAS/projekte/tco-app branch -d <typ>/issue-NNN` und
  `git -C /Users/KN/CAS/projekte/tco-app push origin --delete <typ>/issue-NNN`.

## Session-Ende

Skill `session-wrap-up` gilt, aber **ohne** dessen `git push origin main` — stattdessen
Schritte 4–7. Nicht fertige Arbeit: Branch pushen, Worktree bleibt stehen, im Bericht
nennen. Label `in-arbeit`: Ist die Arbeit fertig, der Merge aber noch offen, bleibt es.
Nur bei unfertig abgegebener Arbeit (Branch nicht gemergt, niemand führt sie weiter) wird es
entfernt.

## Reibungspunkte bei Parallel-Arbeit

- `docs/versionen.md`: Beide Sessions schreiben unter „Unveröffentlicht“ → bei Konflikt beide
  Einträge behalten (Konfliktregel in Schritt 4).
- `docs/beobachtungen.md` hat `merge=union` (`.gitattributes`) und löst sich selbst.
- Nachrichten zwischen Sessions (`SendMessage`) können vom Empfänger zurückgehalten werden —
  Abschlussberichte daher in der eigenen Antwort ausgeben, nicht nur per Nachricht.
