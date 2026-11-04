const MINUTE_MS = 60_000;
const STUNDE_MS = 60 * MINUTE_MS;
const TAG_MS = 24 * STUNDE_MS;

type Optionen = {
	grenze: number;
	fensterMs: number;
	/** Aktuelle Zeit in Millisekunden; für Tests einstellbar. */
	jetzt?: () => number;
};

/**
 * Gleitendes Fenster im Arbeitsspeicher: pro Schlüssel die Zeitstempel der
 * gezählten Ereignisse. Ein Ereignis zählt, bis `fensterMs` sicher vorbei sind.
 * Der Schlüssel (IP, Adresse) wird nie ausgegeben und nie protokolliert.
 */
export class Bremse {
	readonly #grenze: number;
	readonly #fensterMs: number;
	readonly #jetzt: () => number;
	readonly #eintraege = new Map<string, number[]>();

	constructor({ grenze, fensterMs, jetzt = Date.now }: Optionen) {
		this.#grenze = grenze;
		this.#fensterMs = fensterMs;
		this.#jetzt = jetzt;
	}

	/** Prüft nur, zählt nicht. */
	erlaubt(schluessel: string): boolean {
		return this.#aktuelle(schluessel).length < this.#grenze;
	}

	zaehle(schluessel: string): void {
		const stempel = this.#aktuelle(schluessel);
		stempel.push(this.#jetzt());
		this.#eintraege.set(schluessel, stempel);
	}

	/** Entfernt Zeitstempel ausserhalb des Fensters und leere Schlüssel. */
	raeumeAuf(): void {
		for (const schluessel of [...this.#eintraege.keys()]) this.#aktuelle(schluessel);
	}

	/** Zahl der Schlüssel; nur für Tests. */
	get groesse(): number {
		return this.#eintraege.size;
	}

	/** Verwirft veraltete Stempel; löscht den Schlüssel, wenn nichts bleibt. */
	#aktuelle(schluessel: string): number[] {
		const grenzzeit = this.#jetzt() - this.#fensterMs;
		const alle = this.#eintraege.get(schluessel) ?? [];
		const aktuelle = alle.filter((t) => t >= grenzzeit);
		if (aktuelle.length === 0) this.#eintraege.delete(schluessel);
		else this.#eintraege.set(schluessel, aktuelle);
		return aktuelle;
	}
}

export type Bremsen = {
	briefFehlerProIp: Bremse;
	mailFehlerProIp: Bremse;
	anfragenProIp: Bremse;
	mailsProAdresseStunde: Bremse;
	mailsProAdresseTag: Bremse;
	passkeyFehlerProIp: Bremse;
};

/** Alle Fenster sind höchstens 24 h lang; nach spätestens 24 h ist jeder Eintrag vergessen. */
export function erstelleBremsen(jetzt?: () => number): Bremsen {
	const bremsen: Bremsen = {
		briefFehlerProIp: new Bremse({ grenze: 10, fensterMs: STUNDE_MS, jetzt }),
		mailFehlerProIp: new Bremse({ grenze: 10, fensterMs: STUNDE_MS, jetzt }),
		anfragenProIp: new Bremse({ grenze: 10, fensterMs: STUNDE_MS, jetzt }),
		mailsProAdresseStunde: new Bremse({ grenze: 3, fensterMs: STUNDE_MS, jetzt }),
		mailsProAdresseTag: new Bremse({ grenze: 10, fensterMs: TAG_MS, jetzt }),
		passkeyFehlerProIp: new Bremse({ grenze: 10, fensterMs: STUNDE_MS, jetzt })
	};
	setInterval(() => {
		for (const bremse of Object.values(bremsen)) bremse.raeumeAuf();
	}, 10 * MINUTE_MS).unref();
	return bremsen;
}
