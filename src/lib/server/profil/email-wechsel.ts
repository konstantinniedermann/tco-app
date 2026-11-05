import { and, eq, ne, sql } from 'drizzle-orm';
import { emailFehler } from '../admin/angaben.ts';
import { schreibeVerlauf } from '../admin/verlauf.ts';
import type { Db } from '../db/index.ts';
import { mitglied } from '../db/schema.ts';
import type { Bremsen } from '../login/bremse.ts';
import {
	MAIL_CODE_GUELTIG_MS,
	MAIL_CODE_MAX_FEHLVERSUCHE,
	erzeugeMailCode,
	gleich,
	hashWechselCode,
	normalisiereMailCode
} from '../login/codes.ts';
import { istEindeutigkeitsfehler, type Mailer } from '../login/dienst.ts';
import { ipSchluessel } from '../login/ip-schluessel.ts';
import { baueAdresseVergebenMail, baueWechselCodeMail } from '../login/mail.ts';
import type { AngemeldetesKonto } from '../login/sitzung.ts';
import { FAIRGATE_FELDER } from './angaben.ts';

export const WECHSEL_MAX = 1000;
export const AUFRAEUMEN_MS = 10 * 60 * 1000;

export type EmailWechselDienst = {
	// `arbeit` läuft ohne Warten des Aufrufers und lehnt nie ab. `annahme` verrät nie, ob die
	// neue Adresse vergeben ist (SI-04).
	starte(
		k: AngemeldetesKonto,
		neueEmail: unknown,
		ip: string
	): Promise<{ annahme: 'ok' | 'zu-viele' | 'gleich' | 'ungueltig'; arbeit: Promise<void> }>;
	bestaetige(k: AngemeldetesKonto, codeAlt: unknown, codeNeu: unknown): Promise<'ok' | 'falsch'>;
};

export type EmailWechselAbh = {
	db: Db;
	schluessel: string;
	kontakt: string;
	mailer: Mailer;
	bremsen: Bremsen;
	jetzt?: () => Date;
};

export type Wechsel = {
	/** Adresse beim Start, getrimmt und klein; stimmt sie bei der Bestätigung nicht mehr, gilt nichts. */
	bisherige: string;
	/** Neue Adresse, wie `pruefeAngaben` sie speichern würde (getrimmt, klein). */
	neue: string;
	hashAlt: string;
	hashNeu: string;
	bis: number;
	fehlversuche: number;
	/** Neue Adresse gehört einem anderen Mitglied; bis die Prüfung gelaufen ist ebenfalls `true`. */
	vergeben: boolean;
};

/** Höchstens ein laufender Wechsel pro Konto; Einfügereihenfolge der Map = Alter. */
export class WechselSpeicher {
	readonly #eintraege = new Map<number, Wechsel>();
	readonly #jetzt: () => number;
	readonly #max: number;

	constructor(jetzt: () => number, max = WECHSEL_MAX) {
		this.#jetzt = jetzt;
		this.#max = max;
	}

	get groesse(): number {
		return this.#eintraege.size;
	}

	lege(kontoId: number, wechsel: Wechsel): void {
		this.#eintraege.delete(kontoId);
		this.#eintraege.set(kontoId, wechsel);
		while (this.#eintraege.size > this.#max) {
			const aeltester = this.#eintraege.keys().next();
			if (aeltester.done) break;
			this.#eintraege.delete(aeltester.value);
		}
	}

	/** Liefert den laufenden Wechsel; ein abgelaufener wird dabei verworfen. */
	hole(kontoId: number): Wechsel | null {
		const wechsel = this.#eintraege.get(kontoId);
		if (!wechsel) return null;
		if (this.#jetzt() > wechsel.bis) {
			this.#eintraege.delete(kontoId);
			return null;
		}
		return wechsel;
	}

	/** Löscht nur, wenn der Eintrag noch derselbe ist (nicht inzwischen durch einen neuen ersetzt). */
	loesche(kontoId: number, wechsel: Wechsel): void {
		if (this.#eintraege.get(kontoId) === wechsel) this.#eintraege.delete(kontoId);
	}

	raeumeAuf(): void {
		const t = this.#jetzt();
		for (const [kontoId, wechsel] of [...this.#eintraege]) {
			if (t > wechsel.bis) this.#eintraege.delete(kontoId);
		}
	}
}

// Annahme K-19.1: Das Mitglied ändert seine E-Mail-Adresse (das Login) selbst, bestätigt mit je
// einem Code an die bisherige und an die neue Adresse (SI-09).
export function erstelleEmailWechselDienst(abh: EmailWechselAbh): EmailWechselDienst {
	const { db, schluessel, kontakt, bremsen } = abh;
	const jetzt = abh.jetzt ?? (() => new Date());
	const speicher = new WechselSpeicher(() => jetzt().getTime());
	// Abgelaufene Wechsel (mit der neuen Adresse) bleiben nicht liegen, auch ohne weiteren Zugriff.
	setInterval(() => speicher.raeumeAuf(), AUFRAEUMEN_MS).unref();

	async function sende(n: Parameters<Mailer>[0]): Promise<void> {
		try {
			await abh.mailer(n);
		} catch {
			// SI-05: feste Zeile, keine Fehlerdetails (können Adresse oder Zugangsdaten enthalten).
			console.error('Wechsel-Mail nicht versandt');
		}
	}

	async function versende(
		k: AngemeldetesKonto,
		wechsel: Wechsel,
		an: { alt: string; neu: boolean },
		codes: { alt: string; neu: string }
	): Promise<void> {
		try {
			const [belegt] = await db
				.select({ id: mitglied.id })
				.from(mitglied)
				.where(and(sql`lower(${mitglied.email}) = ${wechsel.neue}`, ne(mitglied.id, k.mitgliedId)));
			wechsel.vergeben = belegt !== undefined;
		} catch {
			console.error('Wechsel-Prüfung nicht möglich');
			return;
		}
		const mails = [sende({ an: an.alt, ...baueWechselCodeMail(codes.alt, 'alt', kontakt) })];
		if (an.neu) {
			mails.push(
				sende(
					wechsel.vergeben
						? { an: wechsel.neue, ...baueAdresseVergebenMail(kontakt) }
						: { an: wechsel.neue, ...baueWechselCodeMail(codes.neu, 'neu', kontakt) }
				)
			);
		}
		await Promise.all(mails);
	}

	async function starte(
		k: AngemeldetesKonto,
		neueEmail: unknown,
		ip: string
	): Promise<{ annahme: 'ok' | 'zu-viele' | 'gleich' | 'ungueltig'; arbeit: Promise<void> }> {
		const ohneArbeit = Promise.resolve();
		const neue = typeof neueEmail === 'string' ? neueEmail.trim().toLowerCase() : null;
		if (neue === null || emailFehler(neue) !== null) {
			return { annahme: 'ungueltig', arbeit: ohneArbeit };
		}
		const [m] = await db
			.select({ email: mitglied.email })
			.from(mitglied)
			.where(eq(mitglied.id, k.mitgliedId));
		if (!m) return { annahme: 'ungueltig', arbeit: ohneArbeit };
		const bisherige = m.email.trim().toLowerCase();
		if (neue === bisherige) return { annahme: 'gleich', arbeit: ohneArbeit };

		// Ab hier ohne await: Prüfen und Zählen sind atomar, parallele Anfragen umgehen keine Grenze.
		const ipKey = ipSchluessel(ip);
		const kontoKey = String(k.kontoId);
		if (
			!bremsen.anfragenProIp.erlaubt(ipKey) ||
			!bremsen.wechselProKontoStunde.erlaubt(kontoKey) ||
			!bremsen.wechselProKontoTag.erlaubt(kontoKey) ||
			!bremsen.mailsProAdresseStunde.erlaubt(bisherige) ||
			!bremsen.mailsProAdresseTag.erlaubt(bisherige)
		) {
			return { annahme: 'zu-viele', arbeit: ohneArbeit };
		}
		bremsen.anfragenProIp.zaehle(ipKey);
		bremsen.wechselProKontoStunde.zaehle(kontoKey);
		bremsen.wechselProKontoTag.zaehle(kontoKey);
		bremsen.mailsProAdresseStunde.zaehle(bisherige);
		bremsen.mailsProAdresseTag.zaehle(bisherige);
		// SI-04: Ist die Grenze der neuen (fremden) Adresse erreicht, geht still keine Mail an sie.
		const anNeu =
			bremsen.mailsProAdresseStunde.erlaubt(neue) && bremsen.mailsProAdresseTag.erlaubt(neue);
		if (anNeu) {
			bremsen.mailsProAdresseStunde.zaehle(neue);
			bremsen.mailsProAdresseTag.zaehle(neue);
		}

		const codes = { alt: erzeugeMailCode(), neu: erzeugeMailCode() };
		const wechsel: Wechsel = {
			bisherige,
			neue,
			hashAlt: hashWechselCode(schluessel, k.kontoId, 'alt', codes.alt),
			hashNeu: hashWechselCode(schluessel, k.kontoId, 'neu', codes.neu),
			bis: jetzt().getTime() + MAIL_CODE_GUELTIG_MS,
			fehlversuche: 0,
			vergeben: true
		};
		speicher.lege(k.kontoId, wechsel);
		return {
			annahme: 'ok',
			arbeit: versende(k, wechsel, { alt: m.email, neu: anNeu }, codes)
		};
	}

	async function bestaetige(
		k: AngemeldetesKonto,
		codeAlt: unknown,
		codeNeu: unknown
	): Promise<'ok' | 'falsch'> {
		const wechsel = speicher.hole(k.kontoId);
		if (!wechsel) return 'falsch';
		// Der Versuch zählt vor dem Vergleich und ohne await dazwischen: auch parallel nie mehr als 5.
		wechsel.fehlversuche += 1;
		if (wechsel.fehlversuche > MAIL_CODE_MAX_FEHLVERSUCHE) {
			speicher.loesche(k.kontoId, wechsel);
			return 'falsch';
		}
		const alt = typeof codeAlt === 'string' ? normalisiereMailCode(codeAlt) : null;
		const neu = typeof codeNeu === 'string' ? normalisiereMailCode(codeNeu) : null;
		// Beide Vergleiche laufen immer, damit die Zeit nicht verrät, welcher Code falsch war.
		const altPasst =
			alt !== null && gleich(hashWechselCode(schluessel, k.kontoId, 'alt', alt), wechsel.hashAlt);
		const neuPasst =
			neu !== null && gleich(hashWechselCode(schluessel, k.kontoId, 'neu', neu), wechsel.hashNeu);
		if (!altPasst || !neuPasst || wechsel.vergeben) {
			if (wechsel.fehlversuche >= MAIL_CODE_MAX_FEHLVERSUCHE) speicher.loesche(k.kontoId, wechsel);
			return 'falsch';
		}
		// Eingelöst wird nur einmal: der Eintrag verschwindet vor dem ersten await.
		speicher.loesche(k.kontoId, wechsel);

		const t = jetzt();
		try {
			return await db.transaction(async (tx) => {
				const [m] = await tx
					.select({ email: mitglied.email })
					.from(mitglied)
					.where(eq(mitglied.id, k.mitgliedId))
					.for('update');
				// Hat der Admin die Adresse inzwischen geändert, gilt seine Änderung.
				if (!m || m.email.trim().toLowerCase() !== wechsel.bisherige) return 'falsch' as const;
				await tx
					.update(mitglied)
					.set(
						FAIRGATE_FELDER.includes('email')
							? { email: wechsel.neue, fairgateOffenSeit: t }
							: { email: wechsel.neue }
					)
					.where(eq(mitglied.id, k.mitgliedId));
				await schreibeVerlauf(
					tx,
					k.mitgliedId,
					{ art: 'mitglied', mitgliedId: k.mitgliedId },
					[{ aktion: 'feld-geaendert', detail: 'email' }],
					t
				);
				return 'ok' as const;
			});
		} catch (fehler) {
			// Die neue Adresse wurde inzwischen einem anderen Mitglied gegeben (Wettlauf).
			if (istEindeutigkeitsfehler(fehler)) return 'falsch';
			throw fehler;
		}
	}

	return { starte, bestaetige };
}
