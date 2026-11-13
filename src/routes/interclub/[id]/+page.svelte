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
		<section class="karte" aria-labelledby="ic-runde-{r.runde}">
			<h2 id="ic-runde-{r.runde}">Runde {r.runde}</h2>
			{#each r.spiele as s, i (`${s.heim}-${s.gast}`)}
				<Resultat spiel={s} teil={i > 0} />
			{/each}
		</section>
	{/each}
{:else}
	<section class="karte" aria-labelledby="ic-gruppe">
		<h2 id="ic-gruppe">Gruppe {t.gruppe}</h2>
		{#if t.rangliste.length === 0}
			<p>Die Tabelle steht nach der ersten Runde.</p>
		{:else}
			<!-- Ausdrückliche Rollen: Bei grosser Schrift wird die Tabelle zum Raster (zweizeilige
			     Zeilen), und Safari vergisst dann die Rollen einer Tabelle. -->
			<!-- svelte-ignore a11y_no_redundant_roles -->
			<table class="rangliste" role="table">
				<!-- svelte-ignore a11y_no_redundant_roles -->
				<thead role="rowgroup">
					<!-- svelte-ignore a11y_no_redundant_roles -->
					<tr class="leise" role="row">
						<th scope="col" role="columnheader">Rang</th>
						<th scope="col" role="columnheader">Team</th>
						<th scope="col" role="columnheader">Partien</th>
						<th scope="col" role="columnheader">Sätze</th>
					</tr>
				</thead>
				<!-- svelte-ignore a11y_no_redundant_roles -->
				<tbody role="rowgroup">
					{#each t.rangliste as z (z.rang + z.teamName)}
						<!-- svelte-ignore a11y_no_redundant_roles -->
						<tr class={{ 'rangliste-eigen': z.eigen }} role="row">
							<td role="cell">{z.rang}.</td>
							<td role="cell">{z.teamName}</td>
							<td role="cell">{z.partienGewonnen}:{z.partienVerloren}</td>
							<td role="cell">{z.saetze}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
	{#if t.entscheide}
		<section class="karte" aria-labelledby="ic-entscheide">
			<h2 id="ic-entscheide">{entscheidText(t.entscheide.art)}</h2>
			{#each t.entscheide.spiele as s, i (`${s.runde}-${s.heim}-${s.gast}`)}
				<Resultat spiel={s} teil={i > 0} />
			{/each}
		</section>
	{/if}
{/if}
