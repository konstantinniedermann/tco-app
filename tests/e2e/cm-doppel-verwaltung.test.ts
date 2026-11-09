import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';
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
	meldePaarDirektAn,
	meldeZurCmAn,
	schliesseLoginHilfen,
	setzeAnmeldeschluss,
	setzeAusgetreten,
	setzeSpielerangaben,
	stelleAnfrageDirekt,
	warteAufMail
} from './hilfen/login.ts';
import {
	pruefeBildschirm,
	sammleKonsolenfehler,
	waehleAktion,
	wartetAufVorladen
} from './hilfen/seite.ts';

// CM Teil 3 Etappe 2: Der CM-Admin verwaltet die Doppel einer Kategorie (A-ANMELDUNG-06, FR-46):
// von Hand anmelden, Partner ändern, Suchende zusammenlegen, offene Anfragen als Paar anmelden
// oder löschen. Die Spieler bekommen eine Meldung (FR-47), ohne Push-Abo als Mail in Mailpit.
// Dazu das Mitglied: nur eine offene Anfrage je Kategorie (FR-48).

test.afterAll(async () => {
	await schliesseLoginHilfen();
});

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

/** Zweite Doppel-Kategorie mit denselben Werten: Ziel fürs Verschieben. */
const HERREN_B: KategorieWerte = { ...HERREN, name: 'Herren Doppel B' };

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
	await page.getByRole('link', { name: HERREN.name, exact: true }).click();
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
	const { jahr } = await legeOffenesTurnierAn([HERREN]);
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
	await waehleAktion(page, zeile(page, anton.nachname), 'Partner ändern');
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
	const {
		jahr,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([HERREN]);
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

	await waehleAktion(page, zeile(page, carl.nachname), 'Zusammenlegen');
	const zusammen = page.getByRole('dialog', { name: 'Zusammenlegen' });
	await zusammen.getByRole('radio', { name: new RegExp(`${dario.nachname}, Dario`) }).check();
	await pruefeBildschirm(page, info, 'cm-doppel-zusammenlegen');
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
	const {
		jahr,
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([HERREN]);
	const gian = await legeHerrnAn('Gian', 'R5');
	const hugo = await legeHerrnAn('Hugo', 'R6');
	const ivo = await legeHerrnAn('Ivo', 'R4');
	const jan = await legeHerrnAn('Jan', 'R7');
	const kurt = await legeHerrnAn('Kurt', 'R8');
	await setzeSpielerangaben(gian.mitgliedId, { telefon: '079 555 66 77' });
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
	// K-42: Der CM-Admin erreicht beide Seiten einer offenen Anfrage und den Suchenden.
	await expect(
		zeile(anfragen, gian.nachname).getByRole('link', { name: 'Tel. 079 555 66 77' })
	).toHaveAttribute('href', 'tel:0795556677');
	for (const [wo, wer, s] of [
		[anfragen, gian.nachname, gian],
		[anfragen, gian.nachname, hugo],
		[teil(page, 'Sucht Partner'), kurt.nachname, kurt]
	] as const) {
		await expect(zeile(wo, wer).getByRole('link', { name: `E-Mail ${s.email}` })).toHaveAttribute(
			'href',
			`mailto:${s.email}`
		);
	}

	// Als Paar anmelden: Die Anmeldung ist geschlossen, der CM-Admin meldet trotzdem an.
	await waehleAktion(page, zeile(page, gian.nachname), 'Als Paar anmelden');
	const alsPaar = page.getByRole('dialog', { name: 'Als Paar anmelden?' });
	await expect(alsPaar).toContainText(`${gian.name} / ${hugo.name}`);
	await alsPaar.getByRole('button', { name: 'Als Paar anmelden', exact: true }).click();
	await expect(alsPaar.getByRole('alert')).toHaveText('Anmeldung ist geschlossen.');
	await pruefeBildschirm(page, info, 'cm-doppel-als-paar');
	await alsPaar.getByRole('button', { name: 'Trotzdem anmelden' }).click();
	await expect(alsPaar).toBeHidden();
	await meldetErfolg(page, 'Als Paar angemeldet.');
	await expect(teil(page, 'Paare')).toContainText(gian.nachname);
	await expect(teil(page, 'Paare')).toContainText(hugo.nachname);
	await expect(
		zeile(teil(page, 'Paare'), gian.nachname).getByRole('link', { name: `E-Mail ${hugo.email}` })
	).toBeVisible();
	await expect(teil(page, 'Sucht Partner')).toContainText(kurt.nachname);
	await expect(anfragen.getByRole('row')).toHaveCount(2);
	// Alle drei Tabellen auf einem Bildschirm.
	await pruefeBildschirm(page, info, 'cm-doppel-verwaltung-liste');
	await meldungAn(gian, `Der CM-Admin hat dich mit ${hugo.name} für «${HERREN.name}» angemeldet.`);
	await meldungAn(hugo, `Der CM-Admin hat dich mit ${gian.name} für «${HERREN.name}» angemeldet.`);

	// Anfrage löschen: Ivo erfährt, dass sie hinfällig ist.
	await waehleAktion(page, zeile(page, ivo.nachname), 'Löschen');
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
	const {
		jahr,
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([HERREN]);
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

test('FR-46: CM-Admin verschiebt, korrigiert die Klassierung und löscht; nicht aktive Spieler', async ({
	page
}, info) => {
	test.setTimeout(150_000);
	const fehler = sammleKonsolenfehler(page);
	const {
		jahr,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([HERREN, HERREN_B]);
	// Summe 4 + 5 = 9 und 6 + 7 = 13: Beide Paare passen in beide Kategorien.
	const ole = await legeHerrnAn('Ole', 'R4');
	const pius = await legeHerrnAn('Pius', 'R5');
	const quirin = await legeHerrnAn('Quirin', 'R6');
	const rolf = await legeHerrnAn('Rolf', 'R7');
	const cm = await legeCmMitBriefCodeAn('Clara');
	await meldePaarDirektAn(kategorieId, [ole.mitgliedId, pius.mitgliedId], cm.mitgliedId);
	await meldePaarDirektAn(kategorieId, [quirin.mitgliedId, rolf.mitgliedId], cm.mitgliedId);
	// Rolf tritt nach dem Anmeldeschluss aus: Die Anmeldung bleibt, er ist nicht mehr aktiv.
	await setzeAusgetreten(rolf.mitgliedId);
	await oeffneKategorieAlsCm(page, cm, jahr);
	await expect(zeile(teil(page, 'Paare'), rolf.nachname)).toContainText('ausgetreten');

	// Partner ändern: Wer nicht mehr aktiv ist, kann nicht bleiben.
	await waehleAktion(page, zeile(page, rolf.nachname), 'Partner ändern');
	const partner = page.getByRole('dialog', { name: 'Partner ändern' });
	await expect(
		partner.getByRole('radio', { name: new RegExp(`${rolf.nachname}, Rolf`) })
	).toBeDisabled();
	await expect(partner.getByText('nicht mehr aktiv', { exact: true })).toBeVisible();
	await expect(
		partner.getByRole('radio', { name: new RegExp(`${quirin.nachname}, Quirin`) })
	).toBeEnabled();
	await partner.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(partner).toBeHidden();

	// Verschieben: Der Dialog sagt vor dem Senden, warum es nicht geht; die Taste bleibt gesperrt.
	await waehleAktion(page, zeile(page, rolf.nachname), 'Verschieben');
	const verschieben = page.getByRole('dialog', { name: 'Verschieben' });
	await expect(verschieben).toContainText(
		'Ein Spieler ist nicht mehr aktiv. Verschieben geht nicht; ändere zuerst den Partner oder lösche die Anmeldung.'
	);
	await expect(verschieben.getByRole('radio')).toHaveCount(0);
	await expect(
		verschieben.getByRole('button', { name: 'Verschieben', exact: true })
	).toBeDisabled();
	await pruefeBildschirm(page, info, 'cm-doppel-verschieben-gesperrt');
	await verschieben.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(verschieben).toBeHidden();

	// Verschieben: Ole und Pius gehen in die zweite Kategorie.
	await waehleAktion(page, zeile(page, ole.nachname), 'Verschieben');
	await expect(verschieben).toContainText('· Summe 9');
	await verschieben.getByRole('radio', { name: HERREN_B.name }).check();
	await pruefeBildschirm(page, info, 'cm-doppel-verschieben');
	await verschieben.getByRole('button', { name: 'Verschieben', exact: true }).click();
	await expect(verschieben).toBeHidden();
	await meldetErfolg(page, 'Verschoben.');
	await expect(teil(page, 'Paare')).not.toContainText(ole.nachname);
	await expect(teil(page, 'Paare')).toContainText(quirin.nachname);
	for (const s of [ole, pius]) {
		await meldungAn(
			s,
			`Der CM-Admin hat eure Anmeldung von «${HERREN.name}» nach «${HERREN_B.name}» verschoben.`
		);
	}

	// Klassierung korrigieren: im Paar zuerst den Spieler wählen.
	await waehleAktion(page, zeile(page, quirin.nachname), 'Klassierung');
	const klassierung = page.getByRole('dialog', { name: 'Klassierung korrigieren' });
	const speichern = klassierung.getByRole('button', { name: 'Klassierung speichern' });
	await expect(speichern).toBeDisabled();
	await klassierung.getByRole('radio', { name: new RegExp(`${quirin.nachname}, Quirin`) }).check();
	await klassierung.getByLabel('Klassierung', { exact: true }).selectOption('R8');
	await pruefeBildschirm(page, info, 'cm-doppel-klassierung');
	await speichern.click();
	await expect(klassierung).toBeHidden();
	await meldetErfolg(page, 'Klassierung gespeichert.');
	// Summe 8 + 7 = 15.
	await expect(zeile(teil(page, 'Paare'), quirin.nachname)).toContainText('15');

	// Anmeldung löschen: Quirin erfährt es; Rolf ist ausgetreten.
	await waehleAktion(page, zeile(page, quirin.nachname), 'Löschen');
	const loeschen = page.getByRole('dialog', { name: 'Anmeldung löschen?' });
	await expect(loeschen).toContainText(quirin.name);
	await expect(loeschen).toContainText(rolf.name);
	await pruefeBildschirm(page, info, 'cm-doppel-loeschen');
	await loeschen.getByRole('button', { name: 'Löschen', exact: true }).click();
	await expect(loeschen).toBeHidden();
	await meldetErfolg(page, 'Gelöscht.');
	await expect(teil(page, 'Paare')).toContainText('Keine.');
	await meldungAn(quirin, `Der CM-Admin hat eure Anmeldung für «${HERREN.name}» gelöscht.`);
	expect(fehler).toEqual([]);
});

test('PC: Anfrage mit zwei Tasten bleibt ohne «Ändern»', async ({ page }, info) => {
	test.skip(info.project.name !== 'desktop', 'nur PC'); // skip: einzeilig erst ab 60rem; am Handy scrollt die Tabelle waagrecht
	test.setTimeout(120_000);
	const fehler = sammleKonsolenfehler(page);
	const {
		jahr,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([HERREN]);
	const sandro = await legeHerrnAn('Sandro', 'R4');
	const timo = await legeHerrnAn('Timo', 'R5');
	const urs = await legeHerrnAn('Urs', 'R6');
	const vito = await legeHerrnAn('Vito', 'R7');
	const cm = await legeCmMitBriefCodeAn('Chiara');
	await meldePaarDirektAn(kategorieId, [sandro.mitgliedId, timo.mitgliedId], cm.mitgliedId);
	await gibLogin(vito.kontoId);
	await stelleAnfrageDirekt(kategorieId, urs.mitgliedId, vito.mitgliedId);
	// K-42: mit Telefon und E-Mail aller Beteiligten, der breiteste Fall der Spalte «Kontakt».
	for (const s of [sandro, timo, urs, vito])
		await setzeSpielerangaben(s.mitgliedId, { telefon: '+41 79 123 45 67' });
	await oeffneKategorieAlsCm(page, cm, jahr);

	// Anfrage: zwei Aktionen, beide als Taste in einer Zeile.
	const anfrage = zeile(teil(page, 'Offene Anfragen'), urs.nachname);
	await expect(anfrage.getByRole('button')).toHaveText(['Als Paar anmelden', 'Löschen']);
	await expect(anfrage.getByRole('button', { name: 'Ändern', exact: true })).toHaveCount(0);
	expect((await anfrage.boundingBox())?.height).toBeLessThanOrEqual(72);

	// Paar: vier Aktionen hinter «Ändern»; jeder Spieler steht einzeilig in seiner Zeile.
	const paar = zeile(teil(page, 'Paare'), sandro.nachname);
	await expect(paar.getByRole('button')).toHaveText(['Ändern']);
	for (const s of [sandro, timo]) {
		const name = paar.getByText(`${s.nachname}, ${s.name.split(' ')[0]}`, { exact: true });
		expect(await name.evaluate((e) => e.getClientRects().length)).toBe(1);
	}
	await paar.getByRole('button', { name: 'Ändern', exact: true }).click();
	const aendern = page.getByRole('dialog', { name: 'Ändern', exact: true });
	// Der Dialog nennt beide Spieler.
	await expect(aendern).toContainText(sandro.nachname);
	await expect(aendern).toContainText(timo.nachname);
	await expect(aendern.getByRole('button')).toHaveText([
		'Partner ändern',
		'Verschieben',
		'Klassierung',
		'Löschen',
		'Abbrechen'
	]);
	await pruefeBildschirm(page, info, 'cm-doppel-aendern');
	await aendern.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(aendern).toBeHidden();
	expect(fehler).toEqual([]);
});
