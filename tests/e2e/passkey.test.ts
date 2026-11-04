import { expect, test, type Page } from '@playwright/test';
import { MELDUNG } from '../../src/lib/login/anmelden.ts';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import {
	legeKontoMitBriefCodeAn,
	schliesseLoginHilfen,
	stelleBriefCodeAus
} from './hilfen/login.ts';
import { browserKannPasskey, virtuellerAuthenticator } from './hilfen/passkey.ts';
import { pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';

// Der Testserver ohne Proxy-Kopf meldet https statt http; die Passkey-Prüfung vergleicht die Herkunft.
test.use({ extraHTTPHeaders: { 'x-forwarded-proto': 'http' } });

// Rate-Limits gelten pro IP für den ganzen Lauf: höchstens ein Fehlversuch pro Test und Projekt.
test.afterAll(async () => {
	await schliesseLoginHilfen();
});

const HINWEIS = 'Nächstes Mal ohne Code?';

async function meldeMitBriefCodeAn(page: Page, code: string, vorname: string) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(code).toLowerCase());
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${vorname}` })).toBeVisible();
}

async function meldeAb(page: Page) {
	await page
		.getByRole('navigation', { name: 'Hauptnavigation' })
		.getByRole('link', { name: 'Profil' })
		.click();
	await expect(page).toHaveURL(/\/profil$/);
	await page.getByRole('button', { name: 'Abmelden' }).click();
	await expect(page).toHaveURL(/\/login$/);
}

test.describe('mit virtuellem Authenticator', () => {
	test.beforeEach(({ browserName }) => {
		test.skip(browserName !== 'chromium'); // skip: virtueller Authenticator nur über Chrome DevTools Protocol
	});

	test('A-LOGIN-07: Passkey nach Code-Login einrichten, abmelden, mit Passkey anmelden', async ({
		page
	}, info) => {
		const fehler = sammleKonsolenfehler(page);
		const entferne = await virtuellerAuthenticator(page);
		const konto = await legeKontoMitBriefCodeAn('Pia');
		await meldeMitBriefCodeAn(page, konto.code, 'Pia');

		await expect(page.getByText(HINWEIS)).toBeVisible();
		await pruefeBildschirm(page, info, 'startseite-passkey-hinweis');
		await page.getByRole('button', { name: 'Passkey einrichten' }).click();
		await expect(page.getByText(HINWEIS)).toBeHidden();

		await page
			.getByRole('navigation', { name: 'Hauptnavigation' })
			.getByRole('link', { name: 'Profil' })
			.click();
		await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
		await expect(
			page.getByText(/eingerichtet am \d+\.\d+\.\d{4} · zuletzt noch nie/)
		).toBeVisible();
		await pruefeBildschirm(page, info, 'profil-passkey');
		await page.getByRole('button', { name: 'Abmelden' }).click();
		await expect(page).toHaveURL(/\/login$/);

		await expect(page.getByRole('heading', { level: 2, name: 'Mit Passkey' })).toBeVisible();
		await expect(page.getByRole('heading', { level: 2, name: 'Mit Code' })).toBeVisible();
		await pruefeBildschirm(page, info, 'login-zwei-karten');
		await page.getByRole('button', { name: 'Mit Passkey anmelden' }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Hoi Pia' })).toBeVisible();
		await expect(page.getByText(HINWEIS)).toBeHidden();
		expect(fehler).toEqual([]);
		await entferne();
	});

	test('A-LOGIN-07: Nein, danke blendet den Hinweis aus, auch nach Neuladen', async ({ page }) => {
		const fehler = sammleKonsolenfehler(page);
		const entferne = await virtuellerAuthenticator(page);
		const konto = await legeKontoMitBriefCodeAn('Ben');
		await meldeMitBriefCodeAn(page, konto.code, 'Ben');

		await expect(page.getByText(HINWEIS)).toBeVisible();
		await page.getByRole('button', { name: 'Nein, danke' }).click();
		await expect(page.getByText(HINWEIS)).toBeHidden();
		await page.reload();
		await expect(page.getByRole('heading', { level: 1, name: 'Hoi Ben' })).toBeVisible();
		await expect(page.getByText(HINWEIS)).toBeHidden();
		expect(fehler).toEqual([]);
		await entferne();
	});

	test('A-LOGIN-07: Nachfrage beim Entfernen hält den Fokus; entfernter Passkey meldet sich nicht mehr an, Code geht weiter', async ({
		page
	}) => {
		const fehler = sammleKonsolenfehler(page);
		const entferne = await virtuellerAuthenticator(page);
		// Chromium räumt entfernte Passkeys über die Signal API selbst aus dem Gerät; ohne sie
		// bleibt er im virtuellen Authenticator und der Server muss ihn ablehnen.
		await page.addInitScript(() => {
			Reflect.deleteProperty(PublicKeyCredential, 'signalUnknownCredential');
		});
		const konto = await legeKontoMitBriefCodeAn('Lui');
		await meldeMitBriefCodeAn(page, konto.code, 'Lui');
		await page.getByRole('button', { name: 'Passkey einrichten' }).click();
		await expect(page.getByText(HINWEIS)).toBeHidden();
		await page
			.getByRole('navigation', { name: 'Hauptnavigation' })
			.getByRole('link', { name: 'Profil' })
			.click();

		// Fokus: beim Öffnen der Nachfrage auf «Abbrechen», nach «Abbrechen» zurück auf «Entfernen».
		const entfernen = page.getByRole('button', { name: 'Entfernen', exact: true });
		await entfernen.click();
		const gruppe = page.getByRole('group', { name: 'Wirklich entfernen?' });
		await expect(gruppe).toBeVisible();
		await expect(gruppe.getByRole('button', { name: 'Abbrechen' })).toBeFocused();
		await gruppe.getByRole('button', { name: 'Abbrechen' }).click();
		await expect(gruppe).toBeHidden();
		await expect(entfernen).toBeFocused();

		await entfernen.click();
		await gruppe.getByRole('button', { name: 'Entfernen' }).click();
		await expect(page.getByText(/eingerichtet am/)).toBeHidden();
		await expect(
			page.getByText('Mit einem Passkey meldest du dich ohne Code an', { exact: false })
		).toBeVisible();

		await page.getByRole('button', { name: 'Abmelden' }).click();
		await expect(page).toHaveURL(/\/login$/);
		// Der virtuelle Authenticator kennt den Passkey noch, der Server nicht mehr (1 Fehlversuch).
		await page.getByRole('button', { name: 'Mit Passkey anmelden' }).click();
		await expect(page.getByText(MELDUNG.passkeyFalsch)).toBeVisible();
		await expect(page).toHaveURL(/\/login$/);

		await meldeMitBriefCodeAn(page, await stelleBriefCodeAus(konto.kontoId), 'Lui');
		// Die nachgestellte 400 meldet der Browser selbst in der Konsole.
		expect(fehler).toEqual([]);
		await entferne();
	});
});

test('A-LOGIN-08: Login-Seite zeigt Code-Karte; Passkey-Karte nur, wenn der Browser WebAuthn meldet', async ({
	page
}) => {
	const fehler = sammleKonsolenfehler(page);
	await page.goto('/login');
	await expect(page.getByRole('heading', { level: 2, name: 'Mit Code' })).toBeVisible();
	const karte = page.getByRole('heading', { level: 2, name: 'Mit Passkey' });
	const taste = page.getByRole('button', { name: 'Mit Passkey anmelden' });
	if (await browserKannPasskey(page)) {
		await expect(karte).toBeVisible();
		await expect(taste).toBeVisible();
	} else {
		await expect(karte).toHaveCount(0);
		await expect(taste).toHaveCount(0);
	}
	expect(fehler).toEqual([]);
});

test('A-LOGIN-08: Profil-Bildschirm ohne Passkey ohne axe-Verstösse', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const konto = await legeKontoMitBriefCodeAn('Rea');
	await meldeMitBriefCodeAn(page, konto.code, 'Rea');
	// Der Hinweis erscheint nur, wo der Browser Passkeys kann (auch WebKit).
	if (await browserKannPasskey(page)) await expect(page.getByText(HINWEIS)).toBeVisible();
	else await expect(page.getByText(HINWEIS)).toHaveCount(0);
	await page
		.getByRole('navigation', { name: 'Hauptnavigation' })
		.getByRole('link', { name: 'Profil' })
		.click();
	await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
	await expect(page.getByText('Anmelden mit Passkey')).toBeVisible();
	await expect(
		page.getByText('Mit einem Passkey meldest du dich ohne Code an', { exact: false })
	).toBeVisible();
	await pruefeBildschirm(page, info, 'profil-ohne-passkey');
	await meldeAb(page);
	expect(fehler).toEqual([]);
});
