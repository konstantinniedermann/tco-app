// Prüflauf gegen den echten Test-Server (Checkliste vor dem Release, docs/testkonzept.md). Startet
// nur `make test-pruefung`; die Prüfkonten legt der Server-Teil vorher an
// (scripts/test-pruefung-server.ts). Drei Codes pro Lauf, Pia davon zwei: Pro Adresse gehen 3 Mails
// in der Stunde (login/bremse.ts), ein zweiter Lauf darum frühestens nach einer Stunde.
import { expect, test, type Page } from '@playwright/test';
import { istCodeStandVon } from '../../scripts/test-pruefung.ts';
import { PRUEFKONTEN } from '../../scripts/pruefkonten.ts';
import { codeMails, holeTestMailCode } from '../../scripts/test-pruefung-mail.ts';

const [PAUL, PIA] = PRUEFKONTEN;
const VERSION = process.env.MYTCO_TEST_ERWARTET_VERSION!;
const DEV = process.env.MYTCO_TEST_ERWARTET_DEV!;

/** Login mit Code per E-Mail, wie ein Mitglied ohne Brief. */
async function meldeMitMailAn(page: Page, konto: { vorname: string; email: string }) {
	await page.goto('/login');
	await page.getByRole('link', { name: 'Kein Brief zur Hand? Code per E-Mail' }).click();
	await page.getByLabel('E-Mail-Adresse').fill(konto.email);
	const vorher = await codeMails(page.request, konto.email);
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page
		.getByLabel('Code aus der Mail')
		.fill(await holeTestMailCode(page.request, konto.email, vorher));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
}

test('Prüflauf: Fusszeile zeigt die Nummer und den Code-Stand von dev', async ({ page }, info) => {
	await page.goto('/login');
	const text = (await page.getByTestId('version').textContent())?.trim() ?? '';
	await info.attach('fusszeile', { body: await page.screenshot(), contentType: 'image/png' });
	const treffer = /^Version (\S+) · ([0-9a-f]{7,40})$/.exec(text);
	expect(treffer, `Fusszeile zeigt «${text}»`).not.toBeNull();
	expect(treffer![1], `Test zeigt ${treffer![1]}, dev hat ${VERSION}`).toBe(VERSION);
	expect(
		istCodeStandVon(treffer![2], DEV),
		`Test zeigt ${treffer![2]}, das ist nicht der Code-Stand von dev ${DEV.slice(0, 7)}`
	).toBe(true);
});

test('Prüflauf A-HILFE-01: Hilfe ohne Login über die Fusszeile', async ({ page }) => {
	await page.goto('/login');
	await page.getByRole('contentinfo').getByRole('link', { name: 'Hilfe' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hilfe' })).toBeVisible();
	await expect(page.getByText('Fragen?')).toBeVisible();
});

test('Prüflauf A-LOGIN-10: Login mit Code per Mail', async ({ page }, info) => {
	await meldeMitMailAn(page, PAUL);
	await info.attach('startseite', { body: await page.screenshot(), contentType: 'image/png' });
});

test('Prüflauf SI-08: Verwaltung öffnet mit Code per Mail', async ({ page }, info) => {
	await meldeMitMailAn(page, PIA);
	await page.goto('/verwaltung');
	await expect(page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' })).toBeVisible();
	const vorher = await codeMails(page.request, PIA.email);
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page
		.getByLabel('Code aus der Mail')
		.fill(await holeTestMailCode(page.request, PIA.email, vorher));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page).toHaveURL(/\/verwaltung\/mitglieder$/);
	await info.attach('verwaltung', { body: await page.screenshot(), contentType: 'image/png' });
});
