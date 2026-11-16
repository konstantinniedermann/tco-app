<script lang="ts">
	import { goto } from '$app/navigation';
	import Seitenkopf from '../../../../lib/verwaltung/Seitenkopf.svelte';
	import { resolve } from '$app/paths';
	import Turnierformular, {
		neuesTurnier,
		type TurnierWerte
	} from '../../../../lib/verwaltung/Turnierformular.svelte';
	import { type TurnierFeld } from '../../../../lib/verwaltung/api.ts';
	import { legeTurnierAn } from '../../../../lib/verwaltung/turnier-api.ts';
	import { fehlerText } from '../../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../../lib/verwaltung/umleiten.ts';

	const start = neuesTurnier(new Date());
	let fehler = $state<Partial<Record<TurnierFeld, string>>>({});
	let allgemein = $state<string | null>(null);
	let laeuft = $state(false);

	async function anlegen(werte: TurnierWerte) {
		if (laeuft) return;
		laeuft = true;
		fehler = {};
		allgemein = null;
		const a = await legeTurnierAn(werte);
		laeuft = false;
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			await goto(resolve('/verwaltung/turniere/[id]', { id: String(a.daten.id) }));
		} else if (a.art === 'eingabe') {
			fehler = a.felder;
		} else if (a.art === 'vergeben') {
			fehler = { jahr: 'Für dieses Jahr gibt es schon ein Turnier.' };
		} else {
			allgemein = fehlerText(a);
		}
	}
</script>

<svelte:head>
	<title>Neues Turnier – MyTCO</title>
</svelte:head>

<Seitenkopf
	pfad={{
		stufen: [{ text: 'Turniere', href: resolve('/verwaltung/turniere') }],
		aktuell: 'Neues Turnier'
	}}
>
	<h1>Neues Turnier</h1>
</Seitenkopf>

<div class="karte">
	<Turnierformular {start} {fehler} knopf="Turnier anlegen" nameFolgtJahr onspeichern={anlegen} />
	{#if allgemein}
		<p class="fehler" role="alert">{allgemein}</p>
	{/if}
</div>
