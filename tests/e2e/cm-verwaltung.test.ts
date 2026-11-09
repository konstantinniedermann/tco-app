import { randomUUID } from 'node:crypto';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	beantrageWildcardDirekt,
	holeMailCode,
	legeCmMitBriefCodeAn,
	legeKontoAn,
	legeKontoMitBriefCodeAn,
	legeOffenesTurnierAn,
	legeRollenkontoMitBriefCodeAn,
	schliesseLoginHilfen,
	setzeSpielerangaben,
	warteAufMail
} from './hilfen/login.ts';
import {
	klappeAuf,
	pruefeBildschirm,
	sammleKonsolenfehler,
	wartetAufVorladen
} from './hilfen/seite.ts';

// CM Teil 4: Der CM-Admin verwaltet die Einzel-Anmeldungen einer Kategorie (A-ANMELDUNG-06,
// FR-46) und entscheidet über Wildcard-Anträge (A-ANMELDUNG-10, FR-08); die Spieler und die
// CM-Admins bekommen eine Meldung (FR-47). Ohne Push-Abo kommt sie als Mail in Mailpit an.

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

// Pro Jahr gibt es ein Turnier; jedes Projekt und jeder Test hat sein festes Jahr, getrennt von
// cm-anmeldung.test.ts (2090–2093), verwaltung.test.ts (2094–2096) und turnier.test.ts
// (2097–2099). `legeOffenesTurnierAn` löscht das Turnier des Jahres vorher.
const JAHR_VERWALTEN: Record<string, number> = { iphone: 2089, android: 2088 };
const JAHR_WILDCARD: Record<string, number> = { iphone: 2087, android: 2086 };
const JAHR_NUR_LESEN: Record<string, number> = { iphone: 2085, android: 2084, desktop: 2083 };
const JAHR_KLEBEN: Record<string, number> = { desktop: 2059 };
const JAHR_SUCHE: Record<string, number> = { iphone: 2058, android: 2057, desktop: 2056 };

function testjahr(jahre: Record<string, number>, info: TestInfo): number {
	const jahr = jahre[info.project.name];
	if (!jahr) throw new Error(`Kein Testjahr für das Projekt ${info.project.name}`);
	return jahr;
}

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

const KATEGORIEN = [einzel('Herren R1–R6', 'R1', 'R6'), einzel('Herren R7–R9', 'R7', 'R9')];

type Konto = Awaited<ReturnType<typeof legeKontoMitBriefCodeAn>>;

async function meldeAn(page: Page, konto: Konto) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	// Die Reiter laden den Code ihrer Seiten vor; ein folgendes page.goto bräche das ab.
	await wartetAufVorladen(page);
}

/** Schickt den Code der Verwaltung, liest ihn aus Mailpit und bestätigt (SI-08). */
async function bestaetige(page: Page, konto: Konto, titel: string) {
	await expect(page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' })).toBeVisible();
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(konto.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	// Erst weiter, wenn die Seite steht: ein folgendes page.goto bricht sonst die laufende
	// Zugangsprüfung ab, und WebKit unter Linux meldet das als Konsolenfehler.
	await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();
}

/** CM-Admin vom Startbildschirm über die Verwaltung bis zur Seite der Kategorie. */
async function oeffneKategorieAlsCm(page: Page, cm: Konto, turnier: string, kategorie: string) {
	await meldeAn(page, cm);
	await page.getByRole('link', { name: 'Verwaltung' }).click();
	await bestaetige(page, cm, 'Clubmeisterschaft');
	await page.getByRole('link', { name: turnier }).click();
	await expect(page.getByRole('heading', { level: 1, name: turnier })).toBeVisible();
	await page.getByRole('link', { name: kategorie }).click();
	await expect(page.getByRole('heading', { level: 1, name: kategorie })).toBeVisible();
}

/** Zeile eines Spielers in der Anmeldungsliste der Verwaltung. */
const zeile = (page: Page, nachname: string) =>
	page.getByRole('row', { name: new RegExp(nachname) });

/** Karte einer Kategorie auf der CM-Seite des Mitglieds, gefunden über ihren Namen. */
const karte = (page: Page, name: string) =>
	page.locator('.karte.kachel').filter({ has: page.getByText(name, { exact: true }) });

test('A-ANMELDUNG-06, FR-46, FR-47, FR-10: CM-Admin meldet von Hand an, verschiebt, korrigiert die Klassierung und löscht', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Nachweis mit Screenshots auf iPhone und Android; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(120_000);
	const fehler = sammleKonsolenfehler(page);
	const jahr = testjahr(JAHR_VERWALTEN, info);
	const turnier = `Clubmeisterschaft ${jahr}`;
	await legeOffenesTurnierAn(jahr, KATEGORIEN);
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	const spieler = await legeKontoAn('Bruno', nachname);
	await setzeSpielerangaben(spieler.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1985,
		klassierung: 'R8'
	});
	const cm = await legeCmMitBriefCodeAn('Cyrill');
	await oeffneKategorieAlsCm(page, cm, turnier, 'Herren R1–R6');
	await expect(page.getByText('Noch keine Anmeldungen.')).toBeVisible();

	// FR-46: Von Hand anmelden; R8 passt nicht zu R1–R6, der CM-Admin meldet trotzdem an.
	await page.getByRole('button', { name: 'Von Hand anmelden' }).click();
	const anmelden = page.getByRole('dialog', { name: 'Von Hand anmelden' });
	await anmelden.getByLabel('Mitglied suchen').fill(nachname);
	await anmelden.getByRole('radio', { name: new RegExp(`${nachname}, Bruno`) }).check();
	await expect(anmelden).toContainText('R8 · männlich · 1985');
	await anmelden.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(anmelden.getByRole('alert')).toHaveText('Passt nicht zur Kategorie.');
	await pruefeBildschirm(page, info, 'cm-von-hand-warnung');
	await anmelden.getByRole('button', { name: 'Trotzdem anmelden' }).click();
	await expect(anmelden).toBeHidden();
	await expect(page.getByText('Angemeldet.', { exact: true })).toBeVisible();
	await expect(page.getByText('1 Anmeldung', { exact: true })).toBeVisible();
	await expect(zeile(page, nachname)).toContainText('R8');
	await expect(zeile(page, nachname)).toContainText('bestätigt');
	await pruefeBildschirm(page, info, 'cm-anmeldungen-liste');
	// FR-47, DS-05: Die Meldung an den Spieler nennt keinen anderen Namen.
	const angemeldet = await warteAufMail(
		spieler.email,
		'Clubmeisterschaft',
		'hat dich in «Herren R1–R6» angemeldet'
	);
	expect(angemeldet).toContain(
		'Der CM-Admin hat dich in «Herren R1–R6» angemeldet. Gegner sehen deine E-Mail und Telefonnummer.'
	);
	expect(angemeldet).not.toContain('Cyrill');

	// FR-46: Verschieben in die passende Kategorie, ohne Warnung.
	await zeile(page, nachname).getByRole('button', { name: 'Verschieben' }).click();
	const verschieben = page.getByRole('dialog', { name: 'Verschieben' });
	await verschieben.getByRole('radio', { name: 'Herren R7–R9' }).check();
	await verschieben.getByRole('button', { name: 'Verschieben', exact: true }).click();
	await expect(verschieben).toBeHidden();
	await expect(page.getByText('Verschoben.', { exact: true })).toBeVisible();
	await expect(page.getByText('Noch keine Anmeldungen.')).toBeVisible();
	await warteAufMail(
		spieler.email,
		'Clubmeisterschaft',
		'Der CM-Admin hat dich von «Herren R1–R6» nach «Herren R7–R9» verschoben.'
	);

	await page.getByRole('link', { name: `‹ ${turnier}` }).click();
	await expect(page.getByRole('heading', { level: 1, name: turnier })).toBeVisible();
	await page.getByRole('link', { name: 'Herren R7–R9' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Herren R7–R9' })).toBeVisible();
	await expect(zeile(page, nachname)).toContainText('R8');

	// Teil 4: Der CM-Admin korrigiert die Klassierung; die Liste zeigt sie gleich.
	await zeile(page, nachname).getByRole('button', { name: 'Klassierung' }).click();
	const klassierung = page.getByRole('dialog', { name: 'Klassierung korrigieren' });
	await klassierung.getByLabel('Klassierung').selectOption('R7');
	await klassierung.getByRole('button', { name: 'Klassierung speichern' }).click();
	await expect(klassierung).toBeHidden();
	await expect(page.getByText('Klassierung gespeichert.', { exact: true })).toBeVisible();
	await expect(zeile(page, nachname)).toContainText('R7');

	// FR-46, FR-10: Löschen zieht die Anmeldung zurück, auch durch den CM-Admin.
	await zeile(page, nachname).getByRole('button', { name: 'Löschen' }).click();
	const loeschen = page.getByRole('dialog', { name: 'Anmeldung löschen?' });
	await loeschen.getByRole('button', { name: 'Löschen', exact: true }).click();
	await expect(loeschen).toBeHidden();
	await expect(page.getByText('Gelöscht.', { exact: true })).toBeVisible();
	await expect(page.getByText('Noch keine Anmeldungen.')).toBeVisible();
	await warteAufMail(
		spieler.email,
		'Clubmeisterschaft',
		'Der CM-Admin hat deine Anmeldung für «Herren R7–R9» gelöscht.'
	);

	// FR-35: Ohne aktive Anmeldung lässt sich die Kategorie wieder absagen.
	await page.getByRole('button', { name: 'Kategorie absagen' }).click();
	const rueckfrage = page.getByRole('dialog', { name: 'Kategorie absagen?' });
	await rueckfrage.getByRole('button', { name: 'Absagen', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: turnier })).toBeVisible();
	await expect(
		page.getByRole('row', { name: /Herren R7–R9/ }).getByText('abgesagt', { exact: true })
	).toBeVisible();
	expect(fehler).toEqual([]);
});

test('A-ANMELDUNG-10, FR-08: Mitglied beantragt eine Wildcard, CM-Admin lehnt mit Grund ab', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder beantragen am Handy; der Nachweis mit Screenshots läuft auf iPhone und Android
	// Die Meldung an die CM-Admins (FR-47) geht an alle der gemeinsamen Testdatenbank, nach der
	// Antwort und der Reihe nach; lokal sind das Hunderte aus früheren Läufen, der neue zuletzt.
	test.setTimeout(180_000);
	const fehler = sammleKonsolenfehler(page);
	const jahr = testjahr(JAHR_WILDCARD, info);
	const turnier = `Clubmeisterschaft ${jahr}`;
	const {
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn(jahr, KATEGORIEN);
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	const mitglied = await legeKontoMitBriefCodeAn('Moritz', nachname);
	await setzeSpielerangaben(mitglied.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1990,
		klassierung: 'R8'
	});
	const cm = await legeCmMitBriefCodeAn('Carla');
	const kommentar = 'Ich trainiere viel und will es versuchen.';

	// Das Mitglied am Handy: R7–R9 passt, für R1–R6 geht ein Wildcard-Antrag.
	await startetVomSymbol(page);
	await meldeAn(page, mitglied);
	await page.getByRole('link', { name: new RegExp(turnier) }).click();
	await expect(page.getByRole('heading', { level: 1, name: turnier })).toBeVisible();
	await expect(karte(page, 'Herren R7–R9')).toBeVisible();
	await klappeAuf(page, 'Weitere Kategorien mit Wildcard-Antrag');
	await pruefeBildschirm(page, info, 'cm-wildcard-klappe');
	await karte(page, 'Herren R1–R6').getByRole('button', { name: 'Wildcard beantragen' }).click();
	const hinweis = page.getByRole('dialog', { name: 'Bevor du dich anmeldest' });
	await expect(hinweis).toContainText('E-Mail-Adresse und Telefonnummer');
	await hinweis.getByRole('button', { name: 'Weiter' }).click();
	const antrag = page.getByRole('dialog', { name: 'Wildcard beantragen' });
	await expect(antrag).toContainText('Bitte keine Angaben zur Gesundheit.');
	await antrag.getByLabel('Warum möchtest du hier spielen?').fill(kommentar);
	await pruefeBildschirm(page, info, 'cm-wildcard-antrag');
	await antrag.getByRole('button', { name: 'Beantragen' }).click();
	await expect(page.getByRole('status')).toHaveText('Wildcard beantragt. Du bekommst Bescheid.');
	await expect(karte(page, 'Herren R1–R6').getByText('Wildcard beantragt')).toBeVisible();
	await expect(page.getByText('1 von 3 Anmeldungen', { exact: true })).toBeVisible();

	// FR-47, DS-05: Die CM-Admins erfahren vom Antrag, ohne den Namen des Mitglieds.
	const meldung = await warteAufMail(
		cm.email,
		'Wildcard-Antrag',
		`/kategorien/${kategorieId}`,
		120_000
	);
	expect(meldung).toContain('Neuer Wildcard-Antrag für «Herren R1–R6».');
	expect(meldung).not.toContain(nachname);

	// Der CM-Admin am selben Gerät: sieht den Antrag mit Kommentar und lehnt mit Grund ab.
	await page.context().clearCookies();
	await oeffneKategorieAlsCm(page, cm, turnier, 'Herren R1–R6');
	await expect(page.getByText('1 Anmeldung, 1 Wildcard-Antrag', { exact: true })).toBeVisible();
	await expect(zeile(page, nachname)).toContainText(kommentar);
	await expect(zeile(page, nachname)).toContainText('Wildcard beantragt');
	// Verschieben bestätigt einen Antrag; der Dialog sagt es, hier nur angesehen.
	await zeile(page, nachname).getByRole('button', { name: 'Verschieben' }).click();
	const verschieben = page.getByRole('dialog', { name: 'Verschieben' });
	await expect(verschieben).toContainText('Der Antrag gilt danach als bestätigt.');
	await verschieben.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(verschieben).toBeHidden();
	await zeile(page, nachname).getByRole('button', { name: 'Entscheiden' }).click();
	const entscheid = page.getByRole('dialog', { name: 'Wildcard-Antrag' });
	await expect(entscheid).toContainText(kommentar);
	await expect(entscheid).toContainText('bitte keine Angaben zur Gesundheit');
	await entscheid.getByLabel('Grund (freiwillig)').fill('Das Feld ist schon voll.');
	await pruefeBildschirm(page, info, 'cm-wildcard-entscheid');
	await entscheid.getByRole('button', { name: 'Ablehnen' }).click();
	await expect(entscheid).toBeHidden();
	await expect(page.getByText('Abgelehnt.', { exact: true })).toBeVisible();
	await expect(page.getByText('Noch keine Anmeldungen.')).toBeVisible();

	// FR-47: Die Ablehnung erreicht das Mitglied samt Grund.
	const abgelehnt = await warteAufMail(mitglied.email, 'Clubmeisterschaft', 'ist abgelehnt.');
	expect(abgelehnt).toContain(
		'Deine Wildcard für «Herren R1–R6» ist abgelehnt. Grund: Das Feld ist schon voll.'
	);
	expect(fehler).toEqual([]);
});

test('RR-07, FR-08: MyTCO-Admin sieht die Anmeldungen mit Kommentar, ohne Tasten', async ({
	page
}, info) => {
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const jahr = testjahr(JAHR_NUR_LESEN, info);
	const {
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn(jahr, KATEGORIEN);
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	const spieler = await legeKontoAn('Rolf', nachname);
	await setzeSpielerangaben(spieler.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1980,
		klassierung: 'R8'
	});
	const kommentar = 'Ich will mich steigern.';
	await beantrageWildcardDirekt(kategorieId, spieler.mitgliedId, kommentar);
	const mytco = await legeRollenkontoMitBriefCodeAn('Tobias', ['mytco']);

	await meldeAn(page, mytco);
	await page.goto('/verwaltung');
	await bestaetige(page, mytco, 'Mitglieder');
	// Die Mitgliederliste lädt erst nach der Überschrift; page.goto bräche sie sonst ab (WebKit).
	await expect(page.getByRole('status')).toHaveText(/^\d+ Mitglied(er)?$/);
	await page.goto(`/verwaltung/turniere/${turnierId}/kategorien/${kategorieId}`);
	await expect(page.getByRole('heading', { level: 1, name: 'Herren R1–R6' })).toBeVisible();
	await expect(page.getByText('1 Anmeldung, 1 Wildcard-Antrag', { exact: true })).toBeVisible();
	await expect(zeile(page, nachname)).toContainText(kommentar);
	await expect(zeile(page, nachname)).toContainText('Wildcard beantragt');
	for (const taste of [
		'Von Hand anmelden',
		'Entscheiden',
		'Verschieben',
		'Klassierung',
		'Löschen',
		'Kategorie absagen'
	]) {
		await expect(page.getByRole('button', { name: taste })).toHaveCount(0);
	}
	await pruefeBildschirm(page, info, 'cm-anmeldungen-nur-lesen');
	expect(fehler).toEqual([]);
});

test('PC: Pfad und Titel der Kategorie bleiben beim Scrollen sichtbar', async ({ page }, info) => {
	test.skip(info.project.name !== 'desktop', 'nur PC'); // skip: am Handy klebt nur die Kopfleiste (Titel blendet dort ein)
	test.setTimeout(120_000);
	const jahr = testjahr(JAHR_KLEBEN, info);
	const turnier = `Clubmeisterschaft ${jahr}`;
	await legeOffenesTurnierAn(jahr, KATEGORIEN);
	const cm = await legeCmMitBriefCodeAn('Cyrill');
	await page.setViewportSize({ width: 1280, height: 300 });
	await oeffneKategorieAlsCm(page, cm, turnier, 'Herren R1–R6');
	await expect(page.getByText('Noch keine Anmeldungen.')).toBeVisible();

	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
	await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
	await expect(page.getByRole('navigation', { name: 'Pfad' })).toBeInViewport();
});

test('PC: Ein Fokussprung landet nicht unter dem klebenden Seitenkopf', async ({ page }, info) => {
	test.skip(info.project.name !== 'desktop', 'nur PC'); // skip: am Handy klebt nur die Kopfleiste
	test.setTimeout(120_000);
	const jahr = testjahr(JAHR_KLEBEN, info);
	const turnier = `Clubmeisterschaft ${jahr}`;
	await legeOffenesTurnierAn(jahr, KATEGORIEN);
	const cm = await legeCmMitBriefCodeAn('Cyrill');
	await page.setViewportSize({ width: 1280, height: 260 });
	await oeffneKategorieAlsCm(page, cm, turnier, 'Herren R1–R6');
	await page.getByRole('navigation', { name: 'Pfad' }).getByRole('link', { name: turnier }).click();
	await page.getByRole('link', { name: 'Neue Kategorie' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Neue Kategorie' })).toBeVisible();

	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	// Mit Shift+Tab von unten zurück zum Namen: der Browser scrollt nur so weit wie nötig
	const erstes = page.getByLabel('Name', { exact: true });
	await page
		.getByRole('button', { name: /speichern|anlegen|erstellen/i })
		.last()
		.focus();
	for (let i = 0; i < 40 && !(await erstes.evaluate((e) => e === document.activeElement)); i++) {
		await page.keyboard.press('Shift+Tab');
	}
	await expect(erstes).toBeFocused();
	const kopfUnten = await page
		.locator('.seitenkopf')
		.evaluate((e) => e.getBoundingClientRect().bottom);
	const feldOben = await erstes.evaluate((e) => e.getBoundingClientRect().top);
	expect(feldOben).toBeGreaterThanOrEqual(kopfUnten);
});

test('Spielersuche springt nicht', async ({ page }, info) => {
	test.setTimeout(120_000);
	const jahr = testjahr(JAHR_SUCHE, info);
	const turnier = `Clubmeisterschaft ${jahr}`;
	await legeOffenesTurnierAn(jahr, KATEGORIEN);
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	await legeKontoAn('Bruno', nachname);
	const cm = await legeCmMitBriefCodeAn('Cyrill');
	await oeffneKategorieAlsCm(page, cm, turnier, 'Herren R1–R6');
	await page.getByRole('button', { name: 'Von Hand anmelden' }).click();
	const dialog = page.getByRole('dialog', { name: 'Von Hand anmelden' });
	await expect(dialog.getByText('Ab 2 Buchstaben.')).toHaveCount(1);
	// offsetHeight statt boundingBox: Das Einblenden des Dialogs skaliert ihn (transform).
	const hoehe = () => dialog.evaluate((e) => (e as HTMLElement).offsetHeight);
	const h0 = await hoehe();

	await dialog.getByLabel('Mitglied suchen').fill(nachname);
	await expect(dialog.getByRole('radio', { name: new RegExp(`${nachname}, Bruno`) })).toBeVisible();
	expect(Math.abs((await hoehe()) - h0)).toBeLessThanOrEqual(1);

	await dialog.getByLabel('Mitglied suchen').fill('zzq');
	await expect(dialog.getByText('Keine Treffer.')).toBeVisible();
	expect(Math.abs((await hoehe()) - h0)).toBeLessThanOrEqual(1);
});
