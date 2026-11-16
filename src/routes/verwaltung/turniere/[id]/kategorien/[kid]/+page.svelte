<script lang="ts">
	import { goto, refreshAll } from '$app/navigation';
	import Seitenkopf from '../../../../../../lib/verwaltung/Seitenkopf.svelte';
	import { resolve } from '$app/paths';
	import Anmeldungsliste from '../../../../../../lib/verwaltung/Anmeldungsliste.svelte';
	import DoppelListe from '../../../../../../lib/verwaltung/DoppelListe.svelte';
	import Kategorieformular, {
		anfrage,
		werteAusKategorie,
		type KategorieWerte
	} from '../../../../../../lib/verwaltung/Kategorieformular.svelte';
	import { type KategorieFeld } from '../../../../../../lib/verwaltung/api.ts';
	import {
		aendereKategorie,
		ladeKategorie,
		sageKategorieAb,
		type KategorieAnsicht
	} from '../../../../../../lib/verwaltung/turnier-api.ts';
	import { fehlerText } from '../../../../../../lib/verwaltung/anzeige.ts';
	import {
		absageSperreText,
		ART_GESPERRT,
		unpassendText
	} from '../../../../../../lib/verwaltung/turnier-anzeige.ts';
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
	// FR-36: Werte, die erst nach der Rückfrage «Trotzdem speichern» gelten, und wie viele Anmeldungen nicht mehr passen.
	let warnung = $state<HTMLDialogElement>();
	let ausstehend = $state<KategorieWerte | null>(null);
	let unpassend = $state(0);

	const start = $derived<KategorieWerte>(werteAusKategorie(kategorie));

	async function neuLaden() {
		const neu = await ladeKategorie(kategorie.id);
		if (neu.art === 'ok') kategorie = neu.daten;
		return neu.art === 'ok';
	}

	async function speichern(werte: KategorieWerte, trotzdem = false) {
		if (laeuft) return;
		laeuft = true;
		fehler = {};
		allgemein = null;
		rueckmeldung = null;
		const a = await aendereKategorie(kategorie.id, anfrage(werte), trotzdem);
		warnung?.close();
		if (await leiteUm(a)) return;
		if (a.art === 'unpassend') {
			ausstehend = werte;
			unpassend = a.anzahl;
			warnung?.showModal();
		} else if (a.art === 'ok') {
			// refreshAll lädt den neuen Stand und verwirft Vorgeladenes: Eine Berührung des Rücklinks
			// ohne Seitenwechsel hätte die Turnierseite sonst mit dem Stand vor dem Speichern behalten.
			await refreshAll();
			schluessel++;
			rueckmeldung = 'Gespeichert';
		} else if (a.art === 'eingabe') {
			fehler = a.felder;
		} else if (a.art === 'vergeben') {
			fehler = { name: 'Eine Kategorie mit diesem Namen gibt es in diesem Turnier schon.' };
		} else if (a.art === 'art-gesperrt') {
			fehler = { art: ART_GESPERRT };
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
		} else if (a.art === 'hat-anmeldungen') {
			// Jemand hat sich inzwischen angemeldet: der neue Stand zeigt die Sperre als Satz.
			await neuLaden();
		} else {
			absageFehler = fehlerText(a);
		}
	}
</script>

<svelte:head>
	<title>{kategorie.name} – MyTCO</title>
</svelte:head>

<Seitenkopf
	pfad={{
		stufen: [
			{ text: 'Turniere', href: resolve('/verwaltung/turniere') },
			{
				text: kategorie.turniername,
				href: resolve('/verwaltung/turniere/[id]', { id: String(kategorie.turnierId) })
			}
		],
		aktuell: kategorie.name
	}}
>
	<h1>{kategorie.name}</h1>
</Seitenkopf>

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

	{#if kategorie.art === 'einzel'}
		<Anmeldungsliste
			kategorieId={kategorie.id}
			zeilen={data.anmeldungen}
			turnier={data.turnier}
			{nurLesen}
		/>
	{:else}
		<DoppelListe kategorieId={kategorie.id} liste={data.doppel} turnier={data.turnier} {nurLesen} />
	{/if}

	{#if !nurLesen}
		<h2>Kategorie absagen</h2>
		<div class="karte">
			{#if kategorie.anmeldungen > 0}
				<p class="fehler">{absageSperreText(kategorie.anmeldungen)}</p>
			{:else}
				<p>Mitglieder sehen eine abgesagte Kategorie nicht mehr.</p>
				{#if absageFehler}
					<p class="fehler" role="alert">{absageFehler}</p>
				{/if}
				<button type="button" class="taste-neben" onclick={() => rueckfrage?.showModal()}
					>Kategorie absagen</button
				>
			{/if}
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

		<!-- Abbrechen (oder Esc) verwirft die zurückgehaltenen Werte, wie auf der CM-Seite. -->
		<dialog
			class="karte"
			bind:this={warnung}
			aria-labelledby="warnung-titel"
			onclose={() => (ausstehend = null)}
		>
			<h2 id="warnung-titel">Anmeldungen passen nicht mehr</h2>
			<p>{unpassendText(unpassend)}</p>
			<div class="leiste">
				<button type="button" class="taste-neben" onclick={() => warnung?.close()}>Abbrechen</button
				>
				<button
					type="button"
					class="taste-haupt"
					onclick={() => ausstehend && speichern(ausstehend, true)}>Trotzdem speichern</button
				>
			</div>
		</dialog>
	{/if}
{/if}
