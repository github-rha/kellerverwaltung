<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { onMount } from 'svelte'
	import { loadSettings, saveSettings } from '$lib/data/settings'

	let repo = $state('')
	let pat = $state('')
	let error = $state('')
	let saved = $state(false)

	onMount(async () => {
		const settings = await loadSettings()
		repo = settings.repo
		pat = settings.pat
	})

	async function handleSave() {
		error = ''
		saved = false
		if (!repo.trim()) {
			error = 'Repository is required (format: owner/repo)'
			return
		}
		if (!pat.trim()) {
			error = 'Personal access token is required'
			return
		}
		await saveSettings({ repo: repo.trim(), pat: pat.trim() })
		goto(resolve('/'))
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200 px-4 py-3">
		<div class="flex items-center gap-3">
			<a href={resolve('/')} class="text-red-800 text-sm font-medium">&larr; Back</a>
			<h1 class="text-xl font-bold text-gray-900">Settings</h1>
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
				class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-red-800 focus:outline-none"
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
				class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-red-800 focus:outline-none"
			/>
			<p class="mt-1 text-xs text-gray-500">Needs <code>repo</code> scope on the data repository</p>
		</div>

		<button
			onclick={handleSave}
			class="w-full rounded-lg bg-red-800 px-4 py-3 text-sm font-semibold text-white active:bg-red-900"
		>
			Save
		</button>
	</div>
</div>
