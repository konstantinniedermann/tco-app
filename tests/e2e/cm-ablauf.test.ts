import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { MELDUNG } from '../../src/lib/login/anmelden.ts';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	gibLogin,
	legeKontoMitBriefCodeAn,
	legeOffenesTurnierAn,
	meldeZurCmAn,
	schliesseLoginHilfen,
	setzeSpielerangaben,
	stelleAnfrageDirekt
} from './hilfen/login.ts';
import { klappeAuf, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// Ablauf der Aktionen auf der CM-Seite der Mitglieder (Schritt 16, Anhang E.10 in
// docs/refactoring-analyse.md): Satz, Neuladen und Fokus nach jeder Aktion (WCAG 2.4.3), auch in
// den Fehlerzweigen. Die Fälle halten den heutigen Stand fest, wie er im Browser gemessen ist; die
// Fehler stellt `page.route` auf der einen Schreib-Adresse. Anmelden mit dem Brief-Code, ohne
// Mail-Code.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

const einzel = (name: string, von: 'R1' | 'R7', bis: 'R6' | 'R9'): KategorieWerte => ({
	name,
	geschlecht: 'herren',
	art: 'einzel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: von,
	klassierungBis: bis,
	mindestsumme: null
});

const doppel = (name: string): KategorieWerte => ({
	name,
	geschlecht: 'mixed',
	art: 'doppel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: null,
	klassierungBis: null,
	mindestsumme: 9
});

type Konto = Awaited<ReturnType<typeof legeKontoMitBriefCodeAn>>;

async function meldeAn(page: Page, konto: Konto) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	// Die Reiter laden den Code ihrer Seiten vor; ein folgendes page.goto bräche das ab.
	await wartetAufVorladen(page);
}

async function oeffneCm(page: Page, turnierId: number, jahr: number) {
	await page.goto(`/clubmeisterschaft/${turnierId}`);
	await expect(
		page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
	).toBeVisible();
}

/** Karte einer Kategorie, gefunden über ihren Namen. */
const karte = (page: Page, name: string) =>
	page.locator('div.karte').filter({ has: page.getByText(name, { exact: true }) });

/** Zählt die Anfragen `GET /api/cm/<id>`: so lädt die Seite ihre Ansicht neu. */
function zaehleNeuladen(page: Page, turnierId: number): { anzahl: number } {
	const zaehler = { anzahl: 0 };
	page.on('requestfinished', (r) => {
		if (r.method() === 'GET' && new URL(r.url()).pathname === `/api/cm/${turnierId}`)
			zaehler.anzahl++;
	});
	return zaehler;
}

/** Gestellte Antwort auf die eine Schreib-Adresse; nur für die nächste Anfrage. */
async function stelle(page: Page, adresse: string, status: number, json: object) {
	await page.route(adresse, (r) => r.fulfill({ status, json }), { times: 1 });
}

/** Der Fokus liegt auf keinem Element, sondern im Seitenkörper. */
async function fokusImSeitenkoerper(page: Page) {
	await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
}

/** Wartet, bis die Seite ihre Ansicht so oft neu geladen hat. */
async function neuGeladen(zaehler: { anzahl: number }, anzahl: number) {
	await expect.poll(() => zaehler.anzahl).toBe(anzahl);
}

test('Einzel und Wildcard: Satz, Neuladen und Fokus nach jeder Aktion', async ({ page }, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder melden sich am Handy an; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const { turnierId, jahr } = await legeOffenesTurnierAn([
		einzel('Herren R7–R9', 'R7', 'R9'),
		einzel('Herren R1–R6', 'R1', 'R6')
	]);
	const mitglied = await legeKontoMitBriefCodeAn('Moritz', `Probe${randomUUID().slice(0, 6)}`);
	await setzeSpielerangaben(mitglied.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1990,
		klassierung: 'R8'
	});
	await startetVomSymbol(page);
	await meldeAn(page, mitglied);
	await oeffneCm(page, turnierId, jahr);
	const neu = zaehleNeuladen(page, turnierId);
	const hinweis = page.getByRole('dialog', { name: 'Bevor du dich anmeldest' });
	const einzelKarte = karte(page, 'Herren R7–R9');
	const wildcardKarte = karte(page, 'Herren R1–R6');

	// Anmelden (über den Hinweis) und Abmelden: Der Fokus bleibt bei der Kategorie.
	await einzelKarte.getByRole('button', { name: 'Anmelden' }).click();
	await hinweis.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('status')).toHaveText(
		'Angemeldet für Herren R7–R9. Die Bestätigung kommt per Mail.'
	);
	await expect(einzelKarte.getByRole('button', { name: 'Abmelden' })).toBeFocused();
	await einzelKarte.getByRole('button', { name: 'Abmelden' }).click();
	await expect(page.getByRole('status')).toHaveText('Abgemeldet von Herren R7–R9.');
	await expect(einzelKarte.getByRole('button', { name: 'Anmelden' })).toBeFocused();

	// Wildcard mit leerem Kommentar: Satz am Feld, Fokus im Feld, keine Anfrage.
	await klappeAuf(page, 'Weitere Kategorien mit Wildcard-Antrag');
	let wildcardAnfragen = 0;
	page.on('request', (r) => {
		if (/\/api\/cm\/kategorien\/\d+\/wildcard$/.test(new URL(r.url()).pathname)) wildcardAnfragen++;
	});
	await wildcardKarte.getByRole('button', { name: 'Wildcard beantragen' }).click();
	await hinweis.getByRole('button', { name: 'Weiter' }).click();
	const antrag = page.getByRole('dialog', { name: 'Wildcard beantragen' });
	const feld = antrag.getByLabel('Warum möchtest du hier spielen?');
	await antrag.getByRole('button', { name: 'Beantragen' }).click();
	await expect(antrag.getByRole('alert')).toHaveText(
		'Bitte schreib kurz, warum du hier spielen möchtest.'
	);
	await expect(feld).toBeFocused();
	expect(wildcardAnfragen).toBe(0);

	// Störung: Der Satz steht im Dialog, der Dialog bleibt offen, kein Neuladen, kein Fokus ins Feld.
	await feld.fill('Ich will es versuchen.');
	await stelle(page, '**/api/cm/kategorien/*/wildcard', 503, { fehler: 'stoerung' });
	await antrag.getByRole('button', { name: 'Beantragen' }).click();
	await expect(antrag.getByRole('alert')).toHaveText(MELDUNG.stoerung);
	await expect(antrag).toBeVisible();
	await expect(feld).not.toBeFocused();
	expect(wildcardAnfragen).toBe(1);
	expect(neu.anzahl).toBe(0);

	// `geschlossen`: Dialog zu, Satz auf der Seite, einmal neu geladen; der Fokus fällt in den
	// Seitenkörper (gemessen, Anhang E.11: die Taste war während der Anfrage gesperrt).
	await stelle(page, '**/api/cm/kategorien/*/wildcard', 409, { fehler: 'geschlossen' });
	await antrag.getByRole('button', { name: 'Beantragen' }).click();
	await expect(antrag).toBeHidden();
	await expect(page.getByRole('alert')).toHaveText('Die Anmeldung ist inzwischen geschlossen.');
	await neuGeladen(neu, 1);
	await fokusImSeitenkoerper(page);

	// Mit Text: Dialog zu, Satz, Fokus auf der neuen Taste «Zurückziehen» derselben Karte.
	await wildcardKarte.getByRole('button', { name: 'Wildcard beantragen' }).click();
	await hinweis.getByRole('button', { name: 'Weiter' }).click();
	await expect(feld).toHaveValue('');
	await feld.fill('Ich will es versuchen.');
	await antrag.getByRole('button', { name: 'Beantragen' }).click();
	await expect(antrag).toBeHidden();
	await expect(page.getByRole('status')).toHaveText('Wildcard beantragt. Du bekommst Bescheid.');
	await expect(wildcardKarte.getByRole('button', { name: 'Zurückziehen' })).toBeFocused();
	await wildcardKarte.getByRole('button', { name: 'Zurückziehen' }).click();
	await expect(page.getByRole('status')).toHaveText('Antrag für Herren R1–R6 zurückgezogen.');
	await expect(wildcardKarte.getByRole('button', { name: 'Wildcard beantragen' })).toBeFocused();
	expect(neu.anzahl).toBe(1);

	// Anmelden mit `geschlossen`: Satz auf der Seite, genau einmal neu geladen, Fokus im Körper.
	await stelle(page, '**/api/cm/kategorien/*/anmeldung', 409, { fehler: 'geschlossen' });
	await einzelKarte.getByRole('button', { name: 'Anmelden' }).click();
	await hinweis.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('alert')).toHaveText('Die Anmeldung ist inzwischen geschlossen.');
	await neuGeladen(neu, 2);
	await fokusImSeitenkoerper(page);

	// Anmelden mit Störung: Satz auf der Seite, kein Neuladen, Fokus im Körper.
	await stelle(page, '**/api/cm/kategorien/*/anmeldung', 503, { fehler: 'stoerung' });
	await einzelKarte.getByRole('button', { name: 'Anmelden' }).click();
	await hinweis.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('alert')).toHaveText(MELDUNG.stoerung);
	await fokusImSeitenkoerper(page);
	expect(neu.anzahl).toBe(2);
	await expect(page.getByRole('status')).toHaveText('');

	// In der Konsole stehen nur die vorgetäuschten 503.
	expect(fehler.filter((f) => !/status of 503\b/.test(f))).toEqual([]);
});

test('Allein im Doppel: Kommentar ändern mit Feldfehler und Speichern', async ({ page }, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder melden sich am Handy an; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const {
		turnierId,
		jahr,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([doppel('Mixed Doppel')]);
	const lea = await legeKontoMitBriefCodeAn('Lea', `Probe${randomUUID().slice(0, 6)}`);
	await setzeSpielerangaben(lea.mitgliedId, { geschlecht: 'w', jahrgang: 1992, klassierung: 'R4' });
	await meldeZurCmAn(kategorieId, lea.mitgliedId, 'Eher abends.');
	await startetVomSymbol(page);
	await meldeAn(page, lea);
	await oeffneCm(page, turnierId, jahr);
	const eigene = page.getByRole('region', { name: 'Mixed Doppel', exact: true });

	// Das Feld zeigt den alten Text.
	await eigene.getByRole('button', { name: 'Kommentar ändern' }).click();
	const dialog = page.getByRole('dialog', { name: 'Kommentar ändern' });
	const feld = dialog.getByLabel('Kommentar (freiwillig)');
	await expect(feld).toHaveValue('Eher abends.');

	// Feldfehler: Satz am Feld, Fokus im Feld, Dialog offen.
	await stelle(page, '**/api/cm/anmeldungen/*/suchtext', 400, {
		fehler: 'eingabe',
		felder: { suchtext: 'Zu lang.' }
	});
	await dialog.getByRole('button', { name: 'Speichern' }).click();
	await expect(dialog.getByRole('alert')).toHaveText('Zu lang.');
	await expect(feld).toBeFocused();
	await expect(dialog).toBeVisible();

	// Speichern: Dialog zu, Satz, neuer Text in der Karte, Fokus auf «Abmelden» (nicht auf
	// «Kommentar ändern», gemessen).
	await feld.fill('Lieber am Wochenende.');
	await dialog.getByRole('button', { name: 'Speichern' }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole('status')).toHaveText('Kommentar gespeichert.');
	await expect(eigene).toContainText('Dein Kommentar: «Lieber am Wochenende.»');
	await expect(eigene.getByRole('button', { name: 'Abmelden' })).toBeFocused();
	expect(fehler).toEqual([]);
});

test('Anfragen: Zurückziehen, Ablehnen, Annehmen und eine hinfällige Anfrage', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder melden sich am Handy an; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const {
		turnierId,
		jahr,
		kategorieIds: [mixed, plausch]
	} = await legeOffenesTurnierAn([doppel('Mixed Doppel'), doppel('Mixed Plausch')]);
	const zusatz = randomUUID().slice(0, 6);
	const marco = await legeKontoMitBriefCodeAn('Marco', `Muster${zusatz}`);
	await setzeSpielerangaben(marco.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1990,
		klassierung: 'R5'
	});
	const lea = await legeKontoMitBriefCodeAn('Lea', `Probe${zusatz}`);
	await setzeSpielerangaben(lea.mitgliedId, { geschlecht: 'w', jahrgang: 1992, klassierung: 'R4' });
	const nora = await legeKontoMitBriefCodeAn('Nora', `Beispiel${zusatz}`);
	await setzeSpielerangaben(nora.mitgliedId, {
		geschlecht: 'w',
		jahrgang: 1991,
		klassierung: 'R4'
	});
	const leaName = `Lea Probe${zusatz}`;
	const noraName = `Nora Beispiel${zusatz}`;
	// Marco hat ein Login; die Anfragen laufen über die Fachlogik. Auch Lea und Nora brauchen ein
	// Login, sonst erscheinen ihre Anfragen nicht (FR-48).
	await startetVomSymbol(page);
	await meldeAn(page, marco);
	await gibLogin(lea.kontoId);
	await gibLogin(nora.kontoId);
	await stelleAnfrageDirekt(plausch, marco.mitgliedId, lea.mitgliedId);
	await stelleAnfrageDirekt(mixed, lea.mitgliedId, marco.mitgliedId);
	await stelleAnfrageDirekt(mixed, nora.mitgliedId, marco.mitgliedId);
	await oeffneCm(page, turnierId, jahr);
	const neu = zaehleNeuladen(page, turnierId);
	const anfrageVon = (name: string) =>
		page.getByRole('region', { name: 'Anfrage für «Mixed Doppel»' }).filter({ hasText: name });

	// Eigene Anfrage zurückziehen: Fokus auf den Link «Anmelden» der Doppel-Karte.
	await karte(page, 'Mixed Plausch').getByRole('button', { name: 'Zurückziehen' }).click();
	await expect(page.getByRole('status')).toHaveText(`Anfrage an ${leaName} zurückgezogen.`);
	await expect(karte(page, 'Mixed Plausch').getByRole('link', { name: 'Anmelden' })).toBeFocused();

	// Annehmen einer hinfälligen Anfrage: Satz, neu geladen, die Anfrage steht noch.
	await stelle(page, '**/api/cm/anfragen/*/annehmen', 409, { fehler: 'hinfaellig' });
	await anfrageVon(leaName).getByRole('button', { name: 'Annehmen' }).click();
	await expect(page.getByRole('alert')).toHaveText('Diese Anfrage gilt nicht mehr.');
	await neuGeladen(neu, 1);
	await expect(anfrageVon(leaName)).toBeVisible();
	// Die Taste «Annehmen» war während der Anfrage gesperrt und hat den Fokus verloren; er geht auf
	// den Titel der ersten Anfrage-Karte (gemessen, Anhang E.11).
	await expect(
		page.getByRole('heading', { name: 'Anfrage für «Mixed Doppel»' }).first()
	).toBeFocused();

	// Ablehnen: Die Karte ist weg, der Fokus geht auf den Titel der verbleibenden Anfrage.
	await anfrageVon(leaName).getByRole('button', { name: 'Ablehnen' }).click();
	await expect(page.getByRole('status')).toHaveText(`Anfrage von ${leaName} abgelehnt.`);
	await expect(anfrageVon(leaName)).toHaveCount(0);
	await expect(
		anfrageVon(noraName).getByRole('heading', { name: 'Anfrage für «Mixed Doppel»' })
	).toBeFocused();

	// Annehmen: Fokus auf «Abmelden» der eigenen Paar-Karte.
	await anfrageVon(noraName).getByRole('button', { name: 'Annehmen' }).click();
	await expect(page.getByRole('status')).toHaveText(
		`Angemeldet mit ${noraName} für Mixed Doppel. Die Bestätigung kommt per Mail.`
	);
	await expect(
		page
			.getByRole('region', { name: 'Mixed Doppel', exact: true })
			.getByRole('button', { name: 'Abmelden' })
	).toBeFocused();
	expect(neu.anzahl).toBe(1);
	expect(fehler).toEqual([]);
});
