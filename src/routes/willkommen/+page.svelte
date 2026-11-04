<script lang="ts">
	import { resolve } from '$app/paths';
	import { installation, installiere } from '../../lib/hilfe/installation.svelte.ts';
	import Anleitung from '../../lib/ui/Anleitung.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let ergebnis = $state<'offen' | 'angenommen' | 'abgelehnt'>('offen');
	const fertig = $derived(ergebnis === 'angenommen' || installation.installiert);
	const menueZeigen = $derived(
		data.geraet === 'android' && !fertig && (installation.angebot || ergebnis === 'abgelehnt')
	);

	async function installieren() {
		const r = await installiere();
		if (r !== 'nicht-moeglich') ergebnis = r;
	}
</script>

<svelte:head>
	<title>Willkommen – MyTCO</title>
</svelte:head>

<h1>Willkommen bei MyTCO</h1>

<div class="karte">
	<h2>Zuerst auf den Startbildschirm</h2>
	<p>Dann öffnest du MyTCO mit einem Tipp, wie eine App. Erst danach meldest du dich an.</p>
	{#if data.geraet === 'iphone'}
		{#if data.andererBrowser}
			<p><strong>Öffne diese Seite zuerst in Safari.</strong></p>
		{/if}
		<Anleitung geraet="iphone" />
	{:else if fertig}
		<p>
			<strong>Fertig!</strong> Verlass jetzt den Browser und starte MyTCO über das neue Symbol auf deinem
			Startbildschirm.
		</p>
	{:else if installation.angebot}
		<button type="button" class="taste-haupt taste-breit" onclick={installieren}
			>MyTCO installieren</button
		>
		<p class="leise">
			Android fragt nach. Tippe dort auf «Installieren», dann öffne MyTCO über das neue Symbol.
		</p>
	{:else if ergebnis !== 'abgelehnt'}
		<Anleitung geraet="android" />
	{/if}
</div>

{#if menueZeigen}
	<details class="karte klappe" open={ergebnis === 'abgelehnt'}>
		<summary class="klappe-titel">Klappt nicht? Über das Menü</summary>
		<Anleitung geraet="android" />
	</details>
{/if}

<p><a href={resolve('/login')}>Ohne Startbildschirm weiter</a></p>
