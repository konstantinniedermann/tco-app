<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Kategorieformular, {
		NEUE_KATEGORIE,
		anfrage,
		type KategorieWerte
	} from '../../../../../../lib/verwaltung/Kategorieformular.svelte';
	import { legeKategorieAn, type KategorieFeld } from '../../../../../../lib/verwaltung/api.ts';
	import { fehlerText } from '../../../../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let fehler = $state<Partial<Record<KategorieFeld, string>>>({});
	let allgemein = $state<string | null>(null);
	let laeuft = $state(false);

	async function anlegen(werte: KategorieWerte) {
		if (laeuft) return;
		laeuft = true;
		fehler = {};
		allgemein = null;
		const a = await legeKategorieAn(data.turnier.id, anfrage(werte));
		laeuft = false;
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			await goto(resolve('/verwaltung/turniere/[id]', { id: String(data.turnier.id) }), {
				refreshAll: true
			});
		} else if (a.art === 'eingabe') {
			fehler = a.felder;
		} else if (a.art === 'vergeben') {
			fehler = { name: 'Eine Kategorie mit diesem Namen gibt es in diesem Turnier schon.' };
		} else if (a.art === 'nicht-gefunden') {
			allgemein = 'Dieses Turnier gibt es nicht mehr.';
		} else {
			allgemein = fehlerText(a);
		}
	}
</script>

<svelte:head>
	<title>Neue Kategorie – MyTCO</title>
</svelte:head>

<a class="zurueck" href={resolve('/verwaltung/turniere/[id]', { id: String(data.turnier.id) })}
	>‹ {data.turnier.name}</a
>
<h1>Neue Kategorie</h1>

<div class="karte">
	<Kategorieformular
		start={NEUE_KATEGORIE}
		{fehler}
		knopf="Kategorie anlegen"
		onspeichern={anlegen}
	/>
	{#if allgemein}
		<p class="fehler" role="alert">{allgemein}</p>
	{/if}
</div>
