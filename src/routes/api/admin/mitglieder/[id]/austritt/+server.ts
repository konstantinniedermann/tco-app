import { postAustritt } from '../../../../../../lib/server/admin/schnittstellen.ts';
import { holeMitteilungAdminDienste } from '../../../../../../lib/server/mitteilung/index.ts';
import type { RequestHandler } from './$types';

// Mit Push und Mailer: Austritt und Löschung melden den Doppelpartnern (FR-47).
export const POST: RequestHandler = (e) => postAustritt(holeMitteilungAdminDienste(), e);
