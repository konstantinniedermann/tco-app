<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		GESCHLECHT_NAME,
		aktionText,
		auskunftTitel,
		datumText,
		datumZeitText
	} from '../../../../../lib/verwaltung/anzeige.ts';
	import { ANSICHT_NAME, ROLLEN_NAME } from '../../../../../lib/verwaltung/rollen-namen.ts';
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

	const THEMA = { anlaesse: 'Anlässe', cm: 'Clubmeisterschaft', verein: 'Verein' } as const;
	const themen = $derived(
		a.themen.length === 0 ? 'keine' : a.themen.map((t) => THEMA[t]).join(', ')
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
		>‹ {ang.nachname}, {ang.vorname}</a
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
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="tabelle" role="region" aria-label="Angaben" tabindex="0">
		<table>
			<tbody>
				<tr><th scope="row">Name</th><td>{ang.vorname} {ang.nachname}</td></tr>
				{#if a.rufname}
					<tr><th scope="row">Rufname</th><td>{a.rufname}</td></tr>
				{/if}
				<tr><th scope="row">Adresse</th><td>{ang.strasse}, {ang.plz} {ang.ort}</td></tr>
				<tr><th scope="row">E-Mail</th><td>{ang.email}</td></tr>
				<tr><th scope="row">Telefon</th><td>{ang.telefon ?? '–'}</td></tr>
				<tr><th scope="row">Mitgliedernummer</th><td>{ang.mitgliedernummer ?? '–'}</td></tr>
				<tr
					><th scope="row">Geschlecht, Jahrgang</th><td
						>{ang.geschlecht ? GESCHLECHT_NAME[ang.geschlecht] : '–'}, {ang.jahrgang ?? '–'}</td
					></tr
				>
				<tr
					><th scope="row">Klassierung, Lizenznummer</th><td
						>{a.klassierung ?? '–'}, {ang.lizenznummer ?? '–'}</td
					></tr
				>
				{#if a.fairgateOffenSeit}
					<tr
						><th scope="row">Für Fairgate offen</th><td>seit {datumText(a.fairgateOffenSeit)}</td
						></tr
					>
				{/if}
			</tbody>
		</table>
	</div>

	<h2>Mitgliedschaft und Rollen</h2>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="tabelle" role="region" aria-label="Mitgliedschaft und Rollen" tabindex="0">
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
				<tr><th scope="row">Mitteilungen</th><td>{themen}</td></tr>
			</tbody>
		</table>
	</div>

	<h2>Login und Geräte</h2>
	{#if a.login.geraete.length === 0 && a.login.passkeys.length === 0 && a.login.push.length === 0}
		<p>Keine Geräte, keine Passkeys, keine Push-Mitteilungen.</p>
	{:else}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="tabelle" role="region" aria-label="Login und Geräte" tabindex="0">
			<table>
				<thead
					><tr
						><th scope="col">Art</th><th scope="col">Eingerichtet am</th><th scope="col"
							>Zuletzt genutzt</th
						></tr
					></thead
				>
				<tbody>
					{#each a.login.geraete as z, i (i)}
						<tr
							><td
								>Eingeloggtes Gerät{#if z.verwaltungBestaetigtAm}, Verwaltung bestätigt am {datumZeitText(
										z.verwaltungBestaetigtAm
									)}{/if}{#if z.ansicht}, Ansicht als {ANSICHT_NAME[z.ansicht]}{/if}</td
							><td>{datumText(z.erstelltAm)}</td><td>{datumText(z.zuletztGenutzt)}</td></tr
						>
					{/each}
					{#each a.login.passkeys as z, i (i)}
						<tr
							><td>Passkey ({z.geraet})</td><td>{datumText(z.eingerichtetAm)}</td><td
								>{z.zuletztBenutzt ? datumText(z.zuletztBenutzt) : '–'}</td
							></tr
						>
					{/each}
					{#each a.login.push as z, i (i)}
						<tr><td>Push-Mitteilungen</td><td>{datumText(z.eingerichtetAm)}</td><td>–</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<h2>Anlässe</h2>
	{#if a.anlaesse.length === 0}
		<p>Keine Antworten.</p>
	{:else}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="tabelle" role="region" aria-label="Anlässe" tabindex="0">
			<table>
				<thead
					><tr
						><th scope="col">Anlass</th><th scope="col">Datum</th><th scope="col">Antwort</th><th
							scope="col">Geändert am</th
						></tr
					></thead
				>
				<tbody>
					{#each a.anlaesse as z, i (i)}
						<tr
							><td>{z.titel}</td><td>{datumText(z.beginn)}</td><td
								>{ANTWORT[z.antwort]}{z.bemerkung ? `, «${z.bemerkung}»` : ''}</td
							><td>{datumText(z.geaendertAm)}</td></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if a.anlaesseErstellt.length > 0}
		<h2>Von dir angelegte Anlässe</h2>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="tabelle" role="region" aria-label="Angelegte Anlässe" tabindex="0">
			<table>
				<thead><tr><th scope="col">Anlass</th><th scope="col">Datum</th></tr></thead>
				<tbody>
					{#each a.anlaesseErstellt as z, i (i)}
						<tr><td>{z.titel}</td><td>{datumText(z.beginn)}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<h2>Clubmeisterschaft</h2>
	{#if a.cm.length === 0}
		<p>Keine bestätigten Anmeldungen.</p>
	{:else}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="tabelle" role="region" aria-label="Clubmeisterschaft" tabindex="0">
			<table>
				<thead
					><tr
						><th scope="col">Turnier</th><th scope="col">Kategorie</th><th scope="col"
							>Angemeldet am</th
						></tr
					></thead
				>
				<tbody>
					{#each a.cm as z, i (i)}
						<tr><td>{z.turnier}</td><td>{z.kategorie}</td><td>{datumText(z.angemeldetAm)}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if a.mitteilungen.length > 0}
		<h2>Von dir gesendete Mitteilungen</h2>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="tabelle" role="region" aria-label="Gesendete Mitteilungen" tabindex="0">
			<table>
				<thead><tr><th scope="col">Titel</th><th scope="col">Gesendet am</th></tr></thead>
				<tbody>
					{#each a.mitteilungen as z, i (i)}
						<tr><td>{z.titel}</td><td>{datumText(z.gesendetAm)}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<h2>Änderungsverlauf (letzte 12 Monate)</h2>
	{#if a.verlauf.length === 0}
		<p>Keine Einträge.</p>
	{:else}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="tabelle" role="region" aria-label="Änderungsverlauf" tabindex="0">
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
		</div>
	{/if}
	<p class="leise">
		Ohne alte und neue Werte. Wer was sieht und wie lange MyTCO Daten aufbewahrt, steht in der
		Datenschutzerklärung in MyTCO.
	</p>
</article>
