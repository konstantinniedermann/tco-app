import { expect, test, type Page } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import { bietetInstallationAn, startetVomSymbol } from './hilfen/geraet.ts';
import { legeKontoMitBriefCodeAn, schliesseLoginHilfen } from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';

// Ruhiges App-Gefühl (#54): Fusszeile, Reiter, Seitenwechsel, Bedienung, Aufklappen.
// Regeln: docs/ui-leitbild.md, Abschnitt «Bewegung und Bedienung», UI-09.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

/** Erfundenes Mitglied meldet sich mit Brief-Code an, wie vom Symbol auf dem Startbildschirm. */
async function meldeAn(page: Page, vorname: string): Promise<void> {
	const konto = await legeKontoMitBriefCodeAn(vorname);
	// Steht die App schon auf der Login-Seite (nach dem Abmelden), ohne Neuladen weiter.
	if (!page.url().endsWith('/login')) {
		await startetVomSymbol(page);
		await page.goto('/login');
	}
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${vorname}` })).toBeVisible();
}

function reiter(page: Page, name: 'Start' | 'Profil') {
	return page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name });
}

test('Fusszeile nur vor dem Login und auf der Startseite', async ({ page }) => {
	const fusszeile = page.getByRole('contentinfo');
	for (const pfad of ['/login', '/login/mail']) {
		await page.goto(pfad);
		await expect(fusszeile.getByRole('link', { name: 'Hilfe' }), pfad).toBeVisible();
		await expect(fusszeile.getByRole('link', { name: 'Datenschutz' }), pfad).toBeVisible();
	}
	for (const pfad of ['/hilfe', '/datenschutz', '/gibt-es-nicht']) {
		await page.goto(pfad);
		await expect(page.getByRole('heading', { level: 1 }), pfad).toBeVisible();
		await expect(fusszeile, pfad).toHaveCount(0);
	}

	await meldeAn(page, 'Lena');
	await expect(fusszeile.getByTestId('version')).toHaveText(`Version ${pkg.version}`);
	await reiter(page, 'Profil').click();
	await expect(page).toHaveURL(/\/profil$/);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(fusszeile).toHaveCount(0);
});

test('Fusszeile auf der Einstiegsseite im Handy-Browser', async ({ page }, info) => {
	// Die Einstiegsseite gibt es nur im Handy-Browser; am PC führt sie zum Login (ebenfalls mit Fusszeile).
	await page.goto('/willkommen');
	await expect(page).toHaveURL(info.project.name === 'desktop' ? /\/login$/ : /\/willkommen$/);
	await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Hilfe' })).toBeVisible();
});

/** Macht die Seite lang genug zum Scrollen; `main` gehört zum Layout und bleibt beim Wechsel. */
async function machLang(page: Page): Promise<void> {
	await page.locator('main').evaluate((main) => {
		main.style.minHeight = '300vh';
	});
}

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

/**
 * Tippt einen Reiter an, ohne vorher hinzuscrollen: Am PC stehen die Reiter oben in der
 * Kopfleiste, und Playwright würde vor dem Klick nach oben scrollen.
 */
async function tippeOhneScrollen(page: Page, name: 'Start' | 'Profil'): Promise<void> {
	await reiter(page, name).evaluate((a: HTMLElement) => a.click());
}

test('Reiter ist beim Antippen sofort aktiv, auch wenn der Server langsam antwortet', async ({
	page
}, info) => {
	await meldeAn(page, 'Nora');
	await page.route('**/api/sitzung', async (route) => {
		await new Promise((fertig) => setTimeout(fertig, 2000));
		await route.continue();
	});
	await reiter(page, 'Profil').click();
	await expect(reiter(page, 'Profil')).toHaveAttribute('aria-current', 'page', { timeout: 500 });
	await expect(page).toHaveURL(/\/$/);
	await expect(page).toHaveURL(/\/profil$/);
	await expect(reiter(page, 'Start')).not.toHaveAttribute('aria-current', 'page');
	await pruefeBildschirm(page, info, 'reiter-profil');
});

test('Jeder Reiter merkt sich die Scrollposition; aktiver Reiter führt nach oben', async ({
	page
}) => {
	await meldeAn(page, 'Ida');
	await machLang(page);
	await page.evaluate(() => window.scrollTo(0, 400));
	await tippeOhneScrollen(page, 'Profil');
	await expect(page).toHaveURL(/\/profil$/);
	await expect.poll(() => scrollY(page)).toBe(0);
	await page.evaluate(() => window.scrollTo(0, 200));
	await tippeOhneScrollen(page, 'Start');
	await expect(page).toHaveURL(/\/$/);
	await expect.poll(() => scrollY(page)).toBe(400);
	await tippeOhneScrollen(page, 'Start');
	await expect.poll(() => scrollY(page)).toBe(0);
	await tippeOhneScrollen(page, 'Profil');
	await expect.poll(() => scrollY(page)).toBe(200);
});

test('Nach Abmelden und neuem Login beginnt Start oben', async ({ page }) => {
	await meldeAn(page, 'Ella');
	await machLang(page);
	await page.evaluate(() => window.scrollTo(0, 400));
	await reiter(page, 'Profil').click();
	await page.getByRole('button', { name: 'Abmelden' }).click();
	await expect(page).toHaveURL(/\/login$/);
	await meldeAn(page, 'Zoe');
	await machLang(page);
	await expect.poll(() => scrollY(page)).toBe(0);
});

/**
 * Zeichnet jeden Aufruf von document.startViewTransition mit der gewählten Bewegung auf
 * (Attribut data-uebergang). Kennt der Browser keine View Transitions, bleibt die Liste leer.
 */
async function zeichneUebergaengeAuf(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const liste: string[] = [];
		Object.assign(window, { __uebergaenge: liste });
		if (!('startViewTransition' in document)) return;
		const echt = document.startViewTransition.bind(document);
		document.startViewTransition = ((callback: ViewTransitionUpdateCallback) => {
			liste.push(document.documentElement.dataset.uebergang ?? '');
			return echt(callback);
		}) as typeof document.startViewTransition;
	});
}

const uebergaenge = (page: Page) =>
	page.evaluate(() => (window as unknown as { __uebergaenge: string[] }).__uebergaenge);
const kenntUebergaenge = (page: Page) => page.evaluate(() => 'startViewTransition' in document);

test('Übergänge: Reiter blenden über, Unterseiten schieben (UI-09)', async ({ page }) => {
	const fehler = sammleKonsolenfehler(page);
	await zeichneUebergaengeAuf(page);
	await meldeAn(page, 'Mara');
	const vorher = (await uebergaenge(page)).length;
	await reiter(page, 'Profil').click();
	await expect(page).toHaveURL(/\/profil$/);
	await reiter(page, 'Start').click();
	await expect(page).toHaveURL(/\/$/);
	await page.getByRole('contentinfo').getByRole('link', { name: 'Hilfe' }).click();
	await expect(page).toHaveURL(/\/hilfe$/);
	await page.getByRole('link', { name: '‹ Zurück' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Mara' })).toBeVisible();
	const erwartet = (await kenntUebergaenge(page)) ? ['blende', 'blende', 'tiefer', 'zurueck'] : [];
	expect((await uebergaenge(page)).slice(vorher)).toEqual(erwartet);
	expect(fehler).toEqual([]);
});

test('Bewegung reduzieren: kein Übergang (UI-09)', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await zeichneUebergaengeAuf(page);
	await meldeAn(page, 'Rita');
	await reiter(page, 'Profil').click();
	await expect(page).toHaveURL(/\/profil$/);
	await reiter(page, 'Start').click();
	await expect(page).toHaveURL(/\/$/);
	expect(await uebergaenge(page)).toEqual([]);
});

test('Zwei schnelle Reiter-Klicks hintereinander', async ({ page }) => {
	const fehler = sammleKonsolenfehler(page);
	await meldeAn(page, 'Lia');
	await reiter(page, 'Profil').click();
	await reiter(page, 'Start').click();
	await expect(page).toHaveURL(/\/$/);
	await expect(reiter(page, 'Start')).toHaveAttribute('aria-current', 'page');
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Lia' })).toBeVisible();
	expect(fehler).toEqual([]);
});

test('Bedienelemente wie in einer App, Text bleibt markierbar', async ({ page }) => {
	await meldeAn(page, 'Pia');
	const stil = (ort: ReturnType<Page['locator']>, eigenschaft: string) =>
		ort.evaluate((el, e) => getComputedStyle(el).getPropertyValue(e), eigenschaft);
	// WebKit wertet nur die Schreibweise mit Präfix aus; Chromium kennt beide.
	const markieren = (ort: ReturnType<Page['locator']>) =>
		ort.evaluate((el) => {
			const s = getComputedStyle(el);
			return s.getPropertyValue('-webkit-user-select') || s.getPropertyValue('user-select');
		});
	expect(await markieren(reiter(page, 'Start'))).toBe('none');
	expect(await markieren(page.getByRole('banner'))).toBe('none');
	expect(await markieren(page.getByRole('heading', { level: 1 }))).not.toBe('none');
	const html = page.locator('html');
	expect(await stil(html, 'touch-action')).toBe('manipulation');
	expect(await stil(html, 'color-scheme')).toBe('light');
	// Nur Browser mit Tipp-Blitz (WebKit, Chrome auf dem Handy) kennen die Eigenschaft.
	const blitz = await stil(html, '-webkit-tap-highlight-color');
	if (blitz !== '') expect(blitz).toBe('rgba(0, 0, 0, 0)');
});

/** Aufklappbereich «Neuer Code per E-Mail» der Hilfe (ohne Login erreichbar). */
function klappe(page: Page) {
	return page.locator('details.klappe', { hasText: 'Neuer Code per E-Mail' });
}

/** Tippt die Titelzeile an und meldet sofort danach, ob die Klappe sich weich bewegt. */
const tippeTitel = (page: Page) =>
	klappe(page).evaluate((details) => {
		details.querySelector('summary')?.click();
		return details.classList.contains('klappe-bewegt');
	});

test('Aufklappbereich öffnet und schliesst weich (UI-09)', async ({ page }) => {
	const fehler = sammleKonsolenfehler(page);
	await page.goto('/hilfe');
	expect(await tippeTitel(page)).toBe(true);
	await expect(klappe(page)).toHaveAttribute('open', '');
	await expect(klappe(page)).not.toHaveClass(/klappe-bewegt/);
	expect(await tippeTitel(page)).toBe(true);
	await expect(klappe(page)).not.toHaveAttribute('open');
	await expect(klappe(page)).not.toHaveClass(/klappe-bewegt/);
	expect(fehler).toEqual([]);
});

test('Aufklappbereich bei «Bewegung reduzieren» sofort', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/hilfe');
	expect(await tippeTitel(page)).toBe(false);
	await expect(klappe(page)).toHaveAttribute('open', '');
});

test('Aufklappbereich mit der Tastatur', async ({ page }) => {
	await page.goto('/hilfe');
	const titel = klappe(page).locator('summary');
	await titel.focus();
	await page.keyboard.press('Enter');
	await expect(klappe(page)).toHaveAttribute('open', '');
	await page.keyboard.press(' ');
	await expect(klappe(page)).not.toHaveAttribute('open');
});

test('Menü auf der Einstiegsseite bleibt beim weichen Aufklappen richtig gebunden', async ({
	page
}, info) => {
	test.skip(info.project.name !== 'android', 'nur Android'); // skip: Das Menü erscheint nur nach abgelehntem Install-Angebot von Chrome auf Android
	await page.goto('/willkommen');
	await bietetInstallationAn(page, 'dismissed');
	await page.getByRole('button', { name: 'MyTCO installieren' }).click();
	const menue = page.locator('details.klappe', { hasText: 'Klappt nicht? Über das Menü' });
	const titel = menue.locator('summary');
	const inhalt = menue.locator('summary ~ *');
	await expect(menue).toHaveAttribute('open', '');
	await titel.click();
	await expect(menue).not.toHaveAttribute('open');
	await expect(inhalt).toHaveCount(0);
	await titel.click();
	await expect(menue).toHaveAttribute('open', '');
	await expect(inhalt.first()).toBeVisible();
	await expect(menue).not.toHaveClass(/klappe-bewegt/);
	// Nach dem Aufklappen ist die ganze Anleitung zu sehen, nicht nur die Titelzeile.
	const hoehe = await menue.evaluate((d) => d.getBoundingClientRect().height);
	const titelHoehe = await titel.evaluate((s) => s.getBoundingClientRect().height);
	expect(hoehe).toBeGreaterThan(titelHoehe * 2);
});

test('Unbekannte Adresse aus einem Reiter: Fehlerseite ohne Fusszeile', async ({ page }) => {
	const fehler = sammleKonsolenfehler(page);
	await meldeAn(page, 'Ava');
	await page.goto('/gibt-es-nicht');
	await expect(page.getByRole('heading', { level: 1, name: 'Nicht gefunden' })).toBeVisible();
	await expect(page.getByRole('contentinfo')).toHaveCount(0);
	expect(fehler.filter((f) => !/status of 404\b/.test(f))).toEqual([]);
});
