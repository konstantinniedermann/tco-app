import { holeCmDienste } from '../../../../../../lib/server/dienste.ts';
import { postCmAnfrageAnnehmen } from '../../../../../../lib/server/cm/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postCmAnfrageAnnehmen(holeCmDienste(), e);
