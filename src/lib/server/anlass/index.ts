import { holeDb } from '../db/index.ts';
import type { AnlassDienste } from './schnittstellen.ts';

let dienste: AnlassDienste | undefined;

export function holeAnlassDienste(): AnlassDienste {
	dienste ??= { db: holeDb() };
	return dienste;
}
