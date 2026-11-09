import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	benenneTurnier,
	legeKontoMitBriefCodeAn,
	legeOffenenAnlassAn,
	legeOffenesTurnierAn,
	schliesseLoginHilfen,
	setzeSpielerangaben,
	setzeTelefon
} from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// Übersichtliche Navigation (#69, UI-Leitbild «Feste Ordnung»): Reiter Start · CM · Profil auf
// allen Seiten nach dem Login, Zurück-Link mit Ziel, Reiter CM, Pfad in der Verwaltung.

// Alle Browser kommen von 127.0.0.1 an denselben Server; die Grenze von 10 Code-Anfragen pro IP
// und Stunde gilt für den ganzen Lauf und ist durch Login, Profil und Mitgliedschaft ausgeschöpft.
// Diese Datei fordert darum keinen Code an: Anmeldung per Brief-Code, Mail-Antworten nachgebildet.

const EINZEL: KategorieWerte = {
	name: 'Herren R1–R9',
	geschlecht: 'herren',
	art: 'einzel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: 'R1',
	klassierungBis: 'R9',
	mindestsumme: null
};

const DAMEN: KategorieWerte = { ...EINZEL, name: 'Damen R1–R9', geschlecht: 'damen' };
const DAMEN_2: KategorieWerte = { ...DAMEN, name: 'Damen R1–R6', klassierungBis: 'R6' };
const DAMEN_3: KategorieWerte = { ...DAMEN, name: 'Damen R1–R4', klassierungBis: 'R4' };

type Stand = {
	id: number;
	name: string;
	anmeldeschluss: string;
	status: 'offen';
	anzahl: 0;
	anfragen: 0;
};
const stand = (id: number, name: string): Stand => ({
	id,
	name,
	anmeldeschluss: '2099-05-31',
	status: 'offen',
	anzahl: 0,
	anfragen: 0
});

/**
 * Ersetzt die Liste der laufenden CMs: In der E2E-Datenbank laufen viele Testturniere zugleich
 * (alle Jahre ab heute), «keine» und «eine» liessen sich sonst nicht prüfen.
 */
async function laufendeCms(page: Page, liste: Stand[]) {
	await page.route('**/api/cm', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(liste) })
	);
}

const MIXED: KategorieWerte = {
	name: 'Mixed Doppel',
	geschlecht: 'mixed',
	art: 'doppel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: null,
	klassierungBis: null,
	mindestsumme: 9
};

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

	test('#69: Zurück nennt sein Ziel', async ({ page }) => {
		const konto = await meldeAn(page, 'Sina');
		const anlass = await legeOffenenAnlassAn(konto.mitgliedId, 'Probeanlass Zurück');
		await page.goto(`/anlass/${anlass}`);
		await page.getByRole('link', { name: '‹ Start' }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Hoi Sina' })).toBeVisible();

		await page.goto('/profil/email');
		await page.getByRole('link', { name: '‹ Profil' }).click();
		await expect(page).toHaveURL(/\/profil$/);
	});

	test('#69: Doppel nennt die CM, ein langer Name bleibt einzeilig', async ({ page }, info) => {
		const fehler = sammleKonsolenfehler(page);
		const {
			jahr,
			turnierId,
			kategorieIds: [kategorieId]
		} = await legeOffenesTurnierAn([MIXED]);
		const lang = `Clubmeisterschaft ${jahr} mit einem sehr langen Namen für die Probe am Handy`;
		await benenneTurnier(turnierId, lang);
		const konto = await meldeAn(page, 'Tara');
		await setzeSpielerangaben(konto.mitgliedId, {
			geschlecht: 'w',
			jahrgang: 1992,
			klassierung: 'R4'
		});
		await setzeTelefon(konto.mitgliedId, '079 000 00 69');

		await page.goto(`/clubmeisterschaft/${turnierId}/doppel/${kategorieId}`);
		const zurueck = page.getByRole('link', { name: `‹ ${lang}` });
		await expect(zurueck).toBeVisible();
		// Doppelte Schrift (Systemschriftgrösse): einzeilig, mit «…», nichts ragt seitlich heraus.
		await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
		const masse = await zurueck.evaluate((a) => ({
			hoehe: a.getBoundingClientRect().height,
			zeile: parseFloat(getComputedStyle(a).lineHeight),
			gekuerzt: a.scrollWidth > a.clientWidth
		}));
		expect(masse.hoehe).toBeLessThan(masse.zeile * 1.6);
		expect(masse.gekuerzt).toBe(true);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
		).toBe(true);
		await page.evaluate(() => (document.documentElement.style.fontSize = ''));
		await pruefeBildschirm(page, info, 'navigation-doppel-zurueck');

		await zurueck.click();
		await expect(page.getByRole('heading', { level: 1, name: lang })).toBeVisible();
		expect(fehler).toEqual([]);
	});

	test('#69: Reiter CM ohne laufende CM zeigt den Hinweis', async ({ page }, info) => {
		await meldeAn(page, 'Ursi');
		await laufendeCms(page, []);
		await reiter(page, 'CM').click();
		await expect(page).toHaveURL(/\/clubmeisterschaft$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Clubmeisterschaft' })).toBeVisible();
		await expect(
			page.getByText(
				'Zurzeit läuft keine Clubmeisterschaft. Sobald die Anmeldung offen ist, steht sie hier.',
				{ exact: true }
			)
		).toBeVisible();
		await expect(reiter(page, 'CM')).toHaveAttribute('aria-current', 'page');
		await pruefeBildschirm(page, info, 'navigation-cm-keine');
	});

	test('#69: Reiter CM mit einer CM zeigt sie direkt', async ({ page }) => {
		const fehler = sammleKonsolenfehler(page);
		const { turnierId, jahr } = await legeOffenesTurnierAn([EINZEL]);
		await meldeAn(page, 'Vera');
		await laufendeCms(page, [stand(turnierId, `Clubmeisterschaft ${jahr}`)]);
		await reiter(page, 'CM').click();
		await expect(page).toHaveURL(new RegExp(`/clubmeisterschaft/${turnierId}$`));
		await expect(
			page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
		).toBeVisible();
		await expect(page.locator('a.zurueck')).toHaveCount(0);
		await expect(reiter(page, 'CM')).toHaveAttribute('aria-current', 'page');

		// Nochmals antippen bleibt auf der Seite; die Zurück-Taste führt zur Seite vor dem Tipp.
		await reiter(page, 'CM').click();
		await expect(page).toHaveURL(new RegExp(`/clubmeisterschaft/${turnierId}$`));
		await page.goBack();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Hoi Vera' })).toBeVisible();
		expect(fehler).toEqual([]);
	});

	test('#69: Reiter CM mit mehreren CMs zeigt Kacheln', async ({ page }, info) => {
		const { turnierId, jahr } = await legeOffenesTurnierAn([EINZEL]);
		await meldeAn(page, 'Wanda');
		await laufendeCms(page, [
			stand(turnierId, `Clubmeisterschaft ${jahr}`),
			stand(turnierId + 100000, 'Clubmeisterschaft Erfunden')
		]);
		await reiter(page, 'CM').click();
		await expect(page).toHaveURL(/\/clubmeisterschaft$/);
		await expect(page.locator('main a.kachel')).toHaveCount(2);
		await pruefeBildschirm(page, info, 'navigation-cm-mehrere');
		await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
		await expect(
			page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
		).toBeVisible();
		await page.getByRole('link', { name: '‹ Clubmeisterschaft', exact: true }).click();
		await expect(page).toHaveURL(/\/clubmeisterschaft$/);
	});

	test('#69: Kachel auf Start führt in den Reiter CM', async ({ page }) => {
		const { turnierId, jahr } = await legeOffenesTurnierAn([EINZEL]);
		await laufendeCms(page, [stand(turnierId, `Clubmeisterschaft ${jahr}`)]);
		await meldeAn(page, 'Xenia');
		await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
		await expect(
			page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
		).toBeVisible();
		await expect(reiter(page, 'CM')).toHaveAttribute('aria-current', 'page');
	});

	test('#69: Reiter antippen mit ungespeicherten Änderungen fragt zurück', async ({ page }) => {
		const {
			turnierId,
			kategorieIds: [kategorieId]
		} = await legeOffenesTurnierAn([MIXED]);
		const konto = await meldeAn(page, 'Yara');
		await setzeSpielerangaben(konto.mitgliedId, {
			geschlecht: 'w',
			jahrgang: 1990,
			klassierung: 'R4'
		});
		await setzeTelefon(konto.mitgliedId, '079 000 00 70');
		await page.goto(`/clubmeisterschaft/${turnierId}/doppel/${kategorieId}`);
		await page.getByLabel('Kommentar (freiwillig)').fill('Eher am Wochenende.');
		// Bei offener Tastatur sind die Reiter weg (UI-Leitbild); zuerst die Tastatur schliessen.
		await page.getByLabel('Kommentar (freiwillig)').blur();

		await reiter(page, 'CM').click();
		const rueckfrage = page.getByRole('dialog', {
			name: 'Nicht gespeichert – trotzdem verlassen?'
		});
		await expect(rueckfrage).toBeVisible();
		await rueckfrage.getByRole('button', { name: 'Abbrechen' }).click();
		await expect(page).toHaveURL(new RegExp(`/doppel/${kategorieId}$`));
		await expect(page.getByLabel('Kommentar (freiwillig)')).toHaveValue('Eher am Wochenende.');

		await reiter(page, 'Start').click();
		await expect(rueckfrage).toBeVisible();
		await rueckfrage.getByRole('button', { name: 'Verlassen' }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Hoi Yara' })).toBeVisible();
	});

	test('#69: Anmelden auf der CM-Seite lädt die Seite nicht neu', async ({ page }) => {
		const { turnierId, jahr } = await legeOffenesTurnierAn([EINZEL]);
		const konto = await meldeAn(page, 'Zora');
		await setzeSpielerangaben(konto.mitgliedId, {
			geschlecht: 'm',
			jahrgang: 1990,
			klassierung: 'R5'
		});
		await page.goto(`/clubmeisterschaft/${turnierId}`);
		await expect(
			page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
		).toBeVisible();

		// Nach dem Speichern verfällt nur die vorgeladene Startseite; diese Seite holt weder die
		// Liste der CMs noch ihre Ansicht neu (sonst zeigte eine Störung danach die Fehlerseite).
		const neuGeladen: string[] = [];
		page.on('request', (r) => {
			const pfad = new URL(r.url()).pathname;
			if (pfad === '/api/cm' || pfad === `/api/cm/${turnierId}`) neuGeladen.push(pfad);
		});
		await page
			.locator('div.karte')
			.filter({ has: page.getByText(EINZEL.name, { exact: true }) })
			.getByRole('button', { name: 'Anmelden' })
			.click();
		await page.getByRole('dialog').getByRole('button', { name: 'Anmelden' }).click();
		await expect(page.getByRole('status')).toHaveText(
			`Angemeldet für ${EINZEL.name}. Die Bestätigung kommt per Mail.`
		);
		expect(neuGeladen).toEqual([]);
	});
});

test.describe('am PC', () => {
	test.skip(({ isMobile }) => isMobile, 'nur PC'); // skip: Die Reiter unten am Handy prüft «Mitglieder-App» oben
	test('#69: Reiter in der Kopfleiste auch auf Unterseiten, mit CM', async ({ page }) => {
		await meldeAn(page, 'Ada');
		await page.goto('/profil/email');
		await expect(reiterleiste(page).getByRole('link')).toHaveText(['Start', 'CM', 'Profil']);
		await expect(reiter(page, 'Profil')).toHaveAttribute('aria-current', 'page');
		await reiter(page, 'CM').click();
		await expect(page).toHaveURL(/\/clubmeisterschaft(\/\d+)?$/);
		await expect(reiter(page, 'CM')).toHaveAttribute('aria-current', 'page');
	});

	test('PC: Reiter mit Symbol mittig in der Kopfleiste, aktiver als Pille', async ({
		page
	}, info) => {
		test.skip(info.project.name !== 'desktop', 'nur Desktop'); // skip: Fensterbreite und Mitte sind nur dort fest
		await meldeAn(page, 'Mia');
		await page.goto('/profil');
		await expect(page.locator('nav.reiter a .symbol')).toHaveCount(3);
		for (const symbol of await page.locator('nav.reiter a .symbol').all()) {
			await expect(symbol).toBeVisible();
		}
		const leiste = (await page.locator('nav.reiter').boundingBox())!;
		const kopf = (await page.locator('header.kopf').boundingBox())!;
		const fenster = page.viewportSize()!;
		expect(Math.abs(leiste.x + leiste.width / 2 - fenster.width / 2)).toBeLessThanOrEqual(2);
		expect(leiste.y).toBeGreaterThanOrEqual(kopf.y);
		expect(leiste.y + leiste.height).toBeLessThanOrEqual(kopf.y + kopf.height);
		await expect(reiter(page, 'Profil')).toHaveAttribute('aria-current', 'page');
		const hintergrund = (name: 'Start' | 'Profil') =>
			reiter(page, name).evaluate((a) => getComputedStyle(a).backgroundColor);
		expect(await hintergrund('Profil')).not.toBe(await hintergrund('Start'));
		// Die Gruppe «Wappen + MyTCO» schneidet nichts ab: Fokusrahmen und Tippfläche des Wappens bleiben
		await page.getByRole('link', { name: 'Zur Startseite' }).focus();
		expect(
			await page
				.locator('.kopf-marke')
				.evaluate((e) => [getComputedStyle(e).overflowX, getComputedStyle(e).overflowY])
		).toEqual(['visible', 'visible']);
		await pruefeBildschirm(page, info, 'pc-reiter-kopfleiste');
	});
});

// Titel in der Kopfleiste (UI-Leitbild): erscheint, sobald das <h1> oben aus dem Bild scrollt.
test.describe('Titel in der Kopfleiste', () => {
	const titel = (page: Page) => page.locator('.kopf-titel');
	const sichtbar = (page: Page) => expect(titel(page)).toHaveAttribute('data-sichtbar', '');
	const unsichtbar = (page: Page) => expect(titel(page)).not.toHaveAttribute('data-sichtbar', '');
	// Der Rollbereich scrollt, nicht das Dokument.
	const scrolle = (page: Page, nach: 'unten' | 'oben') =>
		page.locator('.rollbereich').evaluate((e, n) => {
			e.scrollTop = n === 'unten' ? e.scrollHeight : 0;
		}, nach);

	test('Titel blendet beim Scrollen in die Kopfleiste über', async ({ page }) => {
		await meldeAn(page, 'Vera');
		await page.setViewportSize({ width: page.viewportSize()!.width, height: 300 });
		await page.goto('/profil');
		await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
		await unsichtbar(page);
		await scrolle(page, 'unten');
		await sichtbar(page);
		await expect(titel(page)).toHaveText('Profil');
		await expect(titel(page)).toHaveAttribute('aria-hidden', 'true');
		await scrolle(page, 'oben');
		await unsichtbar(page);
	});

	test('Langer Titel in der Kopfleiste bleibt einzeilig', async ({ page }) => {
		const konto = await meldeAn(page, 'Wanda');
		const lang = 'Grillabend mit dem ganzen Verein und allen Freunden auf der Anlage am See'.padEnd(
			80,
			'!'
		);
		expect(lang).toHaveLength(80);
		const anlass = await legeOffenenAnlassAn(konto.mitgliedId, lang);
		await page.setViewportSize({ width: page.viewportSize()!.width, height: 400 });
		await page.goto(`/anlass/${anlass}`);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		const kopf = page.locator('header.kopf');
		const leiste = page.locator('nav.reiter');
		const hoehe = (await kopf.boundingBox())!.height;
		const reiterX = (await leiste.boundingBox())!.x;
		const wappenX = (await page.locator('.kopf-wappen').boundingBox())!.x;
		await scrolle(page, 'unten');
		await sichtbar(page);
		await expect(titel(page)).toHaveText(lang);
		expect((await kopf.boundingBox())!.height).toBe(hoehe);
		expect((await page.locator('.kopf-wappen').boundingBox())!.x).toBe(wappenX);
		const masse = await titel(page).evaluate((e) => ({
			gekuerzt: e.scrollWidth > e.clientWidth,
			hoehe: e.getBoundingClientRect().height,
			zeile: parseFloat(getComputedStyle(e).lineHeight)
		}));
		expect(masse.gekuerzt).toBe(true);
		expect(masse.hoehe).toBeLessThan(masse.zeile * 1.6);
		// Am PC stehen die Reiter oben in der Kopfleiste und bleiben, wo sie sind.
		if (await kopf.locator('nav.reiter').count()) {
			expect((await leiste.boundingBox())!.x).toBe(reiterX);
		}
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
		).toBe(true);
	});

	test('Neuer Titel ohne Seitenwechsel', async ({ page }) => {
		await meldeAn(page, 'Xenia');
		await page.setViewportSize({ width: page.viewportSize()!.width, height: 400 });
		await page.goto('/profil/email');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		// Kein echter Code: die Antwort des Servers ist nachgebildet (Grenze pro IP, s. Kopf).
		await page.route('**/api/profil/email', (route) => route.fulfill({ status: 202, json: {} }));
		await page.getByLabel('Neue E-Mail-Adresse').fill(`neu-${Date.now()}@example.org`);
		await page.getByRole('button', { name: 'Codes senden' }).click();
		await expect(
			page.getByRole('heading', { level: 1, name: 'Zwei Codes eintippen' })
		).toBeVisible();
		await scrolle(page, 'unten');
		await sichtbar(page);
		await expect(titel(page)).toHaveText('Zwei Codes eintippen');
	});

	test('Zurück an gespeicherte Stelle zeigt den Titel sofort', async ({ page }) => {
		// Damen-Kategorien, damit für Yara (w) genug Karten stehen und die Seite hoch ist.
		const { turnierId, jahr } = await legeOffenesTurnierAn([MIXED, DAMEN, DAMEN_2, DAMEN_3]);
		const name = `Clubmeisterschaft ${jahr}`;
		const konto = await meldeAn(page, 'Yara');
		await setzeSpielerangaben(konto.mitgliedId, {
			geschlecht: 'w',
			jahrgang: 1992,
			klassierung: 'R4'
		});
		await setzeTelefon(konto.mitgliedId, '079 000 00 71');
		await page.setViewportSize({ width: page.viewportSize()!.width, height: 250 });
		await page.goto(`/clubmeisterschaft/${turnierId}`);
		await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
		await scrolle(page, 'unten');
		await sichtbar(page);
		// Das <h1> liegt weit über der Kopfleiste (mehr als ein Zurück-Link hoch, der bei mehreren
		// laufenden CMs erscheinen kann), die Prüfung hängt also nicht von diesem Link ab.
		const abstand = await page.evaluate(
			() =>
				document.querySelector('.rollbereich')!.getBoundingClientRect().top -
				document.querySelector('main h1')!.getBoundingClientRect().bottom
		);
		expect(abstand).toBeGreaterThan(100);
		await page.getByRole('link', { name: 'Anmelden' }).click();
		await expect(page).toHaveURL(/\/doppel\//);
		await unsichtbar(page);
		await page.getByRole('link', { name: `‹ ${name}` }).click();
		await expect(page).toHaveURL(new RegExp(`/clubmeisterschaft/${turnierId}$`));
		// ohne erneutes Scrollen
		await sichtbar(page);
		await expect(titel(page)).toHaveText(name);
	});
});
