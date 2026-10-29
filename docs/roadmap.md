[← Übersicht](index.md)

# Roadmap

Etappen von MyTCO mit Termin und Umfang. Jede Etappe ist ein GitHub-Milestone; die
einzelnen Aufgaben stehen als Issues darin.

**Grundlage:** Zielsetzung vom 29.10.2026, gestützt auf das Anforderungsdokument v1.2
([`anforderungen/`](anforderungen/README.md)).

**Grundsatz:** MyTCO wird vorerst eigenständig aufgebaut — ohne Anbindung an Fairgate
und ohne Einbindung in tcolten.ch. Mitglieder pflegt der Admin von Hand, solange Fairgate
nicht angebunden ist.

## Etappen

| Milestone | Fällig | Umfang |
|-----------|--------|--------|
| **Fundament** | 15.12.2026 | Anforderungen mit IDs, Glossar, Fachmodell, Rollen und Rechte, Datenschutz- und Sicherheitskonzept, Technik-ADRs, Kosten, Betrieb und Übergabe, Test- und Release-Konzept, arc42, UI-Leitbild. Danach das leere Code-Gerüst mit CI |
| **Mitglieder-Login** | 28.02.2027 | Admin-Rolle mit einer Seite zur Mitgliederverwaltung (Mitglieder von Hand anlegen und bearbeiten). Login für Mitglieder: Einmalpasswort per Brief, beim ersten Login Pflicht zum Passwortwechsel und Ergänzen fehlender Daten |
| **CM-Anmeldung** | 15.05.2027 | Anmeldung zur Clubmeisterschaft ist offen |
| **CM-Betrieb** | 30.06.2027 | Datenaustausch mit Swiss Tennis in beide Richtungen, Spieler melden ihre Resultate selbst |
| **Lizenzanträge** | 01.10.2027 | Mitglieder beantragen eine Lizenz oder deren Storno. Der Lizenzverantwortliche sieht zu einem Stichtag die Liste der Anträge, exportiert sie und trägt sie von Hand bei Swiss Tennis ein |
| **Backlog / Optional** | — | Alles ohne festen Termin |

**Termin-Annahmen:** *Fundament* bis Mitte Dezember ist ein Vorschlag, damit bis Ende
Februar genug Zeit für die Umsetzung bleibt. *CM-Betrieb* bis Ende Juni ist eine
Annahme: Die Gruppenspiele laufen erfahrungsgemäss bis Anfang August, die Funktionen
müssen vorher stehen. Beide Termine werden in der nächsten Sitzung mit dem Verein
bestätigt.

## Vorerst nicht dabei

Aus dem Anforderungsdokument v1.2, bewusst später: Login-Feld auf tcolten.ch,
Newsfeed, Benachrichtigungen per SMS oder WhatsApp, Zwei-Faktor-Login und Passkeys, allgemeine Anlässe,
Lizenzliste als PDF mit Vorjahresvergleich, Planer für das Finalwochenende,
Anbindung an Fairgate.
Den Newsfeed automatisch aus der WhatsApp-Gruppe zu füllen, ist nicht machbar
([A-NEWSFEED-02](anforderungen/anforderungen.md#newsfeed)).
