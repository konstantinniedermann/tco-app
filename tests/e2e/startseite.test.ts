import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };

test('Startseite zeigt die Version, ohne Barrierefreiheits-Verstösse und ohne Konsolenfehler', async ({
	page
}, info) => {
	const fehler: string[] = [];
	page.on('console', (m) => {
		if (m.type() === 'error') fehler.push(m.text());
	});
	page.on('pageerror', (e) => fehler.push(e.message));
	await page.goto('/');
	await expect(page.getByTestId('version')).toHaveText(`Version ${pkg.version}`);
	const axe = await new AxeBuilder({ page }).analyze();
	expect(axe.violations).toEqual([]);
	expect(fehler).toEqual([]); // fängt u. a. CSP-Verletzungen
	await page.screenshot({ path: info.outputPath('startseite.png'), fullPage: true });
});

test('Kopfleiste mit Wappen und MyTCO', async ({ page }) => {
	await page.goto('/');
	const kopf = page.getByRole('banner');
	await expect(kopf).toContainText('MyTCO');
	// Wappen ist Schmuck neben dem Namen: leerer Alternativtext
	const wappen = kopf.locator('img');
	await expect(wappen).toHaveAttribute('alt', '');
	// Bild wurde wirklich geladen und gezeichnet (ungültiges SVG hätte Breite 0)
	expect(
		await wappen.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)
	).toBeGreaterThan(0);
});

test('App-Symbole sind gültige Bilder', async ({ request }) => {
	for (const pfad of ['/wappen.svg', '/favicon.svg']) {
		const res = await request.get(pfad);
		expect(res.status(), pfad).toBe(200);
		// XML verbietet «--» in Kommentaren; sonst zeigt der Browser das SVG nicht an
		for (const kommentar of (await res.text()).match(/<!--([\s\S]*?)-->/g) ?? []) {
			expect(kommentar.slice(4, -3), pfad).not.toContain('--');
		}
	}
});

test('Schrift folgt der Grundgrösse des Geräts (UI-02)', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('meta[name="text-scale"]')).toHaveAttribute('content', 'scale');
	const verhaeltnis = await page.evaluate(
		() =>
			parseFloat(getComputedStyle(document.body).fontSize) /
			parseFloat(getComputedStyle(document.documentElement).fontSize)
	);
	expect(verhaeltnis).toBeCloseTo(1.125, 2);
});

test('Grundschrift mindestens 18 px bei Standardeinstellung (UI-02)', async ({ page }) => {
	await page.goto('/');
	const groesse = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
	expect(groesse).toBeGreaterThanOrEqual(18);
});

test('Bei 200 % Schrift kein waagrechtes Scrollen (UI-02)', async ({ page }, info) => {
	await page.goto('/');
	await page.evaluate(() => {
		document.documentElement.style.fontSize = '200%';
	});
	const breiten = await page.evaluate(() => ({
		inhalt: document.documentElement.scrollWidth,
		fenster: window.innerWidth
	}));
	expect(breiten.inhalt).toBeLessThanOrEqual(breiten.fenster);
	await page.screenshot({ path: info.outputPath('startseite-200.png'), fullPage: true });
});

test('Lange Wörter im Titel werden bei 200 % Schrift getrennt statt abgeschnitten (UI-02)', async ({
	page
}) => {
	await page.goto('/');
	const titel = page.getByRole('heading', { level: 1 });
	await titel.evaluate((h) => {
		document.documentElement.style.fontSize = '200%';
		h.textContent = 'Clubmeisterschaftsanmeldung';
	});
	const breiten = await titel.evaluate((h) => ({ inhalt: h.scrollWidth, sichtbar: h.clientWidth }));
	expect(breiten.inhalt).toBeLessThanOrEqual(breiten.sichtbar);
});

test('Sicherheits-Header auf der Startseite und der Status-Schnittstelle', async ({ request }) => {
	for (const pfad of ['/', '/api/status']) {
		const res = await request.get(pfad);
		expect(res.headers()['strict-transport-security'], pfad).toContain('max-age=31536000');
		expect(res.headers()['x-content-type-options'], pfad).toBe('nosniff');
		expect(res.headers()['referrer-policy'], pfad).toBe('same-origin');
		if (pfad === '/') {
			const csp = res.headers()['content-security-policy'];
			expect(csp).toContain("default-src 'self'");
			expect(csp).toContain("frame-ancestors 'none'");
			expect(csp).toContain("object-src 'none'");
			expect(csp).not.toContain("'unsafe-inline'");
		}
	}
});
