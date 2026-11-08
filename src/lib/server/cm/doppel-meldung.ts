// Meldungen zum Doppel (FR-47): Push, sonst E-Mail, verschickt über `meldeMitgliedern`. Sie nennen
// keinen CM-Admin und keinen Grund wie einen Austritt. Namen kommen in der kurzen Textform
// «Hannes (Johannes Muster)» (`nameFuerText`).

export type DoppelMeldung = { titel: 'Clubmeisterschaft'; text: string; pfad: string };

const meldung = (text: string, turnierId: number): DoppelMeldung => ({
	titel: 'Clubmeisterschaft',
	text,
	pfad: `/clubmeisterschaft/${turnierId}`
});

/** FR-04: an den Partner, wenn das Paar wegen Austritt oder Löschung zurückgezogen ist. */
export const austrittMeldung = (kategorie: string, turnierId: number) =>
	meldung(`Eure Anmeldung für «${kategorie}» ist zurückgezogen.`, turnierId);

/** FR-04: an den anderen einer offenen Anfrage, wenn sie wegen Austritt oder Löschung verfällt. */
export const austrittAnfrageMeldung = (kategorie: string, turnierId: number) =>
	meldung(`Die Anfrage für «${kategorie}» ist hinfällig.`, turnierId);

/** FR-48: an den Angefragten. `von` ist die kurze Textform des Namens, nie eine Telefonnummer. */
export const anfrageMeldung = (von: string, kategorie: string, turnierId: number) =>
	meldung(
		`${von} möchte mit dir «${kategorie}» spielen. Annehmen oder ablehnen kannst du in MyTCO.`,
		turnierId
	);

/** FR-48: an den Anfragenden, wenn der andere angenommen hat. */
export const angenommenMeldung = (an: string, kategorie: string, turnierId: number) =>
	meldung(`${an} hat angenommen. Ihr seid für «${kategorie}» angemeldet.`, turnierId);

/** FR-48: an den Anfragenden, ohne Grund. */
export const abgelehntMeldung = (an: string, kategorie: string, turnierId: number) =>
	meldung(`${an} hat deine Anfrage für «${kategorie}» abgelehnt.`, turnierId);

/** FR-48: an Dritte, deren Anfrage verfällt, weil `mitName` nun einen Partner hat. */
export const hinfaelligMeldung = (mitName: string, kategorie: string, turnierId: number) =>
	meldung(
		`${mitName} hat inzwischen einen Partner für «${kategorie}». Die Anfrage ist hinfällig.`,
		turnierId
	);

/** FR-10: an den Partner, wenn sich einer des Paars abmeldet. */
export const abgemeldetMeldung = (wer: string, kategorie: string, turnierId: number) =>
	meldung(
		`${wer} hat sich von «${kategorie}» abgemeldet. Eure Anmeldung ist zurückgezogen.`,
		turnierId
	);
