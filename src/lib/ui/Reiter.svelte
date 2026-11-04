<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const aktuell = (pfad: string) => (page.route.id === pfad ? 'page' : undefined);
</script>

<nav class="reiter" aria-label="Hauptnavigation">
	<a href={resolve('/')} aria-current={aktuell('/')}>
		<svg class="symbol" aria-hidden="true" viewBox="0 0 24 24">
			<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
		</svg>Start
	</a>
	<a href={resolve('/profil')} aria-current={aktuell('/profil')}>
		<svg class="symbol" aria-hidden="true" viewBox="0 0 24 24">
			<circle cx="12" cy="8" r="4" />
			<path d="M4 21a8 8 0 0 1 16 0" />
		</svg>Profil
	</a>
</nav>
