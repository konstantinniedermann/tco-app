import { holeCmDienste } from '../../../../../../lib/server/cm/index.ts';
import { postGelesen } from '../../../../../../lib/server/gespraech/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postGelesen(holeCmDienste(), e);
