import { holePasskeyDienst } from '../../../../lib/server/login/index.ts';
import { postHinweis } from '../../../../lib/server/login/passkey-schnittstellen.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (e) => postHinweis(holePasskeyDienst(), e);
