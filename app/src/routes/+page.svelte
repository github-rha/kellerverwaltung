<script lang="ts">
	import { onMount } from 'svelte'
	import { resolve } from '$app/paths'
	import WineList from '$lib/components/WineList.svelte'
	import { cellarStore, initStore } from '$lib/data/store'

	let ready = $state(false)

	onMount(async () => {
		await initStore()
		ready = true
	})

	let wines = $derived($cellarStore.wines)
	let totalBottles = $derived(wines.reduce((sum, w) => sum + w.bottles, 0))
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200 px-4 py-3">
		<div class="flex items-center justify-between">
			<h1 class="text-xl font-bold text-gray-900">Kellerverwaltung</h1>
			<a
				href={resolve('/wine/new')}
				class="flex items-center justify-center w-10 h-10 rounded-full bg-red-800 text-white text-2xl font-light"
				aria-label="Add wine"
			>
				+
			</a>
		</div>
		<div class="mt-2 text-sm text-gray-500">
			{totalBottles} bottle{totalBottles !== 1 ? 's' : ''} total
		</div>
	</header>

	<main>
		{#if ready}
			<WineList {wines} />
		{:else}
			<div class="px-4 py-12 text-center text-gray-400">Loading...</div>
		{/if}
	</main>
</div>
