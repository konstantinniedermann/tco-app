// Push auf diesem Gerät (FR-40): ob er geht, einschalten, ausschalten, und der Merker für den
// Hinweis auf der Startseite. Läuft nur im Browser; Browser-Teile werden übergeben, damit das
// ohne Browser testbar ist.
import { erkenneGeraet, laeuftVomSymbol } from '../hilfe/geraet.ts';
import type { Speicher } from '../login/mailanfrage.ts';
import type { Holen } from '../abruf.ts';
import { loescheAbo, sendeAbo } from './api.ts';

export type PushMoeglich = 'ja' | 'iphone-startbildschirm' | 'nein';

type Umgebung = {
	navigator: { userAgent: string };
	window: { matchMedia(abfrage: string): { matches: boolean }; navigator: object };
};

/**
 * `'iphone-startbildschirm'`: iPhone, nicht vom Symbol gestartet (dort gibt es Push nur vom
 * Startbildschirm). `'nein'`: Der Browser kennt Service Worker, PushManager oder Mitteilungen nicht.
 */
export function pushMoeglich(f: Umgebung): PushMoeglich {
	if (erkenneGeraet(f.navigator.userAgent) === 'iphone' && !laeuftVomSymbol(f.window)) {
		return 'iphone-startbildschirm';
	}
	const kann =
		'serviceWorker' in f.navigator && 'PushManager' in f.window && 'Notification' in f.window;
	return kann ? 'ja' : 'nein';
}

/** Gerätespeicher: «Nein, danke» zum Hinweis auf der Startseite gilt auf diesem Gerät. */
export const HINWEIS_SCHLUESSEL = 'mytco.pushHinweis';

export function hinweisAbgelehnt(s: Speicher): boolean {
	try {
		return s.getItem(HINWEIS_SCHLUESSEL) === 'nein';
	} catch {
		return false;
	}
}

export function lehneHinweisAb(s: Speicher): void {
	try {
		s.setItem(HINWEIS_SCHLUESSEL, 'nein');
	} catch {
		// Gesperrter Speicher (privates Fenster): Der Hinweis kommt dann beim nächsten Start wieder.
	}
}

/** Öffentlicher VAPID-Schlüssel (base64url, ohne Auffüllung) als Bytes für `subscribe`. */
export function schluesselBytes(schluessel: string): Uint8Array<ArrayBuffer> {
	const b64 = schluessel.replace(/-/g, '+').replace(/_/g, '/');
	const roh = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
	const bytes = new Uint8Array(roh.length);
	for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
	return bytes;
}

function gleich(a: ArrayBuffer | null, b: Uint8Array): boolean {
	if (!a || a.byteLength !== b.length) return false;
	const x = new Uint8Array(a);
	return x.every((wert, i) => wert === b[i]);
}

export type PushGeraet = {
	bitteUmErlaubnis: () => Promise<NotificationPermission>;
	/** PushManager des aktiven Service Workers; `null`, wenn keiner bereit ist. */
	pushManager: () => Promise<PushManager | null>;
	holen: Holen;
};

/** So lange wartet das Einschalten auf den Service Worker (er startet beim ersten Laden). */
const WARTEN_MS = 10_000;

function browser(): PushGeraet {
	return {
		bitteUmErlaubnis: () => Notification.requestPermission(),
		pushManager: async () => {
			const frist = new Promise<null>((ok) => setTimeout(() => ok(null), WARTEN_MS));
			const r = await Promise.race([navigator.serviceWorker.ready, frist]);
			return r?.pushManager ?? null;
		},
		holen: fetch
	};
}

/**
 * Nur aus einem Tipp aufrufen: Das iPhone fragt sonst nicht um Erlaubnis. Ein Abo mit einem
 * anderen Schlüssel (Schlüssel gewechselt) wird ersetzt, eines mit demselben übernommen. Nimmt
 * der Server ein hier neu angelegtes Abo nicht an, wird es im Browser wieder abgemeldet: Browser
 * und Server sollen nicht auseinanderlaufen.
 */
export async function schalteEin(
	schluessel: string,
	g: PushGeraet = browser()
): Promise<'ein' | 'abgelehnt' | 'stoerung'> {
	try {
		if ((await g.bitteUmErlaubnis()) !== 'granted') return 'abgelehnt';
		const pm = await g.pushManager();
		if (!pm) return 'stoerung';
		const bytes = schluesselBytes(schluessel);
		let abo = await pm.getSubscription();
		if (abo && !gleich(abo.options.applicationServerKey, bytes)) {
			await abo.unsubscribe();
			abo = null;
		}
		const neu = abo === null;
		abo ??= await pm.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
		const r = await sendeAbo(abo.toJSON(), g.holen);
		if (r.art === 'ok') return 'ein';
		if (neu) await abo.unsubscribe().catch(() => false);
		return 'stoerung';
	} catch {
		return 'stoerung';
	}
}

/**
 * Löscht das Abo zuerst auf dem Server; erst wenn das geklappt hat, auch im Browser. Scheitert
 * der Server, bleibt Push an (`'stoerung'`), statt im Browser aus und auf dem Server an zu sein.
 */
export async function schalteAus(g: PushGeraet = browser()): Promise<'aus' | 'stoerung'> {
	const r = await loescheAbo(g.holen);
	if (r.art !== 'ok') return 'stoerung';
	try {
		const abo = await (await g.pushManager())?.getSubscription();
		await abo?.unsubscribe();
	} catch {
		// Kein Service Worker oder Abo schon weg: Auf dem Server ist es gelöscht, es kommt nichts mehr.
	}
	return 'aus';
}
