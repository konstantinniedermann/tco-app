import { holeMitteilungDienste } from '../../../../lib/server/mitteilung/index.ts';
import { postAbo } from '../../../../lib/server/mitteilung/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAbo(holeMitteilungDienste(), e);
