<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { MELDUNG, meldung, sende } from '../../lib/login/anmelden.ts';
	import {
		entfernePasskey,
		kannPasskey,
		ladePasskeys,
		richtePasskeyEin,
		type PasskeyAnzeige
	} from '../../lib/login/passkey.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// Nach Einrichten oder Entfernen steht hier die neu geladene Liste; bis dahin die aus `load`.
	let neueListe = $state<PasskeyAnzeige[] | null>(null);
	const passkeys = $derived(neueListe ?? data.passkeys ?? []);
	const passkeyMoeglich = kannPasskey();

	let fragtNach = $state<string | null>(null);
	let passkeyFehler = $state<string | null>(null);
	let passkeyLaeuft = $state(false);

	let abmeldenLaeuft = $state(false);
	let abmeldenFehler = $state<string | null>(null);

	function datum(d: Date): string {
		return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
	}

	function zuletzt(d: Date | null): string {
		if (!d) return 'noch nie';
		const heute = new Date();
		const tage = Math.round(
			(new Date(heute.getFullYear(), heute.getMonth(), heute.getDate()).getTime() -
				new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
				86_400_000
		);
		if (tage <= 0) return 'heute';
		if (tage === 1) return 'gestern';
		if (tage < 30) return `vor ${tage} Tagen`;
		return datum(d);
	}

	async function neuLaden() {
		const liste = await ladePasskeys();
		if (liste) neueListe = liste;
	}

	async function einrichten() {
		if (passkeyLaeuft) return;
		passkeyLaeuft = true;
		passkeyFehler = null;
		const r = await richtePasskeyEin();
		if (r === 'ok') await neuLaden();
		else if (r === 'fehler') passkeyFehler = MELDUNG.passkeyEinrichten;
		passkeyLaeuft = false;
	}

	async function entfernen(kennung: string) {
		if (passkeyLaeuft) return;
		passkeyLaeuft = true;
		passkeyFehler = null;
		const r = await entfernePasskey(kennung);
		if (r === 'ok') {
			fragtNach = null;
			await neuLaden();
		} else passkeyFehler = MELDUNG.stoerung;
		passkeyLaeuft = false;
	}

	// Ohne Antwort des Servers bleibt die Sitzung gültig: dann Meldung statt Login-Seite.
	async function abmelden() {
		if (abmeldenLaeuft) return;
		abmeldenLaeuft = true;
		abmeldenFehler = null;
		const r = await sende('/api/logout', {});
		abmeldenLaeuft = false;
		if (r.ergebnis === 'ok') await goto(resolve('/login'));
		else abmeldenFehler = meldung(r, MELDUNG.stoerung);
	}
</script>

<svelte:head>
	<title>Profil – MyTCO</title>
</svelte:head>

<h1>Profil</h1>

<details class="karte klappe" open>
	<summary class="klappe-titel">Anmelden mit Passkey</summary>
	<div>
		{#each passkeys as p (p.kennung)}
			<div class="kachel">
				<span>
					<strong>{p.geraet}</strong><br />
					<span class="leise"
						>eingerichtet am {datum(p.eingerichtetAm)} · zuletzt {zuletzt(p.zuletztBenutzt)}</span
					>
				</span>
				{#if fragtNach === p.kennung}
					<span>
						Wirklich entfernen?
						<button type="button" class="taste-neben" onclick={() => entfernen(p.kennung)}
							>Entfernen</button
						>
						<button type="button" class="taste-neben" onclick={() => (fragtNach = null)}
							>Abbrechen</button
						>
					</span>
				{:else}
					<button type="button" class="taste-neben" onclick={() => (fragtNach = p.kennung)}
						>Entfernen</button
					>
				{/if}
			</div>
		{:else}
			<p>
				Mit einem Passkey meldest du dich ohne Code an: mit Face ID, Fingerabdruck oder der
				Handy-PIN.
			</p>
		{/each}
		{#if passkeyMoeglich}
			<button
				type="button"
				class="taste-neben taste-breit"
				onclick={einrichten}
				aria-describedby={passkeyFehler ? 'passkey-fehler' : undefined}
				>Passkey auf diesem Gerät einrichten</button
			>
		{/if}
		{#if passkeyFehler}
			<p class="fehler" id="passkey-fehler" role="alert">{passkeyFehler}</p>
		{/if}
		<p class="leise">
			Gilt für alle Geräte mit demselben Apple- bzw. Google-Konto. Der Code per E-Mail funktioniert
			immer.
		</p>
	</div>
</details>

<div class="karte">
	<button
		type="button"
		class="taste-neben"
		onclick={abmelden}
		aria-describedby={abmeldenFehler ? 'abmelden-fehler' : undefined}>Abmelden</button
	>
	{#if abmeldenFehler}
		<p class="fehler" id="abmelden-fehler" role="alert">{abmeldenFehler}</p>
	{/if}
</div>
