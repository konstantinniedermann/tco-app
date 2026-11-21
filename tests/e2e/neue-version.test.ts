import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import { legeKontoMitBriefCodeAn, schliesseLoginHilfen, setzeTelefon } from './hilfen/login.ts';
import { legeOffenesTurnierAn, setzeSpielerangaben } from './hilfen/turnier.ts';
import { sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// Neue Auslieferung bei offener App (docs/ci-cd-und-release.md, «Alte Versionen auf dem Handy»):
// SvelteKit vergleicht die Kennung des Builds mit `_app/version.json`, wenn die App wieder in den
// Vordergrund kommt. Weicht sie ab, lädt der nächste angetippte Link die Seite einmal ganz neu;
// `goto`, die Zurück-Geste und ein Link weg von einem geänderten Formular (zuerst die Rückfrage)
// bleiben in der App. Der Test schiebt eine fremde Kennung unter und erkennt ein ganzes Laden
// daran, dass eine Marke am `window` weg ist.
// Kein Mail-Code: Anmeldung per Brief-Code (Grenze der Code-Anfragen pro IP).

const MARKE = 'mytcoOhneNeuladen';

async function setzeMarke(page: Page): Promise<void> {
	await page.evaluate((name) => {
		(window as unknown as Record<string, unknown>)[name] = true;
	}, MARKE);
}

async function hatMarke(page: Page): Promise<boolean> {
	return page.evaluate(
		(name) => (window as unknown as Record<string, unknown>)[name] === true,
		MARKE
	);
}

/** Der Server meldet eine andere Kennung, als wäre neu ausgeliefert worden. */
async function neueAuslieferung(page: Page): Promise<void> {
	await page.route('**/_app/version.json', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ version: 'neu-ausgeliefert' })
		})
	);
}

/** Die App kommt wieder in den Vordergrund: SvelteKit fragt `version.json` ab. */
async function kommtInDenVordergrund(page: Page): Promise<void> {
	const antwort = page.waitForResponse((r) =>
		new URL(r.url()).pathname.endsWith('/_app/version.json')
	);
	await page.evaluate(() => window.dispatchEvent(new Event('focus')));
	await antwort;
}

function fusszeilenLink(page: Page, name: string) {
	return page.getByRole('contentinfo').getByRole('link', { name, exact: true });
}

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

test('ohne neue Auslieferung wechselt ein Link in der App', async ({ page }) => {
	const fehler = sammleKonsolenfehler(page);
	await page.goto('/login');
	await expect(fusszeilenLink(page, 'Hilfe')).toBeVisible();
	await setzeMarke(page);
	await kommtInDenVordergrund(page);

	await fusszeilenLink(page, 'Hilfe').click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hilfe' })).toBeVisible();
	expect(await hatMarke(page)).toBe(true);
	expect(fehler).toEqual([]);
});

test('nach einer neuen Auslieferung lädt der nächste Link die Seite ganz neu', async ({ page }) => {
	const fehler = sammleKonsolenfehler(page);
	await neueAuslieferung(page);
	await page.goto('/login');
	await expect(fusszeilenLink(page, 'Hilfe')).toBeVisible();
	await setzeMarke(page);
	await kommtInDenVordergrund(page);

	await fusszeilenLink(page, 'Hilfe').click();
	await page.waitForURL(/\/hilfe$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Hilfe' })).toBeVisible();
	expect(await hatMarke(page)).toBe(false);
	expect(fehler).toEqual([]);
});

const MIXED: KategorieWerte = {
	name: 'Mixed Doppel',
	geschlecht: 'mixed',
	art: 'doppel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: null,
	klassierungBis: null,
	mindestsumme: 9
};

const reiter = (page: Page, name: 'Start' | 'CM') =>
	page
		.getByRole('navigation', { name: 'Hauptnavigation' })
		.getByRole('link', { name, exact: true });

test('nach einer neuen Auslieferung: zuerst die Rückfrage, goto und Zurück bleiben in der App', async ({
	page
}) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const {
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([MIXED]);
	const konto = await legeKontoMitBriefCodeAn('Vera');
	await setzeSpielerangaben(konto.mitgliedId, {
		geschlecht: 'w',
		jahrgang: 1990,
		klassierung: 'R4'
	});
	await setzeTelefon(konto.mitgliedId, '000 000 00 71');
	await startetVomSymbol(page);
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Vera' })).toBeVisible();

	await neueAuslieferung(page);
	await page.goto(`/clubmeisterschaft/${turnierId}/doppel/${kategorieId}`);
	const kommentar = page.getByLabel('Kommentar (freiwillig)');
	await kommentar.fill('Eher am Wochenende.');
	// Bei offener Tastatur sind die Reiter weg (UI-Leitbild); zuerst die Tastatur schliessen.
	await kommentar.blur();
	await wartetAufVorladen(page);
	await setzeMarke(page);
	await kommtInDenVordergrund(page);

	// Geändertes Formular: Die Rückfrage kommt vor dem Neuladen, «Abbrechen» behält die Eingabe.
	await reiter(page, 'CM').click();
	const rueckfrage = page.getByRole('dialog', { name: 'Nicht gespeichert – trotzdem verlassen?' });
	await expect(rueckfrage).toBeVisible();
	await rueckfrage.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(kommentar).toHaveValue('Eher am Wochenende.');
	expect(await hatMarke(page)).toBe(true);

	// «Verlassen» wechselt mit `goto`: in der App, ohne Neuladen.
	await reiter(page, 'Start').click();
	await rueckfrage.getByRole('button', { name: 'Verlassen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Vera' })).toBeVisible();
	expect(await hatMarke(page)).toBe(true);

	// Die Zurück-Geste bleibt in der App.
	await page.goBack();
	await expect(kommentar).toBeVisible();
	expect(await hatMarke(page)).toBe(true);

	// Der nächste angetippte Link lädt die Seite ganz neu.
	await wartetAufVorladen(page);
	await reiter(page, 'Start').click();
	await page.waitForURL((url) => url.pathname === '/');
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Vera' })).toBeVisible();
	expect(await hatMarke(page)).toBe(false);
	expect(fehler).toEqual([]);
});
