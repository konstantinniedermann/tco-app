import type { RequestEvent } from '@sveltejs/kit';
import type { Ereignis } from '../../src/lib/server/http.ts';

type Optionen = {
	body?: unknown;
	contentType?: string;
	cookie?: string;
	ip?: string;
	url?: string;
	method?: string;
	params?: Record<string, string>;
	konto?: App.Locals['konto'];
};

// Baut ein minimales, erfundenes Ereignis. `body` wird als JSON gesendet, ausser er ist ein
// String (dann roh); `contentType: ''` lässt die Kopfzeile weg.
export function ereignis(opt: Optionen = {}): Ereignis &
	Pick<RequestEvent, 'params'> & {
		gesetzt: Map<string, { wert: string; opt: object }>;
		geloescht: string[];
	} {
	const gesetzt = new Map<string, { wert: string; opt: object }>();
	const geloescht: string[] = [];
	const contentType = opt.contentType ?? 'application/json';
	const headers = new Headers();
	if (contentType !== '') headers.set('content-type', contentType);
	const body =
		opt.body === undefined
			? undefined
			: typeof opt.body === 'string'
				? opt.body
				: JSON.stringify(opt.body);
	const request = new Request(opt.url ?? 'http://localhost/api/test', {
		method: opt.method ?? 'POST',
		headers,
		// GET und HEAD dürfen keinen Körper haben.
		body: ['GET', 'HEAD'].includes(opt.method ?? 'POST') ? undefined : body
	});
	const cookies = {
		get: (name: string) => (name === 'mytco_sitzung' ? opt.cookie : undefined),
		getAll: () => [],
		set: (name: string, wert: string, o: object) => {
			gesetzt.set(name, { wert, opt: o });
		},
		delete: (name: string) => {
			geloescht.push(name);
		},
		serialize: () => ''
	} as unknown as RequestEvent['cookies'];
	return {
		request,
		cookies,
		getClientAddress: () => opt.ip ?? '203.0.113.7',
		locals: (opt.konto ? { konto: opt.konto } : {}) as App.Locals,
		params: opt.params ?? {},
		url: new URL(opt.url ?? 'http://localhost/api/test'),
		gesetzt,
		geloescht
	};
}
