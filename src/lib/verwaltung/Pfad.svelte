<script lang="ts">
	// Baustein Pfad (UI-Leitbild): über dem Titel einer Unterseite der Verwaltung die Stufen von
	// der Seitenleiste bis hier; die aktuelle Seite fett und ohne Link. Auf schmalem Bildschirm
	// steht statt seiner nur «‹ <Elternseite>». Die Stufen kommen schon aufgelöst (`resolve`).
	let { stufen, aktuell }: { stufen: { text: string; href: string }[]; aktuell: string } = $props();
	const eltern = $derived(stufen.at(-1));
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- die Stufen sind schon aufgelöst -->
<nav class="pfad nicht-drucken" aria-label="Pfad">
	<ol>
		{#each stufen as stufe (stufe.href)}
			<li><a href={stufe.href}>{stufe.text}</a></li>
		{/each}
		<li aria-current="page"><strong>{aktuell}</strong></li>
	</ol>
</nav>
{#if eltern}
	<a class="zurueck pfad-kurz nicht-drucken" href={eltern.href}>‹ {eltern.text}</a>
{/if}
<!-- eslint-enable svelte/no-navigation-without-resolve -->
