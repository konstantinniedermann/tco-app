<script lang="ts">
	import { resolve } from '$app/paths';
	import Resultat from '../../lib/interclub/Resultat.svelte';
	import {
		datumText,
		kachelText,
		nachTag,
		standText,
		vorgewaehlt,
		type Ansicht
	} from '../../lib/interclub/anzeige.ts';
	import type { Kachel, Spiel } from '../../lib/interclub/api.ts';
	import Umschalter from '../../lib/ui/Umschalter.svelte';
	import type { PageProps } from './$types';

	// Oberste Seite des Reiters IC (UI-Leitbild, Reiter IC): Umschalter «Resultate · Teams»,
	// vorgewählt nach dem Stand der Saison; ein Tipp wechselt nur den Inhalt.
	let { data }: PageProps = $props();
	const u = $derived(data.uebersicht);
	let ansicht = $derived<Ansicht>(vorgewaehlt(data.uebersicht?.abgeschlossen ?? false));

	const OPTIONEN: readonly { wert: Ansicht; text: string }[] = [
		{ wert: 'resultate', text: 'Resultate' },
		{ wert: 'teams', text: 'Teams' }
	];
</script>

<svelte:head>
	<title>Interclub – MyTCO</title>
</svelte:head>

{#snippet spieltage(titel: string, kennung: string, spiele: Spiel[])}
	{#if spiele.length > 0}
		<section class="karte" aria-labelledby={kennung}>
			<h2 id={kennung}>{titel}</h2>
			{#each nachTag(spiele) as tag (tag.datum)}
				<p class="leise resultat-tag">{datumText(tag.datum)}</p>
				{#each tag.spiele as s, i (`${s.teamId}-${s.art}-${s.runde}-${s.heim}`)}
					<Resultat spiel={s} mitLiga teil={i > 0} />
				{/each}
			{/each}
		</section>
	{/if}
{/snippet}

{#snippet abschnitt(titel: string, kacheln: Kachel[] | null, saison: number)}
	<h2>{titel}</h2>
	{#if kacheln}
		{#each kacheln as k (k.teamId)}
			<a class="karte kachel" href={resolve('/interclub/[id]', { id: String(k.teamId) })}>
				<span>
					<strong>{k.liga}</strong><br />
					<span class="leise">{kachelText(k.teamName, k.rang, k.von, k.entscheid)}</span>
				</span>
				<span class="kachel-pfeil" aria-hidden="true">›</span>
			</a>
		{/each}
	{:else}
		<p class="leise">Spielplan {saison} noch nicht da</p>
	{/if}
{/snippet}

{#if !u}
	<h1>Interclub</h1>
	<p>Zurzeit gibt es keine Interclub-Resultate.</p>
{:else}
	<h1>Interclub {u.saison}</h1>
	<p class="leise">{standText(u.stand)}</p>
	<Umschalter wahl={ansicht} optionen={OPTIONEN} onwahl={(w) => (ansicht = w)} />
	{#if ansicht === 'resultate'}
		{#if u.abgeschlossen}
			<p class="karte">
				Saison {u.saison} abgeschlossen. Die Saison {u.saison + 1} steht hier, sobald Swiss Tennis den
				Spielplan veröffentlicht.
			</p>
		{:else}
			{@render spieltage('Letzte Resultate', 'ic-letzte', u.letzte)}
			{@render spieltage('Nächste Spiele', 'ic-naechste', u.naechste)}
		{/if}
	{:else}
		{#if u.abgeschlossen}
			<p class="leise">Saison {u.saison} abgeschlossen: Schlussrang jedes Teams.</p>
		{/if}
		{@render abschnitt('Aktive und Senioren', u.aktive, u.saison)}
		{@render abschnitt('Junioren', u.junioren, u.saison)}
	{/if}
{/if}
