<script lang="ts">
	import { dauerMs, start, weiter, type Ablauf } from '../hilfe/ablauf.ts';
	import ZeichnungAndroid from './ZeichnungAndroid.svelte';
	import ZeichnungIphone from './ZeichnungIphone.svelte';

	// Baustein Anleitung (UI-Leitbild, UI-09): Zeichnung, Taste, nummerierte Schritte.
	let { geraet }: { geraet: 'iphone' | 'android' } = $props();

	// Die App läuft nur im Browser (ssr = false); «Bewegung reduzieren» gilt beim Öffnen der Seite.
	const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const anzahl = $derived(geraet === 'iphone' ? 5 : 4);

	// Beginnt bei Bild 1; `anzahl` steht erst mit dem Gerät fest, darum als abgeleiteter Wert,
	// den die Taste «Nochmals abspielen» überschreibt.
	let ablauf = $derived<Ablauf>(start(anzahl));
	let zustand = $state<'laeuft' | 'angehalten' | 'ende'>('laeuft');
	const aktiv = $derived(ruhig ? -1 : ablauf.schritt);
	const tastenText = $derived(
		zustand === 'laeuft'
			? 'Anhalten'
			: zustand === 'angehalten'
				? 'Abspielen'
				: 'Nochmals abspielen'
	);

	$effect(() => {
		if (ruhig || zustand !== 'laeuft') return;
		const jetzt = ablauf;
		const uhr = setTimeout(() => {
			const naechster = weiter(jetzt);
			if (naechster === 'ende') zustand = 'ende';
			else ablauf = naechster;
		}, dauerMs(jetzt));
		return () => clearTimeout(uhr);
	});

	function taste() {
		if (zustand === 'laeuft') zustand = 'angehalten';
		else if (zustand === 'angehalten') zustand = 'laeuft';
		else {
			ablauf = start(anzahl);
			zustand = 'laeuft';
		}
	}
</script>

<div
	class={[
		'anleitung',
		{ 'anleitung-ruhig': ruhig, 'anleitung-angehalten': !ruhig && zustand !== 'laeuft' }
	]}
>
	{#if geraet === 'iphone'}
		<ZeichnungIphone {aktiv} />
	{:else}
		<ZeichnungAndroid {aktiv} />
	{/if}

	{#if !ruhig}
		<button type="button" class="taste-neben anleitung-taste" onclick={taste}>{tastenText}</button>
	{/if}

	<ol class="anleitung-schritte">
		{#if geraet === 'iphone'}
			<li class={{ aktiv: aktiv === 0 }}>
				<span>Tippe unten rechts auf <strong>•••</strong>.</span>
			</li>
			<li class={{ aktiv: aktiv === 1 }}>
				<span
					>Tippe auf <svg class="symbol" aria-hidden="true" viewBox="0 0 24 24"
						><path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path
							d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2"
						/></svg
					> «Teilen».</span
				>
			</li>
			<li class={{ aktiv: aktiv === 2 }}>
				<span>Scrolle nach unten und tippe auf «Zu Home-Bildschirm hinzufügen».</span>
			</li>
			<li class={{ aktiv: aktiv === 3 }}>
				<span>«Als Web-App öffnen» muss eingeschaltet sein. Tippe auf «Hinzufügen».</span>
			</li>
		{:else}
			<li class={{ aktiv: aktiv === 0 }}>
				<span
					>Tippe oben rechts auf <svg class="symbol" aria-hidden="true" viewBox="0 0 24 24"
						><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle
							cx="12"
							cy="19"
							r="1"
						/></svg
					> «Menü».</span
				>
			</li>
			<li class={{ aktiv: aktiv === 1 }}>
				<span>Tippe auf «Installieren und Verknüpfung erstellen».</span>
			</li>
			<li class={{ aktiv: aktiv === 2 }}><span>Tippe auf «Installieren».</span></li>
		{/if}
		<li class={['anleitung-fertig', { aktiv: aktiv === anzahl - 1 }]}>
			<span
				><strong>Fertig!</strong> Verlass jetzt den Browser und starte MyTCO über das neue Symbol auf
				deinem Startbildschirm.</span
			>
		</li>
	</ol>

	{#if geraet === 'iphone'}
		<p class="leise">
			Siehst du das Teilen-Symbol schon direkt in der Leiste? Dann tipp gleich darauf.
		</p>
	{/if}
</div>
