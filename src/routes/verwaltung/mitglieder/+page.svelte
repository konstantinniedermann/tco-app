<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import Spaltentitel from '../../../lib/verwaltung/Spaltentitel.svelte';
	import Tabellenkopfzeile from '../../../lib/verwaltung/Tabellenkopfzeile.svelte';
	import Seiteninfo from '../../../lib/verwaltung/Seiteninfo.svelte';
	import { resolve } from '$app/paths';
	import { MELDUNG } from '../../../lib/login/anmelden.ts';
	import { ladeMitglieder, type MitgliedZeile } from '../../../lib/verwaltung/mitglieder-api.ts';
	import { KONTO_ZUSTAENDE, kontoZustand, plakette } from '../../../lib/verwaltung/anzeige.ts';
	import { ROLLEN_NAME } from '../../../lib/verwaltung/rollen-namen.ts';
	import type { Spalte } from '../../../lib/verwaltung/tabelle.ts';
	import { Tabellenstand } from '../../../lib/verwaltung/tabellen-stand.svelte.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let status = $state('');
	// Das erste Laden steht in `+page.ts` (`null` heisst «nicht geladen»); danach gehört die Liste
	// der Suche. Lädt SvelteKit die Seite erneut (etwa nach «Beenden» im Band), bleibt sie stehen.
	const erstesLaden = untrack(() => data.zeilen);
	let zeilen = $state<MitgliedZeile[]>(erstesLaden ?? []);
	let fehler = $state<string | null>(erstesLaden === null ? MELDUNG.stoerung : null);
	// Nur die neueste Antwort zählt, wenn mehrere Abfragen unterwegs sind.
	let abfrage = 0;

	const rollenText = (rollen: MitgliedZeile['rollen']) =>
		['Mitglied', ...rollen.map((r) => ROLLEN_NAME[r])].join(', ');
	const kontoRang = (z: MitgliedZeile) =>
		KONTO_ZUSTAENDE.findIndex((k) => k.wert === kontoZustand(z));

	// Baustein Tabellen-Steuerung (#92): Breiten in rem (Start, Mindest, Höchst).
	const SPALTEN: Spalte<MitgliedZeile>[] = [
		{
			schluessel: 'nummer',
			titel: 'Nummer',
			sortwert: (z) => z.mitgliedernummer,
			filter: { art: 'text' },
			filterwert: (z) => z.mitgliedernummer,
			breite: { start: 8.75, min: 6, max: 14 }
		},
		{
			schluessel: 'name',
			titel: 'Name',
			sortwert: (z) => z.name,
			filter: { art: 'text' },
			filterwert: (z) => z.name,
			breite: { start: 9.75, min: 6, max: 30 }
		},
		{
			schluessel: 'email',
			titel: 'E-Mail',
			sortwert: (z) => z.email,
			filter: { art: 'text' },
			filterwert: (z) => z.email,
			breite: { start: 10.5, min: 6, max: 30 }
		},
		{
			schluessel: 'jahrgang',
			titel: 'Jahrgang',
			sortwert: (z) => z.jahrgang,
			filter: { art: 'bereich', zahl: 'ganz' },
			filterwert: (z) => z.jahrgang,
			breite: { start: 9.25, min: 6, max: 14 }
		},
		{
			schluessel: 'rollen',
			titel: 'Rollen',
			sortwert: (z) => rollenText(z.rollen),
			filter: {
				art: 'werte',
				werte: Object.entries(ROLLEN_NAME).map(([wert, text]) => ({ wert, text }))
			},
			filterwert: (z) => z.rollen,
			breite: { start: 8.25, min: 6, max: 25 }
		},
		{
			schluessel: 'konto',
			titel: 'Konto',
			sortwert: kontoRang,
			filter: { art: 'werte', werte: KONTO_ZUSTAENDE },
			filterwert: (z) => kontoZustand(z),
			breite: { start: 8.25, min: 6, max: 15 }
		},
		{ schluessel: 'aktion', titel: 'Aktion', breite: { start: 6, min: 6, max: 6 } }
	];
	const TITEL = ['nummer', 'name', 'email', 'jahrgang', 'rollen', 'konto'];

	const stand = new Tabellenstand('mitglieder', '/verwaltung/mitglieder', SPALTEN, page.url);
	afterNavigate(() => stand.sichere());

	async function lade(s: string, st: string) {
		const nr = ++abfrage;
		const a = await ladeMitglieder({ suche: s.trim(), status: st });
		if (nr !== abfrage || (await leiteUm(a))) return;
		if (a.art === 'ok') {
			zeilen = a.daten;
			fehler = null;
		} else {
			fehler = MELDUNG.stoerung;
		}
	}

	// Beim Tippen kurz warten, damit nicht jede Taste eine Abfrage auslöst. Beim Einhängen nur,
	// wenn das Gedächtnis eine Suche mitbringt: Sonst kommt die Liste aus `+page.ts`.
	let eingehaengt = false;
	$effect(() => {
		const s = stand.suche;
		const st = status;
		if (!eingehaengt) {
			eingehaengt = true;
			if (s.trim() === '') return;
		}
		const warten = setTimeout(() => {
			stand.sichere();
			void lade(s, st);
		}, 200);
		return () => clearTimeout(warten);
	});

	const gezeigt = $derived(stand.zeige(zeilen));
	const anzahlen = $derived(
		Object.fromEntries(
			KONTO_ZUSTAENDE.map((k) => [k.wert, zeilen.filter((z) => kontoZustand(z) === k.wert).length])
		)
	);
	const anzahl = $derived(
		stand.gefiltert
			? `${gezeigt.length} von ${zeilen.length} Mitgliedern`
			: `${zeilen.length} ${zeilen.length === 1 ? 'Mitglied' : 'Mitglieder'}`
	);
</script>

<svelte:head>
	<title>Mitglieder – MyTCO</title>
</svelte:head>

<Seitenkopf>
	<h1>Mitglieder</h1>
</Seitenkopf>
<Seiteninfo>
	<p>
		Alle Mitglieder suchen und über «Bearbeiten» ihre Seite öffnen: Angaben, Mitgliedschaft und
		Login. Rollen vergibt und entzieht der MyTCO-Admin auf der Seite «Rollen».
	</p>
	<p>Neue Mitglieder kommen einzeln über «Mitglied anlegen» oder als Datei über «Einlesen».</p>
</Seiteninfo>

<div class="leiste">
	<div class="feld">
		<label for="suche">Suchen</label>
		<input
			id="suche"
			type="search"
			placeholder="Name, E-Mail oder Nummer"
			bind:value={stand.suche}
		/>
	</div>
	<div class="feld status-nur-handy">
		<label for="status">Status</label>
		<select id="status" bind:value={status}>
			<option value="">Alle</option>
			<option value="aktiv">aktiv</option>
			<option value="ausgetreten">ausgetreten</option>
			<option value="vorgemerkt">wird gelöscht</option>
		</select>
	</div>
	{#if data.darfSchreiben.mitglieder}
		<a class="taste-haupt" href={resolve('/verwaltung/mitglieder/neu')}>Mitglied anlegen</a>
	{/if}
</div>

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
				{#each TITEL as k (k)}
					<Spaltentitel {stand} schluessel={k} anzahlen={k === 'konto' ? anzahlen : undefined} />
				{/each}
				<th class="klebt-rechts"><span class="leise spaltentitel-fest">Aktion</span></th>
			</tr>
		</thead>
		<tbody>
			{#each gezeigt as z (z.id)}
				{@const p = plakette(z)}
				<tr>
					<td>{z.mitgliedernummer ?? ''}</td>
					<td><span class="zelle-kurz" title={z.name}><strong>{z.name}</strong></span></td>
					<td><span class="zelle-kurz" title={z.email}>{z.email}</span></td>
					<td>{z.jahrgang ?? ''}</td>
					<td>
						<span class="zelle-kurz" title={rollenText(z.rollen)}>{rollenText(z.rollen)}</span>
					</td>
					<td><span class={p.klasse}>{p.text}</span></td>
					<td class="klebt-rechts">
						<a
							href={resolve('/verwaltung/mitglieder/[id]', { id: String(z.id) })}
							aria-label="Bearbeiten: {z.name}">Bearbeiten</a
						>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
{#if gezeigt.length === 0 && !fehler}
	<p class="leise">Keine Mitglieder gefunden. Prüf die Suche oder den Filter.</p>
{/if}
