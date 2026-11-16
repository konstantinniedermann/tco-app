import { holeAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postAdminAnlassLoeschen } from '../../../../../../lib/server/anlass/verwaltung-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAdminAnlassLoeschen(holeAdminDienste(), e);
