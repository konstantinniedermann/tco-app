import type { Db } from '../db/index.ts';
import { offeneGespraecheGesamt } from '../gespraech/gespraech.ts';
import { effektiveRollen, verwaltungsrollen } from '../admin/rollen.ts';
import { abgemeldet, antwort, formatFehler, istJson, leseKoerper, type Ereignis } from '../http.ts';
import type { LoginDienst, LoginErgebnis } from './dienst.ts';
import { SITZUNG_COOKIE, SITZUNG_GUELTIG_MS } from './sitzung.ts';

// Keine explizite `secure`-Option: SvelteKit setzt sie, ausser im Entwicklungsserver (darum
// klappt der Login bei `make dev-handy` übers WLAN) oder wenn die Anfrage-URL http://localhost
// ist. adapter-node nimmt ohne PROTOCOL_HEADER immer https an; der E2E-Test für WebKit meldet
// darum http über einen Proxy-Kopf (playwright.config.ts). tests/e2e/cookie.test.ts belegt,
// dass der Produktions-Build `Secure` behält.
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

// RR-07: `verwaltung` (eine Verwaltungsrolle, in der «Ansicht als …» die der Ansicht) blendet nur
// die Navigation ein; durchgesetzt wird es an den Admin-Schnittstellen. `ansicht` zeigt das Band.
// Weder `mitgliedId` noch `sitzungHash` gehen an den Browser.
export async function getSitzung(
	e: Ereignis,
	db: Db,
	jetzt: () => Date = () => new Date()
): Promise<Response> {
	const konto = e.locals.konto;
	if (!konto) return abgemeldet();
	const rollen = effektiveRollen(await verwaltungsrollen(db, konto.kontoId), konto.ansicht);
	return antwort(200, {
		vorname: konto.vorname,
		rufname: konto.rufname,
		passkeyHinweis: konto.passkeyHinweis,
		verwaltung: rollen.length > 0,
		ansicht: konto.ansicht,
		// FR-52: Kachel der Verwaltung; nur wer als CM-Admin gilt (auch in der Ansicht), sonst 0.
		nachrichtenOffen: rollen.includes('cm') ? await offeneGespraecheGesamt(db, jetzt()) : 0
	});
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
