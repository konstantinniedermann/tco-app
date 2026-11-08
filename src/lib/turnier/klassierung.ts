// Klassierungen im Tennis (Swiss Tennis), stark → schwach. Läuft im Browser und auf dem Server.
// Skala N1–N4, R1–R9: Annahme K-25.1.
export const BEREICH = [
	'N1',
	'N2',
	'N3',
	'N4',
	'R1',
	'R2',
	'R3',
	'R4',
	'R5',
	'R6',
	'R7',
	'R8',
	'R9'
] as const;

export type Stufe = (typeof BEREICH)[number];

export const istStufe = (v: unknown): v is Stufe =>
	typeof v === 'string' && (BEREICH as readonly string[]).includes(v);

/** `a` ist strikt stärker als `b`. */
export const staerker = (a: Stufe, b: Stufe): boolean => BEREICH.indexOf(a) < BEREICH.indexOf(b);

/** Klassierung eines Spielers: eine Stufe oder `keine` (ohne Lizenz). */
export const KLASSIERUNGEN = [...BEREICH, 'keine'] as const;

export type Klassierung = (typeof KLASSIERUNGEN)[number];

export const istKlassierung = (v: unknown): v is Klassierung =>
	typeof v === 'string' && (KLASSIERUNGEN as readonly string[]).includes(v);

export const klassierungName = (k: Klassierung): string => (k === 'keine' ? 'keine Lizenz' : k);
