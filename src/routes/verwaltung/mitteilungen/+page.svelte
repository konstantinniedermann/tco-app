<script lang="ts">
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import Seiteninfo from '../../../lib/verwaltung/Seiteninfo.svelte';
	import Mitteilungsformular from '../../../lib/verwaltung/Mitteilungsformular.svelte';
	import Mitteilungsverlauf from '../../../lib/verwaltung/Mitteilungsverlauf.svelte';
	import { ladeMitteilungen } from '../../../lib/verwaltung/mitteilung-api.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Nach dem Senden lädt die Seite den Verlauf neu, ohne neu zu navigieren.
	let verlauf = $derived(data.verlauf);

	async function neuLaden() {
		const a = await ladeMitteilungen({ art: 'verein' });
		if (a.art === 'ok') verlauf = a.daten.verlauf;
	}
</script>

<svelte:head>
	<title>Mitteilungen – MyTCO</title>
</svelte:head>

<Seitenkopf>
	<h1>Mitteilungen</h1>
</Seitenkopf>
<Seiteninfo>
	<p>Allgemeine Mitteilungen an alle aktiven Mitglieder, per Push oder E-Mail.</p>
	<p>
		An einen Teil der Mitglieder (z. B. wer noch nicht geantwortet hat) geht eine Mitteilung über
		die Seite eines Anlasses.
	</p>
</Seiteninfo>

{#if data.darfSchreiben.mitglieder}
	<Mitteilungsformular
		bezug={{ art: 'verein' }}
		vorlagen={[]}
		haupt
		stufe={2}
		onverlauf={neuLaden}
	/>
{/if}

<h2>Verschickt</h2>
<Mitteilungsverlauf eintraege={verlauf} />
