import { holeMitteilungDienste } from '../../../../../lib/server/dienste.ts';
import { postAboLoeschen } from '../../../../../lib/server/mitteilung/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAboLoeschen(holeMitteilungDienste(), e);
