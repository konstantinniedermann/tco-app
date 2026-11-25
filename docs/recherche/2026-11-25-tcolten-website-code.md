[← Recherchen](README.md)

# Programmcode von tcolten.ch — Stand 25.11.2026

Was der Programmcode der Website und die Projektangaben auf GitLab über Technik,
Auslieferung und Erscheinungsbild verraten. Momentaufnahme mit Lesezugang (K-44); was daraus
gilt, steht in den [Abklärungen](../abklaerungen.md). Ergänzt die
[Sicht von aussen vom 04.11.2026](2026-11-04-tcolten-website.md).

**Quellen:** der Code im privaten Repository des Website-Betreuers (Stand 25.11.2026), die
Projektangaben auf GitLab (lesend), die Hilfe-Seiten von Infomaniak. Markierung: **belegt** =
so gelesen, **Vermutung** = daraus geschlossen. Der Code selbst liegt nicht in diesem Repo.

## Womit die Website gebaut ist (K-48.2)

| Teil | Technik | Markierung |
|------|---------|------------|
| Öffentliche Seiten (Start, Club, Wettkampf, Unterricht, Junioren, Neuigkeiten, Sponsoren, Kontakt, Impressum) | PHP-Seiten; schöne Adressen über Umschreibregeln des Webservers (Apache, `.htaccess`) | belegt |
| Inhalte der Seiten | Die Seiten holen Einleitungstext, Kalender, Neuigkeiten, Vorstand, Trainer und Sponsoren über eine eigene Schnittstelle aus der Datenbank | belegt |
| Schnittstelle (`/api`) | PHP mit Doctrine und PHPMailer, Anmeldung mit Benutzername, Passwort und Token | belegt |
| Datenbank | MySQL oder MariaDB; die Zugangsdaten liegen in einer Datei ausserhalb des Web-Ordners | belegt |
| Admin-Bereich (`/admin`) | eigene Angular-Anwendung; pflegt Einleitungstext, Kalender, Neuigkeiten, Vorstand, Trainer, Sponsoren, Gönner und die Konten des Admin-Bereichs | belegt |
| Bestell-Anwendung (`/order`) | zweite Angular-Anwendung mit Login: Menü, Bestellungen, Abrechnung; läuft auch ohne Netz und gleicht später ab | belegt |
| PHP-Version | Die Abhängigkeiten sind auf PHP 7.4 festgelegt | belegt; **Vermutung:** der Server läuft mit 7.4 |
| Bilder und Dokumente (Reglemente, Statuten, Flyer, Fotos der Neuigkeiten) | liegen im Code, nicht in der Datenbank; die Schnittstelle nimmt keine Dateien entgegen | belegt |

Es ist kein Baukasten und kein WordPress: Wer die Website betreut, braucht PHP und Angular.

## Wie die Website auf den Server kommt

- Jede Änderung läuft durch eine Kette auf GitLab (Prüfen, Bauen, Tests). Ausgeliefert wird
  nur aus dem Zweig für die Auslieferung: Die Kette lädt die Dateien per FTP in den
  Web-Ordner und schreibt die Zugangsdaten für die Datenbank dazu (belegt).
- Adresse und Zugang des Servers sowie die Zugangsdaten der Datenbank stehen als
  Einstellungen im GitLab-Projekt, nicht im Code (belegt). Sehen und ändern kann sie nur der
  Website-Betreuer; der Lesezugang des Projektleiters reicht dafür nicht (belegt).
- Die Kette läuft auf einem eigenen Rechner, nicht auf den gemeinsamen von GitLab, und mit
  Bausteinen aus dem persönlichen Konto des Website-Betreuers (belegt). **Vermutung:** Ohne
  ihn oder eine Übergabe dieser Teile lässt sich nicht ausliefern.
- Letzte Änderung am Code am 25.11.2026, letzte Auslieferung am 22.10.2026; die Website wird
  laufend gepflegt (belegt).

## Was ein Umzug zu Infomaniak braucht (K-48)

| Was | Woher | Markierung |
|-----|-------|------------|
| Dateien der Website | vollständig im Code | belegt |
| Aufbau und Inhalt der Datenbank | nicht im Code: Die Tabellen werden aus der laufenden Datenbank abgelesen, eine Sicherung liegt nicht bei. Es braucht einen Abzug bei Metanet | belegt; der Zugang hängt an K-09 |
| Webhosting mit PHP, MySQL/MariaDB und Apache | Infomaniak bietet PHP 7.4 bis 8.5, pro Website wählbar, dazu MySQL oder MariaDB | belegt (Hilfe-Seiten Infomaniak) |
| Neue Zugangsdaten für Auslieferung und Datenbank | trägt der Website-Betreuer im GitLab-Projekt ein | belegt |
| Adresse der Schnittstelle | im Code fest auf `https://tcolten.ch` gesetzt; bleibt beim Umzug gleich, eine Probe unter einer anderen Adresse braucht eine Anpassung | belegt |

### Geprüft: Ist der Umzug machbar?

Ja, auf ein gewöhnliches Webhosting-Paket bei Infomaniak. Die Seiten selbst laufen dort
unverändert; anpassen muss der Website-Betreuer drei Stellen der Auslieferung:

| Was sich ändert | Warum | Markierung |
|-----------------|-------|------------|
| Der Schritt, der beim Bauen den Aufbau der Tabellen aus der Datenbank liest | Bei Infomaniak ist die Datenbank eines Webhosting-Pakets von aussen nicht erreichbar. Der Aufbau muss neu im Code liegen oder auf dem Server gelesen werden | belegt (Code, Hilfe-Seiten Infomaniak) |
| Die Zielordner beim Hochladen | Die Kette lädt in die Ordner von Metanet; die Datei mit den Zugangsdaten muss eine Ebene über dem Web-Ordner liegen. Bei Infomaniak heissen die Ordner anders | belegt (Code); Ordner bei Infomaniak: Vermutung |
| Zugangsdaten für Hochladen und Datenbank | neue Werte im GitLab-Projekt | belegt |

Dazu zwei Punkte zum Prüfen beim Einrichten:

- Die Seiten holen ihre Inhalte über die eigene Adresse `https://tcolten.ch`. Das Hosting muss
  PHP solche Abrufe erlauben (**Vermutung:** bei Infomaniak einstellbar).
- Eine Probe unter einer anderen Adresse zeigt ohne Anpassung die Inhalte der alten Website,
  weil die Adresse im Code fest steht (belegt).

Infomaniak nimmt Dateien per FTP und SFTP an (belegt). Auf dem Server von MyTCO liefe die
Website nur mit einem eigenen PHP-Container und einer eigenen Datenbank
([ADR-003](../adr/adr-003-hosting-infomaniak-vps.md)); das Webhosting-Paket ist der einfachere
Weg.

**Was zum Umzug noch fehlt,** steht nicht im Code: der Abzug der Datenbank und der Zugang zu
Metanet (K-09), die Postfächer und die Domain, und die Zusage des Website-Betreuers, die drei
Stellen anzupassen oder die Auslieferung zu übergeben.

Nicht aus dem Code zu beantworten: Kosten und Laufzeit des Pakets bei Metanet (K-09),
Postfächer, Domain und DNS (K-10), wer die Website nach dem Umzug betreut.

## Erscheinungsbild (K-13)

- **Logo:** vier Fassungen als Vektorgrafik (einfach, gestapelt, quer, mit Adresse), dazu die
  App-Symbole in allen Grössen (belegt).
- **Farben:** dunkles Grün `#095d5d` als Hauptfarbe, helles Grün `#cde3b9` als Zweitfarbe
  (belegt).
- **Schrift:** Poppins, geladen von Google Fonts (belegt).

MyTCO darf Logo, Farben und Schrift verwenden (K-13.1, 25.11.2026). Ein Bildvergleich zeigt:
Das Wappen in MyTCO ist dieselbe Zeichnung wie im Logo der Website, das helle Grün ist
derselbe Wert. MyTCO braucht keine anderen Dateien. Beim eigenen Grün und der Systemschrift
bleibt es, weil die Anforderung ein abgeändertes Farbkonzept verlangt
([UI-Leitbild](../ui-leitbild.md#herkunft-und-annahmen)).

## E-Mail (K-11)

Die Website verschickt selbst höchstens die Anfrage aus dem Formular auf der Seite
«Unterricht», über die Mail-Funktion des Servers (belegt). **Vermutung:** Das Formular ist
nicht angeschlossen. Zum Tageslimit und zu den DNS-Einträgen sagt der Code nichts.

## Berührungspunkte mit MyTCO

- Die Website hat keine Mitgliederdaten und kein Mitglieder-Login; Konten gibt es nur für
  den Admin-Bereich und die Bestell-Anwendung (belegt).
- Der Kalender der Website wird im Admin-Bereich von Hand gepflegt (belegt). Anlässe stehen
  künftig auch in MyTCO; eine Verbindung gibt es nicht.
