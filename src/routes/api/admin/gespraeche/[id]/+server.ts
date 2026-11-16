import { holeMitteilungAdminDienste } from '../../../../../lib/server/dienste.ts';
import {
	getAdminGespraech,
	postAntwort
} from '../../../../../lib/server/gespraech/verwaltung-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getAdminGespraech(holeMitteilungAdminDienste(), e);
export const POST: RequestHandler = (e) => postAntwort(holeMitteilungAdminDienste(), e);
