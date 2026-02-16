<script lang="ts">
	import { resolve } from '$app/paths'
	import type { WineEntry } from '$lib/data/types'

	let { wine }: { wine: WineEntry } = $props()
</script>

<a
	href={resolve('/wine/[id]', { id: wine.id })}
	class="flex items-center justify-between px-4 py-3 border-b border-gray-200 active:bg-gray-100"
>
	<div class="min-w-0 flex-1">
		<div class="font-medium text-gray-900 truncate">{wine.name}</div>
		<div class="text-sm text-gray-500 truncate">{wine.producer} · {wine.vintage}</div>
	</div>
	<div class="ml-4 flex-shrink-0 text-right">
		<span class="text-lg font-semibold text-gray-900">{wine.bottles}</span>
		<span class="text-xs text-gray-500 ml-0.5">btl</span>
	</div>
</a>
