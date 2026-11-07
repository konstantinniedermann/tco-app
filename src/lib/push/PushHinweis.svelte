<script lang="ts">
	// Hinweis auf der Startseite (FR-40, Spec Ziel 3): Push lässt sich auf diesem Handy einschalten,
	// ist aber aus. Nach «Nein, danke» kommt er auf diesem Gerät nicht wieder.
	import { onMount } from 'svelte';
	import { erkenneGeraet } from '../hilfe/geraet.ts';
	import { MELDUNG } from '../login/anmelden.ts';
	import { holeSpeicher } from '../login/mailanfrage.ts';
	import { holeBenachrichtigungen } from './api.ts';
	import { hinweisAbgelehnt, lehneHinweisAb, pushMoeglich, schalteEin } from './geraet.ts';

	// `aktiv`: Die Startseite zeigt gerade kein anderes Angebot und keine «Ansicht als …».
	let { aktiv }: { aktiv: boolean } = $props();

	const ABGELEHNT =
		'Ohne deine Erlaubnis schickt MyTCO keine Push-Mitteilungen. Erlauben kannst du sie in den Einstellungen des Browsers.';

	// Nur auf dem Handy, wenn der Browser Push kann, er nicht blockiert ist und «Nein, danke» fehlt.
	const kommtInFrage =
		erkenneGeraet(navigator.userAgent) !== 'andere' &&
		pushMoeglich({ navigator, window }) === 'ja' &&
		Notification.permission !== 'denied' &&
		!hinweisAbgelehnt(holeSpeicher());

	let schluessel = $state<string | null>(null);
	let erledigt = $state(false);
	let laeuft = $state(false);
	let fehler = $state<string | null>(null);
	const sichtbar = $derived(aktiv && schluessel !== null && !erledigt);

	// Ist Push auf diesem Gerät aus und auf dem Server eingerichtet (Schlüssel vorhanden)?
	onMount(async () => {
		if (!kommtInFrage) return;
		const r = await holeBenachrichtigungen();
		if (r.art === 'ok' && !r.daten.pushHier) schluessel = r.daten.schluessel;
	});

	async function einschalten() {
		if (!schluessel || laeuft) return;
		laeuft = true;
		fehler = null;
		const r = await schalteEin(schluessel);
		laeuft = false;
		if (r === 'ein') erledigt = true;
		else fehler = r === 'abgelehnt' ? ABGELEHNT : MELDUNG.stoerung;
	}

	function neinDanke() {
		lehneHinweisAb(holeSpeicher());
		erledigt = true;
	}
</script>

{#if sichtbar}
	<div class="hinweis">
		<strong>Mitteilungen aufs Handy?</strong><br />
		MyTCO meldet dir Neues zu Anlässen, zur Clubmeisterschaft und zum Verein direkt aufs Handy. Was du
		bekommst, wählst du im Profil.
		<p>
			<button
				type="button"
				class="taste-haupt"
				onclick={einschalten}
				aria-describedby={fehler ? 'push-hinweis-fehler' : undefined}>Einschalten</button
			>
			<button type="button" class="taste-neben" onclick={neinDanke}>Nein, danke</button>
		</p>
		{#if fehler}
			<p class="fehler" id="push-hinweis-fehler" role="alert">{fehler}</p>
		{/if}
	</div>
{/if}
