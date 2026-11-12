import { holePasskeyDienst } from '../../../lib/server/dienste.ts';
import { getPasskeys } from '../../../lib/server/login/passkey-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (e) => getPasskeys(holePasskeyDienst(), e);
