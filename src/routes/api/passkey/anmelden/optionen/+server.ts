import { holePasskeyDienst } from '../../../../../lib/server/login/index.ts';
import { postAnmeldenOptionen } from '../../../../../lib/server/login/passkey-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAnmeldenOptionen(holePasskeyDienst(), e);
