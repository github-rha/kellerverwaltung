<script lang="ts">
	import { resolve } from '$app/paths'
	import type { WineEntry } from '$lib/data/types'
	import { runSommelierQuery, type SommelierRecommendation } from '$lib/sommelier/claude'

	interface Props {
		wines: WineEntry[]
		apiKey: string
		onclose: () => void
	}

	let { wines, apiKey, onclose }: Props = $props()

	const SESSION_KEY = 'kellerverwaltung-sommelier'

	let prompt = $state('')
	let loading = $state(false)
	let error = $state('')
	let results: SommelierRecommendation[] = $state([])
	let hasResults = $state(false)

	// Restore previous results when returning from wine detail
	function restoreSession() {
		try {
			const raw = sessionStorage.getItem(SESSION_KEY)
			if (!raw) return
			const saved = JSON.parse(raw)
			if (saved.prompt) prompt = saved.prompt
			if (Array.isArray(saved.results) && saved.results.length > 0) {
				results = saved.results
				hasResults = true
			}
		} catch {
			// ignore
		}
	}

	function saveSession() {
		try {
			sessionStorage.setItem(SESSION_KEY, JSON.stringify({ prompt, results }))
		} catch {
			// ignore
		}
	}

	function clearSession() {
		sessionStorage.removeItem(SESSION_KEY)
	}

	restoreSession()

	function findWineId(rec: SommelierRecommendation): string | null {
		const vintage = String(rec.vintage)
		const match = wines.find(
			(w) => w.producer === rec.producer && w.name === rec.name && String(w.vintage) === vintage
		)
		return match?.id ?? null
	}

	function handleClose() {
		clearSession()
		onclose()
	}

	async function handleSubmit() {
		if (!prompt.trim()) return
		loading = true
		error = ''
		results = []
		hasResults = false
		try {
			const res = await runSommelierQuery(prompt.trim(), wines, apiKey)
			results = res.recommendations
			hasResults = true
			saveSession()
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to get recommendations'
		} finally {
			loading = false
		}
	}
</script>

<div class="fixed inset-0 z-50 flex flex-col bg-white">
	<header class="bg-white border-b border-[rgba(166,42,23,0.2)] px-4 py-3">
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-bold text-[#575757]">Sommelier</h2>
			<button onclick={handleClose} class="text-sm font-medium text-wine">Close</button>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
		<form
			onsubmit={(e) => {
				e.preventDefault()
				handleSubmit()
			}}
			class="space-y-3"
		>
			<label for="sommelier-input" class="block text-sm font-medium text-[#575757]">
				What are you eating?
			</label>
			<input
				id="sommelier-input"
				type="text"
				bind:value={prompt}
				placeholder="e.g. focaccia with chicken shawarma and oven legumes"
				disabled={loading}
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#575757] placeholder-gray-400 focus:border-wine focus:outline-none disabled:opacity-50"
			/>
			<button
				type="submit"
				disabled={loading || !prompt.trim()}
				class="w-full rounded-lg bg-wine px-4 py-2.5 text-sm font-semibold text-white active:bg-wine/90 disabled:opacity-40"
			>
				{loading ? 'Thinking…' : 'Ask'}
			</button>
		</form>

		{#if error}
			<div class="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
				{error}
			</div>
		{/if}

		{#if hasResults && results.length === 0}
			<p class="text-sm text-gray-500">No matching wines found in your cellar.</p>
		{/if}

		{#if results.length > 0}
			<ol class="space-y-3">
				{#each results as rec, i (i)}
					{@const wineId = findWineId(rec)}
					{#snippet recContent()}
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<span class="text-xs font-medium text-gray-400 mr-1.5">{i + 1}.</span>
								<span class="font-semibold text-[#575757]">{rec.name}</span>
								<span class="text-sm text-gray-500">
									{rec.producer} · {rec.vintage}
								</span>
							</div>
							<div class="flex flex-shrink-0 gap-1">
								{#if rec.drinkNow}
									<span
										class="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
									>
										Drink now
									</span>
								{/if}
								{#if rec.querschlaeger}
									<span
										class="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
									>
										Querschläger
									</span>
								{/if}
							</div>
						</div>
						<p class="mt-1 text-sm text-gray-500">{rec.reason}</p>
					{/snippet}
					<li>
						{#if wineId}
							<a
								href={resolve(`/wine/${wineId}`)}
								class="block rounded-lg border border-gray-200 px-3 py-2.5 active:bg-gray-50"
							>
								{@render recContent()}
							</a>
						{:else}
							<div class="rounded-lg border border-gray-200 px-3 py-2.5">
								{@render recContent()}
							</div>
						{/if}
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</div>
