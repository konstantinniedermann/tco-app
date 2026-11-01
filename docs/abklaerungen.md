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

**Einsammeln über die Tabelle:** Die Fragen gehen nicht als Liste an den Verein, sondern
über die Google-Tabelle *MyTCO – Fragen an den Verein* im Drive des Projektleiters. Die
Adressaten füllen sie selbst aus. Dafür braucht es ein Google-Konto und eine Einladung als
Bearbeiter: Die Sperre wirkt nur bei angemeldeten Personen, anonyme Bearbeiter über den Link
können alles ändern. Der Link allein erlaubt deshalb nur Lesen. Diese Seite bleibt die
Hauptliste. Die Tabelle dient nur zum Einsammeln.

- **Ein Blatt pro Adressat:** Vorstand, Website & Hoster, Clubmeisterschaft, Lizenzen.
  Pro Frage gibt es eine Auswahlliste und ein Freitextfeld. Immer wählbar sind auch
  „Noch offen“ und „Weiss ich nicht – bitte jemand anderen fragen“.
- **Teilfragen:** Zusammengesetzte Fragen sind in der Tabelle aufgeteilt (K-25 → K-25.1 bis
  K-25.5); die ID hier bleibt gültig.
- **Priorität 1 bis 3:** 1 = gebraucht bis zum Ende *Fundament*, 2 = bis zum ersten Release,
  3 = später. Das entspricht den Abschnitten unten.
- **Wer ist wer:** Welche Person im Verein welche Aufgabe hat, steht nur in der Tabelle,
  nicht im Repo. Die Adressaten korrigieren das Blatt selbst. Dort fragen zwei Spalten,
  ob jemand in der Testgruppe mitmacht (iPhone/Android) und mit welchem Handymodell
  (freiwillig). Ins Repo kommen davon nur Anzahl, Verteilung iPhone/Android und ob ein
  älteres Handy dabei ist (K-20).
- **Gesperrt:** Jedes Blatt ist als Ganzes gesperrt. Frei sind nur die Antwortspalten der
  vorhandenen Fragen und die Einträge auf *Wer ist wer*. Bei neuen Zeilen den freien
  Bereich anpassen.
- **Rückfluss:** Beantwortete Fragen verschiebt der Projektleiter ins ausgeblendete Blatt
  *Beantwortet* (wer, wann, Runde). Hier landen sie im Abschnitt *Beantwortet*, mit Rolle
  statt Namen.
- **Neue Runde:** Neue Fragen zuerst hier eintragen, dann in der Tabelle als Zeile mit der
  nächsten Rundennummer anfügen. Vorher die Tabelle mit dieser Seite und den ADRs
  abgleichen, damit keine überholte Frage hinausgeht.

**Für das Gespräch mit dem Vorstand** zu App und Kosten gibt es eine eigene Seite:
[Entscheidungsgrundlage App-Varianten](recherche/2026-10-29-app-varianten-vorstand.html).

Jeder Abschnitt nennt den **spätesten** Termin für die Antwort. Das Fachmodell (#3)
beschreibt schon im *Fundament* alle Etappen bis zu den Lizenzanträgen; wo dort eine
Antwort fehlt (vor allem K-25, K-27, K-32, K-34), hält es eine Annahme fest und verweist
auf die Frage. Wer eine Antwort früher braucht, fragt früher.

## Vor Ende Fundament (26.11.2026)

Diese Antworten braucht es für die Konzepte und Technik-Entscheide des Milestones *Fundament*.
Dazu gehören auch Fragen zu späteren Etappen, die ein Fundament-Konzept schon braucht
(Rollen, Login-Ablauf, Datenschutz, Store-Erwartung).

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-01 | Passt der Fahrplan des Projektleiters mit den Etappen der Roadmap und ihren Wunschterminen? *Fundament* bis zur ausserordentlichen GV am 26.11.2026, *CM-Betrieb* ab 30.06.2027, mit einem Ausblick auf spätere Saisons. Enthält auch die Reihenfolge der Etappen (früher Teil von K-02). | Vorstand | [Roadmap](roadmap.md) |
| K-02 | Stimmt der Umfang des ersten Releases: Der Projektleiter erfasst die Mitglieder einmal anhand einer Liste vom Vorstand, Login ohne Passwort mit Einmal-Code per Brief, beim ersten Login Daten ergänzen, danach ein Jahr eingeloggt bleiben ([#29](https://github.com/konstantinniedermann/tco-app/issues/29))? Passen die mit \* markierten Etappen und Status in den Anforderungen? (Steht nicht in der Tabelle, weil es die Anforderungsliste voraussetzt: im Gespräch mit dem Vorstand klären.) | Vorstand | [Anforderungen](anforderungen/anforderungen.md), #1 |
| K-43 | Welche Online-Dienste nutzt der Verein heute, bei welchem Anbieter und zu welchen Kosten? Damit lässt sich prüfen, ob MyTCO etwas mitnutzen kann, ob sich Dienste zusammenlegen lassen oder ob MyTCO getrennt läuft. | Vorstand | #9, [ADR-003](adr/adr-003-hosting-infomaniak-vps.md) |
| K-03 | Gilt der Budgetrahmen „niedriger dreistelliger Betrag pro Jahr“? Wer gibt einzelne Posten frei, und wie bezahlt der Verein Online-Dienste (Rechnung, Kreditkarte)? | Vorstand | N-KOSTEN-01, #9 |
| K-04 | Auf wen laufen die Konten (GitHub, Hosting, Domain, E-Mail-Versand)? Gibt es eine Vereinsadresse @tcolten.ch, auf die sie laufen können, und wer hat einen Zweitzugang? | Vorstand, Website-Betreuer | #10 |
| K-05 | Wer betreut MyTCO mit oder übernimmt, falls der Projektleiter ausfällt? | Vorstand | #10 |
| K-06 | Wer ist im Verein für den Datenschutz verantwortlich, und wer gibt die Datenschutzerklärung von MyTCO frei? Gibt es auf tcolten.ch schon eine, an die MyTCO anschliesst? | Vorstand, Website-Betreuer | N-DATENSCHUTZ-01, #5, [Datenschutz](datenschutz.md) |
| K-07 | Welche Mitgliederdaten braucht MyTCO wirklich: Name, E-Mail, Telefon, Postadresse (für den Brief), Geburtsdatum und Geschlecht (für Kategorien), Lizenznummer? Was davon darf fehlen? | Vorstand | #3, #5, [Datenschutz](datenschutz.md) |
| K-08 | Ab wann kommen Junioren in MyTCO, und wer loggt sich für Minderjährige ein (Eltern)? | Vorstand | [Rollen und Rechte](rollen-und-rechte.md), #5, [Datenschutz](datenschutz.md) |
| K-44 | Liegt der Programmcode der Website tcolten.ch auf GitHub oder einer ähnlichen Plattform, und kann der Projektleiter Lesezugang erhalten? So lässt sich prüfen, was MyTCO davon mitnutzen kann (Logo, Farben, Anmeldung). | Website-Betreuer | N-DESIGN-01, #13 |
| K-09 | Metanet: Was kostet das heutige Paket des Vereins, und gibt es einen Auftragsbearbeitungsvertrag nach nDSG, der auch die E-Mail-Postfächer von tcolten.ch abdeckt? (Das Webhosting kann MyTCO selbst nicht betreiben, [ADR-003](adr/adr-003-hosting-infomaniak-vps.md).) | Website-Betreuer, Hoster | [ADR-003](adr/adr-003-hosting-infomaniak-vps.md), #9, [Datenschutz](datenschutz.md) |
| K-10 | Darf MyTCO unter `my.tcolten.ch` laufen (Server bei Infomaniak), dazu eine Test-Umgebung unter `test.my.tcolten.ch`, und wer verwaltet die DNS-Einträge? | Website-Betreuer | A-LOGIN-04, [ADR-003](adr/adr-003-hosting-infomaniak-vps.md), [CI/CD und Release](ci-cd-und-release.md) |
| K-11 | E-Mail-Versand: Darf MyTCO von einer Adresse @tcolten.ch senden (z. B. Bestätigungen und Einmal-Codes fürs Login, A-LOGIN-10)? Geht das über ein Postfach bei Metanet, und reicht das Tageslimit für eine Mail an alle Mitglieder? Wer setzt die nötigen DNS-Einträge gegen Spam-Verdacht? Sonst versendet MyTCO über Scaleway (EU). | Website-Betreuer, Hoster | N-APP-02, A-LOGIN-10, [ADR-003](adr/adr-003-hosting-infomaniak-vps.md), #9, #29 |
| K-12 | Vorschlag statt zweitem Login-Faktor: Wer die Admin-Oberfläche öffnet, bestätigt höchstens einmal pro Tag mit einem frischen Code per E-Mail ([SI-08](sicherheitskonzept.md#vorgaben)). Passt das? Hat der Verein weitere Sicherheitsvorgaben? | Vorstand | N-SICHERHEIT-01, #6 |
| K-13 | Darf MyTCO Logo, Farben und Schriften von tcolten.ch verwenden, und wer liefert die Dateien? Wie stark soll sich MyTCO farblich abgrenzen? | Website-Betreuer, Vorstand | N-DESIGN-01, #13 |
| K-14 | Ohne Fairgate-Anbindung gibt es zwei Mitgliederlisten. Wer überträgt Ein- und Austritte und Adressänderungen zwischen Fairgate und MyTCO, und ist das für den Verein tragbar? | Vorstand | N-EIGENSTAENDIG-01, #16 |
| K-16 | Wer druckt und verschickt die Briefe mit dem Einmal-Code? Wie kommt ein Mitglied wieder hinein, wenn es länger nicht da war oder ein neues Handy hat? Vorschlag: neuer Code per E-Mail. (Porto: beantwortet.) | Vorstand | A-LOGIN-01, A-LOGIN-10, #6, #9, #29 |
| K-17 | Wie kommen die Mitglieder zum Start in MyTCO, und wie werden Ein- und Austritte später nachgeführt? Vorschläge: Der Projektleiter erfasst sie einmal anhand einer Liste vom Vorstand, oder MyTCO erhält eine Funktion zum Einlesen der Liste, die die Mitgliederverwaltung selbst bedient. Wie viele Mitglieder sind es etwa? (Eine solche Liste liegt nur im gitignorierten Ordner `intern/`, nie im Repo.) | Vorstand | A-MITGLIED-01, #3, #9, #16 |
| K-45 | Kann Fairgate die Mitgliederliste als Excel- oder CSV-Datei ausgeben, und mit welchen Angaben? Davon hängt ab, ob MyTCO die Liste einlesen kann (K-17). Gefragt ist nur, ob es geht. Eine echte Liste kommt nicht ins Repo. | Vorstand (Mitgliederverwaltung) | A-MITGLIED-01, #16, #3 |
| K-18 | Vorschlag: vier Rollen Mitglied, Admin, CM-Verantwortlicher und Lizenzverantwortlicher; eine Person kann mehrere haben, der Admin vertritt die Verantwortlichen. Passt das? Wer übernimmt welche Rolle, und wie viele Admins gibt es? | Vorstand | A-ROLLE, A-LIZENZ-03, A-TURNIER-01, [Rollen und Rechte](rollen-und-rechte.md) |
| K-30 | Stimmt die Zuordnung von Personen zu Aufgaben auf dem Blatt *Wer ist wer* der Tabelle? Davon hängt ab, ob jede Frage bei der richtigen Person landet. Dazu gehören auch die vier Personen, die das Anforderungsdokument mit Vornamen nennt (Registrierung über die Website, Format der Lizenzliste, Spielformen der Kategorien). | Vorstand | [Anforderungen](anforderungen/README.md) |
| K-22 | Erwartet der Verein, dass MyTCO im App Store und bei Google Play steht, und ab wann? | Vorstand | N-APP-04, [ADR-001](adr/adr-001-web-app-zuerst.md) |
| K-23 | Ist der TCO steuerbefreit oder anderweitig behördlich als gemeinnützig anerkannt? Dann könnte Apple die Jahresgebühr der Store-App erlassen. | Vorstand | [ADR-001](adr/adr-001-web-app-zuerst.md) |
| K-37 | Reichen für Benachrichtigungen E-Mail und Push, oder braucht es SMS oder WhatsApp? Die beiden kosten pro Nachricht. | Vorstand | N-APP-02, A-ANMELDUNG-08, A-ANMELDUNG-09, #9 |
| K-38 | Wie lange bleiben Daten nach einem Austritt in MyTCO, und was muss der Verein aufbewahren (z. B. Resultate, Lizenzanträge)? | Vorstand, Ansprechperson Datenschutz | #5, [Datenschutz](datenschutz.md) |
| K-40 | Reicht für Alterskategorien und Lizenzanträge der Jahrgang, oder verlangt Swiss Tennis das volle Geburtsdatum? | Lizenzverantwortlicher, Verantwortliche CM | K-07, #3, [Datenschutz](datenschutz.md) |

## Vor dem ersten Release *Mitglieder-Login* (28.02.2027)

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-19 | Dürfen Mitglieder E-Mail und Telefon selbst ändern? Auch die Adresse, solange Fairgate nicht angebunden ist, und wer überträgt sie dann nach Fairgate? | Vorstand | A-KONTO-01, A-KONTO-02 |
| K-20 | Stellt der Verein eine Testgruppe von 5–10 Mitgliedern unterschiedlichen Alters, mit iPhone und Android, die Brief, Login und Installation vor dem Start ausprobiert? Freiwillige unter den Ausfüllenden melden sich zusätzlich auf *Wer ist wer* (siehe oben); der Vorstand ergänzt mit Mitgliedern ohne Vorwissen. | Vorstand | #11, [ADR-001](adr/adr-001-web-app-zuerst.md) |
| K-21 | An wen wenden sich Mitglieder bei Fragen (Login klappt nicht, Installation auf dem Handy)? | Vorstand | #10 |

## Vor CM-Anmeldung (15.05.2027)

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-24 | Gilt 2027 derselbe CM-Kalender (Anmeldeschluss Anfang Juni, Gruppenspiele bis Anfang August, Finalwochenende Mitte August)? An welchem Datum schliesst die Anmeldung? | Verantwortliche CM | A-ANMELDUNG-07, [Glossar](glossar.md) |
| K-25 | Welche Kategorien und Alterskategorien bietet die CM an, und gibt es je Phase eine eigene Turniernummer? Advantage kennt ein Finaltableau direkt nach den Gruppenspielen; laut Anforderungsdokument eröffnet der TCO fürs Finalwochenende aber neue KO-Turniere. Warum, und bleibt das so? (Nenngeld: beantwortet.) | Verantwortliche CM | A-TURNIER-02, A-TURNIER-03, [Glossar](glossar.md) |
| K-26 | Was läuft heute bei der Clubmeisterschaft am schlechtesten: Anmeldung, Gruppenspiele, Resultate oder Finalwochenende? | Verantwortliche CM | Priorisierung der CM-Etappen |
| K-27 | Höchstens 3 Anmeldungen: Zählt ein Doppel für beide Partner? Muss der Doppelpartner zustimmen, und wer gilt als „verfügbar“? | Verantwortliche CM | A-ANMELDUNG-02, A-ANMELDUNG-04 |
| K-28 | Wie wird die Klassierung bei der Anmeldung festgelegt: gibt der Spieler sie an, oder prüft der CM-Verantwortliche? | Verantwortliche CM | A-ANMELDUNG-03, A-ANMELDUNG-06 |
| K-29 | Dürfen Spieler sich bis zum Anmeldeschluss selbst wieder abmelden oder ummelden? | Verantwortliche CM | A-ANMELDUNG-07 |

## Vor CM-Betrieb (30.06.2027)

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-32 | Muss der Gegner ein gemeldetes Resultat bestätigen? | Verantwortliche CM | A-RESULTAT-04 |
| K-33 | Wurde der Spielplan von Advantage fürs Finalwochenende schon ausprobiert, und was fehlt dort? | Verantwortliche CM | A-SPIELPLAN |
| K-41 | Mit welchem Spielformat laufen die Spiele der CM: zwei Gewinnsätze, dritter Satz als Match-Tiebreak, je Kategorie verschieden? | Verantwortliche CM | A-RESULTAT-03, A-RESULTAT-06, [Fachmodell](fachmodell.md) |

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
| K-39 | Soll der Spielplan des Finalwochenendes öffentlich, also ohne Login, sichtbar sein? Dann stehen Namen der Spieler auf einer öffentlichen Seite. | Vorstand, Ansprechperson Datenschutz | A-SPIELPLAN-08, #5, [Datenschutz](datenschutz.md) |

## Beantwortet

| ID | Frage | Antwort | Von, am | Folgen |
|----|-------|---------|---------|--------|
| K-15 | Wie gut muss MyTCO erreichbar sein? | Keine besonderen Anforderungen. Der TCO ist ein Hobbyverein, alle arbeiten ehrenamtlich; ist MyTCO einmal kurz nicht erreichbar, nimmt man das in Kauf. | Projektleiter, 30.10.2026 | N-BETRIEB-01; Server ohne SLA reicht ([ADR-003](adr/adr-003-hosting-infomaniak-vps.md)), #10 |
| K-16 (Teil) | Wer trägt das Porto für die Briefe? | Der Verein | Projektleiter, 30.10.2026 | #9 |
| K-25 (Teil) | Gibt es ein Nenngeld, und soll MyTCO festhalten, wer bezahlt hat? | Kein Nenngeld, also auch nichts festzuhalten | Projektleiter, 30.10.2026 | [Glossar](glossar.md) |
| K-31 | Dürfen Spieler die Kontaktdaten ihrer Gegner und Doppelpartner sehen, und braucht es dafür eine Einwilligung? | Ja, E-Mail und Telefon bis zum Ende der CM, ohne weitere Einwilligung | Projektleiter, 30.10.2026 | FR-19, [Datenschutz](datenschutz.md) |
| K-42 | Dürfen CM-Verantwortlicher und Lizenzverantwortlicher E-Mail und Telefon aller Mitglieder sehen? | Ja, von allen Mitgliedern | Projektleiter, 30.10.2026 | [Rollen und Rechte](rollen-und-rechte.md), [Datenschutz](datenschutz.md) |
