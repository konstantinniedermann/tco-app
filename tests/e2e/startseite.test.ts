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

test('Sicherheits-Header auf der Startseite', async ({ request }) => {
	const res = await request.get('/');
	expect(res.headers()['content-security-policy']).toContain("default-src 'self'");
	expect(res.headers()['content-security-policy']).not.toContain("'unsafe-inline'");
	expect(res.headers()['strict-transport-security']).toContain('max-age=31536000');
	expect(res.headers()['x-content-type-options']).toBe('nosniff');
});
