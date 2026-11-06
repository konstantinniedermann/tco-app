import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

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

/** Klappt den Aufklappbereich mit dem Titel `titel` auf, falls er zu ist (im Profil anfangs zu). */
export async function klappeAuf(page: Page, titel: string): Promise<void> {
	const klappe = page.locator('details.klappe', {
		has: page.locator('summary', { hasText: titel })
	});
	if ((await klappe.getAttribute('open')) === null) await klappe.locator('summary').click();
	await expect(klappe).toHaveAttribute('open', '');
}

/**
 * Wartet, bis der Browser eine Weile nichts mehr lädt. Die Reiter laden den Code der anderen
 * Seiten gleich beim Anzeigen vor (`data-sveltekit-preload-code="eager"`); ein `page.goto`
 * mitten hinein bricht das Laden ab, und WebKit meldet das als Konsolenfehler («Importing a
 * module script failed»).
 */
export async function wartetAufRuhigesNetz(page: Page, ruheMs = 300): Promise<void> {
	await new Promise<void>((fertig) => {
		const ende = () => {
			page.off('request', neu).off('requestfinished', neu).off('requestfailed', neu);
			fertig();
		};
		let uhr = setTimeout(ende, ruheMs);
		function neu() {
			clearTimeout(uhr);
			uhr = setTimeout(ende, ruheMs);
		}
		page.on('request', neu).on('requestfinished', neu).on('requestfailed', neu);
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
 * Die Anleitung (CSS-Animationen, mehrere Sekunden) zählt nicht dazu.
 */
async function wartetAufRuhe(page: Page): Promise<void> {
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

/** UI-01: jeder Bildschirm ohne axe-Verstösse; dazu ein Screenshot als Nachweis. */
export async function pruefeBildschirm(page: Page, info: TestInfo, name: string): Promise<void> {
	await wartetAufRuhe(page);
	const axe = await new AxeBuilder({ page }).analyze();
	expect(axe.violations, name).toEqual([]);
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
