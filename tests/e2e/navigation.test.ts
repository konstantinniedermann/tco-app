import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	benenneTurnier,
	legeKontoMitBriefCodeAn,
	legeOffenenAnlassAn,
	legeOffenesTurnierAn,
	schliesseLoginHilfen,
	setzeSpielerangaben,
	setzeTelefon
} from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// Übersichtliche Navigation (#69, UI-Leitbild «Feste Ordnung»): Reiter Start · CM · Profil auf
// allen Seiten nach dem Login, Zurück-Link mit Ziel, Reiter CM, Pfad in der Verwaltung.

// Pro Jahr gibt es ein Turnier; diese Jahre gehören nur dieser Datei (übrige E2E: 2075–2099).
const JAHR_DOPPEL: Record<string, number> = { iphone: 2074, android: 2073 };
const JAHR_CM: Record<string, number> = { iphone: 2072, android: 2071 };

const EINZEL: KategorieWerte = {
	name: 'Herren R1–R9',
	geschlecht: 'herren',
	art: 'einzel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: 'R1',
	klassierungBis: 'R9',
	mindestsumme: null
};

type Stand = {
	id: number;
	name: string;
	anmeldeschluss: string;
	status: 'offen';
	anzahl: 0;
	anfragen: 0;
};
const stand = (id: number, name: string): Stand => ({
	id,
	name,
	anmeldeschluss: '2099-05-31',
	status: 'offen',
	anzahl: 0,
	anfragen: 0
});

/**
 * Ersetzt die Liste der laufenden CMs: In der E2E-Datenbank laufen viele Testturniere zugleich
 * (alle Jahre ab heute), «keine» und «eine» liessen sich sonst nicht prüfen.
 */
async function laufendeCms(page: Page, liste: Stand[]) {
	await page.route('**/api/cm', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(liste) })
	);
}

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

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

/** Erfundenes Mitglied meldet sich mit Brief-Code an, wie vom Symbol auf dem Startbildschirm. */
async function meldeAn(page: Page, vorname: string) {
	const konto = await legeKontoMitBriefCodeAn(vorname);
	await startetVomSymbol(page);
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${vorname}` })).toBeVisible();
	await wartetAufVorladen(page);
	return konto;
}

const reiterleiste = (page: Page) => page.getByRole('navigation', { name: 'Hauptnavigation' });
const reiter = (page: Page, name: 'Start' | 'CM' | 'Profil') =>
	reiterleiste(page).getByRole('link', { name, exact: true });

test.describe('Mitglieder-App', () => {
	test.skip(({ isMobile }) => !isMobile, 'nur Handy'); // skip: Die Reiter unten sind fürs Handy; am PC stehen sie in der Kopfleiste, das prüft bewegung.test.ts

	test('#69: drei Reiter Start · CM · Profil', async ({ page }) => {
		await meldeAn(page, 'Nora');
		await expect(reiterleiste(page).getByRole('link')).toHaveText(['Start', 'CM', 'Profil']);
	});

	test('#69: Reiter stehen auf Unterseiten, der Bereich ist markiert', async ({ page }, info) => {
		const fehler = sammleKonsolenfehler(page);
		const konto = await meldeAn(page, 'Olga');
		await page.goto('/profil/email');
		await expect(reiterleiste(page)).toBeVisible();
		await expect(reiter(page, 'Profil')).toHaveAttribute('aria-current', 'page');
		await pruefeBildschirm(page, info, 'navigation-email-aendern');

		const anlass = await legeOffenenAnlassAn(konto.mitgliedId, 'Probeanlass Navigation');
		await page.goto(`/anlass/${anlass}`);
		await expect(
			page.getByRole('heading', { level: 1, name: 'Probeanlass Navigation' })
		).toBeVisible();
		await expect(reiter(page, 'Start')).toHaveAttribute('aria-current', 'page');
		expect(fehler).toEqual([]);
	});

	test('#69: Reiter nochmals antippen führt zur obersten Seite des Bereichs', async ({ page }) => {
		await meldeAn(page, 'Pia');
		await page.goto('/profil/email');
		await expect(reiter(page, 'Profil')).toBeVisible();
		await reiter(page, 'Profil').click();
		await expect(page).toHaveURL(/\/profil$/);
	});

	test('#69: Hilfe mit Sitzung zeigt die Reiter, Start ist markiert', async ({ page }) => {
		await meldeAn(page, 'Rita');
		await page.getByRole('contentinfo').getByRole('link', { name: 'Hilfe' }).click();
		await expect(page).toHaveURL(/\/hilfe$/);
		await expect(reiter(page, 'Start')).toHaveAttribute('aria-current', 'page');
	});

	test('#69: Hilfe ohne Sitzung zeigt keine Reiter und führt zum Anmelden', async ({ page }) => {
		await startetVomSymbol(page);
		await page.goto('/hilfe');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(reiterleiste(page)).toHaveCount(0);
		await page.getByRole('link', { name: '‹ Anmelden' }).click();
		await expect(page).toHaveURL(/\/login$/);
	});

	test('#69: Zurück nennt sein Ziel', async ({ page }) => {
		const konto = await meldeAn(page, 'Sina');
		const anlass = await legeOffenenAnlassAn(konto.mitgliedId, 'Probeanlass Zurück');
		await page.goto(`/anlass/${anlass}`);
		await page.getByRole('link', { name: '‹ Start' }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Hoi Sina' })).toBeVisible();

		await page.goto('/profil/email');
		await page.getByRole('link', { name: '‹ Profil' }).click();
		await expect(page).toHaveURL(/\/profil$/);
	});

	test('#69: Doppel nennt die CM, ein langer Name bleibt einzeilig', async ({ page }, info) => {
		const fehler = sammleKonsolenfehler(page);
		const jahr = JAHR_DOPPEL[info.project.name];
		const {
			turnierId,
			kategorieIds: [kategorieId]
		} = await legeOffenesTurnierAn(jahr, [MIXED]);
		const lang = `Clubmeisterschaft ${jahr} mit einem sehr langen Namen für die Probe am Handy`;
		await benenneTurnier(turnierId, lang);
		const konto = await meldeAn(page, 'Tara');
		await setzeSpielerangaben(konto.mitgliedId, {
			geschlecht: 'w',
			jahrgang: 1992,
			klassierung: 'R4'
		});
		await setzeTelefon(konto.mitgliedId, '079 000 00 69');

		await page.goto(`/clubmeisterschaft/${turnierId}/doppel/${kategorieId}`);
		const zurueck = page.getByRole('link', { name: `‹ ${lang}` });
		await expect(zurueck).toBeVisible();
		// Doppelte Schrift (Systemschriftgrösse): einzeilig, mit «…», nichts ragt seitlich heraus.
		await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
		const masse = await zurueck.evaluate((a) => ({
			hoehe: a.getBoundingClientRect().height,
			zeile: parseFloat(getComputedStyle(a).lineHeight),
			gekuerzt: a.scrollWidth > a.clientWidth
		}));
		expect(masse.hoehe).toBeLessThan(masse.zeile * 1.6);
		expect(masse.gekuerzt).toBe(true);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
		).toBe(true);
		await page.evaluate(() => (document.documentElement.style.fontSize = ''));
		await pruefeBildschirm(page, info, 'navigation-doppel-zurueck');

		await zurueck.click();
		await expect(page.getByRole('heading', { level: 1, name: lang })).toBeVisible();
		expect(fehler).toEqual([]);
	});

	test('#69: Reiter CM ohne laufende CM zeigt den Hinweis', async ({ page }, info) => {
		await meldeAn(page, 'Ursi');
		await laufendeCms(page, []);
		await reiter(page, 'CM').click();
		await expect(page).toHaveURL(/\/clubmeisterschaft$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Clubmeisterschaft' })).toBeVisible();
		await expect(
			page.getByText(
				'Zurzeit läuft keine Clubmeisterschaft. Sobald die Anmeldung offen ist, steht sie hier.',
				{ exact: true }
			)
		).toBeVisible();
		await expect(reiter(page, 'CM')).toHaveAttribute('aria-current', 'page');
		await pruefeBildschirm(page, info, 'navigation-cm-keine');
	});

	test('#69: Reiter CM mit einer CM zeigt sie direkt', async ({ page }, info) => {
		const fehler = sammleKonsolenfehler(page);
		const jahr = JAHR_CM[info.project.name];
		const { turnierId } = await legeOffenesTurnierAn(jahr, [EINZEL]);
		await meldeAn(page, 'Vera');
		await laufendeCms(page, [stand(turnierId, `Clubmeisterschaft ${jahr}`)]);
		await reiter(page, 'CM').click();
		await expect(page).toHaveURL(new RegExp(`/clubmeisterschaft/${turnierId}$`));
		await expect(
			page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
		).toBeVisible();
		await expect(page.locator('a.zurueck')).toHaveCount(0);
		await expect(reiter(page, 'CM')).toHaveAttribute('aria-current', 'page');

		// Nochmals antippen bleibt auf der Seite; die Zurück-Taste führt zur Seite vor dem Tipp.
		await reiter(page, 'CM').click();
		await expect(page).toHaveURL(new RegExp(`/clubmeisterschaft/${turnierId}$`));
		await page.goBack();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Hoi Vera' })).toBeVisible();
		expect(fehler).toEqual([]);
	});

	test('#69: Reiter CM mit mehreren CMs zeigt Kacheln', async ({ page }, info) => {
		const jahr = JAHR_CM[info.project.name];
		const { turnierId } = await legeOffenesTurnierAn(jahr, [EINZEL]);
		await meldeAn(page, 'Wanda');
		await laufendeCms(page, [
			stand(turnierId, `Clubmeisterschaft ${jahr}`),
			stand(turnierId + 100000, 'Clubmeisterschaft Erfunden')
		]);
		await reiter(page, 'CM').click();
		await expect(page).toHaveURL(/\/clubmeisterschaft$/);
		await expect(page.locator('main a.kachel')).toHaveCount(2);
		await pruefeBildschirm(page, info, 'navigation-cm-mehrere');
		await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
		await expect(
			page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
		).toBeVisible();
		await page.getByRole('link', { name: '‹ Clubmeisterschaft', exact: true }).click();
		await expect(page).toHaveURL(/\/clubmeisterschaft$/);
	});

	test('#69: Kachel auf Start führt in den Reiter CM', async ({ page }, info) => {
		const jahr = JAHR_CM[info.project.name];
		const { turnierId } = await legeOffenesTurnierAn(jahr, [EINZEL]);
		await laufendeCms(page, [stand(turnierId, `Clubmeisterschaft ${jahr}`)]);
		await meldeAn(page, 'Xenia');
		await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
		await expect(
			page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
		).toBeVisible();
		await expect(reiter(page, 'CM')).toHaveAttribute('aria-current', 'page');
	});
});
