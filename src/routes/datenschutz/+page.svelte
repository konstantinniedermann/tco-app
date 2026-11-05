<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Teil } from '../../lib/datenschutz/erklaerung.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Datenschutz – MyTCO</title>
</svelte:head>

{#snippet text(teile: Teil[])}
	{#each teile as teil, i (i)}
		{#if teil.fett}<strong>{teil.text}</strong>{:else}{teil.text}{/if}
	{/each}
{/snippet}

<a class="zurueck" href={resolve('/')}>‹ Zurück</a>
<h1>{data.titel}</h1>
<p class="leise">Entwurf: Der Vorstand gibt diesen Text noch frei.</p>

<div class="karte">
	{#each data.bloecke as block, i (i)}
		{#if block.art === 'absatz'}
			<p>{@render text(block.teile)}</p>
		{:else}
			<ul>
				{#each block.punkte as punkt, j (j)}
					<li>{@render text(punkt)}</li>
				{/each}
			</ul>
		{/if}
	{/each}
</div>
