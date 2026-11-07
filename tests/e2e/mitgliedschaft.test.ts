import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import {
	holeMailCode,
	legeAdminMitBriefCodeAn,
	legeKontoAn,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import { MAILPIT_URL } from './hilfen/umgebung.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// Alle Browser kommen von 127.0.0.1 an denselben Server (Grenzen pro IP): ein Test, je ein
// Brief-Login, ein Admin-Code und eine Code-Anfrage des ausgetretenen Mitglieds.

// Bilder für den Vergleich mit dem Entwurf (#43): nur mit SCREENSHOTS=<Ordner>, nie im normalen Lauf.
const BILDER = process.env.SCREENSHOTS;

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

async function bild(seite: Page | Locator, projekt: string, name: string, ganz = false) {
	if (!BILDER) return;
	mkdirSync(BILDER, { recursive: true });
	const pfad = `${BILDER}/${name}-${projekt}.png`;
	if ('goto' in seite) await seite.screenshot({ path: pfad, fullPage: ganz });
	else await seite.screenshot({ path: pfad });
}

async function mailAnzahl(adresse: string): Promise<number> {
	const suche = new URL('/api/v1/search', MAILPIT_URL);
	suche.searchParams.set('query', `to:"${adresse}"`);
	const antwort = await fetch(suche);
	return ((await antwort.json()) as { messages: unknown[] }).messages.length;
}

test('FR-04: Austritt, Wiedereintritt, Vormerken, Rückgängig und Auskunft in der Verwaltung', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const projekt = info.project.name;
	const admin = await legeAdminMitBriefCodeAn('Ada');
	const ziel = await legeKontoAn('Gerda', `Beispiel${projekt}`);

	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(admin.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Ada' })).toBeVisible();
	await wartetAufVorladen(page);
	await page.goto('/verwaltung');
	await expect(page).toHaveURL(/\/verwaltung\/bestaetigen$/);
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(admin.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Mitglieder' })).toBeVisible();

	await page.goto(`/verwaltung/mitglieder/${ziel.mitgliedId}`);
	const karte = page.getByRole('region', { name: /^Mitgliedschaft/ });
	await expect(karte).toContainText('Aktiv. Kommt der Austritt aus Fairgate');
	await pruefeBildschirm(page, info, 'mitgliedschaft-aktiv');
	await bild(karte, projekt, 'karte-aktiv');

	// Austritt: Rückfrage, dann Plakette und Text mit Löschdatum.
	await karte.getByRole('button', { name: 'Austritt erfassen' }).click();
	const frageAustritt = page.getByRole('dialog', {
		name: 'Austritt von Gerda Beispiel' + projekt + ' erfassen?'
	});
	await expect(frageAustritt).toBeVisible();
	await expect(frageAustritt).toContainText('Ein Wiedereintritt geht bis');
	await pruefeBildschirm(page, info, 'mitgliedschaft-rueckfrage-austritt');
	await bild(page, projekt, 'rueckfrage-austritt');
	await frageAustritt.getByRole('button', { name: 'Austritt erfassen' }).click();
	await expect(karte.getByText('ausgetreten', { exact: true })).toBeVisible();
	await expect(karte).toContainText('Ohne Wiedereintritt löscht MyTCO die Daten am');
	await pruefeBildschirm(page, info, 'mitgliedschaft-ausgetreten');
	await bild(karte, projekt, 'karte-ausgetreten');

	// Das Mitglied fordert einen Code an: dieselbe Rückmeldung wie bei einer unbekannten Adresse.
	// Die Grenze für Code-Anfragen gilt pro IP für den ganzen Lauf über alle drei Projekte (und
	// die Admin-Bestätigung zählt mit): darum fragt nur ein Projekt an.
	if (projekt === 'android') {
		const andere = await page.context().browser()!.newContext(info.project.use);
		const seite2 = await andere.newPage();
		await seite2.goto('/login/mail');
		await seite2.getByLabel('E-Mail-Adresse').fill(ziel.email);
		await seite2.getByRole('button', { name: 'Code schicken' }).click();
		await expect(seite2.getByRole('status')).toHaveText(
			'Falls ein Konto zu dieser Adresse besteht, ist eine Mail unterwegs.'
		);
		// Der Versand liefe nach der Antwort; kurz warten, damit eine Mail sichtbar würde.
		await seite2.waitForTimeout(1500);
		expect(await mailAnzahl(ziel.email)).toBe(0);
		await andere.close();
	}

	// Wiedereintritt.
	await karte.getByRole('button', { name: 'Wiedereintritt erfassen' }).click();
	await expect(karte).toContainText('Aktiv. Kommt der Austritt');
	await expect(karte.getByText('ausgetreten', { exact: true })).toHaveCount(0);

	// Vormerken: Rückfrage, dann «wird gelöscht».
	await karte.getByRole('button', { name: 'Mitglied löschen' }).click();
	const frageLoeschen = page.getByRole('dialog', {
		name: 'Gerda Beispiel' + projekt + ' löschen?'
	});
	await expect(frageLoeschen).toBeVisible();
	await pruefeBildschirm(page, info, 'mitgliedschaft-rueckfrage-loeschen');
	await bild(page, projekt, 'rueckfrage-loeschen');
	await frageLoeschen.getByRole('button', { name: 'Mitglied löschen' }).click();
	await expect(karte.getByText('wird gelöscht', { exact: true })).toBeVisible();
	await expect(karte).toContainText('Zum Löschen vorgemerkt am');
	await pruefeBildschirm(page, info, 'mitgliedschaft-vorgemerkt');
	await bild(karte, projekt, 'karte-vorgemerkt');

	// Rückgängig: wieder aktiv.
	await karte.getByRole('button', { name: 'Löschung rückgängig machen' }).click();
	await expect(karte).toContainText('Aktiv. Kommt der Austritt');
	await expect(karte.getByText('wird gelöscht', { exact: true })).toHaveCount(0);

	// Auskunft.
	await karte.getByRole('link', { name: /Auskunft über die Daten/ }).click();
	await expect(page).toHaveURL(/\/auskunft$/);
	await expect(
		page.getByRole('heading', {
			level: 1,
			name: `Auskunft über die Daten von Gerda Beispiel${projekt}`
		})
	).toBeVisible();
	for (const abschnitt of ['Angaben', 'Mitgliedschaft und Rollen', 'Login und Geräte'])
		await expect(page.getByRole('heading', { level: 2, name: abschnitt })).toBeVisible();
	await pruefeBildschirm(page, info, 'mitgliedschaft-auskunft');
	await bild(page, projekt, 'auskunft', true);

	await page.emulateMedia({ media: 'print' });
	await expect(
		page.getByRole('button', { name: 'Drucken oder als PDF speichern' })
	).not.toBeVisible();
	await expect(page.locator('.reiter')).not.toBeVisible();
	await expect(page.locator('.ansicht-band')).not.toBeVisible();
	await expect(page.locator('.seitenleiste')).not.toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await bild(page, projekt, 'auskunft-druck', true);
	// WebKit meldet beim Screenshot sein eigenes Stylesheet als CSP-Verstoss (siehe hilfen/seite.ts).
	expect(
		BILDER ? fehler.filter((f) => !f.startsWith('Refused to apply a stylesheet')) : fehler
	).toEqual([]);
});
