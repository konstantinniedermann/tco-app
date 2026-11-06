[← Übersicht](index.md)

# Betrieb und Übergabe

Wem die Konten von MyTCO gehören, wo die Geheimnisse liegen, wie Sicherung und Überwachung
gedacht sind und wie der Projektleiter MyTCO an eine Nachfolge übergibt. Geschrieben für eine
**geplante Übergabe** an jemanden, der wie der Projektleiter mit Claude Code arbeitet: Die
Arbeitsweise steckt zum grössten Teil im Repo (`CLAUDE.md`, `.claude/`, `make help`); was nur
auf dem Rechner des Projektleiters liegt, nennt Schritt 1 der Checkliste. Hier steht, was nicht
im Code steht. Die Befehle auf dem Server stehen in [`betrieb/README.md`](../betrieb/README.md),
Auslieferung und Geheimnisse im Einzelnen in [CI/CD und Release](ci-cd-und-release.md).

Personen sind mit ihrer Rolle genannt. Wer die Rollen heute innehat, steht in der
Fragen-Tabelle (Blatt *Wer ist wer*), nicht im Repo.

## Konten

Ziel für die Konten des Betriebs ist die Vereinsadresse (z. B. `mytco@tcolten.ch`); den
zweiten Zugang erhält die Hauptansprechperson im Vorstand (K-04.1 bis K-04.3). **Abweichend
von K-04.1** bleibt der Programmcode (GitHub) bis zu einer Übergabe auf dem Privatkonto des
Projektleiters (Entscheid des Projektleiters, 04.11.2026). Alle Konten für Betrieb und Code
haben Zwei-Faktor-Login (SI-15). Store-Konten und Signierschlüssel gibt es erst mit einer
Store-App ([ADR-001](adr/adr-001-web-app-zuerst.md), K-22).

| Konto | Wofür | Eigentümer heute | Ziel | Zweiter Zugang | Wiederherstellung |
|-------|-------|------------------|------|----------------|-------------------|
| GitHub | Code, Issues, CI, Container-Ablage (`ghcr.io`), Geheimnisse der Auslieferung | Privatkonto des Projektleiters | bleibt dort bis zur Übergabe, dann Transfer an die Nachfolge (Checkliste unten) | Hauptansprechperson als Mitarbeitende mit Schreibrecht, nutzt es nur zum Lesen ([CI/CD und Release](ci-cd-und-release.md#schutz-des-auslieferungswegs)); verwalten kann nur der Projektleiter | Wiederherstellungscodes für den Zwei-Faktor-Login im Tresor (K-49) |
| Infomaniak | Server (VPS), Sicherungsablage | wird mit [#39](https://github.com/konstantinniedermann/tco-app/issues/39) bestellt, vorerst auf den Projektleiter ([ADR-003](adr/adr-003-hosting-infomaniak-vps.md)) | Vereinsadresse | Hauptansprechperson als Benutzer im Konto | über die Vereinsadresse und die Wiederherstellungscodes im Tresor; Zugriff auf den Server ohne SSH über die Konsole im Infomaniak-Konto (Vermutung, bei #39 prüfen) |
| Mailversand | Code-Mails und Benachrichtigungen | noch keines; Anbieter hängt an K-11 (Postfach bei Metanet oder Scaleway) | Vereinsadresse | Hauptansprechperson | über die Vereinsadresse |
| Vereinsadresse `mytco@tcolten.ch` | Anmeldung bei allen Konten, Empfänger der Überwachung | noch nicht eingerichtet; der Vorstand lässt sie anlegen (K-04.3) | Postfach bei Metanet | Hauptansprechperson | über den Website-Betreuer, der die Postfächer bei Metanet verwaltet (Vermutung K-48) |
| Metanet | Website, DNS-Einträge und Postfächer von `tcolten.ch` | Verein, betreut vom Website-Betreuer | bleibt beim Verein (Umzug offen, K-48) | — | über den Verein |
| hosttech | Registrierung der Domain `tcolten.ch` | Inhaber unbekannt (K-48) | Verein | — | über den Inhaber |
| Google Drive | Fragen-Tabelle an den Verein | Privatkonto des Projektleiters | bleibt; bei der Übergabe Besitz an die Nachfolge übertragen | — | über das Google-Konto des Projektleiters |
| Überwachung | Prüfung von aussen und Wächter für die Sicherung | kommt mit [#39](https://github.com/konstantinniedermann/tco-app/issues/39) | Vereinsadresse | Hauptansprechperson | über die Vereinsadresse |

**Restrisiko plötzlicher Ausfall:** Bis K-49 beantwortet ist und die Konten auf der
Vereinsadresse laufen, hängt alles am Projektleiter. Fällt er plötzlich aus, läuft MyTCO
weiter, aber niemand kann das Repo übertragen, die Geheimnisse der Auslieferung ändern oder
den Server verwalten; die Hauptansprechperson kann nur ins Repo schreiben. Im Notfall
übernimmt sie übergangsweise (K-05). Zu prüfen: Die Nachfolger-Einstellung von
GitHub-Privatkonten könnte das Repo abdecken (ungeprüft, ob sie für private Repos gilt).

## Geheimnisse

Welche Geheimnisse es gibt und wo sie wirken, steht in
[CI/CD und Release](ci-cd-und-release.md#geheimnisse). Für die Übergabe zählt, ob sie sich
ersetzen lassen:

| Geheimnis | Verloren heisst | Ausserhalb des Servers aufbewahren |
|-----------|-----------------|-----------------------------------|
| Passwort der Sicherung (`RESTIC_PASSWORD`) und Zugang zur Sicherungsablage | alle Sicherungen sind wertlos | **ja, zwingend** |
| Wiederherstellungscodes der Konten | Konto bei Verlust des zweiten Faktors gesperrt | **ja, zwingend** |
| Zugangsdaten der Konten | Wiederherstellung über die Vereinsadresse | ja |
| Schlüssel für die Codes (`MYTCO_CODE_SCHLUESSEL`) | neu setzen; alle offenen Codes werden ungültig, auch die in verschickten Briefen | ja |
| Datenbank-Passwort, Test-Passwort, SSH-Schlüssel der CI und des Projektleiters | neu erzeugen und eintragen | nein |

**Wo:** hängt an K-49. Annahme K-49: bis zur Antwort im Passwortmanager des Projektleiters.

## Sicherung

Technik und Befehle: [CI/CD und Release](ci-cd-und-release.md#auslieferung) (Absatz *Sicherung und Probe*).

- Verschlüsselt mit restic, bevor die Daten den Server verlassen; das Passwort liegt nicht nur auf dem Server (siehe oben).
- Jede Nacht und vor jeder Auslieferung auf Live; aufbewahrt 30 Tage.
- Jede nächtliche Sicherung wird gleich danach in eine Wegwerf-Datenbank eingespielt und mit
  der Zählung verglichen (Probe). Eine Sicherung gilt erst als gelungen, wenn die Probe gelingt.
- Ablage nur in der Schweiz ([ADR-003](adr/adr-003-hosting-infomaniak-vps.md); der Datenschutz
  liesse auch EU/EWR zu, DS-01).
- **Vorschlag für die Ablage:** Infomaniak Object Storage, unter CHF 1 pro Jahr (Schätzung,
  Preisstand 2021, [Kosten](kosten.md)). Festgelegt wird sie erst, wenn das Hosting abschliessend geklärt ist
  (hängt an K-03 und K-48). Restrisiko: Server und Sicherungen hängen am selben Konto.

## Überwachung

Grundsätze; das Werkzeug wird mit [#39](https://github.com/konstantinniedermann/tco-app/issues/39) gewählt.

1. **Von aussen das Ergebnis prüfen:** Ein Dienst ausserhalb des Servers fragt regelmässig
   `/api/status` ab. «ok» heisst: App erreichbar, Datenbank antwortet. Das ist, was Mitglieder
   erleben, nicht ein Zwischenschritt wie «Container läuft».
2. **Ausbleiben melden:** Nach jeder gelungenen Probe meldet sich der Server bei einem Wächter.
   Bleibt die Meldung länger als 25 Stunden aus, kommt eine Mail. So fällt auch eine Sicherung
   auf, die gar nicht erst startet.
3. **An die Vereinsadresse:** Meldungen gehen an die Vereinsadresse, damit sie bei einer
   Übergabe mitwandern.

## Übergabe-Checkliste

Für eine geplante Übergabe vom Projektleiter an eine Nachfolge. Der Vorstand bestimmt die
Nachfolge (K-05).

1. **Arbeitsumgebung:** Die Nachfolge installiert Claude Code, klont das Repo und startet mit
   `make help`, [`README.md`](../README.md) und dieser Datei. Im Repo liegen nur die
   Projekt-`CLAUDE.md` und der Skill `tco-branching`. Nur auf dem Rechner des Projektleiters
   (unter `~/.claude/` bzw. eine Ebene über dem Repo) liegen und gehen sonst verloren: die
   übergeordnete `CLAUDE.md` (Workflow, Dependencies, Commit-Konvention, Umgang mit Befunden),
   die Skills `session-start`, `session-wrap-up`, `beobachtungen-auswerten` und `doku-audit`,
   der Agent `cas-reviewer`, der Hook `dep-guard`, das Plugin *superpowers* und die Memories mit
   den bekannten Fallen. Vor der Übergabe entscheiden, was davon ins Repo kommt.
2. **Tresor:** Die Nachfolge erhält Zugang zu den Geheimnissen (K-49).
3. **Infomaniak und Mailversand:** Die Nachfolge wird Benutzer in den Konten; der
   Projektleiter wird entfernt. Die Vereinsadresse bleibt Inhaberin.
4. **Server:** Die Nachfolge hinterlegt ihren eigenen SSH-Schlüssel; der Schlüssel des
   Projektleiters wird entfernt. Die beiden Schlüssel der CI werden immer neu erzeugt, auf dem
   Server und in GitHub eingetragen und die alten entfernt: Sie reichen bis root auf dem
   Server, und eine Kopie beim Projektleiter liesse ihn weiter ausliefern.
5. **GitHub-Transfer:** Das Repo geht an das Konto der Nachfolge (Settings → Transfer).
   - Alte Links leiten weiter; Issues, Labels und Milestones ziehen mit.
   - Die Container-Ablage heisst danach `ghcr.io/<neues-konto>/tco-app`. Alle Stellen mit dem
     alten Kontonamen anpassen (`git grep konstantinniedermann`), auch die `-R`-Angaben in den
     Skills und `MYTCO_REPO_STANDARD` in `betrieb/bin/lib.sh`. Dann `bin/lib.sh` und
     `bin/ausliefern-ssh` als root auf dem Server neu einspielen (von Hand eingerichtet, siehe
     [`betrieb/README.md`](../betrieb/README.md)), sonst holt der Türsteher weiter aus der alten
     Ablage. Erst danach neu bauen und auf Test ausliefern.
   - Ob Geheimnisse, Variablen und Container-Images beim Transfer mitkommen, beim Transfer
     prüfen und sonst neu eintragen (Vermutung: Images bleiben im alten Konto).
   - Mitarbeitende im Repo prüfen: Die Hauptansprechperson bleibt, der Projektleiter geht.
6. **Geheimnisse wechseln, die nur der Projektleiter kannte:** neues Passwort für die
   Sicherung (restic kann einen Schlüssel hinzufügen und den alten entfernen), neues
   Test-Passwort. Den Schlüssel für die Codes nur wechseln, wenn keine Briefe mit offenen
   Codes unterwegs sind.
7. **Adressen umstellen:** Mail-Empfänger auf Test (`MAIL_NUR_AN`), Kontakt in der App
   (`MYTCO_KONTAKT`), falls er auf den Projektleiter lautet.
8. **Rollen in MyTCO:** Die Nachfolge erhält Admin; die Rollen des Projektleiters vergibt der
   Vorstand neu ([Rollen und Rechte](rollen-und-rechte.md)).
9. **Fragen-Tabelle:** Besitz im Google Drive an die Nachfolge übertragen.
10. **Abschluss:** Die Nachfolge liefert einmal selbst auf Test und Live aus, und die Probe der
    nächsten Nacht gelingt. Erst dann gibt der Projektleiter seine letzten Zugänge ab und
    bestätigt es dem Vorstand.

## Offen beim Verein

- K-49: Wo werden die Zugangsdaten aufbewahrt?
- K-04.1: Dem Vorstand mitteilen, dass der Programmcode abweichend von seiner Antwort bis zu
  einer Übergabe auf dem Privatkonto des Projektleiters bleibt.
- K-04.3: Die Vereinsadresse ist noch nicht eingerichtet.
- K-48: Wer ist Inhaber der Domain bei hosttech?
- K-05: Eine Stellvertretung neben der Hauptansprechperson fehlt.
