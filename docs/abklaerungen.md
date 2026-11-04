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

**Annahmen bis zur Antwort:** Wer ohne Antwort weiterarbeitet, markiert die Annahme dort,
wo sie wirkt, in der Doku oder im Code-Kommentar: `Annahme K-NN: <was angenommen ist>`.
Ebenso gelten `Vorschlag K-NN`, `Vermutung K-NN` und `hängt an K-NN` sowie jeder Verweis in
einem Abschnitt *Offene Fragen*. Eine Unterfrage aus der Tabelle wird mit ihrer ID markiert
(`K-25.4`). Ein blosser Verweis `(K-NN)` ohne Stichwort gilt nicht als Annahme.

- `make annahmen` listet alle Annahmen pro Frage, `make annahmen K=K-11` nur die zu einer Frage.
- Die Prüfung in `make docs`, `make check` und der CI schlägt fehl, sobald eine markierte Frage
  unter *Beantwortet* steht. Das gilt auch für die ganze Frage, wenn erst eine Unterfrage
  beantwortet ist. Ebenso schlägt sie bei einer ID fehl, die es hier nicht gibt.
- **Wenn eine Antwort eintrifft:** zuerst `make annahmen K=K-NN`, jede Stelle mit der Antwort
  vergleichen und Abweichungen dem Projektleiter zeigen, dann die Frage nach *Beantwortet*
  verschieben. Jede gemeldete Stelle wird aufgelöst: Die Antwort ersetzt die Annahme, der
  Verweis bleibt als `(K-NN)` ohne Stichwort stehen.
- Teilantworten stehen unter *Beantwortet* mit der ID der Unterfrage (`K-16.2`), eine Zeile
  pro ID. Andere Schreibweisen dort meldet die Prüfung als Fehler.
- Grenze: Die Unterfragen stehen nur in der Tabelle. Eine erfundene Unterfrage einer
  bestehenden Frage (`K-16.9`) fällt der Prüfung nicht auf.

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
  älteres Handy dabei ist (K-20, [Testgruppe](testgruppe.md#zusammensetzung)).
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
| K-02 | Passen die mit \* markierten Etappen und Status in den Anforderungen? (Steht nicht in der Tabelle, weil es die Anforderungsliste voraussetzt: im Gespräch mit dem Vorstand klären. Den Ablauf des ersten Releases beantwortet K-02.1.) | Vorstand | [Anforderungen](anforderungen/anforderungen.md), #1 |
| K-43 | Welche Online-Dienste nutzt der Verein heute, bei welchem Anbieter und zu welchen Kosten? Damit lässt sich prüfen, ob MyTCO etwas mitnutzen kann, ob sich Dienste zusammenlegen lassen oder ob MyTCO getrennt läuft. | Vorstand | #9, [ADR-003](adr/adr-003-hosting-infomaniak-vps.md) |
| K-03 | Wie viel darf MyTCO pro Jahr höchstens kosten? Wer gibt einzelne Posten frei, und wie bezahlt der Verein Online-Dienste (Rechnung, Kreditkarte)? Stand 03.11.2026: entscheidet die Vorstandssitzung vom 16.11.2026; die Hauptansprechperson nennt CHF 300–500 pro Jahr und wünscht vorher die Schätzung aus den [Kosten](kosten.md). Die Schätzung ging am 04.11.2026 an die Hauptansprechperson (Startjahr ca. CHF 110–225, danach ca. 100–175), zusammen mit der Bitte um die Metanet-Kosten (K-09.1) für die Sitzung. Laut Statuten Art. 39 beschliesst der Vorstand selbst nur unvorhergesehene, nicht wiederkehrende Ausgaben ([Recherche tcolten.ch](recherche/2026-11-04-tcolten-website.md)); laufende Kosten gehören vermutlich ins Budget der Generalversammlung. | Vorstand | N-KOSTEN-01, #9 |
| K-06 | Wer ist im Verein Ansprechperson für den Datenschutz (Stand 03.11.2026: noch nicht bestimmt, der Vorstand bestimmt sie)? Gibt es auf tcolten.ch schon eine Datenschutzerklärung, an die MyTCO anschliesst? Stand 04.11.2026 von aussen: nein, weder Seite noch Link, nur ein Impressum ([Recherche tcolten.ch](recherche/2026-11-04-tcolten-website.md)); bestätigen lassen. (Freigabe: K-06.2 beantwortet.) | Vorstand, Website-Betreuer | N-DATENSCHUTZ-01, #5, [Datenschutz](datenschutz.md) |
| K-08 | Junioren haben ab der CM 2027 ein Konto (K-46). Vorschlag: Ein Mitglied erfasst sein Kind in MyTCO und erledigt für es das Administrative (Daten, CM-Anmeldung); ab einem Alter, das der Verein festlegt, erhält der Junior ein eigenes Login und braucht dann eine eigene E-Mail-Adresse (FR-25). Ab welchem Alter (z. B. 12, 14 oder 16)? Die Statuten kennen Schüler bis Ende des Jahres des 12. und Junioren bis Ende des Jahres des 18. Geburtstags (Art. 8, 9); die Grenze Schüler/Junioren läge nahe. Was gilt, wenn die Eltern nicht Mitglied sind? Die Altersgrenze kommt in die Datenschutzerklärung. | Vorstand | [Rollen und Rechte](rollen-und-rechte.md), #5, [Datenschutz](datenschutz.md#junioren), [#45](https://github.com/konstantinniedermann/tco-app/issues/45) |
| K-44 | Liegt der Programmcode der Website tcolten.ch auf GitHub oder einer ähnlichen Plattform, und kann der Projektleiter Lesezugang erhalten? So lässt sich prüfen, was MyTCO davon mitnutzen kann (Logo, Farben, Anmeldung) und ob sich die Website mit umziehen liesse (K-48). | Website-Betreuer | N-DESIGN-01, #13, K-48 |
| K-09 | Metanet: Was kostet das heutige Paket des Vereins, und gibt es einen Auftragsbearbeitungsvertrag nach nDSG, der auch die E-Mail-Postfächer von tcolten.ch abdeckt? (Das Webhosting kann MyTCO selbst nicht betreiben, [ADR-003](adr/adr-003-hosting-infomaniak-vps.md).) | Website-Betreuer, Hoster | [ADR-003](adr/adr-003-hosting-infomaniak-vps.md), #9, [Datenschutz](datenschutz.md) |
| K-48 | Website-Umzug: Lässt sich tcolten.ch von Metanet zu Infomaniak umziehen, damit Website und MyTCO bei einem Anbieter laufen? Womit läuft die Website (Sprache, Datenbank, Admin-Bereich; Stand 04.11.2026 von aussen: eigene Programmierung mit Admin-Bereich und News aus einer Datenbank)? Wer betreut sie nach einem Umzug? Ziehen die E-Mail-Postfächer @tcolten.ch mit (sie laufen heute auf demselben Metanet-Server wie die Website), und wie viele sind es? Wo ist die Domain registriert (Stand 04.11.2026 laut nic.ch: bei hosttech, nicht bei Metanet; die Nameserver liegen bei Metanet), wer ist dort Inhaber, und welche Laufzeit und Kündigungsfrist hat das Metanet-Paket? Ob sich ein Umzug lohnt, zeigen erst die Kosten aus K-09. | Website-Betreuer, Vorstand | #9, [ADR-003](adr/adr-003-hosting-infomaniak-vps.md), [Kosten](kosten.md), K-44 |
| K-10 | Darf MyTCO unter `my.tcolten.ch` laufen (Server bei Infomaniak), dazu eine Test-Umgebung unter `test.my.tcolten.ch`, und wer verwaltet die DNS-Einträge? Stand 04.11.2026: Die Nameserver liegen bei Metanet, `my.tcolten.ch` zeigt schon auf den Website-Server ([Recherche tcolten.ch](recherche/2026-11-04-tcolten-website.md)). | Website-Betreuer | A-LOGIN-04, [ADR-003](adr/adr-003-hosting-infomaniak-vps.md), [CI/CD und Release](ci-cd-und-release.md) |
| K-11 | E-Mail-Versand: Darf MyTCO von einer Adresse @tcolten.ch senden (z. B. Bestätigungen und Einmal-Codes fürs Login, A-LOGIN-10)? Geht das über ein Postfach bei Metanet, und reicht das Tageslimit für eine Mail an alle Mitglieder? Wer setzt die nötigen DNS-Einträge gegen Spam-Verdacht? Stand 04.11.2026: SPF erlaubt Metanet und Fairgate, DMARC fehlt ([Recherche tcolten.ch](recherche/2026-11-04-tcolten-website.md)); ein Versanddienst für MyTCO käme in denselben SPF-Eintrag. Sonst versendet MyTCO über Scaleway (EU). | Website-Betreuer, Hoster | N-APP-02, A-LOGIN-10, [ADR-003](adr/adr-003-hosting-infomaniak-vps.md), #9, #29 |
| K-12 | Hat der Verein weitere Sicherheitsvorgaben? Stand 03.11.2026: kommt an die Vorstandssitzung vom 16.11.2026. (Admin-Bestätigung per Mail-Code: K-12.1 beantwortet.) | Vorstand | N-SICHERHEIT-01, #6 |
| K-13 | Darf MyTCO Logo, Farben und Schriften von tcolten.ch verwenden, und wer liefert die Dateien? Wie stark soll sich MyTCO farblich abgrenzen? | Website-Betreuer, Vorstand | N-DESIGN-01, #13 |
| K-16 | Wer druckt und verschickt die Briefe mit dem Einmal-Code? (Porto und neuer Code per E-Mail: beantwortet.) | Vorstand | A-LOGIN-01, #6, #9, #29 |
| K-45 | Kann Fairgate die Mitgliederliste als Excel- oder CSV-Datei ausgeben, und mit welchen Angaben? Davon hängt ab, ob MyTCO die Liste einlesen kann (K-17). Gefragt ist nur, ob es geht. Führt Fairgate eine feste Mitgliedernummer, und ist sie im Export? Eine echte Liste kommt nicht ins Repo. | Vorstand (Mitgliederverwaltung) | A-MITGLIED-01, #16, #3, [#46](https://github.com/konstantinniedermann/tco-app/issues/46) |
| K-18 | Wer übernimmt welche Rolle? Stand 03.11.2026: ein erster Vorschlag des Vorstands auf der Tabelle, noch nicht festgelegt (Admins: Projektleiter und Hauptansprechperson). Offen dabei: Die Mitgliederverwaltung soll später die Mitgliederliste einlesen (K-17.1, A-MITGLIED-07) und braucht dafür die Rolle Admin. (Rollen und Anzahl Admins: beantwortet.) | Vorstand | A-ROLLE, A-LIZENZ-03, A-TURNIER-01, [Rollen und Rechte](rollen-und-rechte.md), [#43](https://github.com/konstantinniedermann/tco-app/issues/43) |
| K-30 | Stimmt die Zuordnung von Personen zu Aufgaben auf dem Blatt *Wer ist wer* der Tabelle? Davon hängt ab, ob jede Frage bei der richtigen Person landet. Dazu gehören auch die vier Personen, die das Anforderungsdokument mit Vornamen nennt (Registrierung über die Website, Format der Lizenzliste, Spielformen der Kategorien). | Vorstand | [Anforderungen](anforderungen/README.md) |
| K-22 | Erwartet der Verein, dass MyTCO im App Store und bei Google Play steht, und ab wann? | Vorstand | N-APP-04, [ADR-001](adr/adr-001-web-app-zuerst.md) |
| K-23 | Ist der TCO steuerbefreit oder anderweitig behördlich als gemeinnützig anerkannt? Dann könnte Apple die Jahresgebühr der Store-App erlassen. | Vorstand | [ADR-001](adr/adr-001-web-app-zuerst.md) |
| K-37 | Reichen für Benachrichtigungen E-Mail und Push, oder braucht es SMS oder WhatsApp? Die beiden kosten pro Nachricht. | Vorstand | N-APP-02, A-ANMELDUNG-08, A-ANMELDUNG-09, #9 |
| K-38 | Vorschlag nach einer Anregung des Vorstands (03.11.2026): Nach dem Austritt wird das Konto inaktiv (Login gesperrt); die Daten bleiben eine Frist lang, falls das Mitglied zurückkommt, dann werden sie gelöscht, nur der Name bleibt in alten Resultaten. Wie lang ist die Frist (Vorschlag: 1 Jahr), und muss der Verein etwas länger aufbewahren (z. B. Lizenzanträge)? Die Frist kommt in die Datenschutzerklärung. Offen seit 04.11.2026: Laut Statuten Art. 23 wirkt ein Austritt erst auf Ende des Vereinsjahres (Kalenderjahr, mindestens einen Monat vorher schriftlich); FR-04 sperrt das Konto heute sofort. Wird das Konto beim Melden oder erst auf den 31.12. gesperrt? ([Recherche tcolten.ch](recherche/2026-11-04-tcolten-website.md)) | Vorstand, Ansprechperson Datenschutz | #5, [Datenschutz](datenschutz.md), [#43](https://github.com/konstantinniedermann/tco-app/issues/43) |
| K-40 | Verlangt Swiss Tennis für Lizenzanträge das volle Geburtsdatum, oder reicht der Jahrgang? (Für die Alterskategorien der CM reicht der Jahrgang: K-40.2 beantwortet.) | Lizenzverantwortlicher | K-07, #3, [Datenschutz](datenschutz.md) |

## Vor dem ersten Release *Mitglieder-Login* (28.02.2027)

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-19 | Dürfen Mitglieder E-Mail und Telefon selbst ändern? Auch die Adresse, solange Fairgate nicht angebunden ist, und wer überträgt sie dann nach Fairgate? | Vorstand | A-KONTO-01, A-KONTO-02 |
| K-20 | Wer vom Vorstand macht in der [Testgruppe](testgruppe.md) mit? Stand 04.11.2026: Die Testgruppe stellt der Projektleiter selbst zusammen (K-20.1 beantwortet); in der Tabelle als K-20.2, Freiwillige tragen sich auf *Wer ist wer* ein. | Vorstand | #40, [ADR-001](adr/adr-001-web-app-zuerst.md) |
| K-21 | An wen wenden sich Mitglieder bei Fragen (Login klappt nicht, Installation auf dem Handy)? Der Kontakt steht im Brief, in der Meldung «Code schon benutzt» und auf der Seite Hilfe, die ohne Login für alle lesbar ist; darum eine Vereins-Adresse, keine private Nummer (#47). | Vorstand | #10, A-HILFE-01 |
| K-47 | Kann der CM-Verantwortliche eine Excel-Datei aus Advantage schicken, so wie Advantage sie für Gruppen und KO-Tableaus ausgibt, mit erfundenen oder geschwärzten Namen? Gebraucht wird nur der Aufbau (Spalten, Blätter), damit MyTCO die Übernahme rechtzeitig vor der CM bauen kann. Echte Daten kommen nicht ins Repo. | Verantwortliche CM | A-ADVANTAGE-02, A-ADVANTAGE-03, [Fachmodell](fachmodell.md) |

## Vor CM-Anmeldung (15.04.2027)

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-24 | Wie sieht der CM-Kalender 2027 aus, und an welchem Datum schliesst die Anmeldung? Laut K-01: Anmeldung offen ab Mitte April, Auslosung Anfang Juni. | Verantwortliche CM | A-ANMELDUNG-07, [Glossar](glossar.md) |
| K-25 | Welche Kategorien und Alterskategorien bietet die CM an, und gibt es je Phase eine eigene Turniernummer? Advantage kennt ein Finaltableau direkt nach den Gruppenspielen; laut Anforderungsdokument eröffnet der TCO fürs Finalwochenende aber neue KO-Turniere. Warum, und bleibt das so? (Nenngeld: beantwortet.) | Verantwortliche CM | A-TURNIER-02, A-TURNIER-03, [Glossar](glossar.md) |
| K-26 | Was läuft heute bei der Clubmeisterschaft am schlechtesten: Anmeldung, Gruppenspiele, Resultate oder Finalwochenende? | Verantwortliche CM | Priorisierung der CM-Etappen |
| K-27 | Höchstens 3 Anmeldungen: Zählt ein Doppel für beide Partner? Muss der Doppelpartner zustimmen, und wer gilt als „verfügbar“? | Verantwortliche CM | A-ANMELDUNG-02, A-ANMELDUNG-04 |
| K-28 | Wie wird die Klassierung bei der Anmeldung festgelegt: gibt der Spieler sie an, oder prüft der CM-Verantwortliche? | Verantwortliche CM | A-ANMELDUNG-03, A-ANMELDUNG-06 |
| K-29 | Dürfen Spieler sich bis zum Anmeldeschluss selbst wieder abmelden oder ummelden? | Verantwortliche CM | A-ANMELDUNG-07 |

## Vor CM-Betrieb (01.06.2027)

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-32 | Muss der Gegner ein gemeldetes Resultat bestätigen? | Verantwortliche CM | A-RESULTAT-04 |
| K-33 | Wurde der Spielplan von Advantage fürs Finalwochenende schon ausprobiert, und was fehlt dort? | Verantwortliche CM | A-SPIELPLAN |
| K-41 | Mit welchem Spielformat laufen die Spiele der CM: zwei Gewinnsätze, dritter Satz als Match-Tiebreak, je Kategorie verschieden? | Verantwortliche CM | A-RESULTAT-03, A-RESULTAT-06, [Fachmodell](fachmodell.md) |

## Vor Lizenzanträgen (01.04.2028)

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-34 | Ist das Storno einer Lizenz dasselbe wie die Sistierung bei Swiss Tennis (Frist Ende Februar)? Welcher Stichtag gilt für die Liste der Anträge? Offen seit 04.11.2026: Die Website nennt für die Sistierung Ende Februar, das Juniorenreglement verlangt die Abbestellung bei Junioren vor Jahresende ([Recherche tcolten.ch](recherche/2026-11-04-tcolten-website.md)). Welche Frist gilt? | Lizenzverantwortlicher | A-LIZENZ-02, A-LIZENZ-03 |

## Nur falls eine Store-App kommt

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-35 | Tritt der Verein als Herausgeber in den Stores auf? Wer darf für ihn bei Apple und Google unterschreiben, und wer beantragt die D-U-N-S-Nummer? Laut Statuten Art. 38 unterschreibt der Präsident zusammen mit einem weiteren Vorstandsmitglied ([Recherche tcolten.ch](recherche/2026-11-04-tcolten-website.md)); offen bleibt, wer das Store-Konto führt. | Vorstand | N-APP-04, [ADR-001](adr/adr-001-web-app-zuerst.md), #10 |

## Später

| ID | Frage | An wen | Wozu |
|----|-------|--------|------|
| K-36 | Was gehört zu „Mitgliedschaft ändern“: Austritt, Wechsel der Mitgliederkategorie, anderes? | Vorstand | A-KONTO-04 |
| K-39 | Soll der Spielplan des Finalwochenendes öffentlich, also ohne Login, sichtbar sein? Dann stehen Namen der Spieler auf einer öffentlichen Seite. | Vorstand, Ansprechperson Datenschutz | A-SPIELPLAN-08, #5, [Datenschutz](datenschutz.md) |

## Beantwortet

| ID | Frage | Antwort | Von, am | Folgen |
|----|-------|---------|---------|--------|
| K-15 | Wie gut muss MyTCO erreichbar sein? | Keine besonderen Anforderungen. Der TCO ist ein Hobbyverein, alle arbeiten ehrenamtlich; ist MyTCO einmal kurz nicht erreichbar, nimmt man das in Kauf. | Projektleiter, 30.10.2026 | N-BETRIEB-01; Server ohne SLA reicht ([ADR-003](adr/adr-003-hosting-infomaniak-vps.md)), #10 |
| K-16.2 | Wer trägt das Porto für die Briefe? | Der Verein | Projektleiter, 30.10.2026 | #9 |
| K-25.2 | Gibt es ein Nenngeld? | Nein | Projektleiter, 30.10.2026 | [Glossar](glossar.md) |
| K-25.3 | Soll MyTCO festhalten, wer das Nenngeld bezahlt hat? | Nein, es gibt keins | Projektleiter, 30.10.2026 | [Glossar](glossar.md) |
| K-31 | Dürfen Spieler die Kontaktdaten ihrer Gegner und Doppelpartner sehen, und braucht es dafür eine Einwilligung? | Ja, E-Mail und Telefon bis zum Ende der CM, ohne weitere Einwilligung | Projektleiter, 30.10.2026 | FR-19, [Datenschutz](datenschutz.md) |
| K-42 | Dürfen CM-Verantwortlicher und Lizenzverantwortlicher E-Mail und Telefon aller Mitglieder sehen? | Ja, von allen Mitgliedern | Projektleiter, 30.10.2026 | [Rollen und Rechte](rollen-und-rechte.md), [Datenschutz](datenschutz.md) |
| K-01 | Passt der Fahrplan mit den Etappen und Wunschterminen? | Ja, mit anderen Terminen: CM-Anmeldung offen ab Mitte April 2027, Auslosung Anfang Juni (genug Zeit vor den Sommerferien), Lizenzanträge ab Saisonstart 2028 (ca. April), damit der Ablauf über die Saison gleich bleibt | Hauptansprechperson im Vorstand, 03.11.2026 | [Roadmap](roadmap.md): CM-Anmeldung 15.04.2027, CM-Betrieb 01.06.2027, Lizenzanträge 01.04.2028 |
| K-02.1 | Erste Version: Mitglieder einmal erfassen, Brief mit QR-Code und Code, kein Passwort, danach eingeloggt bleiben. Passt das? | Anders: QR-Code und ein Brief sind gut, beim ersten Login soll man aber ein Passwort setzen, damit man auch vom PC hineinkommt und das Handy ohne Probleme wechseln kann | Hauptansprechperson im Vorstand, 03.11.2026 | Kein Passwort ([ADR-004](adr/adr-004-login-einmal-code.md)): PC und neues Handy gehen per Mail-Code (A-LOGIN-10). Dazu freiwillig ein Passkey für bequemeres Login, vorgezogen auf *Mitglieder-Login* (A-LOGIN-07; Projektleiter, 03.11.2026) |
| K-04.1 | Auf wen laufen die Konten für MyTCO (Server, E-Mail-Versand, Programmcode)? | Auf eine Vereinsadresse @tcolten.ch; der Vorstand lässt sie einrichten und schickt dem Projektleiter die Zugangsdaten | Hauptansprechperson im Vorstand, 03.11.2026 | [CI/CD und Release](ci-cd-und-release.md), [Sicherheitskonzept](sicherheitskonzept.md#restrisiken), #10 |
| K-04.2 | Wer erhält einen zweiten Zugang zu diesen Konten? | Ein anderes Vorstandsmitglied: vorerst die Hauptansprechperson, später eventuell ein weiteres | Hauptansprechperson im Vorstand, 03.11.2026 | #10 |
| K-04.3 | Gibt es eine Vereinsadresse @tcolten.ch für die Konten? | Kann angelegt werden, z. B. `mytco@tcolten.ch` | Hauptansprechperson im Vorstand, 03.11.2026 | #10 |
| K-05 | Wer betreut MyTCO mit oder übernimmt, falls der Projektleiter ausfällt? | Vorerst niemand. Im Notfall übernimmt die Hauptansprechperson übergangsweise und sucht eine Nachfolge | Hauptansprechperson im Vorstand, 03.11.2026 | [ADR-003](adr/adr-003-hosting-infomaniak-vps.md) (Reevaluations-Trigger 1), #10 |
| K-06.2 | Wer gibt die Datenschutzerklärung von MyTCO frei? | Der Gesamtvorstand | Hauptansprechperson im Vorstand, 03.11.2026 | [Datenschutzerklärung](datenschutzerklaerung.md) |
| K-07 | Nur Name, Postadresse, E-Mail, Telefon, Geschlecht, Jahrgang, freiwillig Lizenznummer und Klassierung speichern? | Ja, genau diese | Hauptansprechperson im Vorstand, 03.11.2026 | [Datenschutz](datenschutz.md#welche-daten) |
| K-12.1 | Admin-Bereich höchstens einmal pro Tag mit frischem Mail-Code bestätigen, auch für CM- und Lizenzverantwortliche? | Ja, passt; die günstigste Variante wählen | Hauptansprechperson im Vorstand, 03.11.2026 | SI-08, RR-09 |
| K-16.3 | Neuer Code per E-Mail nach langer Pause oder mit neuem Handy? | Anders: siehe K-02.1 (Passwort). Dazu die Frage, ob es nicht gefährlich ist, wenn das Postfach gehackt wird | Hauptansprechperson im Vorstand, 03.11.2026 | Mail-Code bleibt (A-LOGIN-10). Gegen ein gehacktes Postfach helfen weder ein Passwort noch der freiwillige Passkey, solange sich das Konto per Mail zurückholen lässt; bewusst angenommenes Restrisiko. [Sicherheitskonzept](sicherheitskonzept.md#restrisiken) |
| K-17.1 | Wie kommen die Mitglieder zum Start in MyTCO, und wie werden Ein- und Austritte nachgeführt? | Beides: zum Start erfasst der Projektleiter, danach liest die Mitgliederverwaltung die Liste ein. Anregung: Ausgetretene inaktiv setzen statt löschen | Hauptansprechperson im Vorstand, 03.11.2026 | A-MITGLIED-07 neu (hängt an K-45); Anregung in K-38 |
| K-17.2 | Wie viele Mitglieder hat der Verein etwa? | 300 bis 500 | Hauptansprechperson im Vorstand, 03.11.2026 | [Kosten](kosten.md#szenarien) |
| K-18.1 | Vier Rollen, mehrere pro Person, der Admin vertritt die anderen. Passt das? | Ja; später eventuell weitere Rollen (z. B. Juniorenverantwortliche) | Hauptansprechperson im Vorstand, 03.11.2026 | [Rollen und Rechte](rollen-und-rechte.md) |
| K-18.3 | Wie viele Admins soll es geben? | Zwei | Hauptansprechperson im Vorstand, 03.11.2026 | [Rollen und Rechte](rollen-und-rechte.md) |
| K-40.2 | Reicht für die Alterskategorien der CM der Jahrgang? | Ja (Reglemente Swiss Tennis) | Hauptansprechperson im Vorstand, 03.11.2026 | [Datenschutz](datenschutz.md#welche-daten), [Fachmodell](fachmodell.md) |
| K-46 | Spielen Junioren schon an der CM 2027 mit, und wer meldet sie an? | Ja, sie melden sich selbst an. Junioren sind Mitglieder und erhalten ein Login; ob sie oder die Eltern es führen, bleibt offen. Der CM-Verantwortliche soll ein Mitglied auch selbst einer Kategorie zuteilen können | Hauptansprechperson im Vorstand, 03.11.2026 | Konten für Junioren bis zur CM-Anmeldung ([Datenschutz](datenschutz.md#junioren), [Fachmodell](fachmodell.md)); Anmeldung durch den CM-Verantwortlichen ist A-ANMELDUNG-06; Kontoführung bleibt bei K-08 |
| K-14 | Wer überträgt Ein- und Austritte und Adressänderungen zwischen Fairgate und MyTCO? | Aufgegangen in K-17.1 (Ein- und Austritte liest die Mitgliederverwaltung ein) und K-19.2 (Adressänderungen); gemeinsame Familienadressen löst der Vorschlag K-08 bis zur Altersgrenze | Projektleiter, 03.11.2026 | A-MITGLIED-07 |
| K-20.1 | Stellt der Verein eine Testgruppe von 5–10 Mitgliedern, die Brief, Login und Installation vor dem Start ausprobiert? | Der Projektleiter stellt sie selbst zusammen, eine Handvoll hat zugesagt; der Vorstand kann mitmachen | Projektleiter, 04.11.2026 | [Testgruppe](testgruppe.md), Etappe *Pilot* ([Roadmap](roadmap.md)) |
