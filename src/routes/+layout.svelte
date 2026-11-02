<script lang="ts">
	import '../lib/design/tokens.css';
	import '../lib/design/basis.css';
	import { asset } from '$app/paths';
	import { APP_VERSION } from '../lib/version';

	let { children } = $props();
</script>

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
