import { randomUUID } from 'node:crypto';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { MELDUNG } from '../../src/lib/login/anmelden.ts';
import { MAILANFRAGE_SCHLUESSEL } from '../../src/lib/login/mailanfrage.ts';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import {
	legeAdminMitBriefCodeAn,
	legeKontoMitBriefCodeAn,
	legeOffenenAnlassAn,
	legeOffenesTurnierAn,
	legeRollenkontoMitBriefCodeAn,
	schliesseLoginHilfen,
	setzeKontaktperson,
	setzeSpielerangaben
} from './hilfen/login.ts';
import { klappeAuf, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// Wächter der Anmeldung (Schritt 15, Anhang E.5 in docs/refactoring-analyse.md): Wohin jede
// geschützte Adresse ohne Sitzung, ohne Rolle oder ohne Bestätigung führt, und was nach einer
// Aktion mit abgelaufener Anmeldung geschieht. Der Test hält das heutige Verhalten fest, auch wo
// Seiten voneinander abweichen (benannte Fälle A bis K); er bleibt durch den Umbau unverändert.
// Kein Test fordert einen Mail-Code an (Grenze je IP und Stunde): Die wartende Mail-Anfrage steht
// direkt im Gerätespeicher. Die Geräte laufen im Browser, nicht vom Symbol: So zeigt das Handy die
// Einstiegsseite, wo die App sie zeigt.

test.describe.configure({ mode: 'parallel', timeout: 90_000 });

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

const handy = (info: TestInfo) => info.project.name !== 'desktop';

/** Die Seiten der Mitglieder-App ausser der Startseite; der Server prüft die Sitzung vor der Nummer. */
const MITGLIEDER_SEITEN = [
	'/profil',
	'/profil/email',
	'/anlass/1',
	'/clubmeisterschaft',
	'/clubmeisterschaft/1',
	'/clubmeisterschaft/1/kategorie/1',
	'/clubmeisterschaft/1/doppel/1',
	'/clubmeisterschaft/1/kontakt'
];

/** Alle 22 Adressen der Verwaltung, Nummern beliebig. */
const VERWALTUNG = [
	'/verwaltung',
	'/verwaltung/anlaesse',
	'/verwaltung/anlaesse/1',
	'/verwaltung/anlaesse/neu',
	'/verwaltung/bestaetigen',
	'/verwaltung/briefe',
	'/verwaltung/einlesen',
	'/verwaltung/fairgate',
	'/verwaltung/mitglieder',
	'/verwaltung/mitglieder/1',
	'/verwaltung/mitglieder/1/auskunft',
	'/verwaltung/mitglieder/neu',
	'/verwaltung/mitteilungen',
	'/verwaltung/rollen',
	'/verwaltung/turniere',
	'/verwaltung/turniere/1',
	'/verwaltung/turniere/1/kategorien/1',
	'/verwaltung/turniere/1/kategorien/neu',
	'/verwaltung/turniere/1/nachrichten',
	'/verwaltung/turniere/1/nachrichten/1',
	'/verwaltung/turniere/neu',
	'/verwaltung/verlauf'
];

const OFFEN: KategorieWerte = {
	name: 'Offen R1–R9',
	geschlecht: 'offen',
	art: 'einzel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: 'R1',
	klassierungBis: 'R9',
	mindestsumme: null
};

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

type Ziel = 'login' | 'login-mail' | 'willkommen' | 'bestaetigen' | { start: string };

/** Wartet, bis die Zielseite steht: Adresse und ihr Titel bzw. ihr Feld. */
async function istAuf(page: Page, ziel: Ziel, von: string) {
	const nachricht = `von ${von}`;
	if (ziel === 'login') {
		await expect(page, nachricht).toHaveURL(/\/login$/);
		await expect(
			page.getByRole('heading', { level: 1, name: 'Anmelden' }),
			nachricht
		).toBeVisible();
	} else if (ziel === 'login-mail') {
		await expect(page, nachricht).toHaveURL(/\/login\/mail$/);
		await expect(page.getByLabel('Code aus der Mail'), nachricht).toBeVisible();
	} else if (ziel === 'willkommen') {
		await expect(page, nachricht).toHaveURL(/\/willkommen$/);
		await expect(
			page.getByRole('heading', { level: 1, name: 'Willkommen bei MyTCO' }),
			nachricht
		).toBeVisible();
	} else if (ziel === 'bestaetigen') {
		await expect(page, nachricht).toHaveURL(/\/verwaltung\/bestaetigen$/);
		await expect(
			page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' }),
			nachricht
		).toBeVisible();
	} else {
		await expect(page, nachricht).toHaveURL(/\/$/);
		await expect(
			page.getByRole('heading', { level: 1, name: `Hoi ${ziel.start}` }),
			nachricht
		).toBeVisible();
	}
}

/** Ruft jede Adresse frisch auf und erwartet dasselbe Ziel. */
async function fuehrtZu(page: Page, adressen: string[], ziel: Ziel) {
	for (const adresse of adressen) {
		await page.goto(adresse);
		await istAuf(page, ziel, adresse);
		// Mit Sitzung laden die Reiter den Code ihrer Seiten vor; ein page.goto bräche das ab.
		if (typeof ziel === 'object' || ziel === 'bestaetigen') await wartetAufVorladen(page);
	}
}

/** Eine höchstens 15 Minuten alte Mail-Anfrage im Gerätespeicher, vor jedem Laden der Seite. */
async function mailAnfrageWartet(page: Page) {
	await page.addInitScript((schluessel) => {
		localStorage.setItem(
			schluessel,
			JSON.stringify({ email: 'wartet@example.org', zeit: Date.now() })
		);
	}, MAILANFRAGE_SCHLUESSEL);
}

/** Dasselbe in der laufenden Seite, ohne neu zu laden. */
async function mailAnfrageWartetJetzt(page: Page) {
	await page.evaluate((schluessel) => {
		localStorage.setItem(
			schluessel,
			JSON.stringify({ email: 'wartet@example.org', zeit: Date.now() })
		);
	}, MAILANFRAGE_SCHLUESSEL);
}

/** Marke am Fenster: Sie verschwindet nur, wenn die App ganz neu lädt (Fall D). */
async function setzeMarke(page: Page) {
	await page.evaluate(() => {
		(window as unknown as { waechterMarke?: boolean }).waechterMarke = true;
	});
}

const hatMarke = (page: Page) =>
	page.evaluate(() => (window as unknown as { waechterMarke?: boolean }).waechterMarke === true);

type Konto = Awaited<ReturnType<typeof legeKontoMitBriefCodeAn>>;

/** Login mit dem Brief-Code direkt auf /login; mit Sitzung zeigt / die Startseite, auch im Browser. */
async function meldeAn(page: Page, konto: Konto) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	await wartetAufVorladen(page);
}

/** Die Anmeldung läuft ab, während die Seite offen steht. */
const meldungLaeuftAb = (page: Page) => page.context().clearCookies();

test.describe('ohne Sitzung (Teil 1)', () => {
	test('die Startseite führt am PC zum Login, auf dem Handy im Browser zur Einstiegsseite', async ({
		page
	}, info) => {
		await fuehrtZu(page, ['/'], handy(info) ? 'willkommen' : 'login');
	});

	test('die Seiten der Mitglieder-App führen zum Login, auch auf dem Handy (Fall F)', async ({
		page
	}) => {
		await fuehrtZu(page, MITGLIEDER_SEITEN, 'login');
	});

	test('die erste Hälfte der Verwaltung führt zum Login', async ({ page }) => {
		await fuehrtZu(page, VERWALTUNG.slice(0, 11), 'login');
	});

	test('die zweite Hälfte der Verwaltung führt zum Login', async ({ page }) => {
		await fuehrtZu(page, VERWALTUNG.slice(11), 'login');
	});

	test('mit wartender Mail-Anfrage führen Startseite und Mitglieder-Seiten zum Feld «Code aus der Mail»', async ({
		page
	}) => {
		await mailAnfrageWartet(page);
		await fuehrtZu(
			page,
			['/', ...MITGLIEDER_SEITEN.filter((a) => a !== '/profil/email')],
			'login-mail'
		);
	});

	test('mit wartender Mail-Anfrage führt /profil/email zum Login (Fall A)', async ({ page }) => {
		await mailAnfrageWartet(page);
		await fuehrtZu(page, ['/profil/email'], 'login');
	});

	test('mit wartender Mail-Anfrage führt die erste Hälfte der Verwaltung zum Login (Fall E)', async ({
		page
	}) => {
		await mailAnfrageWartet(page);
		await fuehrtZu(page, VERWALTUNG.slice(0, 11), 'login');
	});

	test('mit wartender Mail-Anfrage führt die zweite Hälfte der Verwaltung zum Login (Fall E)', async ({
		page
	}) => {
		await mailAnfrageWartet(page);
		await fuehrtZu(page, VERWALTUNG.slice(11), 'login');
	});

	test('ein Anlass ohne Zahl fragt nichts ab und zeigt «gibt es nicht» (Fall H)', async ({
		page
	}) => {
		await page.goto('/anlass/abc');
		await expect(
			page.getByRole('heading', { level: 1, name: 'Anlass nicht gefunden' })
		).toBeVisible();
		await expect(page.getByText('Diesen Anlass gibt es nicht mehr.')).toBeVisible();
		await expect(page).toHaveURL(/\/anlass\/abc$/);
	});

	test('eine CM ohne Zahl führt über die Startseite weiter (Fall H)', async ({ page }, info) => {
		await fuehrtZu(page, ['/clubmeisterschaft/abc'], handy(info) ? 'willkommen' : 'login');
	});
});

test.describe('mit Konto (Teil 2)', () => {
	test('ohne Rolle führt jede Adresse der Verwaltung zur Startseite', async ({ page }) => {
		const konto = await legeKontoMitBriefCodeAn('Wanda');
		await meldeAn(page, konto);
		await fuehrtZu(page, VERWALTUNG, { start: 'Wanda' });
	});

	test('ein Admin ohne Bestätigung landet überall bei «Verwaltung öffnen»', async ({ page }) => {
		const admin = await legeAdminMitBriefCodeAn('Waltraud');
		await meldeAn(page, admin);
		await fuehrtZu(
			page,
			VERWALTUNG.filter((a) => a !== '/verwaltung/bestaetigen'),
			'bestaetigen'
		);
	});

	test('Reiterwechsel nach abgelaufener Anmeldung prüft die Sitzung und führt zum Login', async ({
		page
	}) => {
		const fehler = sammleKonsolenfehler(page);
		const konto = await legeKontoMitBriefCodeAn('Wilma');
		await meldeAn(page, konto);
		await setzeMarke(page);
		await meldungLaeuftAb(page);
		await page
			.getByRole('navigation', { name: 'Hauptnavigation' })
			.getByRole('link', { name: 'Profil' })
			.click();
		await istAuf(page, 'login', 'Reiter Profil');
		expect(await hatMarke(page)).toBe(true);
		expect(fehler).toEqual([]);
	});

	test('Reiterwechsel nach abgelaufener Anmeldung mit wartender Mail-Anfrage führt zum Feld «Code aus der Mail»', async ({
		page
	}) => {
		const fehler = sammleKonsolenfehler(page);
		const konto = await legeKontoMitBriefCodeAn('Wiebke');
		await meldeAn(page, konto);
		await meldungLaeuftAb(page);
		await mailAnfrageWartetJetzt(page);
		await page
			.getByRole('navigation', { name: 'Hauptnavigation' })
			.getByRole('link', { name: 'Profil' })
			.click();
		await istAuf(page, 'login-mail', 'Reiter Profil');
		expect(fehler).toEqual([]);
	});

	test('CM-Seite: «Anmelden» nach abgelaufener Anmeldung führt zum Login, auch mit Mail-Anfrage (Fall C)', async ({
		page
	}) => {
		const fehler = sammleKonsolenfehler(page);
		const { turnierId, jahr } = await legeOffenesTurnierAn([OFFEN]);
		const konto = await legeKontoMitBriefCodeAn('Walter', `Probe${randomUUID().slice(0, 6)}`);
		await setzeSpielerangaben(konto.mitgliedId, {
			geschlecht: 'm',
			jahrgang: 1990,
			klassierung: 'R5'
		});
		await meldeAn(page, konto);
		await page.goto(`/clubmeisterschaft/${turnierId}`);
		await expect(
			page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
		).toBeVisible();
		await setzeMarke(page);
		await meldungLaeuftAb(page);
		await mailAnfrageWartetJetzt(page);
		await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
		await page
			.getByRole('dialog', { name: 'Bevor du dich anmeldest' })
			.getByRole('button', { name: 'Anmelden', exact: true })
			.click();
		await istAuf(page, 'login', 'CM-Seite');
		expect(await hatMarke(page)).toBe(true);
		expect(fehler).toEqual([]);
	});

	test('Doppel-Seite: Partner suchen nach abgelaufener Anmeldung führt zum Login', async ({
		page
	}) => {
		const fehler = sammleKonsolenfehler(page);
		const {
			turnierId,
			kategorieIds: [kategorieId]
		} = await legeOffenesTurnierAn([MIXED]);
		const konto = await legeKontoMitBriefCodeAn('Wally', `Probe${randomUUID().slice(0, 6)}`);
		await setzeSpielerangaben(konto.mitgliedId, {
			geschlecht: 'w',
			jahrgang: 1992,
			klassierung: 'R4'
		});
		await meldeAn(page, konto);
		await page.goto(`/clubmeisterschaft/${turnierId}/doppel/${kategorieId}`);
		await expect(page.getByRole('heading', { level: 1, name: MIXED.name })).toBeVisible();
		await setzeMarke(page);
		await meldungLaeuftAb(page);
		await page.getByLabel('Partner suchen').fill('Pr');
		await istAuf(page, 'login', 'Doppel-Seite');
		expect(await hatMarke(page)).toBe(true);
		expect(fehler).toEqual([]);
	});

	test('Anlass: Antwort senden nach abgelaufener Anmeldung führt zum Login', async ({ page }) => {
		const fehler = sammleKonsolenfehler(page);
		const konto = await legeKontoMitBriefCodeAn('Werner');
		const titel = `Wächterabend ${randomUUID().slice(0, 6)}`;
		const anlassId = await legeOffenenAnlassAn(konto.mitgliedId, titel);
		await meldeAn(page, konto);
		await page.goto(`/anlass/${anlassId}`);
		await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();
		await setzeMarke(page);
		await meldungLaeuftAb(page);
		await page.getByLabel('Ich komme', { exact: true }).check();
		await page.getByRole('button', { name: 'Antwort senden' }).click();
		await istAuf(page, 'login', 'Anlass');
		expect(await hatMarke(page)).toBe(true);
		expect(fehler).toEqual([]);
	});

	test('Gespräch: Senden nach abgelaufener Anmeldung lädt die App ganz neu auf dem Login (Fall D)', async ({
		page
	}, info) => {
		const fehler = sammleKonsolenfehler(page);
		const { turnierId } = await legeOffenesTurnierAn([OFFEN]);
		const cmAdmin = await legeRollenkontoMitBriefCodeAn(
			'Leonie',
			['cm'],
			`Leitung${info.project.name}`
		);
		await setzeKontaktperson(turnierId, cmAdmin.mitgliedId);
		const konto = await legeKontoMitBriefCodeAn('Wendelin', `Probe${randomUUID().slice(0, 6)}`);
		await meldeAn(page, konto);
		await page.goto(`/clubmeisterschaft/${turnierId}/kontakt`);
		await expect(
			page.getByRole('heading', { level: 1, name: 'Frage an die Turnierleitung' })
		).toBeVisible();
		await setzeMarke(page);
		await meldungLaeuftAb(page);
		await page.getByLabel('Deine Nachricht').fill('Gilt die Anmeldung noch?');
		await page.getByRole('button', { name: 'Senden' }).click();
		await istAuf(page, 'login', 'Gespräch');
		expect(await hatMarke(page)).toBe(false);
		expect(fehler).toEqual([]);
	});

	test('Profil: ein Thema der Benachrichtigungen schalten nach abgelaufener Anmeldung führt zum Login', async ({
		page
	}) => {
		const fehler = sammleKonsolenfehler(page);
		const konto = await legeKontoMitBriefCodeAn('Wenke');
		await meldeAn(page, konto);
		await page
			.getByRole('navigation', { name: 'Hauptnavigation' })
			.getByRole('link', { name: 'Profil' })
			.click();
		await expect(page).toHaveURL(/\/profil$/);
		await klappeAuf(page, 'Benachrichtigungen');
		const schalter = page.getByRole('checkbox', { name: 'Anlässe' });
		await expect(schalter).toBeEnabled();
		await setzeMarke(page);
		await meldungLaeuftAb(page);
		await schalter.click();
		await istAuf(page, 'login', 'Benachrichtigungen');
		expect(await hatMarke(page)).toBe(true);
		expect(fehler).toEqual([]);
	});

	test('Profil: Telefon speichern nach abgelaufener Anmeldung bleibt und meldet die Störung (Fall I)', async ({
		page
	}) => {
		const fehler = sammleKonsolenfehler(page);
		const konto = await legeKontoMitBriefCodeAn('Wiltrud');
		await meldeAn(page, konto);
		await page
			.getByRole('navigation', { name: 'Hauptnavigation' })
			.getByRole('link', { name: 'Profil' })
			.click();
		await expect(page).toHaveURL(/\/profil$/);
		await klappeAuf(page, 'Meine Angaben');
		// Die innerste Fläche mit der Angabe «Telefon» trägt ihre Taste «Ändern».
		await page
			.locator('div')
			.filter({ has: page.getByText('Telefon', { exact: true }) })
			.last()
			.getByRole('button', { name: 'Ändern' })
			.click();
		await page.getByLabel('Telefon (freiwillig)').fill('+41 00 000 00 09');
		await meldungLaeuftAb(page);
		await page.getByRole('button', { name: 'Telefon speichern' }).click();
		await expect(page.getByRole('alert').filter({ hasText: MELDUNG.stoerung })).toBeVisible();
		await expect(page).toHaveURL(/\/profil$/);
		expect(fehler).toEqual([]);
	});

	test('Verwaltung öffnen: «Code schicken» nach abgelaufener Anmeldung führt zum Login', async ({
		page
	}) => {
		const fehler = sammleKonsolenfehler(page);
		const admin = await legeAdminMitBriefCodeAn('Wolfram');
		await meldeAn(page, admin);
		await page.goto('/verwaltung');
		await istAuf(page, 'bestaetigen', '/verwaltung');
		await wartetAufVorladen(page);
		await meldungLaeuftAb(page);
		await page.getByRole('button', { name: 'Code schicken' }).click();
		await istAuf(page, 'login', 'Verwaltung öffnen');
		expect(fehler).toEqual([]);
	});
});
