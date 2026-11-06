# Dokumentation MyTCO

Die Doku entsteht vor dem Code. Was hier verlinkt ist, existiert; was noch fehlt, ist ein
Issue im Milestone *Fundament*.

## Projekt

| Dokument | Inhalt |
|----------|--------|
| [Roadmap](roadmap.md) | Etappen mit Termin und Umfang |
| [Anforderungen](anforderungen/README.md) | Anforderungsdokument des Vereins, Zielsetzung, Änderungen |
| [Anforderungen mit IDs](anforderungen/anforderungen.md) | Jede Anforderung mit ID, Quelle, Etappe und Status |
| [Abklärungen beim Verein](abklaerungen.md) | Offene Fragen an Vorstand, Website-Betreuer, Hoster und Verantwortliche, nach Fälligkeit |
| [Kosten](kosten.md) | Laufende und einmalige Kosten mit Quelle, Szenarien nach Mitgliederzahl, jährliche Überprüfung |
| [Glossar](glossar.md) | Fachbegriffe von TCO und Swiss Tennis und wie MyTCO sie nennt |
| [Recherche Systemlandschaft](recherche/README.md) | Bestehende Systeme des Vereins, Kosten, kaufen oder bauen (Stand 29.10.2026) |
| [App-Varianten für den Vorstand](recherche/2026-10-29-app-varianten-vorstand.html) | Web-App oder Store-App: Kosten, Budget, offene Fragen an den Vorstand (Stand 29.10.2026) |

## Architektur

| Dokument | Inhalt |
|----------|--------|
| [arc42](arc42.md) | Gesamtbild: Ziele, Kontext mit Nachbarsystemen, Bausteine, Server, Querschnittskonzepte, Risiken — mit Verweisen auf die Einzeldokumente |
| [ADR-Index](adr/adr-index.md) | Architektur-Entscheidungen mit Begründung |
| [Fachmodell](fachmodell.md) | Objekte, Beziehungen, Fachregeln `FR-NN` und Lebenszyklen bis zur Etappe *Lizenzanträge*; Grundlage für Datenbank und Code |
| [Datenschutzkonzept](datenschutz.md) | Was MyTCO mit Personendaten tut, nach nDSG; Vorgaben `DS-NN` für Technik und Hosting; Grundlage für jede neue Funktion |
| [Rollen und Rechte](rollen-und-rechte.md) | Rollen bis zur Etappe *Lizenzanträge*, Grundsätze `RR-NN` und Matrix, wer was sehen und ändern darf |
| [Datenschutzerklärung (Entwurf)](datenschutzerklaerung.md) | Text für die Mitglieder in der App und in den Login-Briefen |
| [CI/CD und Release](ci-cd-und-release.md) | Test- und Live-Umgebung, Ablauf bis live, Prüfungen in der CI, Versionen, alte App-Versionen, Actions-Minuten |
| [Betrieb und Übergabe](betrieb-und-uebergabe.md) | Konten und Eigentum, Geheimnisse, Grundsätze für Sicherung und Überwachung, Übergabe-Checkliste |
| [Sicherheitskonzept](sicherheitskonzept.md) | Bedrohungen und Massnahmen, Login mit Einmal-Code, Vorgaben `SI-NN`, Restrisiken |
| [Testkonzept](testkonzept.md) | Testebenen und Werkzeuge, Abdeckung, Zuordnung Anforderung → Test, Testdaten, Checkliste vor dem Release |
| [Testgruppe](testgruppe.md) | Pilot vor dem Briefversand: Ablauf, Aufträge, Texte für Mail und Chat, Formular, Auswertung |
| [UI-Leitbild](ui-leitbild.md) | Corporate Design: Farben, Schrift, Bausteine, Navigation, Sprache, Barrierefreiheit `UI-NN`; Mockups |

## Arbeitsweise

| Dokument | Inhalt |
|----------|--------|
| [Issue-Konventionen](issue-konventionen.md) | Labels, Milestones, Definition of Done |
| [Context-Scopes](context-scopes.md) | Welche Pfade bei welcher Aufgabe relevant sind |
| [Beobachtungen](beobachtungen.md) | Posteingang für Befunde ausserhalb des Scopes |
| [Beobachtungen — Archiv](beobachtungen-archiv.md) | Ausgewertete Beobachtungen mit Ausgang |
| [Versionen](versionen.md) | Versionshistorie |
