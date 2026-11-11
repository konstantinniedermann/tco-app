import { holeMitteilungAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postAnfrageLoeschen } from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAnfrageLoeschen(holeMitteilungAdminDienste(), e);
