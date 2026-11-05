<script lang="ts">
	import '../lib/design/tokens.css';
	import '../lib/design/basis.css';
	import { onMount } from 'svelte';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import Reiter from '../lib/ui/Reiter.svelte';
	import { holeSpeicher, leseMailanfrage } from '../lib/login/mailanfrage.ts';
	import { APP_VERSION } from '../lib/version';

	let { children } = $props();
	const mitReiter = $derived(page.route.id === '/' || page.route.id === '/profil');
	// Die Verwaltung bringt Seitenleiste und Inhalt selbst mit (eigenes Layout). Die Fehlerseite
	// steht ausserhalb dieses Layouts und bekommt darum auch dort den Rahmen hier.
	const verwaltung = $derived(
		(page.route.id?.startsWith('/verwaltung') ?? false) && page.error === null
	);

	// Beim Start der App: abgelaufene oder kaputte Mail-Anfragen aus dem Gerätespeicher löschen.
	onMount(() => {
		leseMailanfrage(holeSpeicher(), Date.now());
	});
</script>

<div class="statusleiste"></div>

<div class="app">
	{#if verwaltung}
		{@render children()}
	{:else}
		<header class="kopf">
			<img class="kopf-wappen" src={asset('wappen.svg')} alt="" />
			MyTCO
		</header>

		<main class="inhalt">
			{@render children()}
		</main>

		<footer class="inhalt leise">
			<p>
				<a href={resolve('/hilfe')} aria-current={page.route.id === '/hilfe' ? 'page' : undefined}
					>Hilfe</a
				>
				·
				<a
					href={resolve('/datenschutz')}
					aria-current={page.route.id === '/datenschutz' ? 'page' : undefined}>Datenschutz</a
				>
				· <span data-testid="version">Version {APP_VERSION}</span>
			</p>
		</footer>

		{#if mitReiter}
			<Reiter />
		{/if}
	{/if}
</div>
