import { holeMitteilungAdminDienste } from '../../../../../../lib/server/dienste.ts';
import { postAnmeldungLoeschen } from '../../../../../../lib/server/cm/verwaltung-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAnmeldungLoeschen(holeMitteilungAdminDienste(), e);
