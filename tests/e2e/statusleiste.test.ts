import { expect, test } from '@playwright/test';

// Statusleisten-Band (UI-Leitbild): fest oben, deckend grün, ausserhalb des App-Rahmens. Den
// Schleier von iOS 26 selbst kann Playwright nicht nachstellen (kein Startbildschirm, kein
// Abstand zur Statusleiste); geprüft wird, dass das Band so gebaut ist, wie iOS es verlangt,
// und dass es ohne Statusleiste nichts verdeckt.
test('Statusleisten-Band: fest, deckend, ausserhalb des App-Rahmens, ohne Statusleiste 0 hoch', async ({
	page
}) => {
	await page.goto('/login');
	const band = page.locator('.statusleiste');
	await expect(band).toHaveCount(1);
	const stil = await band.evaluate((el) => {
		const s = getComputedStyle(el);
		return {
			position: s.position,
			hoehe: el.getBoundingClientRect().height,
			farbe: s.backgroundColor,
			imRahmen: el.closest('.app') !== null
		};
	});
	expect(stil).toEqual({
		position: 'fixed',
		hoehe: 0,
		farbe: 'rgb(15, 107, 79)',
		imRahmen: false
	});
});

// Die Regeln für die App vom Startbildschirm kann Playwright nicht auslösen (kein
// display-mode standalone); geprüft wird, dass sie im ausgelieferten Stil stehen und dass ohne
// sie (Browser, Mockups) der helle Seitenhintergrund bleibt. Am iPhone bestätigt.
test('Statusleisten-Band: in der App vom Startbildschirm höher und grüner Seitenhintergrund', async ({
	page
}) => {
	await page.goto('/login');
	const regeln = await page.evaluate(() => {
		const gefunden: string[] = [];
		for (const blatt of Array.from(document.styleSheets)) {
			for (const regel of Array.from(blatt.cssRules)) {
				if (regel instanceof CSSMediaRule && regel.conditionText.includes('standalone')) {
					gefunden.push(regel.cssText.replace(/\s+/g, ' '));
				}
			}
		}
		return gefunden.join(' ');
	});
	expect(regeln).toContain('.statusleiste');
	expect(regeln).toMatch(/height: calc\(env\(safe-area-inset-top\) \+ var\(--abstand-3\)\)/);
	expect(regeln).toMatch(/html, body \{ background: var\(--farbe-marke\)/);
	const hintergrund = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
	expect(hintergrund).not.toBe('rgb(15, 107, 79)');
});
