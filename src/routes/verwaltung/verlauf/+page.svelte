<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { ladeVerlauf, type VerlaufEintrag } from '../../../lib/verwaltung/mitglieder-api.ts';
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import Spaltentitel from '../../../lib/verwaltung/Spaltentitel.svelte';
	import Tabellenkopfzeile from '../../../lib/verwaltung/Tabellenkopfzeile.svelte';
	import Seiteninfo from '../../../lib/verwaltung/Seiteninfo.svelte';
	import { aktionText, zeitText } from '../../../lib/verwaltung/anzeige.ts';
	import { sortiere } from '../../../lib/verwaltung/tabelle.ts';
	import { Tabellenstand } from '../../../lib/verwaltung/tabellen-stand.svelte.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';
	import {
		VERLAUF_SPALTEN,
		verlaufAbfrage,
		verlaufGedaechtnis
	} from '../../../lib/verwaltung/verlauf-spalten.ts';
	import type { PageProps } from './$types';

	// Den Verlauf lädt `+page.ts` vor dem Anzeigen, auch nach einem Wechsel von «nur dieses
	// Mitglied» (Adresse); `null` heisst «nicht geladen» (Störung). Dann bleibt der zuletzt geladene
	// Stand stehen. Nach einer Eingabe in einen Filter im Spaltentitel lädt die Seite selbst (#92).
	let { data }: PageProps = $props();
	const mitglied = $derived(data.mitglied);
	let zuletzt: VerlaufEintrag[] = [];
	let zeilen = $derived.by(() => (zuletzt = data.zeilen ?? zuletzt));
	let fehler = $derived(data.zeilen === null ? MELDUNG.stoerung : null);

	// Der Verlauf eines einzelnen Mitglieds hat ein eigenes Gedächtnis (`verlaufGedaechtnis`).
	const stand = $derived(
		new Tabellenstand(
			verlaufGedaechtnis(mitglied),
			'/verwaltung/verlauf',
			VERLAUF_SPALTEN,
			untrack(() => page.url)
		)
	);
	afterNavigate(() => stand.sichere());
	// Der Server hat schon gefiltert; hier wird nur noch sortiert.
	const gezeigt = $derived(sortiere(zeilen, VERLAUF_SPALTEN, stand.sortierung));

	// Nur die neueste Antwort zählt, wenn mehrere Abfragen unterwegs sind. Beim Einhängen nicht:
	// Da kommt der Verlauf aus `+page.ts`, mit demselben Filter.
	let abfrage = 0;
	let eingehaengt = false;
	$effect(() => {
		const filter = stand.filter;
		const nur = mitglied;
		if (!eingehaengt) {
			eingehaengt = true;
			return;
		}
		const warten = setTimeout(async () => {
			const nr = ++abfrage;
			const a = await ladeVerlauf(verlaufAbfrage(filter, nur));
			if (nr !== abfrage || (await leiteUm(a))) return;
			if (a.art === 'ok') {
				zeilen = a.daten;
				fehler = null;
			} else {
				fehler = MELDUNG.stoerung;
			}
		}, 200);
		return () => clearTimeout(warten);
	});
	const anzahl = $derived(
		stand.gefiltert
			? `${zeilen.length} Treffer`
			: `${zeilen.length} ${zeilen.length === 1 ? 'Eintrag' : 'Einträge'}`
	);
	// Pfad «Mitglieder › Nachname, Vorname › Änderungsverlauf»: Der Name steht in jeder Zeile des
	// Verlaufs. Gibt es keine, steht «Mitglied» – der Titel rutscht nicht nach, und der Rückweg
	// fehlt nie.
	const name = $derived(
		zeilen.find((z) => z.mitglied.id === mitglied)?.mitglied.name ?? 'Mitglied'
	);
</script>

<svelte:head>
	<title>Änderungsverlauf – MyTCO</title>
</svelte:head>

<Seitenkopf
	pfad={mitglied !== undefined
		? {
				stufen: [
					{ text: 'Mitglieder', href: resolve('/verwaltung/mitglieder') },
					{
						text: name,
						href: resolve('/verwaltung/mitglieder/[id]', { id: String(mitglied) })
					}
				],
				aktuell: 'Änderungsverlauf'
			}
		: undefined}
>
	<h1>Änderungsverlauf</h1>
</Seitenkopf>
<Seiteninfo>
	<p>Wer wann an welchem Mitglied etwas geändert hat, ohne alte und neue Werte.</p>
</Seiteninfo>
<p class="leise">
	{stand.gefiltert
		? mitglied === undefined
			? 'Die neuesten 100 Treffer im ganzen Verlauf, neueste zuerst.'
			: 'Nur dieses Mitglied, die neuesten 100 Treffer, neueste zuerst.'
		: mitglied === undefined
			? 'Die letzten 100 Einträge, neueste zuerst.'
			: 'Nur dieses Mitglied, neueste zuerst.'}
	{#if mitglied !== undefined}
		<a href={resolve('/verwaltung/verlauf')}>Alle anzeigen</a>
	{/if}
</p>

{#if fehler}
	<p class="fehler" role="alert">{fehler}</p>
{/if}

<Tabellenkopfzeile {stand} {anzahl} />

<div class="tabelle tabelle-lang tabelle-steuerung" {@attach stand.box}>
	<table {@attach stand.gesamtbreite}>
		<colgroup>
			{#each stand.spalten as s (s.schluessel)}
				<col {@attach stand.breite(s.schluessel)} />
			{/each}
		</colgroup>
		<thead>
			<tr>
				{#each stand.spalten as s (s.schluessel)}
					<Spaltentitel {stand} schluessel={s.schluessel} />
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each gezeigt as z, i (i)}
				<tr>
					<td>{zeitText(z.zeitpunkt)}</td>
					<td><span class="zelle-kurz" title={z.urheber}>{z.urheber}</span></td>
					<td>
						<span class="zelle-kurz"
							><a href={resolve('/verwaltung/mitglieder/[id]', { id: String(z.mitglied.id) })}
								>{z.mitglied.name}</a
							></span
						>
					</td>
					<td><span class="zelle-kurz" title={aktionText(z)}>{aktionText(z)}</span></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
{#if zeilen.length === 0 && !fehler}
	<p class="leise">
		{stand.gefiltert ? 'Keine Treffer. Prüf den Filter.' : 'Noch keine Einträge.'}
	</p>
{/if}
