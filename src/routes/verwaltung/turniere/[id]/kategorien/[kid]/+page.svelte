<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Kategorieformular, {
		anfrage,
		werteAusKategorie,
		type KategorieWerte
	} from '../../../../../../lib/verwaltung/Kategorieformular.svelte';
	import {
		aendereKategorie,
		ladeKategorie,
		sageKategorieAb,
		type KategorieAnsicht,
		type KategorieFeld
	} from '../../../../../../lib/verwaltung/api.ts';
	import { fehlerText } from '../../../../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const nurLesen = $derived(!data.darfSchreiben.cm);

	// Nach dem Speichern lädt die Seite den neuen Stand, ohne neu zu navigieren.
	let kategorie = $derived<KategorieAnsicht>(data.kategorie);
	let schluessel = $state(0);
	let fehler = $state<Partial<Record<KategorieFeld, string>>>({});
	let allgemein = $state<string | null>(null);
	let absageFehler = $state<string | null>(null);
	let rueckmeldung = $state<string | null>(null);
	let laeuft = $state(false);
	let rueckfrage = $state<HTMLDialogElement>();

	const start = $derived<KategorieWerte>(werteAusKategorie(kategorie));

	async function neuLaden() {
		const neu = await ladeKategorie(kategorie.id);
		if (neu.art === 'ok') kategorie = neu.daten;
		return neu.art === 'ok';
	}

	async function speichern(werte: KategorieWerte) {
		if (laeuft) return;
		laeuft = true;
		fehler = {};
		allgemein = null;
		rueckmeldung = null;
		const a = await aendereKategorie(kategorie.id, anfrage(werte));
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			if (await neuLaden()) schluessel++;
			rueckmeldung = 'Gespeichert';
		} else if (a.art === 'eingabe') {
			fehler = a.felder;
		} else if (a.art === 'vergeben') {
			fehler = { name: 'Eine Kategorie mit diesem Namen gibt es in diesem Turnier schon.' };
		} else if (a.art === 'abgesagt') {
			await neuLaden();
		} else if (a.art === 'nicht-gefunden') {
			allgemein = 'Diese Kategorie gibt es nicht mehr.';
		} else {
			allgemein = fehlerText(a);
		}
		laeuft = false;
	}

	async function absagen() {
		if (laeuft) return;
		laeuft = true;
		absageFehler = null;
		const a = await sageKategorieAb(kategorie.id);
		rueckfrage?.close();
		laeuft = false;
		if (await leiteUm(a)) return;
		if (a.art === 'ok' || a.art === 'nicht-gefunden') {
			await goto(resolve('/verwaltung/turniere/[id]', { id: String(kategorie.turnierId) }), {
				refreshAll: true
			});
		} else {
			absageFehler = fehlerText(a);
		}
	}
</script>

<svelte:head>
	<title>{kategorie.name} – MyTCO</title>
</svelte:head>

<a class="zurueck" href={resolve('/verwaltung/turniere/[id]', { id: String(kategorie.turnierId) })}
	>‹ {kategorie.turniername}</a
>
<h1>{kategorie.name}</h1>

{#if kategorie.status === 'abgesagt'}
	<div class="karte">
		<p><span class="plakette plakette-gesperrt">abgesagt</span></p>
		<p>Diese Kategorie ist abgesagt. Mitglieder sehen sie nicht mehr.</p>
	</div>
{:else}
	<div class="karte">
		{#key schluessel}
			<Kategorieformular
				{start}
				{fehler}
				knopf="Kategorie speichern"
				nurBeiAenderung
				{rueckmeldung}
				{nurLesen}
				onspeichern={speichern}
			/>
		{/key}
		{#if allgemein}
			<p class="fehler" role="alert">{allgemein}</p>
		{/if}
	</div>

	{#if !nurLesen}
		<h2>Kategorie absagen</h2>
		<div class="karte">
			<p>Mitglieder sehen eine abgesagte Kategorie nicht mehr.</p>
			{#if absageFehler}
				<p class="fehler" role="alert">{absageFehler}</p>
			{/if}
			<button type="button" class="taste-neben" onclick={() => rueckfrage?.showModal()}
				>Kategorie absagen</button
			>
		</div>

		<dialog class="karte" bind:this={rueckfrage} aria-labelledby="absagen-titel">
			<h2 id="absagen-titel">Kategorie absagen?</h2>
			<p>Das lässt sich nicht rückgängig machen.</p>
			<div class="leiste">
				<button type="button" class="taste-neben" onclick={() => rueckfrage?.close()}
					>Abbrechen</button
				>
				<button type="button" class="taste-haupt" onclick={absagen}>Absagen</button>
			</div>
		</dialog>
	{/if}
{/if}
