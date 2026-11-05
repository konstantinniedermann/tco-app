<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';

	let { children, data } = $props();
	const aktuell = (pfad: string) => (page.route.id?.startsWith(pfad) ? 'page' : undefined);
</script>

<svelte:head>
	<title>Verwaltung – MyTCO</title>
</svelte:head>

<div class="verwaltung">
	<nav class="seitenleiste" aria-label="Verwaltung">
		<div class="kopf">
			<img class="kopf-wappen" src={asset('wappen.svg')} alt="" />MyTCO Verwaltung
		</div>
		<div class="seitenleiste-bereich">Admin</div>
		<a href={resolve('/verwaltung/mitglieder')} aria-current={aktuell('/verwaltung/mitglieder')}
			>Mitglieder</a
		>
		<a href={resolve('/verwaltung/fairgate')} aria-current={aktuell('/verwaltung/fairgate')}
			>Für Fairgate{data.fairgateAnzahl === null ? '' : ` (${data.fairgateAnzahl})`}</a
		>
		<a href={resolve('/verwaltung/verlauf')} aria-current={aktuell('/verwaltung/verlauf')}
			>Änderungsverlauf</a
		>
		<div class="seitenleiste-bereich">&nbsp;</div>
		<a href={resolve('/')}>‹ Zur App</a>
	</nav>
	<main class="inhalt">
		{@render children()}
	</main>
</div>
