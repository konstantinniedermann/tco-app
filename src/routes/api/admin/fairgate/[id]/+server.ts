import { holeAdminDienste } from '../../../../../lib/server/admin/index.ts';
import { postFairgate } from '../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postFairgate(holeAdminDienste(), e);
