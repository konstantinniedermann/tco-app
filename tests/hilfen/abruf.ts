import type { FehlerStatus, Fehlerkoerper } from '../../src/lib/fehler.ts';

export type Aufruf = { pfad: string; init: RequestInit };

export function holer(antwort: Response | Error) {
	const aufrufe: Aufruf[] = [];
	const holen = async (pfad: string, init: RequestInit) => {
		aufrufe.push({ pfad, init });
		if (antwort instanceof Error) throw antwort;
		return antwort;
	};
	return { aufrufe, holen };
}

// Gestellte Antworten: Ein Fehler-Status nimmt nur einen Körper aus der gemeinsamen Liste an
// (src/lib/fehler.ts), damit ein Wort oder eine Form, die der Server nicht kennt, hier auffällt.
export type Koerper<S extends number> = S extends FehlerStatus ? Fehlerkoerper : unknown;
export const json = <S extends number>(status: S, inhalt: Koerper<S>) =>
	Response.json(inhalt, { status });

/** Absichtlich ausserhalb der Liste: Antworten, die der Server nie so sendet. */
export const ungeprueft = (status: number, inhalt: unknown) => Response.json(inhalt, { status });
