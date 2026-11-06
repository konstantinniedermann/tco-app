// Schnittstellen der Mitglieder zur Clubmeisterschaft (A-ANMELDUNG-01…05). Alles nur mit Sitzung.
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
import { trageCmAngabenNach } from './angaben.ts';
import {
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

const FEHLER = ['geschlossen', 'voll', 'passt-nicht', 'schon-angemeldet', 'angaben-fehlen'];

// Nach dem Speichern: neue Ansicht und, erst danach, die Bestätigung (wirft nie).
async function antwortMitMail(
	d: CmDienste,
	konto: AngemeldetesKonto,
	bezug: Bezug,
	aktion: 'an' | 'ab',
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
