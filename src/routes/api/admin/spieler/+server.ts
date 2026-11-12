import { holeMitteilungAdminDienste } from '../../../../lib/server/dienste.ts';
import { getSpieler } from '../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getSpieler(holeMitteilungAdminDienste(), e);
