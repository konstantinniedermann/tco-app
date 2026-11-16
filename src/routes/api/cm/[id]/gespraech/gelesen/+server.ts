import { holeCmDienste } from '../../../../../../lib/server/dienste.ts';
import { postGelesen } from '../../../../../../lib/server/gespraech/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postGelesen(holeCmDienste(), e);
