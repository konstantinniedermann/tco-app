<script lang="ts">
	import '../lib/design/tokens.css';
	import '../lib/design/basis.css';
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import { holeSpeicher, leseMailanfrage } from '../lib/login/mailanfrage.ts';
	import { APP_VERSION } from '../lib/version';

	let { children } = $props();

	// Beim Start der App: abgelaufene oder kaputte Mail-Anfragen aus dem Gerätespeicher löschen.
	onMount(() => {
		leseMailanfrage(holeSpeicher(), Date.now());
	});
</script>

<div class="app">
	<header class="kopf">
		<img class="kopf-wappen" src={asset('wappen.svg')} alt="" />
		MyTCO
	</header>

	<main class="inhalt">
		{@render children()}
	</main>

	<footer class="inhalt leise">
		<p data-testid="version">Version {APP_VERSION}</p>
	</footer>
</div>
