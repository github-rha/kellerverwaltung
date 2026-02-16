<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import WineForm from '$lib/components/WineForm.svelte'
	import { cellarStore, adjustCount, updateWine, deleteWine } from '$lib/data/store'
	import type { WineType } from '$lib/data/types'

	let id = $derived($page.params.id)
	let wine = $derived($cellarStore.wines.find((w) => w.id === id))

	let mode: 'view' | 'edit' = $state('view')
	let error = $state('')

	// Edit form state
	let editType: WineType = $state('red')
	let editProducer = $state('')
	let editName = $state('')
	let editVintage = $state('')
	let editBottles = $state(0)
	let editNotes = $state('')

	function startEdit() {
		if (!wine) return
		editType = wine.type
		editProducer = wine.producer
		editName = wine.name
		editVintage = wine.vintage === 'NV' ? 'NV' : String(wine.vintage)
		editBottles = wine.bottles
		editNotes = wine.notes
		mode = 'edit'
	}

	function parseVintage(v: string): number | 'NV' {
		if (v.trim().toUpperCase() === 'NV') return 'NV'
		const n = parseInt(v, 10)
		if (isNaN(n)) throw new Error('Vintage must be a year or NV')
		return n
	}

	async function handleSave() {
		if (!wine) return
		error = ''
		try {
			await updateWine(wine.id, {
				type: editType,
				producer: editProducer.trim(),
				name: editName.trim(),
				vintage: parseVintage(editVintage),
				bottles: editBottles,
				notes: editNotes.trim()
			})
			mode = 'view'
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save changes'
		}
	}

	async function handleDelete() {
		if (!wine) return
		if (confirm('Delete this wine?')) {
			await deleteWine(wine.id)
			goto(resolve('/'))
		}
	}

	async function handleAdjust(delta: number) {
		if (!wine) return
		await adjustCount(wine.id, delta)
	}

	const typeLabels: Record<WineType, string> = {
		red: 'Red',
		white: 'White',
		sparkling: 'Sparkling',
		dessert: 'Dessert'
	}
</script>

<div class="min-h-screen bg-gray-50">
	{#if !wine}
		<div class="px-4 py-12 text-center text-gray-500">Wine not found</div>
	{:else if mode === 'view'}
		<header class="bg-white border-b border-gray-200 px-4 py-3">
			<div class="flex items-center justify-between">
				<a href={resolve('/')} class="text-red-800 text-sm font-medium">&larr; Back</a>
				<div class="flex gap-2">
					<button onclick={startEdit} class="text-sm font-medium text-red-800"> Edit </button>
					<button onclick={handleDelete} class="text-sm font-medium text-gray-400"> Delete </button>
				</div>
			</div>
		</header>

		<div class="px-4 py-4 space-y-4">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">{wine.name}</h1>
				<p class="text-gray-500">{wine.producer} &middot; {wine.vintage}</p>
				<span
					class="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium
						{wine.type === 'red' ? 'bg-red-100 text-red-800' : ''}
						{wine.type === 'white' ? 'bg-yellow-100 text-yellow-800' : ''}
						{wine.type === 'sparkling' ? 'bg-blue-100 text-blue-800' : ''}
						{wine.type === 'dessert' ? 'bg-amber-100 text-amber-800' : ''}"
				>
					{typeLabels[wine.type]}
				</span>
			</div>

			<div class="flex items-center justify-center gap-6 py-4">
				<button
					onclick={() => handleAdjust(-1)}
					class="flex items-center justify-center w-12 h-12 rounded-full border-2 border-gray-300 text-2xl font-light text-gray-600 active:bg-gray-100"
					disabled={wine.bottles === 0}
				>
					&minus;
				</button>
				<div class="text-center">
					<div class="text-4xl font-bold text-gray-900">{wine.bottles}</div>
					<div class="text-sm text-gray-500">bottle{wine.bottles !== 1 ? 's' : ''}</div>
				</div>
				<button
					onclick={() => handleAdjust(1)}
					class="flex items-center justify-center w-12 h-12 rounded-full border-2 border-red-800 text-2xl font-light text-red-800 active:bg-red-50"
				>
					+
				</button>
			</div>

			{#if wine.notes}
				<div>
					<h2 class="text-sm font-medium text-gray-500 mb-1">Notes</h2>
					<p class="text-gray-900">{wine.notes}</p>
				</div>
			{/if}

			<div class="text-xs text-gray-400">
				Added {new Date(wine.addedAt).toLocaleDateString()}
			</div>
		</div>
	{:else}
		<header class="bg-white border-b border-gray-200 px-4 py-3">
			<h1 class="text-xl font-bold text-gray-900">Edit Wine</h1>
		</header>

		{#if error}
			<div
				class="mx-4 mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
			>
				{error}
			</div>
		{/if}

		<WineForm
			bind:type={editType}
			bind:producer={editProducer}
			bind:name={editName}
			bind:vintage={editVintage}
			bind:bottles={editBottles}
			bind:notes={editNotes}
			onsubmit={handleSave}
			oncancel={() => {
				mode = 'view'
			}}
			submitLabel="Save Changes"
		/>
	{/if}
</div>
