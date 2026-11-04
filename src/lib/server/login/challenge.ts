export const CHALLENGE_GUELTIG_MS = 5 * 60 * 1000;
export const CHALLENGE_MAX = 1000;

type Eintrag = { challenge: string; bis: number };

/** Einmal gültige Challenges im Arbeitsspeicher; Einfügereihenfolge der Map = Alter. */
export class ChallengeSpeicher {
	private readonly eintraege = new Map<string, Eintrag>();
	private readonly jetzt: () => number;

	constructor(opt: { jetzt?: () => number } = {}) {
		this.jetzt = opt.jetzt ?? Date.now;
	}

	lege(schluessel: string, challenge: string): void {
		this.eintraege.delete(schluessel);
		this.eintraege.set(schluessel, { challenge, bis: this.jetzt() + CHALLENGE_GUELTIG_MS });
		while (this.eintraege.size > CHALLENGE_MAX) {
			const aeltester = this.eintraege.keys().next();
			if (aeltester.done) break;
			this.eintraege.delete(aeltester.value);
		}
	}

	nimm(schluessel: unknown): string | null {
		if (typeof schluessel !== 'string' || schluessel === '') return null;
		const eintrag = this.eintraege.get(schluessel);
		if (!eintrag) return null;
		this.eintraege.delete(schluessel);
		return this.jetzt() <= eintrag.bis ? eintrag.challenge : null;
	}
}
