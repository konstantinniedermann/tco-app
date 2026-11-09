import { expect, test, type Page } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import { bietetInstallationAn, startetVomSymbol } from './hilfen/geraet.ts';
import { legeKontoMitBriefCodeAn, schliesseLoginHilfen } from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

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
	await wartetAufVorladen(page);
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

/** Der einzige Bereich der Mitglieder-App, der scrollt (UI-Leitbild, Baustein Rollbereich). */
const rollbereich = (page: Page) => page.locator('.rollbereich');
const rolle = (page: Page, y: number) =>
	rollbereich(page).evaluate((el, wert) => {
		el.scrollTop = wert;
	}, y);
const gerollt = (page: Page) => rollbereich(page).evaluate((el) => Math.round(el.scrollTop));

/**
 * Tippt einen Link an, ohne vorher hinzuscrollen: Playwright würde den Rollbereich sonst zum
 * Ziel scrollen, und am PC stehen die Reiter oben in der Kopfleiste.
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

test('Nur der Rollbereich scrollt, Kopfleiste und Reiter stehen fest', async ({ page }) => {
	await meldeAn(page, 'Vera');
	await machLang(page);
	await rolle(page, 600);
	expect(await gerollt(page)).toBe(600);
	// Die Seite als Ganzes scrollt nie.
	await page.evaluate(() => window.scrollTo(0, 400));
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
	const hoehe = page.viewportSize()?.height ?? 0;
	const kopf = await page.getByRole('banner').boundingBox();
	const leiste = await page.getByRole('navigation', { name: 'Hauptnavigation' }).boundingBox();
	expect(kopf?.y).toBe(0);
	expect(leiste).not.toBeNull();
	// Handy: Reiter unten am Bildschirm; PC: mit Symbol in der Kopfleiste (innerhalb ihrer Höhe).
	if (leiste && kopf && leiste.y > kopf.height) {
		expect(Math.round(leiste.y + leiste.height)).toBe(hoehe);
	} else {
		expect(leiste?.y ?? -1).toBeGreaterThanOrEqual(kopf?.y ?? 0);
		expect((leiste?.y ?? 0) + (leiste?.height ?? 0)).toBeLessThanOrEqual(
			(kopf?.y ?? 0) + (kopf?.height ?? 0)
		);
	}
});

test('Jeder Reiter beginnt oben; aktiver Reiter führt nach oben', async ({ page }) => {
	await meldeAn(page, 'Ida');
	await machLang(page);
	await rolle(page, 400);
	await tippeOhneScrollen(page, 'Profil');
	await expect(page).toHaveURL(/\/profil$/);
	await expect.poll(() => gerollt(page)).toBe(0);
	await machLang(page);
	await rolle(page, 200);
	await tippeOhneScrollen(page, 'Start');
	await expect(page).toHaveURL(/\/$/);
	await expect.poll(() => gerollt(page)).toBe(0);
	await machLang(page);
	await rolle(page, 300);
	await tippeOhneScrollen(page, 'Start');
	await expect.poll(() => gerollt(page)).toBe(0);
});

test('Zurück-Link und Zurück des Browsers bringen die Seite an die alte Stelle', async ({
	page
}) => {
	await meldeAn(page, 'Jana');
	await machLang(page);
	await rolle(page, 300);
	const hilfe = page.getByRole('contentinfo').getByRole('link', { name: 'Hilfe' });
	await hilfe.evaluate((a: HTMLElement) => a.click());
	await expect(page).toHaveURL(/\/hilfe$/);
	await expect.poll(() => gerollt(page)).toBe(0);
	await page.getByRole('link', { name: '‹ Start' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Jana' })).toBeVisible();
	await machLang(page);
	await expect.poll(() => gerollt(page)).toBe(300);
	await hilfe.evaluate((a: HTMLElement) => a.click());
	await expect(page).toHaveURL(/\/hilfe$/);
	await page.goBack();
	await expect(page).toHaveURL(/\/$/);
	await machLang(page);
	await expect.poll(() => gerollt(page)).toBe(300);
});

/** Aufklappbereich im Profil mit dem Titel `titel`. */
const profilKlappe = (page: Page, titel: string) =>
	page.locator('details.klappe', { has: page.locator('summary', { hasText: titel }) });

test('Profil: Aufklappbereiche anfangs zu, offene bleiben offen bis zum Abmelden', async ({
	page
}) => {
	await meldeAn(page, 'Lou');
	await reiter(page, 'Profil').click();
	await expect(page).toHaveURL(/\/profil$/);
	await expect(profilKlappe(page, 'Meine Angaben')).not.toHaveAttribute('open');
	await expect(profilKlappe(page, 'Anmelden mit Passkey')).not.toHaveAttribute('open');
	await profilKlappe(page, 'Meine Angaben').locator('summary').click();
	await expect(profilKlappe(page, 'Meine Angaben')).toHaveAttribute('open', '');
	await reiter(page, 'Start').click();
	await expect(page).toHaveURL(/\/$/);
	await reiter(page, 'Profil').click();
	await expect(page).toHaveURL(/\/profil$/);
	await expect(profilKlappe(page, 'Meine Angaben')).toHaveAttribute('open', '');
	await expect(profilKlappe(page, 'Anmelden mit Passkey')).not.toHaveAttribute('open');
	await page.getByRole('button', { name: 'Abmelden' }).click();
	await expect(page).toHaveURL(/\/login$/);
	await meldeAn(page, 'Max');
	await reiter(page, 'Profil').click();
	await expect(page).toHaveURL(/\/profil$/);
	await expect(profilKlappe(page, 'Meine Angaben')).not.toHaveAttribute('open');
});

test('Tastatur: Reiter weg, solange ein Feld den Fokus hat (Handy)', async ({ page }, info) => {
	await meldeAn(page, 'Ronja');
	await reiter(page, 'Profil').click();
	await profilKlappe(page, 'Meine Angaben').locator('summary').click();
	await page.getByRole('button', { name: 'Ändern' }).first().click();
	const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
	await page.getByLabel('Rufname (freiwillig)').focus();
	if (info.project.name === 'desktop') {
		// Am PC (Maus) bleiben die Reiter.
		await expect(navigation).toBeVisible();
	} else {
		await expect(navigation).toBeHidden();
	}
	await page.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(navigation).toBeVisible();
});

test('Tastatur: «Weiter» springt ins nächste Feld, «Fertig» sendet ab', async ({ page }, info) => {
	await meldeAn(page, 'Selma');
	await reiter(page, 'Profil').click();
	await profilKlappe(page, 'Meine Angaben').locator('summary').click();
	const kachel = page.locator('.kachel', { hasText: 'Adresse' });
	await kachel.getByRole('button', { name: 'Ändern' }).click();
	const strasse = page.getByLabel('Strasse und Nr.');
	const plz = page.getByLabel('PLZ');
	const ort = page.getByLabel('Ort');
	if (info.project.name === 'desktop') {
		// Am PC (Maus, auch in der Verwaltung) sendet die Eingabetaste wie gewohnt ab.
		await strasse.fill('Probeweg 5');
		await strasse.press('Enter');
		await expect(kachel).toContainText('Probeweg 5');
		return;
	}
	await strasse.fill('Probeweg 3');
	await expect(strasse).toHaveAttribute('enterkeyhint', 'next');
	await strasse.press('Enter');
	await expect(plz).toBeFocused();
	await expect(page.getByRole('button', { name: 'Adresse speichern' })).toBeVisible();
	await plz.fill('4632');
	await plz.press('Enter');
	await expect(ort).toBeFocused();
	await expect(ort).toHaveAttribute('enterkeyhint', 'done');
	await ort.fill('Trimbach');
	await ort.press('Enter');
	await expect(page.getByRole('button', { name: 'Adresse speichern' })).toHaveCount(0);
	await expect(kachel).toContainText('Probeweg 3, 4632 Trimbach');
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
	await page.getByRole('link', { name: '‹ Start' }).click();
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
	// Auch Balken, Symbol, Kachel, Pfeil des Aufklappbereichs und Titel der Kopfleiste bewegen sich nicht (im Profil;
	// eine Kachel als Link hat ein normales Mitglied nicht, darum eine zum Prüfen).
	await reiter(page, 'Profil').click();
	await expect(page).toHaveURL(/\/profil$/);
	const dauern = await page.evaluate(() => {
		const kachel = document.createElement('a');
		kachel.className = 'kachel';
		document.querySelector('main')?.append(kachel);
		return ['.reiter-balken', '.reiter a .symbol', 'a.kachel', '.klappe-titel', '.kopf-titel'].map(
			(wahl) => {
				const el = document.querySelector(wahl);
				if (!el) return `${wahl} fehlt`;
				const s = getComputedStyle(el, wahl === '.klappe-titel' ? '::after' : null);
				return `${wahl}: ${s.transitionDuration}`;
			}
		);
	});
	expect(dauern.filter((d) => !/: 0s(, 0s)*$/.test(d))).toEqual([]);
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
