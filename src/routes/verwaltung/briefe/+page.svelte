<script lang="ts">
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import Seiteninfo from '../../../lib/verwaltung/Seiteninfo.svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, tick, untrack } from 'svelte';
	import Spaltentitel from '../../../lib/verwaltung/Spaltentitel.svelte';
	import Tabellenkopfzeile from '../../../lib/verwaltung/Tabellenkopfzeile.svelte';
	import type { Spalte } from '../../../lib/verwaltung/tabelle.ts';
	import { Tabellenstand } from '../../../lib/verwaltung/tabellen-stand.svelte.ts';
	import Briefdruck from '../../../lib/verwaltung/Briefdruck.svelte';
	import {
		erzeugeBriefe,
		type AusgestellterBrief,
		type BriefListe
	} from '../../../lib/verwaltung/mitglieder-api.ts';
	import { fehlerText, tagText } from '../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const zeilen = $derived(data.zeilen);
	// Regel 3: Der MyTCO-Admin sieht die Liste, Briefe erzeugt nur der Mitglieder-Admin.
	const darfErzeugen = $derived(data.darfSchreiben.mitglieder);

	type Zeile = BriefListe[number];
	type BriefZustand = 'gueltig' | 'abgelaufen' | 'kein-brief' | 'adresse-fehlt';
	const BRIEF_ZUSTAENDE: readonly { wert: BriefZustand; text: string }[] = [
		{ wert: 'gueltig', text: 'Code gültig' },
		{ wert: 'abgelaufen', text: 'Code abgelaufen' },
		{ wert: 'kein-brief', text: 'noch kein Brief' },
		{ wert: 'adresse-fehlt', text: 'Adresse fehlt' }
	];
	function briefZustand(z: Zeile): BriefZustand {
		if (z.adresseFehlt) return 'adresse-fehlt';
		if (z.briefGueltigBis) return 'gueltig';
		return z.briefAbgelaufen ? 'abgelaufen' : 'kein-brief';
	}

	// Baustein Tabellen-Steuerung (#92): Breiten in rem (Start, Mindest, Höchst).
	const SPALTEN: Spalte<Zeile>[] = [
		{ schluessel: 'auswahl', titel: 'Auswahl', breite: { start: 3.5, min: 3.5, max: 3.5 } },
		{
			schluessel: 'name',
			titel: 'Name',
			sortwert: (z) => z.name,
			filter: { art: 'text' },
			filterwert: (z) => z.name,
			breite: { start: 14, min: 6, max: 30 }
		},
		{
			schluessel: 'nummer',
			titel: 'Nummer',
			sortwert: (z) => z.mitgliedernummer,
			filter: { art: 'text' },
			filterwert: (z) => z.mitgliedernummer,
			breite: { start: 8.75, min: 6, max: 14 }
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
			schluessel: 'brief',
			titel: 'Brief',
			sortwert: (z) => BRIEF_ZUSTAENDE.findIndex((b) => b.wert === briefZustand(z)),
			filter: { art: 'werte', werte: BRIEF_ZUSTAENDE },
			filterwert: briefZustand,
			breite: { start: 14, min: 8, max: 24 }
		}
	];
	const TITEL = ['name', 'nummer', 'jahrgang', 'brief'];
	const stand = new Tabellenstand('briefe', '/verwaltung/briefe', SPALTEN, page.url);
	onMount(() => stand.sichere());
	const gezeigt = $derived(stand.zeige(zeilen));
	const anzahlen = $derived(
		Object.fromEntries(
			BRIEF_ZUSTAENDE.map((b) => [b.wert, zeilen.filter((z) => briefZustand(z) === b.wert).length])
		)
	);

	// Auswahl: Es zählen nur Mitglieder, die gerade gezeigt werden und eine Adresse haben. Blendet
	// ein Filter ein gewähltes Mitglied aus, fällt es aus der Auswahl und kommt beim Aufheben des
	// Filters nicht gewählt zurück: Nie geht ein Brief an jemanden, den man nicht sieht.
	let gewaehlt = $state<number[]>([]);
	const waehlbar = $derived(gezeigt.filter((z) => !z.adresseFehlt).map((z) => z.id));
	const istWaehlbar = $derived(new Set(waehlbar));
	const auswahl = $derived(gewaehlt.filter((id) => istWaehlbar.has(id)));
	const istGewaehlt = $derived(new Set(auswahl));
	const alleGewaehlt = $derived(waehlbar.length > 0 && auswahl.length === waehlbar.length);
	$effect(() => {
		const sichtbar = istWaehlbar;
		untrack(() => {
			if (gewaehlt.some((id) => !sichtbar.has(id)))
				gewaehlt = gewaehlt.filter((id) => sichtbar.has(id));
		});
	});
	const anzahl = $derived(
		(stand.gefiltert
			? `${gezeigt.length} von ${zeilen.length} Mitgliedern`
			: `${zeilen.length} ${zeilen.length === 1 ? 'Mitglied' : 'Mitglieder'}`) +
			(darfErzeugen ? ` · ${auswahl.length} gewählt` : '')
	);

	function waehle(id: number, an: boolean) {
		gewaehlt = an ? [...auswahl, id] : auswahl.filter((g) => g !== id);
	}

	function briefText(z: Zeile): string {
		if (z.adresseFehlt) return 'Adresse fehlt';
		if (z.briefGueltigBis) return `Code gültig bis ${tagText(z.briefGueltigBis)}`;
		return z.briefAbgelaufen ? 'Code abgelaufen' : 'noch kein Brief';
	}

	// RR-04: Die Codes leben nur in diesem Zustand, nie in der Adresse oder im Speicher.
	let briefe = $state.raw<AusgestellterBrief[] | null>(null);
	let fehler = $state<string | null>(null);
	let rueckfrage = $state<HTMLDialogElement>();

	let titel = $state<HTMLHeadingElement>();

	// Eine Anfrage nach der anderen: ein Doppelklick stellt nicht zwei Mal Codes aus. Solange sie
	// läuft, ist «Briefe erzeugen» in der Rückfrage gesperrt.
	let laeuft = $state(false);
	async function einzeln(aktion: () => Promise<void>) {
		if (laeuft) return;
		laeuft = true;
		try {
			await aktion();
		} finally {
			laeuft = false;
		}
	}

	const erzeuge = () => einzeln(schickeAuswahl);
	async function schickeAuswahl() {
		fehler = null;
		const a = await erzeugeBriefe([...auswahl]);
		rueckfrage?.close();
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			gewaehlt = [];
			briefe = a.daten.briefe;
		} else if (a.art === 'nicht-moeglich') {
			fehler =
				'Nicht alle ausgewählten Mitglieder können einen Brief erhalten (inzwischen ausgetreten, gesperrt oder ohne Adresse). Es wurde kein Code ausgestellt.';
			await invalidateAll();
		} else {
			fehler = fehlerText(a);
		}
	}

	// Verwirft die Briefe samt Codes und lädt die Liste neu; der Fokus geht zum Titel.
	async function zurueck() {
		briefe = null;
		await tick();
		titel?.focus();
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Briefe – MyTCO</title>
</svelte:head>

{#if briefe}
	<Briefdruck {briefe} {zurueck} />
{:else}
	<Seitenkopf>
		<h1 tabindex="-1" bind:this={titel}>Briefe</h1>
	</Seitenkopf>
	<Seiteninfo>
		<p>
			Der erste Brief mit Anmeldecode, für Mitglieder, die MyTCO noch nie geöffnet haben; ein neuer
			Code ersetzt den alten.
		</p>
		<p>
			<strong>Nicht für verlorene Zugänge:</strong> Wer sich nicht mehr anmelden kann, holt sich beim
			Login selbst einen «Code per E-Mail».
		</p>
	</Seiteninfo>

	{#if darfErzeugen && zeilen.length > 0}
		<div class="leiste">
			<button
				type="button"
				class="taste-haupt"
				disabled={auswahl.length === 0}
				onclick={() => rueckfrage?.showModal()}>Briefe erzeugen ({auswahl.length})</button
			>
		</div>
	{/if}

	{#if fehler}
		<p class="fehler" role="alert">{fehler}</p>
	{/if}

	{#if zeilen.length === 0}
		<p>Alle aktiven Mitglieder haben MyTCO schon geöffnet.</p>
	{:else}
		<Tabellenkopfzeile {stand} {anzahl} />
		{#if darfErzeugen}
			<div class="tabelle tabelle-lang tabelle-steuerung">
				<table {@attach stand.gesamtbreite}>
					<colgroup>
						{#each stand.spalten as s (s.schluessel)}
							<col {@attach stand.breite(s.schluessel)} />
						{/each}
					</colgroup>
					<thead>
						<tr>
							<th scope="col" class="klebt-links"
								><input
									type="checkbox"
									aria-label="Alle gezeigten auswählen"
									checked={alleGewaehlt}
									disabled={waehlbar.length === 0}
									onchange={(e) => (gewaehlt = e.currentTarget.checked ? [...waehlbar] : [])}
								/></th
							>
							{#each TITEL as k (k)}
								<Spaltentitel
									{stand}
									schluessel={k}
									anzahlen={k === 'brief' ? anzahlen : undefined}
								/>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each gezeigt as z (z.id)}
							<tr>
								<td class="klebt-links"
									><input
										type="checkbox"
										aria-label="Auswählen: {z.name}"
										checked={istGewaehlt.has(z.id)}
										disabled={z.adresseFehlt}
										onchange={(e) => waehle(z.id, e.currentTarget.checked)}
									/></td
								>
								<td><span class="zelle-kurz" title={z.name}><strong>{z.name}</strong></span></td>
								<td>{z.mitgliedernummer ?? ''}</td>
								<td>{z.jahrgang ?? ''}</td>
								<td>{briefText(z)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				class="tabelle tabelle-lang tabelle-steuerung"
				role="region"
				aria-label="Briefe"
				tabindex="0"
			>
				<table {@attach stand.gesamtbreite}>
					<colgroup>
						{#each stand.spalten.filter((s) => s.schluessel !== 'auswahl') as s (s.schluessel)}
							<col {@attach stand.breite(s.schluessel)} />
						{/each}
					</colgroup>
					<thead>
						<tr>
							{#each TITEL as k (k)}
								<Spaltentitel
									{stand}
									schluessel={k}
									anzahlen={k === 'brief' ? anzahlen : undefined}
								/>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each gezeigt as z (z.id)}
							<tr>
								<td><span class="zelle-kurz" title={z.name}><strong>{z.name}</strong></span></td>
								<td>{z.mitgliedernummer ?? ''}</td>
								<td>{z.jahrgang ?? ''}</td>
								<td>{briefText(z)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
		{#if gezeigt.length === 0}
			<p class="leise">Keine Mitglieder gefunden. Prüf den Filter.</p>
		{/if}
	{/if}
{/if}

{#if darfErzeugen}
	<dialog class="karte" bind:this={rueckfrage} aria-labelledby="briefe-titel">
		<h2 id="briefe-titel">
			{auswahl.length === 1 ? '1 Brief erzeugen?' : `${auswahl.length} Briefe erzeugen?`}
		</h2>
		<p>
			Die Codes erscheinen nur in der Druckansicht. Schliesst du sie ohne zu drucken, erzeugst du
			neue Briefe.
		</p>
		<div class="leiste">
			<button type="button" class="taste-neben" onclick={() => rueckfrage?.close()}
				>Abbrechen</button
			>
			<button
				type="button"
				class="taste-haupt"
				disabled={laeuft}
				aria-busy={laeuft}
				onclick={erzeuge}>Briefe erzeugen</button
			>
		</div>
	</dialog>
{/if}
