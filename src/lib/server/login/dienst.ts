import { and, eq, gt, inArray, isNull } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { konto, mitglied } from '../db/schema.ts';
import type { Bremsen } from './bremse.ts';
import {
	BRIEF_CODE_GUELTIG_MS,
	erzeugeBriefCode,
	hashBriefCode,
	normalisiereBriefCode
} from './codes.ts';
import { beendeAlleSitzungen, beendeSitzung, erstelleSitzung, pruefeSitzung } from './sitzung.ts';

export type Mailer = (n: { an: string; betreff: string; text: string }) => Promise<void>;

export type LoginAbh = {
	db: Db;
	schluessel: string;
	kontakt: string;
	mailer: Mailer;
	bremsen: Bremsen;
	jetzt?: () => Date;
};

export type LoginErgebnis =
	| { ergebnis: 'ok'; kennung: string }
	| { ergebnis: 'falsch' }
	| { ergebnis: 'benutzt'; kontakt: string }
	| { ergebnis: 'zu-viele' };

export type LoginDienst = {
	// RR-04: einziger Moment, in dem der Brief-Code im Klartext existiert.
	stelleBriefCodeAus(kontoId: number): Promise<{ code: string; gueltigBis: Date }>;
	loginMitBriefCode(eingabe: unknown, ip: string, alteKennung?: string): Promise<LoginErgebnis>;
	beendeAlleSitzungen(kontoId: number): Promise<void>;
	pruefeSitzung(kennung: string): ReturnType<typeof pruefeSitzung>;
	beendeSitzung(kennung: string): Promise<void>;
};

const MAX_VERSUCHE_AUSSTELLEN = 3;

// Postgres-Fehlercode 23505 (unique_violation); Drizzle verpackt den Treiberfehler in `cause`.
function istEindeutigkeitsfehler(fehler: unknown): boolean {
	let aktuell: unknown = fehler;
	for (let i = 0; i < 3 && aktuell instanceof Error; i++) {
		if ((aktuell as { code?: unknown }).code === '23505') return true;
		aktuell = aktuell.cause;
	}
	return false;
}

export function erstelleLoginDienst(abh: LoginAbh): LoginDienst {
	const { db, schluessel, kontakt, bremsen } = abh;
	const jetzt = abh.jetzt ?? (() => new Date());

	const aktivesMitglied = inArray(
		konto.mitgliedId,
		db.select({ id: mitglied.id }).from(mitglied).where(eq(mitglied.status, 'aktiv'))
	);

	async function stelleBriefCodeAus(kontoId: number) {
		const gueltigBis = new Date(jetzt().getTime() + BRIEF_CODE_GUELTIG_MS);
		for (let versuch = 1; ; versuch++) {
			const code = erzeugeBriefCode();
			try {
				const zeilen = await db
					.update(konto)
					.set({
						briefCodeHash: hashBriefCode(schluessel, code),
						briefCodeAblauf: gueltigBis,
						briefCodeBenutztAm: null
					})
					.where(eq(konto.id, kontoId))
					.returning({ id: konto.id });
				if (zeilen.length === 0) throw new Error('Konto nicht gefunden');
				return { code, gueltigBis };
			} catch (fehler) {
				if (!istEindeutigkeitsfehler(fehler) || versuch >= MAX_VERSUCHE_AUSSTELLEN) throw fehler;
			}
		}
	}

	async function loginMitBriefCode(
		eingabe: unknown,
		ip: string,
		alteKennung?: string
	): Promise<LoginErgebnis> {
		if (!bremsen.briefFehlerProIp.erlaubt(ip)) return { ergebnis: 'zu-viele' };
		const code = typeof eingabe === 'string' ? normalisiereBriefCode(eingabe) : null;
		if (code === null) {
			bremsen.briefFehlerProIp.zaehle(ip);
			return { ergebnis: 'falsch' };
		}
		const hash = hashBriefCode(schluessel, code);
		const t = jetzt();
		// Ein bedingtes UPDATE entscheidet atomar, wer den Code einlöst (Review Focus 4).
		const [eingeloest] = await db
			.update(konto)
			.set({
				briefCodeBenutztAm: t,
				mailCodeHash: null,
				mailCodeAblauf: null,
				mailCodeFehlversuche: 0
			})
			.where(
				and(
					eq(konto.briefCodeHash, hash),
					isNull(konto.briefCodeBenutztAm),
					gt(konto.briefCodeAblauf, t),
					eq(konto.gesperrt, false),
					aktivesMitglied
				)
			)
			.returning({ id: konto.id });
		if (eingeloest) {
			const kennung = await erstelleSitzung(db, eingeloest.id, t, alteKennung);
			return { ergebnis: 'ok', kennung };
		}
		// Nichts eingelöst: «benutzt» nur für einen gültigen, bereits verbrauchten Code.
		const [verbraucht] = await db
			.select({ id: konto.id })
			.from(konto)
			.where(
				and(
					eq(konto.briefCodeHash, hash),
					gt(konto.briefCodeAblauf, t),
					eq(konto.gesperrt, false),
					aktivesMitglied
				)
			);
		if (verbraucht) return { ergebnis: 'benutzt', kontakt };
		bremsen.briefFehlerProIp.zaehle(ip);
		return { ergebnis: 'falsch' };
	}

	return {
		stelleBriefCodeAus,
		loginMitBriefCode,
		beendeAlleSitzungen: (kontoId) => beendeAlleSitzungen(db, kontoId),
		pruefeSitzung: (kennung) => pruefeSitzung(db, kennung, jetzt()),
		beendeSitzung: (kennung) => beendeSitzung(db, kennung)
	};
}
