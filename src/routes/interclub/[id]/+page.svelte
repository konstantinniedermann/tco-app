<script lang="ts">
	import Resultat from '../../../lib/interclub/Resultat.svelte';
	import { entscheidText, nachRunde, teamText } from '../../../lib/interclub/anzeige.ts';
	import Umschalter from '../../../lib/ui/Umschalter.svelte';
	import Zurueck from '../../../lib/ui/Zurueck.svelte';
	import type { PageProps } from './$types';

	// Seite eines Teams (UI-Leitbild): Umschalter «Spiele · Tabelle», vorgewählt die Spiele; ein
	// Tipp wechselt nur den Inhalt.
	let { data }: PageProps = $props();
	const t = $derived(data.team);
	let ansicht = $state<'spiele' | 'tabelle'>('spiele');

	const OPTIONEN: readonly { wert: 'spiele' | 'tabelle'; text: string }[] = [
		{ wert: 'spiele', text: 'Spiele' },
		{ wert: 'tabelle', text: 'Tabelle' }
	];
</script>

<svelte:head>
	<title>{t.liga} – MyTCO</title>
</svelte:head>

<Zurueck />
<h1>{t.liga}</h1>
<p class="leise">{teamText(t.teamName, t.gruppe, t.rangliste)}</p>
<Umschalter wahl={ansicht} optionen={OPTIONEN} onwahl={(w) => (ansicht = w)} />

{#if ansicht === 'spiele'}
	{#each nachRunde(t.spiele) as r (r.runde)}
		<section class="karte">
			<h2>Runde {r.runde}</h2>
			{#each r.spiele as s, i (`${s.heim}-${s.gast}`)}
				<Resultat spiel={s} teil={i > 0} />
			{/each}
		</section>
	{/each}
{:else}
	<section class="karte">
		<h2>Gruppe {t.gruppe}</h2>
		<table class="rangliste">
			<thead>
				<tr class="leise">
					<th scope="col">Rang</th>
					<th scope="col">Team</th>
					<th scope="col">Partien</th>
					<th scope="col">Sätze</th>
				</tr>
			</thead>
			<tbody>
				{#each t.rangliste as z (z.rang + z.teamName)}
					<tr class={{ 'rangliste-eigen': z.eigen }}>
						<td>{z.rang}.</td>
						<td>{z.teamName}</td>
						<td>{z.partienGewonnen}:{z.partienVerloren}</td>
						<td>{z.saetze}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
	{#if t.entscheide}
		<section class="karte">
			<h2>{entscheidText(t.entscheide.art)}</h2>
			{#each t.entscheide.spiele as s, i (`${s.runde}-${s.heim}-${s.gast}`)}
				<Resultat spiel={s} teil={i > 0} />
			{/each}
		</section>
	{/if}
{/if}
