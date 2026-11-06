import { redirect } from '@sveltejs/kit';
import { startziel } from '../../lib/verwaltung/umleiten.ts';
import type { PageLoad } from './$types';

// Admins beginnen bei den Mitgliedern, nur `cm` bei den Turnieren; das Layout prüft vorher den Zugang.
export const load: PageLoad = async ({ parent }) => {
	const { rollen } = await parent();
	redirect(307, startziel(rollen));
};
