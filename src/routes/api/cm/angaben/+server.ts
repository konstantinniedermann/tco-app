import { holeCmDienste } from '../../../../lib/server/dienste.ts';
import { postCmAngaben } from '../../../../lib/server/cm/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postCmAngaben(holeCmDienste(), e);
