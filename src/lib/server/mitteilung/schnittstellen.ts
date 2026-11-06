// Schnittstellen der Mitglieder zu Mitteilungen (FR-40, FR-41): Themen und Push-Abo dieses Geräts.
import type { Db } from '../db/index.ts';
import {
	antwort,
	formatFehler,
	istJson,
	leseKoerper,
	type Ereignis
} from '../login/schnittstellen.ts';
import type { AngemeldetesKonto } from '../login/sitzung.ts';
import { loescheAbo, pruefeAbo, speichereAbo } from './abo.ts';
import { ladeEinstellungen, pruefeThemen, setzeThemen } from './themen.ts';

// Ohne Push-Sender und Mailer: die kommen mit dem Versand dazu.
export type MitteilungDienste = { db: Db; vapidOeffentlich: string | null; jetzt?: () => Date };

const jetzt = (d: MitteilungDienste) => (d.jetzt ?? (() => new Date()))();

async function mitSitzung(
	e: Ereignis,
	fn: (konto: AngemeldetesKonto) => Promise<Response>
): Promise<Response> {
	const konto = e.locals.konto;
	if (!konto) return antwort(401, { fehler: 'abgemeldet' });
	return fn(konto);
}

async function stand(d: MitteilungDienste, konto: AngemeldetesKonto) {
	return {
		...(await ladeEinstellungen(d.db, konto.kontoId, konto.sitzungHash)),
		schluessel: d.vapidOeffentlich
	};
}

export function getBenachrichtigungen(d: MitteilungDienste, e: Ereignis): Promise<Response> {
	return mitSitzung(e, async (konto) => antwort(200, await stand(d, konto)));
}

export async function postThemen(d: MitteilungDienste, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitSitzung(e, async (konto) => {
		const themen = pruefeThemen((await leseKoerper(e)).themen);
		if (!themen) return antwort(400, { fehler: 'eingabe' });
		await setzeThemen(d.db, konto.kontoId, themen);
		return antwort(200, await stand(d, konto));
	});
}

export async function postAbo(d: MitteilungDienste, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitSitzung(e, async (konto) => {
		if (d.vapidOeffentlich === null) return antwort(409, { fehler: 'push-aus' });
		const p = pruefeAbo(await leseKoerper(e));
		if (!p.ok) return antwort(400, { fehler: 'eingabe' });
		await speichereAbo(d.db, konto.kontoId, konto.sitzungHash, p.abo, jetzt(d));
		return antwort(200, { pushHier: true });
	});
}

export async function postAboLoeschen(d: MitteilungDienste, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitSitzung(e, async (konto) => {
		await loescheAbo(d.db, konto.sitzungHash);
		return antwort(200, { pushHier: false });
	});
}
