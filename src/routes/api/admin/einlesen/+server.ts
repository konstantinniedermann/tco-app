import { holeAdminDienste } from '../../../../lib/server/admin/index.ts';
import { postEinlesen } from '../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postEinlesen(holeAdminDienste(), e);
