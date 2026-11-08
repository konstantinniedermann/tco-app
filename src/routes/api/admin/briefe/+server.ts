import { holeAdminDienste } from '../../../../lib/server/admin/index.ts';
import { getBriefe, postBriefe } from '../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getBriefe(holeAdminDienste(), e);
export const POST: RequestHandler = (e) => postBriefe(holeAdminDienste(), e);
