import { holeAnlassDienste } from '../../../../../lib/server/anlass/index.ts';
import { postAnmeldung } from '../../../../../lib/server/anlass/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAnmeldung(holeAnlassDienste(), e);
