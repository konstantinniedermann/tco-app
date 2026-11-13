<script lang="ts">
	// Druckansicht frisch erzeugter Briefe (UI-Leitbild, Briefdruck). Die Codes stehen nur hier
	// (RR-04): Die Seite gibt sie nicht weiter, «‹ Zurück» verwirft sie über `zurueck`.
	import '../design/brief.css';
	import type { AusgestellterBrief } from './mitglieder-api.ts';

	let { briefe, zurueck }: { briefe: AusgestellterBrief[]; zurueck: () => void } = $props();
</script>

<div class="leiste nicht-drucken">
	<!-- Beim Erscheinen bekommt «‹ Zurück» den Fokus: Die Taste, die die Ansicht geöffnet hat, ist weg. -->
	<button type="button" class="taste-neben" onclick={zurueck} {@attach (t) => t.focus()}
		>‹ Zurück</button
	>
	<button type="button" class="taste-neben" onclick={() => window.print()}
		>Drucken oder als PDF speichern</button
	>
</div>
<p class="leise nicht-drucken">
	Die Codes stehen nur hier. Drucke jetzt oder speichere als PDF. Ein gespeichertes PDF löschst du
	nach dem Druck.
</p>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="briefdruck" role="region" aria-label="Briefe zum Drucken" tabindex="0">
	{#each briefe as b (b.mitgliedId)}
		<!-- Vom Server maskiert (baueBriefInhalt), ohne Stil im HTML (CSP). -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html b.html}
	{/each}
</div>
