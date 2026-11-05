<script lang="ts">
	import '../lib/design/tokens.css';
	import '../lib/design/basis.css';
	import { onMount } from 'svelte';
	import {
		afterNavigate,
		beforeNavigate,
		disableScrollHandling,
		onNavigate
	} from '$app/navigation';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import Reiter from '../lib/ui/Reiter.svelte';
	import { klappeWeich } from '../lib/ui/klappe.ts';
	import {
		istReiterSeite,
		stellStandWiederHer,
		uebergang,
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

	// Seitenwechsel mit View Transitions (UI-09): Die Bewegung steht in basis.css und hängt am
	// Attribut data-uebergang. Die Callback-Form, weil Safari vor 18.2 keine `types` kennt.
	// Ohne Unterstützung oder bei «Bewegung reduzieren» wechselt die Seite sofort.
	let laufend: ViewTransition | null = null;
	onNavigate((navigation) => {
		const art = uebergang(
			navigation.from?.route.id ?? null,
			navigation.to?.route.id ?? null,
			navigation.type
		);
		if (art === null || !('startViewTransition' in document)) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		laufend?.skipTransition();
		const wurzel = document.documentElement;
		wurzel.dataset.uebergang = art;
		return new Promise<void>((bereit) => {
			const uebergangJetzt = document.startViewTransition(async () => {
				bereit();
				// Eine abgebrochene Navigation beendet nur den Übergang, sie ist kein Fehler.
				await navigation.complete.catch(() => {});
			});
			laufend = uebergangJetzt;
			uebergangJetzt.finished
				.catch(() => {})
				.finally(() => {
					if (laufend !== uebergangJetzt) return;
					laufend = null;
					delete wurzel.dataset.uebergang;
				});
		});
	});

	// Beim Start der App: abgelaufene oder kaputte Mail-Anfragen aus dem Gerätespeicher löschen.
	onMount(() => {
		leseMailanfrage(holeSpeicher(), Date.now());
	});

	// Aufklappbereiche klappen überall weich auf und zu (src/lib/ui/klappe.ts).
	onMount(() => {
		document.addEventListener('click', klappeWeich);
		return () => document.removeEventListener('click', klappeWeich);
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
