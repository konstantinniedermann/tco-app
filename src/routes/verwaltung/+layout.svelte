<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { siehtMitglieder } from '../../lib/verwaltung/umleiten.ts';

	let { children, data } = $props();
	const aktuell = (pfad: string) => (page.route.id?.startsWith(pfad) ? 'page' : undefined);
	const istAdmin = $derived(siehtMitglieder(data.rollen));
</script>

<svelte:head>
	<title>Verwaltung – MyTCO</title>
</svelte:head>

<div class="verwaltung">
	<nav class="seitenleiste" aria-label="Verwaltung">
		<div class="kopf">
			<img class="kopf-wappen" src={asset('wappen.svg')} alt="" />MyTCO Verwaltung
		</div>
		{#if istAdmin}
			<div class="seitenleiste-bereich">Admin</div>
			<a href={resolve('/verwaltung/mitglieder')} aria-current={aktuell('/verwaltung/mitglieder')}
				>Mitglieder</a
			>
			<a href={resolve('/verwaltung/anlaesse')} aria-current={aktuell('/verwaltung/anlaesse')}
				>Anlässe</a
			>
			<a href={resolve('/verwaltung/fairgate')} aria-current={aktuell('/verwaltung/fairgate')}
				>Für Fairgate{data.fairgateAnzahl === null ? '' : ` (${data.fairgateAnzahl})`}</a
			>
			<a href={resolve('/verwaltung/verlauf')} aria-current={aktuell('/verwaltung/verlauf')}
				>Änderungsverlauf</a
			>
		{/if}
		<div class="seitenleiste-bereich">Clubmeisterschaft</div>
		<a href={resolve('/verwaltung/turniere')} aria-current={aktuell('/verwaltung/turniere')}
			>Turniere</a
		>
		<div class="seitenleiste-bereich">&nbsp;</div>
		<a href={resolve('/')}>‹ Zur App</a>
	</nav>
	<main class="inhalt">
		{@render children()}
	</main>
</div>
