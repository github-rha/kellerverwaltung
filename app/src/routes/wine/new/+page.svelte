<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { onMount } from 'svelte'
	import WineForm from '$lib/components/WineForm.svelte'
	import { createWine, updateWine } from '$lib/data/store'
	import { savePhoto } from '$lib/data/persist'
	import { encodePhoto } from '$lib/photo/encode'
	import { runClaudeOcr } from '$lib/ocr/claude'
	import CropBox from '$lib/components/CropBox.svelte'
	import { loadClaudeApiKey } from '$lib/data/settings'
	import type { OcrResult } from '$lib/ocr/claude'
	import type { WineType } from '$lib/data/types'

	let claudeApiKey = $state('')
	let type: WineType = $state('red')
	let producer = $state('')
	let name = $state('')
	let vintage = $state('')
	let bottles = $state(1)
	let notes = $state('')
	let country = $state('')
	let error = $state('')
	let photoFile: File | null = $state(null)
	let showCrop = $state(false)
	let encoding = $state(false)
	let ocrRunning = $state(false)
	let ocrNote = $state('')

	onMount(async () => {
		claudeApiKey = await loadClaudeApiKey()
	})

	function parseVintage(v: string): number | 'NV' {
		if (v.trim().toUpperCase() === 'NV') return 'NV'
		const n = parseInt(v, 10)
		if (isNaN(n)) throw new Error('Vintage must be a year or NV')
		return n
	}

	function extractPreFill(text: string): { producer: string; name: string; vintage: string } {
		const lines = text
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean)
		const producerLine = lines[0] ?? ''
		const nameLine = lines[1] ?? ''
		const vintageMatch = text.match(/\b(\d{4})\b/g)
		const vintageYear = vintageMatch?.map(Number).find((n) => n >= 1800 && n <= 2100)
		return {
			producer: producerLine,
			name: nameLine,
			vintage: vintageYear ? String(vintageYear) : ''
		}
	}

	function handlePhotoSelect(e: Event) {
		const input = e.target as HTMLInputElement
		photoFile = input.files?.[0] ?? null
		if (!photoFile) return
		ocrNote = ''
		showCrop = true
	}

	function applyOcrResult(result: OcrResult) {
		const pre = extractPreFill(result.text)
		if (!producer && pre.producer) producer = pre.producer
		if (!name && pre.name) name = pre.name
		if (!vintage && pre.vintage) vintage = pre.vintage
		if (!country && result.country) country = result.country
		ocrNote = 'Label read — review fields below.'
	}

	function runOcrPipeline(blob: Blob) {
		ocrRunning = true
		runClaudeOcr(blob, claudeApiKey)
			.then(applyOcrResult)
			.catch((e: unknown) => {
				ocrNote = `Could not read label: ${e instanceof Error ? e.message : String(e)}`
			})
			.finally(() => {
				ocrRunning = false
			})
	}

	function handleCropConfirm(blob: Blob) {
		showCrop = false
		runOcrPipeline(blob)
	}

	function handleCropSkip() {
		showCrop = false
		runOcrPipeline(photoFile!)
	}

	async function handleSubmit() {
		error = ''
		try {
			const wine = await createWine({
				type,
				producer: producer.trim(),
				name: name.trim(),
				vintage: parseVintage(vintage),
				bottles,
				notes: notes.trim(),
				country: country.trim()
			})

			if (photoFile) {
				encoding = true
				try {
					const blob = await encodePhoto(photoFile)
					await savePhoto(wine.id, blob)
					await updateWine(wine.id, { photoRef: `photos/${wine.id}.avif` })
				} finally {
					encoding = false
				}
			}

			goto(resolve('/'))
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save wine'
		}
	}
</script>

{#if showCrop && photoFile}
	<CropBox file={photoFile} onconfirm={handleCropConfirm} oncancel={handleCropSkip} />
{/if}

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-[rgba(166,42,23,0.2)] px-4 py-3">
		<h1 class="text-xl font-bold text-[#575757]">Add Wine</h1>
	</header>

	{#if error}
		<div
			class="mx-4 mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
		>
			{error}
		</div>
	{/if}

	<div class="px-4 pt-4">
		{#if encoding}
			<div class="flex items-center gap-2 text-sm text-gray-500 mb-3">
				<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					></path>
				</svg>
				Encoding photo…
			</div>
		{/if}

		{#if ocrRunning}
			<div class="flex items-center gap-2 text-sm text-gray-500 mb-3">
				<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					></path>
				</svg>
				Reading label…
			</div>
		{/if}

		{#if ocrNote && !ocrRunning}
			<div class="text-sm text-gray-500 mb-3">{ocrNote}</div>
		{/if}

		<label class="block">
			<input
				type="file"
				accept="image/*"
				capture="environment"
				onchange={handlePhotoSelect}
				class="hidden"
			/>
			<div
				class="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 text-center active:bg-gray-50 cursor-pointer"
			>
				{photoFile ? photoFile.name : 'Add photo'}
			</div>
		</label>
	</div>

	<WineForm
		bind:type
		bind:producer
		bind:name
		bind:vintage
		bind:bottles
		bind:notes
		bind:country
		onsubmit={handleSubmit}
		oncancel={() => goto(resolve('/'))}
		submitLabel="Add Wine"
	/>
</div>
