<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { resolve } from '$app/paths'
	import WineList from '$lib/components/WineList.svelte'
	import { cellarStore, initStore } from '$lib/data/store'
	import { filterByType, filterByProducer, sortWines } from '$lib/data/filter-sort'
	import type { SortOption } from '$lib/data/filter-sort'
	import type { WineType } from '$lib/data/types'

	let ready = $state(false)

	let activeType: WineType | null = $state(null)
	let activeProducer: string | null = $state(null)
	let activeSort: SortOption = $state('added-newest')

	let showFilterMenu = $state(false)
	let showSortMenu = $state(false)

	onMount(async () => {
		await initStore()
		const params = $page.url.searchParams
		const typeParam = params.get('type')
		if (typeParam && ['red', 'white', 'sparkling', 'dessert'].includes(typeParam)) {
			activeType = typeParam as WineType
		}
		const producerParam = params.get('producer')
		if (producerParam) {
			activeProducer = producerParam
		}
		ready = true
	})

	let wines = $derived($cellarStore.wines)
	let totalBottles = $derived(wines.reduce((sum, w) => sum + w.bottles, 0))

	let displayedWines = $derived(
		sortWines(filterByProducer(filterByType(wines, activeType), activeProducer), activeSort)
	)
	let filteredBottles = $derived(displayedWines.reduce((sum, w) => sum + w.bottles, 0))
	let isFiltered = $derived(activeType !== null || activeProducer !== null)

	let producers = $derived(
		[...new Map(wines.map((w) => [w.producerKey, w.producer]))].sort((a, b) =>
			a[1].localeCompare(b[1])
		)
	)

	let activeProducerName = $derived(
		activeProducer
			? (producers.find(([key]) => key === activeProducer)?.[1] ?? activeProducer)
			: null
	)

	const typeLabels: Record<WineType, string> = {
		red: 'Red',
		white: 'White',
		sparkling: 'Sparkling',
		dessert: 'Dessert'
	}

	const sortLabels: Record<SortOption, string> = {
		'added-newest': 'Newest',
		'added-oldest': 'Oldest',
		'vintage-asc': 'Vintage \u2191',
		'vintage-desc': 'Vintage \u2193'
	}

	function setType(type: WineType | null) {
		activeType = type
		showFilterMenu = false
	}

	function setProducer(key: string | null) {
		activeProducer = key
		showFilterMenu = false
	}

	function setSort(sort: SortOption) {
		activeSort = sort
		showSortMenu = false
	}
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
			{#if isFiltered}
				{filteredBottles} of {totalBottles} bottle{totalBottles !== 1 ? 's' : ''}
			{:else}
				{totalBottles} bottle{totalBottles !== 1 ? 's' : ''} total
			{/if}
		</div>
	</header>

	<div class="bg-white border-b border-gray-200 px-4 py-2">
		<div class="flex gap-2">
			<div class="relative">
				<button
					onclick={() => {
						showFilterMenu = !showFilterMenu
						showSortMenu = false
					}}
					class="px-3 py-1.5 text-sm font-medium rounded-full border
						{isFiltered ? 'border-red-800 text-red-800 bg-red-50' : 'border-gray-300 text-gray-700'}"
				>
					Filter{isFiltered ? ' \u2022' : ''}
				</button>
				{#if showFilterMenu}
					<div
						class="absolute left-0 top-full mt-1 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-56"
					>
						<div class="text-xs font-medium text-gray-500 mb-2">Wine type</div>
						<div class="flex flex-wrap gap-1.5 mb-3">
							{#each ['red', 'white', 'sparkling', 'dessert'] as const as type (type)}
								<button
									onclick={() => setType(activeType === type ? null : type)}
									class="px-2.5 py-1 text-sm rounded-full border
										{activeType === type ? 'border-red-800 bg-red-800 text-white' : 'border-gray-300 text-gray-700'}"
								>
									{typeLabels[type]}
								</button>
							{/each}
						</div>
						{#if producers.length > 0}
							<div class="text-xs font-medium text-gray-500 mb-2">Producer</div>
							<div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
								{#each producers as [key, name] (key)}
									<button
										onclick={() => setProducer(activeProducer === key ? null : key)}
										class="text-left px-2.5 py-1.5 text-sm rounded-md
											{activeProducer === key ? 'bg-red-800 text-white' : 'text-gray-700 hover:bg-gray-100'}"
									>
										{name}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
			<div class="relative">
				<button
					onclick={() => {
						showSortMenu = !showSortMenu
						showFilterMenu = false
					}}
					class="px-3 py-1.5 text-sm font-medium rounded-full border border-gray-300 text-gray-700"
				>
					{sortLabels[activeSort]}
				</button>
				{#if showSortMenu}
					<div
						class="absolute left-0 top-full mt-1 z-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-40"
					>
						{#each ['added-newest', 'added-oldest', 'vintage-asc', 'vintage-desc'] as const as sort (sort)}
							<button
								onclick={() => setSort(sort)}
								class="w-full text-left px-3 py-2 text-sm
									{activeSort === sort ? 'text-red-800 font-medium' : 'text-gray-700'}"
							>
								{sortLabels[sort]}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		{#if isFiltered}
			<div class="flex flex-wrap gap-1.5 mt-2">
				{#if activeType}
					<button
						onclick={() => {
							activeType = null
						}}
						class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800"
					>
						{typeLabels[activeType]} <span aria-label="Remove filter">&times;</span>
					</button>
				{/if}
				{#if activeProducer}
					<button
						onclick={() => {
							activeProducer = null
						}}
						class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800"
					>
						{activeProducerName} <span aria-label="Remove filter">&times;</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<main>
		{#if ready}
			<WineList wines={displayedWines} filtered={isFiltered} />
		{:else}
			<div class="px-4 py-12 text-center text-gray-400">Loading...</div>
		{/if}
	</main>
</div>
