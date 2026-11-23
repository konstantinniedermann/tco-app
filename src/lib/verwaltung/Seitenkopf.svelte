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

	// Ab 60rem kleben die Spaltentitel einer Tabelle direkt unter dem Seitenkopf: Seine Höhe steht
	// als --hoehe-seitenkopf auf der Wurzel (Pfad und Titel können umbrechen, darum gemessen). Kein
	// Entfernen beim Abbau: Beim Seitenwechsel misst der Seitenkopf der neuen Seite neu.
	function setzeHoehe(hoehe: number) {
		document.documentElement.style.setProperty('--hoehe-seitenkopf', `${hoehe}px`);
	}
</script>

<div class="seitenkopf" bind:offsetHeight={null, setzeHoehe}>
	{#if pfad}<Pfad {...pfad} />{/if}
	{@render children()}
</div>
