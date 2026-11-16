import { holeAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postBrief } from '../../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postBrief(holeAdminDienste(), e);
