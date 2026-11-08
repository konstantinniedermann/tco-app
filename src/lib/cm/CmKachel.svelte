<script lang="ts">
	import { resolve } from '$app/paths';
	import { datumLang } from '../verwaltung/turnier-anzeige.ts';
	import type { CmStand } from './api.ts';
	import { standText } from './anzeige.ts';

	// Kachel einer laufenden CM (Startseite «Jetzt aktuell», Reiter CM bei mehreren).
	let { turnier: t }: { turnier: CmStand } = $props();
</script>

<a class="karte kachel hervor" href={resolve('/clubmeisterschaft/[id]', { id: String(t.id) })}>
	<span>
		<strong>{t.name}</strong><br />
		<span class="leise"
			>{t.status === 'offen'
				? `Anmeldung bis ${datumLang(t.anmeldeschluss)}`
				: 'Anmeldung geschlossen'}<br />{standText(t.anzahl, t.anfragen)}</span
		>
	</span>
	<span class="kachel-pfeil" aria-hidden="true">›</span>
</a>
