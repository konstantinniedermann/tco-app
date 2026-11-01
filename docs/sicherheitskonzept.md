[← Übersicht](index.md)

# Sicherheitskonzept

Was MyTCO schützt, vor wem und womit. Die Vorgaben `SI-NN` sind verbindlich für ADRs, Code
und Tests; sie ergänzen die Datenschutz-Vorgaben `DS-NN` im
[Datenschutzkonzept](datenschutz.md). Massstab ist eine Vereinsapp: Schutz gegen
naheliegende Angriffe, kein Hochsicherheitsbetrieb.

**Vorschlag K-NN** = vom Vorstand noch zu bestätigen, Frage in den [Abklärungen](abklaerungen.md).

## Was geschützt wird

| Was | Warum |
|-----|-------|
| Mitgliederdaten | Adressen, E-Mail, Telefon, Jahrgang aller Mitglieder ([Welche Daten](datenschutz.md#welche-daten)) |
| Konten mit erweiterten Rollen | Admin, CM- und Lizenzverantwortliche sehen Daten aller Mitglieder ([Rollen und Rechte](rollen-und-rechte.md)) |
| Server und Auslieferung | Wer ausliefern kann, kommt an alle Daten ([CI/CD](ci-cd-und-release.md#schutz-des-auslieferungswegs)) |

## Bedrohungen und Massnahmen

| Nr | Bedrohung | Massnahme |
|----|-----------|-----------|
| B-01 | Ein Bot probiert Brief-Codes durch | 50 Bit pro Code, Limit pro IP (SI-01, SI-02) |
| B-02 | Jemand fordert massenhaft Mail-Codes an oder prüft, ob eine Adresse Mitglied ist | Immer dieselbe Antwort, Limits pro Adresse und IP (SI-04) |
| B-03 | Ein Brief wird aus dem Briefkasten gestohlen und der Code zuerst benutzt | Das Mitglied sieht beim eigenen Versuch «Code schon benutzt» und meldet sich; der Admin beendet die fremde Sitzung und stellt einen neuen Brief aus (SI-02, SI-07) |
| B-04 | Ein Handy mit offener Sitzung gerät in fremde Hände | Admin beendet alle Sitzungen des Kontos; der Admin-Bereich verlangt zusätzlich einen frischen Mail-Code (SI-07, SI-08) |
| B-05 | Das Sitzungs-Cookie wird gestohlen oder eine fremde Seite löst Aktionen aus | Cookie für Skripte unlesbar, nur eigene Inhalte, Herkunftsprüfung (SI-06, SI-10) |
| B-06 | Jemand mit fremder Sitzung ändert die E-Mail-Adresse auf seine eigene und übernimmt das Konto dauerhaft | Die Änderung braucht je einen Code an die alte und an die neue Adresse; wer nur die Sitzung hat, kommt nicht an den Code der alten (SI-09) |
| B-07 | Ein Mitglied ruft per manipulierter Anfrage fremde Daten ab | Server prüft Rolle und Objektbezug bei jedem Zugriff (SI-11) |
| B-08 | Ein Admin oder Mitglied ändert Daten irrtümlich oder missbräuchlich | Änderungsverlauf (SI-12); wenige Konten mit erweiterten Rollen (K-18) |
| B-09 | Angriff auf den Server über SSH, offene Ports oder veraltete Software | Härtung (SI-13) |
| B-10 | Ein Schadpaket gelangt über eine Abhängigkeit in die App oder die CI | Prüfung der Pakete und getrennter Auslieferungs-Job (SI-14) |
| B-11 | Ein GitHub-, Hosting- oder Mailkonto wird geknackt | Zwei-Faktor-Login auf allen Betriebskonten (SI-15); Restrisiko siehe unten |
| B-12 | Wer Zugang zum Server hat, liest die Live-Datenbank direkt | Zugang nur für den Betrieb, keine Kopien (SI-16) |

## Login

Ablauf nach [#29](https://github.com/konstantinniedermann/tco-app/issues/29) für die Etappe
*Mitglieder-Login*; Werte in den Vorgaben unten.

```mermaid
flowchart TD
  B[Brief mit QR-Code und Brief-Code] --> C[Code in der App eintippen]
  C --> G{Code gültig und unbenutzt?}
  G -->|nein| F[Fehlversuch zählen, Limit pro IP oder pro Code]
  G -->|ja| S[Sitzung ein Jahr, verlängert sich bei Nutzung]
  S -->|ausgeloggt oder neues Handy| E[E-Mail-Adresse eingeben]
  E --> A[Immer dieselbe Antwort]
  A -->|Konto besteht| M[Mail-Code, 15 Minuten gültig]
  M --> C
  S -->|Admin-Bereich öffnen| Q{Bestätigung jünger als 24 Stunden?}
  Q -->|ja| R[Admin-Bereich]
  Q -->|nein| N[Frischer Mail-Code] --> R
```

| | Brief-Code | Mail-Code |
|---|---|---|
| Form | 10 Zeichen ohne verwechselbare Zeichen (kein 0/O/1/I/L), rund 50 Bit | 6 Ziffern |
| Gültig | 90 Tage | 15 Minuten |
| Eingabe | ohne E-Mail-Adresse | nach Eingabe der E-Mail-Adresse |
| Bremse | 10 Fehlversuche pro IP und Stunde | 5 Fehlversuche, dann ungültig; höchstens 3 Code-Mails pro Stunde und 10 pro Tag je Adresse |

Beide Codes gelten nur einmal, sind nur als Hash gespeichert, und ein neuer Code ersetzt den
alten desselben Kontos (RR-04, FR-24). «Hash» heisst mit geheimem Server-Schlüssel (HMAC),
damit ein Datenbank-Leck die 50 Bit des Brief-Codes nicht durchrechenbar macht.

## Vorgaben

| ID | Vorgabe |
|----|---------|
| SI-01 | Codes und Sitzungskennungen stammen aus einem kryptografisch sicheren Zufallsgenerator; Codes nur als HMAC gespeichert. Werte wie in der Tabelle [Login](#login) |
| SI-02 | Der Brief-Code ist an kein eingegebenes Konto gebunden, darum gibt es keine Sperre pro Konto, sondern höchstens 10 Fehlversuche pro IP und Stunde. Ein schon benutzter Code meldet «Code schon benutzt — wende dich an [Kontakt, K-21]» |
| SI-03 | Ein Mail-Code ist nach 5 Fehlversuchen ungültig; das Mitglied fordert einen neuen an |
| SI-04 | Code anfordern: für bekannte und unbekannte Adressen dieselbe Antwort und dieselbe Antwortzeit; höchstens 3 Code-Mails pro Adresse und Stunde und 10 pro Tag, 10 Anfragen pro IP und Stunde. IP-Adressen nur dafür, höchstens 24 Stunden (DS-06) |
| SI-05 | Logs enthalten keine Codes, Sitzungskennungen oder Kontaktdaten (DS-06); Fehlversuche werden gezählt, nicht mit Inhalt geloggt |
| SI-06 | Sitzung: Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, ein Jahr gleitend (A-LOGIN-09); beim Login eine neue Kennung; Logout beendet die Sitzung auf diesem Gerät |
| SI-07 | Widerruf über die Sitzungsversion (FR-24): Sperre und Austritt erhöhen sie automatisch, der Admin von Hand (Handy verloren, Code gestohlen) |
| SI-08 | Wer die Admin-Oberfläche öffnet (alle Rollen über *Mitglied*, RR-07), bestätigt höchstens einmal pro 24 Stunden mit einem frischen Mail-Code. Gilt für die Sitzung auf diesem Gerät (Projektleiter, 01.11.2026; **Vorschlag K-12**) |
| SI-09 | Eine E-Mail-Adresse gehört zu höchstens einem Mitglied (FR-25). Ändert ein Mitglied seine Adresse, gilt die neue erst, wenn es je einen Code von der alten und von der neuen Adresse eingetippt hat (Werte wie beim Mail-Code). Ist die alte nicht mehr erreichbar, ändert der Admin die Adresse nach Rückfrage beim Mitglied, z. B. per Telefon; die alte erhält dann einen Hinweis «Falls du das nicht warst, melde dich bei …» |
| SI-10 | Nur HTTPS mit HSTS. Content-Security-Policy erlaubt nur die eigene Adresse (DS-03). Ändernde Anfragen nur mit passender Herkunft (Schutz vor gefälschten Anfragen fremder Seiten); Eingaben von Mitgliedern werden nie als HTML ausgegeben |
| SI-11 | Rechte prüft der Server bei jedem Zugriff nach Rolle und Objektbezug (RR-06); die Oberfläche blendet nur aus |
| SI-12 | Der Änderungsverlauf hält fest, wer (Admin, Mitglied oder automatisch) bei welchem Mitglied wann welches Feld geändert oder welche Aktion ausgelöst hat (Umfang FR-26: z. B. neuer Brief-Code, Sitzungen beendet, Export); ohne alte oder neue Werte, ohne Login-Vorgänge. Nur Admins sehen ihn; Aufbewahrung 12 Monate (FR-26, [Löschen](datenschutz.md#löschen)) |
| SI-13 | Server ([#32](https://github.com/konstantinniedermann/tco-app/issues/32)): SSH nur mit Schlüssel, kein Root-Login über SSH, Firewall offen nur für 22, 80, 443; automatische Sicherheits-Updates; Datenbanken nur im internen Docker-Netz; Test und Live getrennt ([CI/CD](ci-cd-und-release.md#umgebungen)) |
| SI-14 | Abhängigkeiten, Auslieferung und Geheimnisse nach [CI/CD](ci-cd-und-release.md#abhängigkeiten): neue Pakete nur mit Freigabe, Installation ohne Paket-Skripte, Malware-Prüfung, nur der Auslieferungs-Job hat den Schlüssel, Geheimnisse nie im Repo (Secret-Scan); die CI meldet nur «ok» oder «Fehler», keine App-Logs (Logs liegen bei GitHub in den USA) |
| SI-15 | Zwei-Faktor-Login auf allen Konten für Betrieb und Code: GitHub (alle mit Schreibrecht), Infomaniak, E-Mail-Versand, Domain |
| SI-16 | Direkter Zugriff auf die Live-Datenbank nur über SSH auf den Server, nur der Projektleiter und seine Stellvertretung (K-05), nur für Betrieb und Fehlersuche; keine Kopien der Daten auf eigene Geräte (DS-08). Er steht nicht in der Matrix von [Rollen und Rechte](rollen-und-rechte.md), weil er ausserhalb der App liegt |

Prüfbare Vorgaben erhalten Tests, wie die `DS-NN` ([Testkonzept](testkonzept.md#anforderung--testfall)).

## Restrisiken

Bewusst angenommen (Projektleiter, 01.11.2026):

- **Wer das Postfach hat, hat das Konto.** Folge des Logins ohne Passwort; Zwei-Faktor-Login
  für alle kommt später (A-LOGIN-06).
- **Ein entsperrtes Handy mit offenem Mailprogramm** überwindet auch SI-08 und SI-09. Beide
  schützen vor allem gegen ein gestohlenes Cookie auf einem anderen Gerät; dagegen hilft erst
  ein Faktor wie ein Passkey (A-LOGIN-07). Ein SMS-Code hilft nicht, die SMS käme aufs selbe
  Handy (Projektleiter, 01.11.2026).
- **Schreibrecht auf GitHub reicht bis Live.** Ohne GitHub Pro kann jedes Konto mit
  Schreibrecht direkt auf `main` pushen oder einen Workflow mit dem Live-Schlüssel schreiben
  ([CI/CD](ci-cd-und-release.md#schutz-des-auslieferungswegs)). Angenommen unter zwei
  Bedingungen: Zwei-Faktor-Login auf beiden Konten (SI-15), und die Hauptansprechperson im
  Vorstand nutzt ihren Zugang nur zum Lesen (Absprache). Neu bewerten, sobald K-04 (wem
  gehören die Konten) beantwortet ist.
- **Ein Schadpaket im Bau** landet im Image und läuft live, auch ohne Schlüssel; dagegen
  hilft nur SI-14.

## Später

- Zwei-Faktor-Login oder Passkeys für alle (A-LOGIN-06, A-LOGIN-07).
- Store-App: Cookies und CORS unter der Adresse der Hülle
  ([ADR-002](adr/adr-002-sveltekit-postgresql.md#konsequenzen)) klärt der Entscheid zur
  Store-App, nicht dieses Konzept.

## Offene Fragen an den Verein

K-04 (Konten), K-05 (Stellvertretung), K-12 (Admin-Bestätigung, weitere Vorgaben), K-16
(Briefversand, Weg zurück per Mail-Code), K-18 (wer welche Rolle), K-21 (Kontakt bei Login-Problemen) — alle in den
[Abklärungen](abklaerungen.md).
