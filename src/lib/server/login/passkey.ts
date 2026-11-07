import { randomBytes } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { konto, mitglied, passkey } from '../db/schema.ts';
import type { Bremsen } from './bremse.ts';
import type { ChallengeSpeicher } from './challenge.ts';
import { istEindeutigkeitsfehler, type LoginErgebnis } from './dienst.ts';
import { ipSchluessel } from './ip-schluessel.ts';
import { kennungAusAntwort, type Ort, type PasskeyPruefer } from './passkey-pruefer.ts';
import { beendePasskeyHinweis, erstelleSitzung } from './sitzung.ts';

export type PasskeyEintrag = {
	kennung: string;
	geraet: string;
	eingerichtetAm: Date;
	zuletztBenutzt: Date | null;
};

export type PasskeyAbh = {
	db: Db;
	pruefer: PasskeyPruefer;
	bremsen: Bremsen;
	challenges: ChallengeSpeicher;
	jetzt?: () => Date;
};

export type PasskeyDienst = {
	optionenEinrichten(kontoId: number, ort: Ort): Promise<object>;
	einrichten(
		kontoId: number,
		antwort: unknown,
		ort: Ort,
		geraet: string,
		sitzungKennung: string
	): Promise<'ok' | 'falsch'>;
	optionenAnmelden(
		ort: Ort,
		ip: string
	): Promise<{ optionen: object; vorgang: string } | 'zu-viele'>;
	// Liefert nie 'benutzt'.
	anmelden(
		vorgang: unknown,
		antwort: unknown,
		ort: Ort,
		ip: string,
		alteKennung?: string
	): Promise<LoginErgebnis>;
	// Neueste zuerst.
	liste(kontoId: number, ort: Ort): Promise<PasskeyEintrag[]>;
	entferne(kontoId: number, kennung: unknown): Promise<'ok' | 'nicht-gefunden'>;
	hinweisErledigt(sitzungKennung: string): Promise<void>;
};

const zufall = () => randomBytes(32).toString('base64url');

export function erstellePasskeyDienst(abh: PasskeyAbh): PasskeyDienst {
	const { db, pruefer, bremsen, challenges } = abh;
	const jetzt = abh.jetzt ?? (() => new Date());

	const gespeichert = {
		kennung: passkey.kennung,
		oeffentlicherSchluessel: passkey.oeffentlicherSchluessel,
		zaehler: passkey.zaehler,
		transporte: passkey.transporte
	};

	async function optionenEinrichten(kontoId: number, ort: Ort): Promise<object> {
		const [k] = await db
			.select({
				passkeyKennung: konto.passkeyKennung,
				email: mitglied.email,
				vorname: mitglied.vorname,
				nachname: mitglied.nachname
			})
			.from(konto)
			.innerJoin(mitglied, eq(mitglied.id, konto.mitgliedId))
			.where(eq(konto.id, kontoId));
		if (!k) throw new Error('Konto nicht gefunden');
		let kontoKennung = k.passkeyKennung;
		if (kontoKennung === null) {
			// COALESCE: Zwei gleichzeitige Aufrufe ergeben dieselbe Kennung.
			const [gesetzt] = await db
				.update(konto)
				.set({ passkeyKennung: sql`COALESCE(${konto.passkeyKennung}, ${zufall()})` })
				.where(eq(konto.id, kontoId))
				.returning({ passkeyKennung: konto.passkeyKennung });
			if (!gesetzt?.passkeyKennung) throw new Error('Konto nicht gefunden');
			kontoKennung = gesetzt.passkeyKennung;
		}
		const vorhandene = await db
			.select(gespeichert)
			.from(passkey)
			.where(and(eq(passkey.kontoId, kontoId), eq(passkey.rpId, ort.rpId)));
		const { optionen, challenge } = await pruefer.optionenEinrichten({
			ort,
			kontoKennung,
			name: k.email ?? '',
			anzeigename: `${k.vorname} ${k.nachname}`,
			vorhandene
		});
		challenges.lege(`einrichten:${kontoId}`, challenge);
		return optionen;
	}

	async function einrichten(
		kontoId: number,
		antwort: unknown,
		ort: Ort,
		geraet: string,
		sitzungKennung: string
	): Promise<'ok' | 'falsch'> {
		// Die Challenge ist mit jedem Versuch verbraucht, auch mit einem kaputten.
		const challenge = challenges.nimm(`einrichten:${kontoId}`);
		const kennung = kennungAusAntwort(antwort);
		if (challenge === null || kennung === null) return 'falsch';
		const neu = await pruefer.pruefeEinrichten({ ort, challenge, antwort });
		// Die gespeicherte Kennung muss die geprüfte und begrenzte aus der Antwort sein.
		if (neu === null || neu.kennung !== kennung) return 'falsch';
		try {
			await db.insert(passkey).values({
				kennung,
				kontoId,
				oeffentlicherSchluessel: neu.oeffentlicherSchluessel,
				zaehler: neu.zaehler,
				transporte: neu.transporte,
				rpId: ort.rpId,
				geraet,
				eingerichtetAm: jetzt()
			});
		} catch (fehler) {
			// Dieselbe Kennung gibt es schon: der bestehende Eintrag bleibt unverändert.
			if (istEindeutigkeitsfehler(fehler)) return 'falsch';
			throw fehler;
		}
		await beendePasskeyHinweis(db, sitzungKennung);
		return 'ok';
	}

	async function optionenAnmelden(ort: Ort, ip: string) {
		if (!bremsen.passkeyFehlerProIp.erlaubt(ipSchluessel(ip))) return 'zu-viele' as const;
		const vorgang = zufall();
		const { optionen, challenge } = await pruefer.optionenAnmelden({ ort });
		challenges.lege(`anmelden:${vorgang}`, challenge);
		return { optionen, vorgang };
	}

	async function anmelden(
		vorgang: unknown,
		antwort: unknown,
		ort: Ort,
		ip: string,
		alteKennung?: string
	): Promise<LoginErgebnis> {
		const ipKey = ipSchluessel(ip);
		if (!bremsen.passkeyFehlerProIp.erlaubt(ipKey)) return { ergebnis: 'zu-viele' };
		// Jeder Versuch zählt sofort, vor dem ersten await: parallele Anfragen umgehen die Grenze nicht.
		bremsen.passkeyFehlerProIp.zaehle(ipKey);
		const falsch = (): LoginErgebnis => ({ ergebnis: 'falsch' });
		if (typeof vorgang !== 'string' || vorgang === '') return falsch();
		// Einmal gültig: nimm() entfernt die Challenge, bevor irgendetwas wartet.
		const challenge = challenges.nimm(`anmelden:${vorgang}`);
		const kennung = kennungAusAntwort(antwort);
		if (challenge === null || kennung === null) return falsch();
		const [p] = await db
			.select({ ...gespeichert, kontoId: konto.id })
			.from(passkey)
			.innerJoin(konto, eq(konto.id, passkey.kontoId))
			.innerJoin(mitglied, eq(mitglied.id, konto.mitgliedId))
			.where(
				and(
					eq(passkey.kennung, kennung),
					eq(passkey.rpId, ort.rpId),
					eq(konto.gesperrt, false),
					eq(mitglied.status, 'aktiv')
				)
			);
		if (!p) return falsch();
		const geprueft = await pruefer.pruefeAnmelden({ ort, challenge, antwort, passkey: p });
		if (geprueft === null) return falsch();
		const t = jetzt();
		// Wurde der Passkey inzwischen entfernt, entsteht keine Sitzung. GREATEST: Eine parallele
		// Anmeldung mit demselben Passkey kann den Zähler nicht senken.
		const [benutzt] = await db
			.update(passkey)
			.set({ zaehler: sql`GREATEST(${passkey.zaehler}, ${geprueft.zaehler})`, zuletztBenutzt: t })
			.where(eq(passkey.kennung, kennung))
			.returning({ kennung: passkey.kennung });
		if (!benutzt) return falsch();
		const sitzungKennung = await erstelleSitzung(db, p.kontoId, t, alteKennung);
		return { ergebnis: 'ok', kennung: sitzungKennung };
	}

	// Nur Passkeys der aktuellen rpId: nach einem Adresswechsel gelten die alten nicht mehr.
	async function liste(kontoId: number, ort: Ort): Promise<PasskeyEintrag[]> {
		return db
			.select({
				kennung: passkey.kennung,
				geraet: passkey.geraet,
				eingerichtetAm: passkey.eingerichtetAm,
				zuletztBenutzt: passkey.zuletztBenutzt
			})
			.from(passkey)
			.where(and(eq(passkey.kontoId, kontoId), eq(passkey.rpId, ort.rpId)))
			.orderBy(desc(passkey.eingerichtetAm), passkey.kennung);
	}

	async function entferne(kontoId: number, kennung: unknown): Promise<'ok' | 'nicht-gefunden'> {
		if (typeof kennung !== 'string') return 'nicht-gefunden';
		// Nur ein Passkey des eigenen Kontos: ein fremder bleibt, Antwort wie unbekannt.
		const geloescht = await db
			.delete(passkey)
			.where(and(eq(passkey.kennung, kennung), eq(passkey.kontoId, kontoId)))
			.returning({ kennung: passkey.kennung });
		return geloescht.length === 0 ? 'nicht-gefunden' : 'ok';
	}

	return {
		optionenEinrichten,
		einrichten,
		optionenAnmelden,
		anmelden,
		liste,
		entferne,
		hinweisErledigt: (sitzungKennung) => beendePasskeyHinweis(db, sitzungKennung)
	};
}
