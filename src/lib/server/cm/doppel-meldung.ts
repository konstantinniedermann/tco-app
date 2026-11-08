// Meldungen zum Doppel (FR-47): Push, sonst E-Mail, verschickt über `meldeMitgliedern`. Sie nennen
// keinen CM-Admin und keinen Grund wie einen Austritt.

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
