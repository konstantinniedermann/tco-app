// Schnittstellen der Mitglieder zur Clubmeisterschaft (A-ANMELDUNG-01…05, A-ANMELDUNG-10). Alles
// nur mit Sitzung.
import type { RequestEvent } from '@sveltejs/kit';
import { parseId } from '../parse-id.ts';
import type { Db } from '../db/index.ts';
import {
	antwort,
	formatFehler,
	istJson,
	leseKoerper,
	type Ereignis
} from '../login/schnittstellen.ts';
import type { AngemeldetesKonto } from '../login/sitzung.ts';
import { cmAdmins } from '../mitteilung/meldung.ts';
import { trageCmAngabenNach } from './angaben.ts';
import {
	beantrageWildcard,
	eigeneKategorien,
	ladeCmAnsicht,
	laufendeTurniere,
	meldeAb,
	meldeAn
} from './anmeldungen.ts';
import { bezugDerAnmeldung, bezugDerKategorie, mitgliedEmail, type Bezug } from './bezug.ts';
import type { BestaetigungInhalt } from './mail.ts';

export type CmDienste = {
	db: Db;
	bestaetigung: (an: string, i: BestaetigungInhalt) => Promise<void>;
	/** FR-47: persönliche Meldung, Push, sonst E-Mail; wirft nie. */
	melde: (mitgliedIds: number[], m: { titel: string; text: string; pfad: string }) => Promise<void>;
	jetzt?: () => Date;
};
export type CmEreignis = Ereignis & Pick<RequestEvent, 'params'>;

const jetzt = (d: CmDienste) => (d.jetzt ?? (() => new Date()))();
const nichtGefunden = () => antwort(404, { fehler: 'nicht-gefunden' });

async function mitSitzung(
	e: CmEreignis,
	fn: (konto: AngemeldetesKonto) => Promise<Response>
): Promise<Response> {
	const konto = e.locals.konto;
	if (!konto) return antwort(401, { fehler: 'abgemeldet' });
	return fn(konto);
}

// SI-10: ändernde Anfragen nur als JSON.
async function aendernd(
	e: CmEreignis,
	fn: (konto: AngemeldetesKonto) => Promise<Response>
): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitSitzung(e, fn);
}

export function getCmTurniere(d: CmDienste, e: CmEreignis): Promise<Response> {
	return mitSitzung(e, async (konto) =>
		antwort(200, await laufendeTurniere(d.db, konto.mitgliedId, jetzt(d)))
	);
}

export function getCmAnsicht(d: CmDienste, e: CmEreignis): Promise<Response> {
	return mitSitzung(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const a = await ladeCmAnsicht(d.db, id, konto.mitgliedId, jetzt(d));
		return a ? antwort(200, a) : nichtGefunden();
	});
}

export function postCmAngaben(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const r = await trageCmAngabenNach(d.db, konto.mitgliedId, await leseKoerper(e), jetzt(d));
		switch (r.ergebnis) {
			case 'ok':
				return antwort(200, {});
			case 'eingabe':
				return antwort(400, { fehler: 'eingabe', felder: r.felder });
			case 'nicht-gefunden':
				return nichtGefunden();
		}
	});
}

const FEHLER = [
	'geschlossen',
	'voll',
	'passt-nicht',
	'keine-wildcard',
	'schon-angemeldet',
	'angaben-fehlen'
];

/** FR-08: Höchstlänge des Wildcard-Kommentars (nach `trim`). */
const KOMMENTAR_MAX = 300;

// Nach dem Speichern: neue Ansicht und, erst danach, die Bestätigung (wirft nie).
async function antwortMitMail(
	d: CmDienste,
	konto: AngemeldetesKonto,
	bezug: Bezug,
	aktion: BestaetigungInhalt['aktion'],
	t: Date
): Promise<Response> {
	const ansicht = await ladeCmAnsicht(d.db, bezug.turnierId, konto.mitgliedId, t);
	if (!ansicht) return nichtGefunden();
	const an = await mitgliedEmail(d.db, konto.mitgliedId);
	if (an) {
		await d.bestaetigung(an, {
			turniername: ansicht.turnier.name,
			aktion,
			kategorie: bezug.kategorie,
			eigene: await eigeneKategorien(d.db, bezug.turnierId, konto.mitgliedId),
			anmeldeschluss: ansicht.turnier.anmeldeschluss
		});
	}
	return antwort(200, ansicht);
}

export function postCmAnmeldung(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const bezug = await bezugDerKategorie(d.db, id);
		if (!bezug) return nichtGefunden();
		const t = jetzt(d);
		const r = await meldeAn(d.db, id, konto.mitgliedId, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r !== 'ok') return antwort(409, { fehler: FEHLER.includes(r) ? r : 'geschlossen' });
		return antwortMitMail(d, konto, bezug, 'an', t);
	});
}

export function postCmAbmeldung(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const bezug = await bezugDerAnmeldung(d.db, id, konto.mitgliedId);
		if (!bezug) return nichtGefunden();
		const t = jetzt(d);
		const r = await meldeAb(d.db, id, konto.mitgliedId, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r === 'geschlossen') return antwort(409, { fehler: 'geschlossen' });
		return antwortMitMail(d, konto, bezug, 'ab', t);
	});
}

/**
 * FR-47: Meldung an die CM-Admins ausser dem Antragsteller selbst. Wirft nie und loggt nichts
 * (SI-05): Der Antrag ist schon gespeichert.
 */
async function meldeCmAdmins(
	d: CmDienste,
	ohne: number,
	m: Parameters<CmDienste['melde']>[1]
): Promise<void> {
	let ids: number[];
	try {
		ids = (await cmAdmins(d.db)).filter((id) => id !== ohne);
	} catch {
		return;
	}
	await d.melde(ids, m);
}

/**
 * A-ANMELDUNG-10, FR-08: Wildcard-Antrag mit Pflichtkommentar. Danach die Bestätigung an den
 * Spieler und eine Meldung an die CM-Admins (FR-47), DS-05: ohne Namen des Spielers.
 */
export function postCmWildcard(d: CmDienste, e: CmEreignis): Promise<Response> {
	return aendernd(e, async (konto) => {
		const id = parseId(e.params.id);
		if (id === null) return nichtGefunden();
		const roh = (await leseKoerper(e)).kommentar;
		const kommentar = typeof roh === 'string' ? roh.trim() : '';
		if (kommentar.length === 0 || kommentar.length > KOMMENTAR_MAX) {
			return antwort(400, {
				fehler: 'eingabe',
				felder: {
					kommentar:
						kommentar.length === 0
							? 'Bitte schreib kurz, warum du hier spielen möchtest.'
							: `Höchstens ${KOMMENTAR_MAX} Zeichen.`
				}
			});
		}
		const bezug = await bezugDerKategorie(d.db, id);
		if (!bezug) return nichtGefunden();
		const t = jetzt(d);
		const r = await beantrageWildcard(d.db, id, konto.mitgliedId, kommentar, t);
		if (r === 'nicht-gefunden') return nichtGefunden();
		if (r !== 'ok') return antwort(409, { fehler: FEHLER.includes(r) ? r : 'geschlossen' });
		const a = await antwortMitMail(d, konto, bezug, 'antrag', t);
		// Die Antwort wartet nicht auf Push und Mail an die CM-Admins; `meldeCmAdmins` wirft nie.
		void meldeCmAdmins(d, konto.mitgliedId, {
			titel: 'Wildcard-Antrag',
			text: `Neuer Wildcard-Antrag für «${bezug.kategorie}».`,
			pfad: `/verwaltung/turniere/${bezug.turnierId}/kategorien/${id}`
		});
		return a;
	});
}
