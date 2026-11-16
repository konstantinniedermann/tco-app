import { holeAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postKategorien } from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postKategorien(holeAdminDienste(), e);
