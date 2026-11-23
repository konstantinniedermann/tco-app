<script lang="ts" generics="Z">
	import type { FilterWert } from './tabelle.ts';
	import type { Tabellenstand } from './tabellen-stand.svelte.ts';

	// Baustein Tabellen-Steuerung (UI-Leitbild): ein Spaltentitel mit Sortiertaste, Trichter mit
	// Aufklapper und Ziehgriff. Unter 60rem zeigt er nur den Text (Stile in pc-layout.css).
	let {
		stand,
		schluessel,
		anzahlen
	}: {
		stand: Tabellenstand<Z>;
		schluessel: string;
		/** Anzahl Zeilen je Wert eines Häkchen-Filters (leise rechts). */
		anzahlen?: Record<string, number>;
	} = $props();

	const id = $props.id();
	const spalte = $derived(stand.spalte(schluessel));
	const titel = $derived(spalte?.titel ?? schluessel);
	const sortiert = $derived(
		stand.sortierung?.spalte === schluessel ? stand.sortierung.richtung : null
	);
	const ariaSort = $derived(
		sortiert === 'auf'
			? 'ascending'
			: sortiert === 'ab'
				? 'descending'
				: spalte?.sortwert
					? 'none'
					: undefined
	);
	const filter = $derived(stand.filter[schluessel]);
	const aktiv = $derived(stand.woerter().some((w) => w.schluessel === schluessel));
	const breite = $derived(stand.breiten[schluessel] ?? spalte?.breite.start ?? 0);
	const ziehbar = $derived(spalte !== undefined && spalte.breite.min < spalte.breite.max);

	const werte = $derived(filter?.art === 'werte' ? filter.werte : []);
	const text = $derived(filter?.art === 'text' ? filter.text : '');
	const von = $derived(filter?.art === 'bereich' ? (filter.von ?? '') : '');
	const bis = $derived(filter?.art === 'bereich' ? (filter.bis ?? '') : '');

	function setze(wert: FilterWert | undefined) {
		stand.setzeFilter(schluessel, wert);
	}

	function waehle(wert: string, an: boolean) {
		const neu = an ? [...werte, wert] : werte.filter((w) => w !== wert);
		setze(neu.length > 0 ? { art: 'werte', werte: neu } : undefined);
	}

	function setzeBereich(teil: 'von' | 'bis', roh: string) {
		const art = spalte?.filter;
		const gueltig =
			art?.art === 'bereich' &&
			(art.zahl === 'ganz' ? /^\d{1,4}$/.test(roh) : /^\d{4}-\d{2}-\d{2}$/.test(roh));
		const alt = filter?.art === 'bereich' ? filter : { von: null, bis: null };
		const neu = { ...alt, [teil]: gueltig ? roh : null };
		setze(
			neu.von === null && neu.bis === null
				? undefined
				: { art: 'bereich', von: neu.von, bis: neu.bis }
		);
	}

	// Aufklapper: liegt als popover in der obersten Ebene; seine Lage folgt dem Trichter.
	let knopf = $state<HTMLButtonElement>();
	let aufklapper = $state<HTMLElement>();

	function platziere() {
		if (!knopf || !aufklapper) return;
		const r = knopf.getBoundingClientRect();
		const breiteKarte = aufklapper.offsetWidth;
		const links = Math.max(0, Math.min(r.left, document.documentElement.clientWidth - breiteKarte));
		aufklapper.style.setProperty('--anker-oben', `${r.bottom}px`);
		aufklapper.style.setProperty('--anker-links', `${links}px`);
	}

	function beimOeffnen(e: ToggleEvent) {
		if (e.newState !== 'open') return;
		platziere();
	}

	$effect(() => {
		const karte = aufklapper;
		if (!karte) return;
		const nachfuehren = () => {
			if (karte.matches(':popover-open')) platziere();
		};
		window.addEventListener('scroll', nachfuehren, true);
		window.addEventListener('resize', nachfuehren);
		return () => {
			window.removeEventListener('scroll', nachfuehren, true);
			window.removeEventListener('resize', nachfuehren);
		};
	});

	// Ziehgriff: Maus/Finger und Pfeiltasten (0,5 rem je Schritt).
	const SCHRITT = 0.5;
	let zieht = $state(false);
	let start = { x: 0, breite: 0 };
	const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

	function greife(e: PointerEvent) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		start = { x: e.clientX, breite };
		zieht = true;
		e.preventDefault();
	}

	function ziehe(e: PointerEvent) {
		if (!zieht) return;
		stand.setzeBreite(schluessel, start.breite + (e.clientX - start.x) / remPx());
	}

	function lasse() {
		zieht = false;
	}

	function taste(e: KeyboardEvent) {
		if (!spalte) return;
		const neu =
			e.key === 'ArrowRight'
				? breite + SCHRITT
				: e.key === 'ArrowLeft'
					? breite - SCHRITT
					: e.key === 'Home'
						? spalte.breite.min
						: e.key === 'End'
							? spalte.breite.max
							: null;
		if (neu === null) return;
		e.preventDefault();
		stand.setzeBreite(schluessel, neu);
	}
</script>

<th scope="col" aria-sort={ariaSort}>
	<span class="spaltentitel-text">{titel}</span>
	<div class="spaltentitel">
		{#if spalte?.sortwert}
			<button
				type="button"
				class="sortier"
				data-aktiv={sortiert ? '' : undefined}
				onclick={() => stand.sortiere(schluessel)}
			>
				{titel}
				<svg class={['pfeil', { 'pfeil-leise': !sortiert }]} viewBox="0 0 24 24" aria-hidden="true">
					{#if sortiert === 'auf'}
						<path d="M12 19V5M6 11l6-6 6 6" />
					{:else if sortiert === 'ab'}
						<path d="M12 5v14M6 13l6 6 6-6" />
					{:else}
						<path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
					{/if}
				</svg>
			</button>
		{:else}
			<span class="spaltentitel-fest">{titel}</span>
		{/if}
		{#if spalte?.filter}
			<button
				type="button"
				class="filter-knopf"
				data-aktiv={aktiv ? '' : undefined}
				aria-label="{titel} filtern"
				popovertarget="{id}-filter"
				bind:this={knopf}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7.5V19l-4 2v-8.5z" /></svg>
			</button>
			<div
				class="aufklapper karte"
				class:aufklapper-breit={spalte.filter.art === 'werte' && spalte.filter.werte.length > 8}
				id="{id}-filter"
				popover="auto"
				role="group"
				aria-labelledby="{id}-titel"
				bind:this={aufklapper}
				ontoggle={beimOeffnen}
			>
				<p class="aufklapper-titel" id="{id}-titel">{titel} zeigen</p>
				{#if spalte.filter.art === 'werte'}
					<div class="aufklapper-werte">
						{#each spalte.filter.werte as w (w.wert)}
							<label class="auswahl">
								<input
									type="checkbox"
									checked={werte.includes(w.wert)}
									onchange={(e) => waehle(w.wert, e.currentTarget.checked)}
								/>
								{w.text}
								{#if anzahlen}<span class="leise">{anzahlen[w.wert] ?? 0}</span>{/if}
							</label>
						{/each}
					</div>
				{:else if spalte.filter.art === 'bereich'}
					{@const datum = spalte.filter.zahl === 'datum'}
					<div class="von-bis">
						<div class="feld">
							<label for="{id}-von">Von</label>
							<input
								id="{id}-von"
								type={datum ? 'date' : 'text'}
								inputmode={datum ? undefined : 'numeric'}
								autocomplete="off"
								value={von}
								oninput={(e) => setzeBereich('von', e.currentTarget.value.trim())}
							/>
						</div>
						<div class="feld">
							<label for="{id}-bis">Bis</label>
							<input
								id="{id}-bis"
								type={datum ? 'date' : 'text'}
								inputmode={datum ? undefined : 'numeric'}
								autocomplete="off"
								value={bis}
								oninput={(e) => setzeBereich('bis', e.currentTarget.value.trim())}
							/>
						</div>
					</div>
				{:else}
					<div class="feld">
						<label for="{id}-text">{titel} enthält</label>
						<input
							id="{id}-text"
							type="search"
							autocomplete="off"
							value={text}
							oninput={(e) =>
								setze(
									e.currentTarget.value.trim() === ''
										? undefined
										: { art: 'text', text: e.currentTarget.value }
								)}
						/>
					</div>
				{/if}
				<div class="aufklapper-fuss">
					<button type="button" class="textlink" onclick={() => setze(undefined)}
						>Alle zeigen</button
					>
					<button
						type="button"
						class="taste-neben"
						popovertarget="{id}-filter"
						popovertargetaction="hide">Schliessen</button
					>
				</div>
			</div>
		{/if}
		{#if ziehbar && spalte}
			<!-- Ein fokussierbarer Trenner ist ein Bedienelement (ARIA «window splitter»), Svelte kennt
			     ihn nur als statisches Element. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
			<span
				class="ziehgriff"
				role="separator"
				tabindex="0"
				aria-orientation="vertical"
				aria-label="Breite {titel}"
				aria-valuemin={spalte.breite.min}
				aria-valuemax={spalte.breite.max}
				aria-valuenow={breite}
				aria-valuetext="{breite} rem"
				data-zieht={zieht ? '' : undefined}
				onpointerdown={greife}
				onpointermove={ziehe}
				onpointerup={lasse}
				onpointercancel={lasse}
				onkeydown={taste}
			></span>
		{/if}
	</div>
</th>
