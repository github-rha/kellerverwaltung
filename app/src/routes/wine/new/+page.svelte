<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import WineForm from '$lib/components/WineForm.svelte'
	import { createWine } from '$lib/data/store'
	import type { WineType } from '$lib/data/types'

	let type: WineType = $state('red')
	let producer = $state('')
	let name = $state('')
	let vintage = $state('')
	let bottles = $state(1)
	let notes = $state('')
	let error = $state('')

	function parseVintage(v: string): number | 'NV' {
		if (v.trim().toUpperCase() === 'NV') return 'NV'
		const n = parseInt(v, 10)
		if (isNaN(n)) throw new Error('Vintage must be a year or NV')
		return n
	}

	async function handleSubmit() {
		error = ''
		try {
			await createWine({
				type,
				producer: producer.trim(),
				name: name.trim(),
				vintage: parseVintage(vintage),
				bottles,
				notes: notes.trim()
			})
			goto(resolve('/'))
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save wine'
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200 px-4 py-3">
		<h1 class="text-xl font-bold text-gray-900">Add Wine</h1>
	</header>

	{#if error}
		<div
			class="mx-4 mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
		>
			{error}
		</div>
	{/if}

	<WineForm
		bind:type
		bind:producer
		bind:name
		bind:vintage
		bind:bottles
		bind:notes
		onsubmit={handleSubmit}
		oncancel={() => goto(resolve('/'))}
		submitLabel="Add Wine"
	/>
</div>
