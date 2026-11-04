import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Die Verwaltung beginnt bei den Mitgliedern; das Layout prüft vorher den Zugang.
export const load: PageLoad = () => {
	redirect(307, '/verwaltung/mitglieder');
};
