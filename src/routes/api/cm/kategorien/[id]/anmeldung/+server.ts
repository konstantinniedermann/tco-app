import { holeCmDienste } from '../../../../../../lib/server/dienste.ts';
import { postCmAnmeldung } from '../../../../../../lib/server/cm/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postCmAnmeldung(holeCmDienste(), e);
