<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Spiel } from './api.ts';
	import { datumText, ergebnisText, ortText, plakette } from './anzeige.ts';

	// Baustein Resultatzeile (UI-Leitbild). `mitLiga` (Übersicht): fett die Liga, darunter die
	// Begegnung; Datum und Heim/Auswärts nur bei kommenden Spielen. Sonst (Seite eines Teams): die
	// Begegnung, darunter das Datum; die des eigenen Teams fett und mit Heim/Auswärts. Rechts der
	// Endstand, beim eigenen Team farbig mit Plakette. `teil`: als Kartenteil mit Trennlinie oben.
	// Eine eigene, gespielte Begegnung führt auf ihre Seite (mit Pfeil).
	let {
		spiel: s,
		mitLiga = false,
		teil = false
	}: { spiel: Spiel; mitLiga?: boolean; teil?: boolean } = $props();

	const begegnung = $derived(`${s.heim} – ${s.gast}`);
	const gespielt = $derived(s.heimPunkte !== null && s.gastPunkte !== null);
	const wann = $derived(
		s.eigen ? `${datumText(s.datum, s.zeit)} · ${ortText(s.tcoHeim)}` : datumText(s.datum, s.zeit)
	);
	const ziel = $derived(
		s.eigen && gespielt
			? resolve('/interclub/[id]/[begegnung]', {
					id: String(s.teamId),
					begegnung: String(s.begegnungId)
				})
			: null
	);
</script>

{#snippet inhalt()}
	<div>
		{#if mitLiga}
			<strong>{s.liga}</strong><br />{begegnung}
			{#if !gespielt}
				<br /><span class="leise">{wann}</span>
			{/if}
		{:else}
			{#if s.eigen}
				<strong>{begegnung}</strong>
			{:else}
				<span>{begegnung}</span>
			{/if}
			<br /><span class="leise">{wann}</span>
		{/if}
	</div>
	{#if gespielt}
		<div>
			{#if s.ergebnis}
				<strong class="resultat-stand" data-ergebnis={s.ergebnis}
					>{s.heimPunkte}:{s.gastPunkte}</strong
				>
				<span class={['plakette', plakette(s.ergebnis)]}>{ergebnisText(s.ergebnis)}</span>
			{:else}
				<span class="resultat-stand">{s.heimPunkte}:{s.gastPunkte}</span>
			{/if}
		</div>
	{/if}
{/snippet}

{#if ziel}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- ziel ist schon aufgelöst -->
	<a class={['resultat', { 'karte-teil': teil }]} href={ziel}>
		{@render inhalt()}
		<span class="kachel-pfeil" aria-hidden="true">›</span>
	</a>
{:else}
	<div class={['resultat', { 'karte-teil': teil }]}>
		{@render inhalt()}
	</div>
{/if}
