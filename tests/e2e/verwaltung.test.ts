import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { MELDUNG } from '../../src/lib/login/anmelden.ts';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import {
	holeMailCode,
	legeAdminMitBriefCodeAn,
	legeKontoMitBriefCodeAn,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';

// Alle Browser kommen von 127.0.0.1 an denselben Server (Grenzen pro IP). Jeder Test braucht
// darum nur die nötigen Anfragen: ein Brief-Login, ein Admin-Code.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

type Konto = Awaited<ReturnType<typeof legeKontoMitBriefCodeAn>>;

async function meldeAn(page: Page, konto: Konto) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
}

/** Schickt den Admin-Code, liest ihn aus Mailpit und bestätigt (SI-08). */
async function bestaetige(page: Page, konto: Konto) {
	await expect(page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' })).toBeVisible();
	await page.getByRole('button', { name: 'Code schicken' }).click();
	const code = await holeMailCode(konto.email);
	await page.getByLabel('Code aus der Mail').fill(code);
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page).toHaveURL(/\/verwaltung\/mitglieder$/);
}

async function oeffneVerwaltung(page: Page, konto: Konto) {
	await meldeAn(page, konto);
	await page.goto('/verwaltung');
	await expect(page).toHaveURL(/\/verwaltung\/bestaetigen$/);
	await bestaetige(page, konto);
}

const seitenleiste = (page: Page) => page.getByRole('navigation', { name: 'Verwaltung' });

test('SI-08, A-MITGLIED-01, A-MITGLIED-02, A-ROLLE-01, A-MITGLIED-06: Admin bestätigt, legt an, bearbeitet, vergibt Rolle, sieht den Verlauf', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeAdminMitBriefCodeAn('Ada');
	await meldeAn(page, admin);

	// RR-07: der Admin sieht die Kachel; ohne Bestätigung führt sie zum Code.
	await page.getByRole('link', { name: 'Verwaltung' }).click();
	await expect(page).toHaveURL(/\/verwaltung\/bestaetigen$/);
	await pruefeBildschirm(page, info, 'verwaltung-bestaetigen');
	await bestaetige(page, admin);

	// A-MITGLIED-01: anlegen; Fehler stehen beim Feld (UI-06).
	const nachname = `Probe${randomUUID().slice(0, 8)}`;
	await page.getByRole('link', { name: 'Mitglied anlegen' }).click();
	await expect(page).toHaveURL(/\/verwaltung\/mitglieder\/neu$/);
	await page.getByLabel('Vorname', { exact: true }).fill('Erika');
	await page.getByLabel('Nachname', { exact: true }).fill(nachname);
	await page.getByLabel('Strasse', { exact: true }).fill('Erfundenweg 7');
	await page.getByLabel('PLZ', { exact: true }).fill('12');
	await page.getByLabel('Ort', { exact: true }).fill('Olten');
	await page.getByLabel('E-Mail', { exact: true }).fill(`neu-${randomUUID()}@example.org`);
	await page.getByRole('button', { name: 'Mitglied anlegen' }).click();
	const plz = page.getByLabel('PLZ', { exact: true });
	await expect(page.getByText('4 Ziffern')).toBeVisible();
	await expect(plz).toHaveAccessibleDescription(/4 Ziffern/);
	await pruefeBildschirm(page, info, 'verwaltung-neu-fehler');
	await plz.fill('4600');
	await page.getByRole('button', { name: 'Mitglied anlegen' }).click();

	// A-MITGLIED-02: Seite des Mitglieds, Angaben ändern.
	await expect(page).toHaveURL(/\/verwaltung\/mitglieder\/\d+$/);
	await expect(
		page.getByRole('heading', { level: 1, name: new RegExp(`${nachname}, Erika`) })
	).toBeVisible();
	const speichern = page.getByRole('button', { name: 'Angaben speichern' });
	await expect(speichern).toBeDisabled();
	await page.getByLabel('Telefon', { exact: false }).fill('+41 00 000 00 00');
	await expect(speichern).toBeEnabled();
	await speichern.click();
	await expect(page.getByText('Gespeichert', { exact: true })).toBeVisible();
	await expect(speichern).toBeDisabled();
	// Nur Leerzeichen geändert: der Server bereinigt, die Rückmeldung kommt trotzdem.
	await page.getByLabel('Ort', { exact: true }).fill('Olten  ');
	await speichern.click();
	await expect(page.getByLabel('Ort', { exact: true })).toHaveValue('Olten');
	await expect(page.getByText('Gespeichert', { exact: true })).toBeVisible();
	await expect(speichern).toBeDisabled();

	// A-ROLLE-01: Rolle vergeben. Die Klappe «Rollen» ist zu wie in Mockup 6.
	await page.locator('summary', { hasText: 'Rollen' }).click();
	await page.getByLabel('CM-Verantwortliche').check();
	await page.getByRole('button', { name: 'Rollen speichern' }).click();
	await expect(page.getByText('Rollen gespeichert', { exact: true })).toBeVisible();

	// A-MITGLIED-06 / FR-26: Verlauf ohne Werte.
	const verlauf = page.getByRole('table', { name: 'Verlauf' });
	await expect(verlauf).toContainText('angelegt');
	await expect(verlauf).toContainText('Telefon geändert');
	await expect(verlauf).toContainText('Rolle CM-Verantwortliche vergeben');
	await expect(verlauf).not.toContainText('+41 00 000 00 00');
	await pruefeBildschirm(page, info, 'verwaltung-mitglied');

	await page.getByRole('link', { name: 'Ganzer Verlauf' }).click();
	await expect(page).toHaveURL(/\/verwaltung\/verlauf\?mitglied=\d+$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Änderungsverlauf' })).toBeVisible();
	await expect(page.getByRole('cell', { name: 'Telefon geändert' })).toBeVisible();
	await pruefeBildschirm(page, info, 'verwaltung-verlauf');

	// A-MITGLIED-06: Suche in der Liste.
	await seitenleiste(page).getByRole('link', { name: 'Mitglieder' }).click();
	await page.getByLabel('Suchen').fill(nachname);
	const zeile = page.getByRole('row', { name: new RegExp(nachname) });
	await expect(zeile).toHaveCount(1);
	await expect(zeile).toContainText('ohne Brief');
	await pruefeBildschirm(page, info, 'verwaltung-mitglieder');
	expect(fehler).toEqual([]);
});

test('SI-07: Alle Sitzungen beenden meldet das Mitglied auf seinem Gerät ab', async ({
	page,
	browser,
	baseURL
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeAdminMitBriefCodeAn('Berta');
	const mitglied = await legeKontoMitBriefCodeAn('Carl');

	// Zweites Gerät des Mitglieds: eigener Kontext mit eigener Sitzung.
	const geraet = await browser.newContext({
		baseURL,
		extraHTTPHeaders: { 'x-forwarded-proto': 'http' }
	});
	const seite = await geraet.newPage();
	// Konsolenmeldungen prüft nur die Admin-Seite: WebKit meldet im zweiten Kontext eine CSP-Meldung
	// zu einem eigenen Stylesheet des Browsers.
	await meldeAn(seite, mitglied);

	await oeffneVerwaltung(page, admin);
	await page.goto(`/verwaltung/mitglieder/${mitglied.mitgliedId}`);
	await page.getByRole('button', { name: 'Alle Sitzungen beenden' }).click();
	const rueckfrage = page.getByRole('dialog');
	await expect(rueckfrage).toContainText('Alle Geräte von Carl werden abgemeldet.');
	await pruefeBildschirm(page, info, 'verwaltung-sitzungen-rueckfrage');
	await rueckfrage.getByRole('button', { name: 'Sitzungen beenden' }).click();
	await expect(page.getByText('Alle Sitzungen beendet.', { exact: true })).toBeVisible();

	await seite.reload();
	await expect(seite).toHaveURL(/\/login$/);
	await expect(seite.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();
	await geraet.close();
	expect(fehler, 'Admin').toEqual([]);
});

test('RR-07: Mitglied ohne Rolle sieht keine Kachel und landet bei /verwaltung auf der Startseite', async ({
	page
}) => {
	const fehler = sammleKonsolenfehler(page);
	const mitglied = await legeKontoMitBriefCodeAn('Dora');
	await meldeAn(page, mitglied);
	await expect(page.getByRole('link', { name: 'Verwaltung' })).toHaveCount(0);
	await page.goto('/verwaltung');
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Dora' })).toBeVisible();
	expect(fehler).toEqual([]);
});

test('RR-03: der letzte Admin sieht die Meldung beim Entzug seiner Rolle', async ({
	page
}, info) => {
	// In der gemeinsamen Testdatenbank gibt es weitere Admins; die Antwort des Servers ist hier
	// gestellt. Die Regel selbst prüfen die Datenbanktests (schnittstellen-letzter-admin).
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeAdminMitBriefCodeAn('Emil');
	await oeffneVerwaltung(page, admin);
	await page.goto(`/verwaltung/mitglieder/${admin.mitgliedId}`);
	await page.route('**/api/admin/mitglieder/*/rollen', (route) =>
		route.fulfill({ status: 409, json: { fehler: 'letzter-admin' } })
	);
	await page.locator('summary', { hasText: 'Rollen' }).click();
	await page.getByLabel('Admin', { exact: true }).uncheck();
	await page.getByRole('button', { name: 'Rollen speichern' }).click();
	// Wer sich selbst die Rolle entzieht, wird vorher gefragt; «Abbrechen» schickt nichts.
	const rueckfrage = page.getByRole('dialog', { name: 'Rolle Admin entziehen?' });
	await expect(rueckfrage.getByText('Du verlierst den Zugang zur Verwaltung.')).toBeVisible();
	await rueckfrage.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(rueckfrage).toBeHidden();
	await page.getByRole('button', { name: 'Rollen speichern' }).click();
	await rueckfrage.getByRole('button', { name: 'Rolle entziehen' }).click();
	const meldung = 'Du bist der letzte Admin. Gib zuerst jemand anderem die Rolle Admin.';
	await expect(page.getByText(meldung)).toBeVisible();
	await pruefeBildschirm(page, info, 'verwaltung-letzter-admin');
	expect(fehler).toEqual([]);
});

test('SI-08: falscher Code zeigt die Meldung, «Neuen Code schicken» führt weiter', async ({
	page
}) => {
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeAdminMitBriefCodeAn('Fritz');
	await meldeAn(page, admin);
	await page.goto('/verwaltung');
	await page.getByRole('button', { name: 'Code schicken' }).click();
	const erster = await holeMailCode(admin.email);
	const feld = page.getByLabel('Code aus der Mail');
	await feld.fill(erster === '000000' ? '111111' : '000000');
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page.getByText(MELDUNG.mailFalsch)).toBeVisible();

	await page.getByRole('button', { name: 'Neuen Code schicken' }).click();
	// Die neue Mail trifft kurz nach der Antwort ein; die neueste Mail trägt einen anderen Code.
	let neu = erster;
	for (let i = 0; i < 20 && neu === erster; i++) {
		await page.waitForTimeout(250);
		neu = await holeMailCode(admin.email);
	}
	expect(neu).not.toBe(erster);
	await feld.fill(neu);
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page).toHaveURL(/\/verwaltung\/mitglieder$/);
	expect(fehler).toEqual([]);
});
