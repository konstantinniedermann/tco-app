import { holeMitteilungAdminDienste } from '../../../../lib/server/mitteilung/index.ts';
import { getSpieler } from '../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getSpieler(holeMitteilungAdminDienste(), e);
