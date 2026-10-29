[← Übersicht](index.md)

# Abklärungen beim Verein

Der Projektleiter kann jederzeit beim **Vorstand**, beim **Website-Betreuer** von
tcolten.ch, beim **Hoster** der Website (Metanet, über den Verein als Kunden) und bei den
Verantwortlichen von Clubmeisterschaft und Lizenzen nachfragen. Hier steht, was zu klären
ist, bei wem und bis wann. Fragen haben eine feste ID (`K-NN`), auf die Issues verweisen.

**So wird die Liste gepflegt:**

- Vor jeder Entscheidung prüfen, ob eine Rückfrage beim Verein Bedürfnisse schärft, Kosten
  feststellt oder eine Annahme ersetzt (siehe [Issue-Konventionen](issue-konventionen.md#abklärungen-beim-verein)).
  Wenn ja: Frage hier eintragen und im Issue auf die ID verweisen.
- Beantwortete Fragen wandern mit Datum und Antwort in den Abschnitt *Beantwortet*; was
  sich an den Anforderungen ändert, kommt ins [Änderungsprotokoll](anforderungen/README.md#änderungsprotokoll).
- Personen werden mit ihrer Rolle benannt, nicht mit Namen.

**Für das Gespräch mit dem Vorstand** zu App und Kosten gibt es eine eigene Seite:
[Entscheidungsgrundlage App-Varianten](recherche/2026-10-29-app-varianten-vorstand.html).

Jeder Abschnitt nennt den **spätesten** Termin für die Antwort. Das Fachmodell (#3)
beschreibt schon im *Fundament* alle Etappen bis zu den Lizenzanträgen; wo dort eine
Antwort fehlt (vor allem K-25, K-27, K-32, K-34), hält es eine Annahme fest und verweist
auf die Frage. Wer eine Antwort früher braucht, fragt früher.

## Vor Ende Fundament (15.12.2026)

Diese Antworten braucht es für die Konzepte und Technik-Entscheide des Milestones *Fundament*.
Dazu gehören auch Fragen zu späteren Etappen, die ein Fundament-Konzept schon braucht
(Rollen, Login-Ablauf, Datenschutz, Store-Erwartung).

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-01 | Gelten die Termine *Fundament* (15.12.2026) und *CM-Betrieb* (30.06.2027)? | Vorstand | [Roadmap](roadmap.md) |
| K-02 | Stimmt der Umfang des ersten Releases: Admin legt Mitglieder von Hand an, Login mit Einmalpasswort per Brief, beim ersten Login Passwort ändern und Daten ergänzen? Passen die mit \* markierten Etappen und Status in den Anforderungen? | Vorstand | [Anforderungen](anforderungen/anforderungen.md), #1 |
| K-03 | Gilt der Budgetrahmen „niedriger dreistelliger Betrag pro Jahr“? Wer gibt einzelne Posten frei, und wie bezahlt der Verein Online-Dienste (Rechnung, Kreditkarte)? | Vorstand | N-KOSTEN-01, #9 |
| K-04 | Auf wen laufen die Konten (GitHub, Hosting, Domain, E-Mail-Versand)? Gibt es eine Vereinsadresse @tcolten.ch, auf die sie laufen können, und wer hat einen Zweitzugang? | Vorstand, Website-Betreuer | #10 |
| K-05 | Wer betreut MyTCO mit oder übernimmt, falls der Projektleiter ausfällt? | Vorstand | #10 |
| K-06 | Wer ist im Verein für den Datenschutz verantwortlich, und wer gibt die Datenschutzerklärung von MyTCO frei? Gibt es auf tcolten.ch schon eine, an die MyTCO anschliesst? | Vorstand, Website-Betreuer | N-DATENSCHUTZ-01, #5 |
| K-07 | Welche Mitgliederdaten braucht MyTCO wirklich: Name, E-Mail, Telefon, Postadresse (für den Brief), Geburtsdatum und Geschlecht (für Kategorien), Lizenznummer? Was davon darf fehlen? | Vorstand | #3, #5 |
| K-08 | Ab wann kommen Junioren in MyTCO, und wer loggt sich für Minderjährige ein (Eltern)? | Vorstand | #4, #5 |
| K-09 | Hosting bei Metanet: Welches Paket hat der Verein, was kostet es heute, welche Technik bietet es (PHP, Node.js, Python, Datenbank, SSH, Backups)? Darf MyTCO dort getrennt von der Website laufen? Gibt es einen Auftragsverarbeitungsvertrag nach nDSG? | Website-Betreuer, Hoster | #8, #9, #5 |
| K-10 | Darf MyTCO unter `my.tcolten.ch` laufen, und wer verwaltet die DNS-Einträge? | Website-Betreuer | A-LOGIN-04, #8 |
| K-11 | E-Mail-Versand: Darf MyTCO von einer Adresse @tcolten.ch senden (z. B. Bestätigungen)? Geht das über das bestehende Hosting, mit welchem Limit? Wer setzt die nötigen DNS-Einträge gegen Spam-Verdacht? | Website-Betreuer, Hoster | N-APP-02, #8, #9 |
| K-12 | Ist ein zweiter Login-Faktor für Admins zumutbar? Hat der Verein weitere Sicherheitsvorgaben? | Vorstand | N-SICHERHEIT-01, #6 |
| K-13 | Darf MyTCO Logo, Farben und Schriften von tcolten.ch verwenden, und wer liefert die Dateien? Wie stark soll sich MyTCO farblich abgrenzen? | Website-Betreuer, Vorstand | N-DESIGN-01, #13 |
| K-14 | Ohne Fairgate-Anbindung gibt es zwei Mitgliederlisten. Wer überträgt Ein- und Austritte und Adressänderungen zwischen Fairgate und MyTCO, und ist das für den Verein tragbar? | Vorstand | N-EIGENSTAENDIG-01, #16 |
| K-15 | Wie gut muss MyTCO erreichbar sein, besonders während Anmeldung, Gruppenspielen und Finalwochenende? Was passiert, wenn es einen Abend ausfällt? | Vorstand | N-BETRIEB-01, #10 |
| K-16 | Wer druckt und verschickt die Briefe mit den Zugangsdaten, und wer trägt das Porto? Wie kommt ein Mitglied wieder hinein, wenn es sein Passwort vergessen hat: neuer Brief oder E-Mail? | Vorstand | A-LOGIN-01, #6, #9 |
| K-17 | Wie kommen die Mitglieder zum Start in MyTCO: von Hand abtippen oder einmal aus einer Fairgate-Liste übernehmen? Wie viele Mitglieder sind es etwa? (Eine solche Liste liegt nur im gitignorierten Ordner `intern/`, nie im Repo.) | Vorstand | A-MITGLIED-01, #3, #9 |
| K-18 | Wer wird Admin, und wie viele Personen sind das? Sind Lizenzverantwortlicher und Verantwortliche der Clubmeisterschaft eigene Rollen oder Admin bzw. Anlässe-Veranstalter? Darf eine Person mehrere Rollen haben? | Vorstand | A-ROLLE, A-LIZENZ-03, A-TURNIER-01, #4 |
| K-22 | Erwartet der Verein, dass MyTCO im App Store und bei Google Play steht, und ab wann? | Vorstand | N-APP-04, [ADR-001](adr/adr-001-web-app-zuerst.md) |
| K-23 | Ist der TCO steuerbefreit oder anderweitig behördlich als gemeinnützig anerkannt? Dann könnte Apple die Jahresgebühr der Store-App erlassen. | Vorstand | [ADR-001](adr/adr-001-web-app-zuerst.md) |
| K-31 | Dürfen Spieler die Kontaktdaten ihrer Gegner und Doppelpartner sehen, und braucht es dafür eine Einwilligung? | Vorstand, Datenschutzverantwortliche | N-DATENSCHUTZ-02, A-RESULTAT-02, #5 |
| K-37 | Reichen für Benachrichtigungen E-Mail und Push, oder braucht es SMS oder WhatsApp? Die beiden kosten pro Nachricht. | Vorstand | N-APP-02, A-ANMELDUNG-08, A-ANMELDUNG-09, #9 |
| K-38 | Wie lange bleiben Daten nach einem Austritt in MyTCO, und was muss der Verein aufbewahren (z. B. Resultate, Lizenzanträge)? | Vorstand, Datenschutzverantwortliche | #5 |

## Vor dem ersten Release *Mitglieder-Login* (28.02.2027)

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-19 | Dürfen Mitglieder E-Mail und Telefon selbst ändern? Auch die Adresse, solange Fairgate nicht angebunden ist, und wer überträgt sie dann nach Fairgate? | Vorstand | A-KONTO-01, A-KONTO-02 |
| K-20 | Stellt der Verein eine Testgruppe von 5–10 Mitgliedern unterschiedlichen Alters, mit iPhone und Android, die Brief, Login und Installation vor dem Start ausprobiert? | Vorstand | #11, [ADR-001](adr/adr-001-web-app-zuerst.md) |
| K-21 | An wen wenden sich Mitglieder bei Fragen (Passwort vergessen, Installation auf dem Handy)? | Vorstand | #10 |

## Vor CM-Anmeldung (15.05.2027)

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-24 | Gilt 2027 derselbe CM-Kalender (Anmeldeschluss Anfang Juni, Gruppenspiele bis Anfang August, Finalwochenende Mitte August)? An welchem Datum schliesst die Anmeldung? | Verantwortliche CM | A-ANMELDUNG-07, [Glossar](glossar.md) |
| K-25 | Welche Kategorien und Alterskategorien bietet die CM an, gibt es ein Nenngeld, und gibt es je Phase eine eigene Turniernummer? Advantage kennt ein Finaltableau direkt nach den Gruppenspielen; laut Anforderungsdokument eröffnet der TCO fürs Finalwochenende aber neue KO-Turniere. Warum, und bleibt das so? Soll MyTCO festhalten, wer das Nenngeld bezahlt hat? | Verantwortliche CM | A-TURNIER-02, A-TURNIER-03, [Glossar](glossar.md) |
| K-26 | Was läuft heute bei der Clubmeisterschaft am schlechtesten: Anmeldung, Gruppenspiele, Resultate oder Finalwochenende? | Verantwortliche CM | Priorisierung der CM-Etappen |
| K-27 | Höchstens 3 Anmeldungen: Zählt ein Doppel für beide Partner? Muss der Doppelpartner zustimmen, und wer gilt als „verfügbar“? | Verantwortliche CM | A-ANMELDUNG-02, A-ANMELDUNG-04 |
| K-28 | Wie wird die Klassierung bei der Anmeldung festgelegt: gibt der Spieler sie an, oder prüft der Admin? | Verantwortliche CM | A-ANMELDUNG-03, A-ANMELDUNG-06 |
| K-29 | Dürfen Spieler sich bis zum Anmeldeschluss selbst wieder abmelden oder ummelden? | Verantwortliche CM | A-ANMELDUNG-07 |
| K-30 | Das Anforderungsdokument nennt vier Personen mit Vornamen (Registrierung über die Website, Format der Lizenzliste, Spielformen der Kategorien). Welche Rolle hat jede im Verein? | Vorstand | [Anforderungen](anforderungen/README.md) |

## Vor CM-Betrieb (30.06.2027)

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-32 | Muss der Gegner ein gemeldetes Resultat bestätigen? | Verantwortliche CM | A-RESULTAT-04 |
| K-33 | Wurde der Spielplan von Advantage fürs Finalwochenende schon ausprobiert, und was fehlt dort? | Verantwortliche CM | A-SPIELPLAN |

## Vor Lizenzanträgen (01.10.2027)

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-34 | Ist das Storno einer Lizenz dasselbe wie die Sistierung bei Swiss Tennis (Frist Ende Februar)? Welcher Stichtag gilt für die Liste der Anträge? | Lizenzverantwortlicher | A-LIZENZ-02, A-LIZENZ-03 |

## Nur falls eine Store-App kommt

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-35 | Tritt der Verein als Herausgeber in den Stores auf? Wer darf für ihn bei Apple und Google unterschreiben, und wer beantragt die D-U-N-S-Nummer? | Vorstand | N-APP-04, [ADR-001](adr/adr-001-web-app-zuerst.md), #10 |

## Später

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-36 | Was gehört zu „Mitgliedschaft ändern“: Austritt, Wechsel der Mitgliederkategorie, anderes? | Vorstand | A-KONTO-04 |
| K-39 | Soll der Spielplan des Finalwochenendes öffentlich, also ohne Login, sichtbar sein? Dann stehen Namen der Spieler auf einer öffentlichen Seite. | Vorstand, Datenschutzverantwortliche | A-SPIELPLAN-08, #5 |

## Beantwortet

_Noch keine._
