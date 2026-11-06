import { holeAdminDienste } from '../../../../../lib/server/admin/index.ts';
import { getTurnier, postTurnier } from '../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getTurnier(holeAdminDienste(), e);
export const POST: RequestHandler = (e) => postTurnier(holeAdminDienste(), e);
