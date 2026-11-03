import { and, eq, gt, inArray, isNotNull, isNull, lt, lte, sql } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { konto, mitglied } from '../db/schema.ts';
import type { Bremsen } from './bremse.ts';
import {
	BRIEF_CODE_GUELTIG_MS,
	MAIL_CODE_GUELTIG_MS,
	MAIL_CODE_MAX_FEHLVERSUCHE,
	erzeugeBriefCode,
	erzeugeMailCode,
	gleich,
	hashBriefCode,
	hashMailCode,
	normalisiereBriefCode,
	normalisiereMailCode
} from './codes.ts';
import { ipSchluessel } from './ip-schluessel.ts';
import { baueCodeMail } from './mail.ts';
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
	// SI-04: `annahme` hängt nie vom Konto ab; `arbeit` läuft ohne Warten des Aufrufers und lehnt nie ab.
	fordereMailCodeAn(
		email: unknown,
		ip: string
	): { annahme: 'ok' | 'zu-viele'; arbeit: Promise<void> };
	// B-02: liefert nie 'benutzt'.
	loginMitMailCode(
		email: unknown,
		eingabe: unknown,
		ip: string,
		alteKennung?: string
	): Promise<LoginErgebnis>;
	beendeAlleSitzungen(kontoId: number): Promise<void>;
	pruefeSitzung(kennung: string): ReturnType<typeof pruefeSitzung>;
	beendeSitzung(kennung: string): Promise<void>;
};

const MAX_VERSUCHE_AUSSTELLEN = 3;
const MAX_ADRESSE = 254;

function normalisiereAdresse(email: unknown): string | null {
	if (typeof email !== 'string') return null;
	const adresse = email.trim().toLowerCase();
	return adresse === '' || adresse.length > MAX_ADRESSE ? null : adresse;
}

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
		const ipKey = ipSchluessel(ip);
		if (!bremsen.briefFehlerProIp.erlaubt(ipKey)) return { ergebnis: 'zu-viele' };
		const code = typeof eingabe === 'string' ? normalisiereBriefCode(eingabe) : null;
		if (code === null) {
			bremsen.briefFehlerProIp.zaehle(ipKey);
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
		bremsen.briefFehlerProIp.zaehle(ipKey);
		return { ergebnis: 'falsch' };
	}

	const aktivesKonto = (adresse: string) =>
		and(
			inArray(
				konto.mitgliedId,
				db
					.select({ id: mitglied.id })
					.from(mitglied)
					.where(and(eq(mitglied.status, 'aktiv'), sql`lower(${mitglied.email}) = ${adresse}`))
			),
			eq(konto.gesperrt, false)
		);

	async function versendeMailCode(adresse: string): Promise<void> {
		try {
			const [k] = await db.select({ id: konto.id }).from(konto).where(aktivesKonto(adresse));
			if (!k) return;
			const code = erzeugeMailCode();
			await db
				.update(konto)
				.set({
					mailCodeHash: hashMailCode(schluessel, k.id, code),
					mailCodeAblauf: new Date(jetzt().getTime() + MAIL_CODE_GUELTIG_MS),
					mailCodeFehlversuche: 0
				})
				.where(eq(konto.id, k.id));
			await abh.mailer({ an: adresse, ...baueCodeMail(code) });
		} catch {
			// SI-05: feste Zeile, keine Fehlerdetails (können Adresse oder Zugangsdaten enthalten).
			console.error('Code-Mail nicht versandt');
		}
	}

	function fordereMailCodeAn(email: unknown, ip: string) {
		const ipKey = ipSchluessel(ip);
		if (!bremsen.anfragenProIp.erlaubt(ipKey)) {
			return { annahme: 'zu-viele' as const, arbeit: Promise.resolve() };
		}
		bremsen.anfragenProIp.zaehle(ipKey);
		const adresse = normalisiereAdresse(email);
		let arbeit: Promise<void> = Promise.resolve();
		if (
			adresse !== null &&
			bremsen.mailsProAdresseStunde.erlaubt(adresse) &&
			bremsen.mailsProAdresseTag.erlaubt(adresse)
		) {
			bremsen.mailsProAdresseStunde.zaehle(adresse);
			bremsen.mailsProAdresseTag.zaehle(adresse);
			arbeit = versendeMailCode(adresse);
		}
		return { annahme: 'ok' as const, arbeit };
	}

	async function loginMitMailCode(
		email: unknown,
		eingabe: unknown,
		ip: string,
		alteKennung?: string
	): Promise<LoginErgebnis> {
		const ipKey = ipSchluessel(ip);
		if (!bremsen.mailFehlerProIp.erlaubt(ipKey)) return { ergebnis: 'zu-viele' };
		// Jeder Versuch zählt sofort, vor dem ersten await: parallele Anfragen umgehen die Grenze nicht.
		bremsen.mailFehlerProIp.zaehle(ipKey);
		const falsch = (): LoginErgebnis => ({ ergebnis: 'falsch' });
		const adresse = normalisiereAdresse(email);
		const code = typeof eingabe === 'string' ? normalisiereMailCode(eingabe) : null;
		if (adresse === null || code === null) return falsch();
		const t = jetzt();
		// SI-03: Der Versuch wird atomar reserviert; mehr als 5 sind auch parallel nicht möglich.
		const [k] = await db
			.update(konto)
			.set({ mailCodeFehlversuche: sql`${konto.mailCodeFehlversuche} + 1` })
			.where(
				and(
					aktivesKonto(adresse),
					isNotNull(konto.mailCodeHash),
					gt(konto.mailCodeAblauf, t),
					lt(konto.mailCodeFehlversuche, MAIL_CODE_MAX_FEHLVERSUCHE)
				)
			)
			.returning({ id: konto.id, hash: konto.mailCodeHash });
		if (!k?.hash) return falsch();
		const hash = hashMailCode(schluessel, k.id, code);
		if (!gleich(hash, k.hash)) return falsch();
		// Bedingtes UPDATE: der Code wird atomar nur einmal verbraucht.
		const [eingeloest] = await db
			.update(konto)
			.set({
				mailCodeHash: null,
				mailCodeAblauf: null,
				mailCodeFehlversuche: 0,
				briefCodeBenutztAm: sql`COALESCE(${konto.briefCodeBenutztAm}, ${t})`
			})
			.where(
				and(
					eq(konto.id, k.id),
					eq(konto.mailCodeHash, hash),
					gt(konto.mailCodeAblauf, t),
					lte(konto.mailCodeFehlversuche, MAIL_CODE_MAX_FEHLVERSUCHE)
				)
			)
			.returning({ id: konto.id });
		if (!eingeloest) return falsch();
		const kennung = await erstelleSitzung(db, eingeloest.id, t, alteKennung);
		return { ergebnis: 'ok', kennung };
	}

	return {
		stelleBriefCodeAus,
		loginMitBriefCode,
		fordereMailCodeAn,
		loginMitMailCode,
		beendeAlleSitzungen: (kontoId) => beendeAlleSitzungen(db, kontoId),
		pruefeSitzung: (kennung) => pruefeSitzung(db, kennung, jetzt()),
		beendeSitzung: (kennung) => beendeSitzung(db, kennung)
	};
}
