import { holeMitteilungAdminDienste } from '../../../../../../lib/server/dienste.ts';
import {
	getAnmeldungen,
	postAnmeldungVonHand
} from '../../../../../../lib/server/cm/verwaltung-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getAnmeldungen(holeMitteilungAdminDienste(), e);
export const POST: RequestHandler = (e) => postAnmeldungVonHand(holeMitteilungAdminDienste(), e);
