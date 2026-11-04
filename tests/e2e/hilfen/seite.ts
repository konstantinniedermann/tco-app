import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

// Browser melden jede 4xx-Antwort in der Konsole. Bei den Schnittstellen sind 400 (Code
// falsch), 401 (nicht angemeldet), 403 (kein Admin), 409 (vergeben, letzter Admin) und 429
// (Grenze) Antworten, die die App behandelt.
const ERWARTETE_ANTWORT =
	/^Failed to load resource: the server responded with a status of 4(00|01|03|09|29)\b/;

function istErwarteteApiAntwort(text: string, url: string): boolean {
	// Ohne Ort (leere URL) ist es keine Antwort einer Schnittstelle.
	return (
		ERWARTETE_ANTWORT.test(text) && URL.canParse(url) && new URL(url).pathname.startsWith('/api/')
	);
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

/** UI-01: jeder Bildschirm ohne axe-Verstösse; dazu ein Screenshot als Nachweis. */
export async function pruefeBildschirm(page: Page, info: TestInfo, name: string): Promise<void> {
	const axe = await new AxeBuilder({ page }).analyze();
	expect(axe.violations, name).toEqual([]);
	screenshotLaeuft.add(page);
	try {
		await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
		// Eine Runde zur Seite: Konsolenmeldungen aus dem Screenshot sind danach eingetroffen.
		await page.evaluate(() => 0);
	} finally {
		screenshotLaeuft.delete(page);
	}
}
