<script lang="ts">
	import { resolve } from '$app/paths';
	import { zeitText } from '../../../../../lib/cm/anzeige.ts';
	import { amtlicherName } from '../../../../../lib/name.ts';
	import Seitenkopf from '../../../../../lib/verwaltung/Seitenkopf.svelte';
	import type { PageProps } from './$types';

	// Posteingang der Turnierleitung (A-TURNIER-04, FR-52): offene Gespräche zuerst.
	let { data }: PageProps = $props();
	const liste = $derived(data.liste);
	const offen = $derived(liste.zeilen.filter((z) => z.zustand === 'offen').length);
	const erledigt = $derived(liste.zeilen.length - offen);
</script>

<svelte:head>
	<title>Nachrichten – {liste.turnier.name} – MyTCO</title>
</svelte:head>

<Seitenkopf
	pfad={{
		stufen: [
			{ text: 'Turniere', href: resolve('/verwaltung/turniere') },
			{
				text: liste.turnier.name,
				href: resolve('/verwaltung/turniere/[id]', { id: String(liste.turnier.id) })
			}
		],
		aktuell: 'Nachrichten'
	}}
>
	<h1>Nachrichten an die Turnierleitung</h1>
</Seitenkopf>

<div class="kennzahlen">
	<div class="kennzahl"><strong>{offen}</strong> <span class="leise">offen</span></div>
	<div class="kennzahl"><strong>{erledigt}</strong> <span class="leise">erledigt</span></div>
</div>

{#if liste.zeilen.length === 0}
	<p>Noch keine Nachrichten.</p>
{:else}
	<div class="tabelle">
		<table>
			<thead>
				<tr><th>Mitglied</th><th>Letzte Nachricht</th><th>Zuletzt</th><th>Stand</th></tr>
			</thead>
			<tbody>
				{#each liste.zeilen as z (z.id)}
					{@const name = amtlicherName(z.mitglied, 'nachname-zuerst')}
					<tr>
						<td
							><a
								href={resolve('/verwaltung/turniere/[id]/nachrichten/[gid]', {
									id: String(liste.turnier.id),
									gid: String(z.id)
								})}>{name}</a
							></td
						>
						<td
							><span class="zelle-kurz" title={z.letzte.text}
								>{#if z.letzte.von === 'leitung'}<span class="leise">Turnierleitung:</span>
									{z.letzte.text}{:else}{z.letzte.text}{/if}</span
							></td
						>
						<td>{zeitText(z.letzte.gesendetAm)}</td>
						<td
							><span class="plakette {z.zustand === 'offen' ? 'plakette-offen' : 'plakette-ok'}"
								>{z.zustand}</span
							></td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
<p class="leise karte-teil">
	Alle Gespräche dieses Turniers werden am 1. Januar {liste.turnier.jahr + 1} gelöscht.
</p>
