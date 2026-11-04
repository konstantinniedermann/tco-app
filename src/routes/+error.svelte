<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { fehlerseite } from '../lib/ui/fehlerseite.ts';

	// Steht im Rahmen des Wurzel-Layouts (Kopfleiste, Inhalt), auch unter /verwaltung.
	const f = $derived(fehlerseite(page.status, page.error?.message, page.url.pathname));
</script>

<svelte:head>
	<title>{f.titel} – MyTCO</title>
</svelte:head>

<a class="zurueck" href={resolve(f.zurueck.pfad)}>‹ {f.zurueck.text}</a>
<div class="karte">
	<h1>{f.titel}</h1>
	<p role="alert">{f.text}</p>
</div>
