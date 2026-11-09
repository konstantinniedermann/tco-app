<script lang="ts">
	import Seitenkopf from '../../../lib/verwaltung/Seitenkopf.svelte';
	import { asset, resolve } from '$app/paths';
	import {
		liesMitgliederEin,
		zeigeEinleseVorschau,
		type Vorschau
	} from '../../../lib/verwaltung/api.ts';
	import { fehlerText } from '../../../lib/verwaltung/anzeige.ts';
	import {
		dateiFehlerText,
		MAX_BYTES,
		SPALTEN,
		VORHANDEN_GRUND,
		VORLAGE,
		zeilenFehlerText
	} from '../../../lib/verwaltung/einlesen.ts';
	import { leiteUm } from '../../../lib/verwaltung/umleiten.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// Regel 3: Der MyTCO-Admin sieht Beschreibung und Vorlage, einlesen kann nur der Mitglieder-Admin.
	const darfEinlesen = $derived(data.darfSchreiben.mitglieder);

	// DS-06: Der Text der Datei lebt nur in diesem Zustand, bis zur Übernahme oder zur nächsten Wahl.
	let text = $state.raw<string | null>(null);
	let vorschau = $state.raw<Vorschau | null>(null);
	let fehler = $state<string | null>(null);
	let angelegt = $state<number | null>(null);
	let rueckfrage = $state<HTMLDialogElement>();
	let dateiwahl = $state<HTMLInputElement>();

	const anzahlText = (n: number) => (n === 1 ? '1 Mitglied' : `${n} Mitglieder`);

	// Eine Anfrage nach der anderen: Ein Doppelklick legt niemanden zweimal an.
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

	// Grenze des Servers für eine Anfrage (512 KB) samt JSON-Hülle; Anführungszeichen zählen doppelt.
	const ANFRAGE_MAX = 500 * 1024;

	// Vor jeder Wahl leeren: Sonst meldet der Browser dieselbe, inzwischen korrigierte Datei nicht
	// als Änderung, und die alte Vorschau bliebe stehen.
	async function waehle(e: Event & { currentTarget: HTMLInputElement }) {
		const datei = e.currentTarget.files?.[0];
		text = null;
		vorschau = null;
		fehler = null;
		angelegt = null;
		if (!datei) return;
		if (datei.size > MAX_BYTES) {
			fehler = dateiFehlerText({ grund: 'zu-gross' });
			return;
		}
		// `text()` liest immer als UTF-8; Umlaute aus Windows-1252 werden U+FFFD, das meldet der Server.
		const t = await datei.text();
		if (new TextEncoder().encode(JSON.stringify({ text: t })).length > ANFRAGE_MAX) {
			fehler = dateiFehlerText({ grund: 'zu-gross' });
			return;
		}
		await einzeln(() => ladeVorschau(t));
	}

	async function ladeVorschau(t: string) {
		const a = await zeigeEinleseVorschau(t);
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			text = t;
			vorschau = a.daten;
		} else if (a.art === 'datei') fehler = dateiFehlerText(a.datei);
		else fehler = fehlerText(a);
	}

	const legeAn = () => einzeln(schickeDatei);
	async function schickeDatei() {
		if (text === null || vorschau === null) return;
		const t = text;
		fehler = null;
		const a = await liesMitgliederEin(t, vorschau.neu.length);
		rueckfrage?.close();
		if (await leiteUm(a)) return;
		if (a.art === 'ok') {
			angelegt = a.daten.angelegt;
			text = null;
			vorschau = null;
			if (dateiwahl) dateiwahl.value = '';
		} else if (a.art === 'veraltet') {
			vorschau = null;
			await ladeVorschau(t);
			// Nur wenn die neue Vorschau da ist; sonst bleibt die Meldung von `ladeVorschau` stehen.
			if (vorschau !== null)
				fehler =
					'Inzwischen hat sich die Mitgliederliste geändert. Die Vorschau ist neu geladen, prüfe sie und lege dann an.';
		} else if (a.art === 'datei') fehler = dateiFehlerText(a.datei);
		else fehler = fehlerText(a);
	}
</script>

<svelte:head>
	<title>Einlesen – MyTCO</title>
</svelte:head>

<Seitenkopf>
	<h1>Einlesen</h1>
</Seitenkopf>
<p class="leise">
	Neue Mitglieder aus einer CSV-Datei anlegen. Wer schon in MyTCO ist, bleibt unverändert.
</p>

{#if angelegt !== null}
	<div class="karte" role="status">
		<p><strong>{anzahlText(angelegt)} angelegt.</strong></p>
		<p>Die Briefe mit dem Anmeldecode erzeugst du auf der Seite Briefe.</p>
		<p><a href={resolve('/verwaltung/briefe')}>Zu den Briefen</a></p>
	</div>
{/if}

{#if darfEinlesen}
	<div class="feld">
		<label for="einlesen-datei">CSV-Datei</label>
		<span class="feld-hilfe" id="einlesen-hilfe"
			>Höchstens 400 KB, gespeichert als «CSV UTF-8». Noch wird nichts angelegt.</span
		>
		<input
			id="einlesen-datei"
			type="file"
			accept=".csv,text/csv"
			aria-describedby="einlesen-hilfe"
			disabled={laeuft}
			bind:this={dateiwahl}
			onclick={(e) => (e.currentTarget.value = '')}
			onchange={waehle}
		/>
	</div>
{/if}

{#if fehler}
	<p class="fehler" role="alert">{fehler}</p>
{/if}

{#if vorschau}
	<h2>Vorschau</h2>
	<div class="kennzahlen">
		<div class="kennzahl">
			<strong>{vorschau.neu.length}</strong><span class="leise">neu</span>
		</div>
		<div class="kennzahl">
			<strong>{vorschau.fehlerhaft.length}</strong><span class="leise">fehlerhaft</span>
		</div>
		<div class="kennzahl">
			<strong>{vorschau.vorhanden.length}</strong><span class="leise">schon vorhanden</span>
		</div>
	</div>

	{#if vorschau.neu.length > 0}
		<div class="leiste">
			<button type="button" class="taste-haupt" onclick={() => rueckfrage?.showModal()}
				>{anzahlText(vorschau.neu.length)} anlegen</button
			>
		</div>
	{:else}
		<p>In der Datei steht niemand, der neu angelegt werden kann.</p>
	{/if}

	{#if vorschau.fehlerhaft.length > 0}
		<details class="karte klappe" open>
			<summary class="klappe-titel"
				>Fehlerhaft <span class="leise">werden nicht angelegt</span></summary
			>
			<p class="leise">Korrigiere die Zeilen in der Datei und lies sie danach nochmals ein.</p>
			<ul>
				{#each vorschau.fehlerhaft as z (z.zeile)}
					<li>Zeile {z.zeile} · {z.name || 'ohne Name'} · {zeilenFehlerText(z.fehler)}</li>
				{/each}
			</ul>
		</details>
	{/if}
	{#if vorschau.vorhanden.length > 0}
		<details class="karte klappe">
			<summary class="klappe-titel"
				>Schon vorhanden <span class="leise">bleiben unverändert</span></summary
			>
			<ul>
				{#each vorschau.vorhanden as z (z.zeile)}
					<li>Zeile {z.zeile} · {z.name} · {VORHANDEN_GRUND[z.grund]}</li>
				{/each}
			</ul>
		</details>
	{/if}
	{#if vorschau.neu.length > 0}
		<details class="karte klappe">
			<summary class="klappe-titel">Neu <span class="leise">werden angelegt</span></summary>
			<ul>
				{#each vorschau.neu as z (z.zeile)}
					<li>Zeile {z.zeile} · {z.name}</li>
				{/each}
			</ul>
		</details>
	{/if}
{/if}

<details class="karte klappe">
	<summary class="klappe-titel">Aufbau der Datei</summary>
	<p>
		Eine Zeile je Mitglied, die erste Zeile nennt die Spalten. Trennzeichen Semikolon oder Komma,
		die Reihenfolge der Spalten ist frei.
	</p>
	<p><a href={asset(VORLAGE)} download>Vorlage herunterladen</a></p>
	<p class="leise">In Excel: Datei › Speichern unter › «CSV UTF-8».</p>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="tabelle" role="region" aria-label="Spalten der Datei" tabindex="0">
		<table>
			<thead>
				<tr><th scope="col">Spalte</th><th scope="col">Pflicht</th><th scope="col">Form</th></tr>
			</thead>
			<tbody>
				{#each SPALTEN as s (s.spalte)}
					<tr>
						<td><code>{s.spalte}</code></td>
						<td>{s.pflicht ? 'ja' : 'nein'}</td>
						<td>{s.form}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</details>

{#if darfEinlesen && vorschau}
	<dialog class="karte" bind:this={rueckfrage} aria-labelledby="einlesen-titel">
		<h2 id="einlesen-titel">{anzahlText(vorschau.neu.length)} anlegen?</h2>
		<p>Briefe mit dem Anmeldecode erzeugst du danach auf der Seite Briefe.</p>
		<div class="leiste">
			<button type="button" class="taste-neben" onclick={() => rueckfrage?.close()}
				>Abbrechen</button
			>
			<button
				type="button"
				class="taste-haupt"
				disabled={laeuft}
				aria-busy={laeuft}
				onclick={legeAn}>Anlegen</button
			>
		</div>
	</dialog>
{/if}
