<script lang="ts">
	import { zeitText } from './anzeige.ts';
	import { WEG_NAMEN, auswahlText, zahlenText, type MitteilungVerlauf } from './mitteilung-api.ts';

	// Spec Ziel 12: wann, von wem, Titel und Text, Empfänger und Weg in Worten, Zahlen; neueste
	// zuerst (so liefert sie der Server). Nie die Namen der Empfänger.
	let { eintraege }: { eintraege: MitteilungVerlauf[] } = $props();
</script>

{#if eintraege.length === 0}
	<p class="leise">Noch keine Mitteilungen verschickt.</p>
{:else}
	<p class="leise">Neueste zuerst. Jeder Eintrag bleibt ein Jahr, ohne die Namen der Empfänger.</p>
	<!-- Ohne Links in der Tabelle: der Bereich selbst ist per Tastatur scrollbar (WCAG 2.1.1). -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="tabelle" role="region" aria-label="Verschickte Mitteilungen" tabindex="0">
		<table>
			<thead>
				<tr
					><th>Gesendet</th><th>Von</th><th>Mitteilung</th><th>Empfänger</th><th>Weg</th><th
						>Erreicht</th
					></tr
				>
			</thead>
			<tbody>
				{#each eintraege as e, i (i)}
					<tr>
						<td>{zeitText(e.gesendetAm)}</td>
						<td>{e.absender ?? 'gelöschtes Mitglied'}</td>
						<td><strong>{e.titel}</strong><br />{e.text}</td>
						<td>{auswahlText(e.auswahl)}</td>
						<td>{WEG_NAMEN[e.weg]}</td>
						<td>{zahlenText(e)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
