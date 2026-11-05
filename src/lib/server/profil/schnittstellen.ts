import type { Db } from '../db/index.ts';
import { leseStand } from '../admin/angaben.ts';
import {
	antwort,
	formatFehler,
	istJson,
	leseKoerper,
	type Ereignis
} from '../login/schnittstellen.ts';
import type { AngemeldetesKonto } from '../login/sitzung.ts';
import { EIGENE_FELDER, aendereEigeneAngaben, ladeEigeneAngaben } from './angaben.ts';
import type { EmailWechselDienst } from './email-wechsel.ts';

export type ProfilDienste = { db: Db; wechsel: EmailWechselDienst; jetzt?: () => Date };

const jetzt = (d: ProfilDienste) => (d.jetzt ?? (() => new Date()))();

// Nur die Sitzung zählt: Jedes angemeldete Mitglied bearbeitet ausschliesslich das eigene Konto.
async function mitKonto(
	e: Ereignis,
	fn: (konto: AngemeldetesKonto) => Promise<Response>
): Promise<Response> {
	const konto = e.locals.konto;
	if (!konto) return antwort(401, { fehler: 'abgemeldet' });
	return fn(konto);
}

// SI-10: ändernde Anfragen nur als JSON.
async function aendernd(
	e: Ereignis,
	fn: (konto: AngemeldetesKonto, koerper: Record<string, unknown>) => Promise<Response>
): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitKonto(e, async (konto) => fn(konto, await leseKoerper(e)));
}

export function getProfil(d: ProfilDienste, e: Ereignis): Promise<Response> {
	return mitKonto(e, async (konto) => {
		const angaben = await ladeEigeneAngaben(d.db, konto.mitgliedId);
		return angaben ? antwort(200, { angaben }) : antwort(404, { fehler: 'nicht-gefunden' });
	});
}

export function postProfil(d: ProfilDienste, e: Ereignis): Promise<Response> {
	return aendernd(e, async (konto, koerper) => {
		const vorher = leseStand(koerper.vorher);
		const neu = koerper.angaben;
		if (!vorher || typeof neu !== 'object' || neu === null || Array.isArray(neu)) {
			return antwort(400, { fehler: 'eingabe', felder: {} });
		}
		const r = await aendereEigeneAngaben(
			d.db,
			konto.mitgliedId,
			neu as Record<string, unknown>,
			vorher,
			jetzt(d)
		);
		switch (r.ergebnis) {
			case 'ok':
				return antwort(200, { geaendert: r.geaendert });
			case 'veraltet':
				return antwort(409, { fehler: 'veraltet' });
			case 'nicht-gefunden':
				return antwort(404, { fehler: 'nicht-gefunden' });
			case 'eingabe': {
				// Nur eigene Felder an die Oberfläche. Scheitert die Prüfung an Altdaten in anderen
				// Feldern, meldet `fremd` das, ohne deren Namen oder Inhalt preiszugeben.
				const felder = Object.fromEntries(
					EIGENE_FELDER.filter((f) => r.fehler[f] !== undefined).map((f) => [f, r.fehler[f]])
				);
				return Object.keys(felder).length > 0
					? antwort(400, { fehler: 'eingabe', felder })
					: antwort(400, { fehler: 'eingabe', felder: {}, fremd: true });
			}
		}
	});
}

export function postEmail(d: ProfilDienste, e: Ereignis): Promise<Response> {
	return aendernd(e, async (konto, koerper) => {
		// SI-04: Nicht auf `arbeit` warten; die Antwortzeit verriete sonst, ob die Adresse vergeben ist.
		const { annahme } = await d.wechsel.starte(konto, koerper.email, e.getClientAddress());
		switch (annahme) {
			case 'ok':
				return antwort(202, {});
			case 'zu-viele':
				return antwort(429, { fehler: 'zu-viele' });
			case 'gleich':
				return antwort(400, { fehler: 'gleich' });
			default:
				return antwort(400, { fehler: 'eingabe' });
		}
	});
}

export function postEmailBestaetigen(d: ProfilDienste, e: Ereignis): Promise<Response> {
	return aendernd(e, async (konto, koerper) => {
		const r = await d.wechsel.bestaetige(konto, koerper.codeAlt, koerper.codeNeu);
		return r === 'ok' ? antwort(200, {}) : antwort(400, { fehler: 'falsch' });
	});
}
