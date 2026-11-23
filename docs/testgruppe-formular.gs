/**
 * MyTCO Probelauf – Feedback-Formular (Google Apps Script)
 *
 * Baut das Google Formular für den Probelauf der Testgruppe (docs/testgruppe.md) samt
 * verknüpfter Antwort-Tabelle. Kein Teil der App: Der Projektleiter führt es einmal unter
 * script.google.com aus (Funktion `erstelleFormular`), Anleitung in docs/testgruppe.md#formular.
 * Erzeugt mit `python3 docs/testgruppe-werkzeug/erzeuge.py .` aus der Einsatzliste, nicht von
 * Hand ändern. Die Schritte stehen wörtlich so in docs/testgruppe-rollenbuecher.md.
 * Formular und Tabelle nach der Auswertung löschen.
 */

const PERSONAS = [
  "Corinne Meister",
  "Markus Verwalter",
  "Daniela Doppel",
  "Pascal Partner",
  "Zora Zögerlich",
  "Stefan Spät",
  "Weiteres Mitglied"
];

/** Persona → Akt → Schritte («<Einsatz> · <Schritt>»). */
const SCHRITTE = {
  "Corinne Meister": {
    "1": [
      "1.2 · Brief am Laptop öffnen und den QR-Code mit dem Handy scannen",
      "1.2 · MyTCO auf den Startbildschirm legen",
      "1.2 · Mit dem Code aus dem Brief einloggen",
      "1.2 · Passkey einrichten",
      "1.3 · Am PC die Verwaltung öffnen und mit dem Code per Mail bestätigen",
      "1.3 · Die Probe-CM mit Anmeldeschluss laut Kalender anlegen (Anmeldung noch nicht öffnen)",
      "1.3 · Die acht Kategorien aus der Liste anlegen",
      "1.3 · Dich als Kontaktperson eintragen"
    ],
    "2": [
      "2.8 · Prüfen, ob die Einladung zur GV per Push oder Mail ankam, und die GV auf der Startseite finden"
    ],
    "3": [
      "3.2 · Zur GV zusagen",
      "3.2 · Klassierung laut Steckbrief eintragen"
    ],
    "4": [
      "4.1 · Die Anmeldung der Probe-CM öffnen",
      "4.3 · Dich im Einzel Damen A anmelden",
      "4.3 · Im Damen-Doppel Zora Zögerlich als Partnerin anfragen"
    ],
    "5": [
      "5.6 · Den Wildcard-Antrag von Zora entscheiden (bestätigen)",
      "5.7 · Zora und Markus im Mixed zum Paar zusammenlegen",
      "5.8 · Die Frage beantworten und als erledigt markieren"
    ],
    "6": [
      "6.2 · Den Anmeldeschluss auf Tag 10 verschieben",
      "6.2 · Olga Ohnehandy die Klassierung R8 geben",
      "6.2 · Sie von Hand im Einzel Damen B anmelden",
      "6.2 · Das Herren-Doppel absagen"
    ],
    "8": [
      "8.1 · Die Anmeldung schliessen",
      "8.1 · Die Anmeldeliste je Kategorie ansehen",
      "8.4 · Formular «Gesamt» ausfüllen"
    ]
  },
  "Markus Verwalter": {
    "1": [
      "1.1 · Brief am Laptop öffnen und den QR-Code mit dem Handy scannen",
      "1.1 · MyTCO auf den Startbildschirm legen",
      "1.1 · Mit dem Code aus dem Brief einloggen",
      "1.1 · Passkey einrichten",
      "1.1 · Am PC die Verwaltung öffnen und mit dem Code per Mail bestätigen",
      "1.1 · Auf der Seite «Rollen» dir selbst den Mitglieder-Admin und Corinne Meister den CM-Admin geben",
      "1.4 · Die Mitglieder-Personas mit Geschlecht und Jahrgang laut Steckbrief und den Mail-Adressen von der Regie anlegen (Daniela Doppel, Pascal Partner, Zora Zögerlich, Stefan Spät, Olga Ohnehandy mit erfundener Adresse, Weitere Mitglieder)",
      "1.4 · Briefe als PDF erzeugen und der Regie privat schicken"
    ],
    "2": [
      "2.6 · Die GV als Anlass laut Kalender anlegen",
      "2.7 · Mitteilung an den Verein «Einladung zur GV» schicken (Push, sonst E-Mail)"
    ],
    "3": [
      "3.3 · Als Mitglied deine Klassierung laut Steckbrief eintragen",
      "3.3 · Antworten zur GV ansehen",
      "3.3 · Bei Zora Zögerlich die Telefonnummer ändern",
      "3.3 · Mitteilung zur GV an «noch keine Antwort» schicken",
      "3.3 · Liste «Für Fairgate» öffnen und die selbst geänderten Angaben abhaken",
      "3.3 · Im Verlauf die Änderungen von heute ansehen"
    ],
    "4": [
      "4.2 · Mitteilung an den Verein «Die CM ist offen» schicken",
      "4.2 · Ort der GV ändern"
    ],
    "5": [
      "5.3 · Dich im Mixed allein anmelden mit «sucht Partner»",
      "5.3 · Die Anfrage von Stefan im Herren-Doppel nicht beantworten"
    ],
    "7": [
      "7.1 · Den Austritt von Pascal Partner erfassen",
      "7.4 · Den Wiedereintritt von Pascal Partner erfassen",
      "7.4 · Die Sitzungen von Stefan Spät beenden"
    ],
    "8": [
      "8.3 · Im Verlauf die Änderungen der Woche ansehen",
      "8.4 · Formular «Gesamt» ausfüllen"
    ]
  },
  "Daniela Doppel": {
    "2": [
      "2.1 · Brief am Laptop öffnen und den QR-Code mit dem Handy scannen",
      "2.1 · MyTCO auf den Startbildschirm legen",
      "2.1 · Mit dem Code aus dem Brief einloggen",
      "2.1 · Passkey einrichten",
      "2.1 · Push einschalten",
      "2.1 · Handy neu starten und MyTCO öffnen: noch angemeldet?",
      "2.1 · Die Hilfe-Seite und den Kontakt für Fragen finden",
      "2.8 · Prüfen, ob die Einladung zur GV per Push oder Mail ankam, und die GV auf der Startseite finden"
    ],
    "3": [
      "3.1 · Telefon und Adresse im Profil ändern",
      "3.1 · Einen Rufnamen setzen",
      "3.1 · Lizenznummer eintragen",
      "3.1 · Klassierung laut Steckbrief eintragen",
      "3.1 · E-Mail-Adresse auf die zweite Adresse ändern (nur wer eine hat)",
      "3.1 · Zur GV zu- oder absagen (Zora und Stefan sagen ab, mit Bemerkung)",
      "3.1 · Antwort einmal ändern",
      "3.1 · Die GV «In den Kalender» übernehmen"
    ],
    "4": [
      "4.4 · Prüfen, ob die Mitteilung ankam",
      "4.4 · Die passenden Kategorien ansehen",
      "4.4 · Dich im Einzel Damen B anmelden und die Bestätigung prüfen",
      "4.4 · Im Mixed Pascal Partner als Partner anfragen"
    ],
    "5": [
      "5.4 · Der Turnierleitung eine Frage schreiben",
      "5.9 · Die GV ist «zu prüfen» (Ort geändert): Antwort neu bestätigen"
    ],
    "6": [
      "6.4 · Die Antwort der Turnierleitung lesen",
      "6.4 · Ausloggen",
      "6.4 · Einen neuen Code per Mail holen und damit einloggen",
      "6.4 · Ausloggen und mit dem Passkey einloggen"
    ],
    "7": [
      "7.2 · Die Meldung zum zurückgezogenen Mixed finden"
    ],
    "8": [
      "8.2 · Deine Anmeldungen ansehen",
      "8.2 · Im Interclub ein Spiel mit Einzelpartien öffnen",
      "8.2 · Die Datenschutzerklärung finden",
      "8.2 · Den Passkey entfernen",
      "8.4 · Formular «Gesamt» ausfüllen"
    ]
  },
  "Pascal Partner": {
    "2": [
      "2.2 · Brief am Laptop öffnen und den QR-Code mit dem Handy scannen",
      "2.2 · MyTCO auf den Startbildschirm legen",
      "2.2 · Mit dem Code aus dem Brief einloggen",
      "2.2 · Passkey einrichten",
      "2.2 · Push einschalten",
      "2.2 · Handy neu starten und MyTCO öffnen: noch angemeldet?",
      "2.2 · Die Hilfe-Seite und den Kontakt für Fragen finden",
      "2.8 · Prüfen, ob die Einladung zur GV per Push oder Mail ankam, und die GV auf der Startseite finden"
    ],
    "3": [
      "3.1 · Telefon und Adresse im Profil ändern",
      "3.1 · Einen Rufnamen setzen",
      "3.1 · Lizenznummer eintragen",
      "3.1 · Klassierung laut Steckbrief eintragen",
      "3.1 · E-Mail-Adresse auf die zweite Adresse ändern (nur wer eine hat)",
      "3.1 · Zur GV zu- oder absagen (Zora und Stefan sagen ab, mit Bemerkung)",
      "3.1 · Antwort einmal ändern",
      "3.1 · Die GV «In den Kalender» übernehmen"
    ],
    "4": [
      "4.5 · Prüfen, ob die Mitteilung ankam",
      "4.5 · Dich im Einzel Herren A anmelden",
      "4.5 · Im Interclub einem Team folgen"
    ],
    "5": [
      "5.1 · Die Anfrage von Daniela annehmen",
      "5.9 · Die GV ist «zu prüfen» (Ort geändert): Antwort neu bestätigen"
    ],
    "6": [
      "6.5 · Push ausschalten und wieder einschalten",
      "6.5 · Freiwillig: am PC mit dem Passkey vom Handy einloggen"
    ],
    "7": [
      "7.3 · MyTCO öffnen: was siehst du?",
      "7.5 · Mit einem neuen Code per Mail einloggen"
    ],
    "8": [
      "8.2 · Deine Anmeldungen ansehen",
      "8.2 · Im Interclub ein Spiel mit Einzelpartien öffnen",
      "8.2 · Die Datenschutzerklärung finden",
      "8.2 · Den Passkey entfernen",
      "8.4 · Formular «Gesamt» ausfüllen"
    ]
  },
  "Zora Zögerlich": {
    "2": [
      "2.3 · Brief am Laptop öffnen und den QR-Code mit dem Handy scannen",
      "2.3 · MyTCO auf den Startbildschirm legen",
      "2.3 · Mit dem Code aus dem Brief einloggen",
      "2.3 · Passkey einrichten",
      "2.3 · Push einschalten",
      "2.3 · Handy neu starten und MyTCO öffnen: noch angemeldet?",
      "2.3 · Die Hilfe-Seite und den Kontakt für Fragen finden",
      "2.8 · Prüfen, ob die Einladung zur GV per Push oder Mail ankam, und die GV auf der Startseite finden"
    ],
    "3": [
      "3.1 · Telefon und Adresse im Profil ändern",
      "3.1 · Einen Rufnamen setzen",
      "3.1 · Lizenznummer eintragen",
      "3.1 · Klassierung laut Steckbrief eintragen",
      "3.1 · E-Mail-Adresse auf die zweite Adresse ändern (nur wer eine hat)",
      "3.1 · Zur GV zu- oder absagen (Zora und Stefan sagen ab, mit Bemerkung)",
      "3.1 · Antwort einmal ändern",
      "3.1 · Die GV «In den Kalender» übernehmen"
    ],
    "4": [
      "4.6 · Dich im Einzel Damen B anmelden",
      "4.6 · Für Damen A eine Wildcard mit Begründung beantragen"
    ],
    "5": [
      "5.2 · Die Anfrage von Corinne im Damen-Doppel finden und ablehnen",
      "5.2 · Im Mixed Stefan Spät anfragen und die Anfrage wieder zurückziehen",
      "5.2 · Dich im Mixed allein anmelden mit «sucht Partner» und einem Kommentar",
      "5.9 · Die GV ist «zu prüfen» (Ort geändert): Antwort neu bestätigen"
    ],
    "6": [
      "6.5 · Push ausschalten und wieder einschalten",
      "6.5 · Freiwillig: am PC mit dem Passkey vom Handy einloggen"
    ],
    "8": [
      "8.2 · Deine Anmeldungen ansehen",
      "8.2 · Im Interclub ein Spiel mit Einzelpartien öffnen",
      "8.2 · Die Datenschutzerklärung finden",
      "8.2 · Den Passkey entfernen",
      "8.4 · Formular «Gesamt» ausfüllen"
    ]
  },
  "Stefan Spät": {
    "2": [
      "2.4 · Brief am Laptop öffnen und den QR-Code mit dem Handy scannen",
      "2.4 · MyTCO auf den Startbildschirm legen",
      "2.4 · Mit dem Code aus dem Brief einloggen",
      "2.4 · Passkey einrichten",
      "2.4 · Push einschalten",
      "2.4 · Handy neu starten und MyTCO öffnen: noch angemeldet?",
      "2.4 · Die Hilfe-Seite und den Kontakt für Fragen finden",
      "2.8 · Prüfen, ob die Einladung zur GV per Push oder Mail ankam, und die GV auf der Startseite finden"
    ],
    "3": [
      "3.1 · Telefon und Adresse im Profil ändern",
      "3.1 · Einen Rufnamen setzen",
      "3.1 · Lizenznummer eintragen",
      "3.1 · Klassierung laut Steckbrief eintragen",
      "3.1 · E-Mail-Adresse auf die zweite Adresse ändern (nur wer eine hat)",
      "3.1 · Zur GV zu- oder absagen (Zora und Stefan sagen ab, mit Bemerkung)",
      "3.1 · Antwort einmal ändern",
      "3.1 · Die GV «In den Kalender» übernehmen"
    ],
    "5": [
      "5.5 · Im Herren-Doppel Markus Verwalter anfragen (Markus antwortet nicht)",
      "5.9 · Die GV ist «zu prüfen» (Ort geändert): Antwort neu bestätigen"
    ],
    "6": [
      "6.1 · Versuchen, dich im Einzel Herren 55+ anzumelden (die Anmeldung ist geschlossen)",
      "6.3 · Die Meldung zum abgesagten Herren-Doppel finden",
      "6.3 · Dich im Einzel Herren 55+ anmelden",
      "6.3 · Dich wieder abmelden"
    ],
    "7": [
      "7.6 · MyTCO öffnen und wieder einloggen"
    ],
    "8": [
      "8.2 · Deine Anmeldungen ansehen",
      "8.2 · Im Interclub ein Spiel mit Einzelpartien öffnen",
      "8.2 · Die Datenschutzerklärung finden",
      "8.2 · Den Passkey entfernen",
      "8.4 · Formular «Gesamt» ausfüllen"
    ]
  },
  "Weiteres Mitglied": {
    "2": [
      "2.5 · Brief am Laptop öffnen und den QR-Code mit dem Handy scannen",
      "2.5 · MyTCO auf den Startbildschirm legen",
      "2.5 · Mit dem Code aus dem Brief einloggen",
      "2.5 · Passkey einrichten",
      "2.5 · Push einschalten",
      "2.5 · Handy neu starten und MyTCO öffnen: noch angemeldet?",
      "2.5 · Die Hilfe-Seite und den Kontakt für Fragen finden",
      "2.8 · Prüfen, ob die Einladung zur GV per Push oder Mail ankam, und die GV auf der Startseite finden"
    ],
    "3": [
      "3.1 · Telefon und Adresse im Profil ändern",
      "3.1 · Einen Rufnamen setzen",
      "3.1 · Lizenznummer eintragen",
      "3.1 · Klassierung laut Steckbrief eintragen",
      "3.1 · E-Mail-Adresse auf die zweite Adresse ändern (nur wer eine hat)",
      "3.1 · Zur GV zu- oder absagen (Zora und Stefan sagen ab, mit Bemerkung)",
      "3.1 · Antwort einmal ändern",
      "3.1 · Die GV «In den Kalender» übernehmen"
    ],
    "4": [
      "4.7 · Dich in einer passenden Einzel-Kategorie anmelden"
    ],
    "5": [
      "5.9 · Die GV ist «zu prüfen» (Ort geändert): Antwort neu bestätigen"
    ],
    "6": [
      "6.5 · Push ausschalten und wieder einschalten",
      "6.5 · Freiwillig: am PC mit dem Passkey vom Handy einloggen"
    ],
    "8": [
      "8.2 · Deine Anmeldungen ansehen",
      "8.2 · Im Interclub ein Spiel mit Einzelpartien öffnen",
      "8.2 · Die Datenschutzerklärung finden",
      "8.2 · Den Passkey entfernen",
      "8.4 · Formular «Gesamt» ausfüllen"
    ]
  }
};

/** Freiwillige Zusatz-Schritte der Admin-Personas: Persona → Akt → Schritte. */
const ZUSATZ = {
  "Corinne Meister": {
    "6": [
      "Bei Olga Ohnehandy die Anmeldung in ein anderes Einzel verschieben und zurück"
    ]
  },
  "Markus Verwalter": {
    "1": [
      "Mitgliederliste am PC nach Name sortieren und nach Ort filtern",
      "Seiteninfo der Mitgliederliste lesen",
      "Briefe als Serie für alle neuen Mitglieder erzeugen"
    ],
    "3": [
      "Eine Datei mit zwei erfundenen Mitgliedern einlesen (Vorlage von der Regie)"
    ],
    "7": [
      "Auskunft für Olga Ohnehandy drucken",
      "Ein eingelesenes Mitglied aus Akt 3 zum Löschen vormerken und wieder rückgängig machen"
    ],
    "8": [
      "«Ansicht als …» Mitglied öffnen und wieder beenden"
    ]
  }
};

const SPALTEN_GING = ['ging', 'ging mit Mühe', 'ging nicht', 'nicht gemacht'];
const SPALTEN_GUT = ['gut gelöst', 'geht so', 'umständlich'];
const MAIL = ['im Posteingang', 'im Spam', 'nicht angekommen', 'keine erwartet'];
const KEINE_NAMEN = 'Bitte keine Namen.';

function erstelleFormular() {
  const form = FormApp.create('MyTCO Probelauf – Rückmeldung');
  form.setDescription(
    'Ohne Namen. Bitte keine Namen in die Textfelder. Pro Akt einmal ausfüllen, am Abend.'
  );
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);

  form
    .addCheckboxItem()
    .setTitle('Mit welchen Geräten hast du heute gearbeitet?')
    .setChoiceValues(['iPhone', 'Android', 'PC'])
    .setRequired(true);
  const personaFrage = form.addMultipleChoiceItem().setTitle('Deine Persona').setRequired(true);

  // Seiten in der Reihenfolge, in der sie im Formular stehen; `danach` = wohin es nach der Seite geht.
  const seiten = [];
  const aktSeiten = {};
  for (const persona of PERSONAS) {
    const akte = Object.keys(SCHRITTE[persona]);
    const seite = form.addPageBreakItem().setTitle(persona);
    const aktFrage = form.addMultipleChoiceItem().setTitle(persona + ': Welcher Akt?').setRequired(true);
    aktSeiten[persona] = seite;
    seiten.push({ seite: seite, danach: null });
    const abschnitte = [];
    for (const akt of akte) {
      const titel = persona + ' – Akt ' + akt;
      const abschnitt = form.addPageBreakItem().setTitle(titel);
      const zeilen = SCHRITTE[persona][akt];
      form.addGridItem().setTitle(titel + ': Hat es funktioniert?').setRows(zeilen).setColumns(SPALTEN_GING);
      form.addGridItem().setTitle(titel + ': Wie gut gelöst?').setRows(zeilen).setColumns(SPALTEN_GUT);
      const zusatz = (ZUSATZ[persona] || {})[akt];
      if (zusatz) {
        form.addGridItem().setTitle(titel + ': Zusatz – hat es funktioniert?').setRows(zusatz).setColumns(SPALTEN_GING);
        form.addGridItem().setTitle(titel + ': Zusatz – wie gut gelöst?').setRows(zusatz).setColumns(SPALTEN_GUT);
      }
      form.addMultipleChoiceItem().setTitle(titel + ': Kam die Mail an?').setChoiceValues(MAIL);
      form.addParagraphTextItem().setTitle(titel + ': Was war unklar oder hat gefehlt?').setHelpText(KEINE_NAMEN);
      abschnitte.push({ akt: akt, seite: abschnitt });
      seiten.push({ seite: abschnitt, danach: akt === '8' ? 'gesamt' : 'absenden' });
    }
    aktFrage.setChoices(abschnitte.map((a) => aktFrage.createChoice('Akt ' + a.akt, a.seite)));
  }

  const gesamt = form.addPageBreakItem().setTitle('Gesamt');
  seiten.push({ seite: gesamt, danach: null });
  form.addParagraphTextItem().setTitle('Was gefällt dir an MyTCO?').setHelpText(KEINE_NAMEN);
  form.addParagraphTextItem().setTitle('Was fehlt dir?').setHelpText(KEINE_NAMEN);
  form.addMultipleChoiceItem().setTitle('Würdest du MyTCO nutzen?').setChoiceValues(['gern', 'vielleicht', 'eher nicht']);
  form.addMultipleChoiceItem().setTitle('Dein Mailanbieter').setChoiceValues(['Bluewin', 'Gmail', 'GMX', 'iCloud', 'anderer']);
  form.addParagraphTextItem().setTitle('Was sollten wir sonst noch wissen?').setHelpText(KEINE_NAMEN);

  // Google Forms setzt «nach dieser Seite» am folgenden Seitenumbruch.
  for (let i = 0; i < seiten.length - 1; i++) {
    const ziel = seiten[i].danach;
    if (ziel === 'gesamt' && seiten[i + 1].seite !== gesamt) seiten[i + 1].seite.setGoToPage(gesamt);
    else if (ziel === 'absenden') seiten[i + 1].seite.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  }

  personaFrage.setChoices(PERSONAS.map((p) => personaFrage.createChoice(p, aktSeiten[p])));

  const tabelle = SpreadsheetApp.create('MyTCO Probelauf – Antworten');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, tabelle.getId());

  Logger.log('Formular für die Testpersonen: ' + form.getPublishedUrl());
  Logger.log('Formular bearbeiten: ' + form.getEditUrl());
  Logger.log('Antwort-Tabelle (Link an Claude): ' + tabelle.getUrl());
}
