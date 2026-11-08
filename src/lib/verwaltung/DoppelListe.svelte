<!--
	A-ANMELDUNG-06, FR-46, FR-48: Doppel-Anmeldungen einer Kategorie in der Verwaltung, wie die
	Einzel-Liste: Paare, Suchende und offene Anfragen je als Tabelle. Der CM-Admin meldet von Hand
	an, ändert Partner, legt Suchende zusammen, meldet Anfragen als Paar an, verschiebt, löscht und
	korrigiert Klassierungen; wer nur liest, sieht dieselben Tabellen ohne Tasten. Nach jeder Aktion
	lädt die Seite neu.
-->
<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import { refreshAll } from '$app/navigation';
	import { nameText } from '../name.ts';
	import Name from '../ui/Name.svelte';
	import { KLASSIERUNGEN, klassierungName, type Klassierung } from '../turnier/klassierung.ts';
	import Aktionsdialog from './Aktionsdialog.svelte';
	import Spielersuche from './Spielersuche.svelte';
	import {
		aenderePartner,
		korrigiereKlassierung,
		legeZusammen,
		loescheAnfrage,
		loescheAnmeldung,
		meldeAnfrageAlsPaarAn,
		meldeDoppelAn,
		verschiebeAnmeldung,
		type DoppelVerwaltung,
		type SpielerTreffer
	} from './api.ts';
	import { datumText } from './anzeige.ts';
	import {
		mitgliedVermerk,
		nichtAktivGrund,
		paarText,
		summeText,
		verschiebenGesperrt
	} from './turnier-anzeige.ts';

	type Spieler = DoppelVerwaltung['suchende'][number]['spieler'];
	/** Paar oder Suchender; `summe` nur beim Paar. */
	type Anmeldung = { anmeldungId: number; spieler: Spieler[]; summe?: number | null };
	type Anfrage = DoppelVerwaltung['anfragen'][number];
	type Dialog = ReturnType<typeof Aktionsdialog>;

	type Props = {
		kategorieId: number;
		/** `null`: Die Liste liess sich nicht laden. */
		liste: DoppelVerwaltung | null;
		/**
		 * Aus dem Turnier: die übrigen aktiven Doppel-Kategorien (Ziel fürs Verschieben) und ob es
		 * noch in Vorbereitung ist. `null`: Das Turnier liess sich nicht laden; dann fehlen
		 * Von Hand anmelden und Verschieben, statt einen falschen Stand zu zeigen.
		 */
		turnier: { andere: { id: number; name: string }[]; vorbereitung: boolean } | null;
		nurLesen: boolean;
	};

	let { kategorieId, liste, turnier, nurLesen }: Props = $props();

	const andere = $derived(turnier?.andere ?? []);
	// Von Hand anmelden und verschieben gehen erst, wenn das Turnier nicht mehr in Vorbereitung ist.
	const offen = $derived(turnier !== null && !turnier.vorbereitung);

	const WEG = 'Diese Anmeldung gibt es nicht mehr.';
	const ANFRAGE_WEG = 'Diese Anfrage gibt es nicht mehr.';
	const VORBEREITUNG = 'Das Turnier ist noch in Vorbereitung.';

	let titel = $state<HTMLHeadingElement>();
	let rueckmeldung = $state<string | null>(null);
	let rueckmeldungFeld = $state<HTMLParagraphElement>();

	let anmelden = $state<Dialog>();
	let partner = $state<Dialog>();
	let zusammen = $state<Dialog>();
	let verschieben = $state<Dialog>();
	let klassierungDialog = $state<Dialog>();
	let loeschen = $state<Dialog>();
	let alsPaar = $state<Dialog>();
	let anfrageLoeschen = $state<Dialog>();

	// Gewählte Zeile und was im Dialog gewählt ist.
	let gewaehlt = $state<Anmeldung | null>(null);
	let anfrage = $state<Anfrage | null>(null);
	// Jedes Öffnen beginnt mit einer leeren Suche.
	let suchlauf = $state(0);
	let erster = $state<SpielerTreffer | null>(null);
	let zweiter = $state<SpielerTreffer | null>(null);
	let bleibtId = $state<number | null>(null);
	let neu = $state<SpielerTreffer | null>(null);
	let mitId = $state<number | null>(null);
	let zielId = $state<number | null>(null);
	let spielerId = $state<number | null>(null);
	let klassierung = $state<Klassierung | ''>('');

	const text = (n: { name: Spieler['name'] }) => nameText(n.name, 'vorname-zuerst');
	const namenVon = (s: readonly { name: Spieler['name'] }[]) => s.map(text);
	const imPaar = (id: number) =>
		(liste?.paare ?? []).some((p) => p.spieler.some((s) => s.mitgliedId === id));
	const andereSuchende = $derived(
		(liste?.suchende ?? []).filter((s) => s.anmeldungId !== gewaehlt?.anmeldungId)
	);
	const bleibt = $derived(gewaehlt?.spieler.find((s) => s.mitgliedId === bleibtId) ?? null);
	const klassierungSpieler = $derived(
		gewaehlt?.spieler.find((s) => s.mitgliedId === spielerId) ?? null
	);
	// Ist ein Spieler nicht mehr aktiv, lehnt der Server das Verschieben ab; der Dialog sagt es vorher.
	const verschiebenSperre = $derived(gewaehlt ? verschiebenGesperrt(gewaehlt.spieler) : null);

	function oeffne(dialog: Dialog | undefined, a: Anmeldung | null) {
		gewaehlt = a;
		oeffneDialog(dialog);
	}

	function oeffneDialog(dialog: Dialog | undefined) {
		rueckmeldung = null;
		zumErgebnis = false;
		dialog?.oeffne();
	}

	function oeffneAnmelden() {
		suchlauf++;
		erster = null;
		zweiter = null;
		oeffne(anmelden, null);
	}

	function oeffnePartner(a: Anmeldung) {
		suchlauf++;
		bleibtId = null;
		neu = null;
		oeffne(partner, a);
	}

	function oeffneZusammen(a: Anmeldung) {
		mitId = null;
		oeffne(zusammen, a);
	}

	function oeffneVerschieben(a: Anmeldung) {
		zielId = null;
		oeffne(verschieben, a);
	}

	function waehleKlassierungSpieler(s: Spieler | null) {
		spielerId = s?.mitgliedId ?? null;
		klassierung = s?.klassierung ?? '';
	}

	function oeffneKlassierung(a: Anmeldung) {
		waehleKlassierungSpieler(a.spieler.length === 1 ? a.spieler[0] : null);
		oeffne(klassierungDialog, a);
	}

	function oeffneAnfrage(dialog: Dialog | undefined, x: Anfrage) {
		anfrage = x;
		oeffneDialog(dialog);
	}

	// Nach einer Aktion geht der Fokus zum Ergebnis, sonst beim Schliessen eines Dialogs zur
	// Überschrift. Das `close` des Dialogs kommt nicht sicher vor dem Ende des Neuladens; bis zum
	// nächsten Öffnen lässt es darum den Fokus beim Ergebnis.
	let zumErgebnis = false;

	async function fertig(satz: string) {
		zumErgebnis = true;
		let geladen = false;
		try {
			await refreshAll();
			geladen = true;
		} finally {
			// Wirft das Neuladen, gibt es kein Ergebnis: Der Fokus geht wie beim Schliessen zur
			// Überschrift, und das nächste Schliessen eines Dialogs ebenso.
			if (!geladen) {
				zumErgebnis = false;
				titel?.focus();
			}
		}
		rueckmeldung = satz;
		await tick();
		rueckmeldungFeld?.focus();
	}

	const zurUeberschrift = () => {
		if (!zumErgebnis) titel?.focus();
	};

	const suchender = (s: DoppelVerwaltung['suchende'][number]): Anmeldung => ({
		anmeldungId: s.anmeldungId,
		spieler: [s.spieler]
	});
</script>

{#snippet spielerName(s: Spieler, id?: string)}
	{@const vermerk = mitgliedVermerk(s.mitgliedStatus)}
	<div>
		<span {id}><Name name={s.name} form="nachname-zuerst" /></span>
		{#if vermerk}<span class={vermerk.klasse}>{vermerk.text}</span>{/if}
	</div>
{/snippet}

{#snippet paarZeile(a: Anmeldung)}
	<p>{paarText(a)}{a.summe === undefined ? '' : ` · ${summeText(a.summe)}`}</p>
{/snippet}

{#snippet klassierungZelle(s: Spieler)}
	{#if s.klassierung}
		{klassierungName(s.klassierung)}
	{:else}
		<span class="plakette plakette-offen">fehlt</span>
	{/if}
{/snippet}

{#snippet taste(name: string, beschrieben: string, onclick: () => void)}
	<button type="button" class="taste-neben" aria-describedby={beschrieben} {onclick}>{name}</button>
{/snippet}

{#snippet tabelle(name: string, kopf: string[], zeilen: Snippet)}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="tabelle"
		role={nurLesen ? 'region' : undefined}
		aria-label={nurLesen ? name : undefined}
		tabindex={nurLesen ? 0 : undefined}
	>
		<table>
			<thead>
				<tr>
					{#each kopf as k (k)}<th>{k}</th>{/each}
					{#if !nurLesen}<th>Aktionen</th>{/if}
				</tr>
			</thead>
			<tbody>{@render zeilen()}</tbody>
		</table>
	</div>
{/snippet}

{#snippet paarZeilen()}
	{#each liste?.paare ?? [] as p (p.anmeldungId)}
		{@const beschrieben = `paar-${p.anmeldungId}`}
		<tr>
			<td id={beschrieben}>
				{#each p.spieler as s (s.mitgliedId)}{@render spielerName(s)}{/each}
			</td>
			<td>
				{#each p.spieler as s (s.mitgliedId)}<div>{@render klassierungZelle(s)}</div>{/each}
			</td>
			<td>
				{#if p.summe === null}
					<span class="plakette plakette-offen">offen</span>
				{:else}
					{p.summe}
				{/if}
			</td>
			{#if !nurLesen}
				<td>
					<div class="leiste">
						{@render taste('Partner ändern', beschrieben, () => oeffnePartner(p))}
						{#if offen}
							{@render taste('Verschieben', beschrieben, () => oeffneVerschieben(p))}
						{/if}
						{@render taste('Klassierung', beschrieben, () => oeffneKlassierung(p))}
						{@render taste('Löschen', beschrieben, () => oeffne(loeschen, p))}
					</div>
				</td>
			{/if}
		</tr>
	{/each}
{/snippet}

{#snippet suchendeZeilen()}
	{#each liste?.suchende ?? [] as s (s.anmeldungId)}
		{@const beschrieben = `suchend-${s.anmeldungId}`}
		<tr>
			<td>{@render spielerName(s.spieler, beschrieben)}</td>
			<td>{@render klassierungZelle(s.spieler)}</td>
			<td>
				{#if s.kommentar}<div class="leise mehrzeilig">{s.kommentar}</div>{:else}–{/if}
			</td>
			{#if !nurLesen}
				<td>
					<div class="leiste">
						{@render taste('Zusammenlegen', beschrieben, () => oeffneZusammen(suchender(s)))}
						{#if offen}
							{@render taste('Verschieben', beschrieben, () => oeffneVerschieben(suchender(s)))}
						{/if}
						{@render taste('Klassierung', beschrieben, () => oeffneKlassierung(suchender(s)))}
						{@render taste('Löschen', beschrieben, () => oeffne(loeschen, suchender(s)))}
					</div>
				</td>
			{/if}
		</tr>
	{/each}
{/snippet}

{#snippet anfrageZeilen()}
	{#each liste?.anfragen ?? [] as a (a.anfrageId)}
		{@const beschrieben = `anfrage-von-${a.anfrageId} anfrage-an-${a.anfrageId}`}
		<tr>
			<td>{@render spielerName(a.von, `anfrage-von-${a.anfrageId}`)}</td>
			<td>{@render spielerName(a.an, `anfrage-an-${a.anfrageId}`)}</td>
			<td>{datumText(a.gestelltAm)}</td>
			{#if !nurLesen}
				<td>
					<div class="leiste">
						{@render taste('Als Paar anmelden', beschrieben, () => oeffneAnfrage(alsPaar, a))}
						{@render taste('Löschen', beschrieben, () => oeffneAnfrage(anfrageLoeschen, a))}
					</div>
				</td>
			{/if}
		</tr>
	{/each}
{/snippet}

{#snippet teil(name: string, anzahl: number, kopf: string[], zeilen: Snippet)}
	<div class="karte-teil">
		<h3>{name} ({anzahl})</h3>
		{#if anzahl === 0}
			<p>Keine.</p>
		{:else}
			{@render tabelle(name, kopf, zeilen)}
		{/if}
	</div>
{/snippet}

<h2 tabindex="-1" bind:this={titel}>Anmeldungen</h2>
<div class="karte">
	{#if liste === null}
		<p class="fehler" role="alert">Die Anmeldungen lassen sich gerade nicht laden.</p>
		<button type="button" class="taste-neben" onclick={() => refreshAll()}>Neu laden</button>
	{:else}
		{#if !nurLesen}
			{#if turnier === null}
				<p class="fehler" role="alert">
					Das Turnier lässt sich gerade nicht laden. Von Hand anmelden und verschieben gehen erst
					danach.
				</p>
			{:else if turnier.vorbereitung}
				<p class="leise">
					Von Hand anmelden und verschieben gehen, sobald die Anmeldung offen ist.
				</p>
			{/if}
			<div class="leiste">
				<button type="button" class="taste-neben" onclick={() => refreshAll()}>Neu laden</button>
				{#if offen}
					<button type="button" class="taste-neben" onclick={oeffneAnmelden}
						>Von Hand anmelden</button
					>
				{/if}
			</div>
		{/if}
		<p class="leise" role="status" tabindex="-1" bind:this={rueckmeldungFeld}>
			{#if rueckmeldung}{rueckmeldung}{/if}
		</p>
		{@render teil('Paare', liste.paare.length, ['Paar', 'Klassierungen', 'Summe'], paarZeilen)}
		{@render teil(
			'Sucht Partner',
			liste.suchende.length,
			['Name', 'Klassierung', 'Kommentar'],
			suchendeZeilen
		)}
		{@render teil('Offene Anfragen', liste.anfragen.length, ['Von', 'An', 'Seit'], anfrageZeilen)}
	{/if}
</div>

{#if !nurLesen}
	<Aktionsdialog
		bind:this={anmelden}
		id="doppel-anmelden"
		titel="Von Hand anmelden"
		taste="Anmelden"
		trotzdemTaste="Trotzdem anmelden"
		bereit={erster !== null}
		namen={namenVon([erster, zweiter].filter((t) => t !== null))}
		aktion={(trotzdem) =>
			meldeDoppelAn(
				kategorieId,
				zweiter ? [erster!.mitgliedId, zweiter.mitgliedId] : [erster!.mitgliedId],
				trotzdem
			)}
		erfolg="Angemeldet."
		folgen={{
			'schon-angemeldet': 'Schon angemeldet. Zwei Suchende legst du mit «Zusammenlegen» zusammen.',
			vorbereitung: VORBEREITUNG,
			'nicht-gefunden': 'Mitglied oder Kategorie ist nicht mehr aktiv.'
		}}
		onfertig={fertig}
		onschliessen={zurUeberschrift}
	>
		{#key suchlauf}
			<Spielersuche
				id="doppel-erster"
				label="Mitglied suchen"
				gewaehlt={erster?.mitgliedId ?? null}
				gesperrt={(id) =>
					imPaar(id) ? 'schon angemeldet' : id === zweiter?.mitgliedId ? 'schon gewählt' : null}
				onwahl={(t) => {
					erster = t;
					anmelden?.verwerfe();
				}}
			/>
			<Spielersuche
				id="doppel-zweiter"
				label="Partner suchen (freiwillig)"
				legende="Treffer für den Partner"
				hilfe="Leer lassen, wenn er noch einen Partner sucht."
				gewaehlt={zweiter?.mitgliedId ?? null}
				gesperrt={(id) =>
					imPaar(id) ? 'schon angemeldet' : id === erster?.mitgliedId ? 'schon gewählt' : null}
				onwahl={(t) => {
					zweiter = t;
					anmelden?.verwerfe();
				}}
			/>
		{/key}
	</Aktionsdialog>

	<Aktionsdialog
		bind:this={partner}
		id="doppel-partner"
		titel="Partner ändern"
		taste="Partner ändern"
		trotzdemTaste="Trotzdem ändern"
		bereit={bleibtId !== null}
		namen={neu ? [text(neu)] : []}
		aktion={(trotzdem) =>
			aenderePartner(gewaehlt!.anmeldungId, bleibtId!, neu?.mitgliedId ?? null, trotzdem)}
		erfolg="Partner geändert."
		folgen={{
			'schon-angemeldet': 'Der neue Partner ist hier schon zu zweit angemeldet.',
			vorbereitung: VORBEREITUNG,
			'nicht-gefunden': WEG
		}}
		onfertig={fertig}
		onschliessen={zurUeberschrift}
	>
		{#if gewaehlt}
			{@const a = gewaehlt}
			{@render paarZeile(a)}
			<fieldset class="auswahl-gruppe">
				<legend>Wer bleibt?</legend>
				{#each a.spieler as s (s.mitgliedId)}
					{@const grund = nichtAktivGrund(s.mitgliedStatus)}
					<label class="auswahl">
						<input
							type="radio"
							name="partner-bleibt"
							value={s.mitgliedId}
							checked={bleibtId === s.mitgliedId}
							disabled={grund !== null}
							onchange={() => {
								bleibtId = s.mitgliedId;
								partner?.verwerfe();
							}}
						/><span
							><Name name={s.name} form="nachname-zuerst" />{#if grund}<br /><span class="leise"
									>{grund}</span
								>{/if}</span
						>
					</label>
				{/each}
			</fieldset>
			{#key suchlauf}
				<Spielersuche
					id="partner-neu"
					label="Neuen Partner suchen (freiwillig)"
					hilfe={`Leer lassen: ${bleibt ? text(bleibt) : 'Wer bleibt,'} sucht danach selbst.`}
					gewaehlt={neu?.mitgliedId ?? null}
					gesperrt={(id) =>
						a.spieler.some((s) => s.mitgliedId === id)
							? 'schon in diesem Paar'
							: imPaar(id)
								? 'schon angemeldet'
								: null}
					onwahl={(t) => {
						neu = t;
						partner?.verwerfe();
					}}
				/>
			{/key}
		{/if}
	</Aktionsdialog>

	<Aktionsdialog
		bind:this={zusammen}
		id="doppel-zusammen"
		titel="Zusammenlegen"
		taste="Zusammenlegen"
		trotzdemTaste="Trotzdem zusammenlegen"
		bereit={mitId !== null}
		namen={namenVon([
			...(gewaehlt?.spieler ?? []),
			...andereSuchende.filter((s) => s.anmeldungId === mitId).map((s) => s.spieler)
		])}
		aktion={(trotzdem) => legeZusammen(gewaehlt!.anmeldungId, mitId!, trotzdem)}
		erfolg="Zusammengelegt."
		folgen={{ vorbereitung: VORBEREITUNG, 'nicht-gefunden': 'Einer der beiden sucht nicht mehr.' }}
		onfertig={fertig}
		onschliessen={zurUeberschrift}
	>
		{#if gewaehlt}
			<p><Name name={gewaehlt.spieler[0].name} form="nachname-zuerst" /></p>
			{#if andereSuchende.length === 0}
				<p>Sonst sucht niemand einen Partner.</p>
			{:else}
				<fieldset class="auswahl-gruppe">
					<legend>Mit</legend>
					{#each andereSuchende as s (s.anmeldungId)}
						<label class="auswahl">
							<input
								type="radio"
								name="zusammen-mit"
								value={s.anmeldungId}
								checked={mitId === s.anmeldungId}
								onchange={() => {
									mitId = s.anmeldungId;
									zusammen?.verwerfe();
								}}
							/><Name name={s.spieler.name} form="nachname-zuerst" />
						</label>
					{/each}
				</fieldset>
			{/if}
		{/if}
	</Aktionsdialog>

	<Aktionsdialog
		bind:this={verschieben}
		id="doppel-verschieben"
		titel="Verschieben"
		taste="Verschieben"
		trotzdemTaste="Trotzdem verschieben"
		bereit={zielId !== null && verschiebenSperre === null}
		namen={namenVon(gewaehlt?.spieler ?? [])}
		aktion={(trotzdem) => verschiebeAnmeldung(gewaehlt!.anmeldungId, zielId!, trotzdem)}
		erfolg="Verschoben."
		folgen={{
			'schon-angemeldet': 'Ist dort schon angemeldet.',
			vorbereitung: VORBEREITUNG,
			'nicht-gefunden': WEG
		}}
		onfertig={fertig}
		onschliessen={zurUeberschrift}
	>
		{#if gewaehlt}
			{@render paarZeile(gewaehlt)}
			{#if verschiebenSperre}
				<p>{verschiebenSperre}</p>
			{:else if andere.length === 0}
				<p>Es gibt keine andere aktive Doppel-Kategorie.</p>
			{:else}
				<fieldset class="auswahl-gruppe">
					<legend>Nach</legend>
					{#each andere as k (k.id)}
						<label class="auswahl">
							<input
								type="radio"
								name="doppel-verschieben-ziel"
								value={k.id}
								checked={zielId === k.id}
								onchange={() => {
									zielId = k.id;
									verschieben?.verwerfe();
								}}
							/>{k.name}
						</label>
					{/each}
				</fieldset>
			{/if}
		{/if}
	</Aktionsdialog>

	<Aktionsdialog
		bind:this={klassierungDialog}
		id="doppel-klassierung"
		titel="Klassierung korrigieren"
		taste="Klassierung speichern"
		bereit={klassierungSpieler !== null &&
			klassierung !== '' &&
			klassierung !== klassierungSpieler.klassierung}
		aktion={() => korrigiereKlassierung(spielerId!, klassierung as Klassierung)}
		erfolg="Klassierung gespeichert."
		folgen={{ 'nicht-gefunden': 'Dieses Mitglied gibt es nicht mehr.' }}
		onfertig={fertig}
		onschliessen={zurUeberschrift}
	>
		{#if gewaehlt}
			{#if gewaehlt.spieler.length === 1}
				<p><Name name={gewaehlt.spieler[0].name} form="nachname-zuerst" /></p>
			{:else}
				<fieldset class="auswahl-gruppe">
					<legend>Spieler</legend>
					{#each gewaehlt.spieler as s (s.mitgliedId)}
						<label class="auswahl">
							<input
								type="radio"
								name="doppel-klassierung-spieler"
								value={s.mitgliedId}
								checked={spielerId === s.mitgliedId}
								onchange={() => waehleKlassierungSpieler(s)}
							/><Name name={s.name} form="nachname-zuerst" />
						</label>
					{/each}
				</fieldset>
			{/if}
			<div class="feld">
				<label for="doppel-klassierung-wahl">Klassierung</label>
				<select
					id="doppel-klassierung-wahl"
					bind:value={klassierung}
					disabled={klassierungSpieler === null}
				>
					<option value="" disabled>–</option>
					{#each KLASSIERUNGEN as k (k)}
						<option value={k}>{klassierungName(k)}</option>
					{/each}
				</select>
			</div>
		{/if}
	</Aktionsdialog>

	<Aktionsdialog
		bind:this={loeschen}
		id="doppel-loeschen"
		titel="Anmeldung löschen?"
		taste="Löschen"
		aktion={() => loescheAnmeldung(gewaehlt!.anmeldungId)}
		erfolg="Gelöscht."
		folgen={{ 'nicht-gefunden': WEG }}
		onfertig={fertig}
		onschliessen={zurUeberschrift}
	>
		{#if gewaehlt}
			<p>{paarText(gewaehlt)}</p>
		{/if}
	</Aktionsdialog>

	<Aktionsdialog
		bind:this={alsPaar}
		id="doppel-als-paar"
		titel="Als Paar anmelden?"
		taste="Als Paar anmelden"
		trotzdemTaste="Trotzdem anmelden"
		namen={anfrage ? namenVon([anfrage.von, anfrage.an]) : []}
		aktion={(trotzdem) => meldeAnfrageAlsPaarAn(anfrage!.anfrageId, trotzdem)}
		erfolg="Als Paar angemeldet."
		folgen={{
			'schon-angemeldet': 'Einer der beiden ist schon zu zweit angemeldet.',
			vorbereitung: VORBEREITUNG,
			'nicht-gefunden': ANFRAGE_WEG
		}}
		onfertig={fertig}
		onschliessen={zurUeberschrift}
	>
		{#if anfrage}
			<p>{paarText({ spieler: [anfrage.von, anfrage.an] })}</p>
		{/if}
	</Aktionsdialog>

	<Aktionsdialog
		bind:this={anfrageLoeschen}
		id="doppel-anfrage-loeschen"
		titel="Anfrage löschen?"
		taste="Löschen"
		aktion={() => loescheAnfrage(anfrage!.anfrageId)}
		erfolg="Anfrage gelöscht."
		folgen={{ 'nicht-gefunden': ANFRAGE_WEG }}
		onfertig={fertig}
		onschliessen={zurUeberschrift}
	>
		{#if anfrage}
			<p>{paarText({ spieler: [anfrage.von, anfrage.an] })}</p>
			<p>{text(anfrage.von)} erfährt es.</p>
		{/if}
	</Aktionsdialog>
{/if}
