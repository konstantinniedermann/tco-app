import { holeMitteilungAdminDienste } from '../../../../../../lib/server/mitteilung/index.ts';
import { getGespraeche } from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getGespraeche(holeMitteilungAdminDienste(), e);
