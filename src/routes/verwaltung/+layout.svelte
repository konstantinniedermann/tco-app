<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { schliesstNurTastatur } from '../../lib/ui/tastatur.ts';
	import { BEREICHE } from '../../lib/verwaltung/bereiche.ts';
	import { ROLLEN_NAME } from '../../lib/verwaltung/rollen-namen.ts';
	import { nurAnsehen, startziel } from '../../lib/verwaltung/umleiten.ts';

	let { children, data } = $props();
	const aktuell = (pfad: string) => (page.route.id?.startsWith(pfad) ? 'page' : undefined);
	// Hinweis «Nur ansehen» (UI-Leitbild): die Rolle liest den Bereich dieser Seite, schreibt aber nicht.
	const nurLesend = $derived(nurAnsehen(page.url.pathname, data.rollen, data.ansicht !== null));
	const schreibtHier = $derived(
		nurLesend === null ? null : ROLLEN_NAME[BEREICHE[nurLesend].schreiben[0]]
	);
</script>

<svelte:head>
	<title>Verwaltung – MyTCO</title>
</svelte:head>

<div class="verwaltung">
	<nav class="seitenleiste" aria-label="Verwaltung">
		<div class="kopf">
			<a
				class="kopf-start"
				href={resolve(startziel(data.rollen))}
				aria-label="Zur Startseite"
				onclick={schliesstNurTastatur}
				><img class="kopf-wappen" src={asset('wappen.svg')} alt="" /></a
			>MyTCO Verwaltung
		</div>
		{#if data.darfLesen.mitglieder}
			<div class="seitenleiste-bereich">Mitgliederverwaltung</div>
			<a href={resolve('/verwaltung/mitglieder')} aria-current={aktuell('/verwaltung/mitglieder')}
				>Mitglieder</a
			>
			<a href={resolve('/verwaltung/briefe')} aria-current={aktuell('/verwaltung/briefe')}>Briefe</a
			>
			<a href={resolve('/verwaltung/anlaesse')} aria-current={aktuell('/verwaltung/anlaesse')}
				>Anlässe</a
			>
			<a
				href={resolve('/verwaltung/mitteilungen')}
				aria-current={aktuell('/verwaltung/mitteilungen')}>Mitteilungen</a
			>
			<a href={resolve('/verwaltung/fairgate')} aria-current={aktuell('/verwaltung/fairgate')}
				>Für Fairgate{data.fairgateAnzahl === null ? '' : ` (${data.fairgateAnzahl})`}</a
			>
			<a href={resolve('/verwaltung/verlauf')} aria-current={aktuell('/verwaltung/verlauf')}
				>Änderungsverlauf</a
			>
		{/if}
		{#if data.darfLesen.cm}
			<div class="seitenleiste-bereich">Clubmeisterschaft</div>
			<a href={resolve('/verwaltung/turniere')} aria-current={aktuell('/verwaltung/turniere')}
				>Turniere</a
			>
		{/if}
		{#if data.darfLesen.rollen}
			<div class="seitenleiste-bereich">MyTCO</div>
			<a href={resolve('/verwaltung/rollen')} aria-current={aktuell('/verwaltung/rollen')}>Rollen</a
			>
		{/if}
		<div class="seitenleiste-bereich">&nbsp;</div>
		<a href={resolve('/')}>‹ Zur App</a>
	</nav>
	<main class="inhalt">
		{#if schreibtHier}
			<div class="hinweis">
				<p><strong>Nur ansehen.</strong> Ändern kann hier nur der {schreibtHier}.</p>
			</div>
		{/if}
		{@render children()}
	</main>
</div>
