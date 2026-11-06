import { expect, test, type Page } from '@playwright/test';
import { bietetInstallationAn, startetVomSymbol } from './hilfen/geraet.ts';
import { legeKontoMitBriefCodeAn, schliesseLoginHilfen } from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';
import { e2eEinstellungen } from './hilfen/umgebung.ts';

const KONTAKT = e2eEinstellungen('').MYTCO_KONTAKT;

const THEMEN_IPHONE_ZUERST = [
	'Auf den Startbildschirm: iPhone',
	'Auf den Startbildschirm: Android',
	'Neuer Code per E-Mail',
	'Mit Passkey anmelden',
	'Eigene Angaben ändern'
];

function themen(page: Page) {
	return page.locator('details.klappe > summary');
}

/** Öffnet die Hilfe so, wie ein Mitglied sie findet: über die Fusszeile der Login-Seite. */
async function oeffneHilfe(page: Page) {
	await page.goto('/login');
	await page.getByRole('contentinfo').getByRole('link', { name: 'Hilfe' }).click();
	await expect(page).toHaveURL(/\/hilfe$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Hilfe' })).toBeVisible();
}

test('A-HILFE-01: Hilfe ohne Login über die Fusszeile erreichbar', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	await oeffneHilfe(page);
	await expect(themen(page)).toHaveCount(THEMEN_IPHONE_ZUERST.length);
	await expect(page.locator('.karte', { hasText: 'Fragen?' })).toContainText(KONTAKT);
	// Die Hilfe selbst hat keine Fusszeile (UI-Leitbild, Baustein Fusszeile).
	await expect(page.getByRole('contentinfo')).toHaveCount(0);
	await pruefeBildschirm(page, info, 'hilfe');
	expect(fehler).toEqual([]);
});

test('A-HILFE-01: Thema fürs eigene Handy steht zuoberst', async ({ page }, info) => {
	await oeffneHilfe(page);
	const erwartet =
		info.project.name === 'android'
			? [THEMEN_IPHONE_ZUERST[1], THEMEN_IPHONE_ZUERST[0], ...THEMEN_IPHONE_ZUERST.slice(2)]
			: THEMEN_IPHONE_ZUERST;
	await expect(themen(page)).toHaveText(erwartet);
});

test('A-HILFE-01: ohne Antwort zum Kontakt verweist die Karte auf den Brief', async ({ page }) => {
	await page.route('**/api/kontakt', (route) => route.abort());
	await oeffneHilfe(page);
	await expect(page.locator('.karte', { hasText: 'Fragen?' })).toContainText(
		'Den Kontakt findest du in deinem Brief.'
	);
});

test('A-HILFE-02: bei Bewegung reduzieren keine Animation und keine Taste', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await oeffneHilfe(page);
	await themen(page).first().click();
	const anleitung = page.locator('details[open] .anleitung');
	await expect(anleitung).toHaveClass(/anleitung-ruhig/);
	await expect(anleitung.getByRole('button', { name: 'Anhalten' })).toHaveCount(0);
	await expect(anleitung.locator('li.aktiv')).toHaveCount(0);
});

test('A-HILFE-02: Animation hält an und läuft weiter', async ({ page }) => {
	await oeffneHilfe(page);
	await themen(page).first().click();
	const anleitung = page.locator('details[open] .anleitung');
	await expect(anleitung.locator('li.aktiv')).toHaveCount(1);
	await anleitung.getByRole('button', { name: 'Anhalten' }).click();
	const angehalten = await anleitung.locator('li.aktiv').textContent();
	await page.waitForTimeout(4000);
	await expect(anleitung.locator('li.aktiv')).toHaveText(angehalten ?? '');
	await anleitung.getByRole('button', { name: 'Abspielen' }).click();
	await expect(anleitung.getByRole('button', { name: 'Anhalten' })).toBeVisible();
});

test('A-HILFE-02: zugeklappte Anleitung beginnt beim Aufklappen bei Schritt 1', async ({
	page
}) => {
	await page.clock.install();
	await oeffneHilfe(page);
	// Eine Minute lesen, ohne das Thema zu öffnen: drei Durchläufe wären vorbei.
	await page.clock.runFor(70_000);
	await themen(page).first().click();
	const anleitung = page.locator('details[open] .anleitung');
	await expect(anleitung.locator('li').first()).toHaveClass(/aktiv/);
	await expect(anleitung.getByRole('button', { name: 'Animation anhalten' })).toBeVisible();
});

test('A-HILFE-01: Link mit Anker öffnet das Thema', async ({ page }) => {
	await page.goto('/hilfe#neuer-code');
	await expect(page.locator('details#neuer-code')).toHaveAttribute('open', '');
	await expect(page.locator('details#passkey')).not.toHaveAttribute('open', '');
});

test('A-HILFE-01: eigene Angaben nennen die Mitgliederverwaltung, nicht «den Admin»', async ({
	page
}) => {
	await page.goto('/hilfe#eigene-angaben');
	const thema = page.locator('details#eigene-angaben');
	await expect(thema).toHaveAttribute('open', '');
	await expect(thema).toContainText('ändert die Mitgliederverwaltung es für dich');
	await expect(thema).not.toContainText('Admin');
});

test.describe('Einstiegsseite', () => {
	test.afterAll(async () => {
		await schliesseLoginHilfen();
	});

	test('A-HILFE-02: im Handy-Browser führt die Startseite zur Einstiegsseite, am PC zum Login', async ({
		page
	}, info) => {
		const fehler = sammleKonsolenfehler(page);
		await page.goto('/');
		if (info.project.name === 'desktop') {
			await expect(page).toHaveURL(/\/login$/);
			return;
		}
		await expect(page).toHaveURL(/\/willkommen$/);
		await expect(
			page.getByRole('heading', { level: 1, name: 'Willkommen bei MyTCO' })
		).toBeVisible();
		await expect(
			page.getByRole('heading', { level: 2, name: 'Zuerst auf den Startbildschirm' })
		).toBeVisible();
		await pruefeBildschirm(page, info, 'willkommen');
		expect(fehler).toEqual([]);
	});

	test('A-HILFE-02: vom Symbol und direkt aufgerufen am PC geht es zum Login', async ({
		page
	}, info) => {
		if (info.project.name !== 'desktop') await startetVomSymbol(page);
		await page.goto('/willkommen');
		await expect(page).toHaveURL(/\/login$/);
		await page.goto('/');
		await expect(page).toHaveURL(/\/login$/);
	});

	test('A-HILFE-02: mit Sitzung zeigt die Startseite auch im Handy-Browser Hoi', async ({
		page
	}) => {
		const konto = await legeKontoMitBriefCodeAn('Elin');
		await page.goto('/login');
		await page.getByLabel('Code aus dem Brief').fill(konto.code);
		await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Hoi Elin' })).toBeVisible();
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 1, name: 'Hoi Elin' })).toBeVisible();
	});

	test('A-HILFE-02: iPhone zeigt die Safari-Schritte bis Fertig', async ({ page }, info) => {
		test.skip(info.project.name !== 'iphone', 'nur iPhone'); // skip: Safari-Schritte gibt es nur auf dem iPhone
		await page.goto('/');
		const schritte = page.locator('.anleitung-schritte');
		await expect(schritte).toContainText('Zu Home-Bildschirm hinzufügen');
		await expect(schritte.locator('li.anleitung-fertig')).toContainText(
			'Fertig! Verlass jetzt den Browser und starte MyTCO über das neue Symbol auf deinem Startbildschirm.'
		);
		await page.getByRole('link', { name: 'Ohne Startbildschirm weiter' }).click();
		await expect(page).toHaveURL(/\/login$/);
	});

	test('A-HILFE-02: Android mit Angebot zeigt die Taste, nach Ablehnen die Anleitung über das Menü', async ({
		page
	}, info) => {
		test.skip(info.project.name !== 'android', 'nur Android'); // skip: Install-Angebot gibt es nur in Chrome auf Android
		await page.goto('/');
		await expect(page.locator('.karte .anleitung')).toBeVisible();

		await bietetInstallationAn(page, 'dismissed');
		await page.getByRole('button', { name: 'MyTCO installieren' }).click();
		await expect(page.getByRole('button', { name: 'MyTCO installieren' })).toHaveCount(0);
		const menue = page.locator('details.klappe', { hasText: 'Klappt nicht? Über das Menü' });
		await expect(menue).toHaveAttribute('open', '');
		await expect(menue).toContainText('Installieren und Verknüpfung erstellen');

		await page.reload();
		const fehler = sammleKonsolenfehler(page);
		await bietetInstallationAn(page, 'fehler');
		await page.getByRole('button', { name: 'MyTCO installieren' }).click();
		await expect(menue).toHaveAttribute('open', '');
		await expect(menue).toContainText('Installieren und Verknüpfung erstellen');
		expect(fehler).toEqual([]);

		await page.reload();
		await bietetInstallationAn(page, 'accepted');
		await page.getByRole('button', { name: 'MyTCO installieren' }).click();
		await expect(page.locator('.karte').first()).toContainText('Fertig!');
		await expect(page.getByRole('button', { name: 'MyTCO installieren' })).toHaveCount(0);
	});
});
