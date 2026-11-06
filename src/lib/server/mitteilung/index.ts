import { holeDb } from '../db/index.ts';
import { leseEinstellungen } from '../einstellungen.ts';
import type { MitteilungDienste } from './schnittstellen.ts';

let dienste: MitteilungDienste | undefined;

export function holeMitteilungDienste(): MitteilungDienste {
	dienste ??= {
		db: holeDb(),
		vapidOeffentlich: leseEinstellungen().vapid?.oeffentlich ?? null
	};
	return dienste;
}
