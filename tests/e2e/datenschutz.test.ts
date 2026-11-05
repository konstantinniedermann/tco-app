import { expect, test } from '@playwright/test';
import { pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';

// DS-09: Die Datenschutzerklärung ist ohne Login erreichbar, über die Fusszeile wie die Hilfe.
// Der Brief verweist auf /datenschutz (src/lib/server/brief/brief.ts).
test('DS-09: Datenschutzerklärung ohne Login über die Fusszeile erreichbar', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	await page.goto('/login');
	await page.getByRole('contentinfo').getByRole('link', { name: 'Datenschutz' }).click();
	await expect(page).toHaveURL(/\/datenschutz$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Datenschutz in MyTCO' })).toBeVisible();
	await expect(page.getByText('Entwurf: Der Vorstand gibt diesen Text noch frei.')).toBeVisible();
	await expect(page.getByText('Kein Tracking:')).toBeVisible();
	// Die Seite selbst hat keine Fusszeile (UI-Leitbild, Baustein Fusszeile).
	await expect(page.getByRole('contentinfo')).toHaveCount(0);
	await pruefeBildschirm(page, info, 'datenschutz');
	expect(fehler).toEqual([]);
});
