<script lang="ts">
	import type { Partie } from '../../../../lib/interclub/api.ts';
	import {
		aufgabeText,
		begegnungText,
		endstandText,
		ergebnisText,
		plakette,
		vorlesetext
	} from '../../../../lib/interclub/anzeige.ts';
	import Umschalter from '../../../../lib/ui/Umschalter.svelte';
	import Zurueck from '../../../../lib/ui/Zurueck.svelte';
	import type { PageProps } from './$types';

	// Seite einer Begegnung (UI-Leitbild): Endstand in einer Zeile, Umschalter «Einzel · Doppel»,
	// je Partie ein Aufklappbereich mit den Gegnern.
	let { data }: PageProps = $props();
	const b = $derived(data.begegnung);
	const s = $derived(data.begegnung.spiel);
	let ansicht = $state<'einzel' | 'doppel'>('einzel');

	const OPTIONEN: readonly { wert: 'einzel' | 'doppel'; text: string }[] = [
		{ wert: 'einzel', text: 'Einzel' },
		{ wert: 'doppel', text: 'Doppel' }
	];
</script>

<svelte:head>
	<title>{s.heim} – {s.gast} – MyTCO</title>
</svelte:head>

{#snippet partie(p: Partie, teil: boolean)}
	<details class={['klappe', 'partie', { 'karte-teil': teil }]}>
		<summary class="klappe-titel partie-titel">
			<span class="leise partie-nr">{p.position}</span>
			<span>
				{#each p.spieler as x, i (i)}
					{#if i > 0}<br />{/if}{x.name}&nbsp;<span class="leise">{x.klassierung}</span>
				{:else}
					–
				{/each}
			</span>
			<span class="partie-saetze" data-ergebnis={p.ergebnis}
				>{p.saetze.length ? p.saetze.join(' ') : p.aufgabe ? 'w.o.' : '–'}{#if p.ergebnis}<span
						class="vorlesen">, {vorlesetext(p.ergebnis)}</span
					>{/if}</span
			>
		</summary>
		<p class="partie-gegner">
			{#if p.gegner.length}
				<span class="leise">gegen</span>&nbsp;{#each p.gegner as g, i (i)}{#if i > 0}<br
						/>{/if}{g.name}&nbsp;<span class="leise">{g.klassierung}</span>{/each}
			{/if}
			{#if aufgabeText(p.aufgabe)}
				{#if p.gegner.length}<br />{/if}<span class="leise">{aufgabeText(p.aufgabe)}</span>
			{/if}
		</p>
	</details>
{/snippet}

<Zurueck text={b.liga} />
<h1>{s.heim} – {s.gast}</h1>
<p class="leise">{begegnungText(s)}</p>

{#if b.saetze && b.partien}
	<section class="karte resultat" aria-label="Endstand">
		<span class="leise">{endstandText(b.saetze, s.tcoHeim)}</span>
		<div>
			<strong class="resultat-stand" data-ergebnis={s.ergebnis}
				>{s.heimPunkte}:{s.gastPunkte}</strong
			>
			{#if s.ergebnis}
				<span class={['plakette', plakette(s.ergebnis)]}>{ergebnisText(s.ergebnis)}</span>
			{/if}
		</div>
	</section>
	<Umschalter wahl={ansicht} optionen={OPTIONEN} onwahl={(w) => (ansicht = w)} />
	{@const liste = ansicht === 'einzel' ? b.partien.einzel : b.partien.doppel}
	<section class="karte" aria-label={ansicht === 'einzel' ? 'Einzel' : 'Doppel'}>
		{#each liste as p, i (p.position)}
			{@render partie(p, i > 0)}
		{:else}
			<p class="leise">Nicht gespielt: Die Begegnung war nach den Einzeln entschieden.</p>
		{/each}
	</section>
{:else}
	<section class="karte resultat" aria-label="Endstand">
		<span class="leise">Endstand</span>
		<div>
			<strong class="resultat-stand" data-ergebnis={s.ergebnis}
				>{s.heimPunkte}:{s.gastPunkte}</strong
			>
			{#if s.ergebnis}
				<span class={['plakette', plakette(s.ergebnis)]}>{ergebnisText(s.ergebnis)}</span>
			{/if}
		</div>
	</section>
	<p class="karte">Einzelpartien noch nicht da.</p>
{/if}
