import { holeCmDienste } from '../../../../../lib/server/dienste.ts';
import { getGespraech, postGespraech } from '../../../../../lib/server/gespraech/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getGespraech(holeCmDienste(), e);
export const POST: RequestHandler = (e) => postGespraech(holeCmDienste(), e);
