<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { resolve } from '$app/paths'
	import WineList from '$lib/components/WineList.svelte'
	import { cellarStore, initStore } from '$lib/data/store'
	import { unsyncedStore } from '$lib/data/persist'
	import { filterByType, filterByProducer, sortWines } from '$lib/data/filter-sort'
	import type { SortOption } from '$lib/data/filter-sort'
	import type { WineType } from '$lib/data/types'
	import { isConfigured, loadSettings } from '$lib/data/settings'
	import type { SyncSettings } from '$lib/data/settings'
	import { SyncError, push, pull, forcePull } from '$lib/data/sync'

	let ready = $state(false)

	let activeType: WineType | null = $state(null)
	let activeProducer: string | null = $state(null)
	let activeSort: SortOption = $state('added-newest')

	let showFilterMenu = $state(false)
	let showSortMenu = $state(false)

	let settings: SyncSettings = $state({ repo: '', pat: '' })
	let online = $state(true)
	let syncing: 'idle' | 'pushing' | 'pulling' = $state('idle')
	let syncErrorMsg: string | null = $state(null)
	let pullBlocked = $state(false)

	onMount(async () => {
		await initStore()
		settings = await loadSettings()
		online = navigator.onLine
		window.addEventListener('online', () => {
			online = true
		})
		window.addEventListener('offline', () => {
			online = false
		})
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
	let configured = $derived(isConfigured(settings))
	let unsynced = $derived($unsyncedStore)

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

	async function handlePush() {
		syncErrorMsg = null
		pullBlocked = false
		syncing = 'pushing'
		try {
			await push(settings)
		} catch (e) {
			syncErrorMsg = e instanceof Error ? e.message : 'Push failed'
		} finally {
			syncing = 'idle'
		}
	}

	async function handlePull() {
		syncErrorMsg = null
		pullBlocked = false
		syncing = 'pulling'
		try {
			await pull(settings)
		} catch (e) {
			if (e instanceof SyncError && e.message === 'unsynced') {
				pullBlocked = true
			} else {
				syncErrorMsg = e instanceof Error ? e.message : 'Pull failed'
			}
		} finally {
			syncing = 'idle'
		}
	}

	async function handleForcePull() {
		if (!confirm('This will discard all local changes. Continue?')) return
		syncErrorMsg = null
		pullBlocked = false
		syncing = 'pulling'
		try {
			await forcePull(settings)
		} catch (e) {
			syncErrorMsg = e instanceof Error ? e.message : 'Pull failed'
		} finally {
			syncing = 'idle'
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200 px-4 py-3">
		<div class="flex items-center justify-between">
			<h1 class="text-xl font-bold text-gray-900">Kellerverwaltung</h1>
			<div class="flex items-center gap-2">
				<a
					href={resolve('/settings')}
					class="flex items-center justify-center w-10 h-10 text-gray-400"
					aria-label="Settings"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="w-5 h-5"
					>
						<circle cx="12" cy="12" r="3"></circle>
						<path
							d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
						></path>
					</svg>
				</a>
				<a
					href={resolve('/wine/new')}
					class="flex items-center justify-center w-10 h-10 rounded-full bg-red-800 text-white text-2xl font-light"
					aria-label="Add wine"
				>
					+
				</a>
			</div>
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

	<!-- Sync bar -->
	{#if ready}
		<div class="bg-white border-b border-gray-200 px-4 py-2">
			{#if !configured}
				<a href={resolve('/settings')} class="text-sm text-red-800 font-medium">
					Set up sync &rarr;
				</a>
			{:else}
				<div class="flex items-center gap-3">
					<button
						onclick={handlePush}
						disabled={!online || syncing !== 'idle'}
						class="px-3 py-1.5 text-sm font-medium rounded-full border border-gray-300 text-gray-700
							disabled:opacity-40"
					>
						{syncing === 'pushing' ? 'Pushing…' : 'Push'}
					</button>
					<button
						onclick={handlePull}
						disabled={!online || syncing !== 'idle'}
						class="px-3 py-1.5 text-sm font-medium rounded-full border border-gray-300 text-gray-700
							disabled:opacity-40"
					>
						{syncing === 'pulling' ? 'Pulling…' : 'Pull'}
					</button>
					<span class="text-xs {unsynced ? 'text-amber-600' : 'text-gray-400'}">
						{unsynced ? '● unsynced' : '● synced'}
					</span>
				</div>

				{#if pullBlocked}
					<div class="mt-2 text-sm text-amber-700">
						Unsynced changes. Push first, or
						<button
							onclick={handleForcePull}
							disabled={!online || syncing !== 'idle'}
							class="underline font-medium disabled:opacity-40"
						>
							force-pull
						</button>
						to discard local changes.
					</div>
				{/if}

				{#if syncErrorMsg}
					<div class="mt-2 text-sm text-red-700">
						{syncErrorMsg}
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	<main>
		{#if ready}
			<WineList wines={displayedWines} filtered={isFiltered} />
		{:else}
			<div class="px-4 py-12 text-center text-gray-400">Loading...</div>
		{/if}
	</main>
</div>
