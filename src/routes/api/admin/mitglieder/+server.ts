import { holeAdminDienste } from '../../../../lib/server/dienste.ts';
import { getMitglieder, postMitglieder } from '../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getMitglieder(holeAdminDienste(), e);
export const POST: RequestHandler = (e) => postMitglieder(holeAdminDienste(), e);
