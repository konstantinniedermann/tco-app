<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { beobachteKopftitel } from '../../lib/ui/kopftitel.ts';
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

	// Titel in der Kopfleiste (src/lib/ui/kopftitel.ts), nur unter 60rem zu sehen (basis.css):
	// Hier scrollt das Dokument, die Kopfleiste klebt oben. `oben` ist ihre Unterkante im
	// geklebten Zustand (Abstand oben plus Höhe). Der Text bleibt beim Ausblenden stehen.
	let kopf = $state<HTMLElement>();
	let inhalt = $state<HTMLElement>();
	let kopftitel = $state('');
	let zeigeTitel = $state(false);
	$effect(() => {
		if (!kopf || !inhalt) return;
		const leiste = kopf;
		return beobachteKopftitel({
			inhalt,
			wurzel: null,
			oben: () => (parseFloat(getComputedStyle(leiste).top) || 0) + leiste.offsetHeight,
			melde: (titel) => {
				zeigeTitel = titel !== null;
				if (titel !== null) kopftitel = titel;
			}
		});
	});
</script>

<svelte:head>
	<title>Verwaltung – MyTCO</title>
</svelte:head>

<div class="verwaltung">
	<div class="verwaltung-leiste">
		<header class="kopf" bind:this={kopf}>
			<span class="kopf-marke">
				<a
					class="kopf-start"
					href={resolve(startziel(data.rollen))}
					aria-label="Zur Startseite"
					onclick={schliesstNurTastatur}
					><img class="kopf-wappen" src={asset('wappen.svg')} alt="" /></a
				>
				MyTCO
				<span class="kopf-zusatz">Verwaltung</span>
				<span class="kopf-titel" aria-hidden="true" data-sichtbar={zeigeTitel ? '' : undefined}
					>{kopftitel}</span
				>
			</span>
		</header>
		<nav class="seitenleiste" aria-label="Verwaltung">
			{#if data.darfLesen.mitglieder}
				<div class="seitenleiste-bereich">Mitgliederverwaltung</div>
				<a href={resolve('/verwaltung/mitglieder')} aria-current={aktuell('/verwaltung/mitglieder')}
					>Mitglieder</a
				>
				<a href={resolve('/verwaltung/einlesen')} aria-current={aktuell('/verwaltung/einlesen')}
					>Einlesen</a
				>
				<a href={resolve('/verwaltung/briefe')} aria-current={aktuell('/verwaltung/briefe')}
					>Briefe</a
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
				<a href={resolve('/verwaltung/rollen')} aria-current={aktuell('/verwaltung/rollen')}
					>Rollen</a
				>
			{/if}
			<div class="seitenleiste-bereich">&nbsp;</div>
			<a href={resolve('/')}>‹ Zur App</a>
		</nav>
	</div>
	<main class="inhalt" bind:this={inhalt}>
		{#if schreibtHier}
			<div class="hinweis">
				<p><strong>Nur ansehen.</strong> Ändern kann hier nur der {schreibtHier}.</p>
			</div>
		{/if}
		{@render children()}
	</main>
</div>
