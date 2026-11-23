import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import {
	bestaetigeVerwaltungDirekt,
	legeKontoAn,
	legeKontoMitBriefCodeAn,
	legeRollenkontoMitBriefCodeAn,
	schliesseLoginHilfen,
	setzeJahrgang
} from './hilfen/login.ts';
import {
	pruefeBildschirm,
	sammleKonsolenfehler,
	wartetAufMitgliederliste,
	wartetAufVorladen
} from './hilfen/seite.ts';

// Tabellen-Steuerung (#92): Sortieren, Filtern und Spaltenbreite im Spaltentitel der Verwaltung.
// Die Listen zeigen die ganze gemeinsame Test-Datenbank; jeder Test filtert auf seinen eigenen,
// zufälligen Nachnamen. Ohne Mail-Code (Budget je IP): Bestätigung direkt in der Datenbank.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

type Konto = Awaited<ReturnType<typeof legeKontoMitBriefCodeAn>>;

async function oeffneVerwaltung(page: Page, konto: Konto, pfad = '/verwaltung/mitglieder') {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	await wartetAufVorladen(page);
	await bestaetigeVerwaltungDirekt(konto.kontoId);
	await page.goto(pfad);
}

const zufall = () => `Steuer${randomUUID().slice(0, 8)}`;
const tabelle = (page: Page) => page.getByRole('table');
const status = (page: Page) => page.getByRole('status');

/** Öffnet den Aufklapper einer Spalte und tippt in sein Textfeld; Esc schliesst ihn. */
async function filtereText(page: Page, spalte: string, text: string) {
	await page.getByRole('button', { name: `${spalte} filtern` }).click();
	await page.getByLabel(`${spalte} enthält`).fill(text);
	await page.keyboard.press('Escape');
}

async function legeDreiAn(nachname: string) {
	const alt = await legeKontoAn('Alma', nachname);
	await setzeJahrgang(alt.mitgliedId, 1970);
	const jung = await legeKontoMitBriefCodeAn('Jonas', nachname);
	await setzeJahrgang(jung.mitgliedId, 2010);
	const mitte = await legeKontoAn('Mia', nachname);
	await setzeJahrgang(mitte.mitgliedId, 1990);
	return { alt, jung, mitte };
}

const zeilen = (page: Page, nachname: string): Locator =>
	tabelle(page).getByRole('row').filter({ hasText: nachname });

test('#92: Mitglieder sortieren und filtern im Spaltentitel, Text nie in der Adresse', async ({
	page
}, info) => {
	test.skip(info.project.name !== 'desktop', 'nur PC'); // skip: Sortieren und Filtern im Titel gibt es erst ab 60rem
	const fehler = sammleKonsolenfehler(page);
	const nachname = zufall();
	const admin = await legeRollenkontoMitBriefCodeAn('Tabea', ['mitglieder']);
	await legeDreiAn(nachname);
	await oeffneVerwaltung(page, admin);
	await wartetAufMitgliederliste(page);

	await filtereText(page, 'Name', nachname);
	await expect(zeilen(page, nachname)).toHaveCount(3);
	await expect(status(page)).toHaveText(/^3 von \d+ Mitgliedern$/);
	await expect(page.getByText(`Name: ${nachname}`)).toBeVisible();

	await page.getByRole('button', { name: 'Jahrgang', exact: true }).click();
	await expect(page.getByRole('columnheader', { name: /Jahrgang/ })).toHaveAttribute(
		'aria-sort',
		'ascending'
	);
	await expect(zeilen(page, nachname).first()).toContainText('1970');
	await page.getByRole('button', { name: 'Jahrgang', exact: true }).click();
	await expect(page.getByRole('columnheader', { name: /Jahrgang/ })).toHaveAttribute(
		'aria-sort',
		'descending'
	);
	await expect(zeilen(page, nachname).first()).toContainText('2010');

	await page.getByRole('button', { name: 'Konto filtern' }).click();
	await expect(page.getByText('Konto zeigen')).toBeVisible();
	await page.getByRole('checkbox', { name: /^Brief offen/ }).check();
	// UI-01: axe und Bild mit offenem Aufklapper (Bildvergleich mit dem Entwurf)
	await pruefeBildschirm(page, info, 'mitglieder-filter-offen');
	await page.keyboard.press('Escape');
	await expect(zeilen(page, nachname)).toHaveCount(1);
	await expect(zeilen(page, nachname)).toContainText('Jonas');
	await expect(status(page)).toHaveText(/^1 von \d+ Mitgliedern$/);
	await expect(page.getByText('Konto: Brief offen')).toBeVisible();
	await expect(page).toHaveURL(/konto=brief-offen/);
	await expect(page).toHaveURL(/sort=jahrgang&richtung=ab/);
	expect(page.url()).not.toContain(nachname);
	expect(fehler).toEqual([]);
});

test('#92: Mitgliederliste behält die Ansicht über Zurück, Pfad und Neuladen', async ({
	page
}, info) => {
	test.skip(info.project.name !== 'desktop', 'nur PC'); // skip: Filter im Titel gibt es erst ab 60rem
	const fehler = sammleKonsolenfehler(page);
	const nachname = zufall();
	const admin = await legeRollenkontoMitBriefCodeAn('Tino', ['mitglieder']);
	await legeDreiAn(nachname);
	await oeffneVerwaltung(page, admin);
	await wartetAufMitgliederliste(page);
	await filtereText(page, 'Name', nachname);
	await page.getByRole('button', { name: 'Konto filtern' }).click();
	await page.getByRole('checkbox', { name: /^ohne Brief/ }).check();
	await page.keyboard.press('Escape');
	await expect(zeilen(page, nachname)).toHaveCount(2);

	await page.getByRole('link', { name: `Bearbeiten: ${nachname}, Alma` }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Alma');
	await page.goBack();
	await expect(zeilen(page, nachname)).toHaveCount(2);
	await expect(page.getByText(`Name: ${nachname}`)).toBeVisible();
	await expect(page.getByText('Konto: ohne Brief')).toBeVisible();

	await page.getByRole('link', { name: `Bearbeiten: ${nachname}, Mia` }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Mia');
	await page
		.getByRole('navigation', { name: 'Pfad' })
		.getByRole('link', { name: 'Mitglieder' })
		.click();
	await expect(zeilen(page, nachname)).toHaveCount(2);
	await expect(page.getByText(`Name: ${nachname}`)).toBeVisible();
	await expect(page).toHaveURL(/konto=ohne-brief/);

	await page.reload();
	await expect(page.getByText('Konto: ohne Brief')).toBeVisible();
	await expect(page.getByText(`Name: ${nachname}`)).toBeHidden();
	expect(fehler).toEqual([]);
});

test('#92: Filter ohne Treffer und Zurücksetzen; kaputte Adresse wird ignoriert', async ({
	page
}, info) => {
	test.skip(info.project.name !== 'desktop', 'nur PC'); // skip: Filter im Titel gibt es erst ab 60rem
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Tilda', ['mitglieder']);
	await oeffneVerwaltung(page, admin, '/verwaltung/mitglieder?sort=xyz&konto=foo&jahrgang=abc..');
	await wartetAufMitgliederliste(page);
	await expect(page.getByRole('button', { name: 'Filter zurücksetzen' })).toBeHidden();

	await filtereText(page, 'Name', `gibts-nicht-${randomUUID()}`);
	await expect(status(page)).toHaveText(/^0 von \d+ Mitgliedern$/);
	await expect(
		page.getByText('Keine Mitglieder gefunden. Prüf die Suche oder den Filter.')
	).toBeVisible();
	await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
	await expect(status(page)).toHaveText(/^\d+ Mitglied(er)?$/);
	expect(fehler).toEqual([]);
});

test('#92: Breite ziehen mit Tastatur und Maus, die Liste scrollt in ihrer Box zur Seite', async ({
	page
}, info) => {
	test.skip(info.project.name !== 'desktop', 'nur PC'); // skip: Breiten gibt es erst ab 60rem
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Theo', ['mitglieder']);
	await page.setViewportSize({ width: 1280, height: 800 });
	await oeffneVerwaltung(page, admin);
	await wartetAufMitgliederliste(page);
	const box = page.locator('.tabelle-steuerung');

	// Mit den Startbreiten passt die Liste bei 1280 px ohne Scrollen (UI-Leitbild).
	expect(await box.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
	const email = page.getByRole('separator', { name: 'Breite E-Mail' });
	await expect(email).toHaveAttribute('aria-valuenow', '10.5');
	await email.focus();
	for (let i = 0; i < 50; i++) await page.keyboard.press('ArrowRight');
	await expect(email).toHaveAttribute('aria-valuenow', '30');
	expect(await box.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
		)
	).toBe(true);
	const bearbeiten = page.getByRole('link', { name: /^Bearbeiten: / }).first();
	await expect(bearbeiten).toBeInViewport();
	await box.evaluate((e) => {
		e.scrollLeft = e.scrollWidth;
	});
	await expect(bearbeiten).toBeInViewport();

	const name = page.getByRole('separator', { name: 'Breite Name' });
	await box.evaluate((e) => {
		e.scrollLeft = 0;
	});
	const g = (await name.boundingBox())!;
	await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
	await page.mouse.down();
	await page.mouse.move(g.x + g.width / 2 + 64, g.y + g.height / 2, { steps: 4 });
	await page.mouse.up();
	await expect(name).toHaveAttribute('aria-valuenow', '13.75');

	await page.reload();
	await wartetAufMitgliederliste(page);
	await expect(email).toHaveAttribute('aria-valuenow', '30');
	await page.getByRole('button', { name: 'Breiten zurücksetzen' }).click();
	await expect(email).toHaveAttribute('aria-valuenow', '10.5');
	await expect(name).toHaveAttribute('aria-valuenow', '9.75');
	expect(fehler).toEqual([]);
});

test('#92: bei 200 % Schrift bleibt der Spaltentitel bedienbar, die Seite scrollt nicht zur Seite', async ({
	page
}, info) => {
	test.skip(info.project.name !== 'desktop', 'nur PC'); // skip: das PC-Layout braucht 60rem Breite
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Tess', ['mitglieder']);
	await page.setViewportSize({ width: 2400, height: 1200 });
	await oeffneVerwaltung(page, admin);
	await wartetAufMitgliederliste(page);
	// Wie die Schriftgrösse des Browsers; ein Stil-Tag verbietet die CSP.
	await page.evaluate(() => {
		document.documentElement.style.fontSize = '200%';
	});
	await page.getByRole('button', { name: 'Konto filtern' }).click({ trial: true });
	await page.getByRole('separator', { name: 'Breite Rollen' }).focus();
	await expect(page.getByRole('separator', { name: 'Breite Rollen' })).toBeFocused();
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
		)
	).toBe(true);
	expect(fehler).toEqual([]);
});

test('#92: auf dem Handy bleibt die Mitgliederliste wie bisher', async ({ page }, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: am PC gelten die Tests oben
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Tamara', ['mitglieder']);
	await oeffneVerwaltung(page, admin);
	await wartetAufMitgliederliste(page);
	await expect(page.getByLabel('Status')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Konto filtern' })).toBeHidden();
	await expect(page.getByRole('button', { name: 'Name', exact: true })).toBeHidden();
	await expect(page.getByRole('separator')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Breiten zurücksetzen' })).toBeHidden();
	await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
	expect(fehler).toEqual([]);
});

test('#92: Briefe zeigen den Jahrgang, filtern und wählen nur Gezeigte', async ({ page }, info) => {
	test.skip(info.project.name !== 'desktop', 'nur PC'); // skip: Filter im Titel gibt es erst ab 60rem
	const fehler = sammleKonsolenfehler(page);
	const nachname = zufall();
	const admin = await legeRollenkontoMitBriefCodeAn('Tobias', ['mitglieder']);
	const alt = await legeKontoAn('Alma', nachname);
	await setzeJahrgang(alt.mitgliedId, 1960);
	const mitte = await legeKontoAn('Mia', nachname);
	await setzeJahrgang(mitte.mitgliedId, 2010);
	const jung = await legeKontoAn('Jonas', nachname);
	await setzeJahrgang(jung.mitgliedId, 2012);
	await oeffneVerwaltung(page, admin, '/verwaltung/briefe');
	await expect(page.getByRole('heading', { level: 1, name: 'Briefe' })).toBeVisible();

	await filtereText(page, 'Name', nachname);
	await expect(zeilen(page, nachname)).toHaveCount(3);
	await expect(zeilen(page, nachname).filter({ hasText: 'Jonas' })).toContainText('2012');
	await page.getByRole('checkbox', { name: `Auswählen: ${nachname}, Alma` }).check();
	await page.getByRole('checkbox', { name: `Auswählen: ${nachname}, Jonas` }).check();
	await expect(page.getByRole('button', { name: 'Briefe erzeugen (2)' })).toBeVisible();

	await page.getByRole('button', { name: 'Jahrgang filtern' }).click();
	await page.getByLabel('Bis').fill('2010');
	await pruefeBildschirm(page, info, 'briefe-filter-offen');
	await page.keyboard.press('Escape');
	await expect(zeilen(page, nachname)).toHaveCount(2);
	await expect(page.getByRole('button', { name: 'Briefe erzeugen (1)' })).toBeVisible();
	await expect(status(page)).toHaveText(/^2 von \d+ Mitgliedern · 1 gewählt$/);

	await page.getByRole('button', { name: 'Filter Jahrgang entfernen' }).click();
	await expect(zeilen(page, nachname)).toHaveCount(3);
	await expect(
		page.getByRole('checkbox', { name: `Auswählen: ${nachname}, Jonas` })
	).not.toBeChecked();
	await page.getByRole('button', { name: 'Briefe erzeugen (1)' }).click();
	await expect(page.getByRole('heading', { name: '1 Brief erzeugen?' })).toBeVisible();
	await page.getByRole('button', { name: 'Abbrechen' }).click();
	expect(fehler).toEqual([]);
});

test('#92: Verlauf filtert auf dem Server und behält die Ansicht', async ({ page }, info) => {
	test.skip(info.project.name !== 'desktop', 'nur PC'); // skip: Filter im Titel gibt es erst ab 60rem
	const fehler = sammleKonsolenfehler(page);
	const nachname = zufall();
	const admin = await legeRollenkontoMitBriefCodeAn('Tanja', ['mitglieder']);
	// Die Rolle setzt MyTCO automatisch: ein Eintrag «Rolle CM-Admin vergeben» von MyTCO.
	await legeRollenkontoMitBriefCodeAn('Vera', ['cm'], nachname);
	await oeffneVerwaltung(page, admin, '/verwaltung/verlauf');
	await expect(page.getByRole('heading', { level: 1, name: 'Änderungsverlauf' })).toBeVisible();

	await filtereText(page, 'Mitglied', nachname);
	await expect(zeilen(page, nachname)).toHaveCount(1);
	await page.getByRole('button', { name: 'Was filtern' }).click();
	await page.getByRole('checkbox', { name: 'Angabe geändert' }).check();
	await expect(zeilen(page, nachname)).toHaveCount(0);
	await page.getByRole('checkbox', { name: 'Angabe geändert' }).uncheck();
	await page.getByRole('checkbox', { name: 'Rolle vergeben' }).check();
	await pruefeBildschirm(page, info, 'verlauf-filter-offen');
	await page.keyboard.press('Escape');
	await expect(zeilen(page, nachname)).toHaveCount(1);
	await expect(zeilen(page, nachname)).toContainText('MyTCO');
	await expect(status(page)).toHaveText('1 Treffer');
	await expect(page).toHaveURL(/was=rolle-vergeben/);
	expect(page.url()).not.toContain(nachname);

	await page.getByRole('link', { name: `${nachname}, Vera` }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Vera');
	await page.goBack();
	await expect(zeilen(page, nachname)).toHaveCount(1);
	await expect(page.getByText(`Mitglied: ${nachname}`)).toBeVisible();
	await expect(page.getByText('Was: Rolle vergeben')).toBeVisible();

	await page.reload();
	await expect(page.getByText('Was: Rolle vergeben')).toBeVisible();
	await expect(page.getByText(`Mitglied: ${nachname}`)).toBeHidden();
	expect(fehler).toEqual([]);
});
