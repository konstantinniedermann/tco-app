import { holeAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postSitzungen } from '../../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postSitzungen(holeAdminDienste(), e);
