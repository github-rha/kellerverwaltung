<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { parseCSV } from '$lib/data/csv'
	import type { ParsedRow } from '$lib/data/csv'
	import { cellarStore, importWines, initStore } from '$lib/data/store'

	let rows: ParsedRow[] = $state([])
	let duplicateMode: 'skip' | 'overwrite' = $state('skip')
	let importing = $state(false)
	let fileSelected = $state(false)
	let existingKeys: Set<string> = $state(new Set())

	onMount(async () => {
		await initStore()
	})

	function dupKey(pKey: string, name: string, vintage: number | 'NV') {
		return `${pKey}::${name.toLowerCase().trim()}::${vintage}`
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return
		existingKeys = new Set($cellarStore.wines.map((w) => dupKey(w.producerKey, w.name, w.vintage)))
		const text = await file.text()
		rows = parseCSV(text)
		fileSelected = true
	}

	let validRows = $derived(rows.filter((r) => r.valid))
	let errorRows = $derived(rows.filter((r) => !r.valid))
	let duplicateRows = $derived(
		validRows.filter((r) =>
			existingKeys.has(dupKey(r.entry!.producerKey, r.entry!.name, r.entry!.vintage))
		)
	)
	let newRows = $derived(
		validRows.filter(
			(r) => !existingKeys.has(dupKey(r.entry!.producerKey, r.entry!.name, r.entry!.vintage))
		)
	)
	let importCount = $derived(duplicateMode === 'skip' ? newRows.length : validRows.length)
	let canImport = $derived(importCount > 0)

	function importLabel() {
		if (duplicateMode === 'overwrite' && duplicateRows.length > 0) {
			return `Import ${importCount} wine${importCount !== 1 ? 's' : ''} (${duplicateRows.length} update${duplicateRows.length !== 1 ? 's' : ''})`
		}
		return `Import ${importCount} wine${importCount !== 1 ? 's' : ''}`
	}

	async function handleImport() {
		importing = true
		try {
			await importWines(
				validRows.map((r) => r.entry!),
				duplicateMode
			)
			goto(resolve('/'))
		} finally {
			importing = false
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
		<h1 class="text-xl font-bold text-gray-900">Import CSV</h1>
		<a href={resolve('/')} class="text-sm text-gray-500">Cancel</a>
	</header>

	<main class="px-4 py-6">
		{#if !fileSelected}
			<label class="block cursor-pointer">
				<input type="file" accept=".csv" class="hidden" onchange={handleFileSelect} />
				<div
					class="rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-center active:bg-gray-50"
				>
					<p class="font-medium text-gray-700">Choose CSV file</p>
					<p class="mt-1 text-sm text-gray-400">
						Columns: producer, name, type, vintage, bottles, notes
					</p>
				</div>
			</label>
		{:else}
			<!-- Summary -->
			<div class="rounded-lg bg-white border border-gray-200 px-4 py-3 mb-4">
				<p class="text-sm text-gray-700">
					<span class="font-medium">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
					{#if errorRows.length > 0}
						&mdash; {validRows.length} valid, {errorRows.length} error{errorRows.length !== 1
							? 's'
							: ''}
					{/if}
					{#if duplicateRows.length > 0}
						, {duplicateRows.length} duplicate{duplicateRows.length !== 1 ? 's' : ''}
					{/if}
				</p>
			</div>

			<!-- Errors -->
			{#if errorRows.length > 0}
				<div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-4">
					<p class="text-sm font-medium text-red-800 mb-2">
						{errorRows.length} row{errorRows.length !== 1 ? 's' : ''} could not be imported
					</p>
					<ul class="space-y-1">
						{#each errorRows as row (row.rowNumber)}
							<li class="text-sm text-red-700">Row {row.rowNumber}: {row.error}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Duplicate handling -->
			{#if duplicateRows.length > 0}
				<div class="rounded-lg bg-white border border-gray-200 px-4 py-3 mb-4">
					<p class="text-sm font-medium text-gray-700 mb-2">
						{duplicateRows.length} duplicate{duplicateRows.length !== 1 ? 's' : ''} found
					</p>
					<div class="flex gap-2">
						<button
							onclick={() => {
								duplicateMode = 'skip'
							}}
							class="px-3 py-1.5 text-sm font-medium rounded-full border
								{duplicateMode === 'skip'
								? 'border-red-800 bg-red-800 text-white'
								: 'border-gray-300 text-gray-700'}"
						>
							Skip
						</button>
						<button
							onclick={() => {
								duplicateMode = 'overwrite'
							}}
							class="px-3 py-1.5 text-sm font-medium rounded-full border
								{duplicateMode === 'overwrite'
								? 'border-red-800 bg-red-800 text-white'
								: 'border-gray-300 text-gray-700'}"
						>
							Overwrite
						</button>
					</div>
					<p class="mt-2 text-xs text-gray-500">
						{#if duplicateMode === 'skip'}
							Existing wines matched by producer, name, and vintage will not be changed.
						{:else}
							Bottle count and notes will be updated for matching wines.
						{/if}
					</p>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex gap-3">
				<button
					onclick={handleImport}
					disabled={!canImport || importing}
					class="flex-1 py-3 rounded-lg bg-red-800 text-white font-medium text-sm
						disabled:opacity-40"
				>
					{importing ? 'Importing…' : importLabel()}
				</button>
				<a
					href={resolve('/')}
					class="px-4 py-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700"
				>
					Cancel
				</a>
			</div>
		{/if}
	</main>
</div>
