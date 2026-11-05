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
