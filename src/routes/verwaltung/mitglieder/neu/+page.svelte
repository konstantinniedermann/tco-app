<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Angabenformular, {
		LEERE_WERTE,
		type Werte
	} from '../../../../lib/verwaltung/Angabenformular.svelte';
	import { legeMitgliedAn, type Feld } from '../../../../lib/verwaltung/api.ts';
	import { leiteUm } from '../../../../lib/verwaltung/umleiten.ts';
	import { VERGEBEN, fehlerText } from '../../../../lib/verwaltung/anzeige.ts';

	let fehler = $state<Partial<Record<Feld, string>>>({});
	let allgemein = $state<string | null>(null);
	let laeuft = $state(false);

	async function anlegen(werte: Werte) {
		if (laeuft) return;
		laeuft = true;
		fehler = {};
		allgemein = null;
		const a = await legeMitgliedAn(werte);
		laeuft = false;
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			await goto(resolve('/verwaltung/mitglieder/[id]', { id: String(a.daten.id) }));
		} else if (a.art === 'eingabe') {
			fehler = a.felder;
		} else if (a.art === 'vergeben') {
			fehler = { [a.feld]: VERGEBEN[a.feld as 'email' | 'mitgliedernummer'] };
		} else {
			allgemein = fehlerText(a);
		}
	}
</script>

<svelte:head>
	<title>Mitglied anlegen – MyTCO</title>
</svelte:head>

<a class="zurueck" href={resolve('/verwaltung/mitglieder')}>‹ Zurück</a>
<h1>Mitglied anlegen</h1>

<div class="karte">
	<Angabenformular start={LEERE_WERTE} {fehler} knopf="Mitglied anlegen" onspeichern={anlegen} />
	{#if allgemein}
		<p class="fehler" role="alert">{allgemein}</p>
	{/if}
</div>
