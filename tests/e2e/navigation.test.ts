import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	legeKontoMitBriefCodeAn,
	legeOffenenAnlassAn,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// Übersichtliche Navigation (#69, UI-Leitbild «Feste Ordnung»): Reiter Start · CM · Profil auf
// allen Seiten nach dem Login, Zurück-Link mit Ziel, Reiter CM, Pfad in der Verwaltung.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

/** Erfundenes Mitglied meldet sich mit Brief-Code an, wie vom Symbol auf dem Startbildschirm. */
async function meldeAn(page: Page, vorname: string) {
	const konto = await legeKontoMitBriefCodeAn(vorname);
	await startetVomSymbol(page);
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${vorname}` })).toBeVisible();
	await wartetAufVorladen(page);
	return konto;
}

const reiterleiste = (page: Page) => page.getByRole('navigation', { name: 'Hauptnavigation' });
const reiter = (page: Page, name: 'Start' | 'CM' | 'Profil') =>
	reiterleiste(page).getByRole('link', { name, exact: true });

test.describe('Mitglieder-App', () => {
	test.skip(({ isMobile }) => !isMobile, 'nur Handy'); // skip: Die Reiter unten sind fürs Handy; am PC stehen sie in der Kopfleiste, das prüft bewegung.test.ts

	test('#69: drei Reiter Start · CM · Profil', async ({ page }) => {
		await meldeAn(page, 'Nora');
		await expect(reiterleiste(page).getByRole('link')).toHaveText(['Start', 'CM', 'Profil']);
	});

	test('#69: Reiter stehen auf Unterseiten, der Bereich ist markiert', async ({ page }, info) => {
		const fehler = sammleKonsolenfehler(page);
		const konto = await meldeAn(page, 'Olga');
		await page.goto('/profil/email');
		await expect(reiterleiste(page)).toBeVisible();
		await expect(reiter(page, 'Profil')).toHaveAttribute('aria-current', 'page');
		await pruefeBildschirm(page, info, 'navigation-email-aendern');

		const anlass = await legeOffenenAnlassAn(konto.mitgliedId, 'Probeanlass Navigation');
		await page.goto(`/anlass/${anlass}`);
		await expect(
			page.getByRole('heading', { level: 1, name: 'Probeanlass Navigation' })
		).toBeVisible();
		await expect(reiter(page, 'Start')).toHaveAttribute('aria-current', 'page');
		expect(fehler).toEqual([]);
	});

	test('#69: Reiter nochmals antippen führt zur obersten Seite des Bereichs', async ({ page }) => {
		await meldeAn(page, 'Pia');
		await page.goto('/profil/email');
		await expect(reiter(page, 'Profil')).toBeVisible();
		await reiter(page, 'Profil').click();
		await expect(page).toHaveURL(/\/profil$/);
	});

	test('#69: Hilfe mit Sitzung zeigt die Reiter, Start ist markiert', async ({ page }) => {
		await meldeAn(page, 'Rita');
		await page.getByRole('contentinfo').getByRole('link', { name: 'Hilfe' }).click();
		await expect(page).toHaveURL(/\/hilfe$/);
		await expect(reiter(page, 'Start')).toHaveAttribute('aria-current', 'page');
	});

	test('#69: Hilfe ohne Sitzung zeigt keine Reiter und führt zum Anmelden', async ({ page }) => {
		await startetVomSymbol(page);
		await page.goto('/hilfe');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(reiterleiste(page)).toHaveCount(0);
		await page.getByRole('link', { name: '‹ Anmelden' }).click();
		await expect(page).toHaveURL(/\/login$/);
	});
});
