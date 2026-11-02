[← Übersicht](index.md)

# Context-Scopes

Welche Pfade bei welcher Aufgabe geladen werden. Die Tabelle wächst mit dem Code.

| Aufgabe | Relevante Pfade | Nicht nötig |
|---------|-----------------|-------------|
| Anforderungen klären | `docs/anforderungen/`, `docs/abklaerungen.md`, `docs/glossar.md`, `docs/roadmap.md`, `docs/recherche/` | `.github/` |
| Architektur-Dokumente | `docs/`, insbesondere `docs/adr/`, `docs/anforderungen/`, `docs/glossar.md` | `.github/` |
| Neue Funktion planen, Datenschutz, Sicherheit | `docs/fachmodell.md`, `docs/rollen-und-rechte.md`, `docs/datenschutz.md`, `docs/sicherheitskonzept.md`, `docs/datenschutzerklaerung.md`, `docs/anforderungen/anforderungen.md`, `docs/abklaerungen.md` | `docs/recherche/` |
| App-Oberfläche | `docs/ui-leitbild.md`, `src/lib/design/`, `src/routes/`, `src/lib/`, `static/`, `vite.config.ts`, `docs/adr/adr-002-sveltekit-postgresql.md`, `.mcp.json` | `docs/recherche/` |
| Server-Fachlogik und Schnittstellen | `src/lib/server/`, `src/routes/api/`, `src/hooks.server.ts`, `docs/fachmodell.md`, `docs/rollen-und-rechte.md` | `docs/recherche/` |
| Login und Sitzung | `src/lib/server/login/`, `src/routes/api/login/`, `src/routes/login/`, `src/lib/login/`, `src/routes/api/sitzung/`, `src/routes/api/logout/`, `src/hooks.server.ts`, `src/lib/server/einstellungen.ts`, `docs/sicherheitskonzept.md`, `docs/adr/adr-004-login-einmal-code.md` | `docs/recherche/` |
| Brief | `src/lib/server/brief/`, `scripts/musterbrief.ts` | `docs/recherche/` |
| Datenbank und Migrationen | `src/lib/server/db/`, `drizzle/`, `drizzle.config.ts`, `scripts/migrate.ts`, `docker-compose.yml` | `docs/recherche/` |
| Arbeitsweise, Issues | `docs/issue-konventionen.md`, `docs/abklaerungen.md`, `.github/ISSUE_TEMPLATE/`, `CLAUDE.md`, `.claude/skills/tco-branching/` | `docs/recherche/` |
| Tests planen und schreiben | `tests/`, `**/*.test.ts`, `vitest.config.ts`, `playwright.config.ts`, `scripts/pruefungen/testmuster.ts`, `docs/testkonzept.md`, `docs/fachmodell.md`, `docs/rollen-und-rechte.md`, `docs/anforderungen/anforderungen.md`, `docs/datenschutz.md` | `docs/recherche/` |
| CI und Prüfungen | `docs/ci-cd-und-release.md`, `Makefile`, `scripts/`, `scripts/pruefungen/`, `scripts/ci/`, `Dockerfile`, `.githooks/`, `.github/workflows/`, `.github/dependabot.yml` | `docs/recherche/` |
