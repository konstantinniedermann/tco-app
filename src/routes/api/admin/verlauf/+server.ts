import { holeAdminDienste } from '../../../../lib/server/dienste.ts';
import { getVerlauf } from '../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getVerlauf(holeAdminDienste(), e);
