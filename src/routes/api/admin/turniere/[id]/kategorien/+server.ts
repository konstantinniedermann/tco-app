import { holeAdminDienste } from '../../../../../../lib/server/admin/index.ts';
import { postKategorien } from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postKategorien(holeAdminDienste(), e);
