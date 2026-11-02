<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { MELDUNG, meldung, sende } from '../lib/login/anmelden.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let laeuft = $state(false);
	let fehler = $state<string | null>(null);

	// Ohne Antwort des Servers bleibt die Sitzung gültig: dann Meldung statt Login-Seite.
	async function abmelden() {
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		const r = await sende('/api/logout', {});
		laeuft = false;
		if (r.ergebnis === 'ok') await goto(resolve('/login'));
		else fehler = meldung(r, MELDUNG.stoerung);
	}
</script>

<svelte:head>
	<title>MyTCO</title>
</svelte:head>

<h1>Hoi {data.vorname}</h1>
<button
	type="button"
	class="taste-neben"
	onclick={abmelden}
	aria-describedby={fehler ? 'abmelden-fehler' : undefined}>Abmelden</button
>
{#if fehler}
	<p class="fehler" id="abmelden-fehler" role="alert">{fehler}</p>
{/if}
