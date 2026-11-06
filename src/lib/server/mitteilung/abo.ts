// Push-Abo prüfen, speichern und löschen (FR-40). Der Endpunkt ist eine URL, die der Server später
// aufruft; darum nur Push-Dienste der Browser-Hersteller (SI-21), sonst wäre es eine Anfragefälschung.
import { and, eq, ne } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { pushAbo } from '../db/schema.ts';

export type Abo = { endpunkt: string; p256dh: string; auth: string };

const MAX_ENDPUNKT = 1000;
const MAX_P256DH = 200;
const MAX_AUTH = 100;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

const GENAU = ['fcm.googleapis.com', 'updates.push.services.mozilla.com'];
const ENDUNG = ['.push.apple.com', '.notify.windows.com'];

function hostErlaubt(host: string): boolean {
	return GENAU.includes(host) || ENDUNG.some((e) => host.endsWith(e) && host.length > e.length);
}

/** Der Endpunkt in der Schreibweise von `URL`, damit dasselbe Gerät nur einmal gespeichert wird; `null`, wenn ungültig. */
function gueltigerEndpunkt(roh: string): string | null {
	if (roh.length > MAX_ENDPUNKT) return null;
	let u: URL;
	try {
		u = new URL(roh);
	} catch {
		return null;
	}
	const gueltig =
		u.protocol === 'https:' &&
		u.username === '' &&
		u.password === '' &&
		u.port === '' &&
		hostErlaubt(u.hostname) &&
		u.href.length <= MAX_ENDPUNKT;
	return gueltig ? u.href : null;
}

const schluessel = (w: unknown, max: number): w is string =>
	typeof w === 'string' && w.length <= max && BASE64URL.test(w);

/** Erwartet die Form von `PushSubscription.toJSON()`. */
export function pruefeAbo(roh: unknown): { ok: true; abo: Abo } | { ok: false } {
	if (typeof roh !== 'object' || roh === null) return { ok: false };
	const { endpoint, keys } = roh as { endpoint?: unknown; keys?: unknown };
	const endpunkt = typeof endpoint === 'string' ? gueltigerEndpunkt(endpoint) : null;
	if (endpunkt === null) return { ok: false };
	if (typeof keys !== 'object' || keys === null) return { ok: false };
	const { p256dh, auth } = keys as { p256dh?: unknown; auth?: unknown };
	if (!schluessel(p256dh, MAX_P256DH) || !schluessel(auth, MAX_AUTH)) return { ok: false };
	return { ok: true, abo: { endpunkt, p256dh, auth } };
}

/**
 * Ein Abo je Sitzung (FR-40): Andere Abos derselben Sitzung fallen weg. Upsert auf den Endpunkt:
 * dasselbe Gerät bei einem anderen Konto wechselt zum neuen Konto.
 */
export async function speichereAbo(
	db: Db,
	kontoId: number,
	sitzungHash: string,
	abo: Abo,
	jetzt: Date
): Promise<void> {
	const werte = {
		kontoId,
		sitzungHash,
		p256dh: abo.p256dh,
		auth: abo.auth,
		eingerichtetAm: jetzt
	};
	await db.transaction(async (tx) => {
		await tx
			.delete(pushAbo)
			.where(and(eq(pushAbo.sitzungHash, sitzungHash), ne(pushAbo.endpunkt, abo.endpunkt)));
		await tx
			.insert(pushAbo)
			.values({ endpunkt: abo.endpunkt, ...werte })
			.onConflictDoUpdate({ target: pushAbo.endpunkt, set: werte });
	});
}

export async function loescheAbo(db: Db, sitzungHash: string): Promise<void> {
	await db.delete(pushAbo).where(eq(pushAbo.sitzungHash, sitzungHash));
}

export async function hatAbo(db: Db, sitzungHash: string): Promise<boolean> {
	const z = await db
		.select({ e: pushAbo.endpunkt })
		.from(pushAbo)
		.where(eq(pushAbo.sitzungHash, sitzungHash))
		.limit(1);
	return z.length > 0;
}
