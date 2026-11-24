import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import {
	bestaetigeVerwaltungDirekt,
	legeCmMitBriefCodeAn,
	legeKontoAn,
	legeRollenkontoMitBriefCodeAn,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import { legeOffenenAnlassAn, meldeZumAnlass } from './hilfen/anlass.ts';
import { holeMailCode, warteAufMail } from './hilfen/mail.ts';
import {
	legeOffenesTurnierAn,
	legeTurnierAn,
	meldeZurCmAn,
	setzeSpielerangaben
} from './hilfen/turnier.ts';
import {
	klappeAuf,
	pruefeBildschirm,
	sammleKonsolenfehler,
	wartetAufVorladen
} from './hilfen/seite.ts';
import { MAILPIT_URL } from './hilfen/umgebung.ts';

// Mitteilungen der Verwaltung (FR-42, FR-43). Gesendet wird nur an Mitglieder, die der Test selbst
// anlegt (Empfänger «Kommen» an einem eigenen Anlass): Eine Mitteilung an alle ginge auch an die
// Konten paralleler Tests, die gerade auf ihren Login-Code in Mailpit warten.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

type Konto = Awaited<ReturnType<typeof legeRollenkontoMitBriefCodeAn>>;

async function meldeAn(page: Page, konto: Konto) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	// Die Reiter laden den Code ihrer Seiten vor; ein folgendes page.goto bräche das ab.
	await wartetAufVorladen(page);
}

/** Schickt den Admin-Code, liest ihn aus Mailpit und bestätigt (SI-08); `ziel`: erste Seite. */
async function bestaetige(page: Page, konto: Konto, ziel: RegExp, titel: string) {
	await expect(page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' })).toBeVisible();
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(konto.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page).toHaveURL(ziel);
	// Erst weiter, wenn die Seite steht: ein folgendes page.goto bricht sonst die laufende
	// Zugangsprüfung ab, und WebKit unter Linux meldet das als Konsolenfehler.
	await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();
}

/** Meldet an und öffnet die Verwaltung; `erste`: die Seite, auf der sie landet. */
async function oeffneVerwaltung(
	page: Page,
	konto: Konto,
	erste = { url: /\/verwaltung\/mitglieder$/, titel: 'Mitglieder' }
) {
	await meldeAn(page, konto);
	await page.goto('/verwaltung');
	await bestaetige(page, konto, erste.url, erste.titel);
}

const seitenleiste = (page: Page) => page.getByRole('navigation', { name: 'Verwaltung' });
// Auf der Seite des Anlasses heissen auch dessen Felder «Titel»; darum alles in der Karte.
const neu = (page: Page) => page.getByRole('region', { name: 'Neue Mitteilung' });
const sendenTaste = (page: Page) => neu(page).getByRole('button', { name: 'Senden', exact: true });

/** Zum Anlass über die Links der Verwaltung, wie ein Admin dorthin kommt. */
async function oeffneAnlass(page: Page, titel: string) {
	await seitenleiste(page).getByRole('link', { name: 'Anlässe' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Anlässe' })).toBeVisible();
	await page.getByRole('link', { name: titel, exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();
}

async function oeffneMitteilungen(page: Page) {
	await seitenleiste(page).getByRole('link', { name: 'Mitteilungen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Mitteilungen' })).toBeVisible();
}

/** Wartet auf die Mail an `adresse` und gibt ihren Betreff zurück. */
async function holeBetreff(adresse: string, wartezeitMs = 15_000): Promise<string> {
	const suche = new URL('/api/v1/search', MAILPIT_URL);
	suche.searchParams.set('query', `to:"${adresse}"`);
	const ende = Date.now() + wartezeitMs;
	while (Date.now() < ende) {
		const antwort = await fetch(suche);
		if (antwort.ok) {
			const { messages } = (await antwort.json()) as { messages: { Subject: string }[] };
			if (messages.length > 0) return messages[0].Subject;
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	throw new Error('Keine Mail in Mailpit angekommen');
}

/** Eigener Anlass, auf den genau ein eigenes Mitglied mit «kommt» geantwortet hat. */
async function anlassMitEinemGast(admin: Konto) {
	const titel = `GV ${randomUUID().slice(0, 8)}`;
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	const gast = await legeKontoAn('Hugo', nachname);
	const anlassId = await legeOffenenAnlassAn(admin.mitgliedId, titel);
	await meldeZumAnlass(anlassId, gast.mitgliedId, 'kommt');
	return { titel, anlassId, gast, name: `${nachname}, Hugo` };
}

test('FR-42: Mitglieder-Admin wählt Erinnerung, sieht Vorschau mit Zahl und Namen, sendet nach Rückfrage, Verlauf zeigt den Eintrag', async ({
	page
}, info) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Mona', ['mitglieder']);
	const { titel, gast, name } = await anlassMitEinemGast(admin);

	await oeffneVerwaltung(page, admin);
	await oeffneAnlass(page, titel);
	await expect(page.getByText('Noch keine Mitteilungen verschickt.')).toBeVisible();
	await page.getByRole('button', { name: 'Neue Mitteilung' }).click();
	await neu(page).getByRole('button', { name: 'Erinnerung', exact: true }).click();

	// Die Vorlage ist ausgefüllt, die Erinnerung geht vorgewählt an alle ohne Antwort.
	const betreff = `Erinnerung: ${titel}`;
	await expect(neu(page).getByLabel('Titel')).toHaveValue(betreff);
	await expect(neu(page).getByLabel('Text')).toHaveValue(
		/^GV .*: Bitte melde dich bis .* an oder ab\.$/
	);
	await expect(page.getByText(`${betreff.length} von 50 Zeichen`)).toBeVisible();
	await expect(
		page.getByText(
			'Keine sensiblen Infos wie z. B. Namen, Telefonnummern oder Resultate: Die Mitteilung kann auf dem Sperrbildschirm stehen'
		)
	).toBeVisible();
	await expect(neu(page).getByLabel('Noch keine Antwort')).toBeChecked();
	await expect(neu(page).getByLabel('Push, sonst E-Mail')).toBeChecked();
	await expect(sendenTaste(page)).toBeDisabled();
	await neu(page).getByLabel('Kommen', { exact: true }).check();

	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await expect(page.getByText('1 Mitglied: 0 per Push, 1 per E-Mail')).toBeVisible();
	await klappeAuf(page, 'Namen');
	await expect(neu(page).getByRole('listitem').filter({ hasText: name })).toBeVisible();
	await expect(sendenTaste(page)).toBeEnabled();
	await pruefeBildschirm(page, info, 'mitteilung-vorschau');

	// Eine Änderung nach der Vorschau verwirft sie; Senden geht erst wieder mit neuer Vorschau.
	await neu(page).getByLabel('Push und E-Mail an alle').check();
	await expect(page.getByText('1 Mitglied:')).toHaveCount(0);
	await expect(sendenTaste(page)).toBeDisabled();
	await neu(page).getByLabel('Push, sonst E-Mail').check();
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await expect(page.getByText('1 Mitglied: 0 per Push, 1 per E-Mail')).toBeVisible();

	// Rückfrage: Abbrechen schickt nichts.
	await sendenTaste(page).click();
	const rueckfrage = page.getByRole('dialog', { name: 'Jetzt an 1 Mitglied senden?' });
	await expect(rueckfrage).toBeVisible();
	// Spec A7: Die Rückfrage nennt die Empfänger in Worten.
	await expect(rueckfrage).toContainText('An: Kommen');
	await pruefeBildschirm(page, info, 'mitteilung-rueckfrage');
	await rueckfrage.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(rueckfrage).toBeHidden();
	await sendenTaste(page).click();
	await rueckfrage.getByRole('button', { name: 'Senden' }).click();

	await expect(page.getByText('Gesendet: 0 per Push, 1 per E-Mail.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Neue Mitteilung' })).toBeVisible();
	const zeile = page.getByRole('region', { name: 'Verschickte Mitteilungen' }).getByRole('row');
	await expect(zeile).toHaveCount(2);
	await expect(zeile.nth(1)).toContainText(betreff);
	await expect(zeile.nth(1)).toContainText('Muster, Mona');
	await expect(zeile.nth(1)).toContainText('Kommen');
	await expect(zeile.nth(1)).toContainText('Push, sonst E-Mail');
	await expect(zeile.nth(1)).toContainText('0 per Push, 1 per E-Mail');
	// Spec Ziel 12: keine Namen der Empfänger im Verlauf.
	await expect(zeile.nth(1)).not.toContainText(name);
	// PC: Titel und Text stehen in einer Zeile, die Zeile hat keine Tasten (≤ 48 hoch).
	if (info.project.name === 'desktop') {
		expect((await zeile.nth(1).boundingBox())?.height).toBeLessThanOrEqual(48);
	}
	await pruefeBildschirm(page, info, 'mitteilung-verlauf');

	// DS-05: eine eigene Mail an den Gast, Betreff = Titel.
	expect(await holeBetreff(gast.email)).toBe(betreff);
	expect(fehler).toEqual([]);
});

test('FR-42: Senden-Taste ist während des Sendens gesperrt', async ({ page }) => {
	test.setTimeout(60_000);
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Mona', ['mitglieder']);
	const { titel, gast } = await anlassMitEinemGast(admin);

	await oeffneVerwaltung(page, admin);
	await oeffneAnlass(page, titel);
	await page.getByRole('button', { name: 'Neue Mitteilung' }).click();
	await neu(page).getByRole('button', { name: 'Leer anfangen' }).click();
	await expect(neu(page).getByLabel('Titel')).toHaveValue('');
	await neu(page).getByLabel('Titel').fill('Platz gesperrt');
	await neu(page).getByLabel('Text').fill('Heute bleibt Platz 2 wegen Arbeiten zu.');
	await neu(page).getByLabel('Kommen', { exact: true }).check();
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await expect(page.getByText('1 Mitglied: 0 per Push, 1 per E-Mail')).toBeVisible();

	// Der Server antwortet erst, wenn der Test es erlaubt.
	let freigeben = () => {};
	const freigegeben = new Promise<void>((r) => (freigeben = r));
	let anfragen = 0;
	await page.route('**/api/admin/anlaesse/*/mitteilungen/senden', async (route) => {
		anfragen++;
		await freigegeben;
		await route.continue();
	});

	await sendenTaste(page).click();
	await page
		.getByRole('dialog', { name: 'Jetzt an 1 Mitglied senden?' })
		.getByRole('button', { name: 'Senden' })
		.click();
	const wartet = page.getByRole('button', { name: 'Wird gesendet …' });
	await expect(wartet).toBeDisabled();
	await expect(page.getByText('Das kann bis zu einer Minute dauern.')).toBeVisible();
	await expect(neu(page).getByLabel('Titel')).toBeDisabled();
	await expect(neu(page).getByRole('button', { name: 'Vorschau' })).toBeDisabled();
	await wartet.click({ force: true });
	freigeben();

	await expect(page.getByText('Gesendet: 0 per Push, 1 per E-Mail.')).toBeVisible();
	expect(anfragen).toBe(1);
	expect(await holeBetreff(gast.email)).toBe('Platz gesperrt');
	expect(fehler).toEqual([]);
});

test('FR-42: allgemeine Mitteilung an den Verein', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Mona', ['mitglieder']);
	await oeffneVerwaltung(page, admin);
	await oeffneMitteilungen(page);

	// Ohne Vorlage gleich das leere Formular; Empfänger alle oder eine Rolle (Spec B11).
	await page.getByRole('button', { name: 'Neue Mitteilung' }).click();
	await expect(neu(page).getByLabel('Titel')).toBeFocused();
	await expect(neu(page).getByLabel('Alle aktiven Mitglieder')).toBeChecked();
	await expect(neu(page).getByLabel('Alle mit Rolle CM-Admin')).not.toBeChecked();
	await expect(neu(page).getByLabel('Kommen', { exact: true })).toHaveCount(0);
	await neu(page).getByLabel('Titel').fill('Clubhaus offen');
	await neu(page).getByLabel('Text').fill('Ab Samstag ist das Clubhaus wieder offen.');
	await neu(page).getByLabel('Push und E-Mail an alle').check();
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	// Spec Ziel 11, Weg «an alle»: wer Push hat, bekommt beides.
	await expect(
		page.getByText(/^\d+ Mitglieder: \d+ per Push und E-Mail, \d+ nur per E-Mail/)
	).toBeVisible();
	await pruefeBildschirm(page, info, 'mitteilung-verein-vorschau');

	// Der Versand an alle aktiven Mitglieder ist in verwaltung-schnittstellen.db.test.ts belegt; hier
	// antwortet ein Ersatz, damit keine Mail an Konten paralleler Tests geht.
	// Der erste Versuch scheitert unterwegs: Die Mitteilung kann trotzdem schon draussen sein.
	let anfrage: unknown = null;
	let versuche = 0;
	await page.route('**/api/admin/mitteilungen/senden', async (route) => {
		versuche++;
		anfrage = route.request().postDataJSON();
		if (versuche === 1) {
			await route.fulfill({ status: 502, body: 'Bad Gateway' });
			return;
		}
		await route.fulfill({
			status: 201,
			json: { push: 0, mails: 3, ersatzMails: 0, nichtErreichbar: 1 }
		});
	});
	await sendenTaste(page).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Senden' }).click();
	await expect(neu(page).getByRole('alert')).toContainText(
		'Prüfe den Verlauf, bevor du es erneut versuchst.'
	);
	await sendenTaste(page).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Senden' }).click();
	await expect(
		page.getByText('Gesendet: 0 per Push, 3 per E-Mail, nicht erreichbar: 1.')
	).toBeVisible();
	expect(anfrage).toEqual({
		titel: 'Clubhaus offen',
		text: 'Ab Samstag ist das Clubhaus wieder offen.',
		auswahl: 'alle',
		weg: 'push-und-mail'
	});
	// Nur die vorgetäuschte 502 steht in der Konsole.
	expect(fehler.filter((f) => !/status of 502\b/.test(f))).toEqual([]);
});

test('FR-43: Eingabe während der Vorschau verwirft die späte Antwort, Senden bleibt gesperrt', async ({
	page
}) => {
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeRollenkontoMitBriefCodeAn('Mona', ['mitglieder']);
	await oeffneVerwaltung(page, admin);
	await oeffneMitteilungen(page);
	await page.getByRole('button', { name: 'Neue Mitteilung' }).click();
	await neu(page).getByLabel('Titel').fill('Clubhaus offen');
	await neu(page).getByLabel('Text').fill('Ab Samstag offen.');

	// Die Antwort der Vorschau kommt erst, nachdem der Text schon geändert ist.
	let freigeben = () => {};
	const freigegeben = new Promise<void>((r) => (freigeben = r));
	let angekommen = () => {};
	const unterwegs = new Promise<void>((r) => (angekommen = r));
	await page.route('**/api/admin/mitteilungen/vorschau', async (route) => {
		angekommen();
		await freigegeben;
		await route.continue();
	});
	const antwort = page.waitForResponse('**/api/admin/mitteilungen/vorschau');
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await unterwegs;
	await neu(page).getByLabel('Text').fill('Ab Sonntag offen.');
	freigeben();
	await antwort;
	await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));

	await expect(neu(page).getByText(/^\d+ Mitglied(er)?:/)).toHaveCount(0);
	await expect(sendenTaste(page)).toBeDisabled();
	await expect(page.getByText('Senden geht nach der Vorschau.')).toBeVisible();

	// Eine neue Vorschau gilt; gesendet wird genau, was sie zeigte.
	await page.unroute('**/api/admin/mitteilungen/vorschau');
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await expect(neu(page).getByText(/^\d+ Mitglied(er)?:/)).toBeVisible();
	let anfrage: unknown = null;
	await page.route('**/api/admin/mitteilungen/senden', async (route) => {
		anfrage = route.request().postDataJSON();
		await route.fulfill({
			status: 201,
			json: { push: 0, mails: 1, ersatzMails: 0, nichtErreichbar: 0 }
		});
	});
	await sendenTaste(page).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Senden' }).click();
	await expect(page.getByText('Gesendet: 0 per Push, 1 per E-Mail.')).toBeVisible();
	expect(anfrage).toMatchObject({ titel: 'Clubhaus offen', text: 'Ab Sonntag offen.' });
	expect(fehler).toEqual([]);
});

test('FR-42: MyTCO-Admin sieht nur den Verlauf, ohne «Neue Mitteilung»', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const mytco = await legeRollenkontoMitBriefCodeAn('Theo', ['mytco']);
	const { titel } = await anlassMitEinemGast(mytco);
	await oeffneVerwaltung(page, mytco);
	await oeffneMitteilungen(page);
	await expect(page.getByText('Nur ansehen.')).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: 'Verschickt' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Neue Mitteilung' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'mitteilung-verein-nur-ansehen');

	await oeffneAnlass(page, titel);
	await expect(page.getByRole('heading', { level: 2, name: 'Mitteilungen' })).toBeVisible();
	await expect(page.getByText('Noch keine Mitteilungen verschickt.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Neue Mitteilung' })).toHaveCount(0);
	expect(fehler).toEqual([]);
});

test('FR-42: CM-Admin sieht keinen Bereich Mitteilungen', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const cm = await legeCmMitBriefCodeAn('Dario');
	await oeffneVerwaltung(page, cm, { url: /\/verwaltung\/turniere$/, titel: 'Clubmeisterschaft' });

	// RR-07: die Seite führt zu den Turnieren, die Seitenleiste nennt sie nicht.
	await page.goto('/verwaltung/mitteilungen');
	await expect(page).toHaveURL(/\/verwaltung\/turniere$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Clubmeisterschaft' })).toBeVisible();
	await expect(seitenleiste(page).getByRole('link', { name: 'Mitteilungen' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'mitteilung-cm-ohne-bereich');
	expect(fehler).toEqual([]);
});

/** Meldet mit dem Brief-Code an und bestätigt die Verwaltung direkt, ohne Mail-Code (Budget pro IP). */
async function oeffneVerwaltungDirekt(page: Page, konto: Konto, ziel: string, titel: string) {
	await meldeAn(page, konto);
	await bestaetigeVerwaltungDirekt(konto.kontoId);
	await page.goto(ziel);
	await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();
}

const HERREN: KategorieWerte = {
	name: 'Herren R7–R9',
	geschlecht: 'herren',
	art: 'einzel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: 'R7',
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

/** Erfundener Spieler R8, zur Kategorie `kategorieId` angemeldet. */
async function angemeldeterSpieler(vorname: string, kategorieId: number) {
	const spieler = await legeKontoAn(vorname, `Probe${randomUUID().slice(0, 6)}`);
	await setzeSpielerangaben(spieler.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1988,
		klassierung: 'R8'
	});
	await meldeZurCmAn(kategorieId, spieler.mitgliedId);
	return spieler;
}

test('Spec A6: CM-Admin schickt Mitteilung an die Angemeldeten einer Kategorie', async ({
	page
}, info) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	// Eigenes Turnier mit eigenen Kategorien: Die Mails gehen nur an die zwei eigenen Spieler.
	const {
		turnierId,
		jahr,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([HERREN, MIXED]);
	const spieler = await angemeldeterSpieler('Kurt', kategorieId);
	await angemeldeterSpieler('Kilian', kategorieId);
	const cm = await legeCmMitBriefCodeAn('Dario');
	await oeffneVerwaltungDirekt(
		page,
		cm,
		`/verwaltung/turniere/${turnierId}`,
		`Clubmeisterschaft ${jahr}`
	);

	await expect(page.getByRole('heading', { level: 2, name: 'Mitteilungen' })).toBeVisible();
	await expect(page.getByText('Noch keine Mitteilungen verschickt.')).toBeVisible();
	await page.getByRole('button', { name: 'Neue Mitteilung' }).click();
	await neu(page).getByRole('button', { name: 'Erinnerung', exact: true }).click();

	// Die Erinnerung geht vorgewählt an alle, die spielen dürften und noch nicht angemeldet sind.
	const betreff = `Erinnerung: Clubmeisterschaft ${jahr}`;
	await expect(neu(page).getByLabel('Titel')).toHaveValue(betreff);
	await expect(neu(page).getByLabel('Spielberechtigt, noch nicht angemeldet')).toBeChecked();
	const kategorie = neu(page).getByLabel('Kategorie', { exact: true });
	await expect(kategorie).toHaveValue('');
	await expect(kategorie.getByRole('option')).toHaveText([
		'Alle Kategorien',
		HERREN.name,
		MIXED.name
	]);

	// Spec A6: bei «alle» keine Kategorie; «sucht Partner» nur Doppel, eine Einzel-Wahl fällt weg.
	await neu(page).getByLabel('Alle aktiven Mitglieder').check();
	await expect(kategorie).toBeHidden();
	await neu(page).getByLabel('Angemeldet', { exact: true }).check();
	await kategorie.selectOption({ label: HERREN.name });
	await neu(page).getByLabel('Doppel: sucht Partner').check();
	await expect(kategorie).toHaveValue('');
	await expect(kategorie.getByRole('option')).toHaveText(['Alle Kategorien', MIXED.name]);
	await neu(page).getByLabel('Angemeldet', { exact: true }).check();
	await kategorie.selectOption({ label: HERREN.name });

	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await expect(page.getByText('2 Mitglieder: 0 per Push, 2 per E-Mail')).toBeVisible();
	await expect(sendenTaste(page)).toBeEnabled();
	// Die feste Kopfzeile steht im Ganzseiten-Bild dort, wo gerade gescrollt ist: oben halten.
	await page.evaluate(() => window.scrollTo(0, 0));
	await pruefeBildschirm(page, info, 'mitteilung-turnier-vorschau');

	// Eine andere Kategorie verwirft die Vorschau.
	await kategorie.selectOption({ label: 'Alle Kategorien' });
	await expect(page.getByText('2 Mitglieder:')).toHaveCount(0);
	await expect(sendenTaste(page)).toBeDisabled();
	await kategorie.selectOption({ label: HERREN.name });
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	await expect(page.getByText('2 Mitglieder: 0 per Push, 2 per E-Mail')).toBeVisible();

	await sendenTaste(page).click();
	const rueckfrage = page.getByRole('dialog', { name: 'Jetzt an 2 Mitglieder senden?' });
	// Spec A7: Die Rückfrage nennt Auswahl und Kategorie in Worten.
	await expect(rueckfrage).toContainText(`An: Angemeldet · ${HERREN.name}`);
	await rueckfrage.getByRole('button', { name: 'Senden' }).click();
	await expect(page.getByText('Gesendet: 0 per Push, 2 per E-Mail.')).toBeVisible();
	const zeile = page
		.getByRole('region', { name: 'Verschickte Mitteilungen' })
		.getByRole('row')
		.filter({ hasText: betreff });
	await expect(zeile).toContainText(`Angemeldet · ${HERREN.name}`);
	await expect(zeile).toContainText('0 per Push, 2 per E-Mail');

	// Spec A4: Der Link führt auf die Seite dieses Turniers.
	await warteAufMail(spieler.email, betreff, `/clubmeisterschaft/${turnierId}`);
	expect(fehler).toEqual([]);
});

test('Spec B11: Mitglieder-Admin schickt an eine Rolle (nur Push)', async ({ page }, info) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	// Mindestens ein Lizenz-Admin; nur Push, damit keine Mail an Konten paralleler Tests geht.
	await legeRollenkontoMitBriefCodeAn('Lara', ['lizenz']);
	const admin = await legeRollenkontoMitBriefCodeAn('Mona', ['mitglieder']);
	await oeffneVerwaltungDirekt(page, admin, '/verwaltung/mitteilungen', 'Mitteilungen');

	const titel = `Sitzung ${randomUUID().slice(0, 8)}`;
	await page.getByRole('button', { name: 'Neue Mitteilung' }).click();
	await neu(page).getByLabel('Titel').fill(titel);
	await neu(page).getByLabel('Text').fill('Die Sitzung der Lizenz-Admins ist am Montag.');
	await neu(page).getByLabel('Alle mit Rolle Lizenz-Admin').check();
	await neu(page).getByLabel('Nur Push').check();
	await neu(page).getByRole('button', { name: 'Vorschau' }).click();
	const zahl = neu(page).getByText(/^\d+ Mitglied(er)?:/);
	await expect(zahl).toBeVisible();
	expect(Number(/^(\d+)/.exec((await zahl.textContent()) ?? '')?.[1])).toBeGreaterThanOrEqual(1);
	await pruefeBildschirm(page, info, 'mitteilung-rolle-vorschau');

	await sendenTaste(page).click();
	await expect(page.getByRole('dialog')).toContainText('An: Alle mit Rolle Lizenz-Admin');
	await page.getByRole('dialog').getByRole('button', { name: 'Senden' }).click();
	await expect(page.getByText(/^Gesendet: /)).toBeVisible();
	const zeile = page
		.getByRole('region', { name: 'Verschickte Mitteilungen' })
		.getByRole('row')
		.filter({ hasText: titel });
	await expect(zeile).toContainText('Alle mit Rolle Lizenz-Admin');
	await expect(zeile).toContainText('Nur Push');
	expect(fehler).toEqual([]);
});

test('Spec A2: Turnier in Vorbereitung zeigt statt des Formulars einen Satz', async ({
	page
}, info) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const { turnierId, jahr } = await legeTurnierAn();
	const cm = await legeCmMitBriefCodeAn('Dario');
	await oeffneVerwaltungDirekt(
		page,
		cm,
		`/verwaltung/turniere/${turnierId}`,
		`Clubmeisterschaft ${jahr}`
	);
	await expect(page.getByRole('heading', { level: 2, name: 'Mitteilungen' })).toBeVisible();
	await expect(page.getByText('Mitteilungen gehen, sobald die Anmeldung offen ist.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Neue Mitteilung' })).toHaveCount(0);
	await expect(page.getByText('Noch keine Mitteilungen verschickt.')).toBeVisible();
	await pruefeBildschirm(page, info, 'mitteilung-turnier-vorbereitung');
	expect(fehler).toEqual([]);
});

test('Spec A1: MyTCO-Admin sieht auf der Turnierseite nur den Verlauf', async ({ page }) => {
	const fehler = sammleKonsolenfehler(page);
	// Regel 3: Der MyTCO-Admin liest die Clubmeisterschaft, schickt aber nichts.
	const { turnierId, jahr } = await legeOffenesTurnierAn([HERREN]);
	const mytco = await legeRollenkontoMitBriefCodeAn('Theo', ['mytco']);
	await oeffneVerwaltungDirekt(
		page,
		mytco,
		`/verwaltung/turniere/${turnierId}`,
		`Clubmeisterschaft ${jahr}`
	);
	await expect(page.getByRole('heading', { level: 2, name: 'Mitteilungen' })).toBeVisible();
	await expect(page.getByText('Noch keine Mitteilungen verschickt.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Neue Mitteilung' })).toHaveCount(0);
	expect(fehler).toEqual([]);
});
