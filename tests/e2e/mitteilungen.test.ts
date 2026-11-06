import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import {
	holeMailCode,
	legeCmMitBriefCodeAn,
	legeKontoAn,
	legeOffenenAnlassAn,
	legeRollenkontoMitBriefCodeAn,
	meldeZumAnlass,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import { klappeAuf, pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';
import { MAILPIT_URL } from './hilfen/umgebung.ts';

// Mitteilungen der Verwaltung (FR-42, FR-43). Gesendet wird nur an Mitglieder, die der Test selbst
// anlegt (Empfänger «Kommen» an einem eigenen Anlass): Eine Mitteilung an alle ginge auch an die
// Konten paralleler Tests, die gerade auf ihren Login-Code in Mailpit warten.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

type Konto = Awaited<ReturnType<typeof legeRollenkontoMitBriefCodeAn>>;

async function meldeAn(page: Page, konto: Konto) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
}

/** Schickt den Admin-Code, liest ihn aus Mailpit und bestätigt (SI-08); `ziel`: erste Seite. */
async function bestaetige(page: Page, konto: Konto, ziel: RegExp, titel: string) {
	await expect(page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' })).toBeVisible();
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(konto.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page).toHaveURL(ziel);
	// Erst weiter, wenn die Seite steht: ein folgendes page.goto bricht sonst die laufende
	// Zugangsprüfung ab, und WebKit unter Linux meldet das als Konsolenfehler.
	await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();
}

/**
 * Über die Kachel statt `page.goto`: Die Reiter der Startseite laden den Code ihrer Seiten gleich
 * vor; ein `page.goto` mitten hinein bricht das ab, und WebKit meldet «Importing a module script
 * failed» in der Konsole. Ein Klick wechselt in der App, ohne das Laden abzubrechen.
 */
async function oeffneVerwaltung(
	page: Page,
	konto: Konto,
	erste = { url: /\/verwaltung\/mitglieder$/, titel: 'Mitglieder' }
) {
	await meldeAn(page, konto);
	await page.getByRole('link', { name: 'Verwaltung' }).click();
	await bestaetige(page, konto, erste.url, erste.titel);
}

const seitenleiste = (page: Page) => page.getByRole('navigation', { name: 'Verwaltung' });
// Auf der Seite des Anlasses heissen auch dessen Felder «Titel»; darum alles in der Karte.
const neu = (page: Page) => page.getByRole('region', { name: 'Neue Mitteilung' });
const sendenTaste = (page: Page) => neu(page).getByRole('button', { name: 'Senden', exact: true });

/** Zum Anlass über die Links der Verwaltung, wie ein Admin dorthin kommt. */
async function oeffneAnlass(page: Page, titel: string) {
	await seitenleiste(page).getByRole('link', { name: 'Anlässe' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Anlässe' })).toBeVisible();
	await page.getByRole('link', { name: titel, exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();
}

async function oeffneMitteilungen(page: Page) {
	await seitenleiste(page).getByRole('link', { name: 'Mitteilungen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Mitteilungen' })).toBeVisible();
}

/** Wartet auf die Mail an `adresse` und gibt ihren Betreff zurück. */
async function holeBetreff(adresse: string, wartezeitMs = 15_000): Promise<string> {
	const suche = new URL('/api/v1/search', MAILPIT_URL);
	suche.searchParams.set('query', `to:"${adresse}"`);
	const ende = Date.now() + wartezeitMs;
	while (Date.now() < ende) {
		const antwort = await fetch(suche);
		if (antwort.ok) {
			const { messages } = (await antwort.json()) as { messages: { Subject: string }[] };
			if (messages.length > 0) return messages[0].Subject;
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error('Keine Mail in Mailpit angekommen');
}

/** Eigener Anlass, auf den genau ein eigenes Mitglied mit «kommt» geantwortet hat. */
async function anlassMitEinemGast(admin: Konto) {
	const titel = `GV ${randomUUID().slice(0, 8)}`;
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	const gast = await legeKontoAn('Hugo', nachname);
	const anlassId = await legeOffenenAnlassAn(admin.mitgliedId, titel);
	await meldeZumAnlass(anlassId, gast.mitgliedId, 'kommt');
	return { titel, anlassId, gast, name: `${nachname}, Hugo` };
}

test('FR-42: Mitglieder-Admin wählt Erinnerung, sieht Vorschau mit Zahl und Namen, sendet nach Rückfrage, Verlauf zeigt den Eintrag', async ({
	page
}, info) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Mona', ['mitglieder']);
	const { titel, gast, name } = await anlassMitEinemGast(admin);

	await oeffneVerwaltung(page, admin);
	await oeffneAnlass(page, titel);
	await expect(page.getByText('Noch keine Mitteilungen verschickt.')).toBeVisible();
	await page.getByRole('button', { name: 'Neue Mitteilung' }).click();
	await neu(page).getByRole('button', { name: 'Erinnerung', exact: true }).click();

	// Die Vorlage ist ausgefüllt, die Erinnerung geht vorgewählt an alle ohne Antwort.
	const betreff = `Erinnerung: ${titel}`;
	await expect(neu(page).getByLabel('Titel')).toHaveValue(betreff);
	await expect(neu(page).getByLabel('Text')).toHaveValue(
		/^GV .*: Bitte melde dich bis .* an oder ab\.$/
	);
	await expect(page.getByText(`${betreff.length} von 50 Zeichen`)).toBeVisible();
	await expect(
		page.getByText(
			'Keine Namen, Telefonnummern oder Resultate: Die Mitteilung kann auf dem Sperrbildschirm stehen'
		)
	).toBeVisible();
	await expect(neu(page).getByLabel('Noch keine Antwort')).toBeChecked();
	await expect(neu(page).getByLabel('Push, sonst E-Mail')).toBeChecked();
	await expect(sendenTaste(page)).toBeDisabled();
	await neu(page).getByLabel('Kommen', { exact: true }).check();

	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await expect(page.getByText('1 Mitglied: 0 per Push, 1 per E-Mail')).toBeVisible();
	await klappeAuf(page, 'Namen');
	await expect(neu(page).getByRole('listitem').filter({ hasText: name })).toBeVisible();
	await expect(sendenTaste(page)).toBeEnabled();
	await pruefeBildschirm(page, info, 'mitteilung-vorschau');

	// Eine Änderung nach der Vorschau verwirft sie; Senden geht erst wieder mit neuer Vorschau.
	await neu(page).getByLabel('Push und E-Mail an alle').check();
	await expect(page.getByText('1 Mitglied:')).toHaveCount(0);
	await expect(sendenTaste(page)).toBeDisabled();
	await neu(page).getByLabel('Push, sonst E-Mail').check();
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await expect(page.getByText('1 Mitglied: 0 per Push, 1 per E-Mail')).toBeVisible();

	// Rückfrage: Abbrechen schickt nichts.
	await sendenTaste(page).click();
	const rueckfrage = page.getByRole('dialog', { name: 'Jetzt an 1 Mitglied senden?' });
	await expect(rueckfrage).toBeVisible();
	await pruefeBildschirm(page, info, 'mitteilung-rueckfrage');
	await rueckfrage.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(rueckfrage).toBeHidden();
	await sendenTaste(page).click();
	await rueckfrage.getByRole('button', { name: 'Senden' }).click();

	await expect(page.getByText('Gesendet: 0 per Push, 1 per E-Mail.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Neue Mitteilung' })).toBeVisible();
	const zeile = page.getByRole('region', { name: 'Verschickte Mitteilungen' }).getByRole('row');
	await expect(zeile).toHaveCount(2);
	await expect(zeile.nth(1)).toContainText(betreff);
	await expect(zeile.nth(1)).toContainText('Muster, Mona');
	await expect(zeile.nth(1)).toContainText('Kommen');
	await expect(zeile.nth(1)).toContainText('Push, sonst E-Mail');
	await expect(zeile.nth(1)).toContainText('0 per Push, 1 per E-Mail');
	// Spec Ziel 12: keine Namen der Empfänger im Verlauf.
	await expect(zeile.nth(1)).not.toContainText(name);
	await pruefeBildschirm(page, info, 'mitteilung-verlauf');

	// DS-05: eine eigene Mail an den Gast, Betreff = Titel.
	expect(await holeBetreff(gast.email)).toBe(betreff);
	expect(fehler).toEqual([]);
});

test('FR-42: Senden-Taste ist während des Sendens gesperrt', async ({ page }) => {
	test.setTimeout(60_000);
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Mona', ['mitglieder']);
	const { titel, gast } = await anlassMitEinemGast(admin);

	await oeffneVerwaltung(page, admin);
	await oeffneAnlass(page, titel);
	await page.getByRole('button', { name: 'Neue Mitteilung' }).click();
	await neu(page).getByRole('button', { name: 'Leer anfangen' }).click();
	await expect(neu(page).getByLabel('Titel')).toHaveValue('');
	await neu(page).getByLabel('Titel').fill('Platz gesperrt');
	await neu(page).getByLabel('Text').fill('Heute bleibt Platz 2 wegen Arbeiten zu.');
	await neu(page).getByLabel('Kommen', { exact: true }).check();
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await expect(page.getByText('1 Mitglied: 0 per Push, 1 per E-Mail')).toBeVisible();

	// Der Server antwortet erst, wenn der Test es erlaubt.
	let freigeben = () => {};
	const freigegeben = new Promise<void>((r) => (freigeben = r));
	let anfragen = 0;
	await page.route('**/api/admin/anlaesse/*/mitteilungen/senden', async (route) => {
		anfragen++;
		await freigegeben;
		await route.continue();
	});

	await sendenTaste(page).click();
	await page
		.getByRole('dialog', { name: 'Jetzt an 1 Mitglied senden?' })
		.getByRole('button', { name: 'Senden' })
		.click();
	const wartet = page.getByRole('button', { name: 'Wird gesendet …' });
	await expect(wartet).toBeDisabled();
	await expect(page.getByText('Das kann bis zu einer Minute dauern.')).toBeVisible();
	await expect(neu(page).getByLabel('Titel')).toBeDisabled();
	await expect(neu(page).getByRole('button', { name: 'Vorschau' })).toBeDisabled();
	await wartet.click({ force: true });
	freigeben();

	await expect(page.getByText('Gesendet: 0 per Push, 1 per E-Mail.')).toBeVisible();
	expect(anfragen).toBe(1);
	expect(await holeBetreff(gast.email)).toBe('Platz gesperrt');
	expect(fehler).toEqual([]);
});

test('FR-42: allgemeine Mitteilung an den Verein', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Mona', ['mitglieder']);
	await oeffneVerwaltung(page, admin);
	await oeffneMitteilungen(page);

	// Ohne Vorlage gleich das leere Formular; Empfänger ohne Wahl.
	await page.getByRole('button', { name: 'Neue Mitteilung' }).click();
	await expect(neu(page).getByLabel('Titel')).toBeFocused();
	await expect(page.getByText('Empfänger: Alle aktiven Mitglieder')).toBeVisible();
	await expect(neu(page).getByLabel('Kommen', { exact: true })).toHaveCount(0);
	await neu(page).getByLabel('Titel').fill('Clubhaus offen');
	await neu(page).getByLabel('Text').fill('Ab Samstag ist das Clubhaus wieder offen.');
	await neu(page).getByLabel('Push und E-Mail an alle').check();
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	// Spec Ziel 11, Weg «an alle»: wer Push hat, bekommt beides.
	await expect(
		page.getByText(/^\d+ Mitglieder: \d+ per Push und E-Mail, \d+ nur per E-Mail/)
	).toBeVisible();
	await pruefeBildschirm(page, info, 'mitteilung-verein-vorschau');

	// Der Versand an alle aktiven Mitglieder ist in admin-schnittstellen.db.test.ts belegt; hier
	// antwortet ein Ersatz, damit keine Mail an Konten paralleler Tests geht.
	// Der erste Versuch scheitert unterwegs: Die Mitteilung kann trotzdem schon draussen sein.
	let anfrage: unknown = null;
	let versuche = 0;
	await page.route('**/api/admin/mitteilungen/senden', async (route) => {
		versuche++;
		anfrage = route.request().postDataJSON();
		if (versuche === 1) {
			await route.fulfill({ status: 502, body: 'Bad Gateway' });
			return;
		}
		await route.fulfill({
			status: 201,
			json: { push: 0, mails: 3, ersatzMails: 0, nichtErreichbar: 1 }
		});
	});
	await sendenTaste(page).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Senden' }).click();
	await expect(neu(page).getByRole('alert')).toContainText(
		'Prüfe den Verlauf, bevor du es erneut versuchst.'
	);
	await sendenTaste(page).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Senden' }).click();
	await expect(
		page.getByText('Gesendet: 0 per Push, 3 per E-Mail, nicht erreichbar: 1.')
	).toBeVisible();
	expect(anfrage).toEqual({
		titel: 'Clubhaus offen',
		text: 'Ab Samstag ist das Clubhaus wieder offen.',
		auswahl: 'alle',
		weg: 'push-und-mail'
	});
	// Nur die vorgetäuschte 502 steht in der Konsole.
	expect(fehler.filter((f) => !/status of 502\b/.test(f))).toEqual([]);
});

test('FR-43: Eingabe während der Vorschau verwirft die späte Antwort, Senden bleibt gesperrt', async ({
	page
}) => {
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Mona', ['mitglieder']);
	await oeffneVerwaltung(page, admin);
	await oeffneMitteilungen(page);
	await page.getByRole('button', { name: 'Neue Mitteilung' }).click();
	await neu(page).getByLabel('Titel').fill('Clubhaus offen');
	await neu(page).getByLabel('Text').fill('Ab Samstag offen.');

	// Die Antwort der Vorschau kommt erst, nachdem der Text schon geändert ist.
	let freigeben = () => {};
	const freigegeben = new Promise<void>((r) => (freigeben = r));
	let angekommen = () => {};
	const unterwegs = new Promise<void>((r) => (angekommen = r));
	await page.route('**/api/admin/mitteilungen/vorschau', async (route) => {
		angekommen();
		await freigegeben;
		await route.continue();
	});
	const antwort = page.waitForResponse('**/api/admin/mitteilungen/vorschau');
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await unterwegs;
	await neu(page).getByLabel('Text').fill('Ab Sonntag offen.');
	freigeben();
	await antwort;
	await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));

	await expect(neu(page).getByText(/^\d+ Mitglieder?:/)).toHaveCount(0);
	await expect(sendenTaste(page)).toBeDisabled();
	await expect(page.getByText('Senden geht nach der Vorschau.')).toBeVisible();

	// Eine neue Vorschau gilt; gesendet wird genau, was sie zeigte.
	await page.unroute('**/api/admin/mitteilungen/vorschau');
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await expect(neu(page).getByText(/^\d+ Mitglieder?:/)).toBeVisible();
	let anfrage: unknown = null;
	await page.route('**/api/admin/mitteilungen/senden', async (route) => {
		anfrage = route.request().postDataJSON();
		await route.fulfill({
			status: 201,
			json: { push: 0, mails: 1, ersatzMails: 0, nichtErreichbar: 0 }
		});
	});
	await sendenTaste(page).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Senden' }).click();
	await expect(page.getByText('Gesendet: 0 per Push, 1 per E-Mail.')).toBeVisible();
	expect(anfrage).toMatchObject({ titel: 'Clubhaus offen', text: 'Ab Sonntag offen.' });
	expect(fehler).toEqual([]);
});

test('FR-42: MyTCO-Admin sieht nur den Verlauf, ohne «Neue Mitteilung»', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const mytco = await legeRollenkontoMitBriefCodeAn('Theo', ['mytco']);
	const { titel } = await anlassMitEinemGast(mytco);
	await oeffneVerwaltung(page, mytco);
	await oeffneMitteilungen(page);
	await expect(page.getByText('Nur ansehen.')).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: 'Verschickt' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Neue Mitteilung' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'mitteilung-verein-nur-ansehen');

	await oeffneAnlass(page, titel);
	await expect(page.getByRole('heading', { level: 2, name: 'Mitteilungen' })).toBeVisible();
	await expect(page.getByText('Noch keine Mitteilungen verschickt.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Neue Mitteilung' })).toHaveCount(0);
	expect(fehler).toEqual([]);
});

test('FR-42: CM-Admin sieht keinen Bereich Mitteilungen', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const cm = await legeCmMitBriefCodeAn('Dario');
	await oeffneVerwaltung(page, cm, { url: /\/verwaltung\/turniere$/, titel: 'Clubmeisterschaft' });

	// RR-07: die Seite führt zu den Turnieren, die Seitenleiste nennt sie nicht.
	await page.goto('/verwaltung/mitteilungen');
	await expect(page).toHaveURL(/\/verwaltung\/turniere$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Clubmeisterschaft' })).toBeVisible();
	await expect(seitenleiste(page).getByRole('link', { name: 'Mitteilungen' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'mitteilung-cm-ohne-bereich');
	expect(fehler).toEqual([]);
});
