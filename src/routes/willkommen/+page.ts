import { redirect } from '@sveltejs/kit';
import {
	erkenneGeraet,
	istAndererIphoneBrowser,
	laeuftVomSymbol,
	zeigeEinstieg
} from '../../lib/hilfe/geraet.ts';
import type { PageLoad } from './$types';

// Einstiegsseite nur auf dem Handy im Browser (A-HILFE-02); vom Symbol und am PC geht es zum Login.
export const load: PageLoad = () => {
	const userAgent = navigator.userAgent;
	if (!zeigeEinstieg(userAgent, laeuftVomSymbol(window))) redirect(307, '/login');
	return {
		geraet: erkenneGeraet(userAgent) === 'iphone' ? ('iphone' as const) : ('android' as const),
		andererBrowser: istAndererIphoneBrowser(userAgent)
	};
};
