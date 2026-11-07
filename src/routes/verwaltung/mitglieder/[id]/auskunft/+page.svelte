<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		aktionText,
		auskunftTitel,
		datumText,
		datumZeitText
	} from '../../../../../lib/verwaltung/anzeige.ts';
	import { ROLLEN_NAME } from '../../../../../lib/verwaltung/rollen-namen.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const a = $derived(data.auskunft);
	const ang = $derived(a.angaben);
	const titel = $derived(auskunftTitel(ang));

	const STATUS = {
		aktiv: 'aktiv',
		ausgetreten: 'ausgetreten',
		vorgemerkt: 'wird gelöscht',
		geloescht: 'gelöscht'
	} as const;
	const ANTWORT = { kommt: 'kommt', 'kommt-nicht': 'kommt nicht' } as const;
	const CM_STATUS = {
		bestaetigt: 'bestätigt',
		beantragt: 'beantragt',
		abgelehnt: 'abgelehnt',
		zurueckgezogen: 'zurückgezogen'
	} as const;

	const anzahl = (n: number, eins: string, viele: string) => `${n} ${n === 1 ? eins : viele}`;
	const geraete = $derived(
		a.login.geraete === 0
			? 'keines'
			: `${a.login.geraete}${a.login.zuletztGenutzt ? `, zuletzt genutzt am ${datumText(a.login.zuletztGenutzt)}` : ''}`
	);
	const passkeys = $derived(
		a.login.passkeys.length === 0
			? 'keine'
			: `${a.login.passkeys.length}, eingerichtet am ${a.login.passkeys.map((p) => datumText(p.eingerichtetAm)).join(', ')}`
	);
	const push = $derived(
		a.login.pushGeraete === 0
			? 'nicht eingeschaltet'
			: `auf ${anzahl(a.login.pushGeraete, 'Gerät', 'Geräten')} eingeschaltet`
	);
	const mitgliedschaft = $derived.by(() => {
		const m = a.mitgliedschaft;
		const teile: string[] = [];
		if (m.austrittAm) teile.push(`ausgetreten am ${datumText(m.austrittAm)}`);
		if (m.vorgemerktAm) teile.push(`zum Löschen vorgemerkt am ${datumText(m.vorgemerktAm)}`);
		if (m.loeschtAm) teile.push(`Löschung am ${datumText(m.loeschtAm)}`);
		return teile.join(', ');
	});
</script>

<svelte:head>
	<title>Auskunft – MyTCO</title>
</svelte:head>

<div class="leiste nicht-drucken">
	<a class="taste-neben" href={resolve('/verwaltung/mitglieder/[id]', { id: page.params.id ?? '' })}
		>‹ Zurück</a
	>
	<button type="button" class="taste-neben" onclick={() => window.print()}
		>Drucken oder als PDF speichern</button
	>
</div>
<p class="leise nicht-drucken">Die Tasten erscheinen nicht auf dem Ausdruck.</p>

<article class="druckseite">
	<div class="druckseite-kopf">
		<span class="druckseite-wappen"
			><img src={asset('wappen.svg')} alt="" width="32" height="32" /></span
		>
		<strong>MyTCO · TC Olten</strong>
	</div>
	<h1>Auskunft über die Daten von {titel}</h1>
	<p>
		Das speichert MyTCO zu dir, Stand {datumZeitText(a.erstelltAm)}. Erstellt von der
		Mitgliederverwaltung.
	</p>

	<h2>Angaben</h2>
	<table>
		<tbody>
			<tr><th scope="row">Name</th><td>{ang.vorname} {ang.nachname}</td></tr>
			<tr><th scope="row">Adresse</th><td>{ang.strasse}, {ang.plz} {ang.ort}</td></tr>
			<tr><th scope="row">E-Mail</th><td>{ang.email}</td></tr>
			<tr><th scope="row">Telefon</th><td>{ang.telefon ?? '–'}</td></tr>
			<tr><th scope="row">Mitgliedernummer</th><td>{ang.mitgliedernummer ?? '–'}</td></tr>
			<tr
				><th scope="row">Geschlecht, Jahrgang</th><td
					>{ang.geschlecht ?? '–'}, {ang.jahrgang ?? '–'}</td
				></tr
			>
			<tr><th scope="row">Lizenznummer</th><td>{ang.lizenznummer ?? '–'}</td></tr>
		</tbody>
	</table>

	<h2>Mitgliedschaft und Rollen</h2>
	<table>
		<tbody>
			<tr
				><th scope="row">Status</th><td
					>{STATUS[a.status]}{mitgliedschaft ? `, ${mitgliedschaft}` : ''}</td
				></tr
			>
			<tr
				><th scope="row">Rollen</th><td
					>{['Mitglied', ...a.rollen.map((r) => ROLLEN_NAME[r])].join(', ')}</td
				></tr
			>
		</tbody>
	</table>

	<h2>Login und Geräte</h2>
	<table>
		<tbody>
			<tr><th scope="row">Eingeloggte Geräte</th><td>{geraete}</td></tr>
			<tr><th scope="row">Passkeys</th><td>{passkeys}</td></tr>
			<tr><th scope="row">Push-Mitteilungen</th><td>{push}</td></tr>
		</tbody>
	</table>

	<h2>Anlässe</h2>
	{#if a.anlaesse.length === 0}
		<p>Keine Antworten.</p>
	{:else}
		<table>
			<thead
				><tr><th scope="col">Anlass</th><th scope="col">Datum</th><th scope="col">Antwort</th></tr
				></thead
			>
			<tbody>
				{#each a.anlaesse as z, i (i)}
					<tr
						><td>{z.titel}</td><td>{datumText(z.beginn)}</td><td
							>{ANTWORT[z.antwort]}{z.bemerkung ? `, «${z.bemerkung}»` : ''}</td
						></tr
					>
				{/each}
			</tbody>
		</table>
	{/if}

	<h2>Clubmeisterschaft</h2>
	{#if a.cm.length === 0}
		<p>Keine Anmeldungen.</p>
	{:else}
		<table>
			<thead
				><tr
					><th scope="col">Turnier</th><th scope="col">Kategorie</th><th scope="col">Status</th></tr
				></thead
			>
			<tbody>
				{#each a.cm as z, i (i)}
					<tr><td>{z.turnier}</td><td>{z.kategorie}</td><td>{CM_STATUS[z.status]}</td></tr>
				{/each}
			</tbody>
		</table>
	{/if}

	<h2>Änderungsverlauf (letzte 12 Monate)</h2>
	{#if a.verlauf.length === 0}
		<p>Keine Einträge.</p>
	{:else}
		<table>
			<thead
				><tr><th scope="col">Wann</th><th scope="col">Wer</th><th scope="col">Was</th></tr></thead
			>
			<tbody>
				{#each a.verlauf as z, i (i)}
					<tr><td>{datumText(z.zeitpunkt)}</td><td>{z.urheber}</td><td>{aktionText(z)}</td></tr>
				{/each}
			</tbody>
		</table>
	{/if}
	<p class="leise">
		Ohne alte und neue Werte. Wer was sieht und wie lange MyTCO Daten aufbewahrt, steht in der
		Datenschutzerklärung in MyTCO.
	</p>
</article>
