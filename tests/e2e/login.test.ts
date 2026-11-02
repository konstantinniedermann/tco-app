import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import {
	beendeAlleSitzungen,
	holeMailCode,
	legeKontoAn,
	legeKontoMitBriefCodeAn,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';
import { e2eEinstellungen } from './hilfen/umgebung.ts';

// Alle Browser kommen von 127.0.0.1 an denselben Server; die Grenzen pro IP und Stunde gelten
// für den ganzen Lauf. Jeder Test braucht darum nur die nötigen Anfragen.
const KONTAKT = e2eEinstellungen('').MYTCO_KONTAKT;

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

/** Brief-Code klein und mit Bindestrich eintippen (UI-07). */
async function meldeMitBriefAn(page: Page, vorname: string) {
	const konto = await legeKontoMitBriefCodeAn(vorname);
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code).toLowerCase());
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${vorname}` })).toBeVisible();
	return konto;
}

test('A-LOGIN-08: Login mit Brief-Code', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const konto = await legeKontoMitBriefCodeAn('Lea');
	await page.goto('/');
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();
	await pruefeBildschirm(page, info, 'login');

	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code).toLowerCase());
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Lea' })).toBeVisible();
	await expect(page).toHaveURL(/\/$/);
	await pruefeBildschirm(page, info, 'startseite-angemeldet');
	expect(fehler).toEqual([]);
});

test('A-LOGIN-09: nach Neuladen und in neuem Tab weiterhin angemeldet', async ({
	page,
	context
}) => {
	const fehler = sammleKonsolenfehler(page);
	await meldeMitBriefAn(page, 'Nino');
	await page.reload();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Nino' })).toBeVisible();

	const tab = await context.newPage();
	const fehlerTab = sammleKonsolenfehler(tab);
	await tab.goto('/');
	await expect(tab.getByRole('heading', { level: 1, name: 'Hoi Nino' })).toBeVisible();
	expect([...fehler, ...fehlerTab]).toEqual([]);
});

test('SI-06: Abmelden führt zur Login-Seite', async ({ page }) => {
	const fehler = sammleKonsolenfehler(page);
	await meldeMitBriefAn(page, 'Mia');
	await page.getByRole('button', { name: 'Abmelden' }).click();
	await expect(page).toHaveURL(/\/login$/);
	await page.goto('/');
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();
	expect(fehler).toEqual([]);
});

test('SI-02: benutzter Brief-Code zeigt «Dieser Code wurde schon benutzt. Wende dich an <Kontakt>.»', async ({
	page,
	request
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const konto = await legeKontoMitBriefCodeAn('Timo');
	// Jemand anderes war schneller (B-03); dieser Login zählt nicht als Fehlversuch.
	const zuerst = await request.post('/api/login/brief', { data: { code: konto.code } });
	expect(zuerst.status()).toBe(200);

	await page.goto('/login');
	const feld = page.getByLabel('Code aus dem Brief');
	await feld.fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden' }).click();
	const meldung = `Dieser Code wurde schon benutzt. Wende dich an ${KONTAKT}.`;
	await expect(page.getByText(meldung)).toBeVisible();
	// UI-06: die Meldung steht beim Feld und ist mit ihm verknüpft.
	await expect(feld).toHaveAccessibleDescription(new RegExp(meldung.replace(/[.()]/g, '\\$&')));
	await expect(page).toHaveURL(/\/login$/);
	await pruefeBildschirm(page, info, 'login-code-benutzt');
	expect(fehler).toEqual([]);
});

test('UI-06: falscher Brief-Code zeigt die Meldung mit Lösungsweg beim Feld', async ({
	page
}, info) => {
	// Ein einziger Fehlversuch pro Projekt: die Grenze von 10 pro Stunde bleibt weit weg.
	const fehler = sammleKonsolenfehler(page);
	await page.goto('/login');
	const feld = page.getByLabel('Code aus dem Brief');
	await feld.fill('AAAAA-AAAAA');
	await page.getByRole('button', { name: 'Anmelden' }).click();
	const meldung =
		'Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen per E-Mail schicken.';
	await expect(page.getByText(meldung)).toBeVisible();
	await expect(feld).toHaveAccessibleDescription(new RegExp(meldung.replace(/[.]/g, '\\.')));
	await pruefeBildschirm(page, info, 'login-code-falsch');
	expect(fehler).toEqual([]);
});

test('A-LOGIN-10: Code per E-Mail, mit Neuladen zwischen Anfrage und Eingabe', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const konto = await legeKontoAn('Sara');
	await page.goto('/login');
	await page.getByRole('link', { name: 'Kein Brief zur Hand? Code per E-Mail' }).click();
	await expect(page).toHaveURL(/\/login\/mail$/);
	await pruefeBildschirm(page, info, 'login-mail-adresse');

	await page.getByLabel('E-Mail-Adresse').fill(konto.email);
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await expect(
		page.getByText('Falls ein Konto zu dieser Adresse besteht, ist eine Mail unterwegs')
	).toBeVisible();
	await pruefeBildschirm(page, info, 'login-mail-code');

	// Wechsel in die Mail-App: das iPhone lädt MyTCO danach oft neu.
	await page.reload();
	const feld = page.getByLabel('Code aus der Mail');
	await expect(feld).toBeVisible();
	await feld.fill(await holeMailCode(konto.email));
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Sara' })).toBeVisible();
	expect(fehler).toEqual([]);
});

test('SI-07: nach beendeAlleSitzungen führt der nächste Aufruf zur Login-Seite', async ({
	page
}) => {
	const fehler = sammleKonsolenfehler(page);
	const konto = await meldeMitBriefAn(page, 'Ueli');
	await beendeAlleSitzungen(konto.kontoId);
	await page.reload();
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();
	expect(fehler).toEqual([]);
});
