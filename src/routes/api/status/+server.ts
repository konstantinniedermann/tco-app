import { json } from '@sveltejs/kit';
import { holeDb } from '../../../lib/server/db/index.ts';
import { ermittleStatus } from '../../../lib/server/status.ts';

export async function GET() {
	const antwort = await ermittleStatus(holeDb);
	return json(antwort, {
		status: antwort.status === 'ok' ? 200 : 503,
		headers: { 'cache-control': 'no-store' }
	});
}
