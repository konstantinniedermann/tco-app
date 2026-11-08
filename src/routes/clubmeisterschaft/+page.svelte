<script lang="ts">
	import CmKachel from '../../lib/cm/CmKachel.svelte';
	import type { PageProps } from './$types';

	// Oberste Seite des Reiters CM, wenn keine oder mehrere Clubmeisterschaften laufen; bei genau
	// einer leitet `+page.ts` direkt zu ihrer Seite.
	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Clubmeisterschaft – MyTCO</title>
</svelte:head>

<h1>Clubmeisterschaft</h1>
{#if data.einstieg.art === 'mehrere'}
	{#each data.einstieg.turniere as t (t.id)}
		<CmKachel turnier={t} />
	{/each}
{:else}
	<p>Zurzeit läuft keine Clubmeisterschaft. Sobald die Anmeldung offen ist, steht sie hier.</p>
{/if}
