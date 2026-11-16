import { holeAdminDienste } from '../../../../lib/server/dienste.ts';
import { getZugang, postZugang } from '../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getZugang(holeAdminDienste(), e);
export const POST: RequestHandler = (e) => postZugang(holeAdminDienste(), e);
