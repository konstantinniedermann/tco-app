[← Übersicht](index.md)

# Testgruppe

Vor dem Briefversand an alle Mitglieder probiert eine kleine Gruppe MyTCO so aus, wie es
beim echten Start läuft: mit Brief, Anleitung und Hilfe, die alle bekommen, und mit
Aufträgen aus dem Alltag. Geprüft wird, **ob Mitglieder mit dem mitgegebenen Material
alleine zurechtkommen** und wo Anleitung oder Hilfe fehlen. Ob die App läuft, belegen Tests
und die [Checkliste vor dem Release](testkonzept.md#checkliste-vor-dem-release).

Die Testpersonen sucht der Projektleiter selbst, auch der Vorstand kann mitmachen (K-20).
Koordiniert wird über einen WhatsApp-Chat des Projektleiters; er gehört nicht zu MyTCO.
Design und Entscheide: [Design Testgruppe](superpowers/specs/2026-11-04-testgruppe-design.md).
Die Etappe dazu heisst *Pilot* ([Roadmap](roadmap.md)).

## Bereit für Lauf 1

Lauf 1 hat kein festes Datum. Er startet, sobald diese Punkte erfüllt sind. Getestet wird,
was bis dahin gebaut ist; ein Auftrag, dessen Funktion noch fehlt, wandert in einen späteren
Lauf.

- [ ] Live in Betrieb ([#39](https://github.com/konstantinniedermann/tco-app/issues/39)), unter der endgültigen Adresse (K-10). Unter einer Übergangsadresse müssten die Testpersonen nach dem Umzug Startbildschirm und Passkey neu einrichten ([Sicherheitskonzept](sicherheitskonzept.md))
- [ ] Login per Einmal-Code auf Live ([#29](https://github.com/konstantinniedermann/tco-app/issues/29))
- [ ] Brief-Code und Brief als PDF in der Mitgliederverwaltung ([#43](https://github.com/konstantinniedermann/tco-app/issues/43), Etappe 2)
- [ ] Hilfe beim Start: Hilfe-Seite und Anleitung zum Startbildschirm (A-HILFE-01, -02, [#47](https://github.com/konstantinniedermann/tco-app/issues/47))
- [ ] Datenschutzerklärung auf Live erreichbar (DS-09), Hinweis an die alte E-Mail-Adresse gebaut (FR-25)
- [ ] Kontaktangabe für Fragen geklärt (K-21)
- [ ] Vorabversion 0.x auf Live, Checkliste auf Test abgehakt
- [ ] Liste der Testpersonen in `intern/`, vom Projektleiter selbst angelegt. Claude bekommt daraus nur Gerät, Softwareversion, Mailanbieter und Altersgruppe grob, ohne Namen ([Datenschutz](datenschutz.md#testgruppe))

## Ablauf Lauf 1

1. Der Mitglieder-Admin legt die Testpersonen in MyTCO an, mit ihren echten Daten.
2. Der Projektleiter schickt jeder Person die [Mail](#mail-an-die-testpersonen) mit ihrem
   Brief als PDF und stellt sie in den Chat ([Begrüssung](#chat-nachrichten)).
3. Die Testpersonen arbeiten die [Aufträge](#aufträge-lauf-1) ab, zuerst alleine.
4. Probleme melden sie im Chat, am Ende füllen sie das [Formular](#formular) aus.
5. Der Projektleiter wertet aus ([Auswertung](#auswertung)).

**Nur im Pilot:** Beim echten Start kommt der Brief per Post (A-LOGIN-01). Im Pilot kommt
er als PDF per Mail; der Weg vom Papier ins Handy wird nachgestellt, indem das PDF am Laptop
geöffnet und der QR-Code mit dem Handy gescannt wird.

Der Pilot läuft auf Live mit echten Daten. Das ist Betrieb, kein Test im Sinne von DS-08;
die Konten bleiben danach bestehen ([Datenschutz](datenschutz.md#testgruppe)).

## Aufträge Lauf 1

| Nr | Auftrag | Anforderung |
|----|---------|-------------|
| 1 | Brief-PDF am Laptop öffnen, QR-Code mit dem Handy scannen, MyTCO auf den Startbildschirm legen | A-LOGIN-01, -04, A-HILFE-02 |
| 2 | MyTCO über das Symbol öffnen, den Code eintippen, fehlende Angaben ergänzen | A-LOGIN-08, -03 |
| 3 | Eigene E-Mail-Adresse oder Telefonnummer ändern | A-KONTO-01 |
| 4 | Einen Passkey einrichten | A-LOGIN-07 |
| 5 | Handy neu starten, MyTCO öffnen: noch angemeldet? | A-LOGIN-09 |
| 6 | Ausloggen, einen neuen Code per Mail anfordern und damit einloggen | A-LOGIN-10 |
| 7 | Freiwillig: MyTCO am Laptop öffnen und mit dem Passkey vom Handy anmelden | A-LOGIN-07 |

Bei jedem Auftrag dürfen die Testpersonen die Hilfe in MyTCO (A-HILFE-01) benutzen. Aufträge
nach Rolle (z. B. Mitglieder-Admin legt ein Mitglied an) gibt es in Lauf 1 nicht: Auf Live entstünde
ein echtes Konto, und die Verwaltung prüft die Checkliste vor dem Release.

## Regeln

- Zuerst alleine mit Mail, Brief und Hilfe versuchen, wie es ein Mitglied ohne Testgruppe
  auch müsste. Erst dann im Chat fragen.
- Im Chat sagen, bei welchem Auftrag es hakt, gern mit Screenshot. Kein Code und keine Adresse auf dem Screenshot; sonst privat an den Projektleiter. Im Gruppenchat sehen alle die Telefonnummern der anderen.
- Der Projektleiter notiert jede Frage als Befund, auch wenn sie sich sofort klären lässt.

## Mail an die Testpersonen

Über das private Postfach des Projektleiters, mit dem Brief der Person als PDF im Anhang.
Nach dem Versand die Mails im Ordner «Gesendet» und im Papierkorb löschen, ebenso lokale
Kopien der PDFs. `[…]` vor dem Versand ersetzen.

```text
Betreff: MyTCO – dein Zugang für den Testlauf

Hoi [Vorname]

Merci, dass du MyTCO vor allen anderen ausprobierst!

Darum gehts: Bevor alle Mitglieder einen Brief bekommen, möchten wir wissen,
ob man mit Brief und Anleitung alleine zurechtkommt – und wo es hakt.

So gehts:
- Im Anhang ist dein Brief. Beim echten Start kommt er per Post.
- Öffne ihn am Laptop oder Tablet (oder druck ihn aus) und scanne den QR-Code
  mit deinem Handy.
- Dein Code gilt einmal, höchstens 90 Tage. Lösch die Mail und das PDF,
  sobald du angemeldet bist.
- Die Aufträge schicke ich im WhatsApp-Chat. Testlauf bis [Datum].

Wichtig: Probier zuerst alleine, mit Brief und Hilfe in MyTCO. Frag erst im Chat,
wenn du nicht weiterkommst. Jede Frage zeigt uns, wo die Anleitung noch fehlt.

Deine Daten: Dein Konto in MyTCO ist echt und bleibt nach dem Test bestehen.
Das Formular ist ohne Namen und wird nach der Auswertung gelöscht. Für den Test
notiere ich mir Handy, Mailanbieter und grob dein Alter; das lösche ich nach dem
letzten Testlauf. Im WhatsApp-Chat sehen alle deine Nummer. Bitte keinen Code
und keine Adresse in den Chat.

Merci und Gruess
[Projektleiter]
```

## Chat-Nachrichten

**Begrüssung**

```text
Hoi zäme 👋 Willkommen im Testlauf von MyTCO! Hier koordinieren wir.
Regel Nr. 1: zuerst alleine probieren, mit Brief und Hilfe in MyTCO.
Wenn's hakt: hier melden, mit Nummer vom Auftrag und gern mit Screenshot –
aber ohne Code und Adresse drauf (sonst privat an mich).
```

**Start Lauf 1**

```text
Los geht's! Eure Mails mit dem Brief sind unterwegs. Die Aufträge:
1. Brief am Laptop öffnen, QR-Code mit dem Handy scannen, MyTCO auf den Startbildschirm legen
2. MyTCO öffnen, Code eintippen, fehlende Angaben ergänzen
3. E-Mail-Adresse oder Telefonnummer ändern
4. Passkey einrichten
5. Handy neu starten – bist du noch angemeldet?
6. Ausloggen, einen neuen Code per Mail anfordern und damit einloggen
7. Freiwillig: MyTCO am Laptop öffnen, mit dem Passkey vom Handy anmelden
Am Schluss bitte das Formular ausfüllen (2 Minuten): [Link]
```

**Erinnerung**

```text
Kurze Erinnerung: Wer die Aufträge noch nicht gemacht hat – gern bis [Datum].
Und bitte das Formular nicht vergessen: [Link]. Merci!
```

**Dank**

```text
Merci vielmal fürs Testen! Wir arbeiten eure Rückmeldungen ein.
Euer Konto bleibt bestehen. Vor der CM-Anmeldung melde ich mich nochmals
für einen kurzen zweiten Testlauf.
```

Die Liste der Aufträge im Chat folgt der Tabelle oben; fehlt eine Funktion beim Start des
Laufs, fällt der Auftrag auch im Chat weg.

## Formular

Google Formular, eines pro Lauf. Ohne Name und ohne E-Mail-Adresse: «E-Mail-Adressen
erfassen» aus, Antworten nicht auf eine pro Person begrenzen (das verlangt eine
Google-Anmeldung). Über den Freitextfeldern: «Bitte keine Namen». Angelegt wird es, sobald
die Aufträge für den Lauf feststehen.

1. Handy: iPhone / Android
2. Mailanbieter: Bluewin / Gmail / GMX / iCloud / anderer / weiss nicht
3. Pro Auftrag: ging ohne Hilfe / ging mit Mühe / ging nicht / nicht gemacht
4. Was hat in Brief, Mail oder Hilfe gefehlt oder war unklar? (Freitext)
5. Was sollten wir sonst noch wissen? (Freitext)

## Zusammensetzung

Folgt vor Lauf 1 aus der Liste in `intern/`: Anzahl, iPhone/Android, Altersgruppen, ob ein
älteres Handy dabei ist. Als älter gilt ein iPhone mit iOS 16 oder 17 oder ein Android-Handy
mit Android 9 bis 11 ([Testkonzept](testkonzept.md#testgruppe)). Keine Namen.

## Auswertung

Pro Lauf: Ergebnis je Auftrag (Anzahl Personen) und die Befunde ohne Namen, eingeordnet als
*Doku fehlt*, *App ändern* oder *passt*, mit Ziel (Doku, Issue, [Beobachtungen](beobachtungen.md)).
Befunde aus Chat und Formular kommen in dieselbe Liste.

### Lauf 1

Noch nicht gelaufen.

| Auftrag | ohne Hilfe | mit Mühe | ging nicht | nicht gemacht |
|---------|-----------|----------|------------|---------------|
| 1–7 | — | — | — | — |

## Lauf 2

Vor der *CM-Anmeldung* (15.04.2027), dieselbe Gruppe: zur CM anmelden, im Doppel mit einem
Partner aus der Gruppe, wieder abmelden. Offen: Auf Live wäre das eine echte Anmeldung —
entweder eine Probe-Clubmeisterschaft auf Live, die danach gelöscht wird, oder Lauf 2 auf
Test mit erfundenen Konten. Wird vor Lauf 2 entschieden.
