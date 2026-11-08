import { holeMitteilungAdminDienste } from '../../../../../../lib/server/mitteilung/index.ts';
import {
	getDoppel,
	postDoppelVonHand
} from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getDoppel(holeMitteilungAdminDienste(), e);
export const POST: RequestHandler = (e) => postDoppelVonHand(holeMitteilungAdminDienste(), e);
