import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import { legeKontoMitBriefCodeAn, schliesseLoginHilfen } from './hilfen/login.ts';
import { klappeAuf, pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';

// Benachrichtigungen (FR-40, FR-41): Themen im Profil und Hinweis auf der Startseite. Echt
// abonniert wird hier nicht: Der Push-Dienst der Browser ist in der CI nicht erreichbar.
// Die Tests melden sich direkt auf /login an; mit Sitzung zeigt / die Startseite, auch im
// Handy-Browser. So bleibt das iPhone-Projekt «im Browser» (Push nur vom Startbildschirm).

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

const PUSH_HINWEIS = 'Mitteilungen aufs Handy?';

async function meldeAn(page: Page, vorname: string) {
	const konto = await legeKontoMitBriefCodeAn(vorname);
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${vorname}` })).toBeVisible();
}

async function oeffneBenachrichtigungen(page: Page) {
	await klappeAuf(page, 'Benachrichtigungen');
	await expect(page.getByRole('checkbox', { name: 'Anlässe' })).toBeVisible();
}

/** Der Browser hat noch nicht um Erlaubnis für Mitteilungen gefragt. */
async function nochNichtGefragt(page: Page) {
	await page.addInitScript(() => {
		Object.defineProperty(Notification, 'permission', { get: () => 'default' });
	});
}

/**
 * Schaltet ein Thema um und wartet, bis der Server es gespeichert und die Seite die Antwort
 * verarbeitet hat: Der Test sieht die Antwort, bevor die Seite sie fertig gelesen hat. Ein
 * `page.reload()` in diesem Moment bricht die Anfrage ab, und WebKit meldet das als Seitenfehler
 * («… /api/benachrichtigungen due to access control checks»). Solange die Anfrage läuft, sind die
 * Schalter gesperrt.
 */
async function schalte(page: Page, thema: string, an: boolean) {
	const schalter = page.getByRole('checkbox', { name: thema });
	const gespeichert = page.waitForResponse(
		(r) => r.url().endsWith('/api/benachrichtigungen') && r.request().method() === 'POST' && r.ok()
	);
	await schalter.setChecked(an);
	await gespeichert;
	await expect(schalter).toBeEnabled();
}

test('FR-41: Themen im Profil ab- und wieder einschalten bleibt nach Neuladen', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	await meldeAn(page, 'Selina');
	await page
		.getByRole('navigation', { name: 'Hauptnavigation' })
		.getByRole('link', { name: 'Profil' })
		.click();
	await expect(page).toHaveURL(/\/profil$/);
	await oeffneBenachrichtigungen(page);

	// Neue Konten bekommen alle drei Themen.
	for (const thema of ['Anlässe', 'Clubmeisterschaft', 'Verein']) {
		await expect(page.getByRole('checkbox', { name: thema })).toBeChecked();
	}
	// Push je Gerät: das iPhone im Browser bekommt den Weg zum Startbildschirm, die anderen den
	// Schalter (aus, nichts abonniert).
	if (info.project.name === 'iphone') {
		await expect(
			page.getByText('Push geht auf dem iPhone nur, wenn MyTCO auf dem Startbildschirm liegt.')
		).toBeVisible();
		await expect(page.getByRole('link', { name: 'So legst du MyTCO dorthin' })).toHaveAttribute(
			'href',
			'/hilfe#startbildschirm-iphone'
		);
	} else {
		await expect(page.getByRole('checkbox', { name: 'Push auf diesem Gerät' })).not.toBeChecked();
	}

	await schalte(page, 'Clubmeisterschaft', false);
	await pruefeBildschirm(page, info, 'profil-benachrichtigungen');
	await page.reload();
	await oeffneBenachrichtigungen(page);
	await expect(page.getByRole('checkbox', { name: 'Clubmeisterschaft' })).not.toBeChecked();
	await expect(page.getByRole('checkbox', { name: 'Anlässe' })).toBeChecked();
	await expect(page.getByRole('checkbox', { name: 'Verein' })).toBeChecked();

	await schalte(page, 'Clubmeisterschaft', true);
	await page.reload();
	await oeffneBenachrichtigungen(page);
	await expect(page.getByRole('checkbox', { name: 'Clubmeisterschaft' })).toBeChecked();
	expect(fehler).toEqual([]);
});

test('FR-40: «Nein, danke» blendet den Hinweis auf der Startseite dauerhaft aus', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	// Chrome ohne Fenster meldet Mitteilungen immer als blockiert (auch mit grantPermissions);
	// ein frischer Browser hat noch nicht gefragt.
	if (info.project.name === 'android') await nochNichtGefragt(page);
	await meldeAn(page, 'Timo');
	const pushHinweis = page.locator('.hinweis').filter({ hasText: PUSH_HINWEIS });

	// Nur auf dem Handy, wo Push geht: Das iPhone braucht dafür den Startbildschirm, am PC
	// heisst es nicht «aufs Handy».
	if (info.project.name !== 'android') {
		await expect(pushHinweis).toHaveCount(0);
		expect(fehler).toEqual([]);
		return;
	}

	// Ein Angebot nach dem anderen: Steht der Passkey-Hinweis da, kommt Push erst danach.
	const passkeyHinweis = page.locator('.hinweis').filter({ hasText: 'Nächstes Mal ohne Code?' });
	if (await passkeyHinweis.isVisible()) {
		await expect(pushHinweis).toHaveCount(0);
		await passkeyHinweis.getByRole('button', { name: 'Nein, danke' }).click();
	}
	await expect(pushHinweis).toBeVisible();
	await expect(pushHinweis.getByRole('button', { name: 'Einschalten' })).toBeVisible();
	await pruefeBildschirm(page, info, 'startseite-push-hinweis');

	await pushHinweis.getByRole('button', { name: 'Nein, danke' }).click();
	await expect(pushHinweis).toHaveCount(0);
	expect(await page.evaluate(() => localStorage.getItem('mytco.pushHinweis'))).toBe('nein');

	await page.reload();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Timo' })).toBeVisible();
	// Der Hinweis käme erst nach einer Anfrage; darum warten, bis keine mehr läuft.
	await page.waitForLoadState('networkidle');
	await expect(pushHinweis).toHaveCount(0);
	expect(fehler).toEqual([]);
});
