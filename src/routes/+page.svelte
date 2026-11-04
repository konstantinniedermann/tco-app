<script lang="ts">
	import { MELDUNG } from '../lib/login/anmelden.ts';
	import { hinweisErledigt, kannPasskey, richtePasskeyEin } from '../lib/login/passkey.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let erledigt = $state(false);
	const sichtbar = $derived(data.passkeyHinweis && kannPasskey() && !erledigt);
	let laeuft = $state(false);
	let fehler = $state<string | null>(null);

	async function einrichten() {
		if (laeuft) return;
		laeuft = true;
		fehler = null;
		const r = await richtePasskeyEin();
		laeuft = false;
		if (r === 'ok') erledigt = true;
		else if (r === 'vorhanden') {
			// Das Gerät hat schon einen Passkey: Hinweis ist erledigt, wie nach «Nein, danke».
			erledigt = true;
			await hinweisErledigt();
		} else if (r === 'fehler') fehler = MELDUNG.passkeyEinrichten;
	}

	async function neinDanke() {
		erledigt = true;
		await hinweisErledigt();
	}
</script>

<svelte:head>
	<title>MyTCO</title>
</svelte:head>

<h1>Hoi {data.vorname}</h1>

{#if sichtbar}
	<div class="hinweis">
		<strong>Nächstes Mal ohne Code?</strong><br />
		Mit einem Passkey meldest du dich mit Face ID, Fingerabdruck oder der Handy-PIN an. Das empfehlen
		wir: Es ist schneller und sicherer als ein Code.
		<p>
			<button
				type="button"
				class="taste-haupt"
				onclick={einrichten}
				aria-describedby={fehler ? 'passkey-fehler' : undefined}>Passkey einrichten</button
			>
			<button type="button" class="taste-neben" onclick={neinDanke}>Nein, danke</button>
		</p>
		{#if fehler}
			<p class="fehler" id="passkey-fehler" role="alert">{fehler}</p>
		{/if}
	</div>
{/if}
