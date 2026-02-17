import { resizeImage } from './resize'

let initialized = false
let initFn: ((module?: unknown, opts?: unknown) => Promise<unknown>) | undefined
let encodeFn: ((data: ImageData, opts?: { quality?: number }) => Promise<ArrayBuffer>) | undefined

export async function encodePhoto(file: File): Promise<Blob> {
	const imageData = await resizeImage(file)

	if (!initialized) {
		const mod = await import('@jsquash/avif/encode.js')
		initFn = mod.init
		encodeFn = mod.default
		const wasmUrl = new URL('@jsquash/avif/codec/enc/avif_enc.wasm', import.meta.url).href
		await initFn!(undefined, { locateFile: () => wasmUrl })
		initialized = true
	}

	const buffer = await encodeFn!(imageData, { quality: 50 })
	return new Blob([buffer], { type: 'image/avif' })
}
