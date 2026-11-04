import { expect, test, type Page } from '@playwright/test';
import { pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';
import { e2eEinstellungen } from './hilfen/umgebung.ts';

const KONTAKT = e2eEinstellungen('').MYTCO_KONTAKT;

const THEMEN_IPHONE_ZUERST = [
	'Auf den Startbildschirm: iPhone',
	'Auf den Startbildschirm: Android',
	'Neuer Code per E-Mail',
	'Mit Passkey anmelden'
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
	await expect(themen(page)).toHaveCount(4);
	await expect(page.locator('.karte', { hasText: 'Fragen?' })).toContainText(KONTAKT);
	await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Hilfe' })).toHaveAttribute(
		'aria-current',
		'page'
	);
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
