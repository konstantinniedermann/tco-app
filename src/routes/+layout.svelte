<script lang="ts">
	import '../lib/design/tokens.css';
	import '../lib/design/basis.css';
	import { onMount } from 'svelte';
	import { afterNavigate, beforeNavigate, disableScrollHandling } from '$app/navigation';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import Reiter from '../lib/ui/Reiter.svelte';
	import {
		istReiterSeite,
		stellStandWiederHer,
		vergisstStand,
		zeigtFusszeile
	} from '../lib/ui/navigation.ts';
	import { holeSpeicher, leseMailanfrage } from '../lib/login/mailanfrage.ts';
	import { APP_VERSION } from '../lib/version';

	let { children } = $props();
	const mitReiter = $derived(istReiterSeite(page.route.id));
	// Fusszeile nur vor dem Login und auf der Startseite (UI-Leitbild, Baustein Fusszeile).
	const mitFusszeile = $derived(zeigtFusszeile(page.route.id, page.error !== null));
	// Die Verwaltung bringt Seitenleiste und Inhalt selbst mit (eigenes Layout). Die Fehlerseite
	// steht ausserhalb dieses Layouts und bekommt darum auch dort den Rahmen hier.
	const verwaltung = $derived(
		(page.route.id?.startsWith('/verwaltung') ?? false) && page.error === null
	);

	// Jeder Reiter merkt sich die Scrollposition, solange die App offen ist (UI-Leitbild,
	// Bewegung und Bedienung); auf dem Weg zum Login (Abmelden) geht sie verloren.
	// Nur ein Speicher, nicht reaktiv: Nichts in der Anzeige hängt davon ab.
	let stand: Record<string, number> = {};
	beforeNavigate(({ from, to }) => {
		const von = from?.route.id ?? null;
		if (von !== null && istReiterSeite(von)) stand[von] = window.scrollY;
		if (vergisstStand(to?.route.id ?? null)) stand = {};
	});
	afterNavigate(({ to, type }) => {
		const nach = to?.route.id ?? null;
		const wert = nach === null ? undefined : stand[nach];
		if (!stellStandWiederHer(nach, type) || wert === undefined) return;
		disableScrollHandling();
		window.scrollTo(0, wert);
	});

	// Beim Start der App: abgelaufene oder kaputte Mail-Anfragen aus dem Gerätespeicher löschen.
	onMount(() => {
		leseMailanfrage(holeSpeicher(), Date.now());
	});
</script>

<div class={['statusleiste', { 'statusleiste-verwaltung': verwaltung }]}></div>

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

		{#if mitFusszeile}
			<footer class="inhalt leise">
				<p>
					<a href={resolve('/hilfe')}>Hilfe</a>
					·
					<a href={resolve('/datenschutz')}>Datenschutz</a>
					· <span data-testid="version">Version {APP_VERSION}</span>
				</p>
			</footer>
		{/if}

		{#if mitReiter}
			<Reiter />
		{/if}
	{/if}
</div>
