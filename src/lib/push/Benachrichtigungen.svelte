<script lang="ts">
	// Aufklappbereich «Benachrichtigungen» im Profil (FR-40, FR-41): Push auf diesem Gerät und die
	// drei Themen. Die Schalter gelten sofort, ohne Speichern-Taste (UI-Leitbild, Auswahlfläche
	// als Schalter).
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { MELDUNG } from '../login/anmelden.ts';
	import { istKlappeOffen, merkeKlappe } from '../ui/klappe.ts';
	import {
		holeBenachrichtigungen,
		speichereThemen,
		type Benachrichtigungen,
		type Thema
	} from './api.ts';
	import { pushMoeglich, schalteAus, schalteEin } from './geraet.ts';

	let { nurAnsehen }: { nurAnsehen: boolean } = $props();

	const THEMEN: { thema: Thema; name: string }[] = [
		{ thema: 'anlaesse', name: 'Anlässe' },
		{ thema: 'cm', name: 'Clubmeisterschaft' },
		{ thema: 'verein', name: 'Verein' }
	];
	const ABGELEHNT =
		'Ohne deine Erlaubnis schickt MyTCO keine Push-Mitteilungen. Erlauben kannst du sie in den Einstellungen des Browsers.';

	const moeglich = pushMoeglich({ navigator, window });
	let laedt = $state(true);
	let stand = $state<Benachrichtigungen | null>(null);
	let pushLaeuft = $state(false);
	let pushFehler = $state<string | null>(null);
	let themenFehler = $state<string | null>(null);

	onMount(async () => {
		const r = await holeBenachrichtigungen();
		stand = r.art === 'ok' ? r.daten : null;
		laedt = false;
	});

	async function schaltePush(an: boolean) {
		if (!stand?.schluessel || pushLaeuft) return;
		pushLaeuft = true;
		pushFehler = null;
		stand.pushHier = an;
		if (an) {
			const r = await schalteEin(stand.schluessel);
			if (r !== 'ein') {
				stand.pushHier = false;
				pushFehler = r === 'abgelehnt' ? ABGELEHNT : MELDUNG.stoerung;
			}
		} else {
			await schalteAus();
			// Ob der Server das Abo gelöscht hat, sagt erst der neue Stand.
			const r = await holeBenachrichtigungen();
			if (r.art !== 'ok' || r.daten.pushHier) {
				stand.pushHier = true;
				pushFehler = MELDUNG.stoerung;
			}
		}
		pushLaeuft = false;
	}

	async function schalteThema(thema: Thema, an: boolean) {
		if (!stand) return;
		themenFehler = null;
		stand.themen[thema] = an;
		const r = await speichereThemen({ ...stand.themen });
		if (r.art !== 'ok') {
			stand.themen[thema] = !an;
			themenFehler = MELDUNG.stoerung;
		}
	}
</script>

<details
	class="karte klappe"
	open={istKlappeOffen('profil-benachrichtigungen')}
	ontoggle={(e) => merkeKlappe('profil-benachrichtigungen', e.currentTarget.open)}
>
	<summary class="klappe-titel">Benachrichtigungen</summary>
	<div>
		{#if laedt}
			<p class="leise">Wird geladen …</p>
		{:else if !stand}
			<p class="fehler" role="alert">{MELDUNG.stoerung}</p>
		{:else}
			{@const s = stand}
			{#if s.schluessel === null}
				<p class="leise">Push ist hier nicht eingerichtet. Mitteilungen kommen per E-Mail.</p>
			{:else if moeglich === 'iphone-startbildschirm'}
				<p>
					Push geht auf dem iPhone nur, wenn MyTCO auf dem Startbildschirm liegt.
					<a href={resolve('/hilfe#startbildschirm-iphone')}>So legst du MyTCO dorthin</a>
				</p>
			{:else if moeglich === 'nein'}
				<p class="leise">Dieser Browser kann keine Push-Mitteilungen empfangen.</p>
			{:else}
				<label class="auswahl">
					<input
						type="checkbox"
						bind:checked={() => s.pushHier, (an) => schaltePush(an)}
						disabled={nurAnsehen || pushLaeuft}
						aria-describedby={pushFehler ? 'push-fehler' : undefined}
					/>
					Push auf diesem Gerät
				</label>
				{#if pushFehler}
					<p class="fehler" id="push-fehler" role="alert">{pushFehler}</p>
				{/if}
			{/if}
			<fieldset class="auswahl-gruppe" disabled={nurAnsehen}>
				<legend>Mitteilungen zu</legend>
				{#each THEMEN as t (t.thema)}
					<label class="auswahl">
						<input
							type="checkbox"
							bind:checked={() => s.themen[t.thema], (an) => schalteThema(t.thema, an)}
						/>
						{t.name}
					</label>
				{/each}
			</fieldset>
			{#if themenFehler}
				<p class="fehler" role="alert">{themenFehler}</p>
			{/if}
			<p class="leise">
				Gilt für Push und E-Mail. Bestätigungen und Login-Codes bekommst du immer.
			</p>
		{/if}
	</div>
</details>
