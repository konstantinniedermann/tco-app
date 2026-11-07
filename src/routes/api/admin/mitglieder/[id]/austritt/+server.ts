import { holeAdminDienste } from '../../../../../../lib/server/admin/index.ts';
import { postAustritt } from '../../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAustritt(holeAdminDienste(), e);
