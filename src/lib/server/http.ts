// Grundbausteine der Schnittstellen: Antwort bauen, JSON prüfen, Körper lesen, die
// Standardantworten, «mit Sitzung», «ändernd» und «jetzt». Kein Themen-Modul definiert sie selbst.
// Diese Datei importiert aus dem Server nichts (Lint-Regel: Dateien direkt unter src/lib/server/
// importieren nur db/); den Typ des angemeldeten Kontos bezieht sie darum über App.Locals.
import type { RequestEvent } from '@sveltejs/kit';

export type Ereignis = Pick<
	RequestEvent,
	'request' | 'cookies' | 'getClientAddress' | 'locals' | 'url'
>;

/** Das angemeldete Konto, wie der Hook es in `locals` legt. */
export type Konto = NonNullable<App.Locals['konto']>;

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

export const formatFehler = () => antwort(415, { fehler: 'format' });
export const nichtGefunden = () => antwort(404, { fehler: 'nicht-gefunden' });
export const eingabeFehler = () => antwort(400, { fehler: 'eingabe' });

/** Die Zeit aus den Diensten (Tests reichen sie hinein), sonst die Uhr. */
export const jetzt = (d: { jetzt?: () => Date }): Date => (d.jetzt ?? (() => new Date()))();

/** Nur mit Sitzung; ohne antwortet die Schnittstelle 401 `abgemeldet`. */
export async function mitSitzung(
	e: Ereignis,
	fn: (konto: Konto) => Promise<Response>
): Promise<Response> {
	const konto = e.locals.konto;
	if (!konto) return antwort(401, { fehler: 'abgemeldet' });
	return fn(konto);
}

// SI-10: ändernde Anfragen nur als JSON. Reihenfolge: erst das Format (415), dann die Sitzung (401);
// festgehalten in grundpruefung.db.test.ts. Den Körper liest `fn` selbst, höchstens einmal.
export async function aendernd(
	e: Ereignis,
	fn: (konto: Konto) => Promise<Response>
): Promise<Response> {
	if (!istJson(e)) return formatFehler();
	return mitSitzung(e, fn);
}

/** Wie `aendernd`, liest aber den Körper nach der Sitzung und reicht ihn `fn` mit. */
export async function aenderndMitKoerper(
	e: Ereignis,
	fn: (konto: Konto, koerper: Record<string, unknown>) => Promise<Response>
): Promise<Response> {
	return aendernd(e, async (konto) => fn(konto, await leseKoerper(e)));
}
