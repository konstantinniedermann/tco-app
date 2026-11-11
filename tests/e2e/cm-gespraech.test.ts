import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	antworteAlsLeitung,
	entferneKontaktperson,
	holeMailCode,
	legeKontoMitBriefCodeAn,
	legeOffenesTurnierAn,
	legeRollenkontoMitBriefCodeAn,
	schliesseLoginHilfen,
	schreibeNachricht,
	setzeKontaktperson,
	stelleBriefCodeAus,
	warteAufMail
} from './hilfen/login.ts';
import {
	pruefeBildschirm,
	pruefePfad,
	sammleKonsolenfehler,
	wartetAufMitgliederliste,
	wartetAufVorladen
} from './hilfen/seite.ts';

// Gespräch mit der Turnierleitung in der Mitglieder-App (A-TURNIER-04, FR-50 bis FR-52).

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

const OFFEN: KategorieWerte = {
	name: 'Offen R1–R9',
	geschlecht: 'offen',
	art: 'einzel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: 'R1',
	klassierungBis: 'R9',
	mindestsumme: null
};

type Konto = Awaited<ReturnType<typeof legeKontoMitBriefCodeAn>>;

async function meldeAn(page: Page, konto: Pick<Konto, 'code' | 'vorname'>) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	// Die Reiter laden den Code ihrer Seiten vor; ein folgendes page.goto bräche das ab.
	await wartetAufVorladen(page);
}

const mitglied = async () => {
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	return { ...(await legeKontoMitBriefCodeAn('Moritz', nachname)), nachname };
};

const fragenKarte = (page: Page) =>
	page.locator('section.karte', {
		has: page.getByRole('heading', { level: 2, name: 'Fragen oder Probleme?' })
	});

test('A-TURNIER-04, FR-50: Mitglied schreibt der Turnierleitung und sieht die eigene Blase', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder schreiben am Handy; die Verwaltung am PC prüfen die Tests unten
	const konsole = sammleKonsolenfehler(page);
	const { turnierId, jahr } = await legeOffenesTurnierAn([OFFEN]);
	const leitung = `Leitung${info.project.name}`;
	const cmAdmin = await legeRollenkontoMitBriefCodeAn('Leonie', ['cm'], leitung);
	await setzeKontaktperson(turnierId, cmAdmin.mitgliedId);
	const konto = await mitglied();

	await startetVomSymbol(page);
	await meldeAn(page, konto);
	await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
	await expect(
		page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
	).toBeVisible();

	const karte = fragenKarte(page);
	await expect(karte).toContainText(`Kontaktperson: Leonie ${leitung} (CM-Admin)`);
	await expect(karte.getByText('neue Antwort')).toHaveCount(0);
	await pruefeBildschirm(page, info, 'cm-fragen-karte');
	await karte.getByRole('link', { name: /Schreib der Turnierleitung/ }).click();

	await expect(
		page.getByRole('heading', { level: 1, name: 'Frage an die Turnierleitung' })
	).toBeVisible();
	await expect(page.getByRole('link', { name: `‹ Clubmeisterschaft ${jahr}` })).toBeVisible();
	await expect(page.getByRole('list', { name: 'Verlauf' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'cm-gespraech-leer');

	const frage = 'Kann ich die Gruppenspiele vorziehen?';
	await page.getByLabel('Deine Nachricht').fill(frage);
	await page.getByRole('button', { name: 'Senden' }).click();
	const blase = page.getByRole('listitem').filter({ hasText: frage });
	await expect(blase).toBeVisible();
	await expect(blase.locator('.blase-kopf')).toContainText('Du ·');
	await expect(blase).toHaveClass(/blase-eigen/);
	await expect(page.getByLabel('Deine Nachricht')).toHaveValue('');
	await pruefeBildschirm(page, info, 'cm-gespraech-eigene-blase');

	// UI-06: zu lang geht nicht über das Feld hinaus; leer meldet der Server beim Feld.
	await page.getByRole('button', { name: 'Senden' }).click();
	await expect(page.getByRole('alert')).toBeVisible();
	await expect(page.getByLabel('Deine Nachricht')).toHaveAttribute('aria-invalid', 'true');

	// Die Karte der CM-Seite führt jetzt zum bestehenden Gespräch.
	await page.getByRole('link', { name: `‹ Clubmeisterschaft ${jahr}` }).click();
	await expect(
		fragenKarte(page).getByRole('link', { name: /Schreib der Turnierleitung/ })
	).toBeVisible();
	expect(konsole).toEqual([]);
});

test('A-TURNIER-04, FR-51: ohne Kontaktperson keine Karte, die Kontaktperson selbst ohne Kachel', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder schreiben am Handy; die Verwaltung am PC prüfen die Tests unten
	const { turnierId, jahr } = await legeOffenesTurnierAn([OFFEN]);
	const konto = await mitglied();
	await startetVomSymbol(page);
	await meldeAn(page, konto);
	await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
	await expect(
		page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
	).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: 'Fragen oder Probleme?' })).toHaveCount(
		0
	);

	// Die Kontaktperson sieht ihren Namen, aber nichts zum Schreiben.
	const leitung = `Leitung${info.project.name}`;
	const cmAdmin = await legeRollenkontoMitBriefCodeAn('Leonie', ['cm'], leitung);
	await setzeKontaktperson(turnierId, cmAdmin.mitgliedId);
	await page.context().clearCookies();
	await page.evaluate(() => window.localStorage.clear());
	await meldeAn(page, cmAdmin);
	await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
	const karte = fragenKarte(page);
	await expect(karte).toContainText(`Kontaktperson: Leonie ${leitung} (CM-Admin)`);
	await expect(karte.getByRole('link')).toHaveCount(0);
	await pruefeBildschirm(page, info, 'cm-fragen-karte-kontaktperson');
});

test('A-TURNIER-04, FR-51: nur lesend, wenn die Kontaktperson fehlt, ohne Feld', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder schreiben am Handy; die Verwaltung am PC prüfen die Tests unten
	const { turnierId, jahr } = await legeOffenesTurnierAn([OFFEN]);
	const cmAdmin = await legeRollenkontoMitBriefCodeAn(
		'Leonie',
		['cm'],
		`Leitung${info.project.name}`
	);
	await setzeKontaktperson(turnierId, cmAdmin.mitgliedId);
	const konto = await mitglied();
	const frage = 'Wann ist die Auslosung?';
	await schreibeNachricht(turnierId, konto.mitgliedId, frage);
	await entferneKontaktperson(turnierId);

	await startetVomSymbol(page);
	await meldeAn(page, konto);
	await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
	const karte = fragenKarte(page);
	await expect(karte).not.toContainText('Kontaktperson');
	await karte.getByRole('link', { name: /Dein Gespräch mit der Turnierleitung/ }).click();

	await expect(page.getByRole('listitem').filter({ hasText: frage })).toBeVisible();
	await expect(page.getByText('Schreiben geht zurzeit nicht.')).toBeVisible();
	await expect(page.getByLabel('Deine Nachricht')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Senden' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'cm-gespraech-nur-lesen');
});

test('A-TURNIER-04, FR-52: neue Antwort zeigt Plakette und Kachel, nach dem Öffnen sind sie weg', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder schreiben am Handy; die Verwaltung am PC prüfen die Tests unten
	const { turnierId, jahr } = await legeOffenesTurnierAn([OFFEN]);
	const cmAdmin = await legeRollenkontoMitBriefCodeAn(
		'Leonie',
		['cm'],
		`Leitung${info.project.name}`
	);
	await setzeKontaktperson(turnierId, cmAdmin.mitgliedId);
	const konto = await mitglied();
	await schreibeNachricht(turnierId, konto.mitgliedId, 'Darf ich verschieben?');
	const antwort = 'Ja, melde dich bei deinem Gegner.';
	await antworteAlsLeitung(turnierId, konto.mitgliedId, cmAdmin.mitgliedId, antwort);

	await startetVomSymbol(page);
	await meldeAn(page, konto);
	const startKachel = page.getByRole('link', { name: /Neue Antwort der Turnierleitung/ });
	await expect(startKachel).toContainText(`Clubmeisterschaft ${jahr}`);
	await pruefeBildschirm(page, info, 'start-neue-antwort');

	await page.getByRole('link', { name: new RegExp(`^Clubmeisterschaft ${jahr}`) }).click();
	await expect(fragenKarte(page).getByText('neue Antwort')).toBeVisible();
	await fragenKarte(page)
		.getByRole('link', { name: /Schreib der Turnierleitung/ })
		.click();

	const blase = page.getByRole('listitem').filter({ hasText: antwort });
	await expect(blase).toHaveClass(/blase-leitung/);
	await expect(blase.locator('.blase-kopf')).toContainText('Turnierleitung ·');
	await expect(blase.locator('.plakette')).toHaveText('neu');
	await expect(
		page.getByRole('listitem').filter({ hasText: 'Darf ich verschieben?' }).locator('.plakette')
	).toHaveCount(0);
	await pruefeBildschirm(page, info, 'cm-gespraech-antwort');

	// Die Seite hat die Antwort als gelesen gemeldet: Plakette und Kachel sind weg.
	await page.getByRole('link', { name: `‹ Clubmeisterschaft ${jahr}` }).click();
	await expect(fragenKarte(page)).toBeVisible();
	await expect(fragenKarte(page).getByText('neue Antwort')).toHaveCount(0);
	await page.getByRole('link', { name: 'Start', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	await expect(page.getByRole('link', { name: /Neue Antwort der Turnierleitung/ })).toHaveCount(0);
});

// Verwaltung: Posteingang und Gespräch der Turnierleitung (A-TURNIER-04, FR-50 bis FR-54).

/** Von der Startseite über die Verwaltung (Code aus der Mail, SI-08) bis zur ersten Seite. */
async function oeffneVerwaltung(page: Page, konto: Konto, titel: string) {
	await meldeAn(page, konto);
	await page.getByRole('link', { name: 'Verwaltung' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' })).toBeVisible();
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(konto.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();
}

const abmelden = async (page: Page) => {
	await page.context().clearCookies();
	await page.evaluate(() => window.localStorage.clear());
};

test('A-TURNIER-04, FR-50, FR-52, FR-53: die Turnierleitung beantwortet, erledigt und merkt gleichzeitige Antworten', async ({
	page
}, info) => {
	test.setTimeout(150_000);
	const konsole = sammleKonsolenfehler(page);
	const { turnierId, jahr } = await legeOffenesTurnierAn([OFFEN]);
	const turnierName = `Clubmeisterschaft ${jahr}`;
	const hanna = await legeRollenkontoMitBriefCodeAn('Hanna', ['cm'], `Muster${info.project.name}`);
	const leonie = await legeRollenkontoMitBriefCodeAn(
		'Leonie',
		['cm'],
		`Leitung${info.project.name}`
	);
	await setzeKontaktperson(turnierId, hanna.mitgliedId);
	const mitgl = await mitglied();
	const frage = 'Kann ich meine Gruppenspiele\nvorziehen?';

	// Das Mitglied schreibt; die Kontaktperson bekommt eine Meldung ohne Inhalt und ohne Namen.
	await startetVomSymbol(page);
	await meldeAn(page, mitgl);
	await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
	await fragenKarte(page)
		.getByRole('link', { name: /Schreib der Turnierleitung/ })
		.click();
	await page.getByLabel('Deine Nachricht').fill(frage);
	await page.getByRole('button', { name: 'Senden' }).click();
	await expect(page.getByRole('listitem').filter({ hasText: frage })).toBeVisible();
	const mail = await warteAufMail(
		hanna.email,
		'Clubmeisterschaft',
		'Neue Nachricht an die Turnierleitung.'
	);
	expect(mail).not.toContain(frage);
	expect(mail).not.toContain(mitgl.nachname);
	await abmelden(page);

	// Ein zweiter CM-Admin sieht den Posteingang.
	await oeffneVerwaltung(page, leonie, 'Clubmeisterschaft');
	await page.getByRole('link', { name: turnierName }).click();
	await expect(page.getByRole('heading', { level: 1, name: turnierName })).toBeVisible();
	const abschnitt = page.locator('div.karte', {
		has: page.getByText('Fragen an die Turnierleitung')
	});
	await expect(page.getByRole('heading', { level: 2, name: 'Nachrichten' })).toBeVisible();
	await expect(abschnitt.locator('.plakette-offen')).toHaveText('1 offen');
	await expect(abschnitt).toContainText('Kontaktperson: Hanna');
	await pruefeBildschirm(page, info, 'verwaltung-turnier-nachrichten');
	await abschnitt.getByRole('link', { name: 'Posteingang · 1 offen, 0 erledigt' }).click();

	await expect(
		page.getByRole('heading', { level: 1, name: 'Nachrichten an die Turnierleitung' })
	).toBeVisible();
	await pruefePfad(page, ['Turniere', turnierName], 'Nachrichten');
	await expect(page.locator('.kennzahl', { hasText: 'offen' })).toContainText('1');
	await expect(
		page.getByText(`Alle Gespräche dieses Turniers werden am 1. Januar ${jahr + 1} gelöscht.`)
	).toBeVisible();
	const reihe = page.getByRole('row', { name: new RegExp(mitgl.nachname) });
	await expect(reihe).toContainText(`${mitgl.nachname}, Moritz`);
	await expect(reihe).toContainText(frage);
	await expect(reihe.locator('.plakette-offen')).toHaveText('offen');
	await pruefeBildschirm(page, info, 'verwaltung-posteingang');
	await reihe.getByRole('link', { name: `${mitgl.nachname}, Moritz` }).click();

	// Antworten: der Verlauf zeigt den antwortenden Admin; das Feld leert sich.
	const gespraechName = `Moritz ${mitgl.nachname}`;
	await expect(page.getByRole('heading', { level: 1, name: gespraechName })).toBeVisible();
	await pruefePfad(page, ['Turniere', turnierName, 'Nachrichten'], `${mitgl.nachname}, Moritz`);
	const verlauf = page.getByRole('region', { name: 'Verlauf' });
	await expect(verlauf).toContainText(frage);
	// Zeilenumbrüche des Mitglieds bleiben im Verlauf erhalten.
	expect(await verlauf.getByText('Gruppenspiele').innerText()).toContain('\n');
	await expect(page.getByText('Moritz sieht als Absender nur «Turnierleitung».')).toBeVisible();
	await pruefeBildschirm(page, info, 'verwaltung-gespraech');
	const antwort = 'Ja, das geht. Melde die Resultate wie immer.';
	await page.getByLabel('Antwort der Turnierleitung').fill(antwort);
	await page.getByRole('button', { name: 'Antworten', exact: true }).click();
	await expect(verlauf).toContainText(antwort);
	await expect(verlauf).toContainText(`Turnierleitung (Leonie Leitung${info.project.name})`);
	await expect(page.getByLabel('Antwort der Turnierleitung')).toHaveValue('');

	// Gleichzeitig: eine andere Antwort kommt dazwischen; der Text bleibt, erst die zweite Taste sendet.
	await antworteAlsLeitung(turnierId, mitgl.mitgliedId, hanna.mitgliedId, 'Ich war schneller.');
	const eigene = 'Meine Antwort kommt danach.';
	await page.getByLabel('Antwort der Turnierleitung').fill(eigene);
	await page.getByRole('button', { name: 'Antworten', exact: true }).click();
	await expect(
		page.getByText(
			'Inzwischen hat jemand geantwortet. Lies die Antwort, dann sende deine trotzdem oder ändere sie.'
		)
	).toBeVisible();
	await expect(verlauf).toContainText('Ich war schneller.');
	await expect(verlauf).not.toContainText(eigene);
	await expect(page.getByLabel('Antwort der Turnierleitung')).toHaveValue(eigene);
	await pruefeBildschirm(page, info, 'verwaltung-gespraech-inzwischen');
	await page.getByRole('button', { name: 'Antworten', exact: true }).click();
	await expect(verlauf).toContainText(eigene);
	await expect(page.getByText('Inzwischen hat jemand geantwortet.')).toHaveCount(0);

	// Erledigt: Plakette und Zähler folgen, Wieder öffnen kehrt es um.
	await page.getByRole('button', { name: 'Als erledigt markieren' }).click();
	await expect(page.locator('.karte-kopf .plakette')).toHaveText('erledigt');
	await expect(page.getByRole('button', { name: 'Wieder öffnen' })).toBeVisible();
	await page
		.getByRole('main')
		.getByRole('link', { name: /Nachrichten/ })
		.first()
		.click();
	await expect(page.locator('.kennzahl', { hasText: 'offen' })).toContainText('0');
	await expect(page.locator('.kennzahl', { hasText: 'erledigt' })).toContainText('1');
	await expect(page.getByRole('row', { name: new RegExp(mitgl.nachname) })).toContainText(
		'Turnierleitung: Meine Antwort kommt danach.'
	);
	await abmelden(page);

	// Das Mitglied liest «Turnierleitung», nie den Namen des Admins.
	// Der Brief-Code gilt nur einmal: das Mitglied bekommt einen neuen.
	await meldeAn(page, { vorname: mitgl.vorname, code: await stelleBriefCodeAus(mitgl.kontoId) });
	await page.getByRole('link', { name: new RegExp(`^Clubmeisterschaft ${jahr}`) }).click();
	await fragenKarte(page)
		.getByRole('link', { name: /Schreib der Turnierleitung/ })
		.click();
	const blase = page.getByRole('listitem').filter({ hasText: antwort });
	await expect(blase.locator('.blase-kopf')).toContainText('Turnierleitung ·');
	await expect(page.getByRole('main')).not.toContainText('Leonie');
	expect(konsole).toEqual([]);
});

test('A-TURNIER-04, FR-51: MyTCO-Admin sieht Posteingang und Gespräch nur zum Ansehen, ein fremdes Gespräch führt zurück', async ({
	page
}, info) => {
	test.setTimeout(120_000);
	const konsole = sammleKonsolenfehler(page);
	const { turnierId } = await legeOffenesTurnierAn([OFFEN]);
	const fremd = await legeOffenesTurnierAn([OFFEN]);
	const leitung = await legeRollenkontoMitBriefCodeAn(
		'Leonie',
		['cm'],
		`Leitung${info.project.name}`
	);
	await setzeKontaktperson(turnierId, leitung.mitgliedId);
	const mitgl = await mitglied();
	await schreibeNachricht(turnierId, mitgl.mitgliedId, 'Wann ist die Auslosung?');
	const mytco = await legeRollenkontoMitBriefCodeAn('Tobias', ['mytco']);

	await meldeAn(page, mytco);
	await page.goto('/verwaltung');
	await expect(page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' })).toBeVisible();
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(mytco.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await wartetAufMitgliederliste(page);

	await page.goto(`/verwaltung/turniere/${turnierId}/nachrichten`);
	await expect(page.getByText('Nur ansehen.')).toBeVisible();
	const reihe = page.getByRole('row', { name: new RegExp(mitgl.nachname) });
	await expect(reihe).toContainText('Wann ist die Auslosung?');
	await reihe.getByRole('link').click();
	await expect(page.getByRole('region', { name: 'Verlauf' })).toContainText(
		'Wann ist die Auslosung?'
	);
	await expect(page.getByLabel('Antwort der Turnierleitung')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Antworten', exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Als erledigt markieren' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'verwaltung-gespraech-nur-ansehen');

	// Ein Gespräch gehört zu seinem Turnier: unter einem anderen führt es zurück zum Posteingang.
	const gid = page.url().split('/').at(-1);
	await page.goto(`/verwaltung/turniere/${fremd.turnierId}/nachrichten/${gid}`);
	await expect(page).toHaveURL(new RegExp(`/verwaltung/turniere/${fremd.turnierId}/nachrichten$`));
	await expect(
		page.getByRole('heading', { level: 1, name: 'Nachrichten an die Turnierleitung' })
	).toBeVisible();
	await expect(page.getByText('Noch keine Nachrichten.')).toBeVisible();
	expect(konsole).toEqual([]);
});

test('A-TURNIER-04: die Turnierliste zeigt die offenen Nachrichten', async ({ page }, info) => {
	test.setTimeout(120_000);
	const { turnierId, jahr } = await legeOffenesTurnierAn([OFFEN]);
	const leitung = await legeRollenkontoMitBriefCodeAn(
		'Leonie',
		['cm'],
		`Zeile${info.project.name}`
	);
	await setzeKontaktperson(turnierId, leitung.mitgliedId);
	await schreibeNachricht(turnierId, (await mitglied()).mitgliedId, 'Frage eins');
	await oeffneVerwaltung(page, leitung, 'Clubmeisterschaft');
	const reihe = page.getByRole('row', { name: new RegExp(`Clubmeisterschaft ${jahr}`) });
	await expect(page.getByRole('columnheader', { name: 'Offen' })).toBeVisible();
	await expect(reihe.getByRole('cell').last()).toHaveText('1');
});
