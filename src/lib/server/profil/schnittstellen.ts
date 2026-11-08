import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { mitglied } from '../db/schema.ts';
import { leseStand } from '../admin/angaben.ts';
import {
	antwort,
	formatFehler,
	istJson,
	leseKoerper,
	type Ereignis
} from '../login/schnittstellen.ts';
import type { AngemeldetesKonto } from '../login/sitzung.ts';
import { setzeKlassierung } from '../cm/angaben.ts';
import { EIGENE_FELDER, aendereEigeneAngaben, ladeEigeneAngaben, setzeRufname } from './angaben.ts';
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
		if (!angaben) return antwort(404, { fehler: 'nicht-gefunden' });
		// FR-37: Die Klassierung gehört nicht zu den Angaben der Verwaltung, das Profil zeigt sie extra.
		const [m] = await d.db
			.select({ klassierung: mitglied.klassierung, rufname: mitglied.rufname })
			.from(mitglied)
			.where(eq(mitglied.id, konto.mitgliedId));
		return antwort(200, {
			angaben,
			klassierung: m?.klassierung ?? null,
			rufname: m?.rufname ?? null
		});
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

export function postKlassierung(d: ProfilDienste, e: Ereignis): Promise<Response> {
	return aendernd(e, async (konto, koerper) => {
		const r = await setzeKlassierung(d.db, konto.mitgliedId, koerper.klassierung, jetzt(d));
		switch (r) {
			case 'ok':
				return antwort(200, {});
			case 'eingabe':
				return antwort(400, {
					fehler: 'eingabe',
					felder: { klassierung: 'Bitte deine Klassierung wählen.' }
				});
			case 'nicht-gefunden':
				return antwort(404, { fehler: 'nicht-gefunden' });
		}
	});
}

export function postRufname(d: ProfilDienste, e: Ereignis): Promise<Response> {
	return aendernd(e, async (konto, koerper) => {
		const r = await setzeRufname(d.db, konto.mitgliedId, koerper.rufname, jetzt(d));
		switch (r.ergebnis) {
			case 'ok': {
				// Die Antwort nennt den gespeicherten Wert, so zeigt die Seite den getrimmten Rufnamen.
				const [m] = await d.db
					.select({ rufname: mitglied.rufname })
					.from(mitglied)
					.where(eq(mitglied.id, konto.mitgliedId));
				return antwort(200, { rufname: m?.rufname ?? null });
			}
			case 'eingabe':
				return antwort(400, { fehler: 'eingabe', felder: { rufname: r.fehler } });
			case 'nicht-gefunden':
				return antwort(404, { fehler: 'nicht-gefunden' });
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
