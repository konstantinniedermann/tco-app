import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

// Browser melden jede 4xx-Antwort in der Konsole. Bei den Schnittstellen sind 400 (Code
// falsch), 401 (nicht angemeldet), 403 (kein Admin), 409 (vergeben, letzter Admin, veraltet)
// und 429 (Grenze) Antworten, die die App behandelt. Eine 404 lässt nur der Test durch, der sie
// absichtlich auslöst.
const ERWARTETE_ANTWORT =
	/^Failed to load resource: the server responded with a status of 4(00|01|03|09|29)\b/;

function istErwarteteApiAntwort(text: string, url: string): boolean {
	// Ohne Ort (leere URL) ist es keine Antwort einer Schnittstelle.
	return (
		ERWARTETE_ANTWORT.test(text) && URL.canParse(url) && new URL(url).pathname.startsWith('/api/')
	);
}

/**
 * Pfad über dem Titel einer Unterseite der Verwaltung (UI-Leitbild, Baustein Pfad): am breiten
 * Bildschirm die Stufen als Links und die aktuelle Seite ohne Link, auf dem Handy nur
 * «‹ <Elternseite>».
 */
export async function pruefePfad(page: Page, stufen: string[], aktuell: string): Promise<void> {
	const pfad = page.getByRole('navigation', { name: 'Pfad' });
	// Unter 60rem Breite (wie das PC-Layout, UI-Leitbild) steht nur der kurze Link.
	if ((page.viewportSize()?.width ?? 1280) < 960) {
		await expect(pfad).toBeHidden();
		await expect(
			page.getByRole('main').getByRole('link', { name: `‹ ${stufen.at(-1)}`, exact: true })
		).toBeVisible();
		return;
	}
	await expect(pfad.getByRole('link')).toHaveText(stufen);
	await expect(pfad.locator('[aria-current="page"]')).toHaveText(aktuell);
}

/**
 * Wählt die Aktion `name` einer Tabellenzeile der Verwaltung (UI-Leitbild, Baustein Tabelle): Hat
 * die Zeile die Taste «Ändern» (ab drei Aktionen), über den Dialog «Ändern», sonst direkt.
 */
export async function waehleAktion(page: Page, zeile: Locator, name: string): Promise<void> {
	const aendern = zeile.getByRole('button', { name: 'Ändern', exact: true });
	// Erst zählen, wenn die Zeile mit ihren Tasten steht.
	await expect(zeile.getByRole('button').first()).toBeVisible();
	if ((await aendern.count()) === 0) {
		await zeile.getByRole('button', { name, exact: true }).click();
		return;
	}
	await aendern.click();
	const dialog = page.getByRole('dialog', { name: 'Ändern', exact: true });
	await dialog.getByRole('button', { name, exact: true }).click();
	await expect(dialog).toBeHidden();
}

/** Klappt den Aufklappbereich mit dem Titel `titel` auf, falls er zu ist (im Profil anfangs zu). */
export async function klappeAuf(page: Page, titel: string): Promise<void> {
	const klappe = page.locator('details.klappe', {
		has: page.locator('summary', { hasText: titel })
	});
	if ((await klappe.getAttribute('open')) === null) await klappe.locator('summary').click();
	await expect(klappe).toHaveAttribute('open', '');
}

/**
 * Wartet, bis die Reiter den Code ihrer Seiten fertig vorgeladen haben. Sie laden ihn gleich beim
 * Anzeigen (`data-sveltekit-preload-code="eager"`); ein `page.goto` mitten hinein bricht das
 * Laden ab, und WebKit meldet das als Konsolenfehler («Importing a module script failed»).
 * Lädt dieselben Seitenmodule über das App-Modul von SvelteKit: Ein Import derselben Adresse
 * teilt sich das Laden mit dem Vorladen, das Warten endet also genau, wenn alles da ist.
 */
export async function wartetAufVorladen(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const pfade = [...document.querySelectorAll<HTMLAnchorElement>('nav.reiter a[href]')].map(
			(a) => new URL(a.href).pathname
		);
		if (pfade.length === 0) return;
		const eintrag = performance
			.getEntriesByType('resource')
			.find((e) => /\/_app\/immutable\/entry\/app\.[^/]+\.js$/.test(new URL(e.name).pathname));
		if (!eintrag) throw new Error('App-Modul von SvelteKit nicht gefunden');
		// dictionary: Route → [Seite, Layouts]; negative Nummern stehen für Seiten mit Server-Load (~n).
		const app = (await import(eintrag.name)) as {
			nodes: (() => Promise<unknown>)[];
			dictionary: Record<string, [number, (number | undefined)[]?]>;
		};
		const nummern = pfade.flatMap((pfad) => {
			const route = app.dictionary[pfad];
			if (!route) throw new Error(`Route ${pfad} nicht im App-Modul`);
			const [seite, layouts = []] = route;
			return [seite, ...layouts].filter((n) => n !== undefined).map((n) => (n < 0 ? ~n : n));
		});
		await Promise.all(nummern.map((n) => app.nodes[n]()));
	});
}

// WebKit: Für den Screenshot legt Playwright ein eigenes Stylesheet an (Quelle
// web-inspector://), das an der CSP der App scheitert. Nur während des Screenshots ignoriert.
const SCREENSHOT_STIL = /^Refused to apply a stylesheet because its hash/;
const screenshotLaeuft = new WeakSet<Page>();

/** Sammelt Konsolenfehler und Skriptfehler der Seite; fängt u. a. CSP-Verletzungen. */
export function sammleKonsolenfehler(page: Page): string[] {
	const fehler: string[] = [];
	page.on('console', (m) => {
		if (m.type() !== 'error' || istErwarteteApiAntwort(m.text(), m.location().url)) return;
		if (screenshotLaeuft.has(page) && SCREENSHOT_STIL.test(m.text())) return;
		fehler.push(m.text());
	});
	page.on('pageerror', (e) => fehler.push(e.message));
	return fehler;
}

/**
 * Wartet, bis kurze Bewegungen (UI-09) fertig sind: CSS-Übergänge wie das Einblenden der
 * Rückfrage und Seitenwechsel. Mitten im Einblenden misst axe sonst zu wenig Kontrast.
 * Die Anleitung (CSS-Animationen, mehrere Sekunden) zählt nicht dazu. Zuerst drei Bilder
 * abwarten: Ein Übergang, den das letzte Scrollen erst auslöst (Titel in der Kopfleiste:
 * Beobachter, dann Svelte, dann Stil), gibt es sonst noch nicht, wenn gesammelt wird.
 */
async function wartetAufRuhe(page: Page): Promise<void> {
	await page.evaluate(async () => {
		for (let i = 0; i < 3; i++) await new Promise((weiter) => requestAnimationFrame(weiter));
	});
	await page.evaluate(() =>
		Promise.all(
			document
				.getAnimations()
				.filter(
					(a) =>
						a instanceof CSSTransition ||
						((a.effect as KeyframeEffect | null)?.pseudoElement ?? '').startsWith(
							'::view-transition'
						)
				)
				.map((a) => a.finished.catch(() => undefined))
		)
	);
}

/**
 * UI-01: jeder Bildschirm ohne axe-Verstösse; dazu ein Screenshot als Nachweis. Am PC scrollt
 * dazu keine Seite zur Seite (UI-Leitbild, Baustein Tabelle: einzeilig, ohne Seitwärtsscrollen).
 */
export async function pruefeBildschirm(page: Page, info: TestInfo, name: string): Promise<void> {
	await wartetAufRuhe(page);
	const axe = await new AxeBuilder({ page }).analyze();
	expect(axe.violations, name).toEqual([]);
	if (info.project.name === 'desktop') {
		const breite = await page.evaluate(() => ({
			seite: document.documentElement.scrollWidth,
			fenster: window.innerWidth
		}));
		expect(breite.seite, `${name}: Seite breiter als das Fenster`).toBeLessThanOrEqual(
			breite.fenster
		);
	}
	screenshotLaeuft.add(page);
	try {
		await rolleAus(page, true);
		await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
		// Eine Runde zur Seite: Konsolenmeldungen aus dem Screenshot sind danach eingetroffen.
		await page.evaluate(() => 0);
	} finally {
		await rolleAus(page, false);
		screenshotLaeuft.delete(page);
	}
}

/**
 * Nur der Rollbereich scrollt (UI-Leitbild); für den Screenshot der ganzen Seite wird er kurz
 * so lang wie sein Inhalt. Über das CSSOM, weil die CSP Stylesheets aus dem Test abweist.
 */
async function rolleAus(page: Page, aus: boolean): Promise<void> {
	await page.evaluate((an) => {
		for (const wahl of ['.schale', '.rollbereich']) {
			const el = document.querySelector<HTMLElement>(wahl);
			if (!el) continue;
			el.style.height = an ? 'auto' : '';
			el.style.overflow = an ? 'visible' : '';
		}
	}, aus);
}
