import { holeAdminDienste } from '../../../../lib/server/admin/index.ts';
import { getRollen } from '../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getRollen(holeAdminDienste(), e);
