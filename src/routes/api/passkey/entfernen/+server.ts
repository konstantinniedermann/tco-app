import { holePasskeyDienst } from '../../../../lib/server/dienste.ts';
import { postEntfernen } from '../../../../lib/server/login/passkey-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postEntfernen(holePasskeyDienst(), e);
