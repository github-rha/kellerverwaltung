<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { onMount } from 'svelte'
	import {
		loadClaudeApiKey,
		loadSettings,
		isConfigured,
		saveClaudeApiKey,
		saveSettings
	} from '$lib/data/settings'
	import { cellarStore, initStore } from '$lib/data/store'
	import { exportText } from '$lib/data/export'
	import { pushInventory } from '$lib/data/sync'

	let repo = $state('')
	let pat = $state('')
	let claudeApiKey = $state('')
	let error = $state('')
	let saved = $state(false)
	let inventoryState: 'idle' | 'saving' | 'saved' | 'error' = $state('idle')
	let inventoryError = $state('')
	let online = $state(true)

	onMount(async () => {
		await initStore()
		const settings = await loadSettings()
		repo = settings.repo
		pat = settings.pat
		claudeApiKey = await loadClaudeApiKey()
		online = navigator.onLine
		window.addEventListener('online', () => {
			online = true
		})
		window.addEventListener('offline', () => {
			online = false
		})
	})

	let configured = $derived(isConfigured({ repo, pat }))

	async function handleSave() {
		error = ''
		saved = false
		if (repo.trim() && !pat.trim()) {
			error = 'PAT required when repo is set'
			return
		}
		if (pat.trim() && !repo.trim()) {
			error = 'Repo required when PAT is set'
			return
		}
		await saveSettings({ repo: repo.trim(), pat: pat.trim() })
		await saveClaudeApiKey(claudeApiKey.trim())
		goto(resolve('/'))
	}

	async function handleInventory() {
		inventoryState = 'saving'
		inventoryError = ''
		try {
			const date = new Date().toISOString().slice(0, 10)
			const text = exportText($cellarStore.wines, date)
			await pushInventory({ repo: repo.trim(), pat: pat.trim() }, text)
			inventoryState = 'saved'
		} catch (e) {
			inventoryError = e instanceof Error ? e.message : 'Failed to save inventory'
			inventoryState = 'error'
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-[rgba(166,42,23,0.2)] px-4 py-3">
		<div class="flex items-center gap-3">
			<a href={resolve('/')} class="text-wine text-sm font-medium">&larr; Back</a>
			<h1 class="text-xl font-bold text-[#575757]">Settings</h1>
		</div>
	</header>

	<div class="px-4 py-6 space-y-5">
		{#if error}
			<div class="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
				{error}
			</div>
		{/if}

		{#if saved}
			<div class="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
				Settings saved.
			</div>
		{/if}

		<div>
			<label for="repo" class="block text-sm font-medium text-gray-700 mb-1">
				GitHub repository
			</label>
			<input
				id="repo"
				type="text"
				bind:value={repo}
				placeholder="owner/repo"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="none"
				spellcheck="false"
				class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#575757] placeholder-gray-400 focus:border-wine focus:outline-none"
			/>
			<p class="mt-1 text-xs text-gray-500">
				The private repository where your cellar data is stored
			</p>
		</div>

		<div>
			<label for="pat" class="block text-sm font-medium text-gray-700 mb-1">
				Personal access token
			</label>
			<input
				id="pat"
				type="password"
				bind:value={pat}
				placeholder="github_pat_…"
				autocomplete="off"
				class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#575757] placeholder-gray-400 focus:border-wine focus:outline-none"
			/>
			<p class="mt-1 text-xs text-gray-500">Needs <code>repo</code> scope on the data repository</p>
		</div>

		<div>
			<label for="claude-key" class="block text-sm font-medium text-gray-700 mb-1">
				Anthropic API key
			</label>
			<input
				id="claude-key"
				type="password"
				bind:value={claudeApiKey}
				placeholder="sk-ant-…"
				autocomplete="off"
				class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#575757] placeholder-gray-400 focus:border-wine focus:outline-none"
			/>
			<p class="mt-1 text-xs text-gray-500">
				Used for label reading. Stored locally, never sent anywhere except api.anthropic.com.
			</p>
		</div>

		<button
			onclick={handleSave}
			class="w-full rounded-lg bg-wine px-4 py-3 text-sm font-semibold text-white active:bg-wine/90"
		>
			Save
		</button>

		<div class="border-t border-gray-200 pt-5 space-y-3">
			<a
				href={resolve('/import')}
				class="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700"
			>
				Import CSV <span class="text-gray-400">&rsaquo;</span>
			</a>

			{#if configured}
				<button
					onclick={handleInventory}
					disabled={!online || inventoryState === 'saving'}
					class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 disabled:opacity-40"
				>
					{inventoryState === 'saving' ? 'Saving…' : 'Inventory'}
				</button>
				{#if inventoryState === 'saved'}
					<p class="text-sm text-green-700">Saved ✓</p>
				{/if}
				{#if inventoryState === 'error'}
					<p class="text-sm text-red-700">{inventoryError}</p>
				{/if}
			{/if}
		</div>
	</div>
</div>
