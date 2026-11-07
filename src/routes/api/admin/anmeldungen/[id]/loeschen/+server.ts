import { holeMitteilungAdminDienste } from '../../../../../../lib/server/mitteilung/index.ts';
import { postAnmeldungLoeschen } from '../../../../../../lib/server/turnier/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAnmeldungLoeschen(holeMitteilungAdminDienste(), e);
