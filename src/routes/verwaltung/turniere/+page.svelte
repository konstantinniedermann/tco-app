<script lang="ts">
	import { resolve } from '$app/paths';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { ladeTurniere, type TurnierListe } from '../../../lib/verwaltung/api.ts';
	import { datumKurz, statusText } from '../../../lib/verwaltung/turnier-anzeige.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';

	let { data } = $props();
	let zeilen = $state<TurnierListe>([]);
	let fehler = $state<string | null>(null);
	let geladen = $state(false);

	$effect(() => {
		void lade();
	});

	async function lade() {
		const a = await ladeTurniere();
		if (await leiteUm(a)) return;
		geladen = true;
		if (a.art === 'ok') zeilen = a.daten;
		else fehler = MELDUNG.stoerung;
	}
</script>

<svelte:head>
	<title>Clubmeisterschaft – MyTCO</title>
</svelte:head>

<h1>Clubmeisterschaft</h1>
<p class="leise" role="status">
	{#if geladen}{zeilen.length} {zeilen.length === 1 ? 'Turnier' : 'Turniere'}{/if}
</p>

{#if data.darfSchreiben.cm}
	<div class="leiste">
		<a class="taste-haupt" href={resolve('/verwaltung/turniere/neu')}>Neues Turnier</a>
	</div>
{/if}

{#if fehler}
	<p class="fehler" role="alert">{fehler}</p>
{/if}

{#if geladen && !fehler && zeilen.length === 0}
	<p>Noch keine Turniere.</p>
{:else if zeilen.length > 0}
	<div class="tabelle">
		<table>
			<thead>
				<tr>
					<th>Jahr</th><th>Turnier</th><th>Status</th><th>Anmeldeschluss</th><th>Kategorien</th>
				</tr>
			</thead>
			<tbody>
				{#each zeilen as z (z.id)}
					{@const status = statusText(z.status)}
					<tr>
						<td>{z.jahr}</td>
						<td
							><a href={resolve('/verwaltung/turniere/[id]', { id: String(z.id) })}>{z.name}</a></td
						>
						<td><span class="plakette {status.klasse}">{status.text}</span></td>
						<td>{datumKurz(z.anmeldeschluss)}</td>
						<td>{z.kategorien}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
<p class="leise">
	Pro Jahr gibt es ein Turnier. Vergangene Turniere bleiben hier stehen und lassen sich ansehen.
</p>
