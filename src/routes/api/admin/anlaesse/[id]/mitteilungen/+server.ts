import { holeMitteilungAdminDienste } from '../../../../../../lib/server/mitteilung/index.ts';
import { getAnlassMitteilungen } from '../../../../../../lib/server/mitteilung/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getAnlassMitteilungen(holeMitteilungAdminDienste(), e);
