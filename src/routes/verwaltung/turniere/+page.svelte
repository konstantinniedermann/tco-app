<script lang="ts">
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import { resolve } from '$app/paths';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { datumKurz, statusText } from '../../../lib/verwaltung/turnier-anzeige.ts';
	import type { PageProps } from './$types';

	// Die Liste lädt `+page.ts` vor dem Anzeigen; `null` heisst «nicht geladen» (Störung).
	let { data }: PageProps = $props();
	const zeilen = $derived(data.zeilen ?? []);
	const fehler = $derived(data.zeilen === null ? MELDUNG.stoerung : null);
	const anzahl = $derived(`${zeilen.length} ${zeilen.length === 1 ? 'Turnier' : 'Turniere'}`);
</script>

<svelte:head>
	<title>Clubmeisterschaft – MyTCO</title>
</svelte:head>

<Seitenkopf>
	<h1>Clubmeisterschaft</h1>
</Seitenkopf>
<p class="leise" role="status">
	{anzahl}
</p>

{#if data.darfSchreiben.cm}
	<div class="leiste">
		<a class="taste-haupt" href={resolve('/verwaltung/turniere/neu')}>Neues Turnier</a>
	</div>
{/if}

{#if fehler}
	<p class="fehler" role="alert">{fehler}</p>
{/if}

{#if !fehler && zeilen.length === 0}
	<p>Noch keine Turniere.</p>
{:else if zeilen.length > 0}
	<div class="tabelle">
		<table>
			<thead>
				<tr>
					<th>Jahr</th><th>Turnier</th><th>Status</th><th>Anmeldeschluss</th><th>Kategorien</th><th
						>Offen</th
					>
				</tr>
			</thead>
			<tbody>
				{#each zeilen as z (z.id)}
					{@const status = statusText(z.status)}
					<tr>
						<td>{z.jahr}</td>
						<td
							><span class="zelle-kurz"
								><a href={resolve('/verwaltung/turniere/[id]', { id: String(z.id) })}>{z.name}</a
								></span
							></td
						>
						<td><span class="plakette {status.klasse}">{status.text}</span></td>
						<td>{datumKurz(z.anmeldeschluss)}</td>
						<td>{z.kategorien}</td>
						<td>{z.offen > 0 ? z.offen : ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
<p class="leise">
	Pro Jahr gibt es ein Turnier. Vergangene Turniere bleiben hier stehen und lassen sich ansehen.
</p>
