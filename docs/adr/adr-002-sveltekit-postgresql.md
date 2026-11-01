[← ADR-Index](adr-index.md)

# ADR-002: MyTCO wird in TypeScript mit SvelteKit und PostgreSQL gebaut

**Status:** Entschieden · **Datum:** 2026-10-30 · **Issue:** #8

## Kontext

[ADR-001](adr-001-web-app-zuerst.md) legt fest: installierbare Web-App mit Web Push,
Admin-Bereich in derselben App, später eine Store-App aus derselben Codebasis über
Capacitor. Das Web-Framework hat sie an dieses Issue übergeben.

Randbedingungen:

- **Übergabe** ist das wichtigste Kriterium (Projektleiter): verbreitete Technik, eine
  Sprache, wenig Spezialwissen. Code entsteht mit KI-Assistenten (Claude Code), nicht von
  Hand — wie gut Assistenten ein Framework beherrschen, zählt deshalb mit.
- **Capacitor** packt nur fertige statische Dateien in die App; das Laden der Live-Seite
  ist laut Capacitor nicht für den Produktivbetrieb gedacht (B·10).
- Einige hundert Mitglieder, Lastspitzen bei der CM-Anmeldung (S); Hintergrundjobs für
  E-Mail, Push und Erinnerungen.
- Wenig Abhängigkeiten; `dep-guard` deckt `npm` ab.

**Legende:** **B·n** = belegt mit Quelle n · **S** = Schätzung · **V** = Vermutung.

## Optionen

| Option | Dafür | Dagegen |
|--------|-------|---------|
| **A · SvelteKit** | Offizielle Bausteine für alles aus ADR-001: Node-Server (B·5), reine Web-App für Capacitor (B·4), eingebauter Service Worker (B·3); 8 direkte Abhängigkeiten (B·8); seit 10/2024 keine kritische Sicherheitsmeldung (B·9); offizieller MCP-Server für KI-Assistenten (B·6) | Svelte kennen 7 % der Entwickler (B·1), npm-Downloads ein Zwanzigstel von Next.js (B·2); KI-Modelle lösten Aufgaben 2025 mit Svelte teils deutlich seltener als mit React (B·7); Version 3 erst seit 10/2026 stabil (B·8) |
| **B · React Router (ex Remix)** | React kennen 45 % (B·1), beste KI-Abdeckung (B·7); reine Web-App offiziell möglich (B·11) | Jährliche Hauptversion mit Umbauten, vorher Remix → v7 → v8 (B·12); 1 kritische Sicherheitsmeldung seit 10/2024, A: 0 (B·9) |
| **C · Next.js** | Am weitesten verbreitet (21 %, B·1) | Als reine Web-App fallen Server Actions und Middleware weg — also was es auszeichnet (B·13); 192 MB, 7 kritische Meldungen seit 10/2024 (B·8, B·9), darunter eine aktiv ausgenutzte Login-Umgehung (B·17) |
| **D · Nuxt (Vue)** | Mittel verbreitet (4 %, B·1) | 66 direkte Abhängigkeiten (B·8), viel Automatik (S); kein Vorteil gegenüber A |
| **E · TypeScript-Oberfläche + Python-Server** | Python/FastAPI aus früheren Projekten vertraut | Zwei Sprachen, zwei Auslieferungen — widerspricht der Übergabe |
| **F · Fertiger Backend-Dienst** (z. B. Supabase) | Wenig Server-Code | Rechte und Turnierlogik in den Regeln des Dienstes; Bindung an den Anbieter; verwaltete Angebote in CH/EU teuer (ADR-003) |

**Datenbank:** PostgreSQL (55.6 % Verbreitung, B·1) gegenüber SQLite (37.5 %, B·1).
SQLite würde für den Umfang reichen (B·14), Postgres trägt aber zusätzlich die
Job-Warteschlange (B·16) und ist die verbreitetere Wahl für eine Übergabe.

**Datenzugriff:** Drizzle (Schema in TypeScript, Migrationen als lesbare SQL-Dateien, keine
eigenen Abhängigkeiten, B·8, B·15) gegenüber Prisma (eigene Schemasprache), Kysely
(Migrationen von Hand) und reinem SQL (keine Typprüfung).

## Entscheidung

**MyTCO wird ganz in TypeScript mit SvelteKit gebaut, Oberfläche und Server in einer
Codebasis; Daten liegen in PostgreSQL, Zugriff und Migrationen über Drizzle,
Hintergrundjobs über pg-boss im selben Prozess.**

Begründung:

- **Alles aus ADR-001 mit offiziellen Bausteinen** — kein Zusatzpaket für PWA oder
  Capacitor nötig.
- **Kleinste Angriffsfläche und wenig Code:** Weniger Code heisst weniger, das ein
  KI-Assistent falsch machen und ein Review prüfen muss (S).
- **Eine Sprache, eine Infrastruktur:** Daten, Migrationen und Jobs laufen über
  PostgreSQL (B·15, B·16); kein zusätzlicher Dienst.
- **Das KI-Risiko ist bekannt und wird abgefangen** — durch die Vorgaben unten und den
  Ausstieg im Code-Gerüst (Trigger 1). Der Projektleiter hat SvelteKit nach einer
  Gegenprüfung bestätigt.

### Bauregel: Server liefert Daten, die Oberfläche holt sie

Damit die Capacitor-Hülle später ohne Umbau möglich ist, muss sich die Oberfläche als
reine Web-App (SPA) bauen lassen (B·4):

- Der Server bietet nur **API-Endpunkte** (`+server.ts`); die Fachlogik liegt in
  Server-Modulen, nicht in Seiten.
- **Nicht verwendet:** Form Actions, Server-Loader (`+page.server.ts`, `+layout.server.ts` —
  alle `*.server.ts` unter `src/routes` ausser `+server.ts`) und experimentelle Remote
  Functions — sie funktionieren in der Hülle nicht.
- Die Berechtigung prüft immer der API-Endpunkt (ADR-001).

### Vorgaben für Code-Gerüst (#15) und CI/CD (#12)

KI-Assistenten müssen die **aktuelle** Doku und die **neueste** Version nutzen; die CI
prüft das, statt sich darauf zu verlassen:

| Vorgabe | Umsetzung |
|---------|-----------|
| Nur aktuelle Svelte-Syntax | Runes-Modus im Compiler fest eingeschaltet — Syntax der Vorversion bricht den Build (S) |
| Fehler und veraltete Muster finden | `svelte-check` und ESLint mit Svelte-Regeln in `make check` und in der CI |
| Assistenten nutzen die aktuelle Doku | Offizieller Svelte-MCP-Server (B·6) nach Prüfung gemäss Regel für fremde MCP-Server einbinden; Regel in `CLAUDE.md`, sobald das Code-Verbot fällt |
| Versionen bleiben aktuell | Dependabot für `npm` und die Docker-Images; Hauptversionen fest in `package.json` |
| Bauregel eingehalten | CI-Prüfung, dass unter `src/routes` keine `*.server.ts` ausser `+server.ts` und keine Form Actions existieren, und ein SPA-Build in der CI (S) |
| Keine Inhalte von fremden Servern (DS-03) | Schriften, Icons und Skripte im Build mitliefern, kein Tracking; Content-Security-Policy nur mit eigener Adresse → #6 |

## Konsequenzen

**Leichter:** Eine Codebasis, eine Sprache, ein Testwerkzeug (Vitest, Playwright); Store-App
ohne Umbau; Datenbank und Jobs ohne zusätzlichen Dienst.

**Schwerer:** Weniger Svelte-Kenner und weniger fertige Admin-Bausteine als bei React (S).
KI-Assistenten brauchen die aktuelle Doku, sonst schreiben sie Code der Vorversion. Die
Bauregel verzichtet auf Komfort, den SvelteKit eigentlich bietet. Die Hülle läuft später
unter eigener Adresse (`capacitor://localhost` auf iOS, `https://localhost` auf Android, V) — Folgen für Cookies und CORS klärt
der Entscheid zur Store-App ([Sicherheitskonzept](../sicherheitskonzept.md#später)).

**Kosten:** keine; alle Bausteine sind Open Source. Hosting → [ADR-003](adr-003-hosting-infomaniak-vps.md).

## Reevaluations-Trigger

1. **Im Code-Gerüst (#15) hakt es:** Claude Code schreibt trotz MCP-Server wiederholt
   Code, den Build oder `svelte-check` ablehnen → Wechsel auf React (Option B), bevor
   Funktionen gebaut sind.
2. **Nachfolge scheitert an Svelte:** Für die Mitbetreuung findet sich niemand, der damit
   arbeiten will.
3. **SvelteKit wird nicht mehr gepflegt** oder eine kritische Sicherheitslücke bleibt
   länger als 30 Tage offen.
4. **Drizzle 1.0** (heute Release Candidate, B·8) erzwingt einen Umbau der Migrationen.

## Quellen

Abgerufen am 30.10.2026.

1. [Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/technology) — Svelte 7.2 %, React 44.7 %, Next.js 20.8 %, Nuxt 4.0 %, PostgreSQL 55.6 %, SQLite 37.5 %
2. [npm-Downloads](https://api.npmjs.org/downloads/point/last-week/@sveltejs/kit) — `@sveltejs/kit` 4.5 Mio., `next` 91.5 Mio. pro Woche
3. [SvelteKit: Service Workers](https://svelte.dev/docs/kit/service-workers)
4. [SvelteKit: Single-page apps](https://svelte.dev/docs/kit/single-page-apps) — reine Web-App ohne Server-Dateien, Anwendungsfall App-Hülle
5. [SvelteKit: adapter-node](https://svelte.dev/docs/kit/adapter-node)
6. [Svelte: MCP-Server und Doku für KI-Assistenten](https://svelte.dev/docs/ai) — Doku-Abruf und automatische Code-Prüfung, Anleitung für Claude Code
7. [Web-Bench (arXiv 2505.07473)](https://arxiv.org/pdf/2505.07473) — gleiche Aufgaben, React 65 vs. Svelte 25 (Claude 3.7), mit Denkmodus 60 vs. 55
8. [npm-Registry](https://registry.npmjs.org/@sveltejs/kit) — Versionen und Abhängigkeiten: `@sveltejs/kit` 3.1.1, `next` 16.4.3, `nuxt` 4.6.3, `drizzle-orm` 0.45.4 (v1 als RC)
9. GitHub Security Advisories seit 30.10.2024: [SvelteKit](https://github.com/sveltejs/kit/security) 0 kritisch, [Next.js](https://github.com/vercel/next.js/security) 7, [Nuxt](https://github.com/nuxt/nuxt/security) 1, [React Router](https://github.com/remix-run/react-router/security) 1
10. [Capacitor: Konfiguration](https://capacitorjs.com/docs/config) — `webDir`; `server.url` nicht für Produktion
11. [React Router: SPA](https://reactrouter.com/how-to/spa)
12. [React Router v8](https://remix.run/blog/react-router-v8)
13. [Next.js: Static Exports](https://nextjs.org/docs/app/guides/static-exports)
14. [SQLite: When to use](https://www.sqlite.org/whentouse.html)
15. [Drizzle: Migrationen](https://orm.drizzle.team/docs/migrations)
16. [pg-boss](https://github.com/timgit/pg-boss) — Jobs, Cron und Wiederholung auf PostgreSQL
17. [Truesec: CVE-2025-29927](https://www.truesec.com/hub/blog/cve-2025-29927-nextjs-authorization-bypass-vulnerability) — Umgehung der Next.js-Middleware, aktiv ausgenutzt
