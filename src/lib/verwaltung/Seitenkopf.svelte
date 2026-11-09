<script lang="ts">
	import type { Snippet } from 'svelte';
	import Pfad from './Pfad.svelte';

	// Baustein Seitenkopf (UI-Leitbild): Pfad und <h1> einer Seite der Verwaltung zusammen; ab 60rem
	// klebt er oben am Inhalt. Das <h1> kommt von der Seite (tabindex und bind:this bleiben dort).
	let {
		pfad,
		children
	}: {
		/** Wie Pfad.svelte; fehlt auf obersten Seiten. */
		pfad?: { stufen: { text: string; href: string }[]; aktuell: string };
		children: Snippet;
	} = $props();
</script>

<div class="seitenkopf">
	{#if pfad}<Pfad {...pfad} />{/if}
	{@render children()}
</div>
