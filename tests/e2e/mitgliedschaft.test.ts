import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import {
	holeMailCode,
	legeAdminMitBriefCodeAn,
	legeEhemaligesAn,
	legeKontoAn,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import { MAILPIT_URL } from './hilfen/umgebung.ts';
import {
	pruefeBildschirm,
	pruefePfad,
	sammleKonsolenfehler,
	wartetAufMitgliederliste,
	wartetAufVorladen
} from './hilfen/seite.ts';

// Alle Browser kommen von 127.0.0.1 an denselben Server (Grenzen pro IP): pro Test ein
// Brief-Login und ein Admin-Code, im ersten dazu eine Code-Anfrage des ausgetretenen Mitglieds.

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

/** Ein Brief-Login und ein Admin-Code: danach steht die Verwaltung offen (MyTCO- und Mitglieder-Admin). */
async function oeffneVerwaltung(page: Page) {
	const admin = await legeAdminMitBriefCodeAn('Ada');
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
	await wartetAufMitgliederliste(page);
	return admin;
}

test('FR-04, A-MITGLIED-03: Austritt, Wiedereintritt, Vormerken, Rückgängig und Auskunft in der Verwaltung', async ({
	page
}, info) => {
	// Langer Ablauf (vier Zustände, sechs Bildschirmprüfungen, Auskunft und Druckansicht): unter
	// WebKit in der CI knapp an den üblichen 30 s.
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const projekt = info.project.name;
	const ziel = await legeKontoAn('Gerda', `Beispiel${projekt}`);
	await oeffneVerwaltung(page);

	await page.goto(`/verwaltung/mitglieder/${ziel.mitgliedId}`);
	const karte = page.getByRole('region', { name: /^Mitgliedschaft/ });
	await expect(karte).toBeVisible();
	await pruefePfad(page, ['Mitglieder'], `Beispiel${projekt}, Gerda`);
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
	// Die Grenze für Code-Anfragen gilt pro IP für den ganzen Lauf über alle drei Projekte (die
	// Admin-Bestätigung zählt nicht mit): darum fragt nur ein Projekt an.
	if (projekt === 'android') {
		const andere = await page.context().browser()!.newContext(info.project.use);
		const seite2 = await andere.newPage();
		await seite2.goto('/login/mail');
		await seite2.getByLabel('E-Mail-Adresse').fill(ziel.email);
		await seite2.getByRole('button', { name: 'Code schicken' }).click();
		await expect(seite2.getByRole('status')).toHaveText(
			'Falls ein Konto zu dieser Adresse besteht, ist eine Mail unterwegs.'
		);
		// Der Versand liefe erst nach der Antwort (SI-04), ein Zeichen für «fertig» gibt es darum
		// nicht: 1,5 s lang darf keine Mail auftauchen; eine auftauchende macht den Test sofort rot.
		// Ohne Frist belegt es login/mailcode.db.test.ts («ausgetreten und vorgemerkt …»).
		await expect(
			expect.poll(() => mailAnzahl(ziel.email), { timeout: 1500 }).toBeGreaterThan(0)
		).rejects.toThrow();
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
	await expect(frageLoeschen).toContainText('Kommende Anmeldungen werden zurückgezogen.');
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

	// Auskunft. Der Link lädt nicht vor: schon das Laden steht im Verlauf.
	const auskunft = karte.getByRole('link', { name: /Auskunft über die Daten/ });
	await expect(auskunft).toHaveAttribute('data-sveltekit-preload-data', 'false');
	await auskunft.click();
	await expect(page).toHaveURL(/\/auskunft$/);
	await expect(
		page.getByRole('heading', {
			level: 1,
			name: `Auskunft über die Daten von Gerda Beispiel${projekt}`
		})
	).toBeVisible();
	// Druckseite ohne Pfad; die Taste nennt das Mitglied (UI-Leitbild, Druckseite).
	await expect(page.getByRole('navigation', { name: 'Pfad' })).toHaveCount(0);
	await expect(
		page.getByRole('link', { name: `‹ Beispiel${projekt}, Gerda`, exact: true })
	).toBeVisible();
	for (const abschnitt of ['Angaben', 'Mitgliedschaft und Rollen', 'Login und Geräte'])
		await expect(page.getByRole('heading', { level: 2, name: abschnitt })).toBeVisible();
	// «Wer» nennt den Admin nicht beim Namen.
	const verlauf = page.getByRole('region', { name: 'Änderungsverlauf' });
	await expect(verlauf).toContainText('Mitgliederverwaltung');
	await expect(verlauf).not.toContainText('Ada');
	await pruefeBildschirm(page, info, 'mitgliedschaft-auskunft');
	await bild(page, projekt, 'auskunft', true);

	await page.emulateMedia({ media: 'print' });
	await expect(
		page.getByRole('button', { name: 'Drucken oder als PDF speichern' })
	).not.toBeVisible();
	await expect(page.locator('.seitenleiste')).not.toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	// Der Inhalt füllt die Seite (kein schmaler Streifen im Raster der Verwaltung).
	const breite = page.viewportSize()!.width;
	const druck = await page.locator('.druckseite').boundingBox();
	expect(druck!.width).toBeGreaterThanOrEqual(breite * 0.8);
	await bild(page, projekt, 'auskunft-druck', true);
	// WebKit meldet beim Screenshot sein eigenes Stylesheet als CSP-Verstoss (siehe hilfen/seite.ts).
	expect(
		BILDER ? fehler.filter((f) => !f.startsWith('Refused to apply a stylesheet')) : fehler
	).toEqual([]);
});

test('RR-08: Wiedereintritt eines Mitglieds mit Admin-Rolle fragt nach, ohne Rolle nicht', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const projekt = info.project.name;
	const name = `Beispiel${projekt}`;
	const mitRolle = await legeEhemaligesAn('Vera', name, 'ausgetreten', ['mitglieder', 'cm']);
	const ohneRolle = await legeEhemaligesAn('Otto', name, 'ausgetreten', []);
	const vorgemerkt = await legeEhemaligesAn('Lena', name, 'vorgemerkt', ['cm']);
	const vorgemerktAusgetreten = await legeEhemaligesAn(
		'Ruth',
		name,
		'vorgemerkt',
		['cm'],
		'ausgetreten'
	);
	await oeffneVerwaltung(page);
	const karte = page.getByRole('region', { name: /^Mitgliedschaft/ });
	const aktiv = 'Aktiv. Kommt der Austritt';

	// Mit Admin-Rolle: Rückfrage; Abbrechen ändert nichts, Weiter erfasst den Wiedereintritt.
	await page.goto(`/verwaltung/mitglieder/${mitRolle.mitgliedId}`);
	await karte.getByRole('button', { name: 'Wiedereintritt erfassen' }).click();
	const frage = page.getByRole('dialog', { name: `Wiedereintritt von Vera ${name} erfassen?` });
	await expect(frage).toBeVisible();
	await expect(frage).toContainText('Vera bekommt die Rollen Mitglieder-Admin, CM-Admin zurück.');
	await pruefeBildschirm(page, info, 'mitgliedschaft-rueckfrage-wiedereintritt');
	await bild(page, projekt, 'rueckfrage-wiedereintritt');
	await frage.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(frage).toBeHidden();
	await expect(karte.getByText('ausgetreten', { exact: true })).toBeVisible();
	await karte.getByRole('button', { name: 'Wiedereintritt erfassen' }).click();
	await frage.getByRole('button', { name: 'Weiter' }).click();
	await expect(karte).toContainText(aktiv);

	// Ohne Rolle: keine Rückfrage, wie bisher.
	await page.goto(`/verwaltung/mitglieder/${ohneRolle.mitgliedId}`);
	await karte.getByRole('button', { name: 'Wiedereintritt erfassen' }).click();
	await expect(karte).toContainText(aktiv);
	await expect(page.getByRole('dialog')).toHaveCount(0);

	// Löschung rückgängig: Rückfrage nur, wenn das Login zurückkommt (vorher aktiv).
	await page.goto(`/verwaltung/mitglieder/${vorgemerkt.mitgliedId}`);
	await karte.getByRole('button', { name: 'Löschung rückgängig machen' }).click();
	const frageZurueck = page.getByRole('dialog', {
		name: `Löschung von Lena ${name} rückgängig machen?`
	});
	await expect(frageZurueck).toContainText('Lena bekommt die Rolle CM-Admin zurück.');
	await frageZurueck.getByRole('button', { name: 'Weiter' }).click();
	await expect(karte).toContainText(aktiv);

	await page.goto(`/verwaltung/mitglieder/${vorgemerktAusgetreten.mitgliedId}`);
	await karte.getByRole('button', { name: 'Löschung rückgängig machen' }).click();
	await expect(karte.getByText('ausgetreten', { exact: true })).toBeVisible();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	expect(fehler).toEqual([]);
});

test('RR-10: auf der eigenen Seite weder Austritt noch Löschen, dafür ein Hinweis', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const admin = await oeffneVerwaltung(page);
	await page.goto(`/verwaltung/mitglieder/${admin.mitgliedId}`);
	const karte = page.getByRole('region', { name: /^Mitgliedschaft/ });
	await expect(karte).toContainText('Aktiv. Kommt der Austritt');
	await expect(karte).toContainText(
		'Deinen Austritt und dein Löschen erfasst ein anderer Mitglieder-Admin.'
	);
	await expect(karte.getByRole('button', { name: 'Austritt erfassen' })).toHaveCount(0);
	await expect(karte.getByRole('button', { name: 'Mitglied löschen' })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'mitgliedschaft-eigene-seite');
	expect(fehler).toEqual([]);
});
