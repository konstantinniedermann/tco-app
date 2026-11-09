import { randomUUID } from 'node:crypto';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	antworteAlsLeitung,
	entferneKontaktperson,
	legeKontoMitBriefCodeAn,
	legeOffenesTurnierAn,
	legeRollenkontoMitBriefCodeAn,
	schliesseLoginHilfen,
	schreibeNachricht,
	setzeKontaktperson
} from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// Gespräch mit der Turnierleitung in der Mitglieder-App (A-TURNIER-04, FR-50 bis FR-52).

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

// Pro Jahr gibt es ein Turnier; jeder Test und jedes Projekt hat sein festes Jahr (2039–2046,
// getrennt von den anderen E2E-Dateien). Die E2E-Datenbank überdauert die Läufe.
const JAHR_SCHREIBEN: Record<string, number> = { iphone: 2046, android: 2045 };
const JAHR_OHNE: Record<string, number> = { iphone: 2044, android: 2043 };
const JAHR_NUR_LESEN: Record<string, number> = { iphone: 2042, android: 2041 };
const JAHR_ANTWORT: Record<string, number> = { iphone: 2040, android: 2039 };

function testjahr(jahre: Record<string, number>, info: TestInfo): number {
	const jahr = jahre[info.project.name];
	if (!jahr) throw new Error(`Kein Testjahr für das Projekt ${info.project.name}`);
	return jahr;
}

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

type Konto = Awaited<ReturnType<typeof legeKontoMitBriefCodeAn>>;

async function meldeAn(page: Page, konto: Pick<Konto, 'code' | 'vorname'>) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	// Die Reiter laden den Code ihrer Seiten vor; ein folgendes page.goto bräche das ab.
	await wartetAufVorladen(page);
}

const mitglied = () => legeKontoMitBriefCodeAn('Moritz', `Probe${randomUUID().slice(0, 6)}`);

const fragenKarte = (page: Page) =>
	page.locator('section.karte', {
		has: page.getByRole('heading', { level: 2, name: 'Fragen oder Probleme?' })
	});

test('A-TURNIER-04, FR-50: Mitglied schreibt der Turnierleitung und sieht die eigene Blase', async ({
	page
}, info) => {
	const konsole = sammleKonsolenfehler(page);
	const jahr = testjahr(JAHR_SCHREIBEN, info);
	const { turnierId } = await legeOffenesTurnierAn(jahr, [OFFEN]);
	const leitung = `Leitung${info.project.name}`;
	const cmAdmin = await legeRollenkontoMitBriefCodeAn('Leonie', ['cm'], leitung);
	await setzeKontaktperson(turnierId, cmAdmin.mitgliedId);
	const konto = await mitglied();

	await startetVomSymbol(page);
	await meldeAn(page, konto);
	await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
	await expect(
		page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
	).toBeVisible();

	const karte = fragenKarte(page);
	await expect(karte).toContainText(`Kontaktperson: Leonie ${leitung} (CM-Admin)`);
	await expect(karte.getByText('neue Antwort')).toHaveCount(0);
	await pruefeBildschirm(page, info, 'cm-fragen-karte');
	await karte.getByRole('link', { name: /Schreib der Turnierleitung/ }).click();

	await expect(
		page.getByRole('heading', { level: 1, name: 'Frage an die Turnierleitung' })
	).toBeVisible();
	await expect(page.getByRole('link', { name: `‹ Clubmeisterschaft ${jahr}` })).toBeVisible();
	await expect(page.getByRole('list', { name: 'Verlauf' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'cm-gespraech-leer');

	const frage = 'Kann ich die Gruppenspiele vorziehen?';
	await page.getByLabel('Deine Nachricht').fill(frage);
	await page.getByRole('button', { name: 'Senden' }).click();
	const blase = page.getByRole('listitem').filter({ hasText: frage });
	await expect(blase).toBeVisible();
	await expect(blase.locator('.blase-kopf')).toContainText('Du ·');
	await expect(blase).toHaveClass(/blase-eigen/);
	await expect(page.getByLabel('Deine Nachricht')).toHaveValue('');
	await pruefeBildschirm(page, info, 'cm-gespraech-eigene-blase');

	// UI-06: zu lang geht nicht über das Feld hinaus; leer meldet der Server beim Feld.
	await page.getByRole('button', { name: 'Senden' }).click();
	await expect(page.getByRole('alert')).toBeVisible();
	await expect(page.getByLabel('Deine Nachricht')).toHaveAttribute('aria-invalid', 'true');

	// Die Karte der CM-Seite führt jetzt zum bestehenden Gespräch.
	await page.getByRole('link', { name: `‹ Clubmeisterschaft ${jahr}` }).click();
	await expect(
		fragenKarte(page).getByRole('link', { name: /Schreib der Turnierleitung/ })
	).toBeVisible();
	expect(konsole).toEqual([]);
});

test('A-TURNIER-04, FR-51: ohne Kontaktperson keine Karte, die Kontaktperson selbst ohne Kachel', async ({
	page
}, info) => {
	const jahr = testjahr(JAHR_OHNE, info);
	const { turnierId } = await legeOffenesTurnierAn(jahr, [OFFEN]);
	const konto = await mitglied();
	await startetVomSymbol(page);
	await meldeAn(page, konto);
	await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
	await expect(
		page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
	).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: 'Fragen oder Probleme?' })).toHaveCount(
		0
	);

	// Die Kontaktperson sieht ihren Namen, aber nichts zum Schreiben.
	const leitung = `Leitung${info.project.name}`;
	const cmAdmin = await legeRollenkontoMitBriefCodeAn('Leonie', ['cm'], leitung);
	await setzeKontaktperson(turnierId, cmAdmin.mitgliedId);
	await page.context().clearCookies();
	await page.evaluate(() => window.localStorage.clear());
	await meldeAn(page, cmAdmin);
	await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
	const karte = fragenKarte(page);
	await expect(karte).toContainText(`Kontaktperson: Leonie ${leitung} (CM-Admin)`);
	await expect(karte.getByRole('link')).toHaveCount(0);
	await pruefeBildschirm(page, info, 'cm-fragen-karte-kontaktperson');
});

test('A-TURNIER-04, FR-51: nur lesend, wenn die Kontaktperson fehlt, ohne Feld', async ({
	page
}, info) => {
	const jahr = testjahr(JAHR_NUR_LESEN, info);
	const { turnierId } = await legeOffenesTurnierAn(jahr, [OFFEN]);
	const cmAdmin = await legeRollenkontoMitBriefCodeAn(
		'Leonie',
		['cm'],
		`Leitung${info.project.name}`
	);
	await setzeKontaktperson(turnierId, cmAdmin.mitgliedId);
	const konto = await mitglied();
	const frage = 'Wann ist die Auslosung?';
	await schreibeNachricht(turnierId, konto.mitgliedId, frage);
	await entferneKontaktperson(turnierId);

	await startetVomSymbol(page);
	await meldeAn(page, konto);
	await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
	const karte = fragenKarte(page);
	await expect(karte).not.toContainText('Kontaktperson');
	await karte.getByRole('link', { name: /Dein Gespräch mit der Turnierleitung/ }).click();

	await expect(page.getByRole('listitem').filter({ hasText: frage })).toBeVisible();
	await expect(page.getByText('Schreiben geht zurzeit nicht.')).toBeVisible();
	await expect(page.getByLabel('Deine Nachricht')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Senden' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'cm-gespraech-nur-lesen');
});

test('A-TURNIER-04, FR-52: neue Antwort zeigt Plakette und Kachel, nach dem Öffnen sind sie weg', async ({
	page
}, info) => {
	const jahr = testjahr(JAHR_ANTWORT, info);
	const { turnierId } = await legeOffenesTurnierAn(jahr, [OFFEN]);
	const cmAdmin = await legeRollenkontoMitBriefCodeAn(
		'Leonie',
		['cm'],
		`Leitung${info.project.name}`
	);
	await setzeKontaktperson(turnierId, cmAdmin.mitgliedId);
	const konto = await mitglied();
	await schreibeNachricht(turnierId, konto.mitgliedId, 'Darf ich verschieben?');
	const antwort = 'Ja, melde dich bei deinem Gegner.';
	await antworteAlsLeitung(turnierId, konto.mitgliedId, cmAdmin.mitgliedId, antwort);

	await startetVomSymbol(page);
	await meldeAn(page, konto);
	const startKachel = page.getByRole('link', { name: /Neue Antwort der Turnierleitung/ });
	await expect(startKachel).toContainText(`Clubmeisterschaft ${jahr}`);
	await pruefeBildschirm(page, info, 'start-neue-antwort');

	await page.getByRole('link', { name: new RegExp(`^Clubmeisterschaft ${jahr}`) }).click();
	await expect(fragenKarte(page).getByText('neue Antwort')).toBeVisible();
	await fragenKarte(page)
		.getByRole('link', { name: /Schreib der Turnierleitung/ })
		.click();

	const blase = page.getByRole('listitem').filter({ hasText: antwort });
	await expect(blase).toHaveClass(/blase-leitung/);
	await expect(blase.locator('.blase-kopf')).toContainText('Turnierleitung ·');
	await expect(blase.locator('.plakette')).toHaveText('neu');
	await expect(
		page.getByRole('listitem').filter({ hasText: 'Darf ich verschieben?' }).locator('.plakette')
	).toHaveCount(0);
	await pruefeBildschirm(page, info, 'cm-gespraech-antwort');

	// Die Seite hat die Antwort als gelesen gemeldet: Plakette und Kachel sind weg.
	await page.getByRole('link', { name: `‹ Clubmeisterschaft ${jahr}` }).click();
	await expect(fragenKarte(page)).toBeVisible();
	await expect(fragenKarte(page).getByText('neue Antwort')).toHaveCount(0);
	await page.getByRole('link', { name: 'Start', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	await expect(page.getByRole('link', { name: /Neue Antwort der Turnierleitung/ })).toHaveCount(0);
});
