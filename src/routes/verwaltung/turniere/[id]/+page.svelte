<script lang="ts">
	import { resolve } from '$app/paths';
	import Turnierformular, {
		werteAusTurnier,
		type TurnierWerte
	} from '../../../../lib/verwaltung/Turnierformular.svelte';
	import {
		aendereTurnier,
		ladeTurnier,
		setzeTurnierStatus,
		type TurnierAnsicht,
		type TurnierFeld
	} from '../../../../lib/verwaltung/api.ts';
	import {
		datumLang,
		geschlechtText,
		jahrgangText,
		klassierungText,
		statusText
	} from '../../../../lib/verwaltung/turnier-anzeige.ts';
	import { fehlerText } from '../../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// Regel 3: Der MyTCO-Admin liest die Clubmeisterschaft, ändern kann sie nur der CM-Admin.
	const nurLesen = $derived(!data.darfSchreiben.cm);

	// Nach dem Speichern und nach jedem Statuswechsel lädt die Seite den neuen Stand, ohne neu zu navigieren.
	let detail = $derived<TurnierAnsicht>(data.detail);
	let schluessel = $state(0);
	let fehler = $state<Partial<Record<TurnierFeld, string>>>({});
	let allgemein = $state<string | null>(null);
	let rueckmeldung = $state<string | null>(null);
	let statusMeldung = $state<string | null>(null);
	let laeuft = $state(false);

	const ART = { einzel: 'Einzel', doppel: 'Doppel' } as const;
	const start = $derived<TurnierWerte>(werteAusTurnier(detail));
	const status = $derived(statusText(detail.status));
	const aktive = $derived(detail.kategorien.filter((k) => k.status === 'aktiv').length);
	const schluss = $derived(datumLang(detail.anmeldeschluss));
	// Ohne Link in der Tabelle (alle Kategorien abgesagt) muss der Bereich selbst per Tastatur scrollbar sein.
	const ohneLinks = $derived(aktive === 0);

	const STATUS_MELDUNG = {
		'keine-kategorie': 'Lege zuerst mindestens eine Kategorie an.',
		'schluss-vorbei':
			'Der Anmeldeschluss ist vorbei. Verschiebe ihn unten bei den Angaben; ist die Anmeldung danach noch geschlossen, öffne sie wieder.',
		unzulaessig: 'Die Anmeldung hat sich inzwischen geändert. Hier steht jetzt der neue Stand.',
		'nicht-gefunden': 'Dieses Turnier gibt es nicht mehr.'
	} as const;

	async function neuLaden() {
		const neu = await ladeTurnier(detail.id);
		if (neu.art === 'ok') detail = neu.daten;
		return neu.art === 'ok';
	}

	async function setzeStatus(ziel: 'offen' | 'geschlossen') {
		if (laeuft) return;
		laeuft = true;
		statusMeldung = null;
		const a = await setzeTurnierStatus(detail.id, ziel);
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			await neuLaden();
		} else if (
			a.art === 'keine-kategorie' ||
			a.art === 'schluss-vorbei' ||
			a.art === 'unzulaessig' ||
			a.art === 'nicht-gefunden'
		) {
			statusMeldung = STATUS_MELDUNG[a.art];
			if (a.art === 'unzulaessig') await neuLaden();
		} else {
			statusMeldung = fehlerText(a);
		}
		laeuft = false;
	}

	async function speichern(werte: TurnierWerte) {
		if (laeuft) return;
		laeuft = true;
		fehler = {};
		allgemein = null;
		rueckmeldung = null;
		const a = await aendereTurnier(detail.id, werte);
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			if (await neuLaden()) schluessel++;
			rueckmeldung = 'Gespeichert';
			statusMeldung = null;
		} else if (a.art === 'eingabe') {
			fehler = a.felder;
		} else if (a.art === 'vergeben') {
			fehler = { jahr: 'Für dieses Jahr gibt es schon ein Turnier.' };
		} else if (a.art === 'nicht-gefunden') {
			allgemein = 'Dieses Turnier gibt es nicht mehr.';
		} else {
			allgemein = fehlerText(a);
		}
		laeuft = false;
	}
</script>

<svelte:head>
	<title>{detail.name} – MyTCO</title>
</svelte:head>

<a class="zurueck" href={resolve('/verwaltung/turniere')}>‹ Zurück</a>
<h1>{detail.name}</h1>
<p class="leise">
	Anmeldeschluss {schluss} · {aktive}
	{aktive === 1 ? 'Kategorie' : 'Kategorien'}
</p>

<h2>Anmeldung</h2>
<div class="karte">
	<p><span class="plakette {status.klasse}">{status.text}</span></p>
	{#if nurLesen}
		<p>
			{#if detail.status === 'vorbereitung'}Mitglieder sehen das Turnier noch nicht.
			{:else if detail.status === 'offen'}Mitglieder melden sich bis {schluss} an.
			{:else}Mitglieder sehen ihre Anmeldungen, können aber nichts mehr ändern.{/if}
		</p>
	{:else if detail.status === 'vorbereitung'}
		<p>
			Mitglieder sehen das Turnier noch nicht. Prüfe Angaben und Kategorien, dann öffne die
			Anmeldung.
		</p>
		<button
			type="button"
			class="taste-haupt"
			aria-describedby={statusMeldung ? 'status-meldung' : undefined}
			onclick={() => setzeStatus('offen')}>Anmeldung öffnen</button
		>
	{:else if detail.status === 'offen'}
		<p>
			Mitglieder melden sich bis {schluss} an. Am Ende dieses Tages schliesst die Anmeldung von selbst.
		</p>
		<button
			type="button"
			class="taste-neben"
			aria-describedby={statusMeldung ? 'status-meldung' : undefined}
			onclick={() => setzeStatus('geschlossen')}>Anmeldung jetzt schliessen</button
		>
	{:else}
		{#if detail.gespeicherterStatus === 'geschlossen'}
			<p>
				Du hast die Anmeldung vor dem Anmeldeschluss geschlossen. Mitglieder sehen ihre Anmeldungen,
				können aber nichts mehr ändern.
			</p>
		{:else}
			<p>Der Anmeldeschluss ist vorbei.</p>
		{/if}
		<button
			type="button"
			class="taste-neben"
			aria-describedby={statusMeldung ? 'status-meldung' : undefined}
			onclick={() => setzeStatus('offen')}>Wieder öffnen</button
		>
		<p class="leise">
			Wieder öffnen geht bis zum Anmeldeschluss. Danach zuerst unten den Anmeldeschluss verschieben.
		</p>
	{/if}
	{#if statusMeldung}
		<p class="fehler" id="status-meldung" role="alert">{statusMeldung}</p>
	{/if}
</div>

<h2>Kategorien</h2>
{#if !nurLesen}
	<div class="leiste">
		<a
			class="taste-neben"
			href={resolve('/verwaltung/turniere/[id]/kategorien/neu', { id: String(detail.id) })}
			>Neue Kategorie</a
		>
	</div>
{/if}
{#if detail.kategorien.length === 0}
	<p>Noch keine Kategorien.</p>
{:else}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="tabelle"
		role={ohneLinks ? 'region' : undefined}
		aria-label={ohneLinks ? 'Kategorien' : undefined}
		tabindex={ohneLinks ? 0 : undefined}
	>
		<table>
			<thead>
				<tr>
					<th>Kategorie</th><th>Art</th><th>Geschlecht</th><th>Jahrgang</th><th>Klassierung</th>
				</tr>
			</thead>
			<tbody>
				{#each detail.kategorien as k (k.id)}
					<tr>
						<td>
							{#if k.status === 'abgesagt'}
								{k.name} <span class="plakette plakette-gesperrt">abgesagt</span>
							{:else}
								<a
									href={resolve('/verwaltung/turniere/[id]/kategorien/[kid]', {
										id: String(detail.id),
										kid: String(k.id)
									})}>{k.name}</a
								>
							{/if}
						</td>
						<td>{ART[k.art]}</td>
						<td>{geschlechtText(k.geschlecht)}</td>
						<td>{jahrgangText(k.jahrgangVon, k.jahrgangBis)}</td>
						<td>{klassierungText(k)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<h2>Angaben</h2>
<div class="karte">
	{#key schluessel}
		<Turnierformular
			{start}
			{fehler}
			knopf="Angaben speichern"
			knopfArt="taste-neben"
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
