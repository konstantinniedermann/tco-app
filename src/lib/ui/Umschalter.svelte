<script lang="ts" generics="W extends string">
	// Baustein Umschalter (UI-Leitbild): Unterreiter oben auf einer Seite. Die Wahl wechselt den
	// Inhalt auf derselben Seite, ohne neue Stufe und ohne Seitenwechsel-Bewegung; die Seite hält
	// die Wahl und bekommt sie über `onwahl`.
	let {
		wahl,
		optionen,
		onwahl
	}: {
		wahl: W;
		optionen: readonly { wert: W; text: string }[];
		onwahl: (wert: W) => void;
	} = $props();
</script>

<div class="umschalter" role="group" aria-label="Ansicht">
	{#each optionen as o (o.wert)}
		<button type="button" aria-pressed={wahl === o.wert} onclick={() => onwahl(o.wert)}
			>{o.text}</button
		>
	{/each}
</div>
