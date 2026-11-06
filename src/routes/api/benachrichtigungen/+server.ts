import { holeMitteilungDienste } from '../../../lib/server/mitteilung/index.ts';
import {
	getBenachrichtigungen,
	postThemen
} from '../../../lib/server/mitteilung/schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getBenachrichtigungen(holeMitteilungDienste(), e);
export const POST: RequestHandler = (e) => postThemen(holeMitteilungDienste(), e);
