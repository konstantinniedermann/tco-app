<script lang="ts">
	import { APP_VERSION } from '../lib/version';

	let { children } = $props();
</script>

<main>
	{@render children()}
</main>

<footer>
	<p data-testid="version">Version {APP_VERSION}</p>
</footer>
