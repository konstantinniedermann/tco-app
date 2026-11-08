import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import type { Klassierung } from '../../src/lib/turnier/klassierung.ts';
import { startetVomSymbol } from './hilfen/geraet.ts';
import {
	gibLogin,
	holeMailCode,
	legeCmMitBriefCodeAn,
	legeKontoAn,
	legeKontoMitBriefCodeAn,
	legeOffenesTurnierAn,
	meldeZurCmAn,
	schliesseLoginHilfen,
	setzeAnmeldeschluss,
	setzeSpielerangaben,
	stelleAnfrageDirekt,
	warteAufMail
} from './hilfen/login.ts';
import { pruefeBildschirm, sammleKonsolenfehler, wartetAufVorladen } from './hilfen/seite.ts';

// CM Teil 3 Etappe 2: Der CM-Admin verwaltet die Doppel einer Kategorie (A-ANMELDUNG-06, FR-46):
// von Hand anmelden, Partner ändern, Suchende zusammenlegen, offene Anfragen als Paar anmelden
// oder löschen. Die Spieler bekommen eine Meldung (FR-47), ohne Push-Abo als Mail in Mailpit.
// Dazu das Mitglied: nur eine offene Anfrage je Kategorie (FR-48).

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

// Pro Jahr gibt es ein Turnier; jedes Projekt und jeder Test hat sein festes Jahr, getrennt von
// den übrigen E2E-Tests (2075–2099). `legeOffenesTurnierAn` löscht das Turnier des Jahres vorher.
const JAHR_VON_HAND: Record<string, number> = { iphone: 2074, android: 2073, desktop: 2072 };
const JAHR_ZUSAMMEN: Record<string, number> = { iphone: 2071, android: 2070, desktop: 2069 };
const JAHR_ANFRAGEN: Record<string, number> = { iphone: 2068, android: 2067, desktop: 2066 };
const JAHR_EINE_ANFRAGE: Record<string, number> = { iphone: 2065, android: 2064 };

function testjahr(jahre: Record<string, number>, info: TestInfo): number {
	const jahr = jahre[info.project.name];
	if (!jahr) throw new Error(`Kein Testjahr für das Projekt ${info.project.name}`);
	return jahr;
}

// Summe der Klassierungen mindestens 9 (R1 = 1 … R9 = 9).
const HERREN: KategorieWerte = {
	name: 'Herren Doppel',
	geschlecht: 'herren',
	art: 'doppel',
	jahrgangVon: null,
	jahrgangBis: null,
	klassierungVon: null,
	klassierungBis: null,
	mindestsumme: 9
};

type Konto = Awaited<ReturnType<typeof legeKontoMitBriefCodeAn>>;
type Spieler = {
	mitgliedId: number;
	kontoId: number;
	email: string;
	name: string;
	nachname: string;
};

/**
 * Erfundener Herr mit Klassierung, ohne Login; der Nachname ist pro Lauf eindeutig (die
 * E2E-Datenbank überdauert die Läufe). `name` ist die kurze Textform der Meldungen.
 */
async function legeHerrnAn(vorname: string, klassierung: Klassierung): Promise<Spieler> {
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	const k = await legeKontoAn(vorname, nachname);
	await setzeSpielerangaben(k.mitgliedId, { geschlecht: 'm', jahrgang: 1985, klassierung });
	return { ...k, name: `${vorname} ${nachname}`, nachname };
}

async function meldeAn(page: Page, konto: Pick<Konto, 'code' | 'vorname'>) {
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(konto.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${konto.vorname}` })).toBeVisible();
	// Die Reiter laden den Code ihrer Seiten vor; ein folgendes page.goto bräche das ab.
	await wartetAufVorladen(page);
}

/** CM-Admin vom Startbildschirm über die Verwaltung (Code aus der Mail, SI-08) zur Kategorie. */
async function oeffneKategorieAlsCm(page: Page, cm: Konto, jahr: number) {
	const turnier = `Clubmeisterschaft ${jahr}`;
	await meldeAn(page, cm);
	await page.getByRole('link', { name: 'Verwaltung' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Verwaltung öffnen' })).toBeVisible();
	await page.getByRole('button', { name: 'Code schicken' }).click();
	await page.getByLabel('Code aus der Mail').fill(await holeMailCode(cm.email));
	await page.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Clubmeisterschaft' })).toBeVisible();
	await page.getByRole('link', { name: turnier }).click();
	await expect(page.getByRole('heading', { level: 1, name: turnier })).toBeVisible();
	await page.getByRole('link', { name: HERREN.name }).click();
	await expect(page.getByRole('heading', { level: 1, name: HERREN.name })).toBeVisible();
}

/** Teil der Doppel-Liste (Paare, Sucht Partner, Offene Anfragen), gefunden über die Überschrift. */
const teil = (page: Page, name: string) =>
	page.locator('.karte-teil').filter({
		has: page.getByRole('heading', { level: 3, name: new RegExp(`^${name} \\(\\d+\\)$`) })
	});

const zeile = (wo: Page | Locator, nachname: string) =>
	wo.getByRole('row', { name: new RegExp(nachname) });

/** Die Erfolgsmeldung nach einer Aktion; der Fokus steht auf ihr (UI-Leitbild). */
async function meldetErfolg(page: Page, satz: string) {
	const meldung = page.getByText(satz, { exact: true });
	await expect(meldung).toBeVisible();
	await expect(meldung).toBeFocused();
}

const meldungAn = (s: Spieler, text: string) =>
	warteAufMail(s.email, 'Clubmeisterschaft', text).then((mail) => {
		expect(mail).not.toMatch(/\d{3} \d{3} \d{2} \d{2}/);
		return mail;
	});

test('A-ANMELDUNG-06, FR-46: CM-Admin meldet ein Paar von Hand an und ändert den Partner', async ({
	page
}, info) => {
	test.setTimeout(150_000);
	const fehler = sammleKonsolenfehler(page);
	const jahr = testjahr(JAHR_VON_HAND, info);
	await legeOffenesTurnierAn(jahr, [HERREN]);
	// Summe 1 + 2 = 3 liegt unter der Mindestsumme 9.
	const anton = await legeHerrnAn('Anton', 'R1');
	const beat = await legeHerrnAn('Beat', 'R2');
	const cm = await legeCmMitBriefCodeAn('Cyrill');
	await oeffneKategorieAlsCm(page, cm, jahr);
	await expect(teil(page, 'Paare')).toContainText('Keine.');

	// Von Hand anmelden: Das Paar passt nicht, der CM-Admin meldet es trotzdem an.
	await page.getByRole('button', { name: 'Von Hand anmelden' }).click();
	const anmelden = page.getByRole('dialog', { name: 'Von Hand anmelden' });
	await anmelden.getByLabel('Mitglied suchen').fill(anton.nachname);
	await anmelden.getByRole('radio', { name: new RegExp(`${anton.nachname}, Anton`) }).check();
	await anmelden.getByLabel('Partner suchen (freiwillig)').fill(beat.nachname);
	await anmelden.getByRole('radio', { name: new RegExp(`${beat.nachname}, Beat`) }).check();
	await expect(anmelden).toContainText('R2 · männlich · 1985');
	await anmelden.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(anmelden.getByRole('alert')).toHaveText('Passt nicht zur Kategorie.');
	await pruefeBildschirm(page, info, 'cm-doppel-von-hand-warnung');
	await anmelden.getByRole('button', { name: 'Trotzdem anmelden' }).click();
	await expect(anmelden).toBeHidden();
	await meldetErfolg(page, 'Angemeldet.');
	await expect(zeile(teil(page, 'Paare'), anton.nachname)).toContainText(beat.nachname);

	// FR-47: Beide erfahren es, mit dem Namen des anderen, ohne den CM-Admin beim Namen.
	for (const [wer, partner] of [
		[anton, beat],
		[beat, anton]
	]) {
		const mail = await meldungAn(
			wer,
			`Der CM-Admin hat dich mit ${partner.name} für «${HERREN.name}» angemeldet.`
		);
		expect(mail).not.toContain('Cyrill');
	}

	// Partner ändern ohne Ersatz: Anton bleibt und sucht danach selbst.
	await zeile(page, anton.nachname).getByRole('button', { name: 'Partner ändern' }).click();
	const partner = page.getByRole('dialog', { name: 'Partner ändern' });
	// Die Reihenfolge im Paar folgt den Nachnamen, die pro Lauf neu sind.
	await expect(partner).toContainText(anton.name);
	await expect(partner).toContainText(beat.name);
	await expect(partner).toContainText('· Summe 3');
	await partner.getByRole('radio', { name: new RegExp(`${anton.nachname}, Anton`) }).check();
	await expect(partner).toContainText(`Leer lassen: ${anton.name} sucht danach selbst.`);
	await pruefeBildschirm(page, info, 'cm-doppel-partner-aendern');
	await partner.getByRole('button', { name: 'Partner ändern', exact: true }).click();
	await expect(partner).toBeHidden();
	await meldetErfolg(page, 'Partner geändert.');
	await expect(teil(page, 'Paare')).toContainText('Keine.');
	await expect(teil(page, 'Sucht Partner')).toContainText(anton.nachname);
	await expect(teil(page, 'Sucht Partner')).not.toContainText(beat.nachname);

	await meldungAn(
		beat,
		`Der CM-Admin hat dich aus dem Doppel mit ${anton.name} für «${HERREN.name}» genommen.`
	);
	await meldungAn(
		anton,
		`Der CM-Admin hat deinen Partner aus «${HERREN.name}» genommen. Du suchst jetzt einen Partner.`
	);
	expect(fehler).toEqual([]);
});

test('FR-46, FR-49: zwei Suchende zusammenlegen', async ({ page }, info) => {
	test.setTimeout(120_000);
	const fehler = sammleKonsolenfehler(page);
	const jahr = testjahr(JAHR_ZUSAMMEN, info);
	const {
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn(jahr, [HERREN]);
	const carl = await legeHerrnAn('Carl', 'R5');
	const dario = await legeHerrnAn('Dario', 'R6');
	const kommentarCarl = 'Spiele lieber abends.';
	const kommentarDario = 'Suche jemanden mit starkem Aufschlag.';
	await meldeZurCmAn(kategorieId, carl.mitgliedId, kommentarCarl);
	await meldeZurCmAn(kategorieId, dario.mitgliedId, kommentarDario);
	const cm = await legeCmMitBriefCodeAn('Corinne');
	await oeffneKategorieAlsCm(page, cm, jahr);
	await expect(zeile(page, carl.nachname)).toContainText(kommentarCarl);
	await expect(zeile(page, dario.nachname)).toContainText(kommentarDario);

	await zeile(page, carl.nachname).getByRole('button', { name: 'Zusammenlegen' }).click();
	const zusammen = page.getByRole('dialog', { name: 'Zusammenlegen' });
	await zusammen.getByRole('radio', { name: new RegExp(`${dario.nachname}, Dario`) }).check();
	await zusammen.getByRole('button', { name: 'Zusammenlegen', exact: true }).click();
	await expect(zusammen).toBeHidden();
	await meldetErfolg(page, 'Zusammengelegt.');
	await expect(teil(page, 'Sucht Partner')).toContainText('Keine.');
	await expect(teil(page, 'Paare')).toContainText(carl.nachname);
	await expect(teil(page, 'Paare')).toContainText(dario.nachname);
	// FR-49: Mit dem Paar sind die Kommentare weg.
	await expect(page.getByText(kommentarCarl)).toHaveCount(0);
	await expect(page.getByText(kommentarDario)).toHaveCount(0);

	await meldungAn(carl, `Der CM-Admin hat dich mit ${dario.name} für «${HERREN.name}» angemeldet.`);
	await meldungAn(dario, `Der CM-Admin hat dich mit ${carl.name} für «${HERREN.name}» angemeldet.`);
	expect(fehler).toEqual([]);
});

test('FR-48: offene Anfrage als Paar anmelden und löschen', async ({ page }, info) => {
	test.setTimeout(150_000);
	const fehler = sammleKonsolenfehler(page);
	const jahr = testjahr(JAHR_ANFRAGEN, info);
	const {
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn(jahr, [HERREN]);
	const gian = await legeHerrnAn('Gian', 'R5');
	const hugo = await legeHerrnAn('Hugo', 'R6');
	const ivo = await legeHerrnAn('Ivo', 'R4');
	const jan = await legeHerrnAn('Jan', 'R7');
	const kurt = await legeHerrnAn('Kurt', 'R8');
	// Angefragt werden kann nur, wer ein Login hat.
	await gibLogin(hugo.kontoId);
	await gibLogin(jan.kontoId);
	await stelleAnfrageDirekt(kategorieId, gian.mitgliedId, hugo.mitgliedId);
	await stelleAnfrageDirekt(kategorieId, ivo.mitgliedId, jan.mitgliedId);
	await meldeZurCmAn(kategorieId, kurt.mitgliedId, 'Gerne auch spontan.');
	// Nach dem Anmeldeschluss ändern Mitglieder an den Anfragen nichts mehr; der CM-Admin schon.
	await setzeAnmeldeschluss(turnierId, '2026-01-31');
	const cm = await legeCmMitBriefCodeAn('Celine');
	await oeffneKategorieAlsCm(page, cm, jahr);
	const anfragen = teil(page, 'Offene Anfragen');
	await expect(anfragen.getByRole('row')).toHaveCount(3);

	// Als Paar anmelden: Die Anmeldung ist geschlossen, der CM-Admin meldet trotzdem an.
	await zeile(page, gian.nachname).getByRole('button', { name: 'Als Paar anmelden' }).click();
	const alsPaar = page.getByRole('dialog', { name: 'Als Paar anmelden?' });
	await expect(alsPaar).toContainText(`${gian.name} / ${hugo.name}`);
	await alsPaar.getByRole('button', { name: 'Als Paar anmelden', exact: true }).click();
	await expect(alsPaar.getByRole('alert')).toHaveText('Anmeldung ist geschlossen.');
	await alsPaar.getByRole('button', { name: 'Trotzdem anmelden' }).click();
	await expect(alsPaar).toBeHidden();
	await meldetErfolg(page, 'Als Paar angemeldet.');
	await expect(teil(page, 'Paare')).toContainText(gian.nachname);
	await expect(teil(page, 'Paare')).toContainText(hugo.nachname);
	await expect(teil(page, 'Sucht Partner')).toContainText(kurt.nachname);
	await expect(anfragen.getByRole('row')).toHaveCount(2);
	// Alle drei Tabellen auf einem Bildschirm.
	await pruefeBildschirm(page, info, 'cm-doppel-verwaltung-liste');
	await meldungAn(gian, `Der CM-Admin hat dich mit ${hugo.name} für «${HERREN.name}» angemeldet.`);
	await meldungAn(hugo, `Der CM-Admin hat dich mit ${gian.name} für «${HERREN.name}» angemeldet.`);

	// Anfrage löschen: Ivo erfährt, dass sie hinfällig ist.
	await zeile(page, ivo.nachname).getByRole('button', { name: 'Löschen' }).click();
	const loeschen = page.getByRole('dialog', { name: 'Anfrage löschen?' });
	await expect(loeschen).toContainText(`${ivo.name} erfährt es.`);
	await loeschen.getByRole('button', { name: 'Löschen', exact: true }).click();
	await expect(loeschen).toBeHidden();
	await meldetErfolg(page, 'Anfrage gelöscht.');
	await expect(anfragen).toContainText('Keine.');
	await meldungAn(ivo, `Deine Anfrage an ${jan.name} für «${HERREN.name}» ist hinfällig.`);
	expect(fehler).toEqual([]);
});

test('FR-48: nur eine offene Anfrage je Kategorie (Mitglied)', async ({ page }, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: Mitglieder fragen am Handy an; die Verwaltung am Computer prüfen die Tests oben
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const jahr = testjahr(JAHR_EINE_ANFRAGE, info);
	const {
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn(jahr, [HERREN]);
	// Ein gemeinsamer Zusatz im Nachnamen: Die Suche danach findet Marco und Nico.
	const zusatz = randomUUID().slice(0, 6);
	const leo = await legeKontoMitBriefCodeAn('Leo', `Probe${zusatz}`);
	await setzeSpielerangaben(leo.mitgliedId, { geschlecht: 'm', jahrgang: 1991, klassierung: 'R4' });
	const marcoName = `Marco Muster${zusatz}`;
	for (const [vorname, nachname, klassierung] of [
		['Marco', `Muster${zusatz}`, 'R5'],
		['Nico', `Beispiel${zusatz}`, 'R6']
	] as const) {
		const k = await legeKontoAn(vorname, nachname);
		await setzeSpielerangaben(k.mitgliedId, { geschlecht: 'm', jahrgang: 1990, klassierung });
		await gibLogin(k.kontoId);
	}

	await startetVomSymbol(page);
	await meldeAn(page, leo);
	await page.goto(`/clubmeisterschaft/${turnierId}/doppel/${kategorieId}`);
	await expect(page.getByRole('heading', { level: 1, name: HERREN.name })).toBeVisible();
	await page.getByLabel('Partner suchen').fill(zusatz);
	const treffer = page.getByRole('list', { name: 'Treffer' }).getByRole('listitem');
	await expect(treffer).toHaveCount(2);
	await expect(treffer.getByRole('button', { name: 'Anfragen', exact: true })).toHaveCount(2);
	await treffer
		.filter({ hasText: marcoName })
		.getByRole('button', { name: 'Anfragen', exact: true })
		.click();
	await page
		.getByRole('dialog', { name: `${marcoName} anfragen?` })
		.getByRole('button', { name: 'Anfrage senden' })
		.click();
	await expect(
		page.getByRole('heading', { level: 1, name: `Clubmeisterschaft ${jahr}` })
	).toBeVisible();
	await expect(page.getByRole('status')).toHaveText(`Anfrage an ${marcoName} gesendet.`);

	// Zurück auf der Anmelde-Seite: der Satz zur offenen Anfrage, keine Taste «Anfragen» mehr.
	await page.goto(`/clubmeisterschaft/${turnierId}/doppel/${kategorieId}`);
	await expect(page.getByRole('heading', { level: 1, name: HERREN.name })).toBeVisible();
	await expect(
		page.getByText(
			`Du hast ${marcoName} angefragt. Zieh die Anfrage zurück, um jemand anderen anzufragen.`
		)
	).toBeVisible();
	await page.getByLabel('Partner suchen').fill(zusatz);
	await expect(treffer).toHaveCount(2);
	await expect(
		treffer.filter({ hasText: marcoName }).getByRole('button', { name: 'Zurückziehen' })
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Anfragen', exact: true })).toHaveCount(0);
	await pruefeBildschirm(page, info, 'cm-doppel-eine-anfrage');
	expect(fehler).toEqual([]);
});
