<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Pfad from '../../../../lib/verwaltung/Pfad.svelte';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import Briefdruck from '../../../../lib/verwaltung/Briefdruck.svelte';
	import Angabenformular, {
		werteAus,
		type Werte
	} from '../../../../lib/verwaltung/Angabenformular.svelte';
	import {
		beendeSitzungen,
		erzeugeBrief,
		speichereAngaben,
		speichereRollen,
		type AusgestellterBrief,
		type Feld,
		type Rolle
	} from '../../../../lib/verwaltung/api.ts';
	import {
		VERALTET,
		VERGEBEN,
		aktionText,
		plakette,
		tagText,
		zeitText,
		fehlerText
	} from '../../../../lib/verwaltung/anzeige.ts';
	import Mitgliedschaft from '../../../../lib/verwaltung/Mitgliedschaft.svelte';
	import { ROLLEN_NAME } from '../../../../lib/verwaltung/rollen-namen.ts';
	import { leiteUm } from '../../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const detail = $derived(data.detail);
	const angaben = $derived(detail.angaben);
	const stand = $derived(plakette({ login: detail.login.stand, status: detail.status }));

	// Das Formular wird neu aufgebaut, wenn sich die gespeicherten Angaben ändern und nach jedem
	// Speichern (auch wenn der Server nur Leerzeichen bereinigt hat und die Angaben gleich bleiben).
	let nachSpeichern = $state(0);
	const angabenSchluessel = $derived(`${nachSpeichern}:${JSON.stringify(angaben)}`);

	// Angaben
	let angabenFehler = $state<Partial<Record<Feld, string>>>({});
	let angabenMeldung = $state<string | null>(null);
	let angabenStoerung = $state<string | null>(null);
	// Ein anderer hat seit dem Laden gespeichert: nichts gespeichert, die Eingaben bleiben stehen.
	// Die Meldung gilt nur für den Stand, bei dem sie kam; lädt die Seite neue Angaben (auch über
	// «Rollen speichern»), verschwindet sie.
	let veraltetBei = $state<string | null>(null);
	const angabenVeraltet = $derived(veraltetBei === JSON.stringify(angaben));
	// Solange die Angaben abweichen, ginge ein Brief an die alte Adresse: erst speichern.
	let angabenFormular = $state<ReturnType<typeof Angabenformular>>();
	const angabenUngespeichert = $derived(angabenFormular?.ungespeichert() ?? false);

	const speichereWerte = (werte: Werte) => einzeln(() => schickeAngaben(werte));
	async function schickeAngaben(werte: Werte) {
		angabenFehler = {};
		angabenMeldung = null;
		angabenStoerung = null;
		veraltetBei = null;
		const a = await speichereAngaben(detail.id, werte, detail.angaben);
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			angabenMeldung = 'Gespeichert';
			await invalidateAll();
			nachSpeichern += 1;
		} else if (a.art === 'eingabe') {
			angabenFehler = a.felder;
		} else if (a.art === 'vergeben') {
			angabenFehler = { [a.feld]: VERGEBEN[a.feld as 'email' | 'mitgliedernummer'] };
		} else if (a.art === 'veraltet') {
			veraltetBei = JSON.stringify(angaben);
		} else {
			angabenStoerung = fehlerText(a);
		}
	}

	// Verwirft die Eingaben und baut das Formular mit dem gespeicherten Stand neu auf.
	const ladeNeuenStand = () =>
		einzeln(async () => {
			await invalidateAll();
			veraltetBei = null;
			nachSpeichern += 1;
		});

	// Rollen: «Mitglied» hat jedes Konto, die übrigen vergibt nur der MyTCO-Admin.
	const WAHL: Rolle[] = ['mytco', 'mitglieder', 'cm', 'lizenz'];
	const darfRollen = $derived(data.darfSchreiben.rollen);
	// Regel 3: Der MyTCO-Admin liest die Angaben, ändern kann sie nur der Mitglieder-Admin.
	const nurLesen = $derived(!data.darfSchreiben.mitglieder);
	// Die Auswahl wird nur neu gesetzt, wenn sich die gespeicherten Rollen ändern; ungespeicherte
	// Häkchen überstehen ein Neuladen nach «Angaben speichern».
	const rollenSchluessel = $derived([...detail.rollen].sort().join(','));
	let gewaehlt = $derived<Rolle[]>(
		rollenSchluessel === '' ? [] : (rollenSchluessel.split(',') as Rolle[])
	);
	// Eine Anfrage nach der anderen: ein Doppelklick schickt nicht zwei Mal (Verlaufseinträge).
	// Solange eine läuft, sind die Tasten der Rückfragen gesperrt.
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
	let rollenMeldung = $state<string | null>(null);
	let rollenFehler = $state<string | null>(null);
	// Wie bei den Angaben: Die Meldung gilt nur für den Stand, bei dem sie kam.
	let rollenVeraltetBei = $state<string | null>(null);
	const rollenVeraltet = $derived(rollenVeraltetBei === rollenSchluessel);
	const ladeNeueRollen = () => einzeln(() => invalidateAll());
	const rollenGeaendert = $derived(
		WAHL.some((r) => gewaehlt.includes(r) !== detail.rollen.includes(r))
	);

	function waehle(rolle: Rolle, an: boolean) {
		gewaehlt = an ? [...gewaehlt, rolle] : gewaehlt.filter((r) => r !== rolle);
	}

	// Wer sich selbst die Rolle MyTCO-Admin entzieht, kann keine Rollen mehr vergeben: vorher eine
	// Rückfrage.
	let rollenRueckfrage = $state<HTMLDialogElement>();
	const verliertMytco = $derived(
		data.eigeneMitgliedId === detail.id &&
			detail.rollen.includes('mytco') &&
			!gewaehlt.includes('mytco')
	);
	function speichereDieRollen() {
		if (verliertMytco) rollenRueckfrage?.showModal();
		else void einzeln(schickeRollen);
	}
	function entziehe() {
		rollenRueckfrage?.close();
		void einzeln(schickeRollen);
	}
	async function schickeRollen() {
		rollenMeldung = null;
		rollenFehler = null;
		rollenVeraltetBei = null;
		const a = await speichereRollen(detail.id, gewaehlt, detail.rollen);
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			rollenMeldung = 'Rollen gespeichert';
			await invalidateAll();
		} else if (a.art === 'letzter-mytco') {
			rollenFehler =
				'Du bist der letzte MyTCO-Admin. Gib zuerst jemand anderem die Rolle MyTCO-Admin.';
		} else if (a.art === 'veraltet') {
			rollenVeraltetBei = rollenSchluessel;
		} else {
			rollenFehler = fehlerText(a);
		}
	}

	// Sitzungen beenden: erst Rückfrage im <dialog>
	let rueckfrage = $state<HTMLDialogElement>();
	let sitzungenMeldung = $state<string | null>(null);
	let sitzungenFehler = $state<string | null>(null);

	const beende = () => einzeln(schickeSitzungen);
	async function schickeSitzungen() {
		sitzungenMeldung = null;
		sitzungenFehler = null;
		const a = await beendeSitzungen(detail.id);
		rueckfrage?.close();
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			sitzungenMeldung = 'Alle Sitzungen beendet.';
			await invalidateAll();
		} else {
			sitzungenFehler = fehlerText(a);
		}
	}

	// Neuer Brief-Code (A-LOGIN-01, RR-04): nur für aktive, nicht gesperrte Mitglieder mit Adresse.
	// Die Codes leben nur in diesem Zustand, nie in der Adresse oder im Speicher.
	const adresseFehlt = $derived(
		[angaben.strasse, angaben.plz, angaben.ort].some((w) => w.trim() === '')
	);
	const briefMoeglich = $derived(detail.status === 'aktiv' && detail.login.stand !== 'gesperrt');
	let briefe = $state.raw<AusgestellterBrief[] | null>(null);
	let briefFehler = $state<string | null>(null);
	let briefRueckfrage = $state<HTMLDialogElement>();
	let titel = $state<HTMLHeadingElement>();

	const stelleAus = () => einzeln(schickeBrief);
	async function schickeBrief() {
		briefFehler = null;
		const a = await erzeugeBrief(detail.id);
		briefRueckfrage?.close();
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			briefe = a.daten.briefe;
		} else if (a.art === 'nicht-moeglich') {
			briefFehler = 'Für dieses Mitglied lässt sich kein Brief erstellen.';
			await invalidateAll();
		} else {
			briefFehler = fehlerText(a);
		}
	}

	// Verwirft den Brief samt Code und zeigt wieder das Mitglied; der Fokus geht zum Titel.
	async function zurueckZumMitglied() {
		briefe = null;
		await tick();
		titel?.focus();
		await invalidateAll();
	}

	const loginText = $derived.by(() => {
		const l = detail.login;
		switch (l.stand) {
			case 'ohne-brief':
				return 'Für dieses Mitglied gibt es noch keinen Brief-Code.';
			case 'brief-offen':
				return l.briefGueltigBis
					? `Brief-Code gültig bis ${tagText(l.briefGueltigBis)}, noch nicht eingelöst.`
					: 'Brief-Code ausgestellt, noch nicht eingelöst.';
			case 'gesperrt':
				return 'Das Konto ist gesperrt.';
			default:
				return l.zuletztGenutzt ? `Zuletzt genutzt am ${zeitText(l.zuletztGenutzt)}.` : '';
		}
	});
	const geraeteText = $derived(
		detail.login.geraete === 0
			? 'Noch kein Gerät eingeloggt.'
			: `${detail.login.geraete} ${detail.login.geraete === 1 ? 'Gerät' : 'Geräte'} eingeloggt.`
	);
</script>

<svelte:head>
	<title>Mitglied – MyTCO</title>
</svelte:head>

{#if briefe}
	<Briefdruck {briefe} zurueck={zurueckZumMitglied} />
{:else}
	<Pfad
		stufen={[{ text: 'Mitglieder', href: resolve('/verwaltung/mitglieder') }]}
		aktuell={`${angaben.nachname}, ${angaben.vorname}`}
	/>
	<h1 tabindex="-1" bind:this={titel}>
		{angaben.nachname}, {angaben.vorname} <span class={stand.klasse}>{stand.text}</span>
	</h1>
	{#if detail.rufname}
		<p class="leise">Rufname {detail.rufname}</p>
	{/if}
	{#if angaben.mitgliedernummer}
		<p class="leise">Mitgliedernummer {angaben.mitgliedernummer}</p>
	{/if}

	<div class="spalten">
		<div>
			<details class="karte klappe" open>
				<summary class="klappe-titel">Angaben</summary>
				{#key angabenSchluessel}
					<Angabenformular
						bind:this={angabenFormular}
						start={werteAus(angaben)}
						fehler={angabenFehler}
						knopf="Angaben speichern"
						nurBeiAenderung
						rueckmeldung={angabenMeldung}
						{nurLesen}
						onspeichern={speichereWerte}
					/>
				{/key}
				{#if angabenVeraltet}
					<p class="fehler" role="alert">{VERALTET}</p>
					<div class="leiste">
						<button type="button" class="taste-neben" onclick={ladeNeuenStand}
							>Neuen Stand laden</button
						>
					</div>
				{/if}
				{#if angabenStoerung}
					<p class="fehler" role="alert">{angabenStoerung}</p>
				{/if}
			</details>

			<details class="karte klappe" open>
				<summary class="klappe-titel"
					>Verlauf <span class="leise"
						>{detail.verlaufGekuerzt
							? `die letzten ${detail.verlauf.length} Einträge`
							: `${detail.verlauf.length} ${detail.verlauf.length === 1 ? 'Eintrag' : 'Einträge'}`}</span
					></summary
				>
				<div class="tabelle">
					<table aria-label="Verlauf">
						<tbody>
							{#each detail.verlauf as z, i (i)}
								<tr><td>{zeitText(z.zeitpunkt)}</td><td>{z.urheber}</td><td>{aktionText(z)}</td></tr
								>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="leise">Ohne alte und neue Werte.</p>
				<a href="{resolve('/verwaltung/verlauf')}?mitglied={detail.id}">Ganzer Verlauf ›</a>
			</details>
		</div>

		<div>
			<Mitgliedschaft {detail} {nurLesen} eigene={data.eigeneMitgliedId === detail.id} />

			<details class="karte klappe" open>
				<summary class="klappe-titel"
					>Login <span class="leise"
						>{stand.text} · {detail.login.geraete === 0
							? 'kein Gerät'
							: `${detail.login.geraete} ${detail.login.geraete === 1 ? 'Gerät' : 'Geräte'}`}</span
					></summary
				>
				<p>{loginText} {geraeteText}</p>
				{#if !nurLesen}
					<div class="leiste">
						<button type="button" class="taste-neben" onclick={() => rueckfrage?.showModal()}
							>Alle Sitzungen beenden</button
						>
					</div>
					<p class="leise" role="status">{sitzungenMeldung ?? ''}</p>
					{#if sitzungenFehler}
						<p class="fehler" role="alert">{sitzungenFehler}</p>
					{/if}
					{#if briefMoeglich}
						{#if adresseFehlt}
							<p class="leise">Für einen Brief fehlt die Adresse.</p>
						{:else}
							<div class="leiste">
								<button
									type="button"
									class="taste-neben"
									disabled={angabenUngespeichert}
									aria-describedby={angabenUngespeichert ? 'brief-erst-speichern' : undefined}
									onclick={() => briefRueckfrage?.showModal()}>Neuen Brief-Code ausstellen</button
								>
							</div>
							{#if angabenUngespeichert}
								<p class="leise" id="brief-erst-speichern">Speichere zuerst die Angaben.</p>
							{/if}
						{/if}
					{/if}
					{#if briefFehler}
						<p class="fehler" role="alert">{briefFehler}</p>
					{/if}
				{/if}
			</details>

			{#if darfRollen}
				<details class="karte klappe" data-ungespeichert={rollenGeaendert ? '' : undefined}>
					<summary class="klappe-titel"
						>Rollen <span class="leise"
							>{['Mitglied', ...detail.rollen.map((r) => ROLLEN_NAME[r])].join(' · ')}</span
						></summary
					>
					<p>
						<label><input type="checkbox" checked disabled /> Mitglied (immer)</label>
					</p>
					{#each WAHL as r (r)}
						<p>
							<label
								><input
									type="checkbox"
									checked={gewaehlt.includes(r)}
									onchange={(e) => waehle(r, e.currentTarget.checked)}
									aria-describedby={r === 'mytco' && rollenFehler ? 'rollen-fehler' : undefined}
								/>
								{ROLLEN_NAME[r]}</label
							>
						</p>
					{/each}
					{#if rollenFehler}
						<p class="fehler" id="rollen-fehler" role="alert">{rollenFehler}</p>
					{/if}
					{#if rollenVeraltet}
						<p class="fehler" role="alert">{VERALTET}</p>
						<div class="leiste">
							<button type="button" class="taste-neben" onclick={ladeNeueRollen}
								>Neuen Stand laden</button
							>
						</div>
					{/if}
					<div class="leiste">
						<button
							type="button"
							class="taste-neben"
							disabled={!rollenGeaendert}
							onclick={speichereDieRollen}>Rollen speichern</button
						>
					</div>
					<p class="leise" role="status">{rollenGeaendert ? '' : (rollenMeldung ?? '')}</p>
				</details>
			{/if}
		</div>
	</div>
{/if}

<dialog class="karte" bind:this={rollenRueckfrage} aria-labelledby="rollen-titel">
	<h2 id="rollen-titel">Rolle MyTCO-Admin entziehen?</h2>
	<p>Du kannst danach keine Rollen mehr vergeben.</p>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => rollenRueckfrage?.close()}
			>Abbrechen</button
		>
		<button type="button" class="taste-haupt" onclick={entziehe}>Rolle entziehen</button>
	</div>
</dialog>

<dialog class="karte" bind:this={rueckfrage} aria-labelledby="sitzungen-titel">
	<h2 id="sitzungen-titel">Alle Sitzungen beenden?</h2>
	<p>Alle Geräte von {angaben.vorname} werden abgemeldet.</p>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => rueckfrage?.close()}>Abbrechen</button>
		<button type="button" class="taste-haupt" onclick={beende}>Sitzungen beenden</button>
	</div>
</dialog>

{#if !nurLesen}
	<dialog class="karte" bind:this={briefRueckfrage} aria-labelledby="brief-titel">
		<h2 id="brief-titel">Neuen Brief-Code ausstellen?</h2>
		<p>Der alte Brief-Code gilt dann nicht mehr. Eingeloggte Geräte bleiben eingeloggt.</p>
		<div class="leiste">
			<button type="button" class="taste-neben" onclick={() => briefRueckfrage?.close()}
				>Abbrechen</button
			>
			<button
				type="button"
				class="taste-haupt"
				disabled={laeuft}
				aria-busy={laeuft}
				onclick={stelleAus}>Ausstellen</button
			>
		</div>
	</dialog>
{/if}
