<script lang="ts" generics="Z">
	import type { Tabellenstand } from './tabellen-stand.svelte.ts';

	// Baustein Tabellen-Steuerung (UI-Leitbild): Zeile über der Tabelle mit der Anzahl, je aktivem
	// Filter einem Wort mit ×, «Filter zurücksetzen» und «Breiten zurücksetzen».
	let { stand, anzahl }: { stand: Tabellenstand<Z>; anzahl: string } = $props();

	const woerter = $derived(stand.woerter());
	const titelVon = (schluessel: string) => stand.spalte(schluessel)?.titel ?? schluessel;
</script>

<div class="tabellen-kopfzeile">
	<span class="leise" role="status">{anzahl}</span>
	{#each woerter as w (w.schluessel)}
		<span class="filter-wort"
			>{w.text}<button
				type="button"
				aria-label="Filter {titelVon(w.schluessel)} entfernen"
				onclick={() => stand.setzeFilter(w.schluessel, undefined)}
				><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button
			></span
		>
	{/each}
	<span class="tabellen-kopfzeile-rechts">
		{#if woerter.length > 0}
			<button type="button" class="textlink" onclick={() => stand.leereFilter()}
				>Filter zurücksetzen</button
			>
		{/if}
		<button
			type="button"
			class="textlink breiten-zuruecksetzen"
			onclick={() => stand.leereBreiten()}>Breiten zurücksetzen</button
		>
	</span>
</div>
