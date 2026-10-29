[← Übersicht](index.md)

# Versionen

Versionshistorie von MyTCO, neueste zuerst. Das Versionsschema wird im CI/CD- und
Release-Konzept festgelegt (Milestone *Fundament*).

## Unveröffentlicht

- Repo aufgesetzt: Arbeitsweise, Issue-Konventionen, Roadmap, Doku-Check und Secret-Scan
  in der CI, Anforderungsdokument v1.2 und Recherche zur Systemlandschaft abgelegt.
- Anforderungen mit IDs erfasst (`docs/anforderungen/anforderungen.md`), funktional und
  nicht-funktional, je mit Quelle, Etappe und Status; neue offene Fragen an den Verein.
- Glossar der Fachbegriffe (`docs/glossar.md`) mit Sprachregeln für MyTCO und Belegen aus
  dem Advantage-Handbuch von Swiss Tennis.
- Setup gehärtet nach Review: versionierte Git-Hooks (Secret-Scan bricht ohne gitleaks ab,
  kein direkter Push auf `main`), Secret-Scan auch bei PRs, Zeitlimit für CI-Jobs.
- Parallele Sessions: Hauptordner bleibt auf `dev`, jede Session arbeitet in einem Worktree
  unter `.claude/worktrees/`; Ablauf im Skill `tco-branching`.
- ADR-001: MyTCO startet als installierbare Web-App (PWA) mit Admin-Bereich und Web Push,
  E-Mail als Grundlage; Store-App per Capacitor, sobald ein Reevaluations-Trigger greift.
- Entscheidungsgrundlage für den Vorstand zu den App-Varianten mit Budget über fünf Jahre
  (`docs/recherche/2026-10-29-app-varianten-vorstand.html`).
- Abklärungen beim Verein (`docs/abklaerungen.md`): alle offenen Fragen an Vorstand,
  Website-Betreuer, Hoster und Verantwortliche mit ID und Fälligkeit; Regel dazu in den Issue-Konventionen
  und der Issue-Vorlage.
- Datenschutzkonzept nach nDSG (`docs/datenschutz.md`), bewusst knapp gehalten: welche
  Daten, wer sieht was, Löschen, Junioren, Vorgaben `DS-01` bis `DS-10` für Technik und
  Hosting (Daten in der Schweiz oder EU/EWR); Entwurf der
  Datenschutzerklärung (`docs/datenschutzerklaerung.md`). Jedes Issue prüft im neuen
  Abschnitt *Datenschutz* der Issue-Vorlage, ob das Konzept angepasst werden muss.
- Fachmodell (`docs/fachmodell.md`): Objekte von Mitglied und Konto über Clubmeisterschaft
  (Kategorie, Anmeldung als Einzel oder Doppel, Gruppe, KO-Tableau, Spiel, Resultat Satz für
  Satz) bis Lizenzantrag mit Stichtag; Fachregeln `FR-01` bis `FR-23` mit Anforderungs-IDs,
  Annahmen zu offenen Fragen markiert. Junioren vorerst ausgeklammert, Datenschutzkonzept
  entsprechend angeglichen.
- Rollen und Rechte (`docs/rollen-und-rechte.md`): Mitglied, Admin, CM-Verantwortlicher und
  Lizenzverantwortlicher, kombinierbar; Admin vertritt beide Verantwortlichen. Grundsätze
  `RR-01` bis `RR-08` und Matrix Rolle × Daten bis zur Etappe *Lizenzanträge*. CM-Aufgaben in
  Fachmodell und Anforderungen vom Admin zum CM-Verantwortlichen verschoben; Kontaktdaten
  für die Verantwortlichen im Datenschutzkonzept ergänzt (K-42).
