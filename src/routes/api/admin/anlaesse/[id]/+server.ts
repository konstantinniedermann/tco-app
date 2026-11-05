import { holeAdminDienste } from '../../../../../lib/server/admin/index.ts';
import { getAdminAnlass, postAdminAnlass } from '../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getAdminAnlass(holeAdminDienste(), e);
export const POST: RequestHandler = (e) => postAdminAnlass(holeAdminDienste(), e);
