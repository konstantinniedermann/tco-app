import { holeCmDienste } from '../../../../../../lib/server/dienste.ts';
import { postCmAnfrage } from '../../../../../../lib/server/cm/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postCmAnfrage(holeCmDienste(), e);
