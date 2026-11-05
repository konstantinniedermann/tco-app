<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { formatiereBeginn, formatiereZeitpunkt } from '../../../../lib/anlass/zeit.ts';
	import { MELDUNG } from '../../../../lib/login/anmelden.ts';
	import Anlassformular, {
		type AnlassWerte
	} from '../../../../lib/verwaltung/Anlassformular.svelte';
	import {
		aendereAnlass,
		ladeAnlassAdmin,
		loescheAnlass,
		type AnlassDetail,
		type AnlassFeld
	} from '../../../../lib/verwaltung/api.ts';
	import { leiteUm } from '../../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Nach dem Speichern lädt die Seite den neuen Stand, ohne neu zu navigieren.
	let detail = $derived<AnlassDetail>(data.detail);
	let schluessel = $state(0);
	let fehler = $state<Partial<Record<AnlassFeld, string>>>({});
	let allgemein = $state<string | null>(null);
	let rueckmeldung = $state<string | null>(null);
	let laeuft = $state(false);
	let rueckfrage = $state<HTMLDialogElement>();

	const start = $derived<AnlassWerte>({
		titel: detail.titel,
		beginn: detail.beginnLokal,
		ort: detail.ort,
		anmeldeschluss: detail.schlussLokal,
		einladung: detail.einladung
	});

	async function speichern(werte: AnlassWerte) {
		if (laeuft) return;
		laeuft = true;
		fehler = {};
		allgemein = null;
		rueckmeldung = null;
		const a = await aendereAnlass(detail.id, werte);
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			const neu = await ladeAnlassAdmin(detail.id);
			if (neu.art === 'ok') {
				detail = neu.daten;
				schluessel++;
			}
			rueckmeldung = 'Gespeichert';
		} else if (a.art === 'eingabe') {
			fehler = a.felder;
		} else if (a.art === 'nicht-gefunden') {
			allgemein = 'Diesen Anlass gibt es nicht mehr.';
		} else {
			allgemein = MELDUNG.stoerung;
		}
		laeuft = false;
	}

	async function loeschen() {
		if (laeuft) return;
		laeuft = true;
		const a = await loescheAnlass(detail.id);
		rueckfrage?.close();
		laeuft = false;
		if (await leiteUm(a)) return;
		if (a.art === 'ok' || a.art === 'nicht-gefunden') {
			await goto(resolve('/verwaltung/anlaesse'));
		} else {
			allgemein = MELDUNG.stoerung;
		}
	}
</script>

<svelte:head>
	<title>{detail.titel} – MyTCO</title>
</svelte:head>

<a class="zurueck" href={resolve('/verwaltung/anlaesse')}>‹ Zurück</a>
<h1>{detail.titel}</h1>
<p class="leise">{formatiereBeginn(detail.beginn)} · {detail.ort}</p>

<div class="kennzahlen">
	<div class="kennzahl">
		<strong>{detail.zahlen.kommen}</strong><span class="leise">kommen</span>
	</div>
	<div class="kennzahl">
		<strong>{detail.zahlen.kommenNicht}</strong><span class="leise">kommen nicht</span>
	</div>
	<div class="kennzahl">
		<strong>{detail.zahlen.keineAntwort}</strong><span class="leise">noch keine Antwort</span>
	</div>
</div>

<h2>Antworten</h2>
{#if detail.anmeldungen.length === 0}
	<p>Noch keine Antworten.</p>
{:else}
	<!-- Ohne Links in der Tabelle: der Bereich selbst ist per Tastatur scrollbar (WCAG 2.1.1). -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="tabelle" role="region" aria-label="Antworten" tabindex="0">
		<table>
			<thead>
				<tr><th>Name</th><th>Antwort</th><th>Bemerkung</th><th>Geändert</th></tr>
			</thead>
			<tbody>
				{#each detail.anmeldungen as z, i (i)}
					<tr>
						<td>{z.name}</td>
						<td>
							{#if z.antwort === 'kommt'}
								<span class="plakette plakette-ok">kommt</span>
							{:else}
								<span class="plakette plakette-offen">kommt nicht</span>
							{/if}
						</td>
						<td>{z.bemerkung ?? ''}</td>
						<td>{formatiereZeitpunkt(z.geaendertAm)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<h2>Angaben</h2>
<div class="karte">
	{#key schluessel}
		<Anlassformular
			{start}
			{fehler}
			knopf="Angaben speichern"
			nurBeiAenderung
			{rueckmeldung}
			onspeichern={speichern}
		/>
	{/key}
	{#if allgemein}
		<p class="fehler" role="alert">{allgemein}</p>
	{/if}
</div>

<button type="button" class="taste-neben" onclick={() => rueckfrage?.showModal()}
	>Anlass löschen</button
>

<dialog class="karte" bind:this={rueckfrage} aria-labelledby="loeschen-titel">
	<h2 id="loeschen-titel">Anlass löschen?</h2>
	<p>Alle Antworten zu diesem Anlass werden mit gelöscht.</p>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => rueckfrage?.close()}>Abbrechen</button>
		<button type="button" class="taste-haupt" onclick={loeschen}>Löschen</button>
	</div>
</dialog>
