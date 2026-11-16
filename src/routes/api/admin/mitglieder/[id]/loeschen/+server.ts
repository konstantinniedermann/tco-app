import { postLoeschen } from '../../../../../../lib/server/admin/schnittstellen.ts';
import { holeMitteilungAdminDienste } from '../../../../../../lib/server/dienste.ts';
import type { RequestHandler } from './$types';

// Mit Push und Mailer: Austritt und Löschung melden den Doppelpartnern (FR-47).
export const POST: RequestHandler = (e) => postLoeschen(holeMitteilungAdminDienste(), e);
