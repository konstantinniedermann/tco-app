<script lang="ts">
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import { aktiverReiter } from './navigation.ts';

	// Reiter (UI-Leitbild, Bewegung und Bedienung): Der angetippte Reiter ist sofort aktiv, auch
	// wenn seine Seite noch lädt; der Balken gleitet hinüber. Nochmals antippen → nach oben.
	const EINTRAEGE = ['/', '/profil'] as const;
	const aktiv = $derived(aktiverReiter(page.route.id, navigating.to?.route.id ?? null));
	const index = $derived(EINTRAEGE.findIndex((pfad) => pfad === aktiv));

	function antippen(ereignis: MouseEvent, pfad: string) {
		if (pfad !== aktiv || navigating.to) return;
		ereignis.preventDefault();
		const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
		// Es scrollt nur der Rollbereich des Layouts (UI-Leitbild, Baustein Rollbereich).
		document
			.querySelector('.rollbereich')
			?.scrollTo({ top: 0, behavior: ruhig ? 'auto' : 'smooth' });
	}
</script>

<nav
	class="reiter"
	aria-label="Hauptnavigation"
	data-anzahl={EINTRAEGE.length}
	data-aktiv={index}
	data-sveltekit-preload-code="eager"
>
	<span class="reiter-balken" aria-hidden="true"></span>
	<a
		href={resolve('/')}
		aria-current={aktiv === '/' ? 'page' : undefined}
		onclick={(e) => antippen(e, '/')}
	>
		<svg class="symbol" aria-hidden="true" viewBox="0 0 24 24">
			<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
		</svg>Start
	</a>
	<a
		href={resolve('/profil')}
		aria-current={aktiv === '/profil' ? 'page' : undefined}
		onclick={(e) => antippen(e, '/profil')}
	>
		<svg class="symbol" aria-hidden="true" viewBox="0 0 24 24">
			<circle cx="12" cy="8" r="4" />
			<path d="M4 21a8 8 0 0 1 16 0" />
		</svg>Profil
	</a>
</nav>
