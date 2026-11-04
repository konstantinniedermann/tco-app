import type { RequestEvent } from '@sveltejs/kit';
import type { LoginDienst, LoginErgebnis } from './dienst.ts';
import { SITZUNG_COOKIE, SITZUNG_GUELTIG_MS } from './sitzung.ts';

export type Ereignis = Pick<
	RequestEvent,
	'request' | 'cookies' | 'getClientAddress' | 'locals' | 'url'
>;

const KOPF = { 'cache-control': 'no-store' };

export function antwort(status: number, inhalt?: object): Response {
	if (inhalt === undefined) return new Response(null, { status, headers: KOPF });
	return Response.json(inhalt, { status, headers: KOPF });
}

export function istJson(e: Ereignis): boolean {
	return (e.request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');
}

// Ein kaputter oder fremdartiger Körper zählt als leer; er wird nie geloggt (SI-05).
export async function leseKoerper(e: Ereignis): Promise<Record<string, unknown>> {
	try {
		const roh: unknown = await e.request.json();
		return typeof roh === 'object' && roh !== null && !Array.isArray(roh)
			? (roh as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

// Keine explizite `secure`-Option: SvelteKit setzt sie, ausser die Anfrage-URL ist
// http://localhost. adapter-node nimmt ohne PROTOCOL_HEADER immer https an; der E2E-Test für
// WebKit meldet darum http über einen Proxy-Kopf (playwright.config.ts).
function setzeCookie(e: Pick<Ereignis, 'cookies'>, kennung: string): void {
	e.cookies.set(SITZUNG_COOKIE, kennung, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: SITZUNG_GUELTIG_MS / 1000
	});
}

export function loginAntwort(e: Ereignis, r: LoginErgebnis): Response {
	switch (r.ergebnis) {
		case 'ok':
			setzeCookie(e, r.kennung);
			return antwort(200, {});
		case 'benutzt':
			return antwort(400, { fehler: 'benutzt', kontakt: r.kontakt });
		case 'zu-viele':
			return antwort(429, { fehler: 'zu-viele' });
		default:
			return antwort(400, { fehler: 'falsch' });
	}
}

export const formatFehler = () => antwort(415, { fehler: 'format' });

export async function postBrief(d: LoginDienst, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const { code } = await leseKoerper(e);
	return loginAntwort(
		e,
		await d.loginMitBriefCode(code, e.getClientAddress(), e.cookies.get(SITZUNG_COOKIE))
	);
}

export async function postMailCode(d: LoginDienst, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const { email } = await leseKoerper(e);
	// SI-04: nicht auf `arbeit` warten, sonst verrät die Dauer, ob ein Konto besteht.
	const { annahme } = d.fordereMailCodeAn(email, e.getClientAddress());
	return annahme === 'ok' ? antwort(202, {}) : antwort(429, { fehler: 'zu-viele' });
}

export async function postMail(d: LoginDienst, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const { email, code } = await leseKoerper(e);
	return loginAntwort(
		e,
		await d.loginMitMailCode(email, code, e.getClientAddress(), e.cookies.get(SITZUNG_COOKIE))
	);
}

export function getSitzung(e: Ereignis): Response {
	const konto = e.locals.konto;
	return konto
		? antwort(200, { vorname: konto.vorname, passkeyHinweis: konto.passkeyHinweis })
		: antwort(401, {});
}

export async function postLogout(d: LoginDienst, e: Ereignis): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	const kennung = e.cookies.get(SITZUNG_COOKIE);
	if (kennung !== undefined) await d.beendeSitzung(kennung);
	e.cookies.delete(SITZUNG_COOKIE, { path: '/' });
	return antwort(204);
}

// Fehlerbehandlung ohne Inhalt: Fehlermeldungen der Datenbank können Parameter enthalten,
// also Adressen oder Codes (SI-05). Darum nur feste Texte, weder Meldung noch Stack.
// Nur 'unknown' ist ein Fehler aus unserem Code; 'app' (error()) und 'framework' (404, 405 …)
// tragen eine sichere Meldung und gehen unverändert durch, ohne Log.
export function behandleFehler(
	kind: 'app' | 'framework' | 'validation' | 'unknown',
	error: unknown
): { status?: number; message?: string } {
	if (kind !== 'unknown') return error as { status?: number; message?: string };
	console.error('Interner Fehler');
	return { message: 'Interner Fehler' };
}

// Ein Fehler beim Laden der Sitzung darf die Antwort nicht verhindern (Sicherheits-Header):
// Die Anfrage gilt dann als nicht angemeldet.
export async function ladeSitzungSicher(holeDienst: () => LoginDienst, e: Ereignis): Promise<void> {
	try {
		await ladeSitzung(holeDienst(), e);
	} catch {
		console.error('Sitzung konnte nicht geladen werden');
		delete e.locals.konto;
	}
}

export async function ladeSitzung(d: LoginDienst, e: Ereignis): Promise<void> {
	const kennung = e.cookies.get(SITZUNG_COOKIE);
	if (kennung === undefined) return;
	const treffer = await d.pruefeSitzung(kennung);
	if (!treffer) {
		e.cookies.delete(SITZUNG_COOKIE, { path: '/' });
		return;
	}
	e.locals.konto = treffer.konto;
	if (treffer.verlaengert) setzeCookie(e, kennung);
}
