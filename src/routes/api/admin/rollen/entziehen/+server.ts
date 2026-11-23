import { holeAdminDienste } from '../../../../../lib/server/dienste.ts';
import { postRolleEntziehen } from '../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postRolleEntziehen(holeAdminDienste(), e);
