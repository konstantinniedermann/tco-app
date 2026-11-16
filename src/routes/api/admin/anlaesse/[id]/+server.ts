import { holeAdminDienste } from '../../../../../lib/server/dienste.ts';
import {
	getAdminAnlass,
	postAdminAnlass
} from '../../../../../lib/server/anlass/verwaltung-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getAdminAnlass(holeAdminDienste(), e);
export const POST: RequestHandler = (e) => postAdminAnlass(holeAdminDienste(), e);
