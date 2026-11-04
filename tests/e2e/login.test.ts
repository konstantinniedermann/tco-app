import { expect, test, type Page } from '@playwright/test';
import { MELDUNG } from '../../src/lib/login/anmelden.ts';
import { MAILANFRAGE_SCHLUESSEL } from '../../src/lib/login/mailanfrage.ts';
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

/** Roher Eintrag der Mail-Anfrage im localStorage der Seite. */
function leseMailanfrage(page: Page): Promise<string | null> {
	return page.evaluate((schluessel) => localStorage.getItem(schluessel), MAILANFRAGE_SCHLUESSEL);
}

/** Öffnet das Profil über den Reiter; dort sitzt «Abmelden». */
async function oeffneProfil(page: Page) {
	await page
		.getByRole('navigation', { name: 'Hauptnavigation' })
		.getByRole('link', { name: 'Profil' })
		.click();
	await expect(page).toHaveURL(/\/profil$/);
}

/** Brief-Code klein und mit Bindestrich eintippen (UI-07). */
async function meldeMitBriefAn(page: Page, vorname: string) {
	const konto = await legeKontoMitBriefCodeAn(vorname);
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code).toLowerCase());
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
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
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
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
	await oeffneProfil(page);
	await page.getByRole('button', { name: 'Abmelden' }).click();
	await expect(page).toHaveURL(/\/login$/);
	await page.goto('/');
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();
	expect(fehler).toEqual([]);
});

test('Abmelden ohne Antwort des Servers zeigt die Störung und bleibt angemeldet', async ({
	page
}) => {
	const fehler = sammleKonsolenfehler(page);
	await meldeMitBriefAn(page, 'Jonas');
	await oeffneProfil(page);
	await page.route('**/api/logout', (route) => route.fulfill({ status: 503, body: '' }));
	const taste = page.getByRole('button', { name: 'Abmelden' });
	await taste.click();
	await expect(page.getByText(MELDUNG.stoerung)).toBeVisible();
	await expect(taste).toHaveAccessibleDescription(MELDUNG.stoerung);
	await expect(page).toHaveURL(/\/profil$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
	// Die nachgestellte 503 meldet der Browser selbst in der Konsole.
	expect(fehler.filter((f) => !/status of 503\b/.test(f))).toEqual([]);
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
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	const meldung = `Dieser Code wurde schon benutzt. Wende dich an ${KONTAKT}.`;
	await expect(page.getByText(meldung)).toBeVisible();
	// UI-06: die Meldung steht beim Feld und ist mit ihm verknüpft.
	await expect(feld).toHaveAccessibleDescription(new RegExp(meldung.replace(/[.()]/g, '\\$&')));
	await expect(feld).toBeFocused();
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
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	const meldung =
		'Dieser Code stimmt nicht. Prüf ihn oder lass dir einen neuen per E-Mail schicken.';
	await expect(page.getByText(meldung)).toBeVisible();
	await expect(feld).toHaveAccessibleDescription(new RegExp(meldung.replace(/[.]/g, '\\.')));
	await expect(feld).toBeFocused();
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
	// UI-01 (WCAG 4.1.3): Hinweis als Statusmeldung, Fokus im neuen Feld.
	await expect(page.getByRole('status')).toHaveText(
		'Falls ein Konto zu dieser Adresse besteht, ist eine Mail unterwegs.'
	);
	await expect(page.getByLabel('Code aus der Mail')).toBeFocused();
	await pruefeBildschirm(page, info, 'login-mail-code');

	// Wechsel in die Mail-App: das iPhone lädt MyTCO danach oft neu.
	await page.reload();
	const feld = page.getByLabel('Code aus der Mail');
	await expect(feld).toBeVisible();
	const code = await holeMailCode(konto.email);

	// Ein Tippfehler: Meldung beim Feld, Fokus zurück im Feld (zählt als 1 von 10 Versuchen).
	await feld.fill(String((Number(code) + 1) % 1_000_000).padStart(6, '0'));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByText(MELDUNG.mailFalsch)).toBeVisible();
	await expect(feld).toHaveAccessibleDescription(/Dieser Code stimmt nicht\. Prüf ihn/);
	await expect(feld).toBeFocused();
	await pruefeBildschirm(page, info, 'login-mail-code-falsch');

	await feld.fill(code);
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Sara' })).toBeVisible();
	expect(await leseMailanfrage(page)).toBeNull();
	expect(fehler).toEqual([]);
});

// Eine Anfrage pro Projekt für beide Fälle: die Grenze von 10 Code-Anfragen pro IP und Stunde
// gilt für den ganzen Lauf über alle drei Projekte.
test('Kaltstart mit offener Mail-Anfrage zeigt das Feld «Code aus der Mail»; Login mit Brief-Code löscht die Anfrage', async ({
	page
}) => {
	const fehler = sammleKonsolenfehler(page);
	const konto = await legeKontoMitBriefCodeAn('Rina');
	await page.goto('/login/mail');
	await page.getByLabel('E-Mail-Adresse').fill(konto.email);
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await expect(page.getByLabel('Code aus der Mail')).toBeVisible();
	expect(await leseMailanfrage(page)).toContain(konto.email);

	// iOS beendet die Startbildschirm-App beim Wechsel in die Mail-App; sie startet neu auf `/`.
	await page.goto('/');
	await expect(page).toHaveURL(/\/login\/mail$/);
	await expect(page.getByLabel('Code aus der Mail')).toBeVisible();

	// «‹ Zurück» führt zur Brief-Seite und springt nicht wieder zurück.
	await page.getByRole('link', { name: '‹ Zurück' }).click();
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByLabel('Code aus dem Brief')).toBeVisible();
	await expect(page).toHaveURL(/\/login$/);

	// Doch noch den Brief gefunden.
	await page.getByLabel('Code aus dem Brief').fill(konto.code);
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Rina' })).toBeVisible();
	expect(await leseMailanfrage(page)).toBeNull();
	expect(fehler).toEqual([]);
});

test('Gerätespeicher: abgelaufene Mail-Anfrage wird beim Start der App gelöscht', async ({
	page
}) => {
	const fehler = sammleKonsolenfehler(page);
	await page.goto('/login');
	// Erst fertig laden lassen; ein Neuladen mitten im Laden bricht Modul-Importe ab (WebKit).
	const titel = page.getByRole('heading', { level: 1, name: 'Anmelden' });
	await expect(titel).toBeVisible();
	await page.evaluate(
		([schluessel, eintrag]) => localStorage.setItem(schluessel, eintrag),
		[
			MAILANFRAGE_SCHLUESSEL,
			JSON.stringify({ email: 'alt@example.org', zeit: Date.now() - 16 * 60_000 })
		]
	);
	await page.reload();
	await expect(titel).toBeVisible();
	await expect.poll(() => leseMailanfrage(page)).toBeNull();
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
