<script lang="ts">
	import type { Snippet } from 'svelte';

	// Baustein Seiteninfo (UI-Leitbild): wozu eine Seite der Verwaltung da ist, direkt unter dem
	// Seitenkopf. Der Text kommt als Kinder (Absätze, fett, Verweise).
	let { children }: { children: Snippet } = $props();
</script>

<div class="seiteninfo" role="note" aria-label="Über diese Seite">
	<svg class="symbol seiteninfo-symbol" viewBox="0 0 24 24" aria-hidden="true"
		><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg
	>
	<div>{@render children()}</div>
</div>
