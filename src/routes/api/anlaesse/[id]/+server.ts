import { holeAnlassDienste } from '../../../../lib/server/dienste.ts';
import { getAnlass } from '../../../../lib/server/anlass/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getAnlass(holeAnlassDienste(), e);
