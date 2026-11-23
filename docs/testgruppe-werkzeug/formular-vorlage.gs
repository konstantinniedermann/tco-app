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

const PERSONAS = __PERSONAS__;

/** Persona → Akt → Schritte («<Einsatz> · <Schritt>»). */
const SCHRITTE = __SCHRITTE__;

/** Freiwillige Zusatz-Schritte der Admin-Personas: Persona → Akt → Schritte. */
const ZUSATZ = __ZUSATZ__;

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
