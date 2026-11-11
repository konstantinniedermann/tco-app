import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	holeMailCode,
	legeAdminMitBriefCodeAn,
	legeKontoMitBriefCodeAn,
	legeOffenenAnlassAn,
	schliesseLoginHilfen
} from './hilfen/login.ts';
import {
	klappeAuf,
	pruefeBildschirm,
	sammleKonsolenfehler,
	wartetAufMitgliederliste,
	wartetAufVorladen
} from './hilfen/seite.ts';

// Wappen führt zur Startseite, Rückfrage bei ungespeicherten Änderungen.
// Regeln: docs/ui-leitbild.md, Baustein Kopfleiste, «Eingabe mit Tastatur», «Ungespeicherte Änderungen».

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

type Konto = Awaited<ReturnType<typeof legeKontoMitBriefCodeAn>>;

/** Erfundenes Mitglied meldet sich mit Brief-Code an, wie vom Symbol auf dem Startbildschirm. */
async function meldeAn(page: Page, konto: Konto): Promise<void> {
	await startetVomSymbol(page);
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	// Die Reiter laden den Code ihrer Seiten vor; ein folgendes page.goto bräche das ab.
	await wartetAufVorladen(page);
}

const wappen = (page: Page) => page.getByRole('link', { name: 'Zur Startseite', exact: true });
const reiter = (page: Page, name: 'Start' | 'Profil') =>
	page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name });
/** Die Kopfleiste sieht aus wie ohne Link: Der Link ist genau so gross wie das Wappen. */
async function sitztWieVorher(page: Page): Promise<void> {
	const link = await wappen(page).boundingBox();
	const bild = await wappen(page).locator('img').boundingBox();
	expect(link).not.toBeNull();
	expect(link).toEqual(bild);
}

const rueckfrage = (page: Page) =>
	page.getByRole('dialog', { name: 'Nicht gespeichert – trotzdem verlassen?' });

/** Tippt aufs Wappen: auf dem Handy mit dem Finger, am PC mit der Maus. */
async function tippeWappen(page: Page, finger: boolean): Promise<void> {
	if (finger) await wappen(page).tap();
	else await wappen(page).click();
}

/** Schliesst die Tastatur wie ein Tipp auf den Hintergrund (den Seitentitel). */
async function schliesseTastatur(page: Page): Promise<void> {
	await page.getByRole('heading', { level: 1 }).click();
	await expect(page.locator('html')).not.toHaveAttribute('data-tastatur');
}

/** Öffnet im Profil «Telefon» zum Ändern; das Feld hat danach den Fokus. */
async function oeffneTelefon(page: Page) {
	await reiter(page, 'Profil').click();
	await expect(page).toHaveURL(/\/profil$/);
	await klappeAuf(page, 'Meine Angaben');
	await page
		.locator('.kachel', { hasText: 'Telefon' })
		.getByRole('button', { name: 'Ändern' })
		.click();
	const feld = page.getByLabel('Telefon (freiwillig)');
	await expect(feld).toBeFocused();
	return feld;
}

test('Wappen führt in der App zur Startseite', async ({ page }) => {
	const fehler = sammleKonsolenfehler(page);
	const konto = await legeKontoMitBriefCodeAn('Wanda');
	await meldeAn(page, konto);
	await reiter(page, 'Profil').click();
	await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
	await sitztWieVorher(page);
	await wappen(page).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Wanda' })).toBeVisible();
	await expect(page).toHaveURL(/\/$/);
	expect(fehler).toEqual([]);
});

test('Wappen bei offener Tastatur schliesst nur die Tastatur', async ({ page }, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Die Tastatur des Handys gibt es nur per Finger, am PC bleibt das Feld ohne data-tastatur
	const konto = await legeKontoMitBriefCodeAn('Tilda');
	await meldeAn(page, konto);
	const feld = await oeffneTelefon(page);
	// Geändert: Ginge der Tipp als Link durch, stünde die Rückfrage sofort da (beforeNavigate
	// läuft noch im Klick), nicht erst nach dem Laden der Startseite.
	await feld.fill('079 555 02 34');
	await expect(page.locator('html')).toHaveAttribute('data-tastatur');

	await tippeWappen(page, true);
	await expect(rueckfrage(page)).toBeHidden();
	await expect(feld).not.toBeFocused();
	await expect(page.locator('html')).not.toHaveAttribute('data-tastatur');
	await expect(reiter(page, 'Start')).toBeVisible();
	await expect(page).toHaveURL(/\/profil$/);
	await expect(feld).toHaveValue('079 555 02 34');

	// Erst der nächste Tipp führt weiter, hier zur Rückfrage.
	await tippeWappen(page, true);
	await expect(rueckfrage(page)).toBeVisible();
	await rueckfrage(page).getByRole('button', { name: 'Verlassen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Tilda' })).toBeVisible();
});

test('Rückfrage bei Ungespeichertem: Abbrechen bleibt, Verlassen geht weiter', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const finger = info.project.name !== 'desktop';
	const konto = await legeKontoMitBriefCodeAn('Ursina');
	await meldeAn(page, konto);
	const feld = await oeffneTelefon(page);
	await feld.fill('079 555 01 23');
	await schliesseTastatur(page);

	await tippeWappen(page, finger);
	await expect(rueckfrage(page)).toBeVisible();
	await pruefeBildschirm(page, info, 'rueckfrage-nicht-gespeichert');
	await rueckfrage(page).getByRole('button', { name: 'Abbrechen' }).click();
	await expect(rueckfrage(page)).toBeHidden();
	await expect(page).toHaveURL(/\/profil$/);
	await expect(feld).toHaveValue('079 555 01 23');
	await expect(reiter(page, 'Profil')).toHaveAttribute('aria-current', 'page');

	// Auch der Reiter fragt; «Verlassen» führt zum Ziel.
	await reiter(page, 'Start').click();
	await expect(rueckfrage(page)).toBeVisible();
	await rueckfrage(page).getByRole('button', { name: 'Verlassen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Ursina' })).toBeVisible();
	await expect(rueckfrage(page)).toBeHidden();
	expect(fehler).toEqual([]);
});

test('Keine Rückfrage nach dem Zurücksetzen und nach dem Speichern', async ({ page }, info) => {
	const finger = info.project.name !== 'desktop';
	const konto = await legeKontoMitBriefCodeAn('Vreni');
	await meldeAn(page, konto);

	// Getippt und wieder zurückgesetzt: weicht nicht vom geladenen Stand ab.
	const feld = await oeffneTelefon(page);
	const vorher = await feld.inputValue();
	await feld.fill('079 555 04 56');
	await feld.fill(vorher);
	await schliesseTastatur(page);
	await tippeWappen(page, finger);
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Vreni' })).toBeVisible();
	await expect(rueckfrage(page)).toBeHidden();

	// Gespeichert: nichts mehr ungespeichert.
	const neu = await oeffneTelefon(page);
	await neu.fill('079 555 07 89');
	await page.getByRole('button', { name: 'Telefon speichern' }).click();
	await expect(page.locator('.kachel', { hasText: 'Telefon' })).toContainText('079 555 07 89');
	await tippeWappen(page, finger);
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Vreni' })).toBeVisible();
	await expect(rueckfrage(page)).toBeHidden();
});

test('Antwort auf einen Anlass: Rückfrage nur, solange die Antwort nicht gesendet ist', async ({
	page
}, info) => {
	const finger = info.project.name !== 'desktop';
	const konto = await legeKontoMitBriefCodeAn('Yvonne');
	const titel = `Probeanlass ${randomUUID().slice(0, 8)}`;
	const id = await legeOffenenAnlassAn(konto.mitgliedId, titel);
	await meldeAn(page, konto);
	await page.goto(`/anlass/${id}`);
	await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();

	// Noch nichts gewählt: keine Rückfrage.
	await tippeWappen(page, finger);
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Yvonne' })).toBeVisible();

	// Gewählt, nicht gesendet: das Wappen fragt; Abbrechen bleibt.
	await page.goto(`/anlass/${id}`);
	await page.getByRole('radio', { name: 'Ich komme nicht' }).check();
	await page.getByLabel('Bemerkung (freiwillig)').fill('Bin in den Ferien.');
	await schliesseTastatur(page);
	await tippeWappen(page, finger);
	await expect(rueckfrage(page)).toBeVisible();
	await rueckfrage(page).getByRole('button', { name: 'Abbrechen' }).click();
	await expect(page.getByLabel('Bemerkung (freiwillig)')).toHaveValue('Bin in den Ferien.');

	// Gesendet: nichts mehr ungespeichert.
	await page.getByRole('button', { name: 'Antwort senden' }).click();
	await expect(page.getByText('Du kommst nicht', { exact: true })).toBeVisible();
	await tippeWappen(page, finger);
	await expect(page.getByRole('heading', { level: 1, name: 'Hoi Yvonne' })).toBeVisible();
	await expect(rueckfrage(page)).toBeHidden();
});

test('Verwaltung: Wappen zur ersten Seite, Rückfrage auch bei Links der Seitenleiste', async ({
	page
}, info) => {
	const fehler = sammleKonsolenfehler(page);
	const finger = info.project.name !== 'desktop';
	const admin = await legeAdminMitBriefCodeAn('Xenia');
	await meldeAn(page, admin);
	await page.getByRole('link', { name: 'Verwaltung' }).click();
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(admin.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Mitglieder' })).toBeVisible();

	const seitenleiste = page.getByRole('navigation', { name: 'Verwaltung' });
	await seitenleiste.getByRole('link', { name: 'Anlässe' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Anlässe' })).toBeVisible();
	await sitztWieVorher(page);
	await tippeWappen(page, finger);
	await wartetAufMitgliederliste(page);
	await expect(page).toHaveURL(/\/verwaltung\/mitglieder$/);

	// Angaben geändert: der Link der Seitenleiste fragt; Abbrechen bleibt.
	await page.goto(`/verwaltung/mitglieder/${admin.mitgliedId}`);
	const vorname = page.getByLabel('Vorname', { exact: true });
	await expect(vorname).toHaveValue('Xenia');
	await vorname.fill('Xaver');
	await schliesseTastatur(page);
	await seitenleiste.getByRole('link', { name: 'Anlässe' }).click();
	await expect(rueckfrage(page)).toBeVisible();
	await rueckfrage(page).getByRole('button', { name: 'Abbrechen' }).click();
	await expect(vorname).toHaveValue('Xaver');
	await expect(page).toHaveURL(new RegExp(`/verwaltung/mitglieder/${admin.mitgliedId}$`));

	// Zurückgesetzt: keine Rückfrage.
	await vorname.fill('Xenia');
	await schliesseTastatur(page);
	await seitenleiste.getByRole('link', { name: 'Anlässe' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Anlässe' })).toBeVisible();

	// Neuer Anlass angefangen: das Wappen fragt, «Verlassen» führt zur ersten Seite.
	await page.getByRole('link', { name: 'Neuer Anlass' }).click();
	await page.getByLabel('Titel').fill('Probeanlass');
	await schliesseTastatur(page);
	await tippeWappen(page, finger);
	await expect(rueckfrage(page)).toBeVisible();
	await rueckfrage(page).getByRole('button', { name: 'Verlassen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Mitglieder' })).toBeVisible();
	expect(fehler).toEqual([]);
});
