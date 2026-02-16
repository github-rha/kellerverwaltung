<script lang="ts">
	import type { WineType } from '$lib/data/types'

	interface Props {
		type: WineType
		producer: string
		name: string
		vintage: string
		bottles: number
		notes: string
		onsubmit: () => void
		oncancel: () => void
		submitLabel: string
	}

	let {
		type = $bindable(),
		producer = $bindable(),
		name = $bindable(),
		vintage = $bindable(),
		bottles = $bindable(),
		notes = $bindable(),
		onsubmit,
		oncancel,
		submitLabel
	}: Props = $props()

	const wineTypes: { value: WineType; label: string }[] = [
		{ value: 'red', label: 'Red' },
		{ value: 'white', label: 'White' },
		{ value: 'sparkling', label: 'Sparkling' },
		{ value: 'dessert', label: 'Dessert' }
	]
</script>

<form
	onsubmit={(e) => {
		e.preventDefault()
		onsubmit()
	}}
	class="space-y-4 px-4 py-4"
>
	<div>
		<label for="wine-type" class="block text-sm font-medium text-gray-700">Type</label>
		<select
			id="wine-type"
			bind:value={type}
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
		>
			{#each wineTypes as wt (wt.value)}
				<option value={wt.value}>{wt.label}</option>
			{/each}
		</select>
	</div>

	<div>
		<label for="wine-producer" class="block text-sm font-medium text-gray-700">Producer</label>
		<input
			id="wine-producer"
			type="text"
			bind:value={producer}
			required
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
		/>
	</div>

	<div>
		<label for="wine-name" class="block text-sm font-medium text-gray-700">Name</label>
		<input
			id="wine-name"
			type="text"
			bind:value={name}
			required
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
		/>
	</div>

	<div>
		<label for="wine-vintage" class="block text-sm font-medium text-gray-700">Vintage</label>
		<input
			id="wine-vintage"
			type="text"
			bind:value={vintage}
			required
			placeholder="e.g. 2021 or NV"
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
		/>
	</div>

	<div>
		<label for="wine-bottles" class="block text-sm font-medium text-gray-700">Bottles</label>
		<input
			id="wine-bottles"
			type="number"
			bind:value={bottles}
			min="0"
			required
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
		/>
	</div>

	<div>
		<label for="wine-notes" class="block text-sm font-medium text-gray-700">Notes</label>
		<textarea
			id="wine-notes"
			bind:value={notes}
			rows="3"
			class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
		></textarea>
	</div>

	<div class="flex gap-3 pt-2">
		<button type="submit" class="flex-1 rounded-md bg-red-800 px-4 py-2 text-white font-medium">
			{submitLabel}
		</button>
		<button
			type="button"
			onclick={oncancel}
			class="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 font-medium"
		>
			Cancel
		</button>
	</div>
</form>
