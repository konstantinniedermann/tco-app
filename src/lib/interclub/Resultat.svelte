<script lang="ts">
	import type { Spiel } from './api.ts';
	import { datumText, ergebnisText, ortText, plakette } from './anzeige.ts';

	// Baustein Resultatzeile (UI-Leitbild). `mitLiga` (Übersicht): fett die Liga, darunter die
	// Begegnung; Datum und Heim/Auswärts nur bei kommenden Spielen. Sonst (Seite eines Teams): die
	// Begegnung, darunter das Datum; die des eigenen Teams fett und mit Heim/Auswärts. Rechts der
	// Endstand, beim eigenen Team farbig mit Plakette. `teil`: als Kartenteil mit Trennlinie oben.
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
</script>

<div class={['resultat', { 'karte-teil': teil }]}>
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
</div>
