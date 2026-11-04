<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { MELDUNG } from '../../../../lib/login/anmelden.ts';
	import Angabenformular, {
		werteAus,
		type Werte
	} from '../../../../lib/verwaltung/Angabenformular.svelte';
	import {
		beendeSitzungen,
		speichereAngaben,
		speichereRollen,
		type Feld,
		type Rolle
	} from '../../../../lib/verwaltung/api.ts';
	import {
		ROLLEN_NAMEN,
		VERGEBEN,
		aktionText,
		plakette,
		tagText,
		zeitText
	} from '../../../../lib/verwaltung/anzeige.ts';
	import { leiteUm } from '../../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const detail = $derived(data.detail);
	const angaben = $derived(detail.angaben);
	const stand = $derived(plakette({ login: detail.login.stand, status: detail.status }));

	// Das Formular wird neu aufgebaut, wenn sich die gespeicherten Angaben ändern.
	const angabenSchluessel = $derived(JSON.stringify(angaben));

	// Angaben
	let angabenFehler = $state<Partial<Record<Feld, string>>>({});
	let angabenMeldung = $state<string | null>(null);
	let angabenStoerung = $state<string | null>(null);

	async function speichereWerte(werte: Werte) {
		angabenFehler = {};
		angabenMeldung = null;
		angabenStoerung = null;
		const a = await speichereAngaben(detail.id, werte);
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			angabenMeldung = 'Gespeichert';
			await invalidateAll();
		} else if (a.art === 'eingabe') {
			angabenFehler = a.felder;
		} else if (a.art === 'vergeben') {
			angabenFehler = { [a.feld]: VERGEBEN[a.feld as 'email' | 'mitgliedernummer'] };
		} else {
			angabenStoerung = MELDUNG.stoerung;
		}
	}

	// Rollen: «Mitglied» hat jedes Konto, die übrigen wählt der Admin.
	const WAHL: Rolle[] = ['admin', 'cm', 'lizenz'];
	let gewaehlt = $derived<Rolle[]>(detail.rollen);
	let rollenMeldung = $state<string | null>(null);
	let rollenFehler = $state<string | null>(null);
	const rollenGeaendert = $derived(
		WAHL.some((r) => gewaehlt.includes(r) !== detail.rollen.includes(r))
	);

	function waehle(rolle: Rolle, an: boolean) {
		gewaehlt = an ? [...gewaehlt, rolle] : gewaehlt.filter((r) => r !== rolle);
	}

	async function speichereDieRollen() {
		rollenMeldung = null;
		rollenFehler = null;
		const a = await speichereRollen(detail.id, gewaehlt);
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			rollenMeldung = 'Rollen gespeichert';
			await invalidateAll();
		} else if (a.art === 'letzter-admin') {
			rollenFehler = 'Du bist der letzte Admin. Gib zuerst jemand anderem die Rolle Admin.';
		} else {
			rollenFehler = MELDUNG.stoerung;
		}
	}

	// Sitzungen beenden: erst Rückfrage im <dialog>
	let rueckfrage = $state<HTMLDialogElement>();
	let sitzungenMeldung = $state<string | null>(null);
	let sitzungenFehler = $state<string | null>(null);

	async function beende() {
		sitzungenMeldung = null;
		sitzungenFehler = null;
		const a = await beendeSitzungen(detail.id);
		rueckfrage?.close();
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			sitzungenMeldung = 'Alle Sitzungen beendet.';
			await invalidateAll();
		} else {
			sitzungenFehler = MELDUNG.stoerung;
		}
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
	<title>{angaben.nachname}, {angaben.vorname} – MyTCO</title>
</svelte:head>

<a class="zurueck" href={resolve('/verwaltung/mitglieder')}>‹ Zurück</a>
<h1>{angaben.nachname}, {angaben.vorname} <span class={stand.klasse}>{stand.text}</span></h1>
{#if angaben.mitgliedernummer}
	<p class="leise">Mitgliedernummer {angaben.mitgliedernummer}</p>
{/if}

<div class="spalten">
	<div>
		<details class="karte klappe" open>
			<summary class="klappe-titel">Angaben</summary>
			{#key angabenSchluessel}
				<Angabenformular
					start={werteAus(angaben)}
					fehler={angabenFehler}
					knopf="Angaben speichern"
					nurBeiAenderung
					rueckmeldung={angabenMeldung}
					onspeichern={speichereWerte}
				/>
			{/key}
			{#if angabenStoerung}
				<p class="fehler" role="alert">{angabenStoerung}</p>
			{/if}
		</details>

		<details class="karte klappe" open>
			<summary class="klappe-titel"
				>Verlauf <span class="leise"
					>{detail.verlauf.length} {detail.verlauf.length === 1 ? 'Eintrag' : 'Einträge'}</span
				></summary
			>
			<div class="tabelle">
				<table aria-label="Verlauf">
					<tbody>
						{#each detail.verlauf as z, i (i)}
							<tr><td>{zeitText(z.zeitpunkt)}</td><td>{z.urheber}</td><td>{aktionText(z)}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="leise">Ohne alte und neue Werte.</p>
			<a href="{resolve('/verwaltung/verlauf')}?mitglied={detail.id}">Ganzer Verlauf ›</a>
		</details>
	</div>

	<div>
		<details class="karte klappe" open>
			<summary class="klappe-titel"
				>Login <span class="leise"
					>{stand.text} · {detail.login.geraete === 0
						? 'kein Gerät'
						: `${detail.login.geraete} ${detail.login.geraete === 1 ? 'Gerät' : 'Geräte'}`}</span
				></summary
			>
			<p>{loginText} {geraeteText}</p>
			<div class="leiste">
				<button type="button" class="taste-neben" onclick={() => rueckfrage?.showModal()}
					>Alle Sitzungen beenden</button
				>
			</div>
			<p class="leise" role="status">{sitzungenMeldung ?? ''}</p>
			{#if sitzungenFehler}
				<p class="fehler" role="alert">{sitzungenFehler}</p>
			{/if}
		</details>

		<details class="karte klappe" open>
			<summary class="klappe-titel"
				>Rollen <span class="leise"
					>{['Mitglied', ...detail.rollen.map((r) => ROLLEN_NAMEN[r])].join(' · ')}</span
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
							aria-describedby={r === 'admin' && rollenFehler ? 'rollen-fehler' : undefined}
						/>
						{ROLLEN_NAMEN[r]}</label
					>
				</p>
			{/each}
			{#if rollenFehler}
				<p class="fehler" id="rollen-fehler" role="alert">{rollenFehler}</p>
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
	</div>
</div>

<dialog class="karte" bind:this={rueckfrage} aria-labelledby="sitzungen-titel">
	<h2 id="sitzungen-titel">Alle Sitzungen beenden?</h2>
	<p>Alle Geräte von {angaben.vorname} werden abgemeldet.</p>
	<div class="leiste">
		<button type="button" class="taste-neben" onclick={() => rueckfrage?.close()}>Abbrechen</button>
		<button type="button" class="taste-haupt" onclick={beende}>Sitzungen beenden</button>
	</div>
</dialog>
