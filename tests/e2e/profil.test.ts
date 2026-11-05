import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import { holeMailCode, legeKontoMitBriefCodeAn, schliesseLoginHilfen } from './hilfen/login.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import { pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';

// Eigene Angaben im Profil (A-KONTO-01, A-KONTO-02) am Handy. Alle Browser kommen von 127.0.0.1
// an denselben Server; die Grenze von 10 Code-Anfragen pro IP und Stunde gilt für den ganzen
// Lauf (Login-Tests, E-Mail-Wechsel). Jeder Test braucht darum nur die nötigen Anfragen.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

test.beforeEach(async ({ page }, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Das Profil ist fürs Handy gebaut; am Computer prüft verwaltung.test.ts die Liste Für Fairgate
	// Das Mitglied nutzt MyTCO vom Symbol aus; im Handy-Browser käme die Einstiegsseite (A-HILFE-02).
	await startetVomSymbol(page);
});

async function meldeAn(page: Page, vorname: string) {
	const konto = await legeKontoMitBriefCodeAn(vorname);
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${vorname}` })).toBeVisible();
	return konto;
}

async function oeffneProfil(page: Page) {
	await page
		.getByRole('navigation', { name: 'Hauptnavigation' })
		.getByRole('link', { name: 'Profil' })
		.click();
	await expect(page).toHaveURL(/\/profil$/);
	await expect(page.getByText('zugleich dein Login')).toBeVisible();
}

/** Die Kachel einer Angabe im Aufklappbereich «Meine Angaben» (Text und «Ändern»). */
const kachel = (page: Page, titel: string) =>
	page.locator('.kachel').filter({ has: page.getByText(titel, { exact: true }) });

test('A-KONTO-01, A-KONTO-02: Mitglied ändert Telefon und Adresse im Profil', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	await meldeAn(page, 'Lina');
	await oeffneProfil(page);
	await expect(kachel(page, 'Telefon')).toContainText('nicht erfasst');

	// Annahme K-19.1: Telefon ändert das Mitglied selbst.
	await kachel(page, 'Telefon').getByRole('button', { name: 'Ändern' }).click();
	const telefon = page.getByLabel('Telefon (freiwillig)');
	await expect(telefon).toBeFocused();
	await telefon.fill('+41 00 000 00 07');
	await page.getByRole('button', { name: 'Telefon speichern' }).click();
	await expect(kachel(page, 'Telefon')).toContainText('+41 00 000 00 07');

	// Annahme K-19.2: die Adresse ebenso; nur eine Angabe ist offen, mit einer Haupttaste (UI-04).
	await kachel(page, 'Adresse').getByRole('button', { name: 'Ändern' }).click();
	await expect(page.getByLabel('Strasse und Nr.')).toHaveValue('Erfundenweg 1');
	await page.getByLabel('Strasse und Nr.').fill('Probeweg 9');
	await page.getByLabel('PLZ').fill('4632');
	await page.getByLabel('Ort').fill('Trimbach');
	await expect(
		page.getByText('Der Verein trägt die neue Adresse auch in seiner Mitgliederliste nach.')
	).toBeVisible();
	await pruefeBildschirm(page, info, 'profil-adresse');
	await page.getByRole('button', { name: 'Adresse speichern' }).click();
	await expect(kachel(page, 'Adresse')).toContainText('Probeweg 9, 4632 Trimbach');
	await expect(page.getByRole('button', { name: 'Adresse speichern' })).toHaveCount(0);
	// Der Fokus springt zurück auf «Ändern» und scrollt; der Screenshot zeigt die Seite von oben.
	await page.evaluate(() => window.scrollTo(0, 0));
	await pruefeBildschirm(page, info, 'profil');

	// Die Änderung gilt sofort und steht nach dem Neuladen noch da.
	await page.reload();
	await expect(kachel(page, 'Telefon')).toContainText('+41 00 000 00 07');
	await expect(kachel(page, 'Adresse')).toContainText('Probeweg 9, 4632 Trimbach');
	expect(fehler).toEqual([]);
});

test('SI-09, A-KONTO-01: Mitglied wechselt die E-Mail mit zwei Codes', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const konto = await meldeAn(page, 'Noah');
	await oeffneProfil(page);
	await kachel(page, 'E-Mail').getByRole('link', { name: 'Ändern' }).click();
	await expect(page).toHaveURL(/\/profil\/email$/);
	await expect(page.getByText('Schritt 1 von 2 · Neue Adresse')).toBeVisible();

	const neu = `neu-${randomUUID()}@example.org`;
	await page.getByLabel('Neue E-Mail-Adresse').fill(neu);
	await page.getByRole('button', { name: 'Codes senden' }).click();
	const codeAlt = page.getByLabel('Code an die bisherige Adresse');
	await expect(codeAlt).toBeFocused();
	await expect(page.getByText('Schritt 2 von 2 · Bestätigen')).toBeVisible();
	await expect(page.getByText(neu, { exact: true })).toBeVisible();
	await pruefeBildschirm(page, info, 'profil-email-codes');

	// Je ein Code an die bisherige und an die neue Adresse; erst beide zusammen ändern die E-Mail.
	const alt = await holeMailCode(konto.email);
	const neuCode = await holeMailCode(neu);
	await codeAlt.fill(alt);
	await page.getByLabel('Code an die neue Adresse').fill(neuCode);
	await page.getByRole('button', { name: 'E-Mail ändern' }).click();
	await expect(page).toHaveURL(/\/profil\?email=geaendert$/);
	const hinweis = page.getByRole('status').filter({ hasText: 'E-Mail geändert.' });
	await expect(hinweis).toContainText(`Ab sofort meldest du dich mit ${neu} an.`);
	await expect(kachel(page, 'E-Mail')).toContainText(neu);
	await hinweis.getByRole('button', { name: 'Schliessen' }).click();
	await expect(hinweis).toHaveCount(0);
	await expect(page).toHaveURL(/\/profil$/);

	// Die neue Adresse ist ab sofort das Login. Nur auf dem iPhone: Die Code-Anfrage zählt gegen
	// die Grenze pro IP, die der ganze Lauf teilt.
	if (info.project.name !== 'iphone') {
		expect(fehler).toEqual([]);
		return;
	}
	await page.getByRole('button', { name: 'Abmelden' }).click();
	await expect(page).toHaveURL(/\/login$/);
	await page.getByRole('link', { name: 'Kein Brief zur Hand? Code per E-Mail' }).click();
	await page.getByLabel('E-Mail-Adresse').fill(neu);
	await page.getByRole('button', { name: 'Code schicken' }).click();
	const feld = page.getByLabel('Code aus der Mail');
	await expect(feld).toBeVisible();
	// Die Login-Mail trifft kurz nach der Antwort ein; bis dahin ist die neueste Mail die des Wechsels.
	let loginCode = neuCode;
	for (let i = 0; i < 40 && loginCode === neuCode; i++) {
		await page.waitForTimeout(250);
		loginCode = await holeMailCode(neu);
	}
	expect(loginCode).not.toBe(neuCode);
	await feld.fill(loginCode);
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Noah' })).toBeVisible();
	expect(fehler).toEqual([]);
});
