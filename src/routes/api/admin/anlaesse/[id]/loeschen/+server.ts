import { holeAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postAdminAnlassLoeschen } from '../../../../../../lib/server/admin/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAdminAnlassLoeschen(holeAdminDienste(), e);
