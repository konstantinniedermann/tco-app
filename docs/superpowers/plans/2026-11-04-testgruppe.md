# Testgruppe (#40) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Testgruppe für Lauf 1 vollständig vorbereiten: Doku, Datenschutz, Etappe *Pilot* auf GitHub, K-20 nachgeführt, Google Formular angelegt.

**Architecture:** Nur Doku und Projektpflege, kein App-Code. Eine neue Seite `docs/testgruppe.md` bündelt Ablauf und Texte; die übrigen Dokumente verweisen darauf. GitHub bekommt den Milestone *Pilot* und zwei neue Issues (vom Projektleiter freigegeben).

**Tech Stack:** Markdown, `gh` CLI, Google Sheets Connector, Chrome-Erweiterung (Google Formular).

**Spec:** `docs/superpowers/specs/2026-11-04-testgruppe-design.md`

## Global Constraints

- Nie echte Namen von Mitgliedern oder Testpersonen in Repo, Issues oder Screenshots; Rollen statt Namen.
- Texte an Testpersonen: kurz, Du-Form, Stichpunkte, nichts überversprechen.
- Lauf 1 ohne Datum («sobald die Voraussetzungen erfüllt sind»); Termin *Mitglieder-Login* 28.02.2027 bleibt.
- Vorabversion heisst «Vorabversion 0.x», keine feste Nummer.
- «Älteres Handy» = iPhone mit iOS 16 oder 17, Android 9 bis 11.
- Formular: keine Namen, keine E-Mail-Adressen, keine Frage nach «älterem Handy» oder Jahrgang.
- Dateien einzeln stagen; Commit-Präfix `docs:`; nach jedem Task `make docs` grün.

## Review Focus

1. Personendaten rutschen ins Repo (Name im Beispieltext, Screenshot mit echter Adresse) → `git grep` auf Vereinsnamen aus der Fragen-Tabelle vor jedem Commit leer (Task 6).
2. Formular sammelt doch E-Mail-Adressen (Google-Einstellung «E-Mail-Adressen erfassen» standardmässig an) → beim Durchspielen prüfen, dass keine Adresse abgefragt wird (Task 7).
3. Widersprüche zwischen Dokumenten zu Version/Termin/Etappe → `git grep -n "0.9.0\|Januar 2027"` in `docs/` ausser Spec/Plan leer (Task 3).
4. Issue-Abhängigkeiten nur einseitig (Blocked by ohne Blocks) → jede neue `Blocked by`-Zeile hat ihr Gegenstück (Task 5).
5. Tabelle für den Verein enthält Hinweise für den Projektleiter → K-20-Text nur an Ausfüllende gerichtet (Task 6).

---

### Task 1: `docs/testgruppe.md` und Testkonzept

**Files:**
- Create: `docs/testgruppe.md`
- Modify: `docs/testkonzept.md` (Abschnitt zur Testgruppe, Zeilen ~131–134), `docs/index.md` (Tabelle der Dokumente)

**Interfaces:**
- Produces: Anker `testgruppe.md#auftraege-lauf-1`, `#formular`, `#auswertung`, `#bereit-fuer-lauf-1` (von Task 2–7 verlinkt).

- [ ] **Step 1:** `testgruppe.md` anlegen mit Abschnitten: Zweck · Bereit für Lauf 1 (Checkliste der Voraussetzungen aus der Spec, mit Issue-Links; Platzhalter `#B` wird in Task 5 ersetzt) · Ablauf Lauf 1 · Aufträge Lauf 1 (Tabelle aus der Spec, Anforderungs-IDs) · Regeln · Mail an die Testpersonen (Text zum Kopieren als Codeblock: Zweck, «sobald bereit», Regeln, Brief-PDF am Laptop öffnen, Code gilt nur bis zum ersten Login, was mit Liste/Formular/Chat passiert und wann gelöscht wird) · Chat-Nachrichten zum Kopieren (Begrüssung, Start Lauf, Erinnerung, Dank) · Formular (Fragen aus der Spec, Nummern 1–5) · Zusammensetzung (Anzahl, iPhone/Android, Altersgruppen, älteres Handy — vorerst «folgt vor Lauf 1») · Auswertung (leere Tabelle Auftrag × ohne Hilfe/mit Mühe/ging nicht) · Lauf 2 (ein Absatz, offen).
- [ ] **Step 2:** Abweichung «Brief per Mail nur im Pilot» im Ablauf offen benennen (Satz aus der Spec).
- [ ] **Step 3:** Testkonzept: Satz «Falls der Verein eine Testgruppe stellt (K-20) …» ersetzen durch: Testgruppe des Projektleiters, Pilot auf Live mit Vorabversion 0.x, Betrieb statt Test (DS-08), Definition «älteres Handy», Verweis auf `testgruppe.md`. Index-Zeile für `testgruppe.md` ergänzen.
- [ ] **Step 4:** `make docs` → «Doku-Check ok».
- [ ] **Step 5:** Commit `docs: Seite Testgruppe mit Ablauf, Aufträgen und Texten (#40)`.

### Task 2: Datenschutz

**Files:**
- Modify: `docs/datenschutz.md` (neuer Abschnitt *Testgruppe* vor *Junioren*, Einträge unter *Löschen*, Änderungsprotokoll am Ende)

- [ ] **Step 1:** Abschnitt *Testgruppe*: Liste in `intern/` (Felder aus der Spec), Formular ohne Personenbezug bei Google, Chat privat beim Projektleiter, Mail mit Brief-PDF übers private Postfach (eigene Daten an sich selbst, Code nur bis zum ersten Login, Gesendet-Ordner leeren), Pilot auf Live ist Betrieb (DS-08 gilt nicht), Begründung, warum die Datenschutzerklärung unverändert bleibt.
- [ ] **Step 2:** *Löschen*: «Liste der Testpersonen: nach Lauf 2» · «Formularantworten: nach der Auswertung des Laufs».
- [ ] **Step 3:** Änderungsprotokoll-Zeile 04.11.2026 (#40).
- [ ] **Step 4:** `make docs` grün; Commit `docs: Datenschutzkonzept nennt die Testgruppe (#40)`.

### Task 3: Etappe *Pilot*, Release-Doku, Anforderung B

**Files:**
- Modify: `docs/roadmap.md` (Etappen-Tabelle), `docs/ci-cd-und-release.md` (Abschnitt Versionen, ~Zeile 338), `docs/anforderungen/anforderungen.md` (neue Gruppe *HILFE*), `docs/anforderungen/README.md` (Änderungsprotokoll), `docs/issue-konventionen.md` (nur falls Etappen aufgezählt)

**Interfaces:**
- Produces: IDs `A-HILFE-01` (Hilfe-Seite in MyTCO: Startbildschirm, neuer Code, Passkey, Angaben ändern, Kontakt), `A-HILFE-02` (Anleitung zum Startbildschirm mit Animation auf der Einstiegsseite, je nach iPhone/Android, nur solange MyTCO im Browser läuft), beide Etappe *Pilot*, Status geplant, Quelle PL.

- [ ] **Step 1:** Roadmap: Zeile *Pilot* (Fällig «—, sobald bereit») vor *Mitglieder-Login*; Umfang: Server, Login per Code, Passkey, Hilfe (A-HILFE), Testgruppe Lauf 1 mit Vorabversion 0.x. *Mitglieder-Login* neu: Befunde aus dem Pilot, 1.0.0, Briefversand an alle, Mitgliederverwaltung fertig.
- [ ] **Step 2:** ci-cd: «das erste Release *Mitglieder-Login* wird `1.0.0`» ergänzen um: vorher geht die letzte Vorabversion 0.x für den Pilot auf Live.
- [ ] **Step 3:** Anforderungen: Gruppe *HILFE — Hilfe beim Start* mit A-HILFE-01/-02; Änderungsprotokoll-Zeile 04.11.2026.
- [ ] **Step 4:** `git grep -n "0\.9\.0\|Januar 2027" docs ':!docs/superpowers'` → leer. `make docs` grün.
- [ ] **Step 5:** Commit `docs: Etappe Pilot und Anforderungen zur Hilfe beim Start (#40)`.

### Task 4: K-20 und Versionen

**Files:**
- Modify: `docs/abklaerungen.md` (K-20 von *Offen* nach *Beantwortet*), `docs/versionen.md` (*Unveröffentlicht*)

- [ ] **Step 1:** `make annahmen K=K-20` laufen lassen; jede Annahme, die von der Antwort abweicht, nennen und anpassen.
- [ ] **Step 2:** K-20 nach *Beantwortet*: «Der Projektleiter stellt die Testgruppe selbst zusammen, der Vorstand kann mitmachen» · Quelle Projektleiter, 04.11.2026 · Verweis `testgruppe.md`. Den Hinweis zu den Spalten D/E auf *Wer ist wer* (Zeilen ~54–56) so lassen, aber auf `testgruppe.md` verweisen.
- [ ] **Step 3:** Versionen: ein Eintrag (Testgruppe vorbereitet, Etappe *Pilot*, A-HILFE-01/-02).
- [ ] **Step 4:** `make docs` grün; Commit `docs: K-20 beantwortet, Versionen nachgeführt (#40)`.

### Task 5: GitHub — Milestone, Issues, Abhängigkeiten

Texte per Write in Dateien im Scratchpad, `gh` einzeln aufrufen (`--body-file`).

- [ ] **Step 1:** Milestone `Pilot` ohne Datum anlegen (`gh api repos/konstantinniedermann/tco-app/milestones -f title=Pilot -f description=…`).
- [ ] **Step 2:** Issue B anlegen: `feat: Hilfe beim Start — Hilfe-Seite und Anleitung zum Startbildschirm mit Animation (A-HILFE-01, -02)`, Labels `enhancement,app,P1`, Milestone *Pilot*, Body nach `.github/ISSUE_TEMPLATE/` (Kontext, Lösungsrichtung aus der Spec, DoD, Datenschutz «keine neuen Daten», `Blocks: #40`, `Verwandt: #29`).
- [ ] **Step 3:** Issue anlegen: `chore: Release 1.0.0 und Briefversand an alle Mitglieder`, Labels `chore,verein,P1`, Milestone *Mitglieder-Login*, `Blocked by: #40, #43`.
- [ ] **Step 4:** Milestone *Pilot* setzen für #29, #39, #44, #40.
- [ ] **Step 5:** #40-Body: Lösungsrichtung und DoD auf Spec-Stand (Lauf 1, Formular, Liste in `intern/` nach Durchgabe), `Blocked by: #29, #39, #43, #B`, Label `blocked`. Gegenstücke: in #29, #39 und #43 `#40` in der Zeile `Blocks:` ergänzen.
- [ ] **Step 6:** In `docs/testgruppe.md` den Platzhalter `#B` durch die echte Nummer ersetzen; `make docs`; Commit `docs: Testgruppe verweist auf Issue der Hilfe (#40)`.
- [ ] **Step 7:** Prüfen: `gh issue list --milestone Pilot` zeigt #29, #39, #44, #40, B.

### Task 6: Fragen-Tabelle

- [ ] **Step 1:** Tabelle direkt vorher neu lesen (Vorstand!B:I und *Wer ist wer*).
- [ ] **Step 2:** K-20-Zeile: Frage neu «Die Testgruppe stelle ich selbst zusammen. Möchtest du mitmachen? Dann trag dich auf «Wer ist wer» ein (Spalten D und E).», Warum «So probieren auch Vorstandsmitglieder den Start vorher aus.» — nur Zellen C/D dieser Zeile ändern.
- [ ] **Step 3:** `git grep` nach jedem Nachnamen aus *Wer ist wer* in `docs/testgruppe.md`, `docs/datenschutz.md`, Spec, Plan → leer.

### Task 7: Google Formular

- [ ] **Step 1:** Skill `claude-in-chrome` laden; neues Formular «MyTCO – Rückmeldung Testlauf 1» im Drive des Projektleiters anlegen, Fragen 1–5 aus `testgruppe.md#formular`.
- [ ] **Step 2:** Einstellungen: E-Mail-Adressen erfassen = aus, Anmeldung nicht nötig, eine Antwort pro Person nicht begrenzt.
- [ ] **Step 3:** Einmal selbst ausfüllen (Vorschau), Screenshot nach `docs/superpowers/` nur falls ohne Personendaten, sonst nur im Bericht. Testantwort danach löschen.
- [ ] **Step 4:** Link (Bearbeiten nur Projektleiter) in `docs/testgruppe.md#formular`; `make docs`; Commit `docs: Formular der Testgruppe angelegt (#40)`.

### Abschluss

- [ ] `make check` (bzw. `make docs`, da nur Doku), Agent `cas-reviewer`, Befunde klären, Merge nach `dev` nach `tco-branching`; #40 behält `blocked` (wartet auf #29, #39, #43, B), `in-arbeit` entfernen.
