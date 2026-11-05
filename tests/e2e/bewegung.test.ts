import { expect, test, type Page } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import { legeKontoMitBriefCodeAn, schliesseLoginHilfen } from './hilfen/login.ts';
import { pruefeBildschirm } from './hilfen/seite.ts';

// Ruhiges App-Gefühl (#54): Fusszeile, Reiter, Seitenwechsel, Bedienung, Aufklappen.
// Regeln: docs/ui-leitbild.md, Abschnitt «Bewegung und Bedienung», UI-09.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

/** Erfundenes Mitglied meldet sich mit Brief-Code an, wie vom Symbol auf dem Startbildschirm. */
async function meldeAn(page: Page, vorname: string): Promise<void> {
	const konto = await legeKontoMitBriefCodeAn(vorname);
	// Steht die App schon auf der Login-Seite (nach dem Abmelden), ohne Neuladen weiter.
	if (!page.url().endsWith('/login')) {
		await startetVomSymbol(page);
		await page.goto('/login');
	}
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${vorname}` })).toBeVisible();
}

function reiter(page: Page, name: 'Start' | 'Profil') {
	return page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name });
}

test('Fusszeile nur vor dem Login und auf der Startseite', async ({ page }) => {
	const fusszeile = page.getByRole('contentinfo');
	for (const pfad of ['/login', '/login/mail']) {
		await page.goto(pfad);
		await expect(fusszeile.getByRole('link', { name: 'Hilfe' }), pfad).toBeVisible();
		await expect(fusszeile.getByRole('link', { name: 'Datenschutz' }), pfad).toBeVisible();
	}
	for (const pfad of ['/hilfe', '/datenschutz', '/gibt-es-nicht']) {
		await page.goto(pfad);
		await expect(page.getByRole('heading', { level: 1 }), pfad).toBeVisible();
		await expect(fusszeile, pfad).toHaveCount(0);
	}

	await meldeAn(page, 'Lena');
	await expect(fusszeile.getByTestId('version')).toHaveText(`Version ${pkg.version}`);
	await reiter(page, 'Profil').click();
	await expect(page).toHaveURL(/\/profil$/);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(fusszeile).toHaveCount(0);
});

test('Fusszeile auf der Einstiegsseite im Handy-Browser', async ({ page }, info) => {
	// Die Einstiegsseite gibt es nur im Handy-Browser; am PC führt sie zum Login (ebenfalls mit Fusszeile).
	await page.goto('/willkommen');
	await expect(page).toHaveURL(info.project.name === 'desktop' ? /\/login$/ : /\/willkommen$/);
	await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Hilfe' })).toBeVisible();
});

/** Macht die Seite lang genug zum Scrollen; `main` gehört zum Layout und bleibt beim Wechsel. */
async function machLang(page: Page): Promise<void> {
	await page.locator('main').evaluate((main) => {
		main.style.minHeight = '300vh';
	});
}

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

/**
 * Tippt einen Reiter an, ohne vorher hinzuscrollen: Am PC stehen die Reiter oben in der
 * Kopfleiste, und Playwright würde vor dem Klick nach oben scrollen.
 */
async function tippeOhneScrollen(page: Page, name: 'Start' | 'Profil'): Promise<void> {
	await reiter(page, name).evaluate((a: HTMLElement) => a.click());
}

test('Reiter ist beim Antippen sofort aktiv, auch wenn der Server langsam antwortet', async ({
	page
}, info) => {
	await meldeAn(page, 'Nora');
	await page.route('**/api/sitzung', async (route) => {
		await new Promise((fertig) => setTimeout(fertig, 2000));
		await route.continue();
	});
	await reiter(page, 'Profil').click();
	await expect(reiter(page, 'Profil')).toHaveAttribute('aria-current', 'page', { timeout: 500 });
	await expect(page).toHaveURL(/\/$/);
	await expect(page).toHaveURL(/\/profil$/);
	await expect(reiter(page, 'Start')).not.toHaveAttribute('aria-current', 'page');
	await pruefeBildschirm(page, info, 'reiter-profil');
});

test('Jeder Reiter merkt sich die Scrollposition; aktiver Reiter führt nach oben', async ({
	page
}) => {
	await meldeAn(page, 'Ida');
	await machLang(page);
	await page.evaluate(() => window.scrollTo(0, 400));
	await tippeOhneScrollen(page, 'Profil');
	await expect(page).toHaveURL(/\/profil$/);
	await expect.poll(() => scrollY(page)).toBe(0);
	await page.evaluate(() => window.scrollTo(0, 200));
	await tippeOhneScrollen(page, 'Start');
	await expect(page).toHaveURL(/\/$/);
	await expect.poll(() => scrollY(page)).toBe(400);
	await tippeOhneScrollen(page, 'Start');
	await expect.poll(() => scrollY(page)).toBe(0);
	await tippeOhneScrollen(page, 'Profil');
	await expect.poll(() => scrollY(page)).toBe(200);
});

test('Nach Abmelden und neuem Login beginnt Start oben', async ({ page }) => {
	await meldeAn(page, 'Ella');
	await machLang(page);
	await page.evaluate(() => window.scrollTo(0, 400));
	await reiter(page, 'Profil').click();
	await page.getByRole('button', { name: 'Abmelden' }).click();
	await expect(page).toHaveURL(/\/login$/);
	await meldeAn(page, 'Zoe');
	await machLang(page);
	await expect.poll(() => scrollY(page)).toBe(0);
});
