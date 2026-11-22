import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import { legeKontoMitBriefCodeAn, schliesseLoginHilfen } from './hilfen/login.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// Reiter IC (#81): Übersicht und Team-Seite mit den Beispieldaten der Saison 2026, die jeder
// E2E-Lauf einspielt (playwright.config.ts). Der E2E-Server läuft mit der echten Uhr; der Stand ist stabil,
// weil alle Spiele 2026 ein Resultat haben (Saison abgeschlossen).
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

test('#81: Mitglied öffnet eine Begegnung mit Einzel und Doppel, Gegner aufgeklappt', async ({
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
	await wartetAufVorladen(page);

	await reiterleiste(page).getByRole('link', { name: 'IC', exact: true }).click();
	await page.getByRole('link', { name: /2L Herren 1/ }).click();
	await expect(page.getByRole('heading', { level: 1, name: /2L Herren 1/ })).toBeVisible();
	// Nur eigene, gespielte Begegnungen sind Links.
	await expect(page.getByRole('link', { name: /Aarau 2 – Muhen/ })).toHaveCount(0);
	await page.getByRole('link', { name: /Olten 1 – Villmergen/ }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Olten 1 – Villmergen' })).toBeVisible();
	await expect(page.getByText('Sa 02.05. · Heim · Runde 1')).toBeVisible();
	await expect(page.getByRole('region', { name: 'Endstand' })).toContainText('Sätze 16:3');
	const erste = page.getByRole('region', { name: 'Einzel' }).getByRole('group').first();
	await expect(erste).toContainText('Saitenbett Hannes');
	await expect(erste).toContainText('verloren');
	// Gegner erst nach dem Aufklappen sichtbar.
	await expect(page.getByText('Testmann Elena')).toBeHidden();
	await erste.getByText('Saitenbett Hannes').click();
	await expect(erste.getByText('Testmann Elena')).toBeVisible();
	await pruefeBildschirm(page, info, 'interclub-begegnung-einzel');

	await page.getByRole('button', { name: 'Doppel', exact: true }).click();
	const doppel = page.getByRole('region', { name: 'Doppel' });
	await expect(doppel.getByRole('group')).toHaveCount(3);
	await expect(doppel.getByRole('group').nth(1)).toContainText('0:6 6:4 11:9');
	await pruefeBildschirm(page, info, 'interclub-begegnung-doppel');

	await page.getByRole('link', { name: '‹ 2L Herren 1', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: /2L Herren 1/ })).toBeVisible();

	// Aufstiegsspiel: die Doppel wurden nicht gespielt.
	await page.getByRole('button', { name: 'Tabelle', exact: true }).click();
	await page
		.getByRole('region', { name: 'Aufstiegsspiele' })
		.getByRole('link', { name: /Schlieren – Olten 1/ })
		.click();
	await expect(page.getByText('So 07.06., 09:00 · Auswärts · Aufstiegsspiel')).toBeVisible();
	// Sätze in der Reihenfolge Heim:Gast wie der Endstand 5:1.
	await expect(page.getByRole('region', { name: 'Endstand' })).toContainText('Sätze 10:2');
	await page.getByRole('button', { name: 'Doppel', exact: true }).click();
	await expect(
		page.getByText('Nicht gespielt: Die Begegnung war nach den Einzeln entschieden.')
	).toBeVisible();
	expect(fehler).toEqual([]);
});

test('#81: «Resultat folgt», «keine Einzelpartien» und «Keine Einzel gemeldet»', async ({
	page,
	isMobile
}) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	// Die Beispieldaten 2026 haben alle Resultate und Berichte: Die Antworten des Servers werden
	// hier für diese Zustände abgeändert.
	await page.route('**/api/interclub', async (route) => {
		const echt = await route.fetch();
		const u = await echt.json();
		const offen = {
			teamId: 7398,
			begegnungId: 972338,
			liga: '2L Herren 1',
			art: 'gruppe',
			runde: 1,
			datum: '2026-05-02',
			zeit: null,
			heim: 'Olten 1',
			gast: 'Villmergen',
			heimPunkte: null,
			gastPunkte: null,
			eigen: true,
			tcoHeim: true,
			ergebnis: null
		};
		await route.fulfill({ response: echt, json: { ...u, abgeschlossen: false, letzte: [offen] } });
	});
	await page.route('**/api/interclub/teams/7398/begegnungen/*', async (route) => {
		const echt = await route.fetch();
		const b = await echt.json();
		const json = route.request().url().endsWith('/972338')
			? { ...b, saetze: null, partien: null, ohneBericht: 'keiner' }
			: { ...b, partien: { ...b.partien, einzel: [] } };
		await route.fulfill({ response: echt, json });
	});
	if (isMobile) await startetVomSymbol(page);
	const konto = await legeKontoMitBriefCodeAn('Ida');
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Ida' })).toBeVisible();
	await wartetAufVorladen(page);

	await reiterleiste(page).getByRole('link', { name: 'IC', exact: true }).click();
	const letzte = page.getByRole('region', { name: 'Letzte Resultate' });
	await expect(letzte).toContainText('Olten 1 – Villmergen');
	await expect(letzte.getByText('Resultat folgt')).toBeVisible();

	await page.getByRole('button', { name: 'Teams', exact: true }).click();
	await page.getByRole('link', { name: /2L Herren 1/ }).click();
	await page.getByRole('link', { name: /Olten 1 – Villmergen/ }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Olten 1 – Villmergen' })).toBeVisible();
	await expect(
		page.getByText('Swiss Tennis hat für diese Begegnung keine Einzelpartien.')
	).toBeVisible();

	await page.getByRole('link', { name: '‹ 2L Herren 1', exact: true }).click();
	await page.getByRole('link', { name: /Olten 1 – Aarau 2/ }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Olten 1 – Aarau 2' })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Einzel' })).toContainText(
		'Keine Einzel gemeldet.'
	);
	expect(fehler).toEqual([]);
});
