import { and, eq, gt, isNotNull, lt, sql } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { mitglied, konto, sitzung } from '../db/schema.ts';
import type { Bremsen } from '../login/bremse.ts';
import {
	MAIL_CODE_GUELTIG_MS,
	MAIL_CODE_MAX_FEHLVERSUCHE,
	erzeugeMailCode,
	gleich,
	hashAdminCode,
	normalisiereMailCode
} from '../login/codes.ts';
import type { Mailer } from '../login/dienst.ts';
import type { AngemeldetesKonto } from '../login/sitzung.ts';
import { verwaltungsrollen, type VerwaltungsRolle } from './rollen.ts';

// SI-08: Die Bestätigung gilt 24 Stunden für diese Sitzung.
export const ADMIN_BESTAETIGUNG_MS = 24 * 60 * 60 * 1000;

// RR-07: `rollen` ist nie leer; ohne Verwaltungsrolle heisst die Stufe `keine-rolle`.
// Die Rollen werden bei jeder Prüfung neu gelesen: Entzug oder Sperre wirkt sofort.
export type Zugang =
	| { stufe: 'bestaetigt'; kontoId: number; mitgliedId: number; rollen: VerwaltungsRolle[] }
	| { stufe: 'unbestaetigt'; rollen: VerwaltungsRolle[] }
	| { stufe: 'keine-rolle' }
	| { stufe: 'abgemeldet' };

export type ZugangDienst = {
	pruefe(konto: AngemeldetesKonto | undefined): Promise<Zugang>;
	// `arbeit` läuft ohne Warten des Aufrufers und lehnt nie ab. Keine Verwaltungsrolle: keine Mail.
	fordereCodeAn(
		konto: AngemeldetesKonto
	): Promise<{ annahme: 'ok' | 'zu-viele'; arbeit: Promise<void> }>;
	bestaetige(konto: AngemeldetesKonto, eingabe: unknown): Promise<'ok' | 'falsch'>;
};

export type ZugangAbh = {
	db: Db;
	schluessel: string;
	kontakt: string;
	mailer: Mailer;
	bremsen: Bremsen;
	jetzt?: () => Date;
};

export function baueAdminCodeMail(
	code: string,
	kontakt: string
): { betreff: string; text: string } {
	return {
		betreff: 'Dein Code für die Verwaltung von MyTCO',
		text: [
			`${code} ist dein Code für die Verwaltung von MyTCO.`,
			'',
			'Der Code gilt 15 Minuten und nur einmal.',
			'',
			`Hast du keinen Code angefordert? Dann melde dich bei ${kontakt}.`
		].join('\n')
	};
}

export function erstelleZugangDienst(abh: ZugangAbh): ZugangDienst {
	const { db, schluessel, kontakt, bremsen } = abh;
	const jetzt = abh.jetzt ?? (() => new Date());

	const hatVerwaltungsrolle = async (kontoId: number) =>
		(await verwaltungsrollen(db, kontoId)).length > 0;

	async function pruefe(k: AngemeldetesKonto | undefined): Promise<Zugang> {
		if (!k) return { stufe: 'abgemeldet' };
		const rollen = await verwaltungsrollen(db, k.kontoId);
		if (rollen.length === 0) return { stufe: 'keine-rolle' };
		const [zeile] = await db
			.select({ am: sitzung.adminBestaetigtAm })
			.from(sitzung)
			.where(eq(sitzung.kennungHash, k.sitzungHash));
		if (!zeile?.am || jetzt().getTime() - zeile.am.getTime() >= ADMIN_BESTAETIGUNG_MS) {
			return { stufe: 'unbestaetigt', rollen };
		}
		return { stufe: 'bestaetigt', kontoId: k.kontoId, mitgliedId: k.mitgliedId, rollen };
	}

	async function speichereUndSende(k: AngemeldetesKonto, an: string): Promise<void> {
		try {
			const code = erzeugeMailCode();
			const zeilen = await db
				.update(sitzung)
				.set({
					adminCodeHash: hashAdminCode(schluessel, k.sitzungHash, code),
					adminCodeAblauf: new Date(jetzt().getTime() + MAIL_CODE_GUELTIG_MS),
					adminCodeFehlversuche: 0
				})
				.where(eq(sitzung.kennungHash, k.sitzungHash))
				.returning({ h: sitzung.kennungHash });
			if (zeilen.length === 0) return;
			await abh.mailer({ an, ...baueAdminCodeMail(code, kontakt) });
		} catch {
			// SI-05: feste Zeile, keine Fehlerdetails (können Adresse oder Zugangsdaten enthalten).
			console.error('Admin-Code-Mail nicht versandt');
		}
	}

	// Die Grenze darf hier sichtbar werden: Der Aufrufer ist angemeldet und hat eine Verwaltungsrolle,
	// die Adresse ist seine eigene.
	async function fordereCodeAn(
		k: AngemeldetesKonto
	): Promise<{ annahme: 'ok' | 'zu-viele'; arbeit: Promise<void> }> {
		const keineMail = { annahme: 'ok' as const, arbeit: Promise.resolve() };
		if (!(await hatVerwaltungsrolle(k.kontoId))) return keineMail;
		const [m] = await db
			.select({ email: mitglied.email })
			.from(konto)
			.innerJoin(mitglied, eq(mitglied.id, konto.mitgliedId))
			.where(eq(konto.id, k.kontoId));
		if (!m?.email) return keineMail;
		const adresse = m.email.trim().toLowerCase();
		if (
			!bremsen.mailsProAdresseStunde.erlaubt(adresse) ||
			!bremsen.mailsProAdresseTag.erlaubt(adresse)
		) {
			return { annahme: 'zu-viele', arbeit: Promise.resolve() };
		}
		bremsen.mailsProAdresseStunde.zaehle(adresse);
		bremsen.mailsProAdresseTag.zaehle(adresse);
		return { annahme: 'ok', arbeit: speichereUndSende(k, m.email) };
	}

	async function bestaetige(k: AngemeldetesKonto, eingabe: unknown): Promise<'ok' | 'falsch'> {
		const code = typeof eingabe === 'string' ? normalisiereMailCode(eingabe) : null;
		if (code === null || !(await hatVerwaltungsrolle(k.kontoId))) return 'falsch';
		const t = jetzt();
		// Der Versuch wird atomar reserviert; mehr als 5 sind auch parallel nicht möglich.
		const [reserviert] = await db
			.update(sitzung)
			.set({ adminCodeFehlversuche: sql`${sitzung.adminCodeFehlversuche} + 1` })
			.where(
				and(
					eq(sitzung.kennungHash, k.sitzungHash),
					isNotNull(sitzung.adminCodeHash),
					gt(sitzung.adminCodeAblauf, t),
					lt(sitzung.adminCodeFehlversuche, MAIL_CODE_MAX_FEHLVERSUCHE)
				)
			)
			.returning({ hash: sitzung.adminCodeHash });
		if (!reserviert?.hash) return 'falsch';
		const hash = hashAdminCode(schluessel, k.sitzungHash, code);
		if (!gleich(hash, reserviert.hash)) return 'falsch';
		// Bedingtes UPDATE: der Code wird atomar nur einmal verbraucht.
		const [eingeloest] = await db
			.update(sitzung)
			.set({
				adminBestaetigtAm: t,
				adminCodeHash: null,
				adminCodeAblauf: null,
				adminCodeFehlversuche: 0
			})
			.where(and(eq(sitzung.kennungHash, k.sitzungHash), eq(sitzung.adminCodeHash, hash)))
			.returning({ h: sitzung.kennungHash });
		return eingeloest ? 'ok' : 'falsch';
	}

	return { pruefe, fordereCodeAn, bestaetige };
}
