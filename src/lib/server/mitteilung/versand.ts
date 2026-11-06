// Vorschau und Versand einer Mitteilung (FR-44, DS-05). Zuerst alle Pushes, dann die Mails, damit
// beim Weg «Push, sonst E-Mail» eine Mail bekommt, bei wem jeder Push scheiterte (Spec Ziel 15).
// Ein Fehler bei einem Empfänger hält die anderen nicht auf; der Versand wirft nie und loggt
// nichts (SI-05), er zählt nur.
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { pushAbo, type Weg } from '../db/schema.ts';
import type { Mailer } from '../login/dienst.ts';
import type { Empfaenger } from './empfaenger.ts';

type Abo = Empfaenger['abos'][number];

/** Ein Push an ein Abo; `ungueltig` heisst: der Push-Dienst kennt das Abo nicht mehr. */
export type PushSender = (abo: Abo, nutzlast: string) => Promise<'ok' | 'ungueltig' | 'fehler'>;

/**
 * Zahlen einer Mitteilung, je Empfänger gezählt (Vorschau: geplant, Versand: geschehen).
 * - `push`: Empfänger mit Push (Vorschau: mit mindestens einem Abo; Versand: mit mindestens
 *   einem gelungenen Push). Ohne VAPID immer 0.
 * - `mails`: Mails nach dem Weg, ohne Ersatz-Mails (Versand: nur die, die der Mailer annahm).
 * - `ersatzMails`: nur beim Weg `push-sonst-mail`, an Empfänger mit Abo, bei denen jeder Push
 *   scheiterte (Vorschau: immer 0, das zeigt erst der Versand).
 * - `nichtErreichbar`: Empfänger, die weder einen Push noch eine Mail bekommen (Versand: auch,
 *   wenn ihre Mail scheiterte).
 */
export type Zahlen = { push: number; mails: number; ersatzMails: number; nichtErreichbar: number };

const hatMail = (e: Empfaenger) => Boolean(e.email);

/** Bekommt der Empfänger nach dem Weg eine Mail, wenn er Push hat (`mitPush`) oder nicht? */
const mailNachWeg = (weg: Weg, mitPush: boolean) =>
	weg === 'push-und-mail' || (weg === 'push-sonst-mail' && !mitPush);

/** `mitPush`: ob der Server Pushes schicken kann (VAPID gesetzt); sonst zählt jeder als ohne Push. */
export function vorschau(
	empf: Empfaenger[],
	weg: Weg,
	mitPush: boolean
): Zahlen & { anzahl: number; namen: string[] } {
	const z: Zahlen = { push: 0, mails: 0, ersatzMails: 0, nichtErreichbar: 0 };
	for (const e of empf) {
		const push = mitPush && e.abos.length > 0;
		const mail = hatMail(e) && mailNachWeg(weg, push);
		if (push) z.push++;
		if (mail) z.mails++;
		if (!push && !mail) z.nichtErreichbar++;
	}
	return { anzahl: empf.length, namen: empf.map((e) => e.name), ...z };
}

// Pushes gehen an verschiedene Push-Dienste; einige gleichzeitig verkürzen den Versand.
const GLEICHZEITIG = 10;

async function nebeneinander<T>(liste: T[], fn: (x: T) => Promise<void>): Promise<void> {
	let naechster = 0;
	const arbeiter = async () => {
		while (naechster < liste.length) await fn(liste[naechster++]);
	};
	await Promise.all(Array.from({ length: Math.min(GLEICHZEITIG, liste.length) }, arbeiter));
}

/** Gelungen ja/nein; ein ungültiges Abo wird gelöscht. Wirft nie. */
async function sendePush(db: Db, push: PushSender, abo: Abo, nutzlast: string): Promise<boolean> {
	try {
		const r = await push(abo, nutzlast);
		if (r === 'ungueltig') await db.delete(pushAbo).where(eq(pushAbo.endpunkt, abo.endpunkt));
		return r === 'ok';
	} catch {
		return false;
	}
}

/** DS-05: je Empfänger eine eigene Mail an genau seine Adresse. Gelungen ja/nein, wirft nie. */
async function sendeMail(mailer: Mailer, an: string, betreff: string, text: string) {
	try {
		await mailer({ an, betreff, text });
		return true;
	} catch {
		return false;
	}
}

/**
 * `push: null`: kein VAPID, jeder zählt als ohne Push (keine Ersatz-Mail). `adresse`: Adresse von
 * MyTCO für den Link in der Fusszeile. `link`: volle Adresse der Seite, für Push und Mail.
 */
export async function versende(
	d: { push: PushSender | null; mailer: Mailer; db: Db; adresse: string },
	empf: Empfaenger[],
	m: { titel: string; text: string; link: string; weg: Weg }
): Promise<Zahlen> {
	const z: Zahlen = { push: 0, mails: 0, ersatzMails: 0, nichtErreichbar: 0 };
	const nutzlast = JSON.stringify({ titel: m.titel, text: m.text, link: m.link });
	const gelungen = new Set<Empfaenger>();
	const push = d.push;
	if (push !== null) {
		await nebeneinander(empf, async (e) => {
			const r = await Promise.all(e.abos.map((a) => sendePush(d.db, push, a, nutzlast)));
			if (r.includes(true)) gelungen.add(e);
		});
	}
	const fuss = `Diese Mitteilungen kannst du im Profil abschalten: ${d.adresse.replace(/\/+$/, '')}/profil`;
	const text = `${m.text}\n\n${m.link}\n\n${fuss}`;
	for (const e of empf) {
		const mitPush = gelungen.has(e);
		if (mitPush) z.push++;
		// Ersatz: hatte ein Abo, Push war möglich, und jeder Push scheiterte.
		const ersatz = m.weg === 'push-sonst-mail' && push !== null && e.abos.length > 0 && !mitPush;
		const mail =
			e.email && mailNachWeg(m.weg, mitPush)
				? await sendeMail(d.mailer, e.email, m.titel, text)
				: false;
		if (mail && ersatz) z.ersatzMails++;
		else if (mail) z.mails++;
		if (!mitPush && !mail) z.nichtErreichbar++;
	}
	return z;
}
