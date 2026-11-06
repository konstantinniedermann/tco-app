import { holeMitteilungAdminDienste } from '../../../../lib/server/mitteilung/index.ts';
import { getVereinMitteilungen } from '../../../../lib/server/mitteilung/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getVereinMitteilungen(holeMitteilungAdminDienste(), e);
