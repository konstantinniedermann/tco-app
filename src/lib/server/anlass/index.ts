import { holeDb } from '../db/index.ts';
import type { AnlassDienste } from './typen.ts';

let dienste: AnlassDienste | undefined;

export function holeAnlassDienste(): AnlassDienste {
	dienste ??= { db: holeDb() };
	return dienste;
}
