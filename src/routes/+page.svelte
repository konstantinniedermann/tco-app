<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { sende } from '../lib/login/anmelden.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let laeuft = $state(false);

	// Auch ohne Antwort des Servers geht dieses Gerät zur Login-Seite; der nächste Aufruf
	// prüft die Sitzung ohnehin neu.
	async function abmelden() {
		laeuft = true;
		await sende('/api/logout', {});
		await goto(resolve('/login'));
	}
</script>

<svelte:head>
	<title>MyTCO</title>
</svelte:head>

<h1>Hoi {data.vorname}</h1>
<button type="button" class="taste-neben" onclick={abmelden} disabled={laeuft}>Abmelden</button>
