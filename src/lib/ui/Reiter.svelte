<script lang="ts">
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import { aktiverReiter, reiterFuer, type Bereich } from './navigation.ts';

	// Reiter (UI-Leitbild, Bewegung und Bedienung): Der angetippte Reiter ist sofort aktiv, auch
	// wenn seine Seite noch lädt; der Balken gleitet hinüber. Nochmals antippen: auf einer
	// Unterseite zur obersten Seite des Bereichs (normaler Link), auf der obersten nach oben.
	const aktiv = $derived(aktiverReiter(page.route.id, navigating.to?.route.id ?? null));
	// IC steht nur, wenn es Interclub-Daten gibt (das Layout fragt `/api/sitzung`).
	const interclub = $derived(page.data.interclub === true);
	const reiter = $derived(reiterFuer(interclub));
	const index = $derived(reiter.findIndex((pfad) => pfad === aktiv));
	// Die Seite einer CM ist die oberste des Reiters CM, wenn sie die einzige laufende ist.
	const aufOberster = $derived(page.route.id === aktiv || page.data.bereichsWurzel === true);

	function antippen(ereignis: MouseEvent, pfad: Bereich) {
		if (pfad !== aktiv || !aufOberster || navigating.to) return;
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
	data-anzahl={reiter.length}
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
		href={resolve('/clubmeisterschaft')}
		aria-current={aktiv === '/clubmeisterschaft' ? 'page' : undefined}
		onclick={(e) => antippen(e, '/clubmeisterschaft')}
	>
		<svg class="symbol" aria-hidden="true" viewBox="0 0 24 24">
			<circle cx="12" cy="12" r="9" />
			<path d="M5.6 5.6a9 9 0 0 1 0 12.8" />
			<path d="M18.4 5.6a9 9 0 0 0 0 12.8" />
		</svg>CM
	</a>
	{#if interclub}
		<a
			href={resolve('/interclub')}
			aria-current={aktiv === '/interclub' ? 'page' : undefined}
			onclick={(e) => antippen(e, '/interclub')}
		>
			<svg class="symbol" aria-hidden="true" viewBox="0 0 24 24">
				<path d="M3 20h18" />
				<path d="M9.5 20V8h5v12" />
				<path d="M4 20v-7h5.5" />
				<path d="M14.5 11H20v9" />
			</svg>IC
		</a>
	{/if}
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
