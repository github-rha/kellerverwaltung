<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { resolve } from '$app/paths'
	import WineList from '$lib/components/WineList.svelte'
	import { cellarStore, initStore } from '$lib/data/store'
	import { unsyncedStore, loadOnboarded, markOnboarded } from '$lib/data/persist'
	import {
		filterByType,
		filterByProducer,
		filterByCountry,
		filterByBottleCount,
		sortWines
	} from '$lib/data/filter-sort'
	import type { SortOption, BottleFilter } from '$lib/data/filter-sort'
	import type { WineType } from '$lib/data/types'
	import { isConfigured, loadSettings } from '$lib/data/settings'
	import type { SyncSettings } from '$lib/data/settings'
	import { push } from '$lib/data/sync'

	let ready = $state(false)
	let showOnboarding = $state(false)

	let activeType: WineType | null = $state(null)
	let activeProducer: string | null = $state(null)
	let activeCountry: string | null = $state(null)
	let activeSort: SortOption = $state('vintage-desc')
	let bottleFilter: BottleFilter = $state('in-stock')

	let showFilterMenu = $state(false)

	let settings: SyncSettings = $state({ repo: '', pat: '' })
	let online = $state(true)
	let syncing = $state(false)
	let syncMsg: { kind: 'ok' | 'err' | 'blocked'; text: string } | null = $state(null)

	async function dismissOnboarding() {
		await markOnboarded()
		showOnboarding = false
	}

	onMount(async () => {
		await initStore()
		settings = await loadSettings()
		showOnboarding = !(await loadOnboarded())
		online = navigator.onLine
		window.addEventListener('online', () => {
			online = true
		})
		window.addEventListener('offline', () => {
			online = false
		})
		const params = $page.url.searchParams
		const typeParam = params.get('type')
		if (typeParam && ['red', 'white', 'sparkling', 'dessert', 'rose'].includes(typeParam)) {
			activeType = typeParam as WineType
		}
		const producerParam = params.get('producer')
		if (producerParam) {
			activeProducer = producerParam
		}
		const countryParam = params.get('country')
		if (countryParam) {
			activeCountry = countryParam
		}
		ready = true
	})

	let wines = $derived($cellarStore.wines)
	let totalBottles = $derived(wines.reduce((sum, w) => sum + w.bottles, 0))

	let displayedWines = $derived(
		sortWines(
			filterByBottleCount(
				filterByCountry(
					filterByProducer(filterByType(wines, activeType), activeProducer),
					activeCountry
				),
				bottleFilter
			),
			activeSort
		)
	)
	let filteredBottles = $derived(displayedWines.reduce((sum, w) => sum + w.bottles, 0))
	let isFiltered = $derived(
		activeType !== null ||
			activeProducer !== null ||
			activeCountry !== null ||
			bottleFilter !== 'in-stock'
	)
	let configured = $derived(isConfigured(settings))
	let unsynced = $derived($unsyncedStore)

	let producers = $derived(
		[...new Map(wines.map((w) => [w.producerKey, w.producer]))].sort((a, b) =>
			a[1].localeCompare(b[1])
		)
	)

	let countries = $derived([...new Set(wines.map((w) => w.country).filter(Boolean))].sort())

	let activeProducerName = $derived(
		activeProducer
			? (producers.find(([key]) => key === activeProducer)?.[1] ?? activeProducer)
			: null
	)

	const typeLabels: Record<WineType, string> = {
		red: 'Red',
		white: 'White',
		sparkling: 'Sparkling',
		dessert: 'Dessert',
		rose: 'Rosé'
	}

	const sortLabels: Record<SortOption, string> = {
		'added-newest': 'Newest',
		'vintage-asc': 'Vintage \u2191',
		'vintage-desc': 'Vintage \u2193'
	}

	let producerInput = $state('')
	let countryInput = $state('')

	function setType(type: WineType | null) {
		activeType = type
	}

	function onProducerInput(e: Event) {
		const val = (e.target as HTMLInputElement).value
		const match = producers.find(([, name]) => name === val)
		activeProducer = match ? match[0] : null
	}

	function onCountryInput(e: Event) {
		const val = (e.target as HTMLInputElement).value
		activeCountry = countries.includes(val) ? val : null
	}

	const sortOrder: SortOption[] = ['vintage-desc', 'vintage-asc', 'added-newest']

	function cycleSort() {
		const idx = sortOrder.indexOf(activeSort)
		activeSort = sortOrder[(idx + 1) % sortOrder.length]
	}

	async function handleSync() {
		syncMsg = null
		if (wines.length < 10) {
			syncMsg = {
				kind: 'blocked',
				text: `Sync blocked — only ${wines.length} wine${wines.length !== 1 ? 's' : ''} in local cellar`
			}
			return
		}
		syncing = true
		try {
			await push(settings)
			syncMsg = { kind: 'ok', text: 'Synced ✓' }
		} catch (e) {
			syncMsg = { kind: 'err', text: e instanceof Error ? e.message : 'Sync failed' }
		} finally {
			syncing = false
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-[rgba(166,42,23,0.2)] px-4 py-3">
		<div class="flex items-center justify-between">
			<h1 class="text-xl font-bold text-[#575757]">Kellerverwaltung</h1>
			<div class="flex items-center gap-2">
				{#if configured}
					<button
						onclick={handleSync}
						disabled={!online || syncing}
						class="px-3 py-1.5 text-sm font-medium rounded-full border border-gray-300 text-gray-700 disabled:opacity-40"
					>
						{syncing ? 'Syncing…' : 'Sync'}
					</button>
					<span class="text-xs {unsynced ? 'text-amber-600' : 'text-gray-400'}">●</span>
				{/if}
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
					class="flex items-center justify-center w-10 h-10"
					aria-label="Add wine"
				>
					<img src="/bottle-plus.png" alt="" class="w-8 h-8 object-contain" />
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

	<div class="bg-white border-b border-[rgba(166,42,23,0.2)] px-4 py-2">
		<div class="flex items-center gap-2">
			<div class="relative">
				<button
					onclick={() => {
						showFilterMenu = !showFilterMenu
					}}
					class="flex items-center gap-1 px-2.5 py-1.5 rounded-full border
						{activeProducer !== null || activeCountry !== null || bottleFilter !== 'in-stock'
						? 'border-wine text-wine bg-wine-50'
						: 'border-gray-300 text-gray-700'}"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="w-4 h-4"
					>
						<path
							fill-rule="evenodd"
							d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z"
							clip-rule="evenodd"
						/>
					</svg>
					{#if activeProducer !== null || activeCountry !== null || bottleFilter !== 'in-stock'}
						<span class="text-xs">&bull;</span>
					{/if}
				</button>
				{#if showFilterMenu}
					<div
						class="absolute left-0 top-full mt-1 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-56"
					>
						<div class="text-xs font-medium text-gray-500 mb-2">Bottles</div>
						<div class="flex flex-wrap gap-1.5 mb-3">
							<button
								onclick={() => {
									bottleFilter = bottleFilter === 'single' ? 'in-stock' : 'single'
								}}
								class="px-2.5 py-1 text-sm rounded-full border
									{bottleFilter === 'single' ? 'border-wine bg-wine text-white' : 'border-gray-300 text-gray-700'}"
							>
								Single bottle
							</button>
							<button
								onclick={() => {
									bottleFilter = bottleFilter === 'empty' ? 'in-stock' : 'empty'
								}}
								class="px-2.5 py-1 text-sm rounded-full border
									{bottleFilter === 'empty' ? 'border-wine bg-wine text-white' : 'border-gray-300 text-gray-700'}"
							>
								Finito
							</button>
						</div>
						{#if producers.length > 0}
							<div class="text-xs font-medium text-gray-500 mb-1">Producer</div>
							<input
								type="text"
								list="producers-list"
								bind:value={producerInput}
								oninput={onProducerInput}
								placeholder="Search producer…"
								class="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-[#575757] placeholder-gray-400 mb-3 focus:border-wine focus:outline-none"
							/>
							<datalist id="producers-list">
								{#each producers as [, name] (name)}
									<option value={name}></option>
								{/each}
							</datalist>
						{/if}
						{#if countries.length > 0}
							<div class="text-xs font-medium text-gray-500 mb-1">Country</div>
							<input
								type="text"
								list="countries-list"
								bind:value={countryInput}
								oninput={onCountryInput}
								placeholder="Search country…"
								class="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-[#575757] placeholder-gray-400 focus:border-wine focus:outline-none"
							/>
							<datalist id="countries-list">
								{#each countries as c (c)}
									<option value={c}></option>
								{/each}
							</datalist>
						{/if}
					</div>
				{/if}
			</div>
			{#each ['red', 'white', 'sparkling', 'dessert', 'rose'] as const as type (type)}
				<button
					onclick={() => setType(activeType === type ? null : type)}
					aria-label={typeLabels[type]}
					aria-pressed={activeType === type}
					class="flex items-center justify-center w-9 h-9 rounded-full border-2
						{activeType === type ? 'border-wine' : 'border-transparent'}"
				>
					<img src="/bottle-{type}.png" alt={typeLabels[type]} class="w-7 h-7 object-contain" />
				</button>
			{/each}
			<button
				onclick={cycleSort}
				class="px-3 py-1.5 text-sm font-medium rounded-full border border-gray-300 text-gray-700"
			>
				{sortLabels[activeSort]}
			</button>
		</div>

		{#if isFiltered}
			<div class="flex flex-wrap gap-1.5 mt-2">
				{#if activeType}
					<button
						onclick={() => {
							activeType = null
						}}
						class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-wine-100 text-wine"
					>
						{typeLabels[activeType]} <span aria-label="Remove filter">&times;</span>
					</button>
				{/if}
				{#if activeProducer}
					<button
						onclick={() => {
							activeProducer = null
							producerInput = ''
						}}
						class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-wine-100 text-wine"
					>
						{activeProducerName} <span aria-label="Remove filter">&times;</span>
					</button>
				{/if}
				{#if activeCountry}
					<button
						onclick={() => {
							activeCountry = null
							countryInput = ''
						}}
						class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-wine-100 text-wine"
					>
						{activeCountry} <span aria-label="Remove filter">&times;</span>
					</button>
				{/if}
				{#if bottleFilter === 'single'}
					<button
						onclick={() => {
							bottleFilter = 'in-stock'
						}}
						class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-wine-100 text-wine"
					>
						Single bottle <span aria-label="Remove filter">&times;</span>
					</button>
				{/if}
				{#if bottleFilter === 'empty'}
					<button
						onclick={() => {
							bottleFilter = 'in-stock'
						}}
						class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-wine-100 text-wine"
					>
						Finito <span aria-label="Remove filter">&times;</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if ready && !configured}
		<div class="bg-white border-b border-[rgba(166,42,23,0.2)] px-4 py-2">
			<a href={resolve('/settings')} class="text-sm text-wine font-medium"> Set up sync &rarr; </a>
		</div>
	{/if}

	{#if syncMsg}
		<div
			class="px-4 py-2 text-sm
				{syncMsg.kind === 'ok'
				? 'text-green-700'
				: syncMsg.kind === 'blocked'
					? 'text-amber-700'
					: 'text-red-700'}"
		>
			{syncMsg.text}
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

{#if showOnboarding}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-8 text-center"
	>
		<h1 class="text-2xl font-bold text-[#575757] mb-2">Kellerverwaltung</h1>
		<p class="text-gray-500 mb-8">Your personal wine cellar, always in your pocket.</p>

		<div class="w-full max-w-xs space-y-4 text-left mb-10">
			<div>
				<p class="text-sm font-semibold text-[#575757]">Install on iPhone</p>
				<p class="text-sm text-gray-500">Open in Safari → tap Share → "Add to Home Screen"</p>
			</div>
			<div>
				<p class="text-sm font-semibold text-[#575757]">Back up your data</p>
				<p class="text-sm text-gray-500">
					Set up a private GitHub repository in Settings to keep your cellar safe and synced.
				</p>
			</div>
		</div>

		<button
			onclick={dismissOnboarding}
			class="w-full max-w-xs rounded-lg bg-wine px-4 py-3 text-sm font-semibold text-white active:bg-wine/90"
		>
			Get started
		</button>
	</div>
{/if}
