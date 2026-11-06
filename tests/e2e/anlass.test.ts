import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import {
	holeMailCode,
	legeAdminMitBriefCodeAn,
	legeKontoMitBriefCodeAn,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import { pruefeBildschirm, sammleKonsolenfehler } from './hilfen/seite.ts';

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

/** Admin öffnet die Verwaltung mit dem Code aus der Mail (SI-08). */
async function oeffneVerwaltung(page: Page, konto: Konto) {
	await meldeAn(page, konto);
	await page.goto('/verwaltung');
	await expect(page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' })).toBeVisible();
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(konto.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Mitglieder' })).toBeVisible();
}

test('A-ANLASS-01, FR-27, FR-29, FR-30: Admin erstellt Anlass, Mitglied meldet sich ab und wieder an, Admin sieht die Antwort', async ({
	page,
	browser,
	baseURL
}, info) => {
	// Langer Ablauf (zwei Geräte, Code per Mail, acht Bildschirmprüfungen): unter WebKit in der
	// CI länger als die üblichen 30 s.
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const admin = await legeAdminMitBriefCodeAn('Greta');
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	const mitglied = await legeKontoMitBriefCodeAn('Hugo', nachname);
	const titel = `Generalversammlung ${randomUUID().slice(0, 8)}`;

	// Admin erstellt den Anlass.
	await oeffneVerwaltung(page, admin);
	await page
		.getByRole('navigation', { name: 'Verwaltung' })
		.getByRole('link', { name: 'Anlässe' })
		.click();
	await expect(page.getByRole('heading', { level: 1, name: 'Anlässe' })).toBeVisible();
	await page.getByRole('link', { name: 'Neuer Anlass' }).click();
	await page.getByRole('button', { name: 'Anlass erstellen' }).click();
	await expect(page.getByText('Bitte einen Titel angeben.')).toBeVisible();
	await page.getByLabel('Titel').fill(titel);
	await page.getByLabel('Beginn').fill('2099-03-19T19:30');
	await page.getByLabel('Ort').fill('Clubhaus, Musterweg 1, Olten');
	await page.getByLabel('Beginn').blur();
	// Annahme K-50: Vorschlag drei Tage vor dem Beginn.
	await expect(page.getByLabel('Anmeldeschluss')).toHaveValue('2099-03-16T23:59');
	await page.getByLabel('Einladung (freiwillig)').fill('Traktanden\n1. Protokoll\n2. Wahlen');
	await pruefeBildschirm(page, info, 'anlass-neu');
	await page.getByRole('button', { name: 'Anlass erstellen' }).click();
	await expect(page).toHaveURL(/\/verwaltung\/anlaesse\/\d+$/);
	await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();
	await expect(page.getByText('Noch keine Antworten.')).toBeVisible();

	// Das Mitglied auf seinem Handy, vom Symbol gestartet (A-HILFE-02).
	const geraet = await browser.newContext({
		baseURL,
		extraHTTPHeaders: { 'x-forwarded-proto': 'http' }
	});
	const seite = await geraet.newPage();
	// WebKit unter Linux bremst Seiten im Hintergrund: Ein Seitenwechsel (View Transition) liefe
	// dort nie zu Ende. Die Seite, mit der der Test gerade arbeitet, steht darum vorn.
	await seite.bringToFront();
	await startetVomSymbol(seite);
	await meldeAn(seite, mitglied);
	await expect(seite.getByRole('heading', { level: 2, name: 'Jetzt aktuell' })).toBeVisible();
	const kachel = seite.getByRole('link', { name: new RegExp(titel) });
	await expect(kachel).toContainText('Donnerstag, 19. März 2099, 19.30 Uhr');
	await expect(kachel).toContainText('Bitte bis Mo, 16. März an- oder abmelden');
	await pruefeBildschirm(seite, info, 'anlass-startseite');
	await kachel.click();

	await expect(seite.getByRole('heading', { level: 1, name: titel })).toBeVisible();
	await expect(seite.getByText('2. Wahlen', { exact: false })).toBeVisible();
	await seite.getByLabel('Ich komme nicht').check();
	await seite.getByLabel('Bemerkung (freiwillig)').fill('Bin in den Ferien.');
	await pruefeBildschirm(seite, info, 'anlass-abmelden');
	await seite.getByRole('button', { name: 'Antwort senden' }).click();
	await expect(seite.getByText('Du kommst nicht', { exact: true })).toBeVisible();
	await expect(seite.getByText('Bin in den Ferien.')).toBeVisible();
	await pruefeBildschirm(seite, info, 'anlass-antwort');

	// FR-29, FR-30: neue Antwort ersetzt die alte, die Bemerkung fällt weg.
	await seite.getByRole('button', { name: 'Antwort ändern' }).click();
	await seite.getByLabel('Ich komme', { exact: true }).check();
	await expect(seite.getByLabel('Bemerkung (freiwillig)')).toBeHidden();
	await seite.getByRole('button', { name: 'Antwort senden' }).click();
	await expect(seite.getByText('Du kommst', { exact: true })).toBeVisible();

	// SI-19: Kalenderdatei über den Link, auch ohne Sitzung, ohne Personendaten.
	const href = await seite.getByRole('link', { name: 'In den Kalender' }).getAttribute('href');
	const fremd = await browser.newContext({
		baseURL,
		extraHTTPHeaders: { 'x-forwarded-proto': 'http' }
	});
	const ics = await fremd.request.get(href!);
	expect(ics.headers()['content-type']).toBe('text/calendar; charset=utf-8');
	const text = await ics.text();
	expect(text).toContain(`SUMMARY:${titel}`);
	expect(text).toContain('DTSTART:20990319T183000Z');
	expect(text).not.toContain('Hugo');
	await fremd.close();

	// FR-32: Der Admin verschiebt den Ort; das Mitglied wird gebeten, die Antwort zu prüfen.
	await page.bringToFront();
	await page.getByLabel('Ort').fill('Halle, Musterweg 2, Olten');
	await page.getByRole('button', { name: 'Angaben speichern' }).click();
	await expect(page.getByText('Gespeichert', { exact: true })).toBeVisible();
	await seite.bringToFront();
	await seite.reload();
	const hinweis = seite.getByRole('status').filter({ hasText: 'Datum oder Ort geändert' });
	await expect(hinweis).toContainText('bitte prüfe deine Antwort');
	await pruefeBildschirm(seite, info, 'anlass-zu-pruefen');
	// Schliesst die Anmeldung inzwischen, sagt die Seite es, statt still nichts zu tun.
	await seite.route('**/api/anlaesse/*/anmeldung', (r) =>
		r.fulfill({ status: 409, json: { fehler: 'geschlossen' } })
	);
	await seite.getByRole('button', { name: 'Antwort stimmt so' }).click();
	await expect(seite.getByRole('alert')).toHaveText('Die Anmeldung ist geschlossen.');
	await expect(seite.getByRole('button', { name: 'Antwort stimmt so' })).toBeHidden();
	await seite.unroute('**/api/anlaesse/*/anmeldung');
	await seite.reload();
	await seite.getByRole('button', { name: 'Antwort stimmt so' }).click();
	await expect(hinweis).toBeHidden();
	await expect(seite.getByText('Du kommst', { exact: true })).toBeVisible();
	await geraet.close();

	// Admin sieht die Antwort.
	await page.bringToFront();
	await page.reload();
	const tabelle = page.getByRole('table');
	await expect(tabelle).toContainText(`${nachname}, Hugo`);
	await expect(tabelle).toContainText('kommt');
	await expect(tabelle).not.toContainText('Bin in den Ferien.');
	await pruefeBildschirm(page, info, 'anlass-verwaltung');
	await page.getByRole('link', { name: '‹ Zurück' }).click();
	await expect(page.getByRole('link', { name: titel })).toBeVisible();
	await pruefeBildschirm(page, info, 'anlass-liste');
	expect(fehler).toEqual([]);
});
