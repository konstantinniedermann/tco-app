<script lang="ts">
	import { resolve } from '$app/paths';
	import { standText } from '../lib/anlass/stand.ts';
	import { formatiereBeginn } from '../lib/anlass/zeit.ts';
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

{#if data.verwaltung}
	<a class="karte kachel" href={resolve('/verwaltung')}>
		<strong>Verwaltung</strong>
		<span class="kachel-pfeil" aria-hidden="true">›</span>
	</a>
{/if}

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

{#if data.anlaesse.length > 0}
	<h2>Jetzt aktuell</h2>
	{#each data.anlaesse as a (a.id)}
		<a class="karte kachel hervor" href={resolve('/anlass/[id]', { id: String(a.id) })}>
			<span>
				<strong>{a.titel}</strong><br />
				<span class="leise">{formatiereBeginn(a.beginn)}<br />{standText(a)}</span>
			</span>
			<span class="kachel-pfeil" aria-hidden="true">›</span>
		</a>
	{/each}
{/if}
