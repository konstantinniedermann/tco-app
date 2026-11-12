import { describe, expect, test } from 'vitest';
import type { Fehlerkoerper } from '../fehler.ts';
import {
	HINWEIS_SCHLUESSEL,
	hinweisAbgelehnt,
	lehneHinweisAb,
	pushMoeglich,
	schalteAus,
	schalteEin,
	schluesselBytes,
	type PushGeraet
} from './geraet.ts';

const UA = {
	iphone:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
	android:
		'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'
};

/** Browser mit oder ohne Push-Unterstützung, gestartet vom Symbol oder im Browser. */
function umgebung(userAgent: string, o: { vomSymbol: boolean; push: boolean }) {
	const navigator: Record<string, unknown> = { userAgent };
	const window: Record<string, unknown> = {
		matchMedia: (abfrage: string) => ({
			matches: o.vomSymbol && abfrage === '(display-mode: standalone)'
		}),
		navigator
	};
	if (o.push) {
		navigator.serviceWorker = {};
		window.PushManager = function PushManager() {};
		window.Notification = function Notification() {};
	}
	return { navigator, window } as unknown as Parameters<typeof pushMoeglich>[0];
}

describe('Ob Push auf diesem Gerät geht (FR-40)', () => {
	test('FR-40: iPhone vom Symbol mit Push-Unterstützung → ja', () => {
		expect(pushMoeglich(umgebung(UA.iphone, { vomSymbol: true, push: true }))).toBe('ja');
	});

	test('FR-40: iPhone im Browser → zuerst auf den Startbildschirm', () => {
		// Safari im Browser kennt PushManager nicht; das iPhone braucht den Startbildschirm.
		expect(pushMoeglich(umgebung(UA.iphone, { vomSymbol: false, push: false }))).toBe(
			'iphone-startbildschirm'
		);
		expect(pushMoeglich(umgebung(UA.iphone, { vomSymbol: false, push: true }))).toBe(
			'iphone-startbildschirm'
		);
	});

	test('FR-40: ohne PushManager oder Service Worker → nein; Android auch im Browser → ja', () => {
		expect(pushMoeglich(umgebung(UA.android, { vomSymbol: false, push: false }))).toBe('nein');
		expect(pushMoeglich(umgebung(UA.iphone, { vomSymbol: true, push: false }))).toBe('nein');
		expect(pushMoeglich(umgebung(UA.android, { vomSymbol: false, push: true }))).toBe('ja');
	});
});

describe('Merker «Nein, danke» im Gerätespeicher (FR-40)', () => {
	function speicher() {
		const werte = new Map<string, string>();
		return {
			werte,
			getItem: (k: string) => werte.get(k) ?? null,
			setItem: (k: string, v: string) => void werte.set(k, v),
			removeItem: (k: string) => void werte.delete(k)
		};
	}

	test('FR-40: «Nein, danke» wird unter mytco.pushHinweis gemerkt', () => {
		const s = speicher();
		expect(hinweisAbgelehnt(s)).toBe(false);
		lehneHinweisAb(s);
		expect(s.werte.get(HINWEIS_SCHLUESSEL)).toBe('nein');
		expect(HINWEIS_SCHLUESSEL).toBe('mytco.pushHinweis');
		expect(hinweisAbgelehnt(s)).toBe(true);
	});

	test('FR-40: gesperrter Speicher wirft nicht', () => {
		const kaputt = {
			getItem: () => {
				throw new Error('gesperrt');
			},
			setItem: () => {
				throw new Error('gesperrt');
			},
			removeItem: () => {}
		};
		expect(hinweisAbgelehnt(kaputt)).toBe(false);
		expect(() => lehneHinweisAb(kaputt)).not.toThrow();
	});
});

describe('Push einschalten und ausschalten (FR-40)', () => {
	// Erfundener öffentlicher Schlüssel: 65 Bytes, base64url ohne Auffüllung.
	const SCHLUESSEL = 'B' + 'A'.repeat(86);
	const ABO = { endpoint: 'https://push.example.org/abo/1', keys: { p256dh: 'p', auth: 'a' } };

	function geraet(o: {
		erlaubnis?: NotificationPermission;
		vorhanden?: { schluessel: Uint8Array } | null;
		ohneWorker?: boolean;
		antwort?: Response | Error;
	}) {
		const protokoll: string[] = [];
		const anfragen: { pfad: string; init: RequestInit }[] = [];
		const abo = (schluessel: Uint8Array) => ({
			options: { applicationServerKey: schluessel.buffer },
			toJSON: () => ABO,
			unsubscribe: async () => {
				protokoll.push('abgemeldet');
				return true;
			}
		});
		const g: PushGeraet = {
			bitteUmErlaubnis: async () => {
				protokoll.push('erlaubnis');
				return o.erlaubnis ?? 'granted';
			},
			pushManager: async () =>
				o.ohneWorker
					? null
					: ({
							getSubscription: async () => (o.vorhanden ? abo(o.vorhanden.schluessel) : null),
							subscribe: async (opt: PushSubscriptionOptionsInit) => {
								protokoll.push(`abonniert:${String(opt.userVisibleOnly)}`);
								return abo(opt.applicationServerKey as Uint8Array);
							}
						} as unknown as PushManager),
			holen: async (pfad, init) => {
				anfragen.push({ pfad, init });
				if (pfad.endsWith('/loeschen')) protokoll.push('server');
				if (o.antwort instanceof Error) throw o.antwort;
				return o.antwort ?? Response.json({ pushHier: true });
			}
		};
		return { g, protokoll, anfragen };
	}

	test('FR-40: schluesselBytes liest base64url', () => {
		expect([...schluesselBytes('AQID_-8')]).toEqual([1, 2, 3, 255, 239]);
		expect(schluesselBytes(SCHLUESSEL)).toHaveLength(65);
	});

	test('FR-40: Einschalten fragt um Erlaubnis, abonniert und meldet das Abo dem Server', async () => {
		const h = geraet({});
		expect(await schalteEin(SCHLUESSEL, h.g)).toBe('ein');
		expect(h.protokoll).toEqual(['erlaubnis', 'abonniert:true']);
		expect(h.anfragen[0].pfad).toBe('/api/benachrichtigungen/abo');
		expect(JSON.parse(String(h.anfragen[0].init.body))).toEqual(ABO);
	});

	test('FR-40: ohne Erlaubnis kein Abo', async () => {
		for (const erlaubnis of ['denied', 'default'] as const) {
			const h = geraet({ erlaubnis });
			expect(await schalteEin(SCHLUESSEL, h.g)).toBe('abgelehnt');
			expect(h.anfragen).toEqual([]);
		}
	});

	test('FR-40: vorhandenes Abo mit anderem Schlüssel wird ersetzt, mit gleichem übernommen', async () => {
		const anders = geraet({ vorhanden: { schluessel: new Uint8Array(65) } });
		expect(await schalteEin(SCHLUESSEL, anders.g)).toBe('ein');
		expect(anders.protokoll).toEqual(['erlaubnis', 'abgemeldet', 'abonniert:true']);
		const gleich = geraet({ vorhanden: { schluessel: schluesselBytes(SCHLUESSEL) } });
		expect(await schalteEin(SCHLUESSEL, gleich.g)).toBe('ein');
		expect(gleich.protokoll).toEqual(['erlaubnis']);
	});

	test('FR-40: Störung ohne Service Worker', async () => {
		expect(await schalteEin(SCHLUESSEL, geraet({ ohneWorker: true }).g)).toBe('stoerung');
	});

	test('FR-40: lehnt der Server ab (409 push-aus, 401, 500, Netz weg), wird das neue Abo im Browser wieder abgemeldet', async () => {
		const antworten = [
			Response.json({ fehler: 'push-aus' } satisfies Fehlerkoerper, { status: 409 }),
			Response.json({ fehler: 'abgemeldet' } satisfies Fehlerkoerper, { status: 401 }),
			Response.json({}, { status: 500 }),
			new Error('Netz weg')
		];
		for (const antwort of antworten) {
			const h = geraet({ antwort });
			expect(await schalteEin(SCHLUESSEL, h.g)).toBe('stoerung');
			expect(h.protokoll).toEqual(['erlaubnis', 'abonniert:true', 'abgemeldet']);
		}
	});

	test('FR-40: 401 beim Einschalten ergibt Störung, ein schon vorhandenes Abo bleibt', async () => {
		const h = geraet({
			vorhanden: { schluessel: schluesselBytes(SCHLUESSEL) },
			antwort: Response.json({ fehler: 'abgemeldet' } satisfies Fehlerkoerper, { status: 401 })
		});
		expect(await schalteEin(SCHLUESSEL, h.g)).toBe('stoerung');
		expect(h.protokoll).toEqual(['erlaubnis']);
	});

	test('FR-40: Ausschalten löscht zuerst auf dem Server, dann im Browser', async () => {
		const h = geraet({
			vorhanden: { schluessel: schluesselBytes(SCHLUESSEL) },
			antwort: Response.json({ pushHier: false })
		});
		expect(await schalteAus(h.g)).toBe('aus');
		expect(h.protokoll).toEqual(['server', 'abgemeldet']);
		expect(h.anfragen[0].pfad).toBe('/api/benachrichtigungen/abo/loeschen');
		expect(JSON.parse(String(h.anfragen[0].init.body))).toEqual({});
		// Ohne Service Worker ist es auf dem Server trotzdem gelöscht.
		const ohne = geraet({ ohneWorker: true, antwort: Response.json({ pushHier: false }) });
		expect(await schalteAus(ohne.g)).toBe('aus');
		expect(ohne.anfragen).toHaveLength(1);
	});

	test('FR-40: scheitert das Löschen auf dem Server, bleibt das Abo im Browser', async () => {
		for (const antwort of [Response.json({}, { status: 500 }), new Error('Netz weg')]) {
			const h = geraet({ vorhanden: { schluessel: schluesselBytes(SCHLUESSEL) }, antwort });
			expect(await schalteAus(h.g)).toBe('stoerung');
			expect(h.protokoll).toEqual(['server']);
		}
	});
});
