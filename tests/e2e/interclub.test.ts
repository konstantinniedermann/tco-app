import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import { legeKontoMitBriefCodeAn, schliesseLoginHilfen } from './hilfen/login.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// Reiter IC (#81): Übersicht und Team-Seite mit den Beispieldaten der Saison 2026, die jeder
// E2E-Lauf einspielt (playwright.config.ts). Die Uhr steht im November 2026: Saison abgeschlossen.
// Die Anmeldung geht per Brief-Code, damit kein Mail-Code das Budget pro IP verbraucht.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

const reiterleiste = (page: Page) => page.getByRole('navigation', { name: 'Hauptnavigation' });

test('#81: Mitglied sieht den Reiter IC, die Übersicht und die Team-Seite mit Tabelle', async ({
	page,
	isMobile
}, info) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	if (isMobile) await startetVomSymbol(page);
	const konto = await legeKontoMitBriefCodeAn('Ida');

	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Ida' })).toBeVisible();
	// Gleich nach dem Login, ohne Neuladen: Das Layout liest die Sitzung neu.
	await expect(reiterleiste(page).getByRole('link', { name: 'IC', exact: true })).toBeVisible();
	await wartetAufVorladen(page);

	await reiterleiste(page).getByRole('link', { name: 'IC', exact: true }).click();
	await expect(page).toHaveURL(/\/interclub$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Interclub 2026' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Teams', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	const kachel = page.getByRole('link', { name: /2L Herren 1/ });
	await expect(kachel).toContainText('Olten 1 · 2. von 4 · Aufstiegsspiele');
	await pruefeBildschirm(page, info, 'interclub-teams');

	await page.getByRole('button', { name: 'Resultate', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Resultate', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(
		page.getByText(
			'Saison 2026 abgeschlossen. Die Saison 2027 steht hier, sobald Swiss Tennis den Spielplan veröffentlicht.'
		)
	).toBeVisible();
	await pruefeBildschirm(page, info, 'interclub-resultate');

	await page.getByRole('button', { name: 'Teams', exact: true }).click();
	await kachel.click();
	await expect(page.getByRole('heading', { level: 1, name: /2L Herren 1/ })).toBeVisible();
	await expect(page.getByRole('link', { name: '‹ Interclub', exact: true })).toBeVisible();
	await pruefeBildschirm(page, info, 'interclub-team-spiele');

	await page.getByRole('button', { name: 'Tabelle', exact: true }).click();
	const tabelle = page.getByRole('table');
	await expect(tabelle.getByRole('columnheader')).toHaveText(['Rang', 'Team', 'Partien', 'Sätze']);
	const zeile = tabelle.getByRole('row').filter({ hasText: 'Olten 1' });
	await expect(zeile.getByRole('cell')).toHaveText(['2.', 'Olten 1', '15:12', '31:27']);
	const entscheid = page.getByRole('region', { name: 'Aufstiegsspiele' });
	await expect(entscheid).toContainText('Schlieren');
	await pruefeBildschirm(page, info, 'interclub-team-tabelle');

	await page.getByRole('link', { name: '‹ Interclub', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Interclub 2026' })).toBeVisible();
	expect(fehler).toEqual([]);
});
