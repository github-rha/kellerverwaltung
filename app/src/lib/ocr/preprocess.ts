// Adaptive thresholding using a summed area table (integral image).
//
// For each pixel the threshold is the mean brightness of a square neighbourhood
// minus a small constant C.  Pixels darker than the threshold become black;
// all others become white.  This handles uneven lighting across the label much
// better than a single global threshold.

const MAX_PX = 1500 // resize before processing to keep memory manageable
const C = 10 // bias: pixels must be at least this much darker than the local mean

export async function adaptiveThreshold(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file)

	// Downscale if needed
	const scale = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height))
	const width = Math.round(bitmap.width * scale)
	const height = Math.round(bitmap.height * scale)

	const canvas = new OffscreenCanvas(width, height)
	const ctx = canvas.getContext('2d')!
	ctx.drawImage(bitmap, 0, 0, width, height)
	bitmap.close()

	const { data } = ctx.getImageData(0, 0, width, height)

	// Convert to grayscale (luminance)
	const gray = new Uint8Array(width * height)
	for (let i = 0; i < gray.length; i++) {
		gray[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) | 0
	}

	// Build summed area table for O(1) neighbourhood mean queries.
	// Max value: 1500 * 1500 * 255 ≈ 573 M — fits in Int32.
	const integral = new Int32Array(width * height)
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = y * width + x
			integral[i] =
				gray[i] +
				(x > 0 ? integral[i - 1] : 0) +
				(y > 0 ? integral[i - width] : 0) -
				(x > 0 && y > 0 ? integral[i - width - 1] : 0)
		}
	}

	// Neighbourhood radius: ~2% of the shorter dimension, at least 5px
	const radius = Math.max(5, Math.round(Math.min(width, height) * 0.02))

	const output = new Uint8ClampedArray(width * height * 4)
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const x0 = Math.max(0, x - radius)
			const y0 = Math.max(0, y - radius)
			const x1 = Math.min(width - 1, x + radius)
			const y1 = Math.min(height - 1, y + radius)

			const sum =
				integral[y1 * width + x1] -
				(x0 > 0 ? integral[y1 * width + (x0 - 1)] : 0) -
				(y0 > 0 ? integral[(y0 - 1) * width + x1] : 0) +
				(x0 > 0 && y0 > 0 ? integral[(y0 - 1) * width + (x0 - 1)] : 0)

			const count = (x1 - x0 + 1) * (y1 - y0 + 1)
			const mean = sum / count

			const val = gray[y * width + x] > mean - C ? 255 : 0
			const o = (y * width + x) * 4
			output[o] = output[o + 1] = output[o + 2] = val
			output[o + 3] = 255
		}
	}

	ctx.putImageData(new ImageData(output, width, height), 0, 0)
	return canvas.convertToBlob({ type: 'image/png' })
}
