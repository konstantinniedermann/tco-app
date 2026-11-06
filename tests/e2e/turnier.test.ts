import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import {
	holeMailCode,
	legeCmMitBriefCodeAn,
	loescheTurnier,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';

// Alle Browser kommen von 127.0.0.1 an denselben Server (Grenzen pro IP). Jeder Test braucht
// darum nur die nötigen Anfragen: ein Brief-Login, ein Code für die Verwaltung.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

type Konto = Awaited<ReturnType<typeof legeCmMitBriefCodeAn>>;

// Pro Jahr gibt es ein Turnier; jedes Projekt hat sein festes Jahr, damit parallele Läufe sich
// nicht in die Quere kommen. Das Turnier aus `make seed` liegt in 2027.
const TESTJAHR: Record<string, number> = { iphone: 2099, android: 2098, desktop: 2097 };

function testjahr(info: TestInfo): number {
	const jahr = TESTJAHR[info.project.name];
	if (!jahr) throw new Error(`Kein Testjahr für das Projekt ${info.project.name}`);
	return jahr;
}

async function meldeAn(page: Page, konto: Konto) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
}

/** Wie `bestaetige` in verwaltung.test.ts; ein Konto nur mit CM landet bei den Turnieren. */
async function bestaetigeCm(page: Page, konto: Konto) {
	await expect(page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' })).toBeVisible();
	await page.getByRole('button', { name: 'Code schicken' }).click();
	const code = await holeMailCode(konto.email);
	await page.getByLabel('Code aus der Mail').fill(code);
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page).toHaveURL(/\/verwaltung\/turniere$/);
	// Erst weiter, wenn die Liste steht: ein folgendes page.goto bricht sonst die laufende
	// Zugangsprüfung ab, und WebKit unter Linux meldet das als Konsolenfehler.
	await expect(page.getByRole('heading', { level: 1, name: 'Clubmeisterschaft' })).toBeVisible();
}

const seitenleiste = (page: Page) => page.getByRole('navigation', { name: 'Verwaltung' });

test('RR-07, A-ROLLE-07, A-TURNIER-01, A-TURNIER-02, A-TURNIER-03, A-ANMELDUNG-07: CM legt Turnier und Kategorien an, öffnet und schliesst die Anmeldung', async ({
	page
}, info) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const jahr = testjahr(info);
	const name = `Clubmeisterschaft ${jahr}`;
	await loescheTurnier(jahr);
	const cm = await legeCmMitBriefCodeAn('Cora');
	await meldeAn(page, cm);

	// RR-07: die CM sieht die Kachel; die Bestätigung führt zu den Turnieren, nicht zu den Mitgliedern.
	await page.getByRole('link', { name: 'Verwaltung' }).click();
	await expect(page).toHaveURL(/\/verwaltung\/bestaetigen$/);
	await bestaetigeCm(page, cm);
	await expect(seitenleiste(page).getByRole('link', { name: 'Turniere' })).toBeVisible();
	await expect(seitenleiste(page).getByRole('link', { name: 'Mitglieder' })).toHaveCount(0);

	// A-TURNIER-01, A-TURNIER-02: Turnier mit Anmeldeschluss und einer Turniernummer anlegen.
	await page.getByRole('link', { name: 'Neues Turnier' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Neues Turnier' })).toBeVisible();
	await page.getByLabel('Jahr').fill(String(jahr));
	await expect(page.getByLabel('Name')).toHaveValue(name);
	await page.getByLabel('Anmeldeschluss').fill(`${jahr}-05-31`);
	await page.getByRole('button', { name: 'Weitere Turniernummer' }).click();
	await page.getByLabel('Bezeichnung').fill('Gruppenphase');
	await page.getByLabel('Turniernummer', { exact: true }).fill('123456');
	await page.getByRole('button', { name: 'Turnier anlegen' }).click();
	await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
	await expect(page.getByText('in Vorbereitung', { exact: true })).toBeVisible();

	// FR-33: ohne Kategorie lässt sich die Anmeldung nicht öffnen.
	await page.getByRole('button', { name: 'Anmeldung öffnen' }).click();
	await expect(page.getByRole('alert')).toHaveText('Lege zuerst mindestens eine Kategorie an.');

	// A-TURNIER-03: Einzelkategorie mit Klassierungsbereich.
	await page.getByRole('link', { name: 'Neue Kategorie' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Neue Kategorie' })).toBeVisible();
	await page.getByLabel('Name').fill('Herren R1–R6');
	await page.getByLabel('Herren').check();
	await page.getByLabel('von (stärkste)').selectOption('R1');
	await page.getByLabel('bis (schwächste)').selectOption('R6');
	await page.getByRole('button', { name: 'Kategorie anlegen' }).click();
	await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
	await expect(page.getByRole('row', { name: /Herren R1–R6/ })).toContainText('R1–R6');

	// A-TURNIER-03: Doppelkategorie Mixed mit Mindestsumme 9 (vorbelegt).
	await page.getByRole('link', { name: 'Neue Kategorie' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Neue Kategorie' })).toBeVisible();
	await page.getByLabel('Name').fill('Mixed Doppel');
	await page.getByLabel('Doppel').check();
	await page.getByLabel('Mixed (eine Frau und ein Mann)').check();
	await expect(page.getByLabel('Mindestsumme der Klassierungen')).toHaveValue('9');
	await page.getByRole('button', { name: 'Kategorie anlegen' }).click();
	await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
	await expect(page.getByRole('row', { name: /Mixed Doppel/ })).toContainText('Summe ab 9');

	// A-ANMELDUNG-07: öffnen, von Hand schliessen, wieder öffnen (der Schluss von selbst am
	// Anmeldeschluss steht in den Tests zu FR-33).
	await page.getByRole('button', { name: 'Anmeldung öffnen' }).click();
	await expect(page.getByText('Anmeldung offen', { exact: true })).toBeVisible();
	await expect(page.getByText('2 Kategorien', { exact: false })).toBeVisible();
	await pruefeBildschirm(page, info, 'turnier-offen');
	await page.getByRole('button', { name: 'Anmeldung jetzt schliessen' }).click();
	await expect(page.getByText('Anmeldung geschlossen', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Wieder öffnen' }).click();
	await expect(page.getByText('Anmeldung offen', { exact: true })).toBeVisible();

	// A-TURNIER-03, FR-35: Kategorie über die Rückfrage absagen; danach ohne Link mit Plakette.
	await page.getByRole('link', { name: 'Herren R1–R6' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Herren R1–R6' })).toBeVisible();
	await page.getByRole('button', { name: 'Kategorie absagen' }).click();
	const rueckfrage = page.getByRole('dialog', { name: 'Kategorie absagen?' });
	await expect(rueckfrage.getByText('Das lässt sich nicht rückgängig machen.')).toBeVisible();
	await rueckfrage.getByRole('button', { name: 'Absagen', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
	const abgesagt = page.getByRole('row', { name: /Herren R1–R6/ });
	await expect(abgesagt.getByText('abgesagt', { exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Herren R1–R6' })).toHaveCount(0);
	await expect(page.getByText('1 Kategorie', { exact: false })).toBeVisible();

	// Kategorie bearbeiten mit Doppel gewählt (Vergleich mit dem Entwurf).
	await page.getByRole('link', { name: 'Mixed Doppel' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Mixed Doppel' })).toBeVisible();
	await expect(page.getByLabel('Doppel')).toBeChecked();
	await expect(page.getByLabel('Mindestsumme der Klassierungen')).toHaveValue('9');
	await pruefeBildschirm(page, info, 'kategorie-formular');
	expect(fehler).toEqual([]);
});

test('RR-07: cm ohne Admin wird von /verwaltung/mitglieder zu den Turnieren geleitet, auch das Wappen führt dorthin', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const cm = await legeCmMitBriefCodeAn('Dario');
	await meldeAn(page, cm);

	// Lesezeichen auf eine Admin-Seite: zuerst die Bestätigung, danach die Turniere.
	await page.goto('/verwaltung/mitglieder');
	await expect(page).toHaveURL(/\/verwaltung\/bestaetigen$/);
	await bestaetigeCm(page, cm);

	// Bestätigt: dieselbe Admin-Seite führt direkt zu den Turnieren, nie auf eine Fehlerseite.
	await page.goto('/verwaltung/mitglieder');
	await expect(page).toHaveURL(/\/verwaltung\/turniere$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Clubmeisterschaft' })).toBeVisible();
	await page.goto('/verwaltung/anlaesse');
	await expect(page).toHaveURL(/\/verwaltung\/turniere$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Clubmeisterschaft' })).toBeVisible();
	await expect(seitenleiste(page).getByRole('link', { name: 'Mitglieder' })).toHaveCount(0);
	await expect(seitenleiste(page).getByRole('link', { name: 'Rollen' })).toHaveCount(0);

	// Das Wappen führt zur ersten Seite der Verwaltung, für nur `cm` zu den Turnieren.
	await page.getByRole('link', { name: 'Neues Turnier' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Neues Turnier' })).toBeVisible();
	await page.getByRole('link', { name: 'Zur Startseite', exact: true }).click();
	await expect(page).toHaveURL(/\/verwaltung\/turniere$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Clubmeisterschaft' })).toBeVisible();
	await pruefeBildschirm(page, info, 'cm-wappen-turniere');
	expect(fehler).toEqual([]);
});
