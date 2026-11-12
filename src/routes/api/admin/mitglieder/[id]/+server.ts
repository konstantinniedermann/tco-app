import { holeAdminDienste } from '../../../../../lib/server/dienste.ts';
import { getMitglied, postMitglied } from '../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getMitglied(holeAdminDienste(), e);
export const POST: RequestHandler = (e) => postMitglied(holeAdminDienste(), e);
