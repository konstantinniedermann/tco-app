<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { NACHRICHT_MAX, zeitText } from '../../../../../../lib/cm/anzeige.ts';
	import { MELDUNG } from '../../../../../../lib/login/anmelden.ts';
	import { amtlicherName, anredeName } from '../../../../../../lib/name.ts';
	import { sendeAntwort, setzeZustand } from '../../../../../../lib/verwaltung/api.ts';
	import { fehlerText } from '../../../../../../lib/verwaltung/anzeige.ts';
	import Seitenkopf from '../../../../../../lib/verwaltung/Seitenkopf.svelte';
	import { leiteUm } from '../../../../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	// Ein Gespräch mit der Turnierleitung (A-TURNIER-04, FR-50, FR-52). Der MyTCO-Admin liest nur.
	let { data }: PageProps = $props();
	const nurLesen = $derived(!data.darfSchreiben.cm);

	let gespraech = $derived(data.gespraech);
	let text = $state('');
	let laeuft = $state(false);
	let fehler = $state<string | null>(null);
	// Nach «inzwischen» sendet die nächste Antwort trotzdem (FR-52).
	let inzwischen = $state(false);
	let beendet = $state(false);
	let feld = $state<HTMLTextAreaElement>();

	const antworten = $derived(gespraech.antworten && !beendet);
	const name = $derived(amtlicherName(gespraech.mitglied, 'vorname-zuerst'));
	const nameSortiert = $derived(amtlicherName(gespraech.mitglied, 'nachname-zuerst'));
	const turnierHref = $derived(
		resolve('/verwaltung/turniere/[id]', { id: String(gespraech.turnier.id) })
	);
	const nachrichtenHref = $derived(
		resolve('/verwaltung/turniere/[id]/nachrichten', { id: String(gespraech.turnier.id) })
	);

	async function antwortSenden(e: SubmitEvent) {
		e.preventDefault();
		if (laeuft || !antworten) return;
		laeuft = true;
		fehler = null;
		const letzte = gespraech.nachrichten.at(-1);
		const a = await sendeAntwort(gespraech.id, {
			text,
			nachLetzter: letzte?.id ?? 0,
			trotzdem: inzwischen
		});
		laeuft = false;
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			gespraech = a.daten;
			text = '';
			inzwischen = false;
		} else if (a.art === 'inzwischen') {
			gespraech = a.gespraech;
			inzwischen = true;
		} else if (a.art === 'eingabe') {
			fehler = a.felder.text ?? MELDUNG.stoerung;
			await tick();
			feld?.focus();
		} else if (a.art === 'nur-lesen') {
			beendet = true;
			inzwischen = false;
		} else {
			fehler = fehlerText(a);
		}
	}

	async function umschalten() {
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		const a = await setzeZustand(
			gespraech.id,
			gespraech.zustand === 'offen' ? 'erledigt' : 'offen'
		);
		laeuft = false;
		if (await leiteUm(a)) return;
		if (a.art === 'ok') gespraech = a.daten;
		else fehler = fehlerText(a);
	}
</script>

<svelte:head>
	<title>{name} – MyTCO</title>
</svelte:head>

<Seitenkopf
	pfad={{
		stufen: [
			{ text: 'Turniere', href: resolve('/verwaltung/turniere') },
			{ text: gespraech.turnier.name, href: turnierHref },
			{ text: 'Nachrichten', href: nachrichtenHref }
		],
		aktuell: nameSortiert
	}}
>
	<div class="karte-kopf">
		<h1>{name}</h1>
		<span class="plakette {gespraech.zustand === 'offen' ? 'plakette-offen' : 'plakette-ok'}"
			>{gespraech.zustand}</span
		>
	</div>
</Seitenkopf>

<section class="karte" aria-label="Verlauf">
	{#each gespraech.nachrichten as n, i (n.id)}
		<div class:karte-teil={i > 0}>
			<p class="leise">
				{#if n.von === 'mitglied'}
					<strong>{name}</strong>
				{:else}
					<strong>Turnierleitung</strong>
					({n.admin ? amtlicherName(n.admin, 'vorname-zuerst') : 'gelöschtes Konto'})
				{/if}
				· {zeitText(n.gesendetAm)}
			</p>
			<p>{n.text}</p>
		</div>
	{/each}
</section>

{#if !nurLesen}
	<section class="karte" aria-label="Antworten">
		{#if antworten}
			<form onsubmit={antwortSenden} novalidate>
				<div class="feld">
					<label for="antwort">Antwort der Turnierleitung</label>
					<span class="feld-hilfe" id="antwort-hilfe"
						>{anredeName(gespraech.mitglied)} sieht als Absender nur «Turnierleitung».</span
					>
					<textarea
						id="antwort"
						rows="4"
						bind:this={feld}
						bind:value={text}
						maxlength={NACHRICHT_MAX}
						aria-invalid={fehler ? 'true' : undefined}
						aria-describedby={[
							'antwort-hilfe',
							inzwischen ? 'antwort-inzwischen' : null,
							fehler ? 'antwort-fehler' : null
						]
							.filter(Boolean)
							.join(' ')}></textarea>
					{#if inzwischen}
						<p class="fehler" id="antwort-inzwischen" role="alert">
							Inzwischen hat jemand geantwortet. Lies die Antwort, dann sende deine trotzdem oder
							ändere sie.
						</p>
					{/if}
					{#if fehler}
						<p class="fehler" id="antwort-fehler" role="alert">{fehler}</p>
					{/if}
				</div>
				<div class="leiste">
					<button type="submit" class="taste-haupt" disabled={laeuft}>Antworten</button>
					<button type="button" class="taste-neben" disabled={laeuft} onclick={umschalten}
						>{gespraech.zustand === 'offen' ? 'Als erledigt markieren' : 'Wieder öffnen'}</button
					>
				</div>
			</form>
		{:else}
			<p class="leise">Antworten geht nach dem Turnierjahr nicht mehr.</p>
			<div class="leiste">
				<button type="button" class="taste-neben" disabled={laeuft} onclick={umschalten}
					>{gespraech.zustand === 'offen' ? 'Als erledigt markieren' : 'Wieder öffnen'}</button
				>
			</div>
			{#if fehler}
				<p class="fehler" role="alert">{fehler}</p>
			{/if}
		{/if}
	</section>
{/if}
