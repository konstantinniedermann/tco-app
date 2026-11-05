import { expect, test, type Page } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import { legeKontoMitBriefCodeAn, schliesseLoginHilfen } from './hilfen/login.ts';

// Ruhiges App-Gefühl (#54): Fusszeile, Reiter, Seitenwechsel, Bedienung, Aufklappen.
// Regeln: docs/ui-leitbild.md, Abschnitt «Bewegung und Bedienung», UI-09.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

/** Erfundenes Mitglied meldet sich mit Brief-Code an, wie vom Symbol auf dem Startbildschirm. */
async function meldeAn(page: Page, vorname: string): Promise<void> {
	const konto = await legeKontoMitBriefCodeAn(vorname);
	await startetVomSymbol(page);
	await page.goto('/login');
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
