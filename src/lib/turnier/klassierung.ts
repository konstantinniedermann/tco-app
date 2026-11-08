// Klassierungen im Tennis (Swiss Tennis), stark → schwach. Läuft im Browser und auf dem Server.
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

/** FR-07: Punkte für die Mindestsumme im Doppel: N1–N4 → 0, R*n* → *n*, `keine` → 10. */
export const punkte = (k: Klassierung): number =>
	k === 'keine' ? 10 : k.startsWith('R') ? Number(k.slice(1)) : 0;
