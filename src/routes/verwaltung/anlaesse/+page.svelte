<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatiereZeitpunkt } from '../../../lib/anlass/zeit.ts';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { ladeAnlaesseAdmin, type AnlassZeile } from '../../../lib/verwaltung/api.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';

	let zeilen = $state<AnlassZeile[]>([]);
	let fehler = $state<string | null>(null);
	let geladen = $state(false);

	$effect(() => {
		void lade();
	});

	async function lade() {
		const a = await ladeAnlaesseAdmin();
		if (await leiteUm(a)) return;
		geladen = true;
		if (a.art === 'ok') zeilen = a.daten;
		else fehler = MELDUNG.stoerung;
	}
</script>

<svelte:head>
	<title>Anlässe – MyTCO</title>
</svelte:head>

<h1>Anlässe</h1>
<p class="leise" role="status">
	{#if geladen}{zeilen.length} {zeilen.length === 1 ? 'Anlass' : 'Anlässe'}{/if}
</p>

<div class="leiste">
	<a class="taste-haupt" href={resolve('/verwaltung/anlaesse/neu')}>Neuer Anlass</a>
</div>

{#if fehler}
	<p class="fehler" role="alert">{fehler}</p>
{/if}

{#if geladen && !fehler && zeilen.length === 0}
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
							><a href={resolve('/verwaltung/anlaesse/[id]', { id: String(z.id) })}>{z.titel}</a
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
