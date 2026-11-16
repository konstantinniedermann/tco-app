<script lang="ts">
	import '../lib/design/tokens.css';
	import '../lib/design/grundlagen.css';
	import '../lib/design/rahmen.css';
	import '../lib/design/bedienelemente.css';
	import '../lib/design/karten.css';
	import '../lib/design/verwaltung.css';
	import '../lib/design/anleitung.css';
	import '../lib/design/uebergaenge.css';
	import '../lib/design/pc-layout.css';
	import '../lib/design/druck.css';
	import '../lib/design/verlauf.css';
	import { onMount } from 'svelte';
	import { afterNavigate, beforeNavigate, goto, onNavigate, refreshAll } from '$app/navigation';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import Reiter from '../lib/ui/Reiter.svelte';
	import { beobachteKopftitel } from '../lib/ui/kopftitel.ts';
	import { klappeWeich, vergissKlappen } from '../lib/ui/klappe.ts';
	import {
		zeigtReiter,
		stelltStandWiederHer,
		uebergang,
		vergisstStand,
		zeigtFusszeile
	} from '../lib/ui/navigation.ts';
	import { beobachteTastatur, schliesstNurTastatur } from '../lib/ui/tastatur.ts';
	import { fragtVorWechsel, hatUngespeichertes } from '../lib/ui/ungespeichert.ts';
	import { MELDUNG } from '../lib/login/anmelden.ts';
	import { holeSpeicher, leseMailanfrage } from '../lib/login/mailanfrage.ts';
	import { raeumeWechselAuf } from '../lib/profil/wechselanfrage.ts';
	import { APP_VERSION } from '../lib/version';
	import { beendeAnsicht } from '../lib/verwaltung/zugang-api.ts';
	import { ANSICHT_NAME } from '../lib/verwaltung/rollen-namen.ts';

	let { children, data } = $props();
	// Reiter nach dem Login auf jeder Seite der App; Hilfe und Datenschutz melden, ob eine Sitzung
	// besteht (UI-Leitbild, feste Ordnung).
	const mitReiter = $derived(zeigtReiter(page.route.id, page.data.angemeldet !== false));
	// Fusszeile nur vor dem Login und auf der Startseite (UI-Leitbild, Baustein Fusszeile).
	const mitFusszeile = $derived(zeigtFusszeile(page.route.id, page.error !== null));
	// Die Verwaltung bringt Seitenleiste und Inhalt selbst mit (eigenes Layout). Die Fehlerseite
	// steht ausserhalb dieses Layouts und bekommt darum auch dort den Rahmen hier.
	const verwaltung = $derived(
		(page.route.id?.startsWith('/verwaltung') ?? false) && page.error === null
	);

	// Nur der Rollbereich scrollt (UI-Leitbild, Baustein Rollbereich), darum führt die App die
	// Position selbst: Jede Seite beginnt oben, der Zurück-Link und die Zurück-Taste des Browsers
	// bringen sie an die alte Stelle. SvelteKit scrollt nur das Dokument, das hier nie scrollt.
	// Nur ein Speicher, nicht reaktiv: Nichts in der Anzeige hängt davon ab.
	let rollbereich = $state<HTMLElement>();
	let stand: Record<string, number> = {};

	// Titel in der Kopfleiste (src/lib/ui/kopftitel.ts): Der Text bleibt beim Ausblenden stehen,
	// damit er nicht leer ausblendet.
	let kopftitel = $state('');
	let zeigeTitel = $state(false);
	let inhaltsbereich = $state<HTMLElement>();

	// Ungespeicherte Änderungen (UI-Leitbild): Ein Link der App weg von einem geänderten
	// Formular wartet auf die Rückfrage. «Verlassen» geht mit `goto` zum Ziel; das fragt nicht
	// noch einmal. Gilt auch in der Verwaltung, die in diesem Layout steckt.
	let rueckfrage = $state<HTMLDialogElement>();
	let ziel: URL | null = null;
	function verlassen() {
		rueckfrage?.close();
		// Ziel ist ein Link der App, schon aufgelöst.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		if (ziel) void goto(ziel);
		ziel = null;
	}

	beforeNavigate((navigation) => {
		const { from, to } = navigation;
		if (to && fragtVorWechsel(navigation, hatUngespeichertes(document))) {
			navigation.cancel();
			ziel = to.url;
			rueckfrage?.showModal();
			return;
		}
		if (from && rollbereich) stand[from.url.pathname] = rollbereich.scrollTop;
		if (vergisstStand(to?.route.id ?? null)) {
			stand = {};
			vergissKlappen();
		}
	});
	afterNavigate(({ from, to, type }) => {
		if (!rollbereich || !to) return;
		const zurueck = stelltStandWiederHer(from?.route.id ?? null, to.route.id, type);
		rollbereich.scrollTop = zurueck ? (stand[to.url.pathname] ?? 0) : 0;
	});

	// Seitenwechsel mit View Transitions (UI-09): Die Bewegung steht in uebergaenge.css und hängt am
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
		// Stehen auf beiden Seiten Reiter, bleiben sie beim Schieben stehen (UI-Leitbild).
		const vonId = navigation.from?.route.id ?? null;
		const nachId = navigation.to?.route.id ?? null;
		if (zeigtReiter(vonId, true) && zeigtReiter(nachId, true)) wurzel.dataset.reiterBleibt = '';
		else delete wurzel.dataset.reiterBleibt;
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
					delete wurzel.dataset.reiterBleibt;
				});
		});
	});

	// Band «Ansicht als …» (UI-Leitbild): «Beenden» kehrt zu den eigenen Rollen zurück, die Seite
	// bleibt und lädt neu. Ist die Sitzung inzwischen weg, gibt es auch nichts mehr zu beenden.
	let beendenLaeuft = false;
	let beendenFehler = $state<string | null>(null);
	async function beende() {
		if (beendenLaeuft) return;
		beendenLaeuft = true;
		beendenFehler = null;
		const a = await beendeAnsicht();
		if (a.art === 'ok' || a.art === 'abgemeldet') await refreshAll();
		else beendenFehler = MELDUNG.stoerung;
		beendenLaeuft = false;
	}

	// Beim Start der App: abgelaufene oder kaputte Mail-Anfragen aus dem Gerätespeicher löschen.
	onMount(() => {
		const speicher = holeSpeicher();
		leseMailanfrage(speicher, Date.now());
		raeumeWechselAuf(speicher, Date.now());
	});

	// Aufklappbereiche klappen überall weich auf und zu (src/lib/ui/klappe.ts).
	onMount(() => {
		document.addEventListener('click', klappeWeich);
		return () => document.removeEventListener('click', klappeWeich);
	});

	// Der Rollbereich beginnt unter der Kopfleiste, darum `oben` 0. In der Verwaltung gibt es die
	// Mitglieder-App-Kopfleiste nicht, dort ist `inhaltsbereich` leer.
	$effect(() => {
		if (!inhaltsbereich || !rollbereich) return;
		return beobachteKopftitel({
			inhalt: inhaltsbereich,
			wurzel: rollbereich,
			oben: () => 0,
			melde: (titel) => {
				zeigeTitel = titel !== null;
				if (titel !== null) kopftitel = titel;
			}
		});
	});

	// Eingabe mit Tastatur: Reiter weg, App über der Tastatur, «Weiter» (src/lib/ui/tastatur.ts).
	onMount(beobachteTastatur);
</script>

<div class="statusleiste"></div>

<div class={['app', { schale: !verwaltung }]}>
	{#if data.ansicht}
		<aside class="ansicht-band" aria-label="Ansicht">
			<p>Ansicht als {ANSICHT_NAME[data.ansicht]} — nur ansehen</p>
			<button type="button" class="taste-neben" onclick={beende}>Beenden</button>
			{#if beendenFehler}
				<p class="fehler" role="alert">{beendenFehler}</p>
			{/if}
		</aside>
	{/if}
	{#if verwaltung}
		{@render children()}
	{:else}
		<div class="app-rahmen">
			<header class="kopf">
				<span class="kopf-marke">
					<a
						class="kopf-start"
						href={resolve('/')}
						aria-label="Zur Startseite"
						onclick={schliesstNurTastatur}
						><img class="kopf-wappen" src={asset('wappen.svg')} alt="" /></a
					>
					MyTCO
					<span class="kopf-titel" aria-hidden="true" data-sichtbar={zeigeTitel ? '' : undefined}
						>{kopftitel}</span
					>
				</span>
			</header>

			<div class="rollbereich" bind:this={rollbereich}>
				<main class="inhalt" bind:this={inhaltsbereich}>
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
			</div>

			{#if mitReiter}
				<Reiter />
			{/if}
		</div>
	{/if}
</div>

<dialog class="karte" bind:this={rueckfrage} aria-labelledby="ungespeichert-titel">
	<h2 id="ungespeichert-titel">Nicht gespeichert – trotzdem verlassen?</h2>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => rueckfrage?.close()}>Abbrechen</button>
		<button type="button" class="taste-haupt" onclick={verlassen}>Verlassen</button>
	</div>
</dialog>
