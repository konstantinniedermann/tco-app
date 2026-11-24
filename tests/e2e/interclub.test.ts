import { expect, test, type Locator, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import {
	folgeTeamDirekt,
	legeGeraetAn,
	legeKontoMitBriefCodeAn,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	klappeAuf,
	pruefeBildschirm,
	sammleKonsolenfehler,
	wartetAufVorladen
} from './hilfen/seite.ts';

// Reiter IC (#81): Übersicht und Team-Seite mit den Beispieldaten der Saison 2026, die jeder
// E2E-Lauf einspielt (playwright.config.ts). Der E2E-Server läuft mit der echten Uhr; der Stand ist stabil,
// weil alle Spiele 2026 ein Resultat haben (Saison abgeschlossen).
// Die Anmeldung geht per Brief-Code, damit kein Mail-Code das Budget pro IP verbraucht.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

const reiterleiste = (page: Page) => page.getByRole('navigation', { name: 'Hauptnavigation' });

test('#81, A-INTERCLUB-01: Mitglied sieht den Reiter IC, die Übersicht und die Team-Seite mit Tabelle', async ({
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

// Folgen (#81 Teil 3b): Team 7398 ist «2L Herren 1» der Beispieldaten 2026. Push echt abonniert
// wird im E2E nicht; `legeGeraetAn` legt ein Abo auf einem erfundenen zweiten Gerät an.
const TEAM_ID = 7398;
const OHNE_PUSH = 'Mit Push kannst du diesem Team folgen.';
const folgenSchalter = (page: Page) => page.getByRole('checkbox', { name: /^Diesem Team folgen/ });

async function meldeAn(page: Page, isMobile: boolean, vorname: string) {
	if (isMobile) await startetVomSymbol(page);
	const konto = await legeKontoMitBriefCodeAn(vorname);
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${vorname}` })).toBeVisible();
	await wartetAufVorladen(page);
	return konto;
}

async function oeffneTeam(page: Page) {
	await reiterleiste(page).getByRole('link', { name: 'IC', exact: true }).click();
	await page.getByRole('link', { name: /2L Herren 1/ }).click();
	await expect(page.getByRole('heading', { level: 1, name: /2L Herren 1/ })).toBeVisible();
}

async function oeffneProfilTeams(page: Page) {
	await reiterleiste(page).getByRole('link', { name: 'Profil', exact: true }).click();
	await expect(page).toHaveURL(/\/profil$/);
	await klappeAuf(page, 'Benachrichtigungen');
	await expect(page.getByRole('group', { name: 'Interclub-Teams' })).toBeVisible();
}

/**
 * Schaltet und wartet, bis der Server geantwortet und die Seite die Antwort verarbeitet hat
 * (solange die Anfrage läuft, ist der Schalter gesperrt); ein Neuladen mittendrin bräche sie ab.
 */
async function schalteFolgen(page: Page, schalter: Locator, an: boolean) {
	const gespeichert = page.waitForResponse(
		(r) =>
			r.url().endsWith(`/api/interclub/teams/${TEAM_ID}/folgen`) &&
			r.request().method() === 'POST' &&
			r.ok()
	);
	await schalter.setChecked(an);
	await gespeichert;
	await expect(schalter).toBeEnabled();
}

test('#81: ohne Push zeigt die Teamseite «Mit Push kannst du diesem Team folgen.» mit Link zum Profil', async ({
	page,
	isMobile
}, info) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	await meldeAn(page, isMobile, 'Ida');
	await oeffneTeam(page);

	await expect(page.getByText(OHNE_PUSH)).toBeVisible();
	await expect(folgenSchalter(page)).toHaveCount(0);
	await pruefeBildschirm(page, info, 'interclub-folgen-ohne-push');

	await page.getByRole('link', { name: 'Push einrichten', exact: true }).click();
	await expect(page).toHaveURL(/\/profil$/);
	await klappeAuf(page, 'Benachrichtigungen');
	await expect(
		page.getByText('Du folgst keinem Team. Folgen kannst du auf der Seite eines Teams unter IC.', {
			exact: true
		})
	).toBeVisible();
	expect(fehler).toEqual([]);
});

test('#81, A-INTERCLUB-02: mit Push folgt der Schalter dem Team, das Profil listet es, Abwählen im Profil entfolgt', async ({
	page,
	isMobile
}, info) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const konto = await meldeAn(page, isMobile, 'Ida');
	await legeGeraetAn(konto.kontoId, true);
	await oeffneTeam(page);

	const schalter = folgenSchalter(page);
	await expect(schalter).not.toBeChecked();
	await expect(page.getByText(OHNE_PUSH)).toHaveCount(0);
	await pruefeBildschirm(page, info, 'interclub-folgen-aus');

	await schalteFolgen(page, schalter, true);
	await expect(schalter).toBeChecked();
	await pruefeBildschirm(page, info, 'interclub-folgen-an');
	await page.reload();
	await expect(folgenSchalter(page)).toBeChecked();

	await oeffneProfilTeams(page);
	const gruppe = page.getByRole('group', { name: 'Interclub-Teams' });
	const imProfil = gruppe.getByRole('checkbox', { name: '2L Herren 1', exact: true });
	await expect(imProfil).toBeChecked();
	await expect(
		page.getByText(
			'Push nach jedem Endstand. Folgen kannst du auf der Seite eines Teams unter IC.',
			{ exact: true }
		)
	).toBeVisible();
	await pruefeBildschirm(page, info, 'profil-interclub-teams');

	await schalteFolgen(page, imProfil, false);
	// Bis zum nächsten Laden bleibt das Team stehen, damit man es wieder anwählen kann.
	await expect(imProfil).not.toBeChecked();

	await oeffneTeam(page);
	await expect(folgenSchalter(page)).not.toBeChecked();
	expect(fehler).toEqual([]);
});

test('#81: folgt ohne Abo: Schalter angehakt, Entfolgen geht, danach der Satz', async ({
	page,
	isMobile
}) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const konto = await meldeAn(page, isMobile, 'Ida');
	await folgeTeamDirekt(konto.kontoId, TEAM_ID);

	await oeffneProfilTeams(page);
	await expect(
		page
			.getByRole('group', { name: 'Interclub-Teams' })
			.getByRole('checkbox', { name: '2L Herren 1', exact: true })
	).toBeChecked();
	await expect(
		page.getByText(
			'Ohne Push bekommst du keine Mitteilung. Folgen kannst du auf der Seite eines Teams unter IC.',
			{ exact: true }
		)
	).toBeVisible();

	await oeffneTeam(page);
	const schalter = folgenSchalter(page);
	await expect(schalter).toBeChecked();
	// Nach dem Entfolgen gibt es den Schalter nicht mehr: Ohne Push steht der Satz.
	const entfolgt = page.waitForResponse(
		(r) => r.url().endsWith(`/api/interclub/teams/${TEAM_ID}/folgen`) && r.ok()
	);
	await schalter.click();
	await entfolgt;
	await expect(page.getByText(OHNE_PUSH)).toBeVisible();
	await expect(folgenSchalter(page)).toHaveCount(0);
	expect(fehler).toEqual([]);
});

test('#81: Folgen ohne Push auf dem Server (kein-push): der Satz erscheint, der Fokus liegt auf «Push einrichten»', async ({
	page,
	isMobile
}) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const konto = await meldeAn(page, isMobile, 'Ida');
	await legeGeraetAn(konto.kontoId, true);
	// Das Abo verschwindet zwischen Laden und Tippen (z. B. auf dem anderen Gerät abgeschaltet).
	await page.route(`**/api/interclub/teams/${TEAM_ID}/folgen`, (route) =>
		route.fulfill({ status: 409, json: { fehler: 'kein-push' } })
	);
	await oeffneTeam(page);

	await folgenSchalter(page).click();
	await expect(page.getByText(OHNE_PUSH)).toBeVisible();
	await expect(folgenSchalter(page)).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Push einrichten', exact: true })).toBeFocused();
	expect(fehler).toEqual([]);
});
