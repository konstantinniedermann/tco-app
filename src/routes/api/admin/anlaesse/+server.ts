import { holeAdminDienste } from '../../../../lib/server/dienste.ts';
import {
	getAdminAnlaesse,
	postAdminAnlaesse
} from '../../../../lib/server/anlass/verwaltung-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getAdminAnlaesse(holeAdminDienste(), e);
export const POST: RequestHandler = (e) => postAdminAnlaesse(holeAdminDienste(), e);
