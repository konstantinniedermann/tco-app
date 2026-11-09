import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	holeMailCode,
	legeCmMitBriefCodeAn,
	legeKontoAn,
	legeKontoMitBriefCodeAn,
	legeOffenesTurnierAn,
	legeRollenkontoMitBriefCodeAn,
	meldeZurCmAn,
	schliesseLoginHilfen,
	setzeKontaktperson,
	setzeRufname,
	setzeSpielerangaben
} from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// CM Teil 2: Mitglieder melden sich am Handy zu Einzel-Kategorien an (A-ANMELDUNG-01 bis -03,
// FR-37); die CM-Verwaltung wird gewarnt und kann nicht absagen (FR-35, FR-36).

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

const einzel = (
	name: string,
	geschlecht: KategorieWerte['geschlecht'],
	von: 'R1' | 'R4',
	jahrgangBis: number | null = null
): KategorieWerte => ({
	name,
	geschlecht,
	art: 'einzel',
	jahrgangVon: null,
	jahrgangBis,
	klassierungVon: von,
	klassierungBis: 'R9',
	mindestsumme: null
});

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

const DAMEN_DOPPEL: KategorieWerte = { ...MIXED, name: 'Damen Doppel', geschlecht: 'damen' };

type Konto = Awaited<ReturnType<typeof legeKontoMitBriefCodeAn>>;

async function meldeAn(page: Page, konto: Konto) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	// Die Reiter laden den Code ihrer Seiten vor; ein folgendes page.goto bräche das ab.
	await wartetAufVorladen(page);
}

/** Karte einer Kategorie auf der CM-Seite, gefunden über ihren Namen. */
const karte = (page: Page, name: string) =>
	page.locator('div.karte').filter({ has: page.getByText(name, { exact: true }) });

/** Plakette mit dem eigenen Stand im Kopf einer Karte. */
const plakette = (page: Page, name: string, text: string) =>
	karte(page, name).locator('.karte-kopf .plakette', { hasText: text });

test('A-ANMELDUNG-01, A-ANMELDUNG-02, A-ANMELDUNG-03, FR-37: Mitglied ergänzt Angaben, meldet sich an und ab', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder melden sich am Handy an; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const { turnierId, jahr } = await legeOffenesTurnierAn([
		einzel('Herren R1–R9', 'herren', 'R1'),
		einzel('Herren R4–R9', 'herren', 'R4'),
		einzel('Offen R1–R9', 'offen', 'R1'),
		einzel('Herren Jahrgang bis 1991', 'herren', 'R1', 1991),
		einzel('Damen R1–R9', 'damen', 'R1'),
		MIXED,
		DAMEN_DOPPEL
	]);
	const name = `Clubmeisterschaft ${jahr}`;
	// Ohne Klassierung und Geschlecht; der Jahrgang steht schon (wie aus Fairgate).
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	const mitglied = await legeKontoMitBriefCodeAn('Moritz', nachname);
	await setzeSpielerangaben(mitglied.mitgliedId, { jahrgang: 1990 });
	const leitung = `Leitung${info.project.name}`;
	const cmAdmin = await legeRollenkontoMitBriefCodeAn('Leonie', ['cm'], leitung);
	await setzeKontaktperson(turnierId, cmAdmin.mitgliedId);
	const kontaktSatz = `Kontaktperson: Leonie ${leitung} (CM-Admin)`;

	await startetVomSymbol(page);
	await meldeAn(page, mitglied);

	// A-ANMELDUNG-02: Kachel auf der Startseite (andere Turniere können daneben stehen).
	const kachel = page.getByRole('link', { name: new RegExp(name) });
	await expect(kachel).toContainText('Anmeldung bis');
	await expect(kachel).toContainText('Noch keine Anmeldung');
	await kachel.click();
	await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();

	// FR-37: Die Seite fragt nur nach dem, was fehlt.
	await expect(
		page.getByRole('heading', { level: 2, name: 'Deine Angaben für die Clubmeisterschaft' })
	).toBeVisible();
	await expect(page.getByLabel('Klassierung')).toBeVisible();
	await expect(page.getByRole('radiogroup', { name: 'Geschlecht' })).toBeVisible();
	await expect(page.getByLabel('Jahrgang')).toHaveCount(0);
	// Die Kontaktperson steht auch, solange noch Angaben fehlen.
	await expect(page.getByText(kontaktSatz, { exact: true })).toBeVisible();
	await pruefeBildschirm(page, info, 'cm-angaben');
	await page.getByLabel('Klassierung').selectOption('R6');
	await page.getByLabel('Mann').check();
	await page.getByRole('button', { name: 'Weiter zu den Kategorien' }).click();

	// A-ANMELDUNG-03, FR-07: nur passende Kategorien; die Damen-Kategorien fehlen, das Mixed passt
	// (Doppel ohne Jahrgang, die Mindestsumme prüft erst die Partnerwahl).
	// Kein Zähler: Kontingente zeigt die Seite erst, wenn die Grenze erreicht ist.
	await expect(page.getByText(/von 3 Anmeldungen/)).toHaveCount(0);
	await expect(karte(page, 'Herren R1–R9')).toBeVisible();
	await expect(page.getByText(kontaktSatz, { exact: true })).toBeVisible();
	await expect(page.getByText('Zu starke Paare', { exact: false })).toHaveCount(0);
	await expect(karte(page, 'Herren R4–R9')).toBeVisible();
	await expect(karte(page, 'Offen R1–R9')).toBeVisible();
	await expect(karte(page, 'Herren Jahrgang bis 1991')).toBeVisible();
	await expect(page.getByText('Damen R1–R9')).toHaveCount(0);
	await expect(page.getByText('Mixed Doppel', { exact: true })).toBeVisible();
	await expect(page.getByText('Damen Doppel')).toHaveCount(0);

	// A-ANMELDUNG-01: erste Anmeldung mit Rückfrage zu den Kontaktdaten.
	await karte(page, 'Herren R1–R9').getByRole('button', { name: 'Anmelden' }).click();
	const hinweis = page.getByRole('dialog', { name: 'Bevor du dich anmeldest' });
	await expect(hinweis).toContainText('E-Mail-Adresse und Telefonnummer');
	await hinweis.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('status')).toHaveText(
		'Angemeldet für Herren R1–R9. Die Bestätigung kommt per Mail.'
	);
	// Der eigene Stand steht als Plakette im Kopf der Karte; Namen stehen nicht in der Übersicht.
	await expect(plakette(page, 'Herren R1–R9', 'angemeldet')).toBeVisible();
	await expect(plakette(page, 'Herren R4–R9', 'angemeldet')).toHaveCount(0);
	// Der Linkname nennt die Kategorie, damit gleich lautende Links unterscheidbar sind.
	await expect(
		karte(page, 'Herren R1–R9').getByRole('link', {
			name: 'Herren R1–R9: 1 angemeldet',
			exact: true
		})
	).toBeVisible();
	await expect(karte(page, 'Herren R1–R9')).not.toContainText(`Moritz ${nachname}`);
	await pruefeBildschirm(page, info, 'cm-angemeldet');

	// A-ANMELDUNG-02, FR-06: höchstens drei; danach sind die übrigen Tasten gesperrt.
	await karte(page, 'Herren R4–R9').getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('status')).toHaveText(
		'Angemeldet für Herren R4–R9. Die Bestätigung kommt per Mail.'
	);
	await karte(page, 'Offen R1–R9').getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('status')).toHaveText(
		'Angemeldet für Offen R1–R9. Die Bestätigung kommt per Mail.'
	);
	await expect(
		page.getByText('Mehr als 3 Anmeldungen gehen nicht. Melde dich zuerst irgendwo ab.')
	).toBeVisible();
	const vierte = karte(page, 'Herren Jahrgang bis 1991').getByRole('button', { name: 'Anmelden' });
	await expect(vierte).toBeDisabled();

	// FR-10: abmelden gibt einen Platz frei.
	await karte(page, 'Offen R1–R9').getByRole('button', { name: 'Abmelden' }).click();
	await expect(page.getByRole('status')).toHaveText('Abgemeldet von Offen R1–R9.');
	await expect(vierte).toBeEnabled();
	await expect(plakette(page, 'Offen R1–R9', 'angemeldet')).toHaveCount(0);
	await expect(
		karte(page, 'Offen R1–R9').getByRole('link', { name: 'Noch niemand angemeldet' })
	).toBeVisible();

	// Die Kachel auf der Startseite nennt den neuen Stand.
	await page
		.getByRole('navigation', { name: 'Hauptnavigation' })
		.getByRole('link', { name: 'Start', exact: true })
		.click();
	await expect(kachel).toContainText('2 Anmeldungen');
	expect(fehler).toEqual([]);
});

test('FR-36, FR-35: CM-Admin wird gewarnt und kann eine Kategorie mit Anmeldungen nicht absagen', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Die Verwaltung am Computer prüft turnier.test.ts; hier reicht der Nachweis auf iPhone und Android
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const {
		jahr,
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([einzel('Herren R1–R9', 'herren', 'R1')]);
	const name = `Clubmeisterschaft ${jahr}`;
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	const spieler = await legeKontoAn('Johannes', nachname);
	await setzeSpielerangaben(spieler.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1985,
		klassierung: 'R3'
	});
	await setzeRufname(spieler.mitgliedId, 'Hannes');
	await meldeZurCmAn(kategorieId, spieler.mitgliedId);

	const cm = await legeCmMitBriefCodeAn('Carla');
	await meldeAn(page, cm);
	await page.getByRole('link', { name: 'Verwaltung' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' })).toBeVisible();
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(cm.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Clubmeisterschaft' })).toBeVisible();

	// Die Turnierseite zählt die aktive Anmeldung.
	await page.getByRole('link', { name }).click();
	await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
	await expect(
		page
			.getByRole('row', { name: /Herren R1–R9/ })
			.getByRole('cell')
			.last()
	).toHaveText('1');
	await page.getByRole('link', { name: 'Herren R1–R9' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Herren R1–R9' })).toBeVisible();

	// Die Anmeldezeile zeigt den Rufnamen, dahinter leise den amtlichen Namen (Nachname zuerst).
	const anmeldezeile = page.getByRole('row', { name: new RegExp(nachname) });
	await expect(anmeldezeile).toContainText('Hannes');
	await expect(anmeldezeile.locator('.leise').first()).toHaveText(`${nachname}, Johannes`);
	await pruefeBildschirm(page, info, 'cm-turnierleitung-rufname');

	// FR-35: statt der Taste der Satz, warum Absagen nicht geht.
	await expect(
		page.getByText(
			'Diese Kategorie hat 1 aktive Anmeldung. Absagen geht erst, wenn keine mehr da ist.'
		)
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Kategorie absagen' })).toHaveCount(0);

	// Eine Berührung des Rücklinks ohne Seitenwechsel (Scrollen am Handy) lädt die Turnierseite
	// vor dem Speichern vor; der Rücksprung danach muss trotzdem den neuen Stand zeigen.
	const vorgeladen = page.waitForResponse((r) =>
		new URL(r.url()).pathname.endsWith(`/turniere/${turnierId}`)
	);
	await page.getByRole('link', { name: `‹ ${name}` }).dispatchEvent('touchstart');
	await vorgeladen;

	// FR-36: R7–R9 schliesst den R3-Spieler aus; Rückfrage, dann trotzdem speichern.
	await page.getByLabel('von (stärkste)').selectOption('R7');
	await page.getByRole('button', { name: 'Kategorie speichern' }).click();
	const warnung = page.getByRole('dialog', { name: 'Anmeldungen passen nicht mehr' });
	await expect(warnung).toContainText(
		'1 Anmeldung passt nach der Änderung nicht mehr zu dieser Kategorie. Sie bleibt trotzdem stehen.'
	);
	await pruefeBildschirm(page, info, 'cm-warnung');
	await warnung.getByRole('button', { name: 'Trotzdem speichern' }).click();
	await expect(page.getByText('Gespeichert', { exact: true })).toBeVisible();
	await expect(warnung).toBeHidden();
	await expect(page.getByLabel('von (stärkste)')).toHaveValue('R7');
	await expect(page.getByRole('button', { name: 'Kategorie absagen' })).toHaveCount(0);
	await page.getByRole('link', { name: `‹ ${name}` }).click();
	await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
	await expect(page.getByRole('row', { name: /Herren R1–R9/ })).toContainText('R7–R9');
	expect(fehler).toEqual([]);
});

test('Rufname: Teilnehmerliste zeigt Rufname mit amtlichem Namen', async ({ page }, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder sehen die Liste am Handy; die Darstellung selbst prüfen die Einheitstests
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const {
		jahr,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([einzel('Herren R1–R9', 'herren', 'R1')]);
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	const spieler = await legeKontoAn('Johannes', nachname);
	await setzeSpielerangaben(spieler.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1985,
		klassierung: 'R3'
	});
	await setzeRufname(spieler.mitgliedId, 'Hannes');
	await meldeZurCmAn(kategorieId, spieler.mitgliedId);

	// Ein anderes Mitglied sieht die Liste.
	const betrachter = await legeKontoMitBriefCodeAn('Moritz', `Probe${randomUUID().slice(0, 6)}`);
	await setzeSpielerangaben(betrachter.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1990,
		klassierung: 'R6'
	});
	await startetVomSymbol(page);
	await meldeAn(page, betrachter);
	await page.getByRole('link', { name: new RegExp(`Clubmeisterschaft ${jahr}`) }).click();
	// Ohne Kontaktperson fehlt der Satz; die Namen stehen nicht in der Übersicht.
	await expect(page.getByRole('heading', { level: 2, name: 'Fragen oder Probleme?' })).toHaveCount(
		0
	);
	await expect(karte(page, 'Herren R1–R9')).not.toContainText(nachname);
	// Die Seite der Kategorie listet die Namen, mit Rufname und amtlichem Namen.
	await karte(page, 'Herren R1–R9').getByRole('link', { name: '1 angemeldet' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Herren R1–R9' })).toBeVisible();
	await expect(page.getByRole('link', { name: `‹ Clubmeisterschaft ${jahr}` })).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: 'Angemeldet (1)' })).toBeVisible();
	// Baustein Name: Rufname, daneben leise der amtliche Name.
	await expect(page.getByRole('listitem')).toHaveText(`Hannes Johannes ${nachname}`);
	await pruefeBildschirm(page, info, 'cm-rufname');
	// Eine Kategorie, die es hier nicht gibt, führt zurück zur Seite der CM.
	const url = new URL(page.url());
	await page.goto(url.pathname.replace(/kategorie\/\d+$/, 'kategorie/999999'));
	await expect(
		page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
	).toBeVisible();
	expect(fehler).toEqual([]);
});
