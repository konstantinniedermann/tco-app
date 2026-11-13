<script lang="ts">
	import { goto } from '$app/navigation';
	import Zurueck from '../../../lib/ui/Zurueck.svelte';
	import { resolve } from '$app/paths';
	import { sendeAntwort, type AnlassAnsicht, type AntwortArt } from '../../../lib/anlass/api.ts';
	import { ANTWORT_MELDUNG, MAX_BEMERKUNG } from '../../../lib/anlass/antwort.ts';
	import { formatiereBeginn } from '../../../lib/anlass/zeit.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// «Ansicht als …» ist nur ansehen (UI-Leitbild, Baustein Nur lesen): Stand ohne Formular und Tasten.
	const nurAnsehen = $derived(data.ansicht !== null);

	// Nach dem Senden zeigt die Seite die neue Antwort, ohne neu zu laden.
	let anlass = $derived<AnlassAnsicht | null>(data.anlass);
	let bearbeiten = $state(false);
	let wahl = $state<AntwortArt | null>(null);
	let bemerkung = $state('');
	let laeuft = $state(false);
	let fehler = $state<{ feld: 'antwort' | 'bemerkung' | 'formular'; text: string } | null>(null);

	const zeigeFormular = $derived(
		!nurAnsehen && anlass !== null && anlass.offen && (anlass.antwort === null || bearbeiten)
	);
	// Ungespeichert (UI-Leitbild): Die Wahl oder die Bemerkung, die mitgeschickt würde, weicht
	// von der gespeicherten Antwort ab.
	const geaendert = $derived(
		zeigeFormular &&
			(wahl !== (anlass?.antwort ?? null) ||
				(wahl === 'kommt-nicht' && bemerkung !== (anlass?.bemerkung ?? '')))
	);

	function aendern() {
		if (!anlass) return;
		wahl = anlass.antwort;
		bemerkung = anlass.bemerkung ?? '';
		fehler = null;
		bearbeiten = true;
	}

	// FR-32: Die bisherige Antwort gilt auch nach der Änderung; erneut senden hebt «zu prüfen» auf.
	async function bestaetige() {
		if (!anlass?.antwort) return;
		wahl = anlass.antwort;
		bemerkung = anlass.bemerkung ?? '';
		await senden();
	}

	async function senden() {
		if (!anlass || laeuft) return;
		if (wahl === null) {
			fehler = { feld: 'antwort', text: ANTWORT_MELDUNG.antwort };
			return;
		}
		laeuft = true;
		fehler = null;
		const r = await sendeAntwort(anlass.id, {
			antwort: wahl,
			bemerkung: wahl === 'kommt-nicht' ? bemerkung : null
		});
		laeuft = false;
		switch (r.art) {
			case 'ok':
				anlass = r.daten;
				bearbeiten = false;
				return;
			case 'abgemeldet':
				await goto(resolve('/login'));
				return;
			case 'nicht-gefunden':
				anlass = null;
				return;
			case 'geschlossen':
				// Inzwischen abgelaufen: Die Seite zeigt den Stand ohne Formular und ohne Prüf-Hinweis.
				anlass = { ...anlass, offen: false, zuPruefen: false };
				bearbeiten = false;
				fehler = { feld: 'formular', text: 'Die Anmeldung ist geschlossen.' };
				return;
			case 'eingabe':
				fehler =
					r.feld === 'bemerkung'
						? { feld: 'bemerkung', text: ANTWORT_MELDUNG.bemerkung }
						: { feld: 'antwort', text: ANTWORT_MELDUNG.antwort };
				return;
			default:
				fehler = {
					feld: 'formular',
					text: 'Die Antwort liess sich gerade nicht senden. Bitte versuche es später nochmals.'
				};
		}
	}
</script>

<svelte:head>
	<title>{anlass ? `${anlass.titel} – MyTCO` : 'Anlass – MyTCO'}</title>
</svelte:head>

{#if !anlass}
	<Zurueck />
	<div class="karte">
		<h1>Anlass nicht gefunden</h1>
		<p>Diesen Anlass gibt es nicht mehr.</p>
	</div>
{:else}
	<Zurueck />
	<h1>{anlass.titel}</h1>

	<section class="karte" aria-labelledby="einladung">
		<h2 id="einladung">Einladung</h2>
		<p><strong>{formatiereBeginn(anlass.beginn)}</strong><br />{anlass.ort}</p>
		{#if anlass.einladung}
			<p class="mehrzeilig">{anlass.einladung}</p>
		{/if}
		<a class="taste-neben" href={anlass.kalender} rel="external">In den Kalender</a>
	</section>

	{#if anlass.zuPruefen && !bearbeiten}
		<div class="hinweis" role="status">
			<strong>Datum oder Ort geändert, bitte prüfe deine Antwort</strong>
			{#if anlass.offen && !nurAnsehen}
				<p>
					<button type="button" class="taste-neben" onclick={bestaetige} disabled={laeuft}
						>Antwort stimmt so</button
					>
					<button type="button" class="taste-neben" onclick={aendern}>Antwort ändern</button>
				</p>
			{/if}
		</div>
	{/if}

	{#if zeigeFormular}
		<section class="karte" aria-labelledby="kommst" data-ungespeichert={geaendert ? '' : undefined}>
			<h2 id="kommst">Kommst du?</h2>
			<fieldset
				class="auswahl-gruppe"
				aria-describedby={fehler?.feld === 'antwort' ? 'fehler-antwort' : undefined}
			>
				<legend class="leise">Deine Antwort</legend>
				<label class="auswahl">
					<input type="radio" name="antwort" value="kommt" bind:group={wahl} />Ich komme
				</label>
				<label class="auswahl">
					<input type="radio" name="antwort" value="kommt-nicht" bind:group={wahl} />Ich komme nicht
				</label>
			</fieldset>
			{#if fehler?.feld === 'antwort'}
				<p class="fehler" id="fehler-antwort" role="alert">{fehler.text}</p>
			{/if}
			{#if wahl === 'kommt-nicht'}
				<div class="feld">
					<label for="bemerkung">Bemerkung (freiwillig)</label>
					<span class="feld-hilfe" id="bemerkung-hilfe"
						>Ein Grund ist nicht nötig, bitte keine Angaben zur Gesundheit. Die Bemerkung sehen nur
						du, die Mitgliederverwaltung und wer MyTCO technisch betreut.</span
					>
					<textarea
						id="bemerkung"
						rows="3"
						maxlength={MAX_BEMERKUNG}
						bind:value={bemerkung}
						aria-describedby={fehler?.feld === 'bemerkung'
							? 'bemerkung-hilfe fehler-bemerkung'
							: 'bemerkung-hilfe'}></textarea>
					{#if fehler?.feld === 'bemerkung'}
						<p class="fehler" id="fehler-bemerkung" role="alert">{fehler.text}</p>
					{/if}
				</div>
			{/if}
			<button type="button" class="taste-haupt taste-breit" onclick={senden} disabled={laeuft}
				>Antwort senden</button
			>
		</section>
	{:else if anlass.antwort}
		<section class="karte" aria-labelledby="antwort">
			<h2 id="antwort">Deine Antwort</h2>
			<p>
				{#if anlass.antwort === 'kommt'}
					<span class="plakette plakette-ok">Du kommst</span>
				{:else}
					<span class="plakette plakette-offen">Du kommst nicht</span>
				{/if}
			</p>
			{#if anlass.bemerkung}
				<p class="mehrzeilig">{anlass.bemerkung}</p>
			{/if}
			{#if anlass.offen && !anlass.zuPruefen && !nurAnsehen}
				<button type="button" class="taste-neben" onclick={aendern}>Antwort ändern</button>
			{:else if !anlass.offen}
				<p class="leise">Die Anmeldung ist geschlossen.</p>
			{/if}
		</section>
	{:else if anlass.offen}
		<section class="karte" aria-labelledby="kommst">
			<h2 id="kommst">Kommst du?</h2>
			<p class="leise">Noch keine Antwort.</p>
		</section>
	{:else}
		<section class="karte" aria-labelledby="geschlossen">
			<h2 id="geschlossen">Anmeldung geschlossen</h2>
			<p class="leise">Für diesen Anlass kannst du dich nicht mehr an- oder abmelden.</p>
		</section>
	{/if}

	<!-- Auch ohne sichtbares Formular, z. B. nach «Antwort stimmt so». -->
	{#if fehler?.feld === 'formular'}
		<p class="fehler" role="alert">{fehler.text}</p>
	{/if}
{/if}
