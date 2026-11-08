<script lang="ts">
	import { goto } from '$app/navigation';
	import Pfad from '../../../../lib/verwaltung/Pfad.svelte';
	import { resolve } from '$app/paths';
	import Anlassformular, {
		LEERER_ANLASS,
		type AnlassWerte
	} from '../../../../lib/verwaltung/Anlassformular.svelte';
	import { legeAnlassAn, type AnlassFeld } from '../../../../lib/verwaltung/api.ts';
	import { fehlerText } from '../../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../../lib/verwaltung/umleiten.ts';

	let fehler = $state<Partial<Record<AnlassFeld, string>>>({});
	let allgemein = $state<string | null>(null);
	let laeuft = $state(false);

	async function anlegen(werte: AnlassWerte) {
		if (laeuft) return;
		laeuft = true;
		fehler = {};
		allgemein = null;
		const a = await legeAnlassAn(werte);
		laeuft = false;
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			await goto(resolve('/verwaltung/anlaesse/[id]', { id: String(a.daten.id) }));
		} else if (a.art === 'eingabe') {
			fehler = a.felder;
		} else {
			allgemein = fehlerText(a);
		}
	}
</script>

<svelte:head>
	<title>Neuer Anlass – MyTCO</title>
</svelte:head>

<Pfad
	stufen={[{ text: 'Anlässe', href: resolve('/verwaltung/anlaesse') }]}
	aktuell="Neuer Anlass"
/>
<h1>Neuer Anlass</h1>

<div class="karte">
	<Anlassformular start={LEERER_ANLASS} {fehler} knopf="Anlass erstellen" onspeichern={anlegen} />
	{#if allgemein}
		<p class="fehler" role="alert">{allgemein}</p>
	{/if}
</div>
