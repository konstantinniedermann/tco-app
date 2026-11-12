import { holeMitteilungDienste } from '../../../../lib/server/dienste.ts';
import { postAbo } from '../../../../lib/server/mitteilung/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAbo(holeMitteilungDienste(), e);
