<script lang="ts">
	import Zurueck from '../../../../../lib/ui/Zurueck.svelte';
	import Name from '../../../../../lib/ui/Name.svelte';
	import {
		doppelText,
		kategorieText,
		paarText,
		standPlakette
	} from '../../../../../lib/cm/anzeige.ts';
	import type { PageProps } from './$types';

	// Alle bestätigten Anmeldungen einer Kategorie (UI-Leitbild, Kategorie einer CM). Nur ansehen:
	// Anmelden, Abmelden und Partner anfragen bleiben auf der Seite der CM.
	let { data }: PageProps = $props();
	const k = $derived(data.kategorie);
	const doppel = $derived(k.art === 'doppel');
	const plakette = $derived(standPlakette(k, data.wildcard));
	const anzahl = $derived(doppel ? k.paare.length : k.namen.length);
</script>

<svelte:head>
	<title>{k.name} – MyTCO</title>
</svelte:head>

<Zurueck text={data.cm.turnier.name} />
<h1>{k.name}</h1>
<p>
	{#if plakette}<span class="plakette plakette-{plakette.art}">{plakette.text}</span><br />{/if}
	<span class="leise">{doppel ? doppelText(k) : kategorieText(k)}</span>
</p>

<section class="karte" aria-labelledby="angemeldet-titel">
	<h2 id="angemeldet-titel">{doppel ? 'Paare' : 'Angemeldet'} ({anzahl})</h2>
	{#if anzahl === 0}
		<p>{doppel ? 'Noch kein Paar.' : 'Noch niemand angemeldet.'}</p>
	{:else if doppel}
		<ul class="trefferliste">
			{#each k.paare as paar, i (i)}
				<li>{paarText(paar)}</li>
			{/each}
		</ul>
	{:else}
		<ul class="trefferliste">
			{#each k.namen as name, i (i)}
				<li><Name {name} /></li>
			{/each}
		</ul>
	{/if}
</section>

{#if doppel && k.suchende.length > 0}
	<section class="karte" aria-labelledby="suchende-titel">
		<h2 id="suchende-titel">Sucht Partner ({k.suchende.length})</h2>
		<ul class="trefferliste">
			{#each k.suchende as s, i (i)}
				<li>
					<Name name={s.name} />{#if s.kommentar}<br /><span class="leise">«{s.kommentar}»</span
						>{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}
