import { holeAdminDienste } from '../../../../lib/server/dienste.ts';
import { postEinlesen } from '../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postEinlesen(holeAdminDienste(), e);
