import { holeMitteilungAdminDienste } from '../../../../../lib/server/mitteilung/index.ts';
import {
	getAdminGespraech,
	postAntwort
} from '../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getAdminGespraech(holeMitteilungAdminDienste(), e);
export const POST: RequestHandler = (e) => postAntwort(holeMitteilungAdminDienste(), e);
