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
