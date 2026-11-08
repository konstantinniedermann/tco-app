import { mkdirSync } from 'node:fs';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import {
	holeMailCode,
	legeAdminMitBriefCodeAn,
	legeKontoAn,
	legeRollenkontoMitBriefCodeAn,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import {
	klappeAuf,
	pruefeBildschirm,
	sammleKonsolenfehler,
	wartetAufVorladen
} from './hilfen/seite.ts';

// Seite Einlesen (A-MITGLIED-07, Etappe 2b von #43). Alle Daten erfunden (DS-08); Nummern,
// Adressen und Nachnamen sind je Projekt und Lauf eindeutig, weil die Test-Datenbank bleibt.

const BILDER = process.env.SCREENSHOTS;

// Die Seite Briefe zeigt alle noch nie angemeldeten Mitglieder der Test-Datenbank.
test.describe.configure({ timeout: 90_000 });

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

async function bild(page: Page, projekt: string, name: string) {
	if (!BILDER) return;
	mkdirSync(BILDER, { recursive: true });
	await page.screenshot({ path: `${BILDER}/${name}-${projekt}.png`, fullPage: true });
}

const ohneScreenshotStil = (fehler: string[]) =>
	BILDER ? fehler.filter((f) => !f.startsWith('Refused to apply a stylesheet')) : fehler;

const eindeutig = (info: TestInfo) =>
	`${info.project.name.replace(/[^A-Za-z0-9]/g, '')}${Date.now().toString(36)}`;

async function meldeAdminAn(page: Page, nurMytco = false) {
	const admin = nurMytco
		? await legeRollenkontoMitBriefCodeAn('Mia', ['mytco'])
		: await legeAdminMitBriefCodeAn('Ada');
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(admin.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${admin.vorname}` })).toBeVisible();
	await wartetAufVorladen(page);
	await page.goto('/verwaltung');
	await expect(page).toHaveURL(/\/verwaltung\/bestaetigen$/);
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(admin.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Mitglieder' })).toBeVisible();
}

async function oeffneEinlesen(page: Page) {
	await page.getByRole('link', { name: 'Einlesen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Einlesen' })).toBeVisible();
}

const KOPF = 'mitgliedernummer;vorname;nachname;strasse;plz;ort;email;jahrgang';

async function waehleDatei(page: Page, inhalt: Buffer) {
	await page
		.getByLabel('CSV-Datei')
		.setInputFiles({ name: 'mitglieder.csv', mimeType: 'text/csv', buffer: inhalt });
}

test('A-MITGLIED-07: Einlesen – Vorschau, Rückfrage, Übernahme, Briefe', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	const id = eindeutig(info);
	const nachname = `Einlese${id}`;
	const bestehend = await legeKontoAn('Bea', `Bestand${id}`);
	await meldeAdminAn(page);
	await oeffneEinlesen(page);
	await pruefeBildschirm(page, info, 'einlesen-leer');

	const csv = [
		KOPF,
		`A${id};Anna;${nachname};Erfundenweg 1;4600;Olten;anna-${id}@example.org;1980`,
		`B${id};Beat;${nachname};Erfundenweg 2;4600;Olten;beat-${id}@example.org;`,
		`C${id};Cora;${nachname};Erfundenweg 3;46;Olten;cora-${id}@example.org;`,
		`D${id};Bea;Bestand${id};Erfundenweg 4;4600;Olten;${bestehend.email};`
	].join('\r\n');
	await waehleDatei(page, Buffer.from(`\uFEFF${csv}\r\n`, 'utf8'));

	await expect(page.getByRole('heading', { name: 'Vorschau' })).toBeVisible();
	const zahl = (text: string) => page.locator('.kennzahl').filter({ hasText: text });
	await expect(zahl('neu')).toContainText('2');
	await expect(zahl('fehlerhaft')).toContainText('1');
	await expect(zahl('schon vorhanden')).toContainText('1');
	await expect(page.getByText(`Zeile 4 · Cora ${nachname} · PLZ: 4 Ziffern`)).toBeVisible();
	await klappeAuf(page, 'Schon vorhanden');
	await expect(page.getByText(`Zeile 5 · Bea Bestand${id} · gleiche E-Mail`)).toBeVisible();
	await pruefeBildschirm(page, info, 'einlesen-vorschau');
	await bild(page, info.project.name, 'einlesen-vorschau');

	await page.getByRole('button', { name: '2 Mitglieder anlegen' }).click();
	const dialog = page.getByRole('dialog', { name: '2 Mitglieder anlegen?' });
	await expect(dialog).toBeVisible();
	await pruefeBildschirm(page, info, 'einlesen-rueckfrage');
	// Doppelklick: genau eine Übernahme.
	await dialog.getByRole('button', { name: 'Anlegen' }).dblclick();
	await expect(page.getByRole('status')).toContainText('2 Mitglieder angelegt.');
	await expect(page.getByRole('heading', { name: 'Vorschau' })).toBeHidden();
	await bild(page, info.project.name, 'einlesen-angelegt');

	// Dieselbe Datei nochmals: niemand ist mehr neu.
	await waehleDatei(page, Buffer.from(`\uFEFF${csv}\r\n`, 'utf8'));
	await expect(zahl('neu')).toContainText('0');
	await expect(zahl('schon vorhanden')).toContainText('3');
	await expect(page.getByRole('button', { name: /anlegen$/ })).toHaveCount(0);

	// Die Neuen stehen auf der Seite Briefe, noch ohne Brief.
	await page.getByRole('link', { name: 'Briefe', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Briefe' })).toBeVisible();
	const zeilen = page.getByRole('row').filter({ hasText: nachname });
	await expect(zeilen).toHaveCount(2);
	await expect(zeilen.first()).toContainText('noch kein Brief');

	expect(ohneScreenshotStil(fehler)).toEqual([]);
});

test('A-MITGLIED-07: Vorlage herunterladen, Datei aus Excel ohne UTF-8 wird abgewiesen', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const id = eindeutig(info);
	await meldeAdminAn(page);
	await oeffneEinlesen(page);

	await klappeAuf(page, 'Aufbau der Datei');
	const laden = page.waitForEvent('download');
	await page.getByRole('link', { name: 'Vorlage herunterladen' }).click();
	const vorlage = await laden;
	expect(vorlage.suggestedFilename()).toBe('mytco-einlesen-vorlage.csv');

	// Windows-1252: «ü» als ein Byte, im Browser als UTF-8 gelesen ein Ersatzzeichen.
	const csv = `${KOPF}\r\nW${id};Jürg;Müller${id};Erfundenweg 1;4600;Olten;juerg-${id}@example.org;\r\n`;
	await waehleDatei(page, Buffer.from(csv, 'latin1'));
	await expect(page.getByRole('alert')).toContainText('«CSV UTF-8»');
	await expect(page.getByRole('heading', { name: 'Vorschau' })).toBeHidden();
	await pruefeBildschirm(page, info, 'einlesen-kodierung');

	expect(ohneScreenshotStil(fehler)).toEqual([]);
});

test('RR-07: MyTCO-Admin sieht die Seite ohne Dateiwahl', async ({ page }, info) => {
	const fehler = sammleKonsolenfehler(page);
	await meldeAdminAn(page, true);
	await oeffneEinlesen(page);
	await expect(page.getByText('Nur ansehen.')).toBeVisible();
	await expect(page.getByLabel('CSV-Datei')).toHaveCount(0);
	await klappeAuf(page, 'Aufbau der Datei');
	await expect(page.getByRole('link', { name: 'Vorlage herunterladen' })).toBeVisible();
	await pruefeBildschirm(page, info, 'einlesen-nur-ansehen');
	expect(ohneScreenshotStil(fehler)).toEqual([]);
});
