import { holeMitteilungAdminDienste } from '../../../../lib/server/dienste.ts';
import { getVereinMitteilungen } from '../../../../lib/server/mitteilung/verwaltung-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getVereinMitteilungen(holeMitteilungAdminDienste(), e);
