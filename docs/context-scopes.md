[← Übersicht](index.md)

# Context-Scopes

Welche Pfade bei welcher Aufgabe geladen werden. Die Tabelle wächst mit dem Code.

| Aufgabe | Relevante Pfade | Nicht nötig |
|---------|-----------------|-------------|
| Anforderungen klären | `docs/anforderungen/`, `docs/abklaerungen.md`, `docs/glossar.md`, `docs/roadmap.md`, `docs/recherche/` | `.github/` |
| Architektur-Dokumente | `docs/`, insbesondere `docs/adr/`, `docs/anforderungen/`, `docs/glossar.md` | `.github/` |
| Neue Funktion planen, Datenschutz, Sicherheit | `docs/fachmodell.md`, `docs/rollen-und-rechte.md`, `docs/datenschutz.md`, `docs/sicherheitskonzept.md`, `docs/datenschutzerklaerung.md`, `src/lib/datenschutz/`, `src/routes/datenschutz/`, `docs/anforderungen/anforderungen.md`, `docs/abklaerungen.md` | `docs/recherche/` |
| App-Oberfläche | `docs/ui-leitbild.md`, `src/routes/`, `src/lib/` (mit `src/lib/design/`), `static/`, `vite.config.ts`, `docs/adr/adr-002-sveltekit-postgresql.md`, `.mcp.json` | `docs/recherche/` |
| Server-Fachlogik und Schnittstellen | `src/lib/server/`, `src/routes/api/`, `src/hooks.server.ts`, `docs/fachmodell.md`, `docs/rollen-und-rechte.md` | `docs/recherche/` |
| Login und Sitzung | `src/lib/server/login/`, `src/routes/api/login/`, `src/routes/login/`, `src/lib/login/`, `src/routes/api/sitzung/`, `src/routes/api/logout/`, `src/routes/api/passkey/`, `src/routes/profil/`, `tests/e2e/passkey.test.ts`, `tests/e2e/cookie.test.ts`, `src/hooks.server.ts`, `src/lib/server/einstellungen.ts`, `docs/sicherheitskonzept.md`, `docs/adr/adr-004-login-einmal-code.md`, `docs/adr/adr-005-passkey-simplewebauthn.md` | `docs/recherche/` |
| Mitgliederverwaltung (Admin) | `src/lib/server/admin/` (mit `erster-admin.ts`), `src/routes/api/admin/`, `src/routes/verwaltung/`, `src/lib/verwaltung/`, `scripts/admin-festlegen.ts`, `tests/scripts/admin-festlegen.db.test.ts`, `tests/hilfen/eigene-datenbank.ts`, `tests/e2e/verwaltung.test.ts`, `docs/rollen-und-rechte.md`, `docs/ui-leitbild.md` | `docs/recherche/` |
| Brief | `src/lib/server/brief/`, `scripts/musterbrief.ts` | `docs/recherche/` |
| Hilfe und Einstieg | `src/lib/hilfe/`, `src/lib/ui/Anleitung.svelte`, `src/lib/ui/Zeichnung*.svelte`, `src/routes/hilfe/`, `src/routes/willkommen/`, `src/routes/api/kontakt/`, `src/routes/+page.ts`, `src/hooks.client.ts`, `tests/e2e/hilfe.test.ts`, `tests/e2e/hilfen/geraet.ts`, `docs/ui-leitbild.md`, `docs/ui-mockups/hilfe.html` | `docs/recherche/` |
| Datenbank und Migrationen | `src/lib/server/db/`, `drizzle/`, `drizzle.config.ts`, `scripts/migrate.ts`, `scripts/seed-lokal.ts`, `scripts/testdaten.ts`, `scripts/erfundene-mitglieder.ts`, `docker-compose.yml` | `docs/recherche/` |
| Arbeitsweise, Issues | `docs/issue-konventionen.md`, `docs/abklaerungen.md`, `.github/ISSUE_TEMPLATE/`, `CLAUDE.md`, `.claude/skills/tco-branching/`, `docs/versionen.md`, `docs/beobachtungen.md` | `docs/recherche/` |
| Tests planen und schreiben | `tests/`, `**/*.test.ts`, `vitest.config.ts`, `playwright.config.ts`, `scripts/pruefungen/testmuster.ts`, `docs/testkonzept.md`, `docs/fachmodell.md`, `docs/rollen-und-rechte.md`, `docs/anforderungen/anforderungen.md`, `docs/datenschutz.md` | `docs/recherche/` |
| Betrieb und Auslieferung | `betrieb/`, `tests/betrieb/`, `scripts/ci/`, `scripts/testdaten.ts`, `.github/workflows/`, `Dockerfile`, `.dockerignore`, `docs/ci-cd-und-release.md`, `docs/sicherheitskonzept.md`, `docs/betrieb-und-uebergabe.md` | `docs/recherche/` |
| CI und Prüfungen | `docs/ci-cd-und-release.md`, `Makefile`, `scripts/` (mit `pruefungen/` und `ci/`), `Dockerfile`, `.dockerignore`, `.nvmrc`, `.githooks/`, `.github/workflows/`, `.github/dependabot.yml`, `eslint.config.js`, `.prettierrc`, `tsconfig.json` | `docs/recherche/` |
