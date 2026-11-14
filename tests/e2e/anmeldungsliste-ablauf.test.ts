import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { MELDUNG } from '../../src/lib/login/anmelden.ts';
import { formatiereBriefCode } from '../../src/lib/server/login/codes.ts';
import type { KategorieWerte } from '../../src/lib/server/turnier/angaben.ts';
import {
	beantrageWildcardDirekt,
	bestaetigeVerwaltungDirekt,
	legeCmMitBriefCodeAn,
	legeKontoAn,
	legeOffenesTurnierAn,
	meldeZurCmAn,
	schliesseLoginHilfen,
	setzeAnmeldeschluss,
	setzeSpielerangaben
} from './hilfen/login.ts';
import { sammleKonsolenfehler, waehleAktion, wartetAufVorladen } from './hilfen/seite.ts';

// Ablauf der Rückfragen in der Einzel-Anmeldungsliste der Verwaltung (A-ANMELDUNG-06, FR-46,
// FR-08; Schritt 17 in docs/refactoring-analyse.md): Warnung und «Trotzdem …», Fehler im Dialog,
// Folge-Sätze, Neuladen und Fokus nach jeder Aktion. Die Fälle halten den Stand vor dem Umbau
// auf den `Aktionsdialog` fest. Mehrere Warnungen prüfen sie Satz für Satz, nicht als ein Text:
// Ob sie als Satz oder als Liste stehen, ist die eine gewollte Abweichung des Schritts (E-21).
// Die Fehler stellt `page.route` auf der einen Schreib-Adresse. Die Verwaltung ist direkt in der
// Datenbank bestätigt; kein Fall fordert einen Mail-Code an.

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

const PASST_NICHT = 'Passt nicht zur Kategorie.';
const GESCHLOSSEN = 'Anmeldung ist geschlossen.';

type Konto = Awaited<ReturnType<typeof legeCmMitBriefCodeAn>>;

/** CM-Admin mit Brief-Code angemeldet, die Verwaltung direkt bestätigt, auf der Kategorie. */
async function oeffneKategorie(page: Page, turnierId: number, kategorieId: number, titel: string) {
	const cm: Konto = await legeCmMitBriefCodeAn('Cyrill');
	await page.goto('/login');
	await page.getByLabel('Code aus dem Brief').fill(formatiereBriefCode(cm.code));
	await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: `Hoi ${cm.vorname}` })).toBeVisible();
	// Die Reiter laden den Code ihrer Seiten vor; ein folgendes page.goto bräche das ab.
	await wartetAufVorladen(page);
	await bestaetigeVerwaltungDirekt(cm.kontoId);
	await page.goto(`/verwaltung/turniere/${turnierId}/kategorien/${kategorieId}`);
	await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();
}

/** Erfundener Spieler R8 (passt zu R7–R9, nicht zu R1–R6). */
async function legeSpielerAn(vorname: string) {
	const nachname = `Probe${randomUUID().slice(0, 6)}`;
	const spieler = await legeKontoAn(vorname, nachname);
	await setzeSpielerangaben(spieler.mitgliedId, {
		geschlecht: 'm',
		jahrgang: 1988,
		klassierung: 'R8'
	});
	return { ...spieler, nachname };
}

/** Zählt die Anfragen `GET …/kategorien/<id>/anmeldungen`: so lädt die Seite die Liste neu. */
function zaehleNeuladen(page: Page, kategorieId: number): { anzahl: number } {
	const zaehler = { anzahl: 0 };
	page.on('requestfinished', (r) => {
		if (
			r.method() === 'GET' &&
			new URL(r.url()).pathname === `/api/admin/kategorien/${kategorieId}/anmeldungen`
		)
			zaehler.anzahl++;
	});
	return zaehler;
}

async function neuGeladen(zaehler: { anzahl: number }, anzahl: number) {
	await expect.poll(() => zaehler.anzahl).toBe(anzahl);
}

/** Gestellte Antwort auf die eine Schreib-Adresse; nur für die nächste Anfrage. */
async function stelle(page: Page, adresse: string, status: number, json: object) {
	await page.route(adresse, (r) => r.fulfill({ status, json }), { times: 1 });
}

/** In der Konsole stehen sonst nur die gestellten Antworten (503 und 404). */
const ohneGestellte = (fehler: string[]) =>
	fehler.filter((f) => !/^Failed to load resource: .* status of (503|404)\b/.test(f));

/** Die Rückmeldung der Liste mit diesem Satz; nach einer Aktion liegt der Fokus auf ihr. */
const rueckmeldung = (page: Page, satz: string) =>
	page.getByRole('status').filter({ hasText: satz });

const zeile = (page: Page, nachname: string) =>
	page.getByRole('row', { name: new RegExp(nachname) });

test('Von Hand anmelden: Warnungen, Trotzdem, Fehler und Folge-Satz im Dialog', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: wie cm-verwaltung.test.ts; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const {
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([einzel('Herren R1–R6', 'R1', 'R6')]);
	// Anmeldeschluss vorbei: dazu die Warnung «geschlossen».
	await setzeAnmeldeschluss(turnierId, '2001-05-31');
	const erster = await legeSpielerAn('Bruno');
	const zweiter = await legeSpielerAn('Dario');
	await oeffneKategorie(page, turnierId, kategorieId, 'Herren R1–R6');
	const neu = zaehleNeuladen(page, kategorieId);
	const anmelden = page.getByRole('dialog', { name: 'Von Hand anmelden' });
	const adresse = `**/api/admin/kategorien/${kategorieId}/anmeldungen`;

	// Zwei Warnungen in der Reihenfolge des Servers; die Haupttaste heisst dann «Trotzdem …».
	await page.getByRole('button', { name: 'Von Hand anmelden' }).click();
	await anmelden.getByLabel('Mitglied suchen').fill(erster.nachname);
	await anmelden.getByRole('radio', { name: new RegExp(`${erster.nachname}, Bruno`) }).check();
	await anmelden.getByRole('button', { name: 'Anmelden', exact: true }).click();
	const warnung = anmelden.getByRole('alert');
	await expect(warnung).toContainText(PASST_NICHT);
	await expect(warnung).toContainText(GESCHLOSSEN);
	expect((await warnung.textContent())!.indexOf(PASST_NICHT)).toBeLessThan(
		(await warnung.textContent())!.indexOf(GESCHLOSSEN)
	);
	await expect(anmelden.getByRole('button', { name: 'Trotzdem anmelden' })).toBeEnabled();
	await expect(anmelden.getByRole('button', { name: 'Anmelden', exact: true })).toHaveCount(0);

	// Eine neue Wahl verwirft die Warnungen.
	await anmelden.getByLabel('Mitglied suchen').fill(zweiter.nachname);
	await anmelden.getByRole('radio', { name: new RegExp(`${zweiter.nachname}, Dario`) }).check();
	await expect(anmelden.getByRole('alert')).toHaveCount(0);
	await expect(anmelden.getByRole('button', { name: 'Anmelden', exact: true })).toBeEnabled();

	// Störung: Der Satz steht im Dialog, der Dialog bleibt offen, die Taste geht wieder.
	await stelle(page, adresse, 503, {});
	await anmelden.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(anmelden.getByRole('alert')).toHaveText(MELDUNG.stoerung);
	await expect(anmelden).toBeVisible();
	await expect(anmelden.getByRole('button', { name: 'Anmelden', exact: true })).toBeEnabled();
	expect(neu.anzahl).toBe(0);

	// Abbrechen und neu öffnen: keine Warnung, kein Fehler vom letzten Mal, nichts gewählt.
	await anmelden.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(anmelden).toBeHidden();
	await page.getByRole('button', { name: 'Von Hand anmelden' }).click();
	await expect(anmelden).toBeVisible();
	await expect(anmelden.getByRole('alert')).toHaveCount(0);
	await expect(anmelden.getByRole('button', { name: 'Anmelden', exact: true })).toBeDisabled();

	// Folge-Satz: Der Stand hat sich geändert, der Dialog schliesst, die Liste lädt neu.
	await anmelden.getByLabel('Mitglied suchen').fill(erster.nachname);
	await anmelden.getByRole('radio', { name: new RegExp(`${erster.nachname}, Bruno`) }).check();
	await stelle(page, adresse, 409, { fehler: 'schon-angemeldet' });
	await anmelden.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await expect(anmelden).toBeHidden();
	const schon = rueckmeldung(page, 'Ist schon in dieser Kategorie angemeldet.');
	await expect(schon).toBeVisible();
	await expect(schon).toBeFocused();
	await neuGeladen(neu, 1);

	// Trotzdem anmelden: Satz, Neuladen, Fokus auf dem Satz; ein neues Öffnen leert ihn.
	await page.getByRole('button', { name: 'Von Hand anmelden' }).click();
	await expect(schon).toHaveCount(0);
	await anmelden.getByLabel('Mitglied suchen').fill(erster.nachname);
	await anmelden.getByRole('radio', { name: new RegExp(`${erster.nachname}, Bruno`) }).check();
	await anmelden.getByRole('button', { name: 'Anmelden', exact: true }).click();
	await anmelden.getByRole('button', { name: 'Trotzdem anmelden' }).click();
	await expect(anmelden).toBeHidden();
	await expect(rueckmeldung(page, 'Angemeldet.')).toBeFocused();
	await neuGeladen(neu, 2);
	await expect(page.getByText('1 Anmeldung', { exact: true })).toBeVisible();
	await expect(zeile(page, erster.nachname)).toContainText('bestätigt');
	expect(ohneGestellte(fehler)).toEqual([]);
});

test('Verschieben: Warnung, neue Wahl, Folge-Satz und ohne anderes Ziel nur Abbrechen', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: wie cm-verwaltung.test.ts; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const {
		turnierId,
		kategorieIds: [hier]
	} = await legeOffenesTurnierAn([
		einzel('Herren R7–R9', 'R7', 'R9'),
		einzel('Herren R1–R6', 'R1', 'R6'),
		einzel('Herren B R7–R9', 'R7', 'R9')
	]);
	const spieler = await legeSpielerAn('Bruno');
	await meldeZurCmAn(hier, spieler.mitgliedId);
	await oeffneKategorie(page, turnierId, hier, 'Herren R7–R9');
	const neu = zaehleNeuladen(page, hier);
	const verschieben = page.getByRole('dialog', { name: 'Verschieben' });

	// Ins unpassende Ziel: eine Warnung, «Trotzdem verschieben».
	await waehleAktion(page, zeile(page, spieler.nachname), 'Verschieben');
	await expect(
		verschieben.getByRole('button', { name: 'Verschieben', exact: true })
	).toBeDisabled();
	await verschieben.getByRole('radio', { name: 'Herren R1–R6' }).check();
	await verschieben.getByRole('button', { name: 'Verschieben', exact: true }).click();
	await expect(verschieben.getByRole('alert')).toHaveText(PASST_NICHT);
	await expect(verschieben.getByRole('button', { name: 'Trotzdem verschieben' })).toBeEnabled();

	// Ein anderes Ziel verwirft die Warnung; die Taste heisst wieder «Verschieben».
	await verschieben.getByRole('radio', { name: 'Herren B R7–R9' }).check();
	await expect(verschieben.getByRole('alert')).toHaveCount(0);
	await expect(verschieben.getByRole('button', { name: 'Verschieben', exact: true })).toBeEnabled();

	// Folge-Satz: Die Anmeldung ist inzwischen weg.
	const adresse = `**/api/admin/anmeldungen/*`;
	await stelle(page, adresse, 404, { fehler: 'nicht-gefunden' });
	await verschieben.getByRole('button', { name: 'Verschieben', exact: true }).click();
	await expect(verschieben).toBeHidden();
	await expect(rueckmeldung(page, 'Diese Anmeldung gibt es nicht mehr.')).toBeFocused();
	await neuGeladen(neu, 1);

	// Ohne anderes aktives Ziel steht nur «Abbrechen» im Dialog.
	const einziges = await legeOffenesTurnierAn([einzel('Herren R7–R9', 'R7', 'R9')]);
	await meldeZurCmAn(einziges.kategorieIds[0], spieler.mitgliedId);
	await page.goto(
		`/verwaltung/turniere/${einziges.turnierId}/kategorien/${einziges.kategorieIds[0]}`
	);
	await expect(page.getByRole('heading', { level: 1, name: 'Herren R7–R9' })).toBeVisible();
	await waehleAktion(page, zeile(page, spieler.nachname), 'Verschieben');
	await expect(verschieben).toContainText('Es gibt keine andere aktive Einzel-Kategorie.');
	await expect(verschieben.getByRole('button')).toHaveText(['Abbrechen']);
	await verschieben.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(verschieben).toBeHidden();
	expect(ohneGestellte(fehler)).toEqual([]);
});

test('Klassierung und Löschen: Störung bleibt im Dialog, Folge-Satz schliesst ihn', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: wie cm-verwaltung.test.ts; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const {
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([einzel('Herren R7–R9', 'R7', 'R9')]);
	const spieler = await legeSpielerAn('Bruno');
	await meldeZurCmAn(kategorieId, spieler.mitgliedId);
	await oeffneKategorie(page, turnierId, kategorieId, 'Herren R7–R9');
	const neu = zaehleNeuladen(page, kategorieId);

	// Klassierung: Die Taste geht erst mit einer anderen Klassierung; eine Störung bleibt im Dialog.
	const klassierung = page.getByRole('dialog', { name: 'Klassierung korrigieren' });
	const speichern = klassierung.getByRole('button', { name: 'Klassierung speichern' });
	await waehleAktion(page, zeile(page, spieler.nachname), 'Klassierung');
	await expect(speichern).toBeDisabled();
	await klassierung.getByLabel('Klassierung').selectOption('R7');
	await stelle(page, `**/api/admin/spieler/${spieler.mitgliedId}/klassierung`, 503, {});
	await speichern.click();
	await expect(klassierung.getByRole('alert')).toHaveText(MELDUNG.stoerung);
	await expect(klassierung).toBeVisible();
	await expect(speichern).toBeEnabled();
	// Eine andere Wahl lässt den Fehler stehen.
	await klassierung.getByLabel('Klassierung').selectOption('R9');
	await expect(klassierung.getByRole('alert')).toHaveText(MELDUNG.stoerung);
	await klassierung.getByRole('button', { name: 'Abbrechen' }).click();
	await expect(klassierung).toBeHidden();
	await waehleAktion(page, zeile(page, spieler.nachname), 'Klassierung');
	await expect(klassierung.getByRole('alert')).toHaveCount(0);
	await klassierung.getByLabel('Klassierung').selectOption('R7');
	await speichern.click();
	await expect(klassierung).toBeHidden();
	await expect(rueckmeldung(page, 'Klassierung gespeichert.')).toBeFocused();
	await neuGeladen(neu, 1);
	await expect(zeile(page, spieler.nachname)).toContainText('R7');

	// Löschen: Folge-Satz, wenn es die Anmeldung nicht mehr gibt.
	const loeschen = page.getByRole('dialog', { name: 'Anmeldung löschen?' });
	await waehleAktion(page, zeile(page, spieler.nachname), 'Löschen');
	await expect(loeschen.getByRole('button')).toHaveText(['Abbrechen', 'Löschen']);
	await stelle(page, '**/api/admin/anmeldungen/*/loeschen', 404, { fehler: 'nicht-gefunden' });
	await loeschen.getByRole('button', { name: 'Löschen', exact: true }).click();
	await expect(loeschen).toBeHidden();
	await expect(rueckmeldung(page, 'Diese Anmeldung gibt es nicht mehr.')).toBeFocused();
	await neuGeladen(neu, 2);
	await expect(zeile(page, spieler.nachname)).toBeVisible();
	expect(ohneGestellte(fehler)).toEqual([]);
});

test('FR-08: Wildcard-Antrag mit drei Tasten, Störung, Folge-Satz und Bestätigen', async ({
	page
}, info) => {
	test.skip(info.project.name === 'desktop', 'nur Handy'); // skip: wie cm-verwaltung.test.ts; die Verwaltung am Computer prüft turnier.test.ts
	test.setTimeout(90_000);
	const fehler = sammleKonsolenfehler(page);
	const {
		turnierId,
		kategorieIds: [kategorieId]
	} = await legeOffenesTurnierAn([einzel('Herren R1–R6', 'R1', 'R6')]);
	const spieler = await legeSpielerAn('Moritz');
	await beantrageWildcardDirekt(kategorieId, spieler.mitgliedId, 'Ich will es versuchen.');
	await oeffneKategorie(page, turnierId, kategorieId, 'Herren R1–R6');
	const neu = zaehleNeuladen(page, kategorieId);
	const entscheid = page.getByRole('dialog', { name: 'Wildcard-Antrag' });
	const adresse = '**/api/admin/anmeldungen/*/entscheid';

	// Drei Tasten in dieser Reihenfolge.
	await waehleAktion(page, zeile(page, spieler.nachname), 'Entscheiden');
	await expect(entscheid).toContainText('Ich will es versuchen.');
	await expect(entscheid.getByRole('button')).toHaveText(['Abbrechen', 'Ablehnen', 'Bestätigen']);

	// Störung beim Ablehnen: Satz im Dialog, beide Tasten gehen wieder.
	await stelle(page, adresse, 503, {});
	await entscheid.getByRole('button', { name: 'Ablehnen' }).click();
	await expect(entscheid.getByRole('alert')).toHaveText(MELDUNG.stoerung);
	await expect(entscheid.getByRole('button', { name: 'Ablehnen' })).toBeEnabled();
	await expect(entscheid.getByRole('button', { name: 'Bestätigen' })).toBeEnabled();
	expect(neu.anzahl).toBe(0);

	// Folge-Satz: Darüber ist schon entschieden.
	await stelle(page, adresse, 409, { fehler: 'nicht-beantragt' });
	await entscheid.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(entscheid).toBeHidden();
	await expect(rueckmeldung(page, 'Darüber ist schon entschieden.')).toBeFocused();
	await neuGeladen(neu, 1);

	// Neu geöffnet ohne den Fehler von vorhin; Bestätigen nimmt den Antrag an.
	await waehleAktion(page, zeile(page, spieler.nachname), 'Entscheiden');
	await expect(entscheid.getByRole('alert')).toHaveCount(0);
	await entscheid.getByRole('button', { name: 'Bestätigen' }).click();
	await expect(entscheid).toBeHidden();
	await expect(rueckmeldung(page, 'Bestätigt.')).toBeFocused();
	await neuGeladen(neu, 2);
	await expect(zeile(page, spieler.nachname)).toContainText('bestätigt');
	expect(ohneGestellte(fehler)).toEqual([]);
});
