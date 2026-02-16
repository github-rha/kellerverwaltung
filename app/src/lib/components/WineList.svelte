<script lang="ts">
	import type { WineEntry } from '$lib/data/types'
	import WineRow from './WineRow.svelte'

	let { wines }: { wines: WineEntry[] } = $props()
</script>

{#if wines.length === 0}
	<div class="px-4 py-12 text-center text-gray-500">
		<p class="text-lg">No wines yet</p>
		<p class="text-sm mt-1">Tap + to add your first bottle</p>
	</div>
{:else}
	<div class="divide-y divide-gray-200">
		{#each wines as wine (wine.id)}
			<WineRow {wine} />
		{/each}
	</div>
{/if}
