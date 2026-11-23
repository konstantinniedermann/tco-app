<script lang="ts">
	// Aufklappbereich «Benachrichtigungen» im Profil (FR-40, FR-41): Push auf diesem Gerät, die
	// drei Themen und die gefolgten Interclub-Teams (#81). Die Schalter gelten sofort, ohne
	// Speichern-Taste (UI-Leitbild, Auswahlfläche als Schalter).
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { holeGefolgteTeams, setzeFolgen, type GefolgteTeams } from '../interclub/api.ts';
	import { MELDUNG } from '../login/anmelden.ts';
	import { leiteUmNachAktion } from '../login/waechter.ts';
	import { istKlappeOffen, merkeKlappe } from '../ui/klappe.ts';
	import {
		holeBenachrichtigungen,
		speichereThemen,
		type Benachrichtigungen,
		type Thema
	} from './api.ts';
	import { pushMoeglich, schalteAus, schalteEin } from './geraet.ts';

	// `interclub`: Es gibt Interclub-Daten (Reiter IC); sonst fehlt die Gruppe «Interclub-Teams».
	let { nurAnsehen, interclub }: { nurAnsehen: boolean; interclub: boolean } = $props();

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
	let themenLaeuft = $state(false);

	// Gefolgte Teams: Ein abgewähltes Team bleibt bis zum nächsten Laden stehen, damit man es wieder
	// anwählen kann. `null`: Der Stand liess sich nicht laden (nur diese Gruppe meldet die Störung).
	type IcZeile = { teamId: number; liga: string; folgt: boolean };
	let ic = $state<{ teams: IcZeile[]; push: boolean } | null>(null);
	let icLaeuft = $state(false);
	let icFehler = $state<string | null>(null);
	const IC_FOLGEN = 'Folgen kannst du auf der Seite eines Teams unter';
	const icSatz = $derived(
		ic === null || ic.teams.length === 0
			? 'Du folgst keinem Team.'
			: ic.push
				? 'Push nach jedem Endstand.'
				: 'Ohne Push bekommst du keine Mitteilung.'
	);

	const alsZeilen = (g: GefolgteTeams) => ({
		teams: g.teams.map((t) => ({ ...t, folgt: true })),
		push: g.push
	});

	onMount(async () => {
		const [r, g] = await Promise.all([
			holeBenachrichtigungen(),
			interclub ? holeGefolgteTeams() : null
		]);
		stand = r.art === 'ok' ? r.daten : null;
		ic = g?.art === 'ok' ? alsZeilen(g.daten) : null;
		laedt = false;
	});

	// Push auf diesem Gerät ändert, ob das Konto überhaupt Push hat: der Satz zu den Teams folgt.
	async function ladePushDerTeams() {
		if (!ic) return;
		const g = await holeGefolgteTeams();
		if (g.art === 'ok' && ic) ic.push = g.daten.push;
	}

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
			// Scheitert das Löschen auf dem Server, bleibt Push an, auch im Browser.
			if ((await schalteAus()) !== 'aus') {
				stand.pushHier = true;
				pushFehler = MELDUNG.stoerung;
			}
		}
		if (pushFehler === null) await ladePushDerTeams();
		pushLaeuft = false;
	}

	// Eine Anfrage nach der anderen: Solange eine läuft, sind die Schalter gesperrt. Scheitert sie,
	// zeigen die Schalter den Stand des Servers. Ohne Sitzung geht es zum Login wie auf der
	// Anlass-Seite.
	async function schalteThema(thema: Thema, an: boolean) {
		if (!stand || themenLaeuft) return;
		themenLaeuft = true;
		themenFehler = null;
		stand.themen[thema] = an;
		let r = await speichereThemen({ ...stand.themen });
		if (r.art !== 'ok' && r.art !== 'abgemeldet') {
			themenFehler = MELDUNG.stoerung;
			r = await holeBenachrichtigungen();
			// Lässt sich auch der Stand nicht laden, gilt der letzte bekannte des Servers.
			if (r.art !== 'ok' && r.art !== 'abgemeldet') stand.themen[thema] = !an;
		}
		if (r.art === 'abgemeldet') {
			await leiteUmNachAktion(r);
			return;
		}
		if (r.art === 'ok') stand.themen = r.daten.themen;
		themenLaeuft = false;
	}

	// Wie die Themen: eine Anfrage nach der anderen, bei Fehler der Stand des Servers. Ohne Push
	// lässt sich ein abgewähltes Team nicht wieder anwählen (`kein-push`); der Satz sagt es.
	async function schalteTeam(z: IcZeile, an: boolean) {
		if (!ic || icLaeuft) return;
		icLaeuft = true;
		icFehler = null;
		z.folgt = an;
		const r = await setzeFolgen(z.teamId, an);
		if (r.art === 'abgemeldet') {
			await leiteUmNachAktion(r);
			return;
		}
		if (r.art === 'ok') z.folgt = r.daten.folgt;
		else if (r.art === 'kein-push') {
			z.folgt = false;
			ic.push = false;
		} else {
			icFehler = MELDUNG.stoerung;
			const g = await holeGefolgteTeams();
			if (g.art === 'ok') {
				for (const x of ic.teams) x.folgt = g.daten.teams.some((t) => t.teamId === x.teamId);
				ic.push = g.daten.push;
			} else z.folgt = !an;
		}
		icLaeuft = false;
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
			<fieldset class="auswahl-gruppe" disabled={nurAnsehen || themenLaeuft}>
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
			{#if interclub}
				{#if ic}
					{@const g = ic}
					<fieldset class="auswahl-gruppe" disabled={nurAnsehen || icLaeuft}>
						<legend>Interclub-Teams</legend>
						{#each g.teams as z (z.teamId)}
							<label class="auswahl">
								<input type="checkbox" bind:checked={() => z.folgt, (an) => schalteTeam(z, an)} />
								{z.liga}
							</label>
						{/each}
					</fieldset>
					{#if icFehler}
						<p class="fehler" role="alert">{icFehler}</p>
					{/if}
					<p class="leise">{icSatz} {IC_FOLGEN} <a href={resolve('/interclub')}>IC</a>.</p>
				{:else}
					<p class="fehler" role="alert">{MELDUNG.stoerung}</p>
				{/if}
			{/if}
		{/if}
	</div>
</details>
