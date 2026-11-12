import { holeAdminDienste } from '../../../../lib/server/dienste.ts';
import { getRollen } from '../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getRollen(holeAdminDienste(), e);
