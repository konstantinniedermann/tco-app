<!--
	UI-Leitbild, Baustein Tabelle: Tasten in der letzten Zelle einer Zeile der Verwaltung. Bis zwei
	Aktionen steht je eine Taste in der Zeile, ab drei nur «Ändern», das den Dialog «Ändern»
	(`Zeilenaktionen`) öffnet. Jede Taste nennt per `aria-describedby`, wen sie betrifft.
-->
<script lang="ts">
	import { zeigtAendern, type Zeilenaktion } from './zeilenaktionen.ts';

	type Props = { aktionen: Zeilenaktion[]; beschrieben: string; onaendern: () => void };

	let { aktionen, beschrieben, onaendern }: Props = $props();
</script>

{#if zeigtAendern(aktionen.length)}
	<button type="button" class="taste-neben" aria-describedby={beschrieben} onclick={onaendern}
		>Ändern</button
	>
{:else if aktionen.length > 0}
	<div class="leiste">
		{#each aktionen as a (a.name)}
			<button type="button" class="taste-neben" aria-describedby={beschrieben} onclick={a.los}
				>{a.name}</button
			>
		{/each}
	</div>
{/if}
