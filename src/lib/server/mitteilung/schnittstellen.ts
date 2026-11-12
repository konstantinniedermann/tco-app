// Schnittstellen der Mitglieder zu Mitteilungen (FR-40, FR-41): Themen und Push-Abo dieses Geräts.
// Die der Verwaltung stehen in `verwaltung-schnittstellen.ts`.
import {
	antwort,
	eingabeFehler,
	formatFehler,
	istJson,
	jetzt,
	leseKoerper,
	mitSitzung,
	type Ereignis
} from '../http.ts';
import type { AngemeldetesKonto } from '../login/sitzung.ts';
import { loescheAbo, pruefeAbo, speichereAbo } from './abo.ts';
import { ladeEinstellungen, pruefeThemen, setzeThemen } from './themen.ts';
import type { MitteilungDienste } from './typen.ts';

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
		if (!themen) return eingabeFehler();
		await setzeThemen(d.db, konto.kontoId, themen);
		return antwort(200, await stand(d, konto));
	});
}

export async function postAbo(d: MitteilungDienste, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitSitzung(e, async (konto) => {
		if (d.vapidOeffentlich === null) return antwort(409, { fehler: 'push-aus' });
		const p = pruefeAbo(await leseKoerper(e));
		if (!p.ok) return eingabeFehler();
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

// Die Schnittstellen der Mitglieder zu Mitteilungen; die Grundprüfung
// (`src/lib/server/grundpruefung.db.test.ts`) läuft über jeden Eintrag.
export const MITTEILUNG_SCHNITTSTELLEN = {
	getBenachrichtigungen,
	postThemen,
	postAbo,
	postAboLoeschen
} satisfies Record<string, (d: MitteilungDienste, e: Ereignis) => Promise<Response>>;
