// Meldungen zum Doppel (FR-47): Push, sonst E-Mail, verschickt über `meldeMitgliedern`. Sie nennen
// den CM-Admin nur als Rolle, nie beim Namen (DS-05), und keinen Grund wie einen Austritt. Namen
// anderer Spieler kommen in der kurzen Textform «Hannes (Johannes Muster)» (`nameFuerText`).

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

// Texte zu Änderungen des CM-Admins (FR-46); Titel und Pfad setzt die Schnittstelle. Sie nennen
// den CM-Admin als Rolle, nie beim Namen.

/** FR-46: an jeden der beiden, wenn der CM-Admin ein Paar anmeldet oder zusammenlegt. */
export const vonHandPaarText = (partner: string, kategorie: string) =>
	`Der CM-Admin hat dich mit ${partner} für «${kategorie}» angemeldet. Partner und Gegner sehen deine E-Mail und Telefonnummer.`;

/** FR-46: an den Spieler, wenn der CM-Admin ihn allein (*sucht Partner*) anmeldet. */
export const vonHandAlleinText = (kategorie: string) =>
	`Der CM-Admin hat dich für «${kategorie}» angemeldet; du suchst noch einen Partner. Partner und Gegner sehen deine E-Mail und Telefonnummer.`;

/** FR-46: an den Anfragenden, wenn der CM-Admin seine Anfrage löscht, ohne Grund. */
export const anfrageGeloeschtText = (an: string, kategorie: string) =>
	`Deine Anfrage an ${an} für «${kategorie}» ist hinfällig.`;

/** FR-46: an den, der beim Partner ändern herausfällt; `bleibt` ist der andere. */
export const herausgenommenText = (bleibt: string, kategorie: string) =>
	`Der CM-Admin hat dich aus dem Doppel mit ${bleibt} für «${kategorie}» genommen.`;

/** FR-46: an den, der bleibt, wenn der CM-Admin einen neuen Partner einträgt. */
export const neuerPartnerText = (neu: string, kategorie: string) =>
	`Der CM-Admin hat ${neu} als deinen Partner für «${kategorie}» eingetragen.`;

/** FR-46: an den, der bleibt, wenn der CM-Admin den Partner ohne Ersatz herausnimmt. */
export const ohneErsatzText = (kategorie: string) =>
	`Der CM-Admin hat deinen Partner aus «${kategorie}» genommen. Du suchst jetzt einen Partner.`;

/** FR-46: an jeden Spieler einer verschobenen Doppel-Anmeldung; `allein` für einen Suchenden. */
export const verschobenDoppelText = (von: string, nach: string, allein: boolean) =>
	`Der CM-Admin hat ${allein ? 'deine' : 'eure'} Anmeldung von «${von}» nach «${nach}» verschoben.`;

/** FR-46: an jeden Spieler einer gelöschten Doppel-Anmeldung; `allein` für einen Suchenden. */
export const geloeschtDoppelText = (kategorie: string, allein: boolean) =>
	`Der CM-Admin hat ${allein ? 'deine' : 'eure'} Anmeldung für «${kategorie}» gelöscht.`;

/**
 * FR-46: an den anderen einer Anfrage, die beim Verschieben in der alten Kategorie verfällt;
 * `mit` ist der Verschobene. Er hat nicht unbedingt einen Partner, darum ohne Grund.
 */
export const anfrageHinfaelligText = (mit: string, kategorie: string) =>
	`Die Anfrage mit ${mit} für «${kategorie}» ist hinfällig.`;
