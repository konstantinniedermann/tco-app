import { randomUUID } from 'node:crypto';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	gibLogin,
	legeKontoMitBriefCodeAn,
	legeOffenesTurnierAn,
	schliesseLoginHilfen,
	setzeSpielerangaben,
	setzeTelefon,
	stelleAnfrageDirekt,
	warteAufMail
} from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// CM Teil 3 Etappe 1: Doppel mit Partner-Anfrage am Handy (A-ANMELDUNG-04, FR-48, FR-49, FR-19,
// FR-10). Jedes Mitglied hat sein eigenes Gerät (Browser-Kontext); Meldungen kommen ohne Push-Abo
// als Mail (FR-47) und werden aus Mailpit gelesen.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

// Pro Jahr gibt es ein Turnier; jedes Projekt und jeder Test hat sein festes Jahr, getrennt von
// den übrigen E2E-Tests (2081–2099). `legeOffenesTurnierAn` löscht das Turnier des Jahres vorher.
const JAHR_ANFRAGE: Record<string, number> = { iphone: 2080, android: 2079 };
const JAHR_ALLEIN: Record<string, number> = { iphone: 2078, android: 2077 };
const JAHR_ABLEHNEN: Record<string, number> = { iphone: 2076, android: 2075 };

function testjahr(jahre: Record<string, number>, info: TestInfo): number {
	const jahr = jahre[info.project.name];
	if (!jahr) throw new Error(`Kein Testjahr für das Projekt ${info.project.name}`);
	return jahr;
}

const MIXED: KategorieWerte = {
	name: 'Mixed Doppel',
	geschlecht: 'mixed',
	art: 'doppel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: null,
	klassierungBis: null,
	mindestsumme: 9
};

// Erfundene Nummern (DS-08).
const TELEFON_LEA = '079 000 00 01';
const TELEFON_MARCO = '079 000 00 02';
const KOMMENTAR = 'Suche jemanden auf R5–R7-Niveau, eher abends.';
const GEGNER_HINWEIS =
	'Dann sehen deine Gegner und dein Doppelpartner während der Clubmeisterschaft deine ' +
	'E-Mail-Adresse und Telefonnummer.';

type Konto = Awaited<ReturnType<typeof legeKontoMitBriefCodeAn>> & { nachname: string };

/**
 * Lea (R4) und Marco (R5) passen zusammen ins Mixed (Summe 9); beide mit Telefon. Die Nachnamen
 * sind pro Lauf eindeutig: Die E2E-Datenbank überdauert die Läufe, und die Partnersuche zeigt
 * höchstens 20 Treffer.
 */
async function legeLeaUndMarcoAn(): Promise<{ lea: Konto; marco: Konto }> {
	const zusatz = randomUUID().slice(0, 6);
	const lea = {
		...(await legeKontoMitBriefCodeAn('Lea', `Probe${zusatz}`)),
		nachname: `Probe${zusatz}`
	};
	await setzeSpielerangaben(lea.mitgliedId, { geschlecht: 'w', jahrgang: 1992, klassierung: 'R4' });
	await setzeTelefon(lea.mitgliedId, TELEFON_LEA);
	const marco = {
		...(await legeKontoMitBriefCodeAn('Marco', `Muster${zusatz}`)),
		nachname: `Muster${zusatz}`
	};
	await setzeSpielerangaben(marco.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1990,
		klassierung: 'R5'
	});
	await setzeTelefon(marco.mitgliedId, TELEFON_MARCO);
	return { lea, marco };
}

/** Ein weiteres Gerät für ein zweites Mitglied, gestartet vom Symbol auf dem Startbildschirm. */
async function zweitesGeraet(page: Page, info: TestInfo) {
	const kontext = await page.context().browser()!.newContext(info.project.use);
	const seite = await kontext.newPage();
	await startetVomSymbol(seite);
	return { kontext, seite, fehler: sammleKonsolenfehler(seite) };
}

/** Login mit dem Brief-Code; danach hat das Mitglied ein Login und erscheint in der Partnersuche. */
async function meldeAn(page: Page, konto: { code: string; vorname: string }) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	// Die Reiter laden den Code ihrer Seiten vor; ein folgendes page.goto bräche das ab.
	await wartetAufVorladen(page);
}

/** Wartet auf die CM-Seite; die Anmelde-Seite des Doppels hat eigene Statuszeilen. */
async function istAufCm(page: Page, jahr: number) {
	await expect(
		page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
	).toBeVisible();
}

/** Zur CM-Seite des Turniers. */
async function oeffneCm(page: Page, turnierId: number, jahr: number) {
	await page.goto(`/clubmeisterschaft/${turnierId}`);
	await istAufCm(page, jahr);
}

/** Karte der Doppel-Kategorie, solange man dort nicht angemeldet ist. */
const doppelKarte = (page: Page) =>
	page.locator('div.karte').filter({ has: page.getByText(MIXED.name, { exact: true }) });

/** Eigene Karte der Doppel-Kategorie (Paar oder allein). */
const eigeneKarte = (page: Page) => page.getByRole('region', { name: MIXED.name, exact: true });

const anfrageKarte = (page: Page) =>
	page.getByRole('region', { name: `Anfrage für «${MIXED.name}»` });

test('A-ANMELDUNG-04, FR-48, FR-19: Lea fragt Marco an, Marco nimmt an, beide sehen sich', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder melden sich am Handy an; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(120_000);
	const fehler = sammleKonsolenfehler(page);
	const jahr = testjahr(JAHR_ANFRAGE, info);
	const {
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn(jahr, [MIXED]);
	const { lea, marco } = await legeLeaUndMarcoAn();
	const leaName = `Lea ${lea.nachname}`;
	const marcoName = `Marco ${marco.nachname}`;

	// Marco löst seinen Brief-Code ein: Erst mit Login erscheint er in der Suche.
	const marcos = await zweitesGeraet(page, info);
	await meldeAn(marcos.seite, marco);

	// Lea öffnet das Doppel von der CM-Seite aus und sucht Marco.
	await startetVomSymbol(page);
	await meldeAn(page, lea);
	await oeffneCm(page, turnierId, jahr);
	await doppelKarte(page).getByRole('link', { name: 'Anmelden' }).click();
	await expect(page.getByRole('heading', { level: 1, name: MIXED.name })).toBeVisible();
	await expect(page).toHaveURL(
		new RegExp(`/clubmeisterschaft/${turnierId}/doppel/${kategorieId}$`)
	);
	await page.getByLabel('Partner suchen').fill(marco.nachname);
	const treffer = page.getByRole('list', { name: 'Treffer' }).getByRole('listitem');
	await expect(treffer).toHaveCount(1);
	await expect(treffer).toContainText(`${marcoName} · R5`);
	// FR-19: Vor dem Annehmen sieht Lea keinen Kontakt von Marco.
	await expect(treffer).not.toContainText(TELEFON_MARCO);
	await expect(treffer).not.toContainText(marco.email);
	await pruefeBildschirm(page, info, 'cm-doppel-partner');

	// FR-48: Rückfrage vor dem Senden.
	await treffer.getByRole('button', { name: 'Anfragen' }).click();
	const rueckfrage = page.getByRole('dialog', { name: `${marcoName} anfragen?` });
	await expect(rueckfrage).toContainText(
		'Marco sieht deinen Namen, deine Klassierung und deine Telefonnummer (ohne Telefon deine ' +
			'E-Mail), damit Marco dich erreichen kann.'
	);
	// FR-19: Schon vor dem Senden heisst es, dass auch die Gegner E-Mail und Telefon sehen.
	await expect(rueckfrage).toContainText(GEGNER_HINWEIS);
	await expect(rueckfrage).toContainText(
		'Meldet sich später einer von euch ab, ist die ganze Doppel-Anmeldung zurückgezogen.'
	);
	await pruefeBildschirm(page, info, 'cm-doppel-rueckfrage');
	await rueckfrage.getByRole('button', { name: 'Anfrage senden' }).click();

	// Zurück auf der CM-Seite: die offene Anfrage, noch ohne Kontakt von Marco.
	await istAufCm(page, jahr);
	await expect(page.getByRole('status')).toHaveText(`Anfrage an ${marcoName} gesendet.`);
	await expect(doppelKarte(page)).toContainText(`Deine Anfrage an ${marcoName}`);
	await expect(doppelKarte(page).getByRole('button', { name: 'Zurückziehen' })).toBeVisible();
	await expect(page.getByText(TELEFON_MARCO)).toHaveCount(0);
	await expect(page.getByText(marco.email)).toHaveCount(0);

	// Mail an Marco nennt Lea, aber keine Telefonnummer.
	const anfrageMail = await warteAufMail(
		marco.email,
		'Clubmeisterschaft',
		'möchte mit dir «Mixed Doppel» spielen'
	);
	expect(anfrageMail).toContain(`${leaName} möchte mit dir «Mixed Doppel» spielen.`);
	expect(anfrageMail).not.toContain(TELEFON_LEA);
	expect(anfrageMail).not.toMatch(/\d{3} \d{3} \d{2} \d{2}/);

	// Marco sieht die Anfrage oben, mit Leas Telefon, und nimmt an.
	await oeffneCm(marcos.seite, turnierId, jahr);
	const anfrage = anfrageKarte(marcos.seite);
	await expect(anfrage).toContainText(`${leaName} · R4 möchte mit dir spielen.`);
	await expect(anfrage.getByRole('link', { name: TELEFON_LEA })).toHaveAttribute(
		'href',
		'tel:0790000001'
	);
	await expect(anfrage).not.toContainText(lea.email);
	// FR-19: Vor dem Annehmen sagt die Karte, dass auch die Gegner E-Mail und Telefon sehen.
	await expect(anfrage).toContainText(`Nimmst du an, seid ihr angemeldet. ${GEGNER_HINWEIS}`);
	await pruefeBildschirm(marcos.seite, info, 'cm-doppel-anfrage');
	await anfrage.getByRole('button', { name: 'Annehmen' }).click();
	await expect(marcos.seite.getByRole('status')).toHaveText(
		`Angemeldet mit ${leaName} für Mixed Doppel. Die Bestätigung kommt per Mail.`
	);
	await expect(anfrageKarte(marcos.seite)).toHaveCount(0);
	await expect(eigeneKarte(marcos.seite)).toContainText(`Du spielst mit ${leaName}.`);
	await expect(eigeneKarte(marcos.seite).getByRole('link', { name: lea.email })).toBeVisible();

	await warteAufMail(lea.email, 'Clubmeisterschaft', `${marcoName} hat angenommen.`);

	// FR-19: Lea sieht jetzt Marcos Telefon und E-Mail.
	await page.reload();
	const paar = eigeneKarte(page);
	await expect(paar).toContainText(`Du spielst mit ${marcoName}.`);
	await expect(paar.getByRole('link', { name: TELEFON_MARCO })).toHaveAttribute(
		'href',
		'tel:0790000002'
	);
	await expect(paar.getByRole('link', { name: marco.email })).toHaveAttribute(
		'href',
		`mailto:${marco.email}`
	);
	await expect(paar).toContainText('Dann ist auch Marco abgemeldet und bekommt eine Meldung.');
	await pruefeBildschirm(page, info, 'cm-doppel-paar');

	expect(fehler).toEqual([]);
	expect(marcos.fehler).toEqual([]);
	// Erst nach der Prüfung schliessen: Beim Schliessen macht Playwright den Screenshot
	// (`screenshot: 'on'`), und WebKit meldet dessen Stylesheet als CSP-Verstoss.
	await marcos.kontext.close();
});

test('FR-49, FR-10: allein mit Kommentar, Kommentar sichtbar, Abmelden zieht Paar zurück', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder melden sich am Handy an; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(150_000);
	const fehler = sammleKonsolenfehler(page);
	const jahr = testjahr(JAHR_ALLEIN, info);
	const {
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn(jahr, [MIXED]);
	const { lea, marco } = await legeLeaUndMarcoAn();
	const leaName = `Lea ${lea.nachname}`;
	const marcoName = `Marco ${marco.nachname}`;
	const otto = await legeKontoMitBriefCodeAn('Otto', `Probe${randomUUID().slice(0, 6)}`);
	await setzeSpielerangaben(otto.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1980,
		klassierung: 'R6'
	});

	// FR-49: Lea meldet sich allein an, mit Kommentar; vorher der Hinweis zu den Kontaktdaten.
	await startetVomSymbol(page);
	await meldeAn(page, lea);
	await oeffneCm(page, turnierId, jahr);
	await doppelKarte(page).getByRole('link', { name: 'Anmelden' }).click();
	await expect(page.getByRole('heading', { level: 1, name: MIXED.name })).toBeVisible();
	await page.getByLabel('Kommentar').fill(KOMMENTAR);
	await expect(page.getByText('45 von 120 Zeichen', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Allein anmelden' }).click();
	const hinweis = page.getByRole('dialog', { name: 'Bevor du dich anmeldest' });
	await expect(hinweis).toContainText('E-Mail-Adresse und Telefonnummer');
	await hinweis.getByRole('button', { name: 'Anmelden' }).click();
	await istAufCm(page, jahr);
	await expect(page.getByRole('status')).toHaveText(
		'Angemeldet für Mixed Doppel. Die Bestätigung kommt per Mail.'
	);
	const eigene = eigeneKarte(page);
	await expect(eigene).toContainText('sucht Partner');
	await expect(eigene).toContainText('Du bist allein angemeldet. Wer mag, wählt dich.');
	await expect(eigene).toContainText(`Dein Kommentar: «${KOMMENTAR}»`);
	await expect(eigene.getByRole('link', { name: 'Partner anfragen' })).toBeVisible();
	await expect(eigene.getByRole('button', { name: 'Kommentar ändern' })).toBeVisible();
	await pruefeBildschirm(page, info, 'cm-doppel-sucht');

	// Ein drittes Mitglied sieht bei der Kategorie, dass Lea sucht, mit ihrem Kommentar.
	const ottos = await zweitesGeraet(page, info);
	await meldeAn(ottos.seite, otto);
	await oeffneCm(ottos.seite, turnierId, jahr);
	await expect(doppelKarte(ottos.seite)).toContainText('sucht Partner');
	await expect(doppelKarte(ottos.seite)).toContainText(leaName);
	await expect(doppelKarte(ottos.seite)).toContainText(`«${KOMMENTAR}»`);

	// Marco findet Lea als «sucht Partner» mit Kommentar und fragt sie an.
	const marcos = await zweitesGeraet(page, info);
	await meldeAn(marcos.seite, marco);
	await marcos.seite.goto(`/clubmeisterschaft/${turnierId}/doppel/${kategorieId}`);
	await marcos.seite.getByLabel('Partner suchen').fill(lea.nachname);
	const treffer = marcos.seite.getByRole('list', { name: 'Treffer' }).getByRole('listitem');
	await expect(treffer).toHaveCount(1);
	await expect(treffer).toContainText(`${leaName} · R4`);
	await expect(treffer).toContainText('sucht Partner');
	await expect(treffer).toContainText(`«${KOMMENTAR}»`);
	await treffer.getByRole('button', { name: 'Anfragen' }).click();
	await marcos.seite
		.getByRole('dialog', { name: `${leaName} anfragen?` })
		.getByRole('button', { name: 'Anfrage senden' })
		.click();
	await istAufCm(marcos.seite, jahr);
	await expect(marcos.seite.getByRole('status')).toHaveText(`Anfrage an ${leaName} gesendet.`);

	// Lea nimmt an; der Kommentar ist danach weg (FR-49).
	await page.reload();
	await anfrageKarte(page).getByRole('button', { name: 'Annehmen' }).click();
	await expect(page.getByRole('status')).toHaveText(
		`Angemeldet mit ${marcoName} für Mixed Doppel. Die Bestätigung kommt per Mail.`
	);
	await expect(eigeneKarte(page)).toContainText(`Du spielst mit ${marcoName}.`);
	await expect(page.getByText(KOMMENTAR)).toHaveCount(0);
	await ottos.seite.reload();
	await expect(doppelKarte(ottos.seite)).toContainText('Angemeldet (1):');
	await expect(doppelKarte(ottos.seite)).toContainText(leaName);
	await expect(doppelKarte(ottos.seite)).toContainText(marcoName);
	await expect(ottos.seite.getByText(KOMMENTAR)).toHaveCount(0);
	await expect(doppelKarte(ottos.seite).getByText('sucht Partner')).toHaveCount(0);

	// FR-10: Marco meldet sich ab; die ganze Anmeldung ist zurückgezogen, Lea bekommt eine Mail.
	await oeffneCm(marcos.seite, turnierId, jahr);
	await eigeneKarte(marcos.seite).getByRole('button', { name: 'Abmelden' }).click();
	await expect(marcos.seite.getByRole('status')).toHaveText('Abgemeldet von Mixed Doppel.');
	await expect(doppelKarte(marcos.seite)).toContainText('Noch niemand angemeldet.');
	const abgemeldet = await warteAufMail(
		lea.email,
		'Clubmeisterschaft',
		'hat sich von «Mixed Doppel» abgemeldet'
	);
	expect(abgemeldet).toContain(
		`${marcoName} hat sich von «Mixed Doppel» abgemeldet. Eure Anmeldung ist zurückgezogen.`
	);
	await page.reload();
	await expect(eigeneKarte(page)).toHaveCount(0);
	await expect(doppelKarte(page)).toContainText('Noch niemand angemeldet.');

	expect(fehler).toEqual([]);
	expect(ottos.fehler).toEqual([]);
	expect(marcos.fehler).toEqual([]);
	await ottos.kontext.close();
	await marcos.kontext.close();
});

test('FR-48: Ablehnen', async ({ page }, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder melden sich am Handy an; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const jahr = testjahr(JAHR_ABLEHNEN, info);
	const {
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn(jahr, [MIXED]);
	const { lea, marco } = await legeLeaUndMarcoAn();
	const leaName = `Lea ${lea.nachname}`;
	const marcoName = `Marco ${marco.nachname}`;

	// Marco hat ein Login; Leas Anfrage an ihn läuft über die Fachlogik. Auch Lea braucht ein
	// Login, sonst erscheint ihre Anfrage nicht (FR-48: die Antwort muss sie erreichen).
	await startetVomSymbol(page);
	await meldeAn(page, marco);
	await gibLogin(lea.kontoId);
	await stelleAnfrageDirekt(kategorieId, lea.mitgliedId, marco.mitgliedId);
	await oeffneCm(page, turnierId, jahr);
	await expect(anfrageKarte(page)).toContainText(`${leaName} · R4 möchte mit dir spielen.`);
	await anfrageKarte(page).getByRole('button', { name: 'Ablehnen' }).click();
	await expect(page.getByRole('status')).toHaveText(`Anfrage von ${leaName} abgelehnt.`);
	await expect(anfrageKarte(page)).toHaveCount(0);
	await expect(page.getByText(TELEFON_LEA)).toHaveCount(0);
	// WCAG 2.4.3: Die Karte ist weg, der Fokus landet nicht im Leeren.
	await expect
		.poll(() => page.evaluate(() => document.activeElement?.tagName ?? 'keins'))
		.not.toMatch(/^(BODY|keins)$/);

	const abgelehnt = await warteAufMail(
		lea.email,
		'Clubmeisterschaft',
		'hat deine Anfrage für «Mixed Doppel» abgelehnt'
	);
	expect(abgelehnt).toContain(`${marcoName} hat deine Anfrage für «Mixed Doppel» abgelehnt.`);
	expect(fehler).toEqual([]);
});
