import { json } from '@sveltejs/kit';
import { leseEinstellungen } from '../../../lib/server/einstellungen.ts';

// Kontakt für Fragen auf der Seite Hilfe (A-HILFE-01), ohne Login: dieselbe Einstellung wie im
// Brief und in der Meldung «Code schon benutzt». Annahme K-21: Vereins-Adresse, weil öffentlich.
export function GET() {
	return json(
		{ kontakt: leseEinstellungen().kontakt },
		{ headers: { 'cache-control': 'no-store' } }
	);
}
