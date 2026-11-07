import { holeMitteilungAdminDienste } from '../../../../../../lib/server/mitteilung/index.ts';
import { postKlassierung } from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postKlassierung(holeMitteilungAdminDienste(), e);
