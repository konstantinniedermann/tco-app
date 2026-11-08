<script lang="ts">
	import { amtlicherName, sichtbarerRufname, type Namensform, type Namensteile } from '../name.ts';

	let { name, form = 'vorname-zuerst' }: { name: Namensteile; form?: Namensform } = $props();

	const rufname = $derived(sichtbarerRufname(name));
	const amtlich = $derived(amtlicherName(name, form));
</script>

<span
	>{#if rufname}{rufname} <span class="leise">{amtlich}</span>{:else}{amtlich}{/if}</span
>
