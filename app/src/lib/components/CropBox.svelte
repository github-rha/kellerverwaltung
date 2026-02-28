<script lang="ts">
	interface Props {
		file: File
		onconfirm: (blob: Blob) => void
		oncancel: () => void
	}

	const { file, onconfirm, oncancel }: Props = $props()

	let objectUrl = $state('')

	$effect(() => {
		const url = URL.createObjectURL(file)
		objectUrl = url
		return () => URL.revokeObjectURL(url)
	})

	// Natural image dimensions (set on load)
	let naturalW = $state(0)
	let naturalH = $state(0)

	// Container dimensions (bound to element)
	let containerW = $state(0)
	let containerH = $state(0)

	// Crop rect as fractions [0,1] of image dimensions
	let cx = $state(0.05)
	let cy = $state(0.2)
	let cw = $state(0.9)
	let ch = $state(0.6)

	type Handle = 'move' | 'tl' | 'tr' | 'bl' | 'br'
	let dragging: Handle | null = $state(null)
	let ds = $state({ px: 0, py: 0, cx: 0, cy: 0, cw: 0, ch: 0 })

	// Actual image rect in container px (object-fit: contain letterboxing)
	const ir = $derived.by(() => {
		if (!naturalW || !naturalH || !containerW || !containerH) return { x: 0, y: 0, w: 0, h: 0 }
		const scale = Math.min(containerW / naturalW, containerH / naturalH)
		const w = naturalW * scale
		const h = naturalH * scale
		return {
			x: (containerW - w) / 2,
			y: (containerH - h) / 2,
			w,
			h
		}
	})

	// Crop rect in container px
	const cp = $derived.by(() => ({
		l: ir.x + cx * ir.w,
		t: ir.y + cy * ir.h,
		w: cw * ir.w,
		h: ch * ir.h
	}))

	// SVG mask path: full rect minus crop box (evenodd)
	const maskPath = $derived(
		`M0 0 H${containerW} V${containerH} H0 Z ` +
			`M${cp.l} ${cp.t} H${cp.l + cp.w} V${cp.t + cp.h} H${cp.l} Z`
	)

	function startDrag(e: PointerEvent, handle: Handle) {
		e.stopPropagation()
		;(e.currentTarget as Element).setPointerCapture(e.pointerId)
		ds = { px: e.clientX, py: e.clientY, cx, cy, cw, ch }
		dragging = handle
	}

	function onMove(e: PointerEvent) {
		if (!dragging || !ir.w || !ir.h) return
		const dx = (e.clientX - ds.px) / ir.w
		const dy = (e.clientY - ds.py) / ir.h
		const minSz = 0.1

		if (dragging === 'move') {
			cx = Math.max(0, Math.min(1 - ds.cw, ds.cx + dx))
			cy = Math.max(0, Math.min(1 - ds.ch, ds.cy + dy))
		} else if (dragging === 'tl') {
			const nx = Math.max(0, Math.min(ds.cx + ds.cw - minSz, ds.cx + dx))
			const ny = Math.max(0, Math.min(ds.cy + ds.ch - minSz, ds.cy + dy))
			cw = ds.cw + (ds.cx - nx)
			ch = ds.ch + (ds.cy - ny)
			cx = nx
			cy = ny
		} else if (dragging === 'tr') {
			const ny = Math.max(0, Math.min(ds.cy + ds.ch - minSz, ds.cy + dy))
			ch = ds.ch + (ds.cy - ny)
			cy = ny
			cw = Math.max(minSz, Math.min(1 - ds.cx, ds.cw + dx))
		} else if (dragging === 'bl') {
			const nx = Math.max(0, Math.min(ds.cx + ds.cw - minSz, ds.cx + dx))
			cw = ds.cw + (ds.cx - nx)
			cx = nx
			ch = Math.max(minSz, Math.min(1 - ds.cy, ds.ch + dy))
		} else if (dragging === 'br') {
			cw = Math.max(minSz, Math.min(1 - ds.cx, ds.cw + dx))
			ch = Math.max(minSz, Math.min(1 - ds.cy, ds.ch + dy))
		}
	}

	function stopDrag() {
		dragging = null
	}

	async function confirm() {
		const pw = Math.max(1, Math.round(cw * naturalW))
		const ph = Math.max(1, Math.round(ch * naturalH))
		const bitmap = await createImageBitmap(
			file,
			Math.round(cx * naturalW),
			Math.round(cy * naturalH),
			pw,
			ph
		)
		const canvas = new OffscreenCanvas(pw, ph)
		canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
		bitmap.close()
		onconfirm(await canvas.convertToBlob({ type: 'image/png' }))
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-black z-50 flex flex-col">
	<!-- Image + overlay -->
	<div
		class="flex-1 relative overflow-hidden"
		bind:clientWidth={containerW}
		bind:clientHeight={containerH}
		onpointermove={onMove}
		onpointerup={stopDrag}
		onpointercancel={stopDrag}
	>
		<!-- svelte-ignore a11y_missing_attribute -->
		<img
			src={objectUrl}
			class="absolute inset-0 w-full h-full object-contain select-none"
			draggable="false"
			onload={(e) => {
				const img = e.currentTarget as HTMLImageElement
				naturalW = img.naturalWidth
				naturalH = img.naturalHeight
			}}
		/>

		{#if naturalW && containerW}
			<svg class="absolute inset-0 w-full h-full" style="touch-action: none;">
				<!-- Dark mask with crop cutout -->
				<path d={maskPath} fill="rgba(0,0,0,0.55)" fill-rule="evenodd" pointer-events="none" />

				<!-- Crop border -->
				<rect
					x={cp.l}
					y={cp.t}
					width={cp.w}
					height={cp.h}
					fill="none"
					stroke="white"
					stroke-width="1"
					pointer-events="none"
				/>

				<!-- Move handle (interior) -->
				<rect
					x={cp.l + 22}
					y={cp.t + 22}
					width={Math.max(0, cp.w - 44)}
					height={Math.max(0, cp.h - 44)}
					fill="transparent"
					style="cursor: move;"
					onpointerdown={(e) => startDrag(e, 'move')}
				/>

				<!-- Corner handles (tl) -->
				<rect
					x={cp.l - 22}
					y={cp.t - 22}
					width="44"
					height="44"
					fill="transparent"
					onpointerdown={(e) => startDrag(e, 'tl')}
				/>
				<rect x={cp.l - 6} y={cp.t - 6} width="12" height="12" fill="white" pointer-events="none" />

				<!-- Corner handles (tr) -->
				<rect
					x={cp.l + cp.w - 22}
					y={cp.t - 22}
					width="44"
					height="44"
					fill="transparent"
					onpointerdown={(e) => startDrag(e, 'tr')}
				/>
				<rect
					x={cp.l + cp.w - 6}
					y={cp.t - 6}
					width="12"
					height="12"
					fill="white"
					pointer-events="none"
				/>

				<!-- Corner handles (bl) -->
				<rect
					x={cp.l - 22}
					y={cp.t + cp.h - 22}
					width="44"
					height="44"
					fill="transparent"
					onpointerdown={(e) => startDrag(e, 'bl')}
				/>
				<rect
					x={cp.l - 6}
					y={cp.t + cp.h - 6}
					width="12"
					height="12"
					fill="white"
					pointer-events="none"
				/>

				<!-- Corner handles (br) -->
				<rect
					x={cp.l + cp.w - 22}
					y={cp.t + cp.h - 22}
					width="44"
					height="44"
					fill="transparent"
					onpointerdown={(e) => startDrag(e, 'br')}
				/>
				<rect
					x={cp.l + cp.w - 6}
					y={cp.t + cp.h - 6}
					width="12"
					height="12"
					fill="white"
					pointer-events="none"
				/>
			</svg>
		{/if}
	</div>

	<!-- Buttons -->
	<div class="flex gap-3 px-4 py-4 bg-black">
		<button
			type="button"
			onclick={oncancel}
			class="flex-1 rounded-lg border border-gray-600 px-4 py-3 text-sm font-medium text-white active:bg-gray-800"
		>
			Skip
		</button>
		<button
			type="button"
			onclick={confirm}
			class="flex-1 rounded-lg bg-white px-4 py-3 text-sm font-medium text-black active:bg-gray-200"
		>
			Crop & Read
		</button>
	</div>
</div>
