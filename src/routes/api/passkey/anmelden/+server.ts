import { holePasskeyDienst } from '../../../../lib/server/dienste.ts';
import { postAnmelden } from '../../../../lib/server/login/passkey-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postAnmelden(holePasskeyDienst(), e);
