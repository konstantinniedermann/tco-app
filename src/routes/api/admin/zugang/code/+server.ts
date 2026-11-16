import { holeAdminDienste } from '../../../../../lib/server/dienste.ts';
import { postZugangCode } from '../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postZugangCode(holeAdminDienste(), e);
