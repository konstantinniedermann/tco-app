import { geraetAusBrowser } from './geraet.ts';
import type { Ort } from './passkey-pruefer.ts';
import type { PasskeyDienst } from './passkey.ts';
import {
	antwort,
	formatFehler,
	istJson,
	leseKoerper,
	loginAntwort,
	type Ereignis
} from './schnittstellen.ts';
import { SITZUNG_COOKIE } from './sitzung.ts';

const ort = (e: Ereignis): Ort => ({ rpId: e.url.hostname, herkunft: e.url.origin });

// Konto und Sitzungskennung stammen aus derselben, eben geprüften Sitzung: `locals.konto` ist
// nur gesetzt, wenn das Cookie dieser Anfrage eine gültige Sitzung trägt (ladeSitzung).
function angemeldet(e: Ereignis): { kontoId: number; kennung: string } | null {
	const konto = e.locals.konto;
	const kennung = e.cookies.get(SITZUNG_COOKIE);
	return konto && kennung ? { kontoId: konto.kontoId, kennung } : null;
}

const nichtAngemeldet = () => antwort(401, {});
const falsch = () => antwort(400, { fehler: 'falsch' });

export async function postEinrichtenOptionen(d: PasskeyDienst, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const s = angemeldet(e);
	if (!s) return nichtAngemeldet();
	return antwort(200, await d.optionenEinrichten(s.kontoId, ort(e)));
}

export async function postEinrichten(d: PasskeyDienst, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const s = angemeldet(e);
	if (!s) return nichtAngemeldet();
	const { antwort: browserAntwort } = await leseKoerper(e);
	const r = await d.einrichten(
		s.kontoId,
		browserAntwort,
		ort(e),
		geraetAusBrowser(e.request.headers.get('user-agent')),
		s.kennung
	);
	return r === 'ok' ? antwort(200, {}) : falsch();
}

export async function postAnmeldenOptionen(d: PasskeyDienst, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const r = await d.optionenAnmelden(ort(e), e.getClientAddress());
	return r === 'zu-viele' ? antwort(429, { fehler: 'zu-viele' }) : antwort(200, r);
}

export async function postAnmelden(d: PasskeyDienst, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const { vorgang, antwort: browserAntwort } = await leseKoerper(e);
	return loginAntwort(
		e,
		await d.anmelden(
			vorgang,
			browserAntwort,
			ort(e),
			e.getClientAddress(),
			e.cookies.get(SITZUNG_COOKIE)
		)
	);
}

export async function getPasskeys(d: PasskeyDienst, e: Ereignis): Promise<Response> {
	const s = angemeldet(e);
	if (!s) return nichtAngemeldet();
	const liste = await d.liste(s.kontoId, ort(e));
	return antwort(200, {
		passkeys: liste.map((p) => ({
			kennung: p.kennung,
			geraet: p.geraet,
			eingerichtetAm: p.eingerichtetAm.toISOString(),
			zuletztBenutzt: p.zuletztBenutzt?.toISOString() ?? null
		}))
	});
}

export async function postEntfernen(d: PasskeyDienst, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const s = angemeldet(e);
	if (!s) return nichtAngemeldet();
	const { kennung } = await leseKoerper(e);
	if (typeof kennung !== 'string') return falsch();
	return (await d.entferne(s.kontoId, kennung)) === 'ok'
		? antwort(204)
		: antwort(404, { fehler: 'nicht-gefunden' });
}

export async function postHinweis(d: PasskeyDienst, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const s = angemeldet(e);
	if (!s) return nichtAngemeldet();
	await d.hinweisErledigt(s.kennung);
	return antwort(204);
}
