<script lang="ts">
	import { asset } from '$app/paths';

	// Bilder der Anleitung Android (Chrome). Beschriftungen nur, wo die Hilfe von Google sie
	// belegt; sonst graue Balken (`.anleitung-eintrag.leer`). `aktiv` = sichtbares Bild, -1 = alle.
	let { aktiv }: { aktiv: number } = $props();
	const symbol = asset('favicon.svg');
</script>

<div class="anleitung-film" aria-hidden="true">
	<div class={['anleitung-bild', { aktiv: aktiv === 0 }]}>
		<div class="anleitung-leiste oben">
			<span class="anleitung-adresse">my.tcolten.ch</span><span class="anleitung-knopf">⋮</span>
		</div>
		<div class="anleitung-kopf">&nbsp;</div>
		<div class="anleitung-zeile"></div>
		<div class="anleitung-zeile kurz"></div>
		<div class="anleitung-zeile"></div>
		<i class="anleitung-tipp anleitung-tipp-and-1"></i>
	</div>
	<div class={['anleitung-bild', { aktiv: aktiv === 1 }]}>
		<div class="anleitung-leiste oben">
			<span class="anleitung-adresse">my.tcolten.ch</span><span class="anleitung-knopf">⋮</span>
		</div>
		<div class="anleitung-kopf">&nbsp;</div>
		<div class="anleitung-zeile"></div>
		<div class="anleitung-zeile kurz"></div>
		<div class="anleitung-menue oben anleitung-rein-oben">
			<div class="anleitung-eintrag leer"></div>
			<div class="anleitung-eintrag">Installieren und Verknüpfung erstellen</div>
			<div class="anleitung-eintrag leer"></div>
			<div class="anleitung-eintrag leer"></div>
		</div>
		<i class="anleitung-tipp anleitung-tipp-and-2"></i>
	</div>
	<div class={['anleitung-bild', { aktiv: aktiv === 2 }]}>
		<div class="anleitung-kopf">&nbsp;</div>
		<div class="anleitung-dialog mitte anleitung-rein-dialog">
			<div class="anleitung-app">
				<img class="anleitung-symbol-app" src={symbol} alt="" /><span
					><strong>MyTCO</strong><br />my.tcolten.ch</span
				>
			</div>
			<div class="anleitung-dialog-tasten">
				<span class="anleitung-eintrag leer"></span><span>Installieren</span>
			</div>
		</div>
		<i class="anleitung-tipp anleitung-tipp-and-3"></i>
	</div>
	<div class={['anleitung-bild', { aktiv: aktiv === 3 }]}>
		<div class="anleitung-home">
			<span></span>
			<figure class="anleitung-rein-symbol"><img src={symbol} alt="" />MyTCO</figure>
			<span></span><span></span><span></span><span></span><span></span><span></span>
			<span class="anleitung-erledigt">✓ Fertig</span>
		</div>
		<i class="anleitung-tipp anleitung-tipp-home"></i>
	</div>
</div>
