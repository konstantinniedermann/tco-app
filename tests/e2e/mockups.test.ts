import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const MOCKUPS = new URL('../../docs/ui-mockups/index.html', import.meta.url);

/** Kontrastverhältnis nach WCAG aus zwei CSS-Farben `rgb(r, g, b)`. */
function kontrast(a: string, b: string): number {
	const leuchtdichte = (farbe: string) => {
		const [r, g, bl] = (farbe.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((wert) => {
			const c = Number(wert) / 255;
			return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
	};
	const [hell, dunkel] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x);
	return (hell + 0.05) / (dunkel + 0.05);
}

test('Fokusrahmen ist auch auf grünen Flächen sichtbar (UI-03)', async ({ page }) => {
	await page.goto(`file://${fileURLToPath(MOCKUPS)}`);
	const link = page.locator('.seitenleiste a').first();
	await page.keyboard.press('Tab'); // Tastatur-Modus, damit :focus-visible greift
	await link.focus();
	const farben = await link.evaluate((a) => ({
		sichtbar: a.matches(':focus-visible'),
		rahmen: getComputedStyle(a).outlineColor,
		flaeche: getComputedStyle(a.closest('.seitenleiste') as Element).backgroundColor
	}));
	expect(farben.sichtbar).toBe(true);
	expect(kontrast(farben.rahmen, farben.flaeche)).toBeGreaterThanOrEqual(3);
});
