import { holeAnlassDienste } from '../../../../../lib/server/dienste.ts';
import { postAnmeldung } from '../../../../../lib/server/anlass/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAnmeldung(holeAnlassDienste(), e);
