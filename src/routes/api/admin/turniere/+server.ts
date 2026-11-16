import { holeAdminDienste } from '../../../../lib/server/dienste.ts';
import { getTurniere, postTurniere } from '../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getTurniere(holeAdminDienste(), e);
export const POST: RequestHandler = (e) => postTurniere(holeAdminDienste(), e);
