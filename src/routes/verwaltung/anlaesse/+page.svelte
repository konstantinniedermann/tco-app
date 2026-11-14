<script lang="ts">
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import { resolve } from '$app/paths';
	import { formatiereZeitpunkt } from '../../../lib/anlass/zeit.ts';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import type { PageProps } from './$types';

	// Die Liste lädt `+page.ts` vor dem Anzeigen; `null` heisst «nicht geladen» (Störung).
	let { data }: PageProps = $props();
	const zeilen = $derived(data.zeilen ?? []);
	const fehler = $derived(data.zeilen === null ? MELDUNG.stoerung : null);
	const anzahl = $derived(`${zeilen.length} ${zeilen.length === 1 ? 'Anlass' : 'Anlässe'}`);
</script>

<svelte:head>
	<title>Anlässe – MyTCO</title>
</svelte:head>

<Seitenkopf>
	<h1>Anlässe</h1>
</Seitenkopf>
<p class="leise" role="status">
	{anzahl}
</p>

{#if data.darfSchreiben.mitglieder}
	<div class="leiste">
		<a class="taste-haupt" href={resolve('/verwaltung/anlaesse/neu')}>Neuer Anlass</a>
	</div>
{/if}

{#if fehler}
	<p class="fehler" role="alert">{fehler}</p>
{/if}

{#if !fehler && zeilen.length === 0}
	<p>Noch keine Anlässe.</p>
{:else if zeilen.length > 0}
	<div class="tabelle">
		<table>
			<thead>
				<tr>
					<th>Titel</th><th>Beginn</th><th>Anmeldeschluss</th><th>Kommen</th><th>Kommen nicht</th>
				</tr>
			</thead>
			<tbody>
				{#each zeilen as z (z.id)}
					<tr>
						<td
							><span class="zelle-kurz"
								><a href={resolve('/verwaltung/anlaesse/[id]', { id: String(z.id) })}>{z.titel}</a
								></span
							></td
						>
						<td>{formatiereZeitpunkt(z.beginn)}</td>
						<td>{formatiereZeitpunkt(z.anmeldeschluss)}</td>
						<td>{z.kommen}</td>
						<td>{z.kommenNicht}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
