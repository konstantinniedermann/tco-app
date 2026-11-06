<script lang="ts">
	import { resolve } from '$app/paths';
	import { erkenneGeraet } from '../../lib/hilfe/geraet.ts';
	import Anleitung from '../../lib/ui/Anleitung.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Das Thema fürs eigene Handy zuoberst; am PC zuerst das iPhone.
	const androidZuerst = erkenneGeraet(navigator.userAgent) === 'android';
	// Adresse der jeweiligen Umgebung (Test oder Live), nicht fest eingetragen.
	const adresse = location.host;
	// Ein Link wie /hilfe#neuer-code öffnet das Thema gleich.
	const anker = location.hash.slice(1);
	// Die Anleitung entsteht erst beim Aufklappen: so beginnt sie bei Bild 1, und zugeklappt
	// läuft kein Takt im Verborgenen.
	let iphoneOffen = $state(anker === 'startbildschirm-iphone');
	let androidOffen = $state(anker === 'startbildschirm-android');
</script>

<svelte:head>
	<title>Hilfe – MyTCO</title>
</svelte:head>

{#snippet iphone()}
	<details class="karte klappe" id="startbildschirm-iphone" bind:open={iphoneOffen}>
		<summary class="klappe-titel">Auf den Startbildschirm: iPhone</summary>
		<p>Öffne {adresse} in Safari, dann:</p>
		{#if iphoneOffen}
			<Anleitung geraet="iphone" />
		{/if}
	</details>
{/snippet}

{#snippet android()}
	<details class="karte klappe" id="startbildschirm-android" bind:open={androidOffen}>
		<summary class="klappe-titel">Auf den Startbildschirm: Android</summary>
		<p>Öffne {adresse} in Chrome, dann:</p>
		{#if androidOffen}
			<Anleitung geraet="android" />
		{/if}
	</details>
{/snippet}

<a class="zurueck" href={resolve('/')}>‹ Zurück</a>
<h1>Hilfe</h1>

{#if androidZuerst}
	{@render android()}
	{@render iphone()}
{:else}
	{@render iphone()}
	{@render android()}
{/if}

<details class="karte klappe" id="neuer-code" open={anker === 'neuer-code'}>
	<summary class="klappe-titel">Neuer Code per E-Mail</summary>
	<p>Für dich, wenn du ausgeloggt bist, ein neues Handy hast oder den Brief nicht mehr findest.</p>
	<ol>
		<li>Öffne MyTCO und tippe auf «Kein Brief zur Hand? Code per E-Mail».</li>
		<li>Gib die E-Mail-Adresse ein, die der Verein von dir hat.</li>
		<li>Tippe den Code aus der Mail ein. Er gilt 15 Minuten.</li>
	</ol>
	<p class="leise">Keine Mail da? Schau im Spam-Ordner nach.</p>
</details>

<details class="karte klappe" id="passkey" open={anker === 'passkey'}>
	<summary class="klappe-titel">Mit Passkey anmelden</summary>
	<p>Mit einem Passkey meldest du dich mit Face ID, Fingerabdruck oder Handy-PIN an, ohne Code.</p>
	<ol>
		<li>Melde dich an.</li>
		<li>
			Tippe im Hinweis auf der Startseite auf «Passkey einrichten». Oder unter Profil › Anmelden mit
			Passkey auf «Passkey auf diesem Gerät einrichten».
		</li>
		<li>Bestätige mit Face ID, Fingerabdruck oder PIN.</li>
	</ol>
</details>

<!-- Annahme K-19.1 (Telefon, Lizenznummer, E-Mail) und K-19.2 (Adresse): das Mitglied ändert sie selbst. -->
<details class="karte klappe" id="eigene-angaben" open={anker === 'eigene-angaben'}>
	<summary class="klappe-titel">Eigene Angaben ändern</summary>
	<p>
		E-Mail, Telefon, Adresse und Lizenznummer änderst du selbst: unter Profil › Meine Angaben bei
		der Angabe auf «Ändern» tippen.
	</p>
	<p>Deine E-Mail ist zugleich dein Login. Darum braucht eine neue E-Mail zwei Codes:</p>
	<ol>
		<li>Gib die neue Adresse ein und tippe auf «Codes senden».</li>
		<li>Je ein Code geht an die bisherige und an die neue Adresse.</li>
		<li>Tippe beide Codes ein. Sie gelten 15 Minuten.</li>
	</ol>
	<p class="leise">
		Kommst du nicht mehr an die bisherige Adresse, oder stimmen Name oder Jahrgang nicht? Dann
		ändert die Mitgliederverwaltung es für dich. Wende dich an den Kontakt unten.
	</p>
</details>

<div class="karte">
	<h2>Fragen?</h2>
	{#if data.kontakt}
		<p>Klappt etwas nicht? Wende dich an {data.kontakt}.</p>
	{:else}
		<p>Den Kontakt findest du in deinem Brief.</p>
	{/if}
</div>
