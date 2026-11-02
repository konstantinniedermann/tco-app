[← Beobachtungen](beobachtungen.md)

# Beobachtungen — Archiv

Ausgewertete Einträge aus [`beobachtungen.md`](beobachtungen.md), ein Block pro Auswertung,
neuester oben. Jeder Eintrag steht hier als eine Zeile mit Ausgang und Verweis; die
Begründung lebt im Issue, im Commit oder in der Doku. Verworfene Einträge behalten ihren
Gegenbeleg.

### Auswertung vom 02.11.2026 — 28 Einträge, alle gegen `dev` (abbcc70) verifiziert

Bilanz: 0 verworfen · 18 abgehakt (einer davon teilweise mitgemacht) · 3 mitgemacht · 1 Doku ·
6 an Issues (#29, #32, #40), dazu 2 Nebenbefunde mitgemacht. Kein Eintrag war gegenstandslos;
bei 8 trug die Begründung ganz oder teilweise nicht (Tabelle unten).

**An Issues angehängt**

- 2026-11-01 — Testgruppe: Handymodell in der Fragen-Tabelle, Löschzeitpunkt fehlt → DoD von [#40](https://github.com/konstantinniedermann/tco-app/issues/40)
- 2026-11-01 — «Älteres Handy» für die Testgruppe nicht definiert → DoD von [#40](https://github.com/konstantinniedermann/tco-app/issues/40)
- 2026-11-01 — E2E nutzt die gemeinsame lokale Datenbank `mytco` → Trigger erreicht (#29 schreibt Daten), [Kommentar in #29](https://github.com/konstantinniedermann/tco-app/issues/29#issuecomment-6576064971)
- 2026-11-01 — Test-ID-Prüfung zählt IDs in Kommentaren und übersprungenen Tests → [Kommentar in #29](https://github.com/konstantinniedermann/tco-app/issues/29#issuecomment-6576064971)
- 2026-11-02 — Scaleway bewahrt Versandprotokolle auf, solange die Domain aktiv ist → [Kommentar in #29](https://github.com/konstantinniedermann/tco-app/issues/29#issuecomment-6576064971); Löschen per Support-Ticket möglich, `kosten.md` nachgeführt
- 2026-11-01 — Für den Aufbau von Server und Auslieferung gibt es kein Issue → erledigt mit #32; die mitgenannte **Mindestversion** fehlt dort, [Kommentar in #32](https://github.com/konstantinniedermann/tco-app/issues/32#issuecomment-6576065403)

**Mitgemacht** (Commits auf `docs/beobachtungen-2026-11-02`)

- 2026-11-01 — Label `in-arbeit` fehlt in der Issue-Vorlage, Kleinkram in tco-branching → Vorlage, `.gitattributes`-Kommentar, Skill Schritt 4 (Prüfung und Merge getrennt) und 7 (Guard ist fail-open). Die Commit-Message von f73fd96 bleibt, wie sie ist
- 2026-10-29 — Recherche-Seiten ohne Zeichensatz-Angabe → `<meta charset>` ergänzt; kein `<!doctype html>`, weil das den Darstellungsmodus der Seite ändert. Google Fonts bleiben: Recherchen sind Momentaufnahmen (`docs/recherche/README.md`), DS-03 gilt für die App
- 2026-10-30 — Vorstandsseite nennt Hosting noch als offen → Nachtrag mit Verweis auf ADR-003
- 2026-11-01 — Kleinbefunde Code-Gerüst, Doku-Teil → README-Umbruch, Doppelungen in `context-scopes.md` (CI, auch App-Oberfläche). Der Umbruch in `ci-cd-und-release.md` war nicht nachvollziehbar
- Nebenbefund — `scripts/ci/osv_malware_gate.py` verwies auf ein pip-audit-Gate aus Munica → Docstring korrigiert
- Nebenbefund — `kosten.md` nannte die Scaleway-Datenschutzseite „nur aus Suchauszug“ → Wortlaut über `scaleway/docs-content` belegt

**Doku**

- 2026-10-31 — Fragen-Tabelle spricht von «Anmelden», das Glossar verlangt «Login» → Entscheid: Die Regel gilt für App, Brief und Doku, nicht für Texte an den Verein; Satz in `glossar.md`. K-12.1 enthielt das Wort schon nicht mehr; betroffen sind K-02.1, K-16.1, K-16.3, K-20, K-21, K-38, K-39

**Abgehakt** — mit Begründung; wo der Punkt zurückkommen kann, mit Trigger

- 2026-11-01 — adapter-node liefert `/_app/*` vor `handle` aus → betrifft alle statischen Dateien; abgedeckt durch die Caddy-Header im Design von #32
- 2026-11-01 — Image-Start und Migration ohne Rauchtest → DoD von #32
- 2026-11-01 — SPA-Build: CSP nur als Meta-Tag → Web-App bekommt die CSP als Header (siehe Prämissen). Trigger: Store-App mit Capacitor
- 2026-11-01 — Kleinbefunde Code-Gerüst, übriger Teil → ADR-Sätze beschreiben den Stand beim Entscheid (und gelten für `expo install` und Flutter sinngemäss weiter); Prüfskript-Lücken (`skip.ts`, `bauregel.ts`, `nur-doku.test.ts`) sind klein. Makefile, Dockerfile und `DATABASE_URL` (6 Stellen) ändern #29 und #32 gerade; Dockerfile ist auf dem lokalen Branch von #32 (noch nicht gepusht) bereits bereinigt. Trigger: nächste Arbeit an Makefile bzw. Prüfskripten
- 2026-11-01 — `$app/env/private` passt nicht zur Test-Datenbank pro Lauf → Trigger: Kit ändert die Umgebungsprüfung (dann auch `einstellungen.ts` aus #29)
- 2026-11-01 — Hash der Screenreader-Hinweis-Regel → Hash stimmt mit Kit 3.1.1 überein. Trigger: CSP-Fehler nach Kit-Update
- 2026-11-01 — CI: PostgreSQL-Service nur per Tag, Playwright ohne Cache → Dependabot erfasst `services:` nicht (dependabot-core#5541), Cache spart nur ca. 15 s. Trigger: Actions-Minuten knapp oder Dependabot unterstützt Workflow-Services
- 2026-11-01 — 22 bekannte Schwachstellen, kein Audit-Gate → 18 nur Entwicklung, 4 niedrig im Laufzeit-Baum; für keine gibt es ein Upgrade. Trigger: Lücke ab «moderate» im Laufzeit-Teil (`npm audit --omit=dev --audit-level=moderate`) oder ein Fix wird angeboten
- 2026-10-30 — Impressum von tcolten.ch nennt eine frühere Person → weiterhin so; Sache des Vereins. Trigger: K-06 (Datenschutzerklärung schliesst an tcolten.ch an)
- 2026-10-29 — Push-Auslöser sind nirgends festgelegt → Trigger: Planung der Etappe *CM-Betrieb* (A-ANMELDUNG-08)
- 2026-11-01 — Fachmodell kennt keinen Lizenzstatus → Trigger: Feinschliff vor *Lizenzanträge*, zusammen mit K-34. Lösung laut Fachmodell (Ausblick) als eigenes Objekt, nicht als Feld am Mitglied
- 2026-10-29 — „Mermaid rendert“ lässt sich lokal nicht nachweisen → Nachweis über den Mermaid-Chart-Validator. Trigger: arc42 (#14)
- 2026-10-29 — Doku-Check prüft keine Anker → heute 0 kaputte von 55 Anker-Links. Trigger: arc42 (#14) oder der erste kaputte Anker
- 2026-11-02 — `design-festwerte`: Fehlalarme · Leitbild ↔ Tokens: doppelte Zeilen · kein Check für `var(--…)` → alle belegt, heute ohne Folge (40 Tokens benutzt, alle definiert). Trigger: erster Fehlalarm bzw. nächste Arbeit an den Design-Prüfungen
- 2026-11-02 — Mockups zeigen Hinweis und Fehlermeldung nicht → die Login-Seiten aus #29 benutzen beide Bausteine und werden die Referenz
- 2026-10-29 — Skill tco-branching: Merge aus dem Worktree → erledigt (ff6fd08)

**Falsche Prämissen**

| Eintrag | Behauptet | Gemessen |
|---|---|---|
| SPA-Build: CSP nur als Meta-Tag | `frame-ancestors` muss als Header von #32 kommen | Der SPA-Build ist nur für Capacitor; die Web-App (adapter-node, `prerender = false`) setzt die CSP schon als Header (`kit/…/page/render.js`) |
| 22 Schwachstellen | nur Entwicklungswerkzeuge; Dependabot hält aktuell | 4 im Laufzeit-Baum; npm bietet nur Downgrades an |
| Kein Issue für Server | erledigt mit #32, „blocks #29“ | Mindestversion fehlt in #32; Kette ist #32 → #39 → #29 |
| Kleinbefunde Code-Gerüst | Docker-Prüfung „doppelt“; Dockerfile „→ #32“ | läuft viermal (`make -n check`); #32 nennt HEALTHCHECK nicht, der lokale Branch baut ihn trotzdem |
| Kleinbefunde Code-Gerüst | Ersatz-`DATABASE_URL` an 4 Stellen | 6 (auch `drizzle.config.ts`, CI doppelt) |
| Fachmodell ohne Lizenzstatus | Lösung: Status am Mitglied | Fachmodell sieht für die Lizenzliste ein eigenes Objekt vor |
| Fragen-Tabelle «Anmelden» | betrifft auch K-12.1 | K-12.1 ist umformuliert; dafür K-20, K-38, K-39 |
| Test-ID-Prüfung | zwei Wege (Kommentar, skip) | drei — auch jeder String |
| «Älteres Handy» | gehört ins Testkonzept unter *Testgruppe* | diesen Abschnitt gibt es nicht; #40 legt ihn an |
