[← Recherchen](README.md)

# tcolten.ch, Statuten und Domain — Stand 04.11.2026

Was die öffentliche Website, die dort verlinkten Statuten und Reglemente sowie die
öffentlichen DNS- und Registrierungsdaten über den Verein verraten. Momentaufnahme von
aussen; was daraus gilt, steht in den [Abklärungen](../abklaerungen.md) und den Konzepten.
Personen sind mit ihrer Rolle genannt.

**Quellen:** alle Seiten von tcolten.ch (Start, Club, Wettkampf, Unterricht, Junioren,
Neuigkeiten, Sponsoren, Kontakt, Impressum), Statuten 2026, Juniorenreglement 2021,
DNS-Abfrage (NS, MX, A, TXT), RDAP-Abfrage bei nic.ch. Markierung: **belegt** = so
gelesen, **Vermutung** = daraus geschlossen.

## Konten und Anbieter rund um tcolten.ch

| Dienst | Wofür | Anbieter | Markierung |
|--------|-------|----------|------------|
| Domain `tcolten.ch` | Registrierung der Adresse | hosttech GmbH (Registrar laut nic.ch), Inhaber nicht öffentlich | belegt |
| DNS | Nameserver der Domain | Metanet (`ns1/ns2.tesla.sui-inter.net`) | belegt |
| Website | tcolten.ch, eigener Admin-Bereich unter `/admin`, Kalender mit Platzbelegung | Metanet, Server `tesla.sui-inter.net`, nginx | belegt |
| E-Mail @tcolten.ch | Postfächer, z. B. die allgemeine Vereinsadresse | Metanet, Mailserver auf demselben Server wie die Website | belegt |
| Mailversand über Fairgate | Fairgate darf als @tcolten.ch senden (SPF schliesst `spf.fairgate.ch` ein) | Fairgate | belegt (SPF); Zweck Vermutung: Rechnungen und Mitgliedermails aus Fairgate |
| Spam-Schutz der Domain | SPF vorhanden (`~all`), kein DMARC-Eintrag; DKIM unter dem Standard-Selektor nicht gefunden | — | belegt |
| `my.tcolten.ch` | zeigt schon heute auf den Website-Server | Metanet | belegt; Vermutung: Platzhalter-Eintrag für alle Subdomains |
| Aufnahmeformular | Antrag auf Mitgliedschaft | Microsoft Forms (dazu ein PDF-Formular) | belegt |
| Platzreservation | Plätze für drei Tage im Voraus | GotCourts (Web und App) | belegt |
| Social Media | Vereinsseite | Facebook | belegt |
| Fotos | Galerien der Oltner Meisterschaften | Pixieset (Fotograf) | belegt |
| Anmeldung Clubmeisterschaft | per E-Mail an ein eigenes Hotmail-Postfach der CM | Microsoft (Hotmail) | belegt |
| Eingebundene Fremddienste der Website | Schriften und Skripte | Google Fonts, StackPath-CDN (Bootstrap, Font Awesome), jsDelivr, jQuery-CDN | belegt |

**Datenschutzerklärung:** tcolten.ch hat keine. Es gibt weder eine Seite noch einen Link,
nur ein Impressum aus einem Generator von 2020 (belegt). Die Datenschutzerklärung von MyTCO
kann also an nichts anschliessen (K-06.3).

## Aus den Statuten 2026

| Artikel | Inhalt | Bedeutung für MyTCO |
|---------|--------|---------------------|
| Art. 3 | Das Vereinsjahr ist das Kalenderjahr | Fristen und Beiträge laufen auf den 31.12. |
| Art. 5–13 | Kategorien: Aktive; Studierende/Lernende (bis Ende des Jahres des 27. Geburtstags, in Ausbildung); Junioren (ab dem Jahr nach dem 12. bis Ende des Jahres des 18. Geburtstags); Schüler (bis Ende des Jahres des 12. Geburtstags); Ehren-, Frei-, Passiv- und Interclub-Mitglieder | Mögliche Mitgliederkategorie im Fachmodell; naheliegende Altersgrenze fürs eigene Login (K-08) |
| Art. 17 | Passiv- und Interclub-Mitglieder spielen nur als Gast | Vermutung: nicht CM-berechtigt (K-25) |
| Art. 23 | Austritt oder Kategorienwechsel nur auf Ende eines Vereinsjahres, mindestens einen Monat vorher, schriftlich an den Vorstand. Lizenzen müssen zusätzlich gekündigt werden | Weicht vom Fachmodell ab (FR-04 sperrt sofort), siehe K-38 |
| Art. 35 | Amtsdauer im Vorstand zwei Jahre, Wiederwahl möglich | Wer ein Konto führt, wechselt regelmässig: Übergabe (#10) |
| Art. 38 | Kollektivunterschrift: Präsident mit einem weiteren Vorstandsmitglied; Zahlungsverkehr Finanzen mit Präsident oder Vizepräsident | Verträge (Hoster, Mailversand, Store-Konten) unterschreiben zwei Personen (K-35, #10) |
| Art. 39 | Der Vorstand beschliesst unvorhergesehene, nicht wiederkehrende Ausgaben bis 5 % der budgetierten Einnahmen | Vermutung: Laufende Kosten von MyTCO gehören ins Budget der Generalversammlung (K-03) |

## Aus dem Juniorenreglement 2021

- Lizenz: Will ein Junior keine Lizenz mehr, muss er sie **vor Jahresende** abbestellen,
  sonst ist sie zu bezahlen (belegt). Die Website nennt allgemein **Ende Februar** für die
  Sistierung (belegt). Die beiden Fristen widersprechen sich (K-34.1).

## Weitere Befunde

- **Clubmeisterschaft 2026:** drei Phasen. Gruppenspiele bis Anfang August und
  Viertelfinals selbst organisiert, Halbfinals und Finals am Finalwochenende Mitte August
  (belegt). Der Anmeldeschluss auf der Website nennt noch 2025.
- **Lizenzen:** Der TCO zieht die Lizenzgebühren ein; Swiss Tennis verlängert Lizenzen
  automatisch (belegt).
- **Impressum:** Unter den vertretungsberechtigten Personen steht für Finanzen noch die
  frühere Besetzung (belegt). Sache des Vereins, nicht von MyTCO.
