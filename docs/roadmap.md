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
| **Fundament** | 26.11.2026 | Anforderungen mit IDs, Glossar, Fachmodell, Rollen und Rechte, Datenschutz- und Sicherheitskonzept, Technik-ADRs, Kosten, Betrieb und Übergabe, Test- und Release-Konzept, arc42, UI-Leitbild. Danach das leere Code-Gerüst mit CI |
| **Mitglieder-Login** | 28.02.2027 | Admin-Rolle mit einer Seite zur Mitgliederverwaltung (Mitglieder von Hand anlegen und bearbeiten). Login für Mitglieder ohne Passwort: Einmal-Code per Brief, beim ersten Login Pflicht zum Ergänzen fehlender Daten, danach eingeloggt bleiben; neuer Code per E-Mail ([#29](https://github.com/konstantinniedermann/tco-app/issues/29)). Freiwillig dazu ein Passkey (A-LOGIN-07) |
| **CM-Anmeldung** | 15.04.2027 | Anmeldung zur Clubmeisterschaft ist offen, auch für Junioren (K-46) |
| **CM-Betrieb** | 01.06.2027 | Datenaustausch mit Swiss Tennis in beide Richtungen, Spieler melden ihre Resultate selbst |
| **Lizenzanträge** | 01.04.2028 | Mitglieder beantragen eine Lizenz oder deren Storno. Der Lizenzverantwortliche sieht zu einem Stichtag die Liste der Anträge, exportiert sie und trägt sie von Hand bei Swiss Tennis ein |
| **Backlog / Optional** | — | Alles ohne festen Termin |

**Termine:** Der Vorstand hat den Fahrplan am 03.11.2026 bestätigt, mit anderen Terminen
(K-01): Die CM-Anmeldung öffnet Mitte April, die Auslosung ist Anfang Juni, damit vor den
Sommerferien genug Zeit bleibt. *CM-Betrieb* muss deshalb bis zur Auslosung stehen. Die
Lizenzanträge beginnen mit dem Saisonstart 2028, damit der Ablauf über die Saison gleich
bleibt. Zwischen *Mitglieder-Login* und *CM-Anmeldung* liegen damit nur sechs Wochen.
Den genauen Anmeldeschluss klärt K-24.

## Vorerst nicht dabei

Aus dem Anforderungsdokument v1.2, bewusst später: Login-Feld auf tcolten.ch,
Newsfeed, Benachrichtigungen per SMS oder WhatsApp, Zwei-Faktor-Login, allgemeine Anlässe,
Lizenzliste als PDF mit Vorjahresvergleich, Planer für das Finalwochenende,
Anbindung an Fairgate, App in den Stores (N-APP-04; MyTCO startet als Web-App, siehe
[ADR-001](adr/adr-001-web-app-zuerst.md)).
Den Newsfeed automatisch aus der WhatsApp-Gruppe zu füllen, ist nicht machbar
([A-NEWSFEED-02](anforderungen/anforderungen.md#newsfeed)).
